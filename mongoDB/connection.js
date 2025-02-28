import mongoose from "mongoose";

const mongoDBConnect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      connectTimeoutMS: 10000, // Add connection timeout
      socketTimeoutMS: 45000, // Add socket timeout
    });
    console.log("MongoDB - Connected");
  } catch (error) {
    console.error("Error - MongoDB Connection:", error.message);
    // In production, you may want to exit or retry
    // process.exit(1);
  }
};

export default mongoDBConnect;
