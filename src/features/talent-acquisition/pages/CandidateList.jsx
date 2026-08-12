import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import Skeleton from '@/components/ui/Skeleton';
import BulkCandidateImport from '@/features/talent-acquisition/components/BulkCandidateImport';
import BulkResumeImport from '@/features/talent-acquisition/components/BulkResumeImport';
import { ProfileReviewModal } from '@/features/talent-acquisition/components/PublicApplicationsView';
import MassMailModal from '@/features/talent-acquisition/components/MassMailModal';
import BulkTransferModal from '@/features/talent-acquisition/components/BulkTransferModal';
import DecisionConfirmationModal from '@/components/common/DecisionConfirmationModal';
import MassInterviewScheduleModal from '@/features/talent-acquisition/components/MassInterviewScheduleModal';
import DynamicPhaseView from '@/features/talent-acquisition/components/DynamicPhaseView';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import { canViewTACandidateDetails } from '@/config/accessPolicies';

import {
    DEFAULT_DATE_FILTER_FIELD
} from '@/features/talent-acquisition/utils/CandidateListConstants';
import {
    getCandidateUploadedByName,
    getCandidateUploadType,
    getRoundsForPhase,
    getDisplayInterviewRoundsForPhase,
    hasPhase2InterviewActivity,
    matchesInterviewFilter,
    isRoundScheduledStatus,
    isRoundPassedStatus,
    normalizeMultiValueFilter,
    matchesMultiValueFilter,
    getPresetDateRange,
    getDefaultDateFilterState
} from '@/features/talent-acquisition/utils/candidateHelpers';
import { exportCandidatesToExcel } from '@/features/talent-acquisition/utils/exportExcel';

import CandidateHeaderToolbar from '@/features/talent-acquisition/components/CandidateHeaderToolbar';
import CandidateMetricsCards from '@/features/talent-acquisition/components/CandidateMetricsCards';
import CandidateFilters from '@/features/talent-acquisition/components/CandidateFilters';
import CandidateTable from '@/features/talent-acquisition/components/CandidateTable';
import CandidateSidePanel from '@/features/talent-acquisition/components/CandidateSidePanel';

const CandidateList = ({ hiringRequestId, positionName, isLegacyView = false, requestMeta = null }) => {
    const [resolvedRequest, setResolvedRequest] = useState(requestMeta);
    const [requestLoading, setRequestLoading] = useState(!requestMeta);

    useEffect(() => {
        let cancelled = false;

        if (requestMeta) {
            setResolvedRequest(requestMeta);
            setRequestLoading(false);
            return () => {
                cancelled = true;
            };
        }

        const fetchRequest = async () => {
            try {
                setRequestLoading(true);
                const response = await api.get(`/ta/hiring-request/${hiringRequestId}`);
                if (!cancelled) {
                    setResolvedRequest(response.data);
                }
            } catch (error) {
                console.error('Failed to resolve hiring request for candidate list:', error);
                if (!cancelled) {
                    toast.error(error.response?.data?.message || 'Failed to load requisition details');
                    setResolvedRequest(null);
                }
            } finally {
                if (!cancelled) {
                    setRequestLoading(false);
                }
            }
        };

        if (hiringRequestId) {
            fetchRequest();
        }

        return () => {
            cancelled = true;
        };
    }, [hiringRequestId, requestMeta]);

    if (requestLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-14 w-full rounded-2xl" />
                <div className="grid gap-4 md:grid-cols-3">
                    {[...Array(3)].map((_, index) => <Skeleton key={index} className="h-24 w-full rounded-2xl" />)}
                </div>
                <Skeleton className="h-105 w-full rounded-2xl" />
            </div>
        );
    }

    if (resolvedRequest?.useDynamicPhases === true) {
        return <DynamicPhaseView hiringRequest={resolvedRequest} />;
    }

    return <LegacyCandidateList hiringRequestId={hiringRequestId} positionName={positionName} isLegacyView={isLegacyView} requestMeta={resolvedRequest || requestMeta} />;
};

