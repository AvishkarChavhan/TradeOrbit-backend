const { model } = require("mongoose");
const { WalletSchema } = require("../schema/walletSchema.js");

const WalletModel = model("wallet", WalletSchema);

module.exports = WalletModel;