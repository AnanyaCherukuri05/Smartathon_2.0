import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CloudRain, Sun, Cloud, AlertTriangle, Droplets, MapPin, Loader2 } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import SectionHeader from '../components/SectionHeader';
import { apiFetch } from '../lib/apiClient';

const Weather = () => {
    const { t } = useTranslation();
    const MotionButton = motion.button;
    const MotionDiv = motion.div;
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch from our Node.js backend which uses OpenWeather API via the keys provided
    const fetchWeather = async (lat = 28.6139, lon = 77.2090) => {
        setLoading(true);
        try {
            const data = await apiFetch(`/api/weather?lat=${lat}&lon=${lon}`, { auth: false });
            setWeatherData(data || null);
        } catch (error) {
            console.error("Failed to fetch weather", error);
            setWeatherData(null);
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
                    <MotionButton
                        onClick={handleGetLocation}
                        whileTap={{ scale: 0.95 }}
                        className="rounded-2xl border border-white/15 bg-white/8 p-2.5 text-slate-200"
                    >
                        <MapPin className="h-5 w-5" />
                    </MotionButton>
                )}
            />

            <GlassCard className="relative overflow-hidden p-7 text-center">
                <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-cyan-300/25 blur-3xl" />
                <div className="absolute -bottom-14 -left-8 h-36 w-36 rounded-full bg-indigo-300/20 blur-3xl" />

                <MotionDiv
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10"
                >
                    <WeatherIcon className={`mx-auto mb-3 h-28 w-28 ${visuals.color}`} />

                    <div className="flex items-start justify-center">
                        <span className="text-display text-6xl font-semibold tracking-tighter text-white">
                        {Math.round(current?.temperature || 0)}
                    </span>
                        <span className="mt-2 text-2xl font-semibold text-slate-300">°C</span>
                    </div>

                    <p className="mt-2 text-base font-medium capitalize text-slate-200">
                        {current?.description || 'Clear'} | Wind: {Math.round(current?.wind_speed || 0)} km/h
                    </p>
                </MotionDiv>
            </GlassCard>

            <SectionHeader title={t('advisory')} className="mb-0" />
            <GlassCard className={`p-5 ${advisory.alert ? 'border-red-300/25 bg-red-300/10' : 'border-emerald-300/25 bg-emerald-300/10'}`}>
                <div className="flex items-center gap-4">
                    <div className={`rounded-2xl p-3 ${advisory.alert ? 'bg-red-200/20 text-red-200' : 'bg-emerald-200/20 text-emerald-200'}`}>
                        {advisory.alert ? <AlertTriangle className="h-8 w-8" /> : <Droplets className="h-8 w-8" />}
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-white">{advisory.msg}</h4>
                        <p className="text-sm font-medium text-slate-200">{advisory.action}</p>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};

export default Weather;
