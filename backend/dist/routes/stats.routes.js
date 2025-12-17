"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const stats_controller_1 = require("../controllers/stats.controller");
const router = (0, express_1.Router)();
// só utilizadores autenticados podem ver stats
router.use(authMiddleware_1.default);
// nº de treinos concluídos por semana
router.get('/completions/weekly', stats_controller_1.completionsByWeek);
// nº de treinos concluídos por mês
router.get('/completions/monthly', stats_controller_1.completionsByMonth);
router.get('/my/weekly', stats_controller_1.myCompletionsByWeek);
router.get('/my/monthly', stats_controller_1.myCompletionsByMonth);
exports.default = router;
