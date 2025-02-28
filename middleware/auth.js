import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

// Helper function to extract and verify token
const extractAndVerifyToken = async (req) => {
  if (!req.headers.authorization) {
    throw new Error("Authorization header missing");
  }

  const token = req.headers.authorization.split(" ")[1];

  if (!token) {
    throw new Error("Token not provided");
  }

  // Handle JWT (short) vs Google (long) tokens
  if (token.length < 500) {
    // JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      throw new Error("Token expired");
    }

    const rootUser = await User.findOne({ _id: decoded.id }).select("-password");

    if (!rootUser) {
      throw new Error("User not found");
    }

    return { token, rootUser };
  } else {
    // Google token
    const decoded = jwt.decode(token);
    const rootUser = await User.findOne({ email: decoded.email }).select("-password");

    if (!rootUser) {
      throw new Error("User not found");
    }

    return { token, rootUser };
  }
};

export const Auth = async (req, res, next) => {
  try {
    const { token, rootUser } = await extractAndVerifyToken(req);

    req.token = token;
    req.rootUser = rootUser;
    req.rootUserId = rootUser._id;

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    return res.status(401).json({
      error: error.message || "Authentication failed"
    });
  }
};

export const AdminAuth = async (req, res, next) => {
  try {
    const { token, rootUser } = await extractAndVerifyToken(req);

    if (!rootUser.isAdmin) {
      throw new Error("Admin privileges required");
    }

    req.token = token;
    req.rootUser = rootUser;
    req.rootUserId = rootUser._id;

    next();
  } catch (error) {
    console.error("Admin authentication error:", error.message);
    return res.status(403).json({
      error: error.message || "Admin authentication failed"
    });
  }
};
