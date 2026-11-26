import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import {
  OFFBOARDING_EMAIL_TEMPLATE_PLACEHOLDERS,
  getSupportedPlaceholderTokens,
  renderTemplateBody,
  resolveTemplate
} from '@/features/email/utils/templatePlaceholders';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  FolderOpen,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  UserMinus,
  X
} from 'lucide-react';

const EXIT_TYPE_OPTIONS = [
  'Resignation',
  'Termination',
  'Retirement',
  'End of Contract',
  'Mutual Separation',
  'Absconding'
];

const STATUS_OPTIONS = ['Initiated', 'In Progress', 'Clearance Pending', 'Completed'];
const EDITABLE_STATUS_OPTIONS = ['Initiated', 'In Progress', 'Clearance Pending', 'Completed'];
const NO_TEMPLATE_OPTION = '__custom__';
const DEFAULT_SUBJECT = 'Exit Documents from {{companyName}}';

const AVAILABLE_LETTER_TAGS = [
  { tag: '{{fullName}}', label: 'Full Name', desc: 'Employee full legal name' },
  { tag: '{{firstName}}', label: 'First Name', desc: 'Employee first name' },
  { tag: '{{lastName}}', label: 'Last Name', desc: 'Employee last name' },
  { tag: '{{employeeCode}}', label: 'Employee Code', desc: 'Employee ID' },
  { tag: '{{designation}}', label: 'Designation', desc: 'Job title' },
  { tag: '{{department}}', label: 'Department', desc: 'Department name' },
  { tag: '{{joiningDate}}', label: 'Joining Date', desc: 'Date of joining' },
  { tag: '{{lastWorkingDay}}', label: 'Last Working Day', desc: 'Official last day' },
  { tag: '{{exitType}}', label: 'Exit Type', desc: 'Resignation / Termination' },
  { tag: '{{companyName}}', label: 'Company Name', desc: 'Organization name' },
  { tag: '{{companyAddress}}', label: 'Company Address', desc: 'Location / Country' },
  { tag: '{{currentDate}}', label: 'Current Date', desc: 'Date of issue' },
  { tag: '{{currentYear}}', label: 'Current Year', desc: 'Four digit year' },
  { tag: '{{noticePeriodServed}}', label: 'Notice Period', desc: 'Yes or No' }
];

const DEFAULT_RELIEVING_BODY_FE = `<p>To whom it may concern,</p>
<p>
    This is to certify that <strong>{{fullName}}</strong>, Employee Code
    <strong>{{employeeCode}}</strong>, worked with
    <strong>{{companyName}}</strong> as
    <strong>{{designation}}</strong> in the
    <strong>{{department}}</strong> department from
    <strong>{{joiningDate}}</strong> to
    <strong>{{lastWorkingDay}}</strong>.
</p>
<p>
    The employee has been formally relieved from their duties and responsibilities with effect from the close of business
    on {{lastWorkingDay}}.
</p>
<p>We thank them for their contribution and wish them every success in their future endeavors.</p>
<div style="margin-top:40px;">
    <div style="font-weight:600;">HR Department</div>
    <div>{{companyName}}</div>
</div>`;

const DEFAULT_EXPERIENCE_BODY_FE = `<p>To whom it may concern,</p>
<p>
    This is to certify that <strong>{{fullName}}</strong>, Employee Code
    <strong>{{employeeCode}}</strong>, was employed with
    <strong>{{companyName}}</strong> from
    <strong>{{joiningDate}}</strong> to
    <strong>{{lastWorkingDay}}</strong>.
</p>
<p>
    During this period, the employee served as
    <strong>{{designation}}</strong> in the
    <strong>{{department}}</strong> department.
</p>
<p>
    Throughout their tenure, the employee has been found to be sincere, hardworking, and dedicated in the discharge
    of their responsibilities.
</p>
<p>We wish them continued success in their future professional journey.</p>
<div style="margin-top:40px;">
    <div style="font-weight:600;">HR Department</div>
    <div>{{companyName}}</div>
</div>`;
const DEFAULT_BODY = '<p>Dear {{firstName}},<br>Please find attached your exit documents.<br>Best regards,<br>HR Team</p>';
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ACCEPTED_ATTACHMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];

const INITIAL_CREATE_FORM = {
  userId: '',
  exitType: 'Resignation',
  lastWorkingDay: '',
  noticePeriodServed: false,
  hrRemarks: ''
};

const pageShellStyle = {
  padding: '18px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  minHeight: '100%',
  fontFamily: 'inherit'
};

const cardStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '16px',
  boxShadow: '0 4px 15px rgba(15, 23, 42, 0.03)'
};

const sectionTitleStyle = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: '#64748b',
  marginBottom: '8px'
};

const fieldLabelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: '#475569',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em'
};

const inputStyle = {
  width: '100%',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  padding: '8px 12px',
  fontSize: '12px',
  color: '#0f172a',
  outline: 'none',
  background: '#ffffff',
  boxSizing: 'border-box'
};

const textareaStyle = {
  ...inputStyle,
  minHeight: '80px',
  resize: 'vertical',
  fontFamily: 'inherit'
};

const ghostButtonStyle = {
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  color: '#334155',
  borderRadius: '10px',
  padding: '6px 12px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer'
};

const primaryButtonStyle = {
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
  color: '#ffffff',
  borderRadius: '10px',
  padding: '8px 14px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer'
};

const statusToneMap = {
  Initiated: { background: '#fef3c7', color: '#92400e' },
  'In Progress': { background: '#dbeafe', color: '#1d4ed8' },
  'Clearance Pending': { background: '#fed7aa', color: '#c2410c' },
  Completed: { background: '#dcfce7', color: '#15803d' }
};

const getStatusBadgeStyle = (status) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 8px',
  borderRadius: '999px',
  fontSize: '10.5px',
  fontWeight: 700,
  background: (statusToneMap[status] || statusToneMap.Initiated).background,
  color: (statusToneMap[status] || statusToneMap.Initiated).color
});

