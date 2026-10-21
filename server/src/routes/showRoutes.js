import { Router } from 'express';
import { getShows, getShowById, createShow, updateShow, deleteShow } from '../controllers/showController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public
router.get('/', getShows);
router.get('/:id', getShowById);

// Admin-only
router.post('/', authenticate, requireAdmin, createShow);
router.patch('/:id', authenticate, requireAdmin, updateShow);
router.delete('/:id', authenticate, requireAdmin, deleteShow);

export default router;
