import React from 'react';
import { Search } from 'lucide-react';
import MultiSelectFilter from './MultiSelectFilter';
import {
    interviewFilterOptions,
    dateFilterFieldOptions,
    DEFAULT_DATE_FILTER_FIELD
} from '../CandidateListConstants';

const CandidateFilters = ({
    selectedCandidateId,
    candidateNameSearch,
    setCandidateNameSearch,
    activePhase,
    filterStatus,
    setFilterStatus,
    filterDecision,
    setFilterDecision,
    filterInterviewStatus,
    setFilterInterviewStatus,
    filterInterviewRound,
    setFilterInterviewRound,
    filterDynamicStage,
    setFilterDynamicStage,
    availableRoundOptions,
    filterRating,
    setFilterRating,
    pulledByOptions,
    filterPulledBy,
    setFilterPulledBy,
    uploadedByOptions,
    filterUploadedBy,
    setFilterUploadedBy,
    filterUploadType,
    setFilterUploadType,
    isLegacyView,
    candidates,
    filterTransferred,
    setFilterTransferred,
    filterExperience,
    setFilterExperience,
    dateFilterField,
    setDateFilterField,
    setCreatedDatePreset,
    setDateFrom,
    setDateTo,
    filterProfileShared,
    setFilterProfileShared,
    isDefaultDateFilterState,
    resetDateFiltersToDefault,
    setShowCreatedDateSortMenu,
    openMultiFilter,
    setOpenMultiFilter
}) => {
    if (selectedCandidateId) return null;

    return (
        <div className="scrollbar-hide bg-white p-4 rounded-xl border border-slate-200 overflow-x-auto">
            <div className="flex flex-nowrap gap-4 items-end min-w-max">
                <div className="shrink-0">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Candidate Name</label>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={candidateNameSearch}
                            onChange={(e) => setCandidateNameSearch(e.target.value)}
                            placeholder="Search candidate name"
                            className="pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 w-52"
                        />
                    </div>
                </div>

                {activePhase === 1 && (
                    <div className="shrink-0">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="All">All</option>
                            <option value="Interested">Interested</option>
                            <option value="Not Interested">Not Interested</option>
                            <option value="Not Relevant">Not Relevant</option>
                            <option value="Not Picking">Not Picking</option>
                            <option value="High expectation">High expectation</option>
                            <option value="Long Notice period">Long Notice period</option>
                            <option value="Location Not suitable">Location Not suitable</option>
                        </select>
                    </div>
                )}
                <div className="shrink-0">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Decision</label>
                    <select
                        value={filterDecision}
                        onChange={(e) => setFilterDecision(e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="All">All</option>
                        {activePhase === 1 && (
                            <>
                                <option value="Shortlisted">Shortlisted</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Did Not Turn Up">Did Not Turn Up</option>
                                <option value="On Hold">On Hold</option>
                                <option value="None">None</option>
                            </>
                        )}
                        {activePhase === 2 && (
                            <>
                                <option value="Selected">Selected</option>
                                <option value="Shortlisted">Shortlisted</option>
                                <option value="Rejected">Rejected</option>
                                <option value="On Hold">On Hold</option>
                            </>
                        )}
                        {activePhase === 3 && (
                            <>
                                <option value="Offer Sent">Offer Sent</option>
                                <option value="Offer Accepted">Offer Accepted</option>
                                <option value="Joined">Joined</option>
                                <option value="No Show">No Show</option>
                                <option value="Offer Declined">Offer Declined</option>
                            </>
                        )}
                    </select>
                </div>
                <div className="shrink-0">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Interviews</label>
                    <select
                        value={filterInterviewStatus}
                        onChange={(e) => setFilterInterviewStatus(e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 w-34"
                    >
                        {interviewFilterOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                {([1, 2].includes(activePhase)) && (
                    <div className="shrink-0">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Interview Round</label>
                        <select
                            value={filterInterviewRound}
                            onChange={(e) => setFilterInterviewRound(e.target.value)}
                            className={`px-2.5 py-1.5 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 w-36 transition-colors ${filterInterviewRound
                                ? 'border-red-500 bg-red-50 text-red-700 font-bold'
                                : 'border-slate-300'
                                }`}
                        >
                            <option value="">All Rounds</option>
                            {availableRoundOptions.map((roundName) => (
                                <option key={roundName} value={roundName}>
                                    {roundName}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                {Boolean(filterInterviewRound && filterInterviewRound.trim() !== '') && (
                    <div className="shrink-0">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Dynamic Stages</label>
                        <select
                            value={filterDynamicStage}
                            onChange={(e) => setFilterDynamicStage(e.target.value)}
                            className="px-2.5 py-1.5 border border-indigo-300 bg-indigo-50/50 rounded-lg text-xs font-semibold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500 min-w-44 transition-colors"
                        >
                            <option value="All">All Dynamic Stages</option>
                            {availableRoundOptions.map((roundName) => (
                                <React.Fragment key={roundName}>
                                    <option value={`Cleared_${roundName}`}>Cleared {roundName}</option>
                                    <option value={`Failed_${roundName}`}>Failed {roundName}</option>
                                    <option value={`DNTU_${roundName}`}>Did Not Turn Up {roundName}</option>
                                    <option value={`LIB_${roundName}`}>Left In Between {roundName}</option>
                                    <option value={`Pending_${roundName}`}>Pending {roundName}</option>
                                    <option value={`NotScheduled_${roundName}`}>Not Scheduled for {roundName}</option>
                                </React.Fragment>
                            ))}
                        </select>
                    </div>
                )}
                <div className="shrink-0">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Min Avg Rating</label>
                    <select
                        value={filterRating}
                        onChange={(e) => setFilterRating(e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 w-30"
                    >
                        <option value="All">All</option>
                        <option value="9">9+ (Excellent)</option>
                        <option value="7">7+ (Good)</option>
                        <option value="5">5+ (Average)</option>
                        <option value="3">3+ (Below Avg)</option>
                    </select>
                </div>
                <MultiSelectFilter
                    label="Pulled By"
                    options={pulledByOptions}
                    selectedValues={filterPulledBy}
                    onToggleValue={(value) => {
                        const alreadySelected = filterPulledBy.includes(value);
                        const nextValues = alreadySelected
                            ? filterPulledBy.filter((item) => item !== value)
                            : [...filterPulledBy, value];
                        setFilterPulledBy(nextValues);
                        if (!alreadySelected) {
                            setFilterStatus('All');
                            setFilterDecision('All');
                            setFilterInterviewStatus('All');
                        }
                    }}
                    onClear={() => setFilterPulledBy([])}
                    isOpen={openMultiFilter === 'Pulled By'}
                    onToggleOpen={setOpenMultiFilter}
                    emptyLabel="All"
                    widthClass="w-40"
                />
                <MultiSelectFilter
                    label="Uploaded By"
                    options={uploadedByOptions}
                    selectedValues={filterUploadedBy}
                    onToggleValue={(value) => {
                        const alreadySelected = filterUploadedBy.includes(value);
                        setFilterUploadedBy(
                            alreadySelected
                                ? filterUploadedBy.filter((item) => item !== value)
                                : [...filterUploadedBy, value]
                        );
                    }}
                    onClear={() => setFilterUploadedBy([])}
                    isOpen={openMultiFilter === 'Uploaded By'}
                    onToggleOpen={setOpenMultiFilter}
                    emptyLabel="All"
                    widthClass="w-44"
                />
                <div className="shrink-0">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Upload Type</label>
                    <select
                        value={filterUploadType}
                        onChange={(e) => setFilterUploadType(e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 w-32"
                    >
                        <option value="All">All</option>
                        <option value="CV">CV</option>
                        <option value="Excel">Excel</option>
                    </select>
                </div>
                {!isLegacyView && candidates.some(c => c.isTransferred) && (
                    <div className="shrink-0">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Origin</label>
                        <select
                            value={filterTransferred}
                            onChange={(e) => setFilterTransferred(e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 w-32"
                        >
                            <option value="All">All Origins</option>
                            <option value="New">New Applications</option>
                            <option value="Transferred">Transferred</option>
                        </select>
                    </div>
                )}
                <div className="shrink-0">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Min Experience (Yrs)</label>
                    <input
                        type="number"
                        min="0"
                        placeholder="e.g. 2"
                        value={filterExperience}
                        onChange={(e) => setFilterExperience(e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 w-28"
                    />
                </div>
                <div className="shrink-0">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Date Filter</label>
                    <select
                        value={dateFilterField}
                        onChange={(e) => {
                            const value = e.target.value;
                            setDateFilterField(value);

                            if (!value) {
                                setCreatedDatePreset('');
                                setDateFrom('');
                                setDateTo('');
                            }
                        }}
                        className="w-40 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none transition focus:ring-2 focus:ring-blue-500"
                    >
                        {dateFilterFieldOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                {(candidateNameSearch !== '' || (activePhase === 1 && (filterStatus !== 'All' || filterProfileShared)) || filterDecision !== 'All' || filterExperience !== '' || filterInterviewStatus !== 'All' || filterRating !== 'All' || filterPulledBy.length > 0 || filterUploadedBy.length > 0 || filterUploadType !== 'All' || !isDefaultDateFilterState || filterTransferred !== 'All' || filterInterviewRound !== '') && (
                    <button
                        onClick={() => {
                            if (activePhase === 1) setFilterStatus('All');
                            else setFilterStatus('All');
                            setCandidateNameSearch('');
                            setFilterProfileShared(false);
                            setFilterDecision('All');
                            setFilterExperience('');
                            setFilterInterviewStatus('All');
                            setFilterRating('');
                            setFilterPulledBy([]);
                            setFilterUploadedBy([]);
                            setFilterUploadType('All');
                            resetDateFiltersToDefault();
                            setFilterTransferred('All');
                            setFilterInterviewRound('');
                            setShowCreatedDateSortMenu(false);
                            setOpenMultiFilter(null);
                        }}
                        className="px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors mb-0.5"
                    >
                        Clear Filters
                    </button>
                )}
            </div>
        </div>
    );
};

export default CandidateFilters;
