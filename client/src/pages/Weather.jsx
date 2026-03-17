import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CloudRain, Sun, Cloud, AlertTriangle, Droplets, MapPin, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';

const Weather = () => {
    const { t } = useTranslation();
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch from our Node.js backend which uses OpenWeather API via the keys provided
    const fetchWeather = async (lat = 28.6139, lon = 77.2090) => {
        setLoading(true);
        try {
            const latParam = encodeURIComponent(lat);
            const lonParam = encodeURIComponent(lon);
            const data = await apiFetch(`/api/weather?lat=${latParam}&lon=${lonParam}`, { auth: false });
            setWeatherData(data);
        } catch (error) {
            console.error("Failed to fetch weather", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeather(); // Fetch default on mount
    }, []);

    const handleGetLocation = () => {
        if (navigator.geolocation) {
            setLoading(true);
            navigator.geolocation.getCurrentPosition(
                (position) => fetchWeather(position.coords.latitude, position.coords.longitude),
                () => fetchWeather() // fallback
            );
        }
    };

    const getWeatherVisuals = (code) => {
        // OpenWeather codes (800 is clear, 80x is clouds, 5xx is rain, etc)
        if (code === 800) return { icon: Sun, color: 'text-amber-500', bg: 'bg-amber-100' };
        if (code > 800) return { icon: Cloud, color: 'text-slate-500', bg: 'bg-slate-100' };
        if (code >= 500 && code < 600) return { icon: CloudRain, color: 'text-blue-500', bg: 'bg-blue-100' };
        return { icon: Sun, color: 'text-amber-500', bg: 'bg-amber-100' };
    };

    const getAdvisory = (code) => {
        if (code >= 500 && code < 600) {
            return { msg: 'Avoid spraying 🚫', action: 'Do not water crops today 🌧️', alert: true };
        }
        if (code === 800) {
            return { msg: 'Good time to spray ✅', action: 'Water crops today 💧', alert: false };
        }
        return { msg: 'Normal conditions ✅', action: 'Standard watering 💧', alert: false };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-brand-green-600">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <p className="font-bold">Loading Weather...</p>
            </div>
        );
    }

    const current = weatherData; // OpenWeather map from backend
    const visuals = current ? getWeatherVisuals(current.weather_code) : getWeatherVisuals(800);
    const advisory = current ? getAdvisory(current.weather_code) : getAdvisory(800);
    const WeatherIcon = visuals.icon;

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold text-slate-800">{t('weather')}</h2>
                <button onClick={handleGetLocation} className="p-2 bg-slate-100 rounded-full text-slate-600 active:scale-95 transition-transform">
                    <MapPin className="w-6 h-6" />
                </button>
            </div>

            {/* Main Weather Card */}
            <div className={`${visuals.bg} rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden`}>
                <WeatherIcon className={`w-32 h-32 ${visuals.color} mb-4 drop-shadow-md`} />

                <div className="flex items-start justify-center">
                    <span className="text-6xl font-extrabold text-slate-800 tracking-tighter">
                        {Math.round(current?.temperature || 0)}
                    </span>
                    <span className="text-2xl font-bold text-slate-500 mt-2">°C</span>
                </div>

                <p className="text-lg font-medium text-slate-600 mt-2 capitalize flex items-center gap-2">
                    {current?.description || 'Clear'} | Wind: {Math.round(current?.wind_speed || 0)} km/h
                </p>
            </div>

            {/* Advisory Cards */}
            <h3 className="text-xl font-bold text-slate-800 mt-6 mb-4">{t('advisory')}</h3>
            <div className="grid grid-cols-1 gap-4">

                <div className={`flex items-center gap-4 p-5 rounded-3xl border ${advisory.alert ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                    <div className={`p-4 rounded-2xl ${advisory.alert ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {advisory.alert ? <AlertTriangle className="w-8 h-8" /> : <Droplets className="w-8 h-8" />}
                    </div>
                    <div>
                        <h4 className="font-bold text-lg text-slate-800">{advisory.msg}</h4>
                        <p className="text-slate-600 font-medium">{advisory.action}</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Weather;
