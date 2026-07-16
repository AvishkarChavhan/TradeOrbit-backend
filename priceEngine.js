const { STOCK_MASTER } = require("./stockMaster.js");

const livePrices = {};

// Seed initial prices — starting prices only live here; STOCK_MASTER just provides identity/names.
const INITIAL_PRICES = {
  INFY: 1555.45,
  ONGC: 116.8,
  TCS: 3194.8,
  KPITTECH: 266.45,
  QUICKHEAL: 308.55,
  WIPRO: 577.75,
  "M&M": 779.8,
  RELIANCE: 2112.4,
  HUL: 512.4,
};

STOCK_MASTER.forEach((stock) => {
  const startPrice = INITIAL_PRICES[stock.name] || 100;
  livePrices[stock.name] = {
    name: stock.name,
    price: startPrice,
    prevPrice: startPrice,
  };
});

function tickPrices() {
  Object.keys(livePrices).forEach((name) => {
    const stock = livePrices[name];
    stock.prevPrice = stock.price;

    const changePercent = (Math.random() - 0.5) * 1;
    const newPrice = stock.price * (1 + changePercent / 100);

    stock.price = Math.max(1, Number(newPrice.toFixed(2)));
  });

  return getLivePricesArray();
}

function getLivePricesArray() {
  return Object.values(livePrices).map((stock) => {
    const percentChange = ((stock.price - stock.prevPrice) / stock.prevPrice) * 100;
    return {
      name: stock.name,
      price: stock.price,
      percent: `${percentChange >= 0 ? "+" : ""}${percentChange.toFixed(2)}%`,
      isDown: stock.price < stock.prevPrice,
    };
  });
}

function startPriceEngine(io, onTick) {
  setInterval(async () => {
    const updatedPrices = tickPrices();
    io.emit("priceUpdate", updatedPrices);

    if (onTick) {
      try {
        await onTick(updatedPrices);
      } catch (err) {
        console.error("Price tick callback failed:", err.message);
      }
    }
  }, 2000);
}

module.exports = { startPriceEngine, getLivePricesArray };