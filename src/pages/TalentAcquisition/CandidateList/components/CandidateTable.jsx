import React from 'react';
import { Upload, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
    totalPages
}) => {
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
        <div className="bg-white rounded-xl border border-slate-200 mb-24">
            <div className="w-full overflow-x-auto">
                <div className={selectedCandidateId ? "min-w-full" : "min-w-275"}>
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
                                {!selectedCandidateId && (
                                    <th onClick={() => handleHeaderSort('experience')} className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-slate-800 transition-colors select-none">
                                        Experience {renderSortIcon('experience')}
                                    </th>
                                )}
                                {!selectedCandidateId && (
                                    <th onClick={() => handleHeaderSort('ctc')} className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-slate-800 transition-colors select-none">
                                        CTC Details {renderSortIcon('ctc')}
                                    </th>
                                )}
                                {!selectedCandidateId && (
                                    <th onClick={() => handleHeaderSort('interviews')} className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-slate-800 transition-colors select-none">
                                        Interviews {renderSortIcon('interviews')}
                                    </th>
                                )}
                                {!selectedCandidateId && (
                                    <th onClick={() => handleHeaderSort('decision')} className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-slate-800 transition-colors select-none">
                                        Decision {renderSortIcon('decision')}
                                    </th>
                                )}
                                {!selectedCandidateId && (
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
                                    <td colSpan={selectedCandidateId ? 3 : 9} className="px-4 py-8 text-center text-slate-400">
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
