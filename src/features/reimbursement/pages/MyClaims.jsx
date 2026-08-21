import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Search, Filter, ReceiptText, Loader, RefreshCw, TrendingUp, Clock,
    CheckCircle2, XCircle, Banknote, ArrowLeft, Settings, Users, Layers, Check, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import { getMyClaims, getMyStats, getPendingApprovals, getAllClaims } from '../api/reimbursementApi';
import { getStatusStyle, formatINR, CLAIM_STATUSES } from '../utils/reimbursementConstants';
import SubmitClaimModal from '../components/SubmitClaimModal';
import ClaimDetailDrawer from '../components/ClaimDetailDrawer';
import ReimbursementSettingsModal from '../components/ReimbursementSettingsModal';

const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className={`rounded-2xl border ${color.border} ${color.bg} p-4 flex items-start gap-3 shadow-xs`}>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color.icon}`}>
            <Icon size={18} />
        </div>
        <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p>
        </div>
    </div>
);

const ClaimRow = ({ claim, onClick, showEmployee = false }) => {
    const s = getStatusStyle(claim.status);
    const emp = claim.employee;

    return (
        <button
            onClick={onClick}
            className="w-full text-left flex items-center gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-xs hover:shadow-md hover:border-blue-200 transition-all group"
        >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${showEmployee ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                {showEmployee ? <Users size={18} /> : <ReceiptText size={18} />}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-slate-800">{claim.category}</p>
                    <span className={`hidden sm:inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${s.bg} ${s.text} ${s.border}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                        {claim.status}
                    </span>
                </div>
                {showEmployee && emp && (
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">
                        {emp.firstName} {emp.lastName} · <span className="text-slate-400 font-normal">{emp.department || 'Employee'} {emp.employeeCode ? `(${emp.employeeCode})` : ''}</span>
                    </p>
                )}
                <p className="mt-0.5 text-xs text-slate-400 truncate">{claim.description}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                    Expense date: {claim.expenseDate ? format(new Date(claim.expenseDate), 'dd MMM yyyy') : ''}
                </p>
            </div>
            <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-900">{formatINR(claim.amount)}</p>
                <span className={`sm:hidden inline-flex items-center gap-1 mt-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${s.bg} ${s.text} ${s.border}`}>
                    {claim.status}
                </span>
                {showEmployee && claim.status === 'Pending' && (
                    <span className="hidden sm:inline-block mt-1 text-[11px] font-semibold text-blue-600 group-hover:underline">
                        Review & Action →
                    </span>
                )}
            </div>
        </button>
    );
};

