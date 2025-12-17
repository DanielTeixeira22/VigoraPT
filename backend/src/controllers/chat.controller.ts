import { Request, Response, NextFunction } from 'express';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import Notification from '../models/Notification';

const parseNumber = (value: unknown, fallback: number): number => {
  const n = Number.parseInt(typeof value === 'string' ? value : `${value ?? ''}`, 10);
  return Number.isNaN(n) ? fallback : n;
};

export const ensureConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clientId, trainerId, clientUserId, trainerUserId } = req.body as {
      clientId?: string;
      trainerId?: string;
      clientUserId?: string;
      trainerUserId?: string;
    };

    if (!clientId || !trainerId) {
      return res.status(400).json({ message: 'clientId e trainerId são obrigatórios.' });
    }

    let convo = await Conversation.findOne({ clientId, trainerId });
    if (!convo) {
      const participants = [clientUserId, trainerUserId].filter(Boolean);
      if (participants.length !== 2) {
        return res.status(400).json({ message: 'clientUserId e trainerUserId são obrigatórios.' });
      }
      convo = await Conversation.create({ clientId, trainerId, participants });
    }
    return res.json(convo);
  } catch (err) {
    next(err);
  }
};

export const listConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Autenticação requerida.' });
    const page = Math.max(1, parseNumber(req.query.page, 1));
    const limit = Math.min(50, Math.max(1, parseNumber(req.query.limit, 20)));
    const skip = (page - 1) * limit;

    const userId = req.user._id;
    const [items, total] = await Promise.all([
      Conversation.find({ participants: userId })
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Conversation.countDocuments({ participants: userId }),
    ]);

    res.json({ items, page, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

export const listMessages = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseNumber(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, parseNumber(req.query.limit, 30)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Message.find({ conversationId: id }).sort({ createdAt: 1 }).skip(skip).limit(limit),
      Message.countDocuments({ conversationId: id }),
    ]);

    res.json({ items, page, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Autenticação requerida.' });

    const { id } = req.params;
    const { content, attachments } = req.body as { content?: string; attachments?: string[] };
    if (!content || !content.trim()) return res.status(400).json({ message: 'Conteúdo é obrigatório.' });

    const msg = await Message.create({
      conversationId: id,
      senderId: req.user._id,
      content: content.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    // Notificar o outro participante da conversa
    const convo = await Conversation.findById(id).select('participants');
    if (convo) {
      const recipientId = convo.participants.find((p) => String(p) !== String(req.user!._id));
      if (recipientId) {
        await Notification.create({
          recipientId,
          type: 'NEW_MESSAGE',
          payload: { conversationId: id, senderId: req.user._id, preview: content.slice(0, 50) },
          isRead: false,
        });
      }
    }

    res.status(201).json(msg);
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const msg = await Message.findByIdAndUpdate(
      id,
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!msg) return res.status(404).json({ message: 'Mensagem não encontrada.' });
    res.json(msg);
  } catch (err) {
    next(err);
  }
};
