import pool from '../database/db1.js';
import tradeEngine from '../services/tradeEngine.js';

// Configuration
const LEAGUE_NAME = 'La Liga';
const USER_EMAIL_PATTERN = 'user%@example.com';
const BUY_INTERVAL_MS = 40000;  // 10 seconds
const SELL_INTERVAL_MS = 300000; // 300 seconds - 5 minutos
const MIN_TRADE_EUR = 10;
const MAX_TRADE_EUR = 50;

/**
 * Main Simulation Function
 */
async function startSimulation() {
  try {
    console.log('--- Starting Trading Simulation ---');

    // 1. Fetch Players from the specified League
    const [players] = await pool.query(`
      SELECT p.id, p.full_name 
      FROM players p
      JOIN teams t ON p.team_id = t.id
      JOIN leagues l ON t.league_id = l.id
      WHERE l.name = ?
    `, [LEAGUE_NAME]);

    if (players.length === 0) throw new Error(`No players found for league: ${LEAGUE_NAME}`);
    const playerIds = players.map(p => p.id);
    console.log(`Found ${playerIds.length} players from ${LEAGUE_NAME}.`);

    // 2. Fetch Users (user1 to user10)
    const [users] = await pool.query("SELECT id, email FROM users WHERE email LIKE ? ORDER BY id ASC LIMIT 10", [USER_EMAIL_PATTERN]);
    if (users.length === 0) throw new Error('Simulation users not found');
    console.log(`Found ${users.length} simulation users.`);

    // 3. Start Loops for each user
    users.forEach(user => {
      console.log(`Initializing simulation for user: ${user.email} (ID: ${user.id})`);
      
      // Buy Loop
      setInterval(async () => {
        try {
          const randomPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
          const randomAmount = Math.floor(Math.random() * (MAX_TRADE_EUR - MIN_TRADE_EUR + 1)) + MIN_TRADE_EUR;
          
          process.stdout.write(`[USER ${user.id}] Buying €${randomAmount} of player ${randomPlayerId}... `);
          const result = await tradeEngine.placeMarketBuyByValue(user.id, randomPlayerId, randomAmount);
          console.log('SUCCESS');
        } catch (error) {
          console.log(`FAILED: ${error.message}`);
        }
      }, BUY_INTERVAL_MS + (Math.random() * 2000)); // Add jitter

      // Sell Loop (Sell all holdings for the selected players)
      setInterval(async () => {
        try {
          // Check holdings for this user and these players
          const [holdings] = await pool.query(
            "SELECT player_id, proportion FROM player_positions WHERE user_id = ? AND player_id IN (?) AND proportion > 0",
            [user.id, playerIds]
          );

          if (holdings.length === 0) return;

          for (const pos of holdings) {
            process.stdout.write(`[USER ${user.id}] Selling all holdings (${pos.proportion.toFixed(2)} shares) for player ${pos.player_id}... `);
            await tradeEngine.placeMarketSell(user.id, pos.player_id, pos.proportion);
            console.log('SUCCESS');
          }
        } catch (error) {
          console.log(`FAILED: ${error.message}`);
        }
      }, SELL_INTERVAL_MS + (Math.random() * 5000));
    });

    console.log('Simulation is running. Press Ctrl+C to stop.');

  } catch (error) {
    console.error('Fatal Simulation Error:', error);
    process.exit(1);
  }
}

startSimulation();
