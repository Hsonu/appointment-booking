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

// Drop stale unique email_1 index from users collection if it exists
db.once("open", async () => {
    try {
        const collections = await db.db.listCollections({ name: "users" }).toArray();
        if (collections.length > 0) {
            const indexes = await db.db.collection("users").indexes();
            const hasEmailIndex = indexes.some(idx => idx.name === "email_1");
            if (hasEmailIndex) {
                console.log("⚠️ Stale email_1 index found on users collection. Dropping it...");
                await db.db.collection("users").dropIndex("email_1");
                console.log("✅ Successfully dropped stale email_1 index.");
            }
        }
    } catch (err) {
        console.error("❌ Error checking/dropping stale users email index:", err.message);
    }
});

module.exports = db;