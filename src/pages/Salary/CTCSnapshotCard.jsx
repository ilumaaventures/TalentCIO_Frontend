import React from 'react';
import { TrendingUp, Download, Info } from 'lucide-react';
import { fmtMoney } from '../../utils/payroll';

export const CTCSnapshotCard = ({ breakup, payrollConfig, handleDownloadBreakup }) => {
    if (!breakup) return null;

    const hasDynamicComponents = payrollConfig?.salaryComponents && payrollConfig.salaryComponents.length > 0;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2">
                    <TrendingUp size={20} className="text-blue-500" />
                    <h3 className="font-bold text-slate-800 text-lg">CTC Snapshot</h3>
                </div>
                <button
                    onClick={() => handleDownloadBreakup && handleDownloadBreakup(breakup)}
                    className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 flex items-center text-xs py-1.5 px-3 rounded shadow-sm transition-colors cursor-pointer"
                >
                    <Download size={14} className="mr-1.5" /> Download Breakup
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Monthly CTC</span>
                    <div className="text-2xl font-bold text-slate-800 mt-1">{fmtMoney(breakup.monthlyCTC)}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Gross Salary</span>
                    <div className="text-2xl font-bold text-slate-800 mt-1">{fmtMoney(breakup.totalEarnings)}</div>
                </div>
            </div>

            <div className="space-y-4 pt-2">
                {/* 1. Monthly Earnings Breakup */}
                <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Monthly Earnings</div>
                    <div className="space-y-2">
                        {hasDynamicComponents ? (
                            payrollConfig.salaryComponents
                                .filter(c => c.type === 'earning')
                                .map(c => {
                                    const val = breakup.earningsMap?.[c.id] !== undefined ? breakup.earningsMap[c.id] : (breakup[c.id] || 0);
                                    if (val <= 0 && c.id !== 'basic') return null;
                                    return (
                                        <div key={c.id} className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                            <span>{c.name}</span>
                                            <span className="font-semibold text-slate-800">{fmtMoney(val)}</span>
                                        </div>
                                    );
                                })
                        ) : (
                            <>
                                <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                    <span>Basic Salary</span>
                                    <span className="font-semibold text-slate-800">{fmtMoney(breakup.basicMaster)}</span>
                                </div>
                                {breakup.hraMaster > 0 && (
                                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                        <span>HRA</span>
                                        <span className="font-semibold text-slate-800">{fmtMoney(breakup.hraMaster)}</span>
                                    </div>
                                )}
                                {breakup.specialAllowance > 0 && (
                                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                        <span>Special Allowance</span>
                                        <span className="font-semibold text-slate-800">{fmtMoney(breakup.specialAllowance)}</span>
                                    </div>
                                )}
                            </>
                        )}
                        {Array.isArray(breakup.customAllowances) && breakup.customAllowances.map((item, idx) => (
                            Number(item.amount) > 0 && (
                                <div key={`custom-allowance-${idx}`} className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                    <span>{item.name} <span className="text-[10px] text-slate-400 font-normal">({(item.frequency || 'monthly').replace('_', '-')})</span></span>
                                    <span className="font-semibold text-slate-800">{fmtMoney(item.amount)}</span>
                                </div>
                            )
                        ))}
                    </div>
                </div>

                {/* 2. Employer Contributions */}
                {(breakup.pfEmployer > 0 || breakup.gratuity > 0 || breakup.esiEmployer > 0 || breakup.lwfEmployer > 0) && (
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2">Employer Contributions</div>
                        <div className="space-y-2">
                            {breakup.pfEmployer > 0 && (
                                <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                    <span>PF Employer Cost</span>
                                    <span className="font-semibold text-slate-800">{fmtMoney(breakup.pfEmployer)}</span>
                                </div>
                            )}
                            {breakup.gratuity > 0 && (
                                <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                    <span>Gratuity Accrual</span>
                                    <span className="font-semibold text-slate-800">{fmtMoney(breakup.gratuity)}</span>
                                </div>
                            )}
                            {breakup.esiEmployer > 0 && (
                                <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                    <span>ESI Employer Cost</span>
                                    <span className="font-semibold text-slate-800">{fmtMoney(breakup.esiEmployer)}</span>
                                </div>
                            )}
                            {breakup.lwfEmployer > 0 && (
                                <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                    <span>LWF Employer Cost</span>
                                    <span className="font-semibold text-slate-800">{fmtMoney(breakup.lwfEmployer)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. Employee Deductions */}
                {(breakup.pfEmployee > 0 || breakup.esiEmployee > 0 || breakup.lwfEmployee > 0 || breakup.professionalTax > 0 || breakup.tds > 0 || (Array.isArray(breakup.customDeductions) && breakup.customDeductions.some(d => Number(d.amount) > 0))) && (
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2">Employee Deductions</div>
                        <div className="space-y-2">
                            {breakup.pfEmployee > 0 && (
                                <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                    <span>Employee PF</span>
                                    <span className="font-semibold text-slate-800 text-rose-600">{fmtMoney(breakup.pfEmployee)}</span>
                                </div>
                            )}
                            {breakup.esiEmployee > 0 && (
                                <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                    <span>Employee ESI</span>
                                    <span className="font-semibold text-slate-800 text-rose-600">{fmtMoney(breakup.esiEmployee)}</span>
                                </div>
                            )}
                            {breakup.lwfEmployee > 0 && (
                                <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                    <span>Employee LWF</span>
                                    <span className="font-semibold text-slate-800 text-rose-600">{fmtMoney(breakup.lwfEmployee)}</span>
                                </div>
                            )}
                            {breakup.professionalTax > 0 && (
                                <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                    <span>Professional Tax (PT)</span>
                                    <span className="font-semibold text-slate-800 text-rose-600">{fmtMoney(breakup.professionalTax)}</span>
                                </div>
                            )}
                            {breakup.tds > 0 && (
                                <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                    <span>Income Tax (TDS)</span>
                                    <span className="font-semibold text-slate-800 text-rose-600">{fmtMoney(breakup.tds)}</span>
                                </div>
                            )}
                            {Array.isArray(breakup.customDeductions) && breakup.customDeductions.map((item, idx) => (
                                Number(item.amount) > 0 && (
                                    <div key={`custom-deduction-${idx}`} className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                        <span>{item.name} <span className="text-[10px] text-slate-400 font-normal">({(item.frequency || 'monthly').replace('_', '-')})</span></span>
                                        <span className="font-semibold text-slate-800 text-rose-600">{fmtMoney(item.amount)}</span>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-between text-base font-bold text-slate-800 bg-blue-50 px-4 py-3 rounded-lg border border-blue-100/50 mt-4">
                    <span className="flex items-center"><Info size={16} className="text-blue-500 mr-2" /> Net Take-Home</span>
                    <span className="text-blue-600">{fmtMoney(breakup.netTakeHome)}</span>
                </div>
            </div>
        </div>
    );
};

export default CTCSnapshotCard;
