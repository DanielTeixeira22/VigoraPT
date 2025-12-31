/**
 * Client Controller
 * 
 * Handles all client-related operations including:
 * - Client profile management (get/update own profile)
 * - Trainer operations (create clients, list clients)
 * 
 * @module controllers/client
 */

import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import bcrypt from 'bcryptjs';
import ClientProfile from '../models/ClientProfile';
import User from '../models/User';
import TrainerProfile from '../models/TrainerProfile';

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Fields that clients are allowed to update on their own profile */
const ALLOWED_PROFILE_FIELDS = ['goals', 'injuries', 'preferences'] as const;
type AllowedProfileField = (typeof ALLOWED_PROFILE_FIELDS)[number];

/** Payload for creating a new client */
interface CreateClientPayload {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  goals?: string;
}

/** Response structure for client creation */
interface CreateClientResponse {
  message: string;
  user: typeof User.prototype;
  clientProfile: typeof ClientProfile.prototype;
}

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
const pickAllowedFields = (
  payload: Record<string, unknown>
): Partial<Record<AllowedProfileField, string>> => {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) =>
      ALLOWED_PROFILE_FIELDS.includes(key as AllowedProfileField)
    )
  ) as Partial<Record<AllowedProfileField, string>>;
};

/**
 * Validates that the request has an authenticated user.
 * Throws a 401 error if not authenticated.
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
 * Retrieves the trainer profile for the authenticated user.
 * 
 * @param userId - The user ID to find trainer profile for
 * @returns The trainer profile document
 * @throws {HttpError} 400 if trainer profile not found
 */
const getTrainerProfileByUserId = async (userId: string) => {
  const trainerProfile = await TrainerProfile.findOne({ userId }).select('_id');
  if (!trainerProfile) {
    throw createError(400, 'Perfil de treinador não encontrado.');
  }
  return trainerProfile;
};

/**
 * Validates required fields for client creation.
 * 
 * @param payload - The request payload to validate
 * @throws {HttpError} 400 if any required field is missing
 */
const validateCreateClientPayload = (payload: Partial<CreateClientPayload>): void => {
  const requiredFields: (keyof CreateClientPayload)[] = [
    'username',
    'email',
    'password',
    'firstName',
    'lastName',
  ];

  const missingFields = requiredFields.filter((field) => !payload[field]);
  if (missingFields.length > 0) {
    throw createError(
      400,
      `Campos obrigatórios: ${requiredFields.join(', ')}.`
    );
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
export const getMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const profile = await ClientProfile.findOne({ userId: req.user!._id });
    if (!profile) {
      throw createError(404, 'Perfil de cliente não encontrado.');
    }

    res.json(profile);
  } catch (error) {
    next(error);
  }
};

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
export const updateMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const allowedUpdates = pickAllowedFields(req.body ?? {});
    const updatedProfile = await ClientProfile.findOneAndUpdate(
      { userId: req.user!._id },
      { $set: { ...allowedUpdates, userId: req.user!._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json(updatedProfile);
  } catch (error) {
    next(error);
  }
};

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
export const trainerCreateClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const trainerProfile = await getTrainerProfileByUserId(String(req.user!._id));
    const payload = req.body as Partial<CreateClientPayload>;

    validateCreateClientPayload(payload);

    const { username, email, password, firstName, lastName, goals } =
      payload as CreateClientPayload;

    const normalizedEmail = email.toLowerCase();

    // Validate existing user with the same email or username.
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username }],
    });

    if (existingUser) {
      throw createError(409, 'Email ou username já existe.');
    }

    // Create user account
    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = await User.create({
      username,
      email: normalizedEmail,
      passwordHash,
      role: 'CLIENT',
      profile: { firstName, lastName },
      isActive: true,
    });

    // Create client profile linked to trainer
    const clientProfile = await ClientProfile.create({
      userId: newUser._id,
      trainerId: trainerProfile._id,
      goals,
    });

    res.status(201).json({
      message: 'Cliente criado com sucesso.',
      user: newUser,
      clientProfile,
    } as CreateClientResponse);
  } catch (error) {
    next(error);
  }
};

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
export const listMyClients = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const trainerProfile = await getTrainerProfileByUserId(String(req.user!._id));

    const clients = await ClientProfile.find({ trainerId: trainerProfile._id })
      .populate('userId', 'username email profile.firstName profile.lastName profile.avatarUrl');

    res.json(clients);
  } catch (error) {
    next(error);
  }
};
