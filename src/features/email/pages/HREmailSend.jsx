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
import api from '@/lib/apiClient';
import { useAuth } from '@/features/auth/context/AuthContext';

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
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const [attachmentFiles, setAttachmentFiles] = useState([]);
    const [dossierSave, setDossierSave] = useState(true);
    const [dossierCategory, setDossierCategory] = useState('Other');
    const [notes, setNotes] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [customEmails, setCustomEmails] = useState({});
    const [contextMenu, setContextMenu] = useState(null);
    const [editingEmailId, setEditingEmailId] = useState(null);

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

    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
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
        workEmail: (previewEmployee && customEmails[previewEmployee._id]) || previewEmployee?.workEmail || previewEmployee?.email || '',
        mobile: '',
        location: '',
        currentYear: String(new Date().getFullYear()),
        currentDate: new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })
    }), [previewEmployee, user?.company?.name, customEmails]);

    const previewSubject = useMemo(() => resolveTemplate(subject, previewData), [previewData, subject]);
    const previewHtml = useMemo(() => formatBodyPreview(htmlBody, previewData), [htmlBody, previewData]);

    const toggleEmployee = (employee) => {
        const employeeId = String(employee._id);
        setSelectedEmployees((current) => {
            const isSelected = current.some((item) => String(item._id) === employeeId);
            if (isSelected) {
                setCustomEmails((prev) => {
                    const next = { ...prev };
                    delete next[employeeId];
                    return next;
                });
                return current.filter((item) => String(item._id) !== employeeId);
            } else {
                return [...current, employee];
            }
        });
    };

    const removeEmployee = (employeeId) => {
        setCustomEmails((prev) => {
            const next = { ...prev };
            delete next[String(employeeId)];
            return next;
        });
        setSelectedEmployees((current) => current.filter((employee) => String(employee._id) !== String(employeeId)));
    };

    const handleEmailEdit = (employeeId, newEmail) => {
        setCustomEmails((prev) => ({
            ...prev,
            [String(employeeId)]: newEmail
        }));
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

            setCustomEmails((prev) => {
                const next = { ...prev };
                visibleEmployeeIds.forEach((id) => {
                    delete next[id];
                });
                return next;
            });
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
        setCustomEmails({});
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

        const customEmailPayload = {};
        selectedEmployees.forEach((employee) => {
            const empIdStr = String(employee._id);
            if (customEmails[empIdStr]) {
                customEmailPayload[empIdStr] = customEmails[empIdStr];
            }
        });
        formData.append('customEmails', JSON.stringify(customEmailPayload));
        if (selectedTemplateId) {
            formData.append('emailTemplateId', selectedTemplateId);
        }
        if (selectedAccountId) {
            formData.append('emailAccountId', selectedAccountId);
        }
        formData.append('subject', subject);
        formData.append('htmlBody', htmlBody);
        if (cc.trim()) formData.append('cc', cc.trim());
        if (bcc.trim()) formData.append('bcc', bcc.trim());
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
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xs md:grid-cols-4">
                {steps.map((item) => {
                    const isActive = step === item.id;
                    const isDone = step > item.id;

                    return (
                        <div
                            key={item.id}
                            className={`rounded-xl border px-2.5 py-2 transition-colors ${
                                isActive
                                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                                    : isDone
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-500'
                            }`}
                        >
                            <div className="text-[9.5px] font-bold uppercase tracking-[0.18em]">Step {item.id}</div>
                            <div className="mt-1 text-xs font-bold">{item.label}</div>
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
            <div className="mx-auto max-w-6xl space-y-4 font-sans">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <div className="flex items-center gap-2.5 text-emerald-600">
                        <CheckCircle2 size={20} />
                        <div>
                            <h1 className="text-base font-bold text-slate-900">HR Email Summary</h1>
                            <p className="mt-0.5 text-[11px] text-slate-500">The send flow has finished for the selected employees.</p>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-2.5 md:grid-cols-3">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Sent</div>
                            <div className="mt-1 text-xl font-black text-emerald-700">{result.totalSent || 0}</div>
                        </div>
                        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Failed</div>
                            <div className="mt-1 text-xl font-black text-amber-700">{result.totalFailed || 0}</div>
                        </div>
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Dossier Saves</div>
                            <div className="mt-1 text-xl font-black text-blue-700">{dossierSavedCount}</div>
                        </div>
                    </div>

                    {result.failed?.length > 0 && (
                        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                            <div className="flex items-center gap-1.5 text-amber-700">
                                <AlertCircle size={15} />
                                <h2 className="text-xs font-bold uppercase tracking-wider">Failed Deliveries</h2>
                            </div>
                            <div className="mt-3 space-y-2">
                                {result.failed.map((entry, index) => (
                                    <div key={`${entry.userId || 'failed'}-${index}`} className="rounded-lg border border-amber-100 bg-white px-3 py-2">
                                        <div className="text-xs font-bold text-slate-800">
                                            {entry.employee ? `${entry.employee.firstName} ${entry.employee.lastName}`.trim() : 'Unknown employee'}
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-slate-500">{entry.reason || 'Failed to send email'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2.5">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 cursor-pointer"
                        >
                            Send Another
                        </button>
                        {primaryHistoryUserId ? (
                            <button
                                type="button"
                                onClick={() => navigate(`/dossier/${primaryHistoryUserId}?tab=email-history`)}
                                className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
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
        <div className="mx-auto max-w-6xl space-y-4 font-sans">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-4 sm:p-5 shadow-2xs">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                            <Mail size={12} />
                            HR Communication
                        </div>
                        <h1 className="mt-2 text-lg font-bold tracking-tight text-slate-900">Send HR Email</h1>
                    </div>
                </div>
            </div>

            {renderStepIndicator()}

            {step === 1 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Choose Recipients</h2>
                            <p className="mt-0.5 text-[11px] text-slate-500">Search active employees and build your recipient list.</p>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search by name, email, code..."
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs outline-none transition focus:border-blue-300 focus:bg-white"
                            />
                        </div>
                    </div>

                    <div className="mt-3 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 md:flex-row md:items-center md:justify-between">
                        <div className="text-xs text-slate-600 font-medium">
                            {visibleEmployeeIds.length > 0
                                ? `${visibleSelectedCount} of ${visibleEmployeeIds.length} visible employees selected`
                                : 'No employees available to select'}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={toggleAllVisibleEmployees}
                                disabled={visibleEmployeeIds.length === 0}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                            >
                                {allVisibleSelected ? 'Clear Visible' : 'Select All Visible'}
                            </button>
                        </div>
                    </div>

                    {selectedEmployees.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                            {selectedEmployees.map((employee) => (
                                <button
                                    key={employee._id}
                                    type="button"
                                    onClick={() => removeEmployee(employee._id)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 cursor-pointer"
                                >
                                    <span>{`${employee.firstName} ${employee.lastName}`.trim()}</span>
                                    <X size={12} />
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                        <div className="max-h-[380px] overflow-auto">
                            <table className="w-full min-w-[700px] border-collapse text-xs">
                                <thead className="sticky top-0 z-10 bg-slate-50">
                                    <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        <th className="w-14 px-3.5 py-2 text-left">
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    type="checkbox"
                                                    checked={allVisibleSelected}
                                                    onChange={toggleAllVisibleEmployees}
                                                    disabled={visibleEmployeeIds.length === 0}
                                                    className="h-3.5 w-3.5 rounded border-slate-300 cursor-pointer"
                                                />
                                                <span>Select</span>
                                            </div>
                                        </th>
                                        <th className="px-3.5 py-2 text-left">Employee</th>
                                        <th className="px-3.5 py-2 text-left">Designation</th>
                                        <th className="px-3.5 py-2 text-left">Department</th>
                                        <th className="px-3.5 py-2 text-left">Email</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {loadingEmployees ? (
                                        <tr>
                                            <td colSpan={5} className="px-3.5 py-8">
                                                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                                                    <Loader size={16} className="animate-spin" />
                                                    Loading employees...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : employees.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-3.5 py-8 text-center text-xs text-slate-500">
                                                No active employees matched your search.
                                            </td>
                                        </tr>
                                    ) : employees.map((employee) => {
                                        const isSelected = selectedEmployees.some((item) => String(item._id) === String(employee._id));

                                        return (
                                            <tr
                                                key={employee._id}
                                                onClick={() => toggleEmployee(employee)}
                                                className={`cursor-pointer transition hover:bg-slate-50/80 ${
                                                    isSelected ? 'bg-blue-50/60' : 'bg-white'
                                                }`}
                                            >
                                                <td className="px-3.5 py-2 align-top">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleEmployee(employee)}
                                                        onClick={(event) => event.stopPropagation()}
                                                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-3.5 py-2 align-top">
                                                    <div className="font-bold text-slate-900 text-xs">{`${employee.firstName} ${employee.lastName}`.trim()}</div>
                                                    <div className="mt-0.5 text-[10.5px] text-slate-400">Code: {employee.employeeCode || 'N/A'}</div>
                                                </td>
                                                <td className="px-3.5 py-2 align-top text-slate-700 text-xs">{employee.designation || 'Not set'}</td>
                                                <td className="px-3.5 py-2 align-top text-slate-600 text-xs">{employee.department || 'No department'}</td>
                                                <td
                                                    className="px-3.5 py-2 align-top text-xs"
                                                    onClick={(e) => {
                                                        if (isSelected) {
                                                            e.stopPropagation();
                                                        }
                                                    }}
                                                    onContextMenu={(e) => {
                                                         if (isSelected) {
                                                             e.preventDefault();
                                                             e.stopPropagation();
                                                             setContextMenu({
                                                                 x: e.clientX,
                                                                 y: e.clientY,
                                                                 employeeId: employee._id
                                                             });
                                                         }
                                                    }}
                                                >
                                                    {editingEmailId === employee._id && isSelected ? (
                                                        <input
                                                            type="text"
                                                            value={customEmails[employee._id] !== undefined ? customEmails[employee._id] : employee.email || ''}
                                                            onChange={(e) => handleEmailEdit(employee._id, e.target.value)}
                                                            onBlur={() => setEditingEmailId(null)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') setEditingEmailId(null);
                                                            }}
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="w-full rounded-lg border border-blue-500 bg-white px-2.5 py-1 text-xs font-semibold outline-none"
                                                            placeholder="Enter custom email address"
                                                        />
                                                    ) : (
                                                        <span
                                                            className={`font-medium transition-colors ${
                                                                isSelected
                                                                    ? 'text-blue-700 underline decoration-dashed underline-offset-4 decoration-blue-300 cursor-context-menu hover:text-blue-800'
                                                                    : 'text-slate-600'
                                                            }`}
                                                            title={isSelected ? 'Right click to change email address' : ''}
                                                        >
                                                             {customEmails[employee._id] !== undefined ? customEmails[employee._id] : employee.email || 'No email found'}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            disabled={selectedEmployees.length === 0}
                            onClick={() => setStep(2)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 cursor-pointer"
                        >
                            Next
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="grid gap-4 lg:grid-cols-[1.25fr,0.75fr]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Compose Email</h2>
                                <p className="mt-0.5 text-[11px] text-slate-500">Pick a template or write from scratch.</p>
                            </div>
                            {loadingOptions && <Loader size={16} className="animate-spin text-slate-400" />}
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Template</label>
                                <select
                                    value={selectedTemplateId}
                                    onChange={(event) => handleTemplateChange(event.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none transition focus:border-blue-300 focus:bg-white"
                                >
                                    <option value="">None (compose manually)</option>
                                    {templates.map((template) => (
                                        <option key={template._id} value={template._id}>{template.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Sender Account</label>
                                <select
                                    value={selectedAccountId}
                                    onChange={(event) => setSelectedAccountId(event.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none transition focus:border-blue-300 focus:bg-white"
                                >
                                    {emailAccounts.map((account) => (
                                        <option key={account._id} value={account._id}>
                                            {account.name || account.fromName || 'Sender'} - {account.fromAddress}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-3">
                            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Subject</label>
                            <input
                                value={subject}
                                onChange={(event) => setSubject(event.target.value)}
                                placeholder="Use placeholders like {{firstName}} and {{companyName}}"
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none transition focus:border-blue-300 focus:bg-white"
                            />
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">CC (Optional)</label>
                                <input
                                    value={cc}
                                    onChange={(event) => setCc(event.target.value)}
                                    placeholder="Comma-separated emails (e.g. hr@company.com)"
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none transition focus:border-blue-300 focus:bg-white"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">BCC (Optional)</label>
                                <input
                                    value={bcc}
                                    onChange={(event) => setBcc(event.target.value)}
                                    placeholder="Comma-separated emails (e.g. audit@company.com)"
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none transition focus:border-blue-300 focus:bg-white"
                                />
                            </div>
                        </div>

                        <div className="mt-3">
                            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Body</label>
                            <textarea
                                value={htmlBody}
                                onChange={(event) => setHtmlBody(event.target.value)}
                                rows={10}
                                placeholder="Write plain text or HTML. Placeholder syntax is supported."
                                className="w-full rounded-xl border border-slate-200 bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-100 outline-none transition focus:border-blue-400"
                            />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {PLACEHOLDERS.map((placeholder) => (
                                <span key={placeholder} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] font-medium text-slate-600">
                                    {`{{${placeholder}}}`}
                                </span>
                            ))}
                        </div>

                        <div className="mt-4 flex justify-between">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                            >
                                <ChevronLeft size={14} />
                                Back
                            </button>
                            <button
                                type="button"
                                disabled={!subject.trim() || !htmlBody.trim()}
                                onClick={() => setStep(3)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 cursor-pointer"
                            >
                                Next
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                        <div className="flex items-center gap-2">
                            <Eye size={16} className="text-blue-600" />
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Preview</h2>
                                <p className="text-[11px] text-slate-500">
                                    {previewEmployee ? `Preview for ${previewData.fullName}` : 'Select a recipient to preview'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subject</div>
                            <div className="mt-1 text-xs font-bold text-slate-900">{previewSubject || 'Subject preview appears here'}</div>
                        </div>

                        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Body</div>
                            <div
                                className="prose prose-xs max-w-none text-slate-700 text-xs"
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <h2 className="text-base font-bold text-slate-900">Attachments & Dossier</h2>
                    <p className="mt-0.5 text-[11px] text-slate-500">Attach files for the email and decide whether they should be saved into employee dossiers.</p>

                    <div
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={handleDrop}
                        className="mt-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center"
                    >
                        <Upload size={20} className="mx-auto text-slate-400" />
                        <h3 className="mt-2 text-sm font-bold text-slate-900">Drop files here or browse</h3>
                        <p className="mt-1 text-[11px] text-slate-500">PDF, DOC, DOCX, and image files are supported. Maximum 5 files, 10MB each.</p>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-3 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 cursor-pointer"
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
                        <div className="mt-4 space-y-2">
                            {attachmentFiles.map((file, index) => (
                                <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <Paperclip size={14} className="text-slate-400 shrink-0" />
                                        <div className="min-w-0">
                                            <div className="truncate text-xs font-bold text-slate-800">{file.name}</div>
                                            <div className="text-[10.5px] text-slate-500">{formatFileSize(file.size)}</div>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => removeFile(index)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700 cursor-pointer">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Save attachments to Employee Dossier</h3>
                                <p className="mt-0.5 text-[11px] text-slate-500">
                                    Files can be copied into each selected employee dossier with a Pending Review status.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDossierSave((current) => !current)}
                                className={`relative h-6 w-11 rounded-full transition cursor-pointer ${
                                    dossierSave ? 'bg-blue-600' : 'bg-slate-300'
                                }`}
                            >
                                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${dossierSave ? 'left-5.5' : 'left-0.5'}`} />
                            </button>
                        </div>

                        {dossierSave && (
                            <div className="mt-3.5 grid gap-3 md:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Category</label>
                                    <select
                                        value={dossierCategory}
                                        onChange={(event) => setDossierCategory(event.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none transition focus:border-blue-300"
                                    >
                                        {DOSSIER_CATEGORIES.map((category) => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700 font-medium">
                                    The attached files will be stored individually in each selected employee dossier under the chosen category.
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-4">
                        <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">HR Notes</label>
                        <textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            rows={3}
                            placeholder="Add an internal note for HR records. This is not included in the email body."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none transition focus:border-blue-300 focus:bg-white"
                        />
                    </div>

                    <div className="mt-4 flex justify-between">
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                        >
                            <ChevronLeft size={14} />
                            Back
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(4)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 cursor-pointer"
                        >
                            Next
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <h2 className="text-base font-bold text-slate-900">Review & Send</h2>
                    <p className="mt-0.5 text-[11px] text-slate-500">Check the summary before sending.</p>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                            <div className="flex items-center gap-1.5 text-slate-800">
                                <Users size={14} />
                                <h3 className="text-xs font-bold">Recipients</h3>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {selectedEmployees.map((employee) => (
                                    <span key={employee._id} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 font-medium">
                                        {`${employee.firstName} ${employee.lastName}`.trim()} · {customEmails[employee._id] !== undefined ? customEmails[employee._id] : employee.email || 'No email'}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                            <div className="flex items-center gap-1.5 text-slate-800">
                                <FileText size={14} />
                                <h3 className="text-xs font-bold">Summary</h3>
                            </div>
                            <div className="mt-3 space-y-2 text-xs text-slate-600">
                                <div><span className="font-bold text-slate-900">Sender:</span> {(emailAccounts.find((account) => account._id === selectedAccountId)?.name) || 'TalentCIO Platform'}</div>
                                <div><span className="font-bold text-slate-900">Template:</span> {(templates.find((template) => String(template._id) === String(selectedTemplateId))?.name) || 'Custom'}</div>
                                <div><span className="font-bold text-slate-900">Subject:</span> {previewSubject || subject}</div>
                                <div><span className="font-bold text-slate-900">Attachments:</span> {attachmentFiles.length > 0 ? attachmentFiles.map((file) => file.name).join(', ') : 'None'}</div>
                                <div><span className="font-bold text-slate-900">Dossier:</span> {dossierSave ? `On · ${dossierCategory}` : 'Off'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Preview</div>
                        <div className="mt-1 text-xs font-bold text-slate-900">{previewSubject || 'No subject'}</div>
                        <div
                            className="prose prose-xs mt-3 max-w-none text-slate-700 text-xs"
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                    </div>

                    <div className="mt-4 flex justify-between">
                        <button
                            type="button"
                            onClick={() => setStep(3)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                        >
                            <ChevronLeft size={14} />
                            Back
                        </button>
                        <button
                            type="button"
                            disabled={sending}
                            onClick={handleSend}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 cursor-pointer"
                        >
                            {sending ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
                            {sending ? `Sending to ${selectedEmployees.length} employees...` : 'Send Email'}
                        </button>
                    </div>
                </div>
            )}

            {contextMenu && (
                <div
                    className="fixed z-50 rounded-xl border border-slate-200 bg-white py-1 shadow-lg text-xs font-semibold text-slate-700 min-w-[150px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => {
                            setEditingEmailId(contextMenu.employeeId);
                            setContextMenu(null);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                        Change email address
                    </button>
                </div>
            )}
        </div>
    );
};

export default HREmailSend;
