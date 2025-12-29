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
// GET /api/body-metrics - List my metrics history
router.get('/', bodyMetrics_controller_1.listMyMetrics);
// GET /api/body-metrics/current - Get current weight/muscle mass
router.get('/current', bodyMetrics_controller_1.getCurrentMetrics);
// POST /api/body-metrics - Record a new metric
router.post('/', bodyMetrics_controller_1.recordMetric);
exports.default = router;
