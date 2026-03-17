import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Image as ImageIcon, AlertTriangle, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import PestResultCard from '../components/PestResultCard';

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
            if (!res.ok) {
                const detailMessage = data?.details ? `${data.error}: ${data.details}` : data?.error;
                throw new Error(detailMessage || 'Failed to analyze image');
            }

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
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-10">
            <h2 className="text-2xl font-bold text-slate-800">{t('pests')} Detection</h2>

            {!isScanning && !result && (
                <div className="flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-brand-green-200 rounded-3xl mt-12 shadow-sm min-h-[300px]">
                    <div className="w-24 h-24 bg-brand-green-50 rounded-full flex items-center justify-center mb-6 text-brand-green-600">
                        <Camera className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">Take a photo of your crop</h3>
                    <p className="text-slate-500 text-center mb-8 font-medium">To identify pests or diseases automatically</p>

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
                        Upload Photo
                    </button>
                </div>
            )}

            {isScanning && (
                <div className="flex flex-col items-center justify-center p-8 mt-12 min-h-[300px]">
                    <div className="relative w-32 h-32 flex items-center justify-center mb-6">
                        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-brand-green-500 rounded-full border-t-transparent animate-spin"></div>
                        <Camera className="w-12 h-12 text-brand-green-600 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 animate-pulse">Scanning Image...</h3>
                    <p className="text-slate-500 mt-2 font-medium">Analyzing leaves for pests</p>
                </div>
            )}

            {error && !isScanning && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl flex items-center justify-center font-bold">
                    {error}
                </div>
            )}

            {result && (
                <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                    <PestResultCard result={result.data} />

                    <button
                        onClick={handleReset}
                        className="w-full py-4 rounded-2xl bg-slate-100 text-slate-700 font-bold active:scale-95 transition-transform flex justify-center items-center gap-2"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Scan Another Leaf
                    </button>
                </div>
            )}

        </div>
    );
};

export default Pests;
