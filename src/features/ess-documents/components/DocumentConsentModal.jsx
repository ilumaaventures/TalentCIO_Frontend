import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle2, ExternalLink, ShieldCheck, AlertCircle, Loader } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { acknowledgeDocument } from '../api/essDocumentApi';

const CATEGORY_STYLES = {
    Policy:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
    Form:     { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    Circular: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
    Other:    { bg: 'bg-slate-50',  text: 'text-slate-500',  border: 'border-slate-200'  }
};

const formatBytes = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const DocumentConsentModal = ({ doc, onClose, onSuccess }) => {
    const [accepted, setAccepted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !submitting) onClose();
        };
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose, submitting]);

    if (!doc) return null;

    const consentDeclaration = doc.consentDeclaration || 'I have read, understood, and accept all the details and terms outlined in this document.';
    const categoryStyle = CATEGORY_STYLES[doc.category] || CATEGORY_STYLES.Other;

    const handleConfirm = async () => {
        if (!accepted) return;
        setSubmitting(true);
        try {
            await acknowledgeDocument(doc._id, {
                consentGiven: true,
                consentText: consentDeclaration
            });
            toast.success('Policy acknowledged and consent recorded successfully.');
            onSuccess?.(doc._id);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit consent.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm px-0 sm:px-4 py-0 sm:py-8 animate-in fade-in duration-150"
        >
            <div className="w-full sm:max-w-xl max-h-[92vh] flex flex-col bg-white rounded-t-[28px] sm:rounded-[24px] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/70">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 leading-tight">Review & Accept Policy</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Formal acknowledgement & compliance consent</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded-xl p-2 text-slate-400 hover:bg-white/70 hover:text-slate-700 transition-colors"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {/* Document details card */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-slate-900 text-base leading-snug">{doc.title}</h3>
                                <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs text-slate-500">
                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}>
                                        {doc.category || 'Policy'}
                                    </span>
                                    {doc.createdAt && (
                                        <span>Published on {format(new Date(doc.createdAt), 'dd MMM yyyy')}</span>
                                    )}
                                    {doc.uploadedBy?.firstName && (
                                        <span>· by {doc.uploadedBy.firstName} {doc.uploadedBy.lastName || ''}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {doc.description && (
                            <p className="text-xs leading-relaxed text-slate-600 border-t border-slate-200/60 pt-2.5">
                                {doc.description}
                            </p>
                        )}
                    </div>

                    {/* Attachment preview / link */}
                    {doc.file?.url && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-blue-200 text-blue-600 shadow-xs">
                                        <FileText size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-bold text-slate-800">
                                            {doc.file.name || 'Policy Document Attachment'}
                                        </p>
                                        <p className="text-[11px] text-slate-500">
                                            {formatBytes(doc.file.size)} · Click view to review document before accepting
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={doc.file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 rounded-xl bg-white border border-blue-200 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors shadow-xs shrink-0"
                                >
                                    <ExternalLink size={13} /> View Document
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Notice */}
                    <div className="flex items-start gap-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 p-3 text-xs text-amber-800">
                        <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                            Your acknowledgement is officially recorded by the organization with a timestamp and audit trail. Please ensure you have thoroughly reviewed the contents.
                        </p>
                    </div>

                    {/* Consent declaration checkbox */}
                    <div className="pt-1">
                        <label
                            className={`flex items-start gap-3 cursor-pointer rounded-2xl border-2 p-4 transition-all select-none
                                ${accepted ? 'border-emerald-500 bg-emerald-50/50 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                        >
                            <div className={`mt-0.5 h-5 w-5 shrink-0 flex items-center justify-center rounded-md border-2 transition-all
                                ${accepted ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'}`}>
                                {accepted && (
                                    <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 12 12" fill="none">
                                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={accepted}
                                onChange={(e) => setAccepted(e.target.checked)}
                            />
                            <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                                {consentDeclaration}
                            </span>
                        </label>
                    </div>
                </div>

                {/* Footer actions */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!accepted || submitting}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {submitting ? (
                            <>
                                <Loader size={15} className="animate-spin" /> Submitting...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={16} /> I Accept & Acknowledge
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DocumentConsentModal;
