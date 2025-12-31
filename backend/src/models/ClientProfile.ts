/**
 * Model: Perfil de Cliente
 * Dados pessoais, objectivos e métricas corporais.
 * Ligado a um User e opcionalmente a um TrainerProfile.
 */

import { Schema, model, Types, Model, HydratedDocument } from 'mongoose';

// ============================================================================
// Tipos
// ============================================================================

/** ClientProfile document. */
export interface ClientProfile {
  userId: Types.ObjectId;
  trainerId?: Types.ObjectId | null;
  joinedAt: Date;
  goals?: string;
  injuries?: string;
  preferences?: string;
  currentWeight?: number;
  currentMuscleMass?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ClientProfileDocument = HydratedDocument<ClientProfile>;

// ============================================================================
// Schema
// ============================================================================

const ClientProfileSchema = new Schema<ClientProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: 'TrainerProfile',
      default: null,
      index: true,
    },
    joinedAt: { type: Date, default: Date.now },
    goals: { type: String, trim: true },
    injuries: { type: String, trim: true },
    preferences: { type: String, trim: true },
    currentWeight: { type: Number, min: 0, max: 500 },
    currentMuscleMass: { type: Number, min: 0, max: 100 },
  },
  { timestamps: true }
);

// Index for listings.
ClientProfileSchema.index({ createdAt: -1 });

const ClientProfileModel: Model<ClientProfile> = model<ClientProfile>(
  'ClientProfile',
  ClientProfileSchema
);

export default ClientProfileModel;
