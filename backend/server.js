const express = require("express");
const app = express();
const port = 8080;
const db = require("./db")
const booking = require("./booking");
const addProducts = require("./addProductSchema");
const cors = require("cors");
app.use(cors());
app.use(express.json());
const path = require("path");
app.use(express.static(path.join(__dirname, "../frontend")));
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: "sonurajsonuraj4515@gmail.com",
        pass: "iznitdhhvsbwrmty"
    }
})


app.get("/", (req, res) => {
    // res.send("server is live ")
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
})
app.post("/newClient", async (req, res) => {
    try {
        const data = req.body;
        const viewData = new booking(data);
        const response = await viewData.save();
        console.log("✅date saved succefully✅");
        res.status(200).json(response);
        //email send 
        // await
        transporter.sendMail({
            from: "sonurajsonuraj4515@gmail.com",
            to: "sonurajsonuraj4515@gmail.com",
            subject: "New Appoinment Booking",
            html: `
                <h2>New Booking</h2>
                <p><b>Name: </b>${data.FullName}</p>
                <p><b>Phone: </b>${data.mobileNumber}</p>
                <p><b>Email: </b>${data.email}</p>
            
            `
        })
            .then((info) => {
                console.log("Email sent ssuccesfuly")

            })
            .catch((err) => {
                console.log(err);

            })

    }
    // console.log("Email sent ssuccesfuly");

    // res.status(200).json(response);

    catch (error) {
        res.status(500).json("interal server error")
        console.log(error);

    }
})

app.post("/addProduct", async (req, res) => {
    try{
    const addProductdata = req.body;
    const viewaddPoduct = new addProducts(addProductdata);
    const responseaddProduct = await viewaddPoduct.save()
    console.log("✅date saved succefully✅");
    res.status(200).json(responseaddProduct);
    }
    catch(err){
        res.status(500).json("internal server error")
        console.log(err);
        
    }

})

//view all product

app.get("/addProduct" , async (req ,res)=>{
    const viewProduct = await addProducts.find();
    res.json(viewProduct);
})

app.listen(port, () => {
    console.log(`server is live on ${port}`);

})