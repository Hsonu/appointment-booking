const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    FullName: {
        type: String
    },
    mobileNumber: {
        type: Number
    },
    email: {
        type: String
    }
})

const booking = mongoose.model("booking" , bookingSchema)
module.exports = booking;
