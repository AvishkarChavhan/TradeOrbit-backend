const { Schema } = require("mongoose");

const AlertSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    name: { type: String, required: true },
    triggerPrice: { type: Number, required: true },
    condition: { type: String, enum: ["ABOVE", "BELOW"], required: true },
    status: { type: String, enum: ["ACTIVE", "TRIGGERED", "CANCELLED"], default: "ACTIVE" },
  },
  { timestamps: true }
);

module.exports = { AlertSchema };