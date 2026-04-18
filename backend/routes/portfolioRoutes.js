import express from 'express';
import pool from '../database/db1.js';
import { protectRoute } from './userRoutes.js';
import { CONFIG } from '../config.js';

const router = express.Router();

/**
 * Get standard portfolio (Balances & Positions)
 * GET /api/v1/portfolio
 */
router.get('/', protectRoute, async (req, res) => {
    try {
        const userId = req.user.id;

        const connection = await pool.getConnection();

        try {
            // Get Wallet Balance and Creation Date
            const [walletRows] = await connection.query('SELECT value, created_at FROM wallets WHERE user_id = ?', [userId]);
            const balance = walletRows.length > 0 ? parseFloat(walletRows[0].value) || 0 : 0;
            const createdAt = walletRows.length > 0 ? walletRows[0].created_at : null;

            // Get Held Player Stock Positions with 24h variation
            const [positionRows] = await connection.query(`
                SELECT 
                    p.id as player_id, 
                    p.full_name as player_name, 
                    pp.proportion as shares_owned, 
                    p.initial_price as current_price, 
                    'player' as type,
                    (
                        SELECT price 
                        FROM player_prices 
                        WHERE player_id = p.id AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
                        ORDER BY created_at ASC 
                        LIMIT 1
                    ) as price_24h_ago
                FROM player_positions pp
                JOIN players p ON pp.player_id = p.id
                WHERE pp.user_id = ? AND pp.proportion > 0
            `, [userId]);

            // Get Held Team Stock Positions
            const [teamPositionRows] = await connection.query(`
                SELECT 
                    t.id as team_id, 
                    t.name as player_name, 
                    tp.proportion as shares_owned, 
                    'team' as type
                FROM team_positions tp
                JOIN teams t ON tp.team_id = t.id
                WHERE tp.user_id = ? AND tp.proportion > 0
            `, [userId]);

            // For teams, we need to calculate the current aggregate price
            const teamPositionsWithPrice = await Promise.all(teamPositionRows.map(async (row) => {
                const [players] = await connection.query('SELECT initial_price FROM players WHERE team_id = ?', [row.team_id]);
                const currentPrice = players.reduce((sum, p) => sum + parseFloat(p.initial_price), 0);
                
                // For 24h variation of a team, we'd need historical team price snapshots. 
                // For now, let's use the current price as 24h ago if not tracked.
                return {
                    ...row,
                    current_price: currentPrice,
                    price_24h_ago: currentPrice 
                };
            }));

            const allPositions = [...positionRows, ...teamPositionsWithPrice];

            // Calculate variation percentage and continuous position value
            const k = CONFIG.PRICE_IMPACT_FACTOR;
            const holdingsWithVariation = allPositions.map(row => {
                const currentPrice = parseFloat(row.current_price) || 0;
                const oldPrice = parseFloat(row.price_24h_ago) || currentPrice; 
                const variation = oldPrice !== 0 ? ((currentPrice - oldPrice) / oldPrice) * 100 : 0;
                
                // Continuous Liquidation Value: V = (P0 / k) * (1 - e^(-kQ))
                const shares = parseFloat(row.shares_owned) || 0;
                const posValue = (currentPrice / k) * (1 - Math.exp(-k * shares));

                return {
                    ...row,
                    current_price: currentPrice,
                    shares_owned: shares,
                    position_value: parseFloat(posValue.toFixed(2)),
                    variation_24h: variation
                };
            });

            // Get Open Trades/Orders
            const [orderRows] = await connection.query(`
                SELECT o.id as order_id, p.full_name as player_name, o.type as trade_type, o.amount as target_price, o.proportion as quantity, o.created_at
                FROM orders o
                JOIN players p ON o.player_id = p.id
                WHERE o.user_id = ?
            `, [userId]);

            res.status(200).json({
                userId,
                walletBalance: balance,
                walletCreatedAt: createdAt,
                holdings: holdingsWithVariation,
                openOrders: orderRows
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ error: 'Failed to retrieve portfolio data.' });
    }
});

/**
 * Get portfolio history (Evolution Chart)
 * GET /api/v1/portfolio/history
 * Accepts an optional ?timeframe= (1D, 1W, 1M, YTD)
 */
router.get('/history', protectRoute, async (req, res) => {
    try {
        const userId = req.user.id;
        const { timeframe } = req.query; // Default to all if not provided

        const connection = await pool.getConnection();

        try {
            let timeFilterQuery = '';
            let queryParams = [userId];

            if (timeframe === '1D' || timeframe === 'D') {
                timeFilterQuery = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)';
            } else if (timeframe === '5D') {
                timeFilterQuery = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 5 DAY)';
            } else if (timeframe === '1W' || timeframe === 'W') {
                timeFilterQuery = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
            } else if (timeframe === '1M' || timeframe === 'M') {
                timeFilterQuery = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
            } else if (timeframe === '6M') {
                timeFilterQuery = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)';
            } else if (timeframe === 'YTD') {
                timeFilterQuery = 'AND created_at >= MAKEDATE(YEAR(NOW()), 1)';
            } else if (timeframe === '1Y' || timeframe === 'Y') {
                timeFilterQuery = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
            } else if (timeframe === '5Y') {
                timeFilterQuery = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 5 YEAR)';
            }

            const [historyRows] = await connection.query(`
                SELECT total_equity as value, created_at as time
                FROM portfolio_history
                WHERE user_id = ? ${timeFilterQuery}
                ORDER BY created_at ASC
            `, queryParams);

            // Append a live "now" sentinel
            const [walletRows] = await connection.query('SELECT value FROM wallets WHERE user_id = ?', [userId]);
            const walletValue = walletRows[0]?.value || 0;
            const [holdingsRows] = await connection.query(`
                SELECT pp.proportion as shares, p.initial_price as p0
                FROM player_positions pp
                JOIN players p ON pp.player_id = p.id
                WHERE pp.user_id = ? AND pp.proportion > 0
            `, [userId]);

            const [teamHoldingsRows] = await connection.query(`
                SELECT tp.proportion as shares, t.id as team_id
                FROM team_positions tp
                JOIN teams t ON tp.team_id = t.id
                WHERE tp.user_id = ? AND tp.proportion > 0
            `, [userId]);

            let holdingsValue = 0;
            const k = this?.PRICE_IMPACT_FACTOR || CONFIG.PRICE_IMPACT_FACTOR;
            
            holdingsRows.forEach(row => {
                const v = (row.p0 / k) * (1 - Math.exp(-k * row.shares));
                holdingsValue += v;
            });

            for (const row of teamHoldingsRows) {
                const [teamPlayers] = await connection.query('SELECT initial_price FROM players WHERE team_id = ?', [row.team_id]);
                const teamPriceSpot = teamPlayers.reduce((sum, p) => sum + p.initial_price, 0);
                const v = (teamPriceSpot / k) * (1 - Math.exp(-k * row.shares));
                holdingsValue += v;
            }

            const liveValue = walletValue + holdingsValue;

            const result = [
                ...historyRows,
                { value: liveValue, time: new Date().toISOString() }
            ];

            res.status(200).json(result);
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error fetching portfolio history:', error);
        res.status(500).json({ error: 'Failed to retrieve portfolio history.' });
    }
});

export default router;
