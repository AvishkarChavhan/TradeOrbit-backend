const { model } = require("mongoose");
const { OrderSchema } = require("../schema/ordersSchema.js");

const OrderModel = model("order", OrderSchema); // ✅ no `new`, correct schema name

module.exports = OrderModel 
