import { getPlayers } from './api-football.js';
import db from '../database/db1.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Custom starting parameters as requested by the user
const DEFAULT_INITIAL_PRICE = 0.5;
// We now use total_stock to track Circulating Supply (starts at 0)
const DEFAULT_TOTAL_STOCK = 0;
// Legacy fields set to 0
const DEFAULT_POOL_STOCK = 0;
const DEFAULT_POOL_AMOUNT = 0;

async function populatePlayers() {
    console.log('Starting population of players...');

    try {
        // Get all teams from the database
        const [teams] = await db.query('SELECT id, name FROM teams');
        console.log(`Found ${teams.length} teams in the database.`);

        if (teams.length === 0) {
            console.log('No teams found to process. Exiting.');
            process.exit(0);
        }

        // We use 2025 as the current season.
        const season = 2025;

        for (const team of teams) {
            console.log(`\nFetching players for team: ${team.name} (ID: ${team.id})`);

            let currentPage = 1;
            let totalPages = 1;
            let playersInserted = 0;

            do {
                console.log(`-> Fetching page ${currentPage} of ${totalPages}...`);
                const playersData = await getPlayers(team.id, season, currentPage);

                if (!playersData || !playersData.response || playersData.response.length === 0) {
                    console.warn(`⚠️ No players found for team ${team.name} on page ${currentPage}`);
                    break;
                }

                // Update totalPages from pagination data if available
                if (playersData.paging && playersData.paging.total) {
                    totalPages = playersData.paging.total;
                }

                const players = playersData.response;

                for (const playerItem of players) {
                    const p = playerItem.player;
                    const statistics = playerItem.statistics;
                    let position = 'Unknown';

                    // Find primary position from statistics if available
                    if (statistics && statistics.length > 0 && statistics[0].games && statistics[0].games.position) {
                        position = statistics[0].games.position;
                    }

                    // Insert or update player
                    await db.query(`
                        INSERT INTO players 
                            (id, full_name, nationality, team_id, position, initial_price, total_stock, pool_stock, pool_amount) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE 
                            full_name = VALUES(full_name), 
                            nationality = VALUES(nationality), 
                            team_id = VALUES(team_id), 
                            position = VALUES(position)
                    `, [
                        p.id,
                        p.name,
                        p.nationality,
                        team.id,
                        position,
                        DEFAULT_INITIAL_PRICE,
                        DEFAULT_TOTAL_STOCK,
                        DEFAULT_POOL_STOCK,
                        DEFAULT_POOL_AMOUNT
                    ]);

                    playersInserted++;
                }

                currentPage++;

                // Small delay to mind API rate limits
                await sleep(500);

            } while (currentPage <= totalPages);

            console.log(`✅ Successfully processed ${playersInserted} players for ${team.name}`);

            // Wait slightly longer between different teams
            await sleep(1000);
        }

        console.log('\n🎉 Player population completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during player population:', error);
        process.exit(1);
    }
}

populatePlayers();
