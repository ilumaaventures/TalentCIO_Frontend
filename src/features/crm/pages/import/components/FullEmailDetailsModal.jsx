import React, { useState, useMemo } from 'react';
import {
  Mail,
  CheckCircle2,
  Check,
  Copy,
  Send,
  Paperclip,
  Download,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Image,
  FileArchive,
  File,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

const cleanFileName = (name = '') => {
  return String(name || '')
    .replace(/â€“/g, '–')
    .replace(/â€”/g, '—')
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/Â/g, '')
    .trim();
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getFileDetails = (fileName = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return { type: 'photo', label: 'Image', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
  }
  if (['pdf'].includes(ext)) {
    return { type: 'pdf', label: 'PDF Document', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' };
  }
  if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return { type: 'doc', label: 'Word Document', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return { type: 'sheet', label: 'Spreadsheet', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return { type: 'ppt', label: 'Presentation', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { type: 'zip', label: 'Compressed Archive', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' };
  }
  return { type: 'file', label: 'Document', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' };
};

const renderFileIcon = (fileName = '') => {
  const details = getFileDetails(fileName);
  switch (details.type) {
    case 'photo':
      return <Image className={`w-4 h-4 ${details.color}`} />;
    case 'pdf':
      return <FileText className={`w-4 h-4 ${details.color}`} />;
    case 'doc':
      return <FileText className={`w-4 h-4 ${details.color}`} />;
    case 'sheet':
      return <FileSpreadsheet className={`w-4 h-4 ${details.color}`} />;
    case 'ppt':
      return <FileText className={`w-4 h-4 ${details.color}`} />;
    case 'zip':
      return <FileArchive className={`w-4 h-4 ${details.color}`} />;
    default:
      return <File className={`w-4 h-4 ${details.color}`} />;
  }
};

export const FullEmailDetailsModal = ({
  isOpen,
  onClose,
  activity,
  companyName = 'Prospect',
  onReply,
  parseEmailActivity,
}) => {
  const [emailViewMode, setEmailViewMode] = useState('html');
  const [copiedEmailText, setCopiedEmailText] = useState(false);

  const email = useMemo(() => {
    if (!activity) return null;
    return parseEmailActivity ? parseEmailActivity(activity) : activity;
  }, [activity, parseEmailActivity]);

  const resolvedAttachments = useMemo(() => {
    let list = email?.attachments;
    if (!list || list.length === 0) {
      const meta = activity?.metadata || {};
      list = activity?.attachments || meta.attachments || meta.attachmentFileNames || meta.files;
      if (!list?.length && typeof meta.get === 'function') {
        list = meta.get('attachments') || meta.get('attachmentFileNames') || [];
      }
      if (!list?.length) {
        const descText = email?.cleanBody || activity?.description || '';
        const match = descText.match(/Attachments?(?:\s*\(\d+\))?:\s*([^\n\r]+)/i);
        if (match && match[1]) {
          list = match[1].split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
    }
    if (!Array.isArray(list)) return [];
    return list
      .map((item) => {
        if (!item) return null;
        if (typeof item === 'string') {
          const fname = cleanFileName(item.trim());
          return { filename: fname, name: fname, url: '', size: null };
        }
        const rawFname = item.filename || item.name || item.originalname || 'Attachment';
        const fname = cleanFileName(rawFname);
        return {
          filename: fname,
          name: fname,
          url: item.url || item.path || item.cloudinaryUrl || '',
          size: item.size || null,
          contentType: item.contentType || item.mimetype || '',
        };
      })
      .filter(Boolean);
  }, [email, activity]);

  const displayBody = useMemo(() => {
    if (!email?.cleanBody) return 'No message content recorded.';
    return email.cleanBody
      .replace(/\n*Attachments?(?:\s*\(\d+\))?:\s*[^\n\r]+/gi, '')
      .trim();
  }, [email]);

  const handleOpenFile = (att, index = 0) => {
    // 1. Direct web/Cloudinary URL
    if (att?.url && (att.url.startsWith('http://') || att.url.startsWith('https://'))) {
      window.open(att.url, '_blank', 'noopener,noreferrer');
      return;
    }

    // 2. Relative upload path
    if (att?.url && att.url.startsWith('/')) {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const fullUrl = baseUrl ? `${baseUrl.replace(/\/api\/?$/, '')}${att.url}` : att.url;
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // 3. Backend streaming route for activity attachments
    const actId = activity?._id || activity?.id;
    if (actId) {
      const token = localStorage.getItem('token') || localStorage.getItem('talentcio_token') || '';
      const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : '';
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const fn = encodeURIComponent(att?.filename || att?.name || '');
      const downloadUrl = `${cleanBase}/crm/communication/activities/${actId}/attachment/${index}?filename=${fn}${tokenQuery}`;
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    toast.error('File link not available for this attachment.');
  };

  if (!isOpen || !activity || !email) return null;

  const handleCopyEmail = () => {
    const attachText =
      resolvedAttachments.length > 0
        ? `\nAttachments (${resolvedAttachments.length}): ${resolvedAttachments.map((a) => a.filename).join(', ')}`
        : '';
    navigator.clipboard.writeText(
      `Subject: ${email.subject}\nFrom: ${email.senderName} <${email.senderEmail}>\nTo: ${email.to}\n\n${displayBody}${attachText}`
    );
    setCopiedEmailText(true);
    toast.success('Email contents copied to clipboard');
    setTimeout(() => setCopiedEmailText(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Full Email Communication"
      subtitle={`Company: ${companyName} • Sales Interaction Record`}
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
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
            {onReply && (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onReply(email);
                }}
                icon={Send}
              >
                Reply / Follow-up
              </Button>
            )}
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
              <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                From (Sender)
              </span>
              <p className="font-bold text-slate-800 text-xs mt-0.5 break-words">
                {email.senderName}
                {email.senderEmail && (
                  <span className="font-medium text-sky-700 ml-1">
                    &lt;{email.senderEmail}&gt;
                  </span>
                )}
              </p>
              {email.dispatchedByName &&
                (email.dispatchedByName !== email.senderName ||
                  (email.dispatchedByEmail && email.dispatchedByEmail !== email.senderEmail)) && (
                  <p className="text-[10px] text-slate-500 mt-1.5 pt-1.5 border-t border-slate-100">
                    Dispatched by:{' '}
                    <span className="font-semibold text-slate-700">
                      {email.dispatchedByName}
                    </span>
                    {email.dispatchedByEmail && (
                      <span className="text-slate-400 ml-1">
                        ({email.dispatchedByEmail})
                      </span>
                    )}
                  </p>
                )}
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                To (Recipient)
              </span>
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

        {/* Attachments Section */}
        {resolvedAttachments.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-sky-50/30 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Attachments ({resolvedAttachments.length})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Dispatched alongside this email outreach
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                {resolvedAttachments.length} File{resolvedAttachments.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {resolvedAttachments.map((att, idx) => {
                const displayName = att.filename || att.name || 'Attachment';
                const fileDetails = getFileDetails(displayName);
                return (
                  <div
                    key={idx}
                    onClick={() => handleOpenFile(att, idx)}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer group select-none"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenFile(att, idx);
                      }
                    }}
                    title={`Click to open and view ${displayName}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 mr-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${fileDetails.bg} group-hover:scale-105 transition-transform`}>
                        {renderFileIcon(displayName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-sky-700 truncate transition-colors" title={displayName}>
                          {displayName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span className="font-medium text-slate-500">{fileDetails.label}</span>
                          {att.size && <span>• {formatFileSize(att.size)}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-semibold"
                        title="File was dispatched with this email to recipient"
                      >
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Sent</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFile(att, idx);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        title={`Open ${displayName}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                  className={`px-2 py-0.5 rounded-md font-semibold transition ${
                    emailViewMode === 'html'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Formatted View
                </button>
                <button
                  type="button"
                  onClick={() => setEmailViewMode('text')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition ${
                    emailViewMode === 'text'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
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
                {displayBody}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
