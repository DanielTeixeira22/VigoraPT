"use strict";
/**
 * Authentication Controller
 *
 * Handles user authentication operations including:
 * - User registration (with optional trainer application)
 * - Login with email or username
 * - JWT token refresh with rotation strategy
 *
 * @module controllers/auth
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.refresh = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const http_errors_1 = __importDefault(require("http-errors"));
const User_1 = __importDefault(require("../models/User"));
const TrainerProfile_1 = __importDefault(require("../models/TrainerProfile"));
const ClientProfile_1 = __importDefault(require("../models/ClientProfile"));
const Notification_1 = __importDefault(require("../models/Notification"));
const PasswordResetToken_1 = __importDefault(require("../models/PasswordResetToken"));
const jwt_1 = require("../utils/jwt");
const email_1 = require("../utils/email");
// ============================================================================
// Funcoes auxiliares
// ============================================================================
/**
 * Sanitizes a user document for safe API response.
 * Removes sensitive fields like passwordHash.
 *
 * @param user - The user document to sanitize
 * @returns Sanitized user object safe for client consumption
 */
const sanitizeUser = (user) => ({
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    profile: user.profile,
});
/**
 * Validates required fields for registration.
 *
 * @param payload - The registration payload to validate
 * @throws {HttpError} 400 if any required field is missing
 */
