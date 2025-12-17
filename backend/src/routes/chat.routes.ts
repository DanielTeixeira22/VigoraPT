import { Router } from 'express';
import auth from '../middleware/authMiddleware';
import { ensureConversation, listConversations, listMessages, sendMessage, markAsRead } from '../controllers/chat.controller';

const router = Router();

router.use(auth);

router.post('/conversations', ensureConversation);
router.get('/conversations', listConversations);
router.get('/conversations/:id/messages', listMessages);
router.post('/conversations/:id/messages', sendMessage);
router.post('/messages/:id/read', markAsRead);

export default router;
