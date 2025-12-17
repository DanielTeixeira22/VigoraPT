"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_errors_1 = __importDefault(require("http-errors"));
const User_1 = __importDefault(require("../models/User"));
const jwt_1 = require("../utils/jwt");
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Token não fornecido.' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = (0, jwt_1.verifyAccess)(token);
        const user = await User_1.default.findById(decoded.id).select('-passwordHash');
        if (!user) {
            throw (0, http_errors_1.default)(401, 'Utilizador não encontrado ou inválido.');
        }
        req.user = user;
        return next();
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Token inválido ou expirado.';
        console.error('Erro no authMiddleware:', message);
        return res.status(401).json({ message: 'Token inválido ou expirado.' });
    }
};
exports.default = authMiddleware;
