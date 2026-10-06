import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Phone,
  PhoneCall,
  Mail,
  MessageSquare,
  Clock,
  Building2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Star,
  MapPin,
  User,
  Calendar,
  Edit3,
  Trash2,
  Plus,
  CheckSquare,
  Send,
  Share2,
  FileText,
  Activity,
  TrendingUp,
  Copy,
  Globe,
  Tag,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { dataService, leadsService, tasksService } from '../../services/api';
import { LogOutreachModal } from './LogOutreachModal';
import { CrmMailComposerModal } from '../../components/communication/CrmMailComposerModal';

const parseEmailActivity = (act) => {
  if (!act) return null;
  const metadata = act.metadata || {};
  let subject = metadata.emailSubject || act.subject || 'Outreach Email';
  subject = subject.replace(/^Email:\s*/i, '').trim();

  let to = metadata.to || '';
  let recipientName = metadata.recipientName || '';
  let cc = metadata.cc || '';
  let bcc = metadata.bcc || '';
  let htmlBody = metadata.htmlBody || '';
  let plainBody = metadata.plainBody || '';

  const desc = act.description || '';
  if (!to && desc.includes('To:')) {
    const toMatch = desc.match(/To:\s*([^\n]+)/);
    if (toMatch) {
      to = toMatch[1].trim();
    }
  }

  let cleanBody = plainBody || '';
  if (!cleanBody) {
    let raw = desc;
    if (raw.startsWith('To:')) {
      const parts = raw.split(/\n\s*\n/);
      if (parts.length > 1) {
        raw = parts.slice(1).join('\n\n');
      } else {
        raw = raw.replace(/^To:[^\n]+(\n)?/, '');
      }
    }
    if (/<[a-z][\s\S]*>/i.test(raw)) {
      if (!htmlBody) htmlBody = raw;
      cleanBody = raw
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
    } else {
      cleanBody = raw.trim();
    }
  }

  const senderName =
    act.performedByName ||
    act.performedBy?.name ||
    (act.performedBy ? `${act.performedBy.firstName || ''} ${act.performedBy.lastName || ''}`.trim() : '') ||
    'Representative';

  const senderEmail = act.performedBy?.email || '';

  return {
    id: act._id || act.id,
    subject,
    to: to || 'Contact',
    recipientName,
    cc,
    bcc,
    htmlBody,
    cleanBody: cleanBody || 'No message content recorded.',
    senderName,
    senderEmail,
    sentAt: act.performedAt || act.createdAt,
    status: act.outcome || 'Sent',
  };
};

