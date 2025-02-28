import express from "express";
import { Auth } from "../middleware/auth.js";
import { createCheckoutSession, createCoupon, createCustomer, createProduct, createSubscription, emailTemplate, priceList, productList, removeProduct } from "../controller/stripe.js";

const router = express.Router();

// Customer routes
router.post("/customer", Auth, createCustomer);

// Product routes
router.post("/product", Auth, createProduct);
router.get("/products", Auth, productList);
router.delete("/product", Auth, removeProduct);
router.get("/prices", Auth, priceList);

// Payment routes
router.post("/checkout-session", Auth, createCheckoutSession);
router.post("/payment-confirm", Auth, createSubscription);
router.post('/coupon', Auth, createCoupon);

// Email routes
router.post('/email-template', Auth, emailTemplate);

export default router;