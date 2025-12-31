"use strict";
/**
 * Model: Pedido de Mudança de Treinador
 * Cliente solicita mudar para outro trainer.
 * Admin decide (APPROVED/REJECTED).
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// ============================================================================
// Schema
// ============================================================================
const TrainerChangeRequestSchema = new mongoose_1.Schema({
    clientId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'ClientProfile',
        required: true,
        index: true,
    },
    currentTrainerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'TrainerProfile' },
    requestedTrainerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'TrainerProfile',
        required: true,
    },
    reason: { type: String, trim: true },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING',
        index: true,
    },
    decidedByAdminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date },
}, { timestamps: true });
TrainerChangeRequestSchema.index({ createdAt: -1 });
TrainerChangeRequestSchema.index({ clientId: 1, status: 1 });
// Prevents requesting a change to the same trainer.
TrainerChangeRequestSchema.pre('validate', function (next) {
    if (this.currentTrainerId &&
        this.requestedTrainerId &&
        this.currentTrainerId.equals(this.requestedTrainerId)) {
        return next(new Error('O treinador pedido é igual ao atual.'));
    }
    next();
});
// Preenche decidedAt automaticamente
TrainerChangeRequestSchema.pre('save', function (next) {
    const decided = this.status === 'APPROVED' || this.status === 'REJECTED';
    if (this.isModified('status') && decided && !this.decidedAt) {
        this.decidedAt = new Date();
    }
    next();
});
const TrainerChangeRequestModel = (0, mongoose_1.model)('TrainerChangeRequest', TrainerChangeRequestSchema);
exports.default = TrainerChangeRequestModel;
