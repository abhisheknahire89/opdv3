import React from 'react';
import { NexusInsuranceInput, DdxItem } from '../types';

interface InsuranceStepReviewProps {
    nexusData: NexusInsuranceInput;
    primaryDiagnosis: DdxItem | null;
    onSeverityOverrideChange: (override: { overridden: boolean; newSeverity: string; justification: string }) => void;
    severityOverride: { overridden: boolean; newSeverity: string; justification: string };
    patientName: string;
}

export const InsuranceStepReview: React.FC<InsuranceStepReviewProps> = ({
    nexusData,
    primaryDiagnosis,
    onSeverityOverrideChange,
    severityOverride,
    patientName
}) => {
    if (!nexusData || !primaryDiagnosis) return null;

    const handleOverrideToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSeverityOverrideChange({ ...severityOverride, overridden: e.target.checked });
    };

    const handleSeverityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onSeverityOverrideChange({ ...severityOverride, newSeverity: e.target.value });
    };

    const handleJustificationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onSeverityOverrideChange({ ...severityOverride, justification: e.target.value });
    };

    return (
        <div className="space-y-6 text-gray-200">
            <div>
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2 mb-4">
                    Patient & Diagnosis
                </h3>
                <p className="mb-2"><span className="text-gray-400">Patient:</span> {patientName}</p>
                <p className="mb-2"><span className="text-gray-400">Primary Diagnosis:</span> {primaryDiagnosis.diagnosis}</p>
                <p className="mb-2"><span className="text-gray-400">Rationale:</span> {primaryDiagnosis.rationale}</p>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2 mb-4">
                    Clinical Severity Assessment (NEXUS)
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-800 p-3 rounded border border-gray-700">
                        <p className="text-sm text-gray-400">Symptom Severity</p>
                        <p className="text-xl font-semibold text-white">{nexusData.severity.phenoIntensity.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded border border-gray-700">
                        <p className="text-sm text-gray-400">Clinical Urgency</p>
                        <p className="text-xl font-semibold text-white">{nexusData.severity.urgencyQuotient.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded border border-gray-700">
                        <p className="text-sm text-gray-400">Deterioration Risk</p>
                        <p className="text-xl font-semibold text-white">{nexusData.severity.deteriorationVelocity.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded border border-gray-700">
                        <p className="text-sm text-gray-400">Red Flag Status</p>
                        <p className="text-xl font-semibold text-white uppercase">{nexusData.severity.redFlagSeverity}</p>
                    </div>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={severityOverride.overridden}
                            onChange={handleOverrideToggle}
                            className="rounded bg-gray-700 border-gray-600 text-purple-600"
                        />
                        <span className="font-medium">Override NEXUS Severity Assessment</span>
                    </label>

                    {severityOverride.overridden && (
                        <div className="mt-4 space-y-4 pl-7 border-l-2 border-purple-500/50">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">New Severity Level</label>
                                <select
                                    value={severityOverride.newSeverity}
                                    onChange={handleSeverityChange}
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                                >
                                    <option value="">Select severity...</option>
                                    <option value="critical">Critical (Immediate Admission)</option>
                                    <option value="high">High (Standard Admission)</option>
                                    <option value="moderate">Moderate (Observation/Day Care)</option>
                                    <option value="low">Low (OPD Management)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Clinical Justification</label>
                                <textarea
                                    value={severityOverride.justification}
                                    onChange={handleJustificationChange}
                                    placeholder="Provide clinical rationale for overriding the AI assessment..."
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white h-24"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* 
      <div>
        <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2 mb-4">
          Key Findings Supporting Admission
        </h3>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          {nexusData.keyFindings.map((finding, idx) => (
            <li key={idx}>{finding}</li>
          ))}
        </ul>
      </div> */}
        </div>
    );
};
