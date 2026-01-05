/**
 * Training Plan Controller
 * 
 * Handles training plan management including:
 * - Training plans CRUD operations
 * - Training sessions CRUD operations
 * - Workout completion logging
 * 
 * @module controllers/plan
 */

import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import TrainingPlan from '../models/TrainingPlan';
import TrainingSession from '../models/TrainingSession';
import CompletionLog from '../models/CompletionLog';
import TrainerProfile from '../models/TrainerProfile';
import ClientProfile from '../models/ClientProfile';
import Notification from '../models/Notification';
import { emitToUser } from '../socket/socketServer';

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Pagination options */
interface PaginationOptions {
  max?: number;
  def?: number;
}

/** Pagination result */
interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
}

/** Payload for creating a training plan */
interface CreatePlanPayload {
  clientId: string;
  trainerId: string;
  title: string;
  description?: string;
  frequencyPerWeek: number;
  startDate: string;
  endDate?: string;
}

/** Payload for creating a training session */
interface CreateSessionPayload {
  dayOfWeek: number;
  order?: number;
  notes?: string;
  exercises?: unknown[];
}

/** Payload for workout completion */
interface CompletionPayload {
  clientId: string;
  trainerId: string;
  planId: string;
  sessionId: string;
  date: string;
  status: 'DONE' | 'MISSED';
  reason?: string;
  proofImage?: string;
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
 * Extracts pagination parameters from request query.
 * 
 * @param req - Express request object
 * @param options - Pagination configuration
 * @returns Pagination parameters for database queries
 */
const paginate = (
  req: Request,
  options: PaginationOptions = {}
): PaginationResult => {
  const { max = 100, def = 20 } = options;
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
  const limitRaw = Number.parseInt(String(req.query.limit ?? `${def}`), 10);
  const limit = Math.min(max, Math.max(1, limitRaw || def));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Validates that a trainer is approved by admin.
 * 
 * @param trainerId - The trainer profile ID to validate
 * @throws {HttpError} 403 if trainer is not validated
 */
const ensureTrainerValidated = async (trainerId: string): Promise<void> => {
  const trainerProfile = await TrainerProfile.findById(trainerId).select('validatedByAdmin');
  if (!trainerProfile || !trainerProfile.validatedByAdmin) {
    throw createError(403, 'Trainer não validado.');
  }
};

/**
 * Validates required fields for plan creation.
 * 
 * @param payload - The plan creation payload
 * @throws {HttpError} 400 if required fields are missing
 */
const validateCreatePlanPayload = (payload: Partial<CreatePlanPayload>): void => {
  const requiredFields: (keyof CreatePlanPayload)[] = [
    'clientId',
    'trainerId',
    'title',
    'frequencyPerWeek',
    'startDate',
  ];

  const missingFields = requiredFields.filter((field) => !payload[field]);
  if (missingFields.length > 0) {
    throw createError(400, `Campos obrigatórios: ${requiredFields.join(', ')}.`);
  }
};

/**
 * Validates required fields for completion logging.
 * 
 * @param payload - The completion payload
 * @throws {HttpError} 400 if required fields are missing or status is invalid
 */
const validateCompletionPayload = (payload: Partial<CompletionPayload>): void => {
  const requiredFields: (keyof CompletionPayload)[] = [
    'clientId',
    'trainerId',
    'planId',
    'sessionId',
    'date',
    'status',
  ];

  const missingFields = requiredFields.filter((field) => !payload[field]);
  if (missingFields.length > 0) {
    throw createError(400, `Campos obrigatórios: ${requiredFields.join(', ')}.`);
  }

  if (!['DONE', 'MISSED'].includes(payload.status!)) {
    throw createError(400, 'status deve ser DONE ou MISSED.');
  }
};

/**
 * Notifies trainer about workout completion status.
 * 
 * @param trainerId - The trainer profile ID
 * @param status - Completion status (DONE or MISSED)
 * @param payload - Notification payload data
 */
const notifyTrainerOfCompletion = async (
  trainerId: string,
  status: 'DONE' | 'MISSED',
  payload: Record<string, unknown>
): Promise<void> => {
  try {
    const trainerProfile = await TrainerProfile.findById(trainerId).select('userId');
    if (!trainerProfile?.userId) return;

    const notificationType = status === 'MISSED' ? 'MISSED_WORKOUT' : 'WORKOUT_DONE';
    const notification = await Notification.create({
      recipientId: trainerProfile.userId,
      type: notificationType,
      payload,
      isRead: false,
    });

    // Emit real-time notification
    emitToUser(String(trainerProfile.userId), 'notification:new', notification);
  } catch (error: unknown) {
    // Log error but don't block completion
    console.error('[notifyTrainerOfCompletion] Falha ao enviar notificação:', error);
  }
};

// ============================================================================
// Training Plans Endpoints
// ============================================================================

/**
 * Lists training plans with optional filtering.
 * 
 * @route GET /api/plans
 * @access Private
 * 
 * @param req - Express request with optional query filters (clientId, trainerId)
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {PaginatedResponse<TrainingPlan>} Paginated list of plans
 */
export const listPlans = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page, limit, skip } = paginate(req);
    const query: Record<string, unknown> = {};
    const { clientId, trainerId } = req.query as { clientId?: string; trainerId?: string };

