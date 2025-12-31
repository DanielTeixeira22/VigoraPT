"use strict";
/**
 * Utilitários JWT
 * Funções para assinar e verificar tokens de acesso e refresh.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefresh = exports.verifyAccess = exports.signRefresh = exports.signAccess = exports.REFRESH_EXP = exports.ACCESS_EXP = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// ============================================================================
// Configuration
// ============================================================================
/** Access token lifetime. */
exports.ACCESS_EXP = '15m';
/** Refresh token lifetime. */
exports.REFRESH_EXP = '7d';
// ============================================================================
// Auxiliares
// ============================================================================
/**
 * Obtém variável de ambiente ou lança erro.
 */
const requireEnv = (value, key) => {
    if (!value) {
        throw new Error(`Variável de ambiente em falta: ${key}`);
    }
    return value;
};
// ============================================================================
// Exported functions
// ============================================================================
/**
 * Gera token de acesso JWT.
 * @param user - Utilizador com _id e role
 * @returns Token assinado (expira em 15min)
 */
const signAccess = (user) => {
    const secret = requireEnv(process.env.JWT_SECRET, 'JWT_SECRET');
    return jsonwebtoken_1.default.sign({ id: String(user._id), role: user.role }, secret, { expiresIn: exports.ACCESS_EXP });
};
exports.signAccess = signAccess;
/**
 * Gera refresh token JWT.
 * @param user - Utilizador com _id
 * @returns Token assinado (expira em 7 dias)
 */
const signRefresh = (user) => {
    const secret = requireEnv(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
    return jsonwebtoken_1.default.sign({ id: String(user._id) }, secret, { expiresIn: exports.REFRESH_EXP });
};
exports.signRefresh = signRefresh;
/**
 * Verifica e descodifica token de acesso.
 * @param token - Token JWT a verificar
 * @returns Payload descodificado
 * @throws Se token inválido ou expirado
 */
const verifyAccess = (token) => {
    const secret = requireEnv(process.env.JWT_SECRET, 'JWT_SECRET');
    return jsonwebtoken_1.default.verify(token, secret);
};
exports.verifyAccess = verifyAccess;
/**
 * Verifica e descodifica refresh token.
 * @param token - Refresh token a verificar
 * @returns Payload descodificado
 * @throws Se token inválido ou expirado
 */
const verifyRefresh = (token) => {
    const secret = requireEnv(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
    return jsonwebtoken_1.default.verify(token, secret);
};
exports.verifyRefresh = verifyRefresh;
