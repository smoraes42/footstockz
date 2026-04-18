import express from 'express';
import tradeEngine from '../services/tradeEngine.js';
import pool from '../database/db1.js';
import { protectRoute } from './userRoutes.js';
import { CONFIG } from '../config.js';

const router = express.Router();

/**
 * Place a new trade order
 * POST /api/v2/trades/order
 * Body: { playerId, side, price, quantity, type }
 * side: 'Buy' | 'Sell'
 * type: 'GoodTillCancel' | 'FillAndKill' (Optional, defaults GTC)
 */
router.post('/order', protectRoute, async (req, res) => {
    try {
        const { playerId, side, price, quantity, type } = req.body;
        const userId = req.user.id;

        if (!userId || !playerId || !side || !price || !quantity) {
            return res.status(400).json({ error: 'Missing required order parameters.' });
        }

        const result = await tradeEngine.placeOrder(
            userId,
            playerId,
            side,
            parseFloat(price),
            parseFloat(quantity),
            type
        );

        res.status(201).json(result);
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(400).json({ error: error.message || 'Failed to place order.' });
    }
});

/**
 * Cancel an open order
 * DELETE /api/v2/trades/order/:orderId
 */
router.delete('/order/:orderId', protectRoute, async (req, res) => {
    try {
        const orderId = parseInt(req.params.orderId);
        const userId = req.user.id;

        if (!userId || isNaN(orderId)) {
            return res.status(400).json({ error: 'Missing userId or invalid orderId.' });
        }

        const result = await tradeEngine.cancelOrder(orderId, userId);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error canceling order:', error);
        res.status(400).json({ error: error.message || 'Failed to cancel order.' });
    }
});

/**
 * Get the current order book (depth chart) for a specific player
 * GET /api/v2/trades/book/:playerId
 */
router.get('/book/:playerId', (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);

        if (isNaN(playerId)) {
            return res.status(400).json({ error: 'Invalid playerId.' });
        }

        const depthChart = tradeEngine.getDepthChart(playerId);
        res.status(200).json(depthChart);
    } catch (error) {
        console.error('Error getting depth chart:', error);
        res.status(500).json({ error: 'Failed to retrieve order book.' });
    }
});

/**
 * Place a market buy order specifying total value in Euros or quantity
 * POST /api/v1/trades/market-buy
 * Body: { playerId, totalValue?, quantity? }
 */
router.post('/market-buy', protectRoute, async (req, res) => {
    try {
        const { playerId, totalValue, quantity, expectedPrice, maxSlippage } = req.body;
        const userId = req.user.id;

        if (!userId || !playerId || (!totalValue && !quantity)) {
            return res.status(400).json({ error: 'Missing required market buy parameters. Provide totalValue or quantity.' });
        }

        const slippageParams = expectedPrice ? { 
            expectedPrice: parseFloat(expectedPrice), 
            maxSlippage: maxSlippage ? parseFloat(maxSlippage) : CONFIG.DEFAULT_MAX_SLIPPAGE
        } : null;

        let result;
        if (totalValue !== undefined) {
            result = await tradeEngine.placeMarketBuyByValue(
                userId,
                parseInt(playerId),
                parseFloat(totalValue),
                slippageParams
            );
        } else {
            result = await tradeEngine.placeMarketBuyByQuantity(
                userId,
                parseInt(playerId),
                parseFloat(quantity),
                slippageParams
            );
        }

        res.status(201).json(result);
    } catch (error) {
        console.error('Error executing market buy:', error);
        res.status(400).json({ error: error.message || 'Failed to execute market buy.' });
    }
});

/**
 * Place a market sell order specifying quantity of shares or total value in Euros
 * POST /api/v1/trades/market-sell
 * Body: { playerId, quantity?, totalValue? }
 */
