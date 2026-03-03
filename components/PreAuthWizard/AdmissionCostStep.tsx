import React, { useState, useEffect } from 'react';
import { AdmissionDetails, CostEstimate, ClinicalDetails, RoomCategory, PastMedicalHistory } from '../PreAuthWizard/types';
import { getRateForCategory, getLOSForDiagnosis } from '../../config/rateCard';
import { calculateTotals, formatCostDisplay } from '../../utils/costCalculator';
import { todayISO, nowTimeString } from '../../utils/formatters';

interface AdmissionCostStepProps {
    admission: Partial<AdmissionDetails>;
    cost: Partial<CostEstimate>;
    clinical: Partial<ClinicalDetails>;
    sumInsured: number;
    onAdmissionChange: (a: Partial<AdmissionDetails>) => void;
    onCostChange: (c: CostEstimate) => void;
    onNext: () => void;
    onBack: () => void;
}

const ROOM_CATEGORIES: RoomCategory[] = ['General Ward', 'Semi-Private', 'Private', 'Deluxe', 'ICU', 'ICCU', 'NICU', 'HDU'];

const PAST_CONDITIONS = [
    ['diabetes', 'Diabetes'],
    ['hypertension', 'Hypertension'],
    ['heartDisease', 'Heart Disease'],
    ['asthma', 'Asthma / COPD'],
    ['epilepsy', 'Epilepsy'],
    ['cancer', 'Cancer'],
    ['kidney', 'Kidney Disease'],
    ['liver', 'Liver Disease'],
    ['hiv', 'HIV'],
    ['alcoholism', 'Alcoholism'],
    ['smoking', 'Smoking'],
] as const;

const DEFAULT_PMH: PastMedicalHistory = {
    diabetes: { present: false }, hypertension: { present: false }, heartDisease: { present: false },
    asthma: { present: false }, epilepsy: { present: false }, cancer: { present: false },
    kidney: { present: false }, liver: { present: false }, hiv: { present: false },
    alcoholism: { present: false }, smoking: { present: false },
    anyOther: { present: false },
};

