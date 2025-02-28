import mongoose from "mongoose";
import crypto from 'crypto';

const registerSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
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
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String, // Changed from Number to String to store hash
      default: null,
    },
    verificationCodeExpires: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    },
    companyName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    webLink: {
      type: String,
      default: "",
      validate: {
        validator: function(v) {
          return v === "" || /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w.-]*)*\/?$/.test(v);
        },
        message: props => `${props.value} is not a valid URL!`
      }
    },
    linkedIn: {
      type: String,
      default: "",
    },
    github: {
      type: String,
      default: "",
    },
    huggingFace: {
      type: String,
      default: "",
    },
    domainName: {
      type: String,
      default: "",
    },
    extensionType: {
      type: String,
      default: "ai",
      enum: ["ai", "service"],
    },
    extensionName: {
      type: String,
      default: "",
    },
    customerId: {
      type: String,
      default: "",
    },
    subscription: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Method to set verification code
registerSchema.methods.setVerificationCode = function() {
  // Generate a random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash the code for storage
  this.verificationCode = crypto.createHash('sha256').update(code).digest('hex');

  // Set expiration to 24 hours from now
  this.verificationCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return code; // Return plain code for sending in email
};

// Method to verify code
registerSchema.methods.verifyCode = function(code) {
  // Check if code has expired
  if (Date.now() > this.verificationCodeExpires) {
    return false;
  }

  // Compare hashed input with stored hash
  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
  return this.verificationCode === hashedCode;
};

const registerModel = mongoose.model("Register", registerSchema);
export default registerModel;
