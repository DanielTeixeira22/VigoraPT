"use strict";
/**
 * Model: Registo de Conclusão
 * Regista se um treino foi realizado (DONE) ou falhado (MISSED).
 * Único por cliente+sessão+data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// ============================================================================
// Schema
// ============================================================================
const CompletionLogSchema = new mongoose_1.Schema({
    clientId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'ClientProfile',
        required: true,
        index: true,
    },
    trainerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'TrainerProfile',
        required: true,
        index: true,
    },
    planId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'TrainingPlan',
        required: true,
    },
    sessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'TrainingSession',
        required: true,
        index: true,
    },
    date: { type: Date, required: true, index: true },
    status: {
        type: String,
        enum: ['DONE', 'MISSED'],
        required: true,
        index: true,
    },
    reason: { type: String, trim: true },
    proofImage: { type: String },
}, { timestamps: true });
// Indexes for dashboards.
CompletionLogSchema.index({ clientId: 1, date: -1 });
CompletionLogSchema.index({ trainerId: 1, date: -1 });
CompletionLogSchema.index({ clientId: 1, sessionId: 1, date: 1 }, { unique: true });
// Limpa reason se DONE e normaliza data para UTC midnight
CompletionLogSchema.pre('save', function (next) {
    if (this.status === 'DONE') {
        this.reason = undefined;
    }
    if (this.date instanceof Date) {
        const d = new Date(this.date);
        d.setUTCHours(0, 0, 0, 0);
        this.date = d;
    }
    next();
});
const CompletionLogModel = (0, mongoose_1.model)('CompletionLog', CompletionLogSchema);
exports.default = CompletionLogModel;
