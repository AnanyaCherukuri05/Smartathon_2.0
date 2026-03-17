import React, { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, LogOut } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { LANGUAGE_OPTIONS, normalizeLanguageCode } from '../lib/languages';

const TopBar = () => {
    const { t, i18n } = useTranslation();
    const { logout, user, setLanguagePreference } = useContext(AuthContext);

    const languageValue = normalizeLanguageCode(user?.languagePreference || i18n.language || 'en');

    useEffect(() => {
        if (i18n.language !== languageValue) {
            i18n.changeLanguage(languageValue);
        }
    }, [i18n, languageValue]);



    return (
        <div className="flex items-center justify-between gap-3 p-4 bg-white shadow-sm z-10 sticky top-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Simple Leaf Icon as Logo */}
                <div className="w-10 h-10 rounded-full bg-brand-green-100 flex items-center justify-center text-brand-green-600">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17 5.92L14.78 8.14A3.92 3.92 0 0 1 12 9.29c-1.12 0-2.2-.45-2.99-1.24L7.54 6.59C6.11 8.01 5.25 9.93 5.25 12c0 3.73 3.02 6.75 6.75 6.75S18.75 15.73 18.75 12c0-2.31-1.16-4.36-2.95-5.63l-.8 1.55zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-2.48 1.13-4.7 2.91-6.19l3.5 3.5c.42.42 1.09.42 1.5 0s.42-1.09 0-1.5l-3.5-3.5C9.9 4.13 10.92 4 12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8z" />
                    </svg>
                </div>
                <h1 className="font-bold text-lg sm:text-xl text-slate-800 tracking-tight whitespace-nowrap truncate">KisanSetu</h1>
            </div>

            <div className="flex items-center gap-3 shrink-0">

                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-2 py-2 sm:px-3">
                    <Globe className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    <label className="sr-only" htmlFor="language">{t('select_language') || 'Select Language'}</label>
                    <select
                        id="language"
                        value={languageValue}
                        onChange={(e) => setLanguagePreference?.(e.target.value)}
                        className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none max-w-36 truncate"
                    >
                        {LANGUAGE_OPTIONS.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                                {lang.nativeLabel}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={logout}
                    className="flex items-center justify-center p-3 bg-red-50 text-red-600 rounded-2xl active:scale-95 transition-transform"
                    aria-label="Logout"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default TopBar;
