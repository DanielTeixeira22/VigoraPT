"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOverview = exports.myCompletionsByMonth = exports.myCompletionsByWeek = exports.completionsByMonth = exports.completionsByWeek = void 0;
const mongoose_1 = require("mongoose");
const http_errors_1 = __importDefault(require("http-errors"));
const CompletionLog_1 = __importDefault(require("../models/CompletionLog"));
const ClientProfile_1 = __importDefault(require("../models/ClientProfile"));
const TrainerProfile_1 = __importDefault(require("../models/TrainerProfile"));
// ============================================================================
// Funcoes auxiliares
// ============================================================================
/**
 * Parses a date string safely.
 *
 * @param value - Date string to parse
 * @returns Parsed Date or undefined if invalid
 */
const parseDate = (value) => {
    if (!value)
        return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
};
/**
 * Validates that the request has an authenticated user.
 *
 * @param req - Express request object
 * @throws {HttpError} 401 if user is not authenticated
 */
const requireAuth = (req) => {
    if (!req.user) {
        throw (0, http_errors_1.default)(401, 'Autenticação requerida.');
    }
};
/**
 * Builds a date range filter for MongoDB queries.
 *
 * @param from - Start date string
 * @param to - End date string
 * @returns Date filter object or undefined
 */
const buildDateFilter = (from, to) => {
    const fromDate = parseDate(from);
    const toDate = parseDate(to);
    if (!fromDate && !toDate)
        return undefined;
    const filter = {};
    if (fromDate)
        filter.$gte = fromDate;
    if (toDate)
        filter.$lte = toDate;
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
    { $sort: { year: 1, week: 1 } },
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
    { $sort: { year: 1, month: 1 } },
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
const completionsByWeek = async (req, res, next) => {
    try {
        const { from, to, clientId, trainerId } = req.query;
        const match = { status: 'DONE' };
        const dateFilter = buildDateFilter(from, to);
        if (dateFilter)
            match.date = dateFilter;
        if (clientId)
            match.clientId = new mongoose_1.Types.ObjectId(clientId);
        if (trainerId)
            match.trainerId = new mongoose_1.Types.ObjectId(trainerId);
        const results = await CompletionLog_1.default.aggregate([
            { $match: match },
            ...weeklyAggregationStages,
        ]);
        res.json(results);
    }
    catch (error) {
        next(error);
    }
};
exports.completionsByWeek = completionsByWeek;
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
const completionsByMonth = async (req, res, next) => {
    try {
        const { from, to, clientId, trainerId } = req.query;
        const match = { status: 'DONE' };
        const dateFilter = buildDateFilter(from, to);
        if (dateFilter)
            match.date = dateFilter;
        if (clientId)
            match.clientId = new mongoose_1.Types.ObjectId(clientId);
        if (trainerId)
            match.trainerId = new mongoose_1.Types.ObjectId(trainerId);
        const results = await CompletionLog_1.default.aggregate([
            { $match: match },
            ...monthlyAggregationStages,
        ]);
        res.json(results);
    }
    catch (error) {
        next(error);
    }
};
exports.completionsByMonth = completionsByMonth;
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
const myCompletionsByWeek = async (req, res, next) => {
    try {
        requireAuth(req);
        const match = { status: 'DONE' };
        // Filter based on user role
        if (req.user.role === 'CLIENT') {
            const client = await ClientProfile_1.default.findOne({ userId: req.user._id }).select('_id');
            if (!client) {
                res.json([]);
                return;
            }
            match.clientId = client._id;
        }
        else if (req.user.role === 'TRAINER') {
            const trainer = await TrainerProfile_1.default.findOne({ userId: req.user._id }).select('_id');
            if (!trainer) {
                res.json([]);
                return;
            }
            match.trainerId = trainer._id;
        }
        // ADMIN sees all data (no additional filter)
        const results = await CompletionLog_1.default.aggregate([
            { $match: match },
            ...weeklyAggregationStages,
        ]);
        res.json(results);
    }
    catch (error) {
        next(error);
    }
};
exports.myCompletionsByWeek = myCompletionsByWeek;
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
const myCompletionsByMonth = async (req, res, next) => {
    try {
        requireAuth(req);
        const match = { status: 'DONE' };
        // Filter based on user role
        if (req.user.role === 'CLIENT') {
            const client = await ClientProfile_1.default.findOne({ userId: req.user._id }).select('_id');
            if (!client) {
                res.json([]);
                return;
            }
            match.clientId = client._id;
        }
        else if (req.user.role === 'TRAINER') {
            const trainer = await TrainerProfile_1.default.findOne({ userId: req.user._id }).select('_id');
            if (!trainer) {
                res.json([]);
                return;
            }
            match.trainerId = trainer._id;
        }
        // ADMIN sees all data
        const results = await CompletionLog_1.default.aggregate([
            { $match: match },
            ...monthlyAggregationStages,
        ]);
        res.json(results);
    }
    catch (error) {
        next(error);
    }
};
exports.myCompletionsByMonth = myCompletionsByMonth;
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
const adminOverview = async (req, res, next) => {
    try {
        requireAuth(req);
        if (req.user.role !== 'ADMIN') {
            throw (0, http_errors_1.default)(403, 'Acesso restrito a administradores.');
        }
        // Import User model
        const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
        // Get counts in parallel
        const [totalUsers, totalTrainers, totalClients, pendingApplications, totalWorkoutsCompleted, totalWorkoutsMissed, weeklyActivity, monthlyActivity, monthlyMissed,] = await Promise.all([
            // Total users
            User.countDocuments(),
            // Total trainers (approved/validated by admin)
            TrainerProfile_1.default.countDocuments({ validatedByAdmin: true }),
            // Total clients
            ClientProfile_1.default.countDocuments(),
            // Pending trainer applications (not yet validated)
            TrainerProfile_1.default.countDocuments({ validatedByAdmin: false }),
            // Total workouts completed
            CompletionLog_1.default.countDocuments({ status: 'DONE' }),
            // Total workouts missed
            CompletionLog_1.default.countDocuments({ status: 'MISSED' }),
            // Weekly activity (global, last 8 weeks)
            CompletionLog_1.default.aggregate([
                { $match: { status: 'DONE' } },
                ...weeklyAggregationStages,
                { $limit: 8 },
            ]),
            // Monthly activity (global, last 6 months)
            CompletionLog_1.default.aggregate([
                { $match: { status: 'DONE' } },
                ...monthlyAggregationStages,
                { $limit: 6 },
            ]),
            // Monthly missed (global, last 6 months)
            CompletionLog_1.default.aggregate([
                { $match: { status: 'MISSED' } },
                ...monthlyAggregationStages,
                { $limit: 6 },
            ]),
        ]);
        const overview = {
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
    }
    catch (error) {
        next(error);
    }
};
exports.adminOverview = adminOverview;
