import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, RefreshCw, CheckCircle2, XCircle, Clock, ReceiptText, User, Banknote, ArrowLeft, Settings } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import { getPendingApprovals } from '../api/reimbursementApi';
import { getStatusStyle, formatINR, isActionable } from '../utils/reimbursementConstants';
import ClaimDetailDrawer from '../components/ClaimDetailDrawer';
import ReimbursementSettingsModal from '../components/ReimbursementSettingsModal';

const ApprovalQueue = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [claims, setClaims]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [page, setPage]       = useState(1);
    const [pagination, setPagination] = useState({});
    const LIMIT = 20;

    const isAdmin   = user?.roles?.some(r => ['Admin', 'System Admin', 'HR Admin'].includes(typeof r === 'string' ? r : r?.name));
    const isFinance = isAdmin || user?.permissions?.includes('reimbursement.mark_paid') || user?.permissions?.includes('reimbursement.manage');

    const load = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await getPendingApprovals({ page: p, limit: LIMIT });
            setClaims(res.data?.claims || []);
            setPagination(res.data?.pagination || {});
        } catch {
            toast.error('Failed to load approval queue.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(1); }, [load]);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="border-b border-slate-100 bg-white px-6 py-4">
                <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/ess')}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 shrink-0"
                            aria-label="Back to My Space"
                            title="Back to My Space"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Approval Queue</h1>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Reimbursement claims awaiting your action
                                {pagination.total !== undefined && (
                                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 font-semibold">{pagination.total}</span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => load(page)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 transition-colors">
                            <RefreshCw size={16} />
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => setShowSettings(true)}
                                className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100 transition-colors"
                                title="Manage Categories & Workflows"
                            >
                                <Settings size={15} /> Settings
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader size={32} className="animate-spin text-blue-500" />
                    </div>
                ) : claims.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-600 mb-4">
                            <CheckCircle2 size={24} />
                        </div>
                        <p className="text-base font-semibold text-slate-700">All caught up!</p>
                        <p className="mt-1 text-sm text-slate-400">No claims currently awaiting your approval.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {claims.map(c => {
                            const s = getStatusStyle(c.status);
                            const emp = c.employee;
                            return (
                                <button
                                    key={c._id}
                                    onClick={() => setSelectedId(c._id)}
                                    className="w-full text-left rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Employee info */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-100 text-blue-600 font-bold text-sm">
                                                {emp?.profilePicture
                                                    ? <img src={emp.profilePicture} alt="" className="h-full w-full object-cover" />
                                                    : (emp?.firstName?.charAt(0) || <User size={16} />)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-800 truncate">{emp?.firstName} {emp?.lastName}</p>
                                                <p className="text-xs text-slate-400 truncate">{emp?.department} · {emp?.employeeCode}</p>
                                            </div>
                                        </div>

                                        {/* Amount + status */}
                                        <div className="text-right shrink-0">
                                            <p className="text-lg font-bold text-slate-900">{formatINR(c.amount)}</p>
                                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${s.bg} ${s.text} ${s.border}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                                                {c.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-3">
                                        <div>
                                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{c.category}</span>
                                            <span className="ml-2 text-xs text-slate-400">
                                                {c.expenseDate ? format(new Date(c.expenseDate), 'dd MMM yyyy') : ''}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-400">
                                            Awaiting Level {c.currentLevel} approval
                                        </span>
                                    </div>

                                    {c.description && (
                                        <p className="mt-2 text-xs text-slate-500 line-clamp-1 italic">"{c.description}"</p>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {pagination.pages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-2">
                        <button disabled={page <= 1} onClick={() => { setPage(p => p - 1); load(page - 1); }}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-40">
                            Previous
                        </button>
                        <span className="text-sm text-slate-500">Page {page} of {pagination.pages}</span>
                        <button disabled={page >= pagination.pages} onClick={() => { setPage(p => p + 1); load(page + 1); }}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-40">
                            Next
                        </button>
                    </div>
                )}
            </div>

            {showSettings && (
                <ReimbursementSettingsModal
                    onClose={() => setShowSettings(false)}
                    onSuccess={() => load(page)}
                />
            )}
            {selectedId && (
                <ClaimDetailDrawer
                    claimId={selectedId}
                    onClose={() => setSelectedId(null)}
                    onRefresh={() => load(page)}
                    isApprover={true}
                    isFinance={isFinance}
                />
            )}
        </div>
    );
};

export default ApprovalQueue;
