import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();

    const getLabel = (path) => {
        if (path === '/') return t('home');
        if (path === '/crops') return t('crops');
        if (path === '/weather') return t('weather');
        if (path === '/soil') return t('soil');
        if (path === '/pests') return t('pests');
        if (path === '/market') return t('market');
        return 'Navigation';
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-100 px-2 py-3 pb-safe z-50 rounded-t-3xl shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex justify-around items-center">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        aria-label={getLabel(item.path)}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 relative ${isActive
                                ? 'text-brand-green-600 bg-brand-green-50 scale-110'
                                : 'text-slate-400 hover:bg-slate-50'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {item.icon}
                                {isActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-green-500 absolute -bottom-1"></span>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default BottomNav;
