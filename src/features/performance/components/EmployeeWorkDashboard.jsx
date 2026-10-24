import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Star,
  Clock,
  Briefcase,
  CheckCircle2,
  FolderGit2,
  UserCheck,
  Building,
  Mail,
  Calendar,
  Send,
  Sparkles,
  RefreshCw,
  Award,
  AlertCircle,
  TrendingUp,
  FileText,
  Layers,
  ChevronRight,
  CheckSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import projectService from '@/features/projects/services/projectService';
import pmsApi from '../api/pmsApi';

const RATING_LABELS = {
  1: 'Needs Improvement',
  2: 'Developing',
  3: 'Meets Expectations',
  4: 'Exceeds Expectations',
  5: 'Exceptional Performance',
};

const getRatingLabel = (score) => {
  const num = Math.round(Number(score) || 0);
  if (num >= 5) return 'Exceptional Performance';
  if (num >= 4) return 'Exceeds Expectations';
  if (num >= 3) return 'Meets Expectations';
  if (num >= 2) return 'Developing';
  return 'Needs Improvement';
};

const RATING_COLORS = {
  1: 'text-rose-600 bg-rose-50 border-rose-200',
  2: 'text-amber-600 bg-amber-50 border-amber-200',
  3: 'text-blue-600 bg-blue-50 border-blue-200',
  4: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  5: 'text-emerald-600 bg-emerald-50 border-emerald-200',
};

