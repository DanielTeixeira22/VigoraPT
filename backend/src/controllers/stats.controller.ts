/**
 * Statistics Controller
 * 
 * Handles workout completion statistics including:
 * - Weekly completion aggregations
 * - Monthly completion aggregations
 * - Role-based filtering (Client/Trainer/Admin)
 * 
 * @module controllers/stats
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import createError from 'http-errors';
import CompletionLog from '../models/CompletionLog';
import ClientProfile from '../models/ClientProfile';
import TrainerProfile from '../models/TrainerProfile';

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Query parameters for statistics endpoints */
interface StatsQueryParams {
  from?: string;
  to?: string;
  clientId?: string;
  trainerId?: string;
}

/** Weekly completion statistics result */
interface WeeklyStats {
  year: number;
  week: number;
  totalCompletions: number;
}

/** Monthly completion statistics result */
interface MonthlyStats {
  year: number;
  month: number;
  totalCompletions: number;
}

// ============================================================================
// Funcoes auxiliares
// ============================================================================

/**
 * Parses a date string safely.
 * 
 * @param value - Date string to parse
 * @returns Parsed Date or undefined if invalid
 */
const parseDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
};

/**
 * Validates that the request has an authenticated user.
 * 
 * @param req - Express request object
 * @throws {HttpError} 401 if user is not authenticated
 */
const requireAuth = (req: Request): void => {
  if (!req.user) {
    throw createError(401, 'Autenticação requerida.');
  }
};

/**
 * Builds a date range filter for MongoDB queries.
 * 
 * @param from - Start date string
 * @param to - End date string
 * @returns Date filter object or undefined
 */
const buildDateFilter = (
  from?: string,
  to?: string
): Record<string, Date> | undefined => {
  const fromDate = parseDate(from);
  const toDate = parseDate(to);

  if (!fromDate && !toDate) return undefined;

  const filter: Record<string, Date> = {};
  if (fromDate) filter.$gte = fromDate;
  if (toDate) filter.$lte = toDate;
  return filter;
};

/**
 * Weekly aggregation pipeline stages.
 */
const weeklyAggregationStages = [
  {
    $group: {
      _id: {
        year: { $isoWeekYear: '$date' },
        week: { $isoWeek: '$date' },
      },
      totalCompletions: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      year: '$_id.year',
      week: '$_id.week',
      totalCompletions: 1,
    },
  },
  { $sort: { year: 1, week: 1 } as Record<string, 1 | -1> },
];

/**
 * Monthly aggregation pipeline stages.
 */
const monthlyAggregationStages = [
  {
    $group: {
      _id: {
        year: { $year: '$date' },
        month: { $month: '$date' },
      },
      totalCompletions: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      year: '$_id.year',
      month: '$_id.month',
      totalCompletions: 1,
    },
  },
  { $sort: { year: 1, month: 1 } as Record<string, 1 | -1> },
];

// ============================================================================
// Generic Statistics Endpoints (with query params)
// ============================================================================

/**
 * Gets weekly workout completion statistics with optional filters.
 * 
 * @route GET /api/stats/completions/weekly
 * @access Private
 * 
 * @param req - Express request with optional query filters
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {WeeklyStats[]} Array of weekly completion statistics
 */
export const completionsByWeek = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { from, to, clientId, trainerId } = req.query as StatsQueryParams;

    const match: Record<string, unknown> = { status: 'DONE' };

    const dateFilter = buildDateFilter(from, to);
    if (dateFilter) match.date = dateFilter;

    if (clientId) match.clientId = new Types.ObjectId(clientId);
    if (trainerId) match.trainerId = new Types.ObjectId(trainerId);

    const results = await CompletionLog.aggregate([
      { $match: match },
      ...weeklyAggregationStages,
    ]) as WeeklyStats[];

    res.json(results);
  } catch (error) {
    next(error);
  }
};

/**
 * Gets monthly workout completion statistics with optional filters.
 * 
 * @route GET /api/stats/completions/monthly
 * @access Private
 * 
 * @param req - Express request with optional query filters
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {MonthlyStats[]} Array of monthly completion statistics
 */
export const completionsByMonth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { from, to, clientId, trainerId } = req.query as StatsQueryParams;

    const match: Record<string, unknown> = { status: 'DONE' };

    const dateFilter = buildDateFilter(from, to);
    if (dateFilter) match.date = dateFilter;

    if (clientId) match.clientId = new Types.ObjectId(clientId);
    if (trainerId) match.trainerId = new Types.ObjectId(trainerId);

    const results = await CompletionLog.aggregate([
      { $match: match },
      ...monthlyAggregationStages,
    ]) as MonthlyStats[];

    res.json(results);
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// User-Specific Statistics Endpoints (/my)
// ============================================================================

/**
 * Gets weekly workout completion statistics for the authenticated user.
 * Filters based on user role (Client sees own, Trainer sees their clients, Admin sees all).
 * 
 * @route GET /api/stats/my/weekly
 * @access Private
 * 
 * @param req - Express request with authenticated user
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {WeeklyStats[]} Array of weekly completion statistics
 * @throws {HttpError} 401 if not authenticated
 */
