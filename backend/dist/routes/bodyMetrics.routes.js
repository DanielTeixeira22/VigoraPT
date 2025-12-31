"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const bodyMetrics_controller_1 = require("../controllers/bodyMetrics.controller");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.default);
// GET /api/body-metrics - List user metrics history.
router.get('/', bodyMetrics_controller_1.listMyMetrics);
// GET /api/body-metrics/current - Obtem peso/massa muscular atual
router.get('/current', bodyMetrics_controller_1.getCurrentMetrics);
// POST /api/body-metrics - Regista uma nova metrica
router.post('/', bodyMetrics_controller_1.recordMetric);
exports.default = router;
