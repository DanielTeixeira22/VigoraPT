import { Router } from 'express';
import auth from '../middleware/authMiddleware';
import {
  listPlans,
  createPlan,
  getPlanById,
  updatePlan,
  deletePlan,
  listSessions,
  createSession,
  getSessionById,
  updateSession,
  deleteSession,
  listCompletion,
  upsertCompletion,
  deleteCompletion,
} from '../controllers/plan.controller';

const router = Router();

router.use(auth);

router.get('/plans', listPlans);
router.post('/plans', createPlan);
router.get('/plans/:id', getPlanById);
router.patch('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

router.get('/plans/:planId/sessions', listSessions);
router.post('/plans/:planId/sessions', createSession);
router.get('/sessions/:id', getSessionById);
router.patch('/sessions/:id', updateSession);
router.delete('/sessions/:id', deleteSession);

router.get('/completion', listCompletion);
router.post('/completion', upsertCompletion);
router.delete('/completion/:id', deleteCompletion);

export default router;
