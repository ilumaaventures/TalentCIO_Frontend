import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowRight,
    BriefcaseBusiness,
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock3,
    FileText,
    FileX,
    Globe,
    RefreshCw,
    Target,
    Users,
    Search,
    SlidersHorizontal,
    Filter,
    MoreVertical,
    Eye,
    Ban,
    AlertTriangle,
    AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import api from '@/lib/apiClient';
import Skeleton from '@/components/ui/Skeleton';
import PublicApplicationsView from '@/features/talent-acquisition/components/PublicApplicationsView';
import {
    createNoCacheRequestConfig,
    invalidateTACaches,
    readTAClientsCache,
    refreshTAClientsCache
} from '@/features/talent-acquisition/utils/taCache';
import { useAuth } from '@/features/auth/context/AuthContext';

const requestStatusClasses = {
    Draft: 'bg-slate-100 text-slate-600 border-slate-200',
    Submitted: 'bg-blue-50 text-blue-700 border-blue-200',
    Pending_L1: 'bg-amber-50 text-amber-700 border-amber-200',
    Pending_Final: 'bg-purple-50 text-purple-700 border-purple-200',
    Pending_Approval: 'bg-amber-50 text-amber-700 border-amber-200',
    'Pending Approval': 'bg-amber-50 text-amber-700 border-amber-200',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    Closed: 'bg-slate-100 text-slate-600 border-slate-200',
    On_Hold: 'bg-slate-200 text-slate-700 border-slate-300'
};

const interviewStatusClasses = {
    Scheduled: 'bg-blue-50 text-blue-700',
    Pending: 'bg-amber-50 text-amber-700',
    Completed: 'bg-emerald-50 text-emerald-700',
    Cancelled: 'bg-rose-50 text-rose-700',
    Rescheduled: 'bg-violet-50 text-violet-700',
    Passed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Failed: 'bg-rose-50 text-rose-700 border border-rose-200'
};

const formatCompact = (value) => {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric)) return '0';
    return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(numeric);
};

const formatShortDate = (value) => {
    if (!value) return 'TBD';
    return format(new Date(value), 'dd MMM yyyy');
};

const formatShortDateTime = (value) => {
    if (!value) return 'Schedule pending';
    return format(new Date(value), 'dd MMM, hh:mm a');
};

const formatRelativeTimestamp = (value) => {
    if (!value) return 'Pending';
    return formatDistanceToNow(new Date(value), { addSuffix: true });
};

const monthLabel = (value) => {
    if (!value) return '';
    return format(new Date(`${value}-01`), 'MMM');
};

const getInitials = (...parts) => parts
    .filter(Boolean)
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'TA';

const StatCard = ({ label, value, tone, meta, icon }) => {
    const IconComponent = icon;

    return (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <div className={`absolute inset-x-0 top-0 h-1 ${tone}`} />
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                    <p className="font-ta-head mt-1 text-[1.3rem] font-bold tracking-tight text-slate-900">{value}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{meta}</p>
                </div>
                <div className="rounded-lg bg-slate-100 p-1.5 text-slate-600">
                    <IconComponent size={14} />
                </div>
            </div>
        </div>
    );
};

const primaryStatThemes = {
    blue: {
        accent: 'bg-blue-600',
        surface: 'from-blue-50/70 via-white to-white',
        icon: 'bg-blue-100 text-blue-700',
        meta: 'text-blue-700/80'
    },
    emerald: {
        accent: 'bg-emerald-600',
        surface: 'from-emerald-50/70 via-white to-white',
        icon: 'bg-emerald-100 text-emerald-700',
        meta: 'text-emerald-700/80'
    },
    amber: {
        accent: 'bg-amber-500',
        surface: 'from-amber-50/70 via-white to-white',
        icon: 'bg-amber-100 text-amber-700',
        meta: 'text-amber-700/80'
    },
    violet: {
        accent: 'bg-violet-600',
        surface: 'from-violet-50/70 via-white to-white',
        icon: 'bg-violet-100 text-violet-700',
        meta: 'text-violet-700/80'
    }
};

const PrimaryStatCard = ({ label, value, meta, icon, theme = 'blue' }) => {
    const IconComponent = icon;
    const styles = primaryStatThemes[theme] || primaryStatThemes.blue;

    return (
        <div className={`relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br ${styles.surface} p-3.5 shadow-xs`}>
            <div className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`} />
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</p>
                    <p className="font-ta-head mt-1 text-[1.4rem] font-bold tracking-tight text-slate-900 sm:text-[1.5rem]">{value}</p>
                    <p className={`mt-0.5 text-[10px] font-medium ${styles.meta}`}>{meta}</p>
                </div>
                <div className={`rounded-lg p-2 ${styles.icon}`}>
                    <IconComponent size={15} />
                </div>
            </div>
        </div>
    );
};

const trendCardThemes = {
    emerald: {
        accent: 'bg-emerald-600',
        icon: 'bg-emerald-50 text-emerald-700'
    },
    blue: {
        accent: 'bg-blue-600',
        icon: 'bg-blue-50 text-blue-700'
    },
    amber: {
        accent: 'bg-amber-500',
        icon: 'bg-amber-50 text-amber-700'
    },
    rose: {
        accent: 'bg-rose-500',
        icon: 'bg-rose-50 text-rose-700'
    }
};

const TrendMetricCard = ({ label, value, meta, icon, trend, theme = 'blue' }) => {
    const IconComponent = icon;
    const styles = trendCardThemes[theme] || trendCardThemes.blue;

    const direction = trend?.direction || 'flat';
    const trendTone = direction === 'flat'
        ? 'bg-slate-100 text-slate-600'
        : trend?.improved
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-rose-50 text-rose-700';
    const trendArrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className={`mb-2 h-1 w-10 rounded-full ${styles.accent}`} />
            <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                    <p className="font-ta-head mt-1 text-[1.2rem] font-bold tracking-tight text-slate-900">{value}</p>
                    <p className="mt-0.5 text-[9.5px] text-slate-500 line-clamp-1">{meta}</p>
                </div>
                <div className={`rounded-lg p-1.5 ${styles.icon}`}>
                    <IconComponent size={14} />
                </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${trendTone}`}>
                    <span>{trendArrow}</span>
                    <span>{trend?.delta ?? 0}%</span>
                </span>
                <span className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">Vs previous month</span>
            </div>
        </div>
    );
};

const SectionCard = ({ title, action, children }) => (
    <section className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5">
            <h3 className="font-ta-head text-xs font-bold text-slate-800">{title}</h3>
            {action}
        </div>
        <div className="p-3.5">{children}</div>
    </section>
);

const LoadingDashboard = () => (
    <div className="space-y-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full rounded-xl" />
            ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <Skeleton className="h-[320px] w-full rounded-2xl" />
            <Skeleton className="h-[320px] w-full rounded-2xl" />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
            <Skeleton className="h-[300px] w-full rounded-2xl" />
            <Skeleton className="h-[300px] w-full rounded-2xl" />
        </div>
    </div>
);

const TalentAcquisitionDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [analytics, setAnalytics] = useState(null);
    const [requests, setRequests] = useState([]);
    const [clients, setClients] = useState([]);
    const [interviews, setInterviews] = useState([]);
    const [clientStatusFilter, setClientStatusFilter] = useState('Active');
    const [openMenuClientId, setOpenMenuClientId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [statusUpdatingId, setStatusUpdatingId] = useState(null);

    const getSavedVal = (key, defaultVal) => {
        try {
            const saved = sessionStorage.getItem('ta_candidate_filters');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed[key] !== undefined) return parsed[key];
            }
        } catch (e) {
            console.error(e);
        }
        return defaultVal;
    };

    // Global Candidate Search states
    const [candidateSearchText, setCandidateSearchText] = useState(() => getSavedVal('search', ''));
    const [searchTriggerVal, setSearchTriggerVal] = useState('');
    const [selectedSources, setSelectedSources] = useState(() => getSavedVal('sources', []));
    const [minExp, setMinExp] = useState(() => getSavedVal('minExp', ''));
    const [maxExp, setMaxExp] = useState(() => getSavedVal('maxExp', ''));
    const [searchSkills, setSearchSkills] = useState(() => getSavedVal('skills', []));
    const [searchClient, setSearchClient] = useState(() => getSavedVal('client', ''));
    const [searchLocation, setSearchLocation] = useState(() => getSavedVal('location', ''));
    const [maxNoticePeriod, setMaxNoticePeriod] = useState(() => getSavedVal('maxNoticePeriod', ''));
    const [minCurrentCTC, setMinCurrentCTC] = useState(() => getSavedVal('minCurrentCTC', ''));
    const [maxCurrentCTC, setMaxCurrentCTC] = useState(() => getSavedVal('maxCurrentCTC', ''));
    const [minExpectedCTC, setMinExpectedCTC] = useState(() => getSavedVal('minExpectedCTC', ''));
    const [maxExpectedCTC, setMaxExpectedCTC] = useState(() => getSavedVal('maxExpectedCTC', ''));
    const [searchInHandOffer, setSearchInHandOffer] = useState(() => getSavedVal('inHandOffer', ''));
    const [searchDecision, setSearchDecision] = useState(() => getSavedVal('decision', ''));
    const [candidateResults, setCandidateResults] = useState([]);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const [searchPage, setSearchPage] = useState(() => getSavedVal('searchPage', 1));
    const [searchPagination, setSearchPagination] = useState({ currentPage: 1, totalPages: 1, count: 0, limit: 15 });
    const [showFilters, setShowFilters] = useState(() => getSavedVal('showFilters', false));
    const [availableSources, setAvailableSources] = useState([]);
    const [availableSkills, setAvailableSkills] = useState([]);
    const [skillsFilterText, setSkillsFilterText] = useState('');
    // Public Applications mode
    const showPublicApps = false;
    const [publicAppReviewStatus, setPublicAppReviewStatus] = useState(() => getSavedVal('publicAppReviewStatus', ''));
    const [publicAppResults, setPublicAppResults] = useState([]);
    const [publicAppPagination, setPublicAppPagination] = useState({ currentPage: 1, totalPages: 1, count: 0, limit: 15 });

    // Requisitions tab state
    const [reqSearchInput, setReqSearchInput] = useState('');
    const [reqStatusFilter, setReqStatusFilter] = useState('All');
    const [reqPage, setReqPage] = useState(1);
    const [reqLimit, setReqLimit] = useState(30);
    const [reqList, setReqList] = useState([]);
    const [reqTotalPages, setReqTotalPages] = useState(1);
    const [reqTotalRequests, setReqTotalRequests] = useState(0);
    const [isReqLoading, setIsReqLoading] = useState(false);

    // Applied states used for search execution
    const defaultAppliedFilters = useMemo(() => ({
        search: '', sources: [], minExp: '', maxExp: '', skills: [], client: '',
        location: '', maxNoticePeriod: '', minCurrentCTC: '', maxCurrentCTC: '',
        minExpectedCTC: '', maxExpectedCTC: '', inHandOffer: '', decision: '', publicAppReviewStatus: ''
    }), []);

    const [appliedFilters, setAppliedFilters] = useState(() => {
        try {
            const saved = sessionStorage.getItem('ta_candidate_filters');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.appliedFilters !== undefined) return parsed.appliedFilters;
                return {
                    search: parsed.search ?? '',
                    sources: parsed.sources ?? [],
                    minExp: parsed.minExp ?? '',
                    maxExp: parsed.maxExp ?? '',
                    skills: parsed.skills ?? [],
                    client: parsed.client ?? '',
                    location: parsed.location ?? '',
                    maxNoticePeriod: parsed.maxNoticePeriod ?? '',
                    minCurrentCTC: parsed.minCurrentCTC ?? '',
                    maxCurrentCTC: parsed.maxCurrentCTC ?? '',
                    minExpectedCTC: parsed.minExpectedCTC ?? '',
                    maxExpectedCTC: parsed.maxExpectedCTC ?? '',
                    inHandOffer: parsed.inHandOffer ?? '',
                    decision: parsed.decision ?? '',
                    publicAppReviewStatus: parsed.publicAppReviewStatus ?? ''
                };
            }
        } catch (e) {
            console.error(e);
        }
        return {
            search: '', sources: [], minExp: '', maxExp: '', skills: [], client: '',
            location: '', maxNoticePeriod: '', minCurrentCTC: '', maxCurrentCTC: '',
            minExpectedCTC: '', maxExpectedCTC: '', inHandOffer: '', decision: '', publicAppReviewStatus: ''
        };
    });

    useEffect(() => {
        const stateToSave = {
            search: candidateSearchText,
            sources: selectedSources,
            minExp,
            maxExp,
            skills: searchSkills,
            client: searchClient,
            location: searchLocation,
            maxNoticePeriod,
            minCurrentCTC,
            maxCurrentCTC,
            minExpectedCTC,
            maxExpectedCTC,
            inHandOffer: searchInHandOffer,
            decision: searchDecision,
            showFilters,
            searchPage,
            appliedFilters,
            showPublicApps,
            publicAppReviewStatus
        };
        sessionStorage.setItem('ta_candidate_filters', JSON.stringify(stateToSave));
    }, [
        candidateSearchText,
        selectedSources,
        minExp,
        maxExp,
        searchSkills,
        searchClient,
        searchLocation,
        maxNoticePeriod,
        minCurrentCTC,
        maxCurrentCTC,
        minExpectedCTC,
        maxExpectedCTC,
        searchInHandOffer,
        searchDecision,
        showFilters,
        searchPage,
        appliedFilters,
        showPublicApps,
        publicAppReviewStatus
    ]);

    const canViewAnalytics = useMemo(() => (
        user?.roles?.some(role => ['Admin', 'Super Admin', 'System Admin'].includes(role)) ||
        user?.permissions?.includes('ta.analytics.global') ||
        user?.permissions?.includes('ta.analytics.assigned') ||
        user?.permissions?.includes('*') ||
        user?.isTAAnalyticsViewer
    ), [user]);

    const canViewCandidates = useMemo(() => (
        user?.roles?.some(role => ['Admin', 'Super Admin', 'System Admin'].includes(role)) ||
        user?.permissions?.includes('ta.candidate.view') ||
        user?.permissions?.includes('ta.candidate.manage.assigned') ||
        user?.permissions?.includes('ta.candidate.manage.all') ||
        user?.permissions?.includes('ta.view') ||
        user?.permissions?.includes('ta.manage') ||
        user?.permissions?.includes('*')
    ), [user]);

const ALLOWED_APPLICATIONS_COMPANY_IDS = [
    '69b50b31aea9daa0857991ba',
    '69ba634ff8783714f16caafa'
];

