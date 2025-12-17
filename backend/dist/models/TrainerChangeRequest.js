"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const TrainerChangeRequestSchema = new mongoose_1.Schema({
    clientId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ClientProfile', required: true, index: true },
    currentTrainerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'TrainerProfile' },
    requestedTrainerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'TrainerProfile', required: true },
    reason: { type: String, trim: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
    decidedByAdminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date },
}, { timestamps: true });
// Índices para listagens/aprovação
TrainerChangeRequestSchema.index({ createdAt: -1 });
TrainerChangeRequestSchema.index({ clientId: 1, status: 1 });
// Valida que não se pede mudança para o mesmo trainer
TrainerChangeRequestSchema.pre('validate', function (next) {
    if (this.currentTrainerId && this.requestedTrainerId && this.currentTrainerId.equals(this.requestedTrainerId)) {
        return next(new Error('O treinador pedido é igual ao atual.'));
    }
    next();
});
// Quando o admin decide, preenche decidedAt (se ainda não existir)
TrainerChangeRequestSchema.pre('save', function (next) {
    const decided = this.status === 'APPROVED' || this.status === 'REJECTED';
    if (this.isModified('status') && decided && !this.decidedAt) {
        this.decidedAt = new Date();
    }
    next();
});
const TrainerChangeRequestModel = (0, mongoose_1.model)('TrainerChangeRequest', TrainerChangeRequestSchema);
exports.default = TrainerChangeRequestModel;
