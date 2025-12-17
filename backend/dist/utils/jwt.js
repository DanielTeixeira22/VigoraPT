"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefresh = exports.verifyAccess = exports.signRefresh = exports.signAccess = exports.REFRESH_EXP = exports.ACCESS_EXP = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
exports.ACCESS_EXP = '15m';
exports.REFRESH_EXP = '7d';
const requireEnv = (value, key) => {
    if (!value) {
        throw new Error(`Variável de ambiente em falta: ${key}`);
    }
    return value;
};
const signAccess = (user) => {
    const secret = requireEnv(process.env.JWT_SECRET, 'JWT_SECRET');
    return jsonwebtoken_1.default.sign({ id: String(user._id), role: user.role }, secret, { expiresIn: exports.ACCESS_EXP });
};
exports.signAccess = signAccess;
const signRefresh = (user) => {
    const secret = requireEnv(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
    return jsonwebtoken_1.default.sign({ id: String(user._id) }, secret, { expiresIn: exports.REFRESH_EXP });
};
exports.signRefresh = signRefresh;
const verifyAccess = (token) => {
    const secret = requireEnv(process.env.JWT_SECRET, 'JWT_SECRET');
    return jsonwebtoken_1.default.verify(token, secret);
};
exports.verifyAccess = verifyAccess;
const verifyRefresh = (token) => {
    const secret = requireEnv(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
    return jsonwebtoken_1.default.verify(token, secret);
};
exports.verifyRefresh = verifyRefresh;
