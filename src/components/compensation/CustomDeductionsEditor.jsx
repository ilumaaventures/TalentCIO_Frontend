import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const CustomDeductionsEditor = ({ formData, calculateSalaryBreakdown }) => {
    const customDeductions = formData?.salary?.customDeductions || [];

    const handleAdd = () => {
        const list = [...customDeductions, { name: '', amount: 0 }];
        calculateSalaryBreakdown({ customDeductions: list });
    };

    const handleNameChange = (idx, name) => {
        const list = [...customDeductions];
        list[idx] = { ...list[idx], name };
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
                <div>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Custom Deductions</span>
                    <span className="text-[10px] text-slate-400">Other Deductions (e.g. Car Lease, Corporate Accommodation)</span>
                </div>
                <button
                    type="button"
                    onClick={handleAdd}
                    className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
                >
                    <Plus size={12} /> Add
                </button>
            </div>

            {customDeductions.length === 0 ? (
                <div className="text-slate-400 text-xs text-center py-2 italic bg-slate-50/50 rounded-lg border border-slate-100">
                    No custom deductions defined. Click "+ Add" above to add one.
                </div>
            ) : (
                <div className="space-y-2">
                    {customDeductions.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                            <input
                                type="text"
                                placeholder="Deduction Name (e.g. Car Lease Deduction)"
                                value={item.name || ''}
                                onChange={(e) => handleNameChange(idx, e.target.value)}
                                className="zoho-input flex-1 text-xs"
                            />
                            <div className="w-36 flex items-center gap-1">
                                <span className="text-xs text-slate-400 font-semibold">₹</span>
                                <input
                                    type="number"
                                    placeholder="Monthly Amount"
                                    value={item.amount === 0 && item.amount !== '' ? 0 : (item.amount || '')}
                                    onChange={(e) => handleAmountChange(idx, e.target.value)}
                                    className="zoho-input text-xs"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => handleDelete(idx)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 cursor-pointer"
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
