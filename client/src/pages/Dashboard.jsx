import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sprout, CloudSun, Beaker, Bug, LineChart } from 'lucide-react';
import ActionCard from '../components/ActionCard';
import GlassCard from '../components/GlassCard';
import SectionHeader from '../components/SectionHeader';

const Dashboard = () => {
    const { t } = useTranslation();
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

    const actions = [
        {
            title: t('crops'),
            icon: Sprout,
            colorClass: 'bg-green-100 text-green-600',
            path: '/crops',
            description: 'Find the best crop fit for your field conditions.',
        },
        {
            title: t('weather'),
            icon: CloudSun,
            colorClass: 'bg-green-100 text-green-600',
            path: '/weather',
            description: 'Track live weather signals before field work.',
        },
        {
            title: t('soil'),
            icon: Beaker,
            colorClass: 'bg-green-100 text-green-600',
            path: '/soil',
            description: 'Check soil insights to support healthier growth.',
        },
        {
            title: t('pests'),
            icon: Bug,
            colorClass: 'bg-green-100 text-green-600',
            path: '/pests',
            description: 'Scan crop images for early pest detection.',
        },
        {
            title: t('market'),
            icon: LineChart,
            colorClass: 'bg-green-100 text-green-600',
            path: '/market',
            description: 'Review market movement before selling produce.',
        },
    ];

    const quickSignals = ['AI crop recommendations', 'Hyperlocal weather', 'Pest detection alerts', 'Market timing insights'];

    return (
        <div className="page-reveal space-y-6 pb-10">
            <GlassCard className="relative overflow-hidden border-emerald-100/80 p-6 sm:p-8">
                <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-emerald-200/50 blur-2xl" />
                <div className="absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-lime-200/60 blur-2xl" />

                <div className="relative">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700/85">{greeting}</p>
                    <h2 className="text-display mt-2 text-3xl font-semibold text-slate-800 sm:text-4xl">{t('app_title')}</h2>
                    <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">{t('tagline')}</p>

                    <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        {quickSignals.map((signal) => (
                            <div key={signal} className="rounded-2xl border border-emerald-100 bg-white/80 px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.08em] text-emerald-700">
                                {signal}
                            </div>
                        ))}
                    </div>
                </div>
            </GlassCard>

            <SectionHeader
                eyebrow="Command Center"
                title={t('dashboard') || 'Dashboard'}
                subtitle="Jump into the right workflow in one tap and make faster field decisions."
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {actions.map((action, index) => (
                    <div key={action.path} className={index === 0 ? 'sm:col-span-2 lg:col-span-2' : ''}>
                        <ActionCard {...action} />
                    </div>
                ))}
            </div>

            <GlassCard className="border-emerald-100/80 p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700/80">Judge-ready story</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700 sm:text-base">
                    KisanSetu combines advisory intelligence, crop-health scanning, and market timing in one seamless mobile-first interface tailored for real farmer workflows.
                </p>
            </GlassCard>
        </div>
    );
};

export default Dashboard;