const validateRegistrationPayload = (payload) => {
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
/**
 * Parses trainer specialties from comma-separated string.
 *
 * @param specialties - Comma-separated specialties string
 * @returns Array of trimmed specialty strings
 */
const parseSpecialties = (specialties) => {
    if (!specialties)
        return [];
    return specialties
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
};
/**
 * Creates a pending trainer profile for a user.
 *
 * @param userId - The user's ID
 * @param certification - Trainer certification info
 * @param specialties - Array of specialties
 * @param documentUrl - Optional document URL
 * @param hourlyRate - Optional hourly rate
 */
const createPendingTrainerProfile = async (userId, certification, specialties, documentUrl, hourlyRate) => {
    await TrainerProfile_1.default.create({
        userId,
        validatedByAdmin: false,
        reviewStatus: 'PENDING',
        certification,
        specialties: specialties || [],
        documentUrls: documentUrl ? [documentUrl] : [],
        hourlyRate,
    });
};
/**
 * Notifies all active admins about a new trainer application.
 *
 * @param user - The user who applied to be a trainer
 */
const notifyAdminsOfTrainerApplication = async (user) => {
    const admins = await User_1.default.find({ role: 'ADMIN', isActive: true }).select('_id');
    if (admins.length === 0)
        return;
    await Notification_1.default.insertMany(admins.map((admin) => ({
        recipientId: admin._id,
        type: 'ALERT',
        payload: {
            request: 'TRAINER_VALIDATION',
            userId: user._id,
            username: user.username,
            email: user.email,
        },
        isRead: false,
    })));
};
// ============================================================================
// Authentication Endpoints
// ============================================================================
/**
 * Registers a new user account.
 *
 * Creates a CLIENT account by default. Users can optionally apply to become
 * trainers, which creates a pending trainer profile for admin review.
 *
 * @route POST /api/auth/register
 * @access Public
 *
 * @param req - Express request with registration data in body
 * @param res - Express response
 * @param next - Express next function for error handling
 *
 * @returns {AuthResponse} User data with JWT tokens
 * @throws {HttpError} 400 if required fields are missing
 * @throws {HttpError} 409 if email or username already exists
 */
const register = async (req, res, next) => {
    try {
        const payload = req.body;
        validateRegistrationPayload(payload);
        const { username, email, password, firstName, lastName, trainerCertification, trainerSpecialties, trainerHourlyRate, } = payload;
        const wantsTrainer = Boolean(payload.wantsTrainer);
        const normalizedEmail = email.toLowerCase();
        const role = 'CLIENT'; // Always start as CLIENT
        // Validate existing user.
        const existingUser = await User_1.default.findOne({
            $or: [{ email: normalizedEmail }, { username }],
        });
        if (existingUser) {
            throw (0, http_errors_1.default)(409, 'Email ou username já existe.');
        }
        // Create user account
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const user = await User_1.default.create({
            username,
            email: normalizedEmail,
            passwordHash,
            role,
            profile: { firstName, lastName },
            isActive: true,
        });
        // Create default client profile
        await ClientProfile_1.default.findOneAndUpdate({ userId: user._id }, { $setOnInsert: { userId: user._id } }, { upsert: true, new: true });
        // Generate tokens
        const accessToken = (0, jwt_1.signAccess)(user);
        const refreshToken = (0, jwt_1.signRefresh)(user);
        // Handle trainer application if requested
        if (wantsTrainer) {
            const uploadedDoc = req.file;
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const documentUrl = uploadedDoc
                ? `${baseUrl}/uploads/${path_1.default.basename(uploadedDoc.filename)}`
                : undefined;
            const specialties = parseSpecialties(trainerSpecialties);
            const hourlyRate = trainerHourlyRate ? Number(trainerHourlyRate) : undefined;
            await createPendingTrainerProfile(user._id, trainerCertification, specialties, documentUrl, hourlyRate);
            await notifyAdminsOfTrainerApplication(user);
        }
        res.status(201).json({
            user: sanitizeUser(user),
            accessToken,
            refreshToken,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
/**
 * Authenticates a user and returns JWT tokens.
 *
 * Accepts either email or username for authentication.
 *
 * @route POST /api/auth/login
 * @access Public
 *
 * @param req - Express request with login credentials
 * @param res - Express response
 * @param next - Express next function for error handling
 *
 * @returns {AuthResponse} User data with JWT tokens
 * @throws {HttpError} 400 if credentials are missing
 * @throws {HttpError} 401 if credentials are invalid
 * @throws {HttpError} 403 if account is deactivated
 */
const login = async (req, res, next) => {
    try {
        const { emailOrUsername, password } = req.body;
        if (!emailOrUsername || !password) {
            throw (0, http_errors_1.default)(400, 'Campos obrigatórios: emailOrUsername e password.');
        }
        // Find user by email or username
        const user = await User_1.default.findOne({
            $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
        });
        if (!user) {
            throw (0, http_errors_1.default)(401, 'Credenciais inválidas.');
        }
        if (!user.isActive) {
            throw (0, http_errors_1.default)(403, 'Conta desativada.');
        }
        // Verify password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isValidPassword) {
            throw (0, http_errors_1.default)(401, 'Credenciais inválidas.');
        }
        // Generate tokens
        const accessToken = (0, jwt_1.signAccess)(user);
        const refreshToken = (0, jwt_1.signRefresh)(user);
        res.json({
            user: sanitizeUser(user),
            accessToken,
            refreshToken,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
/**
 * Refreshes JWT tokens using a valid refresh token.
 *
 * Implements token rotation strategy - each refresh generates
 * a new refresh token, invalidating the previous one.
 *
 * @route POST /api/auth/refresh
 * @access Public (requires valid refresh token)
 *
 * @param req - Express request with refresh token in body
 * @param res - Express response
 * @param next - Express next function for error handling
 *
 * @returns {AuthResponse} User data with new JWT tokens
 * @throws {HttpError} 400 if refresh token is missing
 * @throws {HttpError} 401 if refresh token is invalid or user not found
 */
const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw (0, http_errors_1.default)(400, 'refreshToken é obrigatório.');
        }
        // Verify refresh token
        let payload;
        try {
            payload = (0, jwt_1.verifyRefresh)(refreshToken);
        }
        catch {
            throw (0, http_errors_1.default)(401, 'Refresh token inválido ou expirado.');
        }
        // Validate user exists and is active
        const user = await User_1.default.findById(payload.id);
        if (!user || !user.isActive) {
            throw (0, http_errors_1.default)(401, 'Utilizador inválido.');
        }
        // Generate new tokens (rotation strategy)
        const newAccessToken = (0, jwt_1.signAccess)(user);
        const newRefreshToken = (0, jwt_1.signRefresh)(user);
        res.json({
            user: sanitizeUser(user),
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.refresh = refresh;
/**
 * Initiates password reset process.
 *
 * Generates a secure token, stores its hash, and sends reset email.
 * For security, always returns success even if email doesn't exist.
 *
 * @route POST /api/auth/forgot-password
 * @access Public
 */
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            throw (0, http_errors_1.default)(400, 'Email é obrigatório.');
        }
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User_1.default.findOne({ email: normalizedEmail });
        // Always return success for security (prevents email enumeration)
        if (!user || !user.isActive) {
            res.json({ message: 'Se o email existir, receberás instruções para redefinir a password.' });
            return;
        }
        // Delete any existing tokens for this user
        await PasswordResetToken_1.default.deleteMany({ userId: user._id });
        // Generate secure token
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const tokenHash = crypto_1.default.createHash('sha256').update(resetToken).digest('hex');
        // Store token hash with 1 hour expiration
        await PasswordResetToken_1.default.create({
            userId: user._id,
            tokenHash,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        });
        // Build reset URL
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
        // Send email
        try {
            await (0, email_1.sendPasswordResetEmail)(user.email, resetUrl);
        }
        catch (emailError) {
            console.error('Erro ao enviar email de reset:', emailError);
            // Don't expose email sending errors to client
        }
        res.json({ message: 'Se o email existir, receberás instruções para redefinir a password.' });
    }
    catch (error) {
        next(error);
    }
};
exports.forgotPassword = forgotPassword;
/**
 * Resets user password using a valid token.
 *
 * Validates the token, updates the password, and removes the used token.
 *
 * @route POST /api/auth/reset-password
 * @access Public
 */
const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            throw (0, http_errors_1.default)(400, 'Token e nova password são obrigatórios.');
        }
        if (newPassword.length < 6) {
            throw (0, http_errors_1.default)(400, 'A password deve ter pelo menos 6 caracteres.');
        }
        // Hash the provided token to compare with stored hash
        const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
        // Find valid token
        const resetRecord = await PasswordResetToken_1.default.findOne({
            tokenHash,
            expiresAt: { $gt: new Date() },
        });
        if (!resetRecord) {
            throw (0, http_errors_1.default)(400, 'Token inválido ou expirado.');
        }
        // Update user password
        const user = await User_1.default.findById(resetRecord.userId);
        if (!user) {
            throw (0, http_errors_1.default)(400, 'Utilizador não encontrado.');
        }
        user.passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
        await user.save();
        // Remove used token
        await PasswordResetToken_1.default.deleteOne({ _id: resetRecord._id });
        res.json({ message: 'Password atualizada com sucesso. Já podes fazer login.' });
    }
    catch (error) {
        next(error);
    }
};
exports.resetPassword = resetPassword;
