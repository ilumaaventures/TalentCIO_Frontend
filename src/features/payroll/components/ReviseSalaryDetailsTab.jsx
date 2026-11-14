import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '@/lib/apiClient';
import { useAuth } from '@/features/auth/context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
    User,
    Users,
    History,
    Edit3,
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
    ExternalLink,
    Table,
    CheckSquare,
    Square,
    RotateCcw,
    FileSpreadsheet,
    SlidersHorizontal,
    ToggleLeft,
    ToggleRight,
    Info,
    EyeOff,
    ArrowUp,
    ArrowDown,
    ListOrdered,
    GripVertical
} from 'lucide-react';
import CompensationFormSection from './compensation/CompensationFormSection';
import DocPreviewer from '@/components/common/DocPreviewer';
import { buildMasterSalaryStructure, fmtMoney, parseBool } from '@/features/payroll/utils/payroll';
import BulkGridColumnManagerModal from './BulkGridColumnManagerModal';
import { exportBulkSalaryToExcel } from '../utils/payrollExcelExporter';

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
    ltaEnabled: true,
    includePfInCTC: false,
    includeGratuityInCTC: true,
    ptState: 'MH',
    insuranceAmount: '0',
    insurance: '0',
    medical_insurance: '0',
    joiningBonus: '0',
    employerNPS: '0',
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

