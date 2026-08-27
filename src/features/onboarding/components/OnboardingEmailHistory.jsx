import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Users,
  Paperclip,
  Calendar,
  Search,
  RefreshCw,
  Eye,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
  Copy,
  Check,
  Send,
  Clock,
  RotateCw,
  ExternalLink,
  Edit3,
  Undo2,
  Code
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/apiClient';
import Skeleton from '@/components/ui/Skeleton';

const getTemplateBadgeStyle = (templateName = '') => {
  const name = (templateName || '').toLowerCase();
  if (name.includes('pre-onboard') || name.includes('invitation')) {
    return { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' };
  }
  if (name.includes('custom') || name.includes('document')) {
    return { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' };
  }
  if (name.includes('update') || name.includes('correction') || name.includes('flag')) {
    return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
  }
  if (name.includes('welcome') || name.includes('activation') || name.includes('active')) {
    return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
  }
  return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
};

const htmlToPlainText = (html = '') => {
  if (!html) return '';
  let str = String(html);
  
  // Remove script and style tags
  str = str.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  str = str.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Convert breaks and block elements to newlines
  str = str.replace(/<br\s*[\/]?>/gi, '\n');
  str = str.replace(/<\/td>\s*<td[^>]*>/gi, '   ');
  str = str.replace(/<\/(p|div|tr|h[1-6]|li|blockquote|table|section|header|footer)>/gi, '\n\n');
  str = str.replace(/<li[^>]*>/gi, '• ');
  
  // Strip all remaining HTML tags
  str = str.replace(/<[^>]+>/g, '');
  
  // Decode common HTML entities
  str = str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
    
  // Normalize whitespace: clean trailing spaces on lines and limit to 2 consecutive newlines
  const lines = str.split('\n').map(l => l.trimEnd());
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

const plainTextToHtml = (text = '') => {
  if (!text) return '';
  const lines = text.split('\n');
  
  const paragraphs = [];
  let currentP = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentP.length > 0) {
        paragraphs.push(currentP.join('<br/>'));
        currentP = [];
      }
    } else {
      currentP.push(trimmed);
    }
  });
  if (currentP.length > 0) {
    paragraphs.push(currentP.join('<br/>'));
  }

  const formattedContent = paragraphs.map(p => {
    return `<p style="margin: 0 0 14px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">${p}</p>`;
  }).join('\n');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <tr>
    <td>
      ${formattedContent}
    </td>
  </tr>
