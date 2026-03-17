import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            "app_title": "KisanSetu",
            "crops": "Crops",
            "weather": "Weather",
            "soil": "Soil",
            "pests": "Pests",
            "market": "Market",
            "start": "Get Advice",
            "tagline": "Smart Farming Made Easy",
            "recommendation": "Recommendation",
            "advisory": "Advisory",
            "welcome_back": "Welcome back, farmer!",
            "login": "Login",
            "signup": "Sign Up",
            "phone": "Phone Number",
            "name": "Your Name",
            "login_button": "Login",
            "signup_button": "Complete Setup",
            "no_account": "Don't have an account?",
            "have_account": "Already have an account?",
            "join_us": "Create an account",
            "select_language": "Select Language",
            "logout": "Logout"
        }
    },
    hi: {
        translation: {
            "app_title": "KisanSetu",
            "crops": "फसलें",
            "weather": "मौसम",
            "soil": "मिट्टी",
            "pests": "कीट",
            "market": "बाज़ार",
            "start": "सलाह लें",
            "tagline": "स्मार्ट खेती को आसान बनाया",
            "recommendation": "सिफ़ारिश",
            "advisory": "सलाह",
            "welcome_back": "वापसी पर स्वागत है, किसान!",
            "login": "लॉग इन",
            "signup": "साइन अप करें",
            "phone": "फ़ोन नंबर",
            "name": "आपका नाम",
            "login_button": "लॉग इन",
            "signup_button": "सेटअप पूरा करें",
            "no_account": "खाता नहीं है?",
            "have_account": "क्या आपके पास पहले से एक खाता मौजूद है?",
            "join_us": "एक खाता बनाएं",
            "select_language": "भाषा चुनें",
            "logout": "लॉग आउट"
        }
    },
    te: {
        translation: {
            "app_title": "KisanSetu",
            "crops": "పంటలు",
            "weather": "వాతావరణం",
            "soil": "నేల",
            "pests": "తెగుళ్లు",
            "market": "మార్కెట్",
            "start": "సలహా పొందండి",
            "tagline": "స్మార్ట్ ఫార్మింగ్ సులభతరం చేయబడింది",
            "recommendation": "సిఫార్సు",
            "advisory": "సలహా",
            "welcome_back": "తిరిగి స్వాగతం, రైతు!",
            "login": "లాగిన్",
            "signup": "సైన్ అప్ చేయండి",
            "phone": "ఫోన్ నంబర్",
            "name": "మీ పేరు",
            "login_button": "లాగిన్",
            "signup_button": "సెటప్ పూర్తి చేయండి",
            "no_account": "ఖాతా లేదా?",
            "have_account": "ఏలాంటి ఖాతా ఉంది?",
            "join_us": "ఖాతాను సృష్టించండి",
            "select_language": "భాషను ఎంచుకోండి",
            "logout": "లాగ్అవుట్"
        }
    },
    mr: {
        translation: {
            "app_title": "KisanSetu",
            "crops": "पिके",
            "weather": "हवामान",
            "soil": "माती",
            "pests": "कीटक",
            "market": "बाजार",
            "start": "सल्ला घ्या",
            "tagline": "स्मार्ट शेती सोपी केली",
            "recommendation": "शिफारस",
            "advisory": "सल्ला",
            "welcome_back": "स्वागत आहे, शेतकरी!",
            "login": "लॉगिन",
            "signup": "साइन अप करा",
            "phone": "फोन नंबर",
            "name": "तुमचे नाव",
            "login_button": "लॉगिन",
            "signup_button": "सेटअप पूर्ण करा",
            "no_account": "खाते नाही?",
            "have_account": "आधीपासून खाते आहे?",
            "join_us": "खाते तयार करा",
            "select_language": "भाषा निवडा",
            "logout": "लॉगआउट"
        }
    },
    ta: {
        translation: {
            "app_title": "KisanSetu",
            "crops": "பயிர்கள்",
            "weather": "வானிலை",
            "soil": "மண்",
            "pests": "பூச்சிகள்",
            "market": "சந்தை",
            "start": "ஆலோசனை பெறுங்கள்",
            "tagline": "ஸ்மார்ட் விவசாயம் எளிதாக",
            "recommendation": "பரிந்துரை",
            "advisory": "ஆலோசனை",
            "welcome_back": "மீண்டும் வரவேற்கிறோம், விவசாயி!",
            "login": "உள்நுழைவு",
            "signup": "பதிவு செய்யவும்",
            "phone": "தொலைபேசி எண்",
            "name": "உங்கள் பெயர்",
            "login_button": "உள்நுழைவு",
            "signup_button": "அமைப்பை முடிக்கவும்",
            "no_account": "கணக்கு இல்லையா?",
            "have_account": "ஏற்கனவே கணக்கு உள்ளதா?",
            "join_us": "கணக்கை உருவாக்கவும்",
            "select_language": "மொழியைத் தேர்ந்தெடுக்கவும்",
            "logout": "வெளியேறு"
        }
    },
    ml: {
        translation: {
            "app_title": "KisanSetu",
            "crops": "വിളകൾ",
            "weather": "കാലാവസ്ഥ",
            "soil": "മണ്ണ്",
            "pests": "കീടങ്ങൾ",
            "market": "മാർക്കറ്റ്",
            "start": "ഉപദേശം നേടുക",
            "tagline": "സ്മാർട്ട് കൃഷി ലളിതമാക്കി",
            "recommendation": "ശുപാർശ",
            "advisory": "ഉപദേശം",
            "welcome_back": "തിരികെ സ്വാഗതം, കർഷകാ!",
            "login": "ലോഗിൻ",
            "signup": "സൈൻ അപ്പ്",
            "phone": "ഫോൺ നമ്പർ",
            "name": "നിങ്ങളുടെ പേര്",
            "login_button": "ലോഗിൻ",
            "signup_button": "സെറ്റപ്പ് പൂർത്തിയാക്കുക",
            "no_account": "അക്കൗണ്ട് ഇല്ലേ?",
            "have_account": "ഇതിനകം അക്കൗണ്ട് ഉണ്ടോ?",
            "join_us": "അക്കൗണ്ട് സൃഷ്ടിക്കുക",
            "select_language": "ഭാഷ തിരഞ്ഞെടുക്കുക",
            "logout": "ലോഗൗട്ട്"
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: (() => {
            try {
                if (typeof window === 'undefined' || !window.localStorage) return 'en';
                const rawUser = window.localStorage.getItem('user');
                if (!rawUser) return 'en';
                const parsed = JSON.parse(rawUser);
                return parsed?.languagePreference || 'en';
            } catch {
                return 'en';
            }
        })(),
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;
