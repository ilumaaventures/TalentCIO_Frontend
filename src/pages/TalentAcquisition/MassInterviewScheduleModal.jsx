import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Check, ChevronRight, Clock, Loader, Search, User, Users, X } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const MassInterviewScheduleModal = ({
    isOpen,
    onClose,
    candidates = [],
    initialSelectedIds = [],
    hiringRequestId,
    activePhase,
    onScheduled
}) => {
    const [step, setStep] = useState(1);
    const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
    const [search, setSearch] = useState('');
    const [levelName, setLevelName] = useState('');
    const [assignedTo, setAssignedTo] = useState([]);
    const [scheduledDate, setScheduledDate] = useState('');
    const [phase, setPhase] = useState(activePhase || 1);
    const [interviewers, setInterviewers] = useState([]);
    const [loadingInterviewers, setLoadingInterviewers] = useState(false);
    const [interviewerSearch, setInterviewerSearch] = useState('');
    const [scheduling, setScheduling] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setStep(1);
        setSelectedIds(initialSelectedIds);
        setSearch('');
        setLevelName('');
        setAssignedTo([]);
        setScheduledDate('');
        setPhase(activePhase || 1);
        setInterviewerSearch('');
    }, [isOpen, initialSelectedIds, activePhase]);

    useEffect(() => {
        if (!isOpen) return;
        let active = true;

        const fetchInterviewers = async () => {
            try {
                setLoadingInterviewers(true);
                const response = await api.get('/admin/users');
                const users = response.data?.success
                    ? (response.data.data || [])
                    : (Array.isArray(response.data) ? response.data : []);

                if (active) {
                    setInterviewers(users.filter((u) => u.isActive !== false));
                }
            } catch (error) {
                console.error('Failed to load interviewers:', error);
            } finally {
                if (active) setLoadingInterviewers(false);
            }
        };

        fetchInterviewers();
        return () => { active = false; };
    }, [isOpen]);

    const filteredCandidates = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        if (!normalizedSearch) return candidates;
        return candidates.filter((c) => {
            const haystack = `${c.candidateName || ''} ${c.email || ''}`.toLowerCase();
            return haystack.includes(normalizedSearch);
        });
    }, [candidates, search]);

    const selectedCandidates = useMemo(
        () => candidates.filter((c) => selectedIds.includes(c._id)),
        [candidates, selectedIds]
    );

    const filteredInterviewers = useMemo(() => {
        const normalizedSearch = interviewerSearch.trim().toLowerCase();
        if (!normalizedSearch) return interviewers;
        return interviewers.filter((u) => {
            const name = `${u.firstName || ''} ${u.lastName || ''} ${u.email || ''}`.toLowerCase();
            return name.includes(normalizedSearch);
        });
    }, [interviewers, interviewerSearch]);

    const toggleCandidate = useCallback((candidateId) => {
        setSelectedIds((prev) =>
            prev.includes(candidateId)
                ? prev.filter((id) => id !== candidateId)
                : [...prev, candidateId]
        );
    }, []);

    const selectAll = useCallback(() => {
        setSelectedIds(filteredCandidates.map((c) => c._id));
    }, [filteredCandidates]);

    const deselectAll = useCallback(() => {
        setSelectedIds([]);
    }, []);

    const toggleInterviewer = useCallback((userId) => {
        setAssignedTo((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        );
    }, []);

    const canProceedStep1 = selectedIds.length >= 1;
    const canProceedStep2 = levelName.trim().length > 0;

    const handleSubmit = async () => {
        if (!canProceedStep2) {
            toast.error('Round name is required.');
            setStep(2);
            return;
        }

        if (selectedIds.length === 0) {
            toast.error('Select at least one candidate.');
            setStep(1);
            return;
        }

        try {
            setScheduling(true);
            const payload = {
                candidateIds: selectedIds,
                levelName: levelName.trim(),
                assignedTo,
                scheduledDate: scheduledDate || undefined,
                phase
            };

            const response = await api.post('/ta/candidates/bulk-schedule-interview', payload);
            const { scheduled, failed, errors } = response.data;

            if (scheduled > 0) {
                toast.success(`Interview "${levelName}" scheduled for ${scheduled} candidate(s)`);
            }

            if (failed > 0) {
                toast.error(`Failed for ${failed} candidate(s)`);
                console.warn('Bulk schedule failures:', errors);
            }

            onScheduled?.();
            onClose();
        } catch (error) {
            console.error('Bulk schedule failed:', error);
            toast.error(error.response?.data?.message || 'Failed to schedule interviews');
        } finally {
            setScheduling(false);
        }
    };

    if (!isOpen) return null;

    const stepLabels = ['Select Candidates', 'Configure Interview', 'Review & Schedule'];

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/30 bg-slate-50 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Mass Interview Schedule</p>
                        <h3 className="mt-1 text-xl font-bold text-slate-900">Schedule interviews for multiple candidates</h3>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>

                {/* Step indicator */}
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {stepLabels.map((label, index) => {
                            const stepNumber = index + 1;
                            const isActive = step === stepNumber;
                            const isCompleted = step > stepNumber;
                            return (
                                <React.Fragment key={stepNumber}>
                                    {index > 0 && <ChevronRight size={14} className="text-slate-300" />}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (stepNumber === 2 && !canProceedStep1) return;
                                            if (stepNumber === 3 && (!canProceedStep1 || !canProceedStep2)) return;
                                            setStep(stepNumber);
                                        }}
                                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                                            isActive
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : isCompleted
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-white text-slate-500 ring-1 ring-slate-200'
                                        }`}
                                    >
                                        {isCompleted ? <Check size={12} /> : null}
                                        {label}
                                    </button>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {/* STEP 1: Select Candidates */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="relative flex-1">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search candidates..."
                                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <button type="button" onClick={selectAll} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                                    Select All
                                </button>
                                <button type="button" onClick={deselectAll} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                                    Deselect All
                                </button>
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                    {selectedIds.length} selected
                                </span>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white">
                                <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
                                    {filteredCandidates.length === 0 ? (
                                        <p className="px-4 py-8 text-center text-sm text-slate-500">No candidates match your search.</p>
                                    ) : (
                                        filteredCandidates.map((candidate) => {
                                            const checked = selectedIds.includes(candidate._id);
                                            return (
                                                <label key={candidate._id} className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-slate-50 ${checked ? 'bg-blue-50/50' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleCandidate(candidate._id)}
                                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-slate-800">{candidate.candidateName}</p>
                                                        <p className="text-xs text-slate-500">{candidate.email} · {candidate.status || 'N/A'}</p>
                                                    </div>
                                                    {candidate.mobile && (
                                                        <span className="hidden text-xs text-slate-400 sm:inline">{candidate.mobile}</span>
                                                    )}
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Configure Interview */}
                    {step === 2 && (
                        <div className="grid gap-6 lg:grid-cols-2">
                            <div className="space-y-5">
                                {/* Round Name */}
                                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                        Round Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={levelName}
                                        onChange={(e) => setLevelName(e.target.value)}
                                        placeholder="e.g. L1 - Technical, HR Round, Managerial"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Scheduled Date & Time */}
                                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                        <Calendar size={14} />
                                        Scheduled Date & Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={scheduledDate}
                                        onChange={(e) => setScheduledDate(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="mt-2 text-xs text-slate-500">Leave empty to create a pending round without a specific date.</p>
                                </div>

                                {/* Phase */}
                                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                        <Clock size={14} />
                                        Phase
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={phase}
                                        onChange={(e) => setPhase(Number(e.target.value) || 1)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Assign Interviewers */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                    <Users size={14} />
                                    Assign Interviewers
                                </label>
                                {assignedTo.length > 0 && (
                                    <div className="mb-3 flex flex-wrap gap-2">
                                        {assignedTo.map((userId) => {
                                            const user = interviewers.find((u) => u._id === userId);
                                            const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : userId;
                                            return (
                                                <span key={userId} className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                                    <User size={12} />
                                                    {name}
                                                    <button type="button" onClick={() => toggleInterviewer(userId)} className="ml-0.5 text-blue-500 hover:text-blue-800">
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                                <div className="relative mb-3">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={interviewerSearch}
                                        onChange={(e) => setInterviewerSearch(e.target.value)}
                                        placeholder="Search interviewers..."
                                        className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                {loadingInterviewers ? (
                                    <div className="flex items-center justify-center py-6 text-sm text-slate-500">
                                        <Loader size={16} className="mr-2 animate-spin" /> Loading...
                                    </div>
                                ) : (
                                    <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
                                        {filteredInterviewers.length === 0 ? (
                                            <p className="px-3 py-4 text-center text-xs text-slate-500">No users found.</p>
                                        ) : (
                                            filteredInterviewers.map((user) => {
                                                const isSelected = assignedTo.includes(user._id);
                                                const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                                                return (
                                                    <label key={user._id} className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-slate-50 ${isSelected ? 'bg-blue-50/50' : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleInterviewer(user._id)}
                                                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-slate-800">{name}</p>
                                                            <p className="text-[11px] text-slate-500">{user.email}</p>
                                                        </div>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Review & Confirm */}
                    {step === 3 && (
                        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                            {/* Configuration Summary */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                <h4 className="mb-4 text-sm font-bold text-slate-800">Interview Configuration</h4>
                                <div className="space-y-3 text-sm text-slate-600">
                                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                                        <Calendar size={16} className="mt-0.5 flex-shrink-0 text-blue-600" />
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Round Name</p>
                                            <p className="mt-0.5 font-semibold text-slate-900">{levelName || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                                        <Clock size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Scheduled Date</p>
                                            <p className="mt-0.5 font-semibold text-slate-900">
                                                {scheduledDate ? new Date(scheduledDate).toLocaleString() : 'Not set (Pending)'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                                        <Users size={16} className="mt-0.5 flex-shrink-0 text-violet-600" />
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Interviewers ({assignedTo.length})</p>
                                            {assignedTo.length === 0 ? (
                                                <p className="mt-0.5 text-slate-500 italic">None assigned</p>
                                            ) : (
                                                <div className="mt-1 flex flex-wrap gap-1.5">
                                                    {assignedTo.map((userId) => {
                                                        const user = interviewers.find((u) => u._id === userId);
                                                        return (
                                                            <span key={userId} className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                                                                {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : userId}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                                        <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-emerald-600 text-[10px] font-bold text-white">
                                            {phase}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Phase</p>
                                            <p className="mt-0.5 font-semibold text-slate-900">Phase {phase}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Candidate List */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-slate-800">Candidates ({selectedCandidates.length})</h4>
                                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                                        Will be scheduled
                                    </span>
                                </div>
                                <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
                                    {selectedCandidates.length === 0 ? (
                                        <p className="px-4 py-8 text-center text-sm text-slate-500">No candidates selected.</p>
                                    ) : (
                                        selectedCandidates.map((candidate) => (
                                            <div key={candidate._id} className="flex items-center gap-3 px-4 py-3">
                                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                                    {(candidate.candidateName || '?')[0].toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800">{candidate.candidateName}</p>
                                                    <p className="text-[11px] text-slate-500">{candidate.email}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
                    <button
                        type="button"
                        onClick={() => step === 1 ? onClose() : setStep((prev) => Math.max(1, prev - 1))}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>
                    <div className="flex items-center gap-3">
                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (step === 1 && !canProceedStep1) {
                                        toast.error('Select at least one candidate.');
                                        return;
                                    }
                                    if (step === 2 && !canProceedStep2) {
                                        toast.error('Round name is required.');
                                        return;
                                    }
                                    setStep((prev) => Math.min(3, prev + 1));
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={scheduling}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Calendar size={16} />
                                {scheduling ? 'Scheduling...' : `Schedule ${selectedCandidates.length} Interview(s)`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MassInterviewScheduleModal;
