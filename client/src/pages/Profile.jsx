import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, UserRound } from 'lucide-react';
import { AuthContext } from '../context/auth-context';
import GlassCard from '../components/GlassCard';
import SectionHeader from '../components/SectionHeader';
import GradientButton from '../components/GradientButton';

const Profile = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);

    const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase();

    const handleLogout = () => {
        logout?.();
        navigate('/login', { replace: true });
    };

    return (
        <div className="page-reveal space-y-6 pb-10">
            <SectionHeader
                eyebrow={t('profile') || 'Profile'}
                title={user?.name ? user.name : (t('profile') || 'Profile')}
                subtitle={t('profile_subtitle') || 'Account details and settings.'}
            />

            <GlassCard className="border-emerald-100/80 p-6">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-100 bg-white/90 text-emerald-700">
                        {userInitial ? <span className="text-lg font-extrabold">{userInitial}</span> : <UserRound className="h-6 w-6" />}
                    </div>

                    <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-800">{user?.name || '—'}</p>
                        <p className="truncate text-sm font-semibold text-slate-600">{user?.phone || ''}</p>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3">
                    <div className="rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700/80">{t('select_language') || 'Language'}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">{user?.languagePreference || 'en'}</p>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="border-red-100 bg-white/90 p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">{t('logout') || 'Logout'}</p>
                <p className="mt-2 text-sm font-medium text-slate-700">
                    {t('logout_hint') || 'Sign out from this device.'}
                </p>

                <div className="mt-4">
                    <GradientButton
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 focus-visible:ring-red-200"
                    >
                        <LogOut className="h-5 w-5" />
                        {t('logout') || 'Logout'}
                    </GradientButton>
                </div>
            </GlassCard>
        </div>
    );
};

export default Profile;
