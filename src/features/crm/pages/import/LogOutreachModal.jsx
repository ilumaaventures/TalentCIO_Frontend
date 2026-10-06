import React, { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  MessageSquare,
  Mail,
  Clock,
  Send,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  User,
  Building2,
  Maximize2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { dataService } from '../../services/api';
import { crmEmailTemplateService } from '../../services/crmApi';
import {
  CRM_EMAIL_TEMPLATE_PLACEHOLDERS,
  renderTemplateBody,
  resolveTemplate,
  formatTemplateBodyAsHtml
} from '@/features/email/utils/templatePlaceholders';
import { CrmMailComposerModal } from '../../components/communication/CrmMailComposerModal';

export const LogOutreachModal = ({
  isOpen,
  onClose,
  row,
  initialType = 'call',
  onSuccess,
}) => {
  const [activeType, setActiveType] = useState(initialType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullComposerOpen, setIsFullComposerOpen] = useState(false);

  // Call form state
  const [callType, setCallType] = useState('Cold Call');
  const [customCallType, setCustomCallType] = useState('');
  const [callOutcome, setCallOutcome] = useState('Connected - Interested');
  const [durationMinutes, setDurationMinutes] = useState('2');
  const [callNotes, setCallNotes] = useState('');

  // WhatsApp form state
  const [whatsappOutcome, setWhatsappOutcome] = useState('Sent');
  const [whatsappNotes, setWhatsappNotes] = useState('');

  // Email form state
  const [senders, setSenders] = useState([]);
  const [selectedSenderId, setSelectedSenderId] = useState('platform');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailNotes, setEmailNotes] = useState('');
  const [sendViaPlatform, setSendViaPlatform] = useState(true);

  // Follow-up scheduling
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpType, setFollowUpType] = useState('call');
  const [followUpPriority, setFollowUpPriority] = useState('Medium');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // Load senders & templates
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadData = async () => {
      try {
        const [sendersRes, tmplsRes] = await Promise.all([
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
          setSelectedSenderId(defaultAccId || allSenders[0]._id);
        } else if (allSenders[0]) {
          setSelectedSenderId(allSenders[0]._id);
        }

        const tList = Array.isArray(tmplsRes?.data)
          ? tmplsRes.data
          : Array.isArray(tmplsRes)
          ? tmplsRes
          : [];
        setTemplates(tList.filter((t) => t.isActive !== false));
      } catch (err) {
        console.warn('Could not load email resources', err);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [isOpen]);

  useEffect(() => {
    if (initialType) setActiveType(initialType);
    if (row) {
      setEmailSubject(`TalentCIO Solution Overview for ${row.companyName || 'your team'}`);
      setEmailNotes(`Hi ${row.contactPerson || 'there'},\n\nI am writing to share how our platform can help optimize operations at ${row.companyName || 'your company'}.\n\nBest regards,\nSales Team`);
      // Default follow-up date to tomorrow 10:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setFollowUpDate(tomorrow.toISOString().slice(0, 16));
    }
  }, [initialType, row, isOpen]);

  const mergeContext = useMemo(() => {
    if (!row) return {};
    return {
      companyName: row.companyName || '',
      contactPerson: row.contactPerson || '',
      firstName: row.contactPerson ? row.contactPerson.split(' ')[0] : '',
      lastName: row.contactPerson ? row.contactPerson.split(' ').slice(1).join(' ') : '',
      fullName: row.contactPerson || '',
      email: row.emailId || row.email || '',
      emailId: row.emailId || row.email || '',
      mobileNo: row.mobileNo || row.phone || '',
      phoneNumber: row.mobileNo || row.phone || '',
      phone: row.mobileNo || row.phone || '',
      designation: row.designation || 'Decision Maker',
      industry: row.industry || 'Technology & Business',
      address: row.address || '',
      rating: String(row.rating || '5'),
      status: row.status || 'Active',
      senderCompany: 'TalentCIO',
      senderName: 'Sales Specialist',
      senderPhone: '+91 80000 12345',
      senderEmail: 'sales@talentcio.in',
      meetingLink: 'https://meet.talentcio.in/demo',
      currentDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      currentYear: String(new Date().getFullYear())
    };
  }, [row]);

  const handleTemplateChange = (tmplId) => {
    setSelectedTemplateId(tmplId);
    if (!tmplId) return;
    const tmpl = templates.find((t) => t._id === tmplId);
    if (!tmpl) return;

    const resolvedSubj = resolveTemplate(tmpl.subject, mergeContext);
    const resolvedBody = resolveTemplate(tmpl.htmlBody, mergeContext);
    setEmailSubject(resolvedSubj);
    setEmailNotes(resolvedBody.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n\n').trim());
  };

  const insertPlaceholder = (token) => {
    setEmailNotes((prev) => `${prev} {{${token}}}`);
  };

  if (!isOpen || !row) return null;

  const cleanPhone = (row.mobileNo || '').replace(/\D/g, '').slice(-10);

  const handleLaunchWhatsApp = () => {
    if (!cleanPhone) {
      toast.error('No valid phone number for this prospect');
      return;
    }
    const text = encodeURIComponent(
      `Hello ${row.contactPerson || 'Sir/Madam'}, this is regarding TalentCIO's HRMS and Workforce Solutions for ${row.companyName || 'your organization'}.`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${text}`, '_blank');
  };

  const handleLaunchCall = () => {
    if (!cleanPhone) {
      toast.error('No valid phone number for this prospect');
      return;
    }
    window.location.href = `tel:${cleanPhone}`;
  };

  const handleAddToGoogleCalendar = () => {
    if (!followUpDate) {
      toast.error('Please pick a date and time first');
      return;
    }
    try {
      const start = new Date(followUpDate);
      const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min duration
      const pad = (n) => String(n).padStart(2, '0');
      const formatGCal = (d) =>
        `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
      const title = encodeURIComponent(
        `CRM ${followUpType.toUpperCase()}: ${row.companyName || 'Prospect'} (${row.contactPerson || 'Contact'})`
      );
      const details = encodeURIComponent(
        `Company: ${row.companyName || 'N/A'}\nContact: ${row.contactPerson || 'N/A'}\nPhone: ${row.mobileNo || row.phone || 'N/A'}\nType: ${followUpType}\nNotes: ${followUpNotes || callNotes || ''}`
      );
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatGCal(start)}/${formatGCal(end)}&details=${details}`;
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      toast.error('Unable to generate Google Calendar link');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const recordId = row._id || row.id;

      if (activeType === 'call') {
        const resolvedCallType =
          callType === 'Other' ? (customCallType.trim() || 'Other') : callType;
        const payload = {
          type: 'call',
          callType: resolvedCallType,
          outcome: callOutcome,
          durationMinutes: Number(durationMinutes) || 0,
          subject: `${resolvedCallType} with ${row.contactPerson || row.companyName || 'Prospect'}`,
          description: callNotes,
        };
        const res = await dataService.logActivity(recordId, payload);
        if (res?.record && onSuccess) onSuccess(res.record);
      } else if (activeType === 'whatsapp') {
        const payload = {
          type: 'whatsapp',
          outcome: whatsappOutcome,
          subject: `WhatsApp outreach to ${row.contactPerson || row.companyName}`,
          description: whatsappNotes,
        };
        const res = await dataService.logActivity(recordId, payload);
        if (res?.record && onSuccess) onSuccess(res.record);
      } else if (activeType === 'email') {
        const targetEmail = row.emailId || row.email;
        if (!targetEmail) {
          toast.error('No valid email address found for this prospect.');
          setIsSubmitting(false);
          return;
        }

        if (sendViaPlatform) {
          // Send real email via company sender account
          await crmEmailTemplateService.sendEmail({
            to: targetEmail,
            recipientName: row.contactPerson || row.companyName || targetEmail,
            subject: emailSubject,
            htmlBody: formatTemplateBodyAsHtml(emailNotes),
            plainBody: emailNotes,
            emailAccountId: selectedSenderId || 'platform',
            prospectId: recordId,
            templateId: selectedTemplateId || undefined
          });
        } else {
          // Offline logging
          const payload = {
            type: 'email',
            outcome: 'Sent',
            subject: emailSubject || `Email to ${row.contactPerson || row.companyName}`,
            description: emailNotes,
          };
          const res = await dataService.logActivity(recordId, payload);
          if (res?.record && onSuccess) onSuccess(res.record);
        }
      }

      // Schedule follow-up if toggled or if in follow-up tab
      if (scheduleFollowUp || activeType === 'followup') {
        if (followUpDate) {
          await dataService.scheduleFollowUp(recordId, {
            title: `Follow-up ${followUpType} with ${row.contactPerson || row.companyName}`,
            scheduledDate: new Date(followUpDate),
            type: followUpType,
            priority: followUpPriority,
            notes: followUpNotes || (activeType === 'call' ? callNotes : ''),
          });
        }
      }

      toast.success(
        activeType === 'email' && sendViaPlatform
          ? 'Sales email dispatched and outreach logged successfully!'
          : `${activeType.toUpperCase()} interaction logged successfully!`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err.message || 'Failed to complete outreach');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !isFullComposerOpen}
        onClose={onClose}
        title="Log Sales Outreach & Activity"
        subtitle={`Prospect: ${row.companyName || 'Company'} • ${row.contactPerson || 'Contact'} (${row.mobileNo || 'No phone'})`}
        maxWidth="max-w-xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Saves outreach to telemetry timeline</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                icon={activeType === 'email' && sendViaPlatform ? Send : CheckCircle2}
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting
                  ? 'Processing...'
                  : activeType === 'email' && sendViaPlatform
                  ? 'Send & Log Email'
                  : 'Save Activity'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Quick Contact & Info Header Card */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>{row.companyName || 'Untitled Company'}</span>
                {row.rating && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                    ★ {row.rating}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-slate-600 font-medium text-[11px]">
                <User className="w-3 h-3 text-slate-400" />
                <span>{row.contactPerson || 'Decision Maker'}</span>
                {row.designation && <span className="text-slate-400">• {row.designation}</span>}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5">
              {cleanPhone && (
                <button
                  type="button"
                  onClick={handleLaunchCall}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold shadow-2xs transition"
                  title="Dial phone"
                >
                  <Phone className="w-3 h-3 text-indigo-600" />
                  <span>{row.mobileNo}</span>
                </button>
              )}

              {cleanPhone && (
                <button
                  type="button"
                  onClick={handleLaunchWhatsApp}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold shadow-2xs transition"
                  title="Chat on WhatsApp"
                >
                  <MessageSquare className="w-3 h-3 text-emerald-600" />
                  <span>WhatsApp</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </button>
              )}
            </div>
          </div>

          {/* Outreach Channel Tabs */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveType('call')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                activeType === 'call'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveType('whatsapp')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                activeType === 'whatsapp'
                  ? 'bg-white text-emerald-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveType('email')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                activeType === 'email'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveType('followup')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                activeType === 'followup'
                  ? 'bg-white text-amber-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Follow-up</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Channel Form: CALL */}
            {activeType === 'call' && (
              <div className="space-y-3.5 bg-white p-3.5 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Call Type</label>
                    <select
                      value={callType}
                      onChange={(e) => setCallType(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="Cold Call">Cold Call</option>
                      <option value="Discovery / Pitch">Discovery / Pitch</option>
                      <option value="Follow-up Call">Follow-up Call</option>
                      <option value="Demo Scheduled">Demo Scheduled</option>
                      <option value="Commercial Negotiation">Commercial Negotiation</option>
                      <option value="Closing Call">Closing Call</option>
                      <option value="Account Check-in">Account Check-in</option>
                      <option value="Gatekeeper Inquiry">Gatekeeper Inquiry</option>
                      <option value="Payment Follow-up">Payment Follow-up</option>
                      <option value="Other">Other (Custom Type)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Duration (Mins)</label>
                    <input
                      type="number"
                      min="0"
                      max="180"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      placeholder="e.g. 3"
                    />
                  </div>
                </div>

                {callType === 'Other' && (
                  <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-200/80 animate-in fade-in duration-150">
                    <label className="block font-semibold text-indigo-950 mb-1 text-xs">
                      Specify Custom Call Type:
                    </label>
                    <input
                      type="text"
                      value={customCallType}
                      onChange={(e) => setCustomCallType(e.target.value)}
                      placeholder="e.g. Technical Discovery with CTO"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div className="text-xs">
                  <label className="block font-semibold text-slate-700 mb-1">Call Outcome</label>
                  <select
                    value={callOutcome}
                    onChange={(e) => setCallOutcome(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Connected - Interested">Connected - Interested / Warm</option>
                    <option value="Connected - Follow-up Requested">Connected - Follow-up Requested</option>
                    <option value="Connected - Demo Scheduled">Connected - Demo Scheduled</option>
                    <option value="Connected - Shared Info on WhatsApp">Connected - Shared Info on WhatsApp</option>
                    <option value="Connected - Not Interested">Connected - Not Interested</option>
                    <option value="Connected - Gatekeeper Blocked">Connected - Gatekeeper Blocked</option>
                    <option value="No Answer / Ringing">No Answer / Ringing</option>
                    <option value="Busy / Call Dropped">Busy / Call Dropped</option>
                    <option value="Wrong Number / Invalid">Wrong Number / Invalid</option>
                  </select>
                </div>

                <div className="text-xs">
                  <label className="block font-semibold text-slate-700 mb-1">Discussion Notes</label>
                  <textarea
                    rows={3}
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="Key talking points, client requirements, budget, next steps..."
                    className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs">
                  <input
                    type="checkbox"
                    checked={scheduleFollowUp}
                    onChange={(e) => setScheduleFollowUp(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Schedule a follow-up for this call
                  </span>
                </label>
              </div>
            )}

            {/* Channel Form: WHATSAPP */}
            {activeType === 'whatsapp' && (
              <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">Quick WhatsApp Message</span>
                  {cleanPhone && (
                    <button
                      type="button"
                      onClick={handleLaunchWhatsApp}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                    >
                      <span>Launch WhatsApp Web</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp Status</label>
                  <select
                    value={whatsappOutcome}
                    onChange={(e) => setWhatsappOutcome(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Sent">Message Sent</option>
                    <option value="Replied">Client Replied</option>
                    <option value="Shared Proposal">Shared Company Profile / Brochure</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Notes / Message Summary</label>
                  <textarea
                    rows={3}
                    value={whatsappNotes}
                    onChange={(e) => setWhatsappNotes(e.target.value)}
                    placeholder="Sent intro deck and asked for callback time..."
                    className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Channel Form: EMAIL */}
            {activeType === 'email' && (
              <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Sales Email Composer</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      To: {row.emailId || row.email || 'No email available'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFullComposerOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Full Composer & Live Preview</span>
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Sender Account and Template Selectors */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Sender Account</label>
                    <select
                      value={selectedSenderId}
                      onChange={(e) => setSelectedSenderId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      {senders.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.label || s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email Template</label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">-- Choose Sales Template --</option>
                      {templates.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Subject Line</label>
                  <input
                    type="text"
                    required
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">Email Message Body</label>
                    <div className="flex items-center gap-1">
                      {['companyName', 'contactPerson', 'senderCompany'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => insertPlaceholder(p)}
                          className="rounded text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 text-slate-700 px-1.5 py-0.5"
                        >
                          +{p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    required
                    value={emailNotes}
                    onChange={(e) => setEmailNotes(e.target.value)}
                    placeholder="Compose outreach email message..."
                    className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-sans leading-relaxed"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={sendViaPlatform}
                    onChange={(e) => setSendViaPlatform(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Send className="w-3 h-3 text-indigo-600" />
                    Send real email immediately via selected sender account
                  </span>
                </label>
              </div>
            )}

            {/* Channel Form: DEDICATED FOLLOW-UP OR CHECKED FOLLOW-UP */}
            {(scheduleFollowUp || activeType === 'followup') && (
              <div className="space-y-3 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/80 text-xs">
                <div className="flex items-center justify-between font-bold text-amber-900 border-b border-amber-200/60 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Next Scheduled Follow-up / Call</span>
                  </div>
                  {followUpDate && (
                    <button
                      type="button"
                      onClick={handleAddToGoogleCalendar}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-2 py-0.5 rounded shadow-2xs cursor-pointer transition"
                      title="Add this scheduled call to Google Calendar"
                    >
                      <Calendar className="w-3 h-3 text-indigo-600" />
                      <span>Add to Google Calendar</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-amber-950 mb-1">Follow-up Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-amber-950 mb-1">Follow-up Medium</label>
                    <select
                      value={followUpType}
                      onChange={(e) => setFollowUpType(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="call">Phone Call</option>
                      <option value="whatsapp">WhatsApp Message</option>
                      <option value="email">Email Outreach</option>
                      <option value="meeting">Online / In-person Demo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-amber-950 mb-1">Reminder Notes</label>
                  <input
                    type="text"
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="e.g. Call after client reviews proposal with CFO"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </form>
        </div>
      </Modal>

      {/* Full Dedicated Email Composer Modal */}
      {isFullComposerOpen && (
        <CrmMailComposerModal
          isOpen={isFullComposerOpen}
          onClose={() => setIsFullComposerOpen(false)}
          row={row}
          initialSubject={emailSubject}
          initialTemplateId={selectedTemplateId}
          onSuccess={() => {
            setIsFullComposerOpen(false);
            if (onSuccess) onSuccess();
            onClose();
          }}
        />
      )}
    </>
  );
};

export default LogOutreachModal;
