"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const notification_controller_1 = require("../controllers/notification.controller");
const requireRole_1 = __importDefault(require("../middleware/requireRole"));
const router = (0, express_1.Router)();
router.use(authMiddleware_1.default);
// GET /api/notifications?onlyUnread=true
router.get('/', notification_controller_1.listMyNotifications);
// POST /api/notifications/:id/read
router.post('/:id/read', notification_controller_1.markNotificationRead);
// POST /api/notifications/alert
router.post('/alerts', (0, requireRole_1.default)('TRAINER'), notification_controller_1.sendAlertToClient);
exports.default = router;
