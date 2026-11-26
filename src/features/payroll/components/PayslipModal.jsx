import React, { useState, useEffect } from 'react';
import { FileText, X, Printer } from 'lucide-react';
import Button from '@/components/ui/Button';
import api from '@/lib/apiClient';
import { useAuth } from '@/features/auth/context/AuthContext';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Indian currency number formatter
const fmtVal = (val, showDash = true) => {
  if (val === null || val === undefined || val === '' || Number(val) === 0) {
    return showDash ? '-' : '';
  }
  const n = Number(val);
  if (isNaN(n)) return val;
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const fmtDate = (d) => {
  if (!d) return '-';
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime())
      ? String(d)
      : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  } catch {
    return String(d);
  }
};

export const PayslipModal = ({ viewingPayslip, setViewingPayslip, profile, getPayslipComponents }) => {
  const { user } = useAuth();
  const [companyConfig, setCompanyConfig] = useState(null);
  const [brandingInfo, setBrandingInfo] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api.get('/payroll/config')
      .then(res => {
        if (isMounted && res.data) {
          setCompanyConfig(res.data);
        }
      })
      .catch(() => {});

    api.get('/admin/company-settings/branding')
      .then(res => {
        if (isMounted && res.data) {
          setBrandingInfo(res.data);
        }
      })
      .catch(() => {});

    return () => { isMounted = false; };
  }, []);

  if (!viewingPayslip) return null;

  // Normalize slip object (can be { success: true, payslip: { ... } }, direct payslip, or legacy record)
  const slip = viewingPayslip.payslip || viewingPayslip;
  const comps = getPayslipComponents ? getPayslipComponents(viewingPayslip) : null;

  // Guard: if no comps and no slip data, exit
  if (!comps && !slip.netSalary && !slip.earningsLineItems && !slip.breakdown && !slip.earnings) {
    return null;
  }

  // 1. Employee Details from Profile / User / Synced Payslip
  const emp = slip.employee || profile || {};
  const employeeName = emp.fullName
    || emp.name
    || emp.personal?.fullName
    || [emp.firstName, emp.lastName].filter(Boolean).join(' ')
    || [emp.user?.firstName, emp.user?.lastName].filter(Boolean).join(' ')
    || slip.employeeName
    || 'Employee';

  const employeeCode = slip.employeeCode
    || emp.employeeCode
    || emp.employeeId
    || emp.employment?.employeeCode
    || emp.user?.employeeCode
    || (emp._id ? 'EMP-' + String(emp._id).slice(-4).toUpperCase() : 'EMP-001');

  const designation = (typeof emp.designation === 'string' ? emp.designation : emp.designation?.name)
    || emp.employment?.designation
    || emp.user?.designation
    || slip.designation
    || 'Software Developer';

  const department = (typeof emp.department === 'string' ? emp.department : emp.department?.name)
    || emp.employment?.department
    || emp.user?.department
    || slip.department
    || '';

  const costCentre = emp.costCentre
    || emp.employment?.costCentre
    || emp.user?.costCentre
    || slip.costCentre
    || 'TaaS';

  const joiningDate = emp.joiningDate
    || emp.employment?.joiningDate
    || emp.user?.joiningDate
    || slip.joiningDate;

  const uanNumber = emp.uanNumber
    || emp.compensation?.uanNumber
    || emp.identity?.uanNumber
    || slip.uanNumber
    || 'NA';

  const panNumber = emp.panNumber
    || emp.identity?.panNumber
    || slip.panNumber
    || '';

  const location = emp.location
    || emp.employment?.workLocation
    || emp.user?.workLocation
    || slip.location
    || 'Office';

  const bankAccount = emp.bankDetails?.accountNumber
    || emp.compensation?.bankDetails?.accountNumber
    || emp.bankAccount
    || slip.bankAccount
    || '';

  const pfNumber = emp.pfNumber || emp.compensation?.pfNumber || slip.pfNumber || 'NA';
  const esiNumber = emp.esiNumber || emp.compensation?.esiNumber || slip.esiNumber || 'NA';
  const gender = emp.gender || emp.personal?.gender || slip.gender || 'Male';

  // 2. Settings & Feature Flags
  const comp = emp.compensation || profile?.compensation || {};
  const rawBreakup = comp.salaryBreakup instanceof Map
    ? Object.fromEntries(comp.salaryBreakup)
    : (comp.salaryBreakup || {});

  const isPfEnabled = slip.isPfEnabled !== undefined
    ? slip.isPfEnabled
    : (comp.pfEnabled !== undefined ? comp.pfEnabled : (rawBreakup.pfEnabled !== false && pfNumber && pfNumber !== 'NA'));
  const isEsiEnabled = slip.isEsiEnabled !== undefined
    ? slip.isEsiEnabled
    : (comp.esiEnabled !== undefined ? comp.esiEnabled : (rawBreakup.esiEnabled !== false && esiNumber && esiNumber !== 'NA'));
  const isPtEnabled = slip.isPtEnabled !== undefined
    ? slip.isPtEnabled
    : (comp.ptEnabled !== undefined ? comp.ptEnabled : (rawBreakup.ptEnabled !== false));
  const isTdsEnabled = slip.isTdsEnabled !== undefined
    ? slip.isTdsEnabled
    : (comp.tdsEnabled !== undefined ? comp.tdsEnabled : (rawBreakup.tdsEnabled !== false));

  const taxRegime = String(slip.taxRegime || emp.taxRegime || comp.taxRegime || rawBreakup.taxRegime || 'new').toUpperCase();

  const workingDays = Number(slip.workingDays !== undefined ? slip.workingDays : 31).toFixed(2);
  let paidDaysNum = slip.paidDays !== undefined ? Number(slip.paidDays) : 31;
  if (comps?.scale && comps.scale < 0.95 && (slip.paidDays === undefined || slip.paidDays === 31)) {
    paidDaysNum = Math.round(comps.scale * Number(workingDays));
  }
  const paidDays = paidDaysNum.toFixed(2);

  // Pay Period String
  let payPeriod = '';
  if (slip.period) {
    if (typeof slip.period === 'string') {
      payPeriod = slip.period;
    } else if (slip.period.label) {
      payPeriod = slip.period.label;
    } else if (slip.period.month && slip.period.year) {
      payPeriod = `${MONTH_NAMES[slip.period.month - 1]} ${slip.period.year}`;
    }
  } else if (slip.month && slip.year) {
    payPeriod = `${MONTH_NAMES[slip.month - 1]} ${slip.year}`;
  } else {
    payPeriod = 'JULY 2026';
  }
  payPeriod = payPeriod.toUpperCase();

  // 3. Company details & Logo
  const compObj = slip.company || {};
  const companyName = compObj.companyName
    || compObj.name
    || brandingInfo?.name
    || companyConfig?.company?.name
    || user?.company?.name
    || profile?.company?.name
    || slip.companyName
    || 'Company';

  const rawAddress = compObj.address
    || brandingInfo?.address
    || companyConfig?.company?.address
    || user?.company?.address
    || profile?.company?.address
    || slip.companyAddress
    || '';

  const companyAddress = typeof rawAddress === 'string'
    ? rawAddress
    : (rawAddress?.line1
        ? [rawAddress.line1, rawAddress.city, rawAddress.state, rawAddress.zip].filter(Boolean).join(', ')
        : '');

  const companyLogo = compObj.logoUrl
    || compObj.logo
    || brandingInfo?.companyLogoUrl
    || companyConfig?.company?.logo
    || user?.company?.settings?.logo
    || user?.company?.logo
    || profile?.company?.logoUrl
    || slip.companyLogo
    || '';

  // 4. Resolve Dynamic Earnings List
  let earningsList = [];

  if (Array.isArray(slip.earningsLineItems) && slip.earningsLineItems.length > 0) {
    earningsList = slip.earningsLineItems.map(item => ({
      id: item.id || item.name,
      name: item.name,
      rate: Number(item.rate || item.amount) || 0,
      monthly: Number(item.monthly || item.amount) || 0,
      arrear: item.arrear || item.details || '-',
      total: Number(item.total || item.amount) || 0,
      isHeader: !!item.isHeader,
      rightLabel: item.rightLabel || ''
    }));
  } else if (slip.earnings && typeof slip.earnings === 'object' && !comps) {
    const e = slip.earnings;
    if (e.basic > 0) earningsList.push({ id: 'basic', name: 'Basic Salary', rate: e.basic, monthly: e.basic, arrear: '-', total: e.basic });
    if (e.hra > 0) earningsList.push({ id: 'hra', name: 'House Rent Allowance (HRA)', rate: e.hra, monthly: e.hra, arrear: '-', total: e.hra });
    if (e.allowances > 0) earningsList.push({ id: 'allowances', name: 'Special / Flexi Allowance', rate: e.allowances, monthly: e.allowances, arrear: '-', total: e.allowances });
    if (e.overtime > 0) earningsList.push({ id: 'overtime', name: 'Overtime Pay', rate: e.overtime, monthly: e.overtime, arrear: '-', total: e.overtime });
    if (e.bonus > 0) earningsList.push({ id: 'bonus', name: 'Performance Bonus', rate: e.bonus, monthly: e.bonus, arrear: '-', total: e.bonus });
    if (e.incentives > 0) earningsList.push({ id: 'incentives', name: 'Incentives / Commission', rate: e.incentives, monthly: e.incentives, arrear: '-', total: e.incentives });
    if (e.reimbursements > 0) earningsList.push({ id: 'reimbursements', name: 'Tax-Free Reimbursements', rate: e.reimbursements, monthly: e.reimbursements, arrear: '-', total: e.reimbursements });
    if (Array.isArray(e.customEarnings)) {
      e.customEarnings.forEach(ce => {
        if (ce.amount > 0) earningsList.push({ id: ce.name, name: ce.name, rate: ce.amount, monthly: ce.amount, arrear: '-', total: ce.amount });
      });
    }
  } else if (slip.breakdown && Object.keys(slip.breakdown).length > 0) {
    const bd = slip.breakdown;
    if (bd.basic > 0) earningsList.push({ id: 'basic', name: 'Basic Salary', rate: bd.basic, monthly: bd.basic, arrear: '-', total: bd.basic });
    if (bd.hra > 0) earningsList.push({ id: 'hra', name: 'House Rent Allowance (HRA)', rate: bd.hra, monthly: bd.hra, arrear: '-', total: bd.hra });
    if (bd.flexiAmount > 0) earningsList.push({ id: 'flexi', name: 'Flexi Allowance', rate: bd.flexiAmount, monthly: bd.flexiAmount, arrear: '-', total: bd.flexiAmount });
    if (bd.specialAllowance > 0) earningsList.push({ id: 'special', name: 'Special Allowance', rate: bd.specialAllowance, monthly: bd.specialAllowance, arrear: '-', total: bd.specialAllowance });
    if (bd.broadband > 0) earningsList.push({ id: 'broadband', name: 'Broadband', rate: bd.broadband, monthly: bd.broadband, arrear: '-', total: bd.broadband });
  } else {
    // Fallback to official company components from settings
    const officialComponents = (companyConfig?.salaryComponents && companyConfig.salaryComponents.length > 0)
      ? companyConfig.salaryComponents
      : [
          { id: 'basic', name: 'Basic Salary', type: 'earning' },
          { id: 'hra', name: 'House Rent Allowance (HRA)', type: 'earning' },
          { id: 'flexi', name: 'Flexi Allowance', type: 'earning' },
        ];

    officialComponents
      .filter(c => c.type === 'earning' || !c.type)
      .forEach(c => {
        let amount = 0;
        if (c.id === 'basic') {
          amount = comps?.basic || Number(rawBreakup.basic) || Number(rawBreakup.basicMaster) || 0;
        } else if (c.id === 'hra') {
          amount = comps?.hra || Number(rawBreakup.hra) || Number(rawBreakup.hraMaster) || 0;
        } else if (c.id === 'flexi' || c.id === 'special') {
          amount = comps?.flexi || Number(rawBreakup.flexi) || (Number(rawBreakup.specialAllowance) > 0 ? Number(rawBreakup.specialAllowance) : 0);
        } else {
          const val = rawBreakup[c.id] !== undefined
            ? rawBreakup[c.id]
            : (rawBreakup[c.name] !== undefined ? rawBreakup[c.name] : (rawBreakup[c.id + 'Allowance'] !== undefined ? rawBreakup[c.id + 'Allowance'] : 0));
          amount = Number(val) || 0;
          if (comps?.scale && comps.scale < 0.95 && amount > 0) {
            amount = Math.round(amount * comps.scale * 100) / 100;
          }
        }

        if (amount > 0) {
          earningsList.push({
            id: c.id,
            name: c.name || (c.id === 'flexi' ? 'Flexi Allowance' : c.id),
            rate: amount,
            monthly: amount,
            arrear: '-',
            total: amount
          });
        }
      });
  }

  // Employer PF (under RETIRALS) if PF is active
  const employerPFVal = isPfEnabled ? Number(rawBreakup.employerPF || rawBreakup.pfEmployer || slip.employerContributions?.pfEmployer || 0) : 0;
  if (isPfEnabled && employerPFVal > 0 && (!slip.employerContributionsLineItems || slip.employerContributionsLineItems.length === 0)) {
    earningsList.push({ isHeader: true, name: 'RETIRALS', rightLabel: 'Retirals Benefit' });
    earningsList.push({ id: 'employerPF', name: 'Employer PF', rate: employerPFVal, monthly: employerPFVal, arrear: '-', total: employerPFVal });
  }

  // 5. Deductions List
  let deductionsList = [];

  if (Array.isArray(slip.deductionsLineItems) && slip.deductionsLineItems.length > 0) {
    deductionsList = slip.deductionsLineItems.map(item => ({
      name: item.name + (item.details && !item.details.includes('Statutory') && !item.details.includes('Employees') ? ` (${item.details})` : ''),
      amount: Number(item.amount) || 0,
      isHeader: !!item.isHeader
    }));
  } else if (slip.deductions && typeof slip.deductions === 'object' && !comps) {
    const d = slip.deductions;
    if (d.pfEmployee > 0 || d.pf > 0) deductionsList.push({ name: 'PF - Employees', amount: d.pfEmployee || d.pf });
    if (d.esiEmployee > 0 || d.esi > 0) deductionsList.push({ name: 'ESIC Deduction', amount: d.esiEmployee || d.esi });
    if (d.professionalTax > 0 || d.pt > 0) deductionsList.push({ name: 'Prof Tax Deduction', amount: d.professionalTax || d.pt });
    if (d.tds > 0) deductionsList.push({ name: 'Income Tax', amount: d.tds });
    if (d.advanceDeduction > 0) deductionsList.push({ name: 'Advance Deduction', amount: d.advanceDeduction });
    if (d.loanDeduction > 0) deductionsList.push({ name: 'Loan Recovery', amount: d.loanDeduction });
    if (d.insuranceEmployee > 0 || d.insurance > 0) deductionsList.push({ name: 'Insurance Deduction', amount: d.insuranceEmployee || d.insurance });
    if (d.lwfEmployee > 0 || d.lwf > 0) deductionsList.push({ name: 'LWF Deduction', amount: d.lwfEmployee || d.lwf });
    if (Array.isArray(d.customDeductions)) {
      d.customDeductions.forEach(cd => {
        if (cd.amount > 0) deductionsList.push({ name: cd.name, amount: cd.amount });
      });
    }
  } else if (slip.breakdown && Object.keys(slip.breakdown).length > 0) {
    const bd = slip.breakdown;
    deductionsList.push({ name: 'PF -Employees', amount: bd.pf || 0 });
    deductionsList.push({ name: 'ESIC Deduction', amount: bd.esi || 0 });
    deductionsList.push({ name: 'Prof Tax Deduction', amount: bd.pt || 0 });
    deductionsList.push({ name: 'Income Tax', amount: bd.tds || 0 });
    deductionsList.push({ name: 'Advance Deduction', amount: bd.advanceDeduction || 0 });
    deductionsList.push({ name: 'Insurance Deduction', amount: bd.insuranceDeduction || 0 });
  } else {
    const pfEmployeeVal = isPfEnabled ? Number(rawBreakup.pfEmployee || comps?.pfEmployee || 0) : 0;
    deductionsList.push({ name: 'PF -Employees', amount: pfEmployeeVal });

    const esiEmployeeVal = isEsiEnabled ? Number(rawBreakup.esiEmployee || comps?.esiEmployee || 0) : 0;
    deductionsList.push({ name: 'ESIC Deduction', amount: esiEmployeeVal });

    const ptVal = isPtEnabled ? Number(rawBreakup.professionalTax || comps?.pt || 0) : 0;
    deductionsList.push({ name: 'Prof Tax Deduction', amount: ptVal });

    const tdsVal = isTdsEnabled ? Number(rawBreakup.tds || comps?.tds || 0) : 0;
    deductionsList.push({ name: 'Income Tax', amount: tdsVal });

    const advanceVal = Number(rawBreakup.advanceDeduction || 0);
    deductionsList.push({ name: 'Advance Deduction', amount: advanceVal });

    const insuranceDedVal = Number(rawBreakup.insuranceDeduction || 0);
    deductionsList.push({ name: 'Insurance Deduction', amount: insuranceDedVal });
  }

  // 6. Employer Contributions & CTC List (Flance Parity)
  let employerContributionsList = [];
  if (Array.isArray(slip.employerContributionsLineItems) && slip.employerContributionsLineItems.length > 0) {
    employerContributionsList = slip.employerContributionsLineItems.map(item => ({
      name: item.name,
      amount: Number(item.amount) || 0,
      details: item.details || '-'
    }));
  } else if (slip.employerContributions && typeof slip.employerContributions === 'object') {
    const ec = slip.employerContributions;
    if (ec.pfEmployer > 0) employerContributionsList.push({ name: 'Provident Fund (Employer PF)', amount: ec.pfEmployer, details: 'Employer PF Contribution (EPF + EPS)' });
    if (ec.esiEmployer > 0) employerContributionsList.push({ name: 'ESI (Employer Share)', amount: ec.esiEmployer, details: 'Employee State Insurance (3.25%)' });
    if (ec.gratuity > 0) employerContributionsList.push({ name: 'Gratuity Provision', amount: ec.gratuity, details: 'Retirement Gratuity Provision (4.81%)' });
    if (ec.insuranceEmployer > 0 || ec.insurance > 0) employerContributionsList.push({ name: 'Group Medical Insurance', amount: ec.insuranceEmployer || ec.insurance, details: 'Health & Accidental Coverage' });
    if (ec.lwfEmployer > 0) employerContributionsList.push({ name: 'Labour Welfare Fund (Employer)', amount: ec.lwfEmployer, details: 'LWF Contribution' });
    if (ec.nps > 0) employerContributionsList.push({ name: 'Employer NPS', amount: ec.nps, details: 'National Pension Scheme' });
  } else if (isPfEnabled && employerPFVal > 0) {
    employerContributionsList.push({ name: 'Provident Fund (Employer Contribution)', amount: employerPFVal, details: '12% of Basic up to stat limit (EPS + EPF)' });
  }

  // Totals calculation
  const computedEarnings = earningsList.reduce((acc, curr) => curr.isHeader ? acc : acc + (Number(curr.monthly) || 0), 0);
  const computedDeductions = deductionsList.reduce((acc, curr) => curr.isHeader ? acc : acc + (Number(curr.amount) || 0), 0);

  const totalEarningsMonthly = Number(slip.grossSalary || slip.grossPay || slip.earnings?.totalEarnings) || computedEarnings;
  const totalDeductions = Number(slip.totalDeductions || slip.deductions?.totalDeductions) || computedDeductions;
  const netTakeHome = Number(slip.netSalary) || (totalEarningsMonthly - totalDeductions);
  const totalEmployerContributions = Number(slip.totalEmployerContributions) || employerContributionsList.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const monthlyCTC = Number(slip.monthlyCTC || slip.compensation?.ctcMonthly) || (totalEarningsMonthly + totalEmployerContributions);

  // 7. Dynamic Financial Year Calculation for Tax Worksheet
  const periodParts = payPeriod.split(' ');
  const pYear = parseInt(periodParts[1]) || slip.year || new Date().getFullYear();
  const pMonthStr = (periodParts[0] || '').toUpperCase();
  const pMonthIdx = MONTH_NAMES.findIndex(m => m.toUpperCase() === pMonthStr);
  const pMonth = pMonthIdx !== -1 ? (pMonthIdx + 1) : (slip.month || 7);

  const fyStart = pMonth >= 4 ? pYear : pYear - 1;
  const fyEnd = fyStart + 1;
  const fyLabel = `April ${fyStart} - March ${fyEnd}`;

  // 8. Income Tax Worksheet Calculations (Matching Flance exactly)
  const tw = slip.taxWorksheet || {};
  const annualGross = tw.grossSalary || (totalEarningsMonthly * 12);
  const standardDeduction = tw.standardDeduction || (taxRegime.includes('NEW') ? 75000 : 50000);
  const pfDeduction = deductionsList.find(d => d.name.toLowerCase().includes('pf'))?.amount || 0;
  const ptDeduction = deductionsList.find(d => d.name.toLowerCase().includes('prof tax') || d.name.toLowerCase().includes('pt'))?.amount || 0;
  const annualPF = isPfEnabled ? (pfDeduction * 12) : 0;
  const annualPT = isPtEnabled ? (ptDeduction * 12) : 0;

  const decl = emp.declarations || slip.employeeSnapshot?.declarations || {};
  const epfVal = decl.epf || annualPF;
  const ppfVal = decl.ppf || 0;
  const homeLoanVal = decl.homeLoanPrincipal || 0;
  const licVal = decl.lic || 0;
  const elssVal = decl.elss || 0;
  const sec80CVal = decl.section80C || (epfVal + ppfVal + homeLoanVal + licVal + elssVal);
  const sec80CCapped = Math.min(150000, sec80CVal);
  const sec80DVal = decl.section80D || 0;
  const sec80CCDVal = decl.section80CCD1B || 0;
  const sec24bVal = decl.section24b || 0;
  const totalVIA = sec80CCapped + sec80DVal + sec80CCDVal;

  const chapterVIA = tw.chapterVIA !== undefined
    ? tw.chapterVIA
    : (totalVIA > 0 ? totalVIA : (taxRegime.includes('OLD') ? Math.min(150000, annualPF) : 0));
  const taxableIncome = tw.taxableIncome !== undefined ? tw.taxableIncome : Math.max(0, annualGross - standardDeduction - annualPT - chapterVIA);

  // Month-by-month TDS list (April to March)
  const monthsList = [
    { key: 4, name: 'April' },
    { key: 5, name: 'May' },
    { key: 6, name: 'June' },
    { key: 7, name: 'July' },
    { key: 8, name: 'August' },
    { key: 9, name: 'September' },
    { key: 10, name: 'October' },
    { key: 11, name: 'November' },
    { key: 12, name: 'December' },
    { key: 1, name: 'January' },
    { key: 2, name: 'February' },
    { key: 3, name: 'March' }
  ];
  const tdsMonths = tw.tdsMonths || {};
  const leaveBalance = Number(slip.leaveBalance || emp.leaveBalance || profile?.leaveBalance || 0).toFixed(2);

  // Dynamic earnings rows for worksheet
  const worksheetEarnings = (tw.componentBreakdown && tw.componentBreakdown.length > 0)
    ? tw.componentBreakdown
    : earningsList.filter(e => !e.isHeader).map(e => ({
        name: e.name,
        gross: (Number(e.monthly) || Number(e.rate) || 0) * 12,
        exempt: 0,
        taxable: (Number(e.monthly) || Number(e.rate) || 0) * 12
      }));

  const basicEarn = worksheetEarnings.find(e => e.name.toLowerCase().includes('basic'));
  const hraEarn = worksheetEarnings.find(e => e.name.toLowerCase().includes('hra') || e.name.toLowerCase().includes('house rent'));
  const basicAnnual = basicEarn ? (basicEarn.gross || (basicEarn.monthly * 12) || 0) : 0;
  const hraAnnual = hraEarn ? (hraEarn.gross || (hraEarn.monthly * 12) || 0) : 0;
  const hraCalc = tw.hra || {};

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-start justify-center z-50 p-2 sm:p-6 overflow-y-auto print:p-0 print:bg-white">
      <style type="text/css" media="print">
        {`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #payslip-print-area, #payslip-print-area * {
            visibility: visible !important;
          }
          #payslip-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
        }
        `}
      </style>

      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-4xl my-auto sm:my-6 overflow-hidden flex flex-col print:shadow-none print:border-none print:my-0">
        
        {/* Modal Top Control Bar */}
        <div className="sticky top-0 z-20 bg-slate-900 text-white px-5 py-2.5 flex items-center justify-between shadow-md print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="text-blue-400" size={17} />
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
              Official Compensation Statement — {payPeriod}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-xs border border-blue-400/40"
            >
              <Printer size={13} />
              <span>Print / Download PDF</span>
            </Button>
            <button
              type="button"
              onClick={() => setViewingPayslip(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ================= EXACT PIXEL-PERFECT EXCEL SPREADSHEET PAYSLIP (FLANCE SPEC) ================= */}
        <div className="p-3 sm:p-6 bg-slate-100/60 print:p-0 print:bg-white" id="payslip-print-area">
          <div className="payslip-container mx-auto max-w-4xl bg-white border-2 border-black p-4 sm:p-5 shadow-xs print:shadow-none print:border-2 print:border-black print:p-4 text-black font-sans text-[10px] leading-tight">
            
            {/* Header: Logo, Company Name & Address */}
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="w-1/4 flex items-center">
                {companyLogo ? (
                  <img
                    src={companyLogo}
                    alt={companyName || 'Company Logo'}
                    className="max-h-14 max-w-[170px] object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 font-bold tracking-tight text-xs text-slate-900">
                    <span className="text-blue-600 text-lg font-black leading-none">■</span>
                    <span className="font-extrabold text-slate-900">{companyName.split(' ')[0] || 'Company'}</span>
                    <span className="text-slate-600 font-semibold">{companyName.split(' ').slice(1, 3).join(' ') || ''}</span>
                  </div>
                )}
              </div>
              <div className="w-3/4 text-center pr-6">
                <h1 className="text-sm sm:text-base font-bold tracking-tight uppercase text-black">{companyName}</h1>
                {companyAddress && (
                  <p className="text-[10px] font-medium text-black mt-0.5 leading-relaxed">{companyAddress}</p>
                )}
              </div>
            </div>

            {/* Pay Slip Period Subheader */}
            <div className="text-center font-bold uppercase text-[11px] py-1.5 border-b border-black tracking-wide">
              PAY SLIP FOR THE MONTH OF {payPeriod}
            </div>

            {/* Employee Details 4-Column Box */}
            <div className="grid grid-cols-12 border-b border-black">
              {/* Col 1: Emp. Code, Name, Designation, Department, Cost Centre, DOJ */}
              <div className="col-span-4 border-r border-black p-1.5 space-y-1">
                <div className="flex"><span className="w-24 text-gray-700">Emp. Code</span><span className="font-bold">{employeeCode}</span></div>
                <div className="flex"><span className="w-24 text-gray-700">Name</span><span className="font-bold">{employeeName}</span></div>
                <div className="flex"><span className="w-24 text-gray-700">Designation</span><span className="font-bold">{designation}</span></div>
                <div className="flex"><span className="w-24 text-gray-700">Department</span><span className="font-bold">{department || '-'}</span></div>
                <div className="flex"><span className="w-24 text-gray-700">Cost Centre</span><span className="font-bold">{costCentre}</span></div>
                <div className="flex"><span className="w-24 text-gray-700">DOJ</span><span className="font-bold">{fmtDate(joiningDate)}</span></div>
              </div>

              {/* Col 2: PF UAN No., Month Days, Gender, Payable Days */}
              <div className="col-span-3 border-r border-black p-1.5 space-y-1">
                <div className="flex justify-between"><span className="text-gray-700">PF UAN No.</span><span className="font-bold">{isPfEnabled ? uanNumber : 'NA'}</span></div>
                <div className="flex justify-between mt-6"><span className="text-gray-700">Month Days</span><span className="font-bold">{workingDays}</span></div>
                <div className="flex justify-between"><span className="text-gray-700">Gender</span><span className="font-bold">{gender}</span></div>
                <div className="flex justify-between"><span className="text-gray-700">Payable Days</span><span className="font-bold">{paidDays}</span></div>
              </div>

              {/* Col 3: Location, Payment, Bank A/c, PAN, PF No., ESI No. */}
              <div className="col-span-3 border-r border-black p-1.5 space-y-1">
                <div className="flex justify-between"><span className="text-gray-700">Location</span><span className="font-bold">{location}</span></div>
                <div className="flex justify-between"><span className="text-gray-700">Payment</span><span className="font-bold">Bank Transfer</span></div>
                <div className="flex justify-between"><span className="text-gray-700">Bank A/c</span><span className="font-bold">{bankAccount || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-700">PAN</span><span className="font-bold">{panNumber || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-700">PF No.</span><span className="font-bold">{isPfEnabled ? pfNumber : 'NA'}</span></div>
                <div className="flex justify-between"><span className="text-gray-700">ESI No.</span><span className="font-bold">{isEsiEnabled ? esiNumber : 'NA'}</span></div>
              </div>

              {/* Col 4: Tax Regime */}
              <div className="col-span-2 p-1.5 flex items-start justify-center">
                <span className="font-bold text-[9px] uppercase tracking-wide border border-black px-1.5 py-0.5">
                  {taxRegime.includes('OLD') ? 'OLD TAX REGIME' : 'NEW TAX REGIME'}
                </span>
              </div>
            </div>

            {/* Earnings & Deductions Section Header */}
            <div className="grid grid-cols-12 border-b border-black text-center font-bold">
              <div className="col-span-7 border-r border-black py-0.5">Earnings</div>
              <div className="col-span-5 py-0.5">Deductions</div>
            </div>

            {/* Table Column Headers */}
            <div className="grid grid-cols-12 border-b border-black font-bold text-center">
              {/* Earnings Headers */}
              <div className="col-span-2 border-r border-black py-0.5 text-left px-1.5">Description</div>
              <div className="col-span-1 border-r border-black py-0.5 text-right px-1">Rate</div>
              <div className="col-span-1 border-r border-black py-0.5 text-right px-1">Monthly</div>
              <div className="col-span-1 border-r border-black py-0.5">Arrear</div>
              <div className="col-span-2 border-r border-black py-0.5 text-right px-1.5 leading-tight text-[8px] sm:text-[9px] flex items-center justify-end">
                Total Earning (Monthly)
              </div>
              {/* Deductions Headers */}
              <div className="col-span-3 border-r border-black py-0.5 text-left px-1.5">Description</div>
              <div className="col-span-2 py-0.5 text-right px-1.5">Amount</div>
            </div>

            {/* Table Rows (Aligned Line by Line) */}
            <div className="border-b border-black divide-y divide-black">
              {Array.from({ length: Math.max(earningsList.length, deductionsList.length, 3) }).map((_, idx) => {
                const earn = earningsList[idx] || null;
                const ded = deductionsList[idx] || null;

                if (earn?.isHeader || ded?.isHeader) {
                  return (
                    <div key={idx} className="grid grid-cols-12 font-bold bg-gray-50 py-0.5">
                      <div className="col-span-7 border-r border-black px-1.5 uppercase tracking-wider">{earn?.name || ''}</div>
                      <div className="col-span-5 px-1.5 uppercase tracking-wider">{earn?.rightLabel || ''}</div>
                    </div>
                  );
                }

                return (
                  <div key={idx} className="grid grid-cols-12 py-0.5 items-center">
                    {/* Earnings Cells */}
                    <div className="col-span-2 border-r border-black text-left px-1.5 font-medium">{earn?.name || ''}</div>
                    <div className="col-span-1 border-r border-black text-right px-1">{earn ? fmtVal(earn.rate) : ''}</div>
                    <div className="col-span-1 border-r border-black text-right px-1">{earn ? fmtVal(earn.monthly) : ''}</div>
                    <div className="col-span-1 border-r border-black text-center">{earn?.arrear || ''}</div>
                    <div className="col-span-2 border-r border-black text-right px-1.5 font-semibold">{earn ? fmtVal(earn.total || earn.monthly) : ''}</div>

                    {/* Deductions Cells */}
                    <div className="col-span-3 border-r border-black text-left px-1.5 font-medium">{ded?.name || ''}</div>
                    <div className="col-span-2 text-right px-1.5 font-semibold">{ded ? fmtVal(ded.amount) : ''}</div>
                  </div>
                );
              })}
            </div>

            {/* Gross Earnings / Total Deductions Row */}
            <div className="grid grid-cols-12 border-b border-black font-bold py-1 bg-gray-50 items-center">
              <div className="col-span-2 border-r border-black text-left px-1.5">Gross Earnings</div>
              <div className="col-span-1 border-r border-black text-right px-1">{fmtVal(totalEarningsMonthly)}</div>
              <div className="col-span-1 border-r border-black text-right px-1">{fmtVal(totalEarningsMonthly)}</div>
              <div className="col-span-1 border-r border-black text-center">-</div>
              <div className="col-span-2 border-r border-black text-right px-1.5 font-black">{fmtVal(totalEarningsMonthly)}</div>
              <div className="col-span-3 border-r border-black text-left px-1.5">Total Deduction</div>
              <div className="col-span-2 text-right px-1.5 font-black">{fmtVal(totalDeductions)}</div>
            </div>

            {/* Net Take Home Bar */}
            <div className="flex justify-between items-center font-bold border-b border-black px-4 py-1.5 bg-white">
              <span className="uppercase tracking-wider">NET TAKE HOME FOR THE MONTH</span>
              <span className="text-xs font-black">{fmtVal(netTakeHome)}</span>
            </div>

            {/* ----------------- EMPLOYER CONTRIBUTIONS & BENEFITS (FLANCE COST TO COMPANY) ----------------- */}
            {employerContributionsList.length > 0 && (
              <div>
                <div className="border-b border-black text-center font-bold py-1 bg-gray-50 uppercase tracking-wider text-[9.5px]">
                  Employer Contributions & Benefits (Cost to Company)
                </div>
                <div className="grid grid-cols-12 border-b border-black font-bold text-center text-[9px] bg-white">
                  <div className="col-span-5 border-r border-black py-0.5 text-left px-1.5">Contribution / Benefit Head</div>
                  <div className="col-span-3 border-r border-black py-0.5 text-right px-1.5">Monthly Amount</div>
                  <div className="col-span-4 py-0.5 text-left px-1.5">Description</div>
                </div>
                <div className="divide-y divide-black border-b border-black text-[9px]">
                  {employerContributionsList.map((contrib, cIdx) => (
                    <div key={cIdx} className="grid grid-cols-12 py-0.5 items-center bg-white">
                      <div className="col-span-5 border-r border-black text-left px-1.5 font-medium">{contrib.name}</div>
                      <div className="col-span-3 border-r border-black text-right px-1.5 font-semibold">{fmtVal(contrib.amount)}</div>
                      <div className="col-span-4 text-left px-1.5 text-gray-700">{contrib.details}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-12 border-b border-black font-bold py-1 bg-gray-50 items-center text-[9px]">
                  <div className="col-span-5 border-r border-black text-left px-1.5">Total Employer Contributions</div>
                  <div className="col-span-3 border-r border-black text-right px-1.5 font-black">{fmtVal(totalEmployerContributions)}</div>
                  <div className="col-span-4 text-left px-1.5 text-gray-600">Benefits included in CTC</div>
                </div>
                <div className="flex justify-between items-center font-bold border-b border-black px-4 py-1.5 bg-slate-100 text-[10px]">
                  <span className="uppercase tracking-wider">TOTAL COST TO COMPANY (MONTHLY CTC)</span>
                  <span className="text-xs font-black">{fmtVal(monthlyCTC)}</span>
                </div>
              </div>
            )}

            {/* ----------------- INCOME TAX WORKSHEET (DARK BLUE BAR #0f2d59) ----------------- */}
            <div className="border-b border-black text-center font-bold py-1 bg-[#0f2d59] text-white uppercase tracking-wider text-[10px]">
              Income Tax Worksheet for the period {fyLabel}
            </div>

            {/* 3-Section Tax Grid */}
            <div className="grid grid-cols-12 border-b border-black text-[9px] leading-tight">
              
              {/* Section 1: Income Breakdown & Deductions Table (Col 1 to 5) */}
              <div className="col-span-5 border-r border-black">
                <div className="grid grid-cols-12 border-b border-black font-bold text-center bg-gray-50 py-0.5">
                  <div className="col-span-5 border-r border-black text-left px-1">Description</div>
                  <div className="col-span-2 border-r border-black text-right px-1">Gross</div>
                  <div className="col-span-2 border-r border-black text-center">Exempt</div>
                  <div className="col-span-3 text-right px-1">Taxable</div>
                </div>
                <div className="divide-y divide-gray-200">
                  {worksheetEarnings.map((row, i) => (
                    <div key={i} className="grid grid-cols-12 py-0.5">
                      <div className="col-span-5 border-r border-black px-1 font-medium">{row.name}</div>
                      <div className="col-span-2 border-r border-black text-right px-1">{fmtVal(row.gross)}</div>
                      <div className="col-span-2 border-r border-black text-center text-gray-500">{row.exempt ? fmtVal(row.exempt) : '-'}</div>
                      <div className="col-span-3 text-right px-1">{fmtVal(row.taxable || row.gross)}</div>
                    </div>
                  ))}
                  <div className="grid grid-cols-12 py-0.5 border-t border-black font-bold bg-gray-50">
                    <div className="col-span-5 border-r border-black px-1">Gross Salary</div>
                    <div className="col-span-2 border-r border-black text-right px-1">{fmtVal(annualGross)}</div>
                    <div className="col-span-2 border-r border-black text-center">-</div>
                    <div className="col-span-3 text-right px-1 font-bold">{fmtVal(annualGross)}</div>
                  </div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Deduction - Income from House Property (Intt)</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1 font-medium">Standard Deduction</div><div className="col-span-3 text-right px-1">{fmtVal(standardDeduction)}</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Previous Employer Professional Tax</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Professional Tax</div><div className="col-span-3 text-right px-1">{isPtEnabled ? fmtVal(annualPT) : '-'}</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Under Chapter VI-A</div><div className="col-span-3 text-right px-1">{fmtVal(chapterVIA)}</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Any Other Income</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5 font-bold bg-gray-50 border-t border-black"><div className="col-span-9 border-r border-black px-1">Taxable Income</div><div className="col-span-3 text-right px-1">{fmtVal(taxableIncome)}</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Total Tax</div><div className="col-span-3 text-center">{tw.totalTax ? fmtVal(tw.totalTax) : '-'}</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax Rebate</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Surcharge</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax Due</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Educational Cess</div><div className="col-span-3 text-right px-1">{tw.cess ? fmtVal(tw.cess) : '-'}</div></div>
                  <div className="grid grid-cols-12 py-0.5 font-bold"><div className="col-span-9 border-r border-black px-1">Net Tax</div><div className="col-span-3 text-center">{tw.netTax ? fmtVal(tw.netTax) : '-'}</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax deducted (Previous Employer)</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax Deducted Till date</div><div className="col-span-3 text-center">{tw.taxDeductedTillDate ? fmtVal(tw.taxDeductedTillDate) : '-'}</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax to be Deducted</div><div className="col-span-3 text-center">{tw.taxToDeducted ? fmtVal(tw.taxToDeducted) : '-'}</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax/ Month</div><div className="col-span-3 text-right px-1">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax on Non-Recurring Earnings</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5 font-bold"><div className="col-span-9 border-r border-black px-1">Tax Deduction for this month</div><div className="col-span-3 text-right px-1 text-amber-900">{tw.taxDeductionThisMonth ? fmtVal(tw.taxDeductionThisMonth) : '-'}</div></div>
                </div>
              </div>

              {/* Section 2: Deduction Under Chapter VI-A (Col 6 to 9) */}
              <div className="col-span-4 border-r border-black flex flex-col justify-between">
                <div>
                  <div className="border-b border-black font-bold text-center py-0.5 bg-gray-50">
                    Deduction Under Chapter VI-A
                  </div>
                  <div className="border-b border-black font-bold px-1.5 py-0.5 bg-gray-100">
                    Investments u/s 80C
                  </div>
                  <div className="divide-y divide-gray-200">
                    <div className="flex justify-between px-1.5 py-0.5"><span>Provident Fund</span><span>{fmtVal(epfVal, false) || '0.00'}</span></div>
                    <div className="flex justify-between px-1.5 py-0.5"><span>Public Provident Fund</span><span>{fmtVal(ppfVal)}</span></div>
                    <div className="flex justify-between px-1.5 py-0.5"><span>Principal - Housing Loan</span><span>{fmtVal(homeLoanVal)}</span></div>
                    <div className="flex justify-between px-1.5 py-0.5"><span>Life Insurance Premium</span><span>{fmtVal(licVal)}</span></div>
                    <div className="flex justify-between px-1.5 py-0.5"><span>Mutual Fund</span><span>{fmtVal(elssVal)}</span></div>
                    <div className="flex justify-between px-1.5 py-0.5"><span>Atal Pension Yojna</span><span>-</span></div>
                    <div className="flex justify-between px-1.5 py-0.5 font-bold border-t border-black bg-gray-50"><span>Total of Investment u/s 80C</span><span>{fmtVal(sec80CVal, false) || '0.00'}</span></div>
                  </div>

                  <div className="border-t border-black divide-y divide-gray-200">
                    <div className="flex justify-between px-1.5 py-0.5"><span>U/S 80C</span><span>{fmtVal(sec80CCapped || annualPF)}</span></div>
                    <div className="flex justify-between px-1.5 py-0.5"><span>U/S 80D</span><span>{fmtVal(sec80DVal)}</span></div>
                    <div className="flex justify-between px-1.5 py-0.5"><span>U/S 80CCD</span><span>{fmtVal(sec80CCDVal)}</span></div>
                    <div className="flex justify-between px-1.5 py-0.5"><span>U/S 80 G</span><span>-</span></div>
                  </div>
                </div>

                <div className="border-t border-black divide-y divide-gray-200 bg-gray-50">
                  <div className="flex justify-between px-1.5 py-0.5 font-bold"><span>Total of Ded Under Chapter</span><span>{fmtVal(totalVIA || annualPF)}</span></div>
                  <div className="flex justify-between px-1.5 py-0.5"><span>Interest on Housing Loan</span><span>{fmtVal(sec24bVal)}</span></div>
                  <div className="flex justify-between px-1.5 py-0.5"><span>Max Allowed</span><span>-</span></div>
                </div>
              </div>

              {/* Section 3: Tax Deducted Details & Leave Balance (Col 10 to 12) */}
              <div className="col-span-3 flex flex-col justify-between">
                <div>
                  <div className="border-b border-black font-bold text-center py-0.5 bg-gray-50">
                    Tax Deducted Details
                  </div>
                  <div className="grid grid-cols-12 border-b border-black font-bold px-1.5 py-0.5 bg-gray-100 text-center">
                    <div className="col-span-6 text-left">Month</div>
                    <div className="col-span-6 text-right">Amount</div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {monthsList.map((m, i) => (
                      <div key={i} className="grid grid-cols-12 px-1.5 py-0.5">
                        <div className="col-span-6 text-left">{m.name}</div>
                        <div className="col-span-6 text-right font-medium">{fmtVal(tdsMonths[m.key] || 0)}</div>
                      </div>
                    ))}
                    <div className="grid grid-cols-12 px-1.5 py-0.5 font-bold border-t border-black bg-gray-50">
                      <div className="col-span-6 text-left">Total</div>
                      <div className="col-span-6 text-right">{fmtVal(Object.values(tdsMonths).reduce((a, b) => a + (Number(b) || 0), 0))}</div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-black p-1.5 bg-gray-50">
                  <div className="flex justify-between font-bold text-[9px]">
                    <span>LEAVE BALANCE AS ON MONTH END</span>
                    <span>{leaveBalance}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* HRA Calculation Table */}
            <div className="border-b border-black">
              <div className="font-bold px-1.5 py-0.5 bg-gray-100 border-b border-black">
                HRA Calculation
              </div>
              <div className="grid grid-cols-12 text-center font-bold border-b border-black text-[9px] py-0.5 bg-gray-50">
                <div className="col-span-1 border-r border-black">From</div>
                <div className="col-span-1 border-r border-black">To</div>
                <div className="col-span-2 border-r border-black">Rent Paid</div>
                <div className="col-span-2 border-r border-black">Actual HRA</div>
                <div className="col-span-2 border-r border-black">40/50% of Basic</div>
                <div className="col-span-2 border-r border-black">Rent - 10% of Basic</div>
                <div className="col-span-2">Exempt HRA</div>
              </div>
              <div className="grid grid-cols-12 text-center text-[9px] py-0.5 border-b border-black">
                <div className="col-span-1 border-r border-black">April</div>
                <div className="col-span-1 border-r border-black">March</div>
                <div className="col-span-2 border-r border-black">{fmtVal(hraCalc.rentPaid)}</div>
                <div className="col-span-2 border-r border-black">{fmtVal(hraCalc.actualHRA || hraAnnual)}</div>
                <div className="col-span-2 border-r border-black">{fmtVal(hraCalc.basicPercent || (basicAnnual * 0.4))}</div>
                <div className="col-span-2 border-r border-black">{fmtVal(hraCalc.rentMinusBasic10)}</div>
                <div className="col-span-2 font-bold bg-gray-50">{fmtVal(hraCalc.exemptHRA !== undefined && hraCalc.exemptHRA !== null ? hraCalc.exemptHRA : hraAnnual)}</div>
              </div>
              <div className="grid grid-cols-12 text-center text-[9px] py-0.5 font-bold bg-gray-50">
                <div className="col-span-2 border-r border-black text-center font-bold">Total</div>
                <div className="col-span-10 text-center">{fmtVal(hraCalc.exemptHRA !== undefined && hraCalc.exemptHRA !== null ? hraCalc.exemptHRA : hraAnnual)}</div>
              </div>
            </div>

            {/* Computer Generated Footer Banner */}
            <div className="bg-[#0f2d59] text-white text-center font-bold text-[9px] py-1 mt-1 tracking-wider uppercase">
              THIS IS COMPUTER GENERATED PAY SLIP - SIGNATURE NOT REQUIRED.
            </div>

          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-2.5 flex justify-end space-x-3 print:hidden">
          <Button variant="ghost" onClick={() => setViewingPayslip(null)} className="text-xs">
            Close
          </Button>
          <Button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={14} />
            <span>Print Official Payslip</span>
          </Button>
        </div>

      </div>
    </div>
  );
};

export default PayslipModal;
