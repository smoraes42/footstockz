import jwt from 'jsonwebtoken';
import db1 from "../database/db1.js";

export const protectRoute = async (req, res, next) => {
  try {
    let token = req.cookies[process.env.TOKEN_NAME || "jwt_token"];
    
    // Check for token in Authorization header if not found in cookies (Standard for mobile)
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ error: "Unauthorized - No Token Provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ error: "Unauthorized - Invalid Token" });
    }

    const [users] = await db1.query('SELECT id, username, email FROM users WHERE id = ?', [decoded.userId]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Unauthorized - Token Expired" });
    }
    console.log("Error in protectRoute middleware: ", error);
    res.status(500).json({ error: "Internal server error", message: "Internal server error" });
  }
};
