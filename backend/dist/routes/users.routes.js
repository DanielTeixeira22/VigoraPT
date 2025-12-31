"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const requireRole_1 = __importDefault(require("../middleware/requireRole"));
const router = (0, express_1.Router)();
router.use(authMiddleware_1.default);
// USER (self).
router.get('/me', user_controller_1.getMe);
router.put('/me', user_controller_1.updateMe);
router.patch('/me/password', user_controller_1.changeMyPassword);
// ADMIN (user management).
router.get('/', (0, requireRole_1.default)('ADMIN'), user_controller_1.searchUsers);
router.post('/', (0, requireRole_1.default)('ADMIN'), user_controller_1.adminCreateUser);
router.put('/:id', (0, requireRole_1.default)('ADMIN'), user_controller_1.adminUpdateUser);
router.patch('/:id/toggle', (0, requireRole_1.default)('ADMIN'), user_controller_1.toggleUserActive);
exports.default = router;
