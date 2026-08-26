import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Trash2, Archive, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { emptyBin, getBinItems, permanentDeleteBinItem, restoreBinItem } from '@/features/recycle-bin/api/bin';

const ENTITY_OPTIONS = [
    { key: 'project', label: 'Projects' },
    { key: 'module', label: 'Modules' },
    { key: 'task', label: 'Tasks' },
    { key: 'worklog', label: 'Work Logs' },
    { key: 'candidate', label: 'Candidates' },
    { key: 'hiringrequest', label: 'Hiring Requests' },
    { key: 'user', label: 'Users' },
    { key: 'role', label: 'Roles' },
    { key: 'client', label: 'Clients' },
    { key: 'businessunit', label: 'Business Units' },
    { key: 'discussion', label: 'Discussions' },
    { key: 'meeting', label: 'Meetings' },
    { key: 'holiday', label: 'Holidays' },
    { key: 'approvalworkflow', label: 'Approval Workflows' },
    { key: 'interviewworkflow', label: 'Interview Workflows' },
    { key: 'leaveconfig', label: 'Leave Policies' },
    { key: 'querytype', label: 'Helpdesk Types' },
    { key: 'emailtemplate', label: 'Email Templates' },
    { key: 'onboardingtemplate', label: 'Onboarding Templates' },
    { key: 'onboardingpolicy', label: 'Onboarding Policies' }
];

const formatPerson = (person) => {
    if (!person) return 'Unknown';
    const name = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
    return name || person.email || 'Unknown';
};

const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
};

const getItemTitle = (entity, item) => {
    switch (entity) {
        case 'project':
        case 'module':
        case 'task':
        case 'role':
        case 'client':
        case 'businessunit':
        case 'discussion':
        case 'meeting':
        case 'holiday':
        case 'approvalworkflow':
        case 'interviewworkflow':
        case 'querytype':
        case 'emailtemplate':
        case 'onboardingtemplate':
        case 'onboardingpolicy':
            return item.name || item.title || 'Untitled';
        case 'candidate':
            return item.candidateName || item.email || 'Candidate';
        case 'hiringrequest':
            return item.requestId || item.roleDetails?.title || 'Hiring Request';
        case 'user':
            return [item.firstName, item.lastName].filter(Boolean).join(' ').trim() || item.email || 'User';
        case 'worklog':
            return item.description?.trim() || `Work log for ${formatDateTime(item.date)}`;
        case 'leaveconfig':
            return item.name || item.leaveType || 'Leave Policy';
        default:
            return item.name || item.title || item.requestId || 'Record';
    }
};

const getItemSubtitle = (entity, item) => {
    switch (entity) {
        case 'candidate':
        case 'user':
            return item.email || '-';
        case 'hiringrequest':
            return item.roleDetails?.title || item.client || '-';
        case 'client':
            return item.companyName || item.email || '-';
        case 'businessunit':
            return item.description || '-';
        case 'meeting':
            return item.meetingType || '-';
        case 'holiday':
            return item.year ? `Year ${item.year}` : '-';
        case 'leaveconfig':
            return item.leaveType || '-';
        case 'querytype':
            return item.assignedPerson?.email || '-';
        case 'emailtemplate':
            return item.subject || '-';
        case 'worklog':
            return item.hours ? `${item.hours} hour(s)` : '-';
        case 'onboardingtemplate':
        case 'onboardingpolicy':
            return item.url || '-';
        default:
            return item.description || item.status || '-';
    }
};

