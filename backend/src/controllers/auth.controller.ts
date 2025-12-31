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

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import createError from 'http-errors';
import User, { UserDocument, UserRole } from '../models/User';
import TrainerProfile from '../models/TrainerProfile';
import ClientProfile from '../models/ClientProfile';
import Notification from '../models/Notification';
import PasswordResetToken from '../models/PasswordResetToken';
import { signAccess, signRefresh, verifyRefresh } from '../utils/jwt';
import { sendPasswordResetEmail } from '../utils/email';

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Payload for user registration */
interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  wantsTrainer?: boolean;
  trainerCertification?: string;
  trainerSpecialties?: string;
  trainerHourlyRate?: string;
}

/** Payload for user login */
interface LoginPayload {
  emailOrUsername: string;
  password: string;
}

/** Payload for token refresh */
interface RefreshPayload {
  refreshToken: string;
}

/** Sanitized user object for API responses */
interface SanitizedUser {
  id: unknown;
  username: string;
  email: string;
  role: UserRole;
  profile?: {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
}

/** Authentication response structure */
interface AuthResponse {
  user: SanitizedUser;
  accessToken: string;
  refreshToken: string;
}

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
const sanitizeUser = (user: UserDocument): SanitizedUser => ({
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
const validateRegistrationPayload = (payload: Partial<RegisterPayload>): void => {
  const requiredFields: (keyof RegisterPayload)[] = [
    'username',
    'email',
    'password',
    'firstName',
    'lastName',
  ];

  const missingFields = requiredFields.filter((field) => !payload[field]);
  if (missingFields.length > 0) {
    throw createError(400, `Campos obrigatórios: ${requiredFields.join(', ')}.`);
  }
};

/**
 * Parses trainer specialties from comma-separated string.
 * 
 * @param specialties - Comma-separated specialties string
 * @returns Array of trimmed specialty strings
 */
const parseSpecialties = (specialties?: string): string[] => {
  if (!specialties) return [];
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
const createPendingTrainerProfile = async (
  userId: unknown,
  certification?: string,
  specialties?: string[],
  documentUrl?: string,
  hourlyRate?: number
): Promise<void> => {
  await TrainerProfile.create({
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
const notifyAdminsOfTrainerApplication = async (user: UserDocument): Promise<void> => {
  const admins = await User.find({ role: 'ADMIN', isActive: true }).select('_id');

  if (admins.length === 0) return;

  await Notification.insertMany(
    admins.map((admin) => ({
      recipientId: admin._id,
      type: 'ALERT',
      payload: {
        request: 'TRAINER_VALIDATION',
        userId: user._id,
        username: user.username,
        email: user.email,
      },
      isRead: false,
    }))
  );
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
export const register = async (
  req: Request<unknown, unknown, RegisterPayload>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = req.body;
    validateRegistrationPayload(payload);

    const {
      username,
      email,
      password,
      firstName,
      lastName,
      trainerCertification,
      trainerSpecialties,
      trainerHourlyRate,
    } = payload;
    const wantsTrainer = Boolean(payload.wantsTrainer);

    const normalizedEmail = email.toLowerCase();
    const role: UserRole = 'CLIENT'; // Always start as CLIENT

    // Validate existing user.
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username }],
    });
    if (existingUser) {
      throw createError(409, 'Email ou username já existe.');
    }

    // Create user account
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      username,
      email: normalizedEmail,
      passwordHash,
      role,
      profile: { firstName, lastName },
      isActive: true,
    });

    // Create default client profile
    await ClientProfile.findOneAndUpdate(
      { userId: user._id },
      { $setOnInsert: { userId: user._id } },
      { upsert: true, new: true }
    );

    // Generate tokens
    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    // Handle trainer application if requested
    if (wantsTrainer) {
      const uploadedDoc = req.file;
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const documentUrl = uploadedDoc
        ? `${baseUrl}/uploads/${path.basename(uploadedDoc.filename)}`
        : undefined;
      const specialties = parseSpecialties(trainerSpecialties);
      const hourlyRate = trainerHourlyRate ? Number(trainerHourlyRate) : undefined;

      await createPendingTrainerProfile(
        user._id,
        trainerCertification,
        specialties,
        documentUrl,
        hourlyRate
      );

      await notifyAdminsOfTrainerApplication(user);
    }

    res.status(201).json({
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    } as AuthResponse);
  } catch (error) {
    next(error);
  }
};

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
export const login = async (
  req: Request<unknown, unknown, LoginPayload>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      throw createError(400, 'Campos obrigatórios: emailOrUsername e password.');
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });

    if (!user) {
      throw createError(401, 'Credenciais inválidas.');
    }

    if (!user.isActive) {
      throw createError(403, 'Conta desativada.');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw createError(401, 'Credenciais inválidas.');
    }

    // Generate tokens
    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    res.json({
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    } as AuthResponse);
  } catch (error) {
    next(error);
  }
};

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
export const refresh = async (
  req: Request<unknown, unknown, RefreshPayload>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw createError(400, 'refreshToken é obrigatório.');
    }

    // Verify refresh token
    let payload;
    try {
      payload = verifyRefresh(refreshToken);
    } catch {
      throw createError(401, 'Refresh token inválido ou expirado.');
    }

    // Validate user exists and is active
    const user = await User.findById(payload.id);
    if (!user || !user.isActive) {
      throw createError(401, 'Utilizador inválido.');
    }

    // Generate new tokens (rotation strategy)
    const newAccessToken = signAccess(user);
    const newRefreshToken = signRefresh(user);

    res.json({
      user: sanitizeUser(user),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    } as AuthResponse);
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// Password Reset Endpoints
// ============================================================================

