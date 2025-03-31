const User = require('../../models/user');
const Portfolio = require('../../models/Portfolio');

require('dotenv').config();
const API_KEYS = process.env.GEMINI_API_KEYS.split(','); // Comma-separated API keys in env


function getRandomApiKey() {
    const randomIndex = Math.floor(Math.random() * API_KEYS.length);
    return API_KEYS[randomIndex];
}

// Get all portfolios for a user by email
exports.getUserPortfolios = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Find user by email
        const user = await User.findOne({ email }).lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get all portfolios for this user with virtuals
        const portfolios = await Portfolio.find({ user: user._id })
            .sort({ lastUpdated: -1 })
            .lean({ virtuals: true }); // Include virtuals in the response

        // Calculate additional portfolio metrics
        const portfoliosWithMetrics = portfolios.map(portfolio => {
            const currentValue = portfolio.holdings.reduce(
                (sum, holding) => sum + (holding.currentPrice || holding.avgBuyPrice) * holding.quantity,
                0
            );
            const gainLoss = currentValue - portfolio.totalPortfolioCost;
            const gainLossPercentage = portfolio.totalPortfolioCost > 0 
                ? (gainLoss / portfolio.totalPortfolioCost) * 100 
                : 0;

            return {
                ...portfolio,
                currentValue,
                gainLoss,
                gainLossPercentage
            };
        });

        res.status(200).json({
            success: true,
            data: portfoliosWithMetrics
        });

    } catch (error) {
        console.error('Error fetching portfolios:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching portfolios',
            error: error.message
        });
    }
};

// Create new portfolio for user
exports.createPortfolio = async (req, res) => {
    try {
        const { email, name } = req.body;

        if (!email || !name) {
            return res.status(400).json({
                success: false,
                message: 'Email and portfolio name are required'
            });
        }

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Create new portfolio with initial values
        const newPortfolio = new Portfolio({
            user: user._id,
            name: name.trim(),
            totalPortfolioCost: 0 // Initialize to 0
        });

        await newPortfolio.save();

        // Add portfolio reference to user
        user.portfolios.push(newPortfolio._id);
        await user.save();

        res.status(201).json({
            success: true,
            data: newPortfolio
        });

    } catch (error) {
        console.error('Error creating portfolio:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating portfolio',
            error: error.message
        });
    }
};

exports.deletePortfolio = async (req, res) => {
    try {
        const { id } = req.params;

        // First find the portfolio to verify it exists
        const portfolio = await Portfolio.findById(id);
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio not found'
            });
        }

        // Remove portfolio from user's portfolios array
        await User.findByIdAndUpdate(
            portfolio.user,
            { $pull: { portfolios: id } }
        );

        // Delete the portfolio
        await Portfolio.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Portfolio deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting portfolio:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting portfolio',
            error: error.message
        });
    }
};

exports.addHolding = async (req, res) => {
    try {
        const { portfolioId, symbol, name, quantity, price } = req.body;

        // Validate all required fields
        if (!portfolioId || !symbol || !name || !quantity || !price) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const portfolio = await Portfolio.findById(portfolioId);
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio not found'
            });
        }

        const normalizedSymbol = symbol.toUpperCase();
        const totalCost = quantity * price;

        // Find existing holding
        const existingHoldingIndex = portfolio.holdings.findIndex(
            h => h.symbol === normalizedSymbol
        );

        if (existingHoldingIndex >= 0) {
            // Update existing holding
            const existing = portfolio.holdings[existingHoldingIndex];
            const newQuantity = existing.quantity + quantity;
            const newTotalCost = existing.totalCost + totalCost;
            const newAvgPrice = newTotalCost / newQuantity;

            portfolio.holdings[existingHoldingIndex] = {
                ...existing.toObject(),
                quantity: newQuantity,
                avgBuyPrice: newAvgPrice,
                totalCost: newTotalCost,
                currentPrice: price,
                lastUpdated: new Date()
            };
        } else {
            // Add new holding
            portfolio.holdings.push({
                symbol: normalizedSymbol,
                name: name,
                quantity: quantity,
                avgBuyPrice: price,
                currentPrice: price,
                totalCost: totalCost,
                lastUpdated: new Date()
            });
        }

        // Recalculate total portfolio cost
        portfolio.totalPortfolioCost = portfolio.holdings.reduce(
            (sum, holding) => sum + holding.totalCost,
            0
        );

        await portfolio.save();

        res.status(200).json({
            success: true,
            data: portfolio
        });

    } catch (error) {
        console.error('Error adding holding:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while adding holding',
            error: error.message
        });
    }
};