export const AdmissionCostStep: React.FC<AdmissionCostStepProps> = ({
    admission, cost, clinical, sumInsured, onAdmissionChange, onCostChange, onNext, onBack
}) => {
    const pmh = admission.pastMedicalHistory ?? DEFAULT_PMH;

    const updateField = (partial: Partial<AdmissionDetails>) => onAdmissionChange({ ...admission, ...partial });

    const updateCost = (partial: Partial<CostEstimate>) => {
        const merged = { ...cost, ...partial };
        onCostChange(calculateTotals(merged, sumInsured));
    };

    useEffect(() => {
        // Smart LOS suggestion from diagnosis
        const dx = clinical?.diagnoses?.[clinical.selectedDiagnosisIndex ?? 0];
        if (dx && !admission.expectedDaysInRoom) {
            const los = getLOSForDiagnosis(dx.icd10Code || dx.diagnosis);
            updateField({
                expectedDaysInRoom: los.wardDays,
                expectedDaysInICU: los.icuDays,
                expectedLengthOfStay: los.wardDays + los.icuDays,
                roomCategory: admission.roomCategory ?? (los.icuDays > 0 ? 'ICU' : 'General Ward'),
                dateOfAdmission: admission.dateOfAdmission || todayISO(),
                timeOfAdmission: admission.timeOfAdmission || nowTimeString(),
                admissionType: admission.admissionType ?? 'Emergency',
            });
            const rateInfo = getRateForCategory(los.icuDays > 0 ? 'ICU' : 'General Ward');
            updateCost({
                roomRentPerDay: rateInfo.roomRentPerDay,
                nursingChargesPerDay: rateInfo.nursingChargesPerDay,
                icuChargesPerDay: rateInfo.icuChargesPerDay,
                expectedRoomDays: los.wardDays,
                expectedIcuDays: los.icuDays,
                investigationsEstimate: 8000,
                medicinesEstimate: 15000,
                consumablesEstimate: 6000,
            });
        }
    }, []);

    const handleRoomCategory = (cat: RoomCategory) => {
        const rate = getRateForCategory(cat);
        updateField({ roomCategory: cat });
        updateCost({
            roomRentPerDay: rate.roomRentPerDay,
            nursingChargesPerDay: rate.nursingChargesPerDay,
            icuChargesPerDay: rate.icuChargesPerDay,
            expectedRoomDays: cost.expectedRoomDays ?? rate.defaultStayDays,
        });
    };

    const totals = calculateTotals(cost, sumInsured);

    const isValid = !!(admission.admissionType && admission.dateOfAdmission && admission.roomCategory && totals.totalEstimatedCost > 0);

    return (
        <div className="space-y-5">
            <h2 className="text-xl font-bold text-white">Step 3: Admission & Cost Estimation</h2>

            {/* Admission Details */}
            <div className="bg-gray-800/50 rounded-xl p-4 space-y-4">
                <h3 className="font-semibold text-blue-300 text-sm">🏥 Admission Details</h3>
                <div className="flex gap-4">
                    {['Emergency', 'Planned'].map(type => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="admType" value={type}
                                checked={admission.admissionType === type}
                                onChange={() => updateField({ admissionType: type as any })} className="accent-blue-500" />
                            <span className="text-sm text-gray-200">{type}</span>
                        </label>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Date of Admission *</label>
                        <input type="date" value={admission.dateOfAdmission ?? ''} onChange={e => updateField({ dateOfAdmission: e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Time of Admission</label>
                        <input type="time" value={admission.timeOfAdmission ?? ''} onChange={e => updateField({ timeOfAdmission: e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-2">Room Category</label>
                    <div className="flex flex-wrap gap-2">
                        {ROOM_CATEGORIES.map(cat => (
                            <button key={cat} onClick={() => handleRoomCategory(cat)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${admission.roomCategory === cat ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-white/10 text-gray-400 hover:text-white'}`}>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Ward Days</label>
                        <input type="number" value={admission.expectedDaysInRoom ?? ''} onChange={e => { updateField({ expectedDaysInRoom: +e.target.value, expectedLengthOfStay: (+e.target.value) + (admission.expectedDaysInICU ?? 0) }); updateCost({ expectedRoomDays: +e.target.value }); }}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" min={0} />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">ICU Days</label>
                        <input type="number" value={admission.expectedDaysInICU ?? ''} onChange={e => { updateField({ expectedDaysInICU: +e.target.value, expectedLengthOfStay: (+e.target.value) + (admission.expectedDaysInRoom ?? 0) }); updateCost({ expectedIcuDays: +e.target.value }); }}
                            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" min={0} />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Total Stay</label>
                        <input readOnly value={`${(admission.expectedLengthOfStay ?? 0)} days`}
                            className="w-full bg-gray-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-400" />
                    </div>
                </div>
            </div>

            {/* Past Medical History */}
            <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-blue-300 text-sm">📋 Past Medical History</h3>
                <div className="grid grid-cols-2 gap-2.5">
                    {PAST_CONDITIONS.map(([key, label]) => (
                        <div key={key} className="flex items-center gap-3">
                            <input type="checkbox"
                                checked={pmh[key]?.present ?? false}
                                onChange={e => onAdmissionChange({ ...admission, pastMedicalHistory: { ...pmh, [key]: { ...pmh[key], present: e.target.checked } } })}
                                className="accent-blue-500 w-4 h-4" />
                            <span className="text-sm text-gray-300 flex-1">{label}</span>
                            {pmh[key]?.present && (
                                <input value={pmh[key]?.duration ?? ''} placeholder="Since..."
                                    onChange={e => onAdmissionChange({ ...admission, pastMedicalHistory: { ...pmh, [key]: { ...pmh[key], duration: e.target.value } } })}
                                    className="w-20 bg-gray-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none" />
                            )}
                        </div>
                    ))}
                </div>
                <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={admission.previousHospitalization?.wasHospitalizedBefore ?? false}
                            onChange={e => updateField({ previousHospitalization: { wasHospitalizedBefore: e.target.checked } })} className="accent-blue-500" />
                        <span className="text-sm text-gray-300">Previously hospitalized?</span>
                    </label>
                    {admission.previousHospitalization?.wasHospitalizedBefore && (
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <input value={admission.previousHospitalization?.details ?? ''} placeholder="Details..."
                                onChange={e => updateField({ previousHospitalization: { ...admission.previousHospitalization as any, details: e.target.value } })}
                                className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                            <input type="date" value={admission.previousHospitalization?.dateOfLastHospitalization ?? ''}
                                onChange={e => updateField({ previousHospitalization: { ...admission.previousHospitalization as any, dateOfLastHospitalization: e.target.value } })}
                                className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                        </div>
                    )}
                </div>
            </div>

            {/* Cost Estimation */}
            <div className="bg-gray-800/50 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-blue-300 text-sm">💰 Estimated Cost Break-up</h3>
                    <span className="text-xs text-gray-500">Defaults from rate card — adjust as needed</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-gray-500 border-b border-white/10">
                                <th className="text-left py-1.5 pr-3">Cost Head</th>
                                <th className="text-right pr-3">Rate</th>
                                <th className="text-right pr-3">Qty / Days</th>
                                <th className="text-right">Total (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            <tr><td className="py-2 text-gray-300">Room Rent</td>
                                <td className="text-right pr-3"><input type="number" value={cost.roomRentPerDay ?? 0} onChange={e => updateCost({ roomRentPerDay: +e.target.value })} className="w-24 bg-gray-900 border border-white/10 rounded px-2 py-1 text-xs text-right text-white focus:outline-none" /></td>
                                <td className="text-right pr-3 text-gray-400">{admission.expectedDaysInRoom ?? 0} days</td>
                                <td className="text-right font-medium">{formatCostDisplay(totals.totalRoomCharges)}</td></tr>
                            <tr><td className="py-2 text-gray-300">Nursing Charges</td>
                                <td className="text-right pr-3"><input type="number" value={cost.nursingChargesPerDay ?? 0} onChange={e => updateCost({ nursingChargesPerDay: +e.target.value })} className="w-24 bg-gray-900 border border-white/10 rounded px-2 py-1 text-xs text-right text-white focus:outline-none" /></td>
                                <td className="text-right pr-3 text-gray-400">{admission.expectedDaysInRoom ?? 0} days</td>
                                <td className="text-right font-medium">{formatCostDisplay(totals.totalNursingCharges)}</td></tr>
                            <tr><td className="py-2 text-gray-300">ICU Charges</td>
                                <td className="text-right pr-3"><input type="number" value={cost.icuChargesPerDay ?? 0} onChange={e => updateCost({ icuChargesPerDay: +e.target.value })} className="w-24 bg-gray-900 border border-white/10 rounded px-2 py-1 text-xs text-right text-white focus:outline-none" /></td>
                                <td className="text-right pr-3 text-gray-400">{admission.expectedDaysInICU ?? 0} days</td>
                                <td className="text-right font-medium">{formatCostDisplay(totals.totalIcuCharges)}</td></tr>
                            {[['OT Charges', 'otCharges'], ['Surgeon Fee', 'surgeonFee'], ['Anesthetist Fee', 'anesthetistFee'], ['Consultant Fee', 'consultantFee'], ['Investigations', 'investigationsEstimate'], ['Medicines', 'medicinesEstimate'], ['Consumables', 'consumablesEstimate'], ['Ambulance', 'ambulanceCharges'], ['Miscellaneous', 'miscCharges']].map(([label, key]) => (
                                <tr key={key}><td className="py-2 text-gray-300">{label}</td>
                                    <td colSpan={2} className="text-right pr-3 text-gray-500 text-xs">manual</td>
                                    <td className="text-right"><input type="number" value={(cost as any)[key] ?? 0} onChange={e => updateCost({ [key]: +e.target.value } as any)}
                                        className="w-28 bg-gray-900 border border-white/10 rounded px-2 py-1 text-xs text-right text-white focus:outline-none" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className={`rounded-xl p-4 ${totals.exceedsSumInsured ? 'bg-red-900/20 border border-red-500/30' : 'bg-gray-900 border border-white/10'}`}>
                    <div className="flex justify-between text-lg font-bold">
                        <span>Total Estimated Cost</span>
                        <span className="text-white">{formatCostDisplay(totals.totalEstimatedCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-300 mt-2">
                        <span>Claimed from Insurer</span>
                        <input type="number" value={cost.amountClaimedFromInsurer ?? totals.totalEstimatedCost}
                            onChange={e => updateCost({ amountClaimedFromInsurer: +e.target.value })}
                            className="w-36 bg-gray-800 border border-white/10 rounded px-3 py-1 text-sm text-right text-white focus:outline-none" />
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-400">Patient Responsibility</span>
                        <span className="text-gray-300">{formatCostDisplay(totals.patientResponsibility)}</span>
                    </div>
                    {totals.exceedsSumInsured && (
                        <div className="mt-3 text-red-300 text-sm font-medium">
                            ⚠️ Estimated cost exceeds sum insured of {formatCostDisplay(sumInsured)} by {formatCostDisplay(totals.excessAmount)}. Patient may need to pay the difference.
                        </div>
                    )}
                    {!totals.exceedsSumInsured && sumInsured > 0 && (
                        <div className="mt-2 text-green-400 text-xs">✅ Within sum insured ({formatCostDisplay(sumInsured)})</div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button onClick={onBack} className="py-3 rounded-xl font-semibold text-sm bg-gray-800 hover:bg-gray-700 text-white transition-colors">← Back</button>
                <button onClick={onNext} disabled={!isValid}
                    className={`py-3 rounded-xl font-semibold text-sm transition-all ${isValid ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                    Continue to Documents & Generate →
                </button>
            </div>
        </div>
    );
};
