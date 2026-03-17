import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import GlassCard from './GlassCard';

const ActionCard = ({ title, icon: Icon, colorClass, path, description }) => {
    const navigate = useNavigate();

    return (
        <GlassCard
            as="button"
            hover
            onClick={() => navigate(path)}
            className="group w-full p-5 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
        >
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ${colorClass}`}>
                    {React.createElement(Icon, { className: 'h-8 w-8' })}
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white/80 p-2 text-emerald-600 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    <ArrowUpRight className="h-4 w-4" />
                </div>
            </div>

            <h3 className="text-display text-lg font-semibold text-slate-800">{title}</h3>
            {description && (
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-600">{description}</p>
            )}

            <div className="mt-4 flex items-center text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                Open Module
            </div>
        </GlassCard>
    );
};

export default ActionCard;
