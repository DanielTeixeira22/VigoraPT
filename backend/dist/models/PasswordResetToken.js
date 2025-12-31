"use strict";
/**
 * Model: PasswordResetToken
 * Armazena tokens temporários para recuperação de password.
 * Tokens expiram automaticamente após 1 hora (TTL index).
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// ============================================================================
// Schema
// ============================================================================
const PasswordResetTokenSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
// TTL index - MongoDB removes documents automatically when expiresAt is reached
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const PasswordResetTokenModel = (0, mongoose_1.model)('PasswordResetToken', PasswordResetTokenSchema);
exports.default = PasswordResetTokenModel;
