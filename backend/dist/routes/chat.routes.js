"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const chat_controller_1 = require("../controllers/chat.controller");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.default);
router.post('/conversations', chat_controller_1.ensureConversation);
router.get('/conversations', chat_controller_1.listConversations);
router.get('/conversations/:id/messages', chat_controller_1.listMessages);
router.post('/conversations/:id/messages', chat_controller_1.sendMessage);
router.post('/messages/:id/read', chat_controller_1.markAsRead);
exports.default = router;
