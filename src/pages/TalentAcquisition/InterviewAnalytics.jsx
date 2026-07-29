import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, RefreshCw, Users, CheckCircle2, XCircle, Clock,
    Calendar, Award, BarChart3, Search, UserCheck, Briefcase, ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const DECISION_OPTIONS = ['None', 'Shortlisted', 'Selected', 'On Hold', 'Rejected'];
const PAGE_LIMIT_OPTIONS = [50, 100, 150];

const InterviewAnalytics = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialReqId = searchParams.get('hiringRequestId') || '';
    const initialPhase = parseInt(searchParams.get('phase'), 10) || 1;
    const initialPage = parseInt(searchParams.get('page'), 10) || 1;
    const initialLimit = parseInt(searchParams.get('limit'), 10) || 50;

    const [selectedRequisitionId, setSelectedRequisitionId] = useState(initialReqId);
    const [selectedPhase, setSelectedPhase] = useState(initialPhase);
    const [page, setPage] = useState(initialPage);
    const [limit, setLimit] = useState([50, 100, 150].includes(initialLimit) ? initialLimit : 50);

    const [requisitions, setRequisitions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ totalCandidates: 0, totalShortlisted: 0, totalScheduled: 0, roundsCount: 0 });
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0, limit: 50 });
    const [roundStats, setRoundStats] = useState([]);
    const [candidateTrackers, setCandidateTrackers] = useState([]);
    const [updatingDecisionId, setUpdatingDecisionId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const updateUrlParams = (newReqId, newPhase, newPage, newLimit) => {
        const params = {};
        if (newReqId) params.hiringRequestId = newReqId;
        if (newPhase) params.phase = newPhase;
        if (newPage > 1) params.page = newPage;
        if (newLimit !== 50) params.limit = newLimit;
        setSearchParams(params);
    };

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (selectedRequisitionId) params.append('hiringRequestId', selectedRequisitionId);
            params.append('phase', selectedPhase);
            params.append('page', page);
            params.append('limit', limit);

            const response = await api.get(`/ta/analytics/interviews?${params.toString()}`);
            if (response.data?.success) {
                setSummary(response.data.summary || {});
                setRoundStats(response.data.roundStats || []);
                setCandidateTrackers(response.data.candidateTrackers || []);
                if (response.data.pagination) {
                    setPagination(response.data.pagination);
                }
                if (response.data.requisitions) {
                    setRequisitions(response.data.requisitions);
                }
            }
        } catch (error) {
            console.error('Error fetching interview analytics:', error);
            toast.error('Failed to load interview analytics');
        } finally {
            setLoading(false);
        }
    }, [selectedRequisitionId, selectedPhase, page, limit]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const handleRequisitionChange = (reqId) => {
        setSelectedRequisitionId(reqId);
        setPage(1);
        updateUrlParams(reqId, selectedPhase, 1, limit);
    };

    const handlePhaseChange = (phaseNum) => {
        setSelectedPhase(phaseNum);
        setPage(1);
        updateUrlParams(selectedRequisitionId, phaseNum, 1, limit);
    };

    const handleLimitChange = (newLimit) => {
        const parsed = parseInt(newLimit, 10);
        setLimit(parsed);
        setPage(1);
        updateUrlParams(selectedRequisitionId, selectedPhase, 1, parsed);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= (pagination.totalPages || 1)) {
            setPage(newPage);
            updateUrlParams(selectedRequisitionId, selectedPhase, newPage, limit);
        }
    };

    const handleDecisionChange = async (candidateId, newDecision) => {
        try {
            setUpdatingDecisionId(candidateId);
            let endpoint = `/ta/candidates/${candidateId}/decision`;
            let payload = { decision: newDecision };

            if (selectedPhase === 2 || newDecision === 'Selected') {
                endpoint = `/ta/candidates/${candidateId}/phase2-decision`;
                payload = { phase2Decision: newDecision };
            }

            await api.patch(endpoint, payload);
            toast.success(`Synced decision to ${newDecision}`);

            setCandidateTrackers(prev => prev.map(c =>
                c._id === candidateId ? { ...c, finalDecision: newDecision } : c
            ));
        } catch (error) {
            console.error('Failed to sync decision:', error);
            toast.error('Failed to update decision in candidate table');
        } finally {
            setUpdatingDecisionId(null);
        }
    };

    const filteredTrackers = candidateTrackers
        .filter(item => item.totalRounds > 0)
        .filter(item =>
            item.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.roleTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const selectedReqObj = requisitions.find(r => r._id === selectedRequisitionId);
    const startEntry = pagination.totalCount > 0 ? (pagination.currentPage - 1) * pagination.limit + 1 : 0;
    const endEntry = Math.min(pagination.currentPage * pagination.limit, pagination.totalCount);

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                        title="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <BarChart3 className="text-indigo-600" size={22} />
                            Interview Analytics & Candidate Tracker
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Phase {selectedPhase} Analytics {selectedReqObj ? `for: ${selectedReqObj.title} (${selectedReqObj.client})` : 'across all requisitions'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Phase Selector Tabs */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                        <button
                            type="button"
                            onClick={() => handlePhaseChange(1)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                                selectedPhase === 1
                                    ? 'bg-white text-indigo-600 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Phase 1
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePhaseChange(2)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                                selectedPhase === 2
                                    ? 'bg-white text-indigo-600 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Phase 2
                        </button>
                    </div>

                    {/* Requisition Dropdown Filter */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                        <Briefcase size={14} className="text-slate-400" />
                        <select
                            value={selectedRequisitionId}
                            onChange={(e) => handleRequisitionChange(e.target.value)}
                            className="bg-transparent font-medium text-slate-700 focus:outline-none max-w-[220px] truncate"
                        >
                            <option value="">All Requisitions</option>
                            {requisitions.map(r => (
                                <option key={r._id} value={r._id}>
                                    {r.title} ({r.client})
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={fetchAnalytics}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Candidates</p>
                        <h3 className="text-2xl font-bold text-slate-800 mt-1">{summary.totalCandidates}</h3>
                    </div>
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                        <Users size={22} />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Final Shortlisted / Selected</p>
                        <h3 className="text-2xl font-bold text-emerald-600 mt-1">{summary.totalShortlisted}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Award size={22} />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">Scheduled Interviews</p>
                        <h3 className="text-2xl font-bold text-blue-600 mt-1">{summary.totalScheduled}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Calendar size={22} />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">Active Rounds</p>
                        <h3 className="text-2xl font-bold text-purple-600 mt-1">{summary.roundsCount}</h3>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <UserCheck size={22} />
                    </div>
                </div>
            </div>

            {/* Round Breakdown Cards */}
            <div className="space-y-3">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    Round-wise Breakdown
                </h2>
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-36 bg-slate-200/60 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : roundStats.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                        No round data available for this selection.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {roundStats.map((r, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <span className="font-bold text-slate-800 text-sm">{r.roundName}</span>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600">
                                        Total: {r.total}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100/80">
                                        <div className="flex items-center justify-center gap-1 text-emerald-600 text-xs font-medium mb-1">
                                            <CheckCircle2 size={13} /> Pass
                                        </div>
                                        <span className="text-lg font-bold text-emerald-700">{r.pass}</span>
                                    </div>
                                    <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-100/80">
                                        <div className="flex items-center justify-center gap-1 text-rose-600 text-xs font-medium mb-1">
                                            <XCircle size={13} /> Rejected
                                        </div>
                                        <span className="text-lg font-bold text-rose-700">{r.fail}</span>
                                    </div>
                                    <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100/80">
                                        <div className="flex items-center justify-center gap-1 text-blue-600 text-xs font-medium mb-1">
                                            <Clock size={13} /> Pending
                                        </div>
                                        <span className="text-lg font-bold text-blue-700">{r.pending + r.scheduled}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Candidate Interview Progress Tracking Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            Candidate Interview Progress ({pagination.totalCount})
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Round details and synchronized final hiring decisions
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-full sm:w-64">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search candidate or role..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                                <th className="p-3.5 min-w-[160px]">Candidate Name</th>
                                <th className="p-3.5 text-center min-w-[130px]">Total Interview Rounds</th>
                                <th className="p-3.5 min-w-[210px]">Round 1 Details</th>
                                <th className="p-3.5 min-w-[210px]">Round 2 Details</th>
                                <th className="p-3.5 min-w-[210px]">Round 3 Details</th>
                                <th className="p-3.5 min-w-[150px]">Final Decision</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400">
                                        Loading candidate interview tracking data...
                                    </td>
                                </tr>
                            ) : filteredTrackers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400">
                                        No candidates found for the selected requisition.
                                    </td>
                                </tr>
                            ) : (
                                filteredTrackers.map((candidate) => {
                                    const r1 = candidate.rounds?.[0];
                                    const r2 = candidate.rounds?.[1];
                                    const r3 = candidate.rounds?.[2];

                                    return (
                                        <tr
                                            key={candidate._id}
                                            onClick={() => {
                                                if (candidate.hiringRequestId) {
                                                    const targetPhase = candidate.rounds?.[0]?.phase || selectedPhase || 1;
                                                    navigate(`/ta/hiring-request/${candidate.hiringRequestId}/candidate/${candidate._id}/view?phase=${targetPhase}`);
                                                }
                                            }}
                                            className="hover:bg-indigo-50/50 cursor-pointer transition align-top group"
                                        >
                                            {/* Candidate Name */}
                                            <td className="p-3.5">
                                                <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition">{candidate.candidateName}</div>
                                                <div className="text-[11px] text-slate-400">{candidate.roleTitle}</div>
                                                <div className="text-[10px] text-indigo-500 font-medium">{candidate.clientName}</div>
                                            </td>

                                            {/* Total Interview Rounds */}
                                            <td className="p-3.5 text-center">
                                                <span className="inline-flex min-w-[28px] h-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                                                    {candidate.totalRounds}
                                                </span>
                                            </td>

                                            {/* Round 1 Details */}
                                            <td className="p-3.5 bg-slate-50/30">
                                                {r1 ? (
                                                    <div className="space-y-1 text-[11px]">
                                                        <div><span className="font-semibold text-slate-600">Interviewer:</span> {r1.interviewer}</div>
                                                        <div><span className="font-semibold text-slate-600">Rating:</span> <span className="font-bold text-amber-600">{r1.rating}</span></div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-semibold text-slate-600">Result:</span>
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                r1.status === 'Pass' ? 'bg-emerald-100 text-emerald-700' :
                                                                r1.status === 'Fail' ? 'bg-rose-100 text-rose-700' :
                                                                'bg-blue-100 text-blue-700'
                                                            }`}>
                                                                {r1.status}
                                                            </span>
                                                        </div>
                                                        <div className="text-slate-500 italic line-clamp-2"><span className="font-semibold text-slate-600 not-italic">Feedback:</span> {r1.feedback}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Round 2 Details */}
                                            <td className="p-3.5 bg-slate-50/30">
                                                {r2 ? (
                                                    <div className="space-y-1 text-[11px]">
                                                        <div><span className="font-semibold text-slate-600">Interviewer:</span> {r2.interviewer}</div>
                                                        <div><span className="font-semibold text-slate-600">Rating:</span> <span className="font-bold text-amber-600">{r2.rating}</span></div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-semibold text-slate-600">Result:</span>
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                r2.status === 'Pass' ? 'bg-emerald-100 text-emerald-700' :
                                                                r2.status === 'Fail' ? 'bg-rose-100 text-rose-700' :
                                                                'bg-blue-100 text-blue-700'
                                                            }`}>
                                                                {r2.status}
                                                            </span>
                                                        </div>
                                                        <div className="text-slate-500 italic line-clamp-2"><span className="font-semibold text-slate-600 not-italic">Feedback:</span> {r2.feedback}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Round 3 Details */}
                                            <td className="p-3.5 bg-slate-50/30">
                                                {r3 ? (
                                                    <div className="space-y-1 text-[11px]">
                                                        <div><span className="font-semibold text-slate-600">Interviewer:</span> {r3.interviewer}</div>
                                                        <div><span className="font-semibold text-slate-600">Rating:</span> <span className="font-bold text-amber-600">{r3.rating}</span></div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-semibold text-slate-600">Result:</span>
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                r3.status === 'Pass' ? 'bg-emerald-100 text-emerald-700' :
                                                                r3.status === 'Fail' ? 'bg-rose-100 text-rose-700' :
                                                                'bg-blue-100 text-blue-700'
                                                            }`}>
                                                                {r3.status}
                                                            </span>
                                                        </div>
                                                        <div className="text-slate-500 italic line-clamp-2"><span className="font-semibold text-slate-600 not-italic">Feedback:</span> {r3.feedback}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Final Decision Dropdown */}
                                            <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                                                <select
                                                    value={candidate.finalDecision || 'None'}
                                                    disabled={updatingDecisionId === candidate._id}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        handleDecisionChange(candidate._id, e.target.value);
                                                    }}
                                                    className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition focus:outline-none ${
                                                        candidate.finalDecision === 'Shortlisted' || candidate.finalDecision === 'Selected' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' :
                                                        candidate.finalDecision === 'Rejected' ? 'bg-rose-50 border-rose-300 text-rose-700' :
                                                        candidate.finalDecision === 'On Hold' ? 'bg-amber-50 border-amber-300 text-amber-700' :
                                                        'bg-slate-50 border-slate-200 text-slate-700'
                                                    }`}
                                                >
                                                    {DECISION_OPTIONS.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span>Show</span>
                        <select
                            value={limit}
                            onChange={(e) => handleLimitChange(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                        >
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={150}>150</option>
                        </select>
                        <span>entries (Showing <span className="font-bold text-slate-700">{startEntry}</span> to <span className="font-bold text-slate-700">{endEntry}</span> of <span className="font-bold text-slate-700">{pagination.totalCount}</span> entries)</span>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                            disabled={pagination.currentPage <= 1 || loading}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            <ChevronLeft size={14} /> Previous
                        </button>
                        <span className="px-2 font-semibold text-slate-700">
                            Page {pagination.currentPage} of {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                            disabled={pagination.currentPage >= pagination.totalPages || loading}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterviewAnalytics;
