"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ConversationSchema = new mongoose_1.Schema({
    // 2 participantes: cliente e treinador (referenciam User)
    participants: {
        type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }],
        validate: [(arr) => Array.isArray(arr) && arr.length === 2, 'A conversa deve ter exatamente 2 participantes.'],
        index: true,
    },
    // Ajuda nas queries por pares cliente↔treinador
    clientId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ClientProfile', index: true },
    trainerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'TrainerProfile', index: true },
    // Última mensagem (para listagens)
    lastMessageAt: { type: Date },
    lastMessageText: { type: String, trim: true },
    // Arquivo por utilizador (opcional)
    isArchivedBy: { type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }], default: [] },
}, { timestamps: true });
// Um par clientId+trainerId deve ter uma única conversa (quando definidos)
ConversationSchema.index({ clientId: 1, trainerId: 1 }, { unique: true, sparse: true });
// Listagens recentes
ConversationSchema.index({ updatedAt: -1 });
ConversationSchema.index({ lastMessageAt: -1 });
const ConversationModel = (0, mongoose_1.model)('Conversation', ConversationSchema);
exports.default = ConversationModel;
