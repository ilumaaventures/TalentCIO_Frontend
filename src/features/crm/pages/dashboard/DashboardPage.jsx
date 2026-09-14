import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  TrendingUp,
  DollarSign,
  Award,
  Clock,
  Activity as ActivityIcon,
  CheckCircle2,
  Calendar,
  PhoneCall,
  ArrowUpRight,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { analyticsService } from '../../services/api';

export const DashboardPage = ({ onNavigate }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await analyticsService.getDashboard({ range: timeRange });
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [timeRange]);

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Top Filter & Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Sales Cockpit
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time pipeline health, team performance, and quota forecasting.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs shadow-2xs">
            {['today', 'week', 'month', 'quarter', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-md font-semibold capitalize transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button
            onClick={fetchDashboard}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads"
          value={kpis.totalLeads ?? 0}
          changePercent={0}
          trend="neutral"
          icon={Users}
          iconColor="text-blue-600 bg-blue-50"
          description="Registered Prospects"
          onClick={() => onNavigate('leads')}
        />
        <StatCard
          title="Open Opportunities"
          value={kpis.openDealsCount ?? 0}
          changePercent={0}
          trend="neutral"
          icon={Briefcase}
          iconColor="text-purple-600 bg-purple-50"
          description="In active pipeline"
          onClick={() => onNavigate('deals')}
        />
        <StatCard
          title="Pipeline Value"
          value={`₹${(((kpis.pipelineValue || 0)) / 100000).toFixed(2)} L`}
          changePercent={0}
          trend="neutral"
          icon={TrendingUp}
          iconColor="text-emerald-600 bg-emerald-50"
          description={`Weighted: ₹${(((kpis.weightedPipelineValue || 0)) / 100000).toFixed(2)} L`}
          onClick={() => onNavigate('deals')}
        />
        <StatCard
          title="Won Revenue"
          value={`₹${(((kpis.wonRevenue || 0)) / 100000).toFixed(2)} L`}
          changePercent={0}
          trend="neutral"
          icon={Award}
          iconColor="text-amber-600 bg-amber-50"
          description={`${kpis.winRate || 0}% Win Rate`}
          onClick={() => onNavigate('forecast')}
        />
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Qualified Leads</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{kpis.qualifiedLeads ?? 0}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Lead Conversion</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{kpis.leadConversionRate ?? 0}%</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Quota Achievement</p>
          <p className="text-lg font-bold text-indigo-600 mt-1">{kpis.targetAchievement ?? 0}%</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Revenue Forecast</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">₹{(((kpis.forecastValue || 0)) / 100000).toFixed(2)} L</p>
        </div>
      </div>

      {/* Main Analytics Grid: Funnel & Source Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Conversion Funnel */}
        <Card padding="lg" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sales Conversion Funnel</h3>
              <p className="text-xs text-slate-500 mt-0.5">Stage velocity from lead capture to closed won</p>
            </div>
            <Badge variant="indigo" size="sm">End-to-End</Badge>
          </div>

          <div className="space-y-3">
            {!data?.funnel || data.funnel.every((f) => f.count === 0) ? (
              <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs font-semibold text-slate-600">Funnel is currently empty</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Add leads and opportunities to track sales cycle velocity.</p>
              </div>
            ) : (
              data.funnel.map((step, idx) => {
                return (
                  <div key={idx} className="relative">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700">{step.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 font-bold">{step.count}</span>
                        <span className="text-slate-400 font-normal">({step.conversionRate})</span>
                      </div>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx === 5 ? 'bg-emerald-500' : idx === 4 ? 'bg-cyan-500' : idx === 3 ? 'bg-amber-500' : idx === 2 ? 'bg-purple-500' : idx === 1 ? 'bg-blue-500' : 'bg-slate-400'
                        }`}
                        style={{ width: `${Math.max(step.count > 0 ? 15 : 0, step.count > 0 ? 100 - (idx * 15) : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Lead Source Breakdown */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Lead Sources</h3>
              <p className="text-xs text-slate-500 mt-0.5">Top performing channels</p>
            </div>
            <button
              onClick={() => onNavigate('leads')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-3.5">
            {!data?.sourceDistribution || data.sourceDistribution.length === 0 ? (
              <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400">No lead sources recorded yet.</p>
              </div>
            ) : (
              data.sourceDistribution.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span>{item.source}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{item.count} leads</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Grid: Deals Closing Soon & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals Closing Soon */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Priority Deals Closing Soon</h3>
              <p className="text-xs text-slate-500 mt-0.5">Focus high-impact closing efforts</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onNavigate('deals')}>
              Open Pipeline
            </Button>
          </div>

          <div className="divide-y divide-slate-100">
            {(!data?.dealsClosingSoon || data.dealsClosingSoon.length === 0) ? (
              <p className="text-xs text-slate-400 py-8 text-center">No active deals closing soon.</p>
            ) : (
              data.dealsClosingSoon.map((deal) => (
                <div
                  key={deal._id}
                  onClick={() => onNavigate('deals', deal._id)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50/80 -mx-2 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-bold text-slate-900 truncate">{deal.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {deal.companyId?.name || 'Account'} • Owner: {deal.ownerId?.name || 'Unassigned'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-900">
                      ₹{(deal.value || 0).toLocaleString('en-IN')}
                    </p>
                    <span className="inline-block mt-0.5 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {deal.stage}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Sales Team Leaderboard */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sales Leaderboard</h3>
              <p className="text-xs text-slate-500 mt-0.5">Ranked by revenue won & conversion</p>
            </div>
            <Badge variant="amber" size="sm">Active Quarter</Badge>
          </div>

          <div className="divide-y divide-slate-100">
            {(data?.leaderboard || []).slice(0, 5).map((rep, idx) => (
              <div key={rep.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      (rep.revenueWon || 0) > 0 && idx === 0
                        ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                        : (rep.revenueWon || 0) > 0 && idx === 1
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <img
                    src={rep.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80'}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">{rep.name}</p>
                    <p className="text-[11px] text-slate-500">{rep.team} • {rep.dealsWon} deals won</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">
                    ₹{(rep.revenueWon || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-semibold">{rep.conversionRate}% Win</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Grid: Upcoming Follow-ups & Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Follow-ups */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Today & Upcoming Follow-ups</h3>
              <p className="text-xs text-slate-500 mt-0.5">Never let a sales prospect go cold</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onNavigate('follow-ups')}>
              View All
            </Button>
          </div>

          <div className="space-y-3">
            {(!data?.upcomingFollowUps || data.upcomingFollowUps.length === 0) ? (
              <p className="text-xs text-slate-400 py-8 text-center">No upcoming follow-ups scheduled.</p>
            ) : (
              data.upcomingFollowUps.map((f) => (
                <div
                  key={f._id}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{f.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(f.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Assignee: {f.assignedTo?.name || 'Rep'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={f.priority === 'High' || f.priority === 'Urgent' ? 'rose' : 'blue'} size="sm">
                    {f.priority || 'Medium'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Activity Timeline */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Live Activity Feed</h3>
              <p className="text-xs text-slate-500 mt-0.5">Recent calls, meetings, notes & stage changes</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onNavigate('activities')}>
              Full Timeline
            </Button>
          </div>

          <div className="space-y-3.5">
            {(!data?.recentActivities || data.recentActivities.length === 0) ? (
              <p className="text-xs text-slate-400 py-8 text-center">No recent activities logged.</p>
            ) : (
              data.recentActivities.map((act) => (
                <div key={act._id} className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 mt-0.5">
                    <ActivityIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900">{act.subject}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{act.description}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(act.performedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • By {act.performedByName || 'System'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
