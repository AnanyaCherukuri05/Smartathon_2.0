import React from 'react';
import { useNavigate } from 'react-router-dom';

const ActionCard = ({ title, icon: Icon, colorClass, path, description }) => {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate(path)}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl shadow-sm border border-slate-100/50 hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all duration-300 w-full group"
        >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:-translate-y-1 ${colorClass}`}>
                {Icon ? React.createElement(Icon, { className: 'w-10 h-10' }) : null}
            </div>
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            {description && (
                <p className="text-sm text-slate-500 mt-1 font-medium">{description}</p>
            )}
        </button>
    );
};

export default ActionCard;
