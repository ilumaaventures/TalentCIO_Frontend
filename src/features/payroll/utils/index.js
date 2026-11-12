import {
  DEFAULT_PAYROLL_CONFIG,
  DEFAULT_DISPLAY_PREFERENCES,
  STRATEGY_DEFAULTS,
  fmtMoney,
  parseBool,
  payrollStatusClass,
  roundAmount,
  sumNamedAmounts,
} from './constants';

import {
  calculateHRAExemption,
  calculateTaxForRegime,
  calculateTaxDetails,
} from './taxCalculator';

import {
  calculateGratuityEntitlement,
  PT_STATE_CONFIGS,
  PT_STATE_LIST,
  getMonthlyPT,
} from './statutoryEngine';

export {
  DEFAULT_PAYROLL_CONFIG,
  DEFAULT_DISPLAY_PREFERENCES,
  STRATEGY_DEFAULTS,
  fmtMoney,
  parseBool,
  payrollStatusClass,
  roundAmount,
  sumNamedAmounts,
  calculateHRAExemption,
  calculateTaxForRegime,
  calculateTaxDetails,
  calculateGratuityEntitlement,
  PT_STATE_CONFIGS,
  PT_STATE_LIST,
  getMonthlyPT,
};

export const createDefaultSalaryData = (breakup = {}, comp = {}, user = null, config = null) => {
  const rawMonthly = comp.ctc || breakup.monthlyCTC || (breakup.annualCTC ? Number(breakup.annualCTC) / 12 : 0) || breakup.monthlyGross || (Number(breakup.basic || 0) + Number(breakup.hra || 0) + Number(breakup.specialAllowance || 0));
  const defaultMonthly = rawMonthly ? String(rawMonthly) : '';
  const defaultAnnual = rawMonthly ? String(rawMonthly * 12) : '';

  const rawCompType = breakup.compensationType || breakup.payType || 'monthly_salary';
  const compType = rawCompType === 'salaried' ? 'monthly_salary' : rawCompType;
  const compDefaults = (config?.compensationTypeDefaults && config.compensationTypeDefaults[compType]) || {};
  const baseDefaults = STRATEGY_DEFAULTS[compType] || { pfEligible: true, esiEligible: true, ptApplicable: true, gratuityEligible: true, lwfApplicable: true, ltaEligible: true };

  const resolveInitFlag = (val, overrideVal, baseVal) => {
    if (overrideVal === 'force_eligible' || overrideVal === true || overrideVal === 'true') {
      return true;
    }
    if (overrideVal === 'force_exempt' || overrideVal === false || overrideVal === 'false') {
      return false;
    }
    if (val !== undefined && val !== null && val !== '') {
      return parseBool(val);
    }
    if (overrideVal === 'default_eligible' || overrideVal === 'eligible') {
      return true;
    }
    if (overrideVal === 'default_exempt' || overrideVal === 'exempt') {
      return false;
    }
    return Boolean(baseVal);
  };

  const salaryData = {
    annualCTC: comp.ctc ? String(comp.ctc * 12) : (breakup.annualCTC ? String(breakup.annualCTC) : defaultAnnual),
    monthlyCTC: comp.ctc ? String(comp.ctc) : (breakup.monthlyCTC ? String(breakup.monthlyCTC) : defaultMonthly),
    compensationType: compType,
    attendanceMode: (user && user.attendanceMode) || breakup.attendanceMode || 'attendance',
    payType: breakup.payType || 'salaried',
    pfEnabled: resolveInitFlag(breakup.pfEnabled, compDefaults.pfEligible ?? compDefaults.pfEnabled, baseDefaults.pfEligible),
    esiEnabled: resolveInitFlag(breakup.esiEnabled, compDefaults.esiEligible ?? compDefaults.esiEnabled, baseDefaults.esiEligible),
    ptEnabled: resolveInitFlag(breakup.ptEnabled, compDefaults.ptApplicable ?? compDefaults.ptEnabled, baseDefaults.ptApplicable),
    lwfEnabled: resolveInitFlag(breakup.lwfEnabled, compDefaults.lwfApplicable ?? compDefaults.lwfEnabled, baseDefaults.lwfApplicable),
    gratuityEnabled: resolveInitFlag(breakup.gratuityEnabled, compDefaults.gratuityEligible ?? compDefaults.gratuityEnabled, baseDefaults.gratuityEligible),
    tdsEnabled: parseBool(breakup.tdsEnabled, true),
    ltaEnabled: resolveInitFlag(breakup.ltaEnabled, compDefaults.ltaEligible ?? compDefaults.ltaEnabled, baseDefaults.ltaEligible ?? true),
    includePfInCTC: parseBool(breakup.includePfInCTC, false),
    includeGratuityInCTC: parseBool(breakup.includeGratuityInCTC, true),
    basicPercent: breakup.basicPercent !== undefined && breakup.basicPercent !== null ? breakup.basicPercent : 50,
    hraPercent: breakup.hraPercent !== undefined && breakup.hraPercent !== null ? breakup.hraPercent : 50,
    vpfPercent: breakup.vpfPercent !== undefined && breakup.vpfPercent !== null ? breakup.vpfPercent : 0,
    componentFrequencies: breakup.componentFrequencies || {},
    useSalaryComponents: parseBool(breakup.useSalaryComponents, true),
    ptState: breakup.ptState || 'MH',
    professionalTax: breakup.professionalTax !== undefined ? String(breakup.professionalTax) : '0',
    insuranceAmount: comp.insuranceAmount || breakup.insuranceAmount || 0,
    employerNPS: comp.employerNPS || breakup.employerNPS || 0,
    joiningBonus: breakup.joiningBonus || 0,
    customAllowances: (Array.isArray(breakup.customAllowances) ? breakup.customAllowances : (Array.isArray(breakup.otherAllowances) ? breakup.otherAllowances : [])).map(item => ({
      name: item.name || '',
      amount: item.amount || 0,
      frequency: item.frequency || 'monthly',
      addedInAnnualCTC: item.addedInAnnualCTC !== false && item.inCTC !== false && item.includeInCTC !== false,
    })),
    customDeductions: (Array.isArray(breakup.customDeductions) ? breakup.customDeductions : (Array.isArray(breakup.otherDeductions) ? breakup.otherDeductions : [])).map(item => ({
      name: item.name || '',
      amount: item.amount || 0,
      frequency: item.frequency || 'monthly',
    })),
    rateCard: Array.isArray(breakup.rateCard) && breakup.rateCard.length > 0 ? breakup.rateCard : ((breakup.compensationType === 'piece_rate' || comp.compensationType === 'piece_rate') ? [{ paymentType: 'per_unit', rate: 0, unit: 'Per Deliverable' }] : []),
    dailyRate: breakup.dailyRate || 0,
    weeklyRate: breakup.weeklyRate || 0,
    projectFee: breakup.projectFee || 0,
    milestoneAmount: breakup.milestoneAmount || 0,
    commissionNotes: breakup.commissionNotes || '',
    hourlyRate: comp.hourlyRate || breakup.hourlyRate || 0,
    hoursWorked: breakup.hoursWorked || 160,
    basic: breakup.basic || '',
    hra: breakup.hra || '',
    specialAllowance: breakup.specialAllowance || '',
    monthlyGross: breakup.monthlyGross || '',
    pfEmployer: breakup.pfEmployer || '0',
    pfEmployee: breakup.pfEmployee || '0',
    gratuity: breakup.gratuity || '0',
    lwfEmployer: breakup.lwfEmployer || '0',
    lwfEmployee: breakup.lwfEmployee || '0',
    esiEmployer: breakup.esiEmployer || '0',
    esiEmployee: breakup.esiEmployee || '0',
    professionalTaxVal: breakup.professionalTax || '0',
    tds: breakup.tds || '0',
    netTakeHome: breakup.netTakeHome || '0',
  };

  if (config?.salaryComponents) {
    config.salaryComponents.forEach(c => {
      if (breakup[c.id] !== undefined) {
        salaryData[c.id] = String(breakup[c.id]);
      } else if (c.linkedTo === 'fixed') {
        salaryData[c.id] = String(c.linkValue || 0);
      }
    });
  }

  return salaryData;
};

