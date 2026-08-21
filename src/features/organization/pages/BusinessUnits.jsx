import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/apiClient';
import { Building2, Plus, Edit2, Trash2, Search, X, Users } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';
import { createCachePayload, isCacheFresh, readSessionCache } from '@/lib/cache';
import { useAuth } from '@/features/auth/context/AuthContext';

const BUSINESS_UNIT_CACHE_TTL_MS = 60 * 1000;

const BusinessUnits = () => {
    const { user } = useAuth();
    const isAdmin = user?.roles?.some((r) => ['Admin', 'Super Admin', 'System Admin'].includes(typeof r === 'string' ? r : r?.name))
        || user?.permissions?.includes('*')
        || Boolean(user?.hasAllPermissions);

    const canCreate = isAdmin || user?.permissions?.includes('business_unit.create');
    const canUpdate = isAdmin || user?.permissions?.includes('business_unit.update');
    const canDelete = isAdmin || user?.permissions?.includes('business_unit.delete');

    const [units, setUnits] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', headOfUnit: '', description: '' });
    const [editingId, setEditingId] = useState(null);

    const cacheKey = `business_unit_org_data_${user?._id}`;

    const fetchUnits = useCallback(async ({ force = false } = {}) => {
        try {
            if (!search && !force) {
                const cachedData = readSessionCache(cacheKey);
                if (cachedData && isCacheFresh(cachedData, BUSINESS_UNIT_CACHE_TTL_MS)) {
                    setUnits(cachedData.data?.units || []);
                    setLoading(false);
                    return;
                }
            }

            const [unitRes, empRes] = await Promise.all([
                api.get('/organization/business-units'),
                api.get('/admin/users?limit=200').catch(() => ({ data: { users: [] } }))
            ]);

            const unitData = unitRes.data || [];
            setUnits(unitData);
            setEmployees(Array.isArray(empRes.data) ? empRes.data : empRes.data?.users || []);

            if (!search) {
                const payload = createCachePayload({ units: unitData });
                try {
                    sessionStorage.setItem(cacheKey, JSON.stringify(payload));
                } catch {}
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load Business Units');
        } finally {
            setLoading(false);
        }
    }, [search, cacheKey]);

    useEffect(() => {
        fetchUnits();
    }, [fetchUnits]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const toastId = toast.loading(editingId ? 'Updating Business Unit...' : 'Creating Business Unit...');
        try {
            if (editingId) {
                await api.put(`/organization/business-units/${editingId}`, formData);
                toast.success('Business Unit Updated', { id: toastId });
            } else {
                await api.post('/organization/business-units', formData);
                toast.success('Business Unit Created', { id: toastId });
            }
            try { sessionStorage.removeItem(cacheKey); } catch {}
            setShowModal(false);
            setFormData({ name: '', headOfUnit: '', description: '' });
            setEditingId(null);
            fetchUnits({ force: true });
        } catch (error) {
            const msg = error.response?.data?.message || (editingId ? 'Failed to update' : 'Failed to create');
            toast.error(msg, { id: toastId });
        }
    };

    const handleDelete = async (unit) => {
        if (!window.confirm(`Are you sure you want to delete Business Unit "${unit.name}"?`)) return;

        const toastId = toast.loading('Deleting Business Unit...');
        try {
            await api.delete(`/organization/business-units/${unit._id}`);
            toast.success('Business Unit Deleted', { id: toastId });
            try { sessionStorage.removeItem(cacheKey); } catch {}
            fetchUnits({ force: true });
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to delete Business Unit';
            toast.error(msg, { id: toastId });
        }
    };

    const handleEdit = (unit) => {
        setFormData({
            name: unit.name,
            headOfUnit: unit.headOfUnit?._id || unit.headOfUnit || '',
            description: unit.description || ''
        });
        setEditingId(unit._id);
        setShowModal(true);
    };

    const openCreateModal = () => {
        setFormData({ name: '', headOfUnit: '', description: '' });
        setEditingId(null);
        setShowModal(true);
    };

    const filteredUnits = units.filter((u) => {
        if (!search.trim()) return true;
        return (u.name || '').toLowerCase().includes(search.trim().toLowerCase())
            || (u.description || '').toLowerCase().includes(search.trim().toLowerCase());
    });

    return (
        <div className="min-h-screen bg-slate-100 font-sans p-6 md:p-10 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
                        <Building2 className="text-blue-600" size={28} />
                        Business Units
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        High-level organizational units for client engagements, projects, and departmental divisions
                    </p>
                </div>

                {canCreate && (
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all self-start md:self-auto"
                    >
                        <Plus size={16} />
                        <span>Add Business Unit</span>
                    </button>
                )}
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search business units..."
                        className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                </div>

                <div className="text-xs font-semibold text-slate-500">
                    Total Units: {filteredUnits.length}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-3">
                        <Skeleton className="h-10 w-full rounded-xl" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                ) : filteredUnits.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs">
                        No business units found. Click "Add Business Unit" to create one.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold">
                                <tr>
                                    <th className="py-3.5 px-5">Unit Name</th>
                                    <th className="py-3.5 px-4">Head of Unit</th>
                                    <th className="py-3.5 px-4">Description</th>
                                    <th className="py-3.5 px-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUnits.map((unit) => (
                                    <tr key={unit._id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3.5 px-5">
                                            <span className="font-bold text-slate-800">{unit.name}</span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {unit.headOfUnit ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">
                                                        {(unit.headOfUnit.firstName?.[0] || '') + (unit.headOfUnit.lastName?.[0] || '')}
                                                    </div>
                                                    <span className="text-slate-700 font-medium">
                                                        {unit.headOfUnit.firstName} {unit.headOfUnit.lastName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                                            {unit.description || '-'}
                                        </td>
                                        <td className="py-3.5 px-5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {canUpdate && (
                                                    <button
                                                        onClick={() => handleEdit(unit)}
                                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit Unit"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(unit)}
                                                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Delete Unit"
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
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-bold text-sm text-slate-800">
                                {editingId ? 'Edit Business Unit' : 'Create Business Unit'}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Business Unit Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Enterprise Solutions, Digital Media"
                                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Head of Unit
                                </label>
                                <select
                                    value={formData.headOfUnit}
                                    onChange={(e) => setFormData({ ...formData, headOfUnit: e.target.value })}
                                    className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                                >
                                    <option value="">-- Select Head --</option>
                                    {employees.map((emp) => (
                                        <option key={emp._id} value={emp._id}>
                                            {emp.firstName} {emp.lastName} ({emp.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief scope and responsibility..."
                                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                                >
                                    {editingId ? 'Save Changes' : 'Create Unit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BusinessUnits;
