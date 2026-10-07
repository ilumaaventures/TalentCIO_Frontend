import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  MessageSquare,
  Mail,
  TrendingUp,
  Award,
  Trophy,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Users,
  Target,
  CalendarCheck,
} from 'lucide-react';
import { dataService } from '../../services/api';

export const RepPerformanceCockpit = ({
  canViewAll: canViewAllProp,
  onOpenLeaderboard,
  onSelectRep,
  onOpenUserHistory,
  onOpenMetricHistory,
  onToggleConvertedFilter,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [dateRange, setDateRange] = useState('today');
  const [performanceData, setPerformanceData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPerformance = async () => {
    setIsLoading(true);
    try {
      const res = await dataService.getRepPerformance({ dateRange });
      if (res?.success) {
        setPerformanceData(res.data);
      }
    } catch (err) {
      console.error('Failed to load performance metrics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [dateRange]);

  const canViewAll = canViewAllProp ?? performanceData?.canViewAll ?? false;
  const summary = performanceData?.summary || {};
  const leaderboard = performanceData?.leaderboard || [];
  const topPerformer = leaderboard[0];

  const handleMetricClick = (metricKey) => {
    const targetRep = canViewAll
      ? { userName: 'All Team Telemetry', isAll: true }
      : (topPerformer || { userName: 'My History' });

    if (metricKey === 'followup') {
      if (onOpenLeaderboard) {
        onOpenLeaderboard('followups');
      } else if (onOpenMetricHistory) {
        onOpenMetricHistory({ channelType: 'task', outcome: 'all', dateRange, rep: targetRep });
      } else if (onOpenUserHistory) {
        onOpenUserHistory(targetRep, false, { channelType: 'task', outcome: 'all', dateRange });
      }
    } else if (metricKey === 'calls') {
      if (onOpenMetricHistory) {
        onOpenMetricHistory({ channelType: 'call', outcome: 'all', dateRange, rep: targetRep });
      } else if (onOpenUserHistory) {
        onOpenUserHistory(targetRep, false, { channelType: 'call', outcome: 'all', dateRange });
      }
    } else if (metricKey === 'connection_rate') {
      if (onOpenMetricHistory) {
        onOpenMetricHistory({ channelType: 'call', outcome: 'connected', dateRange, rep: targetRep });
      } else if (onOpenUserHistory) {
        onOpenUserHistory(targetRep, false, { channelType: 'call', outcome: 'connected', dateRange });
      }
    } else if (metricKey === 'positive') {
      if (onOpenMetricHistory) {
        onOpenMetricHistory({ channelType: 'all', outcome: 'positive', dateRange, rep: targetRep });
      } else if (onOpenUserHistory) {
        onOpenUserHistory(targetRep, false, { channelType: 'all', outcome: 'positive', dateRange });
      }
    } else if (metricKey === 'whatsapp_email') {
      if (onOpenMetricHistory) {
        onOpenMetricHistory({ channelType: 'whatsapp', outcome: 'all', dateRange, rep: targetRep });
      } else if (onOpenUserHistory) {
        onOpenUserHistory(targetRep, false, { channelType: 'whatsapp', outcome: 'all', dateRange });
      }
    } else if (metricKey === 'converted') {
      if (onToggleConvertedFilter) {
        onToggleConvertedFilter();
      } else if (onOpenMetricHistory) {
        onOpenMetricHistory({ channelType: 'all', outcome: 'all', dateRange, rep: targetRep });
      } else if (onOpenUserHistory) {
        onOpenUserHistory(targetRep, false, { channelType: 'all', outcome: 'all', dateRange });
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden mb-5 transition-all">
      {/* Top Banner Bar */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Sales Outreach & Performance Cockpit</h3>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {canViewAll
                ? 'Real-time telemetry for client calls, WhatsApps, follow-ups, and rep conversion metrics across all prospects.'
                : 'Your personal outreach telemetry for client calls, WhatsApps, follow-ups, and conversion metrics.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Date range picker */}
          <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800/80 p-0.5 shadow-2xs text-xs">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'Month' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDateRange(d.id)}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${dateRange === d.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchPerformance}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {canViewAll && (
            <button
              type="button"
              onClick={() => onOpenLeaderboard && onOpenLeaderboard('leaderboard')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Leaderboard</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition"
            title={isExpanded ? 'Collapse Cockpit' : 'Expand Cockpit'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Metrics Content */}
      {isExpanded && (
        <div className="p-4 bg-slate-50/60 border-t border-slate-200/90 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Metric 1: Total Calls */}
            <div
              onClick={() => handleMetricClick('calls')}
              role="button"
              tabIndex={0}
              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-indigo-400 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer group select-none relative"
              title="Click to view detailed Call logs and recordings in Telemetry Ledger"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span className="group-hover:text-indigo-600 font-semibold transition-colors">Calls Made</span>
                <PhoneCall className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {summary.totalCalls || 0}
              </p>
              <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100/80">
                <p className="text-[11px] text-slate-400 truncate">
                  {canViewAll ? 'Logged across all prospects' : 'Logged by your account'}
                </p>
                <span className="text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                  View Logs →
                </span>
              </div>
            </div>

            {/* Metric 2: WhatsApp & Email Outreach */}
            <div
              onClick={() => handleMetricClick('whatsapp_email')}
              role="button"
              tabIndex={0}
              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-blue-400 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer group select-none relative"
              title="Click to view WhatsApp and Email outreach history"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span className="group-hover:text-blue-600 font-semibold transition-colors">WhatsApp / Email</span>
                <div className="flex items-center gap-1 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                </div>
              </div>
              <p className="text-xl font-extrabold text-blue-700 mt-1">
                {(summary.totalWhatsApps || 0) + (summary.totalEmails || 0)}
              </p>
              <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100/80">
                <p className="text-[11px] text-slate-400 truncate">
                  {summary.totalWhatsApps || 0} WA • {summary.totalEmails || 0} Emails
                </p>
                <span className="text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                  View Logs →
                </span>
              </div>
            </div>

            {/* Metric 3: Positive Outcomes */}
            <div
              onClick={() => handleMetricClick('positive')}
              role="button"
              tabIndex={0}
              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-amber-400 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer group select-none relative"
              title="Click to view all Interested clients and Scheduled Meetings"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span className="group-hover:text-amber-600 font-semibold transition-colors">Positive Outcomes</span>
                <Target className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-xl font-extrabold text-amber-700 mt-1">
                {summary.positiveOutcomes || 0}
              </p>
              <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100/80">
                <p className="text-[11px] text-slate-400 truncate">
                  Interested or demo requested
                </p>
                <span className="text-[10px] font-bold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                  View Logs →
                </span>
              </div>
            </div>

            {/* Metric 4: Follow-ups */}
            <div
              onClick={() => handleMetricClick('followup')}
              role="button"
              tabIndex={0}
              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-orange-400 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer group select-none relative"
              title="Click to view scheduled follow-ups in detail"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span className="group-hover:text-orange-600 font-semibold transition-colors">Follow-ups</span>
                <CalendarCheck className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-xl font-extrabold text-orange-700 mt-1">
                {summary.totalFollowUps || 0}
              </p>
              <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100/80">
                <p className="text-[11px] text-slate-400 truncate">
                  {canViewAll ? 'Scheduled across team' : 'Your scheduled follow-ups'}
                </p>
                <span className="text-[10px] font-bold text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                  View Details →
                </span>
              </div>
            </div>

            {/* Metric 5: Converted to Active Leads */}
            <div
              onClick={() => handleMetricClick('converted')}
              role="button"
              tabIndex={0}
              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-purple-400 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer group select-none relative"
              title="Click to filter table and view all Converted Leads"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span className="group-hover:text-purple-600 font-semibold transition-colors">Converted to Leads</span>
              </div>
              <p className="text-xl font-extrabold text-purple-700 mt-1">
                {summary.convertedRows || 0}
              </p>
              <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100/80">
                <p className="text-[11px] text-slate-400 truncate">
                  {canViewAll ? 'Graduated to active pipeline' : 'Your graduated prospects'}
                </p>
                <span className="text-[10px] font-bold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                  Filter Table →
                </span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
