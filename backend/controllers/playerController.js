import db from '../database/db1.js';

export const getPlayers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const search = req.query.search || '';
        const leagueId = parseInt(req.query.league_id) || null;
        const teamId = parseInt(req.query.team_id) || null;
        const sortBy = req.query.sort_by || 'id';
        const sortDir = req.query.sort_dir === 'desc' ? 'DESC' : 'ASC';

        let baseWhere = 'WHERE 1=1';
        let queryParams = [];

        if (search) {
            baseWhere += ' AND (p.full_name LIKE ? OR t.name LIKE ?)';
            const searchParam = `%${search}%`;
            queryParams.push(searchParam, searchParam);
        }

        if (teamId) {
            baseWhere += ' AND p.team_id = ?';
            queryParams.push(teamId);
        } else if (leagueId) {
            baseWhere += ' AND t.league_id = ?';
            queryParams.push(leagueId);
        }

        let orderByClause = 'p.id ASC';
        if (sortBy === 'name') {
            orderByClause = `p.full_name ${sortDir}`;
        } else if (sortBy === 'price') {
            orderByClause = `p.initial_price ${sortDir}`;
        } else if (sortBy === 'change') {
            orderByClause = `CASE WHEN p.reference_price > 0 THEN (p.initial_price - p.reference_price) / p.reference_price ELSE 0 END ${sortDir}`;
        }

        const countQuery = `
            SELECT COUNT(*) as total 
            FROM players p
            JOIN teams t ON p.team_id = t.id
            ${baseWhere}
        `;
        const [countResult] = await db.query(countQuery, queryParams);
        const totalPlayers = countResult[0].total;

        const query = `
            SELECT 
                p.id, 
                p.full_name as name, 
                p.nationality,
                p.initial_price as price,
                p.reference_price,
                p.total_stock,
                p.pool_stock,
                p.pool_amount,
                t.name as team,
                p.team_id,
                t.league_id
            FROM players p
            JOIN teams t ON p.team_id = t.id
            ${baseWhere}
            ORDER BY ${orderByClause}
            LIMIT ? OFFSET ?
        `;

        const [playersSub] = await db.query(query, [...queryParams, limit, offset]);

        const players = playersSub.map(p => {
            const price = parseFloat(p.price) || 0;
            const refPrice = parseFloat(p.reference_price) || 0;
            return {
                ...p,
                price: price,
                reference_price: refPrice,
                total_stock: parseFloat(p.total_stock) || 0,
                pool_stock: parseFloat(p.pool_stock) || 0,
                pool_amount: parseFloat(p.pool_amount) || 0,
                change: refPrice > 0 
                    ? parseFloat((((price - refPrice) / refPrice) * 100).toFixed(2))
                    : 0
            };
        });

        const totalPages = Math.ceil(totalPlayers / limit);

        res.status(200).json({
            data: players,
            pagination: { total: totalPlayers, page, limit, totalPages }
        });
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

export const getLeagues = async (req, res) => {
    try {
        const query = `
            SELECT 
                l.id as league_id, 
                l.name as league_name, 
                t.id as team_id, 
                t.name as team_name
            FROM leagues l
            LEFT JOIN teams t ON l.id = t.league_id
            ORDER BY l.name ASC, t.name ASC
        `;
        const [results] = await db.query(query);

        const leaguesMap = {};
        results.forEach(row => {
            if (!leaguesMap[row.league_id]) {
                leaguesMap[row.league_id] = { id: row.league_id, name: row.league_name, teams: [] };
            }
            if (row.team_id) {
                leaguesMap[row.league_id].teams.push({ id: row.team_id, name: row.team_name });
            }
        });

        res.status(200).json(Object.values(leaguesMap));
    } catch (error) {
        console.error('Error fetching leagues:', error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

export const getPlayerById = async (req, res) => {
    try {
        const playerId = req.params.id;
        if (isNaN(playerId)) return res.status(400).json({ message: "Invalid player ID" });

        const query = `
            SELECT 
                p.id, p.full_name as name, p.nationality, p.initial_price as price,
                p.reference_price, p.total_stock, p.pool_stock, p.pool_amount,
                t.name as team, p.team_id, t.league_id
            FROM players p
            JOIN teams t ON p.team_id = t.id
            WHERE p.id = ?
        `;
        const [results] = await db.query(query, [playerId]);

        if (results.length === 0) return res.status(404).json({ message: "Player not found" });

        const p = results[0];
        const price = parseFloat(p.price) || 0;
        const refPrice = parseFloat(p.reference_price) || 0;
        
        p.price = price;
        p.reference_price = refPrice;
        p.total_stock = parseFloat(p.total_stock) || 0;
        p.pool_stock = parseFloat(p.pool_stock) || 0;
        p.pool_amount = parseFloat(p.pool_amount) || 0;
        p.change = refPrice > 0 ? parseFloat((((price - refPrice) / refPrice) * 100).toFixed(2)) : 0;

        res.status(200).json(p);
    } catch (error) {
        console.error('Error fetching player:', error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

export const getPlayerPriceHistory = async (req, res) => {
    try {
        const playerId = req.params.id;
        const [history] = await db.query(
            'SELECT price, created_at as time FROM player_prices WHERE player_id = ? ORDER BY created_at ASC LIMIT 100',
            [playerId]
        );
        res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching player history:', error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};
