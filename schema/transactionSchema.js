const { Schema } = require("mongoose");

const TransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    type: {
      type: String,
      enum: ["DEPOSIT", "WITHDRAWAL", "BUY", "SELL"],
      required: true,
    },
    amount: { type: Number, required: true },
    description: { type: String, default: "" },
    balanceAfter: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = { TransactionSchema };