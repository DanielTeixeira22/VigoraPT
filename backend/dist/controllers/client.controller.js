"use strict";
/**
 * Client Controller
 *
 * Handles all client-related operations including:
 * - Client profile management (get/update own profile)
 * - Trainer operations (create clients, list clients)
 *
 * @module controllers/client
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyClients = exports.trainerCreateClient = exports.updateMyProfile = exports.getMyProfile = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const ClientProfile_1 = __importDefault(require("../models/ClientProfile"));
const User_1 = __importDefault(require("../models/User"));
const TrainerProfile_1 = __importDefault(require("../models/TrainerProfile"));
// ============================================================================
// Types & Interfaces
// ============================================================================
/** Fields that clients are allowed to update on their own profile */
const ALLOWED_PROFILE_FIELDS = ['goals', 'injuries', 'preferences'];
// ============================================================================
// Funcoes auxiliares
// ============================================================================
/**
 * Filters an object to only include allowed profile fields.
 * Prevents clients from updating protected fields.
 *
 * @param payload - Raw request body object
 * @returns Filtered object containing only allowed fields
 */
const pickAllowedFields = (payload) => {
    return Object.fromEntries(Object.entries(payload).filter(([key]) => ALLOWED_PROFILE_FIELDS.includes(key)));
};
/**
 * Validates that the request has an authenticated user.
 * Throws a 401 error if not authenticated.
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
 * Retrieves the trainer profile for the authenticated user.
 *
 * @param userId - The user ID to find trainer profile for
 * @returns The trainer profile document
 * @throws {HttpError} 400 if trainer profile not found
 */
const getTrainerProfileByUserId = async (userId) => {
    const trainerProfile = await TrainerProfile_1.default.findOne({ userId }).select('_id');
    if (!trainerProfile) {
        throw (0, http_errors_1.default)(400, 'Perfil de treinador não encontrado.');
    }
    return trainerProfile;
};
/**
 * Validates required fields for client creation.
 *
 * @param payload - The request payload to validate
 * @throws {HttpError} 400 if any required field is missing
 */
const validateCreateClientPayload = (payload) => {
    const requiredFields = [
        'username',
        'email',
        'password',
        'firstName',
        'lastName',
    ];
    const missingFields = requiredFields.filter((field) => !payload[field]);
    if (missingFields.length > 0) {
        throw (0, http_errors_1.default)(400, `Campos obrigatórios: ${requiredFields.join(', ')}.`);
    }
};
// ============================================================================
// Client Profile Endpoints (for CLIENT role)
// ============================================================================
/**
 * Retrieves the authenticated client's own profile.
 *
 * @route GET /api/clients/profile
 * @access Private - CLIENT only
 *
 * @param req - Express request with authenticated user
 * @param res - Express response
 * @param next - Express next function for error handling
 *
 * @returns {ClientProfile} The client's profile document
 * @throws {HttpError} 401 if not authenticated
 * @throws {HttpError} 404 if profile not found
 */
const getMyProfile = async (req, res, next) => {
    try {
        requireAuth(req);
        const profile = await ClientProfile_1.default.findOne({ userId: req.user._id });
        if (!profile) {
            throw (0, http_errors_1.default)(404, 'Perfil de cliente não encontrado.');
        }
        res.json(profile);
    }
    catch (error) {
        next(error);
    }
};
exports.getMyProfile = getMyProfile;
/**
 * Updates the authenticated client's own profile.
 * Only allows updates to: goals, injuries, preferences.
 *
 * @route PATCH /api/clients/profile
 * @access Private - CLIENT only
 *
 * @param req - Express request with profile updates in body
 * @param res - Express response
 * @param next - Express next function for error handling
 *
 * @returns {ClientProfile} The updated client profile
 * @throws {HttpError} 401 if not authenticated
 */
const updateMyProfile = async (req, res, next) => {
    var _a;
    try {
        requireAuth(req);
        const allowedUpdates = pickAllowedFields((_a = req.body) !== null && _a !== void 0 ? _a : {});
        const updatedProfile = await ClientProfile_1.default.findOneAndUpdate({ userId: req.user._id }, { $set: { ...allowedUpdates, userId: req.user._id } }, { new: true, upsert: true, setDefaultsOnInsert: true });
        res.json(updatedProfile);
    }
    catch (error) {
        next(error);
    }
};
exports.updateMyProfile = updateMyProfile;
// ============================================================================
// Trainer Client Management Endpoints (for TRAINER role)
// ============================================================================
/**
 * Creates a new client account and associates it with the trainer.
 *
 * @route POST /api/clients
 * @access Private - TRAINER only
 *
 * @param req - Express request with client data in body
 * @param res - Express response
 * @param next - Express next function for error handling
 *
 * @returns {CreateClientResponse} Created user and client profile
 * @throws {HttpError} 400 if required fields missing or trainer profile not found
 * @throws {HttpError} 401 if not authenticated
 * @throws {HttpError} 409 if email or username already exists
 */
const trainerCreateClient = async (req, res, next) => {
    try {
        requireAuth(req);
        const trainerProfile = await getTrainerProfileByUserId(String(req.user._id));
        const payload = req.body;
        validateCreateClientPayload(payload);
        const { username, email, password, firstName, lastName, goals } = payload;
        const normalizedEmail = email.toLowerCase();
        // Validate existing user with the same email or username.
        const existingUser = await User_1.default.findOne({
            $or: [{ email: normalizedEmail }, { username }],
        });
        if (existingUser) {
            throw (0, http_errors_1.default)(409, 'Email ou username já existe.');
        }
        // Create user account
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const newUser = await User_1.default.create({
            username,
            email: normalizedEmail,
            passwordHash,
            role: 'CLIENT',
            profile: { firstName, lastName },
            isActive: true,
        });
        // Create client profile linked to trainer
        const clientProfile = await ClientProfile_1.default.create({
            userId: newUser._id,
            trainerId: trainerProfile._id,
            goals,
        });
        res.status(201).json({
            message: 'Cliente criado com sucesso.',
            user: newUser,
            clientProfile,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.trainerCreateClient = trainerCreateClient;
/**
 * Lists all clients associated with the authenticated trainer.
 *
 * @route GET /api/clients
 * @access Private - TRAINER only
 *
 * @param req - Express request with authenticated trainer
 * @param res - Express response
 * @param next - Express next function for error handling
 *
 * @returns {ClientProfile[]} Array of client profiles with populated user data
 * @throws {HttpError} 400 if trainer profile not found
 * @throws {HttpError} 401 if not authenticated
 */
const listMyClients = async (req, res, next) => {
    try {
        requireAuth(req);
        const trainerProfile = await getTrainerProfileByUserId(String(req.user._id));
        const clients = await ClientProfile_1.default.find({ trainerId: trainerProfile._id })
            .populate('userId', 'username email profile.firstName profile.lastName profile.avatarUrl');
        res.json(clients);
    }
    catch (error) {
        next(error);
    }
};
exports.listMyClients = listMyClients;