exports.getPortfolioById = async (req, res) => {
    try {
        const portfolio = await Portfolio.findById(req.params.portfolioId);
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio not found'
            });
        }
        // Calculate current values and performance for each holding
        const holdingsWithPerformance = portfolio.holdings.map(holding => {
            const currentPrice = holding.currentPrice || holding.avgBuyPrice;
            const currentValue = currentPrice * holding.quantity;
            const gainLoss = currentValue - holding.totalCost;
            const percentage = (gainLoss / holding.totalCost) * 100;

            return {
                ...holding.toObject(),
                currentPrice,
                currentValue,
                gainLoss,
                percentage,
                isPositive: gainLoss >= 0
            };
        });

        // Calculate overall portfolio performance
        const currentValue = holdingsWithPerformance.reduce((sum, h) => sum + h.currentValue, 0);
        const costBasis = portfolio.totalPortfolioCost || 
                         holdingsWithPerformance.reduce((sum, h) => sum + h.totalCost, 0);
        const gainLoss = currentValue - costBasis;
        const percentage = (gainLoss / costBasis) * 100;

        res.status(200).json({
            success: true,
            data: {
                ...portfolio.toObject(),
                holdings: holdingsWithPerformance,
                currentValue,
                costBasis,
                gainLoss,
                percentage,
                isPositive: gainLoss >= 0
            }
        });

    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};


exports.evaluatePortfolio = async (req, res) => {
  const MAX_RETRIES = API_KEYS.length - 1;
  const portfolioId = req.body.portfolioId;
  
  try {
    // Fetch portfolio data from database
    const portfolio = await Portfolio.findById(portfolioId).populate('holdings');
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    // Prepare portfolio context
    const portfolioContext = `
      Portfolio Name: ${portfolio.name}
      Created On: ${portfolio.createdAt.toISOString().split('T')[0]}
      Total Value: ${portfolio.totalPortfolioCost}
      Currency: INR
      Holdings:
      ${portfolio.holdings.map(h => `
        - ${h.symbol}: ${h.quantity} shares (Avg Buy Price: ${h.avgBuyPrice}, Total Value: ${h.totalCost})
      `).join('')}
    `;
    // Prepare the prompt for Gemini
    const prompt = `
      Analyze this investment portfolio and provide:
      1. Three Key strengths (pros) - focus on diversification, performance, and asset allocation
      2. Three Potential weaknesses or risks (cons) - consider concentration risk, volatility, and market conditions
      3. Three Actionable recommendations - suggest rebalancing, new opportunities, or risk mitigation
      
      Context:
      ${portfolioContext}
      
      Format your response as a JSON object with these exact keys:
      {
        "pros": ["...", "...", "..."],
        "cons": ["...", "...", "..."],
        "recommendations": ["...", "...", "..."]
      }
      Return only the JSON object with no additional text or markdown.
    `;

    const evaluateWithRetry = async (retryCount = 0) => {
      try {
        const currentApiKey = getRandomApiKey();
        const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${currentApiKey}`;

        const payload = {
          "contents": [{
            "parts": [{
              "text": prompt
            }]
          }],
          "generationConfig": {
            "temperature": 0.5,
            "maxOutputTokens": 1000
          }
        };

        const response = await fetch(GEMINI_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.error?.message.includes("quota") && retryCount < MAX_RETRIES) {
            return evaluateWithRetry(retryCount + 1);
          }
          throw new Error(errorData.error?.message || "Gemini API error");
        }

        const result = await response.json();
        
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
          const responseText = result.candidates[0].content.parts[0].text.trim();
          // Extract JSON from response (Gemini sometimes adds markdown)
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          return JSON.parse(responseText);
        }
        
        throw new Error("Invalid response format from Gemini");
        
      } catch (error) {
        if (retryCount < MAX_RETRIES) {
          return evaluateWithRetry(retryCount + 1);
        }
        throw error;
      }
    };

    const evaluation = await evaluateWithRetry();
    res.json(evaluation);

  } catch (error) {
    console.error("Portfolio evaluation error:", error);
    res.status(500).json({ 
      message: "Error evaluating portfolio",
      error: error.message 
    });
  }
};

exports.sellHolding = async (req, res) => {
    try {
        const { portfolioId, symbol, quantity } = req.body;
        
        if (!portfolioId || !symbol || quantity <= 0) {
            return res.status(400).json({ message: 'Invalid request data' });
        }
        
        const portfolio = await Portfolio.findById(portfolioId);
        if (!portfolio) {
            return res.status(404).json({ message: 'Portfolio not found' });
        }
        
        const holdingIndex = portfolio.holdings.findIndex(h => h.symbol === symbol);
        if (holdingIndex === -1) {
            return res.status(404).json({ message: 'Holding not found in portfolio' });
        }
        
        const holding = portfolio.holdings[holdingIndex];
        if (holding.quantity < quantity) {
            return res.status(400).json({ message: 'Not enough shares to sell' });
        }
        
        // Update the holding
        holding.quantity = parseFloat((holding.quantity - quantity).toFixed(6)); // Handle decimal quantities
        holding.totalCost = parseFloat((holding.quantity * holding.avgBuyPrice).toFixed(2));
        
        // Only remove if quantity is zero (or very close due to floating point)
        if (holding.quantity < 0.000001) { // Threshold for considering it zero
            portfolio.holdings.splice(holdingIndex, 1);
        }
        
        // Update portfolio totals
        portfolio.totalPortfolioCost = parseFloat(portfolio.holdings
            .reduce((sum, h) => sum + h.totalCost, 0)
            .toFixed(2));
        portfolio.lastUpdated = Date.now();
        
        const updatedPortfolio = await portfolio.save();
        
        res.status(200).json({
            message: 'Successfully sold shares',
            data: updatedPortfolio
        });
    } catch (error) {
        console.error('Error selling holding:', error);
        res.status(500).json({ message: 'Server error while selling holding' });
    }
};