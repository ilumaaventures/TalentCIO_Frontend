import React from 'react';
import { format } from 'date-fns';
import { Info, CheckCircle, XCircle, Clock, X, Loader2 } from 'lucide-react';

const RegularizationRequestsView = ({ requests: rawRequests, onProcess, processingId, currentUser }) => {
    const requests = Array.isArray(rawRequests) ? rawRequests : (rawRequests?.requests || []);
    const isAdmin = currentUser?.roles?.some(r => r.name === 'Admin' || r === 'Admin');

    if (requests.length === 0) {
        return (
            <div className="text-center py-20 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <div className="h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4">
                    <Info size={32} className="text-slate-300" />
                </div>
                <h3 className="text-slate-800 font-bold">No Requests Found</h3>
                <p className="text-slate-500 text-xs mt-1">Regularization requests will appear here once submitted.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-slate-800">Regularization Requests</h3>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-full uppercase tracking-wider">
                    {requests.length} Total
                </span>
            </div>

            <div className="grid gap-4">
                {requests.map(req => {
                    const isMyRequest = req.user?._id === currentUser?._id;
                    // Manager check: identify if the current user is a reporting manager for the requester
                    const isManagerOfUser = currentUser?.directReports?.some(r =>
                        (typeof r === 'string' ? r === req.user?._id : (r._id === req.user?._id || r === req.user?._id))
                    );
                    const canProcess = !isMyRequest && (isAdmin || req.manager === currentUser?._id || req.manager?._id === currentUser?._id || isManagerOfUser) && req.status === 'PENDING';

                    return (
                        <div key={req._id} className={`bg-white border rounded-xl p-4 transition-all shadow-sm hover:shadow-md ${req.status === 'PENDING' ? 'border-amber-200 bg-amber-50/5' : 'border-slate-100'}`}>
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                                <div className="flex gap-4">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : req.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {req.status === 'APPROVED' ? <CheckCircle size={20} /> : req.status === 'REJECTED' ? <XCircle size={20} /> : <Clock size={20} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-800">{req.user?.firstName} {req.user?.lastName}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">#{req.user?.employeeCode}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                                            <span>{format(new Date(req.date), 'EEE, MMM dd')}</span>
                                            <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                                            <span className="text-blue-600 font-bold uppercase tracking-tighter">
                                                {req.type === 'PRESENT' ? 'MARK PRESENT' : req.type}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 mt-1">
                                            Sent: {format(new Date(req.createdAt), 'EEE, MMM dd yyyy')} at {format(new Date(req.createdAt), 'hh:mm a')}
                                        </div>
                                        {req.type === 'PRESENT' ? (
                                            <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-[11px] font-medium text-emerald-700">
                                                Requested action: Mark this day as present
                                            </div>
                                        ) : (
                                            <div className="mt-3 bg-white/50 border border-slate-100 rounded-lg p-2 flex gap-4 text-[10px] font-mono">
                                                {(req.type === 'IN' || req.type === 'BOTH') && req.requestedClockIn && (
                                                    <div>
                                                        <span className="text-slate-400 block mb-0.5">REQ IN</span>
                                                        <span className="text-slate-700 font-bold">{new Date(req.requestedClockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                )}
                                                {(req.type === 'OUT' || req.type === 'BOTH') && req.requestedClockOut && (
                                                    <div>
                                                        <span className="text-slate-400 block mb-0.5">REQ OUT</span>
                                                        <span className="text-slate-700 font-bold">{new Date(req.requestedClockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-start sm:items-end justify-between gap-3">
                                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {req.status}
                                    </div>

                                    {canProcess ? (
                                        <div className="flex gap-2">
                                            <button
                                                disabled={processingId === req._id}
                                                onClick={() => onProcess(req._id, 'REJECTED')}
                                                className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5"
                                            >
                                                <X size={14} /> Reject
                                            </button>
                                            <button
                                                disabled={processingId === req._id}
                                                onClick={() => onProcess(req._id, 'APPROVED')}
                                                className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm rounded-lg transition-colors flex items-center gap-1.5"
                                            >
                                                {processingId === req._id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Approve
                                            </button>
                                        </div>
                                    ) : (
                                        req.status !== 'PENDING' && (
                                            <div className="text-[10px] text-slate-400 italic flex items-center gap-1">
                                                {req.status === 'APPROVED' ? 'Approved by' : 'Rejected by'} {req.approvedBy?.firstName || req.manager?.firstName || 'Manager'}
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-50 flex items-start gap-2">
                                <Info size={14} className="text-slate-300 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-slate-600 italic leading-relaxed">
                                    "{req.reason}"
                                </div>
                            </div>
                            {req.rejectionReason && (
                                <div className="mt-2 p-2 bg-red-50 text-red-600 text-[10px] rounded border border-red-100 italic">
                                    Rejection: {req.rejectionReason}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RegularizationRequestsView;

