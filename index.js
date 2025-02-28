import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import dotenv from "dotenv/config";

import mongoDBConnect from "./mongoDB/connection.js";

import didRoutes from "./routes/did.js";
import userRoutes from "./routes/auth.js";
import vcRoutes from "./routes/vc.js";
import registerRoutes from "./routes/register.js";
import stripeRoutes from "./routes/stripe.js";
import contactRoutes from "./routes/contact.js";

const app = express();
const PORT = process.env.PORT || 8000;

// Security-enhanced CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || process.env.CLIENT_URL
    : '*', // Restrict in production, open in development
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization"
  ],
  maxAge: 86400, // 24 hours
};

// Middleware
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));
app.use(cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
  console.info(`${req.method} ${req.originalUrl}`);
  next();
});

// API routes
app.use("/api/auth", userRoutes);
app.use("/api/did", didRoutes);
app.use("/api/vc", vcRoutes);
app.use("/api/register", registerRoutes);
app.use("/api/payment", stripeRoutes);
app.use("/api/contact", contactRoutes);

// Static file serving for production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join("client/build")));
  app.use("*", (req, res) => {
    res.sendFile(path.resolve("client/build/index.html"));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Connect to MongoDB and start server
mongoose.set("strictQuery", false);
mongoDBConnect()
  .then(() => {
    app.listen(PORT, () => {
      console.info(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'} mode)`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
