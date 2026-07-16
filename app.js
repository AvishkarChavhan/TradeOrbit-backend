require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const { holdingsModel } = require("./models/holdingsModel.js");
const { positionModel } = require("./models/positionModel.js");
const OrdersModel = require("./models/OrdersModel.js");
const UserModel = require("./models/UserModel.js");
const WalletModel = require("./models/WalletModel.js");
const GttModel = require("./models/GttModel.js");
const AlertModel = require("./models/AlertModel.js");
const TransactionModel = require("./models/TransactionModel.js");
const WatchlistModel = require("./models/WatchlistModel.js");
const authMiddleware = require("./middleware/authMiddleware.js");
const { startPriceEngine, getLivePricesArray } = require("./priceEngine.js");
const { runChecks } = require("./gttChecker.js");
const { STOCK_MASTER } = require("./stockMaster.js");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const PORT = process.env.PORT || 3000;
const mongo_url = process.env.MONGO_URL;

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Zerodha Clone Backend is running ✅");
});

/* ======================= SOCKET.IO — per-user rooms ======================= */

io.on("connection", (socket) => {
  socket.on("joinUserRoom", (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
    }
  });
});

/* ======================= LIVE PRICES + STOCK SEARCH ======================= */

app.get("/livePrices", (req, res) => {
  res.json(getLivePricesArray());
});

app.get("/stocks/search", (req, res) => {
  const query = (req.query.q || "").toUpperCase();

  if (!query) {
    return res.json(STOCK_MASTER);
  }

  const matches = STOCK_MASTER.filter(
    (stock) =>
      stock.name.toUpperCase().includes(query) ||
      stock.fullName.toUpperCase().includes(query)
  );

  res.json(matches);
});

/* ======================= AUTH ======================= */

app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new UserModel({ username, email, password: hashedPassword });
    await newUser.save();

    await new WalletModel({ userId: newUser._id, balance: 100000 }).save();

    const defaultSymbols = ["INFY", "TCS", "RELIANCE", "WIPRO"];
    await WatchlistModel.insertMany(
      defaultSymbols.map((name) => ({ userId: newUser._id, name }))
    );

    res.status(201).json({ success: true, message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required" });
    }

    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logout successful" });
});

/* ======================= WALLET ======================= */

