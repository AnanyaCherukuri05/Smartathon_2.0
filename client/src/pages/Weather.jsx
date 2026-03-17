import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, BellRing, Cloud, CloudRain, Droplets, Loader2, MapPin, Sun, Wind } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import SectionHeader from '../components/SectionHeader';
import { apiFetch } from '../lib/apiClient';

const DEFAULT_COORDS = { lat: 28.6139, lon: 77.2090 };

const getCurrentPositionAsync = (options) => new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
});

const getBestDevicePosition = async () => {
    const attempts = [];

    try {
        const coarse = await getCurrentPositionAsync({
            enableHighAccuracy: false,
            timeout: 7000,
            maximumAge: 300000
        });
        attempts.push(coarse);
    } catch (coarseError) {
        // Best-effort coarse reading. Continue to precise attempt.
    }

    try {
        const precise = await getCurrentPositionAsync({
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 0
        });
        attempts.push(precise);
    } catch (preciseError) {
        if (!attempts.length) {
            throw preciseError;
        }
    }

    if (!attempts.length) {
        throw new Error('Unable to detect device location');
    }

    return attempts.sort((a, b) => {
        const aAccuracy = Number(a?.coords?.accuracy ?? Number.POSITIVE_INFINITY);
        const bAccuracy = Number(b?.coords?.accuracy ?? Number.POSITIVE_INFINITY);
        return aAccuracy - bAccuracy;
    })[0];
};

