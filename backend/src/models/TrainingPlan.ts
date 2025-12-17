import { Schema, model, Types, Model, HydratedDocument } from 'mongoose';

export interface TrainingPlan {
  clientId: Types.ObjectId;
  trainerId: Types.ObjectId;
  title: string;
  description?: string;
  frequencyPerWeek: 3 | 4 | 5;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TrainingPlanDocument = HydratedDocument<TrainingPlan>;

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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    frequencyPerWeek: {
      type: Number,
      enum: [3, 4, 5], // Requisito do PDF: plano com 3, 4 ou 5 dias por semana
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Índices úteis para listagens
TrainingPlanSchema.index({ clientId: 1, createdAt: -1 });
TrainingPlanSchema.index({ trainerId: 1, createdAt: -1 });

const TrainingPlanModel: Model<TrainingPlan> = model<TrainingPlan>('TrainingPlan', TrainingPlanSchema);

export default TrainingPlanModel;
