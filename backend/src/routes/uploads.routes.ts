    
import { Router } from 'express';
import { upload } from '../middleware/uploadMiddleware';
import auth from '../middleware/authMiddleware';
import { uploadSingle, listMyAssets, deleteAsset } from '../controllers/upload.controller';

const router = Router();

router.use(auth);

router.post('/', upload.single('file'), uploadSingle);
router.get('/', listMyAssets);
router.delete('/:id', deleteAsset);

export default router;
