import { Router } from 'express';
import auth from '../middleware/authMiddleware';
import { listMyMetrics, recordMetric, getCurrentMetrics } from '../controllers/bodyMetrics.controller';

const router = Router();

router.use(auth);

// GET /api/body-metrics - List my metrics history
router.get('/', listMyMetrics);

// GET /api/body-metrics/current - Get current weight/muscle mass
router.get('/current', getCurrentMetrics);

// POST /api/body-metrics - Record a new metric
router.post('/', recordMetric);

export default router;
