import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FileText, Download, Upload, CheckCircle, Clock, AlertCircle, Eye, Trash2, Settings2, HelpCircle, X, RefreshCw, FileSignature, Briefcase, UserCheck, ScrollText, Check, ChevronDown, ChevronUp, MoreVertical, FileDown, Layout, Type, UserPlus, Search, Filter, AlertTriangle, Users, Send, Square, CheckSquare, Mail, Edit2, Key, ArrowRightCircle } from 'lucide-react';
import { renderAsync } from 'docx-preview';
import { useAuth } from '../context/AuthContext';
import { createCachePayload, isCacheFresh, readSessionCache } from '../utils/cache';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { buildMasterSalaryStructure, buildPayrollSnapshot, PT_STATE_LIST } from '../utils/payroll';
import {
  ONBOARDING_EMAIL_TEMPLATE_PLACEHOLDERS,
  getSupportedPlaceholderTokens,
  renderTemplateBody,
  resolveTemplate,
  validateTemplateSyntax
} from '../utils/templatePlaceholders';

const ONBOARDING_EMPLOYEE_CACHE_TTL_MS = 20 * 1000;
const ONBOARDING_SETTINGS_CACHE_TTL_MS = 60 * 1000;
const CUSTOM_FILE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const CUSTOM_FILE_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,image/*';
const CUSTOM_FILE_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

const DEFAULT_ONBOARDING_EMAIL_SUBJECT = 'Action Required: Complete Your Pre-Onboarding';
const DEFAULT_ONBOARDING_EMAIL_BODY = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; margin:0 auto; border:1px solid #e2e8f0; border-radius:12px; background:#ffffff;">
  <tr>
    <td style="padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f172a;">
        <tr>
          <td align="center" style="padding:32px 24px 28px;">
            <div style="display:inline-block; background:#334155; color:#dbeafe; padding:8px 16px; border-radius:999px; font-size:12px; letter-spacing:1px; text-transform:uppercase; font-weight:600;">
              Pre-Onboarding Portal
            </div>
            <div style="height:20px; line-height:20px; font-size:20px;">&nbsp;</div>
            <div style="color:#ffffff; font-size:22px; line-height:28px; font-weight:700;">
              Action Required
            </div>
            <div style="height:12px; line-height:12px; font-size:12px;">&nbsp;</div>
            <div style="max-width:460px; margin:0 auto; color:#cbd5e1; font-size:14px; line-height:24px;">
              Complete your pending onboarding tasks and upload the requested information before your joining date.
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:32px;">
      <div style="color:#0f172a; font-size:18px; line-height:28px; font-weight:600; margin:0 0 12px;">
        Hello {{firstName}},
      </div>
      <div style="color:#475569; font-size:14px; line-height:26px; margin:0 0 28px;">
        Your HR team has shared a few onboarding requirements that need your attention. Please review the items below and complete them through your employee portal.
      </div>
      <div style="margin-bottom:22px;">{{credentialsSection}}</div>
      <div style="margin-bottom:22px;">{{requestedSectionsBlock}}</div>
      <div style="margin-bottom:22px;">{{requestedDocumentsBlock}}</div>
      <div style="margin-bottom:22px;">{{sharedFilesBlock}}</div>
      <div style="margin-bottom:30px;">{{deadlineBlock}}</div>
      <div style="text-align:center; margin-top:28px;">{{portalButton}}</div>
    </td>
  </tr>
  <tr>
    <td style="background:#f1f5f9; padding:16px; text-align:center; border-top:1px solid #e2e8f0;">
      <div style="margin:0 0 8px; color:#0f172a; font-size:14px; font-weight:600;">TalentCio</div>
      <div style="margin:0; color:#94a3b8; font-size:12px;">&copy; {{currentYear}} TalentCio. All rights reserved.</div>
    </td>
  </tr>
</table>
`;
const DEFAULT_ONBOARDING_TEMPLATE_OPTION = {
  _id: '',
  name: 'Default Onboarding Template',
  category: 'built_in',
  subject: DEFAULT_ONBOARDING_EMAIL_SUBJECT,
  htmlBody: DEFAULT_ONBOARDING_EMAIL_BODY
};

const STATUS_COLORS = {
  Pending: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  Accepted: { bg: '#ecfdf5', text: '#065f46', dot: '#10b981' },
  'In Progress': { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  Submitted: { bg: '#f0f9ff', text: '#0369a1', dot: '#0ea5e9' },
  Reviewed: { bg: '#ede9fe', text: '#5b21b6', dot: '#8b5cf6' }
};

const STATUS_ICONS = {
  Pending: <Clock size={16} />,
  Accepted: <Check size={16} />,
  'In Progress': <RefreshCw size={16} />,
  Submitted: <FileText size={16} />,
  Reviewed: <CheckCircle size={16} />
};

const STATUS_LABELS = {
  Reviewed: 'Transfer to Active User'
};

const isAllowedCustomFile = (file) => file?.type?.startsWith('image/') || CUSTOM_FILE_ALLOWED_MIME_TYPES.has(file?.type);

const Onboarding = () => {
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const isOnboardingAdmin = user?.roles?.some(role => ['Admin', 'Super Admin', 'System Admin'].includes(role)) || permissions.includes('*');
  const canViewOnboarding = isOnboardingAdmin
    || permissions.includes('onboarding.view')
    || permissions.includes('onboarding.document.review')
    || permissions.includes('onboarding.document.request')
    || permissions.includes('onboarding.credential.manage')
    || permissions.includes('onboarding.complete')
    || permissions.includes('onboarding.manage');
  const canRequestOnboarding = isOnboardingAdmin
    || permissions.includes('onboarding.document.request')
    || permissions.includes('onboarding.manage');
  const canReviewOnboarding = isOnboardingAdmin
    || permissions.includes('onboarding.document.review')
    || permissions.includes('onboarding.manage');
  const canManageOnboardingCredentials = isOnboardingAdmin
    || permissions.includes('onboarding.credential.manage')
    || permissions.includes('onboarding.manage');
  const canCompleteOnboarding = isOnboardingAdmin
    || permissions.includes('onboarding.complete')
    || permissions.includes('onboarding.manage');
  const canManageOnboardingSettings = canRequestOnboarding;
  const canEditEmployees = canRequestOnboarding || canManageOnboardingCredentials;
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ Pending: 0, Accepted: 0, 'In Progress': 0, Submitted: 0, Reviewed: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 1500);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('employees'); // 'employees' or 'settings'
  const [onboardingSettings, setOnboardingSettings] = useState({ offerLetterTemplateUrl: '', declarationTemplateUrl: '' });
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewType, setPreviewType] = useState('');
  const [previewBlob, setPreviewBlob] = useState(null);
  const previewContainerRef = useRef(null);
  const [checkedSections, setCheckedSections] = useState(new Set());
  const [checkedDocuments, setCheckedDocuments] = useState(new Set());
  const [sendingEmail, setSendingEmail] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [emailDeadline, setEmailDeadline] = useState('');
  const [emailSenderOptions, setEmailSenderOptions] = useState([]);
  const [selectedEmailAccountId, setSelectedEmailAccountId] = useState('platform');
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState('');
  const [customEmailSubject, setCustomEmailSubject] = useState(DEFAULT_ONBOARDING_EMAIL_SUBJECT);
  const [customEmailBody, setCustomEmailBody] = useState(DEFAULT_ONBOARDING_EMAIL_BODY);
  const [showEmailTemplateEditor, setShowEmailTemplateEditor] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [uploadingCustomFiles, setUploadingCustomFiles] = useState(false);
  const [showCustomFileUploader, setShowCustomFileUploader] = useState(false);
  const [customFiles, setCustomFiles] = useState([]);
  const customFileInputRef = useRef(null);
  const initialEmployeesFetchDoneRef = useRef(false);
  const initialSettingsFetchDoneRef = useRef(false);
  const [payrollConfig, setPayrollConfig] = useState(null);

  // Close menu when clicking outside or scrolling
  useEffect(() => {
    const handleClose = () => setActiveMenu(null);
    document.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    return () => {
      document.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, []);

  // Clear onboarding cache on mount/refresh to ensure fresh data loads on entry
  useEffect(() => {
    if (user?._id) {
      const prefix = `onboarding_employees_${user._id}_`;
      try {
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith(prefix)) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.error('Failed to clear onboarding cache on mount', e);
      }
    }
  }, [user?._id]);

  const toggleMenu = useCallback((e, employeeId) => {
    e.stopPropagation();
    if (activeMenu === employeeId) {
      setActiveMenu(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = 200; // estimated

      let positionStyles = {
        right: window.innerWidth - rect.right
      };

      if (spaceBelow < menuHeight && rect.top > menuHeight) {
        positionStyles.bottom = window.innerHeight - rect.top + 5;
      } else {
        positionStyles.top = rect.bottom + 5;
      }

      setMenuPosition(positionStyles);
      setActiveMenu(employeeId);
    }
  }, [activeMenu]);

  const toggleSection = (id) => setExpandedSections(p => ({ ...p, [id]: !p[id] }));

  const toggleCheckedSection = (label) => {
    setCheckedSections(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const toggleCheckedDocument = (label) => {
    setCheckedDocuments(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const getRequestedLabel = useCallback((item) => {
    if (typeof item === 'string') return item;
    return item?.label || '';
  }, []);

  const getDetailSections = useCallback((employee) => ([
    { id: 'personal', label: 'Personal Details', done: employee?.personalDetails?.isComplete, data: employee?.personalDetails },
    { id: 'emergency', label: 'Emergency Contact', done: employee?.emergencyContact?.isComplete, data: employee?.emergencyContact },
    { id: 'bank', label: 'Bank Details', done: employee?.bankDetails?.isComplete, data: employee?.bankDetails },
    { id: 'offer', label: 'Offer Declaration', done: employee?.offerDeclaration?.isComplete, data: employee?.offerDeclaration }
  ]), []);

  const getDetailDocuments = useCallback((employee) => {
    if (!employee) return [];

    const requestedDocuments = employee.requestedDocuments || [];
    const getRequestedDoc = (label) => requestedDocuments.find((entry) => getRequestedLabel(entry) === label);

    return [
      ...(employee.documents || [])
        .filter((d) => d.type !== 'custom_file')
        .map((d) => ({ ...d, itemType: 'document' })),
      ...(onboardingSettings.policies || []).map((policy) => {
        const req = getRequestedDoc(policy.name);
        return {
          label: policy.name,
          status: 'Policy',
          itemType: 'policy',
          _id: policy._id,
          isAccepted: (employee.offerDeclaration?.acceptedPolicies || []).some((acceptedPolicy) => acceptedPolicy.policyId === policy._id),
          emailSentAt: req?.emailSentAt,
          url: policy.url
        };
      }),
      ...(onboardingSettings.dynamicTemplates || []).map((template) => {
        const req = getRequestedDoc(template.name);
        return {
          label: template.name,
          status: 'Template',
          itemType: 'template',
          _id: template._id,
          isAccepted: (employee.offerDeclaration?.acceptedTemplates || []).some((acceptedTemplate) => acceptedTemplate.templateId === template._id),
          emailSentAt: req?.emailSentAt,
          url: template.url
        };
      }),
      ...(employee.documents || [])
        .filter((d) => d.type === 'custom_file')
        .map((d) => ({ ...d, itemType: 'document', isCustomSentFile: true }))
    ];
  }, [getRequestedLabel, onboardingSettings.dynamicTemplates, onboardingSettings.policies]);

  const detailSections = getDetailSections(selectedEmployee);
  const detailDocuments = getDetailDocuments(selectedEmployee);
  const allSectionLabels = detailSections.map((section) => section.label);
  const allDocumentLabels = detailDocuments.map((item) => item.label);
  const totalSelectableItems = allSectionLabels.length + allDocumentLabels.length;
  const selectedItemCount = checkedSections.size + checkedDocuments.size;
  const allItemsSelected = totalSelectableItems > 0 && selectedItemCount === totalSelectableItems;
  const templatePlaceholderHelp = getSupportedPlaceholderTokens(ONBOARDING_EMAIL_TEMPLATE_PLACEHOLDERS).join(', ');
  const previewSectionItems = Array.from(checkedSections);
  const previewDocumentItems = Array.from(checkedDocuments);
  const previewSharedFiles = detailDocuments
    .filter((item) => item.isCustomSentFile && checkedDocuments.has(item.label))
    .map((item) => item.label);
  const previewCredentialsSection = `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="color: #1e293b; font-size: 15px; margin: 0 0 12px; font-weight: 700;">Your Login Credentials</h3>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Employee ID:</strong> <code style="background: #e0e7ff; padding: 2px 8px; border-radius: 4px; font-size: 16px;">${selectedEmployee?.tempEmployeeId || 'EMP-2026-0001'}</code></p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background: #e0e7ff; padding: 2px 8px; border-radius: 4px; font-size: 16px;">TempPass01</code></p>
      <p style="margin: 12px 0 0; font-size: 13px; color: #dc2626;"><strong>Credentials Expire On:</strong> ${emailDeadline || '10 Jun 2026'}</p>
      <p style="color: #64748b; font-size: 12px; margin-top: 8px;">You will be asked to change your password on first login. Please keep these credentials secure.</p>
    </div>
  `;
  const previewSectionsBlock = previewSectionItems.length > 0 ? `
    <div style="margin-bottom: 24px;">
      <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">Forms to Complete</h3>
      <ul style="margin: 0; padding: 0 0 0 20px; color: #334155;">
        ${previewSectionItems.map((item) => `<li style="padding: 6px 0; font-size: 14px;">${item}</li>`).join('')}
      </ul>
    </div>
  ` : '';
  const previewDocumentsBlock = previewDocumentItems.length > 0 ? `
    <div style="margin-bottom: 24px;">
      <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #8b5cf6; padding-bottom: 8px;">Items to Complete</h3>
      <ul style="margin: 0; padding: 0 0 0 20px; color: #334155;">
        ${previewDocumentItems.map((item) => `<li style="padding: 6px 0; font-size: 14px;">${item}</li>`).join('')}
      </ul>
    </div>
  ` : '';
  const previewSharedFilesBlock = previewSharedFiles.length > 0 ? `
    <div style="margin-bottom: 24px;">
      <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #0ea5e9; padding-bottom: 8px;">Files Shared by HR</h3>
      <ul style="margin: 0; padding: 0 0 0 20px; color: #334155;">
        ${previewSharedFiles.map((item) => `<li style="padding: 6px 0; font-size: 14px;">${item}</li>`).join('')}
      </ul>
      <p style="margin: 10px 0 0; font-size: 12px; color: #0369a1;">These files are attached with this email for your reference.</p>
    </div>
  ` : '';
  const previewDeadlineBlock = `
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; margin: 20px 0; font-size: 13px; color: #92400e;">
      <strong>Submission Deadline:</strong> ${emailDeadline || '10 Jun 2026'}
    </div>
  `;
  const previewPortalButton = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
  <tr>
    <td bgcolor="#2563eb" style="border-radius:8px; text-align:center;">
      <a href="${window.location.origin}/pre-onboarding/login" style="display:inline-block; padding:14px 32px; color:#ffffff; text-decoration:none; font-size:15px; font-weight:700;">Open Portal</a>
    </td>
  </tr>
</table>`;
  const onboardingPreviewData = {
    candidateName: `${selectedEmployee?.firstName || ''} ${selectedEmployee?.lastName || ''}`.trim() || 'Sarthak',
    firstName: selectedEmployee?.firstName || 'Sarthak',
    lastName: selectedEmployee?.lastName || 'Sharma',
    fullName: `${selectedEmployee?.firstName || ''} ${selectedEmployee?.lastName || ''}`.trim() || 'Sarthak Sharma',
    email: selectedEmployee?.email || 'sarthak@example.com',
    phone: selectedEmployee?.phone || '9876543210',
    mobile: selectedEmployee?.phone || '9876543210',
    jobTitle: selectedEmployee?.designation || 'Software Engineer',
    designation: selectedEmployee?.designation || 'Software Engineer',
    client: '',
    department: selectedEmployee?.department || 'Engineering',
    offerDate: selectedEmployee?.offerDate ? new Date(selectedEmployee.offerDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '10 Jun 2026',
    dateOfOffer: selectedEmployee?.offerDate ? new Date(selectedEmployee.offerDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '10 Jun 2026',
    workLocation: selectedEmployee?.workLocation || 'Bengaluru',
    employmentDetails: [
      selectedEmployee?.designation || 'Software Engineer',
      selectedEmployee?.department || 'Engineering',
      selectedEmployee?.workLocation || 'Bengaluru'
    ].filter(Boolean).join(' | '),
    recruiterName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'HR Team',
    companyName: user?.company?.name || 'Your Company',
    requestId: selectedEmployee?.tempEmployeeId || 'EMP-2026-0001',
    currentStatus: selectedEmployee?.status || 'Pending',
    interviewDate: '',
    interviewLink: '',
    customNote: '',
    employeeFirstName: selectedEmployee?.firstName || 'Sarthak',
    employeeFullName: `${selectedEmployee?.firstName || ''} ${selectedEmployee?.lastName || ''}`.trim() || 'Sarthak Sharma',
    employeeId: selectedEmployee?.tempEmployeeId || 'EMP-2026-0001',
    joiningDate: selectedEmployee?.joiningDate ? new Date(selectedEmployee.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '15 Jun 2026',
    submissionDeadline: emailDeadline || '2026-06-10',
    portalLink: `${window.location.origin}/pre-onboarding/login`,
    credentialsSection: previewCredentialsSection,
    requestedSectionsBlock: previewSectionsBlock,
    requestedDocumentsBlock: previewDocumentsBlock,
    sharedFilesBlock: previewSharedFilesBlock,
    deadlineBlock: previewDeadlineBlock,
    portalButton: previewPortalButton,
    currentYear: String(new Date().getFullYear())
  };
  const onboardingPreviewSubject = resolveTemplate(customEmailSubject, onboardingPreviewData);
  const onboardingPreviewHtml = renderTemplateBody(customEmailBody, onboardingPreviewData);
  const onboardingTemplateOptions = useMemo(
    () => [DEFAULT_ONBOARDING_TEMPLATE_OPTION, ...emailTemplates],
    [emailTemplates]
  );
  const totalOnboardingCount = useMemo(
    () => Object.values(stats || {}).reduce((sum, value) => sum + Number(value || 0), 0),
    [stats]
  );

  const applyEmailTemplateDraft = useCallback((templateId, templates, draftSubject = '', draftBody = '') => {
    const selectedTemplate = (templates || []).find((template) => template._id === templateId);
    setSelectedEmailTemplateId(templateId || '');
    setCustomEmailSubject(draftSubject || selectedTemplate?.subject || DEFAULT_ONBOARDING_EMAIL_SUBJECT);
    setCustomEmailBody(draftBody || selectedTemplate?.htmlBody || DEFAULT_ONBOARDING_EMAIL_BODY);
  }, []);

  const handleSelectAllItems = useCallback(() => {
    setCheckedSections(new Set(allSectionLabels));
    setCheckedDocuments(new Set(allDocumentLabels));
  }, [allDocumentLabels, allSectionLabels]);

  const handleClearAllItems = useCallback(() => {
    setCheckedSections(new Set());
    setCheckedDocuments(new Set());
  }, []);

  const handleSelectPhase1 = useCallback(() => {
    const phase1Sections = ['Personal Details'];
    const phase1Docs = [
      'Aadhaar Card (Front)',
      'Aadhaar Card (Back)',
      'PAN Card',
      'Pan Card',
      '10th Marksheet / Certificate',
      '12th Marksheet / Certificate',
      'Graduation Marksheet / Certificate'
    ];
    const sectionsToSelect = allSectionLabels.filter(label => phase1Sections.includes(label));
    const docsToSelect = allDocumentLabels.filter(label => phase1Docs.includes(label));
    setCheckedSections(new Set(sectionsToSelect));
    setCheckedDocuments(new Set(docsToSelect));
  }, [allDocumentLabels, allSectionLabels]);

  const handleSelectPhase2 = useCallback(() => {
    const phase1Sections = ['Personal Details'];
    const phase1Docs = [
      'Aadhaar Card (Front)',
      'Aadhaar Card (Back)',
      'PAN Card',
      'Pan Card',
      '10th Marksheet / Certificate',
      '12th Marksheet / Certificate',
      'Graduation Marksheet / Certificate'
    ];
    const sectionsToSelect = allSectionLabels.filter(label => !phase1Sections.includes(label));
    const docsToSelect = allDocumentLabels.filter(label => !phase1Docs.includes(label));
    setCheckedSections(new Set(sectionsToSelect));
    setCheckedDocuments(new Set(docsToSelect));
  }, [allDocumentLabels, allSectionLabels]);

  const handleSendOnboardingEmail = async () => {
    if (!customEmailSubject.trim() || !customEmailBody.trim()) {
      toast.error('Email subject and body are required');
      return;
    }

    const subjectValidation = validateTemplateSyntax(customEmailSubject, ONBOARDING_EMAIL_TEMPLATE_PLACEHOLDERS);
    if (!subjectValidation.valid) {
      toast.error(`Subject: ${subjectValidation.message}`);
      return;
    }

    const bodyValidation = validateTemplateSyntax(customEmailBody, ONBOARDING_EMAIL_TEMPLATE_PLACEHOLDERS);
    if (!bodyValidation.valid) {
      toast.error(`Body: ${bodyValidation.message}`);
      return;
    }

    try {
      setSendingEmail(true);
      const res = await api.post(`/onboarding/employees/${selectedEmployee._id}/send-onboarding-email`, {
        sections: [...checkedSections],
        documents: [...checkedDocuments],
        submissionDeadline: emailDeadline,
        emailAccountId: selectedEmailAccountId,
        emailTemplateId: selectedEmailTemplateId || '',
        emailSubject: customEmailSubject,
        emailHtmlBody: customEmailBody
      });
      toast.success('Pre-onboarding email sent successfully!');
      setCheckedSections(new Set());
      setCheckedDocuments(new Set());

      // Update local state instead of full openDetail refresh
      if (res.data.employee) {
        setSelectedEmployee(res.data.employee);
        setEmployees(prev => prev.map(e => e._id === selectedEmployee._id ? { ...e, status: res.data.employee.status } : e));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSaveSelectionDraft = async () => {
    if (!selectedEmployee?._id) return;

    try {
      setSavingDraft(true);
      const res = await api.patch(`/onboarding/employees/${selectedEmployee._id}`, {
        selectionDraft: {
          sections: [...checkedSections],
          documents: [...checkedDocuments],
          emailTemplateId: selectedEmailTemplateId || '',
          emailSubject: customEmailSubject,
          emailHtmlBody: customEmailBody
        },
        documentDeadline: emailDeadline || null
      });

      toast.success('Selection draft saved');

      if (res.data?.employee) {
        setSelectedEmployee(res.data.employee);
        syncEmployeeState(res.data.employee, 'update');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleAddCustomFiles = async () => {
    if (customFiles.length === 0) {
      toast.error('Please select at least one file first');
      return;
    }

    try {
      setUploadingCustomFiles(true);
      const formData = new FormData();
      customFiles.forEach(file => {
        formData.append('documents', file);
      });

      const res = await api.post(`/onboarding/employees/${selectedEmployee._id}/custom-files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(res.data.message || 'File(s) added successfully!');
      const addedLabels = (res.data?.createdDocuments || []).map((doc) => doc.label).filter(Boolean);
      if (addedLabels.length > 0) {
        setCheckedDocuments(prev => new Set([...prev, ...addedLabels]));
      }
      setCustomFiles([]);
      setShowCustomFileUploader(false);
      if (customFileInputRef.current) customFileInputRef.current.value = '';

      if (res.data.employee) {
        setSelectedEmployee(res.data.employee);
        syncEmployeeState(res.data.employee);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add file(s)');
    } finally {
      setUploadingCustomFiles(false);
    }
  };

  const handleDeleteCustomFile = async (docId, label) => {
    if (!selectedEmployee?._id) return;
    if (!window.confirm(`Delete "${label}" from this employee's document list?`)) return;

    try {
      const res = await api.delete(`/onboarding/employees/${selectedEmployee._id}/custom-files/${docId}`);
      toast.success('Custom file deleted');
      setCheckedDocuments(prev => {
        const next = new Set(prev);
        next.delete(label);
        return next;
      });
      if (res.data?.employee) {
        setSelectedEmployee(res.data.employee);
        syncEmployeeState(res.data.employee, 'update');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete custom file');
    }
  };

  const INITIAL_FORM_DATA = {
    firstName: '', lastName: '', email: '', phone: '',
    designation: '', department: '', joiningDate: '', offerDate: '', documentDeadline: '',
    workLocation: '', address: '', probationPeriod: '',
    salary: {
      payType: 'salaried',
      annualCTC: '',
      monthlyCTC: '',
      basic: '',
      hra: '',
      specialAllowance: '',
      monthlyGross: '',
      pfEnabled: true,
      esiEnabled: true,
      ptEnabled: true,
      lwfEnabled: true,
      gratuityEnabled: true,
      includePfInCTC: false,
      includeGratuityInCTC: true,
      ptState: 'MH',
      professionalTax: '200',
      basicPercent: 50,
      hraPercent: 50,
      insuranceAmount: 0,
      employerNPS: 0
    }
  };

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const clearOnboardingCache = useCallback(() => {
    if (user?._id) {
      const prefix = `onboarding_employees_${user._id}_`;
      try {
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith(prefix)) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.error('Failed to clear onboarding cache', e);
      }
    }
  }, [user?._id]);

  const syncEmployeeState = useCallback((updatedEmp, mode = 'update') => {
    clearOnboardingCache();
    setEmployees(prev => {
      if (mode === 'delete') {
        return prev.filter(e => e._id !== updatedEmp._id);
      } else if (mode === 'add') {
        return [updatedEmp, ...prev];
      } else {
        return prev.map(e => e._id === updatedEmp._id ? { ...e, ...updatedEmp } : e);
      }
    });
  }, [clearOnboardingCache]);

  const fetchEmployees = useCallback(async ({ force = false } = {}) => {
    const cacheKey = `onboarding_employees_${user?._id}_${page}_${statusFilter}_${debouncedSearchTerm || 'all'}`;
    try {
      const cached = readSessionCache(cacheKey);
      if (cached) {
        // Only set from cache if NOT forcing a refresh. This prevents flickering back to old data.
        if (!force) {
          const data = cached.data || {};
          setEmployees(data.employees || []);
          setStats(data.stats || { Pending: 0, 'In Progress': 0, Submitted: 0, Reviewed: 0 });
          setTotalPages(data.totalPages || 1);
          setLoading(false);
          if (isCacheFresh(cached, ONBOARDING_EMPLOYEE_CACHE_TTL_MS)) return;
        }
      } else {
        setLoading(true);
      }

      const params = { tab: 'employees', page, limit: 15 };
      if (statusFilter !== 'All') params.status = statusFilter;
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      const res = await api.get('/onboarding/bootstrap', { params });
      const employeesData = res.data.employees || [];
      const statsData = res.data.stats || { Pending: 0, 'In Progress': 0, Submitted: 0, Reviewed: 0 };
      const totalPagesData = res.data.totalPages || 1;
      setEmployees(employeesData);
      setStats(statsData);
      setTotalPages(totalPagesData);

      const fingerprint = JSON.stringify({
        page,
        statusFilter,
        searchTerm: debouncedSearchTerm,
        total: res.data.total || employeesData.length,
        first: employeesData[0]?._id
      });

      const minimalEmployees = employeesData.map(employee => ({
        _id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        designation: employee.designation,
        department: employee.department,
        joiningDate: employee.joiningDate,
        offerDate: employee.offerDate,
        status: employee.status,
        tempEmployeeId: employee.tempEmployeeId,
        createdBy: employee.createdBy,
        sourcedFromTA: employee.sourcedFromTA,
        documents: employee.documents,
        personalDetails: employee.personalDetails,
        emergencyContact: employee.emergencyContact,
        bankDetails: employee.bankDetails,
        offerDeclaration: employee.offerDeclaration
      }));

      sessionStorage.setItem(cacheKey, JSON.stringify(createCachePayload({
        employees: minimalEmployees,
        stats: statsData,
        totalPages: totalPagesData
      }, fingerprint)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, page, statusFilter, user?._id]);

  const fetchSettings = useCallback(async ({ force = false } = {}) => {
    const cacheKey = `onboarding_settings_${user?._id}`;
    try {
      const cached = readSessionCache(cacheKey);
      if (cached && !force) {
        setOnboardingSettings(cached.data || { offerLetterTemplateUrl: '', declarationTemplateUrl: '', policies: [], dynamicTemplates: [] });
        if (isCacheFresh(cached, ONBOARDING_SETTINGS_CACHE_TTL_MS)) return;
      }

      const res = await api.get('/onboarding/bootstrap', { params: { tab: 'settings' } });
      const settings = res.data?.settings || { offerLetterTemplateUrl: '', declarationTemplateUrl: '', policies: [], dynamicTemplates: [] };
      setOnboardingSettings(settings);
      const fingerprint = JSON.stringify({
        offer: settings.offerLetterTemplateUrl || '',
        declaration: settings.declarationTemplateUrl || '',
        policies: settings.policies?.length || 0,
        templates: settings.dynamicTemplates?.length || 0
      });
      sessionStorage.setItem(cacheKey, JSON.stringify(createCachePayload(settings, fingerprint)));
    } catch {
      console.error('Failed to fetch onboarding settings');
    }
  }, [user?._id]);

  const fetchPayrollConfig = useCallback(async () => {
    try {
      const res = await api.get('/payroll/config');
      setPayrollConfig(res.data);
    } catch (e) {
      console.error('Failed to load payroll config in onboarding settings:', e);
    }
  }, []);

  const calculateSalaryBreakdown = (updatedSalaryFields) => {
    setFormData(prev => {
      const mergedSalary = { ...prev.salary, ...updatedSalaryFields };
      const payType = mergedSalary.payType || 'salaried';
      
      let annualCTC = parseFloat(String(mergedSalary.annualCTC).replace(/[^0-9.]/g, '')) || 0;
      let monthlyCTC = parseFloat(String(mergedSalary.monthlyCTC).replace(/[^0-9.]/g, '')) || 0;
      
      if (updatedSalaryFields.annualCTC !== undefined) {
        monthlyCTC = Math.round(annualCTC / 12);
      } else if (updatedSalaryFields.monthlyCTC !== undefined) {
        annualCTC = monthlyCTC * 12;
      }

      let basicVal = '';
      let hraVal = '';
      let specialVal = '';
      let grossVal = '';

      if (payType === 'hourly') {
        const hourlyRate = parseFloat(String(mergedSalary.hourlyRate).replace(/[^0-9.]/g, '')) || 0;
        const hoursWorked = parseFloat(String(mergedSalary.hoursWorked || 160).replace(/[^0-9.]/g, '')) || 160;
        monthlyCTC = Math.round(hourlyRate * hoursWorked);
        annualCTC = monthlyCTC * 12;
        basicVal = String(monthlyCTC);
        hraVal = '0';
        specialVal = '0';
        grossVal = String(monthlyCTC);
      } else if (payType === 'flat') {
        const flatSalary = parseFloat(String(mergedSalary.flatSalary || monthlyCTC).replace(/[^0-9.]/g, '')) || 0;
        monthlyCTC = flatSalary;
        annualCTC = flatSalary * 12;
        basicVal = String(flatSalary);
        hraVal = '0';
        specialVal = '0';
        grossVal = String(flatSalary);
      } else {
        if (payrollConfig) {
          const source = {
            monthlyCTC,
            payType,
            pfEnabled: mergedSalary.pfEnabled !== undefined ? !!mergedSalary.pfEnabled : true,
            esiEnabled: mergedSalary.esiEnabled !== undefined ? !!mergedSalary.esiEnabled : true,
            ptEnabled: mergedSalary.ptEnabled !== undefined ? !!mergedSalary.ptEnabled : true,
            lwfEnabled: mergedSalary.lwfEnabled !== undefined ? !!mergedSalary.lwfEnabled : true,
            gratuityEnabled: mergedSalary.gratuityEnabled !== undefined ? !!mergedSalary.gratuityEnabled : true,
            includePfInCTC: !!mergedSalary.includePfInCTC,
            includeGratuityInCTC: mergedSalary.includeGratuityInCTC !== undefined ? !!mergedSalary.includeGratuityInCTC : true,
            basicPercent: mergedSalary.basicPercent !== undefined && mergedSalary.basicPercent !== null ? Number(mergedSalary.basicPercent) : null,
            hraPercent: mergedSalary.hraPercent !== undefined && mergedSalary.hraPercent !== null ? Number(mergedSalary.hraPercent) : null,
            insuranceAmount: parseFloat(mergedSalary.insuranceAmount) || 0,
            employerNPS: parseFloat(mergedSalary.employerNPS) || 0,
            flexiAmount: parseFloat(mergedSalary.flexiAmount) || 0,
            ptState: mergedSalary.ptState || '',
            deductions: {
              professionalTax: mergedSalary.ptState === 'custom' ? (parseFloat(mergedSalary.professionalTax) || 0) : 0,
            }
          };
          if (payrollConfig.salaryComponents) {
            payrollConfig.salaryComponents.forEach(c => {
              if (c.linkedTo === 'fixed') {
                const val = mergedSalary[c.id] !== undefined ? mergedSalary[c.id] : (c.linkValue || 0);
                source[c.id] = parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
              }
            });
          }
          const master = buildMasterSalaryStructure(source, payrollConfig);
          if (master) {
            basicVal = String(master.basicMaster);
            hraVal = String(master.hraMaster);
            specialVal = String(master.specialAllowance);
            grossVal = String(master.grossSalary || master.totalEarnings);
            
            mergedSalary.pfEmployer = String(master.pfEmployer || 0);
            mergedSalary.pfEmployee = String(master.pfEmployee || 0);
            mergedSalary.gratuity = String(master.gratuity || 0);
            mergedSalary.lwfEmployer = String(master.lwfEmployer || 0);
            mergedSalary.lwfEmployee = String(master.lwfEmployee || 0);
            mergedSalary.esiEmployer = String(master.esiEmployer || 0);
            mergedSalary.esiEmployee = String(master.esiEmployee || 0);
            mergedSalary.professionalTax = String(master.professionalTax || 0);
            mergedSalary.tds = String(master.tds || 0);
            mergedSalary.netTakeHome = String(master.netTakeHome || 0);
            mergedSalary.monthlyGross = String(master.grossSalary || master.totalEarnings);
            
            if (master.earningsMap) {
              Object.entries(master.earningsMap).forEach(([id, val]) => {
                mergedSalary[id] = String(val);
              });
            }
          }
        } else {
          const basic = Math.round(monthlyCTC * 0.5);
          const hra = Math.round(basic * 0.5);
          const special = monthlyCTC - basic - hra;
          basicVal = String(basic);
          hraVal = String(hra);
          specialVal = String(special);
          grossVal = String(monthlyCTC);
        }
      }

      return {
        ...prev,
        salary: {
          ...mergedSalary,
          annualCTC: String(annualCTC),
          monthlyCTC: String(monthlyCTC),
          basic: basicVal,
          hra: hraVal,
          specialAllowance: specialVal,
          monthlyGross: grossVal
        }
      };
    });
  };

  const renderSalaryFormFields = () => {
    const isFlat = formData.salary.payType === 'flat';
    const isHourly = formData.salary.payType === 'hourly';
    
    // Parse values safely for display
    const pfEmp = parseFloat(formData.salary.pfEmployer) || 0;
    const pfEe = parseFloat(formData.salary.pfEmployee) || 0;
    const grat = parseFloat(formData.salary.gratuity) || 0;
    const lwf = parseFloat(formData.salary.lwfEmployer) || 0;
    const esi = parseFloat(formData.salary.esiEmployer) || 0;
    const pt = parseFloat(formData.salary.professionalTax) || 0;
    const tdsVal = parseFloat(formData.salary.tds) || 0;
    const grossVal = parseFloat(formData.salary.monthlyGross) || 0;
    const takeHomeVal = parseFloat(formData.salary.netTakeHome) || 0;
    const annualCTCVal = parseFloat(formData.salary.annualCTC) || 0;

    return (
      <>
        <div style={{ gridColumn: '1 / -1', marginTop: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Salary Details</h3>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Pay Type</label>
          <select 
            value={formData.salary.payType || 'salaried'} 
            onChange={(e) => calculateSalaryBreakdown({ payType: e.target.value })} 
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
          >
            <option value="salaried">Salaried (Monthly Base)</option>
            <option value="hourly">Hourly Contractor</option>
            <option value="flat">Flat Salary — No Component Breakdown</option>
          </select>
        </div>

        {isHourly ? (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Hourly Rate (INR)</label>
              <input 
                required
                value={formData.salary.hourlyRate || ''} 
                onChange={(e) => calculateSalaryBreakdown({ hourlyRate: e.target.value })} 
                placeholder="e.g. 500" 
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Estimated Monthly Hours</label>
              <input 
                required
                value={formData.salary.hoursWorked || '160'} 
                onChange={(e) => calculateSalaryBreakdown({ hoursWorked: e.target.value })} 
                placeholder="e.g. 160" 
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Calculated Monthly CTC</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', background: '#f3f4f6', height: '40px', boxSizing: 'border-box', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                ₹{parseFloat(formData.salary.monthlyCTC || '0').toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Calculated Annual CTC</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', background: '#f3f4f6', height: '40px', boxSizing: 'border-box', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                ₹{parseFloat(formData.salary.annualCTC || '0').toLocaleString('en-IN')}
              </div>
            </div>
          </>
        ) : isFlat ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Flat Monthly Salary</label>
            <input 
              required
              value={formData.salary.flatSalary || formData.salary.monthlyCTC || ''} 
              onChange={(e) => calculateSalaryBreakdown({ flatSalary: e.target.value, monthlyCTC: e.target.value })} 
              placeholder="e.g. 50,000" 
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} 
            />
          </div>
        ) : (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Annual CTC</label>
              <input 
                value={formData.salary.annualCTC} 
                onChange={(e) => calculateSalaryBreakdown({ annualCTC: e.target.value })} 
                placeholder="e.g. 5,00,000" 
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Monthly CTC</label>
              <input 
                value={formData.salary.monthlyCTC} 
                onChange={(e) => calculateSalaryBreakdown({ monthlyCTC: e.target.value })} 
                placeholder="e.g. 41,667" 
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} 
              />
            </div>

            {/* Statutory contribution toggles */}
            <div style={{ gridColumn: '1 / -1', marginTop: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', trackingWidth: '0.05em', color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                Statutory Toggles
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Provident Fund (PF)</span>
                    <input 
                      type="checkbox" 
                      checked={formData.salary.pfEnabled !== false} 
                      onChange={(e) => calculateSalaryBreakdown({ pfEnabled: e.target.checked })} 
                    />
                  </div>
                  {formData.salary.pfEnabled !== false && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '6px', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Include Employer PF in CTC</span>
                      <input 
                        type="checkbox" 
                        checked={!!formData.salary.includePfInCTC} 
                        onChange={(e) => calculateSalaryBreakdown({ includePfInCTC: e.target.checked })} 
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Gratuity Accrual</span>
                    <input 
                      type="checkbox" 
                      checked={formData.salary.gratuityEnabled !== false} 
                      onChange={(e) => calculateSalaryBreakdown({ gratuityEnabled: e.target.checked })} 
                    />
                  </div>
                  {formData.salary.gratuityEnabled !== false && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '6px', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Include Gratuity in CTC</span>
                      <input 
                        type="checkbox" 
                        checked={formData.salary.includeGratuityInCTC !== false} 
                        onChange={(e) => calculateSalaryBreakdown({ includeGratuityInCTC: e.target.checked })} 
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>ESI Applicable</span>
                  <input 
                    type="checkbox" 
                    checked={formData.salary.esiEnabled !== false} 
                    onChange={(e) => calculateSalaryBreakdown({ esiEnabled: e.target.checked })} 
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>LWF Applicable</span>
                  <input 
                    type="checkbox" 
                    checked={formData.salary.lwfEnabled !== false} 
                    onChange={(e) => calculateSalaryBreakdown({ lwfEnabled: e.target.checked })} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Professional Tax (PT)</span>
                  <input 
                    type="checkbox" 
                    checked={formData.salary.ptEnabled !== false} 
                    onChange={(e) => calculateSalaryBreakdown({ ptEnabled: e.target.checked })} 
                  />
                </div>
                {formData.salary.ptEnabled !== false && (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <select
                        value={formData.salary.ptState || 'MH'}
                        onChange={(e) => {
                          calculateSalaryBreakdown({ ptState: e.target.value });
                        }}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', outline: 'none', background: '#fff' }}
                      >
                        <optgroup label="── No PT / Manual">
                          <option value="">None — use manual override below</option>
                          <option value="custom">Custom Override</option>
                        </optgroup>
                        <optgroup label="── States that levy PT">
                          {PT_STATE_LIST.filter(s => s.leviesPT).map(s => (
                            <option key={s.code} value={s.code}>{s.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="── States with no PT">
                          {PT_STATE_LIST.filter(s => s.code && !s.leviesPT).map(s => (
                            <option key={s.code} value={s.code}>{s.name}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    {formData.salary.ptState === 'custom' && (
                      <div style={{ width: '80px' }}>
                        <input
                          value={formData.salary.professionalTax || '0'}
                          onChange={(e) => calculateSalaryBreakdown({ professionalTax: e.target.value })}
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Ratio overrides */}
            <div style={{ gridColumn: '1 / -1', marginTop: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', trackingWidth: '0.05em', color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                Ratio Overrides
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Basic Salary Override (%)</label>
                  <input 
                    type="number"
                    min="1"
                    max="100"
                    value={formData.salary.basicPercent !== undefined ? formData.salary.basicPercent : '50'} 
                    onChange={(e) => calculateSalaryBreakdown({ basicPercent: e.target.value })} 
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#fff' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>HRA Override (% of Basic)</label>
                  <input 
                    type="number"
                    min="1"
                    max="100"
                    value={formData.salary.hraPercent !== undefined ? formData.salary.hraPercent : '50'} 
                    onChange={(e) => calculateSalaryBreakdown({ hraPercent: e.target.value })} 
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#fff' }} 
                  />
                </div>
              </div>
            </div>

            {/* Dynamic salary components from active config (mirrors calculator) */}
            {payrollConfig?.salaryComponents && payrollConfig.salaryComponents.length > 0 ? (
              <>
                <div style={{ gridColumn: '1 / -1', paddingTop: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', trackingWidth: '0.05em', color: '#64748b' }}>Salary Components Breakup</span>
                </div>
                {payrollConfig.salaryComponents
                  .filter(c => c.type === 'earning')
                  .map(c => {
                    const isFixed = c.linkedTo === 'fixed';
                    const isRemainder = c.linkedTo === 'remainder';

                    if (isFixed) {
                      const val = formData.salary[c.id] !== undefined ? formData.salary[c.id] : (c.linkValue || '0');
                      return (
                        <div key={c.id}>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>{c.name}</label>
                          <input 
                            value={val} 
                            onChange={(e) => calculateSalaryBreakdown({ [c.id]: e.target.value })} 
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} 
                          />
                        </div>
                      );
                    }

                    // Auto calculated fields
                    const badge = isRemainder ? 'Remainder'
                      : c.linkedTo === 'ctc_percent' ? `${Math.round((c.linkValue || 0) * 100)}% of CTC`
                      : c.linkedTo === 'basic_percent' ? `${Math.round((c.linkValue || 0) * 100)}% of Basic`
                      : '';
                    const val = formData.salary[c.id] || '0';

                    return (
                      <div key={c.id}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>{c.name}</label>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', background: '#f3f4f6', height: '40px', boxSizing: 'border-box' }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>₹{parseFloat(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                          <span style={{ fontSize: '10px', fontWeight: '700', color: '#2563eb', background: '#dbeafe', borderRadius: '9999px', padding: '2px 8px' }}>{badge}</span>
                        </div>
                      </div>
                    );
                  })
                }
              </>
            ) : (
              // Standard fallback
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Basic Salary (Monthly)</label>
                  <input readOnly disabled value={formData.salary.basic} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#f3f4f6', color: '#6b7280' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>HRA (Monthly)</label>
                  <input readOnly disabled value={formData.salary.hra} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#f3f4f6', color: '#6b7280' }} />
                </div>
                {payrollConfig?.salaryComponents?.some(c => c.id === 'special') && (
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Special Allowance (Monthly)</label>
                    <input readOnly disabled value={formData.salary.specialAllowance} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#f3f4f6', color: '#6b7280' }} />
                  </div>
                )}
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Medical Insurance (Monthly)</label>
              <input 
                value={formData.salary.insuranceAmount || '0'} 
                onChange={(e) => calculateSalaryBreakdown({ insuranceAmount: e.target.value })} 
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Employer NPS (Monthly)</label>
              <input 
                value={formData.salary.employerNPS || '0'} 
                onChange={(e) => calculateSalaryBreakdown({ employerNPS: e.target.value })} 
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} 
              />
            </div>

            {/* CTC Components & Results Summary Table */}
            <div style={{ gridColumn: '1 / -1', marginTop: '16px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', trackingWidth: '0.05em', color: '#475569', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '10px' }}>
                CTC Components & Estimates (Monthly)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', background: '#fff' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>PF Employer</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>₹{pfEmp.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', background: '#fff' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Gratuity Provision</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>₹{grat.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', background: '#fff' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>LWF Employer</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>₹{lwf.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', background: '#fff' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>ESI Employer</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>₹{esi.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', background: '#fff' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Professional Tax (PT)</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>₹{pt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', background: '#fff' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Income Tax (TDS)</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>₹{tdsVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', background: '#fff' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Employee PF contribution</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>₹{pfEe.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', background: '#fff' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Annual CTC</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>₹{annualCTCVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div style={{ border: '1px solid #dcfce7', borderRadius: '8px', padding: '8px 10px', background: '#f0fdf4' }}>
                  <span style={{ fontSize: '11px', color: '#15803d', display: 'block', fontWeight: '600' }}>Monthly Gross Salary</span>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#166534' }}>₹{grossVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div style={{ border: '1px solid #dbeafe', borderRadius: '8px', padding: '8px 10px', background: '#eff6ff' }}>
                  <span style={{ fontSize: '11px', color: '#1d4ed8', display: 'block', fontWeight: '600' }}>Net Take-Home Estimate</span>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e40af' }}>₹{takeHomeVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  };

  const handleDynamicTemplateUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size === 0) {
      toast.error('The selected file is empty or unreadable. If this is a cloud file (e.g. Google Drive), please download it to your device first.');
      e.target.value = '';
      return;
    }
    if (!file.name.endsWith('.docx')) {
      toast.error('Please upload a .docx file for dynamic templates');
      e.target.value = '';
      return;
    }
    const name = prompt('Enter a name for this dynamic template (e.g. Appointment Letter):');
    if (!name) return;

    const fd = new FormData();
    fd.append('document', file);
    fd.append('name', name);
    fd.append('isRequired', 'true');

    try {
      toast.loading('Uploading template...', { id: 'dynamic' });
      await api.post('/onboarding/settings/templates/dynamic/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Template uploaded!', { id: 'dynamic' });
      fetchSettings({ force: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed', { id: 'dynamic' });
    }
  };

  const handleDeleteDynamicTemplate = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      // Optimistic update
      setOnboardingSettings(prev => ({
        ...prev,
        dynamicTemplates: (prev.dynamicTemplates || []).filter(t => t._id !== id)
      }));

      await api.delete(`/onboarding/settings/templates/dynamic/${id}`);
      toast.success('Template deleted');
      fetchSettings({ force: true });
    } catch {
      toast.error('Failed to delete template');
      fetchSettings({ force: true });
    }
  };


  useEffect(() => {
    if (activeTab === 'settings' && !canManageOnboardingSettings) {
      setActiveTab('employees');
    }
  }, [activeTab, canManageOnboardingSettings]);

  useEffect(() => {
    fetchPayrollConfig();
  }, [fetchPayrollConfig]);

  useEffect(() => {
    if (activeTab === 'employees') {
      initialEmployeesFetchDoneRef.current = true;
      fetchEmployees();
    }
    if (activeTab === 'settings') {
      initialSettingsFetchDoneRef.current = true;
      fetchSettings();
    }
  }, [activeTab, fetchEmployees, fetchSettings, page, debouncedSearchTerm, statusFilter, showAddModal, showEditModal]);

  const handlePolicyUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size === 0) {
      toast.error('The selected file is empty or unreadable. If this is a cloud file (e.g. Google Drive), please download it to your device first.');
      e.target.value = '';
      return;
    }
    const name = prompt('Enter policy name (e.g. Employee Handbook):');
    if (!name) return;

    const formData = new FormData();
    formData.append('document', file);
    formData.append('name', name);
    formData.append('isRequired', 'true');

    try {
      toast.loading('Uploading policy...', { id: 'policy' });
      await api.post('/onboarding/settings/policies/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Policy uploaded!', { id: 'policy' });
      fetchSettings({ force: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed', { id: 'policy' });
    }
  };

  const handleDeletePolicy = async (policyId) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    try {
      // Optimistic update
      setOnboardingSettings(prev => ({
        ...prev,
        policies: (prev.policies || []).filter(p => p._id !== policyId)
      }));

      await api.delete(`/onboarding/settings/policies/${policyId}`);
      toast.success('Policy deleted');
      fetchSettings({ force: true });
    } catch {
      toast.error('Failed to delete policy');
      fetchSettings({ force: true });
    }
  };

  const [previewLabel, setPreviewLabel] = useState('');

  const handleFilePreview = async (url, label = 'File', type = 'file') => {
    try {
      setPreviewLoading(true);
      setPreviewType(type);
      setPreviewLabel(label);
      setShowPreviewModal(true);
      if (previewBlob) setPreviewBlob(null);

      // Use configured api instance for internal routes to get headers/base URL, 
      // but use raw axios for external Cloudinary URLs to avoid CORS/BaseURL issues.
      const isInternal = url.startsWith('/') || url.startsWith('onboarding');
      const res = await (isInternal ? api : axios).get(url, { responseType: 'blob' });
      setPreviewBlob(res.data);
    } catch (err) {
      console.error('File preview error:', err);
      toast.error('Failed to load file preview');
      setShowPreviewModal(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    let objectUrl = null;
    if (previewBlob && previewContainerRef.current) {
      previewContainerRef.current.innerHTML = '';
      if (previewBlob.type === 'application/pdf') {
        objectUrl = URL.createObjectURL(previewBlob);
        previewContainerRef.current.innerHTML = `<iframe src="${objectUrl}" style="width:100%; height:800px; border:none; border-radius:12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);"></iframe>`;
      } else if (previewBlob.type.startsWith('image/')) {
        objectUrl = URL.createObjectURL(previewBlob);
        previewContainerRef.current.innerHTML = `<img src="${objectUrl}" style="max-width:100%; max-height:800px; object-fit:contain; border-radius:8px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);" />`;
      } else {
        renderAsync(previewBlob, previewContainerRef.current, null, {
          className: "docx-content",
          inWrapper: false,
          breakPages: false,
          ignoreWidth: true,
          ignoreHeight: true,
          debug: false
        }).catch(err => console.error('Docx-preview error:', err));
      }
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewBlob, showPreviewModal]);

  const handleDownloadCurrent = () => {
    if (!previewBlob) return;
    const url = window.URL.createObjectURL(previewBlob);
    const a = document.createElement('a');
    a.href = url;

    // Determine correct extension from mime type
    const mimeMap = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp'
    };
    const extension = mimeMap[previewBlob.type] || (previewBlob.type ? previewBlob.type.split('/')[1] : 'bin');

    // Clean filename from previewLabel
    const safeLabel = (previewLabel || 'Document').replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
    a.download = `${safeLabel}_${new Date().getTime()}.${extension}`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleOpenAddModal = () => {
    const salaryData = {
      ...INITIAL_FORM_DATA.salary,
      payType: 'salaried',
      annualCTC: '',
      monthlyCTC: '',
      basic: '',
      hra: '',
      specialAllowance: '',
      monthlyGross: '',
      flatSalary: '',
      hourlyRate: '',
      hoursWorked: '160',
      insuranceAmount: '0',
      employerNPS: '0'
    };
    if (payrollConfig?.salaryComponents) {
      payrollConfig.salaryComponents.forEach(c => {
        if (c.linkedTo === 'fixed') {
          salaryData[c.id] = String(c.linkValue || 0);
        }
      });
    }
    setFormData({
      ...INITIAL_FORM_DATA,
      offerDate: new Date().toISOString().split('T')[0], // Default to today
      salary: salaryData
    });
    setShowAddModal(true);
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/onboarding/employees', formData);
      toast.success('Employee added! Select sections and Send Email to notify candidate.');
      setShowAddModal(false);
      setFormData({
        ...INITIAL_FORM_DATA,
        salary: { ...INITIAL_FORM_DATA.salary }
      });
      if (res.data?.employee) syncEmployeeState(res.data.employee, 'add');
      else fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add');
    }
  };

  const openDetail = async (emp) => {
    try {
      setDetailLoading(true);
      setShowDetailModal(true);
      setCustomFiles([]);
      setShowCustomFileUploader(false);
      if (customFileInputRef.current) customFileInputRef.current.value = '';
      fetchSettings(); // Refresh settings to show latest templates/policies in selection
      const res = await api.get(`/onboarding/employees/${emp._id}`);
      setSelectedEmployee(res.data);
      setEmailDeadline(res.data.documentDeadline ? res.data.documentDeadline.split('T')[0] : '');
      const hasSavedDraft = Boolean(res.data.selectionDraft?.updatedAt);
      const draftSections = res.data.selectionDraft?.sections || [];
      const draftDocuments = res.data.selectionDraft?.documents || [];
      const draftEmailTemplateId = res.data.selectionDraft?.emailTemplateId || '';
      const draftEmailSubject = res.data.selectionDraft?.emailSubject || '';
      const draftEmailBody = res.data.selectionDraft?.emailHtmlBody || '';
      const requestedSectionLabels = (hasSavedDraft ? draftSections : (res.data.requestedSections || []).map((item) => getRequestedLabel(item))).filter(Boolean);
      const requestedDocumentLabels = (hasSavedDraft ? draftDocuments : (res.data.requestedDocuments || []).map((item) => getRequestedLabel(item))).filter(Boolean);
      setCheckedSections(new Set(requestedSectionLabels));
      setCheckedDocuments(new Set(requestedDocumentLabels));

      try {
        const emailSettingsRes = await api.get('/company/email-settings/senders');
        const senderData = emailSettingsRes.data || {};
        const senderOptions = [
          senderData.platformOption,
          ...((senderData.accounts || []).filter((account) => account.ready))
        ].filter(Boolean);
        const preferredSenderId = senderOptions.some((option) => option._id === senderData.defaultAccountId)
          ? senderData.defaultAccountId
          : (senderOptions[0]?._id || 'platform');

        setEmailSenderOptions(senderOptions);
        setSelectedEmailAccountId(preferredSenderId);
      } catch {
        setEmailSenderOptions([{
          _id: 'platform',
          name: 'TalentCIO Platform',
          provider: 'platform',
          fromAddress: 'no-reply@talentcio.in'
        }]);
        setSelectedEmailAccountId('platform');
      }

      try {
        const templatesRes = await api.get('/email-templates?active=true&templateType=onboarding');
        const nextTemplates = Array.isArray(templatesRes.data) ? templatesRes.data : [];
        setEmailTemplates(nextTemplates);
        applyEmailTemplateDraft(
          draftEmailTemplateId,
          [DEFAULT_ONBOARDING_TEMPLATE_OPTION, ...nextTemplates],
          draftEmailSubject,
          draftEmailBody
        );
      } catch {
        setEmailTemplates([]);
        applyEmailTemplateDraft('', [DEFAULT_ONBOARDING_TEMPLATE_OPTION], draftEmailSubject, draftEmailBody);
      }
    } catch {
      toast.error('Failed to load details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFlagDoc = async (empId, docId) => {
    const reason = prompt('Enter reason for re-upload:');
    if (!reason) return;
    try {
      const res = await api.patch(`/onboarding/employees/${empId}/documents/${docId}/flag`, { reason });
      toast.success('Document flagged');

      // Update local state and cache instantly without full refresh
      const updatedEmp = res.data.employee;
      if (updatedEmp) {
        setSelectedEmployee(updatedEmp);
        syncEmployeeState(updatedEmp, 'update');
      }
    } catch {
      toast.error('Failed to flag');
    }
  };

  const handleApproveDoc = async (empId, docId) => {
    try {
      const res = await api.patch(`/onboarding/employees/${empId}/documents/${docId}/approve`);
      toast.success('Document approved');

      // Update local state and cache instantly without full refresh
      const updatedEmp = res.data.employee;
      if (updatedEmp) {
        setSelectedEmployee(updatedEmp);
        syncEmployeeState(updatedEmp, 'update');
      }
    } catch {
      toast.error('Failed to approve');
    }
  };

  const handleDownloadZip = async (emp) => {
    try {
      toast.loading('Generating ZIP...', { id: 'zip' });
      const res = await api.get(`/onboarding/employees/${emp._id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${emp.tempEmployeeId}_documents.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.dismiss('zip');
      toast.success('Downloaded!');
    } catch {
      toast.dismiss('zip');
      toast.error('Download failed');
    }
  };

  const handleEditEmployee = (emp) => {
    const salaryData = {
      payType: emp.salary?.payType || 'salaried',
      annualCTC: emp.salary?.annualCTC || '',
      monthlyCTC: emp.salary?.monthlyCTC || '',
      basic: emp.salary?.basic || '',
      hra: emp.salary?.hra || '',
      specialAllowance: emp.salary?.specialAllowance || '',
      monthlyGross: emp.salary?.monthlyGross || '',
      flatSalary: emp.salary?.flatSalary || emp.salary?.monthlyCTC || '',
      hourlyRate: emp.salary?.hourlyRate || '',
      hoursWorked: emp.salary?.hoursWorked || '160',
      insuranceAmount: emp.salary?.insuranceAmount || '0',
      employerNPS: emp.salary?.employerNPS || '0',
      pfEnabled: emp.salary?.pfEnabled !== undefined ? emp.salary.pfEnabled : true,
      esiEnabled: emp.salary?.esiEnabled !== undefined ? emp.salary.esiEnabled : true,
      ptEnabled: emp.salary?.ptEnabled !== undefined ? emp.salary.ptEnabled : true,
      lwfEnabled: emp.salary?.lwfEnabled !== undefined ? emp.salary.lwfEnabled : true,
      gratuityEnabled: emp.salary?.gratuityEnabled !== undefined ? emp.salary.gratuityEnabled : true,
      includePfInCTC: emp.salary?.includePfInCTC !== undefined ? emp.salary.includePfInCTC : false,
      includeGratuityInCTC: emp.salary?.includeGratuityInCTC !== undefined ? emp.salary.includeGratuityInCTC : true,
      ptState: emp.salary?.ptState || 'MH',
      professionalTax: emp.salary?.professionalTax || '200',
      basicPercent: emp.salary?.basicPercent !== undefined ? emp.salary.basicPercent : 50,
      hraPercent: emp.salary?.hraPercent !== undefined ? emp.salary.hraPercent : 50,
      flexiAmount: emp.salary?.flexiAmount !== undefined ? String(emp.salary.flexiAmount) : '0',
      // Computed/saved values — pre-populate so CTC estimates show correctly on modal open
      pfEmployer: emp.salary?.pfEmployer !== undefined ? String(emp.salary.pfEmployer) : '0',
      pfEmployee: emp.salary?.pfEmployee !== undefined ? String(emp.salary.pfEmployee) : '0',
      gratuity: emp.salary?.gratuity !== undefined ? String(emp.salary.gratuity) : '0',
      lwfEmployer: emp.salary?.lwfEmployer !== undefined ? String(emp.salary.lwfEmployer) : '0',
      lwfEmployee: emp.salary?.lwfEmployee !== undefined ? String(emp.salary.lwfEmployee) : '0',
      esiEmployer: emp.salary?.esiEmployer !== undefined ? String(emp.salary.esiEmployer) : '0',
      esiEmployee: emp.salary?.esiEmployee !== undefined ? String(emp.salary.esiEmployee) : '0',
      tds: emp.salary?.tds !== undefined ? String(emp.salary.tds) : '0',
      netTakeHome: emp.salary?.netTakeHome !== undefined ? String(emp.salary.netTakeHome) : '0',
    };
    if (payrollConfig?.salaryComponents) {
      payrollConfig.salaryComponents.forEach(c => {
        // Load ALL component values from saved salary — not just fixed.
          // Remainder/percent-linked components (e.g. Flexi) also need their saved value
          // so they display correctly without requiring a field-change trigger.
          if (emp.salary?.[c.id] !== undefined) {
            salaryData[c.id] = String(emp.salary[c.id]);
          } else if (c.linkedTo === 'fixed') {
            salaryData[c.id] = String(c.linkValue || 0);
          }
      });
    }

    // Recalculate salary breakdown on open to ensure computed components are updated
    let annualCTC = parseFloat(String(salaryData.annualCTC).replace(/[^0-9.]/g, '')) || 0;
    let monthlyCTC = parseFloat(String(salaryData.monthlyCTC).replace(/[^0-9.]/g, '')) || 0;

    if (salaryData.annualCTC) {
      monthlyCTC = Math.round(annualCTC / 12);
    } else if (salaryData.monthlyCTC) {
      annualCTC = monthlyCTC * 12;
    }

    if (payrollConfig && (annualCTC > 0 || monthlyCTC > 0)) {
      const source = {
        monthlyCTC,
        payType: salaryData.payType,
        pfEnabled: salaryData.pfEnabled !== false,
        esiEnabled: salaryData.esiEnabled !== false,
        ptEnabled: salaryData.ptEnabled !== false,
        lwfEnabled: salaryData.lwfEnabled !== false,
        gratuityEnabled: salaryData.gratuityEnabled !== false,
        includePfInCTC: !!salaryData.includePfInCTC,
        includeGratuityInCTC: salaryData.includeGratuityInCTC !== false,
        basicPercent: salaryData.basicPercent !== undefined && salaryData.basicPercent !== null ? Number(salaryData.basicPercent) : null,
        hraPercent: salaryData.hraPercent !== undefined && salaryData.hraPercent !== null ? Number(salaryData.hraPercent) : null,
        insuranceAmount: parseFloat(salaryData.insuranceAmount) || 0,
        employerNPS: parseFloat(salaryData.employerNPS) || 0,
        flexiAmount: parseFloat(salaryData.flexiAmount) || 0,
        ptState: salaryData.ptState || '',
        deductions: {
          professionalTax: salaryData.ptState === 'custom' ? (parseFloat(salaryData.professionalTax) || 0) : 0,
        }
      };
      if (payrollConfig.salaryComponents) {
        payrollConfig.salaryComponents.forEach(c => {
          if (c.linkedTo === 'fixed') {
            const val = salaryData[c.id] !== undefined ? salaryData[c.id] : (c.linkValue || 0);
            source[c.id] = parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
          }
        });
      }
      const master = buildMasterSalaryStructure(source, payrollConfig);
      if (master) {
        salaryData.annualCTC = String(annualCTC);
        salaryData.monthlyCTC = String(monthlyCTC);
        salaryData.basic = String(master.basicMaster);
        salaryData.hra = String(master.hraMaster);
        salaryData.specialAllowance = String(master.specialAllowance || 0);
        salaryData.monthlyGross = String(master.grossSalary || master.totalEarnings);
        
        salaryData.pfEmployer = String(master.pfEmployer || 0);
        salaryData.pfEmployee = String(master.pfEmployee || 0);
        salaryData.gratuity = String(master.gratuity || 0);
        salaryData.lwfEmployer = String(master.lwfEmployer || 0);
        salaryData.lwfEmployee = String(master.lwfEmployee || 0);
        salaryData.esiEmployer = String(master.esiEmployer || 0);
        salaryData.esiEmployee = String(master.esiEmployee || 0);
        salaryData.professionalTax = String(master.professionalTax || 0);
        salaryData.tds = String(master.tds || 0);
        salaryData.netTakeHome = String(master.netTakeHome || 0);
        
        if (master.earningsMap) {
          Object.entries(master.earningsMap).forEach(([id, val]) => {
            salaryData[id] = String(val);
          });
        }
      }
    }

    setFormData({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      email: emp.email || '',
      phone: emp.phone || '',
      designation: emp.designation || '',
      department: emp.department || '',
      joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '',
      offerDate: emp.offerDate ? emp.offerDate.split('T')[0] : '',
      documentDeadline: emp.documentDeadline ? emp.documentDeadline.split('T')[0] : '',
      workLocation: emp.workLocation || '',
      address: emp.address || emp.personalDetails?.currentAddress?.line1 || '',
      probationPeriod: emp.probationPeriod || '',
      salary: salaryData
    });
    setSelectedEmployee(emp);
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    try {
      const res = await api.patch(`/onboarding/employees/${selectedEmployee._id}`, formData);
      toast.success('Employee updated successfully!');
      setShowEditModal(false);
      setFormData({
        ...INITIAL_FORM_DATA,
        salary: { ...INITIAL_FORM_DATA.salary }
      });
      setSelectedEmployee(null);
      if (res.data?.employee) syncEmployeeState(res.data.employee, 'update');
      else fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleRegenerateCredentials = async (empId) => {
    if (!confirm('Are you sure you want to regenerate credentials? The old password will stop working immediately.')) return;
    try {
      const res = await api.post(`/onboarding/employees/${empId}/regenerate-credentials`);
      toast.success(
        () => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontWeight: 700 }}>Credentials Regenerated!</span>
            <div style={{ fontSize: '13px' }}>
              <div><strong>ID:</strong> {res.data.tempEmployeeId}</div>
              <div><strong>Password:</strong> {res.data.tempPassword}</div>
              <div style={{ color: '#059669', marginTop: '4px', fontSize: '11px' }}>Select sections and click Send Email to notify the candidate.</div>
            </div>
          </div>
        ),
        { duration: 10000 }
      );
      if (res.data?.employee) {
        syncEmployeeState(res.data.employee, 'update');
        setSelectedEmployee(prev => prev?._id === empId ? { ...prev, ...res.data.employee } : prev);
      } else {
        fetchEmployees();
      }
    } catch {
      toast.error('Failed to regenerate credentials');
    }
  };

  const getProgressPercent = (emp) => {
    if (!emp.documents) return 0;
    const uploaded = emp.documents.filter(d => d.url).length;
    let sectionsDone = 0;
    if (emp.personalDetails?.isComplete) sectionsDone++;
    if (emp.emergencyContact?.isComplete) sectionsDone++;
    if (emp.bankDetails?.isComplete) sectionsDone++;
    if (emp.offerDeclaration?.isComplete) sectionsDone++;
    const totalItems = emp.documents.length + 4;
    return Math.round(((uploaded + sectionsDone) / totalItems) * 100);
  };

  const DOC_BADGE = {
    Pending: { bg: '#f1f5f9', text: '#64748b' },
    'Mail Sent': { bg: '#fef3c7', text: '#92400e' },
    Uploaded: { bg: '#dbeafe', text: '#1d4ed8' },
    Approved: { bg: '#d1fae5', text: '#059669' },
    'Re-upload Required': { bg: '#fee2e2', text: '#dc2626' },
    Policy: { bg: '#f1f5f9', text: '#64748b' }
  };

  const handleTransferToActive = async (empId) => {
    if (!confirm('Transfer this onboarding employee to an active user account? This will create a new user with their data and documents.')) return;
    try {
      const res = await api.post(`/onboarding/employees/${empId}/transfer-to-active`);
      toast.success(
        () => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontWeight: 700 }}>Employee Activated!</span>
            <div style={{ fontSize: '13px' }}>
              <div><strong>Name:</strong> {res.data.user.firstName} {res.data.user.lastName}</div>
              <div><strong>Code:</strong> {res.data.user.employeeCode}</div>
              <div><strong>Docs Transferred:</strong> {res.data.documentsTransferred}</div>
              <div><strong>Temp Password:</strong> {res.data.tempPassword}</div>
              <div style={{ color: '#059669', marginTop: '4px', fontSize: '11px' }}>A welcome email with login details has been sent.</div>
            </div>
          </div>
        ),
        { duration: 15000 }
      );
      sessionStorage.removeItem(`user_data_${user?._id}`);
      setShowDetailModal(false);
      setSelectedEmployee(null);
      syncEmployeeState({ _id: empId }, 'delete');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    }
  };

  const closeDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedEmployee(null);
    setCheckedSections(new Set());
    setCheckedDocuments(new Set());
    setShowCustomFileUploader(false);
    setCustomFiles([]);
    if (customFileInputRef.current) customFileInputRef.current.value = '';
  }, []);

  const summaryCards = [
    {
      key: 'all',
      label: 'Total Onboarding',
      value: totalOnboardingCount,
      filterValue: 'All',
      icon: <Users size={18} />,
      accent: '#0284c7',
      iconBackground: 'linear-gradient(135deg, #e0f2fe, #dbeafe)',
      surface: '#f0f9ff'
    },
    ...Object.entries(stats).map(([key, value]) => ({
      key,
      label: STATUS_LABELS[key] || key,
      value,
      filterValue: key,
      icon: STATUS_ICONS[key],
      accent: STATUS_COLORS[key]?.dot || '#64748b',
      iconBackground: `linear-gradient(135deg, ${STATUS_COLORS[key]?.bg || '#f8fafc'}, #ffffff)`,
      surface: STATUS_COLORS[key]?.bg || '#f8fafc'
    }))
  ];

  if (!canViewOnboarding) {
    return null;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Pre-Onboarding Portal</h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0' }}>Manage new hire pre-onboarding and document collection</p>
        </div>
        {canRequestOnboarding && (
          <button onClick={handleOpenAddModal} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
            <UserPlus size={18} /> Add Employee
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <button onClick={() => setActiveTab('employees')} style={{ position: 'relative', padding: '12px 4px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '600', color: activeTab === 'employees' ? '#2563eb' : '#64748b' }}>
          Employees
          {activeTab === 'employees' && <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: '2px', background: '#2563eb' }} />}
        </button>
        {canManageOnboardingSettings && (
          <button onClick={() => setActiveTab('settings')} style={{ position: 'relative', padding: '12px 4px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '600', color: activeTab === 'settings' ? '#2563eb' : '#64748b' }}>
            Template Settings
            {activeTab === 'settings' && <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: '2px', background: '#2563eb' }} />}
          </button>
        )}
      </div>

      {activeTab === 'employees' ? (
        <>
          {/* Stats */}
          <div
            className="onboarding-stats-strip"
            style={{ display: 'flex', gap: '16px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '6px', flexWrap: 'nowrap', scrollbarWidth: 'thin' }}
          >
            {summaryCards.map((card) => {
              const isActive = statusFilter === card.filterValue;
              return (
                <div
                  key={card.key}
                  className="onboarding-stat-card"
                  onClick={() => { setStatusFilter(isActive ? 'All' : card.filterValue); setPage(1); }}
                  style={{
                    minWidth: '180px',
                    flex: '1 0 0',
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '20px',
                    cursor: 'pointer',
                    border: isActive ? `1.5px solid ${card.accent}` : '1px solid #e2e8f0',
                    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.06)',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '14px',
                        background: card.filterValue === 'All' ? '#e0f2fe' : card.surface,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: card.accent
                      }}
                    >
                      {card.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: '#334155', fontWeight: '600', lineHeight: 1.3 }}>{card.label}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ fontSize: '34px', fontWeight: '700', color: '#0f172a', lineHeight: 1 }}>{card.value}</div>
                    {isActive && (
                      <div
                        style={{
                          padding: '6px 12px',
                          borderRadius: '999px',
                          background: card.accent,
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Active
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search & Filter */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                placeholder="Search by name, email or ID..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
              {searchTerm !== debouncedSearchTerm && (
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#94a3b8' }}>
                  Searching...
                </span>
              )}
            </div>
            {statusFilter !== 'All' && (
              <button onClick={() => { setStatusFilter('All'); setPage(1); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', cursor: 'pointer', fontSize: '13px', color: '#64748b' }}>
                <X size={14} /> Clear filter
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Employee</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Temp ID</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Designation</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Joining Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Deadline</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Progress</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading...</td></tr>
                  ) : employees.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No onboarding employees found</td></tr>
                  ) : employees.map((emp) => {
                    const progress = getProgressPercent(emp);
                    const sc = STATUS_COLORS[emp.status] || STATUS_COLORS.Pending;
                    return (
                      <tr
                        key={emp._id}
                        onClick={() => openDetail(emp)}
                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = ''}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {emp.sourcedFromTA && (
                              <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#fef2f2', color: '#b91c1c', fontSize: '10px', fontWeight: '700', border: '1px solid #fee2e2', textTransform: 'uppercase' }}>
                                Transfer
                              </span>
                            )}
                            <div style={{ fontWeight: '600', color: '#0f172a' }}>{emp.firstName} {emp.lastName}</div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>{emp.email}</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: '600' }}>{emp.tempEmployeeId}</code>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#475569' }}>{emp.designation || '—'}</td>
                        <td style={{ padding: '14px 16px', color: '#475569' }}>{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                        <td style={{ padding: '14px 16px', color: '#475569' }}>{emp.documentDeadline ? new Date(emp.documentDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#10b981' : '#3b82f6', borderRadius: '3px', transition: 'width 0.3s' }} />
                            </div>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', minWidth: '32px' }}>{progress}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: sc.bg, color: sc.text }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sc.dot }} />
                            {STATUS_LABELS[emp.status] || emp.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                              onClick={(e) => toggleMenu(e, emp._id)}
                              style={{
                                padding: '8px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                background: activeMenu === emp._id ? '#f1f5f9' : '#fff',
                                cursor: 'pointer',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.2s'
                              }}
                              title="Actions"
                            >
                              <MoreVertical size={18} />
                            </button>

                            {/* Action Menu Portal */}
                            {activeMenu === emp._id && createPortal(
                              <div
                                style={{
                                  position: 'fixed',
                                  zIndex: 9999,
                                  width: '200px',
                                  background: '#fff',
                                  borderRadius: '12px',
                                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                  border: '1px solid #e2e8f0',
                                  padding: '4px',
                                  ...menuPosition
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => { openDetail(emp); setActiveMenu(null); }}
                                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', color: '#1e293b', fontSize: '14px', fontWeight: '500', borderRadius: '8px', textAlign: 'left', transition: 'background 0.1s' }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                >
                                  <Eye size={16} style={{ color: '#3b82f6' }} /> View Details
                                </button>

                                {canEditEmployees && (
                                  <button
                                    onClick={() => { handleEditEmployee(emp); setActiveMenu(null); }}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', color: '#1e293b', fontSize: '14px', fontWeight: '500', borderRadius: '8px', textAlign: 'left', transition: 'background 0.1s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                  >
                                    <Edit2 size={16} style={{ color: '#059669' }} /> Edit Details
                                  </button>
                                )}

                                {canManageOnboardingCredentials && (
                                  <button
                                    onClick={() => { handleRegenerateCredentials(emp._id); setActiveMenu(null); }}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', color: '#1e293b', fontSize: '14px', fontWeight: '500', borderRadius: '8px', textAlign: 'left', transition: 'background 0.1s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                  >
                                    <Key size={16} style={{ color: '#f59e0b' }} /> Credentials
                                  </button>
                                )}

                                {(canManageOnboardingCredentials || canReviewOnboarding) && (
                                  <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 8px' }} />
                                )}

                                {canReviewOnboarding && (
                                  <button
                                    onClick={() => { handleDownloadZip(emp); setActiveMenu(null); }}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', color: '#1e293b', fontSize: '14px', fontWeight: '500', borderRadius: '8px', textAlign: 'left', transition: 'background 0.1s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                  >
                                    <Download size={16} style={{ color: '#8b5cf6' }} /> Export Docs
                                  </button>
                                )}
                              </div>,
                              document.body
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px', borderTop: '1px solid #e2e8f0' }}>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)} style={{ padding: '6px 12px', borderRadius: '6px', border: page === i + 1 ? '1px solid #3b82f6' : '1px solid #e2e8f0', background: page === i + 1 ? '#2563eb' : '#fff', color: page === i + 1 ? '#fff' : '#475569', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>{i + 1}</button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: '0 0 4px' }}>Onboarding Document Settings</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Configure and manage all documents required for new employee onboarding.</p>
          </div>

          <div style={{ padding: '24px', display: 'grid', gap: '24px' }}>
            {/* Portion 1: Dynamic Documents */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={18} style={{ color: '#2563eb' }} /> Portion 1: Dynamic Document Templates
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Documents requiring placeholders populated with candidate data.</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.2)' }}>
                  <Upload size={16} /> Upload .docx
                  <input type="file" accept=".docx" onChange={handleDynamicTemplateUpload} style={{ display: 'none' }} />
                </label>
              </div>

                {!onboardingSettings.dynamicTemplates || onboardingSettings.dynamicTemplates.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>No dynamic templates uploaded yet.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {onboardingSettings.dynamicTemplates?.map((temp) => (
                      <div key={temp._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                        <FileText size={20} style={{ color: '#64748b' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{temp.name}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Custom Dynamic Template</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleFilePreview(temp.url, 'dynamic')} style={{ padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#3b82f6', display: 'flex', cursor: 'pointer' }} title="Preview Template"><Eye size={16} /></button>
                          <button onClick={() => handleDeleteDynamicTemplate(temp._id)} style={{ padding: '6px', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', display: 'flex', cursor: 'pointer' }} title="Delete Template"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Portion 2: Static Policies */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={18} style={{ color: '#10b981' }} /> Portion 2: Static Company Policies
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Documents sent <b>without any changes</b> (e.g., Handbooks, Code of Conduct).</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 8px rgba(16,185,129,0.2)' }}>
                  <Upload size={16} /> Upload Policy PDF
                  <input type="file" accept=".pdf,.doc,.docx" onChange={handlePolicyUpload} style={{ display: 'none' }} />
                </label>
              </div>

              <div style={{ padding: '16px' }}>
                {!onboardingSettings.policies || onboardingSettings.policies.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>No policies uploaded yet.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {onboardingSettings.policies?.map((policy) => (
                      <div key={policy._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                        <FileText size={20} style={{ color: '#64748b' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{policy.name}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{policy.isRequired ? 'Mandatory for candidates' : 'Optional'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleFilePreview(policy.url, 'policy')} style={{ padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#3b82f6', display: 'flex', cursor: 'pointer' }} title="Preview Policy"><Eye size={16} /></button>
                          <button onClick={() => handleDeletePolicy(policy._id)} style={{ padding: '6px', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fff', color: '#dc2626', cursor: 'pointer', display: 'flex' }} title="Delete Policy"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '24px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 16px 16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: '#f59e0b' }} /> Available Placeholders Reference
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>Copy and paste these exact tags into your Word document. The system will automatically replace them with real data.</p>
              
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px' }}>Single Values</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', marginBottom: '24px' }}>
                {(() => {
                  const basePlaceholders = [
                    { tag: '{employee_full_name}', desc: 'Full Name' }, { tag: '{employee_first_name}', desc: 'First Name' },
                    { tag: '{employee_last_name}', desc: 'Last Name' }, { tag: '{designation}', desc: 'Designation' },
                    { tag: '{joining_date}', desc: 'Joining Date' }, { tag: '{annual_ctc}', desc: 'Annual CTC' },
                    { tag: '{employee_address}', desc: 'Full Address' }, { tag: '{work_location}', desc: 'Work Location' },
                    { tag: '{probation_period}', desc: 'Probation Period' }, { tag: '{basic_salary}', desc: 'Basic Salary' },
                    { tag: '{hra}', desc: 'House Rent Allowance' }, { tag: '{special_allowance}', desc: 'Special Allowance' },
                    { tag: '{monthly_gross}', desc: 'Monthly Gross' }, { tag: '{monthly_ctc}', desc: 'Monthly CTC' },
                    { tag: '{offer_date}', desc: 'Date of Offer' }, { tag: '{hr_name}', desc: 'Authorized Signatory Name' },
                    { tag: '{@salary_table}', desc: 'Auto-Generated Salary Breakup Table' },
                    { tag: '{@employee_signature}', desc: 'Auto-Generated Digital Signature (Canvas Image / Typed Name)' },
                    { tag: '{employee_signature_date}', desc: 'Signature Date' },
                    { tag: '{employee_signature_ip}', desc: 'Signature IP Address' }
                  ];

                  const dynamicPlaceholders = [];
                  if (payrollConfig?.salaryComponents) {
                    payrollConfig.salaryComponents.forEach(c => {
                      if (['basic', 'hra', 'special'].includes(c.id)) return;
                      const cleanId = c.id.replace(/([A-Z])/g, '_$1').toLowerCase();
                      dynamicPlaceholders.push({ tag: `{${cleanId}}`, desc: `${c.name} (Monthly)` });
                      dynamicPlaceholders.push({ tag: `{${cleanId}_annual}`, desc: `${c.name} (Annual)` });
                    });
                  }

                  return [...basePlaceholders, ...dynamicPlaceholders].map(p => (
                    <div key={p.tag} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <span style={{ fontFamily: 'Calibri, "Segoe UI", sans-serif', fontSize: '12pt', fontWeight: '600', color: '#0f172a' }}>{p.tag}</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>{p.desc}</span>
                    </div>
                  ));
                })()}
              </div>

              <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px' }}>Table Format Loops (Automatic Table Breakups)</h4>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>Create a table in Word with the headers. In the data row, start with the loop opener and end with the loop closer. The row will automatically duplicate for each item in the breakdown.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {[
                  { tag: '{#earnings_breakdown}...{/earnings_breakdown}', desc: 'Earnings List. Fields: {name}, {monthly}, {annual}' },
                  { tag: '{#contributions_breakdown}...{/contributions_breakdown}', desc: 'Employer Contribution List. Fields: {name}, {monthly}, {annual}' },
                  { tag: '{#deductions_breakdown}...{/deductions_breakdown}', desc: 'Employee Deductions List. Fields: {name}, {monthly}, {annual}' },
                  { tag: '{#all_components}...{/all_components}', desc: 'Full Salary Structure List. Fields: {category}, {name}, {monthly}, {annual}' }
                ].map(p => (
                  <div key={p.tag} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '14px', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <span style={{ fontFamily: 'Consolas, monospace', fontSize: '13px', fontWeight: '700', color: '#2563eb' }}>{p.tag}</span>
                    <span style={{ fontSize: '11px', color: '#475569', fontStyle: 'normal' }}>{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Add New Employee</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddEmployee} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>First Name *</label>
                  <input required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Last Name</label>
                  <input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Email *</label>
                  <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Phone</label>
                  <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Designation</label>
                  <input value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Department</label>
                  <input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Date of Offer</label>
                  <input type="date" value={formData.offerDate} onChange={(e) => setFormData({ ...formData, offerDate: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Joining Date</label>
                  <input type="date" value={formData.joiningDate} onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>


                <div style={{ gridColumn: '1 / -1', marginTop: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Employment Details</h3>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Work Location</label>
                  <input value={formData.workLocation} onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })} placeholder="e.g. Gurugram, HR" style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Physical Address</label>
                  <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder={"House/Flat No., Street Name\nArea/Locality\nCity, State – PIN Code"} rows="3" style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Probation Period</label>
                  <input value={formData.probationPeriod} onChange={(e) => setFormData({ ...formData, probationPeriod: e.target.value })} placeholder="e.g. 6 months" style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                {renderSalaryFormFields()}
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '14px', color: '#475569' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Send size={16} /> Add Candidate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Edit Employee Details</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Update information for {selectedEmployee?.firstName} {selectedEmployee?.lastName}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateEmployee} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>First Name *</label>
                  <input required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Last Name</label>
                  <input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Email *</label>
                  <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Phone</label>
                  <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Designation</label>
                  <input value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Department</label>
                  <input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Date of Offer</label>
                  <input type="date" value={formData.offerDate} onChange={(e) => setFormData({ ...formData, offerDate: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Joining Date</label>
                  <input type="date" value={formData.joiningDate} onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>


                <div style={{ gridColumn: '1 / -1', marginTop: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Employment Details</h3>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Work Location</label>
                  <input value={formData.workLocation} onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })} placeholder="e.g. Gurugram, HR" style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Physical Address</label>
                  <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder={"House/Flat No., Street Name\nArea/Locality\nCity, State – PIN Code"} rows="3" style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Probation Period</label>
                  <input value={formData.probationPeriod} onChange={(e) => setFormData({ ...formData, probationPeriod: e.target.value })} placeholder="e.g. 6 months" style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                {renderSalaryFormFields()}
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '14px', color: '#475569' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><RefreshCw size={16} /> Update Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal / Slide-out */}
      {showDetailModal && (
        <div onClick={closeDetailModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: '720px', height: '100vh', overflow: 'auto', boxShadow: '-8px 0 32px rgba(15,23,42,0.12)', animation: 'slideIn 0.3s ease-out' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Employee Details</h2>
              <button onClick={closeDetailModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}><X size={20} /></button>
            </div>

            {detailLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
            ) : selectedEmployee && (
              <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100%' }}>
                {/* Employee Info */}
                <div style={{ background: '#ffffff', borderRadius: '18px', padding: '22px', marginBottom: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 28px rgba(15,23,42,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: '700', color: '#0f172a', lineHeight: 1.2 }}>{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
                      <p style={{ margin: '0 0 8px', color: '#475569', fontSize: '14px', wordBreak: 'break-word' }}>{selectedEmployee.email}</p>
                      <code style={{ display: 'inline-block', background: '#eff6ff', color: '#1d4ed8', padding: '6px 10px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', border: '1px solid #bfdbfe' }}>{selectedEmployee.tempEmployeeId}</code>
                    </div>
                    <span style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', background: (STATUS_COLORS[selectedEmployee.status] || STATUS_COLORS.Pending).bg, color: (STATUS_COLORS[selectedEmployee.status] || STATUS_COLORS.Pending).text }}>
                      {STATUS_LABELS[selectedEmployee.status] || selectedEmployee.status}
                    </span>
                  </div>
                </div>

                {/* Deadline & Expiry Alerts */}
                {selectedEmployee.credentialRegenerationRequest?.requested && !selectedEmployee.credentialRegenerationRequest?.resolved && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#b91c1c', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={16} />
                      <strong>Candidate Requested New Credentials:</strong> {selectedEmployee.credentialRegenerationRequest.reason || 'Expired or lost'}
                    </div>
                    {canManageOnboardingCredentials && (
                      <button onClick={() => handleRegenerateCredentials(selectedEmployee._id)} style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '600', color: '#fff', background: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Regenerate & Resolve
                      </button>
                    )}
                  </div>
                )}

                {selectedEmployee.extensionRequests?.map(ext => ext.status === 'Pending' && (
                  <div key={ext._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '13px', color: '#1d4ed8', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} />
                      <div>
                        <strong>Extension Requested:</strong> {ext.requestedDays} days. Reason: "{ext.reason}"
                      </div>
                    </div>
                    {canManageOnboardingCredentials && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={async () => {
                          try {
                            const res = await api.post(`/onboarding/employees/${selectedEmployee._id}/extension/${ext._id}/resolve`, { status: 'Rejected' });
                            toast.success('Extension rejected');
                            if (res.data?.employee) syncEmployeeState(res.data.employee, 'update');
                            else fetchEmployees();
                            setSelectedEmployee(prev => ({ ...prev, extensionRequests: prev.extensionRequests.map(r => r._id === ext._id ? { ...r, status: 'Rejected' } : r) }));
                          } catch { toast.error('Failed to reject extension'); }
                        }} style={{ padding: '4px 8px', fontSize: '12px', fontWeight: '600', color: '#1d4ed8', background: 'none', border: '1px solid #1d4ed8', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                        <button onClick={() => {
                          const currentDeadline = selectedEmployee.documentDeadline ? new Date(selectedEmployee.documentDeadline) : new Date();
                          currentDeadline.setDate(currentDeadline.getDate() + ext.requestedDays);
                          api.post(`/onboarding/employees/${selectedEmployee._id}/extension/${ext._id}/resolve`, { status: 'Approved', newDeadline: currentDeadline.toISOString() })
                            .then((res) => {
                              toast.success(`Extension approved. New deadline: ${currentDeadline.toLocaleDateString()}`);
                              if (res.data?.employee) syncEmployeeState(res.data.employee, 'update');
                              else fetchEmployees();
                              const updatedExt = { ...ext, status: 'Approved' };
                              setSelectedEmployee(prev => ({
                                ...prev,
                                documentDeadline: currentDeadline.toISOString(),
                                extensionRequests: prev.extensionRequests.map(r => r._id === ext._id ? updatedExt : r)
                              }));
                            })
                            .catch(() => toast.error('Failed to approve extension'));
                        }} style={{ padding: '4px 8px', fontSize: '12px', fontWeight: '600', color: '#fff', background: '#2563eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Approve ({ext.requestedDays} Days)</button>
                      </div>
                    )}
                  </div>
                ))}

                {selectedEmployee.documentDeadline && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '13px', color: '#92400e', marginBottom: '8px' }}>
                    <Clock size={16} />
                    <strong>Document Deadline:</strong> {new Date(selectedEmployee.documentDeadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                )}

                {selectedEmployee.credentialsExpireAt && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#991b1b', marginBottom: '12px' }}>
                    <AlertTriangle size={16} />
                    <strong>Credentials Expire:</strong> {new Date(selectedEmployee.credentialsExpireAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                )}

                {/* Section Completion & Details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Form Sections</h4>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Select the items this employee should complete before joining.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleSelectAllItems}
                      disabled={totalSelectableItems === 0 || allItemsSelected}
                      style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: '700', cursor: totalSelectableItems === 0 || allItemsSelected ? 'not-allowed' : 'pointer', opacity: totalSelectableItems === 0 || allItemsSelected ? 0.6 : 1 }}
                    >
                      Select Everything
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectPhase1}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid #bfdbfe',
                        background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                        color: '#1d4ed8',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 2px rgba(37,99,235,0.05)'
                      }}
                    >
                      Phase 1
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectPhase2}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid #e9d5ff',
                        background: 'linear-gradient(135deg, #faf5ff, #f3e8ff)',
                        color: '#7e22ce',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 2px rgba(126,34,206,0.05)'
                      }}
                    >
                      Phase 2
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllItems}
                      disabled={selectedItemCount === 0}
                      style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: '12px', fontWeight: '700', cursor: selectedItemCount === 0 ? 'not-allowed' : 'pointer', opacity: selectedItemCount === 0 ? 0.6 : 1 }}
                    >
                      Clear Selection
                    </button>
                    <div style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: '700', color: '#475569' }}>{selectedItemCount} selected</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '10px', marginBottom: '24px' }}>
                  {detailSections.map((s) => {
                    const isRequested = Array.isArray(selectedEmployee.requestedSections) && selectedEmployee.requestedSections.find((rs) => getRequestedLabel(rs) === s.label);
                    const isComplete = s.done;
                    const sentDate = isRequested?.emailSentAt;
                    let statusText = isComplete ? 'Complete' : (sentDate ? 'Mail Sent' : 'Pending');
                    let badgeBg = isComplete ? '#dcfce7' : (statusText === 'Mail Sent' ? '#fef3c7' : '#f1f5f9');
                    let badgeColor = isComplete ? '#16a34a' : (statusText === 'Mail Sent' ? '#d97706' : '#64748b');
                    let iconColor = isComplete ? '#22c55e' : (statusText === 'Mail Sent' ? '#f59e0b' : '#94a3b8');

                    return (
                      <div key={s.id} style={{ borderRadius: '16px', border: '1px solid #e2e8f0', background: '#fff', overflow: 'hidden', boxShadow: '0 8px 20px rgba(15,23,42,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer', background: s.done ? '#f0fdf4' : '#fffbea' }}>
                          <div onClick={(e) => { e.stopPropagation(); toggleCheckedSection(s.label); }} style={{ cursor: 'pointer', flexShrink: 0 }}>
                            {checkedSections.has(s.label) ? <CheckSquare size={18} color="#2563eb" /> : <Square size={18} color="#94a3b8" />}
                          </div>
                          <div onClick={() => toggleSection(s.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                            {s.done ? <CheckCircle size={16} style={{ color: iconColor }} /> : <Clock size={16} style={{ color: iconColor }} />}
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{s.label}</span>
                            <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: badgeColor, background: badgeBg, padding: '4px 10px', borderRadius: '999px' }}>{statusText}</span>
                              {statusText === 'Mail Sent' && sentDate && <span style={{ fontSize: '10px', color: '#92400e', marginTop: '4px' }}>Sent on {new Date(sentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}
                            </div>
                            <ChevronDown size={16} style={{ color: '#94a3b8', transform: expandedSections[s.id] ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
                          </div>
                        </div>

                        {expandedSections[s.id] && (
                          <div style={{ padding: '18px', borderTop: '1px solid #e2e8f0', background: '#fff', fontSize: '13px' }}>
                            {s.id === 'personal' && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><span style={{ color: '#94a3b8' }}>Full Name:</span> <br /> <strong>{s.data?.fullName || '—'}</strong></div>
                                <div><span style={{ color: '#94a3b8' }}>DOB:</span> <br /> <strong>{s.data?.dateOfBirth ? new Date(s.data.dateOfBirth).toLocaleDateString('en-IN') : '—'}</strong></div>
                                <div><span style={{ color: '#94a3b8' }}>Gender:</span> <br /> <strong>{s.data?.gender || '—'}</strong></div>
                                <div><span style={{ color: '#94a3b8' }}>Blood Group:</span> <br /> <strong>{s.data?.bloodGroup || '—'}</strong></div>
                                <div><span style={{ color: '#94a3b8' }}>Email:</span> <br /> <strong>{s.data?.personalEmail || '—'}</strong></div>
                                <div><span style={{ color: '#94a3b8' }}>Mobile:</span> <br /> <strong>{s.data?.personalMobile || '—'}</strong></div>
                                <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                  <div style={{ gridColumn: '1 / -1', fontWeight: '700', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>Current Address</div>
                                  <div><span style={{ color: '#94a3b8' }}>Street</span> <br /> <strong>{s.data?.currentAddress?.line1 || 'Not Set'}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>Line 2</span> <br /> <strong>{s.data?.currentAddress?.line2 || 'Not Set'}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>City</span> <br /> <strong>{s.data?.currentAddress?.city || 'Not Set'}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>State</span> <br /> <strong>{s.data?.currentAddress?.state || 'Not Set'}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>Pincode</span> <br /> <strong>{s.data?.currentAddress?.pincode || 'Not Set'}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>Country</span> <br /> <strong>{s.data?.currentAddress?.country || 'Not Set'}</strong></div>
                                </div>
                                <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px', borderTop: '1px dashed #f1f5f9', paddingTop: '12px' }}>
                                  <div style={{ gridColumn: '1 / -1', fontWeight: '700', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>Permanent Address {s.data?.sameAsCurrent ? '(Same as Current)' : ''}</div>
                                  {!s.data?.sameAsCurrent ? (
                                    <>
                                      <div><span style={{ color: '#94a3b8' }}>Street</span> <br /> <strong>{s.data?.permanentAddress?.line1 || 'Not Set'}</strong></div>
                                      <div><span style={{ color: '#94a3b8' }}>Line 2</span> <br /> <strong>{s.data?.permanentAddress?.line2 || 'Not Set'}</strong></div>
                                      <div><span style={{ color: '#94a3b8' }}>City</span> <br /> <strong>{s.data?.permanentAddress?.city || 'Not Set'}</strong></div>
                                      <div><span style={{ color: '#94a3b8' }}>State</span> <br /> <strong>{s.data?.permanentAddress?.state || 'Not Set'}</strong></div>
                                      <div><span style={{ color: '#94a3b8' }}>Pincode</span> <br /> <strong>{s.data?.permanentAddress?.pincode || 'Not Set'}</strong></div>
                                      <div><span style={{ color: '#94a3b8' }}>Country</span> <br /> <strong>{s.data?.permanentAddress?.country || 'Not Set'}</strong></div>
                                    </>
                                  ) : (
                                    <div style={{ gridColumn: '1 / -1', color: '#64748b', fontStyle: 'italic' }}>Same as Current Address</div>
                                  )}
                                </div>
                                {s.data?.linkedinUrl && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#94a3b8' }}>LinkedIn:</span> <br /> <a href={s.data.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>{s.data.linkedinUrl}</a></div>}
                              </div>
                            )}
                            {s.id === 'emergency' && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><span style={{ color: '#94a3b8' }}>Name:</span> <br /> <strong>{s.data?.contactName || '—'}</strong></div>
                                <div><span style={{ color: '#94a3b8' }}>Relationship:</span> <br /> <strong>{s.data?.relationship || '—'}</strong></div>
                                <div><span style={{ color: '#94a3b8' }}>Phone:</span> <br /> <strong>{s.data?.phoneNumber || '—'}</strong></div>
                                <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#94a3b8' }}>Address:</span> <br /> <strong>{s.data?.address || '—'}</strong></div>
                              </div>
                            )}
                            {s.id === 'bank' && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><span style={{ color: '#94a3b8' }}>Bank Name:</span> <br /> <strong>{s.data?.bankName || '—'}</strong></div>
                                <div><span style={{ color: '#94a3b8' }}>A/C Number:</span> <br /> <strong>{s.data?.accountNumber || '—'}</strong></div>
                                <div><span style={{ color: '#94a3b8' }}>IFSC Code:</span> <br /> <strong>{s.data?.ifscCode || '—'}</strong></div>
                                <div><span style={{ color: '#94a3b8' }}>Type:</span> <br /> <strong>{s.data?.accountType || '—'}</strong></div>
                                {s.data?.cancelledChequeUrl && <div style={{ gridColumn: '1 / -1' }}><a href={s.data.cancelledChequeUrl} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontWeight: '600' }}>View Cancelled Cheque ↗</a></div>}
                              </div>
                            )}
                            {s.id === 'offer' && (
                              <div style={{ display: 'grid', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>{s.data?.hasReadOfferLetter ? <Check size={14} color="#22c55e" /> : <X size={14} color="#ef4444" />} <span>Read Offer Letter</span></div>
                                <div style={{ display: 'flex', gap: '8px' }}>{s.data?.hasProvidedTrueInfo ? <Check size={14} color="#22c55e" /> : <X size={14} color="#ef4444" />} <span>Provided True Info</span></div>
                                <div style={{ display: 'flex', gap: '8px' }}>{s.data?.agreesToOriginalVerification ? <Check size={14} color="#22c55e" /> : <X size={14} color="#ef4444" />} <span>Agrees to Verification</span></div>
                                <div style={{ marginTop: '8px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                                  <span style={{ color: '#94a3b8' }}>E-Signature:</span> <br />
                                  <strong>{s.data?.eSignName || '—'}</strong> <br />
                                  {s.data?.eSignType === 'drawn' && s.data?.eSignValue && (
                                    <div style={{ margin: '8px 0', border: '1px solid #e2e8f0', padding: '6px', background: '#f8fafc', borderRadius: '8px', maxWidth: '200px' }}>
                                      <img src={s.data.eSignValue} alt="Signature" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                    </div>
                                  )}
                                  {s.data?.eSignType === 'typed' && (
                                    <div style={{ margin: '8px 0', fontStyle: 'italic', fontSize: '15px', color: '#1e293b', fontFamily: 'cursive' }}>
                                      {s.data?.eSignName}
                                    </div>
                                  )}
                                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                                    Signed on {s.data?.eSignDate ? new Date(s.data.eSignDate).toLocaleString('en-IN') : '—'}
                                    {s.data?.eSignIp ? ` (IP: ${s.data.eSignIp})` : ''}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Documents */}
                <div style={{ marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Documents & Requirements</h4>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Review what has been shared, what is still pending, and what needs your approval.</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {detailDocuments.map((item, idx) => {
                    const isDoc = item.itemType === 'document';
                    const badge = isDoc ? (DOC_BADGE[item.status] || DOC_BADGE.Pending) : { bg: '#f0fdf4', text: '#16a34a' };
                    return (
                      <div key={item._id || idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', flexWrap: 'wrap' }}>
                        <div onClick={() => toggleCheckedDocument(item.label)} style={{ cursor: 'pointer', flexShrink: 0 }}>
                          {checkedDocuments.has(item.label) ? <CheckSquare size={18} color="#2563eb" /> : <Square size={18} color="#94a3b8" />}
                        </div>
                        {item.itemType === 'policy' ? <ScrollText size={16} style={{ color: item.isAccepted ? '#059669' : '#f59e0b', flexShrink: 0 }} /> :
                          item.itemType === 'template' ? <FileSignature size={16} style={{ color: item.isAccepted ? '#059669' : '#f59e0b', flexShrink: 0 }} /> :
                            <FileText size={16} style={{ color: '#64748b', flexShrink: 0 }} />}

                        <div style={{ flex: 1, minWidth: '120px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>{item.label}</div>
                          {item.itemType === 'policy' && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: 'wider', padding: '1px 4px', borderRadius: '4px', background: '#dbeafe', color: '#1e40af' }}>STATIC POLICY</span></div>}
                          {item.isCustomSentFile && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: 'wider', padding: '1px 4px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1' }}>Added FILE</span></div>}
                          {item.rejectionReason && <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '2px' }}>⚠️ {item.rejectionReason}</div>}
                          {(item.itemType === 'policy' || item.itemType === 'template') && !item.isAccepted && (
                            <div style={{ fontSize: '11px', color: item.emailSentAt ? '#92400e' : '#d97706', marginTop: '2px' }}>
                              {item.emailSentAt ? `📧 Sent: ${new Date(item.emailSentAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Not Requested'}
                            </div>
                          )}
                          {isDoc && item.uploadedAt && <div style={{ fontSize: '11px', color: '#1d4ed8', marginTop: '2px' }}>📤 Uploaded: {new Date(item.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>}
                        </div>

                        {item.itemType === 'policy' || item.itemType === 'template' ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: item.isAccepted ? '#dcfce7' : (item.emailSentAt ? '#fef3c7' : '#f1f5f9'), color: item.isAccepted ? '#15803d' : (item.emailSentAt ? '#92400e' : '#64748b'), whiteSpace: 'nowrap' }}>
                            {item.isAccepted ? <><Check size={12} /> Accepted</> : item.emailSentAt ? <><Send size={12} /> Mail Sent</> : <><Clock size={12} /> Pending</>}
                          </span>
                        ) : (
                          <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: badge.bg, color: badge.text, whiteSpace: 'nowrap' }}>{item.status}</span>
                        )}

                        {(item.url || isDoc) && (
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            {item.url && (
                              <button onClick={() => {
                                if (item.itemType === 'template') {
                                  let templatePreviewUrl = '';
                                  if (item.label === 'Offer Letter') {
                                    templatePreviewUrl = `onboarding/employees/${selectedEmployee._id}/offer-letter`;
                                  } else if (item.label === 'Declaration') {
                                    templatePreviewUrl = `onboarding/employees/${selectedEmployee._id}/declaration`;
                                  } else {
                                    templatePreviewUrl = `onboarding/employees/${selectedEmployee._id}/dynamic-template/${item._id}`;
                                  }
                                  handleFilePreview(templatePreviewUrl, item.label, 'document');
                                } else {
                                  handleFilePreview(item.url, item.label, item.itemType || 'file');
                                }
                              }} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#3b82f6', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>View</button>
                            )}
                            {isDoc && item.status === 'Uploaded' && (
                              <>
                                <button onClick={() => handleApproveDoc(selectedEmployee._id, item._id)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'linear-gradient(135deg, #dcfce7, #d1fae5)', color: '#15803d', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>✓ Approve</button>
                                <button onClick={() => handleFlagDoc(selectedEmployee._id, item._id)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'linear-gradient(135deg, #fee2e2, #fecaca)', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>✕ Flag</button>
                              </>
                            )}
                            {item.isCustomSentFile && (
                              <button onClick={() => handleDeleteCustomFile(item._id, item.label)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fff5f5', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>Delete</button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '16px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCustomFileUploader((prev) => !prev)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    <Upload size={16} /> {showCustomFileUploader ? 'Hide Custom File Uploader' : 'Add Custom File'}
                  </button>
                </div>

                {showCustomFileUploader && (
                  <div style={{ marginTop: '16px', marginBottom: '8px', padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #dbe3f0' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>Send Any File to Candidate</h4>
                    <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#64748b' }}>Upload any manual document (policies, booklets, or reference files) and add it to the checklist before sending the pre-onboarding email.</p>

                    <div
                      onClick={() => customFileInputRef.current?.click()}
                      style={{ padding: '22px', border: '1px solid #cbd5e1', borderRadius: '16px', background: '#fff', cursor: 'pointer', textAlign: 'center' }}
                    >
                      <input
                        type="file"
                        multiple
                        accept={CUSTOM_FILE_ACCEPT}
                        ref={customFileInputRef}
                        onChange={(e) => {
                          const selectedFiles = Array.from(e.target.files || []);
                          const invalidTypeFiles = selectedFiles.filter((file) => !isAllowedCustomFile(file));
                          const oversizedFiles = selectedFiles.filter((file) => file.size > CUSTOM_FILE_MAX_SIZE_BYTES);
                          const validFiles = selectedFiles.filter((file) => isAllowedCustomFile(file) && file.size <= CUSTOM_FILE_MAX_SIZE_BYTES);

                          if (invalidTypeFiles.length > 0) {
                            toast.error('Only PDF, Word, Excel, and image files are allowed.');
                          }

                          if (oversizedFiles.length > 0) {
                            toast.error('Each file must be 5 MB or smaller.');
                          }

                          if (validFiles.length === 0) {
                            if (customFileInputRef.current) customFileInputRef.current.value = '';
                            return;
                          }

                          setCustomFiles(prev => {
                            const combined = [...prev, ...validFiles];
                            return combined.filter((file, index, self) =>
                              index === self.findIndex((candidate) => candidate.name === file.name && candidate.size === file.size)
                            );
                          });

                          if (customFileInputRef.current) customFileInputRef.current.value = '';
                        }}
                        style={{ display: 'none' }}
                      />
                      <div style={{ fontSize: '15px', color: '#94a3b8' }}>
                        {customFiles.length > 0 ? `${customFiles.length} file(s) ready to add` : 'Click to select files...'}
                      </div>
                    </div>

                    <p style={{ margin: '14px 0 0', fontSize: '13px', color: '#64748b' }}>Allowed: PDF, Word, Excel, and image files. Max size: 5 MB per file.</p>

                    {customFiles.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
                        {customFiles.map((file, idx) => (
                          <div key={`${file.name}-${file.size}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <FileText size={14} color="#2563eb" />
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== idx));
                              }}
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleAddCustomFiles}
                      disabled={uploadingCustomFiles || customFiles.length === 0}
                      style={{ width: '100%', marginTop: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', border: 'none', background: customFiles.length === 0 ? '#e2e8f0' : 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', cursor: uploadingCustomFiles || customFiles.length === 0 ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '15px', opacity: uploadingCustomFiles ? 0.7 : (customFiles.length === 0 ? 0.6 : 1) }}
                    >
                      <Upload size={16} /> {uploadingCustomFiles ? 'Adding Files...' : 'Add File(s) to Document List'}
                    </button>
                  </div>
                )}

                {/* Submission Deadline Selection */}
                <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} style={{ color: '#3b82f6' }} /> Submission Deadline for Candidate
                  </label>
                  <input
                    type="date"
                    value={emailDeadline}
                    onChange={(e) => setEmailDeadline(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff' }}
                  />
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>The candidate's portal access and deadline in the email will be updated to this date.</p>
                </div>

                <div style={{ marginTop: '16px', padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Edit2 size={16} style={{ color: '#3b82f6' }} /> Onboarding Email Template
                  </label>
                  <select
                    value={selectedEmailTemplateId}
                    onChange={(e) => {
                      applyEmailTemplateDraft(e.target.value, onboardingTemplateOptions);
                      setShowEmailTemplateEditor(false);
                    }}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff', marginBottom: '12px' }}
                  >
                    {onboardingTemplateOptions.map((template) => (
                      <option key={template._id} value={template._id}>
                        {template.name}{template.category ? ` (${template.category === 'built_in' ? 'Built in' : template.category})` : ''}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowEmailTemplateEditor((prev) => !prev)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', borderRadius: '10px', border: '1px solid #dbe3f0', background: '#f8fafc', color: '#0f172a', cursor: 'pointer', textAlign: 'left', marginBottom: '12px' }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                        Email Content
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {customEmailSubject || 'No subject added'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                        {showEmailTemplateEditor ? 'Hide subject, message, and preview' : 'Open subject, message, and preview'}
                      </div>
                    </div>
                    {showEmailTemplateEditor ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                  </button>

                  {showEmailTemplateEditor && (
                    <>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px', display: 'block' }}>
                        Subject
                      </label>
                      <input
                        type="text"
                        value={customEmailSubject}
                        onChange={(e) => setCustomEmailSubject(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff', marginBottom: '12px' }}
                      />

                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px', display: 'block' }}>
                        Email HTML / Template
                      </label>
                      <textarea
                        value={customEmailBody}
                        onChange={(e) => setCustomEmailBody(e.target.value)}
                        rows={6}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff', resize: 'vertical', fontFamily: 'inherit' }}
                      />
                      <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                        You can fully customize the onboarding email here. The selected logo comes from Email Settings Email Branding. Supported placeholders: {templatePlaceholderHelp}
                      </p>

                      <div style={{ marginTop: '14px', padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                          Preview
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>
                          {onboardingPreviewSubject || '(empty subject)'}
                        </div>
                        <div
                          style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', pointerEvents: 'none' }}
                          dangerouslySetInnerHTML={{ __html: onboardingPreviewHtml || '<p>(empty body)</p>' }}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div style={{ marginTop: '16px', padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={16} style={{ color: '#3b82f6' }} /> Sender Account
                  </label>
                  <select
                    value={selectedEmailAccountId}
                    onChange={(e) => setSelectedEmailAccountId(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff' }}
                  >
                    {emailSenderOptions.map((option) => (
                      <option key={option._id} value={option._id}>
                        {option.name} ({option.provider === 'platform' ? 'Platform' : option.provider.toUpperCase()}) - {option.fromAddress}
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                    This sender will be used for the onboarding email and manual file sends from this panel.
                  </p>
                </div>

                {/* Send Pre-Onboarding Email Button */}
                <div style={{ marginTop: '24px', marginBottom: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    {canEditEmployees && (
                      <button
                        type="button"
                        onClick={handleSaveSelectionDraft}
                        disabled={savingDraft}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', cursor: savingDraft ? 'wait' : 'pointer', fontWeight: '700', fontSize: '14px', opacity: savingDraft ? 0.7 : 1 }}
                      >
                        <FileDown size={18} /> {savingDraft ? 'Saving Draft...' : 'Save as Draft'}
                      </button>
                    )}
                    {canRequestOnboarding && (
                      <button
                        onClick={handleSendOnboardingEmail}
                        disabled={sendingEmail}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', cursor: sendingEmail ? 'wait' : 'pointer', fontWeight: '700', fontSize: '14px', boxShadow: '0 4px 14px rgba(37,99,235,0.3)', opacity: sendingEmail ? 0.7 : 1, transition: 'all 0.2s' }}
                      >
                        <Mail size={18} /> {sendingEmail ? 'Sending...' : 'Send Mail'}
                      </button>
                    )}
                  </div>
                  {selectedItemCount > 0 && (
                    <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', marginTop: '8px' }}>
                      {selectedItemCount} item(s) selected
                    </p>
                  )}
                </div>

                {/* Transfer to Active Employee */}
                {!selectedEmployee.transferredToUserId && canCompleteOnboarding && (
                  <div style={{ marginBottom: '24px' }}>
                    <button
                      onClick={() => handleTransferToActive(selectedEmployee._id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '14px', boxShadow: '0 4px 14px rgba(5,150,105,0.3)', transition: 'all 0.2s' }}
                    >
                      <ArrowRightCircle size={18} /> Transfer to Active Employee
                    </button>
                    <p style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', marginTop: '6px' }}>
                      This will create a user account and migrate all documents to their dossier.
                    </p>
                  </div>
                )}

                {selectedEmployee.transferredToUserId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '13px', color: '#166534' }}>
                    <CheckCircle size={16} />
                    <strong>Transferred to Active Employee</strong>
                  </div>
                )}

                {/* Audit Log */}
                {selectedEmployee.auditLog && selectedEmployee.auditLog.length > 0 && (
                  <>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '24px 0 12px' }}>Audit Log</h4>
                    <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      {selectedEmployee.auditLog.slice().reverse().map((log, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                          <span style={{ color: '#94a3b8', minWidth: '130px' }}>{new Date(log.timestamp).toLocaleString('en-IN')}</span>
                          <span style={{ fontWeight: '600', color: '#475569' }}>{log.action}</span>
                          <span style={{ color: '#64748b' }}>{log.details}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Template Preview Modal */}
      {showPreviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                    {previewLabel || (previewType === 'offerLetter' ? 'Offer Letter' : 'Declaration')} {(previewType === 'document' || previewType === 'file') ? '' : 'Template'} Preview
                  </h2>
                </div>

              </div>
              <button onClick={() => { setShowPreviewModal(false); setPreviewBlob(null); }} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', padding: '8px', borderRadius: '8px' }}><X size={20} /></button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '40px', background: '#f1f5f9', display: 'flex', justifyContent: 'center' }}>
              <style>{`
                .docx-content {
                  padding: 0 !important;
                  background: transparent !important;
                }
                /* Force constant black text and standard size for EVERY element inside the doc */
                #docx-preview-root span, 
                #docx-preview-root p, 
                #docx-preview-root div {
                  color: #000 !important;
                  font-family: 'Inter', system-ui, sans-serif !important;
                  font-size: 11.5pt !important;
                  line-height: 1.5 !important;
                }
                #docx-preview-root strong,
                #docx-preview-root b {
                  font-weight: 700 !important;
                }
              `}</style>

              {previewLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#64748b' }}>
                  <RefreshCw size={32} className="animate-spin" />
                  <span>Generating high-fidelity preview...</span>
                </div>
              ) : previewBlob?.type === 'application/pdf' ? (
                <div ref={previewContainerRef} style={{ width: '100%', height: '800px', borderRadius: '12px', overflow: 'hidden' }} />
              ) : (
                <div
                  id="docx-preview-root"
                  className="template-preview-container"
                  style={{
                    width: '100%',
                    maxWidth: '850px',
                    background: '#fff',
                    padding: '80px',
                    borderRadius: '4px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 'fit-content'
                  }}
                >
                  {/* Manual logo injection ONLY for offer letters/declarations/templates, NOT for candidate docs/files */}
                  {(previewType === 'offerLetter' || previewType === 'declaration' || previewType === 'template') && (
                    user?.company?.logo ? (
                      <div style={{ textAlign: 'left', marginBottom: '30px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
                        <img
                          src={user.company.logo}
                          alt="Company Logo"
                          style={{ maxHeight: '55px', maxWidth: '220px', objectFit: 'contain' }}
                        />
                      </div>
                    ) : (
                      <div style={{ marginBottom: '30px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{user?.company?.name || 'Resource Gateway'}</span>
                      </div>
                    )
                  )}
                  <div ref={previewContainerRef} style={{ width: '100%' }} />
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => { setShowPreviewModal(false); }} style={{ padding: '10px 24px', border: '1px solid #d1d5db', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '14px', color: '#475569' }}>
                Close Preview
              </button>
              <button
                onClick={handleDownloadCurrent}
                disabled={!previewBlob}
                style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', opacity: previewBlob ? 1 : 0.6 }}
              >
                <Download size={16} /> Download
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .onboarding-stats-strip::-webkit-scrollbar { height: 8px; }
        .onboarding-stats-strip::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
        .onboarding-stats-strip::-webkit-scrollbar-track { background: transparent; }
        @media (max-width: 768px) {
          .onboarding-stat-card { min-width: 180px !important; }
        }
        .template-preview-content p { margin-bottom: 1em; }
        .template-preview-content h1, .template-preview-content h2 { margin-top: 1.5em; margin-bottom: 0.5em; }
        .template-preview-content table { width: 100%; border-collapse: collapse; margin: 1em 0; }
        .template-preview-content th, .template-preview-content td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
      `}</style>
    </div>
  );
};

export default Onboarding;
