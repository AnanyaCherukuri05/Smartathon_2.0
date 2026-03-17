const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');
const multer = require('multer');

const Crop = require('../models/Crop');
const MarketPrice = require('../models/MarketPrice');

const normalizeLang = (lang) => {
    if (!lang) return 'en';
    return String(lang).toLowerCase().split('-')[0];
};

dotenv.config();

/*
========================================
Gemini AI Initialization
========================================
*/
let ai = null;

if (process.env.GEMINI_API_KEY) {
    try {
        ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
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
        const lang = normalizeLang(req.query.lang);
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

        // Fetch from OpenWeather
        // OpenWeather supports `lang=...` for localized description.
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=${encodeURIComponent(lang)}`
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
        const lang = normalizeLang(req.query.lang);
        let crop = await Crop.findOne({ soilType: soil, season: season });

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
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Act as a helpful farming assistant. Respond ONLY in the language with code: ${lang}. The user has ${soil} soil and the season is ${season}. We are recommending ${crop.name}. Give a 1 sentence simple reason why this is a good crop. Farmers with low literacy should understand it easily. No complex words.`
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

router.post('/pests/detect', upload.single('image'), async (req, res) => {

    try {
            const lang = normalizeLang(req.body?.lang);
        if (!req.file) {
            return res.status(400).json({ error: "Image required" });
        }

        if (!ai) {
            return res.status(500).json({ error: "Gemini not configured" });
        }

        const base64 = req.file.buffer.toString("base64");

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    inlineData: {
                        data: base64,
                        mimeType: req.file.mimetype
                    }
                },
                `Analyze this crop image. Respond ONLY in the language with code: ${lang}. Identify any visible pests, diseases, or deficiencies. Provide a very simple, short 2-sentence diagnosis and 1 actionable suggestion for a farmer. Keep words extremely simple and use emojis.`
            ]
        });

        res.json({
            analysis: response.text
        });

    } catch (error) {
        console.error("Vision error:", error.message);
        res.status(500).json({ error: "Image analysis failed" });
    }
});

module.exports = router;