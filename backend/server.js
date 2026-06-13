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
const user = require("./userLgoninSchema")
const cors = require("cors");
const Razorpar = require("razorpay")
app.use(cors());
app.use(express.json());
const path = require("path");
app.use(express.static(path.join(__dirname, "../frontend")));
app.use(express.static(path.join(__dirname, "../adminPanel")))
app.use("/admin", express.static(path.join(__dirname, "../adminPanel/order")))
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
//Payment
const razorpay = new Razorpar({
    key_id: "rzp_test_T009i1fdo0TocB",
    key_secret: "D8kdYPrci3teHsWfyuqp6Eii"

})
console.log(process.razorpay);
app.post("/create-order", async (req, res) => {
    try {
        const options = {
            amount: req.body.amount * 100,
            currency: "INR",
            receipt: "receipt_" + Date.now()
        };
        const order = await razorpay.orders.create(options)
        res.status(200).json(order)
        console.log(options)
    }

    catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Order Creation Failed"
        })
    }
})
const crypto = require("crypto");

app.post("/verify-payment", (req, res) => {
    console.log("Verify Route Hit");
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    } = req.body;

    const sign = crypto
        .createHmac("sha256", "D8kdYPrci3teHsWfyuqp6Eii")
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

    if (sign === razorpay_signature) {
        return res.json({
            success: true,
            message: "Payment Verified"
        });
    }

    res.status(400).json({
        success: false,
        message: "Invalid Payment"
    });
});


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
            photo: jpgReiult.secure_url,
            gst: req.body.gst
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
        const { Productname, Category, SubCategory, description } = req.body;
        
        let photoUrl = undefined;
        if (req.files && req.files.photo) {
            const fille = req.files.photo;
            const jpgResult = await cloudinary.uploader.upload(fille.tempFilePath);
            photoUrl = jpgResult.secure_url;
        }

        const updateFields = {
            description,
            Productname,
            Category,
            SubCategory,
            Units: req.body.Units !== undefined ? Number(req.body.Units) : undefined,
            Rate: req.body.Rate !== undefined ? Number(req.body.Rate) : undefined,
            gst: req.body.gst !== undefined ? Number(req.body.gst) : undefined
        };

        if (photoUrl) {
            updateFields.photo = photoUrl;
        }

        const updateProductName = await addProducts.findByIdAndUpdate(
            updateDataID,
            updateFields,
            { new: true }
        );

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
        let userNumber = req.body.useNumber;
        console.log(userNumber);


        let chackUser = await user.findOne({
            useNumber: userNumber
        });

        if (!chackUser) {
            return res.status(401).json({
                message: "Please login"
            })
        }
        const placeOrderDataBody = req.body;
        const viewPlaceOrderData = new placeOrderData(placeOrderDataBody);
        const PlaceOrderResponse = await viewPlaceOrderData.save();
        console.log(req.body);
        res.status(200).json(PlaceOrderResponse);
        console.log(req.body)

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

app.post("/address", async (req, res) => {

    try {
        const addressData = req.body;
        const addressResponse = new address(addressData);
        const saveaddress = await addressResponse.save();
        console.log(saveaddress);
        res.status(200).json({
            message: "address Saved",
            data: saveaddress
        })
    }

    catch (err) {
        res.status(500).json("interal server Error")
        console.log(err);

    }

})
//viwe all address
app.get("/address", async (req, res) => {
    try {
        let viweaddress = await address.find();
        res.status(200).json(viweaddress);
    }
    catch (err) {
        res.status(500).json("interal server error")
        console.log(err);
    }
})


//update address
app.put("/address/:phone", async (req, res) => {

    try {
        let phone = req.params.phone;
        let updateData = req.body;
        // console.log(req.params.phone);

        let findaddress = await address.findOneAndUpdate({ phone: phone },
            updateData,
            { new: true }
        );


        res.status(200).json({
            message: "address Successfully",
            data: findaddress
        })
    } catch (err) {
        res.status(500).json("intranal Server Error")
        console.log(err);

    }

})


// new user


app.post("/newUser/:userNumber", async (req, res) => {

    try {
        let uesrNumberIn = req.params.userNumber;
        let existingUser = await user.findOne({
            useNumber: uesrNumberIn
        });

        if (existingUser) {
            return res.status(200).json({
                message: "Ueser Alredy Exists ",
                user: existingUser
            });
        }
        let userResponse = new user({
            useNumber: uesrNumberIn

        });
        let save = await userResponse.save()
        return res.status(200).json({
            message: "New User Saved",
            data: save
        })

    }
    catch (err) {
        res.status(500).json({
            message: err.message,
        })
    }


})

//admin order status
app.get("/orderStatusfilter", async (req, res) => {
    try {

        let { fromDate, toDate } = req.query;
        let response = await placeOrderData.find({
            orderDate: {
                $gte: new Date(fromDate),
                $lte: new Date(toDate + "T23:59:59.999Z")
            }
        });
        res.status(200).json(response)


    } catch (err) {
        res.status(500).json("internal server error")
        console.log(err);

    }
})

app.listen(port, () => {
    console.log(`server is live on ${port}`);

});

console.log(
    (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + " MB"
);