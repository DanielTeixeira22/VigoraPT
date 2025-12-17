"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAlertToClient = exports.markNotificationRead = exports.listMyNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const ClientProfile_1 = __importDefault(require("../models/ClientProfile"));
const TrainerProfile_1 = __importDefault(require("../models/TrainerProfile"));
const listMyNotifications = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Não autenticado.' });
        const { onlyUnread } = req.query;
        const filter = { recipientId: req.user._id };
        if (onlyUnread === 'true')
            filter.isRead = false;
        const items = await Notification_1.default
            .find(filter)
            .sort({ createdAt: -1 });
        res.json(items);
    }
    catch (err) {
        next(err);
    }
};
exports.listMyNotifications = listMyNotifications;
const markNotificationRead = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Não autenticado.' });
        const notification = await Notification_1.default.findOneAndUpdate({ _id: req.params.id, recipientId: req.user._id }, { $set: { isRead: true } }, { new: true });
        if (!notification) {
            return res.status(404).json({ message: 'Notificação não encontrada.' });
        }
        res.json(notification);
    }
    catch (err) {
        next(err);
    }
};
exports.markNotificationRead = markNotificationRead;
const sendAlertToClient = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Não autenticado.' });
        const { clientId, message } = req.body;
        if (!clientId)
            return res.status(400).json({ message: 'clientId é obrigatório.' });
        // garantir que quem envia é treinador do cliente
        const trainerProfile = await TrainerProfile_1.default.findOne({ userId: req.user._id }).select('_id');
        if (!trainerProfile)
            return res.status(403).json({ message: 'Apenas treinadores podem enviar alertas.' });
        const client = await ClientProfile_1.default.findById(clientId).select('trainerId userId');
        if (!client)
            return res.status(404).json({ message: 'Cliente não encontrado.' });
        if (!client.trainerId || String(client.trainerId) !== String(trainerProfile._id)) {
            return res.status(403).json({ message: 'Cliente não está associado a este treinador.' });
        }
        const notification = await Notification_1.default.create({
            recipientId: client.userId,
            type: 'ALERT',
            payload: { message },
            isRead: false,
        });
        res.status(201).json(notification);
    }
    catch (err) {
        next(err);
    }
};
exports.sendAlertToClient = sendAlertToClient;
