const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const multer = require("multer");
const Crop = require("../models/Crop");
const Pest = require("../models/Pest");
const Treatment = require("../models/Treatment");
const requireAuth = require('../middleware/requireAuth');
const Crop = require('../models/Crop');
const MarketPrice = require('../models/MarketPrice');
const Pest = require('../models/Pest');
const Treatment = require('../models/Treatment');
const requireAuth = require('../middleware/requireAuth');

dotenv.config();

/*
==============================
Gemini AI Initialization
==============================
*/

let ai = null;

const geminiApiKey =
  process.env.GEMINI_API_KEY;

if (geminiApiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: geminiApiKey,
    });
  } catch (err) {
    console.error("Gemini init error:", err.message);
  }
}

const mongoConnected = () => mongoose.connection?.readyState === 1;

let twilioClient = null;
const weatherAlertCache = new Map();
const WEATHER_ALERT_TTL_MS = 1000 * 60 * 60 * 6;

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioSmsFrom = process.env.TWILIO_FROM_SMS;
const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_FROM;
const twilioEnableWhatsApp = String(process.env.TWILIO_ENABLE_WHATSAPP || '').toLowerCase() === 'true';

if (twilioAccountSid && twilioAuthToken) {
    try {
        // Optional dependency at runtime for real farmer alerts.
        const twilio = require('twilio');
        twilioClient = twilio(twilioAccountSid, twilioAuthToken);
    } catch (error) {
        console.error('Twilio initialization failed:', error.message);
    }
}

/*
==============================
Fallback Crops
==============================
*/

const fallbackCrops = [
  {
    name: "Wheat",
    season: "winter",
    soilType: "dry",
    iconName: "Wheat",
    colorClass: "bg-amber-100 text-amber-700",
  },
  {
    name: "Rice",
    season: "monsoon",
    soilType: "wet",
    iconName: "Leaf",
    colorClass: "bg-green-100 text-green-700",
  },
  {
    name: "Maize",
    season: "summer",
    soilType: "dry",
    iconName: "Sprout",
    colorClass: "bg-yellow-100 text-yellow-700",
  },
  {
    name: "Cotton",
    season: "summer",
    soilType: "clay",
    iconName: "Cloud",
    colorClass: "bg-slate-100 text-slate-700",
  },
];

const toNumber = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizePhoneToE164 = (rawPhone = '') => {
    const value = String(rawPhone || '').trim();
    if (!value) return null;

    if (value.startsWith('+')) {
        const normalized = `+${value.slice(1).replace(/\D/g, '')}`;
        return normalized.length >= 11 ? normalized : null;
    }

    const digits = value.replace(/\D/g, '');

    if (digits.length === 10) {
        return `+91${digits}`;
    }

    if (digits.length === 11 && digits.startsWith('0')) {
        return `+91${digits.slice(1)}`;
    }

    if (digits.length === 12 && digits.startsWith('91')) {
        return `+${digits}`;
    }

    return null;
};

const toWhatsAppAddress = (value = '') => value.startsWith('whatsapp:') ? value : `whatsapp:${value}`;

const isAlertRecentlySent = (cacheKey) => {
    const previousTimestamp = weatherAlertCache.get(cacheKey);
    if (!previousTimestamp) return false;

    return Date.now() - previousTimestamp < WEATHER_ALERT_TTL_MS;
};

const markAlertSent = (cacheKey) => {
    weatherAlertCache.set(cacheKey, Date.now());
};

