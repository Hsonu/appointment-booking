const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");

const url = process.env.MONGO_URI;

if (!url) {
    console.error("❌ CRITICAL ERROR: MONGO_URI is not set in the environment variables!");
} else {
    console.log("⏳ Connecting to MongoDB Atlas...");
    mongoose.connect(url)
        .then(() => {
            console.log("✅ MongoDB connected successfully to Atlas");
        })
        .catch((err) => {
            console.error("❌ MongoDB connection error on startup:", err.message);
        });
}

const db = mongoose.connection;

db.on("connected", () => {
    console.log("🟢 mongoose connected successfully");
});

db.on("disconnected", () => {
    console.warn("🟡 mongoose disconnected");
});

db.on("error", (err) => {
    console.error("🔴 mongoose connection error:", err.message);
});

module.exports = db;