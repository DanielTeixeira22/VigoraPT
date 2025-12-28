import { Router } from 'express';
import auth from '../middleware/authMiddleware';
import { listMyNotifications, markNotificationRead, markAllNotificationsRead, sendAlertToClient } from '../controllers/notification.controller';
import requireRole from '../middleware/requireRole';

const router = Router();

router.use(auth);

// GET /api/notifications?onlyUnread=true
router.get('/', listMyNotifications);

// POST /api/notifications/read-all (MUST be before /:id/read to match correctly)
router.post('/read-all', markAllNotificationsRead);

// POST /api/notifications/:id/read
router.post('/:id/read', markNotificationRead);

// POST /api/notifications/alert
router.post('/alerts', requireRole('TRAINER'), sendAlertToClient);

export default router;
