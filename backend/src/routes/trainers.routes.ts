import { Router } from 'express';
import { getMyProfile, updateMyProfile, listAll, validateTrainer, adminUpdateTrainer, rejectTrainer } from '../controllers/trainer.controller';
import auth from '../middleware/authMiddleware';
import requireRole from '../middleware/requireRole';
import { listPublicTrainers } from '../controllers/trainer.controller';

const router = Router();

// Public route (listing).
router.get('/public', listPublicTrainers);

router.use(auth);

router.get('/me', requireRole('TRAINER'), getMyProfile);
router.put('/me', requireRole('TRAINER'), updateMyProfile);

router.get('/', requireRole('ADMIN'), listAll);
router.patch('/:id/validate', requireRole('ADMIN'), validateTrainer);
router.patch('/:id/reject', requireRole('ADMIN'), rejectTrainer);
router.patch('/:id', requireRole('ADMIN'), adminUpdateTrainer);

export default router;
