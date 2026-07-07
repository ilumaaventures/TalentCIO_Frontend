import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import api from '../api/axios';
import { Plus, MessageSquare, Calendar, Search, ChevronLeft, ChevronRight, X, MoreVertical, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import Skeleton from '../components/Skeleton';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createCachePayload, isCacheFresh, readSessionCache } from '../utils/cache';

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

const Discussions = () => {
    const navigate = useNavigate();
    const [discussions, setDiscussions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Export Dates State
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef(null);

    // New states for inline creation
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // New states for inline editing
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState(null);

    const [expandedRows, setExpandedRows] = useState({});
    const toggleRowExpanded = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const { user } = useAuth();
    const [supervisors, setSupervisors] = useState([]);
    const [projects, setProjects] = useState([]);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [detailsDiscussion, setDetailsDiscussion] = useState(null);

    const [createVisibleSearchVal, setCreateVisibleSearchVal] = useState('');
    const createVisibleSearch = useDebounce(createVisibleSearchVal, 300);

    const [editVisibleSearchVal, setEditVisibleSearchVal] = useState('');
    const editVisibleSearch = useDebounce(editVisibleSearchVal, 300);

    const [createSupervisorSearchVal, setCreateSupervisorSearchVal] = useState('');
    const createSupervisorSearch = useDebounce(createSupervisorSearchVal, 300);

    const [editSupervisorSearchVal, setEditSupervisorSearchVal] = useState('');
    const editSupervisorSearch = useDebounce(editSupervisorSearchVal, 300);

    const [newDiscussion, setNewDiscussion] = useState({
        discussion: '',
        status: 'inprogress',
        dueDate: '',
        supervisor: [],
        visibleToUserIds: [],
        project: ''
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit, setLimit] = useState(100);
    const [statusFilter, setStatusFilter] = useState('');
    const [projectFilter, setProjectFilter] = useState('');
    const [supervisorFilter, setSupervisorFilter] = useState('');
    const [sortField, setSortField] = useState(null); // 'dueDate' | 'createdAt' | null
    const [sortDirection, setSortDirection] = useState(null); // 'asc' | 'desc' | null
    const DISCUSSION_CACHE_TTL_MS = 30 * 1000;
    const SUPERVISOR_CACHE_TTL_MS = 60 * 1000;

    const fetchDiscussions = useCallback(async (page, options = {}) => {
        const force = options === true || !!options.force;
        const silent = typeof options === 'object' ? !!options.silent : false;

        const CACHE_KEY = `discussion_data_${user?._id}_p${page}_s${statusFilter}_pj${projectFilter}`;

        // 1. Initial Load from Cache
        if (!silent && !force) {
            const cached = readSessionCache(CACHE_KEY);
            if (cached) {
                const data = cached.data || cached;
                setDiscussions(data.discussions || []);
                setTotalPages(data.totalPages || 1);
                setCurrentPage(data.currentPage || page);
                setLoading(false);
                // Background refresh will continue even if cache is hit
            }
        }

        try {
            if (!silent && !readSessionCache(CACHE_KEY)) setLoading(true);
            const headers = {};
            if (force) {
                headers['Cache-Control'] = 'no-cache';
                headers['Pragma'] = 'no-cache';
            }
            const res = await api.get('/discussions/bootstrap', {
                params: {
                    page,
                    limit,
                    status: statusFilter || undefined,
                    project: projectFilter || undefined,
                    _t: force ? Date.now() : undefined
                },
                headers
            });
            const freshData = {
                discussions: res.data.discussions || [],
                supervisors: res.data.supervisors || [],
                totalPages: res.data.totalPages || 1,
                currentPage: res.data.currentPage || page
            };
            const newFingerprint = (freshData.discussions || []).map(d => `${d._id}-${d.status}-${d.discussion}-${d.dueDate}`).join('|');
            const cachedValue = readSessionCache(CACHE_KEY);
            const oldFingerprint = cachedValue?.fingerprint || '';

            if (newFingerprint !== oldFingerprint || force) {
                setDiscussions(freshData.discussions);
                setCurrentPage(freshData.currentPage);
                setTotalPages(freshData.totalPages);
                if (freshData.supervisors?.length > 0) setSupervisors(freshData.supervisors);

                // Minimal data for caching
                const minimalDiscussions = freshData.discussions.map(d => ({
                    _id: d._id,
                    discussion: d.discussion,
                    status: d.status,
                    dueDate: d.dueDate,
                    createdAt: d.createdAt,
                    createdBy: d.createdBy ? { _id: d.createdBy._id, firstName: d.createdBy.firstName, lastName: d.createdBy.lastName, profilePicture: d.createdBy.profilePicture } : null,
                    supervisor: Array.isArray(d.supervisor)
                        ? d.supervisor.map((s) => ({ _id: s._id, firstName: s.firstName, lastName: s.lastName, profilePicture: s.profilePicture }))
                        : [],
                    visibleToUsers: Array.isArray(d.visibleToUsers) ? d.visibleToUsers.map((u) => ({ _id: u._id, firstName: u.firstName, lastName: u.lastName, profilePicture: u.profilePicture })) : [],
                    project: d.project ? { _id: d.project._id, name: d.project.name } : null,
                    canEdit: d.canEdit,
                    canDelete: d.canDelete,
                    canChangeRestrictedStatus: d.canChangeRestrictedStatus,
                    canUpdateStatus: d.canUpdateStatus
                }));

                const payload = createCachePayload({
                    discussions: minimalDiscussions,
                    totalPages: freshData.totalPages,
                    currentPage: freshData.currentPage
                }, newFingerprint);

                sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));

                if (freshData.supervisors?.length > 0) {
                    const minimalSupervisors = freshData.supervisors.map(s => ({
                        _id: s._id,
                        firstName: s.firstName,
                        lastName: s.lastName
                    }));
                    const supervisorFingerprint = minimalSupervisors.map(s => s._id).join('|');
                    sessionStorage.setItem(
                        `supervisors_data_${user?._id}`,
                        JSON.stringify(createCachePayload(minimalSupervisors, supervisorFingerprint))
                    );
                }
            }
        } catch (error) {
            console.error(error);
            if (!silent) toast.error('Failed to load discussions');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [limit, user?._id, statusFilter, projectFilter]);

    const fetchSupervisors = useCallback(async () => {
        const SUPERVISOR_CACHE_KEY = `supervisors_data_${user?._id}`;

        // Load from cache first
        const cached = readSessionCache(SUPERVISOR_CACHE_KEY);
        if (cached) {
            setSupervisors(cached.data || cached);
            if (isCacheFresh(cached, SUPERVISOR_CACHE_TTL_MS)) return;
        }

        try {
            const res = await api.get('/discussions/supervisors');
            const freshData = res.data;

            const oldFingerprint = cached?.fingerprint || '';
            const newFingerprint = freshData.map(s => `${s._id}`).join('|');

            if (newFingerprint !== oldFingerprint) {
                setSupervisors(freshData);

                // Minimal data
                const minimalSupervisors = freshData.map(s => ({
                    _id: s._id,
                    firstName: s.firstName,
                    lastName: s.lastName
                }));

                sessionStorage.setItem(SUPERVISOR_CACHE_KEY, JSON.stringify(createCachePayload(minimalSupervisors, newFingerprint)));
            }
        } catch (error) {
            console.error('Error fetching supervisors:', error);
        }
    }, [SUPERVISOR_CACHE_TTL_MS, user?._id]);

    const fetchAssignedProjects = useCallback(async () => {
        try {
            const hasProjectRead = user?.permissions?.includes('project.read') || user?.permissions?.includes('*') || user?.roles?.some(role => ['Admin', 'Super Admin', 'System Admin'].includes(role));
            const params = {};
            if (!hasProjectRead) {
                params.assignedOnly = true;
            }
            const res = await api.get('/projects', { params });
            setProjects(res.data || []);
        } catch (error) {
            console.error('Error fetching assigned projects:', error);
        }
    }, [user]);

    useEffect(() => {
        fetchDiscussions(currentPage);
        if (currentPage === 1) {
            fetchSupervisors();
        }
    }, [currentPage, fetchDiscussions, fetchSupervisors]);

    useEffect(() => {
        fetchAssignedProjects();
    }, [fetchAssignedProjects]);

    const sortedDiscussions = useMemo(() => {
        let result = discussions;

        // Apply supervisor filter (client-side)
        if (supervisorFilter) {
            result = result.filter((d) => {
                const supArr = Array.isArray(d.supervisor) ? d.supervisor : (d.supervisor ? [d.supervisor] : []);
                return supArr.some((s) => (s?._id || s) === supervisorFilter);
            });
        }

        if (!sortField || !sortDirection) {
            return result;
        }

        return [...result].sort((a, b) => {
            const valA = a[sortField];
            const valB = b[sortField];
            
            const dateA = valA ? new Date(valA).getTime() : 0;
            const dateB = valB ? new Date(valB).getTime() : 0;

            if (sortDirection === 'asc') {
                return dateA - dateB;
            } else {
                return dateB - dateA;
            }
        });
    }, [discussions, sortField, sortDirection, supervisorFilter]);

    const handleSortClick = (field) => {
        if (sortField !== field) {
            setSortField(field);
            setSortDirection('asc');
        } else {
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortField(null);
                setSortDirection(null);
            }
        }
    };

    const renderSortArrow = (field) => {
        if (sortField !== field) {
            return <span className="text-slate-300 ml-1">↕</span>;
        }
        if (sortDirection === 'asc') {
            return <span className="text-indigo-600 ml-1">↑</span>;
        }
        if (sortDirection === 'desc') {
            return <span className="text-indigo-600 ml-1">↓</span>;
        }
        return null;
    };

    const handleClearAll = () => {
        setStatusFilter('');
        setProjectFilter('');
        setSupervisorFilter('');
        setSortField(null);
        setSortDirection(null);
        setCurrentPage(1);
    };

    // Close export menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
                setShowExportMenu(false);
            }
        };
        if (showExportMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showExportMenu]);

    useEffect(() => {
        const handlePointerDown = (event) => {
            const target = event.target;
            if (target.closest('[data-discussion-menu-trigger]') || target.closest('[data-discussion-menu]')) {
                return;
            }
            setActiveMenuId(null);
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setActiveMenuId(null);
                setDetailsDiscussion(null);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const resetCreateForm = () => {
        setNewDiscussion({
            discussion: '',
            status: 'inprogress',
            dueDate: '',
            supervisor: [],
            visibleToUserIds: [],
            project: ''
        });
        setCreateVisibleSearchVal('');
        setCreateSupervisorSearchVal('');
    };

    const handleExportExcel = async () => {
        try {
            setIsExporting(true);

            // If no dates selected, use current month
            let start = exportStartDate;
            let end = exportEndDate;

            if (!start || !end) {
                const now = new Date();
                start = format(startOfMonth(now), 'yyyy-MM-dd');
                end = format(endOfMonth(now), 'yyyy-MM-dd');
                // Optionally update state to show user what was used
                setExportStartDate(start);
                setExportEndDate(end);
            }

            // Fetch all discussions for the date range (using a large limit to get all)
            // Realistically, backend might need a specific export endpoint, but we'll use existing with large limit
            const res = await api.get(`/discussions?page=1&limit=1000`);
            let exportData = res.data.discussions || [];

            // Filter data by date range locally if backend doesn't support date filters on this endpoint yet
            exportData = exportData.filter(d => {
                if (!d.createdAt) return false;
                const createdDate = new Date(d.createdAt);
                const startDate = new Date(start);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(end);
                endDate.setHours(23, 59, 59, 999);
                return createdDate >= startDate && createdDate <= endDate;
            });

            if (exportData.length === 0) {
                toast.error('No discussions found in this date range');
                setIsExporting(false);
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Discussions');

            const formatPersonName = (person) =>
                [person?.firstName, person?.lastName].filter(Boolean).join(' ') || '';

            const formatVisibleUsers = (users) =>
                Array.isArray(users)
                    ? users.map((user) => formatPersonName(user)).filter(Boolean).join(', ')
                    : '';

            sheet.columns = [
                { header: 'S.No', key: 'slNo', width: 10 },
                { header: 'Description', key: 'description', width: 50 },
                { header: 'Created By', key: 'createdBy', width: 24 },
                { header: 'Supervisor', key: 'supervisor', width: 24 },
                { header: 'Visible To', key: 'visibleTo', width: 36 },
                { header: 'Project', key: 'project', width: 24 },
                { header: 'Created Date', key: 'createdDate', width: 20 },
                { header: 'Due Date', key: 'dueDate', width: 20 },
                { header: 'Status', key: 'status', width: 20 },
            ];

            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

            exportData.forEach((item, index) => {
                const row = sheet.addRow({
                    slNo: index + 1,
                    description: item.discussion || '-',
                    createdBy: formatPersonName(item.createdBy) || '-',
                    supervisor: formatPersonName(item.supervisor) || '-',
                    visibleTo: formatVisibleUsers(item.visibleToUsers) || '-',
                    project: item.project?.name || '-',
                    createdDate: item.createdAt ? format(new Date(item.createdAt), 'dd MMM yyyy') : '-',
                    dueDate: item.dueDate ? format(new Date(item.dueDate), 'dd MMM yyyy') : 'No due date',
                    status: item.status || '-',
                });

                const statusCell = row.getCell('status');
                const statusStr = (item.status || '').toLowerCase();

                // Set styles matching the UI badge colors
                if (statusStr === 'inprogress') {
                    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Amber-100
                    statusCell.font = { color: { argb: 'FFB45309' } }; // Amber-700
                } else if (statusStr === 'mark as complete') {
                    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Green-100
                    statusCell.font = { color: { argb: 'FF15803D' } }; // Green-700
                } else if (statusStr === 'on-hold') {
                    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // Slate-100
                    statusCell.font = { color: { argb: 'FF334155' } }; // Slate-700
                } else {
                    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; // Blue-100
                    statusCell.font = { color: { argb: 'FF1D4ED8' } }; // Blue-700
                }
            });

            sheet.getColumn('description').alignment = { wrapText: true, vertical: 'top' };
            sheet.getColumn('visibleTo').alignment = { wrapText: true, vertical: 'top' };

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Discussions_Export_${start}_to_${end}.xlsx`);
            toast.success('Excel downloaded successfully');
            setShowExportMenu(false);

        } catch (error) {
            console.error('Error exporting excel:', error);
            toast.error('Failed to export excel');
        } finally {
            setIsExporting(false);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        // Local state update for immediate feedback
        const updateState = (items) => {
            const updated = items.map(d => d._id === id ? { ...d, status: newStatus } : d);
            return updated.sort((a, b) => {
                const aCompleted = a.status === 'mark as complete';
                const bCompleted = b.status === 'mark as complete';
                if (aCompleted && !bCompleted) return 1;
                if (!aCompleted && bCompleted) return -1;
                return 0;
            });
        };

        setDiscussions(prev => updateState(prev));

        try {
            await api.put(`/discussions/${id}`, { status: newStatus });
            toast.success('Status updated');
            fetchDiscussions(currentPage, { silent: true, force: true }); // Sync cache and server state
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
            fetchDiscussions(currentPage, { force: true }); // Revert on failure
        }
    };

    const handleCreateInline = async () => {
        if (!newDiscussion.discussion) {
            toast.error('Description is required');
            return;
        }
        if (!newDiscussion.supervisor || !newDiscussion.supervisor.length) {
            toast.error('At least one supervisor is required');
            return;
        }
        if (!newDiscussion.visibleToUserIds.length) {
            toast.error('Choose at least one visible user');
            return;
        }
        try {
            setIsSaving(true);
            const payload = { ...newDiscussion, title: 'Discussion' }; // Setting default title since field is removed
            if (!payload.dueDate) delete payload.dueDate;

            const res = await api.post('/discussions', payload);
            toast.success('Discussion created');

            // Use the created discussion from response for instant update
            const createdDiscussion = res.data.discussion;
            if (createdDiscussion && currentPage === 1) {
                setDiscussions(prev => [createdDiscussion, ...prev].slice(0, limit));
            }

            fetchDiscussions(1, { silent: true, force: true }); // Sync list and cache

            setIsCreating(false);
            resetCreateForm();
        } catch (error) {
            console.error('Error creating discussion:', error);
            toast.error('Failed to create discussion');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditInline = (discussion) => {
        setIsCreating(false);
        setActiveMenuId(null);
        setEditingId(discussion._id);

        // Helper to extract a valid 24-char hex ObjectId string from a value
        const extractId = (v) => {
            if (!v) return null;
            if (typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v)) return v;
            if (typeof v === 'object') {
                const id = v._id || v.id;
                if (id && typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id)) return id;
            }
            return null;
        };

        const rawSupervisors = Array.isArray(discussion.supervisor)
            ? discussion.supervisor
            : (discussion.supervisor ? [discussion.supervisor] : []);
        const rawVisible = Array.isArray(discussion.visibleToUsers)
            ? discussion.visibleToUsers
            : [];

        setEditData({
            discussion: discussion.discussion,
            status: discussion.status,
            dueDate: discussion.dueDate ? discussion.dueDate.split('T')[0] : '',
            supervisor: rawSupervisors.map(extractId).filter(Boolean),
            visibleToUserIds: rawVisible.map(extractId).filter(Boolean),
            project: discussion.project?._id || discussion.project || ''
        });
        setEditVisibleSearchVal('');
        setEditSupervisorSearchVal('');
    };

    const handleUpdateInline = async (id) => {
        if (!editData.discussion) {
            toast.error('Description is required');
            return;
        }
        if (!editData.supervisor || !editData.supervisor.length) {
            toast.error('At least one supervisor is required');
            return;
        }
        if (!editData.visibleToUserIds?.length) {
            toast.error('Choose at least one visible user');
            return;
        }
        try {
            setIsSaving(true);
            // Sanitize: ensure supervisor and visibleToUserIds contain only valid 24-char hex strings
            const sanitizeIds = (arr) => {
                if (!Array.isArray(arr)) return [];
                return arr
                    .map((v) => {
                        if (typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v)) return v;
                        if (typeof v === 'object' && v !== null) {
                            const id = v._id || v.id;
                            if (id && typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id)) return id;
                        }
                        return null;
                    })
                    .filter(Boolean);
            };
            const payload = {
                ...editData,
                supervisor: sanitizeIds(editData.supervisor),
                visibleToUserIds: sanitizeIds(editData.visibleToUserIds),
            };
            delete payload.status;
            if (!payload.dueDate) delete payload.dueDate;

            const res = await api.put(`/discussions/${id}`, payload);
            toast.success('Discussion updated');

            // Update local state using API response and sort
            const updatedFromApi = res.data.discussion;
            setDiscussions(prev => {
                const updated = prev.map(d => d._id === id ? { ...d, ...(updatedFromApi || payload) } : d);
                return updated.sort((a, b) => {
                    const aCompleted = a.status === 'mark as complete';
                    const bCompleted = b.status === 'mark as complete';
                    if (aCompleted && !bCompleted) return 1;
                    if (!aCompleted && bCompleted) return -1;
                    return 0;
                });
            });

            fetchDiscussions(currentPage, { silent: true, force: true }); // Background fetch to update cache

            setEditingId(null);
            setEditData(null);
            setEditVisibleSearchVal('');
        } catch (error) {
            console.error('Error updating discussion:', error);
            toast.error('Failed to update discussion');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this discussion?')) {
            // Optimistic update
            setDiscussions(prev => prev.filter(d => d._id !== id));

            try {
                await api.delete(`/discussions/${id}`);
                toast.success('Discussion deleted');
                fetchDiscussions(currentPage, { silent: true, force: true }); // Re-sync and pull in next page item if needed
            } catch (error) {
                console.error('Error deleting discussion:', error);
                toast.error('Failed to delete discussion');
                fetchDiscussions(currentPage, { force: true }); // Revert on failure
            }
        }
    };

    const getStatusBadgeColor = (status) => {
        const styles = {
            'inprogress': 'bg-amber-100 text-amber-700 border-amber-200',
            'mark as complete': 'bg-green-100 text-green-700 border-green-200',
            'on-hold': 'bg-slate-100 text-slate-700 border-slate-200',
            'planning': 'bg-sky-100 text-sky-700 border-sky-200'
        };
        return styles[status] || 'bg-blue-100 text-blue-700 border-blue-200';
    };

    const canChangeRestrictedStatus = (discussion) => {
        if (discussion?.canChangeRestrictedStatus !== undefined) {
            return discussion.canChangeRestrictedStatus;
        }
        const supervisors = Array.isArray(discussion?.supervisor)
            ? discussion.supervisor
            : (discussion?.supervisor ? [discussion.supervisor] : []);
        return supervisors.some((s) => (s?._id || s) === user?._id);
    };

    const canUpdateStatus = (discussion) => (
        discussion?.canUpdateStatus ?? canChangeRestrictedStatus(discussion)
    );

    const getUserDisplayName = (person) => (
        [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'Not assigned'
    );

    const getUserInitials = (person) => (
        `${person?.firstName?.[0] || ''}${person?.lastName?.[0] || ''}`.toUpperCase() || 'NA'
    );

    const toggleDiscussionMenu = (discussionId) => {
        setActiveMenuId(prev => prev === discussionId ? null : discussionId);
    };

    const openDiscussionDetails = (discussion) => {
        setDetailsDiscussion(discussion);
        setActiveMenuId(null);
    };

    const handleCreateButtonClick = () => {
        setEditingId(null);
        setEditData(null);
        setEditVisibleSearchVal('');
        setEditSupervisorSearchVal('');
        setIsCreating(true);
        setActiveMenuId(null);
    };

    const handleCancelForm = () => {
        setIsCreating(false);
        setEditingId(null);
        setEditData(null);
        setEditVisibleSearchVal('');
        setEditSupervisorSearchVal('');
        resetCreateForm();
    };

    const getFilteredUsers = (searchTerm) => {
        const query = (searchTerm || '').trim().toLowerCase();
        if (!query) return supervisors;
        return supervisors.filter((supervisor) => (
            `${supervisor.firstName || ''} ${supervisor.lastName || ''}`.toLowerCase().includes(query)
        ));
    };

    const handleVisibleUserToggle = (setter, selectedIds, userId) => {
        const nextIds = selectedIds.includes(userId)
            ? selectedIds.filter((id) => id !== userId)
            : [...selectedIds, userId];

        setter(nextIds);
    };

    const handleSupervisorToggle = (setter, selectedSupervisorIds, visibleSetter, selectedVisibleIds, userId) => {
        const isAdding = !selectedSupervisorIds.includes(userId);
        
        // 1. Update supervisors array
        const nextSupervisorIds = isAdding
            ? [...selectedSupervisorIds, userId]
            : selectedSupervisorIds.filter((id) => id !== userId);
        setter(nextSupervisorIds);

        // 2. If adding, automatically add to visibleToUserIds
        if (isAdding && !selectedVisibleIds.includes(userId)) {
            visibleSetter([...selectedVisibleIds, userId]);
        }
    };

    const renderUserPicker = ({ selectedIds, onToggle, searchValue, onSearchChange, debouncedSearchValue, placeholder = "Search users", subtitle = "" }) => {
        const filteredUsers = getFilteredUsers(debouncedSearchValue);

        return (
            <div className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 p-3 space-y-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchValue}
                            onChange={(event) => onSearchChange(event.target.value)}
                            placeholder={placeholder}
                            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                        />
                    </div>
                    <p className="text-xs text-slate-500">
                        {selectedIds.length ? `${selectedIds.length} selected` : subtitle}
                    </p>
                </div>
                <div className="h-52 overflow-y-auto p-2">
                    {filteredUsers.length === 0 ? (
                        <div className="px-3 py-6 text-center text-sm text-slate-400">No users found</div>
                    ) : (
                        filteredUsers.map((u) => {
                            const checked = selectedIds.includes(u._id);

                            return (
                                <label
                                    key={u._id}
                                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors ${checked ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => onToggle(u._id)}
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{getUserDisplayName(u)}</p>
                                    </div>
                                </label>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };

    const renderDiscussionForm = (isEdit = false) => {
        return (
            <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 ${isEdit ? 'my-2 bg-slate-50/50' : 'mb-6'}`}>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">
                                {isEdit ? 'Edit Discussion' : 'Create Discussion'}
                            </h2>
                            <p className="text-sm text-slate-500">
                                Choose supervisors and select visible users from the searchable lists.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleCancelForm}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2 lg:col-span-2">
                            <label className="text-sm font-medium text-slate-700">Description</label>
                            <textarea
                                rows={4}
                                value={isEdit ? editData?.discussion || '' : newDiscussion.discussion}
                                onChange={(event) => isEdit
                                    ? setEditData({ ...editData, discussion: event.target.value })
                                    : setNewDiscussion({ ...newDiscussion, discussion: event.target.value })}
                                placeholder="Enter full discussion details"
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Due Date</label>
                            <input
                                type="date"
                                value={isEdit ? editData?.dueDate || '' : newDiscussion.dueDate}
                                onChange={(event) => isEdit
                                    ? setEditData({ ...editData, dueDate: event.target.value })
                                    : setNewDiscussion({ ...newDiscussion, dueDate: event.target.value })}
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Status</label>
                            <select
                                disabled={isEdit}
                                value={isEdit ? editData?.status || 'inprogress' : newDiscussion.status}
                                onChange={(event) => isEdit
                                    ? setEditData({ ...editData, status: event.target.value })
                                    : setNewDiscussion({ ...newDiscussion, status: event.target.value })}
                                className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 ${isEdit ? 'bg-slate-50 cursor-not-allowed text-slate-500 border-slate-200' : getStatusBadgeColor(isEdit ? editData?.status : newDiscussion.status)}`}
                            >
                                <option value="inprogress">In Progress</option>
                                <option value="planning">Planning</option>
                                <option value="on-hold">On-hold</option>
                                <option value="mark as complete">Mark as complete</option>
                            </select>
                        </div>

                        <div className="space-y-2 lg:col-span-2">
                            <label className="text-sm font-medium text-slate-700 font-semibold text-slate-800">Project</label>
                            <select
                                value={isEdit ? editData?.project || '' : newDiscussion.project}
                                onChange={(event) => isEdit
                                    ? setEditData({ ...editData, project: event.target.value })
                                    : setNewDiscussion({ ...newDiscussion, project: event.target.value })}
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                            >
                                <option value="">Select Project</option>
                                {projects.map((project) => (
                                    <option key={project._id} value={project._id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 font-semibold text-slate-800">Supervisors</label>
                            {isEdit ? renderUserPicker({
                                selectedIds: editData?.supervisor || [],
                                onToggle: (userId) => handleSupervisorToggle(
                                    (nextIds) => setEditData((prev) => ({ ...prev, supervisor: nextIds })),
                                    editData?.supervisor || [],
                                    (nextVisible) => setEditData((prev) => ({ ...prev, visibleToUserIds: nextVisible })),
                                    editData?.visibleToUserIds || [],
                                    userId
                                ),
                                searchValue: editSupervisorSearchVal,
                                onSearchChange: setEditSupervisorSearchVal,
                                debouncedSearchValue: editSupervisorSearch,
                                placeholder: "Search supervisors",
                                subtitle: "Choose supervisors for this discussion"
                            }) : renderUserPicker({
                                selectedIds: newDiscussion.supervisor || [],
                                onToggle: (userId) => handleSupervisorToggle(
                                    (nextIds) => setNewDiscussion((prev) => ({ ...prev, supervisor: nextIds })),
                                    newDiscussion.supervisor || [],
                                    (nextVisible) => setNewDiscussion((prev) => ({ ...prev, visibleToUserIds: nextVisible })),
                                    newDiscussion.visibleToUserIds || [],
                                    userId
                                ),
                                searchValue: createSupervisorSearchVal,
                                onSearchChange: setCreateSupervisorSearchVal,
                                debouncedSearchValue: createSupervisorSearch,
                                placeholder: "Search supervisors",
                                subtitle: "Choose supervisors for this discussion"
                            })}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 font-semibold text-slate-800">Visible To</label>
                            {isEdit ? renderUserPicker({
                                selectedIds: editData?.visibleToUserIds || [],
                                onToggle: (userId) => handleVisibleUserToggle(
                                    (nextIds) => setEditData((prev) => ({ ...prev, visibleToUserIds: nextIds })),
                                    editData?.visibleToUserIds || [],
                                    userId
                                ),
                                searchValue: editVisibleSearchVal,
                                onSearchChange: setEditVisibleSearchVal,
                                debouncedSearchValue: editVisibleSearch,
                                placeholder: "Search users",
                                subtitle: "Choose who can view this discussion"
                            }) : renderUserPicker({
                                selectedIds: newDiscussion.visibleToUserIds || [],
                                onToggle: (userId) => handleVisibleUserToggle(
                                    (nextIds) => setNewDiscussion((prev) => ({ ...prev, visibleToUserIds: nextIds })),
                                    newDiscussion.visibleToUserIds || [],
                                    userId
                                ),
                                searchValue: createVisibleSearchVal,
                                onSearchChange: setCreateVisibleSearchVal,
                                debouncedSearchValue: createVisibleSearch,
                                placeholder: "Search users",
                                subtitle: "Choose who can view this discussion"
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={handleCancelForm}
                            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => isEdit ? handleUpdateInline(editingId) : handleCreateInline()}
                            disabled={isSaving}
                            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Discussion'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderActionMenu = (discussion, index, align = 'right') => {
        const hasActions = discussion?.canEdit || discussion?.canDelete || discussion?.discussion;

        if (!hasActions) return null;

        const alignmentClass = align === 'left' ? 'left-0' : 'right-0';

        return (
            <div className="relative">
                <button
                    type="button"
                    data-discussion-menu-trigger
                    onClick={() => toggleDiscussionMenu(discussion._id)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700"
                >
                    <MoreVertical size={18} />
                </button>
                {activeMenuId === discussion._id && (
                    <div
                        data-discussion-menu
                        className={`absolute ${alignmentClass} top-12 z-30 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl`}
                    >
                        <button
                            type="button"
                            onClick={() => openDiscussionDetails(discussion)}
                            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            View Details
                        </button>
                        {discussion.canEdit && (
                            <button
                                type="button"
                                onClick={() => handleEditInline(discussion)}
                                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                Edit
                            </button>
                        )}
                        {discussion.canDelete && (
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveMenuId(null);
                                    handleDelete(discussion._id);
                                }}
                                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const truncateDescription = (text, limit = 40) => {
        if (!text) return '';
        return text.length > limit ? `${text.substring(0, limit)}...` : text;
    };

    if (loading && discussions.length === 0) return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-6">
                <Skeleton className="h-8 w-48 mb-2" />
                <div className="bg-white rounded-xl shadow-sm overflow-hidden p-6 border border-slate-200">
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

                {/* View Toggle */}
                <div className="flex justify-center mb-8">
                    <div className="inline-flex bg-slate-200/70 p-1 rounded-lg">
                        <button
                            onClick={() => navigate('/meetings')}
                            className="px-6 py-2 text-sm font-medium rounded-md transition-all text-slate-600 hover:text-slate-800"
                        >
                            Meetings
                        </button>
                        <button
                            onClick={() => navigate('/discussions')}
                            className="px-6 py-2 text-sm font-medium rounded-md transition-all shadow-sm bg-white text-slate-800"
                        >
                            Discussions
                        </button>
                    </div>
                </div>

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <MessageSquare className="text-indigo-600" /> Discussions
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Create and manage private discussions with specific users.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-3 sm:mt-0 items-center">
                        <div className="relative" ref={exportMenuRef}>
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm w-full sm:w-auto"
                            >
                                <Download size={18} />
                                <span>Export Data</span>
                            </button>

                            {/* Export Dropdown Menu */}
                            {showExportMenu && (
                                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                            <Download size={16} className="text-emerald-600" />
                                            Export to Excel
                                        </h3>
                                        <button
                                            onClick={() => setShowExportMenu(false)}
                                            className="text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Start Date</label>
                                                <input
                                                    type="date"
                                                    value={exportStartDate}
                                                    onChange={(e) => setExportStartDate(e.target.value)}
                                                    className="w-full text-xs py-1.5 px-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-slate-700"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">End Date</label>
                                                <input
                                                    type="date"
                                                    value={exportEndDate}
                                                    onChange={(e) => setExportEndDate(e.target.value)}
                                                    className="w-full text-xs py-1.5 px-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-slate-700"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-tight">
                                            Leave dates empty to export all discussions from the current month.
                                        </p>
                                        <button
                                            onClick={handleExportExcel}
                                            disabled={isExporting}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors mt-2"
                                        >
                                            {isExporting ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
                                            Download Excel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleCreateButtonClick}
                            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm w-full sm:w-auto"
                        >
                            <Plus size={18} />
                            <span>Create Discussion</span>
                        </button>
                    </div>
                </div>

                {isCreating && renderDiscussionForm(false)}

                {/* List View */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">

                    {/* Filters Bar */}
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50 rounded-t-xl">
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <div className="flex flex-col gap-1 min-w-[150px] w-full sm:w-auto">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer font-medium text-slate-700"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="inprogress">In Progress</option>
                                    <option value="planning">Planning</option>
                                    <option value="on-hold">On-hold</option>
                                    <option value="mark as complete">Mark as complete</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1 min-w-[180px] w-full sm:w-auto">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project</label>
                                <select
                                    value={projectFilter}
                                    onChange={(e) => {
                                        setProjectFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer font-medium text-slate-700 w-full"
                                >
                                    <option value="">All Projects</option>
                                    <option value="null">No Project</option>
                                    {projects.map((project) => (
                                        <option key={project._id} value={project._id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1 min-w-[190px] w-full sm:w-auto">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supervisor</label>
                                <select
                                    id="supervisor-filter"
                                    value={supervisorFilter}
                                    onChange={(e) => setSupervisorFilter(e.target.value)}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer font-medium text-slate-700 w-full"
                                >
                                    <option value="">All Supervisors</option>
                                    {supervisors.map((sup) => (
                                        <option key={sup._id} value={sup._id}>
                                            {[sup.firstName, sup.lastName].filter(Boolean).join(' ')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {(statusFilter || projectFilter || supervisorFilter || sortField) && (
                            <button
                                onClick={handleClearAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer self-start sm:self-center"
                            >
                                <X size={14} />
                                <span>Clear Filters</span>
                            </button>
                        )}
                    </div>


                    {/* ── Mobile card list (hidden on md+) ── */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {loading ? (
                            <div className="flex justify-center py-10"><Skeleton className="h-8 w-8 rounded-full" /></div>
                        ) : discussions.length === 0 && !isCreating ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <MessageSquare size={48} className="text-slate-200 mb-4" />
                                <p className="text-base font-medium text-slate-600">No discussions found</p>
                                <p className="text-sm">Start a new discussion.</p>
                            </div>
                        ) : (
                            sortedDiscussions.map((discussion, index) => (
                                <React.Fragment key={discussion._id}>
                                    <div className="p-4 space-y-2 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <span className="text-xs font-semibold text-slate-400 mr-1">#{(currentPage - 1) * limit + index + 1}</span>
                                                <span className="text-sm text-slate-700 break-words leading-relaxed">
                                                    {truncateDescription(discussion.discussion, 40)}
                                                </span>
                                            </div>
                                            {renderActionMenu(discussion, index, 'right')}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <select
                                                value={discussion.status}
                                                onChange={(e) => handleStatusChange(discussion._id, e.target.value)}
                                                disabled={!canUpdateStatus(discussion)}
                                                className={`px-2.5 py-1 text-xs font-semibold rounded-full border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${getStatusBadgeColor(discussion.status)} ${canUpdateStatus(discussion) ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                                            >
                                                <option value="inprogress">In Progress</option>
                                                <option value="planning" disabled={!canChangeRestrictedStatus(discussion)}>Planning {!canChangeRestrictedStatus(discussion) && '(Authorized Only)'}</option>
                                                <option value="on-hold" disabled={!canChangeRestrictedStatus(discussion)}>On-hold {!canChangeRestrictedStatus(discussion) && '(Authorized Only)'}</option>
                                                <option value="mark as complete" disabled={!canChangeRestrictedStatus(discussion)}>Mark as complete {!canChangeRestrictedStatus(discussion) && '(Authorized Only)'}</option>
                                            </select>
                                            {discussion.project && (
                                                <span className="px-2 py-0.5 text-xs font-medium bg-slate-200/80 text-slate-700 rounded border border-slate-300 truncate max-w-[150px]">
                                                    {discussion.project.name}
                                                </span>
                                            )}
                                            {discussion.dueDate ? (
                                                <div className="flex items-center text-slate-500 text-xs">
                                                    <Calendar size={12} className="mr-1 text-slate-400" />
                                                    Due: {format(new Date(discussion.dueDate), 'dd MMM yyyy')}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic">No due date</span>
                                            )}
                                            <div className="flex items-center text-slate-500 text-xs">
                                                <span className="mr-1 text-slate-400">Created:</span>
                                                {discussion.createdAt ? format(new Date(discussion.createdAt), 'dd MMM yyyy') : '-'}
                                            </div>
                                        </div>
                                    </div>
                                    {editingId === discussion._id && (
                                        <div className="px-4 pb-4">
                                            {renderDiscussionForm(true)}
                                        </div>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </div>

                    {/* ── Desktop table (hidden below md) ── */}
                    <div className="hidden md:block overflow-visible">
                        <table className="min-w-full text-sm table-fixed">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 w-[6%]">S.No</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 w-[34%]">Description</th>
                                    <th 
                                        className="px-6 py-4 text-left font-semibold text-slate-600 w-[13%] cursor-pointer hover:bg-slate-100/50 select-none transition-colors"
                                        onClick={() => handleSortClick('createdAt')}
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Created Date</span>
                                            {renderSortArrow('createdAt')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-4 text-left font-semibold text-slate-600 w-[13%] cursor-pointer hover:bg-slate-100/50 select-none transition-colors"
                                        onClick={() => handleSortClick('dueDate')}
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Due Date</span>
                                            {renderSortArrow('dueDate')}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 w-[13%]">Project</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 w-[13%]">Status</th>
                                    <th className="px-6 py-4 text-right font-semibold text-slate-600 w-[8%]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan="7" className="px-6 py-8">
                                        <div className="flex justify-center"><Skeleton className="h-8 w-8 rounded-full" /></div>
                                    </td></tr>
                                ) : discussions.length === 0 && !isCreating ? (
                                    <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-500 font-medium">
                                        <div className="flex flex-col items-center justify-center">
                                            <MessageSquare size={48} className="text-slate-200 mb-4" />
                                            <p className="text-lg font-medium text-slate-600">No discussions found</p>
                                            <p className="text-sm">Start a new discussion algorithmically or manually.</p>
                                        </div>
                                    </td></tr>
                                ) : (
                                    sortedDiscussions.map((discussion, index) => (
                                        <React.Fragment key={discussion._id}>
                                            <tr className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4 text-sm font-medium text-slate-500">{(currentPage - 1) * limit + index + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-between gap-2 max-w-xl text-sm text-slate-600 leading-relaxed min-w-0">
                                                        <div className="break-all whitespace-pre-wrap min-w-0">
                                                            {expandedRows[discussion._id]
                                                                ? discussion.discussion
                                                                : truncateDescription(discussion.discussion, 40)}
                                                        </div>
                                                        {discussion.discussion?.length > 40 && (
                                                            <button
                                                                onClick={() => toggleRowExpanded(discussion._id)}
                                                                className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100 cursor-pointer flex-shrink-0"
                                                                title={expandedRows[discussion._id] ? "Show less" : "Show more"}
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-700 text-sm whitespace-nowrap">
                                                    {discussion.createdAt ? format(new Date(discussion.createdAt), 'dd MMM yyyy') : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {discussion.dueDate ? (
                                                        <div className="flex items-center text-slate-700 whitespace-nowrap text-sm">
                                                            <Calendar size={14} className="mr-1.5 text-slate-400" />
                                                            {format(new Date(discussion.dueDate), 'dd MMM yyyy')}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs italic">No due date</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-slate-700 text-sm break-all whitespace-normal">
                                                    {discussion.project?.name || <span className="text-slate-400 italic">No Project</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select value={discussion.status}
                                                        onChange={(e) => handleStatusChange(discussion._id, e.target.value)}
                                                        disabled={!canUpdateStatus(discussion)}
                                                        className={`px-2.5 py-1 text-xs font-semibold rounded-full border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-32 truncate ${getStatusBadgeColor(discussion.status)} ${canUpdateStatus(discussion) ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
                                                        <option value="inprogress">In Progress</option>
                                                        <option value="planning" disabled={!canChangeRestrictedStatus(discussion)}>Planning {!canChangeRestrictedStatus(discussion) && '(Authorized Only)'}</option>
                                                        <option value="on-hold" disabled={!canChangeRestrictedStatus(discussion)}>On-hold {!canChangeRestrictedStatus(discussion) && '(Authorized Only)'}</option>
                                                        <option value="mark as complete" disabled={!canChangeRestrictedStatus(discussion)}>Mark as complete {!canChangeRestrictedStatus(discussion) && '(Authorized Only)'}</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end">
                                                        {renderActionMenu(discussion, index, 'right')}
                                                    </div>
                                                </td>
                                            </tr>
                                            {editingId === discussion._id && (
                                                <tr>
                                                    <td colSpan="7" className="px-6 py-4 bg-slate-50/30">
                                                        {renderDiscussionForm(true)}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {discussions.length > 0 && (
                        <div className="px-4 sm:px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-4 flex-wrap">
                                <p className="text-sm text-slate-500">
                                    Page <span className="font-medium text-slate-700">{currentPage}</span> of <span className="font-medium text-slate-700">{totalPages}</span>
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-500">Show:</span>
                                    <select
                                        value={limit}
                                        onChange={(e) => {
                                            const newLimit = parseInt(e.target.value, 10);
                                            setLimit(newLimit);
                                            setCurrentPage(1);
                                        }}
                                        className="text-sm border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    >
                                        <option value={100}>100 entries</option>
                                        <option value={150}>150 entries</option>
                                        <option value={200}>200 entries</option>
                                    </select>
                                </div>
                            </div>
                            {totalPages > 1 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1 || loading}
                                        className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {[...Array(totalPages)].map((_, i) => (
                                            <button key={i} onClick={() => setCurrentPage(i + 1)} disabled={loading}
                                                className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${currentPage === i + 1 ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages || loading}
                                        className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {detailsDiscussion && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
                            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-800">Discussion Details</h2>
                                    <p className="mt-1 text-sm text-slate-500">Full discussion information for this record.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDetailsDiscussion(null)}
                                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="max-h-[80vh] overflow-y-auto px-5 py-5 sm:px-6">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                                        <p className="mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-slate-700">
                                            {detailsDiscussion.status === 'inprogress' ? 'In Progress' :
                                                detailsDiscussion.status === 'planning' ? 'Planning' :
                                                    detailsDiscussion.status === 'on-hold' ? 'On Hold' :
                                                        detailsDiscussion.status === 'mark as complete' ? 'Mark as complete' :
                                                            detailsDiscussion.status}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project</p>
                                        <p className="mt-2 text-sm font-medium text-slate-700">
                                            {detailsDiscussion.project?.name || 'No Project'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created Date</p>
                                        <p className="mt-2 text-sm font-medium text-slate-700">
                                            {detailsDiscussion.createdAt ? format(new Date(detailsDiscussion.createdAt), 'dd MMM yyyy') : '-'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Due Date</p>
                                        <p className="mt-2 text-sm font-medium text-slate-700">
                                            {detailsDiscussion.dueDate ? format(new Date(detailsDiscussion.dueDate), 'dd MMM yyyy') : 'No due date'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created By</p>
                                        <p className="mt-2 text-sm font-medium text-slate-700">
                                            {detailsDiscussion.createdBy ? getUserDisplayName(detailsDiscussion.createdBy) : 'Not available'}
                                        </p>
                                    </div>
                                    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
                                        <div className="mt-2 max-w-full overflow-hidden rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                                            <p className="whitespace-pre-wrap break-all text-sm leading-6 text-slate-700">
                                                {detailsDiscussion.discussion || '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supervisors</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {(() => {
                                                const supervisorsArray = Array.isArray(detailsDiscussion.supervisor)
                                                    ? detailsDiscussion.supervisor
                                                    : (detailsDiscussion.supervisor ? [detailsDiscussion.supervisor] : []);
                                                
                                                return supervisorsArray.length > 0 ? (
                                                    supervisorsArray.map((sup) => (
                                                        <div key={sup._id || sup} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                                                            {sup.profilePicture ? (
                                                                <img src={sup.profilePicture} alt="" className="h-5 w-5 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">
                                                                    {getUserInitials(sup)}
                                                                </div>
                                                            )}
                                                            <span>{getUserDisplayName(sup)}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-sm italic text-slate-400">No supervisors</span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visible To</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {(detailsDiscussion.visibleToUsers || []).length > 0 ? (
                                                detailsDiscussion.visibleToUsers.map((visibleUser) => (
                                                    <span key={visibleUser._id || visibleUser} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                                                        {getUserDisplayName(visibleUser)}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-sm italic text-slate-400">No users selected</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Discussions;
