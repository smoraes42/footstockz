import pool from '../database/db1.js';
import tradeEngine from '../services/tradeEngine.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const INTERVAL_MS = 60000; // 1 minute
const BUY_COUNT = 10;
const SELL_COUNT = 5;
const MIN_TRADE_EUR = 200;
const MAX_TRADE_EUR = 500;

// Load player IDs from ids.txt
function loadPlayerIds() {
    try {
        const filePath = path.join(__dirname, 'ids.txt');
        const content = fs.readFileSync(filePath, 'utf8');
        const matches = content.match(/\((\d+)\)/g);
        if (!matches) return [];
        return matches.map(m => parseInt(m.replace(/[()]/g, '')));
    } catch (error) {
        console.error('Error loading player IDs:', error);
        return [];
    }
}

async function simulateRound() {
    const startTime = Date.now();
    console.log(`\n🤖 [${new Date().toLocaleTimeString()}] Starting high-dynamism round...`);

    const playerIds = loadPlayerIds();
    if (playerIds.length === 0) {
        console.error('❌ No players found in ids.txt');
        return;
    }

    try {
        // Fetch all users
        const [users] = await pool.query("SELECT id, username FROM users");
        console.log(`Found ${users.length} users for simulation.`);

        // Process in batches to avoid overwhelming the DB
        const BATCH_SIZE = 5;
        for (let i = 0; i < users.length; i += BATCH_SIZE) {
            const batch = users.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (user) => {
                // 10 BUYS
                for (let b = 0; b < BUY_COUNT; b++) {
                    const randomPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
                    const randomAmount = Math.floor(Math.random() * (MAX_TRADE_EUR - MIN_TRADE_EUR + 1)) + MIN_TRADE_EUR;
                    
                    try {
                        await tradeEngine.placeMarketBuyByValue(user.id, randomPlayerId, randomAmount);
                    } catch (e) {
                        // Ignore trade errors
                    }
                }

                // 5 SELLS
                try {
                    const [holdings] = await pool.query(
                        "SELECT player_id, proportion FROM player_positions WHERE user_id = ? AND proportion > 0",
                        [user.id]
                    );

                    if (holdings.length > 0) {
                        const shuffled = holdings.sort(() => Math.random() - 0.5);
                        const toSell = shuffled.slice(0, SELL_COUNT);
                        
                        for (const pos of toSell) {
                            const sellProp = pos.proportion * (Math.random() * 0.4 + 0.1); // 10-50%
                            try {
                                await tradeEngine.placeMarketSell(user.id, pos.player_id, sellProp);
                            } catch (e) {}
                        }
                    }
                } catch (e) {}
            }));
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Round finished in ${duration}s`);

    } catch (error) {
        console.error('❌ Simulation Round Error:', error);
    }
}

async function startSimulation() {
    console.log('--- High-Dynamism Standalone Simulation ---');
    console.log(`Users will perform ${BUY_COUNT} buys and ${SELL_COUNT} sells every minute.`);
    
    // Initial round
    simulateRound();
    
    // Set interval
    setInterval(simulateRound, INTERVAL_MS);
}

startSimulation();