const formatDateLabel = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getEmployeeName = (employee) => {
  if (!employee) return 'Employee';
  return `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee';
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const isAllowedAttachment = (file) => {
  if (!file) return false;
  if (file.type?.startsWith('image/')) return true;

  const name = String(file.name || '').toLowerCase();
  return ACCEPTED_ATTACHMENT_EXTENSIONS.some((extension) => name.endsWith(extension));
};

const getTemplatePreviewData = (record, userCompanyName) => {
  const employee = record?.userId || {};
  const profile = employee?.employeeProfile || {};
  return {
    firstName: employee.firstName || '',
    lastName: employee.lastName || '',
    fullName: getEmployeeName(employee),
    email: employee.email || '',
    employeeCode: employee.employeeCode || profile?.employment?.employeeCode || '',
    designation: profile?.employment?.designation || '',
    department: employee.department || '',
    joiningDate: formatDateLabel(employee.joiningDate || profile?.employment?.joiningDate),
    lastWorkingDay: formatDateLabel(record?.lastWorkingDay),
    exitType: record?.exitType || '',
    noticePeriodServed: record?.noticePeriodServed ? 'Yes' : 'No',
    companyName: userCompanyName || 'TalentCIO',
    companyAddress: userCompanyName || 'Headquarters',
    currentDate: formatDateLabel(new Date().toISOString()),
    currentYear: new Date().getFullYear().toString()
  };
};

const ModalShell = ({ title, subtitle, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', zIndex: 60, padding: '16px', overflowY: 'auto' }}>
    <div style={{ maxWidth: '840px', margin: '0 auto', ...cardStyle, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{title}</h2>
          {subtitle ? <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '11px' }}>{subtitle}</p> : null}
        </div>
        <button type="button" onClick={onClose} style={{ ...ghostButtonStyle, padding: '6px 8px' }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ padding: '18px' }}>{children}</div>
    </div>
  </div>
);

const Offboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAdmin = user?.roles?.some(role => ['Admin', 'Super Admin', 'System Admin'].includes(role)) || permissions.includes('*');
  const canRead = isAdmin || permissions.includes('offboarding.read');
  const canCreate = isAdmin || permissions.includes('offboarding.create');
  const canUpdate = isAdmin || permissions.includes('offboarding.update');

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    initiated: 0,
    inProgress: 0,
    clearancePending: 0,
    completed: 0,
    thisMonth: 0
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [exitTypeFilter, setExitTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);
  const [createSaving, setCreateSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(NO_TEMPLATE_OPTION);
  const [customSubject, setCustomSubject] = useState(DEFAULT_SUBJECT);
  const [customBody, setCustomBody] = useState(DEFAULT_BODY);
  const [showBodyEditor, setShowBodyEditor] = useState(false);
  const [emailSenderOptions, setEmailSenderOptions] = useState([]);
  const [sendersLoading, setSendersLoading] = useState(false);
  const [selectedEmailAccountId, setSelectedEmailAccountId] = useState('platform');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [emailBcc, setEmailBcc] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [statusDraft, setStatusDraft] = useState('Initiated');
  const [statusSaving, setStatusSaving] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('clearance');
  const [clearanceDraft, setClearanceDraft] = useState({
    it: false,
    finance: false,
    hr: false,
    admin: false,
    manager: false
  });
  const [clearanceSaving, setClearanceSaving] = useState(false);
  const [exitInterviewDone, setExitInterviewDone] = useState(false);
  const [exitInterviewNotes, setExitInterviewNotes] = useState('');
  const [interviewSaving, setInterviewSaving] = useState(false);
  const [fnfDraft, setFnfDraft] = useState({
    basicSalaryDue: 0,
    leaveEncashment: 0,
    bonusDue: 0,
    deductions: 0,
    isSettled: false
  });
  const [fnfSaving, setFnfSaving] = useState(false);
  const [docTypesSelected, setDocTypesSelected] = useState(['Relieving Letter', 'Experience Letter']);
  const [docPersonalNote, setDocPersonalNote] = useState('');
  const [docsGenerating, setDocsGenerating] = useState(false);
  const [lettersSubTab, setLettersSubTab] = useState('dossier');
  const [letterTypeToGenerate, setLetterTypeToGenerate] = useState('Relieving Letter');
  const [letterBodyDraft, setLetterBodyDraft] = useState(DEFAULT_RELIEVING_BODY_FE);
  const [dossierLetters, setDossierLetters] = useState([]);
  const [loadingDossierLetters, setLoadingDossierLetters] = useState(false);
  const [selectedDossierDocIds, setSelectedDossierDocIds] = useState([]);
  const [savingLetterToDossier, setSavingLetterToDossier] = useState(false);
  const [sendingDossierLetters, setSendingDossierLetters] = useState(false);
  const [dossierPersonalNote, setDossierPersonalNote] = useState('');
  const [drawerUploadedFile, setDrawerUploadedFile] = useState(null);
  const [showTopLetterModal, setShowTopLetterModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: Manage Templates | 2: Generate Employee Letters | 3: Proceed with Offboarding

  // Step 1: Manage Templates
  const [activeTemplateType, setActiveTemplateType] = useState('Relieving Letter'); // 'Relieving Letter' | 'Experience Letter'
  const [templateBodies, setTemplateBodies] = useState({
    'Relieving Letter': DEFAULT_RELIEVING_BODY_FE,
    'Experience Letter': DEFAULT_EXPERIENCE_BODY_FE
  });
  const [step1UploadedFiles, setStep1UploadedFiles] = useState({
    'Relieving Letter': null,
    'Experience Letter': null
  });
  const [step1DocxPreviews, setStep1DocxPreviews] = useState({
    'Relieving Letter': '',
    'Experience Letter': ''
  });
  const [step1LoadingTemplates, setStep1LoadingTemplates] = useState(false);
  const [step1SavingTemplate, setStep1SavingTemplate] = useState(false);
  const [step1PreviewLoading, setStep1PreviewLoading] = useState(false);

  // Step 2: Generate Employee Letters
  const [selectedRelievingCheck, setSelectedRelievingCheck] = useState(true);
  const [selectedExperienceCheck, setSelectedExperienceCheck] = useState(true);
  const [generatedLetterPreviews, setGeneratedLetterPreviews] = useState({});
  const [activePreviewType, setActivePreviewType] = useState('Relieving Letter');
  const [generatingPreviews, setGeneratingPreviews] = useState(false);
  const [savingBatchToDossier, setSavingBatchToDossier] = useState(false);

  // Step 3: Send & Proceed with Offboarding
  const [topSendRecipientEmail, setTopSendRecipientEmail] = useState('');
  const [topSendEmailAccountId, setTopSendEmailAccountId] = useState('platform');
  const [topSendPersonalNote, setTopSendPersonalNote] = useState('');
  const [topSendingLetters, setTopSendingLetters] = useState(false);

  const [topLetterForm, setTopLetterForm] = useState({
    userId: '',
    offboardingId: '',
    letterType: 'Relieving Letter',
    customBody: DEFAULT_RELIEVING_BODY_FE,
    lastWorkingDay: '',
    exitType: 'Resignation'
  });
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1024 : false));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchStats = useCallback(async () => {
    if (!canRead) return;
    setStatsLoading(true);
    try {
      const response = await api.get('/offboarding/stats');
      setStats({
        total: Number(response.data?.total || 0),
        initiated: Number(response.data?.initiated || 0),
        inProgress: Number(response.data?.inProgress || 0),
        clearancePending: Number(response.data?.clearancePending || 0),
        completed: Number(response.data?.completed || 0),
        thisMonth: Number(response.data?.thisMonth || 0)
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load offboarding stats');
    } finally {
      setStatsLoading(false);
    }
  }, [canRead]);

  const fetchRecords = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const response = await api.get('/offboarding', {
        params: {
          page: currentPage,
          limit: 20,
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
          ...(exitTypeFilter !== 'all' ? { exitType: exitTypeFilter } : {})
        }
      });
      const nextRecords = Array.isArray(response.data?.records) ? response.data.records : [];
      setRecords(nextRecords);
      setTotalPages(Number(response.data?.totalPages || 1));
      setTotalRecords(Number(response.data?.total || nextRecords.length || 0));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load offboarding records');
    } finally {
      setLoading(false);
    }
  }, [canRead, currentPage, exitTypeFilter, statusFilter]);

  const fetchRecordDetail = useCallback(async (recordId) => {
    if (!recordId) return;
    setDetailLoading(true);
    try {
      const response = await api.get(`/offboarding/${recordId}`);
      setSelectedRecord(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load offboarding record');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    if (!canCreate) return;
    setEmployeesLoading(true);
    try {
      const response = await api.get('/admin/users?active=true');
      const nextEmployees = Array.isArray(response.data)
        ? response.data
        : (Array.isArray(response.data?.users) ? response.data.users : []);
      setEmployees(nextEmployees.filter((employee) => employee?.isDeleted !== true && employee?.isActive !== false));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load employees');
    } finally {
      setEmployeesLoading(false);
    }
  }, [canCreate]);

  const fetchComposerOptions = useCallback(async () => {
    setTemplatesLoading(true);
    setSendersLoading(true);
    try {
      const [templatesResponse, sendersResponse] = await Promise.all([
        api.get('/email-templates?active=true&templateType=offboarding&scope=general'),
        api.get('/company/email-settings/senders')
      ]);

      const nextTemplates = Array.isArray(templatesResponse.data) ? templatesResponse.data : [];
      const senderData = sendersResponse.data || {};
      const nextSenderOptions = [
        senderData.platformOption,
        ...((senderData.accounts || []).filter((account) => account.ready))
      ].filter(Boolean);
      const defaultSenderId = nextSenderOptions.some((option) => option._id === senderData.defaultAccountId)
        ? senderData.defaultAccountId
        : (nextSenderOptions[0]?._id || 'platform');

      setEmailTemplates(nextTemplates);
      setEmailSenderOptions(nextSenderOptions);
      setSelectedEmailAccountId(defaultSenderId);
    } catch (error) {
      setEmailTemplates([]);
      setEmailSenderOptions([{ _id: 'platform', name: 'TalentCIO Platform', provider: 'platform', fromAddress: 'no-reply@talentcio.in' }]);
      setSelectedEmailAccountId('platform');
      toast.error(error.response?.data?.message || 'Failed to load sender/template options');
    } finally {
      setTemplatesLoading(false);
      setSendersLoading(false);
    }
  }, []);

  const fetchDossierLetters = useCallback(async (userId) => {
    if (!userId) {
      setDossierLetters([]);
      return;
    }
    setLoadingDossierLetters(true);
    try {
      const response = await api.get(`/offboarding/dossier-letters/${userId}`);
      const list = Array.isArray(response.data?.letters)
        ? response.data.letters
        : (Array.isArray(response.data?.documents) ? response.data.documents : []);
      setDossierLetters(list);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load letters from employee dossier');
      setDossierLetters([]);
    } finally {
      setLoadingDossierLetters(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (!selectedRecordId) {
      setSelectedRecord(null);
      return;
    }

    fetchRecordDetail(selectedRecordId);
    fetchComposerOptions();
    setSelectedTemplateId(NO_TEMPLATE_OPTION);
    setCustomSubject(DEFAULT_SUBJECT);
    setCustomBody(DEFAULT_BODY);
    setShowBodyEditor(false);
    setAttachmentFiles([]);
  }, [fetchComposerOptions, fetchRecordDetail, selectedRecordId]);

  useEffect(() => {
    if (!selectedRecord) {
      setDossierLetters([]);
      setSelectedDossierDocIds([]);
      return;
    }
    const personalEmail = selectedRecord?.userId?.employeeProfile?.contact?.personalEmail || '';
    setRecipientEmail(personalEmail || selectedRecord?.userId?.email || '');
    setStatusDraft(EDITABLE_STATUS_OPTIONS.includes(selectedRecord?.status) ? selectedRecord.status : 'In Progress');
    setClearanceDraft({
      it: Boolean(selectedRecord?.clearance?.it),
      finance: Boolean(selectedRecord?.clearance?.finance),
      hr: Boolean(selectedRecord?.clearance?.hr),
      admin: Boolean(selectedRecord?.clearance?.admin),
      manager: Boolean(selectedRecord?.clearance?.manager)
    });
    setExitInterviewDone(Boolean(selectedRecord?.exitInterviewDone));
    setExitInterviewNotes(selectedRecord?.exitInterviewNotes || '');
    setFnfDraft({
      basicSalaryDue: selectedRecord?.fnfDetails?.basicSalaryDue ?? 0,
      leaveEncashment: selectedRecord?.fnfDetails?.leaveEncashment ?? 0,
      bonusDue: selectedRecord?.fnfDetails?.bonusDue ?? 0,
      deductions: selectedRecord?.fnfDetails?.deductions ?? 0,
      isSettled: Boolean(selectedRecord?.fnfDetails?.settledAt)
    });
    setSelectedDossierDocIds([]);
    if (selectedRecord?.userId?._id) {
      fetchDossierLetters(selectedRecord.userId._id);
    }
  }, [selectedRecord, fetchDossierLetters]);

  useEffect(() => {
    const selectedTemplate = emailTemplates.find((template) => template._id === selectedTemplateId) || null;
    if (!selectedTemplate || selectedTemplateId === NO_TEMPLATE_OPTION) {
      setCustomSubject(DEFAULT_SUBJECT);
      setCustomBody(DEFAULT_BODY);
      return;
    }

    setCustomSubject(selectedTemplate.subject || DEFAULT_SUBJECT);
    setCustomBody(selectedTemplate.htmlBody || DEFAULT_BODY);
  }, [emailTemplates, selectedTemplateId]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = debouncedSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) return records;

    return records.filter((record) => {
      const employee = record?.userId || {};
      const haystack = [
        getEmployeeName(employee),
        employee.email,
        employee.employeeCode
      ].join(' ').toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [debouncedSearchTerm, records]);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = employeeSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) return employees;
    return employees.filter((employee) => (
      [
        getEmployeeName(employee),
        employee.email,
        employee.employeeCode,
        employee.department
      ].join(' ').toLowerCase().includes(normalizedSearch)
    ));
  }, [employeeSearchTerm, employees]);

  const offboardingEmployees = useMemo(() => {
    const seen = new Set();
    const list = [];
    (records || []).forEach((record) => {
      const u = record.userId;
      if (u && u._id && !seen.has(String(u._id))) {
        seen.add(String(u._id));
        list.push({
          ...u,
          offboardingRecordId: record._id,
          lastWorkingDay: record.lastWorkingDay,
          exitType: record.exitType,
          offboardingStatus: record.status,
          noticePeriodServed: record.noticePeriodServed,
          fnfSettled: Boolean(record.fnfDetails?.settledAt)
        });
      }
    });
    return list;
  }, [records]);

  const filteredOffboardingEmployees = useMemo(() => {
    const normalizedSearch = employeeSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) return offboardingEmployees;
    return offboardingEmployees.filter((emp) => (
      [
        getEmployeeName(emp),
        emp.email,
        emp.employeeCode,
        emp.department,
        emp.exitType,
        emp.offboardingStatus
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    ));
  }, [offboardingEmployees, employeeSearchTerm]);

  const selectedTemplate = useMemo(
    () => emailTemplates.find((template) => template._id === selectedTemplateId) || null,
    [emailTemplates, selectedTemplateId]
  );

  const templatePreviewData = useMemo(
    () => getTemplatePreviewData(selectedRecord, user?.company?.name || 'TalentCIO'),
    [selectedRecord, user?.company?.name]
  );

  const previewSubject = useMemo(
    () => resolveTemplate(customSubject || DEFAULT_SUBJECT, templatePreviewData),
    [customSubject, templatePreviewData]
  );

  const previewBody = useMemo(
    () => renderTemplateBody(customBody || DEFAULT_BODY, templatePreviewData),
    [customBody, templatePreviewData]
  );

  const previouslySentItems = useMemo(() => {
    const items = Array.isArray(selectedRecord?.documentsIssued) ? [...selectedRecord.documentsIssued] : [];
    return items.sort((left, right) => new Date(right.sentAt || 0) - new Date(left.sentAt || 0));
  }, [selectedRecord]);

  const placeholderHelpText = useMemo(
    () => getSupportedPlaceholderTokens(OFFBOARDING_EMAIL_TEMPLATE_PLACEHOLDERS).join(', '),
    []
  );

  const handleRefresh = async () => {
    await Promise.all([fetchStats(), fetchRecords()]);
    if (selectedRecordId) {
      await fetchRecordDetail(selectedRecordId);
    }
  };

  const handleOpenCreate = async () => {
    setShowCreateModal(true);
    setCreateForm(INITIAL_CREATE_FORM);
    setEmployeeSearchTerm('');
    if (employees.length === 0) {
      await fetchEmployees();
    }
  };

  const handleCreateOffboarding = async (event) => {
    event.preventDefault();
    if (!createForm.userId || !createForm.exitType || !createForm.lastWorkingDay) {
      toast.error('Select an employee, exit type, and last working day');
      return;
    }

    setCreateSaving(true);
    try {
      await api.post('/offboarding', createForm);
      toast.success('Offboarding initiated successfully');
      setShowCreateModal(false);
      setCreateForm(INITIAL_CREATE_FORM);
      await Promise.all([fetchStats(), fetchRecords()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate offboarding');
    } finally {
      setCreateSaving(false);
    }
  };

  const handleAttachmentChange = (event) => {
    const incomingFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (incomingFiles.length === 0) return;

    const nextFiles = [...attachmentFiles];
    for (const file of incomingFiles) {
      if (nextFiles.length >= MAX_ATTACHMENTS) {
        toast.error(`You can attach up to ${MAX_ATTACHMENTS} files only`);
        break;
      }

      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`${file.name} exceeds the 10MB limit`);
        continue;
      }

      if (!isAllowedAttachment(file)) {
        toast.error(`${file.name} is not a supported file type`);
        continue;
      }

      nextFiles.push(file);
    }

    setAttachmentFiles(nextFiles);
  };

  const handleRemoveAttachment = (indexToRemove) => {
    setAttachmentFiles((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const handleSendEmail = async () => {
    if (!selectedRecord?._id) return;
    if (!recipientEmail.trim()) {
      toast.error('Recipient email is required');
      return;
    }
    if (!isValidEmail(recipientEmail)) {
      toast.error('Enter a valid recipient email');
      return;
    }

    const formData = new FormData();
    formData.append('recipientEmail', recipientEmail.trim());
    if (emailCc.trim()) formData.append('cc', emailCc.trim());
    if (emailBcc.trim()) formData.append('bcc', emailBcc.trim());
    formData.append('emailAccountId', selectedEmailAccountId);
    if (selectedTemplate && selectedTemplateId !== NO_TEMPLATE_OPTION) {
      formData.append('emailTemplateId', selectedTemplateId);
    }
    formData.append('customSubject', customSubject);
    formData.append('customBody', customBody);
    attachmentFiles.forEach((file) => formData.append('attachments', file));

    setSending(true);
    try {
      await api.post(`/offboarding/${selectedRecord._id}/send-email`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Email sent successfully');
      setAttachmentFiles([]);
      await Promise.all([fetchRecordDetail(selectedRecord._id), fetchRecords(), fetchStats()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedRecord?._id) return;
    if (!EDITABLE_STATUS_OPTIONS.includes(statusDraft)) {
      toast.error('Select a valid workflow status');
      return;
    }

    setStatusSaving(true);
    try {
      if (statusDraft === 'Completed') {
        const confirmed = window.confirm(
          `Mark offboarding as completed for ${getEmployeeName(selectedRecord.userId)}? This will deactivate the employee account.`
        );

        if (!confirmed) {
          setStatusSaving(false);
          return;
        }

        await api.post(`/offboarding/${selectedRecord._id}/complete`);
        toast.success('Offboarding completed successfully');
      } else {
        await api.put(`/offboarding/${selectedRecord._id}`, { status: statusDraft });
        toast.success('Status updated successfully');
      }
      await Promise.all([fetchRecordDetail(selectedRecord._id), fetchRecords(), fetchStats()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusSaving(false);
    }
  };

  const calculatedNetPayable = useMemo(() => {
    const basic = Number(fnfDraft.basicSalaryDue || 0);
    const leave = Number(fnfDraft.leaveEncashment || 0);
    const bonus = Number(fnfDraft.bonusDue || 0);
    const deductions = Number(fnfDraft.deductions || 0);
    return Math.max(0, basic + leave + bonus - deductions);
  }, [fnfDraft]);

  const handleSaveClearance = async () => {
    if (!selectedRecord?._id) return;
    setClearanceSaving(true);
    try {
      await api.put(`/offboarding/${selectedRecord._id}`, { clearance: clearanceDraft });
      toast.success('Clearance checklist updated');
      await Promise.all([fetchRecordDetail(selectedRecord._id), fetchRecords(), fetchStats()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update clearance');
    } finally {
      setClearanceSaving(false);
    }
  };

  const handleSaveInterview = async () => {
    if (!selectedRecord?._id) return;
    setInterviewSaving(true);
    try {
      await api.put(`/offboarding/${selectedRecord._id}`, {
        exitInterviewDone,
        exitInterviewNotes
      });
      toast.success('Exit interview details saved');
      await fetchRecordDetail(selectedRecord._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save exit interview');
    } finally {
      setInterviewSaving(false);
    }
  };

  const handleSaveFnF = async () => {
    if (!selectedRecord?._id) return;
    setFnfSaving(true);
    try {
      const payload = {
        basicSalaryDue: Number(fnfDraft.basicSalaryDue || 0),
        leaveEncashment: Number(fnfDraft.leaveEncashment || 0),
        bonusDue: Number(fnfDraft.bonusDue || 0),
        deductions: Number(fnfDraft.deductions || 0),
        settledAt: fnfDraft.isSettled ? (selectedRecord?.fnfDetails?.settledAt || new Date().toISOString()) : null
      };
      await api.put(`/offboarding/${selectedRecord._id}`, { fnfDetails: payload });
      toast.success('F&F settlement details saved');
      await fetchRecordDetail(selectedRecord._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save F&F details');
    } finally {
      setFnfSaving(false);
    }
  };

  const handleToggleDocType = (docType) => {
    setDocTypesSelected((prev) => (
      prev.includes(docType) ? prev.filter((t) => t !== docType) : [...prev, docType]
    ));
  };

  const handleGenerateExitDocuments = async () => {
    if (!selectedRecord?._id) return;
    if (docTypesSelected.length === 0) {
      toast.error('Select at least one document type to generate');
      return;
    }
    if (!recipientEmail.trim() || !isValidEmail(recipientEmail)) {
      toast.error('Enter a valid recipient email');
      return;
    }

    setDocsGenerating(true);
    try {
      await api.post(`/offboarding/${selectedRecord._id}/send-documents`, {
        documentTypes: docTypesSelected,
        recipientEmail: recipientEmail.trim(),
        personalNote: docPersonalNote.trim(),
        emailAccountId: selectedEmailAccountId || 'platform'
      });
      toast.success('Exit documents generated, archived to dossier, and sent!');
      setDocPersonalNote('');
      await Promise.all([fetchRecordDetail(selectedRecord._id), fetchRecords(), fetchStats()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate and send exit documents');
    } finally {
      setDocsGenerating(false);
    }
  };

  const handleSelectLetterType = (type) => {
    setLetterTypeToGenerate(type);
    if (type === 'Relieving Letter') {
      setLetterBodyDraft(DEFAULT_RELIEVING_BODY_FE);
    } else {
      setLetterBodyDraft(DEFAULT_EXPERIENCE_BODY_FE);
    }
  };

  const handleInsertTag = (tag) => {
    setLetterBodyDraft((prev) => `${prev} ${tag}`);
  };

  const letterPreviewHtml = useMemo(() => {
    return resolveTemplate(letterBodyDraft, templatePreviewData);
  }, [letterBodyDraft, templatePreviewData]);

  const handleGenerateAndSaveLetter = async () => {
    if (!selectedRecord?._id || !selectedRecord?.userId?._id) {
      toast.error('Select an offboarding record first');
      return;
    }
    setSavingLetterToDossier(true);
    try {
      const formData = new FormData();
      formData.append('userId', selectedRecord.userId._id);
      formData.append('offboardingId', selectedRecord._id);
      formData.append('letterType', letterTypeToGenerate);
      formData.append('customBody', letterBodyDraft);
      if (drawerUploadedFile) {
        formData.append('file', drawerUploadedFile);
      }
      const res = await api.post('/offboarding/generate-letter', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data?.message || `${letterTypeToGenerate} generated and saved to employee's Dossier!`);
      await Promise.all([
        fetchDossierLetters(selectedRecord.userId._id),
        fetchRecordDetail(selectedRecord._id),
        fetchRecords()
      ]);
      if (res.data?.document?._id) {
        setSelectedDossierDocIds([res.data.document._id]);
      }
      setLettersSubTab('dossier');
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to generate and save ${letterTypeToGenerate}`);
    } finally {
      setSavingLetterToDossier(false);
    }
  };

  const handleToggleDossierDoc = (docId) => {
    setSelectedDossierDocIds((prev) => (
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    ));
  };

  const handleSelectAllDossierDocs = () => {
    if (selectedDossierDocIds.length === dossierLetters.length) {
      setSelectedDossierDocIds([]);
    } else {
      setSelectedDossierDocIds(dossierLetters.map((doc) => doc._id));
    }
  };

  const handleSendDossierLetters = async () => {
    if (!selectedRecord?._id) return;
    if (selectedDossierDocIds.length === 0) {
      toast.error('Select at least one letter from the employee dossier');
      return;
    }
    if (!recipientEmail.trim() || !isValidEmail(recipientEmail)) {
      toast.error('Enter a valid recipient email');
      return;
    }

    setSendingDossierLetters(true);
    try {
      const res = await api.post(`/offboarding/${selectedRecord._id}/send-dossier-letters`, {
        dossierDocIds: selectedDossierDocIds,
        recipientEmail: recipientEmail.trim(),
        personalNote: dossierPersonalNote.trim(),
        emailAccountId: selectedEmailAccountId || 'platform'
      });
      toast.success(res.data?.message || 'Selected letters sent to employee successfully!');
      setSelectedDossierDocIds([]);
      setDossierPersonalNote('');
      await Promise.all([
        fetchRecordDetail(selectedRecord._id),
        fetchDossierLetters(selectedRecord.userId._id),
        fetchRecords(),
        fetchStats()
      ]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send dossier letters');
    } finally {
      setSendingDossierLetters(false);
    }
  };

  const fetchLetterTemplates = useCallback(async () => {
    setStep1LoadingTemplates(true);
    try {
      const res = await api.get('/offboarding/templates');
      if (res.data?.templates) {
        setTemplateBodies({
          'Relieving Letter': res.data.templates['Relieving Letter']?.body || DEFAULT_RELIEVING_BODY_FE,
          'Experience Letter': res.data.templates['Experience Letter']?.body || DEFAULT_EXPERIENCE_BODY_FE
        });
      }
    } catch (err) {
      console.warn('Failed to load offboarding templates:', err);
    } finally {
      setStep1LoadingTemplates(false);
    }
  }, []);

  const handleOpenTopLetterModal = async () => {
    setShowTopLetterModal(true);
    setEmployeeSearchTerm('');
    setGeneratedLetterPreviews({});
    fetchLetterTemplates();

    if (records.length === 0) {
      await fetchRecords();
    }

    if (emailSenderOptions.length <= 1) {
      fetchComposerOptions();
    }

    if (selectedRecord?.userId?._id) {
      const emp = selectedRecord.userId;
      const rawDate = selectedRecord.lastWorkingDay ? new Date(selectedRecord.lastWorkingDay) : null;
      const formattedDate = rawDate && !isNaN(rawDate.getTime()) ? rawDate.toISOString().slice(0, 10) : '';

      setTopLetterForm({
        userId: emp._id,
        offboardingId: selectedRecord._id,
        letterType: 'Relieving Letter',
        customBody: DEFAULT_RELIEVING_BODY_FE,
        lastWorkingDay: formattedDate,
        exitType: selectedRecord.exitType || 'Resignation'
      });
      const email = emp.employeeProfile?.contact?.personalEmail || emp.email || '';
      setTopSendRecipientEmail(email);
      await fetchDossierLetters(emp._id);
      setWizardStep(2);
    } else {
      setTopLetterForm({
        userId: '',
        offboardingId: '',
        letterType: 'Relieving Letter',
        customBody: DEFAULT_RELIEVING_BODY_FE,
        lastWorkingDay: '',
        exitType: 'Resignation'
      });
      setTopSendRecipientEmail('');
      setDossierLetters([]);
      setWizardStep(1);
    }
  };

  const handleStep1FileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isDocx = fileName.endsWith('.docx');
    const isHtml = fileName.endsWith('.html') || fileName.endsWith('.htm');
    const isTxt = fileName.endsWith('.txt');

    if (!isDocx && !isHtml && !isTxt) {
      toast.error('Please upload a Word document (.docx), HTML file (.html), or Text file (.txt)');
      return;
    }

    setStep1UploadedFiles(prev => ({ ...prev, [activeTemplateType]: file }));

    if (isHtml || isTxt) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result || '';
        setTemplateBodies(prev => ({ ...prev, [activeTemplateType]: text }));
        setStep1DocxPreviews(prev => ({ ...prev, [activeTemplateType]: '' }));
      };
      reader.readAsText(file);
      toast.success(`${activeTemplateType} template "${file.name}" loaded!`);
    } else if (isDocx) {
      setStep1PreviewLoading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('letterType', activeTemplateType);
        const res = await api.post('/offboarding/preview-letter', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data?.html) {
          setStep1DocxPreviews(prev => ({ ...prev, [activeTemplateType]: res.data.html }));
        }
        toast.success(`Word template "${file.name}" attached & parsed!`);
      } catch (err) {
        console.warn('Docx preview error:', err);
        setStep1DocxPreviews(prev => ({
          ...prev,
          [activeTemplateType]: '<p style="color:#64748b; font-style:italic;">Word document attached. Placeholders will be replaced when generating letters.</p>'
        }));
        toast.success(`Word template "${file.name}" attached!`);
      } finally {
        setStep1PreviewLoading(false);
      }
    }
  };

  const handleStep1InsertTag = (tag) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(tag);
    }
    toast.success(`Copied ${tag}`);
    setTemplateBodies(prev => ({
      ...prev,
      [activeTemplateType]: `${prev[activeTemplateType] || ''} ${tag}`
    }));
  };

  const handleStep1SaveTemplate = async () => {
    setStep1SavingTemplate(true);
    try {
      const formData = new FormData();
      formData.append('letterType', activeTemplateType);
      formData.append('body', templateBodies[activeTemplateType] || '');
      if (step1UploadedFiles[activeTemplateType]) {
        formData.append('file', step1UploadedFiles[activeTemplateType]);
      }

      const res = await api.post('/offboarding/templates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data?.message || `${activeTemplateType} template saved successfully for future use!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save template');
    } finally {
      setStep1SavingTemplate(false);
    }
  };

  const step1SamplePreviewData = useMemo(() => ({
    fullName: 'Jane Doe',
    firstName: 'Jane',
    lastName: 'Doe',
    employeeCode: 'EMP0042',
    designation: 'Senior Software Engineer',
    department: 'Engineering',
    joiningDate: '15 January 2023',
    lastWorkingDay: '30 November 2026',
    exitType: 'Resignation',
    noticePeriodServed: 'Yes',
    companyName: user?.company?.name || 'TalentCIO',
    companyAddress: 'Headquarters',
    currentDate: formatDateLabel(new Date().toISOString()),
    currentYear: new Date().getFullYear().toString()
  }), [user?.company?.name]);

  const step1PreviewHtml = useMemo(() => {
    if (step1DocxPreviews[activeTemplateType]) {
      return step1DocxPreviews[activeTemplateType];
    }
    return resolveTemplate(templateBodies[activeTemplateType] || '', step1SamplePreviewData);
  }, [activeTemplateType, templateBodies, step1DocxPreviews, step1SamplePreviewData]);

  const handleSelectOffboardingEmployee = (emp) => {
    const rawDate = emp.lastWorkingDay ? new Date(emp.lastWorkingDay) : null;
    const formattedDate = rawDate && !isNaN(rawDate.getTime()) ? rawDate.toISOString().slice(0, 10) : '';

    setTopLetterForm((prev) => ({
      ...prev,
      userId: emp._id,
      offboardingId: emp.offboardingRecordId || '',
      lastWorkingDay: formattedDate,
      exitType: emp.exitType || 'Resignation'
    }));

    const email = emp.employeeProfile?.contact?.personalEmail || emp.email || '';
    setTopSendRecipientEmail(email);
    setGeneratedLetterPreviews({});
    fetchDossierLetters(emp._id);
  };

  const topSelectedEmployee = useMemo(() => {
    return offboardingEmployees.find(e => e._id === topLetterForm.userId) ||
      (selectedRecord?.userId?._id === topLetterForm.userId ? selectedRecord.userId : null) ||
      employees.find(e => e._id === topLetterForm.userId) || null;
  }, [offboardingEmployees, selectedRecord, employees, topLetterForm.userId]);

  const handleGenerateBatchPreviews = async () => {
    if (!topLetterForm.userId) {
      toast.error('Please select an employee in offboarding first');
      return;
    }
    const chosenTypes = [
      selectedRelievingCheck ? 'Relieving Letter' : null,
      selectedExperienceCheck ? 'Experience Letter' : null
    ].filter(Boolean);

    if (chosenTypes.length === 0) {
      toast.error('Please select at least one letter checkbox (Relieving or Experience)');
      return;
    }

    setGeneratingPreviews(true);
    try {
      const payload = {
        userId: topLetterForm.userId,
        offboardingId: topLetterForm.offboardingId || '',
        letterTypes: chosenTypes,
        customBodies: templateBodies,
        lastWorkingDay: topLetterForm.lastWorkingDay || '',
        exitType: topLetterForm.exitType || 'Resignation',
        saveToDossier: false
      };

      const res = await api.post('/offboarding/generate-batch-letters', payload);
      const letters = res.data?.letters || [];
      const previewsMap = {};
      letters.forEach(item => {
        previewsMap[item.type] = item.html;
      });
      setGeneratedLetterPreviews(previewsMap);
      if (letters.length > 0) {
        setActivePreviewType(letters[0].type);
      }
      toast.success(`${letters.length} letter preview(s) generated successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate letter previews');
    } finally {
      setGeneratingPreviews(false);
    }
  };

  const handleSaveApprovedBatchToDossier = async () => {
    if (!topLetterForm.userId) {
      toast.error('Please select an employee first');
      return;
    }
    const chosenTypes = [
      selectedRelievingCheck ? 'Relieving Letter' : null,
      selectedExperienceCheck ? 'Experience Letter' : null
    ].filter(Boolean);

    if (chosenTypes.length === 0) {
      toast.error('Please select at least one letter checkbox (Relieving or Experience)');
      return;
    }

    setSavingBatchToDossier(true);
    try {
      const payload = {
        userId: topLetterForm.userId,
        offboardingId: topLetterForm.offboardingId || '',
        letterTypes: chosenTypes,
        customBodies: templateBodies,
        lastWorkingDay: topLetterForm.lastWorkingDay || '',
        exitType: topLetterForm.exitType || 'Resignation',
        saveToDossier: true
      };

      const res = await api.post('/offboarding/generate-batch-letters', payload);
      toast.success(res.data?.message || 'Letter(s) generated and saved to employee Dossier!');

      await fetchDossierLetters(topLetterForm.userId);
      await fetchRecords();
      if (selectedRecord?._id) {
        await fetchRecordDetail(selectedRecord._id);
      }

      setWizardStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save letter(s) to dossier');
    } finally {
      setSavingBatchToDossier(false);
    }
  };

  const handleTopSendDossierLetters = async () => {
    if (!topLetterForm.userId) {
      toast.error('Please select an employee first');
      return;
    }
    if (selectedDossierDocIds.length === 0) {
      toast.error('Please select at least one letter from the dossier to send');
      return;
    }
    if (!topSendRecipientEmail.trim()) {
      toast.error('Recipient email is required');
      return;
    }

    setTopSendingLetters(true);
    try {
      const targetId = topLetterForm.offboardingId || topLetterForm.userId;
      await api.post(`/offboarding/${targetId}/send-dossier-letters`, {
        dossierDocIds: selectedDossierDocIds,
        recipientEmail: topSendRecipientEmail.trim(),
        personalNote: topSendPersonalNote.trim(),
        emailAccountId: topSendEmailAccountId || 'platform'
      });

      toast.success('Letters successfully emailed to employee!');
      await fetchRecords();
      if (selectedRecord?._id) {
        await fetchRecordDetail(selectedRecord._id);
      }
      await fetchDossierLetters(topLetterForm.userId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send dossier letters');
    } finally {
      setTopSendingLetters(false);
    }
  };

  const renderStatsCard = (label, value, accent) => (
    <div style={{
      ...cardStyle,
      padding: '12px 14px',
      borderColor: accent.border,
      background: accent.background
    }}>
      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</div>
      <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{statsLoading ? '...' : value}</div>
    </div>
  );

  const rightPanel = selectedRecordId ? (
    <div style={{
      ...cardStyle,
      padding: '16px 18px',
      minHeight: '560px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 9px', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8', fontSize: '10.5px', fontWeight: 700 }}>
            <Mail size={12} />
            Send Exit Email
          </div>
          <h2 style={{ margin: '8px 0 2px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            {selectedRecord ? getEmployeeName(selectedRecord.userId) : 'Loading...'}
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>
            {selectedRecord?.userId?.email || 'No work email'}{selectedRecord?.userId?.employeeCode ? ` • ${selectedRecord.userId.employeeCode}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedRecordId('');
            setSelectedRecord(null);
          }}
          style={{ ...ghostButtonStyle, padding: '6px 8px' }}
        >
          <X size={14} />
        </button>
      </div>

      {detailLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : selectedRecord ? (
        <>
          <div style={{ ...cardStyle, padding: '12px 14px', borderRadius: '12px', boxShadow: 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
              <div>
                <div style={sectionTitleStyle}>Status</div>
                <span style={getStatusBadgeStyle(selectedRecord.status)}>{selectedRecord.status}</span>
              </div>
              <div>
                <div style={sectionTitleStyle}>Exit Type</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{selectedRecord.exitType}</div>
              </div>
              <div>
                <div style={sectionTitleStyle}>Last Working Day</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{formatDateLabel(selectedRecord.lastWorkingDay)}</div>
              </div>
            </div>
          </div>

          {/* Detail Tabs Selector */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            gap: '4px',
            background: '#f8fafc',
            padding: '4px',
            borderRadius: '10px'
          }}>
            {[
              { id: 'clearance', label: 'Clearance & Exit', icon: ShieldCheck },
              { id: 'fnf', label: 'F&F Settlement', icon: DollarSign },
              { id: 'documents', label: 'Letters & Dossier', icon: FileCheck },
              { id: 'email', label: 'Email & Ledger', icon: Mail }
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeDetailTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveDetailTab(tab.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#2563eb' : '#64748b',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <TabIcon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeDetailTab === 'clearance' && (
            <>
              {/* Departmental Clearances Card */}
              <div style={{ ...cardStyle, padding: '14px', borderRadius: '12px', boxShadow: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <div style={sectionTitleStyle}>Departmental Clearances</div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>
                      Mark clearances as each department completes their sign-off.
                    </p>
                  </div>
                  {selectedRecord.clearance?.completedAt ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 700 }}>
                      <CheckCircle2 size={12} />
                      Completed
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 700 }}>
                      <Clock size={12} />
                      Pending
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                  {[
                    { key: 'it', label: 'IT Department', desc: 'Hardware, licenses & systems access' },
                    { key: 'finance', label: 'Finance Department', desc: 'Expense reports, advances & tax clearance' },
                    { key: 'hr', label: 'HR Department', desc: 'Exit formalities & ID card surrender' },
                    { key: 'admin', label: 'Admin Department', desc: 'Access card, keys & parking pass' },
                    { key: 'manager', label: 'Reporting Manager', desc: 'Project handover & knowledge transfer' }
                  ].map((item) => (
                    <label
                      key={item.key}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: clearanceDraft[item.key] ? '#f0fdf4' : '#ffffff',
                        cursor: canUpdate && selectedRecord.status !== 'Completed' ? 'pointer' : 'default'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(clearanceDraft[item.key])}
                        onChange={(e) => setClearanceDraft(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        disabled={!canUpdate || selectedRecord.status === 'Completed'}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f172a' }}>{item.label}</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{item.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {selectedRecord.clearance?.completedAt ? (
                  <div style={{ marginTop: '8px', fontSize: '10.5px', color: '#15803d' }}>
                    All clearances completed on: {formatDateLabel(selectedRecord.clearance.completedAt)}
                  </div>
                ) : null}

                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleSaveClearance}
                    disabled={!canUpdate || selectedRecord.status === 'Completed' || clearanceSaving}
                    style={{
                      ...primaryButtonStyle,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: (!canUpdate || selectedRecord.status === 'Completed' || clearanceSaving) ? 0.7 : 1
                    }}
                  >
                    {clearanceSaving ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                    {clearanceSaving ? 'Saving...' : 'Save Clearances'}
                  </button>
                </div>
              </div>

              {/* Exit Interview Card */}
              <div style={{ ...cardStyle, padding: '14px', borderRadius: '12px', boxShadow: 'none' }}>
                <div style={sectionTitleStyle}>Exit Interview</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '8px', cursor: canUpdate && selectedRecord.status !== 'Completed' ? 'pointer' : 'default' }}>
                  <input
                    type="checkbox"
                    checked={exitInterviewDone}
                    onChange={(e) => setExitInterviewDone(e.target.checked)}
                    disabled={!canUpdate || selectedRecord.status === 'Completed'}
                  />
                  Exit Interview Completed
                </label>
                <label style={fieldLabelStyle}>Exit Interview Notes</label>
                <textarea
                  rows={3}
                  value={exitInterviewNotes}
                  onChange={(e) => setExitInterviewNotes(e.target.value)}
                  placeholder="Feedback, reason for leaving, handover comments..."
                  style={{ ...textareaStyle, minHeight: '65px' }}
                  disabled={!canUpdate || selectedRecord.status === 'Completed'}
                />
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleSaveInterview}
                    disabled={!canUpdate || selectedRecord.status === 'Completed' || interviewSaving}
                    style={{
                      ...ghostButtonStyle,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: (!canUpdate || selectedRecord.status === 'Completed' || interviewSaving) ? 0.7 : 1
                    }}
                  >
                    {interviewSaving ? <Loader2 size={13} className="animate-spin" /> : <MessageSquare size={13} />}
                    {interviewSaving ? 'Saving...' : 'Save Interview'}
                  </button>
                </div>
              </div>

              {/* Workflow Status Card */}
              <div style={{ ...cardStyle, padding: '14px', borderRadius: '12px', boxShadow: 'none' }}>
                <div style={sectionTitleStyle}>Workflow Status & Completion</div>
                <label style={fieldLabelStyle}>Change Stage</label>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) auto', gap: '10px', alignItems: 'end' }}>
                  <select
                    value={statusDraft}
                    onChange={(event) => setStatusDraft(event.target.value)}
                    style={inputStyle}
                    disabled={!canUpdate || selectedRecord.status === 'Completed'}
                  >
                    {EDITABLE_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleSaveStatus}
                    disabled={!canUpdate || selectedRecord.status === 'Completed' || statusSaving || statusDraft === selectedRecord.status}
                    style={{
                      ...primaryButtonStyle,
                      opacity: (!canUpdate || selectedRecord.status === 'Completed' || statusSaving || statusDraft === selectedRecord.status) ? 0.7 : 1,
                      cursor: (!canUpdate || selectedRecord.status === 'Completed' || statusSaving || statusDraft === selectedRecord.status) ? 'not-allowed' : 'pointer',
                      minWidth: '120px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    {statusSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                    {statusSaving ? 'Saving...' : 'Save Status'}
                  </button>
                </div>
                <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '11px' }}>
                  Choosing <strong>Completed</strong> will finalize offboarding, deactivate the user account, update dossier employment status, and send a completion email.
                </p>
              </div>
            </>
          )}

          {activeDetailTab === 'fnf' && (
            <div style={{ ...cardStyle, padding: '14px', borderRadius: '12px', boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={sectionTitleStyle}>Full & Final Settlement (FnF)</div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>
                  Compute dues, leave encashment, and deductions for settlement.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={fieldLabelStyle}>Basic Salary Due (INR)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={fnfDraft.basicSalaryDue}
                    onChange={(e) => setFnfDraft(prev => ({ ...prev, basicSalaryDue: e.target.value }))}
                    style={inputStyle}
                    disabled={!canUpdate || selectedRecord.status === 'Completed'}
                  />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Leave Encashment (INR)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={fnfDraft.leaveEncashment}
                    onChange={(e) => setFnfDraft(prev => ({ ...prev, leaveEncashment: e.target.value }))}
                    style={inputStyle}
                    disabled={!canUpdate || selectedRecord.status === 'Completed'}
                  />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Bonus / Incentive Due (INR)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={fnfDraft.bonusDue}
                    onChange={(e) => setFnfDraft(prev => ({ ...prev, bonusDue: e.target.value }))}
                    style={inputStyle}
                    disabled={!canUpdate || selectedRecord.status === 'Completed'}
                  />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Deductions (INR)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={fnfDraft.deductions}
                    onChange={(e) => setFnfDraft(prev => ({ ...prev, deductions: e.target.value }))}
                    style={inputStyle}
                    disabled={!canUpdate || selectedRecord.status === 'Completed'}
                  />
                </div>
              </div>

              {/* Net Payable Ribbon */}
              <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Net Payable Amount</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#065f46', marginTop: '2px' }}>
                      INR {calculatedNetPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <DollarSign size={24} color="#059669" />
                </div>
                <div style={{ fontSize: '10px', color: '#047857', marginTop: '4px' }}>
                  = Basic Salary ({fnfDraft.basicSalaryDue || 0}) + Leave ({fnfDraft.leaveEncashment || 0}) + Bonus ({fnfDraft.bonusDue || 0}) - Deductions ({fnfDraft.deductions || 0})
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: canUpdate && selectedRecord.status !== 'Completed' ? 'pointer' : 'default' }}>
                <input
                  type="checkbox"
                  checked={fnfDraft.isSettled}
                  onChange={(e) => setFnfDraft(prev => ({ ...prev, isSettled: e.target.checked }))}
                  disabled={!canUpdate || selectedRecord.status === 'Completed'}
                />
                Mark Settlement as Disbursed / Settled
              </label>

              {selectedRecord.fnfDetails?.settledAt ? (
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Settled on: {formatDateLabel(selectedRecord.fnfDetails.settledAt)}
                </div>
              ) : null}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleSaveFnF}
                  disabled={!canUpdate || selectedRecord.status === 'Completed' || fnfSaving}
                  style={{
                    ...primaryButtonStyle,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: (!canUpdate || selectedRecord.status === 'Completed' || fnfSaving) ? 0.7 : 1
                  }}
                >
                  {fnfSaving ? <Loader2 size={13} className="animate-spin" /> : <DollarSign size={13} />}
                  {fnfSaving ? 'Saving...' : 'Save Settlement Details'}
                </button>
              </div>
            </div>
          )}

          {activeDetailTab === 'documents' && (
            <div style={{ ...cardStyle, padding: '14px', borderRadius: '12px', boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Sub-tab navigation */}
              <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <button
                  type="button"
                  onClick={() => setLettersSubTab('dossier')}
                  style={{
                    ...ghostButtonStyle,
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    background: lettersSubTab === 'dossier' ? '#eff6ff' : '#ffffff',
                    color: lettersSubTab === 'dossier' ? '#2563eb' : '#64748b',
                    borderColor: lettersSubTab === 'dossier' ? '#bfdbfe' : '#e2e8f0',
                    fontWeight: 700
                  }}
                >
                  <FolderOpen size={13} />
                  <span>Select from Dossier</span>
                  {dossierLetters.length > 0 && (
                    <span style={{ background: '#2563eb', color: '#fff', borderRadius: '999px', padding: '1px 6px', fontSize: '10px' }}>
                      {dossierLetters.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setLettersSubTab('generate')}
                  style={{
                    ...ghostButtonStyle,
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    background: lettersSubTab === 'generate' ? '#eff6ff' : '#ffffff',
                    color: lettersSubTab === 'generate' ? '#2563eb' : '#64748b',
                    borderColor: lettersSubTab === 'generate' ? '#bfdbfe' : '#e2e8f0',
                    fontWeight: 700
                  }}
                >
                  <Sparkles size={13} />
                  <span>Generate New Letter</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLettersSubTab('quick')}
                  style={{
                    ...ghostButtonStyle,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    background: lettersSubTab === 'quick' ? '#eff6ff' : '#ffffff',
                    color: lettersSubTab === 'quick' ? '#2563eb' : '#64748b',
                    borderColor: lettersSubTab === 'quick' ? '#bfdbfe' : '#e2e8f0',
                    fontWeight: 700
                  }}
                >
                  <FileCheck size={13} />
                  <span>Quick Batch</span>
                </button>
              </div>

              {/* Subtab 1: Select from Dossier & Send */}
              {lettersSubTab === 'dossier' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={sectionTitleStyle}>Employee Dossier Documents</div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>
                      Select Relieving and Experience letters directly from {getEmployeeName(selectedRecord?.userId)}&apos;s Dossier to send via offboarding email.
                    </p>
                  </div>

                  {loadingDossierLetters ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                      <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto 6px' }} />
                      Loading letters from employee dossier...
                    </div>
                  ) : dossierLetters.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc' }}>
                      <FolderOpen size={28} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>No Letters in Dossier Yet</div>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 12px' }}>
                        No Relieving or Experience letters have been saved in this employee&apos;s dossier yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => setLettersSubTab('generate')}
                        style={{ ...primaryButtonStyle, fontSize: '11px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Sparkles size={12} />
                        Generate Letter Now
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                          {selectedDossierDocIds.length} of {dossierLetters.length} letter(s) selected
                        </span>
                        <button
                          type="button"
                          onClick={handleSelectAllDossierDocs}
                          style={{ ...ghostButtonStyle, padding: '3px 8px', fontSize: '10.5px' }}
                        >
                          {selectedDossierDocIds.length === dossierLetters.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                        {dossierLetters.map((doc) => {
                          const isChecked = selectedDossierDocIds.includes(doc._id);
                          return (
                            <div
                              key={doc._id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '9px 12px',
                                borderRadius: '10px',
                                border: isChecked ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                                background: isChecked ? '#eff6ff' : '#ffffff',
                                gap: '10px'
                              }}
                            >
                              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleDossierDoc(doc._id)}
                                  disabled={!canUpdate}
                                />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {doc.title || doc.name || 'Official Letter'}
                                    </span>
                                    <span style={{ fontSize: '9.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#dbeafe', color: '#1e40af' }}>
                                      {doc.category}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                                    Saved: {formatDateLabel(doc.uploadedAt)} {doc.status ? `• ${doc.status}` : ''}
                                  </div>
                                </div>
                              </label>
                              {doc.url && (
                                <button
                                  type="button"
                                  onClick={() => window.open(doc.url, '_blank')}
                                  title="View Letter in Dossier"
                                  style={{ ...ghostButtonStyle, padding: '5px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                                >
                                  <Eye size={12} />
                                  View
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div>
                        <label style={fieldLabelStyle}>Recipient Email</label>
                        <input
                          type="email"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder="employee@example.com"
                          style={inputStyle}
                          disabled={!canUpdate}
                        />
                      </div>

                      <div>
                        <label style={fieldLabelStyle}>Sender Account</label>
                        <select
                          value={selectedEmailAccountId}
                          onChange={(e) => setSelectedEmailAccountId(e.target.value)}
                          style={inputStyle}
                          disabled={!canUpdate || sendersLoading}
                        >
                          {emailSenderOptions.map((option) => (
                            <option key={option._id} value={option._id}>
                              {`${option.name} (${option.provider || 'platform'}) - ${option.fromAddress || 'no-reply'}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={fieldLabelStyle}>Personal Note from HR (Optional)</label>
                        <textarea
                          rows={2}
                          value={dossierPersonalNote}
                          onChange={(e) => setDossierPersonalNote(e.target.value)}
                          placeholder="E.g., Please find attached your verified exit letters from your dossier. Wishing you all the best!"
                          style={{ ...textareaStyle, minHeight: '55px' }}
                          disabled={!canUpdate}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleSendDossierLetters}
                        disabled={!canUpdate || sendingDossierLetters || selectedDossierDocIds.length === 0}
                        style={{
                          ...primaryButtonStyle,
                          width: '100%',
                          padding: '10px 14px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          opacity: (!canUpdate || sendingDossierLetters || selectedDossierDocIds.length === 0) ? 0.7 : 1,
                          cursor: (!canUpdate || sendingDossierLetters || selectedDossierDocIds.length === 0) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {sendingDossierLetters ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        {sendingDossierLetters ? 'Sending Dossier Letters...' : `Send Selected Dossier Letters (${selectedDossierDocIds.length})`}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Subtab 2: Generate New Letter & Save to Dossier */}
              {lettersSubTab === 'generate' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={sectionTitleStyle}>Letter Generator & Dossier Archival</div>
                      {selectedRecord?.userId?._id && (
                        <button
                          type="button"
                          onClick={() => navigate(`/offboarding/letter-generator?userId=${selectedRecord.userId._id}`)}
                          style={{ ...ghostButtonStyle, padding: '3px 8px', fontSize: '10.5px', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <ExternalLink size={11} />
                          Open Full Page
                        </button>
                      )}
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>
                      Compose letters using template tags. Once generated, the letter is saved in {getEmployeeName(selectedRecord?.userId)}&apos;s Dossier.
                    </p>
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>Letter Type</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['Relieving Letter', 'Experience Letter'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleSelectLetterType(type)}
                          style={{
                            ...ghostButtonStyle,
                            flex: 1,
                            padding: '7px 12px',
                            fontWeight: 700,
                            background: letterTypeToGenerate === type ? '#0f172a' : '#ffffff',
                            color: letterTypeToGenerate === type ? '#ffffff' : '#334155',
                            borderColor: letterTypeToGenerate === type ? '#0f172a' : '#cbd5e1'
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Upload file with tags option */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px dashed #cbd5e1', borderRadius: '8px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <Upload size={16} color="#2563eb" style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {drawerUploadedFile ? `File: ${drawerUploadedFile.name}` : 'Upload Template File with Tags'}
                        </div>
                        <div style={{ fontSize: '9.5px', color: '#64748b' }}>
                          {drawerUploadedFile ? `${(drawerUploadedFile.size / 1024).toFixed(1)} KB` : 'Supports .docx, .html, .txt with tags'}
                        </div>
                      </div>
                    </div>
                    <label style={{ ...ghostButtonStyle, padding: '4px 8px', fontSize: '10.5px', cursor: 'pointer', background: '#ffffff', flexShrink: 0 }}>
                      {drawerUploadedFile ? 'Change' : 'Browse'}
                      <input
                        type="file"
                        accept=".docx,.doc,.html,.htm,.txt"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setDrawerUploadedFile(file);
                            if (file.name.endsWith('.txt') || file.name.endsWith('.html')) {
                              const reader = new FileReader();
                              reader.onload = (evt) => setLetterBodyDraft(evt.target.result || '');
                              reader.readAsText(file);
                            }
                            toast.success(`Attached "${file.name}" with tags!`);
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>

                  {/* Available Template Tags Palette */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Available Template Tags
                      </div>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>Click tag to insert</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {AVAILABLE_LETTER_TAGS.map((tagObj) => (
                        <button
                          key={tagObj.tag}
                          type="button"
                          onClick={() => handleInsertTag(tagObj.tag)}
                          title={tagObj.desc}
                          style={{
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            borderRadius: '6px',
                            padding: '2px 7px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            color: '#2563eb',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{tagObj.tag}</span>
                          <span style={{ fontSize: '9px', color: '#64748b', fontFamily: 'inherit' }}>({tagObj.label})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={fieldLabelStyle}>Letter Body Template (HTML / Text)</label>
                      <button
                        type="button"
                        onClick={() => {
                          if (letterTypeToGenerate === 'Relieving Letter') {
                            setLetterBodyDraft(DEFAULT_RELIEVING_BODY_FE);
                          } else {
                            setLetterBodyDraft(DEFAULT_EXPERIENCE_BODY_FE);
                          }
                        }}
                        style={{ ...ghostButtonStyle, padding: '2px 7px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        <RotateCcw size={10} />
                        Reset Template
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      value={letterBodyDraft}
                      onChange={(e) => setLetterBodyDraft(e.target.value)}
                      style={{ ...textareaStyle, fontFamily: 'monospace', fontSize: '11px', minHeight: '110px' }}
                      disabled={!canUpdate}
                    />
                  </div>

                  <div>
                    <div style={fieldLabelStyle}>Rendered Letterhead Preview</div>
                    <div
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        background: '#ffffff',
                        padding: '14px',
                        maxHeight: '160px',
                        overflowY: 'auto',
                        fontSize: '11.5px',
                        lineHeight: '1.5',
                        color: '#1e293b'
                      }}
                    >
                      <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: '6px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e40af' }}>{user?.company?.name || 'TalentCIO'}</div>
                          <div style={{ fontSize: '9.5px', color: '#64748b' }}>OFFICIAL PERSONNEL DOCUMENT</div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#64748b' }}>
                          <div>Date: {formatDateLabel(new Date().toISOString())}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '12px', margin: '6px 0 10px', textDecoration: 'underline' }}>
                        {letterTypeToGenerate.toUpperCase()}
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: letterPreviewHtml }} />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateAndSaveLetter}
                    disabled={!canUpdate || savingLetterToDossier}
                    style={{
                      ...primaryButtonStyle,
                      width: '100%',
                      padding: '10px 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: (!canUpdate || savingLetterToDossier) ? 0.7 : 1,
                      cursor: (!canUpdate || savingLetterToDossier) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {savingLetterToDossier ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    {savingLetterToDossier ? 'Generating & Archiving to Dossier...' : `Generate & Save to Dossier`}
                  </button>
                </div>
              )}

              {/* Subtab 3: Quick Batch Issue */}
              {lettersSubTab === 'quick' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={sectionTitleStyle}>Batch Generate & Dispatch</div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>
                      Automatically generate multiple documents simultaneously and email them to the employee.
                    </p>
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>Select Documents to Issue</label>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                      {[
                        { id: 'Relieving Letter', desc: 'Formal relieving from company services' },
                        { id: 'Experience Letter', desc: 'Service certificate & tenure' },
                        { id: 'Full & Final Settlement', desc: 'Detailed breakdown statement of dues' },
                        { id: 'NOC', desc: 'No Objection Certificate' }
                      ].map((doc) => (
                        <label
                          key={doc.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            padding: '9px 10px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            background: docTypesSelected.includes(doc.id) ? '#eff6ff' : '#ffffff',
                            cursor: canUpdate ? 'pointer' : 'default'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={docTypesSelected.includes(doc.id)}
                            onChange={() => handleToggleDocType(doc.id)}
                            disabled={!canUpdate}
                            style={{ marginTop: '2px' }}
                          />
                          <div>
                            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f172a' }}>{doc.id}</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>{doc.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>Recipient Email</label>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="employee@example.com"
                      style={inputStyle}
                      disabled={!canUpdate}
                    />
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>Sender Account</label>
                    <select
                      value={selectedEmailAccountId}
                      onChange={(e) => setSelectedEmailAccountId(e.target.value)}
                      style={inputStyle}
                      disabled={!canUpdate || sendersLoading}
                    >
                      {emailSenderOptions.map((option) => (
                        <option key={option._id} value={option._id}>
                          {`${option.name} (${option.provider || 'platform'}) - ${option.fromAddress || 'no-reply'}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>Personal Note from HR (Optional)</label>
                    <textarea
                      rows={2}
                      value={docPersonalNote}
                      onChange={(e) => setDocPersonalNote(e.target.value)}
                      placeholder="E.g., Thank you for your contributions. Wishing you the best in your next chapter!"
                      style={{ ...textareaStyle, minHeight: '60px' }}
                      disabled={!canUpdate}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateExitDocuments}
                    disabled={!canUpdate || docsGenerating || docTypesSelected.length === 0}
                    style={{
                      ...primaryButtonStyle,
                      width: '100%',
                      padding: '10px 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: (!canUpdate || docsGenerating || docTypesSelected.length === 0) ? 0.7 : 1,
                      cursor: (!canUpdate || docsGenerating || docTypesSelected.length === 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {docsGenerating ? <Loader2 size={15} className="animate-spin" /> : <FileCheck size={15} />}
                    {docsGenerating ? 'Generating & Sending Documents...' : 'Generate & Send Batch Documents'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeDetailTab === 'email' && (
            <>
              <div style={{ ...cardStyle, padding: '12px 14px', borderRadius: '12px', boxShadow: 'none' }}>
                <div style={sectionTitleStyle}>Recipient</div>
                <label style={fieldLabelStyle}>Send To</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                  placeholder="employee@example.com"
                  style={inputStyle}
                  disabled={!canUpdate}
                />
                <p style={{ margin: '6px 0 10px', color: '#64748b', fontSize: '11px' }}>
                  This is where the email will be delivered.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={fieldLabelStyle}>CC (Optional)</label>
                    <input
                      type="text"
                      value={emailCc}
                      onChange={(event) => setEmailCc(event.target.value)}
                      placeholder="hr@company.com"
                      style={inputStyle}
                      disabled={!canUpdate}
                    />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>BCC (Optional)</label>
                    <input
                      type="text"
                      value={emailBcc}
                      onChange={(event) => setEmailBcc(event.target.value)}
                      placeholder="audit@company.com"
                      style={inputStyle}
                      disabled={!canUpdate}
                    />
                  </div>
                </div>
              </div>

              <div style={{ ...cardStyle, padding: '12px 14px', borderRadius: '12px', boxShadow: 'none' }}>
                <div style={sectionTitleStyle}>Template</div>
                <label style={fieldLabelStyle}>Email Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(event) => setSelectedTemplateId(event.target.value)}
                  style={inputStyle}
                  disabled={!canUpdate || templatesLoading}
                >
                  <option value={NO_TEMPLATE_OPTION}>No template (custom only)</option>
                  {emailTemplates.map((template) => (
                    <option key={template._id} value={template._id}>{template.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowBodyEditor((current) => !current)}
                  style={{ ...ghostButtonStyle, marginTop: '10px' }}
                >
                  {showBodyEditor ? 'Hide Subject & Body' : 'Customize Subject & Body'}
                </button>

                {showBodyEditor ? (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={fieldLabelStyle}>Subject</label>
                      <input
                        type="text"
                        value={customSubject}
                        onChange={(event) => setCustomSubject(event.target.value)}
                        style={inputStyle}
                        disabled={!canUpdate}
                      />
                    </div>
                    <div>
                      <label style={fieldLabelStyle}>Body</label>
                      <textarea
                        rows={5}
                        value={customBody}
                        onChange={(event) => setCustomBody(event.target.value)}
                        style={{ ...textareaStyle, minHeight: '120px' }}
                        disabled={!canUpdate}
                      />
                    </div>
                    <div style={{ borderRadius: '12px', border: '1px solid #dbeafe', background: '#f8fbff', overflow: 'hidden' }}>
                      <div style={{ padding: '8px 12px', borderBottom: '1px solid #dbeafe', background: '#eff6ff' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Preview</div>
                        <div style={{ marginTop: '4px', fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{previewSubject}</div>
                      </div>
                      <div
                        style={{ padding: '12px', color: '#334155', fontSize: '12px', pointerEvents: 'none' }}
                        dangerouslySetInnerHTML={{ __html: previewBody }}
                      />
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>
                      Supported placeholders: {placeholderHelpText}
                    </p>
                  </div>
                ) : null}
              </div>

              <div style={{ ...cardStyle, padding: '12px 14px', borderRadius: '12px', boxShadow: 'none' }}>
                <div style={sectionTitleStyle}>Sender Account</div>
                <label style={fieldLabelStyle}>Send From</label>
                <select
                  value={selectedEmailAccountId}
                  onChange={(event) => setSelectedEmailAccountId(event.target.value)}
                  style={inputStyle}
                  disabled={!canUpdate || sendersLoading}
                >
                  {emailSenderOptions.map((option) => (
                    <option key={option._id} value={option._id}>
                      {`${option.name} (${option.provider || 'platform'}) - ${option.fromAddress || 'no-reply'}`}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ ...cardStyle, padding: '12px 14px', borderRadius: '12px', boxShadow: 'none' }}>
                <div style={sectionTitleStyle}>Attach Files (Optional)</div>
                <label style={{ ...primaryButtonStyle, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: canUpdate ? 'pointer' : 'not-allowed', opacity: canUpdate ? 1 : 0.6 }}>
                  <Paperclip size={14} />
                  Choose Files
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                    onChange={handleAttachmentChange}
                    style={{ display: 'none' }}
                    disabled={!canUpdate}
                  />
                </label>
                <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '11px' }}>
                  Max {MAX_ATTACHMENTS} files. Each file must be 10MB or smaller.
                </p>

                {attachmentFiles.length > 0 ? (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {attachmentFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 10px', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <FileText size={14} color="#2563eb" />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                            <div style={{ fontSize: '10.5px', color: '#64748b' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                          </div>
                        </div>
                        <button type="button" onClick={() => handleRemoveAttachment(index)} style={{ ...ghostButtonStyle, padding: '5px 7px' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleSendEmail}
                disabled={!canUpdate || sending}
                style={{
                  ...primaryButtonStyle,
                  width: '100%',
                  padding: '10px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: (!canUpdate || sending) ? 0.7 : 1,
                  cursor: (!canUpdate || sending) ? 'not-allowed' : 'pointer'
                }}
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {sending ? 'Sending...' : 'Send Email'}
              </button>

              <div style={{ ...cardStyle, padding: '12px 14px', borderRadius: '12px', boxShadow: 'none' }}>
                <div style={sectionTitleStyle}>Previously Sent</div>
                {previouslySentItems.length === 0 ? (
                  <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>No emails sent yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {previouslySentItems.map((item, index) => (
                      <div key={`${item.sentAt || item.type}-${index}`} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '9px 11px', background: '#ffffff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ ...getStatusBadgeStyle(item.type || 'Other'), background: '#f1f5f9', color: '#334155' }}>{item.type || 'Other'}</span>
                          <span style={{ fontSize: '12px', color: '#334155' }}>Sent to {item.sentTo || 'Unknown recipient'}</span>
                        </div>
                        <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748b' }}>{formatDateLabel(item.sentAt)}</div>
                        {item.notes ? <div style={{ marginTop: '3px', fontSize: '10.5px', color: '#94a3b8' }}>{item.notes}</div> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  ) : null;

  if (!canRead) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ ...cardStyle, padding: '16px', borderColor: '#fde68a', background: '#fffbeb', color: '#92400e' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <AlertCircle size={18} />
            <div>
              <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Offboarding access required</h1>
              <p style={{ margin: '6px 0 0', fontSize: '12px' }}>
                You need `offboarding.read` access to open this workspace section.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageShellStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 9px', borderRadius: '999px', background: '#fef2f2', color: '#dc2626', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <UserMinus size={12} />
            Exit Operations
          </div>
          <h1 style={{ margin: '8px 0 3px', fontSize: '20px', fontWeight: 700, lineHeight: 1.2, color: '#0f172a' }}>Offboarding</h1>
          <p style={{ margin: 0, maxWidth: '760px', color: '#64748b', fontSize: '12px' }}>
            Track exits, open an employee file, and send the final offboarding email with the right template, sender, and attachments.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={handleRefresh} style={ghostButtonStyle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={13} />
              Refresh
            </span>
          </button>
          {canCreate ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/offboarding/letter-generator')}
                style={{
                  ...ghostButtonStyle,
                  background: '#eff6ff',
                  borderColor: '#bfdbfe',
                  color: '#1d4ed8'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={13} />
                  Letter Generator
                </span>
              </button>
              <button type="button" onClick={handleOpenCreate} style={primaryButtonStyle}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={13} />
                  Initiate Offboarding
                </span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, minmax(0, 1fr))', gap: '10px' }}>
        {renderStatsCard('Total', stats.total, { background: '#ffffff', border: '#e2e8f0' })}
        {renderStatsCard('Initiated', stats.initiated, { background: '#fefce8', border: '#fde68a' })}
        {renderStatsCard('In Progress', stats.inProgress, { background: '#eff6ff', border: '#bfdbfe' })}
        {renderStatsCard('Clearance Pending', stats.clearancePending, { background: '#fff7ed', border: '#fdba74' })}
        {renderStatsCard('Completed', stats.completed, { background: '#ecfdf5', border: '#86efac' })}
        {renderStatsCard('This Month', stats.thisMonth, { background: '#ffffff', border: '#e2e8f0' })}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : (selectedRecordId ? 'minmax(0, 1.05fr) minmax(360px, 0.95fr)' : '1fr'),
        gap: '16px',
        alignItems: 'start'
      }}>
        <div style={{ ...cardStyle, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Offboarding List</h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '11px' }}>
                Open any record to send the exit email panel on the right.
              </p>
            </div>
            <div style={{ color: '#64748b', fontSize: '11px', alignSelf: 'center' }}>
              Page {currentPage} of {totalPages} • Total {totalRecords}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 0.9fr 0.9fr', gap: '10px', marginBottom: '12px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by employee, email, or code"
                style={{ ...inputStyle, paddingLeft: '32px' }}
              />
            </div>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1); }} style={inputStyle}>
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select value={exitTypeFilter} onChange={(event) => { setExitTypeFilter(event.target.value); setCurrentPage(1); }} style={inputStyle}>
              <option value="all">All exit types</option>
              {EXIT_TYPE_OPTIONS.map((exitType) => <option key={exitType} value={exitType}>{exitType}</option>)}
            </select>
          </div>

          {loading ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
              <Loader2 size={18} className="animate-spin" style={{ margin: '0 auto 8px' }} />
              Loading offboarding records...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc', fontSize: '12px' }}>
              No records found for this view.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    {['Employee', 'Exit Type', 'Status', 'Last Working Day', 'Action'].map((label) => (
                      <th key={label} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid #e2e8f0' }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record._id} style={{ borderBottom: '1px solid #eef2f7', background: selectedRecordId === record._id ? '#f8fbff' : '#ffffff' }}>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{getEmployeeName(record.userId)}</div>
                        <div style={{ marginTop: '2px', fontSize: '11px', color: '#64748b' }}>{record.userId?.email || 'No email'}</div>
                        <div style={{ marginTop: '2px', fontSize: '10px', color: '#94a3b8' }}>{record.userId?.employeeCode || 'No code'}</div>
                      </td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top', fontSize: '12px', color: '#334155' }}>{record.exitType}</td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                        <span style={getStatusBadgeStyle(record.status)}>{record.status}</span>
                      </td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top', fontSize: '12px', color: '#334155' }}>{formatDateLabel(record.lastWorkingDay)}</td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                        <button type="button" onClick={() => setSelectedRecordId(record._id)} style={{ ...ghostButtonStyle, padding: '5px 10px', fontSize: '11px' }}>Open</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Showing {filteredRecords.length} record{filteredRecords.length === 1 ? '' : 's'} on this page.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((value) => Math.max(value - 1, 1))} style={{ ...ghostButtonStyle, padding: '5px 10px', fontSize: '11px', opacity: currentPage <= 1 ? 0.5 : 1, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}>
                Previous
              </button>
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((value) => Math.min(value + 1, totalPages))} style={{ ...ghostButtonStyle, padding: '5px 10px', fontSize: '11px', opacity: currentPage >= totalPages ? 0.5 : 1, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}>
                Next
              </button>
            </div>
          </div>
        </div>

        {!isMobile ? rightPanel : null}
      </div>

      {isMobile && selectedRecordId ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15, 23, 42, 0.5)', padding: '10px', overflowY: 'auto' }}>
          {rightPanel}
        </div>
      ) : null}

      {showCreateModal ? (
        <ModalShell
          title="Initiate Offboarding"
          subtitle="Start an exit record before sending final communication."
          onClose={() => setShowCreateModal(false)}
        >
          <form onSubmit={handleCreateOffboarding} style={{ display: 'grid', gap: '16px', gridTemplateColumns: isMobile ? '1fr' : '1.1fr 0.9fr' }}>
            <div style={{ ...cardStyle, padding: '14px', boxShadow: 'none' }}>
              <div style={sectionTitleStyle}>Choose Employee</div>
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={employeeSearchTerm}
                  onChange={(event) => setEmployeeSearchTerm(event.target.value)}
                  placeholder="Search by name, email, code, or department"
                  style={{ ...inputStyle, paddingLeft: '32px' }}
                />
              </div>
              <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                {employeesLoading ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>Loading employees...</div>
                ) : filteredEmployees.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>No employees match this search.</div>
                ) : (
                  filteredEmployees.map((employee) => {
                    const isSelected = createForm.userId === employee._id;
                    return (
                      <button
                        key={employee._id}
                        type="button"
                        onClick={() => setCreateForm((current) => ({ ...current, userId: employee._id }))}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          border: 'none',
                          borderBottom: '1px solid #e2e8f0',
                          padding: '10px 12px',
                          background: isSelected ? '#0f172a' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#0f172a',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>{getEmployeeName(employee)}</div>
                        <div style={{ marginTop: '2px', fontSize: '11px', opacity: 0.85 }}>{employee.email || 'No email'}</div>
                        <div style={{ marginTop: '2px', fontSize: '10px', opacity: 0.75 }}>
                          {employee.employeeCode || 'No code'}{employee.department ? ` • ${employee.department}` : ''}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ ...cardStyle, padding: '14px', boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={sectionTitleStyle}>Exit Details</div>
              <div>
                <label style={fieldLabelStyle}>Exit Type</label>
                <select value={createForm.exitType} onChange={(event) => setCreateForm((current) => ({ ...current, exitType: event.target.value }))} style={inputStyle}>
                  {EXIT_TYPE_OPTIONS.map((exitType) => <option key={exitType} value={exitType}>{exitType}</option>)}
                </select>
              </div>
              <div>
                <label style={fieldLabelStyle}>Last Working Day</label>
                <input type="date" value={createForm.lastWorkingDay} onChange={(event) => setCreateForm((current) => ({ ...current, lastWorkingDay: event.target.value }))} style={inputStyle} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={createForm.noticePeriodServed}
                  onChange={(event) => setCreateForm((current) => ({ ...current, noticePeriodServed: event.target.checked }))}
                />
                Notice Period Served
              </label>
              <div>
                <label style={fieldLabelStyle}>HR Remarks</label>
                <textarea
                  rows={4}
                  value={createForm.hrRemarks}
                  onChange={(event) => setCreateForm((current) => ({ ...current, hrRemarks: event.target.value }))}
                  style={{ ...textareaStyle, minHeight: '70px' }}
                  placeholder="Add any context for the exit process"
                />
              </div>
              <button
                type="submit"
                disabled={createSaving}
                style={{ ...primaryButtonStyle, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: createSaving ? 0.75 : 1 }}
              >
                {createSaving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                {createSaving ? 'Creating...' : 'Create Offboarding Record'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
};

export default Offboarding;
