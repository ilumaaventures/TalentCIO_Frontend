import React, { useState, useEffect } from 'react';
import api from '@/lib/apiClient';
import { Plus, Minus, Trash2, Save, X, AlertCircle, ArrowRight, ShieldAlert, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

const HelpdeskWorkflows = () => {
    const [queryTypes, setQueryTypes] = useState([]);
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    // Editor State
    const [editingId, setEditingId] = useState(null); // 'new' or ID
    const [formData, setFormData] = useState({
        name: '',
        assignedRole: '',
        assignedPerson: '',
        enableEscalation: false,
        escalationLevels: [
            { level: 1, escalationDays: 2, escalationRole: '', escalationPerson: '' }
        ],
        autoResponse: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [typesRes, usersRes, rolesRes] = await Promise.all([
                api.get('/helpdesk/types'),
                api.get('/admin/users'),
                api.get('/admin/roles')
            ]);
            setQueryTypes(typesRes.data.data);
            setUsers(usersRes.data);
            setRoles(rolesRes.data);
        } catch (error) {
            console.error('Failed to fetch data', error);
            toast.error('Failed to load configuration data');
        } finally {
            setLoading(false);
        }
    };

    const handleConfigure = (type = null) => {
        if (type) {
            setEditingId(type._id);

            let parsedLevels = [];
            if (Array.isArray(type.escalationLevels) && type.escalationLevels.length > 0) {
                parsedLevels = type.escalationLevels.map((lvl, idx) => ({
                    level: lvl.level || idx + 1,
                    escalationDays: lvl.escalationDays || (idx + 1) * 2,
                    escalationRole: lvl.escalationRole?._id || lvl.escalationRole || '',
                    escalationPerson: lvl.escalationPerson?._id || lvl.escalationPerson || ''
                }));
            } else if (type.enableEscalation && (type.escalationPerson || type.escalationDays)) {
                parsedLevels = [{
                    level: 1,
                    escalationDays: type.escalationDays || 2,
                    escalationRole: type.escalationRole?._id || type.escalationRole || '',
                    escalationPerson: type.escalationPerson?._id || type.escalationPerson || ''
                }];
            } else {
                parsedLevels = [
                    { level: 1, escalationDays: 2, escalationRole: '', escalationPerson: '' }
                ];
            }

            setFormData({
                name: type.name,
                assignedRole: type.assignedRole?._id || '',
                assignedPerson: type.assignedPerson?._id || '',
                enableEscalation: !!type.enableEscalation,
                escalationLevels: parsedLevels,
                autoResponse: type.autoResponse || ''
            });
        } else {
            setEditingId('new');
            setFormData({
                name: '',
                assignedRole: '',
                assignedPerson: '',
                enableEscalation: false,
                escalationLevels: [
                    { level: 1, escalationDays: 2, escalationRole: '', escalationPerson: '' }
                ],
                autoResponse: ''
            });
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData({
            name: '',
            assignedRole: '',
            assignedPerson: '',
            enableEscalation: false,
            escalationLevels: [
                { level: 1, escalationDays: 2, escalationRole: '', escalationPerson: '' }
            ],
            autoResponse: ''
        });
    };

    const addEscalationLevel = () => {
        const currentLevels = formData.escalationLevels || [];
        const lastDays = currentLevels.length > 0 ? Number(currentLevels[currentLevels.length - 1].escalationDays) || 2 : 0;
        const newDays = lastDays + 2;

        setFormData({
            ...formData,
            escalationLevels: [
                ...currentLevels,
                {
                    level: currentLevels.length + 1,
                    escalationDays: newDays,
                    escalationRole: '',
                    escalationPerson: ''
                }
            ]
        });
    };

    const removeEscalationLevel = (index) => {
        const filtered = formData.escalationLevels.filter((_, i) => i !== index);
        const reindexed = filtered.map((lvl, i) => ({
            ...lvl,
            level: i + 1
        }));
        setFormData({
            ...formData,
            escalationLevels: reindexed.length > 0 ? reindexed : [{ level: 1, escalationDays: 2, escalationRole: '', escalationPerson: '' }]
        });
    };

    const updateEscalationLevel = (index, field, value) => {
        const updated = [...formData.escalationLevels];
        updated[index] = {
            ...updated[index],
            [field]: value
        };
        if (field === 'escalationRole') {
            updated[index].escalationPerson = '';
        }
        setFormData({
            ...formData,
            escalationLevels: updated
        });
    };

    const handleSave = async () => {
        if (!formData.name.trim()) return toast.error('Query Type Name is required');
        if (!formData.assignedPerson) return toast.error('Assigned Responsible Person is required');

        if (formData.enableEscalation) {
            if (!formData.escalationLevels || formData.escalationLevels.length === 0) {
                return toast.error('Please add at least one escalation tier or disable escalation.');
            }

            for (let i = 0; i < formData.escalationLevels.length; i++) {
                const lvl = formData.escalationLevels[i];
                if (!lvl.escalationPerson) {
                    return toast.error(`Please select a designated escalation person for Level ${i + 1}`);
                }
                if (!lvl.escalationDays || Number(lvl.escalationDays) < 1) {
                    return toast.error(`Level ${i + 1} requires a valid SLA threshold (at least 1 day).`);
                }
                if (i > 0) {
                    const prevLvl = formData.escalationLevels[i - 1];
                    if (Number(lvl.escalationDays) <= Number(prevLvl.escalationDays)) {
                        return toast.error(`Level ${i + 1} SLA days (${lvl.escalationDays}d) must be strictly greater than Level ${i} SLA days (${prevLvl.escalationDays}d).`);
                    }
                }
            }
        }

        try {
            if (editingId === 'new') {
                await api.post('/helpdesk/types', formData);
                toast.success('Query Type created successfully');
            } else {
                await api.put(`/helpdesk/types/${editingId}`, formData);
                toast.success('Query Type updated successfully');
            }
            handleCancel();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save Query Type');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this Query Type? Users will no longer be able to select it.')) return;
        try {
            await api.delete(`/helpdesk/types/${id}`);
            toast.success('Query Type moved to bin');
            fetchData();
        } catch {
            toast.error('Failed to delete Query Type');
        }
    };

    if (loading) return <div className="p-6 text-slate-500 font-medium">Loading configuration...</div>;

    const assignedUserObj = users.find(u => u._id === formData.assignedPerson);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-start">
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex items-start text-indigo-800 text-xs flex-1 mr-4">
                    <AlertCircle size={16} className="mr-2 text-indigo-500 shrink-0 mt-0.5" />
                    <p>
                        Configure Query Types with <strong>multi-level escalation workflows</strong>. When a ticket exceeds an SLA threshold, it automatically progresses to the next escalation tier and reassigns to that tier's contact.
                    </p>
                </div>
                {!editingId && (
                    <button
                        onClick={() => handleConfigure()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold shadow-sm transition-all shrink-0 cursor-pointer"
                    >
                        <Plus size={14} /> Add Query Type
                    </button>
                )}
            </div>

            {editingId ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 shadow-indigo-100/40 space-y-6 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                <Layers className="text-indigo-600" size={20} />
                                {editingId === 'new' ? 'Create Query Type & Escalation Workflow' : 'Edit Query Type & Escalation Workflow'}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">Define category ownership and multi-tiered SLA response rules.</p>
                        </div>
                        <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Section 1: Basic Info & Primary Resolver */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Category & Initial Ownership</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Query Type Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none font-medium text-slate-700"
                                    placeholder="e.g., Payroll Setup & Tax Inquiries"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Assigned Role Filter (Optional)</label>
                                <select
                                    value={formData.assignedRole}
                                    onChange={(e) => {
                                        setFormData({ ...formData, assignedRole: e.target.value, assignedPerson: '' });
                                    }}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none font-medium text-slate-700 bg-white"
                                >
                                    <option value="">All Roles</option>
                                    {roles.map(r => (
                                        <option key={r._id} value={r._id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Initial Responsible Resolver *</label>
                                <select
                                    value={formData.assignedPerson}
                                    onChange={(e) => setFormData({ ...formData, assignedPerson: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none font-medium text-slate-700 bg-white"
                                >
                                    <option value="">Select User...</option>
                                    {users
                                        .filter(u => !formData.assignedRole || u.roles?.some(r => (r._id || r) === formData.assignedRole))
                                        .map(u => (
                                            <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.email})</option>
                                        ))
                                    }
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Auto Response */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Auto-Response Message (Optional)</label>
                        <textarea
                            value={formData.autoResponse}
                            onChange={(e) => setFormData({ ...formData, autoResponse: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none font-medium text-slate-700 resize-none bg-white"
                            rows={2}
                            placeholder="Enter a predefined response that will automatically be displayed as the initial comment upon ticket creation..."
                        />
                    </div>

                    {/* Section 3: Multi-Level Escalation Workflow Settings */}
                    <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/70 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                            <label className="flex items-center space-x-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={formData.enableEscalation}
                                    onChange={(e) => setFormData({ ...formData, enableEscalation: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                />
                                <div className="flex items-center gap-2">
                                    <ShieldAlert size={18} className={formData.enableEscalation ? "text-indigo-600" : "text-slate-400"} />
                                    <span className="text-sm font-bold text-slate-800">Enable Multi-Level Escalation Rules</span>
                                </div>
                            </label>
                            {formData.enableEscalation && (
                                <button
                                    type="button"
                                    onClick={addEscalationLevel}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                                >
                                    <Plus size={14} /> Add Escalation Tier
                                </button>
                            )}
                        </div>

                        {formData.enableEscalation && (
                            <div className="space-y-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                <p className="text-xs text-slate-500">
                                    Define consecutive escalation levels. Each tier triggers if the ticket remains unresolved after the specified working days from creation.
                                </p>

                                {/* Escalation Tiers List */}
                                <div className="space-y-3">
                                    {formData.escalationLevels.map((lvl, index) => {
                                        return (
                                            <div
                                                key={index}
                                                className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-indigo-200 transition-all relative group"
                                            >
                                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                                                            {lvl.level || index + 1}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                                            Escalation Tier {lvl.level || index + 1}
                                                        </span>
                                                        {index === 0 && (
                                                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                                                                First Escalation
                                                            </span>
                                                        )}
                                                    </div>
                                                    {formData.escalationLevels.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeEscalationLevel(index)}
                                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                                                            title="Remove Tier"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                                            SLA Threshold (Work Days) *
                                                        </label>
                                                        <div className="flex items-center rounded-lg border border-slate-200 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateEscalationLevel(index, 'escalationDays', Math.max(1, (Number(lvl.escalationDays) || 1) - 1))}
                                                                className="px-2.5 py-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors border-r border-slate-100 flex items-center justify-center cursor-pointer select-none"
                                                                title="Decrease days"
                                                            >
                                                                <Minus size={13} />
                                                            </button>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max="60"
                                                                value={lvl.escalationDays}
                                                                onChange={(e) => updateEscalationLevel(index, 'escalationDays', Math.max(1, Number(e.target.value)))}
                                                                className="w-full px-2 py-2 text-sm text-center font-bold text-slate-800 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent"
                                                            />
                                                            <span className="text-xs font-semibold text-slate-400 pr-2 select-none pointer-events-none">
                                                                Days
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateEscalationLevel(index, 'escalationDays', Math.min(60, (Number(lvl.escalationDays) || 0) + 1))}
                                                                className="px-2.5 py-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors border-l border-slate-100 flex items-center justify-center cursor-pointer select-none"
                                                                title="Increase days"
                                                            >
                                                                <Plus size={13} />
                                                            </button>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 mt-1 font-medium">
                                                            Cumulative work days from ticket creation
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                                            Escalate To Role Filter (Optional)
                                                        </label>
                                                        <select
                                                            value={lvl.escalationRole}
                                                            onChange={(e) => updateEscalationLevel(index, 'escalationRole', e.target.value)}
                                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none font-medium text-slate-700 bg-white"
                                                        >
                                                            <option value="">All Roles</option>
                                                            {roles.map(r => (
                                                                <option key={r._id} value={r._id}>{r.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                                            Designated Escalation Person *
                                                        </label>
                                                        <select
                                                            value={lvl.escalationPerson}
                                                            onChange={(e) => updateEscalationLevel(index, 'escalationPerson', e.target.value)}
                                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none font-medium text-slate-700 bg-white"
                                                        >
                                                            <option value="">Select User...</option>
                                                            {users
                                                                .filter(u => !lvl.escalationRole || u.roles?.some(r => (r._id || r) === lvl.escalationRole))
                                                                .map(u => (
                                                                    <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.email})</option>
                                                                ))
                                                            }
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Flow Preview Visualizer */}
                                <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 mb-2 flex items-center gap-1.5">
                                        <ArrowRight size={14} className="text-indigo-600" />
                                        Escalation Flow Preview
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <div className="bg-white border border-indigo-200 px-2.5 py-1.5 rounded-lg font-bold text-slate-700 shadow-xs">
                                            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Initial Resolver</span>
                                            {assignedUserObj ? `${assignedUserObj.firstName} ${assignedUserObj.lastName}` : 'Assigned User'}
                                        </div>

                                        {formData.escalationLevels.map((lvl, idx) => {
                                            const escUser = users.find(u => u._id === lvl.escalationPerson);
                                            return (
                                                <React.Fragment key={idx}>
                                                    <div className="flex flex-col items-center justify-center px-1">
                                                        <div className="flex items-center text-indigo-400">
                                                            <div className="w-2.5 h-0.5 bg-indigo-200"></div>
                                                            <ArrowRight size={14} className="text-indigo-500 shrink-0" />
                                                        </div>
                                                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100/90 px-1.5 py-0.5 rounded-full mt-0.5 shadow-2xs">
                                                            {lvl.escalationDays}d
                                                        </span>
                                                    </div>
                                                    <div className="bg-white border border-rose-200 px-2.5 py-1.5 rounded-lg font-bold text-slate-800 shadow-xs">
                                                        <span className="text-[10px] text-rose-500 block font-semibold uppercase">Level {lvl.level || idx + 1}</span>
                                                        {escUser ? `${escUser.firstName} ${escUser.lastName}` : `Level ${idx + 1} Contact`}
                                                    </div>
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-3 border-t border-slate-100 gap-2">
                        <button onClick={handleCancel} className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
                            Cancel
                        </button>
                        <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold shadow-sm transition-all cursor-pointer">
                            <Save size={14} /> Save Query Type
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="px-5 py-3">Query Type</th>
                                <th className="px-5 py-3">Initial Resolver</th>
                                <th className="px-5 py-3">Escalation Tiers</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {queryTypes.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                                        No Query Types configured. Click "Add Query Type" to create one.
                                    </td>
                                </tr>
                            )}
                            {queryTypes.map(qt => {
                                const levelsCount = Array.isArray(qt.escalationLevels) && qt.escalationLevels.length > 0
                                    ? qt.escalationLevels.length
                                    : (qt.enableEscalation && qt.escalationPerson ? 1 : 0);

                                return (
                                    <tr key={qt._id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-5 py-4 font-semibold text-slate-800 text-sm">
                                            <div>{qt.name}</div>
                                            {qt.autoResponse && (
                                                <div className="text-[10px] text-indigo-500 font-medium mt-0.5">
                                                    Auto-response configured
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-slate-600 font-medium text-sm">
                                            {qt.assignedPerson ? `${qt.assignedPerson.firstName} ${qt.assignedPerson.lastName}` : <span className="text-red-500 text-xs">Unassigned</span>}
                                        </td>
                                        <td className="px-5 py-4">
                                            {qt.enableEscalation && levelsCount > 0 ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                        {levelsCount} {levelsCount === 1 ? 'Tier' : 'Tiers'}
                                                    </span>
                                                    {Array.isArray(qt.escalationLevels) && qt.escalationLevels.length > 0 ? (
                                                        <span className="text-xs text-slate-500 font-medium">
                                                            ({qt.escalationLevels.map(l => `${l.escalationDays}d`).join(' ➔ ')})
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-500 font-medium">
                                                            ({qt.escalationDays || 2}d)
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs font-medium">Disabled</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button onClick={() => handleConfigure(qt)} className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded transition-colors mr-2 cursor-pointer">
                                                Edit
                                            </button>
                                            <button onClick={() => handleDelete(qt._id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors cursor-pointer">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default HelpdeskWorkflows;

