import express from 'express';
import { getPortfolio, getPortfolioHistory } from '../controllers/portfolioController.js';
import { protectRoute } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protectRoute, getPortfolio);
router.get('/history', protectRoute, getPortfolioHistory);

export default router;
