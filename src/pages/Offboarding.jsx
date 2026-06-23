import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import useDebouncedValue from '../hooks/useDebouncedValue';
import {
  OFFBOARDING_EMAIL_TEMPLATE_PLACEHOLDERS,
  getSupportedPlaceholderTokens,
  renderTemplateBody,
  resolveTemplate
} from '../utils/templatePlaceholders';
import {
  AlertCircle,
  FileText,
  Loader2,
  Mail,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
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
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  minHeight: '100%'
};

const cardStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '20px',
  boxShadow: '0 14px 35px rgba(15, 23, 42, 0.06)'
};

const sectionTitleStyle = {
  fontSize: '13px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: '#64748b',
  marginBottom: '10px'
};

const fieldLabelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 700,
  color: '#475569',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em'
};

const inputStyle = {
  width: '100%',
  borderRadius: '14px',
  border: '1px solid #cbd5e1',
  padding: '12px 14px',
  fontSize: '14px',
  color: '#0f172a',
  outline: 'none',
  background: '#ffffff',
  boxSizing: 'border-box'
};

const textareaStyle = {
  ...inputStyle,
  minHeight: '110px',
  resize: 'vertical',
  fontFamily: 'inherit'
};

const ghostButtonStyle = {
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  color: '#334155',
  borderRadius: '12px',
  padding: '10px 14px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer'
};

