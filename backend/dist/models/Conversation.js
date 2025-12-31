"use strict";
/**
 * Model: Conversa
 * Chat entre cliente e treinador.
 * Sempre 2 participantes por conversa.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// ============================================================================
// Schema
// ============================================================================
const ConversationSchema = new mongoose_1.Schema({
    participants: {
        type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }],
        validate: [
            (arr) => Array.isArray(arr) && arr.length === 2,
            'A conversa deve ter exatamente 2 participantes.',
        ],
        index: true,
    },
    clientId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ClientProfile', index: true },
    trainerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'TrainerProfile', index: true },
    lastMessageAt: { type: Date },
    lastMessageText: { type: String, trim: true },
    isArchivedBy: {
        type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
        default: [],
    },
}, { timestamps: true });
// Unique client+trainer pair.
ConversationSchema.index({ clientId: 1, trainerId: 1 }, { unique: true, sparse: true });
ConversationSchema.index({ updatedAt: -1 });
ConversationSchema.index({ lastMessageAt: -1 });
const ConversationModel = (0, mongoose_1.model)('Conversation', ConversationSchema);
exports.default = ConversationModel;
