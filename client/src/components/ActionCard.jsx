import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GlassCard from './GlassCard';

const ActionCard = ({ title, icon: Icon, colorClass, path, description }) => {
    const navigate = useNavigate();
    const MotionDiv = motion.div;

    return (
        <GlassCard
            as="button"
            hover
            onClick={() => navigate(path)}
            className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white rounded-3xl shadow-sm border border-slate-100/50 hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all duration-300 w-full group"
        >
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-3 sm:mb-4 transition-transform group-hover:-translate-y-1 ${colorClass}`}>
                <Icon className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">{title}</h3>
            {description && (
                <p className="mt-1 text-sm font-medium text-slate-300">{description}</p>
            )}
            <div className="mt-4 flex items-center text-xs font-semibold tracking-wide text-emerald-200/90">
                Explore
            </div>
        </GlassCard>
    );
};

export default ActionCard;
