import mongoose from "mongoose";

const emailSchema = new mongoose.Schema(
    {
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
    },
    {
        timestamps: true,
    }
);

const emailModel = mongoose.model("Email", emailSchema);

export default emailModel;