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
  ChevronDown,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { dataService } from '../../services/api';
import { crmEmailTemplateService } from '../../services/crmApi';
import { LogOutreachModal } from './LogOutreachModal';
import { CrmMailComposerModal } from '../../components/communication/CrmMailComposerModal';
import { DetailOverviewTab } from './components/DetailOverviewTab';
import { DetailTimelineTab } from './components/DetailTimelineTab';
import { DetailTasksTab } from './components/DetailTasksTab';
import { DetailPerformanceTab } from './components/DetailPerformanceTab';
import { FullEmailDetailsModal } from './components/FullEmailDetailsModal';
import { FullCallDetailsModal } from './components/FullCallDetailsModal';
import { StatusChangeModal } from './components/StatusChangeModal';
import { EditCallActivityModal } from './components/EditCallActivityModal';
import { EditContactsModal } from './components/EditContactsModal';

const STATUS_OPTIONS = [
  'New',
  'Connected',
  'Interested',
  'Not Interested',
  'Callback Requested',
  'Not picking',
  'Did not turn up',
  'Meeting Scheduled',
  'Lost',
  'Other',
];

const getStatusBadgeStyle = (val) => {
  const s = String(val || '').toLowerCase().trim();
  if (s === 'connected') return 'bg-sky-50 text-sky-700 border-sky-300 focus:ring-sky-400';
  if (s === 'interested') return 'bg-emerald-50 text-emerald-700 border-emerald-300 focus:ring-emerald-400';
  if (s === 'not interested' || s === 'notinterested' || s === 'lost') return 'bg-rose-50 text-rose-700 border-rose-300 focus:ring-rose-400';
  if (s.includes('converted')) return 'bg-teal-50 text-teal-700 border-teal-300 focus:ring-teal-400';
  if (s.includes('turn up') || s.includes('not picking') || s.includes('callback') || s.includes('rnr')) return 'bg-amber-50 text-amber-700 border-amber-300 focus:ring-amber-400';
  if (s === 'meeting scheduled') return 'bg-purple-50 text-purple-700 border-purple-300 focus:ring-purple-400';
  if (s === 'new') return 'bg-blue-50 text-blue-700 border-blue-300 focus:ring-blue-400';
  return 'bg-slate-50 text-slate-700 border-slate-300 focus:ring-slate-400';
};

let cachedSenderAccounts = null;
let senderAccountsPromise = null;

const getSenderAccountsMap = async () => {
  if (cachedSenderAccounts) return cachedSenderAccounts;
  if (!senderAccountsPromise) {
    senderAccountsPromise = crmEmailTemplateService
      .getSenders()
      .then((res) => {
        const sData = res && (res.accounts || res.platformOption) ? res : res?.data || {};
        const map = new Map();
        if (sData.platformOption) {
          map.set('platform', {
            id: 'platform',
            fromName: sData.platformOption.fromName || 'TalentCIO Platform',
            fromAddress: sData.platformOption.fromAddress || 'no-reply@talentcio.in',
          });
        }
        if (Array.isArray(sData.accounts)) {
          sData.accounts.forEach((acc) => {
            const accId = String(acc._id || '');
            const fromName = acc.fromName || acc.name || 'Sales Representative';
            const fromAddress = acc.fromAddress || acc.email || '';
            if (accId) {
              map.set(accId, { id: accId, fromName, fromAddress });
            }
            if (fromAddress) {
              map.set(fromAddress.toLowerCase(), { id: accId, fromName, fromAddress });
            }
          });
        }
        cachedSenderAccounts = map;
        return map;
      })
      .catch(() => {
        cachedSenderAccounts = new Map();
        return cachedSenderAccounts;
      });
  }
  return senderAccountsPromise;
};

