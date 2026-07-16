const { model } = require("mongoose");
const { TransactionSchema } = require("../schema/transactionSchema.js");

const TransactionModel = model("transaction", TransactionSchema);

module.exports = TransactionModel;