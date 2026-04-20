import express from 'express';
import { getPlayers, getLeagues, getPlayerById, getPlayerPriceHistory } from '../controllers/playerController.js';

const router = express.Router();

router.get("/", getPlayers);
router.get("/leagues", getLeagues);
router.get("/:id", getPlayerById);
router.get("/:id/history", getPlayerPriceHistory);

export default router;
