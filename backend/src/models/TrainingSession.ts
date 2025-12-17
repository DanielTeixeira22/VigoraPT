import { Schema, model, Types, Model, CallbackWithoutResultAndOptionalError, HydratedDocument } from 'mongoose';

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  notes?: string;
  mediaUrl?: string;
  _id?: Types.ObjectId;
}

export interface TrainingSession {
  planId: Types.ObjectId;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  order: number;
  notes?: string;
  exercises: Exercise[];
  createdAt: Date;
  updatedAt: Date;
}

// Subdocumento: Exercício dentro da sessão
const ExerciseSchema = new Schema<Exercise>(
  {
    name:     { type: String, required: true, trim: true },
    sets:     { type: Number, required: true, min: 1 },
    reps:     { type: Number, required: true, min: 1 },
    notes:    { type: String, trim: true },
    mediaUrl: { type: String }, // link para vídeo/guia do exercício
  },
  { _id: true }
);

export type TrainingSessionDocument = HydratedDocument<TrainingSession>;

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
      enum: [0, 1, 2, 3, 4, 5, 6], // 0=Domingo, 1=Segunda, ... 6=Sábado
      required: true,
      index: true,
    },
    order: {
      type: Number,
      default: 0, // útil para ordenar várias sessões no mesmo dia (se precisares)
    },
    notes: {
      type: String,
      trim: true,
    },
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

// Índices para consultas rápidas
TrainingSessionSchema.index({ planId: 1, dayOfWeek: 1 });
TrainingSessionSchema.index({ planId: 1, order: 1 });

// Sanitize simples (evita strings vazias desnecessárias)
TrainingSessionSchema.pre('save', function (this: TrainingSession, next: CallbackWithoutResultAndOptionalError) {
  if (typeof this.notes === 'string' && !this.notes.trim()) this.notes = undefined;
  if (Array.isArray(this.exercises)) {
    this.exercises = this.exercises.map((ex) => {
      if (typeof ex.notes === 'string' && !ex.notes.trim()) ex.notes = undefined;
      return ex;
    });
  }
  next();
});

const TrainingSessionModel: Model<TrainingSession> = model<TrainingSession>('TrainingSession', TrainingSessionSchema);

export default TrainingSessionModel;
