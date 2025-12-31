"use strict";
/**
 * Middleware de Upload de Ficheiros
 * Configura multer para guardar ficheiros na pasta uploads/.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = exports.UPLOAD_DIR = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/** Uploads directory (project root). */
exports.UPLOAD_DIR = path_1.default.join(process.cwd(), 'uploads');
// Create directory if it does not exist.
if (!fs_1.default.existsSync(exports.UPLOAD_DIR)) {
    fs_1.default.mkdirSync(exports.UPLOAD_DIR, { recursive: true });
}
/** Maximum file size: 10MB. */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/**
 * Configuração de armazenamento em disco.
 * Ficheiros são renomeados com timestamp para evitar conflitos.
 */
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, exports.UPLOAD_DIR),
    filename: (_req, file, cb) => {
        // Remove spaces from the original name.
        const safeName = file.originalname.replace(/\s+/g, '_');
        cb(null, `${Date.now()}-${safeName}`);
    },
});
/**
 * Instância multer configurada.
 * Por defeito aceita todos os tipos de ficheiro.
 */
exports.upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, _file, cb) => {
        // Add restrictions here if needed (e.g., images only).
        cb(null, true);
    },
});
exports.default = exports.upload;
