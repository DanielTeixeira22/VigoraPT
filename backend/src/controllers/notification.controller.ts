/**
 * Notification Controller
 * 
 * Handles notification management including:
 * - Listing user notifications
 * - Marking notifications as read
 * - Trainer alerts to clients
 * 
 * @module controllers/notification
 */

import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import Notification from '../models/Notification';
import ClientProfile from '../models/ClientProfile';
import TrainerProfile from '../models/TrainerProfile';
import { emitToUser } from '../socket/socketServer';

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Query parameters for listing notifications */
interface ListNotificationsQuery {
  onlyUnread?: string;
}

/** Payload for sending alert to client */
interface SendAlertPayload {
  clientId: string;
  message?: string;
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

// ============================================================================
// Notification Endpoints
// ============================================================================

/**
 * Lists notifications for the authenticated user.
 * 
 * @route GET /api/notifications
 * @access Private
 * 
 * @param req - Express request with optional onlyUnread query param
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {Notification[]} Array of notifications sorted by creation date
 * @throws {HttpError} 401 if not authenticated
 */
export const listMyNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const { onlyUnread } = req.query as ListNotificationsQuery;

    const filter: Record<string, unknown> = { recipientId: req.user!._id };
    if (onlyUnread === 'true') {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

/**
 * Marks a single notification as read.
 * 
 * @route PATCH /api/notifications/:id/read
 * @access Private
 * 
 * @param req - Express request with notification ID
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {Notification} The updated notification
 * @throws {HttpError} 401 if not authenticated
 * @throws {HttpError} 404 if notification not found
 */
export const markNotificationRead = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user!._id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      throw createError(404, 'Notificação não encontrada.');
    }

    res.json(notification);
  } catch (error) {
    next(error);
  }
};

/**
 * Marks all notifications as read for the authenticated user.
 * 
 * @route POST /api/notifications/read-all
 * @access Private
 * 
 * @param req - Express request with authenticated user
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns Success message with count of modified notifications
 * @throws {HttpError} 401 if not authenticated
 */
export const markAllNotificationsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const result = await Notification.updateMany(
      { recipientId: req.user!._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({
      message: 'Todas as notificações foram marcadas como lidas.',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sends an alert notification from a trainer to their client.
 * Validates that the trainer is associated with the client.
 * 
 * @route POST /api/notifications/alert
 * @access Private - TRAINER only
 * 
 * @param req - Express request with clientId and optional message
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {Notification} The created notification
 * @throws {HttpError} 400 if clientId missing
 * @throws {HttpError} 401 if not authenticated
 * @throws {HttpError} 403 if not a trainer or client not associated
 * @throws {HttpError} 404 if client not found
 */
export const sendAlertToClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const { clientId, message } = req.body as Partial<SendAlertPayload>;

    if (!clientId) {
      throw createError(400, 'clientId é obrigatório.');
    }

    // Verify sender is a trainer
    const trainerProfile = await TrainerProfile.findOne({ userId: req.user!._id }).select('_id');
    if (!trainerProfile) {
      throw createError(403, 'Apenas treinadores podem enviar alertas.');
    }

    // Verify client exists and is associated with this trainer
    const client = await ClientProfile.findById(clientId).select('trainerId userId');
    if (!client) {
      throw createError(404, 'Cliente não encontrado.');
    }

    if (!client.trainerId || String(client.trainerId) !== String(trainerProfile._id)) {
      throw createError(403, 'Cliente não está associado a este treinador.');
    }

    // Create and emit notification
    const notification = await Notification.create({
      recipientId: client.userId,
      type: 'ALERT',
      payload: { message },
      isRead: false,
    });

    emitToUser(String(client.userId), 'notification:new', notification);

    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
};
