const { model } = require("mongoose");
const { AlertSchema } = require("../schema/alertSchema.js");

const AlertModel = model("alert", AlertSchema);

module.exports = AlertModel;