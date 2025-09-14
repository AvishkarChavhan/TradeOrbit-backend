const {Schema} =require("mongoose");
const HoldingsSchema =Schema({
    name: String ,
    qty: Number,
    avg: Number,
    price: Number,
    net:String,
    day: String,
});
module.exports={HoldingsSchema};