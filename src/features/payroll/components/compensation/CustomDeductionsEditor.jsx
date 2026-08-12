import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const CustomDeductionsEditor = ({ formData, calculateSalaryBreakdown }) => {
    const customDeductions = formData?.salary?.customDeductions || [];

    const handleAdd = () => {
        const list = [...customDeductions, { name: '', amount: 0, frequency: 'monthly' }];
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

    const handleAmountChange = (idx, val) => {
        const list = [...customDeductions];
        list[idx] = { ...list[idx], amount: val === '' ? '' : Number(val) };
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
                    className="px-2.5 py-1 text-xs font-bold bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 flex items-center gap-1 cursor-pointer"
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
                        <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-center bg-slate-50/60 p-2 rounded-lg border border-slate-200">
                            <input
                                type="text"
                                placeholder="e.g. Car Lease Deduction"
                                value={item.name || ''}
                                onChange={(e) => handleNameChange(idx, e.target.value)}
                                className="zoho-input flex-1 text-xs"
                            />
                            <select
                                value={item.frequency || 'monthly'}
                                onChange={(e) => handleFrequencyChange(idx, e.target.value)}
                                className="zoho-input text-xs w-32 font-medium bg-white text-slate-700 border-slate-200"
                            >
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="semi_annually">Semi-Annually</option>
                                <option value="annually">Annually</option>
                                <option value="one_time">One-Time</option>
                            </select>
                            <div className="w-36 flex items-center gap-1">
                                <span className="text-xs text-slate-400 font-semibold">₹</span>
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    value={item.amount === 0 && item.amount !== '' ? 0 : (item.amount || '')}
                                    onChange={(e) => handleAmountChange(idx, e.target.value)}
                                    className="zoho-input text-xs"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => handleDelete(idx)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 cursor-pointer"
                                title="Remove item"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomDeductionsEditor;
