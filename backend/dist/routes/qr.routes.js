"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const qr_controller_1 = require("../controllers/qr.controller");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const router = (0, express_1.Router)();
router.post('/start', qr_controller_1.start);
router.post('/approve', authMiddleware_1.default, qr_controller_1.approve);
router.post('/reject', authMiddleware_1.default, qr_controller_1.reject);
router.get('/poll', qr_controller_1.poll);
exports.default = router;
