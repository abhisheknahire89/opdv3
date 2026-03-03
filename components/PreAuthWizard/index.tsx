import React, { useState, useCallback } from 'react';
import {
    PreAuthRecord, PatientRecord, InsurancePolicyDetails,
    ClinicalDetails, AdmissionDetails, CostEstimate, WizardState
} from './types';
import { WizardProgress } from './WizardProgress';
import { PatientInsuranceStep } from './PatientInsuranceStep';
import { ClinicalDetailsStep } from './ClinicalDetailsStep';
import { AdmissionCostStep } from './AdmissionCostStep';
import { DocumentsGenerateStep } from './DocumentsGenerateStep';
import { savePreAuth, savePatient, generatePreAuthId, generatePatientId } from '../../services/storageService';
import { calculateTotals } from '../../utils/costCalculator';
import { todayISO, nowTimeString } from '../../utils/formatters';

interface PreAuthWizardProps {
    onClose: () => void;
    existingRecord?: PreAuthRecord;
}

const buildEmptyRecord = (): Partial<PreAuthRecord> => ({
    id: generatePreAuthId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    version: 1,
    createdBy: 'Insurance Desk',
    patient: {},
    insurance: { dataSource: 'manual' },
    clinical: {
        dataSource: 'manual_entry',
        diagnoses: [],
        selectedDiagnosisIndex: 0,
        proposedLineOfTreatment: { medical: false, surgical: false, intensiveCare: false, investigation: false, nonAllopathic: false },
        vitals: { bp: '', pulse: '', temp: '', spo2: '', rr: '' },
        voiceCapturedFindings: [],
        chiefComplaints: '',
        durationOfPresentAilment: '',
        natureOfIllness: 'Acute',
        historyOfPresentIllness: '',
        relevantClinicalFindings: '',
        treatmentTakenSoFar: '',
        reasonForHospitalisation: '',
        additionalClinicalNotes: '',
    },
    admission: {
        admissionType: 'Emergency',
        dateOfAdmission: todayISO(),
        timeOfAdmission: nowTimeString(),
        roomCategory: 'General Ward',
        expectedDaysInICU: 0,
        expectedDaysInRoom: 0,
        expectedLengthOfStay: 0,
        pastMedicalHistory: {
            diabetes: { present: false }, hypertension: { present: false }, heartDisease: { present: false },
            asthma: { present: false }, epilepsy: { present: false }, cancer: { present: false },
            kidney: { present: false }, liver: { present: false }, hiv: { present: false },
            alcoholism: { present: false }, smoking: { present: false }, anyOther: { present: false },
        },
        previousHospitalization: { wasHospitalizedBefore: false },
    },
    costEstimate: calculateTotals({}, 0),
    uploadedDocuments: [],
    documentRequirements: [],
    declarations: { patient: {}, doctor: {}, hospital: {} },
    outputs: {},
});

export const PreAuthWizard: React.FC<PreAuthWizardProps> = ({ onClose, existingRecord }) => {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [record, setRecord] = useState<Partial<PreAuthRecord>>(existingRecord ?? buildEmptyRecord());
    const [saving, setSaving] = useState(false);

    const updateRecord = useCallback(async (partial: Partial<PreAuthRecord>) => {
        const updated = { ...record, ...partial, updatedAt: new Date().toISOString() };
        setRecord(updated);
        try {
            await savePreAuth(updated as PreAuthRecord);
        } catch (e) { /* silent */ }
    }, [record]);

    const handleNext = async () => {
        setSaving(true);
        await updateRecord({});
        setSaving(false);
        if (step < 4) setStep((step + 1) as any);
    };

    const handleBack = () => {
        if (step > 1) setStep((step - 1) as any);
    };

    const handleGenerate = async (irdaiText: string) => {
        const finalStatus = (record.uploadedDocuments ?? []).length === 0 ? 'pending_documents' : 'ready_to_submit';
        await updateRecord({ status: finalStatus, outputs: { irdaiText } });
        // Also save patient for future search
        if (record.patient?.patientName) {
            const pat = { id: generatePatientId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...record.patient } as PatientRecord;
            await savePatient(pat);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-gray-950 border border-white/10 rounded-2xl w-full max-w-3xl my-8 mx-4 shadow-2xl">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <span className="text-blue-400 font-bold text-sm">📋 New Pre-Authorization</span>
                        <span className="font-mono text-xs text-gray-500">{record.id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {saving && <span className="text-xs text-gray-500">💾 Saving...</span>}
                        <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none transition-colors">✕</button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="px-6 pt-5 pb-3">
                    <WizardProgress currentStep={step} onStepClick={s => s < step && setStep(s)} />
                </div>

                {/* Step Content */}
                <div className="px-6 pb-6 min-h-[500px] overflow-y-auto" style={{ maxHeight: '75vh' }}>
                    {step === 1 && (
                        <PatientInsuranceStep
                            patient={record.patient ?? {}}
                            insurance={record.insurance ?? {}}
                            onPatientChange={p => updateRecord({ patient: p })}
                            onInsuranceChange={ins => updateRecord({ insurance: ins })}
                            onNext={handleNext}
                        />
                    )}
                    {step === 2 && (
                        <ClinicalDetailsStep
                            clinical={record.clinical ?? {}}
                            onClinicalChange={c => updateRecord({ clinical: c })}
                            onNext={handleNext}
                            onBack={handleBack}
                        />
                    )}
                    {step === 3 && (
                        <AdmissionCostStep
                            admission={record.admission ?? {}}
                            cost={record.costEstimate ?? {}}
                            clinical={record.clinical ?? {}}
                            sumInsured={record.insurance?.sumInsured ?? 0}
                            onAdmissionChange={a => updateRecord({ admission: a })}
                            onCostChange={c => updateRecord({ costEstimate: c })}
                            onNext={handleNext}
                            onBack={handleBack}
                        />
                    )}
                    {step === 4 && (
                        <DocumentsGenerateStep
                            record={record}
                            onRecordChange={r => updateRecord(r)}
                            onBack={handleBack}
                            onGenerate={handleGenerate}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
