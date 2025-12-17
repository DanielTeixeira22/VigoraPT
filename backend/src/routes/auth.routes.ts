import { Router } from 'express';
import { register, login, refresh } from '../controllers/auth.controller';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

// permite multipart para candidatura a trainer (campo trainerDocument)
router.post('/register', upload.single('trainerDocument'), register);
router.post('/login', login);
router.post('/refresh', refresh);

export default router;