export const ImportDataDetailPage = ({
  record: initialRecord,
  initialTab = 'overview',
  focusedActivityId = null,
  onBack,
  onNavigate,
  onConvert,
  onEdit,
  onDelete,
  onUpdateRecord,
}) => {
  const [record, setRecord] = useState(initialRecord || {});
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [activities, setActivities] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [selectedEmailActivity, setSelectedEmailActivity] = useState(null);
  const [selectedCallActivity, setSelectedCallActivity] = useState(null);
  const [channelFilter, setChannelFilter] = useState('all'); // 'all' | 'call' | 'whatsapp' | 'email'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [paginationInfo, setPaginationInfo] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [summaryMetrics, setSummaryMetrics] = useState(null);
  const [emailViewMode, setEmailViewMode] = useState('html');
  const [copiedEmailText, setCopiedEmailText] = useState(false);
  const [highlightedActivityId, setHighlightedActivityId] = useState(focusedActivityId);

  const onUpdateRecordRef = useRef(onUpdateRecord);
  useEffect(() => {
    onUpdateRecordRef.current = onUpdateRecord;
  }, [onUpdateRecord]);

  // Outreach Modal state
  const [isOutreachOpen, setIsOutreachOpen] = useState(false);
  const [outreachType, setOutreachType] = useState('call');
  const [isMailComposerOpen, setIsMailComposerOpen] = useState(false);

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    priority: 'Medium',
    category: 'Follow-up',
    description: '',
  });

  const recordId = record?._id || record?.id;
  const cleanPhone = (record?.mobileNo || record?.phone || '').replace(/\D/g, '').slice(-10);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (focusedActivityId) {
      setHighlightedActivityId(focusedActivityId);
      const matched = activities.find((a) => (a._id || a.id) === focusedActivityId);
      if (matched && matched.type === 'email') {
        setSelectedEmailActivity(matched);
      }
      setTimeout(() => {
        const el = document.getElementById(`activity-${focusedActivityId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [focusedActivityId, activities]);

  // Fetch prospect activities and follow-ups with pagination & channel filter
  const loadActivitiesAndFollowUps = useCallback(
    async (overrides = {}) => {
      if (!recordId) return;
      setIsLoadingTimeline(true);
      try {
        const activeChannel = overrides.channel !== undefined ? overrides.channel : channelFilter;
        const activePage = overrides.page !== undefined ? overrides.page : currentPage;
        const activeLimit = overrides.limit !== undefined ? overrides.limit : pageSize;

        const res = await dataService.getActivities(recordId, {
          channel: activeChannel,
          page: activePage,
          limit: activeLimit,
        });

        if (res?.success) {
          const acts = res.data?.activities || res.activities || [];
          const flws = res.data?.followUps || res.followUps || [];
          const pag = res.data?.pagination || res.pagination || {
            page: activePage,
            limit: activeLimit,
            total: acts.length,
            totalPages: Math.ceil(acts.length / activeLimit) || 1,
            hasNextPage: false,
            hasPrevPage: false,
          };
          const sum = res.data?.summary || null;

          setActivities(acts);
          setFollowUps(flws);
          setPaginationInfo(pag);
          if (sum) setSummaryMetrics(sum);

          if (focusedActivityId) {
            const matched = acts.find((a) => (a._id || a.id) === focusedActivityId);
            if (matched && matched.type === 'email') {
              setSelectedEmailActivity(matched);
            }
          }

          if (res.data?.record) {
            const totalCalls = sum?.totalCalls ?? res.data.record.callCount ?? 0;
            const totalWhatsApps = sum?.totalWhatsApps ?? res.data.record.whatsappCount ?? 0;
            const totalEmails = sum?.totalEmails ?? res.data.record.emailCount ?? 0;

            const updatedRec = {
              ...res.data.record,
              callCount: totalCalls,
              whatsappCount: totalWhatsApps,
              emailCount: totalEmails,
              lastOutcome: res.data.record.lastOutcome || acts[0]?.outcome,
              lastContactedAt: res.data.record.lastContactedAt || acts[0]?.performedAt,
              lastContactedBy: res.data.record.lastContactedBy || acts[0]?.performedByName,
            };

            setRecord((prev) => ({
              ...(prev || {}),
              ...updatedRec,
            }));
          }
        }
      } catch (err) {
        console.warn('Failed to load prospect timeline:', err);
      } finally {
        setIsLoadingTimeline(false);
      }
    },
    [recordId, channelFilter, currentPage, pageSize, focusedActivityId]
  );

  const initialRecordId = initialRecord?._id || initialRecord?.id;
  useEffect(() => {
    if (initialRecord) {
      setRecord(initialRecord);
    }
  }, [initialRecordId]);

  const loadFullCompanyDetails = useCallback(async () => {
    if (!recordId) return;
    try {
      const res = await dataService.getImportDataById(recordId);
      if (res?.success && res.data) {
        setRecord((prev) => ({
          ...(prev || {}),
          ...res.data,
        }));
      }
    } catch (err) {
      console.warn('Failed to load full company record:', err);
    }
  }, [recordId]);

  useEffect(() => {
    loadActivitiesAndFollowUps();
  }, [loadActivitiesAndFollowUps]);

  useEffect(() => {
    loadFullCompanyDetails();
  }, [loadFullCompanyDetails]);

  const handleChannelFilterChange = (newChannel) => {
    setChannelFilter(newChannel);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || (paginationInfo.totalPages && newPage > paginationInfo.totalPages)) return;
    setCurrentPage(newPage);
  };

  const handleOpenOutreach = (type = 'call') => {
    if (type === 'email') {
      setIsMailComposerOpen(true);
      return;
    }
    setOutreachType(type);
    setIsOutreachOpen(true);
  };

  const handleOutreachSuccess = (updatedData) => {
    if (updatedData) {
      const merged = { ...record, ...updatedData };
      setRecord(merged);
      if (onUpdateRecord) onUpdateRecord(merged);
    }
    loadActivitiesAndFollowUps();
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      toast.error('Task title is required');
      return;
    }
    const newTask = {
      _id: 'task_' + Date.now(),
      title: taskForm.title,
      dueDate: taskForm.dueDate,
      priority: taskForm.priority,
      category: taskForm.category,
      description: taskForm.description,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    setIsTaskModalOpen(false);
    setTaskForm({
      title: '',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      priority: 'Medium',
      category: 'Follow-up',
      description: '',
    });
    toast.success('Task created successfully');
  };

  const handleToggleTaskStatus = (taskId) => {
    setTasks((prev) =>
      prev.map((t) =>
        t._id === taskId
          ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' }
          : t
      )
    );
  };

  const handleDeleteTask = (taskId) => {
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    toast.success('Task removed');
  };

  const handleCopyPhone = () => {
    const p = record.mobileNo || record.phone;
    if (p) {
      navigator.clipboard.writeText(p);
      toast.success(`Copied phone: ${p}`);
    }
  };

  const callsCount = summaryMetrics?.totalCalls ?? (activities.length > 0
    ? activities.filter((a) => a.type === 'call').length
    : (record?.callCount || 0));
  const whatsAppCount = summaryMetrics?.totalWhatsApps ?? (activities.length > 0
    ? activities.filter((a) => a.type === 'whatsapp').length
    : (record?.whatsappCount || 0));
  const emailsCount = summaryMetrics?.totalEmails ?? (activities.length > 0
    ? activities.filter((a) => a.type === 'email').length
    : (record?.emailCount || 0));
  const totalTouches = summaryMetrics?.totalTouches ?? (callsCount + whatsAppCount + emailsCount);

  const displayedActivities = useMemo(() => {
    if (channelFilter === 'all') return activities;
    return activities.filter((act) => act.type === channelFilter);
  }, [activities, channelFilter]);

  const latestActivity = activities.length > 0 ? activities[0] : null;
  const latestOutcome = latestActivity?.outcome || record?.lastOutcome || null;
  const latestRep = latestActivity?.performedByName || record?.lastContactedBy || null;
  const latestDate = latestActivity?.performedAt || record?.lastContactedAt || null;
  const upcomingFollowUp = followUps.find((f) => f.status === 'scheduled') || null;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer shrink-0 transition"
              title="Back to Database table"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
                  {record?.companyName || 'Company Prospect'}
                </h1>
                {record?.industry && (
                  <Badge variant="neutral" size="sm">
                    {record.industry}
                  </Badge>
                )}
                {(record?.source || record?.leadSource) && (
                  <Badge variant="blue" size="sm">
                    Source: {record?.source || record?.leadSource}
                  </Badge>
                )}
                {record?.rating && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 shrink-0">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{record.rating}</span>
                  </span>
                )}
                {record?.isConvertedToLead ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Converted to CRM Lead
                  </span>
                ) : record?.isDuplicate ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 shrink-0">
                    <AlertCircle className="w-3 h-3 text-rose-500" />
                    Duplicate Record
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Quick Actions Toolbar - Strictly Single Row */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0 overflow-x-auto pb-0.5">
            {!record?.isConvertedToLead && (
              <Button
                size="sm"
                icon={CheckCircle2}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs whitespace-nowrap shrink-0"
                onClick={onConvert}
              >
                Convert Lead
              </Button>
            )}

            {/* Communication Group */}
            <div className="inline-flex items-center rounded-lg border border-slate-200/90 bg-white p-0.5 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => handleOpenOutreach('call')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                title="Log / Dial Call"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Call</span>
              </button>
              <div className="h-3.5 w-px bg-slate-200" />
              <button
                type="button"
                onClick={() => handleOpenOutreach('whatsapp')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                title="Open WhatsApp Web & Log"
              >
                <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                <span>WhatsApp</span>
              </button>
              <div className="h-3.5 w-px bg-slate-200" />
              <button
                type="button"
                onClick={() => handleOpenOutreach('email')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-sky-700 hover:bg-sky-50 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                title="Send Email & Log"
              >
                <Mail className="w-3.5 h-3.5 text-sky-600" />
                <span>Email</span>
              </button>
            </div>

            {/* Activity Group */}
            <div className="inline-flex items-center rounded-lg border border-slate-200/90 bg-white p-0.5 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => handleOpenOutreach('followup')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-violet-700 hover:bg-violet-50 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                title="Schedule Follow-up"
              >
                <Clock className="w-3.5 h-3.5 text-violet-600" />
                <span>Follow-up</span>
              </button>
              <div className="h-3.5 w-px bg-slate-200" />
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                title="Add Task"
              >
                <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                <span>+ Task</span>
              </button>
            </div>

            {/* Manage Group */}
            {onEdit && !record.isConvertedToLead && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-lg shadow-2xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Edit Company Details"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit</span>
              </button>
            )}

            {onDelete && !record.isConvertedToLead && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg shadow-2xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Move to Recycle Bin"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Highlights Strip */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            {record?.contactPerson && (
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{record.contactPerson}</span>
                {record?.designation && <span className="text-slate-400 font-normal">({record.designation})</span>}
              </div>
            )}

            {(record?.mobileNo || record?.phone) && (
              <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/70">
                <Phone className="w-3 h-3 text-emerald-600" />
                <a
                  href={`tel:${cleanPhone}`}
                  className="font-semibold text-slate-800 hover:text-emerald-700 transition"
                  title="Click to dial"
                >
                  {record.mobileNo || record.phone}
                </a>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="text-slate-400 hover:text-slate-600 ml-1 cursor-pointer"
                  title="Copy Phone Number"
                >
                  <Copy className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            {cleanPhone && (
              <a
                href={`https://wa.me/91${cleanPhone}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200/80 font-medium transition"
                title="Open WhatsApp Web"
              >
                <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                <span>WhatsApp</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            )}

            {(record?.emailId || record?.email) && (
              <a
                href={`mailto:${record.emailId || record.email}`}
                className="inline-flex items-center gap-1 text-slate-600 hover:text-sky-700 font-medium transition"
                title="Send email"
              >
                <Mail className="w-3.5 h-3.5 text-sky-500" />
                <span>{record.emailId || record.email}</span>
              </a>
            )}

            {record?.address && (
              <div className="flex items-center gap-1 text-slate-500 max-w-xs truncate" title={record.address}>
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{record.address}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 text-slate-500">
            <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full">
              <Activity className="w-3 h-3 text-indigo-600" />
              {totalTouches} {totalTouches === 1 ? 'Touch' : 'Touches'}
            </span>
            {record?.lastOutcome && (
              <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                Outcome: <strong className="text-slate-900">{record.lastOutcome}</strong>
              </span>
            )}
            {record?.importedBy && (
              <span className="text-[11px] text-slate-400">
                Imported by <strong className="text-slate-600">{record.importedBy}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { id: 'overview', label: 'Company Overview' },
          { id: 'timeline', label: `Outreach & Timeline (${activities.length})` },
          { id: 'tasks', label: `Tasks & Follow-ups (${followUps.length + tasks.length})` },
          { id: 'performance', label: 'Sales Telemetry' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Company Profile Information Card */}
            <Card padding="lg" className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Company Information</h3>
                </div>
                {record.googleSearchUrl && (
                  <a
                    href={record.googleSearchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Google Maps / Search</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium mb-0.5">Company Name</span>
                  <p className="font-semibold text-slate-800 text-sm">{record.companyName || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium mb-0.5">Industry / Domain</span>
                  <p className="font-semibold text-slate-800">{record.industry || '—'}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="text-slate-400 block font-medium mb-0.5">Full Address</span>
                  <p className="text-slate-700 leading-relaxed">{record.address || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium mb-0.5">City / Region</span>
                  <p className="text-slate-700 font-medium">{record.city || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium mb-0.5">State / Pincode</span>
                  <p className="text-slate-700 font-medium">
                    {record.state || '—'} {record.pincode ? `(${record.pincode})` : ''}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium mb-0.5">Website</span>
                  {record.website ? (
                    <a
                      href={record.website.startsWith('http') ? record.website : `https://${record.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" />
                      <span className="truncate max-w-[200px]">{record.website}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block font-medium mb-0.5">Rating & Reviews</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-700">★ {record.rating || '0.0'}</span>
                    <span className="text-slate-400">({record.reviewsCount || 0} reviews)</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Remarks & Notes Card */}
            <Card padding="lg" className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Import Remarks & Notes</h3>
              </div>
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {record.remarks || 'No remarks provided during data import.'}
              </div>
            </Card>

            {/* Outreach Activity & Client Feedback Remarks Card */}
            <Card padding="lg" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-emerald-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Outreach History & Client Feedback
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Calls, WhatsApps, follow-up feedback and remarks logged for this company
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenOutreach('call')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition cursor-pointer"
                    title="Log Call"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Log Call</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenOutreach('whatsapp')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold border border-teal-200 transition cursor-pointer"
                    title="Log WhatsApp"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenOutreach('followup')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition cursor-pointer"
                    title="Schedule Follow-up"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Follow-up</span>
                  </button>
                </div>
              </div>

              {/* Scheduled Follow-up Banner if present */}
              {upcomingFollowUp && (
                <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <div className="w-6 h-6 rounded-lg bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <strong className="font-bold text-amber-950">
                        Upcoming Follow-up Scheduled
                      </strong>
                      <span className="font-mono font-bold bg-amber-200/70 px-2 py-0.5 rounded-full text-[10px]">
                        {new Date(upcomingFollowUp.scheduledDate).toLocaleString('en-IN', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {upcomingFollowUp.notes && (
                      <p className="mt-1 text-amber-800 font-medium">
                        {upcomingFollowUp.notes}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Outreach Channel Metric Pills (Clickable Filters) */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleChannelFilterChange(channelFilter === 'call' ? 'all' : 'call')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                    channelFilter === 'call'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-300'
                      : 'bg-emerald-50 hover:bg-emerald-100/90 border-emerald-200/90 text-emerald-800 hover:shadow-2xs'
                  }`}
                  title="Click to view all calls made"
                >
                  <PhoneCall className={`w-3.5 h-3.5 ${channelFilter === 'call' ? 'text-white' : 'text-emerald-600'}`} />
                  <span>{callsCount} Calls Made</span>
                  {channelFilter === 'call' && (
                    <span className="ml-1 text-[10px] bg-emerald-700 text-white px-1.5 py-0.2 rounded-full font-semibold">Active</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleChannelFilterChange(channelFilter === 'whatsapp' ? 'all' : 'whatsapp')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                    channelFilter === 'whatsapp'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm ring-2 ring-teal-300'
                      : 'bg-teal-50 hover:bg-teal-100/90 border-teal-200/90 text-teal-800 hover:shadow-2xs'
                  }`}
                  title="Click to view all WhatsApp sent"
                >
                  <MessageSquare className={`w-3.5 h-3.5 ${channelFilter === 'whatsapp' ? 'text-white' : 'text-teal-600'}`} />
                  <span>{whatsAppCount} WhatsApp Sent</span>
                  {channelFilter === 'whatsapp' && (
                    <span className="ml-1 text-[10px] bg-teal-700 text-white px-1.5 py-0.2 rounded-full font-semibold">Active</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleChannelFilterChange(channelFilter === 'email' ? 'all' : 'email')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                    channelFilter === 'email'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm ring-2 ring-sky-300'
                      : 'bg-sky-50 hover:bg-sky-100/90 border-sky-200/90 text-sky-800 hover:shadow-2xs'
                  }`}
                  title="Click to view all emails sent"
                >
                  <Mail className={`w-3.5 h-3.5 ${channelFilter === 'email' ? 'text-white' : 'text-sky-600'}`} />
                  <span>{emailsCount} Emails Sent</span>
                  {channelFilter === 'email' && (
                    <span className="ml-1 text-[10px] bg-sky-700 text-white px-1.5 py-0.2 rounded-full font-semibold">Active</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleChannelFilterChange('all')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                    channelFilter === 'all'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-300'
                      : 'bg-indigo-50 hover:bg-indigo-100/90 border-indigo-200/90 text-indigo-800 hover:shadow-2xs'
                  }`}
                  title="Click to show all outreach touches"
                >
                  <Activity className={`w-3.5 h-3.5 ${channelFilter === 'all' ? 'text-white' : 'text-indigo-600'}`} />
                  <span>{totalTouches} Total Touches</span>
                  {channelFilter === 'all' && (
                    <span className="ml-1 text-[10px] bg-indigo-700 text-white px-1.5 py-0.2 rounded-full font-semibold">All</span>
                  )}
                </button>
              </div>

              {/* Feed of Feedback & Remarks */}
              {isLoadingTimeline ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
                  Loading feedback & remarks...
                </div>
              ) : activities.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">
                    No outreach feedback recorded yet
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Log your first call, message on WhatsApp, or email to record client remarks, interest level, and next steps for {record.companyName || 'this company'}.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenOutreach('call')}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                    >
                      Log 1st Call & Feedback
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenOutreach('whatsapp')}
                      className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                    >
                      WhatsApp
                    </button>
                  </div>
                </div>
              ) : displayedActivities.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto ${
                    channelFilter === 'call' ? 'bg-emerald-50 text-emerald-600' :
                    channelFilter === 'whatsapp' ? 'bg-teal-50 text-teal-600' :
                    channelFilter === 'email' ? 'bg-sky-50 text-sky-600' :
                    'bg-indigo-50 text-indigo-600'
                  }`}>
                    {channelFilter === 'call' && <PhoneCall className="w-5 h-5" />}
                    {channelFilter === 'whatsapp' && <MessageSquare className="w-5 h-5" />}
                    {channelFilter === 'email' && <Mail className="w-5 h-5" />}
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">
                    {channelFilter === 'call' && 'No call timeline entries recorded'}
                    {channelFilter === 'whatsapp' && 'No WhatsApp timeline entries recorded'}
                    {channelFilter === 'email' && 'No email timeline entries recorded'}
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    {channelFilter === 'call' && (callsCount > 0
                      ? `Outreach counter recorded ${callsCount} call(s), but no call activity feedback was logged in this timeline.`
                      : `No calls have been logged for ${record.companyName || 'this company'} yet.`)}
                    {channelFilter === 'whatsapp' && `No WhatsApp messages have been logged for ${record.companyName || 'this company'} yet.`}
                    {channelFilter === 'email' && `No emails have been logged for ${record.companyName || 'this company'} yet.`}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    {channelFilter === 'call' && (
                      <button
                        type="button"
                        onClick={() => handleOpenOutreach('call')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                      >
                        📞 Log Call & Feedback Now
                      </button>
                    )}
                    {channelFilter === 'whatsapp' && (
                      <button
                        type="button"
                        onClick={() => handleOpenOutreach('whatsapp')}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                      >
                        💬 Send WhatsApp
                      </button>
                    )}
                    {channelFilter === 'email' && (
                      <button
                        type="button"
                        onClick={() => handleOpenOutreach('email')}
                        className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                      >
                        ✉ Send Sales Email
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleChannelFilterChange('all')}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                    >
                      Show All Touches ({totalTouches})
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {displayedActivities.map((act) => {
                    const outcomeText = act.outcome || 'Completed';
                    const isPositive = ['Connected - Interested', 'Scheduled Meeting'].includes(outcomeText);
                    const isCallback = ['Callback Requested'].includes(outcomeText);
                    const isNegative = ['Connected - Not Interested', 'Wrong Number'].includes(outcomeText);

                    const badgeColor = isPositive
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : isCallback
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : isNegative
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300';

                    const channelLabel = act.type === 'email' ? 'Email' : act.type === 'whatsapp' ? 'WhatsApp' : act.type === 'task' ? 'Follow-up' : (act.callType || 'Call');

                    return (
                      <div
                        key={act._id || act.id}
                        className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-200 hover:shadow-2xs transition space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              act.type === 'call' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              act.type === 'whatsapp' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                              act.type === 'email' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                              'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {act.type === 'call' && <Phone className="w-3 h-3" />}
                              {act.type === 'whatsapp' && <MessageSquare className="w-3 h-3" />}
                              {act.type === 'email' && <Mail className="w-3 h-3" />}
                              {act.type === 'task' && <Clock className="w-3 h-3" />}
                              <span className="capitalize">{channelLabel}</span>
                              {act.durationMinutes > 0 && <span className="font-normal opacity-75">({act.durationMinutes}m)</span>}
                            </span>

                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                              {outcomeText}
                            </span>
                          </div>

                          <span className="text-[11px] text-slate-400 font-medium">
                            {new Date(act.performedAt || act.createdAt).toLocaleString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Remark / Feedback Box */}
                        {act.type === 'email' ? (() => {
                          const email = parseEmailActivity(act);
                          return (
                            <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200/80 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-slate-900 text-xs truncate">
                                  {email.subject}
                                </p>
                                <span className="text-[10px] text-slate-500 font-medium shrink-0">To: {email.to}</span>
                              </div>
                              <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">
                                {email.cleanBody}
                              </p>
                              <div className="flex items-center justify-between pt-1 border-t border-sky-100">
                                <button
                                  type="button"
                                  onClick={() => setSelectedEmailActivity(act)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
                                >
                                  <Mail className="w-3 h-3" />
                                  <span>View Full Email Details</span>
                                  <ArrowUpRight className="w-3 h-3" />
                                </button>
                                <span className="text-[10px] text-slate-400">
                                  Sent by: <strong className="text-slate-600 font-semibold">{email.senderName}</strong>
                                </span>
                              </div>
                            </div>
                          );
                        })() : act.type === 'call' ? (
                          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-900 text-xs">
                                  {act.subject || 'Phone Call Outreach'}
                                </p>
                                <span className="text-[10px] text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md font-semibold">
                                  {act.callType || 'Cold Call'}
                                </span>
                                {act.durationMinutes > 0 && (
                                  <span className="text-[10px] text-slate-500 font-medium">({act.durationMinutes}m)</span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Target: <strong className="text-slate-700">{record.mobileNo || record.phone || 'Contact Phone'}</strong>
                              </span>
                            </div>
                            <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
                              {act.description || 'No detailed feedback notes recorded.'}
                            </p>
                            <div className="flex items-center justify-between pt-1 border-t border-emerald-100">
                              <button
                                type="button"
                                onClick={() => setSelectedCallActivity(act)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                              >
                                <Phone className="w-3 h-3" />
                                <span>View Call Details</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                              <span className="text-[10px] text-slate-400">
                                Logged by: <strong className="text-slate-600 font-semibold">{act.performedByName || 'Representative'}</strong>
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                            <p className="font-semibold text-slate-800 text-[11px] mb-0.5">
                              {act.subject || 'Outreach Discussion Notes'}
                            </p>
                            <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
                              {act.description || 'No detailed feedback provided.'}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                          <span>
                            Logged by: <strong className="text-slate-700">{act.performedByName || 'Representative'}</strong>
                          </span>
                          {record.nextFollowUpAt && act.type === 'task' && (
                            <span className="text-amber-700 font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Scheduled Follow-up
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Backend Pagination Controls */}
                  {paginationInfo.total > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-2 border-t border-slate-100 text-xs">
                      {/* Left: Entries counter */}
                      <div className="flex items-center gap-2 text-slate-500">
                        <span>
                          Showing <strong className="text-slate-800">{Math.min((currentPage - 1) * pageSize + 1, paginationInfo.total)}</strong> to{' '}
                          <strong className="text-slate-800">{Math.min(currentPage * pageSize, paginationInfo.total)}</strong> of{' '}
                          <strong className="text-slate-800">{paginationInfo.total}</strong> entries
                        </span>
                        {isLoadingTimeline && (
                          <span className="inline-block w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin ml-1" />
                        )}
                      </div>

                      {/* Right: Switcher (20, 50, 100) & Page Buttons */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Per page options: 20, 50, 100 */}
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200/80">
                          <span className="text-[11px] text-slate-500 font-medium px-1">Per page:</span>
                          {[20, 50, 100].map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => handlePageSizeChange(sz)}
                              disabled={isLoadingTimeline}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                                pageSize === sz
                                  ? 'bg-white text-indigo-700 shadow-2xs border border-indigo-200'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                              }`}
                            >
                              {sz}
                            </button>
                          ))}
                        </div>

                        {/* Pagination navigation buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1 || isLoadingTimeline}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                            title="Previous page"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          <div className="flex items-center gap-1">
                            {Array.from({ length: paginationInfo.totalPages || 1 }, (_, i) => i + 1)
                              .filter((p) => {
                                const totalP = paginationInfo.totalPages || 1;
                                if (p === 1 || p === totalP) return true;
                                return Math.abs(p - currentPage) <= 1;
                              })
                              .map((p, idx, arr) => {
                                const prev = arr[idx - 1];
                                const showEllipsisBefore = prev && p - prev > 1;

                                return (
                                  <React.Fragment key={p}>
                                    {showEllipsisBefore && (
                                      <span className="text-slate-400 px-1 text-xs">…</span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handlePageChange(p)}
                                      disabled={isLoadingTimeline}
                                      className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        currentPage === p
                                          ? 'bg-indigo-600 text-white shadow-2xs'
                                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      {p}
                                    </button>
                                  </React.Fragment>
                                );
                              })}
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= (paginationInfo.totalPages || 1) || isLoadingTimeline}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                            title="Next page"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            {/* Primary Contact Person Card */}
            <Card padding="lg" className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <User className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Key Contact Details</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Contact Person</span>
                  <p className="font-bold text-slate-900 text-sm">{record?.contactPerson || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Designation / Role</span>
                  <p className="font-semibold text-slate-700">{record?.designation || 'Decision Maker'}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Mobile Number</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-mono font-bold text-slate-800">{record?.mobileNo || '—'}</span>
                    {record?.mobileNo && (
                      <button
                        type="button"
                        onClick={() => handleOpenOutreach('call')}
                        className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                        title="Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Email Address</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-slate-700 font-medium truncate max-w-[180px]">{record?.emailId || record?.email || '—'}</span>
                    {(record?.emailId || record?.email) && (
                      <button
                        type="button"
                        onClick={() => handleOpenOutreach('email')}
                        className="p-1 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 transition cursor-pointer"
                        title="Email"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Outreach Status Card */}
            <Card padding="lg" className="space-y-3 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 border-indigo-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  Sales Telemetry
                </span>
                <span className="text-[10px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                  {totalTouches} Interactions
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <button
                  type="button"
                  onClick={() => handleChannelFilterChange(channelFilter === 'call' ? 'all' : 'call')}
                  className={`p-2 rounded-lg border shadow-2xs transition-all cursor-pointer text-center ${
                    channelFilter === 'call'
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:shadow-xs'
                  }`}
                  title="Click to view all calls"
                >
                  <p className="text-lg font-bold text-emerald-700">{callsCount}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Calls</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleChannelFilterChange(channelFilter === 'whatsapp' ? 'all' : 'whatsapp')}
                  className={`p-2 rounded-lg border shadow-2xs transition-all cursor-pointer text-center ${
                    channelFilter === 'whatsapp'
                      ? 'bg-teal-50 border-teal-400 ring-2 ring-teal-400 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:shadow-xs'
                  }`}
                  title="Click to view all WhatsApp"
                >
                  <p className="text-lg font-bold text-teal-700">{whatsAppCount}</p>
                  <p className="text-[10px] text-slate-500 font-medium">WhatsApp</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleChannelFilterChange(channelFilter === 'email' ? 'all' : 'email')}
                  className={`p-2 rounded-lg border shadow-2xs transition-all cursor-pointer text-center ${
                    channelFilter === 'email'
                      ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-400 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:shadow-xs'
                  }`}
                  title="Click to view all emails"
                >
                  <p className="text-lg font-bold text-sky-700">{emailsCount}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Emails</p>
                </button>
              </div>

              <div className="pt-2 text-xs space-y-1.5 text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Last Outcome:</span>
                  <span className="font-bold text-slate-900">{latestOutcome || 'No contact yet'}</span>
                </div>
                {latestRep && (
                  <div className="flex items-center justify-between">
                    <span>Contacted By:</span>
                    <span className="font-semibold text-indigo-700">{latestRep}</span>
                  </div>
                )}
                {latestDate && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Last Outreach:</span>
                    <span>{new Date(latestDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                {upcomingFollowUp && (
                  <div className="flex items-center justify-between text-amber-700 font-semibold bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Follow-up Due:
                    </span>
                    <span>{new Date(upcomingFollowUp.scheduledDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: TIMELINE */}
      {activeTab === 'timeline' && (
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Interaction & Outreach Timeline</h3>
              <p className="text-xs text-slate-500 mt-0.5">Chronological record of calls, messages, emails and outcomes</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" icon={Phone} onClick={() => handleOpenOutreach('call')}>
                Log Call
              </Button>
              <Button size="sm" icon={Plus} onClick={() => handleOpenOutreach('call')}>
                + Log Outreach
              </Button>
            </div>
          </div>

          {isLoadingTimeline ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading interactions...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2.5">
                <Phone className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-900">No outreach logged yet</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                Call, message on WhatsApp, or email this prospect to start qualifying their requirements.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button size="xs" onClick={() => handleOpenOutreach('call')}>
                  📞 Log 1st Call
                </Button>
                <Button size="xs" variant="secondary" onClick={() => handleOpenOutreach('whatsapp')}>
                  💬 Send WhatsApp
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activities.map((act) => (
                <div key={act._id || act.id} className="py-3.5 flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                      act.type === 'call'
                        ? 'bg-emerald-50 text-emerald-600'
                        : act.type === 'whatsapp'
                        ? 'bg-teal-50 text-teal-600'
                        : act.type === 'email'
                        ? 'bg-sky-50 text-sky-600'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    {act.type === 'call' ? (
                      <Phone className="w-4 h-4" />
                    ) : act.type === 'whatsapp' ? (
                      <MessageSquare className="w-4 h-4" />
                    ) : act.type === 'email' ? (
                      <Mail className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>
                  {act.type === 'email' ? (() => {
                    const email = parseEmailActivity(act);
                    const isFocused = highlightedActivityId === (act._id || act.id);
                    return (
                      <div className="min-w-0 flex-1 text-xs space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-900 text-xs">{email.subject}</p>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {email.status}
                            </span>
                            {isFocused && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 animate-pulse">
                                Selected Email
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(email.sentAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Recipient & Body Preview Card */}
                        <div className={`p-3 rounded-xl border transition space-y-2 ${isFocused ? 'bg-sky-50/90 border-sky-300 ring-2 ring-sky-400/50 shadow-xs' : 'bg-slate-50/80 border-slate-200'}`}>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-1 border-b border-slate-200/60 pb-1.5">
                            <span>
                              To: <strong className="text-slate-800 font-semibold">{email.to}</strong>
                            </span>
                            <span>
                              Sent by: <strong className="text-slate-700 font-semibold">{email.senderName}</strong>
                            </span>
                          </div>

                          <p className="text-slate-700 text-xs leading-relaxed line-clamp-3 font-sans">
                            {email.cleanBody}
                          </p>

                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => setSelectedEmailActivity(act)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-sky-50 text-[11px] font-bold text-sky-700 hover:text-sky-900 border border-slate-200 shadow-2xs transition cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5 text-sky-600" />
                              <span>View Full Email & Details</span>
                              <ArrowUpRight className="w-3 h-3 text-sky-500" />
                            </button>
                            {act.durationMinutes > 0 && (
                              <span className="text-[10px] text-slate-400">Duration: {act.durationMinutes}m</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="min-w-0 flex-1 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900">{act.subject || `${act.type?.toUpperCase()} Activity`}</p>
                        {act.outcome && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              act.outcome.includes('Interested')
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : act.outcome.includes('Callback')
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {act.outcome}
                          </span>
                        )}
                        {act.callType && <span className="text-slate-400 font-medium">({act.callType})</span>}
                      </div>

                      {act.description && (
                        <p className="text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">{act.description}</p>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1.5">
                        <span>{new Date(act.performedAt || act.createdAt).toLocaleString()}</span>
                        <span>•</span>
                        <span>By <strong className="text-slate-600">{act.performedByName || 'Rep'}</strong></span>
                        {act.durationMinutes > 0 && (
                          <>
                            <span>•</span>
                            <span>Duration: {act.durationMinutes}m</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: TASKS & FOLLOW-UPS */}
      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scheduled Follow-ups Card */}
          <Card padding="lg" className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Scheduled Follow-ups</h3>
                <p className="text-xs text-slate-500 mt-0.5">Upcoming sales callbacks and meetings</p>
              </div>
              <Button size="sm" variant="outline" icon={Plus} onClick={() => handleOpenOutreach('followup')}>
                Schedule
              </Button>
            </div>

            <div className="space-y-2.5">
              {followUps.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-800">No scheduled callbacks</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Schedule a callback to ensure timely re-engagement.</p>
                  <Button size="xs" className="mt-3" onClick={() => handleOpenOutreach('followup')}>
                    + Schedule Follow-up
                  </Button>
                </div>
              ) : (
                followUps.map((f) => (
                  <div
                    key={f._id || f.id}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900">{f.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(f.scheduledDate).toLocaleString()} • {f.type || 'Call'}
                        </p>
                        {f.notes && <p className="text-slate-600 mt-1 italic">{f.notes}</p>}
                      </div>
                    </div>
                    <Badge variant={f.status === 'completed' ? 'emerald' : 'amber'} size="sm">
                      {f.status || 'Pending'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Associated Tasks Card */}
          <Card padding="lg" className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Prospect To-Dos & Tasks</h3>
                <p className="text-xs text-slate-500 mt-0.5">Deliverables, proposal drafts, research items</p>
              </div>
              <Button size="sm" icon={Plus} onClick={() => setIsTaskModalOpen(true)}>
                Add Task
              </Button>
            </div>

            <div className="space-y-2.5">
              {tasks.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-800">No active tasks</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Create to-dos to keep deal prep organized.</p>
                  <Button size="xs" className="mt-3" onClick={() => setIsTaskModalOpen(true)}>
                    + Create First Task
                  </Button>
                </div>
              ) : (
                tasks.map((t) => {
                  const isCompleted = t.status === 'Completed';
                  return (
                    <div
                      key={t._id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                        isCompleted ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-slate-200/80 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleTaskStatus(t._id)}
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer shrink-0 ${
                            isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                        </button>
                        <div className="min-w-0 pr-2">
                          <p className={`font-bold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {t.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                            <span>Due: {t.dueDate}</span>
                            <span>•</span>
                            <span className="font-semibold text-indigo-600">{t.priority}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(t._id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: PERFORMANCE & TELEMETRY */}
      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card padding="md" className="space-y-1 bg-indigo-50/40 border-indigo-100">
            <span className="text-xs font-semibold text-indigo-700">Total Outreach Touches</span>
            <p className="text-2xl font-black text-indigo-950">{totalTouches}</p>
            <p className="text-[10px] text-slate-500">All channels combined</p>
          </Card>
          <Card padding="md" className="space-y-1 bg-emerald-50/40 border-emerald-100">
            <span className="text-xs font-semibold text-emerald-700">Phone Calls</span>
            <p className="text-2xl font-black text-emerald-950">{callsCount}</p>
            <p className="text-[10px] text-slate-500">Logged call attempts & pitches</p>
          </Card>
          <Card padding="md" className="space-y-1 bg-teal-50/40 border-teal-100">
            <span className="text-xs font-semibold text-teal-700">WhatsApp Messages</span>
            <p className="text-2xl font-black text-teal-950">{whatsAppCount}</p>
            <p className="text-[10px] text-slate-500">Decks & follow-ups sent</p>
          </Card>
          <Card padding="md" className="space-y-1 bg-sky-50/40 border-sky-100">
            <span className="text-xs font-semibold text-sky-700">Emails Sent</span>
            <p className="text-2xl font-black text-sky-950">{emailsCount}</p>
            <p className="text-[10px] text-slate-500">Proposals & formal notes</p>
          </Card>
        </div>
      )}

      {/* Outreach Action Modal */}
      {isOutreachOpen && (
        <LogOutreachModal
          isOpen={isOutreachOpen}
          onClose={() => setIsOutreachOpen(false)}
          row={record}
          initialType={outreachType}
          onSuccess={handleOutreachSuccess}
        />
      )}

      {/* Direct Sales Email Composer Modal */}
      {isMailComposerOpen && (
        <CrmMailComposerModal
          isOpen={isMailComposerOpen}
          onClose={() => setIsMailComposerOpen(false)}
          row={record}
          onSuccess={handleOutreachSuccess}
        />
      )}

      {/* Task Creation Modal */}
      {isTaskModalOpen && (
        <Modal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          title="Create Prospect Task"
          subtitle={`Assign a to-do for ${record.companyName || 'this prospect'}`}
        >
          <form onSubmit={handleCreateTask} className="space-y-4 pt-2">
            <Input
              label="Task Title *"
              required
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              placeholder="e.g. Prepare customized quotation for HRMS modules"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <Select
                label="Priority"
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                options={[
                  { value: 'Low', label: 'Low' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'High', label: 'High' },
                  { value: 'Urgent', label: 'Urgent' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Description</label>
              <textarea
                rows={3}
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Include background context or specific instructions..."
                className="w-full p-2.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setIsTaskModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Create Task
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Full Email Details Modal */}
      {selectedEmailActivity && (() => {
        const email = parseEmailActivity(selectedEmailActivity);
        if (!email) return null;

        const handleCopyEmail = () => {
          navigator.clipboard.writeText(`Subject: ${email.subject}\nTo: ${email.to}\n\n${email.cleanBody}`);
          setCopiedEmailText(true);
          toast.success('Email contents copied to clipboard');
          setTimeout(() => setCopiedEmailText(false), 2000);
        };

        return (
          <Modal
            isOpen={Boolean(selectedEmailActivity)}
            onClose={() => setSelectedEmailActivity(null)}
            title="Full Email Communication"
            subtitle={`Company: ${record.companyName || 'Prospect'} • Sales Interaction Record`}
            maxWidth="max-w-2xl"
            footer={
              <div className="flex items-center justify-between w-full">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyEmail}
                  icon={copiedEmailText ? Check : Copy}
                >
                  {copiedEmailText ? 'Copied' : 'Copy Content'}
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedEmailActivity(null)}
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedEmailActivity(null);
                      handleOpenOutreach('email');
                    }}
                    icon={Send}
                  >
                    Reply / Follow-up
                  </Button>
                </div>
              </div>
            }
          >
            <div className="space-y-4">
              {/* Header Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50/70 via-white to-slate-50 border border-sky-100/90 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 leading-snug break-words">
                        {email.subject}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(email.sentAt).toLocaleString('en-IN', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {email.status}
                  </span>
                </div>

                {/* Metadata Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-sky-100/80 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">From (Sender)</span>
                    <p className="font-bold text-slate-800 text-xs mt-0.5">
                      {email.senderName}
                      {email.senderEmail && <span className="font-normal text-slate-500 ml-1">({email.senderEmail})</span>}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">To (Recipient)</span>
                    <p className="font-bold text-slate-800 text-xs mt-0.5 break-words">
                      {email.recipientName ? `${email.recipientName} ` : ''}
                      <span className="font-semibold text-sky-700">&lt;{email.to}&gt;</span>
                    </p>
                  </div>

                  {(email.cc || email.bcc) && (
                    <div className="sm:col-span-2 p-2.5 rounded-xl bg-white border border-slate-200/80 flex gap-4 text-xs">
                      {email.cc && (
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">CC</span>
                          <span className="text-slate-700">{email.cc}</span>
                        </div>
                      )}
                      {email.bcc && (
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">BCC</span>
                          <span className="text-slate-700">{email.bcc}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Message Body Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Full Email Message Content
                  </span>
                  {email.htmlBody && (
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px]">
                      <button
                        type="button"
                        onClick={() => setEmailViewMode('html')}
                        className={`px-2 py-0.5 rounded-md font-semibold transition ${emailViewMode === 'html' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                      >
                        Formatted View
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailViewMode('text')}
                        className={`px-2 py-0.5 rounded-md font-semibold transition ${emailViewMode === 'text' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                      >
                        Plain Text
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 leading-relaxed shadow-2xs max-h-80 overflow-y-auto">
                  {email.htmlBody && emailViewMode === 'html' ? (
                    <div
                      className="prose prose-xs max-w-none text-slate-800 space-y-2 font-sans"
                      dangerouslySetInnerHTML={{ __html: email.htmlBody }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap font-sans text-slate-800">
                      {email.cleanBody}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}
      {/* Full Call Details Modal */}
      {selectedCallActivity && (
        <Modal
          isOpen={Boolean(selectedCallActivity)}
          onClose={() => setSelectedCallActivity(null)}
          title="Phone Call Details"
          subtitle={`Company: ${record.companyName || 'Prospect'} • Call Interaction Record`}
          maxWidth="max-w-xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedCallActivity(null)}
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedCallActivity(null);
                  handleOpenOutreach('call');
                }}
                icon={Phone}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Call Again
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Header Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 border border-emerald-100/90 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 leading-snug break-words">
                      {selectedCallActivity.subject || 'Phone Call Outreach'}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(selectedCallActivity.performedAt || selectedCallActivity.createdAt).toLocaleString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {selectedCallActivity.outcome || 'Completed'}
                </span>
              </div>

              {/* Call Metadata Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-emerald-100/80 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Call Type</span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">
                    {selectedCallActivity.callType || 'Cold Call'}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Duration</span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">
                    {selectedCallActivity.durationMinutes ? `${selectedCallActivity.durationMinutes} minutes` : '0 min (Logged)'}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Representative</span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">
                    {selectedCallActivity.performedByName || (selectedCallActivity.performedBy ? `${selectedCallActivity.performedBy.firstName || ''} ${selectedCallActivity.performedBy.lastName || ''}`.trim() : '') || 'Representative'}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Target Phone</span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">
                    {record.mobileNo || record.phone || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Conversation Feedback / Remarks */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Call Remarks & Client Feedback
              </span>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 leading-relaxed shadow-2xs">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {selectedCallActivity.description || 'No detailed feedback provided for this call.'}
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
