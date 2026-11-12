import React from 'react';

const AdditionalBenefitsEditor = ({ formData, calculateSalaryBreakdown }) => {
    const handleCleanChange = (field, rawVal) => {
        const cleaned = String(rawVal ?? '').replace(/[^0-9.]/g, '');
        if (field === 'insuranceAmount') {
            calculateSalaryBreakdown({
                insuranceAmount: cleaned,
                insurance: cleaned,
                medical_insurance: cleaned
            });
        } else {
            calculateSalaryBreakdown({ [field]: cleaned });
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">One-Time Pay & Additional Benefits</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">One-Time & Ins.</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Joining Bonus */}
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Joining Bonus (One-Time)</label>
                    <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none pointer-events-none">
                            ₹
                        </span>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0"
                            value={formData?.salary?.joiningBonus !== undefined && formData?.salary?.joiningBonus !== null ? formData.salary.joiningBonus : ''}
                            onChange={(e) => handleCleanChange('joiningBonus', e.target.value)}
                            className="w-full pl-7 pr-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                        />
                    </div>
                </div>

                {/* Medical Insurance */}
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Medical Ins. (Monthly)</label>
                    <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none pointer-events-none">
                            ₹
                        </span>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0"
                            value={formData?.salary?.insuranceAmount !== undefined && formData?.salary?.insuranceAmount !== null ? formData.salary.insuranceAmount : ''}
                            onChange={(e) => handleCleanChange('insuranceAmount', e.target.value)}
                            className="w-full pl-7 pr-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                        />
                    </div>
                </div>

                {/* Employer NPS */}
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Employer NPS (Monthly)</label>
                    <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none pointer-events-none">
                            ₹
                        </span>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0"
                            value={formData?.salary?.employerNPS !== undefined && formData?.salary?.employerNPS !== null ? formData.salary.employerNPS : ''}
                            onChange={(e) => handleCleanChange('employerNPS', e.target.value)}
                            className="w-full pl-7 pr-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdditionalBenefitsEditor;
