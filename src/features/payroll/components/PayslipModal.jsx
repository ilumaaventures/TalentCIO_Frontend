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
  const comps = getPayslipComponents ? getPayslipComponents(viewingPayslip) : null;
  if (!comps) return null;

  // 1. Employee Details from Profile / User / Synced Payslip
  const employeeName = profile?.personal?.fullName
    || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ')
    || [profile?.user?.firstName, profile?.user?.lastName].filter(Boolean).join(' ')
    || 'Employee';

  const employeeCode = viewingPayslip.employeeCode
    || profile?.employment?.employeeCode
    || profile?.user?.employeeCode
    || profile?.employeeCode
    || 'EMP-' + String(profile?._id || '').slice(-4).toUpperCase();

  const designation = profile?.employment?.designation
    || profile?.user?.designation
    || profile?.designation
    || 'Software Developer';

  const department = profile?.employment?.department
    || profile?.user?.department
    || profile?.department
    || '';

  const costCentre = profile?.employment?.costCentre || profile?.user?.costCentre || 'TaaS';

  const joiningDate = profile?.employment?.joiningDate
    || profile?.user?.joiningDate
    || profile?.joiningDate;

  const uanNumber = profile?.compensation?.uanNumber
    || profile?.identity?.uanNumber
    || 'NA';

  const panNumber = profile?.identity?.panNumber
    || profile?.panNumber
    || '';

  const location = profile?.employment?.workLocation
    || profile?.user?.workLocation
    || 'Office';

  const bankAccount = profile?.compensation?.bankDetails?.accountNumber
    || profile?.bankDetails?.accountNumber
    || '';

  const pfNumber = profile?.compensation?.pfNumber || 'NA';
  const esiNumber = profile?.compensation?.esiNumber || 'NA';
  const gender = profile?.personal?.gender || 'Male';

  // 2. Settings & Feature Flags (Reference from Flance / compensation setup)
  const comp = profile?.compensation || {};
  const rawBreakup = comp.salaryBreakup instanceof Map
    ? Object.fromEntries(comp.salaryBreakup)
    : (comp.salaryBreakup || {});

  const isPfEnabled = comp.pfEnabled !== undefined ? comp.pfEnabled : (rawBreakup.pfEnabled !== false && comp.pfNumber && comp.pfNumber !== 'NA');
  const isEsiEnabled = comp.esiEnabled !== undefined ? comp.esiEnabled : (rawBreakup.esiEnabled !== false && comp.esiNumber && comp.esiNumber !== 'NA');
  const isPtEnabled = comp.ptEnabled !== undefined ? comp.ptEnabled : (rawBreakup.ptEnabled !== false);
  const isTdsEnabled = comp.tdsEnabled !== undefined ? comp.tdsEnabled : (rawBreakup.tdsEnabled !== false);

  const taxRegime = String(viewingPayslip.taxRegime || comp.taxRegime || rawBreakup.taxRegime || 'new').toUpperCase();

  const workingDays = Number(viewingPayslip.workingDays !== undefined ? viewingPayslip.workingDays : 31).toFixed(2);
  let paidDaysNum = viewingPayslip.paidDays !== undefined ? Number(viewingPayslip.paidDays) : 31;
  if (comps?.scale && comps.scale < 0.95 && (viewingPayslip.paidDays === undefined || viewingPayslip.paidDays === 31)) {
    paidDaysNum = Math.round(comps.scale * Number(workingDays));
  }
  const paidDays = paidDaysNum.toFixed(2);
  const payPeriod = String(viewingPayslip.period || 'JULY 2026').toUpperCase();

  // 3. Company details & Logo (Inherit from branding / tenant company / synced records)
  const companyName = brandingInfo?.name
    || companyConfig?.company?.name
    || user?.company?.name
    || profile?.company?.name
    || profile?.companyDetails?.name
    || viewingPayslip.companyName
    || 'Company';

  const rawAddress = brandingInfo?.address
    || companyConfig?.company?.address
    || user?.company?.address
    || profile?.company?.address
    || viewingPayslip.companyAddress
    || '';

  const companyAddress = typeof rawAddress === 'string'
    ? rawAddress
    : (rawAddress?.line1
        ? [rawAddress.line1, rawAddress.city, rawAddress.state, rawAddress.zip].filter(Boolean).join(', ')
        : '');

  const companyLogo = brandingInfo?.companyLogoUrl
    || companyConfig?.company?.logo
    || user?.company?.settings?.logo
    || user?.company?.logo
    || profile?.company?.logoUrl
    || profile?.company?.settings?.logo
    || viewingPayslip.companyLogo
    || '';

  // 4. Resolve Dynamic Earnings List
  // Priority: 1. Synced earningsLineItems from Flance -> 2. Synced breakdown -> 3. Local company salary components
  let earningsList = [];

  if (Array.isArray(viewingPayslip.earningsLineItems) && viewingPayslip.earningsLineItems.length > 0) {
    earningsList = viewingPayslip.earningsLineItems.map(item => ({
      id: item.name,
      name: item.name,
      rate: Number(item.amount) || 0,
      monthly: Number(item.amount) || 0,
      arrear: item.details || '-',
      total: Number(item.amount) || 0
    }));
  } else if (viewingPayslip.breakdown && Object.keys(viewingPayslip.breakdown).length > 0) {
    const bd = viewingPayslip.breakdown;
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
          // Dynamic salary component configured in settings
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
  const employerPFVal = isPfEnabled ? Number(rawBreakup.employerPF || rawBreakup.pfEmployer || 0) : 0;
  if (isPfEnabled && employerPFVal > 0) {
    earningsList.push({ isHeader: true, name: 'RETIRALS', rightLabel: 'Retirals Benefit' });
    earningsList.push({ id: 'employerPF', name: 'Employer PF', rate: employerPFVal, monthly: employerPFVal, arrear: '-', total: employerPFVal });
  }

  // 5. Deductions List
  // Priority: 1. Synced deductionsLineItems -> 2. Synced breakdown -> 3. Local calculations
  let deductionsList = [];

  if (Array.isArray(viewingPayslip.deductionsLineItems) && viewingPayslip.deductionsLineItems.length > 0) {
    deductionsList = viewingPayslip.deductionsLineItems.map(item => ({
      name: item.name + (item.details ? ` (${item.details})` : ''),
      amount: Number(item.amount) || 0
    }));
  } else if (viewingPayslip.breakdown && Object.keys(viewingPayslip.breakdown).length > 0) {
    const bd = viewingPayslip.breakdown;
    deductionsList.push({ name: 'PF -Employees', amount: bd.pf || 0 });
    deductionsList.push({ name: 'ESIC Deduction', amount: bd.esi || 0 });
    deductionsList.push({ name: 'Prof Tax Deduction', amount: bd.pt || 0 });
    deductionsList.push({ name: 'Income Tax', amount: bd.tds || 0 });
    deductionsList.push({ name: 'Advance Deduction', amount: bd.advanceDeduction || 0 });
    deductionsList.push({ name: 'Insurance Deduction', amount: bd.insuranceDeduction || 0 });
  } else {
    const pfEmployeeVal = isPfEnabled ? Number(rawBreakup.pfEmployee || comps.pfEmployee || 0) : 0;
    deductionsList.push({ name: 'PF -Employees', amount: pfEmployeeVal });

    const esiEmployeeVal = isEsiEnabled ? Number(rawBreakup.esiEmployee || comps.esiEmployee || 0) : 0;
    deductionsList.push({ name: 'ESIC Deduction', amount: esiEmployeeVal });

    const ptVal = isPtEnabled ? Number(rawBreakup.professionalTax || comps.pt || 0) : 0;
    deductionsList.push({ name: 'Prof Tax Deduction', amount: ptVal });

    const tdsVal = isTdsEnabled ? Number(rawBreakup.tds || comps.tds || 0) : 0;
    deductionsList.push({ name: 'Income Tax', amount: tdsVal });

    const advanceVal = Number(rawBreakup.advanceDeduction || 0);
    deductionsList.push({ name: 'Advance Deduction', amount: advanceVal });

    const insuranceDedVal = Number(rawBreakup.insuranceDeduction || 0);
    deductionsList.push({ name: 'Insurance Deduction', amount: insuranceDedVal });
  }

  if (isPfEnabled && employerPFVal > 0) {
    deductionsList.push({ isHeader: true });
    deductionsList.push({ name: 'Employer PF', amount: employerPFVal });
  }

  // Totals calculation
  const computedEarnings = earningsList.reduce((acc, curr) => curr.isHeader ? acc : acc + (Number(curr.monthly) || 0), 0);
  const computedDeductions = deductionsList.reduce((acc, curr) => curr.isHeader ? acc : acc + (Number(curr.amount) || 0), 0);

  const totalEarningsMonthly = Number(viewingPayslip.grossSalary) || computedEarnings;
  const totalDeductions = Number(viewingPayslip.totalDeductions) || computedDeductions;
  const netTakeHome = Number(viewingPayslip.netSalary) || (totalEarningsMonthly - totalDeductions);

  // 6. Dynamic Financial Year Calculation for Tax Worksheet
  const periodParts = String(viewingPayslip.period || 'JULY 2026').split(' ');
  const pYear = parseInt(periodParts[1]) || viewingPayslip.year || new Date().getFullYear();
  const pMonthStr = (periodParts[0] || '').toUpperCase();
  const pMonthIdx = MONTH_NAMES.findIndex(m => m.toUpperCase() === pMonthStr);
  const pMonth = pMonthIdx !== -1 ? (pMonthIdx + 1) : (viewingPayslip.month || 7);

  const fyStart = pMonth >= 4 ? pYear : pYear - 1;
  const fyEnd = fyStart + 1;
  const fyLabel = `April ${fyStart} - March ${fyEnd}`;

  // 7. Income Tax Worksheet Calculations
  const tw = viewingPayslip.taxWorksheet || null;
  const annualGross = tw?.grossSalary || (totalEarningsMonthly * 12);
  const standardDeduction = tw?.standardDeduction || (taxRegime.includes('NEW') ? 75000 : 50000);
  const pfDeduction = deductionsList.find(d => d.name.includes('PF'))?.amount || 0;
  const ptDeduction = deductionsList.find(d => d.name.includes('Prof Tax'))?.amount || 0;
  const annualPF = isPfEnabled ? (pfDeduction * 12) : 0;
  const annualPT = isPtEnabled ? (ptDeduction * 12) : 0;
  const chapterVIA = tw?.chapterVIA || (taxRegime.includes('OLD') ? Math.min(150000, annualPF) : 0);
  const taxableIncome = tw?.taxableIncome !== undefined ? tw.taxableIncome : Math.max(0, annualGross - standardDeduction - annualPT - chapterVIA);

  const months = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
  const leaveBalance = Number(viewingPayslip.leaveBalance || profile?.leaveBalance || 0).toFixed(2);

  // Dynamic earnings rows for worksheet
  const worksheetEarnings = earningsList.filter(e => !e.isHeader);
  const basicEarn = worksheetEarnings.find(e => e.name.toLowerCase().includes('basic'));
  const hraEarn = worksheetEarnings.find(e => e.name.toLowerCase().includes('hra') || e.name.toLowerCase().includes('house rent'));
  const basicAnnual = (basicEarn?.monthly || 0) * 12;
  const hraAnnual = (hraEarn?.monthly || 0) * 12;

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

        {/* ================= EXACT PIXEL-PERFECT EXCEL SPREADSHEET PAYSLIP ================= */}
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
              <div className="col-span-2 border-r border-black py-0.5 text-right px-1.5">Total Earning (Monthly)</div>
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
                    <div className="col-span-2 border-r border-black text-right px-1.5 font-semibold">{earn ? fmtVal(earn.total) : ''}</div>

                    {/* Deductions Cells */}
                    <div className="col-span-3 border-r border-black text-left px-1.5 font-medium">{ded?.name || ''}</div>
                    <div className="col-span-2 text-right px-1.5 font-semibold">{ded ? fmtVal(ded.amount) : ''}</div>
                  </div>
                );
              })}
            </div>

            {/* CTC / Totals Row */}
            <div className="grid grid-cols-12 border-b border-black font-bold py-1 bg-gray-50 items-center">
              <div className="col-span-2 border-r border-black text-left px-1.5">CTC</div>
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

            {/* ----------------- INCOME TAX WORKSHEET (DARK BLUE BAR) ----------------- */}
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
                  {worksheetEarnings.map((e, idx) => (
                    <div key={idx} className="grid grid-cols-12 py-0.5">
                      <div className="col-span-5 border-r border-black px-1">{e.name}</div>
                      <div className="col-span-2 border-r border-black text-right px-1">{fmtVal(e.monthly * 12)}</div>
                      <div className="col-span-2 border-r border-black text-center">-</div>
                      <div className="col-span-3 text-right px-1">{fmtVal(e.monthly * 12)}</div>
                    </div>
                  ))}
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-5 border-r border-black px-1">Other</div><div className="col-span-2 border-r border-black text-center">-</div><div className="col-span-2 border-r border-black text-center">-</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-5 border-r border-black px-1">Bonus</div><div className="col-span-2 border-r border-black text-center">-</div><div className="col-span-2 border-r border-black text-center">-</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-5 border-r border-black px-1">Arrear</div><div className="col-span-2 border-r border-black text-center">-</div><div className="col-span-2 border-r border-black text-center">-</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5 border-t border-black font-bold bg-gray-50"><div className="col-span-5 border-r border-black px-1">Gross Salary</div><div className="col-span-2 border-r border-black text-right px-1">{fmtVal(annualGross)}</div><div className="col-span-2 border-r border-black text-center">-</div><div className="col-span-3 text-right px-1 font-bold">{fmtVal(annualGross)}</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Deduction - Income from House Property (Intt)</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1 font-medium">Standard Deduction</div><div className="col-span-3 text-right px-1">{fmtVal(standardDeduction)}</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Previous Employer Professional Tax</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Professional Tax</div><div className="col-span-3 text-right px-1">{isPtEnabled ? fmtVal(annualPT) : '-'}</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Under Chapter VI-A</div><div className="col-span-3 text-right px-1">{fmtVal(chapterVIA)}</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Any Other Income</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5 font-bold bg-gray-50 border-t border-black"><div className="col-span-9 border-r border-black px-1">Taxable Income</div><div className="col-span-3 text-right px-1">{fmtVal(taxableIncome)}</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Total Tax</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax Rebate</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Surcharge</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax Due</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Educational Cess</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5 font-bold"><div className="col-span-9 border-r border-black px-1">Net Tax</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax deducted (Previous Employer)</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax Deducted Till date</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax to be Deducted</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax/ Month</div><div className="col-span-3 text-right px-1">-</div></div>
                  <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax on Non-Recurring Earnings</div><div className="col-span-3 text-center">-</div></div>
                  <div className="grid grid-cols-12 py-0.5 font-bold"><div className="col-span-9 border-r border-black px-1">Tax Deduction for this month</div><div className="col-span-3 text-right px-1">-</div></div>
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
                    <div className="flex justify-between px-1.5 py-0.5"><span>Provident Fund</span><span>{isPfEnabled ? fmtVal(annualPF, false) || '0.00' : '0.00'}</span></div>
                    <div className="flex justify-between px-1.5 py-0.5"><span>Public Provident Fund</span><span>-</span></div>
                    <div className="flex justify-between px-1.5 py-0.5"><span>Principal - Housing Loan</span><span>-</span></div>
                    <div className="flex justify-between px-1.5 py-0.5"><span>Life Insurance Premium</span><span>-</span></div>
                    <div className="flex justify-between px-1.5 py-0.5"><span>Mutual Fund</span><span>-</span></div>
                    <div className="flex justify-between px-1.5 py-0.5"><span>Atal Pension Yojna</span><span>-</span></div>
                    <div className="flex justify-between px-1.5 py-0.5 font-bold border-t border-black bg-gray-50"><span>Total of Investment u/s 80C</span><span>{isPfEnabled ? fmtVal(annualPF, false) || '0.00' : '0.00'}</span></div>
                  </div>

                  <div className="border-t border-black divide-y divide-gray-200">
                    <div className="flex justify-between px-1.5 py-0.5"><span>U/S 80C</span><span>{isPfEnabled ? fmtVal(annualPF) : '-'}</span></div>
                    <div className="flex justify-between px-1.5 py-0.5"><span>U/S 80D</span><span>-</span></div>
                    <div className="flex justify-between px-1.5 py-0.5"><span>U/S 80CCD</span><span>-</span></div>
                    <div className="flex justify-between px-1.5 py-0.5"><span>U/S 80 G</span><span>-</span></div>
                  </div>
                </div>

                <div className="border-t border-black divide-y divide-gray-200 bg-gray-50">
                  <div className="flex justify-between px-1.5 py-0.5 font-bold"><span>Total of Ded Under Chapter</span><span>{isPfEnabled ? fmtVal(annualPF) : '-'}</span></div>
                  <div className="flex justify-between px-1.5 py-0.5"><span>Interest on Housing Loan</span><span>-</span></div>
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
                    {months.map((m, i) => (
                      <div key={i} className="grid grid-cols-12 px-1.5 py-0.5">
                        <div className="col-span-6 text-left">{m}</div>
                        <div className="col-span-6 text-right">-</div>
                      </div>
                    ))}
                    <div className="grid grid-cols-12 px-1.5 py-0.5 font-bold border-t border-black bg-gray-50">
                      <div className="col-span-6 text-left">Total</div>
                      <div className="col-span-6 text-right">-</div>
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
                <div className="col-span-2 border-r border-black">-</div>
                <div className="col-span-2 border-r border-black">{fmtVal(hraAnnual)}</div>
                <div className="col-span-2 border-r border-black">{fmtVal(basicAnnual * 0.4)}</div>
                <div className="col-span-2 border-r border-black">-</div>
                <div className="col-span-2">{fmtVal(hraAnnual)}</div>
              </div>
              <div className="grid grid-cols-12 text-center text-[9px] py-0.5 font-bold bg-gray-50">
                <div className="col-span-2 border-r border-black text-center font-bold">Total</div>
                <div className="col-span-10 text-center">-</div>
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
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs shadow-md flex items-center gap-1.5"
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
