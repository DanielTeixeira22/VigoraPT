"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAlertToClient = exports.markAllNotificationsRead = exports.markNotificationRead = exports.listMyNotifications = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const Notification_1 = __importDefault(require("../models/Notification"));
const ClientProfile_1 = __importDefault(require("../models/ClientProfile"));
const TrainerProfile_1 = __importDefault(require("../models/TrainerProfile"));
const socketServer_1 = require("../socket/socketServer");
// ============================================================================
// Funcoes auxiliares
// ============================================================================
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
const listMyNotifications = async (req, res, next) => {
    try {
        requireAuth(req);
        const { onlyUnread } = req.query;
        const filter = { recipientId: req.user._id };
        if (onlyUnread === 'true') {
            filter.isRead = false;
        }
        const notifications = await Notification_1.default.find(filter).sort({ createdAt: -1 });
        res.json(notifications);
    }
    catch (error) {
        next(error);
    }
};
exports.listMyNotifications = listMyNotifications;
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
const markNotificationRead = async (req, res, next) => {
    try {
        requireAuth(req);
        const notification = await Notification_1.default.findOneAndUpdate({ _id: req.params.id, recipientId: req.user._id }, { $set: { isRead: true } }, { new: true });
        if (!notification) {
            throw (0, http_errors_1.default)(404, 'Notificação não encontrada.');
        }
        res.json(notification);
    }
    catch (error) {
        next(error);
    }
};
exports.markNotificationRead = markNotificationRead;
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
const markAllNotificationsRead = async (req, res, next) => {
    try {
        requireAuth(req);
        const result = await Notification_1.default.updateMany({ recipientId: req.user._id, isRead: false }, { $set: { isRead: true } });
        res.json({
            message: 'Todas as notificações foram marcadas como lidas.',
            modifiedCount: result.modifiedCount,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.markAllNotificationsRead = markAllNotificationsRead;
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
const sendAlertToClient = async (req, res, next) => {
    try {
        requireAuth(req);
        const { clientId, message } = req.body;
        if (!clientId) {
            throw (0, http_errors_1.default)(400, 'clientId é obrigatório.');
        }
        // Verify sender is a trainer
        const trainerProfile = await TrainerProfile_1.default.findOne({ userId: req.user._id }).select('_id');
        if (!trainerProfile) {
            throw (0, http_errors_1.default)(403, 'Apenas treinadores podem enviar alertas.');
        }
        // Verify client exists and is associated with this trainer
        const client = await ClientProfile_1.default.findById(clientId).select('trainerId userId');
        if (!client) {
            throw (0, http_errors_1.default)(404, 'Cliente não encontrado.');
        }
        if (!client.trainerId || String(client.trainerId) !== String(trainerProfile._id)) {
            throw (0, http_errors_1.default)(403, 'Cliente não está associado a este treinador.');
        }
        // Create and emit notification
        const notification = await Notification_1.default.create({
            recipientId: client.userId,
            type: 'ALERT',
            payload: { message },
            isRead: false,
        });
        (0, socketServer_1.emitToUser)(String(client.userId), 'notification:new', notification);
        res.status(201).json(notification);
    }
    catch (error) {
        next(error);
    }
};
exports.sendAlertToClient = sendAlertToClient;
