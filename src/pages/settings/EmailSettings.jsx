import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
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
    GENERAL_EMAIL_TEMPLATE_PLACEHOLDERS,
    ONBOARDING_EMAIL_TEMPLATE_PLACEHOLDERS,
    getSupportedPlaceholderTokens,
    renderTemplateBody,
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

const EMAIL_TEMPLATE_TYPE_TABS = [
    { id: 'general', label: 'General' },
    { id: 'onboarding', label: 'Onboarding' }
];

const SAMPLE_DATA = {
    candidateName: 'Aarav Mehta',
    firstName: 'Aarav',
    lastName: 'Mehta',
    fullName: 'Aarav Mehta',
    email: 'aarav@example.com',
    phone: '9876543210',
    workEmail: 'aarav.mehta@yourcompany.com',
    mobile: '9876543210',
    phoneNumber: '9876543210',
    jobTitle: 'Frontend Engineer',
    designation: 'Frontend Engineer',
    client: 'Demo Client',
    department: 'Engineering',
    offerDate: '10 May 2026',
    dateOfOffer: '10 May 2026',
    workLocation: 'Bengaluru',
    employmentDetails: 'Frontend Engineer | Engineering | Bengaluru',
    location: 'Bengaluru',
    managerName: 'Priya Sharma',
    managerEmail: 'priya.sharma@yourcompany.com',
    recruiterName: 'Talent Acquisition Team',
    companyName: 'Your Company',
    requestId: 'HRR-2026-001',
    currentStatus: 'Interested',
    interviewDate: '10 May 2026, 04:00 PM',
    interviewLink: 'https://meet.example.com/interview',
    customNote: 'Please join 10 minutes early.'
};

const DEFAULT_EMAIL_LOGO_WIDTH = 200;
const DEFAULT_EMAIL_LOGO_HEIGHT = 44;
const DEFAULT_EMAIL_LOGO_ALIGNMENT = 'center';

const LOGO_ALIGNMENT_OPTIONS = [
    { value: 'left', label: 'Left', icon: AlignLeft },
    { value: 'center', label: 'Center', icon: AlignCenter },
    { value: 'right', label: 'Right', icon: AlignRight }
];

const getPreviewJustifyContent = (alignment = DEFAULT_EMAIL_LOGO_ALIGNMENT) => {
    if (alignment === 'left') return 'flex-start';
    if (alignment === 'right') return 'flex-end';
    return 'center';
};

