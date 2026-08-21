import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, AlertCircle, Save, Loader, Shield, Receipt, GitBranch } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/apiClient';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api/reimbursementApi';
import { formatINR } from '../utils/reimbursementConstants';
import UserMultiSelect from '@/components/common/UserMultiSelect';

const ReimbursementSettingsModal = ({ onClose, onSuccess }) => {
    const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'workflow'

    // ==========================================
    // 1. CATEGORIES STATE
    // ==========================================
    const [categories, setCategories] = useState([]);
    const [catLoading, setCatLoading] = useState(true);
    const [editingCat, setEditingCat] = useState(null);
    const [showAddCat, setShowAddCat] = useState(false);
    const [catForm, setCatForm] = useState({ name: '', description: '', maxAmountPerClaim: '', sortOrder: 0 });
    const [catSubmitting, setCatSubmitting] = useState(false);

    // ==========================================
    // 2. APPROVAL WORKFLOW STATE
    // ==========================================
    const [workflow, setWorkflow] = useState(null);
    const [wfLoading, setWfLoading] = useState(true);
    const [allUsers, setAllUsers] = useState([]);
    const [wfName, setWfName] = useState('Reimbursement Approval Workflow');
    const [levels, setLevels] = useState([
        { levelCheck: 1, role: 'Reporting Manager / Team Lead', approvers: [], isFinal: false }
    ]);
    const [wfSubmitting, setWfSubmitting] = useState(false);

    // Load initial data
    useEffect(() => {
        loadCategories();
        loadWorkflow();
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const res = await api.get('/admin/users');
            setAllUsers(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error('Failed to load users', err);
        }
    };

    // ─── Category Logic ────────────────────────────────────────────────────────
    const loadCategories = async () => {
        setCatLoading(true);
        try {
            const res = await getCategories();
            setCategories(res.data?.categories || []);
        } catch {
            toast.error('Failed to load expense categories.');
        } finally {
            setCatLoading(false);
        }
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        if (!catForm.name.trim()) return toast.error('Category name is required.');

        setCatSubmitting(true);
        try {
            const payload = {
                name: catForm.name.trim(),
                description: catForm.description.trim(),
                maxAmountPerClaim: catForm.maxAmountPerClaim ? Number(catForm.maxAmountPerClaim) : null,
                sortOrder: Number(catForm.sortOrder) || 0
            };

            if (editingCat) {
                await updateCategory(editingCat._id, payload);
                toast.success('Category updated successfully.');
            } else {
                await createCategory(payload);
                toast.success('Category created successfully.');
            }

            setEditingCat(null);
            setShowAddCat(false);
            setCatForm({ name: '', description: '', maxAmountPerClaim: '', sortOrder: 0 });
            loadCategories();
            onSuccess?.();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save category.');
        } finally {
            setCatSubmitting(false);
        }
    };

    const handleEditCategory = (cat) => {
        setEditingCat(cat);
        setCatForm({
            name: cat.name,
            description: cat.description || '',
            maxAmountPerClaim: cat.maxAmountPerClaim || '',
            sortOrder: cat.sortOrder || 0
        });
        setShowAddCat(true);
    };

    const handleDeleteCategory = async (cat) => {
        if (!confirm(`Delete category "${cat.name}"?`)) return;
        try {
            await deleteCategory(cat._id);
            toast.success('Category deleted.');
            loadCategories();
            onSuccess?.();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete category.');
        }
    };

    // ─── Workflow Logic ────────────────────────────────────────────────────────
    const loadWorkflow = async () => {
        setWfLoading(true);
        try {
            const res = await api.get('/workflows', { params: { module: 'Reimbursement' } });
            const list = Array.isArray(res.data) ? res.data : [];
            const activeWf = list.find(w => w.isActive) || list[0];

            if (activeWf) {
                setWorkflow(activeWf);
                setWfName(activeWf.name);
                setLevels(activeWf.levels.map(l => ({
                    levelCheck: l.levelCheck,
                    role: l.roleName || (typeof l.role === 'object' ? l.role?.name : l.role) || `Level ${l.levelCheck} Approver`,
                    approvers: (l.approvers || []).map(a => typeof a === 'object' ? a._id : a),
                    isFinal: Boolean(l.isFinal)
                })));
            }
        } catch (err) {
            console.error('Failed to load reimbursement workflow', err);
        } finally {
            setWfLoading(false);
        }
    };

    const handleAddLevel = () => {
        const nextNum = levels.length + 1;
        setLevels(prev => [
            ...prev.map((l, i) => i === prev.length - 1 ? { ...l, isFinal: false } : l),
            { levelCheck: nextNum, role: nextNum === 2 ? 'Finance / Admin Approval' : `Level ${nextNum} Approver`, approvers: [], isFinal: true }
        ]);
    };

    const handleRemoveLevel = (index) => {
        if (levels.length <= 1) return toast.error('Workflow must have at least 1 approval level.');
        const updated = levels.filter((_, i) => i !== index).map((l, i) => ({
            ...l,
            levelCheck: i + 1,
            isFinal: i === levels.length - 2 ? true : l.isFinal
        }));
        setLevels(updated);
    };

    const handleLevelFieldChange = (index, field, val) => {
        setLevels(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: val };
            return copy;
        });
    };

    const handleSaveWorkflow = async () => {
        if (!wfName.trim()) return toast.error('Workflow name is required.');
        for (const l of levels) {
            if (!l.role?.trim()) return toast.error(`Role name is required for Level ${l.levelCheck}`);
            if (!l.approvers || l.approvers.length === 0) return toast.error(`Select at least one approver for Level ${l.levelCheck}`);
        }

        setWfSubmitting(true);
        try {
            const payload = {
                name: wfName.trim(),
                module: 'Reimbursement',
                isActive: true,
                levels: levels.map((l, i) => ({
                    levelCheck: l.levelCheck,
                    role: l.role.trim(),
                    approvers: l.approvers,
                    isFinal: i === levels.length - 1 || Boolean(l.isFinal)
                }))
            };

            if (workflow?._id) {
                await api.put(`/workflows/${workflow._id}`, payload);
                toast.success('Reimbursement workflow updated successfully.');
            } else {
                const res = await api.post('/workflows', payload);
                setWorkflow(res.data);
                toast.success('Reimbursement workflow created successfully.');
            }

            loadWorkflow();
            onSuccess?.();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save workflow.');
        } finally {
            setWfSubmitting(false);
        }
    };

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4 py-6"
        >
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-gradient-to-r from-purple-50 to-blue-50">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                            <Receipt size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Reimbursement Settings</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Configure expense categories and multi-level approval workflows</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/70 hover:text-slate-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 px-6 bg-white">
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`flex items-center gap-2 pb-3.5 pt-4 text-sm font-semibold border-b-2 mr-6 transition-colors
                            ${activeTab === 'categories' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Receipt size={16} />
                        Expense Categories ({categories.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('workflow')}
                        className={`flex items-center gap-2 pb-3.5 pt-4 text-sm font-semibold border-b-2 transition-colors
                            ${activeTab === 'workflow' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <GitBranch size={16} />
                        Approval Workflow ({levels.length} {levels.length === 1 ? 'Level' : 'Levels'})
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* TAB 1: CATEGORIES */}
                    {activeTab === 'categories' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-500 font-medium">Define allowable expense categories and optional per-claim budget caps.</p>
                                {!showAddCat && (
                                    <button
                                        onClick={() => { setEditingCat(null); setCatForm({ name: '', description: '', maxAmountPerClaim: '', sortOrder: categories.length + 1 }); setShowAddCat(true); }}
                                        className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 transition-colors shadow-xs"
                                    >
                                        <Plus size={14} /> Add Category
                                    </button>
                                )}
                            </div>

                            {/* Add / Edit Category Form */}
                            {showAddCat && (
                                <form onSubmit={handleSaveCategory} className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-slate-800">{editingCat ? 'Edit Category' : 'New Expense Category'}</h4>
                                        <button type="button" onClick={() => setShowAddCat(false)} className="text-slate-400 hover:text-slate-600">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Category Name *</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Travel & Flight, Internet Allowance"
                                                value={catForm.name}
                                                onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-purple-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Max Amount per Claim (₹) <span className="font-normal text-slate-400">(Leave blank for no limit)</span></label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Unlimited"
                                                value={catForm.maxAmountPerClaim}
                                                onChange={e => setCatForm(p => ({ ...p, maxAmountPerClaim: e.target.value }))}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-purple-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                                        <input
                                            type="text"
                                            placeholder="Short description of what expenses fall under this category"
                                            value={catForm.description}
                                            onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddCat(false)}
                                            className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={catSubmitting}
                                            className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
                                        >
                                            {catSubmitting && <Loader size={12} className="animate-spin" />}
                                            {editingCat ? 'Save Changes' : 'Create Category'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Categories List */}
                            {catLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader size={24} className="animate-spin text-purple-600" />
                                </div>
                            ) : categories.length === 0 ? (
                                <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
                                    No categories configured. Click "Add Category" above to create one.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {categories.map(c => (
                                        <div key={c._id} className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 hover:border-purple-200 transition-colors group">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-slate-800 text-sm truncate">{c.name}</p>
                                                    {c.maxAmountPerClaim && (
                                                        <span className="rounded-md bg-purple-100 text-purple-700 px-1.5 py-0.5 text-[10px] font-bold">
                                                            Cap: {formatINR(c.maxAmountPerClaim)}
                                                        </span>
                                                    )}
                                                </div>
                                                {c.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{c.description}</p>}
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                                                <button
                                                    onClick={() => handleEditCategory(c)}
                                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-purple-100 hover:text-purple-700 transition-colors"
                                                    title="Edit Category"
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCategory(c)}
                                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                    title="Delete Category"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: APPROVAL WORKFLOW */}
                    {activeTab === 'workflow' && (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">Reimbursement Approval Levels</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Claims will sequentially pass through each designated level before reaching the final approval.</p>
                                </div>
                                <button
                                    onClick={handleAddLevel}
                                    className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors"
                                >
                                    <Plus size={14} /> Add Next Level
                                </button>
                            </div>

                            {/* Workflow Name */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Workflow Title</label>
                                <input
                                    type="text"
                                    value={wfName}
                                    onChange={e => setWfName(e.target.value)}
                                    placeholder="e.g. Standard Reimbursement Workflow"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-purple-500"
                                />
                            </div>

                            {/* Levels Stepper Builder */}
                            <div className="space-y-4 pt-2">
                                {levels.map((lvl, index) => (
                                    <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 relative space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white text-xs font-black">
                                                    {lvl.levelCheck}
                                                </span>
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                                    Level {lvl.levelCheck} {index === levels.length - 1 ? '— Final Approval' : ''}
                                                </span>
                                            </div>
                                            {levels.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveLevel(index)}
                                                    className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                                    title="Remove Level"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Stage / Role Label</label>
                                                <input
                                                    type="text"
                                                    value={lvl.role}
                                                    onChange={e => handleLevelFieldChange(index, 'role', e.target.value)}
                                                    placeholder="e.g. Manager Approval, Finance Head"
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-purple-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Approver Employees *</label>
                                                <UserMultiSelect
                                                    users={allUsers}
                                                    selectedUserIds={lvl.approvers}
                                                    onChange={selectedIds => handleLevelFieldChange(index, 'approvers', selectedIds)}
                                                    placeholder="Select designated approvers..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Save Workflow Button */}
                            <div className="flex justify-end pt-4 border-t border-slate-100">
                                <button
                                    onClick={handleSaveWorkflow}
                                    disabled={wfSubmitting}
                                    className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60 transition-all shadow-sm"
                                >
                                    {wfSubmitting && <Loader size={15} className="animate-spin" />}
                                    <Save size={15} /> Save Approval Workflow
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 bg-slate-50 px-6 py-3.5 flex justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReimbursementSettingsModal;
