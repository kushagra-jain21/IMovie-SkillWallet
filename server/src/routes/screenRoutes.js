import { Router } from 'express';
import { getScreenById, updateScreen, deleteScreen } from '../controllers/screenController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/:id', getScreenById);
router.patch('/:id', authenticate, requireAdmin, updateScreen);
router.delete('/:id', authenticate, requireAdmin, deleteScreen);

export default router;
