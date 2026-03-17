import i18n from 'i18next';
import HttpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';
import { LANGUAGE_OPTIONS, normalizeLanguageCode } from './lib/languages';

// English is the source-of-truth.
// Other languages are auto-translated server-side via /api/i18n/:lng.
const enTranslations = {
    home: 'Home',
    loading: 'Loading...',
    dashboard_greeting: 'Hi, {{name}}',
    app_title: 'KisanSetu',
    crops: 'Crops',
    weather: 'Weather',
    soil: 'Soil',
    pests: 'Pests',
    market: 'Market',
    start: 'Get Advice',
    tagline: 'Smart Farming Made Easy',
    recommendation: 'Recommendation',
    advisory: 'Advisory',
    welcome_back: 'Welcome back, farmer!',
    login: 'Login',
    signup: 'Sign Up',
    login_failed: 'Login failed',
    signup_failed: 'Signup failed',
    phone: 'Phone Number',
    name: 'Your Name',
    phone_placeholder_login: 'Enter mobile number',
    name_placeholder_login: 'Name (optional)',
    phone_placeholder_signup: 'Mobile number',
    name_placeholder_signup: 'Full name',
    login_button: 'Login',
    signup_button: 'Complete Setup',
    no_account: "Don't have an account?",
    have_account: 'Already have an account?',
    join_us: 'Create an account',
    select_language: 'Select Language',
    logout: 'Logout',

    soil_dry: 'Dry',
    soil_wet: 'Wet',
    soil_clay: 'Clay',
    season_summer: 'Summer',
    season_monsoon: 'Monsoon',
    season_winter: 'Winter',
    crops_select_soil: 'Select Soil',
    crops_select_season: 'Select Season',
    crops_get_advice: 'Get Advice',
    crops_best_match: 'Best match for your selection',

    weather_loading: 'Loading Weather...',
    weather_clear: 'Clear',
    weather_wind: 'Wind',
    weather_avoid_spraying: 'Avoid spraying 🚫',
    weather_do_not_water_today: 'Do not water crops today 🌧️',
    weather_good_time_spray: 'Good time to spray ✅',
    weather_water_today: 'Water crops today 💧',
    weather_normal_conditions: 'Normal conditions ✅',
    weather_standard_watering: 'Standard watering 💧',

    pests_detection_title: 'Pests Detection',
    pests_take_photo_title: 'Take a photo of your crop',
    pests_take_photo_subtitle: 'To identify pests or diseases automatically',
    pests_upload_photo: 'Upload Photo',
    pests_scanning_title: 'Scanning Image...',
    pests_scanning_subtitle: 'Analyzing leaves for pests',
    pests_ai_diagnosis: 'AI Diagnosis',
    pests_scan_another: 'Scan Another',

    soil_health_title: 'Soil Health',
    soil_moisture: 'Moisture',
    soil_moisture_too_dry: 'Too Dry',
    soil_moisture_need_water: 'Water immediately 💧',
    soil_moisture_too_wet: 'Too Wet',
    soil_moisture_need_stop: 'Stop watering 🚫',
    soil_status_good: 'Good',
    soil_moisture_need_perfect: 'Perfect moisture ✅',
    soil_ph_level: 'pH Level',
    soil_ph_acidic: 'Acidic',
    soil_ph_action_add_lime: 'Add lime',
    soil_ph_alkaline: 'Alkaline',
    soil_ph_action_add_sulfur: 'Add sulfur',
    soil_ph_neutral: 'Neutral',
    soil_ph_action_great: 'Great soil',
    soil_ph_add_lime_title: 'Add Agricultural Lime',
    soil_ph_add_lime_desc: 'To reduce acidity',
    soil_ph_add_sulfur_title: 'Add Elemental Sulfur',
    soil_ph_add_sulfur_desc: 'To reduce alkalinity',
    soil_balanced: 'Soil mix is perfectly balanced! 🎉',

    market_title: 'Market Prices',
    market_weekly_trend: 'Weekly Market Trend',
    market_avg_index: 'Average price index across major markets (₹)',
    market_current_rates: 'Current Rates',
    market_per_quintal: 'Per Quintal',
    market_loading: 'Loading Market...',
    market_error_load_failed: 'Failed to load market prices',
    market_error_api_hint: 'Make sure the API server is running on port 5000.',
};

const getInitialLanguage = () => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return 'en';
        const rawUser = window.localStorage.getItem('user');
        if (!rawUser) return 'en';
        const parsed = JSON.parse(rawUser);
        return normalizeLanguageCode(parsed?.languagePreference || 'en');
    } catch {
        return 'en';
    }
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
        resources: { en: { translation: enTranslations } },
        partialBundledLanguages: true,
        supportedLngs: LANGUAGE_OPTIONS.map((l) => l.code),
        lng: getInitialLanguage(),
        fallbackLng: 'en',
        backend: {
            loadPath: `${apiBaseUrl}/api/i18n/{{lng}}`,
        },
        react: {
            useSuspense: false,
        },
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