    if (clientId) query.clientId = clientId;
    if (trainerId) query.trainerId = trainerId;

    const [items, total] = await Promise.all([
      TrainingPlan.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      TrainingPlan.countDocuments(query),
    ]);

    res.json({ items, page, total, pages: Math.ceil(total / limit) } as PaginatedResponse<unknown>);
  } catch (error) {
    next(error);
  }
};

/**
 * Creates a new training plan for a client.
 * 
 * @route POST /api/plans
 * @access Private - TRAINER only
 * 
 * @param req - Express request with plan data in body
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {TrainingPlan} The created training plan
 * @throws {HttpError} 400 if required fields missing
 * @throws {HttpError} 403 if trainer not validated
 * @throws {HttpError} 404 if client not found
 */
export const createPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = req.body as Partial<CreatePlanPayload>;
    validateCreatePlanPayload(payload);

    const { clientId, trainerId, title, description, frequencyPerWeek, startDate, endDate } =
      payload as CreatePlanPayload;

    await ensureTrainerValidated(trainerId);

    const client = await ClientProfile.findById(clientId).select('_id userId');
    if (!client) {
      throw createError(404, 'Cliente não encontrado.');
    }

    const plan = await TrainingPlan.create({
      clientId,
      trainerId,
      title,
      description,
      frequencyPerWeek,
      startDate,
      endDate,
    });

    // Notify client about new plan
    if (client.userId) {
      const notification = await Notification.create({
        recipientId: client.userId,
        type: 'NEW_PLAN',
        payload: { planId: plan._id, title: plan.title },
        isRead: false,
      });
      emitToUser(String(client.userId), 'notification:new', notification);
    }

    res.status(201).json(plan);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a training plan by ID.
 * 
 * @route GET /api/plans/:id
 * @access Private
 * 
 * @param req - Express request with plan ID in params
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {TrainingPlan} The requested training plan
 * @throws {HttpError} 404 if plan not found
 */
export const getPlanById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const plan = await TrainingPlan.findById(req.params.id);
    if (!plan) {
      throw createError(404, 'Plano não encontrado.');
    }
    res.json(plan);
  } catch (error) {
    next(error);
  }
};

/**
 * Updates a training plan.
 * 
 * @route PATCH /api/plans/:id
 * @access Private - TRAINER only
 * 
 * @param req - Express request with updates in body
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {TrainingPlan} The updated training plan
 * @throws {HttpError} 403 if new trainer not validated
 * @throws {HttpError} 404 if plan not found
 */