router.post('/market-sell', protectRoute, async (req, res) => {
    try {
        const { playerId, quantity, totalValue, expectedPrice, maxSlippage } = req.body;
        const userId = req.user.id;

        if (!userId || !playerId || (!quantity && !totalValue)) {
            return res.status(400).json({ error: 'Missing required market sell parameters. Provide quantity or totalValue.' });
        }

        const slippageParams = expectedPrice ? { 
            expectedPrice: parseFloat(expectedPrice), 
            maxSlippage: maxSlippage ? parseFloat(maxSlippage) : CONFIG.DEFAULT_MAX_SLIPPAGE
        } : null;

        let result;
        if (quantity !== undefined) {
            result = await tradeEngine.placeMarketSell(
                userId,
                parseInt(playerId),
                parseFloat(quantity),
                slippageParams
            );
        } else {
            result = await tradeEngine.placeMarketSellByValue(
                userId,
                parseInt(playerId),
                parseFloat(totalValue),
                slippageParams
            );
        }

        res.status(201).json(result);
    } catch (error) {
        console.error('Error executing market sell:', error);
        res.status(400).json({ error: error.message || 'Failed to execute market sell.' });
    }
});

/**
 * Place a market buy order for a whole team rostering fund.
 * POST /api/v1/trades/team-market-buy
 */
router.post('/team-market-buy', protectRoute, async (req, res) => {
    try {
        const { teamId, totalValue, expectedPrice, maxSlippage } = req.body;
        const userId = req.user.id;

        if (!userId || !teamId || !totalValue) {
            return res.status(400).json({ error: 'Missing teamId or totalValue.' });
        }

        const slippageParams = expectedPrice ? { 
            expectedPrice: parseFloat(expectedPrice), 
            maxSlippage: maxSlippage ? parseFloat(maxSlippage) : CONFIG.DEFAULT_MAX_SLIPPAGE
        } : null;

        const result = await tradeEngine.placeTeamMarketBuyByValue(
            userId,
            parseInt(teamId),
            parseFloat(totalValue),
            slippageParams
        );

        res.status(201).json(result);
    } catch (error) {
        console.error('Error executing team market buy:', error);
        res.status(400).json({ error: error.message || 'Failed to execute team buy.' });
    }
});

/**
 * Place a market sell order for a whole team rostering fund.
 * POST /api/v1/trades/team-market-sell
 */
router.post('/team-market-sell', protectRoute, async (req, res) => {
    try {
        const { teamId, quantity, expectedPrice, maxSlippage } = req.body;
        const userId = req.user.id;

        if (!userId || !teamId || !quantity) {
            return res.status(400).json({ error: 'Missing teamId or quantity.' });
        }

        const slippageParams = expectedPrice ? { 
            expectedPrice: parseFloat(expectedPrice), 
            maxSlippage: maxSlippage ? parseFloat(maxSlippage) : CONFIG.DEFAULT_MAX_SLIPPAGE
        } : null;

        const result = await tradeEngine.placeTeamMarketSell(
            userId,
            parseInt(teamId),
            parseFloat(quantity),
            slippageParams
        );

        res.status(201).json(result);
    } catch (error) {
        console.error('Error executing team market sell:', error);
        res.status(400).json({ error: error.message || 'Failed to execute team sell.' });
    }
});

/**
 * Get trade history for a specific player
 * GET /api/v1/trades/history/:playerId
 */
router.get('/history/:playerId', protectRoute, async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);
        if (isNaN(playerId)) return res.status(400).json({ error: 'Invalid playerId' });

        const [trades] = await pool.query(`
            SELECT t.*, u.username 
            FROM trades t
            JOIN users u ON t.user_id = u.id
            WHERE t.player_id = ?
            ORDER BY t.created_at DESC
            LIMIT 100
        `, [playerId]);

        res.status(200).json(trades);
    } catch (error) {
        console.error('Error fetching trade history:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * Get trade history for the currently authenticated user
 * GET /api/v1/trades/user/history
 */
router.get('/user/history', protectRoute, async (req, res) => {
    try {
        const userId = req.user.id;
        const [trades] = await pool.query(`
            SELECT t.*, p.full_name as player_name, tm.name as team_name
            FROM trades t
            LEFT JOIN players p ON t.player_id = p.id
            LEFT JOIN teams tm ON t.team_id = tm.id
            WHERE t.user_id = ?
            ORDER BY t.created_at DESC
            LIMIT 50
        `, [userId]);

        res.status(200).json(trades);
    } catch (error) {
        console.error('Error fetching user trade history:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * Get the current trading configuration (kFactor, maxSlippage, etc.)
 * GET /api/v1/trades/config
 */
router.get('/config', (req, res) => {
    res.status(200).json(CONFIG);
});

export default router;