const MyClaims = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.roles?.some(r => ['Admin', 'HR Admin', 'System Admin'].includes(typeof r === 'string' ? r : r?.name))
        || user?.permissions?.includes('reimbursement.manage') || user?.permissions?.includes('*');

    // Tab: 'my-claims' | 'approvals' | 'all'
    const [activeTab, setActiveTab] = useState('my-claims');

    // Claims data
    const [claims, setClaims]           = useState([]);
    const [approvals, setApprovals]     = useState([]);
    const [allClaims, setAllClaims]     = useState([]);
    const [approvalsTotal, setApprovalsTotal] = useState(0);
    const [canApprove, setCanApprove]   = useState(isAdmin);

    const [stats, setStats]             = useState(null);
    const [loading, setLoading]         = useState(true);

    const [showSubmit, setShowSubmit]         = useState(false);
    const [showSettings, setShowSettings]     = useState(false);
    const [selectedClaimId, setSelectedClaimId] = useState(null);
    const [drawerIsApprover, setDrawerIsApprover] = useState(false);
    const [statusFilter, setStatusFilter]     = useState('');
    const [search, setSearch]                 = useState('');
    const [page, setPage]                     = useState(1);
    const LIMIT = 20;

    // Load Stats
    const loadStats = useCallback(async () => {
        try {
            const scope = (activeTab === 'approvals' || activeTab === 'all') ? 'company' : 'mine';
            const statsRes = await getMyStats({ scope });
            setStats(statsRes.data?.stats || null);
        } catch (err) {
            console.error('Failed to load stats', err);
        }
    }, [activeTab]);

    // Load Data based on activeTab
    const loadData = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            if (activeTab === 'my-claims') {
                const res = await getMyClaims({ page: p, limit: LIMIT, status: statusFilter || undefined });
                setClaims(res.data?.claims || []);
            } else if (activeTab === 'approvals') {
                const res = await getPendingApprovals({ page: p, limit: LIMIT });
                const list = res.data?.claims || [];
                setApprovals(list);
                setApprovalsTotal(res.data?.pagination?.total || list.length);
                setCanApprove(Boolean(isAdmin || res.data?.isApprover || list.length > 0));
            } else if (activeTab === 'all') {
                const res = await getAllClaims({ page: p, limit: LIMIT, status: statusFilter || undefined });
                setAllClaims(res.data?.claims || []);
            }
            loadStats();
        } catch (err) {
            toast.error('Failed to load reimbursement claims.');
        } finally {
            setLoading(false);
        }
    }, [activeTab, statusFilter, isAdmin, loadStats]);

    // Initial check for approvals count & permissions
    useEffect(() => {
        getPendingApprovals()
            .then(res => {
                const list = res.data?.claims || [];
                setApprovalsTotal(res.data?.pagination?.total || list.length);
                if (isAdmin || res.data?.isApprover || list.length > 0) {
                    setCanApprove(true);
                }
            })
            .catch(() => {});
    }, [isAdmin]);

    useEffect(() => {
        setPage(1);
        loadData(1);
    }, [activeTab, statusFilter, loadData]);

    const getCurrentList = () => {
        if (activeTab === 'my-claims') return claims;
        if (activeTab === 'approvals') return approvals;
        return allClaims;
    };

    const currentList = getCurrentList();
    const filtered = search.trim()
        ? currentList.filter(c =>
            c.category?.toLowerCase().includes(search.toLowerCase()) ||
            c.description?.toLowerCase().includes(search.toLowerCase()) ||
            (c.employee?.firstName && `${c.employee?.firstName} ${c.employee?.lastName}`.toLowerCase().includes(search.toLowerCase()))
          )
        : currentList;

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
                            <h1 className="text-xl font-bold text-slate-900">
                                {activeTab === 'approvals' ? 'Approval Queue' : activeTab === 'all' ? 'All Company Reimbursements' : 'My Reimbursements'}
                            </h1>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {activeTab === 'approvals'
                                    ? 'Review, approve, or reject team expense claims'
                                    : activeTab === 'all'
                                    ? 'Complete overview of all submitted expense claims'
                                    : 'Track and manage your expense claims'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { loadData(page); loadStats(); }}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 transition-colors"
                            title="Refresh"
                        >
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
                        <button
                            onClick={() => setShowSubmit(true)}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={16} /> Submit Claim
                        </button>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
                {/* Stat Cards */}
                {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatCard
                            icon={Clock}
                            label={activeTab === 'my-claims' ? 'My Pending' : 'Pending Approvals'}
                            value={stats.pending}
                            color={{ bg: 'bg-amber-50', border: 'border-amber-100', icon: 'bg-amber-100 text-amber-600' }}
                        />
                        <StatCard
                            icon={CheckCircle2}
                            label="Approved"
                            value={stats.approved}
                            color={{ bg: 'bg-green-50', border: 'border-green-100', icon: 'bg-green-100 text-green-600' }}
                        />
                        <StatCard
                            icon={Banknote}
                            label="Reimbursed"
                            value={stats.reimbursed}
                            color={{ bg: 'bg-purple-50', border: 'border-purple-100', icon: 'bg-purple-100 text-purple-600' }}
                        />
                        <StatCard
                            icon={TrendingUp}
                            label={activeTab === 'my-claims' ? 'Total Claimed' : 'Company Total'}
                            value={formatINR(stats.totalClaimed)}
                            color={{ bg: 'bg-blue-50', border: 'border-blue-100', icon: 'bg-blue-100 text-blue-600' }}
                        />
                    </div>
                )}

                {/* Tabs: My Claims vs Approval Queue vs All Requests */}
                {canApprove && (
                    <div className="flex border-b border-slate-200 gap-6">
                        <button
                            onClick={() => { setActiveTab('my-claims'); setStatusFilter(''); }}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2
                                ${activeTab === 'my-claims' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <ReceiptText size={16} />
                            My Claims
                        </button>
                        <button
                            onClick={() => { setActiveTab('approvals'); setStatusFilter(''); }}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2
                                ${activeTab === 'approvals' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <Users size={16} />
                            Approval Queue
                            {approvalsTotal > 0 && (
                                <span className="rounded-full bg-amber-500 text-white px-2 py-0.5 text-xs font-bold">
                                    {approvalsTotal}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => { setActiveTab('all'); setStatusFilter(''); }}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2
                                ${activeTab === 'all' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <Layers size={16} />
                            All Requests
                        </button>
                    </div>
                )}

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder={activeTab === 'my-claims' ? "Search by category or description..." : "Search by employee, category or description..."}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    {activeTab !== 'approvals' && (
                        <div className="flex items-center gap-2">
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                            >
                                <option value="">All Statuses</option>
                                {CLAIM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {/* Claims List */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader size={32} className="animate-spin text-blue-500" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl mb-4 ${activeTab === 'my-claims' ? 'bg-slate-100 text-slate-400' : 'bg-green-100 text-green-600'}`}>
                            {activeTab === 'my-claims' ? <ReceiptText size={24} /> : <CheckCircle2 size={24} />}
                        </div>
                        <p className="text-base font-semibold text-slate-700">
                            {activeTab === 'my-claims' ? 'No claims found' : activeTab === 'approvals' ? 'All caught up!' : 'No records found'}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                            {activeTab === 'my-claims'
                                ? (statusFilter ? 'Try changing the status filter.' : 'Submit your first expense claim to get started.')
                                : activeTab === 'approvals'
                                ? 'No claims currently awaiting your approval.'
                                : 'No claims match the selected filters.'}
                        </p>
                        {activeTab === 'my-claims' && !statusFilter && (
                            <button
                                onClick={() => setShowSubmit(true)}
                                className="mt-5 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                                <Plus size={16} /> Submit Claim
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(claim => (
                            <ClaimRow
                                key={claim._id}
                                claim={claim}
                                showEmployee={activeTab !== 'my-claims'}
                                onClick={() => {
                                    setSelectedClaimId(claim._id);
                                    setDrawerIsApprover(activeTab === 'approvals' || (activeTab === 'all' && isAdmin));
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals / Drawers */}
            {showSubmit && <SubmitClaimModal onClose={() => setShowSubmit(false)} onSuccess={() => { loadData(page); loadStats(); }} />}
            {showSettings && <ReimbursementSettingsModal onClose={() => setShowSettings(false)} onSuccess={() => { loadData(page); loadStats(); }} />}
            {selectedClaimId && (
                <ClaimDetailDrawer
                    claimId={selectedClaimId}
                    isApprover={drawerIsApprover}
                    isFinance={isAdmin}
                    onClose={() => setSelectedClaimId(null)}
                    onRefresh={() => { loadData(page); loadStats(); }}
                />
            )}
        </div>
    );
};

export default MyClaims;
