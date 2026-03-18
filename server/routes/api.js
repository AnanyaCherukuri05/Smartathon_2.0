const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require("multer");
const Crop = require("../models/Crop");
const Pest = require("../models/Pest");
const Treatment = require("../models/Treatment");
const requireAuth = require("../middleware/requireAuth");
const MarketPrice = require("../models/MarketPrice");

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

let aiClient = null;
let aiModel = null;

const geminiApiKey =
  process.env.GEMINI_API_KEY;

if (geminiApiKey) {
  try {
    // The @google/generative-ai constructor expects the API key string directly.
    aiClient = new GoogleGenerativeAI(geminiApiKey);
    aiModel = aiClient.getGenerativeModel({
      model: "gemini-2.5-flash",
    });
    console.log("Gemini AI initialized successfully");
  } catch (err) {
    console.error("Gemini init error:", err.message);
  }
} else {
  console.warn("GEMINI_API_KEY not set - AI features will be unavailable");
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

  const DEFAULT_MARKET_PRICE_LOOKUP = {
    wheat: 2200,
    rice: 1950,
    maize: 1800,
    cotton: 6500
  };

  const DEFAULT_CROP_ECONOMICS = {
    wheat: { yieldQuintalPerAcre: 22, costPerAcre: 12000 },
    rice: { yieldQuintalPerAcre: 25, costPerAcre: 14000 },
    maize: { yieldQuintalPerAcre: 28, costPerAcre: 11000 },
    cotton: { yieldQuintalPerAcre: 18, costPerAcre: 16000 }
  };

  const normalizeTextKey = (value = '') => String(value || '').trim().toLowerCase();

  const SOIL_PROFILE_LOOKUP = {
    alluvial: {
      label: 'Alluvial Soil (River Plains)',
      canonicalType: 'wet',
      texture: 'Silty loam to clay loam',
      drainage: 'Moderate drainage with high natural fertility',
      waterHoldingCapacity: 'Medium to high',
      phRange: '6.5 to 8.0',
      typicalStates: 'Punjab, Haryana, Uttar Pradesh, Bihar, West Bengal',
      notes: 'Very suitable for irrigated paddy-wheat systems and sugarcane belts.'
    },
    loamy: {
      label: 'Loamy Soil',
      canonicalType: 'dry',
      texture: 'Balanced sand, silt and clay',
      drainage: 'Good drainage and aeration',
      waterHoldingCapacity: 'Medium',
      phRange: '6.0 to 7.5',
      typicalStates: 'Karnataka, Telangana, Maharashtra, parts of MP',
      notes: 'Flexible soil for pulses, maize, oilseeds and vegetables.'
    },
    sandy: {
      label: 'Sandy Soil',
      canonicalType: 'dry',
      texture: 'Coarse and light texture',
      drainage: 'Very high drainage',
      waterHoldingCapacity: 'Low',
      phRange: '5.5 to 7.0',
      typicalStates: 'Rajasthan, dry belts of Gujarat and Haryana',
      notes: 'Needs frequent irrigation and organic matter for better moisture retention.'
    },
    black_clay: {
      label: 'Black / Clayey Soil',
      canonicalType: 'clay',
      texture: 'Heavy clay (shrink-swell type)',
      drainage: 'Slow drainage',
      waterHoldingCapacity: 'High',
      phRange: '7.0 to 8.5',
      typicalStates: 'Maharashtra, MP, Gujarat, Telangana',
      notes: 'Excellent moisture holding, suitable for cotton, soybean and paddy in lowlands.'
    },
    red: {
      label: 'Red Soil',
      canonicalType: 'dry',
      texture: 'Sandy loam to loam with low organic carbon',
      drainage: 'Good drainage',
      waterHoldingCapacity: 'Low to medium',
      phRange: '6.0 to 7.0',
      typicalStates: 'Tamil Nadu, Karnataka, Andhra Pradesh, Odisha',
      notes: 'Responds well to integrated nutrient management and mulching.'
    },
    laterite: {
      label: 'Laterite Soil',
      canonicalType: 'dry',
      texture: 'Gravelly to loamy, acidic tendency',
      drainage: 'Moderate to high drainage',
      waterHoldingCapacity: 'Low',
      phRange: '5.0 to 6.5',
      typicalStates: 'Kerala, Karnataka uplands, Goa, Odisha uplands',
      notes: 'Needs organic amendments and lime-based correction where acidity is high.'
    },
    saline_alkaline: {
      label: 'Saline / Alkaline Soil',
      canonicalType: 'wet',
      texture: 'Salt-affected surface, poor structure',
      drainage: 'Can have poor infiltration',
      waterHoldingCapacity: 'Medium',
      phRange: '8.0 to 9.5',
      typicalStates: 'Coastal belts, canal commands, arid irrigated regions',
      notes: 'Use salt-tolerant varieties and improve drainage plus gypsum management.'
    },
    peaty_wetland: {
      label: 'Peaty / Wetland Soil',
      canonicalType: 'wet',
      texture: 'Organic-rich, dark and moisture heavy',
      drainage: 'Waterlogged tendency',
      waterHoldingCapacity: 'Very high',
      phRange: '4.5 to 6.5',
      typicalStates: 'Kerala wetlands, coastal deltas and marshy pockets',
      notes: 'Ideal for lowland paddy with proper drainage and nutrient balancing.'
    }
  };

  const SOIL_KEY_ALIASES = {
    dry: 'loamy',
    wet: 'alluvial',
    clay: 'black_clay',
    alluvial: 'alluvial',
    loam: 'loamy',
    loamy: 'loamy',
    sandy: 'sandy',
    sand: 'sandy',
    black_clay: 'black_clay',
    black: 'black_clay',
    black_soil: 'black_clay',
    clayey: 'black_clay',
    clay_soil: 'black_clay',
    red: 'red',
    red_soil: 'red',
    laterite: 'laterite',
    lateritic: 'laterite',
    saline: 'saline_alkaline',
    alkaline: 'saline_alkaline',
    saline_alkaline: 'saline_alkaline',
    sodic: 'saline_alkaline',
    peaty_wetland: 'peaty_wetland',
    peaty: 'peaty_wetland',
    marshy: 'peaty_wetland',
    wetland: 'peaty_wetland',
    delta_wetland: 'peaty_wetland'
  };

  const RICE_VARIETY_GROUP_GUIDE = {
    wet: {
      kharif: [
        { name: 'Swarna (MTU 7029)', fit: 'Stable high yield in irrigated lowlands', durationDays: '135-145', waterNeed: 'Medium to high' },
        { name: 'Samba Mahsuri (BPT 5204)', fit: 'Premium grain quality with good market demand', durationDays: '145-155', waterNeed: 'Medium to high' },
        { name: 'IR-64', fit: 'Reliable performer under uniform water management', durationDays: '120-130', waterNeed: 'Medium' }
      ],
      rabi: [
        { name: 'MTU 1010', fit: 'Suitable for irrigated Rabi cultivation', durationDays: '120-125', waterNeed: 'Medium' },
        { name: 'Pusa Basmati 1509', fit: 'Good for export-oriented aromatic grain markets', durationDays: '115-120', waterNeed: 'Medium' },
        { name: 'CR Dhan 801 (Swarna Sub1)', fit: 'Handles short flooding and recovers well', durationDays: '140-145', waterNeed: 'Medium to high' }
      ],
      zaid: [
        { name: 'ADT 43', fit: 'Performs well in summer irrigated windows', durationDays: '110-115', waterNeed: 'Medium' },
        { name: 'PR 126', fit: 'Early maturity helps save irrigation water', durationDays: '93-110', waterNeed: 'Low to medium' },
        { name: 'CO 51', fit: 'Suitable for intensive management with balanced nutrition', durationDays: '105-110', waterNeed: 'Medium' }
      ]
    },
    dry: {
      kharif: [
        { name: 'Sahbhagi Dhan', fit: 'Drought-tolerant option for rainfed uplands', durationDays: '105-115', waterNeed: 'Low to medium' },
        { name: 'DRR Dhan 42', fit: 'Suitable for low-rainfall belts with stress tolerance', durationDays: '110-120', waterNeed: 'Low to medium' },
        { name: 'N22', fit: 'Heat and drought resilient under uncertain monsoon', durationDays: '100-110', waterNeed: 'Low' }
      ],
      rabi: [
        { name: 'MTU 1001', fit: 'Adaptable in light soils with controlled irrigation', durationDays: '120-130', waterNeed: 'Medium' },
        { name: 'Naveen', fit: 'Suitable for short-duration windows and mixed farming', durationDays: '110-120', waterNeed: 'Medium' },
        { name: 'Anjali', fit: 'Good for upland direct-seeded conditions', durationDays: '95-105', waterNeed: 'Low to medium' }
      ],
      zaid: [
        { name: 'Vandana', fit: 'Works well in upland and direct-seeded systems', durationDays: '95-105', waterNeed: 'Low' },
        { name: 'Poornima', fit: 'Short-duration summer choice for lighter soils', durationDays: '100-110', waterNeed: 'Low to medium' },
        { name: 'Prabhat', fit: 'Early maturity reduces late-season heat stress', durationDays: '90-100', waterNeed: 'Low to medium' }
      ]
    },
    clay: {
      kharif: [
        { name: 'Jaya', fit: 'Suitable for heavy soils and bunded fields', durationDays: '130-140', waterNeed: 'Medium to high' },
        { name: 'CO 51', fit: 'Good response under fertile clay soils', durationDays: '105-110', waterNeed: 'Medium' },
        { name: 'MTU 1156', fit: 'Strong tillering in heavy moisture-retentive fields', durationDays: '130-140', waterNeed: 'Medium to high' }
      ],
      rabi: [
        { name: 'BPT 5204', fit: 'Fine grain quality and premium market acceptability', durationDays: '145-155', waterNeed: 'Medium to high' },
        { name: 'Ponni', fit: 'Consistent grain filling under irrigated clay tracts', durationDays: '125-135', waterNeed: 'Medium' },
        { name: 'Tellahamsa', fit: 'Suitable for medium to heavy textured irrigated soils', durationDays: '125-130', waterNeed: 'Medium' }
      ],
      zaid: [
        { name: 'ADT 45', fit: 'Performs in summer transplanted systems', durationDays: '110-115', waterNeed: 'Medium' },
        { name: 'Bhavani', fit: 'Stable under warm temperatures in clay basins', durationDays: '120-125', waterNeed: 'Medium to high' },
        { name: 'MTU 1010', fit: 'Reliable for assured irrigation areas', durationDays: '120-125', waterNeed: 'Medium' }
      ]
    }
  };

const normalizeSoilKey = (value = '') => {
    const input = normalizeTextKey(value)
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    return SOIL_KEY_ALIASES[input] || 'loamy';
  };

  const getSoilProfile = (value = '') => {
    const key = normalizeSoilKey(value);
    const profile = SOIL_PROFILE_LOOKUP[key] || SOIL_PROFILE_LOOKUP.loamy;

    return {
      key,
      ...profile
    };
  };

  const normalizeSoilType = (value = '') => {
    return getSoilProfile(value).canonicalType;
  };

  const getIndianSeasonContext = (date = new Date()) => {
    const month = date.getMonth() + 1;

    if (month >= 6 && month <= 9) {
      return { season: 'monsoon', farmingSeason: 'Kharif', label: 'Kharif (Monsoon)' };
    }

    if (month >= 10 || month <= 2) {
      return { season: 'winter', farmingSeason: 'Rabi', label: 'Rabi (Winter)' };
    }

    return { season: 'summer', farmingSeason: 'Zaid', label: 'Zaid (Summer)' };
  };

  const getCropEconomics = (cropName = '') => {
    const key = normalizeTextKey(cropName);
    return DEFAULT_CROP_ECONOMICS[key] || { yieldQuintalPerAcre: 20, costPerAcre: 12000 };
  };

  const getIconNameForCrop = (cropName = '') => {
    const key = normalizeTextKey(cropName);
    if (key.includes('rice') || key.includes('paddy')) return 'Leaf';
    if (key.includes('maize') || key.includes('corn')) return 'Sprout';
    if (key.includes('cotton')) return 'Cloud';
    return 'Wheat';
  };

  const getRiceSeasonBucket = (seasonContext = {}) => {
    const farmingSeason = normalizeTextKey(seasonContext?.farmingSeason);
    const season = normalizeTextKey(seasonContext?.season);

    if (farmingSeason === 'kharif' || season === 'monsoon') return 'kharif';
    if (farmingSeason === 'rabi' || season === 'winter') return 'rabi';
    return 'zaid';
  };

  const isRiceCrop = (cropName = '') => {
    const key = normalizeTextKey(cropName);
    return key.includes('rice') || key.includes('paddy');
  };

  const getRiceVarietySuggestion = ({ cropName, soilProfile, seasonContext }) => {
    if (!isRiceCrop(cropName)) return null;

    const seasonBucket = getRiceSeasonBucket(seasonContext);
    const groupKey = soilProfile?.canonicalType || 'wet';
    const guide = RICE_VARIETY_GROUP_GUIDE[groupKey] || RICE_VARIETY_GROUP_GUIDE.wet;
    const varieties = Array.isArray(guide[seasonBucket]) ? guide[seasonBucket] : guide.kharif;

    return {
      title: 'Suitable Rice Varieties for Your Field',
      reason: `Based on ${soilProfile?.label || 'your soil type'} and ${seasonContext?.label || 'current season'}.`,
      varieties,
      advisory: 'Use certified seed and verify district-level package of practices before final seed purchase.'
    };
  };

  const extractJsonFromModelText = (text = '') => {
    const raw = String(text || '').trim();
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (parseError) {
      // Continue trying to extract the first JSON object.
    }

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch (parseError) {
      return null;
    }
  };

  const normalizeConfidenceLabel = (value = '') => {
    const key = normalizeTextKey(value);

    if (['high', 'strong', 'confident'].includes(key)) return 'high';
    if (['medium', 'moderate', 'partial'].includes(key)) return 'medium';
    if (['low', 'weak', 'uncertain'].includes(key)) return 'low';

    return '';
  };

  const getSoilDetectionFromImage = async ({ file, fallbackSoilProfile }) => {
    const fallback = fallbackSoilProfile || getSoilProfile('loamy');

    if (!aiModel || !file?.buffer?.length) {
      return {
        soilProfile: fallback,
        detectedFromImage: false,
        confidence: '',
        soilClues: '',
        source: 'fallback',
      };
    }

    try {
      const prompt = [
        {
          inlineData: {
            mimeType: file.mimetype || 'image/jpeg',
            data: file.buffer.toString('base64')
          }
        },
        [
          'You are a soil analyst for Indian agriculture.',
          'Inspect the field image and infer the most likely soil group.',
          'Return STRICT JSON only with keys: detectedSoilType, confidence, soilClues, reasoning.',
          'detectedSoilType must be one of: alluvial, loamy, sandy, black_clay, red, laterite, saline_alkaline, peaty_wetland, unknown.',
          'confidence must be one of: high, medium, low.',
          'soilClues should be short practical clues from the image (texture/moisture/cracks/color/drainage signs).',
          'If uncertain, set detectedSoilType to unknown with low confidence.'
        ].join('\n')
      ];

      const result = await aiModel.generateContent(prompt);
      const rawText = result?.response?.text?.() || '';
      const parsed = extractJsonFromModelText(rawText);

      if (!parsed || typeof parsed !== 'object') {
        return {
          soilProfile: fallback,
          detectedFromImage: false,
          confidence: '',
          soilClues: '',
          source: 'fallback',
        };
      }

      const detectedSoilRaw = String(
        parsed.detectedSoilType || parsed.soilType || parsed.soilCategory || parsed.soil || 'unknown'
      ).trim();

      const confidence = normalizeConfidenceLabel(parsed.confidence);
      const soilClues = String(parsed.soilClues || parsed.reasoning || '').trim();
      const detectedKey = normalizeSoilKey(detectedSoilRaw);
      const isUnknown = normalizeTextKey(detectedSoilRaw) === 'unknown';
      const detectedFromImage = !isUnknown;

      return {
        soilProfile: detectedFromImage ? getSoilProfile(detectedKey) : fallback,
        detectedFromImage,
        confidence,
        soilClues,
        source: detectedFromImage ? 'photo' : 'fallback',
      };
    } catch (error) {
      console.error('Soil detection from image failed:', error.message);

      return {
        soilProfile: fallback,
        detectedFromImage: false,
        confidence: '',
        soilClues: '',
        source: 'fallback',
      };
    }
  };

  const buildFallbackWeatherPayload = ({ lat = 28.6139, lon = 77.2090, city = 'Local Region' } = {}) => {
    const season = getIndianSeasonContext();
    const weatherCode = season.season === 'monsoon' ? 802 : season.season === 'winter' ? 801 : 800;
    const baseTemp = season.season === 'summer' ? 34 : season.season === 'monsoon' ? 29 : 22;
    const humidity = season.season === 'monsoon' ? 82 : season.season === 'winter' ? 56 : 40;
    const windKmh = season.season === 'monsoon' ? 18 : season.season === 'winter' ? 10 : 12;
    const description = season.season === 'monsoon'
      ? 'cloudy with rain possibility'
      : season.season === 'winter'
        ? 'mild and dry'
        : 'hot and mostly clear';

    const forecastItems = Array.from({ length: 6 }).map((_, index) => {
      const hourOffset = (index + 1) * 3;
      const forecastDate = new Date(Date.now() + (hourOffset * 60 * 60 * 1000));
      const popBase = season.season === 'monsoon' ? 0.55 : season.season === 'winter' ? 0.12 : 0.08;
      const pop = Math.min(0.95, popBase + (index * 0.05));
      const rainMm = season.season === 'monsoon' ? Number((2.2 + (index * 0.7)).toFixed(1)) : 0;

      return {
        dt_txt: forecastDate.toISOString(),
        main: { temp: Number((baseTemp + (index % 2 === 0 ? 0.4 : -0.6)).toFixed(1)) },
        pop,
        rain: rainMm ? { '3h': rainMm } : undefined
      };
    });
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

    const currentData = {
      name: city,
      coord: { lat, lon },
      main: { temp: baseTemp, humidity },
      weather: [{ id: weatherCode, description }],
      wind: { speed: windKmh / 3.6 }
    };
      
    const insights = buildWeatherInsights(currentData, forecastItems);

    return {
      city,
      location: { lat, lon },
      temperature: baseTemp,
      weather_code: weatherCode,
      wind_speed: windKmh,
      humidity,
      description,
      rainfall: insights.rainfall,
      farmerAdvisory: insights.farmerAdvisory,
      forecast: forecastItems.map((item) => ({
        time: item.dt_txt,
        temp: item.main?.temp,
        pop: Math.round(toNumber(item.pop) * 100),
        rainMm3h: Number(toNumber(item?.rain?.['3h']).toFixed(1))
      })),
      source: 'fallback'
    };
  };

  const getCandidateCrops = async ({ soilType, season }) => {
    let candidates = [];

    if (mongoConnected()) {
      try {
        candidates = await Crop.find({ soilType, season }).lean();
      } catch (dbError) {
        console.error('Crop lookup failed:', dbError.message);
      }
    }

    if (!candidates.length) {
      candidates = fallbackCrops.filter((item) => item.soilType === soilType && item.season === season);
    }

    if (!candidates.length) {
      candidates = fallbackCrops.filter((item) => item.soilType === soilType);
    }

    if (!candidates.length) {
      candidates = [...fallbackCrops];
    }

    return candidates.map((item) => ({
      ...item,
      iconName: item.iconName || getIconNameForCrop(item.name)
    }));
  };

  const fetchMarketPriceLookup = async () => {
    const priceLookup = { ...DEFAULT_MARKET_PRICE_LOOKUP };

    if (mongoConnected()) {
      try {
        const dbPrices = await MarketPrice.find().limit(100).lean();
        dbPrices.forEach((item) => {
          const key = normalizeTextKey(item?.cropName);
          const price = toNumber(item?.currentPrice);
          if (key && price > 0) {
            priceLookup[key] = price;
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
      } catch (dbError) {
        console.error('Market DB lookup failed:', dbError.message);
      }
    }

    const apiKey = process.env.AGMARKNET_API_KEY;
    if (!apiKey) {
      return priceLookup;
    }


    try {
      const response = await axios.get(
        'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070',
        {
          params: {
            'api-key': apiKey,
            format: 'json',
            limit: 200
          },
          timeout: 7000
        }
      );

      const records = response.data?.records || [];
      records.forEach((record) => {
        const key = normalizeTextKey(record?.commodity);
        const price = toNumber(record?.modal_price);
        if (key && price > 0) {
          priceLookup[key] = price;

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
      });
    } catch (marketError) {
      console.error('Market API lookup failed:', marketError.message);
    }

    return priceLookup;
  };

  const rankCropsByMarketSignals = (candidates = [], marketLookup = {}) => {
    return candidates
      .map((crop) => {
        const cropName = String(crop?.name || crop?.cropName || 'Unknown Crop').trim();
        const cropKey = normalizeTextKey(cropName);
        const economics = getCropEconomics(cropName);
        const marketPrice = toNumber(marketLookup[cropKey], toNumber(DEFAULT_MARKET_PRICE_LOOKUP[cropKey], 2000));
        const estimatedProfit = Math.round((marketPrice * economics.yieldQuintalPerAcre) - economics.costPerAcre);

        return {
          ...crop,
          name: cropName,
          cropName,
          iconName: crop?.iconName || getIconNameForCrop(cropName),
          marketPrice,
          estimatedProfit
        };
      })
      .sort((a, b) => b.estimatedProfit - a.estimatedProfit);
  };

  const buildRecommendationResponse = ({
    selectedCrop,
    rankedCrops = [],
    seasonContext,
    soilType,
    soilProfile = null,
    soilDetection = null,
    source = 'season+market',
    landObservation = '',
    aiExplanation = '',
    warnings = []
  }) => {
    const crop = selectedCrop || rankedCrops[0] || fallbackCrops[0];
    const effectiveSoilProfile = soilProfile || getSoilProfile(soilType);
    const normalizedSoilType = normalizeSoilType(effectiveSoilProfile?.key || soilType);
    const riceVarietySuggestion = getRiceVarietySuggestion({
      cropName: crop.name,
      soilProfile: effectiveSoilProfile,
      seasonContext
    });


    const recommendationText = aiExplanation ||
      `Detected ${seasonContext.label}. For ${effectiveSoilProfile.label}, ${crop.name} shows the best market-aligned profit potential this cycle.`;

    return {
      name: crop.name,
      iconName: crop.iconName || getIconNameForCrop(crop.name),
      colorClass: crop.colorClass || 'bg-emerald-100 text-emerald-700',
      season: seasonContext.season,
      farmingSeason: seasonContext.farmingSeason,
      detectedSeason: seasonContext.season,
      detectedSeasonLabel: seasonContext.label,
      soilType: normalizedSoilType,
      soilProfile: effectiveSoilProfile,
      soilDetection: soilDetection && typeof soilDetection === 'object'
        ? {
          detectedFromImage: Boolean(soilDetection.detectedFromImage),
          confidence: soilDetection.confidence || '',
          source: soilDetection.source || 'manual',
          soilClues: soilDetection.soilClues || ''
        }
        : null,
      source,
      landObservation: landObservation || 'Upload or capture a land photo for field-specific AI analysis.',
      aiExplanation: recommendationText,
      warnings: Array.isArray(warnings) ? warnings.filter(Boolean).slice(0, 3) : [],
      recommendedCrop: {
        name: crop.name,
        season: crop.season || seasonContext.season,
        soilType: crop.soilType || normalizedSoilType,
        currentPrice: toNumber(crop.marketPrice, null),
        estimatedProfit: toNumber(crop.estimatedProfit, null)
      },
      riceVarietySuggestion,
      marketInsights: rankedCrops.slice(0, 4).map((item, index) => ({
        rank: index + 1,
        crop: item.cropName || item.name,
        currentPrice: toNumber(item.marketPrice, 0),
        estimatedProfit: toNumber(item.estimatedProfit, 0)
      })),
      alternatives: rankedCrops.slice(1, 4).map((item) => ({
        name: item.cropName || item.name,
        currentPrice: toNumber(item.marketPrice, 0),
        estimatedProfit: toNumber(item.estimatedProfit, 0),
        iconName: item.iconName || getIconNameForCrop(item.cropName || item.name)
      }))
    };
  };

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

  const getAiRecommendationFromImage = async ({
    file,
    soilType,
    seasonLabel,
    marketInsights,
    candidateNames
  }) => {
    if (!aiModel || !file?.buffer?.length) return null;

    try {
      const prompt = [
        {
          inlineData: {
            mimeType: file.mimetype || 'image/jpeg',
            data: file.buffer.toString('base64')
          }
        },
        [
          'You are an agronomy advisor for India.',
          `Farmer-selected soil type: ${soilType}.`,
          `Current season context: ${seasonLabel}.`,
          `Candidate crops: ${candidateNames.join(', ')}.`,
          `Market snapshots (INR/quintal and estimated profit): ${JSON.stringify(marketInsights)}.`,
          'Inspect the field photo and infer practical land clues (moisture, drainage, residue, slope, texture).',
          'Return strict JSON only with keys: landObservation, suggestedCrop, reasoning, warnings.',
          'suggestedCrop must be one from candidate crops or null.',
          'warnings must be an array with up to 3 short farmer-safe cautions.'
        ].join('\n')
      ];

      const result = await aiModel.generateContent(prompt);
      const rawText = result.response.text() || '';
      const parsed = extractJsonFromModelText(rawText);

      if (parsed && typeof parsed === 'object') {
        return parsed;
      }

      return {
        landObservation: 'Image analyzed but structured output was limited.',
        suggestedCrop: null,
        reasoning: String(rawText || '').trim(),
        warnings: []
      };
    } catch (error) {
      console.error('AI crop photo analysis failed:', error.message);
      return null;
    }
  };

/*
==============================
Weather API
==============================
*/

router.get('/weather', async (req, res) => {
  const lat = toNumber(req.query.lat, 28.6139);
  const lon = toNumber(req.query.lon, 77.2090);
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    return res.json(buildFallbackWeatherPayload({ lat, lon, city: 'India Region' }));
  }

  try {
    const currentResponse = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        lat,
        lon,
        appid: apiKey,
        units: 'metric'
      },
      timeout: 7000
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
        },
        timeout: 7000
      });
      forecastItems = forecastResponse?.data?.list || [];
    } catch (forecastError) {
      console.error('Weather forecast API error:', forecastError.message);
    }

    const insights = buildWeatherInsights(data, forecastItems);

    return res.json({
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
      })),
      source: 'live'
    });
  } catch (error) {
    console.error('Weather API error:', error.message);
    return res.json(buildFallbackWeatherPayload({ lat, lon, city: 'India Region' }));
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

    const city = String(req.params.city || '').trim();
    if (!city) {
        return res.status(400).json({ error: 'City is required' });
    try {
    const apiKey = getOpenWeatherApiKey();

    if (!apiKey) {
      return res.status(500).json({ error: "OpenWeather API key missing" });

    }

    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
        const fallback = buildFallbackWeatherPayload({ city });
        return res.json({
            city: fallback.city,
            temperature: fallback.temperature,
            weather_code: fallback.weather_code,
            wind_speed: fallback.wind_speed,
            humidity: fallback.humidity,
            description: fallback.description,
            source: fallback.source
        });
    }


    try {
        const response = await axios.get(
            'https://api.openweathermap.org/data/2.5/weather',
            {
                params: {
                    q: city,
                    appid: apiKey,
                    units: 'metric'
                },
                timeout: 7000
            }
        );

        const response = await axios.get(buildOpenWeatherUrl('/data/2.5/weather'), {
          params: {
            q: city,
            appid: apiKey,
            units: 'metric'
          },
          timeout: 7000
        });

        const data = response.data;

        return res.json({
            city: data.name,
            temperature: data.main?.temp,
            weather_code: data.weather?.[0]?.id,
            wind_speed: (data.wind?.speed ?? 0) * 3.6,
            description: data.weather?.[0]?.description
        });
    } catch (error) {
        if (error.response?.status === 404) {
            return res.status(404).json({ error: 'City not found' });
        }

        console.error('Weather city API error:', error.message);
        const fallback = buildFallbackWeatherPayload({ city });
        return res.json({
            city: fallback.city,
            temperature: fallback.temperature,
            weather_code: fallback.weather_code,
            wind_speed: fallback.wind_speed,
            humidity: fallback.humidity,
            description: fallback.description,
            source: fallback.source
        });
    }
});

