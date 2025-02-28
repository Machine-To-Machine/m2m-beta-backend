import mongoose from "mongoose";

const vcSchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      default: "UnVerified",
      enum: ["UnVerified", "Verified", "Revoked", "Expired"],
    },
    issuer: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    issuanceDate: {
      type: Date,
      required: true,
    },
    expirationDate: {
      type: Date,
      required: false,
    },
    type: {
      type: Array,
      required: true,
    },
    credential: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    vcJwt: {
      type: String,
      default: "",
    },
    did: {
      type: String,
      ref: "DID",
    },
  },
  {
    timestamps: true,
  }
);

// Add validation hook
vcSchema.pre('save', function(next) {
  if (this.expirationDate && this.expirationDate < this.issuanceDate) {
    return next(new Error('Expiration date cannot be before issuance date'));
  }
  next();
});

const vcModel = mongoose.model("VC", vcSchema);
export default vcModel;
