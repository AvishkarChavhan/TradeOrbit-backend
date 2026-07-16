const { model } = require("mongoose");
const { HoldingsSchema } = require("../schema/holdingsSchema.js");

const holdingsModel = model("holding", HoldingsSchema);

module.exports = { holdingsModel };