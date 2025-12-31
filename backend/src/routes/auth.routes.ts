import { Router } from 'express';
import { register, login, refresh, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

// Allows multipart for trainer application (trainerDocument field).
router.post('/register', upload.single('trainerDocument'), register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
