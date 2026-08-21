import React, { useState, useEffect } from 'react';
import {
    X, Download, ExternalLink, CheckCircle2, XCircle, Clock,
    FileText, Image as ImageIcon, MessageSquare, Loader, CreditCard,
    ReceiptText, ChevronRight, User, Check, ShieldCheck, Printer
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import { getClaimById, actionClaim, cancelClaim, markReimbursed } from '../api/reimbursementApi';
import { getStatusStyle, isActionable, isCancellable, formatINR } from '../utils/reimbursementConstants';

// ─── Vertical stepper step ─────────────────────────────────────────────────────

const TrailStep = ({ step, isLast }) => {
    const isApproved = step.action === 'Approved';
    const isRejected = step.action === 'Rejected';

    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                    ${isApproved ? 'bg-green-100 text-green-600' : isRejected ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                    {isApproved ? <CheckCircle2 size={16} /> : isRejected ? <XCircle size={16} /> : <Clock size={16} />}
                </div>
                {!isLast && <div className="mt-1 w-px flex-1 bg-slate-100" style={{ minHeight: 24 }} />}
            </div>
            <div className="pb-5 pt-0.5 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                        ${isApproved ? 'bg-green-50 text-green-700' : isRejected ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                        Level {step.level} — {step.action}
                    </span>
                    <span className="text-[11px] text-slate-400">
                        {step.actedAt ? format(new Date(step.actedAt), 'dd MMM yyyy, h:mm a') : ''}
                    </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                    Approver: {step.approver?.firstName} {step.approver?.lastName}
                </p>
                {step.comment && (
                    <p className="mt-1 text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                        "{step.comment}"
                    </p>
                )}
            </div>
        </div>
    );
};

// ─── Claim detail drawer ───────────────────────────────────────────────────────

const ClaimDetailDrawer = ({ claimId, onClose, onRefresh, isApprover = false, isFinance = false }) => {
    const { user } = useAuth();
    const [claim, setClaim]   = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionModal, setActionModal] = useState(null); // 'approve' | 'reject' | 'reimburse' | 'cancel'
    const [comment, setComment] = useState('');
    const [payRef, setPayRef]   = useState('');
    const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
    const [payNote, setPayNote] = useState('');
    const [acting, setActing]   = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await getClaimById(claimId);
            setClaim(res.data?.claim || null);
        } catch (err) {
            toast.error('Failed to load claim details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (claimId) load(); }, [claimId]);

    // Escape key
    useEffect(() => {
        const h = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [onClose]);

    const handleAction = async () => {
        if (!actionModal) return;
        setActing(true);
        try {
            if (actionModal === 'reimburse') {
                await markReimbursed(claimId, { paymentReference: payRef, paymentDate: payDate, paymentNote: payNote });
                toast.success('Claim marked as Reimbursed.');
            } else if (actionModal === 'cancel') {
                await cancelClaim(claimId);
                toast.success('Claim cancelled.');
            } else {
                await actionClaim(claimId, { action: actionModal, comment });
                toast.success(`Claim ${actionModal === 'approve' ? 'approved' : 'rejected'} successfully.`);
            }
            setActionModal(null);
            setComment('');
            onRefresh?.();
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed.');
        } finally {
            setActing(false);
        }
    };

    const statusStyle = claim ? getStatusStyle(claim.status) : {};

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs"
        >
            <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                            <ReceiptText size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Expense Claim Form</h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Submitted {claim?.createdAt ? format(new Date(claim.createdAt), 'PPP') : '—'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-1 items-center justify-center">
                        <Loader size={28} className="animate-spin text-blue-500" />
                    </div>
                ) : !claim ? (
                    <div className="flex flex-1 items-center justify-center text-slate-400 text-sm">Claim not found.</div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* SECTION 1: EMPLOYEE INFO */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Employee Information</h3>
                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                                        {claim.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                    <div>
                                        <span className="text-slate-400 block text-[11px]">Employee Name:</span>
                                        <span className="font-bold text-slate-800 text-sm mt-0.5 block truncate">
                                            {claim.employee?.firstName} {claim.employee?.lastName}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[11px]">Employee ID:</span>
                                        <span className="font-semibold text-slate-800 mt-0.5 block">
                                            {claim.employeeCode || claim.employee?.employeeCode || claim.employee?.employeeId || '—'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[11px]">Department:</span>
                                        <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                                            {claim.department || claim.employee?.department || '—'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[11px]">Date Submitted:</span>
                                        <span className="font-semibold text-slate-800 mt-0.5 block">
                                            {claim.createdAt ? format(new Date(claim.createdAt), 'dd/MM/yyyy') : '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: EXPENSE DETAILS TABLE */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Expense Details</h3>
                                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                                                <th className="py-2.5 px-3">Date of Expense</th>
                                                <th className="py-2.5 px-3">Description</th>
                                                <th className="py-2.5 px-3">Category Type</th>
                                                <th className="py-2.5 px-3 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {claim.items?.length > 0 ? (
                                                claim.items.map((it, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="p-3 text-slate-700 whitespace-nowrap">
                                                            {it.expenseDate ? format(new Date(it.expenseDate), 'dd/MM/yyyy') : '—'}
                                                        </td>
                                                        <td className="p-3 font-medium text-slate-800">{it.description}</td>
                                                        <td className="p-3 text-slate-600">
                                                            <span className="rounded-md bg-purple-50 text-purple-700 px-2 py-0.5 font-semibold text-[11px] border border-purple-100">
                                                                {it.otherCategoryName ? `Other (${it.otherCategoryName})` : it.category}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 font-bold text-slate-900 text-right whitespace-nowrap">
                                                            {formatINR(it.amount)}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr className="hover:bg-slate-50/50">
                                                    <td className="p-3 text-slate-700 whitespace-nowrap">
                                                        {claim.expenseDate ? format(new Date(claim.expenseDate), 'dd/MM/yyyy') : '—'}
                                                    </td>
                                                    <td className="p-3 font-medium text-slate-800">{claim.description}</td>
                                                    <td className="p-3 text-slate-600">
                                                        <span className="rounded-md bg-purple-50 text-purple-700 px-2 py-0.5 font-semibold text-[11px] border border-purple-100">
                                                            {claim.otherCategoryName ? `Other (${claim.otherCategoryName})` : claim.category}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 font-bold text-slate-900 text-right whitespace-nowrap">
                                                        {formatINR(claim.amount)}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-end mt-3">
                                    <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-2 border border-slate-200">
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Total Amount:</span>
                                        <span className="text-base font-black text-slate-900">{formatINR(claim.amount)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: RECEIPTS */}
                            {claim.receipts?.length > 0 && (
                                <div>
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">Receipts & Invoices ({claim.receipts.length})</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {claim.receipts.map((r, i) => (
                                            <a
                                                key={i}
                                                href={r.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 hover:border-blue-300 hover:bg-blue-50/50 transition-colors group"
                                            >
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:text-blue-600">
                                                    {r.resourceType === 'image' ? <ImageIcon size={15} /> : <FileText size={15} />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-medium text-slate-700 group-hover:text-blue-700">{r.name || `Receipt ${i + 1}`}</p>
                                                    <p className="text-[10px] text-slate-400">View Document</p>
                                                </div>
                                                <ExternalLink size={12} className="text-slate-300 group-hover:text-blue-400" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SECTION 4: APPROVAL HISTORY */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Approval History</h3>
                                {claim.approvalTrail?.length > 0 ? (
                                    <div>
                                        {claim.approvalTrail.map((step, i) => (
                                            <TrailStep key={i} step={step} isLast={i === claim.approvalTrail.length - 1} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700">
                                        <Clock size={15} className="text-amber-500 shrink-0" />
                                        <span>Awaiting Level {claim.currentLevel || 1} approval from assigned approver.</span>
                                    </div>
                                )}
                            </div>

                            {/* Payment Info if Reimbursed */}
                            {claim.status === 'Reimbursed' && (
                                <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 text-xs space-y-1.5">
                                    <div className="flex items-center gap-2 font-bold text-purple-900">
                                        <CreditCard size={14} />
                                        <span>Payment Settlement Information</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                                        <div>Reference: <strong className="text-slate-900">{claim.paymentReference || 'N/A'}</strong></div>
                                        <div>Date: <strong className="text-slate-900">{claim.paymentDate ? format(new Date(claim.paymentDate), 'dd MMM yyyy') : '—'}</strong></div>
                                    </div>
                                    {claim.paymentNote && <p className="text-slate-500 italic mt-1">Note: {claim.paymentNote}</p>}
                                </div>
                            )}
                        </div>

                        {/* Drawer Action Footer */}
                        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs text-slate-500">
                                Total: <strong className="text-slate-900 text-sm">{formatINR(claim.amount)}</strong>
                            </div>
                            <div className="flex items-center gap-2">
                                {isApprover && String(claim?.employee?._id || claim?.employee) !== String(user?._id) && isActionable(claim.status) && (
                                    <>
                                        <button
                                            onClick={() => setActionModal('reject')}
                                            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => setActionModal('approve')}
                                            className="rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 shadow-sm transition-colors"
                                        >
                                            Approve Claim
                                        </button>
                                    </>
                                )}

                                {claim.status === 'Approved' && isFinance && (
                                    <button
                                        onClick={() => setActionModal('reimburse')}
                                        className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 shadow-sm transition-colors"
                                    >
                                        Mark as Reimbursed
                                    </button>
                                )}

                                {String(claim?.employee?._id || claim?.employee) === String(user?._id) && isCancellable(claim.status) && (
                                    <button
                                        onClick={() => setActionModal('cancel')}
                                        className="rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        Cancel Claim
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Inline Action Confirmation Modal */}
                {actionModal && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 p-4">
                        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                            <h3 className="text-base font-bold text-slate-900 capitalize">
                                {actionModal === 'reimburse' ? 'Confirm Payment Settlement' :
                                 actionModal === 'cancel'    ? 'Cancel Claim' :
                                 `${actionModal} Claim`}
                            </h3>

                            {actionModal === 'reimburse' ? (
                                <div className="space-y-3 text-xs">
                                    <div>
                                        <label className="block font-semibold text-slate-700 mb-1">Payment Reference / UTR *</label>
                                        <input
                                            type="text"
                                            value={payRef}
                                            onChange={e => setPayRef(e.target.value)}
                                            placeholder="e.g. UTR123456789"
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
                                        <input
                                            type="date"
                                            value={payDate}
                                            onChange={e => setPayDate(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 mb-1">Payment Note</label>
                                        <input
                                            type="text"
                                            value={payNote}
                                            onChange={e => setPayNote(e.target.value)}
                                            placeholder="Bank transfer details"
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-purple-500"
                                        />
                                    </div>
                                </div>
                            ) : actionModal !== 'cancel' ? (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Comment / Note {actionModal === 'reject' ? '*' : '(optional)'}
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                        placeholder={actionModal === 'reject' ? 'Reason for rejection...' : 'Add an approval note...'}
                                        className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 outline-none focus:border-blue-500"
                                    />
                                </div>
                            ) : (
                                <p className="text-xs text-slate-600">Are you sure you want to cancel this reimbursement claim? This cannot be undone.</p>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={() => setActionModal(null)}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAction}
                                    disabled={acting || (actionModal === 'reject' && !comment.trim()) || (actionModal === 'reimburse' && !payRef.trim())}
                                    className={`rounded-xl px-5 py-2 text-xs font-bold text-white disabled:opacity-60
                                        ${actionModal === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                                          actionModal === 'reimburse' ? 'bg-purple-600 hover:bg-purple-700' :
                                          'bg-green-600 hover:bg-green-700'}`}
                                >
                                    {acting && <Loader size={12} className="animate-spin inline mr-1" />}
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClaimDetailDrawer;
