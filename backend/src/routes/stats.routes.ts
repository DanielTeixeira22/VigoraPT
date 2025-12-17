import { Router } from 'express';
import auth from '../middleware/authMiddleware';
import { completionsByWeek, completionsByMonth, myCompletionsByWeek, myCompletionsByMonth } from '../controllers/stats.controller';

const router = Router();

// só utilizadores autenticados podem ver stats
router.use(auth);

// nº de treinos concluídos por semana
router.get('/completions/weekly', completionsByWeek);

// nº de treinos concluídos por mês
router.get('/completions/monthly', completionsByMonth);

router.get('/my/weekly', myCompletionsByWeek);
router.get('/my/monthly', myCompletionsByMonth);

export default router;
