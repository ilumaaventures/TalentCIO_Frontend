import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '@/lib/apiClient';
import { useAuth } from '@/features/auth/context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
    User,
    Users,
    History,
    Calendar,
    DollarSign,
    Search,
    CheckCircle,
    AlertTriangle,
    AlertCircle,
    ArrowRight,
    TrendingUp,
    RefreshCw,
    Filter,
    Check,
    ChevronDown,
    Building,
    Briefcase,
    Hash,
    Save,
    Sparkles,
    Mail,
    Send,
    Download,
    FileText,
    Eye,
    Upload,
    Trash2,
    Copy,
    FileSignature,
    HelpCircle,
    ArrowLeft,
    Layers,
    X,
    ExternalLink
} from 'lucide-react';
import CompensationFormSection from './compensation/CompensationFormSection';
import { buildMasterSalaryStructure, fmtMoney, parseBool } from '@/features/payroll/utils/payroll';

const REASON_TEMPLATES = [
    'Annual Appraisal & Hike',
    'Compensation Realignment / Restructuring',
    'Promotion / Designation Upgrade',
    'Probation Completion',
    'Market Rate Correction',
    'Role & Responsibility Expansion',
    'Employment Status Transition (Trainee → Full Time)'
];

const DEFAULT_SALARY_DRAFT = {
    compensationType: 'monthly_salary',
    attendanceMode: 'attendance',
    payType: 'salaried',
    useSalaryComponents: true,
    annualCTC: '600000',
    monthlyCTC: '50000',
    basic: '25000',
    hra: '12500',
    specialAllowance: '12500',
    monthlyGross: '50000',
    basicPercent: 50,
    hraPercent: 50,
    vpfPercent: 0,
    pfEnabled: true,
    esiEnabled: true,
    ptEnabled: true,
    lwfEnabled: true,
    gratuityEnabled: true,
    tdsEnabled: true,
    includePfInCTC: false,
    includeGratuityInCTC: true,
    ptState: 'MH',
    customAllowances: [],
    customDeductions: [],
    rateCard: []
};

const BASE_PLACEHOLDERS = [
    { tag: '{employee_full_name}', desc: "Employee's Full Name" },
    { tag: '{employee_first_name}', desc: 'First Name' },
    { tag: '{employee_last_name}', desc: 'Last Name' },
    { tag: '{employee_code}', desc: 'Employee Code / ID' },
    { tag: '{designation}', desc: 'Current or Revised Designation' },
    { tag: '{department}', desc: 'Department' },
    { tag: '{work_location}', desc: 'Work Location / Base' },
    { tag: '{joining_date}', desc: 'Date of Joining' },
    { tag: '{effective_date}', desc: 'Revision Effective Date' },
    { tag: '{reason_for_revision}', desc: 'Reason for Revision' },
    { tag: '{company_name}', desc: 'Company Legal Name' },
    { tag: '{current_date}', desc: 'Document Issue Date' },
    { tag: '{hr_name}', desc: 'Authorized Signatory Name' },
    { tag: '{annual_ctc}', desc: 'Revised Annual CTC' },
    { tag: '{monthly_ctc}', desc: 'Revised Monthly CTC' },
    { tag: '{monthly_gross}', desc: 'Monthly Gross Earnings' },
    { tag: '{annual_gross}', desc: 'Annual Gross Earnings' },
    { tag: '{net_take_home}', desc: 'Estimated Monthly Take-Home Pay' },
    { tag: '{basic_salary}', desc: 'Basic Salary (Monthly)' },
    { tag: '{hra}', desc: 'House Rent Allowance (Monthly)' },
    { tag: '{special_allowance}', desc: 'Special Allowance (Monthly)' }
];

const LOOP_PLACEHOLDERS = [
    {
        tag: '{#earnings_breakdown}...{/earnings_breakdown}',
        desc: 'Earnings loop. Fields inside loop: {name}, {monthly}, {annual}'
    },
    {
        tag: '{#contributions_breakdown}...{/contributions_breakdown}',
        desc: 'Employer Contributions loop (PF, ESI, Gratuity, LWF). Fields: {name}, {monthly}, {annual}'
    },
    {
        tag: '{#deductions_breakdown}...{/deductions_breakdown}',
        desc: 'Employee Deductions loop (PF, ESI, PT, LWF). Fields: {name}, {monthly}, {annual}'
    },
    {
        tag: '{#all_components}...{/all_components}',
        desc: 'All Salary Components loop. Fields: {category}, {name}, {monthly}, {annual}'
    }
];

