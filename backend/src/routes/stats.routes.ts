import { Router } from 'express';
import auth from '../middleware/authMiddleware';
import { completionsByWeek, completionsByMonth, myCompletionsByWeek, myCompletionsByMonth, adminOverview } from '../controllers/stats.controller';

const router = Router();

// Only authenticated users can view stats.
router.use(auth);

// Number of workouts completed per week.
router.get('/completions/weekly', completionsByWeek);

// Number of workouts completed per month.
router.get('/completions/monthly', completionsByMonth);

router.get('/my/weekly', myCompletionsByWeek);
router.get('/my/monthly', myCompletionsByMonth);

// Admin overview statistics
router.get('/admin/overview', adminOverview);

export default router;
