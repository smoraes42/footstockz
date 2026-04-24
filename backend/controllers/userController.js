import db1 from "../database/db1.js";
import { CONFIG } from '../config.js';

export const getAllUsers = async (req, res) => {
  try {
    const [users] = await db1.query('SELECT id, username FROM users LIMIT 20');
    res.status(200).json(users);
  } catch (error) {
    console.error("GetAllUsers Error: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getMe = async (req, res) => {
  try {
    const [users] = await db1.query('SELECT id, username, email, avatar_url, created_at FROM users WHERE id = ?', [req.user.id]);
    const user = users[0];
    res.status(200).json(user);
  } catch (error) {
    console.error("GetMe Error: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const k = CONFIG.PRICE_IMPACT_FACTOR;

    const [userRows] = await db1.query('SELECT id, username, avatar_url, created_at FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = userRows[0];

    // Player holdings
    const [playerHoldings] = await db1.query(`
        SELECT p.id as player_id, p.full_name as player_name, pp.proportion as shares_owned, p.initial_price as current_price
        FROM player_positions pp
        JOIN players p ON pp.player_id = p.id
        WHERE pp.user_id = ? AND pp.proportion > 0
    `, [userId]);

    // Team holdings
    const [teamHoldings] = await db1.query(`
        SELECT t.id as team_id, t.name as team_name, tp.proportion as shares_owned
        FROM team_positions tp
        JOIN teams t ON tp.team_id = t.id
        WHERE tp.user_id = ? AND tp.proportion > 0
    `, [userId]);

    const holdings = [];

    // Process players
    for (const h of playerHoldings) {
      const shares = parseFloat(h.shares_owned);
      const p0 = parseFloat(h.current_price);
      const val = (p0 / k) * (1 - Math.exp(-k * shares));
      holdings.push({
        ...h,
        value: parseFloat(val.toFixed(2)),
        current_price: p0
      });
    }

    // Process teams
    for (const h of teamHoldings) {
      const shares = parseFloat(h.shares_owned);
      // Team price is sum of player prices
      const [teamPlayers] = await db1.query('SELECT initial_price FROM players WHERE team_id = ?', [h.team_id]);
      const teamPrice = teamPlayers.reduce((sum, p) => sum + (parseFloat(p.initial_price) || 0), 0);
      const val = (teamPrice / k) * (1 - Math.exp(-k * shares));
      holdings.push({
        ...h,
        value: parseFloat(val.toFixed(2)),
        current_price: parseFloat(teamPrice.toFixed(2))
      });
    }

    const totalHoldingsValue = holdings.reduce((sum, h) => sum + h.value, 0);

    res.status(200).json({ user, holdings, totalHoldingsValue: parseFloat(totalHoldingsValue.toFixed(2)) });
  } catch (error) {
    console.error("Error fetching public profile:", error);
    res.status(500).json({ error: "Internal Server Error", message: "Internal Server Error" });
  }
};
