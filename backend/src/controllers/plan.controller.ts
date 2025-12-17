import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import TrainingPlan from '../models/TrainingPlan';
import TrainingSession from '../models/TrainingSession';
import CompletionLog from '../models/CompletionLog';
import TrainerProfile from '../models/TrainerProfile';
import ClientProfile from '../models/ClientProfile';
import Notification from '../models/Notification';


const paginate = (
  req: Request,
  { max = 100, def = 20 }: { max?: number; def?: number } = {}
) => {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
  const limitRaw = Number.parseInt(String(req.query.limit ?? `${def}`), 10);
  const limit = Math.min(max, Math.max(1, limitRaw || def));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const ensureTrainerValidated = async (trainerId: string) => {
  const tp = await TrainerProfile.findById(trainerId).select('validatedByAdmin');
  if (!tp || !tp.validatedByAdmin) throw createError(403, 'Trainer não validado.');
};

// ---------------- PLANS ----------------

export const listPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = paginate(req);
    const q: Record<string, unknown> = {};
    const { clientId, trainerId } = req.query as { clientId?: string; trainerId?: string };
    if (clientId) q.clientId = clientId;
    if (trainerId) q.trainerId = trainerId;

    const [items, total] = await Promise.all([
      TrainingPlan.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit),
      TrainingPlan.countDocuments(q),
    ]);
    res.json({ items, page, total, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

export const createPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clientId, trainerId, title, description, frequencyPerWeek, startDate, endDate } = req.body as {
      clientId?: string;
      trainerId?: string;
      title?: string;
      description?: string;
      frequencyPerWeek?: number;
      startDate?: string;
      endDate?: string;
    };

    if (!clientId || !trainerId || !title || !frequencyPerWeek || !startDate) {
      return res.status(400).json({ message: 'Campos obrigatórios: clientId, trainerId, title, frequencyPerWeek, startDate.' });
    }
    await ensureTrainerValidated(trainerId);

    const client = await ClientProfile.findById(clientId).select('_id userId');
    if (!client) return res.status(404).json({ message: 'Cliente não encontrado.' });

    const plan = await TrainingPlan.create({
      clientId,
      trainerId,
      title,
      description,
      frequencyPerWeek,
      startDate,
      endDate,
    });

    // Notificar cliente sobre novo plano
    if (client.userId) {
      await Notification.create({
        recipientId: client.userId,
        type: 'NEW_PLAN',
        payload: { planId: plan._id, title: plan.title },
        isRead: false,
      });
    }

    res.status(201).json(plan);
  } catch (err) { next(err); }
};

export const getPlanById = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const plan = await TrainingPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Plano não encontrado.' });
    res.json(plan);
  } catch (err) { next(err); }
};

export const updatePlan = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const updates = { ...req.body };
    if ('trainerId' in updates && updates.trainerId) {
      await ensureTrainerValidated(String(updates.trainerId));
    }
    const plan = await TrainingPlan.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!plan) return res.status(404).json({ message: 'Plano não encontrado.' });
    res.json(plan);
  } catch (err) { next(err); }
};

export const deletePlan = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const plan = await TrainingPlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Plano não encontrado.' });
    await TrainingSession.deleteMany({ planId: plan._id });
    res.json({ message: 'Plano removido.' });
  } catch (err) { next(err); }
};

// ---------------- SESSIONS ----------------

export const listSessions = async (req: Request<{ planId: string }>, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.params;
    const q: Record<string, unknown> = { planId };
    const { dayOfWeek } = req.query as { dayOfWeek?: string };
    if (dayOfWeek) q.dayOfWeek = Number.parseInt(dayOfWeek, 10);
    const sessions = await TrainingSession.find(q).sort({ dayOfWeek: 1, order: 1, createdAt: 1 });
    res.json(sessions);
  } catch (err) { next(err); }
};

