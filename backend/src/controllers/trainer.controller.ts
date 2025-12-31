/**
 * Trainer Controller
 * 
 * Handles trainer profile management including:
 * - Trainer profile CRUD operations
 * - Admin validation/rejection of trainer applications
 * - Public trainer listing with search and pagination
 * 
 * @module controllers/trainer
 */

import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import TrainerProfile from '../models/TrainerProfile';
import User from '../models/User';
import Notification from '../models/Notification';
import { emitToUser } from '../socket/socketServer';

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Allowed fields for trainer profile updates */
const TRAINER_UPDATE_FIELDS = [
  'certification',
  'specialties',
  'avatarUrl',
  'documentUrls',
  'hourlyRate',
] as const;
type TrainerUpdateField = (typeof TRAINER_UPDATE_FIELDS)[number];

/** Query parameters for public trainer listing */
interface ListPublicTrainersQuery {
  page?: string;
  limit?: string;
  sort?: 'newest' | 'rating';
  q?: string;
}

/** Paginated response structure */
interface PaginatedResponse<T> {
  items: T[];
  page: number;
  total: number;
  pages: number;
}

// ============================================================================
// Funcoes auxiliares
// ============================================================================

/**
 * Filters an object to only include allowed trainer profile fields.
 * Prevents updating protected fields like validatedByAdmin.
 * 
 * @param payload - Raw request body object
 * @returns Filtered object containing only allowed fields
 */
const sanitizeTrainerUpdate = (
  payload: Record<string, unknown>
): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) =>
      TRAINER_UPDATE_FIELDS.includes(key as TrainerUpdateField)
    )
  );
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
 * Sends a notification to a user via database and WebSocket.
 * 
 * @param recipientId - The user ID to notify
 * @param type - Notification type
 * @param payload - Notification payload data
 */
const sendNotification = async (
  recipientId: unknown,
  type: string,
  payload: Record<string, unknown>
): Promise<void> => {
  const notification = await Notification.create({
    recipientId,
    type,
    payload,
    isRead: false,
  });
  emitToUser(String(recipientId), 'notification:new', notification);
};

// ============================================================================
// Trainer Profile Endpoints (for TRAINER role)
// ============================================================================

/**
 * Retrieves the authenticated trainer's own profile.
 * 
 * @route GET /api/trainers/profile
 * @access Private - TRAINER only
 * 
 * @param req - Express request with authenticated user
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {TrainerProfile} The trainer's profile document
 * @throws {HttpError} 401 if not authenticated
 * @throws {HttpError} 404 if profile not found
 */
export const getMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const profile = await TrainerProfile.findOne({ userId: req.user!._id });
    if (!profile) {
      throw createError(404, 'Perfil de treinador não encontrado.');
    }

    res.json(profile);
  } catch (error) {
    next(error);
  }
};

/**
 * Updates the authenticated trainer's own profile.
 * Only allows updates to: certification, specialties, avatarUrl, documentUrls, hourlyRate.
 * 
 * @route PATCH /api/trainers/profile
 * @access Private - TRAINER only
 * 
 * @param req - Express request with profile updates in body
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {TrainerProfile} The updated trainer profile
 * @throws {HttpError} 401 if not authenticated
 */
export const updateMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const updates = sanitizeTrainerUpdate(req.body ?? {});

    // Ensure specialties are strings
    if (Array.isArray(updates.specialties)) {
      updates.specialties = updates.specialties.map((s: unknown) => String(s));
    }

    const profile = await TrainerProfile.findOneAndUpdate(
      { userId: req.user!._id },
      { $set: { ...updates, userId: req.user!._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json(profile);
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// Admin Trainer Management Endpoints
// ============================================================================

/**
 * Lists all trainer profiles with optional validation filter.
 * 
 * @route GET /api/trainers
 * @access Private - ADMIN only
 * 
 * @param req - Express request with optional validated query param
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {TrainerProfile[]} Array of trainer profiles with user data
 */
export const listAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { validated } = req.query as { validated?: string };
    const filter: Record<string, unknown> = {};

    if (validated === 'true') filter.validatedByAdmin = true;
    if (validated === 'false') filter.validatedByAdmin = false;

    const trainers = await TrainerProfile.find(filter)
      .populate('userId', 'username email profile.firstName profile.lastName profile.avatarUrl')
      .sort({ createdAt: -1 });

    res.json(trainers);
  } catch (error) {
    next(error);
  }
};

/**
 * Approves a trainer application.
 * Promotes the user role from CLIENT to TRAINER and notifies them.
 * 
 * @route POST /api/trainers/:id/validate
 * @access Private - ADMIN only
 * 
 * @param req - Express request with trainer ID in params
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {TrainerProfile} The updated trainer profile
 * @throws {HttpError} 404 if trainer not found
 */
export const validateTrainer = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const trainer = await TrainerProfile.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          validatedByAdmin: true,
          validatedAt: new Date(),
          reviewStatus: 'APPROVED',
        },
        $unset: { rejectionReason: '', rejectedAt: '' },
      },
      { new: true }
    );

    if (!trainer) {
      throw createError(404, 'Trainer não encontrado.');
    }

    // Promote user to TRAINER role
    await User.findByIdAndUpdate(trainer.userId, { $set: { role: 'TRAINER' } });

    // Notify user of approval
    await sendNotification(trainer.userId, 'TRAINER_APPROVED', {
      trainerId: trainer._id,
    });

    res.json(trainer);
  } catch (error) {
    next(error);
  }
};

