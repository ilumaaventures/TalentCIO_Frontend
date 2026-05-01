import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Mail, Send, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
    renderTemplateBody,
    TEMPLATE_PLACEHOLDERS,
    resolveTemplate,
    validateTemplateSyntax
} from '../../utils/templatePlaceholders';

const buildPreviewData = (candidate, requestMeta, customNote = '') => ({
    candidateName: candidate?.candidateName || '',
    email: candidate?.email || '',
    mobile: candidate?.mobile || '',
    jobTitle: requestMeta?.roleDetails?.title || requestMeta?.positionName || '',
    client: requestMeta?.client || '',
    department: requestMeta?.roleDetails?.department || '',
    recruiterName: requestMeta?.ownership?.recruiter
        ? `${requestMeta.ownership.recruiter.firstName || ''} ${requestMeta.ownership.recruiter.lastName || ''}`.trim()
        : (candidate?.profilePulledBy || ''),
    companyName: requestMeta?.companyName || 'TalentCIO',
    requestId: requestMeta?.requestId || '',
    currentStatus: candidate?.status || '',
    interviewDate: '',
    interviewLink: '',
    customNote
});

const applyCandidateFilters = (candidates, filters) => (
    (Array.isArray(candidates) ? candidates : []).filter((candidate) => {
        if (filters.status.length && !filters.status.includes(candidate.status)) return false;
        if (filters.decision.length && !filters.decision.includes(candidate.decision || 'None')) return false;
        if (filters.phase2Decision.length && !filters.phase2Decision.includes(candidate.phase2Decision || 'None')) return false;
        if (filters.phase3Decision.length && !filters.phase3Decision.includes(candidate.phase3Decision || 'None')) return false;
        return true;
    })
);

const normalizeFiltersForRequest = (filters) => ({
    status: filters.status.length ? filters.status : undefined,
    decision: filters.decision.length ? filters.decision : undefined,
    phase2Decision: filters.phase2Decision.length ? filters.phase2Decision : undefined,
    phase3Decision: filters.phase3Decision.length ? filters.phase3Decision : undefined
});

