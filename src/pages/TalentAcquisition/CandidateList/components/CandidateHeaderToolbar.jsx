import React from 'react';
import {
    Calendar, Menu, Download, Mail, ArrowRightLeft, ArrowRight, CheckCircle,
    ChevronDown, FileText, Upload, Plus, BarChart3
} from 'lucide-react';
import {
    createdDatePresetOptions
} from '../CandidateListConstants';
import {
    getCreatedDatePresetLabel
} from '../utils/candidateHelpers';

const CandidateHeaderToolbar = ({
    activePhase,
    handlePhaseChange,
    filterInterviewStatus,
    filterInterviewRound,
    setFilterStatus,
    setFilterDecision,
    setFilterInterviewStatus,
    setFilterTransferred,
    setFilterProfileShared,
    setFilterInterviewRound,
    metrics,
    phase2Metrics,
    createdDatePreset,
    setCreatedDatePreset,
    dateFilterField,
    setDateFilterField,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    showCreatedDateSortMenu,
    setShowCreatedDateSortMenu,
    applyCreatedDatePreset,
    showToolbarMenu,
    setShowToolbarMenu,
    handleExportExcel,
    canMassMail,
    isLegacyView,
    openMassMailModal,
    selectedCandidateIds,
    serverResultCount,
    candidates,
    canBulkTransfer,
    openTransferModal,
    canEditCandidates,
    openMassInterviewModal,
    handleBulkMoveToNextPhase,
    canMakeDecisions,
    showDecisionSubmenu,
    setShowDecisionSubmenu,
    decisionOptions,
    handleBulkDecisionChange,
    canManageTemplates,
    navigate,
    canCreateCandidates,
    setShowBulkResumeImport,
    canImportCandidates,
    setShowBulkImport,
    hiringRequestId,
    requestMeta,
    handleAddNew,
    roundSummary
}) => {
    const phaseToggleButtonClass = 'min-w-[84px] rounded-[10px] px-4 py-2.5 text-sm font-semibold transition-all duration-200';
    const toolbarMenuButtonClass = 'inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50';
    const toolbarMenuItemClass = 'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50';

    const scheduledCount = React.useMemo(() => {
        if (filterInterviewRound && filterInterviewRound.trim() !== '') {
            const target = filterInterviewRound.trim().toLowerCase();
            const phaseNum = Number(activePhase || 1);
            const summaryData = phaseNum === 2 ? roundSummary?.phase2 : roundSummary?.phase1;

            if (Array.isArray(summaryData)) {
                const item = summaryData.find(r => String(r?.levelName || '').trim().toLowerCase() === target);
                if (item && item.count !== undefined) {
                    return item.count;
                }
            }

            let count = 0;
            for (const c of (candidates || [])) {
                const rounds = Array.isArray(c?.interviewRounds) ? c.interviewRounds : [];
                const r = rounds.find(item => Number(item?.phase || 1) === phaseNum && String(item?.levelName || '').trim().toLowerCase() === target);
                if (r) {
                    count++;
                }
            }
            return count;
        }
        return activePhase === 1 ? (metrics?.interviewScheduled || 0) : activePhase === 2 ? (phase2Metrics?.interviewScheduled || phase2Metrics?.scheduled || 0) : 0;
    }, [filterInterviewRound, activePhase, roundSummary, candidates, metrics, phase2Metrics]);

    return (
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                    <div className="min-w-fit">
                        <h3 className="text-[12px] font-bold uppercase tracking-[0.32em] text-slate-500">Pipeline</h3>
                    </div>
                    <div className="inline-flex w-fit rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-inner shadow-slate-200/70">
                        <button
                            onClick={() => handlePhaseChange(1)}
                            className={`${phaseToggleButtonClass} ${activePhase === 1
                                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 font-bold'
                                : 'text-slate-600 hover:bg-white hover:text-slate-900'
                                }`}
                        >
                            Phase 1
                        </button>
                        <button
                            onClick={() => handlePhaseChange(2)}
                            className={`${phaseToggleButtonClass} ${activePhase === 2
                                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 font-bold'
                                : 'text-slate-600 hover:bg-white hover:text-slate-900'
                                }`}
                        >
                            Phase 2
                        </button>
                        <button
                            onClick={() => handlePhaseChange(3)}
                            className={`${phaseToggleButtonClass} ${activePhase === 3
                                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 font-bold'
                                : 'text-slate-600 hover:bg-white hover:text-slate-900'
                                }`}
                        >
                            Phase 3
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (filterInterviewStatus === 'Scheduled' && !filterInterviewRound) {
                                setFilterStatus('All');
                                setFilterDecision('All');
                                setFilterInterviewStatus('All');
                                setFilterTransferred('All');
                                setFilterProfileShared(false);
                                setFilterInterviewRound('');
                            } else {
                                setFilterStatus('All');
                                setFilterDecision('All');
                                setFilterTransferred('All');
                                setFilterProfileShared(false);
                                setFilterInterviewRound('');
                                setFilterInterviewStatus('Scheduled');
                            }
                        }}
                        className="flex items-center gap-2 rounded-full border border-amber-200/90 bg-amber-50/80 px-3.5 py-1.5 text-xs font-semibold text-amber-900 shadow-2xs transition-all duration-200 hover:bg-amber-100/80 cursor-pointer active:scale-[0.98]"
                        title="Click to filter candidates with scheduled interviews"
                    >
                        <Calendar size={14} className="text-amber-600 stroke-[2.2]" />
                        <span>Total Interview Scheduled:</span>
                        <span className="font-extrabold px-2.5 py-0.5 rounded-lg text-xs bg-amber-200/80 text-amber-950 transition-colors">
                            {scheduledCount}
                        </span>
                    </button>
                </div>
                <div className="relative flex items-center gap-2">
                    <div className="relative min-w-34">
                        <button
                            type="button"
                            data-created-sort-trigger="true"
                            onClick={(event) => {
                                event.stopPropagation();
                                setShowToolbarMenu(false);
                                setShowCreatedDateSortMenu((prev) => !prev);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl border bg-white px-3 py-2.5 text-sm font-medium shadow-sm outline-none transition focus:ring-2 focus:ring-blue-500 ${createdDatePreset
                                ? 'border-blue-200 text-blue-700'
                                : 'border-slate-200 text-slate-600'
                                }`}
                        >
                            <span className="truncate">{getCreatedDatePresetLabel(createdDatePreset)}</span>
                            <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${showCreatedDateSortMenu ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                            </svg>
                        </button>
                        {showCreatedDateSortMenu && (
                            <div
                                data-created-sort-panel="true"
                                className={`absolute right-0 top-14 z-30 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-2 pr-3 shadow-xl shadow-slate-200/70 ${createdDatePreset === 'custom'
                                    ? 'w-[min(18.5rem,calc(100vw-2rem))]'
                                    : 'w-48'
                                    }`}
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="mb-2 px-3 pt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                                    Sort
                                </div>
                                {createdDatePresetOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            applyCreatedDatePreset(option.value);
                                            if (option.value !== 'custom') {
                                                setShowCreatedDateSortMenu(false);
                                            }
                                        }}
                                        className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition ${createdDatePreset === option.value
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                                {createdDatePreset === 'custom' && (
                                    <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                        <div className="grid grid-cols-1 gap-3">
                                            <div className="min-w-0">
                                                <label className="mb-1 block text-[11px] font-semibold text-slate-500">From</label>
                                                <input
                                                    type="date"
                                                    value={dateFrom}
                                                    onChange={(e) => {
                                                        setCreatedDatePreset('custom');
                                                        setDateFrom(e.target.value);
                                                    }}
                                                    max={dateTo || undefined}
                                                    className="min-w-0 w-full max-w-[13.5rem] rounded-xl border border-slate-300 px-3 py-2 text-[13px] outline-none transition focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <label className="mb-1 block text-[11px] font-semibold text-slate-500">To</label>
                                                <input
                                                    type="date"
                                                    value={dateTo}
                                                    onChange={(e) => {
                                                        setCreatedDatePreset('custom');
                                                        setDateTo(e.target.value);
                                                    }}
                                                    min={dateFrom || undefined}
                                                    className="min-w-0 w-full max-w-[13.5rem] rounded-xl border border-slate-300 px-3 py-2 text-[13px] outline-none transition focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="my-2 border-t border-slate-100" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCreatedDatePreset('');
                                        setDateFilterField('');
                                        setDateFrom('');
                                        setDateTo('');
                                        setShowCreatedDateSortMenu(false);
                                    }}
                                    className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        data-toolbar-menu-trigger="true"
                        onClick={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            setShowCreatedDateSortMenu(false);
                            setShowToolbarMenu(prev => !prev);
                        }}
                        className={toolbarMenuButtonClass}
                        aria-label="Open quick actions"
                        title="Quick actions"
                    >
                        <Menu size={16} />
                        <span className="sr-only">Quick actions</span>
                    </button>
                    {showToolbarMenu && (
                        <div
                            data-toolbar-menu-content="true"
                            className="absolute right-0 top-14 z-30 w-70 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/70"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="mb-2 px-3 pt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                                Quick Actions
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowToolbarMenu(false);
                                    handleExportExcel();
                                }}
                                className={toolbarMenuItemClass}
                            >
                                <span className="flex items-center gap-3">
                                    <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                                        <Download size={15} />
                                    </span>
                                    Export Excel
                                </span>
                            </button>
                            {canMassMail && !isLegacyView && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowToolbarMenu(false);
                                        openMassMailModal();
                                    }}
                                    className={toolbarMenuItemClass}
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="rounded-lg bg-rose-50 p-2 text-rose-600">
                                            <Mail size={15} />
                                        </span>
                                        Send Mail
                                    </span>
                                    <span className="inline-flex min-w-5.5 items-center justify-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                                        {selectedCandidateIds.length || serverResultCount || candidates.length}
                                    </span>
                                </button>
                            )}
                            {canBulkTransfer && !isLegacyView && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowToolbarMenu(false);
                                        openTransferModal(selectedCandidateIds);
                                    }}
                                    className={toolbarMenuItemClass}
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="rounded-lg bg-violet-50 p-2 text-violet-600">
                                            <ArrowRightLeft size={15} />
                                        </span>
                                        Transfer
                                    </span>
                                    <span className="inline-flex min-w-5.5 items-center justify-center rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                                        {selectedCandidateIds.length}
                                    </span>
                                </button>
                            )}
                            {canEditCandidates && !isLegacyView && selectedCandidateIds.length >= 2 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowToolbarMenu(false);
                                        openMassInterviewModal();
                                    }}
                                    className={toolbarMenuItemClass}
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
                                            <Calendar size={15} />
                                        </span>
                                        Schedule Interview
                                    </span>
                                    <span className="inline-flex min-w-5.5 items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                                        {selectedCandidateIds.length}
                                    </span>
                                </button>
                            )}

                            {canEditCandidates && selectedCandidateIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowToolbarMenu(false);
                                        handleBulkMoveToNextPhase();
                                    }}
                                    className={toolbarMenuItemClass}
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                            <ArrowRight size={15} />
                                        </span>
                                        Move to next phase
                                    </span>
                                    <span className="inline-flex min-w-5.5 items-center justify-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                                        {selectedCandidateIds.length}
                                    </span>
                                </button>
                            )}

                            {canMakeDecisions && selectedCandidateIds.length > 0 && (
                                <div className="border-t border-slate-100 pt-1 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowDecisionSubmenu(prev => !prev)}
                                        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                                                <CheckCircle size={15} />
                                            </span>
                                            <span>Change Decision</span>
                                        </span>
                                        <span className="flex items-center gap-2">
                                            <span className="inline-flex min-w-5.5 items-center justify-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                                {selectedCandidateIds.length}
                                            </span>
                                            <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 ${showDecisionSubmenu ? 'rotate-180' : ''}`} />
                                        </span>
                                    </button>

                                    {showDecisionSubmenu && (
                                        <div className="mt-1 space-y-0.5 rounded-xl bg-slate-50 p-1.5 border border-slate-100">
                                            {decisionOptions.map((decision) => (
                                                <button
                                                    key={decision}
                                                    type="button"
                                                    onClick={() => {
                                                        setShowToolbarMenu(false);
                                                        setShowDecisionSubmenu(false);
                                                        handleBulkDecisionChange(decision);
                                                    }}
                                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-white hover:text-emerald-700 hover:shadow-sm"
                                                >
                                                    <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
                                                    <span>{decision}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {canManageTemplates && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowToolbarMenu(false);
                                        navigate('/ta/email-templates');
                                    }}
                                    className={toolbarMenuItemClass}
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
                                            <FileText size={15} />
                                        </span>
                                        Templates
                                    </span>
                                </button>
                            )}
                            {canCreateCandidates && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowToolbarMenu(false);
                                        setShowBulkResumeImport(true);
                                    }}
                                    className={toolbarMenuItemClass}
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                            <FileText size={15} />
                                        </span>
                                        Upload Resumes
                                    </span>
                                </button>
                            )}
                            {canImportCandidates && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowToolbarMenu(false);
                                        setShowBulkImport(true);
                                    }}
                                    className={toolbarMenuItemClass}
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="rounded-lg bg-slate-100 p-2 text-slate-700">
                                            <Upload size={15} />
                                        </span>
                                        Import (Excel)
                                    </span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowToolbarMenu(false);
                                    const reqId = hiringRequestId || requestMeta?._id || '';
                                    const params = new URLSearchParams();
                                    if (reqId) params.set('hiringRequestId', reqId);
                                    if (activePhase) params.set('phase', activePhase);
                                    const query = params.toString() ? `?${params.toString()}` : '';
                                    navigate(`/ta/interview-analytics${query}`);
                                }}
                                className={toolbarMenuItemClass}
                            >
                                <span className="flex items-center gap-3">
                                    <span className="rounded-lg bg-teal-50 p-2 text-teal-600">
                                        <BarChart3 size={15} />
                                    </span>
                                    Interview Analytics
                                </span>
                            </button>
                            {canCreateCandidates && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowToolbarMenu(false);
                                        handleAddNew();
                                    }}
                                    className={toolbarMenuItemClass}
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
                                            <Plus size={15} />
                                        </span>
                                        Add Candidate
                                    </span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CandidateHeaderToolbar;
