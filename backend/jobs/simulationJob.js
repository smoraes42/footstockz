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
    console.log('🤖 Simulation: Starting a new round of trades...');
    
    const playerIds = loadPlayerIds();
    if (playerIds.length === 0) {
        console.warn('⚠️ No player IDs available for simulation.');
        return;
    }

    try {
        // Get all mock users (we can assume users with id > some threshold or just all for now)
        // Let's just get all users for the demo
        const [users] = await db.query('SELECT id, username FROM users');
        
        for (const user of users) {
            // 50% chance of doing something in this round to make it less predictable
            if (Math.random() > 0.5) continue;

            const action = Math.random() > 0.5 ? 'buy' : 'sell';

            if (action === 'buy') {
                const playerId = playerIds[Math.floor(Math.random() * playerIds.length)];
                const amount = Math.floor(Math.random() * (500 - 200 + 1)) + 200; // Between 200 and 500
                
                try {
                    await tradeEngine.placeMarketBuyByValue(user.id, playerId, amount);
                    console.log(`✅ [Sim] ${user.username} bought player ${playerId} for ${amount}€`);
                } catch (error) {
                    // Silently fail if insufficient funds or other trade issues
                    // console.error(`❌ [Sim] Buy error for ${user.username}:`, error.message);
                }
            } else {
                // Sell something from holdings
                const [holdings] = await db.query('SELECT player_id, proportion FROM player_positions WHERE user_id = ? AND proportion > 0', [user.id]);
                
                if (holdings.length > 0) {
                    const holding = holdings[Math.floor(Math.random() * holdings.length)];
                    // Randomly sell between 20% and 100% of the holding
                    const sellProportion = holding.proportion * (Math.random() * 0.8 + 0.2);
                    
                    try {
                        await tradeEngine.placeMarketSell(user.id, holding.player_id, sellProportion);
                        console.log(`✅ [Sim] ${user.username} sold ${sellProportion.toFixed(4)} shares of player ${holding.player_id}`);
                    } catch (error) {
                        // console.error(`❌ [Sim] Sell error for ${user.username}:`, error.message);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Error in simulation job:', error);
    }
}

export function startSimulation() {
    console.log('🚀 Trading Simulation Service Started (Action every 10 minutes)');
    
    // Run once on startup after a small delay
    setTimeout(simulateTrade, 10000);

    // Then every 10 minutes
    setInterval(simulateTrade, 10 * 60 * 1000);
}
