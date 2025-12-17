import { Schema, model, Types, Model, HydratedDocument } from 'mongoose';

export type NotificationType =
  | 'NEW_MESSAGE'
  | 'MISSED_WORKOUT'
  | 'WORKOUT_DONE'
  | 'NEW_PLAN'
  | 'NEW_CLIENT'
  | 'TRAINER_CHANGE_REQUEST'
  | 'TRAINER_CHANGE_DECIDED'
  | 'TRAINER_APPROVED'
  | 'TRAINER_REJECTED'
  | 'ALERT';

export interface Notification {
  recipientId: Types.ObjectId;
  type: NotificationType;
  payload?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;

const NotificationSchema = new Schema<Notification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'NEW_MESSAGE',
        'MISSED_WORKOUT',
        'WORKOUT_DONE',
        'NEW_PLAN',
        'NEW_CLIENT',
        'TRAINER_CHANGE_REQUEST',
        'TRAINER_CHANGE_DECIDED',
        'TRAINER_APPROVED',
        'TRAINER_REJECTED',
        'ALERT'
      ],
      required: true,
      index: true
    },
    payload: { type: Schema.Types.Mixed }, // dados mínimos p/ abrir o detalhe (ids, preview)
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, createdAt: -1 });

const NotificationModel: Model<Notification> = model<Notification>('Notification', NotificationSchema);

export default NotificationModel;
