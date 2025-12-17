import multer from 'multer';
import path from 'path';
import fs from 'fs';

// garante a pasta uploads/
export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // timestamp-nome-original (simplificado)
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, _file, cb) => {
    // aceita tudo por defeito; restringe se quiseres (ex.: apenas imagens)
    // if (!file.mimetype.startsWith('image/')) return cb(new Error('Apenas imagens.'));
    cb(null, true);
  }
});

export default upload;
