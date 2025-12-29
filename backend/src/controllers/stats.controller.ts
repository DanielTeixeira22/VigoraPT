import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import CompletionLog from '../models/CompletionLog';
import ClientProfile from '../models/ClientProfile';
import TrainerProfile from '../models/TrainerProfile';

const parseDate = (value?: string) => {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
};

// ------------------------------
// GENÉRICOS (com query params)
// ------------------------------

// GET /api/stats/completions/weekly?from=...&to=...&clientId=...&trainerId=...
export const completionsByWeek = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to, clientId, trainerId } = req.query as {
      from?: string;
      to?: string;
      clientId?: string;
      trainerId?: string;
    };

    const match: any = { status: 'DONE' };

    const fromDate = parseDate(from);
    const toDate = parseDate(to);

    if (fromDate || toDate) {
      match.date = {};
      if (fromDate) match.date.$gte = fromDate;
      if (toDate) match.date.$lte = toDate;
    }

    if (clientId) match.clientId = new Types.ObjectId(clientId);
    if (trainerId) match.trainerId = new Types.ObjectId(trainerId);

    const results = await CompletionLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: '$date' },
            week: { $isoWeek: '$date' },
          },
          totalCompletions: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          week: '$_id.week',
          totalCompletions: 1,
        },
      },
      { $sort: { year: 1, week: 1 } },
    ]);

    res.json(results);
  } catch (err) {
    next(err);
  }
};

// GET /api/stats/completions/monthly?from=...&to=...&clientId=...&trainerId=...
export const completionsByMonth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to, clientId, trainerId } = req.query as {
      from?: string;
      to?: string;
      clientId?: string;
      trainerId?: string;
    };

    const match: any = { status: 'DONE' };

    const fromDate = parseDate(from);
    const toDate = parseDate(to);

    if (fromDate || toDate) {
      match.date = {};
      if (fromDate) match.date.$gte = fromDate;
      if (toDate) match.date.$lte = toDate;
    }

    if (clientId) match.clientId = new Types.ObjectId(clientId);
    if (trainerId) match.trainerId = new Types.ObjectId(trainerId);

    const results = await CompletionLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          totalCompletions: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          totalCompletions: 1,
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]);

    res.json(results);
  } catch (err) {
    next(err);
  }
};

// ------------------------------
// VERSÕES /my (usa req.user)
// ------------------------------

// GET /api/stats/my/weekly
export const myCompletionsByWeek = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado.' });

    const match: any = { status: 'DONE' };

    if (req.user.role === 'CLIENT') {
      const client = await ClientProfile.findOne({ userId: req.user._id }).select('_id');
      if (!client) return res.json([]); // sem perfil → sem dados
      match.clientId = client._id;
    } else if (req.user.role === 'TRAINER') {
      const trainer = await TrainerProfile.findOne({ userId: req.user._id }).select('_id');
      if (!trainer) return res.json([]);
      match.trainerId = trainer._id;
    }
    // ADMIN → vê tudo (sem filtro extra)

    const results = await CompletionLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: '$date' },
            week: { $isoWeek: '$date' },
          },
          totalCompletions: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          week: '$_id.week',
          totalCompletions: 1,
        },
      },
      { $sort: { year: 1, week: 1 } },
    ]);

    res.json(results);
  } catch (err) {
    next(err);
  }
};

// GET /api/stats/my/monthly
export const myCompletionsByMonth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado.' });

    const match: any = { status: 'DONE' };

    if (req.user.role === 'CLIENT') {
      const client = await ClientProfile.findOne({ userId: req.user._id }).select('_id');
      if (!client) return res.json([]);
      match.clientId = client._id;
    } else if (req.user.role === 'TRAINER') {
      const trainer = await TrainerProfile.findOne({ userId: req.user._id }).select('_id');
      if (!trainer) return res.json([]);
      match.trainerId = trainer._id;
    }
    // ADMIN → vê tudo

    const results = await CompletionLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          totalCompletions: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          totalCompletions: 1,
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]);

    res.json(results);
  } catch (err) {
    next(err);
  }
};
