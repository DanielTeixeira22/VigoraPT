/**
 * Utilitários JWT
 * Funções para assinar e verificar tokens de acesso e refresh.
 */

import jwt, { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';

// ============================================================================
// Configuration
// ============================================================================

/** Access token lifetime. */
export const ACCESS_EXP = '15m';

/** Refresh token lifetime. */
export const REFRESH_EXP = '7d';

// ============================================================================
// Tipos
// ============================================================================

type ObjectIdLike = Types.ObjectId | string;

/** Payload do token de acesso */
export interface AccessPayload extends JwtPayload {
  id: string;
  role: string;
}

/** Payload do refresh token */
export interface RefreshPayload extends JwtPayload {
  id: string;
}

/** Minimal user shape for token generation. */
interface TokenUser {
  _id: ObjectIdLike;
  role: string;
}

// ============================================================================
// Auxiliares
// ============================================================================

/**
 * Obtém variável de ambiente ou lança erro.
 */
const requireEnv = (value: string | undefined, key: string): string => {
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
export const signAccess = (user: TokenUser): string => {
  const secret = requireEnv(process.env.JWT_SECRET, 'JWT_SECRET');
  return jwt.sign({ id: String(user._id), role: user.role }, secret, { expiresIn: ACCESS_EXP });
};

/**
 * Gera refresh token JWT.
 * @param user - Utilizador com _id
 * @returns Token assinado (expira em 7 dias)
 */
export const signRefresh = (user: Pick<TokenUser, '_id'>): string => {
  const secret = requireEnv(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
  return jwt.sign({ id: String(user._id) }, secret, { expiresIn: REFRESH_EXP });
};

/**
 * Verifica e descodifica token de acesso.
 * @param token - Token JWT a verificar
 * @returns Payload descodificado
 * @throws Se token inválido ou expirado
 */
export const verifyAccess = (token: string): AccessPayload => {
  const secret = requireEnv(process.env.JWT_SECRET, 'JWT_SECRET');
  return jwt.verify(token, secret) as AccessPayload;
};

/**
 * Verifica e descodifica refresh token.
 * @param token - Refresh token a verificar
 * @returns Payload descodificado
 * @throws Se token inválido ou expirado
 */
export const verifyRefresh = (token: string): RefreshPayload => {
  const secret = requireEnv(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
  return jwt.verify(token, secret) as RefreshPayload;
};
