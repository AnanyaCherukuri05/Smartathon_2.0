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

// Initialize Gemini API
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Get Weather from OpenWeather API
router.get('/weather', async (req, res) => {
    try {
        const { lat = 28.6139, lon = 77.2090 } = req.query;
        const lang = normalizeLang(req.query.lang);
        const apiKey = process.env.WEATHER_API_KEY;

        if (!apiKey) throw new Error("Missing OpenWeather API Key");

        // Fetch from OpenWeather
        // OpenWeather supports `lang=...` for localized description.
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=${encodeURIComponent(lang)}`
        );
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
        const lang = normalizeLang(req.query.lang);
        let crop = await Crop.findOne({ soilType: soil, season: season });

        // If we have Gemini setup, try to get a smart recommendation explanation
        if (ai && crop) {
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Act as a helpful farming assistant. Respond ONLY in the language with code: ${lang}. The user has ${soil} soil and the season is ${season}. We are recommending ${crop.name}. Give a 1 sentence simple reason why this is a good crop. Farmers with low literacy should understand it easily. No complex words.`
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

// Detect Pests using Gemini Vision
router.post('/pests/detect', upload.single('image'), async (req, res) => {
    try {
            const lang = normalizeLang(req.body?.lang);
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        if (!ai) {
            return res.status(500).json({ error: 'Gemini API not configured' });
        }

        const mimeType = req.file.mimetype;
        const base64Data = req.file.buffer.toString("base64");

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType
                    }
                },
                `Analyze this crop image. Respond ONLY in the language with code: ${lang}. Identify any visible pests, diseases, or deficiencies. Provide a very simple, short 2-sentence diagnosis and 1 actionable suggestion for a farmer. Keep words extremely simple and use emojis.`
            ]
        });

        res.json({ analysis: response.text });
    } catch (error) {
        console.error("Gemini Vision Error:", error.message);
        res.status(500).json({ error: 'Failed to analyze image' });
    }
});

module.exports = router;
