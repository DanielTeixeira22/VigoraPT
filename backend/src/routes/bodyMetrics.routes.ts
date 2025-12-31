import { Router } from 'express';
import auth from '../middleware/authMiddleware';
import { listMyMetrics, recordMetric, getCurrentMetrics } from '../controllers/bodyMetrics.controller';

const router = Router();

router.use(auth);

// GET /api/body-metrics - List user metrics history.
router.get('/', listMyMetrics);

// GET /api/body-metrics/current - Obtem peso/massa muscular atual
router.get('/current', getCurrentMetrics);

// POST /api/body-metrics - Regista uma nova metrica
router.post('/', recordMetric);

export default router;
