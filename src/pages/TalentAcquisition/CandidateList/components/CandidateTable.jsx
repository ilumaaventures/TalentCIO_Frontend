import React from 'react';
import { Upload, ArrowUpDown, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import CandidateTableRow from './CandidateTableRow';

const CandidateTable = ({
    candidates,
    canCreateCandidates,
    handleAddNew,
    selectedCandidateId,
    isLegacyView,
    allVisibleSelected,
    toggleSelectAllVisible,
    sortColumn,
    sortDirection,
    handleHeaderSort,
    paginatedCandidates,
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
    handleDelete,
    loading,
    activeList,
    usesBackendPagination,
    serverResultCount,
    itemsPerPage,
    setItemsPerPage,
    page,
    setPage,
    totalPages,
    filterInterviewRound,
    roundSummary
}) => {
    const isInterviewRoundView = Boolean(filterInterviewRound && filterInterviewRound.trim() !== '');

    const activeInterviewRounds = React.useMemo(() => {
        const summaryRounds = activePhase === 2 ? roundSummary?.phase2 : roundSummary?.phase1;
        if (Array.isArray(summaryRounds) && summaryRounds.length > 0) {
            return summaryRounds.map(r => r.levelName).filter(Boolean);
        }
        const set = new Set();
        for (const c of (candidates || [])) {
            const rounds = c?.interviewRounds || [];
            for (const r of rounds) {
                if (Number(r.phase || 1) === Number(activePhase || 1) && r.levelName) {
                    set.add(String(r.levelName).trim());
                }
            }
        }
        const list = Array.from(set);
        if (list.length > 0) return list;
        return filterInterviewRound ? [filterInterviewRound] : ['Round 1'];
    }, [roundSummary, activePhase, candidates, filterInterviewRound]);

    const activeRoundStats = React.useMemo(() => {
        if (!filterInterviewRound || filterInterviewRound.trim() === '') return null;
        const target = filterInterviewRound.trim().toLowerCase();
        const summaryData = activePhase === 2 ? roundSummary?.phase2 : roundSummary?.phase1;

        if (Array.isArray(summaryData)) {
            const item = summaryData.find(r => String(r?.levelName || '').trim().toLowerCase() === target);
            if (item) {
                return {
                    total: item.count || 0,
                    shortlisted: item.shortlisted || 0,
                    rejected: item.rejected || 0,
                    didNotTurnUp: item.didNotTurnUp || 0,
                    leftInBetween: item.leftInBetween || 0,
                    pending: item.pending || 0
                };
            }
        }

        let total = 0, shortlisted = 0, rejected = 0, didNotTurnUp = 0, leftInBetween = 0, pending = 0;
        for (const c of (candidates || [])) {
            const rounds = Array.isArray(c?.interviewRounds) ? c.interviewRounds : [];
            const round = rounds.find(r => Number(r?.phase || 1) === (activePhase || 1) && String(r?.levelName || '').trim().toLowerCase() === target);
            if (round) {
                total++;
                const s = String(round.status || '').trim();
                if (s === 'Passed' || s === 'Pass' || s === 'Shortlisted') shortlisted++;
                else if (s === 'Failed' || s === 'Fail' || s === 'Rejected') rejected++;
                else if (s === 'Did Not Turn Up' || s === 'Did Not Turnup' || s === 'Did Not Turn up' || s === 'Skipped' || s === 'No Show' || s === 'DNTU') didNotTurnUp++;
                else if (s === 'Left in between' || s === 'Left In Between' || s === 'LIB') leftInBetween++;
                else pending++;
            }
        }
        return { total, shortlisted, rejected, didNotTurnUp, leftInBetween, pending };
    }, [filterInterviewRound, activePhase, roundSummary, candidates]);

    const renderSortIcon = (columnKey) => {
        if (sortColumn !== columnKey) {
            return <ArrowUpDown size={12} className="opacity-40 hover:opacity-100 transition-opacity ml-1 inline text-slate-400" />;
        }
        return sortDirection === 'asc' ? (
            <ArrowUp size={12} className="text-blue-600 ml-1 inline font-bold" />
        ) : (
            <ArrowDown size={12} className="text-blue-600 ml-1 inline font-bold" />
        );
    };

    if (candidates.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Upload className="mx-auto text-slate-300 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No Candidates Yet</h3>
                <p className="text-slate-500 mb-4">Start by uploading candidate resumes and filling their details</p>
                {canCreateCandidates && (
                    <button
                        onClick={handleAddNew}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Upload First Resume
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 mb-24 overflow-hidden">
            {/* Top Table Header Toolbar: Entries Summary & Round Metrics Breakdown */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-200 bg-slate-50/70 text-xs text-slate-500">
                <div className="font-semibold text-slate-700">
                    Showing <span className="font-bold text-slate-900">{(usesBackendPagination ? serverResultCount : activeList.length) > 0 ? (page - 1) * itemsPerPage + 1 : 0}</span> to <span className="font-bold text-slate-900">{Math.min(page * itemsPerPage, usesBackendPagination ? serverResultCount : activeList.length)}</span> of <span className="font-bold text-slate-900">{usesBackendPagination ? serverResultCount : activeList.length}</span> entries
                </div>

                {activeRoundStats && (
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-700 self-center">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="text-slate-500 size-4" />
                            <span>Total Interview Scheduled:</span>
                            <span className="font-extrabold text-slate-900">{activeRoundStats.total}</span>
                        </div>
                        <span className="text-slate-300 font-normal">|</span>
                        <div className="flex items-center gap-2 font-extrabold text-xs">
                            <span className="text-emerald-600" title="Shortlisted">SH:{activeRoundStats.shortlisted}</span>
                            <span className="text-rose-600" title="Rejected">RJ:{activeRoundStats.rejected}</span>
                            <span className="text-orange-600" title="Did Not Turn Up">DNTU:{activeRoundStats.didNotTurnUp}</span>
                            <span className="text-purple-600" title="Left In Between">LIB:{activeRoundStats.leftInBetween}</span>
                            <span className="text-amber-600" title="Pending">P:{activeRoundStats.pending}</span>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <span>Show</span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            const newLimit = parseInt(e.target.value, 10);
                            setItemsPerPage(newLimit);
                            setPage(1);
                        }}
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={150}>150</option>
                    </select>
                    <span>entries</span>
                </div>
            </div>

            <div className="w-full overflow-x-auto">
                <div className={selectedCandidateId || isInterviewRoundView ? "w-full" : "min-w-275"}>
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr key="header-row">
                                {!selectedCandidateId && !isLegacyView && (
                                    <th className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={allVisibleSelected}
                                            onChange={toggleSelectAllVisible}
                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </th>
                                )}
                                <th onClick={() => handleHeaderSort('candidate')} className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-slate-800 transition-colors select-none">
                                    Candidate {renderSortIcon('candidate')}
                                </th>
                                {!selectedCandidateId && (
                                    <th onClick={() => handleHeaderSort('contact')} className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-slate-800 transition-colors select-none">
                                        Contact {renderSortIcon('contact')}
                                    </th>
                                )}
                                {!selectedCandidateId && !isInterviewRoundView && (
                                    <th onClick={() => handleHeaderSort('experience')} className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-slate-800 transition-colors select-none">
                                        Experience {renderSortIcon('experience')}
                                    </th>
                                )}
                                {!selectedCandidateId && !isInterviewRoundView && (
                                    <th onClick={() => handleHeaderSort('ctc')} className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-slate-800 transition-colors select-none">
                                        CTC Details {renderSortIcon('ctc')}
                                    </th>
                                )}
                                {!selectedCandidateId && !isInterviewRoundView && (
                                    <th onClick={() => handleHeaderSort('interviews')} className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-slate-800 transition-colors select-none">
                                        Interviews {renderSortIcon('interviews')}
                                    </th>
                                )}
                                {!selectedCandidateId && isInterviewRoundView && (
                                    activeInterviewRounds.map((roundName) => (
                                        <th key={roundName} className="px-3 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap min-w-[170px]">
                                            {roundName}
                                        </th>
                                    ))
                                )}
                                {!selectedCandidateId && (
                                    <th onClick={() => handleHeaderSort('decision')} className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-slate-800 transition-colors select-none">
                                        Decision {renderSortIcon('decision')}
                                    </th>
                                )}
                                {!selectedCandidateId && !isInterviewRoundView && (
                                    <th onClick={() => handleHeaderSort('pulled')} className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-slate-800 transition-colors select-none">
                                        Pulled / Uploaded {renderSortIcon('pulled')}
                                    </th>
                                )}
                                <th className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {paginatedCandidates.length === 0 ? (
                                <tr>
                                    <td colSpan={selectedCandidateId ? 3 : (isInterviewRoundView ? (4 + activeInterviewRounds.length + 1) : 9)} className="px-4 py-8 text-center text-slate-400">
                                        No candidates match the selected filters
                                    </td>
                                </tr>
                            ) : (
                                paginatedCandidates.map((candidate) => (
                                    <CandidateTableRow
                                        key={candidate._id}
                                        candidate={candidate}
                                        selectedCandidateId={selectedCandidateId}
                                        isLegacyView={isLegacyView}
                                        selectedCandidateIds={selectedCandidateIds}
                                        toggleCandidateSelection={toggleCandidateSelection}
                                        handleSelectCandidate={handleSelectCandidate}
                                        canViewCandidateDetails={canViewCandidateDetails}
                                        activePhase={activePhase}
                                        canMakeDecisions={canMakeDecisions}
                                        canManagePhase3Decisions={canManagePhase3Decisions}
                                        handleDecisionChange={handleDecisionChange}
                                        handlePhase2DecisionChange={handlePhase2DecisionChange}
                                        handlePhase3DecisionChange={handlePhase3DecisionChange}
                                        setFilterPulledBy={setFilterPulledBy}
                                        setFilterUploadedBy={setFilterUploadedBy}
                                        setFilterStatus={setFilterStatus}
                                        setFilterDecision={setFilterDecision}
                                        setFilterInterviewStatus={setFilterInterviewStatus}
                                        setOpenMultiFilter={setOpenMultiFilter}
                                        toggleMenu={toggleMenu}
                                        activeMenu={activeMenu}
                                        setActiveMenu={setActiveMenu}
                                        menuPosition={menuPosition}
                                        handleView={handleView}
                                        setProfileTarget={setProfileTarget}
                                        canEditCandidates={canEditCandidates}
                                        handleEdit={handleEdit}
                                        isProfileSharedCandidate={isProfileSharedCandidate}
                                        handleMoveToNextPhase={handleMoveToNextPhase}
                                        canBulkTransfer={canBulkTransfer}
                                        openTransferModal={openTransferModal}
                                        handleMoveBackToPreviousPhase={handleMoveBackToPreviousPhase}
                                        canTransferCandidates={canTransferCandidates}
                                        handleTransferToOnboarding={handleTransferToOnboarding}
                                        canDeleteCandidates={canDeleteCandidates}
                                        handleDelete={handleDelete}
                                        isInterviewRoundView={isInterviewRoundView}
                                        activeInterviewRounds={activeInterviewRounds}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {!loading && (activeList.length > 0 || (usesBackendPagination && serverResultCount > 0)) && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-200/80 text-xs text-slate-500 px-4 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span>Show</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                const newLimit = parseInt(e.target.value, 10);
                                setItemsPerPage(newLimit);
                                setPage(1);
                            }}
                            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={150}>150</option>
                        </select>
                        <span>entries per page (Showing <span className="font-bold text-slate-700">{(usesBackendPagination ? serverResultCount : activeList.length) > 0 ? (page - 1) * itemsPerPage + 1 : 0}</span> to <span className="font-bold text-slate-700">{Math.min(page * itemsPerPage, usesBackendPagination ? serverResultCount : activeList.length)}</span> of <span className="font-bold text-slate-700">{usesBackendPagination ? serverResultCount : activeList.length}</span> entries)</span>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-xs font-semibold text-slate-600 px-2">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CandidateTable;
