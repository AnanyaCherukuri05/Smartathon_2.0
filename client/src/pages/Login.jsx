import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sprout, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/auth-context';
import GlassCard from '../components/GlassCard';
import GradientButton from '../components/GradientButton';

const Login = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, name })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');

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
                    <p className="text-sm font-medium text-gray-600">{t('welcome_back') || 'Welcome back, farmer!'}</p>
                </div>
                <GlassCard className="p-8">
                    <h2 className="mb-6 text-2xl font-semibold text-gray-800">{t('login') || 'Login'}</h2>

                    {error && (
                        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label htmlFor="login-phone" className="mb-2 block text-sm font-semibold text-gray-700">
                                {t('phone') || 'Phone Number'}
                            </label>
                            <input
                                id="login-phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                className="w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-200"
                                placeholder={t('phone') || 'Phone Number'}
                            />
                        </div>

                        <div>
                            <label htmlFor="login-name" className="mb-2 block text-sm font-semibold text-gray-700">
                                {t('name') || 'Your Name'}
                            </label>
                            <input
                                id="login-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-200"
                                placeholder={t('name') || 'Your Name'}
                            />
                        </div>

                        <GradientButton type="submit" disabled={loading || !phone} className="mt-4 flex items-center justify-center">
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (t('login_button') || 'Login')}
                        </GradientButton>
                    </form>

                    <div className="mt-8 text-center text-sm font-medium text-gray-600">
                        {t('no_account') || "Don't have an account?"} <Link to="/signup" className="font-semibold text-green-600 hover:underline">{t('signup') || 'Sign up'}</Link>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

export default Login;
