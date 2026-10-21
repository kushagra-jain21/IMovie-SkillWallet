import { Router } from 'express';
import { getTheatres, getTheatreById, createTheatre, updateTheatre, deleteTheatre } from '../controllers/theatreController.js';
import { getScreensByTheatre, createScreen } from '../controllers/screenController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public
router.get('/', getTheatres);
router.get('/:id', getTheatreById);
router.get('/:theatreId/screens', getScreensByTheatre);

// Admin-only
router.post('/', authenticate, requireAdmin, createTheatre);
router.patch('/:id', authenticate, requireAdmin, updateTheatre);
router.delete('/:id', authenticate, requireAdmin, deleteTheatre);
router.post('/:theatreId/screens', authenticate, requireAdmin, createScreen);

export default router;
