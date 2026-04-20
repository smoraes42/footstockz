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

    const [holdingRows] = await db1.query(`
        SELECT p.id as player_id, p.full_name as player_name, pp.proportion as shares_owned, p.initial_price as current_price
        FROM player_positions pp
        JOIN players p ON pp.player_id = p.id
        WHERE pp.user_id = ? AND pp.proportion > 0
    `, [userId]);

    const holdings = holdingRows.map(h => {
      const shares = parseFloat(h.shares_owned);
      const p0 = parseFloat(h.current_price);
      const positionValue = (p0 / k) * (1 - Math.exp(-k * shares));
      return { ...h, position_value: parseFloat(positionValue.toFixed(2)) };
    });

    const totalHoldingsValue = holdings.reduce((sum, h) => sum + h.position_value, 0);

    res.status(200).json({ user, holdings, totalHoldingsValue: parseFloat(totalHoldingsValue.toFixed(2)) });
  } catch (error) {
    console.error("Error fetching public profile:", error);
    res.status(500).json({ error: "Internal Server Error", message: "Internal Server Error" });
  }
};