const getSegmentLops = (totalLop, workingDays, totalDays, strategy = 'proportional', segments = [], customLops = []) => {
  const segmentLops = new Array(segments.length).fill(0);
  if (totalLop <= 0 || segments.length === 0) return segmentLops;

  if (strategy === 'custom') {
    let sum = 0;
    for (let i = 0; i < segments.length; i++) {
      segmentLops[i] = Number(customLops[i]) || 0;
      sum += segmentLops[i];
    }
    for (let i = 0; i < segments.length; i++) {
      const segWorkingDays = (segments[i].daysCount / totalDays) * workingDays;
      segmentLops[i] = Math.max(0, Math.min(segWorkingDays, segmentLops[i]));
    }
  } else if (strategy === 'older_first') {
    let remainingLop = totalLop;
    for (let i = 0; i < segments.length; i++) {
      const segWorkingDays = (segments[i].daysCount / totalDays) * workingDays;
      const segLop = Math.min(remainingLop, segWorkingDays);
      segmentLops[i] = roundAmount(segLop);
      remainingLop -= segLop;
    }
  } else if (strategy === 'newer_first') {
    let remainingLop = totalLop;
    for (let i = segments.length - 1; i >= 0; i--) {
      const segWorkingDays = (segments[i].daysCount / totalDays) * workingDays;
      const segLop = Math.min(remainingLop, segWorkingDays);
      segmentLops[i] = roundAmount(segLop);
      remainingLop -= segLop;
    }
  } else {
    // proportional
    for (let i = 0; i < segments.length; i++) {
      const segRatio = segments[i].daysCount / totalDays;
      segmentLops[i] = roundAmount(segRatio * totalLop);
    }
  }
  return segmentLops;
};

const getDayProrateArray = (totalDays, workingDays, paidDays, strategy = 'proportional', segmentLops = [], segments = []) => {
  const dayProrate = new Array(totalDays).fill(1);
  if (workingDays <= 0) return dayProrate;
  const ratio = Math.min(paidDays / workingDays, 1);
  if (ratio >= 1) return dayProrate;

  if (segments.length === 0) {
    dayProrate.fill(ratio);
    return dayProrate;
  }

  const computedLops = getSegmentLops(workingDays - paidDays, workingDays, totalDays, strategy, segments, segmentLops);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segLop = computedLops[i] || 0;
    const segRatio = seg.daysCount / totalDays;
    const segWorkingDays = segRatio * workingDays;
    const segProrate = segWorkingDays > 0 ? Math.max(0, Math.min(1, (segWorkingDays - segLop) / segWorkingDays)) : 1;
    for (let d = seg.startDay; d <= seg.endDay; d++) {
      dayProrate[d - 1] = segProrate;
    }
  }
  return dayProrate;
};

export const normalizePayrollConfig = (config = {}) => {
  const getNum = (val, def) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : def;
  };
  const cfg = config || {};
  return {
    basicPercent: getNum(cfg.basicPercent, DEFAULT_PAYROLL_CONFIG.basicPercent),
    hraPercent: getNum(cfg.hraPercent, DEFAULT_PAYROLL_CONFIG.hraPercent),
    pfRate: getNum(cfg.pfRate, DEFAULT_PAYROLL_CONFIG.pfRate),
    pfCap: getNum(cfg.pfCap, DEFAULT_PAYROLL_CONFIG.pfCap),
    pfEmployerRate: getNum(cfg.pfEmployerRate, DEFAULT_PAYROLL_CONFIG.pfEmployerRate),
    pfCalculationType: cfg.pfCalculationType || DEFAULT_PAYROLL_CONFIG.pfCalculationType,
    pfAmountEmployee: getNum(cfg.pfAmountEmployee, DEFAULT_PAYROLL_CONFIG.pfAmountEmployee),
    pfAmountEmployer: getNum(cfg.pfAmountEmployer, DEFAULT_PAYROLL_CONFIG.pfAmountEmployer),
    esiEmployeeRate: getNum(cfg.esiEmployeeRate, DEFAULT_PAYROLL_CONFIG.esiEmployeeRate),
    esiEmployerRate: getNum(cfg.esiEmployerRate, DEFAULT_PAYROLL_CONFIG.esiEmployerRate),
    esiBasicThreshold: getNum(cfg.esiBasicThreshold, DEFAULT_PAYROLL_CONFIG.esiBasicThreshold),
    lwfEmployer: getNum(cfg.lwfEmployer, DEFAULT_PAYROLL_CONFIG.lwfEmployer),
    lwfEmployee: getNum(cfg.lwfEmployee, DEFAULT_PAYROLL_CONFIG.lwfEmployee),
    gratuityRate: getNum(cfg.gratuityRate, DEFAULT_PAYROLL_CONFIG.gratuityRate),
    defaultWorkingDays: getNum(cfg.defaultWorkingDays, DEFAULT_PAYROLL_CONFIG.defaultWorkingDays),
    defaultInsurance: getNum(cfg.defaultInsurance, DEFAULT_PAYROLL_CONFIG.defaultInsurance),
    ltaMaxPercent: getNum(cfg.ltaMaxPercent, DEFAULT_PAYROLL_CONFIG.ltaMaxPercent),
    standardMonthlyHours: getNum(cfg.standardMonthlyHours, DEFAULT_PAYROLL_CONFIG.standardMonthlyHours),
    compensationTypeDefaults: cfg.compensationTypeDefaults || DEFAULT_PAYROLL_CONFIG.compensationTypeDefaults || {},
    displayPreferences: cfg.displayPreferences ? { ...DEFAULT_DISPLAY_PREFERENCES, ...cfg.displayPreferences } : { ...DEFAULT_DISPLAY_PREFERENCES },
    salaryComponents: cfg.salaryComponents || null,
  };
};

export const getMonthlyCTCValue = (source = {}) => {
  const monthlyCTC = Number(source.monthlyCTC);
  if (Number.isFinite(monthlyCTC) && monthlyCTC > 0) return monthlyCTC;

  const annualCTC = Number(source.annualCTC);
  if (Number.isFinite(annualCTC) && annualCTC > 0) return annualCTC / 12;

  const salaryCTC = Number(source.salaryStructure?.ctc);
  if (Number.isFinite(salaryCTC) && salaryCTC > 0) return salaryCTC;

  return 0;
};

