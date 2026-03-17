const mongoose = require('mongoose');

const treatmentSchema = new mongoose.Schema({
    pestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pest', required: true },
    pestName: String,
    
    // Pesticide Information
    pesticides: [{
        name: String,
        activeIngredient: String,
        type: { type: String, enum: ['Chemical', 'Organic', 'Biological'], default: 'Chemical' },
        dosage: {
            quantity: Number,
            unit: { type: String, enum: ['ml/liter', 'gm/liter', 'kg/hectare', 'ml/pump', 'ml/hectare', 'gm/hectare', 'kg/acre'], default: 'ml/liter' }
        },
        applicationMethod: String, // e.g., "Spray on leaves", "Soil drench", etc.
        timingDaysSinceInfestation: String, // e.g., "Within 3 days of spotting"
        sprayInterval: String, // e.g., "Repeat every 7-10 days"
        maxApplications: Number,
        efficiency: { type: Number, min: 0, max: 100 }, // Effectiveness percentage
        cost: { type: Number, min: 0 }, // Per liter/kg
        marketBrand: [String] // Available brands
    }],

    // Fertilizer Information
    fertilizers: [{
        name: String,
        type: { type: String, enum: ['NPK', 'Organic', 'Micronutrient', 'Biofertilizer'], default: 'NPK' },
        dosage: {
            quantity: Number,
            unit: { type: String, enum: ['kg/hectare', 'gm/liter', 'kg/acre'], default: 'kg/hectare' }
        },
        applicationMethod: String, // e.g., "Foliar spray", "Soil application", etc.
        timing: String, // When to apply
        benefits: [String]
    }],

    // Precautions and Safety
    precautions: {
        personalProtectiveEquipment: [String], // e.g., "Gloves", "Mask", "Eye protection", etc.
        storageInstructions: String,
        toxicityLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
        waitingPeriodDays: Number, // Days to wait after spraying before harvest
        environmentalCautions: [String],
        poisoningSymptoms: [String],
        firstAidMeasures: String,
        notToMixWith: [String] // Chemicals/products not to mix with
    },

    // General Information
    diseaseStage: String, // Early, Mid, Advanced
    effectiveness: { type: Number, min: 0, max: 100 }, // Overall effectiveness
    costPerHectare: Number,
    duration: String, // Duration of treatment, e.g., "7-10 days"
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Treatment', treatmentSchema);
