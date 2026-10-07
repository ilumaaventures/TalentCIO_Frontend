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
  AtSign
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
        `<p>Hi ${name || 'there'},</p>\n<p>I hope this email finds you well.</p>\n<p>We would love to share how our platform can support ${target.companyName || 'your company'}.</p>\n<br/>\n<p>Best regards,<br/><strong>${senderInfo.senderName}</strong><br/>${senderInfo.senderCompany}</p>`
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
    setHtmlBody(resolvedHtml);
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

  // Real-time resolved preview
  const previewSubject = useMemo(() => resolveTemplate(subject, mergeContext), [subject, mergeContext]);
  const previewHtml = useMemo(() => renderTemplateBody(htmlBody, mergeContext), [htmlBody, mergeContext]);

  const handleSendEmail = async (e) => {
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

    try {
      setIsSending(true);

      const payload = {
        to: toEmail.trim(),
        recipientName: recipientName.trim() || target.contactPerson || toEmail.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: previewSubject.trim() || subject.trim(),
        htmlBody: previewHtml || formatTemplateBodyAsHtml(htmlBody),
        emailAccountId: selectedSenderId || 'platform',
        prospectId: target._id || target.id,
        leadId: target.leadId || undefined,
        dealId: target.dealId || undefined,
        contactId: target.contactId || undefined,
        templateId: selectedTemplateId || undefined
      };

      await crmEmailTemplateService.sendEmail(payload);
      toast.success('Sales email sent successfully!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to dispatch CRM email', error);
      toast.error(error.response?.data?.message || 'Failed to deliver email');
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
        <form onSubmit={handleSendEmail} className="flex-1 overflow-y-auto px-6 py-5">
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
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-mono leading-relaxed text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                    placeholder="Write your email body here. Standard paragraphs and blank lines will be preserved."
                  />
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
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 max-h-48 overflow-y-auto text-[11px] text-slate-700 leading-relaxed">
                    <div
                      className="prose prose-sm max-w-none text-[11px] text-slate-700"
                      dangerouslySetInnerHTML={{
                        __html: previewHtml || '<p class="text-slate-400 italic">Preview...</p>',
                      }}
                    />
                  </div>
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

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 min-h-[300px] text-xs text-slate-800 leading-relaxed">
                <div
                  className="prose prose-sm max-w-none text-xs text-slate-800"
                  dangerouslySetInnerHTML={{
                    __html: previewHtml || '<p class="text-slate-400 italic">Preview email content...</p>',
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500">
                <span>The prospect will receive this email exactly as shown above.</span>
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
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 size={15} className="text-emerald-500" />
              <span>Auto-logs outreach event to CRM client timeline</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending || isLoadingSenders}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition"
              >
                <Send size={15} />
                <span>{isSending ? 'Sending Mail...' : 'Send Email Now'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CrmMailComposerModal;
