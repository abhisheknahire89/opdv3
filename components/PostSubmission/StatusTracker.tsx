import React, { useState } from 'react';
import { PreAuthRecord } from '../PreAuthWizard/types';
import { savePreAuth } from '../../services/storageService';
import { StatusBadge } from '../PreAuthDashboard/StatusBadge';
import { formatDateTime, formatCurrency } from '../../utils/formatters';

interface StatusTrackerProps {
    record: PreAuthRecord;
    onClose: () => void;
    onRecordUpdate: (r: PreAuthRecord) => void;
}

export const StatusTracker: React.FC<StatusTrackerProps> = ({ record, onClose, onRecordUpdate }) => {
    const [tpaStatus, setTpaStatus] = useState<'approved' | 'denied' | 'query' | 'partial_approved'>(record.tpaResponse?.status ?? 'approved');
    const [approvedAmount, setApprovedAmount] = useState(record.tpaResponse?.approvedAmount ?? 0);
    const [denialReason, setDenialReason] = useState(record.tpaResponse?.denialReason ?? '');
    const [queryDetails, setQueryDetails] = useState(record.tpaResponse?.queryDetails ?? '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        const updatedStatus = tpaStatus === 'approved' || tpaStatus === 'partial_approved' ? 'approved' :
            tpaStatus === 'denied' ? 'denied' : 'query_raised';
        const updated: PreAuthRecord = {
            ...record,
            status: updatedStatus,
            updatedAt: new Date().toISOString(),
            tpaResponse: { respondedAt: new Date().toISOString(), status: tpaStatus, approvedAmount, denialReason, queryDetails },
        };
        await savePreAuth(updated);
        setSaving(false);
        onRecordUpdate(updated);
    };

    const selectedDx = record.clinical?.diagnoses?.[record.clinical.selectedDiagnosisIndex ?? 0];

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-gray-950 border border-white/10 rounded-2xl w-full max-w-2xl my-8 mx-4 shadow-2xl">
                <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
                    <h2 className="font-bold text-white">Pre-Auth Details</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
                </div>
                <div className="px-6 py-5 space-y-5">
                    {/* Summary */}
                    <div className="bg-gray-900 rounded-xl p-4 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="font-mono text-blue-400 text-xs">{record.id}</span>
                            <StatusBadge status={record.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-400 pt-1">
                            <div>Patient: <span className="text-white">{record.patient?.patientName}</span></div>
                            <div>Age/Sex: <span className="text-white">{record.patient?.age}Y {record.patient?.gender}</span></div>
                            <div>Diagnosis: <span className="text-white">{selectedDx?.diagnosis ?? '—'}</span></div>
                            <div>ICD-10: <span className="text-white font-mono">{selectedDx?.icd10Code ?? '—'}</span></div>
                            <div>Insurer: <span className="text-white">{record.insurance?.insurerName}</span></div>
                            <div>TPA: <span className="text-white">{record.insurance?.tpaName}</span></div>
                            <div>Amount: <span className="text-white">₹{(record.costEstimate?.amountClaimedFromInsurer ?? 0).toLocaleString('en-IN')}</span></div>
                            <div>Updated: <span className="text-white">{formatDateTime(record.updatedAt)}</span></div>
                        </div>
                    </div>

                    {/* Generated Document */}
                    {record.outputs?.irdaiText && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-gray-300">IRDAI Pre-Auth Document</h3>
                                <button onClick={() => navigator.clipboard.writeText(record.outputs.irdaiText!)} className="text-xs text-blue-400 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">📋 Copy</button>
                            </div>
                            <textarea readOnly value={record.outputs.irdaiText} rows={8}
                                className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-gray-300 focus:outline-none resize-none" />
                        </div>
                    )}

                    {/* TPA Response Entry */}
                    {(record.status === 'submitted' || record.status === 'query_raised' || record.status === 'approved' || record.status === 'denied') && (
                        <div className="bg-gray-800/50 rounded-xl p-4 space-y-4">
                            <h3 className="font-semibold text-blue-300 text-sm">📨 Record TPA Response</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {(['approved', 'partial_approved', 'query', 'denied'] as const).map(s => (
                                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="tpaStatus" value={s} checked={tpaStatus === s} onChange={() => setTpaStatus(s)} className="accent-blue-500" />
                                        <span className="text-sm text-gray-300 capitalize">{s.replace('_', ' ')}</span>
                                    </label>
                                ))}
                            </div>
                            {(tpaStatus === 'approved' || tpaStatus === 'partial_approved') && (
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Approved Amount (₹)</label>
                                    <input type="number" value={approvedAmount} onChange={e => setApprovedAmount(+e.target.value)}
                                        className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                                </div>
                            )}
                            {tpaStatus === 'denied' && (
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Denial Reason</label>
                                    <textarea value={denialReason} onChange={e => setDenialReason(e.target.value)} rows={3}
                                        className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none" />
                                </div>
                            )}
                            {tpaStatus === 'query' && (
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">TPA Query Details</label>
                                    <textarea value={queryDetails} onChange={e => setQueryDetails(e.target.value)} rows={3}
                                        className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none" />
                                </div>
                            )}
                            <button onClick={handleSave} disabled={saving}
                                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white disabled:opacity-50">
                                {saving ? 'Saving...' : '💾 Save TPA Response'}
                            </button>
                        </div>
                    )}

                    {/* Mark as Submitted */}
                    {(record.status === 'ready_to_submit' || record.status === 'draft') && (
                        <button onClick={async () => {
                            const updated = { ...record, status: 'submitted' as const, updatedAt: new Date().toISOString() };
                            await savePreAuth(updated as PreAuthRecord);
                            onRecordUpdate(updated as PreAuthRecord);
                        }} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                            📤 Mark as Submitted to TPA
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
