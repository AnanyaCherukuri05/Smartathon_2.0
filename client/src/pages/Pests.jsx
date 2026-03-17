import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Image as ImageIcon, ShieldCheck, RefreshCw } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import GradientButton from '../components/GradientButton';
import SectionHeader from '../components/SectionHeader';

const Pests = () => {
    const { t } = useTranslation();
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
        <div className="space-y-6 pb-10">
            <SectionHeader title={`${t('pests')} Detection`} subtitle="Upload a crop image for AI analysis" />

            {!isScanning && !result && (
                <GlassCard className="mt-8 border-dashed border-green-200 p-8 text-center">
                    <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-xl bg-green-100 text-green-600">
                        <Camera className="h-12 w-12" />
                    </div>
                    <h3 className="text-display mb-2 text-2xl font-semibold text-gray-800">Take a photo of your crop</h3>
                    <p className="mb-8 text-sm font-medium text-gray-600">To identify pests or diseases automatically</p>

                    <div className="mb-8 grid grid-cols-3 gap-3 text-left">
                        {['Leaf scan', 'Disease clue', 'Field ready'].map((item) => (
                            <div key={item} className="rounded-xl border border-green-100 bg-green-50 p-3">
                                <div className="mb-2 h-16 rounded-xl bg-white" />
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-600">{item}</p>
                            </div>
                        ))}
                    </div>

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
                        <div className="absolute inset-0 rounded-full border-4 border-green-100"></div>
                        <div className="absolute inset-0 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
                        <Camera className="h-12 w-12 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">Scanning Image...</h3>
                    <p className="mt-2 text-sm font-medium text-gray-600">Analyzing leaves for pests</p>
                </GlassCard>
            )}

            {error && !isScanning && (
                <GlassCard className="rounded-xl border-green-200 bg-green-50 p-4 text-center text-sm font-semibold text-green-700">
                    {error}
                </GlassCard>
            )}

            {result && (
                <div className="space-y-6">
                    <GlassCard className="p-6">
                        <div className="mb-4 grid grid-cols-3 gap-3">
                            <div className="rounded-xl border border-green-100 bg-green-50 p-3" />
                            <div className="rounded-xl border border-green-100 bg-green-50 p-3" />
                            <div className="rounded-xl border border-green-100 bg-green-50 p-3" />
                        </div>
                        <div className="hidden">
                            <ShieldCheck className="h-28 w-28 text-emerald-200" />
                        </div>

                        <div className="mb-2 flex items-center gap-3">
                            <div className="rounded-xl bg-green-100 p-3 text-green-600">
                                <ShieldCheck className="h-7 w-7" />
                            </div>
                            <h3 className="text-display text-2xl font-semibold text-gray-800">AI Diagnosis</h3>
                        </div>

                        <div className="mt-4 rounded-xl border border-green-100 bg-green-50 p-5">
                            <p className="whitespace-pre-wrap text-base font-medium leading-relaxed text-gray-700">
                                {result.analysis}
                            </p>
                        </div>
                    </GlassCard>

                    <GradientButton
                        onClick={handleReset}
                        className="flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="h-5 w-5" />
                        Scan Another Crop
                    </GradientButton>
                </div>
            )}

            {!isScanning && !result && !error && (
                <GlassCard className="p-4 text-center">
                    <p className="text-sm font-medium text-gray-600">No scans yet. Upload a photo to start diagnosis.</p>
                </GlassCard>
            )}

        </div>
    );
};

export default Pests;
