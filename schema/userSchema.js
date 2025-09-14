const {Schema}=require("mongoose");
const passport = require("passport");
const UserSchema=new Schema({
    username:String,
    email:String,
    password:String,
});
module.exports={UserSchema};