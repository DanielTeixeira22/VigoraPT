import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import TrainerChangeRequest from '../models/TrainerChangeRequest';
import ClientProfile from '../models/ClientProfile';
import TrainerProfile from '../models/TrainerProfile';
import User from '../models/User';
import Notification from '../models/Notification';

export const createRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw createError(401, 'Autenticação requerida.');

    const { requestedTrainerId, reason } = req.body as {
      requestedTrainerId?: string;
      reason?: string;
    };

    if (!requestedTrainerId) {
      return res.status(400).json({ message: 'requestedTrainerId é obrigatório.' });
    }

    // perfil de cliente deste user
    let clientProfile = await ClientProfile.findOne({ userId: req.user._id });
    if (!clientProfile) {
      clientProfile = await ClientProfile.create({ userId: req.user._id, trainerId: null });
    }

    // garante que o PT existe e está validado
    const trainer = await TrainerProfile.findById(requestedTrainerId).select('validatedByAdmin');
    if (!trainer || !trainer.validatedByAdmin) {
      return res.status(400).json({ message: 'Treinador inválido ou não validado.' });
    }

    // evita múltiplos pedidos pendentes
    const existing = await TrainerChangeRequest.findOne({
      clientId: clientProfile._id,
      status: 'PENDING',
    });
    if (existing) {
      return res.status(409).json({ message: 'Já existe um pedido pendente.' });
    }

    const doc = await TrainerChangeRequest.create({
      clientId: clientProfile._id,
      currentTrainerId: clientProfile.trainerId ?? undefined,
      requestedTrainerId,
      reason,
      status: 'PENDING',
    });

    // Notificar todos os admins
    const admins = await User.find({ role: 'ADMIN', isActive: true }).select('_id');
    if (admins.length) {
      await Notification.insertMany(
        admins.map((a) => ({
          recipientId: a._id,
          type: 'TRAINER_CHANGE_REQUEST',
          payload: { requestId: doc._id, clientId: clientProfile._id },
          isRead: false,
        }))
      );
    }

    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

export const listRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query as { status?: string };

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const items = await TrainerChangeRequest
      .find(filter)
      .populate({ path: 'clientId', populate: { path: 'userId', select: 'username email profile.firstName profile.lastName' } })
      .populate({ path: 'requestedTrainerId', populate: { path: 'userId', select: 'username email profile.firstName profile.lastName' } })
      .populate({ path: 'currentTrainerId', populate: { path: 'userId', select: 'username email profile.firstName profile.lastName' } })
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const decideRequest = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw createError(401, 'Autenticação requerida.');

    const { status } = req.body as { status?: 'APPROVED' | 'REJECTED' };

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'status deve ser APPROVED ou REJECTED.' });
    }

    const request = await TrainerChangeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Pedido não encontrado.' });

    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: 'Pedido já foi decidido.' });
    }

    request.status = status;
    request.decidedByAdminId = req.user._id;
    await request.save();

    // Buscar cliente para notificação
    const clientProfile = await ClientProfile.findById(request.clientId).select('userId');

    // se aprovado, atualiza o trainerId do ClientProfile
    if (status === 'APPROVED') {
      await ClientProfile.findByIdAndUpdate(request.clientId, { $set: { trainerId: request.requestedTrainerId } });
      // promove user do trainer para TRAINER se ainda não estiver
      const trainer = await TrainerProfile.findById(request.requestedTrainerId).select('userId');
      if (trainer?.userId) {
        await User.findByIdAndUpdate(trainer.userId, { $set: { role: 'TRAINER' } });

        // Notificar novo trainer sobre novo cliente
        await Notification.create({
          recipientId: trainer.userId,
          type: 'NEW_CLIENT',
          payload: { clientId: request.clientId, requestId: request._id },
          isRead: false,
        });
      }
    }

    // Notificar cliente sobre decisão
    if (clientProfile?.userId) {
      await Notification.create({
        recipientId: clientProfile.userId,
        type: 'TRAINER_CHANGE_DECIDED',
        payload: { status, requestId: request._id },
        isRead: false,
      });
    }

    res.json(request);
  } catch (err) {
    next(err);
  }
};
