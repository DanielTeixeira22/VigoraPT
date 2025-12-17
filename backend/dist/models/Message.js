"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const Conversation_1 = __importDefault(require("./Conversation"));
const MessageSchema = new mongoose_1.Schema({
    conversationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true,
    },
    senderId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
    },
    attachments: {
        type: [String], // URLs de ficheiros (opcional)
        default: [],
    },
    readAt: {
        type: Date, // preenchido quando o destinatário lê
    },
}, { timestamps: true });
// Ordenação eficiente por data dentro da conversa
MessageSchema.index({ conversationId: 1, createdAt: 1 });
// Após gravar uma mensagem, atualiza dados de listagem na conversa
MessageSchema.post('save', async function docSaved(message, next) {
    var _a;
    try {
        await Conversation_1.default.findByIdAndUpdate(message.conversationId, {
            $set: {
                lastMessageAt: message.createdAt,
                lastMessageText: ((_a = message.content) === null || _a === void 0 ? void 0 : _a.slice(0, 200)) || '',
            },
            $currentDate: { updatedAt: true },
        }, { new: false });
        next();
    }
    catch (err) {
        next(err);
    }
});
const MessageModel = (0, mongoose_1.model)('Message', MessageSchema);
exports.default = MessageModel;
