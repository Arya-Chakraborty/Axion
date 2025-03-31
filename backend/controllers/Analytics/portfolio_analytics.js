const Portfolio = require('../../models/Portfolio');
const axios = require('axios');
const moment = require('moment');
const math = require('mathjs'); // Add this at the top of the file

// Helper function to convert time range to period parameters
function getPeriodParams(range) {
    const now = moment();
    let fromDate;

    switch (range) {
        case '1m': fromDate = now.subtract(1, 'month'); break;
        case '3m': fromDate = now.subtract(3, 'months'); break;
        case '6m': fromDate = now.subtract(6, 'months'); break;
        case '1y': fromDate = now.subtract(1, 'year'); break;
        case '3y': fromDate = now.subtract(3, 'years'); break;
        case '5y': fromDate = now.subtract(5, 'years'); break;
        case 'all': fromDate = moment(0); break;
        default: fromDate = now.subtract(1, 'year'); // Default to 1 year
    }

    return {
        period1: Math.floor(fromDate.valueOf() / 1000),
        period2: Math.floor(moment().valueOf() / 1000)
    };
}


// Helper function to convert date to Unix timestamp
function toUnixTimestamp(date) {
    return Math.floor(date.getTime() / 1000);
}

// Get exchange rate for currency conversion
async function getExchangeRate(fromCurrency) {
    if (fromCurrency === 'INR') return 1;

    try {
        const response = await axios.get(
            `https://api.exchangerate-api.com/v4/latest/INR`,
            { timeout: 5000 }
        );
        const rates = response.data.rates || {};
        return 1 / (rates[fromCurrency] || 1);
    } catch (error) {
        console.error("Currency API Error:", error.message);
        // Fallback to approximate rates if API fails
        const fallbackRates = {
            'USD': 83.5,
            'EUR': 90.2,
            'GBP': 105.3,
            'JPY': 0.56,
            'AUD': 55.8,
            'CAD': 61.2,
            'CHF': 93.8,
            'CNY': 11.5,
            'HKD': 10.7,
            'SGD': 61.8
        };
        return fallbackRates[fromCurrency] || 1;
    }
}

// Fetch historical data from Yahoo Finance for a single symbol with currency conversion
async function fetchStockHistoricalData(symbol, range) {
    try {
        const { period1, period2 } = getPeriodParams(range);

        const response = await axios.get(`https://query2.finance.yahoo.com/v8/finance/chart/${symbol}`, {
            params: {
                interval: '1d',
                period1,
                period2
            },
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        const result = response.data.chart.result[0];
        if (!result || !result.timestamp || !result.indicators.quote[0].close) {
            throw new Error('Invalid data format from Yahoo Finance');
        }

        // Get currency and exchange rate
        const fromCurrency = result.meta.currency || 'USD';
        const exchangeRate = await getExchangeRate(fromCurrency);

        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];
        const adjClose = result.indicators.adjclose?.[0]?.adjclose || quotes.close;

        // Convert all prices to INR
        const convertToINR = (value) => value * exchangeRate;

        return timestamps.map((ts, i) => ({
            date: new Date(ts * 1000).toISOString().split('T')[0], // Format as YYYY-MM-DD
            close: convertToINR(quotes.close[i]),
            adjClose: convertToINR(adjClose[i])
        }));

    } catch (error) {
        console.error(`Failed to fetch data for ${symbol}:`, error.message);
        throw error;
    }
}

// Calculate portfolio historical values per stock in INR
exports.getHistoricalRecords = async (req, res) => {
    try {
        const { portfolioId, range = '1y' } = req.body;

        // Get the portfolio with holdings
        const portfolio = await Portfolio.findById(portfolioId);
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio not found'
            });
        }

        // Fetch historical data for all holdings
        const result = {};
        const allDates = new Set(); // Track all unique dates across stocks

        await Promise.all(
            portfolio.holdings.map(async (holding) => {
                try {
                    const historicalData = await fetchStockHistoricalData(holding.symbol, range);

                    // Format data for this stock
                    const stockData = {};
                    historicalData.forEach(day => {
                        stockData[day.date] = parseFloat((day.close * holding.quantity).toFixed(2));
                        allDates.add(day.date);
                    });

                    result[holding.symbol] = stockData;
                } catch (error) {
                    console.error(`Error fetching data for ${holding.symbol}:`, error);
                    result[holding.symbol] = {}; // Empty object if data fetch fails
                }
            })
        );

        // Also calculate total portfolio value for each date
        const portfolioValues = {};
        const sortedDates = Array.from(allDates).sort();

        sortedDates.forEach(date => {
            let totalValue = 0;
            let stocksWithData = 0;

            portfolio.holdings.forEach(holding => {
                if (result[holding.symbol] && result[holding.symbol][date]) {
                    totalValue += result[holding.symbol][date];
                    stocksWithData++;
                }
            });

            // Only include dates where we have data for at least half the stocks
            if (stocksWithData >= Math.ceil(portfolio.holdings.length / 2)) {
                portfolioValues[date] = parseFloat(totalValue.toFixed(2));
            }
        });

        // Add portfolio total to the result
        result['PORTFOLIO_TOTAL'] = portfolioValues;

        res.status(200).json({
            success: true,
            data: result,
            currency: 'INR',
            note: 'All values are converted to INR using current exchange rates'
        });

    } catch (error) {
        console.error('Error in getHistoricalRecords:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching historical records',
            error: error.message
        });
    }
};

