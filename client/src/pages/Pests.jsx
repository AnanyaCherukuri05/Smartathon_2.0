import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Image as ImageIcon, AlertTriangle, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import { normalizeLanguageCode } from '../lib/languages';

const Pests = () => {
    const { t, i18n } = useTranslation();
    const [isScanning, setIsScanning] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsScanning(true);
        setResult(null);
        setError(null);

        const formData = new FormData();
        formData.append('image', file);
        formData.append('lang', normalizeLanguageCode(i18n.language));

        try {
            const res = await fetch('http://localhost:5000/api/pests/detect', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to analyze image');

            setResult({
                status: 'analyzed',
                analysis: data.analysis
            });
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // reset input
        }
    };

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleReset = () => {
        setResult(null);
        setError(null);
    };

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-10">
            <h2 className="text-2xl font-bold text-slate-800">{t('pests_detection_title')}</h2>

            {!isScanning && !result && (
                <div className="flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-brand-green-200 rounded-3xl mt-12 shadow-sm min-h-[300px]">
                    <div className="w-24 h-24 bg-brand-green-50 rounded-full flex items-center justify-center mb-6 text-brand-green-600">
                        <Camera className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">{t('pests_take_photo_title')}</h3>
                    <p className="text-slate-500 text-center mb-8 font-medium">{t('pests_take_photo_subtitle')}</p>

                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                    <button
                        onClick={handleUploadClick}
                        className="w-full py-4 rounded-full bg-brand-green-600 text-white font-bold text-lg shadow-lg shadow-brand-green-600/30 active:scale-95 transition-transform flex justify-center items-center gap-2"
                    >
                        <ImageIcon className="w-6 h-6" />
                        {t('pests_upload_photo')}
                    </button>
                </div>
            )}

            {isScanning && (
                <GlassCard className="mt-8 p-8 text-center">
                    <div className="relative mx-auto mb-6 flex h-32 w-32 items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-200/20"></div>
                        <div className="absolute inset-0 animate-spin rounded-full border-4 border-emerald-300 border-t-transparent"></div>
                        <Camera className="h-12 w-12 animate-pulse text-emerald-200" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 animate-pulse">{t('pests_scanning_title')}</h3>
                    <p className="text-slate-500 mt-2 font-medium">{t('pests_scanning_subtitle')}</p>
                </div>
            )}

            {error && !isScanning && (
                <GlassCard className="rounded-2xl border-red-300/35 bg-red-400/10 p-4 text-center text-sm font-semibold text-red-200">
                    {error}
                </GlassCard>
            )}

            {result && (
                <MotionDiv
                    className="space-y-6"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <GlassCard className="relative overflow-hidden p-6">
                        <div className="absolute -right-8 -top-10 opacity-20">
                            <ShieldCheck className="h-28 w-28 text-emerald-200" />
                        </div>

                        <div className="flex flex-col gap-4 mb-2 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-brand-green-100 text-brand-green-600 rounded-2xl">
                                    <ShieldCheck className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-extrabold text-slate-800">{t('pests_ai_diagnosis')}</h3>
                            </div>
                            <h3 className="text-display text-2xl font-semibold text-white">AI Diagnosis</h3>
                        </div>

                        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/40 p-5">
                            <p className="whitespace-pre-wrap text-base font-medium leading-relaxed text-slate-100">
                                {result.analysis}
                            </p>
                        </div>
                    </GlassCard>

                    <GradientButton
                        onClick={handleReset}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-slate-600 to-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.45)]"
                    >
                        <RefreshCw className="w-5 h-5" />
                        {t('pests_scan_another')}
                    </button>
                </div>
            )}

        </div>
    );
};

export default Pests;
