import { useState, useEffect, useRef, useCallback } from 'react';
import { startOfDay } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/apiClient';
import { isCacheFresh, readSessionCache } from '@/lib/cache';
import {
    ATTENDANCE_CACHE_TTL_MS,
    getAttendanceCacheKey,
    upsertAttendanceRecord,
    buildAttendanceFingerprint,
    writeAttendanceCache,
    updateAttendanceCache
} from '../utils/attendanceCache';

export const useAttendanceData = ({
    currentUser,
    selectedUserId,
    calendarDate,
    setViewUser
}) => {
    const [status, setStatus] = useState(null);
    const [timesheetSummary, setTimesheetSummary] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [holidays, setHolidays] = useState([]);
    const [approvedLeaves, setApprovedLeaves] = useState([]);
    const [weeklyOffs, setWeeklyOffs] = useState(['Saturday', 'Sunday']);
    const [customFlexibleOffDays, setCustomFlexibleOffDays] = useState([]);
    const [fetchedAttendanceSettings, setFetchedAttendanceSettings] = useState(null);
    const [recentLogs, setRecentLogs] = useState([]);

    const fetchTodayStatus = useCallback(async () => {
        try {
            const res = await api.get('/attendance/today');
            setStatus(res.data);
        } catch (error) {
            console.error('Error fetching status', error);
        }
    }, []);

    const fetchMonthHistory = useCallback(async (year, month, options = {}) => {
        try {
            const userId = selectedUserId || currentUser?._id;
            const res = await api.get('/attendance/bootstrap', {
                params: {
                    year,
                    month,
                    userId,
                    logsLimit: 4,
                    ...(options.skipCache ? { ts: Date.now() } : {})
                },
                headers: options.skipCache
                    ? { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
                    : undefined
            });
            setHistory(res.data.history || []);
            setWeeklyOffs(res.data.weeklyOff || ['Saturday', 'Sunday']);
            setHolidays(res.data.holidays || []);
            setApprovedLeaves(res.data.approvedLeaves || []);
            setTimesheetSummary(res.data.timesheetSummary || null);
            if (res.data.attendanceSettings) {
                setFetchedAttendanceSettings(res.data.attendanceSettings);
            }
            if (res.data.customFlexibleOffDays) {
                setCustomFlexibleOffDays(res.data.customFlexibleOffDays);
            }
            if (res.data.targetUser && setViewUser) {
                setViewUser(res.data.targetUser);
            }
        } catch (error) {
            console.error('Error fetching month data', error);
            toast.error('Could not load calendar data');
        }
    }, [currentUser, selectedUserId, setViewUser]);

    const applyImmediateAttendanceUpdate = useCallback((attendanceRecord) => {
        if (!attendanceRecord) return;

        const effectiveDate = new Date(
            attendanceRecord.clockOut ||
            attendanceRecord.clockIn ||
            attendanceRecord.date ||
            new Date()
        );
        const normalizedRecord = {
            status: 'PRESENT',
            approvalStatus: attendanceRecord.approvalStatus || 'APPROVED',
            ...attendanceRecord,
            date: startOfDay(effectiveDate).toISOString()
        };

        setStatus(prev => ({
            ...(prev || {}),
            ...normalizedRecord
        }));

        const isViewingSelf = !selectedUserId || selectedUserId === currentUser?._id;
        const recordDate = new Date(normalizedRecord.date || normalizedRecord.clockIn || new Date());
        const isVisibleMonth =
            recordDate.getFullYear() === calendarDate.getFullYear() &&
            recordDate.getMonth() === calendarDate.getMonth();

        if (isViewingSelf && isVisibleMonth) {
            setHistory(prev => upsertAttendanceRecord(prev, normalizedRecord));
        }

        updateAttendanceCache(currentUser?._id, normalizedRecord);
    }, [calendarDate, currentUser?._id, selectedUserId]);

    const didFetchRef = useRef(false);

    useEffect(() => {
        if (!currentUser?._id) return;

        // StrictMode guard: skip if already fetched in this mount cycle
        if (didFetchRef.current) return;
        didFetchRef.current = true;

        const controller = new AbortController();
        const signal = controller.signal;
        const now = new Date();

        const safe = (promise) => promise.catch(e => {
            if (e?.code === 'ERR_CANCELED' || e?.name === 'AbortError' || e?.name === 'CanceledError') return;
            console.error(e);
        });

        const CACHE_KEY = getAttendanceCacheKey(currentUser._id, now);

        const readCache = () => {
            return readSessionCache(CACHE_KEY);
        };

        const applyData = (payload) => {
            if (payload.status !== undefined) setStatus(payload.status);
            if (payload.recentLogs) setRecentLogs(payload.recentLogs);
            if (payload.history) setHistory(payload.history);
            if (payload.approvedLeaves) setApprovedLeaves(payload.approvedLeaves);
            if (payload.timesheetSummary !== undefined) setTimesheetSummary(payload.timesheetSummary);
            if (payload.weeklyOff) setWeeklyOffs(payload.weeklyOff);
            if (payload.holidays) setHolidays(payload.holidays);
            if (payload.customFlexibleOffDays) setCustomFlexibleOffDays(payload.customFlexibleOffDays);
            if (payload.targetUser && setViewUser) setViewUser(payload.targetUser);
            if (payload.attendanceSettings) setFetchedAttendanceSettings(payload.attendanceSettings);
        };

        // 1. Try Cache First (Instant UI)
        const cached = readCache();
        if (cached) {
            applyData(cached.data || cached);
            setLoading(false);
            if (isCacheFresh(cached, ATTENDANCE_CACHE_TTL_MS)) {
                return () => {
                    controller.abort();
                    didFetchRef.current = false;
                };
            }
        }

        // 2. Fetch Fresh Data (Background)
        safe(api.get('/attendance/bootstrap', {
            params: {
                year: now.getFullYear(),
                month: now.getMonth() + 1,
                userId: currentUser._id,
                logsLimit: 4
            },
            signal
        }).then(r => r.data)).then((bootstrapData) => {
            if (signal.aborted) return;

            const freshData = {
                status: bootstrapData?.status,
                recentLogs: bootstrapData?.recentLogs || [],
                history: bootstrapData?.history || [],
                holidays: bootstrapData?.holidays || [],
                approvedLeaves: bootstrapData?.approvedLeaves || [],
                timesheetSummary: bootstrapData?.timesheetSummary || null,
                weeklyOff: bootstrapData?.weeklyOff || [],
                customFlexibleOffDays: bootstrapData?.customFlexibleOffDays || [],
                targetUser: bootstrapData?.targetUser || null,
                attendanceSettings: bootstrapData?.attendanceSettings || null
            };

            const freshFingerprint = buildAttendanceFingerprint(freshData);
            const cachedFingerprint = cached?.fingerprint || (readCache()?.fingerprint || '');

            // 3. Update React only if data changed
            if (!cached || cachedFingerprint !== freshFingerprint) {
                applyData(freshData);
                writeAttendanceCache(CACHE_KEY, freshData, freshFingerprint);
            }
        }).finally(() => {
            if (!signal.aborted) setLoading(false);
        });

        return () => {
            controller.abort();
            didFetchRef.current = false;
        };
    }, [currentUser?._id, setViewUser]);

    // Refetch history only when Admin/Manager switches to a different user
    useEffect(() => {
        if (!selectedUserId || !currentUser?._id) return;
        if (selectedUserId === currentUser._id) {
            fetchTodayStatus();
            return;
        }

        const controller = new AbortController();
        api.get('/attendance/bootstrap', {
            params: {
                year: calendarDate.getFullYear(),
                month: calendarDate.getMonth() + 1,
                userId: selectedUserId,
                logsLimit: 4
            },
            signal: controller.signal
        })
            .then(res => {
                setStatus(res.data.status ?? null);
                setHistory(res.data.history || []);
                setHolidays(res.data.holidays || []);
                setApprovedLeaves(res.data.approvedLeaves || []);
                setTimesheetSummary(res.data.timesheetSummary || null);
                if (res.data.weeklyOff) setWeeklyOffs(res.data.weeklyOff);
                if (res.data.customFlexibleOffDays) setCustomFlexibleOffDays(res.data.customFlexibleOffDays);
                if (res.data.targetUser && setViewUser) setViewUser(res.data.targetUser);
            })
            .catch(e => {
                if (e?.code !== 'ERR_CANCELED' && e?.name !== 'CanceledError') console.error(e);
            });

        return () => controller.abort();
    }, [calendarDate, currentUser?._id, fetchTodayStatus, selectedUserId, setViewUser]);

    return {
        status,
        setStatus,
        history,
        setHistory,
        holidays,
        approvedLeaves,
        weeklyOffs,
        timesheetSummary,
        customFlexibleOffDays,
        fetchedAttendanceSettings,
        recentLogs,
        setRecentLogs,
        loading,
        fetchTodayStatus,
        fetchMonthHistory,
        applyImmediateAttendanceUpdate
    };
};

export default useAttendanceData;

