import express from "express";
import { getAllUsers, getMe, getPublicProfile } from "../controllers/userController.js";
import { protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/all", protectRoute, getAllUsers);
router.get("/me", protectRoute, getMe);
router.get("/:userId/public-profile", getPublicProfile);

export default router;
