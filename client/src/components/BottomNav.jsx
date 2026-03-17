import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Sprout, CloudSun, Beaker, Bug, LineChart } from 'lucide-react';

const navItems = [
    { path: '/', icon: <Home className="w-6 h-6" />, label: 'Home' },
    { path: '/crops', icon: <Sprout className="w-6 h-6" />, label: 'Crops' },
    { path: '/weather', icon: <CloudSun className="w-6 h-6" />, label: 'Weather' },
    { path: '/soil', icon: <Beaker className="w-6 h-6" />, label: 'Soil' },
    { path: '/pests', icon: <Bug className="w-6 h-6" />, label: 'Pests' },
    { path: '/market', icon: <LineChart className="w-6 h-6" />, label: 'Market' },
];

const BottomNav = () => {
    const MotionDiv = motion.div;

    return (
        <div className="fixed bottom-3 left-0 right-0 z-50 mx-auto w-full max-w-md px-3">
            <div className="card-neuro flex items-center justify-around rounded-2xl border border-white/10 bg-slate-900/65 px-2 py-2 backdrop-blur-2xl">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `relative flex flex-col items-center justify-center rounded-xl px-3 py-2 transition-all duration-300 ${isActive
                                ? 'text-emerald-200'
                                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <MotionDiv
                                whileTap={{ scale: 0.92 }}
                                className="flex flex-col items-center"
                            >
                                <div className={`${isActive ? 'rounded-xl bg-gradient-to-br from-emerald-400/35 to-cyan-400/25 p-2 shadow-[0_6px_18px_rgba(45,212,191,0.24)]' : 'p-2'}`}>
                                    {item.icon}
                                </div>
                                {isActive && (
                                    <span className="absolute -bottom-0.5 h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.9)]"></span>
                                )}
                            </MotionDiv>
                        )}
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default BottomNav;
