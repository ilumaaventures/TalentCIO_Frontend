import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Mail,
    Plus,
    Save,
    Send,
    Server,
    ShieldCheck,
    Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const PLATFORM_ID = 'platform';

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

const EmailSettings = () => {
    const { user, refreshProfile } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [platformOption, setPlatformOption] = useState({
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

    const loadSettings = async () => {
        const { data } = await api.get('/company/email-settings');
        const nextAccounts = Array.isArray(data?.accounts) ? data.accounts.map(normalizeAccount) : [];
        setAccounts(nextAccounts);
        setPlatformOption(data?.platformOption || platformOption);
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
        const bootstrap = async () => {
            try {
                await loadSettings();
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to load email settings');
            } finally {
                setLoading(false);
            }
        };

        bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedSavedAccount = useMemo(
        () => accounts.find((account) => account._id === selectedAccountId) || null,
        [accounts, selectedAccountId]
    );
    const savingAccount = false;

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

        if (form.provider === 'brevo') {
            if (!form.brevoApiKey.trim()) return 'Brevo API key is required.';
        }

        if (form.provider === 'smtp') {
            if (!form.smtp.host.trim()) return 'SMTP host is required.';
            if (!form.smtp.user.trim()) return 'SMTP username is required.';
            if (!form.smtp.pass.trim()) return 'SMTP password is required.';
        }

        return '';
    };

    const saveSenderToList = () => {
        const validationMessage = validateForm();
        if (validationMessage) {
            toast.error(validationMessage);
            return;
        }

        const nextId = form._id || createDraftId();
        const draftAccount = normalizeAccount({
            ...form,
            _id: nextId
        });

        setAccounts((current) => {
            const exists = current.some((account) => account._id === nextId);
            return exists
                ? current.map((account) => (account._id === nextId ? draftAccount : account))
                : [...current, draftAccount];
        });
        setSelectedAccountId(nextId);
        setForm(draftAccount);
        toast.success(selectedSavedAccount ? 'Sender updated in draft list' : 'Sender added to draft list');
    };

    const removeSelectedSender = () => {
        if (!selectedSavedAccount) return;

        setAccounts((current) => current.filter((account) => account._id !== selectedSavedAccount._id));
        if (defaultAccountId === selectedSavedAccount._id) {
            setDefaultAccountId(PLATFORM_ID);
        }
        setSelectedAccountId('new');
        setForm(createEmptyAccount());
        toast.success('Sender removed from draft list');
    };

    const handleSaveSettings = async () => {
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
            toast.error(error.response?.data?.message || 'Failed to save email settings');
        } finally {
            setSaving(false);
        }
    };

    const handleSendTest = async () => {
        if (!selectedSavedAccountIsPersisted) {
            toast.error('Save settings first before sending a test email.');
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
            toast.error(error.response?.data?.message || 'Failed to send test email');
        } finally {
            setSendingTest(false);
        }
    };

    const handleVerify = async () => {
        if (!selectedSavedAccountIsPersisted) {
            toast.error('Save settings first before marking a sender as verified.');
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
            toast.error(error.response?.data?.message || 'Failed to mark sender as verified');
        } finally {
            setVerifying(false);
        }
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

    const renderSenderPill = (account) => (
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${account.ready
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-700'}`}
        >
            {account.ready ? 'Ready' : 'Needs setup'}
        </span>
    );

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Email Senders</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                        Add multiple Brevo or SMTP senders, pick a default sender for your workspace, and use those senders inside onboarding and TA mass mailing.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Save Settings
                </button>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                Save or update sender drafts in the editor first, then click `Save Settings` to persist them. The onboarding and TA sender pickers will use your saved sender list.
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                        <div className="flex items-center gap-2">
                            <Mail size={18} className="text-blue-600" />
                            <h2 className="font-bold text-slate-800">Saved Senders</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => selectAccount('new')}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                            <Plus size={16} />
                            New Sender
                        </button>
                    </div>

                    <div className="space-y-3 p-6">
                        <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${defaultAccountId === PLATFORM_ID
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                            <input
                                type="radio"
                                name="default-sender"
                                checked={defaultAccountId === PLATFORM_ID}
                                onChange={() => setDefaultAccountId(PLATFORM_ID)}
                                className="mt-1"
                            />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="font-semibold text-slate-800">{platformOption.name}</div>
                                        <div className="mt-1 text-sm text-slate-500">{platformOption.fromAddress}</div>
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">Platform</span>
                                </div>
                            </div>
                        </label>

                        {accounts.map((account) => (
                            <div
                                key={account._id}
                                className={`rounded-xl border p-4 transition ${selectedAccountId === account._id
                                    ? 'border-blue-200 bg-blue-50'
                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                            >
                                <div className="flex items-start gap-3">
                                    <input
                                        type="radio"
                                        name="default-sender"
                                        checked={defaultAccountId === account._id}
                                        onChange={() => setDefaultAccountId(account._id)}
                                        className="mt-1"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => selectAccount(account._id)}
                                        className="flex-1 text-left"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate font-semibold text-slate-800">{account.name}</div>
                                                <div className="mt-1 text-sm text-slate-500">
                                                    {account.fromAddress} - {account.provider.toUpperCase()}
                                                </div>
                                            </div>
                                            {renderSenderPill(account)}
                                        </div>
                                        <div className="mt-2 text-xs text-slate-500">
                                            Verified: {account.verified ? 'Yes' : 'No'} | Last test: {formatDateTime(account.testSentAt)}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        ))}

                        {accounts.length === 0 && (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                                No custom senders saved yet. Add a Brevo or SMTP sender on the right.
                            </div>
                        )}
                    </div>
                </section>

                <div className="space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                            <Server size={18} className="text-blue-600" />
                            <h2 className="font-bold text-slate-800">
                                {selectedSavedAccount ? 'Edit Sender' : 'Create Sender'}
                            </h2>
                        </div>

                        <div className="space-y-5 p-6">
                            <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Sender Name</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(event) => updateForm({ name: event.target.value })}
                                        placeholder="Hiring Team - India"
                                        className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Provider</label>
                                    <select
                                        value={form.provider}
                                        onChange={(event) => updateForm({ provider: event.target.value })}
                                        className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm"
                                    >
                                        <option value="brevo">Brevo</option>
                                        <option value="smtp">Custom SMTP</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">From Name</label>
                                    <input
                                        type="text"
                                        value={form.fromName}
                                        onChange={(event) => updateForm({ fromName: event.target.value })}
                                        placeholder="Acme Corp HR"
                                        className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">From Address</label>
                                    <input
                                        type="email"
                                        value={form.fromAddress}
                                        onChange={(event) => updateForm({ fromAddress: event.target.value })}
                                        placeholder="hr@yourcompany.com"
                                        className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm"
                                    />
                                </div>
                            </div>

                            {isBrevo && (
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Brevo API Key</label>
                                    <input
                                        type="text"
                                        value={form.brevoApiKey}
                                        onChange={(event) => updateForm({ brevoApiKey: event.target.value })}
                                        placeholder="xkeysib-xxxxxxxxxxxxxxxx"
                                        className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm"
                                    />
                                </div>
                            )}

                            {isSmtp && (
                                <div className="grid gap-5 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">SMTP Host</label>
                                        <input
                                            type="text"
                                            value={form.smtp.host}
                                            onChange={(event) => updateSmtp({ host: event.target.value })}
                                            placeholder="smtp.gmail.com"
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">SMTP Port</label>
                                        <input
                                            type="number"
                                            value={form.smtp.port}
                                            onChange={(event) => updateSmtp({ port: event.target.value })}
                                            placeholder="587"
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Username</label>
                                        <input
                                            type="text"
                                            value={form.smtp.user}
                                            onChange={(event) => updateSmtp({ user: event.target.value })}
                                            placeholder="hr@yourcompany.com"
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                                        <input
                                            type="password"
                                            value={form.smtp.pass}
                                            onChange={(event) => updateSmtp({ pass: event.target.value })}
                                            placeholder="App password or SMTP password"
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm"
                                        />
                                    </div>
                                    <label className="md:col-span-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={form.smtp.secure}
                                            onChange={(event) => updateSmtp({ secure: event.target.checked, port: event.target.checked ? 465 : 587 })}
                                        />
                                        Use SSL / secure SMTP
                                    </label>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={saveSenderToList}
                                    disabled={savingAccount}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-5 py-2.5 font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {savingAccount ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {selectedSavedAccount ? 'Update Sender Draft' : 'Add Sender Draft'}
                                </button>
                                {selectedSavedAccount && (
                                    <button
                                        type="button"
                                        onClick={removeSelectedSender}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-5 py-2.5 font-semibold text-red-700 transition hover:bg-red-100"
                                    >
                                        <Trash2 size={18} />
                                        Remove Sender
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className={`rounded-2xl border p-4 text-sm ${selectedSavedAccount?.verified
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-amber-200 bg-amber-50 text-amber-900'}`}
                    >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-3">
                                {selectedSavedAccount?.verified ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertTriangle size={18} className="mt-0.5 shrink-0" />}
                                <div>
                                    <div className="font-semibold">
                                        {selectedSavedAccount
                                            ? (selectedSavedAccount.verified
                                                ? `Verified - ${selectedSavedAccount.fromAddress} is ready to use`
                                                : 'Not verified - send a test email to confirm delivery')
                                            : 'Choose a saved sender to test or verify it'}
                                    </div>
                                    <div className="mt-1 text-xs opacity-80">
                                        Last test email: {formatDateTime(selectedSavedAccount?.testSentAt)}. Verified at: {formatDateTime(selectedSavedAccount?.verifiedAt)}.
                                    </div>
                                </div>
                            </div>
                            {selectedSavedAccount && !selectedSavedAccount.verified && (
                                <button
                                    type="button"
                                    onClick={handleVerify}
                                    disabled={verifying || !selectedSavedAccountIsPersisted}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-current px-4 py-2 font-semibold transition hover:bg-white/40 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {verifying ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                                    Mark Verified
                                </button>
                            )}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                            <Send size={18} className="text-blue-600" />
                            <h2 className="font-bold text-slate-800">Test Delivery</h2>
                        </div>
                        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end">
                            <div className="flex-1">
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Recipient Email</label>
                                <input
                                    type="email"
                                    value={recipientEmail}
                                    onChange={(event) => setRecipientEmail(event.target.value)}
                                    placeholder="admin@yourcompany.com"
                                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleSendTest}
                                disabled={sendingTest || !selectedSavedAccountIsPersisted}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-5 py-2.5 font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {sendingTest ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                Send Test Email
                            </button>
                        </div>
                        {!selectedSavedAccountIsPersisted && (
                            <div className="border-t border-slate-100 px-6 py-4 text-sm text-slate-500">
                                Save settings first, then test the selected sender.
                            </div>
                        )}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                            <ShieldCheck size={18} className="text-blue-600" />
                            <h2 className="font-bold text-slate-800">Setup Guide</h2>
                        </div>
                        <div className="space-y-5 p-6 text-sm text-slate-600">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="font-semibold text-slate-800">Brevo</div>
                                <p className="mt-1">Create an API key and verify your sender address in Brevo before using that sender in TalentCIO.</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="font-semibold text-slate-800">SMTP</div>
                                <p className="mt-1">Use Gmail App Passwords, Outlook, SES, Mailgun, or your own SMTP relay.</p>
                            </div>
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                                <div className="font-semibold">Deliverability Notes</div>
                                <p className="mt-1">Verified Brevo senders and correct SPF/DKIM records are still important for inbox placement.</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default EmailSettings;
