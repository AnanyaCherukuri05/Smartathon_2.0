import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Wheat, Leaf, Sprout, Cloud, Loader2, BarChart2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const iconsRef = { Wheat, Leaf, Sprout, Cloud };

const Market = () => {
    const { t } = useTranslation();
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('http://localhost:5000/api/prices')
            .then(res => res.json())
            .then(payload => {
                const maybePrices = Array.isArray(payload) ? payload : payload?.data;

                if (!Array.isArray(maybePrices)) {
                    throw new Error('Unexpected /api/prices response');
                }

                setPrices(maybePrices);
                setError(null);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError(t('market_error_load_failed'));
                setLoading(false);
            });
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
                <p className="text-sm text-slate-500 mt-1">{t('market_error_api_hint')}</p>
            </div>
        );
    }

    // Mock historical data for the professional chart
    const historicalData = [
        { day: 'Mon', price: 2100 },
        { day: 'Tue', price: 2150 },
        { day: 'Wed', price: 2120 },
        { day: 'Thu', price: 2200 },
        { day: 'Fri', price: 2250 },
        { day: 'Sat', price: 2300 },
        { day: 'Sun', price: 2350 },
    ];

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-10">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <BarChart2 className="w-6 h-6 text-brand-green-600" />
                {t('market_title')}
            </h2>

            {/* Professional Trend Chart */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-1">{t('market_weekly_trend')}</h3>
                <p className="text-sm text-slate-500 mb-6 font-medium">{t('market_avg_index')}</p>

                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historicalData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ color: '#16a34a', fontWeight: 'bold' }}
                            />
                            <Area type="monotone" dataKey="price" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="flex items-center justify-between mb-2 mt-4">
                <h3 className="text-lg font-bold text-slate-800">{t('market_current_rates')}</h3>
                <span className="text-xs font-bold bg-brand-green-100 text-brand-green-700 px-2 py-1 rounded-full">{t('market_per_quintal')}</span>
            </div>

            <div className="grid gap-4">
                {prices.map((item, index) => {
                    const IconComp = iconsRef[item.iconName] || Leaf;
                    return (
                        <div key={index} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">

                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${item.colorClass}`}>
                                <IconComp className="w-8 h-8" />
                            </div>

                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-slate-800">{item.cropName}</h3>
                                <div className="flex items-end gap-2 mt-1">
                                    <span className="text-2xl font-extrabold text-slate-800 flex items-center leading-none">
                                        <span className="text-lg text-slate-400 mr-1 font-bold">₹</span>{item.currentPrice}
                                    </span>

                                    <span className={`flex items-center gap-1 text-sm font-bold ${item.trend === 'up' ? 'text-green-600' : 'text-red-600'} mb-0.5`}>
                                        {item.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
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
