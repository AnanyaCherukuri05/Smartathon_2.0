import React, { useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Sparkles, UserRound } from 'lucide-react';
import { AuthContext } from '../context/auth-context';
import { LANGUAGE_OPTIONS, normalizeLanguageCode } from '../lib/languages';
import GlassCard from './GlassCard';

const routeLabelMap = {
    '/': 'Dashboard',
    '/crops': 'Crop Planner',
    '/weather': 'Weather Watch',
    '/chat': 'AI Chat',
    '/pests': 'Pest Scanner',
    '/market': 'Market Board',
    '/profile': 'Profile'
};

const TopBar = () => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, setLanguagePreference } = useContext(AuthContext);

    const languageValue = normalizeLanguageCode(user?.languagePreference || i18n.language || 'en');
    const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase();
    const routeLabel = routeLabelMap[location.pathname] || 'KisanSetu';

    return (
        <div className="sticky top-0 z-30 px-2 pb-2 pt-3 sm:px-0">
            <GlassCard className="flex flex-wrap items-center justify-between gap-3 border-emerald-100/80 px-4 py-3.5 sm:flex-nowrap sm:px-5">
                <div className="min-w-0 flex-1">
                    <p className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700/75">
                        <Sparkles className="h-3.5 w-3.5" />
                        Smart Farming Assistant
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-[0_10px_18px_rgba(23,109,59,0.28)]">
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17 5.92L14.78 8.14A3.92 3.92 0 0 1 12 9.29c-1.12 0-2.2-.45-2.99-1.24L7.54 6.59C6.11 8.01 5.25 9.93 5.25 12c0 3.73 3.02 6.75 6.75 6.75S18.75 15.73 18.75 12c0-2.31-1.16-4.36-2.95-5.63l-.8 1.55zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-2.48 1.13-4.7 2.91-6.19l3.5 3.5c.42.42 1.09.42 1.5 0s.42-1.09 0-1.5l-3.5-3.5C9.9 4.13 10.92 4 12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-display text-lg font-semibold tracking-tight text-emerald-700 sm:text-xl">KisanSetu</h1>
                            <p className="truncate text-xs font-semibold text-slate-600">
                                {user ? `Hi ${user.name} - ${routeLabel}` : routeLabel}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white/85 px-3 py-2">
                        <Globe className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                        <label className="sr-only" htmlFor="language">{t('select_language') || 'Select Language'}</label>
                        <select
                            id="language"
                            value={languageValue}
                            onChange={(e) => setLanguagePreference?.(e.target.value)}
                            className="max-w-[96px] bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
                        >
                            {LANGUAGE_OPTIONS.map((lang) => (
                                <option key={lang.code} value={lang.code} className="bg-white text-slate-800">
                                    {lang.nativeLabel}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate('/profile')}
                        className="flex items-center justify-center rounded-2xl border border-emerald-200 bg-white/90 p-3 text-emerald-700 transition-colors hover:bg-emerald-50"
                        aria-label="Profile"
                    >
                        {userInitial ? <span className="text-sm font-extrabold">{userInitial}</span> : <UserRound className="h-5 w-5" />}
                    </button>
                </div>
            </GlassCard>
        </div>
    );
};

export default TopBar;