exports.comparePortfolio = async (req, res) => {
    try {
        const { portfolioId, range, comparisonMetric } = req.body;

        // Validate inputs
        if (!portfolioId || !range || !comparisonMetric) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        // Get portfolio historical data
        const portfolioResponse = await axios.post('http://localhost:5000/api/v1/portfolios/getHistoricalRecords', {
            portfolioId,
            range
        });

        if (!portfolioResponse.data.success || !portfolioResponse.data.data.PORTFOLIO_TOTAL) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio historical data not found'
            });
        }

        const portfolioHistory = portfolioResponse.data.data.PORTFOLIO_TOTAL;

        // Get comparison metric historical data
        const comparisonHistory = await fetchStockHistoricalData(comparisonMetric, range);

        // Normalize both datasets to 100 at the starting point
        const portfolioDates = Object.keys(portfolioHistory);
        const comparisonDates = comparisonHistory.map(item => item.date);

        // Find common dates or handle date alignment
        const allDates = new Set([...portfolioDates, ...comparisonDates]);
        const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));

        // Find the earliest date where we have both values
        let firstDateWithBoth = null;
        for (const date of sortedDates) {
            if (portfolioHistory[date] && comparisonHistory.find(item => item.date === date)) {
                firstDateWithBoth = date;
                break;
            }
        }

        if (!firstDateWithBoth) {
            return res.status(400).json({
                success: false,
                message: 'No overlapping dates found for comparison'
            });
        }

        const portfolioFirstValue = portfolioHistory[firstDateWithBoth];
        const comparisonFirstItem = comparisonHistory.find(item => item.date === firstDateWithBoth);
        const comparisonFirstValue = comparisonFirstItem ? comparisonFirstItem.close : 0;

        // Prepare normalized data
        const normalizedData = [];

        sortedDates.forEach(date => {
            const portfolioValue = portfolioHistory[date];
            const comparisonItem = comparisonHistory.find(item => item.date === date);
            const comparisonValue = comparisonItem ? comparisonItem.close : null;

            if (portfolioValue && comparisonValue) {
                normalizedData.push({
                    date,
                    portfolioValue: (portfolioValue / portfolioFirstValue) * 100,
                    comparisonValue: (comparisonValue / comparisonFirstValue) * 100
                });
            } else if (portfolioValue) {
                normalizedData.push({
                    date,
                    portfolioValue: (portfolioValue / portfolioFirstValue) * 100,
                    comparisonValue: null
                });
            } else if (comparisonValue) {
                normalizedData.push({
                    date,
                    portfolioValue: null,
                    comparisonValue: (comparisonValue / comparisonFirstValue) * 100
                });
            }
        });

        // Filter out entries where both values are null
        const filteredData = normalizedData.filter(item =>
            item.portfolioValue !== null || item.comparisonValue !== null
        );

        res.json({
            success: true,
            data: filteredData
        });

    } catch (error) {
        console.error('Error in portfolio comparison:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to perform comparison'
        });
    }
};

async function calculateBenchmarkReturns(symbol, dates) {
    try {
        const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
            params: {
                interval: '1d',
                period1: Math.floor(new Date(dates[0]).getTime() / 1000),
                period2: Math.floor(new Date(dates[dates.length - 1]).getTime() / 1000)
            }
        });
        
        const result = response.data.chart.result[0];
        const quotes = result.indicators.quote[0];
        const benchmarkValues = quotes.close.filter(Boolean);
        
        const benchmarkReturns = [];
        for (let i = 1; i < benchmarkValues.length; i++) {
            benchmarkReturns.push((benchmarkValues[i] - benchmarkValues[i-1]) / benchmarkValues[i-1]);
        }
        
        return benchmarkReturns;
    } catch (error) {
        console.error('Error fetching benchmark data:', error);
        return null;
    }
}

