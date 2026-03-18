import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
    Camera,
    Cloud,
    CloudRain,
    Droplets,
    Image as ImageIcon,
    Leaf,
    Loader2,
    Mountain,
    Sprout,
    Sun,
    Wheat,
    X
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import GradientButton from '../components/GradientButton';
import SectionHeader from '../components/SectionHeader';
import { apiFetch } from '../lib/apiClient';

const iconsRef = { Wheat, Leaf, Sprout, Cloud };
const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

const soils = [
    {
        id: 'alluvial',
        icon: Droplets,
        label: 'Alluvial Soil',
        details: 'River plains, fertile, supports paddy and wheat',
        phRange: 'pH 6.5-8.0',
        color: 'bg-sky-50 text-sky-700 border-sky-200'
    },
    {
        id: 'loamy',
        icon: Leaf,
        label: 'Loamy Soil',
        details: 'Balanced texture, flexible for many crops',
        phRange: 'pH 6.0-7.5',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
        id: 'black_clay',
        icon: Mountain,
        label: 'Black / Clayey Soil',
        details: 'Heavy soil, high moisture retention',
        phRange: 'pH 7.0-8.5',
        color: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
        id: 'red',
        icon: Sun,
        label: 'Red Soil',
        details: 'Well-drained, low organic carbon',
        phRange: 'pH 6.0-7.0',
        color: 'bg-rose-50 text-rose-700 border-rose-200'
    },
    {
        id: 'laterite',
        icon: Cloud,
        label: 'Laterite Soil',
        details: 'Acidic uplands, needs organic support',
        phRange: 'pH 5.0-6.5',
        color: 'bg-orange-50 text-orange-700 border-orange-200'
    },
    {
        id: 'sandy',
        icon: Sprout,
        label: 'Sandy Soil',
        details: 'Light soil, drains quickly',
        phRange: 'pH 5.5-7.0',
        color: 'bg-yellow-50 text-yellow-700 border-yellow-200'
    },
    {
        id: 'saline_alkaline',
        icon: CloudRain,
        label: 'Saline / Alkaline Soil',
        details: 'Salt-affected patches, needs tolerant varieties',
        phRange: 'pH 8.0-9.5',
        color: 'bg-violet-50 text-violet-700 border-violet-200'
    },
    {
        id: 'peaty_wetland',
        icon: Droplets,
        label: 'Peaty / Wetland Soil',
        details: 'Waterlogged tendency, ideal for lowland rice',
        phRange: 'pH 4.5-6.5',
        color: 'bg-cyan-50 text-cyan-700 border-cyan-200'
    }
];

const indianLandZones = [
    {
        title: 'Indo-Gangetic Plains',
        states: 'Punjab, Haryana, UP, Bihar, West Bengal',
        soilHint: 'Alluvial, fertile, moderate moisture',
        crops: 'Wheat, Paddy, Sugarcane, Maize',
        icon: Leaf
    },
    {
        title: 'Deccan Black Soil Belt',
        states: 'Maharashtra, MP, Gujarat, Telangana',
        soilHint: 'Deep black/clay with good moisture hold',
        crops: 'Cotton, Soybean, Sorghum, Tur',
        icon: Mountain
    },
    {
        title: 'Red and Laterite Uplands',
        states: 'Karnataka, Odisha, Chhattisgarh, Tamil Nadu',
        soilHint: 'Low organic matter, medium water retention',
        crops: 'Groundnut, Millets, Pulses, Oilseeds',
        icon: Sun
    },
    {
        title: 'Coastal and Delta Wetlands',
        states: 'Andhra Pradesh, Kerala, Tamil Nadu, Odisha',
        soilHint: 'High moisture, flood-prone pockets',
        crops: 'Paddy, Banana, Coconut, Vegetables',
        icon: CloudRain
    }
];

