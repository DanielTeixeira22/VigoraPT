"use strict";
/**
 * Model: Métricas Corporais
 * Histórico de peso e massa muscular do utilizador.
 * Ligado opcionalmente a um CompletionLog.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// ============================================================================
// Schema
// ============================================================================
const BodyMetricSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    weight: { type: Number, min: 0, max: 500 },
    muscleMass: { type: Number, min: 0, max: 100 },
    completionLogId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'CompletionLog' },
    recordedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });
BodyMetricSchema.index({ userId: 1, recordedAt: -1 });
const BodyMetricModel = (0, mongoose_1.model)('BodyMetric', BodyMetricSchema);
exports.default = BodyMetricModel;
