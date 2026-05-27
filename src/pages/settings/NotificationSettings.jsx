import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Loader2, Mail, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const CHANNEL_LABELS = {
    off: 'Off',
    system: 'System only',
    email: 'Email only',
    both: 'System + Email'
};

const CHANNEL_OPTIONS = Object.entries(CHANNEL_LABELS).map(([value, label]) => ({
    value,
    label
}));

const NotificationSettings = () => {
    const { user } = useAuth();
    const canManage = user?.roles?.includes('Admin')
        || user?.permissions?.includes('settings.notification.manage')
        || user?.permissions?.includes('*');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [definitions, setDefinitions] = useState([]);
    const [settings, setSettings] = useState({
        emailSenderAccountId: '',
        events: {}
    });
    const [senderData, setSenderData] = useState({
        defaultAccountId: '',
        platformOption: null,
        accounts: []
    });

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [notificationResponse, senderResponse] = await Promise.all([
                    api.get('/company/notification-settings'),
                    api.get('/company/email-settings/senders')
                ]);

                setDefinitions(Array.isArray(notificationResponse.data?.definitions) ? notificationResponse.data.definitions : []);
                setSettings(notificationResponse.data?.settings || {
                    emailSenderAccountId: '',
                    events: {}
                });
                setSenderData({
                    defaultAccountId: senderResponse.data?.defaultAccountId || '',
                    platformOption: senderResponse.data?.platformOption || null,
                    accounts: Array.isArray(senderResponse.data?.accounts) ? senderResponse.data.accounts : []
                });
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to load notification settings');
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    const groupedDefinitions = useMemo(() => {
        return definitions.reduce((accumulator, definition) => {
            const moduleName = definition.module || 'General';
            if (!accumulator[moduleName]) {
                accumulator[moduleName] = [];
            }
            accumulator[moduleName].push(definition);
            return accumulator;
        }, {});
    }, [definitions]);

    const senderOptions = useMemo(() => {
        const options = [{
            value: '',
            label: 'Use default sender from Email Settings'
        }];

        if (senderData.platformOption) {
            options.push({
                value: senderData.platformOption._id,
                label: `${senderData.platformOption.name} (${senderData.platformOption.fromAddress})`
            });
        }

        senderData.accounts.forEach((account) => {
            options.push({
                value: account._id,
                label: `${account.name} (${account.fromAddress})`
            });
        });

        return options;
    }, [senderData]);

    const defaultSenderLabel = useMemo(() => {
        const allSenders = [
            senderData.platformOption,
            ...(senderData.accounts || [])
        ].filter(Boolean);
        const matched = allSenders.find((option) => option._id === senderData.defaultAccountId);
        return matched
            ? `${matched.name} (${matched.fromAddress})`
            : 'No default sender configured';
    }, [senderData]);

    const emailEnabledEvents = useMemo(() => (
        Object.values(settings.events || {}).filter((value) => value === 'email' || value === 'both').length
    ), [settings.events]);

    const updateEventChannel = (eventKey, channel) => {
        setSettings((current) => ({
            ...current,
            events: {
                ...(current.events || {}),
                [eventKey]: channel
            }
        }));
    };

    const handleSave = async () => {
        if (!canManage) return;

        setSaving(true);
        try {
            const { data } = await api.put('/company/notification-settings', settings);
            setSettings(data?.settings || settings);
            toast.success(data?.message || 'Notification settings saved');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save notification settings');
        } finally {
            setSaving(false);
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
        <div className="mx-auto max-w-6xl space-y-6 pb-10">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Notification Settings</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Choose which workflows send in-app notifications, email notifications, or both.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
                <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                                <Mail size={18} />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-slate-800">Email Sender</h2>
                                <p className="text-xs text-slate-500">Select which sender will be used for email notifications.</p>
                            </div>
                        </div>

                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Sender account</label>
                        <select
                            value={settings.emailSenderAccountId || ''}
                            onChange={(event) => setSettings((current) => ({
                                ...current,
                                emailSenderAccountId: event.target.value
                            }))}
                            disabled={!canManage}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                        >
                            {senderOptions.map((option) => (
                                <option key={option.value || 'default'} value={option.value}>{option.label}</option>
                            ))}
                        </select>

                        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                            Current default sender: <span className="font-semibold text-slate-700">{defaultSenderLabel}</span>
                        </div>

                        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
                            {emailEnabledEvents} event{emailEnabledEvents !== 1 ? 's are' : ' is'} currently configured to send email notifications.
                        </div>
                    </div>

                    {!canManage && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                            You have read-only access to notification settings.
                        </div>
                    )}
                </div>

                <div className="space-y-5">
                    {Object.entries(groupedDefinitions).map(([moduleName, items]) => (
                        <div key={moduleName} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-xl bg-slate-900/5 p-2 text-slate-700">
                                        <Bell size={17} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-semibold text-slate-800">{moduleName}</h2>
                                        <p className="text-xs text-slate-500">{items.length} configurable notification event{items.length !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {items.map((definition) => (
                                    <div key={definition.key} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr,220px] md:items-center">
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-800">{definition.label}</h3>
                                            <p className="mt-1 text-sm text-slate-500">{definition.description}</p>
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Delivery
                                            </label>
                                            <select
                                                value={settings.events?.[definition.key] || definition.defaultChannel || 'system'}
                                                onChange={(event) => updateEventChannel(definition.key, event.target.value)}
                                                disabled={!canManage}
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                                            >
                                                {CHANNEL_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {canManage && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                                {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationSettings;
