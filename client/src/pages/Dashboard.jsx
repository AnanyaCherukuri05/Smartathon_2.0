import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Sprout, CloudSun, Beaker, Bug, LineChart } from 'lucide-react';
import ActionCard from '../components/ActionCard';
import GlassCard from '../components/GlassCard';
import SectionHeader from '../components/SectionHeader';

const Dashboard = () => {
    const { t } = useTranslation();
    const MotionDiv = motion.div;

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
        <div className="space-y-6 pb-10">
            <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard className="card-neuro relative overflow-hidden p-6">
                    <div className="absolute -top-24 right-0 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" />
                    <div className="absolute -bottom-20 left-0 h-44 w-44 rounded-full bg-emerald-300/20 blur-3xl" />
                    <div className="relative z-10">
                        <p className="text-sm font-medium uppercase tracking-[0.22em] text-emerald-200/80">Smart Crop App</p>
                        <h2 className="text-display mt-3 text-3xl font-semibold leading-tight text-white">{t('app_title')}</h2>
                        <p className="mt-2 max-w-xs text-sm font-medium leading-relaxed text-slate-200/90">{t('tagline')}</p>
                    </div>
                </GlassCard>
            </MotionDiv>

            <SectionHeader title={t('dashboard') || 'Dashboard'} subtitle="Your crop intelligence workspace" />

            <MotionDiv
                className="grid grid-cols-2 gap-4"
                initial="hidden"
                animate="show"
                variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.08 } },
                }}
            >
                {actions.map((action, index) => (
                    <MotionDiv
                        key={index}
                        variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                        className={index === 0 ? 'col-span-2' : 'col-span-1'}
                    >
                        <ActionCard {...action} />
                    </MotionDiv>
                ))}
            </MotionDiv>
        </div>
    );
};

export default Dashboard;
