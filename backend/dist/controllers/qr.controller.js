"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reject = exports.poll = exports.approve = exports.start = void 0;
const crypto_1 = __importDefault(require("crypto"));
const QrLoginToken_1 = __importDefault(require("../models/QrLoginToken"));
const User_1 = __importDefault(require("../models/User"));
const jwt_1 = require("../utils/jwt");
const generateCode = () => crypto_1.default.randomBytes(20).toString('hex');
const start = async (req, res, next) => {
    try {
        const code = generateCode();
        const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
        await QrLoginToken_1.default.create({
            code,
            expiresAt,
            status: 'PENDING',
        });
        return res.status(201).json({
            code,
            expiresAt,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.start = start;
const approve = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Autenticação requerida.' });
        const { code } = req.body;
        if (!code)
            return res.status(400).json({ message: 'code é obrigatório.' });
        const token = await QrLoginToken_1.default.findOne({ code });
        if (!token)
            return res.status(404).json({ message: 'Código inválido.' });
        if (token.expiresAt < new Date()) {
            token.status = 'EXPIRED';
            await token.save();
            return res.status(410).json({ message: 'Código expirado.' });
        }
        if (token.status !== 'PENDING') {
            return res.status(400).json({ message: `Token já está em estado ${token.status}.` });
        }
        token.userId = req.user._id;
        token.status = 'APPROVED';
        await token.save();
        return res.json({ message: 'Aprovado com sucesso.' });
    }
    catch (err) {
        next(err);
    }
};
exports.approve = approve;
const poll = async (req, res, next) => {
    try {
        const { code } = req.query;
        if (!code)
            return res.status(400).json({ message: 'code é obrigatório.' });
        const token = await QrLoginToken_1.default.findOne({ code });
        if (!token)
            return res.status(404).json({ message: 'Código inválido.' });
        if (token.expiresAt < new Date()) {
            if (token.status !== 'APPROVED')
                token.status = 'EXPIRED';
            await token.save();
            return res.status(410).json({ status: token.status, message: 'Código expirado.' });
        }
        if (token.status === 'PENDING') {
            return res.json({ status: 'PENDING' });
        }
        if (token.status === 'REJECTED') {
            return res.status(403).json({ status: 'REJECTED', message: 'Pedido rejeitado.' });
        }
        if (token.status === 'APPROVED') {
            const user = await User_1.default.findById(token.userId);
            if (!user) {
                token.status = 'EXPIRED';
                await token.save();
                return res.status(410).json({ status: 'EXPIRED', message: 'Utilizador já não existe.' });
            }
            const accessToken = (0, jwt_1.signAccess)(user);
            const refreshToken = (0, jwt_1.signRefresh)(user);
            await QrLoginToken_1.default.deleteOne({ _id: token._id });
            return res.json({
                status: 'APPROVED',
                user: { id: user._id, username: user.username, email: user.email, role: user.role, profile: user.profile },
                accessToken,
                refreshToken,
            });
        }
        return res.json({ status: token.status });
    }
    catch (err) {
        next(err);
    }
};
exports.poll = poll;
const reject = async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code)
            return res.status(400).json({ message: 'code é obrigatório.' });
        const token = await QrLoginToken_1.default.findOne({ code });
        if (!token)
            return res.status(404).json({ message: 'Código inválido.' });
        token.status = 'REJECTED';
        await token.save();
        return res.json({ message: 'Pedido rejeitado.' });
    }
    catch (err) {
        next(err);
    }
};
exports.reject = reject;
