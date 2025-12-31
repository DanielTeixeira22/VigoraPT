/**
 * Middleware de Autenticação
 * Valida o token JWT e adiciona o utilizador ao request.
 */

import type { RequestHandler } from 'express';
import createError from 'http-errors';
import User from '../models/User';
import { verifyAccess } from '../utils/jwt';

/**
 * Verifica o token Bearer e popula req.user.
 * Retorna 401 se token ausente, inválido ou expirado.
 */
const authMiddleware: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Verifica formato "Bearer <token>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token não fornecido.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccess(token);

    // Fetch user from the DB (without password).
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      throw createError(401, 'Utilizador não encontrado ou inválido.');
    }

    req.user = user;
    return next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token inválido ou expirado.';
    console.error('[Auth] Erro:', message);
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
};

export default authMiddleware;
