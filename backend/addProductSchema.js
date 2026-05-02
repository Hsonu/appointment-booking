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
        type: String,
        // required: true,
        // unique: true
    },
    Units: {
        type: Number,
        required: true
    },
    Rate: {
        type: Number,
        required: true
    },
    description:{
        type : String,
        required :true
    }
})
const addProducts = mongoose.model("addProduct", addProductSchema);

module.exports = addProducts;
