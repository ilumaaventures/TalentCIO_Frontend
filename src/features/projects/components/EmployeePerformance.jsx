import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  RotateCcw,
  Zap,
  Calendar,
  RefreshCw,
  Award,
  AlertCircle,
  Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';
import projectService from '../services/projectService';
import Skeleton from '@/components/ui/Skeleton';

export const EmployeePerformance = ({ userId, employee: initialEmployee = null }) => {
  const [range, setRange] = useState('30d'); // '7d', '30d', '90d'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPerformance = useCallback(async (selectedRange) => {
    if (!userId) return;
    try {
      if (!data) setLoading(true);
      else setRefreshing(true);

      const res = await projectService.getEmployeePerformance(userId, selectedRange);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load employee performance:', err);
      toast.error('Failed to load employee performance metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPerformance(range);
  }, [fetchPerformance, range]);

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center shadow-xs space-y-2">
        <Briefcase size={36} className="text-slate-300 mx-auto" />
        <h4 className="font-bold text-slate-700">No project activity found</h4>
        <p className="text-xs text-slate-400">
          This employee has no tasks assigned or work logged in the selected timeframe.
        </p>
      </div>
    );
  }

  const {
    user = initialEmployee,
    delivery = {},
    timing = {},
    estimation = {},
    rework = {},
    trend = []
  } = data;

  const totalAssigned = delivery.tasksAssigned || 0;
  const totalCompleted = delivery.tasksCompleted || 0;
  const completionPercent = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header & Range Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Award size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Project Performance & Delivery Analytics
            </h3>
            <p className="text-xs text-slate-500">
              Cross-project throughput, speed, on-time delivery & estimation accuracy
            </p>
          </div>
        </div>

        {/* Range Buttons & Refresh */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
            {['7d', '30d', '90d'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  range === r
                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchPerformance(range)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-blue-600' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Completed Tasks & Throughput */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 size={13} /> Completed Tasks
          </span>
          <div className="text-2xl font-bold text-emerald-600">
            {totalCompleted}
            <span className="text-xs font-normal text-slate-400 ml-1.5">
              / {totalAssigned} assigned
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            {completionPercent}% delivery completion
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        {/* On-Time Delivery Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
            <Calendar size={13} /> On-Time Rate
          </span>
          <div className="text-2xl font-bold text-blue-600">
            {timing.onTimeCompletionRate !== null ? `${timing.onTimeCompletionRate}%` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500">
            {timing.onTimeCount || 0} of {timing.completedWithDueDate || 0} with deadline
          </div>
        </div>

        {/* Average Cycle Time */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
            <Clock size={13} /> Avg Cycle Time
          </span>
          <div className="text-2xl font-bold text-indigo-600">
            {delivery.averageCycleTimeDays !== null ? `${delivery.averageCycleTimeDays}d` : '-'}
          </div>
          <div className="text-[11px] text-slate-500">
            From start to completion
          </div>
        </div>

        {/* Estimation Accuracy */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
            <Zap size={13} /> Est. Accuracy
          </span>
          <div className="text-2xl font-bold text-amber-600">
            {estimation.ratio !== null ? `${estimation.ratio}x` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500">
            {estimation.loggedHours || 0}h logged / {estimation.estimatedHours || 0}h est
          </div>
        </div>

        {/* Rework Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
          <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
            <RotateCcw size={13} /> Rework Rate
          </span>
          <div className="text-2xl font-bold text-rose-600">
            {rework.reworkRate || 0}%
          </div>
          <div className="text-[11px] text-slate-500">
            {rework.reopenedTasks || 0} reopened tasks
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Tasks Assigned vs Completed Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-600" />
                Task Throughput Trend
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Tasks assigned vs tasks delivered over time
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                No trend data recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
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
                  <Bar dataKey="tasksAssigned" name="Assigned" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="tasksCompleted" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Hours Trend (Logged vs Estimated) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock size={16} className="text-indigo-600" />
                Worklog Hours Trend
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Hours spent compared to initial estimates
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                No worklog data recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorLogged" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
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
                  <Area
                    type="monotone"
                    dataKey="loggedHours"
                    name="Logged Hours"
                    stroke="#6366f1"
                    fillOpacity={1}
                    fill="url(#colorLogged)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="estimatedHours"
                    name="Estimated Hours"
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    dot={false}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeePerformance;
