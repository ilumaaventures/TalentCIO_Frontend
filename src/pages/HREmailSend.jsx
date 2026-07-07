import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Eye,
    FileText,
    Loader,
    Mail,
    Paperclip,
    Search,
    Send,
    Upload,
    Users,
    X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const PLACEHOLDERS = [
    'firstName',
    'lastName',
    'fullName',
    'designation',
    'department',
    'employeeCode',
    'joiningDate',
    'companyName',
    'workEmail',
    'mobile',
    'location',
    'currentYear'
];
const DOSSIER_CATEGORIES = [
    'Resume',
    'ID Proof',
    'Education',
    'Employment',
    'Payslips',
    'Bank',
    'Relieving Letter',
    'Other',
    'Custom Files'
];
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

const resolveTemplate = (template = '', data = {}) => String(template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => data[key] ?? '');
const hasHtmlMarkup = (content = '') => /<\/?[a-z][\s\S]*>/i.test(String(content || ''));
const escapeHtml = (value = '') => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const formatBodyPreview = (content = '', data = {}) => {
    const resolved = resolveTemplate(content, data);
    if (!resolved.trim()) return '<p style="color:#94a3b8;">Nothing to preview yet.</p>';
    if (hasHtmlMarkup(resolved)) return resolved;
    return `<div style="white-space:pre-wrap;line-height:1.6;">${escapeHtml(resolved)}</div>`;
};
const formatFileSize = (size = 0) => `${(Number(size || 0) / (1024 * 1024)).toFixed(2)} MB`;

