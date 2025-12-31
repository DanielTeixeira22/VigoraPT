/**
 * Model: Registo de Conclusão
 * Regista se um treino foi realizado (DONE) ou falhado (MISSED).
 * Único por cliente+sessão+data.
 */

import { Schema, model, Types, Model, HydratedDocument } from 'mongoose';

// ============================================================================
// Tipos
// ============================================================================

/** Completion status. */
export type CompletionStatus = 'DONE' | 'MISSED';

/** CompletionLog document. */
export interface CompletionLog {
  clientId: Types.ObjectId;
  trainerId: Types.ObjectId;
  planId: Types.ObjectId;
  sessionId: Types.ObjectId;
  date: Date;
  status: CompletionStatus;
  reason?: string;
  proofImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CompletionLogDocument = HydratedDocument<CompletionLog>;

// ============================================================================
// Schema
// ============================================================================

const CompletionLogSchema = new Schema<CompletionLog>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'ClientProfile',
      required: true,
      index: true,
    },
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: 'TrainerProfile',
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'TrainingPlan',
      required: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'TrainingSession',
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['DONE', 'MISSED'],
      required: true,
      index: true,
    },
    reason: { type: String, trim: true },
    proofImage: { type: String },
  },
  { timestamps: true }
);

// Indexes for dashboards.
CompletionLogSchema.index({ clientId: 1, date: -1 });
CompletionLogSchema.index({ trainerId: 1, date: -1 });
CompletionLogSchema.index({ clientId: 1, sessionId: 1, date: 1 }, { unique: true });

// Limpa reason se DONE e normaliza data para UTC midnight
CompletionLogSchema.pre('save', function (this: CompletionLog, next) {
  if (this.status === 'DONE') {
    this.reason = undefined;
  }
  if (this.date instanceof Date) {
    const d = new Date(this.date);
    d.setUTCHours(0, 0, 0, 0);
    this.date = d;
  }
  next();
});

const CompletionLogModel: Model<CompletionLog> = model<CompletionLog>(
  'CompletionLog',
  CompletionLogSchema
);

export default CompletionLogModel;