export const createSession = async (req: Request<{ planId: string }>, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.params;
    const { dayOfWeek, order = 0, notes, exercises = [] } = req.body as {
      dayOfWeek?: number;
      order?: number;
      notes?: string;
      exercises?: unknown[];
    };

    if (typeof dayOfWeek !== 'number') {
      return res.status(400).json({ message: 'dayOfWeek é obrigatório (0-6).' });
    }
    if (Array.isArray(exercises) && exercises.length > 10) {
      return res.status(400).json({ message: 'Máximo de 10 exercícios por sessão.' });
    }

    const session = await TrainingSession.create({ planId, dayOfWeek, order, notes, exercises });
    res.status(201).json(session);
  } catch (err) { next(err); }
};

export const getSessionById = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const s = await TrainingSession.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'Sessão não encontrada.' });
    res.json(s);
  } catch (err) { next(err); }
};

export const updateSession = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const updates = { ...req.body };
    if (Array.isArray(updates.exercises) && updates.exercises.length > 10) {
      return res.status(400).json({ message: 'Máximo de 10 exercícios por sessão.' });
    }
    const s = await TrainingSession.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!s) return res.status(404).json({ message: 'Sessão não encontrada.' });
    res.json(s);
  } catch (err) { next(err); }
};

export const deleteSession = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const s = await TrainingSession.findByIdAndDelete(req.params.id);
    if (!s) return res.status(404).json({ message: 'Sessão não encontrada.' });
    res.json({ message: 'Sessão removida.' });
  } catch (err) { next(err); }
};

// ---------------- COMPLETION LOGS ----------------

export const listCompletion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = paginate(req, { def: 30, max: 200 });
    const q: Record<string, unknown> = {};
    const { clientId, trainerId, status, from, to } = req.query as {
      clientId?: string;
      trainerId?: string;
      status?: string;
      from?: string;
      to?: string;
    };

    if (clientId) q.clientId = clientId;
    if (trainerId) q.trainerId = trainerId;
    if (status) q.status = status;

    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.$gte = new Date(from);
      if (to) dateFilter.$lt = new Date(to);
      q.date = dateFilter;
    }

    const [items, total] = await Promise.all([
      CompletionLog.find(q).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit),
      CompletionLog.countDocuments(q),
    ]);
    res.json({ items, page, total, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

export const upsertCompletion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clientId, trainerId, planId, sessionId, date, status, reason, proofImage } = req.body as {
      clientId?: string;
      trainerId?: string;
      planId?: string;
      sessionId?: string;
      date?: string;
      status?: 'DONE' | 'MISSED';
      reason?: string;
      proofImage?: string;
    };

    if (!clientId || !trainerId || !planId || !sessionId || !date || !status) {
      return res.status(400).json({ message: 'Campos obrigatórios: clientId, trainerId, planId, sessionId, date, status.' });
    }
    if (!['DONE', 'MISSED'].includes(status)) {
      return res.status(400).json({ message: 'status deve ser DONE ou MISSED.' });
    }

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    const update = {
      status,
      reason: status === 'MISSED' ? (reason || null) : undefined,
      proofImage: proofImage || undefined,
    };

    const doc = await CompletionLog.findOneAndUpdate(
      { clientId, sessionId, date: d, planId, trainerId },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Buscar userId do trainer para notificação
    const trainerProfile = await TrainerProfile.findById(trainerId).select('userId');
    if (trainerProfile?.userId) {
      if (status === 'MISSED') {
        await Notification.create({
          recipientId: trainerProfile.userId,
          type: 'MISSED_WORKOUT',
          payload: { clientId, planId, sessionId, date: d },
          isRead: false,
        });
      } else if (status === 'DONE') {
        await Notification.create({
          recipientId: trainerProfile.userId,
          type: 'WORKOUT_DONE',
          payload: { clientId, planId, sessionId, date: d },
          isRead: false,
        });
      }
    }

    res.status(201).json(doc);
  } catch (err) { next(err); }

};

export const deleteCompletion = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const ok = await CompletionLog.findByIdAndDelete(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Registo não encontrado.' });
    res.json({ message: 'Registo removido.' });
  } catch (err) { next(err); }
};
