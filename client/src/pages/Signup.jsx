import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sprout, Loader2, Globe } from 'lucide-react';
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
        <div className="flex min-h-screen items-center justify-center px-6 py-10">
            <div className="w-full max-w-sm">
                <div className="mb-7 flex flex-col items-center text-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-xl bg-green-100 text-green-600">
                        <Sprout className="h-11 w-11" />
                    </div>
                    <h1 className="text-display text-3xl font-semibold tracking-tight text-green-600">KisanSetu</h1>
                    <p className="text-sm font-medium text-gray-600">{t('join_us') || 'Create an account'}</p>
                </div>
                <GlassCard className="p-8">
                    <h2 className="mb-6 text-2xl font-semibold text-gray-800">{t('signup') || 'Sign Up'}</h2>

                    {error && (
                        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-5">
                        <div>
                            <label htmlFor="signup-phone" className="mb-2 block text-sm font-semibold text-gray-700">
                                {t('phone') || 'Phone Number'}
                            </label>
                            <input
                                id="signup-phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                className="w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-200"
                                placeholder={t('phone') || 'Phone Number'}
                            />
                        </div>

                        <div>
                            <label htmlFor="signup-name" className="mb-2 block text-sm font-semibold text-gray-700">
                                {t('name') || 'Your Name'}
                            </label>
                            <input
                                id="signup-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-200"
                                placeholder={t('name') || 'Your Name'}
                            />
                        </div>

                        <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-600">
                                <Globe className="h-4 w-4" /> {t('select_language') || 'Select Language'}
                            </label>
                            <select
                                value={languagePreference}
                                onChange={(e) => {
                                    setLanguagePreference(e.target.value);
                                    i18n.changeLanguage(e.target.value); // Preview instantly
                                }}
                                className="w-full appearance-none rounded-xl border border-green-200 bg-white p-4 text-lg font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-200"
                            >
                                {LANGUAGE_OPTIONS.map((lang) => (
                                    <option key={lang.code} value={lang.code} className="bg-white text-gray-800">
                                        {lang.nativeLabel} ({lang.label})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <GradientButton type="submit" disabled={loading || !phone || !name} className="mt-4 flex items-center justify-center">
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (t('signup_button') || 'Complete Setup')}
                        </GradientButton>
                    </form>

                    <div className="mt-8 text-center text-sm font-medium text-gray-600">
                        {t('have_account') || "Already have an account?"} <Link to="/login" className="font-semibold text-green-600 hover:underline">{t('login') || 'Log in'}</Link>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

export default Signup;
