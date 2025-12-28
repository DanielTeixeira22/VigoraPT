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

/**
 * POST /auth/qr/generate
 * Gera um token QR para login (chamado na página de perfil por utilizador autenticado)
 * O token pode ser escaneado na página de login para fazer login automático
 */
export const generate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Autenticação requerida.' });

    // Invalidar tokens anteriores deste utilizador (apenas um ativo de cada vez)
    await QrLoginToken.updateMany(
      { userId: req.user._id, status: { $in: ['PENDING', 'APPROVED'] } },
      { status: 'EXPIRED' }
    );

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    await QrLoginToken.create({
      code,
      userId: req.user._id,
      expiresAt,
      status: 'APPROVED', // Já aprovado, pois foi o próprio utilizador que gerou
    });

    return res.status(201).json({
      token: code,
      expiresAt,
    });
  } catch (err) { next(err); }
};

/**
 * POST /auth/qr/scan-login
 * Login via token QR escaneado (chamado na página de login)
 * Recebe o token do QR Code e retorna credenciais de login
 */
export const scanLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body as { token?: string };
    if (!token) return res.status(400).json({ message: 'token é obrigatório.' });

    const qrToken = await QrLoginToken.findOne({ code: token });
    if (!qrToken) return res.status(404).json({ message: 'Token inválido.' });

    // Verificar expiração
    if (qrToken.expiresAt < new Date()) {
      qrToken.status = 'EXPIRED';
      await qrToken.save();
      return res.status(410).json({ message: 'Token expirado.' });
    }

    // Token deve estar 'APPROVED' (gerado pelo utilizador no perfil)
    if (qrToken.status !== 'APPROVED') {
      return res.status(400).json({ message: `Token em estado inválido: ${qrToken.status}` });
    }

    // Buscar utilizador
    const user = await User.findById(qrToken.userId);
    if (!user) {
      qrToken.status = 'EXPIRED';
      await qrToken.save();
      return res.status(410).json({ message: 'Utilizador não encontrado.' });
    }

    // Gerar tokens de autenticação
    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    // Eliminar o token QR (uso único)
    await QrLoginToken.deleteOne({ _id: qrToken._id });

    return res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile
      },
      accessToken,
      refreshToken,
    });
  } catch (err) { next(err); }
};

