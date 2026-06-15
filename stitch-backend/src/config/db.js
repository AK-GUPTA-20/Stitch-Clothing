const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB error:", err);
    });

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    // Auto-seed admin user for local and production levels
    const User = require("../models/User");
    const adminEmail = process.env.ADMIN_EMAIL || "admin123@gmail.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin";
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = new User({
        firstName: "System",
        lastName: "Admin",
        email: adminEmail,
        password: adminPassword, 
        role: "admin",
        emailVerified: true,
      });
      await admin.save();
      console.log(`Auto-seeded admin account: ${adminEmail}`);
    } else if (admin.role !== "admin") {
      admin.role = "admin";
      await admin.save();
      console.log(`Restored admin role for ${adminEmail}`);
    }
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
}; 

module.exports = connectDB;
