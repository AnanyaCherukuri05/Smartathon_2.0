const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');
const multer = require('multer');
const Crop = require('../models/Crop');
const MarketPrice = require('../models/MarketPrice');
const Pest = require('../models/Pest');
const Treatment = require('../models/Treatment');

dotenv.config();

// Initialize Gemini API
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Get Weather from OpenWeather API
router.get('/weather', async (req, res) => {
    try {
        const { lat = 28.6139, lon = 77.2090 } = req.query;
        const apiKey = process.env.WEATHER_API_KEY;

        if (!apiKey) throw new Error("Missing OpenWeather API Key");

        // Fetch from OpenWeather
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
        const data = response.data;

        // Map OpenWeather format to our app's visual needs
        // OpenWeather code format: https://openweathermap.org/weather-conditions
        res.json({
            temperature: data.main.temp,
            weather_code: data.weather[0].id,
            wind_speed: data.wind.speed * 3.6, // convert m/s to km/h
            description: data.weather[0].description
        });
    } catch (error) {
        console.error("OpenWeather API Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch weather' });
    }
});

// Get Crop Recommendation based on soil and season using Gemini
router.get('/recommendations', async (req, res) => {
    try {
        const { soil, season } = req.query;
        let crop = await Crop.findOne({ soilType: soil, season: season });

        // If we have Gemini setup, try to get a smart recommendation explanation
        if (ai && crop) {
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Act as a helpful farming assistant. The user has ${soil} soil and the season is ${season}. We are recommending ${crop.name}. Give a 1 sentence simple reason why this is a good crop. Farmers with low literacy should understand it easily. No complex words.`
                });

                return res.json({
                    ...crop.toObject(),
                    aiExplanation: response.text
                });
            } catch (geminiError) {
                console.error("Gemini API Error:", geminiError.message);
                // Fallback to basic DB result
                return res.json(crop);
            }
        }

        if (!crop) crop = await Crop.findOne();
        res.json(crop);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch recommendation' });
    }
});

// Get Market Prices (Simulate Agmarknet API usage)
router.get('/prices', async (req, res) => {
    try {
        const apiKey = process.env.AGMARKNET_API_KEY;
        const mongoConnected = mongoose.connection?.readyState === 1;

        const fallbackPrices = [
            { cropName: 'Wheat', currentPrice: 2200, trend: 'up', priceDiff: 50, iconName: 'Wheat', colorClass: 'text-amber-600 bg-amber-100' },
            { cropName: 'Rice (Paddy)', currentPrice: 1950, trend: 'up', priceDiff: 30, iconName: 'Leaf', colorClass: 'text-brand-green-600 bg-brand-green-100' },
            { cropName: 'Maize', currentPrice: 1800, trend: 'down', priceDiff: 20, iconName: 'Sprout', colorClass: 'text-yellow-600 bg-yellow-100' },
            { cropName: 'Cotton', currentPrice: 6500, trend: 'up', priceDiff: 150, iconName: 'Cloud', colorClass: 'text-slate-600 bg-slate-100' }
        ];

        const prices = mongoConnected ? await MarketPrice.find() : fallbackPrices;

        if (apiKey) {
            // Simulated Agmarknet Fetch. In a real scenario, this would be an axios/soap call to Agmarknet
            console.log("Using Agmarknet API Key to validate access:", apiKey.substring(0, 5) + '...');

            // Map our DB fallback into the payload 
            return res.json({
                source: 'Agmarknet API (Simulated)',
                data: prices
            });
        }
        res.json({ source: mongoConnected ? 'Local DB' : 'Fallback (no MongoDB)', data: prices });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch market prices' });
    }
});

// Setup Multer for Memory Storage
const upload = multer({ storage: multer.memoryStorage() });

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizePestName = (rawName = '') => {
    return rawName
        .replace(/^(identified\s*(pest|disease)?|pest|disease|diagnosis)\s*[:\-]\s*/i, '')
        .replace(/\*/g, '')
        .trim();
};

const extractGeminiText = (aiResponse) => {
    if (aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return aiResponse.candidates[0].content.parts[0].text;
    }

    if (typeof aiResponse?.text === 'string' && aiResponse.text.trim()) {
        return aiResponse.text;
    }

    throw new Error('Could not extract text from Gemini response');
};

const genericFallbackTreatment = {
    pesticides: [
        {
            name: 'Neem Oil Spray',
            activeIngredient: 'Azadirachtin 1500 ppm',
            type: 'Organic',
            dosage: { quantity: 3, unit: 'ml/liter' },
            applicationMethod: 'Spray on both sides of leaves in early morning or late evening',
            timingDaysSinceInfestation: 'Start immediately after first symptom',
            sprayInterval: 'Repeat every 5-7 days',
            maxApplications: 3,
            efficiency: 65,
            cost: 140,
            marketBrand: ['Neem Gold', 'Nimbecidine']
        }
    ],
    fertilizers: [
        {
            name: 'NPK 19:19:19 Water Soluble',
            type: 'NPK',
            dosage: { quantity: 1, unit: 'kg/acre' },
            applicationMethod: 'Foliar spray',
            timing: '2-3 days after pest control spray',
            benefits: ['Supports stress recovery', 'Boosts leaf growth', 'Improves plant vigor']
        }
    ],
    precautions: {
        personalProtectiveEquipment: ['Gloves', 'Mask', 'Full sleeve clothing', 'Eye protection'],
        storageInstructions: 'Store in original container away from food, children, and direct sunlight.',
        toxicityLevel: 'Low',
        waitingPeriodDays: 5,
        environmentalCautions: ['Do not spray in strong wind', 'Avoid spraying near fish ponds'],
        poisoningSymptoms: ['Skin irritation', 'Eye irritation'],
        firstAidMeasures: 'Wash exposed skin with clean water and soap. If symptoms persist, seek medical help.',
        notToMixWith: ['Strong alkaline solutions']
    },
    diseaseStage: 'Early',
    effectiveness: 65,
    costPerHectare: 350,
    duration: '5-7 days'
};

const mapResponsePayload = (diagnosis, identifiedPest, pest, treatment, source, warning = null) => ({
    diagnosis,
    identifiedPest: pest ? pest.name : identifiedPest,
    pestDetails: pest ? {
        scientificName: pest.scientificName,
        severity: pest.severity,
        symptoms: pest.symptoms,
        description: pest.description,
        affectedCrops: pest.affectedCrops
    } : null,
    treatment: treatment ? {
        pesticides: treatment.pesticides,
        fertilizers: treatment.fertilizers,
        precautions: treatment.precautions,
        diseaseStage: treatment.diseaseStage,
        effectiveness: treatment.effectiveness,
        costPerHectare: treatment.costPerHectare,
        duration: treatment.duration
    } : null,
    source,
    warning
});

const getFallbackPayload = async (reason) => {
    const fallbackDiagnosis = 'AI image analysis is temporarily unavailable.\nShowing preventive advisory so you can take safe immediate action.\nPlease verify symptoms before spraying and follow all precautions.';

    try {
        let fallbackTreatment = await Treatment.findOne({ pestName: 'Powdery Mildew' });
        if (!fallbackTreatment) {
            fallbackTreatment = await Treatment.findOne();
        }

        let fallbackPest = null;
        if (fallbackTreatment?.pestId) {
            fallbackPest = await Pest.findById(fallbackTreatment.pestId);
        }

        if (!fallbackPest && fallbackTreatment?.pestName) {
            fallbackPest = await Pest.findOne({ name: fallbackTreatment.pestName });
        }

        if (fallbackTreatment) {
            return mapResponsePayload(
                fallbackDiagnosis,
                fallbackPest?.name || 'General Crop Advisory',
                fallbackPest,
                fallbackTreatment,
                'fallback',
                reason
            );
        }
    } catch (fallbackError) {
        console.error('Fallback retrieval error:', fallbackError.message);
    }

    return mapResponsePayload(
        fallbackDiagnosis,
        'General Crop Advisory',
        null,
        genericFallbackTreatment,
        'fallback',
        reason
    );
};

const getAdvisoryTreatmentRecord = async () => {
    const preferred = await Treatment.findOne({ pestName: 'Powdery Mildew' });
    if (preferred) return preferred;
    return Treatment.findOne();
};

// Detect Pests using Gemini Vision + Database Recommendations
router.post('/pests/detect', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const mimeType = req.file.mimetype;
        const base64Data = req.file.buffer.toString("base64");

        if (!ai) {
            const fallbackPayload = await getFallbackPayload('Gemini API not configured');
            return res.json(fallbackPayload);
        }

        let analysisText = '';

        try {
            // First, get AI analysis to identify the pest
            const aiResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    },
                    `Analyze this crop image for pests, diseases, or deficiencies. 
                    Return ONLY the name of the identified disease/pest in the first line (e.g., "Powdery Mildew" or "Fall Armyworm").
                    Then on the next line, provide a simple 2-sentence diagnosis.
                    Then provide 1 actionable immediate suggestion.
                    Use simple words that farmers can understand. Include relevant emojis.`
                ]
            });

            analysisText = extractGeminiText(aiResponse);
        } catch (aiError) {
            console.error('Gemini service error. Using fallback:', aiError.message);
            const fallbackPayload = await getFallbackPayload(aiError.message);
            return res.json(fallbackPayload);
        }

        const lines = analysisText.split('\n').filter(line => line.trim());
        const identifiedPest = normalizePestName(lines[0] || 'Unknown') || 'Unknown';

        // Search for matching pest in database (case-insensitive)
        const safePattern = escapeRegex(identifiedPest.split('(')[0].trim());
        let pest = null;

        if (safePattern) {
            pest = await Pest.findOne({
                name: { $regex: new RegExp(safePattern, 'i') }
            });
        }

        // Secondary fuzzy match if exact regex does not find a record
        if (!pest && identifiedPest !== 'Unknown') {
            const allPests = await Pest.find();
            const normalizedDetected = identifiedPest.toLowerCase();
            pest = allPests.find((item) => {
                const normalizedName = item.name.toLowerCase();
                return normalizedDetected.includes(normalizedName) || normalizedName.includes(normalizedDetected);
            }) || null;
        }

        let treatment = null;
        if (pest) {
            treatment = await Treatment.findOne({ pestId: pest._id }) || await Treatment.findOne({ pestName: pest.name });
        }

        let source = 'ai';
        let warning = null;

        if (!treatment) {
            const advisoryTreatment = await getAdvisoryTreatmentRecord();
            treatment = advisoryTreatment || genericFallbackTreatment;
            source = 'advisory';

            warning = pest
                ? 'Exact treatment for detected disease is not available yet. Showing safe preventive advisory.'
                : 'Detected disease could not be matched confidently. Showing safe preventive advisory.';

            analysisText = `${analysisText}\n\nAdvisory note: Use the dosage and safety section below carefully. Consult local agriculture officer before repeating spray.`;
        }

        res.json(mapResponsePayload(analysisText, identifiedPest, pest, treatment, source, warning));
    } catch (error) {
        console.error("Pest Detection Error:", error.message);
        const fallbackPayload = await getFallbackPayload(error.message);
        res.json(fallbackPayload);
    }
});

module.exports = router;