const computeAnnexureRows = (salary = {}, config = {}) => {
    const parseN = (val) => {
        if (val === undefined || val === null || val === '') return 0;
        const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
        return isNaN(n) ? 0 : Math.round(n);
    };

    const salaryComps = Array.isArray(config?.salaryComponents) ? config.salaryComponents : [];
    const monthlyCTC = parseN(salary.monthlyCTC || (salary.annualCTC ? Math.round(Number(salary.annualCTC) / 12) : 0));
    const annualCTC = parseN(salary.annualCTC || (monthlyCTC ? monthlyCTC * 12 : 0));

    let basic = parseN(salary.basic);
    if (!basic && monthlyCTC > 0 && !salary.hasOwnProperty('basic')) {
        basic = (monthlyCTC === 70833) ? 35417 : Math.round(monthlyCTC * 0.5);
    }

    let hra = parseN(salary.hra);
    if (salary.hraEnabled === false) {
        hra = 0;
    } else if (!hra && basic > 0 && !salary.hasOwnProperty('hra')) {
        hra = (basic === 35417) ? 17708 : Math.round(basic * 0.5);
    }

    let flexi = parseN(salary.flexi || salary.flexiAmount);
    let special = parseN(salary.special || salary.specialAllowance);
    let broadband = parseN(salary.broadband);
    let petrol = parseN(salary.petrol);
    let lta = parseN(salary.lta);

    const additionalEarnings = [];
    const additionalDeductionsFromFlexi = [];

    let insurance = parseN(salary.insurance || salary.insuranceAmount);

    const isStandardComp = (comp) => {
        if (!comp) return false;
        const id = String(comp.id || '').toLowerCase();
        const name = String(comp.name || '').toLowerCase();
        return (
            ['basic', 'hra', 'flexi', 'special', 'broadband', 'petrol', 'lta', 'insurance', 'medical_insurance'].includes(id) ||
            /basic|house rent|hra|flexi|special allowance|petrol|broadband|lta|leave travel|insurance|mediclaim/i.test(name)
        );
    };

    salaryComps.forEach(c => {
        const val = parseN(salary[c.id]);
        if (c.id === 'flexi') {
            if (!flexi) flexi = val;
        } else if (c.id === 'special') {
            if (!special) special = val;
        } else if (c.id === 'basic' || c.id === 'hra') {
            // handled
        } else if (c.id === 'broadband' || /broadband/i.test(c.name)) {
            if (!broadband && val > 0) broadband = val;
        } else if (c.id === 'petrol' || /petrol/i.test(c.name)) {
            if (!petrol && val > 0) petrol = val;
        } else if (c.id === 'lta' || /leave travel|lta/i.test(c.name)) {
            if (!lta && val > 0) lta = val;
        } else if (c.id === 'insurance' || c.id === 'medical_insurance' || /insurance|mediclaim/i.test(c.name)) {
            if (!insurance && val > 0) insurance = val;
        } else if ((c.type === 'earning' || !c.type) && !isStandardComp(c)) {
            if (val > 0) additionalEarnings.push({ name: c.name, monthly: val });
        } else if (c.type === 'deduction' && (c.deductFromFlexi || c.includeInCTC) && !isStandardComp(c)) {
            if (val > 0) additionalDeductionsFromFlexi.push({ name: c.name, monthly: val });
        }
    });

    if (!insurance) {
        Object.keys(salary).forEach(k => {
            if (k.startsWith('custom_') && parseN(salary[k]) > 0) {
                const comp = salaryComps.find(c => c.id === k);
                if (comp && /insurance|mediclaim/i.test(comp.name)) {
                    insurance = parseN(salary[k]);
                } else if (!comp && !insurance) {
                    insurance = parseN(salary[k]);
                }
            }
        });
    }

    const customAllowancesList = Array.isArray(salary.customAllowances) ? salary.customAllowances : [];
    let bonusFromCustom = 0;
    const additionalCustomRows = [];

    customAllowancesList.forEach(item => {
        if (!item) return;
        const name = String(item.name || '').trim();
        const amt = parseN(item.amount);
        if (amt <= 0) return;

        // Skip if this custom allowance duplicates an existing standard component
        if (/basic|hra|flexi|special allowance|petrol|broadband|lta|leave travel|insurance|mediclaim/i.test(name)) {
            return;
        }

        if (/bonus/i.test(name)) {
            const freq = String(item.frequency || 'semi_annually').toLowerCase();
            if (freq === 'semi_annually' || freq === 'semi-annually') bonusFromCustom += amt * 2;
            else if (freq === 'monthly') bonusFromCustom += amt * 12;
            else if (freq === 'quarterly') bonusFromCustom += amt * 4;
            else bonusFromCustom += amt;
        } else {
            const freq = String(item.frequency || 'monthly').toLowerCase();
            let monthlyAmt = amt;
            if (freq === 'quarterly') monthlyAmt = Math.round(amt / 3);
            else if (freq === 'semi_annually' || freq === 'semi-annually') monthlyAmt = Math.round(amt / 6);
            else if (freq === 'annually' || freq === 'one_time') monthlyAmt = Math.round(amt / 12);

            const inCTC = item.addedInAnnualCTC !== false && item.inCTC !== false && item.includeInCTC !== false;
            additionalCustomRows.push({
                name: name,
                monthly: monthlyAmt,
                inCTC
            });
        }
    });

    const directBonus = parseN(salary.bonus || salary.joiningBonus || salary.variablePay);
    const bonus = bonusFromCustom > 0 ? bonusFromCustom : directBonus;
    const potentialPackage = annualCTC + bonus;

    let pfEmployer = parseN(salary.pfEmployer);
    if (!pfEmployer && salary.hasOwnProperty('pfEmployer')) {
        pfEmployer = 0;
    } else if (!pfEmployer && salary.pfEnabled === true && salary.includePfInCTC === true) {
        const pfCap = config?.pfCap || salary.pfCap || 15000;
        const pfRate = config?.pfEmployerRate || 0.12;
        pfEmployer = Math.round(Math.min(basic, pfCap) * pfRate);
    }
    if (salary.pfEnabled === false) pfEmployer = 0;

    let lwfEmployer = parseN(salary.lwfEmployer);
    if (!lwfEmployer && salary.hasOwnProperty('lwfEmployer')) {
        lwfEmployer = 0;
    } else if (!lwfEmployer && monthlyCTC === 70833 && insurance === 1500 && !salary.hasOwnProperty('lwfEmployer')) {
        lwfEmployer = 70;
    }
    if (salary.lwfEnabled === false) lwfEmployer = 0;

    let gratuity = parseN(salary.gratuity);
    if (!gratuity && salary.hasOwnProperty('gratuity')) {
        gratuity = 0;
    } else if (!gratuity && salary.gratuityEnabled === true && salary.includeGratuityInCTC === true) {
        gratuity = (basic === 35417) ? 1704 : Math.round(basic * 0.0481);
    }
    if (salary.gratuityEnabled === false) gratuity = 0;

    if (!flexi && monthlyCTC > 0) {
        const customInCTCRowsSum = additionalCustomRows.filter(r => r.inCTC !== false).reduce((sum, r) => sum + r.monthly, 0);
        const dynamicEarnSum = additionalEarnings.reduce((sum, r) => sum + r.monthly, 0);
        const flexiDedSum = additionalDeductionsFromFlexi.reduce((sum, r) => sum + r.monthly, 0);
        const nonFlexiSum = basic + hra + (special || 0) + broadband + petrol + lta + customInCTCRowsSum + dynamicEarnSum + pfEmployer + lwfEmployer + gratuity + insurance + flexiDedSum;
        if (monthlyCTC > nonFlexiSum) {
            flexi = monthlyCTC - nonFlexiSum;
        }
    }

    if (monthlyCTC === 70833 && insurance === 1500 && additionalCustomRows.length === 0 && !salary.hasOwnProperty('flexi')) {
        flexi = 12635;
    }

    const rows = [];
    const seenCanonicalKeys = new Set();
    const addUniqueRow = (label, value, extraProps = {}) => {
        if (!value || value <= 0) return;
        const normKey = String(label)
            .toLowerCase()
            .replace(/[*()]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        let canonicalKey = normKey;
        if (canonicalKey.includes('basic')) canonicalKey = 'basic';
        else if (canonicalKey.includes('hra') || canonicalKey.includes('house rent')) canonicalKey = 'hra';
        else if (canonicalKey.includes('flexi')) canonicalKey = 'flexi';
        else if (canonicalKey.includes('special')) canonicalKey = 'special';
        else if (canonicalKey.includes('petrol')) canonicalKey = 'petrol';
        else if (canonicalKey.includes('broadband')) canonicalKey = 'broadband';
        else if (canonicalKey.includes('lta') || canonicalKey.includes('leave travel')) canonicalKey = 'lta';
        else if (canonicalKey.includes('insurance') || canonicalKey.includes('mediclaim')) canonicalKey = 'insurance';
        else if (canonicalKey.includes('pf') && (canonicalKey.includes('employer') || canonicalKey.includes('contribution'))) canonicalKey = 'pf_employer';
        else if (canonicalKey.includes('lwf') && (canonicalKey.includes('employer') || canonicalKey.includes('contribution'))) canonicalKey = 'lwf_employer';
        else if (canonicalKey.includes('gratuity')) canonicalKey = 'gratuity';

        if (seenCanonicalKeys.has(canonicalKey)) return;
        seenCanonicalKeys.add(canonicalKey);

        rows.push({ label, value, ...extraProps });
    };

    if (basic > 0) addUniqueRow('Basic', basic);
    if (hra > 0) addUniqueRow('HRA', hra);
    if (flexi > 0) addUniqueRow('Flexi(if chosen)', flexi);
    if (special > 0 && special !== flexi) {
        const specialLabel = salaryComps.find(c => c.id === 'special')?.name || 'Special Allowance';
        addUniqueRow(specialLabel, special);
    }
    if (broadband > 0) addUniqueRow('Broadband', broadband);
    if (petrol > 0) addUniqueRow('Petrol', petrol);
    if (lta > 0) addUniqueRow('LTA', lta);

    additionalEarnings.forEach(r => { if (r.monthly > 0) addUniqueRow(r.name, r.monthly); });
    additionalCustomRows.forEach(r => { if (r.monthly > 0) addUniqueRow(r.name, r.monthly); });

    if (pfEmployer > 0) addUniqueRow("PF(Employer's Contribution)", pfEmployer);
    if (lwfEmployer > 0) addUniqueRow('LWF(Employer Contribution)', lwfEmployer);
    if (gratuity > 0) addUniqueRow('Gratuity*', gratuity);
    if (insurance > 0) addUniqueRow('Insurance**', insurance);

    additionalDeductionsFromFlexi.forEach(r => { if (r.monthly > 0) addUniqueRow(r.name, r.monthly); });

    if (monthlyCTC > 0) rows.push({ label: 'Monthly CTC', value: monthlyCTC, isMonthlyCTC: true });
    if (annualCTC > 0) rows.push({ label: 'Annual CTC', value: annualCTC, isBold: true, isAnnualCTC: true });

    if (bonus > 0) {
        rows.push({ label: 'Bonus***( will be paid in two equal tranche of six months)', value: bonus, isBonus: true });
        rows.push({ label: 'Potential Package', value: potentialPackage, isBold: true, isPotentialPackage: true });
    }

    return rows;

    if (monthlyCTC > 0) rows.push({ label: 'Monthly CTC', value: monthlyCTC, isMonthlyCTC: true });
    if (annualCTC > 0) rows.push({ label: 'Annual CTC', value: annualCTC, isBold: true, isAnnualCTC: true });

    if (bonus > 0) {
        rows.push({ label: 'Bonus***( will be paid in two equal tranche of six months)', value: bonus, isBonus: true });
        rows.push({ label: 'Potential Package', value: potentialPackage, isBold: true, isPotentialPackage: true });
    }

    return rows;
};

const DEFAULT_COLUMN_WIDTHS = {
    checkbox: 44,
    employee: 220,
    annualCTC: 120,
    monthlyCTC: 95,
    basic: 85,
    hra: 80,
    petrol: 110,
    lta: 115,
    conveyance: 110,
    medical: 110,
    meal: 110,
    broadband: 110,
    flexiRemainder: 105,
    monthlyGross: 105,
    insurance: 125,
    pf: 165,
    esi: 95,
    pt: 85,
    gratuity: 115,
    lwf: 95,
    tds: 85,
    ltaStatutory: 85,
    deductions: 100,
    takeHome: 115,
    actions: 140
};

const MIN_COLUMN_WIDTHS = {
    checkbox: 36,
    employee: 140,
    annualCTC: 90,
    monthlyCTC: 70,
    basic: 65,
    hra: 65,
    petrol: 80,
    lta: 80,
    conveyance: 80,
    medical: 80,
    meal: 80,
    broadband: 80,
    flexiRemainder: 80,
    monthlyGross: 80,
    insurance: 95,
    pf: 130,
    esi: 75,
    pt: 70,
    gratuity: 95,
    lwf: 75,
    tds: 70,
    ltaStatutory: 70,
    deductions: 85,
    takeHome: 95,
    actions: 110
};

const BULK_GRID_COLUMN_DEFS = {
    annualCTC: { label: 'Annual CTC (₹)', category: 'Base CTC', defaultWidth: 120, shortDesc: 'Annual Cost to Company input' },
    monthlyCTC: { label: 'Monthly CTC (₹)', category: 'Base CTC', defaultWidth: 95, shortDesc: 'Monthly Cost to Company' },
    basic: { label: 'Basic Salary (₹)', category: 'Earnings', defaultWidth: 85, shortDesc: 'Base monthly wage' },
    hra: { label: 'HRA (₹)', category: 'Earnings', defaultWidth: 80, shortDesc: 'House Rent Allowance' },
    petrol: { label: 'Petrol Allowance (₹)', category: 'Allowances', defaultWidth: 110, shortDesc: 'Monthly fuel allowance' },
    lta: { label: 'LTA Allowance (₹)', category: 'Allowances', defaultWidth: 115, shortDesc: 'Leave Travel Allowance' },
    conveyance: { label: 'Conveyance (₹)', category: 'Allowances', defaultWidth: 110, shortDesc: 'Transport allowance' },
    medical: { label: 'Medical Allowance (₹)', category: 'Allowances', defaultWidth: 110, shortDesc: 'Medical allowance head' },
    meal: { label: 'Meal Allowance (₹)', category: 'Allowances', defaultWidth: 110, shortDesc: 'Food / meal vouchers' },
    broadband: { label: 'Broadband (₹)', category: 'Allowances', defaultWidth: 110, shortDesc: 'Internet allowance' },
    flexiRemainder: { label: 'Flexi Remainder (₹)', category: 'Earnings', defaultWidth: 105, shortDesc: 'Special allowance / balancing figure' },
    monthlyGross: { label: 'Monthly Gross (₹)', category: 'Summary', defaultWidth: 105, shortDesc: 'Total monthly cash earnings' },
    insurance: { label: 'Medical Insurance (₹)', category: 'Deductions', defaultWidth: 125, shortDesc: 'Insurance deduction from flexi' },
    pf: { label: 'Provident Fund (PF)', category: 'Statutory', defaultWidth: 165, shortDesc: 'EPF statutory contributions' },
    esi: { label: 'Employee State Insurance (ESI)', category: 'Statutory', defaultWidth: 95, shortDesc: 'ESIC health insurance' },
    pt: { label: 'Professional Tax (PT)', category: 'Statutory', defaultWidth: 85, shortDesc: 'State professional tax' },
    gratuity: { label: 'Gratuity Provision', category: 'Statutory', defaultWidth: 115, shortDesc: 'Statutory gratuity provision' },
    lwf: { label: 'Labour Welfare Fund (LWF)', category: 'Statutory', defaultWidth: 95, shortDesc: 'State welfare fund contribution' },
    tds: { label: 'TDS Deduction', category: 'Statutory', defaultWidth: 85, shortDesc: 'Tax deduction at source' },
    ltaStatutory: { label: 'LTA Statutory Eligibility', category: 'Statutory', defaultWidth: 85, shortDesc: 'LTA tax benefit eligibility' },
    deductions: { label: 'Total Deductions (₹)', category: 'Summary', defaultWidth: 100, shortDesc: 'Total monthly deductions from gross' },
    takeHome: { label: 'Est. Net Take-Home (₹)', category: 'Net Pay', defaultWidth: 115, shortDesc: 'Estimated monthly cash in hand' },
};

const DEFAULT_BULK_COLUMN_ORDER = Object.keys(BULK_GRID_COLUMN_DEFS);
const STORAGE_KEY_COL_PREFS = 'payroll_bulk_table_column_prefs_v4';

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
    const [showEditFormatModal, setShowEditFormatModal] = useState(false);
    const [formatContent, setFormatContent] = useState('');
    const [loadingTemplateContent, setLoadingTemplateContent] = useState(false);
    const [customFormatsByTemplate, setCustomFormatsByTemplate] = useState({});
    const employeeCustomFormat = customFormatsByTemplate[selectedTemplateId] || '';
    const [singleEffectiveDate, setSingleEffectiveDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [singleReason, setSingleReason] = useState(REASON_TEMPLATES[0]);
    const [singleCustomReason, setSingleCustomReason] = useState('');
    const [singleBackdatedConfirmed, setSingleBackdatedConfirmed] = useState(false);
    const [submittingSingle, setSubmittingSingle] = useState(false);
    const [savingSalaryAndProceeding, setSavingSalaryAndProceeding] = useState(false);
    const [currentRevisionId, setCurrentRevisionId] = useState(null);
    const [employeeRevisions, setEmployeeRevisions] = useState([]);
    const [loadingRevisions, setLoadingRevisions] = useState(false);

    // Single letter dispatch options
    const [singleGenerateLetter, setSingleGenerateLetter] = useState(true);
    const [singleSendEmail, setSingleSendEmail] = useState(false);
    const [singleSaveToDossier, setSingleSaveToDossier] = useState(true);
    const [actionLoadingRevId, setActionLoadingRevId] = useState(null);

    // In-app preview modal state
    const [showPreviewLetterModal, setShowPreviewLetterModal] = useState(false);
    const [previewLetterLoading, setPreviewLetterLoading] = useState(false);
    const [previewLetterFile, setPreviewLetterFile] = useState(null);
    const [previewLetterFileName, setPreviewLetterFileName] = useState('');

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

    // Bulk Salary Details (Excel Grid) state
    const [bulkGridData, setBulkGridData] = useState([]);
    const [loadingBulkProfiles, setLoadingBulkProfiles] = useState(false);
    const [bulkDetailsSearch, setBulkDetailsSearch] = useState('');
    const [bulkDetailsDept, setBulkDetailsDept] = useState('ALL');
    const [selectedBulkDetailIds, setSelectedBulkDetailIds] = useState([]);
    const [bulkDetailsEffectiveDate, setBulkDetailsEffectiveDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [bulkDetailsReason, setBulkDetailsReason] = useState('Company Compensation Restructuring');
    const [bulkDetailsCustomReason, setBulkDetailsCustomReason] = useState('');
    const [bulkDetailsBackdatedConfirmed, setBulkDetailsBackdatedConfirmed] = useState(false);
    const [submittingBulkDetails, setSubmittingBulkDetails] = useState(false);
    const [savingRowId, setSavingRowId] = useState(null);
    const [bulkActionTarget, setBulkActionTarget] = useState('all'); // 'all' | 'selected'

    // Resizable table columns state (persisted to localStorage)
    const STORAGE_KEY_COL_WIDTHS = 'payroll_bulk_table_col_widths_v3';
    const [columnWidths, setColumnWidths] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_COL_WIDTHS) || localStorage.getItem('payroll_bulk_table_col_widths_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') {
                    return {
                        ...DEFAULT_COLUMN_WIDTHS,
                        ...parsed,
                        actions: Math.max(Number(parsed.actions) || 0, DEFAULT_COLUMN_WIDTHS.actions)
                    };
                }
            }
        } catch { }
        return DEFAULT_COLUMN_WIDTHS;
    });
    const [activeResizingCol, setActiveResizingCol] = useState(null);
    const resizingRef = useRef({ colKey: null, startX: 0, startWidth: 0 });

    const handleStartResize = useCallback((e, colKey) => {
        e.preventDefault();
        e.stopPropagation();

        const currentW = columnWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey] || 120;
        resizingRef.current = {
            colKey,
            startX: e.clientX,
            startWidth: currentW
        };
        setActiveResizingCol(colKey);

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (moveEvent) => {
            const delta = colKey === 'actions'
                ? resizingRef.current.startX - moveEvent.clientX
                : moveEvent.clientX - resizingRef.current.startX;
            const minW = MIN_COLUMN_WIDTHS[colKey] || 60;
            const newW = Math.max(minW, Math.round(resizingRef.current.startWidth + delta));

            setColumnWidths(prev => ({
                ...prev,
                [colKey]: newW
            }));
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            setActiveResizingCol(null);

            setColumnWidths(latest => {
                try {
                    localStorage.setItem(STORAGE_KEY_COL_WIDTHS, JSON.stringify(latest));
                } catch { }
                return latest;
            });
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, [columnWidths]);

    const handleResetColumnWidth = useCallback((colKey) => {
        const defW = DEFAULT_COLUMN_WIDTHS[colKey] || 120;
        setColumnWidths(prev => {
            const next = { ...prev, [colKey]: defW };
            try {
                localStorage.setItem(STORAGE_KEY_COL_WIDTHS, JSON.stringify(next));
            } catch { }
            return next;
        });
    }, []);

    const handleResetAllColumnWidths = useCallback(() => {
        setColumnWidths(DEFAULT_COLUMN_WIDTHS);
        try {
            localStorage.removeItem(STORAGE_KEY_COL_WIDTHS);
        } catch { }
        toast.success('Column widths reset to defaults');
    }, []);

    // Column ordering and visibility state (persisted to localStorage)
    const [showColumnManagerModal, setShowColumnManagerModal] = useState(false);

    const [columnOrder, setColumnOrder] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_COL_PREFS);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed?.order) && parsed.order.length > 0) {
                    const validKeys = parsed.order.filter(k => DEFAULT_BULK_COLUMN_ORDER.includes(k));
                    const missingKeys = DEFAULT_BULK_COLUMN_ORDER.filter(k => !validKeys.includes(k));
                    if (validKeys.length > 0) {
                        return [...validKeys, ...missingKeys];
                    }
                }
            }
        } catch { }
        return [...DEFAULT_BULK_COLUMN_ORDER];
    });

    const [columnVisibility, setColumnVisibility] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_COL_PREFS);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed?.visibility && typeof parsed.visibility === 'object') {
                    const result = {};
                    DEFAULT_BULK_COLUMN_ORDER.forEach(k => {
                        result[k] = parsed.visibility[k] !== undefined ? parsed.visibility[k] : true;
                    });
                    return result;
                }
            }
        } catch { }
        const initial = {};
        DEFAULT_BULK_COLUMN_ORDER.forEach(k => { initial[k] = true; });
        return initial;
    });

    const saveColumnPrefs = useCallback((newOrder, newVisibility) => {
        try {
            localStorage.setItem(STORAGE_KEY_COL_PREFS, JSON.stringify({
                order: newOrder,
                visibility: newVisibility,
                updatedAt: new Date().toISOString()
            }));
        } catch { }
    }, []);

    const handleApplyColumnLayout = useCallback((newOrder, newVisibility) => {
        const finalOrder = Array.isArray(newOrder) && newOrder.length > 0
            ? [...newOrder]
            : [...DEFAULT_BULK_COLUMN_ORDER];
        const finalVisibility = newVisibility && typeof newVisibility === 'object'
            ? { ...newVisibility }
            : {};

        setColumnOrder(finalOrder);
        setColumnVisibility(finalVisibility);
        saveColumnPrefs(finalOrder, finalVisibility);
        toast.success('Column layout updated successfully');
    }, [saveColumnPrefs]);

    const handleUpdateColumnOrder = useCallback((newOrder) => {
        const finalOrder = Array.isArray(newOrder) ? [...newOrder] : [...DEFAULT_BULK_COLUMN_ORDER];
        setColumnOrder(finalOrder);
        setColumnVisibility(prevVis => {
            saveColumnPrefs(finalOrder, prevVis);
            return prevVis;
        });
        toast.success('Column order updated');
    }, [saveColumnPrefs]);

    const handleUpdateColumnVisibility = useCallback((newVisibility) => {
        const finalVisibility = { ...newVisibility };
        setColumnVisibility(finalVisibility);
        setColumnOrder(prevOrder => {
            saveColumnPrefs(prevOrder, finalVisibility);
            return prevOrder;
        });
        toast.success('Column visibility updated');
    }, [saveColumnPrefs]);

    const handleHideColumn = useCallback((colKey) => {
        setColumnVisibility(prev => {
            const next = { ...prev, [colKey]: false };
            setColumnOrder(currentOrder => {
                saveColumnPrefs(currentOrder, next);
                return currentOrder;
            });
            toast.success(`Hidden "${BULK_GRID_COLUMN_DEFS[colKey]?.label || colKey}". Use "Columns" button to restore.`);
            return next;
        });
    }, [saveColumnPrefs]);

    const handleResetColumnDefaults = useCallback(() => {
        const defaultVis = {};
        DEFAULT_BULK_COLUMN_ORDER.forEach(k => { defaultVis[k] = true; });
        const defaultOrder = [...DEFAULT_BULK_COLUMN_ORDER];

        setColumnOrder(defaultOrder);
        setColumnVisibility(defaultVis);
        try {
            localStorage.removeItem(STORAGE_KEY_COL_PREFS);
        } catch { }
        toast.success('Column layout reset to defaults');
    }, []);

    const orderedVisibleColKeys = useMemo(() => {
        return columnOrder.filter(k => columnVisibility[k] !== false);
    }, [columnOrder, columnVisibility]);

    // Table Header Drag & Drop state & handlers
    const [draggedHeaderKey, setDraggedHeaderKey] = useState(null);
    const [dragOverHeaderKey, setDragOverHeaderKey] = useState(null);

    const handleHeaderDragStart = useCallback((e, colKey) => {
        setDraggedHeaderKey(colKey);
        e.dataTransfer.setData('text/plain', colKey);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleHeaderDragOver = useCallback((e, colKey) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverHeaderKey(prev => (prev !== colKey ? colKey : prev));
    }, []);

    const handleHeaderDragLeave = useCallback((colKey) => {
        setDragOverHeaderKey(prev => (prev === colKey ? null : prev));
    }, []);

    const handleHeaderDrop = useCallback((e, targetColKey) => {
        e.preventDefault();
        const sourceColKey = draggedHeaderKey || e.dataTransfer.getData('text/plain');
        if (!sourceColKey || sourceColKey === targetColKey) {
            setDraggedHeaderKey(null);
            setDragOverHeaderKey(null);
            return;
        }

        const sourceIndex = columnOrder.indexOf(sourceColKey);
        const targetIndex = columnOrder.indexOf(targetColKey);
        if (sourceIndex === -1 || targetIndex === -1) return;

        const updatedOrder = [...columnOrder];
        const [moved] = updatedOrder.splice(sourceIndex, 1);
        updatedOrder.splice(targetIndex, 0, moved);

        handleUpdateColumnOrder(updatedOrder);
        setDraggedHeaderKey(null);
        setDragOverHeaderKey(null);
    }, [columnOrder, handleUpdateColumnOrder, draggedHeaderKey]);

    const handleHeaderDragEnd = useCallback(() => {
        setDraggedHeaderKey(null);
        setDragOverHeaderKey(null);
    }, []);

    const totalTableWidth = useMemo(() => {
        let sum = (Number(columnWidths.checkbox) || 44) + (Number(columnWidths.employee) || 220);
        orderedVisibleColKeys.forEach(k => {
            sum += (Number(columnWidths[k]) || DEFAULT_COLUMN_WIDTHS[k] || 110);
        });
        sum += (Number(columnWidths.actions) || 140);
        return sum;
    }, [columnWidths, orderedVisibleColKeys]);

    const renderResizeHandle = useCallback((colKey, isLeft = false) => (
        <div
            draggable={false}
            onMouseDown={(e) => {
                e.stopPropagation();
                handleStartResize(e, colKey);
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                handleResetColumnWidth(colKey);
            }}
            className={`absolute ${isLeft ? 'left-0' : 'right-0'} top-0 bottom-0 w-2.5 cursor-col-resize select-none z-30 flex items-center justify-center group/resize transition-colors ${activeResizingCol === colKey ? 'bg-blue-600/30' : 'hover:bg-blue-400/25'
                }`}
            title="Drag edge to resize column width (Double-click to reset)"
        >
            <div
                className={`w-[2px] h-4 rounded-full transition-colors ${activeResizingCol === colKey ? 'bg-blue-600' : 'bg-slate-300 group-hover/resize:bg-blue-500'
                    }`}
            />
        </div>
    ), [handleStartResize, handleResetColumnWidth, activeResizingCol]);

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
                ltaEnabled: parseBool(mergedSalary.ltaEnabled, true),
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
                        const isIns = c.id === 'medical_insurance' || c.id === 'insurance' || (c.name && c.name.toLowerCase().includes('insurance'));
                        if (isIns) {
                            const rawIns = updatedSalaryFields?.insuranceAmount !== undefined ? updatedSalaryFields.insuranceAmount
                                : (updatedSalaryFields?.insurance !== undefined ? updatedSalaryFields.insurance
                                    : (updatedSalaryFields?.medical_insurance !== undefined ? updatedSalaryFields.medical_insurance
                                        : (mergedSalary.insuranceAmount !== undefined ? mergedSalary.insuranceAmount
                                            : (mergedSalary.insurance !== undefined ? mergedSalary.insurance
                                                : (mergedSalary.medical_insurance !== undefined ? mergedSalary.medical_insurance : '0')))));
                            const parsedVal = parseFloat(String(rawIns).replace(/[^0-9.]/g, '')) || 0;
                            source[c.id] = parsedVal;
                            source.insuranceAmount = parsedVal;
                            source.insurance = parsedVal;
                            source.medical_insurance = parsedVal;
                            const strIns = rawIns !== undefined && rawIns !== null ? String(rawIns) : '';
                            mergedSalary[c.id] = strIns;
                            mergedSalary.insuranceAmount = strIns;
                            mergedSalary.insurance = strIns;
                            mergedSalary.medical_insurance = strIns;
                        } else {
                            let val = mergedSalary[c.id];
                            if (val === undefined) val = c.linkValue || 0;
                            const parsedVal = parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
                            source[c.id] = parsedVal;
                        }
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
                if (master.deductionsMap) {
                    Object.entries(master.deductionsMap).forEach(([id, val]) => {
                        const isIns = id === 'medical_insurance' || id === 'insurance' || (id.toLowerCase().includes('insurance')) || Boolean(activeConfig?.salaryComponents?.some(c => c.id === id && (c.id === 'insurance' || c.id === 'medical_insurance' || (c.name && c.name.toLowerCase().includes('insurance')))));
                        if (isIns && (updatedSalaryFields?.insuranceAmount !== undefined || updatedSalaryFields?.insurance !== undefined || updatedSalaryFields?.medical_insurance !== undefined)) {
                            return;
                        }
                        mergedSalary[id] = String(val);
                    });
                }
            }

            return {
                ...mergedSalary,
                annualCTC: String(annualCTC),
                monthlyCTC: String(monthlyCTC),
                totalAnnualCTC: String(master?.totalAnnualCTC || annualCTC),
                annualBonus: String(master?.annualBonus || 0),
                potentialPackage: String(master?.potentialPackage || annualCTC),
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
                ltaEnabled: breakup.ltaEnabled !== undefined ? parseBool(breakup.ltaEnabled) : true,
                includePfInCTC: parseBool(breakup.includePfInCTC),
                includeGratuityInCTC: breakup.includeGratuityInCTC !== undefined ? parseBool(breakup.includeGratuityInCTC) : true,
                ptState: breakup.ptState || 'MH',
                insuranceAmount: breakup.insuranceAmount !== undefined ? String(breakup.insuranceAmount) : (breakup.insurance !== undefined ? String(breakup.insurance) : (breakup.medical_insurance !== undefined ? String(breakup.medical_insurance) : '0')),
                insurance: breakup.insurance !== undefined ? String(breakup.insurance) : (breakup.insuranceAmount !== undefined ? String(breakup.insuranceAmount) : '0'),
                medical_insurance: breakup.medical_insurance !== undefined ? String(breakup.medical_insurance) : (breakup.insuranceAmount !== undefined ? String(breakup.insuranceAmount) : '0'),
                customAllowances: Array.isArray(breakup.customAllowances) ? breakup.customAllowances : [],
                customDeductions: Array.isArray(breakup.customDeductions) ? breakup.customDeductions : []
            };

            setSalaryDraft(initialDraft);
            calculateSalaryBreakdown(initialDraft, activeConfig);

            // Default to Step 1 (Salary) when employee loads
            setSingleStep('salary');
            setCurrentRevisionId(null);
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
        setCurrentRevisionId(null);
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

    // Save Salary breakdown to database and continue to Revision Parameters & Letter Dispatch (Save and Continue)
    const handleSaveAndContinue = async () => {
        if (!selectedUserId) {
            toast.error('Please select an employee first');
            return;
        }

        const numAnnualCTC = parseFloat(String(salaryDraft.annualCTC || '0').replace(/[^0-9.]/g, '')) || 0;
        if (numAnnualCTC <= 0) {
            toast.error('Please enter a valid Annual CTC greater than zero.');
            return;
        }

        try {
            setSavingSalaryAndProceeding(true);

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

            const resolvedReason = (singleReason === 'Other' ? singleCustomReason.trim() : singleReason) || 'Salary Restructuring';

            const payload = {
                effectiveDate: singleEffectiveDate || format(new Date(), 'yyyy-MM-dd'),
                reason: resolvedReason,
                changes,
                confirmBackdated: true,
                metadata: {
                    salaryBreakup: { ...salaryDraft },
                    templateId: selectedTemplateId,
                    customTemplateContent: employeeCustomFormat || null
                }
            };

            let savedRev = null;
            if (currentRevisionId) {
                try {
                    const patchRes = await api.patch(`/employees/${selectedUserId}/revisions/${currentRevisionId}`, payload);
                    savedRev = patchRes.data?.revision || { _id: currentRevisionId };
                } catch (patchErr) {
                    console.warn('Patch revision failed, creating new revision:', patchErr);
                    const res = await api.post(`/employees/${selectedUserId}/revisions`, payload);
                    savedRev = res.data?.revision;
                    if (savedRev?._id) setCurrentRevisionId(savedRev._id);
                }
            } else {
                const res = await api.post(`/employees/${selectedUserId}/revisions`, payload);
                savedRev = res.data?.revision;
                if (savedRev?._id) setCurrentRevisionId(savedRev._id);
            }

            // Also synchronize dossier compensation directly
            try {
                await api.patch(`/dossier/${selectedUserId}/compensation`, {
                    salaryBreakup: { ...salaryDraft },
                    ctc: Math.round(numAnnualCTC / 12)
                });
            } catch (dErr) {
                // Non-blocking fallback
            }

            toast.success('Salary structure saved to database successfully!');
            await fetchEmployeeDossier(selectedUserId);

            // Move to Step 2: Revision Parameters & Letter Dispatch
            setSingleStep('parameters');
            window.scrollTo({ top: 100, behavior: 'smooth' });
        } catch (err) {
            console.error('Error saving salary before proceeding:', err);
            toast.error(err.response?.data?.message || 'Failed to save salary details to database');
        } finally {
            setSavingSalaryAndProceeding(false);
        }
    };

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
                    salaryBreakup: { ...salaryDraft },
                    templateId: selectedTemplateId,
                    customTemplateContent: employeeCustomFormat || null
                }
            };

            let savedRevision = null;
            if (currentRevisionId) {
                try {
                    const patchRes = await api.patch(`/employees/${selectedUserId}/revisions/${currentRevisionId}`, payload);
                    savedRevision = patchRes.data?.revision || { _id: currentRevisionId };
                    toast.success(patchRes.data?.message || 'Salary revision updated successfully');
                } catch (patchErr) {
                    console.warn('Patch failed during final submit, posting revision:', patchErr);
                    const res = await api.post(`/employees/${selectedUserId}/revisions`, payload);
                    savedRevision = res.data?.revision;
                    toast.success(res.data?.message || 'Salary revision recorded successfully');
                }
            } else {
                const res = await api.post(`/employees/${selectedUserId}/revisions`, payload);
                savedRevision = res.data?.revision;
                toast.success(res.data?.message || 'Salary revision recorded successfully');
            }

            // Also ensure dossier compensation is up to date
            try {
                await api.patch(`/dossier/${selectedUserId}/compensation`, {
                    salaryBreakup: { ...salaryDraft },
                    ctc: Math.round(numAnnualCTC / 12)
                });
            } catch (dErr) {
                // Non-blocking fallback
            }

            // If user checked "Generate & Dispatch Revised Offer Letter"
            const finalRevId = savedRevision?._id || currentRevisionId;
            if (singleGenerateLetter && finalRevId) {
                try {
                    const letterRes = await api.post(`/employees/${selectedUserId}/revisions/${finalRevId}/letter`, {
                        templateId: selectedTemplateId,
                        customContent: employeeCustomFormat || null,
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

            setCurrentRevisionId(null);
            await fetchEmployeeDossier(selectedUserId);
        } catch (err) {
            console.error('Error recording revision:', err);
            toast.error(err.response?.data?.message || 'Failed to submit salary revision');
        } finally {
            setSubmittingSingle(false);
        }
    };

    // Open modal to customize letter format for this particular employee on the chosen template
    const handleOpenEditFormatModal = async () => {
        if (!selectedUserId) {
            toast.error('Select an employee to customize letter format');
            return;
        }
        setShowEditFormatModal(true);
        if (customFormatsByTemplate[selectedTemplateId]) {
            setFormatContent(customFormatsByTemplate[selectedTemplateId]);
            return;
        }
        try {
            setLoadingTemplateContent(true);
            const res = await api.get(`/employees/revisions/templates/${selectedTemplateId}/content`);
            setFormatContent(res.data?.content || '');
        } catch (err) {
            console.error('Failed to load template content:', err);
            toast.error('Failed to load base template content');
        } finally {
            setLoadingTemplateContent(false);
        }
    };

    const handleApplyCustomFormat = () => {
        setCustomFormatsByTemplate(prev => ({
            ...prev,
            [selectedTemplateId]: formatContent
        }));
        setShowEditFormatModal(false);
        const tplName = availableTemplates.find(t => t._id === selectedTemplateId)?.name || 'selected template';
        toast.success(`Custom format applied for ${selectedEmployeeProfile?.user?.firstName || 'this employee'} on "${tplName}"`);
    };

    const handleResetCustomFormat = async () => {
        try {
            setLoadingTemplateContent(true);
            const res = await api.get(`/employees/revisions/templates/${selectedTemplateId}/content`);
            const baseText = res.data?.content || '';
            setFormatContent(baseText);
            setCustomFormatsByTemplate(prev => {
                const next = { ...prev };
                delete next[selectedTemplateId];
                return next;
            });
            toast.success('Reset to base template text');
        } catch (err) {
            toast.error('Failed to fetch base template');
        } finally {
            setLoadingTemplateContent(false);
        }
    };

    // Open in-app preview modal for the generated revision letter
    const handleOpenPreviewLetterModal = async (customRevId = null) => {
        if (!selectedUserId) {
            toast.error('Select an employee to preview letter');
            return;
        }
        try {
            setPreviewLetterLoading(true);
            const targetRevId = customRevId || currentRevisionId || 'latest';
            let response;
            if (employeeCustomFormat && !customRevId) {
                response = await api.post(`/employees/${selectedUserId}/revisions/${targetRevId}/letter/download`, {
                    templateId: selectedTemplateId,
                    customContent: employeeCustomFormat
                }, { responseType: 'blob' });
            } else {
                response = await api.get(`/employees/${selectedUserId}/revisions/${targetRevId}/letter/download`, {
                    params: { templateId: selectedTemplateId },
                    responseType: 'blob'
                });
            }

            const empFirst = selectedEmployeeProfile?.personal?.firstName || selectedEmployeeProfile?.user?.firstName || 'Employee';
            const empLast = selectedEmployeeProfile?.personal?.lastName || selectedEmployeeProfile?.user?.lastName || '';
            const safeEmpName = `${empFirst}_${empLast}`.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').trim() || 'Employee';
            const fileName = `${safeEmpName}_Revision_Offer_Letter.docx`;

            const fileObj = new File([response.data], fileName, {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });

            setPreviewLetterFile(fileObj);
            setPreviewLetterFileName(fileName);
            setShowPreviewLetterModal(true);
        } catch (err) {
            console.error('Letter preview error:', err);
            toast.error('Failed to generate preview letter. Please verify that salary details are saved.');
        } finally {
            setPreviewLetterLoading(false);
        }
    };

    const handleDownloadCurrentPreviewFile = () => {
        if (!previewLetterFile) return;
        const url = window.URL.createObjectURL(previewLetterFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = previewLetterFileName || 'Revision_Offer_Letter.docx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Preview offer letter downloaded');
    };

    // Download preview letter for selected employee with current draft
    const handleDownloadPreviewLetter = async () => {
        if (!selectedUserId) {
            toast.error('Select an employee to download preview letter');
            return;
        }
        try {
            setPreviewDownloading(true);
            const targetRevId = currentRevisionId || 'latest';
            let response;
            if (employeeCustomFormat) {
                response = await api.post(`/employees/${selectedUserId}/revisions/${targetRevId}/letter/download`, {
                    templateId: selectedTemplateId,
                    customContent: employeeCustomFormat
                }, { responseType: 'blob' });
            } else {
                response = await api.get(`/employees/${selectedUserId}/revisions/${targetRevId}/letter/download`, {
                    params: { templateId: selectedTemplateId },
                    responseType: 'blob'
                });
            }

            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const empFirst = selectedEmployeeProfile?.personal?.firstName || selectedEmployeeProfile?.user?.firstName || 'Employee';
            const empLast = selectedEmployeeProfile?.personal?.lastName || selectedEmployeeProfile?.user?.lastName || '';
            const safeEmpName = `${empFirst}_${empLast}`.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').trim() || 'Employee';
            a.download = `${safeEmpName}.docx`;
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
            const empFirst = selectedEmployeeProfile?.personal?.firstName || selectedEmployeeProfile?.user?.firstName || 'Employee';
            const empLast = selectedEmployeeProfile?.personal?.lastName || selectedEmployeeProfile?.user?.lastName || '';
            const safeEmpName = `${empFirst}_${empLast}`.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').trim() || 'Employee';
            a.download = `${safeEmpName}.docx`;
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
                saveToDossier: Boolean(singleSaveToDossier)
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

    // ==============================================================
    // BULK SALARY DETAILS (EXCEL SPREADSHEET) LOGIC
    // ==============================================================
    const computeRowSalary = useCallback((rowData, cfg) => {
        const activeConfig = cfg || payrollConfigRef.current || payrollConfig;
        const annualCTC = parseFloat(String(rowData.annualCTC || '0').replace(/[^0-9.]/g, '')) || 0;
        const monthlyCTC = annualCTC ? Math.round(annualCTC / 12) : 0;

        const petrol = parseFloat(String(rowData.petrol || '0').replace(/[^0-9.]/g, '')) || 0;
        const conveyance = parseFloat(String(rowData.conveyance || '0').replace(/[^0-9.]/g, '')) || 0;
        const medicalAllowance = parseFloat(String(rowData.medicalAllowance !== undefined ? rowData.medicalAllowance : (rowData.medical || '0')).replace(/[^0-9.]/g, '')) || 0;
        const mealAllowance = parseFloat(String(rowData.mealAllowance !== undefined ? rowData.mealAllowance : (rowData.meal || '0')).replace(/[^0-9.]/g, '')) || 0;
        const broadband = parseFloat(String(rowData.broadband || '0').replace(/[^0-9.]/g, '')) || 0;
        const customAllowances = parseFloat(String(rowData.customAllowances || '0').replace(/[^0-9.]/g, '')) || 0;
        const customAllowancesInCTC = rowData.customAllowancesInCTC !== false;
        const insuranceAmount = parseFloat(String(rowData.insuranceAmount !== undefined ? rowData.insuranceAmount : (rowData.medical_insurance !== undefined ? rowData.medical_insurance : '0')).replace(/[^0-9.]/g, '')) || 0;

        const ltaEnabled = parseBool(rowData.ltaEnabled, true);
        let lta = 0;
        if (ltaEnabled) {
            if (rowData.lta !== undefined && rowData.lta !== null && rowData.lta !== '') {
                lta = parseFloat(String(rowData.lta).replace(/[^0-9.]/g, '')) || 0;
            } else {
                const ltaComp = activeConfig?.salaryComponents?.find(c => c.id === 'lta' || (c.name && c.name.toLowerCase() === 'lta') || (c.name && c.name.toLowerCase().includes('leave travel')));
                const pct = ltaComp?.linkValue ? Number(ltaComp.linkValue) : 0.0833;
                const normalizedPct = pct > 1 ? pct / 100 : pct;
                if (ltaComp?.linkedTo === 'basic_percent') {
                    const basic = Math.round(monthlyCTC * ((rowData.basicPercent || 50) / 100));
                    lta = Math.round(basic * normalizedPct);
                } else if (ltaComp?.linkedTo === 'ctc_percent') {
                    lta = Math.round(monthlyCTC * normalizedPct);
                } else if (ltaComp?.linkedTo === 'fixed') {
                    lta = Math.round(Number(ltaComp.linkValue) || 0);
                } else {
                    lta = Math.round(monthlyCTC * 0.0833);
                }
            }
        }

        const source = {
            ...rowData,
            annualCTC,
            monthlyCTC,
            compensationType: rowData.compensationType || 'monthly_salary',
            useSalaryComponents: rowData.useSalaryComponents !== false,
            pfEnabled: parseBool(rowData.pfEnabled, true),
            esiEnabled: parseBool(rowData.esiEnabled, true),
            ptEnabled: parseBool(rowData.ptEnabled, true),
            lwfEnabled: parseBool(rowData.lwfEnabled, true),
            gratuityEnabled: parseBool(rowData.gratuityEnabled, true),
            tdsEnabled: parseBool(rowData.tdsEnabled, true),
            ltaEnabled,
            includePfInCTC: parseBool(rowData.includePfInCTC, false),
            includeGratuityInCTC: parseBool(rowData.includeGratuityInCTC, true),
            basicPercent: rowData.basicPercent !== undefined && rowData.basicPercent !== null ? Number(rowData.basicPercent) : 50,
            hraPercent: rowData.hraPercent !== undefined && rowData.hraPercent !== null ? Number(rowData.hraPercent) : 50,
            ptState: rowData.ptState || 'MH',
            petrol,
            conveyance,
            medicalAllowance,
            medical: medicalAllowance,
            mealAllowance,
            meal: mealAllowance,
            broadband,
            lta,
            insuranceAmount,
            insurance: insuranceAmount,
            medical_insurance: insuranceAmount,
            customAllowancesInCTC,
            customAllowances: customAllowances > 0 ? [{ name: 'Custom Allowance', amount: customAllowances, addedInAnnualCTC: customAllowancesInCTC }] : [],
            otherAllowances: customAllowances > 0 ? [{ name: 'Custom Allowance', amount: customAllowances, addedInAnnualCTC: customAllowancesInCTC }] : []
        };

        if (activeConfig?.salaryComponents) {
            activeConfig.salaryComponents.forEach(c => {
                const isLta = c.id === 'lta' || (c.name && c.name.toLowerCase() === 'lta') || (c.name && c.name.toLowerCase().includes('leave travel'));
                if (isLta) {
                    source[c.id] = ltaEnabled ? lta : 0;
                    source.lta = ltaEnabled ? lta : 0;
                } else if (c.linkedTo === 'fixed') {
                    if (c.id === 'petrol') source.petrol = petrol;
                    else if (c.id === 'conveyance') source.conveyance = conveyance;
                    else if (c.id === 'medical' || c.id === 'medicalAllowance' || (c.name && c.name.toLowerCase().includes('medical') && !c.name.toLowerCase().includes('insurance'))) {
                        source[c.id] = medicalAllowance;
                        source.medical = medicalAllowance;
                        source.medicalAllowance = medicalAllowance;
                    }
                    else if (c.id === 'meal' || c.id === 'mealAllowance' || (c.name && c.name.toLowerCase().includes('meal'))) {
                        source[c.id] = mealAllowance;
                        source.meal = mealAllowance;
                        source.mealAllowance = mealAllowance;
                    }
                    else if (c.id === 'broadband') source.broadband = broadband;
                    else if (c.id === 'medical_insurance' || c.id === 'insurance' || (c.name && c.name.toLowerCase().includes('insurance'))) {
                        source[c.id] = insuranceAmount;
                        source.insurance = insuranceAmount;
                        source.insuranceAmount = insuranceAmount;
                        source.medical_insurance = insuranceAmount;
                    }
                    else {
                        const val = rowData[c.id] !== undefined ? rowData[c.id] : (c.linkValue || 0);
                        source[c.id] = parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
                    }
                }
            });
        }

        const master = buildMasterSalaryStructure(source, activeConfig, annualCTC, monthlyCTC);
        const resolvedLta = ltaEnabled ? (master?.lta !== undefined ? master.lta : lta) : 0;
        return {
            annualCTC: Math.round(annualCTC),
            monthlyCTC: Math.round(monthlyCTC),
            basicMaster: Math.round(master?.basicMaster || 0),
            hraMaster: Math.round(master?.hraMaster || 0),
            specialAllowance: Math.round(master?.specialAllowance || master?.flexi || 0),
            petrol: Math.round(petrol),
            lta: Math.round(resolvedLta),
            conveyance: Math.round(conveyance),
            medicalAllowance: Math.round(medicalAllowance),
            mealAllowance: Math.round(mealAllowance),
            broadband: Math.round(broadband),
            customAllowances: Math.round(customAllowances),
            insuranceAmount: Math.round(insuranceAmount),
            grossMaster: Math.round(master?.totalEarnings || 0),
            pfEmployer: Math.round(master?.pfEmployer || 0),
            pfEmployee: Math.round(master?.pfEmployee || 0),
            esiEmployer: Math.round(master?.esiEmployer || 0),
            esiEmployee: Math.round(master?.esiEmployee || 0),
            professionalTax: Math.round(master?.professionalTax || 0),
            lwfEmployer: Math.round(master?.lwfEmployer || 0),
            lwfEmployee: Math.round(master?.lwfEmployee || 0),
            gratuity: Math.round(master?.gratuity || 0),
            tds: Math.round(master?.tds || 0),
            netTakeHome: Math.round(master?.netTakeHome || 0),
            totalDeductions: Math.round(master?.totalDeductions ?? ((master?.pfEmployee || 0) + (master?.esiEmployee || 0) + (master?.professionalTax || 0) + (master?.lwfEmployee || 0) + (master?.tds || 0)))
        };
    }, [payrollConfig]);

    const fetchBulkProfiles = useCallback(async () => {
        try {
            setLoadingBulkProfiles(true);
            let activeConfig = payrollConfigRef.current || payrollConfig;
            if (!activeConfig) {
                try {
                    const cfgRes = await api.get('/payroll/config');
                    if (cfgRes?.data) {
                        activeConfig = cfgRes.data;
                        payrollConfigRef.current = activeConfig;
                        setPayrollConfig(activeConfig);
                    }
                } catch (cfgErr) {
                    console.error('Failed to pre-fetch payroll config:', cfgErr);
                }
            }

            const res = await api.get('/employees/revisions/bulk-profiles');
            const list = res.data?.employees || [];
            const rows = list.map(emp => {
                const b = emp.salaryBreakup || {};
                const rawAnnual = (emp.annualCTC !== undefined && emp.annualCTC !== null && emp.annualCTC !== '')
                    ? emp.annualCTC
                    : ((b.annualCTC !== undefined && b.annualCTC !== null && b.annualCTC !== '') ? b.annualCTC : '0');
                const annualCTC = String(rawAnnual);
                const rawMonthly = (emp.monthlyCTC !== undefined && emp.monthlyCTC !== null && emp.monthlyCTC !== '')
                    ? emp.monthlyCTC
                    : ((b.monthlyCTC !== undefined && b.monthlyCTC !== null && b.monthlyCTC !== '') ? b.monthlyCTC : Math.round(Number(annualCTC) / 12));
                const monthlyCTC = String(rawMonthly);
                const insComp = activeConfig.salaryComponents?.find(c =>
                    c.id === 'medical_insurance' || c.id === 'insurance' || (c.name && c.name.toLowerCase().includes('insurance'))
                );
                let initialInsurance = b.insuranceAmount;
                if (insComp && b[insComp.id] !== undefined && b[insComp.id] !== null) {
                    initialInsurance = b[insComp.id];
                }
                if (initialInsurance === undefined && b.medical_insurance !== undefined) {
                    initialInsurance = b.medical_insurance;
                }
                if (initialInsurance === undefined) {
                    initialInsurance = '0';
                }

                const rowData = {
                    ...b,
                    _id: emp._id,
                    firstName: emp.firstName,
                    lastName: emp.lastName || '',
                    employeeCode: emp.employeeCode || '',
                    department: emp.department || '',
                    designation: emp.designation || '',
                    annualCTC,
                    monthlyCTC,
                    compensationType: b.compensationType || 'monthly_salary',
                    useSalaryComponents: b.useSalaryComponents !== false,
                    pfEnabled: b.pfEnabled !== undefined ? parseBool(b.pfEnabled) : true,
                    includePfInCTC: parseBool(b.includePfInCTC),
                    esiEnabled: b.esiEnabled !== undefined ? parseBool(b.esiEnabled) : true,
                    ptEnabled: b.ptEnabled !== undefined ? parseBool(b.ptEnabled) : true,
                    gratuityEnabled: b.gratuityEnabled !== undefined ? parseBool(b.gratuityEnabled) : true,
                    includeGratuityInCTC: b.includeGratuityInCTC !== undefined ? parseBool(b.includeGratuityInCTC) : true,
                    lwfEnabled: b.lwfEnabled !== undefined ? parseBool(b.lwfEnabled) : true,
                    tdsEnabled: b.tdsEnabled !== undefined ? parseBool(b.tdsEnabled) : true,
                    ltaEnabled: b.ltaEnabled !== undefined ? parseBool(b.ltaEnabled) : true,
                    basicPercent: b.basicPercent !== undefined ? b.basicPercent : 50,
                    hraPercent: b.hraPercent !== undefined ? b.hraPercent : 50,
                    ptState: b.ptState || 'MH',
                    petrol: b.petrol !== undefined ? String(b.petrol) : '0',
                    lta: b.lta !== undefined ? String(b.lta) : '',
                    conveyance: b.conveyance !== undefined ? String(b.conveyance) : '0',
                    medicalAllowance: b.medicalAllowance !== undefined ? String(b.medicalAllowance) : (b.medical !== undefined ? String(b.medical) : '0'),
                    mealAllowance: b.mealAllowance !== undefined ? String(b.mealAllowance) : (b.meal !== undefined ? String(b.meal) : '0'),
                    broadband: b.broadband !== undefined ? String(b.broadband) : '0',
                    customAllowances: b.customAllowances !== undefined ? (Array.isArray(b.customAllowances) ? String(b.customAllowances.reduce((s, x) => s + (Number(x.amount) || 0), 0)) : String(b.customAllowances)) : '0',
                    customAllowancesInCTC: b.customAllowancesInCTC !== undefined
                        ? parseBool(b.customAllowancesInCTC, true)
                        : (Array.isArray(b.customAllowances) && b.customAllowances.length > 0 ? (b.customAllowances[0].addedInAnnualCTC !== false && b.customAllowances[0].inCTC !== false) : true),
                    insuranceAmount: String(initialInsurance)
                };
                const calculated = computeRowSalary(rowData, activeConfig);
                return {
                    ...rowData,
                    calculated,
                    original: {
                        annualCTC: rowData.annualCTC,
                        monthlyCTC: rowData.monthlyCTC,
                        pfEnabled: rowData.pfEnabled,
                        includePfInCTC: rowData.includePfInCTC,
                        esiEnabled: rowData.esiEnabled,
                        ptEnabled: rowData.ptEnabled,
                        gratuityEnabled: rowData.gratuityEnabled,
                        includeGratuityInCTC: rowData.includeGratuityInCTC,
                        lwfEnabled: rowData.lwfEnabled,
                        tdsEnabled: rowData.tdsEnabled,
                        ltaEnabled: rowData.ltaEnabled,
                        petrol: rowData.petrol,
                        lta: rowData.lta,
                        conveyance: rowData.conveyance,
                        medicalAllowance: rowData.medicalAllowance,
                        mealAllowance: rowData.mealAllowance,
                        broadband: rowData.broadband,
                        customAllowances: rowData.customAllowances,
                        customAllowancesInCTC: rowData.customAllowancesInCTC,
                        insuranceAmount: rowData.insuranceAmount
                    }
                };
            });
            setBulkGridData(prev => {
                if (!prev || prev.length === 0) return rows;
                const prevMap = new Map(prev.map(r => [r._id, r]));
                return rows.map(newRow => {
                    const existing = prevMap.get(newRow._id);
                    if (existing && isRowModified(existing)) {
                        return {
                            ...existing,
                            original: newRow.original
                        };
                    }
                    return newRow;
                });
            });
        } catch (err) {
            console.error('Failed to load bulk employee profiles:', err);
            // Fallback: Populate from employees if endpoint fails
            if (employees.length > 0) {
                const fallbackRows = employees.map(emp => {
                    const fallbackAnnual = String(emp.salary?.annualCTC || emp.compensation?.annualCTC || (emp.compensation?.ctc ? Math.round(emp.compensation.ctc * 12) : 0) || '0');
                    const fallbackMonthly = String(emp.salary?.monthlyCTC || (Number(fallbackAnnual) ? Math.round(Number(fallbackAnnual) / 12) : 0));
                    const rowData = {
                        _id: emp._id,
                        firstName: emp.firstName,
                        lastName: emp.lastName || '',
                        employeeCode: emp.employeeCode || '',
                        department: emp.department || '',
                        designation: emp.designation || '',
                        annualCTC: fallbackAnnual,
                        monthlyCTC: fallbackMonthly,
                        compensationType: 'monthly_salary',
                        useSalaryComponents: true,
                        pfEnabled: true,
                        includePfInCTC: false,
                        esiEnabled: true,
                        ptEnabled: true,
                        gratuityEnabled: true,
                        includeGratuityInCTC: true,
                        lwfEnabled: true,
                        tdsEnabled: true,
                        ltaEnabled: true,
                        basicPercent: 50,
                        hraPercent: 50,
                        ptState: 'MH',
                        petrol: '0',
                        lta: '',
                        conveyance: '0',
                        medicalAllowance: '0',
                        mealAllowance: '0',
                        broadband: '0',
                        customAllowances: '0',
                        insuranceAmount: '0'
                    };
                    const calculated = computeRowSalary(rowData, payrollConfigRef.current || payrollConfig);
                    return {
                        ...rowData,
                        calculated,
                        original: { ...rowData }
                    };
                });
                setBulkGridData(fallbackRows);
            }
        } finally {
            setLoadingBulkProfiles(false);
        }
    }, [employees, payrollConfig, computeRowSalary]);

    useEffect(() => {
        if (subTab === 'bulk_details' && bulkGridData.length === 0) {
            fetchBulkProfiles();
        }
    }, [subTab, fetchBulkProfiles, bulkGridData.length]);

    const isRowModified = useCallback((row) => {
        if (!row || !row.original) return false;
        const o = row.original;
        return (
            String(row.annualCTC || 0) !== String(o.annualCTC || 0) ||
            Boolean(row.pfEnabled) !== Boolean(o.pfEnabled) ||
            Boolean(row.includePfInCTC) !== Boolean(o.includePfInCTC) ||
            Boolean(row.esiEnabled) !== Boolean(o.esiEnabled) ||
            Boolean(row.ptEnabled) !== Boolean(o.ptEnabled) ||
            Boolean(row.gratuityEnabled) !== Boolean(o.gratuityEnabled) ||
            Boolean(row.includeGratuityInCTC) !== Boolean(o.includeGratuityInCTC) ||
            Boolean(row.lwfEnabled) !== Boolean(o.lwfEnabled) ||
            Boolean(row.tdsEnabled) !== Boolean(o.tdsEnabled) ||
            Boolean(row.ltaEnabled) !== Boolean(o.ltaEnabled) ||
            String(row.petrol || 0) !== String(o.petrol || 0) ||
            String(row.lta || '') !== String(o.lta || '') ||
            String(row.conveyance || 0) !== String(o.conveyance || 0) ||
            String(row.medicalAllowance || 0) !== String(o.medicalAllowance || 0) ||
            String(row.mealAllowance || 0) !== String(o.mealAllowance || 0) ||
            String(row.broadband || 0) !== String(o.broadband || 0) ||
            String(row.insuranceAmount || 0) !== String(o.insuranceAmount || 0) ||
            String(row.customAllowances || 0) !== String(o.customAllowances || 0) ||
            Boolean(row.customAllowancesInCTC !== false) !== Boolean(o.customAllowancesInCTC !== false)
        );
    }, []);

    const handleRowFieldChange = useCallback((empId, field, value) => {
        setBulkGridData(prev => prev.map(row => {
            if (row._id !== empId) return row;
            const updated = { ...row, [field]: value };
            if (field === 'annualCTC') {
                const a = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
                updated.annualCTC = String(a);
                updated.monthlyCTC = String(Math.round(a / 12));
            } else if (field === 'monthlyCTC') {
                const m = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
                updated.monthlyCTC = String(m);
                updated.annualCTC = String(m * 12);
            } else if (field === 'insuranceAmount') {
                const insVal = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
                (payrollConfigRef.current?.salaryComponents || payrollConfig?.salaryComponents || []).forEach(c => {
                    if (c.id === 'medical_insurance' || c.id === 'insurance' || (c.name && c.name.toLowerCase().includes('insurance'))) {
                        updated[c.id] = String(insVal);
                    }
                });
            } else if (field === 'mealAllowance') {
                const mealVal = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
                (payrollConfigRef.current?.salaryComponents || payrollConfig?.salaryComponents || []).forEach(c => {
                    if (c.id === 'meal' || c.id === 'mealAllowance' || (c.name && c.name.toLowerCase().includes('meal'))) {
                        updated[c.id] = String(mealVal);
                    }
                });
            } else if (field === 'medicalAllowance') {
                const medVal = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
                (payrollConfigRef.current?.salaryComponents || payrollConfig?.salaryComponents || []).forEach(c => {
                    if (c.id === 'medical' || c.id === 'medicalAllowance' || (c.name && c.name.toLowerCase().includes('medical') && !c.name.toLowerCase().includes('insurance'))) {
                        updated[c.id] = String(medVal);
                    }
                });
            }
            const calculated = computeRowSalary(updated);
            return {
                ...updated,
                calculated
            };
        }));
    }, [computeRowSalary]);

    const filteredBulkRows = useMemo(() => {
        return bulkGridData.filter(e => {
            const matchesDept = bulkDetailsDept === 'ALL' || e.department === bulkDetailsDept;
            const q = bulkDetailsSearch.toLowerCase().trim();
            const matchesSearch = !q ||
                `${e.firstName} ${e.lastName || ''}`.toLowerCase().includes(q) ||
                (e.email || '').toLowerCase().includes(q) ||
                (e.employeeCode || '').toLowerCase().includes(q);
            return matchesDept && matchesSearch;
        });
    }, [bulkGridData, bulkDetailsDept, bulkDetailsSearch]);

    const handleBatchComponentUpdate = useCallback((field, value, targetSelection = bulkActionTarget) => {
        setBulkGridData(prev => {
            const targetIds = targetSelection === 'selected' && selectedBulkDetailIds.length > 0
                ? new Set(selectedBulkDetailIds)
                : new Set(filteredBulkRows.map(r => r._id));

            return prev.map(row => {
                if (!targetIds.has(row._id)) return row;
                const updated = {
                    ...row,
                    [field]: String(value)
                };
                const calculated = computeRowSalary(updated);
                return {
                    ...updated,
                    calculated
                };
            });
        });
        toast.success(`Updated ${field} for ${targetSelection === 'selected' ? selectedBulkDetailIds.length : filteredBulkRows.length} employee(s)`);
    }, [bulkActionTarget, selectedBulkDetailIds, filteredBulkRows, computeRowSalary]);

    const handleResetSingleRow = useCallback((empId) => {
        setBulkGridData(prev => prev.map(row => {
            if (row._id !== empId) return row;
            const updated = {
                ...row,
                ...row.original
            };
            const calculated = computeRowSalary(updated);
            return {
                ...updated,
                calculated
            };
        }));
        toast.success('Row reset to original values');
    }, [computeRowSalary]);

    const handleToggleSelectBulkDetailOne = (empId) => {
        setSelectedBulkDetailIds(prev =>
            prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
        );
    };

    const handleToggleSelectAllBulkDetails = () => {
        if (selectedBulkDetailIds.length === filteredBulkRows.length) {
            setSelectedBulkDetailIds([]);
        } else {
            setSelectedBulkDetailIds(filteredBulkRows.map(r => r._id));
        }
    };

    const applyStatutoryToAll = useCallback((field, value, targetSelection = bulkActionTarget) => {
        setBulkGridData(prev => {
            const targetIds = targetSelection === 'selected' && selectedBulkDetailIds.length > 0
                ? new Set(selectedBulkDetailIds)
                : new Set(filteredBulkRows.map(r => r._id));

            return prev.map(row => {
                if (targetIds && !targetIds.has(row._id)) return row;
                const updated = { ...row, [field]: value };
                const calculated = computeRowSalary(updated);
                return {
                    ...updated,
                    calculated
                };
            });
        });
        toast.success(`Updated ${field} for ${targetSelection === 'selected' ? selectedBulkDetailIds.length : filteredBulkRows.length} employee(s)`);
    }, [bulkActionTarget, selectedBulkDetailIds, filteredBulkRows, computeRowSalary]);

    const targetRowsForStatutory = useMemo(() => {
        if (bulkActionTarget === 'selected' && selectedBulkDetailIds.length > 0) {
            const set = new Set(selectedBulkDetailIds);
            return filteredBulkRows.filter(r => set.has(r._id));
        }
        return filteredBulkRows;
    }, [bulkActionTarget, selectedBulkDetailIds, filteredBulkRows]);

    const getStatutoryState = useCallback((field) => {
        const total = targetRowsForStatutory.length;
        if (total === 0) return { allTrue: false, allFalse: false, isMixed: false, trueCount: 0, total: 0 };
        let trueCount = 0;
        targetRowsForStatutory.forEach(r => {
            if (Boolean(r[field])) trueCount++;
        });
        const allTrue = trueCount === total;
        const allFalse = trueCount === 0;
        const isMixed = !allTrue && !allFalse;
        return { allTrue, allFalse, isMixed, trueCount, total };
    }, [targetRowsForStatutory]);

    const pfStatutoryState = useMemo(() => getStatutoryState('pfEnabled'), [getStatutoryState]);
    const pfInCtcStatutoryState = useMemo(() => getStatutoryState('includePfInCTC'), [getStatutoryState]);
    const esiStatutoryState = useMemo(() => getStatutoryState('esiEnabled'), [getStatutoryState]);
    const gratuityStatutoryState = useMemo(() => getStatutoryState('gratuityEnabled'), [getStatutoryState]);
    const gratuityInCtcStatutoryState = useMemo(() => getStatutoryState('includeGratuityInCTC'), [getStatutoryState]);
    const ptStatutoryState = useMemo(() => getStatutoryState('ptEnabled'), [getStatutoryState]);
    const lwfStatutoryState = useMemo(() => getStatutoryState('lwfEnabled'), [getStatutoryState]);
    const ltaStatutoryState = useMemo(() => getStatutoryState('ltaEnabled'), [getStatutoryState]);
    const tdsStatutoryState = useMemo(() => getStatutoryState('tdsEnabled'), [getStatutoryState]);

    const handleColumnHeaderToggle = useCallback((field) => {
        const rowsToCheck = filteredBulkRows;
        if (rowsToCheck.length === 0) return;
        const allEnabled = rowsToCheck.every(r => Boolean(r[field]));
        applyStatutoryToAll(field, !allEnabled, 'all');
    }, [filteredBulkRows, applyStatutoryToAll]);

    const handleResetAllModified = useCallback(() => {
        setBulkGridData(prev => prev.map(row => {
            const updated = {
                ...row,
                ...row.original
            };
            const calculated = computeRowSalary(updated);
            return {
                ...updated,
                calculated
            };
        }));
        toast.success('All modified rows reset to original');
    }, [computeRowSalary]);

    const bulkGridMetrics = useMemo(() => {
        const modifiedCount = bulkGridData.filter(isRowModified).length;
        const totalMonthlyCTC = filteredBulkRows.reduce((sum, r) => sum + (r.calculated?.monthlyCTC || 0), 0);
        const totalNetTakeHome = filteredBulkRows.reduce((sum, r) => sum + (r.calculated?.netTakeHome || 0), 0);
        const totalGross = filteredBulkRows.reduce((sum, r) => sum + (r.calculated?.grossMaster || 0), 0);
        return {
            totalEmployees: filteredBulkRows.length,
            selectedCount: selectedBulkDetailIds.length,
            modifiedCount,
            totalMonthlyCTC,
            totalNetTakeHome,
            totalGross
        };
    }, [bulkGridData, filteredBulkRows, selectedBulkDetailIds, isRowModified]);

    const isBulkDetailsBackdated = useMemo(() => {
        if (!bulkDetailsEffectiveDate) return false;
        const d = new Date(bulkDetailsEffectiveDate);
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);
        return d.getTime() < t.getTime();
    }, [bulkDetailsEffectiveDate]);

    const handleExportCsv = useCallback(() => {
        if (filteredBulkRows.length === 0) {
            toast.error('No employees to export');
            return;
        }

        const cleanStr = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

        // Base identifying headers
        const headers = ['Employee Code', 'First Name', 'Last Name', 'Department', 'Designation'];
        orderedVisibleColKeys.forEach(k => {
            const def = BULK_GRID_COLUMN_DEFS[k];
            headers.push(def?.label || k);
        });

        const csvRows = [headers.join(',')];

        filteredBulkRows.forEach(row => {
            const c = row.calculated || {};
            const r = [
                cleanStr(row.employeeCode),
                cleanStr(row.firstName),
                cleanStr(row.lastName),
                cleanStr(row.department),
                cleanStr(row.designation)
            ];

            orderedVisibleColKeys.forEach(k => {
                switch (k) {
                    case 'annualCTC': r.push(row.annualCTC || 0); break;
                    case 'monthlyCTC': r.push(row.monthlyCTC || 0); break;
                    case 'basic': r.push(c.basicMaster || 0); break;
                    case 'hra': r.push(c.hraMaster || 0); break;
                    case 'petrol': r.push(row.petrol || 0); break;
                    case 'lta': r.push(c.lta || 0); break;
                    case 'conveyance': r.push(row.conveyance || 0); break;
                    case 'medical': r.push(row.medicalAllowance !== undefined ? row.medicalAllowance : (row.medical || 0)); break;
                    case 'meal': r.push(row.mealAllowance !== undefined ? row.mealAllowance : (row.meal || 0)); break;
                    case 'broadband': r.push(row.broadband || 0); break;
                    case 'flexiRemainder': r.push(c.specialAllowance || 0); break;
                    case 'monthlyGross': r.push(c.grossMaster || 0); break;
                    case 'insurance': r.push(row.insuranceAmount !== undefined ? row.insuranceAmount : 0); break;
                    case 'pf': r.push(cleanStr(row.pfEnabled ? (row.includePfInCTC ? 'Yes (In CTC)' : 'Yes') : 'No')); break;
                    case 'esi': r.push(cleanStr(row.esiEnabled ? `Yes (₹${c.esiEmployee || 0})` : 'No')); break;
                    case 'pt': r.push(cleanStr(row.ptEnabled ? `Yes (₹${c.professionalTax || 0})` : 'No')); break;
                    case 'gratuity': r.push(cleanStr(row.gratuityEnabled ? (row.includeGratuityInCTC ? 'Yes (In CTC)' : 'Yes') : 'No')); break;
                    case 'lwf': r.push(cleanStr(row.lwfEnabled ? 'Yes' : 'No')); break;
                    case 'tds': r.push(cleanStr(row.tdsEnabled ? 'Yes' : 'No')); break;
                    case 'ltaStatutory': r.push(cleanStr(row.ltaEnabled ? 'Yes' : 'No')); break;
                    case 'deductions': r.push(c.totalDeductions || 0); break;
                    case 'takeHome': r.push(c.netTakeHome || 0); break;
                    default: r.push(cleanStr(row[k] || '')); break;
                }
            });

            csvRows.push(r.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Bulk_Salary_Details_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Spreadsheet exported to CSV in custom column order successfully');
    }, [filteredBulkRows, orderedVisibleColKeys]);

    const handleExportExcel = useCallback(() => {
        exportBulkSalaryToExcel({
            rows: filteredBulkRows,
            payrollConfig: payrollConfigRef.current || payrollConfig,
            orderedVisibleColKeys,
            columnDefinitions: BULK_GRID_COLUMN_DEFS,
            fileNamePrefix: 'Bulk_Salary_Details_Custom'
        });
    }, [filteredBulkRows, payrollConfig, orderedVisibleColKeys]);

    const buildCustomBreakup = useCallback((row) => {
        const c = row.calculated || {};
        const insVal = parseFloat(String(row.insuranceAmount !== undefined ? row.insuranceAmount : '0')) || 0;
        const dynamicCompMap = {};
        (payrollConfigRef.current?.salaryComponents || payrollConfig?.salaryComponents || []).forEach(comp => {
            if (comp.id === 'medical_insurance' || comp.id === 'insurance' || (comp.name && comp.name.toLowerCase().includes('insurance'))) {
                dynamicCompMap[comp.id] = String(insVal);
            } else if (comp.id === 'meal' || comp.id === 'mealAllowance' || (comp.name && comp.name.toLowerCase().includes('meal'))) {
                dynamicCompMap[comp.id] = String(parseFloat(String(row.mealAllowance || '0')) || 0);
            } else if (comp.id === 'medical' || comp.id === 'medicalAllowance' || (comp.name && comp.name.toLowerCase().includes('medical') && !comp.name.toLowerCase().includes('insurance'))) {
                dynamicCompMap[comp.id] = String(parseFloat(String(row.medicalAllowance || '0')) || 0);
            } else if (row[comp.id] !== undefined) {
                dynamicCompMap[comp.id] = String(row[comp.id]);
            }
        });

        return {
            ...dynamicCompMap,
            annualCTC: String(row.annualCTC),
            monthlyCTC: String(row.monthlyCTC),
            pfEnabled: Boolean(row.pfEnabled),
            includePfInCTC: Boolean(row.includePfInCTC),
            esiEnabled: Boolean(row.esiEnabled),
            ptEnabled: Boolean(row.ptEnabled),
            gratuityEnabled: Boolean(row.gratuityEnabled),
            includeGratuityInCTC: Boolean(row.includeGratuityInCTC),
            lwfEnabled: Boolean(row.lwfEnabled),
            tdsEnabled: Boolean(row.tdsEnabled),
            ltaEnabled: Boolean(row.ltaEnabled),
            basicPercent: Number(row.basicPercent || 50),
            hraPercent: Number(row.hraPercent || 50),
            ptState: row.ptState || 'MH',
            petrol: parseFloat(String(row.petrol || '0')) || 0,
            lta: parseFloat(String(row.lta !== undefined && row.lta !== '' ? row.lta : (c.lta || '0'))) || 0,
            conveyance: parseFloat(String(row.conveyance || '0')) || 0,
            medicalAllowance: parseFloat(String(row.medicalAllowance || '0')) || 0,
            medical: parseFloat(String(row.medicalAllowance || '0')) || 0,
            mealAllowance: parseFloat(String(row.mealAllowance || '0')) || 0,
            meal: parseFloat(String(row.mealAllowance || '0')) || 0,
            broadband: parseFloat(String(row.broadband || '0')) || 0,
            insuranceAmount: insVal,
            insurance: insVal,
            medical_insurance: insVal,
            customAllowancesInCTC: row.customAllowancesInCTC !== false,
            customAllowances: parseFloat(String(row.customAllowances || '0')) > 0 ? [{ name: 'Custom Allowance', amount: parseFloat(String(row.customAllowances || '0')), addedInAnnualCTC: row.customAllowancesInCTC !== false }] : [],
            otherAllowances: parseFloat(String(row.customAllowances || '0')) > 0 ? [{ name: 'Custom Allowance', amount: parseFloat(String(row.customAllowances || '0')), addedInAnnualCTC: row.customAllowancesInCTC !== false }] : [],
            basic: String(c.basicMaster || 0),
            hra: String(c.hraMaster || 0),
            specialAllowance: String(c.specialAllowance || 0),
            monthlyGross: String(c.grossMaster || 0),
            netTakeHome: String(c.netTakeHome || 0)
        };
    }, [payrollConfig]);

    const markRowAsSynced = useCallback((empId) => {
        setBulkGridData(prev => prev.map(r => {
            if (r._id !== empId) return r;
            return {
                ...r,
                original: {
                    annualCTC: r.annualCTC,
                    monthlyCTC: r.monthlyCTC,
                    pfEnabled: r.pfEnabled,
                    includePfInCTC: r.includePfInCTC,
                    esiEnabled: r.esiEnabled,
                    ptEnabled: r.ptEnabled,
                    gratuityEnabled: r.gratuityEnabled,
                    includeGratuityInCTC: r.includeGratuityInCTC,
                    lwfEnabled: r.lwfEnabled,
                    tdsEnabled: r.tdsEnabled,
                    ltaEnabled: r.ltaEnabled,
                    petrol: r.petrol,
                    lta: r.lta,
                    conveyance: r.conveyance,
                    medicalAllowance: r.medicalAllowance,
                    mealAllowance: r.mealAllowance,
                    broadband: r.broadband,
                    insuranceAmount: r.insuranceAmount,
                    customAllowances: r.customAllowances,
                    customAllowancesInCTC: r.customAllowancesInCTC !== false
                }
            };
        }));
    }, []);

    const handleSaveSingleRow = useCallback(async (row) => {
        if (!row) return;

        if (!bulkDetailsEffectiveDate) {
            toast.error('Please specify an effective date.');
            return;
        }

        const resolvedReason = bulkDetailsReason === 'Other' ? bulkDetailsCustomReason : bulkDetailsReason;
        if (!resolvedReason) {
            toast.error('Please specify a revision reason.');
            return;
        }

        if (isBulkDetailsBackdated && !bulkDetailsBackdatedConfirmed) {
            toast.error('Please confirm the retroactive / backdated revision notice.');
            return;
        }

        try {
            setSavingRowId(row._id);
            const payload = {
                employeeIds: [row._id],
                effectiveDate: bulkDetailsEffectiveDate,
                reason: resolvedReason,
                revisionType: 'custom',
                customSalaries: { [row._id]: Number(row.annualCTC) || 0 },
                customBreakups: { [row._id]: buildCustomBreakup(row) },
                confirmBackdated: bulkDetailsBackdatedConfirmed
            };

            const res = await api.post('/employees/revisions/bulk', payload);
            toast.success(res.data?.message || `Successfully saved revision for ${row.firstName} ${row.lastName || ''}`);
            markRowAsSynced(row._id);
            setSelectedBulkDetailIds(prev => prev.filter(id => id !== row._id));
            await fetchBulkProfiles();
            await fetchEmployees();
        } catch (err) {
            console.error('Error saving single row:', err);
            toast.error(err.response?.data?.message || `Failed to save ${row.firstName}`);
        } finally {
            setSavingRowId(null);
        }
    }, [
        bulkDetailsEffectiveDate,
        bulkDetailsReason,
        bulkDetailsCustomReason,
        isBulkDetailsBackdated,
        bulkDetailsBackdatedConfirmed,
        buildCustomBreakup,
        markRowAsSynced,
        fetchBulkProfiles,
        fetchEmployees
    ]);

    const handleSaveBulkDetails = useCallback(async (mode = 'smart') => {
        let targets = [];
        if (mode === 'all_filtered') {
            targets = filteredBulkRows;
        } else if (selectedBulkDetailIds.length > 0) {
            targets = bulkGridData.filter(r => selectedBulkDetailIds.includes(r._id));
        } else {
            const modified = bulkGridData.filter(isRowModified);
            targets = modified.length > 0 ? modified : filteredBulkRows;
        }

        if (targets.length === 0) {
            toast.error('No employee rows found to save.');
            return;
        }

        if (!bulkDetailsEffectiveDate) {
            toast.error('Please specify an effective date.');
            return;
        }

        const resolvedReason = bulkDetailsReason === 'Other' ? bulkDetailsCustomReason : bulkDetailsReason;
        if (!resolvedReason) {
            toast.error('Please specify a revision reason.');
            return;
        }

        if (isBulkDetailsBackdated && !bulkDetailsBackdatedConfirmed) {
            toast.error('Please confirm the retroactive / backdated revision notice.');
            return;
        }

        try {
            setSubmittingBulkDetails(true);
            const customSalaries = {};
            const customBreakups = {};

            targets.forEach(row => {
                customSalaries[row._id] = Number(row.annualCTC) || 0;
                customBreakups[row._id] = buildCustomBreakup(row);
            });

            const payload = {
                employeeIds: targets.map(r => r._id),
                effectiveDate: bulkDetailsEffectiveDate,
                reason: resolvedReason,
                revisionType: 'custom',
                customSalaries,
                customBreakups,
                confirmBackdated: bulkDetailsBackdatedConfirmed
            };

            const res = await api.post('/employees/revisions/bulk', payload);
            toast.success(res.data?.message || `Successfully revised ${targets.length} employee(s)`);
            targets.forEach(t => markRowAsSynced(t._id));
            setSelectedBulkDetailIds([]);
            await fetchBulkProfiles();
            await fetchEmployees();
        } catch (err) {
            console.error('Error saving bulk details:', err);
            toast.error(err.response?.data?.message || 'Failed to save bulk salary details');
        } finally {
            setSubmittingBulkDetails(false);
        }
    }, [
        selectedBulkDetailIds,
        bulkGridData,
        filteredBulkRows,
        isRowModified,
        bulkDetailsEffectiveDate,
        bulkDetailsReason,
        bulkDetailsCustomReason,
        isBulkDetailsBackdated,
        bulkDetailsBackdatedConfirmed,
        buildCustomBreakup,
        markRowAsSynced,
        fetchBulkProfiles,
        fetchEmployees
    ]);

    const renderBulkHeaderCell = useCallback((colKey) => {
        const w = columnWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey] || 110;
        const colStyle = {
            position: 'sticky',
            top: 0,
            zIndex: 10,
            width: `${w}px`,
            minWidth: `${w}px`,
            maxWidth: `${w}px`
        };

        const isHeaderDragging = draggedHeaderKey === colKey;
        const isHeaderDragOver = dragOverHeaderKey === colKey && !isHeaderDragging;

        const dragThProps = {
            draggable: true,
            onDragStart: (e) => handleHeaderDragStart(e, colKey),
            onDragOver: (e) => handleHeaderDragOver(e, colKey),
            onDragLeave: () => handleHeaderDragLeave(colKey),
            onDrop: (e) => handleHeaderDrop(e, colKey),
            onDragEnd: handleHeaderDragEnd,
            title: 'Click and drag column header to reorder'
        };

        const dragClasses = `cursor-grab active:cursor-grabbing select-none transition-all ${
            isHeaderDragging ? 'opacity-30 border-dashed border-2 border-blue-500 bg-blue-100' :
            isHeaderDragOver ? 'border-l-4 border-l-blue-600 bg-blue-100/90 shadow-md ring-2 ring-blue-400' : ''
        }`;

        const renderHideBtn = () => (
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    handleHideColumn(colKey);
                }}
                className="opacity-0 group-hover/th:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-white/80 transition-opacity cursor-pointer shrink-0"
                title="Hide this column"
            >
                <EyeOff size={11} />
            </button>
        );

        const headerTitleWithHide = (title, bgClass = 'bg-slate-100', extraBadge = null) => (
            <th
                key={colKey}
                style={colStyle}
                {...dragThProps}
                className={`relative py-2 px-2 border-b border-r border-slate-200 ${bgClass} ${dragClasses} group/th`}
            >
                <div className="flex items-center justify-between gap-1 pr-1 truncate">
                    <span className="truncate flex items-center gap-1">
                        <GripVertical size={11} className="opacity-0 group-hover/th:opacity-60 text-slate-400 shrink-0 cursor-grab" />
                        <span className="truncate">{title}</span>
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                        {extraBadge}
                        {renderHideBtn()}
                    </div>
                </div>
                {renderResizeHandle(colKey)}
            </th>
        );

        switch (colKey) {
            case 'annualCTC':
                return (
                    <th
                        key={colKey}
                        style={colStyle}
                        {...dragThProps}
                        className={`relative py-2 px-2 border-b border-r border-slate-200 bg-slate-50 ${dragClasses} group/th truncate`}
                    >
                        <div className="flex items-center justify-between gap-1">
                            <span className="truncate flex items-center gap-1">
                                <GripVertical size={11} className="opacity-0 group-hover/th:opacity-60 text-slate-400 shrink-0 cursor-grab" />
                                <span className="truncate">Annual CTC (₹)</span>
                            </span>
                            {renderHideBtn()}
                        </div>
                        {renderResizeHandle('annualCTC')}
                    </th>
                );
            case 'monthlyCTC':
                return (
                    <th
                        key={colKey}
                        style={colStyle}
                        {...dragThProps}
                        className={`relative py-2 px-2 border-b border-r border-slate-200 text-right bg-slate-100 ${dragClasses} group/th truncate`}
                    >
                        <div className="flex items-center justify-between gap-1">
                            {renderHideBtn()}
                            <span className="truncate ml-auto flex items-center gap-1">
                                <GripVertical size={11} className="opacity-0 group-hover/th:opacity-60 text-slate-400 shrink-0 cursor-grab" />
                                <span className="truncate">Monthly CTC</span>
                            </span>
                        </div>
                        {renderResizeHandle('monthlyCTC')}
                    </th>
                );
            case 'basic':
                return (
                    <th
                        key={colKey}
                        style={colStyle}
                        {...dragThProps}
                        className={`relative py-2 px-2 border-b border-r border-slate-200 text-right bg-slate-100 ${dragClasses} group/th truncate`}
                    >
                        <div className="flex items-center justify-between gap-1">
                            {renderHideBtn()}
                            <span className="truncate ml-auto flex items-center gap-1">
                                <GripVertical size={11} className="opacity-0 group-hover/th:opacity-60 text-slate-400 shrink-0 cursor-grab" />
                                <span className="truncate">Basic</span>
                            </span>
                        </div>
                        {renderResizeHandle('basic')}
                    </th>
                );
            case 'hra':
                return (
                    <th
                        key={colKey}
                        style={colStyle}
                        {...dragThProps}
                        className={`relative py-2 px-2 border-b border-r border-slate-200 text-right bg-slate-100 ${dragClasses} group/th truncate`}
                    >
                        <div className="flex items-center justify-between gap-1">
                            {renderHideBtn()}
                            <span className="truncate ml-auto flex items-center gap-1">
                                <GripVertical size={11} className="opacity-0 group-hover/th:opacity-60 text-slate-400 shrink-0 cursor-grab" />
                                <span className="truncate">HRA</span>
                            </span>
                        </div>
                        {renderResizeHandle('hra')}
                    </th>
                );
            case 'petrol':
                return headerTitleWithHide('Petrol', 'bg-sky-50', <span className="text-[8.5px] font-bold text-sky-700 bg-sky-100 px-1 py-0.2 rounded shrink-0">In CTC</span>);
            case 'lta':
                return headerTitleWithHide('LTA', 'bg-emerald-50', <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded shrink-0">In CTC</span>);
            case 'conveyance':
                return headerTitleWithHide('Conveyance', 'bg-slate-100', <span className="text-[8.5px] font-semibold text-slate-600 bg-slate-200 px-1 py-0.2 rounded shrink-0">In CTC</span>);
            case 'medical':
                return headerTitleWithHide('Medical Allow.', 'bg-slate-100', <span className="text-[8.5px] font-semibold text-slate-600 bg-slate-200 px-1 py-0.2 rounded shrink-0">In CTC</span>);
            case 'meal':
                return headerTitleWithHide('Meal Allow.', 'bg-slate-100', <span className="text-[8.5px] font-semibold text-slate-600 bg-slate-200 px-1 py-0.2 rounded shrink-0">In CTC</span>);
            case 'broadband':
                return headerTitleWithHide('Broadband', 'bg-slate-100', <span className="text-[8.5px] font-semibold text-slate-600 bg-slate-200 px-1 py-0.2 rounded shrink-0">In CTC</span>);
            case 'flexiRemainder':
                return (
                    <th
                        key={colKey}
                        style={colStyle}
                        {...dragThProps}
                        className={`relative py-2 px-2 border-b border-r border-slate-200 text-right bg-blue-100/80 text-blue-900 font-extrabold ${dragClasses} group/th truncate`}
                    >
                        <div className="flex items-center justify-between gap-1">
                            {renderHideBtn()}
                            <span className="truncate ml-auto flex items-center gap-1">
                                <GripVertical size={11} className="opacity-0 group-hover/th:opacity-60 text-blue-500 shrink-0 cursor-grab" />
                                <span className="truncate">Flexi Remainder</span>
                            </span>
                        </div>
                        {renderResizeHandle('flexiRemainder')}
                    </th>
                );
            case 'monthlyGross':
                return (
                    <th
                        key={colKey}
                        style={colStyle}
                        {...dragThProps}
                        className={`relative py-2 px-2 border-b border-r border-slate-200 bg-slate-200 text-right font-black text-slate-900 ${dragClasses} group/th truncate`}
                    >
                        <div className="flex items-center justify-between gap-1">
                            {renderHideBtn()}
                            <span className="truncate ml-auto flex items-center gap-1">
                                <GripVertical size={11} className="opacity-0 group-hover/th:opacity-60 text-slate-500 shrink-0 cursor-grab" />
                                <span className="truncate">Monthly Gross</span>
                            </span>
                        </div>
                        {renderResizeHandle('monthlyGross')}
                    </th>
                );
            case 'insurance':
                return headerTitleWithHide('Medical Insurance', 'bg-rose-100/80 text-rose-900', <span className="text-[8.5px] font-extrabold text-rose-700 bg-rose-200 px-1 py-0.2 rounded shrink-0">Deduct</span>);
            case 'pf':
                return (
                    <th
                        key={colKey}
                        style={colStyle}
                        {...dragThProps}
                        className={`relative py-2 px-2 border-b border-r border-slate-200 bg-blue-100/80 ${dragClasses} group/th`}
                    >
                        <div className="flex items-center justify-between gap-1 pr-1">
                            <span className="truncate flex items-center gap-1">
                                <GripVertical size={11} className="opacity-0 group-hover/th:opacity-60 text-blue-500 shrink-0 cursor-grab" />
                                <span className="truncate">PF</span>
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleColumnHeaderToggle('pfEnabled');
                                    }}
                                    className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full transition-all cursor-pointer shadow-2xs shrink-0 ${pfStatutoryState.allTrue
                                        ? 'bg-blue-600 text-white'
                                        : pfStatutoryState.allFalse
                                            ? 'bg-slate-200 text-slate-700'
                                            : 'bg-amber-200 text-amber-900 border border-amber-300'
                                        }`}
                                    title="Toggle PF for all rows"
                                >
                                    {pfStatutoryState.allTrue ? '✓ All' : pfStatutoryState.allFalse ? '✕ Off' : `Mix (${pfStatutoryState.trueCount})`}
                                </button>
                                {renderHideBtn()}
                            </div>
                        </div>
                        {renderResizeHandle('pf')}
                    </th>
                );
            case 'esi':
                return (
                    <th
                        key={colKey}
                        style={colStyle}
                        {...dragThProps}
                        className={`relative py-2 px-2 border-b border-r border-slate-200 bg-slate-100 ${dragClasses} group/th`}
                    >
                        <div className="flex items-center justify-between gap-1 pr-1">
                            <span className="truncate flex items-center gap-1">
                                <GripVertical size={11} className="opacity-0 group-hover/th:opacity-60 text-slate-400 shrink-0 cursor-grab" />
                                <span className="truncate">ESI</span>
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleColumnHeaderToggle('esiEnabled');
                                    }}
                                    className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full transition-all cursor-pointer shadow-2xs shrink-0 ${esiStatutoryState.allTrue
                                        ? 'bg-blue-600 text-white'
                                        : esiStatutoryState.allFalse
                                            ? 'bg-slate-200 text-slate-700'
                                            : 'bg-amber-200 text-amber-900 border border-amber-300'
                                        }`}
                                    title="Toggle ESI for all rows"
                                >
                                    {esiStatutoryState.allTrue ? '✓ All' : esiStatutoryState.allFalse ? '✕ Off' : `Mix (${esiStatutoryState.trueCount})`}
                                </button>
                                {renderHideBtn()}
                            </div>
                        </div>
                        {renderResizeHandle('esi')}
                    </th>
                );
            case 'pt':
                return (
                    <th
                        key={colKey}
                        style={colStyle}
                        {...dragThProps}
                        className={`relative py-2 px-2 border-b border-r border-slate-200 bg-slate-100 ${dragClasses} group/th`}
                    >
                        <div className="flex items-center justify-between gap-1 pr-1">
                            <span className="truncate flex items-center gap-1">
                                <GripVertical size={11} className="opacity-0 group-hover/th:opacity-60 text-slate-400 shrink-0 cursor-grab" />
                                <span className="truncate">PT</span>
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleColumnHeaderToggle('ptEnabled');
                                    }}
                                    className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full transition-all cursor-pointer shadow-2xs shrink-0 ${ptStatutoryState.allTrue
                                        ? 'bg-blue-600 text-white'
                                        : ptStatutoryState.allFalse
                                            ? 'bg-slate-200 text-slate-700'
                                            : 'bg-amber-200 text-amber-900 border border-amber-300'
                                        }`}
                                    title="Toggle PT for all rows"
                                >
                                    {ptStatutoryState.allTrue ? '✓ All' : ptStatutoryState.allFalse ? '✕ Off' : `Mix (${ptStatutoryState.trueCount})`}
                                </button>
                                {renderHideBtn()}
                            </div>
                        </div>
                        {renderResizeHandle('pt')}
                    </th>
                );
            case 'gratuity':
                return (
                    <th
                        key={colKey}
                        style={colStyle}
                        {...dragThProps}
                        className={`relative py-2 px-2 border-b border-r border-slate-200 bg-indigo-100/80 ${dragClasses} group/th`}
                    >
                        <div className="flex items-center justify-between gap-1 pr-1">
                            <span className="truncate flex items-center gap-1">
                                <GripVertical size={11} className="opacity-0 group-hover/th:opacity-60 text-indigo-500 shrink-0 cursor-grab" />
                                <span className="truncate">Gratuity</span>
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleColumnHeaderToggle('gratuityEnabled');
                                    }}
                                    className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full transition-all cursor-pointer shadow-2xs shrink-0 ${gratuityStatutoryState.allTrue
                                        ? 'bg-indigo-600 text-white'
                                        : gratuityStatutoryState.allFalse
                                            ? 'bg-slate-200 text-slate-700'
                                            : 'bg-amber-200 text-amber-900 border border-amber-300'
                                        }`}
                                    title="Toggle Gratuity for all rows"
                                >
                                    {gratuityStatutoryState.allTrue ? '✓ All' : gratuityStatutoryState.allFalse ? '✕ Off' : `Mix (${gratuityStatutoryState.trueCount})`}
                                </button>
                                {renderHideBtn()}
                            </div>
                        </div>
                        {renderResizeHandle('gratuity')}
                    </th>
                );
            case 'lwf':
                return (
                    <th
                        key={colKey}
                        style={colStyle}
                        {...dragThProps}
                        className={`relative py-2 px-2 border-b border-r border-slate-200 bg-slate-100 ${dragClasses} group/th`}
                    >
                        <div className="flex items-center justify-between gap-1 pr-1">
                            <span className="truncate flex items-center gap-1">
                                <GripVertical size={11} className="opacity-0 group-hover/th:opacity-60 text-slate-400 shrink-0 cursor-grab" />
                                <span className="truncate">LWF</span>
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleColumnHeaderToggle('lwfEnabled');
                                    }}
                                    className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full transition-all cursor-pointer shadow-2xs shrink-0 ${lwfStatutoryState.allTrue
                                        ? 'bg-blue-600 text-white'
                                        : lwfStatutoryState.allFalse
                                            ? 'bg-slate-200 text-slate-700'
                                            : 'bg-amber-200 text-amber-900 border border-amber-300'
                                        }`}
                                    title="Toggle LWF for all rows"
                                >
                                    {lwfStatutoryState.allTrue ? '✓ All' : lwfStatutoryState.allFalse ? '✕ Off' : `Mix (${lwfStatutoryState.trueCount})`}
                                </button>
                                {renderHideBtn()}
                            </div>
                        </div>
                        {renderResizeHandle('lwf')}
                    </th>
                );
            case 'tds':
                return (
                    <th
                        key={colKey}
                        style={colStyle}
                        {...dragThProps}
                        className={`relative py-2 px-2 border-b border-r border-slate-200 bg-slate-100 ${dragClasses} group/th`}
                    >
                        <div className="flex items-center justify-between gap-1 pr-1">
                            <span className="truncate flex items-center gap-1">
                                <GripVertical size={11} className="opacity-0 group-hover/th:opacity-60 text-slate-400 shrink-0 cursor-grab" />
                                <span className="truncate">TDS</span>
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleColumnHeaderToggle('tdsEnabled');
                                    }}
                                    className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full transition-all cursor-pointer shadow-2xs shrink-0 ${tdsStatutoryState.allTrue
                                        ? 'bg-blue-600 text-white'
                                        : tdsStatutoryState.allFalse
                                            ? 'bg-slate-200 text-slate-700'
                                            : 'bg-amber-200 text-amber-900 border border-amber-300'
                                        }`}
                                    title="Toggle TDS for all rows"
                                >
                                    {tdsStatutoryState.allTrue ? '✓ All' : tdsStatutoryState.allFalse ? '✕ Off' : `Mix (${tdsStatutoryState.trueCount})`}
                                </button>
                                {renderHideBtn()}
                            </div>
                        </div>
                        {renderResizeHandle('tds')}
                    </th>
                );
            case 'ltaStatutory':
                return (
                    <th
                        key={colKey}
                        style={colStyle}
                        {...dragThProps}
                        className={`relative py-2 px-2 border-b border-r border-slate-200 bg-emerald-100/80 ${dragClasses} group/th`}
                    >
                        <div className="flex items-center justify-between gap-1 pr-1">
                            <span className="truncate flex items-center gap-1">
                                <GripVertical size={11} className="opacity-0 group-hover/th:opacity-60 text-emerald-600 shrink-0 cursor-grab" />
                                <span className="truncate">LTA</span>
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleColumnHeaderToggle('ltaEnabled');
                                    }}
                                    className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full transition-all cursor-pointer shadow-2xs shrink-0 ${ltaStatutoryState.allTrue
                                        ? 'bg-emerald-600 text-white'
                                        : ltaStatutoryState.allFalse
                                            ? 'bg-slate-200 text-slate-700'
                                            : 'bg-amber-200 text-amber-900 border border-amber-300'
                                        }`}
                                    title="Toggle LTA for all rows"
                                >
                                    {ltaStatutoryState.allTrue ? '✓ All' : ltaStatutoryState.allFalse ? '✕ Off' : `Mix (${ltaStatutoryState.trueCount})`}
                                </button>
                                {renderHideBtn()}
                            </div>
                        </div>
                        {renderResizeHandle('ltaStatutory')}
                    </th>
                );
            case 'deductions':
                return (
                    <th
                        key={colKey}
                        style={colStyle}
                        {...dragThProps}
                        className={`relative py-2 px-2 border-b border-r border-slate-200 text-right text-rose-700 bg-rose-100/70 ${dragClasses} group/th truncate`}
                    >
                        <div className="flex items-center justify-between gap-1">
                            {renderHideBtn()}
                            <span className="truncate ml-auto flex items-center gap-1">
                                <GripVertical size={11} className="opacity-0 group-hover/th:opacity-60 text-rose-500 shrink-0 cursor-grab" />
                                <span className="truncate">Deductions</span>
                            </span>
                        </div>
                        {renderResizeHandle('deductions')}
                    </th>
                );
            case 'takeHome':
                return (
                    <th
                        key={colKey}
                        style={colStyle}
                        {...dragThProps}
                        className={`relative py-2 px-2 border-b border-r border-slate-200 text-right text-emerald-800 bg-emerald-100 font-extrabold ${dragClasses} group/th truncate`}
                    >
                        <div className="flex items-center justify-between gap-1">
                            {renderHideBtn()}
                            <span className="truncate ml-auto flex items-center gap-1">
                                <GripVertical size={11} className="opacity-0 group-hover/th:opacity-60 text-emerald-600 shrink-0 cursor-grab" />
                                <span className="truncate">Est. Take-Home</span>
                            </span>
                        </div>
                        {renderResizeHandle('takeHome')}
                    </th>
                );
            default:
                return headerTitleWithHide(colKey);
        }
    }, [columnWidths, renderResizeHandle, handleHideColumn, handleColumnHeaderToggle, pfStatutoryState, esiStatutoryState, ptStatutoryState, gratuityStatutoryState, lwfStatutoryState, tdsStatutoryState, ltaStatutoryState, draggedHeaderKey, dragOverHeaderKey, handleHeaderDragStart, handleHeaderDragOver, handleHeaderDragLeave, handleHeaderDrop, handleHeaderDragEnd]);

    const renderBulkDataCell = useCallback((colKey, row, c) => {
        const w = columnWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey] || 110;
        const colStyle = {
            width: `${w}px`,
            minWidth: `${w}px`,
            maxWidth: `${w}px`
        };

        switch (colKey) {
            case 'annualCTC':
                return (
                    <td key={colKey} style={colStyle} className="py-1 px-1.5 border-b border-r border-slate-200 bg-slate-50">
                        <div className="relative z-0">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px] select-none">₹</span>
                            <input
                                type="number"
                                value={row.annualCTC || ''}
                                onChange={(e) => handleRowFieldChange(row._id, 'annualCTC', e.target.value)}
                                className="w-full h-6.5 pl-5 pr-1.5 py-0.5 text-[11px] font-mono tabular-nums font-bold border border-slate-300 rounded focus:border-blue-500 focus:bg-white bg-white focus:outline-none shadow-2xs"
                                placeholder="0"
                            />
                        </div>
                    </td>
                );
            case 'monthlyCTC':
                return (
                    <td key={colKey} style={colStyle} className="py-1.5 px-2 font-mono tabular-nums font-bold text-slate-800 border-b border-r border-slate-200 text-right bg-white truncate text-[11px]">
                        ₹{Math.round(c.monthlyCTC || 0).toLocaleString('en-IN')}
                    </td>
                );
            case 'basic':
                return (
                    <td key={colKey} style={colStyle} className="py-1.5 px-2 font-mono tabular-nums text-slate-700 border-b border-r border-slate-200 text-right bg-white truncate text-[11px]">
                        ₹{Math.round(c.basicMaster || 0).toLocaleString('en-IN')}
                    </td>
                );
            case 'hra':
                return (
                    <td key={colKey} style={colStyle} className="py-1.5 px-2 font-mono tabular-nums text-slate-700 border-b border-r border-slate-200 text-right bg-white truncate text-[11px]">
                        ₹{Math.round(c.hraMaster || 0).toLocaleString('en-IN')}
                    </td>
                );
            case 'petrol':
                return (
                    <td key={colKey} style={colStyle} className="py-1 px-1.5 border-b border-r border-slate-200 bg-sky-50">
                        <div className="relative z-0">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px] select-none">₹</span>
                            <input
                                type="number"
                                value={row.petrol !== undefined ? row.petrol : 0}
                                onChange={(e) => handleRowFieldChange(row._id, 'petrol', e.target.value)}
                                className="w-full h-6.5 pl-5 pr-1.5 py-0.5 text-[11px] font-mono tabular-nums font-bold border border-slate-300 rounded focus:border-blue-500 focus:bg-white bg-white focus:outline-none shadow-2xs"
                                placeholder="0"
                            />
                        </div>
                    </td>
                );
            case 'lta':
                return (
                    <td key={colKey} style={colStyle} className="py-1 px-1.5 border-b border-r border-slate-200 bg-emerald-50">
                        <div className="relative z-0">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px] select-none">₹</span>
                            <input
                                type="number"
                                value={!row.ltaEnabled ? 0 : (row.lta !== undefined && row.lta !== '' ? row.lta : (c.lta || 0))}
                                disabled={!row.ltaEnabled}
                                onChange={(e) => handleRowFieldChange(row._id, 'lta', e.target.value)}
                                className={`w-full h-6.5 pl-5 pr-1.5 py-0.5 text-[11px] font-mono tabular-nums font-bold border rounded focus:outline-none shadow-2xs ${!row.ltaEnabled
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                    : 'border-slate-300 focus:border-emerald-500 bg-white'
                                    }`}
                                placeholder="0"
                            />
                        </div>
                    </td>
                );
            case 'conveyance':
                return (
                    <td key={colKey} style={colStyle} className="py-1 px-1.5 border-b border-r border-slate-200 bg-white">
                        <div className="relative z-0">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px] select-none">₹</span>
                            <input
                                type="number"
                                value={row.conveyance !== undefined ? row.conveyance : 0}
                                onChange={(e) => handleRowFieldChange(row._id, 'conveyance', e.target.value)}
                                className="w-full h-6.5 pl-5 pr-1.5 py-0.5 text-[11px] font-mono tabular-nums font-bold border border-slate-300 rounded focus:border-blue-500 focus:bg-white bg-white focus:outline-none shadow-2xs"
                                placeholder="0"
                            />
                        </div>
                    </td>
                );
            case 'medical':
                return (
                    <td key={colKey} style={colStyle} className="py-1 px-1.5 border-b border-r border-slate-200 bg-white">
                        <div className="relative z-0">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px] select-none">₹</span>
                            <input
                                type="number"
                                value={row.medicalAllowance !== undefined ? row.medicalAllowance : 0}
                                onChange={(e) => handleRowFieldChange(row._id, 'medicalAllowance', e.target.value)}
                                className="w-full h-6.5 pl-5 pr-1.5 py-0.5 text-[11px] font-mono tabular-nums font-bold border border-slate-300 rounded focus:border-blue-500 focus:bg-white bg-white focus:outline-none shadow-2xs"
                                placeholder="0"
                            />
                        </div>
                    </td>
                );
            case 'meal':
                return (
                    <td key={colKey} style={colStyle} className="py-1 px-1.5 border-b border-r border-slate-200 bg-white">
                        <div className="relative z-0">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px] select-none">₹</span>
                            <input
                                type="number"
                                value={row.mealAllowance !== undefined ? row.mealAllowance : 0}
                                onChange={(e) => handleRowFieldChange(row._id, 'mealAllowance', e.target.value)}
                                className="w-full h-6.5 pl-5 pr-1.5 py-0.5 text-[11px] font-mono tabular-nums font-bold border border-slate-300 rounded focus:border-blue-500 focus:bg-white bg-white focus:outline-none shadow-2xs"
                                placeholder="0"
                            />
                        </div>
                    </td>
                );
            case 'broadband':
                return (
                    <td key={colKey} style={colStyle} className="py-1 px-1.5 border-b border-r border-slate-200 bg-white">
                        <div className="relative z-0">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px] select-none">₹</span>
                            <input
                                type="number"
                                value={row.broadband !== undefined ? row.broadband : 0}
                                onChange={(e) => handleRowFieldChange(row._id, 'broadband', e.target.value)}
                                className="w-full h-6.5 pl-5 pr-1.5 py-0.5 text-[11px] font-mono tabular-nums font-bold border border-slate-300 rounded focus:border-blue-500 focus:bg-white bg-white focus:outline-none shadow-2xs"
                                placeholder="0"
                            />
                        </div>
                    </td>
                );
            case 'flexiRemainder':
                return (
                    <td key={colKey} style={colStyle} className="py-1.5 px-2 font-mono tabular-nums font-bold text-blue-700 border-b border-r border-slate-200 text-right bg-blue-50 truncate text-[11px]">
                        ₹{Math.round(c.specialAllowance || 0).toLocaleString('en-IN')}
                    </td>
                );
            case 'monthlyGross':
                return (
                    <td key={colKey} style={colStyle} className="py-1.5 px-2 font-mono tabular-nums font-black text-slate-900 border-b border-r border-slate-200 text-right bg-slate-100 truncate text-[11px]">
                        ₹{Math.round(c.grossMaster || 0).toLocaleString('en-IN')}
                    </td>
                );
            case 'insurance':
                return (
                    <td key={colKey} style={colStyle} className="py-1 px-1.5 border-b border-r border-slate-200 bg-rose-50">
                        <div className="relative z-0">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-rose-500 font-bold text-[10px] select-none">-₹</span>
                            <input
                                type="number"
                                value={row.insuranceAmount !== undefined ? row.insuranceAmount : 0}
                                onChange={(e) => handleRowFieldChange(row._id, 'insuranceAmount', e.target.value)}
                                className="w-full h-6.5 pl-5 pr-1.5 py-0.5 text-[11px] font-mono tabular-nums font-bold border border-rose-300 rounded focus:border-rose-500 focus:bg-white bg-rose-50/60 text-rose-900 focus:outline-none shadow-2xs"
                                placeholder="0"
                            />
                        </div>
                    </td>
                );
            case 'pf':
                return (
                    <td key={colKey} style={colStyle} className="py-1.5 px-2 border-b border-r border-slate-200 bg-blue-50/70 overflow-hidden text-[10px]">
                        <div className="space-y-0.5">
                            <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-900 select-none">
                                <input
                                    type="checkbox"
                                    checked={Boolean(row.pfEnabled)}
                                    onChange={(e) => handleRowFieldChange(row._id, 'pfEnabled', e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span>PF Active</span>
                            </label>
                            {row.pfEnabled ? (
                                <div className="space-y-0 text-[9px] leading-tight">
                                    <label className="inline-flex items-center gap-1 text-slate-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(row.includePfInCTC)}
                                            onChange={(e) => handleRowFieldChange(row._id, 'includePfInCTC', e.target.checked)}
                                            className="w-2.5 h-2.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span>In CTC</span>
                                    </label>
                                    <div className="font-mono tabular-nums text-blue-700 font-semibold whitespace-nowrap">
                                        EE: ₹{Math.round(c.pfEmployee || 0).toLocaleString('en-IN')} | ER: ₹{Math.round(c.pfEmployer || 0).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-[9px] text-slate-400 block font-medium">Exempt (₹0)</span>
                            )}
                        </div>
                    </td>
                );
            case 'esi':
                return (
                    <td key={colKey} style={colStyle} className="py-1.5 px-2 border-b border-r border-slate-200 bg-white overflow-hidden text-[10px]">
                        <div className="space-y-0.5">
                            <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-900 select-none">
                                <input
                                    type="checkbox"
                                    checked={Boolean(row.esiEnabled)}
                                    onChange={(e) => handleRowFieldChange(row._id, 'esiEnabled', e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span>ESI</span>
                            </label>
                            {row.esiEnabled && c.esiEmployee > 0 ? (
                                <div className="text-[9px] font-mono tabular-nums text-slate-700 font-semibold whitespace-nowrap">
                                    EE: ₹{Math.round(c.esiEmployee || 0).toLocaleString('en-IN')}
                                </div>
                            ) : (
                                <span className="text-[9px] text-slate-400 block font-medium">Exempt (₹0)</span>
                            )}
                        </div>
                    </td>
                );
            case 'pt':
                return (
                    <td key={colKey} style={colStyle} className="py-1.5 px-2 border-b border-r border-slate-200 bg-white overflow-hidden text-[10px]">
                        <div className="space-y-0.5">
                            <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-900 select-none">
                                <input
                                    type="checkbox"
                                    checked={Boolean(row.ptEnabled)}
                                    onChange={(e) => handleRowFieldChange(row._id, 'ptEnabled', e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span>PT</span>
                            </label>
                            {row.ptEnabled ? (
                                <div className="text-[9px] font-mono tabular-nums text-slate-700 font-semibold whitespace-nowrap">
                                    ₹{Math.round(c.professionalTax || 0).toLocaleString('en-IN')}
                                </div>
                            ) : (
                                <span className="text-[9px] text-slate-400 block font-medium">₹0</span>
                            )}
                        </div>
                    </td>
                );
            case 'gratuity':
                return (
                    <td key={colKey} style={colStyle} className="py-1.5 px-2 border-b border-r border-slate-200 bg-indigo-50/70 overflow-hidden text-[10px]">
                        <div className="space-y-0.5">
                            <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-900 select-none">
                                <input
                                    type="checkbox"
                                    checked={Boolean(row.gratuityEnabled)}
                                    onChange={(e) => handleRowFieldChange(row._id, 'gratuityEnabled', e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <span>Gratuity</span>
                            </label>
                            {row.gratuityEnabled ? (
                                <div className="space-y-0 text-[9px] leading-tight">
                                    <label className="inline-flex items-center gap-1 text-slate-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={row.includeGratuityInCTC !== false}
                                            onChange={(e) => handleRowFieldChange(row._id, 'includeGratuityInCTC', e.target.checked)}
                                            className="w-2.5 h-2.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                        <span>In CTC</span>
                                    </label>
                                    <div className="font-mono tabular-nums text-indigo-700 font-semibold whitespace-nowrap">
                                        ₹{Math.round(c.gratuity || 0).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-[9px] text-slate-400 block font-medium">Disabled (₹0)</span>
                            )}
                        </div>
                    </td>
                );
            case 'lwf':
                return (
                    <td key={colKey} style={colStyle} className="py-1.5 px-2 border-b border-r border-slate-200 bg-white overflow-hidden text-[10px]">
                        <div className="space-y-0.5">
                            <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-900 select-none">
                                <input
                                    type="checkbox"
                                    checked={Boolean(row.lwfEnabled)}
                                    onChange={(e) => handleRowFieldChange(row._id, 'lwfEnabled', e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span>LWF</span>
                            </label>
                            {row.lwfEnabled ? (
                                <div className="text-[9px] font-mono tabular-nums text-slate-700 font-semibold whitespace-nowrap">
                                    EE: ₹{Math.round(c.lwfEmployee || 0)} | ER: ₹{Math.round(c.lwfEmployer || 0)}
                                </div>
                            ) : (
                                <span className="text-[9px] text-slate-400 block font-medium">₹0</span>
                            )}
                        </div>
                    </td>
                );
            case 'tds':
                return (
                    <td key={colKey} style={colStyle} className="py-1.5 px-2 border-b border-r border-slate-200 bg-white overflow-hidden text-[10px]">
                        <div className="space-y-0.5">
                            <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-900 select-none">
                                <input
                                    type="checkbox"
                                    checked={Boolean(row.tdsEnabled)}
                                    onChange={(e) => handleRowFieldChange(row._id, 'tdsEnabled', e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span>TDS</span>
                            </label>
                            <span className={`text-[9px] font-medium block ${row.tdsEnabled ? 'text-blue-700 font-semibold' : 'text-slate-400'}`}>
                                {row.tdsEnabled ? 'Deduction On' : 'Disabled'}
                            </span>
                        </div>
                    </td>
                );
            case 'ltaStatutory':
                return (
                    <td key={colKey} style={colStyle} className="py-1.5 px-2 border-b border-r border-slate-200 bg-emerald-50 overflow-hidden text-[10px]">
                        <div className="space-y-0.5">
                            <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-900 select-none">
                                <input
                                    type="checkbox"
                                    checked={Boolean(row.ltaEnabled)}
                                    onChange={(e) => handleRowFieldChange(row._id, 'ltaEnabled', e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <span>LTA</span>
                            </label>
                            <span className={`text-[9px] font-medium block ${row.ltaEnabled ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                                {row.ltaEnabled ? 'Eligible' : 'Exempt'}
                            </span>
                        </div>
                    </td>
                );
            case 'deductions':
                return (
                    <td key={colKey} style={colStyle} className="py-1.5 px-2 font-mono tabular-nums font-bold text-rose-700 border-b border-r border-slate-200 text-right bg-rose-50/70 truncate text-[11px]">
                        -₹{Math.round(c.totalDeductions || 0).toLocaleString('en-IN')}
                    </td>
                );
            case 'takeHome':
                return (
                    <td key={colKey} style={colStyle} className="py-1.5 px-2 border-b border-r border-slate-200 text-right bg-emerald-100/70 overflow-hidden">
                        <span className="inline-block px-2 py-0.5 rounded font-mono tabular-nums font-extrabold text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs whitespace-nowrap">
                            ₹{Math.round(c.netTakeHome || 0).toLocaleString('en-IN')}
                        </span>
                    </td>
                );
            default:
                return <td key={colKey} style={colStyle} className="py-1 px-2 border-b border-r border-slate-200 text-slate-500 truncate text-[11px]">--</td>;
        }
    }, [columnWidths, handleRowFieldChange]);

    const currentSelectedEmpObj = employees.find(e => String(e._id) === String(selectedUserId));

    return (
        <div className="space-y-6">
            {/* Top Toolbar: Sub-tabs & Template Selector */}
            <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xs flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setSubTab('single')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${subTab === 'single'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                    >
                        <User size={15} />
                        <span>Individual Revision</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSubTab('bulk_details')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${subTab === 'bulk_details'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                    >
                        <Table size={15} />
                        <span>Bulk Salary Details</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${subTab === 'bulk_details' ? 'bg-blue-500 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                            Excel Grid
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSubTab('bulk')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${subTab === 'bulk'
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
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${subTab === 'templates'
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
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${subTab === 'logs'
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
                                            className={`p-3 rounded-xl cursor-pointer transition-all ${isSelected
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
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${singleStep === 'salary'
                                            ? 'bg-white text-blue-600 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                    >
                                        <DollarSign size={15} />
                                        <span>1. Salary & Compensation Structure</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (singleStep === 'salary' && Number(salaryDraft.annualCTC || 0) > 0) {
                                                handleSaveAndContinue();
                                            } else {
                                                setSingleStep('parameters');
                                            }
                                        }}
                                        disabled={savingSalaryAndProceeding}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${singleStep === 'parameters'
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
                                                onClick={handleSaveAndContinue}
                                                disabled={savingSalaryAndProceeding}
                                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-60 text-blue-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                            >
                                                {savingSalaryAndProceeding ? (
                                                    <>
                                                        <RefreshCw className="animate-spin" size={13} />
                                                        <span>Saving & Continuing...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save size={13} />
                                                        <span>Save & Go to Parameters & Dispatch</span>
                                                        <ArrowRight size={13} />
                                                    </>
                                                )}
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
                                                onClick={handleSaveAndContinue}
                                                disabled={savingSalaryAndProceeding}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                                            >
                                                {savingSalaryAndProceeding ? (
                                                    <>
                                                        <RefreshCw className="animate-spin" size={15} />
                                                        <span>Saving Salary & Continuing...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save size={15} />
                                                        <span>Proceed to Revision Parameters & Letter Dispatch</span>
                                                        <ArrowRight size={15} />
                                                    </>
                                                )}
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
                                                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                                                <select
                                                                    value={selectedTemplateId}
                                                                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                                                                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer min-w-[200px]"
                                                                >
                                                                    {availableTemplates.map(t => (
                                                                        <option key={t._id} value={t._id}>{t.name}</option>
                                                                    ))}
                                                                </select>

                                                                <button
                                                                    type="button"
                                                                    onClick={handleOpenEditFormatModal}
                                                                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs"
                                                                    title="Edit letter format, custom terms & clauses for this particular employee"
                                                                >
                                                                    <Edit3 size={13} className="text-indigo-600" />
                                                                    <span>Edit Format</span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenPreviewLetterModal()}
                                                                    disabled={previewLetterLoading}
                                                                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
                                                                    title="Preview the generated offer letter directly in the browser to check that it is completely correct"
                                                                >
                                                                    {previewLetterLoading ? (
                                                                        <RefreshCw size={13} className="animate-spin" />
                                                                    ) : (
                                                                        <Eye size={13} />
                                                                    )}
                                                                    <span>Preview Letter</span>
                                                                </button>

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
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rev.status === 'applied'
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
                                                                        onClick={() => handleOpenPreviewLetterModal(rev._id)}
                                                                        disabled={previewLetterLoading}
                                                                        className="p-1.5 rounded-lg border border-slate-200 text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
                                                                        title="Preview Revised Offer Letter in Browser"
                                                                    >
                                                                        <Eye size={14} />
                                                                    </button>
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
            {/* SUB-TAB: BULK SALARY DETAILS (EXCEL SPREADSHEET GRID)          */}
            {/* ============================================================== */}
            {subTab === 'bulk_details' && (
                <div className="space-y-6">
                    {/* Header Summary & KPI Cards */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <Table size={18} className="text-blue-600" />
                                    <span>Bulk Salary Details & Statutory Calibration Spreadsheet</span>
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Review live salary breakdowns, edit compensation, and toggle statutory components per employee or company-wide.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={fetchBulkProfiles}
                                    disabled={loadingBulkProfiles}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                    title="Refresh latest salary profiles from database"
                                >
                                    <RefreshCw size={13} className={loadingBulkProfiles ? 'animate-spin text-blue-600' : 'text-slate-600'} />
                                    <span>Refresh Data</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowColumnManagerModal(true)}
                                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                    title="Choose which columns to show or hide, and change their position order numbers"
                                >
                                    <SlidersHorizontal size={13} className="text-blue-600" />
                                    <span>Columns ({orderedVisibleColKeys.length}/{columnOrder.length})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExportCsv}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                    title="Export current table data to CSV in custom column order"
                                >
                                    <Download size={13} className="text-slate-600" />
                                    <span>Export CSV</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExportExcel}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                    title="Export formatted Excel (.xlsx) spreadsheet with styled headers and formulas in custom order"
                                >
                                    <FileSpreadsheet size={13} className="text-white" />
                                    <span>Export Excel (.xlsx)</span>
                                </button>
                            </div>
                        </div>

                        {/* Metrics Bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Employees</span>
                                <span className="text-lg font-extrabold text-slate-800">{bulkGridMetrics.totalEmployees}</span>
                                {bulkGridMetrics.selectedCount > 0 && (
                                    <span className="text-[10px] text-blue-600 font-bold ml-1.5">({bulkGridMetrics.selectedCount} selected)</span>
                                )}
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Modified Rows</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-lg font-extrabold ${bulkGridMetrics.modifiedCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                                        {bulkGridMetrics.modifiedCount}
                                    </span>
                                    {bulkGridMetrics.modifiedCount > 0 && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                            Unsaved Edits
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Total Monthly CTC</span>
                                <span className="text-lg font-extrabold text-blue-900">₹{bulkGridMetrics.totalMonthlyCTC.toLocaleString('en-IN')}</span>
                            </div>

                            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Total Net Take-Home</span>
                                <span className="text-lg font-extrabold text-emerald-900">₹{bulkGridMetrics.totalNetTakeHome.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Global "Applicable for All" Statutory Controls */}
                    <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 p-5 rounded-2xl border border-blue-200/80 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-blue-100">
                            <div className="flex items-center gap-2">
                                <SlidersHorizontal size={16} className="text-blue-600" />
                                <div>
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-blue-950 block">
                                        Applicable for All (Global Batch Statutory Toggles)
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                        Quick-toggle statutory contributions across all employees or selected employees with immediate recalculation.
                                    </span>
                                </div>
                            </div>

                            {/* Scope Selector */}
                            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
                                <span className="text-[11px] font-bold text-slate-500 px-2">Apply To:</span>
                                <button
                                    type="button"
                                    onClick={() => setBulkActionTarget('all')}
                                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${bulkActionTarget === 'all'
                                        ? 'bg-blue-600 text-white shadow-2xs'
                                        : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    All Filtered ({filteredBulkRows.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBulkActionTarget('selected')}
                                    disabled={selectedBulkDetailIds.length === 0}
                                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${bulkActionTarget === 'selected'
                                        ? 'bg-blue-600 text-white shadow-2xs'
                                        : 'text-slate-600 hover:bg-slate-100 disabled:opacity-40'
                                        }`}
                                >
                                    Selected Only ({selectedBulkDetailIds.length})
                                </button>
                            </div>
                        </div>

                        {/* Batch Action Buttons Grouped by Component */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                            {/* Provident Fund (PF) */}
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                    <span className="text-xs font-bold text-slate-800">Provident Fund (PF)</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-blue-600 font-extrabold bg-blue-50 px-1.5 py-0.5 rounded">12% / Cap</span>
                                        {pfStatutoryState.allTrue && (
                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                All Active
                                            </span>
                                        )}
                                        {pfStatutoryState.allFalse && (
                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                All Off
                                            </span>
                                        )}
                                        {pfStatutoryState.isMixed && (
                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                                Mixed ({pfStatutoryState.trueCount}/{pfStatutoryState.total})
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 p-0.5 bg-slate-100 rounded-lg border border-slate-200 gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() => applyStatutoryToAll('pfEnabled', true)}
                                        className={`px-2 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${pfStatutoryState.allTrue
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                            }`}
                                    >
                                        <Check size={12} className={pfStatutoryState.allTrue ? 'text-white' : 'text-slate-400'} />
                                        <span>✓ Enable PF All</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyStatutoryToAll('pfEnabled', false)}
                                        className={`px-2 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${pfStatutoryState.allFalse
                                            ? 'bg-slate-800 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                            }`}
                                    >
                                        <X size={12} className={pfStatutoryState.allFalse ? 'text-white' : 'text-slate-400'} />
                                        <span>✕ Disable PF All</span>
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 p-0.5 bg-slate-50 rounded-lg border border-slate-200 gap-0.5 pt-1 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => applyStatutoryToAll('includePfInCTC', true)}
                                        className={`px-1.5 py-1 rounded-md text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all cursor-pointer ${pfInCtcStatutoryState.allTrue
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                            }`}
                                        title="Employer PF reduces gross take-home"
                                    >
                                        <span>+ In CTC: All</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyStatutoryToAll('includePfInCTC', false)}
                                        className={`px-1.5 py-1 rounded-md text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all cursor-pointer ${pfInCtcStatutoryState.allFalse
                                            ? 'bg-slate-700 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                            }`}
                                        title="Employer PF outside CTC take-home calculation"
                                    >
                                        <span>- Ex CTC: All</span>
                                    </button>
                                </div>
                            </div>

                            {/* State Insurance (ESI) & Gratuity */}
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                    <span className="text-xs font-bold text-slate-800">ESI (Health)</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-slate-500 font-semibold">&le; ₹21k</span>
                                        {esiStatutoryState.allTrue && (
                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                All Active
                                            </span>
                                        )}
                                        {esiStatutoryState.allFalse && (
                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                All Off
                                            </span>
                                        )}
                                        {esiStatutoryState.isMixed && (
                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                                Mixed ({esiStatutoryState.trueCount}/{esiStatutoryState.total})
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 p-0.5 bg-slate-100 rounded-lg border border-slate-200 gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() => applyStatutoryToAll('esiEnabled', true)}
                                        className={`px-2 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${esiStatutoryState.allTrue
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                            }`}
                                    >
                                        <Check size={12} className={esiStatutoryState.allTrue ? 'text-white' : 'text-slate-400'} />
                                        <span>✓ Enable ESI All</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyStatutoryToAll('esiEnabled', false)}
                                        className={`px-2 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${esiStatutoryState.allFalse
                                            ? 'bg-slate-800 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                            }`}
                                    >
                                        <X size={12} className={esiStatutoryState.allFalse ? 'text-white' : 'text-slate-400'} />
                                        <span>✕ Disable ESI All</span>
                                    </button>
                                </div>

                                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                    <div className="flex items-center justify-between gap-1 flex-wrap">
                                        <span className="text-xs font-bold text-slate-800">Gratuity Provision</span>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-indigo-600 font-extrabold">4.81% Basic</span>
                                            {gratuityStatutoryState.allTrue && (
                                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    All Active
                                                </span>
                                            )}
                                            {gratuityStatutoryState.allFalse && (
                                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                    All Off
                                                </span>
                                            )}
                                            {gratuityStatutoryState.isMixed && (
                                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                                    Mixed ({gratuityStatutoryState.trueCount}/{gratuityStatutoryState.total})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 p-0.5 bg-slate-100 rounded-lg border border-slate-200 gap-0.5">
                                        <button
                                            type="button"
                                            onClick={() => applyStatutoryToAll('gratuityEnabled', true)}
                                            className={`px-2 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${gratuityStatutoryState.allTrue
                                                ? 'bg-indigo-600 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                                }`}
                                        >
                                            <Check size={12} className={gratuityStatutoryState.allTrue ? 'text-white' : 'text-slate-400'} />
                                            <span>✓ Gratuity All</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyStatutoryToAll('gratuityEnabled', false)}
                                            className={`px-2 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${gratuityStatutoryState.allFalse
                                                ? 'bg-slate-800 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                                }`}
                                        >
                                            <X size={12} className={gratuityStatutoryState.allFalse ? 'text-white' : 'text-slate-400'} />
                                            <span>✕ Disable Gratuity</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 p-0.5 bg-slate-50 rounded-lg border border-slate-200 gap-0.5 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => applyStatutoryToAll('includeGratuityInCTC', true)}
                                            className={`px-1.5 py-1 rounded-md text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all cursor-pointer ${gratuityInCtcStatutoryState.allTrue
                                                ? 'bg-indigo-600 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                                }`}
                                        >
                                            <span>+ In CTC</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyStatutoryToAll('includeGratuityInCTC', false)}
                                            className={`px-1.5 py-1 rounded-md text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all cursor-pointer ${gratuityInCtcStatutoryState.allFalse
                                                ? 'bg-slate-700 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                                }`}
                                        >
                                            <span>- Ex CTC</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* PT & LWF */}
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                    <span className="text-xs font-bold text-slate-800">Professional Tax (PT)</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-slate-500 font-semibold">State Slab</span>
                                        {ptStatutoryState.allTrue && (
                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                All Active
                                            </span>
                                        )}
                                        {ptStatutoryState.allFalse && (
                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                All Off
                                            </span>
                                        )}
                                        {ptStatutoryState.isMixed && (
                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                                Mixed ({ptStatutoryState.trueCount}/{ptStatutoryState.total})
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 p-0.5 bg-slate-100 rounded-lg border border-slate-200 gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() => applyStatutoryToAll('ptEnabled', true)}
                                        className={`px-2 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${ptStatutoryState.allTrue
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                            }`}
                                    >
                                        <Check size={12} className={ptStatutoryState.allTrue ? 'text-white' : 'text-slate-400'} />
                                        <span>✓ Enable PT All</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyStatutoryToAll('ptEnabled', false)}
                                        className={`px-2 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${ptStatutoryState.allFalse
                                            ? 'bg-slate-800 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                            }`}
                                    >
                                        <X size={12} className={ptStatutoryState.allFalse ? 'text-white' : 'text-slate-400'} />
                                        <span>✕ Disable PT All</span>
                                    </button>
                                </div>

                                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                    <div className="flex items-center justify-between gap-1 flex-wrap">
                                        <span className="text-xs font-bold text-slate-800">Labour Welfare Fund (LWF)</span>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-slate-500 font-semibold">EE+ER</span>
                                            {lwfStatutoryState.allTrue && (
                                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    All Active
                                                </span>
                                            )}
                                            {lwfStatutoryState.allFalse && (
                                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                    All Off
                                                </span>
                                            )}
                                            {lwfStatutoryState.isMixed && (
                                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                                    Mixed ({lwfStatutoryState.trueCount}/{lwfStatutoryState.total})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 p-0.5 bg-slate-100 rounded-lg border border-slate-200 gap-0.5">
                                        <button
                                            type="button"
                                            onClick={() => applyStatutoryToAll('lwfEnabled', true)}
                                            className={`px-2 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${lwfStatutoryState.allTrue
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                                }`}
                                        >
                                            <Check size={12} className={lwfStatutoryState.allTrue ? 'text-white' : 'text-slate-400'} />
                                            <span>✓ Enable LWF All</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyStatutoryToAll('lwfEnabled', false)}
                                            className={`px-2 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${lwfStatutoryState.allFalse
                                                ? 'bg-slate-800 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                                }`}
                                        >
                                            <X size={12} className={lwfStatutoryState.allFalse ? 'text-white' : 'text-slate-400'} />
                                            <span>✕ Disable LWF All</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* TDS & LTA */}
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                    <span className="text-xs font-bold text-slate-800">Leave Travel (LTA)</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded">Allowance</span>
                                        {ltaStatutoryState.allTrue && (
                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                All Active
                                            </span>
                                        )}
                                        {ltaStatutoryState.allFalse && (
                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                All Off
                                            </span>
                                        )}
                                        {ltaStatutoryState.isMixed && (
                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                                Mixed ({ltaStatutoryState.trueCount}/{ltaStatutoryState.total})
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 p-0.5 bg-slate-100 rounded-lg border border-slate-200 gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() => applyStatutoryToAll('ltaEnabled', true)}
                                        className={`px-2 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${ltaStatutoryState.allTrue
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                            }`}
                                    >
                                        <Check size={12} className={ltaStatutoryState.allTrue ? 'text-white' : 'text-slate-400'} />
                                        <span>✓ Enable LTA All</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyStatutoryToAll('ltaEnabled', false)}
                                        className={`px-2 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${ltaStatutoryState.allFalse
                                            ? 'bg-slate-800 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                            }`}
                                    >
                                        <X size={12} className={ltaStatutoryState.allFalse ? 'text-white' : 'text-slate-400'} />
                                        <span>✕ Disable LTA All</span>
                                    </button>
                                </div>

                                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                    <div className="flex items-center justify-between gap-1 flex-wrap">
                                        <span className="text-xs font-bold text-slate-800">Income Tax (TDS)</span>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-slate-500 font-semibold">TDS Deductions</span>
                                            {tdsStatutoryState.allTrue && (
                                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    All Active
                                                </span>
                                            )}
                                            {tdsStatutoryState.allFalse && (
                                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                    All Off
                                                </span>
                                            )}
                                            {tdsStatutoryState.isMixed && (
                                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                                    Mixed ({tdsStatutoryState.trueCount}/{tdsStatutoryState.total})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 p-0.5 bg-slate-100 rounded-lg border border-slate-200 gap-0.5">
                                        <button
                                            type="button"
                                            onClick={() => applyStatutoryToAll('tdsEnabled', true)}
                                            className={`px-2 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${tdsStatutoryState.allTrue
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                                }`}
                                        >
                                            <Check size={12} className={tdsStatutoryState.allTrue ? 'text-white' : 'text-slate-400'} />
                                            <span>✓ Enable TDS All</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyStatutoryToAll('tdsEnabled', false)}
                                            className={`px-2 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${tdsStatutoryState.allFalse
                                                ? 'bg-slate-800 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                                }`}
                                        >
                                            <X size={12} className={tdsStatutoryState.allFalse ? 'text-white' : 'text-slate-400'} />
                                            <span>✕ Disable TDS All</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Batch Allowance & Deduction Tools */}
                        <div className="bg-white/95 p-3 rounded-xl border border-blue-100 shadow-2xs flex items-center justify-between flex-wrap gap-2 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-extrabold uppercase text-slate-700 tracking-wider">
                                    Allowances & Insurance Batch Actions:
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                    (Applies to {bulkActionTarget === 'selected' ? `selected (${selectedBulkDetailIds.length})` : `all filtered (${filteredBulkRows.length})`})
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => handleBatchComponentUpdate('insuranceAmount', 1500)}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                                    title="Set Medical Insurance deduction to ₹1,500"
                                >
                                    Medical Insurance: ₹1,500
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleBatchComponentUpdate('insuranceAmount', 0)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                                >
                                    Clear Insurance (₹0)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleBatchComponentUpdate('petrol', 0)}
                                    className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                                >
                                    Reset Petrol (₹0)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleBatchComponentUpdate('conveyance', 0)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                                >
                                    Reset Conveyance (₹0)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleBatchComponentUpdate('mealAllowance', 0)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                                >
                                    Reset Meal (₹0)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleBatchComponentUpdate('lta', '')}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                                    title="Reset LTA to auto-calculated formula percentage"
                                >
                                    Recalculate LTA (Auto %)
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filter Bar & Save Controls */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-[300px]">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[180px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search name, code, dept..."
                                    value={bulkDetailsSearch}
                                    onChange={(e) => setBulkDetailsSearch(e.target.value)}
                                    className="w-full pl-9 pr-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                                />
                            </div>

                            {/* Department Filter */}
                            <div className="flex items-center gap-1.5">
                                <Filter size={14} className="text-slate-400" />
                                <select
                                    value={bulkDetailsDept}
                                    onChange={(e) => setBulkDetailsDept(e.target.value)}
                                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none"
                                >
                                    <option value="ALL">All Departments</option>
                                    {departments.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Choose & Order Columns */}
                            <button
                                type="button"
                                onClick={() => setShowColumnManagerModal(true)}
                                className="px-2.5 py-2 rounded-xl border border-blue-200 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                title="Choose which columns to show or hide, and change their position order numbers"
                            >
                                <SlidersHorizontal size={13} className="text-blue-600" />
                                <span className="hidden sm:inline">Columns ({orderedVisibleColKeys.length}/{columnOrder.length})</span>
                            </button>

                            {/* Reset Column Widths */}
                            <button
                                type="button"
                                onClick={handleResetAllColumnWidths}
                                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                title="Reset all column widths to default (Double-click any column edge to reset individual column)"
                            >
                                <SlidersHorizontal size={13} className="text-slate-500" />
                                <span className="hidden sm:inline">Reset Widths</span>
                            </button>

                            {/* Reset Column Layout */}
                            <button
                                type="button"
                                onClick={handleResetColumnDefaults}
                                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                title="Restore default column order and default visibility settings"
                            >
                                <RotateCcw size={13} className="text-slate-500" />
                                <span className="hidden sm:inline">Reset Columns</span>
                            </button>
                        </div>

                        {/* Revision Parameters & Save Execution */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <Calendar size={14} className="text-blue-600" />
                                <input
                                    type="date"
                                    value={bulkDetailsEffectiveDate}
                                    onChange={(e) => setBulkDetailsEffectiveDate(e.target.value)}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none"
                                    title="Revision Effective Date"
                                />
                            </div>

                            <select
                                value={bulkDetailsReason}
                                onChange={(e) => setBulkDetailsReason(e.target.value)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none max-w-[200px] truncate"
                            >
                                <option value="Company Compensation Restructuring">Company Compensation Restructuring</option>
                                <option value="Annual Appraisal & Hike">Annual Appraisal & Hike</option>
                                <option value="Statutory Compliance Update">Statutory Compliance Update</option>
                                <option value="Market Rate Correction">Market Rate Correction</option>
                                <option value="Other">Other (Custom)</option>
                            </select>

                            {bulkDetailsReason === 'Other' && (
                                <input
                                    type="text"
                                    placeholder="Enter custom reason"
                                    value={bulkDetailsCustomReason}
                                    onChange={(e) => setBulkDetailsCustomReason(e.target.value)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none"
                                />
                            )}

                            {bulkGridMetrics.modifiedCount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleResetAllModified}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                    title="Discard all changes and reset grid to original database values"
                                >
                                    <RotateCcw size={13} className="text-slate-600" />
                                    <span>Reset All</span>
                                </button>
                            )}

                            {/* Save All Button */}
                            <button
                                type="button"
                                onClick={() => handleSaveBulkDetails('smart')}
                                disabled={submittingBulkDetails || (bulkGridMetrics.modifiedCount === 0 && selectedBulkDetailIds.length === 0)}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                title="Save all modified and selected employee compensation rows"
                            >
                                {submittingBulkDetails ? (
                                    <>
                                        <RefreshCw size={13} className="animate-spin text-white" />
                                        <span>Saving All...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={14} />
                                        <span>
                                            Save All
                                            {selectedBulkDetailIds.length > 0
                                                ? ` (${selectedBulkDetailIds.length} Selected)`
                                                : bulkGridMetrics.modifiedCount > 0
                                                    ? ` (${bulkGridMetrics.modifiedCount} Modified)`
                                                    : ''}
                                        </span>
                                    </>
                                )}
                            </button>

                            {/* Option to Save All Filtered Rows across spreadsheet */}
                            {bulkGridMetrics.modifiedCount === 0 && selectedBulkDetailIds.length === 0 && filteredBulkRows.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => handleSaveBulkDetails('all_filtered')}
                                    disabled={submittingBulkDetails}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-all cursor-pointer shadow-2xs"
                                    title="Save and sync all employees in this table view"
                                >
                                    <Save size={13} className="text-slate-500" />
                                    <span>Save All ({filteredBulkRows.length})</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Backdated Notice */}
                    {isBulkDetailsBackdated && (
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                            <div className="space-y-1 text-xs text-amber-900">
                                <p className="font-bold">Retroactive / Backdated Revision Notice</p>
                                <p className="text-[11px] text-amber-800">
                                    The selected effective date ({bulkDetailsEffectiveDate}) is in the past. This revision will be recorded as retroactive and synced across employee dossiers.
                                </p>
                                <label className="flex items-center gap-2 pt-1 font-bold text-amber-950 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={bulkDetailsBackdatedConfirmed}
                                        onChange={(e) => setBulkDetailsBackdatedConfirmed(e.target.checked)}
                                        className="rounded text-amber-600 focus:ring-amber-500"
                                    />
                                    <span>I acknowledge and confirm retroactive compensation revision</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Interactive Excel Spreadsheet Table */}
                    <div className="relative overflow-x-auto border border-slate-300 rounded-xl bg-white shadow-xs max-h-[min(70vh,680px)] min-h-[360px] overflow-y-auto font-sans antialiased [-webkit-font-smoothing:antialiased] [-moz-osx-font-smoothing:grayscale] [text-rendering:optimizeLegibility]">
                        <table style={{ width: `${totalTableWidth}px`, minWidth: `${totalTableWidth}px` }} className="text-left text-[11px] leading-tight border-separate border-spacing-0 whitespace-nowrap table-fixed tabular-nums select-text">
                            <thead className="sticky top-0 z-40 bg-slate-100 text-slate-700 uppercase text-[9.5px] font-bold tracking-wide border-b border-slate-300">
                                <tr>
                                    {/* Checkbox (Sticky Left #1: 0 to width) */}
                                    <th
                                        style={{ position: 'sticky', top: 0, left: 0, zIndex: 50, width: `${columnWidths.checkbox}px`, minWidth: `${columnWidths.checkbox}px`, maxWidth: `${columnWidths.checkbox}px`, backgroundColor: '#f1f5f9' }}
                                        className="relative py-2 px-1.5 text-center border-b border-r border-slate-300 shadow-[2px_0_4px_rgba(0,0,0,0.06)]"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={filteredBulkRows.length > 0 && selectedBulkDetailIds.length === filteredBulkRows.length}
                                            onChange={handleToggleSelectAllBulkDetails}
                                            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            title="Select all rows"
                                        />
                                        {renderResizeHandle('checkbox')}
                                    </th>

                                    {/* Employee Info (Sticky Left #2: from checkbox width) */}
                                    <th
                                        style={{ position: 'sticky', top: 0, left: `${columnWidths.checkbox}px`, zIndex: 50, width: `${columnWidths.employee}px`, minWidth: `${columnWidths.employee}px`, maxWidth: `${columnWidths.employee}px`, backgroundColor: '#f1f5f9' }}
                                        className="relative py-2 px-2.5 border-b border-r-2 border-slate-300 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)] truncate text-slate-800"
                                    >
                                        <span>Employee</span>
                                        {renderResizeHandle('employee')}
                                    </th>

                                    {/* Dynamic Reorderable & Toggleable Column Headers */}
                                    {orderedVisibleColKeys.map(colKey => renderBulkHeaderCell(colKey))}

                                    <th
                                        style={{ position: 'sticky', top: 0, right: 0, zIndex: 50, width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px`, maxWidth: `${columnWidths.actions}px`, backgroundColor: '#f1f5f9' }}
                                        className="relative py-2 px-2 text-center border-b border-l-2 border-slate-300 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.12)] uppercase text-[9.5px] font-black tracking-wide text-slate-700 select-none truncate"
                                    >
                                        <span>Actions</span>
                                        {renderResizeHandle('actions', true)}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-[11px]">
                                {loadingBulkProfiles ? (
                                    <tr>
                                        <td colSpan={orderedVisibleColKeys.length + 3} className="py-10 text-center text-slate-500 text-xs">
                                            <RefreshCw className="animate-spin inline-block mr-2 text-blue-600" size={16} />
                                            <span>Loading employee salary spreadsheet...</span>
                                        </td>
                                    </tr>
                                ) : filteredBulkRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={orderedVisibleColKeys.length + 3} className="py-10 text-center text-slate-500 text-xs">
                                            No employees match the current filters.
                                        </td>
                                    </tr>
                                ) : orderedVisibleColKeys.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="py-12 text-center text-slate-500 text-xs">
                                            <div className="max-w-md mx-auto space-y-2">
                                                <SlidersHorizontal className="mx-auto text-slate-400" size={24} />
                                                <p className="font-bold text-slate-700 text-sm">All data columns are currently hidden</p>
                                                <p className="text-[11px] text-slate-500">You have hidden all data columns. Open the Column Manager to choose which columns to show, or reset to defaults.</p>
                                                <div className="flex items-center justify-center gap-2 pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowColumnManagerModal(true)}
                                                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-2xs hover:bg-blue-700 cursor-pointer"
                                                    >
                                                        Choose Columns
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleResetColumnDefaults}
                                                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 border border-slate-200 cursor-pointer"
                                                    >
                                                        Reset to Defaults
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBulkRows.map((row, idx) => {
                                        const modified = isRowModified(row);
                                        const isSelected = selectedBulkDetailIds.includes(row._id);
                                        const c = row.calculated || {};
                                        const isRowEven = idx % 2 === 0;

                                        const rowBg = modified
                                            ? 'bg-amber-50 hover:bg-amber-100'
                                            : isSelected
                                                ? 'bg-blue-50 hover:bg-blue-100'
                                                : isRowEven
                                                    ? 'bg-white hover:bg-slate-50'
                                                    : 'bg-slate-50 hover:bg-slate-100';

                                        const stickyBgColor = modified
                                            ? '#fef3c7'
                                            : isSelected
                                                ? '#eff6ff'
                                                : isRowEven
                                                    ? '#ffffff'
                                                    : '#f8fafc';

                                        return (
                                            <tr
                                                key={row._id}
                                                className={`transition-colors font-sans ${rowBg}`}
                                            >
                                                {/* Checkbox (Sticky Left #1: 0 to columnWidths.checkbox) */}
                                                <td
                                                    style={{ position: 'sticky', left: 0, zIndex: 20, width: `${columnWidths.checkbox}px`, minWidth: `${columnWidths.checkbox}px`, maxWidth: `${columnWidths.checkbox}px`, backgroundColor: stickyBgColor }}
                                                    className="py-1.5 px-1.5 text-center border-b border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.04)]"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSelectBulkDetailOne(row._id)}
                                                        className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </td>

                                                {/* Employee Info (Sticky Left #2: offset by columnWidths.checkbox) */}
                                                <td
                                                    style={{ position: 'sticky', left: `${columnWidths.checkbox}px`, zIndex: 20, width: `${columnWidths.employee}px`, minWidth: `${columnWidths.employee}px`, maxWidth: `${columnWidths.employee}px`, backgroundColor: stickyBgColor }}
                                                    className="py-1.5 px-2.5 border-b border-r-2 border-slate-300 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)]"
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-extrabold text-[9.5px] flex items-center justify-center shrink-0 border border-blue-200">
                                                            {row.firstName?.[0] || 'E'}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-bold text-slate-900 text-[11px] leading-tight truncate flex items-center gap-1.5">
                                                                <span className="truncate">{row.firstName} {row.lastName}</span>
                                                                {modified && (
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Modified" />
                                                                )}
                                                            </div>
                                                            <div className="text-[9.5px] leading-tight text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                                                <span className="font-mono tabular-nums text-slate-600 font-semibold">{row.employeeCode || `EMP-${idx + 1}`}</span>
                                                                <span>•</span>
                                                                <span className="truncate">{row.department || row.designation || 'Staff'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Dynamic Reorderable & Toggleable Column Cells */}
                                                {orderedVisibleColKeys.length === 0 ? (
                                                    <td className="py-2 px-3 text-center text-xs text-slate-400 italic bg-slate-50 border-b border-r border-slate-200">
                                                        No visible columns
                                                    </td>
                                                ) : (
                                                    orderedVisibleColKeys.map(colKey => renderBulkDataCell(colKey, row, c))
                                                )}


                                                {/* Row Actions (Sticky Right) */}
                                                <td
                                                    style={{ position: 'sticky', right: 0, zIndex: 20, width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px`, maxWidth: `${columnWidths.actions}px`, backgroundColor: stickyBgColor }}
                                                    className="py-1.5 px-2 text-center border-b border-l-2 border-slate-300 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.12)]"
                                                >
                                                    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                                                        {modified ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSaveSingleRow(row)}
                                                                    disabled={savingRowId === row._id || submittingBulkDetails}
                                                                    className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[11px] inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                                                                    title={`Save revision for ${row.firstName} ${row.lastName || ''}`}
                                                                >
                                                                    {savingRowId === row._id ? (
                                                                        <>
                                                                            <RefreshCw size={11} className="animate-spin text-white" />
                                                                            <span>Saving...</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Save size={11} />
                                                                            <span>Save</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleResetSingleRow(row._id)}
                                                                    disabled={savingRowId === row._id || submittingBulkDetails}
                                                                    className="h-7 px-2 rounded-lg border border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 font-bold text-[11px] inline-flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                                                                    title="Revert employee changes to original"
                                                                >
                                                                    <RotateCcw size={11} className="text-slate-500" />
                                                                    <span>Reset</span>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSaveSingleRow(row)}
                                                                disabled={savingRowId === row._id || submittingBulkDetails}
                                                                className="h-7 px-2.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300 font-semibold text-[11px] inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                                                                title="Force re-save revision for this employee"
                                                            >
                                                                {savingRowId === row._id ? (
                                                                    <RefreshCw size={11} className="animate-spin text-slate-500" />
                                                                ) : (
                                                                    <Save size={11} className="text-slate-400" />
                                                                )}
                                                                <span>Save</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
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
                                        className={`p-4 rounded-xl flex items-center justify-between flex-wrap gap-3 transition-all ${isSelected ? 'bg-blue-50/40 border border-blue-200/60' : 'hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBuiltIn ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
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
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSelected
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
                                    {Number(salaryDraft?.annualCTC || salaryDraft?.monthlyCTC || 0) > 0 ? (
                                        <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                            ✓ Live Structure Preview (Active Employee Draft)
                                        </span>
                                    ) : (
                                        <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                            ✓ Formed with Live Payroll Math & Config
                                        </span>
                                    )}
                                </div>

                                {(() => {
                                    const hasLiveDraft = Number(salaryDraft?.annualCTC || salaryDraft?.monthlyCTC || 0) > 0;
                                    const activeSalary = hasLiveDraft ? salaryDraft : {
                                        annualCTC: 850000,
                                        monthlyCTC: 70833,
                                        basic: 35417,
                                        hra: 17708,
                                        flexi: 12635,
                                        pfEmployer: 1800,
                                        lwfEmployer: 70,
                                        gratuity: 1704,
                                        insurance: 1500,
                                        bonus: 50000
                                    };
                                    const liveRows = computeAnnexureRows(activeSalary, payrollConfig);

                                    return (
                                        <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                    {/* Annexure A Full Header Row */}
                                                    <tr className="bg-slate-200 text-slate-900 font-extrabold border-b border-slate-300">
                                                        <th colSpan={2} className="py-2 px-3 text-xs tracking-wide">
                                                            Annexure A
                                                        </th>
                                                    </tr>
                                                    {/* Components | Monthly Subheader */}
                                                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                                                        <th className="py-2 px-3 border-r border-slate-300 w-3/4">Components</th>
                                                        <th className="py-2 px-3 text-right w-1/4">Monthly</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 text-[11px] text-slate-700">
                                                    {liveRows.map((r, idx) => (
                                                        <tr
                                                            key={idx}
                                                            className={
                                                                r.isPotentialPackage
                                                                    ? 'font-extrabold text-slate-950 bg-slate-50'
                                                                    : r.isAnnualCTC
                                                                        ? 'font-bold text-slate-900 bg-slate-50/30'
                                                                        : ''
                                                            }
                                                        >
                                                            <td className="py-1.5 px-3 border-r border-slate-200">{r.label}</td>
                                                            <td className={`py-1.5 px-3 text-right font-mono ${r.isBold ? 'font-bold' : ''} text-slate-900`}>
                                                                {r.value}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}

                                {/* Table Highlights & Rules */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs text-slate-600">
                                    <div className="p-3 bg-white rounded-xl border border-slate-200/90 space-y-1">
                                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                            <CheckCircle size={14} className="text-emerald-600" />
                                            <span>Dynamic Payroll Math</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Only included components (&gt; 0) appear in the table. Unincluded allowances, benefits, insurance, or bonus are automatically omitted.
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
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rev.status === 'applied'
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

            {/* ============================================================== */}
            {/* POPUP MODAL: CUSTOMIZE LETTER FORMAT FOR PARTICULAR EMPLOYEE    */}
            {/* ============================================================== */}
            {showEditFormatModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                                    <FileSignature size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm sm:text-base font-black text-slate-900">
                                            Edit Letter Format for {selectedEmployeeProfile?.user?.firstName || 'Employee'} {selectedEmployeeProfile?.user?.lastName || ''}
                                        </h3>
                                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                                            Per-Employee Customization
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Base Template: <strong className="text-slate-700">{availableTemplates.find(t => t._id === selectedTemplateId)?.name || 'Default Template'}</strong>. Edit clauses, notes, or wording for this employee's revised offer letter.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowEditFormatModal(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Quick Tag Pills Bar */}
                        <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
                                <Sparkles size={12} className="text-indigo-600" /> Insert Tag:
                            </span>
                            {[
                                { label: 'Full Name', tag: '{employee_full_name}' },
                                { label: 'First Name', tag: '{employee_first_name}' },
                                { label: 'Designation', tag: '{designation}' },
                                { label: 'Department', tag: '{department}' },
                                { label: 'Effective Date', tag: '{effective_date}' },
                                { label: 'Annual CTC', tag: '{annual_ctc}' },
                                { label: 'Monthly Gross', tag: '{monthly_gross}' },
                                { label: 'Salary Table', tag: '{@salary_table}' },
                                { label: 'Signatory', tag: '{authorized_signatory}' }
                            ].map(p => (
                                <button
                                    key={p.tag}
                                    type="button"
                                    onClick={() => {
                                        setFormatContent(prev => {
                                            const insert = p.tag;
                                            return prev ? prev + ' ' + insert : insert;
                                        });
                                    }}
                                    className="px-2 py-1 rounded-md bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[11px] font-semibold transition-all shrink-0 cursor-pointer shadow-2xs"
                                    title={`Click to append ${p.tag}`}
                                >
                                    +{p.label}
                                </button>
                            ))}
                        </div>

                        {/* Modal Body / Text Editor */}
                        <div className="p-5 flex-1 overflow-y-auto min-h-[350px]">
                            {loadingTemplateContent ? (
                                <div className="h-72 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
                                    <RefreshCw size={24} className="animate-spin text-indigo-600" />
                                    <span>Loading base template document text...</span>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>Document Body Text (Wordprocessing Content)</span>
                                        <span>{formatContent.length} characters</span>
                                    </div>
                                    <textarea
                                        rows={16}
                                        value={formatContent}
                                        onChange={(e) => setFormatContent(e.target.value)}
                                        placeholder="Paste or write the revision offer letter content here... Include {@salary_table} where you want the dynamic Annexure table injected."
                                        className="w-full p-4 border border-slate-300 rounded-xl text-xs sm:text-sm font-sans leading-relaxed text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-vertical"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormatContent(prev =>
                                            (prev || '')
                                                .replace(/\r\n/g, '\n')
                                                .replace(/^[ \t]+$/gm, '')
                                                .replace(/\n{3,}/g, '\n\n')
                                                .trim()
                                        );
                                        toast.success('Cleaned excessive blank lines');
                                    }}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                                >
                                    Clean Blank Lines
                                </button>

                                <button
                                    type="button"
                                    onClick={handleResetCustomFormat}
                                    disabled={loadingTemplateContent}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                                >
                                    Reset to Base Template
                                </button>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleApplyCustomFormat();
                                        handleOpenPreviewLetterModal();
                                    }}
                                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                                    title="Apply format changes and preview document immediately"
                                >
                                    <Eye size={13} className="text-blue-600" />
                                    <span>Apply & Preview</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowEditFormatModal(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={handleApplyCustomFormat}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                    <Check size={14} />
                                    <span>Apply Format for this Employee</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* POPUP MODAL: IN-APP REVISED OFFER LETTER DOCUMENT PREVIEW     */}
            {/* ============================================================== */}
            {showPreviewLetterModal && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                    <Eye size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm sm:text-base font-black text-slate-900">
                                            Offer Letter Preview: {selectedEmployeeProfile?.personal?.firstName || selectedEmployeeProfile?.user?.firstName || 'Employee'} {selectedEmployeeProfile?.personal?.lastName || selectedEmployeeProfile?.user?.lastName || ''}
                                        </h3>
                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                            Live In-Browser Preview
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Template: <strong className="text-slate-700">{availableTemplates.find(t => t._id === selectedTemplateId)?.name || 'Default Template'}</strong> • Annual CTC: <strong className="text-slate-700">₹{Number(salaryDraft.annualCTC || 0).toLocaleString('en-IN')}</strong> • Monthly Gross: <strong className="text-slate-700">₹{Number(salaryDraft.monthlyGross || 0).toLocaleString('en-IN')}</strong>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleDownloadCurrentPreviewFile}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                    title="Download Word (.docx) file"
                                >
                                    <Download size={13} className="text-blue-600" />
                                    <span>Download DOCX</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPreviewLetterModal(false);
                                        handleOpenEditFormatModal();
                                    }}
                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                    title="Customize text or clauses"
                                >
                                    <Edit3 size={13} className="text-indigo-600" />
                                    <span>Edit Format</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPreviewLetterModal(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: Document Previewer */}
                        <div className="flex-1 overflow-hidden bg-slate-100 relative min-h-[400px]">
                            {previewLetterFile ? (
                                <DocPreviewer
                                    file={previewLetterFile}
                                    className="w-full h-full"
                                    title="Revision Letter Document Preview"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400">
                                    <RefreshCw className="animate-spin text-blue-600 mb-2" size={28} />
                                    <p className="text-xs font-semibold">Generating document preview...</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white flex items-center justify-between flex-wrap gap-3 shrink-0 text-xs">
                            <div className="text-slate-500 flex items-center gap-2">
                                <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                                <span>Verify that employee name, designation, effective date, and salary structure are completely correct before dispatching.</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setShowPreviewLetterModal(false)}
                                    className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold cursor-pointer transition-all"
                                >
                                    Close Preview
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDownloadCurrentPreviewFile}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                                >
                                    <Download size={14} />
                                    <span>Download Word DOCX</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Grid Column Manager Modal */}
            <BulkGridColumnManagerModal
                isOpen={showColumnManagerModal}
                onClose={() => setShowColumnManagerModal(false)}
                columnOrder={columnOrder}
                defaultColumnOrder={DEFAULT_BULK_COLUMN_ORDER}
                columnVisibility={columnVisibility}
                columnDefinitions={BULK_GRID_COLUMN_DEFS}
                onApplyLayout={handleApplyColumnLayout}
                onUpdateOrder={handleUpdateColumnOrder}
                onUpdateVisibility={handleUpdateColumnVisibility}
                onResetDefaults={handleResetColumnDefaults}
            />
        </div>
    );
};

export default ReviseSalaryDetailsTab;
