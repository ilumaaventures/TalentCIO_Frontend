import React from 'react';
import { FileText, X, Download } from 'lucide-react';
import Button from '../../components/Button';
import { fmtMoney } from '../../utils/payroll';

const numberToWords = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if ((num = num.toString()).length > 9) return 'overflow';
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only' : 'Only';
    return str;
};

export const PayslipModal = ({ viewingPayslip, setViewingPayslip, profile, getPayslipComponents }) => {
    if (!viewingPayslip) return null;
    const comps = getPayslipComponents ? getPayslipComponents(viewingPayslip) : null;
    if (!comps) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto print:bg-white print:p-0">
            <style type="text/css" media="print">
                {`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #payslip-print-area, #payslip-print-area * {
                        visibility: visible !important;
                    }
                    #payslip-print-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                    }
                }
                `}
            </style>
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 print:shadow-none print:border-none print:my-0">
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center print:hidden">
                    <div className="flex items-center space-x-2">
                        <FileText className="text-blue-600" size={20} />
                        <h3 className="font-bold text-slate-800">Payslip Statement — {viewingPayslip.period}</h3>
                    </div>
                    <button onClick={() => setViewingPayslip(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                {/* Payslip Content (Printable) */}
                <div className="p-8 space-y-6 print:p-0 print:m-0" id="payslip-print-area">
                    {/* Company Logo & Header */}
                    <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">TALENTCIO SERVICES PVT LTD</h2>
                            <p className="text-xs text-slate-500 mt-1">102, Hitech City, Hyderabad, TS, 500081</p>
                        </div>
                        <div className="text-right">
                            <span className="bg-blue-100 text-blue-800 font-bold text-xs uppercase px-2.5 py-1 rounded-full print:border print:border-blue-800">
                                Payslip Statement
                            </span>
                            <p className="text-xs text-slate-500 mt-2">Pay Period: <strong className="text-slate-700">{viewingPayslip.period}</strong></p>
                        </div>
                    </div>

                    {/* Employee Details Grid */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs border-b border-slate-200 pb-4">
                        <div>
                            <span className="text-slate-400">Employee Name:</span> <strong className="text-slate-700 ml-1">{profile?.personal?.fullName || (profile?.user ? `${profile.user.firstName} ${profile.user.lastName}` : 'N/A')}</strong>
                        </div>
                        <div>
                            <span className="text-slate-400">Employee Code:</span> <strong className="text-slate-700 ml-1">{profile?.user?.employeeCode || 'N/A'}</strong>
                        </div>
                        <div>
                            <span className="text-slate-400">Department:</span> <strong className="text-slate-700 ml-1">{profile?.employment?.department || profile?.user?.department || 'N/A'}</strong>
                        </div>
                        <div>
                            <span className="text-slate-400">Designation:</span> <strong className="text-slate-700 ml-1">{profile?.employment?.designation || 'N/A'}</strong>
                        </div>
                        <div>
                            <span className="text-slate-400">UAN:</span> <strong className="text-slate-700 ml-1">{profile?.compensation?.uanNumber || 'N/A'}</strong>
                        </div>
                        <div>
                            <span className="text-slate-400">Bank Account No:</span> <strong className="text-slate-700 ml-1">{"XXXX" + (profile?.compensation?.bankDetails?.accountNumber || "").slice(-4)}</strong>
                        </div>
                    </div>

                    {/* Earnings & Deductions Tables */}
                    <div className="grid grid-cols-2 gap-8 text-xs">
                        {/* Earnings Column */}
                        <div className="space-y-2 border-r border-slate-200 pr-4 print:border-slate-300">
                            <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1 uppercase tracking-wider text-[10px]">Earnings</h4>
                            <div className="flex justify-between">
                                <span>Basic Salary</span>
                                <strong className="text-slate-700">{fmtMoney(comps.basic)}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span>House Rent Allowance (HRA)</span>
                                <strong className="text-slate-700">{fmtMoney(comps.hra)}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span>Flexi Allowance</span>
                                <strong className="text-slate-700">{fmtMoney(comps.flexi)}</strong>
                            </div>
                            <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-800">
                                <span>Gross Earnings</span>
                                <span>{fmtMoney(comps.gross)}</span>
                            </div>
                        </div>

                        {/* Deductions Column */}
                        <div className="space-y-2 pl-4">
                            <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1 uppercase tracking-wider text-[10px]">Deductions</h4>
                            <div className="flex justify-between">
                                <span>Employee PF Contribution</span>
                                <strong className="text-slate-700">{fmtMoney(comps.pfEmployee)}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span>ESI Contribution</span>
                                <strong className="text-slate-700">{fmtMoney(comps.esiEmployee)}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span>Professional Tax (PT)</span>
                                <strong className="text-slate-700">{fmtMoney(comps.pt)}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span>TDS (Income Tax)</span>
                                <strong className="text-slate-700">{fmtMoney(comps.tds)}</strong>
                            </div>
                            <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-800">
                                <span>Total Deductions</span>
                                <span>{fmtMoney(comps.deductions)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Net Salary Summary */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex justify-between items-center mt-6 print:border-slate-800">
                        <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Net Take-Home (Net Salary)</span>
                            <h3 className="text-lg font-bold text-blue-700 mt-1">{fmtMoney(comps.net)}</h3>
                        </div>
                        <div className="text-right max-w-xs">
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider">Amount in Words</span>
                            <p className="text-[10px] font-semibold text-slate-600 mt-1 italic leading-relaxed capitalize">{numberToWords(comps.net)}</p>
                        </div>
                    </div>

                    {/* Footer Signature Note */}
                    <div className="flex justify-between items-end pt-8 text-[9px] text-slate-400">
                        <div>
                            <p>Note: This is a computer generated payslip statement and does not require a physical signature.</p>
                        </div>
                        <div className="text-center w-32 border-t border-slate-300 pt-1">
                            <span className="text-slate-500 font-semibold uppercase">Authorized Signatory</span>
                        </div>
                    </div>
                </div>

                {/* Actions Panel */}
                <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end space-x-3 print:hidden">
                    <Button variant="ghost" onClick={() => setViewingPayslip(null)}>
                        Close
                    </Button>
                    <Button
                        onClick={() => window.print()}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center"
                    >
                        <Download size={16} className="mr-2" /> Print / Save PDF
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PayslipModal;
