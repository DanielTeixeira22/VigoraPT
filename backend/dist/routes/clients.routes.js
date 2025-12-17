"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_controller_1 = require("../controllers/client.controller");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const requireRole_1 = __importDefault(require("../middleware/requireRole"));
const client_controller_2 = require("../controllers/client.controller");
const client_controller_3 = require("../controllers/client.controller");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.default);
// CLIENTE
router.get('/me', (0, requireRole_1.default)('CLIENT'), client_controller_1.getMyProfile);
router.put('/me', (0, requireRole_1.default)('CLIENT'), client_controller_1.updateMyProfile);
// TRAINER
router.use((0, requireRole_1.default)('TRAINER'));
router.post('/', client_controller_2.trainerCreateClient);
router.get('/my', client_controller_3.listMyClients);
exports.default = router;
