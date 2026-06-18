// Global Crash Prevention
process.on("uncaughtException", (err) => {
    console.error("🔥 CRITICAL: Uncaught Exception caught:", err.stack || err);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("🔥 CRITICAL: Unhandled Rejection caught at:", promise, "reason:", reason);
});

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("./ping");
const express = require("express");
const app = express();
const port = process.env.PORT || 8080;
const db = require("./db");
const booking = require("./booking");
const addProducts = require("./addProductSchema");
const placeOrderData = require("./placeOrderSchema");
const Card = require("./cardSchema");
const login = require("./loginSchema");
const address = require("./addressSchema");
const user = require("./userLgoninSchema");
const Admin = require("./adminSchema");
const Complaint = require("./complaintSchema");
const cors = require("cors");
const Razorpar = require("razorpay");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// Validate Environment Variables
function validateEnv() {
    const required = [
        "MONGO_URI",
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
        "RAZORPAY_KEY_ID",
        "RAZORPAY_KEY_SECRET"
    ];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.warn("⚠️ WARNING: Missing Environment Variables:");
        missing.forEach(key => console.warn(`   - ${key}`));
        console.warn("⚠️ Features relying on these variables (like MongoDB, Razorpay, or Cloudinary) will fail.");
    } else {
        console.log("✅ All required environment variables are verified.");
    }
}
validateEnv();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));
app.use(express.static(path.join(__dirname, "../adminPanel")));
app.use("/admin", express.static(path.join(__dirname, "../adminPanel/order")));
const nodemailer = require("nodemailer");
const fileUpload = require("express-fileupload");

app.use(fileUpload({
    useTempFiles: true
}));
app.use(express.urlencoded({ extended: true }));
const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Safe Razorpay Initialization
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
        razorpay = new Razorpar({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        console.log("✅ Razorpay gateway initialized successfully.");
    } catch (err) {
        console.error("❌ Razorpay Initialization Error:", err.message);
    }
} else {
    console.warn("⚠️ Razorpay credentials missing. Payment gateway is disabled.");
}

app.post("/create-order", async (req, res, next) => {
    try {
        if (!razorpay) {
            return res.status(503).json({
                message: "Razorpay payment gateway is not configured or disabled on this server."
            });
        }
        const amount = Number(req.body.amount);
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ message: "Invalid amount value." });
        }
        const options = {
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: "receipt_" + Date.now()
        };
        const order = await razorpay.orders.create(options);
        res.status(200).json(order);
    } catch (err) {
        next(err);
    }
});



app.post("/verify-payment", (req, res) => {
    console.log("Verify Route Hit");
    if (!process.env.RAZORPAY_KEY_SECRET) {
        return res.status(503).json({
            success: false,
            message: "Payment gateway credentials are not configured on the server."
        });
    }
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
            success: false,
            message: "Missing required payment verification parameters."
        });
    }

    const sign = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
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
        message: "Invalid Payment Signature"
    });
});

app.get("/get-razorpay-key", (req, res) => {
    if (!process.env.RAZORPAY_KEY_ID) {
        return res.status(503).json({ error: "Razorpay key is not configured on the server." });
    }
    res.json({ key: process.env.RAZORPAY_KEY_ID });
});


app.get("/", (req, res) => {
    // res.send("server is live ")
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
})
// ── Auto-seed Owner account on server start ──────────────────────────────────
async function seedOwner() {
    try {
        let owner = await Admin.findOne({ role: "owner" });
        if (!owner) {
            owner = new Admin({ adminId: "owner", password: "owner@123", role: "owner" });
            await owner.save();
            console.log("✅ Owner account seeded  →  ID: owner  |  Pass: owner@123");
        } else if (!owner.password.startsWith("$2a$") && !owner.password.startsWith("$2b$")) {
            console.log("Migrating legacy owner password to encrypted format...");
            owner.password = owner.password; // Triggers pre-save hook
            owner.markModified("password");
            await owner.save();
        }
    } catch (e) { console.log("Owner seed error:", e.message); }
}
seedOwner();

// ── Owner Panel – serve HTML pages ───────────────────────────────────────────
app.get("/owner", (req, res) => {
    res.sendFile(path.join(__dirname, "../adminPanel/owner/owner-login.html"));
});
app.get("/owner/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "../adminPanel/owner/owner-dashboard.html"));
});
app.get("/owner/create-admin", (req, res) => {
    res.sendFile(path.join(__dirname, "../adminPanel/owner/create-admin.html"));
});
app.get("/owner/orders", (req, res) => {
    res.sendFile(path.join(__dirname, "../adminPanel/owner/owner-orders.html"));
});
app.get("/owner/reports", (req, res) => {
    res.sendFile(path.join(__dirname, "../adminPanel/owner/owner-reports.html"));
});

