import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  Briefcase,
  ArrowLeft,
  ExternalLink,
  FileText,
  FolderGit2,
  MessageSquare,
  CheckSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import projectService from '../services/projectService';
import Skeleton from '@/components/ui/Skeleton';

export const EmployeePerformance = ({ userId, employee: initialEmployee = null, onBack = null }) => {
  const navigate = useNavigate();
  const [range, setRange] = useState('all'); // '7d', '30d', '90d', 'all'
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
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Team Directory
          </button>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
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
      <div className="space-y-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Team Directory
          </button>
        )}
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center shadow-xs space-y-2">
          <Briefcase size={36} className="text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-700">No project activity found</h4>
          <p className="text-xs text-slate-400">
            This employee has no tasks assigned or work logged in the selected timeframe.
          </p>
        </div>
      </div>
    );
  }

  const {
    user = initialEmployee,
    delivery = {},
    timing = {},
    estimation = {},
    rework = {},
    trend = [],
    projectsAllocated = { totalAllocated: 0, totalActiveAllocated: 0, list: [] },
    recentLogs = [],
    discussions = { created: 0, completed: 0 }
  } = data;

  const totalAssigned = delivery.tasksAssigned || 0;
  const totalCompleted = delivery.tasksCompleted || 0;
  const completionPercent = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;
  const allocatedList = projectsAllocated.list || [];
  const totalLoggedHours = estimation.loggedHours || 0;

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Team Member';
  const initial = (user?.firstName || fullName || 'U')[0]?.toUpperCase();

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shrink-0"
              title="Back to All Users"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          <div className="w-11 h-11 rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs overflow-hidden shrink-0">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">
                {fullName}
              </h3>
              {user?.department && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {user.department}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {user?.email} &bull; Project allocation, hours spent, & performance metrics
            </p>
          </div>
        </div>

        {/* Range Buttons & Refresh */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
            {[
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
              { id: 'all', label: 'All Time' }
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  range === r.id
                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r.label}
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
        {/* Allocated Projects */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
            <Briefcase size={13} /> Allocated Projects
          </span>
          <div className="text-2xl font-bold text-indigo-600">
            {projectsAllocated.totalAllocated || allocatedList.length}
            <span className="text-xs font-normal text-slate-400 ml-1.5">
              projects
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            {projectsAllocated.totalActiveAllocated || 0} currently active
          </div>
        </div>

        {/* Hours Spent */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
            <Clock size={13} /> Hours Spent
          </span>
          <div className="text-2xl font-bold text-blue-600">
            {totalLoggedHours}h
            <span className="text-xs font-normal text-slate-400 ml-1.5">
              logged
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            {estimation.estimatedHours || 0}h estimated
          </div>
        </div>

        {/* Discussion Created */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
          <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1">
            <MessageSquare size={13} /> Discussion Created
          </span>
          <div className="text-2xl font-bold text-purple-600">
            {discussions.created || 0}
            <span className="text-xs font-normal text-slate-400 ml-1.5">
              created
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Created by this member
          </div>
        </div>

        {/* Task Completed */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 size={13} /> Task Completed
          </span>
          <div className="text-2xl font-bold text-emerald-600">
            {totalCompleted}
            <span className="text-xs font-normal text-slate-400 ml-1.5">
              / {totalAssigned}
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            {completionPercent}% completion rate
          </div>
        </div>

        {/* Discussion Completed */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
          <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider flex items-center gap-1">
            <CheckSquare size={13} /> Discussion Completed
          </span>
          <div className="text-2xl font-bold text-teal-600">
            {discussions.completed || 0}
            <span className="text-xs font-normal text-slate-400 ml-1.5">
              completed
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Marked as complete
          </div>
        </div>
      </div>

      {/* Allocated Projects & Hours Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FolderGit2 size={17} className="text-blue-600" />
              Allocated Projects & Hours Spent
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Specific project assignments, role allocations, and time logged per project
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {allocatedList.length} Total Projects
          </span>
        </div>

        {allocatedList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No project allocations or hours recorded for this user in the selected range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">Project Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Tasks</th>
                  <th className="py-3 px-4">Hours Spent</th>
                  <th className="py-3 px-5 text-right">Time Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocatedList.map((p) => {
                  const percentShare = totalLoggedHours > 0
                    ? Math.round((p.loggedHours / totalLoggedHours) * 100)
                    : 0;

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/projects/${p._id}`)}
                            className="font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1.5 cursor-pointer text-left"
                            title="Open Project"
                          >
                            <span>{p.name}</span>
                            <ExternalLink size={12} className="opacity-70" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : p.status === 'Completed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : p.status === 'On Hold'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-semibold">
                        {p.tasksCompleted} <span className="text-slate-400 font-normal">/ {p.tasksAssigned} done</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {p.loggedHours} <span className="text-xs font-normal text-slate-400">hrs</span>
                        </div>
                        {p.estimatedHours > 0 && (
                          <div className="text-[10px] text-slate-400">
                            Est: {p.estimatedHours} hrs
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full"
                              style={{ width: `${percentShare}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-700 text-xs w-9 text-right">
                            {percentShare}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Work Logs Table */}
      {recentLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText size={17} className="text-slate-600" />
                Recent Work Logs & Time Entries
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed breakdown of recent hours submitted by this user
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Hours</th>
                  <th className="py-3 px-5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-5 text-slate-500 font-medium whitespace-nowrap">
                      {log.date ? new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {log.projectName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {log.taskTitle}
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-600">
                      {log.hours}h
                    </td>
                    <td className="py-3 px-5 text-slate-500 max-w-xs truncate">
                      {log.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePerformance;
