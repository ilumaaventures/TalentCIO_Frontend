import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowRight,
    BriefcaseBusiness,
    Building2,
    CheckCircle2,
    Clock3,
    RefreshCw,
    Target,
    Users
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
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

const pipelineTones = ['bg-blue-600', 'bg-emerald-600', 'bg-amber-500', 'bg-violet-600', 'bg-rose-600', 'bg-slate-700'];
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

    const canViewAnalytics = useMemo(() => (
        user?.roles?.includes('Admin') ||
        user?.permissions?.includes('ta.analytics.global') ||
        user?.isTAAnalyticsViewer
    ), [user]);

    const availableTabs = useMemo(() => (
        canViewAnalytics
            ? ['overview', 'requisitions', 'clients', 'interviews', 'analytics']
            : ['requisitions', 'clients', 'interviews']
    ), [canViewAnalytics]);

    const activeTab = useMemo(() => {
        const currentTab = searchParams.get('tab');
        return availableTabs.includes(currentTab) ? currentTab : availableTabs[0];
    }, [availableTabs, searchParams]);

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
    const recruiterPerformance = useMemo(() => (analytics?.recruiterPerformance || []).slice(0, 5), [analytics]);
    const departmentAnalysis = useMemo(() => (analytics?.departmentAnalysis || []).slice(0, 5), [analytics]);
    const pipeline = useMemo(() => analytics?.pipelineDistribution || [], [analytics]);
    const sourceAnalysis = useMemo(
        () => (analytics?.sourceAnalysis || []).map((item) => ({
            ...item,
            name: item.name === 'Public Job Board' ? 'Public Applications' : item.name
        })),
        [analytics]
    );
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

    const statCards = useMemo(() => ([
        {
            label: 'Open Requisitions',
            value: formatCompact(topMetrics.totalReqs || approvedRequestsCount),
            meta: `${pendingRequestsCount} waiting for review`,
            tone: 'bg-blue-600',
            icon: BriefcaseBusiness
        },
        {
            label: 'Candidates Sourced',
            value: formatCompact(topMetrics.totalSourced),
            meta: `${formatCompact(topMetrics.interviewsScheduled)} moved into interview flow`,
            tone: 'bg-emerald-600',
            icon: Users
        },
        {
            label: 'Offers Released',
            value: formatCompact(topMetrics.offersReleased),
            meta: `${topMetrics.offerAcceptanceRate || 0}% acceptance trend`,
            tone: 'bg-amber-500',
            icon: Target
        },
        {
            label: 'Joined',
            value: formatCompact(topMetrics.totalJoined),
            meta: `${topMetrics.avgTimeToHire || 0} days avg. to hire`,
            tone: 'bg-violet-600',
            icon: CheckCircle2
        }
    ]), [approvedRequestsCount, pendingRequestsCount, topMetrics]);

    const renderOverview = () => (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {statCards.map((card) => <StatCard key={card.label} {...card} />)}
            </div>

            <div className="grid gap-4 xl:grid-cols-6">
                {pipeline.length ? pipeline.map((stage, index) => (
                    <div key={stage.name} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                        <div className={`mb-3 h-1.5 w-12 rounded-full ${pipelineTones[index % pipelineTones.length]}`} />
                        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">{stage.name}</p>
                        <p className="font-ta-head mt-1.5 text-[1.55rem] font-bold text-slate-950">{formatCompact(stage.value)}</p>
                    </div>
                )) : (
                    <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white px-5 py-6 text-[11px] text-slate-500">
                        Pipeline metrics will appear here once sourcing and interviews pick up.
                    </div>
                )}
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
                    action={<Link to="/ta/clients" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">Open client workspace</Link>}
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
                    title="Upcoming Interviews"
                    action={<span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">{interviews.length} assigned</span>}
                >
                    <div className="scrollbar-hide overflow-x-auto">
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
                                    {interviews.slice(0, 8).map((interview) => (
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
                            <p className="text-[11px] text-slate-500">No scheduled interviews are assigned to you right now.</p>
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
                                    <tr key={client.name} className="border-b border-slate-100 transition hover:bg-slate-50">
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
                                                onClick={() => navigate(`/ta/hiring-requests/${encodeURIComponent(client.name)}`)}
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
            action={<Link to="/ta/workflows" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">Manage interview workflows</Link>}
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

    const renderAnalytics = () => (
        <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
                <SectionCard
                    title="Department Performance"
                    action={<Link to="/ta/analysis" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">Open advanced dashboard</Link>}
                >
                    {departmentAnalysis.length ? (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={departmentAnalysis}>
                                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} />
                                    <YAxis tickLine={false} axisLine={false} fontSize={10} width={26} />
                                    <Tooltip />
                                    <Bar dataKey="sourced" fill="#1A56DB" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="joined" fill="#0EA66E" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-[11px] text-slate-500">Department analytics will appear after candidate activity builds up.</p>
                    )}
                </SectionCard>

                <SectionCard title="Top Recruiters">
                    <div className="space-y-3">
                        {recruiterPerformance.length ? recruiterPerformance.map((recruiter, index) => (
                            <div key={recruiter.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-900 text-[11px] font-bold text-white">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">{recruiter.name}</p>
                                        <p className="text-[11px] text-slate-500">{recruiter.sourced} sourced / {recruiter.joined} joined</p>
                                    </div>
                                </div>
                                <span className="font-ta-head text-lg font-bold text-slate-950">{recruiter.conversion}%</span>
                            </div>
                        )) : (
                            <p className="text-[11px] text-slate-500">Recruiter conversion data is not available yet.</p>
                        )}
                    </div>
                </SectionCard>
            </div>
        </div>
    );

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
                                    ? 'Requisitions, clients, interviews, and analytics in one workspace.'
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
                    {canViewAnalytics && activeTab === 'analytics' && renderAnalytics()}

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
