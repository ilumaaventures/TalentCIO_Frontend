import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Check, ChevronRight, Clock, Edit3, Eye, Loader, Mail, Search, User, Users, X } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { renderTemplateBody, resolveTemplate } from '../../utils/templatePlaceholders';

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
    const [emailTemplates, setEmailTemplates] = useState([]);
    const [emailTemplateId, setEmailTemplateId] = useState('');
    const [senderOptions, setSenderOptions] = useState([]);
    const [selectedEmailAccountId, setSelectedEmailAccountId] = useState('');
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const [customFields, setCustomFields] = useState([]);

    // Email Preview and Editing States
    const [customSubject, setCustomSubject] = useState('');
    const [customHtmlBody, setCustomHtmlBody] = useState('');
    const [previewCandidateId, setPreviewCandidateId] = useState('');
    const [viewMode, setViewMode] = useState('details'); // 'details' | 'email' | 'preview'

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
        setEmailTemplateId('');
        setSelectedEmailAccountId('');
        setCc('');
        setBcc('');
        setCustomFields([]);
        setCustomSubject('');
        setCustomHtmlBody('');
        setPreviewCandidateId('');
        setViewMode('details');
    }, [isOpen, initialSelectedIds, activePhase]);

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
                    setSelectedEmailAccountId(
                        nextSenderOptions.some((o) => o._id === senderData.defaultAccountId)
                            ? senderData.defaultAccountId
                            : (nextSenderOptions[0]?._id || '')
                    );
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
        () => emailTemplates.find((t) => t._id === emailTemplateId),
        [emailTemplates, emailTemplateId]
    );

    useEffect(() => {
        if (emailTemplateId && activeTemplate) {
            setCustomSubject(activeTemplate.subject || '');
            setCustomHtmlBody(activeTemplate.htmlBody || '');
        }
    }, [activeTemplate, emailTemplateId]);

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

    const insertPlaceholder = (token) => {
        const insertion = `{{${token}}}`;
        setCustomHtmlBody((prev) => `${prev}${prev ? ' ' : ''}${insertion}`);
    };

    // Live Email Preview Calculation
    const currentPreviewCandidate = useMemo(() => {
        return selectedCandidates.find((c) => c._id === previewCandidateId) || selectedCandidates[0] || candidates[0] || {};
    }, [selectedCandidates, candidates, previewCandidateId]);

    const previewData = useMemo(() => {
        const fullName = currentPreviewCandidate?.candidateName || '';
        const [firstName = '', ...lastNameParts] = fullName.trim().split(/\s+/).filter(Boolean);
        const lastName = lastNameParts.join(' ');

        const formattedDate = scheduledDate
            ? new Date(scheduledDate).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
            : 'To Be Confirmed';

        const assignedUserNames = assignedTo
            .map((uId) => interviewers.find((u) => u._id === uId))
            .filter(Boolean)
            .map((u) => `${u.firstName || ''} ${u.lastName || ''}`.trim())
            .join(', ') || 'Unassigned';

        const validCustomFields = customFields.filter((f) => f.key && f.key.trim());
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
            roundName: levelName.trim() || 'Interview Round',
            interviewRound: levelName.trim() || 'Interview Round',
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
    }, [currentPreviewCandidate, levelName, scheduledDate, assignedTo, interviewers, customFields]);

    const defaultSubject = `Interview Scheduled: ${levelName || 'Interview Round'} - ${currentPreviewCandidate?.candidateName || 'Candidate'}`;

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

    const previewSubject = useMemo(() => {
        const raw = customSubject || activeTemplate?.subject || defaultSubject;
        return resolveTemplate(raw, previewData);
    }, [customSubject, activeTemplate, defaultSubject, previewData]);

    const previewHtml = useMemo(() => {
        const raw = customHtmlBody || activeTemplate?.htmlBody || defaultCandidateBody;
        return renderTemplateBody(raw, previewData);
    }, [customHtmlBody, activeTemplate, defaultCandidateBody, previewData]);

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
                phase,
                emailTemplateId: emailTemplateId || undefined,
                emailAccountId: selectedEmailAccountId || undefined,
                cc: cc ? cc.trim() : undefined,
                bcc: bcc ? bcc.trim() : undefined,
                customFields: customFields.filter((f) => f.key && f.key.trim()),
                customSubject: customSubject.trim() || undefined,
                customHtmlBody: customHtmlBody.trim() || undefined
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
                    {step === 2 && (
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

                                        {/* Custom Key-Value Fields */}
                                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                                    Additional Details (Key-Value)
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomFields([...customFields, { key: '', value: '' }])}
                                                    className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                                                >
                                                    + Add Field
                                                </button>
                                            </div>

                                            {customFields.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic">No custom fields added yet. (e.g. Meeting Link, Mode)</p>
                                            ) : (
                                                <div className="space-y-2 max-h-36 overflow-y-auto">
                                                    {customFields.map((field, idx) => (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                placeholder="Key (e.g. Meeting Link)"
                                                                value={field.key}
                                                                onChange={(e) => {
                                                                    const next = [...customFields];
                                                                    next[idx].key = e.target.value;
                                                                    setCustomFields(next);
                                                                }}
                                                                className="w-1/2 rounded border border-slate-300 px-2 py-1 text-xs"
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Value (e.g. https://...)"
                                                                value={field.value}
                                                                onChange={(e) => {
                                                                    const next = [...customFields];
                                                                    next[idx].value = e.target.value;
                                                                    setCustomFields(next);
                                                                }}
                                                                className="w-1/2 rounded border border-slate-300 px-2 py-1 text-xs"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}
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

                            {/* View Mode 2: Edit Email */}
                            {viewMode === 'email' && (
                                <div className="space-y-5">
                                    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Email Template Select */}
                                            <div>
                                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                    Email Template
                                                </label>
                                                <select
                                                    value={emailTemplateId}
                                                    onChange={(e) => setEmailTemplateId(e.target.value)}
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
                                                        value={selectedEmailAccountId}
                                                        onChange={(e) => setSelectedEmailAccountId(e.target.value)}
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
                                                    value={cc}
                                                    onChange={(e) => setCc(e.target.value)}
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
                                                    value={bcc}
                                                    onChange={(e) => setBcc(e.target.value)}
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
                                                value={customSubject}
                                                onChange={(e) => setCustomSubject(e.target.value)}
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
                                                value={customHtmlBody}
                                                onChange={(e) => setCustomHtmlBody(e.target.value)}
                                                placeholder={defaultCandidateBody}
                                                className="w-full font-mono text-xs rounded-lg border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* View Mode 3: Live Email Preview */}
                            {viewMode === 'preview' && (
                                <div className="space-y-4">
                                    {/* Candidate Preview Selector */}
                                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                                        <div className="flex items-center gap-3">
                                            <Mail size={18} className="text-blue-600" />
                                            <div>
                                                <p className="text-xs font-bold uppercase text-slate-500">Live Email Preview</p>
                                                <p className="text-sm font-semibold text-slate-800">Previewing email invitation as recipient will see it</p>
                                            </div>
                                        </div>
                                        {selectedCandidates.length > 1 && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-slate-500">Preview For:</span>
                                                <select
                                                    value={previewCandidateId}
                                                    onChange={(e) => setPreviewCandidateId(e.target.value)}
                                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    {selectedCandidates.map((c) => (
                                                        <option key={c._id} value={c._id}>
                                                            {c.candidateName} ({c.email})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Email Card Container */}
                                    <div className="rounded-2xl border border-slate-300 bg-white shadow-sm overflow-hidden">
                                        {/* Email Headers */}
                                        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4 space-y-2 text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="w-16 font-bold uppercase text-slate-400">To:</span>
                                                <span className="font-medium text-slate-800">{previewData.candidateName} &lt;{previewData.email}&gt;</span>
                                            </div>
                                            {(cc || bcc) && (
                                                <div className="flex items-center gap-2">
                                                    <span className="w-16 font-bold uppercase text-slate-400">CC / BCC:</span>
                                                    <span className="text-slate-600">{[cc, bcc].filter(Boolean).join(', ')}</span>
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
                                    <h4 className="text-sm font-bold text-slate-800">Interview Details</h4>
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
