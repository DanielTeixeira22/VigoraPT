"use strict";
/**
 * Model: Perfil de Cliente
 * Dados pessoais, objectivos e métricas corporais.
 * Ligado a um User e opcionalmente a um TrainerProfile.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// ============================================================================
// Schema
// ============================================================================
const ClientProfileSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true,
    },
    trainerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'TrainerProfile',
        default: null,
        index: true,
    },
    joinedAt: { type: Date, default: Date.now },
    goals: { type: String, trim: true },
    injuries: { type: String, trim: true },
    preferences: { type: String, trim: true },
    currentWeight: { type: Number, min: 0, max: 500 },
    currentMuscleMass: { type: Number, min: 0, max: 100 },
}, { timestamps: true });
// Index for listings.
ClientProfileSchema.index({ createdAt: -1 });
const ClientProfileModel = (0, mongoose_1.model)('ClientProfile', ClientProfileSchema);
exports.default = ClientProfileModel;
