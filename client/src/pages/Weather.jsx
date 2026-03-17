import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CloudRain, Sun, Cloud, AlertTriangle, Droplets, MapPin, Loader2, Wind } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import SectionHeader from '../components/SectionHeader';

const Weather = () => {
    const { t } = useTranslation();
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch from our Node.js backend which uses OpenWeather API via the keys provided
    const fetchWeather = async (lat = 28.6139, lon = 77.2090) => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:5000/api/weather?lat=${lat}&lon=${lon}`);
            const data = await res.json();
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
        if (code === 800) return { icon: Sun, color: 'text-green-600', bg: 'bg-green-100' };
        if (code > 800) return { icon: Cloud, color: 'text-green-600', bg: 'bg-green-100' };
        if (code >= 500 && code < 600) return { icon: CloudRain, color: 'text-green-600', bg: 'bg-green-100' };
        return { icon: Sun, color: 'text-green-600', bg: 'bg-green-100' };
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
            <div className="space-y-4 pb-10">
                <SectionHeader title={t('weather')} subtitle="Live local conditions" />
                <GlassCard className="p-6">
                    <div className="mb-4 h-6 w-28 rounded-xl skeleton-shimmer" />
                    <div className="mb-5 h-24 rounded-2xl skeleton-shimmer" />
                    <div className="h-12 rounded-2xl skeleton-shimmer" />
                </GlassCard>
                <div className="flex items-center justify-center gap-2 text-emerald-200">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <p className="text-sm font-semibold">Loading Weather...</p>
                </div>
            </div>
        );
    }

    const current = weatherData; // OpenWeather map from backend
    const visuals = current ? getWeatherVisuals(current.weather_code) : getWeatherVisuals(800);
    const advisory = current ? getAdvisory(current.weather_code) : getAdvisory(800);
    const WeatherIcon = visuals.icon;

    return (
        <div className="space-y-6 pb-10">
            <SectionHeader
                title={t('weather')}
                subtitle="Field-aware climate updates"
                action={(
                    <button
                        type="button"
                        onClick={handleGetLocation}
                        className="rounded-xl border border-green-200 bg-white p-2.5 text-green-600 transition-colors hover:bg-green-50"
                    >
                        <MapPin className="h-5 w-5" />
                    </button>
                )}
            />

            <GlassCard className="p-7 text-center">
                <div>
                    <WeatherIcon className={`mx-auto mb-3 h-28 w-28 ${visuals.color}`} />

                    <div className="flex items-start justify-center">
                        <span className="text-display text-6xl font-semibold tracking-tighter text-gray-800">
                        {Math.round(current?.temperature || 0)}
                    </span>
                        <span className="mt-2 text-2xl font-semibold text-gray-500">°C</span>
                    </div>

                    <p className="mt-2 text-base font-medium capitalize text-gray-600">
                        {current?.description || 'Clear'} | Wind: {Math.round(current?.wind_speed || 0)} km/h
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                        <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Condition</p>
                            <div className="mt-2 flex items-center gap-2 text-gray-800">
                                <Droplets className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-semibold">{current?.description || 'Clear skies'}</span>
                            </div>
                        </div>
                        <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Wind Speed</p>
                            <div className="mt-2 flex items-center gap-2 text-gray-800">
                                <Wind className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-semibold">{Math.round(current?.wind_speed || 0)} km/h</span>
                            </div>
                        </div>
                    </div>
                </div>
            </GlassCard>

            <SectionHeader title={t('advisory')} className="mb-0" />
            <GlassCard className={`p-5 ${advisory.alert ? 'border-green-200 bg-green-50' : 'border-green-200 bg-green-50'}`}>
                <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-green-100 p-3 text-green-600">
                        {advisory.alert ? <AlertTriangle className="h-8 w-8" /> : <Droplets className="h-8 w-8" />}
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-gray-800">{advisory.msg}</h4>
                        <p className="text-sm font-medium text-gray-600">{advisory.action}</p>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};

export default Weather;
