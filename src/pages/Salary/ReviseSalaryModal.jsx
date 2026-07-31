import React from 'react';
import { History, X, Briefcase } from 'lucide-react';
import Button from '../../components/Button';
import { fmtMoney, PT_STATE_LIST } from '../../utils/payroll';

export const ReviseSalaryModal = ({
    showRevisionModal,
    setShowRevisionModal,
    revisionDraft,
    setRevisionDraft,
    handleDraftChange,
    draftSalaryPreview,
    calculating,
    payrollConfig,
    getComparisonRows,
    handleRevisionSubmit
}) => {
    if (!showRevisionModal || !revisionDraft) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center space-x-2">
                        <History className="text-blue-600" size={20} />
                        <h3 className="font-bold text-slate-800 text-lg">Revise Salary</h3>
                    </div>
                    <button onClick={() => setShowRevisionModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {/* Row 1: Strategy Engine Parameters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Salary Structure Mode *</label>
                            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => handleDraftChange('useSalaryComponents', true)}
                                    className={`py-1 px-2 rounded text-xs font-bold transition-all cursor-pointer ${revisionDraft.useSalaryComponents !== false && revisionDraft.payType !== 'flat' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200 font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    Structured
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDraftChange('useSalaryComponents', false)}
                                    className={`py-1 px-2 rounded text-xs font-bold transition-all cursor-pointer ${revisionDraft.useSalaryComponents === false || revisionDraft.payType === 'flat' ? 'bg-white text-amber-700 shadow-sm border border-slate-200 font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    Non-Structured
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Compensation Type *</label>
                            <select
                                value={revisionDraft.compensationType || (revisionDraft.payType === 'hourly' ? 'hourly' : revisionDraft.payType === 'flat' ? 'flat_project' : 'monthly_salary')}
                                onChange={(e) => {
                                    const newType = e.target.value;
                                    const defaultAttMode = newType === 'hourly' ? 'timesheet' : newType === 'piece_rate' ? 'unit_count' : ['flat_project', 'milestone', 'commission_only'].includes(newType) ? 'none' : 'attendance';
                                    const mappedPayType = newType === 'hourly' ? 'hourly' : ['flat_project', 'milestone'].includes(newType) ? 'flat' : 'salaried';
                                    const isNonStructured = ['flat_project', 'milestone', 'commission_only'].includes(newType);
                                    
                                    setRevisionDraft(prev => {
                                        const copy = {
                                            ...prev,
                                            compensationType: newType,
                                            attendanceMode: defaultAttMode,
                                            payType: mappedPayType,
                                            useSalaryComponents: isNonStructured ? false : prev.useSalaryComponents
                                        };
                                        return copy;
                                    });
                                }}
                                className="w-full border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 text-xs font-medium bg-white"
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
                            <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Attendance Mode *</label>
                            <select
                                value={revisionDraft.attendanceMode || 'attendance'}
                                onChange={(e) => handleDraftChange('attendanceMode', e.target.value)}
                                className="w-full border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 text-xs font-medium bg-white"
                            >
                                <option value="attendance">Attendance Based (paidDays / workingDays)</option>
                                <option value="timesheet">Timesheet (hours logged)</option>
                                <option value="shift">Shift Based (shifts worked)</option>
                                <option value="unit_count">Unit Count (piece rate / deliverables)</option>
                                <option value="fixed">Fixed (always full month / no proration)</option>
                                <option value="none">None (milestone / project / commission)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Employment Type</label>
                            <select
                                value={revisionDraft.employmentType}
                                onChange={(e) => handleDraftChange('employmentType', e.target.value)}
                                className="w-full border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 text-xs font-medium bg-white"
                            >
                                <option value="full-time">Full Time</option>
                                <option value="part-time">Part Time</option>
                                <option value="contract">Contract</option>
                                <option value="intern">Intern / Trainee</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Annual & Monthly CTC / Hourly Contractor / Flat Salary */}
                    {revisionDraft.payType === 'hourly' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Hourly Rate (INR)</label>
                                <input 
                                    type="number"
                                    required
                                    value={revisionDraft.hourlyRate || ''} 
                                    onChange={(e) => {
                                        const rate = e.target.value === '' ? '' : Number(e.target.value);
                                        const hours = Number(revisionDraft.hoursWorked) || 160;
                                        const monthly = rate === '' ? '' : Math.round(rate * hours * 100) / 100;
                                        setRevisionDraft(prev => ({
                                            ...prev, hourlyRate: rate, newCTC: monthly, newAnnualCTC: monthly === '' ? '' : monthly * 12
                                        }));
                                    }}
                                    placeholder="e.g. 500" 
                                    className="w-full border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 text-xs font-semibold" 
                                />
                            </div>
                            <div>
                                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Estimated Monthly Hours</label>
                                <input 
                                    type="number"
                                    required
                                    value={revisionDraft.hoursWorked || '160'} 
                                    onChange={(e) => {
                                        const hours = e.target.value === '' ? '' : Number(e.target.value);
                                        const rate = Number(revisionDraft.hourlyRate) || 0;
                                        const monthly = hours === '' ? '' : Math.round(rate * hours * 100) / 100;
                                        setRevisionDraft(prev => ({
                                            ...prev, hoursWorked: hours, newCTC: monthly, newAnnualCTC: monthly === '' ? '' : monthly * 12
                                        }));
                                    }}
                                    placeholder="e.g. 160" 
                                    className="w-full border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 text-xs font-semibold" 
                                />
                            </div>
                        </div>
                    ) : revisionDraft.payType === 'flat' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Flat Monthly Salary</label>
                                <div className="relative rounded shadow-sm">
                                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-medium">₹</span>
                                    <input 
                                        type="number"
                                        required
                                        value={revisionDraft.newCTC || ''} 
                                        onChange={(e) => {
                                            const val = e.target.value === '' ? '' : Number(e.target.value);
                                            setRevisionDraft(prev => ({
                                                ...prev, newCTC: val, newAnnualCTC: val === '' ? '' : val * 12
                                            }));
                                        }} 
                                        placeholder="e.g. 50,000" 
                                        className="w-full border border-slate-200 rounded p-2 pl-7 focus:outline-none focus:border-blue-500 text-xs font-semibold" 
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">New Annual CTC</label>
                                <div className="relative rounded shadow-sm">
                                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-medium">₹</span>
                                    <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={revisionDraft.newAnnualCTC}
                                        onChange={(e) => handleDraftChange('newAnnualCTC', e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full border border-slate-200 rounded p-2 pl-7 focus:outline-none focus:border-blue-500 font-semibold text-xs"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">New Monthly CTC</label>
                                <div className="relative rounded shadow-sm">
                                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-medium">₹</span>
                                    <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={revisionDraft.newCTC}
                                        onChange={(e) => handleDraftChange('newCTC', e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full border border-slate-200 rounded p-2 pl-7 focus:outline-none focus:border-blue-500 font-semibold text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Row 3: Effective Date & Reason */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Effective Date</label>
                            <input
                                type="date"
                                value={revisionDraft.effectiveDate}
                                onChange={(e) => handleDraftChange('effectiveDate', e.target.value)}
                                className="w-full border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 font-medium text-xs bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Reason</label>
                            <input
                                type="text"
                                placeholder="e.g. Annual Appraisal / Promotion"
                                value={revisionDraft.reason}
                                onChange={(e) => handleDraftChange('reason', e.target.value)}
                                className="w-full border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 font-medium text-xs bg-white"
                            />
                        </div>
                    </div>

                    {/* CTC Components Summary box */}
                    {(() => {
                        const preview = draftSalaryPreview || {};
                        return (
                            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <h4 className="font-bold text-slate-800 text-sm">CTC Components</h4>
                                    <span className="text-[10px] text-slate-400">Synced with payroll settings</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                    {preview.pfEmployer > 0 && (
                                        <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                            <span className="text-[10px] text-slate-500 uppercase font-semibold">PF Employer</span>
                                            <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney(preview.pfEmployer)}</strong>
                                        </div>
                                    )}
                                    {preview.gratuity > 0 && (
                                        <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                            <span className="text-[10px] text-slate-500 uppercase font-semibold">Gratuity</span>
                                            <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney(preview.gratuity)}</strong>
                                        </div>
                                    )}
                                    {preview.lwfEmployer > 0 && (
                                        <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                            <span className="text-[10px] text-slate-500 uppercase font-semibold">LWF Employer</span>
                                            <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney(preview.lwfEmployer)}</strong>
                                        </div>
                                    )}
                                    {preview.esiEmployer > 0 && (
                                        <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                            <span className="text-[10px] text-slate-500 uppercase font-semibold">ESI Employer</span>
                                            <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney(preview.esiEmployer)}</strong>
                                        </div>
                                    )}
                                    <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Annual CTC</span>
                                        <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney((Number(revisionDraft.newCTC) || 0) * 12)}</strong>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Gross Salary</span>
                                        <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney(preview.totalEarnings || preview.grossSalary || 0)}</strong>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Net Take-Home Estimate</span>
                                        <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney(preview.netTakeHome || 0)}</strong>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Statutory Components & Contribution Toggles */}
                    {revisionDraft.useSalaryComponents !== false && revisionDraft.payType !== 'flat' ? (
                        <>
                            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                                <div className="border-b border-slate-100 pb-2">
                                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                        <span>Statutory Components & Contribution Toggles</span>
                                        <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full font-bold uppercase">Statutory Toggles</span>
                                    </h4>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Enable or disable specific statutory contributions for this employee. Disabling a component will zero out its values in salary calculations immediately.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                    {/* PF Toggle */}
                                    <label className="flex flex-col border border-slate-100 rounded-xl p-3 bg-slate-50/30 cursor-pointer select-none">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-slate-700">Provident Fund (PF)</span>
                                            <input
                                                type="checkbox"
                                                checked={revisionDraft.pfEnabled}
                                                onChange={(e) => handleDraftChange('pfEnabled', e.target.checked)}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1">Both Employee & Employer PF contributions.</span>
                                    </label>

                                    {/* ESI Toggle */}
                                    <label className="flex flex-col border border-slate-100 rounded-xl p-3 bg-slate-50/30 cursor-pointer select-none">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-slate-700">State Insurance (ESI)</span>
                                            <input
                                                type="checkbox"
                                                checked={revisionDraft.esiEnabled}
                                                onChange={(e) => handleDraftChange('esiEnabled', e.target.checked)}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1">Employee State Insurance (ESI) deductions.</span>
                                    </label>

                                    {/* PT Toggle */}
                                    <div className="flex flex-col border border-slate-100 rounded-xl p-3 bg-slate-50/30">
                                        <label className="flex justify-between items-center cursor-pointer select-none">
                                            <span className="font-semibold text-slate-700">Professional Tax (PT)</span>
                                            <input
                                                type="checkbox"
                                                checked={revisionDraft.ptEnabled}
                                                onChange={(e) => handleDraftChange('ptEnabled', e.target.checked)}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                        </label>
                                        {revisionDraft.ptEnabled && (
                                            <div className="mt-2 space-y-2">
                                                <select
                                                    value={revisionDraft.ptState || 'MH'}
                                                    onChange={(e) => handleDraftChange('ptState', e.target.value)}
                                                    className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
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
                                                {revisionDraft.ptState === 'custom' && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-500">Amount (₹):</span>
                                                        <input
                                                            type="number"
                                                            value={revisionDraft.deductions?.professionalTax || 0}
                                                            onChange={(e) => handleDraftChange('deductions.professionalTax', e.target.value === '' ? '' : Number(e.target.value))}
                                                            className="w-24 text-xs rounded-lg border border-slate-200 px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* LWF Toggle */}
                                    <label className="flex flex-col border border-slate-100 rounded-xl p-3 bg-slate-50/30 cursor-pointer select-none">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-slate-700">Welfare Fund (LWF)</span>
                                            <input
                                                type="checkbox"
                                                checked={revisionDraft.lwfEnabled}
                                                onChange={(e) => handleDraftChange('lwfEnabled', e.target.checked)}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1">Labour Welfare Fund contributions.</span>
                                    </label>

                                    {/* Gratuity Toggle */}
                                    <label className="flex flex-col border border-slate-100 rounded-xl p-3 bg-slate-50/30 cursor-pointer select-none">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-slate-700">Gratuity Provision</span>
                                            <input
                                                type="checkbox"
                                                checked={revisionDraft.gratuityEnabled}
                                                onChange={(e) => handleDraftChange('gratuityEnabled', e.target.checked)}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1">Accrual of statutory gratuity amount.</span>
                                    </label>

                                    {/* TDS Toggle */}
                                    <div className="flex flex-col border border-slate-100 rounded-xl p-3 bg-slate-50/30">
                                        <div className="flex justify-between items-center cursor-pointer select-none">
                                            <span className="font-semibold text-slate-700">Income Tax (TDS)</span>
                                            <input
                                                type="checkbox"
                                                checked={revisionDraft.tdsEnabled !== false}
                                                onChange={(e) => handleDraftChange('tdsEnabled', e.target.checked)}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1">
                                            {revisionDraft.tdsEnabled !== false ? 'Subject to TDS deductions (Section 194J / 192)' : 'Disabled (₹0) — No TDS will be deducted'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Employee Salary Ratios (Overrides) */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                        <span>Employee Salary Ratios (Overrides)</span>
                                        <span className="text-[9px] bg-slate-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Optional</span>
                                    </h4>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        By default, this employee's Basic and HRA are computed using global company settings. You can set overrides below.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Basic Salary % Override</label>
                                        <div className="relative rounded shadow-sm">
                                            <input
                                                type="number"
                                                step="any"
                                                min="1"
                                                max="100"
                                                placeholder="50"
                                                value={revisionDraft.basicPercent ?? ''}
                                                onChange={(e) => handleDraftChange('basicPercent', e.target.value === '' ? null : Number(e.target.value))}
                                                className="w-full border border-slate-200 rounded p-2 pr-7 focus:outline-none focus:border-blue-500 font-semibold text-xs bg-white"
                                            />
                                            <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-semibold">%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-slate-500 font-semibold mb-1 text-[10px]">HRA % Override (of Basic)</label>
                                        <div className="relative rounded shadow-sm">
                                            <input
                                                type="number"
                                                step="any"
                                                min="1"
                                                max="100"
                                                placeholder="50"
                                                value={revisionDraft.hraPercent ?? ''}
                                                onChange={(e) => handleDraftChange('hraPercent', e.target.value === '' ? null : Number(e.target.value))}
                                                className="w-full border border-slate-200 rounded p-2 pr-7 focus:outline-none focus:border-blue-500 font-semibold text-xs bg-white"
                                            />
                                            <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-semibold">%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Salary Component Inputs */}
                            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                                <h4 className="font-bold text-slate-800 text-sm">Salary Component Inputs</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Basic */}
                                    <div>
                                        <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Basic Salary</label>
                                        <input
                                            type="number"
                                            disabled
                                            value={draftSalaryPreview?.basicMaster || 0}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded p-2 font-semibold cursor-not-allowed text-xs"
                                        />
                                    </div>
                                    {/* HRA */}
                                    {(draftSalaryPreview?.hraMaster > 0 || (revisionDraft.hraPercent && revisionDraft.hraPercent > 0)) && (
                                        <div>
                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">HRA</label>
                                            <input
                                                type="number"
                                                disabled
                                                value={draftSalaryPreview?.hraMaster || 0}
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded p-2 font-semibold cursor-not-allowed text-xs"
                                            />
                                        </div>
                                    )}
                                    {/* Special Allowance */}
                                    {payrollConfig?.salaryComponents?.some(c => c.id === 'special') && (draftSalaryPreview?.specialAllowance > 0 || draftSalaryPreview?.special > 0) && (
                                        <div>
                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Special Allowance</label>
                                            <input
                                                type="number"
                                                disabled
                                                value={draftSalaryPreview?.specialAllowance || draftSalaryPreview?.special || 0}
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded p-2 font-semibold cursor-not-allowed text-xs"
                                            />
                                        </div>
                                    )}
                                    {/* Flexi */}
                                    {(draftSalaryPreview?.flexi > 0) && (
                                        <div>
                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Flexi Allowance</label>
                                            <input
                                                type="number"
                                                disabled
                                                value={draftSalaryPreview?.flexi || 0}
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded p-2 font-semibold cursor-not-allowed text-xs"
                                            />
                                        </div>
                                    )}
                                    {/* Dynamic Fixed Earning Components */}
                                    {payrollConfig?.salaryComponents && (
                                        payrollConfig.salaryComponents
                                            .filter(c => c.type === 'earning' && c.linkedTo === 'fixed' && !['basic', 'hra'].includes(c.id))
                                            .map(c => {
                                                const rawVal = revisionDraft[c.id] !== undefined ? revisionDraft[c.id] : 0;
                                                if (Number(rawVal) <= 0) return null;
                                                return (
                                                    <div key={c.id}>
                                                        <label className="block text-slate-500 font-semibold mb-1 text-[10px]">{c.name}</label>
                                                        <input
                                                            type="number"
                                                            value={rawVal || ''}
                                                            onChange={(e) => handleDraftChange(c.id, e.target.value === '' ? '' : Number(e.target.value))}
                                                            className="w-full border border-slate-200 rounded p-2 text-xs font-semibold bg-white"
                                                        />
                                                    </div>
                                                );
                                            })
                                    )}
                                    {/* Insurance Amount */}
                                    <div>
                                        <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Insurance Amount</label>
                                        <input
                                            type="number"
                                            value={revisionDraft.insuranceAmount || ''}
                                            onChange={(e) => handleDraftChange('insuranceAmount', e.target.value === '' ? '' : Number(e.target.value))}
                                            className="w-full border border-slate-200 rounded p-2 text-xs font-semibold bg-white"
                                        />
                                    </div>
                                    {/* Employer NPS */}
                                    <div>
                                        <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Employer NPS</label>
                                        <input
                                            type="number"
                                            value={revisionDraft.employerNPS || ''}
                                            onChange={(e) => handleDraftChange('employerNPS', e.target.value === '' ? '' : Number(e.target.value))}
                                            className="w-full border border-slate-200 rounded p-2 text-xs font-semibold bg-white"
                                        />
                                    </div>
                                    {/* TDS */}
                                    <div>
                                        <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Income Tax (TDS) / Tax Amount</label>
                                        <input
                                            type="number"
                                            value={revisionDraft.deductions?.tds || ''}
                                            onChange={(e) => handleDraftChange('deductions.tds', e.target.value === '' ? '' : Number(e.target.value))}
                                            className="w-full border border-slate-200 rounded p-2 text-xs font-semibold bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-900 flex items-start space-x-3">
                            <Briefcase className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                            <div className="space-y-1">
                                <div className="font-bold text-sm text-amber-950">Non-Structured Flat Salary Mode Active</div>
                                <p className="text-amber-800 leading-relaxed">
                                    Consolidated wages (100% Flat Salary) without statutory component splitting (PF, ESI, PT, LWF, Gratuity) or ratio breakdowns.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Salary Structure Preview & Comparison Table */}
                    {(() => {
                        const rows = getComparisonRows ? getComparisonRows() : [];
                        return (
                            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                                <h4 className="font-bold text-slate-800 text-sm">Salary Structure Preview & Comparison</h4>
                                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider font-bold">
                                                <th className="px-4 py-2.5">Component</th>
                                                <th className="px-3 py-2.5 text-right">Current</th>
                                                <th className="px-3 py-2.5 text-right">Revised</th>
                                                <th className="px-4 py-2.5 text-right">Change</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {rows.map((row, idx) => {
                                                const diff = (row.revised || 0) - (row.current || 0);
                                                const isBold = row.isHeader;
                                                return (
                                                    <tr key={idx} className={`${isBold ? 'bg-slate-200/40 font-bold text-slate-900' : 'text-slate-600 hover:bg-slate-50/80'} transition-all`}>
                                                        <td className="px-4 py-2">{row.name}</td>
                                                        <td className="px-3 py-2 text-right">{fmtMoney(row.current)}</td>
                                                        <td className="px-3 py-2 text-right">{fmtMoney(row.revised)}</td>
                                                        <td className="px-4 py-2 text-right font-semibold">
                                                            {diff > 0 ? (
                                                                <span className="text-emerald-600 font-bold">+{fmtMoney(diff)}</span>
                                                            ) : diff < 0 ? (
                                                                <span className="text-rose-600 font-bold">-{fmtMoney(Math.abs(diff))}</span>
                                                            ) : (
                                                                <span className="text-slate-400 font-normal">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Sticky Footer */}
                <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end space-x-3 shrink-0">
                    <Button 
                        variant="ghost" 
                        disabled={calculating} 
                        onClick={() => setShowRevisionModal(false)}
                    >
                        Cancel
                    </Button>
                    <Button 
                        disabled={calculating} 
                        onClick={handleRevisionSubmit} 
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer"
                    >
                        {calculating ? 'Calculating...' : 'Save Revision'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ReviseSalaryModal;
