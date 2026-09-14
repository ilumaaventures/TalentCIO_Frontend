import React, { useState, useEffect } from 'react';
import api from '@/lib/apiClient';
import {
  TrendingUp,
  Target,
  Award,
  DollarSign,
  Phone,
  Mail,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

const SalesPerformanceTab = ({ userId, userName }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchPerformance = async (yearToFetch) => {
    setLoading(true);
    try {
      const res = await api.get(`/crm/forecast/performance/${userId}?year=${yearToFetch}`);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch sales performance:', err);
      // Silently fail if CRM module not enabled or no data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchPerformance(selectedYear);
    }
  }, [userId, selectedYear]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  const overview = data?.overview || {
    totalTargetValue: 0,
    closedRevenue: 0,
    quotaAttainmentPercent: 0,
    openPipelineValue: 0,
    weightedPipelineValue: 0,
    totalDealsCount: 0,
    wonDealsCount: 0,
    lostDealsCount: 0,
    openDealsCount: 0,
    winRatePercent: 0,
  };

  const activityIndex = data?.activityIndex || {
    totalActivities: 0,
    calls: 0,
    meetings: 0,
    emails: 0,
    notes: 0,
  };

  const commissions = data?.commissions || {
    approvedTotal: 0,
    pendingTotal: 0,
    recordsCount: 0,
  };

  const hasAnySalesData = overview.totalDealsCount > 0 || overview.totalTargetValue > 0 || activityIndex.totalActivities > 0;

  return (
    <div className="space-y-6">
      {/* Header bar with Year Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={20} />
            Sales Performance Scorecard
          </h2>
          <p className="text-xs text-slate-500">
            Empirical CRM metrics, target attainment, win velocity, and commission payout status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-slate-400" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!hasAnySalesData ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <BarChart2 size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-700">No Sales Records Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {userName || 'This employee'} currently has no deals, sales quotas, or CRM activities assigned for {selectedYear}. Once assigned in the Sales CRM, empirical metrics will automatically appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Quota Attainment */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Quota Attainment</span>
                  <Target size={16} className="text-blue-500" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {overview.quotaAttainmentPercent}%
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {formatCurrency(overview.closedRevenue)} of {formatCurrency(overview.totalTargetValue)}
                </div>
              </div>
              <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    overview.quotaAttainmentPercent >= 100
                      ? 'bg-emerald-500'
                      : overview.quotaAttainmentPercent >= 70
                      ? 'bg-blue-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(overview.quotaAttainmentPercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Win Rate */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Win Rate</span>
                  <Award size={16} className="text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {overview.winRatePercent}%
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {overview.wonDealsCount} won · {overview.lostDealsCount} lost
                </div>
              </div>
              <div className="mt-3 text-[11px] text-slate-400">
                Total decided: {overview.wonDealsCount + overview.lostDealsCount} deals
              </div>
            </div>

            {/* Pipeline in Flight */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Open Pipeline</span>
                  <BarChart2 size={16} className="text-indigo-500" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {formatCurrency(overview.openPipelineValue)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Weighted: {formatCurrency(overview.weightedPipelineValue)}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-slate-400">
                {overview.openDealsCount} deals active in pipeline
              </div>
            </div>

            {/* Earned Commissions */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Commissions</span>
                  <DollarSign size={16} className="text-teal-500" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {formatCurrency(commissions.approvedTotal)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Pending: {formatCurrency(commissions.pendingTotal)}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 size={12} /> Synced with Payroll
              </div>
            </div>
          </div>

          {/* Activity Index & Recent Deals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Activity Index */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Clock size={16} className="text-blue-500" />
                CRM Activity Engagement Index
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-3 bg-slate-50 rounded-lg text-center border border-slate-100">
                  <Phone size={16} className="mx-auto text-blue-500 mb-1" />
                  <div className="text-lg font-black text-slate-800">{activityIndex.calls}</div>
                  <div className="text-[11px] text-slate-500">Calls Logged</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center border border-slate-100">
                  <Users size={16} className="mx-auto text-indigo-500 mb-1" />
                  <div className="text-lg font-black text-slate-800">{activityIndex.meetings}</div>
                  <div className="text-[11px] text-slate-500">Meetings</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center border border-slate-100">
                  <Mail size={16} className="mx-auto text-purple-500 mb-1" />
                  <div className="text-lg font-black text-slate-800">{activityIndex.emails}</div>
                  <div className="text-[11px] text-slate-500">Emails Sent</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center border border-slate-100">
                  <FileText size={16} className="mx-auto text-amber-500 mb-1" />
                  <div className="text-lg font-black text-slate-800">{activityIndex.notes}</div>
                  <div className="text-[11px] text-slate-500">Notes & Logs</div>
                </div>
              </div>
              <div className="text-xs text-slate-500 bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                <span className="font-semibold text-blue-800">Total Touchpoints:</span> {activityIndex.totalActivities} customer interactions logged. High activity correlation directly feeds quarterly performance appraisals.
              </div>
            </div>

            {/* Recent Won Deals */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Award size={16} className="text-emerald-500" />
                Recent Closed Deals
              </h3>
              {data?.recentDeals && data.recentDeals.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {data.recentDeals.map((deal) => (
                    <div key={deal.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800">{deal.title}</div>
                        <div className="text-[11px] text-slate-400">
                          {deal.closeDate ? new Date(deal.closeDate).toLocaleDateString() : 'Closed'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-600">
                          {formatCurrency(deal.value)}
                        </span>
                        <span className="block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-center mt-0.5">
                          Won
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-8 text-center">
                  No won deals recorded in this period yet.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SalesPerformanceTab;
