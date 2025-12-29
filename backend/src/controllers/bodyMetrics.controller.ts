import { Request, Response, NextFunction } from 'express';
import BodyMetric from '../models/BodyMetric';
import ClientProfile from '../models/ClientProfile';

// GET /api/body-metrics
export const listMyMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Não autenticado.' });

        const { limit = 30 } = req.query;

        const metrics = await BodyMetric
            .find({ userId: req.user._id })
            .sort({ recordedAt: -1 })
            .limit(Number(limit));

        res.json(metrics);
    } catch (err) {
        next(err);
    }
};

// POST /api/body-metrics
export const recordMetric = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Não autenticado.' });

        const { weight, muscleMass, completionLogId } = req.body as {
            weight?: number;
            muscleMass?: number;
            completionLogId?: string;
        };

        if (weight === undefined && muscleMass === undefined) {
            return res.status(400).json({ message: 'Pelo menos peso ou massa muscular deve ser fornecido.' });
        }

        // Create metric record
        const metric = await BodyMetric.create({
            userId: req.user._id,
            weight,
            muscleMass,
            completionLogId: completionLogId || undefined,
            recordedAt: new Date(),
        });

        // Update current values in ClientProfile
        const updateData: Record<string, number> = {};
        if (weight !== undefined) updateData.currentWeight = weight;
        if (muscleMass !== undefined) updateData.currentMuscleMass = muscleMass;

        await ClientProfile.findOneAndUpdate(
            { userId: req.user._id },
            { $set: updateData }
        );

        res.status(201).json(metric);
    } catch (err) {
        next(err);
    }
};

// GET /api/body-metrics/current
export const getCurrentMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Não autenticado.' });

        const clientProfile = await ClientProfile.findOne({ userId: req.user._id })
            .select('currentWeight currentMuscleMass');

        if (!clientProfile) {
            return res.json({ currentWeight: null, currentMuscleMass: null });
        }

        res.json({
            currentWeight: clientProfile.currentWeight ?? null,
            currentMuscleMass: clientProfile.currentMuscleMass ?? null,
        });
    } catch (err) {
        next(err);
    }
};
