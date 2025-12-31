/**
 * Model: Conversa
 * Chat entre cliente e treinador.
 * Sempre 2 participantes por conversa.
 */

import { Schema, model, Types, Model, HydratedDocument } from 'mongoose';

// ============================================================================
// Tipos
// ============================================================================

/** Conversation document. */
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

// ============================================================================
// Schema
// ============================================================================

const ConversationSchema = new Schema<Conversation>(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
      validate: [
        (arr: Types.ObjectId[]) => Array.isArray(arr) && arr.length === 2,
        'A conversa deve ter exatamente 2 participantes.',
      ],
      index: true,
    },
    clientId: { type: Schema.Types.ObjectId, ref: 'ClientProfile', index: true },
    trainerId: { type: Schema.Types.ObjectId, ref: 'TrainerProfile', index: true },
    lastMessageAt: { type: Date },
    lastMessageText: { type: String, trim: true },
    isArchivedBy: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
  },
  { timestamps: true }
);

// Unique client+trainer pair.
ConversationSchema.index({ clientId: 1, trainerId: 1 }, { unique: true, sparse: true });
ConversationSchema.index({ updatedAt: -1 });
ConversationSchema.index({ lastMessageAt: -1 });

const ConversationModel: Model<Conversation> = model<Conversation>(
  'Conversation',
  ConversationSchema
);

export default ConversationModel;
