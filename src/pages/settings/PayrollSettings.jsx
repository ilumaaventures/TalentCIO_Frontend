import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Save, Loader2, Info, Settings, Shield, RotateCcw } from 'lucide-react';
import api from '../../api/axios';
import { DEFAULT_PAYROLL_CONFIG } from '../../utils/payroll';

const getBaselineComponents = (config) => [
  { id: 'basic',                    name: 'Basic Salary',                  type: 'earning',   taxable: true,  linkedTo: 'ctc_percent',   linkValue: config.basicPercent ?? 0.5,           frequency: 'monthly' },
  { id: 'hra',                      name: 'HRA',                           type: 'earning',   taxable: false, linkedTo: 'basic_percent', linkValue: config.hraPercent ?? 0.5,             frequency: 'monthly' },
];

const mergeSalaryComponents = (loadedComponents, config) => {
  const baselines = getBaselineComponents(config);
  const others = [
    { id: 'special',          name: 'Special Allowance',  type: 'earning',   taxable: true,  linkedTo: 'remainder',   linkValue: 0, frequency: 'monthly' },
    { id: 'flexi',            name: 'Flexi Allowance',    type: 'earning',   taxable: false, linkedTo: 'fixed',       linkValue: 0, frequency: 'monthly' },
    { id: 'broadband',        name: 'Broadband',          type: 'earning',   taxable: false, linkedTo: 'fixed',       linkValue: 0, frequency: 'monthly' },
    { id: 'petrol',           name: 'Petrol',             type: 'earning',   taxable: false, linkedTo: 'fixed',       linkValue: 0, frequency: 'monthly' },
    { id: 'lta',              name: 'LTA',                type: 'earning',   taxable: false, linkedTo: 'fixed',       linkValue: 0, frequency: 'monthly' },
    { id: 'conveyance',       name: 'Conveyance',         type: 'earning',   taxable: false, linkedTo: 'fixed',       linkValue: 0, frequency: 'monthly' },
    { id: 'medical',          name: 'Medical Allowance',  type: 'earning',   taxable: false, linkedTo: 'fixed',       linkValue: 0, frequency: 'monthly' },
  ];

  const map = new Map();

  if (!loadedComponents || loadedComponents.length === 0) {
    const basicComp = baselines.find(b => b.id === 'basic');
    const hraComp = baselines.find(b => b.id === 'hra');
    if (basicComp) map.set('basic', basicComp);
    if (hraComp) map.set('hra', hraComp);
    others.forEach(o => map.set(o.id, o));
    baselines.forEach(b => {
      if (!map.has(b.id)) map.set(b.id, b);
    });
    return Array.from(map.values());
  }

  loadedComponents.forEach(c => {
    if (c.id && ![
      'pf_rate_employee', 'pf_rate_employer', 'pf_salary_ceiling',
      'esi_rate_employee', 'esi_rate_employer', 'esi_threshold',
      'lwf_employer', 'lwf_employee', 'gratuity_rate',
      'default_working_days', 'default_insurance_amount', 'lta_max_percent'
    ].includes(c.id)) {
      map.set(c.id, { ...c });
    }
  });

  baselines.forEach(b => {
    if (map.has(b.id)) {
      const existing = map.get(b.id);
      map.set(b.id, { ...b, ...existing, linkValue: b.linkValue });
    } else {
      map.set(b.id, b);
    }
  });

  return Array.from(map.values());
};

const isStatutoryOrSpecial = (id) => {
  return ['basic', 'hra'].includes(id);
};

