import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Download, Loader2, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import PayrollSettings from './settings/PayrollSettings';
import { buildPayrollSnapshot, buildMasterSalaryStructure, DEFAULT_PAYROLL_CONFIG, fmtMoney } from '../utils/payroll';

const toAnnual = (value) => (Number(value) || 0) * 12;

const SALARY_TEMPLATES = {
  custom: {
    name: 'Custom Structure',
    flexiAmount: 0,
    broadband: 0,
    petrol: 0,
    lta: 0,
    insuranceAmount: 0,
    pfEnabled: true,
    esiEnabled: true,
    ptEnabled: true,
    lwfEnabled: true,
    gratuityEnabled: true,
    includePfInCTC: false,
    includeGratuityInCTC: true,
    ptState: 'custom',
    professionalTax: 0,
  },
  sde: {
    name: 'SDE (High Flexi & Tech)',
    flexiAmount: 15000,
    broadband: 2000,
    petrol: 3000,
    lta: 5000,
    insuranceAmount: 0,
    pfEnabled: true,
    esiEnabled: false,
    ptEnabled: true,
    lwfEnabled: true,
    gratuityEnabled: true,
    includePfInCTC: false,
    includeGratuityInCTC: true,
    ptState: 'KA',
    professionalTax: 200,
  },
  sales: {
    name: 'Sales (High Petrol & Incentives)',
    flexiAmount: 5000,
    broadband: 1000,
    petrol: 12000,
    lta: 2000,
    insuranceAmount: 0,
    pfEnabled: true,
    esiEnabled: true,
    ptEnabled: true,
    lwfEnabled: true,
    gratuityEnabled: true,
    includePfInCTC: false,
    includeGratuityInCTC: true,
    ptState: 'MH',
    professionalTax: 200,
  },
  operations: {
    name: 'Operations (Standard)',
    flexiAmount: 2000,
    broadband: 1000,
    petrol: 2000,
    lta: 1500,
    insuranceAmount: 0,
    pfEnabled: true,
    esiEnabled: true,
    ptEnabled: true,
    lwfEnabled: true,
    gratuityEnabled: true,
    includePfInCTC: false,
    includeGratuityInCTC: true,
    ptState: 'WB',
    professionalTax: 200,
  }
};