const canShowApplicationsTab = (user) => {
    const companyId = user?.company?._id || user?.companyId || user?.company;
    const companyIdStr = typeof companyId === 'object' ? String(companyId?._id || companyId) : String(companyId || '');

    const isAllowedCompany = ALLOWED_APPLICATIONS_COMPANY_IDS.includes(companyIdStr);
    const isAllowedHost = typeof window !== 'undefined' && Boolean(
        window.location.hostname.toLowerCase().includes('ilumaa') ||
        window.location.href.toLowerCase().includes('ilumaa.talentcio.in')
    );

    return isAllowedCompany || isAllowedHost;
};

    const isInterviewerOnlyUser = useMemo(() => (
        Boolean(user?.permissions?.includes('ta.interview.evaluate'))
        && !user?.roles?.some((role) => ['Admin', 'Super Admin', 'System Admin'].includes(role))
        && !user?.permissions?.includes('ta.candidate.manage.assigned')
        && !user?.permissions?.includes('ta.candidate.manage.all')
        && !user?.permissions?.includes('ta.view')
        && !user?.permissions?.includes('ta.manage')
        && !user?.permissions?.includes('ta.edit')
        && !user?.permissions?.includes('*')
    ), [user]);

    const availableTabs = useMemo(() => {
        // Pure interviewers only access Requisitions and Interviews.
        if (isInterviewerOnlyUser) {
            return ['requisitions', 'interviews'];
        }
        const tabs = [];
        if (canViewAnalytics) tabs.push('overview');
        tabs.push('requisitions', 'clients', 'interviews');
        if (canViewCandidates) {
            tabs.push('candidates');
            if (canShowApplicationsTab(user)) {
                tabs.push('applications');
            }
        }
        return tabs;
    }, [canViewAnalytics, canViewCandidates, isInterviewerOnlyUser, user]);


    const activeTab = useMemo(() => {
        const currentTab = searchParams.get('tab');
        return availableTabs.includes(currentTab) ? currentTab : availableTabs[0];
    }, [availableTabs, searchParams]);

    useEffect(() => {
        const fetchSearchMetaData = async () => {
            try {
                const [sourcesRes, skillsRes] = await Promise.all([
                    api.get('/ta/candidates/sources'),
                    api.get('/ta/candidates/skills/distinct')
                ]);
                if (Array.isArray(sourcesRes.data)) {
                    setAvailableSources(sourcesRes.data.map(s => s.name));
                }
                if (Array.isArray(skillsRes.data)) {
                    setAvailableSkills(skillsRes.data);
                }
            } catch (err) {
                console.error('Error fetching search metadata:', err);
            }
        };

        if (activeTab === 'candidates') {
            void fetchSearchMetaData();
        }
    }, [activeTab]);

    const fetchGlobalCandidates = useCallback(async () => {
        if (showPublicApps) return; // handled by fetchPublicApplications
        setIsSearchLoading(true);
        try {
            const params = {
                page: searchPage,
                limit: 15
            };

            if (appliedFilters.search.trim()) {
                params.search = appliedFilters.search.trim();
            }

            if (appliedFilters.sources.length > 0) {
                params.source = appliedFilters.sources.join(',');
            }

            if (appliedFilters.minExp !== '') {
                params.minExperience = appliedFilters.minExp;
            }

            if (appliedFilters.maxExp !== '') {
                params.maxExperience = appliedFilters.maxExp;
            }

            if (appliedFilters.skills && appliedFilters.skills.length > 0) {
                params.skills = appliedFilters.skills.join(',');
            }

            if (appliedFilters.client.trim()) {
                params.client = appliedFilters.client.trim();
            }

            if (appliedFilters.location.trim()) {
                params.location = appliedFilters.location.trim();
            }

            if (appliedFilters.maxNoticePeriod !== '') {
                params.maxNoticePeriod = appliedFilters.maxNoticePeriod;
            }

            if (appliedFilters.minCurrentCTC !== '') {
                params.minCurrentCTC = appliedFilters.minCurrentCTC;
            }

            if (appliedFilters.maxCurrentCTC !== '') {
                params.maxCurrentCTC = appliedFilters.maxCurrentCTC;
            }

            if (appliedFilters.minExpectedCTC !== '') {
                params.minExpectedCTC = appliedFilters.minExpectedCTC;
            }

            if (appliedFilters.maxExpectedCTC !== '') {
                params.maxExpectedCTC = appliedFilters.maxExpectedCTC;
            }

            if (appliedFilters.inHandOffer !== '') {
                params.inHandOffer = appliedFilters.inHandOffer;
            }

            if (appliedFilters.decision !== '') {
                params.decision = appliedFilters.decision;
            }

            const response = await api.get('/ta/candidates/global/search', { params });
            if (response.data) {
                setCandidateResults(response.data.candidates || []);
                setSearchPagination({
                    currentPage: response.data.currentPage || 1,
                    totalPages: response.data.totalPages || 1,
                    count: response.data.count || 0,
                    limit: response.data.limit || 15
                });
            }
        } catch (err) {
            console.error('Error fetching global search candidates:', err);
        } finally {
            setIsSearchLoading(false);
        }
    }, [searchPage, appliedFilters, showPublicApps]);

    const fetchPublicApplications = useCallback(async () => {
        if (!showPublicApps) return;
        setIsSearchLoading(true);
        try {
            const params = { page: searchPage, limit: 15 };
            if (appliedFilters.search?.trim()) params.search = appliedFilters.search.trim();
            if (appliedFilters.minExp !== '') params.minExperience = appliedFilters.minExp;
            if (appliedFilters.maxExp !== '') params.maxExperience = appliedFilters.maxExp;
            if (appliedFilters.client?.trim()) params.client = appliedFilters.client.trim();
            if (appliedFilters.maxNoticePeriod !== '') params.maxNoticePeriod = appliedFilters.maxNoticePeriod;
            if (appliedFilters.minCurrentCTC !== '') params.minCurrentCTC = appliedFilters.minCurrentCTC;
            if (appliedFilters.maxCurrentCTC !== '') params.maxCurrentCTC = appliedFilters.maxCurrentCTC;
            if (appliedFilters.minExpectedCTC !== '') params.minExpectedCTC = appliedFilters.minExpectedCTC;
            if (appliedFilters.maxExpectedCTC !== '') params.maxExpectedCTC = appliedFilters.maxExpectedCTC;
            if (appliedFilters.publicAppReviewStatus) params.reviewStatus = appliedFilters.publicAppReviewStatus;
            const response = await api.get('/ta/candidates/global/public-applications/search', { params });
            if (response.data) {
                setPublicAppResults(response.data.applications || []);
                setPublicAppPagination({
                    currentPage: response.data.currentPage || 1,
                    totalPages: response.data.totalPages || 1,
                    count: response.data.count || 0,
                    limit: response.data.limit || 15
                });
            }
        } catch (err) {
            console.error('Error fetching public applications:', err);
        } finally {
            setIsSearchLoading(false);
        }
    }, [searchPage, appliedFilters, showPublicApps]);

    useEffect(() => {
        if (activeTab === 'candidates') {
            if (showPublicApps) {
                void fetchPublicApplications();
            } else {
                void fetchGlobalCandidates();
            }
        }
    }, [activeTab, searchPage, appliedFilters, fetchGlobalCandidates, fetchPublicApplications, showPublicApps]);

    const fetchRequisitionsTab = useCallback(async () => {
        setIsReqLoading(true);
        try {
            const params = {
                page: reqPage,
                limit: reqLimit,
            };
            if (reqSearchInput.trim()) {
                params.search = reqSearchInput.trim();
            }
            if (reqStatusFilter && reqStatusFilter !== 'All') {
                params.status = reqStatusFilter;
            }

            const response = await api.get('/ta/hiring-request', createNoCacheRequestConfig(params));
            if (response.data) {
                setReqList(response.data.requests || []);
                setReqTotalPages(response.data.totalPages || 1);
                setReqTotalRequests(response.data.totalRequests || 0);
            }
        } catch (err) {
            console.error('Error fetching requisitions tab list:', err);
        } finally {
            setIsReqLoading(false);
        }
    }, [reqPage, reqLimit, reqSearchInput, reqStatusFilter]);

    useEffect(() => {
        if (activeTab === 'requisitions') {
            void fetchRequisitionsTab();
        }
    }, [activeTab, reqPage, reqLimit, reqSearchInput, reqStatusFilter, fetchRequisitionsTab]);

    const loadDashboard = useCallback(async ({ silent = false } = {}) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError('');

        const cachedClients = readTAClientsCache();
        if (cachedClients?.data?.length) {
            setClients(cachedClients.data);
        }

        const analyticsPromise = canViewAnalytics
            ? api.get('/ta/analytics/global', createNoCacheRequestConfig())
            : Promise.resolve({ data: { data: null } });

        const [analyticsResult, requestsResult, interviewsResult, clientsResult] = await Promise.allSettled([
            analyticsPromise,
            api.get('/ta/hiring-request', createNoCacheRequestConfig({ page: 1, limit: 18 })),
            api.get('/ta/candidates/my/interviews', createNoCacheRequestConfig()),
            refreshTAClientsCache()
        ]);

        const failures = [];

        if (analyticsResult.status === 'fulfilled') {
            setAnalytics(analyticsResult.value.data?.data || null);
        } else if (canViewAnalytics) {
            failures.push('analytics');
        }

        if (requestsResult.status === 'fulfilled') {
            setRequests(requestsResult.value.data?.requests || []);
        } else {
            failures.push('requisitions');
        }

        if (interviewsResult.status === 'fulfilled') {
            setInterviews(Array.isArray(interviewsResult.value.data) ? interviewsResult.value.data : []);
        } else {
            failures.push('interviews');
        }

        if (clientsResult.status === 'fulfilled') {
            setClients(Array.isArray(clientsResult.value) ? clientsResult.value : []);
        } else if (!cachedClients?.data?.length) {
            failures.push('clients');
        }

        const totalExpectedFailures = canViewAnalytics ? 4 : 3;

        if (failures.length === totalExpectedFailures) {
            setError('Unable to load the TA dashboard right now.');
        }

        setLoading(false);
        setRefreshing(false);
    }, [canViewAnalytics]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadDashboard();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadDashboard]);

    const topMetrics = useMemo(() => analytics?.topMetrics || {}, [analytics]);
    const pendingRequestsCount = useMemo(
        () => requests.filter((item) => ['Pending_Approval', 'Pending_L1', 'Pending_Final', 'Submitted'].includes(item.status)).length,
        [requests]
    );
    const approvedRequestsCount = useMemo(
        () => requests.filter((item) => item.status === 'Approved').length,
        [requests]
    );
    const recentRequests = useMemo(() => requests.slice(0, 8), [requests]);
    const filteredClients = useMemo(() => {
        if (clientStatusFilter === 'Active') {
            return clients.filter((c) => (c.status || 'Active') === 'Active');
        }
        if (clientStatusFilter === 'Inactive') {
            return clients.filter((c) => c.status === 'Inactive');
        }
        return clients;
    }, [clients, clientStatusFilter]);
    const topClients = useMemo(() => filteredClients, [filteredClients]);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (!e.target.closest('.client-menu-container')) {
                setOpenMenuClientId(null);
            }
        };
        const handleScroll = () => {
            setOpenMenuClientId(null);
        };
        document.addEventListener('click', handleOutsideClick);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('click', handleOutsideClick);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, []);

    const handleToggleClientStatus = useCallback(async (client, newStatus) => {
        setOpenMenuClientId(null);
        if (newStatus === 'Inactive') {
            const confirmed = window.confirm(`Are you sure you want to mark "${client.name}" as inactive?\n\nThis will automatically close and unpublish all associated requisitions in Talent Acquisition.`);
            if (!confirmed) return;
        }
        const targetKey = client.id || client._id || client.name;
        setStatusUpdatingId(targetKey);
        try {
            await api.put('/ta/clients/status', {
                clientId: client.id,
                clientName: client.name,
                status: newStatus
            });
            invalidateTACaches();
            await refreshTAClientsCache();
            await loadDashboard({ silent: true });
        } catch (err) {
            console.error('Failed to update client status:', err);
        } finally {
            setStatusUpdatingId(null);
        }
    }, [loadDashboard]);
    const trendData = useMemo(
        () => (analytics?.monthlyTrend || []).map((entry) => ({ ...entry, label: monthLabel(entry.month) })),
        [analytics]
    );
    const sourcingPerformance = useMemo(() => (analytics?.sourcingPerformance || []).slice(0, 5), [analytics]);
    const sourceAnalysis = useMemo(
        () => (analytics?.sourceAnalysis || []).map((item) => ({
            ...item,
            name: item.name === 'Public Job Board' ? 'Public Applications' : item.name
        })),
        [analytics]
    );
    const metricTrends = useMemo(() => analytics?.metricTrends || {}, [analytics]);
    const overviewSourceAnalysis = useMemo(() => {
        const sorted = [...sourceAnalysis].sort((a, b) => Number(b.sourced || 0) - Number(a.sourced || 0));
        const publicApplicationsIndex = sorted.findIndex((item) => item.name === 'Public Applications');

        if (publicApplicationsIndex === -1 || sorted.length <= 6 || publicApplicationsIndex < 6) {
            return sorted.slice(0, 6);
        }

        return [...sorted.slice(0, 5), sorted[publicApplicationsIndex]];
    }, [sourceAnalysis]);
    const maxSourceValue = useMemo(
        () => Math.max(1, ...sourceAnalysis.map((item) => Number(item.sourced || item.value || 0))),
        [sourceAnalysis]
    );

    const primaryStatCards = useMemo(() => ([
        {
            label: 'Total Positions Open',
            value: formatCompact(topMetrics.totalOpenPositions ?? 0),
            meta: `${approvedRequestsCount} approved requisitions live`,
            theme: 'blue',
            icon: BriefcaseBusiness
        },
        {
            label: 'Total Requisitions',
            value: formatCompact(topMetrics.totalReqs ?? requests.length),
            meta: `${pendingRequestsCount} waiting for review`,
            theme: 'emerald',
            icon: FileText
        },
        {
            label: 'Offers Released',
            value: formatCompact(topMetrics.offersReleased ?? 0),
            meta: `${topMetrics.offerAcceptanceRate || 0}% offer acceptance rate`,
            theme: 'amber',
            icon: Target
        },
        {
            label: 'Total Joined',
            value: formatCompact(topMetrics.totalJoined ?? 0),
            meta: `${topMetrics.avgTimeToHire || 0} days avg. to hire`,
            theme: 'violet',
            icon: CheckCircle2
        }
    ]), [approvedRequestsCount, pendingRequestsCount, requests.length, topMetrics]);

    const overviewTrendCards = useMemo(() => ([
        {
            label: 'Offer Acceptance Rate',
            value: `${topMetrics.offerAcceptanceRate || 0}%`,
            meta: 'Joined candidates from released offers',
            theme: 'emerald',
            icon: Target,
            trend: metricTrends.offerAcceptanceRate
        },
        {
            label: 'Joining Conversion Rate',
            value: `${topMetrics.joiningConversionRate || 0}%`,
            meta: 'Joinees converted from total sourced pool',
            theme: 'blue',
            icon: Users,
            trend: metricTrends.joiningConversionRate
        },
        {
            label: 'Avg Time to Hire',
            value: `${topMetrics.avgTimeToHire || 0} days`,
            meta: 'Average sourcing-to-joining cycle time',
            theme: 'amber',
            icon: Clock3,
            trend: metricTrends.avgTimeToHire
        },
        {
            label: 'Avg Time to Fill',
            value: `${topMetrics.avgTimeToFill || 0} days`,
            meta: 'Average requisition closure turnaround',
            theme: 'rose',
            icon: CalendarDays,
            trend: metricTrends.avgTimeToFill
        }
    ]), [metricTrends, topMetrics]);

    const renderOverview = () => (
        <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {primaryStatCards.map((card) => <PrimaryStatCard key={card.label} {...card} />)}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {overviewTrendCards.map((card) => <TrendMetricCard key={card.label} {...card} />)}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
                <SectionCard
                    title="Hiring Momentum"
                    action={<span className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-slate-400">Last sourced trend</span>}
                >
                    {trendData.length ? (
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="taTrendFill" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor="#1A56DB" stopOpacity={0.25} />
                                            <stop offset="100%" stopColor="#1A56DB" stopOpacity={0.03} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={9} />
                                    <YAxis tickLine={false} axisLine={false} fontSize={9} width={24} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="sourced" stroke="#1A56DB" strokeWidth={2.5} fill="url(#taTrendFill)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-[10px] text-slate-500">Not enough trend data yet.</p>
                    )}
                </SectionCard>

                <SectionCard
                    title="Source Breakdown"
                    action={<Link to="/ta/analysis" className="text-[10px] font-semibold text-blue-600 hover:text-blue-700">Open full analysis</Link>}
                >
                    <div className="space-y-3">
                        {overviewSourceAnalysis.length ? overviewSourceAnalysis.map((item) => (
                            <div key={item.name}>
                                <div className="mb-1.5 flex items-center justify-between text-[10px]">
                                    <span className="font-semibold text-slate-700">{item.name}</span>
                                    <span className="text-slate-500">{formatCompact(item.sourced || 0)}</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full bg-blue-600"
                                        style={{ width: `${Math.max(8, ((item.sourced || 0) / maxSourceValue) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )) : (
                            <p className="text-[10px] text-slate-500">No source data available yet.</p>
                        )}
                    </div>
                </SectionCard>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <SectionCard
                    title="Recent Requisitions"
                    action={<Link to="/ta?tab=clients" className="text-[10px] font-semibold text-blue-600 hover:text-blue-700">Open client workspace</Link>}
                >
                    <div className="scrollbar-hide overflow-x-auto">
                        {recentRequests.length ? (
                            <table className="min-w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 text-left text-[8.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                        <th className="px-3 py-2.5">Requisition</th>
                                        <th className="px-3 py-2.5">Client</th>
                                        <th className="px-3 py-2.5">Department</th>
                                        <th className="px-3 py-2.5">Status</th>
                                        <th className="px-3 py-2.5">Applied</th>
                                        <th className="px-3 py-2.5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentRequests.map((request) => (
                                        <tr key={request._id} className="border-b border-slate-100 transition hover:bg-slate-50">
                                            <td className="px-3 py-2.5">
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-semibold text-slate-900">{request.roleDetails?.title}</p>
                                                    <p className="text-[9.5px] text-slate-500">{request.requestId}</p>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-[10.5px] text-slate-700">{request.client}</td>
                                            <td className="px-3 py-2.5 text-[10.5px] text-slate-700">{request.roleDetails?.department || 'General'}</td>
                                            <td className="px-3 py-2.5">
                                                <span className={`rounded-full border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.14em] ${requestStatusClasses[request.status] || requestStatusClasses.Draft}`}>
                                                    {String(request.status || 'Draft').replaceAll('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-[10px] text-slate-500">{formatRelativeTimestamp(request.createdAt)}</td>
                                            <td className="px-3 py-2.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/ta/view/${request._id}${request.status === 'Approved' || request.status === 'Closed' ? '?tab=applications' : ''}`)}
                                                    className="rounded-lg border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-100"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-[10px] text-slate-500">No requisitions found for this workspace yet.</p>
                        )}
                    </div>
                </SectionCard>

                <SectionCard
                    title="Top Sourcers"
                    action={<Link to="/ta/analysis" className="text-[10px] font-semibold text-blue-600 hover:text-blue-700">Open analytics</Link>}
                >
                    <div className="space-y-3">
                        {sourcingPerformance.length ? sourcingPerformance.map((member, index) => (
                            <div key={member.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-900">{member.name}</p>
                                        <p className="mt-0.5 text-[9.5px] text-slate-500">
                                            {member.sourced} sourced / {member.joined} joined
                                        </p>
                                    </div>
                                </div>
                                <span className="font-ta-head text-[1.25rem] font-bold tracking-tight text-slate-950">
                                    {member.conversion}%
                                </span>
                            </div>
                        )) : (
                            <p className="text-[10px] text-slate-500">Sourcing conversion data is not available yet.</p>
                        )}
                    </div>
                </SectionCard>
            </div>
        </div>
    );

    const renderRequisitions = () => (
        <SectionCard
            title="Requisition Command View"
            action={<Link to="/ta/create-request" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">+ Create new requisition</Link>}
        >
            <div className="mb-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3.5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Total Requisitions</p>
                    <p className="font-ta-head mt-2 text-xl font-bold text-slate-950">{reqTotalRequests || requests.length}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Approved</p>
                    <p className="font-ta-head mt-2 text-xl font-bold text-emerald-600">{approvedRequestsCount}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Pending Review</p>
                    <p className="font-ta-head mt-2 text-xl font-bold text-amber-600">{pendingRequestsCount}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Closed</p>
                    <p className="font-ta-head mt-2 text-xl font-bold text-slate-600">{requests.filter((item) => item.status === 'Closed').length}</p>
                </div>
            </div>

            {/* Search & Filter Controls */}
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={reqSearchInput}
                        onChange={(e) => {
                            setReqSearchInput(e.target.value);
                            setReqPage(1);
                        }}
                        placeholder="Search requisition ID, title, client, department..."
                        className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-8 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    {reqSearchInput && (
                        <button
                            type="button"
                            onClick={() => {
                                setReqSearchInput('');
                                setReqPage(1);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                        >
                            ×
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <span>Status:</span>
                        <select
                            value={reqStatusFilter}
                            onChange={(e) => {
                                setReqStatusFilter(e.target.value);
                                setReqPage(1);
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Approved">Approved</option>
                            <option value="Pending_Approval">Pending Approval</option>
                            <option value="Submitted">Submitted</option>
                            <option value="Draft">Draft</option>
                            <option value="Closed">Closed</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <span>Show:</span>
                        <select
                            value={reqLimit}
                            onChange={(e) => {
                                setReqLimit(Number(e.target.value));
                                setReqPage(1);
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                        >
                            <option value={30}>30 per page</option>
                            <option value={50}>50 per page</option>
                            <option value={100}>100 per page</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto min-h-[300px]">
                {isReqLoading ? (
                    <div className="py-12 text-center text-xs font-medium text-slate-400 animate-pulse">
                        Loading requisitions...
                    </div>
                ) : (
                    <table className="min-w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 text-left text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                <th className="px-4 py-3">Role / Request ID</th>
                                <th className="px-4 py-3">Client</th>
                                <th className="px-4 py-3">Department</th>
                                <th className="px-4 py-3">Created Date</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reqList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                        No requisitions found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                reqList.map((request) => (
                                    <tr
                                        key={request._id}
                                        className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
                                        onClick={() => navigate(`/ta/view/${request._id}${request.status === 'Approved' || request.status === 'Closed' ? '?tab=applications' : ''}`)}
                                    >
                                        <td className="px-4 py-3.5">
                                            <p className="font-semibold text-slate-900">{request.roleDetails?.title || 'No Title'}</p>
                                            <p className="text-[11px] text-slate-500">{request.requestId}</p>
                                        </td>
                                        <td className="px-4 py-3.5 text-xs text-slate-600">{request.client || 'General'}</td>
                                        <td className="px-4 py-3.5 text-xs text-slate-600">{request.roleDetails?.department || '—'}</td>
                                        <td className="px-4 py-3.5 text-xs text-slate-600">{formatShortDate(request.createdAt)}</td>
                                        <td className="px-4 py-3.5">
                                            <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ${requestStatusClasses[request.status] || requestStatusClasses.Draft}`}>
                                                {String(request.status || 'Draft').replaceAll('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/ta/view/${request._id}${request.status === 'Approved' || request.status === 'Closed' ? '?tab=applications' : ''}`);
                                                }}
                                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination Footer */}
            <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row text-xs">
                <div className="text-slate-500 font-medium">
                    Showing <span className="font-bold text-slate-800">{reqList.length ? (reqPage - 1) * reqLimit + 1 : 0}</span> to <span className="font-bold text-slate-800">{Math.min(reqPage * reqLimit, reqTotalRequests)}</span> of <span className="font-bold text-slate-800">{reqTotalRequests}</span> requisitions
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={reqPage <= 1 || isReqLoading}
                        onClick={() => setReqPage((prev) => Math.max(1, prev - 1))}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>

                    <span className="px-2 font-bold text-slate-700">
                        Page {reqPage} of {reqTotalPages}
                    </span>

                    <button
                        type="button"
                        disabled={reqPage >= reqTotalPages || isReqLoading}
                        onClick={() => setReqPage((prev) => Math.min(reqTotalPages, prev + 1))}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            </div>
        </SectionCard>
    );

    const renderClients = () => (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard label="Tracked Clients" value={formatCompact(clients.length)} meta="Across TA hiring requests" tone="bg-blue-600" icon={Building2} />
                <StatCard label="Active Positions" value={formatCompact(clients.reduce((sum, item) => sum + (item.activePositions || 0), 0))} meta="Live approved requisitions" tone="bg-emerald-600" icon={BriefcaseBusiness} />
                <StatCard label="Pending Positions" value={formatCompact(clients.reduce((sum, item) => sum + (item.pendingPositions || 0), 0))} meta="Waiting on workflow action" tone="bg-amber-500" icon={Clock3} />
            </div>

            <SectionCard
                title="Client Workspace Snapshot"
                action={
                    <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                        {['All', 'Active', 'Inactive'].map((filter) => (
                            <button
                                key={filter}
                                type="button"
                                onClick={() => setClientStatusFilter(filter)}
                                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                                    clientStatusFilter === filter
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                }
            >
                <div className="overflow-x-auto">
                    {filteredClients.length ? (
                        <table className="min-w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                    <th className="px-4 py-3">Client</th>
                                    <th className="px-4 py-3">Active</th>
                                    <th className="px-4 py-3">Pending</th>
                                    <th className="px-4 py-3">Closed</th>
                                    <th className="px-4 py-3">Rejected</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClients.map((client, index) => {
                                    const clientKey = client.id || client._id || (client.name ? `${client.name}-${index}` : index);
                                    return (
                                        <tr
                                            key={clientKey}
                                            className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
                                            onClick={() => navigate(`/ta/hiring-requests/${encodeURIComponent(client.name)}`)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    navigate(`/ta/hiring-requests/${encodeURIComponent(client.name)}`);
                                                }
                                            }}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                                                        {getInitials(client.name)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-semibold text-slate-900">{client.name}</p>
                                                            {client.status === 'Inactive' && (
                                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 border border-slate-200">
                                                                    Inactive
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-slate-500">Talent Acquisition workspace</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-xs font-semibold text-slate-700">{client.activePositions || 0}</td>
                                            <td className="px-4 py-3.5 text-xs font-semibold text-slate-700">{client.pendingPositions || 0}</td>
                                            <td className="px-4 py-3.5 text-xs font-semibold text-slate-700">{client.closedPositions || 0}</td>
                                            <td className="px-4 py-3.5 text-xs font-semibold text-slate-700">{client.rejectedPositions || 0}</td>
                                            <td className="px-4 py-3.5 text-right relative">
                                                <div className="relative inline-block text-left client-menu-container">
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            if (openMenuClientId === clientKey) {
                                                                setOpenMenuClientId(null);
                                                            } else {
                                                                const rect = event.currentTarget.getBoundingClientRect();
                                                                setMenuPosition({
                                                                    top: rect.bottom + 4,
                                                                    left: Math.max(10, rect.right - 144)
                                                                });
                                                                setOpenMenuClientId(clientKey);
                                                            }
                                                        }}
                                                        disabled={statusUpdatingId === (client.id || client._id || client.name)}
                                                        className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                                                        title="Options"
                                                    >
                                                        <MoreVertical size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-[11px] text-slate-500">No {clientStatusFilter.toLowerCase()} clients found.</p>
                    )}
                </div>

                {openMenuClientId && typeof document !== 'undefined' && createPortal(
                    (() => {
                        const client = filteredClients.find(
                            (c, index) => (c.id || c._id || (c.name ? `${c.name}-${index}` : index)) === openMenuClientId
                        );
                        if (!client) return null;
                        return (
                            <div
                                className="client-menu-container fixed z-50 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-xl text-left text-xs font-medium text-slate-700"
                                style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setOpenMenuClientId(null);
                                        navigate(`/ta/hiring-requests/${encodeURIComponent(client.name)}`);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50 transition text-slate-700 font-semibold"
                                >
                                    <Eye size={13} className="text-slate-500" />
                                    <span>View</span>
                                </button>
                                {client.status === 'Inactive' ? (
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleToggleClientStatus(client, 'Active');
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-emerald-50 text-emerald-700 transition font-semibold"
                                    >
                                        <CheckCircle2 size={13} />
                                        <span>Mark as Active</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleToggleClientStatus(client, 'Inactive');
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-rose-50 text-rose-600 transition font-semibold"
                                    >
                                        <Ban size={13} />
                                        <span>Mark as Inactive</span>
                                    </button>
                                )}
                            </div>
                        );
                    })(),
                    document.body
                )}
            </SectionCard>
        </div>
    );

    const renderInterviews = () => (
        <SectionCard
            title="Interview Queue"
        >
            <div className="overflow-x-auto">
                {interviews.length ? (
                    <table className="min-w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 text-left text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                <th className="px-4 py-3">Candidate</th>
                                <th className="px-4 py-3">Applied For</th>
                                <th className="px-4 py-3">Round</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Scheduled</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {interviews.map((interview) => (
                                <tr key={`${interview.candidateId}-${interview.roundId}`} className="border-b border-slate-100 transition hover:bg-slate-50">
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                                                {getInitials(interview.candidateName)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">{interview.candidateName}</p>
                                                <p className="text-[11px] text-slate-500">{interview.status}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-xs text-slate-700">{interview.role}</td>
                                    <td className="px-4 py-3.5 text-xs text-slate-700">{interview.levelName}</td>
                                    <td className="px-4 py-3.5">
                                        <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${interviewStatusClasses[interview.status] || 'bg-slate-100 text-slate-700'}`}>
                                            {interview.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-[11px] text-slate-500">{formatShortDateTime(interview.scheduledDate)}</td>
                                    <td className="px-4 py-3.5 text-right">
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/ta/hiring-request/${interview.hiringRequestId}/candidate/${interview.candidateId}/view?phase=${interview.phase || 1}`)}
                                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-[11px] text-slate-500">You have no pending or scheduled interview rounds assigned right now.</p>
                )}
            </div>
        </SectionCard>
    );

    const renderCandidates = () => {
        const applyFilterState = (overrides = {}) => {
            setSearchPage(1);
            setAppliedFilters({
                search: overrides.search !== undefined ? overrides.search : candidateSearchText,
                sources: overrides.sources !== undefined ? overrides.sources : selectedSources,
                minExp: overrides.minExp !== undefined ? overrides.minExp : minExp,
                maxExp: overrides.maxExp !== undefined ? overrides.maxExp : maxExp,
                skills: overrides.skills !== undefined ? overrides.skills : searchSkills,
                client: overrides.client !== undefined ? overrides.client : searchClient,
                location: overrides.location !== undefined ? overrides.location : searchLocation,
                maxNoticePeriod: overrides.maxNoticePeriod !== undefined ? overrides.maxNoticePeriod : maxNoticePeriod,
                minCurrentCTC: overrides.minCurrentCTC !== undefined ? overrides.minCurrentCTC : minCurrentCTC,
                maxCurrentCTC: overrides.maxCurrentCTC !== undefined ? overrides.maxCurrentCTC : maxCurrentCTC,
                minExpectedCTC: overrides.minExpectedCTC !== undefined ? overrides.minExpectedCTC : minExpectedCTC,
                maxExpectedCTC: overrides.maxExpectedCTC !== undefined ? overrides.maxExpectedCTC : maxExpectedCTC,
                inHandOffer: overrides.inHandOffer !== undefined ? overrides.inHandOffer : searchInHandOffer,
                decision: overrides.decision !== undefined ? overrides.decision : searchDecision,
                publicAppReviewStatus: overrides.publicAppReviewStatus !== undefined ? overrides.publicAppReviewStatus : publicAppReviewStatus
            });
        };

        const handleSearchSubmit = (e) => {
            if (e) e.preventDefault();
            applyFilterState();
        };

        const handleKeyDownSubmit = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyFilterState();
            }
        };

        const handleResetFilters = () => {
            setCandidateSearchText('');
            setSelectedSources([]);
            setMinExp('');
            setMaxExp('');
            setSearchSkills([]);
            setSearchClient('');
            setSearchLocation('');
            setMaxNoticePeriod('');
            setMinCurrentCTC('');
            setMaxCurrentCTC('');
            setMinExpectedCTC('');
            setMaxExpectedCTC('');
            setSearchInHandOffer('');
            setSearchDecision('');
            setSkillsFilterText('');
            setPublicAppReviewStatus('');
            setSearchPage(1);
            setAppliedFilters({
                search: '',
                sources: [],
                minExp: '',
                maxExp: '',
                skills: [],
                client: '',
                location: '',
                maxNoticePeriod: '',
                minCurrentCTC: '',
                maxCurrentCTC: '',
                minExpectedCTC: '',
                maxExpectedCTC: '',
                inHandOffer: '',
                decision: '',
                publicAppReviewStatus: ''
            });
        };

        const toggleSource = (sourceName) => {
            setSelectedSources(prev =>
                prev.includes(sourceName)
                    ? prev.filter(s => s !== sourceName)
                    : [...prev, sourceName]
            );
        };

        const activeFiltersCount = [
            selectedSources.length > 0,
            minExp !== '',
            maxExp !== '',
            searchSkills.length > 0,
            searchClient.trim() !== '',
            searchLocation.trim() !== '',
            maxNoticePeriod !== '',
            minCurrentCTC !== '',
            maxCurrentCTC !== '',
            minExpectedCTC !== '',
            maxExpectedCTC !== '',
            searchInHandOffer !== '',
            searchDecision !== '',
            publicAppReviewStatus !== ''
        ].filter(Boolean).length;

        const isFilterActive = !!(
            appliedFilters.search?.trim() ||
            appliedFilters.sources?.length > 0 ||
            appliedFilters.minExp !== '' ||
            appliedFilters.maxExp !== '' ||
            appliedFilters.skills?.length > 0 ||
            appliedFilters.client?.trim() !== '' ||
            appliedFilters.location?.trim() !== '' ||
            appliedFilters.maxNoticePeriod !== '' ||
            appliedFilters.minCurrentCTC !== '' ||
            appliedFilters.maxCurrentCTC !== '' ||
            appliedFilters.minExpectedCTC !== '' ||
            appliedFilters.maxExpectedCTC !== '' ||
            appliedFilters.inHandOffer !== '' ||
            appliedFilters.decision !== '' ||
            appliedFilters.publicAppReviewStatus !== ''
        );

        return (
            <div className="space-y-6">
                {/* Search & Action Bar */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <form onSubmit={handleSearchSubmit}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={candidateSearchText}
                                    onChange={(e) => setCandidateSearchText(e.target.value)}
                                    onKeyDown={handleKeyDownSubmit}
                                    placeholder={showPublicApps ? 'Search public applications by name, email, phone or cover note...' : 'Search candidates by name, email, phone, location, company, skill or keyword...'}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-3">

                                <button
                                    type="button"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-sm transition ${showFilters || activeFiltersCount > 0
                                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    <SlidersHorizontal size={14} />
                                    <span>Filters</span>
                                    {activeFiltersCount > 0 && (
                                        <span className="ml-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                            {activeFiltersCount}
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
                                >
                                    Search
                                </button>
                                {(candidateSearchText || activeFiltersCount > 0) && (
                                    <button
                                        type="button"
                                        onClick={handleResetFilters}
                                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                    {/* Advanced Filters Panel */}
                    {showFilters && (
                        <div className="mt-4 border-t border-slate-100 pt-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                {/* Experience Range */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                        Experience (Years)
                                    </label>
                                    <div className="mt-2 flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={minExp}
                                            onChange={(e) => setMinExp(e.target.value)}
                                            onKeyDown={handleKeyDownSubmit}
                                            placeholder="Min"
                                            min="0"
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:bg-white"
                                        />
                                        <span className="text-slate-400 text-xs">to</span>
                                        <input
                                            type="number"
                                            value={maxExp}
                                            onChange={(e) => setMaxExp(e.target.value)}
                                            onKeyDown={handleKeyDownSubmit}
                                            placeholder="Max"
                                            min="0"
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:bg-white"
                                        />
                                    </div>
                                </div>

                                {/* Notice Period */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                        Max Notice Period (Days)
                                    </label>
                                    <input
                                        type="number"
                                        value={maxNoticePeriod}
                                        onChange={(e) => setMaxNoticePeriod(e.target.value)}
                                        onKeyDown={handleKeyDownSubmit}
                                        placeholder="e.g. 30"
                                        min="0"
                                        className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:bg-white"
                                    />
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                        Location (Current/Pref)
                                    </label>
                                    <input
                                        type="text"
                                        value={searchLocation}
                                        onChange={(e) => setSearchLocation(e.target.value)}
                                        onKeyDown={handleKeyDownSubmit}
                                        placeholder="e.g. Bangalore, Noida"
                                        className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:bg-white"
                                    />
                                </div>

                                {/* Client Filter */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                        Client Name
                                    </label>
                                    <input
                                        type="text"
                                        value={searchClient}
                                        onChange={(e) => setSearchClient(e.target.value)}
                                        onKeyDown={handleKeyDownSubmit}
                                        placeholder="e.g. Acme Corp"
                                        className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:bg-white"
                                    />
                                </div>

                                {/* Current CTC Range */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                        Current CTC (LPA)
                                    </label>
                                    <div className="mt-2 flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={minCurrentCTC}
                                            onChange={(e) => setMinCurrentCTC(e.target.value)}
                                            onKeyDown={handleKeyDownSubmit}
                                            placeholder="Min"
                                            min="0"
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:bg-white"
                                        />
                                        <span className="text-slate-400 text-xs">to</span>
                                        <input
                                            type="number"
                                            value={maxCurrentCTC}
                                            onChange={(e) => setMaxCurrentCTC(e.target.value)}
                                            onKeyDown={handleKeyDownSubmit}
                                            placeholder="Max"
                                            min="0"
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:bg-white"
                                        />
                                    </div>
                                </div>

                                {/* Expected CTC Range */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                        Expected CTC (LPA)
                                    </label>
                                    <div className="mt-2 flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={minExpectedCTC}
                                            onChange={(e) => setMinExpectedCTC(e.target.value)}
                                            onKeyDown={handleKeyDownSubmit}
                                            placeholder="Min"
                                            min="0"
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:bg-white"
                                        />
                                        <span className="text-slate-400 text-xs">to</span>
                                        <input
                                            type="number"
                                            value={maxExpectedCTC}
                                            onChange={(e) => setMaxExpectedCTC(e.target.value)}
                                            onKeyDown={handleKeyDownSubmit}
                                            placeholder="Max"
                                            min="0"
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:bg-white"
                                        />
                                    </div>
                                </div>

                                {/* Skills Search Autocomplete */}
                                <div className="relative">
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                        Skills (Select from Database)
                                    </label>
                                    <input
                                        type="text"
                                        value={skillsFilterText}
                                        onChange={(e) => setSkillsFilterText(e.target.value)}
                                        onKeyDown={handleKeyDownSubmit}
                                        placeholder="Type to search skills..."
                                        className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:bg-white"
                                    />
                                    {skillsFilterText.trim() && (
                                        <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                                            {availableSkills
                                                .filter(skill =>
                                                    skill.toLowerCase().includes(skillsFilterText.toLowerCase()) &&
                                                    !searchSkills.includes(skill)
                                                )
                                                .map(skill => (
                                                    <button
                                                        key={skill}
                                                        type="button"
                                                        onClick={() => {
                                                            const next = [...searchSkills, skill];
                                                            setSearchSkills(next);
                                                            setSkillsFilterText('');
                                                            applyFilterState({ skills: next });
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-100"
                                                    >
                                                        {skill}
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    )}
                                    {searchSkills.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {searchSkills.map(skill => (
                                                <span
                                                    key={skill}
                                                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-semibold text-blue-700"
                                                >
                                                    <span>{skill}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const next = searchSkills.filter(s => s !== skill);
                                                            setSearchSkills(next);
                                                            applyFilterState({ skills: next });
                                                        }}
                                                        className="text-blue-500 hover:text-blue-700 text-xs font-bold font-mono"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Hiring Status / Decision — only for regular candidates */}
                                {!showPublicApps && (
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                            Hiring Status
                                        </label>
                                        <select
                                            value={searchDecision}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setSearchDecision(val);
                                                applyFilterState({ decision: val });
                                            }}
                                            onKeyDown={handleKeyDownSubmit}
                                            className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                                        >
                                            <option value="">All Statuses</option>
                                            <option value="Shortlisted">Shortlisted</option>
                                            <option value="Profile Shared">Profile Shared</option>
                                            <option value="Rejected">Rejected</option>
                                            <option value="On Hold">On Hold</option>
                                            <option value="Did Not Turn Up">Did Not Turn Up</option>
                                            <option value="Offer Sent">Offer Sent</option>
                                            <option value="Offer Accepted">Offer Accepted</option>
                                            <option value="Joined">Joined</option>
                                            <option value="No Show">No Show</option>
                                        </select>
                                    </div>
                                )}

                                {/* Review Status — only for public applications */}
                                {showPublicApps && (
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                            Review Status
                                        </label>
                                        <select
                                            value={publicAppReviewStatus}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setPublicAppReviewStatus(val);
                                                applyFilterState({ publicAppReviewStatus: val });
                                            }}
                                            onKeyDown={handleKeyDownSubmit}
                                            className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                                        >
                                            <option value="">All Review Statuses</option>
                                            <option value="Pending Review">Pending Review</option>
                                            <option value="Shortlisted">Shortlisted</option>
                                            <option value="Rejected">Rejected</option>
                                            <option value="Transferred">Transferred to Pipeline</option>
                                        </select>
                                    </div>
                                )}

                                {/* In Hand Offer — only for regular candidates */}
                                {!showPublicApps && (
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                            Has In Hand Offer?
                                        </label>
                                        <select
                                            value={searchInHandOffer}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setSearchInHandOffer(val);
                                                applyFilterState({ inHandOffer: val });
                                            }}
                                            onKeyDown={handleKeyDownSubmit}
                                            className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                                        >
                                            <option value="">All Candidates</option>
                                            <option value="true">Yes</option>
                                            <option value="false">No</option>
                                        </select>
                                    </div>
                                )}

                                {/* Source Filter — only for regular candidates */}
                                {!showPublicApps && (
                                    <div className="md:col-span-2 lg:col-span-4">
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-2">
                                            Candidate Sources
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                'Public Application',
                                                'Consultancy',
                                                'Direct Upload',
                                                'indeed',
                                                'Internal Database',
                                                'Job Portal',
                                                'LinkedIn',
                                                'naukri',
                                                'Other',
                                                'Referral'

                                            ].map((sourceName) => {
                                                const isSelected = selectedSources.includes(sourceName);
                                                return (
                                                    <button
                                                        key={sourceName}
                                                        type="button"
                                                        onClick={() => {
                                                            const next = isSelected
                                                                ? selectedSources.filter(s => s !== sourceName)
                                                                : [...selectedSources, sourceName];
                                                            setSelectedSources(next);
                                                            applyFilterState({ sources: next });
                                                        }}
                                                        className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition border ${isSelected
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                                            }`}
                                                    >
                                                        {sourceName}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Reset Filters
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    )}
                    </form>
                </div>

                {/* Candidate Results / Public Applications Table */}
                <SectionCard
                    title={showPublicApps
                        ? `Public Applications (${publicAppPagination.count})`
                        : `All Candidates (${searchPagination.count})`
                    }
                    action={
                        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                            {showPublicApps
                                ? `Page ${publicAppPagination.currentPage} of ${publicAppPagination.totalPages}`
                                : `Page ${searchPagination.currentPage} of ${searchPagination.totalPages}`
                            }
                        </span>
                    }
                >
                    <div className="scrollbar-hide overflow-x-auto">
                        {isSearchLoading ? (
                            <div className="space-y-4 py-6">
                                <Skeleton className="h-10 w-full rounded-lg" />
                                <Skeleton className="h-10 w-full rounded-lg" />
                                <Skeleton className="h-10 w-full rounded-lg" />
                                <Skeleton className="h-10 w-full rounded-lg" />
                            </div>
                        ) : showPublicApps ? (
                            // ─── Public Applications Table ───────────────────────────────
                            publicAppResults.length > 0 ? (
                                <table className="min-w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-left text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                            <th className="px-4 py-3">Applicant</th>
                                            <th className="px-4 py-3">Contact</th>
                                            <th className="px-4 py-3">Applied For</th>
                                            <th className="px-4 py-3">Current CTC</th>
                                            <th className="px-4 py-3">Expected CTC</th>
                                            <th className="px-4 py-3">Notice (Days)</th>
                                            <th className="px-4 py-3">Review Status</th>
                                            <th className="px-4 py-3">Applied On</th>
                                            <th className="px-4 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {publicAppResults.map((app) => {
                                            const reviewStatusColors = {
                                                'Pending Review': 'bg-amber-50 text-amber-700 border-amber-200',
                                                'Shortlisted': 'bg-sky-50 text-sky-700 border-sky-200',
                                                'Rejected': 'bg-rose-50 text-rose-700 border-rose-200',
                                                'Transferred': 'bg-blue-50 text-blue-700 border-blue-200'
                                            };
                                            const statusStyle = reviewStatusColors[app.reviewStatus] || 'bg-slate-100 text-slate-600 border-slate-200';
                                            return (
                                                <tr key={app._id} className="border-b border-slate-100 transition hover:bg-slate-50">
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
                                                                {getInitials(app.candidateName)}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-900">{app.candidateName}</p>
                                                                {app.coverNote && (
                                                                    <p className="text-[10px] text-slate-400 max-w-[160px] truncate" title={app.coverNote}>
                                                                        {app.coverNote}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <p className="text-slate-700">{app.email}</p>
                                                        <p className="text-[10px] text-slate-400">{app.mobile}</p>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <p className="font-medium text-slate-800">
                                                            {app.hiringRequestId?.roleDetails?.title || '—'}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500">
                                                            {app.hiringRequestId?.clientConfidential
                                                                ? 'Confidential Client'
                                                                : app.hiringRequestId?.client || '—'}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-slate-700 font-medium">
                                                        {app.currentCTC != null ? `${app.currentCTC} LPA` : '—'}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-slate-700 font-medium">
                                                        {app.expectedCTC != null ? `${app.expectedCTC} LPA` : '—'}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-slate-700">
                                                        {app.noticePeriod != null ? `${app.noticePeriod}d` : '—'}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${statusStyle}`}>
                                                            {app.reviewStatus}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-[11px] text-slate-500">
                                                        {formatShortDate(app.createdAt)}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {app.resumeUrl && String(app.resumeUrl).startsWith('http') ? (
                                                                <a
                                                                    href={app.resumeUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                                                                    title="View/Download Resume"
                                                                >
                                                                    <FileText size={12} className="text-slate-500" />
                                                                    <span>Resume</span>
                                                                </a>
                                                            ) : null}
                                                            {app.hiringRequestId?._id && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => navigate(`/ta/view/${app.hiringRequestId._id}?tab=applications`)}
                                                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                                                                >
                                                                    View Req
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="py-8 text-center">
                                    <p className="text-sm font-semibold text-slate-800">No public applications found</p>
                                    <p className="mt-1 text-xs text-slate-500">Try adjusting your filters or check back later.</p>
                                </div>
                            )
                        ) : candidateResults.length > 0 ? (
                            // ─── Regular Candidates Table ─────────────────────────────────
                            <table className="min-w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 text-left text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                        <th className="px-4 py-3">Candidate</th>
                                        <th className="px-4 py-3">Exp</th>
                                        <th className="px-4 py-3">Source</th>
                                        <th className="px-4 py-3">Matched Skills</th>
                                        <th className="px-4 py-3">Requisition & Client</th>
                                        <th className="px-4 py-3">Sourced By</th>
                                        <th className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {candidateResults.map((candidate) => {
                                        const isFilterActive = activeFiltersCount > 0 || Boolean(candidateSearchText?.trim()) || Boolean(appliedFilters.search?.trim());
                                        const allSkills = [
                                            ...(candidate.mustHaveSkills || []).map(s => typeof s?.skill === 'object' ? s.skill?.name : s?.skill),
                                            ...(candidate.niceToHaveSkills || []).map(s => typeof s?.skill === 'object' ? s.skill?.name : s?.skill)
                                        ].filter(Boolean);

                                        return (
                                            <tr key={candidate._id} className="border-b border-slate-100 transition hover:bg-slate-50">
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                                                            {getInitials(candidate.candidateName)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-semibold text-slate-900">{candidate.candidateName}</p>
                                                                {candidate.confidenceRating !== undefined && candidate.confidenceRating !== null && (
                                                                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide border ${candidate.confidenceRating >= 75
                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                        : candidate.confidenceRating >= 50
                                                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                                                        }`}>
                                                                        {candidate.confidenceRating}% {isFilterActive ? 'Match' : 'Strength'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-slate-500">
                                                                {candidate.email || 'No email'} • {candidate.mobile || 'No mobile'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-xs text-slate-700 font-medium">
                                                    {candidate.totalExperience || 0} yrs
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                                        {candidate.source}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {allSkills.slice(0, 3).map((skill, index) => (
                                                            <span
                                                                key={`${skill}-${index}`}
                                                                className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 border border-blue-100"
                                                            >
                                                                {skill}
                                                            </span>
                                                        ))}
                                                        {allSkills.length > 3 && (
                                                            <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold text-slate-500">
                                                                +{allSkills.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <p className="font-medium text-slate-800">
                                                        {candidate.hiringRequestId?.roleDetails?.title || 'Direct Application'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500">
                                                        {candidate.hiringRequestId?.clientConfidential
                                                            ? 'Confidential Client'
                                                            : candidate.hiringRequestId?.client || 'General'}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <p className="font-medium text-slate-700">
                                                        {candidate.uploadedBy ? `${candidate.uploadedBy.firstName} ${candidate.uploadedBy.lastName}`.trim() : 'System'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {formatShortDate(candidate.createdAt)}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {candidate.resumeUrl && String(candidate.resumeUrl).startsWith('http') ? (
                                                            <a
                                                                href={candidate.resumeUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                                                                title="View/Download Resume"
                                                            >
                                                                <FileText size={12} className="text-slate-500" />
                                                                <span>Resume</span>
                                                            </a>
                                                        ) : (
                                                            <span
                                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-400 cursor-not-allowed line-through"
                                                                title="Resume not available"
                                                            >
                                                                <FileX size={12} className="text-slate-400" />
                                                                <span>Resume</span>
                                                            </span>
                                                        )}
                                                        {candidate.isPublicApplication ? (
                                                            candidate.hiringRequestId?._id && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => navigate(`/ta/view/${candidate.hiringRequestId._id}?tab=applications`)}
                                                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                                                                >
                                                                    View Req
                                                                </button>
                                                            )
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const hrId = candidate.hiringRequestId?._id || candidate.hiringRequestId;
                                                                    if (hrId) {
                                                                        window.open(`/ta/hiring-request/${hrId}/candidate/${candidate._id}/view`, '_blank');
                                                                    } else {
                                                                        console.error("No hiring request ID found for candidate view");
                                                                    }
                                                                }}
                                                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                                                            >
                                                                View
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="py-8 text-center">
                                <p className="text-sm font-semibold text-slate-800">No candidates found</p>
                                <p className="mt-1 text-xs text-slate-500">Try modifying your filters or search keywords.</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {(showPublicApps ? publicAppPagination.totalPages : searchPagination.totalPages) > 1 && (
                        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                            <span className="text-slate-500">
                                {showPublicApps
                                    ? `Showing ${((searchPage - 1) * 15) + 1} to ${Math.min(searchPage * 15, publicAppPagination.count)} of ${publicAppPagination.count} applications`
                                    : `Showing ${((searchPage - 1) * 15) + 1} to ${Math.min(searchPage * 15, searchPagination.count)} of ${searchPagination.count} candidates`
                                }
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={searchPage === 1 || isSearchLoading}
                                    onClick={() => setSearchPage(prev => Math.max(prev - 1, 1))}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    disabled={searchPage === (showPublicApps ? publicAppPagination.totalPages : searchPagination.totalPages) || isSearchLoading}
                                    onClick={() => setSearchPage(prev => Math.min(prev + 1, showPublicApps ? publicAppPagination.totalPages : searchPagination.totalPages))}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </SectionCard>
            </div>
        );
    };

    const renderApplications = () => (
        <div className="space-y-6">
            <PublicApplicationsView />
        </div>
    );

    return (
        <div className="font-ta-body min-h-screen bg-[#f4f5f7] p-4 sm:p-5 lg:p-6">
            {loading ? (
                <LoadingDashboard />
            ) : (
                <div className="space-y-5">
                    <section className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="font-ta-head text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                                Talent Acquisition Dashboard
                            </h1>
                            <p className="mt-1 text-[10px] text-slate-500">
                                Requisitions, clients, interviews, candidates, and applications in one workspace.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => loadDashboard({ silent: true })}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
                        >
                            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </section>

                    {error ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] font-medium text-rose-700">
                            {error}
                        </div>
                    ) : null}

                    {canViewAnalytics && activeTab === 'overview' && renderOverview()}
                    {activeTab === 'requisitions' && renderRequisitions()}
                    {activeTab === 'clients' && renderClients()}
                    {activeTab === 'interviews' && renderInterviews()}
                    {activeTab === 'candidates' && renderCandidates()}
                    {activeTab === 'applications' && renderApplications()}
                </div>
            )}
        </div>
    );
};

export default TalentAcquisitionDashboard;
