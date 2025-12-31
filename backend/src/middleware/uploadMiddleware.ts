/**
 * Middleware de Upload de Ficheiros
 * Configura multer para guardar ficheiros na pasta uploads/.
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';

/** Uploads directory (project root). */
export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Create directory if it does not exist.
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/** Maximum file size: 10MB. */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Configuração de armazenamento em disco.
 * Ficheiros são renomeados com timestamp para evitar conflitos.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
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
export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, _file, cb) => {
    // Add restrictions here if needed (e.g., images only).
    cb(null, true);
  },
});

export default upload;
