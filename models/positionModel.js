const {model}=require("mongoose");
const {PositionSchema}=require("../schema/PositionsSchema.js");
const positionModel=new model("position",PositionSchema);

module.exports={positionModel};