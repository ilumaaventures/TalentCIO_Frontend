import React from 'react';

const AdditionalBenefitsEditor = ({ formData, calculateSalaryBreakdown }) => {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">One-Time Pay & Additional Benefits</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">One-Time & Ins.</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Joining Bonus (One-Time)</label>
                    <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData?.salary?.joiningBonus || ''}
                        onChange={(e) => calculateSalaryBreakdown({ joiningBonus: e.target.value })}
                        className="zoho-input text-xs"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Medical Ins. (Monthly)</label>
                    <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData?.salary?.insuranceAmount || ''}
                        onChange={(e) => calculateSalaryBreakdown({ insuranceAmount: e.target.value })}
                        className="zoho-input text-xs"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Employer NPS (Monthly)</label>
                    <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData?.salary?.employerNPS || ''}
                        onChange={(e) => calculateSalaryBreakdown({ employerNPS: e.target.value })}
                        className="zoho-input text-xs"
                    />
                </div>
            </div>
        </div>
    );
};

export default AdditionalBenefitsEditor;
