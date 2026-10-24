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
  Maximize2,
  Paperclip,
  Trash2,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { dataService } from '../../services/api';
import { crmEmailTemplateService } from '../../services/crmApi';
import {
  CRM_EMAIL_TEMPLATE_PLACEHOLDERS,
  resolveTemplate,
  formatTemplateBodyAsHtml
} from '@/features/email/utils/templatePlaceholders';
import { CrmMailComposerModal } from '../../components/communication/CrmMailComposerModal';

const createDefaultContactPerson = (key = '0') => ({
  key,
  customName: '',
  customPhone: '',
  customDesignation: '',
  callType: 'Cold Call',
  customCallType: '',
  durationMinutes: '2',
  callOutcome: 'Connected - Interested',
  customCallOutcome: '',
  callNotes: '',
});

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

  // Contact selection state (supports logging for multiple persons with per-person call details)
  const [selectedContacts, setSelectedContacts] = useState([
    createDefaultContactPerson('0'),
  ]);

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
  const [emailAttachments, setEmailAttachments] = useState([]);
  const emailFileInputRef = React.useRef(null);

  const handleEmailFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'ppt', 'pptx', 'zip', 'rar', '7z'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB

    const updated = [...emailAttachments];
    for (const f of files) {
      if (updated.length >= 5) {
        toast.error('Maximum 5 attachments allowed.');
        break;
      }
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (!allowed.includes(ext)) {
        toast.error(`"${f.name}" is not supported. Allowed: Photos, PDF, Docs, PPT, ZIP.`);
        continue;
      }
      if (f.size > maxSizeBytes) {
        toast.error(`"${f.name}" exceeds the 5MB maximum file limit.`);
        continue;
      }
      if (updated.some(existing => existing.name === f.name && existing.size === f.size)) {
        continue;
      }
      updated.push(f);
    }
    setEmailAttachments(updated);
    if (emailFileInputRef.current) emailFileInputRef.current.value = '';
  };

  // Follow-up scheduling
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpType, setFollowUpType] = useState('call');
  const [followUpPriority] = useState('Medium');
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

  // Reset or initialize contact selection whenever modal opens or row changes
  useEffect(() => {
    if (initialType) setActiveType(initialType);
    if (row && isOpen) {
      setSelectedContacts([createDefaultContactPerson('0')]);
      setEmailSubject(`TalentCIO Solution Overview for ${row.companyName || 'your team'}`);
      setEmailNotes(`Hi ${row.contactPerson || 'there'},\n\nI am writing to share how our platform can help optimize operations at ${row.companyName || 'your company'}.\n\nBest regards,\nSales Team`);
      // Default follow-up date to tomorrow 10:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setFollowUpDate(tomorrow.toISOString().slice(0, 16));
    }
  }, [initialType, row, isOpen]);

  // Aggregate all available contact persons from row.contacts and root row fields
  const availableContacts = useMemo(() => {
    if (!row) return [];
    const list = [];
    const seen = new Set();

    // 1. Process contacts array from row
    if (Array.isArray(row.contacts)) {
      row.contacts.forEach((c) => {
        const name = (c.contactPerson || c.name || '').trim();
        const phone = (c.mobileNo || c.phone || '').trim();
        const email = (c.emailId || c.email || '').trim();
        const designation = (c.designation || c.role || '').trim();
        const key = `${name.toLowerCase()}__${phone}__${email.toLowerCase()}`;
        if ((name || phone || email) && !seen.has(key)) {
          seen.add(key);
          list.push({
            id: c._id || c.id || key,
            name: name || 'Contact Person',
            designation,
            phone,
            email,
            isPrimary: Boolean(c.isPrimary),
          });
        }
      });
    }

    // 2. Also incorporate root fields on row
    const rootName = (row.contactPerson || '').trim();
    const rootPhone = (row.mobileNo || row.phone || '').trim();
    const rootEmail = (row.emailId || row.email || '').trim();
    const rootDesignation = (row.designation || '').trim();
    const rootKey = `${rootName.toLowerCase()}__${rootPhone}__${rootEmail.toLowerCase()}`;

    if ((rootName || rootPhone || rootEmail) && !seen.has(rootKey)) {
      seen.add(rootKey);
      const hasPrimary = list.some((c) => c.isPrimary);
      list.unshift({
        id: 'root-primary',
        name: rootName || 'Primary Contact',
        designation: rootDesignation,
        phone: rootPhone,
        email: rootEmail,
        isPrimary: !hasPrimary,
      });
    }

    // Fallback if no contacts found
    if (list.length === 0) {
      list.push({
        id: 'default',
        name: row.companyName ? `${row.companyName} Representative` : 'Decision Maker',
        designation: '',
        phone: '',
        email: '',
        isPrimary: true,
      });
    }

    return list;
  }, [row]);

  // Multi-person contact handlers
  const handleAddContactPerson = () => {
    const usedKeys = new Set(selectedContacts.map((c) => c.key));
    let nextKey = 'custom';
    for (let i = 0; i < availableContacts.length; i++) {
      if (!usedKeys.has(String(i))) {
        nextKey = String(i);
        break;
      }
    }
    setSelectedContacts((prev) => [
      ...prev,
      createDefaultContactPerson(nextKey),
    ]);
  };

  const handleRemoveContactPerson = (idxToRemove) => {
    if (selectedContacts.length <= 1) return;
    setSelectedContacts((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleUpdateContactPerson = (index, field, value) => {
    setSelectedContacts((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  // Resolved list of all selected contacts
  const resolvedContacts = useMemo(() => {
    return selectedContacts.map((item) => {
      let base = {};
      if (item.key === 'custom') {
        base = {
          name: item.customName?.trim() || 'Custom Contact',
          phone: item.customPhone?.trim() || '',
          designation: item.customDesignation?.trim() || '',
          email: '',
          isCustom: true,
        };
      } else {
        const idx = parseInt(item.key, 10);
        if (!isNaN(idx) && availableContacts[idx]) {
          base = availableContacts[idx];
        } else {
          base = (
            availableContacts[0] || {
              name: row?.contactPerson || 'Contact',
              phone: row?.mobileNo || row?.phone || '',
              designation: row?.designation || '',
              email: row?.emailId || row?.email || '',
            }
          );
        }
      }

      const rawType = item.callType || 'Cold Call';
      const resolvedCallType =
        rawType === 'Other' ? (item.customCallType?.trim() || 'Other') : rawType;

      const rawOutcome = item.callOutcome || 'Connected - Interested';
      const resolvedCallOutcome =
        rawOutcome === 'Other' ? (item.customCallOutcome?.trim() || 'Other') : rawOutcome;

      return {
        ...base,
        key: item.key,
        customName: item.customName || '',
        customPhone: item.customPhone || '',
        customDesignation: item.customDesignation || '',
        callType: resolvedCallType,
        rawCallType: rawType,
        customCallType: item.customCallType || '',
        durationMinutes: Number(item.durationMinutes) || 0,
        outcome: resolvedCallOutcome,
        rawOutcome,
        customCallOutcome: item.customCallOutcome || '',
        notes: item.callNotes || '',
      };
    });
  }, [selectedContacts, availableContacts, row]);

  const currentContact = resolvedContacts[0] || null;
  const joinedContactNames = resolvedContacts.map((c) => c.name).filter(Boolean).join(' & ');
  const joinedContactPhones = resolvedContacts.map((c) => c.phone).filter(Boolean).join(', ');
  const activeContactPhone = (currentContact?.phone || row?.mobileNo || row?.phone || '').trim();
  const cleanPhone = activeContactPhone.replace(/\D/g, '').slice(-10);

  const mergeContext = useMemo(() => {
    if (!row) return {};
    const cPerson = currentContact?.name || row.contactPerson || '';
    const cPhone = currentContact?.phone || row.mobileNo || row.phone || '';
    const cEmail = currentContact?.email || row.emailId || row.email || '';
    const cDesig = currentContact?.designation || row.designation || 'Decision Maker';
    return {
      companyName: row.companyName || '',
      contactPerson: cPerson,
      firstName: cPerson ? cPerson.split(' ')[0] : '',
      lastName: cPerson ? cPerson.split(' ').slice(1).join(' ') : '',
      fullName: cPerson,
      email: cEmail,
      emailId: cEmail,
      mobileNo: cPhone,
      phoneNumber: cPhone,
      phone: cPhone,
      designation: cDesig,
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
  }, [row, currentContact]);

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

  const handleLaunchWhatsApp = () => {
    if (!cleanPhone) {
      toast.error('No valid phone number for this contact');
      return;
    }
    const targetName = currentContact?.name || row.contactPerson || 'Sir/Madam';
    const text = encodeURIComponent(
      `Hello ${targetName}, this is regarding TalentCIO's HRMS and Workforce Solutions for ${row.companyName || 'your organization'}.`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${text}`, '_blank');
  };

  const handleLaunchCall = () => {
    if (!cleanPhone) {
      toast.error('No valid phone number for this contact');
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
      const targetName = currentContact?.name || row.contactPerson || 'Contact';
      const title = encodeURIComponent(
        `CRM ${followUpType.toUpperCase()}: ${row.companyName || 'Prospect'} (${targetName})`
      );
      const allNotes = resolvedContacts.map((c) => c.notes).filter(Boolean).join('; ');
      const details = encodeURIComponent(
        `Company: ${row.companyName || 'N/A'}\nContact: ${targetName}\nPhone: ${activeContactPhone || 'N/A'}\nType: ${followUpType}\nNotes: ${followUpNotes || allNotes || ''}`
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
      const reachedName = (currentContact?.name || row.contactPerson || row.companyName || 'Prospect').trim();
      const reachedPhone = (currentContact?.phone || row.mobileNo || row.phone || '').trim();
      const reachedDesignation = (currentContact?.designation || row.designation || '').trim();
      const reachedEmail = (currentContact?.email || row.emailId || row.email || '').trim();

      if (activeType === 'call') {
        const cleanList = resolvedContacts
          .map((c) => ({
            name: (c.name || '').trim(),
            phone: (c.phone || '').trim(),
            designation: (c.designation || '').trim(),
            email: (c.email || '').trim(),
            callType: c.callType || 'Cold Call',
            durationMinutes: Number(c.durationMinutes) || 0,
            outcome: c.outcome || 'Connected - Interested',
            notes: (c.notes || '').trim(),
          }))
          .filter((c) => c.name || c.phone);

        const primaryPerson = cleanList[0] || {
          name: reachedName,
          phone: reachedPhone,
          designation: reachedDesignation,
          email: reachedEmail,
          callType: 'Cold Call',
          durationMinutes: 2,
          outcome: 'Connected - Interested',
          notes: '',
        };

        const finalName = cleanList.map((c) => c.name).filter(Boolean).join(' & ') || reachedName;
        const finalPhone = cleanList.map((c) => c.phone).filter(Boolean).join(', ') || reachedPhone;
        const finalDesignation = cleanList.map((c) => c.designation).filter(Boolean).join(', ') || reachedDesignation;
        const finalEmail = cleanList.map((c) => c.email).filter(Boolean).join(', ') || reachedEmail;

        const totalDuration = cleanList.reduce((acc, c) => acc + (Number(c.durationMinutes) || 0), 0);

        let combinedDescription = '';
        if (cleanList.length <= 1) {
          combinedDescription = primaryPerson.notes || '';
        } else {
          combinedDescription = cleanList
            .map((c, idx) => {
              const header = `[Person ${idx + 1}: ${c.name}${c.designation ? ` (${c.designation})` : ''} • ${c.callType} • ${c.durationMinutes}m • ${c.outcome}]`;
              return `${header}\n${c.notes || 'No specific notes recorded.'}`;
            })
            .join('\n\n');
        }

        const payload = {
          type: 'call',
          callType: primaryPerson.callType || 'Cold Call',
          outcome: primaryPerson.outcome || 'Connected - Interested',
          durationMinutes: totalDuration,
          contactPerson: finalName,
          contactPhone: finalPhone,
          contactDesignation: finalDesignation,
          contactEmail: finalEmail,
          contactPersons: cleanList,
          subject: `${cleanList.length > 1 ? `Multi-Person Call (${cleanList.length})` : primaryPerson.callType} with ${finalName}`,
          description: combinedDescription,
          metadata: {
            contactPersons: cleanList,
            contactPerson: finalName,
            contactPhone: finalPhone,
            contactDesignation: finalDesignation,
            contactEmail: finalEmail,
          },
        };
        const res = await dataService.logActivity(recordId, payload);
        if (res?.record && onSuccess) onSuccess(res.record);
      } else if (activeType === 'whatsapp') {
        const payload = {
          type: 'whatsapp',
          outcome: whatsappOutcome,
          contactPerson: reachedName,
          contactPhone: reachedPhone,
          contactDesignation: reachedDesignation,
          contactEmail: reachedEmail,
          subject: `WhatsApp outreach to ${reachedName}${reachedDesignation ? ` (${reachedDesignation})` : ''}`,
          description: whatsappNotes,
          metadata: {
            contactPerson: reachedName,
            contactPhone: reachedPhone,
            contactDesignation: reachedDesignation,
            contactEmail: reachedEmail,
          },
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
          if (emailAttachments.length > 0) {
            const formData = new FormData();
            formData.append('to', targetEmail);
            formData.append('recipientName', row.contactPerson || row.companyName || targetEmail);
            formData.append('subject', emailSubject);
            formData.append('htmlBody', formatTemplateBodyAsHtml(emailNotes));
            formData.append('plainBody', emailNotes);
            formData.append('emailAccountId', selectedSenderId || 'platform');
            formData.append('prospectId', recordId);
            if (selectedTemplateId) formData.append('templateId', selectedTemplateId);
            emailAttachments.forEach((file) => formData.append('attachments', file));
            await crmEmailTemplateService.sendEmail(formData);
          } else {
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
          }
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
        subtitle={`Prospect: ${row.companyName || 'Company'} • ${joinedContactNames || row.contactPerson || 'Contact'} (${joinedContactPhones || activeContactPhone || 'No phone'})`}
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
                <span>{joinedContactNames || row.contactPerson || 'Decision Maker'}</span>
                {resolvedContacts.length === 1 && (resolvedContacts[0]?.designation || row.designation) && (
                  <span className="text-slate-400">• {resolvedContacts[0]?.designation || row.designation}</span>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {resolvedContacts.map((c, i) => {
                const cClean = (c.phone || '').replace(/\D/g, '').slice(-10);
                if (!cClean) return null;
                const firstName = c.name ? c.name.split(' ')[0] : `Person ${i + 1}`;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { window.location.href = `tel:${cClean}`; }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold shadow-2xs transition text-[11px]"
                    title={`Dial ${c.name} (${c.phone})`}
                  >
                    <Phone className="w-3 h-3 text-indigo-600" />
                    <span>{resolvedContacts.length > 1 ? `${firstName}: ` : ''}{c.phone}</span>
                  </button>
                );
              })}

              {cleanPhone && (
                <button
                  type="button"
                  onClick={handleLaunchWhatsApp}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold shadow-2xs transition text-[11px]"
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
                {/* Header: Title + Add Person button */}
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Contact Person(s) Reached</span>
                    <span className="text-rose-500">*</span>
                    {selectedContacts.length > 1 && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.2 rounded-full">
                        {selectedContacts.length} Persons
                      </span>
                    )}
                  </label>

                  <button
                    type="button"
                    onClick={handleAddContactPerson}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer shadow-2xs"
                    title="Add another contact person to log this call for"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Person</span>
                  </button>
                </div>

                {/* Per-person cards */}
                <div className="space-y-3">
                  {selectedContacts.map((entry, idx) => {
                    const activeC = resolvedContacts[idx];
                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200 space-y-3 text-xs relative"
                      >
                        {/* Person header */}
                        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200/80">
                          <span className="font-bold text-slate-800 text-[11.5px] flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            <span>Person #{idx + 1}</span>
                            {idx === 0 && (
                              <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-semibold px-1.5 py-0.2 rounded">
                                Primary
                              </span>
                            )}
                          </span>
                          {selectedContacts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveContactPerson(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition cursor-pointer flex items-center gap-1 text-[11px]"
                              title="Remove this person"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>

                        {/* Contact Person Select */}
                        <div>
                          <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                            Contact Person Reached *
                          </label>
                          <select
                            value={entry.key}
                            onChange={(e) => handleUpdateContactPerson(idx, 'key', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          >
                            {availableContacts.map((c, cIdx) => {
                              const details = [
                                c.name,
                                c.designation ? `(${c.designation})` : '',
                                c.phone ? `— ${c.phone}` : '',
                                c.isPrimary ? '★ Primary' : '',
                              ].filter(Boolean);
                              return (
                                <option key={cIdx} value={String(cIdx)}>
                                  {details.join(' ')}
                                </option>
                              );
                            })}
                            <option value="custom">+ Add New / Custom Contact Person</option>
                          </select>
                        </div>

                        {/* Custom Contact Input Fields */}
                        {entry.key === 'custom' ? (
                          <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs animate-in fade-in duration-150">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-indigo-900 mb-0.5">Person Name *</label>
                              <input
                                type="text"
                                value={entry.customName || ''}
                                onChange={(e) => handleUpdateContactPerson(idx, 'customName', e.target.value)}
                                placeholder="e.g. Vikram Sharma"
                                className="w-full px-2.5 py-1 rounded-lg border border-indigo-300 bg-white text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-indigo-900 mb-0.5">Designation</label>
                              <input
                                type="text"
                                value={entry.customDesignation || ''}
                                onChange={(e) => handleUpdateContactPerson(idx, 'customDesignation', e.target.value)}
                                placeholder="e.g. Head of HR / CTO"
                                className="w-full px-2.5 py-1 rounded-lg border border-indigo-300 bg-white text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-indigo-900 mb-0.5">Phone Number</label>
                              <input
                                type="text"
                                value={entry.customPhone || ''}
                                onChange={(e) => handleUpdateContactPerson(idx, 'customPhone', e.target.value)}
                                placeholder="e.g. 9876543210"
                                className="w-full px-2.5 py-1 rounded-lg border border-indigo-300 bg-white text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        ) : activeC ? (
                          <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex-wrap">
                            <span className="font-bold text-slate-900">{activeC.name}</span>
                            {activeC.designation && (
                              <span className="text-slate-500 font-medium">• {activeC.designation}</span>
                            )}
                            {activeC.phone && (
                              <span className="font-mono text-indigo-700 bg-indigo-50/80 px-1.5 py-0.2 rounded border border-indigo-100 text-[10.5px]">
                                {activeC.phone}
                              </span>
                            )}
                            {activeC.email && (
                              <span className="text-slate-500 text-[10.5px]">
                                • {activeC.email}
                              </span>
                            )}
                            {activeC.isPrimary && (
                              <span className="ml-auto text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                Primary
                              </span>
                            )}
                          </div>
                        ) : null}

                        {/* Call Type & Duration */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Call Type</label>
                            <select
                              value={entry.callType || 'Cold Call'}
                              onChange={(e) => handleUpdateContactPerson(idx, 'callType', e.target.value)}
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
                              value={entry.durationMinutes ?? '2'}
                              onChange={(e) => handleUpdateContactPerson(idx, 'durationMinutes', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              placeholder="e.g. 2"
                            />
                          </div>
                        </div>

                        {entry.callType === 'Other' && (
                          <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-200/80 animate-in fade-in duration-150">
                            <label className="block font-semibold text-indigo-950 mb-1 text-xs">
                              Specify Custom Call Type:
                            </label>
                            <input
                              type="text"
                              value={entry.customCallType || ''}
                              onChange={(e) => handleUpdateContactPerson(idx, 'customCallType', e.target.value)}
                              placeholder="e.g. Technical Discovery with CTO"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        )}

                        {/* Call Outcome */}
                        <div className="text-xs">
                          <label className="block font-semibold text-slate-700 mb-1">Call Outcome</label>
                          <select
                            value={entry.callOutcome || 'Connected - Interested'}
                            onChange={(e) => handleUpdateContactPerson(idx, 'callOutcome', e.target.value)}
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
                            <option value="Other">Other (Custom Outcome)</option>
                          </select>
                        </div>

                        {entry.callOutcome === 'Other' && (
                          <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-200/80 animate-in fade-in duration-150">
                            <label className="block font-semibold text-indigo-950 mb-1 text-xs">
                              Specify Custom Call Outcome:
                            </label>
                            <input
                              type="text"
                              value={entry.customCallOutcome || ''}
                              onChange={(e) => handleUpdateContactPerson(idx, 'customCallOutcome', e.target.value)}
                              placeholder="e.g. Call Rescheduled / Decision Postponed"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        )}

                        {/* Discussion Notes */}
                        <div className="text-xs">
                          <label className="block font-semibold text-slate-700 mb-1">Discussion Notes</label>
                          <textarea
                            rows={3}
                            value={entry.callNotes || ''}
                            onChange={(e) => handleUpdateContactPerson(idx, 'callNotes', e.target.value)}
                            placeholder={`Key talking points with ${activeC?.name || 'this contact'}, client requirements, next steps...`}
                            className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
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
                {availableContacts.length > 1 && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Contact Person Targeted</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {availableContacts.length} Contacts on file
                      </span>
                    </label>
                    <select
                      value={selectedContactKey}
                      onChange={(e) => setSelectedContactKey(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    >
                      {availableContacts.map((c, idx) => {
                        const details = [
                          c.name,
                          c.designation ? `(${c.designation})` : '',
                          c.phone ? `— ${c.phone}` : '',
                          c.isPrimary ? '★ Primary' : '',
                        ].filter(Boolean);
                        return (
                          <option key={idx} value={String(idx)}>
                            {details.join(' ')}
                          </option>
                        );
                      })}
                      <option value="custom">+ Other / Specific Contact</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-between pb-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
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

                  {/* Attachment controls */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => emailFileInputRef.current?.click()}
                      disabled={emailAttachments.length >= 5}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer disabled:opacity-50 transition"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Attach File (Photos, PDF, Docs, PPT, ZIP - Max 5MB)</span>
                    </button>
                    {emailAttachments.length > 0 && (
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {emailAttachments.length} file{emailAttachments.length > 1 ? 's' : ''} attached
                      </span>
                    )}
                  </div>

                  <input
                    ref={emailFileInputRef}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.pdf,.doc,.docx,.txt,.rtf,.odt,.ppt,.pptx,.zip,.rar,.7z"
                    onChange={handleEmailFileSelect}
                    className="hidden"
                  />

                  {emailAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {emailAttachments.map((f, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700">
                          <Paperclip className="w-3 h-3 text-slate-500" />
                          <span className="truncate max-w-[140px] font-medium">{f.name}</span>
                          <span className="text-[10px] text-slate-400">({(f.size / (1024 * 1024)).toFixed(1)}MB)</span>
                          <button
                            type="button"
                            onClick={() => setEmailAttachments(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
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
