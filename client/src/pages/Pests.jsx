import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Camera, Image as ImageIcon, AlertTriangle, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import PestResultCard from '../components/PestResultCard';
import SectionHeader from '../components/SectionHeader';
import GlassCard from '../components/GlassCard';
import GradientButton from '../components/GradientButton';
import { apiFetch } from '../lib/apiClient';

const Pests = () => {
    const { t } = useTranslation();
    const MotionDiv = motion.div;
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

        try {
            const data = await apiFetch('/api/pests/detect', {
                method: 'POST',
                body: formData,
                auth: false
            });

            setResult({
                status: 'analyzed',
                data: data
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
        <div className="space-y-6 pb-10">
            <SectionHeader title={`${t('pests')} Detection`} subtitle="Upload a crop image for AI analysis" />

            {!isScanning && !result && (
                <GlassCard className="card-neuro mt-8 border-dashed p-8 text-center">
                    <MotionDiv
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-emerald-200/35 bg-emerald-400/15 text-emerald-200"
                    >
                        <Camera className="h-12 w-12" />
                    </MotionDiv>
                    <h3 className="text-display mb-2 text-2xl font-semibold text-white">Take a photo of your crop</h3>
                    <p className="mb-8 text-sm font-medium text-slate-300">To identify pests or diseases automatically</p>

                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                    <GradientButton onClick={handleUploadClick} className="mx-auto flex max-w-xs items-center justify-center gap-2 py-3">
                        <ImageIcon className="h-5 w-5" />
                        Upload Photo
                    </GradientButton>
                </GlassCard>
            )}

            {isScanning && (
                <GlassCard className="mt-8 p-8 text-center">
                    <div className="relative mx-auto mb-6 flex h-32 w-32 items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-200/20"></div>
                        <div className="absolute inset-0 animate-spin rounded-full border-4 border-emerald-300 border-t-transparent"></div>
                        <Camera className="h-12 w-12 animate-pulse text-emerald-200" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">Scanning Image...</h3>
                    <p className="mt-2 text-sm font-medium text-slate-300">Analyzing leaves for pests</p>
                </GlassCard>
            )}

            {error && !isScanning && (
                <GlassCard className="rounded-2xl border-red-300/35 bg-red-400/10 p-4 text-center text-sm font-semibold text-red-200">
                    {error}
                </GlassCard>
            )}

            {result && (
                <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                    <PestResultCard result={result.data} />

                    <GradientButton
                        onClick={handleReset}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-slate-600 to-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.45)]"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Scan Another Leaf
                    </GradientButton>
                </div>
            )}

        </div>
    );
};

export default Pests;