const buildWeatherInsights = (currentData, forecastItems = []) => {
    const next24h = forecastItems.slice(0, 8);
    const totalRainMm24h = next24h.reduce((sum, item) => sum + toNumber(item?.rain?.['3h']), 0);
    const maxRainMm3h = next24h.reduce((max, item) => Math.max(max, toNumber(item?.rain?.['3h'])), 0);
    const maxPop = next24h.reduce((max, item) => Math.max(max, toNumber(item?.pop)), 0);
    const humidity = toNumber(currentData?.main?.humidity);
    const windKmh = toNumber(currentData?.wind?.speed) * 3.6;
    const temperature = toNumber(currentData?.main?.temp);

    const heavySlot = next24h.find((item) => {
        const rainMm = toNumber(item?.rain?.['3h']);
        const pop = toNumber(item?.pop);
        return rainMm >= 10 || (pop >= 0.9 && rainMm >= 5);
    });

    let riskLevel = 'low';
    if (totalRainMm24h >= 40 || maxRainMm3h >= 14 || (maxPop >= 0.9 && totalRainMm24h >= 12)) {
        riskLevel = 'high';
    } else if (totalRainMm24h >= 18 || maxRainMm3h >= 8 || (maxPop >= 0.7 && totalRainMm24h >= 5)) {
        riskLevel = 'medium';
    }

    const recommendations = [];

    if (riskLevel === 'high') {
        recommendations.push('High rainfall likely: harvest mature crops early and move produce to covered storage.');
        recommendations.push('Do not spray fertilizers or pesticides in the next 24 hours to avoid wash-off.');
        recommendations.push('Open drainage channels and strengthen field bunds to prevent waterlogging.');
    } else if (riskLevel === 'medium') {
        recommendations.push('Rain expected: postpone non-urgent spraying and irrigation for now.');
        recommendations.push('Inspect field drainage and clear blocked outlets before rain starts.');
    } else {
        recommendations.push('No heavy rain signal in next 24 hours; routine field activity can continue.');
    }

    if (humidity >= 85) {
        recommendations.push('High humidity may increase fungal risk. Monitor leaves for spots and mildew.');
    }

    if (windKmh >= 25) {
        recommendations.push('Strong winds detected. Avoid spraying in windy conditions to reduce drift.');
    }

    if (temperature >= 35 && riskLevel !== 'high') {
        recommendations.push('High temperature observed. Prefer early-morning irrigation and mulching.');
    }

    const alertMessage = riskLevel === 'high'
        ? 'High rainfall alert for your region. Protect standing crops, avoid spraying, and ensure fast drainage.'
        : null;

    const summary = riskLevel === 'high'
        ? 'High rainfall risk in next 24 hours. Take preventive action now.'
        : riskLevel === 'medium'
            ? 'Moderate rainfall expected. Plan operations carefully.'
            : 'Low rainfall risk in next 24 hours.';

    return {
        rainfall: {
            riskLevel,
            probabilityPercent: Math.round(maxPop * 100),
            expectedMm24h: Number(totalRainMm24h.toFixed(1)),
            maxMmIn3h: Number(maxRainMm3h.toFixed(1)),
            nextHeavyRainAt: heavySlot?.dt_txt || null,
            alert: riskLevel === 'high',
            alertMessage
        },
        farmerAdvisory: {
            summary,
            recommendations
        }
    };
};

/*
==============================
Weather API
==============================
*/

router.get("/weather", async (req, res) => {
  try {
    const { lat = 28.6139, lon = 77.209 } = req.query;

    const response = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          lat,
          lon,
          appid: process.env.WEATHER_API_KEY,
          units: "metric",
        },
        timeout: 7000,
      }
    );

    const data = response.data;

    res.json({
      temperature: data.main?.temp,
      description: data.weather?.[0]?.description,
      wind_speed: (data.wind?.speed ?? 0) * 3.6,
    });
  } catch (err) {
    console.error("Weather error:", err.message);
    res.status(500).json({ error: "Weather fetch failed" });
  }
router.get('/weather', async (req, res) => {
    try {
        const lat = toNumber(req.query.lat, 28.6139);
        const lon = toNumber(req.query.lon, 77.2090);
        const apiKey = process.env.WEATHER_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "OpenWeather API key missing" });
        }

        const currentResponse = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
            params: {
                lat,
                lon,
                appid: apiKey,
                units: 'metric'
            }
        });

        const data = currentResponse.data;

        let forecastItems = [];
        try {
            const forecastResponse = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
                params: {
                    lat,
                    lon,
                    appid: apiKey,
                    units: 'metric',
                    cnt: 12
                }
            });
            forecastItems = forecastResponse?.data?.list || [];
        } catch (forecastError) {
            console.error('Weather forecast API error:', forecastError.message);
        }

        const insights = buildWeatherInsights(data, forecastItems);

        res.json({
            city: data.name,
            location: {
                lat: toNumber(data?.coord?.lat, lat),
                lon: toNumber(data?.coord?.lon, lon)
            },
            temperature: data.main?.temp,
            weather_code: data.weather?.[0]?.id,
            wind_speed: (data.wind?.speed ?? 0) * 3.6,
            humidity: data.main?.humidity,
            description: data.weather?.[0]?.description,
            rainfall: insights.rainfall,
            farmerAdvisory: insights.farmerAdvisory,
            forecast: forecastItems.slice(0, 6).map((item) => ({
                time: item.dt_txt,
                temp: item.main?.temp,
                pop: Math.round(toNumber(item.pop) * 100),
                rainMm3h: Number(toNumber(item?.rain?.['3h']).toFixed(1))
            }))
        });

    } catch (error) {
        console.error("Weather API error:", error.message);
        res.status(500).json({ error: "Failed to fetch weather" });
    }
});

