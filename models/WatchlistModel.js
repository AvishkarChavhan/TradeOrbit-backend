const { model } = require("mongoose");
const { WatchlistSchema } = require("../schema/watchlistSchema.js");

const WatchlistModel = model("watchlist", WatchlistSchema);

module.exports = WatchlistModel;