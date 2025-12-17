"use strict";
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
const createRequest = async (req, res, next) => {
    var _a;
    try {
        if (!req.user)
            throw (0, http_errors_1.default)(401, 'Autenticação requerida.');
        const { requestedTrainerId, reason } = req.body;
        if (!requestedTrainerId) {
            return res.status(400).json({ message: 'requestedTrainerId é obrigatório.' });
        }
        // perfil de cliente deste user
        let clientProfile = await ClientProfile_1.default.findOne({ userId: req.user._id });
        if (!clientProfile) {
            clientProfile = await ClientProfile_1.default.create({ userId: req.user._id, trainerId: null });
        }
        // garante que o PT existe e está validado
        const trainer = await TrainerProfile_1.default.findById(requestedTrainerId).select('validatedByAdmin');
        if (!trainer || !trainer.validatedByAdmin) {
            return res.status(400).json({ message: 'Treinador inválido ou não validado.' });
        }
        // evita múltiplos pedidos pendentes
        const existing = await TrainerChangeRequest_1.default.findOne({
            clientId: clientProfile._id,
            status: 'PENDING',
        });
        if (existing) {
            return res.status(409).json({ message: 'Já existe um pedido pendente.' });
        }
        const doc = await TrainerChangeRequest_1.default.create({
            clientId: clientProfile._id,
            currentTrainerId: (_a = clientProfile.trainerId) !== null && _a !== void 0 ? _a : undefined,
            requestedTrainerId,
            reason,
            status: 'PENDING',
        });
        // Notificar todos os admins
        const admins = await User_1.default.find({ role: 'ADMIN', isActive: true }).select('_id');
        if (admins.length) {
            await Notification_1.default.insertMany(admins.map((a) => ({
                recipientId: a._id,
                type: 'TRAINER_CHANGE_REQUEST',
                payload: { requestId: doc._id, clientId: clientProfile._id },
                isRead: false,
            })));
        }
        res.status(201).json(doc);
    }
    catch (err) {
        next(err);
    }
};
exports.createRequest = createRequest;
const listRequests = async (req, res, next) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        const items = await TrainerChangeRequest_1.default
            .find(filter)
            .populate({ path: 'clientId', populate: { path: 'userId', select: 'username email profile.firstName profile.lastName' } })
            .populate({ path: 'requestedTrainerId', populate: { path: 'userId', select: 'username email profile.firstName profile.lastName' } })
            .populate({ path: 'currentTrainerId', populate: { path: 'userId', select: 'username email profile.firstName profile.lastName' } })
            .sort({ createdAt: -1 });
        res.json(items);
    }
    catch (err) {
        next(err);
    }
};
exports.listRequests = listRequests;
const decideRequest = async (req, res, next) => {
    try {
        if (!req.user)
            throw (0, http_errors_1.default)(401, 'Autenticação requerida.');
        const { status } = req.body;
        if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ message: 'status deve ser APPROVED ou REJECTED.' });
        }
        const request = await TrainerChangeRequest_1.default.findById(req.params.id);
        if (!request)
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        if (request.status !== 'PENDING') {
            return res.status(400).json({ message: 'Pedido já foi decidido.' });
        }
        request.status = status;
        request.decidedByAdminId = req.user._id;
        await request.save();
        // Buscar cliente para notificação
        const clientProfile = await ClientProfile_1.default.findById(request.clientId).select('userId');
        // se aprovado, atualiza o trainerId do ClientProfile
        if (status === 'APPROVED') {
            await ClientProfile_1.default.findByIdAndUpdate(request.clientId, { $set: { trainerId: request.requestedTrainerId } });
            // promove user do trainer para TRAINER se ainda não estiver
            const trainer = await TrainerProfile_1.default.findById(request.requestedTrainerId).select('userId');
            if (trainer === null || trainer === void 0 ? void 0 : trainer.userId) {
                await User_1.default.findByIdAndUpdate(trainer.userId, { $set: { role: 'TRAINER' } });
                // Notificar novo trainer sobre novo cliente
                await Notification_1.default.create({
                    recipientId: trainer.userId,
                    type: 'NEW_CLIENT',
                    payload: { clientId: request.clientId, requestId: request._id },
                    isRead: false,
                });
            }
        }
        // Notificar cliente sobre decisão
        if (clientProfile === null || clientProfile === void 0 ? void 0 : clientProfile.userId) {
            await Notification_1.default.create({
                recipientId: clientProfile.userId,
                type: 'TRAINER_CHANGE_DECIDED',
                payload: { status, requestId: request._id },
                isRead: false,
            });
        }
        res.json(request);
    }
    catch (err) {
        next(err);
    }
};
exports.decideRequest = decideRequest;
