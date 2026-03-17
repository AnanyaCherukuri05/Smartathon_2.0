import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sprout, CloudSun, Beaker, Bug, LineChart } from 'lucide-react';
import ActionCard from '../components/ActionCard';

const Dashboard = () => {
    const { t } = useTranslation();

    const actions = [
        {
            title: t('crops'),
            icon: Sprout,
            colorClass: 'bg-green-100 text-green-600',
            path: '/crops',
        },
        {
            title: t('weather'),
            icon: CloudSun,
            colorClass: 'bg-blue-100 text-blue-600',
            path: '/weather',
        },
        {
            title: t('soil'),
            icon: Beaker,
            colorClass: 'bg-amber-100 text-amber-600',
            path: '/soil',
        },
        {
            title: t('pests'),
            icon: Bug,
            colorClass: 'bg-red-100 text-red-600',
            path: '/pests',
        },
        {
            title: t('market'),
            icon: LineChart,
            colorClass: 'bg-purple-100 text-purple-600',
            path: '/market',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Hero Section */}
            <div className="bg-brand-green-500 rounded-3xl p-6 text-white text-center shadow-lg shadow-brand-green-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-green-700/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>

                <div className="relative z-10">
                    <h2 className="text-3xl font-extrabold mb-2 text-white drop-shadow-sm">{t('app_title')}</h2>
                    <p className="text-brand-green-50 font-medium text-lg leading-relaxed">{t('tagline')}</p>
                </div>
            </div>

            {/* Grid Menu */}
            <div className="grid grid-cols-2 gap-4">
                {actions.map((action, index) => (
                    <div key={index} className={index === 0 ? "col-span-2" : "col-span-1"}>
                        <ActionCard {...action} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;
