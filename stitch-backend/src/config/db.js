const mongoose = require("mongoose");
const runMigration = require("./migrate");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");
    
    // Run sellerId mismatch migrations
    await runMigration();

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB error:", err);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
}; 

module.exports = connectDB;
