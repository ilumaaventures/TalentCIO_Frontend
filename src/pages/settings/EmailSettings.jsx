import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    AlertTriangle,
    CheckCircle2,
    Edit,
    Eye,
    FileText,
    Image,
    Loader2,
    Mail,
    Palette,
    Plus,
    Save,
    Send,
    Server,
    ShieldCheck,
    Trash2,
    Upload,
    X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
    getSupportedPlaceholderTokens,
    renderTemplateBody,
    TEMPLATE_PLACEHOLDERS,
    resolveTemplate,
    validateTemplateSyntax
} from '../../utils/templatePlaceholders';

const PLATFORM_ID = 'platform';

const TABS = [
    { id: 'senders', label: 'Email Senders', icon: Server },
    { id: 'branding', label: 'Email Branding', icon: Palette },
    { id: 'templates', label: 'Email Templates', icon: FileText },
    { id: 'preview', label: 'Preview', icon: Eye }
];

const CATEGORY_LABELS = {
    interview_invite: 'Interview Invite',
    rejection: 'Rejection',
    offer: 'Offer',
    shortlist: 'Shortlist',
    general: 'General'
};

const SAMPLE_DATA = {
    candidateName: 'Aarav Mehta',
    email: 'aarav@example.com',
    mobile: '9876543210',
    jobTitle: 'Frontend Engineer',
    client: 'Demo Client',
    department: 'Engineering',
    recruiterName: 'Talent Acquisition Team',
    companyName: 'Your Company',
    requestId: 'HRR-2026-001',
    currentStatus: 'Interested',
    interviewDate: '10 May 2026, 04:00 PM',
    interviewLink: 'https://meet.example.com/interview',
    customNote: 'Please join 10 minutes early.'
};

const createEmptyAccount = () => ({
    _id: '',
    name: '',
    provider: 'brevo',
    fromName: '',
    fromAddress: '',
    verified: false,
    verifiedAt: null,
    testSentAt: null,
    ready: false,
    brevoApiKey: '',
    smtp: {
        host: '',
        port: 587,
        secure: false,
        user: '',
        pass: ''
    }
});

const normalizeAccount = (account = {}) => ({
    ...createEmptyAccount(),
    ...account,
    smtp: {
        ...createEmptyAccount().smtp,
        ...(account?.smtp || {})
    }
});

