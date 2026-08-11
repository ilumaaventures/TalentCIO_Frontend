import React from 'react';
import { Search, CheckCircle, X, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getStatusBadge } from './HrisTab';

export const HrisRequestsTab = ({
    hrisRequests,
    loadingRequests,
    hrisSearchTerm,
    setHrisSearchTerm,
    handleHRISApproveOther,
    handleHRISRejectOther,
    handleExcelExport
}) => {
    const navigate = useNavigate();

    const filtered = hrisRequests.filter(req =>
        `${req.firstName} ${req.lastName}`.toLowerCase().includes(hrisSearchTerm.toLowerCase()) ||
        req.employeeCode?.toLowerCase().includes(hrisSearchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 text-xs">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">EIS Requests Management</h3>
                        <p className="text-sm text-slate-500">View and manage EIS submissions history</p>
                    </div>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={hrisSearchTerm}
                            onChange={(e) => setHrisSearchTerm(e.target.value)}
                            placeholder="Search by name or code..."
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none w-64"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-lg text-xs">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-4 py-3">Employee</th>
                                <th className="px-4 py-3">Dept</th>
                                <th className="px-4 py-3">Submitted</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loadingRequests ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-10 text-center">
                                        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                                        <p className="text-slate-500">Fetching requests...</p>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-10 text-center text-slate-500 italic">
                                        No EIS requests found
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(req => (
                                    <tr key={req._id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-800">{req.firstName} {req.lastName}</div>
                                            <div className="text-[11px] text-slate-500 font-medium">{req.employeeCode}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{req.department || '-'}</td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {req.employeeProfile?.hris?.submittedAt ? format(new Date(req.employeeProfile.hris.submittedAt), 'dd MMM yyyy') : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="scale-75 origin-left w-32">
                                                {getStatusBadge(req.employeeProfile?.hris?.status)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                {req.employeeProfile?.hris?.status === 'Pending Approval' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleHRISApproveOther(req._id)}
                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleHRISRejectOther(req._id)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                            title="Reject"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        navigate(`/dossier/${req._id}?tab=hris`);
                                                    }}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="View Form"
                                                >
                                                    <FileText size={18} className="pointer-events-none" />
                                                </button>
                                                <button
                                                    onClick={() => handleExcelExport(req)}
                                                    className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
                                                    title="Download Excel"
                                                >
                                                    <Download size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
