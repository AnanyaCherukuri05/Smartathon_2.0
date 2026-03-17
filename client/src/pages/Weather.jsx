import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CloudRain, Sun, Cloud, AlertTriangle, Droplets, MapPin, Loader2 } from 'lucide-react';
import { normalizeLanguageCode } from '../lib/languages';

const Weather = () => {
    const { t, i18n } = useTranslation();
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch from our Node.js backend which uses OpenWeather API via the keys provided
    const fetchWeather = async (lat = 28.6139, lon = 77.2090) => {
        setLoading(true);
        try {
            const lang = normalizeLanguageCode(i18n.language);
            const res = await fetch(`http://localhost:5000/api/weather?lat=${lat}&lon=${lon}&lang=${lang}`);
            const data = await res.json();
            setWeatherData(data);
        } catch (error) {
            console.error("Failed to fetch weather", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeather(); // Fetch default on mount and when language changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [i18n.language]);

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
            return { msg: t('weather_avoid_spraying'), action: t('weather_do_not_water_today'), alert: true };
        }
        if (code === 800) {
            return { msg: t('weather_good_time_spray'), action: t('weather_water_today'), alert: false };
        }
        return { msg: t('weather_normal_conditions'), action: t('weather_standard_watering'), alert: false };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-brand-green-600">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <p className="font-bold">{t('weather_loading')}</p>
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
                    <span className="text-2xl font-bold text-slate-500 mt-2">°C</span>
                </div>

                <p className="text-lg font-medium text-slate-600 mt-2 capitalize flex items-center gap-2">
                    {current?.description || t('weather_clear')} | {t('weather_wind')}: {Math.round(current?.wind_speed || 0)} km/h
                </p>
            </div>

            {/* Advisory Cards */}
            <h3 className="text-xl font-bold text-slate-800 mt-6 mb-4">{t('advisory')}</h3>
            <div className="grid grid-cols-1 gap-4">

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
