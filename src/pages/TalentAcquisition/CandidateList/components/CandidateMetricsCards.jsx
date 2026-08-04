import React from 'react';
import {
    Users, ThumbsUp, ThumbsDown, CheckCircle, XCircle, Clock, UserCheck, Download, Briefcase, ArrowRight, FileText
} from 'lucide-react';
import { PIPELINE_FIXED_STAGE_SET, PHASE_2_FIXED_STAGE_SET } from '../CandidateListConstants';
import { buildDynamicPipeline } from '../utils/pipelineUtils';
import { matchesMultiValueFilter, getRoundsForPhase, matchesInterviewFilter } from '../utils/candidateHelpers';

const CandidateMetricsCards = ({
    activePhase,
    roundSummary,
    cardMetrics,
    structuralPhase1Candidates,
    structuralPhase2Candidates,
    structuralPhase3Candidates,
    metrics,
    phase2Metrics,
    phase3Metrics,
    filterStatus,
    setFilterStatus,
    filterDecision,
    setFilterDecision,
    filterInterviewStatus,
    setFilterInterviewStatus,
    filterTransferred,
    setFilterTransferred,
    filterProfileShared,
    setFilterProfileShared,
    filterInterviewRound,
    setFilterInterviewRound,
    filterPreference,
    filterRating,
    filterExperience,
    filterPulledBy,
    basePhase1Candidates,
    basePhase2Candidates,
    basePhase3Candidates,
    usesBackendPagination,
    selectedCandidateId
}) => {
    if (selectedCandidateId) return null;

    const clearRoundFilter = () => {
        setFilterStatus('All');
        setFilterDecision('All');
        setFilterInterviewStatus('All');
        setFilterTransferred('All');
        setFilterProfileShared(false);
        setFilterInterviewRound('');
    };

    const colorMap = {
        purple: 'border-b-purple-500 text-purple-600',
        green: 'border-b-green-500 text-green-600',
        amber: 'border-b-amber-500 text-amber-600',
        sky: 'border-b-sky-500 text-sky-600',
        slate: 'border-b-slate-500 text-slate-600',
        rose: 'border-b-rose-500 text-rose-600',
        indigo: 'border-b-indigo-500 text-indigo-600',
        blue: 'border-b-blue-500 text-blue-600',
        emerald: 'border-b-emerald-500 text-emerald-600'
    };

    if (activePhase === 1) {
        const phase1RoundData = roundSummary?.phase1
            || cardMetrics?.phase1Metrics?.interviewRoundsSummary
            || null;

        const summaryRounds = phase1RoundData
            ? phase1RoundData
            : structuralPhase1Candidates;

        const pipelineOrder = buildDynamicPipeline(summaryRounds);

        const roundCountMap = (() => {
            const map = new Map();
            if (phase1RoundData) {
                for (const item of phase1RoundData) {
                    if (item?.levelName) {
                        map.set(item.levelName, item.count || 0);
                    }
                }
            } else {
                for (const c of structuralPhase1Candidates) {
                    const seen = new Set();
                    for (const r of (c.interviewRounds || [])) {
                        if (Number(r.phase || 1) !== 1) continue;
                        const name = String(r.levelName || '').trim();
                        if (name && !seen.has(name)) {
                            seen.add(name);
                            map.set(name, (map.get(name) || 0) + 1);
                        }
                    }
                }
            }
            return map;
        })();

        const funnelCards = pipelineOrder
            .filter((node) => PIPELINE_FIXED_STAGE_SET.has(node))
            .map((node) => {
                if (node === 'Total Sourced') {
                    return {
                        id: 'total',
                        label: 'Total Sourced',
                        value: metrics.total,
                        icon: Users,
                        color: 'purple',
                        isActive: filterStatus === 'All' && filterDecision === 'All' && filterInterviewStatus === 'All' && filterTransferred === 'All' && !filterProfileShared && !filterInterviewRound,
                        onClick: () => clearRoundFilter()
                    };
                }
                if (node === 'Interested') {
                    return {
                        id: 'interested',
                        label: 'Interested',
                        value: metrics.interested,
                        icon: CheckCircle,
                        color: 'green',
                        isActive: filterStatus === 'Interested' && !filterProfileShared && !filterInterviewRound,
                        onClick: () => { clearRoundFilter(); setFilterStatus('Interested'); }
                    };
                }
                if (node === 'Interview Scheduled') {
                    return {
                        id: 'interviewScheduled',
                        label: 'Interview Scheduled',
                        value: metrics.interviewScheduled,
                        icon: UserCheck,
                        color: 'amber',
                        isActive: filterInterviewStatus === 'Scheduled' && !filterProfileShared && !filterInterviewRound,
                        onClick: () => { clearRoundFilter(); setFilterInterviewStatus('Scheduled'); }
                    };
                }
                if (node === 'Shortlisted') {
                    return {
                        id: 'shortlisted',
                        label: 'Shortlisted',
                        value: metrics.shortlisted,
                        icon: ThumbsUp,
                        color: 'sky',
                        isActive: filterDecision === 'Shortlisted' && !filterProfileShared && !filterInterviewRound,
                        onClick: () => { clearRoundFilter(); setFilterDecision('Shortlisted'); }
                    };
                }
                if (node === 'Profile Shared') {
                    return {
                        id: 'profileShared',
                        label: 'Profile Shared',
                        value: metrics.profileShared,
                        icon: ArrowRight,
                        color: 'slate',
                        isActive: filterProfileShared && !filterInterviewRound,
                        onClick: () => { clearRoundFilter(); setFilterProfileShared(true); }
                    };
                }
                return null;
            })
            .filter(Boolean);

        const roundPills = pipelineOrder
            .filter((node) => !PIPELINE_FIXED_STAGE_SET.has(node))
            .map((node) => {
                const isCurrentActive = String(filterInterviewRound || '').trim().toLowerCase() === String(node || '').trim().toLowerCase();
                return {
                    label: node,
                    count: roundCountMap.get(node) || 0,
                    isActive: isCurrentActive,
                    onClick: () => {
                        if (isCurrentActive) {
                            setFilterInterviewRound('');
                        } else {
                            clearRoundFilter();
                            setFilterInterviewRound(node);
                        }
                    }
                };
            });

        const dynamicCards = [];

        if (filterStatus !== 'All' && filterStatus !== 'Interested') {
            let statusCount = 0;
            if (usesBackendPagination && metrics) {
                const statusMetricKey = {
                    'Not Picking': 'notPicking',
                    'Not Relevant': 'notRelevant',
                    'Not Interested': 'notInterested',
                    'High expectation': 'highExpectation',
                    'Long Notice period': 'longNoticePeriod',
                    'Location Not suitable': 'locationNotSuitable'
                }[filterStatus];
                statusCount = metrics[statusMetricKey] || 0;
            } else {
                statusCount = basePhase1Candidates.filter(c => c.status === filterStatus).length;
            }
            dynamicCards.push({
                label: filterStatus,
                value: statusCount,
                icon: ThumbsDown,
                color: 'rose',
                onClick: () => { }
            });
        }

        if (!filterProfileShared) {
            const phase1DecisionCardMap = {
                Rejected: {
                    label: 'Rejected',
                    value: metrics.rejected,
                    icon: XCircle,
                    color: 'rose'
                },
                'Did Not Turn Up': {
                    label: 'Did Not Turn Up',
                    value: metrics.didNotTurnUp,
                    icon: XCircle,
                    color: 'rose'
                },
                'On Hold': {
                    label: 'On Hold',
                    value: metrics.onHold,
                    icon: Clock,
                    color: 'slate'
                }
            };

            const decisionCard = phase1DecisionCardMap[filterDecision];
            if (decisionCard) {
                dynamicCards.push({
                    ...decisionCard,
                    onClick: () => { }
                });
            }
        }

        if (filterPreference !== 'All') {
            const prefCount = basePhase1Candidates.filter(c => c.preference === filterPreference).length;
            dynamicCards.push({
                label: filterPreference,
                value: prefCount,
                icon: UserCheck,
                color: 'indigo',
                onClick: () => { }
            });
        }

        if (filterRating !== 'All') {
            const ratedCount = basePhase1Candidates.filter(c => {
                const rounds = c.interviewRounds || [];
                const ratedRounds = rounds.filter(r => r.rating && r.rating > 0);
                if (ratedRounds.length === 0) return false;
                const avgRating = ratedRounds.reduce((acc, curr) => acc + curr.rating, 0) / ratedRounds.length;
                return avgRating >= Number(filterRating);
            }).length;
            dynamicCards.push({
                label: `${filterRating}+ Rating`,
                value: ratedCount,
                icon: ThumbsUp,
                color: 'amber',
                onClick: () => { }
            });
        }

        if (filterInterviewStatus !== 'All' && filterInterviewStatus !== 'Scheduled' && !filterProfileShared) {
            const interviewCount = basePhase1Candidates.filter(candidate => {
                const rounds = getRoundsForPhase(candidate, 1);
                return matchesInterviewFilter(rounds, filterInterviewStatus);
            }).length;
            dynamicCards.push({
                label: filterInterviewStatus,
                value: interviewCount,
                icon: Clock,
                color: 'amber',
                onClick: () => { }
            });
        }

        if (filterExperience) {
            const expCount = basePhase1Candidates.filter(c => c.totalExperience && Number(c.totalExperience) >= Number(filterExperience)).length;
            dynamicCards.push({
                label: `${filterExperience}+ Yrs Exp`,
                value: expCount,
                icon: Briefcase,
                color: 'blue',
                onClick: () => { }
            });
        }

        if (filterPulledBy.length > 0) {
            const pulledCount = basePhase1Candidates.filter(c => matchesMultiValueFilter(filterPulledBy, c.profilePulledBy)).length;
            dynamicCards.push({
                label: filterPulledBy.length === 1
                    ? `By: ${filterPulledBy[0].split(' ')[0]}`
                    : `${filterPulledBy.length} Users`,
                value: pulledCount,
                icon: Users,
                color: 'indigo',
                onClick: () => { }
            });
        }

        if (filterTransferred === 'Transferred') {
            dynamicCards.push({
                label: 'Transferred',
                value: metrics.transferred,
                icon: Download,
                color: 'blue',
                onClick: () => { }
            });
        }

        const cardByNode = new Map(funnelCards.map((c) => [c.label, c]));
        const pillByNode = new Map(roundPills.map((p) => [p.label, p]));

        return (
            <div className="w-full overflow-x-auto scrollbar-hide">
                <div className="w-full flex items-stretch gap-2 md:gap-3">
                    {pipelineOrder.map((node) => {
                        if (PIPELINE_FIXED_STAGE_SET.has(node)) {
                            const card = cardByNode.get(node);
                            if (!card) return null;
                            const Icon = card.icon;
                            const colorClasses = (colorMap[card.color] || colorMap.blue).split(' ');
                            return (
                                <div
                                    key={node}
                                    onClick={card.onClick}
                                    className={`bg-white border border-slate-200 border-b-4 ${colorClasses[0]} shadow-sm p-4 relative overflow-hidden group hover:bg-slate-50 transition-colors cursor-pointer active:scale-[0.98] flex-1 min-w-[130px] ${card.isActive ? 'bg-slate-50' : ''}`}
                                >
                                    <span className="block text-[32px] font-light text-slate-800 leading-none mb-2 relative z-10">{card.value}</span>
                                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide relative z-10">{card.label}</span>
                                    <Icon className={`absolute -right-2 top-1/2 -translate-y-1/2 ${colorClasses[1]} opacity-[0.08] size-16 transition-transform group-hover:scale-110 group-hover:opacity-10`} />
                                </div>
                            );
                        }
                        const pill = pillByNode.get(node);
                        if (!pill) return null;
                        const pillLabel = String(pill.label || '');
                        const displayPillLabel = pillLabel.length > 10 ? `${pillLabel.substring(0, 10)}..` : pillLabel;
                        return (
                            <button
                                key={node}
                                onClick={pill.onClick}
                                title={pillLabel}
                                className={`self-center flex-none inline-flex flex-col items-center justify-center rounded-none border px-1 py-[1px] text-center transition-colors ${pill.isActive
                                    ? 'border-red-700 bg-red-600 text-white shadow-sm'
                                    : 'border-red-400 bg-red-50/20 text-slate-700 hover:border-red-600 hover:bg-red-50'
                                    }`}
                            >
                                <span className={`text-[8px] font-bold uppercase tracking-tight whitespace-nowrap leading-none ${pill.isActive ? 'text-white' : 'text-red-600'}`}>
                                    {displayPillLabel}
                                </span>
                                <span className={`text-[10px] font-extrabold leading-none mt-[1px] ${pill.isActive ? 'text-white' : 'text-slate-900'}`}>{pill.count}</span>
                            </button>
                        );
                    })}

                    {dynamicCards.map((card, idx) => {
                        const Icon = card.icon;
                        const colorClasses = (colorMap[card.color] || colorMap.blue).split(' ');
                        return (
                            <div
                                key={`dyn-${idx}`}
                                onClick={card.onClick}
                                className={`bg-white border border-slate-200 border-b-4 ${colorClasses[0]} shadow-sm p-4 relative overflow-hidden group hover:bg-slate-50 transition-colors cursor-pointer active:scale-[0.98] flex-1 min-w-[130px]`}
                            >
                                <span className="block text-[32px] font-light text-slate-800 leading-none mb-2 relative z-10">{card.value}</span>
                                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide relative z-10">{card.label}</span>
                                <Icon className={`absolute -right-2 top-1/2 -translate-y-1/2 ${colorClasses[1]} opacity-[0.08] size-16 transition-transform group-hover:scale-110 group-hover:opacity-10`} />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (activePhase === 2) {
        const phase2RoundData = roundSummary?.phase2
            || cardMetrics?.phase2Metrics?.interviewRoundsSummary
            || null;

        const summaryRounds = phase2RoundData
            ? phase2RoundData
            : structuralPhase2Candidates;

        const pipelineOrder = buildDynamicPipeline(summaryRounds, 2, PHASE_2_FIXED_STAGES);

        const roundCountMap = (() => {
            const map = new Map();
            if (phase2RoundData) {
                for (const item of phase2RoundData) {
                    if (item?.levelName) {
                        map.set(item.levelName, item.count || 0);
                    }
                }
            } else {
                for (const c of structuralPhase2Candidates) {
                    const seen = new Set();
                    for (const r of (c.interviewRounds || [])) {
                        if (Number(r.phase || 1) !== 2) continue;
                        const name = String(r.levelName || '').trim();
                        if (name && !seen.has(name)) {
                            seen.add(name);
                            map.set(name, (map.get(name) || 0) + 1);
                        }
                    }
                }
            }
            return map;
        })();

        const phase2FixedCardMap = {
            'Profile Shared': {
                id: 'profileShared',
                label: 'Profile Shared',
                value: phase2Metrics.totalShortlisted,
                icon: Users,
                color: 'purple',
                isActive: filterDecision === 'All' && filterStatus === 'All' && !filterInterviewRound,
                onClick: () => { clearRoundFilter(); }
            },
            'Shortlisted': {
                id: 'screened',
                label: 'Shortlisted',
                value: phase2Metrics.totalScreened,
                icon: ThumbsUp,
                color: 'sky',
                isActive: (filterDecision === 'Shortlisted' || filterDecision === 'Shortlisted_Selected') && !filterInterviewRound,
                onClick: () => { clearRoundFilter(); setFilterDecision('Shortlisted_Selected'); }
            },
            'Selected': {
                id: 'selected',
                label: 'Selected',
                value: phase2Metrics.selected,
                icon: CheckCircle,
                color: 'green',
                isActive: filterDecision === 'Selected' && !filterInterviewRound,
                onClick: () => { clearRoundFilter(); setFilterDecision('Selected'); }
            },
            'Rejected': {
                id: 'rejected',
                label: 'Rejected',
                value: phase2Metrics.rejected,
                icon: ThumbsDown,
                color: 'rose',
                isActive: filterDecision === 'Rejected' && !filterInterviewRound,
                onClick: () => { clearRoundFilter(); setFilterDecision('Rejected'); }
            }
        };

        const pillByNode = new Map();
        for (const node of pipelineOrder) {
            if (!PHASE_2_FIXED_STAGE_SET.has(node)) {
                const isCurrentActive = String(filterInterviewRound || '').trim().toLowerCase() === String(node || '').trim().toLowerCase();
                pillByNode.set(node, {
                    label: node,
                    count: roundCountMap.get(node) || 0,
                    isActive: isCurrentActive,
                    onClick: () => {
                        if (isCurrentActive) {
                            setFilterInterviewRound('');
                        } else {
                            clearRoundFilter();
                            setFilterInterviewRound(node);
                        }
                    }
                });
            }
        }

        const dynamicCards = [];
        if (filterPreference !== 'All') {
            const prefCount = basePhase2Candidates.filter(c => c.preference === filterPreference).length;
            dynamicCards.push({
                label: filterPreference,
                value: prefCount,
                icon: UserCheck,
                color: 'indigo',
                onClick: () => { }
            });
        }

        if (filterRating !== 'All') {
            const ratedCount = basePhase2Candidates.filter(c => {
                const rounds = c.interviewRounds || [];
                const ratedRounds = rounds.filter(r => Number(r.phase || 1) === 2 && r.rating && r.rating > 0);
                if (ratedRounds.length === 0) return false;
                const avgRating = ratedRounds.reduce((acc, curr) => acc + curr.rating, 0) / ratedRounds.length;
                return avgRating >= Number(filterRating);
            }).length;
            dynamicCards.push({
                label: `${filterRating}+ Rating`,
                value: ratedCount,
                icon: ThumbsUp,
                color: 'amber',
                onClick: () => { }
            });
        }

        if (filterExperience) {
            const expCount = basePhase2Candidates.filter(c => c.totalExperience && Number(c.totalExperience) >= Number(filterExperience)).length;
            dynamicCards.push({
                label: `${filterExperience}+ Yrs Exp`,
                value: expCount,
                icon: Briefcase,
                color: 'blue',
                onClick: () => { }
            });
        }

        return (
            <div className="w-full overflow-x-auto pb-2 scrollbar-none">
                <div className="flex flex-wrap items-center gap-2">
                    {pipelineOrder.map((node) => {
                        if (PHASE_2_FIXED_STAGE_SET.has(node)) {
                            const card = phase2FixedCardMap[node];
                            if (!card) return null;
                            const Icon = card.icon;
                            const colorClasses = (colorMap[card.color] || colorMap.blue).split(' ');
                            return (
                                <div
                                    key={node}
                                    onClick={card.onClick}
                                    className={`bg-white border border-slate-200 border-b-4 ${colorClasses[0]} shadow-sm p-4 relative overflow-hidden group hover:bg-slate-50 transition-colors cursor-pointer active:scale-[0.98] flex-1 min-w-[130px] ${card.isActive ? 'bg-slate-50' : ''}`}
                                >
                                    <span className="block text-[32px] font-light text-slate-800 leading-none mb-2 relative z-10">{card.value}</span>
                                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide relative z-10">{card.label}</span>
                                    <Icon className={`absolute -right-2 top-1/2 -translate-y-1/2 ${colorClasses[1]} opacity-[0.08] size-16 transition-transform group-hover:scale-110 group-hover:opacity-10`} />
                                </div>
                            );
                        }
                        const pill = pillByNode.get(node);
                        if (!pill) return null;
                        const pillLabel = String(pill.label || '');
                        const displayPillLabel = pillLabel.length > 10 ? `${pillLabel.substring(0, 10)}..` : pillLabel;
                        return (
                            <button
                                key={node}
                                onClick={pill.onClick}
                                title={pillLabel}
                                className={`self-center flex-none inline-flex flex-col items-center justify-center rounded-none border px-1 py-[1px] text-center transition-colors ${pill.isActive
                                    ? 'border-red-700 bg-red-600 text-white shadow-sm'
                                    : 'border-red-400 bg-red-50/20 text-slate-700 hover:border-red-600 hover:bg-red-50'
                                    }`}
                            >
                                <span className={`text-[8px] font-bold uppercase tracking-tight whitespace-nowrap leading-none ${pill.isActive ? 'text-white' : 'text-red-600'}`}>
                                    {displayPillLabel}
                                </span>
                                <span className={`text-[10px] font-extrabold leading-none mt-[1px] ${pill.isActive ? 'text-white' : 'text-slate-900'}`}>{pill.count}</span>
                            </button>
                        );
                    })}

                    {dynamicCards.map((card, idx) => {
                        const Icon = card.icon;
                        const colorClasses = (colorMap[card.color] || colorMap.blue).split(' ');
                        return (
                            <div
                                key={`dyn-${idx}`}
                                onClick={card.onClick}
                                className={`bg-white border border-slate-200 border-b-4 ${colorClasses[0]} shadow-sm p-4 relative overflow-hidden group hover:bg-slate-50 transition-colors cursor-pointer active:scale-[0.98] flex-1 min-w-[130px]`}
                            >
                                <span className="block text-[32px] font-light text-slate-800 leading-none mb-2 relative z-10">{card.value}</span>
                                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide relative z-10">{card.label}</span>
                                <Icon className={`absolute -right-2 top-1/2 -translate-y-1/2 ${colorClasses[1]} opacity-[0.08] size-16 transition-transform group-hover:scale-110 group-hover:opacity-10`} />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (activePhase === 3) {
        const funnelCards = [
            {
                id: 'total',
                label: 'Total Candidates',
                value: phase3Metrics.total,
                icon: Users,
                color: 'purple',
                isActive: filterDecision === 'All' && filterStatus === 'All',
                onClick: () => { setFilterDecision('All'); setFilterStatus('All'); }
            },
            {
                id: 'offerSent',
                label: 'Offer Sent',
                value: phase3Metrics.offerSent,
                icon: FileText,
                color: 'sky',
                isActive: filterDecision === 'Offer Sent',
                onClick: () => { setFilterDecision('Offer Sent'); setFilterStatus('All'); }
            },
            {
                id: 'offerAccepted',
                label: 'Offer Accepted',
                value: phase3Metrics.offerAccepted,
                icon: ThumbsUp,
                color: 'amber',
                isActive: filterDecision === 'Offer Accepted',
                onClick: () => { setFilterDecision('Offer Accepted'); setFilterInterviewStatus('All'); }
            },
            {
                id: 'joined',
                label: 'Joined',
                value: phase3Metrics.joined,
                icon: CheckCircle,
                color: 'emerald',
                isActive: filterDecision === 'Joined',
                onClick: () => { setFilterDecision('Joined'); setFilterInterviewStatus('All'); }
            },
            {
                id: 'noShow',
                label: 'No Show / Declined',
                value: phase3Metrics.noShow,
                icon: XCircle,
                color: 'rose',
                isActive: filterDecision === 'No Show_Offer Declined',
                onClick: () => { setFilterDecision('No Show_Offer Declined'); setFilterInterviewStatus('All'); }
            }
        ];

        const dynamicCards = [];

        if (filterPreference !== 'All') {
            const prefCount = basePhase3Candidates.filter(c => c.preference === filterPreference).length;
            dynamicCards.push({
                label: filterPreference,
                value: prefCount,
                icon: UserCheck,
                color: 'indigo',
                onClick: () => { }
            });
        }

        if (filterRating !== 'All') {
            const ratedCount = basePhase3Candidates.filter(c => {
                const rounds = c.interviewRounds || [];
                const ratedRounds = rounds.filter(r => Number(r.phase || 1) === 3 && r.rating && r.rating > 0);
                if (ratedRounds.length === 0) return false;
                const avgRating = ratedRounds.reduce((acc, curr) => acc + curr.rating, 0) / ratedRounds.length;
                return avgRating >= Number(filterRating);
            }).length;
            dynamicCards.push({
                label: `${filterRating}+ Rating`,
                value: ratedCount,
                icon: ThumbsUp,
                color: 'amber',
                onClick: () => { }
            });
        }

        if (filterExperience) {
            const expCount = basePhase3Candidates.filter(c => c.totalExperience && Number(c.totalExperience) >= Number(filterExperience)).length;
            dynamicCards.push({
                label: `${filterExperience}+ Yrs Exp`,
                value: expCount,
                icon: Briefcase,
                color: 'blue',
                onClick: () => { }
            });
        }

        const allCards = [...funnelCards, ...dynamicCards];
        const gridCols = selectedCandidateId ? 'grid-cols-1 md:grid-cols-2' : `grid-cols-2 lg:grid-cols-${Math.min(allCards.length, 6)}`;

        return (
            <div className={`grid ${gridCols} gap-4`}>
                {allCards.map((card, idx) => {
                    const Icon = card.icon;
                    const colorClasses = (colorMap[card.color] || colorMap.blue).split(' ');

                    return (
                        <div
                            key={idx}
                            onClick={card.onClick}
                            className={`bg-white border border-slate-200 border-b-4 ${colorClasses[0]} shadow-sm p-4 relative overflow-hidden group hover:bg-slate-50 transition-colors cursor-pointer active:scale-[0.98] ${card.isActive ? 'bg-slate-50' : ''}`}
                        >
                            <span className="block text-[32px] font-light text-slate-800 leading-none mb-2 relative z-10">{card.value}</span>
                            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide relative z-10">{card.label}</span>
                            <Icon className={`absolute -right-2 top-1/2 -translate-y-1/2 ${colorClasses[1]} opacity-[0.08] size-16 transition-transform group-hover:scale-110 group-hover:opacity-10`} />
                        </div>
                    );
                })}
            </div>
        );
    }

    return null;
};

export default CandidateMetricsCards;
