import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Edit, Trash2, FileText, Loader, Upload, Plus, Eye, MoreVertical, Users, ThumbsUp, ThumbsDown, CheckCircle, XCircle, Clock, UserCheck, Download, Briefcase, X, Mail, ArrowRight, ArrowRightLeft, Menu, Search, Calendar } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../../components/Skeleton';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import BulkCandidateImport from './BulkCandidateImport';
import BulkResumeImport from './BulkResumeImport';
import CandidateDetails from './CandidateDetails';
import { ProfileReviewModal } from './PublicApplicationsView';
import MassMailModal from './MassMailModal';
import BulkTransferModal from './BulkTransferModal';
import DecisionConfirmationModal from '../../components/DecisionConfirmationModal';
import MassInterviewScheduleModal from './MassInterviewScheduleModal';
import DynamicPhaseView from './CandidateList/DynamicPhaseView';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { canViewTACandidateDetails } from '../../constants/accessPolicies';

const LEGACY_EXPORT_STATUS_OPTIONS = ['Interested', 'Not Interested', 'Not Relevant', 'Not Picking', 'High expectation', 'Long Notice period', 'Location Not suitable'];
const EXPORT_INTERVIEW_STATUS_OPTIONS = ['Scheduled'];
const PROFILE_SHORTLISTED_EXPORT_OPTIONS = ['Yes', 'No', 'Did Not Turn Up', 'On Hold'];
const PROFILE_SHORTLISTED_HEADER = 'Profile Shortlisted';

const hasReviewableApplicantProfile = (item) => Boolean(
    item &&
    (
        (item.applicantId && typeof item.applicantId === 'object') ||
        item.profileSnapshot ||
        item.publicApplicationId
    )
);

const hasUploadedResumeFile = (resumeUrl) => (
    typeof resumeUrl === 'string' &&
    /^https?:\/\//i.test(resumeUrl.trim())
);

const getCandidateUploadType = (candidate) => (
    hasUploadedResumeFile(candidate?.resumeUrl) ? 'CV' : 'Excel'
);

const getCandidateUploadedByName = (candidate) => (
    `${candidate?.uploadedBy?.firstName || ''} ${candidate?.uploadedBy?.lastName || ''}`.trim()
);

const hasCandidateCtcDetails = (candidate) => (
    (candidate?.currentCTC !== undefined && candidate?.currentCTC !== null && candidate?.currentCTC !== '')
    || (candidate?.expectedCTC !== undefined && candidate?.expectedCTC !== null && candidate?.expectedCTC !== '')
    || (candidate?.noticePeriod !== undefined && candidate?.noticePeriod !== null && candidate?.noticePeriod !== '')
);

const interviewFilterOptions = [
    { value: 'All', label: 'All' },
    { value: 'Scheduled', label: 'Scheduled' },
    { value: 'Shortlisted', label: 'Shortlisted' },
    { value: 'Failed', label: 'Failed' }
];

const getRoundsForPhase = (candidate, phase) => (
    Array.isArray(candidate?.interviewRounds)
        ? candidate.interviewRounds.filter((round) => (round.phase || 1) === phase)
        : []
);

const getPhase2InterviewStatusValue = (candidate = {}) => {
    const normalized = String(candidate?.phase2InterviewStatus || '').trim();
    if (['Scheduled', 'Rejected', 'Shortlisted'].includes(normalized)) {
        return normalized;
    }

    if (candidate?.phase2Decision === 'Rejected') {
        return 'Rejected';
    }

    if (candidate?.phase2Decision === 'Selected') {
        return 'Shortlisted';
    }

    return '';
};

const getDisplayInterviewRoundsForPhase = (candidate, phase) => {
    const rounds = getRoundsForPhase(candidate, phase);
    if (phase !== 2 || rounds.length > 0) {
        return rounds;
    }

    const phase2InterviewStatus = getPhase2InterviewStatusValue(candidate);
    const phase2Feedback = String(candidate?.phase2InterviewerFeedback || '').trim();
    if (!phase2InterviewStatus && !phase2Feedback) {
        return [];
    }

    return [{
        _id: 'phase2-imported-interview-summary',
        phase: 2,
        status: phase2InterviewStatus === 'Rejected'
            ? 'Failed'
            : phase2InterviewStatus === 'Shortlisted'
                ? 'Passed'
                : 'Scheduled',
        displayStatusLabel: phase2InterviewStatus || 'Scheduled',
        feedback: candidate?.phase2InterviewerFeedback || '',
        rating: null,
        skillRatings: []
    }];
};

const hasPhase2InterviewActivity = (candidate = {}) => {
    return getDisplayInterviewRoundsForPhase(candidate, 2).length > 0;
};

const getInterviewFilterValue = (rounds = []) => {
    if (!Array.isArray(rounds) || rounds.length === 0) {
        return null;
    }

    const hasFailed = rounds.some((round) => round.status === 'Failed');
    if (hasFailed) {
        return 'Failed';
    }

    const hasScheduled = rounds.some((round) => ['Pending', 'Scheduled'].includes(round.status));
    if (hasScheduled) {
        return 'Scheduled';
    }

    const allClosed = rounds.every((round) => ['Passed', 'Skipped'].includes(round.status));
    if (allClosed) {
        return 'Shortlisted';
    }

    return 'Scheduled';
};

const getInterviewSummaryValue = (rounds = []) => {
    if (!Array.isArray(rounds) || rounds.length === 0) {
        return null;
    }

    if (rounds.some((round) => round.status === 'Failed')) {
        return 'Failed';
    }

    if (rounds.some((round) => round.status === 'Pending')) {
        return 'Pending';
    }

    if (rounds.some((round) => round.status === 'Scheduled')) {
        return 'Scheduled';
    }

    const allClosed = rounds.every((round) => ['Passed', 'Skipped'].includes(round.status));
    if (allClosed) {
        return 'Shortlisted';
    }

    return 'Pending';
};

const getRoundExportInterviewStatus = (round = {}) => {
    if (round.status === 'Failed') return 'Rejected';
    if (round.status === 'Passed' || round.status === 'Skipped') return 'Shortlisted';
    return 'Scheduled';
};

const getPhase2InterviewStatusExportValue = (candidate = {}) => getPhase2InterviewStatusValue(candidate);

const matchesInterviewFilter = (rounds = [], filterValue = 'All') => {
    if (filterValue === 'All') {
        return true;
    }

    if (filterValue === 'Scheduled') {
        return Array.isArray(rounds) && rounds.length > 0;
    }

    return getInterviewFilterValue(rounds) === filterValue;
};

const normalizeMultiValueFilter = (values = []) => [...new Set(
    (Array.isArray(values) ? values : [values])
        .map((value) => String(value || '').trim())
        .filter(Boolean)
)];

const matchesMultiValueFilter = (selectedValues = [], candidateValue = '') => {
    const normalizedSelections = normalizeMultiValueFilter(selectedValues);
    if (normalizedSelections.length === 0) {
        return true;
    }

    const normalizedCandidateValue = String(candidateValue || '').trim();
    return normalizedCandidateValue ? normalizedSelections.includes(normalizedCandidateValue) : false;
};

const getMultiFilterLabel = (selectedValues = [], fallbackLabel) => {
    if (selectedValues.length === 0) {
        return fallbackLabel;
    }

    if (selectedValues.length === 1) {
        return selectedValues[0];
    }

    return `${selectedValues.length} selected`;
};

const formatDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DEFAULT_DATE_FILTER_FIELD = 'updatedAt';

const getPresetDateRange = (preset) => {
    if (!preset) {
        return { startDate: '', endDate: '' };
    }

    const today = new Date();
    const startDate = new Date(today);

    switch (preset) {
        case 'today':
            break;
        case 'last2days':
            startDate.setDate(today.getDate() - 1);
            break;
        case 'last7days':
            startDate.setDate(today.getDate() - 6);
            break;
        case 'last2weeks':
            startDate.setDate(today.getDate() - 13);
            break;
        case 'thisMonth':
            startDate.setDate(1);
            break;
        default:
            return { startDate: '', endDate: '' };
    }

    return {
        startDate: formatDateInputValue(startDate),
        endDate: formatDateInputValue(today)
    };
};

const getDefaultDateFilterState = () => {
    return {
        createdDatePreset: '',
        dateFilterField: '',
        dateFrom: '',
        dateTo: ''
    };
};

