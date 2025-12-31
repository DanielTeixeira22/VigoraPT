/**
 * Model: Token QR Login
 * Tokens para autenticação via QR code.
 * Fluxo: PENDING → APPROVED/REJECTED → consumido ou EXPIRED.
 */

import { Schema, model, Types, Model, HydratedDocument } from 'mongoose';

// ============================================================================
// Tipos
// ============================================================================

/** QR token states. */
export type QrLoginStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

/** QrLoginToken document. */
export interface QrLoginToken {
  userId?: Types.ObjectId;
  code: string;
  status: QrLoginStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type QrLoginTokenDocument = HydratedDocument<QrLoginToken>;

// ============================================================================
// Schema
// ============================================================================

const QrLoginTokenSchema = new Schema<QrLoginToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    code: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

const QrLoginTokenModel: Model<QrLoginToken> = model<QrLoginToken>(
  'QrLoginToken',
  QrLoginTokenSchema
);

export default QrLoginTokenModel;
