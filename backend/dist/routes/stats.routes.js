"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const stats_controller_1 = require("../controllers/stats.controller");
const router = (0, express_1.Router)();
// Only authenticated users can view stats.
router.use(authMiddleware_1.default);
// Number of workouts completed per week.
router.get('/completions/weekly', stats_controller_1.completionsByWeek);
// Number of workouts completed per month.
router.get('/completions/monthly', stats_controller_1.completionsByMonth);
router.get('/my/weekly', stats_controller_1.myCompletionsByWeek);
router.get('/my/monthly', stats_controller_1.myCompletionsByMonth);
// Admin overview statistics
router.get('/admin/overview', stats_controller_1.adminOverview);
exports.default = router;
