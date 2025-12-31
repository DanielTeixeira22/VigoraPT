"use strict";
/**
 * QR Code Login Controller
 *
 * Handles QR code-based authentication including:
 * - Starting a QR login session (generates code)
 * - Approving a session from mobile app
 * - Polling for session status
 * - Generating QR for existing session
 * - Scanning and completing login
 *
 * @module controllers/qr
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanLogin = exports.generate = exports.reject = exports.poll = exports.approve = exports.start = void 0;
const crypto_1 = __importDefault(require("crypto"));
const http_errors_1 = __importDefault(require("http-errors"));
const QrLoginToken_1 = __importDefault(require("../models/QrLoginToken"));
const User_1 = __importDefault(require("../models/User"));
const jwt_1 = require("../utils/jwt");
// ============================================================================
// Constants
// ============================================================================
/** QR code expiration time in milliseconds (2 minutes) */
const QR_EXPIRY_SHORT = 2 * 60 * 1000;
/** QR code expiration time in milliseconds (5 minutes) */
const QR_EXPIRY_LONG = 5 * 60 * 1000;
// ============================================================================
// Funcoes auxiliares
// ============================================================================
/**
 * Generates a secure random code for QR tokens.
 *
 * @returns 40-character hex string
 */
const generateCode = () => crypto_1.default.randomBytes(20).toString('hex');
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
 * Sanitizes a user document for safe API response.
 *
 * @param user - The user document to sanitize
 * @returns Sanitized user object
 */
const sanitizeUser = (user) => ({
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    profile: user.profile,
});
/**
 * Generates JWT tokens for a user.
 *
 * @param user - The user to generate tokens for
 * @returns Access and refresh tokens
 */
const generateTokens = (user) => ({
    accessToken: (0, jwt_1.signAccess)(user),
    refreshToken: (0, jwt_1.signRefresh)(user),
});
// ============================================================================
// QR Login Flow Endpoints
// ============================================================================
/**
 * Starts a new QR login session.
 * Called from the login page to generate a QR code.
 *
 * @route POST /api/auth/qr/start
 * @access Public
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns {object} QR code and expiration time
 */