const createDraftId = () => `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatDateTime = (value) => {
    if (!value) return 'Not yet';

    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'Not yet'
        : date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
};

const SendersTab = ({ canManage }) => {
    const { user, refreshProfile } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [platformOption] = useState({
        _id: PLATFORM_ID,
        name: 'TalentCIO Platform',
        provider: 'platform',
        fromName: 'TalentCIO',
        fromAddress: 'no-reply@talentcio.in',
        verified: true,
        ready: true
    });
    const [defaultAccountId, setDefaultAccountId] = useState(PLATFORM_ID);
    const [selectedAccountId, setSelectedAccountId] = useState('new');
    const [form, setForm] = useState(createEmptyAccount());
    const [recipientEmail, setRecipientEmail] = useState(user?.email || '');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        setRecipientEmail(user?.email || '');
    }, [user?.email]);

    const selectedSavedAccount = useMemo(
        () => accounts.find((account) => account._id === selectedAccountId) || null,
        [accounts, selectedAccountId]
    );

    const isBrevo = form.provider === 'brevo';
    const isSmtp = form.provider === 'smtp';
    const selectedSavedAccountIsPersisted = selectedSavedAccount && !String(selectedSavedAccount._id).startsWith('draft-');
    const formHasContent = Boolean(
        form.name.trim() ||
        form.fromName.trim() ||
        form.fromAddress.trim() ||
        form.brevoApiKey.trim() ||
        form.smtp.host.trim() ||
        form.smtp.user.trim()
    );

    const updateForm = (patch) => {
        setForm((current) => ({ ...current, ...patch }));
    };

    const updateSmtp = (patch) => {
        setForm((current) => ({
            ...current,
            smtp: {
                ...current.smtp,
                ...patch
            }
        }));
    };

    const loadSettings = async () => {
        const { data } = await api.get('/company/email-settings');
        const nextAccounts = Array.isArray(data?.accounts) ? data.accounts.map(normalizeAccount) : [];
        setAccounts(nextAccounts);
        setDefaultAccountId(data?.defaultAccountId || PLATFORM_ID);

        if (nextAccounts.length > 0) {
            setSelectedAccountId(nextAccounts[0]._id);
            setForm(normalizeAccount(nextAccounts[0]));
        } else {
            setSelectedAccountId('new');
            setForm(createEmptyAccount());
        }
    };

    useEffect(() => {
        loadSettings()
            .catch((error) => toast.error(error.response?.data?.message || 'Failed to load senders'))
            .finally(() => setLoading(false));
    }, []);

    const selectAccount = (accountId) => {
        if (accountId === 'new') {
            setSelectedAccountId('new');
            setForm(createEmptyAccount());
            return;
        }

        const account = accounts.find((item) => item._id === accountId);
        if (!account) return;

        setSelectedAccountId(accountId);
        setForm(normalizeAccount(account));
    };

    const validateForm = () => {
        if (!form.name.trim()) return 'Sender name is required.';
        if (!form.fromAddress.trim()) return 'From address is required.';

        if (form.provider === 'brevo' && !form.brevoApiKey.trim()) {
            return 'Brevo API key is required.';
        }

        if (
            form.provider === 'smtp' &&
            (!form.smtp.host.trim() || !form.smtp.user.trim() || !form.smtp.pass.trim())
        ) {
            return 'SMTP host, user, and password are required.';
        }

        return '';
    };

    const saveSenderToList = () => {
        if (!canManage) return;

        const validationMessage = validateForm();
        if (validationMessage) {
            toast.error(validationMessage);
            return;
        }

        const nextId = form._id || createDraftId();
        const draftAccount = normalizeAccount({ ...form, _id: nextId });

        setAccounts((current) => {
            const exists = current.some((account) => account._id === nextId);
            return exists
                ? current.map((account) => (account._id === nextId ? draftAccount : account))
                : [...current, draftAccount];
        });
        setSelectedAccountId(nextId);
        setForm(draftAccount);
        toast.success(selectedSavedAccount ? 'Sender updated in draft' : 'Sender added to draft');
    };

    const removeSelectedSender = () => {
        if (!canManage || !selectedSavedAccount) return;

        setAccounts((current) => current.filter((account) => account._id !== selectedSavedAccount._id));
        if (defaultAccountId === selectedSavedAccount._id) {
            setDefaultAccountId(PLATFORM_ID);
        }
        setSelectedAccountId('new');
        setForm(createEmptyAccount());
        toast.success('Sender removed');
    };

    const handleSaveSettings = async () => {
        if (!canManage) return;

        let accountsToSave = [...accounts];

        if (selectedAccountId === 'new' && formHasContent) {
            const validationMessage = validateForm();
            if (validationMessage) {
                toast.error(validationMessage);
                return;
            }

            accountsToSave = [...accountsToSave, normalizeAccount({ ...form, _id: createDraftId() })];
        } else if (selectedSavedAccount) {
            const validationMessage = validateForm();
            if (!validationMessage) {
                accountsToSave = accountsToSave.map((account) => (
                    account._id === selectedSavedAccount._id
                        ? normalizeAccount(form)
                        : account
                ));
            }
        }

        setSaving(true);
        try {
            await api.put('/company/email-settings', {
                defaultAccountId,
                accounts: accountsToSave
            });
            await refreshProfile();
            toast.success('Email settings saved');
            await loadSettings();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleSendTest = async () => {
        if (!canManage) return;
        if (!selectedSavedAccountIsPersisted) {
            toast.error('Save settings first.');
            return;
        }

        setSendingTest(true);
        try {
            const { data } = await api.post('/company/email-settings/test', {
                recipientEmail,
                emailAccountId: selectedSavedAccount._id
            });
            toast.success(data?.message || 'Test email sent');
            await loadSettings();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send test');
        } finally {
            setSendingTest(false);
        }
    };

    const handleVerify = async () => {
        if (!canManage) return;
        if (!selectedSavedAccountIsPersisted) {
            toast.error('Save settings first.');
            return;
        }

        setVerifying(true);
        try {
            await api.post('/company/email-settings/verify-sender', {
                emailAccountId: selectedSavedAccount._id
            });
            toast.success('Sender marked as verified');
            await loadSettings();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to verify');
        } finally {
            setVerifying(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-slate-500">
                    Add Brevo or SMTP senders and set a workspace default.
                </p>
                {canManage && (
                    <button
                        type="button"
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Settings
                    </button>
                )}
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div className="flex items-center gap-2">
                            <Mail size={16} className="text-blue-600" />
                            <h3 className="font-bold text-slate-800">Saved Senders</h3>
                        </div>
                        {canManage && (
                            <button
                                type="button"
                                onClick={() => selectAccount('new')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                <Plus size={14} />
                                New
                            </button>
                        )}
                    </div>

                    <div className="space-y-2 p-5">
                        <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${defaultAccountId === PLATFORM_ID ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                            <input
                                type="radio"
                                name="default-sender"
                                checked={defaultAccountId === PLATFORM_ID}
                                onChange={() => canManage && setDefaultAccountId(PLATFORM_ID)}
                                disabled={!canManage}
                                className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-800">{platformOption.name}</span>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                                        Platform
                                    </span>
                                </div>
                                <p className="mt-0.5 text-xs text-slate-500">{platformOption.fromAddress}</p>
                            </div>
                        </label>

                        {accounts.map((account) => (
                            <div
                                key={account._id}
                                className={`rounded-xl border p-4 transition ${selectedAccountId === account._id ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="default-sender"
                                        checked={defaultAccountId === account._id}
                                        onChange={() => canManage && setDefaultAccountId(account._id)}
                                        disabled={!canManage}
                                        className="mt-0.5"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => selectAccount(account._id)}
                                        className="min-w-0 flex-1 text-left"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-sm font-semibold text-slate-800">{account.name}</span>
                                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${account.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                {account.ready ? 'Ready' : 'Needs setup'}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {account.fromAddress} - {account.provider.toUpperCase()}
                                        </p>
                                    </button>
                                </div>
                            </div>
                        ))}

                        {accounts.length === 0 && (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                No custom senders. Add one on the right.
                            </div>
                        )}
                    </div>
                </section>

                <div className="space-y-5">
                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                            <Server size={16} className="text-blue-600" />
                            <h3 className="font-bold text-slate-800">{selectedSavedAccount ? 'Edit Sender' : 'New Sender'}</h3>
                        </div>

                        <div className="space-y-4 p-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Sender Label</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(event) => updateForm({ name: event.target.value })}
                                        disabled={!canManage}
                                        placeholder="Hiring Team India"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Provider</label>
                                    <select
                                        value={form.provider}
                                        onChange={(event) => updateForm({ provider: event.target.value })}
                                        disabled={!canManage}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                    >
                                        <option value="brevo">Brevo</option>
                                        <option value="smtp">Custom SMTP</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">From Name</label>
                                    <input
                                        type="text"
                                        value={form.fromName}
                                        onChange={(event) => updateForm({ fromName: event.target.value })}
                                        disabled={!canManage}
                                        placeholder="Acme Corp HR"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">From Address</label>
                                    <input
                                        type="email"
                                        value={form.fromAddress}
                                        onChange={(event) => updateForm({ fromAddress: event.target.value })}
                                        disabled={!canManage}
                                        placeholder="hr@yourcompany.com"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                    />
                                </div>
                            </div>

                            {isBrevo && (
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Brevo API Key</label>
                                    <input
                                        type="text"
                                        value={form.brevoApiKey}
                                        onChange={(event) => updateForm({ brevoApiKey: event.target.value })}
                                        disabled={!canManage}
                                        placeholder="xkeysib-xxxxxxxxxxxxxxxx"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                    />
                                </div>
                            )}

                            {isSmtp && (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">SMTP Host</label>
                                        <input
                                            type="text"
                                            value={form.smtp.host}
                                            onChange={(event) => updateSmtp({ host: event.target.value })}
                                            disabled={!canManage}
                                            placeholder="smtp.gmail.com"
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Port</label>
                                        <input
                                            type="number"
                                            value={form.smtp.port}
                                            onChange={(event) => updateSmtp({ port: event.target.value })}
                                            disabled={!canManage}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Username</label>
                                        <input
                                            type="text"
                                            value={form.smtp.user}
                                            onChange={(event) => updateSmtp({ user: event.target.value })}
                                            disabled={!canManage}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
                                        <input
                                            type="password"
                                            value={form.smtp.pass}
                                            onChange={(event) => updateSmtp({ pass: event.target.value })}
                                            disabled={!canManage}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                        />
                                    </div>
                                    <label className="cursor-pointer text-sm text-slate-700 sm:col-span-2 flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={form.smtp.secure}
                                            onChange={(event) => updateSmtp({ secure: event.target.checked, port: event.target.checked ? 465 : 587 })}
                                            disabled={!canManage}
                                            className="rounded"
                                        />
                                        Use SSL (port 465)
                                    </label>
                                </div>
                            )}

                            {canManage && (
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={saveSenderToList}
                                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                                    >
                                        <Save size={15} />
                                        {selectedSavedAccount ? 'Update Draft' : 'Add to Draft'}
                                    </button>
                                    {selectedSavedAccount && (
                                        <button
                                            type="button"
                                            onClick={removeSelectedSender}
                                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                                        >
                                            <Trash2 size={15} />
                                            Remove
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className={`rounded-2xl border p-4 text-sm ${selectedSavedAccount?.verified ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-start gap-2">
                                {selectedSavedAccount?.verified ? (
                                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                                ) : (
                                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                                )}
                                <div>
                                    <p className="font-semibold">
                                        {selectedSavedAccount
                                            ? (selectedSavedAccount.verified
                                                ? `Verified - ${selectedSavedAccount.fromAddress}`
                                                : 'Not verified - send a test to confirm')
                                            : 'Select a sender to test or verify'}
                                    </p>
                                    <p className="mt-0.5 text-xs opacity-75">
                                        Last test: {formatDateTime(selectedSavedAccount?.testSentAt)} - Verified: {formatDateTime(selectedSavedAccount?.verifiedAt)}
                                    </p>
                                </div>
                            </div>
                            {canManage && selectedSavedAccount && !selectedSavedAccount.verified && (
                                <button
                                    type="button"
                                    onClick={handleVerify}
                                    disabled={verifying || !selectedSavedAccountIsPersisted}
                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-current px-3 py-1.5 text-sm font-semibold hover:bg-white/40 disabled:opacity-60"
                                >
                                    {verifying ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                    Mark Verified
                                </button>
                            )}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                            <Send size={16} className="text-blue-600" />
                            <h3 className="font-bold text-slate-800">Test Delivery</h3>
                        </div>
                        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
                            <div className="flex-1">
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Recipient Email</label>
                                <input
                                    type="email"
                                    value={recipientEmail}
                                    onChange={(event) => setRecipientEmail(event.target.value)}
                                    disabled={!canManage}
                                    placeholder="admin@yourcompany.com"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                />
                            </div>
                            {canManage && (
                                <button
                                    type="button"
                                    onClick={handleSendTest}
                                    disabled={sendingTest || !selectedSavedAccountIsPersisted}
                                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                                >
                                    {sendingTest ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    Send Test
                                </button>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

const BrandingTab = ({ canManage }) => {
    const { refreshProfile } = useAuth();
    const [branding, setBranding] = useState({
        displayName: '',
        logoUrl: '',
        brandColor: '#6366f1',
        footerText: '',
        replyTo: '',
        companyLogo: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const loadBranding = async () => {
        const { data } = await api.get('/email-branding');
        setBranding(data);
    };

    useEffect(() => {
        loadBranding()
            .catch(() => toast.error('Failed to load branding'))
            .finally(() => setLoading(false));
    }, []);

    const refreshWorkspaceProfile = async () => {
        try {
            await refreshProfile();
        } catch (error) {
            console.error('Failed to refresh profile after branding update', error);
        }
    };

    const handleSave = async () => {
        if (!canManage) return;

        setSaving(true);
        try {
            await api.put('/email-branding', {
                displayName: branding.displayName,
                brandColor: branding.brandColor,
                footerText: branding.footerText,
                replyTo: branding.replyTo
            });
            await refreshWorkspaceProfile();
            toast.success('Email branding saved');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (file) => {
        if (!file || !canManage) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('logo', file);
            const { data } = await api.post('/email-branding/logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setBranding((current) => ({ ...current, logoUrl: data.logoUrl }));
            await refreshWorkspaceProfile();
            toast.success('Email logo uploaded');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveLogo = async () => {
        if (!canManage) return;

        try {
            await api.delete('/email-branding/logo');
            setBranding((current) => ({ ...current, logoUrl: '' }));
            await refreshWorkspaceProfile();
            toast.success('Logo removed');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove logo');
        }
    };

    const handleUseCompanyLogo = async () => {
        if (!canManage) return;

        try {
            const { data } = await api.post('/email-branding/use-company-logo');
            setBranding((current) => ({ ...current, logoUrl: data.logoUrl }));
            await refreshWorkspaceProfile();
            toast.success('Company logo applied');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
            <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                        <Image size={16} className="text-blue-600" />
                        <h3 className="font-bold text-slate-800">Email Logo</h3>
                    </div>
                    <div className="space-y-4 p-5">
                        {branding.logoUrl ? (
                            <div className="flex items-center gap-4">
                                <div className="flex h-16 w-36 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                    <img src={branding.logoUrl} alt="Email logo" className="max-h-12 max-w-full object-contain" />
                                </div>
                                {canManage && (
                                    <div className="space-y-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="block text-sm font-semibold text-blue-600 hover:underline"
                                        >
                                            Change logo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleRemoveLogo}
                                            className="block text-sm text-red-500 hover:underline"
                                        >
                                            Remove logo
                                        </button>
                                        {branding.companyLogo && (
                                            <button
                                                type="button"
                                                onClick={handleUseCompanyLogo}
                                                className="block text-sm text-slate-500 hover:underline"
                                            >
                                                Use company logo
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                {canManage && (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
                                    >
                                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                        Upload Email Logo
                                    </button>
                                )}
                                {branding.companyLogo && canManage && (
                                    <button
                                        type="button"
                                        onClick={handleUseCompanyLogo}
                                        className="text-sm font-medium text-blue-600 hover:underline"
                                    >
                                        Use company logo
                                    </button>
                                )}
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/svg+xml,image/webp"
                            className="hidden"
                            onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                        />
                        <p className="text-xs text-slate-400">
                            JPG, PNG, SVG, WEBP - Max 3MB - Displayed at 44px height in email header
                        </p>
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                        <Palette size={16} className="text-blue-600" />
                        <h3 className="font-bold text-slate-800">Brand Identity</h3>
                    </div>

                    <div className="grid gap-5 p-5 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Display Name</label>
                            <input
                                type="text"
                                value={branding.displayName}
                                onChange={(event) => setBranding((current) => ({ ...current, displayName: event.target.value }))}
                                placeholder="Acme Corp HR Team"
                                disabled={!canManage}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                            />
                            <p className="mt-1 text-xs text-slate-400">Used as the branded display name for company emails.</p>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Brand Color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={branding.brandColor}
                                    onChange={(event) => setBranding((current) => ({ ...current, brandColor: event.target.value }))}
                                    disabled={!canManage}
                                    className="h-10 w-10 cursor-pointer rounded-lg border border-slate-200 p-0.5 disabled:opacity-60"
                                />
                                <input
                                    type="text"
                                    value={branding.brandColor}
                                    onChange={(event) => setBranding((current) => ({ ...current, brandColor: event.target.value }))}
                                    placeholder="#6366f1"
                                    disabled={!canManage}
                                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                />
                            </div>
                            <p className="mt-1 text-xs text-slate-400">Used as the email header background color.</p>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Reply-To Address</label>
                            <input
                                type="email"
                                value={branding.replyTo}
                                onChange={(event) => setBranding((current) => ({ ...current, replyTo: event.target.value }))}
                                placeholder="hr@yourcompany.com (optional)"
                                disabled={!canManage}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email Footer Text</label>
                            <textarea
                                value={branding.footerText}
                                onChange={(event) => setBranding((current) => ({ ...current, footerText: event.target.value }))}
                                placeholder="© 2026 Acme Corp. All rights reserved. | Bangalore, India"
                                disabled={!canManage}
                                rows={2}
                                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                            />
                            <p className="mt-1 text-xs text-slate-400">Appears at the bottom of every email. Plain text or simple HTML.</p>
                        </div>
                    </div>

                    {canManage && (
                        <div className="flex justify-end px-5 pb-5">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                Save Branding
                            </button>
                        </div>
                    )}
                </section>
            </div>

            <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Eye size={14} />
                    Live Email Preview
                </h3>
                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                    <div style={{ backgroundColor: branding.brandColor }} className="px-6 py-4 text-center">
                        {branding.logoUrl ? (
                            <img src={branding.logoUrl} alt="logo" className="mx-auto max-h-11 max-w-[180px] object-contain" />
                        ) : (
                            <span className="text-lg font-bold text-white">{branding.displayName || 'Your Company'}</span>
                        )}
                    </div>

                    <div className="border-x border-slate-200 bg-white px-6 py-5 text-sm text-slate-700">
                        <p className="mb-2 font-semibold">Dear Aarav Mehta,</p>
                        <p className="mb-3">
                            We&apos;re pleased to invite you for an interview for the <strong>Frontend Engineer</strong> position at <strong>Demo Client</strong>.
                        </p>
                        <p className="mb-3">Your interview is scheduled for <strong>10 May 2026, 04:00 PM</strong>.</p>
                        <p className="mb-4 text-blue-600 underline">Join Interview</p>
                        <p className="text-slate-500">
                            Best regards,
                            <br />
                            {branding.displayName || 'HR Team'}
                        </p>
                    </div>

                    {branding.footerText && (
                        <div
                            className="border border-slate-200 border-t-0 bg-slate-50 px-6 py-3 text-center text-xs text-slate-400"
                            dangerouslySetInnerHTML={{ __html: branding.footerText }}
                        />
                    )}
                </div>
                <p className="text-xs text-slate-400">This preview updates live as you edit branding settings.</p>
            </div>
        </div>
    );
};

const DEFAULT_TEMPLATE_FORM = {
    name: '',
    category: 'general',
    subject: '',
    htmlBody: '',
    isActive: true
};

const TemplateEditorModal = ({ isOpen, template, onClose, onSaved, canManage }) => {
    const [form, setForm] = useState(DEFAULT_TEMPLATE_FORM);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('edit');
    const subjectRef = useRef(null);
    const bodyRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        setActiveTab('edit');
        setForm(template ? {
            name: template.name || '',
            category: template.category || 'general',
            subject: template.subject || '',
            htmlBody: template.htmlBody || '',
            isActive: template.isActive !== false
        } : DEFAULT_TEMPLATE_FORM);
    }, [isOpen, template]);

    const insertPlaceholder = (field, placeholder) => {
        const token = `{{${placeholder}}}`;
        const ref = field === 'subject' ? subjectRef.current : bodyRef.current;

        if (!ref) {
            setForm((current) => ({ ...current, [field]: current[field] + token }));
            return;
        }

        const start = ref.selectionStart ?? ref.value.length;
        const end = ref.selectionEnd ?? ref.value.length;
        setForm((current) => ({
            ...current,
            [field]: `${current[field].slice(0, start)}${token}${current[field].slice(end)}`
        }));

        window.requestAnimationFrame(() => {
            ref.focus();
            const nextPosition = start + token.length;
            ref.setSelectionRange(nextPosition, nextPosition);
        });
    };

    const previewSubject = useMemo(
        () => resolveTemplate(form.subject, SAMPLE_DATA),
        [form.subject]
    );
    const previewHtml = useMemo(
        () => renderTemplateBody(form.htmlBody, SAMPLE_DATA),
        [form.htmlBody]
    );
    const placeholderTokens = getSupportedPlaceholderTokens();

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!canManage) return;

        if (!form.name.trim() || !form.subject.trim() || !form.htmlBody.trim()) {
            toast.error('Name, subject and body are required.');
            return;
        }

        const subjectValidation = validateTemplateSyntax(form.subject, TEMPLATE_PLACEHOLDERS);
        if (!subjectValidation.valid) {
            toast.error(`Subject: ${subjectValidation.message}`);
            return;
        }

        const bodyValidation = validateTemplateSyntax(form.htmlBody, TEMPLATE_PLACEHOLDERS);
        if (!bodyValidation.valid) {
            toast.error(`Body: ${bodyValidation.message}`);
            return;
        }

        setSaving(true);
        try {
            if (template?._id) {
                await api.put(`/email-templates/${template._id}`, form);
                toast.success('Template updated');
            } else {
                await api.post('/email-templates', form);
                toast.success('Template created');
            }

            onSaved();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                    <h2 className="font-bold text-slate-800">{template ? 'Edit Template' : 'New Email Template'}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 p-6">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-700">Insert Placeholder</p>
                        <div className="flex flex-wrap gap-2">
                            {TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                                <div key={placeholder} className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => insertPlaceholder('subject', placeholder)}
                                        className="rounded border border-blue-200 bg-white px-2 py-1 text-xs font-mono text-blue-700 hover:bg-blue-100"
                                    >
                                        S
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => insertPlaceholder('htmlBody', placeholder)}
                                        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-700 hover:bg-slate-100"
                                    >
                                        {`{{${placeholder}}}`}
                                    </button>
                                </div>
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-blue-600">
                            Click &quot;S&quot; for subject or a token for body. Supported: {placeholderTokens.join(', ')}
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Template Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                placeholder="Interview Invite - Engineering"
                                disabled={!canManage}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Category</label>
                            <select
                                value={form.category}
                                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                                disabled={!canManage}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                            >
                                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Subject Line</label>
                        <input
                            ref={subjectRef}
                            type="text"
                            value={form.subject}
                            onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                            placeholder="Interview Invitation - {{jobTitle}} at {{client}}"
                            disabled={!canManage}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                        />
                    </div>

                    <div>
                        <div className="mb-3 flex gap-1 border-b border-slate-200">
                            {['edit', 'preview'].map((tabId) => (
                                <button
                                    key={tabId}
                                    type="button"
                                    onClick={() => setActiveTab(tabId)}
                                    className={`border-b-2 px-4 py-2 text-sm font-semibold capitalize transition ${activeTab === tabId ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    {tabId}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'edit' ? (
                            <div>
                                <textarea
                                    ref={bodyRef}
                                    value={form.htmlBody}
                                    onChange={(event) => setForm((current) => ({ ...current, htmlBody: event.target.value }))}
                                    placeholder={'<p>Dear {{candidateName}},</p>\n<p>We would like to invite you for an interview...</p>'}
                                    disabled={!canManage}
                                    rows={12}
                                    className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                />
                                <p className="mt-1 text-xs text-slate-400">
                                    Supports plain text and HTML. Use {'{{placeholder}}'} tokens for dynamic content.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div>
                                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Subject preview</p>
                                    <p className="text-sm font-semibold text-slate-800">{previewSubject || '(empty subject)'}</p>
                                </div>
                                <div>
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Body preview</p>
                                    <div
                                        className="prose prose-sm max-w-none rounded-lg border border-slate-200 bg-white p-4 text-slate-700"
                                        dangerouslySetInnerHTML={{ __html: previewHtml || '<p>(empty body)</p>' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                            className="rounded"
                            disabled={!canManage}
                        />
                        Active template
                    </label>

                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        {canManage && (
                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                                {saving ? 'Saving...' : (template ? 'Update Template' : 'Create Template')}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

const TemplatesTab = ({ canManage }) => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [filter, setFilter] = useState('all');

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/email-templates');
            setTemplates(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleArchive = async (templateId) => {
        if (!canManage || !window.confirm('Archive this template?')) return;

        try {
            await api.delete(`/email-templates/${templateId}`);
            toast.success('Template archived');
            fetchTemplates();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed');
        }
    };

    const handleToggle = async (template) => {
        if (!canManage) return;

        try {
            await api.put(`/email-templates/${template._id}`, {
                name: template.name,
                category: template.category,
                subject: template.subject,
                htmlBody: template.htmlBody,
                isActive: !template.isActive
            });
            fetchTemplates();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to toggle');
        }
    };

    const filteredTemplates = filter === 'all'
        ? templates
        : templates.filter((template) => template.category === filter);

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <select
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All categories</option>
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    <span className="text-sm text-slate-500">
                        {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {canManage && (
                    <button
                        type="button"
                        onClick={() => {
                            setEditing(null);
                            setEditorOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                        <Plus size={15} />
                        New Template
                    </button>
                )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-500">
                        {templates.length === 0 ? 'No email templates yet. Create your first one.' : 'No templates in this category.'}
                    </div>
                ) : (
                    <table className="min-w-full">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Subject</th>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Status</th>
                                {canManage && (
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTemplates.map((template) => (
                                <tr key={template._id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">{template.name}</td>
                                    <td className="px-4 py-3">
                                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                                            {CATEGORY_LABELS[template.category] || template.category}
                                        </span>
                                    </td>
                                    <td className="max-w-xs truncate px-4 py-3 text-sm text-slate-600">{template.subject}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            type="button"
                                            onClick={() => handleToggle(template)}
                                            disabled={!canManage}
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${template.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'} disabled:cursor-default`}
                                        >
                                            {template.isActive ? 'Active' : 'Archived'}
                                        </button>
                                    </td>
                                    {canManage && (
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditing(template);
                                                        setEditorOpen(true);
                                                    }}
                                                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleArchive(template._id)}
                                                    className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <TemplateEditorModal
                isOpen={editorOpen}
                template={editing}
                onClose={() => setEditorOpen(false)}
                onSaved={fetchTemplates}
                canManage={canManage}
            />
        </div>
    );
};

const PreviewTab = () => {
    const [branding, setBranding] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/email-branding'),
            api.get('/email-templates?active=true')
        ])
            .then(([brandingResponse, templateResponse]) => {
                const nextTemplates = Array.isArray(templateResponse.data) ? templateResponse.data : [];
                setBranding(brandingResponse.data);
                setTemplates(nextTemplates);
                if (nextTemplates[0]?._id) {
                    setSelectedTemplateId(nextTemplates[0]._id);
                }
            })
            .catch((error) => toast.error(error.response?.data?.message || 'Failed to load preview data'))
            .finally(() => setLoading(false));
    }, []);

    const selectedTemplate = templates.find((template) => template._id === selectedTemplateId);
    const previewBody = useMemo(
        () => (selectedTemplate ? renderTemplateBody(selectedTemplate.htmlBody, SAMPLE_DATA) : ''),
        [selectedTemplate]
    );
    const previewSubject = useMemo(
        () => (selectedTemplate ? resolveTemplate(selectedTemplate.subject, SAMPLE_DATA) : ''),
        [selectedTemplate]
    );
    const brandColor = branding?.brandColor || '#6366f1';

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
            <div className="space-y-4">
                <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Select Template</label>
                    <select
                        value={selectedTemplateId}
                        onChange={(event) => setSelectedTemplateId(event.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {templates.length === 0 && <option value="">No active templates</option>}
                        {templates.map((template) => (
                            <option key={template._id} value={template._id}>{template.name}</option>
                        ))}
                    </select>
                </div>

                {selectedTemplate && (
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                        <p>
                            <span className="font-semibold text-slate-700">Category:</span>{' '}
                            <span className="text-slate-600">{CATEGORY_LABELS[selectedTemplate.category]}</span>
                        </p>
                        <p>
                            <span className="font-semibold text-slate-700">Subject:</span>{' '}
                            <span className="break-all text-slate-600">{previewSubject}</span>
                        </p>
                    </div>
                )}

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
                    Preview uses sample data. Real emails use actual candidate and job data.
                </div>
            </div>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">Full Email Preview</h3>
                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                    <div style={{ backgroundColor: brandColor }} className="px-8 py-5 text-center">
                        {branding?.logoUrl ? (
                            <img src={branding.logoUrl} alt="logo" className="mx-auto max-h-12 max-w-[200px] object-contain" />
                        ) : (
                            <span className="text-xl font-bold text-white">{branding?.displayName || 'Your Company'}</span>
                        )}
                    </div>

                    <div className="min-h-[200px] border-x border-slate-200 bg-white px-8 py-6">
                        {selectedTemplate ? (
                            <div
                                className="prose prose-sm max-w-none text-slate-700"
                                dangerouslySetInnerHTML={{ __html: previewBody }}
                            />
                        ) : (
                            <p className="text-sm text-slate-400">Select a template to preview</p>
                        )}
                    </div>

                    {branding?.footerText && (
                        <div
                            className="border border-slate-200 border-t-0 bg-slate-50 px-8 py-4 text-center text-xs text-slate-400"
                            dangerouslySetInnerHTML={{ __html: branding.footerText }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

const EmailSettings = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('senders');

    const canManage = user?.roles?.includes('Admin')
        || user?.permissions?.includes('settings.email.manage')
        || user?.permissions?.includes('*');

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-10">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Email Settings</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Configure senders, branding, and templates for all outgoing emails.
                </p>
            </div>

            <div className="border-b border-slate-200">
                <nav className="flex gap-1 overflow-x-auto">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActiveTab(id)}
                            className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <Icon size={15} />
                            {label}
                        </button>
                    ))}
                </nav>
            </div>

            <div>
                {activeTab === 'senders' && <SendersTab canManage={canManage} />}
                {activeTab === 'branding' && <BrandingTab canManage={canManage} />}
                {activeTab === 'templates' && <TemplatesTab canManage={canManage} />}
                {activeTab === 'preview' && <PreviewTab />}
            </div>
        </div>
    );
};

export default EmailSettings;