const Crops = () => {
    const { t } = useTranslation();

    const [selectedSoil, setSelectedSoil] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState('');
    const [recommendation, setRecommendation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    useEffect(() => {
        return () => {
            if (imagePreviewUrl) {
                URL.revokeObjectURL(imagePreviewUrl);
            }
        };
    }, [imagePreviewUrl]);

    const updateImage = (file) => {
        setRecommendation(null);
        setError(null);

        if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl);
        }

        if (!file) {
            setSelectedImage(null);
            setImagePreviewUrl('');
            return;
        }

        setSelectedImage(file);
        setImagePreviewUrl(URL.createObjectURL(file));
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        updateImage(file);
        event.target.value = '';
    };

    const handleRecommend = async () => {
        if (!selectedSoil && !selectedImage) {
            setError('Select a soil type or upload a field photo to auto-detect soil.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let data;

            if (selectedImage) {
                const formData = new FormData();
                formData.append('image', selectedImage);

                if (selectedSoil) {
                    formData.append('soil', selectedSoil);
                }

                data = await apiFetch('/api/recommendations/photo', {
                    method: 'POST',
                    body: formData,
                    auth: false
                });
            } else {
                data = await apiFetch(`/api/recommendations?soil=${encodeURIComponent(selectedSoil)}`, {
                    auth: false
                });
            }

            setRecommendation(data || null);
        } catch (requestError) {
            console.error(requestError);
            setRecommendation(null);
            setError(requestError?.message || 'Could not generate recommendation right now.');
        } finally {
            setLoading(false);
        }
    };

    const resetPhoto = () => {
        updateImage(null);
    };

    const sourceLabel = useMemo(() => {
        const source = String(recommendation?.source || '').toLowerCase();
        if (source.includes('photo')) return 'Photo + AI + Market';
        if (source.includes('market')) return 'Season + Market';
        return 'Smart Advisory';
    }, [recommendation?.source]);

    const selectedSoilMeta = useMemo(
        () => soils.find((soil) => soil.id === selectedSoil) || null,
        [selectedSoil]
    );

    const RecIcon = recommendation ? (iconsRef[recommendation.iconName] || Leaf) : Leaf;

    return (
        <div className="page-reveal space-y-8 pb-10">
            <SectionHeader
                eyebrow="Crop Advisory"
                title={`${t('crops')} ${t('recommendation')}`}
                subtitle="India-focused land guide, automatic season detection, market intelligence, and optional photo-based AI analysis."
            />

            <GlassCard className="space-y-4 border-emerald-100/80 p-5">
                <h3 className="text-lg font-semibold text-slate-800">Indian Agricultural Land Guide</h3>
                <p className="text-sm font-medium text-slate-600">
                    Match your field conditions with typical Indian land zones to understand crop suitability before sowing.
                </p>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {indianLandZones.map((zone) => (
                        <div
                            key={zone.title}
                            className="rounded-2xl border border-emerald-100/80 bg-white/80 p-4"
                        >
                            <div className="mb-2 flex items-center gap-2">
                                <zone.icon className="h-5 w-5 text-emerald-700" />
                                <h4 className="text-sm font-bold text-slate-800">{zone.title}</h4>
                            </div>
                            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{zone.states}</p>
                            <p className="mt-2 text-sm font-medium text-slate-700">Soil: {zone.soilHint}</p>
                            <p className="mt-1 text-sm font-semibold text-emerald-700">Best suited crops: {zone.crops}</p>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <GlassCard className="space-y-4 border-emerald-100/80 p-5">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-sm text-emerald-700">1</span>
                    Select Detailed Soil Type (Optional if Photo is Added)
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {soils.map((soil) => (
                        <button
                            type="button"
                            key={soil.id}
                            onClick={() => {
                                setSelectedSoil(soil.id);
                                setRecommendation(null);
                                setError(null);
                            }}
                            className={`flex flex-col items-start justify-start rounded-2xl border p-4 text-left transition-all duration-200 ${soil.color} ${selectedSoil === soil.id ? 'ring-4 ring-emerald-100 shadow-[0_10px_22px_rgba(28,123,74,0.2)]' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
                        >
                            <soil.icon className="mb-2 h-7 w-7" />
                            <span className="text-sm font-bold">{soil.label}</span>
                            <span className="mt-1 text-xs font-medium leading-relaxed opacity-90">{soil.details}</span>
                            <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.1em] opacity-80">{soil.phRange}</span>
                        </button>
                    ))}
                </div>
            </GlassCard>

            <GlassCard className="space-y-4 border-emerald-100/80 p-5">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-sm text-emerald-700">2</span>
                    Take Photo or Upload Photo (Optional)
                </h3>

                <p className="text-sm font-medium text-slate-600">
                    Add a field image to improve AI understanding of land moisture, drainage, and crop suitability.
                </p>

                <input
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES}
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />

                <input
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES}
                    capture="environment"
                    className="hidden"
                    ref={cameraInputRef}
                    onChange={handleFileChange}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white/90 px-5 py-3 font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                    >
                        <Camera className="h-5 w-5" />
                        Take Photo
                    </button>

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white/90 px-5 py-3 font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                    >
                        <ImageIcon className="h-5 w-5" />
                        Upload Photo
                    </button>
                </div>

                {imagePreviewUrl ? (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                        <img
                            src={imagePreviewUrl}
                            alt="Selected farmland"
                            className="h-44 w-full rounded-xl object-cover sm:h-56"
                        />
                        <button
                            type="button"
                            onClick={resetPhoto}
                            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            <X className="h-4 w-4" />
                            Remove Photo
                        </button>
                    </div>
                ) : null}
            </GlassCard>

            <GradientButton
                onClick={handleRecommend}
                disabled={loading || (!selectedSoil && !selectedImage)}
                className="flex items-center justify-center gap-2 py-4 text-lg"
            >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sprout className="h-6 w-6" />}
                {loading ? 'Analyzing Land, Season and Market...' : 'Get Crop Advisory'}
            </GradientButton>

            {error ? (
                <GlassCard className="border-red-200 bg-red-50 p-4 text-center">
                    <p className="text-sm font-semibold text-red-700">{error}</p>
                </GlassCard>
            ) : null}

            {recommendation ? (
                <GlassCard className="border-emerald-100/80 p-6">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                            {recommendation.detectedSeasonLabel || recommendation.season || 'Season Auto'}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                            Soil: {recommendation?.soilProfile?.label || selectedSoilMeta?.label || selectedSoil}
                        </span>
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                            {sourceLabel}
                        </span>
                    </div>

                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                            <RecIcon className="h-12 w-12" />
                        </div>

                        <div>
                            <h3 className="text-display text-3xl font-semibold text-emerald-700">{recommendation.name}</h3>
                            <p className="text-sm font-medium text-slate-600">
                                Suggested crop for current Indian season and your field profile.
                            </p>
                        </div>
                    </div>

                    {recommendation.aiExplanation ? (
                        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                            <p className="text-sm font-medium leading-relaxed text-slate-700">{recommendation.aiExplanation}</p>
                        </div>
                    ) : null}

                    {recommendation.soilProfile ? (
                        <div className="mt-4 rounded-2xl border border-lime-100 bg-lime-50/70 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-lime-700">Soil Profile Insight</p>
                            <p className="mt-2 text-sm font-semibold text-slate-800">{recommendation.soilProfile.label}</p>
                            {recommendation.soilDetection?.detectedFromImage ? (
                                <p className="mt-1 text-xs font-semibold text-lime-800">
                                    Auto-detected from photo{recommendation.soilDetection.confidence ? ` (${recommendation.soilDetection.confidence} confidence)` : ''}
                                </p>
                            ) : recommendation.soilDetection?.source === 'fallback' ? (
                                <p className="mt-1 text-xs font-semibold text-amber-700">
                                    Soil could not be confidently detected from the photo. Using fallback soil profile.
                                </p>
                            ) : (
                                <p className="mt-1 text-xs font-semibold text-slate-600">Using selected soil profile.</p>
                            )}
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <p className="text-xs font-medium text-slate-700">Texture: {recommendation.soilProfile.texture}</p>
                                <p className="text-xs font-medium text-slate-700">Water Holding: {recommendation.soilProfile.waterHoldingCapacity}</p>
                                <p className="text-xs font-medium text-slate-700">Drainage: {recommendation.soilProfile.drainage}</p>
                                <p className="text-xs font-medium text-slate-700">Soil pH: {recommendation.soilProfile.phRange}</p>
                            </div>
                            {recommendation.soilProfile.notes ? (
                                <p className="mt-3 text-xs font-semibold text-lime-800">{recommendation.soilProfile.notes}</p>
                            ) : null}
                        </div>
                    ) : null}

                    {recommendation.landObservation ? (
                        <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Land Observation</p>
                            <p className="mt-2 text-sm font-medium text-slate-700">{recommendation.landObservation}</p>
                        </div>
                    ) : null}

                    {Array.isArray(recommendation.warnings) && recommendation.warnings.length ? (
                        <div className="mt-4 space-y-2">
                            {recommendation.warnings.map((warning) => (
                                <p key={warning} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                                    {warning}
                                </p>
                            ))}
                        </div>
                    ) : null}

                    {Array.isArray(recommendation.marketInsights) && recommendation.marketInsights.length ? (
                        <div className="mt-6">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Market-backed ranking</p>
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {recommendation.marketInsights.map((item) => (
                                    <div key={`${item.rank}-${item.crop}`} className="rounded-2xl border border-emerald-100 bg-white/85 p-3">
                                        <p className="text-sm font-bold text-slate-800">#{item.rank} {item.crop}</p>
                                        <p className="mt-1 text-xs font-semibold text-slate-600">Price: ₹{Math.round(item.currentPrice || 0)} / quintal</p>
                                        <p className="text-xs font-semibold text-emerald-700">Est. profit: ₹{Math.round(item.estimatedProfit || 0)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {Array.isArray(recommendation?.riceVarietySuggestion?.varieties) && recommendation.riceVarietySuggestion.varieties.length ? (
                        <div className="mt-6 rounded-2xl border border-emerald-100 bg-white/90 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Rice Variety Suggestion</p>
                            <p className="mt-2 text-sm font-semibold text-slate-800">{recommendation.riceVarietySuggestion.title}</p>
                            <p className="text-xs font-medium text-slate-600">{recommendation.riceVarietySuggestion.reason}</p>

                            <div className="mt-3 space-y-2">
                                {recommendation.riceVarietySuggestion.varieties.map((variety) => (
                                    <div
                                        key={variety.name}
                                        className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3"
                                    >
                                        <p className="text-sm font-bold text-emerald-800">{variety.name}</p>
                                        <p className="mt-1 text-xs font-medium text-slate-700">Fit: {variety.fit}</p>
                                        <div className="mt-1 flex flex-wrap gap-3 text-[11px] font-semibold text-slate-600">
                                            <span>Duration: {variety.durationDays} days</span>
                                            <span>Water need: {variety.waterNeed}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {recommendation.riceVarietySuggestion.advisory ? (
                                <p className="mt-3 text-xs font-semibold text-emerald-700">{recommendation.riceVarietySuggestion.advisory}</p>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                            to="/weather"
                            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                        >
                            <CloudRain className="h-4 w-4" />
                            Check Weather Before Sowing
                        </Link>
                    </div>
                </GlassCard>
            ) : null}

            {!loading && !recommendation && !error ? (
                <GlassCard className="border-emerald-100/80 p-4 text-center">
                    <p className="text-sm font-medium text-slate-600">
                        Select soil type or upload a field photo for auto soil detection and crop guidance.
                    </p>
                </GlassCard>
            ) : null}
        </div>
    );
};

export default Crops;
