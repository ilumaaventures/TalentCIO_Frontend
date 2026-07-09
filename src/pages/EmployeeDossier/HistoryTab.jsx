import React from 'react';
import { format } from 'date-fns';

export const HistoryTab = ({ historyLogs }) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Activity History</h3>

            {historyLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-500">No history available</div>
            ) : (
                <div className="relative border-l border-slate-200 ml-3 space-y-8 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {historyLogs.map((log, idx) => (
                        <div key={log._id || idx} className="ml-6 relative">
                            <span className="absolute -left-[31px] bg-blue-100 h-4 w-4 rounded-full border-2 border-white ring-1 ring-blue-500"></span>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm font-semibold text-slate-800">
                                        {log.action === 'UPDATE_DOSSIER' ? `Updated ${log.details?.section || 'Dossier'}` :
                                            log.action === 'UPLOAD_DOCUMENT' ? 'Uploaded Document' :
                                                log.action === 'UPLOAD_DOCUMENT_VERSION' ? 'Uploaded Corrected Document Version' :
                                                    log.action === 'VERIFY_DOCUMENT' ? 'Verified Document' :
                                                        log.action === 'REJECT_DOCUMENT' ? 'Rejected Document' :
                                                            log.action === 'REVOKE_DOCUMENT_VERIFICATION' ? 'Revoked Document Verification' :
                                                                log.action === 'DELETE_DOCUMENT' ? 'Deleted Document' :
                                                                    log.action === 'SUBMIT_DOCUMENTS' ? 'Submitted Documents for Review' :
                                                                        log.action}
                                    </p>
                                    <span className="text-xs text-slate-400 whitespace-nowrap">
                                        {format(new Date(log.createdAt), 'dd MMM yyyy, hh:mm a')}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mb-2">
                                    by <span className="font-medium text-slate-700">
                                        {log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'Unknown'}
                                    </span>
                                </p>

                                {log.details?.updates && (
                                    <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 mt-2">
                                        <div className="font-semibold mb-1">Changes:</div>
                                        {Array.isArray(log.details.updates) ? (
                                            <span>{log.details.updates.join(', ')}</span>
                                        ) : (
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                {Object.entries(log.details.updates).map(([key, val]) => (
                                                    <li key={key}>
                                                        <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span> {val !== null && val !== undefined ? String(val) : <em className="text-slate-400">Empty</em>}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                                {log.details?.docTitle && (
                                    <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 mt-2">
                                        Document: <span className="font-medium">{log.details.docTitle}</span>
                                        {log.details?.versionNumber ? <span className="ml-2 text-slate-400">v{log.details.versionNumber}</span> : null}
                                    </div>
                                )}
                                {(log.details?.reason || log.details?.status) && (
                                    <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 mt-2 space-y-1">
                                        {log.details?.status ? (
                                            <div>Status: <span className="font-medium">{log.details.status}</span></div>
                                        ) : null}
                                        {log.details?.reason ? (
                                            <div>Reason: <span className="font-medium">{log.details.reason}</span></div>
                                        ) : null}
                                        {log.details?.newSubmissionStatus ? (
                                            <div>Submission Status: <span className="font-medium">{log.details.newSubmissionStatus}</span></div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
