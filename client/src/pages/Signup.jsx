import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sprout, Loader2, Globe, Sparkles, ShieldCheck, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/auth-context';
import { LANGUAGE_OPTIONS, normalizeLanguageCode } from '../lib/languages';
import GlassCard from '../components/GlassCard';
import GradientButton from '../components/GradientButton';
import { apiFetch } from '../lib/apiClient';

const Signup = () => {
    const { t, i18n } = useTranslation();
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
            const data = await apiFetch('/api/auth/register', {
                method: 'POST',
                body: { phone, name, languagePreference },
                auth: false
            });

            login(data.user, data.token);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
            <div className="ambient-orb -left-10 top-16 h-44 w-44 bg-emerald-200" />
            <div className="ambient-orb -right-10 bottom-10 h-44 w-44 bg-lime-200" />

            <div className="w-full max-w-md">
                <div className="mb-7 text-center">
                    <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-[0_16px_30px_rgba(22,113,66,0.3)]">
                        <Sprout className="h-11 w-11" />
                    </div>
                    <h1 className="text-display text-3xl font-semibold tracking-tight text-emerald-700">KisanSetu</h1>
                    <p className="mt-2 text-sm font-medium text-slate-600">{t('join_us') || 'Create your farmer account'}</p>
                </div>

                <GlassCard className="p-6 sm:p-8">
                    <div className="mb-6">
                        <h2 className="text-display text-2xl font-semibold text-slate-800">{t('signup') || 'Sign Up'}</h2>
                        <p className="mt-1 text-sm font-medium text-slate-600">Set language and profile once. Your dashboard is ready in seconds.</p>
                    </div>

                    <div className="mb-6 grid grid-cols-3 gap-2">
                        <div className="rounded-2xl border border-emerald-100 bg-white/85 px-2 py-2 text-center">
                            <Sparkles className="mx-auto mb-1 h-4 w-4 text-emerald-700" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-700">Smart</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-white/85 px-2 py-2 text-center">
                            <ShieldCheck className="mx-auto mb-1 h-4 w-4 text-emerald-700" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-700">Secure</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-white/85 px-2 py-2 text-center">
                            <Languages className="mx-auto mb-1 h-4 w-4 text-emerald-700" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-700">Local</p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-5">
                        <div>
                            <label htmlFor="signup-phone" className="mb-2 block text-sm font-semibold text-slate-700">
                                {t('phone') || 'Phone Number'}
                            </label>
                            <input
                                id="signup-phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                className="w-full rounded-2xl border border-emerald-200 bg-white/90 px-4 py-3 text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                                placeholder={t('phone') || 'Phone Number'}
                            />
                        </div>

                        <div>
                            <label htmlFor="signup-name" className="mb-2 block text-sm font-semibold text-slate-700">
                                {t('name') || 'Your Name'}
                            </label>
                            <input
                                id="signup-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full rounded-2xl border border-emerald-200 bg-white/90 px-4 py-3 text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                                placeholder={t('name') || 'Your Name'}
                            />
                        </div>

                        <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Globe className="h-4 w-4" /> {t('select_language') || 'Select Language'}
                            </label>
                            <select
                                value={languagePreference}
                                onChange={(e) => {
                                    setLanguagePreference(e.target.value);
                                    i18n.changeLanguage(e.target.value); // Preview instantly
                                }}
                                className="w-full appearance-none rounded-2xl border border-emerald-200 bg-white/90 p-4 text-lg font-semibold text-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                            >
                                {LANGUAGE_OPTIONS.map((lang) => (
                                    <option key={lang.code} value={lang.code} className="bg-white text-gray-800">
                                        {lang.nativeLabel} ({lang.label})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <GradientButton type="submit" disabled={loading || !phone || !name} className="mt-2 flex items-center justify-center">
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (t('signup_button') || 'Complete Setup')}
                        </GradientButton>
                    </form>

                    <div className="mt-8 text-center text-sm font-medium text-slate-600">
                        {t('have_account') || "Already have an account?"} <Link to="/login" className="font-semibold text-emerald-700 hover:underline">{t('login') || 'Log in'}</Link>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

export default Signup;
