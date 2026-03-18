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
const requireAuth = require("../middleware/requireAuth");

dotenv.config();

const getOpenWeatherApiKey = () => (
  process.env.WEATHER_API_KEY ||
  process.env.OPENWEATHER_API_KEY ||
  process.env.OPEN_WEATHER_API_KEY
);

const getOpenWeatherBaseUrl = () => {
  const raw = (
    process.env.OPENWEATHER_BASE_URL ||
    process.env.WEATHER_API_BASE_URL ||
    process.env.WEATHER_BASE_URL ||
    'https://api.openweathermap.org'
  );

  return String(raw).trim().replace(/\/+$/, '');
};

const buildOpenWeatherUrl = (path) => {
  const base = getOpenWeatherBaseUrl();
  const suffix = String(path || '').startsWith('/') ? String(path || '') : `/${path}`;
  return `${base}${suffix}`;
};

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

// Reverse-geocode cache to avoid hitting external services repeatedly.
// Keyed by rounded coordinates (~110m at 3 decimals).
const placeCache = new Map();
const PLACE_CACHE_TTL_MS = 1000 * 60 * 60 * 12;

const roundCoord = (value, decimals = 3) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const factor = 10 ** decimals;
  return Math.round(numeric * factor) / factor;
};

const getCachedPlace = (lat, lon) => {
  const key = `${roundCoord(lat)}:${roundCoord(lon)}`;
  const hit = placeCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.timestamp > PLACE_CACHE_TTL_MS) {
    placeCache.delete(key);
    return null;
  }
  return hit.value;
};

const setCachedPlace = (lat, lon, value) => {
  const key = `${roundCoord(lat)}:${roundCoord(lon)}`;
  placeCache.set(key, { timestamp: Date.now(), value });
};

const reverseGeocodeNominatim = async (lat, lon) => {
  const cached = getCachedPlace(lat, lon);
  if (cached) return cached;

  // Nominatim usage policy requires a valid User-Agent.
  const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
    params: {
      format: 'jsonv2',
      lat,
      lon,
      zoom: 16,
      addressdetails: 1
    },
    headers: {
      'User-Agent': 'KisanSetu/1.0 (reverse-geocode; local dev)'
    },
    timeout: 6000
  });

  const body = response?.data;
  const address = body?.address || {};

  const name = address.village || address.town || address.city || address.suburb || address.county || address.state_district || null;
  const state = address.state || null;
  const country = address.country_code ? String(address.country_code).toUpperCase() : (address.country || null);
  const displayName = body?.display_name || [name, state, country].filter(Boolean).join(', ') || null;

  const place = {
    name,
    state,
    country,
    displayName,
    source: 'nominatim'
  };

  setCachedPlace(lat, lon, place);
  return place;
};

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
  const next12h = forecastItems.slice(0, 4);
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

    // Farm-operation suggestions (today)
    const next12hRainMm = next12h.reduce((sum, item) => sum + toNumber(item?.rain?.['3h']), 0);
    const next12hMaxPop = next12h.reduce((max, item) => Math.max(max, toNumber(item?.pop)), 0);
    const next12hMaxRainMm3h = next12h.reduce((max, item) => Math.max(max, toNumber(item?.rain?.['3h'])), 0);

    const isLikelyWetSoon = riskLevel === 'high'
      || next12hMaxRainMm3h >= 5
      || next12hRainMm >= 8
      || next12hMaxPop >= 0.65;

    const isWindyForSpray = windKmh >= 20;
    const isVeryHot = temperature >= 35;
    const isVeryHumid = humidity >= 85;

    const op = (status, message) => ({ status, message });

    const harvest = isLikelyWetSoon
      ? op('caution', 'Rain may come soon. Harvest only if you can finish quickly and keep produce covered.')
      : op('good', 'Good for harvesting today. Dry and store produce in a covered place.');

    const fertilizer = isLikelyWetSoon
      ? op('avoid', 'Do not apply fertilizer now. Rain can wash it away. Apply after rain or in a dry window.')
      : op('good', 'Good to apply fertilizer today if soil has moisture. Water lightly if needed.');

    const spraying = isLikelyWetSoon
      ? op('avoid', 'Do not spray today if rain is likely. Spray can wash off.')
      : isWindyForSpray
        ? op('caution', 'Wind is strong. Spray only in early morning/evening and avoid drift.')
        : op('good', 'Good for spraying today. Prefer early morning or late afternoon.');

    const irrigation = riskLevel === 'high' || next12hRainMm >= 3
      ? op('avoid', 'Skip irrigation today. Rain/moist conditions expected. Keep drainage clear.')
      : isVeryHot
        ? op('caution', 'Hot today. Irrigate early morning and use mulching to save water.')
        : op('good', 'Irrigate only if soil is dry. Avoid over-watering.');

    const fieldWork = isLikelyWetSoon
      ? op('caution', 'Be careful with field work. Soil may become wet/slippery. Avoid heavy operations.')
      : op('good', 'Normal field work is fine today.');

    const diseaseRisk = isVeryHumid
      ? op('caution', 'High humidity: higher fungal risk. Check leaves for spots/mildew.')
      : op('good', 'Normal disease risk today. Continue regular crop monitoring.');

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
        },
        farmOperations: {
          harvest,
          fertilizer,
          spraying,
          irrigation,
          fieldWork,
          diseaseRisk
        }
    };
};

