export const DEFAULT_DISPLAY_PREFERENCES = {
  // CTC & Top-Level Metrics
  showAnnualCTC: true,
  showMonthlyCTC: true,
  showGrossSalary: true,
  showNetTakeHome: true,
  showCtcComponentsCard: true,

  // Earnings Breakdown
  showEarningsBreakdown: true,

  // Employer Statutory & Benefits
  showEmployerStatutory: true,
  showPFEmployer: true,
  showGratuity: true,
  showLWFEmployer: true,
  showInsurance: true,

  // Employee Statutory & Deductions
  showEmployeeDeductions: true,
  showPFEmployee: true,
  showESIEmployee: true,
  showProfessionalTax: true,
  showLWFEmployee: true,
  showTDS: true,
};

export const DEFAULT_PAYROLL_CONFIG = {
  basicPercent: 0.5,
  hraPercent: 0.5,
  pfRate: 0.12,
  pfCap: 15000,
  pfEmployerRate: 0.12,
  pfCalculationType: 'percent',
  pfAmountEmployee: 1800,
  pfAmountEmployer: 1800,
  esiEmployeeRate: 0.0075,
  esiEmployerRate: 0.0325,
  esiBasicThreshold: 21000,
  lwfEmployer: 35,
  lwfEmployee: 15,
  gratuityRate: 0.0481,
  defaultWorkingDays: 30,
  defaultInsurance: 0,
  ltaMaxPercent: 0.0833,
  standardMonthlyHours: 160,
  compensationTypeDefaults: {},
  displayPreferences: DEFAULT_DISPLAY_PREFERENCES,
};

export const STRATEGY_DEFAULTS = {
  monthly_salary: { pfEligible: true, esiEligible: true, ptApplicable: true, gratuityEligible: true, lwfApplicable: true, ltaEligible: true },
  attendance_based: { pfEligible: true, esiEligible: true, ptApplicable: true, gratuityEligible: true, lwfApplicable: true, ltaEligible: true },
  salary_plus_commission: { pfEligible: true, esiEligible: true, ptApplicable: true, gratuityEligible: true, lwfApplicable: true, ltaEligible: true },
  weekly_salary: { pfEligible: true, esiEligible: true, ptApplicable: true, gratuityEligible: true, lwfApplicable: true, ltaEligible: true },
  weekly_wage: { pfEligible: true, esiEligible: true, ptApplicable: true, gratuityEligible: true, lwfApplicable: true, ltaEligible: true },

  hourly: { pfEligible: false, esiEligible: false, ptApplicable: false, gratuityEligible: false, lwfApplicable: false, ltaEligible: false },
  daily_wage: { pfEligible: false, esiEligible: false, ptApplicable: false, gratuityEligible: false, lwfApplicable: false, ltaEligible: false },
  piece_rate: { pfEligible: false, esiEligible: false, ptApplicable: false, gratuityEligible: false, lwfApplicable: false, ltaEligible: false },
  project_based: { pfEligible: false, esiEligible: false, ptApplicable: false, gratuityEligible: false, lwfApplicable: false, ltaEligible: false },
  flat_project: { pfEligible: false, esiEligible: false, ptApplicable: false, gratuityEligible: false, lwfApplicable: false, ltaEligible: false },
  milestone: { pfEligible: false, esiEligible: false, ptApplicable: false, gratuityEligible: false, lwfApplicable: false, ltaEligible: false },
  milestone_based: { pfEligible: false, esiEligible: false, ptApplicable: false, gratuityEligible: false, lwfApplicable: false, ltaEligible: false },
  timesheet_based: { pfEligible: false, esiEligible: false, ptApplicable: false, gratuityEligible: false, lwfApplicable: false, ltaEligible: false },
  commission_only: { pfEligible: false, esiEligible: false, ptApplicable: false, gratuityEligible: false, lwfApplicable: false, ltaEligible: false },
  retainer: { pfEligible: false, esiEligible: false, ptApplicable: false, gratuityEligible: false, lwfApplicable: false, ltaEligible: false },
  stipend_intern: { pfEligible: false, esiEligible: false, ptApplicable: false, gratuityEligible: false, lwfApplicable: false, ltaEligible: false },
};

export const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const parseBool = (val, def = true) => {
  if (val === false || val === 'false') return false;
  if (val === true || val === 'true') return true;
  return def;
};

export const payrollStatusClass = {
  draft: 'bg-gray-100 text-gray-700',
  processed: 'bg-blue-100 text-blue-700',
  approved: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export const roundAmount = (value) => Math.round((Number(value) || 0) * 100) / 100;
export const sumNamedAmounts = (items = []) => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
