import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import api from '@/lib/apiClient';
import { Briefcase, Plus, Search, Building, MoreVertical, Edit2, Trash2, XCircle, CheckCircle, PauseCircle, X, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import { createCachePayload, isCacheFresh, readSessionCache } from '@/lib/cache';

import { useAuth } from '@/features/auth/context/AuthContext';

const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return '-';
    }
};

const getInitials = (first, last) => {
    const f = (first || '').charAt(0).toUpperCase();
    const l = (last || '').charAt(0).toUpperCase();
    return `${f}${l}` || 'U';
};

const Projects = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const canCreate = user?.roles?.includes('Admin') || user?.permissions?.includes('project.create');
    const canUpdate = user?.roles?.includes('Admin') || user?.permissions?.includes('project.update');
    const [projects, setProjects] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null); // stores the id of the project being acted on
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        client: '',
        businessUnit: '',
        category: '',
        estimatedHours: '',
        description: '',
        status: 'Active',
        hasModules: true,
        startDate: '',
        dueDate: '',
        members: []
    });
    const initialFetchDoneRef = useRef(false);
    const PROJECT_CACHE_TTL_MS = 30 * 1000;
    const cacheKey = `project_data_${user?._id}`;
    const [employees, setEmployees] = useState([]);
    const [businessUnits, setBusinessUnits] = useState([]);
    const [memberSearchTerm, setMemberSearchTerm] = useState('');

    const [searchParams, setSearchParams] = useSearchParams();
    const rawTabParam = searchParams.get('tab') || searchParams.get('status');
    const validTabs = ['all', 'active', 'inactive', 'on hold', 'completed'];
    const normalizeTab = (t) => {
        if (!t) return 'active';
        const lower = String(t).trim().toLowerCase();
        return lower === 'on-hold' ? 'on hold' : lower;
    };

    const resolvedInitialTab = validTabs.includes(normalizeTab(rawTabParam))
        ? normalizeTab(rawTabParam)
        : 'active';

    const [activeTab, setActiveTab] = useState(resolvedInitialTab);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const raw = searchParams.get('tab') || searchParams.get('status');
        const normalized = normalizeTab(raw);
        if (validTabs.includes(normalized) && normalized !== activeTab) {
            setActiveTab(normalized);
        }
    }, [searchParams]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', tabId === 'on hold' ? 'on-hold' : tabId);
        newParams.delete('status');
        setSearchParams(newParams, { replace: true });
    };

    const getProjectDisplayStatus = useCallback((proj) => {
        if (proj?.status) {
            const s = String(proj.status).trim().toLowerCase();
            if (s === 'active') return 'Active';
            if (s === 'inactive') return 'Inactive';
            if (s === 'on hold' || s === 'onhold' || s === 'hold') return 'On Hold';
            if (s === 'completed' || s === 'complete' || s === 'closed') return 'Completed';
            return proj.status;
        }
        return proj?.isActive ? 'Active' : 'Completed';
    }, []);

    const counts = useMemo(() => {
        const res = { all: projects.length, active: 0, inactive: 0, onHold: 0, completed: 0 };
        projects.forEach(p => {
            const st = getProjectDisplayStatus(p);
            if (st === 'Active') res.active++;
            else if (st === 'Inactive') res.inactive++;
            else if (st === 'On Hold') res.onHold++;
            else if (st === 'Completed') res.completed++;
        });
        return res;
    }, [projects, getProjectDisplayStatus]);

    const tabs = [
        { id: 'all', label: 'All', count: counts.all },
        { id: 'active', label: 'Active', count: counts.active },
        { id: 'inactive', label: 'Inactive', count: counts.inactive },
        { id: 'on hold', label: 'On Hold', count: counts.onHold },
        { id: 'completed', label: 'Completed', count: counts.completed }
    ];

    const filteredProjects = useMemo(() => {
        return projects.filter(project => {
            const st = getProjectDisplayStatus(project);
            if (activeTab !== 'all') {
                if (st.toLowerCase() !== activeTab.toLowerCase()) {
                    return false;
                }
            }

            if (searchTerm.trim()) {
                const q = searchTerm.trim().toLowerCase();
                const name = String(project.name || '').toLowerCase();
                const category = String(project.category || project.businessUnit?.name || '').toLowerCase();
                const clientName = String(project.client?.name || '').toLowerCase();
                const buName = String(project.businessUnit?.name || '').toLowerCase();
                const desc = String(project.description || '').toLowerCase();

                const matches = name.includes(q) || category.includes(q) || clientName.includes(q) || buName.includes(q) || desc.includes(q);
                if (!matches) return false;
            }

            return true;
        });
    }, [projects, activeTab, searchTerm, getProjectDisplayStatus]);

    const filteredEmployees = useMemo(() => {
        if (!memberSearchTerm.trim()) return employees;
        const q = memberSearchTerm.trim().toLowerCase();
        return employees.filter(emp => {
            const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
            const email = String(emp.email || '').toLowerCase();
            return fullName.includes(q) || email.includes(q);
        });
    }, [employees, memberSearchTerm]);

    const fetchData = useCallback(async ({ force = false } = {}) => {
        try {
            const cachedData = readSessionCache(cacheKey);

            if (cachedData) {
                const data = cachedData.data || cachedData;
                setProjects(data.projects || []);
                setClients(data.clients || []);
                setEmployees(data.employees || []);
                setBusinessUnits(data.businessUnits || []);
                setLoading(false);
                if (!force && isCacheFresh(cachedData, PROJECT_CACHE_TTL_MS)) return;
            }

            const config = force ? {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                params: {
                    _t: Date.now()
                }
            } : undefined;
            const bootstrapRes = await api.get('/projects/bootstrap', config);
            const projData = bootstrapRes.data?.projects || [];
            const clientsData = bootstrapRes.data?.clients || [];
            const employeesData = bootstrapRes.data?.employees || [];
            const buData = bootstrapRes.data?.businessUnits || [];

            const newFingerprint = JSON.stringify({ p: projData.length, c: clientsData.length, e: employeesData.length, bu: buData.length, lp: projData[0]?._id });
            const oldFingerprint = cachedData?.fingerprint || null;

            setProjects(projData);
            setClients(clientsData);
            setEmployees(employeesData);
            setBusinessUnits(buData);

            if (newFingerprint !== oldFingerprint || force) {
                const minimalProjects = projData.map(p => ({
                    _id: p._id,
                    name: p.name,
                    status: p.status,
                    isActive: p.isActive,
                    hasModules: p.hasModules !== false,
                    description: p.description,
                    startDate: p.startDate,
                    dueDate: p.dueDate,
                    client: p.client ? { _id: p.client._id, name: p.client.name } : null,
                    businessUnit: p.businessUnit ? { _id: p.businessUnit._id, name: p.businessUnit.name } : null,
                    members: p.members?.map(m => ({ _id: m._id }))
                }));

                const minimalClients = clientsData.map(c => ({ _id: c._id, name: c.name }));
                const minimalBusinessUnits = buData.map(b => ({ _id: b._id, name: b.name }));
                const minimalEmployees = employeesData.map(employee => ({
                    _id: employee._id,
                    firstName: employee.firstName,
                    lastName: employee.lastName,
                    email: employee.email
                }));

                const payload = createCachePayload({
                    projects: minimalProjects,
                    clients: minimalClients,
                    businessUnits: minimalBusinessUnits,
                    employees: minimalEmployees
                }, newFingerprint);

                sessionStorage.setItem(cacheKey, JSON.stringify(payload));
            }

        } catch (error) {
            console.error(error);
            toast.error('Failed to load projects');
        } finally {
            setLoading(false);
        }
    }, [PROJECT_CACHE_TTL_MS, cacheKey]);

    useEffect(() => {
        if (initialFetchDoneRef.current) return;
        initialFetchDoneRef.current = true;
        fetchData();
    }, [fetchData]);

    const [editingId, setEditingId] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openMenuId && menuRef.current && !menuRef.current.contains(event.target) && !event.target.closest('.action-menu-trigger')) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openMenuId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            // Prepare payload: Convert empty strings to null for ObjectId/Date fields
            const payload = { ...formData };
            if (!payload.client) payload.client = null;
            if (!payload.businessUnit) payload.businessUnit = null;
            if (!payload.startDate) payload.startDate = null;
            if (!payload.dueDate) payload.dueDate = null;
            payload.category = payload.category ? String(payload.category).trim() : '';
            payload.estimatedHours = (payload.estimatedHours !== '' && payload.estimatedHours !== null && !isNaN(payload.estimatedHours))
                ? Number(payload.estimatedHours)
                : 0;

            if (editingId) {
                await api.put(`/projects/${editingId}`, payload);
                toast.success('Project Updated');
            } else {
                await api.post('/projects', payload);
                toast.success('Project Created');
            }
            sessionStorage.removeItem(`project_data_${user?._id}`);
            setShowModal(false);
            setFormData({ name: '', client: '', businessUnit: '', category: '', estimatedHours: '', description: '', status: 'Active', hasModules: true, startDate: '', dueDate: '', members: [] });
            setEditingId(null);
            fetchData({ force: true });
        } catch {
            toast.error(editingId ? 'Failed to update' : 'Failed to create');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEdit = (proj) => {
        setFormData({
            name: proj.name || '',
            client: proj.client?._id || '',
            businessUnit: proj.businessUnit?._id || '',
            category: proj.category || '',
            estimatedHours: (proj.estimatedHours !== undefined && proj.estimatedHours !== null && proj.estimatedHours !== '') ? proj.estimatedHours : '',
            description: proj.description || '',
            status: proj.status || (proj.isActive ? 'Active' : 'Completed'),
            hasModules: proj.hasModules !== false,
            startDate: proj.startDate ? new Date(proj.startDate).toISOString().split('T')[0] : '',
            dueDate: (proj.dueDate || proj.endDate) ? new Date(proj.dueDate || proj.endDate).toISOString().split('T')[0] : '',
            members: proj.members?.map(m => m._id) || []
        });
        setEditingId(proj._id);
        setMemberSearchTerm('');
        setShowModal(true);
    };

    const openCreateModal = () => {
        setFormData({ name: '', client: '', businessUnit: '', category: '', estimatedHours: '', description: '', status: 'Active', hasModules: true, startDate: '', dueDate: '', members: [] });
        setEditingId(null);
        setMemberSearchTerm('');
        setShowModal(true);
    };

    // if (loading) return <div className="p-8 text-center">Loading...</div>;

    const handleStatusChange = async (project, newStatus) => {
        const isActive = newStatus !== 'Completed' && newStatus !== 'Inactive';
        setActionLoading(project._id);
        try {
            await api.put(`/projects/${project._id}`, { status: newStatus, isActive });
            toast.success(`Project marked as ${newStatus}`);
            sessionStorage.removeItem(`project_data_${user?._id}`);
            await fetchData({ force: true });
        } catch {
            toast.error('Failed to update project status');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-6">

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Projects</h1>
                        <p className="text-sm text-slate-500">Track initiatives and jobs</p>
                    </div>
                    {canCreate && (
                        <Button
                            onClick={openCreateModal}
                            className="flex items-center space-x-2"
                        >
                            <Plus size={18} />
                            <span>New Project</span>
                        </Button>
                    )}
                </div>

                {/* Tabs & Search Toolbar */}
                <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                        {tabs.map((tab) => {
                            const isSelected = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                                        isSelected
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span
                                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                                            isSelected
                                                ? 'bg-white/20 text-white'
                                                : 'bg-slate-100 text-slate-500'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-72 shrink-0">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search projects, clients..."
                            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="zoho-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Project Name</th>
                                    <th className="px-6 py-3">Category</th>
                                    <th className="px-6 py-3">Client</th>
                                    <th className="px-6 py-3">Business Unit</th>
                                    <th className="px-6 py-3">Start Date</th>
                                    <th className="px-6 py-3">End Date</th>
                                    <th className="px-6 py-3">Estimate Hours</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-3"><Skeleton className="h-8 w-44" /></td>
                                            <td className="px-6 py-3"><Skeleton className="h-6 w-20" /></td>
                                            <td className="px-6 py-3"><Skeleton className="h-6 w-24" /></td>
                                            <td className="px-6 py-3"><Skeleton className="h-6 w-24" /></td>
                                            <td className="px-6 py-3"><Skeleton className="h-6 w-20" /></td>
                                            <td className="px-6 py-3"><Skeleton className="h-6 w-20" /></td>
                                            <td className="px-6 py-3"><Skeleton className="h-6 w-16" /></td>
                                            <td className="px-6 py-3"><Skeleton className="h-6 w-10 ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : filteredProjects.length > 0 ? (
                                    filteredProjects.map((project) => {
                                        return (
                                            <tr
                                                key={project._id}
                                                onClick={() => navigate(`/projects/${project._id}`)}
                                                className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                                            >
                                                <td className="px-6 py-3 font-medium text-slate-800">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                            <Briefcase size={16} />
                                                        </div>
                                                        <span className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{project.name}</span>
                                                        {project.hasModules === false && (
                                                            <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                                                                No Modules
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-3 text-slate-600">
                                                    {project.category ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                                            {project.category}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">-</span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-3 text-slate-600">
                                                    {project.client?.name || <span className="text-slate-400 italic">Internal</span>}
                                                </td>

                                                <td className="px-6 py-3 text-slate-600">
                                                    {project.businessUnit?.name ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                            {project.businessUnit.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">-</span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-3 text-slate-600 whitespace-nowrap text-xs">
                                                    {project.startDate ? (
                                                        formatDate(project.startDate)
                                                    ) : (
                                                        <span className="text-slate-400 italic">-</span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-3 text-slate-600 whitespace-nowrap text-xs">
                                                    {project.dueDate || project.endDate ? (
                                                        formatDate(project.dueDate || project.endDate)
                                                    ) : (
                                                        <span className="text-slate-400 italic">-</span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-3 text-slate-600 whitespace-nowrap text-xs">
                                                    {(project.estimatedHours !== undefined && project.estimatedHours !== null && project.estimatedHours !== '' && Number(project.estimatedHours) > 0) ? (
                                                        <span className="font-semibold text-slate-700">{project.estimatedHours} hrs</span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">-</span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end action-menu-container relative">
                                                        <button
                                                            className="action-menu-trigger p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
                                                            disabled={actionLoading === project._id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (openMenuId === project._id) {
                                                                    setOpenMenuId(null);
                                                                } else {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    const spaceBelow = window.innerHeight - rect.bottom;
                                                                    const menuHeight = 240;
                                                                    const top = spaceBelow >= menuHeight
                                                                        ? rect.bottom + window.scrollY + 4
                                                                        : rect.top + window.scrollY - menuHeight - 4;
                                                                    setMenuPosition({ top, left: rect.right + window.scrollX - 160 });
                                                                    setOpenMenuId(project._id);
                                                                }
                                                            }}
                                                        >
                                                            {actionLoading === project._id ? (
                                                                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                                                            ) : (
                                                                <MoreVertical size={16} />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="p-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <div className="p-3 bg-slate-100 text-slate-400 rounded-full mb-1">
                                                    <Briefcase size={24} />
                                                </div>
                                                <p className="font-medium text-slate-700 text-sm">
                                                    {searchTerm.trim()
                                                        ? `No projects matching "${searchTerm}"`
                                                        : activeTab === 'all'
                                                            ? 'No projects found'
                                                            : `No ${activeTab} projects found`}
                                                </p>
                                                <p className="text-xs text-slate-400 max-w-sm">
                                                    {searchTerm.trim()
                                                        ? 'Try adjusting your search terms or clearing the filter.'
                                                        : activeTab === 'all'
                                                            ? 'Get started by creating your first project.'
                                                            : `There are currently no projects marked as ${activeTab}.`}
                                                </p>
                                                {searchTerm.trim() ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSearchTerm('')}
                                                        className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                                                    >
                                                        Clear search
                                                    </button>
                                                ) : activeTab !== 'all' && counts.all > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTabChange('all')}
                                                        className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                                                    >
                                                        View all projects ({counts.all})
                                                    </button>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Portal Dropdown Menu — rendered outside overflow containers */}
            {openMenuId && ReactDOM.createPortal(
                (() => {
                    const project = projects.find(p => p._id === openMenuId);
                    if (!project) return null;
                    const displayStatus = project.status || (project.isActive ? 'Active' : 'Completed');
                    return (
                        <div
                            ref={menuRef}
                            style={{ position: 'absolute', top: menuPosition.top, left: menuPosition.left, zIndex: 9999 }}
                            className="w-40 bg-white rounded-lg shadow-xl border border-slate-100 py-1"
                        >
                            <button
                                onClick={() => {
                                    setOpenMenuId(null);
                                    navigate(`/projects/${project._id}`);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2"
                            >
                                <Eye size={13} /> View Details
                            </button>

                            {canUpdate && (
                                <button
                                    onClick={() => { handleEdit(project); setOpenMenuId(null); }}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2"
                                >
                                    <Edit2 size={13} /> Edit
                                </button>
                            )}

                            {displayStatus !== 'Completed' && (
                                <button
                                    onClick={() => { handleStatusChange(project, 'Completed'); setOpenMenuId(null); }}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2"
                                >
                                    <XCircle size={13} /> Close
                                </button>
                            )}

                            {displayStatus === 'Active' && (
                                <button
                                    onClick={() => { handleStatusChange(project, 'On Hold'); setOpenMenuId(null); }}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-orange-600 flex items-center gap-2"
                                >
                                    <PauseCircle size={13} /> On Hold
                                </button>
                            )}

                            {(displayStatus === 'On Hold' || displayStatus === 'Completed' || displayStatus === 'Inactive') && (
                                <button
                                    onClick={() => { handleStatusChange(project, 'Active'); setOpenMenuId(null); }}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2"
                                >
                                    <Briefcase size={13} /> Mark as Active
                                </button>
                            )}

                            {displayStatus !== 'Inactive' && (
                                <button
                                    onClick={() => { handleStatusChange(project, 'Inactive'); setOpenMenuId(null); }}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
                                >
                                    <XCircle size={13} /> Inactive
                                </button>
                            )}

                            {user?.permissions?.includes('project.delete') && (
                                <button
                                    onClick={async () => {
                                        if (window.confirm('Are you sure you want to delete this project? This will delete all modules and tasks within it.')) {
                                            setActionLoading(project._id);
                                            try {
                                                await api.delete(`/projects/${project._id}`);
                                                toast.success('Project deleted');
                                                sessionStorage.removeItem(`project_data_${user?._id}`);
                                                await fetchData({ force: true });
                                            } catch {
                                                toast.error('Failed to delete project');
                                            } finally {
                                                setActionLoading(null);
                                            }
                                        }
                                        setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-red-600 flex items-center gap-2 border-t border-slate-100 mt-1 pt-2"
                                >
                                    <Trash2 size={13} /> Delete
                                </button>
                            )}
                        </div>
                    );
                })(),
                document.body
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between rounded-t-xl">
                            <div className="flex items-center gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
                                    <Briefcase size={20} className="text-blue-600" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {editingId ? "Edit Project" : "New Project"}
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-500">
                                        {editingId
                                            ? "Update project details and team assignments"
                                            : "Fill in the details to create a new project"}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowModal(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        {/* Form body — scrollable */}
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

                                {/* Section: Basic Information */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Basic Information</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                Project Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                required
                                                placeholder="e.g. Website Redesign Q3"
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-slate-50 focus:bg-white"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
                                            <input
                                                placeholder="e.g. Development, Design, Marketing"
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-slate-50 focus:bg-white"
                                                value={formData.category}
                                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client</label>
                                            <select
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-slate-50 focus:bg-white"
                                                value={formData.client}
                                                onChange={e => setFormData({ ...formData, client: e.target.value })}
                                            >
                                                <option value="">Internal / No Client</option>
                                                {clients.map(c => (
                                                    <option key={c._id} value={c._id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Unit</label>
                                            <select
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-slate-50 focus:bg-white"
                                                value={formData.businessUnit}
                                                onChange={e => setFormData({ ...formData, businessUnit: e.target.value })}
                                            >
                                                <option value="">None / Select Business Unit</option>
                                                {businessUnits.map(bu => (
                                                    <option key={bu._id} value={bu._id}>{bu.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {editingId && (
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                                                <select
                                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-slate-50 focus:bg-white"
                                                    value={formData.status}
                                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                                >
                                                    <option value="Active">Active</option>
                                                    <option value="On Hold">On Hold</option>
                                                    <option value="Completed">Completed</option>
                                                    <option value="Inactive">Inactive</option>
                                                </select>
                                            </div>
                                        )}

                                        <div className="col-span-2">
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                                            <textarea
                                                placeholder="Briefly describe the project scope and goals..."
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-slate-50 focus:bg-white resize-none"
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                rows="3"
                                            />
                                        </div>

                                        <div className="col-span-2 flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                                            <div>
                                                <span className="block text-sm font-semibold text-slate-800">Contains Modules</span>
                                                <span className="block text-xs text-slate-500 mt-0.5">
                                                    {formData.hasModules
                                                        ? 'Project uses modules for time tracking.'
                                                        : 'Project has no modules. Team members log time directly to the project.'}
                                                </span>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(formData.hasModules)}
                                                    onChange={e => setFormData({ ...formData, hasModules: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-slate-100" />

                                {/* Section: Timeline */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Timeline & Estimates</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Date</label>
                                            <input
                                                type="date"
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-slate-50 focus:bg-white"
                                                value={formData.startDate}
                                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Date</label>
                                            <input
                                                type="date"
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-slate-50 focus:bg-white"
                                                value={formData.dueDate}
                                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estimate Hours</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                placeholder="e.g. 100"
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-slate-50 focus:bg-white"
                                                value={formData.estimatedHours}
                                                onChange={e => setFormData({ ...formData, estimatedHours: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-slate-100" />

                                {/* Section: Team Members */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Team Members</h4>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            {formData.members?.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, members: [] }))}
                                                    className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    Deselect all
                                                </button>
                                            )}
                                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                                                {formData.members?.length || 0} selected
                                            </span>
                                        </div>
                                    </div>

                                    {/* Team Members Search */}
                                    <div className="relative mb-3">
                                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={memberSearchTerm}
                                            onChange={(e) => setMemberSearchTerm(e.target.value)}
                                            placeholder="Search team members by name or email..."
                                            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                        {memberSearchTerm && (
                                            <button
                                                type="button"
                                                onClick={() => setMemberSearchTerm('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                                            >
                                                <X size={13} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Row-wise Team Members List */}
                                    <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-xs">
                                        {filteredEmployees.map(emp => {
                                            const isChecked = formData.members?.includes(emp._id);
                                            return (
                                                <div
                                                    key={emp._id}
                                                    onClick={() => {
                                                        setFormData(prev => {
                                                            const current = prev.members || [];
                                                            const checked = current.includes(emp._id);
                                                            return {
                                                                ...prev,
                                                                members: checked
                                                                    ? current.filter(x => x !== emp._id)
                                                                    : [...current, emp._id]
                                                            };
                                                        });
                                                    }}
                                                    className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors ${
                                                        isChecked ? 'bg-blue-50/70 hover:bg-blue-50' : 'hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => {}}
                                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0 pointer-events-none"
                                                        />
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 border border-blue-200/70">
                                                            {getInitials(emp.firstName, emp.lastName)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-slate-800 truncate">
                                                                {emp.firstName} {emp.lastName}
                                                            </p>
                                                            <p className="text-xs text-slate-400 truncate">
                                                                {emp.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {isChecked && (
                                                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-full shrink-0">
                                                            Selected
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {filteredEmployees.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                                <Briefcase size={24} className="mb-1.5 opacity-30" />
                                                <p className="text-xs">
                                                    {memberSearchTerm
                                                        ? `No team members matching "${memberSearchTerm}"`
                                                        : 'No employees found'}
                                                </p>
                                                {memberSearchTerm && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setMemberSearchTerm('')}
                                                        className="text-xs text-blue-600 hover:underline mt-1 font-semibold"
                                                    >
                                                        Clear search
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-2 pl-1">
                                        Selected members will have visibility access to this project.
                                    </p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-shrink-0 rounded-b-2xl">
                                <p className="text-xs text-slate-400">
                                    {editingId ? 'Changes will be saved immediately.' : 'All fields marked * are required.'}
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <Button type="submit" isLoading={submitLoading} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm">
                                        {editingId ? 'Save Changes' : 'Create Project'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div >
    );
};

export default Projects;
