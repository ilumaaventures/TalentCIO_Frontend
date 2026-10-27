import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Phone,
  PhoneCall,
  MessageSquare,
  Mail,
  Clock,
  Calendar,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Check,
  X,
  FileText,
  CalendarCheck,
  Send,
  SlidersHorizontal,
  ChevronDown,
  ArrowLeft,
  ArrowUpDown,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { dataService } from '../../services/api';
import toast from 'react-hot-toast';
import { RepOutreachFilters } from './components/RepOutreachFilters';
import { RepOutreachTable } from './components/RepOutreachTable';

export const RepOutreachHistoryModal = ({
  isOpen,
  onClose,
  onBack,
  rep, // { userName, userId, email, avatar, isAll }
  initialChannelType = 'all',
  initialOutcome = 'all',
  initialDateRange = 'today',
  initialCustomFrom = '',
  initialCustomTo = '',
  onSelectRepFilter,
  onOpenProspectDetails, // (row) => void
}) => {
  const sanitizeDateRange = (val) => {
    if (['yesterday', 'this_month'].includes(val)) return 'today';
    return val || 'today';
  };

  const [dateRange, setDateRange] = useState(() => sanitizeDateRange(initialDateRange));
  const [customFrom, setCustomFrom] = useState(initialCustomFrom || '');
  const [customTo, setCustomTo] = useState(initialCustomTo || '');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef(null);

  const [channelType, setChannelType] = useState(initialChannelType || 'all'); // 'all' | 'call' | 'whatsapp' | 'email' | 'task'
  const [outcomeFilter, setOutcomeFilter] = useState(initialOutcome || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedNotes, setExpandedNotes] = useState({});

  const repName = rep?.userName || 'Representative';
  const repUserId = rep?.userId || null;
  const repEmail = rep?.email || '';
  const isTeam = Boolean(
    rep?.isAll ||
    repName === 'All Team Telemetry' ||
    repName === 'Team Telemetry' ||
    repName.toLowerCase().startsWith('all team')
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setIsSortDropdownOpen(false);
      }
    };
    if (isSortDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSortDropdownOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialChannelType) setChannelType(initialChannelType);
      if (initialOutcome) setOutcomeFilter(initialOutcome);
      if (initialDateRange) setDateRange(sanitizeDateRange(initialDateRange));
      if (initialCustomFrom) setCustomFrom(initialCustomFrom);
      if (initialCustomTo) setCustomTo(initialCustomTo);
    }
  }, [isOpen, initialChannelType, initialOutcome, initialDateRange, initialCustomFrom, initialCustomTo]);

  const fetchActivities = useCallback(async () => {
    if (!isOpen) return;
    setIsLoading(true);
    try {
      const params = {
        userName: isTeam ? undefined : repName,
        userId: repUserId || undefined,
        dateRange,
        type: channelType !== 'all' ? channelType : undefined,
        outcome: outcomeFilter !== 'all' ? outcomeFilter : undefined,
        search: searchQuery.trim() || undefined,
        page: currentPage,
        limit: pageSize,
      };

      if (dateRange === 'custom') {
        if (customFrom) params.from = customFrom;
        if (customTo) params.to = customTo;
      }

      const res = await dataService.getRepActivities(params);
      if (res?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load rep outreach activities', err);
      toast.error('Failed to fetch outreach history');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, isTeam, repName, repUserId, dateRange, channelType, outcomeFilter, searchQuery, currentPage, pageSize, customFrom, customTo]);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, customFrom, customTo, channelType, outcomeFilter, searchQuery, pageSize]);

  // Fetch when opened or dependencies change
  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen, fetchActivities]);

  if (!isOpen) return null;

  const activities = data?.activities || [];
  const pagination = data?.pagination || { page: 1, limit: pageSize, total: 0, totalPages: 1 };
  const summary = data?.summary || {
    totalActivities: 0,
    typeCounts: { all: 0, call: 0, whatsapp: 0, email: 0, task: 0 },
    totalCalls: 0,
    totalWhatsApps: 0,
    totalEmails: 0,
    totalFollowUps: 0,
    connectedCalls: 0,
    connectionRate: 0,
    positiveOutcomes: 0,
  };

  const toggleExpandNote = (actId) => {
    setExpandedNotes((prev) => ({ ...prev, [actId]: !prev[actId] }));
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${timeStr}`;
  };


  const dateFilterButtons = [
    { id: 'today', label: 'Today' },
    { id: '2days', label: 'Last 2 Days' },
    { id: '5days', label: 'Last 5 Days' },
    { id: 'this_week', label: 'This Week' },
    { id: 'all', label: 'All Time' },
    { id: 'custom', label: 'Custom Range' },
  ];

  const activeSortLabel = dateFilterButtons.find((btn) => btn.id === dateRange)?.label || 'Today';

  const channelPills = [
    { id: 'all', label: 'All', count: summary.typeCounts?.all || 0 },
    { id: 'call', label: 'Calls', count: summary.typeCounts?.call || 0, icon: PhoneCall },
    { id: 'whatsapp', label: 'WhatsApp', count: summary.typeCounts?.whatsapp || 0, icon: MessageSquare },
    { id: 'email', label: 'Email', count: summary.typeCounts?.email || 0, icon: Mail },
    { id: 'task', label: 'Follow-ups', count: summary.typeCounts?.task || 0, icon: CalendarCheck },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      hideHeader
      maxWidth="max-w-[96vw] xl:max-w-[1520px]"
      maxHeight="max-h-[90vh]"
      padding="p-4 sm:p-6"
    >
      <div className="space-y-4">
        {/* Custom Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-bold border border-slate-200 hover:border-indigo-300 transition cursor-pointer shadow-2xs group shrink-0"
                title="Go back to Sales Leaderboard"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 group-hover:-translate-x-0.5 transition-transform" />
                <span>Back to Leaderboard</span>
              </button>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {isTeam ? 'Team Outreach & Activity History' : `${repName}'s Outreach & Activity History`}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                  Telemetry Ledger
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTeam
                  ? 'Consolidated log of calls, WhatsApps, follow-ups, and recorded client outcomes across all team members.'
                  : `${repEmail ? `${repEmail} • ` : ''}Detailed log of calls, WhatsApps, follow-ups, and recorded client outcomes.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isTeam && onSelectRepFilter && (
              <button
                type="button"
                onClick={() => {
                  onSelectRepFilter(repName);
                  toast.success(`Main table filtered by ${repName}`);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200/80 transition cursor-pointer"
                title="Filter main database table by this representative"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter Table by {repName.split(' ')[0]}</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchActivities}
              disabled={isLoading}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
              title="Refresh logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer ml-1"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top KPIs Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
          <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium">Total Touchpoints</span>
            <p className="text-lg font-black text-slate-900 mt-0.5">{summary.totalActivities || 0}</p>
            <span className="text-[10px] text-slate-400">In selected period</span>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/70 shadow-2xs">
            <span className="text-[11px] text-indigo-700 font-medium flex items-center justify-between">
              <span>Calls Made</span>
              <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-indigo-900">{summary.totalCalls || 0}</span>
              <span className="text-[10px] text-indigo-600 font-bold">({summary.connectionRate || 0}% reached)</span>
            </div>
            <span className="text-[10px] text-indigo-500">{summary.connectedCalls || 0} connected</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/70 shadow-2xs">
            <span className="text-[11px] text-emerald-700 font-medium flex items-center justify-between">
              <span>Positive Outcomes</span>
            </span>
            <p className="text-lg font-black text-emerald-900 mt-0.5">{summary.positiveOutcomes || 0}</p>
            <span className="text-[10px] text-emerald-600">Interested / Meetings</span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/70 shadow-2xs">
            <span className="text-[11px] text-blue-700 font-medium flex items-center justify-between">
              <span>WhatsApp / Email</span>
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            </span>
            <p className="text-lg font-black text-blue-900 mt-0.5">
              {(summary.totalWhatsApps || 0) + (summary.totalEmails || 0)}
            </p>
            <span className="text-[10px] text-blue-500">
              {summary.totalWhatsApps || 0} WA • {summary.totalEmails || 0} Email
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/70 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[11px] text-amber-700 font-medium flex items-center justify-between">
              <span>Follow-ups Set</span>
              <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
            </span>
            <p className="text-lg font-black text-amber-900 mt-0.5">{summary.totalFollowUps || 0}</p>
            <span className="text-[10px] text-amber-600">Action items scheduled</span>
          </div>
        </div>

        {/* Filter Controls Panel */}
        <RepOutreachFilters
          sortDropdownRef={sortDropdownRef}
          isSortDropdownOpen={isSortDropdownOpen}
          setIsSortDropdownOpen={setIsSortDropdownOpen}
          activeSortLabel={activeSortLabel}
          dateFilterButtons={dateFilterButtons}
          dateRange={dateRange}
          setDateRange={setDateRange}
          pageSize={pageSize}
          setPageSize={setPageSize}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
          fetchActivities={fetchActivities}
          channelPills={channelPills}
          channelType={channelType}
          setChannelType={setChannelType}
          outcomeFilter={outcomeFilter}
          setOutcomeFilter={setOutcomeFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Activity Table & Ledger */}
        <RepOutreachTable
          activities={activities}
          isLoading={isLoading}
          repName={repName}
          dateRange={dateRange}
          setDateRange={setDateRange}
          setChannelType={setChannelType}
          setOutcomeFilter={setOutcomeFilter}
          setSearchQuery={setSearchQuery}
          expandedNotes={expandedNotes}
          toggleExpandNote={toggleExpandNote}
          formatDateDisplay={formatDateDisplay}
          pagination={pagination}
          setCurrentPage={setCurrentPage}
          onOpenProspectDetails={onOpenProspectDetails}
          onClose={onClose}
        />

        {/* Modal Bottom Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
          <p className="text-[11px] text-slate-400">
            Telemetry is automatically synced whenever a sales representative logs calls, WhatsApps, or schedules client follow-ups.
          </p>

          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="outline" icon={ArrowLeft} onClick={onBack}>
                Back to Leaderboard
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Close History
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