const primaryButtonStyle = {
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
  color: '#ffffff',
  borderRadius: '14px',
  padding: '12px 16px',
  fontSize: '14px',
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
  gap: '6px',
  padding: '6px 10px',
  borderRadius: '999px',
  fontSize: '12px',
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

const getEmployeeName = (employee = {}) => (
  `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee'
);

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
    designation: profile?.employment?.designation || '',
    department: employee.department || '',
    joiningDate: formatDateLabel(employee.joiningDate || profile?.employment?.joiningDate),
    lastWorkingDay: formatDateLabel(record?.lastWorkingDay),
    exitType: record?.exitType || '',
    companyName: userCompanyName || 'TalentCIO',
    currentYear: new Date().getFullYear().toString()
  };
};

const ModalShell = ({ title, subtitle, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', zIndex: 60, padding: '20px', overflowY: 'auto' }}>
    <div style={{ maxWidth: '980px', margin: '0 auto', ...cardStyle, overflow: 'hidden' }}>
      <div style={{ padding: '20px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>{title}</h2>
          {subtitle ? <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14px' }}>{subtitle}</p> : null}
        </div>
        <button type="button" onClick={onClose} style={{ ...ghostButtonStyle, padding: '8px 10px' }}>
          <X size={16} />
        </button>
      </div>
      <div style={{ padding: '22px' }}>{children}</div>
    </div>
  </div>
);

const Offboarding = () => {
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
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [statusDraft, setStatusDraft] = useState('Initiated');
  const [statusSaving, setStatusSaving] = useState(false);
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
    if (!selectedRecord) return;
    const personalEmail = selectedRecord?.userId?.employeeProfile?.contact?.personalEmail || '';
    setRecipientEmail(personalEmail || selectedRecord?.userId?.email || '');
    setStatusDraft(EDITABLE_STATUS_OPTIONS.includes(selectedRecord?.status) ? selectedRecord.status : 'In Progress');
  }, [selectedRecord]);

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

  const renderStatsCard = (label, value, accent) => (
    <div style={{
      ...cardStyle,
      padding: '18px',
      borderColor: accent.border,
      background: accent.background
    }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.14em' }}>{label}</div>
      <div style={{ marginTop: '10px', fontSize: '30px', fontWeight: 700, color: '#0f172a' }}>{statsLoading ? '...' : value}</div>
    </div>
  );

  const rightPanel = selectedRecordId ? (
    <div style={{
      ...cardStyle,
      padding: '22px',
      minHeight: '640px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: 700 }}>
            <Mail size={14} />
            Send Exit Email
          </div>
          <h2 style={{ margin: '12px 0 4px', fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
            {selectedRecord ? getEmployeeName(selectedRecord.userId) : 'Loading...'}
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            {selectedRecord?.userId?.email || 'No work email'}{selectedRecord?.userId?.employeeCode ? ` • ${selectedRecord.userId.employeeCode}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedRecordId('');
            setSelectedRecord(null);
          }}
          style={{ ...ghostButtonStyle, padding: '9px 11px' }}
        >
          <X size={16} />
        </button>
      </div>

      {detailLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : selectedRecord ? (
        <>
          <div style={{ ...cardStyle, padding: '18px', borderRadius: '18px', boxShadow: 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
              <div>
                <div style={sectionTitleStyle}>Status</div>
                <span style={getStatusBadgeStyle(selectedRecord.status)}>{selectedRecord.status}</span>
              </div>
              <div>
                <div style={sectionTitleStyle}>Exit Type</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{selectedRecord.exitType}</div>
              </div>
              <div>
                <div style={sectionTitleStyle}>Last Working Day</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{formatDateLabel(selectedRecord.lastWorkingDay)}</div>
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, padding: '18px', borderRadius: '18px', boxShadow: 'none' }}>
            <div style={sectionTitleStyle}>Workflow Status</div>
            <label style={fieldLabelStyle}>Manual Status Update</label>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) auto', gap: '12px', alignItems: 'end' }}>
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
                  minWidth: '150px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {statusSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                {statusSaving ? 'Saving...' : 'Save Status'}
              </button>
            </div>
            <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: '12px' }}>
              Sending the exit email will automatically move `Initiated` records to `In Progress`. Choosing `Completed` here will run the full completion flow and deactivate the employee account.
            </p>
          </div>

          <div style={{ ...cardStyle, padding: '18px', borderRadius: '18px', boxShadow: 'none' }}>
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
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '13px' }}>
              This is where the email will be delivered.
            </p>
          </div>

          <div style={{ ...cardStyle, padding: '18px', borderRadius: '18px', boxShadow: 'none' }}>
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
              style={{ ...ghostButtonStyle, marginTop: '14px' }}
            >
              {showBodyEditor ? 'Hide Subject & Body' : 'Customize Subject & Body'}
            </button>

            {showBodyEditor ? (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                    rows={6}
                    value={customBody}
                    onChange={(event) => setCustomBody(event.target.value)}
                    style={{ ...textareaStyle, minHeight: '160px' }}
                    disabled={!canUpdate}
                  />
                </div>
                <div style={{ borderRadius: '16px', border: '1px solid #dbeafe', background: '#f8fbff', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #dbeafe', background: '#eff6ff' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Preview</div>
                    <div style={{ marginTop: '6px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{previewSubject}</div>
                  </div>
                  <div
                    style={{ padding: '16px', color: '#334155', fontSize: '14px', pointerEvents: 'none' }}
                    dangerouslySetInnerHTML={{ __html: previewBody }}
                  />
                </div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>
                  Supported placeholders: {placeholderHelpText}
                </p>
              </div>
            ) : null}
          </div>

          <div style={{ ...cardStyle, padding: '18px', borderRadius: '18px', boxShadow: 'none' }}>
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

          <div style={{ ...cardStyle, padding: '18px', borderRadius: '18px', boxShadow: 'none' }}>
            <div style={sectionTitleStyle}>Attach Files (Optional)</div>
            <label style={{ ...primaryButtonStyle, display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: canUpdate ? 'pointer' : 'not-allowed', opacity: canUpdate ? 1 : 0.6 }}>
              <Paperclip size={16} />
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
            <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: '12px' }}>
              Max {MAX_ATTACHMENTS} files. Each file must be 10MB or smaller.
            </p>

            {attachmentFiles.length > 0 ? (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {attachmentFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <FileText size={16} color="#2563eb" />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                    </div>
                    <button type="button" onClick={() => handleRemoveAttachment(index)} style={{ ...ghostButtonStyle, padding: '7px 9px' }}>
                      <X size={14} />
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
              padding: '14px 18px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              opacity: (!canUpdate || sending) ? 0.7 : 1,
              cursor: (!canUpdate || sending) ? 'not-allowed' : 'pointer'
            }}
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {sending ? 'Sending...' : 'Send Email'}
          </button>

          <div style={{ ...cardStyle, padding: '18px', borderRadius: '18px', boxShadow: 'none' }}>
            <div style={sectionTitleStyle}>Previously Sent</div>
            {previouslySentItems.length === 0 ? (
              <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>No emails sent yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {previouslySentItems.map((item, index) => (
                  <div key={`${item.sentAt || item.type}-${index}`} style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px 14px', background: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ ...getStatusBadgeStyle(item.type || 'Other'), background: '#f1f5f9', color: '#334155' }}>{item.type || 'Other'}</span>
                      <span style={{ fontSize: '14px', color: '#334155' }}>Sent to {item.sentTo || 'Unknown recipient'}</span>
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '13px', color: '#64748b' }}>{formatDateLabel(item.sentAt)}</div>
                    {item.notes ? <div style={{ marginTop: '4px', fontSize: '12px', color: '#94a3b8' }}>{item.notes}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  ) : null;

  if (!canRead) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ ...cardStyle, padding: '20px', borderColor: '#fde68a', background: '#fffbeb', color: '#92400e' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertCircle size={20} />
            <div>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Offboarding access required</h1>
              <p style={{ margin: '8px 0 0', fontSize: '14px' }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 12px', borderRadius: '999px', background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <UserMinus size={14} />
            Exit Operations
          </div>
          <h1 style={{ margin: '14px 0 6px', fontSize: '34px', lineHeight: 1.1, color: '#0f172a' }}>Offboarding</h1>
          <p style={{ margin: 0, maxWidth: '760px', color: '#64748b', fontSize: '15px' }}>
            Track exits, open an employee file, and send the final offboarding email with the right template, sender, and attachments.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" onClick={handleRefresh} style={ghostButtonStyle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={16} />
              Refresh
            </span>
          </button>
          {canCreate ? (
            <button type="button" onClick={handleOpenCreate} style={primaryButtonStyle}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} />
                Initiate Offboarding
              </span>
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, minmax(0, 1fr))', gap: '14px' }}>
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
        gap: '20px',
        alignItems: 'start'
      }}>
        <div style={{ ...cardStyle, padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', marginBottom: '18px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>Offboarding List</h2>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14px' }}>
                Open any record to send the exit email panel on the right.
              </p>
            </div>
            <div style={{ color: '#64748b', fontSize: '13px', alignSelf: 'center' }}>
              Page {currentPage} of {totalPages} • Total {totalRecords}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 0.9fr 0.9fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by employee, email, or code"
                style={{ ...inputStyle, paddingLeft: '38px' }}
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
            <div style={{ padding: '64px 20px', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={22} className="animate-spin" style={{ margin: '0 auto 10px' }} />
              Loading offboarding records...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div style={{ padding: '64px 20px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1', borderRadius: '18px', background: '#f8fafc' }}>
              No records found for this view.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '18px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    {['Employee', 'Exit Type', 'Status', 'Last Working Day', 'Action'].map((label) => (
                      <th key={label} style={{ textAlign: 'left', padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #e2e8f0' }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record._id} style={{ borderBottom: '1px solid #eef2f7', background: selectedRecordId === record._id ? '#f8fbff' : '#ffffff' }}>
                      <td style={{ padding: '16px', verticalAlign: 'top' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{getEmployeeName(record.userId)}</div>
                        <div style={{ marginTop: '5px', fontSize: '13px', color: '#64748b' }}>{record.userId?.email || 'No email'}</div>
                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#94a3b8' }}>{record.userId?.employeeCode || 'No code'}</div>
                      </td>
                      <td style={{ padding: '16px', verticalAlign: 'top', fontSize: '14px', color: '#334155' }}>{record.exitType}</td>
                      <td style={{ padding: '16px', verticalAlign: 'top' }}>
                        <span style={getStatusBadgeStyle(record.status)}>{record.status}</span>
                      </td>
                      <td style={{ padding: '16px', verticalAlign: 'top', fontSize: '14px', color: '#334155' }}>{formatDateLabel(record.lastWorkingDay)}</td>
                      <td style={{ padding: '16px', verticalAlign: 'top' }}>
                        <button type="button" onClick={() => setSelectedRecordId(record._id)} style={ghostButtonStyle}>Open</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Showing {filteredRecords.length} record{filteredRecords.length === 1 ? '' : 's'} on this page.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((value) => Math.max(value - 1, 1))} style={{ ...ghostButtonStyle, opacity: currentPage <= 1 ? 0.5 : 1, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}>
                Previous
              </button>
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((value) => Math.min(value + 1, totalPages))} style={{ ...ghostButtonStyle, opacity: currentPage >= totalPages ? 0.5 : 1, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}>
                Next
              </button>
            </div>
          </div>
        </div>

        {!isMobile ? rightPanel : null}
      </div>

      {isMobile && selectedRecordId ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15, 23, 42, 0.5)', padding: '12px', overflowY: 'auto' }}>
          {rightPanel}
        </div>
      ) : null}

      {showCreateModal ? (
        <ModalShell
          title="Initiate Offboarding"
          subtitle="Start an exit record before sending final communication."
          onClose={() => setShowCreateModal(false)}
        >
          <form onSubmit={handleCreateOffboarding} style={{ display: 'grid', gap: '20px', gridTemplateColumns: isMobile ? '1fr' : '1.1fr 0.9fr' }}>
            <div style={{ ...cardStyle, padding: '18px', boxShadow: 'none' }}>
              <div style={sectionTitleStyle}>Choose Employee</div>
              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={employeeSearchTerm}
                  onChange={(event) => setEmployeeSearchTerm(event.target.value)}
                  placeholder="Search by name, email, code, or department"
                  style={{ ...inputStyle, paddingLeft: '38px' }}
                />
              </div>
              <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#f8fafc' }}>
                {employeesLoading ? (
                  <div style={{ padding: '28px', textAlign: 'center', color: '#64748b' }}>Loading employees...</div>
                ) : filteredEmployees.length === 0 ? (
                  <div style={{ padding: '28px', textAlign: 'center', color: '#64748b' }}>No employees match this search.</div>
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
                          padding: '14px 16px',
                          background: isSelected ? '#0f172a' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#0f172a',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{getEmployeeName(employee)}</div>
                        <div style={{ marginTop: '4px', fontSize: '13px', opacity: 0.85 }}>{employee.email || 'No email'}</div>
                        <div style={{ marginTop: '4px', fontSize: '12px', opacity: 0.75 }}>
                          {employee.employeeCode || 'No code'}{employee.department ? ` • ${employee.department}` : ''}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ ...cardStyle, padding: '18px', boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', fontWeight: 600 }}>
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
                  rows={5}
                  value={createForm.hrRemarks}
                  onChange={(event) => setCreateForm((current) => ({ ...current, hrRemarks: event.target.value }))}
                  style={textareaStyle}
                  placeholder="Add any context for the exit process"
                />
              </div>
              <button
                type="submit"
                disabled={createSaving}
                style={{ ...primaryButtonStyle, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: createSaving ? 0.75 : 1 }}
              >
                {createSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
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
