import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    TrendingUp,
    TrendingDown,
    Wheat,
    Leaf,
    Sprout,
    Cloud,
    Loader2,
    BarChart2,
} from 'lucide-react';

import {
    AreaChart,
    Area,
    XAxis,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

import { apiFetch } from '../lib/apiClient';
import GlassCard from '../components/GlassCard';
import SectionHeader from '../components/SectionHeader';

const iconsRef = { Wheat, Leaf, Sprout, Cloud };

const Market = () => {

    const { t } = useTranslation();

    const [prices, setPrices] = useState([]);
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        const loadData = async () => {

            try {

                const pricePayload = await apiFetch('/api/prices', { auth: false });

                const rawPrices = Array.isArray(pricePayload)
                    ? pricePayload
                    : pricePayload?.data || [];

                const normalized = rawPrices.map((item, index) => {

                    const price =
                        Number(item.modal_price) ||
                        Number(item.currentPrice) ||
                        0;

                    const icons = ['Wheat', 'Leaf', 'Sprout', 'Cloud'];

                    return {
                        cropName: item.commodity || item.cropName || "Crop",
                        currentPrice: price,
                        trend: index % 2 === 0 ? "up" : "down",
                        priceDiff: Math.floor(Math.random() * 100),
                        iconName: icons[index % icons.length],
                        colorClass: "bg-green-100 text-green-700"
                    };

                });

                normalized.sort((a, b) => b.currentPrice - a.currentPrice);

                setPrices(normalized);

                const predictionPayload = await apiFetch('/api/profit-prediction', { auth: false });

                setPrediction(predictionPayload);

            } catch (err) {

                console.error(err);

            } finally {

                setLoading(false);

            }

        };

        loadData();

    }, []);

    if (loading) {
        return (
            <div className="flex h-64 flex-col items-center justify-center text-green-600">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <p className="font-bold">Loading Market Intelligence...</p>
            </div>
        );
    }

    const profitableCrops = prices.slice(0, 3);

    const historicalData = [
        { day: 'Mon', price: 2100 },
        { day: 'Tue', price: 2150 },
        { day: 'Wed', price: 2120 },
        { day: 'Thu', price: 2200 },
        { day: 'Fri', price: 2250 },
        { day: 'Sat', price: 2300 },
        { day: 'Sun', price: 2350 }
    ];

    const labels = [
        "Most Valuable Crop",
        "High Demand Crop",
        "Stable Profit Crop"
    ];

    const gradients = [
        "from-yellow-400 to-orange-500",
        "from-green-400 to-emerald-600",
        "from-indigo-500 to-purple-600"
    ];

    return (
        <div className="page-reveal space-y-6 pb-10">

            <SectionHeader
                eyebrow="Market Intelligence"
                title={
                    <span className="inline-flex items-center gap-2">
                        <BarChart2 className="h-6 w-6 text-green-600" />
                        {t('market_title') || "Market Prices"}
                    </span>
                }
                subtitle="Compare live prices and identify the most profitable crops."
            />

            {/* TOP PROFITABLE CROPS */}

            <div className="grid md:grid-cols-3 gap-4">

                {profitableCrops.map((crop, index) => {

                    const IconComp = iconsRef[crop.iconName] || Leaf;

                    return (

                        <GlassCard
                            key={index}
                            className={`bg-gradient-to-r ${gradients[index]} text-slate-1500 p-6`}>

                            <div className="flex items-center gap-2 mb-2">

                                <IconComp className="w-6 h-6" />

                                <h3 className="font-bold text-sm opacity-90">
                                    {labels[index]}
                                </h3>

                            </div>

                            <div className="text-2xl font-bold">
                                🌾 {crop.cropName}
                            </div>

                            <p className="text-lg mt-1">
                                ₹{crop.currentPrice} / quintal
                            </p>

                            <p className="text-xs opacity-80">
                                {crop.trend === "up"
                                    ? "Demand increasing 📈"
                                    : "Market stabilizing"}
                            </p>

                        </GlassCard>

                    );

                })}

            </div>

            {/* MARKET TREND */}

            <GlassCard className="p-6">

                <h3 className="text-lg font-bold mb-2">
                    Weekly Market Trend
                </h3>

                <div className="h-48">

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

            </GlassCard>

            {/* MARKET PRICE LIST */}

            <div className="grid gap-4">

                {prices.map((item, index) => {

                    const IconComp = iconsRef[item.iconName] || Leaf;

                    return (

                        <GlassCard key={index} className="flex items-center gap-4 p-5">

                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${item.colorClass}`}>
                                <IconComp className="w-8 h-8" />
                            </div>

                            <div className="flex-1">

                                <h3 className="text-xl font-bold">
                                    {item.cropName}
                                </h3>

                                <div className="flex items-end gap-2 mt-1">

                                    <span className="text-2xl font-extrabold">
                                        ₹{item.currentPrice}
                                    </span>

                                    <span className={`flex items-center gap-1 text-sm font-bold ${
                                        item.trend === 'up'
                                            ? 'text-green-600'
                                            : 'text-red-600'
                                    }`}>

                                        {item.trend === 'up'
                                            ? <TrendingUp className="w-4 h-4" />
                                            : <TrendingDown className="w-4 h-4" />}

                                        ₹{Math.abs(item.priceDiff)}

                                    </span>

                                </div>

                            </div>

                        </GlassCard>

                    );

                })}

            </div>

        </div>
    );
};

export default Market;