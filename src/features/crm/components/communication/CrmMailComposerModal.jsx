import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Mail,
  Send,
  X,
  Sparkles,
  Eye,
  CheckCircle2,
  Building2,
  User,
  ExternalLink,
  Paperclip,
  ChevronDown,
  Layers,
  AtSign,
  Image,
  FileArchive,
  FileText,
  File,
  Trash2,
  UploadCloud,
  Loader2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import { crmEmailTemplateService } from '../../services/crmApi';
import {
  CRM_EMAIL_TEMPLATE_PLACEHOLDERS,
  renderTemplateBody,
  resolveTemplate,
  formatTemplateBodyAsHtml
} from '@/features/email/utils/templatePlaceholders';

const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit
const MAX_ATTACHMENTS_COUNT = 5;
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'ppt', 'pptx', 'zip', 'rar', '7z'];
const ACCEPT_STRING = '.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.pdf,.doc,.docx,.txt,.rtf,.odt,.ppt,.pptx,.zip,.rar,.7z';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getFileCategory = (fileName = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return { type: 'photo', label: 'Photo/Image', bg: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
  }
  if (['pdf'].includes(ext)) {
    return { type: 'pdf', label: 'PDF Document', bg: 'bg-rose-50 text-rose-600 border-rose-200' };
  }
  if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return { type: 'doc', label: 'Word/Doc', bg: 'bg-blue-50 text-blue-600 border-blue-200' };
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return { type: 'ppt', label: 'PowerPoint/PPT', bg: 'bg-amber-50 text-amber-600 border-amber-200' };
  }
  if (['zip', 'rar', '7z'].includes(ext)) {
    return { type: 'zip', label: 'ZIP Archive', bg: 'bg-purple-50 text-purple-600 border-purple-200' };
  }
  return { type: 'file', label: 'File', bg: 'bg-slate-50 text-slate-600 border-slate-200' };
};