/*
==============================
Crop Recommendation
==============================
*/

router.get('/recommendations', async (req, res) => {
    try {
    const soilProfile = getSoilProfile(req.query?.soil);
    const soilType = soilProfile.canonicalType;
        const seasonContext = getIndianSeasonContext();

        const candidateCrops = await getCandidateCrops({
            soilType,
            season: seasonContext.season
        });

        const marketLookup = await fetchMarketPriceLookup();
        const rankedCrops = rankCropsByMarketSignals(candidateCrops, marketLookup);
        const selectedCrop = rankedCrops[0] || candidateCrops[0] || fallbackCrops[0];

        const responsePayload = buildRecommendationResponse({
            selectedCrop,
            rankedCrops,
            seasonContext,
            soilType,
            soilProfile,
            soilDetection: {
              detectedFromImage: false,
              confidence: '',
              source: 'manual',
              soilClues: ''
            },
            source: 'season+market',
            landObservation: 'No land photo provided yet. Use Take Photo or Upload Photo for field-level AI analysis.',
            aiExplanation: `Detected ${seasonContext.label}. Based on ${soilProfile.label} and current market rates, ${selectedCrop.name} is the strongest crop to cultivate now.`
        });

        return res.json(responsePayload);
    } catch (error) {
        console.error('Recommendation failed:', error.message);
        return res.status(500).json({ error: 'Recommendation failed' });
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
    if (!aiModel) {
      return res.json({
        reply: "AI is not configured. Please check GEMINI_API_KEY.",
      });
    }

    const body = req.body || {};
    const messages = Array.isArray(body.messages)
      ? body.messages
      : typeof body.message === "string"
        ? [{ role: "user", content: body.message }]
        : [];

    if (messages.length === 0) {
      return res.json({
        reply: "Please send a message.",
      });
    }

    // Convert to Gemini format: combine all messages into one prompt
    const transcript = messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const prompt = `You are a friendly and knowledgeable farming assistant for Indian farmers. You help with questions about crops, weather, pests, soil, markets, and sustainable farming practices. Be concise and practical.\n\n${transcript}\n\nAssistant:`;

    const result = await aiModel.generateContent(prompt);
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err.message);

    res.json({
      reply: `Unable to process your request: ${err.message}. Please try again.`,
    });
  }
});

