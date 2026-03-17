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

/*
========================================
Gemini AI Initialization
========================================
*/
let ai = null;
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (geminiApiKey) {
    try {
        ai = new GoogleGenAI({
            apiKey: geminiApiKey
        });
    } catch (err) {
        console.error("Gemini initialization failed:", err.message);
    }
}

const mongoConnected = () => mongoose.connection?.readyState === 1;

/*
========================================
Fallback Crops (if DB missing)
========================================
*/
const fallbackCrops = [
    { name: 'Wheat', season: 'winter', soilType: 'dry', iconName: 'Wheat', colorClass: 'bg-amber-100 text-amber-700' },
    { name: 'Rice', season: 'monsoon', soilType: 'wet', iconName: 'Leaf', colorClass: 'bg-green-100 text-green-700' },
    { name: 'Maize', season: 'summer', soilType: 'dry', iconName: 'Sprout', colorClass: 'bg-yellow-100 text-yellow-700' },
    { name: 'Cotton', season: 'summer', soilType: 'clay', iconName: 'Cloud', colorClass: 'bg-slate-100 text-slate-700' },
];

/*
========================================
Weather by Coordinates
========================================
*/
router.get('/weather', async (req, res) => {
    try {
        const { lat = 28.6139, lon = 77.2090 } = req.query;
        const apiKey = process.env.WEATHER_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "OpenWeather API key missing" });
        }

        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather`,
            {
                params: {
                    lat,
                    lon,
                    appid: apiKey,
                    units: 'metric'
                }
            }
        );

        const data = response.data;

        res.json({
            temperature: data.main?.temp,
            weather_code: data.weather?.[0]?.id,
            wind_speed: (data.wind?.speed ?? 0) * 3.6,
            description: data.weather?.[0]?.description
        });

    } catch (error) {
        console.error("Weather API error:", error.message);
        res.status(500).json({ error: "Failed to fetch weather" });
    }
});

/*
========================================
Weather by City
========================================
*/
router.get('/weather/:city', async (req, res) => {
    try {
        const apiKey = process.env.WEATHER_API_KEY;

        const city = encodeURIComponent(req.params.city);

        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather`,
            {
                params: {
                    q: city,
                    appid: apiKey,
                    units: 'metric'
                }
            }
        );

        const data = response.data;

        res.json({
            city: data.name,
            temperature: data.main?.temp,
            weather_code: data.weather?.[0]?.id,
            wind_speed: (data.wind?.speed ?? 0) * 3.6,
            description: data.weather?.[0]?.description
        });

    } catch (error) {

        if (error.response?.status === 404) {
            return res.status(404).json({ error: "City not found" });
        }

        console.error("Weather city API error:", error.message);
        res.status(500).json({ error: "Failed to fetch weather" });
    }
});

/*
========================================
Crop Recommendation
========================================
*/
router.get('/recommendations', async (req, res) => {

    try {

        const { soil, season } = req.query;

        let crop = null;

        if (mongoConnected()) {
            crop = await Crop.findOne({ soilType: soil, season });
        }

        if (!crop) {
            crop = fallbackCrops.find(
                c => c.soilType === soil && c.season === season
            ) || fallbackCrops[0];
        }

        const cropPayload = crop.toObject ? crop.toObject() : crop;

        if (ai) {
            try {

                const aiResponse = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: `Farmer has ${soil} soil and season is ${season}. Recommend ${cropPayload.name}. Explain in 1 simple sentence for a farmer.`
                });

                return res.json({
                    ...cropPayload,
                    aiExplanation: aiResponse.text
                });

            } catch (err) {
                console.error("Gemini error:", err.message);
            }
        }

        res.json(cropPayload);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch recommendation" });
    }
});

/*
========================================
Soil Analysis
========================================
*/
router.post('/soil/analyze', (req, res) => {

    try {

        const moisture = Number(req.body.moisture);
        const ph = Number(req.body.ph);

        if (!Number.isFinite(moisture) || !Number.isFinite(ph)) {
            return res.status(400).json({ error: "Invalid soil values" });
        }

        const moistureStatus =
            moisture < 30 ? "too_dry" :
                moisture > 80 ? "too_wet" :
                    "good";

        const phStatus =
            ph < 5.5 ? "acidic" :
                ph > 7.5 ? "alkaline" :
                    "neutral";

        res.json({
            moisture,
            ph,
            moistureStatus,
            phStatus
        });

    } catch (err) {
        res.status(500).json({ error: "Soil analysis failed" });
    }
});

/*
========================================
Market Prices (Real AGMARKNET API)
========================================
*/
router.get('/prices', async (req, res) => {

    try {

        const apiKey = process.env.AGMARKNET_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "Agmarknet API key missing" });
        }

        const url =
            `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=10`;

        const response = await axios.get(url);

        res.json({
            source: "AGMARKNET",
            data: response.data.records
        });

    } catch (error) {
        console.error("Agmarknet error:", error.message);
        res.status(500).json({ error: "Failed to fetch market prices" });
    }
});

/*
========================================
Pest Detection (Gemini Vision)
========================================
*/
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

const normalizeServiceWarning = (reason) => {
    const raw = typeof reason === 'string' ? reason : '';
    const value = raw.toLowerCase();

    if (!value.trim()) {
        return 'AI service is temporarily unavailable. Showing preventive advisory mode.';
    }

    if (value.includes('reported as leaked') || value.includes('permission_denied') || value.includes('api key')) {
        return 'AI key issue detected. Update GEMINI_API_KEY/GOOGLE_API_KEY in server .env and restart backend.';
    }

    if (value.includes('quota') || value.includes('rate limit')) {
        return 'AI usage limit reached temporarily. Showing preventive advisory mode.';
    }

    return 'AI service is temporarily unavailable. Showing preventive advisory mode.';
};

const getFallbackPayload = async (reason) => {
    const safeReason = normalizeServiceWarning(reason);
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
                safeReason
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
        safeReason
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
            return res.status(400).json({ error: "Image required" });
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