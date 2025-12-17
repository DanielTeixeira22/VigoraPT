"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCompletion = exports.upsertCompletion = exports.listCompletion = exports.deleteSession = exports.updateSession = exports.getSessionById = exports.createSession = exports.listSessions = exports.deletePlan = exports.updatePlan = exports.getPlanById = exports.createPlan = exports.listPlans = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const TrainingPlan_1 = __importDefault(require("../models/TrainingPlan"));
const TrainingSession_1 = __importDefault(require("../models/TrainingSession"));
const CompletionLog_1 = __importDefault(require("../models/CompletionLog"));
const TrainerProfile_1 = __importDefault(require("../models/TrainerProfile"));
const ClientProfile_1 = __importDefault(require("../models/ClientProfile"));
const Notification_1 = __importDefault(require("../models/Notification"));
const paginate = (req, { max = 100, def = 20 } = {}) => {
    var _a, _b;
    const page = Math.max(1, Number.parseInt(String((_a = req.query.page) !== null && _a !== void 0 ? _a : '1'), 10) || 1);
    const limitRaw = Number.parseInt(String((_b = req.query.limit) !== null && _b !== void 0 ? _b : `${def}`), 10);
    const limit = Math.min(max, Math.max(1, limitRaw || def));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};
const ensureTrainerValidated = async (trainerId) => {
    const tp = await TrainerProfile_1.default.findById(trainerId).select('validatedByAdmin');
    if (!tp || !tp.validatedByAdmin)
        throw (0, http_errors_1.default)(403, 'Trainer não validado.');
};
// ---------------- PLANS ----------------
const listPlans = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req);
        const q = {};
        const { clientId, trainerId } = req.query;
        if (clientId)
            q.clientId = clientId;
        if (trainerId)
            q.trainerId = trainerId;
        const [items, total] = await Promise.all([
            TrainingPlan_1.default.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit),
            TrainingPlan_1.default.countDocuments(q),
        ]);
        res.json({ items, page, total, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
};
exports.listPlans = listPlans;
const createPlan = async (req, res, next) => {
    try {
        const { clientId, trainerId, title, description, frequencyPerWeek, startDate, endDate } = req.body;
        if (!clientId || !trainerId || !title || !frequencyPerWeek || !startDate) {
            return res.status(400).json({ message: 'Campos obrigatórios: clientId, trainerId, title, frequencyPerWeek, startDate.' });
        }
        await ensureTrainerValidated(trainerId);
        const client = await ClientProfile_1.default.findById(clientId).select('_id userId');
        if (!client)
            return res.status(404).json({ message: 'Cliente não encontrado.' });
        const plan = await TrainingPlan_1.default.create({
            clientId,
            trainerId,
            title,
            description,
            frequencyPerWeek,
            startDate,
            endDate,
        });
        // Notificar cliente sobre novo plano
        if (client.userId) {
            await Notification_1.default.create({
                recipientId: client.userId,
                type: 'NEW_PLAN',
                payload: { planId: plan._id, title: plan.title },
                isRead: false,
            });
        }
        res.status(201).json(plan);
    }
    catch (err) {
        next(err);
    }
};
exports.createPlan = createPlan;
const getPlanById = async (req, res, next) => {
    try {
        const plan = await TrainingPlan_1.default.findById(req.params.id);
        if (!plan)
            return res.status(404).json({ message: 'Plano não encontrado.' });
        res.json(plan);
    }
    catch (err) {
        next(err);
    }
};
exports.getPlanById = getPlanById;
const updatePlan = async (req, res, next) => {
    try {
        const updates = { ...req.body };
        if ('trainerId' in updates && updates.trainerId) {
            await ensureTrainerValidated(String(updates.trainerId));
        }
        const plan = await TrainingPlan_1.default.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
        if (!plan)
            return res.status(404).json({ message: 'Plano não encontrado.' });
        res.json(plan);
    }
    catch (err) {
        next(err);
    }
};
exports.updatePlan = updatePlan;
const deletePlan = async (req, res, next) => {
    try {
        const plan = await TrainingPlan_1.default.findByIdAndDelete(req.params.id);
        if (!plan)
            return res.status(404).json({ message: 'Plano não encontrado.' });
        await TrainingSession_1.default.deleteMany({ planId: plan._id });
        res.json({ message: 'Plano removido.' });
    }
    catch (err) {
        next(err);
    }
};
exports.deletePlan = deletePlan;
// ---------------- SESSIONS ----------------
const listSessions = async (req, res, next) => {
    try {
        const { planId } = req.params;
        const q = { planId };
        const { dayOfWeek } = req.query;
        if (dayOfWeek)
            q.dayOfWeek = Number.parseInt(dayOfWeek, 10);
        const sessions = await TrainingSession_1.default.find(q).sort({ dayOfWeek: 1, order: 1, createdAt: 1 });
        res.json(sessions);
    }
    catch (err) {
        next(err);
    }
};
exports.listSessions = listSessions;
const createSession = async (req, res, next) => {
    try {
        const { planId } = req.params;
        const { dayOfWeek, order = 0, notes, exercises = [] } = req.body;
        if (typeof dayOfWeek !== 'number') {
            return res.status(400).json({ message: 'dayOfWeek é obrigatório (0-6).' });
        }
        if (Array.isArray(exercises) && exercises.length > 10) {
            return res.status(400).json({ message: 'Máximo de 10 exercícios por sessão.' });
        }
        const session = await TrainingSession_1.default.create({ planId, dayOfWeek, order, notes, exercises });
        res.status(201).json(session);
    }
    catch (err) {
        next(err);
    }
};
exports.createSession = createSession;
const getSessionById = async (req, res, next) => {
    try {
        const s = await TrainingSession_1.default.findById(req.params.id);
        if (!s)
            return res.status(404).json({ message: 'Sessão não encontrada.' });
        res.json(s);
    }
    catch (err) {
        next(err);
    }
};
exports.getSessionById = getSessionById;
const updateSession = async (req, res, next) => {
    try {
        const updates = { ...req.body };
        if (Array.isArray(updates.exercises) && updates.exercises.length > 10) {
            return res.status(400).json({ message: 'Máximo de 10 exercícios por sessão.' });
        }
        const s = await TrainingSession_1.default.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
        if (!s)
            return res.status(404).json({ message: 'Sessão não encontrada.' });
        res.json(s);
    }
    catch (err) {
        next(err);
    }
};
exports.updateSession = updateSession;
const deleteSession = async (req, res, next) => {
    try {
        const s = await TrainingSession_1.default.findByIdAndDelete(req.params.id);
        if (!s)
            return res.status(404).json({ message: 'Sessão não encontrada.' });
        res.json({ message: 'Sessão removida.' });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteSession = deleteSession;
// ---------------- COMPLETION LOGS ----------------
const listCompletion = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req, { def: 30, max: 200 });
        const q = {};
        const { clientId, trainerId, status, from, to } = req.query;
        if (clientId)
            q.clientId = clientId;
        if (trainerId)
            q.trainerId = trainerId;
        if (status)
            q.status = status;
        if (from || to) {
            const dateFilter = {};
            if (from)
                dateFilter.$gte = new Date(from);
            if (to)
                dateFilter.$lt = new Date(to);
            q.date = dateFilter;
        }
        const [items, total] = await Promise.all([
            CompletionLog_1.default.find(q).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit),
            CompletionLog_1.default.countDocuments(q),
        ]);
        res.json({ items, page, total, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
};
exports.listCompletion = listCompletion;
const upsertCompletion = async (req, res, next) => {
    try {
        const { clientId, trainerId, planId, sessionId, date, status, reason, proofImage } = req.body;
        if (!clientId || !trainerId || !planId || !sessionId || !date || !status) {
            return res.status(400).json({ message: 'Campos obrigatórios: clientId, trainerId, planId, sessionId, date, status.' });
        }
        if (!['DONE', 'MISSED'].includes(status)) {
            return res.status(400).json({ message: 'status deve ser DONE ou MISSED.' });
        }
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const update = {
            status,
            reason: status === 'MISSED' ? (reason || null) : undefined,
            proofImage: proofImage || undefined,
        };
        const doc = await CompletionLog_1.default.findOneAndUpdate({ clientId, sessionId, date: d, planId, trainerId }, { $set: update }, { upsert: true, new: true, setDefaultsOnInsert: true });
        // Buscar userId do trainer para notificação
        const trainerProfile = await TrainerProfile_1.default.findById(trainerId).select('userId');
        if (trainerProfile === null || trainerProfile === void 0 ? void 0 : trainerProfile.userId) {
            if (status === 'MISSED') {
                await Notification_1.default.create({
                    recipientId: trainerProfile.userId,
                    type: 'MISSED_WORKOUT',
                    payload: { clientId, planId, sessionId, date: d },
                    isRead: false,
                });
            }
            else if (status === 'DONE') {
                await Notification_1.default.create({
                    recipientId: trainerProfile.userId,
                    type: 'WORKOUT_DONE',
                    payload: { clientId, planId, sessionId, date: d },
                    isRead: false,
                });
            }
        }
        res.status(201).json(doc);
    }
    catch (err) {
        next(err);
    }
};
exports.upsertCompletion = upsertCompletion;
const deleteCompletion = async (req, res, next) => {
    try {
        const ok = await CompletionLog_1.default.findByIdAndDelete(req.params.id);
        if (!ok)
            return res.status(404).json({ message: 'Registo não encontrado.' });
        res.json({ message: 'Registo removido.' });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteCompletion = deleteCompletion;
