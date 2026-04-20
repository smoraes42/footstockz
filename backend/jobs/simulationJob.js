import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../database/db1.js';
import tradeEngine from '../services/tradeEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load player IDs from ids.txt
function loadPlayerIds() {
    try {
        const filePath = path.join(__dirname, '../scripts/ids.txt');
        const content = fs.readFileSync(filePath, 'utf8');
        // Extract numbers from format (12345),
        const matches = content.match(/\((\d+)\)/g);
        if (!matches) return [];
        return matches.map(m => parseInt(m.replace(/[()]/g, '')));
    } catch (error) {
        console.error('Error loading player IDs for simulation:', error);
        return [];
    }
}

async function simulateTrade() {
    const startTime = Date.now();
    console.log('🤖 Simulation: Starting a high-dynamism round of trades...');
    
    const playerIds = loadPlayerIds();
    if (playerIds.length === 0) {
        console.warn('⚠️ No player IDs available for simulation.');
        return;
    }

    try {
        const [users] = await db.query('SELECT id, username FROM users');
        
        // Shuffle users to avoid bias
        const shuffledUsers = users.sort(() => Math.random() - 0.5);

        // Process users in small batches to stay within DB connection limits (connectionLimit: 10)
        const BATCH_SIZE = 5; 
        for (let i = 0; i < shuffledUsers.length; i += BATCH_SIZE) {
            const batch = shuffledUsers.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (user) => {
                // 10 Buys per minute
                for (let b = 0; b < 10; b++) {
                    const playerId = playerIds[Math.floor(Math.random() * playerIds.length)];
                    const amount = Math.floor(Math.random() * (500 - 200 + 1)) + 200;
                    try {
                        await tradeEngine.placeMarketBuyByValue(user.id, playerId, amount);
                    } catch (e) {
                        // Ignore errors like insufficient funds
                    }
                }

                // 5 Sells per minute
                try {
                    const [holdings] = await db.query('SELECT player_id, proportion FROM player_positions WHERE user_id = ? AND proportion > 0', [user.id]);
                    if (holdings.length > 0) {
                        const shuffledHoldings = holdings.sort(() => Math.random() - 0.5);
                        const toSell = shuffledHoldings.slice(0, 5);
                        for (const h of toSell) {
                            const sellProp = h.proportion * (Math.random() * 0.4 + 0.1); // Sell 10-50%
                            try {
                                await tradeEngine.placeMarketSell(user.id, h.player_id, sellProp);
                            } catch (e) {}
                        }
                    }
                } catch (e) {}
            }));
        }
        console.log(`✅ Simulation: Round finished in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    } catch (error) {
        console.error('❌ Error in simulation job:', error);
    }
}

export function startSimulation() {
    console.log('🚀 High-Dynamism Trading Simulation Service Started (Action every 1 minute)');
    
    // Run once on startup after a small delay
    setTimeout(simulateTrade, 5000);

    // Then every 1 minute
    setInterval(simulateTrade, 60 * 1000);
}
