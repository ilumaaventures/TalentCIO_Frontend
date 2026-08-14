import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import api from '@/lib/apiClient';
import Skeleton from '@/components/ui/Skeleton';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Clock, Calendar, UserCheck, UserX, AlertCircle, ArrowUpRight, MapPin, ChevronLeft, ChevronRight, X, Megaphone, Pin } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { createCachePayload, isCacheFresh, readSessionCache } from '@/lib/cache';
import { motion } from 'framer-motion';

// Simple global cache for location lookups to avoid redundant API hits across polls
const locationCache = {};
const DASHBOARD_CACHE_TTL_MS = 15 * 1000;
const MotionDiv = motion.div;
const TODAY_DATE_STRING = format(new Date(), 'yyyy-MM-dd');

const LocationLink = ({ location }) => {
    const hasCoords = location?.lat != null && location?.lng != null;
    const coordsKey = hasCoords ? `${location.lat},${location.lng}` : null;
    const [cityName, setCityName] = useState(() => (
        coordsKey && locationCache[coordsKey] ? locationCache[coordsKey] : (location?.name || location?.address || '...')
    ));

    useEffect(() => {
        if (!coordsKey) return;
        if (locationCache[coordsKey]) return;

        let isMounted = true;
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=10`)
            .then(res => res.json())
            .then(data => {
                if (!isMounted) return;
                const city = data.address?.city || data.address?.town || data.address?.village || data.address?.suburb || location.name || 'Location';
                locationCache[coordsKey] = city;
                setCityName(city);
            })
            .catch(() => {
                if (isMounted) setCityName(location.name || 'Location');
            });

        return () => { isMounted = false; };
    }, [coordsKey, location.lat, location.lng, location.name]);

    if (!location) return <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">Unknown</span>;

    if (!hasCoords) {
        const textDisplay = location.name || location.address || (typeof location === 'string' ? location : null);
        if (textDisplay) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-tight" title={textDisplay}>
                    <MapPin size={10} className="shrink-0" />
                    <span className="truncate max-w-[90px]">{textDisplay}</span>
                </span>
            );
        }
        return <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">Unknown</span>;
    }

    return (
        <a
            href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50/50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-tight hover:bg-blue-100 transition-all group"
            title={cityName}
        >
            <MapPin size={10} className="shrink-0" />
            <span className="truncate max-w-[80px]">{cityName}</span>
        </a>
    );
};

const Dashboard = () => {
    const { user, hasModule } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [projects, setProjects] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [recentActivityMeta, setRecentActivityMeta] = useState({ total: 0, hasMore: false, limit: 10 });
    const [selectedTypeTab, setSelectedTypeTab] = useState('all');
    const [loading, setLoading] = useState(true);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
    const [attendanceModalDate, setAttendanceModalDate] = useState(() => TODAY_DATE_STRING);
    const [attendanceModalRecords, setAttendanceModalRecords] = useState([]);
    const [attendanceModalMeta, setAttendanceModalMeta] = useState({ total: 0, date: TODAY_DATE_STRING });
    const [attendanceModalLoading, setAttendanceModalLoading] = useState(false);
    const [featuredAnnouncements, setFeaturedAnnouncements] = useState([]);
    const [announcementsLoading, setAnnouncementsLoading] = useState(true);

    const attendanceSettings = user?.company?.settings?.attendance || {};
    const showLeavesModule = user?.company?.enabledModules?.includes('leaves');
    const showProjectModule = hasModule('projects');
    const showLocation = attendanceSettings.requireLocationCheckIn || 
                       attendanceSettings.requireLocationCheckOut || 
                       attendanceSettings.locationCheck ||
                       recentActivity.some(r => !!r.location);

    const availableEmploymentTypes = useMemo(() => {
        return Array.from(
            new Set(
                recentActivity
                    .map((r) => r.user?.employmentType)
                    .filter(Boolean)
            )
        );
    }, [recentActivity]);

    const filteredRecentActivity = useMemo(() => {
        if (selectedTypeTab === 'all') {
            return recentActivity.filter((r) => r.user?.isTotalWorkforce !== false);
        }
        return recentActivity.filter(
            (r) => (r.user?.employmentType || '').toLowerCase() === selectedTypeTab.toLowerCase()
        );
    }, [recentActivity, selectedTypeTab]);

    useEffect(() => {
        const attendanceLimit = '10';
        // Cache key: date-scoped so it auto-invalidates at midnight
        const CACHE_KEY = `dashboard_${new Date().toISOString().slice(0, 10)}_${attendanceLimit}`;

        const readCache = () => {
            const parsed = readSessionCache(CACHE_KEY);
            const data = parsed?.data || parsed;
            if (!data || !data.stats) {
                sessionStorage.removeItem(CACHE_KEY);
                return null;
            }
            return parsed;
        };


        const writeCache = (data, fingerprint) => {
            try {
                // Minimal data for caching
                const minimalActivity = (data.recentActivity || []).map(r => ({
                    id: r.id,
                    user: r.user ? { name: r.user.name, role: r.user.role, employmentType: r.user.employmentType, isTotalWorkforce: r.user.isTotalWorkforce } : null,
                    time: r.time,
                    attendanceMode: r.attendanceMode,
                    status: r.status,
                    location: r.location
                }));

                const minimalProjects = (data.projects || []).map(p => ({
                    _id: p._id,
                    name: p.name,
                    status: p.status,
                    deadline: p.deadline
                }));

                const minimalLeavesToday = (data.leavesToday || []).map(leave => ({
                    _id: leave._id,
                    user: leave.user ? {
                        name: leave.user.name,
                        role: leave.user.role,
                        employmentType: leave.user.employmentType
                    } : null,
                    leaveType: leave.leaveType,
                    startDate: leave.startDate,
                    endDate: leave.endDate,
                    daysCount: leave.daysCount,
                    isHalfDay: leave.isHalfDay,
                    halfDaySession: leave.halfDaySession,
                    status: leave.status
                }));

                const payload = createCachePayload({
                    stats: data.stats,
                    recentActivity: minimalActivity,
                    recentActivityMeta: data.recentActivityMeta || { total: minimalActivity.length, hasMore: false, limit: 10 },
                    projects: minimalProjects,
                    leavesToday: minimalLeavesToday
                }, fingerprint);

                sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
            } catch {
                // sessionStorage unavailable or full — silently skip
            }
        };

        // Lightweight fingerprint: tracks every attendance record's
        // id + status + clockIn so any change (new clock-in, status update) is detected
        const buildFingerprint = (data) => {
            const payload = data?.data || data;
            if (!payload) return '';
            const activityPart = payload.recentActivity?.map(r => `${r.id}:${r.status}:${r.attendanceMode ?? ''}:${r.time ?? ''}:${r.user?.isTotalWorkforce ?? ''}`).join('|') || '';
            const statsPart = `${payload.stats?.totalEmployees || 0}:${payload.stats?.presentToday || 0}:${payload.stats?.leaveToday || 0}:${payload.stats?.pendingLeaveRequests || 0}`;
            const projPart = payload.projects?.length || 0;
            const leavePart = payload.leavesToday?.map(leave => `${leave._id}:${leave.leaveType}:${leave.startDate}:${leave.endDate}`).join('|') || '';
            return `${activityPart}#${statsPart}#${projPart}#${leavePart}`;
        };

        const applyData = (payload) => {
            if (!payload?.stats) return;
            setStats(payload.stats);
            setRecentActivity(payload.recentActivity || []);
            setRecentActivityMeta(payload.recentActivityMeta || { total: payload.recentActivity?.length || 0, hasMore: false, limit: 10 });
            setProjects(payload.projects || []);
        };

        const fetchDashboardData = async (skipCache = false) => {
            const cached = skipCache ? null : readCache();

            // 1. Show cached data instantly on first mount (no loading delay)
            if (!skipCache && cached) {
                applyData(cached.data || cached);
                setLoading(false);
                if (isCacheFresh(cached, DASHBOARD_CACHE_TTL_MS)) return;
            }


            // 2. Always fetch fresh data in background
            try {
                setAttendanceLoading(true);
                const res = await api.get(`/dashboard?attendanceLimit=${attendanceLimit}`);
                const payload = res.data;
                if (!payload?.stats) return;

                const freshFingerprint = buildFingerprint(payload);
                const cachedFingerprint = cached?.fingerprint ?? (readCache()?.fingerprint || '');

                if (freshFingerprint !== cachedFingerprint) {
                    // Data changed — update UI and overwrite cache
                    applyData(payload);
                    writeCache(payload, freshFingerprint);
                } else {
                    // Data unchanged — only refresh the cache entry (keep UI stable)
                    writeCache(payload, freshFingerprint);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setAttendanceLoading(false);
                setLoading(false);
            }
        };

        // Initial fetch
        fetchDashboardData();

        // 3. Update when tab becomes active / focused
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchDashboardData(true);
            }
        };
        const handleFocus = () => fetchDashboardData(true);

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    useEffect(() => {
        if (!attendanceModalOpen) return;

        const fetchAttendanceForDate = async () => {
            try {
                setAttendanceModalLoading(true);
                const res = await api.get(`/dashboard?attendanceLimit=all&attendanceDate=${attendanceModalDate}`);
                setAttendanceModalRecords(res.data?.recentActivity || []);
                setAttendanceModalMeta(res.data?.recentActivityMeta || { total: 0, date: attendanceModalDate });
            } catch (error) {
                console.error('Failed to fetch attendance for selected date', error);
                setAttendanceModalRecords([]);
                setAttendanceModalMeta({ total: 0, date: attendanceModalDate });
            } finally {
                setAttendanceModalLoading(false);
            }
        };

        fetchAttendanceForDate();
    }, [attendanceModalDate, attendanceModalOpen]);

    useEffect(() => {
        let isMounted = true;

        const fetchFeaturedAnnouncements = async () => {
            try {
                setAnnouncementsLoading(true);
                const response = await api.get(`/announcements?featured=true&limit=3&_t=${Date.now()}`);
                if (!isMounted) return;
                setFeaturedAnnouncements(Array.isArray(response.data?.announcements) ? response.data.announcements : []);
            } catch (error) {
                console.error('Failed to fetch announcements', error);
                if (isMounted) {
                    setFeaturedAnnouncements([]);
                }
            } finally {
                if (isMounted) {
                    setAnnouncementsLoading(false);
                }
            }
        };

        fetchFeaturedAnnouncements();

        return () => {
            isMounted = false;
        };
    }, []);

    const openAttendanceModal = () => {
        setAttendanceModalDate(TODAY_DATE_STRING);
        setAttendanceModalOpen(true);
    };

    const shiftAttendanceModalDate = (days) => {
        setAttendanceModalDate((prev) => {
            const nextDate = format(addDays(new Date(`${prev}T00:00:00`), days), 'yyyy-MM-dd');
            return nextDate > TODAY_DATE_STRING ? TODAY_DATE_STRING : nextDate;
        });
    };

    const isAttendanceModalAtToday = attendanceModalDate >= TODAY_DATE_STRING;

    const dashboardKpis = [
        {
            label: 'Total Workforce',
            value: stats?.totalEmployees || 0,
            icon: Users,
            color: 'blue',
            trend: 'Active',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600'
        },
        {
            label: 'Present Today',
            value: stats?.presentToday || 0,
            total: stats?.totalEmployees || 0,
            icon: UserCheck,
            color: 'emerald',
            trend: 'Verified',
            progress: (stats?.presentToday / (stats?.totalEmployees || 1)) * 100,
            bgColor: 'bg-emerald-50',
            textColor: 'text-emerald-600'
        },
        {
            label: 'Absent Personnel',
            value: stats?.absentToday || 0,
            icon: UserX,
            color: 'orange',
            trend: 'Tracked',
            bgColor: 'bg-orange-50',
            textColor: 'text-orange-600'
        }
    ];

    if (showLeavesModule) {
        dashboardKpis.push({
            label: 'On Leave Today',
            value: stats?.leaveToday || 0,
            icon: Calendar,
            color: 'violet',
            trend: `${stats?.pendingLeaveRequests || 0} Pending`,
            bgColor: 'bg-violet-50',
            textColor: 'text-violet-600'
        });
    }

    return (
        <div className="flex-1 flex flex-col bg-[#f8f9fa] font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <MotionDiv
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    className="flex-1 overflow-auto p-3 sm:p-5"
                >
                    <div className="max-w-[1500px] w-full mx-auto space-y-4">
                        {/* Header Section */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="space-y-0.5">
                                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Executive Overview</h1>
                                <p className="text-[10px] text-slate-500 font-medium italic">
                                    Welcome back, {user?.firstName} 👋
                                </p>
                            </div>
                            <div className="flex items-center gap-2 px-2.5 py-1 bg-white border border-slate-200/60 rounded-lg shadow-xs text-[10px] font-bold text-slate-600">
                                <Calendar size={13} className="text-blue-600" />
                                {format(new Date(), 'MMM d, yyyy')}
                            </div>
                        </div>

                        <div className="premium-card overflow-hidden bg-white">
                            <div className="px-4 py-2.5 flex justify-between items-center border-b border-slate-50 bg-[#fcfcfc]">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                                    <h2 className="text-xs font-bold text-slate-900 tracking-tight">Announcements</h2>
                                </div>
                                <Link to="/announcements" className="text-[9px] font-black text-blue-600 bg-blue-50/80 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors uppercase tracking-widest">
                                    Open Feed
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
                                {announcementsLoading ? (
                                    [1, 2, 3].map((item) => (
                                        <div key={item} className="rounded-2xl border border-slate-200 p-4">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="mt-2.5 h-5 w-3/4" />
                                        </div>
                                    ))
                                ) : featuredAnnouncements.length > 0 ? (
                                    featuredAnnouncements.map((announcement) => (
                                        <div key={announcement._id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {announcement.pinned ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-700">
                                                        <Pin size={10} />
                                                        Pinned
                                                    </span>
                                                ) : null}
                                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-blue-700">
                                                    <Megaphone size={10} />
                                                    {announcement.category}
                                                </span>
                                            </div>
                                            <h3 className="mt-2.5 text-sm font-bold leading-snug text-slate-900">{announcement.title}</h3>
                                        </div>
                                    ))
                                ) : (
                                    <div className="md:col-span-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <Megaphone size={22} strokeWidth={1.7} />
                                            <p className="text-xs font-medium italic">No announcements are live right now.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* KPI Grid */}
                        <div className={`grid grid-cols-1 gap-4 ${showLeavesModule ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3'}`}>
                            {dashboardKpis.map((kpi, idx) => (
                                <MotionDiv
                                    key={kpi.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="premium-card p-4 bg-white"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`p-2 rounded-lg ${kpi.bgColor} ${kpi.textColor}`}>
                                            <kpi.icon size={16} />
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${kpi.bgColor} ${kpi.textColor}`}>
                                            {kpi.trend}
                                        </span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{kpi.label}</h3>
                                        <div className="flex items-baseline gap-1.5">
                                            {loading && !stats ? (
                                                <Skeleton className="h-8 w-16" />
                                            ) : (
                                                <span className="text-2xl font-black text-slate-900 tracking-tighter">
                                                    {kpi.value}
                                                </span>
                                            )}
                                            {kpi.total && (
                                                <span className="text-[10px] font-bold text-slate-400">/ {kpi.total}</span>
                                            )}
                                        </div>
                                    </div>
                                    {kpi.progress !== undefined && (
                                        <div className="mt-3 space-y-1">
                                            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                                                <span>Attendance Rate</span>
                                                <span>{Math.round(kpi.progress)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                <MotionDiv
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${kpi.progress}%` }}
                                                    transition={{ duration: 1, delay: 0.5 }}
                                                    className={`h-full ${kpi.label === 'Present Today' ? 'bg-emerald-500' : 'bg-blue-500'} rounded-full`}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </MotionDiv>
                            ))}
                        </div>

                        {/* Tables Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                            {/* Attendance Table */}
                            <div className={`${showProjectModule ? 'lg:col-span-8' : 'lg:col-span-12'} premium-card bg-white overflow-hidden flex flex-col`}>
                                <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-50 bg-[#fcfcfc]">
                                    <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                                            <h2 className="text-xs font-bold text-slate-900 tracking-tight whitespace-nowrap">Recent Attendance</h2>
                                        </div>

                                        {availableEmploymentTypes.length > 0 && (
                                            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedTypeTab('all')}
                                                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                                                        selectedTypeTab === 'all'
                                                            ? 'bg-white text-blue-600 shadow-xs font-bold'
                                                            : 'text-slate-600 hover:text-slate-900'
                                                    }`}
                                                >
                                                    All
                                                </button>
                                                {availableEmploymentTypes.map((type) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => setSelectedTypeTab(type)}
                                                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                                                            selectedTypeTab === type
                                                                ? 'bg-white text-blue-600 shadow-xs font-bold'
                                                                : 'text-slate-600 hover:text-slate-900'
                                                        }`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={openAttendanceModal}
                                            disabled={attendanceLoading}
                                            className="text-[9px] font-black text-blue-600 bg-blue-50/80 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors uppercase tracking-widest disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            View All
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-slate-50/50">
                                                <th className="px-5 py-2.5 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Employee</th>
                                                <th className="px-5 py-2.5 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Clock In</th>
                                                <th className="px-5 py-2.5 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                                                {showLocation && (
                                                    <th className="px-5 py-2.5 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">Location</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                [1, 2, 3, 4, 5].map(i => (
                                                    <tr key={i}><td colSpan={showLocation ? 4 : 3} className="px-5 py-2.5"><Skeleton className="h-10 w-full" /></td></tr>
                                                ))
                                            ) : filteredRecentActivity.length > 0 ? (
                                                filteredRecentActivity.map((record) => (
                                                    <tr key={record.id} className="group hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0">
                                                        <td className="px-5 py-3">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200/50 group-hover:scale-105 transition-transform">
                                                                    {record.user.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="text-[13px] font-bold text-slate-900 leading-none">{record.user.name}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3">
                                                            <div className="flex items-center gap-1 text-slate-700 font-bold">
                                                                <Clock size={10} className="text-slate-400" />
                                                                <span className="text-[11px] uppercase">
                                                                    {record.attendanceMode === 'present_only'
                                                                        ? 'Present'
                                                                        : record.time
                                                                            ? format(new Date(record.time), 'hh:mm a')
                                                                            : '--:--'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3">
                                                            <span className="px-2 py-0.5 rounded-md bg-blue-50/50 text-blue-600 text-[9px] font-black uppercase tracking-tight border border-blue-100/30">
                                                                {record.user.employmentType || 'FT'}
                                                            </span>
                                                        </td>
                                                        {showLocation && (
                                                            <td className="px-5 py-3 text-right">
                                                                <LocationLink location={record.location} />
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={showLocation ? 4 : 3} className="px-6 py-10 text-center">
                                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                                            <AlertCircle size={24} strokeWidth={1.5} />
                                                            <p className="text-xs font-medium italic">
                                                                {selectedTypeTab === 'all'
                                                                    ? 'No attendance records found for today.'
                                                                    : `No attendance records found for "${selectedTypeTab}".`}
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {showProjectModule && (
                                <div className="lg:col-span-4 space-y-5">
                                    {showProjectModule && (
                                        <div className="premium-card bg-white overflow-hidden flex flex-col">
                                            <div className="px-4 py-2.5 flex justify-between items-center border-b border-slate-50 bg-[#fcfcfc]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-4 bg-purple-600 rounded-full"></div>
                                                    <h2 className="text-xs font-bold text-slate-900 tracking-tight">Active Projects</h2>
                                                </div>
                                                <Link to="/projects" className="text-[9px] font-black text-blue-600 bg-blue-50/80 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors uppercase tracking-widest">
                                                    View Data
                                                </Link>
                                            </div>
                                            <div className="p-0">
                                                <div className="divide-y divide-slate-50">
                                                    {loading ? (
                                                        [1, 2, 3].map(i => <div key={i} className="p-4"><Skeleton className="h-10 w-full" /></div>)
                                                    ) : projects.filter(p => p.status === 'Active').length > 0 ? (
                                                        projects.filter(p => p.status === 'Active').slice(0, 5).map((project) => (
                                                            <div
                                                                key={project._id}
                                                                onClick={() => navigate('/projects')}
                                                                className="px-5 py-3.5 hover:bg-slate-50/30 cursor-pointer transition-all group"
                                                            >
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <h3 className="font-bold text-slate-900 text-[13px] group-hover:text-blue-600 transition-colors leading-tight">
                                                                        {project.name}
                                                                    </h3>
                                                                    <span className="text-[8px] font-black bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md uppercase tracking-widest border border-blue-100/50">
                                                                        {project.status}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-1 text-slate-400">
                                                                        <Calendar size={10} />
                                                                        <span className="text-[10px] font-bold">
                                                                            {project.deadline ? format(new Date(project.deadline), 'MMM d, yy') : 'No Deadline'}
                                                                        </span>
                                                                    </div>
                                                                    <ArrowUpRight size={12} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-10 text-center text-slate-400 italic text-xs">
                                                            No active projects listed.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </MotionDiv>
            </main>

            {attendanceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
                    <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Attendance Overview</h2>
                                <p className="text-sm text-slate-500">Review all attendance records for a selected day.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAttendanceModalOpen(false)}
                                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close attendance overview"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => shiftAttendanceModalDate(-1)}
                                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100"
                                    aria-label="Previous day attendance"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <input
                                    type="date"
                                    value={attendanceModalDate}
                                    max={TODAY_DATE_STRING}
                                    onChange={(e) => setAttendanceModalDate(e.target.value > TODAY_DATE_STRING ? TODAY_DATE_STRING : e.target.value)}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                                <button
                                    type="button"
                                    onClick={() => shiftAttendanceModalDate(1)}
                                    disabled={isAttendanceModalAtToday}
                                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="Next day attendance"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
                                <Calendar size={15} className="text-blue-600" />
                                <span>{format(new Date(`${attendanceModalDate}T00:00:00`), 'dd MMM yyyy')}</span>
                                <span className="text-slate-300">|</span>
                                <span>{attendanceModalMeta.total || attendanceModalRecords.length} records</span>
                            </div>
                        </div>

                        <div className="overflow-auto">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-white shadow-sm">
                                    <tr className="bg-slate-50/80">
                                        <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Employee</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Clock In</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Type</th>
                                        {showLocation && (
                                            <th className="px-6 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Location</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendanceModalLoading ? (
                                        [1, 2, 3, 4, 5, 6].map((row) => (
                                            <tr key={row}>
                                                <td colSpan={showLocation ? 5 : 4} className="px-6 py-3">
                                                    <Skeleton className="h-12 w-full" />
                                                </td>
                                            </tr>
                                        ))
                                    ) : attendanceModalRecords.length > 0 ? (
                                        attendanceModalRecords.map((record) => (
                                            <tr key={`${attendanceModalDate}-${record.id}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-600">
                                                            {record.user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900">{record.user.name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                        <Clock size={14} className="text-slate-400" />
                                                        <span>
                                                            {record.attendanceMode === 'present_only'
                                                                ? 'Present'
                                                                : record.time
                                                                    ? format(new Date(record.time), 'hh:mm a')
                                                                    : '--:--'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                                                        {String(record.status || 'Present').replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
                                                        {record.user.employmentType || 'FT'}
                                                    </span>
                                                </td>
                                                {showLocation && (
                                                    <td className="px-6 py-4 text-right">
                                                        <LocationLink location={record.location} />
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={showLocation ? 5 : 4} className="px-6 py-14 text-center">
                                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                                    <AlertCircle size={26} strokeWidth={1.5} />
                                                    <p className="text-sm font-medium italic">No attendance records found for {format(new Date(`${attendanceModalDate}T00:00:00`), 'dd MMM yyyy')}.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
