const { model } = require("mongoose");
const { OrderSchema } = require("../schema/ordersSchema.js");

const OrderModel = model("order", OrderSchema);

module.exports = OrderModel;