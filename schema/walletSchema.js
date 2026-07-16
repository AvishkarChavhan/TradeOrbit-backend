const { Schema } = require("mongoose");

const WalletSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true, unique: true },
    balance: { type: Number, default: 100000 },
  },
  { timestamps: true }
);

module.exports = { WalletSchema };