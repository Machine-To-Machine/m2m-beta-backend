import express from "express";
import {
  register,
  login,
  resetPassword,
  validUser,
  googleAuth,
  logout,
  searchUsers,
  updateInfo,
  getUserById,
  validAdmin,
} from "../controller/auth.js";
import { Auth } from "../middleware/auth.js";
const router = express.Router();

// Authentication routes
router.post("/sign-up", register);
router.post("/sign-in", login);
router.post("/reset-password", resetPassword);
router.post("/google-auth", googleAuth);
router.post("/sign-out", Auth, logout); // Changed to POST for logout

// User validation
router.get("/user-valid", Auth, validUser);
router.get("/admin-valid", Auth, validAdmin);

// User management - protected
router.get("/search", Auth, searchUsers);
router.get("/users/:id", Auth, getUserById);
router.patch("/users/:id", Auth, updateInfo); // Renamed for consistency

export default router;
