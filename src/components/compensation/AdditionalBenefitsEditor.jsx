import React from 'react';

const AdditionalBenefitsEditor = ({ formData, calculateSalaryBreakdown }) => {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Additional Benefits & One-Time Pay</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Medical Ins. (Monthly)</label>
                    <input
                        type="number"
                        value={formData?.salary?.insuranceAmount || 0}
                        onChange={(e) => calculateSalaryBreakdown({ insuranceAmount: e.target.value })}
                        className="zoho-input"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Employer NPS (Monthly)</label>
                    <input
                        type="number"
                        value={formData?.salary?.employerNPS || 0}
                        onChange={(e) => calculateSalaryBreakdown({ employerNPS: e.target.value })}
                        className="zoho-input"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Joining Bonus (One-Time)</label>
                    <input
                        type="number"
                        value={formData?.salary?.joiningBonus || 0}
                        onChange={(e) => calculateSalaryBreakdown({ joiningBonus: e.target.value })}
                        className="zoho-input"
                    />
                </div>
            </div>
        </div>
    );
};

export default AdditionalBenefitsEditor;