export const buildMasterSalaryStructure = (source = {}, configInput = {}) => {
  const config = normalizePayrollConfig(configInput);
  let monthlyCTC = roundAmount(getMonthlyCTCValue(source));

  const rawCompType = source.compensationType || source.payType || 'monthly_salary';
  const compType = rawCompType === 'salaried' ? 'monthly_salary' : rawCompType;

  switch (compType) {
    case 'hourly': {
      const hours = source.hoursWorked !== undefined ? Number(source.hoursWorked) : 160;
      monthlyCTC = roundAmount((Number(source.hourlyRate) || 0) * hours);
      break;
    }
    case 'daily_wage': {
      const days = source.hoursWorked !== undefined ? Number(source.hoursWorked) : 26;
      const rate = Number(source.dailyRate) || 0;
      if (rate > 0) monthlyCTC = roundAmount(rate * days);
      break;
    }
    case 'weekly_wage':
    case 'weekly_salary': {
      const rate = Number(source.weeklyRate) || 0;
      if (rate > 0) monthlyCTC = roundAmount(rate * 4);
      break;
    }
    case 'flat_project':
    case 'project_based': {
      const fee = Number(source.projectFee) || 0;
      if (fee > 0) monthlyCTC = fee;
      break;
    }
    case 'milestone':
    case 'milestone_based': {
      const fee = Number(source.milestoneAmount) || 0;
      if (fee > 0) monthlyCTC = fee;
      break;
    }
    case 'piece_rate': {
      const rateCardEntry = (source.rateCard || []).find(r => r.paymentType === 'per_unit' || r.paymentType === 'UNIT') || (source.rateCard || [])[0];
      if (rateCardEntry && rateCardEntry.rate) {
        monthlyCTC = roundAmount(Number(rateCardEntry.rate) * (Number(source.hoursWorked) || 1));
      }
      break;
    }
    default:
      break;
  }

  const isIntern = source.employmentType === 'intern' || compType === 'stipend_intern';
  const isHourly = source.payType === 'hourly' || compType === 'hourly';
  const isFlat = source.payType === 'flat' || compType === 'flat_project' || compType === 'project_based';
  const isNonSalariedType = ['hourly', 'daily_wage', 'piece_rate', 'flat_project', 'project_based', 'milestone', 'milestone_based', 'commission_only', 'stipend_intern', 'retainer', 'timesheet_based'].includes(compType);

  const useComponents = source.useSalaryComponents === true || (source.useSalaryComponents !== false && !isIntern && !isHourly && !isFlat && !isNonSalariedType);

  const compDefaults = (config.compensationTypeDefaults && config.compensationTypeDefaults[compType]) || {};
  const isNonStructuredExplicit = source.useSalaryComponents === false;
  const baseDefaults = STRATEGY_DEFAULTS[compType] || {
    pfEligible: !isNonSalariedType && !isIntern && !isHourly && !isFlat && !isNonStructuredExplicit,
    esiEligible: !isNonSalariedType && !isIntern && !isHourly && !isFlat && !isNonStructuredExplicit,
    ptApplicable: !isNonSalariedType && !isIntern && !isHourly && !isFlat && !isNonStructuredExplicit,
    gratuityEligible: !isNonSalariedType && !isIntern && !isHourly && !isFlat && !isNonStructuredExplicit,
    lwfApplicable: !isNonSalariedType && !isIntern && !isHourly && !isFlat && !isNonStructuredExplicit,
    ltaEligible: !isNonSalariedType && !isIntern && !isHourly && !isFlat && !isNonStructuredExplicit,
  };

  const resolveStatutory = (sourceVal, overrideVal, baseVal) => {
    if (overrideVal === 'force_eligible' || overrideVal === true || overrideVal === 'true') {
      return true;
    }
    if (overrideVal === 'force_exempt' || overrideVal === false || overrideVal === 'false') {
      return false;
    }
    if (sourceVal !== undefined && sourceVal !== null && sourceVal !== '') {
      return parseBool(sourceVal);
    }
    if (overrideVal === 'default_eligible' || overrideVal === 'eligible') {
      return true;
    }
    if (overrideVal === 'default_exempt' || overrideVal === 'exempt') {
      return false;
    }
    return Boolean(baseVal);
  };

  const pfEnabled = resolveStatutory(
    source.pfEnabled !== undefined ? source.pfEnabled : source.pfEligible,
    compDefaults.pfEligible !== undefined ? compDefaults.pfEligible : compDefaults.pfEnabled,
    baseDefaults.pfEligible
  );
  const esiEnabled = resolveStatutory(
    source.esiEnabled !== undefined ? source.esiEnabled : source.esiEligible,
    compDefaults.esiEligible !== undefined ? compDefaults.esiEligible : compDefaults.esiEnabled,
    baseDefaults.esiEligible
  );
  const ptEnabled = resolveStatutory(
    source.ptEnabled !== undefined ? source.ptEnabled : source.ptApplicable,
    compDefaults.ptApplicable !== undefined ? compDefaults.ptApplicable : compDefaults.ptEnabled,
    baseDefaults.ptApplicable
  );
  const lwfEnabled = resolveStatutory(
    source.lwfEnabled !== undefined ? source.lwfEnabled : source.lwfApplicable,
    compDefaults.lwfApplicable !== undefined ? compDefaults.lwfApplicable : compDefaults.lwfEnabled,
    baseDefaults.lwfApplicable
  );
  const gratuityEnabled = resolveStatutory(
    source.gratuityEnabled !== undefined ? source.gratuityEnabled : source.gratuityEligible,
    compDefaults.gratuityEligible !== undefined ? compDefaults.gratuityEligible : compDefaults.gratuityEnabled,
    baseDefaults.gratuityEligible
  );
  const ltaEnabled = resolveStatutory(
    source.ltaEnabled !== undefined ? source.ltaEnabled : source.ltaEligible,
    compDefaults.ltaEligible !== undefined ? compDefaults.ltaEligible : compDefaults.ltaEnabled,
    baseDefaults.ltaEligible ?? true
  );
  const includePfInCTC = pfEnabled && source.includePfInCTC === true;
  const includeGratuityInCTC = gratuityEnabled && source.includeGratuityInCTC !== false;

  let basicPercent = !useComponents ? 1.0 : config.basicPercent;
  if (useComponents && source.basicPercent !== undefined && source.basicPercent !== null && Number(source.basicPercent) > 0) {
    basicPercent = Number(source.basicPercent) > 1 ? Number(source.basicPercent) / 100 : Number(source.basicPercent);
  }

  let hraPercent = !useComponents ? 0 : config.hraPercent;
  if (useComponents && source.hraPercent !== undefined && source.hraPercent !== null && Number(source.hraPercent) > 0) {
    hraPercent = Number(source.hraPercent) > 1 ? Number(source.hraPercent) / 100 : Number(source.hraPercent);
  }

  const hasDynamicComponents = config.salaryComponents && config.salaryComponents.length > 0;

  let basicMaster = roundAmount(monthlyCTC * basicPercent);
  let hraMaster = roundAmount(basicMaster * hraPercent);

  if (hasDynamicComponents) {
    const basicComp = config.salaryComponents.find(c => c.id === 'basic');
    if (basicComp) {
      if (!useComponents) {
        basicMaster = monthlyCTC;
      } else {
        let bVal = basicComp.linkValue;
        if (source.basicPercent !== undefined && source.basicPercent !== null && Number(source.basicPercent) > 0) {
          bVal = Number(source.basicPercent) > 1 ? Number(source.basicPercent) / 100 : Number(source.basicPercent);
        }
        if (basicComp.linkedTo === 'ctc_percent') {
          basicMaster = roundAmount(monthlyCTC * bVal);
        } else if (basicComp.linkedTo === 'fixed') {
          const val = source['basic'] !== undefined ? source['basic'] : (source.salaryStructure?.[basicComp.id] !== undefined ? source.salaryStructure[basicComp.id] : 0);
          basicMaster = roundAmount(val);
        }
      }
    }
    const hraComp = config.salaryComponents.find(c => c.id === 'hra');
    if (hraComp) {
      if (!useComponents) {
        hraMaster = 0;
      } else {
        let hVal = hraComp.linkValue;
        if (source.hraPercent !== undefined && source.hraPercent !== null && Number(source.hraPercent) > 0) {
          hVal = Number(source.hraPercent) > 1 ? Number(source.hraPercent) / 100 : Number(source.hraPercent);
        }
        if (hraComp.linkedTo === 'basic_percent') {
          hraMaster = roundAmount(basicMaster * hVal);
        } else if (hraComp.linkedTo === 'ctc_percent') {
          hraMaster = roundAmount(monthlyCTC * hVal);
        } else if (hraComp.linkedTo === 'fixed') {
          const val = source['hra'] !== undefined ? source['hra'] : (source.salaryStructure?.['hra'] !== undefined ? source.salaryStructure['hra'] : 0);
          hraMaster = roundAmount(val);
        }
      }
    }
  }

  // PF Calculation
  let pfEmployer = 0;
  let pfEmployee = 0;
  let pfBase = 0;
  if (pfEnabled && basicMaster > 0 && monthlyCTC > 0) {
    if (config.pfCalculationType === 'fixed') {
      pfEmployer = roundAmount(config.pfAmountEmployer);
      pfEmployee = roundAmount(config.pfAmountEmployee);
      pfBase = pfEmployee;
    } else {
      const cap = Number(config.pfCap) > 0 ? Number(config.pfCap) : (DEFAULT_PAYROLL_CONFIG.pfCap || 15000);
      pfBase = roundAmount(Math.min(basicMaster, cap));
      pfEmployer = roundAmount(pfBase * (Number(config.pfEmployerRate) || 0.12));
      pfEmployee = roundAmount(pfBase * (Number(config.pfRate) || 0.12));
    }
  }

  // Gratuity Calculation
  const gratuity = gratuityEnabled ? roundAmount(basicMaster * config.gratuityRate) : 0;

  // LWF Calculation
  const lwfEmployer = (lwfEnabled && monthlyCTC > 0) ? roundAmount(config.lwfEmployer) : 0;
  const lwfEmployee = (lwfEnabled && monthlyCTC > 0) ? roundAmount(config.lwfEmployee) : 0;

  const rawInsurance = source.insuranceAmount !== undefined ? source.insuranceAmount
    : (source.insurance !== undefined ? source.insurance
    : (source.medical_insurance !== undefined ? source.medical_insurance : (config.defaultInsurance || 0)));
  const insurance = monthlyCTC > 0 ? roundAmount(rawInsurance) : 0;
  const employerNPS = roundAmount(source.employerNPS);

  const isInsuranceComp = (c) => c && (
    c.id === 'medical_insurance' ||
    c.id === 'insurance' ||
    (c.name && c.name.toLowerCase().includes('insurance'))
  );

  const hasFlexiInsuranceDeduction = config.salaryComponents?.some(c =>
    c.type === 'deduction' &&
    isInsuranceComp(c) &&
    (c.deductFromFlexi === true || c.includeInCTC === true)
  );
  const flexiInsuranceAmount = hasFlexiInsuranceDeduction ? 0 : insurance;

  const pfEmployerInCTC = (pfEnabled && includePfInCTC) ? pfEmployer : 0;
  const gratuityInCTC = (gratuityEnabled && includeGratuityInCTC) ? gratuity : 0;

  const otherAllowances = source.salaryStructure?.otherAllowances || source.otherAllowances || (Array.isArray(source.customAllowances) ? source.customAllowances : []);
  const customAllowanceVal = (!Array.isArray(source.customAllowances) && !isNaN(Number(source.customAllowances))) ? Number(source.customAllowances) : 0;
  const customAllowInCTC = source.customAllowancesInCTC !== false;

  const isBonusOrNonMonthly = (item) => {
    if (!item) return false;
    const name = String(item.name || '').trim().toLowerCase();
    const freq = String(item.frequency || '').toLowerCase();
    return /bonus|variable|joining/i.test(name) || ['semi_annually', 'semi-annually', 'quarterly', 'annually', 'one_time'].includes(freq);
  };

  const getAnnualItemVal = (item) => {
    const amt = Number(item.amount) || 0;
    const freq = String(item.frequency || 'semi_annually').toLowerCase();
    if (freq === 'semi_annually' || freq === 'semi-annually') return amt * 2;
    if (freq === 'quarterly') return amt * 4;
    if (freq === 'monthly') return amt * 12;
    return amt;
  };

  // Monthly allowances: regular monthly additions that affect monthly gross & net take-home
  const monthlyOtherAllowances = otherAllowances.filter(item => item && !isBonusOrNonMonthly(item));
  // Annual/Bonus allowances: added into Annual CTC, NOT into monthly gross or take-home
  const annualBonusAllowances = otherAllowances.filter(item => item && isBonusOrNonMonthly(item));

  const otherAllowancesInCTC = monthlyOtherAllowances.filter(item => item && (item.addedInAnnualCTC !== false && item.inCTC !== false && item.includeInCTC !== false));
  const otherAllowancesInCTCSum = roundAmount(
    otherAllowancesInCTC.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) +
    (customAllowInCTC ? customAllowanceVal : 0)
  );

  const otherAllowancesOutsideCTC = monthlyOtherAllowances.filter(item => item && (item.addedInAnnualCTC === false || item.inCTC === false || item.includeInCTC === false));
  const otherAllowancesOutsideCTCSum = roundAmount(
    otherAllowancesOutsideCTC.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) +
    (!customAllowInCTC ? customAllowanceVal : 0)
  );

  const otherAllowancesSum = roundAmount(otherAllowancesInCTCSum + otherAllowancesOutsideCTCSum);

  const annualBonusInCTC = annualBonusAllowances.filter(item => item.addedInAnnualCTC !== false && item.inCTC !== false && item.includeInCTC !== false);
  const annualBonusInCTCSum = roundAmount(
    annualBonusInCTC.reduce((sum, item) => sum + getAnnualItemVal(item), 0)
  );
  const annualBonusOutsideCTC = annualBonusAllowances.filter(item => item.addedInAnnualCTC === false || item.inCTC === false || item.includeInCTC === false);
  const annualBonusOutsideCTCSum = roundAmount(
    annualBonusOutsideCTC.reduce((sum, item) => sum + getAnnualItemVal(item), 0)
  );
  const totalAnnualBonus = roundAmount(annualBonusInCTCSum + annualBonusOutsideCTCSum);

  const isComponentEnabled = (c) => {
    if (!c) return false;
    const cid = (c.id || '').toLowerCase();
    const cname = (c.name || '').toLowerCase();

    // LTA check (both earning and deduction)
    if (cid === 'lta' || cname === 'lta' || cname === 'leave travel allowance' || cname.includes('leave travel')) {
      if (!ltaEnabled) return false;
    }

    // Statutory checks
    if (cid === 'pf' || cname === 'provident fund' || cname === 'pf') {
      if (!pfEnabled) return false;
    }
    if (cid === 'esi' || cname === 'employee state insurance' || cname === 'esi') {
      if (!esiEnabled) return false;
    }
    if (cid === 'pt' || cid === 'professional_tax' || cname === 'professional tax') {
      if (!ptEnabled) return false;
    }
    if (cid === 'gratuity' || cname === 'gratuity') {
      if (!gratuityEnabled) return false;
    }
    if (cid === 'lwf' || cname === 'labour welfare fund' || cname === 'lwf') {
      if (!lwfEnabled) return false;
    }

    // Direct flag checks on source: e.g. source[c.id + 'Enabled'], source[c.id + 'Eligible']
    if (source[c.id + 'Enabled'] !== undefined && !parseBool(source[c.id + 'Enabled'], true)) return false;
    if (source[c.id + 'Eligible'] !== undefined && !parseBool(source[c.id + 'Eligible'], true)) return false;
    if (source[c.id] === false) return false;

    // Direct flag checks inside salaryStructure / deductions
    if (source.salaryStructure && source.salaryStructure[c.id + 'Enabled'] !== undefined && !parseBool(source.salaryStructure[c.id + 'Enabled'], true)) return false;
    if (source.salaryStructure && source.salaryStructure[c.id + 'Eligible'] !== undefined && !parseBool(source.salaryStructure[c.id + 'Eligible'], true)) return false;
    if (source.deductions && source.deductions[c.id + 'Enabled'] !== undefined && !parseBool(source.deductions[c.id + 'Enabled'], true)) return false;
    if (source.deductions && source.deductions[c.id + 'Eligible'] !== undefined && !parseBool(source.deductions[c.id + 'Eligible'], true)) return false;

    // Disabled / exempt list checks
    if (Array.isArray(source.disabledComponents) && (source.disabledComponents.includes(c.id) || source.disabledComponents.includes(c.name))) return false;
    if (Array.isArray(source.exemptComponents) && (source.exemptComponents.includes(c.id) || source.exemptComponents.includes(c.name))) return false;

    return true;
  };

  let flexi = 0, broadband = 0, petrol = 0, lta = 0, ltaCap = 0, conveyance = 0, medicalAllowance = 0, specialAllowance = 0;

  const computeEarnings = (esiEmployerPlaceholder) => {
    const em = {};
    if (hasDynamicComponents) {
      ltaCap = roundAmount(basicMaster * config.ltaMaxPercent);
      let sumOfAllNonRemainder = 0;
      let flexiDeductionsSum = 0;
      config.salaryComponents.forEach(c => {
        if (c.type === 'earning' && c.linkedTo !== 'remainder') {
          if (!isComponentEnabled(c)) {
            em[c.id] = 0;
            return;
          }
          let amount = 0;
          if (c.id === 'basic') {
            amount = basicMaster;
          } else if (c.id === 'hra') {
            amount = hraMaster;
          } else if (c.linkedTo === 'ctc_percent') {
            let pct = c.linkValue;
            const overrideVal = source[c.id + 'Percent'];
            if (overrideVal !== undefined && overrideVal !== null && Number(overrideVal) > 0) {
              pct = Number(overrideVal) > 1 ? Number(overrideVal) / 100 : Number(overrideVal);
            }
            amount = roundAmount(monthlyCTC * pct);
          } else if (c.linkedTo === 'basic_percent') {
            let pct = c.linkValue;
            const overrideVal = source[c.id + 'Percent'];
            if (overrideVal !== undefined && overrideVal !== null && Number(overrideVal) > 0) {
              pct = Number(overrideVal) > 1 ? Number(overrideVal) / 100 : Number(overrideVal);
            }
            amount = roundAmount(basicMaster * pct);
          } else if (c.linkedTo === 'fixed') {
            let val = source[c.id] !== undefined ? source[c.id] : (source.salaryStructure?.[c.id] !== undefined ? source.salaryStructure[c.id] : 0);
            if (c.id === 'medical' && val === 0) {
              val = source.medicalAllowance !== undefined ? source.medicalAllowance : (source.salaryStructure?.medicalAllowance !== undefined ? source.salaryStructure.medicalAllowance : 0);
            }
            if (c.id === 'meal' && val === 0) {
              val = source.mealAllowance !== undefined ? source.mealAllowance : (source.salaryStructure?.mealAllowance !== undefined ? source.salaryStructure.mealAllowance : 0);
            }
            if (c.id === 'flexi' && val === 0) {
              val = source.flexiAmount !== undefined ? source.flexiAmount : (source.salaryStructure?.flexiAmount !== undefined ? source.salaryStructure.flexiAmount : 0);
            }
            amount = roundAmount(val);
          }
          const isLta = c.id === 'lta' || (c.name && c.name.toLowerCase() === 'lta') || (c.name && c.name.toLowerCase().includes('leave travel'));
          if (isLta) {
            if (!ltaEnabled) {
              amount = 0;
            } else {
              if (c.linkedTo === 'fixed' && source.lta !== undefined && source.lta !== null && source.lta !== '') {
                amount = roundAmount(source.lta);
              }
              amount = roundAmount(Math.min(amount, ltaCap || amount));
            }
          }
          em[c.id] = amount;
          if (c.includeInCTC !== false) {
            sumOfAllNonRemainder += amount;
          }
        }
      });
      config.salaryComponents.forEach(c => {
        if (c.type === 'deduction' && (c.deductFromFlexi === true || c.includeInCTC === true)) {
          if (!isComponentEnabled(c)) {
            return;
          }
          let amount = 0;
          if (c.linkedTo === 'ctc_percent') {
            let pct = c.linkValue;
            const overrideVal = source[c.id + 'Percent'];
            if (overrideVal !== undefined && overrideVal !== null && Number(overrideVal) > 0) {
              pct = Number(overrideVal) > 1 ? Number(overrideVal) / 100 : Number(overrideVal);
            }
            amount = roundAmount(monthlyCTC * pct);
          } else if (c.linkedTo === 'basic_percent') {
            let pct = c.linkValue;
            const overrideVal = source[c.id + 'Percent'];
            if (overrideVal !== undefined && overrideVal !== null && Number(overrideVal) > 0) {
              pct = Number(overrideVal) > 1 ? Number(overrideVal) / 100 : Number(overrideVal);
            }
            amount = roundAmount(basicMaster * pct);
          } else if (c.linkedTo === 'fixed') {
            let val = source[c.id] !== undefined ? source[c.id] : (source.deductions?.[c.id] !== undefined ? source.deductions[c.id] : (source.salaryStructure?.[c.id] !== undefined ? source.salaryStructure[c.id] : (c.linkValue || 0)));
            if (isInsuranceComp(c)) {
              const insOverride = source.insuranceAmount !== undefined ? source.insuranceAmount
                : (source.insurance !== undefined ? source.insurance
                : (source.medical_insurance !== undefined ? source.medical_insurance : undefined));
              if (insOverride !== undefined && insOverride !== null && insOverride !== '') {
                val = insOverride;
              } else if (insOverride === 0 || insOverride === '0' || insOverride === '') {
                val = 0;
              }
            }
            const isLta = c.id === 'lta' || (c.name && c.name.toLowerCase() === 'lta') || (c.name && c.name.toLowerCase().includes('leave travel'));
            if (isLta && (source.lta !== undefined && source.lta !== null && source.lta !== '')) {
              val = source.lta;
            }
            amount = roundAmount(val);
          }
          const isLta = c.id === 'lta' || (c.name && c.name.toLowerCase() === 'lta') || (c.name && c.name.toLowerCase().includes('leave travel'));
          if (isLta) {
            if (!ltaEnabled) {
              amount = 0;
            } else if (ltaCap > 0) {
              amount = roundAmount(Math.min(amount, ltaCap));
            }
          }
          flexiDeductionsSum += amount;
        }
      });

      config.salaryComponents.forEach(c => {
        if (c.type === 'earning' && c.linkedTo === 'remainder') {
          if (!isComponentEnabled(c)) {
            em[c.id] = 0;
            return;
          }
          em[c.id] = roundAmount(Math.max(
            monthlyCTC - sumOfAllNonRemainder - flexiDeductionsSum - pfEmployerInCTC - gratuityInCTC - lwfEmployer - flexiInsuranceAmount - esiEmployerPlaceholder - employerNPS - otherAllowancesInCTCSum,
            0
          ));
        }
      });
    }
    return em;
  };

  let earningsMap = computeEarnings(0);

  const ltaComp = config.salaryComponents?.find(c => c.id === 'lta' || (c.name && c.name.toLowerCase() === 'lta') || (c.name && c.name.toLowerCase().includes('leave travel')));

  if (hasDynamicComponents) {
    flexi = earningsMap['flexi'] || 0;
    broadband = earningsMap['broadband'] || 0;
    petrol = earningsMap['petrol'] || 0;
    lta = ltaEnabled ? (earningsMap[ltaComp?.id || 'lta'] || 0) : 0;
    conveyance = earningsMap['conveyance'] || 0;
    medicalAllowance = earningsMap['medical'] || 0;
    specialAllowance = earningsMap['special'] || 0;
  } else {
    flexi = roundAmount(source.flexiAmount);
    broadband = roundAmount(source.broadband);
    petrol = roundAmount(source.petrol);
    const ltaRequested = ltaEnabled ? roundAmount(source.lta) : 0;
    ltaCap = roundAmount(basicMaster * config.ltaMaxPercent);
    lta = ltaEnabled ? roundAmount(Math.min(ltaRequested, ltaCap || ltaRequested)) : 0;
    conveyance = roundAmount(source.salaryStructure?.conveyance);
    medicalAllowance = roundAmount(source.salaryStructure?.medicalAllowance);
    specialAllowance = roundAmount(Math.max(
      monthlyCTC - basicMaster - hraMaster - flexi - broadband - petrol - lta - pfEmployerInCTC - gratuityInCTC - lwfEmployer - insurance - employerNPS - conveyance - medicalAllowance - otherAllowancesInCTCSum,
      0
    ));
  }
  if (!useComponents) {
    basicMaster = monthlyCTC;
    hraMaster = 0;
    flexi = 0; broadband = 0; petrol = 0; lta = 0; conveyance = 0; medicalAllowance = 0; specialAllowance = 0;
    if (hasDynamicComponents) {
      Object.keys(earningsMap).forEach(k => { earningsMap[k] = k === 'basic' ? monthlyCTC : 0; });
    }
  }

  const pass1TotalEarnings = hasDynamicComponents
    ? roundAmount(Object.values(earningsMap).reduce((sum, v) => sum + v, 0) + otherAllowancesSum)
    : roundAmount(basicMaster + hraMaster + flexi + broadband + petrol + lta + specialAllowance + conveyance + medicalAllowance + otherAllowancesSum);

  const esiApplicable = esiEnabled && (pass1TotalEarnings <= config.esiBasicThreshold);
  const esiEmployer = roundAmount(esiApplicable ? basicMaster * config.esiEmployerRate : 0);
  const esiEmployee = roundAmount(esiApplicable ? basicMaster * config.esiEmployeeRate : 0);

  if (esiApplicable && hasDynamicComponents) {
    earningsMap = computeEarnings(esiEmployer);
    flexi = earningsMap['flexi'] || 0;
    broadband = earningsMap['broadband'] || 0;
    petrol = earningsMap['petrol'] || 0;
    lta = ltaEnabled ? (earningsMap[ltaComp?.id || 'lta'] || 0) : 0;
    conveyance = earningsMap['conveyance'] || 0;
    medicalAllowance = earningsMap['medical'] || 0;
    specialAllowance = earningsMap['special'] || 0;
    if (!useComponents) {
      basicMaster = monthlyCTC;
      hraMaster = 0;
      Object.keys(earningsMap).forEach(k => { earningsMap[k] = k === 'basic' ? monthlyCTC : 0; });
    }
  }

  const totalEarnings = hasDynamicComponents
    ? roundAmount(Object.values(earningsMap).reduce((sum, v) => sum + v, 0) + otherAllowancesSum)
    : roundAmount(basicMaster + hraMaster + flexi + broadband + petrol + lta + specialAllowance + conveyance + medicalAllowance + otherAllowancesSum);

  const grossSalary = hasDynamicComponents
    ? roundAmount(Object.entries(earningsMap).reduce((sum, [id, val]) => {
        const comp = config.salaryComponents?.find(c => c.id === id);
        if (comp) {
          if (comp.taxable || comp.id === 'hra') {
            return sum + val;
          }
          return sum;
        }
        if (['flexi', 'broadband', 'petrol', 'lta'].includes(id)) return sum;
        return sum + val;
      }, 0) + otherAllowancesSum)
    : roundAmount(basicMaster + hraMaster + conveyance + medicalAllowance + specialAllowance + otherAllowancesSum);

  const totalEmployerContributions = roundAmount(
    pfEmployer + esiEmployer + gratuity + lwfEmployer + insurance + employerNPS
  );

  const taxRegime = source.taxRegime || 'new';
  const declarations = source.declarations || {};

  const taxDetails = calculateTaxDetails({
    ...source,
    ptEnabled,
    taxRegime,
    declarations
  }, monthlyCTC, config, basicMaster, hraMaster, totalEarnings);

  const tdsEnabled = parseBool(source.tdsEnabled, true);
  const calculatedTdsMonthly = taxDetails[taxRegime === 'old' ? 'oldRegime' : 'newRegime'].monthlyTax;
  const tds = tdsEnabled ? (Number(source.deductions?.tds) > 0 ? Number(source.deductions?.tds) : roundAmount(calculatedTdsMonthly)) : 0;

  const manualPT = Number(source.deductions?.professionalTax) || 0;
  const computedPT = (ptEnabled && source.ptState)
    ? getMonthlyPT(source.ptState, totalEarnings, source._month)
    : 0;
  const professionalTax = ptEnabled
    ? (manualPT > 0 ? manualPT : computedPT)
    : 0;
  const otherDeductions = source.deductions?.otherDeductions || source.otherDeductions || source.customDeductions || [];
  const otherDeductionsSum = roundAmount(otherDeductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0));

  const deductionsMap = {};
  let dynamicGrossDeductionsSum = 0;
  let dynamicFlexiDeductionsSum = 0;
  if (hasDynamicComponents) {
    config.salaryComponents.forEach(c => {
      if (c.type === 'deduction') {
        if (!isComponentEnabled(c)) {
          deductionsMap[c.id] = 0;
          return;
        }
        let amount = 0;
        if (c.linkedTo === 'ctc_percent') {
          let pct = c.linkValue;
          const overrideVal = source[c.id + 'Percent'];
          if (overrideVal !== undefined && overrideVal !== null && Number(overrideVal) > 0) {
            pct = Number(overrideVal) > 1 ? Number(overrideVal) / 100 : Number(overrideVal);
          }
          amount = roundAmount(monthlyCTC * pct);
        } else if (c.linkedTo === 'basic_percent') {
          let pct = c.linkValue;
          const overrideVal = source[c.id + 'Percent'];
          if (overrideVal !== undefined && overrideVal !== null && Number(overrideVal) > 0) {
            pct = Number(overrideVal) > 1 ? Number(overrideVal) / 100 : Number(overrideVal);
          }
          amount = roundAmount(basicMaster * pct);
        } else if (c.linkedTo === 'fixed') {
          let val = source[c.id] !== undefined ? source[c.id] : (source.deductions?.[c.id] !== undefined ? source.deductions[c.id] : (source.salaryStructure?.[c.id] !== undefined ? source.salaryStructure[c.id] : (c.linkValue || 0)));
          if (isInsuranceComp(c)) {
            const insOverride = source.insuranceAmount !== undefined ? source.insuranceAmount
              : (source.insurance !== undefined ? source.insurance
              : (source.medical_insurance !== undefined ? source.medical_insurance : undefined));
            if (insOverride !== undefined && insOverride !== null && insOverride !== '') {
              val = insOverride;
            } else if (insOverride === 0 || insOverride === '0' || insOverride === '') {
              val = 0;
            }
          }
          const isLta = c.id === 'lta' || (c.name && c.name.toLowerCase() === 'lta') || (c.name && c.name.toLowerCase().includes('leave travel'));
          if (isLta && (source.lta !== undefined && source.lta !== null && source.lta !== '')) {
            val = source.lta;
          }
          amount = roundAmount(val);
        }
        const isLta = c.id === 'lta' || (c.name && c.name.toLowerCase() === 'lta') || (c.name && c.name.toLowerCase().includes('leave travel'));
        if (isLta) {
          if (!ltaEnabled) {
            amount = 0;
          } else if (ltaCap > 0) {
            amount = roundAmount(Math.min(amount, ltaCap));
          }
        }
        deductionsMap[c.id] = amount;
        if (c.deductFromFlexi === true || c.includeInCTC === true) {
          dynamicFlexiDeductionsSum += amount;
        } else {
          dynamicGrossDeductionsSum += amount;
        }
      }
    });
  }
  if (hasDynamicComponents && ltaComp && ltaComp.type === 'deduction') {
    lta = ltaEnabled ? (deductionsMap[ltaComp.id] || 0) : 0;
  }
  if (!ltaEnabled) {
    lta = 0;
    if (ltaComp) {
      if (earningsMap[ltaComp.id] !== undefined) earningsMap[ltaComp.id] = 0;
      if (deductionsMap[ltaComp.id] !== undefined) deductionsMap[ltaComp.id] = 0;
    }
    if (earningsMap['lta'] !== undefined) earningsMap['lta'] = 0;
    if (deductionsMap['lta'] !== undefined) deductionsMap['lta'] = 0;
  }
  const dynamicDeductionsSum = roundAmount(Object.values(deductionsMap).reduce((sum, v) => sum + v, 0));

  const totalDeductions = roundAmount(
    pfEmployee +
    esiEmployee +
    professionalTax +
    tds +
    lwfEmployee +
    otherDeductionsSum +
    dynamicGrossDeductionsSum
  );

  return {
    config,
    monthlyCTC,
    annualCTC: roundAmount(monthlyCTC * 12),
    basicMaster,
    hraMaster,
    pfBase,
    pfEmployer,
    pfEmployee,
    gratuity,
    lwfEmployer,
    lwfEmployee,
    insurance,
    flexi,
    broadband,
    petrol,
    lta,
    ltaCap,
    employerNPS,
    conveyance,
    medicalAllowance,
    specialAllowance,
    esiApplicable,
    esiEmployer,
    esiEmployee,
    grossSalary,
    monthlyGross: grossSalary,
    totalEarnings,
    totalEmployerContributions: roundAmount(pfEmployer + esiEmployer + gratuity + lwfEmployer + flexiInsuranceAmount + employerNPS + dynamicFlexiDeductionsSum),
    grossTotalSalary: roundAmount(totalEarnings + totalEmployerContributions + dynamicFlexiDeductionsSum),
    totalDeductions,
    dynamicGrossDeductionsSum,
    dynamicFlexiDeductionsSum,
    netTakeHome: roundAmount(Math.max(0, totalEarnings - totalDeductions)),
    diff: roundAmount(monthlyCTC - (
      (hasDynamicComponents
        ? Object.entries(earningsMap).reduce((sum, [id, val]) => {
            const comp = config.salaryComponents?.find(c => c.id === id);
            if (comp && comp.includeInCTC === false) return sum;
            return sum + val;
          }, 0)
        : (basicMaster + hraMaster + flexi + broadband + petrol + lta + conveyance + medicalAllowance + specialAllowance)
      ) +
      pfEmployerInCTC +
      gratuityInCTC +
      lwfEmployer +
      flexiInsuranceAmount +
      esiEmployer +
      employerNPS +
      dynamicFlexiDeductionsSum +
      otherAllowancesSum
    )),
    taxRegime,
    declarations,
    taxDetails,
    tds,
    professionalTax,
    pfEnabled,
    esiEnabled,
    ptEnabled,
    lwfEnabled,
    gratuityEnabled,
    ltaEnabled,
    includePfInCTC,
    includeGratuityInCTC,
    useSalaryComponents: source.useSalaryComponents !== false,
    earningsMap,
    deductionsMap,
    annualBonus: totalAnnualBonus,
    annualBonusInCTC: annualBonusInCTCSum,
    totalAnnualCTC: roundAmount(monthlyCTC * 12 + annualBonusInCTCSum),
    potentialPackage: roundAmount(monthlyCTC * 12 + totalAnnualBonus),
  };
};