exports.calculateRiskMetrics = async (req, res) => {
    try {
        const { portfolioId, range } = req.body;

        // Validate inputs
        if (!portfolioId || !range) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        // Get portfolio historical data
        const portfolioResponse = await axios.post('http://localhost:5000/api/v1/portfolios/getHistoricalRecords', {
            portfolioId,
            range
        });

        if (!portfolioResponse.data.success || !portfolioResponse.data.data.PORTFOLIO_TOTAL) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio historical data not found'
            });
        }

        const portfolioHistory = portfolioResponse.data.data.PORTFOLIO_TOTAL;
        const dates = Object.keys(portfolioHistory).sort();
        const values = dates.map(date => portfolioHistory[date]);

        // Calculate daily returns
        const returns = [];
        for (let i = 1; i < values.length; i++) {
            returns.push((values[i] - values[i - 1]) / values[i - 1]);
        }

        // Calculate metrics
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
        const standardDeviation = Math.sqrt(variance);

        // For beta calculation, we'd typically need market returns data
        // This is a simplified version - in production you'd want actual market data
        const beta = returns.length > 0 ? standardDeviation * 0.8 : null; // Simplified approximation

        // Sharpe ratio (assuming risk-free rate of 5% annualized)
        const riskFreeRate = 0.05 / 252; // Daily rate
        const sharpeRatio = (meanReturn - riskFreeRate) / standardDeviation;

        // Value at Risk (95% confidence, normal distribution assumption)
        const valueAtRisk = standardDeviation * 1.645; // 95% confidence

        // Maximum drawdown
        let maxDrawdown = 0;
        let peak = values[0];
        for (let i = 1; i < values.length; i++) {
            if (values[i] > peak) {
                peak = values[i];
            }
            const drawdown = (peak - values[i]) / peak;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        const rollingVolatility = [];
        for (let i = 29; i < returns.length; i++) {
            const windowReturns = returns.slice(i - 29, i);
            const windowMean = windowReturns.reduce((sum, r) => sum + r, 0) / 30;
            const windowVariance = windowReturns.reduce((sum, r) => sum + Math.pow(r - windowMean, 2), 0) / 30;
            rollingVolatility.push({
                date: dates[i + 1], // +1 because returns start from 2nd date
                volatility: Math.sqrt(windowVariance)
            });
        }

        // 2. Drawdown Chart
        const drawdownChart = [];
        let peak2 = values[0];
        for (let i = 0; i < values.length; i++) {
            if (values[i] > peak2) peak2 = values[i];
            const drawdown = (peak2 - values[i]) / peak2;
            drawdownChart.push({
                date: dates[i],
                drawdown: drawdown * 100
            });
        }

        // 3. Return Distribution
        const returnRanges = [-0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2];
        const returnDistribution = returnRanges.map((val, i) => {
            const nextVal = i < returnRanges.length - 1 ? returnRanges[i + 1] : Infinity;
            const count = returns.filter(r => r >= val && r < nextVal).length;
            return {
                range: `${(val * 100).toFixed(0)}% to ${i < returnRanges.length - 1 ? (returnRanges[i + 1] * 100).toFixed(0) : '∞'}%`,
                frequency: (count / returns.length * 100).toFixed(1)
            };
        });

        // 4. Risk-Return Plot (for individual assets)
        const riskReturnPlot = [];
        if (portfolioResponse.data.data.holdings) {
            // Get benchmark data (e.g., S&P 500)
            const benchmarkReturns = await calculateBenchmarkReturns('^GSPC', dates);

            for (const holding of portfolioResponse.data.data.holdings) {
                const symbol = holding.symbol;
                if (historicalData[symbol]) {
                    const assetDates = Object.keys(historicalData[symbol]).sort();
                    const assetValues = assetDates.map(date => historicalData[symbol][date]);
                    const assetReturns = [];

                    for (let i = 1; i < assetValues.length; i++) {
                        assetReturns.push((assetValues[i] - assetValues[i - 1]) / assetValues[i - 1]);
                    }

                    if (assetReturns.length > 0) {
                        // Calculate annualized return
                        const totalReturn = assetValues[assetValues.length - 1] / assetValues[0] - 1;
                        const annualizedReturn = Math.pow(1 + totalReturn, 252 / assetReturns.length) - 1;

                        // Calculate annualized volatility
                        const assetMean = assetReturns.reduce((sum, r) => sum + r, 0) / assetReturns.length;
                        const assetVariance = assetReturns.reduce((sum, r) => sum + Math.pow(r - assetMean, 2), 0) / assetReturns.length;
                        const annualizedVol = Math.sqrt(assetVariance * 252);

                        // Calculate beta if benchmark data exists
                        let beta = null;
                        if (benchmarkReturns && benchmarkReturns.length === assetReturns.length) {
                            const cov = math.covariance(assetReturns, benchmarkReturns);
                            const varBenchmark = math.variance(benchmarkReturns);
                            beta = cov / varBenchmark;
                        }

                        riskReturnPlot.push({
                            symbol,
                            return: annualizedReturn,
                            risk: annualizedVol,
                            beta: beta || 0
                        });
                    }
                }
            }

            // Add portfolio to the plot
            const portfolioTotal = values[values.length - 1] / values[0] - 1;
            const portfolioAnnualizedReturn = Math.pow(1 + portfolioTotal, 252 / returns.length) - 1;
            const portfolioAnnualizedVol = standardDeviation * Math.sqrt(252);

            riskReturnPlot.push({
                symbol: 'PORTFOLIO',
                return: portfolioAnnualizedReturn,
                risk: portfolioAnnualizedVol,
                beta: beta || 0,
                isPortfolio: true
            });
        }


        res.json({
            success: true,
            data: {
                metrics: {
                    beta,
                    standardDeviation,
                    sharpeRatio,
                    valueAtRisk,
                    maxDrawdown
                },
                charts: {
                    rollingVolatility,
                    drawdownChart,
                    returnDistribution,
                    riskReturnPlot
                }
            }
        });

    } catch (error) {
        console.error('Error calculating risk metrics:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to calculate risk metrics'
        });
    }
};