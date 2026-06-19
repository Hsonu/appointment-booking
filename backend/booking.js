const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    FullName: {
        type: String,
        required: true
    },
    mobileNumber: {
        type: Number,
        required: true
    },
    email: {
        type: String,
        required: true,
        match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, "Please fill a valid email address"]
    }
})

const booking = mongoose.model("booking" , bookingSchema)
module.exports = booking;