const ReviseSalaryDetailsTab = () => {
    const { user: currentUser } = useAuth();
    const [subTab, setSubTab] = useState('single'); // 'single' | 'bulk' | 'templates' | 'logs'
    const [singleStep, setSingleStep] = useState('salary'); // 'salary' | 'parameters'
    const [payrollConfig, setPayrollConfig] = useState(null);
    const payrollConfigRef = useRef(null);
    const [loadingConfig, setLoadingConfig] = useState(true);

    useEffect(() => {
        payrollConfigRef.current = payrollConfig;
    }, [payrollConfig]);

    // Available letter templates
    const [availableTemplates, setAvailableTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('default');
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    // Template upload & management state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadTemplateName, setUploadTemplateName] = useState('');
    const [uploadTemplateFile, setUploadTemplateFile] = useState(null);
    const [uploadingTemplate, setUploadingTemplate] = useState(false);
    const [downloadingSample, setDownloadingSample] = useState(false);
    const [downloadingTemplateId, setDownloadingTemplateId] = useState(null);
    const [previewDownloading, setPreviewDownloading] = useState(false);
    const [showQuickTags, setShowQuickTags] = useState(false);

    // Active employees list
    const [employees, setEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');

    // Single revision state
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedEmployeeProfile, setSelectedEmployeeProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [salaryDraft, setSalaryDraft] = useState(DEFAULT_SALARY_DRAFT);
    const [singleEffectiveDate, setSingleEffectiveDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [singleReason, setSingleReason] = useState(REASON_TEMPLATES[0]);
    const [singleCustomReason, setSingleCustomReason] = useState('');
    const [singleBackdatedConfirmed, setSingleBackdatedConfirmed] = useState(false);
    const [submittingSingle, setSubmittingSingle] = useState(false);
    const [employeeRevisions, setEmployeeRevisions] = useState([]);
    const [loadingRevisions, setLoadingRevisions] = useState(false);

    // Single letter dispatch options
    const [singleGenerateLetter, setSingleGenerateLetter] = useState(true);
    const [singleSendEmail, setSingleSendEmail] = useState(true);
    const [singleSaveToDossier, setSingleSaveToDossier] = useState(true);
    const [actionLoadingRevId, setActionLoadingRevId] = useState(null);

    // Bulk revision state
    const [selectedBulkEmployeeIds, setSelectedBulkEmployeeIds] = useState([]);
    const [bulkRevisionType, setBulkRevisionType] = useState('percentage'); // 'percentage' | 'flat'
    const [bulkHikeValue, setBulkHikeValue] = useState(10); // 10% or ₹50,000
    const [bulkEffectiveDate, setBulkEffectiveDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [bulkReason, setBulkReason] = useState('Company Compensation Restructuring');
    const [bulkCustomReason, setBulkCustomReason] = useState('');
    const [bulkBackdatedConfirmed, setBulkBackdatedConfirmed] = useState(false);
    const [submittingBulk, setSubmittingBulk] = useState(false);
    const [bulkResultSummary, setBulkResultSummary] = useState(null);
    const [bulkGenerateLetters, setBulkGenerateLetters] = useState(true);

    // Revision logs state
    const [companyRevisions, setCompanyRevisions] = useState([]);
    const [loadingCompanyRevisions, setLoadingCompanyRevisions] = useState(false);
    const [logStatusFilter, setLogStatusFilter] = useState('all');

    // 1. Fetch Letter Templates
    const fetchTemplates = useCallback(async () => {
        try {
            setLoadingTemplates(true);
            const res = await api.get('/employees/revisions/templates');
            const list = res.data?.templates || [];
            setAvailableTemplates(list);
            if (list.length > 0 && !selectedTemplateId) {
                setSelectedTemplateId(list[0]._id);
            }
        } catch (err) {
            console.error('Failed to load letter templates:', err);
        } finally {
            setLoadingTemplates(false);
        }
    }, [selectedTemplateId]);

    // 2. Fetch Payroll Config & Initial Templates
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoadingConfig(true);
                const [configRes, templatesRes] = await Promise.allSettled([
                    api.get('/payroll/config'),
                    api.get('/employees/revisions/templates')
                ]);

                if (configRes.status === 'fulfilled') {
                    payrollConfigRef.current = configRes.value.data;
                    setPayrollConfig(configRes.value.data);
                }
                if (templatesRes.status === 'fulfilled') {
                    const list = templatesRes.value.data?.templates || [];
                    setAvailableTemplates(list);
                    if (list.length > 0) {
                        setSelectedTemplateId(list[0]._id);
                    }
                }
            } catch (err) {
                console.error('Failed to load initial payroll data:', err);
            } finally {
                setLoadingConfig(false);
            }
        };
        fetchInitialData();
    }, []);

    // 3. Fetch Active Employees
    const fetchEmployees = useCallback(async () => {
        try {
            setLoadingEmployees(true);
            const res = await api.get('/hr-email/employees', {
                params: { page: 1, limit: 100 }
            });
            const list = Array.isArray(res.data) ? res.data : (res.data?.employees || []);
            setEmployees(list);
        } catch (err) {
            console.error('Failed to fetch active employees:', err);
            toast.error('Failed to load employee list');
        } finally {
            setLoadingEmployees(false);
        }
    }, []);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    // 4. Fetch Company Revisions
    const fetchCompanyRevisions = useCallback(async () => {
        try {
            setLoadingCompanyRevisions(true);
            const res = await api.get('/employees/revisions/company', {
                params: { page: 1, limit: 50, status: logStatusFilter !== 'all' ? logStatusFilter : undefined }
            });
            setCompanyRevisions(res.data?.revisions || []);
        } catch (err) {
            console.error('Failed to load company revisions:', err);
        } finally {
            setLoadingCompanyRevisions(false);
        }
    }, [logStatusFilter]);

    useEffect(() => {
        if (subTab === 'logs') {
            fetchCompanyRevisions();
        }
    }, [subTab, fetchCompanyRevisions]);

    // Salary Calculator Helper
    const calculateSalaryBreakdown = useCallback((updatedSalaryFields, configOverride) => {
        const activeConfig = configOverride || payrollConfigRef.current || payrollConfig;
        setSalaryDraft(prev => {
            const mergedSalary = { ...prev, ...updatedSalaryFields };
            const payType = mergedSalary.payType || 'salaried';

            let annualCTC = parseFloat(String(mergedSalary.annualCTC || '').replace(/[^0-9.]/g, '')) || 0;
            let monthlyCTC = parseFloat(String(mergedSalary.monthlyCTC || '').replace(/[^0-9.]/g, '')) || 0;

            if (updatedSalaryFields && updatedSalaryFields.monthlyCTC !== undefined && updatedSalaryFields.annualCTC === undefined) {
                annualCTC = monthlyCTC * 12;
            } else if (updatedSalaryFields && updatedSalaryFields.annualCTC !== undefined && updatedSalaryFields.monthlyCTC === undefined) {
                monthlyCTC = annualCTC ? Math.round(annualCTC / 12) : 0;
            }

            let basicVal = '0';
            let grossVal = '0';

            const source = {
                ...mergedSalary,
                annualCTC,
                monthlyCTC,
                compensationType: mergedSalary.compensationType || 'monthly_salary',
                useSalaryComponents: payType !== 'flat' && payType !== 'hourly' && parseBool(mergedSalary.useSalaryComponents, true),
                pfEnabled: parseBool(mergedSalary.pfEnabled, true),
                esiEnabled: parseBool(mergedSalary.esiEnabled, true),
                ptEnabled: parseBool(mergedSalary.ptEnabled, true),
                lwfEnabled: parseBool(mergedSalary.lwfEnabled, true),
                gratuityEnabled: parseBool(mergedSalary.gratuityEnabled, true),
                tdsEnabled: parseBool(mergedSalary.tdsEnabled, true),
                includePfInCTC: parseBool(mergedSalary.includePfInCTC, false),
                includeGratuityInCTC: parseBool(mergedSalary.includeGratuityInCTC, true),
                basicPercent: mergedSalary.basicPercent !== undefined && mergedSalary.basicPercent !== null ? Number(mergedSalary.basicPercent) : 50,
                hraPercent: mergedSalary.hraPercent !== undefined && mergedSalary.hraPercent !== null ? Number(mergedSalary.hraPercent) : 50,
                vpfPercent: mergedSalary.vpfPercent !== undefined && mergedSalary.vpfPercent !== null ? Number(mergedSalary.vpfPercent) : 0,
                insuranceAmount: parseFloat(mergedSalary.insuranceAmount) || 0,
                employerNPS: parseFloat(mergedSalary.employerNPS) || 0,
                ptState: mergedSalary.ptState || 'MH',
                customAllowances: mergedSalary.customAllowances || [],
                customDeductions: mergedSalary.customDeductions || [],
                rateCard: mergedSalary.rateCard || []
            };

            if (activeConfig?.salaryComponents) {
                activeConfig.salaryComponents.forEach(c => {
                    if (c.linkedTo === 'fixed') {
                        const val = mergedSalary[c.id] !== undefined ? mergedSalary[c.id] : (c.linkValue || 0);
                        source[c.id] = parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
                    }
                });
            }

            const master = buildMasterSalaryStructure(source, activeConfig, annualCTC, monthlyCTC);
            if (master) {
                basicVal = String(master.basicMaster || 0);
                grossVal = String(master.totalEarnings || 0);
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

                if (master.earningsMap) {
                    Object.entries(master.earningsMap).forEach(([id, val]) => {
                        mergedSalary[id] = String(val);
                    });
                }
            }

            return {
                ...mergedSalary,
                annualCTC: String(annualCTC),
                monthlyCTC: String(monthlyCTC),
                basic: basicVal,
                monthlyGross: grossVal
            };
        });
    }, [payrollConfig]);

    // Fetch single employee dossier & revision history
    const fetchEmployeeDossier = useCallback(async (userId) => {
        if (!userId) {
            setSelectedEmployeeProfile(null);
            setEmployeeRevisions([]);
            return;
        }

        try {
            setLoadingProfile(true);
            setLoadingRevisions(true);

            let activeConfig = payrollConfigRef.current;
            if (!activeConfig) {
                try {
                    const cfgRes = await api.get('/payroll/config');
                    if (cfgRes?.data) {
                        activeConfig = cfgRes.data;
                        payrollConfigRef.current = activeConfig;
                        setPayrollConfig(activeConfig);
                    }
                } catch (cfgErr) {
                    console.error('Failed to pre-fetch payroll config in dossier load:', cfgErr);
                }
            }

            const [profileRes, revisionsRes] = await Promise.allSettled([
                api.get(`/dossier/${userId}`),
                api.get(`/employees/${userId}/revisions`)
            ]);

            let profileData = null;
            if (profileRes.status === 'fulfilled') {
                profileData = profileRes.value.data;
                setSelectedEmployeeProfile(profileData);
            }

            if (revisionsRes.status === 'fulfilled') {
                setEmployeeRevisions(revisionsRes.value.data?.revisions || []);
            }

            const comp = profileData?.compensation || profileData?.employeeProfile?.compensation || {};
            const breakup = comp.salaryBreakup || {};

            const annualCTC = comp.ctc ? String(comp.ctc * 12) : (breakup.annualCTC ? String(breakup.annualCTC) : '600000');
            const monthlyCTC = comp.ctc ? String(comp.ctc) : (breakup.monthlyCTC ? String(breakup.monthlyCTC) : String(Math.round(Number(annualCTC) / 12)));

            const initialDraft = {
                ...DEFAULT_SALARY_DRAFT,
                ...breakup,
                compensationType: comp.compensationType || breakup.compensationType || 'monthly_salary',
                attendanceMode: comp.attendanceMode || breakup.attendanceMode || 'attendance',
                payType: comp.payType || breakup.payType || 'salaried',
                annualCTC: String(annualCTC),
                monthlyCTC: String(monthlyCTC),
                basic: String(breakup.basic || Math.round(Number(monthlyCTC) * 0.5)),
                hra: String(breakup.hra || Math.round(Number(monthlyCTC) * 0.25)),
                specialAllowance: String(breakup.specialAllowance || Math.max(0, Number(monthlyCTC) - Math.round(Number(monthlyCTC) * 0.75))),
                monthlyGross: String(breakup.monthlyGross || monthlyCTC),
                basicPercent: breakup.basicPercent !== undefined ? breakup.basicPercent : 50,
                hraPercent: breakup.hraPercent !== undefined ? breakup.hraPercent : 50,
                pfEnabled: breakup.pfEnabled !== undefined ? parseBool(breakup.pfEnabled) : true,
                esiEnabled: breakup.esiEnabled !== undefined ? parseBool(breakup.esiEnabled) : true,
                ptEnabled: breakup.ptEnabled !== undefined ? parseBool(breakup.ptEnabled) : true,
                lwfEnabled: breakup.lwfEnabled !== undefined ? parseBool(breakup.lwfEnabled) : true,
                gratuityEnabled: breakup.gratuityEnabled !== undefined ? parseBool(breakup.gratuityEnabled) : true,
                tdsEnabled: breakup.tdsEnabled !== undefined ? parseBool(breakup.tdsEnabled) : true,
                includePfInCTC: parseBool(breakup.includePfInCTC),
                includeGratuityInCTC: breakup.includeGratuityInCTC !== undefined ? parseBool(breakup.includeGratuityInCTC) : true,
                ptState: breakup.ptState || 'MH',
                customAllowances: Array.isArray(breakup.customAllowances) ? breakup.customAllowances : [],
                customDeductions: Array.isArray(breakup.customDeductions) ? breakup.customDeductions : []
            };

            setSalaryDraft(initialDraft);
            calculateSalaryBreakdown(initialDraft, activeConfig);

            // Default to Step 1 (Salary) when employee loads
            setSingleStep('salary');
        } catch (err) {
            console.error('Error fetching employee dossier for revision:', err);
            toast.error('Failed to load employee dossier');
        } finally {
            setLoadingProfile(false);
            setLoadingRevisions(false);
        }
    }, [calculateSalaryBreakdown]);

    const handleSelectEmployee = (userId) => {
        setSelectedUserId(userId);
        fetchEmployeeDossier(userId);
    };

    // Re-run breakdown calculation whenever payrollConfig resolves or changes
    useEffect(() => {
        if (payrollConfig && selectedUserId) {
            calculateSalaryBreakdown({});
        }
    }, [payrollConfig, selectedUserId, calculateSalaryBreakdown]);

    // Unique departments
    const departments = useMemo(() => {
        const set = new Set();
        employees.forEach(e => {
            if (e.department) set.add(e.department);
        });
        return Array.from(set);
    }, [employees]);

    // Filtered employees
    const filteredEmployees = useMemo(() => {
        return employees.filter(e => {
            const matchesDept = selectedDeptFilter === 'ALL' || e.department === selectedDeptFilter;
            const q = employeeSearch.toLowerCase().trim();
            const matchesSearch = !q ||
                `${e.firstName} ${e.lastName || ''}`.toLowerCase().includes(q) ||
                (e.email || '').toLowerCase().includes(q) ||
                (e.employeeCode || '').toLowerCase().includes(q);
            return matchesDept && matchesSearch;
        });
    }, [employees, selectedDeptFilter, employeeSearch]);

    // Single revision submission with optional letter generation & email
    const handleSingleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!selectedUserId) {
            toast.error('Please select an employee first');
            return;
        }

        const effectiveDateObj = new Date(singleEffectiveDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        effectiveDateObj.setHours(0, 0, 0, 0);
        const isBackdated = effectiveDateObj.getTime() < today.getTime();

        if (isBackdated && !singleBackdatedConfirmed) {
            toast.error('Please confirm retroactive backdated acknowledgment.');
            return;
        }

        const numAnnualCTC = parseFloat(String(salaryDraft.annualCTC || '0').replace(/[^0-9.]/g, '')) || 0;
        if (numAnnualCTC <= 0) {
            toast.error('Please enter a valid Annual CTC greater than zero.');
            return;
        }

        const resolvedReason = singleReason === 'Other' ? singleCustomReason.trim() : singleReason;
        if (!resolvedReason) {
            toast.error('Please provide a reason for this revision.');
            return;
        }

        try {
            setSubmittingSingle(true);

            const comp = selectedEmployeeProfile?.compensation || selectedEmployeeProfile?.employeeProfile?.compensation || {};
            const previousCTC = parseFloat(comp.ctc ? comp.ctc * 12 : (comp.salaryBreakup?.annualCTC || 0));

            const changes = [
                {
                    module: 'compensation',
                    field: 'annualCTC',
                    fieldLabel: 'Annual CTC',
                    previousValue: previousCTC,
                    revisedValue: numAnnualCTC,
                    previousDisplayValue: previousCTC ? `₹${previousCTC.toLocaleString('en-IN')}/yr` : 'Not Set',
                    revisedDisplayValue: `₹${numAnnualCTC.toLocaleString('en-IN')}/yr`
                }
            ];

            const payload = {
                effectiveDate: singleEffectiveDate,
                reason: resolvedReason,
                changes,
                confirmBackdated: singleBackdatedConfirmed,
                metadata: {
                    salaryBreakup: { ...salaryDraft }
                }
            };

            const res = await api.post(`/employees/${selectedUserId}/revisions`, payload);
            const savedRevision = res.data?.revision;
            toast.success(res.data?.message || 'Salary revision recorded successfully');

            // If user checked "Generate & Dispatch Revised Offer Letter"
            if (singleGenerateLetter && savedRevision?._id) {
                try {
                    const letterRes = await api.post(`/employees/${selectedUserId}/revisions/${savedRevision._id}/letter`, {
                        templateId: selectedTemplateId,
                        sendEmail: singleSendEmail,
                        saveToDossier: singleSaveToDossier
                    });
                    toast.success(letterRes.data?.message || 'Revised offer letter generated successfully!');
                } catch (letterErr) {
                    console.error('Letter generation error:', letterErr);
                    const serverMsg = letterErr.response?.data?.message;
                    toast.error(serverMsg ? `Revision saved, but letter notice: ${serverMsg}` : 'Revision saved, but failed to generate/email offer letter');
                }
            }

            await fetchEmployeeDossier(selectedUserId);
        } catch (err) {
            console.error('Error recording revision:', err);
            toast.error(err.response?.data?.message || 'Failed to submit salary revision');
        } finally {
            setSubmittingSingle(false);
        }
    };

    // Download preview letter for selected employee with current draft
    const handleDownloadPreviewLetter = async () => {
        if (!selectedUserId) {
            toast.error('Select an employee to download preview letter');
            return;
        }
        try {
            setPreviewDownloading(true);
            const response = await api.get(`/employees/${selectedUserId}/revisions/latest/letter/download`, {
                params: { templateId: selectedTemplateId },
                responseType: 'blob'
            });

            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Preview_Offer_Letter_${selectedEmployeeProfile?.user?.firstName || 'Employee'}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Preview offer letter downloaded');
        } catch (err) {
            console.error('Preview download error:', err);
            toast.error('Failed to generate preview letter. Ensure employee has compensation data.');
        } finally {
            setPreviewDownloading(false);
        }
    };

    // Download revision letter
    const handleDownloadLetter = async (revId) => {
        if (!selectedUserId || !revId) return;
        try {
            setActionLoadingRevId(revId);
            const response = await api.get(`/employees/${selectedUserId}/revisions/${revId}/letter/download`, {
                params: { templateId: selectedTemplateId },
                responseType: 'blob'
            });

            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Revised_Offer_Letter_${selectedEmployeeProfile?.user?.firstName || 'Employee'}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Offer letter downloaded');
        } catch (err) {
            console.error('Download error:', err);
            toast.error('Failed to download offer letter');
        } finally {
            setActionLoadingRevId(null);
        }
    };

    // Resend revision letter via email
    const handleResendLetter = async (revId) => {
        if (!selectedUserId || !revId) return;
        try {
            setActionLoadingRevId(revId);
            const res = await api.post(`/employees/${selectedUserId}/revisions/${revId}/letter`, {
                templateId: selectedTemplateId,
                sendEmail: true,
                saveToDossier: true
            });
            toast.success(res.data?.message || 'Offer letter emailed successfully');
            await fetchEmployeeDossier(selectedUserId);
        } catch (err) {
            console.error('Resend error:', err);
            toast.error(err.response?.data?.message || 'Failed to send offer letter email');
        } finally {
            setActionLoadingRevId(null);
        }
    };

    // Bulk selection helpers
    const handleToggleSelectAllBulk = () => {
        if (selectedBulkEmployeeIds.length === filteredEmployees.length) {
            setSelectedBulkEmployeeIds([]);
        } else {
            setSelectedBulkEmployeeIds(filteredEmployees.map(e => e._id));
        }
    };

    const handleToggleSelectBulkOne = (id) => {
        setSelectedBulkEmployeeIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Bulk submit
    const handleBulkSubmit = async (e) => {
        e.preventDefault();
        if (selectedBulkEmployeeIds.length === 0) {
            toast.error('Select at least one employee for bulk revision');
            return;
        }

        const effectiveDateObj = new Date(bulkEffectiveDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        effectiveDateObj.setHours(0, 0, 0, 0);
        const isBackdated = effectiveDateObj.getTime() < today.getTime();

        if (isBackdated && !bulkBackdatedConfirmed) {
            toast.error('Please confirm retroactive backdated acknowledgment for bulk revision.');
            return;
        }

        const resolvedReason = bulkReason === 'Other' ? bulkCustomReason.trim() : bulkReason;
        if (!resolvedReason) {
            toast.error('Please provide a reason for the bulk revision.');
            return;
        }

        try {
            setSubmittingBulk(true);
            setBulkResultSummary(null);

            const payload = {
                employeeIds: selectedBulkEmployeeIds,
                effectiveDate: bulkEffectiveDate,
                reason: resolvedReason,
                revisionType: bulkRevisionType,
                hikePercentage: bulkRevisionType === 'percentage' ? Number(bulkHikeValue) : 0,
                flatAmount: bulkRevisionType === 'flat' ? Number(bulkHikeValue) : 0,
                confirmBackdated: bulkBackdatedConfirmed,
                generateLetters: bulkGenerateLetters,
                templateId: selectedTemplateId,
                sendEmail: true,
                saveToDossier: true
            };

            const res = await api.post('/employees/revisions/bulk', payload);
            toast.success(res.data?.message || 'Bulk revision processed successfully');
            setBulkResultSummary(res.data);
            setSelectedBulkEmployeeIds([]);
            await fetchEmployees();
        } catch (err) {
            console.error('Error during bulk revision:', err);
            toast.error(err.response?.data?.message || 'Failed to process bulk revisions');
        } finally {
            setSubmittingBulk(false);
        }
    };

    // Template Management Handlers
    const handleUploadTemplate = async (e) => {
        e.preventDefault();
        if (!uploadTemplateFile) {
            toast.error('Please select a .docx file to upload');
            return;
        }
        try {
            setUploadingTemplate(true);
            const formData = new FormData();
            formData.append('document', uploadTemplateFile);
            formData.append('name', uploadTemplateName || uploadTemplateFile.name.replace(/\.docx$/i, ''));

            const res = await api.post('/employees/revisions/templates/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(res.data?.message || 'Template uploaded successfully!');
            setShowUploadModal(false);
            setUploadTemplateName('');
            setUploadTemplateFile(null);
            await fetchTemplates();
        } catch (err) {
            console.error('Failed to upload template:', err);
            toast.error(err.response?.data?.message || 'Failed to upload template');
        } finally {
            setUploadingTemplate(false);
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        if (!window.confirm('Are you sure you want to delete this custom template?')) return;
        try {
            await api.delete(`/employees/revisions/templates/${templateId}`);
            toast.success('Template removed successfully');
            await fetchTemplates();
        } catch (err) {
            console.error('Failed to delete template:', err);
            toast.error(err.response?.data?.message || 'Failed to delete template');
        }
    };

    const handleDownloadSampleTemplate = async () => {
        try {
            setDownloadingSample(true);
            const res = await api.get('/employees/revisions/templates/sample', {
                responseType: 'blob'
            });
            const blob = new Blob([res.data], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Sample_Revision_Offer_Letter_Template.docx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Sample template downloaded with all salary & employee tags');
        } catch (err) {
            console.error('Failed to download sample template:', err);
            toast.error('Failed to download sample template');
        } finally {
            setDownloadingSample(false);
        }
    };

    const handleDownloadCustomTemplate = async (template) => {
        try {
            setDownloadingTemplateId(template._id);
            const res = await api.get(`/employees/revisions/templates/${template._id}/download`, {
                responseType: 'blob'
            });
            const blob = new Blob([res.data], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${template.name || 'Template'}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Failed to download template file:', err);
            toast.error('Failed to download template file');
        } finally {
            setDownloadingTemplateId(null);
        }
    };

    const handleCopyTag = (tag) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(tag);
            toast.success(`Copied ${tag} to clipboard!`);
        }
    };

    const isSingleBackdated = useMemo(() => {
        if (!singleEffectiveDate) return false;
        const d = new Date(singleEffectiveDate);
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);
        return d.getTime() < t.getTime();
    }, [singleEffectiveDate]);

    const isBulkBackdated = useMemo(() => {
        if (!bulkEffectiveDate) return false;
        const d = new Date(bulkEffectiveDate);
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);
        return d.getTime() < t.getTime();
    }, [bulkEffectiveDate]);

    const currentSelectedEmpObj = employees.find(e => String(e._id) === String(selectedUserId));

    return (
        <div className="space-y-6">
            {/* Top Toolbar: Sub-tabs & Template Selector */}
            <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xs flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setSubTab('single')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            subTab === 'single'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        <User size={15} />
                        <span>Individual Revision</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSubTab('bulk')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            subTab === 'bulk'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        <Users size={15} />
                        <span>Bulk Restructure & Letters</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSubTab('templates')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            subTab === 'templates'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        <FileSignature size={15} />
                        <span>Template Settings</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-extrabold">
                            Tags & .docx
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSubTab('logs')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            subTab === 'logs'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        <History size={15} />
                        <span>Revision Logs & Timeline</span>
                    </button>
                </div>

                {/* Template Selector dropdown (quick selector for single / bulk) */}
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl">
                    <FileText size={14} className="text-blue-600 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Active Template:</span>
                    <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer max-w-xs truncate"
                    >
                        {availableTemplates.map(t => (
                            <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ============================================================== */}
            {/* SUB-TAB 1: INDIVIDUAL REVISION WORKFLOW                        */}
            {/* ============================================================== */}
            {subTab === 'single' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left: Employee Selection Sidebar */}
                    <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <Search size={16} className="text-blue-600" />
                                <span>Select Employee</span>
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Pick an active employee to restructure compensation & generate letter
                            </p>
                        </div>

                        {/* Search & Dept Filter */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search name, code, email..."
                                    value={employeeSearch}
                                    onChange={(e) => setEmployeeSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {departments.length > 0 && (
                                <select
                                    value={selectedDeptFilter}
                                    onChange={(e) => setSelectedDeptFilter(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
                                >
                                    <option value="ALL">All Departments ({employees.length})</option>
                                    {departments.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Employee List */}
                        <div className="max-h-[520px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                            {loadingEmployees ? (
                                <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                    <RefreshCw className="animate-spin" size={14} />
                                    Loading employees...
                                </div>
                            ) : filteredEmployees.length === 0 ? (
                                <div className="p-6 text-center text-xs text-slate-400">
                                    No active employees found.
                                </div>
                            ) : (
                                filteredEmployees.map(emp => {
                                    const isSelected = String(emp._id) === String(selectedUserId);
                                    return (
                                        <div
                                            key={emp._id}
                                            onClick={() => handleSelectEmployee(emp._id)}
                                            className={`p-3 rounded-xl cursor-pointer transition-all ${
                                                isSelected
                                                    ? 'bg-blue-50 border border-blue-200 text-blue-900 shadow-2xs'
                                                    : 'hover:bg-slate-50 border border-transparent text-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold truncate">
                                                    {emp.firstName} {emp.lastName || ''}
                                                </span>
                                                {emp.employeeCode && (
                                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                        {emp.employeeCode}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                                {emp.designation || emp.department || 'Active Staff'}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right: Employee Workspace */}
                    <div className="lg:col-span-3 space-y-5">
                        {!selectedUserId ? (
                            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                                    <User size={28} />
                                </div>
                                <h3 className="text-base font-bold text-slate-800">No Employee Selected</h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                    Select an employee from the list to restructure compensation, generate official offer letters, or email amendments.
                                </p>
                            </div>
                        ) : loadingProfile ? (
                            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                                <RefreshCw className="animate-spin text-blue-600" size={18} />
                                Loading employee dossier & salary profile...
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {/* Employee Summary Header */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-sm">
                                            {currentSelectedEmpObj?.firstName?.[0] || 'E'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base font-black text-slate-900">
                                                    {currentSelectedEmpObj?.firstName} {currentSelectedEmpObj?.lastName || ''}
                                                </h3>
                                                {currentSelectedEmpObj?.employeeCode && (
                                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-600">
                                                        {currentSelectedEmpObj.employeeCode}
                                                    </span>
                                                )}
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    Active
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 flex items-center gap-3 mt-1 flex-wrap">
                                                {currentSelectedEmpObj?.department && (
                                                    <span className="flex items-center gap-1">
                                                        <Building size={12} className="text-slate-400" />
                                                        {currentSelectedEmpObj.department}
                                                    </span>
                                                )}
                                                {currentSelectedEmpObj?.designation && (
                                                    <span className="flex items-center gap-1">
                                                        <Briefcase size={12} className="text-slate-400" />
                                                        {currentSelectedEmpObj.designation}
                                                    </span>
                                                )}
                                                {currentSelectedEmpObj?.email && (
                                                    <span className="flex items-center gap-1">
                                                        <Mail size={12} className="text-slate-400" />
                                                        {currentSelectedEmpObj.email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current CTC</div>
                                        <div className="text-lg font-black text-slate-800">
                                            {(() => {
                                                const comp = selectedEmployeeProfile?.compensation || selectedEmployeeProfile?.employeeProfile?.compensation || {};
                                                const ctc = comp.ctc ? comp.ctc * 12 : (comp.salaryBreakup?.annualCTC || 0);
                                                return ctc ? `₹${Number(ctc).toLocaleString('en-IN')}/yr` : 'Not Set';
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Step / Internal Tab Switcher */}
                                <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setSingleStep('salary')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            singleStep === 'salary'
                                                ? 'bg-white text-blue-600 shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <DollarSign size={15} />
                                        <span>1. Salary & Compensation Structure</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSingleStep('parameters')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            singleStep === 'parameters'
                                                ? 'bg-white text-blue-600 shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <Calendar size={15} />
                                        <span>2. Revision Parameters & Letter Dispatch</span>
                                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 font-extrabold border border-blue-200">
                                            Offer Letter
                                        </span>
                                    </button>
                                </div>

                                {/* STEP 1: Salary & Compensation Form */}
                                {singleStep === 'salary' && (
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                    <DollarSign size={16} className="text-blue-600" />
                                                    <span>Restructure Salary Components & CTC</span>
                                                </h3>
                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                    Adjust Annual CTC, allowances, PF/ESI parameters, and deductions.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSingleStep('parameters')}
                                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                            >
                                                <span>Go to Parameters & Dispatch</span>
                                                <ArrowRight size={13} />
                                            </button>
                                        </div>

                                        <CompensationFormSection
                                            formData={{ salary: salaryDraft }}
                                            calculateSalaryBreakdown={calculateSalaryBreakdown}
                                            payrollConfig={payrollConfig}
                                        />

                                        {/* Bottom Action Strip in Salary Step */}
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between flex-wrap gap-4">
                                            <div className="flex items-center gap-4 text-xs">
                                                <div>
                                                    <span className="text-slate-400 font-medium block text-[10px] uppercase">Annual CTC</span>
                                                    <span className="font-extrabold text-slate-800">₹{Number(salaryDraft.annualCTC || 0).toLocaleString('en-IN')}</span>
                                                </div>
                                                <div className="h-6 w-px bg-slate-200" />
                                                <div>
                                                    <span className="text-slate-400 font-medium block text-[10px] uppercase">Monthly Gross</span>
                                                    <span className="font-extrabold text-slate-800">₹{Number(salaryDraft.monthlyGross || 0).toLocaleString('en-IN')}</span>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSingleStep('parameters');
                                                    window.scrollTo({ top: 100, behavior: 'smooth' });
                                                }}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                                            >
                                                <span>Proceed to Revision Parameters & Letter Dispatch</span>
                                                <ArrowRight size={15} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 2: Parameters & Letter Dispatch */}
                                {singleStep === 'parameters' && (
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                    <Calendar size={16} className="text-blue-600" />
                                                    <span>Revision Effective Parameters & Offer Letter Dispatch</span>
                                                </h3>
                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                    Set effective date, revision rationale, template selection, and automatic employee email dispatch.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSingleStep('salary')}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                            >
                                                <ArrowLeft size={13} />
                                                <span>Back to Salary Breakdown</span>
                                            </button>
                                        </div>

                                        {/* Parameters Card */}
                                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                                        Effective Date *
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={singleEffectiveDate}
                                                        onChange={(e) => setSingleEffectiveDate(e.target.value)}
                                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                        required
                                                    />
                                                    <span className="text-[10px] text-slate-500 mt-1 block">
                                                        {isSingleBackdated ? '⚠️ Backdated (will apply retroactively)' : 'Will be scheduled or applied immediately'}
                                                    </span>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                                        Reason for Revision *
                                                    </label>
                                                    <select
                                                        value={singleReason}
                                                        onChange={(e) => setSingleReason(e.target.value)}
                                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    >
                                                        {REASON_TEMPLATES.map(t => (
                                                            <option key={t} value={t}>{t}</option>
                                                        ))}
                                                        <option value="Other">Other (Custom Reason)</option>
                                                    </select>
                                                </div>

                                                {singleReason === 'Other' && (
                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                                            Custom Reason *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={singleCustomReason}
                                                            onChange={(e) => setSingleCustomReason(e.target.value)}
                                                            placeholder="Enter restructuring rationale (e.g. Mid-year performance hike, role realignment)"
                                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Offer Letter Automation Card */}
                                            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="text-blue-600" size={18} />
                                                        <div>
                                                            <span className="text-xs font-bold text-slate-900 block">
                                                                Auto-Generate Revised Offer Letter Document
                                                            </span>
                                                            <span className="text-[11px] text-slate-500">
                                                                Builds official Word DOCX containing restructured salary table and dynamic tags
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={singleGenerateLetter}
                                                            onChange={(e) => setSingleGenerateLetter(e.target.checked)}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>

                                                {singleGenerateLetter && (
                                                    <div className="pt-3 border-t border-slate-100 space-y-4">
                                                        {/* Template Picker */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                                                    <FileSignature size={14} className="text-indigo-600" />
                                                                    <span>Choose Revision / Offer Letter Template</span>
                                                                </label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSubTab('templates')}
                                                                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <span>Manage / Upload Templates</span>
                                                                    <ExternalLink size={11} />
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <select
                                                                    value={selectedTemplateId}
                                                                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                                                                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                                                                >
                                                                    {availableTemplates.map(t => (
                                                                        <option key={t._id} value={t._id}>{t.name}</option>
                                                                    ))}
                                                                </select>

                                                                <button
                                                                    type="button"
                                                                    onClick={handleDownloadPreviewLetter}
                                                                    disabled={previewDownloading}
                                                                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                                                                    title="Generate and download a preview DOCX letter with this employee's current salary numbers"
                                                                >
                                                                    {previewDownloading ? (
                                                                        <RefreshCw size={13} className="animate-spin text-blue-600" />
                                                                    ) : (
                                                                        <Download size={13} className="text-blue-600" />
                                                                    )}
                                                                    <span>Download Preview DOCX</span>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Delivery Toggles */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs text-slate-700">
                                                            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={singleSendEmail}
                                                                    onChange={(e) => setSingleSendEmail(e.target.checked)}
                                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                                />
                                                                <div className="min-w-0">
                                                                    <span className="font-bold text-slate-800 block">Email official Revised Offer Letter directly</span>
                                                                    <span className="text-[10px] text-slate-500">Sends email with DOCX attachment to employee's company email</span>
                                                                </div>
                                                            </label>

                                                            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={singleSaveToDossier}
                                                                    onChange={(e) => setSingleSaveToDossier(e.target.checked)}
                                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                                />
                                                                <div className="min-w-0">
                                                                    <span className="font-bold text-slate-800 block">Archive in Employee Dossier</span>
                                                                    <span className="text-[10px] text-slate-500">Saves copy under "Offer Letter" in employee profile documents</span>
                                                                </div>
                                                            </label>
                                                        </div>

                                                        {/* Quick Word Tags Reference Toggle */}
                                                        <div className="pt-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowQuickTags(prev => !prev)}
                                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer"
                                                            >
                                                                <HelpCircle size={14} />
                                                                <span>{showQuickTags ? 'Hide Word Document Tags Reference' : 'View Word Document Tags Reference (Placeholders)'}</span>
                                                            </button>

                                                            {showQuickTags && (
                                                                <div className="mt-3 p-4 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-3">
                                                                    <div className="text-xs text-indigo-900 font-bold flex items-center justify-between">
                                                                        <span>Available Placeholders in Word Documents</span>
                                                                        <span className="text-[11px] font-normal text-indigo-700">Click any tag to copy</span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {[
                                                                            '{employee_full_name}',
                                                                            '{employee_code}',
                                                                            '{designation}',
                                                                            '{department}',
                                                                            '{effective_date}',
                                                                            '{annual_ctc}',
                                                                            '{monthly_ctc}',
                                                                            '{basic_salary}',
                                                                            '{hra}',
                                                                            '{net_take_home}',
                                                                            '{@salary_table}'
                                                                        ].map(tag => (
                                                                            <button
                                                                                key={tag}
                                                                                type="button"
                                                                                onClick={() => handleCopyTag(tag)}
                                                                                className="px-2 py-1 rounded-md text-[11px] font-mono font-bold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer"
                                                                                title="Click to copy tag"
                                                                            >
                                                                                {tag}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    <p className="text-[11px] text-indigo-700">
                                                                        Tag <code>{'{@salary_table}'}</code> will automatically build and insert the full salary table with Earnings, Deductions & Take-Home.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Backdated Warning */}
                                            {isSingleBackdated && (
                                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                                                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                                                    <div className="space-y-1.5 text-xs text-amber-900">
                                                        <p className="font-bold">Retroactive / Backdated Revision Notice</p>
                                                        <p className="text-[11px] text-amber-800">
                                                            The selected effective date ({singleEffectiveDate}) is in the past. This revision will apply retroactively to employee dossier and update payroll calculations.
                                                        </p>
                                                        <label className="flex items-center gap-2 pt-1 font-bold text-amber-950 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={singleBackdatedConfirmed}
                                                                onChange={(e) => setSingleBackdatedConfirmed(e.target.checked)}
                                                                className="rounded text-amber-600 focus:ring-amber-500"
                                                            />
                                                            <span>I acknowledge and confirm retroactive salary restructuring</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Bottom Action Bar */}
                                            <div className="flex items-center justify-between pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSingleStep('salary')}
                                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                                                >
                                                    <ArrowLeft size={14} />
                                                    <span>Back to Salary Breakdown</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={handleSingleSubmit}
                                                    disabled={submittingSingle || (isSingleBackdated && !singleBackdatedConfirmed)}
                                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                                                >
                                                    {submittingSingle ? (
                                                        <>
                                                            <RefreshCw className="animate-spin" size={14} />
                                                            <span>Recording & Dispatching Letter...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save size={14} />
                                                            <span>Save & Apply Salary Revision</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Revision History Table for Selected Employee */}
                                {employeeRevisions.length > 0 && (
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                            <History size={14} className="text-blue-600" />
                                            <span>Past Revision Logs for this Employee ({employeeRevisions.length})</span>
                                        </h4>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                                                    <tr>
                                                        <th className="py-2.5 px-3">Effective Date</th>
                                                        <th className="py-2.5 px-3">Reason</th>
                                                        <th className="py-2.5 px-3">Revision Details</th>
                                                        <th className="py-2.5 px-3">Status</th>
                                                        <th className="py-2.5 px-3 text-right">Letter Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {employeeRevisions.map(rev => (
                                                        <tr key={rev._id} className="hover:bg-slate-50/50">
                                                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                                                                {rev.effectiveDate ? format(new Date(rev.effectiveDate), 'dd MMM yyyy') : '—'}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-slate-600">
                                                                {rev.reason}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-slate-600">
                                                                {rev.changes?.map((ch, idx) => (
                                                                    <div key={idx} className="text-[11px]">
                                                                        <span className="font-semibold">{ch.fieldLabel || ch.field}:</span>{' '}
                                                                        <span className="text-slate-400 line-through">{ch.previousDisplayValue}</span>{' '}
                                                                        <span className="font-bold text-emerald-600">→ {ch.revisedDisplayValue}</span>
                                                                    </div>
                                                                )) || 'Compensation updated'}
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                    rev.status === 'applied'
                                                                        ? 'bg-emerald-50 text-emerald-700'
                                                                        : rev.status === 'scheduled'
                                                                        ? 'bg-blue-50 text-blue-700'
                                                                        : 'bg-slate-100 text-slate-600'
                                                                }`}>
                                                                    {rev.status || 'Applied'}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDownloadLetter(rev._id)}
                                                                        disabled={actionLoadingRevId === rev._id}
                                                                        className="p-1.5 rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                                                                        title="Download Revised Offer Letter (DOCX)"
                                                                    >
                                                                        <Download size={14} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleResendLetter(rev._id)}
                                                                        disabled={actionLoadingRevId === rev._id}
                                                                        className="p-1.5 rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                                                                        title="Email Offer Letter to Employee"
                                                                    >
                                                                        <Mail size={14} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* SUB-TAB 2: BULK RESTRUCTURE & LETTERS                          */}
            {/* ============================================================== */}
            {subTab === 'bulk' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <Users size={16} className="text-blue-600" />
                                    <span>Company-Wide / Bulk Compensation Revision & Letters</span>
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Apply percentage or flat hikes across multiple employees simultaneously and dispatch revised offer letters.
                                </p>
                            </div>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                                {selectedBulkEmployeeIds.length} of {filteredEmployees.length} Selected
                            </span>
                        </div>

                        {/* Bulk Hike Parameters */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Hike Calculation Type *
                                </label>
                                <select
                                    value={bulkRevisionType}
                                    onChange={(e) => setBulkRevisionType(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none"
                                >
                                    <option value="percentage">Percentage (%) Hike</option>
                                    <option value="flat">Flat Annual Amount (₹)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    {bulkRevisionType === 'percentage' ? 'Hike Percentage (%) *' : 'Flat Hike Amount (₹/yr) *'}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step={bulkRevisionType === 'percentage' ? '0.1' : '1000'}
                                    value={bulkHikeValue}
                                    onChange={(e) => setBulkHikeValue(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Effective Date *
                                </label>
                                <input
                                    type="date"
                                    value={bulkEffectiveDate}
                                    onChange={(e) => setBulkEffectiveDate(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Reason *
                                </label>
                                <select
                                    value={bulkReason}
                                    onChange={(e) => setBulkReason(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none"
                                >
                                    <option value="Company Compensation Restructuring">Company Compensation Restructuring</option>
                                    <option value="Annual Appraisal & Hike">Annual Appraisal & Hike</option>
                                    <option value="Market Correction">Market Correction</option>
                                    <option value="Other">Other (Custom)</option>
                                </select>
                            </div>

                            {bulkReason === 'Other' && (
                                <div className="md:col-span-4">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Custom Reason Description *
                                    </label>
                                    <input
                                        type="text"
                                        value={bulkCustomReason}
                                        onChange={(e) => setBulkCustomReason(e.target.value)}
                                        placeholder="Enter restructuring rationale"
                                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Bulk Letter Automation Toggle */}
                        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <FileText className="text-blue-600" size={20} />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 block">
                                        Automatically Generate & Email Restructured Offer Letters
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                        Builds individual DOCX with each employee's salary table, saves to dossier, and emails them directly.
                                    </span>
                                </div>
                            </div>

                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={bulkGenerateLetters}
                                    onChange={(e) => setBulkGenerateLetters(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {/* Employee Selection Table */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleToggleSelectAllBulk}
                                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                                    >
                                        {selectedBulkEmployeeIds.length === filteredEmployees.length ? 'Deselect All' : 'Select All Filtered'}
                                    </button>
                                </div>

                                <div className="text-xs text-slate-500">
                                    Showing {filteredEmployees.length} eligible employees
                                </div>
                            </div>

                            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                                        <tr>
                                            <th className="py-2.5 px-3 w-10 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={filteredEmployees.length > 0 && selectedBulkEmployeeIds.length === filteredEmployees.length}
                                                    onChange={handleToggleSelectAllBulk}
                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                />
                                            </th>
                                            <th className="py-2.5 px-3">Employee</th>
                                            <th className="py-2.5 px-3">Code</th>
                                            <th className="py-2.5 px-3">Department</th>
                                            <th className="py-2.5 px-3">Designation</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredEmployees.map(emp => {
                                            const isChecked = selectedBulkEmployeeIds.includes(emp._id);
                                            return (
                                                <tr
                                                    key={emp._id}
                                                    onClick={() => handleToggleSelectBulkOne(emp._id)}
                                                    className={`cursor-pointer transition-all ${isChecked ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'}`}
                                                >
                                                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => handleToggleSelectBulkOne(emp._id)}
                                                            className="rounded text-blue-600 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-3 font-bold text-slate-800">
                                                        {emp.firstName} {emp.lastName || ''}
                                                    </td>
                                                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                                                        {emp.employeeCode || '—'}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-600">
                                                        {emp.department || '—'}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-600">
                                                        {emp.designation || '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Backdated Notice for Bulk */}
                        {isBulkBackdated && (
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                                <div className="space-y-1 text-xs text-amber-900">
                                    <p className="font-bold">Bulk Retroactive / Backdated Revision Notice</p>
                                    <p className="text-[11px] text-amber-800">
                                        This bulk revision date ({bulkEffectiveDate}) is in the past. It will be retroactively synced across all {selectedBulkEmployeeIds.length} dossiers.
                                    </p>
                                    <label className="flex items-center gap-2 pt-1 font-bold text-amber-950 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={bulkBackdatedConfirmed}
                                            onChange={(e) => setBulkBackdatedConfirmed(e.target.checked)}
                                            className="rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        <span>I acknowledge and confirm retroactive bulk compensation revision</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={handleBulkSubmit}
                                disabled={submittingBulk || selectedBulkEmployeeIds.length === 0 || (isBulkBackdated && !bulkBackdatedConfirmed)}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                            >
                                {submittingBulk ? (
                                    <>
                                        <RefreshCw className="animate-spin" size={14} />
                                        <span>Processing Bulk Revisions & Letters...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={14} />
                                        <span>Execute Bulk Restructuring ({selectedBulkEmployeeIds.length} Selected)</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Summary Result Card */}
                        {bulkResultSummary && (
                            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                                    <CheckCircle size={16} />
                                    <span>Bulk Revision Execution Completed</span>
                                </div>
                                <div className="text-xs text-emerald-900">
                                    Total: {bulkResultSummary.total} | Successful: {bulkResultSummary.successCount} | Failed: {bulkResultSummary.failCount}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* SUB-TAB 3: TEMPLATE SETTINGS & PLACEHOLDERS REFERENCE          */}
            {/* ============================================================== */}
            {subTab === 'templates' && (
                <div className="space-y-6">
                    {/* Header Banner */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <FileSignature size={20} className="text-blue-600" />
                                <span>Revision & Restructured Offer Letter Templates</span>
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-xl">
                                Configure Word (.docx) templates, upload custom company letterheads, and use tags to automatically generate professional restructuring offer letters with salary breakups.
                            </p>
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap">
                            <button
                                type="button"
                                onClick={handleDownloadSampleTemplate}
                                disabled={downloadingSample}
                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                title="Download sample Word document pre-configured with tags"
                            >
                                {downloadingSample ? (
                                    <RefreshCw size={14} className="animate-spin text-blue-600" />
                                ) : (
                                    <Download size={14} className="text-blue-600" />
                                )}
                                <span>Download Pre-Tagged Sample (.docx)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowUploadModal(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                            >
                                <Upload size={14} />
                                <span>Upload Custom .docx Template</span>
                            </button>
                        </div>
                    </div>

                    {/* Section 1: Dynamic Document Templates List */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-blue-600" />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Available Word Templates ({availableTemplates.length})
                                </h4>
                            </div>
                            <span className="text-[11px] text-slate-500">
                                Used when generating offer & revision documents
                            </span>
                        </div>

                        <div className="divide-y divide-slate-100 p-2">
                            {availableTemplates.map(tpl => {
                                const isBuiltIn = tpl._id === 'default';
                                const isSelected = selectedTemplateId === tpl._id;

                                return (
                                    <div
                                        key={tpl._id}
                                        className={`p-4 rounded-xl flex items-center justify-between flex-wrap gap-3 transition-all ${
                                            isSelected ? 'bg-blue-50/40 border border-blue-200/60' : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                isBuiltIn ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
                                            }`}>
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-900">
                                                        {tpl.name}
                                                    </span>
                                                    {isBuiltIn && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                            System Default
                                                        </span>
                                                    )}
                                                    {isSelected && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                                            <Check size={10} /> Active Selected
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-500 mt-0.5">
                                                    {tpl.description || (isBuiltIn ? 'Standard compensation amendment format with Word salary table' : 'Custom uploaded company revision template')}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedTemplateId(tpl._id)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                                }`}
                                            >
                                                {isSelected ? 'Active' : 'Select'}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => isBuiltIn ? handleDownloadSampleTemplate() : handleDownloadCustomTemplate(tpl)}
                                                disabled={downloadingTemplateId === tpl._id}
                                                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-all cursor-pointer"
                                                title="Download Template DOCX"
                                            >
                                                {downloadingTemplateId === tpl._id ? (
                                                    <RefreshCw size={14} className="animate-spin text-blue-600" />
                                                ) : (
                                                    <Download size={14} />
                                                )}
                                            </button>

                                            {!isBuiltIn && tpl._id !== 'company_offer' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteTemplate(tpl._id)}
                                                    className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                                                    title="Delete Custom Template"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section 2: Available Placeholders Reference Guide (Exact reference from Onboarding) */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
                        <div>
                            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                <Sparkles size={16} className="text-amber-500" />
                                <span>Available Placeholders Reference Guide</span>
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">
                                Copy and paste these exact tags into your Word (.docx) document. When generating letters, TalentCIO dynamically replaces them with real employee details, compensation figures, and formatted salary tables.
                            </p>
                        </div>

                        {/* Category 1: Single Values */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Single Values (Employee & Compensation)
                                </h5>
                                <span className="text-[11px] text-slate-400">Click any card to copy tag</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                {BASE_PLACEHOLDERS.map(p => (
                                    <div
                                        key={p.tag}
                                        onClick={() => handleCopyTag(p.tag)}
                                        className="p-3 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                                        title="Click to copy"
                                    >
                                        <div className="min-w-0 pr-2">
                                            <div className="font-mono text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
                                                {p.tag}
                                            </div>
                                            <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                                {p.desc}
                                            </div>
                                        </div>
                                        <Copy size={13} className="text-slate-400 group-hover:text-blue-600 shrink-0" />
                                    </div>
                                ))}

                                {payrollConfig?.salaryComponents?.filter(c => !['basic', 'hra', 'special'].includes(c.id)).map(c => {
                                    const cleanId = c.id.replace(/([A-Z])/g, '_$1').toLowerCase();
                                    const tag = `{${cleanId}}`;
                                    return (
                                        <div
                                            key={tag}
                                            onClick={() => handleCopyTag(tag)}
                                            className="p-3 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                                            title="Click to copy"
                                        >
                                            <div className="min-w-0 pr-2">
                                                <div className="font-mono text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
                                                    {tag}
                                                </div>
                                                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                                    {c.name} (Monthly)
                                                </div>
                                            </div>
                                            <Copy size={13} className="text-slate-400 group-hover:text-blue-600 shrink-0" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Category 2: Auto-Generated Salary Table {@salary_table} Feature Card & Visual Sample */}
                        <div className="bg-gradient-to-b from-blue-50/70 via-indigo-50/40 to-white rounded-2xl border-2 border-blue-200/90 shadow-xs overflow-hidden space-y-4 p-5">
                            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-blue-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-mono font-black text-sm shadow-sm">
                                        @
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-black text-blue-900 bg-white px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-2xs">
                                                {'{@salary_table}'}
                                            </span>
                                            <span className="text-xs font-extrabold text-slate-800">
                                                Auto-Generated Complete Compensation Salary Breakup Table
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            Type <code>{'{@salary_table}'}</code> anywhere in your Word (.docx) document to automatically inject the complete official salary annexure table.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleCopyTag('{@salary_table}')}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                        title="Copy {@salary_table} tag"
                                    >
                                        <Copy size={13} />
                                        <span>Copy {'{@salary_table}'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDownloadSampleTemplate}
                                        disabled={downloadingSample}
                                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                        title="Download ready-to-use sample Word template"
                                    >
                                        <Download size={13} className="text-blue-600" />
                                        <span>Download Sample .docx</span>
                                    </button>
                                </div>
                            </div>

                            {/* Table Architecture & Live Mockup */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                        <Layers size={14} className="text-blue-600" />
                                        <span>What Word Renders at {'{@salary_table}'} (Full Annexure Structure):</span>
                                    </span>
                                    <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        ✓ Formed with Live Payroll Math & Config
                                    </span>
                                </div>

                                <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100/90 text-slate-800 font-extrabold border-b border-slate-300 text-[11px]">
                                                <th className="py-2 px-3 border-r border-slate-300 w-1/2">Salary Component</th>
                                                <th className="py-2 px-3 border-r border-slate-300 text-right w-1/4">Monthly (₹)</th>
                                                <th className="py-2 px-3 text-right w-1/4">Annual (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 text-[11px]">
                                            {/* Part A: Earnings */}
                                            <tr className="bg-slate-50/80 font-bold text-slate-700">
                                                <td colSpan={3} className="py-1.5 px-3 uppercase tracking-wider text-[10px] text-blue-900 bg-blue-50/40">
                                                    A. EARNINGS & ALLOWANCES
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">Basic Salary</td>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-800 font-mono">25,000</td>
                                                <td className="py-1.5 px-3 text-right text-slate-800 font-mono">3,00,000</td>
                                            </tr>
                                            <tr>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">House Rent Allowance (HRA)</td>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-800 font-mono">12,500</td>
                                                <td className="py-1.5 px-3 text-right text-slate-800 font-mono">1,50,000</td>
                                            </tr>
                                            <tr>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">Special Allowance / Other Allowances</td>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-800 font-mono">12,500</td>
                                                <td className="py-1.5 px-3 text-right text-slate-800 font-mono">1,50,000</td>
                                            </tr>
                                            <tr className="bg-slate-50 font-extrabold text-slate-900 border-t border-slate-300">
                                                <td className="py-1.5 px-3 border-r border-slate-200">Total Gross Earnings (A)</td>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono text-blue-900">50,000</td>
                                                <td className="py-1.5 px-3 text-right font-mono text-blue-900">6,00,000</td>
                                            </tr>

                                            {/* Part B: Employer Contributions */}
                                            <tr className="bg-slate-50/80 font-bold text-slate-700">
                                                <td colSpan={3} className="py-1.5 px-3 uppercase tracking-wider text-[10px] text-indigo-900 bg-indigo-50/40">
                                                    B. EMPLOYER CONTRIBUTIONS & STATUTORY BENEFITS
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">PF Employer Contribution (12% of Basic)</td>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-800 font-mono">1,800</td>
                                                <td className="py-1.5 px-3 text-right text-slate-800 font-mono">21,600</td>
                                            </tr>
                                            <tr>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">ESI Employer Contribution (3.25% if applicable)</td>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-400 font-mono">0</td>
                                                <td className="py-1.5 px-3 text-right text-slate-400 font-mono">0</td>
                                            </tr>
                                            <tr>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">Gratuity Provision (4.81% of Basic)</td>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-800 font-mono">1,202</td>
                                                <td className="py-1.5 px-3 text-right text-slate-800 font-mono">14,430</td>
                                            </tr>
                                            <tr>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">LWF Employer Share</td>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-800 font-mono">20</td>
                                                <td className="py-1.5 px-3 text-right text-slate-800 font-mono">240</td>
                                            </tr>
                                            <tr className="bg-slate-50 font-extrabold text-slate-900 border-t border-slate-300">
                                                <td className="py-1.5 px-3 border-r border-slate-200">Total Employer Contributions (B)</td>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono text-indigo-900">3,022</td>
                                                <td className="py-1.5 px-3 text-right font-mono text-indigo-900">36,270</td>
                                            </tr>
                                            <tr className="bg-blue-50/60 font-black text-blue-950 border-t border-b border-blue-200">
                                                <td className="py-2 px-3 border-r border-blue-200">Total Cost to Company (CTC = A + B)</td>
                                                <td className="py-2 px-3 border-r border-blue-200 text-right font-mono text-blue-800">53,022</td>
                                                <td className="py-2 px-3 text-right font-mono text-blue-800">6,36,270</td>
                                            </tr>

                                            {/* Part C: Employee Deductions */}
                                            <tr className="bg-slate-50/80 font-bold text-slate-700">
                                                <td colSpan={3} className="py-1.5 px-3 uppercase tracking-wider text-[10px] text-amber-900 bg-amber-50/40">
                                                    C. EMPLOYEE STATUTORY DEDUCTIONS
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">PF Employee Contribution (12% of Basic)</td>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-800 font-mono">1,800</td>
                                                <td className="py-1.5 px-3 text-right text-slate-800 font-mono">21,600</td>
                                            </tr>
                                            <tr>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">Professional Tax (PT - State Slab)</td>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-800 font-mono">200</td>
                                                <td className="py-1.5 px-3 text-right text-slate-800 font-mono">2,500</td>
                                            </tr>
                                            <tr>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">LWF Employee Share</td>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-800 font-mono">10</td>
                                                <td className="py-1.5 px-3 text-right text-slate-800 font-mono">120</td>
                                            </tr>
                                            <tr className="bg-slate-50 font-extrabold text-slate-900 border-t border-slate-300">
                                                <td className="py-1.5 px-3 border-r border-slate-200">Total Deductions (C)</td>
                                                <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono text-amber-900">2,010</td>
                                                <td className="py-1.5 px-3 text-right font-mono text-amber-900">24,220</td>
                                            </tr>

                                            {/* Part D: Net In-Hand Take Home */}
                                            <tr className="bg-emerald-50/90 font-black text-emerald-950 border-t-2 border-emerald-300">
                                                <td className="py-2.5 px-3 border-r border-emerald-200 flex items-center justify-between">
                                                    <span>D. ESTIMATED NET TAKE-HOME PAY (Gross A - Deductions C)</span>
                                                    <span className="text-[10px] uppercase font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                                                        In-Hand Salary
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 border-r border-emerald-200 text-right font-mono text-emerald-800 text-xs">47,990</td>
                                                <td className="py-2.5 px-3 text-right font-mono text-emerald-800 text-xs">5,75,780</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Table Highlights & Rules */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs text-slate-600">
                                    <div className="p-3 bg-white rounded-xl border border-slate-200/90 space-y-1">
                                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                            <CheckCircle size={14} className="text-emerald-600" />
                                            <span>Dynamic Payroll Math</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Components automatically calculate based on company PayrollConfig, statutory wage ceilings, and state PT rules.
                                        </p>
                                    </div>

                                    <div className="p-3 bg-white rounded-xl border border-slate-200/90 space-y-1">
                                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                            <CheckCircle size={14} className="text-blue-600" />
                                            <span>OpenXML Word Native</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Injected as native Word XML table (<code className="text-[10px]">&lt;w:tbl&gt;</code>) with professional borders, cell margins, and header repeat.
                                        </p>
                                    </div>

                                    <div className="p-3 bg-white rounded-xl border border-slate-200/90 space-y-1">
                                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                            <CheckCircle size={14} className="text-indigo-600" />
                                            <span>Syntax Tolerance</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Supports <code>{'{@salary_table}'}</code>, <code>{'{salary_table}'}</code>, or <code>{'{@salarytable}'}</code> seamlessly.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Category 3: Table Format Loops (Docxtemplater) */}
                        <div className="space-y-3">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                Table Format Loops (Custom Word Tables)
                            </h5>
                            <p className="text-xs text-slate-500">
                                If you prefer designing your own custom table columns in Word, add these loop opener and closer tags in a table row. The row will automatically duplicate for each item:
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {LOOP_PLACEHOLDERS.map(lp => (
                                    <div
                                        key={lp.tag}
                                        onClick={() => handleCopyTag(lp.tag)}
                                        className="p-3.5 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer transition-all space-y-1 group"
                                        title="Click to copy loop"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-xs font-bold text-blue-700 group-hover:underline">
                                                {lp.tag}
                                            </span>
                                            <Copy size={12} className="text-slate-400 group-hover:text-blue-600" />
                                        </div>
                                        <div className="text-[11px] text-slate-600">
                                            {lp.desc}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Upload Template Modal */}
                    {showUploadModal && (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Upload size={18} className="text-blue-600" />
                                        <h3 className="text-sm font-black text-slate-900">
                                            Upload Custom Revision Template
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowUploadModal(false)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <form onSubmit={handleUploadTemplate} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Template Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={uploadTemplateName}
                                            onChange={(e) => setUploadTemplateName(e.target.value)}
                                            placeholder="e.g. Annual Appraisal Offer Letter 2026"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Select Word Document (.docx) *
                                        </label>
                                        <input
                                            type="file"
                                            accept=".docx"
                                            onChange={(e) => setUploadTemplateFile(e.target.files?.[0] || null)}
                                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                            required
                                        />
                                        <span className="text-[10px] text-slate-500 mt-1 block">
                                            Upload your company letterhead formatted with tags like <code>{'{employee_full_name}'}</code> and <code>{'{@salary_table}'}</code>.
                                        </span>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => setShowUploadModal(false)}
                                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={uploadingTemplate || !uploadTemplateFile}
                                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                                        >
                                            {uploadingTemplate ? (
                                                <>
                                                    <RefreshCw size={14} className="animate-spin" />
                                                    <span>Uploading Template...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={14} />
                                                    <span>Upload & Save Template</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ============================================================== */}
            {/* SUB-TAB 4: REVISION LOGS & TIMELINE                            */}
            {/* ============================================================== */}
            {subTab === 'logs' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <History size={16} className="text-blue-600" />
                                <span>Company-Wide Salary Revision Logs & Dispatch Timeline</span>
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Audit trail of all individual and bulk salary restructuring events with letter download and re-email actions.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={logStatusFilter}
                                onChange={(e) => setLogStatusFilter(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                            >
                                <option value="all">All Statuses</option>
                                <option value="applied">Applied</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="cancelled">Cancelled</option>
                            </select>

                            <button
                                type="button"
                                onClick={fetchCompanyRevisions}
                                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                                title="Refresh Logs"
                            >
                                <RefreshCw size={14} className={loadingCompanyRevisions ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="py-2.5 px-3">Employee</th>
                                    <th className="py-2.5 px-3">Effective Date</th>
                                    <th className="py-2.5 px-3">Reason</th>
                                    <th className="py-2.5 px-3">Changes Recorded</th>
                                    <th className="py-2.5 px-3">Status</th>
                                    <th className="py-2.5 px-3">Created By</th>
                                    <th className="py-2.5 px-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loadingCompanyRevisions ? (
                                    <tr>
                                        <td colSpan="7" className="py-8 text-center text-slate-400">
                                            <div className="flex items-center justify-center gap-2">
                                                <RefreshCw className="animate-spin text-blue-600" size={14} />
                                                <span>Loading company revision history...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : companyRevisions.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-8 text-center text-slate-400">
                                            No revision logs recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    companyRevisions.map(rev => (
                                        <tr key={rev._id} className="hover:bg-slate-50/50">
                                            <td className="py-2.5 px-3">
                                                <div className="font-bold text-slate-900">
                                                    {rev.employeeId?.firstName} {rev.employeeId?.lastName || ''}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                    {rev.employeeId?.employeeCode || rev.employeeId?.email}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                                                {rev.effectiveDate ? format(new Date(rev.effectiveDate), 'dd MMM yyyy') : '—'}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-700">
                                                {rev.reason}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                {rev.changes?.map((ch, idx) => (
                                                    <div key={idx} className="text-[11px]">
                                                        <span className="font-semibold text-slate-700">{ch.fieldLabel || ch.field}:</span>{' '}
                                                        <span className="text-slate-400 line-through">{ch.previousDisplayValue}</span>{' '}
                                                        <span className="font-bold text-emerald-600">→ {ch.revisedDisplayValue}</span>
                                                    </div>
                                                )) || 'Compensation updated'}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    rev.status === 'applied'
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : rev.status === 'scheduled'
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {rev.status || 'Applied'}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-500">
                                                {rev.createdBy?.firstName ? `${rev.createdBy.firstName} ${rev.createdBy.lastName || ''}` : 'HR Admin'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedUserId(rev.employeeId?._id || rev.employeeId);
                                                            handleDownloadLetter(rev._id);
                                                        }}
                                                        className="p-1.5 rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                                                        title="Download DOCX Letter"
                                                    >
                                                        <Download size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedUserId(rev.employeeId?._id || rev.employeeId);
                                                            handleResendLetter(rev._id);
                                                        }}
                                                        className="p-1.5 rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                                                        title="Email Letter to Employee"
                                                    >
                                                        <Mail size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviseSalaryDetailsTab;
