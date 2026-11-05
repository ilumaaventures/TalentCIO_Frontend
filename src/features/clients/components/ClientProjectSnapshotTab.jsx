import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/apiClient';
import {
    Briefcase,
    Clock,
    Users,
    CheckCircle2,
    MessageSquare,
    Layers,
    Search,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    Calendar,
    Flame,
    BarChart3,
    ArrowUpRight,
    ListTodo,
    CheckSquare,
    AlertCircle,
    UserCheck,
    FolderKanban,
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const formatHours = (hours) => {
    const num = Number(hours) || 0;
    return num % 1 === 0 ? num.toFixed(0) : num.toFixed(1);
};

const getStatusBadgeClass = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'COMPLETED' || s === 'DONE') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'ON HOLD' || s === 'ON-HOLD' || s === 'ON_HOLD') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
};

const getPriorityBadgeClass = (priority) => {
    const p = String(priority || '').toUpperCase();
    if (p === 'URGENT' || p === 'CRITICAL') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (p === 'HIGH') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (p === 'LOW') return 'bg-slate-100 text-slate-600 border-slate-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
};

const UserAvatar = ({ user, size = 'sm' }) => {
    const sizeClasses = size === 'lg' ? 'h-10 w-10 text-sm' : size === 'md' ? 'h-8 w-8 text-xs' : 'h-7 w-7 text-[10px]';
    const photo = user?.profilePicture || user?.profilePhoto;
    const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User';
    const initials = (user?.firstName?.[0] || name[0] || 'U').toUpperCase();

    if (photo) {
        return (
            <img
                src={photo}
                alt={name}
                className={`${sizeClasses} rounded-full object-cover border border-slate-200 shadow-2xs`}
                title={name}
            />
        );
    }

    return (
        <div
            className={`${sizeClasses} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center border border-white shadow-2xs`}
            title={name}
        >
            {initials}
        </div>
    );
};

