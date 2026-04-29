import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRightLeft, Search, Send, X } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const BulkTransferModal = ({
    isOpen,
    onClose,
    candidates = [],
    fromHiringRequestId,
    initialSelectedIds = [],
    onTransferred
}) => {
    const [approvedRequisitions, setApprovedRequisitions] = useState([]);
    const [loadingRequisitions, setLoadingRequisitions] = useState(false);
    const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
    const [targetRequisitionId, setTargetRequisitionId] = useState('');
    const [search, setSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setSelectedIds(initialSelectedIds);
        setTargetRequisitionId('');
        setSearch('');
    }, [isOpen, initialSelectedIds]);

    useEffect(() => {
        if (!isOpen) return;
        let active = true;
        const loadApprovedRequisitions = async () => {
            try {
                setLoadingRequisitions(true);
                const response = await api.get('/ta/hiring-request?status=Approved&page=1&limit=200');
                if (!active) return;
                setApprovedRequisitions(response.data?.requests || []);
            } catch (error) {
                console.error('Failed to fetch approved requisitions', error);
                toast.error('Failed to load approved requisitions');
            } finally {
                if (active) setLoadingRequisitions(false);
            }
        };
        loadApprovedRequisitions();
        return () => {
            active = false;
        };
    }, [isOpen]);

    const visibleRequisitions = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        return approvedRequisitions.filter((request) => {
            if (String(request._id) === String(fromHiringRequestId)) return false;
            if (!normalizedSearch) return true;
            return [
                request.requestId,
                request.roleDetails?.title,
                request.client
            ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
        });
    }, [approvedRequisitions, fromHiringRequestId, search]);

    const targetRequest = approvedRequisitions.find((request) => request._id === targetRequisitionId);

    const toggleCandidate = (candidateId) => {
        setSelectedIds((prev) => (
            prev.includes(candidateId)
                ? prev.filter((id) => id !== candidateId)
                : [...prev, candidateId]
        ));
    };

    const handleSubmit = async () => {
        if (!selectedIds.length) {
            toast.error('Select at least one candidate.');
            return;
        }
        if (!targetRequisitionId) {
            toast.error('Select a target requisition.');
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                transfers: selectedIds.map((candidateId) => ({
                    candidateId,
                    fromRequisitionId: fromHiringRequestId,
                    toRequisitionId: targetRequisitionId
                }))
            };

            const response = await api.post('/ta/transfer-candidates-bulk', payload);
            toast.success(`Transferred ${response.data.transferred} candidates`);
            onTransferred?.(response.data);
            onClose();
        } catch (error) {
            console.error('Bulk transfer failed', error);
            toast.error(error.response?.data?.message || 'Failed to transfer candidates');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/30 bg-slate-50 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Candidate Transfer</p>
                        <h3 className="mt-1 text-xl font-bold text-slate-900">Transfer candidates to another requisition</h3>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>

                <div className="grid gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white">
                            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                                <h4 className="text-sm font-bold text-slate-800">Select Candidates</h4>
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{selectedIds.length} selected</span>
                            </div>
                            <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
                                {candidates.map((candidate) => (
                                    <label key={candidate._id} className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(candidate._id)}
                                            onChange={() => toggleCandidate(candidate._id)}
                                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-800">{candidate.candidateName}</p>
                                            <p className="text-xs text-slate-500">{candidate.email}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search requisition, title, or client"
                                    className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="mt-4 max-h-[280px] overflow-y-auto space-y-2">
                                {visibleRequisitions.map((request) => (
                                    <button
                                        key={request._id}
                                        type="button"
                                        onClick={() => setTargetRequisitionId(request._id)}
                                        className={`w-full rounded-xl border p-3 text-left transition ${targetRequisitionId === request._id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                                    >
                                        <p className="text-sm font-bold text-slate-800">{request.requestId}</p>
                                        <p className="text-xs text-slate-500">{request.roleDetails?.title} · {request.client}</p>
                                    </button>
                                ))}
                                {!visibleRequisitions.length && (
                                    <p className="text-sm text-slate-500">{loadingRequisitions ? 'Loading requisitions...' : 'No approved requisitions found.'}</p>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <ArrowRightLeft size={16} className="text-blue-600" />
                                <h4 className="text-sm font-bold text-slate-800">Confirm</h4>
                            </div>
                            <p className="text-sm text-slate-600">
                                Candidates selected: <span className="font-bold text-slate-900">{selectedIds.length}</span>
                            </p>
                            <p className="mt-2 text-sm text-slate-600">
                                Target requisition: <span className="font-bold text-slate-900">{targetRequest ? `${targetRequest.requestId} · ${targetRequest.roleDetails?.title}` : 'Not selected'}</span>
                            </p>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Send size={16} />
                                {submitting ? 'Transferring...' : 'Transfer Candidates'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BulkTransferModal;
