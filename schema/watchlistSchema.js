const { Schema } = require("mongoose");

const WatchlistSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = { WatchlistSchema };