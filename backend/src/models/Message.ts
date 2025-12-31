/**
 * Model: Mensagem
 * Mensagens individuais dentro de uma conversa.
 * Atualiza automaticamente lastMessageAt na conversa.
 */

import { Schema, model, Types, Model, CallbackWithoutResultAndOptionalError, HydratedDocument } from 'mongoose';
import Conversation from './Conversation';

// ============================================================================
// Tipos
// ============================================================================

/** Message document. */
export interface Message {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  attachments: string[];
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageDocument = HydratedDocument<Message>;

// ============================================================================
// Schema
// ============================================================================

const MessageSchema = new Schema<Message>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: { type: String, required: true, trim: true },
    attachments: { type: [String], default: [] },
    readAt: { type: Date },
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

// Update conversation after saving message.
MessageSchema.post('save', async function docSaved(
  message: Message,
  next: CallbackWithoutResultAndOptionalError
) {
  try {
    await Conversation.findByIdAndUpdate(message.conversationId, {
      $set: {
        lastMessageAt: message.createdAt,
        lastMessageText: message.content?.slice(0, 200) || '',
      },
      $currentDate: { updatedAt: true },
    });
    next();
  } catch (err) {
    next(err as Error);
  }
});

const MessageModel: Model<Message> = model<Message>('Message', MessageSchema);

export default MessageModel;
