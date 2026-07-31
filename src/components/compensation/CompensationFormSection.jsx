import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import DeliverableRateCardEditor from './DeliverableRateCardEditor';
import CustomAllowancesEditor from './CustomAllowancesEditor';
import CustomDeductionsEditor from './CustomDeductionsEditor';
import AdditionalBenefitsEditor from './AdditionalBenefitsEditor';
import SalaryPreviewCard from './SalaryPreviewCard';

const PT_STATE_LIST = [
    { code: 'AP', name: 'Andhra Pradesh', leviesPT: true },
    { code: 'AS', name: 'Assam', leviesPT: true },
    { code: 'BR', name: 'Bihar', leviesPT: true },
    { code: 'CG', name: 'Chhattisgarh', leviesPT: true },
    { code: 'GA', name: 'Goa', leviesPT: true },
    { code: 'GJ', name: 'Gujarat', leviesPT: true },
    { code: 'JH', name: 'Jharkhand', leviesPT: true },
    { code: 'KA', name: 'Karnataka', leviesPT: true },
    { code: 'KL', name: 'Kerala', leviesPT: true },
    { code: 'MP', name: 'Madhya Pradesh', leviesPT: true },
    { code: 'MH', name: 'Maharashtra', leviesPT: true },
    { code: 'MN', name: 'Manipur', leviesPT: true },
    { code: 'ML', name: 'Meghalaya', leviesPT: true },
    { code: 'MZ', name: 'Mizoram', leviesPT: true },
    { code: 'NL', name: 'Nagaland', leviesPT: true },
    { code: 'OR', name: 'Odisha', leviesPT: true },
    { code: 'PB', name: 'Punjab', leviesPT: true },
    { code: 'SK', name: 'Sikkim', leviesPT: true },
    { code: 'TN', name: 'Tamil Nadu', leviesPT: true },
    { code: 'TS', name: 'Telangana', leviesPT: true },
    { code: 'TR', name: 'Tripura', leviesPT: true },
    { code: 'WB', name: 'West Bengal', leviesPT: true },
    { code: 'PY', name: 'Puducherry', leviesPT: true },
    { code: 'DL', name: 'Delhi', leviesPT: false },
    { code: 'HR', name: 'Haryana', leviesPT: false },
    { code: 'UP', name: 'Uttar Pradesh', leviesPT: false },
    { code: 'UK', name: 'Uttarakhand', leviesPT: false },
    { code: 'RJ', name: 'Rajasthan', leviesPT: false },
    { code: 'HP', name: 'Himachal Pradesh', leviesPT: false },
    { code: 'JK', name: 'Jammu & Kashmir', leviesPT: false },
    { code: 'CH', name: 'Chandigarh', leviesPT: false },
    { code: 'GA_UT', name: 'Daman & Diu / Dadra & Nagar Haveli', leviesPT: false }
];

const parseBool = (val, def = true) => {
    if (val === undefined || val === null || val === '') return def;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() !== 'false';
    return Boolean(val);
};

