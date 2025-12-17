"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uploadMiddleware_1 = require("../middleware/uploadMiddleware");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const upload_controller_1 = require("../controllers/upload.controller");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.default);
router.post('/', uploadMiddleware_1.upload.single('file'), upload_controller_1.uploadSingle);
router.get('/', upload_controller_1.listMyAssets);
router.delete('/:id', upload_controller_1.deleteAsset);
exports.default = router;
