import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Copy,
    Download,
    ExternalLink,
    Eye,
    FileCheck,
    FileText,
    Filter,
    FolderArchive,
    History,
    Mail,
    Paperclip,
    RefreshCw,
    Search,
    Send,
    User,
    Users,
    X,
    XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/apiClient';
import Skeleton from '@/components/ui/Skeleton';

const TYPE_OPTIONS = [
    { value: 'all', label: 'All Categories' },
    { value: 'general', label: 'General / Send HR Email' },
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'offboarding', label: 'Offboarding' }
];

const DATE_RANGE_OPTIONS = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' }
];

const ATTACHMENT_OPTIONS = [
    { value: 'all', label: 'All Emails' },
    { value: 'true', label: 'With Attachments' },
    { value: 'false', label: 'Without Attachments' }
];

const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch {
        return '-';
    }
};

const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        if (diffMs < 0) return 'Just now';
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 30) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
};

const stripHtml = (html = '') => {
    if (!html) return '';
    return String(html)
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

export const HREmailHistory = ({ onComposeClick, onTotalCountChange }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [summary, setSummary] = useState({ totalCount: 0, totalWithAttachments: 0 });

    // Filters
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [attachmentFilter, setAttachmentFilter] = useState('all');
    const [dateRangeFilter, setDateRangeFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Detail Modal State
    const [selectedLog, setSelectedLog] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Calculate dates based on range preset
    const calculatedDateRange = useMemo(() => {
        if (dateRangeFilter === 'today') {
            const today = new Date().toISOString().split('T')[0];
            return { start: today, end: today };
        }
        if (dateRangeFilter === '7days') {
            const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const today = new Date().toISOString().split('T')[0];
            return { start: past, end: today };
        }
        if (dateRangeFilter === '30days') {
            const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const today = new Date().toISOString().split('T')[0];
            return { start: past, end: today };
        }
        if (dateRangeFilter === 'custom') {
            return { start: startDate, end: endDate };
        }
        return { start: '', end: '' };
    }, [dateRangeFilter, startDate, endDate]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit,
                search: debouncedSearch || undefined,
                type: typeFilter !== 'all' ? typeFilter : undefined,
                hasAttachments: attachmentFilter !== 'all' ? attachmentFilter : undefined,
                startDate: calculatedDateRange.start || undefined,
                endDate: calculatedDateRange.end || undefined
            };

            const response = await api.get('/hr-email/history', { params });
            const data = response.data || {};
            setLogs(Array.isArray(data.logs) ? data.logs : []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
            if (data.summary) {
                setSummary(data.summary);
                if (typeof onTotalCountChange === 'function') {
                    onTotalCountChange(data.summary.totalCount ?? data.total ?? 0);
                }
            }
        } catch (error) {
            console.error('Failed to load email history:', error);
            toast.error(error.response?.data?.message || 'Failed to load email history');
        } finally {
            setLoading(false);
        }
    }, [page, limit, debouncedSearch, typeFilter, attachmentFilter, calculatedDateRange, onTotalCountChange]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleViewDetail = async (logId) => {
        setLoadingDetail(true);
        try {
            const res = await api.get(`/hr-email/history/detail/${logId}`);
            if (res.data?.log) {
                setSelectedLog(res.data.log);
            } else {
                const fallback = logs.find((l) => l._id === logId);
                setSelectedLog(fallback || null);
            }
        } catch (err) {
            console.error('Failed to load detail:', err);
            const fallback = logs.find((l) => l._id === logId);
            setSelectedLog(fallback || null);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleCopyBody = () => {
        if (!selectedLog) return;
        const text = stripHtml(selectedLog.body || '');
        if (text) {
            navigator.clipboard.writeText(text);
            toast.success('Email text copied to clipboard!');
        }
    };

    const hasActiveFilters = Boolean(
        search ||
        typeFilter !== 'all' ||
        attachmentFilter !== 'all' ||
        dateRangeFilter !== 'all'
    );

    const handleClearFilters = () => {
        setSearch('');
        setDebouncedSearch('');
        setTypeFilter('all');
        setAttachmentFilter('all');
        setDateRangeFilter('all');
        setStartDate('');
        setEndDate('');
        setPage(1);
    };

    return (
        <div className="space-y-4 font-sans">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Mail size={20} />
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sent Emails</div>
                        <div className="text-xl font-black text-slate-900">{summary.totalCount || total || 0}</div>
                    </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                        <Paperclip size={20} />
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">With Attachments</div>
                        <div className="text-xl font-black text-slate-900">{summary.totalWithAttachments || 0}</div>
                    </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <FileCheck size={20} />
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Showing Records</div>
                        <div className="text-xl font-black text-slate-900">{total}</div>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by recipient, email, employee code, subject, sender..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-xs font-medium outline-none transition focus:border-blue-300 focus:bg-white"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Filter Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Type Dropdown */}
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setPage(1);
                            }}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-100 focus:border-blue-300 focus:bg-white cursor-pointer"
                        >
                            {TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>

                        {/* Attachments Dropdown */}
                        <select
                            value={attachmentFilter}
                            onChange={(e) => {
                                setAttachmentFilter(e.target.value);
                                setPage(1);
                            }}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-100 focus:border-blue-300 focus:bg-white cursor-pointer"
                        >
                            {ATTACHMENT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>

                        {/* Date Range Dropdown */}
                        <select
                            value={dateRangeFilter}
                            onChange={(e) => {
                                setDateRangeFilter(e.target.value);
                                setPage(1);
                            }}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-100 focus:border-blue-300 focus:bg-white cursor-pointer"
                        >
                            {DATE_RANGE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>

                        {/* Custom Date Pickers if selected */}
                        {dateRangeFilter === 'custom' && (
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setPage(1);
                                    }}
                                    className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-300"
                                />
                                <span className="text-xs text-slate-400">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setPage(1);
                                    }}
                                    className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-300"
                                />
                            </div>
                        )}

                        {/* Refresh Button */}
                        <button
                            type="button"
                            onClick={() => fetchLogs()}
                            disabled={loading}
                            title="Refresh logs"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                        >
                            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="inline-flex items-center gap-1 rounded-xl border border-dashed border-red-200 bg-red-50/50 px-2.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 cursor-pointer"
                            >
                                <X size={12} />
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Email History Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[950px] border-collapse text-left text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <th className="px-4 py-3">Recipient Employee</th>
                                <th className="px-4 py-3">Subject & Content</th>
                                <th className="px-4 py-3">Attachments</th>
                                <th className="px-4 py-3">Sent By</th>
                                <th className="px-4 py-3">Date & Time</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12">
                                        <div className="space-y-3">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className="flex items-center gap-4">
                                                    <Skeleton className="h-9 w-9 rounded-full" />
                                                    <div className="flex-1 space-y-1.5">
                                                        <Skeleton className="h-3.5 w-1/3 rounded-md" />
                                                        <Skeleton className="h-2.5 w-1/2 rounded-md" />
                                                    </div>
                                                    <Skeleton className="h-6 w-24 rounded-lg" />
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center">
                                        <div className="mx-auto flex max-w-sm flex-col items-center justify-center text-center">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                                                <Mail size={24} />
                                            </div>
                                            <h3 className="mt-3 text-sm font-bold text-slate-800">
                                                {hasActiveFilters ? 'No Matching Email Records' : 'No Sent Emails Recorded'}
                                            </h3>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {hasActiveFilters
                                                    ? 'No emails found matching your current search and filter criteria. Try adjusting or clearing filters.'
                                                    : 'Emails sent to employees from the Send HR Email flow will automatically appear here with all attachments and details.'}
                                            </p>
                                            <div className="mt-4 flex gap-2">
                                                {hasActiveFilters ? (
                                                    <button
                                                        type="button"
                                                        onClick={handleClearFilters}
                                                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                                                    >
                                                        Reset Filters
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={onComposeClick}
                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 cursor-pointer"
                                                    >
                                                        <Send size={13} />
                                                        Compose HR Email
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const previewSnippet = stripHtml(log.body || '').slice(0, 75);
                                    const hasAtts = Array.isArray(log.attachments) && log.attachments.length > 0;
                                    const isFailed = log.status === 'Failed';

                                    return (
                                        <tr
                                            key={log._id}
                                            className="group transition-colors hover:bg-slate-50/70"
                                        >
                                            {/* Recipient Column */}
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                                        {log.recipientName?.charAt(0)?.toUpperCase() || 'E'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                                            {log.recipientName}
                                                        </div>
                                                        <div className="mt-0.5 text-[11px] text-slate-500 font-mono">
                                                            {log.recipientEmail}
                                                        </div>
                                                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                                                            {log.recipientEmployeeCode && (
                                                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                                                                    Code: {log.recipientEmployeeCode}
                                                                </span>
                                                            )}
                                                            {log.recipientDepartment && (
                                                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                                                                    {log.recipientDepartment}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Subject & Preview Column */}
                                            <td className="px-4 py-3 align-top max-w-[280px]">
                                                <div className="font-bold text-slate-800 line-clamp-1" title={log.subject}>
                                                    {log.subject || '(No Subject)'}
                                                </div>
                                                {previewSnippet && (
                                                    <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
                                                        {previewSnippet}...
                                                    </p>
                                                )}
                                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                    {log.templateName && (
                                                        <span className="rounded-md border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-purple-700">
                                                            Template: {log.templateName}
                                                        </span>
                                                    )}
                                                    {log.type && log.type !== 'general' && (
                                                        <span className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-slate-600 capitalize">
                                                            {log.type}
                                                        </span>
                                                    )}
                                                    {log.dossierSaved && (
                                                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-700">
                                                            Dossier: {log.dossierCategory || 'Saved'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Attachments Column */}
                                            <td className="px-4 py-3 align-top">
                                                {hasAtts ? (
                                                    <div className="space-y-1.5">
                                                        <div className="inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-700">
                                                            <Paperclip size={12} className="text-slate-400" />
                                                            <span>{log.attachments.length} attached</span>
                                                        </div>
                                                        <div className="flex flex-col gap-1 max-w-[190px]">
                                                            {log.attachments.map((att, idx) => (
                                                                att.cloudinaryUrl ? (
                                                                    <a
                                                                        key={`${att.filename}-${idx}`}
                                                                        href={att.cloudinaryUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="inline-flex items-center gap-1.5 truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10.5px] font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
                                                                        title={`Download ${att.filename}`}
                                                                    >
                                                                        <FileText size={12} className="shrink-0 text-blue-500" />
                                                                        <span className="truncate">{att.filename || 'Attachment'}</span>
                                                                        <ExternalLink size={10} className="shrink-0 opacity-60" />
                                                                    </a>
                                                                ) : (
                                                                    <span
                                                                        key={`${att.filename}-${idx}`}
                                                                        className="inline-flex items-center gap-1.5 truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10.5px] font-medium text-slate-600"
                                                                        title={att.filename}
                                                                    >
                                                                        <FileText size={12} className="shrink-0 text-slate-400" />
                                                                        <span className="truncate">{att.filename || 'Attachment'}</span>
                                                                    </span>
                                                                )
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">None</span>
                                                )}
                                            </td>

                                            {/* Sent By Column */}
                                            <td className="px-4 py-3 align-top">
                                                <div className="font-semibold text-slate-800 text-xs">
                                                    {log.senderName}
                                                </div>
                                                {log.senderEmail && (
                                                    <div className="text-[10.5px] text-slate-400">
                                                        {log.senderEmail}
                                                    </div>
                                                )}
                                                <div className="mt-1 text-[10px] text-slate-500">
                                                    Via: <span className="font-medium text-slate-700">{log.emailAccountLabel || 'TalentCIO'}</span>
                                                </div>
                                            </td>

                                            {/* Date Column */}
                                            <td className="px-4 py-3 align-top whitespace-nowrap">
                                                <div className="text-xs font-semibold text-slate-800">
                                                    {formatDate(log.sentAt)}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium">
                                                    {formatRelativeTime(log.sentAt)}
                                                </div>
                                            </td>

                                            {/* Status Column */}
                                            <td className="px-4 py-3 align-top">
                                                {isFailed ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700">
                                                        <XCircle size={10} />
                                                        Failed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                                        <CheckCircle2 size={10} />
                                                        Sent
                                                    </span>
                                                )}
                                            </td>

                                            {/* Action Column */}
                                            <td className="px-4 py-3 align-top text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleViewDetail(log._id)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                                                >
                                                    <Eye size={13} />
                                                    <span>View</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!loading && total > 0 && (
                    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span>
                                Showing <span className="font-semibold text-slate-900">{Math.min((page - 1) * limit + 1, total)}</span> to{' '}
                                <span className="font-semibold text-slate-900">{Math.min(page * limit, total)}</span> of{' '}
                                <span className="font-semibold text-slate-900">{total}</span> emails
                            </span>
                            <span className="text-slate-300">|</span>
                            <div className="flex items-center gap-1.5">
                                <span>Per page:</span>
                                <select
                                    value={limit}
                                    onChange={(e) => {
                                        setLimit(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                disabled={page <= 1}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <ChevronLeft size={13} />
                                Prev
                            </button>
                            <span className="px-2 text-xs font-bold text-slate-700">
                                {page} / {totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                                disabled={page >= totalPages}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Next
                                <ChevronRight size={13} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Email Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div
                        className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                            <div className="pr-4">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                            selectedLog.status === 'Failed'
                                                ? 'border-red-200 bg-red-50 text-red-700'
                                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        }`}
                                    >
                                        {selectedLog.status === 'Failed' ? <XCircle size={10} /> : <CheckCircle2 size={10} />}
                                        {selectedLog.status || 'Sent'}
                                    </span>
                                    {selectedLog.type && (
                                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 capitalize">
                                            {selectedLog.type}
                                        </span>
                                    )}
                                    <span className="text-xs text-slate-400">
                                        {formatDate(selectedLog.sentAt)}
                                    </span>
                                </div>
                                <h2 className="mt-1.5 text-base font-bold text-slate-900">
                                    {selectedLog.subject || '(No Subject)'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Body Scrollable */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                            {/* Meta Info Grid */}
                            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                                <div>
                                    <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider block">Recipient</span>
                                    <div className="mt-0.5 font-bold text-slate-900 text-sm">{selectedLog.recipientName}</div>
                                    <div className="text-slate-600 font-mono text-xs">{selectedLog.recipientEmail}</div>
                                    {(selectedLog.recipientEmployeeCode || selectedLog.recipientDepartment) && (
                                        <div className="mt-1 text-slate-500 text-[11px]">
                                            {selectedLog.recipientEmployeeCode ? `Code: ${selectedLog.recipientEmployeeCode} · ` : ''}
                                            {selectedLog.recipientDepartment || ''}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider block">Sent By & Account</span>
                                    <div className="mt-0.5 font-bold text-slate-900 text-sm">{selectedLog.senderName}</div>
                                    <div className="text-slate-600 text-xs">{selectedLog.senderEmail || 'HR System'}</div>
                                    <div className="mt-1 text-slate-500 text-[11px]">
                                        Account: <span className="font-semibold text-slate-700">{selectedLog.emailAccountLabel || 'TalentCIO Platform'}</span>
                                    </div>
                                </div>

                                {selectedLog.cc && (
                                    <div className="sm:col-span-2">
                                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider block">CC</span>
                                        <div className="mt-0.5 font-mono text-slate-700">{selectedLog.cc}</div>
                                    </div>
                                )}

                                {selectedLog.bcc && (
                                    <div className="sm:col-span-2">
                                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider block">BCC</span>
                                        <div className="mt-0.5 font-mono text-slate-700">{selectedLog.bcc}</div>
                                    </div>
                                )}

                                <div>
                                    <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider block">Email Template</span>
                                    <div className="mt-0.5 font-medium text-slate-800">
                                        {selectedLog.templateName || selectedLog.templateId?.name || 'Custom / None'}
                                    </div>
                                </div>

                                <div>
                                    <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider block">Dossier Storage</span>
                                    <div className="mt-0.5 font-medium text-slate-800">
                                        {selectedLog.dossierSaved ? (
                                            <span className="text-emerald-700 font-semibold">
                                                Saved · Category: {selectedLog.dossierCategory || 'Other'}
                                            </span>
                                        ) : selectedLog.dossierSaveError ? (
                                            <span className="text-red-600 font-medium">Not Saved ({selectedLog.dossierSaveError})</span>
                                        ) : (
                                            <span className="text-slate-500">Not saved to dossier</span>
                                        )}
                                    </div>
                                </div>

                                {selectedLog.notes && (
                                    <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-white p-2.5">
                                        <span className="font-semibold text-slate-700 block text-[11px]">Internal Notes:</span>
                                        <div className="mt-0.5 text-slate-600">{selectedLog.notes}</div>
                                    </div>
                                )}

                                {selectedLog.failureReason && (
                                    <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-700">
                                        <span className="font-bold block text-[11px]">Failure Reason:</span>
                                        <div className="mt-0.5">{selectedLog.failureReason}</div>
                                    </div>
                                )}
                            </div>

                            {/* Attachments Section */}
                            {Array.isArray(selectedLog.attachments) && selectedLog.attachments.length > 0 && (
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2.5">
                                        <Paperclip size={14} className="text-slate-400" />
                                        <span>Attached Files ({selectedLog.attachments.length})</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {selectedLog.attachments.map((att, index) => (
                                            <div
                                                key={`${att.filename}-${index}`}
                                                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 transition hover:border-blue-200 hover:bg-blue-50/40"
                                            >
                                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                                    <FileText size={16} className="text-blue-600 shrink-0" />
                                                    <div className="min-w-0">
                                                        <div className="truncate font-semibold text-slate-800 text-xs" title={att.filename}>
                                                            {att.filename || 'Attachment'}
                                                        </div>
                                                        {att.dossierDocId && (
                                                            <div className="text-[10px] text-emerald-600 font-medium">Dossier Linked</div>
                                                        )}
                                                    </div>
                                                </div>
                                                {att.cloudinaryUrl ? (
                                                    <a
                                                        href={att.cloudinaryUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs transition hover:bg-blue-700 cursor-pointer"
                                                        download={att.filename}
                                                    >
                                                        <Download size={11} />
                                                        <span>Download</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 italic">No URL</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Email Message Viewer */}
                            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                        <Mail size={13} className="text-slate-400" />
                                        <span>Email Message Content</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCopyBody}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                                    >
                                        <Copy size={11} />
                                        Copy Text
                                    </button>
                                </div>
                                <div className="p-2 bg-white min-h-[300px]">
                                    {selectedLog.body ? (
                                        <iframe
                                            srcDoc={selectedLog.body}
                                            title={`email-detail-${selectedLog._id}`}
                                            className="w-full min-h-[360px] border-0"
                                            sandbox="allow-popups allow-popups-to-escape-sandbox"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center p-8 text-xs text-slate-400 italic">
                                            No message content was stored for this email record.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-5 py-3">
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HREmailHistory;

