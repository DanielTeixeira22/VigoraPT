/**
 * Chat Controller
 * 
 * Handles real-time messaging functionality including:
 * - Conversation management (create, list)
 * - Message sending with WebSocket notifications
 * - Message read status tracking
 * 
 * @module controllers/chat
 */

import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import Notification from '../models/Notification';
import { emitToUser, emitToConversation } from '../socket/socketServer';

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Payload for creating/ensuring a conversation */
interface EnsureConversationPayload {
  clientId: string;
  trainerId: string;
  clientUserId?: string;
  trainerUserId?: string;
}

/** Payload for sending a message */
interface SendMessagePayload {
  content: string;
  attachments?: string[];
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
 * Parses a numeric value from unknown input.
 * 
 * @param value - The value to parse
 * @param fallback - Default value if parsing fails
 * @returns Parsed number or fallback
 */
const parseNumber = (value: unknown, fallback: number): number => {
  const n = Number.parseInt(typeof value === 'string' ? value : `${value ?? ''}`, 10);
  return Number.isNaN(n) ? fallback : n;
};

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
 * Extracts pagination parameters from request.
 * 
 * @param req - Express request object
 * @param options - Pagination configuration
 * @returns Pagination parameters
 */
const extractPagination = (
  req: Request,
  options: { maxLimit?: number; defaultLimit?: number } = {}
): { page: number; limit: number; skip: number } => {
  const { maxLimit = 50, defaultLimit = 20 } = options;
  const page = Math.max(1, parseNumber(req.query.page, 1));
  const limit = Math.min(maxLimit, Math.max(1, parseNumber(req.query.limit, defaultLimit)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// ============================================================================
// Conversation Endpoints
// ============================================================================

/**
 * Ensures a conversation exists between client and trainer.
 * Creates a new conversation if one doesn't exist.
 * 
 * @route POST /api/conversations
 * @access Private
 * 
 * @param req - Express request with conversation participants
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {Conversation} The existing or newly created conversation
 * @throws {HttpError} 400 if required IDs are missing
 */
export const ensureConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { clientId, trainerId, clientUserId, trainerUserId } =
      req.body as Partial<EnsureConversationPayload>;

    if (!clientId || !trainerId) {
      throw createError(400, 'clientId e trainerId são obrigatórios.');
    }

    let conversation = await Conversation.findOne({ clientId, trainerId });

    if (!conversation) {
      const participants = [clientUserId, trainerUserId].filter(Boolean);
      if (participants.length !== 2) {
        throw createError(400, 'clientUserId e trainerUserId são obrigatórios.');
      }
      conversation = await Conversation.create({ clientId, trainerId, participants });
    }

    res.json(conversation);
  } catch (error) {
    next(error);
  }
};

/**
 * Lists conversations for the authenticated user.
 * 
 * @route GET /api/conversations
 * @access Private
 * 
 * @param req - Express request with pagination query params
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {PaginatedResponse<Conversation>} Paginated list of conversations
 * @throws {HttpError} 401 if not authenticated
 */
export const listConversations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const { page, limit, skip } = extractPagination(req);
    const userId = req.user!._id;

    const [items, total] = await Promise.all([
      Conversation.find({ participants: userId })
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Conversation.countDocuments({ participants: userId }),
    ]);

    res.json({
      items,
      page,
      total,
      pages: Math.ceil(total / limit),
    } as PaginatedResponse<unknown>);
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// Message Endpoints
// ============================================================================

/**
 * Lists messages in a conversation.
 * 
 * @route GET /api/conversations/:id/messages
 * @access Private
 * 
 * @param req - Express request with conversation ID
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {PaginatedResponse<Message>} Paginated list of messages
 */
export const listMessages = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: conversationId } = req.params;
    const { page, limit, skip } = extractPagination(req, { maxLimit: 100, defaultLimit: 30 });

    const [items, total] = await Promise.all([
      Message.find({ conversationId }).sort({ createdAt: 1 }).skip(skip).limit(limit),
      Message.countDocuments({ conversationId }),
    ]);

    res.json({
      items,
      page,
      total,
      pages: Math.ceil(total / limit),
    } as PaginatedResponse<unknown>);
  } catch (error) {
    next(error);
  }
};

/**
 * Sends a message in a conversation.
 * Emits real-time events to conversation room and notifies recipient.
 * 
 * @route POST /api/conversations/:id/messages
 * @access Private
 * 
 * @param req - Express request with message content
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {Message} The created message
 * @throws {HttpError} 400 if content is empty
 * @throws {HttpError} 401 if not authenticated
 */
export const sendMessage = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    requireAuth(req);

    const { id: conversationId } = req.params;
    const { content, attachments } = req.body as Partial<SendMessagePayload>;

    if (!content || !content.trim()) {
      throw createError(400, 'Conteúdo é obrigatório.');
    }

    const message = await Message.create({
      conversationId,
      senderId: req.user!._id,
      content: content.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    // Emit real-time message to conversation room
    emitToConversation(conversationId, 'chat:message', message);

    // Notify the other participant
    const conversation = await Conversation.findById(conversationId).select('participants');
    if (conversation) {
      const recipientId = conversation.participants.find(
        (p) => String(p) !== String(req.user!._id)
      );

      if (recipientId) {
        // Get sender name for notification
        const senderName = req.user?.profile?.firstName
          ? `${req.user.profile.firstName}${req.user.profile.lastName ? ` ${req.user.profile.lastName}` : ''}`
          : req.user?.username || 'Utilizador';

        const notification = await Notification.create({
          recipientId,
          type: 'NEW_MESSAGE',
          payload: {
            conversationId,
            senderId: req.user!._id,
            senderName,
            preview: content.slice(0, 50),
          },
          isRead: false,
        });

        // Emit real-time notification to recipient
        emitToUser(String(recipientId), 'notification:new', notification);
      }
    }

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

/**
 * Marks a message as read.
 * 
 * @route PATCH /api/messages/:id/read
 * @access Private
 * 
 * @param req - Express request with message ID
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {Message} The updated message
 * @throws {HttpError} 404 if message not found
 */
export const markAsRead = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const message = await Message.findByIdAndUpdate(
      id,
      { $set: { readAt: new Date() } },
      { new: true }
    );

    if (!message) {
      throw createError(404, 'Mensagem não encontrada.');
    }

    res.json(message);
  } catch (error) {
    next(error);
  }
};
