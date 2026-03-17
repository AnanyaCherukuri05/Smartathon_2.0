import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Beaker, Droplets, Leaf, ThumbsUp, AlertCircle, ShoppingBag } from 'lucide-react';

const Soil = () => {
    const { t } = useTranslation();
    const [moisture, setMoisture] = useState(50); // 0-100
    const [ph, setPh] = useState(6.5); // 0-14

    const getMoistureStatus = (val) => {
        if (val < 30) return { text: 'Too Dry', icon: AlertCircle, color: 'text-orange-500 bg-orange-100', need: 'Water immediately 💧' };
        if (val > 80) return { text: 'Too Wet', icon: AlertCircle, color: 'text-blue-500 bg-blue-100', need: 'Stop watering 🚫' };
        return { text: 'Good', icon: ThumbsUp, color: 'text-brand-green-500 bg-brand-green-100', need: 'Perfect moisture ✅' };
    };

    const getPhStatus = (val) => {
        if (val < 5.5) return { text: 'Acidic', color: 'text-red-500 bg-red-100', action: 'Add lime' };
        if (val > 7.5) return { text: 'Alkaline', color: 'text-purple-500 bg-purple-100', action: 'Add sulfur' };
        return { text: 'Neutral', color: 'text-brand-green-500 bg-brand-green-100', action: 'Great soil' };
    };

    const currentMoisStatus = getMoistureStatus(moisture);
    const currentPhStatus = getPhStatus(ph);

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-10">
            <h2 className="text-2xl font-bold text-slate-800">{t('soil')} Health</h2>

            {/* Moisture Card */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Droplets className="w-6 h-6 text-blue-500" /> Moisture
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 ${currentMoisStatus.color}`}>
                        <currentMoisStatus.icon className="w-4 h-4" /> {currentMoisStatus.text}
                    </span>
                </div>

                <input
                    type="range"
                    min="0" max="100"
                    value={moisture}
                    onChange={(e) => setMoisture(Number(e.target.value))}
                    className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500 mb-4"
                />

                <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-600">
                        <Leaf className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-slate-700">{currentMoisStatus.need}</p>
                </div>
            </div>

            {/* pH Card */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Beaker className="w-6 h-6 text-purple-500" /> pH Level
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 ${currentPhStatus.color}`}>
                        {currentPhStatus.text}
                    </span>
                </div>

                <div className="flex items-center gap-4 mb-4">
                    <span className="font-bold text-slate-400">0</span>
                    <input
                        type="range"
                        min="0" max="14" step="0.5"
                        value={ph}
                        onChange={(e) => setPh(Number(e.target.value))}
                        className="w-full h-3 bg-gradient-to-r from-red-400 via-green-400 to-purple-400 rounded-lg appearance-none cursor-pointer accent-white border-2 border-slate-300"
                    />
                    <span className="font-bold text-slate-400">14</span>
                </div>

                {/* Suggestion based on pH */}
                {ph < 5.5 && (
                    <div className="p-4 bg-orange-50 rounded-2xl flex items-center gap-3 border border-orange-100">
                        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-orange-800">Add Agricultural Lime</p>
                            <p className="text-sm font-medium text-orange-600">To reduce acidity</p>
                        </div>
                    </div>
                )}
                {ph > 7.5 && (
                    <div className="p-4 bg-purple-50 rounded-2xl flex items-center gap-3 border border-purple-100">
                        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-purple-800">Add Elemental Sulfur</p>
                            <p className="text-sm font-medium text-purple-600">To reduce alkalinity</p>
                        </div>
                    </div>
                )}
                {ph >= 5.5 && ph <= 7.5 && (
                    <div className="p-4 bg-brand-green-50 rounded-2xl flex items-center justify-center gap-2 border border-brand-green-100 text-brand-green-700 font-bold">
                        Soil mix is perfectly balanced! 🎉
                    </div>
                )}
            </div>

        </div>
    );
};

export default Soil;
