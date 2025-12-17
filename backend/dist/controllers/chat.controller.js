"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsRead = exports.sendMessage = exports.listMessages = exports.listConversations = exports.ensureConversation = void 0;
const Conversation_1 = __importDefault(require("../models/Conversation"));
const Message_1 = __importDefault(require("../models/Message"));
const Notification_1 = __importDefault(require("../models/Notification"));
const parseNumber = (value, fallback) => {
    const n = Number.parseInt(typeof value === 'string' ? value : `${value !== null && value !== void 0 ? value : ''}`, 10);
    return Number.isNaN(n) ? fallback : n;
};
const ensureConversation = async (req, res, next) => {
    try {
        const { clientId, trainerId, clientUserId, trainerUserId } = req.body;
        if (!clientId || !trainerId) {
            return res.status(400).json({ message: 'clientId e trainerId são obrigatórios.' });
        }
        let convo = await Conversation_1.default.findOne({ clientId, trainerId });
        if (!convo) {
            const participants = [clientUserId, trainerUserId].filter(Boolean);
            if (participants.length !== 2) {
                return res.status(400).json({ message: 'clientUserId e trainerUserId são obrigatórios.' });
            }
            convo = await Conversation_1.default.create({ clientId, trainerId, participants });
        }
        return res.json(convo);
    }
    catch (err) {
        next(err);
    }
};
exports.ensureConversation = ensureConversation;
const listConversations = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Autenticação requerida.' });
        const page = Math.max(1, parseNumber(req.query.page, 1));
        const limit = Math.min(50, Math.max(1, parseNumber(req.query.limit, 20)));
        const skip = (page - 1) * limit;
        const userId = req.user._id;
        const [items, total] = await Promise.all([
            Conversation_1.default.find({ participants: userId })
                .sort({ lastMessageAt: -1, updatedAt: -1 })
                .skip(skip)
                .limit(limit),
            Conversation_1.default.countDocuments({ participants: userId }),
        ]);
        res.json({ items, page, total, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
};
exports.listConversations = listConversations;
const listMessages = async (req, res, next) => {
    try {
        const { id } = req.params;
        const page = Math.max(1, parseNumber(req.query.page, 1));
        const limit = Math.min(100, Math.max(1, parseNumber(req.query.limit, 30)));
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            Message_1.default.find({ conversationId: id }).sort({ createdAt: 1 }).skip(skip).limit(limit),
            Message_1.default.countDocuments({ conversationId: id }),
        ]);
        res.json({ items, page, total, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
};
exports.listMessages = listMessages;
const sendMessage = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Autenticação requerida.' });
        const { id } = req.params;
        const { content, attachments } = req.body;
        if (!content || !content.trim())
            return res.status(400).json({ message: 'Conteúdo é obrigatório.' });
        const msg = await Message_1.default.create({
            conversationId: id,
            senderId: req.user._id,
            content: content.trim(),
            attachments: Array.isArray(attachments) ? attachments : [],
        });
        // Notificar o outro participante da conversa
        const convo = await Conversation_1.default.findById(id).select('participants');
        if (convo) {
            const recipientId = convo.participants.find((p) => String(p) !== String(req.user._id));
            if (recipientId) {
                await Notification_1.default.create({
                    recipientId,
                    type: 'NEW_MESSAGE',
                    payload: { conversationId: id, senderId: req.user._id, preview: content.slice(0, 50) },
                    isRead: false,
                });
            }
        }
        res.status(201).json(msg);
    }
    catch (err) {
        next(err);
    }
};
exports.sendMessage = sendMessage;
const markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const msg = await Message_1.default.findByIdAndUpdate(id, { $set: { readAt: new Date() } }, { new: true });
        if (!msg)
            return res.status(404).json({ message: 'Mensagem não encontrada.' });
        res.json(msg);
    }
    catch (err) {
        next(err);
    }
};
exports.markAsRead = markAsRead;
