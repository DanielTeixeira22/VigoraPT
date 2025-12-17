import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import QrLoginToken from '../models/QrLoginToken';
import User from '../models/User';
import { signAccess, signRefresh } from '../utils/jwt';

const generateCode = () => crypto.randomBytes(20).toString('hex');

export const start = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await QrLoginToken.create({
      code,
      expiresAt,
      status: 'PENDING',
    });

    return res.status(201).json({
      code,
      expiresAt,
    });
  } catch (err) { next(err); }
};

export const approve = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Autenticação requerida.' });
    const { code } = req.body as { code?: string };
    if (!code) return res.status(400).json({ message: 'code é obrigatório.' });

    const token = await QrLoginToken.findOne({ code });
    if (!token) return res.status(404).json({ message: 'Código inválido.' });

    if (token.expiresAt < new Date()) {
      token.status = 'EXPIRED';
      await token.save();
      return res.status(410).json({ message: 'Código expirado.' });
    }
    if (token.status !== 'PENDING') {
      return res.status(400).json({ message: `Token já está em estado ${token.status}.` });
    }

    token.userId = req.user._id;
    token.status = 'APPROVED';
    await token.save();

    return res.json({ message: 'Aprovado com sucesso.' });
  } catch (err) { next(err); }
};

export const poll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.query as { code?: string };
    if (!code) return res.status(400).json({ message: 'code é obrigatório.' });

    const token = await QrLoginToken.findOne({ code });
    if (!token) return res.status(404).json({ message: 'Código inválido.' });

    if (token.expiresAt < new Date()) {
      if (token.status !== 'APPROVED') token.status = 'EXPIRED';
      await token.save();
      return res.status(410).json({ status: token.status, message: 'Código expirado.' });
    }

    if (token.status === 'PENDING') {
      return res.json({ status: 'PENDING' });
    }
    if (token.status === 'REJECTED') {
      return res.status(403).json({ status: 'REJECTED', message: 'Pedido rejeitado.' });
    }
    if (token.status === 'APPROVED') {
      const user = await User.findById(token.userId);
      if (!user) {
        token.status = 'EXPIRED';
        await token.save();
        return res.status(410).json({ status: 'EXPIRED', message: 'Utilizador já não existe.' });
      }

      const accessToken = signAccess(user);
      const refreshToken = signRefresh(user);

      await QrLoginToken.deleteOne({ _id: token._id });

      return res.json({
        status: 'APPROVED',
        user: { id: user._id, username: user.username, email: user.email, role: user.role, profile: user.profile },
        accessToken,
        refreshToken,
      });
    }

    return res.json({ status: token.status });
  } catch (err) { next(err); }
};

export const reject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code) return res.status(400).json({ message: 'code é obrigatório.' });

    const token = await QrLoginToken.findOne({ code });
    if (!token) return res.status(404).json({ message: 'Código inválido.' });

    token.status = 'REJECTED';
    await token.save();

    return res.json({ message: 'Pedido rejeitado.' });
  } catch (err) { next(err); }
};
