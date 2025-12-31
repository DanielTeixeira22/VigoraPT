/**
 * Middleware de Verificação de Role
 * Restringe acesso a rotas baseado no role do utilizador.
 */

import type { RequestHandler } from 'express';
import createError from 'http-errors';
import type { UserRole } from '../models/User';

/**
 * Cria middleware que só permite acesso aos roles especificados.
 * @param roles - Roles permitidos (ex: 'ADMIN', 'TRAINER')
 * @returns Middleware que valida o role do utilizador
 */
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
