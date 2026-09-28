import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import {
  Users,
  UserCheck,
  Clock,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  Briefcase,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
  Layers,
  Award,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import projectService from '../services/projectService';
import { useAuth } from '@/features/auth/context/AuthContext';
import Skeleton from '@/components/ui/Skeleton';

// Avatar component with photo fallback to initial
const MemberAvatar = ({ member, size = 'md', className = '' }) => {
  const [imgError, setImgError] = useState(false);
  const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'User';
  const initial = (member.firstName || fullName || 'U')[0].toUpperCase();
  const photoUrl = member.profilePicture || member.profilePhoto;

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm'
  }[size] || 'w-8 h-8 text-xs';

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={fullName}
        onError={() => setImgError(true)}
        className={`${sizeClasses} rounded-full object-cover border border-white shadow-2xs shrink-0 select-none ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${sizeClasses} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center border border-white shadow-2xs shrink-0 select-none ${className}`}
    >
      {initial}
    </div>
  );
};

export const UserPerformanceTrace = ({
  projectId,
  project,
  members = [],
  employees = [],
  tasks = [],
  modules = [],
  onSelectTask,
  onOpenLogModal,
  selectedUserId: propSelectedUserId = 'ALL',
  onSelectUserId
}) => {
  const { user: currentUser } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState(propSelectedUserId || 'ALL');
  const [logs, setLogs] = useState(() => Array.isArray(project?.workLogs) ? project.workLogs : []);
  const [loading, setLoading] = useState(!Array.isArray(project?.workLogs) || project.workLogs.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  // Sync state if selectedUserId changes from parent
  useEffect(() => {
    if (propSelectedUserId !== undefined) {
      setSelectedUserId(propSelectedUserId);
    }
  }, [propSelectedUserId]);

  const handleSelectUser = (id) => {
    setSelectedUserId(id);
    if (typeof onSelectUserId === 'function') {
      onSelectUserId(id);
    }
  };

  // Sync with project workLogs if updated from parent
  useEffect(() => {
    if (Array.isArray(project?.workLogs) && project.workLogs.length > 0) {
      setLogs(project.workLogs);
    }
  }, [project?.workLogs]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('all'); // 'all', '7d', '14d', '30d'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'APPROVED', 'PENDING'

  const currentUserId = (currentUser?._id || currentUser?.id)?.toString();
  const isAdmin = (currentUser?.roles || []).some(r => {
    const roleName = typeof r === 'string' ? r : r?.name;
    const lower = String(roleName || '').toLowerCase().trim();
    return lower === 'admin' || lower === 'system admin' || lower === 'super admin' || r?.isSystem === true;
  }) || (currentUser?.permissions || []).includes('*') || (currentUser?.permissions || []).includes('admin');

  // Resolve member list with enriched employee info (profilePicture, names, emails)
  const resolvedMembers = useMemo(() => {
    const list = Array.isArray(members) ? [...members] : [];
    if (project?.manager) {
      const mgrId = String(project.manager?._id || project.manager);
      if (!list.some(m => String(m?._id || m) === mgrId)) {
        list.unshift(project.manager);
      }
    }
    // Include any user who has logged work on this project
    logs.forEach(l => {
      if (l.user) {
        const uId = String(l.user?._id || l.user);
        if (!list.some(m => String(m?._id || m) === uId)) {
          list.push(l.user);
        }
      }
    });

    return list.map((m, idx) => {
      const mId = String(m?._id || m);
      const match = employees.find(e => String(e._id) === mId);
      const baseObj = typeof m === 'object' && m !== null ? m : (match || {});
      const pic = baseObj.profilePicture || baseObj.profilePhoto || match?.profilePicture || match?.profilePhoto || null;
      const firstName = baseObj.firstName || match?.firstName || 'Member';
      const lastName = baseObj.lastName || match?.lastName || '';
      const email = baseObj.email || match?.email || '';
      const isManager = project?.manager && String(project.manager._id || project.manager) === mId;

      return {
        _id: mId || `member-${idx}`,
        firstName,
        lastName,
        email,
        profilePicture: pic,
        isManager
      };
    });
  }, [members, employees, project?.manager, logs]);

  // Fetch all logs for this project (retains entire project dataset for all cards)
  const fetchWorkLogs = useCallback(async () => {
    if (!projectId) return;
    try {
      if (logs.length === 0 && (!project?.workLogs || project.workLogs.length === 0)) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const res = await projectService.getWorkLogs({ projectId });
      const fetchedLogs = Array.isArray(res.data) ? res.data : [];
      if (fetchedLogs.length > 0) {
        setLogs(fetchedLogs);
      } else if (Array.isArray(project?.workLogs) && project.workLogs.length > 0) {
        setLogs(project.workLogs);
      }
    } catch (err) {
      console.error('Failed to load project work logs:', err);
      if (Array.isArray(project?.workLogs) && project.workLogs.length > 0) {
        setLogs(project.workLogs);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, project?.workLogs, logs.length]);

  useEffect(() => {
    fetchWorkLogs();
  }, [fetchWorkLogs]);

  // Delete work log handler
  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this work log?')) return;
    try {
      await projectService.deleteWorkLog(logId);
      toast.success('Work log removed');
      setLogs(prev => prev.filter(l => l._id !== logId));
    } catch (err) {
      toast.error('Failed to delete work log');
    }
  };

  // Map each member's assigned tasks from the project tasks prop
  const memberTaskStats = useMemo(() => {
    const stats = {};
    resolvedMembers.forEach(m => {
      stats[m._id] = {
        assignedTasks: [],
        completedTasks: [],
        totalAssigned: 0,
        totalCompleted: 0
      };
    });

    tasks.forEach(t => {
      const assignees = Array.isArray(t.assignees) ? t.assignees : [];
      assignees.forEach(a => {
        const aId = String(a?._id || a);
        if (stats[aId]) {
          stats[aId].assignedTasks.push(t);
          stats[aId].totalAssigned += 1;
          if (t.status === 'DONE') {
            stats[aId].completedTasks.push(t);
            stats[aId].totalCompleted += 1;
          }
        }
      });
    });

    return stats;
  }, [resolvedMembers, tasks]);

  // Member-wise aggregate metrics (total hours, log count)
  const memberMetrics = useMemo(() => {
    const metrics = {};
    resolvedMembers.forEach(m => {
      metrics[m._id] = {
        totalHours: 0,
        logCount: 0,
        activeDates: new Set()
      };
    });

    logs.forEach(l => {
      const uId = String(l.user?._id || l.user);
      if (metrics[uId]) {
        metrics[uId].totalHours += Number(l.hours) || 0;
        metrics[uId].logCount += 1;
        if (l.date) {
          metrics[uId].activeDates.add(format(new Date(l.date), 'yyyy-MM-dd'));
        }
      }
    });

    return metrics;
  }, [resolvedMembers, logs]);

  // Filter logs by search, date range, and status
  const filteredLogs = useMemo(() => {
    const now = new Date();
    return logs.filter(log => {
      // User scope filter (if selectedUserId is set)
      if (selectedUserId !== 'ALL') {
        const logUserId = String(log.user?._id || log.user);
        if (logUserId !== selectedUserId) return false;
      }

      // Search query filter (matches task name, task key, description, or user name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const taskName = String(log.task?.name || '').toLowerCase();
        const taskKey = String(log.task?.taskKey || '').toLowerCase();
        const desc = String(log.description || '').toLowerCase();
        const userName = `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.toLowerCase();
        const moduleName = String(log.task?.module?.name || log.module?.name || '').toLowerCase();
        if (!taskName.includes(q) && !taskKey.includes(q) && !desc.includes(q) && !userName.includes(q) && !moduleName.includes(q)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        if ((log.status || 'PENDING') !== statusFilter) return false;
      }

      // Date range filter
      if (dateRange !== 'all' && log.date) {
        const logDate = new Date(log.date);
        const diffDays = (now - logDate) / (1000 * 60 * 60 * 24);
        if (dateRange === '7d' && diffDays > 7) return false;
        if (dateRange === '14d' && diffDays > 14) return false;
        if (dateRange === '30d' && diffDays > 30) return false;
      }

      return true;
    });
  }, [logs, selectedUserId, searchQuery, dateRange, statusFilter]);

  // Group filtered logs date-wise (descending order)
  const groupedLogs = useMemo(() => {
    const groups = {};

    filteredLogs.forEach(log => {
      if (!log.date) return;
      const dateKey = format(new Date(log.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey,
          dateObj: new Date(log.date),
          totalHours: 0,
          entries: []
        };
      }
      groups[dateKey].entries.push(log);
      groups[dateKey].totalHours += Number(log.hours) || 0;
    });

    return Object.values(groups).sort((a, b) => b.dateObj - a.dateObj);
  }, [filteredLogs]);

  // Performance analytics for the currently selected user (or all members combined)
  const activeMetrics = useMemo(() => {
    const relevantLogs = filteredLogs;
    const totalHours = relevantLogs.reduce((acc, l) => acc + (Number(l.hours) || 0), 0);
    const uniqueDays = new Set(relevantLogs.map(l => l.date ? format(new Date(l.date), 'yyyy-MM-dd') : null).filter(Boolean));
    const activeDaysCount = uniqueDays.size;
    const avgDailyHours = activeDaysCount > 0 ? (totalHours / activeDaysCount).toFixed(1) : '0';

    let totalAssignedTasks = 0;
    let totalCompletedTasks = 0;

    if (selectedUserId === 'ALL') {
      tasks.forEach(t => {
        if (Array.isArray(t.assignees) && t.assignees.length > 0) {
          totalAssignedTasks += 1;
          if (t.status === 'DONE') totalCompletedTasks += 1;
        }
      });
    } else {
      const stats = memberTaskStats[selectedUserId];
      if (stats) {
        totalAssignedTasks = stats.totalAssigned;
        totalCompletedTasks = stats.totalCompleted;
      }
    }

    const completionRate = totalAssignedTasks > 0
      ? Math.round((totalCompletedTasks / totalAssignedTasks) * 100)
      : 0;

    return {
      totalHours: totalHours.toFixed(1),
      logCount: relevantLogs.length,
      activeDaysCount,
      avgDailyHours,
      totalAssignedTasks,
      totalCompletedTasks,
      completionRate
    };
  }, [filteredLogs, selectedUserId, tasks, memberTaskStats]);

  // Daily hours chart data (last 14 active days or chronological sequence)
  const chartData = useMemo(() => {
    const dateMap = {};
    filteredLogs.forEach(l => {
      if (!l.date) return;
      const key = format(new Date(l.date), 'yyyy-MM-dd');
      dateMap[key] = (dateMap[key] || 0) + (Number(l.hours) || 0);
    });

    const sortedDates = Object.keys(dateMap).sort().slice(-14);
    return sortedDates.map(dateStr => ({
      date: format(new Date(dateStr), 'MMM d'),
      hours: Number(dateMap[dateStr].toFixed(1)),
      rawDate: dateStr
    }));
  }, [filteredLogs]);

  // Format date display helper
  const formatDateHeading = (dateObj) => {
    try {
      if (isToday(dateObj)) return 'Today';
      if (isYesterday(dateObj)) return 'Yesterday';
      return format(dateObj, 'EEEE, MMM d, yyyy');
    } catch {
      return 'Unknown Date';
    }
  };

  const selectedMemberObj = useMemo(() => {
    if (selectedUserId === 'ALL') return null;
    return resolvedMembers.find(m => m._id === selectedUserId);
  }, [selectedUserId, resolvedMembers]);

  return (
    <div className="space-y-6">
      {/* Top Banner & User Selector */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs">
              <UserCheck size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                User Performance & Activity Trace
                {refreshing && <span className="text-[11px] font-normal text-blue-600 animate-pulse">• Updating...</span>}
              </h2>
              <p className="text-[11px] text-slate-500">
                Inspect assigned project team members individually, track date-wise work logs & measure productivity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchWorkLogs}
              disabled={refreshing}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
              title="Refresh Logs"
            >
              <RotateCcw size={14} className={refreshing ? 'animate-spin text-blue-600' : ''} />
            </button>
          </div>
        </div>

        {/* Assigned Users Cards / Selector Bar */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={13} className="text-blue-600" /> Assigned Team Members ({resolvedMembers.length})
            </span>
            {selectedUserId !== 'ALL' && (
              <button
                onClick={() => handleSelectUser('ALL')}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                View All Members
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* "All Members" Summary Card */}
            <div
              onClick={() => handleSelectUser('ALL')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                selectedUserId === 'ALL'
                  ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                selectedUserId === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                <Users size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 truncate">All Members</h4>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {resolvedMembers.length} users
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock size={11} className="text-blue-600" />
                    <strong>{logs.reduce((sum, l) => sum + (Number(l.hours) || 0), 0).toFixed(1)}</strong> hrs
                  </span>
                  <span>•</span>
                  <span><strong>{logs.length}</strong> logs</span>
                </div>
              </div>
            </div>

            {/* Individual Member Cards */}
            {resolvedMembers.map(m => {
              const fullName = `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Member';
              const isSelected = selectedUserId === m._id;
              const stats = memberTaskStats[m._id] || { totalAssigned: 0, totalCompleted: 0 };
              const metrics = memberMetrics[m._id] || { totalHours: 0, logCount: 0 };

              return (
                <div
                  key={m._id}
                  onClick={() => handleSelectUser(m._id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <MemberAvatar member={m} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 justify-between">
                      <h4 className="font-bold text-xs text-slate-900 truncate" title={fullName}>
                        {fullName}
                      </h4>
                      {m.isManager && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          Lead
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{m.email || 'No email'}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-600">
                      <span className="font-semibold text-blue-700 flex items-center gap-0.5">
                        <Clock size={11} /> {metrics.totalHours.toFixed(1)}h
                      </span>
                      <span>•</span>
                      <span>{stats.totalCompleted}/{stats.totalAssigned} tasks</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI Performance Metrics for Selected Scope */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Logged Hours */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Logged Hours</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock size={15} />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">
              {activeMetrics.totalHours} <span className="text-xs font-normal text-slate-500">hrs</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Across {activeMetrics.logCount} worklog {activeMetrics.logCount === 1 ? 'entry' : 'entries'}
            </p>
          </div>
        </div>

        {/* KPI 2: Task Completion */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tasks Delivered</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">
              {activeMetrics.totalCompletedTasks} <span className="text-xs font-normal text-slate-500">/ {activeMetrics.totalAssignedTasks}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
              <span>Completion rate</span>
              <span className="font-semibold text-emerald-600">{activeMetrics.completionRate}%</span>
            </div>
            {activeMetrics.totalAssignedTasks > 0 && (
              <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${activeMetrics.completionRate}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* KPI 3: Active Days */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Active Days</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar size={15} />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">
              {activeMetrics.activeDaysCount} <span className="text-xs font-normal text-slate-500">days</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Recorded activity dates
            </p>
          </div>
        </div>

        {/* KPI 4: Daily Productivity */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Daily Average</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">
              {activeMetrics.avgDailyHours} <span className="text-xs font-normal text-slate-500">hrs/day</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Avg pace per active day
            </p>
          </div>
        </div>
      </div>

      {/* Date-wise Daily Hours Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Daily Hours Distribution {selectedMemberObj ? `– ${selectedMemberObj.firstName} ${selectedMemberObj.lastName}` : '– Project Team'}
              </h3>
              <p className="text-xs text-slate-500">Hours logged per active day</p>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
              Recent {chartData.length} active days
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${val} hrs`, 'Logged Time']}
                  labelFormatter={(lbl) => `Date: ${lbl}`}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="hours" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.hours >= 6 ? '#2563eb' : entry.hours >= 3 ? '#3b82f6' : '#93c5fd'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Date-wise Work Logs Feed Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Feed Header with Search & Filters */}
        <div className="p-4 border-b border-slate-200/80 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Calendar size={16} className="text-blue-600" />
              Date-wise Work Logs
              {selectedMemberObj && (
                <span className="text-[11px] font-normal text-slate-500">
                  for <strong>{selectedMemberObj.firstName} {selectedMemberObj.lastName}</strong>
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Chronological log trace of tasks, time spent, and accomplishment details
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search logs, tasks, users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7.5 pr-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-44 sm:w-52"
              />
            </div>

            {/* Date Range Select */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="py-1 px-2 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Dates</option>
              <option value="7d">Last 7 Days</option>
              <option value="14d">Last 14 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1 px-2 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Date Grouped Content */}
        {loading ? (
          <div className="p-5 space-y-3">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : groupedLogs.length === 0 ? (
          <div className="text-center py-14 px-4 space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Clock size={20} />
            </div>
            <h4 className="font-bold text-slate-800 text-xs">No Work Logs Found</h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              {searchQuery || dateRange !== 'all' || statusFilter !== 'all'
                ? 'No work logs match your filter criteria. Try clearing your filters.'
                : 'No work has been logged yet for the selected scope.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {groupedLogs.map(group => {
              const headingText = formatDateHeading(group.dateObj);
              const formattedDateString = format(group.dateObj, 'MMM d, yyyy');

              return (
                <div key={group.dateKey} className="p-4 space-y-2.5 hover:bg-slate-50/40 transition-colors">
                  {/* Date Heading Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        {headingText}
                        {headingText !== formattedDateString && (
                          <span className="text-[10px] font-normal text-slate-500">
                            ({formattedDateString})
                          </span>
                        )}
                      </h4>
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                        {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      <Clock size={12} />
                      <span>{group.totalHours.toFixed(1)} hrs total</span>
                    </div>
                  </div>

                  {/* Entries for this date */}
                  <div className="space-y-2 pl-3 border-l-2 border-slate-200/80 ml-0.5">
                    {group.entries.map(log => {
                      const logUser = log.user || {};
                      const logUserName = `${logUser.firstName || ''} ${logUser.lastName || ''}`.trim() || 'User';
                      const taskObj = log.task || {};
                      const moduleName = taskObj.module?.name || log.module?.name;
                      const isOwner = String(logUser._id || log.user) === currentUserId;
                      const canDelete = isOwner || isAdmin;

                      return (
                        <div
                          key={log._id}
                          className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-start justify-between gap-2.5"
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <MemberAvatar member={logUser} size="sm" className="mt-0.5" />
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-xs text-slate-800">
                                  {logUserName}
                                </span>

                                {taskObj._id ? (
                                  <button
                                    onClick={() => onSelectTask && onSelectTask(taskObj._id)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer group"
                                    title="Click to view task details"
                                  >
                                    <span>{taskObj.taskKey ? `[${taskObj.taskKey}]` : ''} {taskObj.name}</span>
                                    <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                ) : log.discussion ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                    <MessageSquare size={11} />
                                    <span>Discussion: {log.discussion?.title || log.discussion?.discussion || 'Discussion'}</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-medium text-slate-600 italic">
                                    Direct Project Work
                                  </span>
                                )}

                                {taskObj._id && log.discussion && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200" title="Worklogged via discussion">
                                    <MessageSquare size={10} />
                                    <span>[Discussion: {log.discussion?.title || 'Topic'}]</span>
                                  </span>
                                )}

                                {moduleName && (
                                  <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                    {moduleName}
                                  </span>
                                )}

                                {taskObj.priority && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                    taskObj.priority === 'URGENT' || taskObj.priority === 'HIGH'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {taskObj.priority}
                                  </span>
                                )}
                              </div>

                              {log.description ? (
                                <p className="text-[11px] text-slate-600 leading-normal bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                                  {log.description}
                                </p>
                              ) : (
                                <p className="text-[11px] text-slate-400 italic">
                                  No notes entered for this log
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right: Hours badge, status, action */}
                          <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                              <Clock size={11} />
                              {Number(log.hours).toFixed(1)} hrs
                            </span>

                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                              log.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              log.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {log.status || 'PENDING'}
                            </span>

                            {canDelete && (
                              <button
                                onClick={() => handleDeleteLog(log._id)}
                                className="p-0.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Log"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPerformanceTrace;
