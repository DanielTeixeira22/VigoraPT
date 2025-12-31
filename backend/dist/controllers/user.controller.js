"use strict";
/**
 * User Controller
 *
 * Handles user account management including:
 * - User profile retrieval and updates
 * - Password changes
 * - Admin user management (CRUD)
 * - User search with pagination
 *
 * @module controllers/user
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleUserActive = exports.adminUpdateUser = exports.adminCreateUser = exports.searchUsers = exports.changeMyPassword = exports.updateMe = exports.getMe = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const mongoose_1 = require("mongoose");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
// ============================================================================
// Types & Interfaces
// ============================================================================
/** Valid user roles */
const VALID_ROLES = ['ADMIN', 'TRAINER', 'CLIENT'];
// ============================================================================
// Funcoes auxiliares
// ============================================================================
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
 * Parses a pagination parameter with fallback.
 *
 * @param value - String value to parse
 * @param fallback - Default value if parsing fails
 * @returns Parsed number or fallback
 */
const parsePagination = (value, fallback) => {
    if (!value)
        return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};
/**
 * Validates that a role is valid.
 *
 * @param role - The role to validate
 * @throws {HttpError} 400 if role is invalid
 */
const validateRole = (role) => {
    if (!VALID_ROLES.includes(role)) {
        throw (0, http_errors_1.default)(400, 'Role inválido.');
    }
};
/**
 * Validates required fields for user creation.
 *
 * @param payload - The creation payload
 * @throws {HttpError} 400 if required fields missing
 */
const validateCreateUserPayload = (payload) => {
    const requiredFields = [
        'username',
        'email',
        'password',
        'role',
    ];
    const missingFields = requiredFields.filter((field) => !payload[field]);
    if (missingFields.length > 0) {
        throw (0, http_errors_1.default)(400, `Campos obrigatórios: ${requiredFields.join(', ')}.`);
    }
    validateRole(payload.role);
};
/**
 * Checks for duplicate email or username.
 *
 * @param email - Normalized email to check
 * @param username - Username to check
 * @param excludeId - Optional user ID to exclude from check
 * @throws {HttpError} 409 if duplicate found
 */
const checkDuplicateUser = async (email, username, excludeId) => {
    const orConditions = [{ email }];
    if (username) {
        orConditions.push({ username });
    }
    const filter = { $or: orConditions };
    if (excludeId) {
        filter._id = { $ne: excludeId };
    }
    const existing = await User_1.default.findOne(filter);
    if (existing) {
        throw (0, http_errors_1.default)(409, 'Email ou username já existe.');
    }
};
// ============================================================================
// User Profile Endpoints (Authenticated User)
// ============================================================================
/**
 * Retrieves the authenticated user's profile.
 *
 * @route GET /api/users/me
 * @access Private
 *
 * @param req - Express request with authenticated user
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns {User} The user's profile (without password)
 * @throws {HttpError} 401 if not authenticated
 * @throws {HttpError} 404 if user not found
 */
const getMe = async (req, res, next) => {
    try {
        requireAuth(req);
        const user = await User_1.default.findById(req.user._id).select('-passwordHash');
        if (!user) {
            throw (0, http_errors_1.default)(404, 'Utilizador não encontrado.');
        }
        res.json(user);
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
/**
 * Updates the authenticated user's profile.
 *
 * @route PATCH /api/users/me
 * @access Private
 *
 * @param req - Express request with profile updates
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns {User} The updated user profile
 * @throws {HttpError} 401 if not authenticated
 */
const updateMe = async (req, res, next) => {
    try {
        requireAuth(req);
        const { email, firstName, lastName, avatarUrl, bio } = req.body;
        const update = {};
        if (email)
            update.email = email.toLowerCase();
        if (firstName)
            update['profile.firstName'] = firstName;
        if (lastName)
            update['profile.lastName'] = lastName;
        if (avatarUrl !== undefined)
            update['profile.avatarUrl'] = avatarUrl;
        if (bio !== undefined)
            update['profile.bio'] = bio;
        const updatedUser = await User_1.default.findByIdAndUpdate(req.user._id, { $set: update }, { new: true }).select('-passwordHash');
        res.json(updatedUser);
    }
    catch (error) {
        next(error);
    }
};
exports.updateMe = updateMe;
/**
 * Changes the authenticated user's password.
 *
 * @route POST /api/users/me/password
 * @access Private
 *
 * @param req - Express request with current and new password
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns Success message
 * @throws {HttpError} 400 if required fields missing
 * @throws {HttpError} 401 if current password incorrect
 * @throws {HttpError} 404 if user not found
 */
const changeMyPassword = async (req, res, next) => {
    try {
        requireAuth(req);
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            throw (0, http_errors_1.default)(400, 'Campos obrigatórios: currentPassword e newPassword.');
        }
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            throw (0, http_errors_1.default)(404, 'Utilizador não encontrado.');
        }
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!isValidPassword) {
            throw (0, http_errors_1.default)(401, 'Password atual incorreta.');
        }
        user.passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
        await user.save();
        res.json({ message: 'Password alterada com sucesso.' });
    }
    catch (error) {
        next(error);
    }
};
exports.changeMyPassword = changeMyPassword;
// ============================================================================
// User search endpoints.
// ============================================================================
/**
 * Searches users with optional filters and pagination.
 *
 * @route GET /api/users/search
 * @access Private
 *
 * @param req - Express request with search query params
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns Paginated list of users matching search criteria
 */
