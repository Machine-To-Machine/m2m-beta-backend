import express from "express";
import { Auth } from "../middleware/auth.js";
import {
  registerDev,
  emailConfirm,
  verifyCode,
  subscriptionList,
  getUser,
  getProfile
} from "../controller/register.js";
const router = express.Router();

// Registration flow
router.post("/dev", registerDev);
router.post("/confirm", emailConfirm);
router.post("/resend", emailConfirm);
router.post("/verify", verifyCode);

// User data routes - protected
router.post("/user", Auth, getUser);
router.post("/profile", Auth, getProfile);

// Subscription routes - protected
router.get("/subscriptions", Auth, subscriptionList);

export default router;
