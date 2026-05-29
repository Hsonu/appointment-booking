const mongoose = require("mongoose");

const loginSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true,
        unique: true
    },
    otp: {
        type: String
    }
})

const Login = mongoose.model("Login", loginSchema);
module.exports = Login;