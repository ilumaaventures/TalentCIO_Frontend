import React from 'react';
import { DollarSign, X } from 'lucide-react';
import Button from '../../components/Button';

export const AddPayrollModal = ({
    showPayrollModal,
    setShowPayrollModal,
    payPeriod,
    setPayPeriod,
    payNetSalary,
    setPayNetSalary,
    payStatus,
    setPayStatus,
    handleAddPayrollSubmit
}) => {
    if (!showPayrollModal) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <DollarSign className="text-blue-600" size={20} />
                        <h3 className="font-bold text-slate-800">Add Payroll History Record</h3>
                    </div>
                    <button onClick={() => setShowPayrollModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4 text-xs">
                    <div>
                        <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Pay Period *</label>
                        <input 
                            type="text"
                            placeholder="e.g. July 2026 or 2026-07"
                            value={payPeriod}
                            onChange={(e) => setPayPeriod(e.target.value)}
                            className="w-full border border-slate-200 rounded p-2.5 focus:outline-none focus:border-blue-500 font-semibold"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Net Salary Disbursed (₹) *</label>
                        <input 
                            type="number"
                            placeholder="e.g. 50000"
                            value={payNetSalary}
                            onChange={(e) => setPayNetSalary(e.target.value)}
                            className="w-full border border-slate-200 rounded p-2.5 focus:outline-none focus:border-blue-500 font-semibold"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Payment Status</label>
                        <select 
                            value={payStatus}
                            onChange={(e) => setPayStatus(e.target.value)}
                            className="w-full border border-slate-200 rounded p-2.5 focus:outline-none focus:border-blue-500 font-semibold bg-white"
                        >
                            <option value="Paid">Paid</option>
                            <option value="Processing">Processing</option>
                            <option value="Pending">Pending</option>
                        </select>
                    </div>
                </div>
                <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end space-x-3">
                    <Button variant="ghost" onClick={() => setShowPayrollModal(false)}>Cancel</Button>
                    <Button onClick={handleAddPayrollSubmit} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer">Save Record</Button>
                </div>
            </div>
        </div>
    );
};

export default AddPayrollModal;
