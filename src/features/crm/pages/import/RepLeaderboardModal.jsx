import React, { useState, useEffect, useCallback } from 'react';
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
import { RepLeaderboardTab } from './components/RepLeaderboardTab';
import { RepFollowupsTab } from './components/RepFollowupsTab';

export const RepLeaderboardModal = ({
  isOpen,
  onClose,
  initialTab = 'leaderboard',
  onSelectRepFilter,
  onOpenUserHistory,
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

  const fetchPerformance = useCallback(async () => {
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
  }, [dateRange, customFrom, customTo]);

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
      if (dateRange !== 'custom' || (customFrom && customTo)) {
        fetchPerformance();
      }
    }
  }, [isOpen, dateRange, customFrom, customTo, initialTab, fetchPerformance]);

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
          <RepLeaderboardTab
            summary={summary}
            followUps={followUps}
            filteredLeaderboard={filteredLeaderboard}
            isLoading={isLoading}
            dateRange={dateRange}
            customFrom={customFrom}
            customTo={customTo}
            setActiveTab={setActiveTab}
            setFollowUpRepFilter={setFollowUpRepFilter}
            onOpenUserHistory={onOpenUserHistory}
            onSelectRepFilter={onSelectRepFilter}
            onClose={onClose}
          />
        )}

        {/* TAB 2: FOLLOW-UP DETAILS VIEW */}
        {activeTab === 'followups' && (
          <RepFollowupsTab
            filteredFollowUps={filteredFollowUps}
            followUpStatusFilter={followUpStatusFilter}
            setFollowUpStatusFilter={setFollowUpStatusFilter}
            followUpRepFilter={followUpRepFilter}
            setFollowUpRepFilter={setFollowUpRepFilter}
            leaderboard={leaderboard}
            isLoading={isLoading}
            formatDateTime={formatDateTime}
            handleCompleteFollowUp={handleCompleteFollowUp}
            completingId={completingId}
          />
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
