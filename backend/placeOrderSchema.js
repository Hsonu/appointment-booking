
const mongoose = require("mongoose");

const placeOrderDataSchema = new mongoose.Schema({

    customerName: {
        type: String
    },
    customerMobileNumber: {
        type: Number
    },
    customerAdd: {
        type: String
    },
    productName: {
        type: String
    },
    rate: {
        type: Number
    },
    photo: {
        type: String
    },
    description: {
        type: String,
    },
    orderStatus: {
        type: String,
        default: "Order Placed"
    },
    paymentMethod: {
        type: String
    }
});

const placeOrderData = mongoose.model("placeOrderData", placeOrderDataSchema);

module.exports = placeOrderData;