const parseEmailActivity = (act, senderAccountsMap = cachedSenderAccounts) => {
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
    const toMatch = desc.match(/To:\s*([^\n]+)/i);
    if (toMatch) {
      to = toMatch[1].trim();
    }
  }

  // 1. Direct fields in metadata
  let senderEmail = metadata.fromEmail || metadata.fromAddress || metadata.senderEmail || '';
  let senderName = metadata.fromName || metadata.senderName || '';

  // 2. Parse metadata.from if string formatted e.g. "Name <email@domain.com>" or "email@domain.com"
  if (metadata.from && typeof metadata.from === 'string') {
    const bracketMatch = metadata.from.match(/^(?:([^<]+)\s*)?<([^>]+)>$/);
    if (bracketMatch) {
      if (!senderName) senderName = bracketMatch[1]?.trim() || '';
      if (!senderEmail) senderEmail = bracketMatch[2]?.trim() || '';
    } else if (metadata.from.includes('@') && !senderEmail) {
      senderEmail = metadata.from.trim();
    }
  }

  // 3. Lookup via metadata.emailAccountId against registered senders
  if ((!senderEmail || !senderName) && metadata.emailAccountId) {
    const accIdStr = String(metadata.emailAccountId);
    if (senderAccountsMap && senderAccountsMap.has(accIdStr)) {
      const acc = senderAccountsMap.get(accIdStr);
      if (!senderEmail) senderEmail = acc.fromAddress || '';
      if (!senderName) senderName = acc.fromName || '';
    } else if (accIdStr === 'platform') {
      if (!senderEmail) senderEmail = 'no-reply@talentcio.in';
      if (!senderName) senderName = 'TalentCIO Platform';
    }
  }

  // 4. Try parsing "From: Name <email>" from description if available
  if ((!senderEmail || !senderName) && desc.includes('From:')) {
    const fromMatch = desc.match(/From:\s*([^\n]+)/i);
    if (fromMatch) {
      const fromLine = fromMatch[1].trim();
      const bracketMatch = fromLine.match(/^(?:([^<]+)\s*)?<([^>]+)>$/);
      if (bracketMatch) {
        if (!senderName) senderName = bracketMatch[1]?.trim() || '';
        if (!senderEmail) senderEmail = bracketMatch[2]?.trim() || '';
      } else if (fromLine.includes('@') && !senderEmail) {
        senderEmail = fromLine;
      }
    }
  }

  // Who logged or dispatched the action (logged-in user)
  const dispatchedByName =
    act.performedByName ||
    act.performedBy?.name ||
    (act.performedBy ? `${act.performedBy.firstName || ''} ${act.performedBy.lastName || ''}`.trim() : '') ||
    '';
  const dispatchedByEmail = act.performedBy?.email || '';

  // Fallbacks if sender account not resolved
  if (!senderEmail) {
    senderEmail = dispatchedByEmail;
  }
  if (!senderName) {
    senderName = dispatchedByName || 'Representative';
  }

  // Clean body and strip leading From: / To: headers if present in raw description
  let cleanBody = plainBody || '';
  if (!cleanBody) {
    let raw = desc;
    raw = raw.replace(/^(?:From:[^\n]*\r?\n)?(?:To:[^\n]*\r?\n)+(?:\r?\n)*/i, '');
    if (raw.startsWith('From:') || raw.startsWith('To:')) {
      const parts = raw.split(/\n\s*\n/);
      if (parts.length > 1) {
        raw = parts.slice(1).join('\n\n');
      } else {
        raw = raw.replace(/^(?:From:[^\n]*\r?\n)?(?:To:[^\n]*\r?\n)?/, '');
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

  // Extract attachments from all potential sources (act, metadata, files, or description fallback)
  let rawAttachments =
    act.attachments ||
    metadata.attachments ||
    metadata.attachmentFileNames ||
    metadata.files ||
    [];

  if ((!rawAttachments || rawAttachments.length === 0) && typeof metadata.get === 'function') {
    rawAttachments = metadata.get('attachments') || metadata.get('attachmentFileNames') || [];
  }

  if ((!rawAttachments || rawAttachments.length === 0) && (desc.includes('Attachment') || plainBody.includes('Attachment'))) {
    const attachSource = desc.includes('Attachment') ? desc : plainBody;
    const attachMatch = attachSource.match(/Attachments?(?:\s*\(\d+\))?:\s*([^\n\r]+)/i);
    if (attachMatch && attachMatch[1]) {
      rawAttachments = attachMatch[1]
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
    }
  }

  // Clean trailing attachment notes from cleanBody preview
  if (cleanBody) {
    cleanBody = cleanBody.replace(/\n*Attachments?(?:\s*\(\d+\))?:\s*[^\n\r]+/gi, '').trim();
  }

  const cleanFileName = (str = '') => {
    return String(str || '')
      .replace(/â€“/g, '–')
      .replace(/â€”/g, '—')
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"')
      .replace(/Â/g, '')
      .trim();
  };

  const attachments = Array.isArray(rawAttachments)
    ? rawAttachments
        .map((att) => {
          if (!att) return null;
          if (typeof att === 'string') {
            const fname = cleanFileName(att);
            return {
              filename: fname,
              name: fname,
              url: '',
              size: null,
            };
          }
          const rawFname = att.filename || att.name || att.originalname || 'Attachment';
          const fname = cleanFileName(rawFname);
          return {
            filename: fname,
            name: fname,
            url: att.url || att.path || att.cloudinaryUrl || '',
            size: att.size || null,
            contentType: att.contentType || att.mimetype || '',
          };
        })
        .filter(Boolean)
    : [];

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
    dispatchedByName,
    dispatchedByEmail,
    sentAt: act.performedAt || act.createdAt,
    status: act.outcome || 'Sent',
    attachments,
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
  const [highlightedActivityId, setHighlightedActivityId] = useState(focusedActivityId);
  const [, setSenderAccountsLoaded] = useState(0);

  useEffect(() => {
    getSenderAccountsMap().then(() => {
      setSenderAccountsLoaded((c) => c + 1);
    });
  }, []);

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

  // Status Change Modal state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatusValue, setNewStatusValue] = useState('');
  const [statusChangeNote, setStatusChangeNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Edit Contacts Modal state
  const [isEditContactsModalOpen, setIsEditContactsModalOpen] = useState(false);
  const [editContactsList, setEditContactsList] = useState([]);
  const [isSavingContacts, setIsSavingContacts] = useState(false);

  const handleOpenEditContacts = () => {
    const existing = Array.isArray(record?.contacts) && record.contacts.length > 0
      ? record.contacts.map((c, i) => ({
          contactPerson: c.contactPerson || '',
          designation: c.designation || '',
          mobileNo: c.mobileNo || '',
          emailId: c.emailId || '',
          isPrimary: c.isPrimary !== undefined ? Boolean(c.isPrimary) : i === 0,
        }))
      : [{
          contactPerson: record?.contactPerson || '',
          designation: record?.designation || '',
          mobileNo: record?.mobileNo || record?.phone || '',
          emailId: record?.emailId || record?.email || '',
          isPrimary: true,
        }];

    setEditContactsList(existing);
    setIsEditContactsModalOpen(true);
  };

  const handleAddEditContact = () => {
    setEditContactsList((prev) => [
      ...prev,
      { contactPerson: '', designation: '', mobileNo: '', emailId: '', isPrimary: false },
    ]);
  };

  const handleUpdateContactEntry = (index, field, value) => {
    setEditContactsList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSetPrimaryContact = (index) => {
    setEditContactsList((prev) =>
      prev.map((c, i) => ({ ...c, isPrimary: i === index }))
    );
  };

  const handleRemoveContactEntry = (index) => {
    setEditContactsList((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((c) => c.isPrimary)) {
        next[0].isPrimary = true;
      }
      return next;
    });
  };

  const handleSaveContacts = async (e) => {
    if (e) e.preventDefault();
    const targetId = record?._id || record?.id;
    if (!targetId) return;

    setIsSavingContacts(true);
    try {
      const cleaned = editContactsList
        .map((c) => ({
          contactPerson: (c.contactPerson || '').trim(),
          designation: (c.designation || '').trim(),
          mobileNo: (c.mobileNo || '').trim(),
          emailId: (c.emailId || '').trim(),
          isPrimary: Boolean(c.isPrimary),
        }))
        .filter((c) => c.contactPerson || c.mobileNo || c.emailId || c.designation);

      const finalContacts = cleaned.length > 0 ? cleaned : [{
        contactPerson: (editContactsList[0]?.contactPerson || '').trim(),
        designation: (editContactsList[0]?.designation || '').trim(),
        mobileNo: (editContactsList[0]?.mobileNo || '').trim(),
        emailId: (editContactsList[0]?.emailId || '').trim(),
        isPrimary: true,
      }];

      if (!finalContacts.some((c) => c.isPrimary)) {
        finalContacts[0].isPrimary = true;
      }

      const primary = finalContacts.find((c) => c.isPrimary) || finalContacts[0];

      const updatedRecord = {
        ...record,
        contactPerson: primary.contactPerson || '',
        designation: primary.designation || '',
        mobileNo: primary.mobileNo || '',
        emailId: primary.emailId || '',
        contacts: finalContacts,
      };

      await dataService.syncImportData([updatedRecord]);
      setRecord(updatedRecord);
      if (onUpdateRecordRef.current) {
        onUpdateRecordRef.current(updatedRecord);
      }
      window.dispatchEvent(new CustomEvent('crm:import-data-updated'));
      toast.success('Contact details updated successfully!');
      setIsEditContactsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to update contact details');
    } finally {
      setIsSavingContacts(false);
    }
  };

  // Edit Activity Modal state
  const [editingActivity, setEditingActivity] = useState(null);
  const [isEditActivityModalOpen, setIsEditActivityModalOpen] = useState(false);
  const [isUpdatingActivity, setIsUpdatingActivity] = useState(false);
  const [editFormData, setEditFormData] = useState({
    callType: 'Cold Call',
    customCallType: '',
    durationMinutes: 0,
    outcome: 'Connected - Interested',
    customOutcome: '',
    description: '',
    contactPerson: '',
    contactPhone: '',
    contactDesignation: '',
    contactPersons: [],
  });

  const handleOpenEditActivity = (act) => {
    const rawPersons = (act.contactPersons && act.contactPersons.length > 0)
      ? act.contactPersons
      : (act.metadata?.contactPersons || []);

    const mappedPersons = rawPersons.map((p) => {
      const isCustomCallType = p.callType && ![
        'Cold Call', 'Discovery / Pitch', 'Follow-up Call', 'Demo Scheduled',
        'Commercial Negotiation', 'Closing Call', 'Account Check-in',
        'Gatekeeper Inquiry', 'Payment Follow-up'
      ].includes(p.callType);

      const isCustomOutcome = p.outcome && ![
        'Connected - Interested', 'Connected - Follow-up Requested', 'Connected - Demo Scheduled',
        'Connected - Shared Info on WhatsApp', 'Connected - Not Interested', 'Connected - Gatekeeper Blocked',
        'No Answer / Ringing', 'Busy / Call Dropped', 'Wrong Number / Invalid'
      ].includes(p.outcome);

      return {
        name: p.name || '',
        designation: p.designation || '',
        phone: p.phone || '',
        email: p.email || '',
        callType: isCustomCallType ? 'Other' : (p.callType || 'Cold Call'),
        customCallType: isCustomCallType ? p.callType : '',
        durationMinutes: p.durationMinutes ?? 0,
        outcome: isCustomOutcome ? 'Other' : (p.outcome || 'Connected - Interested'),
        customOutcome: isCustomOutcome ? p.outcome : '',
        notes: p.notes || '',
      };
    });

    const isRootCustomCallType = act.callType && ![
      'Cold Call', 'Discovery / Pitch', 'Follow-up Call', 'Demo Scheduled',
      'Commercial Negotiation', 'Closing Call', 'Account Check-in',
      'Gatekeeper Inquiry', 'Payment Follow-up'
    ].includes(act.callType);

    const isRootCustomOutcome = act.outcome && ![
      'Connected - Interested', 'Connected - Follow-up Requested', 'Connected - Demo Scheduled',
      'Connected - Shared Info on WhatsApp', 'Connected - Not Interested', 'Connected - Gatekeeper Blocked',
      'No Answer / Ringing', 'Busy / Call Dropped', 'Wrong Number / Invalid'
    ].includes(act.outcome);

    setEditingActivity(act);
    setEditFormData({
      callType: isRootCustomCallType ? 'Other' : (act.callType || 'Cold Call'),
      customCallType: isRootCustomCallType ? act.callType : '',
      durationMinutes: act.durationMinutes || 0,
      outcome: isRootCustomOutcome ? 'Other' : (act.outcome || 'Connected - Interested'),
      customOutcome: isRootCustomOutcome ? act.outcome : '',
      description: act.description || '',
      contactPerson: act.contactPerson || '',
      contactPhone: act.contactPhone || '',
      contactDesignation: act.contactDesignation || '',
      contactPersons: mappedPersons,
    });
    setIsEditActivityModalOpen(true);
  };

  const handleSaveActivityEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editingActivity?._id) return;
    setIsUpdatingActivity(true);

    try {
      let resolvedPersons = [];
      let totalDuration = 0;
      let finalDescription = editFormData.description;
      let finalCallType = editFormData.callType === 'Other' ? (editFormData.customCallType?.trim() || 'Other') : editFormData.callType;
      let finalOutcome = editFormData.outcome === 'Other' ? (editFormData.customOutcome?.trim() || 'Other') : editFormData.outcome;

      if (editFormData.contactPersons && editFormData.contactPersons.length > 0) {
        resolvedPersons = editFormData.contactPersons.map((p) => {
          const cType = p.callType === 'Other' ? (p.customCallType?.trim() || 'Other') : (p.callType || 'Cold Call');
          const cOutcome = p.outcome === 'Other' ? (p.customOutcome?.trim() || 'Other') : (p.outcome || 'Connected - Interested');
          const dur = Number(p.durationMinutes) || 0;
          totalDuration += dur;
          return {
            name: (p.name || '').trim(),
            designation: (p.designation || '').trim(),
            phone: (p.phone || '').trim(),
            email: (p.email || '').trim(),
            callType: cType,
            durationMinutes: dur,
            outcome: cOutcome,
            notes: (p.notes || '').trim(),
          };
        });

        if (resolvedPersons.length > 1) {
          finalDescription = resolvedPersons
            .map((c, idx) => {
              const header = `[Person ${idx + 1}: ${c.name}${c.designation ? ` (${c.designation})` : ''} • ${c.callType} • ${c.durationMinutes}m • ${c.outcome}]`;
              return `${header}\n${c.notes || 'No specific notes recorded.'}`;
            })
            .join('\n\n');
        } else if (resolvedPersons.length === 1) {
          finalDescription = resolvedPersons[0].notes || '';
          finalCallType = resolvedPersons[0].callType;
          finalOutcome = resolvedPersons[0].outcome;
        }
      } else {
        totalDuration = Number(editFormData.durationMinutes) || 0;
      }

      const updatePayload = {
        callType: finalCallType,
        outcome: finalOutcome,
        durationMinutes: totalDuration,
        description: finalDescription,
        contactPerson: editFormData.contactPerson,
        contactPhone: editFormData.contactPhone,
        contactDesignation: editFormData.contactDesignation,
        contactPersons: resolvedPersons,
      };

      const res = await dataService.updateImportDataActivity(editingActivity._id, updatePayload);
      if (res?.success || res?.data) {
        toast.success('Call activity updated successfully');
        setIsEditActivityModalOpen(false);

        const updatedAct = res.data || { ...editingActivity, ...updatePayload };
        setActivities((prev) =>
          prev.map((a) => (a._id === editingActivity._id ? { ...a, ...updatedAct } : a))
        );

        if (selectedCallActivity && selectedCallActivity._id === editingActivity._id) {
          setSelectedCallActivity((prev) => ({ ...prev, ...updatedAct }));
        }

        loadActivitiesAndFollowUps();
      } else {
        toast.error(res?.message || 'Failed to update activity');
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to update activity');
    } finally {
      setIsUpdatingActivity(false);
    }
  };

  const handleUpdateEditPerson = (idx, field, value) => {
    setEditFormData((prev) => {
      const updated = [...(prev.contactPersons || [])];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, contactPersons: updated };
    });
  };

  const handleAddEditPerson = () => {
    setEditFormData((prev) => ({
      ...prev,
      contactPersons: [
        ...(prev.contactPersons || []),
        {
          name: '',
          designation: '',
          phone: '',
          email: '',
          callType: 'Cold Call',
          customCallType: '',
          durationMinutes: 2,
          outcome: 'Connected - Interested',
          customOutcome: '',
          notes: '',
        },
      ],
    }));
  };

  const handleRemoveEditPerson = (idx) => {
    setEditFormData((prev) => ({
      ...prev,
      contactPersons: (prev.contactPersons || []).filter((_, i) => i !== idx),
    }));
  };

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
  }, [initialRecord, initialRecordId]);

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

  const handleOpenStatusModal = (targetStatus) => {
    if (targetStatus === 'Converted to Lead') {
      if (onConvert) onConvert();
      return;
    }
    setNewStatusValue(targetStatus || record?.status || record?.leadStatus || 'New');
    setStatusChangeNote('');
    setIsStatusModalOpen(true);
  };

  const handleConfirmStatusChange = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newStatusValue) return;

    if (newStatusValue === 'Converted to Lead') {
      setIsStatusModalOpen(false);
      if (onConvert) onConvert();
      return;
    }

    const oldStatus = record?.status || record?.leadStatus || 'New';
    const rowId = record?._id || record?.id;

    setIsUpdatingStatus(true);
    const nowIso = new Date().toISOString();
    const newEntry = {
      status: newStatusValue,
      previousStatus: oldStatus,
      changedAt: nowIso,
      changedBy: 'You',
      note: statusChangeNote.trim(),
    };

    const existingHistory = Array.isArray(record?.statusHistory) ? [...record.statusHistory] : [];
    if (existingHistory.length === 0 && oldStatus && oldStatus !== newStatusValue) {
      existingHistory.push({
        status: oldStatus,
        previousStatus: '',
        changedAt: record?.createdAt || record?.date || nowIso,
        changedBy: record?.importedBy || 'Initial Import',
        note: 'Initial status on data import',
      });
    }
    existingHistory.push(newEntry);

    const updatedRecord = {
      ...record,
      status: newStatusValue,
      leadStatus: newStatusValue,
      updatedAt: nowIso,
      statusHistory: existingHistory,
    };
    setRecord(updatedRecord);

    if (onUpdateRecordRef.current) {
      onUpdateRecordRef.current(updatedRecord);
    }

    try {
      const res = await dataService.updateImportDataStatus(rowId, newStatusValue, statusChangeNote.trim());
      if (res?.data?.statusHistory) {
        setRecord((prev) => ({
          ...prev,
          statusHistory: res.data.statusHistory,
        }));
      }
      toast.success(`Status updated to "${newStatusValue}"`);
      setIsStatusModalOpen(false);
      loadActivitiesAndFollowUps();
    } catch (err) {
      console.error('Failed to update status on server:', err);
      toast.error('Failed to update status on server');
    } finally {
      setIsUpdatingStatus(false);
    }
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

  const upcomingFollowUp = followUps.find((f) => f.status === 'scheduled') || null;

  return (
    <div className="space-y-5">
      {/* Top Navigation & Action Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
          {/* Left: Back Arrow, Company Name & Primary Identifiers */}
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={onBack}
              className="mt-0.5 w-7.5 h-7.5 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer shrink-0 transition shadow-2xs"
              title="Back to Database table"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug">
                  {record?.companyName || 'Company Prospect'}
                </h1>

                {/* Status Selector Dropdown Badge */}
                <div className="relative inline-flex items-center">
                  <select
                    value={record?.status || record?.leadStatus || 'New'}
                    onChange={(e) => handleOpenStatusModal(e.target.value)}
                    className={`appearance-none inline-flex items-center pl-2.5 pr-6 py-0.5 rounded-full text-[10.5px] font-bold border cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-offset-1 shadow-2xs ${getStatusBadgeStyle(
                      record?.status || record?.leadStatus || 'New'
                    )}`}
                    title="Click to change company status / interest"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-white text-slate-800 text-xs font-normal">
                        {opt}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none opacity-60" />
                </div>

                {record?.isConvertedToLead ? (
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('leads')}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0 hover:bg-emerald-100 transition cursor-pointer"
                    title="View in CRM Leads"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Converted to CRM Lead →</span>
                  </button>
                ) : record?.isDuplicate ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 shrink-0">
                    <AlertCircle className="w-3 h-3 text-rose-500" />
                    Duplicate Record
                  </span>
                ) : null}

                {record?.rating && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 shrink-0">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{record.rating}</span>
                  </span>
                )}
              </div>

              {/* Sub-row: Industry, Source, GSTIN, Reg Date Tags */}
              <div className="flex items-center gap-1.5 flex-wrap text-[10.5px]">
                {record?.industry && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200/80">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>{record.industry}</span>
                  </span>
                )}
                {(record?.source || record?.leadSource) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-200/70">
                    <span>Source: {record?.source || record?.leadSource}</span>
                  </span>
                )}
                {record?.gstin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 font-mono border border-slate-200/70" title="GSTIN">
                    <span className="text-slate-400 font-sans font-medium text-[9.5px]">GSTIN:</span>
                    <span className="font-semibold">{record.gstin}</span>
                  </span>
                )}
                {record?.dateOfRegistration && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 font-mono border border-slate-200/70" title="Date of Registration">
                    <span className="text-slate-400 font-sans font-medium text-[9.5px]">Reg. Date:</span>
                    <span className="font-semibold">{record.dateOfRegistration}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Quick Actions Toolbar - Strictly Unified Height (h-8) and Seamless Alignment */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0 pt-1 lg:pt-0">
            {!record?.isConvertedToLead && (
              <button
                type="button"
                onClick={onConvert}
                className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Convert this prospect to an active CRM Lead"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Convert Lead</span>
              </button>
            )}

            {/* Communication Group */}
            <div className="inline-flex items-center h-8 rounded-xl border border-slate-200/90 bg-white p-0.5 shadow-2xs shrink-0 divide-x divide-slate-100">
              <button
                type="button"
                onClick={() => handleOpenOutreach('call')}
                className="h-full inline-flex items-center gap-1.5 px-2.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                title="Log / Dial Call"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Call</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenOutreach('whatsapp')}
                className="h-full inline-flex items-center gap-1.5 px-2.5 text-xs font-semibold text-slate-700 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                title="Open WhatsApp Web & Log"
              >
                <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenOutreach('email')}
                className="h-full inline-flex items-center gap-1.5 px-2.5 text-xs font-semibold text-slate-700 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                title="Send Email & Log"
              >
                <Mail className="w-3.5 h-3.5 text-sky-600" />
                <span>Email</span>
              </button>
            </div>

            {/* Follow-up Action */}
            <button
              type="button"
              onClick={() => handleOpenOutreach('followup')}
              className="h-8 inline-flex items-center gap-1.5 px-3 text-xs font-semibold text-slate-700 hover:text-violet-700 hover:bg-violet-50 rounded-xl border border-slate-200/90 bg-white shadow-2xs transition-colors whitespace-nowrap cursor-pointer shrink-0"
              title="Schedule Follow-up"
            >
              <Clock className="w-3.5 h-3.5 text-violet-600" />
              <span>Follow-up</span>
            </button>

            {/* Manage Group */}
            {((onEdit && !record.isConvertedToLead) || (onDelete && !record.isConvertedToLead)) && (
              <div className="inline-flex items-center h-8 rounded-xl border border-slate-200/90 bg-white p-0.5 shadow-2xs shrink-0 divide-x divide-slate-100">
                {onEdit && !record.isConvertedToLead && (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="h-full inline-flex items-center gap-1 px-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
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
                    className="h-full inline-flex items-center gap-1 px-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    title="Move to Recycle Bin"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Engagement & Audit Metadata Strip */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2.5 text-[10.5px] text-slate-500">
          <div className="flex items-center gap-2.5 flex-wrap">
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
              <span className="text-slate-400">
                Imported by <strong className="text-slate-600 font-semibold">{record.importedBy}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200">
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
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <DetailOverviewTab
          record={record}
          cleanPhone={cleanPhone}
          activities={activities}
          displayedActivities={displayedActivities}
          isLoadingTimeline={isLoadingTimeline}
          upcomingFollowUp={upcomingFollowUp}
          channelFilter={channelFilter}
          handleChannelFilterChange={handleChannelFilterChange}
          callsCount={callsCount}
          whatsAppCount={whatsAppCount}
          emailsCount={emailsCount}
          totalTouches={totalTouches}
          paginationInfo={paginationInfo}
          currentPage={currentPage}
          pageSize={pageSize}
          handlePageChange={handlePageChange}
          handlePageSizeChange={handlePageSizeChange}
          handleOpenOutreach={handleOpenOutreach}
          handleOpenEditActivity={handleOpenEditActivity}
          handleOpenEditContacts={handleOpenEditContacts}
          handleOpenStatusModal={handleOpenStatusModal}
          setSelectedEmailActivity={setSelectedEmailActivity}
          setSelectedCallActivity={setSelectedCallActivity}
          parseEmailActivity={parseEmailActivity}
          getStatusBadgeStyle={getStatusBadgeStyle}
        />
      )}

      {/* TAB 2: TIMELINE */}
      {activeTab === 'timeline' && (
        <DetailTimelineTab
          activities={activities}
          isLoadingTimeline={isLoadingTimeline}
          highlightedActivityId={highlightedActivityId || focusedActivityId}
          parseEmailActivity={parseEmailActivity}
          handleOpenOutreach={handleOpenOutreach}
          setSelectedEmailActivity={setSelectedEmailActivity}
        />
      )}

      {/* TAB 3: TASKS & FOLLOW-UPS */}
      {activeTab === 'tasks' && (
        <DetailTasksTab
          followUps={followUps}
          tasks={tasks}
          handleOpenOutreach={handleOpenOutreach}
          setIsTaskModalOpen={setIsTaskModalOpen}
          handleToggleTaskStatus={handleToggleTaskStatus}
          handleDeleteTask={handleDeleteTask}
        />
      )}

      {/* TAB 4: PERFORMANCE & TELEMETRY */}
      {activeTab === 'performance' && (
        <DetailPerformanceTab
          totalTouches={totalTouches}
          callsCount={callsCount}
          whatsAppCount={whatsAppCount}
          emailsCount={emailsCount}
        />
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
      <FullEmailDetailsModal
        isOpen={Boolean(selectedEmailActivity)}
        onClose={() => setSelectedEmailActivity(null)}
        activity={selectedEmailActivity}
        companyName={record.companyName || 'Prospect'}
        onReply={() => handleOpenOutreach('email')}
        parseEmailActivity={parseEmailActivity}
      />

      {/* Full Call Details Modal */}
      <FullCallDetailsModal
        isOpen={Boolean(selectedCallActivity)}
        onClose={() => setSelectedCallActivity(null)}
        activity={selectedCallActivity}
        companyName={record.companyName || 'Prospect'}
        onEditCall={(act) => handleOpenEditActivity(act)}
        onCallAgain={() => handleOpenOutreach('call')}
        record={record}
      />

      {/* Update Company Status Modal */}
      <StatusChangeModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        companyName={record?.companyName || 'Prospect'}
        currentStatus={record?.status || record?.leadStatus || 'New'}
        newStatusValue={newStatusValue}
        setNewStatusValue={setNewStatusValue}
        statusChangeNote={statusChangeNote}
        setStatusChangeNote={setStatusChangeNote}
        onConfirm={handleConfirmStatusChange}
        isUpdating={isUpdatingStatus}
        statusOptions={STATUS_OPTIONS}
        getStatusBadgeStyle={getStatusBadgeStyle}
      />

      {/* Edit Call Activity Modal */}
      <EditCallActivityModal
        isOpen={isEditActivityModalOpen && Boolean(editingActivity)}
        onClose={() => setIsEditActivityModalOpen(false)}
        companyName={record?.companyName || 'Prospect'}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        onSave={handleSaveActivityEdit}
        isUpdating={isUpdatingActivity}
        onAddPerson={handleAddEditPerson}
        onRemovePerson={handleRemoveEditPerson}
        onUpdatePerson={handleUpdateEditPerson}
      />

      {/* Edit Contacts Modal */}
      <EditContactsModal
        isOpen={isEditContactsModalOpen}
        onClose={() => !isSavingContacts && setIsEditContactsModalOpen(false)}
        companyName={record?.companyName || 'Company'}
        contactsList={editContactsList}
        onSave={handleSaveContacts}
        isSaving={isSavingContacts}
        onAddContact={handleAddEditContact}
        onRemoveContact={handleRemoveContactEntry}
        onUpdateContact={handleUpdateContactEntry}
        onSetPrimaryContact={handleSetPrimaryContact}
      />
      </div>
  );
};
