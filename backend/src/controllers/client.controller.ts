import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import bcrypt from 'bcryptjs';
import ClientProfile from '../models/ClientProfile';
import User from '../models/User';
import TrainerProfile from '../models/TrainerProfile';

const ALLOWED_FIELDS = ['goals', 'injuries', 'preferences'] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

const pickAllowedFields = (payload: Record<string, unknown>): Partial<Record<AllowedField, string>> => {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => ALLOWED_FIELDS.includes(key as AllowedField))
  ) as Partial<Record<AllowedField, string>>;
};

// =========================
// CLIENTE: perfil próprio
// =========================

export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Autenticação requerida.' });
    const prof = await ClientProfile.findOne({ userId: req.user._id });
    if (!prof) throw createError(404, 'Perfil de cliente não encontrado');
    res.json(prof);
  } catch (e) { next(e); }
};

export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Autenticação requerida.' });
    const patch = pickAllowedFields(req.body ?? {});
    const updated = await ClientProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { ...patch, userId: req.user._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(updated);
  } catch (e) { next(e); }
};

// =========================
// TRAINER: gerir clientes
// =========================

export const trainerCreateClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado.' });
    }

    // buscar o perfil de treinador ligado a este user
    const trainerProfile = await TrainerProfile.findOne({ userId: req.user._id });
    if (!trainerProfile) {
      return res.status(400).json({ message: 'Perfil de treinador não encontrado.' });
    }

    const { username, email, password, firstName, lastName, goals } = req.body as {
      username?: string;
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      goals?: string;
    };

    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({
        message: 'Campos obrigatórios: username, email, password, firstName, lastName.',
      });
    }

    const normalizedEmail = email.toLowerCase();

    const existing = await User.findOne({
      $or: [{ email: normalizedEmail }, { username }],
    });

    if (existing) {
      return res.status(409).json({ message: 'Email ou username já existe.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // cria user com role CLIENT
    const user = await User.create({
      username,
      email: normalizedEmail,
      passwordHash,
      role: 'CLIENT',
      profile: { firstName, lastName },
      isActive: true,
    });

    // cria ClientProfile já associado AO TrainerProfile
    const clientProfile = await ClientProfile.create({
      userId: user._id,
      trainerId: trainerProfile._id, // <- aqui usamos o _id do TrainerProfile
      goals,
      // joinedAt fica com default do schema
    });

    return res.status(201).json({
      message: 'Cliente criado com sucesso.',
      user,
      clientProfile,
    });
  } catch (err) {
    next(err);
  }
};

export const listMyClients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado.' });
    }

    // obter o TrainerProfile deste user
    const trainerProfile = await TrainerProfile.findOne({ userId: req.user._id }).select('_id');
    if (!trainerProfile) {
      return res.status(400).json({ message: 'Perfil de treinador não encontrado.' });
    }

    const clients = await ClientProfile.find({ trainerId: trainerProfile._id })
      .populate('userId', 'username email profile.firstName profile.lastName');

    res.json(clients);
  } catch (err) {
    next(err);
  }
};
