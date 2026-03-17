import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sprout, Loader2, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { LANGUAGE_OPTIONS, normalizeLanguageCode } from '../lib/languages';

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
        <div className="min-h-screen bg-brand-green-50 flex flex-col justify-center items-center p-6 animate-in fade-in duration-500">
            <div className="mb-8 flex flex-col items-center">
                <div className="w-20 h-20 bg-brand-green-600 rounded-3xl flex items-center justify-center shadow-lg shadow-brand-green-600/30 mb-4 -rotate-3">
                    <Sprout className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">KisanSetu</h1>
                <p className="text-slate-600 font-medium">{t('join_us') || 'Create an account'}</p>
            </div>

            <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">{t('signup') || 'Sign Up'}</h2>

                {error && (
                    <div className="p-3 mb-6 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                        {error}
                    </div>
                )}

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
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Globe className="w-4 h-4" /> {t('select_language') || 'Select Language'}
                        </label>
                        <select
                            value={languagePreference}
                            onChange={(e) => {
                                setLanguagePreference(e.target.value);
                                i18n.changeLanguage(e.target.value); // Preview instantly
                            }}
                            className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-green-500 text-lg font-medium transition-all appearance-none"
                        >
                            {LANGUAGE_OPTIONS.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.nativeLabel} ({lang.label})
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !phone || !name}
                        className="w-full py-4 mt-4 rounded-2xl bg-brand-green-600 text-white font-bold text-lg shadow-lg shadow-brand-green-600/30 active:scale-95 disabled:opacity-50 transition-all flex justify-center items-center"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (t('signup_button') || 'Complete Setup')}
                    </button>
                </form>

                <div className="mt-8 text-center text-slate-600 font-medium">
                    {t('have_account') || "Already have an account?"} <Link to="/login" className="text-brand-green-600 font-bold hover:underline">{t('login') || 'Log in'}</Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;
