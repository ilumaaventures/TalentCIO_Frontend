import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Trash2, Archive, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { emptyBin, getBinItems, permanentDeleteBinItem, restoreBinItem } from '../api/bin';

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
    { key: 'querytype', label: 'Helpdesk Types' }
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
        case 'worklog':
            return item.hours ? `${item.hours} hour(s)` : '-';
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
            toast.error(error.response?.data?.message || 'Failed to restore item');
        } finally {
            setActionLoadingId('');
        }
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
        <div className="min-h-screen bg-slate-100 p-4 sm:p-6 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                                <Archive size={14} />
                                Admin Only
                            </div>
                            <h1 className="text-2xl font-bold text-slate-800">Recycle Bin</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Restore recently deleted records or permanently remove them from the workspace.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleEmptyBin}
                            disabled={selectedCount === 0 || actionLoadingId === 'empty'}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Trash2 size={16} />
                            Empty Selected Bin
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                            <AlertTriangle size={14} />
                            Deleted Entities
                        </div>
                        <div className="space-y-1">
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
                                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                                            active
                                                ? 'bg-slate-900 text-white shadow-sm'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                    >
                                        <span className="font-medium">{option.label}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">
                                    {ENTITY_OPTIONS.find((option) => option.key === selectedEntity)?.label || 'Items'}
                                </h2>
                                <p className="text-sm text-slate-500">{selectedCount} item(s) currently in this bin.</p>
                            </div>
                            <div className="text-sm text-slate-500">
                                Page {page} of {totalPages}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left text-sm">
                                <thead className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                                    <tr>
                                        <th className="px-6 py-3">Name / Title</th>
                                        <th className="px-6 py-3">Deleted By</th>
                                        <th className="px-6 py-3">Deleted At</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-16 text-center text-slate-500">Loading deleted records...</td>
                                        </tr>
                                    ) : items.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-16 text-center text-slate-500">No deleted items found for this entity.</td>
                                        </tr>
                                    ) : (
                                        items.map((item) => (
                                            <tr key={item._id} className="align-top">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-800">{getItemTitle(selectedEntity, item)}</div>
                                                    <div className="mt-1 text-xs text-slate-500">{getItemSubtitle(selectedEntity, item)}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">{formatPerson(item.deletedBy)}</td>
                                                <td className="px-6 py-4 text-slate-600">{formatDateTime(item.deletedAt)}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRestore(item._id)}
                                                            disabled={actionLoadingId !== '' && actionLoadingId !== `restore-${item._id}`}
                                                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                                                        >
                                                            <RotateCcw size={14} />
                                                            {actionLoadingId === `restore-${item._id}` ? 'Restoring...' : 'Restore'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePermanentDelete(item._id)}
                                                            disabled={actionLoadingId !== '' && actionLoadingId !== `delete-${item._id}`}
                                                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                                                        >
                                                            <Trash2 size={14} />
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

                        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
                                disabled={page === 1}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-slate-500">
                                Showing {items.length} of {total} deleted item(s)
                            </span>
                            <button
                                type="button"
                                onClick={() => setPage((currentPage) => Math.min(currentPage + 1, totalPages))}
                                disabled={page >= totalPages}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default RecycleBin;
