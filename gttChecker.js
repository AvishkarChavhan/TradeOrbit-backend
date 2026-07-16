const GttModel = require("./models/GttModel.js");
const AlertModel = require("./models/AlertModel.js");
const WalletModel = require("./models/WalletModel.js");
const { holdingsModel } = require("./models/holdingsModel.js");
const OrdersModel = require("./models/OrdersModel.js");
const TransactionModel = require("./models/TransactionModel.js");

async function executeGttOrder(gtt, currentPrice) {
  const wallet = await WalletModel.findOne({ userId: gtt.userId });
  if (!wallet) return false;

  const orderValue = gtt.qty * currentPrice;

  if (gtt.mode === "BUY") {
    if (wallet.balance < orderValue) return false;

    wallet.balance -= orderValue;
    await wallet.save();

    const existingHolding = await holdingsModel.findOne({ userId: gtt.userId, name: gtt.name });

    if (existingHolding) {
      const totalQty = existingHolding.qty + gtt.qty;
      const totalCost = existingHolding.avg * existingHolding.qty + orderValue;
      existingHolding.qty = totalQty;
      existingHolding.avg = totalCost / totalQty;
      existingHolding.price = currentPrice;
      await existingHolding.save();
    } else {
      await new holdingsModel({
        userId: gtt.userId,
        name: gtt.name,
        qty: gtt.qty,
        avg: currentPrice,
        price: currentPrice,
        net: "0.00%",
        day: "0.00%",
      }).save();
    }

    await new TransactionModel({
      userId: gtt.userId,
      type: "BUY",
      amount: orderValue,
      description: `GTT: Bought ${gtt.qty} ${gtt.name} @ ₹${currentPrice}`,
      balanceAfter: wallet.balance,
    }).save();
  } else {
    const existingHolding = await holdingsModel.findOne({ userId: gtt.userId, name: gtt.name });
    if (!existingHolding || existingHolding.qty < gtt.qty) return false;

    wallet.balance += orderValue;
    await wallet.save();

    existingHolding.qty -= gtt.qty;
    if (existingHolding.qty === 0) {
      await holdingsModel.deleteOne({ _id: existingHolding._id });
    } else {
      await existingHolding.save();
    }

    await new TransactionModel({
      userId: gtt.userId,
      type: "SELL",
      amount: orderValue,
      description: `GTT: Sold ${gtt.qty} ${gtt.name} @ ₹${currentPrice}`,
      balanceAfter: wallet.balance,
    }).save();
  }

  await new OrdersModel({
    userId: gtt.userId,
    name: gtt.name,
    qty: gtt.qty,
    price: currentPrice,
    mode: gtt.mode,
    product: gtt.product,
    status: "EXECUTED",
  }).save();

  return true;
}

async function checkGttOrders(io, livePrices) {
  const activeGtts = await GttModel.find({ status: "ACTIVE" });

  for (const gtt of activeGtts) {
    const live = livePrices.find((s) => s.name === gtt.name);
    if (!live) continue;

    const conditionMet =
      gtt.condition === "ABOVE" ? live.price >= gtt.triggerPrice : live.price <= gtt.triggerPrice;

    if (conditionMet) {
      const success = await executeGttOrder(gtt, live.price);
      gtt.status = success ? "TRIGGERED" : "FAILED";
      await gtt.save();

      io.to(`user_${gtt.userId}`).emit("gttTriggered", {
        name: gtt.name,
        mode: gtt.mode,
        price: live.price,
        success,
      });
    }
  }
}

async function checkAlerts(io, livePrices) {
  const activeAlerts = await AlertModel.find({ status: "ACTIVE" });

  for (const alert of activeAlerts) {
    const live = livePrices.find((s) => s.name === alert.name);
    if (!live) continue;

    const conditionMet =
      alert.condition === "ABOVE" ? live.price >= alert.triggerPrice : live.price <= alert.triggerPrice;

    if (conditionMet) {
      alert.status = "TRIGGERED";
      await alert.save();

      io.to(`user_${alert.userId}`).emit("alertTriggered", {
        name: alert.name,
        price: live.price,
        message: `${alert.name} has crossed ₹${alert.triggerPrice}`,
      });
    }
  }
}

async function runChecks(io, livePrices) {
  await checkGttOrders(io, livePrices);
  await checkAlerts(io, livePrices);
}

module.exports = { runChecks };