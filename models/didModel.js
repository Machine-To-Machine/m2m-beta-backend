import mongoose from "mongoose";

const didSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    uri: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^did:([\w]+):([\w.-]+)(\/[\w.-]+)*(#[\w.-]+)?$/.test(v);
        },
        message: props => `${props.value} is not a valid DID URI format!`
      }
    },
    document: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    register: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
    },
    did: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    type: {
      type: String,
      default: "user",
      enum: ["user", "service", "organization", "device"],
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "Created",
      enum: ["Created", "Active", "Revoked", "Expired"],
    },
  },
  {
    timestamps: true,
  }
);

const didModel = mongoose.model("DID", didSchema);
export default didModel;
