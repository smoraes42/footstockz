import { getLeagues, getTeamsByLeague } from './api-football.js';
import db from '../database/db1.js';

// Common API-Football IDs for the major leagues:
// 39 = Premier League (England)
// 140 = La Liga (Spain)
// 135 = Serie A (Italy)
// 78 = Bundesliga (Germany)
// 61 = Ligue 1 (France)
const MAJOR_LEAGUE_IDS = [140, 141];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function populate() {
    console.log('Starting population of major leagues and their teams...');

    try {
        for (const leagueId of MAJOR_LEAGUE_IDS) {
            console.log(`\nFetching league config for ID: ${leagueId}...`);
            const leagueData = await getLeagues({ id: leagueId });

            if (!leagueData || !leagueData.response || leagueData.response.length === 0) {
                console.warn(`⚠️ No data found for league ID ${leagueId}`);
                continue;
            }

            const leagueInfo = leagueData.response[0].league;
            const countryInfo = leagueData.response[0].country;
            const seasons = leagueData.response[0].seasons;

            // Find current season
            const currentSeasonObj = seasons.find(s => s.current);
            const currentSeason = currentSeasonObj ? currentSeasonObj.year : new Date().getFullYear();

            // Insert or Update League
            console.log(`Inserting/Updating League: ${leagueInfo.name} (${countryInfo.name})`);
            await db.query(`
                INSERT INTO leagues (id, name, country) 
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE name = VALUES(name), country = VALUES(country)
            `, [leagueInfo.id, leagueInfo.name, countryInfo.name]);

            console.log(`Fetching teams for ${leagueInfo.name} (Season: ${currentSeason})...`);

            // Fetch teams
            const teamsData = await getTeamsByLeague(leagueId, currentSeason);

            if (!teamsData || !teamsData.response) {
                console.warn(`⚠️ No teams found for league ${leagueInfo.name}`);
                continue;
            }

            const teams = teamsData.response;
            console.log(`Found ${teams.length} teams. Inserting into database...`);

            for (const teamItem of teams) {
                const teamInfo = teamItem.team;

                await db.query(`
                    INSERT INTO teams (id, name, league_id) 
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE name = VALUES(name), league_id = VALUES(league_id)
                `, [teamInfo.id, teamInfo.name, leagueInfo.id]);
            }

            console.log(`✅ Successfully processed teams for ${leagueInfo.name}`);

            // Slight delay to be gentle on rate limits
            await sleep(1000);
        }

        console.log('\n🎉 Population completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during population:', error);
        process.exit(1);
    }
}

populate();
