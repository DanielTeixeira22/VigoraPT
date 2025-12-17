"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const NotificationSchema = new mongoose_1.Schema({
    recipientId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
    payload: { type: mongoose_1.Schema.Types.Mixed }, // dados mínimos p/ abrir o detalhe (ids, preview)
    isRead: { type: Boolean, default: false, index: true },
}, { timestamps: true });
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
const NotificationModel = (0, mongoose_1.model)('Notification', NotificationSchema);
exports.default = NotificationModel;