const createdDatePresetOptions = [
    { value: 'today', label: 'Today' },
    { value: 'last2days', label: 'Last 2 Days' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last2weeks', label: 'Last 2 Weeks' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'custom', label: 'Custom' }
];

const dateFilterFieldOptions = [
    { value: '', label: 'None' },
    { value: 'updatedAt', label: 'Updated At' },
    { value: 'createdAt', label: 'Created At' }
];

const getCreatedDatePresetLabel = (preset) => (
    createdDatePresetOptions.find((option) => option.value === preset)?.label || 'Sort'
);

const MultiSelectFilter = ({
    label,
    options = [],
    selectedValues = [],
    onToggleValue,
    onClear,
    isOpen,
    onToggleOpen,
    emptyLabel,
    widthClass = 'w-40'
}) => {
    const normalizedSelectedValues = normalizeMultiValueFilter(selectedValues);
    const triggerRef = useRef(null);
    const [panelPosition, setPanelPosition] = useState(null);

    useEffect(() => {
        if (!isOpen || !triggerRef.current || typeof window === 'undefined') {
            setPanelPosition(null);
            return;
        }

        const rect = triggerRef.current.getBoundingClientRect();
        setPanelPosition({
            top: rect.bottom + 8,
            left: rect.left,
            width: rect.width
        });
    }, [isOpen]);

    return (
        <div className={`shrink-0 relative ${widthClass}`}>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">{label}</label>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => onToggleOpen(isOpen ? null : label)}
                data-multi-filter-trigger="true"
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-left text-xs text-slate-700 outline-none transition hover:border-slate-400 focus:ring-2 focus:ring-blue-500"
            >
                <span className="truncate">{getMultiFilterLabel(normalizedSelectedValues, emptyLabel)}</span>
                <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
            </button>
            {isOpen && panelPosition && typeof document !== 'undefined' && createPortal(
                <div
                    data-multi-filter-panel="true"
                    className="fixed z-[10000] max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
                    style={panelPosition}
                >
                    <div className="mb-2 flex items-center justify-between px-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Choose users</span>
                        <button
                            type="button"
                            onClick={onClear}
                            className="text-[10px] font-semibold text-blue-600 hover:text-blue-700"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="space-y-1">
                        {options.length > 0 ? options.map((option) => {
                            const isChecked = normalizedSelectedValues.includes(option);
                            return (
                                <label
                                    key={option}
                                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => onToggleValue(option)}
                                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="truncate">{option}</span>
                                </label>
                            );
                        }) : (
                            <div className="px-2 py-3 text-xs text-slate-400">No users found</div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

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
    const itemsPerPage = 15;
    const { user } = useAuth();
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [serverTotalPages, setServerTotalPages] = useState(1);
    const [serverResultCount, setServerResultCount] = useState(0);
    const [serverSummary, setServerSummary] = useState(null);
    const [cardMetrics, setCardMetrics] = useState(null);
    const [loadingMetrics, setLoadingMetrics] = useState(false);
    const [actionCandidates, setActionCandidates] = useState([]);

    // Filter States
    const [filterPreference, setFilterPreference] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterDecision, setFilterDecision] = useState('All');
    const [filterExperience, setFilterExperience] = useState('');
    const [filterInterviewStatus, setFilterInterviewStatus] = useState('All');
    const [filterRating, setFilterRating] = useState('All');
    const [filterPulledBy, setFilterPulledBy] = useState([]);
    const [filterUploadedBy, setFilterUploadedBy] = useState([]);
    const [filterUploadType, setFilterUploadType] = useState('All');
    const [createdDatePreset, setCreatedDatePreset] = useState('');
    const [dateFilterField, setDateFilterField] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterTransferred, setFilterTransferred] = useState('All');
    const [filterProfileShared, setFilterProfileShared] = useState(false);
    const [candidateNameSearch, setCandidateNameSearch] = useState('');
    const [users, setUsers] = useState([]);
    const debouncedCandidateNameSearch = useDebouncedValue(candidateNameSearch, 2000);

    const [searchParams, setSearchParams] = useSearchParams();
    const selectedCandidateId = searchParams.get('candidateId');

    // Menu State
    const [activeMenu, setActiveMenu] = useState(null);
    const [activePhase, setActivePhase] = useState(1);
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
    const isProfileSharedCandidate = useCallback((candidate) =>
        candidate?.profileShared === true || (candidate?.profileShared == null && candidate?.decision === 'Shortlisted')
        , []);
    const hasMovedToPhase2 = useCallback((candidate) => (
        isProfileSharedCandidate(candidate)
        || Boolean(String(candidate?.phase2Decision || '').trim() && candidate?.phase2Decision !== 'None')
        || Boolean(String(candidate?.phase2InterviewStatus || '').trim() && candidate?.phase2InterviewStatus !== 'None')
        || Boolean(String(candidate?.phase2InterviewerFeedback || '').trim())
    ), [isProfileSharedCandidate]);

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
            const clickedMenuTrigger = target?.closest?.('[data-legacy-action-menu-trigger="true"]');
            const clickedMenuContent = target?.closest?.('[data-legacy-action-menu-content="true"]');
            const clickedMultiFilterTrigger = target?.closest?.('[data-multi-filter-trigger="true"]');
            const clickedMultiFilterPanel = target?.closest?.('[data-multi-filter-panel="true"]');
            const clickedSortTrigger = target?.closest?.('[data-created-sort-trigger="true"]');
            const clickedSortPanel = target?.closest?.('[data-created-sort-panel="true"]');

            if (clickedMenuTrigger || clickedMenuContent) {
                return;
            }

            if (!clickedMultiFilterTrigger && !clickedMultiFilterPanel) {
                setOpenMultiFilter(null);
            }

            if (!clickedSortTrigger && !clickedSortPanel) {
                setShowCreatedDateSortMenu(false);
            }

            setActiveMenu(null);
            setShowToolbarMenu(false);
        };
        document.addEventListener('click', handleClose);
        window.addEventListener('scroll', handleClose, true);
        return () => {
            document.removeEventListener('click', handleClose);
            window.removeEventListener('scroll', handleClose, true);
        };
    }, []);

    // Reset page to 1 when any filter changes
    useEffect(() => {
        setPage(1);
    }, [activePhase, candidateNameSearch, filterPreference, filterStatus, filterDecision, filterExperience, filterInterviewStatus, filterRating, filterPulledBy, filterUploadedBy, filterUploadType, createdDatePreset, dateFilterField, dateFrom, dateTo, filterTransferred, filterProfileShared]);

    const isFilterActive = useMemo(() => {
        return (
            (activePhase === 1 && filterStatus !== 'All') ||
            (activePhase === 2 && filterDecision !== 'All') ||
            (activePhase === 3 && filterDecision !== 'All') ||
            (activePhase === 1 && filterDecision !== 'All') ||
            filterInterviewStatus !== 'All' ||
            filterPreference !== 'All' ||
            filterRating !== 'All' ||
            filterExperience !== '' ||
            filterPulledBy.length > 0 ||
            filterUploadedBy.length > 0 ||
            filterUploadType !== 'All' ||
            filterTransferred !== 'All' ||
            filterProfileShared === true ||
            candidateNameSearch.trim() !== ''
        );
    }, [
        activePhase,
        filterStatus,
        filterDecision,
        filterInterviewStatus,
        filterPreference,
        filterRating,
        filterExperience,
        filterPulledBy,
        filterUploadedBy,
        filterUploadType,
        filterTransferred,
        filterProfileShared,
        candidateNameSearch
    ]);

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
            limitOverride = itemsPerPage
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
            params.limit = isFilterActive ? 20 : limitOverride;
            params.activePhase = activePhase;
            params.search = debouncedCandidateNameSearch.trim();
            params.filterPreference = filterPreference;
            params.filterStatus = filterStatus;
            params.filterDecision = filterDecision;
            params.filterExperience = filterExperience;
            params.filterInterviewStatus = filterInterviewStatus;
            params.filterRating = filterRating;
            params.filterPulledBy = JSON.stringify(filterPulledBy);
            params.filterUploadedBy = JSON.stringify(filterUploadedBy);
            params.filterUploadType = filterUploadType;
            params.filterTransferred = filterTransferred;
            params.filterProfileShared = filterProfileShared;
        }

        return params;
    }, [
        activePhase,
        dateFilterField,
        dateFrom,
        dateTo,
        debouncedCandidateNameSearch,
        filterDecision,
        filterExperience,
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

    // Base filter applies global filters (Preference, Experience, Rating, PulledBy) but NOT Status/Decision/InterviewStatus
    // This allows the cards to show correct overall metrics even when a specific card (which sets Status/Decision) is clicked.
    // 1. Structural population: Only structural filters (Pulled By, Transferred, Legacy)
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

    // 2. Base for Dynamic Cards: Structural + (Rating, Exp, Preference)
    const basePhase1Candidates = useMemo(() => {
        if (usesBackendPagination) {
            return activePhase === 1 ? candidates : [];
        }

        return structuralPhase1Candidates.filter(candidate => {
            const matchPreference = filterPreference === 'All' || candidate.preference === filterPreference;
            const matchExperience = !filterExperience || (candidate.totalExperience && Number(candidate.totalExperience) >= Number(filterExperience));

            let matchRating = true;
            if (filterRating !== 'All') {
                const rounds = candidate.interviewRounds ? candidate.interviewRounds.filter(r => (r.phase || 1) === 1) : [];
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
    }, [activePhase, candidates, filterExperience, filterPreference, filterRating, structuralPhase1Candidates, usesBackendPagination]);

    // 3. Final Filtered list for the table: Base + (Status, Decision, InterviewStatus)
    const filteredCandidates = useMemo(() => {
        if (usesBackendPagination) {
            return activePhase === 1 ? candidates : [];
        }

        return basePhase1Candidates.filter(candidate => {
            const matchStatus = filterStatus === 'All' || candidate.status === filterStatus;
            const matchDecision = filterDecision === 'All' || (candidate.decision || 'None') === filterDecision;
            const matchProfileShared = !filterProfileShared || isProfileSharedCandidate(candidate);

            let matchInterviewStatus = true;
            if (filterInterviewStatus !== 'All') {
                const rounds = getRoundsForPhase(candidate, 1);
                matchInterviewStatus = matchesInterviewFilter(rounds, filterInterviewStatus);
            }
            return matchStatus && matchDecision && matchInterviewStatus && matchProfileShared;
        });
    }, [activePhase, basePhase1Candidates, candidates, filterDecision, filterInterviewStatus, filterProfileShared, filterStatus, isProfileSharedCandidate, usesBackendPagination]);

    // Compute Metrics for Summary Boxes (Phase 1 — computed from structuralPhase1Candidates for stability)
    const metrics = useMemo(() => {
        if (usesBackendPagination && cardMetrics?.phase1Metrics) {
            return cardMetrics.phase1Metrics;
        }

        const counts = {
            total: structuralPhase1Candidates.length,
            interested: structuralPhase1Candidates.filter(c => c.status === 'Interested').length,
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

    // --- Phase 2: shortlisted candidates + their metrics ---
    // Structural Phase 2 population
    const structuralPhase2Candidates = useMemo(() => {
        if (usesBackendPagination) {
            return activePhase === 2 ? candidates : [];
        }

        return candidates.filter(c => {
            const isShortlisted = isProfileSharedCandidate(c);
            const matchCandidateName = matchesCandidateNameSearch(c);
            const matchPulledBy = matchesMultiValueFilter(filterPulledBy, c.profilePulledBy);
            const matchUploadedBy = matchesMultiValueFilter(filterUploadedBy, getCandidateUploadedByName(c));
            const matchUploadType = filterUploadType === 'All' || getCandidateUploadType(c) === filterUploadType;
            const matchTransferred = filterTransferred === 'All' || (filterTransferred === 'Transferred' ? c.isTransferred : !c.isTransferred);
            return isShortlisted && matchCandidateName && matchPulledBy && matchUploadedBy && matchUploadType && matchTransferred;
        });
    }, [activePhase, candidates, filterPulledBy, filterUploadedBy, filterUploadType, filterTransferred, isProfileSharedCandidate, matchesCandidateNameSearch, usesBackendPagination]);

    // Base for Phase 2 dynamic cards
    const basePhase2Candidates = useMemo(() => {
        if (usesBackendPagination) {
            return activePhase === 2 ? candidates : [];
        }

        return structuralPhase2Candidates.filter(candidate => {
            const matchPreference = filterPreference === 'All' || candidate.preference === filterPreference;
            const matchExperience = !filterExperience || (candidate.totalExperience && Number(candidate.totalExperience) >= Number(filterExperience));
            let matchRating = true;
            if (filterRating !== 'All') {
                const rounds = candidate.interviewRounds ? candidate.interviewRounds.filter(r => (r.phase || 1) === 2) : [];
                const ratedRounds = rounds.filter(r => r.rating && r.rating > 0);
                if (ratedRounds.length === 0) { matchRating = false; } else {
                    const avgRating = ratedRounds.reduce((acc, curr) => acc + curr.rating, 0) / ratedRounds.length;
                    matchRating = avgRating >= Number(filterRating);
                }
            }
            return matchPreference && matchExperience && matchRating;
        });
    }, [activePhase, candidates, filterExperience, filterPreference, filterRating, structuralPhase2Candidates, usesBackendPagination]);

    // Final Phase 2 list
    const phase2Filtered = useMemo(() => {
        if (usesBackendPagination) {
            return activePhase === 2 ? candidates : [];
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
            return matchDecision && matchInterviewStatus;
        });
    }, [activePhase, basePhase2Candidates, candidates, filterDecision, filterInterviewStatus, usesBackendPagination]);

    const phase2Metrics = useMemo(() => {
        if (usesBackendPagination && cardMetrics?.phase2Metrics) {
            return cardMetrics.phase2Metrics;
        }

        return {
            totalShortlisted: structuralPhase2Candidates.length,
            totalScreened: structuralPhase2Candidates.filter(c => c.phase2Decision === 'Shortlisted' || c.phase2Decision === 'Selected').length,
            selected: structuralPhase2Candidates.filter(c => c.phase2Decision === 'Selected').length,
            rejected: structuralPhase2Candidates.filter(c => c.phase2Decision === 'Rejected').length,
            interviewScheduled: structuralPhase2Candidates.filter(hasPhase2InterviewActivity).length
        };
    }, [cardMetrics, structuralPhase2Candidates, usesBackendPagination]);

    // Structural Phase 3 population
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

    // Base for Phase 3 dynamic cards
    const basePhase3Candidates = useMemo(() => {
        if (usesBackendPagination) {
            return activePhase === 3 ? candidates : [];
        }

        return structuralPhase3Candidates.filter(candidate => {
            const matchPreference = filterPreference === 'All' || candidate.preference === filterPreference;
            const matchExperience = !filterExperience || (candidate.totalExperience && Number(candidate.totalExperience) >= Number(filterExperience));
            let matchRating = true;
            if (filterRating !== 'All') {
                const rounds = candidate.interviewRounds ? candidate.interviewRounds.filter(r => (r.phase || 1) === 3) : [];
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

    const fetchCandidates = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const endpoint = isLegacyView
                ? `/ta/hiring-request/${hiringRequestId}/previous-candidates`
                : `/ta/candidates/${hiringRequestId}`;
            const params = isLegacyView ? { t: Date.now() } : buildCandidateRequestParams();
            if (isLegacyView) {
                if (dateFilterField) params.dateField = dateFilterField;
                if (dateFrom) params.startDate = dateFrom;
                if (dateTo) params.endDate = dateTo;
            }
            const response = await api.get(endpoint, { params });
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
            }
        } catch (error) {
            console.error('Error fetching candidates:', error);
            toast.error('Failed to load candidates');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [buildCandidateRequestParams, dateFilterField, dateFrom, dateTo, hiringRequestId, isLegacyView, fetchCardMetrics]);

    const fetchAllMatchingCandidates = useCallback(async () => {
        const endpoint = isLegacyView
            ? `/ta/hiring-request/${hiringRequestId}/previous-candidates`
            : `/ta/candidates/${hiringRequestId}`;
        const params = isLegacyView
            ? { t: Date.now() }
            : buildCandidateRequestParams({
                paginate: true,
                pageOverride: 1,
                limitOverride: Math.max(serverResultCount || itemsPerPage, itemsPerPage)
            });

        if (isLegacyView) {
            if (dateFilterField) params.dateField = dateFilterField;
            if (dateFrom) params.startDate = dateFrom;
            if (dateTo) params.endDate = dateTo;
        }

        const response = await api.get(endpoint, { params });
        return isLegacyView ? response.data : (response.data.candidates || []);
    }, [
        buildCandidateRequestParams,
        dateFilterField,
        dateFrom,
        dateTo,
        hiringRequestId,
        isLegacyView,
        itemsPerPage,
        serverResultCount
    ]);

    const activeList = usesBackendPagination
        ? candidates
        : (activePhase === 1 ? filteredCandidates : activePhase === 2 ? phase2Filtered : phase3Filtered);
    const totalPages = usesBackendPagination
        ? serverTotalPages
        : (Math.ceil(activeList.length / itemsPerPage) || 1);
    const paginatedCandidates = usesBackendPagination
        ? candidates
        : activeList.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const allVisibleSelected = activeList.length > 0 && activeList.every((candidate) => selectedCandidateIds.includes(candidate._id));

    useEffect(() => {
        const visibleIds = new Set(activeList.map((candidate) => candidate._id));
        setSelectedCandidateIds((prev) => prev.filter((id) => visibleIds.has(id)));
    }, [activeList]);

    useEffect(() => {
        if (hiringRequestId) {
            fetchCandidates();
        }
        fetchUsers();
    }, [hiringRequestId, fetchCandidates, fetchUsers]);

    const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

    const toggleMenu = useCallback((e, candidateId) => {
        e.stopPropagation();
        if (activeMenu === candidateId) {
            setActiveMenu(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = 220; // safe estimation of dropdown height

            let positionStyles = {
                right: window.innerWidth - rect.right
            };

            // If not enough space below, open upwards
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

    const handleExportExcel = async () => {
        try {
            toast.loading('Preparing export...', { id: 'export-excel' });

            const toEmptyCell = (value, { zeroIsEmpty = false } = {}) => {
                if (value === undefined || value === null) {
                    return null;
                }

                if (typeof value === 'number') {
                    if (zeroIsEmpty && value === 0) {
                        return null;
                    }

                    return value;
                }

                if (typeof value === 'string') {
                    const normalized = value.trim();
                    const upperValue = normalized.toUpperCase();
                    const isZeroLike = /^0+(?:\.0+)?$/.test(normalized);
                    if (!normalized || normalized === '-' || normalized === '--' || upperValue === 'N/A' || (zeroIsEmpty && isZeroLike)) {
                        return null;
                    }

                    return normalized;
                }

                return value;
            };

            // 1. Fetch Requisition Details for Dynamic Skills
            let softSkillsFromReq = [];
            let techSkillsFromReq = [];
            let requisitionData = null;

            try {
                const reqRes = await api.get(`/ta/hiring-request/${hiringRequestId}`);
                requisitionData = reqRes.data || {};
                const requirements = requisitionData.requirements || {};
                const mustHave = requirements.mustHaveSkills || {};

                softSkillsFromReq = Array.isArray(mustHave.softSkills) ? mustHave.softSkills : [];
                techSkillsFromReq = Array.isArray(mustHave.technical) ? mustHave.technical :
                    (Array.isArray(mustHave) ? mustHave : []);
            } catch (err) {
                console.error('Failed to fetch requisition for dynamic skills', err);
            }

            // 2. Prepare Sections for Dynamic Header Generation
            const softSkillsHeaders = Array.isArray(softSkillsFromReq) ? softSkillsFromReq : [];
            const techSkillsHeaders = Array.isArray(techSkillsFromReq) ? techSkillsFromReq : [];

            // 3. Determine Maximum Interview Rounds among all candidates for sizing the table
            const dataToExport = await fetchAllMatchingCandidates();
            let maxRoundsCount = 1;
            dataToExport.forEach(candidate => {
                const rounds = candidate.interviewRounds ? candidate.interviewRounds.filter(r => (r.phase || 1) === activePhase) : [];
                if (rounds.length > maxRoundsCount) maxRoundsCount = rounds.length;
            });

            const roundSections = [];
            for (let i = 1; i <= maxRoundsCount; i++) {
                roundSections.push({
                    title: `Round ${i}`,
                    subHeaders: [
                        'Interviewer Feedback',
                        'Interview date',
                        'Interviewer Name',
                        ...softSkillsHeaders,
                        ...techSkillsHeaders,
                        'Performance Rating',
                        'Interview Status'
                    ],
                    width: 5 + softSkillsHeaders.length + techSkillsHeaders.length
                });
            }

            // Define sections to iterate over for building Row 1, Row 2 and rowData
            // width: span of columns under this title
            const excelSections = [
                { title: 'Basic Info', subHeaders: ['S.no', 'Submission Date', 'Source', 'Profile pulled by', 'Calling by', 'Name of Candidate', 'Total Experience'], width: 7 },
                { title: 'Internal Round', subHeaders: ['TAT', 'Rate', 'Remarks'], width: 3 },
                { title: 'Experience', subHeaders: ['Relevant Experience'], width: 1 },
                { title: 'Technical Skills (Experience)', subHeaders: techSkillsHeaders, width: techSkillsHeaders.length },
                { title: 'Education & Employment', subHeaders: ['Qualification', 'Company'], width: 2 },
                { title: 'Compensation', subHeaders: ['CTC', 'Expected CTC'], width: 2 },
                { title: 'Availability & Location', subHeaders: ['Notice Period(Days)', 'Last Working Day', 'Location', 'Preferred Location'], width: 4 },
                { title: 'Contact Details', subHeaders: ['Email', 'Mobile No.'], width: 2 },
                { title: 'Offer Details', subHeaders: ['Offer Company', 'Date Of Joining new company'], width: 2 },
                { title: 'Status & Remarks', subHeaders: ['Status', 'Remark', 'Custom Remark'], width: 3 },
                ...roundSections,
                { title: 'Final Status & Decision', subHeaders: [PROFILE_SHORTLISTED_HEADER, 'Final Scoring', 'Profile Shared', 'Shortlisted (Phase 2)', 'Selected (Phase 2)', 'Interviewer Feedback (Phase 2)', 'Interview Status (Phase2)', 'Reason', 'Decision Status (Auto-calculated)'], width: 9 }
            ].filter(sec => sec.width > 0);

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Candidates');
            const validationSheet = workbook.addWorksheet('_ValidationLists');

            const buildValidationRangeFormula = (columnLetter, itemCount) => (
                `'${validationSheet.name}'!$${columnLetter}$1:$${columnLetter}$${Math.max(itemCount, 1)}`
            );

            LEGACY_EXPORT_STATUS_OPTIONS.forEach((option, index) => {
                validationSheet.getCell(`A${index + 1}`).value = option;
            });
            PROFILE_SHORTLISTED_EXPORT_OPTIONS.forEach((option, index) => {
                validationSheet.getCell(`B${index + 1}`).value = option;
            });
            validationSheet.state = 'hidden';
            const candidateStatusValidationFormula = buildValidationRangeFormula('A', LEGACY_EXPORT_STATUS_OPTIONS.length);
            const profileShortlistedValidationFormula = buildValidationRangeFormula('B', PROFILE_SHORTLISTED_EXPORT_OPTIONS.length);

            // Row 1: MAIN HEADINGS
            const row1Data = [];
            excelSections.forEach(sec => {
                row1Data.push(sec.title);
                for (let i = 1; i < sec.width; i++) row1Data.push('');
            });
            const row1 = sheet.addRow(row1Data);

            // Row 2: SUB-HEADERS
            const row2Data = [];
            excelSections.forEach(sec => {
                sec.subHeaders.forEach(sub => row2Data.push(sub));
            });
            const row2 = sheet.addRow(row2Data);

            // Merging Row 1 for Main Headings
            let currentCol = 1;
            excelSections.forEach(sec => {
                if (sec.width > 1) {
                    sheet.mergeCells(1, currentCol, 1, currentCol + sec.width - 1);
                }
                currentCol += sec.width;
            });

            const applyRoundColumnValidation = (startRow, endRow) => {
                let sectionStartCol = 1;
                excelSections.forEach((section) => {
                    if (section.title.startsWith('Round ')) {
                        const performanceRatingOffset = section.subHeaders.indexOf('Performance Rating');
                        const interviewStatusOffset = section.subHeaders.indexOf('Interview Status');

                        if (performanceRatingOffset >= 0) {
                            const performanceRatingCol = sectionStartCol + performanceRatingOffset;
                            for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
                                sheet.getCell(rowNumber, performanceRatingCol).dataValidation = {
                                    type: 'whole',
                                    operator: 'between',
                                    allowBlank: true,
                                    showErrorMessage: true,
                                    formulae: [1, 10],
                                    errorTitle: 'Invalid Rating',
                                    error: 'Performance Rating must be a whole number between 1 and 10.'
                                };
                            }
                        }

                        if (interviewStatusOffset >= 0) {
                            const interviewStatusCol = sectionStartCol + interviewStatusOffset;
                            for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
                                sheet.getCell(rowNumber, interviewStatusCol).dataValidation = {
                                    type: 'list',
                                    allowBlank: true,
                                    showErrorMessage: true,
                                    formulae: [`"${EXPORT_INTERVIEW_STATUS_OPTIONS.join(',')}"`],
                                    errorTitle: 'Invalid Interview Status',
                                    error: `Interview Status must be one of: ${EXPORT_INTERVIEW_STATUS_OPTIONS.join(', ')}.`
                                };
                            }
                        }
                    }

                    sectionStartCol += section.width;
                });
            };

            const applyCandidateStatusValidation = (startRow, endRow) => {
                let sectionStartCol = 1;
                excelSections.forEach((section) => {
                    if (section.title === 'Status & Remarks') {
                        const statusOffset = section.subHeaders.indexOf('Status');
                        if (statusOffset >= 0) {
                            const statusCol = sectionStartCol + statusOffset;
                            for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
                                sheet.getCell(rowNumber, statusCol).dataValidation = {
                                    type: 'list',
                                    allowBlank: true,
                                    showErrorMessage: true,
                                    formulae: [candidateStatusValidationFormula],
                                    errorTitle: 'Invalid Status',
                                    error: `Status must be one of: ${LEGACY_EXPORT_STATUS_OPTIONS.join(', ')}.`
                                };
                            }
                        }
                    }

                    sectionStartCol += section.width;
                });
            };

            const applyPhase2InterviewStatusValidation = (startRow, endRow) => {
                let sectionStartCol = 1;
                excelSections.forEach((section) => {
                    if (section.title === 'Final Status & Decision') {
                        const phase2InterviewStatusOffset = section.subHeaders.indexOf('Interview Status (Phase2)');
                        if (phase2InterviewStatusOffset >= 0) {
                            const phase2InterviewStatusCol = sectionStartCol + phase2InterviewStatusOffset;
                            for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
                                sheet.getCell(rowNumber, phase2InterviewStatusCol).dataValidation = {
                                    type: 'list',
                                    allowBlank: true,
                                    showErrorMessage: true,
                                    formulae: ['"Scheduled"'],
                                    errorTitle: 'Invalid Phase 2 Interview Status',
                                    error: 'Interview Status (Phase2) must be: Scheduled.'
                                };
                            }
                        }
                    }
                    sectionStartCol += section.width;
                });
            };

            const applyFinalDecisionValidation = (startRow, endRow) => {
                let sectionStartCol = 1;
                excelSections.forEach((section) => {
                    if (section.title === 'Final Status & Decision') {
                        const profileShortlistedOffset = section.subHeaders.indexOf(PROFILE_SHORTLISTED_HEADER);
                        if (profileShortlistedOffset >= 0) {
                            const targetCol = sectionStartCol + profileShortlistedOffset;
                            for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
                                sheet.getCell(rowNumber, targetCol).dataValidation = {
                                    type: 'list',
                                    allowBlank: true,
                                    showErrorMessage: true,
                                    formulae: [profileShortlistedValidationFormula],
                                    errorTitle: 'Invalid Value',
                                    error: `${PROFILE_SHORTLISTED_HEADER} must be one of: ${PROFILE_SHORTLISTED_EXPORT_OPTIONS.join(', ')}.`
                                };
                            }
                        }

                        ['Profile Shared', 'Shortlisted (Phase 2)', 'Selected (Phase 2)'].forEach((headerName) => {
                            const offset = section.subHeaders.indexOf(headerName);
                            if (offset >= 0) {
                                const targetCol = sectionStartCol + offset;
                                for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
                                    sheet.getCell(rowNumber, targetCol).dataValidation = {
                                        type: 'list',
                                        allowBlank: true,
                                        showErrorMessage: true,
                                        formulae: ['"Yes,No"'],
                                        errorTitle: 'Invalid Value',
                                        error: `${headerName} must be either Yes or No.`
                                    };
                                }
                            }
                        });
                    }
                    sectionStartCol += section.width;
                });
            };

            // Set Column Widths and Formatting
            row2Data.forEach((_, i) => {
                const col = sheet.getColumn(i + 1);
                col.width = 18; // default
                if (i === 0) col.width = 8; // S.no
                if (row2Data[i] === 'Remarks' || row2Data[i] === 'Interviewer Feedback' || row2Data[i] === 'Interviewer Feedback (Phase 2)') col.width = 35;
                if (row2Data[i] === 'Name of Candidate' || row2Data[i].includes('Skill')) col.width = 25;

                col.alignment = { wrapText: true, vertical: 'middle' };
            });

            // Formatting headers (Moved after column formatting to prevent alignment override)
            [row1, row2].forEach((row, rowIndex) => {
                row.font = { bold: true };
                row.alignment = { horizontal: 'center', vertical: 'middle' };
                row.eachCell((cell) => {
                    // Explicitly set alignment on each cell to ensure centering
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: rowIndex === 0 ? 'FFD9EAD3' : 'FFE0E0E0' }
                    };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });

            // Freeze top 2 rows
            sheet.views = [{ state: 'frozen', ySplit: 2 }];

            // Add Filters to Row 2
            sheet.autoFilter = {
                from: { row: 2, column: 1 },
                to: { row: 2, column: row2Data.length }
            };

            dataToExport.forEach((candidate, index) => {
                const rounds = candidate.interviewRounds ? candidate.interviewRounds.filter(r => (r.phase || 1) === activePhase) : [];

                const techSkillRatings = techSkillsHeaders.map(skillName => {
                    const skillEntry = (candidate.mustHaveSkills || []).find(s => s.skill === skillName);
                    if (skillEntry) {
                        const experience = toEmptyCell(skillEntry.experience, { zeroIsEmpty: true });
                        return experience === null ? null : `${experience}y`;
                    }

                    return null;
                });

                // Collect data for each round
                const roundsData = [];
                for (let i = 0; i < maxRoundsCount; i++) {
                    const r = rounds[i];
                    if (r) {
                        const feedback = toEmptyCell(r.feedback);
                        const dateVal = r.scheduledDate || r.evaluatedAt;
                        const date = dateVal ? format(new Date(dateVal), 'dd-MMM-yyyy') : null;
                        const resolveUserName = (u) => {
                            if (!u) return '';
                            if (typeof u === 'object') {
                                return `${u.firstName || ''} ${u.lastName || ''}`.trim();
                            }
                            if (typeof u === 'string') {
                                const found = users.find(usr => String(usr._id) === String(u));
                                if (found) {
                                    return `${found.firstName || ''} ${found.lastName || ''}`.trim();
                                }
                            }
                            return '';
                        };

                        let interviewer = '';
                        if (r.evaluatedBy && resolveUserName(r.evaluatedBy)) {
                            interviewer = resolveUserName(r.evaluatedBy);
                        } else if (Array.isArray(r.assignedTo) && r.assignedTo.length > 0) {
                            interviewer = r.assignedTo
                                .map(u => resolveUserName(u))
                                .filter(Boolean)
                                .join(', ');
                        }

                        if (!interviewer) {
                            interviewer = r.interviewerName || '';
                        }
                        const performanceRating = toEmptyCell(r.rating, { zeroIsEmpty: true });
                        const roundInterviewStatus = getRoundExportInterviewStatus(r);

                        const rSoftSkillRatings = softSkillsHeaders.map(skillName => {
                            const rating = (r.skillRatings || []).find(sr => sr.skill === skillName)?.rating;
                            return rating !== undefined ? `${rating}/10` : null;
                        });

                        const rTechSkillRatings = techSkillsHeaders.map(skillName => {
                            const sr = (r.skillRatings || []).find(s => s.skill === skillName);
                            return sr ? `${sr.rating}/10` : null;
                        });

                        roundsData.push(feedback, date, toEmptyCell(interviewer), ...rSoftSkillRatings, ...rTechSkillRatings, performanceRating, roundInterviewStatus);
                    } else {
                        // Empty round padding
                        const fieldCount = 5 + softSkillsHeaders.length + techSkillsHeaders.length;
                        for (let j = 0; j < fieldCount; j++) roundsData.push(null);
                    }
                }

                const profileShortlisted = candidate.decision === 'Shortlisted'
                    ? 'Yes'
                    : candidate.decision === 'Rejected'
                        ? 'No'
                        : candidate.decision === 'Did Not Turn Up'
                            ? 'Did Not Turn Up'
                            : candidate.decision === 'On Hold'
                                ? 'On Hold'
                                : '';
                const phase2Shortlisted = (candidate.phase2Decision === 'Shortlisted' || candidate.phase2Decision === 'Selected') ? 'Yes' : null;
                const phase2Selected = candidate.phase2Decision === 'Selected' ? 'Yes' : null;
                const phase2InterviewStatus = getPhase2InterviewStatusExportValue(candidate);
                const statusSummary = getInterviewStatusSummary(rounds);
                const interviewStatusLabel = toEmptyCell(statusSummary.label);

                // Construct row data according to sections order
                const rowData = [
                    index + 1,
                    candidate.uploadedAt ? format(new Date(candidate.uploadedAt), 'dd-MMM-yyyy') : null,
                    toEmptyCell(candidate.source),
                    toEmptyCell(candidate.profilePulledBy),
                    toEmptyCell(candidate.calledBy),
                    toEmptyCell(candidate.candidateName),
                    toEmptyCell(candidate.totalExperience),

                    toEmptyCell(candidate.tatToJoin, { zeroIsEmpty: true }),
                    toEmptyCell(candidate.rate, { zeroIsEmpty: true }),
                    toEmptyCell(candidate.remark),

                    toEmptyCell(candidate.relevantExperience, { zeroIsEmpty: true }),
                    ...techSkillRatings,

                    toEmptyCell(candidate.qualification),
                    toEmptyCell(candidate.currentCompany),

                    toEmptyCell(candidate.currentCTC, { zeroIsEmpty: true }),
                    toEmptyCell(candidate.expectedCTC, { zeroIsEmpty: true }),

                    toEmptyCell(candidate.noticePeriod, { zeroIsEmpty: true }),
                    candidate.lastWorkingDay ? format(new Date(candidate.lastWorkingDay), 'dd-MMM-yyyy') : null,
                    toEmptyCell(candidate.currentLocation),
                    toEmptyCell(candidate.preferredLocation),

                    toEmptyCell(candidate.email),
                    toEmptyCell(candidate.mobile),

                    toEmptyCell(candidate.offerCompany),
                    candidate.offerJoiningDate ? format(new Date(candidate.offerJoiningDate), 'dd-MMM-yyyy') : null,

                    toEmptyCell(candidate.status),
                    toEmptyCell(candidate.remark),
                    toEmptyCell(candidate.customRemark),

                    ...roundsData,

                    toEmptyCell(profileShortlisted),
                    null, // Final Scoring
                    isProfileSharedCandidate(candidate) ? 'Yes' : null, // Profile Shared
                    phase2Shortlisted,
                    phase2Selected,
                    toEmptyCell(candidate.phase2InterviewerFeedback),
                    toEmptyCell(phase2InterviewStatus),
                    toEmptyCell(candidate.rejectionReason),
                    null // Decision Status
                ];

                const row = sheet.addRow(rowData);

                // Calculate Formula Indexes Dynamically
                // Profile Shortlisted is the 1st column of the last section
                // Decision Status is the 6th column (last) of the last section
                const totalColsBeforeLast = row2Data.length - 9;
                const profileShortlistedColIndex = totalColsBeforeLast + 1;
                const decisionStatusColIndex = totalColsBeforeLast + 9;

                const colLetter = sheet.getColumn(profileShortlistedColIndex).letter;
                const formulaRow = row.number;
                if (profileShortlisted) {
                    row.getCell(decisionStatusColIndex).value = {
                        formula: `IF(${colLetter}${formulaRow}="Yes","Shortlisted",IF(${colLetter}${formulaRow}="No","Rejected",IF(${colLetter}${formulaRow}="Did Not Turn Up","Did Not Turn Up",IF(${colLetter}${formulaRow}="On Hold","On Hold",""))))`,
                        result: profileShortlisted === 'Yes'
                            ? 'Shortlisted'
                            : profileShortlisted === 'No'
                                ? 'Rejected'
                                : profileShortlisted
                    };
                } else {
                    row.getCell(decisionStatusColIndex).value = null;
                }
            });

            const lastCandidateRow = Math.max(1000, dataToExport.length + 2);
            applyCandidateStatusValidation(3, lastCandidateRow);
            applyRoundColumnValidation(3, lastCandidateRow);
            applyPhase2InterviewStatusValidation(3, lastCandidateRow);
            applyFinalDecisionValidation(3, lastCandidateRow);

            const buffer = await workbook.xlsx.writeBuffer();

            // Generate dynamic filename: [Job Title] Candidate List.xlsx
            const roleTitle = requisitionData?.roleDetails?.title || positionName || 'Candidates';
            const fileName = `${roleTitle} Candidate List.xlsx`;

            saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
            toast.success('Excel exported successfully!', { id: 'export-excel' });
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export Excel', { id: 'export-excel' });
        }
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



    const getDecisionColor = (decision) => {
        switch (decision) {
            case 'Selected': return 'text-purple-600 font-bold';
            case 'Shortlisted': return 'text-emerald-600 font-bold';
            case 'Profile Shared': return 'text-sky-600 font-bold';
            case 'Phase 3 Offer Stage': return 'text-purple-600 font-bold';
            case 'Offer Sent': return 'text-blue-600 font-bold';
            case 'Offer Accepted': return 'text-amber-600 font-bold';
            case 'Joined': return 'text-emerald-600 font-bold';
            case 'Did Not Turn Up': return 'text-rose-600 font-bold';
            case 'No Show':
            case 'Offer Declined': return 'text-rose-600 font-bold';
            case 'Rejected': return 'text-red-600 font-bold';
            case 'On Hold': return 'text-amber-600 font-bold';
            default: return 'text-slate-600';
        }
    };

    const getInterviewStatusSummary = (rounds = []) => {
        if (!rounds || rounds.length === 0) return { label: '', color: 'text-slate-400 bg-slate-50 border-slate-200' };

        if (rounds.length === 1 && rounds[0]?.displayStatusLabel) {
            const displayStatus = rounds[0].displayStatusLabel;
            if (displayStatus === 'Rejected') {
                return { label: 'Rejected', color: 'text-red-700 bg-red-50 border-red-200' };
            }

            if (displayStatus === 'Scheduled') {
                return { label: 'Scheduled', color: 'text-blue-700 bg-blue-50 border-blue-200' };
            }

            if (displayStatus === 'Shortlisted') {
                return { label: 'Shortlisted', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
            }
        }

        const interviewStatus = getInterviewSummaryValue(rounds);

        if (interviewStatus === 'Failed') {
            return { label: 'Failed', color: 'text-red-700 bg-red-50 border-red-200' };
        }

        if (interviewStatus === 'Pending') {
            return { label: 'Pending', color: 'text-amber-700 bg-amber-50 border-amber-200' };
        }

        if (interviewStatus === 'Scheduled') {
            return { label: 'Scheduled', color: 'text-blue-700 bg-blue-50 border-blue-200' };
        }

        if (interviewStatus === 'Shortlisted') {
            return { label: 'Shortlisted', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
        }

        return { label: '', color: 'text-slate-400 bg-slate-50 border-slate-200' };
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
                {/* Skeleton for Summary Boxes */}
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

    const phaseToggleButtonClass = 'min-w-[84px] rounded-[10px] px-4 py-2.5 text-sm font-semibold transition-all duration-200';
    const toolbarMenuButtonClass = 'inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50';
    const toolbarMenuItemClass = 'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50';

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                        <div className="min-w-fit">
                            <h3 className="text-[12px] font-bold uppercase tracking-[0.32em] text-slate-500">Pipeline</h3>
                        </div>
                        <div className="inline-flex w-fit rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-inner shadow-slate-200/70">
                            <button
                                onClick={() => {
                                    setActivePhase(1);
                                    setPage(1);
                                    setFilterStatus('All');
                                    setFilterDecision('All');
                                    setFilterInterviewStatus('All');
                                    setFilterPreference('All');
                                    setFilterRating('All');
                                }}
                                className={`${phaseToggleButtonClass} ${activePhase === 1
                                    ? 'cursor-default bg-slate-900 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                                    }`}
                            >
                                Phase 1
                            </button>
                            <button
                                onClick={() => {
                                    setActivePhase(2);
                                    setPage(1);
                                    setFilterStatus('All');
                                    setFilterDecision('All');
                                    setFilterInterviewStatus('All');
                                    setFilterPreference('All');
                                    setFilterRating('All');
                                }}
                                className={`${phaseToggleButtonClass} ${activePhase === 2
                                    ? 'cursor-default bg-slate-900 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                                    }`}
                            >
                                Phase 2
                            </button>
                            <button
                                onClick={() => {
                                    setActivePhase(3);
                                    setPage(1);
                                    setFilterStatus('All');
                                    setFilterDecision('All');
                                    setFilterInterviewStatus('All');
                                    setFilterPreference('All');
                                    setFilterRating('All');
                                }}
                                className={`${phaseToggleButtonClass} ${activePhase === 3
                                    ? 'cursor-default bg-slate-900 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                                    }`}
                            >
                                Phase 3
                            </button>
                        </div>
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
                            onClick={(event) => {
                                event.stopPropagation();
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
                                className="absolute right-0 top-14 z-30 w-70 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/70"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="mb-2 px-3 pt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                                    Quick Actions
                                </div>
                                <button
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
                                {canManageTemplates && (
                                    <button
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
                                {canCreateCandidates && (
                                    <button
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

            {/* Layout Wrapper for Split View */}
            <div className={`flex flex-col lg:flex-row gap-6 items-start transition-all duration-300 ${selectedCandidateId ? 'relative' : ''}`}>

                {/* Left Side: Metrics, Filters, and Table */}
                <div className={`flex-1 min-w-0 transition-all duration-300 space-y-6 ${selectedCandidateId ? 'w-full lg:w-[30%]' : 'w-full'}`}>
                    {/* Summary Boxes - Only show when no candidate is selected */}
                    {!selectedCandidateId &&
                        (activePhase === 1 ? (() => {
                            const funnelCards = [
                                {
                                    id: 'total',
                                    label: 'Total Sourced',
                                    value: metrics.total,
                                    icon: Users,
                                    color: 'purple',
                                    isActive: filterStatus === 'All' && filterDecision === 'All' && filterInterviewStatus === 'All' && filterTransferred === 'All' && !filterProfileShared,
                                    onClick: () => { setFilterStatus('All'); setFilterDecision('All'); setFilterInterviewStatus('All'); setFilterTransferred('All'); setFilterProfileShared(false); }
                                },
                                {
                                    id: 'interested',
                                    label: 'Interested',
                                    value: metrics.interested,
                                    icon: CheckCircle,
                                    color: 'green',
                                    isActive: filterStatus === 'Interested' && !filterProfileShared,
                                    onClick: () => { setFilterStatus('Interested'); setFilterDecision('All'); setFilterInterviewStatus('All'); setFilterTransferred('All'); setFilterProfileShared(false); }
                                },
                                {
                                    id: 'interviewScheduled',
                                    label: 'Interview Scheduled',
                                    value: metrics.interviewScheduled,
                                    icon: UserCheck,
                                    color: 'amber',
                                    isActive: filterInterviewStatus === 'Scheduled' && !filterProfileShared,
                                    onClick: () => { setFilterStatus('All'); setFilterDecision('All'); setFilterInterviewStatus('Scheduled'); setFilterTransferred('All'); setFilterProfileShared(false); }
                                },
                                {
                                    id: 'shortlisted',
                                    label: 'Shortlisted',
                                    value: metrics.shortlisted,
                                    icon: ThumbsUp,
                                    color: 'sky',
                                    isActive: filterDecision === 'Shortlisted' && !filterProfileShared,
                                    onClick: () => { setFilterStatus('All'); setFilterDecision('Shortlisted'); setFilterInterviewStatus('All'); setFilterTransferred('All'); setFilterProfileShared(false); }
                                },
                                {
                                    id: 'profileShared',
                                    label: 'Profile Shared',
                                    value: metrics.profileShared,
                                    icon: ArrowRight,
                                    color: 'slate',
                                    isActive: filterProfileShared,
                                    onClick: () => { setFilterStatus('All'); setFilterDecision('All'); setFilterInterviewStatus('All'); setFilterTransferred('All'); setFilterProfileShared(true); }
                                }
                            ];

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

                            const allCards = [...funnelCards, ...dynamicCards];
                            const gridCols = selectedCandidateId ? 'grid-cols-1 md:grid-cols-2' : `grid-cols-2 lg:grid-cols-${Math.min(allCards.length, 6)}`;

                            return (
                                <div className={`grid ${gridCols} gap-4`}>
                                    {allCards.map((card, idx) => {
                                        const Icon = card.icon;
                                        const colorMap = {
                                            purple: 'border-b-purple-500 text-purple-600',
                                            green: 'border-b-green-500 text-green-600',
                                            amber: 'border-b-amber-500 text-amber-600',
                                            sky: 'border-b-sky-500 text-sky-600',
                                            slate: 'border-b-slate-500 text-slate-600',
                                            rose: 'border-b-rose-500 text-rose-600',
                                            indigo: 'border-b-indigo-500 text-indigo-600',
                                            blue: 'border-b-blue-500 text-blue-600'
                                        };
                                        const colorClasses = (colorMap[card.color] || colorMap.blue).split(' ');

                                        return (
                                            <div
                                                key={idx}
                                                onClick={card.onClick}
                                                className={`bg-white border border-slate-200 border-b-4 ${colorClasses[0]} shadow-sm p-4 relative overflow-hidden group hover:bg-slate-50 transition-colors cursor-pointer active:scale-[0.98] ${card.isActive ? 'ring-2 ring-blue-100 bg-blue-50/10' : ''}`}
                                            >
                                                <span className="block text-[32px] font-light text-slate-800 leading-none mb-2 relative z-10">{card.value}</span>
                                                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide relative z-10">{card.label}</span>
                                                <Icon className={`absolute -right-2 top-1/2 -translate-y-1/2 ${colorClasses[1]} opacity-[0.08] size-16 transition-transform group-hover:scale-110 group-hover:opacity-10`} />
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()
                            : activePhase === 2 ? (() => {
                                const funnelCards = [
                                    {
                                        id: 'total',
                                        label: 'Profile Shared',
                                        value: phase2Metrics.totalShortlisted,
                                        icon: Users,
                                        color: 'purple',
                                        isActive: filterDecision === 'All' && filterInterviewStatus === 'All' && filterStatus === 'All',
                                        onClick: () => { setFilterDecision('All'); setFilterInterviewStatus('All'); setFilterStatus('All'); }
                                    },
                                    {
                                        id: 'shortlisted',
                                        label: 'Shortlisted',
                                        value: phase2Metrics.totalScreened,
                                        icon: UserCheck,
                                        color: 'sky',
                                        isActive: filterDecision === 'Shortlisted_Selected',
                                        onClick: () => { setFilterDecision('Shortlisted_Selected'); setFilterStatus('All'); }
                                    },
                                    {
                                        id: 'interviewScheduled',
                                        label: 'Interview Scheduled',
                                        value: phase2Metrics.interviewScheduled,
                                        icon: Clock,
                                        color: 'amber',
                                        isActive: filterInterviewStatus === 'Scheduled',
                                        onClick: () => { setFilterDecision('All'); setFilterInterviewStatus('Scheduled'); }
                                    },
                                    {
                                        id: 'selected',
                                        label: 'Selected',
                                        value: phase2Metrics.selected,
                                        icon: CheckCircle,
                                        color: 'green',
                                        isActive: filterDecision === 'Selected',
                                        onClick: () => { setFilterDecision('Selected'); setFilterInterviewStatus('All'); }
                                    },
                                    {
                                        id: 'rejected',
                                        label: 'Rejected',
                                        value: phase2Metrics.rejected,
                                        icon: ThumbsDown,
                                        color: 'rose',
                                        isActive: filterDecision === 'Rejected',
                                        onClick: () => { setFilterDecision('Rejected'); setFilterInterviewStatus('All'); }
                                    }
                                ];

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
                                        const ratedRounds = rounds.filter(r => (r.phase || 1) === 2 && r.rating && r.rating > 0);
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

                                const allCards = [...funnelCards, ...dynamicCards];
                                const gridCols = selectedCandidateId ? 'grid-cols-1 md:grid-cols-2' : `grid-cols-2 lg:grid-cols-${Math.min(allCards.length, 6)}`;

                                return (
                                    <div className={`grid ${gridCols} gap-4`}>
                                        {allCards.map((card, idx) => {
                                            const Icon = card.icon;
                                            const colorMap = {
                                                purple: 'border-b-purple-500 text-purple-600',
                                                sky: 'border-b-sky-500 text-sky-600',
                                                amber: 'border-b-amber-500 text-amber-600',
                                                green: 'border-b-green-500 text-green-600',
                                                emerald: 'border-b-emerald-500 text-emerald-600',
                                                rose: 'border-b-rose-500 text-rose-600',
                                                indigo: 'border-b-indigo-500 text-indigo-600',
                                                blue: 'border-b-blue-500 text-blue-600',
                                                slate: 'border-b-slate-500 text-slate-600'
                                            };
                                            const colorClasses = (colorMap[card.color] || colorMap.blue).split(' ');

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={card.onClick}
                                                    className={`bg-white border border-slate-200 border-b-4 ${colorClasses[0]} shadow-sm p-4 relative overflow-hidden group hover:bg-slate-50 transition-colors cursor-pointer active:scale-[0.98] ${card.isActive ? 'ring-2 ring-blue-100 bg-blue-50/10' : ''}`}
                                                >
                                                    <span className="block text-[32px] font-light text-slate-800 leading-none mb-2 relative z-10">{card.value}</span>
                                                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide relative z-10">{card.label}</span>
                                                    <Icon className={`absolute -right-2 top-1/2 -translate-y-1/2 ${colorClasses[1]} opacity-[0.08] size-16 transition-transform group-hover:scale-110 group-hover:opacity-10`} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()
                                : (() => {
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
                                            const ratedRounds = rounds.filter(r => (r.phase || 1) === 3 && r.rating && r.rating > 0);
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
                                                const colorMap = {
                                                    purple: 'border-b-purple-500 text-purple-600',
                                                    sky: 'border-b-sky-500 text-sky-600',
                                                    amber: 'border-b-amber-500 text-amber-600',
                                                    emerald: 'border-b-emerald-500 text-emerald-600',
                                                    rose: 'border-b-rose-500 text-rose-600',
                                                    indigo: 'border-b-indigo-500 text-indigo-600',
                                                    blue: 'border-b-blue-500 text-blue-600'
                                                };
                                                const colorClasses = (colorMap[card.color] || colorMap.blue).split(' ');

                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={card.onClick}
                                                        className={`bg-white border border-slate-200 border-b-4 ${colorClasses[0]} shadow-sm p-4 relative overflow-hidden group hover:bg-slate-50 transition-colors cursor-pointer active:scale-[0.98] ${card.isActive ? 'ring-2 ring-blue-100 bg-blue-50/10' : ''}`}
                                                    >
                                                        <span className="block text-[32px] font-light text-slate-800 leading-none mb-2 relative z-10">{card.value}</span>
                                                        <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide relative z-10">{card.label}</span>
                                                        <Icon className={`absolute -right-2 top-1/2 -translate-y-1/2 ${colorClasses[1]} opacity-[0.08] size-16 transition-transform group-hover:scale-110 group-hover:opacity-10`} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })())}

                    {/* Filters - Only show when no candidate is selected */}
                    {!selectedCandidateId && (
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
                                {(candidateNameSearch !== '' || (activePhase === 1 && (filterStatus !== 'All' || filterProfileShared)) || filterDecision !== 'All' || filterExperience !== '' || filterInterviewStatus !== 'All' || filterRating !== 'All' || filterPulledBy.length > 0 || filterUploadedBy.length > 0 || filterUploadType !== 'All' || !isDefaultDateFilterState || filterTransferred !== 'All') && (
                                    <button
                                        onClick={() => {
                                            if (activePhase === 1) setFilterStatus('All');
                                            else setFilterStatus('All');
                                            setCandidateNameSearch('');
                                            setFilterProfileShared(false);
                                            setFilterDecision('All');
                                            setFilterExperience('');
                                            setFilterInterviewStatus('All');
                                            setFilterRating('All');
                                            setFilterPulledBy([]);
                                            setFilterUploadedBy([]);
                                            setFilterUploadType('All');
                                            resetDateFiltersToDefault();
                                            setFilterTransferred('All');
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
                    )}


                    {/* Candidates Table */}
                    {candidates.length === 0 ? (
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
                    ) : (
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
                                                <th className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Candidate</th>
                                                {!selectedCandidateId && <th className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Contact</th>}
                                                {!selectedCandidateId && <th className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Experience</th>}
                                                {!selectedCandidateId && <th className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">CTC Details</th>}
                                                {!selectedCandidateId && <th className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Interviews</th>}
                                                {!selectedCandidateId && <th className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Decision</th>}
                                                {!selectedCandidateId && <th className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Pulled / Uploaded</th>}
                                                <th className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {paginatedCandidates.length === 0 ? (
                                                <tr>
                                                    <td colSpan={!selectedCandidateId && !isLegacyView ? 9 : 7} className="px-4 py-8 text-center text-slate-500">
                                                        No candidates match the selected filters.
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedCandidates.map((candidate) => (
                                                    <tr
                                                        key={candidate._id}
                                                        onClick={canViewCandidateDetails ? () => handleSelectCandidate(candidate._id) : undefined}
                                                        className={`transition-colors border-b border-slate-100 last:border-0 ${canViewCandidateDetails ? 'cursor-pointer' : 'cursor-default'} ${selectedCandidateId === candidate._id
                                                            ? 'bg-blue-50 ring-1 ring-inset ring-blue-100'
                                                            : 'hover:bg-slate-50 bg-white'
                                                            }`}
                                                    >
                                                        {!selectedCandidateId && !isLegacyView && (
                                                            <td className="px-4 py-4 align-top text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedCandidateIds.includes(candidate._id)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={() => toggleCandidateSelection(candidate._id)}
                                                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                />
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-4 align-top">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[13px] font-bold text-slate-700 leading-tight">
                                                                    {candidate.candidateName.split(' ')[0]}<br />
                                                                    {candidate.candidateName.split(' ').slice(1).join(' ')}
                                                                </span>
                                                                {candidate.isTransferred && !isLegacyView && (
                                                                    <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-bold w-max uppercase tracking-wider mt-1 border border-blue-200" title="Moved from an older requisition">
                                                                        Transferred
                                                                    </span>
                                                                )}
                                                                {hasReviewableApplicantProfile(candidate) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setProfileTarget(candidate);
                                                                        }}
                                                                        className="mt-1 flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                                                                    >
                                                                        <Eye size={11} />
                                                                        Review Complete Profile
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        {!selectedCandidateId && (
                                                            <td className="px-4 py-4 align-top">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[12px] text-slate-600 font-medium">{candidate.email}</span>
                                                                    <span className="text-[12px] text-slate-500">{candidate.mobile}</span>
                                                                </div>
                                                            </td>
                                                        )}
                                                        {!selectedCandidateId && (
                                                            <td className="px-4 py-4 align-top">
                                                                <span className="text-[13px] font-bold text-slate-700">{candidate.totalExperience || '-'} yrs</span>
                                                            </td>
                                                        )}
                                                        {!selectedCandidateId && (
                                                            <td className="px-4 py-4 align-top">
                                                                <div className="text-[12px] text-slate-600 space-y-0.5 whitespace-nowrap">
                                                                    {candidate.currentCTC !== undefined && candidate.currentCTC !== null && candidate.currentCTC !== '' && (
                                                                        <div>Current: <span className="font-semibold">{candidate.currentCTC} LPA</span></div>
                                                                    )}
                                                                    {candidate.expectedCTC !== undefined && candidate.expectedCTC !== null && candidate.expectedCTC !== '' && (
                                                                        <div>Expected: <span className="font-semibold">{candidate.expectedCTC} LPA</span></div>
                                                                    )}
                                                                    {candidate.noticePeriod !== undefined && candidate.noticePeriod !== null && candidate.noticePeriod !== '' && (
                                                                        <div>Notice: <span className="font-semibold">{candidate.noticePeriod}d</span></div>
                                                                    )}
                                                                    {!hasCandidateCtcDetails(candidate) && <span className="text-slate-400">-</span>}
                                                                </div>
                                                            </td>
                                                        )}

                                                        {!selectedCandidateId && (
                                                            <td className="px-4 py-4 align-top">
                                                                {(() => {
                                                                    const rounds = getDisplayInterviewRoundsForPhase(candidate, activePhase);

                                                                    const summary = getInterviewStatusSummary(rounds);

                                                                    const hasFailed = rounds.some(r => r.status === 'Failed');
                                                                    const ratedRounds = rounds.filter(r => r.rating && r.rating > 0);
                                                                    const averageRating = !hasFailed && ratedRounds.length > 0
                                                                        ? ratedRounds.reduce((acc, curr) => acc + curr.rating, 0) / ratedRounds.length
                                                                        : null;

                                                                    return (
                                                                        <div className="flex flex-col gap-1.5 items-start">
                                                                            <span className={`px-2 py-0.5 border rounded-md text-[10px] font-bold tracking-wide ${summary.color}`}>
                                                                                {summary.label}
                                                                            </span>
                                                                            <div className="flex flex-col gap-1">
                                                                                <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap leading-tight">
                                                                                    {rounds.length} rounds total
                                                                                </span>
                                                                                {(() => {
                                                                                    const activeRounds = rounds.filter(r => r.scheduledDate || r.evaluatedAt);
                                                                                    if (activeRounds.length > 0) {
                                                                                        const scheduledRound = activeRounds.find(r => ['Pending', 'Scheduled'].includes(r.status));
                                                                                        const displayRound = scheduledRound || activeRounds[activeRounds.length - 1];
                                                                                        const dateVal = displayRound.scheduledDate || displayRound.evaluatedAt;
                                                                                        const formatted = dateVal ? format(new Date(dateVal), 'dd-MMM-yyyy') : '';
                                                                                        if (formatted) {
                                                                                            return (
                                                                                                <span className="text-[10px] text-slate-600 font-semibold mt-0.5 whitespace-nowrap bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200" title={`${displayRound.levelName || 'Interview'} Date`}>
                                                                                                    {formatted}
                                                                                                </span>
                                                                                            );
                                                                                        }
                                                                                    }
                                                                                    return null;
                                                                                })()}
                                                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                                                    {ratedRounds.length > 0 && ratedRounds.slice(0, 2).map((r, idx) => (
                                                                                        <span key={r._id || idx} title={r.roundName} className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                                                            R{idx + 1}: {r.rating}/10
                                                                                        </span>
                                                                                    ))}
                                                                                    {ratedRounds.length > 2 && (
                                                                                        <span
                                                                                            className={`text-[10px] font-bold flex items-center justify-center px-1.5 py-0.5 rounded border cursor-pointer hover:bg-amber-100 transition-colors ${averageRating !== null ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}
                                                                                            onClick={(e) => { e.stopPropagation(); handleView(candidate); }}
                                                                                            title="View all rounds"
                                                                                        >
                                                                                            ...
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })()}
                                                            </td>
                                                        )}
                                                        {!selectedCandidateId && (
                                                            <td className="px-4 py-4 align-top">
                                                                <div className="relative inline-block w-full max-w-27.5">
                                                                    {activePhase === 1 ? (
                                                                        <select
                                                                            value={candidate.decision === 'Profile Shared' ? 'None' : (candidate.decision || 'None')}
                                                                            onChange={(e) => handleDecisionChange(candidate._id, e.target.value)}
                                                                            className={`w-full appearance-none px-2.5 py-1 pr-7 text-[12px] font-bold rounded-lg border border-slate-200 bg-white outline-none cursor-pointer transition-colors hover:border-slate-300 focus:ring-2 focus:ring-blue-100 ${getDecisionColor(candidate.decision === 'Profile Shared' ? 'None' : (candidate.decision || 'None'))}`}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            disabled={!canMakeDecisions || hasMovedToPhase2(candidate)}
                                                                            title={hasMovedToPhase2(candidate) ? 'Phase 1 decision is locked after moving to Phase 2' : undefined}
                                                                        >
                                                                            <option value="None" className="text-slate-600">None</option>
                                                                            <option value="Shortlisted" className="text-emerald-600 font-bold">Shortlisted</option>
                                                                            <option value="Rejected" className="text-red-600 font-bold">Rejected</option>
                                                                            <option value="Did Not Turn Up" className="text-rose-600 font-bold">Did Not Turn Up</option>
                                                                            <option value="On Hold" className="text-amber-600 font-bold">On Hold</option>
                                                                        </select>
                                                                    ) : activePhase === 2 ? (
                                                                        <select
                                                                            value={candidate.phase2Decision || 'None'}
                                                                            onChange={(e) => handlePhase2DecisionChange(candidate._id, e.target.value)}
                                                                            className={`w-full appearance-none px-2.5 py-1 pr-7 text-[12px] font-bold rounded-lg border border-slate-200 bg-white outline-none cursor-pointer transition-colors hover:border-slate-300 focus:ring-2 focus:ring-blue-100 ${getDecisionColor(candidate.phase2Decision || 'None')}`}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            disabled={!canManagePhase3Decisions}
                                                                        >
                                                                            <option value="None" className="text-slate-600">None</option>
                                                                            <option value="Shortlisted" className="text-emerald-600 font-bold">Shortlisted</option>
                                                                            <option value="Selected" className="text-purple-600 font-bold">Selected</option>
                                                                            <option value="Rejected" className="text-red-600 font-bold">Rejected</option>
                                                                            <option value="On Hold" className="text-amber-600 font-bold">On Hold</option>
                                                                        </select>
                                                                    ) : (
                                                                        <select
                                                                            value={candidate.phase3Decision || 'None'}
                                                                            onChange={(e) => handlePhase3DecisionChange(candidate._id, e.target.value)}
                                                                            className={`w-full appearance-none px-2.5 py-1 pr-7 text-[12px] font-bold rounded-lg border border-slate-200 bg-white outline-none cursor-pointer transition-colors hover:border-slate-300 focus:ring-2 focus:ring-blue-100 ${getDecisionColor(candidate.phase3Decision || 'None')}`}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            disabled={!canMakeDecisions}
                                                                        >
                                                                            <option value="None" className="text-slate-600">None</option>
                                                                            <option value="Offer Sent" className="text-blue-600 font-bold">Offer Sent</option>
                                                                            <option value="Offer Accepted" className="text-amber-600 font-bold">Offer Accepted</option>
                                                                            <option value="Joined" className="text-emerald-600 font-bold">Joined</option>
                                                                            <option value="No Show" className="text-rose-600 font-bold">No Show</option>
                                                                            <option value="Offer Declined" className="text-rose-600 font-bold">Offer Declined</option>
                                                                        </select>
                                                                    )}
                                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                                                        <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                                                        </svg>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        )}
                                                        {!selectedCandidateId && (
                                                            <td className="px-4 py-4 align-top">
                                                                <div className="flex flex-col gap-0.5 text-[12px] text-slate-500 font-medium whitespace-nowrap">
                                                                    <span
                                                                        className="font-bold text-blue-600 mb-0.5 max-w-30 truncate cursor-pointer hover:underline"
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
                                                                            className="w-fit text-left text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
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
                                                                    <span className={`mt-0.5 w-fit rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getCandidateUploadType(candidate) === 'CV' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                                                        {getCandidateUploadType(candidate)}
                                                                    </span>
                                                                    <span>{format(new Date(candidate.uploadedAt), 'MMM dd, yyyy')}</span>
                                                                    <span className="text-[10px] mt-0.5">{format(new Date(candidate.uploadedAt), 'hh:mm a')}</span>
                                                                </div>
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-4 align-top text-center">
                                                            <button
                                                                onClick={(e) => toggleMenu(e, candidate._id)}
                                                                data-legacy-action-menu-trigger="true"
                                                                className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative"
                                                            >
                                                                <MoreVertical size={18} />
                                                            </button>

                                                            {/* Dropdown Menu */}
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
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Pagination Controls */}
                            {!loading && activeList.length > 0 && (
                                <div className="flex justify-end items-center mt-6 gap-4 pr-4 pb-4">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm font-medium text-slate-600 min-w-25 text-center">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Side: Candidate Details Side Panel */}
                {selectedCandidateId && (
                    <div className={`${isSidePanelMaximized ? 'fixed top-0 right-0 bottom-0 left-0 md:left-64 z-100' : 'w-full lg:w-[72%] sticky top-20 h-[calc(100vh-100px)]'} bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300`}>
                        {/* Side Panel Header */}
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 ">
                            <h2 className="text-lg font-bold text-slate-800">Quick Profile View</h2>
                            <button
                                onClick={handleCloseCandidate}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-800 shadow-sm bg-white border border-slate-200"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Content Area */}
                        <div className="scrollbar-hide flex-1 overflow-y-auto bg-slate-50/50">
                            <CandidateDetails
                                key={selectedCandidateId}
                                candidateId={selectedCandidateId}
                                hiringRequestId={hiringRequestId}
                                isSidePanel={true}
                                onUpdate={() => fetchCandidates(true)}
                                isSidePanelMaximized={isSidePanelMaximized}
                                onToggleMaximize={handleToggleMaximize}
                            />
                        </div>
                    </div>
                )}
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
