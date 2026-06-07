
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
    totalAmount: {
        type: Number
    },
    qty: {
        type: Number,
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
    },
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
    orderDate: {
        type: Date,
        default: Date.now
    },
    gst: {
        type: Number
    },
    gstAmount: {
        type: Number
    },
    withGstTotalAmount: {
        type: Number
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
});

const placeOrderData = mongoose.model("placeOrderData", placeOrderDataSchema);

module.exports = placeOrderData;