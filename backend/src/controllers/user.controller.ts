import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { Types } from 'mongoose';
import User, { UserRole } from '../models/User';
import bcrypt from 'bcryptjs';

type UpdateMeBody = {
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  bio?: string;
};

interface SearchQuery {
  q?: string;
  role?: string;
  page?: string;
  limit?: string;
}

const parsePagination = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const adminCreateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email, password, role, firstName, lastName } = req.body as {
      username?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      firstName?: string;
      lastName?: string;
    };

    // validar campos obrigatórios
    if (!username || !email || !password || !role) {
      return res.status(400).json({
        message: 'Campos obrigatórios: username, email, password, role.'
      });
    }

    // validar role
    if (!['ADMIN', 'TRAINER', 'CLIENT'].includes(role)) {
      return res.status(400).json({ message: 'Role inválido.' });
    }

    const normalizedEmail = email.toLowerCase();

    // evitar duplicados
    const existing = await User.findOne({
      $or: [{ email: normalizedEmail }, { username }]
    });

    if (existing) {
      return res.status(409).json({ message: 'Email ou username já existe.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      username,
      email: normalizedEmail,
      passwordHash,
      role,
      profile: { firstName, lastName },
      isActive: true,
    });

    return res.status(201).json({
      message: 'Utilizador criado com sucesso.',
      user
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw createError(401, 'Autenticação requerida.');
    const me = await User.findById(req.user._id).select('-passwordHash');
    if (!me) throw createError(404, 'Utilizador não encontrado');
    res.json(me);
  } catch (e) { next(e); }
};

export const updateMe = async (req: Request<unknown, unknown, UpdateMeBody>, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw createError(401, 'Autenticação requerida.');

    const { email, firstName, lastName, avatarUrl, bio } = req.body;
    const update: Record<string, unknown> = {};
    if (email) update.email = email.toLowerCase();
    if (firstName) update['profile.firstName'] = firstName;
    if (lastName) update['profile.lastName'] = lastName;
    if (avatarUrl !== undefined) update['profile.avatarUrl'] = avatarUrl;
    if (bio !== undefined) update['profile.bio'] = bio;

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true }
    ).select('-passwordHash');

    res.json(updated);
  } catch (e) { next(e); }
};

export const changeMyPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw createError(401, 'Autenticação requerida.');
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Campos obrigatórios: currentPassword e newPassword.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) throw createError(404, 'Utilizador não encontrado');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Password atual incorreta.' });

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ message: 'Password alterada com sucesso.' });
  } catch (err) { next(err); }
};

export const searchUsers = async (req: Request<unknown, unknown, unknown, SearchQuery>, res: Response, next: NextFunction) => {
  try {
    const { q = '', role } = req.query;
    const page = Math.max(1, parsePagination(req.query.page, 1));
    const limit = Math.max(1, Math.min(100, parsePagination(req.query.limit, 20)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { username: regex },
        { email: regex },
        { 'profile.firstName': regex },
        { 'profile.lastName': regex },
      ];
    }
    if (role) filter.role = role;

    const [docs, total] = await Promise.all([
      User.find(filter).select('-passwordHash').skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);
    res.json({ data: docs, page, total });
  } catch (e) { next(e); }
};

export const toggleUserActive = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw createError(404, 'Utilizador não encontrado');
    user.isActive = !user.isActive;
    await user.save();
    res.json({ id: user._id, isActive: user.isActive });
  } catch (e) { next(e); }
};

// ADMIN: atualizar utilizador (email, nome, role, isActive)
export const adminUpdateUser = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Id inválido.' });
    }
    const { email, firstName, lastName, role, isActive } = req.body as {
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: UserRole;
      isActive?: boolean;
    };

    const update: any = {};

    if (email) {
      update.email = email.toLowerCase();
    }

    if (firstName || lastName) {
      update.profile = {};
      if (firstName) update.profile.firstName = firstName;
      if (lastName) update.profile.lastName = lastName;
    }

    if (typeof isActive === 'boolean') {
      update.isActive = isActive;
    }

    if (role) {
      if (!['ADMIN', 'TRAINER', 'CLIENT'].includes(role)) {
        return res.status(400).json({ message: 'Role inválido.' });
      }
      update.role = role;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'Nenhum campo para atualizar.' });
    }

    // validar conflito de email
    if (update.email) {
      const existingWithEmail = await User.findOne({
        email: update.email,
        _id: { $ne: id },
      });
      if (existingWithEmail) {
        return res.status(409).json({ message: 'Já existe um utilizador com esse email.' });
      }
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).select('-passwordHash');

    if (!updated) {
      return res.status(404).json({ message: 'Utilizador não encontrado.' });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
};