/*
========================================
Weather Alert Dispatch (SMS/WhatsApp)
========================================
*/
router.post('/weather/alerts/send', requireAuth, async (req, res) => {
    try {
        const rainfall = req.body?.rainfall || {};
        const city = String(req.body?.city || 'your region').trim();
        const riskLevel = String(rainfall.riskLevel || '').toLowerCase();
        const expectedMm24h = toNumber(rainfall.expectedMm24h);
        const nextHeavyRainAt = String(rainfall.nextHeavyRainAt || '');
        const summary = String(req.body?.summary || '').trim();
        const alertMessage = String(rainfall.alertMessage || req.body?.alertMessage || '').trim();

        if (riskLevel !== 'high') {
            return res.status(400).json({ error: 'Alert messages are sent only for high rainfall risk.' });
        }

        const normalizedPhone = normalizePhoneToE164(req.user?.phone);
        if (!normalizedPhone) {
            return res.status(400).json({ error: 'User phone number is invalid for SMS/WhatsApp alerts.' });
        }

        const cacheKey = `${req.user._id}:rain:${city}:${nextHeavyRainAt || new Date().toISOString().slice(0, 10)}`;
        if (isAlertRecentlySent(cacheKey)) {
            return res.json({
                delivered: false,
                skipped: true,
                reason: 'Rainfall alert already sent recently for this forecast window.'
            });
        }

        if (!twilioClient || !twilioSmsFrom) {
            return res.status(202).json({
                delivered: false,
                skipped: true,
                reason: 'SMS provider is not configured on server. Add Twilio env vars to enable real alerts.'
            });
        }

        const message = [
            `KisanSetu Alert: High rainfall risk in ${city}.`,
            `Expected rain (24h): ${expectedMm24h} mm.`,
            alertMessage || 'Protect standing crops, avoid spraying, and ensure fast drainage.',
            summary ? `Advice: ${summary}` : ''
        ]
            .filter(Boolean)
            .join(' ')
            .slice(0, 1500);

        const channels = [];

        await twilioClient.messages.create({
            body: message,
            from: twilioSmsFrom,
            to: normalizedPhone
        });
        channels.push('sms');

        if (twilioEnableWhatsApp && twilioWhatsAppFrom) {
            await twilioClient.messages.create({
                body: message,
                from: toWhatsAppAddress(twilioWhatsAppFrom),
                to: toWhatsAppAddress(normalizedPhone)
            });
            channels.push('whatsapp');
        }

        markAlertSent(cacheKey);

        res.json({
            delivered: true,
            skipped: false,
            channels,
            sentTo: normalizedPhone
        });
    } catch (error) {
        console.error('Weather alert dispatch error:', error.message);
        res.status(500).json({ error: 'Failed to send rainfall alert message.' });
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
==============================
Weather by City
==============================
*/

router.get("/weather/:city", async (req, res) => {
  try {
    const city = req.params.city;

    const response = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          q: city,
          appid: process.env.WEATHER_API_KEY,
          units: "metric",
        },
      }
    );

    const data = response.data;

    res.json({
      city: data.name,
      temperature: data.main?.temp,
      description: data.weather?.[0]?.description,
    });
  } catch (err) {
    res.status(500).json({ error: "City weather failed" });
  }
});

/*
==============================
Crop Recommendation
==============================
*/

router.get("/recommendations", async (req, res) => {
  try {
    const { soil, season } = req.query;

    let crop = null;

    if (mongoConnected()) {
      crop = await Crop.findOne({ soilType: soil, season });
    }

    if (!crop) {
      crop =
        fallbackCrops.find(
          (c) => c.soilType === soil && c.season === season
        ) || fallbackCrops[0];
    }

    res.json(crop);
  } catch (err) {
    res.status(500).json({ error: "Recommendation failed" });
  }
});

