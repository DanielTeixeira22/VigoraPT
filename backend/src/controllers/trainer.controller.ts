import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import TrainerProfile from '../models/TrainerProfile';
import User from '../models/User';
import Notification from '../models/Notification';


const TRAINER_FIELDS = ['certification', 'specialties', 'avatarUrl', 'documentUrls', 'hourlyRate'] as const;
type TrainerField = (typeof TRAINER_FIELDS)[number];

const sanitizeUpdate = (payload: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(payload).filter(([key]) => TRAINER_FIELDS.includes(key as TrainerField))
  );

export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw createError(401, 'Autenticação requerida.');
    const prof = await TrainerProfile.findOne({ userId: req.user._id });
    if (!prof) throw createError(404, 'Perfil de treinador não encontrado');
    res.json(prof);
  } catch (err) { next(err); }
};

export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw createError(401, 'Autenticação requerida.');
    const patch = sanitizeUpdate(req.body ?? {});
    if (Array.isArray(patch.specialties)) {
      patch.specialties = patch.specialties.map((s: unknown) => String(s));
    }
    const prof = await TrainerProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { ...patch, userId: req.user._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(prof);
  } catch (err) { next(err); }
};

export const listAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { validated } = req.query as { validated?: string };
    const filter: Record<string, unknown> = {};
    if (validated === 'true') filter.validatedByAdmin = true;
    if (validated === 'false') filter.validatedByAdmin = false;
    const trainers = await TrainerProfile.find(filter)
      .populate('userId', 'username email profile.firstName profile.lastName')
      .sort({ createdAt: -1 });
    res.json(trainers);
  } catch (err) { next(err); }
};

export const validateTrainer = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const trainer = await TrainerProfile.findByIdAndUpdate(
      req.params.id,
      { $set: { validatedByAdmin: true, validatedAt: new Date(), reviewStatus: 'APPROVED' }, $unset: { rejectionReason: '', rejectedAt: '' } },
      { new: true }
    );
    if (!trainer) throw createError(404, 'Trainer não encontrado');
    // promove utilizador a TRAINER
    await User.findByIdAndUpdate(trainer.userId, { $set: { role: 'TRAINER' } });

    // Notificar utilizador de aprovação
    await Notification.create({
      recipientId: trainer.userId,
      type: 'TRAINER_APPROVED',
      payload: { trainerId: trainer._id },
      isRead: false,
    });

    res.json(trainer);
  } catch (err) { next(err); }
};

export const rejectTrainer = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body as { reason?: string };
    const trainer = await TrainerProfile.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          validatedByAdmin: false,
          reviewStatus: 'REJECTED',
          rejectionReason: reason,
          rejectedAt: new Date(),
        },
        $unset: { validatedAt: '' },
      },
      { new: true }
    );
    if (!trainer) throw createError(404, 'Trainer não encontrado');
    // garante que o utilizador fica como CLIENT
    await User.findByIdAndUpdate(trainer.userId, { $set: { role: 'CLIENT' } });

    // Notificar utilizador de rejeição
    await Notification.create({
      recipientId: trainer.userId,
      type: 'TRAINER_REJECTED',
      payload: { trainerId: trainer._id, reason },
      isRead: false,
    });

    res.json(trainer);
  } catch (err) { next(err); }
};

export const adminUpdateTrainer = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const patch = sanitizeUpdate(req.body ?? {});
    const trainer = await TrainerProfile.findByIdAndUpdate(
      req.params.id,
      { $set: patch },
      { new: true }
    );
    if (!trainer) throw createError(404, 'Trainer não encontrado');
    res.json(trainer);
  } catch (err) { next(err); }
};

export const listPublicTrainers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '12', sort = 'newest', q } = req.query as {
      page?: string;
      limit?: string;
      sort?: 'newest' | 'rating';
      q?: string;
    };

    const parsedPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const parsedLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 12));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter: Record<string, unknown> = { reviewStatus: 'APPROVED', validatedByAdmin: true };
    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { certification: regex },
        { specialties: regex },
      ];
    }

    const sortOption: Record<string, 1 | -1> = sort === 'rating' ? { rating: -1, createdAt: -1 } : { createdAt: -1 };

    const [items, total] = await Promise.all([
      TrainerProfile
        .find(filter)
        .populate('userId', 'username profile.firstName profile.lastName profile.avatarUrl')
        .sort(sortOption)
        .skip(skip)
        .limit(parsedLimit),
      TrainerProfile.countDocuments(filter),
    ]);

    res.json({ items, page: parsedPage, total, pages: Math.ceil(total / parsedLimit) });
  } catch (err) {
    next(err);
  }
};
