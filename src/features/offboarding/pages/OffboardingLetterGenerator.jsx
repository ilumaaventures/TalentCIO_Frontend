import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  FolderOpen,
  Loader2,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/apiClient';
import { useAuth } from '@/features/auth/context/AuthContext';
import { resolveTemplate } from '@/features/email/utils/templatePlaceholders';

const EXIT_TYPE_OPTIONS = [
  'Resignation',
  'Termination',
  'Retirement',
  'End of Contract',
  'Mutual Separation',
  'Absconding'
];

const AVAILABLE_LETTER_TAGS = [
  { tag: '{{fullName}}', desc: 'Employee Full Name' },
  { tag: '{{firstName}}', desc: 'First Name' },
  { tag: '{{lastName}}', desc: 'Last Name' },
  { tag: '{{employeeCode}}', desc: 'Employee Code / ID' },
  { tag: '{{designation}}', desc: 'Designation / Title' },
  { tag: '{{department}}', desc: 'Department' },
  { tag: '{{joiningDate}}', desc: 'Joining Date' },
  { tag: '{{lastWorkingDay}}', desc: 'Relieving / Last Working Date' },
  { tag: '{{exitType}}', desc: 'Exit Type' },
  { tag: '{{companyName}}', desc: 'Company Name' },
  { tag: '{{companyAddress}}', desc: 'Company Address' },
  { tag: '{{currentDate}}', desc: "Today's Date" },
  { tag: '{{currentYear}}', desc: 'Current Year' },
  { tag: '{{noticePeriodServed}}', desc: 'Notice Period Served' }
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
    The employee separated from the organization via <strong>{{exitType}}</strong>.
    During the tenure, the conduct and performance were found to be satisfactory.
    All company assets, clearances, and dues have been completed.
</p>
<p>
    We relieve <strong>{{fullName}}</strong> of all duties and responsibilities effective the close of business hours on <strong>{{lastWorkingDay}}</strong>.
</p>
<p>
    We wish <strong>{{firstName}}</strong> every success in future endeavors.
</p>
<p>
    Sincerely,<br />
    <strong>{{companyName}} HR Team</strong>
</p>`;

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
    Throughout the tenure, <strong>{{firstName}}</strong> demonstrated dedication, technical competence, and a professional attitude toward assignments.
</p>
<p>
    We thank <strong>{{firstName}}</strong> for the valuable contributions made to the organization and wish them continued success in their career.
</p>
<p>
    Warm regards,<br />
    <strong>{{companyName}} HR Team</strong>
</p>`;

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

const formatDateLabel = (value) => {
  if (!value) return 'N/A';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return 'N/A';
  }
};

const getEmployeeName = (emp) => {
  if (!emp) return 'Employee';
  const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
  return name || emp.name || emp.email || 'Employee';
};

