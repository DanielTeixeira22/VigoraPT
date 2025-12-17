import { Schema, model, Types, Model, HydratedDocument } from 'mongoose';

export type QrLoginStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface QrLoginToken {
  userId?: Types.ObjectId;
  code: string;
  status: QrLoginStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type QrLoginTokenDocument = HydratedDocument<QrLoginToken>;

const QrLoginTokenSchema = new Schema<QrLoginToken>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User' }, // fica definido quando aprovado
    code:      { type: String, required: true, unique: true, index: true }, // valor codificado no QR
    status:    { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'], default: 'PENDING', index: true },
    expiresAt: { type: Date, required: true, index: true }, // TTL via job/cron ou verificação lógica
  },
  { timestamps: true }
);

// (opcional) se quiseres TTL automático, usa um índice TTL separado numa coleção própria
// QrLoginTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const QrLoginTokenModel: Model<QrLoginToken> = model<QrLoginToken>('QrLoginToken', QrLoginTokenSchema);

export default QrLoginTokenModel;
