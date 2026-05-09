import React, { useCallback, useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { Plus, Check, Shield } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { createCachePayload, isCacheFresh, readSessionCache } from '../utils/cache';

const LEGACY_HIDDEN_PERMISSION_KEYS = new Set(['ta.analytics.requisition']);
const TA_PERMISSION_MODULE = 'TALENT ACQUISITION';
const TA_PERMISSION_SUB_TABS = [
    { id: 'all', label: 'All' },
    { id: 'requisition', label: 'Requisition' },
    { id: 'candidate', label: 'Candidates' },
    { id: 'manage', label: 'Manage' }
];

const isVisiblePermission = (permission) =>
    permission &&
    permission.key !== '*' &&
    permission.isDeprecated !== true &&
    !LEGACY_HIDDEN_PERMISSION_KEYS.has(permission.key);

const getTAPermissionCategory = (permissionKey = '') => {
    if (permissionKey.startsWith('ta.requisition.')) return 'requisition';
    if (permissionKey.startsWith('ta.candidate.')) return 'candidate';
    return 'manage';
};

const filterTAPermissionsByTab = (permissionsList = [], activeTab = 'all') => {
    if (activeTab === 'all') {
        return permissionsList;
    }

    return permissionsList.filter((permission) => getTAPermissionCategory(permission.key) === activeTab);
};

const getTAPermissionSections = (permissionsList = [], activeTab = 'all') => {
    const candidatePermissions = permissionsList.filter((permission) => permission.key.startsWith('ta.candidate.'));

    if (activeTab === 'candidate') {
        return [
            { id: 'candidate', label: 'Candidate Permissions', permissions: candidatePermissions }
        ].filter((section) => section.permissions.length > 0);
    }

    if (activeTab === 'all') {
        const requisitionPermissions = permissionsList.filter((permission) => permission.key.startsWith('ta.requisition.'));
        const managePermissions = permissionsList.filter((permission) => (
            !permission.key.startsWith('ta.requisition.')
            && !permission.key.startsWith('ta.candidate.')
        ));

        return [
            { id: 'requisition', label: 'Requisition Permissions', permissions: requisitionPermissions },
            { id: 'candidate', label: 'Candidate Permissions', permissions: candidatePermissions },
            { id: 'manage', label: 'Manage Permissions', permissions: managePermissions }
        ].filter((section) => section.permissions.length > 0);
    }

    return [{ id: activeTab, label: '', permissions: permissionsList }];
};

const sanitizeGroupedPermissions = (groupedPermissions = {}) =>
    Object.entries(groupedPermissions).reduce((accumulator, [moduleName, perms]) => {
        const visiblePermissions = (perms || []).filter(isVisiblePermission);
        if (visiblePermissions.length > 0) {
            accumulator[moduleName] = visiblePermissions;
        }
        return accumulator;
    }, {});

const sanitizeRoles = (roles = []) =>
    roles.map(role => ({
        ...role,
        permissions: (role.permissions || []).filter(isVisiblePermission)
    }));

const Roles = () => {
    const { user, refreshProfile } = useAuth();
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState({}); // Grouped permissions
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const [roleName, setRoleName] = useState('');
    const [selectedPerms, setSelectedPerms] = useState([]);
    const [viewOnly, setViewOnly] = useState(false);
    const [taPermissionTab, setTaPermissionTab] = useState('all');
    const initialFetchDoneRef = useRef(false);
    const ROLE_CACHE_TTL_MS = 45 * 1000;
    const cacheKey = `role_data_${user?._id}`;

    const fetchData = useCallback(async ({ force = false } = {}) => {
        try {
            // When force=true, skip session cache entirely
            const cachedData = force ? null : readSessionCache(cacheKey);

            if (cachedData) {
                const data = cachedData.data || cachedData;
                setRoles(sanitizeRoles(data.roles || []));
                setPermissions(sanitizeGroupedPermissions(data.permissions || {}));
                setLoading(false);
                if (isCacheFresh(cachedData, ROLE_CACHE_TTL_MS)) return;
            }

            // Cache-bust browser HTTP cache when force=true (backend sets max-age=45)
            const bootstrapRes = await api.get('/admin/roles/bootstrap', force ? {
                headers: { 'Cache-Control': 'no-cache' },
                params: { _t: Date.now() }
            } : undefined);
            const rolesData = sanitizeRoles(bootstrapRes.data?.roles || []);
            const permsData = sanitizeGroupedPermissions(bootstrapRes.data?.permissions || {});

            // Fingerprint check - include total number of permissions (sum across all modules)
            const totalPerms = Object.values(permsData).reduce((sum, modulePerms) => sum + modulePerms.length, 0);
            const newFingerprint = JSON.stringify({
                r: rolesData.length,
                p: Object.keys(permsData).length,
                tp: totalPerms,
                lr: rolesData[0]?._id
            });
            const oldFingerprint = cachedData?.fingerprint || null;

            setRoles(rolesData);
            setPermissions(permsData);

            if (newFingerprint !== oldFingerprint || force) {
                const minimalRoles = rolesData.map(role => ({
                    _id: role._id,
                    name: role.name,
                    isSystem: role.isSystem,
                    permissions: role.permissions.map(p => ({
                        _id: p._id,
                        key: p.key,
                        description: p.description,
                        module: p.module
                    }))
                }));

                const minimalPerms = {};
                for (const module in permsData) {
                    minimalPerms[module] = permsData[module].map(p => ({
                        _id: p._id,
                        key: p.key,
                        description: p.description,
                        module: p.module
                    }));
                }

                const payload = createCachePayload({
                    roles: minimalRoles,
                    permissions: minimalPerms
                }, newFingerprint);

                sessionStorage.setItem(cacheKey, JSON.stringify(payload));
            }
        } catch {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [ROLE_CACHE_TTL_MS, cacheKey]);

    const isPermissionVisible = (perm) => {
        if (!perm || !perm.key) return false;
        const key = perm.key;
        let groupName = perm.module || 'OTHER';

        // Replicate backend grouping logic
        if (key.startsWith('business_unit.')) groupName = 'BUSINESS UNITS';
        else if (key.startsWith('client.')) groupName = 'CLIENTS';
        else if (key.startsWith('task.')) groupName = 'TASKS';
        else if (key.startsWith('project.') || key.startsWith('module.')) groupName = 'PROJECTS';
        else if (key.startsWith('user.')) groupName = 'USER MANAGEMENT';
        else if (key.startsWith('role.')) groupName = 'ROLE MANAGEMENT';
        else if (key.startsWith('timesheet.')) groupName = 'TIMESHEETS';
        else if (key.startsWith('attendance.')) groupName = 'ATTENDANCE';
        else if (key.startsWith('ta.')) groupName = 'TALENT ACQUISITION';
        else if (key.startsWith('helpdesk.')) groupName = 'HELP DESK';
        else if (key.startsWith('discussion.')) groupName = 'DISCUSSIONS';
        else if (key.startsWith('dossier.')) groupName = 'EMPLOYEE DOSSIER';
        else if (key.startsWith('leave.')) groupName = 'LEAVES';

        const moduleMapping = {
            'ATTENDANCE': 'attendance',
            'TIMESHEETS': 'timesheet',
            'PROJECTS': 'projectManagement',
            'BUSINESS UNITS': 'projectManagement',
            'CLIENTS': 'projectManagement',
            'TASKS': 'projectManagement',
            'USER MANAGEMENT': 'userManagement',
            'ROLE MANAGEMENT': 'userManagement',
            'TALENT ACQUISITION': 'talentAcquisition',
            'DISCUSSIONS': 'meetingsOfMinutes',
            'EMPLOYEE DOSSIER': 'employeeDossier',
            'HELP DESK': 'helpdesk',
            'LEAVES': 'leaves'
        };

        const moduleKey = moduleMapping[groupName];
        if (!moduleKey) return true;
        return user?.company?.enabledModules?.includes(moduleKey);
    };

    useEffect(() => {
        if (initialFetchDoneRef.current) return;
        initialFetchDoneRef.current = true;
        fetchData();
    }, [fetchData]);

    const togglePermission = (id) => {
        if (viewOnly) return;
        if (selectedPerms.includes(id)) {
            setSelectedPerms(selectedPerms.filter(p => p !== id));
        } else {
            setSelectedPerms([...selectedPerms, id]);
        }
    };

    const toggleGroup = (groupPerms) => {
        if (viewOnly) return;
        const groupIds = groupPerms.map(p => p._id);
        const allSelected = groupIds.every(id => selectedPerms.includes(id));

        if (allSelected) {
            // Deselect all in group
            setSelectedPerms(selectedPerms.filter(id => !groupIds.includes(id)));
        } else {
            // Select all in group
            const newSelected = new Set([...selectedPerms, ...groupIds]);
            setSelectedPerms(Array.from(newSelected));
        }
    };

    const [editingId, setEditingId] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/admin/roles/${editingId}`, {
                    name: roleName,
                    permissions: selectedPerms
                });
                toast.success('Role Updated Successfully');
            } else {
                await api.post('/admin/roles', {
                    name: roleName,
                    permissions: selectedPerms
                });
                toast.success('Role Created Successfully');
            }

            // 1. Clear ALL related session caches so stale data is never served
            sessionStorage.removeItem(`role_data_${user?._id}`);
            sessionStorage.removeItem(`user_data_${user?._id}`);

            // 2. Refresh the current user's auth profile (permissions may have changed)
            if (refreshProfile) {
                refreshProfile().catch(() => {});
            }

            setShowModal(false);
            setRoleName('');
            setSelectedPerms([]);
            setEditingId(null);

            // 3. Force re-fetch from server (bypasses both session + HTTP cache)
            fetchData({ force: true });
        } catch (error) {
            toast.error(error.response?.data?.message || (editingId ? 'Failed to update role' : 'Failed to create role'));
        }
    };


    const handleEdit = (role, isView = false) => {
        setRoleName(role.name);
        setSelectedPerms(role.permissions.map(p => p._id));
        setEditingId(role._id);
        setViewOnly(isView);
        setTaPermissionTab('all');
        setShowModal(true);
    };

    const openCreateModal = () => {
        setRoleName('');
        setSelectedPerms([]);
        setEditingId(null);
        setViewOnly(false);
        setTaPermissionTab('all');
        setShowModal(true);
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-100 font-sans p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="zoho-card p-6 border-t-4 border-slate-200 flex flex-col justify-between h-48">
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <Skeleton className="h-6 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                    <Skeleton className="h-5 w-12" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-3 w-3/4" />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                                <Skeleton className="h-4 w-12" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-100 font-sans p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Role Management</h1>
                        <p className="text-sm text-slate-500">Define roles and permission levels</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-all"
                    >
                        <Shield size={18} />
                        <span>Create Role</span>
                    </button>
                </div>

                {/* Roles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {roles.map(role => (
                        <div key={role._id} className="zoho-card p-6 border-t-4 border-t-purple-500 hover:shadow-md transition-shadow flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">{role.name}</h3>
                                        <span className="text-xs text-slate-500">{role.permissions.filter(isPermissionVisible).length} Permissions</span>
                                    </div>
                                    {role.isSystem && (
                                        <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-1 rounded uppercase font-bold tracking-wider">System</span>
                                    )}
                                </div>
                                <div className="text-sm text-slate-600 line-clamp-3 overflow-hidden h-16">
                                    {role.permissions.filter(isPermissionVisible).map(p => p.description).join(', ')}
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end space-x-3">
                                {!role.isSystem && (
                                    <button
                                        onClick={() => handleEdit(role, false)}
                                        className="text-slate-500 hover:text-blue-600 text-sm font-medium"
                                    >
                                        Edit
                                    </button>
                                )}
                                <button
                                    onClick={() => handleEdit(role, true)}
                                    className="text-blue-600 text-sm font-medium hover:underline"
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

            </div>

            {/* Create/Edit Role Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-blob">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <h3 className="font-bold text-slate-800">
                                {viewOnly ? 'Role Details' : (editingId ? 'Edit Role' : 'Create New Role')}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role Name</label>
                                <input
                                    value={roleName}
                                    onChange={(e) => setRoleName(e.target.value)}
                                    className={`zoho-input text-lg font-semibold ${viewOnly ? 'bg-slate-50' : ''}`}
                                    placeholder="e.g. HR Manager"
                                    disabled={viewOnly || (editingId && roles.find(r => r._id === editingId)?.isSystem)}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {Object.entries(permissions)
                                    .filter(([moduleName]) => {
                                        // Mapping of backend group names to enabledModule keys
                                        const moduleMapping = {
                                            'ATTENDANCE': 'attendance',
                                            'TIMESHEETS': 'timesheet',
                                            'PROJECTS': 'projectManagement',
                                            'BUSINESS UNITS': 'projectManagement',
                                            'CLIENTS': 'projectManagement',
                                            'TASKS': 'projectManagement',
                                            'USER MANAGEMENT': 'userManagement',
                                            'ROLE MANAGEMENT': 'userManagement',
                                            'TALENT ACQUISITION': 'talentAcquisition',
                                            'DISCUSSIONS': 'meetingsOfMinutes',
                                            'EMPLOYEE DOSSIER': 'employeeDossier',
                                            'HELP DESK': 'helpdesk',
                                            'LEAVES': 'leaves'
                                        };

                                        const moduleKey = moduleMapping[moduleName];
                                        // If no mapping, show it (e.g. OTHER)
                                        if (!moduleKey) return true;

                                        // Check if module is enabled
                                        return user?.company?.enabledModules?.includes(moduleKey);
                                    })
                                    .map(([module, perms]) => {
                                        const isTAModule = module === TA_PERMISSION_MODULE;
                                        const visiblePerms = isTAModule ? filterTAPermissionsByTab(perms, taPermissionTab) : perms;
                                        const allVisibleSelected = visiblePerms.length > 0 && visiblePerms.every(p => selectedPerms.includes(p._id));
                                        const taSections = isTAModule ? getTAPermissionSections(visiblePerms, taPermissionTab) : [];

                                        return (
                                        <div key={module} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                                            <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                                                <h4 className="font-bold text-slate-700 flex items-center">
                                                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                                    {module}
                                                </h4>
                                                {!viewOnly && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleGroup(visiblePerms)}
                                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                                                    >
                                                        {allVisibleSelected ? 'Unselect All' : 'Select All'}
                                                    </button>
                                                )}
                                            </div>
                                            {isTAModule && (
                                                <div className="mb-4 flex flex-wrap gap-2">
                                                    {TA_PERMISSION_SUB_TABS.map((tab) => {
                                                        const isActive = taPermissionTab === tab.id;
                                                        const tabCount = filterTAPermissionsByTab(perms, tab.id).length;

                                                        return (
                                                            <button
                                                                key={tab.id}
                                                                type="button"
                                                                onClick={() => setTaPermissionTab(tab.id)}
                                                                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                                                    isActive
                                                                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                                                                }`}
                                                            >
                                                                {tab.label} ({tabCount})
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {isTAModule ? (
                                                <div className="space-y-4">
                                                    {taSections.map((section) => (
                                                        <div key={section.id} className="space-y-2">
                                                            {section.label ? (
                                                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                                                    {section.label}
                                                                </div>
                                                            ) : null}
                                                            {section.permissions.map((p) => (
                                                                <label key={p._id} className={`flex items-start space-x-3 group ${viewOnly ? '' : 'cursor-pointer'}`}>
                                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors mt-0.5 ${selectedPerms.includes(p._id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                                                                        {selectedPerms.includes(p._id) && <Check size={12} className="text-white" />}
                                                                    </div>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="hidden"
                                                                        checked={selectedPerms.includes(p._id)}
                                                                        onChange={() => togglePermission(p._id)}
                                                                        disabled={viewOnly}
                                                                    />
                                                                    <div className="flex-1">
                                                                        <div className="text-sm font-medium text-slate-700">{p.key}</div>
                                                                        <div className="text-xs text-slate-500">{p.description}</div>
                                                                    </div>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    ))}
                                                    {visiblePerms.length === 0 && (
                                                        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-xs text-slate-500">
                                                            No permissions available in this Talent Acquisition sub-tab.
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {visiblePerms.map(p => (
                                                        <label key={p._id} className={`flex items-start space-x-3 group ${viewOnly ? '' : 'cursor-pointer'}`}>
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors mt-0.5 ${selectedPerms.includes(p._id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                                                                {selectedPerms.includes(p._id) && <Check size={12} className="text-white" />}
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                className="hidden"
                                                                checked={selectedPerms.includes(p._id)}
                                                                onChange={() => togglePermission(p._id)}
                                                                disabled={viewOnly}
                                                            />
                                                            <div className="flex-1">
                                                                <div className="text-sm font-medium text-slate-700">{p.key}</div>
                                                                <div className="text-xs text-slate-500">{p.description}</div>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )})}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end space-x-3">
                            <button onClick={() => setShowModal(false)} className="zoho-btn-secondary">
                                {viewOnly ? 'Close' : 'Cancel'}
                            </button>
                            {!viewOnly && (
                                <button onClick={handleSubmit} className="zoho-btn-primary px-8">
                                    {editingId ? 'Update Role' : 'Create Role'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Roles;
