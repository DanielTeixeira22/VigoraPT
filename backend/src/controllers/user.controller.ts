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

import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import User, { UserRole } from '../models/User';

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Valid user roles */
const VALID_ROLES: UserRole[] = ['ADMIN', 'TRAINER', 'CLIENT'];

/** Payload for updating own profile */
interface UpdateProfilePayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  bio?: string;
}

/** Payload for admin creating a user */
interface AdminCreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}

/** Payload for admin updating a user */
interface AdminUpdateUserPayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

/** Payload for changing password */
interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/** Query parameters for user search */
interface SearchUsersQuery {
  q?: string;
  role?: string;
  page?: string;
  limit?: string;
}

// ============================================================================
// Funcoes auxiliares
// ============================================================================

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
 * Parses a pagination parameter with fallback.
 * 
 * @param value - String value to parse
 * @param fallback - Default value if parsing fails
 * @returns Parsed number or fallback
 */
const parsePagination = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * Validates that a role is valid.
 * 
 * @param role - The role to validate
 * @throws {HttpError} 400 if role is invalid
 */
const validateRole = (role: string): void => {
  if (!VALID_ROLES.includes(role as UserRole)) {
    throw createError(400, 'Role inválido.');
  }
};

/**
 * Validates required fields for user creation.
 * 
 * @param payload - The creation payload
 * @throws {HttpError} 400 if required fields missing
 */
const validateCreateUserPayload = (payload: Partial<AdminCreateUserPayload>): void => {
  const requiredFields: (keyof AdminCreateUserPayload)[] = [
    'username',
    'email',
    'password',
    'role',
  ];

  const missingFields = requiredFields.filter((field) => !payload[field]);
  if (missingFields.length > 0) {
    throw createError(400, `Campos obrigatórios: ${requiredFields.join(', ')}.`);
  }

  validateRole(payload.role!);
};

/**
 * Checks for duplicate email or username.
 * 
 * @param email - Normalized email to check
 * @param username - Username to check
 * @param excludeId - Optional user ID to exclude from check
 * @throws {HttpError} 409 if duplicate found
 */
const checkDuplicateUser = async (
  email: string,
  username?: string,
  excludeId?: string
): Promise<void> => {
  const orConditions: Record<string, string>[] = [{ email }];
  if (username) {
    orConditions.push({ username });
  }

  const filter: Record<string, unknown> = { $or: orConditions };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const existing = await User.findOne(filter);
  if (existing) {
    throw createError(409, 'Email ou username já existe.');
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
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const user = await User.findById(req.user!._id).select('-passwordHash');
    if (!user) {
      throw createError(404, 'Utilizador não encontrado.');
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

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
export const updateMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const { email, firstName, lastName, avatarUrl, bio } = req.body;
    const update: Record<string, unknown> = {};

    if (email) update.email = email.toLowerCase();
    if (firstName) update['profile.firstName'] = firstName;
    if (lastName) update['profile.lastName'] = lastName;
    if (avatarUrl !== undefined) update['profile.avatarUrl'] = avatarUrl;
    if (bio !== undefined) update['profile.bio'] = bio;

    const updatedUser = await User.findByIdAndUpdate(
      req.user!._id,
      { $set: update },
      { new: true }
    ).select('-passwordHash');

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

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
export const changeMyPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const { currentPassword, newPassword } = req.body as Partial<ChangePasswordPayload>;

    if (!currentPassword || !newPassword) {
      throw createError(400, 'Campos obrigatórios: currentPassword e newPassword.');
    }

    const user = await User.findById(req.user!._id);
    if (!user) {
      throw createError(404, 'Utilizador não encontrado.');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw createError(401, 'Password atual incorreta.');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ message: 'Password alterada com sucesso.' });
  } catch (error) {
    next(error);
  }
};

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
export const searchUsers = async (
  req: Request<unknown, unknown, unknown, SearchUsersQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { q = '', role } = req.query;
    const page = Math.max(1, parsePagination(req.query.page, 1));
    const limit = Math.max(1, Math.min(100, parsePagination(req.query.limit, 20)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

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

    if (role) filter.role = role;

    const [users, total] = await Promise.all([
      User.find(filter).select('-passwordHash').skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({ data: users, page, total });
  } catch (error) {
    next(error);
  }
};

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
export const adminCreateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = req.body as Partial<AdminCreateUserPayload>;
    validateCreateUserPayload(payload);

    const { username, email, password, role, firstName, lastName } =
      payload as AdminCreateUserPayload;

    const normalizedEmail = email.toLowerCase();
    await checkDuplicateUser(normalizedEmail, username);

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
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
  } catch (error) {
    next(error);
  }
};

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
export const adminUpdateUser = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || !Types.ObjectId.isValid(id)) {
      throw createError(400, 'Id inválido.');
    }

    const { email, firstName, lastName, role, isActive } =
      req.body as AdminUpdateUserPayload;

    const update: Record<string, unknown> = {};

    if (email) {
      const normalizedEmail = email.toLowerCase();
      // Validate email conflict.
      const existingWithEmail = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: id },
      });
      if (existingWithEmail) {
        throw createError(409, 'Já existe um utilizador com esse email.');
      }
      update.email = normalizedEmail;
    }

    if (firstName) update['profile.firstName'] = firstName;
    if (lastName) update['profile.lastName'] = lastName;

    if (typeof isActive === 'boolean') {
      update.isActive = isActive;
    }

    if (role) {
      validateRole(role);
      update.role = role;
    }

    if (Object.keys(update).length === 0) {
      throw createError(400, 'Nenhum campo para atualizar.');
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      throw createError(404, 'Utilizador não encontrado.');
    }

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

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
export const toggleUserActive = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw createError(404, 'Utilizador não encontrado.');
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({ id: user._id, isActive: user.isActive });
  } catch (error) {
    next(error);
  }
};
