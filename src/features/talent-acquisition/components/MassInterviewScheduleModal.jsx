import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Check, ChevronRight, Clock, Edit3, Eye, Loader, Mail, Search, User, Users, X } from 'lucide-react';
import api from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { renderTemplateBody, resolveTemplate } from '@/features/email/utils/templatePlaceholders';

const QUICK_PLACEHOLDERS = [
    { label: 'Candidate Name', token: 'candidateName' },
    { label: 'First Name', token: 'firstName' },
    { label: 'Round Name', token: 'roundName' },
    { label: 'Interview Date', token: 'interviewDate' },
    { label: 'Interviewer Name', token: 'interviewerName' },
    { label: 'Job Title', token: 'jobTitle' },
    { label: 'Company / Client', token: 'companyName' },
    { label: 'Additional Details', token: 'additionalDetails' }
];

const MassInterviewScheduleModal = ({
    isOpen,
    onClose,
    candidates = [],
    initialSelectedIds = [],
    hiringRequestId,
    activePhase,
    onScheduled
}) => {
    const createNewRound = useCallback((index = 1) => ({
        id: Date.now() + Math.random(),
        levelName: `Round ${index}`,
        assignAfterStage: Number(activePhase) === 2 ? 'Shortlisted' : 'Interested',
        scheduledDate: '',
        phase: activePhase || 1,
        assignedTo: [],
        customFields: [],
        sendCandidateEmail: true,
        sendInterviewerEmail: true,
        emailRecipientIds: initialSelectedIds,
        emailTemplateId: '',
        selectedEmailAccountId: '',
        cc: '',
        bcc: '',
        customSubject: '',
        customHtmlBody: ''
    }), [activePhase, initialSelectedIds]);

    const [step, setStep] = useState(1);
    const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
    const [search, setSearch] = useState('');
    const [rounds, setRounds] = useState([createNewRound(1)]);
    const [activeRoundIndex, setActiveRoundIndex] = useState(0);
    const [interviewers, setInterviewers] = useState([]);
    const [loadingInterviewers, setLoadingInterviewers] = useState(false);
    const [interviewerSearch, setInterviewerSearch] = useState('');
    const [scheduling, setScheduling] = useState(false);
    const [emailTemplates, setEmailTemplates] = useState([]);
    const [senderOptions, setSenderOptions] = useState([]);

    // Email Preview and Editing States
    const [previewCandidateId, setPreviewCandidateId] = useState('');
    const [previewTarget, setPreviewTarget] = useState('candidate'); // 'candidate' | 'interviewer'
    const [viewMode, setViewMode] = useState('details'); // 'details' | 'email' | 'preview'

    const activeRound = useMemo(() => rounds[activeRoundIndex] || rounds[0], [rounds, activeRoundIndex]);

    const updateActiveRound = (field, value) => {
        setRounds((prev) => {
            const next = [...prev];
            if (next[activeRoundIndex]) {
                next[activeRoundIndex] = { ...next[activeRoundIndex], [field]: value };
            }
            return next;
        });
    };

    const addRound = () => {
        setRounds((prev) => [...prev, createNewRound(prev.length + 1)]);
        setActiveRoundIndex(rounds.length);
    };

    const removeRound = (indexToRemove) => {
        if (rounds.length <= 1) return;
        setRounds((prev) => prev.filter((_, idx) => idx !== indexToRemove));
        setActiveRoundIndex((prev) => Math.max(0, Math.min(prev, rounds.length - 2)));
    };

    useEffect(() => {
        if (!isOpen) return;
        setStep(1);
        setSelectedIds(initialSelectedIds);
        setSearch('');
        setRounds([createNewRound(1)]);
        setActiveRoundIndex(0);
        setInterviewerSearch('');
        setPreviewCandidateId('');
        setPreviewTarget('candidate');
        setViewMode('details');
    }, [isOpen, initialSelectedIds, createNewRound]);

    useEffect(() => {
        if (!isOpen) return;
        let active = true;

        const fetchInterviewers = async () => {
            try {
                setLoadingInterviewers(true);
                const [usersRes, tmplRes, senderRes] = await Promise.all([
                    api.get('/admin/users'),
                    api.get('/ta/email-templates').catch(() => ({ data: [] })),
                    api.get('/company/email-settings/senders').catch(() => ({ data: {} }))
                ]);
                const users = usersRes.data?.success
                    ? (usersRes.data.data || [])
                    : (Array.isArray(usersRes.data) ? usersRes.data : []);
                const tmpls = tmplRes.data?.data || (Array.isArray(tmplRes.data) ? tmplRes.data : []);

                const senderData = senderRes.data || {};
                const nextSenderOptions = [
                    senderData.platformOption,
                    ...((senderData.accounts || []).filter((a) => a.ready))
                ].filter(Boolean);

                if (active) {
                    setInterviewers(users.filter((u) => u.isActive !== false));
                    setEmailTemplates(tmpls);
                    setSenderOptions(nextSenderOptions);
                    const defaultAccId = nextSenderOptions.some((o) => o._id === senderData.defaultAccountId)
                        ? senderData.defaultAccountId
                        : (nextSenderOptions[0]?._id || '');
                    updateActiveRound('selectedEmailAccountId', defaultAccId);
                }
            } catch (error) {
                console.error('Failed to load interviewers/templates:', error);
            } finally {
                if (active) setLoadingInterviewers(false);
            }
        };

        fetchInterviewers();
        return () => { active = false; };
    }, [isOpen]);

    const activeTemplate = useMemo(
        () => emailTemplates.find((t) => t._id === activeRound?.emailTemplateId),
        [emailTemplates, activeRound?.emailTemplateId]
    );

    useEffect(() => {
        if (activeRound?.emailTemplateId && activeTemplate) {
            updateActiveRound('customSubject', activeTemplate.subject || '');
            updateActiveRound('customHtmlBody', activeTemplate.htmlBody || '');
        }
    }, [activeTemplate, activeRound?.emailTemplateId]);

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

    useEffect(() => {
        if (selectedCandidates.length > 0 && !previewCandidateId) {
            setPreviewCandidateId(selectedCandidates[0]._id);
        }
    }, [selectedCandidates, previewCandidateId]);

    useEffect(() => {
        const currentRecipients = activeRound?.emailRecipientIds || [];
        const validPrev = currentRecipients.filter((id) => selectedIds.includes(id));
        const newIds = selectedIds.filter((id) => !currentRecipients.includes(id));
        updateActiveRound('emailRecipientIds', [...validPrev, ...newIds]);
    }, [selectedIds]);

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
        setRounds((prev) => {
            const next = [...prev];
            const current = next[activeRoundIndex] || next[0];
            if (!current) return prev;
            const currentAssigned = current.assignedTo || [];
            const nextAssigned = currentAssigned.includes(userId)
                ? currentAssigned.filter((id) => id !== userId)
                : [...currentAssigned, userId];
            next[activeRoundIndex] = { ...current, assignedTo: nextAssigned };
            return next;
        });
    }, [activeRoundIndex]);

    const insertPlaceholder = (token) => {
        const insertion = `{{${token}}}`;
        const prevBody = activeRound?.customHtmlBody || '';
        updateActiveRound('customHtmlBody', `${prevBody}${prevBody ? ' ' : ''}${insertion}`);
    };

    // Live Email Preview Calculation
    const currentPreviewCandidate = useMemo(() => {
        return selectedCandidates.find((c) => c._id === previewCandidateId) || selectedCandidates[0] || candidates[0] || {};
    }, [selectedCandidates, candidates, previewCandidateId]);

    const previewData = useMemo(() => {
        const fullName = currentPreviewCandidate?.candidateName || '';
        const [firstName = '', ...lastNameParts] = fullName.trim().split(/\s+/).filter(Boolean);
        const lastName = lastNameParts.join(' ');

        const scheduledDateVal = activeRound?.scheduledDate;
        const formattedDate = scheduledDateVal
            ? new Date(scheduledDateVal).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
            : 'To Be Confirmed';

        const roundAssignedTo = activeRound?.assignedTo || [];
        const assignedUserNames = roundAssignedTo
            .map((uId) => interviewers.find((u) => u._id === uId))
            .filter(Boolean)
            .map((u) => `${u.firstName || ''} ${u.lastName || ''}`.trim())
            .join(', ') || 'Unassigned';

        const roundCustomFields = activeRound?.customFields || [];
        const validCustomFields = roundCustomFields.filter((f) => f.key && f.key.trim());
        let customFieldsHtml = '';
        if (validCustomFields.length > 0) {
            const rowsHtml = validCustomFields.map((f) => `
                <tr>
                    <td style="padding: 8px 12px; font-weight: bold; color: #334155; border-bottom: 1px solid #e2e8f0; width: 35%;">${f.key}:</td>
                    <td style="padding: 8px 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${f.value || 'N/A'}</td>
                </tr>
            `).join('');

            customFieldsHtml = `
                <div style="margin-top: 16px; padding: 14px; background-color: #f8fafc; border-radius: 10px; border: 1px solid #cbd5e1;">
                    <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 13px; font-weight: bold;">Interview Details & Additional Information:</h4>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        ${rowsHtml}
                    </table>
                </div>
            `;
        }

        return {
            candidateName: fullName || 'Candidate Name',
            firstName: firstName || 'Candidate',
            lastName: lastName || '',
            fullName: fullName || 'Candidate Name',
            email: currentPreviewCandidate?.email || 'candidate@example.com',
            workEmail: currentPreviewCandidate?.email || 'candidate@example.com',
            phone: currentPreviewCandidate?.mobile || currentPreviewCandidate?.phone || 'N/A',
            mobile: currentPreviewCandidate?.mobile || currentPreviewCandidate?.phone || 'N/A',
            roundName: activeRound?.levelName?.trim() || 'Interview Round',
            interviewRound: activeRound?.levelName?.trim() || 'Interview Round',
            scheduledDate: formattedDate,
            interviewDate: formattedDate,
            interviewTime: formattedDate,
            interviewerName: assignedUserNames,
            roleTitle: currentPreviewCandidate?.hiringRequestId?.roleDetails?.title || 'Position',
            jobTitle: currentPreviewCandidate?.hiringRequestId?.roleDetails?.title || 'Position',
            designation: currentPreviewCandidate?.hiringRequestId?.roleDetails?.title || 'Position',
            clientName: currentPreviewCandidate?.hiringRequestId?.client || 'Company',
            companyName: currentPreviewCandidate?.hiringRequestId?.client || 'Company',
            location: currentPreviewCandidate?.location || 'Office / Virtual',
            customFields: customFieldsHtml,
            additionalDetails: customFieldsHtml
        };
    }, [currentPreviewCandidate, activeRound, interviewers]);

    const defaultSubject = `Interview Scheduled: ${activeRound?.levelName || 'Interview Round'} - ${currentPreviewCandidate?.candidateName || 'Candidate'}`;

    const defaultCandidateBody = `<div style="font-family: Arial, sans-serif; color: #334155; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
    <h2 style="color: #2563eb; margin-top: 0;">Interview Scheduled</h2>
    <p>Hello <strong>{{candidateName}}</strong>,</p>
    <p>Your interview for <strong>{{roundName}}</strong> has been scheduled.</p>
    <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Date & Time:</strong> {{interviewDate}}</p>
        <p style="margin: 4px 0;"><strong>Interviewer(s):</strong> {{interviewerName}}</p>
    </div>
    {{additionalDetails}}
    <p style="margin-top: 20px; color: #64748b; font-size: 12px;">Thank you,<br/>Talent Acquisition Team</p>
</div>`;

    const defaultInterviewerSubject = `[Interviewer Notice] Interview Scheduled: ${activeRound?.levelName || 'Interview Round'} - ${currentPreviewCandidate?.candidateName || 'Candidate'}`;

    const defaultInterviewerBody = `<div style="font-family: Arial, sans-serif; color: #334155; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
    <h2 style="color: #2563eb; margin-top: 0;">New Interview Assignment</h2>
    <p>Hello <strong>{{interviewerName}}</strong>,</p>
    <p>You have been assigned to conduct an interview for candidate <strong>{{candidateName}}</strong> for <strong>{{roundName}}</strong> ({{jobTitle}}).</p>
    <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Candidate:</strong> {{candidateName}} ({{email}})</p>
        <p style="margin: 4px 0;"><strong>Date & Time:</strong> {{interviewDate}}</p>
        <p style="margin: 4px 0;"><strong>Role:</strong> {{jobTitle}}</p>
    </div>
    {{additionalDetails}}
    <p style="margin-top: 20px; color: #64748b; font-size: 12px;">Please log in to your portal to submit evaluation feedback after the interview.</p>
</div>`;

    const previewSubject = useMemo(() => {
        if (previewTarget === 'interviewer') {
            return resolveTemplate(defaultInterviewerSubject, previewData);
        }
        const raw = activeRound?.customSubject || activeTemplate?.subject || defaultSubject;
        return resolveTemplate(raw, previewData);
    }, [previewTarget, activeRound?.customSubject, activeTemplate, defaultSubject, defaultInterviewerSubject, previewData]);

    const previewHtml = useMemo(() => {
        if (previewTarget === 'interviewer') {
            return renderTemplateBody(defaultInterviewerBody, previewData);
        }
        const raw = activeRound?.customHtmlBody || activeTemplate?.htmlBody || defaultCandidateBody;
        return renderTemplateBody(raw, previewData);
    }, [previewTarget, activeRound?.customHtmlBody, activeTemplate, defaultCandidateBody, defaultInterviewerBody, previewData]);

    const canProceedStep1 = selectedIds.length >= 1;
    const canProceedStep2 = rounds.length > 0;

    const handleSubmit = async () => {
        if (!canProceedStep2) {
            toast.error('At least one interview round is required.');
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
                rounds: rounds.map((r, idx) => {
                    const sendCandidate = r.sendCandidateEmail !== false;
                    const sendInterviewer = r.sendInterviewerEmail !== false;
                    const anyEmail = sendCandidate || sendInterviewer;

                    return {
                        levelName: (r.levelName || `Round ${idx + 1}`).trim() || `Round ${idx + 1}`,
                        assignAfterStage: r.assignAfterStage || (Number(activePhase) === 2 ? 'Shortlisted' : 'Interested'),
                        assignedTo: r.assignedTo || [],
                        scheduledDate: r.scheduledDate || undefined,
                        phase: r.phase || 1,
                        sendEmail: anyEmail,
                        sendCandidateEmail: sendCandidate,
                        sendInterviewerEmail: sendInterviewer,
                        emailCandidateIds: sendCandidate ? (r.emailRecipientIds || selectedIds) : [],
                        emailTemplateId: anyEmail && r.emailTemplateId ? r.emailTemplateId : undefined,
                        emailAccountId: anyEmail && r.selectedEmailAccountId ? r.selectedEmailAccountId : undefined,
                        cc: anyEmail && r.cc ? r.cc.trim() : undefined,
                        bcc: anyEmail && r.bcc ? r.bcc.trim() : undefined,
                        customFields: (r.customFields || []).filter((f) => f.key && f.key.trim()),
                        customSubject: anyEmail && r.customSubject ? r.customSubject.trim() : undefined,
                        customHtmlBody: anyEmail && r.customHtmlBody ? r.customHtmlBody.trim() : undefined
                    };
                })
            };

            const response = await api.post('/ta/candidates/bulk-schedule-interview', payload);
            const { scheduled, failed, errors } = response.data;

            if (scheduled > 0) {
                toast.success(`${rounds.length} interview round(s) scheduled for ${scheduled} candidate(s)`);
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

    const stepLabels = ['Select Candidates', 'Configure Interview & Email', 'Review & Confirm'];

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
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
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

                    {/* Step 2 View Mode Toggle */}
                    {step === 2 && (activeRound?.sendCandidateEmail !== false || activeRound?.sendInterviewerEmail !== false) && (
                        <div className="inline-flex rounded-xl bg-slate-200/80 p-1">
                            <button
                                type="button"
                                onClick={() => setViewMode('details')}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
                                    viewMode === 'details' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Clock size={13} />
                                Round Details
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('email')}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
                                    viewMode === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Edit3 size={13} />
                                Edit Email
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('preview')}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
                                    viewMode === 'preview' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Eye size={13} />
                                Email Preview
                            </button>
                        </div>
                    )}
                </div>

                {/* Step 2 Multi-Round Bar */}
                {step === 2 && (
                    <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-6 py-2.5 overflow-x-auto">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">Interview Rounds:</span>
                        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
                            {rounds.map((r, idx) => (
                                <div key={r.id} className="flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => setActiveRoundIndex(idx)}
                                        className={`flex items-center gap-2 rounded-xl px-3.5 py-1 text-xs font-bold transition ${
                                            activeRoundIndex === idx
                                                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span>{r.levelName.trim() || `Round ${idx + 1}`}</span>
                                        {!r.levelName.trim() && <span className="text-red-400 text-[10px]">*</span>}
                                    </button>
                                    {rounds.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeRound(idx);
                                            }}
                                            className="ml-1 rounded-full p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 text-xs font-bold"
                                            title="Remove Round"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addRound}
                            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-xl transition border border-blue-200 shrink-0"
                        >
                            + Add Another Round
                        </button>
                    </div>
                )}

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

                    {/* STEP 2: Configure Interview & Edit Email */}
                    {step === 2 && (
                        <div>
                            {/* View Mode 1: Details */}
                            {viewMode === 'details' && (
                                <div className="grid gap-6 lg:grid-cols-2">
                                    <div className="space-y-5">
                                        {/* Email Dispatch Options */}
                                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3.5">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                                    <Mail size={14} className="text-blue-600" />
                                                    Email Dispatch Options
                                                </span>
                                                <span className="text-[11px] text-slate-400 font-medium">Select recipients for this round</span>
                                            </div>

                                            {/* Send to Candidates Option */}
                                            <label className={`flex items-start justify-between p-3.5 rounded-xl border transition cursor-pointer ${
                                                activeRound?.sendCandidateEmail !== false ? 'bg-blue-50/40 border-blue-200' : 'bg-slate-50/60 border-slate-200 opacity-75'
                                            }`}>
                                                <div className="pr-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-slate-900">Send Email to Candidate(s)</span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Candidate Invitation</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Automatically dispatch interview invitation email with date, time, and instructions to candidate(s).
                                                    </p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={activeRound?.sendCandidateEmail !== false}
                                                    onChange={(e) => updateActiveRound('sendCandidateEmail', e.target.checked)}
                                                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5"
                                                />
                                            </label>

                                            {/* Send to Interviewer Option */}
                                            <label className={`flex items-start justify-between p-3.5 rounded-xl border transition cursor-pointer ${
                                                activeRound?.sendInterviewerEmail !== false ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50/60 border-slate-200 opacity-75'
                                            }`}>
                                                <div className="pr-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-slate-900">Send Email to Assigned Interviewer(s)</span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Interviewer Brief</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Send candidate details and evaluation instructions to the assigned team members.
                                                    </p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={activeRound?.sendInterviewerEmail !== false}
                                                    onChange={(e) => updateActiveRound('sendInterviewerEmail', e.target.checked)}
                                                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-0.5"
                                                />
                                            </label>
                                        </div>

                                        {/* Round Name */}
                                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                Round Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={activeRound?.levelName || ''}
                                                onChange={(e) => updateActiveRound('levelName', e.target.value)}
                                                placeholder="e.g. L1 - Technical, HR Round, Managerial"
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        {/* Assign After Stage */}
                                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                Assign After Stage
                                            </label>
                                            <select
                                                value={activeRound?.assignAfterStage || 'Shortlisted'}
                                                onChange={(e) => updateActiveRound('assignAfterStage', e.target.value)}
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            >
                                                <optgroup label="Hiring Stages">
                                                    {(() => {
                                                        const p = Number(activePhase) || 1;
                                                        if (p === 2) {
                                                            return (
                                                                <>
                                                                    <option value="Profile Shared">Profile Shared</option>
                                                                    <option value="Shortlisted">Shortlisted</option>
                                                                    <option value="Selected">Selected</option>
                                                                    <option value="Rejected">Rejected</option>
                                                                </>
                                                            );
                                                        }
                                                        if (p === 3) {
                                                            return (
                                                                <>
                                                                    <option value="Offer Sent">Offer Sent</option>
                                                                    <option value="Offer Accepted">Offer Accepted</option>
                                                                    <option value="Joined">Joined</option>
                                                                </>
                                                            );
                                                        }
                                                        return (
                                                            <>
                                                                <option value="Total Sourced">Total Sourced</option>
                                                                <option value="Interested">Interested</option>
                                                                <option value="Shortlisted">Shortlisted</option>
                                                                <option value="Profile Shared">Profile Shared</option>
                                                            </>
                                                        );
                                                    })()}
                                                </optgroup>
                                                {(() => {
                                                    // Collect all unique phase-1 round names from the selected candidates.
                                                    const selectedCandidates = candidates.filter((c) => selectedIds.includes(c._id));
                                                    const roundNames = [
                                                        ...new Set(
                                                            selectedCandidates
                                                                .flatMap((c) => c.interviewRounds || [])
                                                                .filter((r) => Number(r.phase || 1) === (activePhase || 1))
                                                                .map((r) => String(r.levelName || '').trim())
                                                                .filter(Boolean)
                                                        )
                                                    ];
                                                    if (roundNames.length === 0) return null;
                                                    return (
                                                        <optgroup label="After a Round (chain)">
                                                            {roundNames.map((name) => (
                                                                <option key={name} value={name}>{name}</option>
                                                            ))}
                                                        </optgroup>
                                                    );
                                                })()}
                                            </select>
                                            <p className="mt-1.5 text-xs text-slate-500">Select which hiring stage this interview round should be assigned after.</p>
                                        </div>

                                        {/* Scheduled Date & Time */}
                                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                                <Calendar size={14} />
                                                Scheduled Date & Time
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={activeRound?.scheduledDate || ''}
                                                onChange={(e) => updateActiveRound('scheduledDate', e.target.value)}
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
                                                value={activeRound?.phase || 1}
                                                onChange={(e) => updateActiveRound('phase', Number(e.target.value) || 1)}
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        {/* Custom Key-Value Fields */}
                                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                                    Additional Details (Key-Value)
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => updateActiveRound('customFields', [...(activeRound?.customFields || []), { key: '', value: '' }])}
                                                    className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                                                >
                                                    + Add Field
                                                </button>
                                            </div>

                                            {(!activeRound?.customFields || activeRound.customFields.length === 0) ? (
                                                <p className="text-xs text-slate-400 italic">No custom fields added yet. (e.g. Meeting Link, Mode)</p>
                                            ) : (
                                                <div className="space-y-2 max-h-36 overflow-y-auto">
                                                    {activeRound.customFields.map((field, idx) => (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                placeholder="Key (e.g. Meeting Link)"
                                                                value={field.key}
                                                                onChange={(e) => {
                                                                    const next = [...activeRound.customFields];
                                                                    next[idx].key = e.target.value;
                                                                    updateActiveRound('customFields', next);
                                                                }}
                                                                className="w-1/2 rounded border border-slate-300 px-2 py-1 text-xs"
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Value (e.g. https://...)"
                                                                value={field.value}
                                                                onChange={(e) => {
                                                                    const next = [...activeRound.customFields];
                                                                    next[idx].value = e.target.value;
                                                                    updateActiveRound('customFields', next);
                                                                }}
                                                                className="w-1/2 rounded border border-slate-300 px-2 py-1 text-xs"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => updateActiveRound('customFields', activeRound.customFields.filter((_, i) => i !== idx))}
                                                                className="text-red-500 hover:text-red-700 text-xs px-1 font-bold"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Assign Interviewers */}
                                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                        <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                            <Users size={14} />
                                            Assign Interviewers
                                        </label>
                                        {(activeRound?.assignedTo || []).length > 0 && (
                                            <div className="mb-3 flex flex-wrap gap-2">
                                                {(activeRound.assignedTo).map((userId) => {
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
                                                        const isSelected = (activeRound?.assignedTo || []).includes(user._id);
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

                            {/* View Mode 2: Edit Email */}
                            {viewMode === 'email' && (
                                <div className="space-y-5">
                                    {/* Email Dispatch Targets */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Candidate Toggle */}
                                        <label className={`flex items-start justify-between p-4 rounded-2xl border transition cursor-pointer ${
                                            activeRound?.sendCandidateEmail !== false ? 'bg-white border-blue-300 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-70'
                                        }`}>
                                            <div className="pr-2">
                                                <div className="flex items-center gap-2">
                                                    <Mail size={15} className="text-blue-600" />
                                                    <span className="text-sm font-bold text-slate-800">Candidate Email</span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Invitation</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Send invitation with scheduled date/time and custom details.
                                                </p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={activeRound?.sendCandidateEmail !== false}
                                                onChange={(e) => updateActiveRound('sendCandidateEmail', e.target.checked)}
                                                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5"
                                            />
                                        </label>

                                        {/* Interviewer Toggle */}
                                        <label className={`flex items-start justify-between p-4 rounded-2xl border transition cursor-pointer ${
                                            activeRound?.sendInterviewerEmail !== false ? 'bg-white border-indigo-300 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-70'
                                        }`}>
                                            <div className="pr-2">
                                                <div className="flex items-center gap-2">
                                                    <Users size={15} className="text-indigo-600" />
                                                    <span className="text-sm font-bold text-slate-800">Interviewer Email</span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">Assignment</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Send candidate brief and schedule notification to assigned team members.
                                                </p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={activeRound?.sendInterviewerEmail !== false}
                                                onChange={(e) => updateActiveRound('sendInterviewerEmail', e.target.checked)}
                                                className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-0.5"
                                            />
                                        </label>
                                    </div>

                                    {/* Candidate Recipient Selector (shown if Candidate Email is ON) */}
                                    {activeRound?.sendCandidateEmail !== false && (
                                        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                                                        <Users size={14} className="text-blue-600" />
                                                        Select Candidate Recipients ({(activeRound?.emailRecipientIds || selectedIds).length} of {selectedCandidates.length} selected)
                                                    </label>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Choose which candidates should receive the email invite for this interview round.
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateActiveRound('emailRecipientIds', selectedCandidates.map(c => c._id))}
                                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md"
                                                    >
                                                        Select All
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateActiveRound('emailRecipientIds', [])}
                                                        className="text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md"
                                                    >
                                                        Deselect All
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
                                                {selectedCandidates.map((candidate) => {
                                                    const isChecked = (activeRound?.emailRecipientIds || selectedIds).includes(candidate._id);
                                                    return (
                                                        <label
                                                            key={candidate._id}
                                                            className={`flex cursor-pointer items-center justify-between px-3.5 py-2 transition hover:bg-slate-50 ${
                                                                isChecked ? 'bg-blue-50/40' : ''
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => {
                                                                        const current = activeRound?.emailRecipientIds || selectedIds;
                                                                        const next = current.includes(candidate._id)
                                                                            ? current.filter(id => id !== candidate._id)
                                                                            : [...current, candidate._id];
                                                                        updateActiveRound('emailRecipientIds', next);
                                                                    }}
                                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                />
                                                                <span className="text-xs font-semibold text-slate-800 truncate">{candidate.candidateName}</span>
                                                            </div>
                                                            <span className="text-[11px] text-slate-500 font-mono">{candidate.email}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {(activeRound?.sendCandidateEmail !== false || activeRound?.sendInterviewerEmail !== false) ? (
                                        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Email Template Select */}
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        Email Template
                                                    </label>
                                                    <select
                                                        value={activeRound?.emailTemplateId || ''}
                                                        onChange={(e) => updateActiveRound('emailTemplateId', e.target.value)}
                                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="">Default System Template</option>
                                                        {emailTemplates.map((t) => (
                                                            <option key={t._id} value={t._id}>{t.name} ({t.category || 'General'})</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Sender Account */}
                                                {senderOptions.length > 0 && (
                                                    <div>
                                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                            Sender Account
                                                        </label>
                                                        <select
                                                            value={activeRound?.selectedEmailAccountId || ''}
                                                            onChange={(e) => updateActiveRound('selectedEmailAccountId', e.target.value)}
                                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                        >
                                                            {senderOptions.map((option) => (
                                                                <option key={option._id} value={option._id}>
                                                                    {option.name} – {option.fromAddress}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        CC Emails
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={activeRound?.cc || ''}
                                                        onChange={(e) => updateActiveRound('cc', e.target.value)}
                                                        placeholder="e.g. hr@company.com"
                                                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        BCC Emails
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={activeRound?.bcc || ''}
                                                        onChange={(e) => updateActiveRound('bcc', e.target.value)}
                                                        placeholder="e.g. audit@company.com"
                                                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>

                                            {/* Subject Input */}
                                            <div>
                                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                    Email Subject Line
                                                </label>
                                                <input
                                                    type="text"
                                                    value={activeRound?.customSubject || ''}
                                                    onChange={(e) => updateActiveRound('customSubject', e.target.value)}
                                                    placeholder={defaultSubject}
                                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            {/* Quick Placeholders */}
                                            <div>
                                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                    Insert Dynamic Placeholders
                                                </label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {QUICK_PLACEHOLDERS.map((item) => (
                                                        <button
                                                            key={item.token}
                                                            type="button"
                                                            onClick={() => insertPlaceholder(item.token)}
                                                            className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition"
                                                        >
                                                            + {item.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* HTML / Custom Body Textarea */}
                                            <div>
                                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                    Email Content (HTML or Plain Text)
                                                </label>
                                                <textarea
                                                    rows={10}
                                                    value={activeRound?.customHtmlBody || ''}
                                                    onChange={(e) => updateActiveRound('customHtmlBody', e.target.value)}
                                                    placeholder={defaultCandidateBody}
                                                    className="w-full font-mono text-xs rounded-lg border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                            <Mail className="mx-auto text-slate-400 mb-2" size={24} />
                                            <p className="text-sm font-semibold text-slate-700">Email dispatch is disabled for both candidates and interviewers</p>
                                            <p className="text-xs text-slate-500 mt-1">Enable candidate or interviewer email above to customize templates, subject, and message body.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* View Mode 3: Live Email Preview */}
                            {viewMode === 'preview' && (
                                <div className="space-y-4">
                                    {/* Preview Target & Candidate Selector Header */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                                        <div className="flex items-center gap-3">
                                            <Mail size={18} className="text-blue-600 shrink-0" />
                                            <div>
                                                <p className="text-xs font-bold uppercase text-slate-500">Live Email Preview</p>
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {previewTarget === 'interviewer' ? 'Previewing interviewer assignment notice' : 'Previewing candidate interview invitation'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2.5">
                                            {/* Preview Target Switch (Candidate vs Interviewer) */}
                                            {activeRound?.sendCandidateEmail !== false && activeRound?.sendInterviewerEmail !== false && (
                                                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-bold">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewTarget('candidate')}
                                                        className={`px-3 py-1 rounded-md transition ${previewTarget === 'candidate' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                                                    >
                                                        Candidate Invitation
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewTarget('interviewer')}
                                                        className={`px-3 py-1 rounded-md transition ${previewTarget === 'interviewer' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                                                    >
                                                        Interviewer Notice
                                                    </button>
                                                </div>
                                            )}

                                            {selectedCandidates.length > 1 && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-medium text-slate-400">For:</span>
                                                    <select
                                                        value={previewCandidateId}
                                                        onChange={(e) => setPreviewCandidateId(e.target.value)}
                                                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                    >
                                                        {selectedCandidates.map((c) => (
                                                            <option key={c._id} value={c._id}>
                                                                {c.candidateName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Email Card Container */}
                                    <div className="rounded-2xl border border-slate-300 bg-white shadow-sm overflow-hidden">
                                        {/* Email Headers */}
                                        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4 space-y-2 text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="w-16 font-bold uppercase text-slate-400">To:</span>
                                                <span className="font-medium text-slate-800">
                                                    {previewTarget === 'interviewer'
                                                        ? `${previewData.interviewerName || 'Assigned Interviewer(s)'} <interviewer@company.com>`
                                                        : `${previewData.candidateName} <${previewData.email}>`}
                                                </span>
                                            </div>
                                            {(activeRound?.cc || activeRound?.bcc) && (
                                                <div className="flex items-center gap-2">
                                                    <span className="w-16 font-bold uppercase text-slate-400">CC / BCC:</span>
                                                    <span className="text-slate-600">{[activeRound?.cc, activeRound?.bcc].filter(Boolean).join(', ')}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 border-t border-slate-200/60 pt-2 mt-2">
                                                <span className="w-16 font-bold uppercase text-slate-400">Subject:</span>
                                                <span className="text-sm font-bold text-slate-900">{previewSubject}</span>
                                            </div>
                                        </div>

                                        {/* Email Body Output */}
                                        <div className="p-6">
                                            <div
                                                className="prose prose-sm max-w-none text-slate-800"
                                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: Review & Confirm */}
                    {step === 3 && (
                        <div className="space-y-6">
                            {/* Top Summary & View Switcher */}
                            <div className="grid gap-6 lg:grid-cols-2">
                                {/* Configuration Summary */}
                                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                                    <h4 className="text-sm font-bold text-slate-800">
                                        Configured Interview Rounds ({rounds.length})
                                    </h4>
                                    <div className="space-y-3 max-h-[260px] overflow-y-auto">
                                        {rounds.map((r, idx) => (
                                            <div key={r.id || idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                                                        Round {idx + 1}: {r.levelName || 'Untitled Round'}
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.sendCandidateEmail !== false ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                                                            {r.sendCandidateEmail !== false ? `Candidate Email (${(r.emailRecipientIds || selectedIds).length})` : 'Candidate Email: Off'}
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.sendInterviewerEmail !== false ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                                                            {r.sendInterviewerEmail !== false ? `Interviewer Email (${(r.assignedTo || []).length})` : 'Interviewer Email: Off'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                                                    <div>
                                                        <span className="font-semibold text-slate-500">Date & Time:</span>{' '}
                                                        {r.scheduledDate ? new Date(r.scheduledDate).toLocaleString() : 'Not set (Pending)'}
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-slate-500">Phase:</span> {r.phase || 1}
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="font-semibold text-slate-500">Interviewers:</span>{' '}
                                                        {Array.isArray(r.assignedTo) && r.assignedTo.length > 0
                                                            ? r.assignedTo.map((id) => {
                                                                const u = interviewers.find((i) => i._id === id);
                                                                return u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : id;
                                                            }).join(', ')
                                                            : 'None assigned'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Candidates Count */}
                                <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-slate-800">Candidates ({selectedCandidates.length})</h4>
                                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                                            Ready to schedule
                                        </span>
                                    </div>
                                    <div className="flex-1 max-h-[220px] overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
                                        {selectedCandidates.length === 0 ? (
                                            <p className="px-4 py-8 text-center text-sm text-slate-500">No candidates selected.</p>
                                        ) : (
                                            selectedCandidates.map((candidate) => (
                                                <div key={candidate._id} className="flex items-center gap-3 px-4 py-2.5">
                                                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                                        {(candidate.candidateName || '?')[0].toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-slate-800">{candidate.candidateName}</p>
                                                        <p className="text-[11px] text-slate-500">{candidate.email}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Final Live Email Preview Card */}
                            {activeRound?.sendEmail !== false && (
                                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <Eye size={16} className="text-blue-600" />
                                            Final Email Preview
                                        </h4>
                                        {selectedCandidates.length > 1 && (
                                            <select
                                                value={previewCandidateId}
                                                onChange={(e) => setPreviewCandidateId(e.target.value)}
                                                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-bold outline-none"
                                            >
                                                {selectedCandidates.map((c) => (
                                                    <option key={c._id} value={c._id}>
                                                        {c.candidateName}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div className="rounded-xl border border-slate-300 overflow-hidden text-xs">
                                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-slate-800">
                                            Subject: {previewSubject}
                                        </div>
                                        <div className="p-4 bg-white prose prose-sm max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                                    </div>
                                </div>
                            )}
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
