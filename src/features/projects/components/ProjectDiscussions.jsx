import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/apiClient';
import toast from 'react-hot-toast';
import {
  MessageSquare,
  Plus,
  Clock,
  Calendar,
  User,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Users,
  Check,
  Tag,
  ExternalLink,
  Filter,
  ChevronLeft,
  ChevronRight,
  Folder
} from 'lucide-react';
import projectService from '../services/projectService';

const STATUS_TABS = [
  { key: 'all', label: 'All', color: 'text-slate-700', bg: 'bg-slate-100', active: 'bg-slate-800 text-white' },
  { key: 'inprogress', label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-50', active: 'bg-blue-600 text-white' },
  { key: 'planning', label: 'Planning', color: 'text-purple-600', bg: 'bg-purple-50', active: 'bg-purple-600 text-white' },
  { key: 'on-hold', label: 'On Hold', color: 'text-amber-600', bg: 'bg-amber-50', active: 'bg-amber-500 text-white' },
  { key: 'mark as complete', label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-50', active: 'bg-emerald-600 text-white' },
];

const PRIORITY_BADGES = {
  Urgent: { label: 'Urgent', class: 'bg-rose-50 text-rose-700 border-rose-200' },
  High: { label: 'High', class: 'bg-orange-50 text-orange-700 border-orange-200' },
  Medium: { label: 'Medium', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  Low: { label: 'Low', class: 'bg-slate-100 text-slate-600 border-slate-200' }
};

const getStatusBadge = (status) => {
  const s = (status || '').toLowerCase().trim();
  if (s === 'mark as complete' || s === 'completed' || s === 'complete') {
    return { label: 'Completed', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  if (s === 'planning') {
    return { label: 'Planning', class: 'bg-purple-50 text-purple-700 border-purple-200' };
  }
  if (s === 'on-hold' || s === 'on hold') {
    return { label: 'On Hold', class: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  return { label: 'In Progress', class: 'bg-blue-50 text-blue-700 border-blue-200' };
};

export const ProjectDiscussions = ({
  projectId,
  project,
  workLogs: initialWorkLogs = [],
  onRefreshProject,
  onSelectTask,
  allTasks = [],
  initialModuleFilter = 'all'
}) => {
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState(initialModuleFilter || 'all');
  const [modules, setModules] = useState([]);

  useEffect(() => {
    if (initialModuleFilter) {
      setModuleFilter(initialModuleFilter);
      setPage(1);
    }
  }, [initialModuleFilter]);

  // Fetch modules for this project
  const fetchModules = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await api.get(`/projects/${projectId}/modules`);
      setModules(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch project modules in discussions:', err);
    }
  }, [projectId]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  // Pagination state (default: 20 entries)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [serverCounts, setServerCounts] = useState(null);
  const [serverMetrics, setServerMetrics] = useState(null);

  // Worklogs linked to this project/discussions
  const [projectWorkLogs, setProjectWorkLogs] = useState(() =>
    Array.isArray(project?.workLogs) && project.workLogs.length > 0
      ? project.workLogs
      : (Array.isArray(initialWorkLogs) ? initialWorkLogs : [])
  );
  const [openWorklogsIds, setOpenWorklogsIds] = useState(new Set());

  // Sync if project?.workLogs changes
  useEffect(() => {
    if (Array.isArray(project?.workLogs) && project.workLogs.length > 0) {
      setProjectWorkLogs(project.workLogs);
    }
  }, [project?.workLogs]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Current user from localStorage if available
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  }, []);

  // Fetch worklogs for a specific discussion as a targeted fallback
  const fetchLogsForDiscussion = async (discussionId) => {
    if (!discussionId) return;
    try {
      const res = await api.get(`/projects/worklogs?discussionId=${discussionId}`);
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length > 0) {
        setProjectWorkLogs((prev) => {
          const existingIds = new Set(prev.map((l) => String(l._id)));
          const newItems = list.filter((l) => !existingIds.has(String(l._id)));
          return newItems.length > 0 ? [...prev, ...newItems] : prev;
        });
      }
    } catch (err) {
      console.error('Failed to fetch discussion-specific worklogs:', err);
    }
  };

  // Fetch worklogs for this project to ensure all discussion logs are loaded
  const fetchWorkLogs = async () => {
    if (!projectId) return;
    try {
      const res = await api.get(`/projects/worklogs?projectId=${projectId}&limit=500`);
      const list = Array.isArray(res.data) ? res.data : [];
      setProjectWorkLogs(list);
    } catch (err) {
      console.error('Failed to fetch project worklogs in discussions:', err);
    }
  };

  // Fetch discussions for this project with server-side pagination & filtering
  const fetchDiscussions = useCallback(async (
    targetPage = page,
    targetLimit = limit,
    targetTab = activeTab,
    targetPriority = priorityFilter,
    targetSearch = searchQuery,
    targetCreator = creatorFilter,
    targetModule = moduleFilter
  ) => {
    if (!projectId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('project', projectId);
      params.append('page', String(targetPage));
      params.append('limit', String(targetLimit));
      if (targetTab && targetTab !== 'all') {
        params.append('status', targetTab);
      }
      if (targetPriority && targetPriority !== 'all') {
        params.append('priority', targetPriority);
      }
      if (targetSearch && targetSearch.trim()) {
        params.append('search', targetSearch.trim());
      }
      if (targetCreator && targetCreator !== 'all') {
        params.append('createdBy', targetCreator);
      }
      if (targetModule && targetModule !== 'all') {
        params.append('module', targetModule);
      }

      const res = await api.get(`/discussions?${params.toString()}`);
      const list = res.data?.discussions || res.data?.data || res.data || [];
      const arrayList = Array.isArray(list) ? list : [];
      setDiscussions(arrayList);
      setTotalPages(res.data?.totalPages || 1);
      setTotalCount(res.data?.total ?? arrayList.length);
      if (res.data?.counts) {
        setServerCounts(res.data.counts);
      }
      if (res.data?.metrics) {
        setServerMetrics(res.data.metrics);
      }

      // Auto-open worklogs on any discussion that already has logged hours
      const withHours = arrayList
        .filter((d) => (Number(d.totalLoggedHours) || 0) > 0)
        .map((d) => d._id);
      if (withHours.length > 0) {
        setOpenWorklogsIds((prev) => new Set([...prev, ...withHours]));
      }

      // Proactively fetch individual logs for discussions that have logged hours
      arrayList.forEach((d) => {
        if ((Number(d.totalLoggedHours) || 0) > 0) {
          fetchLogsForDiscussion(d._id);
        }
      });
    } catch (err) {
      console.error('Failed to fetch project discussions:', err);
      toast.error('Failed to load discussions');
      setDiscussions([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDiscussions(page, limit, activeTab, priorityFilter, searchQuery, creatorFilter, moduleFilter);
    }, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchDiscussions, page, limit, activeTab, priorityFilter, searchQuery, creatorFilter, moduleFilter]);

  useEffect(() => {
    fetchWorkLogs();
  }, [projectId]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  const handlePriorityChange = (val) => {
    setPriorityFilter(val);
    setPage(1);
  };

  const handleCreatorChange = (val) => {
    setCreatorFilter(val);
    setPage(1);
  };

  const handleModuleChange = (val) => {
    setModuleFilter(val);
    setPage(1);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleLimitChange = (val) => {
    setLimit(Number(val));
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const projectCreators = useMemo(() => {
    const map = new Map();
    if (Array.isArray(project?.members)) {
      project.members.forEach((m) => {
        if (m && (m._id || m)) {
          const id = String(m._id || m);
          const name = `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Member';
          map.set(id, { _id: id, name });
        }
      });
    }
    if (project?.manager) {
      const mgr = project.manager;
      const id = String(mgr._id || mgr);
      const name = `${mgr.firstName || ''} ${mgr.lastName || ''}`.trim() || 'Manager';
      map.set(id, { _id: id, name });
    }
    discussions.forEach((d) => {
      if (d.createdBy && (d.createdBy._id || d.createdBy)) {
        const id = String(d.createdBy._id || d.createdBy);
        const name = typeof d.createdBy === 'object'
          ? `${d.createdBy.firstName || ''} ${d.createdBy.lastName || ''}`.trim() || 'Creator'
          : 'Creator';
        if (!map.has(id)) {
          map.set(id, { _id: id, name });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [project, discussions]);

  // Tab counts
  const tabCounts = useMemo(() => {
    if (serverCounts) return serverCounts;
    const counts = { all: totalCount || discussions.length };
    STATUS_TABS.slice(1).forEach((t) => {
      counts[t.key] = discussions.filter((d) => d.status === t.key).length;
    });
    return counts;
  }, [serverCounts, totalCount, discussions]);

  // Filtered discussions (already filtered & paginated by backend)
  const filteredDiscussions = discussions;

  // Metrics summary
  const metrics = useMemo(() => {
    if (serverMetrics) return serverMetrics;
    const totalDiscussions = totalCount || discussions.length;
    const inProgress = discussions.filter((d) => d.status === 'inprogress').length;
    const completed = discussions.filter((d) => d.status === 'mark as complete').length;
    const totalHoursLogged = discussions.reduce((sum, d) => sum + (Number(d.totalLoggedHours) || 0), 0);
    return { totalDiscussions, inProgress, completed, totalHoursLogged };
  }, [serverMetrics, totalCount, discussions]);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleWorklogs = (id) => {
    setOpenWorklogsIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStatusChange = async (discussionId, newStatus) => {
    try {
      await api.put(`/discussions/${discussionId}`, { status: newStatus });
      toast.success('Discussion status updated');
      fetchDiscussions();
      if (onRefreshProject) onRefreshProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update discussion status');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Summary Metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Discussions</span>
            <MessageSquare size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{metrics.totalDiscussions}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Project topics & meetings</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">In Progress</span>
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{metrics.inProgress}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Active conversations</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Discussion Time</span>
            <Clock size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {metrics.totalHoursLogged.toFixed(1)} <span className="text-xs font-normal text-slate-500">hrs</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Total time logged on discussions</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Completed</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{metrics.completed}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Resolved topics</p>
        </div>
      </div>

      {/* ── Toolbar: Tabs, Search, Priority & New Discussion ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_TABS.map((tab) => {
            const count = tabCounts[tab.key] || 0;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive ? tab.active : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                {tab.label}
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Priority filter & Action */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => handlePriorityChange(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Creator / User filter */}
          <select
            value={creatorFilter}
            onChange={(e) => handleCreatorChange(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 max-w-[150px]"
          >
            <option value="all">All Creators</option>
            {projectCreators.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Module filter */}
          <select
            value={moduleFilter}
            onChange={(e) => handleModuleChange(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 max-w-[150px]"
          >
            <option value="all">All Modules</option>
            <option value="none">General (No Module)</option>
            {modules.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Search bar */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-44 sm:w-52"
            />
          </div>

          {/* New Discussion Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={15} /> New Discussion
          </button>
        </div>
      </div>

      {/* ── Discussions Cards Feed ── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
          <Loader2 size={24} className="animate-spin text-blue-600" />
          <span>Loading project discussions...</span>
        </div>
      ) : filteredDiscussions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <MessageSquare size={24} />
          </div>
          <h4 className="font-bold text-slate-800 text-sm">No discussions found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || activeTab !== 'all' || priorityFilter !== 'all' || creatorFilter !== 'all'
              ? 'No discussions match your filter criteria. Try clearing search or filters.'
              : 'Create a discussion topic, meeting agenda, or technical brainstorming thread to collaborate and log project time.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={15} /> Start First Discussion
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredDiscussions.map((disc) => {
            const isExpanded = expandedIds.has(disc._id);
            const isWorklogsOpen = openWorklogsIds.has(disc._id);
            const creator = disc.createdBy || {};
            const creatorName = `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || 'Team Member';
            const creatorPhoto = creator.profilePicture || creator.profilePhoto;
            const priorityBadge = PRIORITY_BADGES[disc.priority] || PRIORITY_BADGES.Medium;
            const statusBadge = getStatusBadge(disc.status);
            const totalLogged = Number(disc.totalLoggedHours) || 0;
            const participants = Array.isArray(disc.participants) ? disc.participants : [];

            // Find all worklog entries logged on this specific discussion
            const discLogs = projectWorkLogs.filter((w) => {
              const wDiscId = String(w.discussion?._id || w.discussion || '');
              return wDiscId && wDiscId === String(disc._id);
            });

            // Clean title: If title is generic "Discussion", use meaningful topic snippet
            const rawTitle = (disc.title || '').trim();
            const isGenericTitle = !rawTitle || rawTitle.toLowerCase() === 'discussion';
            const displayTitle = isGenericTitle
              ? (disc.discussion ? (disc.discussion.length > 70 ? `${disc.discussion.substring(0, 70)}...` : disc.discussion) : 'Discussion Topic')
              : rawTitle;

            return (
              <div
                key={disc._id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all p-5 space-y-3.5"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <span className="font-bold text-sm text-slate-900" title={rawTitle || displayTitle}>
                      {displayTitle}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${priorityBadge.class}`}
                    >
                      {priorityBadge.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.class}`}
                    >
                      {statusBadge.label}
                    </span>
                    {disc.module && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                        <Folder size={11} className="text-blue-500" />
                        {disc.module.name}
                      </span>
                    )}
                  </div>

                  {/* Right Header: Logged Hours Chip (clickable to toggle logs) & Quick Log Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleWorklogs(disc._id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                        isWorklogsOpen
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200'
                      }`}
                      title="Click to view or hide worklogs recorded on this discussion"
                    >
                      <Clock size={13} />
                      <span>{totalLogged.toFixed(1)} hrs logged</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          isWorklogsOpen ? 'bg-white/30 text-white' : 'bg-emerald-200/80 text-emerald-800'
                        }`}
                      >
                        {discLogs.length > 0 ? discLogs.length : (totalLogged > 0 ? '1' : '0')}
                      </span>
                      {isWorklogsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                </div>

                {/* Body Content (only show if body text is different from title) */}
                {disc.discussion && disc.discussion !== displayTitle && (
                  <div className="text-xs text-slate-600 bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                    <p className={`whitespace-pre-line leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
                      {disc.discussion}
                    </p>
                    {disc.discussion.length > 140 && (
                      <button
                        onClick={() => toggleExpand(disc._id)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 mt-1.5 flex items-center gap-0.5 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            Show less <ChevronUp size={12} />
                          </>
                        ) : (
                          <>
                            Read full discussion <ChevronDown size={12} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* ── Expandable Worklogs Feed on this Discussion ── */}
                {isWorklogsOpen && (
                  <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-emerald-600" />
                        <span className="text-xs font-bold text-slate-800">
                          Worklogs for this Discussion ({discLogs.length})
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          • {totalLogged.toFixed(1)} hrs total
                        </span>
                      </div>
                    </div>

                    {discLogs.length === 0 ? (
                      totalLogged > 0 ? (
                        <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-slate-200 text-xs">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Loader2 size={13} className="animate-spin text-emerald-600" />
                            <span>Fetching logged time details ({totalLogged.toFixed(1)} hrs)...</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => fetchLogsForDiscussion(disc._id)}
                            className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                          >
                            Refresh
                          </button>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic py-2 text-center">
                          No individual worklog details retrieved yet. Click <strong>Log Time</strong> above to record hours.
                        </p>
                      )
                    ) : (
                      <div className="space-y-2">
                        {discLogs.map((log) => {
                          const logUser = log.user || {};
                          const logUserName = `${logUser.firstName || ''} ${logUser.lastName || ''}`.trim() || 'Team Member';
                          const logPhoto = logUser.profilePicture || logUser.profilePhoto;
                          const logDate = log.date
                            ? new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '';

                          return (
                            <div
                              key={log._id}
                              className="bg-white p-3 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs hover:border-slate-300 transition-colors"
                            >
                              <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                                {logPhoto ? (
                                  <img
                                    src={logPhoto}
                                    alt={logUserName}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                    {logUserName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-slate-900">{logUserName}</span>
                                    {logDate && (
                                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                        <Calendar size={11} /> {logDate}
                                      </span>
                                    )}
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                        (log.status || 'PENDING') === 'APPROVED'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : (log.status || 'PENDING') === 'REJECTED'
                                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      }`}
                                    >
                                      {log.status || 'PENDING'}
                                    </span>
                                  </div>
                                  {log.description ? (
                                    <p className="text-xs font-medium text-slate-700 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                      "{log.description}"
                                    </p>
                                  ) : (
                                    <p className="text-[11px] text-slate-400 italic mt-0.5">
                                      No notes entered
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right sm:shrink-0">
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                  {Number(log.hours).toFixed(1)} hrs
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer metadata & participants */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Creator */}
                    <div className="flex items-center gap-1.5">
                      {creatorPhoto ? (
                        <img
                          src={creatorPhoto}
                          alt={creatorName}
                          className="w-5 h-5 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                          {creatorName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-[11px] text-slate-600">
                        By <strong className="font-semibold text-slate-800">{creatorName}</strong>
                      </span>
                    </div>

                    {/* Due Date */}
                    {disc.dueDate && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Calendar size={12} className="text-slate-400" />
                        <span>Due {new Date(disc.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    )}

                    {/* Est Hours */}
                    {disc.hours != null && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock size={12} className="text-slate-400" />
                        <span>Target: {disc.hours}h</span>
                      </div>
                    )}

                    {/* Participants count */}
                    {participants.length > 0 && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Users size={12} className="text-slate-400" />
                        <span>{participants.length} {participants.length === 1 ? 'member' : 'members'}</span>
                      </div>
                    )}
                  </div>

                  {/* Status quick toggle */}
                  <div className="flex items-center gap-2">
                    {disc.status !== 'mark as complete' ? (
                      <button
                        onClick={() => handleStatusChange(disc._id, 'mark as complete')}
                        className="text-[11px] font-medium text-slate-500 hover:text-emerald-600 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Check size={12} /> Mark as Complete
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(disc._id, 'inprogress')}
                        className="text-[11px] font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination Bar ── */}
      {totalCount > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Showing Range & Per-page Selector */}
          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            <span>
              Showing <strong className="text-slate-800 font-semibold">{Math.min((page - 1) * limit + 1, totalCount)}</strong> to{' '}
              <strong className="text-slate-800 font-semibold">{Math.min(page * limit, totalCount)}</strong> of{' '}
              <strong className="text-slate-800 font-semibold">{totalCount}</strong> discussions
            </span>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <span>Show:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                {[20, 50, 100].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleLimitChange(num)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      limit === num
                        ? 'bg-white text-blue-600 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <span className="text-slate-400">per page</span>
            </div>
          </div>

          {/* Right: Page Navigation */}
          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
              className={`px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors ${
                page <= 1 || loading
                  ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-50'
                  : 'hover:bg-slate-50 text-slate-700 cursor-pointer'
              }`}
              title="Previous Page"
            >
              <ChevronLeft size={14} />
              <span>Prev</span>
            </button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (p === 1 || p === totalPages) return true;
                  if (Math.abs(p - page) <= 1) return true;
                  return false;
                })
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) {
                    acc.push('...');
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) => {
                  if (item === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 text-xs select-none">
                        ...
                      </span>
                    );
                  }
                  const pNum = Number(item);
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => handlePageChange(pNum)}
                      disabled={loading}
                      className={`min-w-8 h-8 px-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        page === pNum
                          ? 'bg-blue-600 text-white shadow-2xs font-bold'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className={`px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors ${
                page >= totalPages || loading
                  ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-50'
                  : 'hover:bg-slate-50 text-slate-700 cursor-pointer'
              }`}
              title="Next Page"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Create New Discussion ── */}
      {showCreateModal && (
        <CreateDiscussionModal
          projectId={projectId}
          project={project}
          modules={modules}
          onModuleCreated={(m) => setModules((prev) => [...prev, m])}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchDiscussions();
            if (onRefreshProject) onRefreshProject();
          }}
        />
      )}
    </div>
  );
};

/* ── Submodal 1: Create Discussion Modal ── */
const CreateDiscussionModal = ({ projectId, project, modules = [], onModuleCreated, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [localModules, setLocalModules] = useState(modules);
  const [showNewModuleModal, setShowNewModuleModal] = useState(false);
  const [newModName, setNewModName] = useState('');
  const [newModDesc, setNewModDesc] = useState('');
  const [creatingModule, setCreatingModule] = useState(false);
  const [form, setForm] = useState({
    title: '',
    discussion: '',
    module: '',
    priority: 'Medium',
    status: 'inprogress',
    dueDate: '',
    hours: ''
  });

  useEffect(() => {
    setLocalModules(modules);
  }, [modules]);

  useEffect(() => {
    if ((!modules || modules.length === 0) && projectId) {
      api.get(`/projects/${projectId}/modules`)
        .then((res) => {
          if (Array.isArray(res.data)) setLocalModules(res.data);
        })
        .catch((err) => console.error('Failed to load modules in modal:', err));
    }
  }, [modules, projectId]);

  const handleCreateModuleInline = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newModName.trim()) {
      return toast.error('Please enter module name');
    }
    setCreatingModule(true);
    try {
      const res = await api.post('/projects/modules', {
        name: newModName.trim(),
        description: newModDesc.trim(),
        project: projectId,
        status: 'PLANNED'
      });
      const created = res.data;
      setLocalModules((prev) => [...prev, created]);
      if (onModuleCreated) onModuleCreated(created);
      setForm((prev) => ({ ...prev, module: created._id }));
      toast.success('Module created and selected!');
      setShowNewModuleModal(false);
      setNewModName('');
      setNewModDesc('');
    } catch (err) {
      console.error('Failed to create module:', err);
      toast.error(err.response?.data?.message || 'Failed to create module');
    } finally {
      setCreatingModule(false);
    }
  };

  // Project members for assignees/visibleTo
  const members = useMemo(() => {
    const list = Array.isArray(project?.members) ? [...project.members] : [];
    if (project?.manager && !list.some((m) => String(m._id || m) === String(project.manager._id || project.manager))) {
      list.unshift(project.manager);
    }
    return list;
  }, [project]);

  // Selected participant IDs (auto-select all by default)
  const [selectedUserIds, setSelectedUserIds] = useState(() =>
    new Set(members.map((m) => String(m._id || m)))
  );
  const [memberSearch, setMemberSearch] = useState('');

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase().trim();
    return members.filter((m) => {
      const name = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
      const email = (m.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [members, memberSearch]);

  const toggleUser = (id) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllMembers = () => {
    setSelectedUserIds(new Set(members.map((m) => String(m._id || m))));
  };

  const handleClearMembers = () => {
    setSelectedUserIds(new Set());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      return toast.error('Please enter discussion title');
    }
    if (!form.discussion.trim()) {
      return toast.error('Please enter discussion details or agenda');
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        discussion: form.discussion.trim(),
        priority: form.priority,
        status: form.status,
        project: projectId,
        module: form.module || undefined,
        dueDate: form.dueDate || undefined,
        hours: form.hours ? Number(form.hours) : undefined,
        supervisor: project?.manager?._id || project?.manager || undefined,
        visibleToUserIds: Array.from(selectedUserIds)
      };

      await api.post('/discussions', payload);
      toast.success('Discussion created successfully!');
      onSuccess();
    } catch (err) {
      console.error('Create discussion error:', err);
      toast.error(err.response?.data?.message || 'Failed to create discussion');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MessageSquare size={17} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">New Project Discussion</h3>
              <p className="text-[11px] text-slate-500">
                Start a discussion topic or meeting notes for {project?.name || 'this project'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column: Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Discussion Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Architecture review for auth service"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Agenda / Notes / Discussion Details <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Write the discussion points, agenda, technical decisions, or questions..."
                  value={form.discussion}
                  onChange={(e) => setForm({ ...form, discussion: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Module (Optional)</label>
                  <button
                    type="button"
                    onClick={() => setShowNewModuleModal(true)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus size={12} /> Add New Module
                  </button>
                </div>
                <select
                  value={form.module}
                  onChange={(e) => {
                    if (e.target.value === '__NEW_MODULE__') {
                      setShowNewModuleModal(true);
                      return;
                    }
                    setForm({ ...form, module: e.target.value });
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">No Module (General)</option>
                  {(localModules || []).map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                  <option value="__NEW_MODULE__" className="text-blue-600 font-semibold">
                    + Add New Module...
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="inprogress">In Progress</option>
                    <option value="planning">Planning</option>
                    <option value="on-hold">On Hold</option>
                    <option value="mark as complete">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Hours (optional)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g. 2.0"
                    value={form.hours}
                    onChange={(e) => setForm({ ...form, hours: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Participants Auto-Assigned */}
            <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    Participants ({selectedUserIds.size}/{members.length})
                  </label>
                  <p className="text-[11px] text-slate-500">
                    All project team members are auto-included
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAllMembers}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleClearMembers}
                    className="text-slate-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Search member */}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter members..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full pl-7.5 pr-2.5 py-1.5 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Members List */}
              <div className="flex-1 overflow-y-auto max-h-64 space-y-1 pr-1">
                {filteredMembers.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-4">No matching members</p>
                ) : (
                  filteredMembers.map((m) => {
                    const id = String(m._id || m);
                    const isChecked = selectedUserIds.has(id);
                    const name = `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Team Member';
                    const isManager = project?.manager && String(project.manager._id || project.manager) === id;

                    return (
                      <div
                        key={id}
                        onClick={() => toggleUser(id)}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-blue-50/60 border-blue-200 text-slate-900'
                            : 'bg-white border-slate-200/70 text-slate-600 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 pointer-events-none"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold truncate block">{name}</span>
                            {m.email && <span className="text-[10px] text-slate-400 truncate block">{m.email}</span>}
                          </div>
                        </div>

                        {isManager && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                            Manager
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Creating...
                </>
              ) : (
                'Create Discussion'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Submodal: Quick Add Module ── */}
      {showNewModuleModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Add New Module</h3>
                <p className="text-[11px] text-slate-500">Under project: {project?.name || 'This Project'}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNewModuleModal(false);
                  setNewModName('');
                  setNewModDesc('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateModuleInline} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Module Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Authentication, Billing, Dashboard"
                  value={newModName}
                  onChange={(e) => setNewModName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Module description or goals..."
                  value={newModDesc}
                  onChange={(e) => setNewModDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewModuleModal(false);
                    setNewModName('');
                    setNewModDesc('');
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingModule || !newModName.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {creatingModule ? 'Creating...' : 'Create Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDiscussions;