/*
==============================
Market Prices (AGMARKNET)
==============================
*/

router.get("/prices", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
      {
        params: {
          "api-key": process.env.AGMARKNET_API_KEY,
          format: "json",
          limit: 10,
        },
        timeout: 7000,
      }
    );

    const records = response.data?.records || [];

    const icons = ["Wheat", "Leaf", "Sprout", "Cloud"];

    const prices = records.slice(0, 4).map((item, index) => ({
      cropName: item.commodity,
      currentPrice: Number(item.modal_price || 0),
      trend: Math.random() > 0.5 ? "up" : "down",
      priceDiff: Math.floor(Math.random() * 80),
      iconName: icons[index % icons.length],
      colorClass: "bg-green-100 text-green-700",
    }));

    res.json(prices);
  } catch (err) {
    console.error("Market API failed");

    res.json([
      {
        cropName: "Wheat",
        currentPrice: 2200,
        trend: "up",
        priceDiff: 70,
        iconName: "Wheat",
      },
      {
        cropName: "Rice",
        currentPrice: 1950,
        trend: "down",
        priceDiff: 30,
        iconName: "Leaf",
      },
      {
        cropName: "Maize",
        currentPrice: 1800,
        trend: "up",
        priceDiff: 20,
        iconName: "Sprout",
      },
      {
        cropName: "Cotton",
        currentPrice: 6500,
        trend: "up",
        priceDiff: 150,
        iconName: "Cloud",
      },
    ]);
  }
});

/*
==============================
Profit Prediction
==============================
*/

router.get("/profit-prediction", async (req, res) => {
  try {
    const crops = [
      { name: "Wheat", yield: 22, cost: 12000 },
      { name: "Rice", yield: 25, cost: 14000 },
      { name: "Maize", yield: 28, cost: 11000 },
      { name: "Cotton", yield: 18, cost: 16000 },
    ];

    const response = await axios.get(
      "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
      {
        params: {
          "api-key": process.env.AGMARKNET_API_KEY,
          format: "json",
          limit: 50,
        },
      }
    );

    const records = response.data.records;

    const prices = {};

    records.forEach((r) => {
      prices[r.commodity] = Number(r.modal_price);
    });

    const results = crops.map((crop) => {
      const price = prices[crop.name] || 2000;

      const revenue = crop.yield * price;

      const profit = revenue - crop.cost;

      return {
        crop: crop.name,
        estimated_profit: profit,
      };
    });

    const bestCrop = results.sort(
      (a, b) => b.estimated_profit - a.estimated_profit
    )[0];

    res.json({
      recommendedCrop: bestCrop,
      allPredictions: results,
    });
  } catch (err) {
    res.json({
      recommendedCrop: {
        crop: "Wheat",
        estimated_profit: 18000,
      },
    });
  }
});

/*
==============================
AI Chat (No login required)
==============================
*/

router.post("/chat", async (req, res) => {
  try {
    if (!ai) {
      return res.json({
        reply: "AI is not configured.",
      });
    }

    const body = req.body || {};
    const messages = Array.isArray(body.messages)
      ? body.messages
      : typeof body.message === "string"
        ? [{ role: "user", content: body.message }]
        : [];

    const transcript = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const prompt = `You are a farming assistant.\n${transcript}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const reply =
      response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response";

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err.message);

    res.json({
      reply: "AI failed. Please try again.",
    });
  }
});

/*
==============================
Pest Detection (Image)
==============================
*/

const upload = multer({ storage: multer.memoryStorage() });

router.post("/pests/detect", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image required" });
    }

    if (!ai) {
      return res.json({
        diagnosis: "AI unavailable",
      });
    }

    const base64 = req.file.buffer.toString("base64");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: req.file.mimetype,
            data: base64,
          },
        },
        "Identify crop disease and give short solution",
      ],
    });

    const text =
      response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No diagnosis";

    res.json({
      diagnosis: text,
    });
  } catch (err) {
    console.error("Pest detection error:", err.message);

    res.json({
      diagnosis: "AI analysis failed",
    });
  }
});


module.exports = router;