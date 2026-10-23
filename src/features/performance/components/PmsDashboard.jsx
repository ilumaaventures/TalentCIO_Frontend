import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  Users,
  Target,
  BarChart3,
  Calendar,
  AlertCircle,
  ChevronRight,
  ArrowUpRight,
  FileText,
  AlertTriangle,
  Bell,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import toast from 'react-hot-toast';
import pmsApi from '../api/pmsApi';

const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444'];

export default function PmsDashboard({ onNavigateTab }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isTriggeringReminders, setIsTriggeringReminders] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, [selectedCycle, selectedDept, selectedStatus]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCycle && selectedCycle !== 'all') params.cycleId = selectedCycle;
      if (selectedDept && selectedDept !== 'all') params.department = selectedDept;
      if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus;

      const res = await pmsApi.getDashboardMetrics(params);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load PMS dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerReminders = async () => {
    try {
      setIsTriggeringReminders(true);
      const res = await pmsApi.triggerReminders({});
      if (res.data?.success) {
        toast.success(res.data.message || 'Automated reminders dispatched successfully');
        fetchMetrics();
      } else {
        toast.error(res.data?.message || 'Failed to dispatch reminders');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error triggering reminders');
    } finally {
      setIsTriggeringReminders(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const summary = data?.summary || {
    totalEligibleEmployees: 0,
    totalReviews: 0,
    published: 0,
    pendingReviews: 0,
    selfPending: 0,
    managerPending: 0,
    deptHeadPending: 0,
    hrPending: 0,
    finalApprovalPending: 0,
    approved: 0,
    acknowledged: 0,
    disputed: 0,
    completionRate: 0,
    averageRating: 0,
    kpiAchievementRate: 0,
    overdueReviews: 0,
  };

  const ratingData = data?.ratingDistribution || [];
  const deptData = data?.departmentPerformance || [];
  const topPerformers = data?.highPerformers || [];
  const supportRequired = data?.employeesRequiringSupport || [];
  const historicalTrends = data?.historicalTrends || [];
  const userScope = data?.userScope || { scope: 'all', isPrivileged: true };

  // Unique departments for filter
  const deptOptions = Array.from(new Set(deptData.map((d) => d.department).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* ─── Dashboard Scope & Filters Bar ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <BarChart3 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Performance Analytics & Intelligence</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 capitalize">
                Scope: {userScope.scope?.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Live appraisal completion, scoring benchmarks, and workflow bottleneck tracking</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Cycle Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Cycle:</span>
            <select
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="all">All Appraisal Cycles</option>
              {data?.cycles &&
                data.cycles.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.status?.replace(/_/g, ' ')})
                  </option>
                ))}
            </select>
          </div>

          {/* Department Filter */}
          {deptOptions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Dept:</span>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="all">All Departments</option>
                {deptOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Automated Reminders Trigger (Admin/HR Only) */}
          {userScope.isPrivileged && (
            <button
              onClick={handleTriggerReminders}
              disabled={isTriggeringReminders}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-2xs hover:bg-blue-100 transition disabled:opacity-50"
              title="Dispatches automated reminders for pending self-reviews, manager appraisals, and acknowledgments"
            >
              <Bell size={13} className={isTriggeringReminders ? 'animate-bounce' : ''} />
              <span>{isTriggeringReminders ? 'Sending...' : 'Trigger Reminders'}</span>
            </button>
          )}

          <button
            onClick={fetchMetrics}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
            title="Refresh analytics data"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── Top 5 Core Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Metric 1: Cycle Completion Rate */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Completion Rate</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{summary.completionRate}%</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            <span className="font-bold text-emerald-600">{summary.published}</span> of {summary.totalReviews} published
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${summary.completionRate}%` }} />
          </div>
        </div>

        {/* Metric 2: Average Final Score */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Average Score</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Award size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1 text-3xl font-extrabold text-slate-900">
            <span>{summary.averageRating}</span>
            <span className="text-sm font-semibold text-slate-400">/ 5.0</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Evaluated performance average</div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(summary.averageRating / 5) * 100}%` }} />
          </div>
        </div>

        {/* Metric 3: KPI Target Achievement Rate */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">KPI Target Achieved</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Target size={16} />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{summary.kpiAchievementRate}%</div>
          <div className="mt-1 text-[11px] text-slate-500">Across verified employee KPI targets</div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, summary.kpiAchievementRate)}%` }} />
          </div>
        </div>

        {/* Metric 4: Total Reviews In Scope */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Enrolled Reviews</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{summary.totalReviews}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            {summary.pendingReviews} in evaluation queue
          </div>
          <button
            onClick={() => onNavigateTab('reviews')}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            <span>View reviews</span>
            <ChevronRight size={12} />
          </button>
        </div>

        {/* Metric 5: Overdue Reviews Bottleneck Alert */}
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Overdue Reviews</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-rose-900">{summary.overdueReviews}</div>
          <div className="mt-1 text-[11px] text-rose-600">&gt; 14 days in current stage</div>
          <button
            onClick={() => onNavigateTab('reports')}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900"
          >
            <span>Overdue report</span>
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* ─── Stage-by-Stage Workflow Progression Pipeline ───────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Appraisal Workflow Progression Pipeline</h3>
            <p className="text-xs text-slate-500">Real-time distribution of reviews across all lifecycle approval gates</p>
          </div>
          <button onClick={() => onNavigateTab('reviews')} className="text-xs font-bold text-blue-600 hover:underline">
            Manage Queues →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7 pt-1">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Self-Review</span>
            <div className="text-xl font-extrabold text-slate-900 mt-1">{summary.selfPending}</div>
            <span className="text-[10px] text-slate-400">Employee input</span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Manager Review</span>
            <div className="text-xl font-extrabold text-blue-600 mt-1">{summary.managerPending}</div>
            <span className="text-[10px] text-slate-400">Pending ratings</span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dept Head</span>
            <div className="text-xl font-extrabold text-indigo-600 mt-1">{summary.deptHeadPending}</div>
            <span className="text-[10px] text-slate-400">Endorsement</span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">HR / Calibration</span>
            <div className="text-xl font-extrabold text-purple-600 mt-1">{summary.hrPending + summary.calibrationPending}</div>
            <span className="text-[10px] text-slate-400">Moderation</span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Final Approval</span>
            <div className="text-xl font-extrabold text-amber-600 mt-1">{summary.finalApprovalPending}</div>
            <span className="text-[10px] text-slate-400">Sign-off</span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Published</span>
            <div className="text-xl font-extrabold text-emerald-600 mt-1">{summary.published}</div>
            <span className="text-[10px] text-slate-400">Visible in ESS</span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Acknowledged</span>
            <div className="text-xl font-extrabold text-teal-600 mt-1">{summary.acknowledged}</div>
            <span className="text-[10px] text-slate-400">
              {summary.disputed > 0 ? `${summary.disputed} disputed` : 'Completed'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Analytics Charts Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Rating Bands / Distribution (Bell Curve) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Rating Distribution (Bell Curve)</h3>
              <p className="text-xs text-slate-500">Workforce distribution across performance score stars (1.0 to 5.0)</p>
            </div>
            <BarChart3 size={18} className="text-slate-400" />
          </div>

          {ratingData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="rating" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                    formatter={(val) => [val, 'Employees']}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                    {ratingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-xs text-slate-400">
              No finalized ratings recorded yet
            </div>
          )}
        </div>

        {/* Department Average Scores */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Department Score Averages</h3>
              <p className="text-xs text-slate-500">Performance benchmark by team (Out of 5.0)</p>
            </div>
            <TrendingUp size={18} className="text-slate-400" />
          </div>

          {deptData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                    formatter={(val) => [`${val} / 5.0`, 'Average Score']}
                  />
                  <Bar dataKey="averageScore" fill="#6366f1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-xs text-slate-400">
              Department performance data will appear after reviews are scored
            </div>
          )}
        </div>
      </div>

      {/* ─── High Performers vs Support Required (Separation & Scoping) ─────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Performers Spotlight */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top Performers (Score ≥ 4.0)</h3>
              <p className="text-xs text-slate-500">High achievers meeting and exceeding expectations</p>
            </div>
            <Award size={18} className="text-emerald-600" />
          </div>

          {topPerformers.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {topPerformers.map((tp, idx) => (
                <div key={tp._id || idx} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{tp.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {tp.department} • {tp.designation}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700">
                      ★ {tp.score} / 5.0
                    </span>
                    <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{tp.band}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-400">
              No top-tier evaluations completed yet in the selected cycle.
            </div>
          )}
        </div>

        {/* Support & Improvement Opportunities */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Employees Requiring Support (Score &lt; 2.5)</h3>
              <p className="text-xs text-slate-500">Identified for coaching, developmental plans, or PIP</p>
            </div>
            <AlertTriangle size={18} className="text-amber-500" />
          </div>

          {supportRequired.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {supportRequired.map((sup, idx) => (
                <div key={sup._id || idx} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-xs font-bold text-amber-700">
                      !
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{sup.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {sup.department} • {sup.designation}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-extrabold text-amber-700">
                      {sup.score} / 5.0
                    </span>
                    <div className="text-[10px] font-semibold text-amber-700 mt-0.5">{sup.band}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-400">
              No low-performing scores recorded in this scope.
            </div>
          )}
        </div>
      </div>

      {/* ─── Historical Performance Trends (Multi-Cycle Comparison) ─────────── */}
      {historicalTrends.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Multi-Cycle Historical Performance Trends</h3>
              <p className="text-xs text-slate-500">Average score trajectory and completion rates across previous review cycles</p>
            </div>
            <TrendingUp size={18} className="text-blue-600" />
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalTrends} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" domain={[0, 5]} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                />
                <Line yAxisId="left" type="monotone" dataKey="averageScore" stroke="#3b82f6" strokeWidth={2.5} name="Avg Score (out of 5)" />
                <Line yAxisId="right" type="monotone" dataKey="completionRate" stroke="#10b981" strokeWidth={2.5} name="Completion %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
