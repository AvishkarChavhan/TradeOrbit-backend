const { model } = require("mongoose");
const { GttSchema } = require("../schema/gttSchema.js");

const GttModel = model("gtt", GttSchema);

module.exports = GttModel;