const HREmailSend = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const fileInputRef = useRef(null);
    const [step, setStep] = useState(1);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [search, setSearch] = useState('');
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [emailAccounts, setEmailAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState('platform');
    const [subject, setSubject] = useState('');
    const [htmlBody, setHtmlBody] = useState('');
    const [attachmentFiles, setAttachmentFiles] = useState([]);
    const [dossierSave, setDossierSave] = useState(true);
    const [dossierCategory, setDossierCategory] = useState('Other');
    const [notes, setNotes] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [loadingOptions, setLoadingOptions] = useState(true);

    useEffect(() => {
        const timer = window.setTimeout(async () => {
            setLoadingEmployees(true);
            try {
                const response = await api.get('/hr-email/employees', {
                    params: {
                        search,
                        page: 1,
                        limit: 30
                    }
                });
                setEmployees(Array.isArray(response.data?.employees) ? response.data.employees : []);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to load employees');
            } finally {
                setLoadingEmployees(false);
            }
        }, 1500);

        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const fetchOptions = async () => {
            setLoadingOptions(true);
            try {
                const [templatesResponse, sendersResponse] = await Promise.all([
                    api.get('/hr-email/templates'),
                    api.get('/company/email-settings/senders')
                ]);

                const templateOptions = Array.isArray(templatesResponse.data?.templates) ? templatesResponse.data.templates : [];
                const senderPayload = sendersResponse.data || {};
                const senderOptions = [
                    senderPayload.platformOption,
                    ...((senderPayload.accounts || []).filter((account) => account.ready))
                ].filter(Boolean);
                const defaultSenderId = senderOptions.some((sender) => sender._id === senderPayload.defaultAccountId)
                    ? senderPayload.defaultAccountId
                    : (senderOptions[0]?._id || 'platform');

                setTemplates(templateOptions);
                setEmailAccounts(senderOptions);
                setSelectedAccountId(defaultSenderId);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to load sender and template options');
            } finally {
                setLoadingOptions(false);
            }
        };

        fetchOptions();
    }, []);

    const selectedEmployeeMap = useMemo(() => (
        new Map(selectedEmployees.map((employee) => [String(employee._id), employee]))
    ), [selectedEmployees]);
    const visibleEmployeeIds = useMemo(() => (
        employees.map((employee) => String(employee._id))
    ), [employees]);
    const visibleEmployeeIdSet = useMemo(() => (
        new Set(visibleEmployeeIds)
    ), [visibleEmployeeIds]);
    const visibleSelectedCount = useMemo(() => (
        visibleEmployeeIds.filter((employeeId) => selectedEmployeeMap.has(employeeId)).length
    ), [selectedEmployeeMap, visibleEmployeeIds]);
    const allVisibleSelected = visibleEmployeeIds.length > 0 && visibleSelectedCount === visibleEmployeeIds.length;

    const previewEmployee = selectedEmployees[0] || null;
    const previewData = useMemo(() => ({
        firstName: previewEmployee?.firstName || 'Employee',
        lastName: previewEmployee?.lastName || '',
        fullName: `${previewEmployee?.firstName || 'Employee'} ${previewEmployee?.lastName || ''}`.trim(),
        designation: previewEmployee?.designation || '',
        department: previewEmployee?.department || '',
        employeeCode: previewEmployee?.employeeCode || '',
        joiningDate: '',
        companyName: user?.company?.name || '',
        workEmail: previewEmployee?.workEmail || previewEmployee?.email || '',
        mobile: '',
        location: '',
        currentYear: String(new Date().getFullYear()),
        currentDate: new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })
    }), [previewEmployee, user?.company?.name]);

    const previewSubject = useMemo(() => resolveTemplate(subject, previewData), [previewData, subject]);
    const previewHtml = useMemo(() => formatBodyPreview(htmlBody, previewData), [htmlBody, previewData]);

    const toggleEmployee = (employee) => {
        const employeeId = String(employee._id);
        setSelectedEmployees((current) => (
            current.some((item) => String(item._id) === employeeId)
                ? current.filter((item) => String(item._id) !== employeeId)
                : [...current, employee]
        ));
    };

    const removeEmployee = (employeeId) => {
        setSelectedEmployees((current) => current.filter((employee) => String(employee._id) !== String(employeeId)));
    };

    const toggleAllVisibleEmployees = () => {
        setSelectedEmployees((current) => {
            const currentMap = new Map(current.map((employee) => [String(employee._id), employee]));
            const shouldSelectAll = employees.some((employee) => !currentMap.has(String(employee._id)));

            if (shouldSelectAll) {
                employees.forEach((employee) => {
                    currentMap.set(String(employee._id), employee);
                });
                return Array.from(currentMap.values());
            }

            return current.filter((employee) => !visibleEmployeeIdSet.has(String(employee._id)));
        });
    };

    const handleTemplateChange = (templateId) => {
        setSelectedTemplateId(templateId);
        if (!templateId) return;

        const template = templates.find((item) => String(item._id) === String(templateId));
        if (template) {
            setSubject(template.subject || '');
            setHtmlBody(template.htmlBody || '');
        }
    };

    const appendFiles = (incomingFiles = []) => {
        const nextFiles = Array.from(incomingFiles);
        if (nextFiles.length === 0) return;

        if ((attachmentFiles.length + nextFiles.length) > MAX_ATTACHMENTS) {
            toast.error(`You can attach up to ${MAX_ATTACHMENTS} files.`);
            return;
        }

        const invalidFile = nextFiles.find((file) => file.size > MAX_ATTACHMENT_SIZE_BYTES);
        if (invalidFile) {
            toast.error(`${invalidFile.name} exceeds the 10MB limit.`);
            return;
        }

        setAttachmentFiles((current) => [...current, ...nextFiles]);
    };

    const handleFileChange = (event) => {
        appendFiles(event.target.files);
        event.target.value = '';
    };

    const handleDrop = (event) => {
        event.preventDefault();
        appendFiles(event.dataTransfer.files);
    };

    const removeFile = (index) => {
        setAttachmentFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
    };

    const resetForm = () => {
        setStep(1);
        setSelectedEmployees([]);
        setSearch('');
        setSelectedTemplateId('');
        setSubject('');
        setHtmlBody('');
        setAttachmentFiles([]);
        setDossierSave(true);
        setDossierCategory('Other');
        setNotes('');
        setResult(null);
    };

    const handleSend = async () => {
        if (selectedEmployees.length === 0) {
            toast.error('Select at least one employee.');
            return;
        }

        if (!subject.trim() || !htmlBody.trim()) {
            toast.error('Subject and body are required.');
            return;
        }

        if (dossierSave && attachmentFiles.length > 0 && !dossierCategory) {
            toast.error('Choose a dossier category for the attachments.');
            return;
        }

        const formData = new FormData();
        formData.append('recipientUserIds', JSON.stringify(selectedEmployees.map((employee) => employee._id)));
        if (selectedTemplateId) {
            formData.append('emailTemplateId', selectedTemplateId);
        }
        if (selectedAccountId) {
            formData.append('emailAccountId', selectedAccountId);
        }
        formData.append('subject', subject);
        formData.append('htmlBody', htmlBody);
        formData.append('dossierSave', String(dossierSave));
        formData.append('dossierCategory', dossierCategory);
        formData.append('notes', notes);
        attachmentFiles.forEach((file) => formData.append('attachments', file));

        setSending(true);
        try {
            const response = await api.post('/hr-email/send', formData);
            const payload = response.data || {};
            setResult({
                ...payload,
                sent: (payload.sent || []).map((item) => ({
                    ...item,
                    employee: selectedEmployeeMap.get(String(item.userId))
                })),
                failed: (payload.failed || []).map((item) => ({
                    ...item,
                    employee: selectedEmployeeMap.get(String(item.userId))
                }))
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send HR email');
        } finally {
            setSending(false);
        }
    };

    const renderStepIndicator = () => {
        const steps = [
            { id: 1, label: 'Recipients' },
            { id: 2, label: 'Compose' },
            { id: 3, label: 'Attachments' },
            { id: 4, label: 'Review' }
        ];

        return (
            <div className="grid grid-cols-2 gap-2.5 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-4">
                {steps.map((item) => {
                    const isActive = step === item.id;
                    const isDone = step > item.id;

                    return (
                        <div
                            key={item.id}
                            className={`rounded-2xl border px-3 py-2.5 transition-colors ${
                                isActive
                                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                                    : isDone
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-500'
                            }`}
                        >
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em]">Step {item.id}</div>
                            <div className="mt-1.5 text-sm font-semibold">{item.label}</div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (result) {
        const dossierSavedCount = (result.sent || []).filter((entry) => Array.isArray(entry.dossierDocIds) && entry.dossierDocIds.length > 0).length;
        const primaryHistoryUserId = result.sent?.[0]?.userId || selectedEmployees[0]?._id;

        return (
            <div className="mx-auto max-w-6xl space-y-5">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3 text-emerald-600">
                        <CheckCircle2 size={24} />
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">HR Email Summary</h1>
                            <p className="mt-1 text-sm text-slate-500">The send flow has finished for the selected employees.</p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Sent</div>
                            <div className="mt-2 text-2xl font-black text-emerald-700">{result.totalSent || 0}</div>
                        </div>
                        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Failed</div>
                            <div className="mt-2 text-2xl font-black text-amber-700">{result.totalFailed || 0}</div>
                        </div>
                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Dossier Saves</div>
                            <div className="mt-2 text-2xl font-black text-blue-700">{dossierSavedCount}</div>
                        </div>
                    </div>

                    {result.failed?.length > 0 && (
                        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                            <div className="flex items-center gap-2 text-amber-700">
                                <AlertCircle size={18} />
                                <h2 className="text-sm font-bold uppercase tracking-[0.22em]">Failed Deliveries</h2>
                            </div>
                            <div className="mt-4 space-y-3">
                                {result.failed.map((entry, index) => (
                                    <div key={`${entry.userId || 'failed'}-${index}`} className="rounded-xl border border-amber-100 bg-white px-4 py-3">
                                        <div className="font-semibold text-slate-800">
                                            {entry.employee ? `${entry.employee.firstName} ${entry.employee.lastName}`.trim() : 'Unknown employee'}
                                        </div>
                                        <div className="mt-1 text-sm text-slate-500">{entry.reason || 'Failed to send email'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Send Another
                        </button>
                        {primaryHistoryUserId ? (
                            <button
                                type="button"
                                onClick={() => navigate(`/dossier/${primaryHistoryUserId}?tab=email-history`)}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                View History
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-5">
            <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-6 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                            <Mail size={14} />
                            HR Communication
                        </div>
                        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900">Send HR Email</h1>
                    </div>
                </div>
            </div>

            {renderStepIndicator()}

            {step === 1 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Choose Recipients</h2>
                            <p className="mt-1 text-sm text-slate-500">Search active employees and build your recipient list.</p>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search by name, email, code..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm text-slate-600">
                            {visibleEmployeeIds.length > 0
                                ? `${visibleSelectedCount} of ${visibleEmployeeIds.length} visible employees selected`
                                : 'No employees available to select'}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={toggleAllVisibleEmployees}
                                disabled={visibleEmployeeIds.length === 0}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                {allVisibleSelected ? 'Clear Visible' : 'Select All Visible'}
                            </button>
                        </div>
                    </div>

                    {selectedEmployees.length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-2">
                            {selectedEmployees.map((employee) => (
                                <button
                                    key={employee._id}
                                    type="button"
                                    onClick={() => removeEmployee(employee._id)}
                                    className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                                >
                                    <span>{`${employee.firstName} ${employee.lastName}`.trim()}</span>
                                    <X size={14} />
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                        <div className="max-h-[420px] overflow-auto">
                            <table className="w-full min-w-[720px] border-collapse text-sm">
                                <thead className="sticky top-0 z-10 bg-slate-50">
                                    <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        <th className="w-16 px-4 py-3 text-left">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={allVisibleSelected}
                                                    onChange={toggleAllVisibleEmployees}
                                                    disabled={visibleEmployeeIds.length === 0}
                                                    className="h-4 w-4 rounded border-slate-300"
                                                />
                                                <span>Select</span>
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left">Employee</th>
                                        <th className="px-4 py-3 text-left">Designation</th>
                                        <th className="px-4 py-3 text-left">Department</th>
                                        <th className="px-4 py-3 text-left">Email</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {loadingEmployees ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-10">
                                                <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
                                                    <Loader size={18} className="animate-spin" />
                                                    Loading employees...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : employees.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                                                No active employees matched your search.
                                            </td>
                                        </tr>
                                    ) : employees.map((employee) => {
                                        const isSelected = selectedEmployees.some((item) => String(item._id) === String(employee._id));

                                        return (
                                            <tr
                                                key={employee._id}
                                                onClick={() => toggleEmployee(employee)}
                                                className={`cursor-pointer transition hover:bg-slate-50 ${
                                                    isSelected ? 'bg-blue-50/60' : 'bg-white'
                                                }`}
                                            >
                                                <td className="px-4 py-3 align-top">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleEmployee(employee)}
                                                        onClick={(event) => event.stopPropagation()}
                                                        className="mt-0.5 h-4 w-4 rounded border-slate-300"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <div className="font-semibold text-slate-900">{`${employee.firstName} ${employee.lastName}`.trim()}</div>
                                                    <div className="mt-1 text-xs text-slate-500">Code: {employee.employeeCode || 'N/A'}</div>
                                                </td>
                                                <td className="px-4 py-3 align-top text-slate-700">{employee.designation || 'Not set'}</td>
                                                <td className="px-4 py-3 align-top text-slate-600">{employee.department || 'No department'}</td>
                                                <td className="px-4 py-3 align-top text-slate-600">{employee.email || 'No email found'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            type="button"
                            disabled={selectedEmployees.length === 0}
                            onClick={() => setStep(2)}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                            Next
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Compose Email</h2>
                                <p className="mt-1 text-sm text-slate-500">Pick a template or write from scratch.</p>
                            </div>
                            {loadingOptions && <Loader size={18} className="animate-spin text-slate-400" />}
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Template</label>
                                <select
                                    value={selectedTemplateId}
                                    onChange={(event) => handleTemplateChange(event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
                                >
                                    <option value="">None (compose manually)</option>
                                    {templates.map((template) => (
                                        <option key={template._id} value={template._id}>{template.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sender Account</label>
                                <select
                                    value={selectedAccountId}
                                    onChange={(event) => setSelectedAccountId(event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
                                >
                                    {emailAccounts.map((account) => (
                                        <option key={account._id} value={account._id}>
                                            {account.name || account.fromName || 'Sender'} - {account.fromAddress}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Subject</label>
                            <input
                                value={subject}
                                onChange={(event) => setSubject(event.target.value)}
                                placeholder="Use placeholders like {{firstName}} and {{companyName}}"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
                            />
                        </div>

                        <div className="mt-4">
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Body</label>
                            <textarea
                                value={htmlBody}
                                onChange={(event) => setHtmlBody(event.target.value)}
                                rows={14}
                                placeholder="Write plain text or HTML. Placeholder syntax is supported."
                                className="w-full rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3.5 font-mono text-sm text-slate-100 outline-none transition focus:border-blue-400"
                            />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {PLACEHOLDERS.map((placeholder) => (
                                <span key={placeholder} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                                    {`{{${placeholder}}}`}
                                </span>
                            ))}
                        </div>

                        <div className="mt-6 flex justify-between">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                <ChevronLeft size={16} />
                                Back
                            </button>
                            <button
                                type="button"
                                disabled={!subject.trim() || !htmlBody.trim()}
                                onClick={() => setStep(3)}
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                Next
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Eye size={18} className="text-blue-600" />
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Preview</h2>
                                <p className="text-sm text-slate-500">
                                    {previewEmployee ? `Preview for ${previewData.fullName}` : 'Select a recipient to preview'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Subject</div>
                            <div className="mt-2 text-sm font-semibold text-slate-900">{previewSubject || 'Subject preview appears here'}</div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Body</div>
                            <div
                                className="prose prose-sm max-w-none text-slate-700"
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">Attachments & Dossier</h2>
                    <p className="mt-1 text-sm text-slate-500">Attach files for the email and decide whether they should be saved into employee dossiers.</p>

                    <div
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={handleDrop}
                        className="mt-5 rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center"
                    >
                        <Upload size={24} className="mx-auto text-slate-400" />
                        <h3 className="mt-3 text-base font-semibold text-slate-900">Drop files here or browse</h3>
                        <p className="mt-2 text-sm text-slate-500">PDF, DOC, DOCX, and image files are supported. Maximum 5 files, 10MB each.</p>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Choose Files
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>

                    {attachmentFiles.length > 0 && (
                        <div className="mt-6 space-y-3">
                            {attachmentFiles.map((file, index) => (
                                <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <Paperclip size={16} className="text-slate-400" />
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-slate-800">{file.name}</div>
                                            <div className="text-xs text-slate-500">{formatFileSize(file.size)}</div>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => removeFile(index)} className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700">
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Save attachments to Employee Dossier</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Files can be copied into each selected employee dossier with a Pending Review status.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDossierSave((current) => !current)}
                                className={`relative h-7 w-12 rounded-full transition ${
                                    dossierSave ? 'bg-blue-600' : 'bg-slate-300'
                                }`}
                            >
                                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${dossierSave ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>

                        {dossierSave && (
                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Category</label>
                                    <select
                                        value={dossierCategory}
                                        onChange={(event) => setDossierCategory(event.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-300"
                                    >
                                        {DOSSIER_CATEGORIES.map((category) => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                                    The attached files will be stored individually in each selected employee dossier under the chosen category.
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">HR Notes</label>
                        <textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            rows={4}
                            placeholder="Add an internal note for HR records. This is not included in the email body."
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
                        />
                    </div>

                    <div className="mt-6 flex justify-between">
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            <ChevronLeft size={16} />
                            Back
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(4)}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Next
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">Review & Send</h2>
                    <p className="mt-1 text-sm text-slate-500">Check the summary before sending.</p>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <div className="flex items-center gap-2 text-slate-800">
                                <Users size={16} />
                                <h3 className="font-semibold">Recipients</h3>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {selectedEmployees.map((employee) => (
                                    <span key={employee._id} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">
                                        {`${employee.firstName} ${employee.lastName}`.trim()} · {employee.email || 'No email'}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <div className="flex items-center gap-2 text-slate-800">
                                <FileText size={16} />
                                <h3 className="font-semibold">Summary</h3>
                            </div>
                            <div className="mt-4 space-y-3 text-sm text-slate-600">
                                <div><span className="font-semibold text-slate-900">Sender:</span> {(emailAccounts.find((account) => account._id === selectedAccountId)?.name) || 'TalentCIO Platform'}</div>
                                <div><span className="font-semibold text-slate-900">Template:</span> {(templates.find((template) => String(template._id) === String(selectedTemplateId))?.name) || 'Custom'}</div>
                                <div><span className="font-semibold text-slate-900">Subject:</span> {previewSubject || subject}</div>
                                <div><span className="font-semibold text-slate-900">Attachments:</span> {attachmentFiles.length > 0 ? attachmentFiles.map((file) => file.name).join(', ') : 'None'}</div>
                                <div><span className="font-semibold text-slate-900">Dossier:</span> {dossierSave ? `On · ${dossierCategory}` : 'Off'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Preview</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{previewSubject || 'No subject'}</div>
                        <div
                            className="prose prose-sm mt-4 max-w-none text-slate-700"
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                    </div>

                    <div className="mt-6 flex justify-between">
                        <button
                            type="button"
                            onClick={() => setStep(3)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            <ChevronLeft size={16} />
                            Back
                        </button>
                        <button
                            type="button"
                            disabled={sending}
                            onClick={handleSend}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                        >
                            {sending ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                            {sending ? `Sending to ${selectedEmployees.length} employees...` : 'Send Email'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HREmailSend;