</table>`;
};

export const OnboardingEmailHistory = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSent: 0,
    candidatesReached: 0,
    emailsWithAttachments: 0,
    sentThisMonth: 0
  });
  const [templates, setTemplates] = useState([]);
  
  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Email Detail Modal State & Resend State
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalTab, setModalTab] = useState('email'); // 'email', 'metadata', 'edit'
  const [senderAccounts, setSenderAccounts] = useState([]);
  const [editForm, setEditForm] = useState({
    recipientEmail: '',
    subject: '',
    body: '',
    cc: '',
    bcc: '',
    emailAccountId: 'platform'
  });
  const [plainTextBody, setPlainTextBody] = useState('');
  const [editViewMode, setEditViewMode] = useState('plaintext'); // 'plaintext', 'html', 'preview'
  const [copiedField, setCopiedField] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [isSendingUpdate, setIsSendingUpdate] = useState(false);

  const fetchEmailHistory = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const params = {
        page,
        limit,
        search: searchTerm.trim() || undefined,
        templateName: selectedTemplate !== 'All' ? selectedTemplate : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      const response = await api.get('/onboarding/email-history', { params });
      if (response.data) {
        setLogs(response.data.logs || []);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages || 1);
          setTotalCount(response.data.pagination.total || 0);
        }
        if (response.data.stats) {
          setStats(response.data.stats);
        }
        if (response.data.templates) {
          setTemplates(response.data.templates);
        }
      }
    } catch (error) {
      console.error('Failed to fetch onboarding email history:', error);
      toast.error('Failed to load email history.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, selectedTemplate, startDate, endDate]);

  useEffect(() => {
    fetchEmailHistory();
  }, [fetchEmailHistory]);

  useEffect(() => {
    const fetchSenderAccounts = async () => {
      try {
        const res = await api.get('/email-settings/senders');
        if (res.data) {
          const accountsList = [];
          if (res.data.platformOption) {
            accountsList.push({
              _id: 'platform',
              name: res.data.platformOption.name || 'TalentCIO Platform',
              fromAddress: res.data.platformOption.fromAddress || 'no-reply@talentcio.in',
              fromName: res.data.platformOption.fromName || 'TalentCIO'
            });
          }
          if (Array.isArray(res.data.accounts)) {
            res.data.accounts.forEach((acc) => {
              if (acc._id !== 'platform') {
                accountsList.push(acc);
              }
            });
          }
          setSenderAccounts(accountsList);
        }
      } catch (err) {
        console.warn('Could not fetch email senders:', err);
        setSenderAccounts([
          { _id: 'platform', name: 'TalentCIO Platform', fromAddress: 'no-reply@talentcio.in' }
        ]);
      }
    };
    fetchSenderAccounts();
  }, []);

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedTemplate('All');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handlePlainTextChange = (newText) => {
    setPlainTextBody(newText);
    const convertedHtml = plainTextToHtml(newText);
    setEditForm(prev => ({ ...prev, body: convertedHtml }));
  };

  const handleHtmlChange = (newHtml) => {
    setEditForm(prev => ({ ...prev, body: newHtml }));
    setPlainTextBody(htmlToPlainText(newHtml));
  };

  const handleOpenLog = (log, defaultTab = 'email') => {
    setSelectedLog(log);
    setModalTab(defaultTab);
    const initialBody = log.body || '';
    setEditForm({
      recipientEmail: log.recipientEmail || '',
      subject: log.subject || '',
      body: initialBody,
      cc: log.cc || '',
      bcc: log.bcc || '',
      emailAccountId: log.emailAccountId || 'platform'
    });
    setPlainTextBody(htmlToPlainText(initialBody));
    setEditViewMode('plaintext');
  };

  const handleResetEditForm = () => {
    if (!selectedLog) return;
    const initialBody = selectedLog.body || '';
    setEditForm({
      recipientEmail: selectedLog.recipientEmail || '',
      subject: selectedLog.subject || '',
      body: initialBody,
      cc: selectedLog.cc || '',
      bcc: selectedLog.bcc || '',
      emailAccountId: selectedLog.emailAccountId || 'platform'
    });
    setPlainTextBody(htmlToPlainText(initialBody));
    toast.success('Reset email to original content.');
  };

  const handleSendUpdatedEmail = async (e) => {
    if (e) e.preventDefault();
    if (!selectedLog?._id || isSendingUpdate) return;

    const to = String(editForm.recipientEmail || '').trim();
    const sub = String(editForm.subject || '').trim();
    const content = String(editForm.body || '').trim();

    if (!to) {
      toast.error('Recipient email address is required.');
      return;
    }
    if (!sub) {
      toast.error('Email subject line cannot be empty.');
      return;
    }
    if (!content) {
      toast.error('Email message content cannot be empty.');
      return;
    }

    const confirmSend = window.confirm(`Send this updated email to ${to}? A new entry will be recorded in your email history.`);
    if (!confirmSend) return;

    try {
      setIsSendingUpdate(true);
      const res = await api.post(`/onboarding/email-history/${selectedLog._id}/resend`, {
        recipientEmail: to,
        subject: sub,
        body: editForm.body,
        cc: editForm.cc?.trim() || undefined,
        bcc: editForm.bcc?.trim() || undefined,
        emailAccountId: editForm.emailAccountId || undefined
      });

      toast.success(res.data?.message || 'Updated email sent successfully and recorded in history!');
      setSelectedLog(null);
      // Refresh table to immediately display the new entry
      fetchEmailHistory(true);
    } catch (error) {
      console.error('Failed to send updated email:', error);
      toast.error(error.response?.data?.message || 'Failed to send updated email.');
    } finally {
      setIsSendingUpdate(false);
    }
  };

  const handleResendEmail = async (log) => {
    if (!log?._id || resendingId) return;

    const recipient = log.recipientEmail || 'candidate';
    const confirmResend = window.confirm(`Are you sure you want to resend this email to ${recipient}?`);
    if (!confirmResend) return;

    try {
      setResendingId(log._id);
      const res = await api.post(`/onboarding/email-history/${log._id}/resend`, {});
      toast.success(res.data?.message || `Email successfully resent to ${recipient}!`);
      // Refresh the email list so the new entry shows up at the top
      fetchEmailHistory(true);
    } catch (error) {
      console.error('Failed to resend onboarding email:', error);
      toast.error(error.response?.data?.message || 'Failed to resend email.');
    } finally {
      setResendingId(null);
    }
  };

  const hasActiveFilters = searchTerm || selectedTemplate !== 'All' || startDate || endDate;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontSize: '12px' }}>
      {/* Main Table Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
          overflow: 'hidden'
        }}
      >
        {/* Toolbar & Filters */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Onboarding Email History</h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                Complete audit trail of all emails sent to pre-onboarding candidates and new hires.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => fetchEmailHistory(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                title="Refresh email history"
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          {/* Filter Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              <input
                type="text"
                placeholder="Search candidate name, email, subject, temp ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '12px',
                  outline: 'none',
                  background: '#fff',
                  boxSizing: 'border-box'
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setPage(1); }}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Template Filter */}
            <div style={{ minWidth: '160px' }}>
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '12px',
                  outline: 'none',
                  background: '#fff',
                  color: '#334155'
                }}
              >
                <option value="All">All Templates / Types</option>
                {templates.map((tpl, i) => (
                  <option key={i} value={tpl}>{tpl}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                title="From Date"
                style={{
                  padding: '6px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '12px',
                  outline: 'none',
                  background: '#fff',
                  color: '#334155'
                }}
              />
              <span style={{ color: '#94a3b8', fontSize: '11px' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                title="To Date"
                style={{
                  padding: '6px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '12px',
                  outline: 'none',
                  background: '#fff',
                  color: '#334155'
                }}
              />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #fecdd3',
                  background: '#fff1f2',
                  color: '#e11d48',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <X size={12} /> Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Email Logs Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '10px 16px', fontWeight: '700' }}>Recipient / Candidate</th>
                <th style={{ padding: '10px 16px', fontWeight: '700' }}>Subject & Template</th>
                <th style={{ padding: '10px 16px', fontWeight: '700' }}>Sender & Account</th>
                <th style={{ padding: '10px 16px', fontWeight: '700' }}>Attachments</th>
                <th style={{ padding: '10px 16px', fontWeight: '700' }}>Sent At</th>
                <th style={{ padding: '10px 16px', fontWeight: '700', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}><Skeleton className="h-8 w-36 rounded-lg" /></td>
                    <td style={{ padding: '12px 16px' }}><Skeleton className="h-8 w-48 rounded-lg" /></td>
                    <td style={{ padding: '12px 16px' }}><Skeleton className="h-8 w-28 rounded-lg" /></td>
                    <td style={{ padding: '12px 16px' }}><Skeleton className="h-6 w-16 rounded-full" /></td>
                    <td style={{ padding: '12px 16px' }}><Skeleton className="h-6 w-24 rounded-lg" /></td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}><Skeleton className="h-6 w-20 rounded-lg mx-auto" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <Mail size={22} />
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                        No onboarding email logs found
                      </div>
                      <p style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '360px', margin: 0 }}>
                        {hasActiveFilters
                          ? 'No emails matched your filter criteria. Try adjusting or clearing your filters.'
                          : 'No pre-onboarding emails have been sent to candidates yet.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleClearFilters}
                          style={{
                            marginTop: '6px',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            color: '#2563eb',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const candidateName = log.candidate?.name || log.candidate?.firstName || (log.recipientEmail ? log.recipientEmail.split('@')[0] : 'Candidate');
                  const initials = candidateName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || 'C';

                  const badgeStyle = getTemplateBadgeStyle(log.templateName);
                  const formattedDate = log.sentAt ? format(new Date(log.sentAt), 'dd MMM yyyy, hh:mm a') : '—';
                  const hasAttachments = Array.isArray(log.attachments) && log.attachments.length > 0;

                  return (
                    <tr
                      key={log._id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Candidate info */}
                      <td style={{ padding: '10px 16px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '700',
                              fontSize: '11px',
                              flexShrink: 0
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              {candidateName}
                              {log.candidate?.tempEmployeeId && (
                                <span style={{ fontSize: '10px', background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '4px', fontWeight: '600' }}>
                                  #{log.candidate.tempEmployeeId}
                                </span>
                              )}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '11px', marginTop: '1px' }}>
                              <span>{log.recipientEmail}</span>
                            </div>
                            {log.candidate?.designation && (
                              <div style={{ color: '#94a3b8', fontSize: '10.5px', marginTop: '1px' }}>
                                {log.candidate.designation} {log.candidate.department ? `· ${log.candidate.department}` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Subject & Template */}
                      <td style={{ padding: '10px 16px', verticalAlign: 'top', maxWidth: '280px' }}>
                        <div
                          style={{
                            fontWeight: '600',
                            color: '#1e293b',
                            fontSize: '12px',
                            lineHeight: 1.35,
                            marginBottom: '4px',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                          title={log.subject}
                        >
                          {log.subject || 'No Subject'}
                        </div>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600',
                            background: badgeStyle.bg,
                            color: badgeStyle.text,
                            border: `1px solid ${badgeStyle.border}`
                          }}
                        >
                          {log.templateName || 'Pre-Onboarding Email'}
                        </span>
                      </td>

                      {/* Sender & Email Account */}
                      <td style={{ padding: '10px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: '600', color: '#334155', fontSize: '12px' }}>
                          {log.sentBy ? `${log.sentBy.firstName || ''} ${log.sentBy.lastName || ''}`.trim() : 'System / HR'}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '10.5px', marginTop: '2px' }}>
                          via <span style={{ fontWeight: '600', color: '#475569' }}>{log.emailAccountLabel || 'TalentCIO Platform'}</span>
                        </div>
                        {log.cc && (
                          <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                            <span style={{ fontWeight: '600' }}>CC:</span> {log.cc}
                          </div>
                        )}
                        {log.bcc && (
                          <div style={{ color: '#64748b', fontSize: '10px', marginTop: '1px' }}>
                            <span style={{ fontWeight: '600' }}>BCC:</span> {log.bcc}
                          </div>
                        )}
                      </td>

                      {/* Attachments */}
                      <td style={{ padding: '10px 16px', verticalAlign: 'top' }}>
                        {hasAttachments ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 6px',
                                borderRadius: '999px',
                                fontSize: '10px',
                                fontWeight: '600',
                                background: '#f5f3ff',
                                color: '#7c3aed',
                                border: '1px solid #ddd6fe',
                                width: 'fit-content'
                              }}
                            >
                              <Paperclip size={10} /> {log.attachments.length} file{log.attachments.length > 1 ? 's' : ''}
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '1px' }}>
                              {log.attachments.slice(0, 2).map((att, attIdx) => (
                                att.cloudinaryUrl ? (
                                  <a
                                    key={attIdx}
                                    href={att.cloudinaryUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      fontSize: '10.5px',
                                      color: '#2563eb',
                                      textDecoration: 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      maxWidth: '140px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title={att.filename}
                                  >
                                    <FileText size={10} /> {att.filename || 'Attachment'}
                                  </a>
                                ) : (
                                  <span key={attIdx} style={{ fontSize: '10.5px', color: '#64748b' }}>
                                    {att.filename || 'Attachment'}
                                  </span>
                                )
                              ))}
                              {log.attachments.length > 2 && (
                                <span style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                                  +{log.attachments.length - 2} more
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>None</span>
                        )}
                      </td>

                      {/* Sent Date */}
                      <td style={{ padding: '10px 16px', verticalAlign: 'top', color: '#475569', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={12} style={{ color: '#94a3b8' }} />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 16px', verticalAlign: 'top', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenLog(log, 'email')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 9px',
                              borderRadius: '6px',
                              border: '1px solid #bfdbfe',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#2563eb';
                              e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#eff6ff';
                              e.currentTarget.style.color = '#1d4ed8';
                            }}
                            title="View full email details"
                          >
                            <Eye size={12} /> View Details
                          </button>
                          <button
                            onClick={() => handleResendEmail(log)}
                            disabled={resendingId === log._id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 9px',
                              borderRadius: '6px',
                              border: '1px solid #bbf7d0',
                              background: '#f0fdf4',
                              color: '#166534',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: resendingId === log._id ? 'not-allowed' : 'pointer',
                              opacity: resendingId === log._id ? 0.6 : 1,
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (resendingId !== log._id) {
                                e.currentTarget.style.background = '#16a34a';
                                e.currentTarget.style.color = '#fff';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (resendingId !== log._id) {
                                e.currentTarget.style.background = '#f0fdf4';
                                e.currentTarget.style.color = '#166534';
                              }
                            }}
                            title={`Quick resend email to ${log.recipientEmail}`}
                          >
                            <RotateCw size={11} className={resendingId === log._id ? 'animate-spin' : ''} />
                            {resendingId === log._id ? 'Sending...' : 'Resend'}
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

        {/* Pagination Footer */}
        {!loading && logs.length > 0 && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
              Showing <strong>{(page - 1) * limit + 1}</strong> to <strong>{Math.min(page * limit, totalCount)}</strong> of <strong>{totalCount}</strong> email entries
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#64748b' }}>
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    padding: '3px 6px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    fontSize: '11.5px',
                    outline: 'none'
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: page <= 1 ? '#cbd5e1' : '#475569',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#334155', padding: '0 4px' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: page >= totalPages ? '#cbd5e1' : '#475569',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full Email Details Preview Modal */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '16px',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '960px',
              height: '90vh',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 22px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#fff',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb',
                    flexShrink: 0
                  }}
                >
                  <Mail size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '15px',
                        fontWeight: '700',
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '500px'
                      }}
                      title={selectedLog.subject}
                    >
                      {selectedLog.subject || 'Email Details'}
                    </h2>
                    <span
                      style={{
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: '600',
                        ...getTemplateBadgeStyle(selectedLog.templateName),
                        border: `1px solid ${getTemplateBadgeStyle(selectedLog.templateName).border}`,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {selectedLog.templateName || 'Pre-Onboarding'}
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} /> Sent on {selectedLog.sentAt ? format(new Date(selectedLog.sentAt), 'dd MMMM yyyy, hh:mm:ss a') : '—'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Context Strip & Navigation Tabs */}
            <div
              style={{
                padding: '8px 22px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                flexShrink: 0
              }}
            >
              {/* Recipient Quick Summary */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: '#64748b', fontWeight: '500' }}>To:</span>
                  <strong style={{ color: '#0f172a' }}>
                    {selectedLog.candidate?.name || selectedLog.candidate?.firstName || (selectedLog.recipientEmail ? selectedLog.recipientEmail.split('@')[0] : 'Candidate')}
                  </strong>
                  <code style={{ background: '#eff6ff', color: '#1e40af', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>
                    {selectedLog.recipientEmail}
                  </code>
                  <button
                    onClick={() => handleCopy(selectedLog.recipientEmail, 'Email')}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: '1px', display: 'inline-flex' }}
                    title="Copy Email"
                  >
                    {copiedField === 'Email' ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                  </button>
                </div>
                {selectedLog.candidate?.tempEmployeeId && (
                  <span style={{ color: '#64748b', fontSize: '11px' }}>
                    ID: <strong style={{ color: '#334155' }}>#{selectedLog.candidate.tempEmployeeId}</strong>
                  </span>
                )}
              </div>

              {/* View Switcher Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', background: '#e2e8f0', padding: '3px', borderRadius: '8px', gap: '3px' }}>
                <button
                  onClick={() => setModalTab('email')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: modalTab === 'email' ? '#fff' : 'transparent',
                    color: modalTab === 'email' ? '#2563eb' : '#64748b',
                    boxShadow: modalTab === 'email' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Mail size={12} /> Rendered Message
                </button>
                <button
                  onClick={() => setModalTab('metadata')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: modalTab === 'metadata' ? '#fff' : 'transparent',
                    color: modalTab === 'metadata' ? '#2563eb' : '#64748b',
                    boxShadow: modalTab === 'metadata' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <User size={12} /> Recipient & Delivery Info
                  {Array.isArray(selectedLog.attachments) && selectedLog.attachments.length > 0 && (
                    <span style={{ background: '#2563eb', color: '#fff', fontSize: '9.5px', padding: '0 4px', borderRadius: '999px', fontWeight: '800' }}>
                      {selectedLog.attachments.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setModalTab('edit')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: modalTab === 'edit' ? '#fff' : 'transparent',
                    color: modalTab === 'edit' ? '#2563eb' : '#64748b',
                    boxShadow: modalTab === 'edit' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Edit3 size={12} /> Edit & Send Updated Mail
                </button>
              </div>
            </div>

            {/* Modal Body / Dedicated Scroll Area */}
            <div
              className="scrollbar-subtle"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                background: '#f1f5f9'
              }}
            >
              {/* TAB 1: RENDERED EMAIL MESSAGE */}
              {modalTab === 'email' && (
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Action Toolbar */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '720px',
                      marginBottom: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Full Rendered Preview
                    </span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setModalTab('edit')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 11px',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#1d4ed8',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        <Edit3 size={12} /> Edit This Email
                      </button>
                      <button
                        onClick={() => handleCopy(selectedLog.body, 'HTML Body')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
                          background: '#fff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#334155',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        {copiedField === 'HTML Body' ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                        {copiedField === 'HTML Body' ? 'HTML Copied' : 'Copy HTML'}
                      </button>
                      <button
                        onClick={() => {
                          if (!selectedLog.body) return;
                          const w = window.open('', '_blank');
                          if (w) {
                            w.document.write(`<!DOCTYPE html><html><head><title>${selectedLog.subject || 'Email Preview'}</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:20px;display:flex;justify-content:center;background:#f8fafc;">${selectedLog.body}</body></html>`);
                            w.document.close();
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
                          background: '#fff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#2563eb',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                        title="Open full email preview in a new window"
                      >
                        <ExternalLink size={12} /> Open in New Tab
                      </button>
                    </div>
                  </div>

                  {/* Email Subject Header Strip */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '720px',
                      marginBottom: '12px',
                      background: '#ffffff',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      padding: '12px 18px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                        Subject:
                      </span>
                      <strong style={{ fontSize: '13.5px', color: '#0f172a', wordBreak: 'break-word' }}>
                        {selectedLog.subject || '(No Subject)'}
                      </strong>
                    </div>
                    <button
                      onClick={() => handleCopy(selectedLog.subject, 'Subject')}
                      style={{
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        padding: '4px 9px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#475569',
                        fontSize: '11px',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0
                      }}
                      title="Copy Subject"
                    >
                      {copiedField === 'Subject' ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                      {copiedField === 'Subject' ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* Rendered Email Paper Card */}
                  {selectedLog.body ? (
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '720px',
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        padding: '24px 20px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                        overflowX: 'auto'
                      }}
                      dangerouslySetInnerHTML={{ __html: selectedLog.body }}
                    />
                  ) : (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '720px', border: '1px solid #e2e8f0' }}>
                      <Mail size={36} style={{ margin: '0 auto 10px', color: '#cbd5e1' }} />
                      <p style={{ margin: 0, fontWeight: '600', color: '#64748b' }}>No HTML email body recorded for this log entry.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: METADATA & CANDIDATE / ROUTING INFO */}
              {modalTab === 'metadata' && (
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Context Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px' }}>
                    {/* Candidate Card */}
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} style={{ color: '#2563eb' }} /> Candidate / Recipient
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>Full Name:</span>
                          <strong style={{ color: '#0f172a' }}>
                            {selectedLog.candidate?.name || selectedLog.candidate?.firstName || (selectedLog.recipientEmail ? selectedLog.recipientEmail.split('@')[0] : 'Candidate')}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>Email Address:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <code style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '11.5px' }}>
                              {selectedLog.recipientEmail}
                            </code>
                            <button
                              onClick={() => handleCopy(selectedLog.recipientEmail, 'Email')}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: '1px' }}
                              title="Copy Email"
                            >
                              {copiedField === 'Email' ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>Temp Employee ID:</span>
                          <strong style={{ color: '#0f172a' }}>
                            {selectedLog.candidate?.tempEmployeeId ? `#${selectedLog.candidate.tempEmployeeId}` : (selectedLog.candidate?.employeeId ? `#${selectedLog.candidate.employeeId}` : '—')}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>Designation:</span>
                          <span style={{ color: '#334155', fontWeight: '500' }}>
                            {selectedLog.candidate?.designation
                              ? `${selectedLog.candidate.designation}${selectedLog.candidate.department ? ` (${selectedLog.candidate.department})` : ''}`
                              : '—'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>Onboarding Status:</span>
                          <span style={{ fontWeight: '600', color: '#059669', background: '#ecfdf5', padding: '2px 7px', borderRadius: '4px', fontSize: '11px' }}>
                            {selectedLog.candidate?.status || 'In Progress'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delivery & Routing Card */}
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Send size={14} style={{ color: '#7c3aed' }} /> Sender & Routing Details
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>Sent By (User):</span>
                          <strong style={{ color: '#0f172a' }}>
                            {selectedLog.sentBy ? `${selectedLog.sentBy.firstName || ''} ${selectedLog.sentBy.lastName || ''}`.trim() : 'Admin User'}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>Sender Account:</span>
                          <span style={{ fontWeight: '600', color: '#334155' }}>
                            {selectedLog.emailAccountLabel || 'TalentCIO Platform'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>Template:</span>
                          <span style={{ color: '#334155', fontWeight: '500' }}>
                            {selectedLog.templateName || 'Default Pre-Onboarding Template'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>CC:</span>
                          {selectedLog.cc ? (
                            <code style={{ fontSize: '11px', color: '#1e40af', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
                              {selectedLog.cc}
                            </code>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>None</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>BCC:</span>
                          {selectedLog.bcc ? (
                            <code style={{ fontSize: '11px', color: '#1e40af', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
                              {selectedLog.bcc}
                            </code>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>None</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attachments Section */}
                  {Array.isArray(selectedLog.attachments) && selectedLog.attachments.length > 0 && (
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Paperclip size={14} style={{ color: '#2563eb' }} /> Attached Documents ({selectedLog.attachments.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {selectedLog.attachments.map((attachment, idx) => (
                          attachment.cloudinaryUrl ? (
                            <a
                              key={idx}
                              href={attachment.cloudinaryUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '7px 12px',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                color: '#1d4ed8',
                                fontSize: '12px',
                                fontWeight: '600',
                                textDecoration: 'none',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <FileText size={15} />
                              <span>{attachment.filename || `Attachment-${idx + 1}`}</span>
                              <Download size={13} style={{ color: '#94a3b8' }} />
                            </a>
                          ) : (
                            <div
                              key={idx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '7px 12px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                color: '#64748b',
                                fontSize: '12px'
                              }}
                            >
                              <FileText size={15} />
                              <span>{attachment.filename || `Attachment-${idx + 1}`}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: EDIT & SEND UPDATED MAIL */}
              {modalTab === 'edit' && (
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <form
                    onSubmit={handleSendUpdatedEmail}
                    style={{
                      width: '100%',
                      maxWidth: '780px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}
                  >
                    {/* Edit Header Bar */}
                    <div
                      style={{
                        background: '#fff',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Edit3 size={15} style={{ color: '#2563eb' }} /> Customize & Send Updated Email
                        </span>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                          Changes will be sent directly to the recipient and logged as a new entry in your email history.
                        </p>
                      </div>

                      {/* View Mode 3-Way Toggle */}
                      <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '3px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setPlainTextBody(htmlToPlainText(editForm.body));
                            setEditViewMode('plaintext');
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 11px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            background: editViewMode === 'plaintext' ? '#fff' : 'transparent',
                            color: editViewMode === 'plaintext' ? '#2563eb' : '#64748b',
                            boxShadow: editViewMode === 'plaintext' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <FileText size={13} /> Plain Text
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditViewMode('html');
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 11px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            background: editViewMode === 'html' ? '#fff' : 'transparent',
                            color: editViewMode === 'html' ? '#2563eb' : '#64748b',
                            boxShadow: editViewMode === 'html' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Code size={13} /> HTML Code
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditViewMode('preview')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 11px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            background: editViewMode === 'preview' ? '#fff' : 'transparent',
                            color: editViewMode === 'preview' ? '#2563eb' : '#64748b',
                            boxShadow: editViewMode === 'preview' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Eye size={13} /> Live Preview
                        </button>
                      </div>
                    </div>

                    {/* Routing Fields Grid */}
                    <div
                      style={{
                        background: '#fff',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '12px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Sender Account */}
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                          Sender Account (From) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select
                          value={editForm.emailAccountId || 'platform'}
                          onChange={(e) => setEditForm({ ...editForm, emailAccountId: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            outline: 'none',
                            background: '#f8fafc',
                            color: '#0f172a',
                            fontWeight: '500',
                            boxSizing: 'border-box',
                            cursor: 'pointer'
                          }}
                        >
                          {senderAccounts.length > 0 ? (
                            senderAccounts.map((acc) => (
                              <option key={acc._id} value={acc._id}>
                                {acc.name || acc.fromName || 'Platform'} {acc.fromAddress ? `(${acc.fromAddress})` : ''}
                              </option>
                            ))
                          ) : (
                            <option value="platform">TalentCIO Platform (no-reply@talentcio.in)</option>
                          )}
                        </select>
                      </div>

                      {/* Recipient Email */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                          Recipient Email (To) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={editForm.recipientEmail}
                          onChange={(e) => setEditForm({ ...editForm, recipientEmail: e.target.value })}
                          placeholder="candidate@example.com"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            outline: 'none',
                            background: '#f8fafc',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {/* Subject */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                          Email Subject <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.subject}
                          onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                          placeholder="Email Subject Line"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            outline: 'none',
                            background: '#f8fafc',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {/* CC */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: '#64748b', marginBottom: '5px' }}>
                          CC (Optional, comma-separated)
                        </label>
                        <input
                          type="text"
                          value={editForm.cc}
                          onChange={(e) => setEditForm({ ...editForm, cc: e.target.value })}
                          placeholder="manager@company.com"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '12px',
                            outline: 'none',
                            background: '#fff',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {/* BCC */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: '#64748b', marginBottom: '5px' }}>
                          BCC (Optional, comma-separated)
                        </label>
                        <input
                          type="text"
                          value={editForm.bcc}
                          onChange={(e) => setEditForm({ ...editForm, bcc: e.target.value })}
                          placeholder="archive@company.com"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '12px',
                            outline: 'none',
                            background: '#fff',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    {/* Email Message Content Area */}
                    <div
                      style={{
                        background: '#fff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {editViewMode === 'plaintext' && <><span>📝</span> Email Message (Plain Text Mode) <span style={{ color: '#ef4444' }}>*</span></>}
                            {editViewMode === 'html' && <><span>💻</span> Email Source (HTML Code Mode) <span style={{ color: '#ef4444' }}>*</span></>}
                            {editViewMode === 'preview' && <><span>👁️</span> Live Visual Preview</>}
                          </label>
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          {editViewMode === 'plaintext' && '⚡ Type in plain text — formatted HTML updates automatically'}
                          {editViewMode === 'html' && '⚡ Direct HTML markup & styling editor'}
                          {editViewMode === 'preview' && '⚡ Real-time rendered visual view'}
                        </span>
                      </div>

                      {/* Plain Text Editor */}
                      {editViewMode === 'plaintext' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <textarea
                            required
                            rows={15}
                            value={plainTextBody}
                            onChange={(e) => handlePlainTextChange(e.target.value)}
                            placeholder="Type or edit your email message text here..."
                            style={{
                              width: '100%',
                              padding: '14px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontFamily: 'inherit',
                              fontSize: '13px',
                              lineHeight: '1.6',
                              outline: 'none',
                              background: '#f8fafc',
                              color: '#0f172a',
                              boxSizing: 'border-box',
                              resize: 'vertical'
                            }}
                          />
                          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                            Tip: Paragraphs and line breaks entered here are automatically converted to clean responsive email HTML.
                          </p>
                        </div>
                      )}

                      {/* HTML Code Editor */}
                      {editViewMode === 'html' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <textarea
                            required
                            rows={15}
                            value={editForm.body}
                            onChange={(e) => handleHtmlChange(e.target.value)}
                            placeholder="Enter email HTML markup..."
                            style={{
                              width: '100%',
                              padding: '14px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontFamily: 'Consolas, Monaco, monospace',
                              fontSize: '12px',
                              lineHeight: '1.5',
                              outline: 'none',
                              background: '#0f172a',
                              color: '#f8fafc',
                              boxSizing: 'border-box',
                              resize: 'vertical'
                            }}
                          />
                          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                            Tip: Edits made to raw HTML will automatically synchronize with Plain Text mode and Live Preview.
                          </p>
                        </div>
                      )}

                      {/* Live Visual Preview */}
                      {editViewMode === 'preview' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Subject:</span>
                            <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{editForm.subject || '(No Subject)'}</strong>
                          </div>
                          <div
                            style={{
                              padding: '20px',
                              background: '#ffffff',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              minHeight: '260px',
                              overflowX: 'auto'
                            }}
                            dangerouslySetInnerHTML={{ __html: editForm.body || '<p style="color:#94a3b8;text-align:center;">(Empty email body)</p>' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Form Action Buttons */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 0 10px',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleResetEditForm}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          color: '#64748b',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <Undo2 size={13} /> Reset to Original
                      </button>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setModalTab('email')}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            color: '#475569',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSendingUpdate}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: isSendingUpdate ? 'not-allowed' : 'pointer',
                            opacity: isSendingUpdate ? 0.7 : 1,
                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                          }}
                        >
                          <Send size={13} className={isSendingUpdate ? 'animate-spin' : ''} />
                          {isSendingUpdate ? 'Sending Updated Email...' : 'Send Updated Email & Save New Entry'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 22px',
                borderTop: '1px solid #e2e8f0',
                background: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                flexShrink: 0
              }}
            >
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Recipient: <strong style={{ color: '#475569' }}>{selectedLog.recipientEmail}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {modalTab === 'edit' ? (
                  <button
                    onClick={handleSendUpdatedEmail}
                    disabled={isSendingUpdate}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: isSendingUpdate ? 'not-allowed' : 'pointer',
                      opacity: isSendingUpdate ? 0.7 : 1,
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                    }}
                  >
                    <Send size={13} className={isSendingUpdate ? 'animate-spin' : ''} />
                    {isSendingUpdate ? 'Sending...' : 'Send Updated Email'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setModalTab('edit')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid #bfdbfe',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      <Edit3 size={13} />
                      Edit Email
                    </button>
                    <button
                      onClick={() => handleResendEmail(selectedLog)}
                      disabled={resendingId === selectedLog._id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #059669, #10b981)',
                        color: '#fff',
                        fontWeight: '600',
                        fontSize: '12px',
                        cursor: resendingId === selectedLog._id ? 'not-allowed' : 'pointer',
                        opacity: resendingId === selectedLog._id ? 0.7 : 1,
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
                      }}
                    >
                      <RotateCw size={13} className={resendingId === selectedLog._id ? 'animate-spin' : ''} />
                      {resendingId === selectedLog._id ? 'Resending...' : 'Resend Original'}
                    </button>
                  </>
                )}

                <button
                  onClick={() => setSelectedLog(null)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    fontWeight: '600',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
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

export default OnboardingEmailHistory;

