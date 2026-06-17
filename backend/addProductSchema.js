const mongoose = require("mongoose");

const addProductSchema = new mongoose.Schema({
    Productname: {
        type: String,
        required: true
    },
    Category: {
        type: String,
        required: true
    },
    SubCategory: {
        type: String
    },
    Units: {
        type: Number,
        required: true
    },
    Rate: {
        type: Number,
        required: true
    },
    description: {
        type: String
    },
    photo: {
        type: String
    },
    // Multiple images support
    photos: {
        type: [String],
        default: []
    },
    gst: {
        type: Number
    },
    discount: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: String,
        default: "admin"
    }
});

const addProducts = mongoose.model("addProduct", addProductSchema);
module.exports = addProducts;
