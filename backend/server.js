const express = require("express");
const app = express();
const port = 8080;
const db = require("./db")
const booking = require("./booking");
const addProducts = require("./addProductSchema");
const placeOrderData = require("./placeOrderSchema");
const Card = require("./cardSchema");
const login = require("./loginSchema");
const address = require("./addressSchema")
const cors = require("cors");
app.use(cors());
app.use(express.json());
const path = require("path");
app.use(express.static(path.join(__dirname, "../frontend")));
app.use(express.static(path.join(__dirname, "../adminPanel")))
const nodemailer = require("nodemailer");
const fileUpload = require("express-fileupload");
// fileUpload({
//     useTempFiles: true
// })
app.use(fileUpload({
    useTempFiles: true
}));
app.use(express.urlencoded({ extended: true }));
const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: 'drfdoy1od',
    api_key: '773861696165423',
    api_secret: 'wzsOT_E4C6oWKIEncQsu0w1f4x8'
});

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
// admin Login
app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "../adminPanel/order/addProduct.html"))
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
    try {

        console.log(req.body);
        console.log(req.files);

        const fille = req.files.photo;

        const jpgReiult = await cloudinary.uploader.upload(
            fille.tempFilePath
        );
        console.time("API");
        console.timeEnd("API");

        console.log(jpgReiult);

        const addProductdata = {
            Productname: req.body.Productname,
            Category: req.body.Category,
            SubCategory: req.body.SubCategory,
            Units: req.body.Units,
            Rate: req.body.Rate,
            description: req.body.description,
            photo: jpgReiult.secure_url
        };

        console.log(addProductdata);

        const viewaddPoduct = new addProducts(addProductdata);

        const responseaddProduct = await viewaddPoduct.save();

        console.log("✅ data saved successfully ✅");

        res.status(200).json(responseaddProduct);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            message: err.message
        });
    }
});
//view all product

app.get("/addProduct", async (req, res) => {
    const viewProduct = await addProducts.find();
    res.json(viewProduct);
})
//delete Product

app.delete("/DelProduct/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const deleted = await addProducts.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: "Product not Found" })
        }
        res.status(200).json({ message: "Data Delete SuccessFully" })

    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
})

app.put("/updateProduct/:id", async (req, res) => {
    try {
        const updateDataID = req.params.id;
        const { Productname, Category, SubCategory, Units, Rate, description } = req.body;
        const updateProductName = await addProducts.findByIdAndUpdate(updateDataID,
            {
                description,
                Productname,
                Category,
                // SubCategory,
                Units,
                Rate
            },
            { new: true })
        if (!updateProductName) {
            return res.status(404).json({
                message: "Product Not Found"
            })
        }
        res.status(200).json({
            message: "Product Updated Successfully",
            data: updateProductName
        })
    }
    catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({
                message: "Duplicate Category And subCategory not allowed"
            })
        }
        res.status(500).json({
            error: err.message
        })
    }
})

app.get("/singleProduct/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const singleProduct = await addProducts.findById(id);
        res.json(singleProduct);
    }
    catch (err) {

        res.status(500).json({
            error: err.message
        });

    }
})

//Place Order
app.post("/placeOrder", async (req, res) => {
    try {
        const placeOrderDataBody = req.body;
        const viewPlaceOrderData = new placeOrderData(placeOrderDataBody);
        const PlaceOrderResponse = await viewPlaceOrderData.save();
        console.log(placeOrderData);
        res.status(200).json(PlaceOrderResponse);

    }
    catch (err) {
        res.status(500).json("internal server error");
        console.log(err);
    }
})

app.get("/viwePlaceOrder", async (req, res) => {

    const viewDataPlaceOrder = await placeOrderData.find();
    res.json(viewDataPlaceOrder);
});

//status Single data
app.get("/statusSingleData/:id", async (req, res) => {
    const statusparams = req.params.id;
    const idStatuse = await placeOrderData.findById(statusparams);
    res.json(idStatuse)
})

//updateorderStatus

app.put("/updateOrderStatus/:id", async (req, res) => {
    const updateOrderStatus = req.params.id;
    const finddatabaseid = await placeOrderData.findById(updateOrderStatus)
    const updateStatus = req.body;
    console.log(finddatabaseid);
    finddatabaseid.orderStatus = updateStatus.status;
    await finddatabaseid.save()


    res.json({
        message: "working"
    })

})

// add card

app.post("/Card", async (req, res) => {
    try {
        const addCardData = req.body;
        const addCardDataall = new Card(addCardData)
        const saveCard = await addCardDataall.save();
        console.log(saveCard);
        res.status(200).json(saveCard);
    }
    catch (err) {
        res.status(500).json("Internal Server Error")
        console.log(err);

    }
})

//view addCardDate

app.get("/Card", async (req, res) => {
    try {
        const viewAllData = await Card.find();
        res.status(200).json(viewAllData);
    }
    catch (err) {
        res.status(500).json("interal Server Error")
        console.log(err);

    }
})
//delete card

app.delete("/card/:id", async (req, res) => {

    try {
        const deleteCardData = await Card.findByIdAndDelete(req.params.id);
        res.status(200).json({
            message: "Data Delete SuccFullY",
            deleteCardData
        })

    }
    catch (err) {
        res.status(500).json("Interal Server Error")
        console.log(err);

    }

})

//login-otp

// app.post("/send-otp", async (req, res) => {
//     try {

//     }
//     catch (err) {

//     }


// })
app.post("/send-otp", async (req, res) => {
    try {
        const { number } = req.body;

        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        let user = await login.findOne({ number });

        if (!user) {
            user = new login({
                number,
                otp
            });
        } else {
            user.otp = otp;
        }

        await user.save();

        res.json({
            message: "OTP Sent",
            otp
        });

    } catch (err) {
        res.status(500).json({
            message: "Server Error", err
        });
        console.log(err);

    }
});


//address

app.post("/addAdress", async (req, res) => {

    try {
        const addressData = req.body;
        const addressResponse = new Address(addressData);
        const saveaddress = await addressResponse.save();
        console.log(saveaddress);
        res.status(200).json({
            message: "address Saved"
        })
    }
    
    catch (err) {
        res.status(500).json("interal server Error")

    }

})

app.listen(port, () => {
    console.log(`server is live on ${port}`);

})

console.log(
    (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + " MB"
);