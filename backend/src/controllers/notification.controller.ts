import { Request, Response, NextFunction } from 'express';
import Notification from '../models/Notification';
import ClientProfile from '../models/ClientProfile';
import TrainerProfile from '../models/TrainerProfile';

export const listMyNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado.' });

    const { onlyUnread } = req.query as { onlyUnread?: string };

    const filter: any = { recipientId: req.user._id };
    if (onlyUnread === 'true') filter.isRead = false;

    const items = await Notification
      .find(filter)
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado.' });

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notificação não encontrada.' });
    }

    res.json(notification);
  } catch (err) {
    next(err);
  }
};

export const markAllNotificationsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado.' });

    const result = await Notification.updateMany(
      { recipientId: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ message: 'Todas as notificações foram marcadas como lidas.', modifiedCount: result.modifiedCount });
  } catch (err) {
    next(err);
  }
};

export const sendAlertToClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado.' });
    const { clientId, message } = req.body as { clientId?: string; message?: string };
    if (!clientId) return res.status(400).json({ message: 'clientId é obrigatório.' });

    // garantir que quem envia é treinador do cliente
    const trainerProfile = await TrainerProfile.findOne({ userId: req.user._id }).select('_id');
    if (!trainerProfile) return res.status(403).json({ message: 'Apenas treinadores podem enviar alertas.' });

    const client = await ClientProfile.findById(clientId).select('trainerId userId');
    if (!client) return res.status(404).json({ message: 'Cliente não encontrado.' });
    if (!client.trainerId || String(client.trainerId) !== String(trainerProfile._id)) {
      return res.status(403).json({ message: 'Cliente não está associado a este treinador.' });
    }

    const notification = await Notification.create({
      recipientId: client.userId,
      type: 'ALERT',
      payload: { message },
      isRead: false,
    });

    res.status(201).json(notification);
  } catch (err) {
    next(err);
  }
};
