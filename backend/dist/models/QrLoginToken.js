"use strict";
/**
 * Model: Token QR Login
 * Tokens para autenticação via QR code.
 * Fluxo: PENDING → APPROVED/REJECTED → consumido ou EXPIRED.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// ============================================================================
// Schema
// ============================================================================
const QrLoginTokenSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    code: { type: String, required: true, unique: true, index: true },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'],
        default: 'PENDING',
        index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true });
const QrLoginTokenModel = (0, mongoose_1.model)('QrLoginToken', QrLoginTokenSchema);
exports.default = QrLoginTokenModel;
