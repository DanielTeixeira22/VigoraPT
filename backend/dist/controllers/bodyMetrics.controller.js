"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentMetrics = exports.recordMetric = exports.listMyMetrics = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const BodyMetric_1 = __importDefault(require("../models/BodyMetric"));
const ClientProfile_1 = __importDefault(require("../models/ClientProfile"));
// ============================================================================
// Funcoes auxiliares
// ============================================================================
/**
 * Validates that the request has an authenticated user.
 *
 * @param req - Express request object
 * @throws {HttpError} 401 if user is not authenticated
 */
const requireAuth = (req) => {
    if (!req.user) {
        throw (0, http_errors_1.default)(401, 'Autenticação requerida.');
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
const listMyMetrics = async (req, res, next) => {
    try {
        requireAuth(req);
        const limit = Number(req.query.limit) || 30;
        const metrics = await BodyMetric_1.default.find({ userId: req.user._id })
            .sort({ recordedAt: -1 })
            .limit(limit);
        res.json(metrics);
    }
    catch (error) {
        next(error);
    }
};
exports.listMyMetrics = listMyMetrics;
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
const recordMetric = async (req, res, next) => {
    try {
        requireAuth(req);
        const { weight, muscleMass, completionLogId } = req.body;
        if (weight === undefined && muscleMass === undefined) {
            throw (0, http_errors_1.default)(400, 'Pelo menos peso ou massa muscular deve ser fornecido.');
        }
        // Create metric record
        const metric = await BodyMetric_1.default.create({
            userId: req.user._id,
            weight,
            muscleMass,
            completionLogId: completionLogId || undefined,
            recordedAt: new Date(),
        });
        // Update current values in ClientProfile
        const updateData = {};
        if (weight !== undefined)
            updateData.currentWeight = weight;
        if (muscleMass !== undefined)
            updateData.currentMuscleMass = muscleMass;
        await ClientProfile_1.default.findOneAndUpdate({ userId: req.user._id }, { $set: updateData });
        res.status(201).json(metric);
    }
    catch (error) {
        next(error);
    }
};
exports.recordMetric = recordMetric;
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
const getCurrentMetrics = async (req, res, next) => {
    var _a, _b;
    try {
        requireAuth(req);
        const clientProfile = await ClientProfile_1.default.findOne({ userId: req.user._id })
            .select('currentWeight currentMuscleMass');
        if (!clientProfile) {
            res.json({ currentWeight: null, currentMuscleMass: null });
            return;
        }
        res.json({
            currentWeight: (_a = clientProfile.currentWeight) !== null && _a !== void 0 ? _a : null,
            currentMuscleMass: (_b = clientProfile.currentMuscleMass) !== null && _b !== void 0 ? _b : null,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getCurrentMetrics = getCurrentMetrics;
