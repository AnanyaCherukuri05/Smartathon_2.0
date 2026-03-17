import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Sprout, CloudSun, MessageSquare, Bug, LineChart } from 'lucide-react';

const navItems = [
    { path: '/', icon: <Home className="w-6 h-6" />, label: 'Home' },
    { path: '/crops', icon: <Sprout className="w-6 h-6" />, label: 'Crops' },
    { path: '/weather', icon: <CloudSun className="w-6 h-6" />, label: 'Weather' },
    { path: '/chat', icon: <MessageSquare className="w-6 h-6" />, label: 'AI Chat' },
    { path: '/pests', icon: <Bug className="w-6 h-6" />, label: 'Pests' },
    { path: '/market', icon: <LineChart className="w-6 h-6" />, label: 'Market' },
];

const BottomNav = () => {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-5xl px-3 pb-3 pt-2 sm:px-5">
            <div className="glass-surface card-neuro mx-auto flex w-full max-w-4xl items-center justify-between rounded-3xl border border-emerald-100/80 px-2 py-2 sm:px-3">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `relative flex min-w-0 flex-1 items-center justify-center rounded-2xl px-2 py-2 text-center transition-all duration-300 ${isActive
                                ? 'bg-emerald-50/90 text-emerald-700'
                                : 'text-slate-500 hover:bg-emerald-50/70 hover:text-emerald-700'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <div className="flex min-w-0 flex-col items-center gap-1">
                                <div className={`${isActive ? 'rounded-xl bg-white p-2 shadow-sm' : 'p-2'}`}>
                                    {item.icon}
                                </div>
                                <span className="truncate text-[11px] font-bold uppercase tracking-[0.08em]">
                                    {item.label}
                                </span>
                                {isActive && (
                                    <span className="absolute -bottom-0.5 h-1.5 w-7 rounded-full bg-emerald-500"></span>
                                )}
                            </div>
                        )}
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default BottomNav;
