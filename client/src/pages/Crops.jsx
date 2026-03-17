import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, CloudRain, Snowflake, Droplets, Mountain, Sprout, Leaf, Wheat, Cloud, Loader2 } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import GradientButton from '../components/GradientButton';
import SectionHeader from '../components/SectionHeader';
import { apiFetch } from '../lib/apiClient';

const iconsRef = { Wheat, Leaf, Sprout, Cloud };

const Crops = () => {
    const { t } = useTranslation();
    const [selectedSoil, setSelectedSoil] = useState(null);
    const [selectedSeason, setSelectedSeason] = useState(null);
    const [recommendation, setRecommendation] = useState(null);
    const [loading, setLoading] = useState(false);

    const soils = [
        { id: 'dry', icon: Sun, label: 'Dry', color: 'bg-green-50 text-green-700 border-green-200' },
        { id: 'wet', icon: Droplets, label: 'Wet', color: 'bg-green-50 text-green-700 border-green-200' },
        { id: 'clay', icon: Mountain, label: 'Clay', color: 'bg-green-50 text-green-700 border-green-200' },
    ];

    const seasons = [
        { id: 'summer', icon: Sun, label: 'Summer', color: 'bg-green-50 text-green-700 border-green-200' },
        { id: 'monsoon', icon: CloudRain, label: 'Monsoon', color: 'bg-green-50 text-green-700 border-green-200' },
        { id: 'winter', icon: Snowflake, label: 'Winter', color: 'bg-green-50 text-green-700 border-green-200' },
    ];

    const handleRecommend = async () => {
        if (!selectedSoil || !selectedSeason) return;
        setLoading(true);

        try {
            const data = await apiFetch(`/api/recommendations?soil=${selectedSoil}&season=${selectedSeason}`, { auth: false });
            setRecommendation(data);
        } catch (err) {
            console.error(err);
            setRecommendation(null);
        } finally {
            setLoading(false);
        }
    };

    const RecIcon = recommendation ? (iconsRef[recommendation.iconName] || Leaf) : Leaf;

    return (
        <div className="space-y-8 pb-10">
            <SectionHeader title={`${t('crops')} ${t('recommendation')}`} subtitle="Choose soil and season to get tailored advice" />

            <GlassCard className="space-y-4 p-5">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-100 text-sm text-green-600">1</span>
                    Select Soil
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    {soils.map((s) => (
                        <button
                            type="button"
                            key={s.id}
                            onClick={() => { setSelectedSoil(s.id); setRecommendation(null); }}
                            className={`flex flex-col items-center justify-center rounded-xl border p-4 transition-shadow duration-200 ${s.color} ${selectedSoil === s.id ? 'ring-2 ring-green-500 shadow-md' : 'hover:shadow-md'}`}
                        >
                            <s.icon className="w-8 h-8 mb-2" />
                            <span className="font-bold text-sm">{s.label}</span>
                        </button>
                    ))}
                </div>
            </GlassCard>

            <GlassCard className="space-y-4 p-5">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-100 text-sm text-green-600">2</span>
                    Select Season
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    {seasons.map((s) => (
                        <button
                            type="button"
                            key={s.id}
                            onClick={() => { setSelectedSeason(s.id); setRecommendation(null); }}
                            className={`flex flex-col items-center justify-center rounded-xl border p-4 transition-shadow duration-200 ${s.color} ${selectedSeason === s.id ? 'ring-2 ring-green-500 shadow-md' : 'hover:shadow-md'}`}
                        >
                            <s.icon className="w-8 h-8 mb-2" />
                            <span className="font-bold text-sm">{s.label}</span>
                        </button>
                    ))}
                </div>
            </GlassCard>

            <GradientButton
                onClick={handleRecommend}
                disabled={!selectedSoil || !selectedSeason || loading}
                className="flex items-center justify-center gap-2 py-4 text-lg"
            >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sprout className="w-6 h-6" />}
                Get Advice
            </GradientButton>

            {recommendation && (
                <div className="mt-8">
                    <GlassCard className="p-8 text-center">
                        <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
                            {selectedSoil ? <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-green-700">{selectedSoil}</span> : null}
                            {selectedSeason ? <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-green-700">{selectedSeason}</span> : null}
                            <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">Recommended Crop</span>
                        </div>
                        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-xl bg-green-100 text-green-600">
                            <RecIcon className="h-16 w-16 drop-shadow-sm" />
                        </div>
                        <h3 className="text-display mb-2 text-3xl font-semibold text-green-600">{recommendation.name}</h3>
                        <p className="mb-4 text-sm font-medium text-gray-600">Best match for your selection</p>

                        {recommendation.aiExplanation && (
                            <div className="flex w-full items-start gap-3 rounded-xl border border-green-100 bg-green-50 p-4 text-left font-medium text-gray-700">
                                <Sprout className="h-6 w-6 shrink-0 text-green-600" />
                                <p className="leading-relaxed">{recommendation.aiExplanation}</p>
                            </div>
                        )}
                    </GlassCard>
                </div>
            )}

            {!loading && !recommendation && (
                <GlassCard className="p-4 text-center">
                    <p className="text-sm font-medium text-gray-600">No recommendation yet. Select soil and season to get started.</p>
                </GlassCard>
            )}

        </div>
    );
};

export default Crops;
