import React, { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Globe, LogOut } from 'lucide-react';
import { AuthContext } from '../context/auth-context';
import { LANGUAGE_OPTIONS, normalizeLanguageCode } from '../lib/languages';
import GlassCard from './GlassCard';

const TopBar = () => {
    const { t, i18n } = useTranslation();
    const { logout, user, setLanguagePreference } = useContext(AuthContext);

    const languageValue = normalizeLanguageCode(user?.languagePreference || i18n.language || 'en');
    const MotionDiv = motion.div;
    const MotionButton = motion.button;

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
        <div className="sticky top-0 z-30 px-3 pt-3">
            <GlassCard className="card-neuro px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <MotionDiv
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3"
                    >
                        <div className="soft-glow flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200/40 bg-gradient-to-br from-emerald-300/35 via-cyan-300/25 to-indigo-300/30 text-emerald-200">
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17 5.92L14.78 8.14A3.92 3.92 0 0 1 12 9.29c-1.12 0-2.2-.45-2.99-1.24L7.54 6.59C6.11 8.01 5.25 9.93 5.25 12c0 3.73 3.02 6.75 6.75 6.75S18.75 15.73 18.75 12c0-2.31-1.16-4.36-2.95-5.63l-.8 1.55zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-2.48 1.13-4.7 2.91-6.19l3.5 3.5c.42.42 1.09.42 1.5 0s.42-1.09 0-1.5l-3.5-3.5C9.9 4.13 10.92 4 12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-display text-xl font-semibold tracking-tight text-white">KisanSetu</h1>
                            {user ? <p className="text-xs font-medium text-slate-300">Hi, {user.name}</p> : null}
                        </div>
                    </MotionDiv>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                            <Globe className="h-4 w-4 text-slate-300" aria-hidden="true" />
                            <label className="sr-only" htmlFor="language">{t('select_language') || 'Select Language'}</label>
                            <select
                                id="language"
                                value={languageValue}
                                onChange={(e) => setLanguagePreference?.(e.target.value)}
                                className="max-w-[86px] bg-transparent text-xs font-semibold text-slate-200 focus:outline-none"
                            >
                                {LANGUAGE_OPTIONS.map((lang) => (
                                    <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                                        {lang.nativeLabel}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <MotionButton
                            onClick={logout}
                            whileTap={{ scale: 0.94 }}
                            whileHover={{ scale: 1.03 }}
                            className="flex items-center justify-center rounded-2xl border border-red-300/20 bg-red-400/15 p-3 text-red-200"
                            aria-label="Logout"
                        >
                            <LogOut className="h-5 w-5" />
                        </MotionButton>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};

export default TopBar;