const Weather = () => {
    const { t } = useTranslation();
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [locationStatus, setLocationStatus] = useState('detecting');
    const [locationMeta, setLocationMeta] = useState(null);
    const [alertDeliveryStatus, setAlertDeliveryStatus] = useState(null);

    const fetchWeather = async (lat = DEFAULT_COORDS.lat, lon = DEFAULT_COORDS.lon, status = 'fallback') => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch(`/api/weather?lat=${lat}&lon=${lon}`, { auth: false });
            setWeatherData(data || null);
            setLocationStatus(status);
        } catch (error) {
            console.error('Failed to fetch weather', error);
            setWeatherData(null);
            setError(error?.message || 'Unable to fetch weather right now.');
        } finally {
            setLoading(false);
        }
    };

    const requestLiveLocation = async ({ fallbackToDefault = true } = {}) => {
        if (!navigator.geolocation) {
            setLocationStatus('unsupported');
            if (fallbackToDefault) {
                setLocationMeta({
                    lat: DEFAULT_COORDS.lat,
                    lon: DEFAULT_COORDS.lon,
                    accuracy: null,
                    source: 'default'
                });
                fetchWeather(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon, 'fallback');
            }
            return;
        }

        setLocationStatus('detecting');
        setError(null);

        try {
            const position = await getBestDevicePosition();
            const latitude = position?.coords?.latitude;
            const longitude = position?.coords?.longitude;
            const accuracy = position?.coords?.accuracy;

            setLocationMeta({
                lat: latitude,
                lon: longitude,
                accuracy: Number.isFinite(accuracy) ? accuracy : null,
                source: 'live'
            });

            fetchWeather(latitude, longitude, 'live');
        } catch (geoError) {
            console.error('Geolocation error:', geoError);
            setLocationStatus('denied');

            if (fallbackToDefault) {
                setError('Could not detect precise location. Showing default location weather.');
                setLocationMeta({
                    lat: DEFAULT_COORDS.lat,
                    lon: DEFAULT_COORDS.lon,
                    accuracy: null,
                    source: 'default'
                });
                fetchWeather(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon, 'fallback');
            }
        }
    };

    useEffect(() => {
        requestLiveLocation({ fallbackToDefault: true });
    }, []);

    useEffect(() => {
        const rainfall = weatherData?.rainfall;
        if (!rainfall?.alert) {
            setAlertDeliveryStatus(null);
            return;
        }

        const alertKey = `kisansetu-rain-alert-${weatherData?.city || 'region'}-${rainfall.nextHeavyRainAt || new Date().toDateString()}`;
        if (localStorage.getItem(alertKey)) return;

        const sendBrowserNotification = () => {
            if (typeof window === 'undefined' || !('Notification' in window)) return;

            const message = rainfall.alertMessage || 'High rainfall risk detected in your region.';

            if (Notification.permission === 'granted') {
                new Notification('KisanSetu Rainfall Alert', {
                    body: message
                });
                return;
            }

            if (Notification.permission === 'default') {
                Notification.requestPermission().then((permission) => {
                    if (permission === 'granted') {
                        new Notification('KisanSetu Rainfall Alert', { body: message });
                    }
                });
            }
        };

        const sendRemoteAlert = async () => {
            let shouldMarkAsSent = false;
            try {
                const result = await apiFetch('/api/weather/alerts/send', {
                    method: 'POST',
                    body: {
                        city: weatherData?.city,
                        rainfall,
                        summary: weatherData?.farmerAdvisory?.summary,
                        alertMessage: rainfall.alertMessage
                    }
                });

                if (result?.delivered) {
                    setAlertDeliveryStatus({
                        type: 'success',
                        message: `Alert message sent to farmer phone (${result.sentTo || 'registered number'}) via ${result.channels?.join(', ') || 'sms'}.`
                    });
                    shouldMarkAsSent = true;
                } else {
                    setAlertDeliveryStatus({
                        type: 'info',
                        message: result?.reason || 'Alert is already sent recently or service is not configured.'
                    });
                    shouldMarkAsSent = true;
                }
            } catch (remoteError) {
                console.error('Weather alert send failed:', remoteError);
                setAlertDeliveryStatus({
                    type: 'error',
                    message: remoteError?.message || 'Could not send remote alert message.'
                });
            }

            if (shouldMarkAsSent) {
                localStorage.setItem(alertKey, String(Date.now()));
            }
        };

        sendBrowserNotification();
        sendRemoteAlert();
    }, [weatherData]);

    const handleGetLocation = () => {
        requestLiveLocation({ fallbackToDefault: false });
    };

    const getWeatherVisuals = (code) => {
        if (code >= 200 && code < 300) return { icon: CloudRain, color: 'text-indigo-600' };
        if (code === 800) return { icon: Sun, color: 'text-green-600', bg: 'bg-green-100' };
        if (code > 800) return { icon: Cloud, color: 'text-green-600', bg: 'bg-green-100' };
        if (code >= 500 && code < 600) return { icon: CloudRain, color: 'text-green-600', bg: 'bg-green-100' };
        return { icon: Sun, color: 'text-green-600', bg: 'bg-green-100' };
    };

    const getAdvisory = (data) => {
        const code = data?.weather_code;
        const rainfall = data?.rainfall;

        if (rainfall?.riskLevel === 'high') {
            return {
                msg: 'High rainfall expected in your region',
                action: rainfall.alertMessage || 'Take preventive crop protection measures now.',
                alert: true
            };
        }

        if (rainfall?.riskLevel === 'medium') {
            return {
                msg: 'Moderate rainfall likely',
                action: 'Postpone spraying and check field drainage today.',
                alert: true
            };
        }

        if (code >= 500 && code < 600) {
            return { msg: 'Rainfall in progress', action: 'Avoid spraying and unnecessary irrigation now.', alert: true };
        }

        if (code === 800) {
            return { msg: 'Weather looks stable', action: 'Good time for planned field activities.', alert: false };
        }

        return { msg: 'Normal conditions', action: 'Continue regular crop monitoring.', alert: false };
    };

    const locationBadgeText = useMemo(() => {
        if (locationStatus === 'live') return 'Live location';
        if (locationStatus === 'detecting') return 'Detecting location';
        if (locationStatus === 'unsupported') return 'Location unavailable';
        if (locationStatus === 'denied') return 'Permission denied';
        return 'Default location';
    }, [locationStatus]);

    if (loading) {
        return (
            <div className="page-reveal space-y-4 pb-10">
                <SectionHeader eyebrow="Climate Intelligence" title={t('weather')} subtitle="Live local conditions" />
                <GlassCard className="border-emerald-100/80 p-6">
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

    if (error && !weatherData) {
        return (
            <div className="page-reveal space-y-4 pb-10">
                <SectionHeader eyebrow="Climate Intelligence" title={t('weather')} subtitle="Live local conditions" />
                <GlassCard className="border-red-200 bg-red-50 p-6 text-center">
                    <p className="text-sm font-semibold text-red-700">{error}</p>
                    <button
                        type="button"
                        onClick={() => requestLiveLocation({ fallbackToDefault: true })}
                        className="mt-4 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700"
                    >
                        Retry
                    </button>
                </GlassCard>
            </div>
        );
    }

    const current = weatherData;
    const visuals = current ? getWeatherVisuals(current.weather_code) : getWeatherVisuals(800);
    const advisory = getAdvisory(current);
    const WeatherIcon = visuals.icon;
    const advisoryList = current?.farmerAdvisory?.recommendations || [];
    const rainfall = current?.rainfall;

    return (
        <div className="page-reveal space-y-6 pb-10">
            <SectionHeader
                eyebrow="Climate Intelligence"
                title={t('weather')}
                subtitle="Live-location weather, rainfall prediction, and farmer safety advisories"
                action={(
                    <button
                        type="button"
                        onClick={handleGetLocation}
                        className="rounded-2xl border border-emerald-200 bg-white/90 p-2.5 text-emerald-700 transition-colors hover:bg-emerald-50"
                        title="Refresh with live location"
                    >
                        <MapPin className="h-5 w-5" />
                    </button>
                )}
            />

            <GlassCard className="border-emerald-100/80 p-7 text-center">
                <div>
                    <WeatherIcon className={`mx-auto mb-3 h-28 w-28 ${visuals.color}`} />

                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
                        <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                            {locationBadgeText}
                        </span>
                    </div>

                    {locationMeta ? (
                        <p className="mb-2 text-xs font-semibold text-slate-500">
                            {locationMeta.source === 'live' && Number.isFinite(locationMeta.accuracy)
                                ? `Accuracy ~${Math.round(locationMeta.accuracy)}m | ${locationMeta.lat?.toFixed?.(4)}, ${locationMeta.lon?.toFixed?.(4)}`
                                : `Using coordinates ${locationMeta.lat?.toFixed?.(4)}, ${locationMeta.lon?.toFixed?.(4)}`}
                        </p>
                    ) : null}

                    <div className="flex items-start justify-center">
                        <span className="text-display text-6xl font-semibold tracking-tighter text-slate-800">
                        {Math.round(current?.temperature || 0)}
                    </span>
                        <span className="mt-2 text-2xl font-semibold text-slate-500">°C</span>
                    </div>

                    <p className="mt-2 text-base font-medium capitalize text-gray-600">
                        {current?.city ? `${current.city} | ` : ''}
                        {current?.description || 'Clear'} | Wind: {Math.round(current?.wind_speed || 0)} km/h
                    </p>

                    <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Condition</p>
                            <div className="mt-2 flex items-center gap-2 text-slate-800">
                                <Cloud className="h-4 w-4 text-emerald-700" />
                                <span className="text-sm font-semibold">{current?.description || 'Clear skies'}</span>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Wind Speed</p>
                            <div className="mt-2 flex items-center gap-2 text-slate-800">
                                <Wind className="h-4 w-4 text-emerald-700" />
                                <span className="text-sm font-semibold">{Math.round(current?.wind_speed || 0)} km/h</span>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Humidity</p>
                            <div className="mt-2 flex items-center gap-2 text-slate-800">
                                <CloudRain className="h-4 w-4 text-emerald-700" />
                                <span className="text-sm font-semibold">{Math.round(current?.humidity || 0)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {rainfall && (
                <GlassCard className={`border-emerald-100/80 p-5 ${rainfall.alert ? 'bg-red-50/80 border-red-200' : 'bg-emerald-50/70'}`}>
                    <div className="flex items-start gap-4">
                        <div className={`rounded-xl bg-white p-3 ${rainfall.alert ? 'text-red-600' : 'text-emerald-700'}`}>
                            {rainfall.alert ? <BellRing className="h-7 w-7" /> : <CloudRain className="h-7 w-7" />}
                        </div>
                        <div className="flex-1">
                            <h4 className="text-lg font-semibold text-slate-800">Rainfall Prediction (Next 24h)</h4>
                            <p className="mt-1 text-sm font-medium text-slate-600">
                                Risk: <span className="font-bold uppercase">{rainfall.riskLevel}</span> |
                                Chance: <span className="font-bold"> {rainfall.probabilityPercent}%</span> |
                                Expected rain: <span className="font-bold"> {rainfall.expectedMm24h} mm</span>
                            </p>

                            {rainfall.nextHeavyRainAt ? (
                                <p className="mt-2 text-sm font-semibold text-slate-700">
                                    Possible heavy rain window: {rainfall.nextHeavyRainAt}
                                </p>
                            ) : null}

                            {rainfall.alertMessage ? (
                                <p className={`mt-2 text-sm font-semibold ${rainfall.alert ? 'text-red-700' : 'text-emerald-700'}`}>
                                    {rainfall.alertMessage}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </GlassCard>
            )}

            {alertDeliveryStatus ? (
                <GlassCard className={`border p-4 ${alertDeliveryStatus.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50/70'
                    : alertDeliveryStatus.type === 'error'
                        ? 'border-red-200 bg-red-50'
                        : 'border-amber-200 bg-amber-50'
                    }`}>
                    <p className={`text-sm font-semibold ${alertDeliveryStatus.type === 'success'
                        ? 'text-emerald-700'
                        : alertDeliveryStatus.type === 'error'
                            ? 'text-red-700'
                            : 'text-amber-700'
                        }`}>
                        {alertDeliveryStatus.message}
                    </p>
                </GlassCard>
            ) : null}

            <SectionHeader title={t('advisory')} className="mb-0" />
            <GlassCard className={`border-emerald-100/80 p-5 ${advisory.alert ? 'bg-amber-50/70' : 'bg-emerald-50/70'}`}>
                <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-white p-3 text-emerald-700">
                        {advisory.alert ? <AlertTriangle className="h-8 w-8" /> : <Droplets className="h-8 w-8" />}
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-slate-800">{advisory.msg}</h4>
                        <p className="text-sm font-medium text-slate-600">{advisory.action}</p>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="border-emerald-100/80 p-5">
                <h4 className="text-display text-xl font-semibold text-slate-800">Farmer Action Suggestions</h4>
                <p className="mt-1 text-sm font-medium text-slate-600">{current?.farmerAdvisory?.summary || 'Follow weather-safe crop operations.'}</p>

                <ul className="mt-4 space-y-2">
                    {(advisoryList.length ? advisoryList : ['Keep monitoring local weather every few hours and plan field activity safely.']).map((item) => (
                        <li key={item} className="rounded-xl border border-emerald-100 bg-white/85 px-3 py-2 text-sm font-semibold text-slate-700">
                            {item}
                        </li>
                    ))}
                </ul>
            </GlassCard>

            {error ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                    {error}
                </p>
            ) : null}
        </div>
    );
};

export default Weather;
