import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Beaker, Droplets, Leaf, ThumbsUp, AlertCircle, ShoppingBag } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';

const Soil = () => {
    const { t } = useTranslation();
    const [moisture, setMoisture] = useState(50); // 0-100
    const [ph, setPh] = useState(6.5); // 0-14
    const [serverStatus, setServerStatus] = useState(null);

    const localMoistureKey = useMemo(() => {
        if (moisture < 30) return 'too_dry';
        if (moisture > 80) return 'too_wet';
        return 'good';
    }, [moisture]);

    const localPhKey = useMemo(() => {
        if (ph < 5.5) return 'acidic';
        if (ph > 7.5) return 'alkaline';
        return 'neutral';
    }, [ph]);

    const moistureKey = serverStatus?.moistureStatus || localMoistureKey;
    const phKey = serverStatus?.phStatus || localPhKey;

    const currentMoisStatus = useMemo(() => {
        if (moistureKey === 'too_dry') {
            return { text: t('soil_moisture_too_dry'), icon: AlertCircle, color: 'text-orange-500 bg-orange-100', need: t('soil_moisture_need_water') };
        }
        if (moistureKey === 'too_wet') {
            return { text: t('soil_moisture_too_wet'), icon: AlertCircle, color: 'text-blue-500 bg-blue-100', need: t('soil_moisture_need_stop') };
        }
        return { text: t('soil_status_good'), icon: ThumbsUp, color: 'text-brand-green-500 bg-brand-green-100', need: t('soil_moisture_need_perfect') };
    }, [moistureKey, t]);

    const currentPhStatus = useMemo(() => {
        if (phKey === 'acidic') return { text: t('soil_ph_acidic'), color: 'text-red-500 bg-red-100', action: t('soil_ph_action_add_lime') };
        if (phKey === 'alkaline') return { text: t('soil_ph_alkaline'), color: 'text-purple-500 bg-purple-100', action: t('soil_ph_action_add_sulfur') };
        return { text: t('soil_ph_neutral'), color: 'text-brand-green-500 bg-brand-green-100', action: t('soil_ph_action_great') };
    }, [phKey, t]);

    useEffect(() => {
        const timer = setTimeout(() => {
            apiFetch('/api/soil/analyze', {
                method: 'POST',
                auth: false,
                body: { moisture, ph }
            })
                .then((data) => setServerStatus(data))
                .catch(() => setServerStatus(null));
        }, 250);

        return () => clearTimeout(timer);
    }, [moisture, ph]);

    const showAcidicHint = phKey === 'acidic';
    const showAlkalineHint = phKey === 'alkaline';

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-10">
            <h2 className="text-2xl font-bold text-slate-800">{t('soil_health_title')}</h2>

            {/* Moisture Card */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Droplets className="w-6 h-6 text-blue-500" /> {t('soil_moisture')}
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
                        <Beaker className="w-6 h-6 text-purple-500" /> {t('soil_ph_level')}
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
                {showAcidicHint && (
                    <div className="p-4 bg-orange-50 rounded-2xl flex items-center gap-3 border border-orange-100">
                        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-orange-800">{t('soil_ph_add_lime_title')}</p>
                            <p className="text-sm font-medium text-orange-600">{t('soil_ph_add_lime_desc')}</p>
                        </div>
                    </div>
                )}
                {showAlkalineHint && (
                    <div className="p-4 bg-purple-50 rounded-2xl flex items-center gap-3 border border-purple-100">
                        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-purple-800">{t('soil_ph_add_sulfur_title')}</p>
                            <p className="text-sm font-medium text-purple-600">{t('soil_ph_add_sulfur_desc')}</p>
                        </div>
                    </div>
                )}
                {!showAcidicHint && !showAlkalineHint && (
                    <div className="p-4 bg-brand-green-50 rounded-2xl flex items-center justify-center gap-2 border border-brand-green-100 text-brand-green-700 font-bold">
                        {t('soil_balanced')}
                    </div>
                )}
            </div>

        </div>
    );
};

export default Soil;
