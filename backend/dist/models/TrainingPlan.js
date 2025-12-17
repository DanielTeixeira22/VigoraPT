"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
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
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    frequencyPerWeek: {
        type: Number,
        enum: [3, 4, 5], // Requisito do PDF: plano com 3, 4 ou 5 dias por semana
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
    },
}, { timestamps: true });
// Índices úteis para listagens
TrainingPlanSchema.index({ clientId: 1, createdAt: -1 });
TrainingPlanSchema.index({ trainerId: 1, createdAt: -1 });
const TrainingPlanModel = (0, mongoose_1.model)('TrainingPlan', TrainingPlanSchema);
exports.default = TrainingPlanModel;
