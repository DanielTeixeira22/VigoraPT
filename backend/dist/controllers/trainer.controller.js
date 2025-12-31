"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPublicTrainers = exports.adminUpdateTrainer = exports.rejectTrainer = exports.validateTrainer = exports.listAll = exports.updateMyProfile = exports.getMyProfile = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const TrainerProfile_1 = __importDefault(require("../models/TrainerProfile"));
const User_1 = __importDefault(require("../models/User"));
const Notification_1 = __importDefault(require("../models/Notification"));
const socketServer_1 = require("../socket/socketServer");
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
];
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
const sanitizeTrainerUpdate = (payload) => {
    return Object.fromEntries(Object.entries(payload).filter(([key]) => TRAINER_UPDATE_FIELDS.includes(key)));
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
 * Sends a notification to a user via database and WebSocket.
 *
 * @param recipientId - The user ID to notify
 * @param type - Notification type
 * @param payload - Notification payload data
 */
const sendNotification = async (recipientId, type, payload) => {
    const notification = await Notification_1.default.create({
        recipientId,
        type,
        payload,
        isRead: false,
    });
    (0, socketServer_1.emitToUser)(String(recipientId), 'notification:new', notification);
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
const getMyProfile = async (req, res, next) => {
    try {
        requireAuth(req);
        const profile = await TrainerProfile_1.default.findOne({ userId: req.user._id });
        if (!profile) {
            throw (0, http_errors_1.default)(404, 'Perfil de treinador não encontrado.');
        }
        res.json(profile);
    }
    catch (error) {
        next(error);
    }
};
exports.getMyProfile = getMyProfile;
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
const updateMyProfile = async (req, res, next) => {
    var _a;
    try {
        requireAuth(req);
        const updates = sanitizeTrainerUpdate((_a = req.body) !== null && _a !== void 0 ? _a : {});
        // Ensure specialties are strings
        if (Array.isArray(updates.specialties)) {
            updates.specialties = updates.specialties.map((s) => String(s));
        }
        const profile = await TrainerProfile_1.default.findOneAndUpdate({ userId: req.user._id }, { $set: { ...updates, userId: req.user._id } }, { new: true, upsert: true, setDefaultsOnInsert: true });
        res.json(profile);
    }
    catch (error) {
        next(error);
    }
};
exports.updateMyProfile = updateMyProfile;
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
const listAll = async (req, res, next) => {
    try {
        const { validated } = req.query;
        const filter = {};
        if (validated === 'true')
            filter.validatedByAdmin = true;
        if (validated === 'false')
            filter.validatedByAdmin = false;
        const trainers = await TrainerProfile_1.default.find(filter)
            .populate('userId', 'username email profile.firstName profile.lastName profile.avatarUrl')
            .sort({ createdAt: -1 });
        res.json(trainers);
    }
    catch (error) {
        next(error);
    }
};
exports.listAll = listAll;
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
const validateTrainer = async (req, res, next) => {
    try {
        const trainer = await TrainerProfile_1.default.findByIdAndUpdate(req.params.id, {
            $set: {
                validatedByAdmin: true,
                validatedAt: new Date(),
                reviewStatus: 'APPROVED',
            },
            $unset: { rejectionReason: '', rejectedAt: '' },
        }, { new: true });
        if (!trainer) {
            throw (0, http_errors_1.default)(404, 'Trainer não encontrado.');
        }
        // Promote user to TRAINER role
        await User_1.default.findByIdAndUpdate(trainer.userId, { $set: { role: 'TRAINER' } });
        // Notify user of approval
        await sendNotification(trainer.userId, 'TRAINER_APPROVED', {
            trainerId: trainer._id,
        });
        res.json(trainer);
    }
    catch (error) {
        next(error);
    }
};
exports.validateTrainer = validateTrainer;
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
const rejectTrainer = async (req, res, next) => {
    try {
        const { reason } = req.body;
        const trainer = await TrainerProfile_1.default.findByIdAndUpdate(req.params.id, {
            $set: {
                validatedByAdmin: false,
                reviewStatus: 'REJECTED',
                rejectionReason: reason,
                rejectedAt: new Date(),
            },
            $unset: { validatedAt: '' },
        }, { new: true });
        if (!trainer) {
            throw (0, http_errors_1.default)(404, 'Trainer não encontrado.');
        }
        // Ensure user remains as CLIENT
        await User_1.default.findByIdAndUpdate(trainer.userId, { $set: { role: 'CLIENT' } });
        // Notify user of rejection
        await sendNotification(trainer.userId, 'TRAINER_REJECTED', {
            trainerId: trainer._id,
            reason,
        });
        res.json(trainer);
    }
    catch (error) {
        next(error);
    }
};
exports.rejectTrainer = rejectTrainer;
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
const adminUpdateTrainer = async (req, res, next) => {
    var _a;
    try {
        const updates = sanitizeTrainerUpdate((_a = req.body) !== null && _a !== void 0 ? _a : {});
        const trainer = await TrainerProfile_1.default.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
        if (!trainer) {
            throw (0, http_errors_1.default)(404, 'Trainer não encontrado.');
        }
        res.json(trainer);
    }
    catch (error) {
        next(error);
    }
};
exports.adminUpdateTrainer = adminUpdateTrainer;
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
const listPublicTrainers = async (req, res, next) => {
    try {
        const { page = '1', limit = '12', sort = 'newest', q, } = req.query;
        const parsedPage = Math.max(1, Number.parseInt(page, 10) || 1);
        const parsedLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 12));
        const skip = (parsedPage - 1) * parsedLimit;
        // Only show approved trainers
        const filter = {
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
        const sortOption = sort === 'rating'
            ? { rating: -1, createdAt: -1 }
            : { createdAt: -1 };
        const [items, total] = await Promise.all([
            TrainerProfile_1.default.find(filter)
                .populate('userId', 'username profile.firstName profile.lastName profile.avatarUrl')
                .sort(sortOption)
                .skip(skip)
                .limit(parsedLimit),
            TrainerProfile_1.default.countDocuments(filter),
        ]);
        res.json({
            items,
            page: parsedPage,
            total,
            pages: Math.ceil(total / parsedLimit),
        });
    }
    catch (error) {
        next(error);
    }
};
exports.listPublicTrainers = listPublicTrainers;
