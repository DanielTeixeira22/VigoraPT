"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const requireRole_1 = __importDefault(require("../middleware/requireRole"));
const trainer_change_controller_1 = require("../controllers/trainer-change.controller");
const router = (0, express_1.Router)();
// Client creates trainer change request.
router.post('/', authMiddleware_1.default, (0, requireRole_1.default)('CLIENT'), trainer_change_controller_1.createRequest);
// Admin lists requests (can filter by status ?status=PENDING/APPROVED/REJECTED)
router.get('/', authMiddleware_1.default, (0, requireRole_1.default)('ADMIN'), trainer_change_controller_1.listRequests);
// Admin decides a request
router.patch('/:id', authMiddleware_1.default, (0, requireRole_1.default)('ADMIN'), trainer_change_controller_1.decideRequest);
exports.default = router;
