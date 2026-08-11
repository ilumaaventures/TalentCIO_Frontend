import React from 'react';
import { X, CheckCircle, Calendar, ThumbsUp, ThumbsDown, AlertCircle, Clock, XCircle } from 'lucide-react';

const DecisionConfirmationModal = ({ isOpen, onClose, onConfirm, candidateName, decision }) => {
    if (!isOpen) return null;

    // Configuration based on decision type
    let config = {
        title: 'Confirm Action',
        themeColor: 'emerald',
        iconBg: 'bg-emerald-100 text-emerald-600',
        confirmBtnBg: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100',
        confirmBtnText: 'Confirm',
        Icon: ThumbsUp,
        highlights: []
    };

    if (decision === 'Shortlisted') {
        config = {
            title: 'Shortlist Candidate',
            themeColor: 'emerald',
            iconBg: 'bg-emerald-100 text-emerald-600 border-emerald-200',
            confirmBtnBg: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100',
            confirmBtnText: 'Confirm Shortlist',
            Icon: ThumbsUp,
            highlights: [
                {
                    title: 'Auto-Mark Interested',
                    desc: "Status will automatically be updated to 'Interested' and logged in history.",
                    Icon: CheckCircle,
                    iconColor: 'text-blue-600'
                },
                {
                    title: 'Auto-Schedule Interview',
                    desc: 'An interview round will be scheduled automatically in Phase 1 based on your workflow template.',
                    Icon: Calendar,
                    iconColor: 'text-indigo-600'
                }
            ],
            alertText: 'This change will unlock interview scheduling immediately.'
        };
    } else if (decision === 'Rejected') {
        config = {
            title: 'Reject Candidate',
            themeColor: 'red',
            iconBg: 'bg-red-100 text-red-600 border-red-200',
            confirmBtnBg: 'bg-red-600 hover:bg-red-700 shadow-red-100',
            confirmBtnText: 'Confirm Rejection',
            Icon: ThumbsDown,
            highlights: [
                {
                    title: 'Disqualify Candidate',
                    desc: "The candidate's decision will be set to 'Rejected' and Phase 1 process stops.",
                    Icon: XCircle,
                    iconColor: 'text-red-600'
                },
                {
                    title: 'Status Audit Logs',
                    desc: 'Status history will record this rejection for recruitment conversion metrics.',
                    Icon: CheckCircle,
                    iconColor: 'text-slate-600'
                }
            ],
            alertText: 'This will stop any active evaluations for this candidate.'
        };
    } else if (decision === 'Did Not Turn Up') {
        config = {
            title: 'Mark as Did Not Turn Up',
            themeColor: 'rose',
            iconBg: 'bg-rose-100 text-rose-600 border-rose-200',
            confirmBtnBg: 'bg-rose-600 hover:bg-rose-700 shadow-rose-100',
            confirmBtnText: 'Confirm No Show',
            Icon: Clock,
            highlights: [
                {
                    title: 'No Show Status',
                    desc: "The candidate's decision will be updated to 'Did Not Turn Up'.",
                    Icon: Clock,
                    iconColor: 'text-rose-600'
                },
                {
                    title: 'Activity History',
                    desc: 'Logs this change for requisition audit history and candidate response metrics.',
                    Icon: CheckCircle,
                    iconColor: 'text-slate-600'
                }
            ],
            alertText: 'This candidate can be reassigned or re-contacted later.'
        };
    }

    const { title, iconBg, confirmBtnBg, confirmBtnText, Icon, highlights, alertText } = config;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div 
                className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 transition-all transform scale-100"
                role="dialog"
                aria-modal="true"
            >
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-full bg-slate-50 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200 z-10"
                    aria-label="Close"
                >
                    <X size={14} />
                </button>

                {/* Horizontal Grid Layout */}
                <div className="grid md:grid-cols-[0.3fr_0.7fr]">
                    
                    {/* Left Column: Confirmation Header */}
                    <div className="bg-slate-50/50 px-6 py-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner ${iconBg}`}>
                            <Icon size={24} className="animate-bounce" />
                        </div>
                        <h3 className="mt-3 text-base font-bold text-slate-800 text-center">{title}</h3>
                        <p className="mt-1 text-[13px] text-slate-500 text-center">
                            Confirm action for <span className="font-semibold text-slate-700 block mt-0.5">{candidateName || 'this candidate'}</span>
                        </p>
                    </div>

                    {/* Right Column: Information Content */}
                    <div className="p-6 flex flex-col justify-between">
                        
                        {/* Automation Highlights */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {highlights.map((h, i) => {
                                    const HIcon = h.Icon;
                                    return (
                                        <div key={i} className="flex gap-2.5">
                                            <div className={`mt-0.5 shrink-0 ${h.iconColor}`}>
                                                <HIcon size={14} />
                                            </div>
                                            <div className="text-[12px]">
                                                <p className="font-bold text-slate-800">{h.title}</p>
                                                <p className="text-slate-500 mt-0.5 leading-relaxed">
                                                    {h.desc}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {alertText && (
                                <div className="flex items-center gap-2 text-[11px] text-amber-600 bg-amber-50/50 rounded-xl px-3 py-2 border border-amber-100/50">
                                    <AlertCircle size={12} className="shrink-0" />
                                    <span>{alertText}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer Buttons */}
                        <div className="mt-6 flex gap-3 justify-end border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                className={`rounded-xl px-5 py-2 text-xs font-semibold text-white transition-all duration-200 ${confirmBtnBg}`}
                            >
                                {confirmBtnText}
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default DecisionConfirmationModal;
