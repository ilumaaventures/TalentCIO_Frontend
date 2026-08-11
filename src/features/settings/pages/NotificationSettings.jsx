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

const formatSenderLabel = (sender = {}) => `${sender.name} (${sender.fromAddress})`;

const getDefinitionChannelOptions = (definition = {}) => {
    const supportedChannels = Array.isArray(definition?.supportedChannels) && definition.supportedChannels.length > 0
        ? definition.supportedChannels
        : CHANNEL_OPTIONS.map((option) => option.value);

    return CHANNEL_OPTIONS.filter((option) => supportedChannels.includes(option.value));
};

const buildAvailableSenders = (senderData = {}) => (
    [
        senderData.platformOption,
        ...(senderData.accounts || [])
    ].filter(Boolean)
);

const resolveEventSenderAccountIds = ({
    settings = {},
    definitions = [],
    senderData = {}
}) => {
    const availableSenders = buildAvailableSenders(senderData);
    const availableSenderIds = new Set(availableSenders.map((sender) => String(sender._id || '')));
    const fallbackSenderId = String(
        senderData.defaultAccountId
        || senderData.platformOption?._id
        || availableSenders[0]?._id
        || ''
    );
    const resolvedSelections = {};

    definitions.forEach((definition) => {
        const explicitSenderId = String(settings?.eventEmailSenderAccountIds?.[definition.key] || '').trim();
        if (explicitSenderId && availableSenderIds.has(explicitSenderId)) {
            resolvedSelections[definition.key] = explicitSenderId;
            return;
        }

        const legacySenderSource = String(settings?.eventEmailSenderSources?.[definition.key] || '').trim().toLowerCase();
        const legacyNotificationSenderId = String(settings?.emailSenderAccountId || '').trim();
        const fallbackFromLegacyNotification = legacyNotificationSenderId && availableSenderIds.has(legacyNotificationSenderId)
            ? legacyNotificationSenderId
            : fallbackSenderId;

        resolvedSelections[definition.key] = legacySenderSource === 'default'
            ? fallbackSenderId
            : fallbackFromLegacyNotification;
    });

    return resolvedSelections;
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
        events: {},
        eventEmailSenderSources: {},
        eventEmailSenderAccountIds: {}
    });
    const [senderData, setSenderData] = useState({
        defaultAccountId: '',
        platformOption: null,
        accounts: []
    });
    const [emailDefaultAccountId, setEmailDefaultAccountId] = useState('');
    const [overrides, setOverrides] = useState({});

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [notificationResponse, senderResponse] = await Promise.all([
                    api.get('/company/notification-settings'),
                    api.get('/company/email-settings/senders')
                ]);

                const nextDefinitions = Array.isArray(notificationResponse.data?.definitions) ? notificationResponse.data.definitions : [];
                const nextSenderData = {
                    defaultAccountId: senderResponse.data?.defaultAccountId || '',
                    platformOption: senderResponse.data?.platformOption || null,
                    accounts: Array.isArray(senderResponse.data?.accounts) ? senderResponse.data.accounts : []
                };
                const nextSettings = notificationResponse.data?.settings || {
                    emailSenderAccountId: '',
                    events: {},
                    eventEmailSenderSources: {},
                    eventEmailSenderAccountIds: {}
                };

                const availableSenderIds = new Set(
                    [nextSenderData.platformOption, ...nextSenderData.accounts]
                        .filter(Boolean)
                        .map((s) => String(s._id || ''))
                );
                const currentDefaultId = nextSettings.emailSenderAccountId || senderResponse.data?.defaultAccountId || senderResponse.data?.platformOption?._id || '';
                const initialOverrides = {};
                nextDefinitions.forEach((def) => {
                    const explicitSenderId = String(nextSettings?.eventEmailSenderAccountIds?.[def.key] || '').trim();
                    if (explicitSenderId && availableSenderIds.has(explicitSenderId) && explicitSenderId !== currentDefaultId) {
                        initialOverrides[def.key] = true;
                    }
                });

                setDefinitions(nextDefinitions);
                setSenderData(nextSenderData);
                setOverrides(initialOverrides);
                setSettings({
                    ...nextSettings,
                    eventEmailSenderAccountIds: resolveEventSenderAccountIds({
                        settings: nextSettings,
                        definitions: nextDefinitions,
                        senderData: nextSenderData
                    })
                });
                setEmailDefaultAccountId(
                    senderResponse.data?.defaultAccountId
                    || senderResponse.data?.platformOption?._id
                    || ''
                );
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

    const availableSenders = useMemo(() => buildAvailableSenders(senderData), [senderData]);

    const senderOptions = useMemo(() => {
        const options = [{
            value: '',
            label: 'Use default sender from Email Settings'
        }];

        availableSenders.forEach((account) => {
            options.push({
                value: String(account._id || ''),
                label: formatSenderLabel(account)
            });
        });

        return options;
    }, [availableSenders]);

    const defaultSenderOptions = useMemo(() => (
        availableSenders.map((account) => ({
            value: String(account._id || ''),
            label: formatSenderLabel(account)
        }))
    ), [availableSenders]);

    const defaultSenderLabel = useMemo(() => {
        const matched = availableSenders.find((option) => String(option._id) === String(emailDefaultAccountId));
        return matched
            ? formatSenderLabel(matched)
            : 'No default sender configured';
    }, [availableSenders, emailDefaultAccountId]);

    const emailEnabledEvents = useMemo(() => (
        Object.values(settings.events || {}).filter((value) => value === 'email' || value === 'both').length
    ), [settings.events]);

    const defaultSenderChanged = String(emailDefaultAccountId || '') !== String(senderData.defaultAccountId || '');

    const updateEventChannel = (eventKey, channel) => {
        setSettings((current) => ({
            ...current,
            events: {
                ...(current.events || {}),
                [eventKey]: channel
            }
        }));
    };

    const updateEventEmailSenderAccountId = (eventKey, senderAccountId) => {
        setSettings((current) => ({
            ...current,
            eventEmailSenderAccountIds: {
                ...(current.eventEmailSenderAccountIds || {}),
                [eventKey]: senderAccountId
            }
        }));
    };

    const eventUsesEmail = (eventKey, defaultChannel) => {
        const channel = settings.events?.[eventKey] || defaultChannel || 'system';
        return channel === 'email' || channel === 'both';
    };

    const handleSave = async () => {
        if (!canManage) return;

        setSaving(true);
        let defaultSenderSaved = false;

        try {
            if (defaultSenderChanged) {
                const { data: defaultSenderResponse } = await api.put('/company/email-settings/default-sender', {
                    defaultAccountId: emailDefaultAccountId
                });

                setSenderData((current) => ({
                    ...current,
                    defaultAccountId: defaultSenderResponse?.defaultAccountId || emailDefaultAccountId
                }));
                defaultSenderSaved = true;
            }

            // Construct the settings payload with override fields
            const eventEmailSenderAccountIds = {};
            const eventEmailSenderSources = {};

            definitions.forEach((def) => {
                if (overrides[def.key]) {
                    eventEmailSenderAccountIds[def.key] = settings.eventEmailSenderAccountIds?.[def.key] || '';
                    eventEmailSenderSources[def.key] = 'notification';
                } else {
                    eventEmailSenderAccountIds[def.key] = '';
                    eventEmailSenderSources[def.key] = 'notification'; // Follow the top Notification Sender
                }
            });

            const settingsToSave = {
                ...settings,
                eventEmailSenderAccountIds,
                eventEmailSenderSources
            };

            const { data } = await api.put('/company/notification-settings', settingsToSave);
            setSettings(data?.settings || settingsToSave);
            toast.success(
                defaultSenderSaved
                    ? 'Notification settings and default sender saved'
                    : (data?.message || 'Notification settings saved')
            );
        } catch (error) {
            toast.error(
                defaultSenderSaved
                    ? (error.response?.data?.message || 'Default sender saved, but notification settings failed to save.')
                    : (error.response?.data?.message || 'Failed to save notification settings')
            );
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
                                    <p className="text-xs text-slate-500">Manage the general notification sender and the company default sender.</p>
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
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Default sender right now
                                            </p>
                                            <select
                                                value={emailDefaultAccountId}
                                                onChange={(event) => setEmailDefaultAccountId(event.target.value)}
                                                disabled={!canManage}
                                                className="w-full min-w-[320px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                                            >
                                                {defaultSenderOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                            <p>
                                                Currently selected: <span className="font-semibold text-slate-800">{defaultSenderLabel}</span>
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Event rows now choose a real sender email directly from the configured sender list below.
                                            </p>
                                        </div>
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
                                    <th className="border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Delivery Type</th>
                                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Email Sender</th>
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
                                        <td className="border-b border-slate-200 px-4 py-3">
                                            <select
                                                value={overrides[definition.key] ? (settings.eventEmailSenderAccountIds?.[definition.key] || '') : (settings.emailSenderAccountId || emailDefaultAccountId)}
                                                onChange={(event) => {
                                                    const val = event.target.value;
                                                    const defaultId = settings.emailSenderAccountId || emailDefaultAccountId;
                                                    if (val === defaultId) {
                                                        setOverrides((curr) => ({ ...curr, [definition.key]: false }));
                                                        updateEventEmailSenderAccountId(definition.key, '');
                                                    } else {
                                                        setOverrides((curr) => ({ ...curr, [definition.key]: true }));
                                                        updateEventEmailSenderAccountId(definition.key, val);
                                                    }
                                                }}
                                                disabled={!canManage || !eventUsesEmail(definition.key, definition.defaultChannel)}
                                                className="w-full min-w-[240px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                                            >
                                                {defaultSenderOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
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
