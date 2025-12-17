"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPublicTrainers = exports.adminUpdateTrainer = exports.rejectTrainer = exports.validateTrainer = exports.listAll = exports.updateMyProfile = exports.getMyProfile = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const TrainerProfile_1 = __importDefault(require("../models/TrainerProfile"));
const User_1 = __importDefault(require("../models/User"));
const Notification_1 = __importDefault(require("../models/Notification"));
const TRAINER_FIELDS = ['certification', 'specialties', 'avatarUrl', 'documentUrls', 'hourlyRate'];
const sanitizeUpdate = (payload) => Object.fromEntries(Object.entries(payload).filter(([key]) => TRAINER_FIELDS.includes(key)));
const getMyProfile = async (req, res, next) => {
    try {
        if (!req.user)
            throw (0, http_errors_1.default)(401, 'Autenticação requerida.');
        const prof = await TrainerProfile_1.default.findOne({ userId: req.user._id });
        if (!prof)
            throw (0, http_errors_1.default)(404, 'Perfil de treinador não encontrado');
        res.json(prof);
    }
    catch (err) {
        next(err);
    }
};
exports.getMyProfile = getMyProfile;
const updateMyProfile = async (req, res, next) => {
    var _a;
    try {
        if (!req.user)
            throw (0, http_errors_1.default)(401, 'Autenticação requerida.');
        const patch = sanitizeUpdate((_a = req.body) !== null && _a !== void 0 ? _a : {});
        if (Array.isArray(patch.specialties)) {
            patch.specialties = patch.specialties.map((s) => String(s));
        }
        const prof = await TrainerProfile_1.default.findOneAndUpdate({ userId: req.user._id }, { $set: { ...patch, userId: req.user._id } }, { new: true, upsert: true, setDefaultsOnInsert: true });
        res.json(prof);
    }
    catch (err) {
        next(err);
    }
};
exports.updateMyProfile = updateMyProfile;
const listAll = async (req, res, next) => {
    try {
        const { validated } = req.query;
        const filter = {};
        if (validated === 'true')
            filter.validatedByAdmin = true;
        if (validated === 'false')
            filter.validatedByAdmin = false;
        const trainers = await TrainerProfile_1.default.find(filter)
            .populate('userId', 'username email profile.firstName profile.lastName')
            .sort({ createdAt: -1 });
        res.json(trainers);
    }
    catch (err) {
        next(err);
    }
};
exports.listAll = listAll;
const validateTrainer = async (req, res, next) => {
    try {
        const trainer = await TrainerProfile_1.default.findByIdAndUpdate(req.params.id, { $set: { validatedByAdmin: true, validatedAt: new Date(), reviewStatus: 'APPROVED' }, $unset: { rejectionReason: '', rejectedAt: '' } }, { new: true });
        if (!trainer)
            throw (0, http_errors_1.default)(404, 'Trainer não encontrado');
        // promove utilizador a TRAINER
        await User_1.default.findByIdAndUpdate(trainer.userId, { $set: { role: 'TRAINER' } });
        // Notificar utilizador de aprovação
        await Notification_1.default.create({
            recipientId: trainer.userId,
            type: 'TRAINER_APPROVED',
            payload: { trainerId: trainer._id },
            isRead: false,
        });
        res.json(trainer);
    }
    catch (err) {
        next(err);
    }
};
exports.validateTrainer = validateTrainer;
const rejectTrainer = async (req, res, next) => {
    try {
        const { reason } = req.body;
        const trainer = await TrainerProfile_1.default.findByIdAndUpdate(req.params.id, {
            $set: {
                validatedByAdmin: false,
                reviewStatus: 'REJECTED',
                rejectionReason: reason,
                rejectedAt: new Date(),
            },
            $unset: { validatedAt: '' },
        }, { new: true });
        if (!trainer)
            throw (0, http_errors_1.default)(404, 'Trainer não encontrado');
        // garante que o utilizador fica como CLIENT
        await User_1.default.findByIdAndUpdate(trainer.userId, { $set: { role: 'CLIENT' } });
        // Notificar utilizador de rejeição
        await Notification_1.default.create({
            recipientId: trainer.userId,
            type: 'TRAINER_REJECTED',
            payload: { trainerId: trainer._id, reason },
            isRead: false,
        });
        res.json(trainer);
    }
    catch (err) {
        next(err);
    }
};
exports.rejectTrainer = rejectTrainer;
const adminUpdateTrainer = async (req, res, next) => {
    var _a;
    try {
        const patch = sanitizeUpdate((_a = req.body) !== null && _a !== void 0 ? _a : {});
        const trainer = await TrainerProfile_1.default.findByIdAndUpdate(req.params.id, { $set: patch }, { new: true });
        if (!trainer)
            throw (0, http_errors_1.default)(404, 'Trainer não encontrado');
        res.json(trainer);
    }
    catch (err) {
        next(err);
    }
};
exports.adminUpdateTrainer = adminUpdateTrainer;
const listPublicTrainers = async (req, res, next) => {
    try {
        const { page = '1', limit = '12', sort = 'newest', q } = req.query;
        const parsedPage = Math.max(1, Number.parseInt(page, 10) || 1);
        const parsedLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 12));
        const skip = (parsedPage - 1) * parsedLimit;
        const filter = { reviewStatus: 'APPROVED', validatedByAdmin: true };
        if (q) {
            const regex = new RegExp(q, 'i');
            filter.$or = [
                { certification: regex },
                { specialties: regex },
            ];
        }
        const sortOption = sort === 'rating' ? { rating: -1, createdAt: -1 } : { createdAt: -1 };
        const [items, total] = await Promise.all([
            TrainerProfile_1.default
                .find(filter)
                .populate('userId', 'username profile.firstName profile.lastName profile.avatarUrl')
                .sort(sortOption)
                .skip(skip)
                .limit(parsedLimit),
            TrainerProfile_1.default.countDocuments(filter),
        ]);
        res.json({ items, page: parsedPage, total, pages: Math.ceil(total / parsedLimit) });
    }
    catch (err) {
        next(err);
    }
};
exports.listPublicTrainers = listPublicTrainers;
