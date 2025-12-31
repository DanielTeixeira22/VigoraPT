"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decideRequest = exports.listRequests = exports.createRequest = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const TrainerChangeRequest_1 = __importDefault(require("../models/TrainerChangeRequest"));
const ClientProfile_1 = __importDefault(require("../models/ClientProfile"));
const TrainerProfile_1 = __importDefault(require("../models/TrainerProfile"));
const User_1 = __importDefault(require("../models/User"));
const Notification_1 = __importDefault(require("../models/Notification"));
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
/**
 * Notifies all active admins about a new request.
 *
 * @param requestId - The request document ID
 * @param clientId - The client profile ID
 */
const notifyAdminsOfRequest = async (requestId, clientId) => {
    const admins = await User_1.default.find({ role: 'ADMIN', isActive: true }).select('_id');
    if (admins.length === 0)
        return;
    const notifications = await Notification_1.default.insertMany(admins.map((admin) => ({
        recipientId: admin._id,
        type: 'TRAINER_CHANGE_REQUEST',
        payload: { requestId, clientId },
        isRead: false,
    })));
    // Emit real-time notifications to all admins
    admins.forEach((admin, index) => {
        (0, socketServer_1.emitToUser)(String(admin._id), 'notification:new', notifications[index]);
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
const createRequest = async (req, res, next) => {
    var _a;
    try {
        requireAuth(req);
        const { requestedTrainerId, reason } = req.body;
        if (!requestedTrainerId) {
            throw (0, http_errors_1.default)(400, 'requestedTrainerId é obrigatório.');
        }
        // Get or create client profile.
        let clientProfile = await ClientProfile_1.default.findOne({ userId: req.user._id });
        if (!clientProfile) {
            clientProfile = await ClientProfile_1.default.create({
                userId: req.user._id,
                trainerId: null,
            });
        }
        // Validate trainer exists and is approved
        const trainer = await TrainerProfile_1.default.findById(requestedTrainerId).select('validatedByAdmin');
        if (!trainer || !trainer.validatedByAdmin) {
            throw (0, http_errors_1.default)(400, 'Treinador inválido ou não validado.');
        }
        // Prevent multiple pending requests
        const existingRequest = await TrainerChangeRequest_1.default.findOne({
            clientId: clientProfile._id,
            status: 'PENDING',
        });
        if (existingRequest) {
            throw (0, http_errors_1.default)(409, 'Já existe um pedido pendente.');
        }
        const changeRequest = await TrainerChangeRequest_1.default.create({
            clientId: clientProfile._id,
            currentTrainerId: (_a = clientProfile.trainerId) !== null && _a !== void 0 ? _a : undefined,
            requestedTrainerId,
            reason,
            status: 'PENDING',
        });
        // Notify admins
        await notifyAdminsOfRequest(changeRequest._id, clientProfile._id);
        res.status(201).json(changeRequest);
    }
    catch (error) {
        next(error);
    }
};
exports.createRequest = createRequest;
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
const listRequests = async (req, res, next) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        const requests = await TrainerChangeRequest_1.default.find(filter)
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
    }
    catch (error) {
        next(error);
    }
};
exports.listRequests = listRequests;
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
const decideRequest = async (req, res, next) => {
    try {
        requireAuth(req);
        const { status } = req.body;
        if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
            throw (0, http_errors_1.default)(400, 'status deve ser APPROVED ou REJECTED.');
        }
        const changeRequest = await TrainerChangeRequest_1.default.findById(req.params.id);
        if (!changeRequest) {
            throw (0, http_errors_1.default)(404, 'Pedido não encontrado.');
        }
        if (changeRequest.status !== 'PENDING') {
            throw (0, http_errors_1.default)(400, 'Pedido já foi decidido.');
        }
        changeRequest.status = status;
        changeRequest.decidedByAdminId = req.user._id;
        await changeRequest.save();
        // Get client for notifications.
        const clientProfile = await ClientProfile_1.default.findById(changeRequest.clientId).select('userId');
        if (status === 'APPROVED') {
            // Update client's trainer
            await ClientProfile_1.default.findByIdAndUpdate(changeRequest.clientId, {
                $set: { trainerId: changeRequest.requestedTrainerId },
            });
            // Notify new trainer
            const trainer = await TrainerProfile_1.default.findById(changeRequest.requestedTrainerId).select('userId');
            if (trainer === null || trainer === void 0 ? void 0 : trainer.userId) {
                await User_1.default.findByIdAndUpdate(trainer.userId, { $set: { role: 'TRAINER' } });
                const notification = await Notification_1.default.create({
                    recipientId: trainer.userId,
                    type: 'NEW_CLIENT',
                    payload: {
                        clientId: changeRequest.clientId,
                        requestId: changeRequest._id,
                    },
                    isRead: false,
                });
                (0, socketServer_1.emitToUser)(String(trainer.userId), 'notification:new', notification);
            }
        }
        // Notify client about decision
        if (clientProfile === null || clientProfile === void 0 ? void 0 : clientProfile.userId) {
            const notification = await Notification_1.default.create({
                recipientId: clientProfile.userId,
                type: 'TRAINER_CHANGE_DECIDED',
                payload: { status, requestId: changeRequest._id },
                isRead: false,
            });
            (0, socketServer_1.emitToUser)(String(clientProfile.userId), 'notification:new', notification);
        }
        res.json(changeRequest);
    }
    catch (error) {
        next(error);
    }
};
exports.decideRequest = decideRequest;
