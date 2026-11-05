import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  Briefcase,
  ArrowLeft,
  ExternalLink,
  FolderGit2,
  MessageSquare,
  CheckSquare,
  Download,
  CalendarRange,
  FileSpreadsheet,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { format, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import api from '@/lib/apiClient';
import { buildUserProjectWiseTimesheetWorkbook } from '../utils/projectTimesheetExportUtils';
import projectService from '../services/projectService';
import Skeleton from '@/components/ui/Skeleton';

export const EmployeePerformance = ({ userId, employee: initialEmployee = null, onBack = null }) => {
  const navigate = useNavigate();
  const [range, setRange] = useState('all'); // 'all', 'this_month', 'this_week', 'custom', '7d', '30d'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [appliedCustomStart, setAppliedCustomStart] = useState('');
  const [appliedCustomEnd, setAppliedCustomEnd] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const hasLoadedRef = useRef(false);

  const handleRangeChange = (newRange) => {
    setRange(newRange);
    if (newRange === 'custom') {
      if (!customStart || !customEnd) {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const s = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const e = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDay)}`;
        setCustomStart(s);
        setCustomEnd(e);
        setAppliedCustomStart(s);
        setAppliedCustomEnd(e);
      }
    }
  };

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) {
      toast.error('Please select both start date and end date');
      return;
    }
    if (new Date(customStart) > new Date(customEnd)) {
      toast.error('Start date cannot be after end date');
      return;
    }
    setAppliedCustomStart(customStart);
    setAppliedCustomEnd(customEnd);
  };

  // Timesheet Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTimeframe, setExportTimeframe] = useState('all'); // 'all' | 'thisMonth' | 'custom'
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const handleExecuteExport = async () => {
    if (!userId) return;

    let payload = { userIds: [userId] };
    let periodLabel = 'All Time';

    if (exportTimeframe === 'all') {
      payload.range = 'all';
      payload.month = 'all';
      periodLabel = 'All Time';
    } else if (exportTimeframe === 'thisMonth') {
      const curMonthKey = format(new Date(), 'yyyy-MM');
      payload.month = curMonthKey;
      periodLabel = format(new Date(), 'MMMM yyyy');
    } else if (exportTimeframe === 'custom') {
      if (!exportStartDate || !exportEndDate) {
        toast.error('Please select both start date and end date.');
        return;
      }
      if (new Date(exportStartDate) > new Date(exportEndDate)) {
        toast.error('Start date cannot be after end date.');
        return;
      }
      payload.fromDate = exportStartDate;
      payload.toDate = exportEndDate;
      periodLabel = `${format(new Date(exportStartDate), 'dd MMM yyyy')} - ${format(new Date(exportEndDate), 'dd MMM yyyy')}`;
    }

    const toastId = toast.loading('Generating project timesheet workbook...');
    setExporting(true);

    try {
      const res = await api.post('/timesheet/team-report', payload);
      const {
        teamMembers = [],
        workLogsByUser = {},
        assignedProjectsByUser = {},
        startDate,
        endDate
      } = res.data;

      const targetMember =
        teamMembers.find(m => String(m._id) === String(userId)) ||
        data?.user ||
        initialEmployee ||
        { firstName: 'Team Member' };

      const userLogs = workLogsByUser[String(userId)] || [];
      const projectsFromApi = assignedProjectsByUser[String(userId)] || [];
      const currentAllocated = data?.projectsAllocated?.list || [];

      // Merge assigned projects
      const mergedProjectsMap = new Map();
      currentAllocated.forEach(p => {
        if (p && p._id) mergedProjectsMap.set(String(p._id), p);
      });
      projectsFromApi.forEach(p => {
        const pId = String(p?._id || p);
        if (!mergedProjectsMap.has(pId)) {
          mergedProjectsMap.set(pId, p);
        } else {
          mergedProjectsMap.set(pId, { ...p, ...mergedProjectsMap.get(pId) });
        }
      });
      const mergedAssignedProjects = Array.from(mergedProjectsMap.values());

      if (userLogs.length === 0 && mergedAssignedProjects.length === 0) {
        toast.error('No project work logs or allocations found for this employee.', { id: toastId });
        return;
      }

      const { buffer, fileName } = await buildUserProjectWiseTimesheetWorkbook({
        employee: targetMember,
        periodLabel,
        startDate: exportTimeframe === 'custom' ? exportStartDate : startDate,
        endDate: exportTimeframe === 'custom' ? exportEndDate : endDate,
        workLogs: userLogs,
        assignedProjects: mergedAssignedProjects
      });

      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
      toast.success('Project-wise timesheet Excel downloaded!', { id: toastId });
      setShowExportModal(false);
    } catch (err) {
      console.error('Failed to export employee project timesheet:', err);
      toast.error('Failed to export timesheet report', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const fetchPerformance = useCallback(async (selectedRange) => {
    if (!userId) return;
    try {
      if (!hasLoadedRef.current) setLoading(true);
      else setRefreshing(true);

      const params = { range: selectedRange };
      if (selectedRange === 'custom') {
        if (appliedCustomStart) params.startDate = appliedCustomStart;
        if (appliedCustomEnd) params.endDate = appliedCustomEnd;
      }

      const res = await projectService.getEmployeePerformance(userId, params);
      hasLoadedRef.current = true;
      setData(res.data);
    } catch (err) {
      console.error('Failed to load employee performance:', err);
      toast.error('Failed to load employee performance metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, appliedCustomStart, appliedCustomEnd]);

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
    estimation = {},
    projectsAllocated = { totalAllocated: 0, totalActiveAllocated: 0, list: [] },
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
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold flex-wrap">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'this_month', label: 'This Month' },
              { id: 'this_week', label: 'This Week' },
              { id: 'custom', label: 'Custom' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => handleRangeChange(r.id)}
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

          {range === 'custom' && (
            <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-200 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-[10px] font-semibold text-blue-700">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCustom(); }}
                className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[10px] font-semibold text-blue-700">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCustom(); }}
                className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleApplyCustom}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-0.5 rounded text-xs transition shadow-2xs cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => fetchPerformance(range)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-blue-600' : ''} />
          </button>

          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition cursor-pointer"
            title="Download Timesheet Excel"
          >
            <Download size={14} className={exporting ? 'animate-spin' : ''} />
            <span>Export</span>
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
                          {p._id !== 'unassigned' ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/projects/${p._id}`)}
                              className="font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1.5 cursor-pointer text-left"
                              title="Open Project"
                            >
                              <span>{p.name}</span>
                              <ExternalLink size={12} className="opacity-70" />
                            </button>
                          ) : (
                            <span className="font-semibold text-slate-700">{p.name}</span>
                          )}
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

      {/* Timesheet Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Export User Timesheet</h3>
                  <p className="text-xs text-slate-500">
                    {fullName} &bull; Separate worksheet per project
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Timeframe Options */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Timeframe
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'all', title: 'All Time', desc: 'Complete history' },
                    { id: 'thisMonth', title: 'This Month', desc: format(new Date(), 'MMM yyyy') },
                    { id: 'custom', title: 'Custom', desc: 'Custom date range' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setExportTimeframe(opt.id);
                        if (opt.id === 'thisMonth') {
                          setExportStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                          setExportEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
                        }
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        exportTimeframe === opt.id
                          ? 'border-blue-600 bg-blue-50/60 shadow-2xs ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900">{opt.title}</div>
                      <div className="text-[11px] text-slate-500 mt-1">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range Picker */}
              {exportTimeframe === 'custom' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <CalendarRange size={14} className="text-blue-600" />
                      Date Range
                    </span>
                    <span className="text-[11px] text-slate-400">Quick presets</span>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Last 7 Days', getDates: () => [format(subDays(new Date(), 6), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd')] },
                      { label: 'Last 14 Days', getDates: () => [format(subDays(new Date(), 13), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd')] },
                      { label: 'Last 30 Days', getDates: () => [format(subDays(new Date(), 29), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd')] },
                      { label: 'This Month', getDates: () => [format(startOfMonth(new Date()), 'yyyy-MM-dd'), format(endOfMonth(new Date()), 'yyyy-MM-dd')] },
                      { label: 'Last Month', getDates: () => [format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')] }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const [s, e] = preset.getDates();
                          setExportStartDate(s);
                          setExportEndDate(e);
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Date Input Fields */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={exportStartDate}
                        onChange={(e) => setExportStartDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={exportEndDate}
                        onChange={(e) => setExportEndDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-Sheet Structure Notice */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
                <FolderGit2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block text-blue-950">Multi-Sheet Project Structure</span>
                  <span className="text-blue-700/90 text-[11px] leading-relaxed block">
                    The exported Excel workbook generates a <strong>Master Summary Sheet</strong> followed by a <strong>separate worksheet for every project</strong> detailing date-wise work logs, tasks, modules, hours, and status.
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                disabled={exporting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteExport}
                disabled={exporting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {exporting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Generating Excel...</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>Export Timesheet (.xlsx)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePerformance;
