import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const DeliverableRateCardEditor = ({ formData, calculateSalaryBreakdown }) => {
    const rateCard = formData?.salary?.rateCard || [];

    const handleAddItem = () => {
        const list = [...rateCard, { paymentType: 'per_unit', rate: 0, unit: 'Per Deliverable' }];
        calculateSalaryBreakdown({ rateCard: list });
    };

    const handleTypeChange = (idx, value) => {
        const list = [...rateCard];
        let defaultUnit = 'Per Deliverable';
        if (value === 'per_day') defaultUnit = 'Per Day';
        else if (value === 'per_hour') defaultUnit = 'Per Hour';
        else if (value === 'custom') defaultUnit = list[idx]?.unit && !['Per Deliverable', 'Per Day', 'Per Hour'].includes(list[idx].unit) ? list[idx].unit : '';
        
        list[idx] = { ...list[idx], paymentType: value, unit: defaultUnit };
        calculateSalaryBreakdown({ rateCard: list });
    };

    const handleRateChange = (idx, value) => {
        const list = [...rateCard];
        list[idx] = { ...list[idx], rate: value === '' ? '' : Number(value) };
        calculateSalaryBreakdown({ rateCard: list });
    };

    const handleUnitChange = (idx, value) => {
        const list = [...rateCard];
        list[idx] = { ...list[idx], unit: value };
        calculateSalaryBreakdown({ rateCard: list });
    };

    const handleDeleteItem = (idx) => {
        const list = rateCard.filter((_, i) => i !== idx);
        calculateSalaryBreakdown({ rateCard: list });
    };

    return (
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Deliverable Rate Card</span>
                <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
                >
                    <Plus size={12} /> Add Rate Card Item
                </button>
            </div>

            {rateCard.length === 0 ? (
                <div className="text-center py-3 text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-lg bg-white">
                    No rate card items added. Click "+ Add Rate Card Item" above.
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase px-1">
                        <span className="col-span-5">Type</span>
                        <span className="col-span-3">Rate (₹)</span>
                        <span className="col-span-3">Unit</span>
                        <span className="col-span-1 text-center"></span>
                    </div>
                    {rateCard.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                            <div className="col-span-5">
                                <select
                                    value={item.paymentType || 'per_unit'}
                                    onChange={(e) => handleTypeChange(idx, e.target.value)}
                                    className="zoho-input text-xs"
                                >
                                    <option value="per_unit">Per Unit / Deliverable</option>
                                    <option value="per_day">Per Day</option>
                                    <option value="per_hour">Per Hour</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            <div className="col-span-3">
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={item.rate === 0 && item.rate !== '' ? 0 : (item.rate || '')}
                                    onChange={(e) => handleRateChange(idx, e.target.value)}
                                    className="zoho-input text-xs"
                                />
                            </div>
                            <div className="col-span-3">
                                <input
                                    type="text"
                                    placeholder="Per Deliverable"
                                    value={item.unit || ''}
                                    onChange={(e) => handleUnitChange(idx, e.target.value)}
                                    className="zoho-input text-xs"
                                />
                            </div>
                            <div className="col-span-1 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => handleDeleteItem(idx)}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DeliverableRateCardEditor;
