import cookieParser from 'cookie-parser';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';

// Database Config
import db1 from './database/db1.js';

// Routes
import AuthRoutes from "./routes/authRoutes.js";
import UserRoutes from "./routes/userRoutes.js";
import PlayerRoutes from "./routes/playerRoutes.js";
import TradeRoutes from "./routes/tradeRoutes.js";
import PortfolioRoutes from "./routes/portfolioRoutes.js";
import LeaderboardRoutes from "./routes/leaderboardRoutes.js";
import TeamMarketRoutes from "./routes/teamMarketRoutes.js";
import { startSnapshotJob } from './jobs/snapshotJob.js';

// Get Environment Variables
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import http from 'http';
import socketService from './services/socketService.js';

// Express Middleware
const app = express();

if (process.env.MODE === "production"){
app.set('trust proxy', 1);
}
app.use(cors({
  origin: process.env.MODE === "production" ? process.env.ORIGIN : '*',
  credentials: true,
}));

const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Rate limiter for auth endpoints (login, signup, verify-email)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                   // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.', message: 'Too many requests from this IP, please try again later.' }
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 1000,             // 1000 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});

app.use("/api/v1/user/login", authLimiter);
app.use("/api/v1/user/signup", authLimiter);
app.use("/api/v1/user/verify-email", authLimiter);
app.use("/api/v1", apiLimiter);

app.use("/api/v1/user", AuthRoutes);
app.use("/api/v1/user", UserRoutes);
app.use("/api/v1/players", PlayerRoutes);
app.use("/api/v1/trades", TradeRoutes);
app.use("/api/v1/portfolio", PortfolioRoutes);
app.use("/api/v1/leaderboard", LeaderboardRoutes);
app.use("/api/v1/teams", TeamMarketRoutes);

app.use(express.static(path.join(__dirname, '../website/dist')));
app.get("/*splat", (req, res) => {
  res.sendFile(path.join(__dirname, '../website/dist', 'index.html'));
});

const testDbConnection = async (pool, name) => {
  try {
    console.log('[DEBUG]: FORBIDDEEN CHAR: ', process.env.SMTP_PASSWORD)
    const connection = await pool.getConnection();
    console.log(`Successfully connected to Database: ${name}`);
    connection.release();
  } catch (error) {
    console.error(`Error Connecting to Database ${name}:`, error);
  }
};

server.listen(PORT, async () => {
  console.log(`Server Running on Port: ${PORT}`);
  socketService.init(server);
  await testDbConnection(db1, process.env.DB_NAME);
  startSnapshotJob();
});

