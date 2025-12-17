"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyClients = exports.trainerCreateClient = exports.updateMyProfile = exports.getMyProfile = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const ClientProfile_1 = __importDefault(require("../models/ClientProfile"));
const User_1 = __importDefault(require("../models/User"));
const TrainerProfile_1 = __importDefault(require("../models/TrainerProfile"));
const ALLOWED_FIELDS = ['goals', 'injuries', 'preferences'];
const pickAllowedFields = (payload) => {
    return Object.fromEntries(Object.entries(payload).filter(([key]) => ALLOWED_FIELDS.includes(key)));
};
// =========================
// CLIENTE: perfil próprio
// =========================
const getMyProfile = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Autenticação requerida.' });
        const prof = await ClientProfile_1.default.findOne({ userId: req.user._id });
        if (!prof)
            throw (0, http_errors_1.default)(404, 'Perfil de cliente não encontrado');
        res.json(prof);
    }
    catch (e) {
        next(e);
    }
};
exports.getMyProfile = getMyProfile;
const updateMyProfile = async (req, res, next) => {
    var _a;
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Autenticação requerida.' });
        const patch = pickAllowedFields((_a = req.body) !== null && _a !== void 0 ? _a : {});
        const updated = await ClientProfile_1.default.findOneAndUpdate({ userId: req.user._id }, { $set: { ...patch, userId: req.user._id } }, { new: true, upsert: true, setDefaultsOnInsert: true });
        res.json(updated);
    }
    catch (e) {
        next(e);
    }
};
exports.updateMyProfile = updateMyProfile;
// =========================
// TRAINER: gerir clientes
// =========================
const trainerCreateClient = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Não autenticado.' });
        }
        // buscar o perfil de treinador ligado a este user
        const trainerProfile = await TrainerProfile_1.default.findOne({ userId: req.user._id });
        if (!trainerProfile) {
            return res.status(400).json({ message: 'Perfil de treinador não encontrado.' });
        }
        const { username, email, password, firstName, lastName, goals } = req.body;
        if (!username || !email || !password || !firstName || !lastName) {
            return res.status(400).json({
                message: 'Campos obrigatórios: username, email, password, firstName, lastName.',
            });
        }
        const normalizedEmail = email.toLowerCase();
        const existing = await User_1.default.findOne({
            $or: [{ email: normalizedEmail }, { username }],
        });
        if (existing) {
            return res.status(409).json({ message: 'Email ou username já existe.' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        // cria user com role CLIENT
        const user = await User_1.default.create({
            username,
            email: normalizedEmail,
            passwordHash,
            role: 'CLIENT',
            profile: { firstName, lastName },
            isActive: true,
        });
        // cria ClientProfile já associado AO TrainerProfile
        const clientProfile = await ClientProfile_1.default.create({
            userId: user._id,
            trainerId: trainerProfile._id, // <- aqui usamos o _id do TrainerProfile
            goals,
            // joinedAt fica com default do schema
        });
        return res.status(201).json({
            message: 'Cliente criado com sucesso.',
            user,
            clientProfile,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.trainerCreateClient = trainerCreateClient;
const listMyClients = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Não autenticado.' });
        }
        // obter o TrainerProfile deste user
        const trainerProfile = await TrainerProfile_1.default.findOne({ userId: req.user._id }).select('_id');
        if (!trainerProfile) {
            return res.status(400).json({ message: 'Perfil de treinador não encontrado.' });
        }
        const clients = await ClientProfile_1.default.find({ trainerId: trainerProfile._id })
            .populate('userId', 'username email profile.firstName profile.lastName');
        res.json(clients);
    }
    catch (err) {
        next(err);
    }
};
exports.listMyClients = listMyClients;
