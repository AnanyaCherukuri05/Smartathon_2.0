const mongoose = require('mongoose')

const marketPriceSchema = new mongoose.Schema({
    cropName: { type: String, required: true },
    currentPrice: { type: Number, required: true },
    trend: { type: String, enum: ['up', 'down'], required: true },
    priceDiff: { type: Number, required: true },
    iconName: { type: String, required: true },
    colorClass: { type: String, required: true }
});

module.exports = mongoose.model('MarketPrice', marketPriceSchema);
