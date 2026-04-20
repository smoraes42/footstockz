import express from 'express';
import { getLeaderboard } from '../controllers/leaderboardController.js';
import { protectRoute } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protectRoute, getLeaderboard);


export default router;