// ── Owner Login ───────────────────────────────────────────────────────────────
app.post("/owner/login", async (req, res) => {
    try {
        const { adminId, password } = req.body;
        const admin = await Admin.findOne({ adminId });
        if (!admin || admin.role !== "owner") {
            return res.status(401).json({ message: "Invalid owner credentials" });
        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid owner credentials" });
        }
        
        const sessionToken = crypto.randomBytes(32).toString("hex");
        admin.currentSessionToken = sessionToken;
        await admin.save();

        res.status(200).json({ 
            message: "Owner login successful", 
            adminId: admin.adminId, 
            role: "owner",
            sessionToken
        });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
});

// ── Owner: Create a new Admin (owner-only) ────────────────────────────────────
app.post("/owner/create-admin", requireOwner, async (req, res) => {
    try {
        const { adminId, password } = req.body;
        if (!adminId || !password) return res.status(400).json({ message: "Admin ID and password required" });
        const existing = await Admin.findOne({ adminId });
        if (existing) return res.status(409).json({ message: "Admin ID already exists" });
        const newAdmin = new Admin({ adminId, password, role: "admin" });
        await newAdmin.save();
        res.status(200).json({ message: "Admin created successfully", adminId });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
});

// ── Owner: Get all admins list ────────────────────────────────────────────────
app.get("/owner/admins", requireOwner, async (req, res) => {
    try {
        const admins = await Admin.find({ role: "admin" });
        res.json(admins);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
});

// ── Owner: Get ALL products from ALL admins ───────────────────────────────────
app.get("/owner/all-products", requireOwner, async (req, res) => {
    try {
        const products = await addProducts.find({});
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
});

// ── Owner: Get ALL orders from ALL admins ─────────────────────────────────────
app.get("/owner/all-orders", requireOwner, async (req, res) => {
    try {
        const orders = await placeOrderData.find({});
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
});

// ── Owner: Change own username and password ──────────────────────────────────
app.post("/owner/change-credentials", requireOwner, async (req, res) => {
    try {
        const { newAdminId, newPassword } = req.body;
        if (!newAdminId || !newPassword) {
            return res.status(400).json({ message: "New Owner ID and password are required" });
        }

        // Ensure new ID does not conflict with existing admins
        const existing = await Admin.findOne({ adminId: newAdminId });
        if (existing && existing.role !== "owner") {
            return res.status(409).json({ message: "Admin ID already exists" });
        }

        // Update database via document save to trigger pre-save hashing hook
        const ownerDoc = req.admin;
        if (ownerDoc) {
            ownerDoc.adminId = newAdminId;
            ownerDoc.password = newPassword;
            await ownerDoc.save();
        }
        res.status(200).json({ message: "Owner credentials updated successfully", adminId: newAdminId });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
});

// ── Owner: Toggle Admin Active Status ────────────────────────────────────────
app.post("/owner/toggle-admin-status", requireOwner, async (req, res) => {
    try {
        const { adminId, isActive } = req.body;
        if (!adminId || isActive === undefined) {
            return res.status(400).json({ message: "Admin ID and active status required" });
        }

        await Admin.updateOne({ adminId, role: "admin" }, { isActive });
        res.status(200).json({ message: `Admin status set to ${isActive}` });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
});

// ── Owner: Update Admin ID and Password ──────────────────────────────────────
app.post("/owner/update-admin", requireOwner, async (req, res) => {
    try {
        const { adminId, newAdminId, newPassword } = req.body;
        if (!adminId || !newAdminId || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Check conflict
        const existing = await Admin.findOne({ adminId: newAdminId });
        if (existing && existing.adminId !== adminId) {
            return res.status(409).json({ message: "Admin ID already exists" });
        }

        // Update database via document save to trigger pre-save hashing hook
        const adminDoc = await Admin.findOne({ adminId, role: "admin" });
        if (adminDoc) {
            adminDoc.adminId = newAdminId;
            adminDoc.password = newPassword;
            await adminDoc.save();
        }

        // Migrate database products/orders from old ID to new ID if ID was changed
        if (newAdminId !== adminId) {
            await addProducts.updateMany({ createdBy: adminId }, { createdBy: newAdminId });
            await placeOrderData.updateMany({ adminId: adminId }, { adminId: newAdminId });
        }

        res.status(200).json({ message: "Admin updated successfully" });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
});

// ── Owner: Delete Admin ──────────────────────────────────────────────────────
app.delete("/owner/delete-admin/:adminId", requireOwner, async (req, res) => {
    try {
        const adminId = req.params.adminId;
        await Admin.deleteOne({ adminId, role: "admin" });
        res.status(200).json({ message: "Admin account deleted" });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
});

// Interceptor middleware to block deactivated or non-existent admins
app.use(async (req, res, next) => {
    const adminId = req.headers["x-admin-id"];
    if (adminId) {
        try {
            const admin = await Admin.findOne({ adminId });
            if (!admin || admin.isActive === false) {
                return res.status(403).json({ message: "Account deactivated or invalid" });
            }
        } catch (err) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }
    next();
});

// Middleware to enforce admin access
async function requireAdmin(req, res, next) {
    const adminId = req.headers["x-admin-id"];
    const sessionToken = req.headers["x-session-token"];
    if (!adminId) {
        return res.status(401).json({ message: "Unauthorized: x-admin-id header is required." });
    }
    if (!sessionToken) {
        return res.status(401).json({ message: "Unauthorized: x-session-token header is required." });
    }
    try {
        const admin = await Admin.findOne({ adminId });
        if (!admin) {
            return res.status(403).json({ message: "Forbidden: Invalid Admin ID." });
        }
        if (admin.isActive === false) {
            return res.status(403).json({ message: "Forbidden: Admin account is deactivated." });
        }
        if (admin.currentSessionToken !== sessionToken) {
            return res.status(401).json({ message: "Session expired or logged in from another device." });
        }
        req.admin = admin;
        next();
    } catch (err) {
        next(err);
    }
}

async function requireOwner(req, res, next) {
    const ownerId = req.headers["x-owner-id"] || req.headers["x-admin-id"];
    const sessionToken = req.headers["x-session-token"];
    if (!ownerId) {
        return res.status(401).json({ message: "Unauthorized: Owner identification is required." });
    }
    if (!sessionToken) {
        return res.status(401).json({ message: "Unauthorized: x-session-token header is required." });
    }
    try {
        const admin = await Admin.findOne({ adminId: ownerId, role: "owner" });
        if (!admin) {
            return res.status(403).json({ message: "Access denied. Owner only." });
        }
        if (admin.currentSessionToken !== sessionToken) {
            return res.status(401).json({ message: "Session expired or logged in from another device." });
        }
        req.admin = admin;
        next();
    } catch (err) {
        next(err);
    }
}

// ── Admin Login (regular admins only) ────────────────────────────────────────
app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "../adminPanel/order/login.html"));
});

// Public register page is DISABLED – only owner can create admins
app.get("/admin/register", (req, res) => {
    res.status(403).send(`
        <html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#fff;margin:0;flex-direction:column;gap:12px;">
        <h2>🔒 Access Denied</h2>
        <p style="color:#94a3b8">Admin registration is only allowed by the Owner.</p>
        <a href="/owner" style="color:#6366f1">Owner Panel →</a>
        </body></html>
    `);
});

app.post("/admin/login", async (req, res) => {
    try {
        const { adminId, password } = req.body;
        if (!adminId || !password) {
            return res.status(400).json({ message: "Admin ID and password are required" });
        }
        const admin = await Admin.findOne({ adminId });
        if (!admin) {
            return res.status(401).json({ message: "Invalid admin ID or password" });
        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid admin ID or password" });
        }
        if (admin.isActive === false) {
            return res.status(403).json({ message: "Account is deactivated. Contact Owner." });
        }
        
        const sessionToken = crypto.randomBytes(32).toString("hex");
        admin.currentSessionToken = sessionToken;
        await admin.save();

        res.status(200).json({ 
            message: "Login successful", 
            adminId: admin.adminId, 
            role: admin.role,
            sessionToken
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error" });
    }
});
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

app.post("/addProduct", requireAdmin, async (req, res) => {
    try {

        console.log(req.body);
        console.log(req.files);

        // Handle multiple files: express-fileupload sends an array if multiple, single object if one
        let fileList = req.files.photo;
        if (!Array.isArray(fileList)) {
            fileList = [fileList];
        }

        // Upload all images to Cloudinary
        const uploadPromises = fileList.map(file => cloudinary.uploader.upload(file.tempFilePath));
        const uploadResults = await Promise.all(uploadPromises);
        const photoUrls = uploadResults.map(r => r.secure_url);

        console.log("Uploaded photos:", photoUrls);

        // Get the admin ID from request header (sent by admin panel)
        const createdBy = req.headers["x-admin-id"] || "admin";

        const addProductdata = {
            Productname: req.body.Productname,
            Category: req.body.Category,
            SubCategory: req.body.SubCategory,
            Units: req.body.Units,
            Rate: req.body.Rate,
            description: req.body.description,
            photo: photoUrls[0],         // First image (backward compat)
            photos: photoUrls,           // All images
            gst: req.body.gst,
            discount: req.body.discount ? Number(req.body.discount) : 0,
            createdBy
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
    try {
        const adminId = req.headers["x-admin-id"];
        let query = {};
        if (adminId) {
            // Also include old products that have no createdBy field (legacy data = belongs to "admin")
            query.$or = [
                { createdBy: adminId },
                ...(adminId === "admin" ? [{ createdBy: { $exists: false } }, { createdBy: null }] : [])
            ];
        }
        const viewProduct = await addProducts.find(query);
        res.json(viewProduct);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})
//delete Product

app.delete("/DelProduct/:id", requireAdmin, async (req, res) => {
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

app.put("/updateProduct/:id", requireAdmin, async (req, res) => {
    try {
        const updateDataID = req.params.id;
        const { Productname, Category, SubCategory, description } = req.body;

        let photoUrls = [];
        if (req.files && req.files.photo) {
            let fileList = req.files.photo;
            if (!Array.isArray(fileList)) {
                fileList = [fileList];
            }
            const uploadPromises = fileList.map(file => cloudinary.uploader.upload(file.tempFilePath));
            const uploadResults = await Promise.all(uploadPromises);
            photoUrls = uploadResults.map(r => r.secure_url);
        }

        // Parse existing photos to keep (sent as JSON string from frontend)
        let existingPhotos = [];
        if (req.body.existingPhotos) {
            try { existingPhotos = JSON.parse(req.body.existingPhotos); } catch (e) { }
        }

        // Combine existing kept photos + newly uploaded photos
        const allPhotos = [...existingPhotos, ...photoUrls];

        const updateFields = {
            description,
            Productname,
            Category,
            SubCategory,
            Units: req.body.Units !== undefined ? Number(req.body.Units) : undefined,
            Rate: req.body.Rate !== undefined ? Number(req.body.Rate) : undefined,
            gst: req.body.gst !== undefined ? Number(req.body.gst) : undefined,
            discount: req.body.discount !== undefined ? Number(req.body.discount) : undefined
        };

        if (allPhotos.length > 0) {
            updateFields.photo = allPhotos[0];   // First image (backward compat)
            updateFields.photos = allPhotos;      // All images
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
        const sessionToken = req.headers["x-session-token"];
        console.log(userNumber);

        let chackUser = await user.findOne({
            useNumber: userNumber
        });

        if (!chackUser) {
            return res.status(401).json({
                message: "Please login"
            })
        }

        if (!sessionToken || chackUser.currentSessionToken !== sessionToken) {
            return res.status(401).json({
                message: "Session expired or logged in from another device."
            })
        }

        // Resolve which admin owns this product so order goes to the right admin
        let adminId = "admin";
        if (req.body.productName) {
            const productRecord = await addProducts.findOne({ Productname: req.body.productName });
            if (!productRecord) {
                return res.status(404).json({ message: "Product not found" });
            }
            if (productRecord.Units < req.body.qty) {
                return res.status(400).json({ message: `Insufficient stock. Only ${productRecord.Units} units available.` });
            }
            productRecord.Units -= req.body.qty;
            await productRecord.save();

            if (productRecord.createdBy) {
                adminId = productRecord.createdBy;
            }
        }

        const placeOrderDataBody = { ...req.body, adminId };
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
    try {
        const adminId = req.headers["x-admin-id"];
        const userNumber = req.headers["x-user-number"];
        const sessionToken = req.headers["x-session-token"];
        let query = {};

        if (adminId) {
            // Admin order retrieval
            const admin = await Admin.findOne({ adminId });
            if (!admin || admin.currentSessionToken !== sessionToken) {
                return res.status(401).json({ message: "Session expired or logged in from another device." });
            }
            query.$or = [
                { adminId: adminId },
                ...(adminId === "admin" ? [{ adminId: { $exists: false } }, { adminId: null }] : [])
            ];
        } else if (userNumber) {
            // Customer order retrieval
            const customer = await user.findOne({ useNumber: userNumber });
            if (!customer || customer.currentSessionToken !== sessionToken) {
                return res.status(401).json({ message: "Session expired or logged in from another device." });
            }
            query.$or = [
                { customerMobileNumber: userNumber },
                { useNumber: userNumber }
            ];
        } else {
            // Unauthenticated - block query access
            return res.status(401).json({ message: "Unauthorized: Missing administrative or customer identification headers." });
        }

        const viewDataPlaceOrder = await placeOrderData.find(query);
        res.json(viewDataPlaceOrder);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//status Single data
app.get("/statusSingleData/:id", async (req, res) => {
    const statusparams = req.params.id;
    const idStatuse = await placeOrderData.findById(statusparams);
    res.json(idStatuse)
})

// Customer Cancel Order
app.post("/cancelOrder/:id", async (req, res) => {
    try {
        const orderId = req.params.id;
        const { reason } = req.body;

        const order = await placeOrderData.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const currentStatus = (order.orderStatus || "").toLowerCase();
        if (currentStatus === "delivered" || currentStatus === "delivered a replacement") {
            return res.status(400).json({ message: "Delivered orders cannot be cancelled." });
        }
        if (currentStatus === "cancelled" || currentStatus === "order cancelled") {
            return res.status(400).json({ message: "Order is already cancelled." });
        }

        const previousStatus = order.orderStatus;
        order.orderStatus = "Cancelled";
        order.cancelReason = reason || "Cancelled by customer";
        await order.save();

        // Restore stock
        const isCancelledOrReturned = (status) => {
            const s = (status || "").toLowerCase();
            return s.includes("cancel") || s.includes("return");
        };

        if (!isCancelledOrReturned(previousStatus)) {
            await addProducts.updateOne(
                { Productname: order.productName },
                { $inc: { Units: order.qty } }
            );
        }

        res.status(200).json({ message: "Order cancelled successfully", order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Submit Order Complaint
app.post("/submitComplaint", async (req, res) => {
    try {
        const { orderId, customerMobileNumber, productName, complaintText } = req.body;
        if (!orderId || !customerMobileNumber || !productName || !complaintText) {
            return res.status(400).json({ message: "All complaint fields are required." });
        }

        const newComplaint = new Complaint({
            orderId,
            customerMobileNumber,
            productName,
            complaintText,
            status: "Pending"
        });

        const savedComplaint = await newComplaint.save();
        res.status(200).json({ message: "Complaint filed successfully", complaint: savedComplaint });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Complaints for a Single Order
app.get("/orderComplaints/:orderId", async (req, res) => {
    try {
        const complaints = await Complaint.find({ orderId: req.params.orderId });
        res.json(complaints);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all complaints for admin
app.get("/admin/allComplaints", requireAdmin, async (req, res) => {
    try {
        const complaints = await Complaint.find({}).sort({ createdAt: -1 });
        res.json(complaints);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update complaint status
app.put("/updateComplaintStatus/:id", requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: "Status is required." });
        }
        const updated = await Complaint.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ message: "Complaint not found." });
        }
        res.status(200).json({ message: "Complaint status updated successfully", complaint: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Customer return order request
app.post("/returnOrder/:id", async (req, res) => {
    try {
        const orderId = req.params.id;
        const { returnType, returnReason, refundPaymentDetails } = req.body;

        if (!returnType || !returnReason) {
            return res.status(400).json({ message: "Return type and reason are required." });
        }

        const order = await placeOrderData.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const currentStatus = (order.orderStatus || "").toLowerCase();
        if (currentStatus !== "delivered" && currentStatus !== "delivered a replacement") {
            return res.status(400).json({ message: "Only delivered orders can be returned." });
        }

        if ((order.exchangeCount || 0) >= 3) {
            return res.status(400).json({ message: "Return limit reached (Maximum 3 exchanges allowed)." });
        }

        order.orderStatus = "Return Requested";
        order.returnType = returnType;
        order.returnReason = returnReason;
        order.refundPaymentDetails = returnType === "Refund" ? refundPaymentDetails : "";
        await order.save();

        res.status(200).json({ message: "Return request submitted successfully", order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Customer cancel return request
app.post("/cancelReturn/:id", async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await placeOrderData.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const currentStatus = (order.orderStatus || "").toLowerCase();
        if (currentStatus !== "return requested") {
            return res.status(400).json({ message: "Only return requests that are pending can be cancelled." });
        }

        order.orderStatus = "Delivered";
        order.returnType = "";
        order.returnReason = "";
        order.refundPaymentDetails = "";
        await order.save();

        res.status(200).json({ message: "Return request cancelled successfully", order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


//updateorderStatus

app.put("/updateOrderStatus/:id", requireAdmin, async (req, res) => {
    try {
        const updateOrderStatus = req.params.id;
        const finddatabaseid = await placeOrderData.findById(updateOrderStatus);
        if (!finddatabaseid) {
            return res.status(404).json({ message: "Order not found" });
        }

        const updateStatus = req.body;
        const previousStatus = finddatabaseid.orderStatus;
        const newStatus = updateStatus.status;

        if (previousStatus !== newStatus) {
            if (previousStatus === "Return Requested" && finddatabaseid.returnType === "Exchange") {
                if (newStatus === "Delivered a replacement" || newStatus === "Reprocess") {
                    finddatabaseid.exchangeCount = (finddatabaseid.exchangeCount || 0) + 1;
                }
            }

            const isCancelledOrReturned = (status) =>
                status === "Cancelled" ||
                status === "Returned" ||
                status === "Return Completed" ||
                status === "Refund Accepted" ||
                status === "Refund Completed" ||
                status === "Not Delivered";

            if (isCancelledOrReturned(newStatus) && !isCancelledOrReturned(previousStatus)) {
                // Restore stock
                await addProducts.updateOne(
                    { Productname: finddatabaseid.productName },
                    { $inc: { Units: finddatabaseid.qty } }
                );
            } else if (!isCancelledOrReturned(newStatus) && isCancelledOrReturned(previousStatus)) {
                // Transitioning back to active - recheck and deduct stock
                const productRecord = await addProducts.findOne({ Productname: finddatabaseid.productName });
                if (productRecord) {
                    if (productRecord.Units < finddatabaseid.qty) {
                        return res.status(400).json({ message: `Cannot change status. Insufficient stock (only ${productRecord.Units} available).` });
                    }
                    productRecord.Units -= finddatabaseid.qty;
                    await productRecord.save();
                }
            }
        }

        finddatabaseid.orderStatus = newStatus;
        await finddatabaseid.save();
        res.json({ message: "working" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

        // Generate secure 6-digit OTP to match UI expectations
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

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

        const sessionToken = crypto.randomBytes(32).toString("hex");

        if (existingUser) {
            existingUser.currentSessionToken = sessionToken;
            await existingUser.save();
            return res.status(200).json({
                message: "Ueser Alredy Exists ",
                user: existingUser,
                sessionToken
            });
        }
        let userResponse = new user({
            useNumber: uesrNumberIn,
            currentSessionToken: sessionToken

        });
        let save = await userResponse.save()
        return res.status(200).json({
            message: "New User Saved",
            data: save,
            sessionToken
        })

    }
    catch (err) {
        res.status(500).json({
            message: err.message,
        })
    }


})

//admin order status
app.get("/orderStatusfilter", requireAdmin, async (req, res) => {
    try {
        let { fromDate, toDate } = req.query;
        const adminId = req.headers["x-admin-id"];

        let dateFilter = {
            orderDate: {
                $gte: new Date(fromDate),
                $lte: new Date(toDate + "T23:59:59.999Z")
            }
        };

        let query;
        if (adminId) {
            // Also include old orders with no adminId (legacy data = belongs to "admin")
            const adminFilter = adminId === "admin"
                ? { $or: [{ adminId: adminId }, { adminId: { $exists: false } }, { adminId: null }] }
                : { adminId: adminId };
            query = { ...dateFilter, ...adminFilter };
        } else {
            query = dateFilter;
        }

        let response = await placeOrderData.find(query);
        res.status(200).json(response)

    } catch (err) {
        res.status(500).json("internal server error")
        console.log(err);
    }
})

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("❌ Express caught unhandled runtime error:", err.stack || err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});

app.listen(port, () => {
    console.log(`server is live on ${port}`);

});

console.log(
    (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + " MB"
);