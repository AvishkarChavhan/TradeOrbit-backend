require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");

const cors = require("cors");
const { holdingsModel } = require("./models/holdingsModel.js");
const { positionModel } = require("./models/positionModel.js");
const OrdersModel = require("./models/OrdersModel.js")
const UserModel = require("./models/UserModel.js")
const PORT =3000; 
const mongo_url = process.env.MONGO_URL;

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

app.get("/allHoldings", async (req, res) => {
    let allHoldings = await holdingsModel.find({});//its find all the data 
    res.json(allHoldings);//convert it into json format.
});
app.get("/allPositions", async (req, res) => {
    let allPositions = await positionModel.find({});
    res.json(allPositions);
});
app.post("/newOrder", async (req, res) => {
    let newOrder = new OrdersModel({
        name: req.body.name,
        qty: req.body.qty,
        price: req.body.price,
        mode: req.body.mode,
    });
    newOrder.save();
    res.send("order saved ")

});
app.get("/allOrders", async (req, res) => {
    let allOrders = await OrdersModel.find().sort({ _id: -1 });
    res.json(allOrders);
})


app.delete("/deleteOrder/:id", async (req, res) => {
    try {
        const id = req.params.id;
        await OrdersModel.findByIdAndDelete(id);
        res.send("Order deleted");
    } catch (err) {
        res.status(500).json({ error: "Failed to delete order" });
    }
});



app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
    try {
        // Basic validation
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }
        // Check for duplicate user
        const existingUser = await UserModel.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "Username already exists" });
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword);
        // Create and save user
        const newUser = new UserModel({
            username,
            email,
            password: hashedPassword,
        });
        await newUser.save();
        return res.status(201).json({ success: true, message: "User registered successfully" });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await UserModel.findOne({ username });
  //if wrong username
  if (!user) {
    return res.status(401).json({ success: false, message: "User not found" });
  }
  //check password
  const isMatch = await bcrypt.compare(password, user.password); 
  if (!isMatch) {
    return res.status(401).json({ success: false, message: "Invalid password" });
  }
  return res.json({ success: true, message: "Login successful" });
});



app.post("/logout", (req, res) => {
  // Since you’re not using sessions or tokens, just respond
  return res.json({ success: true, message: "Logout successful" });
});





app.listen(PORT, () => {
    try {
        console.log(`  server is running on port ${PORT}`);
        mongoose.connect(mongo_url);
        console.log("  DB connected ");
    } catch (e) {
        console.log("error", e);

    }

})