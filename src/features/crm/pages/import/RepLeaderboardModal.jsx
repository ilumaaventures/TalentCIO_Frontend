import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Phone,
  PhoneCall,
  MessageSquare,
  Mail,
  CheckCircle2,
  TrendingUp,
  Award,
  Filter,
  Users,
  Search,
  RefreshCw,
  Calendar,
  CalendarCheck,
  Clock,
  AlertCircle,
  ExternalLink,
  Check,
  Building2,
  UserCheck,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { dataService, followUpsService } from '../../services/api';
import toast from 'react-hot-toast';

export const RepLeaderboardModal = ({
  isOpen,
  onClose,
  initialTab = 'leaderboard',
  onSelectRepFilter,
  onOpenUserHistory,
  onOpenOutreach,
  onOpenProspectDetails,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'leaderboard'); // 'leaderboard' | 'followups'
  const [dateRange, setDateRange] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Follow-up specific filters
  const [followUpStatusFilter, setFollowUpStatusFilter] = useState('all'); // 'all' | 'scheduled' | 'overdue' | 'completed'
  const [followUpRepFilter, setFollowUpRepFilter] = useState('all');
  const [completingId, setCompletingId] = useState(null);

  const fetchPerformance = async () => {
    setIsLoading(true);
    try {
      const params = { dateRange };
      if (dateRange === 'custom') {
        if (customFrom) params.from = customFrom;
        if (customTo) params.to = customTo;
      }
      const res = await dataService.getRepPerformance(params);
      if (res?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load rep performance leaderboard', err);
      toast.error('Failed to fetch performance data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = (id) => {
    setDateRange(id);
    if (id === 'custom' && !customFrom && !customTo) {
      const todayStr = new Date().toISOString().split('T')[0];
      setCustomFrom(todayStr);
      setCustomTo(todayStr);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (dateRange !== 'custom') {
        fetchPerformance();
      } else if (customFrom && customTo) {
        fetchPerformance();
      }
    }
  }, [isOpen, dateRange, customFrom, customTo, initialTab]);

  if (!isOpen) return null;

  const leaderboard = data?.leaderboard || [];
  const summary = data?.summary || {};
  const followUps = data?.followUps || [];

  const filteredLeaderboard = leaderboard.filter((r) =>
    (r.userName || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.email || '').toLowerCase().includes(search.toLowerCase())
  );

  // Filter follow-ups
  const now = new Date();
  const filteredFollowUps = followUps.filter((item) => {
    // Status filter
    const isCompleted = item.status === 'completed';
    const schedDate = new Date(item.scheduledDate);
    const isOverdue = !isCompleted && schedDate < now;
    const isScheduled = !isCompleted && schedDate >= now;

    if (followUpStatusFilter === 'completed' && !isCompleted) return false;
    if (followUpStatusFilter === 'overdue' && !isOverdue) return false;
    if (followUpStatusFilter === 'scheduled' && !isScheduled) return false;

    // Rep filter
    if (followUpRepFilter !== 'all') {
      const repName = item.assignedTo?.name || `${item.assignedTo?.firstName || ''} ${item.assignedTo?.lastName || ''}`.trim() || item.assignedTo?.email;
      const repId = item.assignedTo?._id ? String(item.assignedTo._id) : '';
      if (repName !== followUpRepFilter && repId !== followUpRepFilter) return false;
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const compName = item.importDataId?.companyName || item.leadId?.companyName || item.title || '';
      const contact = item.importDataId?.contactPerson || item.leadId?.firstName || '';
      const phone = item.importDataId?.mobileNo || item.leadId?.phone || '';
      const notes = item.notes || '';
      const rep = item.assignedTo?.firstName || item.assignedTo?.name || '';
      if (
        !compName.toLowerCase().includes(q) &&
        !contact.toLowerCase().includes(q) &&
        !phone.includes(q) &&
        !notes.toLowerCase().includes(q) &&
        !rep.toLowerCase().includes(q)
      ) {
        return false;
      }
    }

    return true;
  });

  const handleCompleteFollowUp = async (flwId) => {
    setCompletingId(flwId);
    try {
      if (followUpsService?.completeFollowUp) {
        await followUpsService.completeFollowUp(flwId, { outcomeNotes: 'Completed from Telemetry Leaderboard' });
      }
      toast.success('Follow-up marked as completed!');
      // Update local state
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          followUps: prev.followUps.map((f) =>
            f._id === flwId ? { ...f, status: 'completed', completedAt: new Date() } : f
          ),
        };
      });
    } catch (err) {
      console.error('Failed to complete follow-up', err);
      toast.error(err?.response?.data?.message || 'Failed to complete follow-up');
    } finally {
      setCompletingId(null);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const isToday = d.toDateString() === now.toDateString();
    const isPast = d < now;

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    return {
      text: isToday ? `Today at ${timeStr}` : `${dateFormatted}, ${timeStr}`,
      isPast,
      isToday,
    };
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sales Team Outreach & Performance Leaderboard"
      subtitle="Track individual rep productivity, calling pace, positive outcomes, follow-ups, and conversions."
      maxWidth="max-w-5xl"
    >
      <div className="space-y-4 pt-1">
        {/* Main Tab Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Rep Leaderboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('followups')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'followups'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Follow-up Details</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeTab === 'followups'
                    ? 'bg-white text-amber-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {followUps.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              icon={RefreshCw}
              onClick={fetchPerformance}
              disabled={isLoading}
              title="Refresh Performance & Follow-ups"
            />
          </div>
        </div>

        {/* Date Filter & Search Controls */}
        <div className="flex flex-col gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200/90 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-slate-600 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Period:
              </span>
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'custom', label: 'Custom Range' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handlePeriodChange(d.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    dateRange === d.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder={activeTab === 'leaderboard' ? 'Search rep...' : 'Search prospect, phone, note...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 sm:w-56"
                />
              </div>
            </div>
          </div>

          {/* Custom Date Pickers Row */}
          {dateRange === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-200/90 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">From:</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500 shadow-2xs font-medium text-slate-700 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">To:</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500 shadow-2xs font-medium text-slate-700 cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={fetchPerformance}
                disabled={isLoading}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                Apply Range
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: LEADERBOARD VIEW */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            {/* Aggregate KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                <p className="text-slate-500 font-medium">Total Calls</p>
                <p className="text-lg font-bold text-indigo-700 mt-0.5">{summary.totalCalls || 0}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Across all reps</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <p className="text-slate-500 font-medium">Connection Rate</p>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">{summary.connectionRate || 0}%</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{summary.connectedCalls || 0} calls reached</p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                <p className="text-slate-500 font-medium">Positive Outcomes</p>
                <p className="text-lg font-bold text-amber-700 mt-0.5">{summary.positiveOutcomes || 0}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Interested & meetings</p>
              </div>

              <div
                onClick={() => setActiveTab('followups')}
                role="button"
                tabIndex={0}
                className="p-3 rounded-xl bg-orange-50/60 border border-orange-200 hover:border-orange-400 cursor-pointer transition shadow-2xs group"
                title="Click to switch to Follow-up Details tab"
              >
                <div className="flex items-center justify-between">
                  <p className="text-slate-600 font-medium group-hover:text-orange-700 transition">Follow-ups</p>
                  <CalendarCheck className="w-3.5 h-3.5 text-orange-600 group-hover:scale-110 transition" />
                </div>
                <p className="text-lg font-bold text-orange-700 mt-0.5">{summary.totalFollowUps || followUps.length || 0}</p>
                <p className="text-[10px] text-orange-600/80 mt-0.5 font-semibold">View Follow-ups →</p>
              </div>

              <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100">
                <p className="text-slate-500 font-medium">Leads Converted</p>
                <p className="text-lg font-bold text-purple-700 mt-0.5">{summary.convertedRows || 0}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Active pipeline</p>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 text-center w-12">Rank</th>
                    <th className="p-2.5">Sales Representative</th>
                    <th className="p-2.5 text-center">Calls</th>
                    <th className="p-2.5 text-center">Connected</th>
                    <th className="p-2.5 text-center">Interested</th>
                    <th className="p-2.5 text-center">WhatsApp / Email</th>
                    <th className="p-2.5 text-center">Follow-ups</th>
                    <th className="p-2.5 text-center">Converted</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
                        Calculating rep performance...
                      </td>
                    </tr>
                  ) : filteredLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        No outreach activities logged for this period yet.
                      </td>
                    </tr>
                  ) : (
                    filteredLeaderboard.map((rep, idx) => {
                      const rankBadge =
                        idx === 0
                          ? 'bg-amber-100 text-amber-800 border-amber-300 font-extrabold'
                          : idx === 1
                          ? 'bg-slate-200 text-slate-700 border-slate-300 font-bold'
                          : idx === 2
                          ? 'bg-amber-50 text-amber-900 border-amber-200 font-bold'
                          : 'bg-slate-50 text-slate-500';

                      return (
                        <tr key={rep.userId || rep.userName} className="hover:bg-slate-50/80 transition">
                          <td className="p-2.5 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs border ${rankBadge}`}>
                              {idx + 1}
                            </span>
                          </td>

                          <td className="p-2.5 font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center uppercase shrink-0">
                                {rep.userName.charAt(0) || 'U'}
                              </div>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onOpenUserHistory) onOpenUserHistory(rep, { dateRange, customFrom, customTo });
                                    onClose();
                                  }}
                                  className="font-bold text-slate-900 leading-tight hover:text-indigo-600 underline cursor-pointer text-left"
                                  title="Click to view outreach history"
                                >
                                  {rep.userName}
                                </button>
                                {rep.email && <p className="text-[10px] text-slate-400 leading-tight">{rep.email}</p>}
                              </div>
                            </div>
                          </td>

                          <td className="p-2.5 text-center font-bold text-slate-900">
                            {rep.totalCalls}
                          </td>

                          <td className="p-2.5 text-center">
                            <span className="font-semibold text-emerald-700">
                              {rep.connectedCalls} ({rep.connectionRate}%)
                            </span>
                          </td>

                          <td className="p-2.5 text-center">
                            <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              {rep.positiveOutcomes}
                            </span>
                          </td>

                          <td className="p-2.5 text-center text-slate-600">
                            {rep.totalWhatsApps + rep.totalEmails}
                          </td>

                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setFollowUpRepFilter(rep.userName);
                                setActiveTab('followups');
                              }}
                              className="font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-200 transition cursor-pointer"
                              title="Click to view follow-ups assigned to this rep"
                            >
                              {rep.totalFollowUps || 0}
                            </button>
                          </td>

                          <td className="p-2.5 text-center">
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                              {rep.convertedCount}
                            </span>
                          </td>

                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {onOpenUserHistory && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onOpenUserHistory(rep, { dateRange, customFrom, customTo });
                                    onClose();
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-md transition cursor-pointer"
                                  title="View full outreach and activity history"
                                >
                                  <TrendingUp className="w-3 h-3" />
                                  <span>History</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (onSelectRepFilter) onSelectRepFilter(rep.userName);
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition cursor-pointer"
                                title="Filter Database by this Representative"
                              >
                                <Filter className="w-3 h-3" />
                                <span>Table</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: FOLLOW-UP DETAILS VIEW */}
        {activeTab === 'followups' && (
          <div className="space-y-3">
            {/* Filter Pills & Rep Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-slate-600">Status:</span>
                {[
                  { id: 'all', label: 'All Follow-ups' },
                  { id: 'scheduled', label: 'Upcoming / Scheduled' },
                  { id: 'overdue', label: 'Overdue' },
                  { id: 'completed', label: 'Completed' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setFollowUpStatusFilter(st.id)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      followUpStatusFilter === st.id
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Rep:</span>
                <select
                  value={followUpRepFilter}
                  onChange={(e) => setFollowUpRepFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-amber-500 font-medium text-slate-700"
                >
                  <option value="all">All Sales Reps</option>
                  {leaderboard.map((r) => (
                    <option key={r.userId || r.userName} value={r.userName}>
                      {r.userName}
                    </option>
                  ))}
                </select>
                {followUpRepFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setFollowUpRepFilter('all')}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Follow-ups Table */}
            <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-xs max-h-[55vh] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5">Status & Priority</th>
                    <th className="p-2.5">Prospect / Company</th>
                    <th className="p-2.5">Contact & Phone</th>
                    <th className="p-2.5">Scheduled Date & Time</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Assigned Rep</th>
                    <th className="p-2.5">Notes</th>
                    <th className="p-2.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="animate-spin w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full mx-auto mb-2" />
                        Loading scheduled follow-ups...
                      </td>
                    </tr>
                  ) : filteredFollowUps.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        <CalendarCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No follow-ups found for this criteria</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Try changing the date period or clearing filters.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredFollowUps.map((flw) => {
                      const prospect = flw.importDataId || flw.leadId || {};
                      const compName = prospect.companyName || flw.title || 'Prospect';
                      const contact = prospect.contactPerson || prospect.firstName || 'Contact';
                      const phone = prospect.mobileNo || prospect.phone || '';
                      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
                      const repName = flw.assignedTo?.name || `${flw.assignedTo?.firstName || ''} ${flw.assignedTo?.lastName || ''}`.trim() || flw.assignedTo?.email || 'Assigned Rep';

                      const dateInfo = formatDateTime(flw.scheduledDate);
                      const isCompleted = flw.status === 'completed';
                      const isOverdue = !isCompleted && dateInfo.isPast;

                      let statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-2.5 h-2.5 text-amber-600" />
                          Scheduled
                        </span>
                      );
                      if (isCompleted) {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            Completed
                          </span>
                        );
                      } else if (isOverdue) {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                            Overdue
                          </span>
                        );
                      }

                      const priorityColor =
                        flw.priority === 'Urgent'
                          ? 'bg-red-50 text-red-700 border-red-200 font-bold'
                          : flw.priority === 'High'
                          ? 'bg-orange-50 text-orange-700 border-orange-200 font-semibold'
                          : flw.priority === 'Low'
                          ? 'bg-slate-50 text-slate-600 border-slate-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200';

                      return (
                        <tr key={flw._id} className="hover:bg-slate-50/80 transition">
                          <td className="p-2.5">
                            <div className="flex flex-col gap-1 items-start">
                              {statusBadge}
                              {flw.priority && (
                                <span className={`px-1.5 py-0.2 rounded text-[9px] border ${priorityColor}`}>
                                  {flw.priority} Priority
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-2.5 font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-900">{compName}</span>
                                {prospect.industry && (
                                  <p className="text-[10px] text-slate-400 font-normal">{prospect.industry}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="p-2.5 text-slate-700">
                            <p className="font-medium text-slate-900">{contact}</p>
                            {phone ? (
                              <p className="text-[10px] text-indigo-600 font-mono">{phone}</p>
                            ) : (
                              <p className="text-[10px] text-slate-400">No phone</p>
                            )}
                          </td>

                          <td className="p-2.5">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span
                                className={`font-semibold ${
                                  isOverdue ? 'text-rose-600 font-bold' : dateInfo.isToday ? 'text-amber-700 font-bold' : 'text-slate-700'
                                }`}
                              >
                                {dateInfo.text}
                              </span>
                            </div>
                          </td>

                          <td className="p-2.5">
                            <span className="capitalize font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {flw.type || 'Call'}
                            </span>
                          </td>

                          <td className="p-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center uppercase shrink-0">
                                {repName.charAt(0)}
                              </div>
                              <span className="text-slate-800 font-medium">{repName}</span>
                            </div>
                          </td>

                          <td className="p-2.5 max-w-[200px]">
                            <p className="text-[11px] text-slate-600 truncate" title={flw.notes || flw.title}>
                              {flw.notes || flw.title || '—'}
                            </p>
                          </td>

                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {cleanPhone && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    window.open(`https://wa.me/91${cleanPhone}`, '_blank');
                                  }}
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                                  title="Chat on WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {cleanPhone && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    window.location.href = `tel:${cleanPhone}`;
                                  }}
                                  className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer"
                                  title="Dial Phone"
                                >
                                  <PhoneCall className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {!isCompleted && (
                                <button
                                  type="button"
                                  onClick={() => handleCompleteFollowUp(flw._id)}
                                  disabled={completingId === flw._id}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition cursor-pointer disabled:opacity-50"
                                  title="Mark follow-up as completed"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>{completingId === flw._id ? 'Saving...' : 'Done'}</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            {activeTab === 'leaderboard'
              ? `Showing ranking for ${filteredLeaderboard.length} representatives`
              : `Showing ${filteredFollowUps.length} follow-up tasks`}
          </p>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
