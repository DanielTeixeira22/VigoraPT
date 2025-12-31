"use strict";
/**
 * Utilitários Bcrypt
 * Funções para hash e comparação de passwords.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparePassword = exports.hashPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/** Number of salt rounds. */
const SALT_ROUNDS = 10;
/**
 * Gera hash de uma password.
 * @param password - Password em texto plano
 * @returns Hash bcrypt
 */
const hashPassword = async (password) => {
    return bcryptjs_1.default.hash(password, SALT_ROUNDS);
};
exports.hashPassword = hashPassword;
/**
 * Compara password com hash.
 * @param password - Password em texto plano
 * @param hash - Hash armazenado
 * @returns true se coincidirem
 */
const comparePassword = async (password, hash) => {
    return bcryptjs_1.default.compare(password, hash);
};
exports.comparePassword = comparePassword;