// Convert HTML templates or formatted text to clean, natural plain text for the editor
const convertHtmlToPlainText = (html) => {
  if (!html) return '';
  if (!/<[a-z][\s\S]*>/i.test(html)) return html;
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const renderFileIcon = (file) => {
  const cat = getFileCategory(file.name);
  if (cat.type === 'photo') return <Image size={18} className="text-emerald-600" />;
  if (cat.type === 'pdf') return <FileText size={18} className="text-rose-600" />;
  if (cat.type === 'doc') return <FileText size={18} className="text-blue-600" />;
  if (cat.type === 'ppt') return <FileText size={18} className="text-amber-600" />;
  if (cat.type === 'zip') return <FileArchive size={18} className="text-purple-600" />;
  return <File size={18} className="text-slate-600" />;
};

export const CrmMailComposerModal = ({
  isOpen,
  onClose,
  prospect,
  row,
  initialTemplateId = '',
  initialSubject = '',
  onSuccess,
}) => {
  const { user } = useAuth();
  const target = prospect || row || {};

  const [senders, setSenders] = useState([]);
  const [selectedSenderId, setSelectedSenderId] = useState('platform');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId || '');
  
  const [toEmail, setToEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [activeTab, setActiveTab] = useState('compose'); // 'compose' | 'preview'
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSenders, setIsLoadingSenders] = useState(true);

  // Send Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sendStage, setSendStage] = useState('idle'); // 'idle' | 'sending' | 'error' | 'success'
  const [sendErrorMsg, setSendErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setShowConfirmModal(false);
      setSendStage('idle');
      setSendErrorMsg('');
    }
  }, [isOpen]);

  const currentSender = useMemo(() => {
    return senders.find((s) => String(s._id) === String(selectedSenderId)) || null;
  }, [senders, selectedSenderId]);

  // File Attachments State (Photos, PDF, Docs, PPT, ZIP - max 5MB)
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const subjectRef = useRef(null);
  const bodyRef = useRef(null);

  // Derive sender info for merge tags
  const senderInfo = useMemo(() => {
    const firstName = user?.firstName || 'Representative';
    const lastName = user?.lastName || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Sales Team';
    const companyName = user?.company?.name || 'TalentCIO';
    return {
      senderName: fullName,
      senderEmail: user?.email || 'sales@talentcio.in',
      senderPhone: user?.phone || user?.mobile || '',
      senderCompany: companyName,
      senderDesignation: user?.designation || user?.role || 'Enterprise Representative',
      senderRole: 'Sales Specialist',
      currentDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      currentYear: String(new Date().getFullYear()),
      meetingLink: 'https://meet.talentcio.in/demo',
      proposalDetails: 'Custom enterprise workforce automation solution package.',
      customNote: ''
    };
  }, [user]);

  // Context data for resolving placeholders
  const mergeContext = useMemo(() => {
    const cPerson = target.contactPerson || target.name || target.contactName || '';
    const compName = target.companyName || target.company || '';
    const email = target.emailId || target.email || '';
    const phone = target.mobileNo || target.phone || target.phoneNumber || '';
    const desig = target.designation || target.title || target.jobTitle || 'Decision Maker';
    const ind = target.industry || 'Technology & Business';
    const addr = target.address || target.city || target.location || '';

    return {
      ...senderInfo,
      companyName: compName || 'your organization',
      contactPerson: cPerson || 'Sir/Madam',
      firstName: cPerson ? cPerson.split(' ')[0] : '',
      lastName: cPerson ? cPerson.split(' ').slice(1).join(' ') : '',
      fullName: cPerson,
      email: email,
      emailId: email,
      mobileNo: phone,
      phoneNumber: phone,
      phone: phone,
      designation: desig,
      industry: ind,
      address: addr,
      rating: String(target.rating || '5'),
      status: target.status || 'Active',
      leadStatus: target.status || 'Active',
      source: target.source || 'Website',
      leadSource: target.source || 'Website',
      remarks: target.remarks || ''
    };
  }, [target, senderInfo]);

  // Fetch senders and templates
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadResources = async () => {
      try {
        setIsLoadingSenders(true);
        const [sendersRes, templatesRes] = await Promise.all([
          crmEmailTemplateService.getSenders().catch(() => ({ data: {} })),
          crmEmailTemplateService.getTemplates().catch(() => ({ data: [] }))
        ]);

        if (!isMounted) return;

        const sData = (sendersRes && (sendersRes.accounts || sendersRes.platformOption))
          ? sendersRes
          : (sendersRes?.data || {});

        const platformOpt = sData.platformOption || {
          _id: 'platform',
          name: 'TalentCIO Platform',
          fromName: 'TalentCIO',
          fromAddress: 'no-reply@talentcio.in',
          provider: 'PLATFORM'
        };

        const rawAccounts = Array.isArray(sData.accounts) ? sData.accounts : [];

        const accountOptions = rawAccounts
          .filter((acc) => acc.ready !== false)
          .map((acc) => {
            const prov = (acc.provider || 'smtp').toUpperCase();
            const displayName = acc.name || acc.fromName || 'Saved Sender';
            const emailAddr = acc.fromAddress || acc.email || '';
            return {
              _id: String(acc._id || ''),
              name: displayName,
              fromName: acc.fromName || displayName,
              fromAddress: emailAddr,
              provider: prov,
              label: emailAddr ? `${displayName} (${emailAddr} - ${prov})` : `${displayName} - ${prov}`
            };
          });

        const platformOptionFormatted = {
          _id: 'platform',
          name: platformOpt.name || 'TalentCIO Platform',
          fromName: platformOpt.fromName || 'TalentCIO',
          fromAddress: platformOpt.fromAddress || 'no-reply@talentcio.in',
          provider: 'PLATFORM',
          label: `${platformOpt.name || 'TalentCIO Platform'} (${platformOpt.fromAddress || 'no-reply@talentcio.in'})`
        };

        const allSenders = [platformOptionFormatted, ...accountOptions];
        setSenders(allSenders);

        const defaultAccId = String(sData.defaultAccountId || '');
        if (defaultAccId && allSenders.some((s) => String(s._id) === defaultAccId)) {
          setSelectedSenderId(defaultAccId);
        } else if (allSenders.length > 1) {
          // If a custom account exists and is default, choose it, or first available
          setSelectedSenderId(defaultAccId || allSenders[0]._id);
        } else if (allSenders[0]) {
          setSelectedSenderId(allSenders[0]._id);
        }

        const tList = Array.isArray(templatesRes?.data)
          ? templatesRes.data
          : Array.isArray(templatesRes)
          ? templatesRes
          : [];
        setTemplates(tList.filter((t) => t.isActive !== false));
      } catch (err) {
        console.error('Failed to load email resources', err);
      } finally {
        if (isMounted) setIsLoadingSenders(false);
      }
    };

    loadResources();
    return () => { isMounted = false; };
  }, [isOpen]);

  // Initialize fields when prospect changes or opens
  useEffect(() => {
    if (!isOpen) return;

    const email = target.emailId || target.email || '';
    const name = target.contactPerson || target.name || '';
    setToEmail(email);
    setRecipientName(name);

    if (initialSubject) {
      setSubject(initialSubject);
    } else {
      setSubject(`Solution Overview for ${target.companyName || 'your organization'}`);
    }

    if (!htmlBody) {
      setHtmlBody(
        `Hi ${name || 'there'},\n\nI hope this email finds you well.\n\nWe would love to share how our platform can support ${target.companyName || 'your company'}.\n\nBest regards,\n${senderInfo.senderName}\n${senderInfo.senderCompany}`
      );
    }
  }, [isOpen, target, initialSubject]);

  // Handle template selection
  const handleSelectTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tmpl = templates.find((t) => t._id === templateId);
    if (!tmpl) return;

    // Resolve template placeholders with current prospect merge context
    const resolvedSubj = resolveTemplate(tmpl.subject, mergeContext);
    const resolvedHtml = resolveTemplate(tmpl.htmlBody, mergeContext);

    setSubject(resolvedSubj);
    setHtmlBody(convertHtmlToPlainText(resolvedHtml));
  };

  const insertPlaceholder = (field, placeholder) => {
    const token = `{{${placeholder}}}`;
    const ref = field === 'subject' ? subjectRef.current : bodyRef.current;

    if (!ref) {
      if (field === 'subject') setSubject((prev) => `${prev}${token}`);
      else setHtmlBody((prev) => `${prev}${token}`);
      return;
    }

    const start = ref.selectionStart ?? ref.value.length;
    const end = ref.selectionEnd ?? ref.value.length;
    const currentVal = field === 'subject' ? subject : htmlBody;
    const updated = `${currentVal.slice(0, start)}${token}${currentVal.slice(end)}`;

    if (field === 'subject') setSubject(updated);
    else setHtmlBody(updated);

    window.requestAnimationFrame(() => {
      ref.focus();
      const nextPos = start + token.length;
      ref.setSelectionRange(nextPos, nextPos);
    });
  };

  // Attachment processing & validation
  const processFiles = (fileList) => {
    const selectedFiles = Array.from(fileList || []);
    if (!selectedFiles.length) return;

    const newAttachments = [...attachments];
    let addedCount = 0;

    for (const file of selectedFiles) {
      if (newAttachments.length >= MAX_ATTACHMENTS_COUNT) {
        toast.error(`Maximum of ${MAX_ATTACHMENTS_COUNT} attachments allowed.`);
        break;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        toast.error(`"${file.name}" is not supported. Allowed: Photos, PDF, Docs, PPT, ZIP.`);
        continue;
      }

      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        toast.error(`"${file.name}" exceeds the 5MB maximum file size limit (${formatFileSize(file.size)}).`);
        continue;
      }

      const alreadyExists = newAttachments.some((a) => a.name === file.name && a.size === file.size);
      if (alreadyExists) {
        toast.error(`"${file.name}" is already attached.`);
        continue;
      }

      newAttachments.push(file);
      addedCount++;
    }

    if (addedCount > 0) {
      setAttachments(newAttachments);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e) => {
    processFiles(e.target.files);
  };

  const handleRemoveAttachment = (indexToRemove) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) {
      processFiles(e.dataTransfer.files);
    }
  };

  const totalAttachmentBytes = useMemo(() => {
    return attachments.reduce((sum, f) => sum + (f.size || 0), 0);
  }, [attachments]);

  // Real-time resolved preview
  const previewSubject = useMemo(() => resolveTemplate(subject, mergeContext), [subject, mergeContext]);
  const previewHtml = useMemo(() => renderTemplateBody(htmlBody, mergeContext), [htmlBody, mergeContext]);

  const handleInitiateSend = (e) => {
    e?.preventDefault();

    if (!toEmail || !toEmail.trim()) {
      toast.error('Recipient email address is required.');
      return;
    }

    if (!subject || !subject.trim()) {
      toast.error('Email subject line is required.');
      return;
    }

    if (!htmlBody || !htmlBody.trim()) {
      toast.error('Email message content cannot be empty.');
      return;
    }

    setSendStage('idle');
    setSendErrorMsg('');
    setShowConfirmModal(true);
  };

  const handleConfirmSendEmail = async () => {
    try {
      setIsSending(true);
      setSendStage('sending');
      setSendErrorMsg('');

      if (attachments.length > 0) {
        // Send as multipart FormData
        const formData = new FormData();
        formData.append('to', toEmail.trim());
        formData.append('recipientName', recipientName.trim() || target.contactPerson || toEmail.trim());
        if (cc.trim()) formData.append('cc', cc.trim());
        if (bcc.trim()) formData.append('bcc', bcc.trim());
        formData.append('subject', previewSubject.trim() || subject.trim());
        formData.append('htmlBody', previewHtml || formatTemplateBodyAsHtml(htmlBody));
        formData.append('plainBody', htmlBody.trim());
        formData.append('emailAccountId', selectedSenderId || 'platform');
        if (currentSender?.fromAddress) formData.append('fromEmail', currentSender.fromAddress);
        if (currentSender?.fromName) formData.append('fromName', currentSender.fromName || currentSender.name);

        const prospectId = target._id || target.id;
        if (prospectId) formData.append('prospectId', prospectId);
        if (target.leadId) formData.append('leadId', target.leadId);
        if (target.dealId) formData.append('dealId', target.dealId);
        if (target.contactId) formData.append('contactId', target.contactId);
        if (selectedTemplateId) formData.append('templateId', selectedTemplateId);

        attachments.forEach((file) => {
          formData.append('attachments', file);
        });

        await crmEmailTemplateService.sendEmail(formData);
      } else {
        const payload = {
          to: toEmail.trim(),
          recipientName: recipientName.trim() || target.contactPerson || toEmail.trim(),
          cc: cc.trim() || undefined,
          bcc: bcc.trim() || undefined,
          subject: previewSubject.trim() || subject.trim(),
          htmlBody: previewHtml || formatTemplateBodyAsHtml(htmlBody),
          plainBody: htmlBody.trim(),
          emailAccountId: selectedSenderId || 'platform',
          fromEmail: currentSender?.fromAddress || undefined,
          fromName: currentSender?.fromName || currentSender?.name || undefined,
          prospectId: target._id || target.id,
          leadId: target.leadId || undefined,
          dealId: target.dealId || undefined,
          contactId: target.contactId || undefined,
          templateId: selectedTemplateId || undefined
        };

        await crmEmailTemplateService.sendEmail(payload);
      }

      setSendStage('success');
      toast.success(
        attachments.length > 0
          ? `Sales email sent successfully with ${attachments.length} attachment${attachments.length > 1 ? 's' : ''}!`
          : 'Sales email sent successfully!'
      );
      setAttachments([]);
      setShowConfirmModal(false);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to dispatch CRM email', error);
      const errMsg = error.response?.data?.message || error.message || 'Failed to deliver email';
      setSendErrorMsg(errMsg);
      setSendStage('error');
      toast.error(errMsg);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/30 bg-slate-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Mail size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">Direct Sales Outreach</p>
                {target.companyName && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 truncate max-w-xs">
                    <Building2 size={12} className="text-slate-400" />
                    {target.companyName}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 truncate">
                Compose Email {target.contactPerson ? `to ${target.contactPerson}` : ''}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action / View Switcher (Compose vs Preview on small screens or tabs) */}
        <div className="flex items-center justify-between bg-white border-b border-slate-200 px-6 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('compose')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'compose'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Compose Mail
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Eye size={14} />
              <span>Live Preview</span>
            </button>
          </div>

          {/* Quick Merge Variables Info */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-slate-500">
            <Sparkles size={13} className="text-amber-500" />
            <span>Variables resolve dynamically for {target.companyName || 'the recipient'}</span>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleInitiateSend} className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === 'compose' ? (
            <div className="grid gap-5 lg:grid-cols-12 items-start">
              {/* Left Form: Configurations & Editor (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                {/* Sender Account & Email Template Selectors */}
                <div className="grid gap-3 sm:grid-cols-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  {/* Sender Account */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
                      Sender Account (From) *
                    </label>
                    <select
                      value={selectedSenderId}
                      onChange={(e) => setSelectedSenderId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white"
                    >
                      {senders.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.label || `${s.fromName || s.name} (${s.fromAddress || s.email})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Email Template */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                        Email Template
                      </label>
                      <span className="text-[10px] text-indigo-600 font-semibold">Pre-populates message</span>
                    </div>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleSelectTemplate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white"
                    >
                      <option value="">-- Choose Sales Template (Optional) --</option>
                      {templates.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name} ({t.category?.replace(/_/g, ' ') || 'Sales'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Recipient & CC/BCC Fields */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                        To (Recipient Email) *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="prospect@company.com"
                        value={toEmail}
                        onChange={(e) => setToEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                          Recipient Name
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowCcBcc(!showCcBcc)}
                          className="text-[11px] font-bold text-indigo-600 hover:underline"
                        >
                          {showCcBcc ? 'Hide CC/BCC' : '+ Add CC/BCC'}
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Rajesh Sharma"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                      />
                    </div>
                  </div>

                  {showCcBcc && (
                    <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                          CC Email(s)
                        </label>
                        <input
                          type="text"
                          placeholder="Comma separated emails"
                          value={cc}
                          onChange={(e) => setCc(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                          BCC Email(s)
                        </label>
                        <input
                          type="text"
                          placeholder="Comma separated emails"
                          value={bcc}
                          onChange={(e) => setBcc(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Subject Line with Quick Merge Pills */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                      Subject Line *
                    </label>
                    <div className="flex items-center gap-1">
                      {['companyName', 'contactPerson', 'senderCompany'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => insertPlaceholder('subject', p)}
                          className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition"
                        >
                          +{p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    ref={subjectRef}
                    type="text"
                    required
                    placeholder="Enter email subject line..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>

                {/* Email Body Editor with Quick Merge Tags */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                      Email Body Content *
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Click tags to insert variable</span>
                  </div>

                  {/* Pills */}
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pb-1">
                    {[
                      'companyName',
                      'contactPerson',
                      'designation',
                      'industry',
                      'mobileNo',
                      'senderName',
                      'senderPhone',
                      'meetingLink',
                      'proposalDetails',
                      'customNote'
                    ].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => insertPlaceholder('htmlBody', p)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition"
                      >
                        {`{{${p}}}`}
                      </button>
                    ))}
                  </div>

                  <textarea
                    ref={bodyRef}
                    rows={9}
                    required
                    value={htmlBody}
                    onChange={(e) => setHtmlBody(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-sans leading-relaxed text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition resize-y"
                    placeholder="Write your email body here. Standard paragraphs and blank lines will be preserved."
                  />
                </div>

                {/* Attachments Section (Max 5MB each • Photos, PDF, Docs, PPT, ZIP) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <Paperclip size={15} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                            Attachments
                          </label>
                          {attachments.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                              {attachments.length} / {MAX_ATTACHMENTS_COUNT}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Photos, PDF, Word/Docs, PPT, ZIP (Max 5MB each)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={attachments.length >= MAX_ATTACHMENTS_COUNT}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                      >
                        <Paperclip size={13} />
                        <span>Attach File</span>
                      </button>
                    </div>
                  </div>

                  {/* Hidden Native File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPT_STRING}
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {/* Dropzone & File Cards */}
                  {attachments.length === 0 ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${
                        isDragging
                          ? 'border-indigo-500 bg-indigo-50/70'
                          : 'border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/30'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 transition shadow-2xs">
                        <UploadCloud size={20} className="text-indigo-500" />
                      </div>
                      <div className="text-xs text-slate-700">
                        <span className="font-bold text-indigo-600 hover:underline">Click to attach</span> or drag and drop files here
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Photos (JPG, PNG, GIF, WEBP)
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100">
                          PDF
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                          Docs (DOC, DOCX, TXT)
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                          PPT (PPT, PPTX)
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                          ZIP (ZIP, RAR, 7Z)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`grid gap-2 sm:grid-cols-2 rounded-2xl p-1 transition ${
                          isDragging ? 'bg-indigo-50/80 ring-2 ring-indigo-400' : ''
                        }`}
                      >
                        {attachments.map((file, idx) => {
                          const cat = getFileCategory(file.name);
                          return (
                            <div
                              key={`${file.name}-${idx}`}
                              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/80 hover:bg-white hover:border-slate-300 transition shadow-2xs group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cat.bg}`}>
                                  {renderFileIcon(file)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                                    {file.name}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                    <span className="font-semibold text-slate-700">{formatFileSize(file.size)}</span>
                                    <span>•</span>
                                    <span className="text-slate-500">{cat.label}</span>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(idx)}
                                title="Remove file"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0 cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                        <div className="flex items-center gap-2">
                          <span>
                            Total: <strong className="text-slate-800 font-bold">{formatFileSize(totalAttachmentBytes)}</strong>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle2 size={12} /> Ready to send
                          </span>
                        </div>

                        {attachments.length < MAX_ATTACHMENTS_COUNT && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                          >
                            + Attach more
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Prospect Summary & Real-time Output (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                {/* Target Contact Snapshot */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-3">
                    Prospect Snapshot
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Company</p>
                      <p className="font-bold text-slate-800">{target.companyName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact Person</p>
                      <p className="font-semibold text-slate-700">{target.contactPerson || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Designation / Industry</p>
                      <p className="text-slate-600">{target.designation || '—'} {target.industry ? `• ${target.industry}` : ''}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email & Mobile</p>
                      <p className="text-slate-600 font-medium">{toEmail || '—'} {target.mobileNo ? `| ${target.mobileNo}` : ''}</p>
                    </div>
                  </div>
                </div>

                {/* Compact Mini Preview */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Preview Snapshot</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Full View</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-slate-900 break-words mb-2">
                    {previewSubject || 'Subject preview...'}
                  </p>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 max-h-48 overflow-y-auto text-[11px] text-slate-700 leading-relaxed mb-2">
                    <div
                      className="prose prose-sm max-w-none text-[11px] text-slate-700"
                      dangerouslySetInnerHTML={{
                        __html: previewHtml || '<p class="text-slate-400 italic">Preview...</p>',
                      }}
                    />
                  </div>

                  {attachments.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                        <Paperclip size={11} className="text-indigo-600" />
                        <span>Attached ({attachments.length})</span>
                      </p>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {attachments.map((f, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                            <span className="truncate max-w-[170px] font-medium">{f.name}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">{formatFileSize(f.size)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Full Live Preview Tab */
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Live Client View</p>
                  <h4 className="text-base font-bold text-slate-900">{previewSubject}</h4>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>From: <span className="font-semibold text-slate-800">{senders.find((s) => s._id === selectedSenderId)?.label || 'Sender Account'}</span></p>
                  <p>To: <span className="font-semibold text-slate-800">{toEmail}</span></p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 min-h-[250px] text-xs text-slate-800 leading-relaxed">
                <div
                  className="prose prose-sm max-w-none text-xs text-slate-800"
                  dangerouslySetInnerHTML={{
                    __html: previewHtml || '<p class="text-slate-400 italic">Preview email content...</p>',
                  }}
                />
              </div>

              {/* Attachments inside Live Preview */}
              {attachments.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                    <Paperclip size={14} className="text-indigo-600" />
                    <span>Attached Files ({attachments.length})</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {attachments.map((file, i) => {
                      const cat = getFileCategory(file.name);
                      return (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${cat.bg}`}>
                            {renderFileIcon(file)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate text-[11px]">{file.name}</p>
                            <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500">
                <span>The prospect will receive this email and attachments exactly as shown above.</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('compose')}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  ← Back to editor
                </button>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-4">
            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-500" />
                <span>Auto-logs outreach event to CRM client timeline</span>
              </div>
              {attachments.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[11px]">
                  <Paperclip size={12} />
                  <span>{attachments.length} attachment{attachments.length > 1 ? 's' : ''} ({formatFileSize(totalAttachmentBytes)})</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending || isLoadingSenders}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition cursor-pointer"
              >
                <Send size={15} />
                <span>{isSending ? 'Sending Mail...' : 'Send Email Now'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Send Confirmation & Live Dispatch Status Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-[10020] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => {
            if (!isSending) setShowConfirmModal(false);
          }}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden transform animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-indigo-50/80 via-white to-white border-b border-slate-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
                  {sendStage === 'sending' ? (
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  ) : sendStage === 'error' ? (
                    <AlertCircle className="w-6 h-6 text-white" />
                  ) : (
                    <Send className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {sendStage === 'sending'
                      ? 'Sending Email...'
                      : sendStage === 'error'
                      ? 'Email Dispatch Failed'
                      : 'Confirm Email Dispatch'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sendStage === 'sending'
                      ? 'Connecting to mail server and dispatching your email...'
                      : sendStage === 'error'
                      ? 'An error occurred while attempting to send the email.'
                      : 'Please review and confirm before sending this email.'}
                  </p>
                </div>
                {!isSending && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {sendStage === 'sending' ? (
                <div className="py-8 px-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center text-center">
                  <div className="relative mb-4">
                    <div className="w-14 h-14 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                    <Mail className="w-6 h-6 text-indigo-600 absolute inset-0 m-auto" />
                  </div>
                  <p className="font-bold text-indigo-950 text-sm">Delivering to {toEmail}</p>
                  <p className="text-xs text-indigo-600/80 mt-1 max-w-sm">
                    Please wait a moment while the email {attachments.length > 0 ? `and ${attachments.length} attachment(s)` : ''} are transferred to the mail server.
                  </p>
                </div>
              ) : (
                <>
                  {sendStage === 'error' && (
                    <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold">Error delivering email</p>
                        <p className="text-rose-700 mt-0.5">{sendErrorMsg || 'Failed to dispatch email. Please check your network or email credentials.'}</p>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200/70">
                      <span className="text-slate-500 font-medium shrink-0">Recipient (To):</span>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 break-all">{toEmail}</span>
                        {(recipientName || target.contactPerson || target.companyName) && (
                          <p className="text-[11px] text-slate-500 font-medium">
                            {[recipientName || target.contactPerson, target.companyName].filter(Boolean).join(' • ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {(cc || bcc) && (
                      <div className="space-y-1.5 pb-2 border-b border-slate-200/70">
                        {cc && (
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-slate-500 font-medium shrink-0">CC:</span>
                            <span className="text-slate-700 font-medium text-right break-all">{cc}</span>
                          </div>
                        )}
                        {bcc && (
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-slate-500 font-medium shrink-0">BCC:</span>
                            <span className="text-slate-700 font-medium text-right break-all">{bcc}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200/70">
                      <span className="text-slate-500 font-medium shrink-0">Subject:</span>
                      <span className="font-semibold text-slate-800 text-right line-clamp-2 max-w-[280px]">
                        {previewSubject.trim() || subject.trim()}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200/70">
                      <span className="text-slate-500 font-medium shrink-0">From (Sender):</span>
                      <span className="font-medium text-slate-700 text-right truncate max-w-[260px]">
                        {currentSender?.name ? `${currentSender.name} (${currentSender.fromAddress || ''})` : 'TalentCIO Platform'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-medium shrink-0">Attachments:</span>
                      {attachments.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[11px]">
                          <Paperclip size={12} />
                          <span>{attachments.length} file{attachments.length > 1 ? 's' : ''} ({formatFileSize(totalAttachmentBytes)})</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">None</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-800 text-[11.5px]">
                    <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>This email will be dispatched immediately and logged to the prospect timeline.</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSending}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer disabled:opacity-50"
              >
                {sendStage === 'error' ? 'Close & Edit' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmSendEmail}
                disabled={isSending}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition cursor-pointer disabled:opacity-60"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : sendStage === 'error' ? (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Retry Sending</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Yes, Send Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default CrmMailComposerModal;
