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
Gemini Initialization
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
Fallback Crops
========================================
*/
const fallbackCrops = [
    { name: 'Wheat', season: 'winter', soilType: 'dry' },
    { name: 'Rice', season: 'monsoon', soilType: 'wet' },
    { name: 'Maize', season: 'summer', soilType: 'dry' },
    { name: 'Cotton', season: 'summer', soilType: 'clay' }
];

/*
========================================
Weather by Coordinates
========================================
*/
router.get('/weather', async (req, res) => {

    try {

        let { lat, lon } = req.query;

        lat = parseFloat(lat) || 28.6139;
        lon = parseFloat(lon) || 77.2090;

        const apiKey = process.env.WEATHER_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "OpenWeather API key missing"
            });
        }

        const response = await axios.get(
            "https://api.openweathermap.org/data/2.5/weather",
            {
                params: {
                    lat,
                    lon,
                    appid: apiKey,
                    units: "metric"
                }
            }
        );

        const data = response.data;

        res.json({
            temperature: data?.main?.temp ?? null,
            weather_code: data?.weather?.[0]?.id ?? null,
            wind_speed: (data?.wind?.speed ?? 0) * 3.6,
            description: data?.weather?.[0]?.description ?? "clear sky"
        });

    } catch (error) {

        console.error(
            "Weather API Error:",
            error.response?.data || error.message
        );

        res.status(500).json({
            error: "Weather API failed",
            details: error.response?.data || error.message
        });
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
        const city = req.params.city;

        const response = await axios.get(
            "https://api.openweathermap.org/data/2.5/weather",
            {
                params: {
                    q: city,
                    appid: apiKey,
                    units: "metric"
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

        console.error("Weather City API Error:", error.response?.data);

        res.status(500).json({
            error: "Weather fetch failed"
        });
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
                    contents: `Farmer has ${soil} soil and season ${season}. Recommend ${cropPayload.name} in simple words.`
                });

                const text =
                    aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text ||
                    aiResponse?.text ||
                    "";

                return res.json({
                    ...cropPayload,
                    aiExplanation: text
                });

            } catch (err) {
                console.error("Gemini error:", err.message);
            }
        }

        res.json(cropPayload);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Recommendation failed" });
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
            return res.status(400).json({
                error: "Invalid soil values"
            });
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

    } catch (error) {
        res.status(500).json({ error: "Soil analysis failed" });
    }
});

/*
========================================
Market Prices
========================================
*/

router.get('/prices', async (req, res) => {

    try {

        const apiKey = process.env.AGMARKNET_API_KEY;

        const url =
            `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=10`;

        const response = await axios.get(url);

        const records = response.data?.records || [];

        if (!records.length) {
            throw new Error("No market data returned");
        }

        const mappedData = records.slice(0, 4).map((item, index) => {

            const price = Number(item.modal_price || 0);

            const icons = ['Wheat', 'Leaf', 'Sprout', 'Cloud'];

            return {
                cropName: item.commodity || "Crop",
                currentPrice: price,
                trend: Math.random() > 0.5 ? "up" : "down",
                priceDiff: Math.floor(Math.random() * 100),
                iconName: icons[index % icons.length],
                colorClass: "bg-green-100 text-green-700"
            };
        });

        res.json(mappedData);

    } catch (error) {

        console.error("Agmarknet error:", error.message);

        /*
        Fallback Data
        */

        const fallback = [
            {
                cropName: "Wheat",
                currentPrice: 2200,
                trend: "up",
                priceDiff: 80,
                iconName: "Wheat",
                colorClass: "bg-amber-100 text-amber-700"
            },
            {
                cropName: "Rice",
                currentPrice: 1950,
                trend: "down",
                priceDiff: 40,
                iconName: "Leaf",
                colorClass: "bg-green-100 text-green-700"
            },
            {
                cropName: "Maize",
                currentPrice: 1850,
                trend: "up",
                priceDiff: 30,
                iconName: "Sprout",
                colorClass: "bg-yellow-100 text-yellow-700"
            },
            {
                cropName: "Cotton",
                currentPrice: 6500,
                trend: "up",
                priceDiff: 120,
                iconName: "Cloud",
                colorClass: "bg-slate-100 text-slate-700"
            }
        ];

        res.json(fallback);
    }
});

