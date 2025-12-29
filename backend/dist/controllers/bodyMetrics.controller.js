"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentMetrics = exports.recordMetric = exports.listMyMetrics = void 0;
const BodyMetric_1 = __importDefault(require("../models/BodyMetric"));
const ClientProfile_1 = __importDefault(require("../models/ClientProfile"));
// GET /api/body-metrics
const listMyMetrics = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Não autenticado.' });
        const { limit = 30 } = req.query;
        const metrics = await BodyMetric_1.default
            .find({ userId: req.user._id })
            .sort({ recordedAt: -1 })
            .limit(Number(limit));
        res.json(metrics);
    }
    catch (err) {
        next(err);
    }
};
exports.listMyMetrics = listMyMetrics;
// POST /api/body-metrics
const recordMetric = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Não autenticado.' });
        const { weight, muscleMass, completionLogId } = req.body;
        if (weight === undefined && muscleMass === undefined) {
            return res.status(400).json({ message: 'Pelo menos peso ou massa muscular deve ser fornecido.' });
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
    catch (err) {
        next(err);
    }
};
exports.recordMetric = recordMetric;
// GET /api/body-metrics/current
const getCurrentMetrics = async (req, res, next) => {
    var _a, _b;
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Não autenticado.' });
        const clientProfile = await ClientProfile_1.default.findOne({ userId: req.user._id })
            .select('currentWeight currentMuscleMass');
        if (!clientProfile) {
            return res.json({ currentWeight: null, currentMuscleMass: null });
        }
        res.json({
            currentWeight: (_a = clientProfile.currentWeight) !== null && _a !== void 0 ? _a : null,
            currentMuscleMass: (_b = clientProfile.currentMuscleMass) !== null && _b !== void 0 ? _b : null,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getCurrentMetrics = getCurrentMetrics;