export const updatePlan = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const updates = { ...req.body };

    // Validate new trainer if being changed
    if ('trainerId' in updates && updates.trainerId) {
      await ensureTrainerValidated(String(updates.trainerId));
    }

    const plan = await TrainingPlan.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );

    if (!plan) {
      throw createError(404, 'Plano não encontrado.');
    }

    res.json(plan);
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a training plan and its associated sessions.
 * 
 * @route DELETE /api/plans/:id
 * @access Private - TRAINER only
 * 
 * @param req - Express request with plan ID in params
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns Success message
 * @throws {HttpError} 404 if plan not found
 */
export const deletePlan = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const plan = await TrainingPlan.findByIdAndDelete(req.params.id);
    if (!plan) {
      throw createError(404, 'Plano não encontrado.');
    }

    // Cascade delete sessions
    await TrainingSession.deleteMany({ planId: plan._id });

    res.json({ message: 'Plano removido.' });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// Training Sessions Endpoints
// ============================================================================

/**
 * Lists training sessions for a plan.
 * 
 * @route GET /api/plans/:planId/sessions
 * @access Private
 * 
 * @param req - Express request with planId in params
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {TrainingSession[]} Array of training sessions
 */
export const listSessions = async (
  req: Request<{ planId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { planId } = req.params;
    const query: Record<string, unknown> = { planId };
    const { dayOfWeek } = req.query as { dayOfWeek?: string };

    if (dayOfWeek) {
      query.dayOfWeek = Number.parseInt(dayOfWeek, 10);
    }

    const sessions = await TrainingSession.find(query).sort({
      dayOfWeek: 1,
      order: 1,
      createdAt: 1,
    });

    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

/**
 * Creates a new training session for a plan.
 * 
 * @route POST /api/plans/:planId/sessions
 * @access Private - TRAINER only
 * 
 * @param req - Express request with session data in body
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {TrainingSession} The created session
 * @throws {HttpError} 400 if dayOfWeek missing or too many exercises
 */
export const createSession = async (
  req: Request<{ planId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { planId } = req.params;
    const { dayOfWeek, order = 0, notes, exercises = [] } = req.body as Partial<CreateSessionPayload>;

    if (typeof dayOfWeek !== 'number') {
      throw createError(400, 'dayOfWeek é obrigatório (0-6).');
    }

    if (Array.isArray(exercises) && exercises.length > 10) {
      throw createError(400, 'Máximo de 10 exercícios por sessão.');
    }

    const session = await TrainingSession.create({
      planId,
      dayOfWeek,
      order,
      notes,
      exercises,
    });

    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a training session by ID.
 * 
 * @route GET /api/sessions/:id
 * @access Private
 * 
 * @param req - Express request with session ID in params
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {TrainingSession} The requested session
 * @throws {HttpError} 404 if session not found
 */
export const getSessionById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const session = await TrainingSession.findById(req.params.id);
    if (!session) {
      throw createError(404, 'Sessão não encontrada.');
    }
    res.json(session);
  } catch (error) {
    next(error);
  }
};

/**
 * Updates a training session.
 * 
 * @route PATCH /api/sessions/:id
 * @access Private - TRAINER only
 * 
 * @param req - Express request with updates in body
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {TrainingSession} The updated session
 * @throws {HttpError} 400 if too many exercises
 * @throws {HttpError} 404 if session not found
 */
export const updateSession = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const updates = { ...req.body };

    if (Array.isArray(updates.exercises) && updates.exercises.length > 10) {
      throw createError(400, 'Máximo de 10 exercícios por sessão.');
    }

    const session = await TrainingSession.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );

    if (!session) {
      throw createError(404, 'Sessão não encontrada.');
    }

    res.json(session);
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a training session.
 * 
 * @route DELETE /api/sessions/:id
 * @access Private - TRAINER only
 * 
 * @param req - Express request with session ID in params
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns Success message
 * @throws {HttpError} 404 if session not found
 */
export const deleteSession = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const session = await TrainingSession.findByIdAndDelete(req.params.id);
    if (!session) {
      throw createError(404, 'Sessão não encontrada.');
    }
    res.json({ message: 'Sessão removida.' });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// Completion Logs Endpoints
// ============================================================================

/**
 * Lists workout completion logs with optional filtering.
 * 
 * @route GET /api/completion
 * @access Private
 * 
 * @param req - Express request with optional filters (clientId, trainerId, status, from, to)
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {PaginatedResponse<CompletionLog>} Paginated completion logs
 */
export const listCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page, limit, skip } = paginate(req, { def: 30, max: 200 });
    const query: Record<string, unknown> = {};
    const { clientId, trainerId, status, from, to } = req.query as {
      clientId?: string;
      trainerId?: string;
      status?: string;
      from?: string;
      to?: string;
    };

    if (clientId) query.clientId = clientId;
    if (trainerId) query.trainerId = trainerId;
    if (status) query.status = status;

    // Date range filter
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.$gte = new Date(from);
      if (to) {
        // Add 1 day to include completions on the 'to' date itself
        const toDate = new Date(to);
        toDate.setDate(toDate.getDate() + 1);
        dateFilter.$lt = toDate;
      }
      query.date = dateFilter;
    }

    const [items, total] = await Promise.all([
      CompletionLog.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit),
      CompletionLog.countDocuments(query),
    ]);

    res.json({ items, page, total, pages: Math.ceil(total / limit) } as PaginatedResponse<unknown>);
  } catch (error) {
    next(error);
  }
};