const LegacyCandidateList = ({ hiringRequestId, positionName, isLegacyView = false, requestMeta = null }) => {
    const savedFiltersKey = `ta_candidate_filters_${hiringRequestId || 'global'}`;

    const savedFilters = useMemo(() => {
        try {
            const raw = sessionStorage.getItem(savedFiltersKey);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error('Failed to parse saved candidate filters', e);
        }
        return null;
    }, [savedFiltersKey]);

    const [itemsPerPage, setItemsPerPage] = useState(() => savedFilters?.itemsPerPage ?? 50);
    const { user } = useAuth();
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(() => savedFilters?.page ?? 1);
    const [serverTotalPages, setServerTotalPages] = useState(1);
    const [serverResultCount, setServerResultCount] = useState(0);
    const [serverSummary, setServerSummary] = useState(null);
    const [cardMetrics, setCardMetrics] = useState(null);
    const [loadingMetrics, setLoadingMetrics] = useState(false);
    const [roundSummary, setRoundSummary] = useState(null);
    const [actionCandidates, setActionCandidates] = useState([]);

    // Filter States initialized with saved filters
    const [filterPreference, setFilterPreference] = useState(() => savedFilters?.filterPreference ?? 'All');
    const [filterStatus, setFilterStatus] = useState(() => savedFilters?.filterStatus ?? 'All');
    const [filterDecision, setFilterDecision] = useState(() => savedFilters?.filterDecision ?? 'All');
    const [filterExperience, setFilterExperience] = useState(() => savedFilters?.filterExperience ?? '');
    const [filterInterviewStatus, setFilterInterviewStatus] = useState(() => savedFilters?.filterInterviewStatus ?? 'All');
    const [filterRating, setFilterRating] = useState(() => savedFilters?.filterRating ?? 'All');
    const [filterPulledBy, setFilterPulledBy] = useState(() => savedFilters?.filterPulledBy ?? []);
    const [filterUploadedBy, setFilterUploadedBy] = useState(() => savedFilters?.filterUploadedBy ?? []);
    const [filterUploadType, setFilterUploadType] = useState(() => savedFilters?.filterUploadType ?? 'All');
    const [createdDatePreset, setCreatedDatePreset] = useState(() => savedFilters?.createdDatePreset ?? '');
    const [dateFilterField, setDateFilterField] = useState(() => savedFilters?.dateFilterField ?? '');
    const [dateFrom, setDateFrom] = useState(() => savedFilters?.dateFrom ?? '');
    const [dateTo, setDateTo] = useState(() => savedFilters?.dateTo ?? '');
    const [filterTransferred, setFilterTransferred] = useState(() => savedFilters?.filterTransferred ?? 'All');
    const [filterProfileShared, setFilterProfileShared] = useState(() => savedFilters?.filterProfileShared ?? false);
    const [filterInterviewRound, setFilterInterviewRound] = useState(() => savedFilters?.filterInterviewRound ?? '');
    const [filterDynamicStage, setFilterDynamicStage] = useState(() => savedFilters?.filterDynamicStage ?? 'All');
    const [candidateNameSearch, setCandidateNameSearch] = useState(() => savedFilters?.candidateNameSearch ?? '');

    useEffect(() => {
        setFilterDynamicStage('All');
    }, [filterInterviewRound]);
    const [users, setUsers] = useState([]);
    const debouncedCandidateNameSearch = useDebouncedValue(candidateNameSearch, 200);

    const [searchParams, setSearchParams] = useSearchParams();
    const selectedCandidateId = searchParams.get('candidateId');
    const initialPhaseParam = searchParams.get('phase');
    const initialPhase = initialPhaseParam ? parseInt(initialPhaseParam, 10) : (savedFilters?.activePhase || 1);

    // Menu State
    const [activeMenu, setActiveMenu] = useState(null);
    const [activePhase, setActivePhase] = useState(initialPhase);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [showBulkResumeImport, setShowBulkResumeImport] = useState(false);
    const [profileTarget, setProfileTarget] = useState(null);
    const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
    const [showMassMailModal, setShowMassMailModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferPresetIds, setTransferPresetIds] = useState([]);
    const [showMassInterviewModal, setShowMassInterviewModal] = useState(false);
    const [pendingDecisionChange, setPendingDecisionChange] = useState(null);
    const [showToolbarMenu, setShowToolbarMenu] = useState(false);
    const [showDecisionSubmenu, setShowDecisionSubmenu] = useState(false);
    const [showCreatedDateSortMenu, setShowCreatedDateSortMenu] = useState(false);
    const [openMultiFilter, setOpenMultiFilter] = useState(null);

    const [isSidePanelMaximized, setIsSidePanelMaximized] = useState(false);
    const isAdmin = user?.roles?.includes('Admin');
    const usesBackendPagination = !isLegacyView;
    const hasAnalyticsCandidateAccess = user?.permissions?.includes('ta.analytics.assigned')
        || user?.permissions?.includes('ta.analytics.global');
    const canEditCandidates = isAdmin
        || user?.permissions?.includes('ta.edit')
        || user?.permissions?.includes('ta.candidate.manage.assigned')
        || user?.permissions?.includes('ta.candidate.manage.all')
        || user?.permissions?.includes('ta.candidate.edit')
        || hasAnalyticsCandidateAccess;
    const canCreateCandidates = isAdmin
        || user?.permissions?.includes('*')
        || user?.permissions?.includes('ta.create')
        || user?.permissions?.includes('ta.candidate.manage.assigned')
        || user?.permissions?.includes('ta.candidate.manage.all')
        || hasAnalyticsCandidateAccess;
    const isInterviewerForAnyCandidate = useMemo(() => {
        const userId = String(user?._id || '');
        return candidates.some((c) =>
            Array.isArray(c.interviewRounds) && c.interviewRounds.some((round) =>
                Array.isArray(round.assignedTo) && round.assignedTo.some((uId) => String(uId?._id || uId) === userId)
            )
        );
    }, [candidates, user]);
    const canImportCandidates = canCreateCandidates || isInterviewerForAnyCandidate;
    const canDeleteCandidates = isAdmin
        || user?.permissions?.includes('*')
        || user?.permissions?.includes('ta.delete')
        || user?.permissions?.includes('ta.candidate.manage.assigned')
        || user?.permissions?.includes('ta.candidate.manage.all')
        || user?.permissions?.includes('ta.candidate.edit');
    const canMakeDecisions = isAdmin
        || user?.permissions?.includes('ta.edit')
        || user?.permissions?.includes('ta.candidate.manage.assigned')
        || user?.permissions?.includes('ta.candidate.manage.all')
        || user?.permissions?.includes('ta.candidate.edit')
        || user?.permissions?.includes('ta.candidate.make_decision')
        || user?.permissions?.includes('ta.interview.evaluate');
    const canManagePhase3Decisions = canMakeDecisions;
    const decisionOptions = useMemo(() => {
        if (activePhase === 2) {
            return ['Shortlisted', 'Selected', 'Rejected', 'On Hold', 'Did Not Turn Up', 'Left in between'];
        }
        if (activePhase === 3) {
            return ['Offer Sent', 'Offer Accepted', 'Joined', 'Offer Declined', 'No Show', 'Rejected', 'Left in between'];
        }
        return ['Shortlisted', 'Rejected', 'On Hold', 'Did Not Turn Up', 'Left in between'];
    }, [activePhase]);
    const canTransferCandidates = isAdmin
        || user?.permissions?.includes('ta.edit')
        || user?.permissions?.includes('ta.candidate.manage.assigned')
        || user?.permissions?.includes('ta.candidate.manage.all')
        || user?.permissions?.includes('ta.bulk_transfer')
        || user?.permissions?.includes('ta.candidate.transfer');
    const canMassMail = isAdmin
        || user?.permissions?.includes('ta.candidate.manage.assigned')
        || user?.permissions?.includes('ta.candidate.manage.all')
        || user?.permissions?.includes('ta.mass_mail')
        || user?.permissions?.includes('ta.edit');
    const canBulkTransfer = canTransferCandidates;
    const canManageTemplates = isAdmin
        || user?.permissions?.includes('ta.manage')
        || user?.permissions?.includes('ta.config.edit')
        || user?.permissions?.includes('ta.email_template.manage')
        || user?.permissions?.includes('*');
    const canViewCandidateDetails = canViewTACandidateDetails(user);
    const isProfileSharedCandidate = useCallback((candidate) => Boolean(
        candidate?.profileShared === true
        || candidate?.decision === 'Shortlisted'
        || candidate?.decision === 'Profile Shared'
        || (candidate?.phase2Decision && candidate?.phase2Decision !== 'None')
        || (candidate?.phase2InterviewStatus && candidate?.phase2InterviewStatus !== 'None')
        || Boolean(candidate?.phase2InterviewerFeedback)
    ), []);

    const handleSelectCandidate = (candId) => {
        if (!canViewCandidateDetails) {
            return;
        }
        const newParams = new URLSearchParams(searchParams);
        if (selectedCandidateId === candId) {
            newParams.delete('candidateId');
            setIsSidePanelMaximized(false);
        } else {
            newParams.set('candidateId', candId);
        }
        setSearchParams(newParams);
    };

    const handleCloseCandidate = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('candidateId');
        setIsSidePanelMaximized(false);
        setSearchParams(newParams);
    };

    const handleToggleMaximize = useCallback(() => {
        setIsSidePanelMaximized(prev => !prev);
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClose = (event) => {
            const target = event?.target;
            if (target instanceof Element) {
                const clickedMenuTrigger = target?.closest?.('[data-legacy-action-menu-trigger="true"]') || target?.closest?.('[data-dynamic-action-menu-trigger="true"]');
                const clickedMenuContent = target?.closest?.('[data-legacy-action-menu-content="true"]') || target?.closest?.('[data-dynamic-action-menu-content="true"]');
                const clickedToolbarTrigger = target?.closest?.('[data-toolbar-menu-trigger="true"]');
                const clickedToolbarContent = target?.closest?.('[data-toolbar-menu-content="true"]');
                const clickedMultiFilterTrigger = target?.closest?.('[data-multi-filter-trigger="true"]');
                const clickedMultiFilterPanel = target?.closest?.('[data-multi-filter-panel="true"]');
                const clickedSortTrigger = target?.closest?.('[data-created-sort-trigger="true"]');
                const clickedSortPanel = target?.closest?.('[data-created-sort-panel="true"]');

                if (clickedMenuTrigger || clickedMenuContent) {
                    return;
                }

                if (!clickedToolbarTrigger && !clickedToolbarContent) {
                    setShowToolbarMenu(false);
                }

                if (!clickedMultiFilterTrigger && !clickedMultiFilterPanel) {
                    setOpenMultiFilter(null);
                }

                if (!clickedSortTrigger && !clickedSortPanel) {
                    setShowCreatedDateSortMenu(false);
                }

                setActiveMenu(null);
            }
        };
        document.addEventListener('click', handleClose);
        window.addEventListener('scroll', handleClose, true);
        return () => {
            document.removeEventListener('click', handleClose);
            window.removeEventListener('scroll', handleClose, true);
        };
    }, []);

    // Sync activePhase state with search parameters on URL change
    useEffect(() => {
        const phaseParam = searchParams.get('phase');
        if (phaseParam) {
            const parsedPhase = parseInt(phaseParam, 10);
            if ([1, 2, 3].includes(parsedPhase) && parsedPhase !== activePhase) {
                setActivePhase(parsedPhase);
            }
        }
    }, [searchParams, activePhase]);

    // Save filters to sessionStorage whenever any filter changes
    useEffect(() => {
        if (!savedFiltersKey) return;
        const currentFilterState = {
            filterPreference,
            filterStatus,
            filterDecision,
            filterExperience,
            filterInterviewStatus,
            filterRating,
            filterPulledBy,
            filterUploadedBy,
            filterUploadType,
            createdDatePreset,
            dateFilterField,
            dateFrom,
            dateTo,
            filterTransferred,
            filterProfileShared,
            filterInterviewRound,
            filterDynamicStage,
            candidateNameSearch,
            page,
            itemsPerPage,
            activePhase
        };
        try {
            sessionStorage.setItem(savedFiltersKey, JSON.stringify(currentFilterState));
        } catch (e) {
            console.error('Error saving candidate filters:', e);
        }
    }, [
        savedFiltersKey,
        filterPreference,
        filterStatus,
        filterDecision,
        filterExperience,
        filterInterviewStatus,
        filterRating,
        filterPulledBy,
        filterUploadedBy,
        filterUploadType,
        createdDatePreset,
        dateFilterField,
        dateFrom,
        dateTo,
        filterTransferred,
        filterProfileShared,
        filterInterviewRound,
        filterDynamicStage,
        candidateNameSearch,
        page,
        itemsPerPage,
        activePhase
    ]);

    // Reset page to 1 when any filter changes (except on first mount to preserve restored page)
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        setPage(1);
    }, [activePhase, candidateNameSearch, filterPreference, filterStatus, filterDecision, filterExperience, filterInterviewStatus, filterRating, filterPulledBy, filterUploadedBy, filterUploadType, createdDatePreset, dateFilterField, dateFrom, dateTo, filterTransferred, filterProfileShared, filterInterviewRound, filterDynamicStage]);

    const normalizedCandidateNameSearch = debouncedCandidateNameSearch.trim().toLowerCase();
    const matchesCandidateNameSearch = useCallback((candidate) => {
        if (!normalizedCandidateNameSearch) {
            return true;
        }
        return String(candidate?.candidateName || '').toLowerCase().includes(normalizedCandidateNameSearch);
    }, [normalizedCandidateNameSearch]);

    const buildCandidateRequestParams = useCallback((overrides = {}) => {
        const {
            paginate = usesBackendPagination,
            pageOverride = page,
            limitOverride = itemsPerPage,
            activePhase: phaseOverride = activePhase,
            filterStatus: statusOverride = filterStatus,
            filterDecision: decisionOverride = filterDecision,
            filterInterviewStatus: interviewStatusOverride = filterInterviewStatus,
            filterPreference: preferenceOverride = filterPreference,
            filterRating: ratingOverride = filterRating,
            filterInterviewRound: roundOverride = filterInterviewRound,
            filterDynamicStage: dynamicStageOverride = filterDynamicStage
        } = overrides;

        const params = {
            t: Date.now()
        };

        if (dateFilterField) params.dateField = dateFilterField;
        if (dateFrom) params.startDate = dateFrom;
        if (dateTo) params.endDate = dateTo;

        if (usesBackendPagination) {
            params.paginate = paginate;
            params.page = pageOverride;
            params.limit = limitOverride;
            params.activePhase = phaseOverride;
            params.search = debouncedCandidateNameSearch.trim();
            params.filterPreference = preferenceOverride;
            params.filterStatus = statusOverride;
            params.filterDecision = decisionOverride;
            params.filterExperience = filterExperience;
            params.filterInterviewStatus = interviewStatusOverride;
            params.filterRating = ratingOverride;
            params.filterPulledBy = JSON.stringify(filterPulledBy);
            params.filterUploadedBy = JSON.stringify(filterUploadedBy);
            params.filterUploadType = filterUploadType;
            params.filterTransferred = filterTransferred;
            params.filterProfileShared = filterProfileShared;
            params.filterInterviewRound = roundOverride;
            params.filterDynamicStage = dynamicStageOverride;
        }

        return params;
    }, [
        activePhase,
        dateFilterField,
        dateFrom,
        dateTo,
        debouncedCandidateNameSearch,
        filterDecision,
        filterDynamicStage,
        filterExperience,
        filterInterviewRound,
        filterInterviewStatus,
        filterPreference,
        filterProfileShared,
        filterPulledBy,
        filterRating,
        filterStatus,
        filterTransferred,
        filterUploadType,
        filterUploadedBy,
        itemsPerPage,
        page,
        usesBackendPagination
    ]);

    const pulledByOptions = useMemo(() => {
        const options = normalizeMultiValueFilter([
            ...users.map((userItem) => `${userItem.firstName || ''} ${userItem.lastName || ''}`.trim()),
            ...candidates.map((candidate) => candidate.profilePulledBy),
            ...filterPulledBy
        ]);
        return options.sort((left, right) => left.localeCompare(right));
    }, [users, candidates, filterPulledBy]);

    const uploadedByOptions = useMemo(() => {
        const options = normalizeMultiValueFilter([
            ...candidates.map((candidate) => getCandidateUploadedByName(candidate)),
            ...filterUploadedBy
        ]);
        return options.sort((left, right) => left.localeCompare(right));
    }, [candidates, filterUploadedBy]);

    const applyCreatedDatePreset = useCallback((preset) => {
        if (preset === 'custom') {
            setCreatedDatePreset('custom');
            setDateFilterField((prev) => prev || DEFAULT_DATE_FILTER_FIELD);
            return;
        }
        const range = getPresetDateRange(preset);
        setCreatedDatePreset(preset);
        setDateFilterField((prev) => prev || DEFAULT_DATE_FILTER_FIELD);
        setDateFrom(range.startDate);
        setDateTo(range.endDate);
    }, []);

    const resetDateFiltersToDefault = useCallback(() => {
        const defaultDateFilterState = getDefaultDateFilterState();
        setCreatedDatePreset(defaultDateFilterState.createdDatePreset);
        setDateFilterField(defaultDateFilterState.dateFilterField);
        setDateFrom(defaultDateFilterState.dateFrom);
        setDateTo(defaultDateFilterState.dateTo);
    }, []);

    const isDefaultDateFilterState = useMemo(() => {
        const defaultDateFilterState = getDefaultDateFilterState();
        return (
            dateFilterField === defaultDateFilterState.dateFilterField
            && dateFrom === defaultDateFilterState.dateFrom
            && dateTo === defaultDateFilterState.dateTo
        );
    }, [dateFilterField, dateFrom, dateTo]);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await api.get('/admin/users');
            let fetchedUsers = [];
            if (res.data?.success) {
                fetchedUsers = res.data.data || [];
            } else if (Array.isArray(res.data)) {
                fetchedUsers = res.data;
            }

            const filteredUsers = fetchedUsers.filter(u => {
                const roleNames = u.roles?.map(r => r.name) || [];
                if (roleNames.includes('Admin')) return true;

                let hasCandidateCreateAccess = false;
                if (u.roles && Array.isArray(u.roles)) {
                    u.roles.forEach(role => {
                        if (role.permissions && Array.isArray(role.permissions)) {
                            const keys = role.permissions.map(p => typeof p === 'string' ? p : p.key);
                            if (
                                keys.includes('*')
                                || keys.includes('ta.create')
                                || keys.includes('ta.candidate.manage.assigned')
                                || keys.includes('ta.candidate.manage.all')
                            ) {
                                hasCandidateCreateAccess = true;
                            }
                        }
                    });
                }
                return hasCandidateCreateAccess;
            });

            setUsers(filteredUsers);
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    }, []);

    const structuralPhase1Candidates = useMemo(() => {
        if (usesBackendPagination) {
            return activePhase === 1 ? candidates : [];
        }
        return candidates.filter(candidate => {
            const matchCandidateName = matchesCandidateNameSearch(candidate);
            const matchPulledBy = matchesMultiValueFilter(filterPulledBy, candidate.profilePulledBy);
            const matchUploadedBy = matchesMultiValueFilter(filterUploadedBy, getCandidateUploadedByName(candidate));
            const matchUploadType = filterUploadType === 'All' || getCandidateUploadType(candidate) === filterUploadType;
            const matchTransferred = filterTransferred === 'All'
                ? true
                : filterTransferred === 'Transferred'
                    ? candidate.isTransferred
                    : !candidate.isTransferred;
            return matchCandidateName && matchPulledBy && matchUploadedBy && matchUploadType && matchTransferred;
        });
    }, [activePhase, candidates, filterPulledBy, filterUploadedBy, filterUploadType, filterTransferred, matchesCandidateNameSearch, usesBackendPagination]);

    const availableRoundOptions = useMemo(() => {
        const roundMap = new Map();
        const normalizeRoundTitle = (str) => {
            if (!str) return 'Round 1';
            const trimmed = String(str).trim();
            return trimmed.replace(/\b\w/g, (char) => char.toUpperCase());
        };

        const backendRoundsSummary = activePhase === 2
            ? (roundSummary?.phase2 || cardMetrics?.phase2Metrics?.interviewRoundsSummary)
            : (roundSummary?.phase1 || cardMetrics?.phase1Metrics?.interviewRoundsSummary);

        if (Array.isArray(backendRoundsSummary)) {
            for (const r of backendRoundsSummary) {
                const raw = String(r?.levelName || 'Round 1').trim() || 'Round 1';
                const key = raw.toLowerCase();
                if (raw && !roundMap.has(key)) {
                    roundMap.set(key, normalizeRoundTitle(raw));
                }
            }
        }

        for (const c of (candidates || [])) {
            for (const r of (c?.interviewRounds || [])) {
                if (Number(r?.phase || 1) === activePhase) {
                    const raw = String(r?.levelName || 'Round 1').trim() || 'Round 1';
                    const key = raw.toLowerCase();
                    if (raw && !roundMap.has(key)) {
                        roundMap.set(key, normalizeRoundTitle(raw));
                    }
                }
            }
        }

        return Array.from(roundMap.values());
    }, [activePhase, candidates, cardMetrics, roundSummary]);

    const basePhase1Candidates = useMemo(() => {
        const list = activePhase === 1 ? candidates : [];
        return list.filter(candidate => {
            const matchPreference = filterPreference === 'All' || candidate.preference === filterPreference;
            const matchExperience = !filterExperience || (candidate.totalExperience && Number(candidate.totalExperience) >= Number(filterExperience));

            let matchRating = true;
            if (filterRating !== 'All') {
                const rounds = candidate.interviewRounds ? candidate.interviewRounds.filter(r => Number(r.phase || 1) === 1) : [];
                const ratedRounds = rounds.filter(r => r.rating && r.rating > 0);
                if (ratedRounds.length === 0) {
                    matchRating = false;
                } else {
                    const minRequired = Number(filterRating);
                    const avgRating = ratedRounds.reduce((acc, curr) => acc + curr.rating, 0) / ratedRounds.length;
                    matchRating = avgRating >= minRequired;
                }
            }
            return matchPreference && matchExperience && matchRating;
        });
    }, [activePhase, candidates, filterExperience, filterPreference, filterRating]);

    const filteredCandidates = useMemo(() => {
        return basePhase1Candidates.filter(candidate => {
            const mainStatuses = ['Interested', 'Not Interested', 'Not Relevant', 'Not Picking', 'High expectation', 'Long Notice period', 'Location Not suitable'];
            const matchStatus = filterStatus === 'All'
                ? true
                : ['Other', 'None', 'OTH'].includes(filterStatus)
                    ? !mainStatuses.includes(candidate.status)
                    : candidate.status === filterStatus;
            const matchDecision = filterDecision === 'All' || (candidate.decision || 'None') === filterDecision;
            const matchProfileShared = !filterProfileShared || isProfileSharedCandidate(candidate);

            let matchInterviewStatus = true;
            if (filterInterviewStatus !== 'All') {
                const rounds = getRoundsForPhase(candidate, 1);
                matchInterviewStatus = matchesInterviewFilter(rounds, filterInterviewStatus);
            }

            const isNotScheduledFilter = filterDynamicStage && filterDynamicStage.startsWith('NotScheduled_');

            let matchInterviewRound = true;
            if (filterInterviewRound && !isNotScheduledFilter) {
                const targetRound = String(filterInterviewRound).trim().toLowerCase();
                const rounds = getRoundsForPhase(candidate, 1);
                matchInterviewRound = (rounds || []).some(
                    (r) => String(r.levelName || '').trim().toLowerCase() === targetRound
                );
            }

            let matchDynamicStage = true;
            if (filterDynamicStage && filterDynamicStage !== 'All') {
                const parts = filterDynamicStage.split('_');
                const statusType = parts[0];
                const targetRoundName = parts.slice(1).join('_').trim().toLowerCase();
                const rounds = getRoundsForPhase(candidate, 1);

                if (statusType === 'NotScheduled' || statusType === 'Unscheduled') {
                    const hasTargetRound = (rounds || []).some(
                        (r) => String(r.levelName || '').trim().toLowerCase() === targetRoundName
                    );
                    matchDynamicStage = !hasTargetRound;
                } else {
                    const targetRoundObj = (rounds || []).find(
                        (r) => String(r.levelName || '').trim().toLowerCase() === targetRoundName
                    );

                    if (!targetRoundObj) {
                        matchDynamicStage = false;
                    } else {
                        const s = String(targetRoundObj.status || 'Pending').trim();
                        if (statusType === 'Cleared') {
                            matchDynamicStage = s === 'Passed' || s === 'Pass' || s === 'Shortlisted';
                        } else if (statusType === 'Failed') {
                            matchDynamicStage = s === 'Failed' || s === 'Fail' || s === 'Rejected';
                        } else if (statusType === 'DNTU') {
                            matchDynamicStage = s === 'Did Not Turn Up' || s === 'Did Not Turnup' || s === 'Did Not Turn up' || s === 'Skipped' || s === 'No Show' || s === 'DNTU';
                        } else if (statusType === 'LIB') {
                            matchDynamicStage = s === 'Left in between' || s === 'Left In Between' || s === 'LIB';
                        } else if (statusType === 'Pending') {
                            matchDynamicStage = s === 'Pending' || s === 'Scheduled';
                        }
                    }
                }
            }

            return matchStatus && matchDecision && matchInterviewStatus && matchProfileShared && matchInterviewRound && matchDynamicStage;
        });
    }, [basePhase1Candidates, filterDecision, filterDynamicStage, filterInterviewRound, filterInterviewStatus, filterProfileShared, filterStatus, isProfileSharedCandidate]);

    const metrics = useMemo(() => {
        if (usesBackendPagination && cardMetrics?.phase1Metrics) {
            return cardMetrics.phase1Metrics;
        }

        const counts = {
            total: structuralPhase1Candidates.length,
            interested: structuralPhase1Candidates.filter(c => c.status === 'Interested').length,
            notInterested: structuralPhase1Candidates.filter(c => c.status === 'Not Interested').length,
            notRelevant: structuralPhase1Candidates.filter(c => c.status === 'Not Relevant').length,
            notPicking: structuralPhase1Candidates.filter(c => c.status === 'Not Picking').length,
            highExpectation: structuralPhase1Candidates.filter(c => c.status === 'High expectation').length,
            longNoticePeriod: structuralPhase1Candidates.filter(c => c.status === 'Long Notice period').length,
            locationNotSuitable: structuralPhase1Candidates.filter(c => c.status === 'Location Not suitable').length,
            otherStatus: structuralPhase1Candidates.filter(c => !['Interested', 'Not Interested', 'Not Relevant', 'Not Picking', 'High expectation', 'Long Notice period', 'Location Not suitable'].includes(c.status)).length,
            interviewScheduled: structuralPhase1Candidates.filter(c =>
                getRoundsForPhase(c, 1).length > 0
            ).length,
            shortlisted: structuralPhase1Candidates.filter(c => c.decision === 'Shortlisted').length,
            rejected: structuralPhase1Candidates.filter(c => c.decision === 'Rejected').length,
            didNotTurnUp: structuralPhase1Candidates.filter(c => c.decision === 'Did Not Turn Up').length,
            onHold: structuralPhase1Candidates.filter(c => c.decision === 'On Hold').length,
            profileShared: structuralPhase1Candidates.filter(c => isProfileSharedCandidate(c)).length,
            transferred: structuralPhase1Candidates.filter(c => c.isTransferred).length,
        };
        return counts;
    }, [cardMetrics, structuralPhase1Candidates, isProfileSharedCandidate, usesBackendPagination]);

    const structuralPhase2Candidates = useMemo(() => {
        const list = candidates.filter(c => isProfileSharedCandidate(c));
        if (usesBackendPagination) {
            return activePhase === 2 ? list : [];
        }
        return list.filter(c => {
            const matchCandidateName = matchesCandidateNameSearch(c);
            const matchPulledBy = matchesMultiValueFilter(filterPulledBy, c.profilePulledBy);
            const matchUploadedBy = matchesMultiValueFilter(filterUploadedBy, getCandidateUploadedByName(c));
            const matchUploadType = filterUploadType === 'All' || getCandidateUploadType(c) === filterUploadType;
            const matchTransferred = filterTransferred === 'All' || (filterTransferred === 'Transferred' ? c.isTransferred : !c.isTransferred);
            return matchCandidateName && matchPulledBy && matchUploadedBy && matchUploadType && matchTransferred;
        });
    }, [activePhase, candidates, filterPulledBy, filterUploadedBy, filterUploadType, filterTransferred, isProfileSharedCandidate, matchesCandidateNameSearch, usesBackendPagination]);

    const basePhase2Candidates = useMemo(() => {
        const list = structuralPhase2Candidates.filter(c => isProfileSharedCandidate(c));
        if (usesBackendPagination) {
            return activePhase === 2 ? list : [];
        }
        return list.filter(candidate => {
            const matchPreference = filterPreference === 'All' || candidate.preference === filterPreference;
            const matchExperience = !filterExperience || (candidate.totalExperience && Number(candidate.totalExperience) >= Number(filterExperience));
            let matchRating = true;
            if (filterRating !== 'All') {
                const rounds = candidate.interviewRounds ? candidate.interviewRounds.filter(r => Number(r.phase || 1) === 2) : [];
                const ratedRounds = rounds.filter(r => r.rating && r.rating > 0);
                if (ratedRounds.length === 0) { matchRating = false; } else {
                    const avgRating = ratedRounds.reduce((acc, curr) => acc + curr.rating, 0) / ratedRounds.length;
                    matchRating = avgRating >= Number(filterRating);
                }
            }
            return matchPreference && matchExperience && matchRating;
        });
    }, [activePhase, candidates, filterExperience, filterPreference, filterRating, isProfileSharedCandidate, structuralPhase2Candidates, usesBackendPagination]);

    const phase2Filtered = useMemo(() => {
        const list = basePhase2Candidates.filter(c => isProfileSharedCandidate(c));
        if (usesBackendPagination) {
            return activePhase === 2 ? list : [];
        }
        return basePhase2Candidates.filter(candidate => {
            const matchDecision = filterDecision === 'All' ||
                (filterDecision === 'Shortlisted_Selected'
                    ? (candidate.phase2Decision === 'Shortlisted' || candidate.phase2Decision === 'Selected')
                    : (candidate.phase2Decision || 'None') === filterDecision);
            let matchInterviewStatus = true;
            if (filterInterviewStatus !== 'All') {
                matchInterviewStatus = filterInterviewStatus === 'Scheduled'
                    ? hasPhase2InterviewActivity(candidate)
                    : matchesInterviewFilter(getDisplayInterviewRoundsForPhase(candidate, 2), filterInterviewStatus);
            }
            let matchDynamicStage = true;
            if (filterDynamicStage && filterDynamicStage !== 'All') {
                const parts = filterDynamicStage.split('_');
                const statusType = parts[0];
                const targetRoundName = parts.slice(1).join('_').trim().toLowerCase();
                const rounds = getRoundsForPhase(candidate, 2);

                if (statusType === 'NotScheduled' || statusType === 'Unscheduled') {
                    const hasTargetRound = (rounds || []).some(
                        (r) => String(r.levelName || '').trim().toLowerCase() === targetRoundName
                    );
                    matchDynamicStage = !hasTargetRound;
                } else {
                    const targetRoundObj = (rounds || []).find(
                        (r) => String(r.levelName || '').trim().toLowerCase() === targetRoundName
                    );

                    if (!targetRoundObj) {
                        matchDynamicStage = false;
                    } else {
                        const s = String(targetRoundObj.status || 'Pending').trim();
                        if (statusType === 'Cleared') {
                            matchDynamicStage = s === 'Passed' || s === 'Pass' || s === 'Shortlisted';
                        } else if (statusType === 'Failed') {
                            matchDynamicStage = s === 'Failed' || s === 'Fail' || s === 'Rejected';
                        } else if (statusType === 'DNTU') {
                            matchDynamicStage = s === 'Did Not Turn Up' || s === 'Did Not Turnup' || s === 'Did Not Turn up' || s === 'Skipped' || s === 'No Show' || s === 'DNTU';
                        } else if (statusType === 'LIB') {
                            matchDynamicStage = s === 'Left in between' || s === 'Left In Between' || s === 'LIB';
                        } else if (statusType === 'Pending') {
                            matchDynamicStage = s === 'Pending' || s === 'Scheduled';
                        }
                    }
                }
            }
            return matchDecision && matchInterviewStatus && matchDynamicStage;
        });
    }, [activePhase, basePhase2Candidates, candidates, filterDecision, filterDynamicStage, filterInterviewStatus, usesBackendPagination]);

    const phase2Metrics = useMemo(() => {
        if (usesBackendPagination && cardMetrics?.phase2Metrics) {
            return cardMetrics.phase2Metrics;
        }
        return {
            totalShortlisted: structuralPhase2Candidates.length,
            totalScreened: structuralPhase2Candidates.filter(c => c.phase2Decision === 'Shortlisted' || c.phase2Decision === 'Selected' || c.decision === 'Shortlisted' || c.decision === 'Selected').length,
            selected: structuralPhase2Candidates.filter(c => c.phase2Decision === 'Selected' || c.decision === 'Selected').length,
            rejected: structuralPhase2Candidates.filter(c => c.phase2Decision === 'Rejected' || c.decision === 'Rejected').length,
            interviewScheduled: structuralPhase2Candidates.filter(hasPhase2InterviewActivity).length
        };
    }, [cardMetrics, structuralPhase2Candidates, usesBackendPagination]);

    const structuralPhase3Candidates = useMemo(() => {
        if (usesBackendPagination) {
            return activePhase === 3 ? candidates : [];
        }
        return candidates.filter(c => {
            const isSelected = c.phase2Decision === 'Selected';
            const matchCandidateName = matchesCandidateNameSearch(c);
            const matchPulledBy = matchesMultiValueFilter(filterPulledBy, c.profilePulledBy);
            const matchUploadedBy = matchesMultiValueFilter(filterUploadedBy, getCandidateUploadedByName(c));
            const matchUploadType = filterUploadType === 'All' || getCandidateUploadType(c) === filterUploadType;
            const matchTransferred = filterTransferred === 'All' || (filterTransferred === 'Transferred' ? c.isTransferred : !c.isTransferred);
            return isSelected && matchCandidateName && matchPulledBy && matchUploadedBy && matchUploadType && matchTransferred;
        });
    }, [activePhase, candidates, filterPulledBy, filterUploadedBy, filterUploadType, filterTransferred, matchesCandidateNameSearch, usesBackendPagination]);

    const basePhase3Candidates = useMemo(() => {
        if (usesBackendPagination) {
            return activePhase === 3 ? candidates : [];
        }
        return structuralPhase3Candidates.filter(candidate => {
            const matchPreference = filterPreference === 'All' || candidate.preference === filterPreference;
            const matchExperience = !filterExperience || (candidate.totalExperience && Number(candidate.totalExperience) >= Number(filterExperience));
            let matchRating = true;
            if (filterRating !== 'All') {
                const rounds = candidate.interviewRounds ? candidate.interviewRounds.filter(r => Number(r.phase || 1) === 3) : [];
                const ratedRounds = rounds.filter(r => r.rating && r.rating > 0);
                if (ratedRounds.length === 0) { matchRating = false; } else {
                    const avgRating = ratedRounds.reduce((acc, curr) => acc + curr.rating, 0) / ratedRounds.length;
                    matchRating = avgRating >= Number(filterRating);
                }
            }
            return matchPreference && matchExperience && matchRating;
        });
    }, [activePhase, candidates, filterExperience, filterPreference, filterRating, structuralPhase3Candidates, usesBackendPagination]);

    const phase3Filtered = useMemo(() => {
        if (usesBackendPagination) {
            return activePhase === 3 ? candidates : [];
        }
        return basePhase3Candidates.filter(candidate => {
            const matchDecision = filterDecision === 'All' ||
                (filterDecision === 'No Show_Offer Declined'
                    ? (candidate.phase3Decision === 'No Show' || candidate.phase3Decision === 'Offer Declined')
                    : filterDecision === 'Offer Sent'
                        ? ['Offer Sent', 'Offer Accepted', 'Joined'].includes(candidate.phase3Decision)
                        : filterDecision === 'Offer Accepted'
                            ? ['Offer Accepted', 'Joined'].includes(candidate.phase3Decision)
                            : (candidate.phase3Decision || 'None') === filterDecision);

            let matchInterviewStatus = true;
            if (filterInterviewStatus !== 'All') {
                const rounds = getRoundsForPhase(candidate, 3);
                matchInterviewStatus = matchesInterviewFilter(rounds, filterInterviewStatus);
            }
            return matchDecision && matchInterviewStatus;
        });
    }, [activePhase, basePhase3Candidates, candidates, filterDecision, filterInterviewStatus, usesBackendPagination]);

    const phase3Metrics = useMemo(() => {
        if (usesBackendPagination && cardMetrics?.phase3Metrics) {
            return cardMetrics.phase3Metrics;
        }
        return {
            total: structuralPhase3Candidates.length,
            offerSent: structuralPhase3Candidates.filter(c => ['Offer Sent', 'Offer Accepted', 'Joined'].includes(c.phase3Decision)).length,
            offerAccepted: structuralPhase3Candidates.filter(c => ['Offer Accepted', 'Joined'].includes(c.phase3Decision)).length,
            joined: structuralPhase3Candidates.filter(c => c.phase3Decision === 'Joined').length,
            noShow: structuralPhase3Candidates.filter(c => c.phase3Decision === 'No Show' || c.phase3Decision === 'Offer Declined').length
        };
    }, [cardMetrics, structuralPhase3Candidates, usesBackendPagination]);

    const fetchCardMetrics = useCallback(async () => {
        if (!hiringRequestId) return;
        try {
            setLoadingMetrics(true);
            const params = buildCandidateRequestParams();
            const response = await api.get(`/ta/candidates/${hiringRequestId}/card-filters`, { params });
            setCardMetrics(response.data.summary || null);
        } catch (error) {
            console.error('Error fetching card metrics:', error);
        } finally {
            setLoadingMetrics(false);
        }
    }, [buildCandidateRequestParams, hiringRequestId]);

    const fetchRoundSummary = useCallback(async () => {
        if (!hiringRequestId || isLegacyView) return;
        try {
            const params = {
                search: debouncedCandidateNameSearch || undefined,
                filterPulledBy: filterPulledBy.length ? JSON.stringify(filterPulledBy) : undefined,
                filterUploadedBy: filterUploadedBy.length ? JSON.stringify(filterUploadedBy) : undefined,
                filterUploadType: filterUploadType !== 'All' ? filterUploadType : undefined,
                filterTransferred: filterTransferred !== 'All' ? filterTransferred : undefined,
                dateField: dateFilterField || undefined,
                startDate: dateFrom || undefined,
                endDate: dateTo || undefined
            };
            Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);
            const response = await api.get(`/ta/candidates/${hiringRequestId}/round-summary`, { params });
            setRoundSummary(response.data || null);
        } catch (error) {
            console.error('Error fetching round summary:', error);
        }
    }, [hiringRequestId, isLegacyView, debouncedCandidateNameSearch, filterPulledBy, filterUploadedBy, filterUploadType, filterTransferred, dateFilterField, dateFrom, dateTo]);

    const abortControllerRef = useRef(null);

    const fetchCandidates = useCallback(async (silent = false, overrides = {}) => {
        if (!hiringRequestId) return;
        try {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();

            if (!silent) setLoading(true);
            const endpoint = isLegacyView
                ? `/ta/hiring-request/${hiringRequestId}/previous-candidates`
                : `/ta/candidates/${hiringRequestId}`;
            const params = isLegacyView ? { t: Date.now() } : buildCandidateRequestParams(overrides);
            if (isLegacyView) {
                if (dateFilterField) params.dateField = dateFilterField;
                if (dateFrom) params.startDate = dateFrom;
                if (dateTo) params.endDate = dateTo;
            }
            const response = await api.get(endpoint, {
                params,
                signal: abortControllerRef.current.signal
            });
            if (isLegacyView) {
                setCandidates(response.data);
                setServerTotalPages(1);
                setServerResultCount(Array.isArray(response.data) ? response.data.length : 0);
                setServerSummary(null);
                setCardMetrics(null);
            } else {
                setCandidates(response.data.candidates || []);
                setPage(response.data.currentPage || 1);
                setServerTotalPages(response.data.totalPages || 1);
                setServerResultCount(response.data.count || 0);
                setServerSummary(response.data.summary || null);
                void fetchCardMetrics();
                void fetchRoundSummary();
            }
        } catch (error) {
            if (error.name === 'CanceledError' || error.name === 'AbortError' || api.isCancel?.(error)) {
                return;
            }
            console.error('Error fetching candidates:', error);
            toast.error('Failed to load candidates');
        } finally {
            setLoading(false);
        }
    }, [buildCandidateRequestParams, dateFilterField, dateFrom, dateTo, hiringRequestId, isLegacyView, fetchCardMetrics, fetchRoundSummary]);

    const fetchAllMatchingCandidates = useCallback(async () => {
        if (isLegacyView) {
            const params = { t: Date.now() };
            if (dateFilterField) params.dateField = dateFilterField;
            if (dateFrom) params.startDate = dateFrom;
            if (dateTo) params.endDate = dateTo;
            const response = await api.get(`/ta/hiring-request/${hiringRequestId}/previous-candidates`, { params });
            return response.data || [];
        }

        const params = buildCandidateRequestParams({ paginate: false });
        const response = await api.get(`/ta/candidates/${hiringRequestId}/interview-details`, { params });
        return Array.isArray(response.data) ? response.data : (response.data.candidates || []);
    }, [
        buildCandidateRequestParams,
        dateFilterField,
        dateFrom,
        dateTo,
        hiringRequestId,
        isLegacyView
    ]);

    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    const handleHeaderSort = (columnKey) => {
        if (sortColumn === columnKey) {
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else {
                setSortColumn(null);
                setSortDirection('asc');
            }
        } else {
            setSortColumn(columnKey);
            setSortDirection('asc');
        }
    };

    const activeList = useMemo(() => {
        const rawList = activePhase === 1 ? filteredCandidates : activePhase === 2 ? phase2Filtered : phase3Filtered;

        if (!filterInterviewRound) return rawList;

        const targetRound = String(filterInterviewRound).trim().toLowerCase();
        return rawList.filter((candidate) => {
            const rounds = getRoundsForPhase(candidate, activePhase || 1);
            return (rounds || []).some(
                (r) => String(r.levelName || '').trim().toLowerCase() === targetRound
            );
        });
    }, [activePhase, filterInterviewRound, filteredCandidates, phase2Filtered, phase3Filtered]);

    const sortedActiveList = useMemo(() => {
        if (!sortColumn) return activeList;
        return [...activeList].sort((a, b) => {
            let valA = '';
            let valB = '';
            switch (sortColumn) {
                case 'candidate':
                    valA = (a.candidateName || a.name || `${a.firstName || ''} ${a.lastName || ''}`).trim().toLowerCase();
                    valB = (b.candidateName || b.name || `${b.firstName || ''} ${b.lastName || ''}`).trim().toLowerCase();
                    return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'contact':
                    valA = (a.email || a.phone || a.mobile || '').toLowerCase();
                    valB = (b.email || b.phone || b.mobile || '').toLowerCase();
                    return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'experience':
                    valA = Number(a.totalExperience || a.experience || 0);
                    valB = Number(b.totalExperience || b.experience || 0);
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
                case 'ctc':
                    valA = Number(a.currentCTC || a.expectedCTC || a.ctc || 0);
                    valB = Number(b.currentCTC || b.expectedCTC || b.ctc || 0);
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
                case 'interviews':
                    valA = Array.isArray(a.interviewRounds) ? a.interviewRounds.length : (a.rounds ? a.rounds.length : 0);
                    valB = Array.isArray(b.interviewRounds) ? b.interviewRounds.length : (b.rounds ? b.rounds.length : 0);
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
                case 'decision':
                    valA = (a.finalDecision || a.decision || a.phase2Decision || a.phase3Decision || '').toLowerCase();
                    valB = (b.finalDecision || b.decision || b.phase2Decision || b.phase3Decision || '').toLowerCase();
                    return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'pulled':
                    valA = new Date(a.createdAt || a.pulledAt || a.uploadedAt || 0).getTime();
                    valB = new Date(b.createdAt || b.pulledAt || b.uploadedAt || 0).getTime();
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
                case 'status':
                    valA = (a.status || a.candidateStatus || '').toLowerCase();
                    valB = (b.status || b.candidateStatus || '').toLowerCase();
                    return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                default:
                    return 0;
            }
        });
    }, [activeList, sortColumn, sortDirection]);

    const totalPages = usesBackendPagination
        ? serverTotalPages
        : (Math.ceil(sortedActiveList.length / itemsPerPage) || 1);
    const paginatedCandidates = usesBackendPagination
        ? sortedActiveList
        : sortedActiveList.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const allVisibleSelected = sortedActiveList.length > 0 && sortedActiveList.every((candidate) => selectedCandidateIds.includes(candidate._id));

    useEffect(() => {
        setSelectedCandidateIds([]);
    }, [activePhase]);

    useEffect(() => {
        if (hiringRequestId) {
            fetchCandidates();
        }
        fetchUsers();
    }, [hiringRequestId, fetchCandidates, fetchUsers]);

    const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

    const toggleMenu = useCallback((e, candidateId) => {
        e.stopPropagation();
        e.preventDefault();
        if (activeMenu === candidateId) {
            setActiveMenu(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = 220;

            let positionStyles = {
                right: window.innerWidth - rect.right
            };

            if (spaceBelow < menuHeight && rect.top > menuHeight) {
                positionStyles.bottom = window.innerHeight - rect.top + 5;
            } else {
                positionStyles.top = rect.bottom + 5;
            }

            setMenuPosition(positionStyles);
            setActiveMenu(candidateId);
        }
    }, [activeMenu]);

    const handleEdit = useCallback((candidate) => {
        navigate(`/ta/hiring-request/${hiringRequestId}/candidate/${candidate._id}/edit`);
    }, [navigate, hiringRequestId]);

    const handleView = useCallback((candidate) => {
        if (!canViewCandidateDetails) {
            toast.error('Candidate details require ta.candidate.manage.all or ta.candidate.manage.assigned');
            return;
        }
        navigate(`/ta/hiring-request/${hiringRequestId}/candidate/${candidate._id}/view?phase=${activePhase}`);
    }, [activePhase, canViewCandidateDetails, hiringRequestId, navigate]);

    const handleDelete = useCallback(async (candidateId) => {
        if (!window.confirm('Are you sure you want to delete this candidate?')) return;

        try {
            await api.delete(`/ta/candidates/${candidateId}`);
            toast.success('Candidate deleted successfully');
            fetchCandidates();
        } catch (error) {
            console.error('Error deleting candidate:', error);
            toast.error(error.response?.data?.message || 'Failed to delete candidate');
        }
    }, [fetchCandidates]);

    const handlePhaseChange = useCallback((phase) => {
        if (phase === activePhase) return;
        setActivePhase(phase);
        setPage(1);
        setFilterStatus('All');
        setFilterDecision('All');
        setFilterInterviewStatus('All');
        setFilterPreference('All');
        setFilterRating('All');
        setFilterInterviewRound('');
        setFilterDynamicStage('All');
        setCandidates([]);
        setLoading(true);
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('phase', phase);
            return next;
        }, { replace: true });

        fetchCandidates(false, {
            activePhase: phase,
            filterStatus: 'All',
            filterDecision: 'All',
            filterInterviewStatus: 'All',
            filterPreference: 'All',
            filterRating: 'All',
            filterInterviewRound: '',
            filterDynamicStage: 'All',
            pageOverride: 1
        });
    }, [activePhase, fetchCandidates, setSearchParams]);

    const handleAddNew = useCallback(() => {
        navigate(`/ta/hiring-request/${hiringRequestId}/add-candidate`);
    }, [navigate, hiringRequestId]);

    const toggleCandidateSelection = useCallback((candidateId) => {
        setSelectedCandidateIds((prev) => (
            prev.includes(candidateId)
                ? prev.filter((id) => id !== candidateId)
                : [...prev, candidateId]
        ));
    }, []);

    const toggleSelectAllVisible = useCallback(() => {
        setSelectedCandidateIds((prev) => {
            if (allVisibleSelected) {
                return prev.filter((id) => !activeList.some((candidate) => candidate._id === id));
            }
            const merged = new Set([...prev, ...activeList.map((candidate) => candidate._id)]);
            return [...merged];
        });
    }, [activeList, allVisibleSelected]);

    const openMassMailModal = useCallback(async () => {
        try {
            const matchingCandidates = await fetchAllMatchingCandidates();
            setActionCandidates(matchingCandidates);
            setShowMassMailModal(true);
        } catch (error) {
            console.error('Error preparing mass mail candidates:', error);
            toast.error('Failed to load candidates for mass mail');
        }
    }, [fetchAllMatchingCandidates]);

    const openTransferModal = useCallback(async (candidateIds = []) => {
        try {
            const matchingCandidates = await fetchAllMatchingCandidates();
            setActionCandidates(matchingCandidates);
            setTransferPresetIds(candidateIds);
            setShowTransferModal(true);
        } catch (error) {
            console.error('Error preparing transfer candidates:', error);
            toast.error('Failed to load candidates for transfer');
        }
    }, [fetchAllMatchingCandidates]);

    const openMassInterviewModal = useCallback(async () => {
        try {
            const matchingCandidates = await fetchAllMatchingCandidates();
            setActionCandidates(matchingCandidates);
            setShowMassInterviewModal(true);
        } catch (error) {
            console.error('Error preparing mass interview candidates:', error);
            toast.error('Failed to load candidates for scheduling');
        }
    }, [fetchAllMatchingCandidates]);

    const handleTransferToOnboarding = useCallback(async (candidateId) => {
        if (!window.confirm("Are you sure you want to transfer this candidate to the onboarding pipeline? This will create a new onboarding record for them.")) return;

        try {
            await api.post(`/ta/candidates/${candidateId}/transfer-to-onboarding`);
            toast.success('Candidate transferred successfully to onboarding.');
            fetchCandidates();
        } catch (error) {
            console.error('Transfer error:', error);
            toast.error(error.response?.data?.message || 'Failed to transfer candidate');
        }
    }, [fetchCandidates]);

    const handleMoveBackToPreviousPhase = useCallback(async (candidateId) => {
        if (!window.confirm('Move this candidate back to Phase 1? This will clear Phase 2 status, feedback, and Phase 2 interview rounds.')) return;

        try {
            await api.patch(`/ta/candidates/${candidateId}/move-back-phase`);
            toast.success('Candidate moved back to Phase 1');
            fetchCandidates();
        } catch (error) {
            console.error('Error moving candidate back to previous phase:', error);
            toast.error(error.response?.data?.message || 'Failed to move candidate back to Phase 1');
        }
    }, [fetchCandidates]);

    const handleExportExcelWrapper = () => {
        exportCandidatesToExcel({
            hiringRequestId,
            positionName,
            activePhase,
            fetchAllMatchingCandidates,
            users,
            isProfileSharedCandidate
        });
    };

    const handleDecisionChange = async (candidateId, newDecision) => {
        if (['Shortlisted', 'Rejected', 'Did Not Turn Up'].includes(newDecision)) {
            const cand = candidates.find(c => c._id === candidateId);
            setPendingDecisionChange({ id: candidateId, name: cand?.candidateName || '', decision: newDecision });
            return;
        }
        await executeDecisionChange(candidateId, newDecision);
    };

    const executeDecisionChange = async (candidateId, newDecision) => {
        try {
            await api.patch(`/ta/candidates/${candidateId}/decision`, { decision: newDecision });
            toast.success('Decision updated');
            setCandidates(prev => prev.map(c =>
                c._id === candidateId ? { ...c, decision: newDecision } : c
            ));
            fetchCandidates(true);
        } catch (error) {
            console.error('Error updating decision:', error);
            toast.error(error.response?.data?.message || 'Failed to update decision');
        }
    };

    const handleConfirmDecisionChange = async () => {
        if (!pendingDecisionChange) return;
        const { id, decision } = pendingDecisionChange;
        setPendingDecisionChange(null);
        await executeDecisionChange(id, decision);
    };

    const handleCancelDecisionChange = () => {
        setPendingDecisionChange(null);
        fetchCandidates(true);
    };

    const handleBulkDecisionChange = async (newDecision) => {
        if (!selectedCandidateIds.length) {
            toast.error('Select at least one candidate.');
            return;
        }

        try {
            toast.loading(`Updating decision to "${newDecision}"...`, { id: 'bulk-decision' });
            await api.post('/ta/candidates/bulk-decision', {
                candidateIds: selectedCandidateIds,
                decision: newDecision,
                phase: activePhase
            });

            toast.success(`Updated decision to "${newDecision}" for ${selectedCandidateIds.length} candidate(s)`, { id: 'bulk-decision' });
            setSelectedCandidateIds([]);
            await fetchCandidates(true);
        } catch (error) {
            console.error('Error updating bulk decision:', error);
            toast.error(error.response?.data?.message || 'Failed to update decision');
        }
    };

    const handleMoveToNextPhase = async (candidateId) => {
        try {
            await api.put(`/ta/candidates/${candidateId}`, { profileShared: true });
            toast.success('Candidate moved to next phase');
            fetchCandidates();
        } catch (error) {
            console.error('Error moving candidate to next phase:', error);
            toast.error(error.response?.data?.message || 'Failed to move candidate to next phase');
        }
    };

    const handleBulkMoveToNextPhase = async () => {
        if (!selectedCandidateIds || selectedCandidateIds.length === 0) return;

        const selectedCandidates = candidates.filter(c => selectedCandidateIds.includes(c._id));
        const nonShortlisted = selectedCandidates.filter(c => {
            const phaseNum = Number(activePhase || 1);
            if (phaseNum === 1) {
                return c.decision !== 'Shortlisted';
            } else if (phaseNum === 2) {
                return c.phase2Decision !== 'Shortlisted' && c.phase2InterviewStatus !== 'Shortlisted' && c.decision !== 'Shortlisted';
            }
            return c.decision !== 'Shortlisted';
        });

        if (nonShortlisted.length > 0) {
            toast.error(
                `${nonShortlisted.length} candidate(s) are not Shortlisted. Please shortlist them first before moving to the next phase.`,
                { id: 'bulk-move-phase-warn', duration: 5000 }
            );
            return;
        }

        try {
            toast.loading(`Moving ${selectedCandidateIds.length} candidate(s) to next phase...`, { id: 'bulk-move-phase' });
            await api.post('/ta/candidates/dynamic-phase/bulk-advance', {
                candidateIds: selectedCandidateIds,
                targetPhaseOrder: activePhase ? activePhase + 1 : undefined
            });
            toast.success(`Moved ${selectedCandidateIds.length} candidate(s) to next phase`, { id: 'bulk-move-phase' });
            setSelectedCandidateIds([]);
            await fetchCandidates(true);
        } catch (error) {
            console.error('Error moving candidates to next phase:', error);
            toast.error(error.response?.data?.message || 'Failed to move candidates to next phase', { id: 'bulk-move-phase' });
        }
    };

    const handlePhase2DecisionChange = async (candidateId, newDecision) => {
        try {
            const response = await api.patch(`/ta/candidates/${candidateId}/phase2-decision`, { phase2Decision: newDecision });
            const updatedCandidate = response.data?.candidate;
            toast.success('Phase 2 Decision updated');
            setCandidates(prev => prev.map(c =>
                c._id === candidateId
                    ? (updatedCandidate ? { ...c, ...updatedCandidate } : { ...c, phase2Decision: newDecision })
                    : c
            ));
            fetchCandidates(true);
        } catch (error) {
            console.error('Error updating Phase 2 decision:', error);
            toast.error('Failed to update Phase 2 decision');
        }
    };

    const handlePhase3DecisionChange = async (candidateId, newDecision) => {
        try {
            await api.patch(`/ta/candidates/${candidateId}/phase3-decision`, { phase3Decision: newDecision });
            toast.success('Phase 3 Decision updated');
            setCandidates(prev => prev.map(c =>
                c._id === candidateId ? { ...c, phase3Decision: newDecision } : c
            ));
            fetchCandidates(true);
        } catch (error) {
            console.error('Error updating Phase 3 decision:', error);
            toast.error('Failed to update Phase 3 decision');
        }
    };

    if (loading && candidates.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <Skeleton className="h-6 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-10 w-36" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-none" />
                    ))}
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex gap-4">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
                        <Skeleton className="h-4 w-1/6" />
                        <Skeleton className="h-4 w-1/6" />
                        <Skeleton className="h-4 w-1/6" />
                        <Skeleton className="h-4 w-1/6" />
                        <Skeleton className="h-4 w-1/6" />
                        <Skeleton className="h-4 w-1/6" />
                    </div>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="p-4 border-b border-slate-100 flex gap-4 items-center">
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <CandidateHeaderToolbar
                activePhase={activePhase}
                handlePhaseChange={handlePhaseChange}
                filterInterviewStatus={filterInterviewStatus}
                filterInterviewRound={filterInterviewRound}
                setFilterStatus={setFilterStatus}
                setFilterDecision={setFilterDecision}
                setFilterInterviewStatus={setFilterInterviewStatus}
                setFilterTransferred={setFilterTransferred}
                setFilterProfileShared={setFilterProfileShared}
                setFilterInterviewRound={setFilterInterviewRound}
                metrics={metrics}
                phase2Metrics={phase2Metrics}
                createdDatePreset={createdDatePreset}
                setCreatedDatePreset={setCreatedDatePreset}
                dateFilterField={dateFilterField}
                setDateFilterField={setDateFilterField}
                dateFrom={dateFrom}
                setDateFrom={setDateFrom}
                dateTo={dateTo}
                setDateTo={setDateTo}
                showCreatedDateSortMenu={showCreatedDateSortMenu}
                setShowCreatedDateSortMenu={setShowCreatedDateSortMenu}
                applyCreatedDatePreset={applyCreatedDatePreset}
                showToolbarMenu={showToolbarMenu}
                setShowToolbarMenu={setShowToolbarMenu}
                handleExportExcel={handleExportExcelWrapper}
                canMassMail={canMassMail}
                isLegacyView={isLegacyView}
                openMassMailModal={openMassMailModal}
                selectedCandidateIds={selectedCandidateIds}
                serverResultCount={serverResultCount}
                candidates={candidates}
                canBulkTransfer={canBulkTransfer}
                openTransferModal={openTransferModal}
                canEditCandidates={canEditCandidates}
                openMassInterviewModal={openMassInterviewModal}
                handleBulkMoveToNextPhase={handleBulkMoveToNextPhase}
                canMakeDecisions={canMakeDecisions}
                showDecisionSubmenu={showDecisionSubmenu}
                setShowDecisionSubmenu={setShowDecisionSubmenu}
                decisionOptions={decisionOptions}
                handleBulkDecisionChange={handleBulkDecisionChange}
                canManageTemplates={canManageTemplates}
                navigate={navigate}
                canCreateCandidates={canCreateCandidates}
                setShowBulkResumeImport={setShowBulkResumeImport}
                canImportCandidates={canImportCandidates}
                setShowBulkImport={setShowBulkImport}
                hiringRequestId={hiringRequestId}
                requestMeta={requestMeta}
                handleAddNew={handleAddNew}
                roundSummary={roundSummary}
            />

            <div className={`flex flex-col lg:flex-row gap-6 items-start transition-all duration-300 ${selectedCandidateId ? 'relative' : ''}`}>
                <div className={`flex-1 min-w-0 transition-all duration-300 space-y-6 ${selectedCandidateId ? 'w-full lg:w-[30%]' : 'w-full'}`}>
                    <CandidateMetricsCards
                        activePhase={activePhase}
                        roundSummary={roundSummary}
                        cardMetrics={cardMetrics}
                        structuralPhase1Candidates={structuralPhase1Candidates}
                        structuralPhase2Candidates={structuralPhase2Candidates}
                        structuralPhase3Candidates={structuralPhase3Candidates}
                        metrics={metrics}
                        phase2Metrics={phase2Metrics}
                        phase3Metrics={phase3Metrics}
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        filterDecision={filterDecision}
                        setFilterDecision={setFilterDecision}
                        filterInterviewStatus={filterInterviewStatus}
                        setFilterInterviewStatus={setFilterInterviewStatus}
                        filterTransferred={filterTransferred}
                        setFilterTransferred={setFilterTransferred}
                        filterProfileShared={filterProfileShared}
                        setFilterProfileShared={setFilterProfileShared}
                        filterInterviewRound={filterInterviewRound}
                        setFilterInterviewRound={setFilterInterviewRound}
                        filterPreference={filterPreference}
                        filterRating={filterRating}
                        filterExperience={filterExperience}
                        filterPulledBy={filterPulledBy}
                        basePhase1Candidates={basePhase1Candidates}
                        basePhase2Candidates={basePhase2Candidates}
                        basePhase3Candidates={basePhase3Candidates}
                        usesBackendPagination={usesBackendPagination}
                        selectedCandidateId={selectedCandidateId}
                    />

                    <CandidateFilters
                        selectedCandidateId={selectedCandidateId}
                        candidateNameSearch={candidateNameSearch}
                        setCandidateNameSearch={setCandidateNameSearch}
                        activePhase={activePhase}
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        filterDecision={filterDecision}
                        setFilterDecision={setFilterDecision}
                        filterInterviewStatus={filterInterviewStatus}
                        setFilterInterviewStatus={setFilterInterviewStatus}
                        filterInterviewRound={filterInterviewRound}
                        setFilterInterviewRound={setFilterInterviewRound}
                        filterDynamicStage={filterDynamicStage}
                        setFilterDynamicStage={setFilterDynamicStage}
                        availableRoundOptions={availableRoundOptions}
                        filterRating={filterRating}
                        setFilterRating={setFilterRating}
                        pulledByOptions={pulledByOptions}
                        filterPulledBy={filterPulledBy}
                        setFilterPulledBy={setFilterPulledBy}
                        uploadedByOptions={uploadedByOptions}
                        filterUploadedBy={filterUploadedBy}
                        setFilterUploadedBy={setFilterUploadedBy}
                        filterUploadType={filterUploadType}
                        setFilterUploadType={setFilterUploadType}
                        isLegacyView={isLegacyView}
                        candidates={candidates}
                        filterTransferred={filterTransferred}
                        setFilterTransferred={setFilterTransferred}
                        filterExperience={filterExperience}
                        setFilterExperience={setFilterExperience}
                        dateFilterField={dateFilterField}
                        setDateFilterField={setDateFilterField}
                        setCreatedDatePreset={setCreatedDatePreset}
                        setDateFrom={setDateFrom}
                        setDateTo={setDateTo}
                        filterProfileShared={filterProfileShared}
                        setFilterProfileShared={setFilterProfileShared}
                        isDefaultDateFilterState={isDefaultDateFilterState}
                        resetDateFiltersToDefault={resetDateFiltersToDefault}
                        setShowCreatedDateSortMenu={setShowCreatedDateSortMenu}
                        openMultiFilter={openMultiFilter}
                        setOpenMultiFilter={setOpenMultiFilter}
                    />

                    <CandidateTable
                        candidates={candidates}
                        structuralPhase1Candidates={structuralPhase1Candidates}
                        cardMetrics={cardMetrics}
                        metrics={metrics}
                        loading={loading}
                        canCreateCandidates={canCreateCandidates}
                        handleAddNew={handleAddNew}
                        selectedCandidateId={selectedCandidateId}
                        isLegacyView={isLegacyView}
                        allVisibleSelected={allVisibleSelected}
                        toggleSelectAllVisible={toggleSelectAllVisible}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        handleHeaderSort={handleHeaderSort}
                        paginatedCandidates={paginatedCandidates}
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
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        filterDecision={filterDecision}
                        setFilterDecision={setFilterDecision}
                        filterInterviewStatus={filterInterviewStatus}
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
                        activeList={activeList}
                        usesBackendPagination={usesBackendPagination}
                        serverResultCount={serverResultCount}
                        itemsPerPage={itemsPerPage}
                        filterInterviewRound={filterInterviewRound}
                        roundSummary={roundSummary}
                        setItemsPerPage={setItemsPerPage}
                        page={page}
                        setPage={setPage}
                        totalPages={totalPages}
                    />
                </div>

                <CandidateSidePanel
                    selectedCandidateId={selectedCandidateId}
                    hiringRequestId={hiringRequestId}
                    isSidePanelMaximized={isSidePanelMaximized}
                    handleCloseCandidate={handleCloseCandidate}
                    handleToggleMaximize={handleToggleMaximize}
                    fetchCandidates={fetchCandidates}
                />
            </div>

            {showBulkImport && (
                <BulkCandidateImport
                    hiringRequestId={hiringRequestId}
                    isOpen={showBulkImport}
                    onClose={() => setShowBulkImport(false)}
                    onImportSuccess={fetchCandidates}
                />
            )}

            {showBulkResumeImport && (
                <BulkResumeImport
                    hiringRequestId={hiringRequestId}
                    isOpen={showBulkResumeImport}
                    onClose={() => setShowBulkResumeImport(false)}
                    onImportSuccess={fetchCandidates}
                />
            )}

            {showMassMailModal && (
                <MassMailModal
                    isOpen={showMassMailModal}
                    onClose={() => {
                        setShowMassMailModal(false);
                        setActionCandidates([]);
                    }}
                    hiringRequestId={hiringRequestId}
                    requestMeta={requestMeta}
                    candidates={actionCandidates}
                    initialSelectedIds={selectedCandidateIds}
                    onSent={() => {
                        setSelectedCandidateIds([]);
                        setActionCandidates([]);
                        fetchCandidates();
                    }}
                />
            )}

            {showTransferModal && (
                <BulkTransferModal
                    isOpen={showTransferModal}
                    onClose={() => {
                        setShowTransferModal(false);
                        setTransferPresetIds([]);
                        setActionCandidates([]);
                    }}
                    candidates={actionCandidates}
                    fromHiringRequestId={hiringRequestId}
                    initialSelectedIds={transferPresetIds.length ? transferPresetIds : selectedCandidateIds}
                    onTransferred={() => {
                        setSelectedCandidateIds([]);
                        setActionCandidates([]);
                        fetchCandidates();
                    }}
                />
            )}

            {showMassInterviewModal && (
                <MassInterviewScheduleModal
                    isOpen={showMassInterviewModal}
                    onClose={() => {
                        setShowMassInterviewModal(false);
                        setActionCandidates([]);
                    }}
                    candidates={actionCandidates}
                    initialSelectedIds={selectedCandidateIds}
                    hiringRequestId={hiringRequestId}
                    activePhase={activePhase}
                    onScheduled={() => {
                        setSelectedCandidateIds([]);
                        setActionCandidates([]);
                        fetchCandidates();
                    }}
                />
            )}

            {profileTarget && (
                <ProfileReviewModal
                    application={profileTarget}
                    onClose={() => setProfileTarget(null)}
                />
            )}

            <DecisionConfirmationModal
                isOpen={Boolean(pendingDecisionChange)}
                onClose={handleCancelDecisionChange}
                onConfirm={handleConfirmDecisionChange}
                candidateName={pendingDecisionChange?.name}
                decision={pendingDecisionChange?.decision}
            />
        </div>
    );
};

export default CandidateList;
