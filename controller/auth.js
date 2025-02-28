import user from "../models/userModel.js";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const register = async (req, res) => {
  const { userName, email, password } = req.body;

  try {
    // Input validation
    if (!userName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (typeof email !== 'string' || !isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    // Check for existing user
    const existingUser = await user.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Create new user
    const newUser = new user({
      email: email.toLowerCase(),
      password,
      name: userName.trim()
    });

    const token = await newUser.generateAuthToken();
    await newUser.save();

    res.status(201).json({
      message: "success",
      token: token,
      email: newUser.email,
      userName: newUser.name,
      pic: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
    });
  } catch (error) {
    console.error("Error in register:", error.message);
    res.status(500).json({ message: "Failed to register user" });
  }
};

/**
 * Login a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Input validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user
    const validUser = await user.findOne({ email: email.toLowerCase() });
    if (!validUser) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Validate password
    const validPassword = await bcrypt.compare(password, validUser.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token and send response
    const token = await validUser.generateAuthToken();
    const userName = validUser.name;
    const pic = validUser.profilePic;
    await validUser.save();

    res.cookie("userToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      sameSite: "strict", // Prevent CSRF
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(200).json({
      message: "success",
      token: token,
      email: email,
      userName: userName,
      pic: pic,
    });
  } catch (error) {
    console.error("Error in login:", error.message);
    res.status(500).json({ message: "Failed to login" });
  }
};

export const validUser = async (req, res) => {
  try {
    const validUser = await user
      .findOne({ _id: req.rootUserId })
      .select("-password");
    if (!validUser) res.json({ message: "user is not valid" });
    res.status(201).json({
      user: validUser,
      token: req.token,
    });
  } catch (error) {
    res.status(500);
    console.log(error);
  }
};
export const validAdmin = async (req, res) => {
  try {
    const validAdmin = await user
      .findOne({ _id: req.rootUserId })
      .select("-password");
    if (!validAdmin || !validAdmin.isAdmin)
      res.json({ message: "user is not admin" });
    res.status(201).json({
      user: validAdmin,
      token: req.token,
    });
  } catch (error) {
    res.status(500);
    console.log(error);
  }
};

/**
 * Process Google authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const googleAuth = async (req, res) => {
  try {
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).json({ message: "Token ID is required" });
    }

    const client = new OAuth2Client(process.env.JWT_CLIENT_ID);

    try {
      const verify = await client.verifyIdToken({
        idToken: tokenId,
        audience: process.env.JWT_CLIENT_ID,
      });

      const { email_verified, email, name, picture } = verify.payload;

      if (!email_verified) {
        return res.status(401).json({ message: "Email not verified" });
      }

      // Find or create user
      const userExist = await user.findOne({ email }).select("-password");

      if (userExist) {
        // Generate session token instead of using Google's token directly
        const sessionToken = await userExist.generateAuthToken();

        res.cookie("userToken", sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000,
        });

        res.status(200).json({ token: sessionToken, user: userExist });
      } else {
        // Create a new user with a secure random password
        const password = await bcrypt.hash(
          email + Math.random().toString(36).substring(2, 15),
          10
        );

        const newUser = new user({
          name: name,
          profilePic: picture,
          password,
          email,
        });

        await newUser.save();
        const sessionToken = await newUser.generateAuthToken();

        res.cookie("userToken", sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000,
        });

        res.status(201).json({
          message: "User registered successfully",
          token: sessionToken
        });
      }
    } catch (verifyError) {
      console.error("Token verification failed:", verifyError.message);
      return res.status(401).json({ message: "Invalid authentication token" });
    }
  } catch (error) {
    console.error("Error in googleAuth:", error.message);
    res.status(500).json({ message: "Authentication failed" });
  }
};

/**
 * Properly handle logout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const logout = async (req, res) => {
  try {
    // Filter out the current token
    req.rootUser.tokens = req.rootUser.tokens.filter(
      (token) => token.token !== req.token
    );

    await req.rootUser.save();
    res.clearCookie("userToken");

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error in logout:", error.message);
    res.status(500).json({ message: "Logout failed" });
  }
};

export const searchUsers = async (req, res) => {
  // const { search } = req.query;
  const search = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  const users = await user.find(search).find({ _id: { $ne: req.rootUserId } });
  res.send(users);
};
export const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const selectedUser = await user.findOne({ _id: id }).select("-password");
    res.status(200).json(selectedUser);
  } catch (error) {
    res.status(500);
  }
};
export const updateInfo = async (req, res) => {
  const { id } = req.params;
  const { bio, name } = req.body;
  try {
    const updatedUser = await user.findByIdAndUpdate(id, { name, bio });
    res.status(200).json({ message: "success", data: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "error" });
  }
};
export const resetPassword = async (req, res) => {
  const { email } = req.params;
  try {
    const existingUser = await user.findOne({ email });
    if (!existingUser) res.status(400).json({ message: "User don't exist" });
    const token = await existingUser.generateAuthToken();

    res.status(200).json({ message: "success", token: token });
  } catch (e) {
    res.status(500).json({ message: "user not found" });
  }
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
