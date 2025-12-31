/**
 * Model: PasswordResetToken
 * Armazena tokens temporários para recuperação de password.
 * Tokens expiram automaticamente após 1 hora (TTL index).
 */

import { Schema, model, Model, HydratedDocument, Types } from 'mongoose';

// ============================================================================
// Tipos
// ============================================================================

export interface PasswordResetToken {
    userId: Types.ObjectId;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
}

export type PasswordResetTokenDocument = HydratedDocument<PasswordResetToken>;

// ============================================================================
// Schema
// ============================================================================

const PasswordResetTokenSchema = new Schema<PasswordResetToken>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        tokenHash: { type: String, required: true },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL index - MongoDB removes documents automatically when expiresAt is reached
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordResetTokenModel: Model<PasswordResetToken> = model<PasswordResetToken>(
    'PasswordResetToken',
    PasswordResetTokenSchema
);

export default PasswordResetTokenModel;
