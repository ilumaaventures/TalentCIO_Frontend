import React from 'react';
import { Mail, FileText } from 'lucide-react';
import { format } from 'date-fns';
import Skeleton from '../../components/Skeleton';

export const EmailHistoryTab = ({
    emailHistoryByTab,
    emailHistoryTab,
    setEmailHistoryTab,
    loadingEmailHistory
}) => {
    const activeEmails = emailHistoryByTab[emailHistoryTab] || [];

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 text-xs">
            <div className="flex items-center gap-3 mb-6">
                <Mail size={18} className="text-blue-600" />
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Email History</h3>
                    <p className="text-sm text-slate-500">Sent HR emails and dossier-save outcomes for this employee.</p>
                </div>
            </div>

            {/* Sub Tabs Selector */}
            <div className="mb-6 flex border-b border-slate-100 p-1 bg-slate-50 rounded-lg max-w-md">
                {[
                    { id: 'onboarding', label: 'Onboarding' },
                    { id: 'general', label: 'General' },
                    { id: 'offboarding', label: 'Offboarding' }
                ].map(subTab => (
                    <button
                        key={subTab.id}
                        type="button"
                        onClick={() => setEmailHistoryTab(subTab.id)}
                        className={`flex-1 text-center py-2 text-xs font-semibold rounded-md transition-all ${
                            emailHistoryTab === subTab.id
                                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        {subTab.label}
                    </button>
                ))}
            </div>

            {loadingEmailHistory ? (
                <div className="space-y-4">
                    {[0, 1, 2].map((item) => (
                        <Skeleton key={item} className="h-24 w-full rounded-2xl" />
                    ))}
                </div>
            ) : activeEmails.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                    No {emailHistoryTab} email history has been recorded for this employee yet.
                </div>
            ) : (
                <div className="relative ml-3 border-l border-slate-200 space-y-6">
                    {activeEmails.map((entry, index) => (
                        <div key={entry._id || index} className="relative ml-6">
                            <span className="absolute -left-[31px] h-4 w-4 rounded-full border-2 border-white bg-blue-500"></span>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <div className="text-base font-semibold text-slate-900">{entry.subject || 'Untitled email'}</div>
                                        <div className="mt-1 text-sm text-slate-500">
                                            Sent by {entry.sentBy ? `${entry.sentBy.firstName || ''} ${entry.sentBy.lastName || ''}`.trim() : 'System / HR'}
                                        </div>
                                    </div>
                                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                                        {entry.sentAt ? format(new Date(entry.sentAt), 'dd MMM yyyy, hh:mm a') : '-'}
                                    </div>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-slate-600">
                                    <div><span className="font-semibold text-slate-900">Template:</span> {entry.templateName || entry.templateId?.name || 'Custom'}</div>
                                    <div><span className="font-semibold text-slate-900">Sender:</span> {entry.emailAccountLabel || 'TalentCIO Platform'}</div>
                                    <div><span className="font-semibold text-slate-900">Recipient:</span> {entry.recipientEmail || '-'}</div>
                                    <div><span className="font-semibold text-slate-900">Dossier:</span> {entry.dossierSaved ? `Saved · ${entry.dossierCategory || 'Other'}` : `Not saved${entry.dossierSaveError ? ` · ${entry.dossierSaveError}` : ''}`}</div>
                                </div>

                                {entry.notes ? (
                                    <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                        <span className="font-semibold text-slate-900">Notes:</span> {entry.notes}
                                    </div>
                                ) : null}

                                {entry.body ? (
                                    <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-inner">
                                        <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Message Content</span>
                                        </div>
                                        <div className="p-1 bg-white">
                                            <iframe
                                                srcDoc={entry.body}
                                                title={`email-body-${entry._id}`}
                                                className="w-full min-h-[350px] border-0"
                                                sandbox="allow-popups allow-popups-to-escape-sandbox"
                                            />
                                        </div>
                                    </div>
                                ) : null}

                                {Array.isArray(entry.attachments) && entry.attachments.length > 0 ? (
                                    <div className="mt-4">
                                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Attachments</div>
                                        <div className="flex flex-wrap gap-2">
                                            {entry.attachments.map((attachment, attachmentIndex) => (
                                                attachment.cloudinaryUrl ? (
                                                    <a
                                                        key={`${attachment.filename || 'attachment'}-${attachmentIndex}`}
                                                        href={attachment.cloudinaryUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:border-blue-200 hover:bg-blue-50"
                                                    >
                                                        <FileText size={14} />
                                                        {attachment.filename || 'Attachment'}
                                                    </a>
                                                ) : (
                                                    <span
                                                        key={`${attachment.filename || 'attachment'}-${attachmentIndex}`}
                                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-500"
                                                    >
                                                        <FileText size={14} />
                                                        {attachment.filename || 'Attachment'}
                                                    </span>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
