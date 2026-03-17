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
            whileTap={{ scale: 0.98 }}
            className="group w-full p-6 text-left"
        >
            <MotionDiv
                className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/30 transition-transform group-hover:-translate-y-1 ${colorClass}`}
                whileHover={{ rotate: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            >
                {React.createElement(Icon, { className: 'h-8 w-8' })}
            </MotionDiv>
            <h3 className="text-display text-xl font-semibold text-white">{title}</h3>
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
