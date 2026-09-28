import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Flame,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShieldAlert,
  AlertTriangle,
  Users,
  Target,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import projectService from '../services/projectService';
import WorkloadChart from './WorkloadChart';
import Skeleton from '@/components/ui/Skeleton';

const STATUS_PIE_COLORS = {
  TODO: '#94a3b8',
  IN_PROGRESS: '#3b82f6',
  IN_REVIEW: '#8b5cf6',
  BLOCKED: '#f43f5e',
  DONE: '#10b981'
};

export const ProjectPerformance = ({
  projectId,
  project,
  members = [],
  onSelectTask
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchPerformance = useCallback(async (userId = '') => {
    try {
      if (!projectId) return;
      if (!data) setLoading(true);
      else setRefreshing(true);

      const res = userId
        ? await projectService.getMemberPerformance(projectId, userId)
        : await projectService.getProjectPerformance(projectId);

      setData(res.data);
    } catch (err) {
      console.error('Failed to load performance metrics:', err);
      toast.error('Failed to load project performance metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPerformance(selectedUserId);
  }, [fetchPerformance, selectedUserId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center shadow-xs space-y-3">
        <TrendingUp size={40} className="text-slate-300 mx-auto" />
        <h3 className="font-bold text-slate-700">No performance data available</h3>
        <p className="text-xs text-slate-500">Track tasks and log work to generate analytics.</p>
      </div>
    );
  }

  const {
    summary = {},
    velocity = [],
    burndown = [],
    onTimeCompletion = {},
    overdue = [],
    blocked = [],
    workload = [],
    cycleTime = {},
    rework = {},
    estimationAccuracy = {},
    throughput = {}
  } = data;

  // Status breakdown data for pie chart
  const statusPieData = [
    { name: 'To Do', value: summary.todoTasks || 0, key: 'TODO' },
    { name: 'In Progress', value: summary.inProgressTasks || 0, key: 'IN_PROGRESS' },
    { name: 'In Review', value: summary.reviewTasks || 0, key: 'IN_REVIEW' },
    { name: 'Blocked', value: summary.blockedTasks || 0, key: 'BLOCKED' },
    { name: 'Done', value: summary.completedTasks || 0, key: 'DONE' }
  ].filter(s => s.value > 0);

  return (
    <div className="space-y-6">
      {/* Filter / Scope Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <TrendingUp size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Project Performance & Health Analytics
            </h2>
            <p className="text-xs text-slate-500">
              Real-time velocity, burndown, workload, cycle time & delivery accuracy
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Member Scope Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Scope:</span>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="zoho-input text-xs py-1.5 px-3 rounded-xl bg-slate-50 border-slate-200"
            >
              <option value="">All Team Members</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchPerformance(selectedUserId)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh analytics"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-blue-600' : ''} />
          </button>
        </div>
      </div>

      {/* Top Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Completion Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Completion Rate
          </span>
          <div className="text-2xl font-bold text-slate-900">
            {summary.completionRate || 0}%
          </div>
          <div className="text-[11px] text-slate-500">
            {summary.completedTasks || 0} of {summary.totalTasks || 0} tasks
          </div>
        </div>

        {/* Logged Work Hours */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
            <Clock size={12} /> Logged Hours
          </span>
          <div className="text-2xl font-bold text-indigo-600">
            {summary.loggedHours || 0}h
            <span className="text-xs font-normal text-slate-400 ml-1">
              / {summary.estimatedHours || 0}h est
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            {summary.remainingHours || 0}h remaining
          </div>
        </div>

        {/* On-Time Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 size={12} /> On-Time Rate
          </span>
          <div className="text-2xl font-bold text-emerald-600">
            {onTimeCompletion.rate !== null ? `${onTimeCompletion.rate}%` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500">
            {onTimeCompletion.onTime || 0} on-time ({onTimeCompletion.withDueDate || 0} tracked)
          </div>
        </div>

        {/* Cycle Time */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
            <Clock size={12} /> Avg Cycle Time
          </span>
          <div className="text-2xl font-bold text-blue-600">
            {cycleTime.averageDays !== null ? `${cycleTime.averageDays}d` : '-'}
          </div>
          <div className="text-[11px] text-slate-500">
            Progress to completion
          </div>
        </div>

        {/* Estimation Ratio */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
            <Zap size={12} /> Est. Accuracy
          </span>
          <div className="text-2xl font-bold text-amber-600">
            {estimationAccuracy.ratio !== null ? `${estimationAccuracy.ratio}x` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500">
            {summary.loggedHours || 0}h logged / {summary.estimatedHours || 0}h est
          </div>
        </div>

        {/* Rework Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
            <RotateCcw size={12} /> Rework Rate
          </span>
          <div className="text-2xl font-bold text-rose-600">
            {rework.reworkRate || 0}%
          </div>
          <div className="text-[11px] text-slate-500">
            {rework.reopenedTasks || 0} reopened tasks
          </div>
        </div>
      </div>

      {/* Row 1: Velocity & Burndown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Velocity Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-600" />
                Velocity & Throughput Trend
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tasks and story points delivered per week
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              Avg: {throughput.weeklyRate || 0} tasks/wk
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {velocity.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                No weekly completion data recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocity} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                      fontSize: '12px'
                    }}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />
                  <Bar dataKey="tasksCompleted" name="Tasks Delivered" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Burndown Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Flame size={16} className="text-amber-500" />
                Project Burndown Chart
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ideal remaining hours vs actual remaining estimated hours
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
              Remaining: {summary.remainingHours || 0}h
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {burndown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                Set start and due dates to generate project burndown.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={burndown} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                      fontSize: '12px'
                    }}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="idealEstimatedHours"
                    name="Ideal Burn"
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="remainingEstimatedHours"
                    name="Actual Remaining (hrs)"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorActual)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Workload Distribution & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WorkloadChart workload={workload} />
        </div>

        {/* Task Status Donut */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Target size={16} className="text-purple-600" />
            Task Status Breakdown
          </h3>

          <div className="h-56 w-full flex items-center justify-center">
            {statusPieData.length === 0 ? (
              <span className="text-xs text-slate-400 italic">No tasks created</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_PIE_COLORS[entry.key] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {statusPieData.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: STATUS_PIE_COLORS[s.key] }}
                  />
                  {s.name}
                </span>
                <span className="font-semibold text-slate-900">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Actionable Risk Lists (Blocked & Overdue) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blocked Tasks List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/40">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-rose-600" />
              <h4 className="font-bold text-slate-800 text-sm">
                Blocked Tasks ({blocked.length})
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full">
              Attention Required
            </span>
          </div>

          {blocked.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
              No blocked tasks! Work is flowing smoothly.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {blocked.map((t) => (
                <div
                  key={t._id}
                  onClick={() => onSelectTask && onSelectTask(t._id)}
                  className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {t.taskKey || 'TASK'}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 truncate">
                        {t.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-rose-600 flex items-center gap-1">
                      <span>Blocked by:</span>
                      <span className="font-semibold truncate">
                        {Array.isArray(t.blockedBy) && t.blockedBy.length > 0
                          ? t.blockedBy.map(b => b.taskKey || b.name).join(', ')
                          : 'External Blocker'}
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue Tasks List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/40">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <h4 className="font-bold text-slate-800 text-sm">
                Overdue Tasks ({overdue.length})
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
              Past Due Date
            </span>
          </div>

          {overdue.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
              All scheduled tasks are on track!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {overdue.map((t) => (
                <div
                  key={t._id}
                  onClick={() => onSelectTask && onSelectTask(t._id)}
                  className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {t.taskKey || 'TASK'}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 truncate">
                        {t.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-600">
                      Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Overdue'}
                    </div>
                  </div>

                  <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectPerformance;
