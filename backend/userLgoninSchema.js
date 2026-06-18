const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    useNumber: {
        type: String,
        required: true
    },
    currentSessionToken: {
        type: String,
        default: ""
    }
});

const user = mongoose.model("user", userSchema);
module.exports = user;

