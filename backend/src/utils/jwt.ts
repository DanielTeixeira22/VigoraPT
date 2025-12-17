import jwt, { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';

export const ACCESS_EXP = '15m';
export const REFRESH_EXP = '7d';

type ObjectIdLike = Types.ObjectId | string;

export interface AccessPayload extends JwtPayload {
  id: string;
  role: string;
}

export interface RefreshPayload extends JwtPayload {
  id: string;
}

interface TokenUser {
  _id: ObjectIdLike;
  role: string;
}

const requireEnv = (value: string | undefined, key: string): string => {
  if (!value) {
    throw new Error(`Variável de ambiente em falta: ${key}`);
  }
  return value;
};

export const signAccess = (user: TokenUser): string => {
  const secret = requireEnv(process.env.JWT_SECRET, 'JWT_SECRET');
  return jwt.sign({ id: String(user._id), role: user.role }, secret, { expiresIn: ACCESS_EXP });
};

export const signRefresh = (user: Pick<TokenUser, '_id'>): string => {
  const secret = requireEnv(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
  return jwt.sign({ id: String(user._id) }, secret, { expiresIn: REFRESH_EXP });
};

export const verifyAccess = (token: string): AccessPayload => {
  const secret = requireEnv(process.env.JWT_SECRET, 'JWT_SECRET');
  return jwt.verify(token, secret) as AccessPayload;
};

export const verifyRefresh = (token: string): RefreshPayload => {
  const secret = requireEnv(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
  return jwt.verify(token, secret) as RefreshPayload;
};
