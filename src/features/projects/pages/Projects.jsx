import React, { useCallback, useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import { Briefcase, Plus, Search, Building, MoreVertical, Edit2, Trash2, XCircle, CheckCircle, PauseCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import { createCachePayload, isCacheFresh, readSessionCache } from '../utils/cache';

import { useAuth } from '../context/AuthContext';

const Projects = () => {
    const { user } = useAuth();
    const canCreate = user?.roles?.includes('Admin') || user?.permissions?.includes('project.create');
    const canUpdate = user?.roles?.includes('Admin') || user?.permissions?.includes('project.update');
    const [projects, setProjects] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null); // stores the id of the project being acted on
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', client: '', description: '', status: 'Active', startDate: '', dueDate: '', members: [] });
    const initialFetchDoneRef = useRef(false);
    const PROJECT_CACHE_TTL_MS = 30 * 1000;
    const cacheKey = `project_data_${user?._id}`;
    const [employees, setEmployees] = useState([]);

    const fetchData = useCallback(async ({ force = false } = {}) => {
        try {
            const cachedData = readSessionCache(cacheKey);

            if (cachedData) {
                const data = cachedData.data || cachedData;
                setProjects(data.projects || []);
                setClients(data.clients || []);
                setEmployees(data.employees || []);
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

            const newFingerprint = JSON.stringify({ p: projData.length, c: clientsData.length, e: employeesData.length, lp: projData[0]?._id });
            const oldFingerprint = cachedData?.fingerprint || null;

            setProjects(projData);
            setClients(clientsData);
            setEmployees(employeesData);

            if (newFingerprint !== oldFingerprint || force) {
                const minimalProjects = projData.map(p => ({
                    _id: p._id,
                    name: p.name,
                    status: p.status,
                    isActive: p.isActive,
                    description: p.description,
                    startDate: p.startDate,
                    dueDate: p.dueDate,
                    client: p.client ? { _id: p.client._id, name: p.client.name } : null,
                    members: p.members?.map(m => ({ _id: m._id }))
                }));

                const minimalClients = clientsData.map(c => ({ _id: c._id, name: c.name }));
                const minimalEmployees = employeesData.map(employee => ({
                    _id: employee._id,
                    firstName: employee.firstName,
                    lastName: employee.lastName,
                    email: employee.email
                }));

                const payload = createCachePayload({
                    projects: minimalProjects,
                    clients: minimalClients,
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
            if (!payload.startDate) payload.startDate = null;
            if (!payload.dueDate) payload.dueDate = null;

            if (editingId) {
                await api.put(`/projects/${editingId}`, payload);
                toast.success('Project Updated');
            } else {
                await api.post('/projects', payload);
                toast.success('Project Created');
            }
            sessionStorage.removeItem(`project_data_${user?._id}`);
            setShowModal(false);
            setFormData({ name: '', client: '', description: '', status: 'Active', startDate: '', dueDate: '', members: [] });
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
            name: proj.name,
            client: proj.client?._id || '',
            description: proj.description || '',
            status: proj.status || (proj.isActive ? 'Active' : 'Completed'),
            startDate: proj.startDate ? new Date(proj.startDate).toISOString().split('T')[0] : '',
            dueDate: proj.dueDate ? new Date(proj.dueDate).toISOString().split('T')[0] : '',
            members: proj.members?.map(m => m._id) || []
        });
        setEditingId(proj._id);
        setShowModal(true);
    };

    const openCreateModal = () => {
        setFormData({ name: '', client: '', description: '', status: 'Active', startDate: '', dueDate: '', members: [] });
        setEditingId(null);
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

                <div className="zoho-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Project Name</th>


                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-3"><Skeleton className="h-8 w-48" /></td>


                                            <td className="px-6 py-3"><Skeleton className="h-6 w-16" /></td>
                                            <td className="px-6 py-3"><Skeleton className="h-6 w-24 ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : projects.length > 0 ? (
                                    projects.map((project, index) => {
                                        const displayStatus = project.status || (project.isActive ? 'Active' : 'Completed');
                                        return (
                                            <tr key={project._id} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-3 font-medium text-slate-800">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded">
                                                            <Briefcase size={16} />
                                                        </div>
                                                        <span>{project.name}</span>
                                                    </div>
                                                </td>



                                                <td className="px-6 py-3">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${displayStatus === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        displayStatus === 'On Hold' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                            displayStatus === 'Inactive' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                                'bg-slate-100 text-slate-500 border-slate-200'
                                                        }`}>
                                                        {displayStatus}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center justify-end gap-3 action-menu-container relative">
                                                        <a href={`/projects/${project._id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium whitespace-nowrap">View Modules</a>

                                                        {canUpdate && (
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
                                                                        const menuHeight = 220;
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
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-500">
                                            No Projects found.
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
                                onClick={() => { handleEdit(project); setOpenMenuId(null); }}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2"
                            >
                                <Edit2 size={13} /> Edit
                            </button>

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

                                        <div className={editingId ? 'col-span-2' : 'col-span-1'}>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                                            <textarea
                                                placeholder="Briefly describe the project scope and goals..."
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-slate-50 focus:bg-white resize-none"
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                rows="3"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-slate-100" />

                                {/* Section: Timeline */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Timeline</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
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
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Due Date</label>
                                            <input
                                                type="date"
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-slate-50 focus:bg-white"
                                                value={formData.dueDate}
                                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-slate-100" />

                                {/* Section: Team Members */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Team Members</h4>
                                        </div>
                                        {formData.members?.length > 0 && (
                                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                                                {formData.members.length} selected
                                            </span>
                                        )}
                                    </div>
                                    <div className="h-44 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 grid grid-cols-2 gap-2">
                                        {employees.map(emp => {
                                            const isChecked = formData.members?.includes(emp._id);
                                            return (
                                                <label
                                                    key={emp._id}
                                                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${isChecked
                                                        ? 'bg-blue-50 border-blue-300 shadow-sm'
                                                        : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50/40'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        value={emp._id}
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            const id = emp._id;
                                                            setFormData(prev => {
                                                                const current = prev.members || [];
                                                                if (checked) return { ...prev, members: [...current, id] };
                                                                return { ...prev, members: current.filter(x => x !== id) };
                                                            });
                                                        }}
                                                        className="rounded text-blue-600 focus:ring-blue-500 flex-shrink-0"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-slate-700 truncate">{emp.firstName} {emp.lastName}</p>
                                                        <p className="text-[10px] text-slate-400 truncate">{emp.email}</p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                        {employees.length === 0 && (
                                            <div className="col-span-2 flex flex-col items-center justify-center py-8 text-slate-400">
                                                <Briefcase size={28} className="mb-2 opacity-30" />
                                                <p className="text-xs italic">No employees found</p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1.5 pl-1">Selected members will have visibility access to this project.</p>
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
