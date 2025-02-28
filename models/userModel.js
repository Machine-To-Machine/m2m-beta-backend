import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address'
      ],
    },
    password: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      default: "Available",
    },
    profilePic: {
      type: String,
      default:
        "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
    },
    subscription: {
      type: String,
      default: "free",
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    contacts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// Add method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = async function () {
  try {
    let token = jwt.sign(
      { id: this._id, email: this.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "24h", // Reduced from 2400h for security
      }
    );

    return token;
  } catch (error) {
    console.error("Error generating token:", error);
    throw new Error("Authentication failed, please try again later");
  }
};

// Add a static method for password updates that will always hash the password
userSchema.statics.updatePassword = async function(userId, newPassword) {
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  return this.findByIdAndUpdate(userId, { password: hashedPassword });
};

const userModel = mongoose.model("User", userSchema);
export default userModel;
