const { Schema } = require("mongoose");

const OrderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    name: String,
    qty: Number,
    price: Number,
    mode: { type: String, enum: ["BUY", "SELL"], required: true },
    product: { type: String, enum: ["CNC", "MIS"], default: "CNC" },
    orderType: { type: String, enum: ["MARKET", "LIMIT"], default: "MARKET" },
    status: {
      type: String,
      enum: ["PENDING", "EXECUTED", "CANCELLED", "REJECTED"],
      default: "EXECUTED",
    },
  },
  { timestamps: true }
);

module.exports = { OrderSchema };