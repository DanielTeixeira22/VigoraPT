import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import User, { UserDocument, UserRole } from '../models/User';
import TrainerProfile from '../models/TrainerProfile';
import ClientProfile from '../models/ClientProfile';
import Notification from '../models/Notification';
import { signAccess, signRefresh, verifyRefresh } from '../utils/jwt';
import path from 'path';

const sanitizeUser = (user: UserDocument) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  profile: user.profile,
});

interface RegisterBody {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  wantsTrainer?: boolean;
  trainerCertification?: string;
  trainerSpecialties?: string;
  trainerHourlyRate?: string;
}

interface LoginBody {
  emailOrUsername: string;
  password: string;
}

interface RefreshBody {
  refreshToken: string;
}


export const register = async (req: Request<unknown, unknown, RegisterBody>, res: Response, next: NextFunction) => {
  try {
    const { username, email, password, firstName, lastName, trainerCertification, trainerSpecialties, trainerHourlyRate } = req.body as RegisterBody;
    const wantsTrainer = Boolean((req.body as RegisterBody).wantsTrainer);

    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'Campos obrigatórios: username, email, password, firstName, lastName.' });
    }

    // email deve ser normalizado
    const normalizedEmail = email.toLowerCase();

    // força CLIENT no registo; candidatura a trainer fica pendente até aprovação
    const normalizedRole: UserRole = 'CLIENT';

    const exists = await User.findOne({
      $or: [{ email: normalizedEmail }, { username }]
    });
    if (exists) return res.status(409).json({ message: 'Email ou username já existe.' });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      username,
      email: normalizedEmail,
      passwordHash,
      role: normalizedRole,
      profile: { firstName, lastName },
      isActive: true,
    });

    // cria perfil de cliente por omissão (necessário para pedidos e stats)
    await ClientProfile.findOneAndUpdate(
      { userId: user._id },
      { $setOnInsert: { userId: user._id } },
      { upsert: true, new: true }
    );

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    // Se pediu ser trainer, cria perfil pendente e notifica admins
    if (wantsTrainer) {
      const doc = req.file;
      const base = `${req.protocol}://${req.get('host')}`;
      const docUrl = doc ? `${base}/uploads/${path.basename(doc.filename)}` : undefined;
      const specialtiesArr = (trainerSpecialties || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const hourly = trainerHourlyRate ? Number(trainerHourlyRate) : undefined;

      await TrainerProfile.create({
        userId: user._id,
        validatedByAdmin: false,
        reviewStatus: 'PENDING',
        certification: trainerCertification,
        specialties: specialtiesArr,
        documentUrls: docUrl ? [docUrl] : [],
        hourlyRate: hourly,
      });

      const admins = await User.find({ role: 'ADMIN', isActive: true }).select('_id');
      if (admins.length) {
        await Notification.insertMany(
          admins.map((a) => ({
            recipientId: a._id,
            type: 'ALERT',
            payload: {
              request: 'TRAINER_VALIDATION',
              userId: user._id,
              username: user.username,
              email: user.email,
            },
            isRead: false,
          }))
        );
      }
    }

    res.status(201).json({
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    });
  } catch (err) { next(err); }
};
  

export const login = async (req: Request<unknown, unknown, LoginBody>, res: Response, next: NextFunction) => {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: 'Campos obrigatórios: emailOrUsername e password.' });
    }

    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
    });
    if (!user) return res.status(401).json({ message: 'Credenciais inválidas.' });
    if (!user.isActive) return res.status(403).json({ message: 'Conta desativada.' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Credenciais inválidas.' });

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    res.json({
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    });
  } catch (err) { next(err); }
};

export const refresh = async (req: Request<unknown, unknown, RefreshBody>, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken é obrigatório.' });

    let payload;
    try {
      payload = verifyRefresh(refreshToken);
    } catch {
      return res.status(401).json({ message: 'Refresh token inválido ou expirado.' });
    }

    const user = await User.findById(payload.id);
    if (!user || !user.isActive) return res.status(401).json({ message: 'Utilizador inválido.' });

    const accessToken = signAccess(user);
    const newRefreshToken = signRefresh(user); // estratégia rotativa

    res.json({
      user: sanitizeUser(user),
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) { next(err); }
};
