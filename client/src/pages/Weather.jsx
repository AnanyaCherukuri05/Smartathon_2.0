import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BellRing, Cloud, CloudRain, Loader2, MapPin, Sun, Wind } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import SectionHeader from '../components/SectionHeader';
import { apiFetch } from '../lib/apiClient';

const DEFAULT_COORDS = { lat: 28.6139, lon: 77.2090 };
const TARGET_ACCURACY_METERS = 150;
const APPROXIMATE_ACCURACY_METERS = 600;
const MAX_GPS_WAIT_MS = 18000;
const REJECT_ACCURACY_METERS = 5000;
const FRESH_POSITION_MAX_AGE_MS = 120000;

const getPositionAccuracy = (position) => Number(position?.coords?.accuracy ?? Number.POSITIVE_INFINITY);
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const hasValidCoords = (position) => isFiniteNumber(position?.coords?.latitude) && isFiniteNumber(position?.coords?.longitude);
const isFreshPosition = (position) => {
    const timestamp = Number(position?.timestamp);
    if (!Number.isFinite(timestamp)) return true;
    return (Date.now() - timestamp) <= FRESH_POSITION_MAX_AGE_MS;
};

const sortPositionsByAccuracy = (a, b) => getPositionAccuracy(a) - getPositionAccuracy(b);

const getCurrentPositionAsync = (options) => new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
});

const getBestPositionFromWatch = ({ timeoutMs = MAX_GPS_WAIT_MS, desiredAccuracy = TARGET_ACCURACY_METERS } = {}) => new Promise((resolve, reject) => {
    const samples = [];
    let watchId = null;
    let settled = false;

    const finish = (position) => {
        if (settled) return;
        settled = true;
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
        }
        clearTimeout(timeoutId);
        resolve(position);
    };

    const fail = (error) => {
        if (settled) return;
        settled = true;
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
        }
        clearTimeout(timeoutId);
        reject(error);
    };

    const getBestSample = () => samples.sort(sortPositionsByAccuracy)[0] || null;

    const timeoutId = setTimeout(() => {
        const best = getBestSample();
        if (best) {
            if (getPositionAccuracy(best) > REJECT_ACCURACY_METERS) {
                fail(new Error('GPS accuracy too low'));
                return;
            }
            finish(best);
            return;
        }
        fail(new Error('Timed out while waiting for precise GPS lock'));
    }, timeoutMs);

    watchId = navigator.geolocation.watchPosition(
        (position) => {
            samples.push(position);
            const best = getBestSample();
            const bestAccuracy = getPositionAccuracy(best);

            if (bestAccuracy <= desiredAccuracy) {
                finish(best);
            }
        },
        (watchError) => {
            const best = getBestSample();
            if (best) {
                finish(best);
                return;
            }
            fail(watchError);
        },
        {
            enableHighAccuracy: true,
            timeout: timeoutMs,
            maximumAge: 0
        }
    );
});

