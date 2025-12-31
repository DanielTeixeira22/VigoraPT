"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const trainer_controller_1 = require("../controllers/trainer.controller");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const requireRole_1 = __importDefault(require("../middleware/requireRole"));
const trainer_controller_2 = require("../controllers/trainer.controller");
const router = (0, express_1.Router)();
// Public route (listing).
router.get('/public', trainer_controller_2.listPublicTrainers);
router.use(authMiddleware_1.default);
router.get('/me', (0, requireRole_1.default)('TRAINER'), trainer_controller_1.getMyProfile);
router.put('/me', (0, requireRole_1.default)('TRAINER'), trainer_controller_1.updateMyProfile);
router.get('/', (0, requireRole_1.default)('ADMIN'), trainer_controller_1.listAll);
router.patch('/:id/validate', (0, requireRole_1.default)('ADMIN'), trainer_controller_1.validateTrainer);
router.patch('/:id/reject', (0, requireRole_1.default)('ADMIN'), trainer_controller_1.rejectTrainer);
router.patch('/:id', (0, requireRole_1.default)('ADMIN'), trainer_controller_1.adminUpdateTrainer);
exports.default = router;
