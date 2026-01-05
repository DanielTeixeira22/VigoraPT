"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsRead = exports.sendMessage = exports.listMessages = exports.listConversations = exports.ensureConversation = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const Conversation_1 = __importDefault(require("../models/Conversation"));
const Message_1 = __importDefault(require("../models/Message"));
const Notification_1 = __importDefault(require("../models/Notification"));
const socketServer_1 = require("../socket/socketServer");
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
const parseNumber = (value, fallback) => {
    const n = Number.parseInt(typeof value === 'string' ? value : `${value !== null && value !== void 0 ? value : ''}`, 10);
    return Number.isNaN(n) ? fallback : n;
};
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
 * Extracts pagination parameters from request.
 *
 * @param req - Express request object
 * @param options - Pagination configuration
 * @returns Pagination parameters
 */
const extractPagination = (req, options = {}) => {
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
const ensureConversation = async (req, res, next) => {
    try {
        const { clientId, trainerId, clientUserId, trainerUserId } = req.body;
        if (!clientId || !trainerId) {
            throw (0, http_errors_1.default)(400, 'clientId e trainerId são obrigatórios.');
        }
        let conversation = await Conversation_1.default.findOne({ clientId, trainerId });
        if (!conversation) {
            const participants = [clientUserId, trainerUserId].filter(Boolean);
            if (participants.length !== 2) {
                throw (0, http_errors_1.default)(400, 'clientUserId e trainerUserId são obrigatórios.');
            }
            conversation = await Conversation_1.default.create({ clientId, trainerId, participants });
        }
        res.json(conversation);
    }
    catch (error) {
        next(error);
    }
};
exports.ensureConversation = ensureConversation;
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
const listConversations = async (req, res, next) => {
    try {
        requireAuth(req);
        const { page, limit, skip } = extractPagination(req);
        const userId = req.user._id;
        const [items, total] = await Promise.all([
            Conversation_1.default.find({ participants: userId })
                .sort({ lastMessageAt: -1, updatedAt: -1 })
                .skip(skip)
                .limit(limit),
            Conversation_1.default.countDocuments({ participants: userId }),
        ]);
        res.json({
            items,
            page,
            total,
            pages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        next(error);
    }
};
exports.listConversations = listConversations;
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
const listMessages = async (req, res, next) => {
    try {
        const { id: conversationId } = req.params;
        const { page, limit, skip } = extractPagination(req, { maxLimit: 100, defaultLimit: 30 });
        const [items, total] = await Promise.all([
            Message_1.default.find({ conversationId }).sort({ createdAt: 1 }).skip(skip).limit(limit),
            Message_1.default.countDocuments({ conversationId }),
        ]);
        res.json({
            items,
            page,
            total,
            pages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        next(error);
    }
};
exports.listMessages = listMessages;
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
const sendMessage = async (req, res, next) => {
    var _a, _b, _c;
    try {
        requireAuth(req);
        const { id: conversationId } = req.params;
        const { content, attachments } = req.body;
        if (!content || !content.trim()) {
            throw (0, http_errors_1.default)(400, 'Conteúdo é obrigatório.');
        }
        const message = await Message_1.default.create({
            conversationId,
            senderId: req.user._id,
            content: content.trim(),
            attachments: Array.isArray(attachments) ? attachments : [],
        });
        // Emit real-time message to conversation room
        (0, socketServer_1.emitToConversation)(conversationId, 'chat:message', message);
        // Notify the other participant
        const conversation = await Conversation_1.default.findById(conversationId).select('participants');
        if (conversation) {
            const recipientId = conversation.participants.find((p) => String(p) !== String(req.user._id));
            if (recipientId) {
                // Get sender name for notification
                const senderName = ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.profile) === null || _b === void 0 ? void 0 : _b.firstName)
                    ? `${req.user.profile.firstName}${req.user.profile.lastName ? ` ${req.user.profile.lastName}` : ''}`
                    : ((_c = req.user) === null || _c === void 0 ? void 0 : _c.username) || 'Utilizador';
                const notification = await Notification_1.default.create({
                    recipientId,
                    type: 'NEW_MESSAGE',
                    payload: {
                        conversationId,
                        senderId: req.user._id,
                        senderName,
                        preview: content.slice(0, 50),
                    },
                    isRead: false,
                });
                // Emit real-time notification to recipient
                (0, socketServer_1.emitToUser)(String(recipientId), 'notification:new', notification);
            }
        }
        res.status(201).json(message);
    }
    catch (error) {
        next(error);
    }
};
exports.sendMessage = sendMessage;
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
const markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const message = await Message_1.default.findByIdAndUpdate(id, { $set: { readAt: new Date() } }, { new: true });
        if (!message) {
            throw (0, http_errors_1.default)(404, 'Mensagem não encontrada.');
        }
        res.json(message);
    }
    catch (error) {
        next(error);
    }
};
exports.markAsRead = markAsRead;
