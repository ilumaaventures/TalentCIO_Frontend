import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Check,
  Save,
  Plus,
  Trash2,
  Calculator,
  X,
  Download,
  RotateCcw,
  FileText,
  Eye,
  UserCheck,
  CreditCard,
  AlertTriangle,
  Search,
  Building2,
  ChevronDown,
  FileSpreadsheet,
  PlayCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  DollarSign,
  Filter,
  Calendar,
  Layers,
  Sparkles,
  MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/apiClient';
import { useAuth } from '@/features/auth/context/AuthContext';
import { fmtMoney } from '@/features/payroll/utils/payroll';
import { getMonthlyPT } from '../utils/statutoryEngine';
import PayslipModal from './PayslipModal';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const monthName = (m) => MONTH_NAMES[m - 1] || '';

// Compact Summary Card
const SummaryCard = ({ label, value, subtext, highlight = false, alert = false, onClick, clickable = false }) => (
  <div
    onClick={onClick}
    className={`rounded-lg p-2.5 sm:p-3 border shadow-2xs transition-all ${
      clickable ? 'cursor-pointer hover:shadow-sm' : ''
    } ${
      alert
        ? 'bg-rose-50/70 border-rose-300 hover:bg-rose-100/70'
        : highlight
          ? 'bg-blue-50/70 border-blue-200'
          : 'bg-white border-slate-200'
    }`}
  >
    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
      {label}
    </div>
    <div className={`text-lg sm:text-xl font-black ${alert ? 'text-rose-600' : 'text-slate-900'}`}>
      {value}
    </div>
    {subtext && <div className="text-[10px] text-slate-400 mt-0.5">{subtext}</div>}
  </div>
);

