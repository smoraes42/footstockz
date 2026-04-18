import pool from '../database/db1.js';
import { CONFIG } from '../config.js';

/**
 * DISABLED: Portfolio snapshots are now event-sourced.
 * A snapshot is recorded every time a user buys or sells in tradeEngine.js.
 * This removes the need for periodic polling and eliminates redundant data.
 *
 * If needed for long-term "daily close" marks, re-enable with a daily schedule:
 * cron.schedule('0 0 * * *', ...) — runs once per day at midnight.
 */
export const startSnapshotJob = () => {
    console.log('[CRON] Portfolio snapshot cron job is DISABLED. Using event-sourced snapshots instead.');
    // Uncomment below to re-enable daily snapshots for long-term chart support:
    /*
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Running daily portfolio snapshot job...', new Date().toISOString());
        let connection;
        try {
            connection = await pool.getConnection();

            const [users] = await connection.execute(`
                SELECT u.id as user_id, w.value as wallet_value 
                FROM users u
                JOIN wallets w ON u.id = w.user_id
            `);

            for (const user of users) {
                const [holdings] = await connection.execute(`
                    SELECT pp.proportion as shares, p.initial_price as p0
                    FROM player_positions pp
                    JOIN players p ON pp.player_id = p.id
                    WHERE pp.user_id = ? AND pp.proportion > 0
                `, [user.user_id]);

                let holdingsValue = 0;
                const k = CONFIG.PRICE_IMPACT_FACTOR;
                for (const row of holdings) {
                    // Liquidation Value = (P0 / k) * (1 - e^(-kQ))
                    const v = (row.p0 / k) * (1 - Math.exp(-k * row.shares));
                    holdingsValue += v;
                }
                const walletValue = user.wallet_value || 0;
                const totalEquity = walletValue + holdingsValue;

                await connection.execute(`
                    INSERT INTO portfolio_history (user_id, wallet_value, holdings_value, total_equity)
                    VALUES (?, ?, ?, ?)
                `, [user.user_id, walletValue, holdingsValue, totalEquity]);
            }

            console.log('[CRON] Daily portfolio snapshot job completed.');
        } catch (error) {
            console.error('[CRON] Error during portfolio snapshot job:', error);
        } finally {
            if (connection) connection.release();
        }
    });
    */
};