const RecycleBin = () => {
    const [selectedEntity, setSelectedEntity] = useState('project');
    const [items, setItems] = useState([]);
    const [counts, setCounts] = useState({});
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState('');
    const [restoreConflict, setRestoreConflict] = useState(null);

    const fetchCounts = useCallback(async () => {
        const response = await getBinItems();
        setCounts(response.data?.counts || {});
    }, []);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getBinItems(selectedEntity, page, limit);
            setItems(response.data?.items || []);
            setTotal(response.data?.total || 0);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load recycle bin');
        } finally {
            setLoading(false);
        }
    }, [limit, page, selectedEntity]);

    useEffect(() => {
        fetchCounts().catch(() => {});
    }, [fetchCounts]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const refreshAll = async () => {
        await Promise.all([fetchCounts(), fetchItems()]);
    };

    const handleRestore = async (id) => {
        try {
            setActionLoadingId(`restore-${id}`);
            await restoreBinItem(selectedEntity, id);
            toast.success('Item restored successfully');
            await refreshAll();
        } catch (error) {
            if (error.response?.status === 409 && error.response?.data?.requiresAction) {
                const pendingItem = items.find((item) => item._id === id);
                setRestoreConflict({
                    itemId: id,
                    itemTitle: pendingItem ? getItemTitle(selectedEntity, pendingItem) : 'this item',
                    message: error.response.data.message,
                    conflictTitle: error.response.data?.conflict?.title || 'existing item'
                });
            } else {
                toast.error(error.response?.data?.message || 'Failed to restore item');
            }
        } finally {
            setActionLoadingId('');
        }
    };

    const handleReplaceRestore = async () => {
        if (!restoreConflict) {
            return;
        }

        try {
            setActionLoadingId(`restore-${restoreConflict.itemId}`);
            await restoreBinItem(selectedEntity, restoreConflict.itemId, { action: 'replace' });
            toast.success('Item restored and conflicting item moved to the bin');
            setRestoreConflict(null);
            await refreshAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to replace existing item');
        } finally {
            setActionLoadingId('');
        }
    };

    const handleCancelRestore = () => {
        setRestoreConflict(null);
        toast('Restore cancelled');
    };

    const handlePermanentDelete = async (id) => {
        if (!window.confirm('Permanently delete this item? This cannot be undone.')) {
            return;
        }

        try {
            setActionLoadingId(`delete-${id}`);
            await permanentDeleteBinItem(selectedEntity, id);
            toast.success('Item permanently deleted');
            if (items.length === 1 && page > 1) {
                await fetchCounts();
                setPage((currentPage) => currentPage - 1);
            } else {
                await refreshAll();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to permanently delete item');
        } finally {
            setActionLoadingId('');
        }
    };

    const handleEmptyBin = async () => {
        if (!window.confirm(`Permanently empty the ${ENTITY_OPTIONS.find((option) => option.key === selectedEntity)?.label || 'selected'} bin? This cannot be undone.`)) {
            return;
        }

        try {
            setActionLoadingId('empty');
            await emptyBin(selectedEntity);
            toast.success('Bin emptied successfully');
            setPage(1);
            await refreshAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to empty bin');
        } finally {
            setActionLoadingId('');
        }
    };

    const selectedCount = counts[selectedEntity] || 0;
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    return (
        <div className="min-h-screen bg-slate-100 p-3 sm:p-4 md:p-5 font-sans">
            <div className="mx-auto max-w-7xl space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                                <Archive size={12} />
                                Admin Only
                            </div>
                            <h1 className="text-lg font-bold text-slate-800">Recycle Bin</h1>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                                Restore recently deleted records or permanently remove them from the workspace.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleEmptyBin}
                            disabled={selectedCount === 0 || actionLoadingId === 'empty'}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        >
                            <Trash2 size={14} />
                            Empty Selected Bin
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
                    <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
                        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                            <AlertTriangle size={12} />
                            Deleted Entities
                        </div>
                        <div className="space-y-0.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                            {ENTITY_OPTIONS.map((option) => {
                                const active = option.key === selectedEntity;
                                const count = counts[option.key] || 0;

                                return (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => {
                                            setSelectedEntity(option.key);
                                            setPage(1);
                                        }}
                                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition cursor-pointer ${
                                            active
                                                ? 'bg-slate-900 text-white shadow-2xs font-bold'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                        }`}
                                    >
                                        <span className="truncate">{option.label}</span>
                                        <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    <section className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                        <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-slate-800">
                                    {ENTITY_OPTIONS.find((option) => option.key === selectedEntity)?.label || 'Items'}
                                </h2>
                                <p className="text-[11px] text-slate-400">{selectedCount} item(s) currently in this bin.</p>
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                                Page {page} of {totalPages}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px] text-left text-xs">
                                <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-4 py-2">Name / Title</th>
                                        <th className="px-4 py-2">Deleted By</th>
                                        <th className="px-4 py-2">Deleted At</th>
                                        <th className="px-4 py-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-12 text-center text-xs text-slate-500">Loading deleted records...</td>
                                        </tr>
                                    ) : items.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-12 text-center text-xs text-slate-500">No deleted items found for this entity.</td>
                                        </tr>
                                    ) : (
                                        items.map((item) => (
                                            <tr key={item._id} className="align-top hover:bg-slate-50/70 transition-colors">
                                                <td className="px-4 py-2.5">
                                                    <div className="font-bold text-slate-900 text-xs">{getItemTitle(selectedEntity, item)}</div>
                                                    <div className="mt-0.5 text-[10.5px] text-slate-400">{getItemSubtitle(selectedEntity, item)}</div>
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-600 text-xs">{formatPerson(item.deletedBy)}</td>
                                                <td className="px-4 py-2.5 text-slate-600 text-[11px]">{formatDateTime(item.deletedAt)}</td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRestore(item._id)}
                                                            disabled={actionLoadingId !== '' && actionLoadingId !== `restore-${item._id}`}
                                                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10.5px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 cursor-pointer"
                                                        >
                                                            <RotateCcw size={12} />
                                                            {actionLoadingId === `restore-${item._id}` ? 'Restoring...' : 'Restore'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePermanentDelete(item._id)}
                                                            disabled={actionLoadingId !== '' && actionLoadingId !== `delete-${item._id}`}
                                                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10.5px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50 cursor-pointer"
                                                        >
                                                            <Trash2 size={12} />
                                                            {actionLoadingId === `delete-${item._id}` ? 'Deleting...' : 'Delete Permanently'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 bg-slate-50/50">
                            <button
                                type="button"
                                onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
                                disabled={page === 1}
                                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                            >
                                Previous
                            </button>
                            <span className="text-[11px] text-slate-500 font-medium">
                                Showing {items.length} of {total} deleted item(s)
                            </span>
                            <button
                                type="button"
                                onClick={() => setPage((currentPage) => Math.min(currentPage + 1, totalPages))}
                                disabled={page >= totalPages}
                                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                            >
                                Next
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            {restoreConflict && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                        <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 rounded-full bg-amber-100 p-1.5 text-amber-700">
                                <AlertTriangle size={16} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-bold text-slate-900">Restore conflict</h3>
                                <p className="mt-1 text-xs leading-5 text-slate-600">{restoreConflict.message}</p>
                                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                                    <p><span className="font-bold text-slate-900">Restore:</span> {restoreConflict.itemTitle}</p>
                                    <p className="mt-1"><span className="font-bold text-slate-900">Replace:</span> {restoreConflict.conflictTitle}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleCancelRestore}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleReplaceRestore}
                                disabled={actionLoadingId === `restore-${restoreConflict.itemId}`}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50 cursor-pointer"
                            >
                                {actionLoadingId === `restore-${restoreConflict.itemId}` ? 'Replacing...' : 'Replace'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecycleBin;
