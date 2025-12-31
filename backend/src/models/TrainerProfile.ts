/**
 * Model: Perfil de Treinador
 * Dados profissionais e estado de validação do trainer.
 * Requer validação por admin para estar ativo.
 */

import { Schema, model, Types, Model, CallbackWithoutResultAndOptionalError, HydratedDocument } from 'mongoose';

// ============================================================================
// Tipos
// ============================================================================

/** Possible application states. */
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** TrainerProfile document. */
export interface TrainerProfile {
  userId: Types.ObjectId;
  certification?: string;
  specialties: string[];
  avatarUrl?: string;
  documentUrls: string[];
  validatedByAdmin: boolean;
  validatedAt?: Date;
  reviewStatus: ReviewStatus;
  rejectionReason?: string;
  rejectedAt?: Date;
  rating: number;
  hourlyRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TrainerProfileDocument = HydratedDocument<TrainerProfile>;

// ============================================================================
// Schema
// ============================================================================

const TrainerProfileSchema = new Schema<TrainerProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    certification: { type: String, trim: true },
    specialties: { type: [String], default: [], index: true },
    avatarUrl: { type: String },
    documentUrls: { type: [String], default: [] },
    validatedByAdmin: { type: Boolean, default: false, index: true },
    validatedAt: { type: Date },
    reviewStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    rejectionReason: { type: String, trim: true },
    rejectedAt: { type: Date },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    hourlyRate: { type: Number, min: 0 },
  },
  { timestamps: true }
);

// Indexes for listings.
TrainerProfileSchema.index({ createdAt: -1 });
TrainerProfileSchema.index({ specialties: 1, rating: -1 });

// Preenche validatedAt automaticamente quando validado
TrainerProfileSchema.pre('save', function (
  this: TrainerProfileDocument,
  next: CallbackWithoutResultAndOptionalError
) {
  if (this.isModified('validatedByAdmin') && this.validatedByAdmin && !this.validatedAt) {
    this.validatedAt = new Date();
  }
  next();
});

const TrainerProfileModel: Model<TrainerProfile> = model<TrainerProfile>(
  'TrainerProfile',
  TrainerProfileSchema
);

export default TrainerProfileModel;
