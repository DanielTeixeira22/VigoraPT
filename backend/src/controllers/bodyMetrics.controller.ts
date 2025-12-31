/**
 * Body Metrics Controller
 * 
 * Handles body measurement tracking including:
 * - Recording weight and muscle mass
 * - Retrieving metric history
 * - Getting current metric values
 * 
 * @module controllers/bodyMetrics
 */

import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import BodyMetric from '../models/BodyMetric';
import ClientProfile from '../models/ClientProfile';

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Payload for recording a body metric */
interface RecordMetricPayload {
    weight?: number;
    muscleMass?: number;
    completionLogId?: string;
}

/** Current metrics response structure */
interface CurrentMetricsResponse {
    currentWeight: number | null;
    currentMuscleMass: number | null;
}

// ============================================================================
// Funcoes auxiliares
// ============================================================================

/**
 * Validates that the request has an authenticated user.
 * 
 * @param req - Express request object
 * @throws {HttpError} 401 if user is not authenticated
 */
const requireAuth = (req: Request): void => {
    if (!req.user) {
        throw createError(401, 'Autenticação requerida.');
    }
};

// ============================================================================
// Metric Endpoints
// ============================================================================

/**
 * Lists body metrics for the authenticated user.
 * 
 * @route GET /api/body-metrics
 * @access Private
 * 
 * @param req - Express request with optional limit query param
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {BodyMetric[]} Array of body metrics sorted by date
 * @throws {HttpError} 401 if not authenticated
 */
export const listMyMetrics = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        requireAuth(req);

        const limit = Number(req.query.limit) || 30;

        const metrics = await BodyMetric.find({ userId: req.user!._id })
            .sort({ recordedAt: -1 })
            .limit(limit);

        res.json(metrics);
    } catch (error) {
        next(error);
    }
};

/**
 * Records a new body metric measurement.
 * Updates current values in client profile.
 * 
 * @route POST /api/body-metrics
 * @access Private
 * 
 * @param req - Express request with metric data
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {BodyMetric} The created metric record
 * @throws {HttpError} 400 if no metric values provided
 * @throws {HttpError} 401 if not authenticated
 */
export const recordMetric = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        requireAuth(req);

        const { weight, muscleMass, completionLogId } = req.body as RecordMetricPayload;

        if (weight === undefined && muscleMass === undefined) {
            throw createError(400, 'Pelo menos peso ou massa muscular deve ser fornecido.');
        }

        // Create metric record
        const metric = await BodyMetric.create({
            userId: req.user!._id,
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
            { userId: req.user!._id },
            { $set: updateData }
        );

        res.status(201).json(metric);
    } catch (error) {
        next(error);
    }
};

/**
 * Gets current body metrics for the authenticated user.
 * 
 * @route GET /api/body-metrics/current
 * @access Private
 * 
 * @param req - Express request with authenticated user
 * @param res - Express response
 * @param next - Express next function
 * 
 * @returns {CurrentMetricsResponse} Current weight and muscle mass values
 * @throws {HttpError} 401 if not authenticated
 */
export const getCurrentMetrics = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        requireAuth(req);

        const clientProfile = await ClientProfile.findOne({ userId: req.user!._id })
            .select('currentWeight currentMuscleMass');

        if (!clientProfile) {
            res.json({ currentWeight: null, currentMuscleMass: null } as CurrentMetricsResponse);
            return;
        }

        res.json({
            currentWeight: clientProfile.currentWeight ?? null,
            currentMuscleMass: clientProfile.currentMuscleMass ?? null,
        } as CurrentMetricsResponse);
    } catch (error) {
        next(error);
    }
};