/**
 * Rejects a trainer application.
 * Ensures user role remains CLIENT and notifies them with the reason.
 * 
 * @route POST /api/trainers/:id/reject
 * @access Private - ADMIN only
 * 
 * @param req - Express request with trainer ID and rejection reason
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {TrainerProfile} The updated trainer profile
 * @throws {HttpError} 404 if trainer not found
 */
export const rejectTrainer = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reason } = req.body as { reason?: string };

    const trainer = await TrainerProfile.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          validatedByAdmin: false,
          reviewStatus: 'REJECTED',
          rejectionReason: reason,
          rejectedAt: new Date(),
        },
        $unset: { validatedAt: '' },
      },
      { new: true }
    );

    if (!trainer) {
      throw createError(404, 'Trainer não encontrado.');
    }

    // Ensure user remains as CLIENT
    await User.findByIdAndUpdate(trainer.userId, { $set: { role: 'CLIENT' } });

    // Notify user of rejection
    await sendNotification(trainer.userId, 'TRAINER_REJECTED', {
      trainerId: trainer._id,
      reason,
    });

    res.json(trainer);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin update of a trainer profile.
 * Allows updating specific trainer fields.
 * 
 * @route PATCH /api/trainers/:id
 * @access Private - ADMIN only
 * 
 * @param req - Express request with updates in body
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {TrainerProfile} The updated trainer profile
 * @throws {HttpError} 404 if trainer not found
 */
export const adminUpdateTrainer = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const updates = sanitizeTrainerUpdate(req.body ?? {});

    const trainer = await TrainerProfile.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );

    if (!trainer) {
      throw createError(404, 'Trainer não encontrado.');
    }

    res.json(trainer);
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// Public Trainer Endpoints
// ============================================================================

/**
 * Lists approved trainers for public directory.
 * Supports search by certification and specialties, pagination, and sorting.
 * 
 * @route GET /api/trainers/public
 * @access Public
 * 
 * @param req - Express request with query params (page, limit, sort, q)
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {PaginatedResponse<TrainerProfile>} Paginated list of approved trainers
 */
export const listPublicTrainers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '12',
      sort = 'newest',
      q,
    } = req.query as ListPublicTrainersQuery;

    const parsedPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const parsedLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 12));
    const skip = (parsedPage - 1) * parsedLimit;

    // Only show approved trainers
    const filter: Record<string, unknown> = {
      reviewStatus: 'APPROVED',
      validatedByAdmin: true,
    };

    // Search by certification or specialties.
    if (q) {
      const searchRegex = new RegExp(q, 'i');
      filter.$or = [
        { certification: searchRegex },
        { specialties: searchRegex },
      ];
    }

    const sortOption: Record<string, 1 | -1> =
      sort === 'rating'
        ? { rating: -1, createdAt: -1 }
        : { createdAt: -1 };

    const [items, total] = await Promise.all([
      TrainerProfile.find(filter)
        .populate('userId', 'username profile.firstName profile.lastName profile.avatarUrl')
        .sort(sortOption)
        .skip(skip)
        .limit(parsedLimit),
      TrainerProfile.countDocuments(filter),
    ]);

    res.json({
      items,
      page: parsedPage,
      total,
      pages: Math.ceil(total / parsedLimit),
    } as PaginatedResponse<unknown>);
  } catch (error) {
    next(error);
  }
};
