import pool from '../database/db1.js';
import tradeEngine from '../services/tradeEngine.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MIN_INTERVAL_MS = 2 * 60 * 1000;    // 2 minutes
const MAX_INTERVAL_MS = 60 * 60 * 1000;   // 1 hour
const MAX_TRADES_PER_TYPE = 10;           // Max 10 buys and 10 sells
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

// Load bot user IDs from bots_ids.txt
function loadBotIds() {
    try {
        const filePath = path.join(__dirname, 'bots_ids.txt');
        const content = fs.readFileSync(filePath, 'utf8');
        const matches = content.match(/\((\d+)\)/g);
        if (!matches) return [];
        return matches.map(m => parseInt(m.replace(/[()]/g, '')));
    } catch (error) {
        console.error('Error loading bot IDs:', error);
        return [];
    }
}

async function performBotActions(user) {
    const startTime = Date.now();
    const playerIds = loadPlayerIds();
    if (playerIds.length === 0) return;

    // Randomize buy and sell counts for THIS bot (0 to 10)
    let userBuyCount = Math.floor(Math.random() * (MAX_TRADES_PER_TYPE + 1));
    let userSellCount = Math.floor(Math.random() * (MAX_TRADES_PER_TYPE + 1));

    if (user.id === 208) {
        userBuyCount = 10;
        userSellCount = 10;
    }

    if (userBuyCount > 0 || userSellCount > 0) {
        console.log(`🤖 [${new Date().toLocaleTimeString()}] Bot ${user.username} (#${user.id}) performing ${userBuyCount} buys and ${userSellCount} sells...`);
    }

    // BUYS
    for (let b = 0; b < userBuyCount; b++) {
        const randomPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
        const randomAmount = Math.floor(Math.random() * (MAX_TRADE_EUR - MIN_TRADE_EUR + 1)) + MIN_TRADE_EUR;
        try {
            await tradeEngine.placeMarketBuyByValue(user.id, randomPlayerId, randomAmount);
        } catch (e) {}
    }

    // SELLS
    if (userSellCount > 0) {
        try {
            const [holdings] = await pool.query(
                "SELECT player_id, proportion FROM player_positions WHERE user_id = ? AND proportion > 0",
                [user.id]
            );

            if (holdings.length > 0) {
                const shuffled = holdings.sort(() => Math.random() - 0.5);
                const toSell = shuffled.slice(0, userSellCount);
                
                for (const pos of toSell) {
                    const sellProp = pos.proportion * (Math.random() * 0.4 + 0.1); // 10-50%
                    try {
                        await tradeEngine.placeMarketSell(user.id, pos.player_id, sellProp);
                    } catch (e) {}
                }
            }
        } catch (e) {}
    }

    // Schedule NEXT action for THIS specific bot
    scheduleNextForBot(user);
}

function scheduleNextForBot(user) {
    let nextInterval = Math.floor(Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS + 1)) + MIN_INTERVAL_MS;
    if (user.id === 208) {
        nextInterval = 30 * 1000; // 30 seconds
    }
    setTimeout(() => performBotActions(user), nextInterval);
}

async function startSimulation() {
    console.log('--- Individual Natural Behavior Simulation ---');
    console.log(`Each bot now operates on its own independent random schedule.`);
    
    const botIds = loadBotIds();
    if (botIds.length === 0) {
        console.error('❌ No bot users found in bots_ids.txt');
        return;
    }

    try {
        const [users] = await pool.query("SELECT id, username FROM users WHERE id IN (?)", [botIds]);
        console.log(`Initializing ${users.length} independent bots...`);

        // Start each bot with a staggered initial delay (0-10 minutes)
        // to avoid all bots starting at exactly the same second when the script runs.
        users.forEach((user, index) => {
            let initialDelay = Math.floor(Math.random() * (10 * 60 * 1000));
            if (user.id === 208) {
                initialDelay = 0; // Start immediately
            }
            setTimeout(() => performBotActions(user), initialDelay);
        });

    } catch (error) {
        console.error('❌ Initialization Error:', error);
    }
}

startSimulation();
