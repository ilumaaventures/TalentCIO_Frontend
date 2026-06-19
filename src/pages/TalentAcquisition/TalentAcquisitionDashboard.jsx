import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    RefreshCw,
    Target,
    Users,
    Search,
    SlidersHorizontal,
    Filter
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
import api from '../../api/axios';
import Skeleton from '../../components/Skeleton';
import {
    createNoCacheRequestConfig,
    readTAClientsCache,
    refreshTAClientsCache
} from '../../utils/taCache';
import { useAuth } from '../../context/AuthContext';

const requestStatusClasses = {
    Draft: 'bg-slate-100 text-slate-600 border-slate-200',
    Submitted: 'bg-blue-50 text-blue-700 border-blue-200',
    Pending_L1: 'bg-amber-50 text-amber-700 border-amber-200',
    Pending_Final: 'bg-purple-50 text-purple-700 border-purple-200',
    Pending_Approval: 'bg-amber-50 text-amber-700 border-amber-200',
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
    Rescheduled: 'bg-violet-50 text-violet-700'
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
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'TA';

const StatCard = ({ label, value, tone, meta, icon }) => {
    const IconComponent = icon;

    return (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`absolute inset-x-0 top-0 h-1 ${tone}`} />
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                    <p className="font-ta-head mt-2 text-[1.8rem] font-bold tracking-tight text-slate-950">{value}</p>
                    <p className="mt-1.5 text-[11px] text-slate-500">{meta}</p>
                </div>
                <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
                    <IconComponent size={16} />
                </div>
            </div>
        </div>
    );
};

const primaryStatThemes = {
    blue: {
        accent: 'bg-blue-600',
        surface: 'from-blue-50 via-white to-white',
        icon: 'bg-blue-100 text-blue-700',
        meta: 'text-blue-700/75'
    },
    emerald: {
        accent: 'bg-emerald-600',
        surface: 'from-emerald-50 via-white to-white',
        icon: 'bg-emerald-100 text-emerald-700',
        meta: 'text-emerald-700/75'
    },
    amber: {
        accent: 'bg-amber-500',
        surface: 'from-amber-50 via-white to-white',
        icon: 'bg-amber-100 text-amber-700',
        meta: 'text-amber-700/75'
    },
    violet: {
        accent: 'bg-violet-600',
        surface: 'from-violet-50 via-white to-white',
        icon: 'bg-violet-100 text-violet-700',
        meta: 'text-violet-700/75'
    }
};

