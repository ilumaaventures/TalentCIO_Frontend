import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const CustomAllowancesEditor = ({ formData, calculateSalaryBreakdown }) => {
    const customAllowances = formData?.salary?.customAllowances || [];

    const handleAdd = () => {
        const list = [...customAllowances, { name: '', amount: '', frequency: 'monthly', addedInAnnualCTC: true }];
        calculateSalaryBreakdown({ customAllowances: list });
    };

    const handleNameChange = (idx, name) => {
        const list = [...customAllowances];
        list[idx] = { ...list[idx], name };
        calculateSalaryBreakdown({ customAllowances: list });
    };

    const handleFrequencyChange = (idx, frequency) => {
        const list = [...customAllowances];
        list[idx] = { ...list[idx], frequency };
        calculateSalaryBreakdown({ customAllowances: list });
    };

    const handleAmountChange = (idx, rawVal) => {
        const cleaned = String(rawVal ?? '').replace(/[^0-9.]/g, '');
        const list = [...customAllowances];
        list[idx] = { ...list[idx], amount: cleaned };
        calculateSalaryBreakdown({ customAllowances: list });
    };

    const handleAddedInCTCChange = (idx, addedInAnnualCTC) => {
        const list = [...customAllowances];
        list[idx] = { ...list[idx], addedInAnnualCTC };
        calculateSalaryBreakdown({ customAllowances: list });
    };

    const handleDelete = (idx) => {
        const list = customAllowances.filter((_, i) => i !== idx);
        calculateSalaryBreakdown({ customAllowances: list });
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Custom Allowances</span>
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">Other Earnings</span>
                </div>
                <button
                    type="button"
                    onClick={handleAdd}
                    className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                    <Plus size={12} /> Add Custom Allowance
                </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
                Define additional custom allowance types for this employee (e.g. Children Education, Uniform Allowance). Choose payout frequency (Monthly, Quarterly, Semi-Annually, Annually, or One-Time).
            </p>

            {customAllowances.length === 0 ? (
                <div className="text-slate-400 text-xs text-center py-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                    No custom allowances defined. Click "+ Add Custom Allowance" above to add one.
                </div>
            ) : (
                <div className="space-y-2">
                    {customAllowances.map((item, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-2.5 bg-slate-50/70 hover:bg-slate-50 p-2.5 rounded-xl border border-slate-200 transition-colors w-full overflow-x-auto min-w-0"
                        >
                            {/* Allowance Name */}
                            <div className="flex-1 min-w-[130px]">
                                <input
                                    type="text"
                                    placeholder="e.g. Bonus, Children Education"
                                    value={item.name || ''}
                                    onChange={(e) => handleNameChange(idx, e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs placeholder:text-slate-400"
                                />
                            </div>

                            {/* Frequency Select */}
                            <div className="w-36 shrink-0">
                                <select
                                    value={item.frequency || 'monthly'}
                                    onChange={(e) => handleFrequencyChange(idx, e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs cursor-pointer"
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="semi_annually">Semi-Annually</option>
                                    <option value="annually">Annually</option>
                                    <option value="one_time">One-Time</option>
                                </select>
                            </div>

                            {/* Amount Input with Left Rupee Prefix & generous text offset */}
                            <div className="relative w-32 shrink-0">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none pointer-events-none">
                                    ₹
                                </span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="0"
                                    value={item.amount !== undefined && item.amount !== null ? item.amount : ''}
                                    onChange={(e) => handleAmountChange(idx, e.target.value)}
                                    className="w-full pl-7 pr-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                                />
                            </div>

                            {/* In Annual CTC Checkbox Tag */}
                            <label
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer select-none text-xs font-semibold shrink-0 shadow-2xs transition-all ${item.addedInAnnualCTC !== false
                                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-800'
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                    }`}
                                title={item.addedInAnnualCTC !== false ? 'Funded from Annual CTC' : 'Additional earnings outside CTC'}
                            >
                                <input
                                    type="checkbox"
                                    checked={item.addedInAnnualCTC !== false}
                                    onChange={(e) => handleAddedInCTCChange(idx, e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <span className="whitespace-nowrap text-[11px] font-bold">
                                    {item.addedInAnnualCTC !== false ? 'In CTC' : 'Outside CTC'}
                                </span>
                            </label>

                            {/* Delete Button */}
                            <button
                                type="button"
                                onClick={() => handleDelete(idx)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 cursor-pointer shrink-0 transition-colors"
                                title="Remove allowance"
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomAllowancesEditor;
