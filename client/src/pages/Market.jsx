import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Wheat, Leaf, Sprout, Cloud, Loader2, BarChart2, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { apiFetch } from '../lib/apiClient';

const iconsRef = { Wheat, Leaf, Sprout, Cloud };

const Market = () => {

    const { t } = useTranslation();

    const [prices, setPrices] = useState([]);
    const [prediction, setPrediction] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {

        const loadData = async () => {

            try {

                const pricePayload = await apiFetch('/api/prices', { auth: false });
                const maybePrices = Array.isArray(pricePayload) ? pricePayload : pricePayload?.data;

                if (!Array.isArray(maybePrices)) {
                    throw new Error('Unexpected /api/prices response');
                }

                setPrices(maybePrices);

                const predictionPayload = await apiFetch('/api/profit-prediction', { auth: false });

                setPrediction(predictionPayload);

                setError(null);

            } catch (err) {

                console.error(err);
                setError(t('market_error_load_failed'));

            } finally {

                setLoading(false);

            }

        };

        loadData();

    }, [t]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-brand-green-600">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <p className="font-bold">{t('market_loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-red-600">
                <p className="font-bold">{error}</p>
            </div>
        );
    }

    const historicalData = [
        { day: 'Mon', price: 2100 },
        { day: 'Tue', price: 2150 },
        { day: 'Wed', price: 2120 },
        { day: 'Thu', price: 2200 },
        { day: 'Fri', price: 2250 },
        { day: 'Sat', price: 2300 },
        { day: 'Sun', price: 2350 }
    ];

    return (
        <div className="space-y-6 pb-10">

            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <BarChart2 className="w-6 h-6 text-brand-green-600" />
                {t('market_title')}
            </h2>

            {/* AI PROFIT PREDICTION CARD */}

            {prediction?.recommendedCrop && (

                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-3xl shadow-lg">

                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-6 h-6" />
                        <h3 className="text-lg font-bold">
                            AI Profit Advisor
                        </h3>
                    </div>

                    <p className="text-sm opacity-90 mb-3">
                        Best crop recommendation based on market price and yield
                    </p>

                    <div className="text-3xl font-bold">
                        🌾 {prediction.recommendedCrop.crop}
                    </div>

                    <p className="text-lg mt-1">
                        Estimated Profit: ₹{prediction.recommendedCrop.estimated_profit}
                    </p>

                    {prediction.explanation && (
                        <p className="text-sm mt-2 opacity-90">
                            {prediction.explanation}
                        </p>
                    )}

                </div>

            )}

            {/* Market Trend Chart */}

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">

                <h3 className="text-lg font-bold text-slate-800 mb-1">
                    Weekly Market Trend
                </h3>

                <div className="h-48 w-full">

                    <ResponsiveContainer width="100%" height="100%">

                        <AreaChart data={historicalData}>

                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                </linearGradient>
                            </defs>

                            <XAxis dataKey="day" />

                            <Tooltip />

                            <Area
                                type="monotone"
                                dataKey="price"
                                stroke="#16a34a"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorPrice)"
                            />

                        </AreaChart>

                    </ResponsiveContainer>

                </div>

            </div>

            {/* CURRENT MARKET PRICES */}

            <div className="grid gap-4">

                {prices.map((item, index) => {

                    const IconComp = iconsRef[item.iconName] || Leaf;

                    return (

                        <div key={index} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">

                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${item.colorClass}`}>
                                <IconComp className="w-8 h-8" />
                            </div>

                            <div className="flex-1">

                                <h3 className="text-xl font-bold text-slate-800">
                                    {item.cropName}
                                </h3>

                                <div className="flex items-end gap-2 mt-1">

                                    <span className="text-2xl font-extrabold text-slate-800">
                                        ₹{item.currentPrice}
                                    </span>

                                    <span className={`flex items-center gap-1 text-sm font-bold ${item.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>

                                        {item.trend === 'up'
                                            ? <TrendingUp className="w-4 h-4" />
                                            : <TrendingDown className="w-4 h-4" />}

                                        ₹{Math.abs(item.priceDiff)}

                                    </span>

                                </div>

                            </div>

                        </div>

                    );

                })}

            </div>

        </div>
    );
};

export default Market;