const getBestDevicePosition = async () => {
    const attempts = [];

    try {
        const sampled = await getBestPositionFromWatch({
            timeoutMs: MAX_GPS_WAIT_MS,
            desiredAccuracy: TARGET_ACCURACY_METERS
        });
        attempts.push(sampled);
    } catch (watchError) {
        // Continue to direct position attempts.
    }

    try {
        const precise = await getCurrentPositionAsync({
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 0
        });
        attempts.push(precise);
    } catch (preciseError) {
        // Try coarse fallback if precise lock is not available.
    }

    try {
        const coarse = await getCurrentPositionAsync({
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 60000
        });
        attempts.push(coarse);
    } catch (coarseError) {
        // No more fallbacks.
    }

    const validAttempts = attempts
        .filter((position) => hasValidCoords(position) && isFreshPosition(position))
        .sort(sortPositionsByAccuracy);

    if (!validAttempts.length) {
        throw new Error('Unable to detect device location');
    }

    const best = validAttempts[0];
    if (getPositionAccuracy(best) > REJECT_ACCURACY_METERS) {
        throw new Error('Location accuracy too low');
    }

    return best;
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
            const numericAccuracy = Number.isFinite(accuracy) ? accuracy : null;
            const isApproximate = Number.isFinite(numericAccuracy) && numericAccuracy > APPROXIMATE_ACCURACY_METERS;

            setLocationMeta({
                lat: latitude,
                lon: longitude,
                accuracy: numericAccuracy,
                source: isApproximate ? 'approximate' : 'live'
            });

            fetchWeather(latitude, longitude, isApproximate ? 'approximate' : 'live');
        } catch (geoError) {
            console.error('Geolocation error:', geoError);
            const isPermissionDenied = Number(geoError?.code) === 1;
            setLocationStatus(isPermissionDenied ? 'denied' : 'unavailable');

            if (fallbackToDefault) {
                setError(
                    isPermissionDenied
                        ? 'Location permission denied. Showing default location weather.'
                        : 'Could not detect precise location. Showing default location weather.'
                );
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


    const locationBadgeText = useMemo(() => {
        if (locationStatus === 'live') return 'Live location';
        if (locationStatus === 'approximate') return 'Approx location';
        if (locationStatus === 'detecting') return 'Detecting location';
        if (locationStatus === 'unsupported') return 'Location unavailable';
        if (locationStatus === 'unavailable') return 'Location unavailable';
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
    const WeatherIcon = visuals.icon;
    const rainfall = current?.rainfall;
    const ops = current?.farmOperations || null;
    const placeLabel = (() => {
        const place = current?.place;
        if (place?.name) {
            const parts = [place.name, place.state, place.country].filter(Boolean);
            return parts.join(', ');
        }
        if (place?.displayName) return place.displayName;
        return current?.city || '';
    })();

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
                                ? `Accuracy ~${Math.round(locationMeta.accuracy)}m | ${locationMeta.lat?.toFixed?.(5)}, ${locationMeta.lon?.toFixed?.(5)}`
                                : locationMeta.source === 'approximate' && Number.isFinite(locationMeta.accuracy)
                                    ? `Approx ~${(locationMeta.accuracy / 1000).toFixed(1)} km | ${locationMeta.lat?.toFixed?.(5)}, ${locationMeta.lon?.toFixed?.(5)}`
                                    : `Using coordinates ${locationMeta.lat?.toFixed?.(5)}, ${locationMeta.lon?.toFixed?.(5)}`}
                        </p>
                    ) : null}

                    {locationStatus === 'approximate' ? (
                        <p className="mb-2 text-xs font-semibold text-amber-700">
                            GPS fix is approximate. Enable Precise Location and refresh from the pin icon.
                        </p>
                    ) : null}

                    <div className="flex items-start justify-center">
                        <span className="text-display text-6xl font-semibold tracking-tighter text-slate-800">
                        {Math.round(current?.temperature || 0)}
                    </span>
                        <span className="mt-2 text-2xl font-semibold text-slate-500">°C</span>
                    </div>

                    <p className="mt-2 text-base font-medium capitalize text-gray-600">
                        {placeLabel ? `${placeLabel} | ` : ''}
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

            {ops ? (
                <GlassCard className="border-emerald-100/80 bg-white/80 p-5">
                    <h4 className="text-lg font-semibold text-slate-800">Today's Actions</h4>
                    <p className="mt-1 text-sm font-medium text-slate-600">Simple suggestions for the next few hours.</p>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[
                            { key: 'harvest', label: 'Harvest' },
                            { key: 'fertilizer', label: 'Fertilizer' },
                            { key: 'spraying', label: 'Spraying' },
                            { key: 'irrigation', label: 'Irrigation' }
                        ].map(({ key, label }) => {
                            const item = ops?.[key];
                            if (!item) return null;
                            const status = String(item.status || '').toLowerCase();
                            const badgeClass = status === 'good'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : status === 'avoid'
                                    ? 'bg-red-50 text-red-800 border-red-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200';

                            const badgeText = status === 'good' ? 'OK' : status === 'avoid' ? 'AVOID' : 'CARE';

                            return (
                                <div key={key} className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-slate-800">{label}</p>
                                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${badgeClass}`}>
                                            {badgeText}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm font-medium text-slate-600">{item.message}</p>
                                </div>
                            );
                        })}
                    </div>

                    {ops?.diseaseRisk?.message ? (
                        <p className="mt-4 rounded-2xl border border-emerald-100 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-700">
                            Tip: {ops.diseaseRisk.message}
                        </p>
                    ) : null}
                </GlassCard>
            ) : null}

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

            {error ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                    {error}
                </p>
            ) : null}
        </div>
    );
};

export default Weather;