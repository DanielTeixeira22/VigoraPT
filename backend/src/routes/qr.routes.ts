import { Router } from 'express';
import { start, approve, reject, poll, generate, scanLogin } from '../controllers/qr.controller';
import auth from '../middleware/authMiddleware';

const router = Router();

router.post('/start', start);
router.post('/approve', auth, approve);
router.post('/reject', auth, reject);
router.get('/poll', poll);

// Novos endpoints para login via scan de QR Code
router.post('/generate', auth, generate);  // Gerar QR no perfil (requer auth)
router.post('/scan-login', scanLogin);     // Login via scan (público)

export default router;

