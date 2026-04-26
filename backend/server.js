const express = require("express");
const app = express();
const port = 8080;
const db = require("./db")
const booking = require("./booking");
const cors = require("cors");
app.use(cors());
app.use(express.json());
const path = require("path");
app.use(express.static(path.join(__dirname,"../frontend")));


app.get("/", (req, res) => {
    // res.send("server is live ")
    res.sendFile(path.join(__dirname,"../frontend/index.html"));
})
app.post("/newClient", async (req, res) => {
    try {
        const data = req.body;
        const viewData = new booking(data);
        const response = await viewData.save();
        console.log("✅date saved succefully✅");
        res.status(200).json(response);
    }
    catch (error) {
        res.status(500).json("interal server error")
        console.log(error);

    }
})

app.listen(port, () => {
    console.log(`server is live on ${port}`);

})