const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PortfolioSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        default: 'My Portfolio'
    },
    holdings: [{
        symbol: {
            type: String,
            required: true,
            uppercase: true
        },
        name: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 0
        },
        avgBuyPrice: {
            type: Number,
            required: true,
            min: 0
        },
        currentPrice: {
            type: Number,
            min: 0
        },
        totalCost: {  // New field for total buying cost
            type: Number,
            required: true,
            min: 0,
            default: function() {
                return this.quantity * this.avgBuyPrice;
            }
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    }],
    totalPortfolioCost: {  // New field for portfolio-wide total cost
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

PortfolioSchema.pre('save', function (next) {
    this.lastUpdated = Date.now();
    next();
});

module.exports = mongoose.model('Portfolio', PortfolioSchema);