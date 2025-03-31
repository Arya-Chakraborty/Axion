const express = require('express');
const router = express.Router();

const {getAllFundsBySymbol, getDetailsBySymbol} = require("../controllers/funds_dashboard/get_funds");
const {loginUser} = require("../controllers/user_dashboard/retrieve_user_details");
const {getUserPortfolios, createPortfolio, deletePortfolio, addHolding, getPortfolioById, evaluatePortfolio, sellHolding} = require("../controllers/user_dashboard/get_all_portfolios");
const {getHistoricalRecords, comparePortfolio, calculateRiskMetrics} = require("../controllers/Analytics/portfolio_analytics");

router.get("/getAllFunds/yahoo-search", getAllFundsBySymbol);
router.get("/getFundPrice/:symbol", getDetailsBySymbol);

router.post("/checkUser", loginUser);

router.post("/portfolios/getByEmail", getUserPortfolios);
router.post("/portfolios/create", createPortfolio);
router.delete("/portfolios/delete/:id", deletePortfolio);
router.post("/portfolios/addHolding", addHolding);
router.get("/getPortfolioById/:portfolioId", getPortfolioById);
router.post("/portfolios/evaluate", evaluatePortfolio);
router.post("/portfolios/sell", sellHolding)

router.post("/portfolios/getHistoricalRecords", getHistoricalRecords);
router.post('/portfolios/comparison', comparePortfolio);
router.post('/portfolios/riskMetrics', calculateRiskMetrics);

module.exports = router;
