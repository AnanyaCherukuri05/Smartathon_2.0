import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sprout, CloudSun, MessageSquare, Bug, LineChart } from 'lucide-react';
import ActionCard from '../components/ActionCard';
import GlassCard from '../components/GlassCard';
import SectionHeader from '../components/SectionHeader';

const Dashboard = () => {
    const { t } = useTranslation();

    const hour = new Date().getHours();
    const greeting =
        hour < 12
            ? '🌅 Good Morning'
            : hour < 18
            ? '☀️ Good Afternoon'
            : '🌙 Good Evening';

    const actions = [
        {
            title: t('crops'),
            icon: Sprout,
            colorClass: 'bg-green-100 text-green-600',
            path: '/crops',
            description:
                'AI-powered crop recommendation using soil, live season detection, market trends, and optional field photo analysis.',
        },
        {
            title: t('weather'),
            icon: CloudSun,
            colorClass: 'bg-green-100 text-green-600',
            path: '/weather',
            description:
                'Track real-time weather conditions to plan irrigation, spraying, and harvesting activities.',
        },
        {
            title: t('ai_chat') || 'AI Chat',
            icon: MessageSquare,
            colorClass: 'bg-green-100 text-green-600',
            path: '/chat',
            description:
                'Ask farming questions and receive instant AI-powered agricultural guidance.',
        },
        {
            title: t('pests'),
            icon: Bug,
            colorClass: 'bg-green-100 text-green-600',
            path: '/pests',
            description:
                'Upload crop images to detect pests and diseases using AI image recognition.',
        },
        {
            title: t('market'),
            icon: LineChart,
            colorClass: 'bg-green-100 text-green-600',
            path: '/market',
            description:
                'Analyze crop market prices and trends to sell produce at the best time.',
        },
    ];

    const quickSignals = [
        '🌾 AI Crop Recommendation',
        '🌦 Hyperlocal Weather Insights',
        '🐛 AI Pest Detection Alerts',
        '📈 Smart Market Price Monitoring',
    ];

    return (
        <div className="page-reveal space-y-6 pb-10">

            {/* HERO CARD */}
            <GlassCard className="relative overflow-hidden border-emerald-100/80 p-6 sm:p-8">
                <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-emerald-200/50 blur-2xl" />
                <div className="absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-lime-200/60 blur-2xl" />

                <div className="relative">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700/85">
                        {greeting}
                    </p>

                    <h2 className="text-display mt-2 text-3xl font-semibold text-slate-800 sm:text-4xl">
                        {t('app_title') || 'KisanSetu'}
                    </h2>

                    <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
                        {t('tagline') ||
                            'AI-powered farming intelligence helping farmers make smarter crop, weather, pest, and market decisions.'}
                    </p>

                    {/* QUICK SIGNALS */}
                    <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        {quickSignals.map((signal) => (
                            <div
                                key={signal}
                                className="rounded-2xl border border-emerald-100 bg-white/80 px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.08em] text-emerald-700"
                            >
                                {signal}
                            </div>
                        ))}
                    </div>
                </div>
            </GlassCard>

            {/* SECTION HEADER */}
            <SectionHeader
                eyebrow="Command Center"
                title={t('dashboard')}
                subtitle="Access intelligent tools to analyze crops, weather, pests, and market insights in one place."
            />

            {/* ACTION CARDS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {actions.map((action, index) => (
                    <div
                        key={action.path}
                        className={index === 0 ? 'sm:col-span-2 lg:col-span-2' : ''}
                    >
                        <ActionCard {...action} />
                    </div>
                ))}
            </div>

            {/* STORY CARD */}
            <GlassCard className="border-emerald-100/80 p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700/80">
                    Innovation Story
                </p>

                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700 sm:text-base">
                    KisanSetu is an AI-driven crop advisory platform designed to help small and marginal
                    farmers make better agricultural decisions. By combining crop intelligence,
                    weather forecasting, pest detection, and market insights in one platform,
                    farmers can reduce risks, improve yield, and maximize profits.
                </p>
            </GlassCard>
        </div>
    );
};

export default Dashboard;