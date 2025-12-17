"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = exports.UPLOAD_DIR = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// garante a pasta uploads/
exports.UPLOAD_DIR = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(exports.UPLOAD_DIR))
    fs_1.default.mkdirSync(exports.UPLOAD_DIR, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, exports.UPLOAD_DIR),
    filename: (_req, file, cb) => {
        // timestamp-nome-original (simplificado)
        const safe = file.originalname.replace(/\s+/g, '_');
        cb(null, `${Date.now()}-${safe}`);
    }
});
exports.upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, _file, cb) => {
        // aceita tudo por defeito; restringe se quiseres (ex.: apenas imagens)
        // if (!file.mimetype.startsWith('image/')) return cb(new Error('Apenas imagens.'));
        cb(null, true);
    }
});
exports.default = exports.upload;
