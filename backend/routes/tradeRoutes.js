import express from 'express';
import { 
    placeOrder, cancelOrder, getDepthChart, marketBuy, marketSell, 
    teamMarketBuy, teamMarketSell, getPlayerTradeHistory, 
    getUserTradeHistory, getTradeConfig 
} from '../controllers/tradeController.js';
import { protectRoute } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/order', protectRoute, placeOrder);
router.delete('/order/:orderId', protectRoute, cancelOrder);
router.get('/book/:playerId', getDepthChart);
router.post('/market-buy', protectRoute, marketBuy);
router.post('/market-sell', protectRoute, marketSell);
router.post('/team-market-buy', protectRoute, teamMarketBuy);
router.post('/team-market-sell', protectRoute, teamMarketSell);
router.get('/history/:playerId', protectRoute, getPlayerTradeHistory);
router.get('/user/history', protectRoute, getUserTradeHistory);
router.get('/config', getTradeConfig);

export default router;