// Breakdown modal helper row
const BreakdownRow = ({ label, paid, master, badge }) => (
  <div className="flex items-center justify-between px-4 py-2.5">
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-slate-600 font-medium">{label}</span>
      {badge && (
        <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${
          badge.includes('Remainder')
            ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          {badge}
        </span>
      )}
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <span className="font-semibold text-slate-900">{fmtMoney(paid)}</span>
      {master !== undefined && Number(paid) !== Number(master) && (
        <span className="text-xs text-slate-400 font-normal line-through">
          {fmtMoney(master)}
        </span>
      )}
    </div>
  </div>
);

// Deduction helper row
const DeductionRow = ({ label, amount, isContrib = false, isEditable = false, value, onChange }) => (
  <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 last:border-0">
    <span className={isContrib ? "text-slate-500 font-normal text-xs" : "text-slate-600 font-medium"}>
      {label}
      {isContrib && <span className="text-[10px] text-slate-400 ml-1">(Employer Contribution)</span>}
    </span>
    {isEditable ? (
      <input
        type="number"
        min="0"
        placeholder={amount !== undefined ? String(amount) : "0"}
        value={value !== undefined && value !== null ? value : ''}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-24 border border-slate-300 bg-white text-slate-900 rounded px-2 py-1 text-xs text-right font-semibold focus:outline-none focus:border-blue-500"
      />
    ) : (
      <span className={`font-semibold ${isContrib ? "text-slate-700" : "text-rose-600"}`}>
        {isContrib ? '' : '-'}{fmtMoney(amount)}
      </span>
    )}
  </div>
);

const PayrollProcessing = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles?.some(role => ['Admin', 'Super Admin', 'System Admin', 'HR Admin'].includes(role))
    || user?.permissions?.includes('*')
    || user?.permissions?.includes('payroll.salary.manage');

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [monthWorkingDays, setMonthWorkingDays] = useState(30);

  // Data & State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState({});
  const [rows, setRows] = useState({});

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterCompType, setFilterCompType] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, unprocessed, draft, approved, paid
  const [filterNeedsAttention, setFilterNeedsAttention] = useState(false);
  const [sortKey, setSortKey] = useState('name'); // name, type, net, status
  const [sortDir, setSortDir] = useState('asc'); // asc, desc

  // Modals & Drawers
  const [breakdownEmployee, setBreakdownEmployee] = useState(null);
  const [localEarnings, setLocalEarnings] = useState([]);
  const [localDeductions, setLocalDeductions] = useState([]);
  const [localExcludedClaimIds, setLocalExcludedClaimIds] = useState(new Set());
  const [localVariableTransactions, setLocalVariableTransactions] = useState([]);

  // Full & Final Modal State
  const [fnfEmployee, setFnfEmployee] = useState(null);
  const [fnfForm, setFnfForm] = useState({
    lastWorkingDay: now.toISOString().split('T')[0],
    noticePeriodServedDays: 0,
    noticePeriodRequiredDays: 0,
    leaveEncashmentDays: 0,
    gratuityPayout: 0,
    noticeShortfallDeduction: 0,
    comments: '',
    hoursWorked: '',
    unitsProduced: '',
    ratePerUnit: ''
  });
  const [processingFnf, setProcessingFnf] = useState(false);

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Mark as Paid Modal
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [targetPayrollForPaid, setTargetPayrollForPaid] = useState(null);
  const [paymentDate, setPaymentDate] = useState(now.toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [transactionId, setTransactionId] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');

  // Payslip Modal
  const [viewingPayslipData, setViewingPayslipData] = useState(null);
  const [loadingPayslip, setLoadingPayslip] = useState(false);
  const [config, setConfig] = useState(null);

  // 3-Dot Action Menu State
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);

  // Close 3-Dot Menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('[data-actions-menu="true"]')) {
        setActiveActionMenuId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Fetch Payroll Roll Data & Settings
  const loadPayrollData = useCallback(async () => {
    try {
      setLoading(true);
      const [res, cfgRes] = await Promise.all([
        api.get('/payroll/active-employees', { params: { month, year } }),
        api.get('/payroll/config').catch(() => ({ data: null }))
      ]);

      const cfg = cfgRes?.data || {};
      setConfig(cfg);

      const list = res.data?.employees || [];
      const mWorkingDays = Number(res.data?.monthWorkingDays) || Number(cfg.defaultWorkingDays) || 30;
      setMonthWorkingDays(mWorkingDays);
      setEmployees(list);

      // Initialize selected map & rows map
      const initialSelected = {};
      const initialRows = {};

      list.forEach(emp => {
        const empId = emp.employeeId || emp._id || emp.userId;
        const isProcessed = emp.status && emp.status !== 'draft' && emp.status !== 'unprocessed';
        // Auto-select unfinalized rows
        initialSelected[empId] = !isProcessed;

        const bPct = emp.flags?.basicPercent !== undefined
          ? (emp.flags.basicPercent > 1 ? emp.flags.basicPercent : emp.flags.basicPercent * 100)
          : (cfg.basicPercent ? (cfg.basicPercent > 1 ? cfg.basicPercent : cfg.basicPercent * 100) : 50);

        const hPct = emp.flags?.hraPercent !== undefined
          ? (emp.flags.hraPercent > 1 ? emp.flags.hraPercent : emp.flags.hraPercent * 100)
          : (cfg.hraPercent ? (cfg.hraPercent > 1 ? cfg.hraPercent : cfg.hraPercent * 100) : 50);

        initialRows[empId] = {
          paidDays: emp.paidDays !== undefined ? emp.paidDays : mWorkingDays,
          workingDays: emp.workingDays !== undefined ? emp.workingDays : mWorkingDays,
          paidLeaves: emp.paidLeaves || 0,
          unpaidLeaves: emp.unpaidLeaves || 0,
          hoursWorked: emp.hoursWorked || 160,
          lop: emp.lop || 0,
          joiningBonus: emp.variablePay?.joiningBonus ?? emp.bonus ?? '',
          loyaltyBonus: '',
          incentive: emp.variablePay?.incentive ?? emp.incentives ?? '',
          specialBonus: emp.variablePay?.specialBonus ?? '',
          otherAllowanceArrear: emp.variablePay?.otherAllowanceArrear ?? '',
          tds: emp.deductions?.tds !== undefined ? emp.deductions.tds : '',
          otherEarnings: emp.earnings?.customEarnings || [],
          otherDeductions: emp.deductions?.customDeductions || [],
          excludedClaimIds: [],
          variableTransactions: emp.variableTransactions || [],
          // Statutory settings overrides
          pfEnabled: emp.flags?.pfEnabled !== undefined ? emp.flags.pfEnabled : true,
          tdsEnabled: emp.flags?.tdsEnabled !== undefined ? emp.flags.tdsEnabled : true,
          esiEnabled: emp.flags?.esiEnabled !== undefined ? emp.flags.esiEnabled : true,
          ptEnabled: emp.flags?.ptEnabled !== undefined ? emp.flags.ptEnabled : true,
          lwfEnabled: emp.flags?.lwfEnabled !== undefined ? emp.flags.lwfEnabled : true,
          gratuityEnabled: emp.flags?.gratuityEnabled !== undefined ? emp.flags.gratuityEnabled : true,
          includePfInCTC: true,
          includeGratuityInCTC: true,
          basicPercent: bPct,
          hraPercent: hPct,
          overtime: { weekdayHours: 0, weekendHours: 0, holidayHours: 0, customAmount: 0 }
        };
      });

      setSelected(initialSelected);
      setRows(initialRows);
    } catch (err) {
      console.error('Failed to load active payroll employees:', err);
      toast.error(err.response?.data?.message || 'Error loading payroll roll.');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadPayrollData();
  }, [loadPayrollData]);

  // Update specific row values
  const updateRow = (empId, field, val) => {
    setRows(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: val
      }
    }));
  };

  // Dynamic Salary Components defined in company settings
  const activeSalaryComponents = useMemo(() => {
    if (config?.salaryComponents && config.salaryComponents.length > 0) {
      return config.salaryComponents;
    }
    const bVal = config?.basicPercent ? (config.basicPercent > 1 ? config.basicPercent : config.basicPercent * 100) : 50;
    const hVal = config?.hraPercent ? (config.hraPercent > 1 ? config.hraPercent : config.hraPercent * 100) : 50;
    return [
      { id: 'basic', name: 'Basic Salary', type: 'earning', linkedTo: 'ctc_percent', linkValue: bVal, includeInCTC: true },
      { id: 'hra', name: 'House Rent Allowance (HRA)', type: 'earning', linkedTo: 'basic_percent', linkValue: hVal, includeInCTC: true },
      { id: 'special', name: 'Special Allowance', type: 'earning', linkedTo: 'remainder', linkValue: 0, includeInCTC: true }
    ];
  }, [config]);

  const activeEarningComponents = useMemo(() => {
    return activeSalaryComponents.filter(c => c.type === 'earning');
  }, [activeSalaryComponents]);

  // Recalculate row snapshot on the fly for preview (100% settings-derived and employee configured)
  const getEmployeeSnapshot = (emp) => {
    const empId = emp.employeeId || emp._id || emp.userId;
    const row = rows[empId] || {};
    const pDays = Number(row.paidDays !== undefined ? row.paidDays : emp.paidDays) || 0;
    const wDays = Number(row.workingDays !== undefined ? row.workingDays : emp.workingDays) || monthWorkingDays;
    const ratio = wDays > 0 ? (pDays / wDays) : 1;

    const ctc = Number(emp.ctcMonthly ?? emp.monthlyCTC) || 0;

    const componentsBreakdown = {};
    let sumOfNonRemainder = 0;

    // Pass 1: Compute non-remainder earnings from settings and employee structure
    activeEarningComponents.forEach(c => {
      if (c.linkedTo !== 'remainder') {
        let masterVal = 0;
        if (c.id === 'basic' || c.linkedTo === 'ctc_percent') {
          const overridePct = row[`${c.id}Percent`] !== undefined
            ? Number(row[`${c.id}Percent`])
            : (c.id === 'basic' && row.basicPercent !== undefined ? Number(row.basicPercent) : undefined);
          const defaultPct = c.linkValue || (config?.basicPercent ? (config.basicPercent > 1 ? config.basicPercent : config.basicPercent * 100) : 50);
          const pct = (overridePct !== undefined ? overridePct : defaultPct) / 100;
          masterVal = ctc > 0
            ? (overridePct !== undefined
                ? Math.round(ctc * pct)
                : (emp.masterEarnings?.[c.id] !== undefined
                    ? Number(emp.masterEarnings[c.id])
                    : (emp.earnings?.[c.id] !== undefined && Number(emp.earnings[c.id]) > 0
                        ? Number(emp.earnings[c.id])
                        : Math.round(ctc * pct))))
            : 0;
        } else if (c.id === 'hra' || c.linkedTo === 'basic_percent') {
          const basicMaster = componentsBreakdown['basic']?.master || (ctc > 0 ? Math.round(ctc * 0.5) : 0);
          const overridePct = row[`${c.id}Percent`] !== undefined
            ? Number(row[`${c.id}Percent`])
            : (c.id === 'hra' && row.hraPercent !== undefined ? Number(row.hraPercent) : undefined);
          const defaultPct = c.linkValue || (config?.hraPercent ? (config.hraPercent > 1 ? config.hraPercent : config.hraPercent * 100) : 50);
          const pct = (overridePct !== undefined ? overridePct : defaultPct) / 100;
          masterVal = ctc > 0
            ? (overridePct !== undefined
                ? Math.round(basicMaster * pct)
                : (emp.masterEarnings?.[c.id] !== undefined
                    ? Number(emp.masterEarnings[c.id])
                    : (emp.earnings?.[c.id] !== undefined && Number(emp.earnings[c.id]) > 0
                        ? Number(emp.earnings[c.id])
                        : Math.round(basicMaster * pct))))
            : 0;
        } else if (c.linkedTo === 'fixed') {
          masterVal = row[c.id] !== undefined && row[c.id] !== ''
            ? Number(row[c.id])
            : (emp.masterEarnings?.[c.id] !== undefined
                ? Number(emp.masterEarnings[c.id])
                : (emp.earnings?.[c.id] !== undefined
                    ? Number(emp.earnings[c.id])
                    : (Number(c.linkValue) || 0)));
        }
        const paidVal = Math.round(masterVal * ratio);
        componentsBreakdown[c.id] = { id: c.id, name: c.name, master: masterVal, paid: paidVal, linkedTo: c.linkedTo };
        if (c.includeInCTC !== false) {
          sumOfNonRemainder += masterVal;
        }
      }
    });

    // Statutory deductions needed for Remainder calculation
    const basicMaster = componentsBreakdown['basic']?.master || 0;

    const pfEmployerInCTC = (row.pfEnabled !== false && ctc > 0 && basicMaster > 0)
      ? (config?.pfCalculationType === 'fixed' ? Number(config.pfAmountEmployer || 1800) : Math.round(Math.min(basicMaster, Number(config?.pfCap || 15000)) * (Number(config?.pfEmployerRate) || 0.12)))
      : 0;
    const gratuityInCTC = (row.gratuityEnabled !== false && ctc > 0 && basicMaster > 0)
      ? Math.round(basicMaster * (Number(config?.gratuityRate) || 0.0481))
      : 0;
    const lwfEmployerInCTC = (row.lwfEnabled !== false && ctc > 0) ? (Number(config?.lwfEmployer) || 35) : 0;
    const insuranceEmployerAmt = Number(emp.employerContributions?.insuranceEmployer ?? emp.flags?.insuranceAmount ?? 0);
    const insuranceInCTC = (emp.flags?.insuranceDeductFromFlexi !== false && ctc > 0) ? insuranceEmployerAmt : 0;
    const npsEmployerAmt = Number(emp.employerContributions?.nps ?? emp.flags?.employerNPS ?? 0);

    // Pass 2: Compute remainder earnings (One component must act as the CTC balance remainder)
    activeEarningComponents.forEach(c => {
      if (c.linkedTo === 'remainder') {
        const masterRemainder = ctc > 0 ? Math.max(0, ctc - sumOfNonRemainder - pfEmployerInCTC - gratuityInCTC - lwfEmployerInCTC - insuranceInCTC - npsEmployerAmt) : 0;
        const paidRemainder = Math.round(masterRemainder * ratio);
        componentsBreakdown[c.id] = { id: c.id, name: c.name, master: masterRemainder, paid: paidRemainder, linkedTo: 'remainder' };
      }
    });

    const basic = componentsBreakdown['basic']?.paid || 0;
    const hra = componentsBreakdown['hra']?.paid || 0;
    const allowances = componentsBreakdown['special']?.paid || componentsBreakdown['flexi']?.paid || 0;
    const masterBasicVal = componentsBreakdown['basic']?.master || 0;
    const masterHraVal = componentsBreakdown['hra']?.master || 0;
    const masterAllowancesVal = componentsBreakdown['special']?.master || componentsBreakdown['flexi']?.master || 0;

    // Variable pay
    const jBonus = Number(row.joiningBonus) || 0;
    const lBonus = Number(row.loyaltyBonus) || 0;
    const inc = Number(row.incentive) || 0;
    const sBonus = Number(row.specialBonus) || 0;
    const otherEarningsSum = (row.otherEarnings || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const reimbursements = emp.reimbursementsTotal || (emp.reimbursements ? emp.reimbursements.reduce((acc, r) => acc + (Number(r.approved) || 0), 0) : 0);

    const totalEarningComponentsPaid = Object.values(componentsBreakdown).reduce((sum, item) => sum + (item.paid || 0), 0);
    const totalEarnings = totalEarningComponentsPaid + jBonus + lBonus + inc + sBonus + otherEarningsSum + reimbursements;

    // Settings-derived statutory parameters
    const pfRate = Number(config?.pfRate) || 0.12;
    const pfCap = Number(config?.pfCap) || 15000;
    const esiThreshold = Number(config?.esiBasicThreshold) || 21000;
    const esiRate = Number(config?.esiEmployeeRate) || 0.0075;
    const lwfEmployeeRate = Number(config?.lwfEmployee) || 15;

    // Statutory deductions strictly derived: ZERO if CTC or earnings is 0
    let pf = 0;
    if (row.pfEnabled !== false && ctc > 0 && basic > 0) {
      if (config?.pfCalculationType === 'fixed') {
        pf = Number(config.pfAmountEmployee) || 1800;
      } else {
        const pfBase = Math.min(basic, pfCap);
        pf = emp.deductions?.pfEmployee || emp.deductions?.pf || Math.round(pfBase * pfRate);
      }
    }

    const projectedMonthlyGross = ratio > 0 ? (totalEarnings / ratio) : totalEarnings;
    let esi = 0;
    if (row.esiEnabled !== false && ctc > 0 && totalEarnings > 0 && projectedMonthlyGross <= esiThreshold) {
      esi = emp.deductions?.esiEmployee || emp.deductions?.esi || Math.round(totalEarnings * esiRate);
    }

    let pt = 0;
    if (row.ptEnabled !== false && ctc > 0 && totalEarnings > 0) {
      if (emp.deductions?.professionalTax !== undefined && Number(emp.deductions.professionalTax) > 0) {
        pt = Number(emp.deductions.professionalTax);
      } else {
        const ptState = emp.flags?.ptState || emp.ptState || 'custom';
        pt = ptState && ptState !== 'custom'
          ? getMonthlyPT(ptState, totalEarnings, month)
          : (totalEarnings > 7500 ? 200 : totalEarnings > 5000 ? 175 : 0);
      }
    }

    const isLwfMonth = !month || (Number(month) % 6 === 0);
    let lwf = 0;
    if (row.lwfEnabled !== false && isLwfMonth && ctc > 0 && totalEarnings > 0) {
      lwf = emp.deductions?.lwfEmployee || emp.deductions?.lwf || lwfEmployeeRate;
    }

    const tds = row.tds !== '' && row.tds !== undefined ? Number(row.tds) : (ctc > 0 ? (emp.deductions?.tds || 0) : 0);
    const otherDeductionsSum = (row.otherDeductions || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const loanDeduction = ctc > 0 ? (emp.deductions?.loanDeduction || 0) : 0;

    const totalDeductions = pf + esi + pt + lwf + tds + otherDeductionsSum + loanDeduction;
    const rawNet = totalEarnings - totalDeductions;
    const netSalary = Math.max(0, rawNet);
    const isClamped = rawNet < 0;

    return {
      basic,
      hra,
      allowances,
      masterBasic: masterBasicVal,
      masterHra: masterHraVal,
      masterAllowances: masterAllowancesVal,
      componentsBreakdown,
      totalEarnings,
      pf,
      esi,
      pt,
      lwf,
      tds,
      pfEmployer: pfEmployerInCTC,
      gratuityEmployer: gratuityInCTC,
      lwfEmployer: lwfEmployerInCTC,
      insuranceEmployer: insuranceEmployerAmt,
      npsEmployer: npsEmployerAmt,
      annualBenefits: emp.annualBenefits || [],
      totalDeductions,
      netSalary,
      isClamped,
      ratio
    };
  };

  // Selected Employees List
  const selectedEmployees = useMemo(() => {
    return employees.filter(emp => selected[emp.employeeId || emp._id || emp.userId]);
  }, [employees, selected]);

  // Needs Attention Count
  const needsAttentionCount = useMemo(() => {
    return employees.filter(emp => {
      const snap = getEmployeeSnapshot(emp);
      return snap.isClamped || emp.flags?.belowMinWage || (emp.paidDays > emp.workingDays);
    }).length;
  }, [employees, rows, monthWorkingDays]);

  // Aggregated Previews
  const totalGrossPreview = useMemo(() => {
    return selectedEmployees.reduce((acc, emp) => acc + getEmployeeSnapshot(emp).totalEarnings, 0);
  }, [selectedEmployees, rows, monthWorkingDays]);

  const totalNetPreview = useMemo(() => {
    return selectedEmployees.reduce((acc, emp) => acc + getEmployeeSnapshot(emp).netSalary, 0);
  }, [selectedEmployees, rows, monthWorkingDays]);

  // Department Options
  const deptOptions = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      const d = e.department;
      if (d) set.add(typeof d === 'string' ? d : d.name);
    });
    return Array.from(set).filter(Boolean);
  }, [employees]);

  // Compensation Type Options
  const compTypeOptions = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      if (e.compensationType) set.add(e.compensationType);
    });
    return Array.from(set).filter(Boolean);
  }, [employees]);

  // Filtered & Sorted Employees
  const filteredSortedEmployees = useMemo(() => {
    let list = [...employees];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e =>
        e.fullName?.toLowerCase().includes(q) ||
        e.employeeCode?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q)
      );
    }

    if (filterDept) {
      list = list.filter(e => {
        const d = typeof e.department === 'string' ? e.department : e.department?.name;
        return d === filterDept;
      });
    }

    if (filterCompType) {
      list = list.filter(e => e.compensationType === filterCompType);
    }

    if (filterStatus !== 'all') {
      list = list.filter(e => (e.status || 'unprocessed') === filterStatus);
    }

    if (filterNeedsAttention) {
      list = list.filter(e => {
        const snap = getEmployeeSnapshot(e);
        return snap.isClamped || e.flags?.belowMinWage || (e.paidDays > e.workingDays);
      });
    }

    list.sort((a, b) => {
      let va = a.fullName || '';
      let vb = b.fullName || '';

      if (sortKey === 'net') {
        va = getEmployeeSnapshot(a).netSalary;
        vb = getEmployeeSnapshot(b).netSalary;
      } else if (sortKey === 'type') {
        va = a.compensationType || 'monthly_salary';
        vb = b.compensationType || 'monthly_salary';
      } else if (sortKey === 'status') {
        va = a.status || 'unprocessed';
        vb = b.status || 'unprocessed';
      }

      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [employees, searchQuery, filterDept, filterCompType, filterStatus, filterNeedsAttention, sortKey, sortDir, rows, monthWorkingDays]);

  // Process / Save as Draft Action
  const submitPayrollBatch = async (saveAsDraft) => {
    if (selectedEmployees.length === 0) {
      toast.error('No employees selected for payroll batch.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        month,
        year,
        saveAsDraft,
        employees: selectedEmployees.map(emp => {
          const empId = emp.employeeId || emp._id || emp.userId;
          const row = rows[empId] || {};
          const excludedIds = new Set(row.excludedClaimIds || []);
          const filteredClaims = (emp.claims || emp.reimbursements || []).filter(c => !excludedIds.has(c._id));
          return {
            employeeId: empId,
            userId: empId,
            workingDays: Number(row.workingDays) || monthWorkingDays,
            paidDays: Number(row.paidDays) || 0,
            paidLeaves: Number(row.paidLeaves ?? emp.paidLeaves) || 0,
            unpaidLeaves: Number(row.unpaidLeaves ?? emp.unpaidLeaves) || 0,
            lop: Math.max(0, (Number(row.workingDays) || monthWorkingDays) - (Number(row.paidDays) || 0)),
            hoursWorked: Number(row.hoursWorked) || 0,
            flags: {
              pfEnabled: row.pfEnabled,
              tdsEnabled: row.tdsEnabled,
              esiEnabled: row.esiEnabled,
              ptEnabled: row.ptEnabled,
              lwfEnabled: row.lwfEnabled,
              gratuityEnabled: row.gratuityEnabled,
              basicPercent: row.basicPercent,
              hraPercent: row.hraPercent
            },
            variablePay: {
              joiningBonus: Number(row.joiningBonus) || 0,
              incentive: Number(row.incentive) || 0,
              specialBonus: Number(row.specialBonus) || 0,
              otherAllowanceArrear: Number(row.otherAllowanceArrear) || 0
            },
            earnings: {
              overtime: Number(row.overtime?.customAmount) || 0
            },
            deductions: {
              ...(row.tds !== '' && row.tds !== undefined ? { tds: Number(row.tds) } : {}),
              loanDeduction: Number(emp.deductions?.loanDeduction) || 0,
              advanceDeduction: Number(emp.deductions?.advanceDeduction) || 0
            },
            reimbursements: filteredClaims
          };
        })
      };

      const res = await api.post('/payroll/process', payload);
      toast.success(res.data?.message || (saveAsDraft ? 'Payroll saved as draft!' : 'Payroll processed successfully!'));
      setShowConfirmModal(false);
      loadPayrollData();
    } catch (err) {
      console.error('Batch process error:', err);
      toast.error(err.response?.data?.message || 'Failed to process payroll batch.');
    } finally {
      setSaving(false);
    }
  };

  // Reset Month's Payroll
  const handleResetMonth = async () => {
    if (!window.confirm(`Are you sure you want to delete all non-paid payroll drafts for ${monthName(month)} ${year}?`)) return;
    try {
      const res = await api.post('/payroll/bulk-delete', { month, year });
      toast.success(res.data?.message || 'Monthly roll drafts cleared.');
      loadPayrollData();
    } catch (err) {
      console.error('Reset month error:', err);
      toast.error(err.response?.data?.message || 'Failed to reset monthly payroll.');
    }
  };

  // Download Inputs Only Excel
  const handleDownloadInputsOnly = async () => {
    try {
      const response = await api.get('/payroll/export-inputs', {
        params: { month, year },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payroll_Inputs_${monthName(month)}_${year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Payroll inputs template downloaded.');
    } catch (err) {
      console.error('Export inputs error:', err);
      toast.error('Failed to export inputs template.');
    }
  };

  // Export Full Register Excel
  const handleExportRegister = async () => {
    try {
      const response = await api.get('/payroll/export', {
        params: { month, year },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payroll_Register_${monthName(month)}_${year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Payroll register exported successfully.');
    } catch (err) {
      console.error('Export register error:', err);
      toast.error('Failed to export payroll register.');
    }
  };

  // Bulk Approve Drafts
  const handleBulkApprove = async () => {
    const draftIds = selectedEmployees.filter(e => e.status === 'draft' && e.payrollId).map(e => e.payrollId);
    if (draftIds.length === 0) {
      toast.error('No selected draft records to approve.');
      return;
    }
    try {
      const res = await api.put('/payroll/bulk-approve', {
        month,
        year,
        payrollIds: draftIds
      });
      toast.success(res.data?.message || `${draftIds.length} records approved!`);
      loadPayrollData();
    } catch (err) {
      console.error('Bulk approve error:', err);
      toast.error(err.response?.data?.message || 'Failed to approve records.');
    }
  };

  // View / Print Official Payslip (Flance Format)
  const handleViewPayslip = async (emp) => {
    if (!emp) return;
    const empId = emp.employeeId || emp._id || emp.userId;
    try {
      setLoadingPayslip(true);
      if (emp.payrollId) {
        const res = await api.get(`/payroll/records/${emp.payrollId}/generate-payslip`);
        if (res.data?.payslip) {
          setViewingPayslipData(res.data.payslip);
          return;
        }
      }

      // Live on-the-fly preview simulation
      const row = rows[empId] || {};
      const previewRes = await api.post('/payroll/preview', {
        employeeId: empId,
        userId: empId,
        month,
        year,
        attendance: {
          workingDays: Number(row.workingDays) || monthWorkingDays,
          paidDays: Number(row.paidDays) || 0,
          lop: Math.max(0, (Number(row.workingDays) || monthWorkingDays) - (Number(row.paidDays) || 0)),
          hoursWorked: Number(row.hoursWorked) || 0,
        },
        adjustments: {
          bonus: (Number(row.joiningBonus) || 0) + (Number(row.loyaltyBonus) || 0) + (Number(row.specialBonus) || 0),
          incentives: Number(row.incentive) || 0,
          pfEnabled: row.pfEnabled,
          tdsEnabled: row.tdsEnabled,
          esiEnabled: row.esiEnabled,
          ptEnabled: row.ptEnabled,
          lwfEnabled: row.lwfEnabled,
          gratuityEnabled: row.gratuityEnabled,
          basicPercent: row.basicPercent,
          hraPercent: row.hraPercent
        }
      });

      const calc = previewRes.data?.calculation || previewRes.data?.snapshot || previewRes.data;
      if (calc) {
        setViewingPayslipData({
          ...calc,
          employee: {
            employeeCode: emp.employeeCode,
            fullName: emp.fullName,
            designation: emp.designation,
            department: emp.department,
            joiningDate: emp.joiningDate,
            panNumber: emp.panNumber,
            uanNumber: emp.uanNumber,
            pfNumber: emp.pfNumber,
            esiNumber: emp.esiNumber,
            bankDetails: { accountNumber: emp.bankAccount },
            location: emp.location || 'Office',
            gender: emp.gender || 'Male'
          },
          period: `${monthName(month)} ${year}`,
          month,
          year,
          workingDays: row.workingDays || monthWorkingDays,
          paidDays: row.paidDays || monthWorkingDays
        });
      } else {
        toast.error('Unable to generate payslip preview.');
      }
    } catch (err) {
      console.error('Failed to generate payslip:', err);
      toast.error(err.response?.data?.message || 'Failed to generate payslip.');
    } finally {
      setLoadingPayslip(false);
    }
  };

  // Open Breakdown Drawer
  const handleOpenBreakdown = (emp) => {
    const empId = emp.employeeId || emp._id || emp.userId;
    const row = rows[empId] || {};
    setLocalEarnings(row.otherEarnings || []);
    setLocalDeductions(row.otherDeductions || []);
    setLocalExcludedClaimIds(new Set(row.excludedClaimIds || []));
    setLocalVariableTransactions(row.variableTransactions || []);
    setBreakdownEmployee(emp);
  };

  // Save Adjustments from Drawer
  const handleSaveDrawerAdjustments = () => {
    if (!breakdownEmployee) return;
    const empId = breakdownEmployee.employeeId || breakdownEmployee._id || breakdownEmployee.userId;
    setRows(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        otherEarnings: localEarnings.filter(e => e.name.trim() !== ''),
        otherDeductions: localDeductions.filter(d => d.name.trim() !== ''),
        excludedClaimIds: Array.from(localExcludedClaimIds),
        variableTransactions: localVariableTransactions
      }
    }));
    toast.success(`Adjustments saved for ${breakdownEmployee.fullName}`);
    setBreakdownEmployee(null);
  };

  // Process Full & Final
  const handleProcessFnf = async (e) => {
    e.preventDefault();
    if (!fnfEmployee) return;
    try {
      setProcessingFnf(true);
      const payload = {
        employeeId: fnfEmployee.employeeId,
        lastWorkingDay: fnfForm.lastWorkingDay,
        noticePeriodServedDays: Number(fnfForm.noticePeriodServedDays) || 0,
        noticePeriodRequiredDays: Number(fnfForm.noticePeriodRequiredDays) || 0,
        leaveEncashmentDays: Number(fnfForm.leaveEncashmentDays) || 0,
        gratuityPayout: Number(fnfForm.gratuityPayout) || 0,
        noticeShortfallDeduction: Number(fnfForm.noticeShortfallDeduction) || 0,
        comments: fnfForm.comments || ''
      };

      const res = await api.post('/payroll/full-and-final', payload);
      toast.success(res.data?.message || 'Full & Final Settlement processed!');
      setFnfEmployee(null);
      loadPayrollData();
    } catch (err) {
      console.error('FnF error:', err);
      toast.error(err.response?.data?.message || 'Failed to process FnF settlement.');
    } finally {
      setProcessingFnf(false);
    }
  };

  // Mark as Paid
  const handleConfirmMarkPaid = async () => {
    if (!targetPayrollForPaid) return;
    try {
      const res = await api.post(`/payroll/records/${targetPayrollForPaid.payrollId}/mark-paid`, {
        paymentDate,
        paymentMethod,
        transactionId,
        remarks: paymentRemarks
      });
      toast.success(res.data?.message || 'Payroll marked as paid and payslip synced to dossier!');
      setShowMarkPaidModal(false);
      setTargetPayrollForPaid(null);
      loadPayrollData();
    } catch (err) {
      console.error('Mark paid error:', err);
      toast.error(err.response?.data?.message || 'Failed to record disbursement.');
    }
  };

  // Reopen to Draft
  const handleReopen = async (payrollId) => {
    if (!payrollId) return;
    try {
      const res = await api.post(`/payroll/records/${payrollId}/reopen`, {
        remarks: 'Reopened by HR admin for adjustments'
      });
      toast.success(res.data?.message || 'Payroll reopened to draft.');
      loadPayrollData();
    } catch (err) {
      console.error('Reopen error:', err);
      toast.error(err.response?.data?.message || 'Failed to reopen payroll.');
    }
  };

  // Delete Draft
  const handleDeleteDraft = async (payrollId) => {
    if (!payrollId || !window.confirm('Delete this draft payroll record?')) return;
    try {
      await api.delete(`/payroll/records/${payrollId}`);
      toast.success('Payroll draft removed.');
      loadPayrollData();
    } catch (err) {
      console.error('Delete draft error:', err);
      toast.error('Failed to delete draft.');
    }
  };

  // Reset Employee Row / Saved Non-Paid Record
  const handleResetEmployee = async (emp) => {
    if (!emp) return;
    const empId = emp.employeeId || emp._id || emp.userId;

    if (emp.status === 'paid') {
      toast.error('Paid payroll cannot be reset directly. Reopen to draft first.');
      return;
    }

    if (emp.payrollId) {
      if (!window.confirm(`Reset ${emp.fullName || 'this employee'}'s payroll for ${monthName(month)} ${year}? This will remove the saved ${emp.status} record and recalculate from attendance.`)) {
        return;
      }
      try {
        await api.delete(`/payroll/records/${emp.payrollId}`);
        toast.success('Employee payroll reset.');
        loadPayrollData();
      } catch (err) {
        console.error('Reset employee payroll error:', err);
        toast.error(err.response?.data?.message || 'Failed to reset employee payroll.');
      }
      return;
    }

    const bPct = emp.flags?.basicPercent !== undefined
      ? (emp.flags.basicPercent > 1 ? emp.flags.basicPercent : emp.flags.basicPercent * 100)
      : (config?.basicPercent ? (config.basicPercent > 1 ? config.basicPercent : config.basicPercent * 100) : 50);
    const hPct = emp.flags?.hraPercent !== undefined
      ? (emp.flags.hraPercent > 1 ? emp.flags.hraPercent : emp.flags.hraPercent * 100)
      : (config?.hraPercent ? (config.hraPercent > 1 ? config.hraPercent : config.hraPercent * 100) : 50);

    setRows(prev => ({
      ...prev,
      [empId]: {
        paidDays: emp.paidDays !== undefined ? emp.paidDays : monthWorkingDays,
        workingDays: emp.workingDays !== undefined ? emp.workingDays : monthWorkingDays,
        paidLeaves: emp.paidLeaves || 0,
        unpaidLeaves: emp.unpaidLeaves || 0,
        hoursWorked: emp.hoursWorked || 160,
        lop: emp.lop || 0,
        joiningBonus: emp.variablePay?.joiningBonus ?? emp.bonus ?? '',
        loyaltyBonus: '',
        incentive: emp.variablePay?.incentive ?? emp.incentives ?? '',
        specialBonus: emp.variablePay?.specialBonus ?? '',
        otherAllowanceArrear: emp.variablePay?.otherAllowanceArrear ?? '',
        tds: emp.deductions?.tds !== undefined ? emp.deductions.tds : '',
        otherEarnings: emp.earnings?.customEarnings || [],
        otherDeductions: emp.deductions?.customDeductions || [],
        excludedClaimIds: [],
        variableTransactions: emp.variableTransactions || [],
        pfEnabled: emp.flags?.pfEnabled !== undefined ? emp.flags.pfEnabled : true,
        tdsEnabled: emp.flags?.tdsEnabled !== undefined ? emp.flags.tdsEnabled : true,
        esiEnabled: emp.flags?.esiEnabled !== undefined ? emp.flags.esiEnabled : true,
        ptEnabled: emp.flags?.ptEnabled !== undefined ? emp.flags.ptEnabled : true,
        lwfEnabled: emp.flags?.lwfEnabled !== undefined ? emp.flags.lwfEnabled : true,
        gratuityEnabled: emp.flags?.gratuityEnabled !== undefined ? emp.flags.gratuityEnabled : true,
        includePfInCTC: true,
        includeGratuityInCTC: true,
        basicPercent: bPct,
        hraPercent: hPct,
        overtime: { weekdayHours: 0, weekendHours: 0, holidayHours: 0, customAmount: 0 }
      }
    }));
    toast.success('Employee adjustments reset to defaults.');
  };

  const hasProcessedPayrolls = employees.some(e => e.status && e.status !== 'unprocessed');

  return (
    <div className="max-w-[98%] mx-auto p-4 sm:p-6 font-sans text-slate-900 transition-colors">
      
      {/* ================= 1. TOP HEADER & CYCLE CONTROLS ================= */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span>Process Payroll</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Native Engine
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review proration, variable pay, and deduction inputs before generating payroll.
          </p>
        </div>

        {/* Action Buttons & Pickers */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleDownloadInputsOnly}
            className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs border border-slate-700 cursor-pointer"
            title="Download working days, LOP, overtime, and variable inputs as Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Inputs Only</span>
          </button>

          {hasProcessedPayrolls && (
            <button
              type="button"
              onClick={handleResetMonth}
              disabled={saving}
              className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Month's Payroll</span>
            </button>
          )}

          {/* Month Selector */}
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-slate-300 bg-white text-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-semibold shrink-0 cursor-pointer focus:outline-none focus:border-blue-500"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((val) => (
              <option key={val} value={val}>{monthName(val)}</option>
            ))}
          </select>

          {/* Year Input */}
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-20 border border-slate-300 bg-white text-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-semibold shrink-0 text-center focus:outline-none focus:border-blue-500"
          />

          {/* Month Working Days Pill */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-3 py-1.5 shrink-0 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold">Days:</span>
            <input
              type="number"
              value={monthWorkingDays}
              min="1"
              onChange={(e) => setMonthWorkingDays(Number(e.target.value) || 1)}
              className="w-10 border-0 bg-transparent p-0 text-xs font-bold text-slate-900 focus:ring-0 text-center"
              title="Standard Working Days in this month"
            />
          </div>
        </div>
      </div>

      {/* ================= 2. 5-KPI SUMMARY CARDS ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <SummaryCard
          label="Total / Selected"
          value={`${employees.length} / ${selectedEmployees.length}`}
          subtext="Employees in roll"
        />
        <SummaryCard
          label="Gross Payroll"
          value={fmtMoney(totalGrossPreview)}
          subtext="Sum of earnings & claims"
        />
        <SummaryCard
          label="Net Payroll"
          value={fmtMoney(totalNetPreview)}
          highlight
          subtext="Total net disbursement"
        />
        <SummaryCard
          label="Needs Attention"
          value={needsAttentionCount}
          alert={needsAttentionCount > 0}
          subtext={needsAttentionCount > 0 ? "Click to filter flagged" : "All checks compliant"}
          clickable={needsAttentionCount > 0}
          onClick={() => needsAttentionCount > 0 && setFilterNeedsAttention(v => !v)}
        />
        <SummaryCard
          label="Working Days"
          value={monthWorkingDays}
          subtext={`${monthName(month)} ${year}`}
        />
      </div>

      {/* ================= 3. FILTER / SORT & STATUS BAR ================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs mb-4 flex flex-wrap items-center gap-2.5">
        
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {['all', 'unprocessed', 'draft', 'approved', 'paid'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 text-xs font-bold rounded-md capitalize transition-all cursor-pointer ${
                filterStatus === st
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        {/* Search Input */}
        <div className="relative min-w-[200px] flex-1 sm:flex-none">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search name or code…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:border-blue-500 placeholder-slate-400"
          />
        </div>

        {/* Department Filter */}
        {deptOptions.length > 0 && (
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Departments</option>
            {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}

        {/* Comp Type Filter */}
        {compTypeOptions.length > 0 && (
          <select
            value={filterCompType}
            onChange={(e) => setFilterCompType(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Types</option>
            {compTypeOptions.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        )}

        {/* Needs Attention Toggle Pill */}
        <button
          type="button"
          onClick={() => setFilterNeedsAttention(v => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
            filterNeedsAttention
              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
              : 'bg-white text-slate-700 border-slate-300 hover:border-rose-400 hover:text-rose-600'
          }`}
        >
          <span>🔴 Needs Attention</span>
          {needsAttentionCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              filterNeedsAttention ? 'bg-white text-rose-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {needsAttentionCount}
            </span>
          )}
        </button>

        {/* Sort Controls */}
        <div className="flex items-center gap-1 ml-auto">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
          >
            <option value="name">Sort: Name</option>
            <option value="net">Sort: Net Pay</option>
            <option value="type">Sort: Pay Type</option>
            <option value="status">Sort: Status</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDir(v => v === 'asc' ? 'desc' : 'asc')}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-700 hover:bg-slate-50 cursor-pointer font-black"
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {/* Clear Filters */}
        {(searchQuery || filterDept || filterCompType || filterStatus !== 'all' || filterNeedsAttention) && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilterDept('');
              setFilterCompType('');
              setFilterStatus('all');
              setFilterNeedsAttention(false);
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ================= 4. ENTERPRISE PAYROLL SPREADSHEET TABLE ================= */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto overflow-y-auto max-h-[72vh]">
          <table className="min-w-full divide-y divide-slate-200 text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <th className="px-2 py-2 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.length === filteredSortedEmployees.length && filteredSortedEmployees.length > 0}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const next = { ...selected };
                      filteredSortedEmployees.forEach(emp => {
                        const isProcessed = emp.status && emp.status !== 'draft' && emp.status !== 'unprocessed';
                        const empId = emp.employeeId || emp._id || emp.userId;
                        if (!isProcessed) next[empId] = checked;
                      });
                      setSelected(next);
                    }}
                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-2.5 py-2 min-w-[200px]">Employee</th>
                <th className="px-2 py-2 min-w-[110px] text-center">Paid / Working</th>
                <th className="px-2 py-2 text-center">Proration</th>
                <th className="px-2 py-2 text-right">Basic</th>
                <th className="px-2 py-2 text-right">HRA</th>
                <th className="px-2 py-2 text-right">Allowances</th>
                <th className="px-2 py-2 text-right">Gratuity</th>
                <th className="px-2 py-2 text-right">LWF</th>
                <th className="px-2 py-2 text-right">Joining</th>
                <th className="px-2 py-2 text-right">Loyalty</th>
                <th className="px-2 py-2 text-right">Incentive</th>
                <th className="px-2 py-2 text-right">Special</th>
                <th className="px-2 py-2 text-right">Other Ded.</th>
                <th className="px-2 py-2 text-right">TDS (IT)</th>
                <th className="px-2.5 py-2 text-right font-black">Net Preview</th>
                <th className="px-2 py-2 text-center">Status</th>
                <th className="px-2 py-2 text-center sticky right-0 bg-slate-50 shadow-xs w-12">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td colSpan={18} className="px-3 py-3 text-center text-slate-400">
                      Loading employee payroll inputs...
                    </td>
                  </tr>
                ))
              ) : filteredSortedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={18} className="px-4 py-8 text-center text-slate-400">
                    <Users className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
                    <div className="font-bold text-xs text-slate-600">No matching employees found for this period.</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Check filters or adjust month/year cycle.</p>
                  </td>
                </tr>
              ) : (
                filteredSortedEmployees.map((emp, rowIndex) => {
                  const empId = emp.employeeId || emp._id || emp.userId;
                  const row = rows[empId] || {};
                  const isHourly = emp.payType === 'hourly' || emp.compensationType === 'hourly';
                  const snap = getEmployeeSnapshot(emp);
                  const isPaidTooHigh = !isHourly && Number(row.paidDays) > Number(row.workingDays || monthWorkingDays);
                  const isExistingDisabled = emp.status && emp.status !== 'draft' && emp.status !== 'unprocessed';

                  const rowBg = snap.isClamped
                    ? 'bg-rose-50/50 border-l-4 border-l-rose-500'
                    : isPaidTooHigh
                      ? 'bg-amber-50/50 border-l-4 border-l-amber-500'
                      : isExistingDisabled
                        ? 'bg-slate-50/70 text-slate-500'
                        : selected[empId]
                          ? 'bg-blue-50/20 hover:bg-blue-50/40'
                          : 'hover:bg-slate-50/80';

                  return (
                    <tr key={empId} className={`${rowBg} transition-colors align-middle`}>
                      
                      {/* 1. Checkbox */}
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(selected[empId])}
                          disabled={Boolean(isExistingDisabled)}
                          onChange={(e) => setSelected(prev => ({ ...prev, [empId]: e.target.checked }))}
                          className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-40"
                        />
                      </td>

                      {/* 2. Employee Info & Badges */}
                      <td className="px-2.5 py-1.5 min-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 leading-tight">{emp.fullName}</span>
                          {emp.employeeCode && (
                            <span className="text-[10px] text-slate-400 font-mono">({emp.employeeCode})</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[220px]">
                          {emp.designation || 'Software Engineer'}
                        </div>
                        
                        {/* Compensation & CTC badge */}
                        <div className="mt-0.5 flex flex-wrap items-center gap-1">
                          <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 py-0">
                            CTC {fmtMoney(emp.ctcMonthly)}/mo
                          </span>
                          <span className="text-[9px] text-slate-400 capitalize">
                            [{emp.compensationType?.replace(/_/g, ' ') || 'Monthly'}]
                          </span>
                        </div>

                        {/* Edge Case Warning Banners */}
                        {snap.isClamped && (
                          <div className="mt-0.5 text-[9px] font-bold text-rose-700 bg-rose-100 border border-rose-300 rounded px-1 py-0 inline-flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Net Clamped to ₹0</span>
                          </div>
                        )}

                        {/* Statutory Settings Badges & Adjust button */}
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          <div className="flex flex-wrap gap-0.5 font-mono text-[8px]">
                            <span className={`px-1 py-0 rounded font-bold ${row.tdsEnabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-400 border border-rose-100 line-through'}`}>TDS</span>
                            <span className={`px-1 py-0 rounded font-bold ${row.pfEnabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-400 border border-rose-100 line-through'}`}>PF</span>
                            <span className={`px-1 py-0 rounded font-bold ${row.esiEnabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-400 border border-rose-100 line-through'}`}>ESI</span>
                            <span className={`px-1 py-0 rounded font-bold ${row.ptEnabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-400 border border-rose-100 line-through'}`}>PT</span>
                            <span className={`px-1 py-0 rounded font-bold ${row.lwfEnabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-400 border border-rose-100 line-through'}`}>LWF</span>
                            <span className={`px-1 py-0 rounded font-bold ${row.gratuityEnabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-400 border border-rose-100 line-through'}`}>Gratuity</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenBreakdown(emp)}
                            className="text-[9px] font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-0.5 cursor-pointer ml-1"
                          >
                            <Calculator className="w-2.5 h-2.5" />
                            <span>Adjust</span>
                          </button>
                        </div>
                      </td>

                      {/* 3. Paid / Working / Hours Input */}
                      <td className="px-2 py-1.5 min-w-[110px] text-center">
                        {isHourly ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              disabled={isExistingDisabled}
                              value={row.hoursWorked ?? 160}
                              onChange={(e) => updateRow(empId, 'hoursWorked', Number(e.target.value) || 0)}
                              className="w-14 h-6 border border-slate-300 rounded px-1 text-xs text-right font-bold bg-white focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-slate-400 text-[10px] font-semibold">hrs</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                disabled={isExistingDisabled}
                                value={row.paidDays ?? monthWorkingDays}
                                onChange={(e) => updateRow(empId, 'paidDays', Number(e.target.value) || 0)}
                                className="w-10 h-6 border border-slate-300 rounded px-1 text-xs text-center font-bold bg-white focus:outline-none focus:border-blue-500"
                                title="Paid Days"
                              />
                              <span className="text-slate-400 font-bold text-xs">/</span>
                              <input
                                type="number"
                                min="1"
                                disabled={isExistingDisabled}
                                value={row.workingDays ?? monthWorkingDays}
                                onChange={(e) => updateRow(empId, 'workingDays', Number(e.target.value) || 1)}
                                className="w-10 h-6 border border-slate-300 rounded px-1 text-xs text-center font-bold bg-white focus:outline-none focus:border-blue-500"
                                title="Working Days"
                              />
                            </div>
                            {isPaidTooHigh && (
                              <span className="text-[9px] text-rose-600 font-bold mt-0.5">
                                Exceeds working!
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 4. Proration */}
                      <td className="px-2 py-1.5 text-center font-bold text-xs text-slate-700">
                        {isHourly ? 'N/A' : `${Math.round(snap.ratio * 100)}%`}
                      </td>

                      {/* 5. Basic Salary */}
                      <td className="px-2 py-1.5 text-right font-medium text-xs text-slate-800">
                        {fmtMoney(snap.basic)}
                      </td>

                      {/* 6. HRA */}
                      <td className="px-2 py-1.5 text-right font-medium text-xs text-slate-800">
                        {fmtMoney(snap.hra)}
                      </td>

                      {/* 7. Allowances */}
                      <td className="px-2 py-1.5 text-right font-medium text-xs text-slate-800">
                        {fmtMoney(snap.allowances)}
                      </td>

                      {/* 8. Gratuity */}
                      <td className="px-2 py-1.5 text-right text-xs text-slate-600">
                        {fmtMoney(emp.employerContributions?.gratuity || (snap.basic > 0 ? Math.round(snap.basic * (config?.gratuityRate || 0.0481)) : 0))}
                      </td>

                      {/* 9. LWF */}
                      <td className="px-2 py-1.5 text-right text-xs text-slate-600">
                        {fmtMoney(snap.lwf)}
                      </td>

                      {/* 10. Joining Bonus (Editable) */}
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="number"
                          placeholder="₹"
                          disabled={isExistingDisabled}
                          value={row.joiningBonus || ''}
                          onChange={(e) => updateRow(empId, 'joiningBonus', e.target.value)}
                          className="w-16 h-6 border border-slate-300 rounded px-1 text-xs text-right font-medium bg-white focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* 11. Loyalty Bonus (Editable) */}
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="number"
                          placeholder="₹"
                          disabled={isExistingDisabled}
                          value={row.loyaltyBonus || ''}
                          onChange={(e) => updateRow(empId, 'loyaltyBonus', e.target.value)}
                          className="w-16 h-6 border border-slate-300 rounded px-1 text-xs text-right font-medium bg-white focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* 12. Incentive (Editable) */}
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="number"
                          placeholder="₹"
                          disabled={isExistingDisabled}
                          value={row.incentive || ''}
                          onChange={(e) => updateRow(empId, 'incentive', e.target.value)}
                          className="w-16 h-6 border border-slate-300 rounded px-1 text-xs text-right font-medium bg-white focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* 13. Special Bonus (Editable) */}
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="number"
                          placeholder="₹"
                          disabled={isExistingDisabled}
                          value={row.specialBonus || ''}
                          onChange={(e) => updateRow(empId, 'specialBonus', e.target.value)}
                          className="w-16 h-6 border border-slate-300 rounded px-1 text-xs text-right font-medium bg-white focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* 14. Other Deductions */}
                      <td className="px-2 py-1.5 text-right font-medium text-xs text-rose-600">
                        -{fmtMoney(snap.totalDeductions - snap.pf - snap.esi - snap.pt - snap.lwf - snap.tds)}
                      </td>

                      {/* 15. TDS Input (Editable) */}
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="number"
                          placeholder={String(snap.tds)}
                          disabled={isExistingDisabled}
                          value={row.tds !== undefined ? row.tds : ''}
                          onChange={(e) => updateRow(empId, 'tds', e.target.value)}
                          className="w-16 h-6 border border-slate-300 rounded px-1 text-xs text-right font-medium text-rose-600 bg-white focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* 16. Net Preview */}
                      <td className="px-2.5 py-1.5 text-right font-black text-xs text-slate-900 whitespace-nowrap">
                        {fmtMoney(snap.netSalary)}
                      </td>

                      {/* 17. Status Pill */}
                      <td className="px-2 py-1.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          emp.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : emp.status === 'approved'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : emp.status === 'draft'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {emp.status || 'unprocessed'}
                        </span>
                      </td>

                      {/* 18. Actions Column with 3-Dot Menu */}
                      <td className="px-2 py-1.5 text-center sticky right-0 bg-white shadow-xs whitespace-nowrap">
                        <div className="relative inline-block text-left" data-actions-menu="true">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionMenuId(prev => prev === empId ? null : empId);
                            }}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              activeActionMenuId === empId
                                ? 'bg-slate-200 text-slate-900'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                            title="Employee Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeActionMenuId === empId && (
                            <div
                              className={`absolute right-0 ${
                                rowIndex >= filteredSortedEmployees.length - 2 && filteredSortedEmployees.length > 2
                                  ? 'bottom-full mb-1'
                                  : 'top-full mt-1'
                              } w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-50 text-left text-xs divide-y divide-slate-100`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="py-1">
                                {/* View Official Payslip */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    handleViewPayslip(emp);
                                  }}
                                  disabled={loadingPayslip}
                                  className="w-full px-3 py-1.5 flex items-center gap-2.5 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left font-medium cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>View Payslip</span>
                                </button>

                                {/* Breakdown & Adjust */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    handleOpenBreakdown(emp);
                                  }}
                                  className="w-full px-3 py-1.5 flex items-center gap-2.5 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left font-medium cursor-pointer"
                                >
                                  <Calculator className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>Breakdown & Adjust</span>
                                </button>

                                {/* Full & Final (F&F) */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setFnfEmployee(emp);
                                  }}
                                  className="w-full px-3 py-1.5 flex items-center gap-2.5 text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left font-medium cursor-pointer"
                                >
                                  <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                  <span>Full & Final (F&F)</span>
                                </button>

                                {/* Reset */}
                                {emp.status !== 'paid' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      handleResetEmployee(emp);
                                    }}
                                    className="w-full px-3 py-1.5 flex items-center gap-2.5 text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors text-left font-medium cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Reset</span>
                                  </button>
                                )}
                              </div>

                              {/* State-specific actions */}
                              {(emp.status === 'approved' || emp.status === 'paid' || emp.status === 'draft') && (
                                <div className="py-1">
                                  {emp.status === 'approved' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        setTargetPayrollForPaid(emp);
                                        setShowMarkPaidModal(true);
                                      }}
                                      className="w-full px-3 py-1.5 flex items-center gap-2.5 text-emerald-700 hover:bg-emerald-50 transition-colors text-left font-semibold cursor-pointer"
                                    >
                                      <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span>Mark as Paid</span>
                                    </button>
                                  )}

                                  {(emp.status === 'paid' || emp.status === 'approved') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        handleReopen(emp.payrollId);
                                      }}
                                      className="w-full px-3 py-1.5 flex items-center gap-2.5 text-amber-700 hover:bg-amber-50 transition-colors text-left font-medium cursor-pointer"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      <span>Reopen to Draft</span>
                                    </button>
                                  )}

                                  {emp.status === 'draft' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        handleDeleteDraft(emp.payrollId);
                                      }}
                                      className="w-full px-3 py-1.5 flex items-center gap-2.5 text-rose-700 hover:bg-rose-50 transition-colors text-left font-medium cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                      <span>Delete Draft</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
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

      {/* ================= 5. STICKY BOTTOM ACTION BAR (FLANCE PARITY) ================= */}
      <div className="sticky bottom-2 z-20 mt-4 bg-white/95 backdrop-blur-sm border border-slate-300 rounded-xl shadow-lg px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-600">
          <span className="text-slate-900 font-bold">{selectedEmployees.length}</span> employee{selectedEmployees.length !== 1 ? 's' : ''} selected
          {selectedEmployees.length > 0 && (
            <span className="ml-2 text-slate-400">· Net Payout: <span className="font-extrabold text-emerald-700">{fmtMoney(totalNetPreview)}</span></span>
          )}
          {needsAttentionCount > 0 && (
            <span className="ml-2 text-rose-600 font-bold">· ⚠️ {needsAttentionCount} need attention</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Export Register */}
          <button
            type="button"
            onClick={handleExportRegister}
            className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Register</span>
          </button>

          {/* Bulk Approve */}
          {employees.some(e => e.status === 'draft') && (
            <button
              type="button"
              onClick={handleBulkApprove}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Bulk Approve Drafts</span>
            </button>
          )}

          {/* Save as Draft */}
          <button
            type="button"
            onClick={() => submitPayrollBatch(true)}
            disabled={saving || selectedEmployees.length === 0}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 transition-colors shadow-2xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save as Draft</span>
          </button>

          {/* Process Payroll Button */}
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={saving || selectedEmployees.length === 0}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 disabled:opacity-60 transition-colors shadow-2xs cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Process Payroll</span>
          </button>
        </div>
      </div>

      {/* ================= 6. PROCESS PAYROLL CONFIRMATION MODAL ================= */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Check className="text-emerald-400 w-5 h-5" />
                <span>Confirm Payroll Processing</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <p className="text-sm font-medium">
                You are about to process official payroll for <strong>{monthName(month)} {year}</strong>:
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Selected Employees</div>
                  <div className="text-xl font-black text-slate-900">{selectedEmployees.length}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total Net Payout</div>
                  <div className="text-xl font-black text-emerald-700">{fmtMoney(totalNetPreview)}</div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                This will calculate and save final payroll figures. Employees with approved reimbursements will have claims marked as queued for settlement.
              </p>
            </div>

            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => submitPayrollBatch(false)}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                {saving ? 'Processing...' : 'Confirm & Process'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. FLANCE BREAKDOWN & ADJUST DRAWER (MAX-6XL MODAL) ================= */}
      {breakdownEmployee && (() => {
        const empId = breakdownEmployee.employeeId || breakdownEmployee._id || breakdownEmployee.userId;
        const snap = getEmployeeSnapshot(breakdownEmployee);
        const row = rows[empId] || {};

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full border border-slate-200 overflow-hidden flex flex-col my-8">
              
              {/* Drawer Header */}
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg">
                    {breakdownEmployee.fullName?.charAt(0) || 'E'}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{breakdownEmployee.fullName}</h2>
                    <p className="text-xs text-slate-400">
                      {breakdownEmployee.employeeCode} · {breakdownEmployee.designation || 'Engineer'} · CTC {fmtMoney(breakdownEmployee.ctcMonthly)}/mo
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBreakdownEmployee(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                
                {/* Proration Summary Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-blue-900 text-xs">
                  <div>
                    <span className="font-bold">Paid / Working Days:</span> {row.paidDays !== undefined ? row.paidDays : breakdownEmployee.paidDays} / {row.workingDays || breakdownEmployee.workingDays || monthWorkingDays} days
                    <span className="mx-2 text-blue-300">|</span>
                    <span className="font-bold">Proration Ratio:</span> {Math.round(snap.ratio * 100)}%
                  </div>
                  <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto">
                    {Number(row.workingDays || breakdownEmployee.workingDays || monthWorkingDays) - Number(row.paidDays !== undefined ? row.paidDays : breakdownEmployee.paidDays) > 0 ? `${Number(row.workingDays || breakdownEmployee.workingDays || monthWorkingDays) - Number(row.paidDays !== undefined ? row.paidDays : breakdownEmployee.paidDays)} LOP Days` : 'Full Attendance'}
                  </div>
                </div>

                {/* Statutory Components & Overrides Box (100% Settings-Derived) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-700 text-xs flex items-center justify-between">
                    <span>Statutory Components & Ratio Overrides</span>
                    <span className="text-[11px] text-slate-400 font-normal">Derived from company payroll configuration</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    
                    {/* PF Toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                      <div>
                        <div className="font-bold text-slate-800">Provident Fund (PF)</div>
                        <div className="text-[10px] text-slate-500">
                          {config?.pfCalculationType === 'fixed'
                            ? `₹${config.pfAmountEmployee || 1800} fixed match`
                            : `${Math.round(((config?.pfRate ?? 0.12) > 1 ? config.pfRate : (config?.pfRate ?? 0.12) * 100))}% match (Cap: ₹${(config?.pfCap || 15000).toLocaleString('en-IN')})`}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={row.pfEnabled !== false}
                        onChange={(e) => updateRow(empId, 'pfEnabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </div>

                    {/* TDS Toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                      <div>
                        <div className="font-bold text-slate-800">Income Tax (TDS)</div>
                        <div className="text-[10px] text-slate-500">Monthly tax withholding</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={row.tdsEnabled !== false}
                        onChange={(e) => updateRow(empId, 'tdsEnabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </div>

                    {/* ESI Toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                      <div>
                        <div className="font-bold text-slate-800">ESI Scheme</div>
                        <div className="text-[10px] text-slate-500">
                          Threshold: ₹{(config?.esiBasicThreshold || 21000).toLocaleString('en-IN')} gross ({(((config?.esiEmployeeRate ?? 0.0075) > 1 ? config.esiEmployeeRate : (config?.esiEmployeeRate ?? 0.0075) * 100)).toFixed(2)}%)
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={row.esiEnabled !== false}
                        onChange={(e) => updateRow(empId, 'esiEnabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </div>

                    {/* PT Toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                      <div>
                        <div className="font-bold text-slate-800">Professional Tax (PT)</div>
                        <div className="text-[10px] text-slate-500">State PT schedule</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={row.ptEnabled !== false}
                        onChange={(e) => updateRow(empId, 'ptEnabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </div>

                    {/* LWF Toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                      <div>
                        <div className="font-bold text-slate-800">Labour Welfare Fund</div>
                        <div className="text-[10px] text-slate-500">
                          ₹{config?.lwfEmployee || 15} Emp / ₹{config?.lwfEmployer || 35} Empr
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={row.lwfEnabled !== false}
                        onChange={(e) => updateRow(empId, 'lwfEnabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </div>

                    {/* Gratuity Toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                      <div>
                        <div className="font-bold text-slate-800">Gratuity Provision</div>
                        <div className="text-[10px] text-slate-500">
                          {(((config?.gratuityRate ?? 0.0481) > 1 ? config.gratuityRate : (config?.gratuityRate ?? 0.0481) * 100)).toFixed(2)}% Basic match
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={row.gratuityEnabled !== false}
                        onChange={(e) => updateRow(empId, 'gratuityEnabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </div>

                    {/* Dynamic Salary Components Config from Settings */}
                    <div className="col-span-1 sm:col-span-2 lg:col-span-4 mt-2 pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <span>Salary Components Configuration</span>
                          <span className="text-[10px] font-normal text-slate-500 normal-case">(Derived from Settings · One component acts as CTC balance remainder)</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {activeEarningComponents.map((c) => {
                          const isRemainder = c.linkedTo === 'remainder';
                          const isCtcPercent = c.linkedTo === 'ctc_percent';
                          const isBasicPercent = c.linkedTo === 'basic_percent';

                          const defaultVal = c.linkValue || (c.id === 'basic' ? Math.round(((config?.basicPercent ?? 0.5) > 1 ? config.basicPercent : (config?.basicPercent ?? 0.5) * 100)) : (c.id === 'hra' ? Math.round(((config?.hraPercent ?? 0.5) > 1 ? config.hraPercent : (config?.hraPercent ?? 0.5) * 100)) : 0));
                          
                          const currentVal = row[`${c.id}Percent`] !== undefined
                            ? row[`${c.id}Percent`]
                            : (c.id === 'basic' && row.basicPercent !== undefined
                                ? row.basicPercent
                                : (c.id === 'hra' && row.hraPercent !== undefined
                                    ? row.hraPercent
                                    : defaultVal));

                          if (isRemainder) {
                            const compSnap = snap.componentsBreakdown?.[c.id] || {};
                            return (
                              <div key={c.id} className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/50 flex flex-col justify-between">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-blue-900 text-xs">{c.name}</span>
                                  <span className="text-[9px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.2 rounded">CTC Remainder</span>
                                </div>
                                <div className="text-[10px] text-slate-500">Auto-balanced remainder of CTC</div>
                                <div className="mt-1 flex justify-between items-center">
                                  <span className="text-[11px] font-bold text-slate-600">Calculated:</span>
                                  <span className="text-xs font-black text-blue-800">{fmtMoney(compSnap.master ?? snap.allowances)}</span>
                                </div>
                              </div>
                            );
                          }

                          if (isCtcPercent || isBasicPercent) {
                            return (
                              <div key={c.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-slate-800 text-xs">{c.name}</span>
                                  <span className="text-[10px] text-slate-500">
                                    Default: {defaultVal}% {isCtcPercent ? 'of CTC' : 'of Basic'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={currentVal}
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      updateRow(empId, `${c.id}Percent`, val);
                                      if (c.id === 'basic') updateRow(empId, 'basicPercent', val);
                                      if (c.id === 'hra') updateRow(empId, 'hraPercent', val);
                                    }}
                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-blue-500 text-right"
                                  />
                                  <span className="text-slate-500 font-bold text-xs">%</span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={c.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-slate-800 text-xs">{c.name}</span>
                                <span className="text-[10px] text-slate-500">Fixed Monthly</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 text-xs">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder={String(c.linkValue || 0)}
                                  value={row[c.id] !== undefined ? row[c.id] : (breakdownEmployee.earnings?.[c.id] || (c.linkValue || ''))}
                                  onChange={(e) => updateRow(empId, c.id, e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-blue-500 text-right"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>

                {/* 2-Column Earnings & Deductions Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column: Earnings Breakdown & Custom Run Allowances */}
                  <div className="space-y-4">
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-700 text-xs flex justify-between">
                        <span>Earnings Breakdown</span>
                        <span className="text-slate-500 font-normal">Attendance Prorated</span>
                      </div>
                      
                      {Number(breakdownEmployee.ctcMonthly || breakdownEmployee.monthlyCTC) <= 0 && (
                        <div className="m-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Employee monthly CTC is ₹0 in database. Update employee salary in Dossier or Revise Salary to populate component breakdown.</span>
                        </div>
                      )}

                      <div className="divide-y divide-slate-100 text-xs">
                        {activeEarningComponents.map((c) => {
                          const compSnap = snap.componentsBreakdown?.[c.id] || {};
                          const masterVal = compSnap.master !== undefined ? compSnap.master : (breakdownEmployee.masterEarnings?.[c.id] ?? (breakdownEmployee.earnings?.[c.id] ?? 0));
                          const paidVal = compSnap.paid !== undefined ? compSnap.paid : Math.round(masterVal * snap.ratio);
                          const isRemainder = c.linkedTo === 'remainder';
                          const isCtcPercent = c.linkedTo === 'ctc_percent';
                          const isBasicPercent = c.linkedTo === 'basic_percent';
                          
                          const badge = isRemainder
                            ? 'CTC Remainder'
                            : isCtcPercent
                              ? `${row[`${c.id}Percent`] || c.linkValue || 50}% CTC`
                              : isBasicPercent
                                ? `${row[`${c.id}Percent`] || c.linkValue || 50}% Basic`
                                : 'Fixed';

                          return (
                            <BreakdownRow
                              key={c.id}
                              label={c.name}
                              paid={paidVal}
                              master={masterVal}
                              badge={badge}
                            />
                          );
                        })}

                        {/* Any additional employee custom allowances from database */}
                        {Array.isArray(breakdownEmployee.salaryStructure?.customAllowances) && breakdownEmployee.salaryStructure.customAllowances.map((ca, idx) => (
                          <BreakdownRow
                            key={`ca-${idx}`}
                            label={ca.name}
                            paid={Math.round((Number(ca.amount) || 0) * snap.ratio)}
                            master={Number(ca.amount) || 0}
                            badge="Employee Custom"
                          />
                        ))}

                        {/* Variable bonuses for this run */}
                        {Number(row.joiningBonus) > 0 && <BreakdownRow label="Joining Bonus" paid={row.joiningBonus} />}
                        {Number(row.loyaltyBonus) > 0 && <BreakdownRow label="Loyalty Bonus" paid={row.loyaltyBonus} />}
                        {Number(row.incentive) > 0 && <BreakdownRow label="Incentive" paid={row.incentive} />}
                        {Number(row.specialBonus) > 0 && <BreakdownRow label="Special Bonus" paid={row.specialBonus} />}
                      </div>
                    </div>

                    {/* Custom Run Allowances */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-slate-700 text-xs flex items-center justify-between">
                        <span>Custom Run Allowances</span>
                        <button
                          type="button"
                          onClick={() => setLocalEarnings([...localEarnings, { name: '', amount: 0 }])}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Earning
                        </button>
                      </div>
                      <div className="p-3 space-y-2">
                        {localEarnings.length === 0 ? (
                          <div className="text-xs text-slate-400 text-center py-2">No custom earnings defined for this run.</div>
                        ) : (
                          localEarnings.map((item, idx) => (
                            <div key={`earn-${idx}`} className="flex gap-2 items-center">
                              <input
                                type="text"
                                placeholder="Allowance Name"
                                value={item.name}
                                onChange={(e) => {
                                  const updated = [...localEarnings];
                                  updated[idx].name = e.target.value;
                                  setLocalEarnings(updated);
                                }}
                                className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                              />
                              <input
                                type="number"
                                placeholder="₹"
                                value={item.amount}
                                onChange={(e) => {
                                  const updated = [...localEarnings];
                                  updated[idx].amount = Number(e.target.value) || 0;
                                  setLocalEarnings(updated);
                                }}
                                className="w-24 border border-slate-300 rounded px-2 py-1 text-xs text-right font-semibold focus:outline-none focus:border-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => setLocalEarnings(localEarnings.filter((_, i) => i !== idx))}
                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center font-bold text-slate-800 text-xs">
                      <span>Total Earnings (Gross Salary)</span>
                      <span className="text-sm font-black">{fmtMoney(snap.totalEarnings)}</span>
                    </div>
                  </div>

                  {/* Right Column: Deductions Breakdown & Custom Deductions */}
                  <div className="space-y-4">
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-700 text-xs">
                        Statutory & Voluntary Deductions
                      </div>
                      <div className="divide-y divide-slate-100 text-xs">
                        {snap.pf > 0 && <DeductionRow label="Provident Fund (Employee PF)" amount={snap.pf} />}
                        {snap.esi > 0 && <DeductionRow label="ESI (Employee Contribution)" amount={snap.esi} />}
                        {snap.pt > 0 && <DeductionRow label="Professional Tax (PT)" amount={snap.pt} />}
                        {snap.lwf > 0 && <DeductionRow label="Labour Welfare Fund (LWF)" amount={snap.lwf} />}
                        {(snap.tds > 0 || Number(breakdownEmployee.ctcMonthly || breakdownEmployee.monthlyCTC) > 0) && (
                          <DeductionRow
                            label="Income Tax (TDS)"
                            amount={snap.tds}
                            isEditable
                            value={row.tds !== undefined ? row.tds : snap.tds}
                            onChange={(val) => updateRow(empId, 'tds', val === '' ? undefined : Number(val))}
                          />
                        )}
                        {snap.pf === 0 && snap.esi === 0 && snap.pt === 0 && snap.lwf === 0 && (!snap.tds || snap.tds === 0) && (
                          <div className="p-4 text-slate-400 text-center italic text-xs">
                            No statutory deductions applicable for this earnings tier.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Custom Run Deductions */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-slate-700 text-xs flex items-center justify-between">
                        <span>Custom Run Deductions</span>
                        <button
                          type="button"
                          onClick={() => setLocalDeductions([...localDeductions, { name: '', amount: 0 }])}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Deduction
                        </button>
                      </div>
                      <div className="p-3 space-y-2">
                        {localDeductions.length === 0 ? (
                          <div className="text-xs text-slate-400 text-center py-2">No custom deductions defined for this run.</div>
                        ) : (
                          localDeductions.map((item, idx) => (
                            <div key={`ded-${idx}`} className="flex gap-2 items-center">
                              <input
                                type="text"
                                placeholder="Deduction Name"
                                value={item.name}
                                onChange={(e) => {
                                  const updated = [...localDeductions];
                                  updated[idx].name = e.target.value;
                                  setLocalDeductions(updated);
                                }}
                                className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                              />
                              <input
                                type="number"
                                placeholder="₹"
                                value={item.amount}
                                onChange={(e) => {
                                  const updated = [...localDeductions];
                                  updated[idx].amount = Number(e.target.value) || 0;
                                  setLocalDeductions(updated);
                                }}
                                className="w-24 border border-slate-300 rounded px-2 py-1 text-xs text-right font-semibold text-rose-600 focus:outline-none focus:border-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => setLocalDeductions(localDeductions.filter((_, i) => i !== idx))}
                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Employer Statutory & Benefits */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-slate-700 text-xs">
                        Employer Statutory & Benefits
                      </div>
                      <div className="divide-y divide-slate-100 text-xs">
                        <DeductionRow label="PF Employer Cost" amount={snap.pfEmployer || 0} />
                        <DeductionRow label="Gratuity Accrual" amount={snap.gratuityEmployer || 0} />
                        <DeductionRow label="LWF Employer Cost" amount={snap.lwfEmployer || 0} />
                        {snap.insuranceEmployer > 0 && (
                          <DeductionRow label="Insurance (Flexi Benefit)" amount={snap.insuranceEmployer} />
                        )}
                        {snap.npsEmployer > 0 && (
                          <DeductionRow label="Employer NPS" amount={snap.npsEmployer} />
                        )}
                      </div>
                    </div>

                    {/* Annual CTC Components & Bonus */}
                    {Array.isArray(snap.annualBenefits) && snap.annualBenefits.length > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-slate-700 text-xs">
                          Annual CTC Components & Bonus
                        </div>
                        <div className="divide-y divide-slate-100 text-xs">
                          {snap.annualBenefits.map((ab, idx) => (
                            <div key={`ab-${idx}`} className="px-4 py-2.5 flex items-center justify-between gap-2">
                              <div>
                                <div className="font-semibold text-slate-800 capitalize">{ab.name}</div>
                                <div className="text-[10px] text-slate-500 capitalize">
                                  {String(ab.frequency || '').replace('_', '-')} ({fmtMoney(ab.perPayoutAmount)} × {ab.payoutCount}) · {ab.includeInCTC ? 'Added in Annual CTC' : 'Outside CTC'}
                                </div>
                              </div>
                              <span className="font-bold text-slate-900">{fmtMoney(ab.annualAmount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Net Take-Home Card */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex justify-between items-center font-bold text-emerald-900 shadow-2xs">
                      <div>
                        <div className="text-xs font-bold text-emerald-900">Net Take-Home Salary</div>
                        <div className="text-[10px] text-emerald-600 font-normal">Gross Earnings − Total Deductions</div>
                      </div>
                      <span className="text-2xl font-black text-emerald-700">{fmtMoney(snap.netSalary)}</span>
                    </div>
                  </div>

                </div>

                {/* Pre-approved Reimbursements Checklist */}
                {breakdownEmployee.claims && breakdownEmployee.claims.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-700 text-xs">
                      Pre-Approved Reimbursements Included in this Run
                    </div>
                    <div className="p-4 space-y-2.5">
                      {breakdownEmployee.claims.map((claim) => {
                        const isExcluded = localExcludedClaimIds.has(claim._id);
                        return (
                          <div key={claim._id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={!isExcluded}
                                onChange={(e) => {
                                  const next = new Set(localExcludedClaimIds);
                                  if (e.target.checked) next.delete(claim._id);
                                  else next.add(claim._id);
                                  setLocalExcludedClaimIds(next);
                                }}
                                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                              />
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                                {claim.category || 'Claim'}
                              </span>
                              <span className="text-xs text-slate-600 font-medium">{claim.title || claim.description || 'Approved expense'}</span>
                            </div>
                            <span className="font-bold text-xs text-slate-800">{fmtMoney(claim.amount)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* Drawer Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const emp = breakdownEmployee;
                    setBreakdownEmployee(null);
                    handleViewPayslip(emp);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Official Payslip (Flance Format)</span>
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBreakdownEmployee(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDrawerAdjustments}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                  >
                    Save Run Adjustments
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ================= 8. FULL & FINAL SETTLEMENT (F&F) MODAL (FLANCE PARITY) ================= */}
      {fnfEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 text-slate-900">
            <div className="bg-amber-600 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  📜 Full & Final (F&F) Settlement
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  {fnfEmployee.fullName} ({fnfEmployee.employeeCode})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFnfEmployee(null)}
                className="text-white/80 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProcessFnf} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Last Working Day</label>
                  <input
                    type="date"
                    required
                    value={fnfForm.lastWorkingDay}
                    onChange={(e) => setFnfForm(prev => ({ ...prev, lastWorkingDay: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Leave Encashment (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={fnfForm.leaveEncashmentDays}
                    onChange={(e) => setFnfForm(prev => ({ ...prev, leaveEncashmentDays: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 text-right font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Notice Served (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={fnfForm.noticePeriodServedDays}
                    onChange={(e) => setFnfForm(prev => ({ ...prev, noticePeriodServedDays: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 text-right font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Notice Required (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={fnfForm.noticePeriodRequiredDays}
                    onChange={(e) => setFnfForm(prev => ({ ...prev, noticePeriodRequiredDays: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 text-right font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Gratuity Provision Payout (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={fnfForm.gratuityPayout}
                    onChange={(e) => setFnfForm(prev => ({ ...prev, gratuityPayout: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 text-right font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Notice Shortfall Recovery (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={fnfForm.noticeShortfallDeduction}
                    onChange={(e) => setFnfForm(prev => ({ ...prev, noticeShortfallDeduction: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 text-right font-bold text-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Settlement Comments & Notes</label>
                <textarea
                  rows={2}
                  value={fnfForm.comments}
                  onChange={(e) => setFnfForm(prev => ({ ...prev, comments: e.target.value }))}
                  placeholder="Exit settlement remarks, handover signoffs..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setFnfEmployee(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingFnf}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  {processingFnf ? 'Calculating...' : 'Process Final Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 9. MARK AS PAID CONFIRMATION MODAL ================= */}
      {showMarkPaidModal && targetPayrollForPaid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Record Payroll Disbursement</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMarkPaidModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-700">
              <p>
                Disburse Net Salary of <strong className="text-slate-900 font-extrabold text-sm">{fmtMoney(targetPayrollForPaid.netSalary)}</strong> to{' '}
                <strong className="text-slate-900">{targetPayrollForPaid.fullName}</strong>.
              </p>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Disbursement Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full py-1.5 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full py-1.5 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="UPI">UPI Payment</option>
                  <option value="Cheque">Company Cheque</option>
                  <option value="Cash">Cash Handover</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Transaction Ref / UTR / Cheque No.</label>
                <input
                  type="text"
                  placeholder="e.g. UTR1982736410"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full py-1.5 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Disbursement Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional payment remarks..."
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                  className="w-full py-1.5 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-2.5 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowMarkPaidModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMarkPaid}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs cursor-pointer"
              >
                Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 10. OFFICIAL FLANCE SPREADSHEET PAYSLIP MODAL ================= */}
      {viewingPayslipData && (
        <PayslipModal
          viewingPayslip={viewingPayslipData}
          setViewingPayslip={setViewingPayslipData}
        />
      )}

    </div>
  );
};

export default PayrollProcessing;
