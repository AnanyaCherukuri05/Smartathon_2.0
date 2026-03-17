import React from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from './GlassCard';

const ActionCard = ({ title, icon: Icon, colorClass, path, description }) => {
    const navigate = useNavigate();

    return (
        <GlassCard
            as="button"
            hover
            onClick={() => navigate(path)}
            className="group w-full p-5 text-left"
        >
            <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${colorClass}`}>
                {React.createElement(Icon, { className: 'h-8 w-8' })}
            </div>
            <h3 className="text-display text-lg font-semibold text-gray-800">{title}</h3>
            {description && (
                <p className="mt-1 text-sm font-medium leading-relaxed text-gray-600">{description}</p>
            )}
            <div className="mt-4 flex items-center text-xs font-semibold tracking-wide text-green-600 uppercase">
                Explore
            </div>
        </GlassCard>
    );
};

export default ActionCard;
