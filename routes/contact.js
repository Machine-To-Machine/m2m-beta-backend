import express from "express";
import { storeEmail } from "../controller/contact.js";

const router = express.Router();

// TODO: Add input validation middleware
// TODO: Add rate limiting middleware to prevent spam

router.post('/contact', storeEmail);

export default router;