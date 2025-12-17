import { Schema, model, Types, Model, CallbackWithoutResultAndOptionalError, HydratedDocument } from 'mongoose';

export type TrainerChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface TrainerChangeRequest {
  clientId: Types.ObjectId;
  currentTrainerId?: Types.ObjectId;
  requestedTrainerId: Types.ObjectId;
  reason?: string;
  status: TrainerChangeStatus;
  decidedByAdminId?: Types.ObjectId;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TrainerChangeRequestDocument = HydratedDocument<TrainerChangeRequest>;

const TrainerChangeRequestSchema = new Schema<TrainerChangeRequest>(
  {
    clientId:           { type: Schema.Types.ObjectId, ref: 'ClientProfile', required: true, index: true },
    currentTrainerId:   { type: Schema.Types.ObjectId, ref: 'TrainerProfile' },
    requestedTrainerId: { type: Schema.Types.ObjectId, ref: 'TrainerProfile', required: true },
    reason:             { type: String, trim: true },
    status:             { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
    decidedByAdminId:   { type: Schema.Types.ObjectId, ref: 'User' },
    decidedAt:          { type: Date },
  },
  { timestamps: true }
);

// Índices para listagens/aprovação
TrainerChangeRequestSchema.index({ createdAt: -1 });
TrainerChangeRequestSchema.index({ clientId: 1, status: 1 });

// Valida que não se pede mudança para o mesmo trainer
TrainerChangeRequestSchema.pre('validate', function (this: TrainerChangeRequestDocument, next: CallbackWithoutResultAndOptionalError) {
  if (this.currentTrainerId && this.requestedTrainerId && this.currentTrainerId.equals(this.requestedTrainerId)) {
    return next(new Error('O treinador pedido é igual ao atual.'));
  }
  next();
});

// Quando o admin decide, preenche decidedAt (se ainda não existir)
TrainerChangeRequestSchema.pre('save', function (this: TrainerChangeRequestDocument, next: CallbackWithoutResultAndOptionalError) {
  const decided = this.status === 'APPROVED' || this.status === 'REJECTED';
  if (this.isModified('status') && decided && !this.decidedAt) {
    this.decidedAt = new Date();
  }
  next();
});

const TrainerChangeRequestModel: Model<TrainerChangeRequest> = model<TrainerChangeRequest>('TrainerChangeRequest', TrainerChangeRequestSchema);

export default TrainerChangeRequestModel;
