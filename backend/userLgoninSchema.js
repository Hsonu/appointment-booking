const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    useNumber: {
        type: String,
        required: true
    }

})

const user = mongoose.model("user", userSchema);
module.exports = user;

