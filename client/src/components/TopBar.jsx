import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, LogOut, UserRound } from 'lucide-react';
import { AuthContext } from '../context/auth-context';
import { LANGUAGE_OPTIONS, normalizeLanguageCode } from '../lib/languages';
import GlassCard from './GlassCard';

const TopBar = () => {
    const { t, i18n } = useTranslation();
    const { logout, user, setLanguagePreference } = useContext(AuthContext);

    const languageValue = normalizeLanguageCode(user?.languagePreference || i18n.language || 'en');
    const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase();

    return (
        <div className="sticky top-0 z-30 border-b border-green-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
            <GlassCard className="flex items-center justify-between gap-3 border-green-100 px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-600">
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17 5.92L14.78 8.14A3.92 3.92 0 0 1 12 9.29c-1.12 0-2.2-.45-2.99-1.24L7.54 6.59C6.11 8.01 5.25 9.93 5.25 12c0 3.73 3.02 6.75 6.75 6.75S18.75 15.73 18.75 12c0-2.31-1.16-4.36-2.95-5.63l-.8 1.55zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-2.48 1.13-4.7 2.91-6.19l3.5 3.5c.42.42 1.09.42 1.5 0s.42-1.09 0-1.5l-3.5-3.5C9.9 4.13 10.92 4 12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-display text-xl font-semibold tracking-tight text-green-600">KisanSetu</h1>
                            {user ? <p className="text-xs font-medium text-gray-600">Hi, {user.name}</p> : null}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600 transition-colors hover:bg-green-200"
                            aria-label="Profile"
                        >
                            {userInitial ? <span className="text-sm font-semibold">{userInitial}</span> : <UserRound className="h-5 w-5" />}
                        </button>

                        <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-3 py-2">
                            <Globe className="h-4 w-4 text-green-600" aria-hidden="true" />
                            <label className="sr-only" htmlFor="language">{t('select_language') || 'Select Language'}</label>
                            <select
                                id="language"
                                value={languageValue}
                                onChange={(e) => setLanguagePreference?.(e.target.value)}
                                className="max-w-[86px] bg-transparent text-xs font-semibold text-gray-700 focus:outline-none"
                            >
                                {LANGUAGE_OPTIONS.map((lang) => (
                                    <option key={lang.code} value={lang.code} className="bg-white text-gray-800">
                                        {lang.nativeLabel}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={logout}
                            className="flex items-center justify-center rounded-xl border border-green-200 bg-white p-3 text-green-600 transition-colors hover:bg-green-50"
                            aria-label="Logout"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};

export default TopBar;
