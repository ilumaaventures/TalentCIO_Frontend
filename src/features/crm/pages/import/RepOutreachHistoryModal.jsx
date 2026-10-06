import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  onOpenOutreach, // (row, type) => void
  onOpenProspectDetails, // (row) => void
}) => {
  const sanitizeDateRange = (val) => {
    if (['yesterday', 'this_month'].includes(val)) return 'today';
    return val || 'today';
  };

  const [dateRange, setDateRange] = useState(() => sanitizeDateRange(initialDateRange));
  const [customFrom, setCustomFrom] = useState(initialCustomFrom || '');
  const [customTo, setCustomTo] = useState(initialCustomTo || '');
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
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

  const fetchActivities = async () => {
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
  };

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, customFrom, customTo, channelType, outcomeFilter, searchQuery, pageSize]);

  // Fetch when opened or dependencies change
  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen, dateRange, customFrom, customTo, channelType, outcomeFilter, searchQuery, currentPage, pageSize, repName, repUserId, isTeam]);

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

  const getChannelBadge = (type, callType, duration) => {
    switch (type) {
      case 'call':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
            <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
            <span>{callType || 'Call'}</span>
            {duration > 0 && <span className="text-[10px] text-indigo-500 font-normal">({duration}m)</span>}
          </span>
        );
      case 'whatsapp':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </span>
        );
      case 'email':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            <span>Email</span>
          </span>
        );
      case 'task':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Follow-up</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="capitalize">{type}</span>
          </span>
        );
    }
  };

  const getOutcomeBadge = (outcome) => {
    if (!outcome) return null;
    let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    let icon = null;

    if (['Connected - Interested', 'Scheduled Meeting'].includes(outcome)) {
      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
    } else if (['Callback Requested', 'Sent', 'Completed'].includes(outcome)) {
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      icon = <Clock className="w-3 h-3 text-amber-600 inline mr-1" />;
    } else if (['Connected - Not Interested', 'Wrong Number'].includes(outcome)) {
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-medium';
    } else if (['No Answer', 'Busy', 'Left Voicemail'].includes(outcome)) {
      badgeClass = 'bg-slate-100 text-slate-600 border-slate-300';
    } else if (['Connected'].includes(outcome)) {
      badgeClass = 'bg-blue-100 text-blue-800 border-blue-300 font-semibold';
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${badgeClass}`}>
        {icon}
        {outcome}
      </span>
    );
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
        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/90 space-y-3">
          {/* Time range picker with Sort Button */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Timeframe:
              </span>

              {/* Sort / Timeframe Dropdown Button */}
              <div className="relative inline-block text-left" ref={sortDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsSortDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition cursor-pointer"
                  title="Sort by timeframe"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Sort:</span>
                  <span className="font-bold text-indigo-600">{activeSortLabel}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isSortDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                </button>

                {isSortDropdownOpen && (
                  <div className="absolute left-0 mt-1.5 w-48 rounded-xl bg-white border border-slate-200/90 shadow-lg py-1.5 z-40">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                      Sort by Timeframe
                    </div>
                    {dateFilterButtons.map((btn) => {
                      const isSelected = dateRange === btn.id;
                      return (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => {
                            setDateRange(btn.id);
                            if (btn.id === 'custom') {
                              setIsCustomDateOpen(true);
                            } else {
                              setIsCustomDateOpen(false);
                            }
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/80 font-bold text-indigo-700'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                          }`}
                        >
                          <span>{btn.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Custom Date Selector Row (if selected) */}
          {dateRange === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 text-xs">
              <span className="font-semibold text-slate-600">From:</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-600">To:</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={fetchActivities}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition"
              >
                Apply Range
              </button>
            </div>
          )}

          {/* Second Row: Channel Tabs + Outcome Filter + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            {/* Channel Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {channelPills.map((pill) => {
                const IconComponent = pill.icon;
                const isActive = channelType === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setChannelType(pill.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    {IconComponent && <IconComponent className="w-3 h-3" />}
                    <span>{pill.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Outcome Filter & Search */}
            <div className="flex items-center gap-2">
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
              >
                <option value="all">All Outcomes</option>
                <option value="connected">All Connected Calls</option>
                <option value="positive">Positive (Interested / Demo / Meeting)</option>
                <option value="Connected - Interested">Interested / Demo</option>
                <option value="Scheduled Meeting">Scheduled Meeting</option>
                <option value="Callback Requested">Callback Requested</option>
                <option value="Connected - Not Interested">Not Interested</option>
                <option value="No Answer">No Answer / Busy</option>
                <option value="Wrong Number">Wrong Number</option>
                <option value="Sent">Sent (Email/WA)</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search company, contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Table & Ledger */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 select-none">
                <tr>
                  <th className="p-3 w-36">Time & Date</th>
                  <th className="p-3 w-44">Company</th>
                  <th className="p-3 w-44">Performed By</th>
                  <th className="p-3 text-center w-28">Channel</th>
                  <th className="p-3 text-center w-36">Outcome</th>
                  <th className="p-3">Conversation Notes & Remarks</th>
                  <th className="p-3 text-center w-28">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
                      Loading {repName}&apos;s activity telemetry...
                    </td>
                  </tr>
                ) : activities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <Clock className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">No Outreach Interactions Found</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        No activity records matched the selected period ({dateRange}) and filter criteria for {repName}.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setDateRange('all');
                          setChannelType('all');
                          setOutcomeFilter('all');
                          setSearchQuery('');
                        }}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition"
                      >
                        Reset All Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  activities.map((act) => {
                    const prospect = act.importDataId || {};
                    const lead = act.leadId || {};
                    const companyName = prospect.companyName || lead.companyName || '—';
                    const isConverted = prospect.isConvertedToLead || lead.isConverted;

                    const performedUser = act.performedBy || {};
                    const userName =
                      performedUser.name ||
                      (performedUser.firstName ? `${performedUser.firstName} ${performedUser.lastName || ''}`.trim() : '') ||
                      act.performedByName ||
                      'Representative';
                    const userEmail = performedUser.email || '';
                    const userInitial = (userName.charAt(0) || 'U').toUpperCase();

                    const isNoteExpanded = !!expandedNotes[act._id];
                    const noteText = act.description || act.subject || 'No details recorded.';
                    const hasLongNote = noteText.length > 100;

                    return (
                      <tr key={act._id} className="hover:bg-slate-50/80 transition group">
                        {/* Time & Date */}
                        <td className="p-3 align-top font-medium text-slate-800 whitespace-nowrap">
                          <p className="text-slate-900 font-bold">{formatDateDisplay(act.performedAt)}</p>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {new Date(act.performedAt).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>

                        {/* Company */}
                        <td className="p-3 align-top">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs hover:text-indigo-600 transition">
                              {companyName}
                            </span>
                            {isConverted && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Lead
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Performed By User */}
                        <td className="p-3 align-top whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                              {userInitial}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-xs truncate" title={userName}>
                                {userName}
                              </p>
                              {userEmail && (
                                <span className="text-[10px] text-slate-400 block truncate max-w-[130px]" title={userEmail}>
                                  {userEmail}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Channel Badge */}
                        <td className="p-3 align-top text-center">
                          {getChannelBadge(act.type, act.callType, act.durationMinutes)}
                        </td>

                        {/* Outcome */}
                        <td className="p-3 align-top text-center">
                          {getOutcomeBadge(act.outcome)}
                        </td>

                        {/* Discussion Notes / Remarks */}
                        <td className="p-3 align-top text-slate-700">
                          {act.type === 'email' ? (
                            <div className="max-w-md">
                              <div className="flex items-start gap-1.5">
                                <div className="w-5 h-5 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 mt-0.5 border border-sky-200/60">
                                  <Mail className="w-3 h-3" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 leading-snug break-words">
                                    {act.metadata?.emailSubject || (act.subject ? act.subject.replace(/^Email:\s*/i, '') : '') || 'Sales Outreach Email'}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const targetRecord = prospect?._id ? prospect : (lead?._id ? lead : { _id: act.importDataId || act.leadId, companyName });
                                      if (onOpenProspectDetails && targetRecord?._id) {
                                        onOpenProspectDetails(targetRecord, {
                                          tab: 'timeline',
                                          emailId: act._id,
                                          activity: act,
                                        });
                                        onClose();
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline mt-1 cursor-pointer"
                                  >
                                    <span>Read more</span>
                                    <ArrowUpRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Show Next Follow-up Pill if linked */}
                              {prospect.nextFollowUpAt && (
                                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold">
                                  <Calendar className="w-3 h-3 text-amber-600" />
                                  <span>Next: {new Date(prospect.nextFollowUpAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="max-w-md">
                              {act.subject && act.description && (
                                <p className="text-[11px] font-bold text-slate-800 mb-0.5">
                                  {act.subject}
                                </p>
                              )}
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {hasLongNote && !isNoteExpanded ? `${noteText.substring(0, 95)}...` : noteText}
                              </p>
                              {hasLongNote && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandNote(act._id)}
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-0.5 cursor-pointer block"
                                >
                                  {isNoteExpanded ? 'Show less' : 'Read more'}
                                </button>
                              )}

                              {/* Show Next Follow-up Pill if linked */}
                              {prospect.nextFollowUpAt && (
                                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold">
                                  <Calendar className="w-3 h-3 text-amber-600" />
                                  <span>Next: {new Date(prospect.nextFollowUpAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Direct Action */}
                        <td className="p-3 align-top text-center">
                          <div className="flex flex-col gap-1 items-center">
                            {onOpenOutreach && prospect._id && (
                              <button
                                type="button"
                                onClick={() => onOpenOutreach(prospect, 'call')}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                                title="Log another outreach for this client"
                              >
                                <PhoneCall className="w-3 h-3" />
                                <span>Outreach</span>
                              </button>
                            )}

                            {onOpenProspectDetails && prospect._id && (
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenProspectDetails(prospect);
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-800 hover:underline"
                                title="Open full prospect file"
                              >
                                <span>View File</span>
                                <ArrowUpRight className="w-2.5 h-2.5" />
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

          {/* Pagination Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 select-none">
            <div>
              <span>Showing </span>
              <strong className="font-bold text-slate-900">
                {activities.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
              </strong>
              <span> to </span>
              <strong className="font-bold text-slate-900">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </strong>
              <span> of </span>
              <strong className="font-bold text-slate-900">{pagination.total}</strong>
              <span> recorded activities</span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                icon={ChevronLeft}
              >
                Previous
              </Button>

              {/* Page Number Chips */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (pagination.totalPages > 5 && pagination.page > 3) {
                    pageNum = pagination.page - 3 + i;
                    if (pageNum > pagination.totalPages) pageNum = pagination.totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                        pagination.page === pageNum
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                icon={ChevronRight}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

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