/**
 * Creates or updates a workout completion log.
 * 
 * Notifies the trainer when a client completes or misses a workout.
 * 
 * @route POST /api/completion
 * @access Private - CLIENT only
 * 
 * @param req - Express request with completion data in body
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {CompletionLog} The created/updated completion log
 * @throws {HttpError} 400 if required fields missing or invalid status
 */
export const upsertCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = req.body as Partial<CompletionPayload>;
    validateCompletionPayload(payload);

    const { clientId, trainerId, planId, sessionId, date, status, reason, proofImage } =
      payload as CompletionPayload;

    // Normalize date to UTC midnight for consistent comparison
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const update: Record<string, unknown> = {
      status,
      reason: status === 'MISSED' ? (reason || null) : undefined,
      proofImage: proofImage || undefined,
    };

    const completionLog = await CompletionLog.findOneAndUpdate(
      { clientId, sessionId, date: normalizedDate, planId, trainerId },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Get client name for notification
    const clientProfile = await ClientProfile.findById(clientId)
      .populate<{ userId: { username?: string; profile?: { firstName?: string; lastName?: string } } }>('userId', 'username profile.firstName profile.lastName');

    const clientUser = clientProfile?.userId;
    const clientName = clientUser?.profile?.firstName
      ? `${clientUser.profile.firstName}${clientUser.profile.lastName ? ` ${clientUser.profile.lastName}` : ''}`
      : clientUser?.username || 'Cliente';

    // Notify trainer
    await notifyTrainerOfCompletion(trainerId, status, {
      clientId,
      clientName,
      planId,
      sessionId,
      date: normalizedDate,
    });

    res.status(201).json(completionLog);
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a completion log entry.
 * 
 * @route DELETE /api/completion/:id
 * @access Private
 * 
 * @param req - Express request with completion ID in params
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns Success message
 * @throws {HttpError} 404 if log not found
 */
export const deleteCompletion = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const completionLog = await CompletionLog.findByIdAndDelete(req.params.id);
    if (!completionLog) {
      throw createError(404, 'Registo não encontrado.');
    }
    res.json({ message: 'Registo removido.' });
  } catch (error) {
    next(error);
  }
};
