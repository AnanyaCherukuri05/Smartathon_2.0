const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
    name: { type: String, required: true },
    season: { type: String, required: true, enum: ['summer', 'winter', 'monsoon'] },
    soilType: { type: String, required: true, enum: ['dry', 'wet', 'clay'] },
    iconName: { type: String, required: true },
    colorClass: { type: String, required: true }
});

module.exports = mongoose.model('Crop', cropSchema);
