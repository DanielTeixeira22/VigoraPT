"use strict";
/**
 * Model: Perfil de Treinador
 * Dados profissionais e estado de validação do trainer.
 * Requer validação por admin para estar ativo.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// ============================================================================
// Schema
// ============================================================================
const TrainerProfileSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true,
    },
    certification: { type: String, trim: true },
    specialties: { type: [String], default: [], index: true },
    avatarUrl: { type: String },
    documentUrls: { type: [String], default: [] },
    validatedByAdmin: { type: Boolean, default: false, index: true },
    validatedAt: { type: Date },
    reviewStatus: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING',
        index: true,
    },
    rejectionReason: { type: String, trim: true },
    rejectedAt: { type: Date },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    hourlyRate: { type: Number, min: 0 },
}, { timestamps: true });
// Indexes for listings.
TrainerProfileSchema.index({ createdAt: -1 });
TrainerProfileSchema.index({ specialties: 1, rating: -1 });
// Preenche validatedAt automaticamente quando validado
TrainerProfileSchema.pre('save', function (next) {
    if (this.isModified('validatedByAdmin') && this.validatedByAdmin && !this.validatedAt) {
        this.validatedAt = new Date();
    }
    next();
});
const TrainerProfileModel = (0, mongoose_1.model)('TrainerProfile', TrainerProfileSchema);
exports.default = TrainerProfileModel;
