"use strict";
/**
 * Model: Plano de Treino
 * Define um plano semanal para um cliente com frequência de 3-5 dias.
 * Criado por um trainer validado.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// ============================================================================
// Schema
// ============================================================================
const TrainingPlanSchema = new mongoose_1.Schema({
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
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    frequencyPerWeek: {
        type: Number,
        enum: [3, 4, 5],
        required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
}, { timestamps: true });
// Indexes for listings.
TrainingPlanSchema.index({ clientId: 1, createdAt: -1 });
TrainingPlanSchema.index({ trainerId: 1, createdAt: -1 });
const TrainingPlanModel = (0, mongoose_1.model)('TrainingPlan', TrainingPlanSchema);
exports.default = TrainingPlanModel;
