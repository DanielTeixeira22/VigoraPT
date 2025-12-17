import type { RequestHandler } from 'express';
import createError from 'http-errors';
import User from '../models/User';
import { verifyAccess } from '../utils/jwt';

const authMiddleware: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token não fornecido.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccess(token);

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      throw createError(401, 'Utilizador não encontrado ou inválido.');
    }

    req.user = user;
    return next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token inválido ou expirado.';
    console.error('Erro no authMiddleware:', message);
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
};

export default authMiddleware;
