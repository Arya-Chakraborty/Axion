const axios = require("axios");

exports.getAllFundsBySymbol = async (request, response) => {
    try {
        const api_response = await axios.get('https://query2.finance.yahoo.com/v1/finance/search', {
            params: {
                q: request.query.q,
                quotesCount: 100
            }
        });
        response.json(api_response.data);
    } catch (error) {
        response.status(500).json({
            error: 'Failed to fetch data',
            yahooError: error.api_response?.data || error.message
        });
    }
}

function toUnixTimestamp(date) {
    return Math.floor(date.getTime() / 1000);
}

// Main function to fetch fund data
exports.getDetailsBySymbol = async (request, response) => {
    const symbol = request.params.symbol;
    try {
        const now = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(now.getFullYear() - 1);

        const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${toUnixTimestamp(oneYearAgo)}&period2=${toUnixTimestamp(now)}`;
        const API_response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        const result = API_response.data.chart.result?.[0];
        if (!result || !result.meta) {
            return response.status(400).json({ error: "No data available for this symbol" });
        }
        // console.log(result);
        // Extract metadata and historical data
        const meta = result.meta;
        const from_currency = meta.currency || "USD";
        const indicators = result.indicators.quote?.[0];
        const timestamps = result.timestamp || [];
        const closes = indicators?.close || [];
        const opens = indicators?.open || [];
        const highs = indicators?.high || [];
        const lows = indicators?.low || [];
        const volumes = indicators?.volume || [];

        // Get exchange rate
        let conversionRate = 1;
        if (from_currency !== 'INR') {
            try {
                const curr_response = await axios.get(
                    `https://api.exchangerate-api.com/v4/latest/INR`,
                    { timeout: 5000 }
                );
                const rates = curr_response.data.rates || {};
                conversionRate = 1 / (rates[from_currency] || 1);
            } catch (error) {
                console.error("Currency API Error:", error.message);
                // Fallback to approximate rate if API fails
                conversionRate = from_currency === 'USD' ? 85.56 : 1;
            }
        }

        // Get the last two closing prices for accurate daily change calculation
        let dailyChangePercent = 0;
        if (closes.length >= 2) {
            const todayClose = closes[closes.length - 1];
            const yesterdayClose = closes[closes.length - 2];
            dailyChangePercent = yesterdayClose !== 0 
                ? ((todayClose - yesterdayClose) / yesterdayClose) * 100
                : 0;
        }
        // console.log(conversionRate);
        // Convert all values to INR
        const convertToINR = (value) => value * conversionRate;
        const lastIndex = closes.length - 1;
        return response.json({
            symbol: meta.symbol,
            originalCurrency: from_currency,
            currency: 'INR',
            currentPrice: convertToINR(meta.regularMarketPrice || 0),
            previousClose: convertToINR(meta.chartPreviousClose || 0),
            open: convertToINR(opens[lastIndex] || 0),
            high: convertToINR(highs[lastIndex] || 0),
            low: convertToINR(lows[lastIndex] || 0),
            volume: volumes[lastIndex] || 0,
            change: dailyChangePercent,  // Now using accurate daily change
            exchangeRate: conversionRate,
            historicalData: {
                timestamps,
                closes: closes.map(convertToINR),
                opens: opens.map(convertToINR),
                highs: highs.map(convertToINR),
                lows: lows.map(convertToINR),
                volumes
            },
            validRanges: result.meta.validRanges,
            timezone: result.meta.timezone,
            note: "Daily change calculated from actual closing prices"
        });

    } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error.message);
        return response.status(500).json({ 
            error: "Internal Server Error", 
            details: error.message 
        });
    }
};