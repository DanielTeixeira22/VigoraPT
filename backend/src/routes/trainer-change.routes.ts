import { Router } from 'express';
import auth from '../middleware/authMiddleware';
import requireRole from '../middleware/requireRole';
import {
  createRequest,
  listRequests,
  decideRequest,
} from '../controllers/trainer-change.controller';

const router = Router();

// Client creates trainer change request.
router.post('/', auth, requireRole('CLIENT'), createRequest);

// Admin lists requests (can filter by status ?status=PENDING/APPROVED/REJECTED)
router.get('/', auth, requireRole('ADMIN'), listRequests);

// Admin decides a request
router.patch('/:id', auth, requireRole('ADMIN'), decideRequest);

export default router;
