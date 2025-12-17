import { Router } from 'express';
import { start, approve, reject, poll } from '../controllers/qr.controller';
import auth from '../middleware/authMiddleware';

const router = Router();

router.post('/start', start);
router.post('/approve', auth, approve);
router.post('/reject', auth, reject);
router.get('/poll', poll);

export default router;
