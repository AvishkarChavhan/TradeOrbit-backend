const { model } = require("mongoose");
const { UserSchema } = require("../schema/userSchema.js");
const UserModel = model("user", UserSchema); 
module.exports = UserModel ;