const OffboardingLetterGenerator = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [wizardStep, setWizardStep] = useState(() => {
    const stepParam = parseInt(searchParams.get('step'), 10);
    return stepParam >= 1 && stepParam <= 3 ? stepParam : 1;
  });

  // Offboarding Records
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

  // Step 1: Manage Templates
  const [activeTemplateType, setActiveTemplateType] = useState('Relieving Letter');
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
  const [topLetterForm, setTopLetterForm] = useState({
    userId: '',
    offboardingId: '',
    lastWorkingDay: '',
    exitType: 'Resignation'
  });
  const [selectedRelievingCheck, setSelectedRelievingCheck] = useState(true);
  const [selectedExperienceCheck, setSelectedExperienceCheck] = useState(true);
  const [generatedLetterPreviews, setGeneratedLetterPreviews] = useState({});
  const [activePreviewType, setActivePreviewType] = useState('Relieving Letter');
  const [generatingPreviews, setGeneratingPreviews] = useState(false);
  const [savingBatchToDossier, setSavingBatchToDossier] = useState(false);

  // Step 3: Send & Proceed with Offboarding
  const [dossierLetters, setDossierLetters] = useState([]);
  const [loadingDossierLetters, setLoadingDossierLetters] = useState(false);
  const [selectedDossierDocIds, setSelectedDossierDocIds] = useState([]);
  const [topSendRecipientEmail, setTopSendRecipientEmail] = useState('');
  const [topSendEmailAccountId, setTopSendEmailAccountId] = useState('platform');
  const [topSendPersonalNote, setTopSendPersonalNote] = useState('');
  const [topSendingLetters, setTopSendingLetters] = useState(false);
  const [emailSenderOptions, setEmailSenderOptions] = useState([
    { _id: 'platform', name: 'TalentCIO Platform', provider: 'platform', fromAddress: 'no-reply@talentcio.in' }
  ]);
  const [sendersLoading, setSendersLoading] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const res = await api.get('/offboarding');
      const recs = Array.isArray(res.data) ? res.data : (res.data?.records || []);
      setRecords(recs);
    } catch (err) {
      console.warn('Failed to load offboarding records:', err);
      toast.error('Failed to load offboarding records');
    } finally {
      setLoadingRecords(false);
    }
  }, []);

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

  const fetchSenders = useCallback(async () => {
    setSendersLoading(true);
    try {
      const res = await api.get('/company/email-settings/senders');
      const senderData = res.data || {};
      const options = [
        senderData.platformOption,
        ...((senderData.accounts || []).filter((account) => account.ready))
      ].filter(Boolean);
      setEmailSenderOptions(options.length > 0 ? options : [
        { _id: 'platform', name: 'TalentCIO Platform', provider: 'platform', fromAddress: 'no-reply@talentcio.in' }
      ]);
    } catch (err) {
      console.warn('Failed to load senders:', err);
    } finally {
      setSendersLoading(false);
    }
  }, []);

  const fetchDossierLetters = useCallback(async (uid) => {
    if (!uid) {
      setDossierLetters([]);
      return;
    }
    setLoadingDossierLetters(true);
    try {
      const res = await api.get(`/offboarding/dossier-letters/${uid}`);
      const docs = res.data?.letters || res.data?.documents || [];
      setDossierLetters(docs);
      if (docs.length > 0) {
        setSelectedDossierDocIds(docs.map(d => d._id));
      }
    } catch (err) {
      console.warn('Failed to fetch dossier letters:', err);
      setDossierLetters([]);
    } finally {
      setLoadingDossierLetters(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchLetterTemplates();
    fetchSenders();
  }, [fetchRecords, fetchLetterTemplates, fetchSenders]);

  // Handle URL query parameters (e.g. ?userId=...)
  useEffect(() => {
    const targetUserId = searchParams.get('userId');
    if (targetUserId && records.length > 0) {
      const matchingRecord = records.find(r => r.userId?._id === targetUserId || r.userId === targetUserId);
      if (matchingRecord && matchingRecord.userId) {
        const u = matchingRecord.userId;
        const rawDate = matchingRecord.lastWorkingDay ? new Date(matchingRecord.lastWorkingDay) : null;
        const formattedDate = rawDate && !isNaN(rawDate.getTime()) ? rawDate.toISOString().slice(0, 10) : '';

        setTopLetterForm({
          userId: u._id,
          offboardingId: matchingRecord._id,
          lastWorkingDay: formattedDate,
          exitType: matchingRecord.exitType || 'Resignation'
        });

        const email = u.employeeProfile?.contact?.personalEmail || u.email || '';
        setTopSendRecipientEmail(email);
        fetchDossierLetters(u._id);
        setWizardStep(2);
      }
    }
  }, [searchParams, records, fetchDossierLetters]);

  // Filtered employees currently in offboarding
  const offboardingEmployees = useMemo(() => {
    if (!Array.isArray(records)) return [];
    const map = new Map();
    records.forEach(rec => {
      const u = rec.userId;
      if (!u || !u._id) return;
      if (!map.has(u._id)) {
        map.set(u._id, {
          _id: u._id,
          name: getEmployeeName(u),
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          employeeCode: u.employeeCode,
          department: u.department,
          employeeProfile: u.employeeProfile,
          offboardingRecordId: rec._id,
          offboardingStatus: rec.status,
          exitType: rec.exitType,
          lastWorkingDay: rec.lastWorkingDay
        });
      }
    });
    return Array.from(map.values());
  }, [records]);

  const filteredOffboardingEmployees = useMemo(() => {
    const q = employeeSearchTerm.trim().toLowerCase();
    if (!q) return offboardingEmployees;
    return offboardingEmployees.filter((emp) => {
      const name = getEmployeeName(emp).toLowerCase();
      const code = String(emp.employeeCode || '').toLowerCase();
      const email = String(emp.email || '').toLowerCase();
      const dept = String(emp.department || '').toLowerCase();
      return name.includes(q) || code.includes(q) || email.includes(q) || dept.includes(q);
    });
  }, [offboardingEmployees, employeeSearchTerm]);

  const topSelectedEmployee = useMemo(() => {
    return offboardingEmployees.find(e => e._id === topLetterForm.userId) || null;
  }, [offboardingEmployees, topLetterForm.userId]);

  // Step 1 file & tag handling
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

  // Step 2 selection & generation
  const handleSelectOffboardingEmployee = (emp) => {
    const rawDate = emp.lastWorkingDay ? new Date(emp.lastWorkingDay) : null;
    const formattedDate = rawDate && !isNaN(rawDate.getTime()) ? rawDate.toISOString().slice(0, 10) : '';

    setTopLetterForm({
      userId: emp._id,
      offboardingId: emp.offboardingRecordId || '',
      lastWorkingDay: formattedDate,
      exitType: emp.exitType || 'Resignation'
    });

    const email = emp.employeeProfile?.contact?.personalEmail || emp.email || '';
    setTopSendRecipientEmail(email);
    setGeneratedLetterPreviews({});
    fetchDossierLetters(emp._id);
  };

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
      setWizardStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save letter(s) to dossier');
    } finally {
      setSavingBatchToDossier(false);
    }
  };

  // Step 3 send dossier letters
  const handleToggleDossierDoc = (id) => {
    setSelectedDossierDocIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllDossierDocs = () => {
    if (selectedDossierDocIds.length === dossierLetters.length) {
      setSelectedDossierDocIds([]);
    } else {
      setSelectedDossierDocIds(dossierLetters.map(d => d._id));
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
      await fetchDossierLetters(topLetterForm.userId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send dossier letters');
    } finally {
      setTopSendingLetters(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <button
            type="button"
            onClick={() => navigate('/offboarding')}
            style={{
              ...ghostButtonStyle,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              marginBottom: '10px',
              color: '#475569'
            }}
          >
            <ArrowLeft size={14} />
            Back to Offboarding Dashboard
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <FileText size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Offboarding Letter Generator
              </h1>
              <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '12px' }}>
                Upload & manage templates, generate employee letters with dynamic tags, archive directly to Dossier, and send exit documents.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchRecords();
            fetchLetterTemplates();
            if (topLetterForm.userId) fetchDossierLetters(topLetterForm.userId);
            toast.success('Page data refreshed');
          }}
          style={{ ...ghostButtonStyle, display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* 3-Step Wizard Navigation Stepper */}
      <div style={{
        ...cardStyle,
        padding: '8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        background: '#f8fafc'
      }}>
        <button
          type="button"
          onClick={() => setWizardStep(1)}
          style={{
            ...ghostButtonStyle,
            border: wizardStep === 1 ? '1px solid #0f172a' : '1px solid #e2e8f0',
            background: wizardStep === 1 ? '#0f172a' : '#ffffff',
            color: wizardStep === 1 ? '#ffffff' : '#475569',
            padding: '12px 16px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'left'
          }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: wizardStep === 1 ? 'rgba(255,255,255,0.2)' : '#eff6ff',
            color: wizardStep === 1 ? '#ffffff' : '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '12px'
          }}>
            1
          </div>
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 700 }}>Upload & Manage Templates</div>
            <div style={{ fontSize: '10.5px', opacity: 0.8 }}>Configure reusable letter templates</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setWizardStep(2)}
          style={{
            ...ghostButtonStyle,
            border: wizardStep === 2 ? '1px solid #0f172a' : '1px solid #e2e8f0',
            background: wizardStep === 2 ? '#0f172a' : '#ffffff',
            color: wizardStep === 2 ? '#ffffff' : '#475569',
            padding: '12px 16px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'left'
          }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: wizardStep === 2 ? 'rgba(255,255,255,0.2)' : '#eff6ff',
            color: wizardStep === 2 ? '#ffffff' : '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '12px'
          }}>
            2
          </div>
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 700 }}>Generate Employee Letters</div>
            <div style={{ fontSize: '10.5px', opacity: 0.8 }}>Select employee, preview & save to Dossier</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setWizardStep(3)}
          style={{
            ...ghostButtonStyle,
            border: wizardStep === 3 ? '1px solid #0f172a' : '1px solid #e2e8f0',
            background: wizardStep === 3 ? '#0f172a' : '#ffffff',
            color: wizardStep === 3 ? '#ffffff' : '#475569',
            padding: '12px 16px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'left'
          }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: wizardStep === 3 ? 'rgba(255,255,255,0.2)' : '#eff6ff',
            color: wizardStep === 3 ? '#ffffff' : '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '12px'
          }}>
            3
          </div>
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 700 }}>Proceed with Offboarding</div>
            <div style={{ fontSize: '10.5px', opacity: 0.8 }}>Email letters & complete clearance</div>
          </div>
        </button>
      </div>

      {/* STEP 1: Upload and Manage Letter Templates */}
      {wizardStep === 1 && (
        <div style={{ ...cardStyle, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['Relieving Letter', 'Experience Letter'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setActiveTemplateType(type)}
                    style={{
                      ...ghostButtonStyle,
                      padding: '8px 16px',
                      fontWeight: 700,
                      fontSize: '12px',
                      background: activeTemplateType === type ? '#0f172a' : '#ffffff',
                      color: activeTemplateType === type ? '#ffffff' : '#334155',
                      borderColor: activeTemplateType === type ? '#0f172a' : '#cbd5e1'
                    }}
                  >
                    {type} Template
                  </button>
                ))}
              </div>
              {step1LoadingTemplates && (
                <span style={{ fontSize: '11px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Loader2 size={12} className="animate-spin" /> Loading saved templates...
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setTemplateBodies(prev => ({
                  ...prev,
                  [activeTemplateType]: activeTemplateType === 'Relieving Letter' ? DEFAULT_RELIEVING_BODY_FE : DEFAULT_EXPERIENCE_BODY_FE
                }));
                setStep1UploadedFiles(prev => ({ ...prev, [activeTemplateType]: null }));
                setStep1DocxPreviews(prev => ({ ...prev, [activeTemplateType]: '' }));
                toast.success(`Reset ${activeTemplateType} to default template`);
              }}
              style={{ ...ghostButtonStyle, padding: '6px 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <RotateCcw size={12} />
              Reset to Default
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: '24px' }}>
            {/* Left: Upload file, tags palette, editor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px', background: '#f8fafc', textAlign: 'center' }}>
                <input
                  type="file"
                  id={`page-step1-upload-${activeTemplateType}`}
                  accept=".docx,.doc,.html,.htm,.txt"
                  onChange={handleStep1FileUpload}
                  style={{ display: 'none' }}
                />
                {step1UploadedFiles[activeTemplateType] ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                      <div style={{ textAlign: 'left', minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {step1UploadedFiles[activeTemplateType].name}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                          {(step1UploadedFiles[activeTemplateType].size / 1024).toFixed(1)} KB • Template attached
                        </div>
                      </div>
                    </div>
                    <label
                      htmlFor={`page-step1-upload-${activeTemplateType}`}
                      style={{ ...ghostButtonStyle, padding: '5px 10px', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}
                    >
                      Change File
                    </label>
                  </div>
                ) : (
                  <label htmlFor={`page-step1-upload-${activeTemplateType}`} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                      <Upload size={20} />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                      Upload {activeTemplateType} Template (.docx, .html, .txt)
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Drag & drop or click to browse. Dynamic tags will be replaced with employee details.
                    </div>
                  </label>
                )}
              </div>

              {/* Dynamic Tags Badges */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Predefined Dynamic Tags (Click to copy & insert)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {AVAILABLE_LETTER_TAGS.map((tagObj) => (
                    <button
                      key={tagObj.tag}
                      type="button"
                      onClick={() => handleStep1InsertTag(tagObj.tag)}
                      title={`${tagObj.desc} - Click to insert`}
                      style={{
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#2563eb',
                        cursor: 'pointer'
                      }}
                    >
                      {tagObj.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* HTML / Body Editor */}
              <div>
                <label style={fieldLabelStyle}>Edit Template Body (HTML / Text)</label>
                <textarea
                  rows={10}
                  value={templateBodies[activeTemplateType] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTemplateBodies(prev => ({ ...prev, [activeTemplateType]: val }));
                  }}
                  style={{ ...textareaStyle, fontFamily: 'monospace', fontSize: '12px', minHeight: '180px' }}
                  placeholder="Enter template body with {{tags}}..."
                />
              </div>
            </div>

            {/* Right: Rendered Preview & Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={fieldLabelStyle}>Template Preview (Sample Data)</label>
                {step1PreviewLoading && (
                  <span style={{ fontSize: '11px', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Loader2 size={12} className="animate-spin" /> Parsing file...
                  </span>
                )}
              </div>

              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  background: '#ffffff',
                  padding: '24px',
                  minHeight: '340px',
                  maxHeight: '440px',
                  overflowY: 'auto',
                  fontSize: '12px',
                  lineHeight: '1.7',
                  color: '#1e293b',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: '8px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e40af' }}>{user?.company?.name || 'TalentCIO'}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Date: {formatDateLabel(new Date().toISOString())}</div>
                </div>
                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '13px', margin: '8px 0 14px', textDecoration: 'underline' }}>
                  {activeTemplateType.toUpperCase()}
                </div>
                <div dangerouslySetInnerHTML={{ __html: step1PreviewHtml }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                <button
                  type="button"
                  onClick={handleStep1SaveTemplate}
                  disabled={step1SavingTemplate}
                  style={{
                    ...ghostButtonStyle,
                    flex: 1,
                    padding: '11px 16px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {step1SavingTemplate ? <Loader2 size={15} className="animate-spin" /> : <FileCheck size={15} />}
                  {step1SavingTemplate ? 'Saving Template...' : 'Save Template for Future Use'}
                </button>

                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  style={{
                    ...primaryButtonStyle,
                    flex: 1,
                    padding: '11px 16px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>Next: Generate Letters</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Generate Employee Letters */}
      {wizardStep === 2 && (
        <div style={{ ...cardStyle, padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '24px' }}>
          {/* Left Column: Select Employee, Checkboxes, Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. Select Employee */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={sectionTitleStyle}>1. Select Employee</div>
                <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: 700, background: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                  Offboarding Only
                </span>
              </div>
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={employeeSearchTerm}
                  onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                  placeholder="Search offboarding employees..."
                  style={{ ...inputStyle, paddingLeft: '32px' }}
                />
              </div>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                {loadingRecords ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                    <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto 6px' }} />
                    Loading offboarding employees...
                  </div>
                ) : filteredOffboardingEmployees.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '11.5px' }}>
                    No employees currently in offboarding match your search.
                  </div>
                ) : (
                  filteredOffboardingEmployees.map((emp) => {
                    const isSelected = topLetterForm.userId === emp._id;
                    return (
                      <button
                        key={emp._id}
                        type="button"
                        onClick={() => handleSelectOffboardingEmployee(emp)}
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700 }}>{getEmployeeName(emp)}</div>
                          {emp.offboardingStatus && (
                            <span style={{
                              fontSize: '9.5px',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: isSelected ? 'rgba(255,255,255,0.2)' : '#eff6ff',
                              color: isSelected ? '#ffffff' : '#1d4ed8'
                            }}>
                              {emp.offboardingStatus}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '10.5px', opacity: 0.8, marginTop: '2px' }}>
                          {emp.email || 'No email'}{emp.employeeCode ? ` • ${emp.employeeCode}` : ''}{emp.exitType ? ` • ${emp.exitType}` : ''}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. Choose Required Letters */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#ffffff' }}>
              <div style={{ ...sectionTitleStyle, marginBottom: '10px' }}>2. Choose Required Letter(s)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: selectedRelievingCheck ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                  background: selectedRelievingCheck ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: selectedRelievingCheck ? '#1e40af' : '#334155'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedRelievingCheck}
                    onChange={(e) => setSelectedRelievingCheck(e.target.checked)}
                  />
                  <span>Relieving Letter</span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: selectedExperienceCheck ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                  background: selectedExperienceCheck ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: selectedExperienceCheck ? '#1e40af' : '#334155'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedExperienceCheck}
                    onChange={(e) => setSelectedExperienceCheck(e.target.checked)}
                  />
                  <span>Experience Letter</span>
                </label>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
                Select either one or both letters to generate for this employee.
              </div>
            </div>

            {/* 3. Exit Options & Preview Button */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={sectionTitleStyle}>3. Exit Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={fieldLabelStyle}>Exit Type</label>
                  <select
                    value={topLetterForm.exitType}
                    onChange={(e) => setTopLetterForm((prev) => ({ ...prev, exitType: e.target.value }))}
                    style={inputStyle}
                  >
                    {EXIT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={fieldLabelStyle}>Last Working Day</label>
                  <input
                    type="date"
                    value={topLetterForm.lastWorkingDay}
                    onChange={(e) => setTopLetterForm((prev) => ({ ...prev, lastWorkingDay: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateBatchPreviews}
                disabled={generatingPreviews || !topLetterForm.userId || (!selectedRelievingCheck && !selectedExperienceCheck)}
                style={{
                  ...ghostButtonStyle,
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: (generatingPreviews || !topLetterForm.userId || (!selectedRelievingCheck && !selectedExperienceCheck)) ? 0.6 : 1,
                  cursor: (generatingPreviews || !topLetterForm.userId || (!selectedRelievingCheck && !selectedExperienceCheck)) ? 'not-allowed' : 'pointer'
                }}
              >
                {generatingPreviews ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                {generatingPreviews ? 'Generating Previews...' : 'Generate Letter Preview(s)'}
              </button>
            </div>
          </div>

          {/* Right Column: Previews and Approval to Dossier */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={sectionTitleStyle}>
                Letter Preview & Verification
              </div>
              {Object.keys(generatedLetterPreviews).length > 1 && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {Object.keys(generatedLetterPreviews).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setActivePreviewType(type)}
                      style={{
                        ...ghostButtonStyle,
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: activePreviewType === type ? '#0f172a' : '#ffffff',
                        color: activePreviewType === type ? '#ffffff' : '#475569',
                        borderColor: activePreviewType === type ? '#0f172a' : '#cbd5e1'
                      }}
                    >
                      {type.replace(' Letter', '')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {Object.keys(generatedLetterPreviews).length === 0 ? (
              <div style={{ border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '60px 24px', textAlign: 'center', background: '#f8fafc', color: '#64748b' }}>
                <Sparkles size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                  {topSelectedEmployee ? `Ready to generate letters for ${getEmployeeName(topSelectedEmployee)}` : 'Select an employee on the left'}
                </div>
                <p style={{ fontSize: '12px', margin: '6px 0 16px' }}>
                  Click &ldquo;Generate Letter Preview(s)&rdquo; to review the letters with employee details before saving to Dossier.
                </p>
                <button
                  type="button"
                  onClick={handleGenerateBatchPreviews}
                  disabled={generatingPreviews || !topLetterForm.userId || (!selectedRelievingCheck && !selectedExperienceCheck)}
                  style={{ ...primaryButtonStyle, fontSize: '12px', padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sparkles size={14} />
                  Generate Preview
                </button>
              </div>
            ) : (
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  background: '#ffffff',
                  padding: '24px',
                  minHeight: '380px',
                  maxHeight: '480px',
                  overflowY: 'auto',
                  fontSize: '12px',
                  lineHeight: '1.7',
                  color: '#1e293b'
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: generatedLetterPreviews[activePreviewType] || Object.values(generatedLetterPreviews)[0] }} />
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveApprovedBatchToDossier}
              disabled={savingBatchToDossier || !topLetterForm.userId || (!selectedRelievingCheck && !selectedExperienceCheck)}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                padding: '12px 16px',
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: 'auto',
                opacity: (savingBatchToDossier || !topLetterForm.userId || (!selectedRelievingCheck && !selectedExperienceCheck)) ? 0.6 : 1,
                cursor: (savingBatchToDossier || !topLetterForm.userId || (!selectedRelievingCheck && !selectedExperienceCheck)) ? 'not-allowed' : 'pointer'
              }}
            >
              {savingBatchToDossier ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {savingBatchToDossier ? 'Saving to Employee Dossier...' : 'Approve & Save Finalized Letter(s) to Dossier'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                style={{ ...ghostButtonStyle, padding: '6px 12px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={13} />
                Back to Templates
              </button>
              <button
                type="button"
                onClick={() => setWizardStep(3)}
                style={{ ...ghostButtonStyle, padding: '6px 12px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                Skip to Step 3: Offboarding Actions
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Proceed with Offboarding */}
      {wizardStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Banner */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#2563eb" />
                {topSelectedEmployee ? `Letters & Dossier for ${getEmployeeName(topSelectedEmployee)}` : 'Employee Exit Documents'}
              </div>
              <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '3px' }}>
                Letters are archived in the employee&apos;s dossier. Send them via email or conclude the offboarding clearance process.
              </div>
            </div>
            <button
              type="button"
              onClick={() => topLetterForm.userId && fetchDossierLetters(topLetterForm.userId)}
              disabled={loadingDossierLetters || !topLetterForm.userId}
              style={{ ...ghostButtonStyle, padding: '6px 12px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={12} className={loadingDossierLetters ? 'animate-spin' : ''} />
              Refresh Dossier
            </button>
          </div>

          <div style={{ ...cardStyle, padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={sectionTitleStyle}>
                Choose Letter(s) from Dossier to Send
              </div>
              {dossierLetters.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllDossierDocs}
                  style={{ ...ghostButtonStyle, padding: '4px 10px', fontSize: '11px' }}
                >
                  {selectedDossierDocIds.length === dossierLetters.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {!topLetterForm.userId ? (
              <div style={{ padding: '36px', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b', fontSize: '13px' }}>
                Please select an employee in Step 2 first.
              </div>
            ) : loadingDossierLetters ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                <Loader2 size={18} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                Loading letters from employee dossier...
              </div>
            ) : dossierLetters.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc' }}>
                <FolderOpen size={30} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>No Letters in Dossier Yet</div>
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  style={{ ...primaryButtonStyle, fontSize: '11.5px', padding: '6px 14px', marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sparkles size={13} />
                  Generate Letters in Step 2
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto' }}>
                {dossierLetters.map((doc) => {
                  const isChecked = selectedDossierDocIds.includes(doc._id);
                  return (
                    <div
                      key={doc._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: isChecked ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                        background: isChecked ? '#eff6ff' : '#ffffff',
                        gap: '12px'
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleDossierDoc(doc._id)}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {doc.title || doc.fileName || 'Official Letter'}
                            </span>
                            <span style={{ fontSize: '9.5px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#dbeafe', color: '#1e40af' }}>
                              {doc.category}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Saved: {formatDateLabel(doc.uploadDate || doc.uploadedAt)}
                          </div>
                        </div>
                      </label>
                      {doc.url && (
                        <button
                          type="button"
                          onClick={() => window.open(doc.url, '_blank')}
                          style={{ ...ghostButtonStyle, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}
                        >
                          <Eye size={12} />
                          View
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {dossierLetters.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={fieldLabelStyle}>Recipient Email</label>
                    <input
                      type="email"
                      value={topSendRecipientEmail}
                      onChange={(e) => setTopSendRecipientEmail(e.target.value)}
                      placeholder="employee@example.com"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Sender Account</label>
                    <select
                      value={topSendEmailAccountId}
                      onChange={(e) => setTopSendEmailAccountId(e.target.value)}
                      style={inputStyle}
                      disabled={sendersLoading}
                    >
                      {emailSenderOptions.map((option) => (
                        <option key={option._id} value={option._id}>
                          {`${option.name} (${option.provider || 'platform'}) - ${option.fromAddress || 'no-reply'}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={fieldLabelStyle}>Personal Note from HR (Optional)</label>
                  <textarea
                    rows={3}
                    value={topSendPersonalNote}
                    onChange={(e) => setTopSendPersonalNote(e.target.value)}
                    placeholder="E.g., Please find attached your verified exit letters from your dossier. Wishing you all the best!"
                    style={{ ...textareaStyle, minHeight: '60px' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleTopSendDossierLetters}
                  disabled={topSendingLetters || selectedDossierDocIds.length === 0}
                  style={{
                    ...primaryButtonStyle,
                    width: '100%',
                    padding: '11px 16px',
                    fontSize: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: (topSendingLetters || selectedDossierDocIds.length === 0) ? 0.7 : 1,
                    cursor: (topSendingLetters || selectedDossierDocIds.length === 0) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {topSendingLetters ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {topSendingLetters ? 'Sending Letters...' : `Send Selected Letters (${selectedDossierDocIds.length})`}
                </button>
              </div>
            )}
          </div>

          {/* Offboarding Completion Actions */}
          <div style={{ ...cardStyle, padding: '20px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={sectionTitleStyle}>Remaining Offboarding Process</div>
              {topSelectedEmployee?.offboardingStatus && (
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '5px', background: '#dcfce7', color: '#166534' }}>
                  Status: {topSelectedEmployee.offboardingStatus}
                </span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px' }}>
              Letters have been archived in the dossier. You can now complete department clearances (IT, Finance, Admin, HR) or return to the offboarding dashboard.
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate('/offboarding')}
                style={{
                  ...primaryButtonStyle,
                  flex: 1,
                  padding: '11px 16px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Check size={16} />
                Finish & Return to Offboarding Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OffboardingLetterGenerator;
