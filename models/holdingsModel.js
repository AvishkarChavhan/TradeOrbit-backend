const {model} =require("mongoose");
const {HoldingsSchema} =require("../schema/holdingsSchema.js");

const holdingsModel=new model("holding",HoldingsSchema);
 
module.exports = {holdingsModel};
