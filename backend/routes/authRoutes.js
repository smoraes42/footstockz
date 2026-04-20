import express from "express";
import { signup, verifyEmail, login, googleAuth, logout } from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/verify-email", verifyEmail);
router.post("/login", login);
router.post("/google", googleAuth);
router.post("/logout", logout);

export default router;
