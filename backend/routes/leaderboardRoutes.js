import express from 'express';
import db from '../database/db1.js';
import { CONFIG } from '../config.js';

const router = express.Router();

/**
 * GET /api/v1/leaderboard
 * Returns top 50 users ranked by AMM-accurate portfolio value.
 * Uses the correct bonding-curve integral V = (P0/k) * (1 - e^(-kQ))
 * instead of the naive linear approximation (shares * price).
 */
router.get('/', async (req, res) => {
    try {
        const k = CONFIG.PRICE_IMPACT_FACTOR;

        // Fetch all users with their wallet balance
        const [users] = await db.query(`
            SELECT u.id, u.username, w.value as wallet_balance
            FROM users u
            JOIN wallets w ON u.id = w.user_id
        `);

        const results = await Promise.all(users.map(async (user) => {
            // Get current player positions
            const [positions] = await db.query(`
                SELECT pp.proportion as shares, p.initial_price as p0
                FROM player_positions pp
                JOIN players p ON pp.player_id = p.id
                WHERE pp.user_id = ? AND pp.proportion > 0
            `, [user.id]);

            // AMM liquidation value: V = (P0/k) * (1 - e^(-kQ))
            const holdingsValue = positions.reduce((sum, row) => {
                const v = (row.p0 / k) * (1 - Math.exp(-k * row.shares));
                return sum + v;
            }, 0);

            const totalEquity = parseFloat(user.wallet_balance) + holdingsValue;

            // Get 24h baseline: earliest snapshot recorded in the last 24 hours
            const [historyRows] = await db.query(`
                SELECT total_equity
                FROM portfolio_history
                WHERE user_id = ? AND created_at >= NOW() - INTERVAL 24 HOUR
                ORDER BY created_at ASC
                LIMIT 1
            `, [user.id]);

            const oldEquity = historyRows.length > 0
                ? parseFloat(historyRows[0].total_equity)
                : totalEquity;

            const change24h = oldEquity > 0
                ? ((totalEquity - oldEquity) / oldEquity) * 100
                : 0;

            return {
                id: user.id,
                username: user.username,
                portfolio_value: parseFloat(totalEquity.toFixed(2)),
                change24h: Number(change24h.toFixed(2))
            };
        }));

        // Sort by portfolio value descending and return top 50
        results.sort((a, b) => b.portfolio_value - a.portfolio_value);
        res.status(200).json(results.slice(0, 50));

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

export default router;