const fmtMoney = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const CompensationFormSection = ({ formData, calculateSalaryBreakdown, payrollConfig: propConfig }) => {
    const [ctcPeriod, setCtcPeriod] = useState('monthly');
    const [config, setConfig] = useState(propConfig || null);
    const salary = formData?.salary || {};
    const compType = salary.compensationType || 'monthly_salary';
    const isEditing = Boolean(formData?.id || formData?._id || formData?.isEdit);

    const useComponents = parseBool(salary.useSalaryComponents, true);
    const isSalaried = (compType === 'monthly_salary' || compType === 'stipend_intern');

    useEffect(() => {
        if (!propConfig) {
            api.get('/payroll/config')
                .then(res => setConfig(res.data))
                .catch(() => setConfig(null));
        } else {
            setConfig(propConfig);
        }
    }, [propConfig]);

    const basicPctDefault = Math.round((config?.basicPercent ?? 0.5) * 100);
    const hraPctDefault = Math.round((config?.hraPercent ?? 0.5) * 100);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Side: Parameters & Configuration */}
            <div className="lg:col-span-2 space-y-4">
                {/* Salary Edit Notice Banner */}
                {isEditing && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
                        <span>💡 <strong>Salary Edit Notice:</strong> To adjust an onboarded employee's salary or rate, please use <strong>Salary Revisions</strong> in Employee Details to ensure full audit history & back-pay calculations.</span>
                    </div>
                )}

                {/* Strategy Engine Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Salary & Compensation Details</span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">Strategy Engine</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Salary Structure Mode *</label>
                            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => calculateSalaryBreakdown({ useSalaryComponents: true })}
                                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${useComponents ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80 font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    Structured
                                </button>
                                <button
                                    type="button"
                                    onClick={() => calculateSalaryBreakdown({ useSalaryComponents: false })}
                                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${!useComponents ? 'bg-white text-amber-700 shadow-2xs border border-slate-200/80 font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    Non-Structured
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Compensation Type *</label>
                            <select
                                value={compType}
                                onChange={(e) => {
                                    const newType = e.target.value;
                                    const defaultAttMode = newType === 'hourly' ? 'timesheet' : newType === 'piece_rate' ? 'unit_count' : newType === 'flat_project' || newType === 'milestone' || newType === 'commission_only' ? 'none' : 'attendance';
                                    calculateSalaryBreakdown({ compensationType: newType, attendanceMode: defaultAttMode });
                                }}
                                className="zoho-input"
                            >
                                <option value="monthly_salary">Monthly Salary</option>
                                <option value="hourly">Hourly Contractor</option>
                                <option value="daily_wage">Daily Wage Rate</option>
                                <option value="weekly_wage">Weekly Salary</option>
                                <option value="piece_rate">Piece Rate / Deliverables</option>
                                <option value="flat_project">Flat Project Fee</option>
                                <option value="milestone">Milestone / Project</option>
                                <option value="commission_only">Commission Only</option>
                                <option value="stipend_intern">Intern Stipend</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Attendance Mode *</label>
                            <select
                                value={salary.attendanceMode || 'attendance'}
                                onChange={(e) => calculateSalaryBreakdown({ attendanceMode: e.target.value })}
                                className="zoho-input"
                            >
                                <option value="attendance">Attendance Based (paidDays / workingDays)</option>
                                <option value="timesheet">Timesheet (hours logged)</option>
                                <option value="shift">Shift Based (shifts worked)</option>
                                <option value="unit_count">Unit Count (piece rate / deliverables)</option>
                                <option value="fixed">Fixed (always full month / no proration)</option>
                                <option value="none">None (milestone / project / commission)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Non-Structured Mode Notice */}
                {!useComponents && (
                    <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 font-medium leading-relaxed flex items-center gap-2 shadow-2xs">
                        <span className="text-base">💼</span>
                        <span><strong>Non-Structured Flat Salary Mode:</strong> Consolidated wages (100% Flat Salary) without statutory component splitting (PF, ESI, PT, LWF, Gratuity) or complex ratio breakdowns.</span>
                    </div>
                )}

                {/* Compensation Parameters Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Compensation Parameters ({compType})
                        </span>
                        {isSalaried && (
                            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setCtcPeriod('monthly')}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${ctcPeriod === 'monthly' ? 'bg-white text-slate-800 shadow-2xs font-extrabold' : 'text-slate-500'}`}
                                >
                                    Monthly
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCtcPeriod('annual')}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${ctcPeriod === 'annual' ? 'bg-white text-slate-800 shadow-2xs font-extrabold' : 'text-slate-500'}`}
                                >
                                    Annually
                                </button>
                            </div>
                        )}
                    </div>

                    {compType === 'hourly' ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hourly Rate (₹/hr) *</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={salary.hourlyRate || ''}
                                    onChange={(e) => calculateSalaryBreakdown({ hourlyRate: e.target.value })}
                                    placeholder="e.g. 500"
                                    className="zoho-input"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Standard Hours/Month</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={salary.standardHours || 160}
                                    onChange={(e) => calculateSalaryBreakdown({ standardHours: e.target.value })}
                                    className="zoho-input"
                                />
                            </div>
                        </div>
                    ) : compType === 'daily_wage' ? (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Daily Wage Rate (₹/day) *</label>
                            <input
                                type="number"
                                min="0"
                                value={salary.dailyRate || ''}
                                onChange={(e) => calculateSalaryBreakdown({ dailyRate: e.target.value })}
                                placeholder="e.g. 1000"
                                className="zoho-input"
                            />
                        </div>
                    ) : compType === 'weekly_wage' ? (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Weekly Salary Rate (₹/week) *</label>
                            <input
                                type="number"
                                min="0"
                                value={salary.weeklyRate || ''}
                                onChange={(e) => calculateSalaryBreakdown({ weeklyRate: e.target.value })}
                                placeholder="e.g. 5000"
                                className="zoho-input"
                            />
                        </div>
                    ) : compType === 'piece_rate' ? (
                        <DeliverableRateCardEditor formData={formData} calculateSalaryBreakdown={calculateSalaryBreakdown} />
                    ) : compType === 'flat_project' ? (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Agreed Flat Project Fee (₹) *</label>
                            <input
                                type="number"
                                min="0"
                                value={salary.projectFee || salary.monthlyCTC || ''}
                                onChange={(e) => calculateSalaryBreakdown({ projectFee: e.target.value, monthlyCTC: e.target.value })}
                                placeholder="e.g. 50000"
                                className="zoho-input"
                            />
                        </div>
                    ) : compType === 'milestone' ? (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Default Milestone Amount (₹) *</label>
                            <input
                                type="number"
                                min="0"
                                value={salary.milestoneAmount || salary.monthlyCTC || ''}
                                onChange={(e) => calculateSalaryBreakdown({ milestoneAmount: e.target.value, monthlyCTC: e.target.value })}
                                placeholder="e.g. 25000"
                                className="zoho-input"
                            />
                        </div>
                    ) : compType === 'commission_only' ? (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Commission Terms / Notes</label>
                            <textarea
                                rows={2}
                                value={salary.commissionNotes || ''}
                                onChange={(e) => calculateSalaryBreakdown({ commissionNotes: e.target.value })}
                                placeholder="e.g. 5% of direct sales volume"
                                className="zoho-input"
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                {useComponents ? (ctcPeriod === 'monthly' ? 'Monthly CTC *' : 'Annual CTC *') : (ctcPeriod === 'monthly' ? 'Flat Monthly Salary / Gross *' : 'Flat Annual Salary *')}
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={
                                    ctcPeriod === 'monthly'
                                        ? (salary.monthlyCTC || '')
                                        : Math.round((parseFloat(salary.monthlyCTC || 0) * 12))
                                }
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const monthly = ctcPeriod === 'monthly' ? val : Math.round((parseFloat(val || 0) / 12) * 100) / 100;
                                    calculateSalaryBreakdown({ monthlyCTC: monthly });
                                }}
                                placeholder="e.g. 50,000"
                                className="zoho-input"
                            />
                        </div>
                    )}
                </div>

                {/* CTC Components Summary Card — ONLY for Structured Salary */}
                {isSalaried && useComponents && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">CTC Components</span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Synced with payroll settings</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                            <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">PF Employer</span>
                                <span className="text-sm font-black text-slate-800">{fmtMoney(salary.pfEmployer)}</span>
                            </div>
                            <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">Gratuity</span>
                                <span className="text-sm font-black text-slate-800">{fmtMoney(salary.gratuity)}</span>
                            </div>
                            <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">LWF Employer</span>
                                <span className="text-sm font-black text-slate-800">{fmtMoney(salary.lwfEmployer)}</span>
                            </div>
                            <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                                <span className="block text-[10px] font-bold text-indigo-600 uppercase">Annual CTC</span>
                                <span className="text-sm font-black text-indigo-900">{fmtMoney(salary.annualCTC)}</span>
                            </div>
                            <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">Gross Salary</span>
                                <span className="text-sm font-black text-slate-800">{fmtMoney(salary.monthlyGross)}</span>
                            </div>
                            <div className="p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                                <span className="block text-[10px] font-bold text-emerald-700 uppercase">Net Take-Home Estimate</span>
                                <span className="text-sm font-black text-emerald-900">{fmtMoney(salary.netTakeHome)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Employee Salary Ratios (Overrides) Card — ONLY for Structured Salary */}
                {isSalaried && useComponents && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                        <div className="border-b border-slate-100 pb-2">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <span>Employee Salary Ratios (Overrides)</span>
                                <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase">Optional</span>
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-1">
                                By default, this employee's Basic and HRA are computed using the global company payroll settings. You can set employee-specific overrides below.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Basic Salary % Override</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={salary.basicPercent !== undefined && salary.basicPercent !== null ? salary.basicPercent : ''}
                                        onChange={(e) => calculateSalaryBreakdown({ basicPercent: e.target.value })}
                                        className="zoho-input pr-7"
                                        placeholder={`Company Default: ${basicPctDefault}%`}
                                    />
                                    <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">%</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">HRA % Override (of Basic)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={salary.hraPercent !== undefined && salary.hraPercent !== null ? salary.hraPercent : ''}
                                        onChange={(e) => calculateSalaryBreakdown({ hraPercent: e.target.value })}
                                        className="zoho-input pr-7"
                                        placeholder={`Company Default: ${hraPctDefault}%`}
                                    />
                                    <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">%</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Voluntary Provident Fund (VPF) % Override (of Basic)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={salary.vpfPercent !== undefined && salary.vpfPercent !== null ? salary.vpfPercent : ''}
                                        onChange={(e) => calculateSalaryBreakdown({ vpfPercent: e.target.value })}
                                        className="zoho-input pr-7"
                                        placeholder="Company Default: 0%"
                                    />
                                    <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Statutory Components & Contribution Toggles — ONLY for Structured Salary */}
                {isSalaried && useComponents && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
                        <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Statutory Components & Contribution Toggles</span>
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">Statutory Toggles</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Enable or disable specific statutory contributions for this employee. Disabling a component will zero out its values in salary calculations immediately.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* PF Card */}
                            <div className="flex flex-col gap-2 p-3 bg-slate-50/50 border border-slate-200 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-semibold text-slate-800">Provident Fund (PF)</span>
                                        {parseBool(salary.pfEnabled, true) && (
                                            <span className="text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-1.5 py-0.5">
                                                {fmtMoney(parseFloat(salary.pfEmployee || 0) + parseFloat(salary.pfEmployer || 0))}
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={parseBool(salary.pfEnabled, true)}
                                        onChange={(e) => calculateSalaryBreakdown({ pfEnabled: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                    />
                                </div>
                                <span className="text-[10px] text-slate-500">
                                    Both Employee & Employer PF contributions {parseBool(salary.pfEnabled, true) && `(EE: ${fmtMoney(salary.pfEmployee)}, ER: ${fmtMoney(salary.pfEmployer)})`}
                                </span>
                                {parseBool(salary.pfEnabled, true) && (
                                    <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-1">
                                        <div>
                                            <span className="text-[11px] font-semibold text-slate-700 block">Include Employer PF in CTC</span>
                                            <span className="text-[9px] text-slate-400">Employer contribution reduces Gross take-home</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={!!salary.includePfInCTC}
                                            onChange={(e) => calculateSalaryBreakdown({ includePfInCTC: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* ESI Card */}
                            <div className="flex flex-col gap-2 p-3 bg-slate-50/50 border border-slate-200 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-semibold text-slate-800">State Insurance (ESI)</span>
                                        {parseBool(salary.esiEnabled, true) && (parseFloat(salary.esiEmployee || 0) + parseFloat(salary.esiEmployer || 0)) > 0 && (
                                            <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full px-1.5 py-0.5">
                                                {fmtMoney(parseFloat(salary.esiEmployee || 0) + parseFloat(salary.esiEmployer || 0))}
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={parseBool(salary.esiEnabled, true)}
                                        onChange={(e) => calculateSalaryBreakdown({ esiEnabled: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                    />
                                </div>
                                <span className="text-[10px] text-slate-500">
                                    Employee State Insurance (ESI) deductions{' '}
                                    {parseBool(salary.esiEnabled, true) && (parseFloat(salary.esiEmployee || 0) + parseFloat(salary.esiEmployer || 0)) > 0
                                        ? `(EE: ${fmtMoney(salary.esiEmployee)}, ER: ${fmtMoney(salary.esiEmployer)})`
                                        : parseBool(salary.esiEnabled, true) && parseFloat(salary.monthlyGross || salary.monthlyCTC || 0) > (config?.esiBasicThreshold ?? 21000)
                                            ? <span className="text-amber-600 font-semibold block mt-0.5">Not applicable — gross wages exceed ₹{(config?.esiBasicThreshold ?? 21000).toLocaleString('en-IN')} statutory ceiling</span>
                                            : null}
                                </span>
                            </div>

                            {/* Gratuity Card */}
                            <div className="flex flex-col gap-2 p-3 bg-slate-50/50 border border-slate-200 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-semibold text-slate-800">Gratuity Provision</span>
                                        {parseBool(salary.gratuityEnabled, true) && parseFloat(salary.gratuity || 0) > 0 && (
                                            <span className="text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100 rounded-full px-1.5 py-0.5">
                                                {fmtMoney(salary.gratuity)}
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={parseBool(salary.gratuityEnabled, true)}
                                        onChange={(e) => calculateSalaryBreakdown({ gratuityEnabled: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                    />
                                </div>
                                <span className="text-[10px] text-slate-500">
                                    Accrual of statutory gratuity amount {parseBool(salary.gratuityEnabled, true) && parseFloat(salary.gratuity || 0) > 0 && `(${fmtMoney(salary.gratuity)})`}
                                </span>
                                {parseBool(salary.gratuityEnabled, true) && (
                                    <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-1">
                                        <div>
                                            <span className="text-[11px] font-semibold text-slate-700 block">Include Gratuity in CTC</span>
                                            <span className="text-[9px] text-slate-400">Accrued gratuity reduces Gross take-home</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={parseBool(salary.includeGratuityInCTC, true)}
                                            onChange={(e) => calculateSalaryBreakdown({ includeGratuityInCTC: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* LWF Card */}
                            <div className="flex flex-col gap-2 p-3 bg-slate-50/50 border border-slate-200 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-semibold text-slate-800">Welfare Fund (LWF)</span>
                                        {parseBool(salary.lwfEnabled, true) && (parseFloat(salary.lwfEmployee || 0) + parseFloat(salary.lwfEmployer || 0)) > 0 && (
                                            <span className="text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-1.5 py-0.5">
                                                {fmtMoney(parseFloat(salary.lwfEmployee || 0) + parseFloat(salary.lwfEmployer || 0))}
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={parseBool(salary.lwfEnabled, true)}
                                        onChange={(e) => calculateSalaryBreakdown({ lwfEnabled: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                    />
                                </div>
                                <span className="text-[10px] text-slate-500">
                                    Labour Welfare Fund contributions {parseBool(salary.lwfEnabled, true) && (parseFloat(salary.lwfEmployee || 0) + parseFloat(salary.lwfEmployer || 0)) > 0 && `(EE: ${fmtMoney(salary.lwfEmployee)}, ER: ${fmtMoney(salary.lwfEmployer)})`}
                                </span>
                            </div>
                        </div>

                        {/* PT Card */}
                        <div className="flex flex-col gap-3 p-3 bg-slate-50/50 border border-slate-200 rounded-xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-semibold text-slate-800">Professional Tax (PT)</span>
                                    {parseBool(salary.ptEnabled, true) && parseFloat(salary.professionalTax || 0) > 0 && (
                                        <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-1.5 py-0.5">
                                            {fmtMoney(salary.professionalTax)}
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={parseBool(salary.ptEnabled, true)}
                                    onChange={(e) => calculateSalaryBreakdown({ ptEnabled: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                />
                            </div>
                            <span className="text-[10px] text-slate-500">
                                State Professional Tax deduction {parseBool(salary.ptEnabled, true) && parseFloat(salary.professionalTax || 0) > 0 && `(${fmtMoney(salary.professionalTax)})`}
                            </span>

                            {parseBool(salary.ptEnabled, true) && (
                                <div className="space-y-1.5 border-t border-slate-200 pt-2 mt-1">
                                    <label className="block text-[10px] font-semibold text-slate-600">
                                        PT State <span className="text-slate-400 font-normal">(auto-computes slab amount)</span>
                                    </label>
                                    <div className="flex gap-2 items-center">
                                        <div className="flex-1">
                                            <select
                                                value={salary.ptState || 'MH'}
                                                onChange={(e) => calculateSalaryBreakdown({ ptState: e.target.value })}
                                                className="w-full p-1.5 border border-slate-300 rounded-lg text-xs outline-none bg-white text-slate-700"
                                            >
                                                <optgroup label="── No PT / Manual">
                                                    <option value="">None — use manual override below</option>
                                                    <option value="custom">Custom Override</option>
                                                </optgroup>
                                                <optgroup label="── States that levy PT">
                                                    {PT_STATE_LIST.filter(s => s.leviesPT).map(s => (
                                                        <option key={s.code} value={s.code}>{s.name}</option>
                                                    ))}
                                                </optgroup>
                                                <optgroup label="── States with no PT">
                                                    {PT_STATE_LIST.filter(s => s.code && !s.leviesPT).map(s => (
                                                        <option key={s.code} value={s.code}>{s.name}</option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                        </div>
                                        {salary.ptState === 'custom' && (
                                            <div className="w-[110px] flex items-center gap-1">
                                                <span className="text-[11px] text-slate-500 font-bold">₹</span>
                                                <input
                                                    type="number"
                                                    value={salary.professionalTax || 0}
                                                    onChange={(e) => calculateSalaryBreakdown({ professionalTax: e.target.value })}
                                                    className="w-full p-1.5 border border-slate-300 rounded-lg text-xs outline-none text-slate-700 font-bold"
                                                    placeholder="Amount"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-blue-600 font-medium">
                                        Slab PT will auto-fill. Set a manual amount below only to override.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Income Tax (TDS) Card */}
                        <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-200 rounded-xl">
                            <div>
                                <span className="text-xs font-semibold text-slate-800 block">Income Tax (TDS)</span>
                                <span className="text-[10px] text-slate-500">Enable Income Tax TDS deductions</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={parseBool(salary.tdsEnabled, true)}
                                onChange={(e) => calculateSalaryBreakdown({ tdsEnabled: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                {/* Statutory Toggle Card for Non-Structured Salary (Only TDS) */}
                {!useComponents && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                        <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Statutory Deductions (Non-Structured)</span>
                            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold">TDS Only</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-200 rounded-xl">
                            <div>
                                <span className="text-xs font-semibold text-slate-800 block">Income Tax (TDS)</span>
                                <span className="text-[10px] text-slate-500">Subject to TDS deductions (Section 194J / 192)</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={parseBool(salary.tdsEnabled, true)}
                                onChange={(e) => calculateSalaryBreakdown({ tdsEnabled: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                {/* Salary Components Breakdown — ONLY for Structured Salary */}
                {isSalaried && useComponents && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                        <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                            <div>
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Salary Components Breakdown</span>
                                <span className="text-[10px] text-slate-400">Configured in Company Payroll Settings & Customizable per Employee Frequency</span>
                            </div>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">Synced with Settings</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(config?.salaryComponents || [
                                { id: 'basic', name: 'Basic Salary', linkedTo: 'ctc_percent', linkValue: 0.5, frequency: 'monthly' },
                                { id: 'hra', name: 'HRA', linkedTo: 'basic_percent', linkValue: 0.5, frequency: 'monthly' },
                                { id: 'flexi', name: 'Flexi Allowance', linkedTo: 'remainder', frequency: 'monthly' },
                                { id: 'broadband', name: 'Broadband', linkedTo: 'fixed', linkValue: 0, frequency: 'monthly' },
                                { id: 'petrol', name: 'Petrol', linkedTo: 'fixed', linkValue: 0, frequency: 'monthly' },
                                { id: 'lta', name: 'LTA', linkedTo: 'fixed', linkValue: 0, frequency: 'monthly' },
                                { id: 'conveyance', name: 'Conveyance', linkedTo: 'fixed', linkValue: 0, frequency: 'monthly' },
                                { id: 'medical', name: 'Medical Allowance', linkedTo: 'fixed', linkValue: 0, frequency: 'monthly' },
                                { id: 'bonus', name: 'Bonus', linkedTo: 'fixed', linkValue: 0, frequency: 'semi_annually' }
                            ])
                            .filter(c => c.type === 'earning' || !c.type || ['basic', 'hra', 'flexi', 'special', 'broadband', 'petrol', 'lta', 'conveyance', 'medical', 'bonus'].includes(c.id))
                            .map(c => {
                                const isFixed = c.linkedTo === 'fixed';
                                const isRemainder = c.linkedTo === 'remainder';
                                const currentFreq = (salary.componentFrequencies && salary.componentFrequencies[c.id]) || c.frequency || 'monthly';
                                
                                let formulaLabel = '';
                                if (c.id === 'basic') {
                                    const pct = salary.basicPercent !== undefined && salary.basicPercent !== null && salary.basicPercent !== '' ? salary.basicPercent : basicPctDefault;
                                    formulaLabel = `${pct}% of CTC`;
                                } else if (c.id === 'hra') {
                                    const pct = salary.hraPercent !== undefined && salary.hraPercent !== null && salary.hraPercent !== '' ? salary.hraPercent : hraPctDefault;
                                    formulaLabel = `${pct}% of Basic`;
                                } else if (c.linkedTo === 'ctc_percent') {
                                    formulaLabel = `${Math.round((c.linkValue || 0) * 100)}% of CTC`;
                                } else if (c.linkedTo === 'basic_percent') {
                                    formulaLabel = `${Math.round((c.linkValue || 0) * 100)}% of Basic`;
                                } else if (isRemainder) {
                                    formulaLabel = `Calculated Remainder`;
                                }

                                const value = salary[c.id] || (c.id === 'basic' ? salary.basicMaster : c.id === 'hra' ? salary.hraMaster : c.id === 'special' || c.id === 'flexi' ? salary.specialAllowance : '0');

                                return (
                                    <div key={c.id} className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[11px] font-bold text-slate-700">
                                                {c.name} {formulaLabel && <span className="text-[10px] font-normal text-slate-500">({formulaLabel})</span>}
                                            </label>
                                            <select
                                                value={currentFreq}
                                                onChange={(e) => {
                                                    const freqs = { ...(salary.componentFrequencies || {}), [c.id]: e.target.value };
                                                    calculateSalaryBreakdown({ componentFrequencies: freqs });
                                                }}
                                                className="text-[10px] bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-700 font-semibold outline-none cursor-pointer"
                                            >
                                                <option value="monthly">Monthly</option>
                                                <option value="quarterly">Quarterly</option>
                                                <option value="semi_annually">Semi-Annually</option>
                                                <option value="annually">Annually</option>
                                            </select>
                                        </div>

                                        {isFixed ? (
                                            <input
                                                type="number"
                                                value={value || ''}
                                                onChange={(e) => calculateSalaryBreakdown({ [c.id]: e.target.value })}
                                                className="zoho-input text-xs"
                                                placeholder="0"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-between border border-slate-200 bg-white rounded-lg px-3 py-1.5 h-[34px]">
                                                <span className="text-xs font-bold text-slate-800">₹{parseFloat(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full uppercase">{currentFreq.replace('_', ' ')}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Custom Allowances Section */}
                <CustomAllowancesEditor formData={formData} calculateSalaryBreakdown={calculateSalaryBreakdown} />

                {/* Custom Deductions Section */}
                <CustomDeductionsEditor formData={formData} calculateSalaryBreakdown={calculateSalaryBreakdown} />

                {/* Additional Benefits & One-Time Pay */}
                <AdditionalBenefitsEditor formData={formData} calculateSalaryBreakdown={calculateSalaryBreakdown} />
            </div>

            {/* Right Side: Live Salary Structure Preview / Strategy Snapshot */}
            <div>
                <SalaryPreviewCard formData={formData} />
            </div>
        </div>
    );
};

export default CompensationFormSection;
