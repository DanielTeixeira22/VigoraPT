"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const uploadMiddleware_1 = require("../middleware/uploadMiddleware");
const router = (0, express_1.Router)();
// permite multipart para candidatura a trainer (campo trainerDocument)
router.post('/register', uploadMiddleware_1.upload.single('trainerDocument'), auth_controller_1.register);
router.post('/login', auth_controller_1.login);
router.post('/refresh', auth_controller_1.refresh);
exports.default = router;