export const buildPayrollSnapshot = (employee, configInput, attendance, adjustments = {}, monthNum, yearNum) => {
  const config = normalizePayrollConfig(configInput);
  const year = Number(yearNum) || Number(attendance?.year) || Number(adjustments?.year) || new Date().getFullYear();
  const month = Number(monthNum) || Number(attendance?.month) || Number(adjustments?.month) || (new Date().getMonth() + 1);

  const getYYYYMMDD = (dateVal) => {
    const dateObj = new Date(dateVal);
    if (isNaN(dateObj.getTime())) return '';
    const y = dateObj.getUTCFullYear();
    const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getEmployeeParamsForDate = (dateStr) => {
    const revisions = [...(employee.salaryRevisions || [])].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));
    if (revisions.length === 0) {
      return employee;
    }
    const latestRevision = revisions[revisions.length - 1];
    const latestRevDateStr = getYYYYMMDD(latestRevision.effectiveDate);
    if (dateStr >= latestRevDateStr) {
      return employee;
    }
    let activeRevision = null;
    for (let i = revisions.length - 1; i >= 0; i--) {
      const revDateStr = getYYYYMMDD(revisions[i].effectiveDate);
      if (revDateStr && revDateStr <= dateStr) {
        activeRevision = revisions[i];
        break;
      }
    }
    if (!activeRevision) {
      activeRevision = revisions[0];
    }

    const getVal = (field, def) => {
      if (activeRevision && activeRevision[field] !== undefined && activeRevision[field] !== null) {
        return activeRevision[field];
      }
      if (employee[field] !== undefined && employee[field] !== null) {
        return employee[field];
      }
      return def;
    };

    const getDeductionVal = (field, def) => {
      if (activeRevision && activeRevision.deductions && activeRevision.deductions[field] !== undefined && activeRevision.deductions[field] !== null) {
        return activeRevision.deductions[field];
      }
      if (employee.deductions && employee.deductions[field] !== undefined && employee.deductions[field] !== null) {
        return employee.deductions[field];
      }
      return def;
    };

    const getStructureVal = (field, def) => {
      if (activeRevision && activeRevision.salaryStructure && activeRevision.salaryStructure[field] !== undefined && activeRevision.salaryStructure[field] !== null) {
        return activeRevision.salaryStructure[field];
      }
      if (employee.salaryStructure && employee.salaryStructure[field] !== undefined && employee.salaryStructure[field] !== null) {
        return employee.salaryStructure[field];
      }
      return def;
    };

    let monthlyCTC = Number(activeRevision.newCTC) || Number(activeRevision.monthlyCTC) || 0;
    if (!monthlyCTC && activeRevision === revisions[0]) {
      monthlyCTC = Number(revisions[0].previousCTC) || Number(employee.monthlyCTC) || 0;
    }

    return {
      monthlyCTC,
      employmentType: getVal('employmentType', 'full-time'),
      payType: getVal('payType', 'salaried'),
      hourlyRate: getVal('hourlyRate', 0),
      pfEnabled: getVal('pfEnabled', true),
      esiEnabled: getVal('esiEnabled', true),
      ptEnabled: getVal('ptEnabled', true),
      lwfEnabled: getVal('lwfEnabled', true),
      gratuityEnabled: getVal('gratuityEnabled', true),
      includePfInCTC: getVal('includePfInCTC', false),
      includeGratuityInCTC: getVal('includeGratuityInCTC', true),
      basicPercent: getVal('basicPercent', null),
      hraPercent: getVal('hraPercent', null),
      useSalaryComponents: getVal('useSalaryComponents', true),
      joiningBonus: getVal('joiningBonus', 0),
      flexiAmount: getVal('flexiAmount', 0),
      broadband: getVal('broadband', 0),
      petrol: getVal('petrol', 0),
      lta: getVal('lta', 0),
      employerNPS: getVal('employerNPS', 0),
      insuranceAmount: getVal('insuranceAmount', 0),
      deductions: {
        tds: getDeductionVal('tds', 0),
        professionalTax: getDeductionVal('professionalTax', 0),
        otherDeductions: getDeductionVal('otherDeductions', []),
      },
      salaryStructure: {
        conveyance: getStructureVal('conveyance', 0),
        medicalAllowance: getStructureVal('medicalAllowance', 0),
        otherAllowances: getStructureVal('otherAllowances', []),
      },
    };
  };

  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const dailyStructures = [];
  const dailyOtherAllowances = [];
  const dailyOtherDeductions = [];

  const isHourly = employee.payType === 'hourly';
  const hoursWorked = isHourly ? (Number(attendance?.hoursWorked) || Number(adjustments?.hoursWorked) || Number(employee.hoursWorked) || 0) : 0;

  for (let d = 1; d <= totalDaysInMonth; d++) {
    const currentStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const activeParams = getEmployeeParamsForDate(currentStr);
    
    const daySource = {
      ...activeParams,
      hoursWorked: isHourly ? hoursWorked : undefined,
      pfEnabled: adjustments.pfEnabled !== undefined ? adjustments.pfEnabled : activeParams.pfEnabled,
      esiEnabled: adjustments.esiEnabled !== undefined ? adjustments.esiEnabled : activeParams.esiEnabled,
      ptEnabled: adjustments.ptEnabled !== undefined ? adjustments.ptEnabled : activeParams.ptEnabled,
      lwfEnabled: adjustments.lwfEnabled !== undefined ? adjustments.lwfEnabled : activeParams.lwfEnabled,
      gratuityEnabled: adjustments.gratuityEnabled !== undefined ? adjustments.gratuityEnabled : activeParams.gratuityEnabled,
      includePfInCTC: adjustments.includePfInCTC !== undefined ? adjustments.includePfInCTC : activeParams.includePfInCTC,
      includeGratuityInCTC: adjustments.includeGratuityInCTC !== undefined ? adjustments.includeGratuityInCTC : activeParams.includeGratuityInCTC,
      basicPercent: adjustments.basicPercent !== undefined && adjustments.basicPercent !== null ? adjustments.basicPercent : activeParams.basicPercent,
      hraPercent: adjustments.hraPercent !== undefined && adjustments.hraPercent !== null ? adjustments.hraPercent : activeParams.hraPercent,
    };

    const dayMaster = buildMasterSalaryStructure(daySource, config);
    dailyStructures.push(dayMaster);
    dailyOtherAllowances.push(daySource.salaryStructure?.otherAllowances || []);
    dailyOtherDeductions.push(daySource.deductions?.otherDeductions || []);
  }

  const master = {};
  const sample = dailyStructures[0] || {};
  for (const [key, val] of Object.entries(sample)) {
    if (typeof val === 'number') {
      let sum = 0;
      for (const ds of dailyStructures) {
        sum += ds[key] || 0;
      }
      master[key] = roundAmount(sum / totalDaysInMonth);
    } else if (typeof val === 'boolean') {
      master[key] = dailyStructures[dailyStructures.length - 1][key];
    } else {
      master[key] = val;
    }
  }

  const averagedEarningsMap = {};
  for (const ds of dailyStructures) {
    if (ds.earningsMap) {
      for (const [key, val] of Object.entries(ds.earningsMap)) {
        averagedEarningsMap[key] = (averagedEarningsMap[key] || 0) + val;
      }
    }
  }
  for (const key of Object.keys(averagedEarningsMap)) {
    averagedEarningsMap[key] = roundAmount(averagedEarningsMap[key] / totalDaysInMonth);
  }
  master.earningsMap = averagedEarningsMap;

  const allowanceMap = {};
  for (let i = 0; i < totalDaysInMonth; i++) {
    const list = dailyOtherAllowances[i] || [];
    for (const item of list) {
      if (item.name) {
        allowanceMap[item.name] = (allowanceMap[item.name] || 0) + (Number(item.amount) || 0) / totalDaysInMonth;
      }
    }
  }
  const averagedOtherAllowances = Object.entries(allowanceMap).map(([name, amount]) => ({
    name,
    amount: roundAmount(amount)
  }));

  const deductionMap = {};
  for (let i = 0; i < totalDaysInMonth; i++) {
    const list = dailyOtherDeductions[i] || [];
    for (const item of list) {
      if (item.name) {
        deductionMap[item.name] = (deductionMap[item.name] || 0) + (Number(item.amount) || 0) / totalDaysInMonth;
      }
    }
  }
  const averagedOtherDeductions = Object.entries(deductionMap).map(([name, amount]) => ({
    name,
    amount: roundAmount(amount)
  }));

  const workingDays = Math.max(Number(attendance?.workingDays) || config.defaultWorkingDays, 1);
  const rawPaidDays = isHourly ? workingDays : Number(attendance?.paidDays ?? attendance?.presentDays ?? workingDays);
  const paidDays = isHourly ? workingDays : Math.max(Math.min(rawPaidDays || workingDays, workingDays), 0);

  const segments = [];
  let currentSegment = null;

  for (let d = 1; d <= totalDaysInMonth; d++) {
    const currentStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const activeParams = getEmployeeParamsForDate(currentStr);
    const key = `${activeParams.monthlyCTC}-${activeParams.pfEnabled}-${activeParams.esiEnabled}-${activeParams.gratuityEnabled}`;

    if (!currentSegment || currentSegment.key !== key) {
      if (currentSegment) {
        segments.push(currentSegment);
      }
      currentSegment = {
        key,
        startDay: d,
        endDay: d,
        activeParams,
        daysCount: 1
      };
    } else {
      currentSegment.endDay = d;
      currentSegment.daysCount += 1;
    }
  }
  if (currentSegment) {
    segments.push(currentSegment);
  }

  const lopStrategy = adjustments.lopStrategy || 'proportional';
  const customSegmentLops = adjustments.segmentLops || [];
  const dayProrate = isHourly
    ? new Array(totalDaysInMonth).fill(1.0)
    : getDayProrateArray(totalDaysInMonth, workingDays, paidDays, lopStrategy, customSegmentLops, segments);

  let otherEarnings = [];
  if (Array.isArray(adjustments.otherEarnings) && adjustments.otherEarnings.length > 0) {
    otherEarnings = adjustments.otherEarnings.map(item => ({
      name: item.name,
      amount: roundAmount(item.amount)
    }));
  } else {
    const otherEarningsMap = {};
    for (let d = 0; d < totalDaysInMonth; d++) {
      const list = dailyOtherAllowances[d] || [];
      for (const item of list) {
        if (item.name) {
          otherEarningsMap[item.name] = (otherEarningsMap[item.name] || 0) + (Number(item.amount) || 0) * dayProrate[d] / totalDaysInMonth;
        }
      }
    }
    otherEarnings = Object.entries(otherEarningsMap).map(([name, amount]) => ({
      name,
      amount: roundAmount(amount)
    }));
  }

  let otherDeductions = [];
  if (Array.isArray(adjustments.otherDeductions) && adjustments.otherDeductions.length > 0) {
    otherDeductions = adjustments.otherDeductions.map(item => ({
      name: item.name,
      amount: roundAmount(item.amount)
    }));
  } else {
    otherDeductions = averagedOtherDeductions.map(item => ({
      name: item.name,
      amount: roundAmount(Number(item.amount) || 0)
    }));
  }

  const isMatchingFrequency = (freq, mNum) => {
    if (!freq || freq === 'monthly') return true;
    const m = Number(mNum) || Number(attendance?.month) || Number(adjustments?.month) || (new Date().getMonth() + 1);
    if (freq === 'quarterly') return m % 3 === 0;
    if (freq === 'semi_annually') return m % 6 === 0;
    if (freq === 'annually') return m % 12 === 0;
    return true;
  };

  const hasDynamicComponents = config.salaryComponents && config.salaryComponents.length > 0;
  let earnings = {};

  if (hasDynamicComponents) {
    earnings = {
      otherEarnings: [...otherEarnings],
      overtime: roundAmount(adjustments.overtime),
    };
    config.salaryComponents.forEach(c => {
      if (c.type === 'earning') {
        let sumEarningVal = 0;
        for (let d = 0; d < totalDaysInMonth; d++) {
          const ds = dailyStructures[d];
          const dailyVal = ds.earningsMap?.[c.id] ?? ds[c.id] ?? 0;
          sumEarningVal += (dailyVal / totalDaysInMonth) * dayProrate[d];
        }
        let proratedVal = roundAmount(sumEarningVal);
        if (!isMatchingFrequency(c.frequency, monthNum)) {
          proratedVal = 0;
        }
        earnings[c.id] = proratedVal;
        
        if (c.id === 'basic') earnings.basic = proratedVal;
        else if (c.id === 'hra') earnings.hra = proratedVal;
        else if (c.id === 'flexi') earnings.flexiAmount = proratedVal;
        else if (c.id === 'broadband') earnings.broadband = proratedVal;
        else if (c.id === 'petrol') earnings.petrol = proratedVal;
        else if (c.id === 'lta') earnings.lta = proratedVal;
        else if (c.id === 'special') earnings.specialAllowance = proratedVal;
        else if (c.id === 'conveyance') earnings.conveyance = proratedVal;
        else if (c.id === 'medical') earnings.medicalAllowance = proratedVal;
        else {
          const name = c.name || c.id;
          const adjustedIndex = earnings.otherEarnings.findIndex(x => x.name === name);
          if (adjustedIndex === -1) {
            earnings.otherEarnings.push({ name, amount: proratedVal });
          }
        }
      }
    });

    earnings.totalEarnings = roundAmount(
      config.salaryComponents
        .filter(c => c.type === 'earning')
        .reduce((sum, c) => {
          const standardEarningIds = ['basic', 'hra', 'flexi', 'broadband', 'petrol', 'lta', 'special', 'conveyance', 'medical'];
          if (!standardEarningIds.includes(c.id)) return sum;
          return sum + (earnings[c.id] || 0);
        }, 0) +
      earnings.overtime +
      sumNamedAmounts(earnings.otherEarnings)
    );
  } else {
    const sumDailyComponent = (compField) => {
      let sum = 0;
      for (let d = 0; d < totalDaysInMonth; d++) {
        sum += (dailyStructures[d][compField] / totalDaysInMonth) * dayProrate[d];
      }
      return roundAmount(sum);
    };

    earnings = {
      basic: sumDailyComponent('basicMaster'),
      hra: sumDailyComponent('hraMaster'),
      flexiAmount: sumDailyComponent('flexi'),
      broadband: sumDailyComponent('broadband'),
      petrol: sumDailyComponent('petrol'),
      lta: sumDailyComponent('lta'),
      specialAllowance: sumDailyComponent('specialAllowance'),
      overtime: roundAmount(adjustments.overtime),
      conveyance: sumDailyComponent('conveyance'),
      medicalAllowance: sumDailyComponent('medicalAllowance'),
      otherEarnings,
    };
    earnings.totalEarnings = roundAmount(
      Object.values(earnings).filter((value) => typeof value === 'number').reduce((sum, value) => sum + value, 0) +
      sumNamedAmounts(earnings.otherEarnings)
    );
  }

  let sumPfEmployee = 0;
  let sumPfEmployer = 0;
  let sumEsiEmployee = 0;
  let sumEsiEmployer = 0;
  let sumGratuity = 0;
  for (let d = 0; d < totalDaysInMonth; d++) {
    const ds = dailyStructures[d];
    const dP = dayProrate[d];
    sumPfEmployee += (ds.pfEmployee / totalDaysInMonth) * dP;
    sumPfEmployer += (ds.pfEmployer / totalDaysInMonth) * dP;
    sumEsiEmployee += (ds.esiEmployee / totalDaysInMonth) * dP;
    sumEsiEmployer += (ds.esiEmployer / totalDaysInMonth) * dP;
    sumGratuity += (ds.gratuity / totalDaysInMonth) * dP;
  }

  const pfEmployee = roundAmount(sumPfEmployee);
  const pfEmployer = roundAmount(sumPfEmployer);
  const esiEmployee = roundAmount(sumEsiEmployee);
  const esiEmployer = roundAmount(sumEsiEmployer);
  const gratuity = roundAmount(sumGratuity);

  const professionalTax = master.professionalTax;
  const lwfEmployee = master.lwfEmployee;
  const lwfEmployer = master.lwfEmployer;

  const deductions = {
    pfEmployee,
    esiEmployee,
    professionalTax,
    tds: master.tds,
    lwfEmployee,
    otherDeductions,
    totalDeductions: roundAmount(
      pfEmployee + esiEmployee + professionalTax + master.tds + lwfEmployee + sumNamedAmounts(otherDeductions)
    ),
  };

  const employerContributions = {
    pfEmployer,
    esiEmployer,
    gratuity,
    lwfEmployer,
    insurance: master.insurance,
    employerNPS: master.employerNPS,
    totalEmployerContributions: roundAmount(
      pfEmployer + esiEmployer + gratuity + lwfEmployer + master.insurance + master.employerNPS
    ),
  };

  const netSalary = roundAmount(Math.max(0, earnings.totalEarnings - deductions.totalDeductions));

  return {
    snapshotVersion: '1.0',
    generatedAt: new Date().toISOString(),
    employeeId: employee._id || employee.id,
    month,
    year,
    workingDays,
    paidDays,
    lopDays: Math.max(0, workingDays - paidDays),
    prorationRatio: roundAmount(workingDays > 0 ? paidDays / workingDays : 1.0),
    earnings,
    deductions,
    employerContributions,
    grossSalary: earnings.totalEarnings,
    netSalary,
    masterStructure: master,
  };
};

export const processMonthlyPayroll = (employee, configInput, attendance, adjustments = {}) => {
  const snapshot = buildPayrollSnapshot(employee, configInput, attendance, adjustments);
  return {
    basic: snapshot.earnings.basic,
    hra: snapshot.earnings.hra,
    specialAllowance: snapshot.earnings.specialAllowance,
    grossSalary: snapshot.grossSalary,
    totalEarnings: snapshot.earnings.totalEarnings,
    pfEmployee: snapshot.deductions.pfEmployee,
    pfEmployer: snapshot.employerContributions.pfEmployer,
    esiEmployee: snapshot.deductions.esiEmployee,
    esiEmployer: snapshot.employerContributions.esiEmployer,
    professionalTax: snapshot.deductions.professionalTax,
    tds: snapshot.deductions.tds,
    lwfEmployee: snapshot.deductions.lwfEmployee,
    lwfEmployer: snapshot.employerContributions.lwfEmployer,
    gratuity: snapshot.employerContributions.gratuity,
    totalDeductions: snapshot.deductions.totalDeductions,
    netSalary: snapshot.netSalary,
  };
};
