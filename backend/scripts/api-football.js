import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const apiKey = process.env.API_FOOTBALL_KEY;

if (!apiKey) {
    console.warn('⚠️ API_FOOTBALL_KEY is not defined in the .env file.');
}

// Create an Axios instance pre-configured for api-football
const apiFootball = axios.create({
    baseURL: 'https://v3.football.api-sports.io',
    headers: {
        'x-apisports-key': apiKey
    }
});

// Generic generic request handler
export const fetchFromApiFootball = async (endpoint, params = {}) => {
    try {
        const response = await apiFootball.get(endpoint, { params });

        // Handle API-Sports specific errors that return 200 OK but with errors in the payload
        if (response.data.errors && Object.keys(response.data.errors).length > 0) {
            throw new Error(`API-Football Error: ${JSON.stringify(response.data.errors)}`);
        }

        return response.data;
    } catch (error) {
        console.error(`❌ Error fetching from API-Football (${endpoint}):`, error.message);
        throw error;
    }
};

export const getLeagues = async (params = {}) => {
    return await fetchFromApiFootball('/leagues', params);
};

export const getTeamsByLeague = async (leagueId, season) => {
    return await fetchFromApiFootball('/teams', { league: leagueId, season });
};

export const getPlayers = async (teamId, season, page = 1) => {
    return await fetchFromApiFootball('/players', { team: teamId, season, page });
};

export default apiFootball;
