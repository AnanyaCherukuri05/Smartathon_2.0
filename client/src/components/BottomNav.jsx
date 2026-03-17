import React from 'react';
import { NavLink } from 'react-router-dom';
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
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-md border-t border-green-100 bg-white px-3 py-2">
            <div className="flex items-center justify-around rounded-xl border border-green-100 bg-white px-2 py-2 shadow-md">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `relative flex flex-col items-center justify-center rounded-xl px-3 py-2 transition-all duration-300 ${isActive
                                ? 'text-green-600'
                                : 'text-gray-500 hover:bg-green-50 hover:text-green-600'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <div className="flex flex-col items-center">
                                <div className={`${isActive ? 'rounded-xl bg-green-50 p-2' : 'p-2'}`}>
                                    {item.icon}
                                </div>
                                {isActive && (
                                    <span className="absolute -bottom-0.5 h-1.5 w-1.5 rounded-full bg-green-500"></span>
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
