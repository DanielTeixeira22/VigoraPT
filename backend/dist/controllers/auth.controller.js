"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refresh = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const TrainerProfile_1 = __importDefault(require("../models/TrainerProfile"));
const ClientProfile_1 = __importDefault(require("../models/ClientProfile"));
const Notification_1 = __importDefault(require("../models/Notification"));
const jwt_1 = require("../utils/jwt");
const path_1 = __importDefault(require("path"));
const sanitizeUser = (user) => ({
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    profile: user.profile,
});
const register = async (req, res, next) => {
    try {
        const { username, email, password, firstName, lastName, trainerCertification, trainerSpecialties, trainerHourlyRate } = req.body;
        const wantsTrainer = Boolean(req.body.wantsTrainer);
        if (!username || !email || !password || !firstName || !lastName) {
            return res.status(400).json({ message: 'Campos obrigatórios: username, email, password, firstName, lastName.' });
        }
        // email deve ser normalizado
        const normalizedEmail = email.toLowerCase();
        // força CLIENT no registo; candidatura a trainer fica pendente até aprovação
        const normalizedRole = 'CLIENT';
        const exists = await User_1.default.findOne({
            $or: [{ email: normalizedEmail }, { username }]
        });
        if (exists)
            return res.status(409).json({ message: 'Email ou username já existe.' });
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const user = await User_1.default.create({
            username,
            email: normalizedEmail,
            passwordHash,
            role: normalizedRole,
            profile: { firstName, lastName },
            isActive: true,
        });
        // cria perfil de cliente por omissão (necessário para pedidos e stats)
        await ClientProfile_1.default.findOneAndUpdate({ userId: user._id }, { $setOnInsert: { userId: user._id } }, { upsert: true, new: true });
        const accessToken = (0, jwt_1.signAccess)(user);
        const refreshToken = (0, jwt_1.signRefresh)(user);
        // Se pediu ser trainer, cria perfil pendente e notifica admins
        if (wantsTrainer) {
            const doc = req.file;
            const base = `${req.protocol}://${req.get('host')}`;
            const docUrl = doc ? `${base}/uploads/${path_1.default.basename(doc.filename)}` : undefined;
            const specialtiesArr = (trainerSpecialties || '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            const hourly = trainerHourlyRate ? Number(trainerHourlyRate) : undefined;
            await TrainerProfile_1.default.create({
                userId: user._id,
                validatedByAdmin: false,
                reviewStatus: 'PENDING',
                certification: trainerCertification,
                specialties: specialtiesArr,
                documentUrls: docUrl ? [docUrl] : [],
                hourlyRate: hourly,
            });
            const admins = await User_1.default.find({ role: 'ADMIN', isActive: true }).select('_id');
            if (admins.length) {
                await Notification_1.default.insertMany(admins.map((a) => ({
                    recipientId: a._id,
                    type: 'ALERT',
                    payload: {
                        request: 'TRAINER_VALIDATION',
                        userId: user._id,
                        username: user.username,
                        email: user.email,
                    },
                    isRead: false,
                })));
            }
        }
        res.status(201).json({
            user: sanitizeUser(user),
            accessToken,
            refreshToken,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { emailOrUsername, password } = req.body;
        if (!emailOrUsername || !password) {
            return res.status(400).json({ message: 'Campos obrigatórios: emailOrUsername e password.' });
        }
        const user = await User_1.default.findOne({
            $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
        });
        if (!user)
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        if (!user.isActive)
            return res.status(403).json({ message: 'Conta desativada.' });
        const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid)
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        const accessToken = (0, jwt_1.signAccess)(user);
        const refreshToken = (0, jwt_1.signRefresh)(user);
        res.json({
            user: sanitizeUser(user),
            accessToken,
            refreshToken,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.login = login;
const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken)
            return res.status(400).json({ message: 'refreshToken é obrigatório.' });
        let payload;
        try {
            payload = (0, jwt_1.verifyRefresh)(refreshToken);
        }
        catch {
            return res.status(401).json({ message: 'Refresh token inválido ou expirado.' });
        }
        const user = await User_1.default.findById(payload.id);
        if (!user || !user.isActive)
            return res.status(401).json({ message: 'Utilizador inválido.' });
        const accessToken = (0, jwt_1.signAccess)(user);
        const newRefreshToken = (0, jwt_1.signRefresh)(user); // estratégia rotativa
        res.json({
            user: sanitizeUser(user),
            accessToken,
            refreshToken: newRefreshToken
        });
    }
    catch (err) {
        next(err);
    }
};
exports.refresh = refresh;
