const mongoose = require('mongoose');

const pestSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    scientificName: String,
    severity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    symptoms: [String],
    affectedCrops: [String],
    seasonOfOccurrence: [String],
    description: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Pest', pestSchema);