app.get("/wallet", authMiddleware, async (req, res) => {
  try {
    const wallet = await WalletModel.findOne({ userId: req.userId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }
    res.json({ success: true, balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch wallet" });
  }
});

app.post("/wallet/add", authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Enter a valid amount" });
    }

    const wallet = await WalletModel.findOneAndUpdate(
      { userId: req.userId },
      { $inc: { balance: amount } },
      { new: true }
    );

    await new TransactionModel({
      userId: req.userId,
      type: "DEPOSIT",
      amount,
      description: "Funds added",
      balanceAfter: wallet.balance,
    }).save();

    res.json({ success: true, balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to add funds" });
  }
});

app.post("/wallet/withdraw", authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Enter a valid amount" });
    }

    const wallet = await WalletModel.findOne({ userId: req.userId });
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    wallet.balance -= amount;
    await wallet.save();

    await new TransactionModel({
      userId: req.userId,
      type: "WITHDRAWAL",
      amount,
      description: "Funds withdrawn",
      balanceAfter: wallet.balance,
    }).save();

    res.json({ success: true, balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to withdraw funds" });
  }
});

/* ======================= TRANSACTIONS ======================= */

app.get("/transactions", authMiddleware, async (req, res) => {
  try {
    const transactions = await TransactionModel.find({ userId: req.userId }).sort({ _id: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch transactions" });
  }
});

/* ======================= P&L REPORT ======================= */

app.get("/pnl", authMiddleware, async (req, res) => {
  try {
    const orders = await OrdersModel.find({ userId: req.userId, status: "EXECUTED" }).sort({ createdAt: 1 });
    const holdings = await holdingsModel.find({ userId: req.userId });
    const livePrices = getLivePricesArray();

    const stockLedger = {};
    let realizedPL = 0;

    orders.forEach((order) => {
      if (!stockLedger[order.name]) {
        stockLedger[order.name] = { qty: 0, totalCost: 0 };
      }
      const ledger = stockLedger[order.name];

      if (order.mode === "BUY") {
        ledger.totalCost += order.qty * order.price;
        ledger.qty += order.qty;
      } else if (order.mode === "SELL") {
        const avgCostAtSale = ledger.qty > 0 ? ledger.totalCost / ledger.qty : 0;
        const saleProceeds = order.qty * order.price;
        const costOfSold = avgCostAtSale * order.qty;

        realizedPL += saleProceeds - costOfSold;

        ledger.totalCost -= costOfSold;
        ledger.qty -= order.qty;
      }
    });

    let unrealizedPL = 0;
    let currentValue = 0;
    let totalInvestment = 0;

    const holdingsBreakdown = holdings.map((h) => {
      const live = livePrices.find((s) => s.name === h.name);
      const currentPrice = live ? live.price : h.price;
      const value = currentPrice * h.qty;
      const invested = h.avg * h.qty;
      const pl = value - invested;

      currentValue += value;
      totalInvestment += invested;
      unrealizedPL += pl;

      return {
        name: h.name,
        qty: h.qty,
        avg: h.avg,
        currentPrice,
        invested,
        currentValueForStock: value,
        pl,
        plPercent: invested > 0 ? (pl / invested) * 100 : 0,
      };
    });

    res.json({
      success: true,
      realizedPL,
      unrealizedPL,
      totalPL: realizedPL + unrealizedPL,
      totalInvestment,
      currentValue,
      holdingsBreakdown,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to compute P&L report" });
  }
});

/* ======================= WATCHLIST ======================= */

app.get("/watchlist", authMiddleware, async (req, res) => {
  try {
    const entries = await WatchlistModel.find({ userId: req.userId }).sort({ _id: 1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch watchlist" });
  }
});

app.post("/watchlist/add", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Stock name is required" });
    }

    const upperName = name.toUpperCase();
    const validStock = STOCK_MASTER.find((s) => s.name === upperName);
    if (!validStock) {
      return res.status(400).json({ success: false, message: "Stock not found" });
    }

    const existing = await WatchlistModel.findOne({ userId: req.userId, name: upperName });
    if (existing) {
      return res.status(409).json({ success: false, message: "Already in watchlist" });
    }

    const count = await WatchlistModel.countDocuments({ userId: req.userId });
    if (count >= 50) {
      return res.status(400).json({ success: false, message: "Watchlist limit of 50 reached" });
    }

    const entry = new WatchlistModel({ userId: req.userId, name: upperName });
    await entry.save();

    res.status(201).json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to add to watchlist" });
  }
});

app.delete("/watchlist/remove/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await WatchlistModel.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Watchlist entry not found" });
    }
    res.json({ success: true, message: "Removed from watchlist" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to remove from watchlist" });
  }
});

/* ======================= HOLDINGS / POSITIONS ======================= */

app.get("/allHoldings", authMiddleware, async (req, res) => {
  try {
    const allHoldings = await holdingsModel.find({ userId: req.userId });
    res.json(allHoldings);
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch holdings" });
  }
});

app.get("/allPositions", authMiddleware, async (req, res) => {
  try {
    const allPositions = await positionModel.find({ userId: req.userId });
    res.json(allPositions);
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch positions" });
  }
});

/* ======================= ORDERS (REAL BUY/SELL — CNC → Holdings, MIS → Positions) ======================= */

app.post("/newOrder", authMiddleware, async (req, res) => {
  try {
    const { name, qty, price, mode, product } = req.body;
    const orderProduct = product === "MIS" ? "MIS" : "CNC";

    if (!name || !qty || !price || !mode) {
      return res.status(400).json({ success: false, message: "All order fields are required" });
    }
    if (qty <= 0 || price <= 0) {
      return res.status(400).json({ success: false, message: "Qty and price must be greater than 0" });
    }

    const wallet = await WalletModel.findOne({ userId: req.userId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    const orderValue = qty * price;
    const targetModel = orderProduct === "MIS" ? positionModel : holdingsModel;

    if (mode === "BUY") {
      if (wallet.balance < orderValue) {
        return res.status(400).json({ success: false, message: "Insufficient funds" });
      }

      wallet.balance -= orderValue;
      await wallet.save();

      const existing = await targetModel.findOne({ userId: req.userId, name });

      if (existing) {
        const totalQty = existing.qty + Number(qty);
        const totalCost = existing.avg * existing.qty + orderValue;
        existing.qty = totalQty;
        existing.avg = totalCost / totalQty;
        existing.price = price;
        await existing.save();
      } else {
        const newDoc = {
          userId: req.userId,
          name,
          qty,
          avg: price,
          price,
          net: "0.00%",
          day: "0.00%",
        };
        if (orderProduct === "MIS") {
          newDoc.product = "MIS";
          newDoc.isLoss = false;
        }
        await new targetModel(newDoc).save();
      }
    } else if (mode === "SELL") {
      const existing = await targetModel.findOne({ userId: req.userId, name });

      if (!existing || existing.qty < qty) {
        return res.status(400).json({ success: false, message: "Not enough quantity to sell" });
      }

      wallet.balance += orderValue;
      await wallet.save();

      existing.qty -= Number(qty);
      if (existing.qty === 0) {
        await targetModel.deleteOne({ _id: existing._id });
      } else {
        await existing.save();
      }
    } else {
      return res.status(400).json({ success: false, message: "Invalid order mode" });
    }

    await new TransactionModel({
      userId: req.userId,
      type: mode,
      amount: orderValue,
      description: `${mode === "BUY" ? "Bought" : "Sold"} ${qty} ${name} (${orderProduct}) @ ₹${price}`,
      balanceAfter: wallet.balance,
    }).save();

    const newOrder = new OrdersModel({
      userId: req.userId,
      name,
      qty,
      price,
      mode,
      product: orderProduct,
      status: "EXECUTED",
    });
    await newOrder.save();

    res.status(201).json({ success: true, message: "Order executed", order: newOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to process order" });
  }
});

app.get("/allOrders", authMiddleware, async (req, res) => {
  try {
    const allOrders = await OrdersModel.find({ userId: req.userId }).sort({ _id: -1 });
    res.json(allOrders);
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
});

app.delete("/deleteOrder/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await OrdersModel.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete order" });
  }
});

/* ======================= GTT ORDERS ======================= */

app.post("/gtt/create", authMiddleware, async (req, res) => {
  try {
    const { name, triggerPrice, condition, qty, mode, product } = req.body;

    if (!name || !triggerPrice || !condition || !qty || !mode) {
      return res.status(400).json({ success: false, message: "All GTT fields are required" });
    }

    const newGtt = new GttModel({
      userId: req.userId,
      name,
      triggerPrice,
      condition,
      qty,
      mode,
      product: product || "CNC",
    });
    await newGtt.save();

    res.status(201).json({ success: true, message: "GTT order created", gtt: newGtt });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create GTT order" });
  }
});

app.get("/gtt/all", authMiddleware, async (req, res) => {
  try {
    const allGtts = await GttModel.find({ userId: req.userId }).sort({ _id: -1 });
    res.json(allGtts);
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch GTT orders" });
  }
});

app.delete("/gtt/cancel/:id", authMiddleware, async (req, res) => {
  try {
    const gtt = await GttModel.findOne({ _id: req.params.id, userId: req.userId });
    if (!gtt) {
      return res.status(404).json({ success: false, message: "GTT order not found" });
    }
    gtt.status = "CANCELLED";
    await gtt.save();
    res.json({ success: true, message: "GTT order cancelled" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to cancel GTT order" });
  }
});

/* ======================= PRICE ALERTS ======================= */

app.post("/alert/create", authMiddleware, async (req, res) => {
  try {
    const { name, triggerPrice, condition } = req.body;

    if (!name || !triggerPrice || !condition) {
      return res.status(400).json({ success: false, message: "All alert fields are required" });
    }

    const newAlert = new AlertModel({ userId: req.userId, name, triggerPrice, condition });
    await newAlert.save();

    res.status(201).json({ success: true, message: "Alert created", alert: newAlert });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create alert" });
  }
});

app.get("/alert/all", authMiddleware, async (req, res) => {
  try {
    const allAlerts = await AlertModel.find({ userId: req.userId }).sort({ _id: -1 });
    res.json(allAlerts);
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch alerts" });
  }
});

app.delete("/alert/cancel/:id", authMiddleware, async (req, res) => {
  try {
    const alert = await AlertModel.findOne({ _id: req.params.id, userId: req.userId });
    if (!alert) {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }
    alert.status = "CANCELLED";
    await alert.save();
    res.json({ success: true, message: "Alert cancelled" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to cancel alert" });
  }
});

/* ======================= DB + SERVER ======================= */

mongoose
  .connect(mongo_url)
  .then(() => {
    console.log("✅ DB connected");

    startPriceEngine(io, (livePrices) => runChecks(io, livePrices));

    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Socket.io live price engine + GTT/Alert checker started`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed");
    console.error(err.message);
  });