const ClientProjectSnapshotTab = ({ clientId, clientName }) => {
    const navigate = useNavigate();
    const [snapshot, setSnapshot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [expandedProjectId, setExpandedProjectId] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'modules' | 'allocated' | 'discussions' | 'worklogs'

    const fetchSnapshot = useCallback(async () => {
        if (!clientId) return;
        try {
            setLoading(true);
            const res = await api.get(`/projects/client/${clientId}/snapshot?_t=${Date.now()}`);
            setSnapshot(res.data);
            if (res.data?.projects?.length > 0) {
                // Auto-expand first project if not already set
                setExpandedProjectId(prev => prev || res.data.projects[0]._id);
            }
        } catch (error) {
            console.error('Failed to load client project snapshot:', error);
            toast.error(error.response?.data?.message || 'Failed to load project snapshot');
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        fetchSnapshot();
    }, [fetchSnapshot]);

    const summary = snapshot?.summary || {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        onHoldProjects: 0,
        totalHoursSpent: 0,
        totalEstimatedHours: 0,
        totalAllocatedMembers: 0,
        totalModules: 0,
        totalTasks: 0,
        completedTasks: 0,
        taskCompletionPct: 0,
        totalDiscussions: 0
    };

    const projects = snapshot?.projects || [];
    const topContributors = snapshot?.topContributors || [];

    const handleMemberClick = (projectId, memberId) => {
        if (!projectId) return;
        const cleanUserId = memberId ? String(memberId) : '';
        const query = cleanUserId
            ? `?view=user-trace&userId=${encodeURIComponent(cleanUserId)}&from=client&clientId=${encodeURIComponent(clientId)}`
            : `?view=user-trace&from=client&clientId=${encodeURIComponent(clientId)}`;

        navigate(`/projects/${projectId}${query}`, {
            state: {
                from: `/clients/${clientId}/view?tab=snapshot`,
                viewMode: 'user-trace',
                traceUserId: cleanUserId || 'ALL'
            }
        });
    };

    const handleTopContributorClick = (contributorUser) => {
        const cUserId = contributorUser?._id || contributorUser;
        if (!cUserId) return;
        const matchedProject = projects.find(p =>
            (p.allocatedMembers || []).some(m => String(m.user?._id || m.user) === String(cUserId)) ||
            (p.recentWorkLogs || []).some(l => String(l.user?._id || l.user) === String(cUserId)) ||
            String(p.manager?._id || p.manager) === String(cUserId)
        ) || projects[0];

        if (matchedProject) {
            handleMemberClick(matchedProject._id, cUserId);
        }
    };

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesSearch = !searchQuery.trim() ||
                p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                `${p.manager?.firstName || ''} ${p.manager?.lastName || ''}`.toLowerCase().includes(searchQuery.toLowerCase());

            const statusUpper = String(p.status || (p.isActive ? 'Active' : 'Inactive')).toUpperCase();
            const matchesStatus = statusFilter === 'ALL' ||
                (statusFilter === 'ACTIVE' && (statusUpper === 'ACTIVE' || p.isActive)) ||
                (statusFilter === 'COMPLETED' && (statusUpper === 'COMPLETED' || statusUpper === 'DONE')) ||
                (statusFilter === 'ON_HOLD' && (statusUpper === 'ON HOLD' || statusUpper === 'ON-HOLD' || statusUpper === 'ON_HOLD'));

            return matchesSearch && matchesStatus;
        });
    }, [projects, searchQuery, statusFilter]);

    if (loading) {
        return (
            <div className="space-y-6">
                {/* KPI Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-xl p-5 border border-slate-100 shadow-xs animate-pulse space-y-3">
                            <div className="h-4 w-24 bg-slate-200 rounded" />
                            <div className="h-8 w-16 bg-slate-300 rounded" />
                            <div className="h-3 w-32 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
                <div className="bg-white rounded-xl p-8 border border-slate-100 shadow-xs animate-pulse text-center">
                    <div className="h-6 w-48 bg-slate-200 rounded mx-auto mb-4" />
                    <div className="h-4 w-72 bg-slate-100 rounded mx-auto" />
                </div>
            </div>
        );
    }

    if (!projects || projects.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FolderKanban size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">No Projects Found</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                    There are currently no active or archived projects associated with <strong>{clientName || 'this client'}</strong>.
                </p>
                <button
                    onClick={() => navigate('/projects')}
                    className="inline-flex items-center space-x-2 zoho-btn-primary px-4 py-2 text-sm font-semibold rounded-lg"
                >
                    <Briefcase size={16} />
                    <span>Go to Projects Workspace</span>
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* ── TOP KPI DASHBOARD CARDS ─────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Card 1: Total Projects */}
                <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Client Projects</span>
                        <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Briefcase size={18} />
                        </div>
                    </div>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-extrabold text-slate-900">{summary.totalProjects}</span>
                        <span className="text-xs font-medium text-slate-500">Total</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <span className="flex items-center space-x-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span>{summary.activeProjects} Active</span>
                        </span>
                        <span className="flex items-center space-x-1">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            <span>{summary.completedProjects} Completed</span>
                        </span>
                        {summary.onHoldProjects > 0 && (
                            <span className="flex items-center space-x-1">
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                <span>{summary.onHoldProjects} On Hold</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Card 2: Hours Spent / Logged */}
                <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hours Logged</span>
                        <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <Clock size={18} />
                        </div>
                    </div>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-extrabold text-purple-700">{formatHours(summary.totalHoursSpent)}</span>
                        <span className="text-xs font-medium text-slate-500">hrs spent</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>Estimated: {summary.totalEstimatedHours > 0 ? `${summary.totalEstimatedHours} hrs` : 'Not specified'}</span>
                        {summary.totalEstimatedHours > 0 && (
                            <span className="font-semibold text-purple-600">
                                {Math.round((summary.totalHoursSpent / summary.totalEstimatedHours) * 100)}% utilized
                            </span>
                        )}
                    </div>
                </div>

                {/* Card 3: Allocated Team */}
                <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Allocated Team</span>
                        <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Users size={18} />
                        </div>
                    </div>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-extrabold text-slate-900">{summary.totalAllocatedMembers}</span>
                        <span className="text-xs font-medium text-slate-500">Contributors</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>Across {summary.totalProjects} project{summary.totalProjects !== 1 ? 's' : ''}</span>
                        <span className="text-emerald-600 font-semibold">{topContributors.length} top active</span>
                    </div>
                </div>
            </div>

            {/* ── TOP CONTRIBUTORS HIGHLIGHT BAR ──────────────── */}
            {topContributors.length > 0 && (
                <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                            <Flame size={16} className="text-amber-500" />
                            <h3 className="text-sm font-bold text-slate-800">Top Allocated Team Contributors (Hours Spent)</h3>
                        </div>
                        <span className="text-xs text-slate-400">Ranked by total hours logged across this client</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                        {topContributors.map((c, idx) => {
                            const name = `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim() || c.user?.email || 'User';
                            return (
                                <div
                                    key={idx}
                                    onClick={() => handleTopContributorClick(c.user)}
                                    className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-2xs transition-all cursor-pointer group"
                                    title={`Click to view work logs for ${name}`}
                                >
                                    <div className="flex justify-center mb-1.5">
                                        <UserAvatar user={c.user} size="md" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors" title={name}>{name}</p>
                                    <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        {formatHours(c.hours)} hrs
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── SEARCH & STATUS FILTER CONTROLS ─────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search projects by name, category, or manager..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">Status:</span>
                    <div className="flex items-center rounded-lg bg-slate-200/70 p-0.5">
                        {['ALL', 'ACTIVE', 'COMPLETED', 'ON_HOLD'].map((st) => (
                            <button
                                key={st}
                                type="button"
                                onClick={() => setStatusFilter(st)}
                                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                    statusFilter === st
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {st === 'ALL' ? 'All Projects' : st === 'ON_HOLD' ? 'On Hold' : st.charAt(0) + st.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchSnapshot}
                        className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                        title="Refresh Snapshot"
                    >
                        <RefreshCw size={15} />
                    </button>
                </div>
            </div>

            {/* ── PROJECTS LIST & EXPANDABLE DETAILS ───────────── */}
            <div className="space-y-4">
                {filteredProjects.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
                        No projects match your search criteria.
                    </div>
                ) : (
                    filteredProjects.map((project) => {
                        const isExpanded = expandedProjectId === project._id;
                        const managerName = project.manager ? `${project.manager.firstName || ''} ${project.manager.lastName || ''}`.trim() : null;
                        const hoursPct = project.estimatedHours > 0 ? Math.round((project.totalLoggedHours / project.estimatedHours) * 100) : null;

                        return (
                            <div
                                key={project._id}
                                className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden shadow-xs ${
                                    isExpanded ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                {/* ── Project Summary Header ── */}
                                <div
                                    className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                    onClick={() => setExpandedProjectId(isExpanded ? null : project._id)}
                                >
                                    <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                                        <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Briefcase size={20} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3 className="text-base font-bold text-slate-900 truncate">
                                                    {project.name}
                                                </h3>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(project.status || (project.isActive ? 'Active' : 'Inactive'))}`}>
                                                    {project.status || (project.isActive ? 'Active' : 'Inactive')}
                                                </span>
                                                {project.category && (
                                                    <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                                        {project.category}
                                                    </span>
                                                )}
                                                {project.businessUnit?.name && (
                                                    <span className="text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                                                        {project.businessUnit.name}
                                                    </span>
                                                )}
                                            </div>

                                            {project.description && (
                                                <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                                                    {project.description}
                                                </p>
                                            )}

                                            {/* Key Metrics Row */}
                                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                                                {managerName && (
                                                    <div
                                                        className="flex items-center space-x-1.5 cursor-pointer hover:text-indigo-600 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const mgrId = project.manager?._id || project.manager;
                                                            handleMemberClick(project._id, mgrId);
                                                        }}
                                                        title={`Click to view PM ${managerName}'s work logs on this project`}
                                                    >
                                                        <UserAvatar user={project.manager} size="sm" />
                                                        <span><strong>PM:</strong> {managerName}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center space-x-1">
                                                    <Users size={13} className="text-slate-400" />
                                                    <span><strong>{project.allocatedMembersCount || 0}</strong> Allocated</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <Layers size={13} className="text-slate-400" />
                                                    <span><strong>{project.modulesCount || 0}</strong> Modules</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <CheckSquare size={13} className="text-slate-400" />
                                                    <span><strong>{project.taskStats?.completed || 0}/{project.taskStats?.total || 0}</strong> Tasks</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <MessageSquare size={13} className="text-slate-400" />
                                                    <span><strong>{project.discussionsCount || 0}</strong> Discussions</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hours & Progress Gauge */}
                                    <div className="flex items-center space-x-6 justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                                        <div className="text-right">
                                            <div className="flex items-center justify-end space-x-1.5">
                                                <Clock size={14} className="text-purple-600" />
                                                <span className="text-base font-extrabold text-slate-900">
                                                    {formatHours(project.totalLoggedHours)} hrs
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                {project.estimatedHours > 0
                                                    ? `of ${project.estimatedHours} hrs est (${hoursPct}% utilized)`
                                                    : 'Hours spent'}
                                            </p>
                                            {project.estimatedHours > 0 && (
                                                <div className="w-32 bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden ml-auto">
                                                    <div
                                                        className={`h-1.5 rounded-full ${
                                                            hoursPct > 100
                                                                ? 'bg-rose-500'
                                                                : hoursPct > 85
                                                                ? 'bg-amber-500'
                                                                : 'bg-emerald-500'
                                                        }`}
                                                        style={{ width: `${Math.min(100, hoursPct)}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/projects/${project._id}?from=client&clientId=${encodeURIComponent(clientId)}`, {
                                                        state: { from: `/clients/${clientId}/view?tab=snapshot` }
                                                    });
                                                }}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                                                title="Open Project Workspace"
                                            >
                                                <ArrowUpRight size={18} />
                                            </button>
                                            <div className="p-1 text-slate-400">
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Expanded Project Dashboard Body ── */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50/50 p-6 space-y-6">

                                        {/* Sub-Tabs Selector */}
                                        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
                                            {[
                                                { key: 'overview', label: 'Snapshot Overview', icon: BarChart3 },
                                                { key: 'modules', label: `Modules & Tasks (${project.modulesCount || 0})`, icon: Layers },
                                                { key: 'allocated', label: `Allocated Team (${project.allocatedMembersCount || 0})`, icon: Users },
                                                { key: 'discussions', label: `Discussions (${project.discussionsCount || 0})`, icon: MessageSquare },
                                                { key: 'worklogs', label: `Recent Time Logs (${project.recentWorkLogs?.length || 0})`, icon: Clock }
                                            ].map((tab) => {
                                                const Icon = tab.icon;
                                                const isActive = activeSubTab === tab.key;
                                                return (
                                                    <button
                                                        key={tab.key}
                                                        onClick={() => setActiveSubTab(tab.key)}
                                                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                                            isActive
                                                                ? 'bg-indigo-600 text-white shadow-xs'
                                                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                                        }`}
                                                    >
                                                        <Icon size={14} />
                                                        <span>{tab.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* ── SUB-TAB 1: OVERVIEW ── */}
                                        {activeSubTab === 'overview' && (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {/* Hours Breakdown */}
                                                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
                                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hours & Timeline</h4>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">Total Hours Spent:</span>
                                                                <span className="font-extrabold text-purple-700">{formatHours(project.totalLoggedHours)} hrs</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">Estimated Budget:</span>
                                                                <span className="font-semibold text-slate-800">{project.estimatedHours ? `${project.estimatedHours} hrs` : '—'}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">Due Date:</span>
                                                                <span className="font-semibold text-slate-800">
                                                                    {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : '—'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Task Completion Stats */}
                                                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
                                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Task Execution</h4>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">Completed Tasks:</span>
                                                                <span className="font-bold text-emerald-600">{project.taskStats?.completed || 0}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">In Progress:</span>
                                                                <span className="font-bold text-blue-600">{project.taskStats?.inProgress || 0}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">Pending / Todo:</span>
                                                                <span className="font-bold text-slate-600">{project.taskStats?.pending || 0}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Quick Actions */}
                                                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
                                                        <div>
                                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Project Workspace</h4>
                                                            <p className="text-xs text-slate-500">
                                                                Access full boards, task creation, module workflows, and discussions in the dedicated project management suite.
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => navigate(`/projects/${project._id}?from=client&clientId=${encodeURIComponent(clientId)}`, {
                                                                state: { from: `/clients/${clientId}/view?tab=snapshot` }
                                                            })}
                                                            className="mt-3 w-full flex items-center justify-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg text-xs font-bold transition-colors"
                                                        >
                                                            <span>Open Full Project Workspace</span>
                                                            <ArrowUpRight size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Mini Allocated Team preview */}
                                                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                            Allocated Team Members ({project.allocatedMembers?.length || 0})
                                                        </h4>
                                                        <button
                                                            onClick={() => setActiveSubTab('allocated')}
                                                            className="text-xs text-indigo-600 font-bold hover:underline"
                                                        >
                                                            View detailed allocation →
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(project.allocatedMembers || []).map((m, i) => {
                                                            const memberId = m.user?._id || m.user || m._id;
                                                            const memberName = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || 'User';
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleMemberClick(project._id, memberId);
                                                                    }}
                                                                    className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-indigo-50/80 hover:border-indigo-300 hover:shadow-2xs transition-all cursor-pointer group"
                                                                    title={`Click to view work logs for ${memberName} on ${project.name}`}
                                                                >
                                                                    <UserAvatar user={m.user} size="sm" />
                                                                    <div className="text-left">
                                                                        <p className="text-xs font-semibold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                                                                            {memberName}
                                                                        </p>
                                                                        <p className="text-[10px] text-slate-400">
                                                                            {m.role} • <span className="text-indigo-600 font-bold">{formatHours(m.hoursLogged)}h</span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ── SUB-TAB 2: MODULES & TASKS ── */}
                                        {activeSubTab === 'modules' && (
                                            <div className="space-y-4">
                                                {(!project.modules || project.modules.length === 0) ? (
                                                    <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-400 text-sm">
                                                        No modules defined for this project yet.
                                                    </div>
                                                ) : (
                                                    project.modules.map((module) => (
                                                        <div key={module._id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                                                <div className="flex items-center space-x-2">
                                                                    <Layers size={16} className="text-indigo-600" />
                                                                    <h4 className="text-sm font-bold text-slate-900">{module.name}</h4>
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getStatusBadgeClass(module.status)}`}>
                                                                        {module.status || 'PLANNED'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center space-x-4 text-xs text-slate-500">
                                                                    <span><strong>{module.tasks?.length || 0}</strong> Tasks</span>
                                                                    <span><strong>{formatHours(module.loggedHours)}</strong> hrs logged</span>
                                                                    {module.dueDate && (
                                                                        <span>Due: {new Date(module.dueDate).toLocaleDateString()}</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Module Tasks List */}
                                                            {module.tasks && module.tasks.length > 0 ? (
                                                                <div className="divide-y divide-slate-50">
                                                                    {module.tasks.map((task) => (
                                                                        <div key={task._id} className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 px-2 rounded-md transition-colors">
                                                                            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getPriorityBadgeClass(task.priority)}`}>
                                                                                    {task.priority || 'MEDIUM'}
                                                                                </span>
                                                                                <span className="font-semibold text-slate-800 truncate" title={task.name}>
                                                                                    {task.name}
                                                                                </span>
                                                                            </div>

                                                                            <div className="flex items-center space-x-4 flex-shrink-0">
                                                                                {/* Assignees */}
                                                                                <div className="flex items-center -space-x-1.5">
                                                                                    {(task.assignees || []).map((a, i) => (
                                                                                        <UserAvatar key={i} user={a} size="sm" />
                                                                                    ))}
                                                                                </div>
                                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClass(task.status)}`}>
                                                                                    {task.status || 'TODO'}
                                                                                </span>
                                                                                <span className="font-bold text-indigo-600 text-xs w-16 text-right">
                                                                                    {formatHours(task.loggedHours)} hrs
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-slate-400 italic py-1">No tasks in this module.</p>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* ── SUB-TAB 3: ALLOCATED TEAM & HOURS ── */}
                                        {activeSubTab === 'allocated' && (
                                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                                                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                        Allocated Members & Time Contributions
                                                    </h4>
                                                    <span className="text-xs text-slate-400">
                                                        {project.allocatedMembers?.length || 0} team members assigned
                                                    </span>
                                                </div>

                                                <div className="divide-y divide-slate-100">
                                                    {(project.allocatedMembers || []).map((member, i) => {
                                                        const name = `${member.user?.firstName || ''} ${member.user?.lastName || ''}`.trim() || member.user?.email || 'User';
                                                        const pctOfProject = project.totalLoggedHours > 0
                                                            ? Math.round((member.hoursLogged / project.totalLoggedHours) * 100)
                                                            : 0;
                                                        const memberId = member.user?._id || member.user || member._id;

                                                        return (
                                                            <div
                                                                key={i}
                                                                onClick={() => handleMemberClick(project._id, memberId)}
                                                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                                                                title={`Click to view work logs for ${name} on ${project.name}`}
                                                            >
                                                                <div className="flex items-center space-x-3 min-w-0">
                                                                    <UserAvatar user={member.user} size="md" />
                                                                    <div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{name}</p>
                                                                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${
                                                                                member.role === 'Project Manager'
                                                                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                                                            }`}>
                                                                                {member.role}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-xs text-slate-400">{member.user?.email}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center space-x-6 sm:justify-end">
                                                                    <div className="text-right">
                                                                        <span className="text-sm font-extrabold text-indigo-700">
                                                                            {formatHours(member.hoursLogged)} hrs
                                                                        </span>
                                                                        <p className="text-[11px] text-slate-400">
                                                                            {pctOfProject}% of project time
                                                                        </p>
                                                                    </div>
                                                                    <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                        <div
                                                                            className="bg-indigo-600 h-1.5 rounded-full"
                                                                            style={{ width: `${Math.min(100, pctOfProject)}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                                                        Logs <ArrowUpRight size={14} />
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* ── SUB-TAB 4: DISCUSSIONS ── */}
                                        {activeSubTab === 'discussions' && (
                                            <div className="space-y-3">
                                                {(!project.discussions || project.discussions.length === 0) ? (
                                                    <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-400 text-sm">
                                                        No discussions logged for this project yet.
                                                    </div>
                                                ) : (
                                                    project.discussions.map((d) => (
                                                        <div key={d._id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-colors">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                                                <div className="flex items-center space-x-2">
                                                                    <MessageSquare size={16} className="text-indigo-600 flex-shrink-0" />
                                                                    <h4 className="text-sm font-bold text-slate-900">{d.title}</h4>
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getPriorityBadgeClass(d.priority)}`}>
                                                                        {d.priority || 'Medium'}
                                                                    </span>
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                                        {d.status || 'inprogress'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center space-x-4 text-xs text-slate-500">
                                                                    {d.hours && (
                                                                        <span className="font-bold text-indigo-600">{d.hours} hrs budgeted</span>
                                                                    )}
                                                                    {d.dueDate && (
                                                                        <span>Due: {new Date(d.dueDate).toLocaleDateString()}</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {d.discussion && (
                                                                <p className="text-xs text-slate-600 line-clamp-2 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                                    {d.discussion}
                                                                </p>
                                                            )}

                                                            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                                                                <div className="flex items-center space-x-2">
                                                                    <UserAvatar user={d.createdBy} size="sm" />
                                                                    <span>Created by <strong>{d.createdBy?.firstName} {d.createdBy?.lastName}</strong></span>
                                                                </div>
                                                                {d.module?.name && (
                                                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px] font-medium">
                                                                        Module: {d.module.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* ── SUB-TAB 5: RECENT WORK LOGS ── */}
                                        {activeSubTab === 'worklogs' && (
                                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                                                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                        Recent Timesheet Activity (Latest 10 Entries)
                                                    </h4>
                                                    <span className="text-xs text-purple-700 font-bold">
                                                        Total: {formatHours(project.totalLoggedHours)} hrs
                                                    </span>
                                                </div>

                                                {(!project.recentWorkLogs || project.recentWorkLogs.length === 0) ? (
                                                    <div className="p-8 text-center text-slate-400 text-sm">
                                                        No work logs recorded for this project yet.
                                                    </div>
                                                ) : (
                                                    <div className="divide-y divide-slate-100 text-xs">
                                                        {project.recentWorkLogs.map((log, idx) => {
                                                            const logUserId = log.user?._id || log.user;
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    onClick={() => handleMemberClick(project._id, logUserId)}
                                                                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                                                                    title={`Click to view work logs for ${log.user?.firstName || 'user'} on ${project.name}`}
                                                                >
                                                                    <div className="flex items-center space-x-3 min-w-0">
                                                                        <UserAvatar user={log.user} size="sm" />
                                                                        <div className="min-w-0">
                                                                            <div className="flex items-center space-x-2">
                                                                                <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                                                    {log.user?.firstName} {log.user?.lastName}
                                                                                </span>
                                                                                <span className="text-slate-400">•</span>
                                                                                <span className="text-slate-500 font-medium">
                                                                                    {log.date ? new Date(log.date).toLocaleDateString() : '—'}
                                                                                </span>
                                                                            </div>
                                                                            {log.description && (
                                                                                <p className="text-slate-600 truncate mt-0.5" title={log.description}>
                                                                                    {log.description}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center space-x-3 flex-shrink-0">
                                                                        <span className="font-extrabold text-purple-700 text-sm">
                                                                            {formatHours(log.hours)} hrs
                                                                        </span>
                                                                        <span className="text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <ArrowUpRight size={14} />
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

        </div>
    );
};

export default ClientProjectSnapshotTab;

