import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sprout, Loader2, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/auth-context';
import { LANGUAGE_OPTIONS, normalizeLanguageCode } from '../lib/languages';
import GlassCard from '../components/GlassCard';
import GradientButton from '../components/GradientButton';

const Signup = () => {
    const { t, i18n } = useTranslation();
    const MotionDiv = motion.div;
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [languagePreference, setLanguagePreference] = useState(normalizeLanguageCode(i18n.language || 'en'));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, name, languagePreference })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || t('signup_failed'));

            login(data.user, data.token);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />

            <MotionDiv
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm"
            >
                <div className="mb-7 flex flex-col items-center text-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-200/35 bg-gradient-to-br from-emerald-400/35 to-cyan-400/30 soft-glow">
                        <Sprout className="h-11 w-11 text-emerald-100" />
                    </div>
                    <h1 className="text-display text-3xl font-semibold tracking-tight text-white">KisanSetu</h1>
                    <p className="text-sm font-medium text-slate-300">{t('join_us') || 'Create an account'}</p>
                </div>
                <GlassCard className="card-neuro p-8">
                    <h2 className="mb-6 text-2xl font-semibold text-white">{t('signup') || 'Sign Up'}</h2>

                <form onSubmit={handleSignup} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">{t('phone') || 'Phone Number'}</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-green-500 text-lg transition-all"
                            placeholder={t('phone_placeholder_signup')}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">{t('name') || 'Your Name'}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-green-500 text-lg transition-all"
                            placeholder={t('name_placeholder_signup')}
                        />
                    </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-200">{t('name') || 'Your Name'}</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full rounded-2xl border border-white/15 bg-slate-900/55 p-4 text-lg text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
                                placeholder="Full name"
                            />
                        </div>

                        <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
                                <Globe className="h-4 w-4" /> {t('select_language') || 'Select Language'}
                            </label>
                            <select
                                value={languagePreference}
                                onChange={(e) => {
                                    setLanguagePreference(e.target.value);
                                    i18n.changeLanguage(e.target.value); // Preview instantly
                                }}
                                className="w-full appearance-none rounded-2xl border border-white/15 bg-slate-900/55 p-4 text-lg font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
                            >
                                {LANGUAGE_OPTIONS.map((lang) => (
                                    <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                                        {lang.nativeLabel} ({lang.label})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <GradientButton type="submit" disabled={loading || !phone || !name} className="mt-4 flex items-center justify-center">
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (t('signup_button') || 'Complete Setup')}
                        </GradientButton>
                    </form>

                    <div className="mt-8 text-center text-sm font-medium text-slate-300">
                        {t('have_account') || "Already have an account?"} <Link to="/login" className="font-semibold text-emerald-200 hover:underline">{t('login') || 'Log in'}</Link>
                    </div>
                </GlassCard>
            </MotionDiv>
        </div>
    );
};

export default Signup;