/*
========================================
AI Crop Profit Prediction
========================================
*/

router.get('/profit-prediction', async (req, res) => {

    try {

        const crops = [
            { name: "Wheat", yield: 22, cost: 12000 },
            { name: "Rice", yield: 25, cost: 14000 },
            { name: "Maize", yield: 28, cost: 11000 },
            { name: "Cotton", yield: 18, cost: 16000 }
        ];

        const apiKey = process.env.AGMARKNET_API_KEY;

        const response = await axios.get(
            `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070`,
            {
                params: {
                    "api-key": apiKey,
                    format: "json",
                    limit: 100
                }
            }
        );

        const records = response.data?.records || [];

        const prices = {};

        /*
        ===============================
        Normalize commodity names
        ===============================
        */

        records.forEach(r => {

            if (!r.commodity) return;

            const commodity = r.commodity.toLowerCase();

            if (commodity.includes("wheat")) {
                prices["Wheat"] = Number(r.modal_price || 0);
            }

            if (commodity.includes("rice") || commodity.includes("paddy")) {
                prices["Rice"] = Number(r.modal_price || 0);
            }

            if (commodity.includes("maize") || commodity.includes("corn")) {
                prices["Maize"] = Number(r.modal_price || 0);
            }

            if (commodity.includes("cotton")) {
                prices["Cotton"] = Number(r.modal_price || 0);
            }

        });

        /*
        ===============================
        Calculate profits
        ===============================
        */

        const predictions = crops.map(crop => {

            const price = prices[crop.name] || 2000;

            const revenue = crop.yield * price;

            const profit = revenue - crop.cost;

            return {
                crop: crop.name,
                yield_per_acre: crop.yield,
                price_per_quintal: price,
                cultivation_cost: crop.cost,
                estimated_profit: profit
            };

        });

        /*
        ===============================
        Find best crop
        ===============================
        */

        const bestCrop = predictions.sort(
            (a, b) => b.estimated_profit - a.estimated_profit
        )[0];

        /*
        ===============================
        AI explanation
        ===============================
        */

        let explanation = "";

        if (ai) {

            try {

                const aiResponse = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: `A farmer wants to know which crop is most profitable.
                    Best crop: ${bestCrop.crop}.
                    Estimated profit: ₹${bestCrop.estimated_profit}.
                    Explain in 1 simple sentence for farmers.`
                });

                explanation =
                    aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text ||
                    aiResponse?.text ||
                    "";

            } catch (err) {
                console.error("AI explanation failed:", err.message);
            }

        }

        res.json({
            recommendedCrop: bestCrop,
            explanation,
            allPredictions: predictions
        });

    } catch (error) {

        console.error("Profit prediction error:", error.message);

        /*
        Fallback prediction
        */

        res.json({
            recommendedCrop: {
                crop: "Maize",
                estimated_profit: 45000
            },
            explanation: "Maize is currently profitable due to strong demand and lower cultivation cost."
        });

    }

});

/*
========================================
Pest Detection
========================================
*/
const upload = multer({ storage: multer.memoryStorage() });

router.post('/pests/detect', upload.single('image'), async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({ error: "Image required" });
        }

        if (!ai) {
            return res.status(500).json({ error: "Gemini API not configured" });
        }

        const base64 = req.file.buffer.toString("base64");

        const aiResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    inlineData: {
                        data: base64,
                        mimeType: req.file.mimetype
                    }
                },
                "Identify pest or disease and give simple advice."
            ]
        });

        const text =
            aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text ||
            aiResponse?.text ||
            "No analysis";

        res.json({
            analysis: text
        });

    } catch (error) {

        console.error("Pest detection error:", error.message);

        res.status(500).json({
            error: "Image analysis failed"
        });
    }
});

module.exports = router;