import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eye,
  FileText,
  Filter,
  History,
  Mail,
  Paperclip,
  RefreshCw,
  RotateCw,
  Search,
  Send,
  User,
  Users,
  X,
  XCircle
} from 'lucide-react';
import api from '@/lib/apiClient';
import socket from '@/lib/socket';
import toast from 'react-hot-toast';
import Skeleton from '@/components/ui/Skeleton';
import { format } from 'date-fns';

const statusBadge = (status) => {
  switch (status) {
    case 'Sent':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Failed':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'Pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

const templateBadgeColor = (templateName = '') => {
  const lower = templateName.toLowerCase();
  if (lower.includes('jd') || lower.includes('job description')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (lower.includes('interview')) return 'bg-purple-50 text-purple-700 border-purple-200';
  if (lower.includes('offer')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (lower.includes('reject')) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-sky-50 text-sky-700 border-sky-200';
};

const getRecipientDisplayName = (log) => {
  if (!log) return 'Candidate';

  if (log.candidateId && typeof log.candidateId === 'object') {
    if (log.candidateId.candidateName && typeof log.candidateId.candidateName === 'string' && !log.candidateId.candidateName.includes('@')) {
      return log.candidateId.candidateName.trim();
    }
    const fullName = `${log.candidateId.firstName || ''} ${log.candidateId.lastName || ''}`.trim();
    if (fullName) return fullName;
  }

  if (log.recipientName && typeof log.recipientName === 'string' && !log.recipientName.includes('@')) {
    return log.recipientName.trim();
  }

  const email = log.recipientEmail || (log.candidateId && typeof log.candidateId === 'object' ? log.candidateId.email : '');
  if (email && typeof email === 'string' && email.includes('@')) {
    const userPart = email.split('@')[0];
    const cleanName = userPart
      .replace(/[._\-+]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      .trim();
    if (cleanName) return cleanName;
  }

  return 'Candidate';
};

const formatRequisitionOptionLabel = (req) => {
  if (!req) return '';
  const title = req.roleDetails?.title || req.roleDetails?.jobTitle || req.requestId || 'Untitled Position';
  const clientName = req.client || 'Internal';
  const reqCode = req.requestId ? ` - ${req.requestId}` : '';

  const isClosed = req.status === 'Closed';
  let dateStr = null;

  if (req.closedAt) {
    try {
      dateStr = format(new Date(req.closedAt), 'dd MMM yyyy');
    } catch (e) {
      dateStr = null;
    }
  } else if (isClosed && req.updatedAt) {
    try {
      dateStr = format(new Date(req.updatedAt), 'dd MMM yyyy');
    } catch (e) {
      dateStr = null;
    }
  }

  const prevClosedAt = req.previousRequestId?.closedAt || (req.previousRequestId?.status === 'Closed' ? req.previousRequestId?.updatedAt : null);
  let prevDateStr = null;
  if (prevClosedAt) {
    try {
      prevDateStr = format(new Date(prevClosedAt), 'dd MMM yyyy');
    } catch (e) {
      prevDateStr = null;
    }
  }

  let statusBadge = '';
  if (isClosed) {
    statusBadge = dateStr ? ` [Closed: ${dateStr}]` : ' [Closed]';
    if (req.reopenedToId) {
      statusBadge += ' (Reopened)';
    }
  } else if (req.previousRequestId) {
    statusBadge = prevDateStr ? ` [Reopened | Prev Closed: ${prevDateStr}]` : ' [Reopened]';
  }

  return `${title} (${clientName})${statusBadge}${reqCode}`;
};

const resolveAttachmentUrl = (urlOrPath) => {
  if (!urlOrPath) return '';
  const str = String(urlOrPath).trim();
  if (!str || str === '#') return '';
  if (/^https?:\/\//i.test(str) || str.startsWith('blob:')) {
    return str;
  }
  const cleanPath = str.startsWith('/') ? str.substring(1) : str;
  let backendOrigin = '';
  const apiBase = api.defaults?.baseURL || '';
  if (/^https?:\/\//i.test(apiBase)) {
    try {
      const urlObj = new URL(apiBase);
      backendOrigin = urlObj.origin;
    } catch (e) {
      backendOrigin = window.location.origin;
    }
  } else {
    backendOrigin = window.location.origin;
  }
  return `${backendOrigin}/${cleanPath}`;
};

const TAEmailHistory = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequisition, setSelectedRequisition] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState('All');

  // Server-side pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50); // Default 50 items per page
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });

  const [requisitionOptions, setRequisitionOptions] = useState([]);
  const [templateOptions, setTemplateOptions] = useState([]);

  // Full Email Inspection Modal State
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [emailDetail, setEmailDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [viewTab, setViewTab] = useState('preview'); // 'preview' | 'raw'
  const [resendingId, setResendingId] = useState(null);

  const fetchRequisitions = useCallback(async () => {
    try {
      const res = await api.get('/ta/hiring-request?limit=100');
      const list = res.data?.requests || res.data || [];
      setRequisitionOptions(list);
    } catch (err) {
      console.error('Failed to fetch requisitions for filter:', err);
    }
  }, []);

  const fetchEmailHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search: searchQuery.trim() || undefined,
        hiringRequestId: selectedRequisition !== 'All' ? selectedRequisition : undefined,
        status: selectedStatus !== 'All' ? selectedStatus : undefined,
        templateName: selectedTemplate !== 'All' ? selectedTemplate : undefined
      };

      const res = await api.get('/ta/email-history', { params });
      const fetchedLogs = res.data?.logs || [];
      setLogs(fetchedLogs);
      setPagination(res.data?.pagination || { total: 0, page: 1, limit, totalPages: 1 });

      const templatesSet = new Set(fetchedLogs.map((item) => item.templateName).filter(Boolean));
      setTemplateOptions((prev) => Array.from(new Set([...prev, ...Array.from(templatesSet)])));
    } catch (err) {
      console.error('Failed to fetch TA email history:', err);
      toast.error('Failed to load email history');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, selectedRequisition, selectedStatus, selectedTemplate]);

  useEffect(() => {
    fetchRequisitions();
  }, [fetchRequisitions]);

  useEffect(() => {
    fetchEmailHistory();
  }, [fetchEmailHistory]);

  useEffect(() => {
    const handleLiveLog = (data) => {
      if (data?.log) {
        setLogs((prevLogs) => {
          if (prevLogs.some((item) => String(item._id) === String(data.log._id))) {
            return prevLogs;
          }
          return [data.log, ...prevLogs];
        });
        setPagination((prev) => ({ ...prev, total: (prev.total || 0) + 1 }));
      }
    };

    const handleBatchComplete = () => {
      fetchEmailHistory();
    };

    socket.on('ta_email_logged', handleLiveLog);
    socket.on('ta_email_batch_completed', handleBatchComplete);

    return () => {
      socket.off('ta_email_logged', handleLiveLog);
      socket.off('ta_email_batch_completed', handleBatchComplete);
    };
  }, [fetchEmailHistory]);

  const handleOpenEmailDetail = async (logId) => {
    try {
      setSelectedEmailId(logId);
      setLoadingDetail(true);
      setViewTab('preview');
      const res = await api.get(`/ta/email-history/${logId}`);
      setEmailDetail(res.data);
    } catch (err) {
      console.error('Failed to load email details:', err);
      toast.error('Failed to load full email content');
      setSelectedEmailId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCopyEmail = (email) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    toast.success(`Copied ${email} to clipboard!`);
  };

  const handleResendEmail = async (log) => {
    if (!log) return;
    const recipientName = getRecipientDisplayName(log);
    const recipientEmail = log.recipientEmail || log.candidateId?.email || 'the candidate';

    const confirmed = window.confirm(
      `Are you sure you want to resend this email to ${recipientName} (${recipientEmail})?\n\nSubject: ${log.subject || 'No Subject'}`
    );
    if (!confirmed) return;

    try {
      setResendingId(log._id);
      const res = await api.post(`/ta/email-history/${log._id}/resend`, {});
      toast.success(res.data?.message || `Email resent successfully to ${recipientEmail}`);
      fetchEmailHistory();
      if (selectedEmailId === log._id) {
        handleOpenEmailDetail(log._id);
      }
    } catch (err) {
      console.error('Failed to resend email:', err);
      toast.error(err.response?.data?.message || 'Failed to resend email');
    } finally {
      setResendingId(null);
    }
  };

  const handleDownloadAttachment = async (logId, attachmentIndex, filename, directUrl) => {
    try {
      if (directUrl && (directUrl.startsWith('http://') || directUrl.startsWith('https://'))) {
        window.open(directUrl, '_blank');
        return;
      }

      toast.loading('Preparing download...', { id: 'att-download' });
      const response = await api.get(`/ta/email-history/${logId}/attachment/${attachmentIndex}`, {
        responseType: 'blob'
      });

      toast.dismiss('att-download');

      if (response.data?.type === 'application/json') {
        const text = await response.data.text();
        try {
          const parsed = JSON.parse(text);
          toast.error(parsed.message || 'Failed to download attachment');
          return;
        } catch (e) {
          // ignore
        }
      }

      const blob = new Blob([response.data]);
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename || 'attachment');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Download started!');
    } catch (error) {
      toast.dismiss('att-download');
      console.error('Download attachment failed', error);
      let errorMsg = 'Failed to download attachment file';
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text);
          errorMsg = parsed.message || errorMsg;
        } catch (e) {
          // ignore
        }
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      toast.error(errorMsg);
    }
  };

  const totalLogs = pagination.total || logs.length;
  const sentCount = logs.filter((log) => log.status === 'Sent').length;
  const failedCount = logs.filter((log) => log.status === 'Failed').length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-100/70 text-blue-600 rounded-xl">
              <History size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">TA Email History</h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Full logs of all recruitment emails sent to candidates, templates used, and delivery statuses.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchEmailHistory}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh History
          </button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Email Logs</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{totalLogs}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Mail size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sent (Current Page)</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{sentCount}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Failed (Current Page)</p>
            <h3 className="text-2xl font-extrabold text-rose-600 mt-1">{failedCount}</h3>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
          {/* Search Box */}
          <div className="relative md:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by candidate name, email, subject, template..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Requisition Filter */}
          <div>
            <select
              value={selectedRequisition}
              onChange={(e) => {
                setSelectedRequisition(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="All">All Requisitions</option>
              {requisitionOptions.map((req) => (
                <option key={req._id} value={req._id}>
                  {formatRequisitionOptionLabel(req)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="Sent">Sent</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          {/* Template Filter */}
          <div>
            <select
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="All">All Templates</option>
              {templateOptions.map((tmpl) => (
                <option key={tmpl} value={tmpl}>{tmpl}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Per-Candidate Email Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="mx-auto text-slate-300 mb-3" size={48} />
            <h3 className="text-base font-bold text-slate-800">No Email History Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Emails sent to candidates from mass mailings or TA notifications will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Candidate (Recipient)</th>
                  <th className="py-3.5 px-4">Template Used</th>
                  <th className="py-3.5 px-4">Requisition & Subject</th>
                  <th className="py-3.5 px-4">Sender / From</th>
                  <th className="py-3.5 px-4">Date & Time Sent</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Recipient Candidate */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">
                          {getRecipientDisplayName(log)}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[11px] text-slate-500">{log.recipientEmail || log.candidateId?.email || '-'}</span>
                          {log.recipientEmail && (
                            <button
                              onClick={() => handleCopyEmail(log.recipientEmail)}
                              className="text-slate-400 hover:text-blue-600 transition-colors"
                              title="Copy Email"
                            >
                              <Copy size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Template Name */}
                    <td className="py-3.5 px-4 align-top">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${templateBadgeColor(log.templateName)}`}>
                        {log.templateName || 'General Mail'}
                      </span>
                    </td>

                    {/* Requisition & Subject */}
                    <td className="py-3.5 px-4 align-top max-w-xs">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 line-clamp-1">{log.subject || 'No Subject'}</p>
                        {log.hiringRequestTitle && (
                          <p className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                            <FileText size={12} /> {log.hiringRequestTitle}
                          </p>
                        )}
                        {log.batchTotalCount > 1 && (
                          <span className="inline-block text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 mr-1">
                            Mass Mail Batch ({log.batchTotalCount} Recipients)
                          </span>
                        )}
                        {Array.isArray(log.attachments) && log.attachments.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Paperclip size={11} /> {log.attachments.length} Attachment(s)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Sender */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex flex-col text-[11px]">
                        <span className="font-bold text-slate-800">
                          {log.senderName || log.sentBy?.firstName ? `${log.sentBy?.firstName || ''} ${log.sentBy?.lastName || ''}`.trim() : 'Recruiter'}
                        </span>
                        <span className="text-slate-400">{log.senderEmail || log.sentBy?.email || 'System'}</span>
                      </div>
                    </td>

                    {/* Date & Time Sent */}
                    <td className="py-3.5 px-4 align-top text-slate-500 text-[11px]">
                      <div className="flex items-center gap-1">
                        <Clock size={13} className="text-slate-400" />
                        <span>{log.sentAt ? format(new Date(log.sentAt), 'MMM dd, yyyy hh:mm a') : '-'}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 align-top text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadge(log.status)}`}>
                        {log.status === 'Sent' && <CheckCircle2 size={12} />}
                        {log.status === 'Failed' && <XCircle size={12} />}
                        {log.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 align-top text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEmailDetail(log._id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 font-bold rounded-lg text-xs transition-all shadow-2xs cursor-pointer"
                          title="View Full Email"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          onClick={() => handleResendEmail(log)}
                          disabled={resendingId === log._id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-bold rounded-lg text-xs transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                          title="Resend Email to Candidate"
                        >
                          <RotateCw size={13} className={resendingId === log._id ? 'animate-spin' : ''} />
                          {resendingId === log._id ? 'Resending...' : 'Resend'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination & Load Control Footer */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1 text-xs font-bold border border-slate-200 text-slate-700 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              >
                <option value={50}>Show 50 per page</option>
                <option value={100}>Show 100 per page</option>
                <option value={150}>Show 150 per page</option>
              </select>
            </div>
            <span className="text-slate-300">|</span>
            <span>
              Showing Page <span className="font-bold text-slate-800">{pagination.page}</span> of <span className="font-bold text-slate-800">{pagination.totalPages}</span> ({pagination.total} total logs)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1"
            >
              <ChevronLeft size={15} /> Previous
            </button>

            <span className="text-xs font-bold text-slate-700 px-2 py-1 bg-white border border-slate-200 rounded-lg">
              {page} / {pagination.totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1"
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Full Email Inspection Modal */}
      {selectedEmailId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div>
                <h3 className="text-base font-bold text-slate-900">Full Email Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Logged email communication sent to candidate.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedEmailId(null);
                  setEmailDetail(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-8 space-y-4">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            ) : emailDetail ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Meta Header Card */}
                <div className="p-5 bg-slate-50/50 border-b border-slate-100 space-y-3 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recipient (To)</p>
                      <p className="font-bold text-slate-900 mt-0.5">{getRecipientDisplayName(emailDetail)}</p>
                      <p className="text-slate-500">{emailDetail.recipientEmail}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sender (From)</p>
                      <p className="font-bold text-slate-900 mt-0.5">{emailDetail.senderName || 'Recruiter'}</p>
                      <p className="text-slate-500">{emailDetail.senderEmail || 'System'}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Template</p>
                      <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded text-[11px] font-bold border ${templateBadgeColor(emailDetail.templateName)}`}>
                        {emailDetail.templateName || 'General Mail'}
                      </span>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date & Time</p>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {emailDetail.sentAt ? format(new Date(emailDetail.sentAt), 'MMM dd, yyyy hh:mm a') : '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                      <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(emailDetail.status)}`}>
                        {emailDetail.status}
                      </span>
                    </div>
                  </div>

                  {emailDetail.hiringRequestTitle && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Requisition</p>
                      <p className="font-bold text-blue-700">{emailDetail.hiringRequestTitle}</p>
                    </div>
                  )}

                  {(emailDetail.cc || emailDetail.bcc) && (
                    <div className="pt-2 border-t border-slate-200/60 flex items-center gap-4 text-[11px] text-slate-500">
                      {emailDetail.cc && <span><strong className="text-slate-700">CC:</strong> {emailDetail.cc}</span>}
                      {emailDetail.bcc && <span><strong className="text-slate-700">BCC:</strong> {emailDetail.bcc}</span>}
                    </div>
                  )}

                  {Array.isArray(emailDetail.attachments) && emailDetail.attachments.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                        <Paperclip size={12} /> Attachments ({emailDetail.attachments.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {emailDetail.attachments.map((att, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleDownloadAttachment(selectedEmailId, idx, att.filename, att.url || att.path)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 text-slate-800 rounded-xl text-xs font-semibold shadow-2xs transition-all hover:bg-blue-50/50 hover:text-blue-600 cursor-pointer"
                          >
                            <FileText size={14} className="text-blue-500" />
                            <span className="max-w-[200px] truncate">{att.filename || 'Attachment'}</span>
                            {att.size > 0 && <span className="text-[10px] text-slate-400">({(att.size / 1024).toFixed(1)} KB)</span>}
                            <Download size={13} className="text-blue-600 ml-1" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Subject Header */}
                <div className="px-5 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Subject: <span className="font-semibold text-slate-800">{emailDetail.subject}</span>
                  </h4>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setViewTab('preview')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        viewTab === 'preview' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Rendered HTML
                    </button>
                    <button
                      onClick={() => setViewTab('raw')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        viewTab === 'raw' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Raw Text
                    </button>
                  </div>
                </div>

                {/* Email Body Container */}
                <div className="p-5 flex-1 overflow-y-auto bg-slate-50">
                  {viewTab === 'preview' ? (
                    <div
                      className="bg-white p-6 rounded-xl border border-slate-200 text-slate-800 text-xs leading-relaxed max-w-none shadow-2xs overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: emailDetail.body || '<p class="text-slate-400">No email body content available.</p>' }}
                    />
                  ) : (
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                      {emailDetail.body || 'No raw text content available.'}
                    </pre>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Failed to load email details.
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Email Log ID: {selectedEmailId}
              </span>
              <div className="flex items-center gap-2">
                {emailDetail && (
                  <button
                    onClick={() => handleResendEmail(emailDetail)}
                    disabled={resendingId === emailDetail._id}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCw size={14} className={resendingId === emailDetail._id ? 'animate-spin' : ''} />
                    {resendingId === emailDetail._id ? 'Resending...' : 'Resend Email'}
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedEmailId(null);
                    setEmailDetail(null);
                  }}
                  className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TAEmailHistory;
