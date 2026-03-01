require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cors = require("cors");

// Models
const { holdingsModel } = require("./models/holdingsModel.js");
const { positionModel } = require("./models/positionModel.js");
const OrdersModel = require("./models/OrdersModel.js");
const UserModel = require("./models/UserModel.js");

const app = express();
const PORT = 3000;
const mongo_url = process.env.MONGO_URL;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

/* ======================= ROUTES ======================= */

// Holdings
app.get("/allHoldings", async (req, res) => {
  const allHoldings = await holdingsModel.find({});
  res.json(allHoldings);
});

// Positions
app.get("/allPositions", async (req, res) => {
  const allPositions = await positionModel.find({});
  res.json(allPositions);
});

// Create Order
app.post("/newOrder", async (req, res) => {
  const newOrder = new OrdersModel({
    name: req.body.name,
    qty: req.body.qty,
    price: req.body.price,
    mode: req.body.mode,
  });

  await newOrder.save();
  res.send("Order saved");
});

// Get Orders
app.get("/allOrders", async (req, res) => {
  const allOrders = await OrdersModel.find().sort({ _id: -1 });
  res.json(allOrders);
});

// Delete Order
app.delete("/deleteOrder/:id", async (req, res) => {
  try {
    await OrdersModel.findByIdAndDelete(req.params.id);
    res.send("Order deleted");
  } catch (err) {
    res.status(500).json({ error: "Failed to delete order" });
  }
});

// Register
app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new UserModel({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await UserModel.findOne({ username });
  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "User not found" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid password" });
  }

  res.json({ success: true, message: "Login successful" });
});

// Logout
app.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logout successful" });
});

/* ======================= DB + SERVER ======================= */

mongoose
  .connect(mongo_url)
  .then(() => {
    console.log("✅ DB connected");

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed");
    console.error(err.message);
  });