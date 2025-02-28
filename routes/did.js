import express from "express";
const router = express.Router();
import { Auth } from "../middleware/auth.js";

import { createDid, getDidByUser, removeDid, updateDid, searchDids, fetchAllDids } from "../controller/did.js";
import { sendMailWithAttachment } from "../utils/firebase.js";

// DID management routes
router.post("/create", Auth, createDid);
router.post("/list", Auth, getDidByUser);
router.put("/update", Auth, updateDid);
router.delete("/remove", Auth, removeDid);

// DID search routes - should be protected
router.post('/search', Auth, searchDids);
router.post('/all', Auth, fetchAllDids);

// Email routes
router.post("/email", Auth, sendMailWithAttachment);

export default router;