/*
==============================
Pest Detection (Image)
==============================
*/

const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_UPLOAD_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    const mimeType = String(file?.mimetype || "").toLowerCase();

    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
      return cb(new Error("Invalid image type. Upload JPG, PNG, WEBP, or HEIC."));
    }

    cb(null, true);
  },
});

const handleSingleImageUpload = (fieldName = "image") => (req, res, next) => {
  upload.single(fieldName)(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "Image too large. Maximum allowed size is 5MB.",
        });
      }

      return res.status(400).json({
        error: "Image upload failed. Please select a valid image and try again.",
      });
    }

    return res.status(400).json({
      error: error.message || "Invalid image upload.",
    });
  });
};

const PESTICIDE_TYPES = new Set(["Chemical", "Organic", "Biological"]);
const FERTILIZER_TYPES = new Set(["NPK", "Organic", "Micronutrient", "Biofertilizer"]);
const PESTICIDE_DOSAGE_UNITS = new Set([
  "ml/liter",
  "gm/liter",
  "kg/hectare",
  "ml/pump",
  "ml/hectare",
  "gm/hectare",
  "kg/acre",
]);
const FERTILIZER_DOSAGE_UNITS = new Set(["kg/hectare", "gm/liter", "kg/acre"]);

const asCleanText = (value = "", fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const asFiniteNumber = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const asStringList = (value, fallback = []) => {
  if (!Array.isArray(value)) return [...fallback];

  return value
    .map((item) => asCleanText(item, ""))
    .filter(Boolean);
};

const uniqueStringList = (value = []) => {
  return Array.from(new Set(asStringList(value).map((item) => item.trim())));
};

const normalizePestSeverity = (value = "") => {
  const severity = normalizeTextKey(value);

  if (["high", "severe", "critical", "advanced"].includes(severity)) return "High";
  if (["medium", "moderate", "mid"].includes(severity)) return "Medium";
  if (["low", "mild", "early"].includes(severity)) return "Low";

  return "Medium";
};

const escapeForRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeDosageUnit = (value, allowedUnits, fallbackUnit) => {
  const unit = asCleanText(value, fallbackUnit);
  return allowedUnits.has(unit) ? unit : fallbackUnit;
};

const buildDefaultCropCarePlan = (pestName = "crop stress") => {
  return [
    `Remove heavily affected leaves/parts and keep them away from field to reduce ${pestName} spread.`,
    "Spray in early morning or late evening to reduce crop stress and improve product uptake.",
    "Avoid over-irrigation and water stagnation; keep root zone moist but well-drained.",
    "Repeat field scouting every 24-48 hours and record whether symptoms are reducing.",
    "Keep recommended spray interval and avoid unnecessary over-application.",
    "Support recovery with balanced nutrition and keep weeds controlled around crop rows.",
  ];
};

const buildDefaultPrecautions = (severity = "Medium") => {
  const waitingPeriodDays = severity === "High" ? 10 : severity === "Low" ? 5 : 7;
  const toxicityLevel = severity === "High" ? "Medium" : "Low";

  return {
    personalProtectiveEquipment: [
      "Nitrile gloves",
      "Face mask/respirator",
      "Eye protection",
      "Full-sleeve clothing",
      "Closed footwear",
    ],
    storageInstructions: "Store in original labelled containers, locked, away from food, water, and children.",
    toxicityLevel,
    waitingPeriodDays,
    environmentalCautions: [
      "Do not spray near ponds/canals and avoid spraying during strong wind.",
      "Avoid drift to nearby homes, livestock sheds, and flowering border plants.",
    ],
    poisoningSymptoms: [
      "Headache or dizziness",
      "Eye or skin irritation",
      "Nausea or vomiting",
    ],
    firstAidMeasures: "If exposure occurs, wash skin/eyes with clean water, move to fresh air, and seek medical care with product label.",
    notToMixWith: ["Strong alkaline products", "Unknown tank mixtures without label guidance"],
  };
};

const buildDefaultTreatmentTemplate = ({ severity = "Medium", pestName = "crop stress" } = {}) => {
  const normalizedSeverity = normalizePestSeverity(severity);
  const severityConfig = {
    High: { pesticideDose: 3, effectiveness: 82, costPerHectare: 640, duration: "7-12 days", waitDays: 10 },
    Medium: { pesticideDose: 2.5, effectiveness: 76, costPerHectare: 520, duration: "6-10 days", waitDays: 7 },
    Low: { pesticideDose: 2, effectiveness: 70, costPerHectare: 430, duration: "5-8 days", waitDays: 5 },
  };

  const config = severityConfig[normalizedSeverity] || severityConfig.Medium;

  return {
    pesticides: [
      {
        name: "Neem Oil",
        activeIngredient: "Azadirachtin 1500 ppm",
        type: "Organic",
        dosage: { quantity: config.pesticideDose, unit: "ml/liter" },
        applicationMethod: "Spray both upper and lower leaf surfaces until just wet.",
        timingDaysSinceInfestation: "Start within 24 hours of symptom detection",
        sprayInterval: "Repeat every 5-7 days",
        maxApplications: 3,
        efficiency: config.effectiveness,
        cost: 160,
        marketBrand: ["Nimbecidine", "Achook", "Neem Gold"],
      },
      {
        name: "Recommended selective pesticide (local agri expert guided)",
        activeIngredient: "As per label and local advisory",
        type: "Chemical",
        dosage: { quantity: 1.5, unit: "ml/liter" },
        applicationMethod: "Target affected crop zone only; avoid runoff.",
        timingDaysSinceInfestation: "After confirming active infestation",
        sprayInterval: "Repeat after 7-10 days if symptoms persist",
        maxApplications: 2,
        efficiency: config.effectiveness - 6,
        cost: 220,
        marketBrand: ["Ask nearest agri input dealer"],
      },
    ],
    fertilizers: [
      {
        name: "NPK 19:19:19 (Water Soluble)",
        type: "NPK",
        dosage: { quantity: 1, unit: "kg/acre" },
        applicationMethod: "Foliar spray",
        timing: "2-3 days after protective spray",
        benefits: ["Reduces stress", "Supports new healthy leaf growth", "Improves crop recovery"],
      },
      {
        name: "Zinc + Boron Micronutrient Mix",
        type: "Micronutrient",
        dosage: { quantity: 0.5, unit: "kg/hectare" },
        applicationMethod: "Foliar spray",
        timing: "After visible symptom reduction",
        benefits: ["Improves immunity", "Reduces recurrence risk", "Supports flowering and vigor"],
      },
    ],
    precautions: {
      ...buildDefaultPrecautions(normalizedSeverity),
      waitingPeriodDays: config.waitDays,
    },
    diseaseStage: normalizedSeverity === "High" ? "Mid to Advanced" : "Early to Mid",
    effectiveness: config.effectiveness,
    costPerHectare: config.costPerHectare,
    duration: config.duration,
  };
};

const normalizePesticideEntry = (entry = {}, fallbackEntry = {}) => {
  const type = asCleanText(entry.type, asCleanText(fallbackEntry.type, "Chemical"));
  const normalizedType = PESTICIDE_TYPES.has(type) ? type : "Chemical";

  return {
    name: asCleanText(entry.name, asCleanText(fallbackEntry.name, "Recommended pesticide")),
    activeIngredient: asCleanText(entry.activeIngredient, asCleanText(fallbackEntry.activeIngredient, "As per label")),
    type: normalizedType,
    dosage: {
      quantity: Number(asFiniteNumber(entry?.dosage?.quantity ?? entry?.dosageQuantity, asFiniteNumber(fallbackEntry?.dosage?.quantity, 1)).toFixed(2)),
      unit: normalizeDosageUnit(
        entry?.dosage?.unit ?? entry?.dosageUnit,
        PESTICIDE_DOSAGE_UNITS,
        asCleanText(fallbackEntry?.dosage?.unit, "ml/liter")
      ),
    },
    applicationMethod: asCleanText(entry.applicationMethod, asCleanText(fallbackEntry.applicationMethod, "Spray on affected crop area.")),
    timingDaysSinceInfestation: asCleanText(entry.timingDaysSinceInfestation, asCleanText(fallbackEntry.timingDaysSinceInfestation, "Start immediately after detection")),
    sprayInterval: asCleanText(entry.sprayInterval, asCleanText(fallbackEntry.sprayInterval, "Repeat every 7 days")),
    maxApplications: Math.max(1, Math.round(asFiniteNumber(entry.maxApplications, asFiniteNumber(fallbackEntry.maxApplications, 2)))),
    efficiency: clampNumber(Math.round(asFiniteNumber(entry.efficiency, asFiniteNumber(fallbackEntry.efficiency, 70))), 35, 99),
    cost: Math.max(0, Math.round(asFiniteNumber(entry.cost, asFiniteNumber(fallbackEntry.cost, 120)))),
    marketBrand: uniqueStringList(entry.marketBrand || entry.brands || fallbackEntry.marketBrand || ["Local agri shop"]),
  };
};

const normalizeFertilizerEntry = (entry = {}, fallbackEntry = {}) => {
  const type = asCleanText(entry.type, asCleanText(fallbackEntry.type, "NPK"));
  const normalizedType = FERTILIZER_TYPES.has(type) ? type : "NPK";

  return {
    name: asCleanText(entry.name, asCleanText(fallbackEntry.name, "Supportive fertilizer")),
    type: normalizedType,
    dosage: {
      quantity: Number(asFiniteNumber(entry?.dosage?.quantity ?? entry?.dosageQuantity, asFiniteNumber(fallbackEntry?.dosage?.quantity, 1)).toFixed(2)),
      unit: normalizeDosageUnit(
        entry?.dosage?.unit ?? entry?.dosageUnit,
        FERTILIZER_DOSAGE_UNITS,
        asCleanText(fallbackEntry?.dosage?.unit, "kg/hectare")
      ),
    },
    applicationMethod: asCleanText(entry.applicationMethod, asCleanText(fallbackEntry.applicationMethod, "Apply as recommended on label.")),
    timing: asCleanText(entry.timing, asCleanText(fallbackEntry.timing, "Apply during recovery stage.")),
    benefits: uniqueStringList(entry.benefits || fallbackEntry.benefits || ["Supports crop recovery"]),
  };
};

const normalizePrecautionsPayload = (rawPrecautions = {}, fallbackPrecautions = {}) => {
  const toxicity = normalizePestSeverity(rawPrecautions.toxicityLevel || fallbackPrecautions.toxicityLevel);

  return {
    personalProtectiveEquipment: uniqueStringList(
      rawPrecautions.personalProtectiveEquipment || fallbackPrecautions.personalProtectiveEquipment || []
    ),
    storageInstructions: asCleanText(
      rawPrecautions.storageInstructions,
      asCleanText(fallbackPrecautions.storageInstructions, "Store safely away from food and children.")
    ),
    toxicityLevel: toxicity,
    waitingPeriodDays: Math.max(
      1,
      Math.round(asFiniteNumber(rawPrecautions.waitingPeriodDays, asFiniteNumber(fallbackPrecautions.waitingPeriodDays, 7)))
    ),
    environmentalCautions: uniqueStringList(
      rawPrecautions.environmentalCautions || fallbackPrecautions.environmentalCautions || []
    ),
    poisoningSymptoms: uniqueStringList(
      rawPrecautions.poisoningSymptoms || fallbackPrecautions.poisoningSymptoms || []
    ),
    firstAidMeasures: asCleanText(
      rawPrecautions.firstAidMeasures,
      asCleanText(fallbackPrecautions.firstAidMeasures, "If exposure occurs, wash with clean water and seek medical advice.")
    ),
    notToMixWith: uniqueStringList(rawPrecautions.notToMixWith || fallbackPrecautions.notToMixWith || []),
  };
};

const normalizeTreatmentPayload = (rawTreatment = {}, fallbackTreatment = {}) => {
  const source = rawTreatment && typeof rawTreatment === "object" ? rawTreatment : {};
  const fallback = fallbackTreatment && typeof fallbackTreatment === "object" ? fallbackTreatment : {};

  const pesticidesSource = Array.isArray(source.pesticides) && source.pesticides.length
    ? source.pesticides
    : (Array.isArray(fallback.pesticides) ? fallback.pesticides : []);

  const fertilizersSource = Array.isArray(source.fertilizers) && source.fertilizers.length
    ? source.fertilizers
    : (Array.isArray(fallback.fertilizers) ? fallback.fertilizers : []);

  const normalizedPesticides = pesticidesSource.map((item, index) => {
    const fallbackEntry = fallback.pesticides?.[index] || fallback.pesticides?.[0] || {};
    return normalizePesticideEntry(item, fallbackEntry);
  });

  const normalizedFertilizers = fertilizersSource.map((item, index) => {
    const fallbackEntry = fallback.fertilizers?.[index] || fallback.fertilizers?.[0] || {};
    return normalizeFertilizerEntry(item, fallbackEntry);
  });

  return {
    pesticides: normalizedPesticides,
    fertilizers: normalizedFertilizers,
    precautions: normalizePrecautionsPayload(source.precautions || {}, fallback.precautions || {}),
    diseaseStage: asCleanText(source.diseaseStage, asCleanText(fallback.diseaseStage, "Early to Mid")),
    effectiveness: clampNumber(
      Math.round(asFiniteNumber(source.effectiveness, asFiniteNumber(fallback.effectiveness, 75))),
      40,
      99
    ),
    costPerHectare: Math.max(0, Math.round(asFiniteNumber(source.costPerHectare, asFiniteNumber(fallback.costPerHectare, 500)))),
    duration: asCleanText(source.duration, asCleanText(fallback.duration, "7-10 days")),
  };
};

const parseAiPestAnalysis = (parsedPayload, fallbackText = "") => {
  const parsed = parsedPayload && typeof parsedPayload === "object" ? parsedPayload : {};

  const identifiedPest = asCleanText(
    parsed.identifiedPest || parsed.pestName || parsed.diseaseName || parsed.name,
    "Uncertain pest/disease"
  );

  return {
    identifiedPest,
    scientificName: asCleanText(parsed.scientificName, "Not identified"),
    severity: normalizePestSeverity(parsed.severity || parsed.severityLevel || parsed.riskLevel),
    diagnosis: asCleanText(
      parsed.diagnosis || parsed.analysis || parsed.reasoning || parsed.summary,
      asCleanText(fallbackText, "Image analyzed. Symptoms suggest a pest or disease issue.")
    ),
    symptoms: uniqueStringList(parsed.symptoms || parsed.keySymptoms || parsed.visibleSymptoms || []),
    description: asCleanText(
      parsed.description,
      `Detected signs of ${identifiedPest}. Start treatment quickly and monitor crop response daily.`
    ),
    cropCarePlan: uniqueStringList(parsed.cropCarePlan || parsed.immediateCropCare || parsed.cropCare || parsed.recoverySteps || []),
    warning: asCleanText(parsed.warning || parsed.caution, ""),
    treatment: {
      pesticides: parsed.pesticides || parsed.recommendedPesticides || parsed?.treatment?.pesticides || [],
      fertilizers: parsed.fertilizers || parsed.recommendedFertilizers || parsed?.treatment?.fertilizers || [],
      precautions: parsed.precautions || parsed.farmerPrecautions || parsed.safetyPrecautions || parsed?.treatment?.precautions || {},
      diseaseStage: parsed?.treatmentSummary?.diseaseStage || parsed?.treatment?.diseaseStage || parsed.diseaseStage,
      effectiveness: parsed?.treatmentSummary?.effectiveness || parsed?.treatment?.effectiveness || parsed.effectiveness,
      costPerHectare: parsed?.treatmentSummary?.costPerHectare || parsed?.treatment?.costPerHectare || parsed.costPerHectare,
      duration: parsed?.treatmentSummary?.duration || parsed?.treatment?.duration || parsed.duration,
    },
  };
};

const findBestMatchingPestRecord = async ({ identifiedPest = "", symptoms = [] }) => {
  if (!mongoConnected()) return null;

  try {
    const detectedName = asCleanText(identifiedPest, "");
    const symptomList = asStringList(symptoms);

    if (!detectedName) return null;

    const escaped = escapeForRegex(detectedName);

    let pest = await Pest.findOne({ name: new RegExp(`^${escaped}$`, "i") }).lean();
    if (!pest) {
      pest = await Pest.findOne({
        $or: [
          { name: new RegExp(escaped, "i") },
          { scientificName: new RegExp(escaped, "i") },
        ],
      }).lean();
    }

    if (!pest) {
      const candidates = await Pest.find().limit(200).lean();
      const detectedKey = normalizeTextKey(detectedName);
      const symptomKeys = symptomList.map((item) => normalizeTextKey(item));

      let best = null;
      let bestScore = 0;

      candidates.forEach((candidate) => {
        const candidateName = normalizeTextKey(candidate?.name);
        const candidateScientific = normalizeTextKey(candidate?.scientificName);
        let score = 0;

        if (candidateName === detectedKey || candidateScientific === detectedKey) score += 8;
        if (candidateName.includes(detectedKey) || detectedKey.includes(candidateName)) score += 5;
        if (candidateScientific && (candidateScientific.includes(detectedKey) || detectedKey.includes(candidateScientific))) score += 3;

        const candidateSymptoms = asStringList(candidate?.symptoms).map((item) => normalizeTextKey(item));
        symptomKeys.forEach((symptom) => {
          if (candidateSymptoms.some((candidateSymptom) => candidateSymptom.includes(symptom) || symptom.includes(candidateSymptom))) {
            score += 1;
          }
        });

        if (score > bestScore) {
          bestScore = score;
          best = candidate;
        }
      });

      if (bestScore >= 3) {
        pest = best;
      }
    }

    if (!pest) return null;

    const treatment = await Treatment.findOne({ pestId: pest._id }).lean()
      || await Treatment.findOne({ pestName: new RegExp(escapeForRegex(pest.name), "i") }).lean();

    return {
      pest,
      treatment: treatment || null,
    };
  } catch (error) {
    console.error("Pest DB lookup failed:", error.message);
    return null;
  }
};

const buildPestResponsePayload = ({ aiAnalysis, dbMatch = null, source = "ai", warning = "" }) => {
  const detectedName = asCleanText(dbMatch?.pest?.name || aiAnalysis?.identifiedPest, "Uncertain pest/disease");
  const severity = normalizePestSeverity(dbMatch?.pest?.severity || aiAnalysis?.severity);

  const fallbackTreatment = buildDefaultTreatmentTemplate({
    severity,
    pestName: detectedName,
  });

  const dbTreatment = dbMatch?.treatment
    ? {
      pesticides: dbMatch.treatment.pesticides,
      fertilizers: dbMatch.treatment.fertilizers,
      precautions: dbMatch.treatment.precautions,
      diseaseStage: dbMatch.treatment.diseaseStage,
      effectiveness: dbMatch.treatment.effectiveness,
      costPerHectare: dbMatch.treatment.costPerHectare,
      duration: dbMatch.treatment.duration,
    }
    : null;

  const treatment = normalizeTreatmentPayload(
    dbTreatment || aiAnalysis?.treatment || {},
    fallbackTreatment
  );

  const symptoms = uniqueStringList([
    ...asStringList(dbMatch?.pest?.symptoms || []),
    ...asStringList(aiAnalysis?.symptoms || []),
  ]).slice(0, 6);

  const cropCarePlan = uniqueStringList([
    ...asStringList(aiAnalysis?.cropCarePlan || []),
    ...buildDefaultCropCarePlan(detectedName),
  ]).slice(0, 6);

  return {
    diagnosis: asCleanText(
      aiAnalysis?.diagnosis,
      `Symptoms indicate ${detectedName}. Start treatment now and monitor the crop every day.`
    ),
    identifiedPest: detectedName,
    pestDetails: {
      name: detectedName,
      scientificName: asCleanText(dbMatch?.pest?.scientificName || aiAnalysis?.scientificName, "Not identified"),
      severity,
      symptoms: symptoms.length
        ? symptoms
        : ["Leaf stress symptoms observed", "Potential disease or pest pressure detected"],
      description: asCleanText(
        dbMatch?.pest?.description || aiAnalysis?.description,
        `Detected signs of ${detectedName}. Follow the cure and safety guidance below.`
      ),
      affectedCrops: asStringList(dbMatch?.pest?.affectedCrops || []),
      seasonOfOccurrence: asStringList(dbMatch?.pest?.seasonOfOccurrence || []),
    },
    cropCarePlan,
    treatment,
    source,
    warning: asCleanText(warning || aiAnalysis?.warning, ""),
  };
};

/*
==============================
Crop Recommendation (Photo)
==============================
*/

router.post('/recommendations/photo', handleSingleImageUpload('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image required' });
    }

    const userProvidedSoilInput = String(req.body?.soil || '').trim();
    const fallbackSoilProfile = getSoilProfile(userProvidedSoilInput || 'loamy');
    const soilDetection = await getSoilDetectionFromImage({
      file: req.file,
      fallbackSoilProfile
    });

    const soilProfile = soilDetection.soilProfile || fallbackSoilProfile;
    const soilType = soilProfile.canonicalType;
    const seasonContext = getIndianSeasonContext();

    const candidateCrops = await getCandidateCrops({
      soilType,
      season: seasonContext.season
    });

    const marketLookup = await fetchMarketPriceLookup();
    const rankedCrops = rankCropsByMarketSignals(candidateCrops, marketLookup);

    let selectedCrop = rankedCrops[0] || candidateCrops[0] || fallbackCrops[0];
    let landObservation = 'Photo captured successfully. Upload clearer field-area images for sharper land diagnostics.';
    let aiExplanation = '';
    let warnings = [];

    if (soilDetection.detectedFromImage) {
      const confidenceLabel = soilDetection.confidence ? ` (${soilDetection.confidence} confidence)` : '';
      warnings.push(`Soil auto-detected from photo: ${soilProfile.label}${confidenceLabel}.`);

      if (soilDetection.soilClues) {
        landObservation = `${soilDetection.soilClues}. ${landObservation}`;
      }
    } else if (!userProvidedSoilInput) {
      warnings.push('Could not confidently detect soil from photo. Using a general soil profile for recommendation.');
    }

    const marketInsightsForAi = rankedCrops.slice(0, 4).map((item) => ({
      crop: item.cropName || item.name,
      currentPrice: item.marketPrice,
      estimatedProfit: item.estimatedProfit
    }));

    const aiResult = await getAiRecommendationFromImage({
      file: req.file,
      soilType: soilProfile.label,
      seasonLabel: seasonContext.label,
      marketInsights: marketInsightsForAi,
      candidateNames: rankedCrops.map((item) => item.cropName || item.name)
    });

    if (aiResult) {
      const suggestedCropKey = normalizeTextKey(aiResult.suggestedCrop);
      const aiSelectedCrop = rankedCrops.find((item) => normalizeTextKey(item.cropName || item.name) === suggestedCropKey);

      if (aiSelectedCrop) {
        selectedCrop = aiSelectedCrop;
      }

      const aiObservation = String(aiResult.landObservation || '').trim();
      if (aiObservation) {
        landObservation = aiObservation;
      }

      const reasoning = String(aiResult.reasoning || '').trim();
      if (reasoning) {
        aiExplanation = reasoning;
      }

      if (Array.isArray(aiResult.warnings)) {
        warnings = aiResult.warnings;
      }
    }

    if (!aiExplanation) {
      aiExplanation = `Detected ${seasonContext.label}. Considering ${soilProfile.label}, market price trends, and the uploaded land image, ${selectedCrop.name} is recommended for cultivation.`;
    }

    warnings = Array.from(new Set(warnings.filter(Boolean)));

    const responsePayload = buildRecommendationResponse({
      selectedCrop,
      rankedCrops,
      seasonContext,
      soilType,
      soilProfile,
      soilDetection,
      source: 'photo+season+market',
      landObservation,
      aiExplanation,
      warnings
    });

    return res.json(responsePayload);
  } catch (error) {
    console.error('Photo recommendation failed:', error.message);
    return res.status(500).json({ error: 'Photo recommendation failed' });
  }
});

