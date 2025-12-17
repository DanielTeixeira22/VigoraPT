import { Router } from 'express';
import { 
  getMe, 
  updateMe, 
  changeMyPassword,
  searchUsers, 
  toggleUserActive, 
  adminCreateUser,
  adminUpdateUser 
} from '../controllers/user.controller';

import auth from '../middleware/authMiddleware';
import requireRole from '../middleware/requireRole';

const router = Router();

router.use(auth);

// USER (próprio utilizador)
router.get('/me', getMe);
router.put('/me', updateMe);
router.patch('/me/password', changeMyPassword);

// ADMIN (gestão de utilizadores)
router.get('/', requireRole('ADMIN'), searchUsers);
router.post('/', requireRole('ADMIN'), adminCreateUser);
router.put('/:id', requireRole('ADMIN'), adminUpdateUser);
router.patch('/:id/toggle', requireRole('ADMIN'), toggleUserActive);

export default router;
