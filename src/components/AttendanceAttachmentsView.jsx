import React, { useRef } from 'react';
import { Download, Trash2, Info, Loader2, Calendar, Send, CheckCircle, XCircle, Edit2 } from 'lucide-react';

const AttendanceAttachmentsView = ({ attachments, loading, onUpload, onDelete, isReadOnly, monthName, onSubmit, onApprove, onReject, canApprove, onReplace }) => {
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onUpload(file);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-500 mb-3" size={32} />
                <p className="text-slate-500 text-sm">Loading documents...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Support Documents</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Documents for {monthName}</p>
                </div>
                {!isReadOnly && (
                    <>
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                        >
                            <Download size={16} /> Upload New
                        </button>
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {attachments?.files?.length > 0 ? (
                    attachments.files.map((file) => (
                        <div key={file._id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col hover:shadow-md transition-shadow group relative">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-blue-500 transition-colors">
                                        <Info size={24} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                            file.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                            file.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                            file.status === 'Submitted' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-slate-100 text-slate-700'
                                        }`}>
                                            {file.status || 'Pending'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {(!isReadOnly && (!file.status || file.status === 'Pending' || file.status === 'Rejected')) && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSubmit && onSubmit(file._id); }}
                                            className="p-1.5 text-blue-500 hover:text-white hover:bg-blue-600 rounded mb-1 transition-all"
                                            title="Submit for Approval"
                                        >
                                            <Send size={16} />
                                        </button>
                                    )}
                                    {(canApprove && file.status === 'Submitted') && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onApprove && onApprove(file._id); }}
                                                className="p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded transition-all"
                                                title="Approve"
                                            >
                                                <CheckCircle size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault(); e.stopPropagation();
                                                    const reason = window.prompt("Reason for rejection:");
                                                    if (reason !== null) onReject && onReject(file._id, reason);
                                                }}
                                                className="p-1.5 text-red-500 hover:text-white hover:bg-red-600 rounded transition-all"
                                                title="Reject"
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        </>
                                    )}
                                    {(!isReadOnly && file.status !== 'Approved' && file.status !== 'Submitted') && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(file._id); }}
                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    {(onReplace && !isReadOnly && file.status === 'Rejected') && (
                                        <>
                                            <input
                                                type="file"
                                                className="hidden"
                                                id={`replace-file-${file._id}`}
                                                onChange={(e) => {
                                                    const newFile = e.target.files[0];
                                                    if (newFile) onReplace(file._id, newFile);
                                                    e.target.value = '';
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); document.getElementById(`replace-file-${file._id}`).click(); }}
                                                className="p-1.5 text-orange-500 hover:text-white hover:bg-orange-500 rounded transition-all"
                                                title="Replace File"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            {file.rejectionReason && (
                                <p className="text-xs text-red-600 bg-red-50 p-2 rounded mb-3 border border-red-100">
                                    <strong>Reason:</strong> {file.rejectionReason}
                                </p>
                            )}
                            <h4 className="font-bold text-slate-800 text-sm truncate mb-1" title={file.name}>
                                {file.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 mb-4">
                                Uploaded on {new Date(file.uploadedAt).toLocaleDateString()}
                            </p>
                            <div className="mt-auto flex gap-2">
                                <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-100"
                                >
                                    View
                                </a>
                                <a
                                    href={`${file.url.replace('/upload/', '/upload/fl_attachment/')}`}
                                    download={file.name}
                                    className="px-3 flex items-center justify-center bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-all border border-slate-100"
                                >
                                    <Download size={14} />
                                </a>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-center opacity-50">
                        <Calendar size={48} className="text-slate-200 mb-3" />
                        <h4 className="text-slate-800 font-bold mb-1">No Documents Uploaded</h4>
                        <p className="text-xs text-slate-500">Documents uploaded for this month will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceAttachmentsView;
