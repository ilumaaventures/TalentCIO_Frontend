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
