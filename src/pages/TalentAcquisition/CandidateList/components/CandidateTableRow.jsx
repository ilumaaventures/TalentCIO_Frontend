import React from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import {
    MoreVertical, Eye, FileText, Edit, ArrowRight, ArrowRightLeft, Briefcase, CheckCircle, Trash2
} from 'lucide-react';
import {
    hasReviewableApplicantProfile,
    getCandidateUploadType,
    getCandidateUploadedByName,
    hasCandidateCtcDetails,
    getDisplayInterviewRoundsForPhase,
    getInterviewStatusSummary,
    getDecisionColor
} from '../utils/candidateHelpers';

const CandidateTableRow = ({
    candidate,
    selectedCandidateId,
    isLegacyView,
    selectedCandidateIds,
    toggleCandidateSelection,
    handleSelectCandidate,
    canViewCandidateDetails,
    activePhase,
    canMakeDecisions,
    canManagePhase3Decisions,
    handleDecisionChange,
    handlePhase2DecisionChange,
    handlePhase3DecisionChange,
    setFilterPulledBy,
    setFilterUploadedBy,
    setFilterStatus,
    setFilterDecision,
    setFilterInterviewStatus,
    setOpenMultiFilter,
    toggleMenu,
    activeMenu,
    setActiveMenu,
    menuPosition,
    handleView,
    setProfileTarget,
    canEditCandidates,
    handleEdit,
    isProfileSharedCandidate,
    handleMoveToNextPhase,
    canBulkTransfer,
    openTransferModal,
    handleMoveBackToPreviousPhase,
    canTransferCandidates,
    handleTransferToOnboarding,
    canDeleteCandidates,
    handleDelete
}) => {
    const isSelected = selectedCandidateIds.includes(candidate._id);
    const displayRounds = getDisplayInterviewRoundsForPhase(candidate, activePhase);
    const statusSummary = getInterviewStatusSummary(displayRounds);

    const firstScheduledOrEvaluatedDate = displayRounds.find(r => r.scheduledDate || r.evaluatedAt);
    const formattedDate = firstScheduledOrEvaluatedDate
        ? format(new Date(firstScheduledOrEvaluatedDate.scheduledDate || firstScheduledOrEvaluatedDate.evaluatedAt), 'dd-MMM-yyyy')
        : null;

    const selectPillClass = "text-[11px] font-semibold rounded-full border border-slate-200 px-2.5 py-1 outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer w-28 text-center transition-colors shadow-2xs";

    return (
        <tr
            key={candidate._id}
            onClick={() => handleSelectCandidate(candidate._id)}
            className={`border-b border-slate-200 hover:bg-blue-50/30 transition-colors cursor-pointer ${selectedCandidateId === candidate._id ? 'bg-blue-50/60 ring-2 ring-blue-500/20' : ''}`}
        >
            {!selectedCandidateId && !isLegacyView && (
                <td className="px-3 py-2.5 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCandidateSelection(candidate._id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                </td>
            )}

            {/* Candidate Name */}
            <td className="px-3 py-2.5 align-middle">
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-xs hover:text-blue-600 transition-colors">
                        {candidate.candidateName}
                    </span>
                    {candidate.currentCompany && (
                        <span className="text-[11px] text-slate-500">{candidate.currentCompany}</span>
                    )}
                    {candidate.currentLocation && (
                        <span className="text-[10px] text-slate-400">{candidate.currentLocation}</span>
                    )}
                    {candidate.isTransferred && (
                        <span className="mt-1 inline-flex w-fit items-center rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700 border border-blue-200">
                            Transferred App
                        </span>
                    )}
                </div>
            </td>

            {/* Contact */}
            {!selectedCandidateId && (
                <td className="px-3 py-2.5 align-middle">
                    <div className="flex flex-col text-xs text-slate-600">
                        <span>{candidate.email}</span>
                        <span className="text-slate-500 text-[11px] mt-0.5">{candidate.mobile}</span>
                    </div>
                </td>
            )}

            {/* Experience */}
            {!selectedCandidateId && (
                <td className="px-3 py-2.5 align-middle">
                    <div className="flex flex-col text-xs font-bold text-slate-700">
                        <span>{candidate.totalExperience || 0} yrs</span>
                        {candidate.relevantExperience && (
                            <span className="text-[10px] font-normal text-slate-500">Rel: {candidate.relevantExperience} yrs</span>
                        )}
                    </div>
                </td>
            )}

            {/* CTC Details */}
            {!selectedCandidateId && (
                <td className="px-3 py-2.5 align-middle">
                    <div className="flex flex-col text-[11px] text-slate-600">
                        {hasCandidateCtcDetails(candidate) ? (
                            <>
                                {candidate.currentCTC !== undefined && candidate.currentCTC !== null && candidate.currentCTC !== '' && (
                                    <span>Current: {candidate.currentCTC} LPA</span>
                                )}
                                {candidate.expectedCTC !== undefined && candidate.expectedCTC !== null && candidate.expectedCTC !== '' && (
                                    <span>Expected: {candidate.expectedCTC} LPA</span>
                                )}
                                {candidate.noticePeriod !== undefined && candidate.noticePeriod !== null && candidate.noticePeriod !== '' && (
                                    <span className="text-slate-500">Notice: {candidate.noticePeriod}d</span>
                                )}
                            </>
                        ) : (
                            <span className="text-slate-400 font-bold">-</span>
                        )}
                    </div>
                </td>
            )}

            {/* Interviews */}
            {!selectedCandidateId && (
                <td className="px-3 py-2.5 align-middle">
                    <div className="flex flex-col items-center justify-center gap-0.5 min-w-28">
                        {statusSummary.label ? (
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusSummary.color}`}>
                                {statusSummary.label}
                            </span>
                        ) : (
                            <span className="text-slate-400 font-bold text-xs">-</span>
                        )}
                        <span className="text-[10px] text-slate-500">{displayRounds.length} rounds total</span>
                        {formattedDate && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-medium text-slate-600">
                                {formattedDate}
                            </span>
                        )}
                    </div>
                </td>
            )}

            {/* Decision Selector */}
            {!selectedCandidateId && (
                <td className="px-3 py-2.5 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                    {activePhase === 1 && (
                        canMakeDecisions ? (
                            <select
                                value={candidate.decision || 'None'}
                                onChange={(e) => handleDecisionChange(candidate._id, e.target.value)}
                                className={`${selectPillClass} ${getDecisionColor(candidate.decision)}`}
                            >
                                <option value="None" className="text-slate-600 font-normal">None</option>
                                <option value="Shortlisted" className="text-emerald-600 font-bold">Shortlisted</option>
                                <option value="Rejected" className="text-red-600 font-bold">Rejected</option>
                                <option value="Did Not Turn Up" className="text-rose-600 font-bold">Did Not Turn Up</option>
                                <option value="On Hold" className="text-amber-600 font-bold">On Hold</option>
                            </select>
                        ) : (
                            <span className={`text-[11px] font-bold ${getDecisionColor(candidate.decision)}`}>
                                {candidate.decision || 'None'}
                            </span>
                        )
                    )}
                    {activePhase === 2 && (
                        canMakeDecisions ? (
                            <select
                                value={candidate.phase2Decision || 'None'}
                                onChange={(e) => handlePhase2DecisionChange(candidate._id, e.target.value)}
                                className={`${selectPillClass} ${getDecisionColor(candidate.phase2Decision)}`}
                            >
                                <option value="None" className="text-slate-600 font-normal">None</option>
                                <option value="Shortlisted" className="text-emerald-600 font-bold">Shortlisted</option>
                                <option value="Selected" className="text-purple-600 font-bold">Selected</option>
                                <option value="Rejected" className="text-red-600 font-bold">Rejected</option>
                                <option value="On Hold" className="text-amber-600 font-bold">On Hold</option>
                                <option value="Did Not Turn Up" className="text-rose-600 font-bold">Did Not Turn Up</option>
                                <option value="Left in between" className="text-rose-600 font-bold">Left in between</option>
                            </select>
                        ) : (
                            <span className={`text-[11px] font-bold ${getDecisionColor(candidate.phase2Decision)}`}>
                                {candidate.phase2Decision || 'None'}
                            </span>
                        )
                    )}
                    {activePhase === 3 && (
                        canManagePhase3Decisions ? (
                            <select
                                value={candidate.phase3Decision || 'None'}
                                onChange={(e) => handlePhase3DecisionChange(candidate._id, e.target.value)}
                                className={`${selectPillClass} ${getDecisionColor(candidate.phase3Decision)}`}
                            >
                                <option value="None" className="text-slate-600 font-normal">None</option>
                                <option value="Offer Sent" className="text-blue-600 font-bold">Offer Sent</option>
                                <option value="Offer Accepted" className="text-amber-600 font-bold">Offer Accepted</option>
                                <option value="Joined" className="text-emerald-600 font-bold">Joined</option>
                                <option value="Offer Declined" className="text-rose-600 font-bold">Offer Declined</option>
                                <option value="No Show" className="text-rose-600 font-bold">No Show</option>
                                <option value="Rejected" className="text-red-600 font-bold">Rejected</option>
                                <option value="Left in between" className="text-rose-600 font-bold">Left in between</option>
                            </select>
                        ) : (
                            <span className={`text-[11px] font-bold ${getDecisionColor(candidate.phase3Decision)}`}>
                                {candidate.phase3Decision || 'None'}
                            </span>
                        )
                    )}
                </td>
            )}

            {/* Pulled / Uploaded */}
            {!selectedCandidateId && (
                <td className="px-3 py-2.5 align-middle">
                    <div className="flex flex-col text-[11px] text-slate-500">
                        <span
                            className="font-bold text-blue-600 mb-0.5 max-w-32 truncate cursor-pointer hover:underline"
                            title={candidate.profilePulledBy || '-'}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (candidate.profilePulledBy) {
                                    setFilterPulledBy([candidate.profilePulledBy]);
                                    setFilterStatus('All');
                                    setFilterDecision('All');
                                    setFilterInterviewStatus('All');
                                    setOpenMultiFilter(null);
                                }
                            }}
                        >
                            {candidate.profilePulledBy || '-'}
                        </span>
                        {getCandidateUploadedByName(candidate) ? (
                            <button
                                type="button"
                                className="w-fit text-left text-[11px] font-semibold text-blue-700 hover:underline"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFilterUploadedBy([getCandidateUploadedByName(candidate)]);
                                    setOpenMultiFilter(null);
                                }}
                                title={`Filter by uploader ${getCandidateUploadedByName(candidate)}`}
                            >
                                {getCandidateUploadedByName(candidate)}
                            </button>
                        ) : (
                            <span className="text-[11px] text-slate-400">Unknown uploader</span>
                        )}
                        <span className={`mt-0.5 w-fit rounded-full border px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wide ${getCandidateUploadType(candidate) === 'CV' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                            {getCandidateUploadType(candidate)}
                        </span>
                        {candidate.uploadedAt && (
                            <span className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                                {format(new Date(candidate.uploadedAt), 'MMM dd, yyyy hh:mm a')}
                            </span>
                        )}
                    </div>
                </td>
            )}

            {/* Actions */}
            <td className="px-3 py-2.5 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={(e) => toggleMenu(e, candidate._id)}
                    data-legacy-action-menu-trigger="true"
                    className="p-1.5 text-blue-600 hover:bg-slate-100 rounded-full transition-colors relative"
                >
                    <MoreVertical size={16} />
                </button>

                {activeMenu === candidate._id && typeof document !== 'undefined' && createPortal(
                    <div
                        data-legacy-action-menu-content="true"
                        className="fixed z-9999 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1"
                        style={menuPosition}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => {
                                handleView(candidate);
                                setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                        >
                            <Eye size={16} className="text-slate-500" />
                            View Details
                        </button>

                        {hasReviewableApplicantProfile(candidate) && (
                            <button
                                onClick={() => {
                                    setProfileTarget(candidate);
                                    setActiveMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors text-left font-semibold"
                            >
                                <Eye size={16} className="text-blue-500" />
                                Review Complete Profile
                            </button>
                        )}

                        {candidate.resumeUrl && String(candidate.resumeUrl).startsWith('http') && (
                            <a
                                href={candidate.resumeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                                onClick={() => setActiveMenu(null)}
                            >
                                <FileText size={16} className="text-slate-500" />
                                View Resume
                            </a>
                        )}

                        {canEditCandidates && (
                            <button
                                onClick={() => {
                                    handleEdit(candidate);
                                    setActiveMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                            >
                                <Edit size={16} className="text-slate-500" />
                                Edit Candidate
                            </button>
                        )}

                        {activePhase === 1 && !isProfileSharedCandidate(candidate) && canEditCandidates && (
                            <button
                                onClick={() => {
                                    handleMoveToNextPhase(candidate._id);
                                    setActiveMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 transition-colors text-left font-semibold"
                            >
                                <ArrowRight size={16} className="text-sky-500" />
                                Moved to Next Phase
                            </button>
                        )}

                        {canBulkTransfer && !isLegacyView && (
                            <button
                                onClick={() => {
                                    openTransferModal([candidate._id]);
                                    setActiveMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors text-left font-semibold"
                            >
                                <Briefcase size={16} className="text-blue-500" />
                                Transfer Candidate
                            </button>
                        )}

                        {activePhase === 2 && canEditCandidates && !candidate.isTransferredToOnboarding && (!candidate.phase3Decision || candidate.phase3Decision === 'None') && (
                            <button
                                onClick={() => {
                                    handleMoveBackToPreviousPhase(candidate._id);
                                    setActiveMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 transition-colors text-left font-semibold"
                            >
                                <ArrowRightLeft size={16} className="text-amber-500" />
                                Move Back to Previous Phase
                            </button>
                        )}

                        {((activePhase === 3 && candidate.phase3Decision && candidate.phase3Decision !== 'None') || (activePhase === 2 && candidate.phase2Decision === 'Selected')) && !candidate.isTransferredToOnboarding && canTransferCandidates && (
                            <button
                                onClick={() => {
                                    handleTransferToOnboarding(candidate._id);
                                    setActiveMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors text-left font-bold"
                            >
                                <CheckCircle size={16} className="text-emerald-500" />
                                Transfer to Onboarding
                            </button>
                        )}

                        <div className="border-t border-slate-100 my-1"></div>

                        {canDeleteCandidates && (
                            <button
                                onClick={() => {
                                    handleDelete(candidate._id);
                                    setActiveMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                            >
                                <Trash2 size={16} />
                                Delete Candidate
                            </button>
                        )}
                    </div>,
                    document.body
                )}
            </td>
        </tr>
    );
};

export default CandidateTableRow;