const STATUS_BADGES = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'in progress': 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-slate-100 text-slate-700 border-slate-200',
  planning: 'bg-amber-50 text-amber-700 border-amber-200',
  on_hold: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function EmployeeWorkDashboard({
  evaluationItem,
  onBack,
  onReviewSubmitted,
  isAdmin,
  isHr,
  isManager,
  currentUser,
}) {
  const employeeId = evaluationItem?.employeeId;
  const user = evaluationItem?.user || {};
  const reportingManager = evaluationItem?.reportingManager;

  const [range, setRange] = useState('all'); // 'all', '90d', '30d', '7d'
  const [perfData, setPerfData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [logsPerPage, setLogsPerPage] = useState(5);
  const [logsPage, setLogsPage] = useState(1);

  // Review Form State
  const [reviewForm, setReviewForm] = useState({
    rating: evaluationItem?.ratings?.managerRating || evaluationItem?.ratings?.finalScore || 4,
    feedback: evaluationItem?.ratings?.managerComments || evaluationItem?.ratings?.adminComments || '',
    strengths: evaluationItem?.ratings?.managerStrengths || '',
    improvements: evaluationItem?.ratings?.managerImprovements || '',
    kraRatings: (evaluationItem?.kras || []).map((k) => ({
      kraId: k._id,
      name: k.name,
      weightage: k.weightage,
      score: k.score || 4,
      comments: k.comments || '',
    })),
    level: isAdmin ? 'admin' : isHr ? 'hr' : 'manager',
  });

  const fetchPerformance = useCallback(async (selectedRange) => {
    if (!employeeId) return;
    try {
      if (!perfData) setLoading(true);
      else setRefreshing(true);

      const res = await projectService.getEmployeePerformance(employeeId, selectedRange);
      setPerfData(res.data);
    } catch (err) {
      console.error('Failed to load employee performance dashboard:', err);
      toast.error('Could not load project activity for this employee');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeId, perfData]);

  useEffect(() => {
    fetchPerformance(range);
  }, [range]);

  const calculateOverallFromKras = () => {
    if (!reviewForm.kraRatings || reviewForm.kraRatings.length === 0) return;
    let totalWeight = 0;
    let weightedSum = 0;
    reviewForm.kraRatings.forEach((k) => {
      const weight = Number(k.weightage) || 25;
      const score = Number(k.score) || 0;
      weightedSum += score * weight;
      totalWeight += weight;
    });
    if (totalWeight > 0) {
      const computed = Math.round((weightedSum / totalWeight) * 10) / 10;
      setReviewForm((prev) => ({ ...prev, rating: computed }));
      toast.success(`Calculated overall rating: ${computed}`);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!employeeId) return;

    const numericRating = parseFloat(Number(reviewForm.rating).toFixed(1));
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      toast.error('Please select a rating between 1.0 and 5.0');
      return;
    }

    try {
      setSubmittingReview(true);
      const payload = {
        ...reviewForm,
        rating: numericRating,
        kraRatings: (reviewForm.kraRatings || []).map((k) => ({
          ...k,
          score: parseFloat(Number(k.score || numericRating).toFixed(1)),
        })),
      };

      const res = await pmsApi.submitEvaluationReview(employeeId, payload);
      if (res.data?.success) {
        toast.success(res.data.message || 'Feedback and rating submitted successfully!');
        if (onReviewSubmitted) {
          onReviewSubmitted({
            employeeId,
            rating: numericRating,
            feedback: reviewForm.feedback,
            strengths: reviewForm.strengths,
            improvements: reviewForm.improvements,
          });
        }
      }
    } catch (err) {
      console.error('Submit review error:', err);
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Scroll smoothly to feedback form
  const scrollToFeedback = () => {
    const el = document.getElementById('feedback-form-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Extract metrics from API
  const delivery = perfData?.delivery || {};
  const estimation = perfData?.estimation || {};
  const timing = perfData?.timing || {};
  const companyStats = perfData?.companyStats || {};
  const projectsList = perfData?.projectsAllocated?.list || [];
  const recentLogs = perfData?.recentLogs || [];

  const totalAssignedTasks = delivery.tasksAssigned || 0;
  const totalCompletedTasks = delivery.tasksCompleted || 0;
  const completionRate = totalAssignedTasks > 0 ? Math.round((totalCompletedTasks / totalAssignedTasks) * 100) : 0;
  const periodLoggedHours = Number(estimation.loggedHours || 0);
  const lifetimeHours = Number(companyStats.totalLifetimeHours || periodLoggedHours || 0);
  const lifetimeLogsCount = Number(companyStats.totalLifetimeLogs || recentLogs.length || 0);

  // Tenure formatting
  const joiningDateRaw = user.joiningDate || perfData?.user?.joiningDate || perfData?.user?.createdAt || user.createdAt;
  const formatTenure = (dateStr) => {
    if (!dateStr) return 'Joined recently';
    const start = new Date(dateStr);
    if (isNaN(start.getTime())) return 'Active member';
    const now = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (months < 1) return 'Joined this month';
    if (months === 1) return '1 month with company';
    if (months < 12) return `${months} months with company`;
    const yrs = Math.floor(months / 12);
    const remMonths = months % 12;
    return remMonths > 0 ? `${yrs} yr ${remMonths} mo with company` : `${yrs} yr with company`;
  };

  // Rating and approval progress status
  const currentScore = evaluationItem?.ratings?.finalScore || evaluationItem?.ratings?.managerRating || 0;
  const roundedCurrentScore = Math.round(currentScore);
  const isEvaluatedByManager = Boolean(evaluationItem?.ratings?.managerRating);
  const isEvaluatedByHr = Boolean(evaluationItem?.ratings?.hrRating);
  const isEvaluatedByAdmin = Boolean(evaluationItem?.ratings?.adminRating);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-blue-600 cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Back to Team Evaluations</span>
          </button>
          <div className="hidden h-5 w-px bg-slate-200 sm:block" />
          <nav className="hidden items-center gap-1.5 text-xs font-semibold text-slate-400 sm:flex">
            <span>Evaluations</span>
            <ChevronRight size={13} />
            <span className="text-slate-800">{user.name || 'Employee'}</span>
            <ChevronRight size={13} />
            <span className="text-blue-600 font-bold">Projects & Work Hours Dashboard</span>
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={scrollToFeedback}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 cursor-pointer"
          >
            <Star size={14} className="fill-white" />
            <span>Give Feedback & Rating</span>
          </button>
        </div>
      </div>

      {/* User Hero Profile Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-lg">
        {/* Subtle background glow */}
        <div className="absolute -top-12 -right-12 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-4">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white/10 shadow-md"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-black text-white shadow-md ring-4 ring-white/10">
                {user.name?.slice(0, 2).toUpperCase() || 'EM'}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white md:text-2xl">{user.name}</h1>
                {user.isManager && (
                  <span className="rounded-lg bg-purple-500/20 border border-purple-400/40 px-2 py-0.5 text-xs font-bold text-purple-200">
                    Manager
                  </span>
                )}
                {user.employeeCode && (
                  <span className="rounded-lg bg-white/10 border border-white/15 px-2 py-0.5 text-[11px] font-mono text-slate-300">
                    #{user.employeeCode}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Briefcase size={13} className="text-blue-400" />
                  {user.designation || 'Specialist'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Building size={13} className="text-indigo-400" />
                  {user.department || 'General'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Mail size={13} className="text-slate-400" />
                  {user.email}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                {reportingManager && (
                  <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-slate-300">
                    <UserCheck size={12} className="text-emerald-400" />
                    Reports to: <strong className="text-white">{reportingManager.name}</strong>
                  </span>
                )}
                <span className="flex items-center gap-1 text-slate-300">
                  <Calendar size={12} className="text-amber-400" />
                  {formatTenure(joiningDateRaw)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Rating Badge on Hero */}
          <div className="flex flex-col items-start md:items-end justify-center rounded-2xl bg-white/10 p-4 backdrop-blur-md border border-white/10 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Current Appraisal Score</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-black text-amber-400">
                {currentScore > 0 ? `★ ${currentScore.toFixed(1)}` : '★ Not Rated'}
              </span>
              <span className="text-xs font-semibold text-slate-300">/ 5.0</span>
            </div>
            <span className="mt-0.5 text-[11px] font-semibold text-slate-300">
              {currentScore > 0 ? getRatingLabel(currentScore) : 'Awaiting review submission'}
            </span>
          </div>
        </div>
      </div>

      {/* Range Filter Controls & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-blue-600 ml-1" />
          <span className="text-xs font-bold text-slate-800">Timesheet & Project Range:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Time (Total to Company)' },
            { id: '90d', label: 'Last 90 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: '7d', label: 'Last 7 Days' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRange(tab.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                range === tab.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => fetchPerformance(range)}
            disabled={refreshing}
            className="flex items-center gap-1 rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh dashboard data"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-blue-600' : ''} />
          </button>
        </div>
      </div>

      {/* Top 4 Key Metric Executive Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Total Time Given to Company */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Time to Company
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">{lifetimeHours.toFixed(1)}</span>
                <span className="text-xs font-bold text-slate-500">hours</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {lifetimeLogsCount} worklogs recorded • {periodLoggedHours.toFixed(1)}h in range
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Clock size={24} />
            </div>
          </div>

          {/* 2. Assigned Projects */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Assigned Projects
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">{projectsList.length}</span>
                <span className="text-xs font-bold text-slate-500">allocated</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {projectsList.filter((p) => String(p.status).toLowerCase().includes('active') || p.status === 'Active').length} active projects
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
              <FolderGit2 size={24} />
            </div>
          </div>

          {/* 3. Task Delivery & Throughput */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Task Delivery
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">{totalCompletedTasks}</span>
                <span className="text-xs font-bold text-slate-500">/ {totalAssignedTasks} tasks</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {completionRate}% completion rate • {timing.onTimeCompletionRate !== null ? `${timing.onTimeCompletionRate}% on-time` : 'Normal velocity'}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
          </div>

          {/* 4. PMS Stage Progress */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Approval Workflow
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-slate-900">
                  {isEvaluatedByAdmin ? 'Admin Approved' : isEvaluatedByHr ? 'HR Calibrated' : isEvaluatedByManager ? 'Manager Reviewed' : 'Pending Manager'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <span className={isEvaluatedByManager ? 'text-emerald-600' : 'text-slate-400'}>Mngr {isEvaluatedByManager ? '✓' : '—'}</span>
                <span className="text-slate-300">→</span>
                <span className={isEvaluatedByHr ? 'text-emerald-600' : 'text-slate-400'}>HR {isEvaluatedByHr ? '✓' : '—'}</span>
                <span className="text-slate-300">→</span>
                <span className={isEvaluatedByAdmin ? 'text-emerald-600' : 'text-slate-400'}>Admin {isEvaluatedByAdmin ? '✓' : '—'}</span>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Award size={24} />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: Projects on Which User is Assigned & Hours Spent */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <div className="flex items-center gap-2">
              <FolderGit2 size={18} className="text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">
                Assigned Projects & Hours Breakdown
              </h3>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                {projectsList.length} Total Projects
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Detailed list of projects assigned to {user.name}, hours spent per project, and task completion.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
            <p className="mt-3 text-xs text-slate-400">Loading assigned projects and hours...</p>
          </div>
        ) : projectsList.length === 0 ? (
          <div className="p-12 text-center">
            <FolderGit2 size={40} className="mx-auto text-slate-300" />
            <h4 className="mt-3 text-sm font-bold text-slate-700">No Projects Allocated</h4>
            <p className="mt-1 text-xs text-slate-400">
              This employee is not currently assigned to any active or historical projects in the selected range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">Project Name & Client</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Hours Spent</th>
                  <th className="py-3 px-4">Time Share (% of Total)</th>
                  <th className="py-3 px-5 text-right">Tasks (Done / Assigned)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {projectsList.map((proj) => {
                  const hours = Number(proj.loggedHours || 0);
                  const totalHrs = periodLoggedHours > 0 ? periodLoggedHours : (lifetimeHours > 0 ? lifetimeHours : 1);
                  const percentShare = Math.min(100, Math.round((hours / totalHrs) * 100));
                  const statusKey = String(proj.status || 'Active').toLowerCase();
                  const badgeClass = STATUS_BADGES[statusKey] || 'bg-slate-100 text-slate-700 border-slate-200';

                  return (
                    <tr key={proj._id} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900">{proj.name}</div>
                        <div className="text-[11px] text-slate-400">Client: {proj.clientName || 'Internal Company'}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block rounded-lg border px-2 py-0.5 text-[10px] font-bold capitalize ${badgeClass}`}>
                          {proj.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-semibold">
                        {proj.role || 'Team Member'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-mono text-sm font-black text-slate-900">{hours.toFixed(1)}</span>
                        <span className="text-[11px] font-semibold text-slate-400 ml-1">hrs</span>
                        {proj.estimatedHours > 0 && (
                          <div className="text-[10px] text-slate-400">Est: {proj.estimatedHours.toFixed(1)}h</div>
                        )}
                      </td>
                      <td className="py-4 px-4 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-linear-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                              style={{ width: `${percentShare}%` }}
                            />
                          </div>
                          <span className="w-10 text-right font-mono text-[11px] font-bold text-slate-600">
                            {percentShare}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <span className="font-bold text-slate-800">
                          {proj.tasksCompleted || 0} / {proj.tasksAssigned || 0}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1">tasks</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: Recent Timesheet Logs & Work Activity */}
      {recentLogs.length > 0 && (() => {
        const totalLogs = recentLogs.length;
        const numPerPage = logsPerPage === 'all' ? totalLogs : Number(logsPerPage);
        const totalPages = Math.ceil(totalLogs / (numPerPage || 1)) || 1;
        const currentLogsPage = Math.min(logsPage, totalPages);
        const startIndex = (currentLogsPage - 1) * numPerPage;
        const displayedLogs = logsPerPage === 'all' ? recentLogs : recentLogs.slice(startIndex, startIndex + numPerPage);

        return (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Recent Timesheets & Work Logs</h3>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
                  {totalLogs} Entries
                </span>
              </div>

              {/* Show Entries Dropdown */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-500">Show:</span>
                <select
                  value={logsPerPage}
                  onChange={(e) => {
                    const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                    setLogsPerPage(val);
                    setLogsPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-white py-1 px-3 text-xs font-bold text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-hidden cursor-pointer"
                >
                  <option value={5}>5 entries</option>
                  <option value={10}>10 entries</option>
                  <option value={20}>20 entries</option>
                  <option value="all">All entries</option>
                </select>
              </div>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {displayedLogs.map((log) => (
                <div key={log._id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-xs truncate">{log.taskTitle}</span>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600 border border-slate-200">
                        {log.projectName}
                      </span>
                    </div>
                    {log.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                        "{log.description}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-xs">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Calendar size={12} />
                      <span>{new Date(log.date).toLocaleDateString()}</span>
                    </div>
                    <div className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 font-mono font-bold text-blue-700">
                      {Number(log.hours).toFixed(1)} hrs
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination footer if total entries exceed current page size */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-3 text-xs">
                <span className="text-slate-500 font-medium">
                  Showing <strong className="text-slate-800">{startIndex + 1}</strong> to{' '}
                  <strong className="text-slate-800">{Math.min(startIndex + numPerPage, totalLogs)}</strong> of{' '}
                  <strong className="text-slate-800">{totalLogs}</strong> entries
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentLogsPage <= 1}
                    onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-bold text-slate-700">
                    Page {currentLogsPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentLogsPage >= totalPages}
                    onClick={() => setLogsPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* SECTION 3: Give Feedback and Rating Form */}
      <div id="feedback-form-section" className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xs">
              <Star size={20} className="fill-white" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Give Performance Feedback & Rating
              </h3>
              <p className="text-xs text-slate-500">
                Submit evaluation score and qualitative guidance for <strong className="text-slate-800">{user.name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Current Saved Rating:</span>
            <span className={`rounded-xl border px-3 py-1 text-xs font-black ${RATING_COLORS[roundedCurrentScore] || 'text-slate-600 bg-slate-100 border-slate-200'}`}>
              ★ {currentScore > 0 ? currentScore.toFixed(1) : 'Not rated'} / 5.0
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmitFeedback} className="mt-5 space-y-5">
          {/* Admin / Stage Selector */}
          {isAdmin && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <label className="block text-xs font-bold text-blue-900">Evaluation Role / Stage</label>
              <select
                value={reviewForm.level}
                onChange={(e) => setReviewForm({ ...reviewForm, level: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-2xs"
              >
                <option value="admin">Admin Sign-off (Publish Final Rating)</option>
                <option value="hr">HR Calibration & Review Stage</option>
                <option value="manager">Reporting Manager Evaluation Stage</option>
              </select>
            </div>
          )}

          {/* Interactive Star Rating Selector */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Overall Performance Rating (1.0 to 5.0) *
                </label>
                <p className="text-[11px] text-slate-400">
                  Select stars or enter exact score
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400">Score:</span>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={reviewForm.rating}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setReviewForm({ ...reviewForm, rating: '' });
                      return;
                    }
                    const num = parseFloat(val);
                    setReviewForm({ ...reviewForm, rating: isNaN(num) ? val : num });
                  }}
                  onBlur={() => {
                    let num = parseFloat(reviewForm.rating);
                    if (isNaN(num) || num < 1) num = 1;
                    if (num > 5) num = 5;
                    setReviewForm({ ...reviewForm, rating: Math.round(num * 10) / 10 });
                  }}
                  className="w-18 rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-center text-sm font-black text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="4.0"
                />
                <span className="text-xs font-bold text-slate-500">/ 5.0</span>
              </div>
            </div>

            {/* Stars row */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const cur = Number(reviewForm.rating) || 0;
                  const fillPercent = Math.max(0, Math.min(100, Math.round((cur - (star - 1)) * 100)));
                  return (
                    <button
                      type="button"
                      key={star}
                      onClick={() => {
                        if (Number(reviewForm.rating) === star) {
                          setReviewForm({ ...reviewForm, rating: star - 0.5 });
                        } else {
                          setReviewForm({ ...reviewForm, rating: star });
                        }
                      }}
                      title={`Click for ${star} (click again for ${star - 0.5})`}
                      className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white hover:border-amber-300 transition shadow-2xs cursor-pointer"
                    >
                      <Star size={22} className="text-slate-200" />
                      {fillPercent > 0 && (
                        <div
                          className="absolute inset-0 flex items-center justify-center overflow-hidden"
                          style={{ clipPath: `inset(0 ${100 - fillPercent}% 0 0)` }}
                        >
                          <Star size={22} className="fill-amber-400 text-amber-500" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <span className="rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-800 shadow-2xs">
                {Number(reviewForm.rating || 0).toFixed(1)} / 5 — {getRatingLabel(reviewForm.rating)}
              </span>
            </div>

            {/* Quick Decimal Presets */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Select:</span>
              {[3.0, 3.5, 4.0, 4.2, 4.5, 4.8, 5.0].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setReviewForm({ ...reviewForm, rating: val })}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition border cursor-pointer ${
                    Number(reviewForm.rating) === val
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {val.toFixed(1)}
                </button>
              ))}
            </div>
          </div>

          {/* KRAs Breakdown (if available) */}
          {evaluationItem?.kras && evaluationItem.kras.length > 0 && (
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Individual KRA Ratings
                  </label>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {evaluationItem.kras.length} KRAs
                  </span>
                </div>
                <button
                  type="button"
                  onClick={calculateOverallFromKras}
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                >
                  <Sparkles size={12} />
                  <span>Auto-calculate Overall</span>
                </button>
              </div>

              <div className="space-y-2">
                {reviewForm.kraRatings.map((k, idx) => (
                  <div
                    key={k.kraId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5 text-xs border border-slate-100"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-slate-800">{k.name}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">({k.weightage}%)</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            type="button"
                            key={score}
                            onClick={() => {
                              const updated = [...reviewForm.kraRatings];
                              updated[idx].score = score;
                              setReviewForm({ ...reviewForm, kraRatings: updated });
                            }}
                            className={`h-6 w-6 rounded-md text-[10px] font-bold transition cursor-pointer ${
                              Number(k.score) === score
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200">
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="5"
                          value={k.score}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = [...reviewForm.kraRatings];
                            if (val === '') {
                              updated[idx].score = '';
                            } else {
                              const num = parseFloat(val);
                              updated[idx].score = isNaN(num) ? val : num;
                            }
                            setReviewForm({ ...reviewForm, kraRatings: updated });
                          }}
                          onBlur={() => {
                            const updated = [...reviewForm.kraRatings];
                            let num = parseFloat(updated[idx].score);
                            if (isNaN(num) || num < 1) num = 1;
                            if (num > 5) num = 5;
                            updated[idx].score = Math.round(num * 10) / 10;
                            setReviewForm({ ...reviewForm, kraRatings: updated });
                          }}
                          className="h-6 w-12 rounded-md border border-slate-300 bg-white px-1 text-center text-[11px] font-bold text-slate-800 shadow-2xs"
                        />
                        <span className="text-[10px] font-semibold text-slate-400">/ 5</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Qualitative Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Key Strengths & Achievements
              </label>
              <textarea
                rows={3}
                value={reviewForm.strengths}
                onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })}
                placeholder="High-impact contributions, project execution, code quality, leadership..."
                className="mt-1.5 w-full rounded-2xl border border-slate-200 p-3 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">
                Areas for Improvement & Development
              </label>
              <textarea
                rows={3}
                value={reviewForm.improvements}
                onChange={(e) => setReviewForm({ ...reviewForm, improvements: e.target.value })}
                placeholder="Areas to develop, skills to acquire, communication or efficiency goals..."
                className="mt-1.5 w-full rounded-2xl border border-slate-200 p-3 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Overall Feedback Comment */}
          <div>
            <label className="block text-xs font-bold text-slate-700">
              Overall Performance Feedback & Evaluation Summary *
            </label>
            <textarea
              required
              rows={4}
              value={reviewForm.feedback}
              onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })}
              placeholder="Provide constructive, comprehensive feedback regarding project deliverables, timeliness, and company values..."
              className="mt-1.5 w-full rounded-2xl border border-slate-200 p-3 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReview}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
            >
              <Send size={14} />
              <span>{submittingReview ? 'Submitting Evaluation...' : 'Save & Submit Rating & Feedback'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
