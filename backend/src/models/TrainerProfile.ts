import { Schema, model, Types, Model, CallbackWithoutResultAndOptionalError, HydratedDocument } from 'mongoose';

export interface TrainerProfile {
  userId: Types.ObjectId;
  certification?: string;
  specialties: string[];
  avatarUrl?: string;
  documentUrls: string[];
  validatedByAdmin: boolean;
  validatedAt?: Date;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  rejectedAt?: Date;
  rating: number;
  hourlyRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TrainerProfileDocument = HydratedDocument<TrainerProfile>;

const TrainerProfileSchema = new Schema<TrainerProfile>(
  {
    userId:           { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true }, //ref aponta para a collection Users
    certification:    { type: String, trim: true },
    specialties:      { type: [String], default: [], index: true }, // p/ filtros/pesquisa
    avatarUrl:        { type: String },          // foto do trainer
    documentUrls:     { type: [String], default: [] }, // certidões/ficheiros
    validatedByAdmin: { type: Boolean, default: false, index: true }, // admin valida
    validatedAt:      { type: Date },
    reviewStatus:     { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
    rejectionReason:  { type: String, trim: true },
    rejectedAt:       { type: Date },
    rating:           { type: Number, min: 0, max: 5, default: 0 },  // opcional p/ sort
    hourlyRate:       { type: Number, min: 0 },                      // opcional p/ filtros
  },
  { timestamps: true }
);

// Índices adicionais para listagens/sort
TrainerProfileSchema.index({ createdAt: -1 });
TrainerProfileSchema.index({ specialties: 1, rating: -1 });

// Preenche validatedAt quando for validado
TrainerProfileSchema.pre('save', function (this: TrainerProfileDocument, next: CallbackWithoutResultAndOptionalError) {
  if (this.isModified('validatedByAdmin') && this.validatedByAdmin && !this.validatedAt) {
    this.validatedAt = new Date();
  }
  next();
});

const TrainerProfileModel: Model<TrainerProfile> = model<TrainerProfile>('TrainerProfile', TrainerProfileSchema);

export default TrainerProfileModel;
