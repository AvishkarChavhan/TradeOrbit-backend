// Master list of all instruments available to search/add to a watchlist.
// Must stay in sync with priceEngine.js's STOCK_SEEDS so live prices resolve correctly.
const STOCK_MASTER = [
  { name: "INFY", fullName: "Infosys Ltd" },
  { name: "ONGC", fullName: "Oil & Natural Gas Corp Ltd" },
  { name: "TCS", fullName: "Tata Consultancy Services Ltd" },
  { name: "KPITTECH", fullName: "KPIT Technologies Ltd" },
  { name: "QUICKHEAL", fullName: "Quick Heal Technologies Ltd" },
  { name: "WIPRO", fullName: "Wipro Ltd" },
  { name: "M&M", fullName: "Mahindra & Mahindra Ltd" },
  { name: "RELIANCE", fullName: "Reliance Industries Ltd" },
  { name: "HUL", fullName: "Hindustan Unilever Ltd" },
];

module.exports = { STOCK_MASTER };