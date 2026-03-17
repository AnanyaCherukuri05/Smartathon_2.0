import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Image as ImageIcon, RefreshCw, ShieldCheck } from 'lucide-react';
import PestResultCard from '../components/PestResultCard';
import SectionHeader from '../components/SectionHeader';
import GlassCard from '../components/GlassCard';
import GradientButton from '../components/GradientButton';
import { apiFetch } from '../lib/apiClient';

const Pests = () => {
    const { t } = useTranslation();
    const [isScanning, setIsScanning] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState(null);

    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const stopCameraStream = () => {
        if (!streamRef.current) return;

        streamRef.current.getTracks().forEach((track) => {
            track.stop();
        });

        streamRef.current = null;
    };

    useEffect(() => {
        if (!isCameraOpen || !videoRef.current || !streamRef.current) return;

        const videoEl = videoRef.current;
        videoEl.srcObject = streamRef.current;

        videoEl.play().catch(() => {
            setCameraError('Camera preview could not start. Please try again.');
        });
    }, [isCameraOpen]);

    useEffect(() => {
        return () => {
            stopCameraStream();
        };
    }, []);

    const analyzeImage = async (file, inputEl = null) => {
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

            // Reset both hidden inputs so same image can be picked again if needed.
            if (inputEl) inputEl.value = '';
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (cameraInputRef.current) cameraInputRef.current.value = '';
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        analyzeImage(file, e.target);
    };

    const handleCameraCapture = (e) => {
        const file = e.target.files?.[0];
        analyzeImage(file, e.target);
    };

    const openLiveCamera = async () => {
        setError(null);
        setCameraError(null);

        if (!navigator?.mediaDevices?.getUserMedia) {
            if (cameraInputRef.current) {
                cameraInputRef.current.click();
            }
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } },
                audio: false
            });

            streamRef.current = stream;
            setIsCameraOpen(true);
        } catch (cameraAccessError) {
            console.error(cameraAccessError);
            setCameraError('Camera permission denied or unavailable. Falling back to device camera picker.');

            if (cameraInputRef.current) {
                cameraInputRef.current.click();
            }
        }
    };

    const closeLiveCamera = () => {
        setIsCameraOpen(false);
        setCameraError(null);
        stopCameraStream();
    };

    const captureLivePhoto = () => {
        if (!videoRef.current || !canvasRef.current) {
            setCameraError('Camera is not ready yet. Please wait a second and try again.');
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video.videoWidth || !video.videoHeight) {
            setCameraError('Unable to capture photo. Please retry.');
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (!blob) {
                setCameraError('Photo capture failed. Please try again.');
                return;
            }

            const capturedFile = new File([blob], `crop-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            closeLiveCamera();
            analyzeImage(capturedFile);
        }, 'image/jpeg', 0.9);
    };

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleTakePhotoClick = () => {
        openLiveCamera();
    };

    const handleReset = () => {
        setResult(null);
        setError(null);
        closeLiveCamera();
    };

    const diagnosisText = result?.data?.diagnosis || 'Analysis complete. Please review the advisory below.';

    return (
        <div className="page-reveal space-y-6 pb-10">
            <SectionHeader
                eyebrow="Crop Health Scanner"
                title={`${t('pests')} Detection`}
                subtitle="Take a photo or upload a clear crop image to detect disease patterns and get treatment guidance."
            />

            {!isScanning && !result && !isCameraOpen && (
                <GlassCard className="mt-8 border-emerald-200/80 p-8 text-center">
                    <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <Camera className="h-12 w-12" />
                    </div>
                    <h3 className="text-display mb-2 text-2xl font-semibold text-slate-800">Take a photo of your crop</h3>
                    <p className="mb-8 text-sm font-medium text-slate-600">For best results, capture leaves with good daylight and visible affected areas.</p>

                    <div className="mb-8 grid grid-cols-3 gap-3 text-left">
                        {['Leaf scan', 'Disease clue', 'Field ready'].map((item) => (
                            <div key={item} className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                                <div className="mb-2 h-16 rounded-xl bg-white" />
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">{item}</p>
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

                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={cameraInputRef}
                        onChange={handleCameraCapture}
                    />

                    <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
                        <GradientButton onClick={handleTakePhotoClick} className="flex items-center justify-center gap-2 py-3">
                            <Camera className="h-5 w-5" />
                            Take Photo
                        </GradientButton>

                        <button
                            type="button"
                            onClick={handleUploadClick}
                            className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white/90 px-5 py-3 font-semibold text-emerald-700 transition-all duration-200 hover:bg-emerald-50"
                        >
                            <ImageIcon className="h-5 w-5" />
                            Upload Photo
                        </button>
                    </div>

                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">
                        Tip: Hold camera steady and focus on affected leaf area.
                    </p>
                </GlassCard>
            )}

            {!isScanning && !result && isCameraOpen && (
                <GlassCard className="mt-8 border-emerald-200/80 p-5 sm:p-6">
                    <div className="rounded-2xl border border-emerald-200/70 bg-slate-900 p-2">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="h-72 w-full rounded-xl object-cover sm:h-80"
                        />
                    </div>

                    <canvas ref={canvasRef} className="hidden" />

                    <p className="mt-4 text-sm font-semibold text-slate-700">
                        Frame the affected leaf clearly and tap Capture Photo.
                    </p>

                    {cameraError ? (
                        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                            {cameraError}
                        </p>
                    ) : null}

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={closeLiveCamera}
                            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            Cancel
                        </button>

                        <GradientButton onClick={captureLivePhoto} className="flex items-center justify-center gap-2 py-3">
                            <Camera className="h-5 w-5" />
                            Capture Photo
                        </GradientButton>
                    </div>
                </GlassCard>
            )}

            {isScanning && (
                <GlassCard className="mt-8 border-emerald-100/80 p-8 text-center">
                    <div className="relative mx-auto mb-6 flex h-32 w-32 items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-100"></div>
                        <div className="absolute inset-0 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
                        <Camera className="h-12 w-12 text-emerald-700" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800">Scanning Image...</h3>
                    <p className="mt-2 text-sm font-medium text-slate-600">Analyzing leaf patterns and risk signatures</p>
                </GlassCard>
            )}

            {error && !isScanning && (
                <GlassCard className="rounded-2xl border-red-200 bg-red-50 p-4 text-center text-sm font-semibold text-red-700">
                    {error}
                </GlassCard>
            )}

            {result && (
                <div className="space-y-6">
                    <GlassCard className="border-emerald-100/80 p-6">
                        <div className="mb-4 grid grid-cols-3 gap-3">
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3" />
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3" />
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3" />
                        </div>
                        <div className="hidden">
                            <ShieldCheck className="h-28 w-28 text-emerald-200" />
                        </div>

                        <div className="mb-2 flex items-center gap-3">
                            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                                <ShieldCheck className="h-7 w-7" />
                            </div>
                            <h3 className="text-display text-2xl font-semibold text-slate-800">AI Diagnosis</h3>
                        </div>

                        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                            <p className="whitespace-pre-wrap text-base font-medium leading-relaxed text-slate-700">
                                {diagnosisText}
                            </p>
                        </div>
                    </GlassCard>

                    <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                        <PestResultCard result={result.data} />

                        <GradientButton
                            onClick={handleReset}
                            className="flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="h-5 w-5" />
                            Scan Another Crop
                        </GradientButton>
                    </div>
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