/*
==============================
Weather API
==============================
*/

router.get('/weather', async (req, res) => {
    try {
    const parseCoord = (value) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const hasLat = Object.prototype.hasOwnProperty.call(req.query || {}, 'lat');
    const hasLon = Object.prototype.hasOwnProperty.call(req.query || {}, 'lon');

    let lat = parseCoord(req.query.lat);
    let lon = parseCoord(req.query.lon);

    if ((hasLat && lat === null) || (hasLon && lon === null)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    if (lat === null) lat = 28.6139;
    if (lon === null) lon = 77.2090;

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Coordinates out of range' });
    }

        const apiKey = getOpenWeatherApiKey();

        if (!apiKey) {
            return res.status(500).json({ error: "OpenWeather API key missing" });
        }

        const currentResponse = await axios.get(buildOpenWeatherUrl('/data/2.5/weather'), {
            params: {
                lat,
                lon,
                appid: apiKey,
                units: 'metric'
          },
          timeout: 7000
        });

        const data = currentResponse.data;

        const resolvedLat = toNumber(data?.coord?.lat, lat);
        const resolvedLon = toNumber(data?.coord?.lon, lon);

        let place = null;
        try {
          const geoResponse = await axios.get(buildOpenWeatherUrl('/geo/1.0/reverse'), {
            params: {
              lat: resolvedLat,
              lon: resolvedLon,
              limit: 5,
              appid: apiKey
            },
            timeout: 6000
          });

          const candidates = Array.isArray(geoResponse.data) ? geoResponse.data : [];
          const toRad = (deg) => (Number(deg) * Math.PI) / 180;
          const haversineKm = (aLat, aLon, bLat, bLon) => {
            const R = 6371;
            const dLat = toRad(bLat - aLat);
            const dLon = toRad(bLon - aLon);
            const lat1 = toRad(aLat);
            const lat2 = toRad(bLat);

            const sinDLat = Math.sin(dLat / 2);
            const sinDLon = Math.sin(dLon / 2);
            const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
            return 2 * R * Math.asin(Math.sqrt(h));
          };

          const best = candidates
            .filter((item) => Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lon)))
            .map((item) => ({
              item,
              distanceKm: haversineKm(resolvedLat, resolvedLon, Number(item.lat), Number(item.lon))
            }))
            .sort((a, b) => a.distanceKm - b.distanceKm)[0]?.item || null;

          if (best) {
            const name = best.name || null;
            const state = best.state || null;
            const country = best.country || null;
            const displayName = [name, state, country].filter(Boolean).join(', ') || null;

            place = {
              name,
              state,
              country,
              displayName,
              source: 'openweather'
            };
          }
        } catch (geoError) {
          console.error('Weather reverse geocode error:', geoError.message);
        }

        // Prefer a more precise locality label when available.
        try {
            const nominatimPlace = await reverseGeocodeNominatim(resolvedLat, resolvedLon);
            if (nominatimPlace?.displayName) {
                place = nominatimPlace;
            }
        } catch (nominatimError) {
            // Silent fallback: weather should still work even if reverse-geocoding fails.
        }

        let forecastItems = [];
        try {
            const forecastResponse = await axios.get(buildOpenWeatherUrl('/data/2.5/forecast'), {
                params: {
              lat: resolvedLat,
              lon: resolvedLon,
                    appid: apiKey,
                    units: 'metric',
                    cnt: 12
            },
            timeout: 7000
            });
            forecastItems = forecastResponse?.data?.list || [];
        } catch (forecastError) {
            console.error('Weather forecast API error:', forecastError.message);
        }

        const insights = buildWeatherInsights(data, forecastItems);

        res.json({
          city: data.name,
          place,
          requestedLocation: {
            lat,
            lon
          },
            location: {
            lat: resolvedLat,
            lon: resolvedLon
            },
            temperature: data.main?.temp,
            weather_code: data.weather?.[0]?.id,
            wind_speed: (data.wind?.speed ?? 0) * 3.6,
            humidity: data.main?.humidity,
            description: data.weather?.[0]?.description,
            rainfall: insights.rainfall,
            farmerAdvisory: insights.farmerAdvisory,
            farmOperations: insights.farmOperations,
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
    const apiKey = getOpenWeatherApiKey();

    if (!apiKey) {
      return res.status(500).json({ error: "OpenWeather API key missing" });
    }

        const city = encodeURIComponent(req.params.city);

        const response = await axios.get(buildOpenWeatherUrl('/data/2.5/weather'), {
          params: {
            q: city,
            appid: apiKey,
            units: 'metric'
          },
          timeout: 7000
        });

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