const PrimaryStatCard = ({ label, value, meta, icon, theme = 'blue' }) => {
    const IconComponent = icon;
    const styles = primaryStatThemes[theme] || primaryStatThemes.blue;

    return (
        <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${styles.surface} p-4 shadow-sm`}>
            <div className={`absolute inset-x-0 top-0 h-1.5 ${styles.accent}`} />
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-500">{label}</p>
                    <p className="font-ta-head mt-3 text-[1.95rem] font-black tracking-tight text-slate-950 sm:text-[2.1rem]">{value}</p>
                    <p className={`mt-1.5 text-[11px] font-semibold ${styles.meta}`}>{meta}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${styles.icon}`}>
                    <IconComponent size={16} />
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
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className={`mb-2.5 h-1.5 w-12 rounded-full ${styles.accent}`} />
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                    <p className="font-ta-head mt-1.5 text-[1.55rem] font-black tracking-tight text-slate-950">{value}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{meta}</p>
                </div>
                <div className={`rounded-xl p-2 ${styles.icon}`}>
                    <IconComponent size={15} />
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${trendTone}`}>
                    <span>{trendArrow}</span>
                    <span>{trend?.delta ?? 0}%</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Vs previous month</span>
            </div>
        </div>
    );
};

const SectionCard = ({ title, action, children }) => (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="font-ta-head text-sm font-bold text-slate-900">{title}</h3>
            {action}
        </div>
        <div className="p-4">{children}</div>
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

    // Applied states used for search execution
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
                    decision: parsed.decision ?? ''
                };
            }
        } catch (e) {
            console.error(e);
        }
        return {
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
            decision: ''
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
            appliedFilters
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
        appliedFilters
    ]);

    const canViewAnalytics = useMemo(() => (
        user?.roles?.includes('Admin') ||
        user?.permissions?.includes('ta.analytics.global') ||
        user?.permissions?.includes('ta.analytics.assigned') ||
        user?.permissions?.includes('*') ||
        user?.isTAAnalyticsViewer
    ), [user]);

    const availableTabs = useMemo(() => (
        canViewAnalytics
            ? ['overview', 'requisitions', 'clients', 'interviews', 'candidates']
            : ['requisitions', 'clients', 'interviews', 'candidates']
    ), [canViewAnalytics]);

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
    }, [searchPage, appliedFilters]);

    useEffect(() => {
        if (activeTab === 'candidates') {
            void fetchGlobalCandidates();
        }
    }, [activeTab, searchPage, appliedFilters, fetchGlobalCandidates]);

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
    const topClients = useMemo(() => clients.slice(0, 8), [clients]);
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
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {primaryStatCards.map((card) => <PrimaryStatCard key={card.label} {...card} />)}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {overviewTrendCards.map((card) => <TrendMetricCard key={card.label} {...card} />)}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                <SectionCard
                    title="Hiring Momentum"
                    action={<span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Last sourced trend</span>}
                >
                    {trendData.length ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="taTrendFill" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor="#1A56DB" stopOpacity={0.28} />
                                            <stop offset="100%" stopColor="#1A56DB" stopOpacity={0.04} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} />
                                    <YAxis tickLine={false} axisLine={false} fontSize={10} width={28} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="sourced" stroke="#1A56DB" strokeWidth={3} fill="url(#taTrendFill)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-[11px] text-slate-500">Not enough trend data yet.</p>
                    )}
                </SectionCard>

                <SectionCard
                    title="Source Breakdown"
                    action={<Link to="/ta/analysis" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">Open full analysis</Link>}
                >
                    <div className="space-y-4">
                        {overviewSourceAnalysis.length ? overviewSourceAnalysis.map((item) => (
                            <div key={item.name}>
                                <div className="mb-2 flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-slate-700">{item.name}</span>
                                    <span className="text-slate-500">{formatCompact(item.sourced || 0)}</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full bg-blue-600"
                                        style={{ width: `${Math.max(8, ((item.sourced || 0) / maxSourceValue) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )) : (
                            <p className="text-[11px] text-slate-500">No source data available yet.</p>
                        )}
                    </div>
                </SectionCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <SectionCard
                    title="Recent Requisitions"
                    action={<Link to="/ta?tab=clients" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">Open client workspace</Link>}
                >
                    <div className="scrollbar-hide overflow-x-auto">
                        {recentRequests.length ? (
                            <table className="min-w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 text-left text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                        <th className="px-4 py-3">Requisition</th>
                                        <th className="px-4 py-3">Client</th>
                                        <th className="px-4 py-3">Department</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Applied</th>
                                        <th className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentRequests.map((request) => (
                                        <tr key={request._id} className="border-b border-slate-100 transition hover:bg-slate-50">
                                            <td className="px-4 py-3.5">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-900">{request.roleDetails?.title}</p>
                                                    <p className="text-[11px] text-slate-500">{request.requestId}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-xs text-slate-700">{request.client}</td>
                                            <td className="px-4 py-3.5 text-xs text-slate-700">{request.roleDetails?.department || 'General'}</td>
                                            <td className="px-4 py-3.5">
                                                <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ${requestStatusClasses[request.status] || requestStatusClasses.Draft}`}>
                                                    {String(request.status || 'Draft').replaceAll('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-[11px] text-slate-500">{formatRelativeTimestamp(request.createdAt)}</td>
                                            <td className="px-4 py-3.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/ta/view/${request._id}${request.status === 'Approved' || request.status === 'Closed' ? '?tab=applications' : ''}`)}
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
                            <p className="text-[11px] text-slate-500">No requisitions found for this workspace yet.</p>
                        )}
                    </div>
                </SectionCard>

                <SectionCard
                    title="Top Sourcers"
                    action={<Link to="/ta/analysis" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">Open analytics</Link>}
                >
                    <div className="space-y-4">
                        {sourcingPerformance.length ? sourcingPerformance.map((member, index) => (
                            <div key={member.name} className="flex items-center justify-between rounded-[1.35rem] bg-slate-50 px-4 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-[13px] font-black text-white">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-bold text-slate-900 sm:text-[14px]">{member.name}</p>
                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                            {member.sourced} sourced / {member.joined} joined
                                        </p>
                                    </div>
                                </div>
                                <span className="font-ta-head text-[1.8rem] font-black tracking-tight text-slate-950">
                                    {member.conversion}%
                                </span>
                            </div>
                        )) : (
                            <p className="text-[11px] text-slate-500">Sourcing conversion data is not available yet.</p>
                        )}
                    </div>
                </SectionCard>
            </div>
        </div>
    );

    const renderRequisitions = () => (
        <SectionCard
            title="Requisition Command View"
            action={<Link to="/ta/create-request" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">Create new requisition</Link>}
        >
            <div className="mb-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3.5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Approved</p>
                    <p className="font-ta-head mt-2 text-xl font-bold text-slate-950">{approvedRequestsCount}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Pending Review</p>
                    <p className="font-ta-head mt-2 text-xl font-bold text-slate-950">{pendingRequestsCount}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Closed</p>
                    <p className="font-ta-head mt-2 text-xl font-bold text-slate-950">{requests.filter((item) => item.status === 'Closed').length}</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                    <thead>
                        <tr className="border-b border-slate-200 text-left text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                            <th className="px-4 py-3">Request</th>
                            <th className="px-4 py-3">Client</th>
                            <th className="px-4 py-3">Department</th>
                            <th className="px-4 py-3">Created</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((request) => (
                            <tr
                                key={request._id}
                                className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
                                onClick={() => navigate(`/ta/view/${request._id}${request.status === 'Approved' || request.status === 'Closed' ? '?tab=applications' : ''}`)}
                            >
                                <td className="px-4 py-3.5">
                                    <p className="font-semibold text-slate-900">{request.requestId}</p>
                                    <p className="text-[11px] text-slate-500">{request.roleDetails?.title}</p>
                                </td>
                                <td className="px-4 py-3.5 text-xs text-slate-600">{request.client}</td>
                                <td className="px-4 py-3.5 text-xs text-slate-600">{request.roleDetails?.department}</td>
                                <td className="px-4 py-3.5 text-xs text-slate-600">{formatShortDate(request.createdAt)}</td>
                                <td className="px-4 py-3.5">
                                    <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ${requestStatusClasses[request.status] || requestStatusClasses.Draft}`}>
                                        {String(request.status || 'Draft').replaceAll('_', ' ')}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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

            <SectionCard title="Client Workspace Snapshot">
                <div className="overflow-x-auto">
                    {topClients.length ? (
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
                                {topClients.map((client) => (
                                    <tr
                                        key={client.name}
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
                                                    <p className="font-semibold text-slate-900">{client.name}</p>
                                                    <p className="text-[11px] text-slate-500">Talent Acquisition workspace</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-700">{client.activePositions || 0}</td>
                                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-700">{client.pendingPositions || 0}</td>
                                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-700">{client.closedPositions || 0}</td>
                                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-700">{client.rejectedPositions || 0}</td>
                                        <td className="px-4 py-3.5 text-right">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    navigate(`/ta/hiring-requests/${encodeURIComponent(client.name)}`);
                                                }}
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
                        <p className="text-[11px] text-slate-500">Client-level TA summaries will appear here once requisitions are created.</p>
                    )}
                </div>
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
        const handleSearchSubmit = (e) => {
            if (e) e.preventDefault();
            setSearchPage(1);
            setAppliedFilters({
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
                decision: searchDecision
            });
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
                decision: ''
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
            searchDecision !== ''
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
            appliedFilters.decision !== ''
        );

        return (
            <div className="space-y-6">
                {/* Search & Action Bar */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={candidateSearchText}
                                onChange={(e) => setCandidateSearchText(e.target.value)}
                                placeholder="Search candidates by name, email, phone, location or company..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setShowFilters(!showFilters)}
                                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-sm transition ${
                                    showFilters || activeFiltersCount > 0
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
                    </form>

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
                                            placeholder="Min"
                                            min="0"
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:bg-white"
                                        />
                                        <span className="text-slate-400 text-xs">to</span>
                                        <input
                                            type="number"
                                            value={maxExp}
                                            onChange={(e) => setMaxExp(e.target.value)}
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
                                            placeholder="Min"
                                            min="0"
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:bg-white"
                                        />
                                        <span className="text-slate-400 text-xs">to</span>
                                        <input
                                            type="number"
                                            value={maxCurrentCTC}
                                            onChange={(e) => setMaxCurrentCTC(e.target.value)}
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
                                            placeholder="Min"
                                            min="0"
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:bg-white"
                                        />
                                        <span className="text-slate-400 text-xs">to</span>
                                        <input
                                            type="number"
                                            value={maxExpectedCTC}
                                            onChange={(e) => setMaxExpectedCTC(e.target.value)}
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
                                                            setSearchSkills(prev => [...prev, skill]);
                                                            setSkillsFilterText('');
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
                                                        onClick={() => setSearchSkills(prev => prev.filter(s => s !== skill))}
                                                        className="text-blue-500 hover:text-blue-700 text-xs font-bold font-mono"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Hiring Status / Decision */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                        Hiring Status
                                    </label>
                                    <select
                                        value={searchDecision}
                                        onChange={(e) => setSearchDecision(e.target.value)}
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

                                {/* In Hand Offer */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                        Has In Hand Offer?
                                    </label>
                                    <select
                                        value={searchInHandOffer}
                                        onChange={(e) => setSearchInHandOffer(e.target.value)}
                                        className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                                    >
                                        <option value="">All Candidates</option>
                                        <option value="true">Yes</option>
                                        <option value="false">No</option>
                                    </select>
                                </div>

                                {/* Source Filter */}
                                <div className="md:col-span-2 lg:col-span-4">
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-2">
                                        Candidate Sources
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {availableSources.map((sourceName) => {
                                            const isSelected = selectedSources.includes(sourceName);
                                            return (
                                                <button
                                                    key={sourceName}
                                                    type="button"
                                                    onClick={() => toggleSource(sourceName)}
                                                    className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition border ${
                                                        isSelected
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
                                    type="button"
                                    onClick={handleSearchSubmit}
                                    className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Candidate Results Table */}
                <SectionCard
                    title={`All Candidates (${searchPagination.count})`}
                    action={
                        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                            Page {searchPagination.currentPage} of {searchPagination.totalPages}
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
                        ) : candidateResults.length > 0 ? (
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
                                        const allSkills = [
                                            ...(candidate.mustHaveSkills || []).map(s => s.skill),
                                            ...(candidate.niceToHaveSkills || []).map(s => s.skill)
                                        ];

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
                                                                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide border ${
                                                                        candidate.confidenceRating >= 75
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
                    {searchPagination.totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                            <span className="text-slate-500">
                                Showing {((searchPage - 1) * 15) + 1} to {Math.min(searchPage * 15, searchPagination.count)} of {searchPagination.count} candidates
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
                                    disabled={searchPage === searchPagination.totalPages || isSearchLoading}
                                    onClick={() => setSearchPage(prev => Math.min(prev + 1, searchPagination.totalPages))}
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

    return (
        <div className="font-ta-body min-h-screen bg-[#f4f5f7] p-4 sm:p-5 lg:p-6">
            {loading ? (
                <LoadingDashboard />
            ) : (
                <div className="space-y-5">
                    <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="font-ta-head text-xl font-bold tracking-tight text-slate-950 sm:text-[1.7rem]">
                                Talent Acquisition Dashboard
                            </h1>
                            <p className="mt-1.5 text-[11px] text-slate-500">
                                {canViewAnalytics
                                    ? 'Requisitions, clients, interviews, and hiring insights in one workspace.'
                                    : 'Requisitions, clients, and interviews in one workspace.'}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => loadDashboard({ silent: true })}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
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

                    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="font-ta-head text-lg font-bold text-slate-950">Need the detailed TA workspaces too?</p>
                                <p className="mt-1 text-[11px] text-slate-500">
                                    The full requisition pages, candidate boards, client lanes, and analytics views are still available.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Link to="/ta/clients" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50">
                                    Clients
                                    <ArrowRight size={14} />
                                </Link>
                                {canViewAnalytics && (
                                    <Link to="/ta/analysis" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50">
                                        Analytics
                                        <ArrowRight size={14} />
                                    </Link>
                                )}
                                <Link to="/ta/workflows" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50">
                                    Workflows
                                    <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};

export default TalentAcquisitionDashboard;
