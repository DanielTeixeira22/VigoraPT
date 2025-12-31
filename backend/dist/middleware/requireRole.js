"use strict";
/**
 * Middleware de Verificação de Role
 * Restringe acesso a rotas baseado no role do utilizador.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_errors_1 = __importDefault(require("http-errors"));
/**
 * Cria middleware que só permite acesso aos roles especificados.
 * @param roles - Roles permitidos (ex: 'ADMIN', 'TRAINER')
 * @returns Middleware que valida o role do utilizador
 */
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Autenticação obrigatória.' });
    }
    if (!roles.includes(req.user.role)) {
        return next((0, http_errors_1.default)(403, 'Sem permissões suficientes.'));
    }
    return next();
};
exports.default = requireRole;