const SalaryCalculator = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles?.some(role => ['Admin', 'Super Admin', 'System Admin'].includes(role))
    || user?.permissions?.includes('*');
  const canManageConfig = isAdmin || user?.permissions?.includes('payroll.config.manage');

  const [config, setConfig] = useState(DEFAULT_PAYROLL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('ctc'); // 'ctc' | 'controls' | 'bonuses' | 'tax' | 'settings'
  
  const [form, setForm] = useState({
    payType: 'salaried',
    hourlyRate: 0,
    hoursWorked: 160,
    flatSalary: 0,
    annualCTC: 0,
    monthlyCTC: 0,
    flexiAmount: 0,
    broadband: 0,
    petrol: 0,
    lta: 0,
    insuranceAmount: 0,
    employerNPS: 0,
    pfEnabled: true,
    esiEnabled: true,
    ptEnabled: true,
    lwfEnabled: true,
    gratuityEnabled: true,
    includePfInCTC: false,
    includeGratuityInCTC: true,
    ptState: 'custom',
    professionalTax: 0,
    joiningBonus: 0,
    performanceBonus: 0,
    specialBonus: 0,
    retentionBonus: 0,
    incentive: 0,
    arrear: 0,
    referralBonus: 0,
    remarks: '',
    salaryTemplate: 'custom',
    taxRegime: 'new',
    section80C: 0,
    section80D: 0,
    section24b: 0,
    section80CCD1B: 0,
    rentPaidMonthly: 0,
    isMetroCity: false,
    otherExemptions: 0,
  });

  const [serverResult, setServerResult] = useState(null);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/payroll/config');
      const newConfig = { ...DEFAULT_PAYROLL_CONFIG, ...(res.data || {}) };
      setConfig(newConfig);

      // Purge stale form keys for components that were removed from settings
      if (newConfig.salaryComponents && newConfig.salaryComponents.length > 0) {
        const validIds = new Set(newConfig.salaryComponents.map(c => c.id));
        setForm(prev => {
          const cleaned = { ...prev };
          // Remove any per-component keys that no longer exist in config
          Object.keys(cleaned).forEach(key => {
            // Only prune keys that look like component ids (not core form fields)
            const coreKeys = new Set([
              'payType', 'hourlyRate', 'hoursWorked', 'annualCTC', 'monthlyCTC',
              'flexiAmount', 'broadband', 'petrol', 'lta', 'insuranceAmount', 'employerNPS',
              'pfEnabled', 'esiEnabled', 'ptEnabled', 'lwfEnabled', 'gratuityEnabled',
              'includePfInCTC', 'includeGratuityInCTC', 'ptState', 'professionalTax',
              'joiningBonus', 'performanceBonus', 'specialBonus', 'retentionBonus',
              'incentive', 'arrear', 'referralBonus', 'remarks', 'salaryTemplate',
              'taxRegime', 'section80C', 'section80D', 'section24b', 'section80CCD1B',
              'rentPaidMonthly', 'isMetroCity', 'otherExemptions'
            ]);
            if (!coreKeys.has(key) && !validIds.has(key)) {
              delete cleaned[key];
            }
          });
          return cleaned;
        });
      }

      setForm(prev => {
        const nextForm = { ...prev };
        if (nextForm.insuranceAmount === 0 && newConfig.defaultInsurance) {
          nextForm.insuranceAmount = newConfig.defaultInsurance;
        }

        if (newConfig.salaryComponents) {
          newConfig.salaryComponents.forEach(c => {
            if (c.linkedTo === 'fixed' && c.linkValue !== undefined && c.linkValue !== null) {
              if (nextForm[c.id] === undefined || nextForm[c.id] === 0) {
                nextForm[c.id] = Number(c.linkValue) || 0;
                if (c.id === 'flexi') nextForm.flexiAmount = Number(c.linkValue) || 0;
                if (c.id === 'broadband') nextForm.broadband = Number(c.linkValue) || 0;
                if (c.id === 'petrol') nextForm.petrol = Number(c.linkValue) || 0;
                if (c.id === 'lta') nextForm.lta = Number(c.linkValue) || 0;
              }
            }
          });
        }
        return nextForm;
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const monthlyCTC = Number(form.monthlyCTC) || 0;

  const localSource = useMemo(() => {
    const src = {
      monthlyCTC,
      payType: form.payType || 'salaried',
      hourlyRate: Number(form.hourlyRate) || 0,
      hoursWorked: Number(form.hoursWorked) || 160,
      flatSalary: Number(form.flatSalary) || 0,
      insuranceAmount: Number(form.insuranceAmount) || 0,
      employerNPS: Number(form.employerNPS) || 0,
      taxRegime: form.taxRegime,
      pfEnabled: form.pfEnabled,
      esiEnabled: form.esiEnabled,
      ptEnabled: form.ptEnabled,
      lwfEnabled: form.lwfEnabled,
      gratuityEnabled: form.gratuityEnabled,
      includePfInCTC: form.includePfInCTC,
      includeGratuityInCTC: form.includeGratuityInCTC,
      deductions: {
        professionalTax: form.ptEnabled ? (Number(form.professionalTax) || 0) : 0,
      },
      declarations: {
        section80C: Number(form.section80C) || 0,
        section80D: Number(form.section80D) || 0,
        section24b: Number(form.section24b) || 0,
        section80CCD1B: Number(form.section80CCD1B) || 0,
        rentPaidMonthly: Number(form.rentPaidMonthly) || 0,
        isMetroCity: form.isMetroCity,
        otherExemptions: Number(form.otherExemptions) || 0,
      }
    };

    const fixedComps = (config?.salaryComponents || [
      { id: 'flexi', name: 'Flexi Allowance', linkedTo: 'fixed' },
      { id: 'broadband', name: 'Broadband', linkedTo: 'fixed' },
      { id: 'petrol', name: 'Petrol', linkedTo: 'fixed' },
      { id: 'lta', name: 'LTA', linkedTo: 'fixed' },
      { id: 'conveyance', name: 'Conveyance', linkedTo: 'fixed' },
      { id: 'medical', name: 'Medical Allowance', linkedTo: 'fixed' }
    ]).filter(c => c.linkedTo === 'fixed' && c.id !== 'basic' && c.id !== 'hra');

    fixedComps.forEach(c => {
      let val = 0;
      if (form[c.id] !== undefined) val = Number(form[c.id]);
      else if (c.id === 'flexi') val = Number(form.flexiAmount) || 0;
      else if (c.id === 'broadband') val = Number(form.broadband) || 0;
      else if (c.id === 'petrol') val = Number(form.petrol) || 0;
      else if (c.id === 'lta') val = Number(form.lta) || 0;
      src[c.id] = val;

      if (c.id === 'flexi') src.flexiAmount = val;
      if (c.id === 'broadband') src.broadband = val;
      if (c.id === 'petrol') src.petrol = val;
      if (c.id === 'lta') src.lta = val;
    });

    return src;
  }, [
    monthlyCTC, form, config
  ]);

  const localMaster = useMemo(() => buildMasterSalaryStructure(localSource, config), [localSource, config]);
  
  const localPayroll = useMemo(() => buildPayrollSnapshot(localSource, config, {
    workingDays: config.defaultWorkingDays,
    paidDays: config.defaultWorkingDays,
  }, {
    joiningBonus: Number(form.joiningBonus) || 0,
    performanceBonus: Number(form.performanceBonus) || 0,
    specialBonus: Number(form.specialBonus) || 0,
    retentionBonus: Number(form.retentionBonus) || 0,
    incentive: Number(form.incentive) || 0,
    arrear: Number(form.arrear) || 0,
    referralBonus: Number(form.referralBonus) || 0,
  }, new Date().getMonth() + 1, new Date().getFullYear()), [localSource, config, form.joiningBonus, form.performanceBonus, form.specialBonus, form.retentionBonus, form.incentive, form.arrear, form.referralBonus]);

  const result = serverResult || { master: localMaster, payroll: localPayroll, monthlyCTC: localMaster.monthlyCTC, annualCTC: localMaster.annualCTC };

  const earningsBreakdownRows = useMemo(() => {
    const getEarningValue = (cId) => {
      if (result.master?.earningsMap && result.master.earningsMap[cId] !== undefined) {
        return result.master.earningsMap[cId];
      }
      if (cId === 'basic') return result.master?.basicMaster || 0;
      if (cId === 'hra') return result.master?.hraMaster || 0;
      if (cId === 'special') return result.master?.specialAllowance || 0;
      if (cId === 'flexi') return result.master?.flexi || 0;
      if (cId === 'broadband') return result.master?.broadband || 0;
      if (cId === 'petrol') return result.master?.petrol || 0;
      if (cId === 'lta') return result.master?.lta || 0;
      if (cId === 'conveyance') return result.master?.conveyance || 0;
      if (cId === 'medical') return result.master?.medicalAllowance || 0;
      return 0;
    };

    const comps = config?.salaryComponents && config.salaryComponents.length > 0
      ? config.salaryComponents
      : [
          { id: 'basic', name: 'Basic Salary', type: 'earning' },
          { id: 'hra', name: 'House Rent Allowance (HRA)', type: 'earning' },
          { id: 'special', name: 'Special Allowance (Balancing Component)', type: 'earning' },
          { id: 'flexi', name: 'Flexi Benefits Wallet', type: 'earning' },
          { id: 'broadband', name: 'Broadband Allowance', type: 'earning' },
          { id: 'petrol', name: 'Petrol Reimbursement', type: 'earning' },
          { id: 'lta', name: 'Leave Travel Allowance (LTA)', type: 'earning' },
          { id: 'conveyance', name: 'Conveyance Allowance', type: 'earning' },
          { id: 'medical', name: 'Medical Allowance', type: 'earning' }
        ];

    const list = comps
      .filter(c => c.type === 'earning')
      .map(c => {
        const val = getEarningValue(c.id);
        let name = c.name || c.id;
        if (form.payType === 'hourly' && c.id === 'basic') {
          name = 'Contract Wages (Hourly)';
        }
        if (form.payType === 'flat' && c.id === 'basic') {
          name = 'Flat Salary';
        }
        return { id: c.id, name, val };
      })
      .filter(r => {
        if (form.payType === 'hourly') {
          return r.val > 0;
        }
        if (form.payType === 'flat') {
          return r.id === 'basic';
        }
        return r.id === 'basic' || r.id === 'hra' || r.val > 0;
      })
      .map(r => [r.name, r.val]);

    return [
      ...list,
      ['Total Gross Earnings', result.payroll?.earnings?.totalEarnings || 0]
    ];
  }, [result.master, result.payroll, config, form.payType]);

  const comparison = useMemo(() => {
    if (!result.master || !result.payroll) return null;

    const grossTotalPay = (result.payroll.earnings?.totalEarnings || 0) + (result.payroll.variablePay?.totalVariablePay || 0);
    const baseDeductions = (result.payroll.deductions?.totalDeductions || 0) - (result.payroll.deductions?.tds || 0);

    const taxDetails = result.master.taxDetails || {};
    const newRegimeTax = taxDetails.newRegime || {};
    const oldRegimeTax = taxDetails.oldRegime || {};

    const takeHomeNew = Math.max(0, grossTotalPay - (baseDeductions + (newRegimeTax.monthlyTax || 0)));
    const takeHomeOld = Math.max(0, grossTotalPay - (baseDeductions + (oldRegimeTax.monthlyTax || 0)));

    const savings = Math.abs(takeHomeNew - takeHomeOld);
    const recommended = takeHomeNew > takeHomeOld ? 'new' : takeHomeNew < takeHomeOld ? 'old' : 'equal';

    return {
      newRegime: {
        standardDeduction: newRegimeTax.standardDeduction || 75000,
        otherDeductions: 0,
        netTaxableIncome: newRegimeTax.netTaxableIncome || 0,
        annualTax: newRegimeTax.annualTax || 0,
        monthlyTax: newRegimeTax.monthlyTax || 0,
        monthlyTakeHome: takeHomeNew,
      },
      oldRegime: {
        standardDeduction: oldRegimeTax.standardDeduction || 50000,
        otherDeductions: oldRegimeTax.totalDeductions ? (oldRegimeTax.totalDeductions - oldRegimeTax.standardDeduction) : 0,
        netTaxableIncome: oldRegimeTax.netTaxableIncome || 0,
        annualTax: oldRegimeTax.annualTax || 0,
        monthlyTax: oldRegimeTax.monthlyTax || 0,
        monthlyTakeHome: takeHomeOld,
      },
      recommended,
      savings,
    };
  }, [result]);

  const handleTemplateChange = (templateKey) => {
    const template = SALARY_TEMPLATES[templateKey];
    if (!template) return;
    setForm((prev) => ({
      ...prev,
      ...template,
      salaryTemplate: templateKey,
    }));
    toast.success(`Loaded ${template.name} preset`);
  };

  const handlePtStateChange = (stateCode) => {
    let ptVal = 0;
    let enabled = true;
    if (stateCode === 'MH' || stateCode === 'KA' || stateCode === 'TN' || stateCode === 'WB') {
      ptVal = 200;
      enabled = true;
    } else if (stateCode === 'none') {
      ptVal = 0;
      enabled = false;
    } else {
      ptVal = form.professionalTax || 0;
      enabled = true;
    }
    setForm((prev) => ({
      ...prev,
      ptState: stateCode,
      ptEnabled: enabled,
      professionalTax: ptVal
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        payType: form.payType || 'salaried',
        hourlyRate: Number(form.hourlyRate) || 0,
        hoursWorked: Number(form.hoursWorked) || 160,
        flatSalary: Number(form.flatSalary) || 0,
        monthlyCTC: Number(form.monthlyCTC) || 0,
        annualCTC: Number(form.annualCTC) || 0,
        insuranceAmount: Number(form.insuranceAmount) || 0,
        employerNPS: Number(form.employerNPS) || 0,
        pfEnabled: form.pfEnabled,
        esiEnabled: form.esiEnabled,
        ptEnabled: form.ptEnabled,
        lwfEnabled: form.lwfEnabled,
        gratuityEnabled: form.gratuityEnabled,
        includePfInCTC: form.includePfInCTC,
        includeGratuityInCTC: form.includeGratuityInCTC,
        professionalTax: form.ptEnabled ? Number(form.professionalTax) : 0,
        joiningBonus: Number(form.joiningBonus) || 0,
        performanceBonus: Number(form.performanceBonus) || 0,
        specialBonus: Number(form.specialBonus) || 0,
        retentionBonus: Number(form.retentionBonus) || 0,
        incentive: Number(form.incentive) || 0,
        arrear: Number(form.arrear) || 0,
        referralBonus: Number(form.referralBonus) || 0,
        remarks: form.remarks,
        taxRegime: form.taxRegime,
        declarations: {
          section80C: Number(form.section80C) || 0,
          section80D: Number(form.section80D) || 0,
          section24b: Number(form.section24b) || 0,
          section80CCD1B: Number(form.section80CCD1B) || 0,
          rentPaidMonthly: Number(form.rentPaidMonthly) || 0,
          isMetroCity: form.isMetroCity,
          otherExemptions: Number(form.otherExemptions) || 0,
        }
      };

      const fixedComps = (config?.salaryComponents || [
        { id: 'flexi', name: 'Flexi Allowance', linkedTo: 'fixed' },
        { id: 'broadband', name: 'Broadband', linkedTo: 'fixed' },
        { id: 'petrol', name: 'Petrol', linkedTo: 'fixed' },
        { id: 'lta', name: 'LTA', linkedTo: 'fixed' },
        { id: 'conveyance', name: 'Conveyance', linkedTo: 'fixed' },
        { id: 'medical', name: 'Medical Allowance', linkedTo: 'fixed' }
      ]).filter(c => c.linkedTo === 'fixed' && c.id !== 'basic' && c.id !== 'hra');

      fixedComps.forEach(c => {
        let val = 0;
        if (form[c.id] !== undefined) val = Number(form[c.id]);
        else if (c.id === 'flexi') val = Number(form.flexiAmount) || 0;
        else if (c.id === 'broadband') val = Number(form.broadband) || 0;
        else if (c.id === 'petrol') val = Number(form.petrol) || 0;
        else if (c.id === 'lta') val = Number(form.lta) || 0;
        payload[c.id] = val;

        if (c.id === 'flexi') payload.flexiAmount = val;
        if (c.id === 'broadband') payload.broadband = val;
        if (c.id === 'petrol') payload.petrol = val;
        if (c.id === 'lta') payload.lta = val;
      });
      
      const res = await api.post('/payroll/calculate-salary', payload);
      setServerResult(res.data);
      toast.success('Calculations validated by server');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Using local simulation calculations');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadBreakup = () => {
    if (!result || !result.master) return;

    const data = [
      ['SIMULATED SALARY BREAKUP / CTC STRUCTURE', ''],
      ['Target Tax Regime', form.taxRegime === 'old' ? 'Old Regime' : 'New Regime'],
      ['Annual CTC Input', `₹${(form.annualCTC).toLocaleString('en-IN')}/yr`],
      ['Monthly CTC Input', `₹${(form.monthlyCTC).toLocaleString('en-IN')}/mo`],
      ['', ''],
      ['SALARY COMPONENTS', 'Monthly (INR)', 'Annual (INR)'],
    ];

    const comps = config?.salaryComponents && config.salaryComponents.length > 0
      ? config.salaryComponents
      : [
          { id: 'basic', name: 'Basic Salary', type: 'earning' },
          { id: 'hra', name: 'House Rent Allowance (HRA)', type: 'earning' },
          { id: 'special', name: 'Special Allowance (Balancing Component)', type: 'earning' },
          { id: 'flexi', name: 'Flexi Benefits Wallet', type: 'earning' },
          { id: 'broadband', name: 'Broadband Allowance', type: 'earning' },
          { id: 'petrol', name: 'Petrol Reimbursement', type: 'earning' },
          { id: 'lta', name: 'Leave Travel Allowance (LTA)', type: 'earning' },
          { id: 'conveyance', name: 'Conveyance Allowance', type: 'earning' },
          { id: 'medical', name: 'Medical Allowance', type: 'earning' }
        ];

    const getEarningValue = (cId) => {
      if (result.master?.earningsMap && result.master.earningsMap[cId] !== undefined) {
        return result.master.earningsMap[cId];
      }
      if (cId === 'basic') return result.master?.basicMaster || 0;
      if (cId === 'hra') return result.master?.hraMaster || 0;
      if (cId === 'special') return result.master?.specialAllowance || 0;
      if (cId === 'flexi') return result.master?.flexi || 0;
      if (cId === 'broadband') return result.master?.broadband || 0;
      if (cId === 'petrol') return result.master?.petrol || 0;
      if (cId === 'lta') return result.master?.lta || 0;
      if (cId === 'conveyance') return result.master?.conveyance || 0;
      if (cId === 'medical') return result.master?.medicalAllowance || 0;
      return 0;
    };

    comps.filter(c => c.type === 'earning').forEach(c => {
      const val = getEarningValue(c.id);
      if (form.payType === 'flat') {
        if (c.id === 'basic') {
          data.push(['Flat Salary', val, toAnnual(val)]);
        }
      } else {
        if (c.id === 'basic' || c.id === 'hra' || val > 0) {
          let name = c.name || c.id;
          if (form.payType === 'hourly' && c.id === 'basic') {
            name = 'Contract Wages (Hourly)';
          }
          data.push([name, val, toAnnual(val)]);
        }
      }
    });

    data.push(['Gross Salary (Total Earnings)', result.payroll?.earnings?.totalEarnings || result.master?.grossSalary || 0, toAnnual(result.payroll?.earnings?.totalEarnings || result.master?.grossSalary || 0)]);
    data.push(['', '', '']);
    
    data.push(['EMPLOYER CONTRIBUTIONS', 'Monthly (INR)', 'Annual (INR)']);
    if (result.master?.pfEmployer > 0) {
      data.push(['PF Employer', result.master.pfEmployer, toAnnual(result.master.pfEmployer)]);
    }
    if (result.master?.esiEmployer > 0) {
      data.push(['ESI Employer', result.master.esiEmployer, toAnnual(result.master.esiEmployer)]);
    }
    if (result.master?.gratuity > 0) {
      data.push(['Gratuity Provision', result.master.gratuity, toAnnual(result.master.gratuity)]);
    }
    if (result.master?.lwfEmployer > 0) {
      data.push(['LWF Employer', result.master.lwfEmployer, toAnnual(result.master.lwfEmployer)]);
    }
    if (result.master?.insurance > 0) {
      data.push(['Corporate Health Insurance', result.master.insurance, toAnnual(result.master.insurance)]);
    }
    if (result.master?.employerNPS > 0) {
      data.push(['Employer NPS Contribution', result.master.employerNPS, toAnnual(result.master.employerNPS)]);
    }
    data.push(['Total Employer Cost (CTC)', result.master?.grossTotalSalary || result.monthlyCTC, toAnnual(result.master?.grossTotalSalary || result.monthlyCTC)]);

    data.push(['', '', '']);
    data.push(['EMPLOYEE DEDUCTIONS', 'Monthly (INR)', 'Annual (INR)']);
    if (result.payroll?.deductions?.pfEmployee > 0) {
      data.push(['PF Employee', result.payroll.deductions.pfEmployee, toAnnual(result.payroll.deductions.pfEmployee)]);
    }
    if (result.payroll?.deductions?.esiEmployee > 0) {
      data.push(['ESI Employee', result.payroll.deductions.esiEmployee, toAnnual(result.payroll.deductions.esiEmployee)]);
    }
    if (result.payroll?.deductions?.lwfEmployee > 0) {
      data.push(['LWF Employee', result.payroll.deductions.lwfEmployee, toAnnual(result.payroll.deductions.lwfEmployee)]);
    }
    if (result.payroll?.deductions?.professionalTax > 0) {
      data.push(['Professional Tax (PT)', result.payroll.deductions.professionalTax, toAnnual(result.payroll.deductions.professionalTax)]);
    }
    if (result.payroll?.deductions?.tds > 0) {
      data.push(['Income Tax (TDS)', result.payroll.deductions.tds, toAnnual(result.payroll.deductions.tds)]);
    }
    data.push(['Total Deductions', result.payroll?.deductions?.totalDeductions || 0, toAnnual(result.payroll?.deductions?.totalDeductions || 0)]);

    if (result.payroll?.variablePay?.totalVariablePay > 0) {
      data.push(['', '', '']);
      data.push(['ONE-TIME PAY (BONUSES)', 'Monthly (INR)', 'Annual (INR)']);
      if (form.joiningBonus > 0) data.push(['Joining Bonus', Number(form.joiningBonus), toAnnual(Number(form.joiningBonus))]);
      if (form.performanceBonus > 0) data.push(['Performance Bonus', Number(form.performanceBonus), toAnnual(Number(form.performanceBonus))]);
      if (form.specialBonus > 0) data.push(['Special Bonus', Number(form.specialBonus), toAnnual(Number(form.specialBonus))]);
      if (form.retentionBonus > 0) data.push(['Retention Bonus', Number(form.retentionBonus), toAnnual(Number(form.retentionBonus))]);
      if (form.incentive > 0) data.push(['Incentive', Number(form.incentive), toAnnual(Number(form.incentive))]);
      if (form.arrear > 0) data.push(['Arrear', Number(form.arrear), toAnnual(Number(form.arrear))]);
      if (form.referralBonus > 0) data.push(['Referral Bonus', Number(form.referralBonus), toAnnual(Number(form.referralBonus))]);
      data.push(['Total One-Time Pay', result.payroll.variablePay.totalVariablePay, toAnnual(result.payroll.variablePay.totalVariablePay)]);
    }

    data.push(['', '', '']);
    data.push(['ESTIMATED NET TAKE-HOME', result.payroll?.netSalary || 0, toAnnual(result.payroll?.netSalary || 0)]);

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 38 },
      { wch: 15 },
      { wch: 15 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Simulated Salary Breakup');
    XLSX.writeFile(workbook, `Simulated_Salary_Breakup_${form.taxRegime}_Regime.xlsx`);
    toast.success('Simulated salary breakup downloaded successfully');
  };

  const tabs = useMemo(() => {
    const list = [
      { id: 'ctc', name: 'CTC & Components' },
      { id: 'controls', name: 'Payroll Controls' },
      { id: 'bonuses', name: 'One-Time Pay' },
      { id: 'tax', name: 'Tax Declarations' }
    ];
    if (canManageConfig) {
      list.push({ id: 'settings', name: 'Structure Settings' });
    }
    return list;
  }, [canManageConfig]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Salary Calculator
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Simulate compensation structures, enforce statutory rules, apply default profiles, and compare regimes.
          </p>
        </div>

        {activeTab !== 'settings' && (
          <div className="flex items-center gap-3 bg-slate-55 border border-slate-200 px-4 py-2 rounded-xl">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Salary Profile:</label>
            <select
              value={form.salaryTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="bg-white text-xs font-bold text-blue-600 border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="custom">Custom Structure</option>
              <option value="sde">SDE Preset</option>
              <option value="sales">Sales Preset</option>
              <option value="operations">Operations Preset</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Tab Bar at Page Level - Restyled to prevent wrapping */}
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide gap-1 mb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {activeTab === 'settings' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <PayrollSettings embed={true} onSave={fetchConfig} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr,0.9fr] gap-6 items-start">
          {/* Left Form Panel */}
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
            <div className="space-y-4 min-h-[380px]">
              {activeTab === 'ctc' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pay Type</label>
                      <select
                        value={form.payType || 'salaried'}
                        onChange={(e) => {
                          const type = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            payType: type,
                            ...(type === 'hourly' ? {
                              pfEnabled: false,
                              esiEnabled: false,
                              ptEnabled: false,
                              lwfEnabled: false,
                              gratuityEnabled: false,
                              includePfInCTC: false,
                              includeGratuityInCTC: false,
                              flexiAmount: 0,
                              broadband: 0,
                              petrol: 0,
                              lta: 0,
                              insuranceAmount: 0,
                              employerNPS: 0,
                              monthlyCTC: (prev.hourlyRate || 0) * (prev.hoursWorked || 160),
                              annualCTC: (prev.hourlyRate || 0) * (prev.hoursWorked || 160) * 12
                            } : type === 'flat' ? {
                              pfEnabled: false,
                              esiEnabled: false,
                              ptEnabled: false,
                              lwfEnabled: false,
                              gratuityEnabled: false,
                              includePfInCTC: false,
                              includeGratuityInCTC: false,
                              flexiAmount: 0,
                              broadband: 0,
                              petrol: 0,
                              lta: 0,
                              insuranceAmount: 0,
                              employerNPS: 0,
                              monthlyCTC: Number(prev.flatSalary) || 0,
                              annualCTC: (Number(prev.flatSalary) || 0) * 12
                            } : {
                              pfEnabled: true,
                              esiEnabled: true,
                              ptEnabled: true,
                              lwfEnabled: true,
                              gratuityEnabled: true,
                              includePfInCTC: false,
                              includeGratuityInCTC: true,
                            })
                          }));
                        }}
                        className="w-full mt-1.5 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                      >
                        <option value="salaried">Salaried (Monthly Base)</option>
                        <option value="hourly">Hourly Contractor</option>
                        <option value="flat">Flat Salary — No Component Breakdown</option>
                      </select>
                    </div>
                  </div>

                  {form.payType === 'hourly' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField
                        label="Hourly Rate"
                        value={form.hourlyRate || 0}
                        onChange={(value) => {
                          setForm((prev) => ({
                            ...prev,
                            hourlyRate: value,
                            monthlyCTC: value * (prev.hoursWorked || 160),
                            annualCTC: value * (prev.hoursWorked || 160) * 12
                          }));
                        }}
                        suffix="INR/hr"
                      />
                      <InputField
                        label="Estimated Monthly Hours"
                        value={form.hoursWorked || 160}
                        onChange={(value) => {
                          setForm((prev) => ({
                            ...prev,
                            hoursWorked: value,
                            monthlyCTC: (prev.hourlyRate || 0) * value,
                            annualCTC: (prev.hourlyRate || 0) * value * 12
                          }));
                        }}
                        suffix="hours"
                      />
                    </div>
                  ) : form.payType === 'flat' ? (
                    <div className="grid grid-cols-1 gap-4">
                      <InputField
                        label="Flat Monthly Salary"
                        value={form.flatSalary || 0}
                        onChange={(value) => {
                          setForm((prev) => ({
                            ...prev,
                            flatSalary: value,
                            monthlyCTC: value,
                            annualCTC: value * 12
                          }));
                        }}
                        suffix="INR"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField
                          label="Annual CTC"
                          value={form.annualCTC}
                          onChange={(value) => {
                            setForm((prev) => ({
                              ...prev,
                              annualCTC: value,
                              monthlyCTC: Math.round((value / 12) * 100) / 100
                            }));
                          }}
                          suffix="INR"
                        />
                        <InputField
                          label="Monthly CTC"
                          value={form.monthlyCTC}
                          onChange={(value) => {
                            setForm((prev) => ({
                              ...prev,
                              monthlyCTC: value,
                              annualCTC: Math.round(value * 12 * 100) / 100
                            }));
                          }}
                          suffix="INR"
                        />
                      </div>
                      {/* Salary Components — mirrors Structure Settings exactly */}
                      {config?.salaryComponents && config.salaryComponents.length > 0 ? (
                        <>
                          {/* Section label */}
                          <div className="pt-1 pb-0.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Salary Components</span>
                          </div>
                          {config.salaryComponents
                            .filter(c => c.type === 'earning')
                            .reduce((rows, c, idx, arr) => {
                              if (idx % 2 === 0) rows.push(arr.slice(idx, idx + 2));
                              return rows;
                            }, [])
                            .map((pair, rowIdx) => (
                              <div key={rowIdx} className="grid grid-cols-2 gap-4">
                                {pair.map(c => {
                                  const isFixed = c.linkedTo === 'fixed';
                                  const isRemainder = c.linkedTo === 'remainder';

                                  // Computed value from live master
                                  let computedVal = 0;
                                  if (localMaster?.earningsMap && localMaster.earningsMap[c.id] !== undefined) {
                                    computedVal = localMaster.earningsMap[c.id];
                                  } else if (c.id === 'basic') computedVal = localMaster?.basicMaster || 0;
                                  else if (c.id === 'hra') computedVal = localMaster?.hraMaster || 0;
                                  else if (c.id === 'special') computedVal = localMaster?.specialAllowance || 0;

                                  if (isFixed) {
                                    const val = form[c.id] !== undefined ? Number(form[c.id])
                                      : c.id === 'flexi' ? Number(form.flexiAmount) || 0
                                      : c.id === 'broadband' ? Number(form.broadband) || 0
                                      : c.id === 'petrol' ? Number(form.petrol) || 0
                                      : c.id === 'lta' ? Number(form.lta) || 0
                                      : 0;
                                    return (
                                      <InputField
                                        key={c.id}
                                        label={c.name}
                                        value={val}
                                        onChange={(value) => {
                                          setForm(prev => ({
                                            ...prev,
                                            [c.id]: value,
                                            ...(c.id === 'flexi' ? { flexiAmount: value } : {}),
                                            ...(c.id === 'broadband' ? { broadband: value } : {}),
                                            ...(c.id === 'petrol' ? { petrol: value } : {}),
                                            ...(c.id === 'lta' ? { lta: value } : {})
                                          }));
                                        }}
                                      />
                                    );
                                  }

                                  // Auto-calculated (CTC%, Basic%, Remainder)
                                  const badge = isRemainder ? 'Remainder'
                                    : c.linkedTo === 'ctc_percent' ? `${Math.round((c.linkValue || 0) * 100)}% of CTC`
                                    : c.linkedTo === 'basic_percent' ? `${Math.round((c.linkValue || 0) * 100)}% of Basic`
                                    : '';

                                  return (
                                    <div key={c.id} className="space-y-1">
                                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{c.name}</label>
                                      <div className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
                                        <span className="text-sm font-semibold text-slate-700">{fmtMoney(monthlyCTC > 0 ? computedVal : 0)}</span>
                                        <span className="text-[10px] font-semibold text-blue-500 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">{badge}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))
                          }
                        </>
                      ) : null}

                      <div className="grid grid-cols-2 gap-4">
                        <InputField label="Medical Insurance (Monthly)" value={form.insuranceAmount} onChange={(value) => setForm((prev) => ({ ...prev, insuranceAmount: value }))} />
                        <InputField label="Employer NPS (Monthly)" value={form.employerNPS} onChange={(value) => setForm((prev) => ({ ...prev, employerNPS: value }))} />
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-1 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Payroll Notes</label>
                      <textarea
                        placeholder="Special revision notes or remarks..."
                        rows="2"
                        value={form.remarks}
                        onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
                        className="w-full mt-1.5 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'controls' && (
                <div className="space-y-4 animate-fadeIn">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Statutory Applicability</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* PF Toggle */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">PF Applicable</label>
                        <input
                          type="checkbox"
                          checked={form.pfEnabled}
                          onChange={(e) => setForm((prev) => ({ ...prev, pfEnabled: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      {form.pfEnabled && (
                        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-200/50 pt-2">
                          <span>Include Employer PF in CTC</span>
                          <input
                            type="checkbox"
                            checked={form.includePfInCTC}
                            onChange={(e) => setForm((prev) => ({ ...prev, includePfInCTC: e.target.checked }))}
                            className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Gratuity Toggle */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Gratuity Provision</label>
                        <input
                          type="checkbox"
                          checked={form.gratuityEnabled}
                          onChange={(e) => setForm((prev) => ({ ...prev, gratuityEnabled: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      {form.gratuityEnabled && (
                        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-200/50 pt-2">
                          <span>Include Gratuity in CTC</span>
                          <input
                            type="checkbox"
                            checked={form.includeGratuityInCTC}
                            onChange={(e) => setForm((prev) => ({ ...prev, includeGratuityInCTC: e.target.checked }))}
                            className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* ESI Toggle */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">ESI Applicable</label>
                        <p className="text-[10px] text-slate-400">Triggered if Basic &lt; ₹21k</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={form.esiEnabled}
                        onChange={(e) => setForm((prev) => ({ ...prev, esiEnabled: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                    </div>

                    {/* LWF Toggle */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">LWF Applicable</label>
                        <p className="text-[10px] text-slate-400">Labour Welfare Fund</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={form.lwfEnabled}
                        onChange={(e) => setForm((prev) => ({ ...prev, lwfEnabled: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-blue-800">Professional Tax (PT) Config</label>
                      <input
                        type="checkbox"
                        checked={form.ptEnabled}
                        onChange={(e) => setForm((prev) => ({ ...prev, ptEnabled: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                    </div>

                    {form.ptEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PT Jurisdiction State</label>
                          <select
                            value={form.ptState}
                            onChange={(e) => handlePtStateChange(e.target.value)}
                            className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                          >
                            <option value="MH">Maharashtra (₹200/mo)</option>
                            <option value="KA">Karnataka (₹200/mo)</option>
                            <option value="TN">Tamil Nadu (₹200/mo)</option>
                            <option value="WB">West Bengal (₹200/mo)</option>
                            <option value="none">Other / Exempt (₹0)</option>
                            <option value="custom">Custom / Manual Override</option>
                          </select>
                        </div>

                        {form.ptState === 'custom' && (
                          <InputField
                            label="Manual PT Amount (Monthly)"
                            value={form.professionalTax}
                            onChange={(val) => setForm((prev) => ({ ...prev, professionalTax: val }))}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'bonuses' && (
                <div className="space-y-4 animate-fadeIn">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">One-Time Bonuses & Variables</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Joining Bonus" value={form.joiningBonus} onChange={(value) => setForm((prev) => ({ ...prev, joiningBonus: value }))} />
                    <InputField label="Performance Bonus" value={form.performanceBonus} onChange={(value) => setForm((prev) => ({ ...prev, performanceBonus: value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Special Bonus" value={form.specialBonus} onChange={(value) => setForm((prev) => ({ ...prev, specialBonus: value }))} />
                    <InputField label="Retention Bonus" value={form.retentionBonus} onChange={(value) => setForm((prev) => ({ ...prev, retentionBonus: value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Incentive" value={form.incentive} onChange={(value) => setForm((prev) => ({ ...prev, incentive: value }))} />
                    <InputField label="Arrear" value={form.arrear} onChange={(value) => setForm((prev) => ({ ...prev, arrear: value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Referral Bonus" value={form.referralBonus} onChange={(value) => setForm((prev) => ({ ...prev, referralBonus: value }))} />
                  </div>

                  <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 text-[11px] text-indigo-800">
                    <p className="font-semibold">One-Time Variables Calculation:</p>
                    <p className="mt-1">
                      These bonuses represent transient one-time additions for the target payroll month. They do not increase the recurring base master salary structure.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'tax' && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Default Target Regime</label>
                    <p className="text-xs text-slate-500 mt-0.5">Determine the regime displayed in the detailed breakdown below.</p>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {['new', 'old'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, taxRegime: r }))}
                          className={`py-2 px-3 text-center rounded-lg text-sm font-semibold border transition-all ${
                            form.taxRegime === r
                              ? 'bg-blue-50 border-blue-600 text-blue-600'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {r === 'new' ? 'New Regime' : 'Old Regime'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Old Regime Declarations</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div>
                          <label className="text-sm font-semibold text-slate-700">Metro City Resident</label>
                          <p className="text-xs text-slate-500">Raises HRA tax exemption threshold to 50% of Basic</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={form.isMetroCity}
                          onChange={(e) => setForm((prev) => ({ ...prev, isMetroCity: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      <InputField label="Monthly Rent Paid" value={form.rentPaidMonthly} onChange={(value) => setForm((prev) => ({ ...prev, rentPaidMonthly: value }))} />
                      <InputField label="Section 80C Investments" value={form.section80C} onChange={(value) => setForm((prev) => ({ ...prev, section80C: value }))} hint="ELSS, PPF, LIC. Max ₹1.5L" />
                      <InputField label="Section 80D Medical Insurance" value={form.section80D} onChange={(value) => setForm((prev) => ({ ...prev, section80D: value }))} hint="Self/Family. Max ₹25k" />
                      <InputField label="Section 24(b) Home Loan Interest" value={form.section24b} onChange={(value) => setForm((prev) => ({ ...prev, section24b: value }))} hint="Self-occupied. Max ₹2L" />
                      <InputField label="Section 80CCD(1B) NPS Contribution" value={form.section80CCD1B} onChange={(value) => setForm((prev) => ({ ...prev, section80CCD1B: value }))} hint="Self NPS. Max ₹50k" />
                      <InputField label="Other Exemptions / Deductions" value={form.otherExemptions} onChange={(value) => setForm((prev) => ({ ...prev, otherExemptions: value }))} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-sm font-semibold shadow-md transition-all disabled:opacity-60"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4 text-white" />
                  Syncing Calculations...
                </span>
              ) : 'Run Calculator with Server Validation'}
            </button>
          </form>

          {/* Right Output Panel */}
          <div className="space-y-6">
            {monthlyCTC > 0 ? (
              <>
                {/* Side-by-Side Regime Comparison */}
                {comparison && form.payType === 'salaried' && (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <h2 className="text-lg font-bold text-slate-800">Regime Comparison (FY 2024-25)</h2>
                      {comparison.recommended !== 'equal' && (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1 border border-emerald-200">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {comparison.recommended === 'new' ? 'New Regime saves more!' : 'Old Regime saves more!'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* New Regime Card */}
                      <div className={`p-4 rounded-xl border transition-all ${
                        comparison.recommended === 'new'
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                          : 'border-slate-200 bg-white'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-400 uppercase">New Regime</span>
                          {comparison.recommended === 'new' && (
                            <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">Best</span>
                          )}
                        </div>
                        <div className="text-xl font-extrabold text-slate-900">{fmtMoney(comparison.newRegime.monthlyTakeHome)}<span className="text-xs font-normal text-slate-500"> /mo</span></div>
                        <p className="text-[11px] text-slate-500 mt-1">Net Take-Home Salary</p>

                        <div className="border-t border-dashed border-slate-200 mt-3 pt-3 space-y-1.5 text-xs text-slate-600">
                          <div className="flex justify-between">
                            <span>Standard Ded.</span>
                            <span className="font-semibold">{fmtMoney(comparison.newRegime.standardDeduction)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Other Savings</span>
                            <span className="font-semibold">₹0</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Taxable Income</span>
                            <span className="font-semibold">{fmtMoney(toAnnual(comparison.newRegime.netTaxableIncome) / 12)}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200/50 pt-1.5">
                            <span>Monthly TDS</span>
                            <span className={`font-semibold ${comparison.newRegime.monthlyTax > 0 ? 'text-rose-600' : 'text-slate-550'}`}>
                              {fmtMoney(comparison.newRegime.monthlyTax)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Old Regime Card */}
                      <div className={`p-4 rounded-xl border transition-all ${
                        comparison.recommended === 'old'
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                          : 'border-slate-200 bg-white'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-400 uppercase">Old Regime</span>
                          {comparison.recommended === 'old' && (
                            <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">Best</span>
                          )}
                        </div>
                        <div className="text-xl font-extrabold text-slate-900">{fmtMoney(comparison.oldRegime.monthlyTakeHome)}<span className="text-xs font-normal text-slate-500"> /mo</span></div>
                        <p className="text-[11px] text-slate-500 mt-1">Net Take-Home Salary</p>

                        <div className="border-t border-dashed border-slate-200 mt-3 pt-3 space-y-1.5 text-xs text-slate-600">
                          <div className="flex justify-between">
                            <span>Standard Ded.</span>
                            <span className="font-semibold">{fmtMoney(comparison.oldRegime.standardDeduction)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="underline decoration-dotted cursor-help">Other Savings</span>
                            <span className="font-semibold text-emerald-600">{fmtMoney(comparison.oldRegime.otherDeductions)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Taxable Income</span>
                            <span className="font-semibold">{fmtMoney(toAnnual(comparison.oldRegime.netTaxableIncome) / 12)}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200/50 pt-1.5">
                            <span>Monthly TDS</span>
                            <span className={`font-semibold ${comparison.oldRegime.monthlyTax > 0 ? 'text-rose-600' : 'text-slate-550'}`}>
                              {fmtMoney(comparison.oldRegime.monthlyTax)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {comparison.recommended !== 'equal' && (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                        <div className="p-1 rounded-lg bg-emerald-500 text-white mt-0.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-emerald-950">
                            Save {fmtMoney(comparison.savings)} per month!
                          </h4>
                          <p className="text-xs text-emerald-700 mt-0.5">
                            By selecting the <strong className="uppercase">{comparison.recommended} regime</strong>, the projected annual tax savings is <strong>{fmtMoney(comparison.savings * 12)}</strong>.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Detailed Component Breakdown */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Salary Structure Breakdown</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Estimated on the <strong className="uppercase text-blue-600">{form.taxRegime} Regime</strong> structure.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.master?.esiApplicable ? (
                        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">
                          ESI Active (Basic &lt; ₹21,000)
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleDownloadBreakup}
                        className="bg-white border border-slate-300 hover:bg-slate-50 text-blue-600 px-3.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold shadow-sm"
                      >
                        <Download size={12} /> Download Breakup
                      </button>
                    </div>
                  </div>

                  <BreakdownTable
                    title="Earnings"
                    rows={earningsBreakdownRows}
                  />

                  {(form.payType !== 'hourly' || (result.master?.totalEmployerContributions || 0) > 0) && (
                    <BreakdownTable
                      title="Employer Contributions (Auto)"
                      rows={[
                        ['PF Employer', result.master?.pfEmployer],
                        ['Employer ESI', result.master?.esiEmployer],
                        ['Gratuity Provision', result.master?.gratuity],
                        ['LWF Employer', result.master?.lwfEmployer],
                        ['Corporate Health Insurance', result.master?.insurance],
                        ['Employer NPS Contribution', result.master?.employerNPS],
                        ['Total Employer Cost', result.master?.totalEmployerContributions],
                      ]}
                    />
                  )}

                  {(form.payType !== 'hourly' || (result.payroll?.deductions?.totalDeductions || 0) > 0) && (
                    <BreakdownTable
                      title="Employee Deductions (Auto)"
                      rows={[
                        ['PF Employee', result.payroll?.deductions?.pfEmployee],
                        ['Employee ESI', result.payroll?.deductions?.esiEmployee],
                        ['LWF Employee', result.payroll?.deductions?.lwfEmployee],
                        ['Professional Tax (PT)', result.payroll?.deductions?.professionalTax],
                        ['Income Tax Deducted at Source (TDS)', result.payroll?.deductions?.tds],
                        ['Total Deductions', result.payroll?.deductions?.totalDeductions],
                      ]}
                    />
                  )}

                  {result.payroll?.variablePay?.totalVariablePay > 0 && (
                    <BreakdownTable
                      title="One-Time Pay (Bonuses)"
                      rows={[
                        ['Joining Bonus', Number(form.joiningBonus)],
                        ['Performance Bonus', Number(form.performanceBonus)],
                        ['Special Bonus', Number(form.specialBonus)],
                        ['Retention Bonus', Number(form.retentionBonus)],
                        ['Incentive', Number(form.incentive)],
                        ['Arrear', Number(form.arrear)],
                        ['Referral Bonus', Number(form.referralBonus)],
                        ['Total One-Time Pay', result.payroll?.variablePay?.totalVariablePay],
                      ]}
                    />
                  )}

                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 mt-6 shadow-sm">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs divide-x divide-blue-200/50">
                      <SummaryItem label="Net Take-Home" value={fmtMoney(result.payroll?.netSalary)} highlight={true} />
                      <SummaryItem label="Monthly CTC" value={fmtMoney(result.monthlyCTC)} />
                      <SummaryItem label="Gross Earnings" value={fmtMoney(result.payroll?.earnings?.totalEarnings)} />
                      <SummaryItem label="Employer Cost" value={fmtMoney(result.payroll?.employerContributions?.grossTotalSalary + (result.payroll?.variablePay?.totalVariablePay || 0))} />
                      <SummaryItem label="Total Deductions" value={fmtMoney(result.payroll?.deductions?.totalDeductions)} />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="p-4 rounded-full bg-blue-50 text-blue-600 mb-4 animate-pulse">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-800">No Calculation Active</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                  Enter an Annual or Monthly CTC amount to dynamically break down components, calculate taxes, and estimate net take-home pay.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const InputField = ({ label, value, onChange, suffix, hint }) => (
  <div className="w-full">
    <div className="flex justify-between items-center">
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </div>
    <div className="relative mt-1.5 rounded-lg shadow-sm">
      <input
        type="number"
        step="any"
        min="0"
        value={value === 0 ? '' : value}
        placeholder="0"
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
      />
      {suffix && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <span className="text-slate-500 text-xs font-semibold">{suffix}</span>
        </div>
      )}
    </div>
  </div>
);

const BreakdownTable = ({ title, rows }) => {
  const isBonuses = title.includes('One-Time');
  const visibleRows = isBonuses 
    ? rows.filter(([label, val]) => val > 0 || label.startsWith('Total'))
    : rows;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</div>
      <div className="divide-y divide-slate-100">
        {visibleRows.map(([label, monthly]) => {
          const isTotal = label.startsWith('Total') || label.startsWith('Net');
          return (
            <div
              key={`${title}-${label}`}
              className={`grid grid-cols-[1.5fr,0.85fr,0.85fr] px-4 py-2 text-xs transition-all hover:bg-slate-50/50 ${
                isTotal ? 'bg-slate-50/50 font-bold border-t border-slate-200 text-slate-900 text-[12px]' : 'text-slate-600'
              }`}
            >
              <span>{label}</span>
              <span className="text-right font-semibold text-slate-900">{fmtMoney(monthly)}</span>
              <span className="text-right text-slate-500">{fmtMoney(toAnnual(monthly))}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SummaryItem = ({ label, value, highlight }) => (
  <div className="px-3 first:pl-0">
    <div className={`text-[9px] font-bold uppercase tracking-wider ${highlight ? 'text-blue-600 font-extrabold' : 'text-slate-400'}`}>{label}</div>
    <div className={`mt-1 font-extrabold tracking-tight ${highlight ? 'text-blue-900 text-base sm:text-lg' : 'text-slate-800 text-xs sm:text-sm'}`}>{value}</div>
  </div>
);

export default SalaryCalculator;