/** Payload for forgot password request */
interface ForgotPasswordPayload {
  email: string;
}

/** Payload for reset password request */
interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

/**
 * Initiates password reset process.
 * 
 * Generates a secure token, stores its hash, and sends reset email.
 * For security, always returns success even if email doesn't exist.
 * 
 * @route POST /api/auth/forgot-password
 * @access Public
 */
export const forgotPassword = async (
  req: Request<unknown, unknown, ForgotPasswordPayload>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      throw createError(400, 'Email é obrigatório.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Always return success for security (prevents email enumeration)
    if (!user || !user.isActive) {
      res.json({ message: 'Se o email existir, receberás instruções para redefinir a password.' });
      return;
    }

    // Delete any existing tokens for this user
    await PasswordResetToken.deleteMany({ userId: user._id });

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store token hash with 1 hour expiration
    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    // Build reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send email
    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (emailError) {
      console.error('Erro ao enviar email de reset:', emailError);
      // Don't expose email sending errors to client
    }

    res.json({ message: 'Se o email existir, receberás instruções para redefinir a password.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Resets user password using a valid token.
 * 
 * Validates the token, updates the password, and removes the used token.
 * 
 * @route POST /api/auth/reset-password
 * @access Public
 */
export const resetPassword = async (
  req: Request<unknown, unknown, ResetPasswordPayload>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw createError(400, 'Token e nova password são obrigatórios.');
    }

    if (newPassword.length < 6) {
      throw createError(400, 'A password deve ter pelo menos 6 caracteres.');
    }

    // Hash the provided token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid token
    const resetRecord = await PasswordResetToken.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      throw createError(400, 'Token inválido ou expirado.');
    }

    // Update user password
    const user = await User.findById(resetRecord.userId);
    if (!user) {
      throw createError(400, 'Utilizador não encontrado.');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    // Remove used token
    await PasswordResetToken.deleteOne({ _id: resetRecord._id });

    res.json({ message: 'Password atualizada com sucesso. Já podes fazer login.' });
  } catch (error) {
    next(error);
  }
};
