const { Schema } = require("mongoose");

const GttSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    name: { type: String, required: true },
    triggerPrice: { type: Number, required: true },
    condition: { type: String, enum: ["ABOVE", "BELOW"], required: true },
    qty: { type: Number, required: true },
    mode: { type: String, enum: ["BUY", "SELL"], required: true },
    product: { type: String, enum: ["CNC", "MIS"], default: "CNC" },
    status: {
      type: String,
      enum: ["ACTIVE", "TRIGGERED", "CANCELLED", "FAILED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

module.exports = { GttSchema };