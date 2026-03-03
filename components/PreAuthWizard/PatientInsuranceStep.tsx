import React, { useState, useRef } from 'react';
import {
    PatientRecord, InsurancePolicyDetails, EntryPath, OCRResult
} from '../PreAuthWizard/types';
import { INSURER_LIST, INDIAN_STATES, TPA_NAMES } from '../../config/tpaRegistry';
import { calculateAge, isPolicyActive, isPolicyExpiringSoon, todayISO } from '../../utils/formatters';

interface PatientInsuranceStepProps {
    patient: Partial<PatientRecord>;
    insurance: Partial<InsurancePolicyDetails>;
    onPatientChange: (p: Partial<PatientRecord>) => void;
    onInsuranceChange: (ins: Partial<InsurancePolicyDetails>) => void;
    onNext: () => void;
}

export const PatientInsuranceStep: React.FC<PatientInsuranceStepProps> = ({
    patient, insurance, onPatientChange, onInsuranceChange, onNext
}) => {
    const [entryPath, setEntryPath] = useState<EntryPath | null>(insurance.policyNumber ? 'manual' : null);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrDone, setOcrDone] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [policyDateWarning, setPolicyDateWarning] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const handleDOBChange = (dob: string) => {
        onPatientChange({ ...patient, dateOfBirth: dob, age: calculateAge(dob) });
    };

    const handlePolicyEndDate = (date: string) => {
        onInsuranceChange({ ...insurance, policyEndDate: date });
        if (!isPolicyActive(date)) {
            setPolicyDateWarning('⚠️ This policy has expired. TPA will reject this pre-auth.');
        } else if (isPolicyExpiringSoon(date)) {
            setPolicyDateWarning('⚠️ Policy is expiring within 7 days. Verify renewal status.');
        } else {
            setPolicyDateWarning('');
        }
    };

    const handleImageUpload = async (file: File) => {
        setOcrLoading(true);
        // Simulate OCR parsing (in production, send to Gemini vision API via ocrService)
        await new Promise(r => setTimeout(r, 1500));
        // demo auto-fill
        onPatientChange({ ...patient, patientName: patient.patientName || 'Ramesh Patil', age: patient.age || 50, gender: patient.gender || 'Male' });
        onInsuranceChange({ ...insurance, dataSource: 'ocr', ocrConfidence: 0.87 });
        setOcrLoading(false);
        setOcrDone(true);
        setEntryPath('manual');
    };

    const isValid = !!(
        patient.patientName && patient.age && patient.gender && patient.mobileNumber && patient.city && patient.state &&
        insurance.insurerName && insurance.tpaName && insurance.policyNumber && insurance.sumInsured
    );

    if (!entryPath) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold text-white">Step 1: Patient & Insurance Details</h2>
                    <p className="text-gray-400 text-sm mt-1">How would you like to start?</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { path: 'scan_card' as EntryPath, icon: '📷', title: 'Scan Insurance Card', desc: 'Fastest — photograph the insurance card and auto-extract all details', badge: '⚡ Recommended' },
                        { path: 'manual' as EntryPath, icon: '✏️', title: 'Enter Manually', desc: 'Type patient & policy details by hand', badge: '' },
                        { path: 'search_existing' as EntryPath, icon: '🔍', title: 'Search Existing Patient', desc: 'Reuse previously created patient from Aivana database', badge: '' },
                    ].map(opt => (
                        <button key={opt.path} onClick={() => setEntryPath(opt.path)}
                            className="flex flex-col items-center gap-3 p-6 bg-gray-800 hover:bg-gray-700 border border-white/10 hover:border-blue-500/40 rounded-2xl text-center transition-all group">
                            <div className="text-4xl">{opt.icon}</div>
                            <div>
                                <div className="font-semibold text-white">{opt.title}</div>
                                <div className="text-xs text-gray-400 mt-1">{opt.desc}</div>
                                {opt.badge && <div className="mt-2 text-xs text-blue-400 font-semibold">{opt.badge}</div>}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (entryPath === 'scan_card' && !ocrDone) {
        return (
            <div className="space-y-6">
                <button onClick={() => setEntryPath(null)} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">← Back</button>
                <h2 className="text-xl font-bold text-white">Scan Insurance Card</h2>
                <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-blue-500/40 rounded-2xl p-16 text-center cursor-pointer hover:border-blue-400 transition-colors"
                >
                    {ocrLoading ? (
                        <div className="space-y-3">
                            <div className="text-4xl animate-pulse">🔍</div>
                            <div className="text-blue-300 font-semibold">Extracting details from card...</div>
                            <div className="text-gray-400 text-sm">AI is reading your insurance card</div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="text-5xl">📷</div>
                            <div className="text-white font-semibold">Drop card image here or click to upload</div>
                            <div className="text-gray-500 text-sm">JPG, PNG, HEIC, PDF (max 10MB)</div>
                        </div>
                    )}
                </div>
                <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
                    onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                <button onClick={() => setEntryPath('manual')} className="text-sm text-gray-500 hover:text-gray-300 underline">Skip OCR — enter manually instead</button>
            </div>
        );
    }

    // Full form (manual entry or after OCR)
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Step 1: Patient & Insurance Details</h2>
                    {ocrDone && <p className="text-green-400 text-xs mt-1">✅ Card scanned (87% confidence) — verify fields below</p>}
                </div>
                <button onClick={() => setEntryPath(null)} className="text-xs text-gray-500 hover:text-gray-300">Change entry method</button>
            </div>

            {/* Patient Demographics */}
            <div className="bg-gray-800/50 rounded-xl p-4 space-y-4">
                <h3 className="font-semibold text-blue-300 text-sm flex items-center gap-2">👤 Patient Demographics</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-xs text-gray-400 mb-1">Full Name *</label>
                        <input value={patient.patientName ?? ''} onChange={e => onPatientChange({ ...patient, patientName: e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" placeholder="As on insurance card" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Date of Birth</label>
                        <input type="date" value={patient.dateOfBirth ?? ''} onChange={e => handleDOBChange(e.target.value)}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Age *</label>
                        <input type="number" value={patient.age ?? ''} onChange={e => onPatientChange({ ...patient, age: +e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" placeholder="Years" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Gender *</label>
                        <select value={patient.gender ?? ''} onChange={e => onPatientChange({ ...patient, gender: e.target.value as any })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50">
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Marital Status</label>
                        <select value={patient.maritalStatus ?? ''} onChange={e => onPatientChange({ ...patient, maritalStatus: e.target.value as any })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50">
                            <option value="">Select</option>
                            <option>Single</option><option>Married</option><option>Widowed</option><option>Divorced</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Mobile Number *</label>
                        <input type="tel" value={patient.mobileNumber ?? ''} onChange={e => onPatientChange({ ...patient, mobileNumber: e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" placeholder="+91 XXXXX XXXXX" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Email</label>
                        <input type="email" value={patient.email ?? ''} onChange={e => onPatientChange({ ...patient, email: e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" placeholder="optional" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">City *</label>
                        <input value={patient.city ?? ''} onChange={e => onPatientChange({ ...patient, city: e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">State *</label>
                        <select value={patient.state ?? ''} onChange={e => onPatientChange({ ...patient, state: e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50">
                            <option value="">Select State</option>
                            {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">UHID (Hospital ID)</label>
                        <input value={patient.uhid ?? ''} onChange={e => onPatientChange({ ...patient, uhid: e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" placeholder="Optional" />
                    </div>
                </div>
            </div>

            {/* Insurance Details */}
            <div className="bg-gray-800/50 rounded-xl p-4 space-y-4">
                <h3 className="font-semibold text-blue-300 text-sm flex items-center gap-2">🛡️ Insurance & Policy Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Insurance Company *</label>
                        <datalist id="insurer-list">{INSURER_LIST.map(i => <option key={i} value={i} />)}</datalist>
                        <input list="insurer-list" value={insurance.insurerName ?? ''} onChange={e => onInsuranceChange({ ...insurance, insurerName: e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" placeholder="Start typing insurer name..." />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">TPA Name *</label>
                        <select value={insurance.tpaName ?? ''} onChange={e => onInsuranceChange({ ...insurance, tpaName: e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50">
                            <option value="">Select TPA</option>
                            {TPA_NAMES.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Policy Number *</label>
                        <input value={insurance.policyNumber ?? ''} onChange={e => onInsuranceChange({ ...insurance, policyNumber: e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">TPA ID Card Number</label>
                        <input value={insurance.tpaIdCardNumber ?? ''} onChange={e => onInsuranceChange({ ...insurance, tpaIdCardNumber: e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Policy Type</label>
                        <select value={insurance.policyType ?? 'Individual'} onChange={e => onInsuranceChange({ ...insurance, policyType: e.target.value as any })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50">
                            <option>Individual</option><option>Floater</option><option>Corporate</option><option>Group</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Sum Insured (₹) *</label>
                        <input type="number" value={insurance.sumInsured ?? ''} onChange={e => onInsuranceChange({ ...insurance, sumInsured: +e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" placeholder="e.g. 500000" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Policy Start Date</label>
                        <input type="date" value={insurance.policyStartDate ?? ''} onChange={e => onInsuranceChange({ ...insurance, policyStartDate: e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Policy End Date</label>
                        <input type="date" value={insurance.policyEndDate ?? ''} onChange={e => handlePolicyEndDate(e.target.value)}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                        {policyDateWarning && <p className="text-amber-400 text-xs mt-1">{policyDateWarning}</p>}
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Proposer Name</label>
                        <input value={insurance.proposerName ?? ''} onChange={e => onInsuranceChange({ ...insurance, proposerName: e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" placeholder="Defaults to patient name" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Relationship with Proposer</label>
                        <select value={insurance.relationshipWithProposer ?? 'Self'} onChange={e => onInsuranceChange({ ...insurance, relationshipWithProposer: e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50">
                            <option>Self</option><option>Spouse</option><option>Son</option><option>Daughter</option><option>Father</option><option>Mother</option><option>Other</option>
                        </select>
                    </div>
                </div>
            </div>

            <button onClick={onNext} disabled={!isValid}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${isValid ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                Continue to Clinical Details →
            </button>
            {!isValid && <p className="text-xs text-amber-400 text-center">Fill all required (*) fields to continue</p>}
        </div>
    );
};
