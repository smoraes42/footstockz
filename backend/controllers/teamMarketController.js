import db from '../database/db1.js';

export const getTeamMarket = async (req, res) => {
    try {
        const search = req.query.search || '';
        const leagueId = parseInt(req.query.league_id) || null;
        
        let whereClause = 'WHERE 1=1';
        let queryParams = [];

        if (search) {
            whereClause += ` AND (t.name LIKE ? OR l.name LIKE ?)`;
            const searchParam = `%${search}%`;
            queryParams.push(searchParam, searchParam);
        }
        
        if (leagueId) {
            whereClause += ` AND t.league_id = ?`;
            queryParams.push(leagueId);
        }

        const query = `
            SELECT 
                t.id, t.name, t.league_id, l.name as league_name,
                SUM(p.initial_price) as current_price,
                SUM(p.reference_price) as reference_price,
                COUNT(p.id) as player_count
            FROM teams t
            JOIN leagues l ON t.league_id = l.id
            JOIN players p ON p.team_id = t.id
            ${whereClause}
            GROUP BY t.id
            ORDER BY current_price DESC
        `;
        const [results] = await db.query(query, queryParams);

        const teams = results.map(row => {
            const current = parseFloat(row.current_price) || 0;
            const reference = parseFloat(row.reference_price) || current;
            const change = reference > 0 ? ((current - reference) / reference) * 100 : 0;

            return {
                id: row.id,
                name: row.name,
                league: row.league_name,
                leagueId: row.league_id,
                price: parseFloat(current.toFixed(2)),
                change: parseFloat(change.toFixed(2)),
                playerCount: row.player_count
            };
        });

        res.status(200).json(teams);
    } catch (error) {
        console.error('Error fetching team market data:', error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

export const getTeamById = async (req, res) => {
    try {
        const teamId = req.params.id;
        
        const teamQuery = `
            SELECT t.*, l.name as league_name 
            FROM teams t 
            JOIN leagues l ON t.league_id = l.id 
            WHERE t.id = ?
        `;
        const [teamResult] = await db.query(teamQuery, [teamId]);
        
        if (teamResult.length === 0) return res.status(404).json({ message: "Team not found" });

        const playerQuery = `
            SELECT id, full_name as name, initial_price as price, reference_price
            FROM players WHERE team_id = ? ORDER BY initial_price DESC
        `;
        const [players] = await db.query(playerQuery, [teamId]);

        const team = teamResult[0];
        const currentPrice = players.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
        const refPrice = players.reduce((sum, p) => sum + (parseFloat(p.reference_price || p.price) || 0), 0);
        const change = refPrice > 0 ? ((currentPrice - refPrice) / refPrice) * 100 : 0;

        res.status(200).json({
            ...team,
            price: parseFloat(currentPrice.toFixed(2)),
            change: parseFloat(change.toFixed(2)),
            players: players.map(p => ({
                ...p,
                price: parseFloat(p.price) || 0,
                reference_price: parseFloat(p.reference_price) || 0,
                change: p.reference_price > 0 ? ((p.price - p.reference_price) / p.reference_price) * 100 : 0
            }))
        });
    } catch (error) {
        console.error('Error fetching team details:', error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

export const getTeamHistory = async (req, res) => {
    try {
        const teamId = req.params.id;
        const query = `
            SELECT 
                DATE_FORMAT(pp.created_at, '%Y-%m-%d %H:%i:00') as time,
                SUM(pp.price) as price
            FROM player_prices pp
            JOIN players p ON pp.player_id = p.id
            WHERE p.team_id = ?
            GROUP BY time
            ORDER BY time ASC
            LIMIT 200
        `;
        const [history] = await db.query(query, [teamId]);
        res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching team history:', error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};