const CheckboxGroup = ({ label, options, values, onToggle }) => (
    <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <div className="flex flex-wrap gap-2">
            {options.map((option) => {
                const active = values.includes(option);
                return (
                    <button
                        key={option}
                        type="button"
                        onClick={() => onToggle(option)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                        {option}
                    </button>
                );
            })}
        </div>
    </div>
);

const MassMailModal = ({
    isOpen,
    onClose,
    hiringRequestId,
    requestMeta,
    candidates = [],
    initialSelectedIds = [],
    onSent
}) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [templates, setTemplates] = useState([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [sending, setSending] = useState(false);
    const [templateMode, setTemplateMode] = useState('saved');
    const [templateId, setTemplateId] = useState('');
    const [customSubject, setCustomSubject] = useState('');
    const [customHtmlBody, setCustomHtmlBody] = useState('');
    const [customNote, setCustomNote] = useState('');
    const [sendToAllMatching, setSendToAllMatching] = useState(initialSelectedIds.length === 0);
    const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
    const [filters, setFilters] = useState({
        status: [],
        decision: [],
        phase2Decision: [],
        phase3Decision: []
    });

    useEffect(() => {
        if (!isOpen) return;
        setStep(1);
        setTemplateMode('saved');
        setTemplateId('');
        setCustomSubject('');
        setCustomHtmlBody('');
        setCustomNote('');
        setSelectedIds(initialSelectedIds);
        setSendToAllMatching(initialSelectedIds.length === 0);
        setFilters({ status: [], decision: [], phase2Decision: [], phase3Decision: [] });
    }, [isOpen, initialSelectedIds]);

    useEffect(() => {
        if (!isOpen) return;
        let active = true;
        const loadTemplates = async () => {
            try {
                setLoadingTemplates(true);
                const response = await api.get('/ta/email-templates?active=true');
                if (!active) return;
                setTemplates(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error('Failed to load templates', error);
                toast.error('Failed to load email templates');
            } finally {
                if (active) setLoadingTemplates(false);
            }
        };
        loadTemplates();
        return () => {
            active = false;
        };
    }, [isOpen]);

    const filteredCandidates = useMemo(() => applyCandidateFilters(candidates, filters), [candidates, filters]);

    const selectedCandidates = useMemo(() => {
        if (sendToAllMatching) return filteredCandidates;
        const selectedSet = new Set(selectedIds);
        return filteredCandidates.filter((candidate) => selectedSet.has(candidate._id));
    }, [filteredCandidates, sendToAllMatching, selectedIds]);

    const activeTemplate = useMemo(
        () => templates.find((template) => template._id === templateId),
        [templates, templateId]
    );

    useEffect(() => {
        if (templateMode !== 'saved' || !activeTemplate) return;
        setCustomSubject(activeTemplate.subject || '');
        setCustomHtmlBody(activeTemplate.htmlBody || '');
    }, [activeTemplate, templateMode]);

    const previewCandidate = selectedCandidates[0] || filteredCandidates[0] || candidates[0];
    const previewData = buildPreviewData(previewCandidate, requestMeta, customNote);
    const previewSubject = resolveTemplate(customSubject, previewData);
    const previewHtml = renderTemplateBody(customHtmlBody, previewData);

    const toggleFilter = (key, value) => {
        setFilters((prev) => ({
            ...prev,
            [key]: prev[key].includes(value)
                ? prev[key].filter((item) => item !== value)
                : [...prev[key], value]
        }));
    };

    const toggleCandidate = (candidateId) => {
        setSendToAllMatching(false);
        setSelectedIds((prev) => (
            prev.includes(candidateId)
                ? prev.filter((id) => id !== candidateId)
                : [...prev, candidateId]
        ));
    };

    const selectAllFiltered = () => {
        setSendToAllMatching(false);
        setSelectedIds(filteredCandidates.map((candidate) => candidate._id));
    };

    const handleInsertPlaceholder = (placeholder) => {
        const token = `{{${placeholder}}}`;
        setCustomHtmlBody((prev) => `${prev}${prev ? '\n' : ''}${token}`);
    };

    const handleSubmit = async () => {
        if (!sendToAllMatching && selectedIds.length === 0) {
            toast.error('Select at least one candidate or choose all matching recipients.');
            setStep(1);
            return;
        }

        if (templateMode === 'saved' && !templateId) {
            toast.error('Select an email template.');
            setStep(2);
            return;
        }

        if (!customSubject.trim() || !customHtmlBody.trim()) {
            toast.error('Subject and HTML body are required.');
            setStep(2);
            return;
        }

        const subjectValidation = validateTemplateSyntax(customSubject, TEMPLATE_PLACEHOLDERS);
        if (!subjectValidation.valid) {
            toast.error(`Subject error: ${subjectValidation.message}`);
            setStep(2);
            return;
        }

        const bodyValidation = validateTemplateSyntax(customHtmlBody, TEMPLATE_PLACEHOLDERS);
        if (!bodyValidation.valid) {
            toast.error(`HTML body error: ${bodyValidation.message}`);
            setStep(2);
            return;
        }

        try {
            setSending(true);
            const payload = {
                templateId: templateMode === 'saved' ? templateId : undefined,
                customSubject,
                customHtmlBody,
                candidateIds: sendToAllMatching ? [] : selectedIds,
                filters: sendToAllMatching ? normalizeFiltersForRequest(filters) : undefined,
                customNote
            };

            const response = await api.post(`/ta/hiring-request/${hiringRequestId}/send-mass-mail`, payload);
            toast.success(`Mail sent to ${response.data.sent} candidates`);
            onSent?.(response.data);
            onClose();
        } catch (error) {
            console.error('Mass mail failed', error);
            toast.error(error.response?.data?.message || 'Failed to send mass email');
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/30 bg-slate-50 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Mass Mailing</p>
                        <h3 className="mt-1 text-xl font-bold text-slate-900">Send email to candidates</h3>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>

                <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
                    <div className="flex flex-wrap gap-2">
                        {[1, 2, 3].map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setStep(value)}
                                className={`rounded-full px-3 py-1 text-xs font-bold ${step === value ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}
                            >
                                Step {value}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-y-auto px-6 py-6">
                    {step === 1 && (
                        <div className="space-y-5">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <button type="button" onClick={() => setSendToAllMatching(true)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${sendToAllMatching ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                                        Use all matching
                                    </button>
                                    <button type="button" onClick={selectAllFiltered} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                                        Select all filtered
                                    </button>
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                        {sendToAllMatching ? `${filteredCandidates.length} matching recipients` : `${selectedIds.length} selected`}
                                    </span>
                                </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <CheckboxGroup label="Status" options={['Interested', 'Not Interested', 'Shortlisted']} values={filters.status} onToggle={(value) => toggleFilter('status', value)} />
                                <CheckboxGroup label="Decision" options={['None', 'Shortlisted', 'Rejected', 'On Hold']} values={filters.decision} onToggle={(value) => toggleFilter('decision', value)} />
                                <CheckboxGroup label="Phase 2" options={['None', 'Shortlisted', 'Selected', 'Rejected', 'On Hold']} values={filters.phase2Decision} onToggle={(value) => toggleFilter('phase2Decision', value)} />
                                <CheckboxGroup label="Phase 3" options={['None', 'Offer Sent', 'Offer Accepted', 'Joined', 'No Show', 'Offer Declined']} values={filters.phase3Decision} onToggle={(value) => toggleFilter('phase3Decision', value)} />
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white">
                                <div className="border-b border-slate-100 px-4 py-3">
                                    <h4 className="text-sm font-bold text-slate-800">Recipients</h4>
                                </div>
                                <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
                                    {filteredCandidates.map((candidate) => {
                                        const checked = sendToAllMatching || selectedIds.includes(candidate._id);
                                        return (
                                            <label key={candidate._id} className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    disabled={sendToAllMatching}
                                                    onChange={() => toggleCandidate(candidate._id)}
                                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800">{candidate.candidateName}</p>
                                                    <p className="text-xs text-slate-500">{candidate.email} · {candidate.status}</p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                    {!filteredCandidates.length && (
                                        <p className="px-4 py-6 text-sm text-slate-500">No candidates match the selected filters.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => setTemplateMode('saved')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${templateMode === 'saved' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>
                                        Saved Template
                                    </button>
                                    <button type="button" onClick={() => setTemplateMode('custom')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${templateMode === 'custom' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>
                                        Custom
                                    </button>
                                    <button type="button" onClick={() => navigate('/ta/email-templates')} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                                        Manage Templates
                                    </button>
                                </div>

                                {templateMode === 'saved' && (
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Template</label>
                                        <select
                                            value={templateId}
                                            onChange={(e) => setTemplateId(e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">{loadingTemplates ? 'Loading templates...' : 'Select template'}</option>
                                            {templates.map((template) => (
                                                <option key={template._id} value={template._id}>
                                                    {template.name} · {template.category}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Subject</label>
                                    <input
                                        type="text"
                                        value={customSubject}
                                        onChange={(e) => setCustomSubject(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter email subject"
                                    />
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <div className="mb-3 flex flex-wrap gap-2">
                                            {TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                                                <button
                                                    key={placeholder}
                                                    type="button"
                                                onClick={() => handleInsertPlaceholder(placeholder)}
                                                className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700"
                                            >
                                                {`{{${placeholder}}}`}
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        value={customHtmlBody}
                                        onChange={(e) => setCustomHtmlBody(e.target.value)}
                                        rows={14}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Write your mail exactly as it should appear. Spaces and blank lines will be preserved."
                                    />
                                    <p className="mt-2 text-xs text-slate-500">Edits made here are sent exactly from this screen, even when you started from a saved template.</p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Custom Note</label>
                                    <textarea
                                        value={customNote}
                                        onChange={(e) => setCustomNote(e.target.value)}
                                        rows={4}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Optional note for {{customNote}}"
                                    />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <Eye size={16} className="text-blue-600" />
                                    <h4 className="text-sm font-bold text-slate-800">Preview</h4>
                                </div>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Sample Subject</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">{previewSubject || 'Preview subject will appear here'}</p>
                                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: previewHtml || '<p>Preview content will appear here.</p>' }} />
                                </div>
                                <p className="mt-3 text-xs text-slate-500">Manual spaces and skipped lines stay preserved for plain text-style bodies.</p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                                <h4 className="text-sm font-bold text-slate-800">Confirm recipients</h4>
                                <div className="space-y-2 text-sm text-slate-600">
                                    <p>Total recipients: <span className="font-bold text-slate-900">{sendToAllMatching ? filteredCandidates.length : selectedIds.length}</span></p>
                                    <p>Template mode: <span className="font-bold text-slate-900">{templateMode === 'saved' ? 'Saved template' : 'Custom'}</span></p>
                                    <p>Template: <span className="font-bold text-slate-900">{activeTemplate?.name || 'Custom email'}</span></p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Subject</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-800">{previewSubject}</p>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                <div className="mb-3 flex items-center gap-2">
                                    <Mail size={16} className="text-blue-600" />
                                    <h4 className="text-sm font-bold text-slate-800">Sample render</h4>
                                </div>
                                <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: previewHtml || '<p>No preview available.</p>' }} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
                    <button
                        type="button"
                        onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Back
                    </button>
                    <div className="flex items-center gap-3">
                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={() => setStep((prev) => Math.min(3, prev + 1))}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={sending}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Send size={16} />
                                {sending ? 'Sending...' : 'Send Mail'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MassMailModal;
