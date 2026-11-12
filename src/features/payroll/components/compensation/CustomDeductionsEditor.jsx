import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const CustomDeductionsEditor = ({ formData, calculateSalaryBreakdown }) => {
    const customDeductions = formData?.salary?.customDeductions || [];

    const handleAdd = () => {
        const list = [...customDeductions, { name: '', amount: '', frequency: 'monthly' }];
        calculateSalaryBreakdown({ customDeductions: list });
    };

    const handleNameChange = (idx, name) => {
        const list = [...customDeductions];
        list[idx] = { ...list[idx], name };
        calculateSalaryBreakdown({ customDeductions: list });
    };

    const handleFrequencyChange = (idx, frequency) => {
        const list = [...customDeductions];
        list[idx] = { ...list[idx], frequency };
        calculateSalaryBreakdown({ customDeductions: list });
    };

    const handleAmountChange = (idx, rawVal) => {
        const cleaned = String(rawVal ?? '').replace(/[^0-9.]/g, '');
        const list = [...customDeductions];
        list[idx] = { ...list[idx], amount: cleaned };
        calculateSalaryBreakdown({ customDeductions: list });
    };

    const handleDelete = (idx) => {
        const list = customDeductions.filter((_, i) => i !== idx);
        calculateSalaryBreakdown({ customDeductions: list });
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Custom Deductions</span>
                    <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">Other Deductions</span>
                </div>
                <button
                    type="button"
                    onClick={handleAdd}
                    className="px-2.5 py-1 text-xs font-bold bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 flex items-center gap-1 cursor-pointer transition-colors"
                >
                    <Plus size={12} /> Add Custom Deduction
                </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
                Define additional custom deductions for this employee (e.g. Car Lease, Corporate Accommodation). Choose deduction frequency (Monthly, Quarterly, Semi-Annually, Annually, or One-Time).
            </p>

            {customDeductions.length === 0 ? (
                <div className="text-slate-400 text-xs text-center py-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                    No custom deductions defined. Click "+ Add Custom Deduction" above to add one.
                </div>
            ) : (
                <div className="space-y-2">
                    {customDeductions.map((item, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-2 bg-slate-50/70 hover:bg-slate-50 p-2 rounded-xl border border-slate-200 transition-colors w-full"
                        >
                            {/* Deduction Name */}
                            <div className="flex-1 min-w-[120px]">
                                <input
                                    type="text"
                                    placeholder="e.g. Car Lease Deduction"
                                    value={item.name || ''}
                                    onChange={(e) => handleNameChange(idx, e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs placeholder:text-slate-400"
                                />
                            </div>

                            {/* Frequency Select */}
                            <div className="w-32 sm:w-36 shrink-0">
                                <select
                                    value={item.frequency || 'monthly'}
                                    onChange={(e) => handleFrequencyChange(idx, e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs cursor-pointer"
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="semi_annually">Semi-Annually</option>
                                    <option value="annually">Annually</option>
                                    <option value="one_time">One-Time</option>
                                </select>
                            </div>

                            {/* Amount Input with Left Rupee Prefix & generous text offset */}
                            <div className="relative w-28 sm:w-32 shrink-0">
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
                                    className="w-full pl-7 pr-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs"
                                />
                            </div>

                            {/* Delete Button */}
                            <button
                                type="button"
                                onClick={() => handleDelete(idx)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 cursor-pointer shrink-0 transition-colors"
                                title="Remove deduction"
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

export default CustomDeductionsEditor;
