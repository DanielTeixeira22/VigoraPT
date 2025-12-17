import { Schema, model, Types, Model, HydratedDocument } from 'mongoose';

export interface Conversation {
  participants: Types.ObjectId[];
  clientId?: Types.ObjectId;
  trainerId?: Types.ObjectId;
  lastMessageAt?: Date;
  lastMessageText?: string;
  isArchivedBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type ConversationDocument = HydratedDocument<Conversation>;

const ConversationSchema = new Schema<Conversation>(
  {
    // 2 participantes: cliente e treinador (referenciam User)
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
      validate: [(arr) => Array.isArray(arr) && arr.length === 2, 'A conversa deve ter exatamente 2 participantes.'],
      index: true,
    },

    // Ajuda nas queries por pares cliente↔treinador
    clientId:  { type: Schema.Types.ObjectId, ref: 'ClientProfile',  index: true },
    trainerId: { type: Schema.Types.ObjectId, ref: 'TrainerProfile', index: true },

    // Última mensagem (para listagens)
    lastMessageAt:   { type: Date },
    lastMessageText: { type: String, trim: true },

    // Arquivo por utilizador (opcional)
    isArchivedBy: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
  },
  { timestamps: true }
);

// Um par clientId+trainerId deve ter uma única conversa (quando definidos)
ConversationSchema.index({ clientId: 1, trainerId: 1 }, { unique: true, sparse: true });

// Listagens recentes
ConversationSchema.index({ updatedAt: -1 });
ConversationSchema.index({ lastMessageAt: -1 });

const ConversationModel: Model<Conversation> = model<Conversation>('Conversation', ConversationSchema);

export default ConversationModel;
