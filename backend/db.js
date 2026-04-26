const mongoose = require("mongoose");
// const url = "mongodb://localhost:27018/appoiment";
const url = "mongodb+srv://sonurajsonuraj4515_db_user:Sonu%40123@cluster0.cxyxqda.mongodb.net/mydb";

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