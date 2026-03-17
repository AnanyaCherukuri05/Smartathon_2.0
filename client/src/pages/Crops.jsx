import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, CloudRain, Snowflake, Droplets, Mountain, Sprout, Leaf, Wheat, Cloud, Loader2 } from 'lucide-react';

const iconsRef = { Wheat, Leaf, Sprout, Cloud };

const Crops = () => {
    const { t } = useTranslation();
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
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-10">
            <h2 className="text-2xl font-bold text-slate-800">{t('crops')} {t('recommendation')}</h2>

            {/* Soil Selector */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">1</span>
                    Select Soil
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    {soils.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => { setSelectedSoil(s.id); setRecommendation(null); }}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${s.color} ${selectedSoil === s.id ? 'ring-4 ring-brand-green-500/30 scale-105' : 'opacity-70 hover:opacity-100'}`}
                        >
                            <s.icon className="w-8 h-8 mb-2" />
                            <span className="font-bold text-sm">{s.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Season Selector */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">2</span>
                    Select Season
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    {seasons.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => { setSelectedSeason(s.id); setRecommendation(null); }}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${s.color} ${selectedSeason === s.id ? 'ring-4 ring-brand-green-500/30 scale-105' : 'opacity-70 hover:opacity-100'}`}
                        >
                            <s.icon className="w-8 h-8 mb-2" />
                            <span className="font-bold text-sm">{s.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Action Button */}
            <button
                onClick={handleRecommend}
                disabled={!selectedSoil || !selectedSeason || loading}
                className="w-full py-4 rounded-2xl bg-brand-green-600 text-white font-bold text-lg shadow-lg shadow-brand-green-600/30 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex justify-center items-center gap-2"
            >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sprout className="w-6 h-6" />}
                Get Advice
            </button>

            {/* Result Section */}
            {recommendation && (
                <div className="mt-8 animate-in slide-in-from-bottom-8 duration-500">
                    <div className={`rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-md border border-white/50 ${recommendation.colorClass || 'bg-brand-green-100 text-brand-green-700'}`}>
                        <div className="w-24 h-24 bg-white/50 rounded-full flex items-center justify-center mb-4">
                            <RecIcon className="w-16 h-16 drop-shadow-sm" />
                        </div>
                        <h3 className="text-3xl font-extrabold mb-2">{recommendation.name}</h3>
                        <p className="font-medium opacity-80 mb-4 text-sm">Best match for your selection</p>

                        {recommendation.aiExplanation && (
                            <div className="bg-white/60 p-4 rounded-xl shadow-sm text-slate-800 font-medium w-full text-left flex gap-3 items-start border border-white/40">
                                <Sprout className="w-6 h-6 shrink-0 text-brand-green-600" />
                                <p className="leading-relaxed">{recommendation.aiExplanation}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default Crops;
