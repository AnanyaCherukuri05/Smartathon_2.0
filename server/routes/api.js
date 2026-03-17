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