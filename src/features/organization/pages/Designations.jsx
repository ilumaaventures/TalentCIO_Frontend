import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import api from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { Award, Plus, Search, Edit2, Trash2, Users } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import DesignationFormModal from '../components/DesignationFormModal';
import { readSessionCache, createCachePayload, isCacheFresh } from '@/lib/cache';

const DESIG_CACHE_TTL_MS = 60 * 1000;

const Designations = () => {
    const { user } = useAuth();
    const [designations, setDesignations] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingDesignation, setEditingDesignation] = useState(null);

    const isAdmin = user?.roles?.some((r) => ['Admin', 'Super Admin', 'System Admin'].includes(typeof r === 'string' ? r : r?.name))
        || user?.permissions?.includes('*')
        || Boolean(user?.hasAllPermissions);

    const canCreate = isAdmin || user?.permissions?.includes('designation.create');
    const canUpdate = isAdmin || user?.permissions?.includes('designation.update');
    const canDelete = isAdmin || user?.permissions?.includes('designation.delete');

    const cacheKey = `designations_data_${user?._id}_${selectedDeptFilter}`;

    const fetchDesignations = useCallback(async ({ force = false } = {}) => {
        try {
            if (!search && !force) {
                const cached = readSessionCache(cacheKey);
                if (cached && isCacheFresh(cached, DESIG_CACHE_TTL_MS)) {
                    setDesignations(cached.data?.designations || []);
                    setLoading(false);
                    return;
                }
            }

            const params = new URLSearchParams({ includeInactive: 'true' });
            if (search) params.append('search', search);
            if (selectedDeptFilter) params.append('department', selectedDeptFilter);

            const [desigRes, deptRes] = await Promise.all([
                api.get(`/organization/designations?${params.toString()}`),
                api.get('/organization/departments?includeInactive=false').catch(() => ({ data: [] }))
            ]);

            const desigData = desigRes.data || [];
            setDesignations(desigData);
            setDepartments(deptRes.data || []);

            if (!search) {
                const payload = createCachePayload({ designations: desigData });
                try {
                    sessionStorage.setItem(cacheKey, JSON.stringify(payload));
                } catch {}
            }
        } catch (error) {
            console.error('Failed to load designations:', error);
            toast.error('Failed to load designations');
        } finally {
            setLoading(false);
        }
    }, [search, selectedDeptFilter, cacheKey]);

    useEffect(() => {
        fetchDesignations();
    }, [fetchDesignations]);

    const handleCreateOrUpdate = async (formData) => {
        const toastId = toast.loading(editingDesignation ? 'Updating designation...' : 'Creating designation...');
        try {
            if (editingDesignation) {
                await api.put(`/organization/designations/${editingDesignation._id}`, formData);
                toast.success('Designation updated successfully', { id: toastId });
            } else {
                await api.post('/organization/designations', formData);
                toast.success('Designation created successfully', { id: toastId });
            }
            try { sessionStorage.removeItem(cacheKey); } catch {}
            setShowModal(false);
            setEditingDesignation(null);
            fetchDesignations({ force: true });
        } catch (error) {
            console.error('Save designation error:', error);
            const msg = error.response?.data?.message || 'Failed to save designation';
            toast.error(msg, { id: toastId });
        }
    };

    const handleDelete = async (desig) => {
        if (!window.confirm(`Are you sure you want to archive designation "${desig.title}"?`)) return;

        const toastId = toast.loading('Archiving designation...');
        try {
            await api.delete(`/organization/designations/${desig._id}`);
            toast.success('Designation archived successfully', { id: toastId });
            try { sessionStorage.removeItem(cacheKey); } catch {}
            fetchDesignations({ force: true });
        } catch (error) {
            console.error('Delete designation error:', error);
            const msg = error.response?.data?.message || 'Failed to archive designation';
            toast.error(msg, { id: toastId });
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans p-6 md:p-10 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
                        <Award className="text-blue-600" size={28} />
                        Designations
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Manage company job titles, grade hierarchies, and department alignments
                    </p>
                </div>

                {canCreate && (
                    <button
                        onClick={() => {
                            setEditingDesignation(null);
                            setShowModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all self-start md:self-auto"
                    >
                        <Plus size={16} />
                        <span>Add Designation</span>
                    </button>
                )}
            </div>

            {/* Filter / Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by title or grade..."
                            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>

                    <select
                        value={selectedDeptFilter}
                        onChange={(e) => setSelectedDeptFilter(e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                    >
                        <option value="">All Departments</option>
                        {departments.map((d) => (
                            <option key={d._id} value={d._id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="text-xs font-semibold text-slate-500">
                    Total Designations: {designations.length}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-3">
                        <Skeleton className="h-10 w-full rounded-xl" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                ) : designations.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs">
                        No designations found. Click "Add Designation" to create the first one.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold">
                                <tr>
                                    <th className="py-3.5 px-5">Designation Title</th>
                                    <th className="py-3.5 px-4">Level / Grade</th>
                                    <th className="py-3.5 px-4">Department</th>
                                    <th className="py-3.5 px-4">Employees</th>
                                    <th className="py-3.5 px-4">Status</th>
                                    <th className="py-3.5 px-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {designations.map((desig) => (
                                    <tr key={desig._id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3.5 px-5">
                                            <span className="font-bold text-slate-800">{desig.title}</span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {desig.level ? (
                                                <span className="font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px] border border-indigo-100">
                                                    {desig.level}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600">
                                            {desig.department?.name ? (
                                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
                                                    {desig.department.name}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">Global</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                                                <Users size={12} className="text-slate-400" />
                                                {desig.employeeCount || 0}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    desig.isActive !== false
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                {desig.isActive !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {canUpdate && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingDesignation(desig);
                                                            setShowModal(true);
                                                        }}
                                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit Designation"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(desig)}
                                                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Archive Designation"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            <DesignationFormModal
                showModal={showModal}
                onClose={() => {
                    setShowModal(false);
                    setEditingDesignation(null);
                }}
                onSubmit={handleCreateOrUpdate}
                editingDesignation={editingDesignation}
                departments={departments}
            />
        </div>
    );
};

export default Designations;
