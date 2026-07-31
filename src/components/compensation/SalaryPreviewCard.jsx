import React from 'react';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

const SalaryPreviewCard = ({ formData }) => {
    const salary = formData?.salary || {};
    const compType = salary.compensationType || salary.payType || 'monthly_salary';

    const handleDownloadBreakup = () => {
        const rateCardList = Array.isArray(salary.rateCard) && salary.rateCard.length > 0 ? salary.rateCard : [];
        const rateDetails = rateCardList.map(r => `Type: ${r.paymentType || 'per_unit'} | Rate: ₹${r.rate || 0} / ${r.unit || 'unit'}`).join('\n');
        const content = `Compensation Breakdown Report\n`
            + `Compensation Type: ${compType}\n`
            + `Rate Card Items:\n${rateDetails || 'None'}\n`
            + `Monthly CTC: ₹${salary.monthlyCTC || 0}\n`
            + `Annual CTC: ₹${salary.annualCTC || 0}\n`
            + `Statutory Benefits: None (Non-Salaried - Subject to TDS)\n`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, `Salary_Breakup_${compType}.txt`);
    };

    switch (compType) {
        case 'piece_rate': {
            const rateCardList = Array.isArray(salary.rateCard) && salary.rateCard.length > 0
                ? salary.rateCard
                : [{ paymentType: 'per_unit', rate: 5000, unit: 'unit' }];

            return (
                <div className="border border-slate-200/80 rounded-xl bg-white p-5 shadow-sm h-fit space-y-4 sticky top-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Piece Rate Snapshot</span>
                        <button
                            type="button"
                            onClick={handleDownloadBreakup}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <Download size={12} /> Download Breakup
                        </button>
                    </div>

                    <div className="space-y-3">
                        {rateCardList.map((item, idx) => {
                            const unitRate = parseFloat(item.rate) || 0;
                            const unitLabel = item.unit || (item.paymentType === 'per_day' ? 'day' : item.paymentType === 'per_hour' ? 'hour' : 'unit');
                            const typeLabel = item.paymentType === 'per_day' ? 'Rate per Day'
                                : item.paymentType === 'per_hour' ? 'Rate per Hour'
                                : item.paymentType === 'custom' ? `Rate per ${item.unit || 'Custom Unit'}`
                                : 'Rate per Deliverable';

                            return (
                                <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex justify-between items-center">
                                    <span className="text-xs text-slate-500 font-bold">{typeLabel}</span>
                                    <span className="text-base font-black text-indigo-700">₹{unitRate.toLocaleString('en-IN')}/{unitLabel}</span>
                                </div>
                            );
                        })}

                        <div className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pay Terms</span>
                            <p className="text-xs text-slate-700 font-medium leading-relaxed">Pay varies directly with output produced each period.</p>
                        </div>

                        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 font-medium leading-relaxed flex items-start gap-2">
                            <span>💼</span>
                            <span><strong>Non-Salaried Compensation Type:</strong> subject to TDS on total earnings, no statutory benefits (PF, ESI, PT, LWF, Gratuity).</span>
                        </div>
                    </div>
                </div>
            );
        }

        case 'hourly':
        case 'timesheet_based': {
            const rate = parseFloat(salary.hourlyRate || '0');
            const monthlyGross = parseFloat(salary.monthlyGross || salary.monthlyCTC || '0');
            const netTakeHome = parseFloat(salary.netTakeHome || '0');

            return (
                <div className="border border-slate-200/80 rounded-xl bg-white p-5 shadow-sm h-fit space-y-4 sticky top-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Hourly Rate Snapshot</span>
                        <button
                            type="button"
                            onClick={handleDownloadBreakup}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <Download size={12} /> Download Breakup
                        </button>
                    </div>

                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                            <span className="text-slate-600 font-medium">Hourly Rate</span>
                            <span className="font-bold text-slate-800">₹{rate.toLocaleString('en-IN')}/hr</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                            <span className="text-slate-600 font-medium">Estimated Monthly Hours</span>
                            <span className="font-semibold text-slate-800">160 hours</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                            <span className="text-slate-600 font-medium">Est. Monthly Gross</span>
                            <span className="font-bold text-slate-800">₹{monthlyGross.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 bg-blue-50 rounded-xl px-3 text-blue-900 border border-blue-200/80 mt-2">
                            <span className="font-bold text-xs uppercase">Est. Net Take-Home</span>
                            <span className="font-black text-base">₹{netTakeHome.toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 font-medium leading-relaxed flex items-start gap-2">
                        <span>💼</span>
                        <span><strong>Non-Salaried Compensation Type:</strong> subject to TDS on total earnings, no statutory benefits (PF, ESI, PT, LWF, Gratuity).</span>
                    </div>
                </div>
            );
        }

        case 'daily_wage': {
            const rate = parseFloat(salary.dailyRate || '0');
            const monthlyGross = parseFloat(salary.monthlyGross || salary.monthlyCTC || '0');
            const netTakeHome = parseFloat(salary.netTakeHome || '0');

            return (
                <div className="border border-slate-200/80 rounded-xl bg-white p-5 shadow-sm h-fit space-y-4 sticky top-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Daily Wage Snapshot</span>
                        <button
                            type="button"
                            onClick={handleDownloadBreakup}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <Download size={12} /> Download Breakup
                        </button>
                    </div>

                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                            <span className="text-slate-600 font-medium">Daily Rate</span>
                            <span className="font-bold text-slate-800">₹{rate.toLocaleString('en-IN')}/day</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                            <span className="text-slate-600 font-medium">Assumed Working Days</span>
                            <span className="font-semibold text-slate-800">26 days / month</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                            <span className="text-slate-600 font-medium">Est. Monthly Gross</span>
                            <span className="font-bold text-slate-800">₹{monthlyGross.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 bg-blue-50 rounded-xl px-3 text-blue-900 border border-blue-200/80 mt-2">
                            <span className="font-bold text-xs uppercase">Est. Net Take-Home</span>
                            <span className="font-black text-base">₹{netTakeHome.toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 font-medium leading-relaxed flex items-start gap-2">
                        <span>💼</span>
                        <span><strong>Non-Salaried Compensation Type:</strong> subject to TDS on total earnings, no statutory benefits (PF, ESI, PT, LWF, Gratuity).</span>
                    </div>
                </div>
            );
        }

        case 'flat_project':
        case 'project_based': {
            const fee = parseFloat(salary.projectFee || salary.monthlyCTC || '0');

            return (
                <div className="border border-slate-200/80 rounded-xl bg-white p-5 shadow-sm h-fit space-y-4 sticky top-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Project Fee Snapshot</span>
                        <button
                            type="button"
                            onClick={handleDownloadBreakup}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <Download size={12} /> Download Breakup
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-bold">Agreed Project Fee (Flat)</span>
                            <span className="text-base font-black text-slate-800">₹{fee.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payout Structure</span>
                            <p className="text-xs text-slate-700 font-medium leading-relaxed">Flat fee per project deliverable. Not annualized.</p>
                        </div>

                        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 font-medium leading-relaxed flex items-start gap-2">
                            <span>💼</span>
                            <span><strong>Non-Salaried Compensation Type:</strong> subject to TDS on total earnings, no statutory benefits (PF, ESI, PT, LWF, Gratuity).</span>
                        </div>
                    </div>
                </div>
            );
        }

        case 'milestone':
        case 'milestone_based': {
            const fee = parseFloat(salary.milestoneAmount || salary.monthlyCTC || '0');

            return (
                <div className="border border-slate-200/80 rounded-xl bg-white p-5 shadow-sm h-fit space-y-4 sticky top-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Milestone Pay Snapshot</span>
                        <button
                            type="button"
                            onClick={handleDownloadBreakup}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <Download size={12} /> Download Breakup
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-bold">Configured Milestone Rate</span>
                            <span className="text-base font-black text-slate-800">₹{fee.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payout Structure</span>
                            <p className="text-xs text-slate-700 font-medium leading-relaxed">Paid on milestone completion. Not annualized.</p>
                        </div>

                        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 font-medium leading-relaxed flex items-start gap-2">
                            <span>💼</span>
                            <span><strong>Non-Salaried Compensation Type:</strong> subject to TDS on total earnings, no statutory benefits (PF, ESI, PT, LWF, Gratuity).</span>
                        </div>
                    </div>
                </div>
            );
        }

        case 'commission_only': {
            return (
                <div className="border border-slate-200/80 rounded-xl bg-white p-5 shadow-sm h-fit space-y-4 sticky top-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Commission Snapshot</span>
                        <button
                            type="button"
                            onClick={handleDownloadBreakup}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <Download size={12} /> Download Breakup
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-bold">Base Monthly Salary</span>
                            <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Variable (Commission Only)</span>
                        </div>
                        <div className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payout Structure</span>
                            <p className="text-xs text-slate-700 font-medium leading-relaxed">Pay determined by approved commission transactions each period.</p>
                        </div>
                        {salary.commissionNotes && (
                            <div className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Commission Terms</span>
                                <p className="text-xs text-slate-700 font-medium leading-relaxed">{salary.commissionNotes}</p>
                            </div>
                        )}

                        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 font-medium leading-relaxed flex items-start gap-2">
                            <span>💼</span>
                            <span><strong>Non-Salaried Compensation Type:</strong> subject to TDS on total earnings, no statutory benefits (PF, ESI, PT, LWF, Gratuity).</span>
                        </div>
                    </div>
                </div>
            );
        }

        case 'monthly_salary':
        case 'attendance_based':
        case 'salary_plus_commission':
        case 'weekly_wage':
        case 'weekly_salary':
        default: {
            const useComponents = salary.useSalaryComponents !== false && salary.useSalaryComponents !== 'false';

            if (!useComponents) {
                const monthlyGross = parseFloat(salary.monthlyGross || salary.monthlyCTC || '0');
                const annualCTC = parseFloat(salary.annualCTC || (monthlyGross * 12) || '0');
                const netTakeHome = parseFloat(salary.netTakeHome || monthlyGross || '0');

                return (
                    <div className="border border-slate-200/80 rounded-xl bg-white p-5 shadow-sm h-fit space-y-4 sticky top-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Flat Salary Preview</span>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Non-Structured</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 mb-2">
                            <div>
                                <span className="text-[10px] text-slate-500 font-bold block uppercase">Annual CTC</span>
                                <span className="text-sm font-extrabold text-slate-800">₹{annualCTC.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500 font-bold block uppercase">Monthly Gross</span>
                                <span className="text-sm font-extrabold text-slate-800">₹{monthlyGross.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center py-2 bg-emerald-50 rounded-xl px-3 text-emerald-800 border border-emerald-200/80">
                                <span className="font-bold text-xs uppercase">Flat Monthly Salary</span>
                                <span className="font-extrabold text-base">₹{monthlyGross.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                            {(salary.customAllowances || []).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-50">
                                    <span className="text-slate-600 flex items-center gap-1.5">
                                        {item.name || 'Custom Allowance'}
                                        {item.frequency && item.frequency !== 'monthly' && (
                                            <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded uppercase border border-blue-200">
                                                {item.frequency.replace('_', '-')}
                                            </span>
                                        )}
                                    </span>
                                    <span className="font-semibold text-slate-800">₹{parseFloat(item.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                </div>
                            ))}
                            {parseFloat(salary.tds || 0) > 0 && (
                                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                    <span className="text-slate-600 font-medium">Income Tax (TDS)</span>
                                    <span className="font-semibold text-rose-600">-₹{parseFloat(salary.tds || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                </div>
                            )}
                            {(salary.customDeductions || []).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-50">
                                    <span className="text-slate-600 flex items-center gap-1.5">
                                        {item.name || 'Custom Deduction'}
                                        {item.frequency && item.frequency !== 'monthly' && (
                                            <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded uppercase border border-rose-200">
                                                {item.frequency.replace('_', '-')}
                                            </span>
                                        )}
                                    </span>
                                    <span className="font-semibold text-rose-600">₹{parseFloat(item.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center py-2.5 bg-blue-50 rounded-xl px-3 text-blue-900 border border-blue-200/80 shadow-2xs mt-2">
                                <span className="font-bold text-xs uppercase">Est. Net Take-Home</span>
                                <span className="font-black text-lg">₹{netTakeHome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                        </div>

                        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 font-medium leading-relaxed flex items-start gap-2">
                            <span>💼</span>
                            <span><strong>Non-Structured Flat Pay:</strong> Consolidated wages (100% Flat Salary) without statutory component splitting (PF, ESI, PT, LWF, Gratuity).</span>
                        </div>
                    </div>
                );
            }

            return (
                <div className="border border-slate-200/80 rounded-xl bg-white p-5 shadow-sm h-fit space-y-4 sticky top-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Salary Structure Preview</span>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">Live Estimate</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 mb-2">
                        <div>
                            <span className="text-[10px] text-slate-500 font-bold block uppercase">Annual CTC</span>
                            <span className="text-sm font-extrabold text-slate-800">₹{parseFloat(salary.annualCTC || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 font-bold block uppercase">Monthly CTC</span>
                            <span className="text-sm font-extrabold text-slate-800">₹{parseFloat(salary.monthlyCTC || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                    </div>

                    <div className="space-y-2 text-xs">
                        <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] pt-1">Earnings Component Breakdown</div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                            <span className="text-slate-600">Basic Salary</span>
                            <span className="font-semibold text-slate-800">₹{parseFloat(salary.basic || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                            <span className="text-slate-600">HRA</span>
                            <span className="font-semibold text-slate-800">₹{parseFloat(salary.hra || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                        {parseFloat(salary.specialAllowance || 0) > 0 && (
                            <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                <span className="text-slate-600">Flexi / Special Allowance</span>
                                <span className="font-semibold text-slate-800">₹{parseFloat(salary.specialAllowance || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                        )}
                        {(salary.customAllowances || []).map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-50">
                                <span className="text-slate-600 flex items-center gap-1.5">
                                    {item.name || 'Custom Allowance'}
                                    {item.frequency && item.frequency !== 'monthly' && (
                                        <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded uppercase border border-blue-200">
                                            {item.frequency.replace('_', '-')}
                                        </span>
                                    )}
                                </span>
                                <span className="font-semibold text-slate-800">₹{parseFloat(item.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                        ))}

                        <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] pt-2">Employer Statutory & Benefits</div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                            <span className="text-slate-600">PF Employer Cost</span>
                            <span className="font-semibold text-slate-800">₹{parseFloat(salary.pfEmployer || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                            <span className="text-slate-600">Gratuity Accrual</span>
                            <span className="font-semibold text-slate-800">₹{parseFloat(salary.gratuity || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>

                        <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] pt-2">Employee Statutory & Deductions</div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                            <span className="text-slate-600">Employee PF</span>
                            <span className="font-semibold text-rose-600">₹{parseFloat(salary.pfEmployee || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                            <span className="text-slate-600">Professional Tax (PT)</span>
                            <span className="font-semibold text-rose-600">₹{parseFloat(salary.professionalTax || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                        {(salary.customDeductions || []).map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-50">
                                <span className="text-slate-600 flex items-center gap-1.5">
                                    {item.name || 'Custom Deduction'}
                                    {item.frequency && item.frequency !== 'monthly' && (
                                        <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded uppercase border border-rose-200">
                                            {item.frequency.replace('_', '-')}
                                        </span>
                                    )}
                                </span>
                                <span className="font-semibold text-rose-600">₹{parseFloat(item.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                        ))}

                        <div className="pt-2 space-y-2">
                            <div className="flex justify-between items-center py-2 bg-emerald-50 rounded-xl px-3 text-emerald-800 border border-emerald-200/80">
                                <span className="font-bold text-xs uppercase">Gross Salary</span>
                                <span className="font-extrabold text-base">₹{parseFloat(salary.monthlyGross || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 bg-blue-50 rounded-xl px-3 text-blue-900 border border-blue-200/80 shadow-2xs">
                                <span className="font-bold text-xs uppercase">Est. Net Take-Home</span>
                                <span className="font-black text-lg">₹{parseFloat(salary.netTakeHome || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
    }
};

export default SalaryPreviewCard;
