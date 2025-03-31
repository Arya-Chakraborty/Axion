const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    name: {
        type: String,
        trim: true
    },
    portfolios: [{
        type: Schema.Types.ObjectId,
        ref: 'Portfolio'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastActive: {
        type: Date
    }
});

module.exports = mongoose.model('User', UserSchema);