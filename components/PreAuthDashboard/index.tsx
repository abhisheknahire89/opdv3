import React, { useState, useEffect, useCallback } from 'react';
import { PreAuthRecord, PreAuthStatus } from '../PreAuthWizard/types';
import { getAllPreAuths, deletePreAuth } from '../../services/storageService';
import { StatusBadge } from './StatusBadge';
import { formatDateTime } from '../../utils/formatters';

interface PreAuthDashboardProps {
    onNewPreAuth: () => void;
    onOpenPreAuth: (record: PreAuthRecord) => void;
    onSettings: () => void;
}

const STATUS_FILTERS: (PreAuthStatus | 'all')[] = ['all', 'draft', 'pending_documents', 'submitted', 'query_raised', 'approved', 'denied'];

export const PreAuthDashboard: React.FC<PreAuthDashboardProps> = ({ onNewPreAuth, onOpenPreAuth, onSettings }) => {
    const [records, setRecords] = useState<PreAuthRecord[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<PreAuthStatus | 'all'>('all');
    const [loading, setLoading] = useState(true);

    const loadRecords = useCallback(async () => {
        setLoading(true);
        try {
            const all = await getAllPreAuths();
            setRecords(all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { loadRecords(); }, [loadRecords]);

    const filtered = records.filter(r => {
        const matchStatus = statusFilter === 'all' || r.status === statusFilter;
        const q = search.toLowerCase();
        const matchSearch = !q ||
            (r.patient?.patientName ?? '').toLowerCase().includes(q) ||
            (r.insurance?.policyNumber ?? '').toLowerCase().includes(q) ||
            (r.id ?? '').toLowerCase().includes(q) ||
            (r.clinical?.diagnoses?.[0]?.icd10Code ?? '').toLowerCase().includes(q);
        return matchStatus && matchSearch;
    });

    const countByStatus = (s: PreAuthStatus) => records.filter(r => r.status === s).length;

    const statusCards: { status: PreAuthStatus; label: string; icon: string; color: string }[] = [
        { status: 'draft', label: 'Draft', icon: '📝', color: 'text-gray-300' },
        { status: 'pending_documents', label: 'Pending', icon: '📎', color: 'text-amber-300' },
        { status: 'submitted', label: 'Submitted', icon: '⏳', color: 'text-cyan-300' },
        { status: 'approved', label: 'Approved', icon: '✅', color: 'text-green-300' },
        { status: 'query_raised', label: 'Query', icon: '❓', color: 'text-orange-300' },
    ];

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <div className="bg-gray-900/80 border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-lg">🏥</div>
                    <div>
                        <h1 className="font-bold text-lg text-white">Insurance Pre-Authorization</h1>
                        <p className="text-xs text-gray-400">Aivana — TPA-ready documents, faster claims</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={onSettings} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Settings">⚙️</button>
                    <button
                        onClick={onNewPreAuth}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl text-sm font-semibold transition-all"
                    >
                        <span className="text-base">＋</span> New Pre-Authorization
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                {/* Status Summary Cards */}
                <div className="grid grid-cols-5 gap-4">
                    {statusCards.map(sc => (
                        <button
                            key={sc.status}
                            onClick={() => setStatusFilter(statusFilter === sc.status ? 'all' : sc.status)}
                            className={`bg-gray-900 border rounded-xl p-4 text-left transition-all hover:border-white/20 ${statusFilter === sc.status ? 'border-blue-500/50 ring-1 ring-blue-500/30' : 'border-white/10'}`}
                        >
                            <div className={`text-2xl font-bold ${sc.color}`}>{countByStatus(sc.status)}</div>
                            <div className="text-xs text-gray-400 mt-1">{sc.icon} {sc.label}</div>
                        </button>
                    ))}
                </div>

                {/* Search + Filter */}
                <div className="flex gap-3 items-center">
                    <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                        <input
                            type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by patient name, policy number, reference ID, ICD-10..."
                            className="w-full bg-gray-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                    <div className="flex gap-2">
                        {STATUS_FILTERS.slice(0, 4).map(s => (
                            <button key={s}
                                onClick={() => setStatusFilter(s as any)}
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-900 border border-white/10 text-gray-400 hover:text-white'}`}
                            >
                                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pre-Auth Queue Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-gray-500">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="bg-gray-900 border border-white/10 rounded-xl p-12 text-center">
                        <div className="text-5xl mb-4">📋</div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">No pre-authorizations found</h3>
                        <p className="text-gray-500 text-sm mb-6">
                            {records.length === 0 ? 'Click "New Pre-Authorization" to create your first one.' : 'Try adjusting your search or filter.'}
                        </p>
                        {records.length === 0 && (
                            <button onClick={onNewPreAuth} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition-colors">
                                + New Pre-Authorization
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10 text-left">
                                    <th className="px-4 py-3 text-xs text-gray-400 font-medium">Ref ID</th>
                                    <th className="px-4 py-3 text-xs text-gray-400 font-medium">Patient</th>
                                    <th className="px-4 py-3 text-xs text-gray-400 font-medium">Diagnosis</th>
                                    <th className="px-4 py-3 text-xs text-gray-400 font-medium">Insurer / TPA</th>
                                    <th className="px-4 py-3 text-xs text-gray-400 font-medium">Amount</th>
                                    <th className="px-4 py-3 text-xs text-gray-400 font-medium">Updated</th>
                                    <th className="px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                                    <th className="px-4 py-3 text-xs text-gray-400 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((rec, i) => {
                                    const dx = rec.clinical?.diagnoses?.[rec.clinical.selectedDiagnosisIndex ?? 0];
                                    const cost = rec.costEstimate?.totalEstimatedCost;
                                    return (
                                        <tr key={rec.id}
                                            className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${rec.status === 'query_raised' ? 'bg-orange-500/5' : ''}`}
                                            onClick={() => onOpenPreAuth(rec)}
                                        >
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-xs text-blue-400">{rec.id}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-sm">{rec.patient?.patientName ?? '—'}</div>
                                                <div className="text-xs text-gray-400">{rec.patient?.age ? `${rec.patient.age}Y` : ''} {rec.patient?.gender ?? ''}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm">{dx?.diagnosis ?? '—'}</div>
                                                <div className="font-mono text-xs text-gray-500">{dx?.icd10Code ?? ''}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm">{rec.insurance?.insurerName ?? '—'}</div>
                                                <div className="text-xs text-gray-500">{rec.insurance?.tpaName ?? ''}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {cost ? `₹${cost.toLocaleString('en-IN')}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-400">
                                                {formatDateTime(rec.updatedAt)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status={rec.status} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <button className="text-gray-400 hover:text-white text-sm p-1 rounded hover:bg-white/10" onClick={e => { e.stopPropagation(); onOpenPreAuth(rec); }}>
                                                    →
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