export const myCompletionsByWeek = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const match: Record<string, unknown> = { status: 'DONE' };

    // Filter based on user role
    if (req.user!.role === 'CLIENT') {
      const client = await ClientProfile.findOne({ userId: req.user!._id }).select('_id');
      if (!client) {
        res.json([]);
        return;
      }
      match.clientId = client._id;
    } else if (req.user!.role === 'TRAINER') {
      const trainer = await TrainerProfile.findOne({ userId: req.user!._id }).select('_id');
      if (!trainer) {
        res.json([]);
        return;
      }
      match.trainerId = trainer._id;
    }
    // ADMIN sees all data (no additional filter)

    const results = await CompletionLog.aggregate([
      { $match: match },
      ...weeklyAggregationStages,
    ]) as WeeklyStats[];

    res.json(results);
  } catch (error) {
    next(error);
  }
};

/**
 * Gets monthly workout completion statistics for the authenticated user.
 * Filters based on user role (Client sees own, Trainer sees their clients, Admin sees all).
 * 
 * @route GET /api/stats/my/monthly
 * @access Private
 * 
 * @param req - Express request with authenticated user
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {MonthlyStats[]} Array of monthly completion statistics
 * @throws {HttpError} 401 if not authenticated
 */
export const myCompletionsByMonth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const match: Record<string, unknown> = { status: 'DONE' };

    // Filter based on user role
    if (req.user!.role === 'CLIENT') {
      const client = await ClientProfile.findOne({ userId: req.user!._id }).select('_id');
      if (!client) {
        res.json([]);
        return;
      }
      match.clientId = client._id;
    } else if (req.user!.role === 'TRAINER') {
      const trainer = await TrainerProfile.findOne({ userId: req.user!._id }).select('_id');
      if (!trainer) {
        res.json([]);
        return;
      }
      match.trainerId = trainer._id;
    }
    // ADMIN sees all data

    const results = await CompletionLog.aggregate([
      { $match: match },
      ...monthlyAggregationStages,
    ]) as MonthlyStats[];

    res.json(results);
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// Admin-Specific Statistics Endpoints
// ============================================================================

/** Interface for admin overview statistics */
interface AdminOverview {
  totalUsers: number;
  totalTrainers: number;
  totalClients: number;
  pendingApplications: number;
  totalWorkoutsCompleted: number;
  totalWorkoutsMissed: number;
  weeklyActivity: WeeklyStats[];
  monthlyActivity: MonthlyStats[];
  monthlyMissed: MonthlyStats[];
}

/**
 * Gets admin dashboard overview statistics.
 * Requires ADMIN role.
 * 
 * @route GET /api/stats/admin/overview
 * @access Private (ADMIN only)
 * 
 * @param req - Express request with authenticated admin user
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {AdminOverview} Admin dashboard statistics
 * @throws {HttpError} 401 if not authenticated
 * @throws {HttpError} 403 if not admin
 */
export const adminOverview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    if (req.user!.role !== 'ADMIN') {
      throw createError(403, 'Acesso restrito a administradores.');
    }

    // Import User model
    const User = (await import('../models/User')).default;

    // Get counts in parallel
    const [
      totalUsers,
      totalTrainers,
      totalClients,
      pendingApplications,
      totalWorkoutsCompleted,
      totalWorkoutsMissed,
      weeklyActivity,
      monthlyActivity,
      monthlyMissed,
    ] = await Promise.all([
      // Total users
      User.countDocuments(),
      // Total trainers (approved/validated by admin)
      TrainerProfile.countDocuments({ validatedByAdmin: true }),
      // Total clients
      ClientProfile.countDocuments(),
      // Pending trainer applications (not yet validated)
      TrainerProfile.countDocuments({ validatedByAdmin: false }),
      // Total workouts completed
      CompletionLog.countDocuments({ status: 'DONE' }),
      // Total workouts missed
      CompletionLog.countDocuments({ status: 'MISSED' }),
      // Weekly activity (global, last 8 weeks)
      CompletionLog.aggregate([
        { $match: { status: 'DONE' } },
        ...weeklyAggregationStages,
        { $limit: 8 },
      ]) as Promise<WeeklyStats[]>,
      // Monthly activity (global, last 6 months)
      CompletionLog.aggregate([
        { $match: { status: 'DONE' } },
        ...monthlyAggregationStages,
        { $limit: 6 },
      ]) as Promise<MonthlyStats[]>,
      // Monthly missed (global, last 6 months)
      CompletionLog.aggregate([
        { $match: { status: 'MISSED' } },
        ...monthlyAggregationStages,
        { $limit: 6 },
      ]) as Promise<MonthlyStats[]>,
    ]);

    const overview: AdminOverview = {
      totalUsers,
      totalTrainers,
      totalClients,
      pendingApplications,
      totalWorkoutsCompleted,
      totalWorkoutsMissed,
      weeklyActivity,
      monthlyActivity,
      monthlyMissed,
    };

    res.json(overview);
  } catch (error) {
    next(error);
  }
};
