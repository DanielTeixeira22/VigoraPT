"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUpdateUser = exports.toggleUserActive = exports.searchUsers = exports.changeMyPassword = exports.updateMe = exports.getMe = exports.adminCreateUser = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const mongoose_1 = require("mongoose");
const User_1 = __importDefault(require("../models/User"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const parsePagination = (value, fallback) => {
    if (!value)
        return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};
const adminCreateUser = async (req, res, next) => {
    try {
        const { username, email, password, role, firstName, lastName } = req.body;
        // validar campos obrigatórios
        if (!username || !email || !password || !role) {
            return res.status(400).json({
                message: 'Campos obrigatórios: username, email, password, role.'
            });
        }
        // validar role
        if (!['ADMIN', 'TRAINER', 'CLIENT'].includes(role)) {
            return res.status(400).json({ message: 'Role inválido.' });
        }
        const normalizedEmail = email.toLowerCase();
        // evitar duplicados
        const existing = await User_1.default.findOne({
            $or: [{ email: normalizedEmail }, { username }]
        });
        if (existing) {
            return res.status(409).json({ message: 'Email ou username já existe.' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const user = await User_1.default.create({
            username,
            email: normalizedEmail,
            passwordHash,
            role,
            profile: { firstName, lastName },
            isActive: true,
        });
        return res.status(201).json({
            message: 'Utilizador criado com sucesso.',
            user
        });
    }
    catch (err) {
        next(err);
    }
};
exports.adminCreateUser = adminCreateUser;
const getMe = async (req, res, next) => {
    try {
        if (!req.user)
            throw (0, http_errors_1.default)(401, 'Autenticação requerida.');
        const me = await User_1.default.findById(req.user._id).select('-passwordHash');
        if (!me)
            throw (0, http_errors_1.default)(404, 'Utilizador não encontrado');
        res.json(me);
    }
    catch (e) {
        next(e);
    }
};
exports.getMe = getMe;
const updateMe = async (req, res, next) => {
    try {
        if (!req.user)
            throw (0, http_errors_1.default)(401, 'Autenticação requerida.');
        const { email, firstName, lastName, avatarUrl, bio } = req.body;
        const update = {};
        if (email)
            update.email = email.toLowerCase();
        if (firstName)
            update['profile.firstName'] = firstName;
        if (lastName)
            update['profile.lastName'] = lastName;
        if (avatarUrl !== undefined)
            update['profile.avatarUrl'] = avatarUrl;
        if (bio !== undefined)
            update['profile.bio'] = bio;
        const updated = await User_1.default.findByIdAndUpdate(req.user._id, { $set: update }, { new: true }).select('-passwordHash');
        res.json(updated);
    }
    catch (e) {
        next(e);
    }
};
exports.updateMe = updateMe;
const changeMyPassword = async (req, res, next) => {
    try {
        if (!req.user)
            throw (0, http_errors_1.default)(401, 'Autenticação requerida.');
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Campos obrigatórios: currentPassword e newPassword.' });
        }
        const user = await User_1.default.findById(req.user._id);
        if (!user)
            throw (0, http_errors_1.default)(404, 'Utilizador não encontrado');
        const valid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!valid)
            return res.status(401).json({ message: 'Password atual incorreta.' });
        user.passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
        await user.save();
        res.json({ message: 'Password alterada com sucesso.' });
    }
    catch (err) {
        next(err);
    }
};
exports.changeMyPassword = changeMyPassword;
const searchUsers = async (req, res, next) => {
    try {
        const { q = '', role } = req.query;
        const page = Math.max(1, parsePagination(req.query.page, 1));
        const limit = Math.max(1, Math.min(100, parsePagination(req.query.limit, 20)));
        const skip = (page - 1) * limit;
        const filter = {};
        if (q) {
            const regex = new RegExp(q, 'i');
            filter.$or = [
                { username: regex },
                { email: regex },
                { 'profile.firstName': regex },
                { 'profile.lastName': regex },
            ];
        }
        if (role)
            filter.role = role;
        const [docs, total] = await Promise.all([
            User_1.default.find(filter).select('-passwordHash').skip(skip).limit(limit),
            User_1.default.countDocuments(filter),
        ]);
        res.json({ data: docs, page, total });
    }
    catch (e) {
        next(e);
    }
};
exports.searchUsers = searchUsers;
const toggleUserActive = async (req, res, next) => {
    try {
        const user = await User_1.default.findById(req.params.id);
        if (!user)
            throw (0, http_errors_1.default)(404, 'Utilizador não encontrado');
        user.isActive = !user.isActive;
        await user.save();
        res.json({ id: user._id, isActive: user.isActive });
    }
    catch (e) {
        next(e);
    }
};
exports.toggleUserActive = toggleUserActive;
// ADMIN: atualizar utilizador (email, nome, role, isActive)
const adminUpdateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose_1.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Id inválido.' });
        }
        const { email, firstName, lastName, role, isActive } = req.body;
        const update = {};
        if (email) {
            update.email = email.toLowerCase();
        }
        if (firstName || lastName) {
            update.profile = {};
            if (firstName)
                update.profile.firstName = firstName;
            if (lastName)
                update.profile.lastName = lastName;
        }
        if (typeof isActive === 'boolean') {
            update.isActive = isActive;
        }
        if (role) {
            if (!['ADMIN', 'TRAINER', 'CLIENT'].includes(role)) {
                return res.status(400).json({ message: 'Role inválido.' });
            }
            update.role = role;
        }
        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: 'Nenhum campo para atualizar.' });
        }
        // validar conflito de email
        if (update.email) {
            const existingWithEmail = await User_1.default.findOne({
                email: update.email,
                _id: { $ne: id },
            });
            if (existingWithEmail) {
                return res.status(409).json({ message: 'Já existe um utilizador com esse email.' });
            }
        }
        const updated = await User_1.default.findByIdAndUpdate(id, { $set: update }, { new: true }).select('-passwordHash');
        if (!updated) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
};
exports.adminUpdateUser = adminUpdateUser;
