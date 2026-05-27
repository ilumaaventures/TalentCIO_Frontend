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

const getDefinitionChannelOptions = (definition = {}) => {
    const supportedChannels = Array.isArray(definition?.supportedChannels) && definition.supportedChannels.length > 0
        ? definition.supportedChannels
        : CHANNEL_OPTIONS.map((option) => option.value);

    return CHANNEL_OPTIONS.filter((option) => supportedChannels.includes(option.value));
};

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

    const orderedDefinitions = useMemo(() => (
        [...definitions].sort((left, right) => {
            const moduleCompare = String(left.module || '').localeCompare(String(right.module || ''));
            if (moduleCompare !== 0) {
                return moduleCompare;
            }

            return String(left.label || '').localeCompare(String(right.label || ''));
        })
    ), [definitions]);

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

            <div className="space-y-5">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 bg-slate-100 px-5 py-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="rounded-xl bg-white p-2 text-blue-600 shadow-sm ring-1 ring-slate-200">
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-800">Sender Configuration</h2>
                                    <p className="text-xs text-slate-500">Used for all notification rows that are set to email or both.</p>
                                </div>
                            </div>

                            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                                {emailEnabledEvents} event{emailEnabledEvents !== 1 ? 's' : ''} currently send email notifications
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Setting</th>
                                    <th className="border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Value</th>
                                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="align-top">
                                    <td className="border-b border-r border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800">Notification sender</td>
                                    <td className="border-b border-r border-slate-200 bg-white px-4 py-3">
                                        <select
                                            value={settings.emailSenderAccountId || ''}
                                            onChange={(event) => setSettings((current) => ({
                                                ...current,
                                                emailSenderAccountId: event.target.value
                                            }))}
                                            disabled={!canManage}
                                            className="w-full min-w-[260px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                                        >
                                            {senderOptions.map((option) => (
                                                <option key={option.value || 'default'} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="border-b border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                        Default sender right now: <span className="font-semibold text-slate-800">{defaultSenderLabel}</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {!canManage && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                        You have read-only access to notification settings.
                    </div>
                )}

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 bg-slate-100 px-5 py-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-white p-2 text-slate-700 shadow-sm ring-1 ring-slate-200">
                                <Bell size={17} />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-slate-800">Notification Matrix</h2>
                                <p className="text-xs text-slate-500">Excel-style table view of all notification events in the system.</p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Module</th>
                                    <th className="border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Notification Event</th>
                                    <th className="border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Description</th>
                                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Delivery Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderedDefinitions.map((definition, index) => (
                                    <tr
                                        key={definition.key}
                                        className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                                    >
                                        <td className="border-b border-r border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                                            {definition.module || 'General'}
                                        </td>
                                        <td className="border-b border-r border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">
                                            {definition.label}
                                        </td>
                                        <td className="border-b border-r border-slate-200 px-4 py-3 text-sm text-slate-600">
                                            {definition.description}
                                        </td>
                                        <td className="border-b border-slate-200 px-4 py-3">
                                            {(() => {
                                                const channelOptions = getDefinitionChannelOptions(definition);
                                                const isSingleChoice = channelOptions.length <= 1;

                                                return (
                                            <select
                                                value={settings.events?.[definition.key] || definition.defaultChannel || 'system'}
                                                onChange={(event) => updateEventChannel(definition.key, event.target.value)}
                                                disabled={!canManage || isSingleChoice}
                                                className="w-full min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                                            >
                                                {channelOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

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
    );
};

export default NotificationSettings;
