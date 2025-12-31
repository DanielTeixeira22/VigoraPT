/**
 * Trainer Change Request Controller
 * 
 * Handles client requests to change trainers including:
 * - Creating change requests
 * - Listing all requests (admin)
 * - Approving/rejecting requests (admin)
 * 
 * @module controllers/trainer-change
 */

import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import TrainerChangeRequest from '../models/TrainerChangeRequest';
import ClientProfile from '../models/ClientProfile';
import TrainerProfile from '../models/TrainerProfile';
import User from '../models/User';
import Notification from '../models/Notification';
import { emitToUser } from '../socket/socketServer';

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Payload for creating a trainer change request */
interface CreateRequestPayload {
  requestedTrainerId: string;
  reason?: string;
}

/** Decision status for a request */
type RequestDecision = 'APPROVED' | 'REJECTED';

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
 * Notifies all active admins about a new request.
 * 
 * @param requestId - The request document ID
 * @param clientId - The client profile ID
 */
const notifyAdminsOfRequest = async (
  requestId: unknown,
  clientId: unknown
): Promise<void> => {
  const admins = await User.find({ role: 'ADMIN', isActive: true }).select('_id');

  if (admins.length === 0) return;

  const notifications = await Notification.insertMany(
    admins.map((admin) => ({
      recipientId: admin._id,
      type: 'TRAINER_CHANGE_REQUEST',
      payload: { requestId, clientId },
      isRead: false,
    }))
  );

  // Emit real-time notifications to all admins
  admins.forEach((admin, index) => {
    emitToUser(String(admin._id), 'notification:new', notifications[index]);
  });
};

// ============================================================================
// Request Management Endpoints
// ============================================================================

/**
 * Creates a new trainer change request.
 * 
 * @route POST /api/trainer-requests
 * @access Private - CLIENT only
 * 
 * @param req - Express request with request data
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {TrainerChangeRequest} The created request
 * @throws {HttpError} 400 if trainer invalid or not validated
 * @throws {HttpError} 401 if not authenticated
 * @throws {HttpError} 409 if pending request already exists
 */
export const createRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const { requestedTrainerId, reason } = req.body as Partial<CreateRequestPayload>;

    if (!requestedTrainerId) {
      throw createError(400, 'requestedTrainerId é obrigatório.');
    }

    // Get or create client profile.
    let clientProfile = await ClientProfile.findOne({ userId: req.user!._id });
    if (!clientProfile) {
      clientProfile = await ClientProfile.create({
        userId: req.user!._id,
        trainerId: null,
      });
    }

    // Validate trainer exists and is approved
    const trainer = await TrainerProfile.findById(requestedTrainerId).select('validatedByAdmin');
    if (!trainer || !trainer.validatedByAdmin) {
      throw createError(400, 'Treinador inválido ou não validado.');
    }

    // Prevent multiple pending requests
    const existingRequest = await TrainerChangeRequest.findOne({
      clientId: clientProfile._id,
      status: 'PENDING',
    });
    if (existingRequest) {
      throw createError(409, 'Já existe um pedido pendente.');
    }

    const changeRequest = await TrainerChangeRequest.create({
      clientId: clientProfile._id,
      currentTrainerId: clientProfile.trainerId ?? undefined,
      requestedTrainerId,
      reason,
      status: 'PENDING',
    });

    // Notify admins
    await notifyAdminsOfRequest(changeRequest._id, clientProfile._id);

    res.status(201).json(changeRequest);
  } catch (error) {
    next(error);
  }
};

/**
 * Lists all trainer change requests with optional filtering.
 * 
 * @route GET /api/trainer-requests
 * @access Private - ADMIN only
 * 
 * @param req - Express request with optional status filter
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {TrainerChangeRequest[]} Array of populated requests
 */
export const listRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.query as { status?: string };

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const requests = await TrainerChangeRequest.find(filter)
      .populate({
        path: 'clientId',
        populate: {
          path: 'userId',
          select: 'username email profile.firstName profile.lastName',
        },
      })
      .populate({
        path: 'requestedTrainerId',
        populate: {
          path: 'userId',
          select: 'username email profile.firstName profile.lastName',
        },
      })
      .populate({
        path: 'currentTrainerId',
        populate: {
          path: 'userId',
          select: 'username email profile.firstName profile.lastName',
        },
      })
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    next(error);
  }
};

/**
 * Approves or rejects a trainer change request.
 * 
 * If approved:
 * - Updates client's trainerId
 * - Notifies new trainer about new client
 * - Notifies client about approval
 * 
 * If rejected:
 * - Notifies client about rejection
 * 
 * @route POST /api/trainer-requests/:id/decide
 * @access Private - ADMIN only
 * 
 * @param req - Express request with decision status
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {TrainerChangeRequest} The updated request
 * @throws {HttpError} 400 if invalid status or already decided
 * @throws {HttpError} 401 if not authenticated
 * @throws {HttpError} 404 if request not found
 */
export const decideRequest = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const { status } = req.body as { status?: RequestDecision };

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      throw createError(400, 'status deve ser APPROVED ou REJECTED.');
    }

    const changeRequest = await TrainerChangeRequest.findById(req.params.id);
    if (!changeRequest) {
      throw createError(404, 'Pedido não encontrado.');
    }

    if (changeRequest.status !== 'PENDING') {
      throw createError(400, 'Pedido já foi decidido.');
    }

    changeRequest.status = status;
    changeRequest.decidedByAdminId = req.user!._id;
    await changeRequest.save();

    // Get client for notifications.
    const clientProfile = await ClientProfile.findById(changeRequest.clientId).select('userId');

    if (status === 'APPROVED') {
      // Update client's trainer
      await ClientProfile.findByIdAndUpdate(changeRequest.clientId, {
        $set: { trainerId: changeRequest.requestedTrainerId },
      });

      // Notify new trainer
      const trainer = await TrainerProfile.findById(changeRequest.requestedTrainerId).select('userId');
      if (trainer?.userId) {
        await User.findByIdAndUpdate(trainer.userId, { $set: { role: 'TRAINER' } });

        const notification = await Notification.create({
          recipientId: trainer.userId,
          type: 'NEW_CLIENT',
          payload: {
            clientId: changeRequest.clientId,
            requestId: changeRequest._id,
          },
          isRead: false,
        });
        emitToUser(String(trainer.userId), 'notification:new', notification);
      }
    }

    // Notify client about decision
    if (clientProfile?.userId) {
      const notification = await Notification.create({
        recipientId: clientProfile.userId,
        type: 'TRAINER_CHANGE_DECIDED',
        payload: { status, requestId: changeRequest._id },
        isRead: false,
      });
      emitToUser(String(clientProfile.userId), 'notification:new', notification);
    }

    res.json(changeRequest);
  } catch (error) {
    next(error);
  }
};