router.post("/pests/detect", handleSingleImageUpload("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image required" });
    }

    if (!aiModel) {
      const fallbackAnalysis = parseAiPestAnalysis(null, "AI service is unavailable right now.");
      const fallbackResponse = buildPestResponsePayload({
        aiAnalysis: {
          ...fallbackAnalysis,
          diagnosis: "AI service is unavailable right now. Showing preventive cure, nutrient support, and safety guidance.",
          warning: "AI service unavailable. Showing preventive advisory mode with farmer safety steps.",
        },
        source: "fallback",
      });

      return res.json(fallbackResponse);
    }

    const base64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype || "image/jpeg";

    try {
      const result = await aiModel.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: base64,
          },
        },
        [
          "You are a senior plant pathologist and crop protection advisor for Indian farmers.",
          "Analyze this crop image and return STRICT JSON only (no markdown, no explanation).",
          "Required JSON schema:",
          "{",
          '  "identifiedPest": "string",',
          '  "scientificName": "string or null",',
          '  "severity": "Low|Medium|High",',
          '  "diagnosis": "short disease/pest explanation",',
          '  "symptoms": ["symptom"],',
          '  "cropCarePlan": ["immediate care step"],',
          '  "pesticides": [{"name":"","activeIngredient":"","type":"Chemical|Organic|Biological","dosage":{"quantity":0,"unit":"ml/liter|gm/liter|kg/hectare|ml/pump|ml/hectare|gm/hectare|kg/acre"},"applicationMethod":"","timingDaysSinceInfestation":"","sprayInterval":"","maxApplications":0,"efficiency":0,"cost":0,"marketBrand":[""]}],',
          '  "fertilizers": [{"name":"","type":"NPK|Organic|Micronutrient|Biofertilizer","dosage":{"quantity":0,"unit":"kg/hectare|gm/liter|kg/acre"},"applicationMethod":"","timing":"","benefits":[""]}],',
          '  "precautions": {"personalProtectiveEquipment":[""],"storageInstructions":"","toxicityLevel":"Low|Medium|High","waitingPeriodDays":0,"environmentalCautions":[""],"poisoningSymptoms":[""],"firstAidMeasures":"","notToMixWith":[""]},',
          '  "treatmentSummary": {"diseaseStage":"","effectiveness":0,"costPerHectare":0,"duration":""},',
          '  "description": "short pest profile",',
          '  "warning": "optional caution"',
          "}",
          "Rules: Keep guidance practical. Include cure actions, pesticide and fertilizer suggestions, crop care steps, and farmer health precautions.",
          "If uncertain, set identifiedPest to 'Uncertain pest/disease' and still provide safe preventive treatment guidance.",
        ].join("\n"),
      ]);

      const rawText = asCleanText(result?.response?.text?.(), "");
      const parsed = extractJsonFromModelText(rawText);
      const aiAnalysis = parseAiPestAnalysis(parsed, rawText);
      const dbMatch = await findBestMatchingPestRecord({
        identifiedPest: aiAnalysis.identifiedPest,
        symptoms: aiAnalysis.symptoms,
      });

      const hasStructuredJson = parsed && typeof parsed === "object";

      const payload = buildPestResponsePayload({
        aiAnalysis,
        dbMatch,
        source: dbMatch ? "database+ai" : (hasStructuredJson ? "ai" : "fallback"),
        warning: hasStructuredJson
          ? aiAnalysis.warning
          : "Structured AI output was limited. Showing safe cure and safety advisory mode.",
      });

      res.json(payload);
    } catch (aiError) {
      console.error("Gemini API error in pest detection:", aiError.message);

      const fallbackAnalysis = parseAiPestAnalysis(null, "");
      const payload = buildPestResponsePayload({
        aiAnalysis: {
          ...fallbackAnalysis,
          diagnosis: "AI image analysis failed. Showing preventive cure, nutrition support, and farmer safety advisory.",
          warning: `AI analysis error: ${aiError.message}. Preventive advisory mode is active.`,
        },
        source: "fallback",
      });

      res.json(payload);
    }
  } catch (err) {
    console.error("Pest detection error:", err.message);

    const fallbackAnalysis = parseAiPestAnalysis(null, "");
    const payload = buildPestResponsePayload({
      aiAnalysis: {
        ...fallbackAnalysis,
        diagnosis: "Image processing failed. Showing preventive cure, nutrition support, and safety advisory.",
        warning: `System error: ${err.message || "Image analysis failed"}. Preventive advisory mode is active.`,
      },
      source: "fallback",
    });

    res.json(payload);
  }
});


module.exports = router;