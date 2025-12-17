import { Router } from 'express';
import auth from '../middleware/authMiddleware';
import requireRole from '../middleware/requireRole';
import {
  createRequest,
  listRequests,
  decideRequest,
} from '../controllers/trainer-change.controller';

const router = Router();

// Cliente cria pedido de mudança de PT
router.post('/', auth, requireRole('CLIENT'), createRequest);

// Admin lista pedidos (pode filtrar por status ?status=PENDING/APPROVED/REJECTED)
router.get('/', auth, requireRole('ADMIN'), listRequests);

// Admin decide um pedido
router.patch('/:id', auth, requireRole('ADMIN'), decideRequest);

export default router;
