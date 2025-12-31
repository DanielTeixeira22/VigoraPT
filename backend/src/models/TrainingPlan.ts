/**
 * Model: Plano de Treino
 * Define um plano semanal para um cliente com frequência de 3-5 dias.
 * Criado por um trainer validado.
 */

import { Schema, model, Types, Model, HydratedDocument } from 'mongoose';

// ============================================================================
// Tipos
// ============================================================================

/** Allowed weekly frequency. */
export type WeeklyFrequency = 3 | 4 | 5;

/** TrainingPlan document. */
export interface TrainingPlan {
  clientId: Types.ObjectId;
  trainerId: Types.ObjectId;
  title: string;
  description?: string;
  frequencyPerWeek: WeeklyFrequency;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TrainingPlanDocument = HydratedDocument<TrainingPlan>;

// ============================================================================
// Schema
// ============================================================================

const TrainingPlanSchema = new Schema<TrainingPlan>(
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
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    frequencyPerWeek: {
      type: Number,
      enum: [3, 4, 5],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
  },
  { timestamps: true }
);

// Indexes for listings.
TrainingPlanSchema.index({ clientId: 1, createdAt: -1 });
TrainingPlanSchema.index({ trainerId: 1, createdAt: -1 });

const TrainingPlanModel: Model<TrainingPlan> = model<TrainingPlan>(
  'TrainingPlan',
  TrainingPlanSchema
);

export default TrainingPlanModel;
