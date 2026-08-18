import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import api from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { Building, Plus, Search, Edit2, Trash2, RotateCcw, ChevronRight, CornerDownRight, Users } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import DepartmentFormModal from '../components/DepartmentFormModal';
import { readSessionCache, createCachePayload, isCacheFresh } from '@/lib/cache';

const DEPT_CACHE_TTL_MS = 60 * 1000;

const Departments = () => {
    const { user } = useAuth();
    const [departments, setDepartments] = useState([]);
    const [businessUnits, setBusinessUnits] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState(null);

    const isAdmin = user?.roles?.some((r) => ['Admin', 'Super Admin', 'System Admin'].includes(typeof r === 'string' ? r : r?.name))
        || user?.permissions?.includes('*')
        || Boolean(user?.hasAllPermissions);

    const canCreate = isAdmin || user?.permissions?.includes('department.create');
    const canUpdate = isAdmin || user?.permissions?.includes('department.update');
    const canDelete = isAdmin || user?.permissions?.includes('department.delete');

    const cacheKey = `departments_data_${user?._id}`;

    const fetchDepartments = useCallback(async ({ force = false } = {}) => {
        try {
            if (!search && !force) {
                const cached = readSessionCache(cacheKey);
                if (cached && isCacheFresh(cached, DEPT_CACHE_TTL_MS)) {
                    setDepartments(cached.data?.departments || []);
                    setLoading(false);
                    return;
                }
            }

            const [deptRes, buRes, empRes] = await Promise.all([
                api.get(`/organization/departments?includeInactive=true${search ? `&search=${encodeURIComponent(search)}` : ''}`),
                api.get('/organization/business-units').catch(() => ({ data: [] })),
                api.get('/admin/users?limit=200').catch(() => ({ data: { users: [] } }))
            ]);

            const deptData = deptRes.data || [];
            setDepartments(deptData);
            setBusinessUnits(buRes.data || []);
            setEmployees(Array.isArray(empRes.data) ? empRes.data : empRes.data?.users || []);

            if (!search) {
                const payload = createCachePayload({ departments: deptData });
                try {
                    sessionStorage.setItem(cacheKey, JSON.stringify(payload));
                } catch {}
            }
        } catch (error) {
            console.error('Failed to load departments:', error);
            toast.error('Failed to load departments');
        } finally {
            setLoading(false);
        }
    }, [search, cacheKey]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    const handleCreateOrUpdate = async (formData) => {
        const toastId = toast.loading(editingDepartment ? 'Updating department...' : 'Creating department...');
        try {
            if (editingDepartment) {
                await api.put(`/organization/departments/${editingDepartment._id}`, formData);
                toast.success('Department updated successfully', { id: toastId });
            } else {
                await api.post('/organization/departments', formData);
                toast.success('Department created successfully', { id: toastId });
            }
            try { sessionStorage.removeItem(cacheKey); } catch {}
            setShowModal(false);
            setEditingDepartment(null);
            fetchDepartments({ force: true });
        } catch (error) {
            console.error('Save department error:', error);
            const msg = error.response?.data?.message || 'Failed to save department';
            toast.error(msg, { id: toastId });
        }
    };

    const handleDelete = async (dept) => {
        if (!window.confirm(`Are you sure you want to archive department "${dept.name}"?`)) return;

        const toastId = toast.loading('Archiving department...');
        try {
            await api.delete(`/organization/departments/${dept._id}`);
            toast.success('Department archived successfully', { id: toastId });
            try { sessionStorage.removeItem(cacheKey); } catch {}
            fetchDepartments({ force: true });
        } catch (error) {
            console.error('Delete department error:', error);
            const msg = error.response?.data?.message || 'Failed to archive department';
            toast.error(msg, { id: toastId });
        }
    };

    const handleRestore = async (dept) => {
        const toastId = toast.loading('Restoring department...');
        try {
            await api.post(`/organization/departments/${dept._id}/restore`);
            toast.success('Department restored successfully', { id: toastId });
            try { sessionStorage.removeItem(cacheKey); } catch {}
            fetchDepartments({ force: true });
        } catch (error) {
            console.error('Restore department error:', error);
            const msg = error.response?.data?.message || 'Failed to restore department';
            toast.error(msg, { id: toastId });
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans p-6 md:p-10 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
                        <Building className="text-blue-600" size={28} />
                        Departments
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Manage company departments, sub-department hierarchies, and department heads
                    </p>
                </div>

                {canCreate && (
                    <button
                        onClick={() => {
                            setEditingDepartment(null);
                            setShowModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all self-start md:self-auto"
                    >
                        <Plus size={16} />
                        <span>Add Department</span>
                    </button>
                )}
            </div>

            {/* Filter / Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by department name or code..."
                        className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                </div>

                <div className="text-xs font-semibold text-slate-500">
                    Total Departments: {departments.length}
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
                ) : departments.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs">
                        No departments found. Click "Add Department" to create the first one.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold">
                                <tr>
                                    <th className="py-3.5 px-5">Department Name</th>
                                    <th className="py-3.5 px-4">Code</th>
                                    <th className="py-3.5 px-4">Parent Department</th>
                                    <th className="py-3.5 px-4">Head of Department</th>
                                    <th className="py-3.5 px-4">Headcount</th>
                                    <th className="py-3.5 px-4">Status</th>
                                    <th className="py-3.5 px-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {departments.map((dept) => {
                                    const isSubDept = Boolean(dept.parentDepartment);

                                    return (
                                        <tr key={dept._id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3.5 px-5">
                                                <div className="flex items-center gap-2">
                                                    {isSubDept && <CornerDownRight size={13} className="text-slate-400 ml-2" />}
                                                    <span className="font-bold text-slate-800">{dept.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {dept.code ? (
                                                    <span className="font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                                                        {dept.code}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600">
                                                {dept.parentDepartment?.name || '-'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {dept.head ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">
                                                            {(dept.head.firstName?.[0] || '') + (dept.head.lastName?.[0] || '')}
                                                        </div>
                                                        <span className="text-slate-700 font-medium truncate max-w-[130px]">
                                                            {dept.head.firstName} {dept.head.lastName}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                                                    <Users size={12} className="text-slate-400" />
                                                    {dept.employeeCount || 0}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        dept.isActive !== false
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : 'bg-slate-100 text-slate-500'
                                                    }`}
                                                >
                                                    {dept.isActive !== false ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {canUpdate && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingDepartment(dept);
                                                                setShowModal(true);
                                                            }}
                                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Edit Department"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => handleDelete(dept)}
                                                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Archive Department"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            <DepartmentFormModal
                showModal={showModal}
                onClose={() => {
                    setShowModal(false);
                    setEditingDepartment(null);
                }}
                onSubmit={handleCreateOrUpdate}
                editingDepartment={editingDepartment}
                departments={departments}
                businessUnits={businessUnits}
                employees={employees}
            />
        </div>
    );
};

export default Departments;
