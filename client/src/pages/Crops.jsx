import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Sun, CloudRain, Snowflake, Droplets, Mountain, Sprout, Leaf, Wheat, Cloud, Loader2 } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import GradientButton from '../components/GradientButton';
import SectionHeader from '../components/SectionHeader';

const iconsRef = { Wheat, Leaf, Sprout, Cloud };

const Crops = () => {
    const { t } = useTranslation();
    const MotionButton = motion.button;
    const MotionDiv = motion.div;
    const [selectedSoil, setSelectedSoil] = useState(null);
    const [selectedSeason, setSelectedSeason] = useState(null);
    const [recommendation, setRecommendation] = useState(null);
    const [loading, setLoading] = useState(false);

    const soils = [
        { id: 'dry', icon: Sun, label: 'Dry', color: 'bg-amber-100 text-amber-700 border-amber-200' },
        { id: 'wet', icon: Droplets, label: 'Wet', color: 'bg-blue-100 text-blue-700 border-blue-200' },
        { id: 'clay', icon: Mountain, label: 'Clay', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    ];

    const seasons = [
        { id: 'summer', icon: Sun, label: 'Summer', color: 'bg-red-50 text-red-600 border-red-100' },
        { id: 'monsoon', icon: CloudRain, label: 'Monsoon', color: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
        { id: 'winter', icon: Snowflake, label: 'Winter', color: 'bg-sky-50 text-sky-600 border-sky-100' },
    ];

    const handleRecommend = () => {
        if (!selectedSoil || !selectedSeason) return;
        setLoading(true);

        fetch(`http://localhost:5000/api/recommendations?soil=${selectedSoil}&season=${selectedSeason}`)
            .then(res => res.json())
            .then(data => {
                setRecommendation(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    const RecIcon = recommendation ? (iconsRef[recommendation.iconName] || Leaf) : Leaf;

    return (
        <div className="space-y-8 pb-10">
            <SectionHeader title={`${t('crops')} ${t('recommendation')}`} subtitle="Choose soil and season to get tailored advice" />

            <GlassCard className="space-y-4 p-5">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-sm">1</span>
                    Select Soil
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    {soils.map((s) => (
                        <MotionButton
                            key={s.id}
                            onClick={() => { setSelectedSoil(s.id); setRecommendation(null); }}
                            whileTap={{ scale: 0.97 }}
                            className={`flex flex-col items-center justify-center rounded-2xl border p-4 transition-all ${s.color} ${selectedSoil === s.id ? 'scale-105 ring-2 ring-emerald-300/50' : 'opacity-80 hover:opacity-100'}`}
                        >
                            <s.icon className="w-8 h-8 mb-2" />
                            <span className="font-bold text-sm">{s.label}</span>
                        </MotionButton>
                    ))}
                </div>
            </GlassCard>

            <GlassCard className="space-y-4 p-5">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-sm">2</span>
                    Select Season
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    {seasons.map((s) => (
                        <MotionButton
                            key={s.id}
                            onClick={() => { setSelectedSeason(s.id); setRecommendation(null); }}
                            whileTap={{ scale: 0.97 }}
                            className={`flex flex-col items-center justify-center rounded-2xl border p-4 transition-all ${s.color} ${selectedSeason === s.id ? 'scale-105 ring-2 ring-emerald-300/50' : 'opacity-80 hover:opacity-100'}`}
                        >
                            <s.icon className="w-8 h-8 mb-2" />
                            <span className="font-bold text-sm">{s.label}</span>
                        </MotionButton>
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
                <MotionDiv
                    className="mt-8"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <GlassCard className={`p-8 text-center ${recommendation.colorClass || 'bg-brand-green-100 text-brand-green-700'}`}>
                        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl bg-white/50">
                            <RecIcon className="h-16 w-16 drop-shadow-sm" />
                        </div>
                        <h3 className="text-display mb-2 text-3xl font-semibold text-slate-900">{recommendation.name}</h3>
                        <p className="mb-4 text-sm font-medium text-slate-700">Best match for your selection</p>

                        {recommendation.aiExplanation && (
                            <div className="flex w-full items-start gap-3 rounded-2xl border border-white/40 bg-white/70 p-4 text-left font-medium text-slate-800">
                                <Sprout className="h-6 w-6 shrink-0 text-brand-green-600" />
                                <p className="leading-relaxed">{recommendation.aiExplanation}</p>
                            </div>
                        )}
                    </GlassCard>
                </MotionDiv>
            )}

            {!loading && !recommendation && (
                <GlassCard className="p-4 text-center">
                    <p className="text-sm font-medium text-slate-300">No recommendation yet. Select soil and season to get started.</p>
                </GlassCard>
            )}

        </div>
    );
};

export default Crops;
