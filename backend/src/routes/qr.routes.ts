import { Router } from 'express';
import { start, approve, reject, poll, generate, scanLogin } from '../controllers/qr.controller';
import auth from '../middleware/authMiddleware';

const router = Router();

router.post('/start', start);
router.post('/approve', auth, approve);
router.post('/reject', auth, reject);
router.get('/poll', poll);

// New endpoints for QR scan login.
router.post('/generate', auth, generate);  // Generate QR in profile (requires auth)
router.post('/scan-login', scanLogin);     // Login via scan (public)

export default router;

