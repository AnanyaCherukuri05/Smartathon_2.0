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

    return (
        <div className="space-y-6 pb-10">
            <GlassCard className="p-6">
                <p className="text-sm font-medium text-green-600">{greeting}</p>
                <h2 className="text-display mt-2 text-3xl font-semibold text-gray-800">{t('app_title')}</h2>
                <p className="mt-2 max-w-xs text-sm font-medium leading-relaxed text-gray-600">{t('tagline')}</p>
            </GlassCard>

            <SectionHeader title={t('dashboard') || 'Dashboard'} subtitle="Your crop intelligence workspace" />

            <div className="grid grid-cols-2 gap-4">
                {actions.map((action, index) => (
                    <div key={index} className={index === 0 ? 'col-span-2' : 'col-span-1'}>
                        <ActionCard {...action} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;
