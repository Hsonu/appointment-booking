const mongoose = require("mongoose");
const url = "mongodb://localhost:27018/appoiment";

mongoose.connect(url);

const db = mongoose.connection;
db.on("connected" , ()=>{
console.log("mongoose connted successfully");
})
db.on("disconnected" , () =>{

    console.log("mongoose id dicsonnected");
})
db.on("error" ,(err) =>{
    console.log(err);
})

module.exports = db;