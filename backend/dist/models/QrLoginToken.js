"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const QrLoginTokenSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }, // fica definido quando aprovado
    code: { type: String, required: true, unique: true, index: true }, // valor codificado no QR
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'], default: 'PENDING', index: true },
    expiresAt: { type: Date, required: true, index: true }, // TTL via job/cron ou verificação lógica
}, { timestamps: true });
// (opcional) se quiseres TTL automático, usa um índice TTL separado numa coleção própria
// QrLoginTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const QrLoginTokenModel = (0, mongoose_1.model)('QrLoginToken', QrLoginTokenSchema);
exports.default = QrLoginTokenModel;
