const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
    name: {
        type: String
    },
    phone: {
        type: String
    },
    email: {
        type: String,
        default: ""
    },
    address: {
        fullAddress: {
            type: String,
            default: ""
        },
        city: {
            type: String,
            default: ""
        },
        district: {
            type: String,
            default: ""
        },
        state: {
            type: String,
            default: ""
        },
        pinCode: {
            type: String,
            default: ""
        }

    }
})

const Address = mongoose.model("Address", addressSchema)
module.exports = Address;