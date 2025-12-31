/**
 * Model: Sessão de Treino
 * Representa um dia de treino dentro de um plano.
 * Contém lista de exercícios (máx 10 por sessão).
 */

import { Schema, model, Types, Model, CallbackWithoutResultAndOptionalError, HydratedDocument } from 'mongoose';

// ============================================================================
// Tipos
// ============================================================================

/** Day of week (0=Sun, 1=Mon, ..., 6=Sat). */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Exercise within a session. */
export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  notes?: string;
  mediaUrl?: string;
  _id?: Types.ObjectId;
}

/** TrainingSession document. */
export interface TrainingSession {
  planId: Types.ObjectId;
  dayOfWeek: DayOfWeek;
  order: number;
  notes?: string;
  exercises: Exercise[];
  createdAt: Date;
  updatedAt: Date;
}

export type TrainingSessionDocument = HydratedDocument<TrainingSession>;

// ============================================================================
// Schemas
// ============================================================================

const ExerciseSchema = new Schema<Exercise>(
  {
    name: { type: String, required: true, trim: true },
    sets: { type: Number, required: true, min: 1 },
    reps: { type: Number, required: true, min: 1 },
    notes: { type: String, trim: true },
    mediaUrl: { type: String },
  },
  { _id: true }
);

const TrainingSessionSchema = new Schema<TrainingSession>(
  {
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'TrainingPlan',
      required: true,
      index: true,
    },
    dayOfWeek: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6],
      required: true,
      index: true,
    },
    order: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    exercises: {
      type: [ExerciseSchema],
      default: [],
      validate: [
        (arr: Exercise[]) => Array.isArray(arr) && arr.length <= 10,
        'Máximo de 10 exercícios por sessão.',
      ],
    },
  },
  { timestamps: true }
);

// Indexes.
TrainingSessionSchema.index({ planId: 1, dayOfWeek: 1 });
TrainingSessionSchema.index({ planId: 1, order: 1 });

// Remove strings vazias antes de guardar
TrainingSessionSchema.pre('save', function (
  this: TrainingSession,
  next: CallbackWithoutResultAndOptionalError
) {
  if (typeof this.notes === 'string' && !this.notes.trim()) {
    this.notes = undefined;
  }
  if (Array.isArray(this.exercises)) {
    this.exercises = this.exercises.map((ex) => {
      if (typeof ex.notes === 'string' && !ex.notes.trim()) {
        ex.notes = undefined;
      }
      return ex;
    });
  }
  next();
});

const TrainingSessionModel: Model<TrainingSession> = model<TrainingSession>(
  'TrainingSession',
  TrainingSessionSchema
);

export default TrainingSessionModel;