const PayrollSettings = ({ embed = false, onSave }) => {
  const [form, setForm] = useState(DEFAULT_PAYROLL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleReset = () => {
    if (!window.confirm(
      'Reset all payroll settings to factory defaults?\n\nThis will restore default salary components, PF, ESI, LWF, Gratuity rates, and general policy values.\n\nClick OK to confirm.'
    )) return;
    const defaultComponents = mergeSalaryComponents([], DEFAULT_PAYROLL_CONFIG);
    setForm({ ...DEFAULT_PAYROLL_CONFIG, salaryComponents: defaultComponents });
    toast.success('Settings reset to defaults. Click Save to apply.');
  };

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/payroll/config');
        const data = res.data || {};
        const mergedConfig = {
          ...DEFAULT_PAYROLL_CONFIG,
          ...data
        };
        const mergedComponents = mergeSalaryComponents(data.salaryComponents, mergedConfig);

        setForm({
          ...mergedConfig,
          salaryComponents: mergedComponents
        });
      } catch (error) {
        console.error(error);
        toast.error('Failed to load payroll configuration settings');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleFieldChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addComponent = () => {
    const newId = `custom_${Date.now()}`;
    const newComponent = {
      id: newId,
      name: 'New Allowance',
      type: 'earning',
      taxable: false,
      linkedTo: 'fixed',
      linkValue: 0,
      frequency: 'monthly'
    };

    setForm(prev => ({
      ...prev,
      salaryComponents: [...(prev.salaryComponents || []), newComponent]
    }));
  };

  const deleteComponent = (index) => {
    setForm(prev => {
      const copy = [...(prev.salaryComponents || [])];
      copy.splice(index, 1);
      return {
        ...prev,
        salaryComponents: copy
      };
    });
  };

  const updateComponent = (index, field, value) => {
    setForm(prev => {
      const copy = [...(prev.salaryComponents || [])];
      const updated = { ...copy[index], [field]: value };
      if (field === 'linkedTo' && value === 'remainder') {
        updated.linkValue = 0;
      }
      copy[index] = updated;
      
      const next = {
        ...prev,
        salaryComponents: copy
      };

      if (updated.id === 'basic' && field === 'linkValue') {
        next.basicPercent = Number(value);
      }
      if (updated.id === 'hra' && field === 'linkValue') {
        next.hraPercent = Number(value);
      }

      return next;
    });
  };

  const handleSave = async () => {
    try {
      const components = form.salaryComponents || [];
      const remainderComps = components.filter(c => c.linkedTo === 'remainder');
      if (remainderComps.length !== 1) {
        toast.error(`Exactly one salary component must be linked to 'Remainder Balance' to act as the CTC balancing component. Currently found: ${remainderComps.length}`);
        return;
      }

      const remainderComp = remainderComps[0];
      if (remainderComp.type !== 'earning') {
        toast.error(`The remainder balancing component ("${remainderComp.name}") must be an Earning type.`);
        return;
      }

      const names = new Set();
      for (const c of components) {
        const trimmedName = (c.name || '').trim();
        if (!trimmedName) {
          toast.error('Component name cannot be empty');
          return;
        }
        const lowerName = trimmedName.toLowerCase();
        if (names.has(lowerName)) {
          toast.error(`Component name "${trimmedName}" is duplicated. Component names must be unique.`);
          return;
        }
        names.add(lowerName);

        if (c.linkedTo === 'ctc_percent' || c.linkedTo === 'basic_percent') {
          const val = Number(c.linkValue);
          if (isNaN(val) || val < 0 || val > 1) {
            toast.error(`Percentage value for "${c.name}" must be between 0% and 100% (currently ${(val || 0) * 100}%).`);
            return;
          }
        } else if (c.linkedTo === 'fixed') {
          const val = Number(c.linkValue);
          if (isNaN(val) || val < 0) {
            toast.error(`Fixed value for "${c.name}" cannot be negative.`);
            return;
          }
        }
      }

      const basic = components.find(c => c.id === 'basic');
      if (basic) {
        if (basic.linkedTo !== 'ctc_percent') {
          toast.error('Basic Salary must be linked to CTC %.');
          return;
        }
        const basicVal = Number(basic.linkValue);
        if (basicVal <= 0 || basicVal > 1) {
          toast.error('Basic Salary CTC percentage must be between 1% and 100% (typically 50%).');
          return;
        }
      }

      const hra = components.find(c => c.id === 'hra');
      if (hra) {
        if (hra.linkedTo !== 'basic_percent' && hra.linkedTo !== 'ctc_percent' && hra.linkedTo !== 'fixed') {
          toast.error('HRA must be linked to Basic %, CTC %, or Fixed.');
          return;
        }
      }

      if (form.pfCalculationType === 'fixed') {
        if (isNaN(Number(form.pfAmountEmployee)) || Number(form.pfAmountEmployee) < 0 ||
            isNaN(Number(form.pfAmountEmployer)) || Number(form.pfAmountEmployer) < 0) {
          toast.error('PF Flat Amounts cannot be negative.');
          return;
        }
      } else {
        const pfRateVal = Number(form.pfRate);
        const pfEmpRateVal = Number(form.pfEmployerRate);
        if (isNaN(pfRateVal) || pfRateVal < 0 || pfRateVal > 1 ||
            isNaN(pfEmpRateVal) || pfEmpRateVal < 0 || pfEmpRateVal > 1) {
          toast.error('PF Rates must be between 0% and 100%.');
          return;
        }
        if (isNaN(Number(form.pfCap)) || Number(form.pfCap) < 0) {
          toast.error('PF Salary Cap cannot be negative.');
          return;
        }
      }

      const esiEmpRateVal = Number(form.esiEmployeeRate);
      const esiEmployerRateVal = Number(form.esiEmployerRate);
      if (isNaN(esiEmpRateVal) || esiEmpRateVal < 0 || esiEmpRateVal > 1 ||
          isNaN(esiEmployerRateVal) || esiEmployerRateVal < 0 || esiEmployerRateVal > 1) {
        toast.error('ESI Rates must be between 0% and 100%.');
        return;
      }
      if (isNaN(Number(form.esiBasicThreshold)) || Number(form.esiBasicThreshold) < 0) {
        toast.error('ESI Salary Limit cannot be negative.');
        return;
      }

      if (isNaN(Number(form.lwfEmployee)) || Number(form.lwfEmployee) < 0 ||
          isNaN(Number(form.lwfEmployer)) || Number(form.lwfEmployer) < 0) {
        toast.error('LWF Share values cannot be negative.');
        return;
      }

      const gratuityRateVal = Number(form.gratuityRate);
      if (isNaN(gratuityRateVal) || gratuityRateVal < 0 || gratuityRateVal > 1) {
        toast.error('Gratuity Rate must be between 0% and 100%.');
        return;
      }

      const workingDays = Number(form.defaultWorkingDays);
      if (isNaN(workingDays) || workingDays <= 0 || workingDays > 31) {
        toast.error('Default Working Days must be a positive integer between 1 and 31.');
        return;
      }

      const ltaMax = Number(form.ltaMaxPercent);
      if (isNaN(ltaMax) || ltaMax < 0 || ltaMax > 1) {
        toast.error('LTA Max Allowance must be between 0% and 100%.');
        return;
      }

      if (isNaN(Number(form.defaultInsurance)) || Number(form.defaultInsurance) < 0) {
        toast.error('Default Corporate Health Insurance cannot be negative.');
        return;
      }

      setSaving(true);
      const payload = {};
      const allKeys = [...Object.keys(DEFAULT_PAYROLL_CONFIG), 'salaryComponents'];
      allKeys.forEach(key => {
        const value = form[key];
        if (key === 'salaryComponents') {
          const seen = new Set();
          payload[key] = Array.isArray(value) ? value
            .filter(c => c.id)
            .map(c => ({
              id: c.id,
              name: c.name || '',
              type: c.type || 'earning',
              taxable: !!c.taxable,
              linkedTo: c.linkedTo || 'fixed',
              linkValue: c.linkedTo === 'remainder' ? 0 : Number(c.linkValue) || 0,
              frequency: c.frequency || 'monthly'
            }))
            .filter(c => {
              if (seen.has(c.id)) return false;
              seen.add(c.id);
              return true;
            }) : [];
        } else if (key === 'pfCalculationType') {
          payload[key] = value || 'percent';
        } else {
          payload[key] = Number(value) || 0;
        }
      });

      await api.put('/payroll/config', payload);
      toast.success('Payroll configuration settings saved successfully');
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to save payroll settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={embed ? "space-y-6 p-1" : "p-6 max-w-7xl mx-auto space-y-6"}>
      {!embed && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-600" />
              Payroll Settings
            </h1>
            <p className="text-slate-500 text-sm mt-1">Configure company salary structures, custom component allocations, and statutory rates.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-600 text-sm font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 hover:text-rose-600 hover:border-rose-300 disabled:opacity-50 transition-colors shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {embed && (
        <div className="flex justify-end items-center gap-2 border-b border-slate-100 pb-4">
          <button
            onClick={handleReset}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white text-slate-600 text-sm font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 hover:text-rose-600 hover:border-rose-300 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Salary Components Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Salary Components</h3>
              <p className="text-xs text-slate-500 mt-0.5">Customize earning components. One component must act as the CTC balance remainder.</p>
            </div>
            <button
              onClick={addComponent}
              className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-md border border-slate-200 transition-colors"
            >
              + Add Component
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr className="text-[11px] uppercase tracking-wider">
                  <th className="px-3 py-2">Component Name</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-center">Taxable</th>
                  <th className="px-3 py-2">Linked to</th>
                  <th className="px-3 py-2">Link Value</th>
                  <th className="px-3 py-2">Frequency</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {form.salaryComponents?.map((c, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 text-[13px] border-b border-slate-50 last:border-0 transition-colors">
                    <td className="px-3 py-2 min-w-[200px]">
                      <input
                        type="text"
                        value={c.name}
                        disabled={c.id === 'basic' || c.id === 'hra'}
                        onChange={(e) => updateComponent(index, 'name', e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                        placeholder="Component name"
                      />
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      <select
                        value={c.type}
                        disabled={c.id === 'basic' || c.id === 'hra'}
                        onChange={(e) => updateComponent(index, 'type', e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                      >
                        <option value="earning">Earning</option>
                        <option value="deduction">Deduction</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!c.taxable}
                        disabled={c.id === 'basic' || c.id === 'hra'}
                        onChange={(e) => updateComponent(index, 'taxable', e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-3 py-2 min-w-[140px]">
                      <select
                        value={c.linkedTo}
                        disabled={c.id === 'basic' || c.id === 'hra'}
                        onChange={(e) => updateComponent(index, 'linkedTo', e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                      >
                        <option value="ctc_percent">CTC %</option>
                        <option value="basic_percent">Basic %</option>
                        <option value="fixed">Fixed Amount</option>
                        <option value="remainder">Remainder Balance</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 min-w-[150px]">
                      {c.linkedTo !== 'remainder' ? (
                        <div className="relative rounded-md shadow-sm w-full">
                          {c.linkedTo === 'fixed' && (
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs font-semibold">
                              ₹
                            </div>
                          )}
                          <input
                            type="number"
                            step={['ctc_percent', 'basic_percent'].includes(c.linkedTo) ? '1' : '0.01'}
                            min="0"
                            value={
                              ['ctc_percent', 'basic_percent'].includes(c.linkedTo)
                                ? (c.linkValue !== undefined && c.linkValue !== null ? Math.round(Number(c.linkValue) * 10000) / 100 : '')
                                : c.linkValue
                            }
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              const finalVal = ['ctc_percent', 'basic_percent'].includes(c.linkedTo)
                                ? (val === '' ? 0 : val / 100)
                                : val;
                              updateComponent(index, 'linkValue', finalVal);
                            }}
                            className={`border border-slate-300 rounded-lg py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                              c.linkedTo === 'fixed' ? 'pl-7 pr-2.5' : (['ctc_percent', 'basic_percent'].includes(c.linkedTo) ? 'pl-2.5 pr-7' : 'px-2.5')
                            }`}
                            placeholder="0.00"
                          />
                          {['ctc_percent', 'basic_percent'].includes(c.linkedTo) && (
                            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400 text-xs font-semibold">
                              %
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          disabled
                          value="Auto Calculated Remainder"
                          className="border border-slate-200 bg-slate-50 text-slate-400 rounded-lg px-3 py-1.5 text-xs w-full cursor-not-allowed"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[130px]">
                      <select
                        value={c.frequency || 'monthly'}
                        disabled={c.id === 'basic' || c.id === 'hra'}
                        onChange={(e) => updateComponent(index, 'frequency', e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="semi_annually">Semi-Annually</option>
                        <option value="annually">Annually</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isStatutoryOrSpecial(c.id) ? (
                        <span className="text-slate-300 cursor-not-allowed p-1 inline-block" title="Core components cannot be deleted">
                          -
                        </span>
                      ) : (
                        <button
                          onClick={() => deleteComponent(index)}
                          className="text-rose-600 hover:text-rose-800 font-semibold text-xs"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statutory Configurations Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Statutory Contributions & Compliance
            </h3>
            <p className="text-xs text-slate-500 mt-1">Configure contribution slabs, ceilings, and flat rates for PF, ESI, LWF, and Gratuity.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* PF Slab */}
            <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4 space-y-3.5">
              <h4 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-2 uppercase tracking-wide">Provident Fund (PF)</h4>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Calculation Type</label>
                <select
                  value={form.pfCalculationType || 'percent'}
                  onChange={(e) => handleFieldChange('pfCalculationType', e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="percent">Percentage of Salary</option>
                  <option value="fixed">Fixed Ceiling Limit</option>
                </select>
              </div>

              {form.pfCalculationType === 'fixed' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Employee PF Amount (₹)</label>
                    <input
                      type="number"
                      value={form.pfAmountEmployee ?? 1800}
                      onChange={(e) => handleFieldChange('pfAmountEmployee', Number(e.target.value))}
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Employer PF Amount (₹)</label>
                    <input
                      type="number"
                      value={form.pfAmountEmployer ?? 1800}
                      onChange={(e) => handleFieldChange('pfAmountEmployer', Number(e.target.value))}
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Employee PF Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.pfRate ? Math.round(form.pfRate * 10000) / 100 : 12}
                      onChange={(e) => handleFieldChange('pfRate', Number(e.target.value) / 100)}
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Employer PF Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.pfEmployerRate ? Math.round(form.pfEmployerRate * 10000) / 100 : 12}
                      onChange={(e) => handleFieldChange('pfEmployerRate', Number(e.target.value) / 100)}
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">PF Salary Cap (₹)</label>
                    <input
                      type="number"
                      value={form.pfCap ?? 15000}
                      onChange={(e) => handleFieldChange('pfCap', Number(e.target.value))}
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </>
              )}
            </div>

            {/* ESI Slab */}
            <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4 space-y-3.5">
              <h4 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-2 uppercase tracking-wide">State Insurance (ESI)</h4>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Employee ESI Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.esiEmployeeRate ? Math.round(form.esiEmployeeRate * 10000) / 100 : 0.75}
                  onChange={(e) => handleFieldChange('esiEmployeeRate', Number(e.target.value) / 100)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Employer ESI Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.esiEmployerRate ? Math.round(form.esiEmployerRate * 10000) / 100 : 3.25}
                  onChange={(e) => handleFieldChange('esiEmployerRate', Number(e.target.value) / 100)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">ESI Salary Limit (₹)</label>
                <input
                  type="number"
                  value={form.esiBasicThreshold ?? 21000}
                  onChange={(e) => handleFieldChange('esiBasicThreshold', Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {/* LWF & Gratuity Slab */}
            <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4 space-y-3.5">
              <h4 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-2 uppercase tracking-wide">LWF & Gratuity</h4>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Employee LWF Share (₹)</label>
                <input
                  type="number"
                  value={form.lwfEmployee ?? 15}
                  onChange={(e) => handleFieldChange('lwfEmployee', Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Employer LWF Share (₹)</label>
                <input
                  type="number"
                  value={form.lwfEmployer ?? 35}
                  onChange={(e) => handleFieldChange('lwfEmployer', Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Gratuity Rate (%)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={form.gratuityRate ? Math.round(form.gratuityRate * 1000000) / 10000 : 4.81}
                  onChange={(e) => handleFieldChange('gratuityRate', Number(e.target.value) / 100)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {/* General policies Slab */}
            <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4 space-y-3.5">
              <h4 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-2 uppercase tracking-wide">General Policy Defaults</h4>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Default Working Days</label>
                <input
                  type="number"
                  value={form.defaultWorkingDays ?? 30}
                  onChange={(e) => handleFieldChange('defaultWorkingDays', Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">LTA Max Allowance (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.ltaMaxPercent ? Math.round(form.ltaMaxPercent * 10000) / 100 : 8.33}
                  onChange={(e) => handleFieldChange('ltaMaxPercent', Number(e.target.value) / 100)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Default Insurance (₹)</label>
                <input
                  type="number"
                  value={form.defaultInsurance ?? 0}
                  onChange={(e) => handleFieldChange('defaultInsurance', Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 text-xs text-blue-700">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <span className="font-semibold block mb-0.5">Note on Custom Configs</span>
              Customizing rates or component breakups affects the calculations in the interactive Salary Calculator simulator and newly generated payroll snapshots.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollSettings;
