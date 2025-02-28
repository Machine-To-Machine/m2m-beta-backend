import express from "express";
import { Auth } from "../middleware/auth.js";
import { createVC, getVCByUser, removeVC, signVC } from "../controller/vc.js";
import { verifyVC } from "../utils/web5.js";

const router = express.Router();

router.post("/create", Auth, createVC);
router.post("/list", Auth, getVCByUser); // Added Auth middleware
router.post("/sign", Auth, signVC);
router.patch("/remove", Auth, removeVC);
router.post("/verify", Auth, verifyVC); // Added Auth middleware

export default router;