const searchUsers = async (req, res, next) => {
    try {
        const { q = '', role } = req.query;
        const page = Math.max(1, parsePagination(req.query.page, 1));
        const limit = Math.max(1, Math.min(100, parsePagination(req.query.limit, 20)));
        const skip = (page - 1) * limit;
        const filter = {};
        // Text search across multiple fields
        if (q) {
            const searchRegex = new RegExp(q, 'i');
            filter.$or = [
                { username: searchRegex },
                { email: searchRegex },
                { 'profile.firstName': searchRegex },
                { 'profile.lastName': searchRegex },
            ];
        }
        if (role)
            filter.role = role;
        const [users, total] = await Promise.all([
            User_1.default.find(filter).select('-passwordHash').skip(skip).limit(limit),
            User_1.default.countDocuments(filter),
        ]);
        res.json({ data: users, page, total });
    }
    catch (error) {
        next(error);
    }
};
exports.searchUsers = searchUsers;
// ============================================================================
// Admin User Management Endpoints
// ============================================================================
/**
 * Admin creates a new user account.
 *
 * @route POST /api/users
 * @access Private - ADMIN only
 *
 * @param req - Express request with user data
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns The created user
 * @throws {HttpError} 400 if required fields missing or invalid role
 * @throws {HttpError} 409 if email or username exists
 */
const adminCreateUser = async (req, res, next) => {
    try {
        const payload = req.body;
        validateCreateUserPayload(payload);
        const { username, email, password, role, firstName, lastName } = payload;
        const normalizedEmail = email.toLowerCase();
        await checkDuplicateUser(normalizedEmail, username);
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const user = await User_1.default.create({
            username,
            email: normalizedEmail,
            passwordHash,
            role,
            profile: { firstName, lastName },
            isActive: true,
        });
        res.status(201).json({
            message: 'Utilizador criado com sucesso.',
            user,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.adminCreateUser = adminCreateUser;
/**
 * Admin updates an existing user.
 *
 * @route PATCH /api/users/:id
 * @access Private - ADMIN only
 *
 * @param req - Express request with updates
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns The updated user
 * @throws {HttpError} 400 if invalid ID or no fields to update
 * @throws {HttpError} 404 if user not found
 * @throws {HttpError} 409 if email conflict
 */
const adminUpdateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose_1.Types.ObjectId.isValid(id)) {
            throw (0, http_errors_1.default)(400, 'Id inválido.');
        }
        const { email, firstName, lastName, role, isActive } = req.body;
        const update = {};
        if (email) {
            const normalizedEmail = email.toLowerCase();
            // Validate email conflict.
            const existingWithEmail = await User_1.default.findOne({
                email: normalizedEmail,
                _id: { $ne: id },
            });
            if (existingWithEmail) {
                throw (0, http_errors_1.default)(409, 'Já existe um utilizador com esse email.');
            }
            update.email = normalizedEmail;
        }
        if (firstName)
            update['profile.firstName'] = firstName;
        if (lastName)
            update['profile.lastName'] = lastName;
        if (typeof isActive === 'boolean') {
            update.isActive = isActive;
        }
        if (role) {
            validateRole(role);
            update.role = role;
        }
        if (Object.keys(update).length === 0) {
            throw (0, http_errors_1.default)(400, 'Nenhum campo para atualizar.');
        }
        const updatedUser = await User_1.default.findByIdAndUpdate(id, { $set: update }, { new: true }).select('-passwordHash');
        if (!updatedUser) {
            throw (0, http_errors_1.default)(404, 'Utilizador não encontrado.');
        }
        res.json(updatedUser);
    }
    catch (error) {
        next(error);
    }
};
exports.adminUpdateUser = adminUpdateUser;
/**
 * Toggles a user's active status.
 *
 * @route POST /api/users/:id/toggle-active
 * @access Private - ADMIN only
 *
 * @param req - Express request with user ID
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns The user ID and new active status
 * @throws {HttpError} 404 if user not found
 */
const toggleUserActive = async (req, res, next) => {
    try {
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            throw (0, http_errors_1.default)(404, 'Utilizador não encontrado.');
        }
        user.isActive = !user.isActive;
        await user.save();
        res.json({ id: user._id, isActive: user.isActive });
    }
    catch (error) {
        next(error);
    }
};
exports.toggleUserActive = toggleUserActive;
