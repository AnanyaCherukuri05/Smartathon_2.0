import React, { useState } from 'react';
import {
    AlertTriangle,
    Droplet,
    Leaf,
    Shield,
    ChevronDown,
    ChevronUp,
    Zap,
    AlertCircle,
    Clock,
    Pill,
    Users,
    Wind,
    Flame
} from 'lucide-react';

const PestResultCard = ({ result }) => {
    const [expandedSections, setExpandedSections] = useState({
        symptoms: false,
        pesticides: false,
        fertilizers: false,
        precautions: false,
        safety: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    if (!result) return null;

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'High': return 'bg-red-100 border-red-300 text-red-700';
            case 'Medium': return 'bg-yellow-100 border-yellow-300 text-yellow-700';
            case 'Low': return 'bg-green-100 border-green-300 text-green-700';
            default: return 'bg-gray-100 border-gray-300 text-gray-700';
        }
    };

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'High':
                return <Flame className="w-5 h-5" />;
            case 'Medium':
                return <AlertCircle className="w-5 h-5" />;
            case 'Low':
                return <Leaf className="w-5 h-5" />;
            default:
                return <AlertTriangle className="w-5 h-5" />;
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            {result.warning && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4">
                    <p className="text-amber-800 font-bold">
                        {result.source === 'fallback'
                            ? 'AI service is temporarily unavailable. Showing preventive advisory mode.'
                            : 'Exact disease treatment match not found. Showing preventive advisory mode.'}
                    </p>
                    <p className="text-amber-700 text-sm mt-1 break-words">Reason: {result.warning}</p>
                </div>
            )}

            {/* AI Diagnosis */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-3xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-blue-200 text-blue-600 rounded-xl">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">AI Diagnosis</h3>
                </div>
                <div className="bg-white rounded-xl p-4 text-slate-700 whitespace-pre-wrap text-base leading-relaxed">
                    {result.diagnosis}
                </div>
            </div>

            {/* Pest Information Card */}
            {result.pestDetails && (
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-3xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-200 text-purple-600 rounded-xl">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{result.pestDetails.scientificName || result.identifiedPest}</h3>
                                <p className="text-sm text-slate-600 font-medium">{result.pestDetails.description}</p>
                            </div>
                        </div>
                        <div className={`px-4 py-2 rounded-full border-2 font-bold flex items-center gap-2 ${getSeverityColor(result.pestDetails.severity)}`}>
                            {getSeverityIcon(result.pestDetails.severity)}
                            {result.pestDetails.severity} Severity
                        </div>
                    </div>

                    {/* Symptoms Section */}
                    <div className="mt-4">
                        <button
                            onClick={() => toggleSection('symptoms')}
                            className="w-full flex items-center justify-between bg-white rounded-xl p-4 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-2 font-bold text-slate-700">
                                <Leaf className="w-5 h-5 text-purple-600" />
                                Key Symptoms
                            </div>
                            {expandedSections.symptoms ? (
                                <ChevronUp className="w-5 h-5" />
                            ) : (
                                <ChevronDown className="w-5 h-5" />
                            )}
                        </button>

                        {expandedSections.symptoms && (
                            <div className="bg-white rounded-xl p-4 mt-2 space-y-2">
                                {result.pestDetails.symptoms?.map((symptom, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <div className="w-2 h-2 rounded-full bg-purple-600 mt-2 flex-shrink-0"></div>
                                        <span className="text-slate-700">{symptom}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {result.treatment && (
                <>
                    {/* Pesticides Section */}
                    {result.treatment.pesticides && result.treatment.pesticides.length > 0 && (
                        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-3xl overflow-hidden shadow-lg">
                            <button
                                onClick={() => toggleSection('pesticides')}
                                className="w-full flex items-center justify-between bg-red-600 text-white px-6 py-4 hover:bg-red-700 transition-colors"
                            >
                                <div className="flex items-center gap-3 font-bold text-lg">
                                    <Droplet className="w-6 h-6" />
                                    Recommended Pesticides ({result.treatment.pesticides.length})
                                </div>
                                {expandedSections.pesticides ? (
                                    <ChevronUp className="w-6 h-6" />
                                ) : (
                                    <ChevronDown className="w-6 h-6" />
                                )}
                            </button>

                            {expandedSections.pesticides && (
                                <div className="p-6 space-y-4">
                                    {result.treatment.pesticides.map((pesticide, idx) => (
                                        <div key={idx} className="bg-white rounded-2xl p-5 border-2 border-red-100">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h4 className="text-lg font-bold text-slate-800">{pesticide.name}</h4>
                                                    <p className="text-sm text-slate-600">{pesticide.activeIngredient}</p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${pesticide.type === 'Organic'
                                                    ? 'bg-green-100 text-green-700'
                                                    : pesticide.type === 'Biological'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {pesticide.type}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3">
                                                    <p className="text-xs text-slate-600 font-medium mb-1">📏 Dosage</p>
                                                    <p className="font-bold text-slate-800">{pesticide.dosage.quantity} {pesticide.dosage.unit}</p>
                                                </div>
                                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3">
                                                    <p className="text-xs text-slate-600 font-medium mb-1">⏱️ Interval</p>
                                                    <p className="font-bold text-slate-800">{pesticide.sprayInterval}</p>
                                                </div>
                                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3">
                                                    <p className="text-xs text-slate-600 font-medium mb-1">✅ Effectiveness</p>
                                                    <p className="font-bold text-slate-800">{pesticide.efficiency}%</p>
                                                </div>
                                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3">
                                                    <p className="text-xs text-slate-600 font-medium mb-1">💰 Cost</p>
                                                    <p className="font-bold text-slate-800">₹{pesticide.cost}/L</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2 border-t pt-3">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 mb-1">🌱 Application Method:</p>
                                                    <p className="text-sm text-slate-600">{pesticide.applicationMethod}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 mb-1">⏰ When to Apply:</p>
                                                    <p className="text-sm text-slate-600">{pesticide.timingDaysSinceInfestation}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 mb-1">🏪 Available Brands:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {pesticide.marketBrand?.map((brand, i) => (
                                                            <span key={i} className="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full">
                                                                {brand}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Fertilizers Section */}
                    {result.treatment.fertilizers && result.treatment.fertilizers.length > 0 && (
                        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-3xl overflow-hidden shadow-lg">
                            <button
                                onClick={() => toggleSection('fertilizers')}
                                className="w-full flex items-center justify-between bg-green-600 text-white px-6 py-4 hover:bg-green-700 transition-colors"
                            >
                                <div className="flex items-center gap-3 font-bold text-lg">
                                    <Leaf className="w-6 h-6" />
                                    Recommended Fertilizers ({result.treatment.fertilizers.length})
                                </div>
                                {expandedSections.fertilizers ? (
                                    <ChevronUp className="w-6 h-6" />
                                ) : (
                                    <ChevronDown className="w-6 h-6" />
                                )}
                            </button>

                            {expandedSections.fertilizers && (
                                <div className="p-6 space-y-4">
                                    {result.treatment.fertilizers.map((fertilizer, idx) => (
                                        <div key={idx} className="bg-white rounded-2xl p-5 border-2 border-green-100">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h4 className="text-lg font-bold text-slate-800">{fertilizer.name}</h4>
                                                    <p className="text-sm text-slate-600">{fertilizer.type}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3">
                                                    <p className="text-xs text-slate-600 font-medium mb-1">📏 Dosage</p>
                                                    <p className="font-bold text-slate-800">{fertilizer.dosage.quantity} {fertilizer.dosage.unit}</p>
                                                </div>
                                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3">
                                                    <p className="text-xs text-slate-600 font-medium mb-1">🔄 Application</p>
                                                    <p className="font-bold text-slate-800">{fertilizer.applicationMethod}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2 border-t pt-3">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 mb-1">⏰ When to Apply:</p>
                                                    <p className="text-sm text-slate-600">{fertilizer.timing}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 mb-1">✨ Benefits:</p>
                                                    <ul className="space-y-1">
                                                        {fertilizer.benefits?.map((benefit, i) => (
                                                            <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                                                <span className="text-green-600 font-bold">✓</span>
                                                                {benefit}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Safety & Precautions Section */}
                    {result.treatment.precautions && (
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-3xl overflow-hidden shadow-lg">
                            <button
                                onClick={() => toggleSection('precautions')}
                                className="w-full flex items-center justify-between bg-amber-600 text-white px-6 py-4 hover:bg-amber-700 transition-colors"
                            >
                                <div className="flex items-center gap-3 font-bold text-lg">
                                    <Shield className="w-6 h-6" />
                                    ⚠️ Safety Instructions & Precautions
                                </div>
                                {expandedSections.precautions ? (
                                    <ChevronUp className="w-6 h-6" />
                                ) : (
                                    <ChevronDown className="w-6 h-6" />
                                )}
                            </button>

                            {expandedSections.precautions && (
                                <div className="p-6 space-y-4">
                                    {/* Personal Protective Equipment */}
                                    <div className="bg-white rounded-2xl p-4 border-2 border-amber-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Users className="w-5 h-5 text-amber-600" />
                                            <h4 className="font-bold text-slate-800">Personal Protective Equipment (PPE)</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {result.treatment.precautions.personalProtectiveEquipment?.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-2 bg-amber-50 p-2 rounded-lg">
                                                    <span className="text-amber-600 font-bold">✓</span>
                                                    <span className="text-sm text-slate-700 font-medium">{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Toxicity Level */}
                                    <div className="bg-white rounded-2xl p-4 border-2 border-amber-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <AlertTriangle className="w-5 h-5 text-red-600" />
                                            <h4 className="font-bold text-slate-800">Toxicity Level</h4>
                                        </div>
                                        <p className={`text-lg font-bold py-2 px-4 rounded-xl ${result.treatment.precautions.toxicityLevel === 'High'
                                            ? 'bg-red-100 text-red-700'
                                            : result.treatment.precautions.toxicityLevel === 'Medium'
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : 'bg-green-100 text-green-700'
                                            }`}>
                                            {result.treatment.precautions.toxicityLevel}
                                        </p>
                                    </div>

                                    {/* Storage Instructions */}
                                    <div className="bg-white rounded-2xl p-4 border-2 border-amber-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Pill className="w-5 h-5 text-blue-600" />
                                            <h4 className="font-bold text-slate-800">Storage Instructions</h4>
                                        </div>
                                        <p className="text-slate-700">{result.treatment.precautions.storageInstructions}</p>
                                    </div>

                                    {/* Waiting Period */}
                                    <div className="bg-white rounded-2xl p-4 border-2 border-amber-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Clock className="w-5 h-5 text-purple-600" />
                                            <h4 className="font-bold text-slate-800">Waiting Period Before Harvest</h4>
                                        </div>
                                        <p className="text-lg font-bold text-purple-700">{result.treatment.precautions.waitingPeriodDays} days</p>
                                        <p className="text-sm text-slate-600 mt-2">Do not harvest before this period ends after the last application.</p>
                                    </div>

                                    {/* Environmental Cautions */}
                                    {result.treatment.precautions.environmentalCautions && (
                                        <div className="bg-white rounded-2xl p-4 border-2 border-amber-100">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Wind className="w-5 h-5 text-green-600" />
                                                <h4 className="font-bold text-slate-800">Environmental Cautions</h4>
                                            </div>
                                            <ul className="space-y-2">
                                                {result.treatment.precautions.environmentalCautions.map((caution, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-slate-700 text-sm">
                                                        <span className="text-green-600 font-bold">⚡</span>
                                                        {caution}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Poisoning Symptoms & First Aid */}
                                    {result.treatment.precautions.poisoningSymptoms && (
                                        <div className="bg-white rounded-2xl p-4 border-2 border-red-200 bg-red-50">
                                            <div className="flex items-center gap-2 mb-3">
                                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                                <h4 className="font-bold text-red-700">⛔ Poisoning Symptoms</h4>
                                            </div>
                                            <ul className="space-y-1 mb-4">
                                                {result.treatment.precautions.poisoningSymptoms.map((symptom, idx) => (
                                                    <li key={idx} className="text-red-700 text-sm flex items-start gap-2">
                                                        <span className="font-bold">•</span>
                                                        {symptom}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* First Aid Measures */}
                                    <div className="bg-white rounded-2xl p-4 border-2 border-green-200 bg-green-50">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap className="w-5 h-5 text-green-600" />
                                            <h4 className="font-bold text-green-700">🆘 First Aid Measures</h4>
                                        </div>
                                        <p className="text-green-700 text-sm leading-relaxed">{result.treatment.precautions.firstAidMeasures}</p>
                                    </div>

                                    {/* What NOT to Mix */}
                                    {result.treatment.precautions.notToMixWith && result.treatment.precautions.notToMixWith.length > 0 && (
                                        <div className="bg-white rounded-2xl p-4 border-2 border-orange-200 bg-orange-50">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Flame className="w-5 h-5 text-orange-600" />
                                                <h4 className="font-bold text-orange-700">⛔ Do NOT Mix With</h4>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {result.treatment.precautions.notToMixWith.map((item, idx) => (
                                                    <span key={idx} className="bg-orange-200 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                                                        ✗ {item}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Treatment Summary */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-300 rounded-3xl p-6 shadow-lg">
                        <h4 className="text-lg font-bold text-slate-800 mb-4">📋 Treatment Summary</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl p-4 border-2 border-slate-200">
                                <p className="text-xs text-slate-600 font-medium mb-1">⏱️ Duration</p>
                                <p className="font-bold text-slate-800">{result.treatment.duration}</p>
                            </div>
                            <div className="bg-white rounded-2xl p-4 border-2 border-slate-200">
                                <p className="text-xs text-slate-600 font-medium mb-1">✅ Effectiveness</p>
                                <p className="font-bold text-slate-800">{result.treatment.effectiveness}%</p>
                            </div>
                            <div className="bg-white rounded-2xl p-4 border-2 border-slate-200">
                                <p className="text-xs text-slate-600 font-medium mb-1">🌾 Disease Stage</p>
                                <p className="font-bold text-slate-800">{result.treatment.diseaseStage}</p>
                            </div>
                            <div className="bg-white rounded-2xl p-4 border-2 border-slate-200">
                                <p className="text-xs text-slate-600 font-medium mb-1">💰 Cost/Hectare</p>
                                <p className="font-bold text-slate-800">₹{result.treatment.costPerHectare}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PestResultCard;
