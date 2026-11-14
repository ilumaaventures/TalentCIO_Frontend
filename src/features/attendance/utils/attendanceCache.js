import { format } from 'date-fns';
import { createCachePayload, readSessionCache } from '@/lib/cache';

export const ATTENDANCE_CACHE_TTL_MS = 20 * 1000;

export const getAttendanceCacheKey = (targetUserId, dateValue = new Date()) =>
    `attendance_v1_${targetUserId}_${new Date(dateValue).toISOString().slice(0, 10)}`;

export const upsertAttendanceRecord = (records = [], attendanceRecord) => {
    if (!attendanceRecord) return records;

    const recordDate = format(
        new Date(attendanceRecord.date || attendanceRecord.clockIn || attendanceRecord.createdAt || new Date()),
        'yyyy-MM-dd'
    );

    const nextRecords = [...records];
    const existingIndex = nextRecords.findIndex(item =>
        format(new Date(item.date), 'yyyy-MM-dd') === recordDate
    );

    if (existingIndex >= 0) {
        nextRecords[existingIndex] = {
            ...nextRecords[existingIndex],
            ...attendanceRecord
        };
    } else {
        nextRecords.unshift(attendanceRecord);
    }

    return nextRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const buildAttendanceFingerprint = (data) => {
    const payload = data?.data || data;
    if (!payload) return 'none';
    // Simple string fingerprint based on current status and recent logs
    const statusStr = payload.status
        ? `${payload.status.status}|${payload.status.clockInIST}|${payload.status.clockOutIST}|${payload.status.attendanceMode || ''}|${payload.status.shiftCode || ''}`
        : 'none';
    const logsStr = (payload.recentLogs || []).map(l => `${l._id}|${l.hours}`).join(',');
    const historyStr = (payload.history || []).length;
    const leavesStr = (payload.approvedLeaves || []).length;
    const timesheetStr = payload.timesheetSummary?.status || 'none';
    const weeklyOffStr = (payload.weeklyOff || []).join(',');
    const holidaysStr = (payload.holidays || []).map(h => `${h._id || h.date}|${h.name}`).join(',');
    return `${statusStr}::${logsStr}::H${historyStr}::L${leavesStr}::TS${timesheetStr}::WO${weeklyOffStr}::HD${holidaysStr}`;
};

export const writeAttendanceCache = (cacheKey, data, fingerprint) => {
    try {
        const minimalStatus = data.status ? {
            _id: data.status._id,
            user: data.status.user,
            status: data.status.status,
            clockIn: data.status.clockIn,
            clockInIST: data.status.clockInIST,
            clockOut: data.status.clockOut,
            clockOutIST: data.status.clockOutIST,
            attendanceMode: data.status.attendanceMode,
            shiftCode: data.status.shiftCode,
            shiftName: data.status.shiftName,
            shiftType: data.status.shiftType,
            shiftStartTime: data.status.shiftStartTime,
            shiftEndTime: data.status.shiftEndTime,
            maxWorkingHours: data.status.maxWorkingHours,
            autoCheckoutAt: data.status.autoCheckoutAt,
            autoCheckoutReason: data.status.autoCheckoutReason
        } : null;

        const minimalHistory = (data.history || []).map(h => ({
            _id: h._id,
            date: h.date,
            clockIn: h.clockIn,
            clockOut: h.clockOut,
            status: h.status,
            attendanceMode: h.attendanceMode,
            shiftCode: h.shiftCode,
            shiftName: h.shiftName,
            shiftType: h.shiftType,
            shiftStartTime: h.shiftStartTime,
            shiftEndTime: h.shiftEndTime,
            maxWorkingHours: h.maxWorkingHours,
            autoCheckoutAt: h.autoCheckoutAt,
            autoCheckoutReason: h.autoCheckoutReason,
            lat: h.lat,
            lng: h.lng
        }));

        const minimalLogs = (data.recentLogs || []).map(l => ({
            _id: l._id,
            task: l.task ? { _id: l.task._id, name: l.task.name } : null,
            hours: l.hours,
            minutes: l.minutes,
            description: l.description,
            date: l.date
        }));

        const payload = createCachePayload({
            status: minimalStatus,
            recentLogs: minimalLogs,
            history: minimalHistory,
            approvedLeaves: (data.approvedLeaves || []).map(l => ({
                _id: l._id,
                leaveType: l.leaveType,
                startDate: l.startDate,
                endDate: l.endDate,
                status: l.status
            })),
            timesheetSummary: data.timesheetSummary || null,
            weeklyOff: data.weeklyOff || [],
            holidays: data.holidays || []
        }, fingerprint);

        sessionStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch {
        // Ignore cache write failures.
    }
};

export const updateAttendanceCache = (userId, attendanceRecord) => {
    if (!userId || !attendanceRecord) return;

    const cacheKey = getAttendanceCacheKey(userId);
    const cached = readSessionCache(cacheKey);
    const cachedData = cached?.data || {};
    const nextStatus = {
        ...(cachedData.status || {}),
        ...attendanceRecord
    };
    const nextHistory = upsertAttendanceRecord(cachedData.history || [], attendanceRecord);
    const nextData = {
        ...cachedData,
        status: nextStatus,
        history: nextHistory,
        recentLogs: cachedData.recentLogs || [],
        approvedLeaves: cachedData.approvedLeaves || [],
        timesheetSummary: cachedData.timesheetSummary || null
    };
    const nextFingerprint = `${nextStatus.status || 'none'}|${nextStatus.clockInIST || nextStatus.clockIn || ''}|${nextStatus.clockOutIST || nextStatus.clockOut || ''}::${(nextData.recentLogs || []).map(l => `${l._id}|${l.hours}`).join(',')}::H${nextHistory.length}::L${(nextData.approvedLeaves || []).length}::TS${nextData.timesheetSummary?.status || 'none'}`;

    sessionStorage.setItem(cacheKey, JSON.stringify(createCachePayload(nextData, nextFingerprint)));
};

