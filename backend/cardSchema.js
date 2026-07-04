const mongoose = require("mongoose");


const cardSchema = new mongoose.Schema({
    productName: {
        type: String
    },
    mobileNumber: {
        type: String
    },
    rate: {
        type: String
    },
    photo: {
        type: String
    }

})

const Card = mongoose.model("Card", cardSchema)

module.exports = Card;