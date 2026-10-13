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
} from 'recharts';
import pmsApi from '../api/pmsApi';

const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444'];

export default function PmsDashboard({ onNavigateTab }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState('all');

  useEffect(() => {
    fetchMetrics(selectedCycle);
  }, [selectedCycle]);

  const fetchMetrics = async (cycleId = 'all') => {
    try {
      setLoading(true);
      const res = await pmsApi.getDashboardMetrics({ cycleId });
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load PMS dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const summary = data?.summary || {
    totalReviews: 0,
    published: 0,
    selfPending: 0,
    managerPending: 0,
    completionRate: 0,
  };

  const ratingData = data?.ratingDistribution || [];
  const deptData = data?.departmentPerformance || [];
  const topPerformers = data?.topPerformers || [];
  const goalSummary = data?.goalSummary || [];

  return (
    <div className="space-y-6">
      {/* Dashboard Scope & Cycle Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <BarChart3 size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Performance & Appraisal Analytics</h2>
            <p className="text-[11px] text-slate-500">Workspace-wide appraisal progress, ratings distribution, and department health</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Cycle Filter:</label>
          <select
            value={selectedCycle}
            onChange={(e) => setSelectedCycle(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="all">Company Overview (All Cycles)</option>
            {data?.cycles && data.cycles.length > 0 && (
              data.cycles.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.status?.replace(/_/g, ' ')})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Active Cycle Notification Banner */}
      {data?.activeCycle ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Calendar size={20} />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">Active Appraisal Cycle</div>
              <div className="text-base font-bold text-slate-900">{data.activeCycle.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-800">
              Phase: {data.activeCycle.status?.replace(/_/g, ' ')}
            </span>
            <button
              onClick={() => onNavigateTab('reviews')}
              className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <span>Manage Reviews</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-xs font-semibold text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600" />
            <span>No active performance cycle currently scheduled.</span>
          </div>
          <button
            onClick={() => onNavigateTab('cycles')}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition"
          >
            Create Cycle
          </button>
        </div>
      )}

      {/* Top 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Self-Reviews Pending</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{summary.selfPending}</div>
          <div className="mt-1 text-[11px] text-slate-500">Awaiting employee submission</div>
          <button
            onClick={() => onNavigateTab('reviews')}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-800"
          >
            <span>Review queue</span>
            <ChevronRight size={12} />
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Manager Reviews Due</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{summary.managerPending}</div>
          <div className="mt-1 text-[11px] text-slate-500">Awaiting manager appraisal</div>
          <button
            onClick={() => onNavigateTab('reviews')}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
          >
            <span>View appraisals</span>
            <ChevronRight size={12} />
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Participants</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Award size={16} />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{summary.totalReviews}</div>
          <div className="mt-1 text-[11px] text-slate-500">Enrolled in active cycles</div>
          <button
            onClick={() => onNavigateTab('calibration')}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            <span>Calibration desk</span>
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Rating Bands / Distribution */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Rating Distribution (Bell Curve)</h3>
              <p className="text-xs text-slate-500">Employee count across evaluation bands</p>
            </div>
            <BarChart3 size={18} className="text-slate-400" />
          </div>

          {ratingData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="band" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                    formatter={(val, name) => [val, 'Employees']}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
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

      {/* Leaderboard and Goals Summary Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Performers Spotlight */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top Performers Spotlight</h3>
              <p className="text-xs text-slate-500">Consolidated high achievers in current cycle</p>
            </div>
            <Award size={18} className="text-amber-500" />
          </div>

          {topPerformers.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {topPerformers.map((tp, idx) => (
                <div key={tp._id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                      #{idx + 1}
                    </div>
                    <div className="h-9 w-9 overflow-hidden rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                      {tp.employee?.profilePicture ? (
                        <img src={tp.employee.profilePicture} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        tp.employee?.firstName?.charAt(0) || 'U'
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {tp.employee?.firstName} {tp.employee?.lastName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {tp.employee?.department || 'Member'} • {tp.employee?.employeeCode || ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700">
                      ★ {tp.score} / 5.0
                    </span>
                    <div className="mt-0.5 text-[10px] font-semibold text-slate-500">{tp.band}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              No published scores available yet
            </div>
          )}
        </div>

        {/* Goals Progress Status */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Goals & OKRs Pulse</h3>
              <p className="text-xs text-slate-500">Goal progression status</p>
            </div>
            <Target size={18} className="text-blue-500" />
          </div>

          <div className="space-y-3">
            {goalSummary.map((g) => (
              <div key={g.status} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="capitalize text-slate-700">{g.status.replace(/_/g, ' ')}</span>
                  <span className="text-slate-900">{g.count} goals</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Avg progress</span>
                  <span className="font-bold text-blue-600">{g.avgProgress}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${g.avgProgress}%` }} />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigateTab('goals')}
            className="mt-4 w-full rounded-xl border border-slate-200 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Open Goals Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}