const SliderField = ({
    label,
    value,
    min,
    max,
    step = 1,
    unit = 'px',
    description,
    disabled,
    onChange
}) => (
    <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
            <label className="block text-sm font-semibold text-slate-700">{label}</label>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {value}{unit}
            </span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="mt-2 flex justify-between text-[11px] text-slate-400">
            <span>{min}{unit}</span>
            <span>{max}{unit}</span>
        </div>
        {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
    </div>
);

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

const buildSenderSelectionSnapshot = (account = {}) => ({
    _id: String(account?._id || ''),
    name: String(account?.name || '').trim().toLowerCase(),
    provider: String(account?.provider || '').trim().toLowerCase(),
    fromAddress: String(account?.fromAddress || '').trim().toLowerCase()
});

const findMatchingSender = (accounts = [], preferredAccount = null) => {
    if (!preferredAccount) return null;

    const preferredSnapshot = buildSenderSelectionSnapshot(preferredAccount);

    return (
        accounts.find((account) => String(account._id) === preferredSnapshot._id)
        || accounts.find((account) => {
            const accountSnapshot = buildSenderSelectionSnapshot(account);
            return (
                accountSnapshot.name === preferredSnapshot.name
                && accountSnapshot.provider === preferredSnapshot.provider
                && accountSnapshot.fromAddress === preferredSnapshot.fromAddress
            );
        })
        || null
    );
};

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
        fromAddress: 'ilumaaventures@gmail.com',
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
    const isPlatformSelected = selectedAccountId === PLATFORM_ID;
    const selectedDisplayAccount = isPlatformSelected ? platformOption : selectedSavedAccount;

    const isBrevo = form.provider === 'brevo';
    const isSmtp = form.provider === 'smtp';
    const selectedSavedAccountIsPersisted = selectedSavedAccount && !String(selectedSavedAccount._id).startsWith('draft-');
    const canSendTestForSelectedAccount = isPlatformSelected || selectedSavedAccountIsPersisted;
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

    const selectAccount = (accountId, accountList = accounts) => {
        if (accountId === 'new') {
            if (selectedAccountId === 'new' && !formHasContent) return;

            setSelectedAccountId('new');
            setForm(createEmptyAccount());
            return;
        }

        if (accountId === selectedAccountId) return;

        const account = accountList.find((item) => item._id === accountId);
        if (!account) return;

        setSelectedAccountId(accountId);
        setForm(normalizeAccount(account));
    };

    const loadSettings = async (preferredAccount = null) => {
        const { data } = await api.get('/company/email-settings');
        const nextAccounts = Array.isArray(data?.accounts) ? data.accounts.map(normalizeAccount) : [];
        setAccounts(nextAccounts);
        setDefaultAccountId(data?.defaultAccountId || PLATFORM_ID);

        if (String(preferredAccount?._id || '') === PLATFORM_ID) {
            setSelectedAccountId(PLATFORM_ID);
            return;
        }

        const matchingAccount = findMatchingSender(nextAccounts, preferredAccount);
        if (matchingAccount) {
            setSelectedAccountId(matchingAccount._id);
            setForm(normalizeAccount(matchingAccount));
            return;
        }

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

        const remainingAccounts = accounts.filter((account) => account._id !== selectedSavedAccount._id);
        setAccounts(remainingAccounts);
        if (defaultAccountId === selectedSavedAccount._id) {
            setDefaultAccountId(PLATFORM_ID);
        }

        if (remainingAccounts.length > 0) {
            const nextSelectedAccount = remainingAccounts.find((account) => account._id !== selectedSavedAccount._id) || remainingAccounts[0];
            setSelectedAccountId(nextSelectedAccount._id);
            setForm(normalizeAccount(nextSelectedAccount));
        } else {
            setSelectedAccountId('new');
            setForm(createEmptyAccount());
        }

        toast.success('Sender removed');
    };

    const handleSaveSettings = async () => {
        if (!canManage) return;

        let accountsToSave = [...accounts];
        const preferredAccountAfterSave = selectedAccountId === 'new'
            ? (formHasContent ? form : null)
            : (selectedSavedAccount || form);

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
            await loadSettings(preferredAccountAfterSave);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleSendTest = async () => {
        if (!canManage) return;
        if (!canSendTestForSelectedAccount) {
            toast.error('Save settings first.');
            return;
        }

        setSendingTest(true);
        try {
            const { data } = await api.post('/company/email-settings/test', {
                recipientEmail,
                emailAccountId: isPlatformSelected ? PLATFORM_ID : selectedSavedAccount._id
            });
            toast.success(data?.message || 'Test email sent');
            await loadSettings(selectedDisplayAccount);
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
            await loadSettings(selectedSavedAccount);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to verify');
        } finally {
            setVerifying(false);
        }
    };

    const activateSenderRow = (accountId, accountList = accounts) => {
        if (canManage) {
            setDefaultAccountId(accountId);
        }

        if (accountId === PLATFORM_ID) {
            setSelectedAccountId(PLATFORM_ID);
            return;
        }

        selectAccount(accountId, accountList);
    };

    const handleSenderRowKeyDown = (event, accountId) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        activateSenderRow(accountId);
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
                        <label
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${selectedAccountId === PLATFORM_ID ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                            onClick={() => activateSenderRow(PLATFORM_ID)}
                        >
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
                                role="button"
                                tabIndex={0}
                                onClick={() => activateSenderRow(account._id)}
                                onKeyDown={(event) => handleSenderRowKeyDown(event, account._id)}
                                className={`cursor-pointer rounded-xl border p-4 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${selectedAccountId === account._id ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="default-sender"
                                        checked={defaultAccountId === account._id}
                                        onChange={() => canManage && setDefaultAccountId(account._id)}
                                        onClick={(event) => event.stopPropagation()}
                                        disabled={!canManage}
                                        className="mt-0.5"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-sm font-semibold text-slate-800">{account.name}</span>
                                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${account.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                {account.ready ? 'Ready' : 'Needs setup'}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {account.fromAddress} - {account.provider.toUpperCase()}
                                        </p>
                                    </div>
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
                            <div>
                                <h3 className="font-bold text-slate-800">
                                    {selectedDisplayAccount
                                        ? (isPlatformSelected ? 'Sender Details' : 'Edit Sender')
                                        : 'New Sender'}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {selectedDisplayAccount
                                        ? `${selectedDisplayAccount.name} - ${selectedDisplayAccount.fromAddress}`
                                        : 'Create a sender or select one from the saved list to edit it.'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 p-5">
                            {isPlatformSelected && (
                                <div className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Sender Label</label>
                                            <input
                                                type="text"
                                                value={platformOption.name}
                                                disabled
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Provider</label>
                                            <input
                                                type="text"
                                                value="Platform"
                                                disabled
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">From Name</label>
                                            <input
                                                type="text"
                                                value={platformOption.fromName}
                                                disabled
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">From Address</label>
                                            <input
                                                type="text"
                                                value={platformOption.fromAddress}
                                                disabled
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                                            />
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                                        This is the built-in TalentCIO sender. You can choose it as the default sender, but its credentials are managed by the platform and are not editable here.
                                    </div>
                                </div>
                            )}

                            {!isPlatformSelected && (
                                <>
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
                                </>
                            )}
                        </div>
                    </section>

                    <section className={`rounded-2xl border p-4 text-sm ${selectedDisplayAccount?.verified ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-start gap-2">
                                {selectedDisplayAccount?.verified ? (
                                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                                ) : (
                                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                                )}
                                <div>
                                    <p className="font-semibold">
                                        {selectedDisplayAccount
                                            ? (selectedDisplayAccount.verified
                                                ? `Verified - ${selectedDisplayAccount.fromAddress}`
                                                : 'Not verified - send a test to confirm')
                                            : 'Select a sender to test or verify'}
                                    </p>
                                    <p className="mt-0.5 text-xs opacity-75">
                                        Last test: {formatDateTime(selectedDisplayAccount?.testSentAt)} - Verified: {formatDateTime(selectedDisplayAccount?.verifiedAt)}
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
                                    disabled={sendingTest || !canSendTestForSelectedAccount}
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
        logoWidth: DEFAULT_EMAIL_LOGO_WIDTH,
        logoHeight: DEFAULT_EMAIL_LOGO_HEIGHT,
        logoAlignment: DEFAULT_EMAIL_LOGO_ALIGNMENT,
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
                logoWidth: branding.logoWidth,
                logoHeight: branding.logoHeight,
                logoAlignment: branding.logoAlignment,
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
                                <div
                                    className="flex h-16 w-36 items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-2"
                                    style={{ justifyContent: getPreviewJustifyContent(branding.logoAlignment) }}
                                >
                                    <img
                                        src={branding.logoUrl}
                                        alt="Email logo"
                                        style={{
                                            width: `${branding.logoWidth || DEFAULT_EMAIL_LOGO_WIDTH}px`,
                                            height: `${branding.logoHeight || DEFAULT_EMAIL_LOGO_HEIGHT}px`,
                                            maxWidth: '100%',
                                            objectFit: 'contain'
                                        }}
                                    />
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
                            JPG, PNG, SVG, WEBP - Max 3MB - Size is controlled by the width and height settings below
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

                        <SliderField
                            label="Logo Width"
                            value={Number(branding.logoWidth) || DEFAULT_EMAIL_LOGO_WIDTH}
                            min={40}
                            max={400}
                            description="Drag to set the email logo width."
                            disabled={!canManage}
                            onChange={(event) => setBranding((current) => ({ ...current, logoWidth: Number(event.target.value) }))}
                        />

                        <SliderField
                            label="Logo Height"
                            value={Number(branding.logoHeight) || DEFAULT_EMAIL_LOGO_HEIGHT}
                            min={20}
                            max={160}
                            description="Drag to set the email logo height."
                            disabled={!canManage}
                            onChange={(event) => setBranding((current) => ({ ...current, logoHeight: Number(event.target.value) }))}
                        />

                        <div className="sm:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Logo Alignment</label>
                            <div className="grid gap-2 sm:grid-cols-3">
                                {LOGO_ALIGNMENT_OPTIONS.map(({ value, label, icon: Icon }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => canManage && setBranding((current) => ({ ...current, logoAlignment: value }))}
                                        disabled={!canManage}
                                        className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${branding.logoAlignment === value
                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'} disabled:cursor-not-allowed disabled:opacity-60`}
                                    >
                                        <Icon size={16} />
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-1 text-xs text-slate-400">Choose whether the logo sits on the left, center, or right of the email header.</p>
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
                    <div
                        style={{
                            backgroundColor: branding.brandColor,
                            textAlign: branding.logoAlignment || DEFAULT_EMAIL_LOGO_ALIGNMENT
                        }}
                        className="px-6 py-4"
                    >
                        {branding.logoUrl ? (
                            <img
                                src={branding.logoUrl}
                                alt="logo"
                                style={{
                                    width: `${branding.logoWidth || DEFAULT_EMAIL_LOGO_WIDTH}px`,
                                    height: `${branding.logoHeight || DEFAULT_EMAIL_LOGO_HEIGHT}px`,
                                    maxWidth: '100%',
                                    objectFit: 'contain',
                                    display: 'inline-block'
                                }}
                            />
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
    templateType: 'general',
    category: 'general',
    subject: '',
    htmlBody: '',
    isActive: true
};
const DEFAULT_ONBOARDING_EMAIL_SUBJECT = 'Action Required: Complete Your Pre-Onboarding';
const DEFAULT_ONBOARDING_EMAIL_BODY = `
<p>Hello <strong>{{firstName}}</strong>,</p>
<p>Your HR team has requested that you complete the following items on the pre-onboarding portal before your joining date.</p>
`;
const BUILT_IN_ONBOARDING_TEMPLATE_ID = '__built_in_onboarding_template__';
const BUILT_IN_ONBOARDING_TEMPLATE = {
    _id: BUILT_IN_ONBOARDING_TEMPLATE_ID,
    name: 'Default Onboarding Template',
    templateType: 'onboarding',
    category: 'built_in',
    subject: DEFAULT_ONBOARDING_EMAIL_SUBJECT,
    htmlBody: DEFAULT_ONBOARDING_EMAIL_BODY,
    isActive: true,
    isBuiltIn: true
};

const getEmailTemplateType = (template = {}) => template?.templateType === 'onboarding' ? 'onboarding' : 'general';
const isBuiltInEmailTemplate = (template = {}) => Boolean(template?.isBuiltIn) || template?._id === BUILT_IN_ONBOARDING_TEMPLATE_ID;
const getEmailTemplatePlaceholderSet = (templateType = 'general') => (
    templateType === 'onboarding'
        ? ONBOARDING_EMAIL_TEMPLATE_PLACEHOLDERS
        : GENERAL_EMAIL_TEMPLATE_PLACEHOLDERS
);
const getEmailTemplateOptionsForType = (templates = [], templateType = 'general') => {
    const filteredTemplates = (Array.isArray(templates) ? templates : []).filter((template) => getEmailTemplateType(template) === templateType);

    if (templateType !== 'onboarding') {
        return filteredTemplates;
    }

    return [BUILT_IN_ONBOARDING_TEMPLATE, ...filteredTemplates];
};

const TemplateEditorModal = ({ isOpen, template, defaultTemplateType, onClose, onSaved, canManage }) => {
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
            templateType: getEmailTemplateType(template),
            category: template.category || 'general',
            subject: template.subject || '',
            htmlBody: template.htmlBody || '',
            isActive: template.isActive !== false
        } : {
            ...DEFAULT_TEMPLATE_FORM,
            templateType: defaultTemplateType === 'onboarding' ? 'onboarding' : 'general'
        });
    }, [defaultTemplateType, isOpen, template]);

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
    const activeTemplateType = form.templateType === 'onboarding' ? 'onboarding' : 'general';
    const allowedPlaceholders = useMemo(
        () => getEmailTemplatePlaceholderSet(activeTemplateType),
        [activeTemplateType]
    );
    const placeholderTokens = getSupportedPlaceholderTokens(allowedPlaceholders);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!canManage) return;

        if (!form.name.trim() || !form.subject.trim() || !form.htmlBody.trim()) {
            toast.error('Name, subject and body are required.');
            return;
        }

        const subjectValidation = validateTemplateSyntax(form.subject, allowedPlaceholders);
        if (!subjectValidation.valid) {
            toast.error(`Subject: ${subjectValidation.message}`);
            return;
        }

        const bodyValidation = validateTemplateSyntax(form.htmlBody, allowedPlaceholders);
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
                    <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Template Type</p>
                        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                            {EMAIL_TEMPLATE_TYPE_TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => canManage && setForm((current) => ({ ...current, templateType: tab.id }))}
                                    disabled={!canManage}
                                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTemplateType === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'} disabled:cursor-default`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-700">Insert Placeholder</p>
                        <div className="flex flex-wrap gap-2">
                            {allowedPlaceholders.map((placeholder) => (
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
                        <div className="sm:col-span-3">
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Template Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                placeholder={activeTemplateType === 'onboarding' ? 'Pre-Onboarding Reminder' : 'Employee Policy Update'}
                                disabled={!canManage}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Subject Line</label>
                        <input
                            ref={subjectRef}
                            type="text"
                            value={form.subject}
                            onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                            placeholder={activeTemplateType === 'onboarding' ? 'Complete Your Pre-Onboarding' : 'Update Regarding {{designation}}'}
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
                                    placeholder={activeTemplateType === 'onboarding'
                                        ? '<p>Hello <strong>{{firstName}}</strong>,</p>\n<p>Please complete your pending onboarding items before {{submissionDeadline}}.</p>'
                                        : '<p>Dear {{firstName}},</p>\n<p>Welcome to {{companyName}}. Please review the update shared below.</p>'}
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
    const [templateTypeFilter, setTemplateTypeFilter] = useState('general');

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
        if (isBuiltInEmailTemplate(template)) return;

        try {
            await api.put(`/email-templates/${template._id}`, {
                name: template.name,
                templateType: getEmailTemplateType(template),
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

    const filteredTemplates = useMemo(
        () => getEmailTemplateOptionsForType(templates, templateTypeFilter),
        [templateTypeFilter, templates]
    );

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                        {EMAIL_TEMPLATE_TYPE_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setTemplateTypeFilter(tab.id)}
                                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${templateTypeFilter === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
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
                        {templates.length === 0 ? 'No email templates yet. Create your first one.' : `No ${templateTypeFilter} templates yet.`}
                    </div>
                ) : (
                    <table className="min-w-full">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Type</th>
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
                                            {EMAIL_TEMPLATE_TYPE_TABS.find((tab) => tab.id === getEmailTemplateType(template))?.label || 'General'}
                                        </span>
                                    </td>
                                    <td className="max-w-xs truncate px-4 py-3 text-sm text-slate-600">{template.subject}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            type="button"
                                            onClick={() => handleToggle(template)}
                                            disabled={!canManage || isBuiltInEmailTemplate(template)}
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${isBuiltInEmailTemplate(template) || template.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'} disabled:cursor-default`}
                                        >
                                            {isBuiltInEmailTemplate(template) ? 'Built in' : (template.isActive ? 'Active' : 'Archived')}
                                        </button>
                                    </td>
                                    {canManage && (
                                        <td className="px-4 py-3">
                                            {isBuiltInEmailTemplate(template) ? (
                                                <div className="text-right text-xs font-semibold text-slate-400">System default</div>
                                            ) : (
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
                                            )}
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
                defaultTemplateType={templateTypeFilter}
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
    const [templateTypeFilter, setTemplateTypeFilter] = useState('general');
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

    const filteredTemplates = useMemo(
        () => getEmailTemplateOptionsForType(templates, templateTypeFilter),
        [templateTypeFilter, templates]
    );
    const selectedTemplate = filteredTemplates.find((template) => template._id === selectedTemplateId) || filteredTemplates[0] || null;
    const previewBody = useMemo(
        () => (selectedTemplate ? renderTemplateBody(selectedTemplate.htmlBody, SAMPLE_DATA) : ''),
        [selectedTemplate]
    );
    const previewSubject = useMemo(
        () => (selectedTemplate ? resolveTemplate(selectedTemplate.subject, SAMPLE_DATA) : ''),
        [selectedTemplate]
    );
    const brandColor = branding?.brandColor || '#6366f1';
    const logoWidth = branding?.logoWidth || DEFAULT_EMAIL_LOGO_WIDTH;
    const logoHeight = branding?.logoHeight || DEFAULT_EMAIL_LOGO_HEIGHT;
    const logoAlignment = branding?.logoAlignment || DEFAULT_EMAIL_LOGO_ALIGNMENT;

    useEffect(() => {
        if (filteredTemplates.some((template) => template._id === selectedTemplateId)) {
            return;
        }

        setSelectedTemplateId(filteredTemplates[0]?._id || '');
    }, [filteredTemplates, selectedTemplateId]);

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
                <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                    {EMAIL_TEMPLATE_TYPE_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setTemplateTypeFilter(tab.id)}
                            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${templateTypeFilter === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Select Template</label>
                    <select
                        value={selectedTemplateId}
                        onChange={(event) => setSelectedTemplateId(event.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {filteredTemplates.length === 0 && <option value="">No active templates</option>}
                        {filteredTemplates.map((template) => (
                            <option key={template._id} value={template._id}>{template.name}</option>
                        ))}
                    </select>
                </div>

                {selectedTemplate && (
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                        <p>
                            <span className="font-semibold text-slate-700">Type:</span>{' '}
                            <span className="text-slate-600">{EMAIL_TEMPLATE_TYPE_TABS.find((tab) => tab.id === getEmailTemplateType(selectedTemplate))?.label || 'General'}</span>
                        </p>
                        <p>
                            <span className="font-semibold text-slate-700">Subject:</span>{' '}
                            <span className="break-all text-slate-600">{previewSubject}</span>
                        </p>
                    </div>
                )}

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
                    Preview uses sample data. Real emails use actual employee or onboarding data.
                </div>
            </div>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">Full Email Preview</h3>
                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                    <div style={{ backgroundColor: brandColor, textAlign: logoAlignment }} className="px-8 py-5">
                        {branding?.logoUrl ? (
                            <img
                                src={branding.logoUrl}
                                alt="logo"
                                style={{
                                    width: `${logoWidth}px`,
                                    height: `${logoHeight}px`,
                                    maxWidth: '100%',
                                    objectFit: 'contain',
                                    display: 'inline-block'
                                }}
                            />
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
