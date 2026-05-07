import React, { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, Loader, ShieldCheck, Users, UserSquare2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Skeleton from '../../components/Skeleton';
import UserMultiSelect from '../../components/UserMultiSelect';

const tabOptions = [
    { id: 'overview', label: 'Overview', icon: ShieldCheck },
    { id: 'roles', label: 'Role Permissions', icon: UserSquare2 },
    { id: 'requisitions', label: 'Requisition Access', icon: BriefcaseBusiness },
    { id: 'users', label: 'User Coverage', icon: Users }
];

const StatCard = ({ label, value, hint }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</p>
        <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
);

const SectionCard = ({ title, description, children, actions = null }) => (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div>
                <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
            </div>
            {actions}
        </div>
        <div className="p-5">{children}</div>
    </section>
);

const formatUserName = (user) => {
    if (!user) return 'Unassigned';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unassigned';
};

const TAAccessSettings = () => {
    const [loading, setLoading] = useState(true);
    const [savingRoleId, setSavingRoleId] = useState('');
    const [savingRequestId, setSavingRequestId] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [permissions, setPermissions] = useState([]);
    const [roles, setRoles] = useState([]);
    const [users, setUsers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [selectedRolePermissionIds, setSelectedRolePermissionIds] = useState([]);
    const [selectedRequestId, setSelectedRequestId] = useState('');
    const [requestAccessDraft, setRequestAccessDraft] = useState({
        recruiterId: '',
        assignedUsers: [],
        analyticsViewers: [],
        interviewPanel: []
    });
    const [userSearch, setUserSearch] = useState('');

    const fetchOverview = async ({ preserveSelections = true } = {}) => {
        try {
            setLoading(true);
            const response = await api.get('/ta/settings/access/overview');
            const nextPermissions = response.data?.permissions || [];
            const nextRoles = response.data?.roles || [];
            const nextUsers = response.data?.users || [];
            const nextRequests = response.data?.requests || [];

            setPermissions(nextPermissions);
            setRoles(nextRoles);
            setUsers(nextUsers);
            setRequests(nextRequests);

            setSelectedRoleId((current) => {
                if (preserveSelections && current && nextRoles.some((role) => role._id === current)) {
                    return current;
                }
                return nextRoles[0]?._id || '';
            });

            setSelectedRequestId((current) => {
                if (preserveSelections && current && nextRequests.some((request) => request._id === current)) {
                    return current;
                }
                return nextRequests[0]?._id || '';
            });
        } catch (error) {
            console.error('Failed to load TA access settings:', error);
            toast.error(error.response?.data?.message || 'Failed to load TA access settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverview({ preserveSelections: false });
    }, []);

    const selectedRole = useMemo(
        () => roles.find((role) => role._id === selectedRoleId) || null,
        [roles, selectedRoleId]
    );

    useEffect(() => {
        if (!selectedRole) {
            setSelectedRolePermissionIds([]);
            return;
        }

        setSelectedRolePermissionIds(
            Array.isArray(selectedRole.taPermissions)
                ? selectedRole.taPermissions.map((permission) => permission._id)
                : []
        );
    }, [selectedRole]);

    const selectedRequest = useMemo(
        () => requests.find((request) => request._id === selectedRequestId) || null,
        [requests, selectedRequestId]
    );

    useEffect(() => {
        if (!selectedRequest) {
            setRequestAccessDraft({
                recruiterId: '',
                assignedUsers: [],
                analyticsViewers: [],
                interviewPanel: []
            });
            return;
        }

        setRequestAccessDraft({
            recruiterId: selectedRequest.ownership?.recruiter?._id || '',
            assignedUsers: Array.isArray(selectedRequest.assignedUsers)
                ? selectedRequest.assignedUsers.map((user) => user?._id || user).filter(Boolean)
                : [],
            analyticsViewers: Array.isArray(selectedRequest.analyticsViewers)
                ? selectedRequest.analyticsViewers.map((user) => user?._id || user).filter(Boolean)
                : [],
            interviewPanel: Array.isArray(selectedRequest.ownership?.interviewPanel)
                ? selectedRequest.ownership.interviewPanel.map((user) => user?._id || user).filter(Boolean)
                : []
        });
    }, [selectedRequest]);

    const filteredUsers = useMemo(() => {
        const query = userSearch.trim().toLowerCase();
        if (!query) return users;

        return users.filter((user) => (
            `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(query)
            || String(user.email || '').toLowerCase().includes(query)
            || String(user.employeeCode || '').toLowerCase().includes(query)
        ));
    }, [userSearch, users]);

    const stats = useMemo(() => {
        const uniqueInterviewerIds = new Set();
        requests.forEach((request) => {
            (request.interviewerIds || []).forEach((userId) => uniqueInterviewerIds.add(String(userId)));
        });

        return {
            taRoles: roles.length,
            activeUsers: users.filter((user) => user.isActive !== false).length,
            sharedRequisitions: requests.filter((request) => (request.assignedUsers || []).length > 0 || (request.analyticsViewers || []).length > 0).length,
            activeInterviewers: uniqueInterviewerIds.size
        };
    }, [requests, roles, users]);

    const toggleRolePermission = (permissionId) => {
        setSelectedRolePermissionIds((current) => (
            current.includes(permissionId)
                ? current.filter((id) => id !== permissionId)
                : [...current, permissionId]
        ));
    };

    const handleSaveRolePermissions = async () => {
        if (!selectedRole) return;

        try {
            setSavingRoleId(selectedRole._id);
            const response = await api.put(`/ta/settings/access/roles/${selectedRole._id}`, {
                permissionIds: selectedRolePermissionIds
            });

            const updatedRole = response.data?.role;
            setRoles((current) => current.map((role) => (
                role._id === updatedRole?._id ? updatedRole : role
            )));
            toast.success(response.data?.message || 'TA role permissions updated');
        } catch (error) {
            console.error('Failed to save TA role permissions:', error);
            toast.error(error.response?.data?.message || 'Failed to update TA role permissions');
        } finally {
            setSavingRoleId('');
        }
    };

    const handleSaveRequestAccess = async () => {
        if (!selectedRequest) return;

        try {
            setSavingRequestId(selectedRequest._id);
            const response = await api.put(`/ta/settings/access/requisitions/${selectedRequest._id}`, requestAccessDraft);
            const updatedRequest = response.data?.request;
            setRequests((current) => current.map((request) => (
                request._id === updatedRequest?._id
                    ? { ...request, ...updatedRequest }
                    : request
            )));
            toast.success(response.data?.message || 'Requisition access updated');
        } catch (error) {
            console.error('Failed to save requisition access:', error);
            toast.error(error.response?.data?.message || 'Failed to update requisition access');
        } finally {
            setSavingRequestId('');
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-32 w-full rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-[520px] w-full rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">TA Settings</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">TA Access Settings</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-500">
                    Manage Talent Acquisition role permissions, requisition assignments, analytics viewers, and interviewer coverage from one place.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="TA Roles" value={stats.taRoles} hint="Roles with Talent Acquisition permissions available to configure." />
                <StatCard label="Active Users" value={stats.activeUsers} hint="Active workspace users included in TA assignment coverage." />
                <StatCard label="Shared Requisitions" value={stats.sharedRequisitions} hint="Requisitions with assigned recruiters or analytics viewers configured." />
                <StatCard label="Interviewers" value={stats.activeInterviewers} hint="Users currently assigned to at least one interview round." />
            </div>

            <div className="flex flex-wrap gap-3">
                {tabOptions.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                                isActive
                                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                            }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'overview' && (
                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <SectionCard
                        title="User Coverage"
                        description="See who currently participates in TA through requisition assignments, recruiter ownership, analytics visibility, or interview rounds."
                    >
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">User</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Roles</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Assigned</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Recruiter</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Analytics</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Interview Rounds</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {users.slice(0, 12).map((user) => (
                                        <tr key={user._id}>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-slate-800">{formatUserName(user)}</p>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{user.roles.join(', ') || '-'}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">{user.assignedRequests}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">{user.recruiterOn}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">{user.analyticsViewerOn}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">{user.interviewRoundsAssigned}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Requisition Access Snapshot"
                        description="Quick view of the current access shape across the latest requisitions."
                    >
                        <div className="space-y-3">
                            {requests.slice(0, 8).map((request) => (
                                <div key={request._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{request.title}</p>
                                            <p className="text-xs text-slate-500">{request.requestId} • {request.client || 'No client'}</p>
                                        </div>
                                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                                            {request.status}
                                        </span>
                                    </div>
                                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                                        <p><span className="font-semibold text-slate-700">Recruiter:</span> {formatUserName(request.ownership?.recruiter)}</p>
                                        <p><span className="font-semibold text-slate-700">Assigned Users:</span> {(request.assignedUsers || []).length}</p>
                                        <p><span className="font-semibold text-slate-700">Analytics Viewers:</span> {(request.analyticsViewers || []).length}</p>
                                        <p><span className="font-semibold text-slate-700">Interview Panel:</span> {(request.ownership?.interviewPanel || []).length}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                </div>
            )}

            {activeTab === 'roles' && (
                <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
                    <SectionCard
                        title="Roles"
                        description="Choose a role to manage only its Talent Acquisition permissions."
                    >
                        <div className="space-y-2">
                            {roles.map((role) => (
                                <button
                                    key={role._id}
                                    type="button"
                                    onClick={() => setSelectedRoleId(role._id)}
                                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                                        selectedRoleId === role._id
                                            ? 'border-blue-200 bg-blue-50'
                                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-slate-800">{role.name}</p>
                                            <p className="text-xs text-slate-500">{role.taPermissions.length} TA permissions enabled</p>
                                        </div>
                                        {role.isSystem ? (
                                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                System
                                            </span>
                                        ) : null}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </SectionCard>

                    <SectionCard
                        title={selectedRole ? `${selectedRole.name} TA Permissions` : 'TA Permissions'}
                        description="This editor keeps non-TA permissions intact and updates only the Talent Acquisition capability set."
                        actions={selectedRole ? (
                            <button
                                type="button"
                                onClick={handleSaveRolePermissions}
                                disabled={savingRoleId === selectedRole._id || selectedRole.isSystem}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                {savingRoleId === selectedRole._id ? <Loader size={16} className="animate-spin" /> : null}
                                Save Role Permissions
                            </button>
                        ) : null}
                    >
                        {!selectedRole ? (
                            <p className="text-sm text-slate-500">Select a role to begin.</p>
                        ) : selectedRole.isSystem ? (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                System roles are shown here for visibility, but they cannot be edited from TA Access Settings.
                            </div>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-2">
                                {permissions.map((permission) => {
                                    const isChecked = selectedRolePermissionIds.includes(permission._id);
                                    return (
                                        <label
                                            key={permission._id}
                                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                                                isChecked ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleRolePermission(permission._id)}
                                                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">{permission.key}</p>
                                                <p className="mt-1 text-xs text-slate-500">{permission.description || 'Talent Acquisition permission'}</p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </SectionCard>
                </div>
            )}

            {activeTab === 'requisitions' && (
                <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
                    <SectionCard
                        title="Requisitions"
                        description="Select a requisition to manage recruiter assignment, shared users, analytics viewers, and interview panel members."
                    >
                        <div className="space-y-2">
                            {requests.map((request) => (
                                <button
                                    key={request._id}
                                    type="button"
                                    onClick={() => setSelectedRequestId(request._id)}
                                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                                        selectedRequestId === request._id
                                            ? 'border-blue-200 bg-blue-50'
                                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    <p className="font-semibold text-slate-800">{request.title}</p>
                                    <p className="mt-1 text-xs text-slate-500">{request.requestId} • {request.client || 'No client'}</p>
                                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                                        <span>{(request.assignedUsers || []).length} assigned</span>
                                        <span>{(request.analyticsViewers || []).length} analytics</span>
                                        <span>{(request.ownership?.interviewPanel || []).length} panel</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </SectionCard>

                    <SectionCard
                        title={selectedRequest ? `${selectedRequest.title} Access` : 'Requisition Access'}
                        description="Adjust who is shared on this requisition. Candidate visibility follows working assignments and interviewer coverage, while analytics viewers remain analytics-only."
                        actions={selectedRequest ? (
                            <button
                                type="button"
                                onClick={handleSaveRequestAccess}
                                disabled={savingRequestId === selectedRequest._id}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                {savingRequestId === selectedRequest._id ? <Loader size={16} className="animate-spin" /> : null}
                                Save Access
                            </button>
                        ) : null}
                    >
                        {!selectedRequest ? (
                            <p className="text-sm text-slate-500">Select a requisition to begin.</p>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Hiring Manager</p>
                                        <p className="mt-2 text-sm font-semibold text-slate-800">{formatUserName(selectedRequest.ownership?.hiringManager)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Candidate Coverage</p>
                                        <p className="mt-2 text-sm font-semibold text-slate-800">{selectedRequest.candidateCount || 0} candidates • {selectedRequest.interviewRoundsCount || 0} interview rounds</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Recruiter</label>
                                    <select
                                        value={requestAccessDraft.recruiterId}
                                        onChange={(event) => setRequestAccessDraft((current) => ({ ...current, recruiterId: event.target.value }))}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    >
                                        <option value="">Unassigned</option>
                                        {users.filter((user) => user.isActive !== false).map((user) => (
                                            <option key={user._id} value={user._id}>
                                                {formatUserName(user)}{user.employeeCode ? ` (${user.employeeCode})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid gap-6 lg:grid-cols-3">
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Assigned Users</label>
                                        <UserMultiSelect
                                            users={users.filter((user) => user.isActive !== false)}
                                            selectedUserIds={requestAccessDraft.assignedUsers}
                                            onChange={(selectedUserIds) => setRequestAccessDraft((current) => ({ ...current, assignedUsers: selectedUserIds }))}
                                            placeholder="Share requisition access"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Analytics Viewers</label>
                                        <UserMultiSelect
                                            users={users.filter((user) => user.isActive !== false)}
                                            selectedUserIds={requestAccessDraft.analyticsViewers}
                                            onChange={(selectedUserIds) => setRequestAccessDraft((current) => ({ ...current, analyticsViewers: selectedUserIds }))}
                                            placeholder="Select analytics viewers"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Interview Panel</label>
                                        <UserMultiSelect
                                            users={users.filter((user) => user.isActive !== false)}
                                            selectedUserIds={requestAccessDraft.interviewPanel}
                                            onChange={(selectedUserIds) => setRequestAccessDraft((current) => ({ ...current, interviewPanel: selectedUserIds }))}
                                            placeholder="Select interview panel"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </SectionCard>
                </div>
            )}

            {activeTab === 'users' && (
                <SectionCard
                    title="User Access Coverage"
                    description="Review how Talent Acquisition work is distributed across users through role permissions, requisition assignments, and interview rounds."
                >
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <input
                            type="text"
                            value={userSearch}
                            onChange={(event) => setUserSearch(event.target.value)}
                            placeholder="Search by name, email, or employee code"
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:max-w-md"
                        />
                        <p className="text-sm text-slate-500">{filteredUsers.length} users</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Roles</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Assigned Requests</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Recruiter On</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Hiring Manager On</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Analytics Viewer On</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Interview Rounds</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredUsers.map((user) => (
                                    <tr key={user._id}>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-slate-800">{formatUserName(user)}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{user.roles.join(', ') || '-'}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{user.assignedRequests}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{user.recruiterOn}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{user.hiringManagerOn}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{user.analyticsViewerOn}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{user.interviewRoundsAssigned}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}
        </div>
    );
};

export default TAAccessSettings;
