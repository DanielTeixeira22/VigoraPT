import type { RequestHandler } from 'express';
import createError from 'http-errors';
import type { UserRole } from '../models/User';

const requireRole = (...roles: UserRole[]): RequestHandler => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Autenticação obrigatória.' });
  }
  if (!roles.includes(req.user.role)) {
    return next(createError(403, 'Sem permissões suficientes.'));
  }
  return next();
};

export default requireRole;
