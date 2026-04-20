import express from 'express';
import { getTeamMarket, getTeamById, getTeamHistory } from '../controllers/teamMarketController.js';

const router = express.Router();

router.get("/market", getTeamMarket);
router.get("/:id", getTeamById);
router.get("/:id/history", getTeamHistory);

export default router;
