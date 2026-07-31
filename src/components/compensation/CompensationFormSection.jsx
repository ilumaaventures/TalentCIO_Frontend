import React, { useState } from 'react';
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

const CompensationFormSection = ({ formData, calculateSalaryBreakdown }) => {
    const [ctcPeriod, setCtcPeriod] = useState('monthly');
    const salary = formData?.salary || {};
    const compType = salary.compensationType || 'monthly_salary';
    const isSalaried = compType === 'monthly_salary' || compType === 'stipend_intern';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Side: Parameters & Configuration */}
            <div className="lg:col-span-2 space-y-4">
                {/* Strategy Engine Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Salary & Compensation Details</span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">Strategy Engine</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                    value={salary.hoursWorked || '160'}
                                    onChange={(e) => calculateSalaryBreakdown({ hoursWorked: e.target.value })}
                                    placeholder="e.g. 160"
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
                                placeholder="e.g. 1,000"
                                className="zoho-input"
                            />
                        </div>
                    ) : compType === 'weekly_wage' ? (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Weekly Salary (₹/week) *</label>
                            <input
                                type="number"
                                min="0"
                                value={salary.weeklyRate || ''}
                                onChange={(e) => calculateSalaryBreakdown({ weeklyRate: e.target.value })}
                                placeholder="e.g. 7,500"
                                className="zoho-input"
                            />
                        </div>
                    ) : compType === 'flat_project' ? (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Flat Project Fee (₹) *</label>
                            <input
                                type="number"
                                min="0"
                                value={salary.projectFee || ''}
                                onChange={(e) => calculateSalaryBreakdown({ projectFee: e.target.value })}
                                placeholder="e.g. 50,000"
                                className="zoho-input"
                            />
                        </div>
                    ) : compType === 'milestone' ? (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Default Milestone Amount (₹)</label>
                            <input
                                type="number"
                                min="0"
                                value={salary.milestoneAmount || ''}
                                onChange={(e) => calculateSalaryBreakdown({ milestoneAmount: e.target.value })}
                                placeholder="e.g. 25,000"
                                className="zoho-input"
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                {ctcPeriod === 'monthly' ? 'Monthly CTC *' : 'Annual CTC *'}
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={
                                    ctcPeriod === 'monthly'
                                        ? (salary.monthlyCTC || '')
                                        : (salary.annualCTC || '')
                                }
                                onChange={(e) => {
                                    const inputVal = e.target.value;
                                    if (ctcPeriod === 'annual') {
                                        calculateSalaryBreakdown({ annualCTC: inputVal });
                                    } else {
                                        calculateSalaryBreakdown({ monthlyCTC: inputVal });
                                    }
                                }}
                                placeholder={ctcPeriod === 'monthly' ? 'e.g. 50,000' : 'e.g. 6,00,000'}
                                className="zoho-input"
                            />
                        </div>
                    )}

                    {compType === 'commission_only' && (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Commission Structure Notes</label>
                            <textarea
                                rows={2}
                                value={salary.commissionNotes || ''}
                                onChange={(e) => calculateSalaryBreakdown({ commissionNotes: e.target.value })}
                                placeholder="Describe commission terms, target thresholds, percentage tiers..."
                                className="zoho-input"
                            />
                        </div>
                    )}

                    {compType === 'piece_rate' && (
                        <DeliverableRateCardEditor formData={formData} calculateSalaryBreakdown={calculateSalaryBreakdown} />
                    )}
                </div>

                {/* Salary Ratios (Overrides) */}
                {isSalaried && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                        <div className="border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Employee Salary Ratios (Overrides)</span>
                            <p className="text-[10px] text-slate-400">Set employee-specific ratio overrides. Defaults apply when left empty.</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">Basic Salary %</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={salary.basicPercent !== undefined && salary.basicPercent !== null ? salary.basicPercent : '50'}
                                    onChange={(e) => calculateSalaryBreakdown({ basicPercent: e.target.value })}
                                    className="zoho-input"
                                    placeholder="50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">HRA % (of Basic)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={salary.hraPercent !== undefined && salary.hraPercent !== null ? salary.hraPercent : '50'}
                                    onChange={(e) => calculateSalaryBreakdown({ hraPercent: e.target.value })}
                                    className="zoho-input"
                                    placeholder="50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">VPF % (of Basic)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={salary.vpfPercent !== undefined && salary.vpfPercent !== null ? salary.vpfPercent : '0'}
                                    onChange={(e) => calculateSalaryBreakdown({ vpfPercent: e.target.value })}
                                    className="zoho-input"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Statutory Toggles */}
                {isSalaried && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
                        <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Statutory Components & Contribution Toggles</span>
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">Statutory Toggles</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* PF Card */}
                            <div className="flex flex-col gap-2 p-3 bg-slate-50/50 border border-slate-200 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-800">Provident Fund (PF)</span>
                                    <input
                                        type="checkbox"
                                        checked={parseBool(salary.pfEnabled, true)}
                                        onChange={(e) => calculateSalaryBreakdown({ pfEnabled: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                    />
                                </div>
                                {parseBool(salary.pfEnabled, true) && (
                                    <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-1">
                                        <span className="text-[10px] text-slate-500">Include Employer PF in CTC</span>
                                        <input
                                            type="checkbox"
                                            checked={!!salary.includePfInCTC}
                                            onChange={(e) => calculateSalaryBreakdown({ includePfInCTC: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Gratuity Card */}
                            <div className="flex flex-col gap-2 p-3 bg-slate-50/50 border border-slate-200 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-800">Gratuity Accrual</span>
                                    <input
                                        type="checkbox"
                                        checked={parseBool(salary.gratuityEnabled, true)}
                                        onChange={(e) => calculateSalaryBreakdown({ gratuityEnabled: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                    />
                                </div>
                                {parseBool(salary.gratuityEnabled, true) && (
                                    <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-1">
                                        <span className="text-[10px] text-slate-500">Include Gratuity in CTC</span>
                                        <input
                                            type="checkbox"
                                            checked={parseBool(salary.includeGratuityInCTC, true)}
                                            onChange={(e) => calculateSalaryBreakdown({ includeGratuityInCTC: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* ESI Card */}
                            <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-200 rounded-xl">
                                <span className="text-xs font-semibold text-slate-800">State Insurance (ESI)</span>
                                <input
                                    type="checkbox"
                                    checked={parseBool(salary.esiEnabled, true)}
                                    onChange={(e) => calculateSalaryBreakdown({ esiEnabled: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                />
                            </div>

                            {/* LWF Card */}
                            <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-200 rounded-xl">
                                <span className="text-xs font-semibold text-slate-800">Labour Welfare Fund (LWF)</span>
                                <input
                                    type="checkbox"
                                    checked={parseBool(salary.lwfEnabled, true)}
                                    onChange={(e) => calculateSalaryBreakdown({ lwfEnabled: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* PT Card */}
                        <div className="flex flex-col gap-3 p-3 bg-slate-50/50 border border-slate-200 rounded-xl">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-800">Professional Tax (PT)</span>
                                <input
                                    type="checkbox"
                                    checked={parseBool(salary.ptEnabled, true)}
                                    onChange={(e) => calculateSalaryBreakdown({ ptEnabled: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                />
                            </div>
                            {parseBool(salary.ptEnabled, true) && (
                                <div className="flex gap-2 items-center border-t border-slate-200 pt-2 mt-1">
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
                                        <div className="w-[100px] flex items-center gap-1">
                                            <span className="text-[11px] text-slate-500">₹</span>
                                            <input
                                                type="number"
                                                value={salary.professionalTax || 0}
                                                onChange={(e) => calculateSalaryBreakdown({ professionalTax: e.target.value })}
                                                className="w-full p-1.5 border border-slate-300 rounded-lg text-xs outline-none text-slate-700"
                                                placeholder="Amount"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Income Tax (TDS) Card */}
                        <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-200 rounded-xl">
                            <div>
                                <span className="text-xs font-semibold text-slate-800">Income Tax (TDS)</span>
                                <span className="block text-[10px] text-slate-400">Enable Income Tax TDS deductions</span>
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

                <CustomAllowancesEditor formData={formData} calculateSalaryBreakdown={calculateSalaryBreakdown} />
                <CustomDeductionsEditor formData={formData} calculateSalaryBreakdown={calculateSalaryBreakdown} />
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