const start = async (req, res, next) => {
    try {
        const code = generateCode();
        const expiresAt = new Date(Date.now() + QR_EXPIRY_SHORT);
        await QrLoginToken_1.default.create({
            code,
            expiresAt,
            status: 'PENDING',
        });
        res.status(201).json({
            code,
            expiresAt,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.start = start;
/**
 * Approves a QR login session from an authenticated mobile app.
 *
 * @route POST /api/auth/qr/approve
 * @access Private
 *
 * @param req - Express request with QR code
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns Success message
 * @throws {HttpError} 400 if code missing or already processed
 * @throws {HttpError} 401 if not authenticated
 * @throws {HttpError} 404 if code invalid
 * @throws {HttpError} 410 if code expired
 */
const approve = async (req, res, next) => {
    try {
        requireAuth(req);
        const { code } = req.body;
        if (!code) {
            throw (0, http_errors_1.default)(400, 'code é obrigatório.');
        }
        const token = await QrLoginToken_1.default.findOne({ code });
        if (!token) {
            throw (0, http_errors_1.default)(404, 'Código inválido.');
        }
        if (token.expiresAt < new Date()) {
            token.status = 'EXPIRED';
            await token.save();
            throw (0, http_errors_1.default)(410, 'Código expirado.');
        }
        if (token.status !== 'PENDING') {
            throw (0, http_errors_1.default)(400, `Token já está em estado ${token.status}.`);
        }
        token.userId = req.user._id;
        token.status = 'APPROVED';
        await token.save();
        res.json({ message: 'Aprovado com sucesso.' });
    }
    catch (error) {
        next(error);
    }
};
exports.approve = approve;
/**
 * Polls the status of a QR login session.
 * Called repeatedly from the login page to check for approval.
 *
 * @route GET /api/auth/qr/poll
 * @access Public
 *
 * @param req - Express request with code query param
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns Status or login credentials if approved
 * @throws {HttpError} 400 if code missing
 * @throws {HttpError} 404 if code invalid
 */
const poll = async (req, res, next) => {
    try {
        const { code } = req.query;
        if (!code) {
            throw (0, http_errors_1.default)(400, 'code é obrigatório.');
        }
        const token = await QrLoginToken_1.default.findOne({ code });
        if (!token) {
            throw (0, http_errors_1.default)(404, 'Código inválido.');
        }
        // Validate expiration.
        if (token.expiresAt < new Date()) {
            if (token.status !== 'APPROVED') {
                token.status = 'EXPIRED';
            }
            await token.save();
            res.status(410).json({
                status: token.status,
                message: 'Código expirado.',
            });
            return;
        }
        if (token.status === 'PENDING') {
            res.json({ status: 'PENDING' });
            return;
        }
        if (token.status === 'REJECTED') {
            res.status(403).json({
                status: 'REJECTED',
                message: 'Pedido rejeitado.',
            });
            return;
        }
        if (token.status === 'APPROVED') {
            const user = await User_1.default.findById(token.userId);
            if (!user) {
                token.status = 'EXPIRED';
                await token.save();
                res.status(410).json({
                    status: 'EXPIRED',
                    message: 'Utilizador já não existe.',
                });
                return;
            }
            const { accessToken, refreshToken } = generateTokens(user);
            // Delete used token
            await QrLoginToken_1.default.deleteOne({ _id: token._id });
            res.json({
                status: 'APPROVED',
                user: sanitizeUser(user),
                accessToken,
                refreshToken,
            });
            return;
        }
        res.json({ status: token.status });
    }
    catch (error) {
        next(error);
    }
};
exports.poll = poll;
/**
 * Rejects a QR login session.
 *
 * @route POST /api/auth/qr/reject
 * @access Public
 *
 * @param req - Express request with code
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns Success message
 * @throws {HttpError} 400 if code missing
 * @throws {HttpError} 404 if code invalid
 */
const reject = async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code) {
            throw (0, http_errors_1.default)(400, 'code é obrigatório.');
        }
        const token = await QrLoginToken_1.default.findOne({ code });
        if (!token) {
            throw (0, http_errors_1.default)(404, 'Código inválido.');
        }
        token.status = 'REJECTED';
        await token.save();
        res.json({ message: 'Pedido rejeitado.' });
    }
    catch (error) {
        next(error);
    }
};
exports.reject = reject;
/**
 * Generates a QR code for an authenticated user to share.
 * Others can scan this to log in as this user (single use).
 *
 * @route POST /api/auth/qr/generate
 * @access Private
 *
 * @param req - Express request with authenticated user
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns {object} Token and expiration time
 * @throws {HttpError} 401 if not authenticated
 */
const generate = async (req, res, next) => {
    try {
        requireAuth(req);
        // Invalidate any previous active tokens for this user
        await QrLoginToken_1.default.updateMany({ userId: req.user._id, status: { $in: ['PENDING', 'APPROVED'] } }, { status: 'EXPIRED' });
        const code = generateCode();
        const expiresAt = new Date(Date.now() + QR_EXPIRY_LONG);
        await QrLoginToken_1.default.create({
            code,
            userId: req.user._id,
            expiresAt,
            status: 'APPROVED', // Pre-approved since user generated it
        });
        res.status(201).json({
            token: code,
            expiresAt,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.generate = generate;
/**
 * Completes login by scanning a QR code token.
 * Called from the login page after scanning a user-generated QR code.
 *
 * @route POST /api/auth/qr/scan-login
 * @access Public
 *
 * @param req - Express request with scanned token
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns User data and JWT tokens
 * @throws {HttpError} 400 if token missing or invalid state
 * @throws {HttpError} 404 if token not found
 * @throws {HttpError} 410 if token expired or user not found
 */
const scanLogin = async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) {
            throw (0, http_errors_1.default)(400, 'token é obrigatório.');
        }
        const qrToken = await QrLoginToken_1.default.findOne({ code: token });
        if (!qrToken) {
            throw (0, http_errors_1.default)(404, 'Token inválido.');
        }
        // Validate expiration.
        if (qrToken.expiresAt < new Date()) {
            qrToken.status = 'EXPIRED';
            await qrToken.save();
            throw (0, http_errors_1.default)(410, 'Token expirado.');
        }
        // Token must be pre-approved (user-generated)
        if (qrToken.status !== 'APPROVED') {
            throw (0, http_errors_1.default)(400, `Token em estado inválido: ${qrToken.status}`);
        }
        // Get user.
        const user = await User_1.default.findById(qrToken.userId);
        if (!user) {
            qrToken.status = 'EXPIRED';
            await qrToken.save();
            throw (0, http_errors_1.default)(410, 'Utilizador não encontrado.');
        }
        const { accessToken, refreshToken } = generateTokens(user);
        // Delete used token (single use)
        await QrLoginToken_1.default.deleteOne({ _id: qrToken._id });
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
exports.scanLogin = scanLogin;
