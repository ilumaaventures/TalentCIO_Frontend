import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/apiClient';
import { Plus, Trash2, Save, X, Check, ArrowRight, Loader, Search, Users, UserCheck, Filter, AlertCircle, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Skeleton from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/context/AuthContext';

const WorkflowSettings = () => {
    const { user } = useAuth();
    const canConfigEdit = user?.roles?.includes('Admin')
        || user?.permissions?.includes('ta.manage')
        || user?.permissions?.includes('ta.config.edit')
        || user?.permissions?.includes('*');
    
    // Tabs: 'APPROVAL' | 'INTERVIEW' | 'INTERVIEWERS'
    const [activeTab, setActiveTab] = useState('APPROVAL');

    // Shared State
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);

    // ==========================================
    // 1. APPROVAL WORKFLOWS STATE (HIRING APPROVALS)
    // ==========================================
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Create/Edit Approval State
    const [newName, setNewName] = useState('');
    const [levels, setLevels] = useState([{ levelCheck: 1, role: '', approvers: [], isFinal: false }]);
    const [editingId, setEditingId] = useState(null);

    // ==========================================
    // 2. INTERVIEW WORKFLOWS STATE
    // ==========================================
    const [interviewWorkflows, setInterviewWorkflows] = useState([]);
    const [loadingInterview, setLoadingInterview] = useState(true);
    const [showCreateInterview, setShowCreateInterview] = useState(false);
    const [actionLoadingInterview, setActionLoadingInterview] = useState(false);

    // Create/Edit Interview State
    const [newInterviewName, setNewInterviewName] = useState('');
    const [newInterviewDesc, setNewInterviewDesc] = useState('');
    const [interviewRounds, setInterviewRounds] = useState([{ levelCheck: 1, levelName: '', role: '', user: '', emailTemplateId: '', emailAccountId: '', customFields: [] }]);
    const [editingInterviewId, setEditingInterviewId] = useState(null);
    const [emailTemplates, setEmailTemplates] = useState([]);
    const [senderOptions, setSenderOptions] = useState([]);

    // ==========================================
    // 3. INTERVIEWERS POOL STATE
    // ==========================================
    const [interviewers, setInterviewers] = useState([]);
    const [loadingInterviewers, setLoadingInterviewers] = useState(true);
    const [showAddInterviewersModal, setShowAddInterviewersModal] = useState(false);
    const [savingInterviewers, setSavingInterviewers] = useState(false);
    const [interviewerSearch, setInterviewerSearch] = useState('');
    const [interviewerRoleFilter, setInterviewerRoleFilter] = useState('');
    const [selectedUserIdsForModal, setSelectedUserIdsForModal] = useState(new Set());
    const [modalSearch, setModalSearch] = useState('');
    const [modalRoleFilter, setModalRoleFilter] = useState('');

    // Init
    useEffect(() => {
        fetchWorkflows();
        fetchInterviewWorkflows();
        fetchInterviewers();
        fetchEmailTemplates();
        fetchSenderOptions();
        if (canConfigEdit) {
            fetchUsers();
            fetchRoles();
        }
    }, [canConfigEdit]);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/users');
            const userList = res.data?.success
                ? (res.data.data || [])
                : (Array.isArray(res.data) ? res.data : []);
            setUsers(userList);
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const fetchRoles = async () => {
        try {
            const res = await api.get('/admin/roles');
            setRoles(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (error) {
            console.error('Failed to fetch roles', error);
        }
    };

    const fetchEmailTemplates = async () => {
        try {
            const res = await api.get('/ta/email-templates');
            setEmailTemplates(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Failed to fetch email templates', error);
        }
    };

    const fetchSenderOptions = async () => {
        try {
            const res = await api.get('/company/email-settings/senders');
            const senderData = res.data || {};
            const options = [
                senderData.platformOption,
                ...((senderData.accounts || []).filter((a) => a.ready))
            ].filter(Boolean);
            setSenderOptions(options);
        } catch (error) {
            console.error('Failed to fetch sender options', error);
        }
    };

    // ==========================================
    // APPROVAL WORKFLOWS LOGIC
    // ==========================================
    const fetchWorkflows = async () => {
        try {
            const res = await api.get('/workflows?module=TA');
            setWorkflows(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddLevel = () => setLevels([...levels, { levelCheck: levels.length + 1, role: '', approvers: [], isFinal: false }]);
    const handleRemoveLevel = (index) => {
        const newLevels = levels.filter((_, i) => i !== index);
        setLevels(newLevels.map((l, i) => ({ ...l, levelCheck: i + 1 })));
    };
    const handleLevelChange = (index, field, value) => {
        const newLevels = [...levels];
        newLevels[index][field] = value;
        setLevels(newLevels);
    };
    const handleApproverChange = (index, userId) => {
        const newLevels = [...levels];
        const currentApprovers = newLevels[index].approvers || [];
        if (currentApprovers.includes(userId)) newLevels[index].approvers = currentApprovers.filter(id => id !== userId);
        else newLevels[index].approvers = [...currentApprovers, userId];
        setLevels(newLevels);
    };

    const handleCreateWorkflow = async () => {
        if (!newName) return toast.error('Workflow name is required');
        for (let l of levels) {
            if (!l.role) return toast.error(`Role is required for Level ${l.levelCheck}`);
            if (!l.approvers || l.approvers.length === 0) return toast.error(`Select at least one approver for Level ${l.levelCheck}`);
        }

        try {
            setActionLoading(true);
            if (editingId) {
                await api.put(`/workflows/${editingId}`, { name: newName, levels, module: 'TA' });
                toast.success('Hiring workflow updated');
            } else {
                await api.post('/workflows', { name: newName, levels, module: 'TA' });
                toast.success('Hiring workflow created');
            }
            setShowCreate(false);
            setEditingId(null);
            setNewName('');
            setLevels([{ levelCheck: 1, role: '', approvers: [], isFinal: false }]);
            fetchWorkflows();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEdit = (wf) => {
        setEditingId(wf._id);
        setNewName(wf.name);
        setLevels(wf.levels.map(l => ({
            levelCheck: l.levelCheck,
            role: l.role ? (l.role._id || l.role) : '',
            approvers: l.approvers ? l.approvers.map(a => a._id || a) : [],
            isFinal: l.isFinal
        })));
        setShowCreate(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this workflow?')) return;
        try {
            await api.delete(`/workflows/${id}`);
            toast.success('Workflow deleted');
            fetchWorkflows();
        } catch {
            toast.error('Failed to delete');
        }
    };

    // ==========================================
    // INTERVIEW WORKFLOWS LOGIC
    // ==========================================
    const fetchInterviewWorkflows = async () => {
        try {
            const res = await api.get('/ta/interview-workflows');
            setInterviewWorkflows(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingInterview(false);
        }
    };

    const handleAddInterviewRound = () => setInterviewRounds([...interviewRounds, { levelCheck: interviewRounds.length + 1, levelName: '', role: '', user: '', emailTemplateId: '', customFields: [] }]);
    const handleRemoveInterviewRound = (index) => {
        const newRounds = interviewRounds.filter((_, i) => i !== index);
        setInterviewRounds(newRounds.map((r, i) => ({ ...r, levelCheck: i + 1 })));
    };
    const handleInterviewRoundChange = (index, field, value) => {
        const newRounds = [...interviewRounds];
        newRounds[index][field] = value;
        setInterviewRounds(newRounds);
    };

    const handleAddRoundCustomField = (roundIndex) => {
        const newRounds = [...interviewRounds];
        const fields = newRounds[roundIndex].customFields || [];
        newRounds[roundIndex].customFields = [...fields, { key: '', value: '' }];
        setInterviewRounds(newRounds);
    };

    const handleRemoveRoundCustomField = (roundIndex, fieldIndex) => {
        const newRounds = [...interviewRounds];
        newRounds[roundIndex].customFields = (newRounds[roundIndex].customFields || []).filter((_, i) => i !== fieldIndex);
        setInterviewRounds(newRounds);
    };

    const handleRoundCustomFieldChange = (roundIndex, fieldIndex, keyOrValue, text) => {
        const newRounds = [...interviewRounds];
        const fields = [...(newRounds[roundIndex].customFields || [])];
        fields[fieldIndex] = { ...fields[fieldIndex], [keyOrValue]: text };
        newRounds[roundIndex].customFields = fields;
        setInterviewRounds(newRounds);
    };

    const handleCreateInterviewWorkflow = async () => {
        if (!newInterviewName) return toast.error('Interview template name is required');
        for (let r of interviewRounds) {
            if (!r.levelName) return toast.error(`Round Title is required for Round ${r.levelCheck}`);
        }

        try {
            setActionLoadingInterview(true);
            const cleanedRounds = interviewRounds.map(r => ({
                ...r,
                customFields: (r.customFields || []).filter(cf => cf.key && cf.key.trim())
            }));
            if (editingInterviewId) {
                await api.put(`/ta/interview-workflows/${editingInterviewId}`, { name: newInterviewName, description: newInterviewDesc, rounds: cleanedRounds });
                toast.success('Interview Workflow updated');
            } else {
                await api.post('/ta/interview-workflows', { name: newInterviewName, description: newInterviewDesc, rounds: cleanedRounds });
                toast.success('Interview Workflow created');
            }
            setShowCreateInterview(false);
            setEditingInterviewId(null);
            setNewInterviewName('');
            setNewInterviewDesc('');
            setInterviewRounds([{ levelCheck: 1, levelName: '', role: '', user: '', emailTemplateId: '', emailAccountId: '', cc: '', bcc: '', customFields: [] }]);
            fetchInterviewWorkflows();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save');
        } finally {
            setActionLoadingInterview(false);
        }
    };

    const handleEditInterview = (wf) => {
        setEditingInterviewId(wf._id);
        setNewInterviewName(wf.name);
        setNewInterviewDesc(wf.description || '');
        setInterviewRounds(wf.rounds.map(r => ({
            levelCheck: r.levelCheck,
            levelName: r.levelName,
            role: r.role ? (r.role._id || r.role) : '',
            user: r.user ? (r.user._id || r.user) : '',
            emailTemplateId: r.emailTemplateId ? (r.emailTemplateId._id || r.emailTemplateId) : '',
            emailAccountId: r.emailAccountId || '',
            cc: r.cc || '',
            bcc: r.bcc || '',
            customFields: Array.isArray(r.customFields) ? r.customFields.map(cf => ({ key: cf.key || '', value: cf.value || '' })) : []
        })));
        setShowCreateInterview(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteInterview = async (id) => {
        if (!window.confirm('Are you sure you want to delete this Interview Workflow?')) return;
        try {
            await api.delete(`/ta/interview-workflows/${id}`);
            toast.success('Interview workflow deleted');
            fetchInterviewWorkflows();
        } catch {
            toast.error('Failed to delete');
        }
    };

    // ==========================================
    // 3. INTERVIEWERS POOL LOGIC
    // ==========================================
    const fetchInterviewers = async () => {
        try {
            setLoadingInterviewers(true);
            const res = await api.get('/ta/interviewers');
            const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setInterviewers(data);
        } catch (error) {
            console.error('Failed to fetch interviewers:', error);
        } finally {
            setLoadingInterviewers(false);
        }
    };

    const handleOpenAddInterviewersModal = () => {
        // Pre-select existing interviewers in the modal
        const currentIds = new Set(interviewers.map(i => i._id));
        setSelectedUserIdsForModal(currentIds);
        setModalSearch('');
        setModalRoleFilter('');
        setShowAddInterviewersModal(true);
    };

    const handleToggleModalUser = (userId) => {
        setSelectedUserIdsForModal(prev => {
            const next = new Set(prev);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            return next;
        });
    };

    const handleSelectAllModalUsers = (usersToSelect) => {
        setSelectedUserIdsForModal(prev => {
            const next = new Set(prev);
            usersToSelect.forEach(u => next.add(u._id));
            return next;
        });
    };

    const handleDeselectAllModalUsers = (usersToDeselect) => {
        setSelectedUserIdsForModal(prev => {
            const next = new Set(prev);
            usersToDeselect.forEach(u => next.delete(u._id));
            return next;
        });
    };

    const handleSaveInterviewersModal = async () => {
        try {
            setSavingInterviewers(true);
            const userIdsArray = Array.from(selectedUserIdsForModal);
            await api.put('/ta/interviewers', { userIds: userIdsArray });
            toast.success('Interviewers list updated successfully');
            setShowAddInterviewersModal(false);
            await Promise.all([fetchInterviewers(), fetchUsers()]);
        } catch (error) {
            console.error('Failed to save interviewers:', error);
            toast.error(error.response?.data?.message || 'Failed to update interviewers');
        } finally {
            setSavingInterviewers(false);
        }
    };

    const handleRemoveInterviewer = async (userId, userName) => {
        if (!window.confirm(`Are you sure you want to remove ${userName || 'this user'} from the interviewers list?`)) return;
        try {
            await api.delete(`/ta/interviewers/${userId}`);
            toast.success('Interviewer removed successfully');
            await Promise.all([fetchInterviewers(), fetchUsers()]);
        } catch (error) {
            console.error('Failed to remove interviewer:', error);
            toast.error(error.response?.data?.message || 'Failed to remove interviewer');
        }
    };

    // Filtered interviewers table list
    const filteredInterviewers = useMemo(() => {
        return interviewers.filter(interviewer => {
            const searchLower = interviewerSearch.trim().toLowerCase();
            const fullName = `${interviewer.firstName || ''} ${interviewer.lastName || ''}`.toLowerCase();
            const email = (interviewer.email || '').toLowerCase();
            const employeeCode = (interviewer.employeeCode || '').toLowerCase();
            const matchesSearch = !searchLower || fullName.includes(searchLower) || email.includes(searchLower) || employeeCode.includes(searchLower);

            const roleNames = interviewer.roles?.map(r => (typeof r === 'string' ? r : r.name || '')) || [];
            const matchesRole = !interviewerRoleFilter || roleNames.some(r => r === interviewerRoleFilter || r.toLowerCase() === interviewerRoleFilter.toLowerCase());

            return matchesSearch && matchesRole;
        });
    }, [interviewers, interviewerSearch, interviewerRoleFilter]);

    // Filtered modal users list
    const filteredModalUsers = useMemo(() => {
        return users.filter(u => {
            if (u.isActive === false) return false;
            const searchLower = modalSearch.trim().toLowerCase();
            const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
            const email = (u.email || '').toLowerCase();
            const employeeCode = (u.employeeCode || '').toLowerCase();
            const matchesSearch = !searchLower || fullName.includes(searchLower) || email.includes(searchLower) || employeeCode.includes(searchLower);

            const roleNames = u.roles?.map(r => (typeof r === 'string' ? r : r.name || '')) || [];
            const matchesRole = !modalRoleFilter || roleNames.some(r => r === modalRoleFilter || r.toLowerCase() === modalRoleFilter.toLowerCase());

            return matchesSearch && matchesRole;
        });
    }, [users, modalSearch, modalRoleFilter]);

    return (
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header Area */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">TA Workflows</h1>
                    <p className="text-slate-500">Configure hiring rules, candidate interview templates, and interviewers</p>
                </div>
                {canConfigEdit && activeTab === 'APPROVAL' ? (
                    <button onClick={() => setShowCreate(!showCreate)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors">
                        {showCreate ? <X size={18} /> : <Plus size={18} />}
                        {showCreate ? 'Cancel' : 'Create Approval Workflow'}
                    </button>
                ) : canConfigEdit && activeTab === 'INTERVIEW' ? (
                    <button onClick={() => setShowCreateInterview(!showCreateInterview)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors">
                        {showCreateInterview ? <X size={18} /> : <Plus size={18} />}
                        {showCreateInterview ? 'Cancel' : 'Create Interview Workflow'}
                    </button>
                ) : canConfigEdit && activeTab === 'INTERVIEWERS' ? (
                    <button onClick={handleOpenAddInterviewersModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors">
                        <Plus size={18} />
                        Manage Interviewers
                    </button>
                ) : null}
            </div>

            {!canConfigEdit && (
                <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
                    <AlertCircle size={18} className="flex-shrink-0" />
                    <span>Workflows are available in read-only mode. You can review existing approval workflows, templates, and interviewers, but you cannot modify them.</span>
                </div>
            )}

            {/* Tabs Navigation */}
            <div className="flex gap-4 border-b border-slate-200 mb-6 font-medium">
                <button
                    onClick={() => setActiveTab('APPROVAL')}
                    className={`pb-3 px-4 transition-colors ${activeTab === 'APPROVAL' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Hiring Approvals
                </button>
                <button
                    onClick={() => setActiveTab('INTERVIEW')}
                    className={`pb-3 px-4 transition-colors ${activeTab === 'INTERVIEW' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Candidate Interviews
                </button>
                <button
                    onClick={() => setActiveTab('INTERVIEWERS')}
                    className={`pb-3 px-4 transition-colors ${activeTab === 'INTERVIEWERS' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Interviewers
                </button>
            </div>

            {/* =========================================================================
                                APPROVAL TAB CONTENT
            ========================================================================== */}
            {activeTab === 'APPROVAL' && (
                <>
                    {/* Create / Edit Form */}
                    {showCreate && (
                        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-lg">{editingId ? 'Edit Hiring Workflow' : 'New Hiring Workflow'}</h3>
                                {editingId && (
                                    <button onClick={() => { setEditingId(null); setNewName(''); setLevels([{ levelCheck: 1, role: '', approvers: [], isFinal: false }]); setShowCreate(false); }} className="text-slate-400 hover:text-slate-600">
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Workflow Name</label>
                                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" placeholder="e.g., Standard Hiring Approval" />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Approval Levels</label>
                                <div className="space-y-3">
                                    {levels.map((level, index) => {
                                        const roleUsers = users.filter(u => u.roles && u.roles.some(r => r._id === level.role || r === level.role || r.name === level.role));
                                        return (
                                            <div key={index} className="flex flex-col gap-3 bg-slate-50 p-4 rounded-md border border-slate-200">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{level.levelCheck}</div>
                                                        <span className="font-semibold text-sm text-slate-700">Level {level.levelCheck}</span>
                                                    </div>
                                                    {index > 0 && <button onClick={() => handleRemoveLevel(index)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
                                                        <select value={level.role || ''} onChange={(e) => { handleLevelChange(index, 'role', e.target.value); handleLevelChange(index, 'approvers', []); }} className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm">
                                                            <option value="">Select Role</option>
                                                            {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">Approvers (Select Multiple)</label>
                                                        <div className="border border-slate-300 rounded-md max-h-32 overflow-y-auto bg-white p-2">
                                                            {level.role ? (
                                                                roleUsers.length > 0 ? (
                                                                    roleUsers.map(u => (
                                                                        <div key={u._id} className="flex items-center gap-2 mb-1 last:mb-0">
                                                                            <input type="checkbox" id={`lvl-${index}-u-${u._id}`} checked={level.approvers?.includes(u._id)} onChange={() => handleApproverChange(index, u._id)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                                            <label htmlFor={`lvl-${index}-u-${u._id}`} className="text-sm text-slate-700 cursor-pointer select-none">{u.firstName} {u.lastName}</label>
                                                                        </div>
                                                                    ))
                                                                ) : <p className="text-xs text-slate-400 italic p-1">No users found with this role.</p>
                                                            ) : <p className="text-xs text-slate-400 italic p-1">So select a role first.</p>}
                                                        </div>
                                                        <p className="text-xs text-slate-400 mt-1">{level.approvers?.length || 0} selected</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button onClick={handleAddLevel} className="mt-3 text-sm text-blue-600 font-medium hover:text-blue-800 flex items-center gap-1"><Plus size={16} /> Add Level</button>
                            </div>

                            <div className="flex justify-end">
                                <button onClick={handleCreateWorkflow} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50">
                                    {actionLoading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />} Save Hiring Workflow
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Data Table */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                        {loading ? (
                            <div className="p-6">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full mb-3 last:mb-0" />
                                ))}
                            </div>
                        ) : workflows.length === 0 ? (
                            <div className="p-6 text-center text-slate-500">No hiring workflows found. Add one above.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="font-semibold text-slate-600 text-sm px-6 py-4">Workflow Name</th>
                                            <th className="font-semibold text-slate-600 text-sm px-6 py-4">Created Date</th>
                                            <th className="font-semibold text-slate-600 text-sm px-6 py-4">Status</th>
                                            <th className="font-semibold text-slate-600 text-sm px-6 py-4">Levels</th>
                                            <th className="font-semibold text-slate-600 text-sm px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {workflows.map(wf => (
                                            <tr key={wf._id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 align-middle"><div className="font-medium text-slate-800">{wf.name}</div></td>
                                                <td className="px-6 py-4 text-sm text-slate-500 align-middle">{new Date(wf.createdAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 align-middle">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${wf.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                        {wf.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex items-center gap-2 overflow-x-auto max-w-[400px] scrollbar-hide py-1">
                                                        {wf.levels.map((lvl, i) => (
                                                            <React.Fragment key={i}>
                                                                <div className="bg-white border border-slate-200 rounded px-2 py-1 text-xs whitespace-nowrap shadow-sm flex items-center gap-1.5" title={lvl.approvers?.map(a => `${a.firstName} ${a.lastName}`).join(', ')}>
                                                                    <span className="font-semibold text-blue-600">L{lvl.levelCheck}</span>
                                                                    <div className="h-3 w-px bg-slate-300"></div>
                                                                    <span className="text-slate-700 font-medium">{lvl.role?.name || 'Role'}</span>
                                                                </div>
                                                                {i < wf.levels.length - 1 && <ArrowRight size={14} className="text-slate-300 flex-shrink-0" />}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right align-middle">
                                                    {canConfigEdit ? (
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => handleEdit(wf)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit Workflow">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                            </button>
                                                            <button onClick={() => handleDelete(wf._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Workflow">
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-semibold text-slate-400">Read only</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* =========================================================================
                                INTERVIEW TAB CONTENT
            ========================================================================== */}
            {activeTab === 'INTERVIEW' && (
                <>
                    {/* Create / Edit Form */}
                    {showCreateInterview && (
                        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-lg">{editingInterviewId ? 'Edit Interview Workflow' : 'New Interview Workflow'}</h3>
                                {editingInterviewId && (
                                    <button onClick={() => { setEditingInterviewId(null); setNewInterviewName(''); setNewInterviewDesc(''); setInterviewRounds([{ levelCheck: 1, levelName: '', role: '', user: '', emailTemplateId: '', customFields: [] }]); setShowCreateInterview(false); }} className="text-slate-400 hover:text-slate-600">
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
                                    <input type="text" value={newInterviewName} onChange={(e) => setNewInterviewName(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" placeholder="e.g., Standard Engineering Setup" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                                    <input type="text" value={newInterviewDesc} onChange={(e) => setNewInterviewDesc(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" placeholder="e.g., Use this for generic backend applicants" />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Sequential Interview Rounds</label>
                                <div className="space-y-4">
                                    {interviewRounds.map((round, index) => {
                                        // Filter designated user from interviewers pool if available, otherwise from company users
                                        const availableUserPool = interviewers.length > 0 ? interviewers : users;
                                        const roundUsers = availableUserPool.filter(u => !round.role || u.roles?.some(r => r._id === round.role || r === round.role || r.name === round.role));

                                        return (
                                            <div key={index} className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">{round.levelCheck}</div>
                                                        <span className="font-semibold text-sm text-slate-700">Round {round.levelCheck}</span>
                                                    </div>
                                                    {index > 0 && <button onClick={() => handleRemoveInterviewRound(index)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">Round Title</label>
                                                        <input type="text" value={round.levelName} onChange={(e) => handleInterviewRoundChange(index, 'levelName', e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm outline-none focus:border-indigo-500" placeholder="e.g., L1 Technical" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">Target Evaluator Role (Optional)</label>
                                                        <select value={round.role || ''} onChange={(e) => { handleInterviewRoundChange(index, 'role', e.target.value); handleInterviewRoundChange(index, 'user', ''); }} className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm">
                                                            <option value="">Any Role</option>
                                                            {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">
                                                            Designated User (Optional)
                                                            {interviewers.length > 0 && <span className="ml-1 text-[10px] text-indigo-600 font-semibold">(From Interviewers)</span>}
                                                        </label>
                                                        <select value={round.user || ''} onChange={(e) => handleInterviewRoundChange(index, 'user', e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm">
                                                            <option value="">Any User</option>
                                                            {roundUsers.map(u => (
                                                                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">Default Email Template</label>
                                                        <select value={round.emailTemplateId || ''} onChange={(e) => handleInterviewRoundChange(index, 'emailTemplateId', e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm">
                                                            <option value="">Standard Invite</option>
                                                            {emailTemplates.map(t => (
                                                                <option key={t._id} value={t._id}>{t.name} ({t.category || 'General'})</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {senderOptions.length > 0 && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-500 mb-1">Default Sender Account</label>
                                                            <select value={round.emailAccountId || ''} onChange={(e) => handleInterviewRoundChange(index, 'emailAccountId', e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm">
                                                                <option value="">Company Default</option>
                                                                {senderOptions.map(option => (
                                                                    <option key={option._id} value={option._id}>
                                                                        {option.name} – {option.fromAddress}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">Default CC Emails (Optional)</label>
                                                        <input type="text" placeholder="e.g. hr@company.com" value={round.cc || ''} onChange={(e) => handleInterviewRoundChange(index, 'cc', e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm outline-none focus:border-indigo-500" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">Default BCC Emails (Optional)</label>
                                                        <input type="text" placeholder="e.g. audit@company.com" value={round.bcc || ''} onChange={(e) => handleInterviewRoundChange(index, 'bcc', e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm outline-none focus:border-indigo-500" />
                                                    </div>
                                                </div>

                                                {/* Round Custom Fields */}
                                                <div className="border-t border-slate-200/80 pt-2.5 mt-1">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                                            Default Custom Fields (Key / Value)
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddRoundCustomField(index)}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                                                        >
                                                            <Plus size={12} /> Add Field
                                                        </button>
                                                    </div>
                                                    {(!round.customFields || round.customFields.length === 0) ? (
                                                        <p className="text-[11px] text-slate-400 italic">No custom fields configured for this round.</p>
                                                    ) : (
                                                        <div className="space-y-1.5">
                                                            {round.customFields.map((field, fieldIdx) => (
                                                                <div key={fieldIdx} className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Key (e.g. Meeting Link)"
                                                                        value={field.key || ''}
                                                                        onChange={(e) => handleRoundCustomFieldChange(index, fieldIdx, 'key', e.target.value)}
                                                                        className="w-1/3 px-2.5 py-1 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Default Value (e.g. https://meet.google.com/xyz)"
                                                                        value={field.value || ''}
                                                                        onChange={(e) => handleRoundCustomFieldChange(index, fieldIdx, 'value', e.target.value)}
                                                                        className="flex-1 px-2.5 py-1 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveRoundCustomField(index, fieldIdx)}
                                                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                        title="Remove field"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button onClick={handleAddInterviewRound} className="mt-3 text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1"><Plus size={16} /> Add Round</button>
                            </div>

                            <div className="flex justify-end">
                                <button onClick={handleCreateInterviewWorkflow} disabled={actionLoadingInterview} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 font-medium">
                                    {actionLoadingInterview ? <Loader size={18} className="animate-spin" /> : <Save size={18} />} Save Interview Workflow
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Data Table */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                        {loadingInterview ? (
                            <div className="p-6">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full mb-3 last:mb-0" />
                                ))}
                            </div>
                        ) : interviewWorkflows.length === 0 ? (
                            <div className="p-6 text-center text-slate-500">No interview workflows found. Add one above.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="font-semibold text-slate-600 text-sm px-6 py-4">Template Name</th>
                                            <th className="font-semibold text-slate-600 text-sm px-6 py-4">Created Date</th>
                                            <th className="font-semibold text-slate-600 text-sm px-6 py-4">Sequence / Target Roles</th>
                                            <th className="font-semibold text-slate-600 text-sm px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {interviewWorkflows.map(wf => (
                                            <tr key={wf._id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="font-medium text-slate-800">{wf.name}</div>
                                                    <div className="text-xs text-slate-500">{wf.description}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500 align-middle">{new Date(wf.createdAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex items-center gap-2 overflow-x-auto max-w-[400px] scrollbar-hide py-1">
                                                        {wf.rounds.map((round, i) => (
                                                            <React.Fragment key={i}>
                                                                <div className="bg-white border border-slate-200 rounded px-2 py-1 text-xs whitespace-nowrap shadow-sm flex flex-col gap-0.5" title={round.role?.name || 'Any Role'}>
                                                                    <div className="font-semibold text-indigo-700">{round.levelName}</div>
                                                                    <div className="text-slate-500 text-[10px] uppercase font-medium">{round.role?.name || 'Any Role'}</div>
                                                                </div>
                                                                {i < wf.rounds.length - 1 && <ArrowRight size={14} className="text-slate-300 flex-shrink-0" />}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right align-middle">
                                                    {canConfigEdit ? (
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => handleEditInterview(wf)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit Template">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                            </button>
                                                            <button onClick={() => handleDeleteInterview(wf._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Template">
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-semibold text-slate-400">Read only</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* =========================================================================
                                INTERVIEWERS TAB CONTENT
            ========================================================================== */}
            {activeTab === 'INTERVIEWERS' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    {/* Controls & Search Toolbar */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3 flex-1">
                            <div className="relative flex-1 min-w-[220px] max-w-md">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search interviewers by name, email, code..."
                                    value={interviewerSearch}
                                    onChange={(e) => setInterviewerSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                                />
                            </div>

                            <div className="relative min-w-[160px]">
                                <select
                                    value={interviewerRoleFilter}
                                    onChange={(e) => setInterviewerRoleFilter(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 text-slate-700"
                                >
                                    <option value="">All Roles</option>
                                    {roles.map(r => (
                                        <option key={r._id} value={r.name}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-xs text-slate-500 font-medium px-3 py-1.5 bg-slate-100 rounded-lg">
                                Showing <span className="font-bold text-slate-800">{filteredInterviewers.length}</span> of <span className="font-bold text-slate-800">{interviewers.length}</span> Interviewers
                            </div>
                            {canConfigEdit && (
                                <button
                                    onClick={handleOpenAddInterviewersModal}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition-colors"
                                >
                                    <Plus size={16} /> Add / Manage
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Interviewers Data Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {loadingInterviewers ? (
                            <div className="p-6">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-14 w-full mb-3 last:mb-0 rounded-lg" />
                                ))}
                            </div>
                        ) : interviewers.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
                                    <Users size={32} />
                                </div>
                                <h3 className="text-base font-bold text-slate-800 mb-1">No Interviewers Added Yet</h3>
                                <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">
                                    Choose team members from your company user list to designate them as interviewers. Only designated interviewers will appear when assigning interview rounds.
                                </p>
                                {canConfigEdit && (
                                    <button
                                        onClick={handleOpenAddInterviewersModal}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 shadow-sm transition-colors"
                                    >
                                        <Plus size={18} /> Choose Interviewers
                                    </button>
                                )}
                            </div>
                        ) : filteredInterviewers.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                No interviewers match your search criteria. Try clearing the search or filters.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="font-semibold text-slate-600 text-xs uppercase tracking-wider px-6 py-3.5">Interviewer</th>
                                            <th className="font-semibold text-slate-600 text-xs uppercase tracking-wider px-6 py-3.5">Role(s)</th>
                                            <th className="font-semibold text-slate-600 text-xs uppercase tracking-wider px-6 py-3.5">Department & Designation</th>
                                            <th className="font-semibold text-slate-600 text-xs uppercase tracking-wider px-6 py-3.5">Status</th>
                                            <th className="font-semibold text-slate-600 text-xs uppercase tracking-wider px-6 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {filteredInterviewers.map(interviewer => {
                                            const roleNames = interviewer.roles?.map(r => (typeof r === 'string' ? r : r.name || '')) || [];
                                            const deptName = interviewer.departmentRef?.name || interviewer.department || '';
                                            const desigTitle = interviewer.designationRef?.title || '';
                                            const initials = `${(interviewer.firstName || '')[0] || ''}${(interviewer.lastName || '')[0] || ''}`.toUpperCase() || 'U';

                                            return (
                                                <tr key={interviewer._id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="px-6 py-4 align-middle">
                                                        <div className="flex items-center gap-3">
                                                            {interviewer.profilePicture ? (
                                                                <img src={interviewer.profilePicture} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                                                            ) : (
                                                                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200/60">
                                                                    {initials}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                                                    <span>{interviewer.firstName} {interviewer.lastName}</span>
                                                                    {interviewer.employeeCode && (
                                                                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                                                            {interviewer.employeeCode}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-slate-500">{interviewer.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 align-middle">
                                                        <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                                                            {roleNames.length > 0 ? (
                                                                roleNames.map((roleName, rIdx) => (
                                                                    <span key={rIdx} className="text-xs px-2.5 py-0.5 rounded-md font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                                                        {roleName}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-slate-400 italic">No role assigned</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 align-middle">
                                                        <div className="text-sm text-slate-700 font-medium">{deptName || '—'}</div>
                                                        {desigTitle && <div className="text-xs text-slate-500">{desigTitle}</div>}
                                                    </td>
                                                    <td className="px-6 py-4 align-middle">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                            Active Interviewer
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right align-middle">
                                                        {canConfigEdit ? (
                                                            <button
                                                                onClick={() => handleRemoveInterviewer(interviewer._id, `${interviewer.firstName} ${interviewer.lastName}`)}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Remove Interviewer"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs font-semibold text-slate-400">Read only</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* =========================================================================
                            ADD / MANAGE INTERVIEWERS MODAL
            ========================================================================== */}
            {showAddInterviewersModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Manage Interviewers</h3>
                                <p className="text-xs text-slate-500">Select users from your organization who will be available to conduct candidate interviews.</p>
                            </div>
                            <button
                                onClick={() => setShowAddInterviewersModal(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Search & Filters */}
                        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search users by name, email, code..."
                                    value={modalSearch}
                                    onChange={(e) => setModalSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="min-w-[150px]">
                                <select
                                    value={modalRoleFilter}
                                    onChange={(e) => setModalRoleFilter(e.target.value)}
                                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                >
                                    <option value="">All Roles</option>
                                    {roles.map(r => (
                                        <option key={r._id} value={r.name}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Selection status & Select All / Deselect All bar */}
                        <div className="px-6 py-2.5 bg-blue-50/60 border-b border-blue-100/80 flex items-center justify-between text-xs">
                            <div className="font-semibold text-blue-900">
                                {selectedUserIdsForModal.size} user{selectedUserIdsForModal.size !== 1 ? 's' : ''} selected as interviewers
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleSelectAllModalUsers(filteredModalUsers)}
                                    className="text-blue-700 hover:text-blue-900 font-semibold hover:underline"
                                >
                                    Select All Filtered ({filteredModalUsers.length})
                                </button>
                                <span className="text-blue-300">|</span>
                                <button
                                    type="button"
                                    onClick={() => handleDeselectAllModalUsers(filteredModalUsers)}
                                    className="text-slate-600 hover:text-slate-800 font-medium hover:underline"
                                >
                                    Deselect Filtered
                                </button>
                            </div>
                        </div>

                        {/* Modal Users List */}
                        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 max-h-[50vh]">
                            {filteredModalUsers.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-sm">
                                    No users found matching your search.
                                </div>
                            ) : (
                                filteredModalUsers.map(u => {
                                    const isSelected = selectedUserIdsForModal.has(u._id);
                                    const roleNames = u.roles?.map(r => (typeof r === 'string' ? r : r.name || '')) || [];
                                    const initials = `${(u.firstName || '')[0] || ''}${(u.lastName || '')[0] || ''}`.toUpperCase() || 'U';

                                    return (
                                        <div
                                            key={u._id}
                                            onClick={() => handleToggleModalUser(u._id)}
                                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {}} // Handled by container click
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                                {u.profilePicture ? (
                                                    <img src={u.profilePicture} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                                                        {initials}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                                        <span>{u.firstName} {u.lastName}</span>
                                                        {u.employeeCode && (
                                                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                                                                {u.employeeCode}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{u.email}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {roleNames.slice(0, 2).map((roleName, rIdx) => (
                                                    <span key={rIdx} className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                                                        {roleName}
                                                    </span>
                                                ))}
                                                {isSelected && (
                                                    <span className="text-[11px] font-bold text-blue-600 px-2 py-0.5 rounded bg-blue-100 flex items-center gap-1">
                                                        <Check size={12} /> Interviewer
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                            <div className="text-xs text-slate-500">
                                {selectedUserIdsForModal.size} interviewer{selectedUserIdsForModal.size !== 1 ? 's' : ''} will be configured
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddInterviewersModal(false)}
                                    disabled={savingInterviewers}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveInterviewersModal}
                                    disabled={savingInterviewers}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                                >
                                    {savingInterviewers ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                                    Save Interviewers
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkflowSettings;
