import pool from '../database/db1.js';
import tradeEngine from '../services/tradeEngine.js';

// Configuration
const BARCELONA_TEAM_NAME = '%Barcelona%';
const USER_EMAIL_PATTERN = 'user%@example.com';
const BUY_INTERVAL_MS = 10000;  // 10 seconds
const MIN_TRADE_EUR = 1;
const MAX_TRADE_EUR = 5;

/**
 * Main Simulation Function (Buys Only)
 */
async function startSimulation() {
  try {
    console.log('--- Starting Buys-Only Trading Simulation ---');

    // 1. Fetch Barcelona Players
    const [teams] = await pool.query("SELECT id FROM teams WHERE name LIKE ?", [BARCELONA_TEAM_NAME]);
    if (teams.length === 0) throw new Error('Barcelona team not found');
    const teamId = teams[0].id;

    const [players] = await pool.query("SELECT id, full_name FROM players WHERE team_id = ?", [teamId]);
    const playerIds = players.map(p => p.id);
    console.log(`Found ${playerIds.length} players from Barcelona.`);

    // 2. Fetch Users (user1 to user10)
    const [users] = await pool.query("SELECT id, email FROM users WHERE email LIKE ? ORDER BY id ASC LIMIT 10", [USER_EMAIL_PATTERN]);
    if (users.length === 0) throw new Error('Simulation users not found');
    console.log(`Found ${users.length} simulation users.`);

    // 3. Start Loops for each user
    users.forEach(user => {
      console.log(`Initializing buys-only simulation for user: ${user.email} (ID: ${user.id})`);
      
      // Buy Loop
      setInterval(async () => {
        try {
          const randomPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
          const randomAmount = Math.floor(Math.random() * (MAX_TRADE_EUR - MIN_TRADE_EUR + 1)) + MIN_TRADE_EUR;
          
          process.stdout.write(`[USER ${user.id}] Buying €${randomAmount} of player ${randomPlayerId}... `);
          const result = await tradeEngine.placeMarketBuyByValue(user.id, randomPlayerId, randomAmount);
          console.log('SUCCESS');
        } catch (error) {
          if (error.message.includes('Insufficient wallet balance')) {
             // Silently ignore or log briefly - simulation users might run out of money eventually
             console.log('SKIPPED (No balance)');
          } else {
             console.log(`FAILED: ${error.message}`);
          }
        }
      }, BUY_INTERVAL_MS + (Math.random() * 2000)); // Add jitter
    });

    console.log('Buys-only simulation is running. Press Ctrl+C to stop.');

  } catch (error) {
    console.error('Fatal Simulation Error:', error);
    process.exit(1);
  }
}

startSimulation();
