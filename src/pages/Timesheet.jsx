import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Calendar, ChevronLeft, ChevronRight, Save, Send, Clock, Download, FileText, Paperclip, Trash2, Upload, Loader2 } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import { format, startOfISOWeek, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfDay } from 'date-fns';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import AttendanceAttachmentsView from '../components/AttendanceAttachmentsView';
import AttendanceCalendar from '../components/AttendanceCalendar';
import Button from '../components/Button';
import { createCachePayload, isCacheFresh, readSessionCache } from '../utils/cache';

const TIMESHEET_CACHE_TTL_MS = 20 * 1000;
const getLocalDateInputValue = (dateValue = new Date()) => format(new Date(dateValue), 'yyyy-MM-dd');

const getNormalizedTimesheetCycle = (cycle = 'Monthly') => {
    if (cycle === 'Daily' || cycle === 'Weekly' || cycle === 'Bi-Weekly') {
        return cycle;
    }
    return 'Monthly';
};

const getWeekStartFromYearAndNumber = (year, weekNumber) => {
    return addWeeks(startOfISOWeek(new Date(year, 0, 4)), weekNumber - 1);
};

const getTimesheetPeriodId = (date, cycle = 'Monthly') => {
    const normalizedCycle = getNormalizedTimesheetCycle(cycle);

    if (normalizedCycle === 'Weekly') {
        return format(date, "yyyy-'W'II");
    }

    if (normalizedCycle === 'Bi-Weekly') {
        const weekNumber = parseInt(format(date, 'II'), 10);
        const biWeeklyNumber = Math.ceil(weekNumber / 2);
        return `${format(date, 'yyyy')}-BW${String(biWeeklyNumber).padStart(2, '0')}`;
    }

    if (normalizedCycle === 'Daily') {
        return format(date, 'yyyy-MM-dd');
    }

    return format(date, 'yyyy-MM');
};

const getVisibleDaysForCycle = (date, cycle = 'Monthly') => {
    const normalizedCycle = getNormalizedTimesheetCycle(cycle);

    if (normalizedCycle === 'Weekly') {
        const start = startOfISOWeek(date);
        return eachDayOfInterval({ start, end: addDays(start, 6) });
    }

    if (normalizedCycle === 'Bi-Weekly') {
        const periodId = getTimesheetPeriodId(date, normalizedCycle);
        const match = periodId.match(/^(\d{4})-BW(\d{2})$/);

        if (match) {
            const year = parseInt(match[1], 10);
            const biWeeklyNumber = parseInt(match[2], 10);
            const firstWeekNumber = ((biWeeklyNumber - 1) * 2) + 1;
            const start = getWeekStartFromYearAndNumber(year, firstWeekNumber);
            return eachDayOfInterval({ start, end: addDays(start, 13) });
        }
    }

    if (normalizedCycle === 'Daily') {
        return [startOfDay(date)];
    }

    return eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) });
};

const getDateForTimesheetPeriod = (periodId, cycle = 'Monthly') => {
    if (!periodId) return new Date();

    const normalizedCycle = getNormalizedTimesheetCycle(cycle);

    if (normalizedCycle === 'Weekly') {
        const match = String(periodId).match(/^(\d{4})-W(\d{2})$/);
        if (match) {
            return getWeekStartFromYearAndNumber(parseInt(match[1], 10), parseInt(match[2], 10));
        }
    }

    if (normalizedCycle === 'Bi-Weekly') {
        const match = String(periodId).match(/^(\d{4})-BW(\d{2})$/);
        if (match) {
            const year = parseInt(match[1], 10);
            const biWeeklyNumber = parseInt(match[2], 10);
            const firstWeekNumber = ((biWeeklyNumber - 1) * 2) + 1;
            return getWeekStartFromYearAndNumber(year, firstWeekNumber);
        }
    }

    if (normalizedCycle === 'Daily') {
        return startOfDay(new Date(periodId));
    }

    if (/^\d{4}-\d{2}$/.test(String(periodId))) {
        const [year, month] = String(periodId).split('-').map(Number);
        return new Date(year, month - 1, 1);
    }

    const fallbackDate = new Date(periodId);
    return Number.isNaN(fallbackDate.getTime()) ? new Date() : fallbackDate;
};

const getTimesheetPeriodLabel = (date, cycle = 'Monthly') => {
    const normalizedCycle = getNormalizedTimesheetCycle(cycle);

    if (normalizedCycle === 'Weekly') {
        const days = getVisibleDaysForCycle(date, normalizedCycle);
        return `${format(days[0], 'dd MMM yyyy')} - ${format(days[days.length - 1], 'dd MMM yyyy')}`;
    }

    if (normalizedCycle === 'Bi-Weekly') {
        const days = getVisibleDaysForCycle(date, normalizedCycle);
        return `${format(days[0], 'dd MMM yyyy')} - ${format(days[days.length - 1], 'dd MMM yyyy')}`;
    }

    if (normalizedCycle === 'Daily') {
        return format(date, 'dd MMM yyyy');
    }

    return format(date, 'MMMM yyyy');
};

const buildCellLogFingerprint = (logs = []) => logs.map((log) => [
    log?._id,
    log?.hours,
    log?.description,
    log?.status,
    log?.rejectionReason,
    log?.task?._id || log?.task,
    log?.module?._id || log?.module,
    log?.project?._id || log?.project,
    log?.taskName
].join(':')).join('|');

const readRouteState = () => {
    const params = new URLSearchParams(window.location.search);
    return {
        month: params.get('month') || '',
        userId: params.get('userId') || '',
        name: params.get('name') || ''
    };
};

const isFullyRejectedTimesheet = (timesheet) =>
    timesheet?.status === 'REJECTED' &&
    (timesheet.entries || []).length > 0 &&
    timesheet.entries.every(entry => entry.status === 'REJECTED');

const Timesheet = ({ propUserId, propUserName, initialTab, isEmbedded = false }) => {
    const { user, hasModule } = useAuth();
    const cycle = getNormalizedTimesheetCycle(user?.company?.settings?.timesheet?.approvalCycle || 'Monthly');
    const [routeState, setRouteState] = useState(() => readRouteState());
    const [viewDate, setViewDate] = useState(() => getDateForTimesheetPeriod(readRouteState().month, cycle));
    const [timesheet, setTimesheet] = useState(null);
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [, setProjects] = useState([]);
    const [viewUser, setViewUser] = useState(user);
    const [holidays, setHolidays] = useState([]);
    const [approvedLeaves, setApprovedLeaves] = useState([]);
    const [usersList, setUsersList] = useState([]); // List of users for dropdown
    const [weeklyOffs, setWeeklyOffs] = useState(['Sunday']);

    // Identification for Manager/Admin View
    const targetUserId = propUserId || routeState.userId;
    const targetUserName = propUserName || routeState.name;
    const effectiveUserId = targetUserId || user?._id;

    const lastFetchKeyRef = useRef('');
    const timesheetRef = useRef(null);
    // Approval Logic
    const [activeTab, setActiveTab] = useState(initialTab || 'timesheet');
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [loadingApprovals, setLoadingApprovals] = useState(false);

    // Document Management state
    const [attachments, setAttachments] = useState({ files: [] });
    const [loadingAttachments, setLoadingAttachments] = useState(false);

    const isAdmin = user?.roles?.some((role) => {
        const roleName = typeof role === 'string' ? role : role?.name;
        return roleName === 'Admin' || roleName === 'System Admin';
    }) ||
        user?.permissions?.includes('*') ||
        user?.permissions?.includes('all') ||
        user?.permissions?.includes('admin') ||
        user?.role === 'Admin';

    const canApprove = user?.roles?.some(r => r === 'Admin' || r.name === 'Admin') ||
        user?.permissions?.includes('*') ||
        user?.permissions?.includes('attendance.approve') ||
        user?.permissions?.includes('timesheet.approve');

    // Permission to edit own attendance
    const canEditAttendance = user?.roles?.some(r => r === 'Admin' || r.name === 'Admin') ||
        user?.permissions?.includes('*') ||
        user?.permissions?.includes('attendance.update_self') ||
        user?.permissions?.includes('attendance.update_others');

    // Permission to update others (Manager/Admin)
    const canUpdateAttendance = user?.roles?.some(r => r === 'Admin' || r.name === 'Admin') ||
        user?.permissions?.includes('*') ||
        user?.permissions?.includes('attendance.update_others');
    const canUpdateFutureDays = user?.roles?.some(r => r === 'Admin' || r.name === 'Admin') ||
        user?.permissions?.includes('*') ||
        user?.permissions?.includes('attendance.update_future');

    const canUpdateTimesheet = user?.roles?.some(r => r === 'Admin' || r.name === 'Admin') ||
        user?.permissions?.includes('*') ||
        user?.permissions?.includes('timesheet.update_others');

    const canViewAttendance = user?.roles?.some(r => r === 'Admin' || r.name === 'Admin') ||
        user?.permissions?.includes('*') ||
        user?.permissions?.includes('attendance.view') ||
        user?.permissions?.includes('attendance.update_others');

    const canViewTimesheets = user?.roles?.some(r => r === 'Admin' || r.name === 'Admin') ||
        user?.permissions?.includes('*') ||
        user?.permissions?.includes('timesheet.view') ||
        user?.permissions?.includes('timesheet.update_others');
    const canSubmitTimesheet = user?.roles?.some(r => r === 'Admin' || r.name === 'Admin') ||
        user?.permissions?.includes('*') ||
        user?.permissions?.includes('timesheet.submit');
    const canUseProjectWorkLogs = hasModule('projects');

    const isEditableTimesheetStatus = !timesheet || timesheet.status === 'DRAFT' || timesheet.status === 'REJECTED';

    useEffect(() => {
        timesheetRef.current = timesheet;
    }, [timesheet]);

    useEffect(() => {
        if (!routeState.month) return;

        const nextDate = getDateForTimesheetPeriod(routeState.month, cycle);
        if (Number.isNaN(nextDate.getTime())) return;

        setViewDate(prev => (prev.getTime() === nextDate.getTime() ? prev : nextDate));
    }, [cycle, routeState.month]);

    useEffect(() => {
        if (propUserId || propUserName) return;

        const nextMonth = getTimesheetPeriodId(viewDate, cycle);
        if (routeState.month === nextMonth) return;

        const url = new URL(window.location);
        url.searchParams.set('month', nextMonth);
        window.history.replaceState({}, '', url);
        setRouteState(prev => ({ ...prev, month: nextMonth }));
    }, [cycle, propUserId, propUserName, routeState.month, viewDate]);

    useEffect(() => {
        if (propUserId || propUserName) return undefined;

        const handlePopState = () => setRouteState(readRouteState());
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [propUserId, propUserName]);

    const updateRouteContext = useCallback((nextState = {}) => {
        if (propUserId || propUserName) return;

        const url = new URL(window.location);
        const mergedState = {
            month: nextState.month !== undefined ? nextState.month : routeState.month,
            userId: nextState.userId !== undefined ? nextState.userId : routeState.userId,
            name: nextState.name !== undefined ? nextState.name : routeState.name
        };

        if (mergedState.month) url.searchParams.set('month', mergedState.month);
        else url.searchParams.delete('month');

        if (mergedState.userId) url.searchParams.set('userId', mergedState.userId);
        else url.searchParams.delete('userId');

        if (mergedState.name) url.searchParams.set('name', mergedState.name);
        else url.searchParams.delete('name');

        window.history.pushState({}, '', url);
        setRouteState(mergedState);
    }, [propUserId, propUserName, routeState.month, routeState.name, routeState.userId]);

    const formatTime = (isoString, istString) => {
        if (istString) return istString.split(',')[1]?.trim() || istString;
        if (!isoString) return '-';
        return format(new Date(isoString), 'hh:mm a');
    };

    const isPresentOnlyAttendance = (record) => record?.attendanceMode === 'present_only';

    const getAttendanceHoursValue = (record) => {
        if (!record) return 0;

        const durationMinutes = Number(record.duration);
        if (Number.isFinite(durationMinutes) && durationMinutes > 0) {
            return durationMinutes / 60;
        }

        if (record.clockIn && record.clockOut) {
            const diff = (new Date(record.clockOut) - new Date(record.clockIn)) / 3600000;
            return diff > 0 ? diff : 0;
        }

        return 0;
    };

    const formatHoursLabel = (hours, { decimals = 2 } = {}) => {
        return hours > 0 ? `${hours.toFixed(decimals)}h` : '-';
    };

    const formatHoursDuration = (hours) => {
        if (!(hours > 0)) return '-';

        const totalMinutes = Math.round(hours * 60);
        const wholeHours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${wholeHours}h ${minutes}m`;
    };

    const calculateDuration = (recordOrInTime, outTime) => {
        if (recordOrInTime && typeof recordOrInTime === 'object' && !Array.isArray(recordOrInTime)) {
            return formatHoursLabel(getAttendanceHoursValue(recordOrInTime));
        }

        if (!recordOrInTime || !outTime) return '-';
        const start = new Date(recordOrInTime);
        const end = new Date(outTime);
        const diff = (end - start) / 3600000;
        return diff > 0 ? `${diff.toFixed(2)}h` : '-';
    };

    const getAttendanceTimeDisplay = (record, field) => {
        if (!record) return '-';
        if (isPresentOnlyAttendance(record)) return 'Present';
        return formatTime(record[field], record[`${field}IST`]);
    };

    const getRejectableItems = (ts) => {
        const workLogItems = (ts?.entries || []).map((entry) => ({
            id: `worklog:${entry._id}`,
            type: 'worklog',
            date: entry.date,
            title: entry.project?.name || 'Unknown Project',
            subtitle: entry.description || entry.taskName || 'Work log entry',
            meta: `${entry.hours}h`
        }));

        const attendanceItems = (ts?.attendanceLog || []).map((log) => ({
            id: `attendance:${log._id}`,
            type: 'attendance',
            date: log.date,
            title: 'Attendance',
            subtitle: isPresentOnlyAttendance(log)
                ? 'Marked present'
                : `${getAttendanceTimeDisplay(log, 'clockIn')} - ${getAttendanceTimeDisplay(log, 'clockOut')}`,
            meta: isPresentOnlyAttendance(log) ? 'Present Only' : getAttendanceStatusMeta(log).label
        }));

        return [...workLogItems, ...attendanceItems]
            .sort((left, right) => new Date(left.date) - new Date(right.date));
    };

    const getRejectedCorrectionItems = () => {
        const rejectedWorkLogs = (timesheet?.entries || [])
            .filter((entry) => entry.status === 'REJECTED')
            .map((entry) => ({
                id: `worklog:${entry._id}`,
                type: 'worklog',
                date: entry.date,
                title: `${entry.project?.name || 'Unknown Project'} (${entry.hours}h)`,
                subtitle: entry.description || entry.taskName || 'Rejected work log',
                source: entry
            }));

        const rejectedAttendance = (attendanceLogs || [])
            .filter((log) => log.approvalStatus === 'REJECTED')
            .map((log) => ({
                id: `attendance:${log._id}`,
                type: 'attendance',
                date: log.date,
                title: isPresentOnlyAttendance(log)
                    ? 'Attendance - Marked Present'
                    : `Attendance - ${getAttendanceTimeDisplay(log, 'clockIn')} / ${getAttendanceTimeDisplay(log, 'clockOut')}`,
                subtitle: log.rejectionReason || 'Rejected attendance',
                source: log
            }));

        return [...rejectedWorkLogs, ...rejectedAttendance]
            .sort((left, right) => new Date(left.date) - new Date(right.date));
    };

    const handleRejectedCorrectionClick = (item) => {
        if (!item) return;

        if (item.type === 'attendance') {
            const log = item.source;
            const correctionDate = new Date(log.date);
            const dayLogs = (timesheet?.entries || []).filter((entry) => (
                format(new Date(entry.date), 'yyyy-MM-dd') === format(correctionDate, 'yyyy-MM-dd')
            ));

            setSelectedCell({
                project: { name: 'Attendance Log' },
                date: correctionDate,
                logs: dayLogs
            });

            setEntryToEdit({ _id: log._id, type: 'ATTENDANCE', ...log });
            const fmtTime = (value) => value ? new Date(value).toTimeString().substring(0, 5) : '';
            setEditStartTime(fmtTime(log.clockIn));
            setEditEndTime(fmtTime(log.clockOut));
            return;
        }

        handleEditClick(item.source);
    };

    const getLeaveForDate = (day) => {
        const targetTime = startOfDay(new Date(day)).getTime();
        return approvedLeaves.find((leave) => {
            const leaveStart = startOfDay(new Date(leave.startDate)).getTime();
            const leaveEnd = startOfDay(new Date(leave.endDate)).getTime();
            return targetTime >= leaveStart && targetTime <= leaveEnd;
        }) || null;
    };

    const getLeaveLabel = (leave) => {
        if (!leave) return '';
        if (leave.isHalfDay) {
            return `${leave.leaveType} Half Day`;
        }
        return leave.leaveType;
    };

    const getDayContext = (day) => {
        const dateKey = format(new Date(day), 'yyyy-MM-dd');
        const holiday = holidays.find((item) => format(new Date(item.date), 'yyyy-MM-dd') === dateKey) || null;
        const leave = getLeaveForDate(day);
        const isWeeklyOff = weeklyOffs.includes(format(new Date(day), 'EEEE'));
        return { holiday, leave, isWeeklyOff };
    };

    const getDayStatusDetails = (day, record = null) => {
        const { holiday, leave, isWeeklyOff } = getDayContext(day);

        if (day > new Date()) {
            return {
                label: '-',
                chipClass: 'bg-slate-100 text-slate-500',
                rowColor: 'FFFFFFFF',
                shortLabel: '-'
            };
        }

        if (holiday) {
            return {
                label: holiday.name,
                chipClass: holiday.isOptional ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700',
                rowColor: 'FFD1F2EB',
                shortLabel: 'HOL'
            };
        }

        if (leave) {
            return {
                label: getLeaveLabel(leave),
                chipClass: 'bg-purple-100 text-purple-700',
                rowColor: 'FFF1E8FF',
                shortLabel: leave.isHalfDay ? 'HDL' : 'LEV'
            };
        }

        if (record) {
            const attendanceMeta = getAttendanceStatusMeta(record);
            return {
                label: attendanceMeta.label,
                chipClass: attendanceMeta.chipClass,
                rowColor: 'FFEBF1DE',
                shortLabel: 'PRS'
            };
        }

        if (isWeeklyOff) {
            return {
                label: 'Weekoff',
                chipClass: 'bg-slate-100 text-slate-500',
                rowColor: 'FFF2F2F2',
                shortLabel: 'WO'
            };
        }

        return {
            label: 'Absent',
            chipClass: 'bg-red-100 text-red-700',
            rowColor: 'FFF2DCDB',
            shortLabel: 'ABS'
        };
    };

    const handleExportAttendance = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Attendance Report');
            const exportUser = viewUser || user;

            // Header Info
            sheet.mergeCells('A1:C1');
            sheet.getCell('A1').value = `User Name: ${exportUser.firstName} ${exportUser.lastName || ''}`;
            sheet.getCell('A1').font = { bold: true, size: 14 };

            sheet.mergeCells('A2:C2');
            sheet.getCell('A2').value = `Report Month: ${format(viewDate, 'MMMM yyyy')}`;

            sheet.addRow([]);

            // Table Header
            const headerRow = sheet.addRow(['Date', 'Day', 'Status', 'In Time', 'Out Time', 'Duration']);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
            headerRow.alignment = { horizontal: 'center' };

            // Data
            const start = startOfMonth(viewDate);
            const end = endOfMonth(viewDate);
            const days = eachDayOfInterval({ start, end });

            days.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const log = attendanceLogs.find(l => format(new Date(l.date), 'yyyy-MM-dd') === dateStr);
                const dayName = format(day, 'EEEE');
                const dayStatus = getDayStatusDetails(day, log);
                const status = dayStatus.label;
                const rowColor = dayStatus.rowColor;

                const row = sheet.addRow([
                    format(day, 'dd-MMM-yyyy'),
                    dayName,
                    status,
                    log ? getAttendanceTimeDisplay(log, 'clockIn') : '-',
                    log ? getAttendanceTimeDisplay(log, 'clockOut') : '-',
                    log ? (isPresentOnlyAttendance(log) ? 'Present' : calculateDuration(log)) : '-'
                ]);

                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
                row.alignment = { horizontal: 'center' };
            });

            sheet.columns = [
                { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
            ];

            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = `Attendance_${format(viewDate, 'MMM_yyyy')}_${exportUser.firstName}.xlsx`;
            saveAs(new Blob([buffer]), fileName);
            toast.success('Attendance Report Exported');
        } catch (error) {
            console.error(error);
            toast.error('Failed to export report');
        }
    };

    // Rejection Modal State
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [selectedTimesheet, setSelectedTimesheet] = useState(null); // Full object
    const [rejectionType, setRejectionType] = useState('FULL'); // 'FULL' or 'PARTIAL'
    const [rejectedEntryIds, setRejectedEntryIds] = useState([]);

    const handleRejectClick = (timesheet) => {
        setSelectedTimesheet(timesheet);
        setRejectReason('');
        setRejectionType('FULL');
        setRejectedEntryIds([]);
        setShowRejectModal(true);
    };

    const toggleEntryRejection = (entryId) => {
        setRejectedEntryIds(prev =>
            prev.includes(entryId)
                ? prev.filter(id => id !== entryId)
                : [...prev, entryId]
        );
    };

    const upsertAttendanceLog = useCallback((nextLog) => {
        if (!nextLog) return;

        setAttendanceLogs(prev => {
            const nextLogDateKey = format(new Date(nextLog.date), 'yyyy-MM-dd');
            const existingIndex = prev.findIndex((log) => String(log._id) === String(nextLog._id));
            const dateIndex = existingIndex >= 0
                ? existingIndex
                : prev.findIndex((log) => format(new Date(log.date), 'yyyy-MM-dd') === nextLogDateKey);

            if (dateIndex === -1) {
                return [...prev, nextLog];
            }

            const nextLogs = [...prev];
            nextLogs[dateIndex] = { ...nextLogs[dateIndex], ...nextLog };
            return nextLogs;
        });
    }, []);

    const upsertTimesheetEntry = useCallback((nextEntry) => {
        if (!nextEntry) return;

        setTimesheet(prev => {
            if (!prev) return prev;

            const nextEntries = [...(prev.entries || [])];
            const existingIndex = nextEntries.findIndex((entry) => String(entry._id) === String(nextEntry._id));

            if (existingIndex === -1) {
                nextEntries.push(nextEntry);
            } else {
                nextEntries[existingIndex] = nextEntry;
            }

            nextEntries.sort((left, right) => new Date(left.date) - new Date(right.date));
            return { ...prev, entries: nextEntries };
        });
    }, []);

    const applyTimesheetDecisionToCurrentView = useCallback(({ timesheetId, status, rejectionReason = '', type = 'FULL', rejectedIds = [] }) => {
        setTimesheet(prev => {
            if (!prev || String(prev._id) !== String(timesheetId)) {
                return prev;
            }

            const rejectedWorkLogIds = new Set(
                rejectedIds
                    .filter((entryId) => String(entryId).startsWith('worklog:'))
                    .map((entryId) => String(entryId).slice('worklog:'.length))
            );

            const nextEntries = (prev.entries || []).map((entry) => {
                if (status === 'APPROVED') {
                    return { ...entry, status: 'APPROVED', rejectionReason: undefined };
                }

                if (type === 'PARTIAL') {
                    if (!rejectedWorkLogIds.has(String(entry._id))) {
                        return entry;
                    }
                    return { ...entry, status: 'REJECTED', rejectionReason };
                }

                return { ...entry, status: 'REJECTED', rejectionReason };
            });

            return {
                ...prev,
                status,
                rejectionReason: status === 'REJECTED' ? rejectionReason : '',
                entries: nextEntries
            };
        });

        setAttendanceLogs(prev => {
            const rejectedAttendanceIds = new Set(
                rejectedIds
                    .filter((entryId) => String(entryId).startsWith('attendance:'))
                    .map((entryId) => String(entryId).slice('attendance:'.length))
            );

            return prev.map((log) => {
                if (status === 'APPROVED') {
                    return { ...log, approvalStatus: 'APPROVED', rejectionReason: undefined };
                }

                if (type === 'PARTIAL') {
                    if (!rejectedAttendanceIds.has(String(log._id))) {
                        return log;
                    }
                    return { ...log, approvalStatus: 'REJECTED', rejectionReason };
                }

                return { ...log, approvalStatus: 'REJECTED', rejectionReason };
            });
        });
    }, []);

    const submitRejection = async () => {
        if (!rejectReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }
        if (rejectionType === 'PARTIAL' && rejectedEntryIds.length === 0) {
            toast.error('Please select at least one entry to reject');
            return;
        }

        try {
            await api.put(`/timesheet/${selectedTimesheet._id}/approve`, {
                status: 'REJECTED',
                reason: rejectReason,
                type: rejectionType,
                rejectedEntryIds: rejectionType === 'PARTIAL' ? rejectedEntryIds : []
            });
            toast.success('Timesheet rejection processed');
            applyTimesheetDecisionToCurrentView({
                timesheetId: selectedTimesheet._id,
                status: 'REJECTED',
                rejectionReason: rejectReason,
                type: rejectionType,
                rejectedIds: rejectionType === 'PARTIAL' ? rejectedEntryIds : []
            });
            setShowRejectModal(false);
            fetchApprovals();
            await refreshTimesheetData(true); // Silent Refresh
        } catch {
            toast.error('Failed to process rejection');
        }
    };

    // Edit/Regularize Logic
    const [entryToEdit, setEntryToEdit] = useState(null);
    const [editHours, setEditHours] = useState(0);
    const [editMinutes, setEditMinutes] = useState(0);
    const [editDescription, setEditDescription] = useState('');
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    // Enhanced Edit State
    const [editProjectId, setEditProjectId] = useState('');
    const [editModuleId, setEditModuleId] = useState('');
    const [editTaskId, setEditTaskId] = useState('');
    const [editFilteredModules, setEditFilteredModules] = useState([]);
    const [editFilteredTasks, setEditFilteredTasks] = useState([]);

    const resolvedSelectedUserAttendanceMode = (
        viewUser?.attendanceMode === 'present_only'
        || user?.attendanceMode === 'present_only'
        || user?.company?.settings?.attendance?.defaultAttendanceMode === 'present_only'
    )
        ? 'present_only'
        : (
            viewUser?.attendanceMode
            || user?.attendanceMode
            || user?.company?.settings?.attendance?.defaultAttendanceMode
            || 'clock_in_out'
        );

    const isPresentOnlyUser = resolvedSelectedUserAttendanceMode === 'present_only';
    const isPresentOnlyAttendanceEditor = entryToEdit?.type === 'ATTENDANCE_CREATE_PRESENT_ONLY'
        || (entryToEdit?.type === 'ATTENDANCE' && isPresentOnlyAttendance(entryToEdit));

    // New Entry State
    const [isAddingEntry, setIsAddingEntry] = useState(false);
    const [newEntry, setNewEntry] = useState({
        projectId: '',
        moduleId: '',
        taskId: '',
        hours: '',
        minutes: '',
        description: ''
    });
    const [filteredModules, setFilteredModules] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [availableProjects, setAvailableProjects] = useState([]);

    const handleEditClick = (entry) => {
        if (!isEditableTimesheetStatus) {
            toast.error('Submitted timesheets cannot be edited');
            return;
        }
        setEntryToEdit(entry);

        // Parse decimal hours to H:M
        const total = parseFloat(entry.hours) || 0;
        const h = Math.floor(total);
        const m = Math.round((total - h) * 60);

        setEditHours(h);
        setEditMinutes(m);
        setEditDescription(entry.description || '');

        // Fix: Also open the cell so the edit form is visible
        if (entry.date && entry.project) {
            const entryDate = new Date(entry.date);
            const dateKey = format(entryDate, 'yyyy-MM-dd');
            const pid = entry.project._id || entry.project;

            // Find all logs for this cell to populate the view
            const logsForCell = timesheet.entries.filter(e => {
                const eDateKey = format(new Date(e.date), 'yyyy-MM-dd');
                const ePid = e.project._id || e.project;
                return eDateKey === dateKey && ePid === pid;
            });

            setSelectedCell({
                date: entryDate,
                project: entry.project,
                logs: logsForCell
            });
        }

        if (entry.startTime && entry.endTime) {
            setEditStartTime(entry.startTime);
            setEditEndTime(entry.endTime);
        } else {
            const entryDateKey = format(new Date(entry.date), 'yyyy-MM-dd');
            const log = attendanceLogs.find(l => format(new Date(l.date), 'yyyy-MM-dd') === entryDateKey);

            if (log && log.clockIn && log.clockOut) {
                const fmtTime = (dateStr) => {
                    const d = new Date(dateStr);
                    return d.toTimeString().substring(0, 5);
                };
                setEditStartTime(fmtTime(log.clockIn));
                setEditEndTime(fmtTime(log.clockOut));
            } else {
                setEditStartTime('');
                setEditEndTime('');
            }
        }

        // Initialize Hierarchy Selectors for Edit
        if (entry.type !== 'ATTENDANCE' && entry.type !== 'ATTENDANCE_CREATE') {
            const pid = entry.project?._id || entry.project;
            const mid = entry.module?._id || entry.module;
            const tid = entry.task?._id || entry.task;

            setEditProjectId(pid || '');
            setEditModuleId(mid || '');
            setEditTaskId(tid || '');

            // Fetch dependent dropdowns
            if (pid) {
                api.get(`/projects/${pid}/modules`, { params: { userId: effectiveUserId } }).then(res => setEditFilteredModules(res.data));
            }
            if (mid) {
                api.get(`/projects/tasks`, { params: { moduleId: mid, userId: effectiveUserId } }).then(res => setEditFilteredTasks(res.data));
            }
        }
    };

    const handleEditProjectChange = async (projectId) => {
        setEditProjectId(projectId);
        setEditModuleId('');
        setEditTaskId('');
        setEditFilteredModules([]);
        setEditFilteredTasks([]);
        if (projectId) {
            try {
                const res = await api.get(`/projects/${projectId}/modules`, { params: { userId: effectiveUserId } });
                setEditFilteredModules(res.data);
            } catch (error) { console.error(error); }
        }
    };

    const handleEditModuleChange = async (moduleId) => {
        setEditModuleId(moduleId);
        setEditTaskId('');
        setEditFilteredTasks([]);
        if (moduleId) {
            try {
                const res = await api.get(`/projects/tasks`, { params: { moduleId, userId: effectiveUserId } });
                setEditFilteredTasks(res.data);
            } catch (error) { console.error(error); }
        }
    };

    // Capture browser geolocation. Resolves to { lat, lng, accuracy } or null when denied/unavailable.
    const getCurrentLocation = () => new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
            () => resolve(null),
            { timeout: 5000, maximumAge: 60000 }
        );
    });

    // Smart wrapper: if requireLocationTimesheet is enabled for this company and location is unavailable,
    // throws an error so the submission is blocked with a user-facing message.
    const getLocationForTimesheet = async () => {
        const location = await getCurrentLocation();
        const requireLocation = user?.company?.settings?.attendance?.requireLocationTimesheet;
        if (requireLocation && !location) {
            throw new Error('Location access is required to mark attendance from the timesheet. Please enable location permissions in your browser and try again.');
        }
        return location;
    };


    const submitEdit = async () => {
        try {
            setIsSaving(true);
            if (!isEditableTimesheetStatus) {
                toast.error('Submitted timesheets cannot be edited');
                return;
            }
            // Validation: Check Joining Date
            const targetDate = startOfDay(new Date(entryToEdit.date));
            const joiningDate = viewUser?.joiningDate ? startOfDay(new Date(viewUser.joiningDate)) : null;
            if (joiningDate && targetDate < joiningDate) {
                toast.error('Cannot edit timesheet before joining date');
                return;
            }

            let updatedAttendance = null;
            let updatedEntry = null;

            if (entryToEdit.type === 'ATTENDANCE_CREATE_PRESENT_ONLY') {
                const location = await getLocationForTimesheet();
                updatedAttendance = (await api.post('/attendance', {
                    date: entryToEdit.date,
                    userId: targetUserId || undefined,
                    source: 'timesheet',
                    ...(location ? { location } : {})
                })).data;
                toast.success('Attendance marked as present');

            } else if (entryToEdit.type === 'ATTENDANCE_CREATE') {
                if (!editStartTime || !editEndTime) {
                    toast.error('Both Check-In and Check-Out times are required');
                    return;
                }
                // Create New
                const baseDate = format(new Date(entryToEdit.date), 'yyyy-MM-dd');

                // Construct Dates
                const inTime = editStartTime ? new Date(`${baseDate}T${editStartTime}:00`) : null; // Append seconds
                const outTime = editEndTime ? new Date(`${baseDate}T${editEndTime}:00`) : null;

                if ((editStartTime && isNaN(inTime.getTime())) || (editEndTime && isNaN(outTime.getTime()))) {
                    toast.error('Invalid time format');
                    return;
                }

                const location = await getLocationForTimesheet();
                updatedAttendance = (await api.post('/attendance', {
                    date: entryToEdit.date,
                    clockIn: inTime, // Axios will serialize to ISO string
                    clockOut: outTime,
                    userId: targetUserId || undefined,
                    source: 'timesheet',
                    ...(location ? { location } : {})
                })).data;
                toast.success('Attendance created');

            } else if (entryToEdit.type === 'ATTENDANCE' && isPresentOnlyAttendance(entryToEdit)) {
                const location = await getLocationForTimesheet();
                updatedAttendance = (await api.put(`/attendance/${entryToEdit._id}`, {
                    source: 'timesheet',
                    ...(location ? { location } : {})
                })).data;
                toast.success('Attendance marked as present');
            } else if (entryToEdit.type === 'ATTENDANCE') {
                // Update Existing
                // Formatting dates back to ISO with correct date
                const baseDate = format(new Date(entryToEdit.date), 'yyyy-MM-dd');

                const inTime = editStartTime ? new Date(`${baseDate}T${editStartTime}:00`) : null;
                const outTime = editEndTime ? new Date(`${baseDate}T${editEndTime}:00`) : null;

                if ((editStartTime && isNaN(inTime.getTime())) || (editEndTime && isNaN(outTime.getTime()))) {
                    toast.error('Invalid time format');
                    return;
                }

                const location = await getLocationForTimesheet();
                updatedAttendance = (await api.put(`/attendance/${entryToEdit._id}`, {
                    clockIn: inTime,
                    clockOut: outTime,
                    source: 'timesheet',
                    ...(location ? { location } : {})
                })).data;
                toast.success('Attendance updated');
            } else {
                const h = parseFloat(editHours) || 0;
                const m = parseFloat(editMinutes) || 0;
                const totalHours = h + (m / 60);

                updatedEntry = (await api.put(`/timesheet/entry/${entryToEdit._id}`, {
                    hours: totalHours.toFixed(2),
                    description: editDescription,
                    startTime: editStartTime,
                    endTime: editEndTime,
                    // Send hierarchy updates
                    projectId: editProjectId,
                    moduleId: editModuleId,
                    taskId: editTaskId
                })).data;
                toast.success('Entry updated');
            }
            setEntryToEdit(null);

            // Local Sync for immediate UI feedback
            if (updatedAttendance) {
                upsertAttendanceLog(updatedAttendance);
            } else if (updatedEntry) {
                upsertTimesheetEntry(updatedEntry);
            }

            await refreshTimesheetData(true); // Silent Refresh
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || error.message || 'Failed to update entry');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteAttendanceEntry = async () => {
        if (!entryToEdit?._id) return;
        if (!window.confirm('Remove this attendance mark for the selected day?')) return;

        try {
            setIsDeleting(true);
            await api.delete(`/attendance/${entryToEdit._id}`);
            setAttendanceLogs(prev => prev.filter(log => log._id !== entryToEdit._id));
            setEntryToEdit(null);
            toast.success('Attendance deleted');
            await refreshTimesheetData(true);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to delete attendance');
        } finally {
            setIsDeleting(false);
        }
    };

    const fetchApprovals = async () => {
        try {
            setLoadingApprovals(true);
            // Fetch Timesheet Approvals instead of Attendance
            const res = await api.get('/timesheet/approvals');
            setPendingApprovals(res.data);
        } catch (error) {
            console.error('Fetch approvals failed', error);
        } finally {
            setLoadingApprovals(false);
        }
    };

    const handleApprove = async (ts, status) => {
        if (status === 'REJECTED') {
            handleRejectClick(ts);
            return;
        }

        if (!window.confirm(`Are you sure you want to ${status} this timesheet?`)) return;
        try {
            await api.put(`/timesheet/${ts._id}/approve`, { status });
            toast.success(`Timesheet ${status.toLowerCase()}`);

            applyTimesheetDecisionToCurrentView({
                timesheetId: ts._id,
                status,
                rejectionReason: ''
            });
            fetchApprovals(); // Refresh list
            await refreshTimesheetData(true); // Silent Refresh
        } catch {
            toast.error('Action failed');
        }
    };

    useEffect(() => {
        if (canApprove && activeTab === 'approvals') {
            fetchApprovals();
        }
    }, [activeTab, canApprove]);


    // Identification already handled at the top

    const getCurrentTimesheetCacheKey = () => {
        const formattedMonth = getTimesheetPeriodId(viewDate, cycle);

        return `timesheet_${user?._id}_${targetUserId || 'self'}_${formattedMonth}_${cycle}`;
    };

    const fetchData = useCallback(async (options = {}) => {
        const skipCache = typeof options === 'boolean' ? options : !!options.skipCache;
        const silent = typeof options === 'object' ? !!options.silent : false;

        const formattedMonth = getTimesheetPeriodId(viewDate, cycle);

        // Cache Key: Scoped by User, Period, and Cycle
        const CACHE_KEY = `timesheet_${user?._id}_${targetUserId || 'self'}_${formattedMonth}_${cycle}`;

        const readCache = () => {
            const parsed = readSessionCache(CACHE_KEY);
            const data = parsed?.data || parsed;
            if (!data || !data.timesheet) {
                sessionStorage.removeItem(CACHE_KEY);
                return null;
            }
            return parsed;
        };

        const writeCache = (data, fingerprint) => {
            try {
                const minimalTimesheet = data.timesheet ? {
                    _id: data.timesheet._id,
                    status: data.timesheet.status,
                    rejectionReason: data.timesheet.rejectionReason,
                    user: data.timesheet.user,
                    userDetails: data.timesheet.userDetails,
                    entries: (data.timesheet.entries || []).map(entry => ({
                        _id: entry._id,
                        date: entry.date,
                        project: entry.project,
                        module: entry.module,
                        task: entry.task,
                        taskName: entry.taskName,
                        hours: entry.hours,
                        description: entry.description,
                        status: entry.status,
                        rejectionReason: entry.rejectionReason,
                        startTime: entry.startTime,
                        endTime: entry.endTime,
                        type: entry.type
                    })),
                    attendanceLog: (data.timesheet.attendanceLog || []).map(l => ({
                        _id: l._id,
                        date: l.date,
                        clockIn: l.clockIn,
                        clockOut: l.clockOut,
                        clockInIST: l.clockInIST,
                        clockOutIST: l.clockOutIST,
                        duration: l.duration,
                        attendanceMode: l.attendanceMode,
                        maxWorkingHours: l.maxWorkingHours,
                        status: l.status,
                        approvalStatus: l.approvalStatus
                    }))
                } : null;

                const payload = createCachePayload({
                    timesheet: minimalTimesheet,
                    attendanceLogs: minimalTimesheet?.attendanceLog || [],
                    projects: data.projects || [],
                    holidays: data.holidays || [],
                    approvedLeaves: data.approvedLeaves || [],
                    weeklyOff: data.weeklyOff || ['Sunday'],
                    usersList: data.usersList || []
                }, fingerprint);

                sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
            } catch (e) {
                console.error("Timesheet Cache Write Failed:", e);
            }
        };

        const buildFingerprint = (data) => {
            const payload = data?.data || data;
            if (!payload) return '';
            const tsPart = `${payload.timesheet?._id}:${payload.timesheet?.status}:${payload.timesheet?.entries?.length || 0}`;
            const logPart = (payload.attendanceLogs || payload.timesheet?.attendanceLog)?.map(
                l => `${l._id}:${l.clockIn}:${l.clockOut}:${l.duration}:${l.attendanceMode || ''}:${l.maxWorkingHours || ''}:${l.approvalStatus || ''}`
            ).join('|') || '';
            const holidayPart = (payload.holidays || []).map(
                h => `${h.date}:${h.name}:${h.isOptional ? '1' : '0'}`
            ).join('|');
            const leavePart = (payload.approvedLeaves || []).map(
                leave => `${leave._id || `${leave.startDate}-${leave.endDate}`}:${leave.leaveType}:${leave.startDate}:${leave.endDate}:${leave.isHalfDay ? '1' : '0'}`
            ).join('|');
            const weeklyOffPart = (payload.weeklyOff || []).join('|');
            return `${tsPart}#${logPart}#${holidayPart}#${leavePart}#${weeklyOffPart}`;
        };

        const applyData = (data) => {
            const payload = data?.data || data;
            if (payload.timesheet) {
                setTimesheet(payload.timesheet);
                setAttendanceLogs(payload.attendanceLogs || payload.timesheet.attendanceLog || []);
                setViewUser(payload.timesheet.userDetails || payload.timesheet.user || user);
            }
            if (payload.projects) {
                setProjects(payload.projects);
                setAvailableProjects(payload.projects);
            }
            if (payload.holidays) setHolidays(payload.holidays);
            if (payload.approvedLeaves) setApprovedLeaves(payload.approvedLeaves);
            if (payload.weeklyOff) setWeeklyOffs(payload.weeklyOff);
            if (payload.usersList) setUsersList(payload.usersList);
        };

        const cached = skipCache ? null : readCache();

        // 1. Show cached data instantly
        if (!skipCache && cached?.data) {
            applyData(cached.data);
            setLoading(false);
            if (isCacheFresh(cached, TIMESHEET_CACHE_TTL_MS)) return;
        } else if (skipCache && (timesheetRef.current || silent)) {
            // Background refresh - don't show loading spinner if we already have data or silent is requested
        } else {
            setLoading(true);
        }

        try {
            const requestParams = {
                month: formattedMonth,
                monthNumber: viewDate.getMonth() + 1,
                year: viewDate.getFullYear(),
                userId: targetUserId || undefined
            };

            if (skipCache) {
                requestParams._fresh = Date.now();
            }

            const payload = (await api.get('/timesheet/bootstrap', {
                params: requestParams,
                headers: skipCache ? { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } : undefined
            })).data;

            const freshFingerprint = buildFingerprint(payload);
            const cachedFingerprint = cached?.fingerprint || (readCache()?.fingerprint || '');

            if (freshFingerprint !== cachedFingerprint) {
                applyData(payload);
                writeCache(payload, freshFingerprint);
            } else {
                writeCache(payload, freshFingerprint);
            }
        } catch (error) {
            console.error('Timesheet fetch error', error);
            if (!cached?.data && !silent) toast.error('Failed to load timesheet');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [cycle, targetUserId, user, viewDate]);

    const refreshTimesheetData = async (silent = false) => {
        // When silent, we don't clear cache manually, fetchData will overwrite it
        if (!silent) sessionStorage.removeItem(getCurrentTimesheetCacheKey());
        await fetchData({ skipCache: true, silent });
    };

    // Load Modules/Tasks when Project Changes for New Entry
    const handleProjectChange = async (projectId) => {
        setNewEntry(prev => ({ ...prev, projectId, moduleId: '', taskId: '' }));
        if (!projectId) {
            setFilteredModules([]);
            return;
        }
        try {
            const res = await api.get(`/projects/${projectId}/modules`, { params: { userId: effectiveUserId } });
            setFilteredModules(res.data);
        } catch (error) {
            console.error("Failed to fetch modules", error);
        }
    };

    const handleModuleChange = async (moduleId) => {
        setNewEntry(prev => ({ ...prev, moduleId, taskId: '' }));
        if (!moduleId) {
            setFilteredTasks([]);
            return;
        }
        try {
            // Check getTasks API signature in projectController.
            // It accepts moduleId query param.
            const res = await api.get(`/projects/tasks`, { params: { moduleId, userId: effectiveUserId } });
            setFilteredTasks(res.data);
        } catch (error) {
            console.error("Failed to fetch tasks", error);
        }
    };

    const submitNewEntry = async () => {
        if (!isEditableTimesheetStatus) {
            toast.error('Submitted timesheets cannot be edited');
            return;
        }
        const h = parseFloat(newEntry.hours) || 0;
        const m = parseFloat(newEntry.minutes) || 0;
        const totalHours = h + (m / 60);

        if (!newEntry.projectId || totalHours <= 0 || !newEntry.date) {
            toast.error("Project, valid Duration (hours/minutes) and Date are required");
            return;
        }
        if (!newEntry.taskId && !newEntry.moduleId) {
            // toast.warning("Task is recommended");
        }

        try {
            setIsSaving(true);
            const normalizedEntryDate = getLocalDateInputValue(newEntry.date);
            const createdEntry = (await api.post('/timesheet/entry', {
                date: normalizedEntryDate,
                hours: totalHours.toFixed(2), // Send total
                description: newEntry.description,
                projectId: newEntry.projectId,
                moduleId: newEntry.moduleId,
                taskId: newEntry.taskId,
                userId: targetUserId || undefined // Pass target user ID if Admin view
            })).data;
            toast.success("Work Log Added");
            setIsAddingEntry(false);
            setNewEntry({ projectId: '', moduleId: '', taskId: '', hours: '', minutes: '', description: '', date: '' });
            setTimesheet(prev => {
                if (!prev) return prev;

                const nextEntries = [...(prev.entries || []), createdEntry].sort((left, right) => new Date(left.date) - new Date(right.date));
                return { ...prev, entries: nextEntries };
            });
            await refreshTimesheetData(true); // Silent Refresh
            // Update selected cell logs? fetchData will update timesheet, but we might need to locally update selectedCell or close it.
            // Closing it is easiest to ensure consistency.
            setSelectedCell(null);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to add entry");
        } finally {
            setIsSaving(false);
        }
    };

    const fetchAttachments = useCallback(async () => {
        if (activeTab !== 'attendance_documents') return;
        try {
            setLoadingAttachments(true);
            const periodId = getTimesheetPeriodId(viewDate, cycle);
            const res = await api.get(`/attendance/attachments/${effectiveUserId}/${periodId}`);
            setAttachments(res.data || { files: [] });
        } catch (error) {
            console.error('Failed to fetch attachments:', error);
            toast.error('Failed to load documents');
        } finally {
            setLoadingAttachments(false);
        }
    }, [activeTab, cycle, effectiveUserId, viewDate]);

    useEffect(() => {
        fetchAttachments();
    }, [fetchAttachments]);

    const handleUploadAttachment = async (file) => {
        try {
            const loadingToast = toast.loading('Uploading document...');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('month', getTimesheetPeriodId(viewDate, cycle));
            if (targetUserId) {
                formData.append('userId', targetUserId);
            }

            await api.post(`/attendance/attachments/${effectiveUserId}/${getTimesheetPeriodId(viewDate, cycle)}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Document uploaded successfully', { id: loadingToast });
            fetchAttachments();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to upload document');
        }
    };

    const handleDeleteAttachment = async (fileId) => {
        if (!window.confirm('Are you sure you want to delete this document?')) return;
        try {
            const loadingToast = toast.loading('Deleting document...');
            await api.delete(`/attendance/attachments/${effectiveUserId}/${getTimesheetPeriodId(viewDate, cycle)}/${fileId}`);
            toast.success('Document deleted', { id: loadingToast });
            fetchAttachments();
        } catch {
            toast.error('Failed to delete document');
        }
    };

    const handleSubmitAttachment = async (fileId) => {
        try {
            const loadingToast = toast.loading('Submitting document...');
            await api.put(`/attendance/attachments/${effectiveUserId}/${getTimesheetPeriodId(viewDate, cycle)}/${fileId}/submit`);
            toast.success('Document submitted for approval', { id: loadingToast });
            fetchAttachments();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit document');
        }
    };

    const handleReviewAttachment = async (fileId, status, reason = '') => {
        try {
            const action = status === 'Approved' ? 'Approving' : 'Rejecting';
            const loadingToast = toast.loading(`${action} document...`);
            await api.put(`/attendance/attachments/${effectiveUserId}/${getTimesheetPeriodId(viewDate, cycle)}/${fileId}/review`, { status, reason });
            toast.success(`Document ${status.toLowerCase()}`, { id: loadingToast });
            fetchAttachments();
        } catch (error) {
            toast.error(error.response?.data?.message || `Failed to ${status.toLowerCase()} document`);
        }
    };

    const handleReplaceAttachment = async (fileId, newFile) => {
        let loadingToast;

        try {
            const formData = new FormData();
            formData.append('file', newFile);

            loadingToast = toast.loading('Replacing document...');
            await api.put(`/attendance/attachments/${effectiveUserId}/${getTimesheetPeriodId(viewDate, cycle)}/${fileId}/replace`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Document replaced successfully', { id: loadingToast });
            fetchAttachments();
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to replace document';

            if (loadingToast) {
                toast.error(message, { id: loadingToast });
                return;
            }

            toast.error(message);
        }
    };

    const handleUserChange = (e) => {
        const selectedId = e.target.value;
        if (!selectedId) {
            updateRouteContext({ userId: '', name: '' });
            return;
        }

        const selectedUser = usersList.find(u => u._id === selectedId);
        if (selectedUser) {
            updateRouteContext({
                userId: selectedId,
                name: `${selectedUser.firstName} ${selectedUser.lastName}`
            });
        }
    };

    useEffect(() => {
        const fetchKey = `${targetUserId || 'self'}::${getTimesheetPeriodId(viewDate, cycle)}::${cycle}`;
        if (lastFetchKeyRef.current === fetchKey) return;
        lastFetchKeyRef.current = fetchKey;

        fetchData();

        // Background polling for real-time timesheet status/entry updates
        const pollInterval = setInterval(() => fetchData({ skipCache: true, silent: true }), 30000);
        return () => clearInterval(pollInterval);
    }, [cycle, fetchData, targetUserId, viewDate]); // Re-fetch when month or user changes

    // Generate days for current view (Monthly)
    const visibleDays = getVisibleDaysForCycle(viewDate, cycle);

    // State for Details Modal
    const [selectedCell, setSelectedCell] = useState(null); // { date: Date, project: ProjectObj, logs: [] }

    useEffect(() => {
        if (!selectedCell || !timesheet?.entries) return;

        const dateKey = format(new Date(selectedCell.date), 'yyyy-MM-dd');
        const selectedProjectId = selectedCell.project?._id || selectedCell.project;
        const refreshedLogs = timesheet.entries.filter(entry => {
            const entryDateKey = format(new Date(entry.date), 'yyyy-MM-dd');
            const entryProjectId = entry.project?._id || entry.project;
            return entryDateKey === dateKey && String(entryProjectId) === String(selectedProjectId);
        });

        const hasSameLogs = buildCellLogFingerprint(selectedCell.logs) === buildCellLogFingerprint(refreshedLogs);
        if (hasSameLogs) return;

        setSelectedCell(prev => prev ? { ...prev, logs: refreshedLogs } : prev);
    }, [selectedCell, timesheet]);


    // Group entries by Project
    const getEntriesByProject = () => {
        if (!timesheet || !timesheet.entries) return {};
        const groups = {};

        timesheet.entries.forEach(entry => {
            const pid = entry.project._id || entry.project; // Handle populated or id
            if (!groups[pid]) {
                groups[pid] = {
                    project: entry.project,
                    hours: {}, // Key: YYYY-MM-DD, Value: Total Hours
                    logs: {}   // Key: YYYY-MM-DD, Value: [Entries]
                };
            }
            const dateKey = format(new Date(entry.date), 'yyyy-MM-dd');

            // Sum hours
            const current = groups[pid].hours[dateKey] || 0;
            groups[pid].hours[dateKey] = current + entry.hours;

            // Store logs
            if (!groups[pid].logs[dateKey]) groups[pid].logs[dateKey] = [];
            groups[pid].logs[dateKey].push(entry);
        });

        return groups;
    };

    const projectGroups = getEntriesByProject();

    const handleCellClick = (project, date, logs = [], force = false) => {
        if (!force && logs.length === 0) return;
        setEntryToEdit(null); // Reset edit state when switching cells
        setSelectedCell({
            project,
            date,
            logs
        });
    };

    // Calculate Total per day
    const getTotalPerDay = (date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        let total = 0;
        Object.values(projectGroups).forEach(group => {
            if (group.hours[dateKey]) total += group.hours[dateKey];
        });
        return total;
    };

    const handleSubmit = async () => {

        if (!window.confirm('Are you sure you want to submit this timesheet for approval? You cannot edit it afterwards.')) {
            return;
        }
        try {
            const formattedMonth = getTimesheetPeriodId(viewDate, cycle);
            await api.post('/timesheet/submit', { month: formattedMonth });
            toast.success('Timesheet Submitted Successfully');
            // Local State Update
            if (timesheet) {
                setTimesheet({ ...timesheet, status: 'SUBMITTED', submittedAt: new Date().toISOString() });
            }
            await refreshTimesheetData(true); // Silent Refresh
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to submit timesheet');
        }
    };

    const handleExport = async () => {
        if (!timesheet) return;

        const workbook = new ExcelJS.Workbook();

        // --- SHEET 1: WORK LOGS (HIERARCHICAL) ---
        const wsLogs = workbook.addWorksheet('Detailed Report');

        // Columns setup
        wsLogs.columns = [
            { header: 'Item Name / Description', key: 'name', width: 50 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Hours', key: 'hours', width: 10 },
            { header: 'Start Time', key: 'start', width: 12 },
            { header: 'End Time', key: 'end', width: 12 },
            { header: 'Client', key: 'client', width: 20 },
        ];

        // Header Styling
        const headerRow = wsLogs.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } }; // Dark Blue
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        // --- 0. SUMMARY ROW (Inserted at top) ---
        // Debugging: Check what we received
        const u = timesheet.userDetails || timesheet.user || {};
        const managers = u.reportingManagers || [];
        console.log('Export Debug - User:', u);

        wsLogs.insertRow(1, { name: 'Timesheet Report' });
        wsLogs.insertRow(2, {
            name: `Employee: ${u.firstName || u.email || 'Unknown'} ${u.lastName || ''}`
        });
        wsLogs.insertRow(3, {
            name: `Supervisor(s): ${managers.length > 0 ? managers.map(m => `${m.firstName} ${m.lastName}`).join(', ') : 'N/A'}`
        });
        wsLogs.insertRow(4, { name: '' }); // Spacer

        // Style Summary
        wsLogs.getRow(1).font = { bold: true, size: 16 };
        wsLogs.getRow(2).font = { size: 12 };
        wsLogs.getRow(3).font = { size: 12 };

        // Fix Header Row Index after insertion (Original Row 1 is now Row 5)
        const newHeaderRow = wsLogs.getRow(5);
        newHeaderRow.values = ['Item Name / Description', 'Status', 'Date', 'Hours', 'Start Time', 'End Time', 'Client'];
        newHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
        newHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
        newHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };

        // 1. Group Data: Project -> Module -> Task -> Logs
        const hierarchy = {};

        timesheet.entries.forEach(entry => {
            const pId = entry.project?._id || entry.project || 'UNKNOWN_PROJECT';
            const pName = entry.project?.name || 'Unknown Project';
            const clientName = entry.project?.client?.name || 'Internal';

            if (!hierarchy[pId]) {
                hierarchy[pId] = { name: pName, client: clientName, modules: {}, totalHours: 0 };
            }
            hierarchy[pId].totalHours += entry.hours;

            const mId = entry.module?._id || 'NO_MODULE';
            const mName = entry.module?.name || 'General / No Module';

            if (!hierarchy[pId].modules[mId]) {
                hierarchy[pId].modules[mId] = { name: mName, tasks: {}, totalHours: 0 };
            }
            hierarchy[pId].modules[mId].totalHours += entry.hours;

            const tId = entry.task?._id || 'NO_TASK';
            const tName = entry.task?.name || entry.taskName || 'General Task';

            if (!hierarchy[pId].modules[mId].tasks[tId]) {
                hierarchy[pId].modules[mId].tasks[tId] = { name: tName, logs: [], totalHours: 0 };
            }
            hierarchy[pId].modules[mId].tasks[tId].totalHours += entry.hours;
            hierarchy[pId].modules[mId].tasks[tId].logs.push(entry);
        });

        // 2. Build Rows
        Object.values(hierarchy).forEach(proj => {
            // Level 0: Project
            const pRow = wsLogs.addRow({
                name: `PROJECT: ${proj.name}`,
                status: '',
                date: '',
                hours: proj.totalHours,
                start: '',
                end: '',
                client: proj.client
            });
            pRow.outlineLevel = 0;
            pRow.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
            pRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC5D9F1' } }; // Light Blue

            Object.values(proj.modules).forEach(mod => {
                // Level 1: Module
                const mRow = wsLogs.addRow({
                    name: `  MODULE: ${mod.name}`,
                    status: '',
                    date: '',
                    hours: mod.totalHours,
                    start: '',
                    end: '',
                    client: ''
                });
                mRow.outlineLevel = 1;
                mRow.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
                mRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }; // Pale Blue

                Object.values(mod.tasks).forEach(task => {
                    // Level 2: Task
                    const tRow = wsLogs.addRow({
                        name: `    TASK: ${task.name}`,
                        status: '',
                        date: '',
                        hours: task.totalHours,
                        start: '',
                        end: '',
                        client: ''
                    });
                    tRow.outlineLevel = 2;
                    tRow.font = { bold: true, color: { argb: 'FF44546A' } };
                    tRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } }; // Light Green

                    task.logs.forEach(log => {
                        // Level 3: Work Log
                        const lRow = wsLogs.addRow({
                            name: `      ${log.description || '(No Description)'}`,
                            status: log.status || 'Draft',
                            date: format(new Date(log.date), 'yyyy-MM-dd'),
                            hours: log.hours,
                            start: log.startTime || '-',
                            end: log.endTime || '-',
                            client: ''
                        });
                        lRow.outlineLevel = 3;
                        lRow.font = { italic: false, color: { argb: 'FF444444' } };
                        lRow.getCell('name').alignment = { indent: 2 }; // Visual Indent

                        if (log.status === 'REJECTED') {
                            lRow.font = { color: { argb: 'FFFF0000' }, strike: true };
                            lRow.getCell('status').font = { bold: true, color: { argb: 'FFFF0000' } };
                        }
                    });
                });
            });
        });

        // Auto-Filter
        wsLogs.autoFilter = { from: 'A1', to: { row: 1, column: 7 } };


        // --- SHEET 2: ATTENDANCE (Same as before) ---
        const wsAtt = workbook.addWorksheet('Attendance');
        wsAtt.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Check In', key: 'in', width: 15 },
            { header: 'Check Out', key: 'out', width: 15 },
            { header: 'Duration (Hrs)', key: 'duration', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
        ];

        const attHeader = wsAtt.getRow(1);
        attHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        attHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF228B22' } }; // Green
        attHeader.alignment = { vertical: 'middle', horizontal: 'center' };

        attendanceLogs.forEach(log => {
            const inTime = log.clockIn ? new Date(log.clockIn) : null;
            const outTime = log.clockOut ? new Date(log.clockOut) : null;
            const durationHours = getAttendanceHoursValue(log);

            wsAtt.addRow({
                date: format(new Date(log.date), 'yyyy-MM-dd'),
                in: isPresentOnlyAttendance(log) ? 'Present' : (inTime ? format(inTime, 'HH:mm:ss') : '-'),
                out: isPresentOnlyAttendance(log) ? 'Present' : (outTime ? format(outTime, 'HH:mm:ss') : '-'),
                duration: isPresentOnlyAttendance(log) ? 'Present' : (durationHours > 0 ? durationHours.toFixed(2) : '-'),
                status: isPresentOnlyAttendance(log) ? 'Present Only' : ((inTime && outTime) ? 'Present' : 'Incomplete')
            });
        });

        // Export
        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `Timesheet_${targetUserName || 'User'}_${format(viewDate, 'MMM_yyyy')}_Detailed.xlsx`;
        saveAs(new Blob([buffer]), fileName);
    };


    const getResolvedTimesheetEntryStatus = (status) => {
        if (timesheet?.status === 'APPROVED') return 'APPROVED';
        if (isFullyRejectedTimesheet(timesheet)) return 'REJECTED';
        return status || 'PENDING';
    };

    const getLogStatusMeta = (status) => {
        const resolvedStatus = getResolvedTimesheetEntryStatus(status);

        if (resolvedStatus === 'REJECTED') {
            return {
                label: 'Rejected',
                badgeClass: 'bg-red-100 text-red-700 ring-1 ring-red-500 group-hover/cell:bg-red-600 group-hover/cell:text-white',
                pillClass: 'bg-red-100 text-red-700'
            };
        }
        if (resolvedStatus === 'APPROVED') {
            return {
                label: 'Approved',
                badgeClass: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-400 group-hover/cell:bg-emerald-600 group-hover/cell:text-white',
                pillClass: 'bg-emerald-100 text-emerald-700'
            };
        }
        return {
            label: 'Pending',
            badgeClass: 'bg-slate-200 text-slate-800 ring-1 ring-slate-300 group-hover/cell:bg-slate-700 group-hover/cell:text-white',
            pillClass: 'bg-slate-100 text-slate-700'
        };
    };

    const getDayStatusMeta = (logs = []) => {
        if (timesheet?.status === 'APPROVED' && logs.length > 0) return getLogStatusMeta('APPROVED');
        if (isFullyRejectedTimesheet(timesheet) && logs.length > 0) return getLogStatusMeta('REJECTED');
        if (logs.some(log => getResolvedTimesheetEntryStatus(log.status) === 'REJECTED')) return getLogStatusMeta('REJECTED');
        if (logs.length > 0 && logs.every(log => getResolvedTimesheetEntryStatus(log.status) === 'APPROVED')) return getLogStatusMeta('APPROVED');
        return getLogStatusMeta('PENDING');
    };

    const getAttendanceStatusMeta = (record) => {
        if (!record) {
            return { label: 'Absent', chipClass: 'bg-red-100 text-red-700' };
        }

        if (record.clockIn && !record.clockOut) {
            return { label: 'Incomplete', chipClass: 'bg-red-100 text-red-700' };
        }

        const resolvedApprovalStatus = (timesheet?.status === 'APPROVED' ? 'APPROVED' : null)
            || (isFullyRejectedTimesheet(timesheet) ? 'REJECTED' : null)
            || record.approvalStatus
            || 'PENDING';

        if (resolvedApprovalStatus === 'REJECTED') {
            return { label: 'Rejected', chipClass: 'bg-red-100 text-red-700' };
        }

        if (resolvedApprovalStatus === 'APPROVED') {
            return { label: 'Approved', chipClass: 'bg-emerald-100 text-emerald-700' };
        }

        return { label: 'Pending', chipClass: 'bg-amber-100 text-amber-700' };
    };

    return (
        <div className={`${isEmbedded ? 'w-full' : 'min-h-screen bg-slate-100 p-6 md:p-10'} font-sans overflow-x-hidden`}>
            <div className={`w-full ${isEmbedded ? '' : 'max-w-7xl mx-auto space-y-6'} overflow-x-hidden rounded-xl`}>

                {/* Tabs & Header */}
                <div className="flex flex-col space-y-4">
                    <div className="flex justify-between items-center">
                        {!isEmbedded && (
                            <div className="flex space-x-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                                <button
                                    onClick={() => setActiveTab('timesheet')}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'timesheet' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Timesheet View
                                </button>
                                {(canApprove) && (
                                    <button
                                        onClick={() => setActiveTab('approvals')}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center space-x-2 ${activeTab === 'approvals' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <span>Pending Approvals</span>
                                        {pendingApprovals.length > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                                {pendingApprovals.length}
                                            </span>
                                        )}
                                    </button>
                                )}
                                {canViewAttendance && (
                                    <button
                                        onClick={() => setActiveTab('attendance')}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center space-x-2 ${activeTab === 'attendance' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <FileText size={16} />
                                        <span>Attendance View</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* User Picker — visible to Admin, Manager, or timesheet.view permission */}
                        {!isEmbedded && (canViewTimesheets || user?.roles?.includes('Manager')) && usersList.length > 0 && (
                            <div className="flex items-center space-x-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Viewing:</label>
                                <select
                                    onChange={handleUserChange}
                                    value={targetUserId || ''}
                                    className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
                                >
                                    <option value="">— Select User —</option>
                                    {usersList.map(u => (
                                        <option key={u._id} value={u._id}>
                                            {u.firstName} {u.lastName}
                                        </option>
                                    ))}
                                </select>
                                {targetUserId && (
                                    <button
                                        onClick={() => updateRouteContext({ userId: '', name: '' })}
                                        className="text-xs text-blue-600 hover:underline"
                                    >
                                        View Own
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {activeTab === 'timesheet' && (
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                            {loading ? (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <Skeleton className="h-8 w-64 mb-2" />
                                            <Skeleton className="h-4 w-48" />
                                        </div>
                                        <div className="flex space-x-2">
                                            <Skeleton className="h-9 w-24 rounded" />
                                            <Skeleton className="h-9 w-24 rounded" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-[400px] w-full rounded-xl" />
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h1 className="text-2xl font-bold text-slate-800">
                                                {targetUserName ? `${targetUserName}'s Timesheet` : 'Timesheet'}
                                            </h1>
                                            <div className="flex items-center space-x-2 text-sm text-slate-500">
                                                <span>
                                                    {(() => {
                                                        const cycle = getNormalizedTimesheetCycle(user?.company?.settings?.timesheet?.approvalCycle || 'Monthly');
                                                        if (cycle === 'Weekly') return `Week ${format(viewDate, 'II')}, ${format(viewDate, 'yyyy')}`;
                                                        if (cycle === 'Bi-Weekly') return `Bi-Week ${getTimesheetPeriodId(viewDate, cycle).split('-BW')[1]}, ${format(viewDate, 'yyyy')}`;
                                                        if (cycle === 'Daily') return format(viewDate, 'do MMMM yyyy');
                                                        return format(viewDate, 'MMMM yyyy');
                                                    })()}
                                                </span>

                                                <span>•</span>
                                                <span className={`font-bold ${timesheet?.status === 'APPROVED' ? 'text-emerald-600' : timesheet?.status === 'REJECTED' ? 'text-red-600' : 'text-blue-600'}`}>
                                                    {timesheet?.status || 'DRAFT'}
                                                </span>
                                                {timesheet?.submittedAt && (
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        (Submitted: {format(new Date(timesheet.submittedAt), 'dd MMM, hh:mm a')})
                                                    </span>
                                                )}
                                                {targetUserName && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold">Manager View</span>}
                                            </div>
                                        </div>

                                        <div className="flex space-x-3 items-center">
                                            <Button
                                                onClick={() => {
                                                    const cycle = getNormalizedTimesheetCycle(user?.company?.settings?.timesheet?.approvalCycle || 'Monthly');
                                                    if (cycle === 'Weekly') setViewDate(d => subWeeks(d, 1));
                                                    else if (cycle === 'Bi-Weekly') setViewDate(d => addDays(d, -14));
                                                    else if (cycle === 'Daily') setViewDate(d => subDays(d, 1));
                                                    else setViewDate(d => subMonths(d, 1));
                                                }}
                                                variant="secondary"
                                                className="flex items-center space-x-2"
                                            >
                                                <ChevronLeft size={16} /> <span>Prev</span>
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    const cycle = getNormalizedTimesheetCycle(user?.company?.settings?.timesheet?.approvalCycle || 'Monthly');
                                                    if (cycle === 'Weekly') setViewDate(d => addWeeks(d, 1));
                                                    else if (cycle === 'Bi-Weekly') setViewDate(d => addDays(d, 14));
                                                    else if (cycle === 'Daily') setViewDate(d => addDays(d, 1));
                                                    else setViewDate(d => addMonths(d, 1));
                                                }}
                                                variant="secondary"
                                                className="flex items-center space-x-2"
                                            >
                                                <span>Next</span> <ChevronRight size={16} />
                                            </Button>
                                            {(timesheet?.status === 'DRAFT' || timesheet?.status === 'REJECTED') && !targetUserId && canSubmitTimesheet && (
                                                <Button
                                                    onClick={handleSubmit}
                                                    className="flex items-center space-x-2"
                                                >
                                                    <Send size={16} /> <span>{timesheet?.status === 'REJECTED' ? 'Resubmit' : 'Submit'} for Approval</span>
                                                </Button>
                                            )}
                                            {(user?.role === 'Admin' || user?.permissions?.includes('timesheet.export')) && (
                                                <Button
                                                    onClick={handleExport}
                                                    variant="secondary"
                                                    className="flex items-center space-x-2 bg-white text-green-700 border-green-200 hover:bg-green-50"
                                                >
                                                    <Save size={16} /> <span>Export Excel</span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>


                                    {/* Rejection Feedback */}
                                    {timesheet?.status === 'REJECTED' && (
                                        <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-sm text-red-800 mb-4">
                                            <div className="flex items-start mb-2">
                                                <div className="font-bold mr-2">Rejection Reason:</div>
                                                <div>{timesheet.rejectionReason}</div>
                                            </div>

                                            {/* Rejected Entries List */}
                                            {getRejectedCorrectionItems().length > 0 && (
                                                <div className="mt-2 bg-white rounded border border-red-100 p-2">
                                                    <div className="text-xs font-bold text-red-600 mb-1">Items requiring correction:</div>
                                                    <div className="space-y-1">
                                                        {getRejectedCorrectionItems().map((item) => (
                                                            <div key={item.id} className="flex justify-between items-center text-xs p-1 hover:bg-red-50 rounded gap-3">
                                                                <div className="min-w-0">
                                                                    <span>{format(new Date(item.date), 'MMM d')} - {item.title}</span>
                                                                    {item.subtitle && (
                                                                        <div className="text-[11px] text-red-500 truncate">{item.subtitle}</div>
                                                                    )}
                                                                </div>
                                                                <Button
                                                                    onClick={() => handleRejectedCorrectionClick(item)}
                                                                    variant="ghost"
                                                                    className="px-2 py-0.5 bg-red-100 text-red-700 hover:bg-red-200 rounded font-bold border border-red-200 h-auto text-xs"
                                                                >
                                                                    Regularize
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {activeTab === 'approvals' && (
                    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-700">Attendance Requests</h3>
                        </div>
                        {loadingApprovals ? (
                            <div className="divide-y divide-slate-100">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="px-6 py-4 flex justify-between items-center">
                                        <div className="space-y-2">
                                            <Skeleton className="h-5 w-32" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                        <Skeleton className="h-4 w-16" />
                                        <Skeleton className="h-6 w-16 rounded-full" />
                                        <div className="flex space-x-2">
                                            <Skeleton className="h-6 w-16" />
                                            <Skeleton className="h-6 w-16" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : pendingApprovals.length > 0 ? (
                            <div className="overflow-x-auto scrollbar-hide">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                            <th className="px-6 py-4 font-semibold">Employee</th>
                                            <th className="px-6 py-4 font-semibold">Month</th>
                                            <th className="px-6 py-4 font-semibold">Submitted On</th>
                                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {pendingApprovals.map(ts => (
                                            <tr key={ts._id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="font-semibold text-slate-800">{ts.user?.firstName} {ts.user?.lastName}</div>
                                                    <div className="text-xs text-slate-400 mt-0.5">{ts.user?.employeeCode}</div>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <span className="font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs">{ts.month}</span>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    {ts.submittedAt ? (
                                                        <div>
                                                            <div className="text-slate-700 font-medium">{format(new Date(ts.submittedAt), 'dd MMM yyyy')}</div>
                                                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                                                {format(new Date(ts.submittedAt), 'hh:mm a')}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                updateRouteContext({
                                                                    userId: ts.user._id,
                                                                    name: `${ts.user.firstName} ${ts.user.lastName}`,
                                                                    month: ts.month
                                                                });
                                                                setActiveTab('timesheet');
                                                            }}
                                                            className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-semibold transition-colors border border-blue-100"
                                                        >
                                                            View Details
                                                        </button>
                                                        <button
                                                            onClick={() => handleApprove(ts, 'APPROVED')}
                                                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md text-xs font-semibold transition-colors border border-emerald-100"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleApprove(ts, 'REJECTED')}
                                                            className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-semibold transition-colors border border-red-100"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-slate-400">
                                <Clock size={48} className="mx-auto mb-3 text-slate-200" />
                                <p>No pending approvals found.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'timesheet' && (
                    <>
                        {/* Inline Detail View */}
                        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-6">
                            <div className="overflow-x-auto scrollbar-hide">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                            <th className="p-4 border-r border-slate-200 min-w-[250px] sticky left-0 z-30 bg-slate-50 font-bold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                Project / Task
                                            </th>
                                            {visibleDays.map(day => {
                                                const { holiday, leave, isWeeklyOff } = getDayContext(day);
                                                return (
                                                    <th key={day.toString()} className={`p-2 border-r border-slate-200 min-w-[60px] text-center ${holiday ? 'bg-green-50' : leave ? 'bg-purple-50' : isWeeklyOff ? 'bg-slate-100/50' : ''}`}>
                                                        <div className="text-[10px] text-slate-400">{format(day, 'EEE')}</div>
                                                        <div className={`font-bold ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-slate-700'}`}>{format(day, 'd')}</div>
                                                        {holiday && (
                                                            <div className="text-[8px] text-green-600 font-bold truncate max-w-12.5 mt-1" title={holiday.name}>
                                                                {holiday.name}
                                                            </div>
                                                        )}
                                                        {!holiday && leave && (
                                                            <div className="text-[8px] text-purple-600 font-bold truncate max-w-12.5 mt-1" title={getLeaveLabel(leave)}>
                                                                {getLeaveLabel(leave)}
                                                            </div>
                                                        )}
                                                        {!holiday && !leave && isWeeklyOff && (
                                                            <div className="text-[8px] text-slate-500 font-bold truncate max-w-12.5 mt-1" title="Weekoff">
                                                                WO
                                                            </div>
                                                        )}
                                                    </th>
                                                );
                                            })}
                                            <th className="p-4 border-l border-slate-200 min-w-[100px] font-bold text-center bg-slate-50 sticky right-0 z-30 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {/* Attendance Row */}
                                        <tr className="bg-slate-50/80 border-b border-slate-200">
                                            <td className="p-4 border-r border-slate-200 font-bold text-slate-700 sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                <div className="flex flex-col">
                                                    <span>Attendance</span>
                                                    <span className="text-[10px] text-slate-400 font-normal uppercase">
                                                        {isPresentOnlyUser ? 'Present Only' : 'Check-in / Out'}
                                                    </span>
                                                </div>
                                            </td>
                                            {visibleDays.map(day => {
                                                const dateKey = format(day, 'yyyy-MM-dd');
                                                const log = attendanceLogs.find(l => format(new Date(l.date), 'yyyy-MM-dd') === dateKey);
                                                const { holiday, leave, isWeeklyOff } = getDayContext(day);

                                                // Joining Date Check
                                                const joiningDate = viewUser?.joiningDate ? startOfDay(new Date(viewUser.joiningDate)) : null;
                                                const isBeforeJoining = joiningDate && day < joiningDate;
                                                const isFutureDate = day > new Date();
                                                const isLockedFutureDate = isFutureDate && !canUpdateFutureDays;

                                                return (
                                                    <td
                                                        key={'att-' + day}
                                                        onClick={() => {
                                                            if (isLockedFutureDate) return;
                                                            if (isBeforeJoining) {
                                                                toast.error('Cannot edit attendance before joining date');
                                                                return;
                                                            }
                                                            handleCellClick({ name: 'Attendance Log' }, day, [], true);
                                                        }}
                                                        className={`p-1 border-r border-slate-200 text-center text-xs transition-colors ${isBeforeJoining || isLockedFutureDate
                                                            ? 'bg-slate-50 cursor-not-allowed opacity-50'
                                                            : `cursor-pointer hover:bg-blue-50 ${holiday ? 'bg-green-50/30' : leave ? 'bg-purple-50/40' : isWeeklyOff ? 'bg-slate-100/50' : ''}`
                                                            }`}
                                                        title={isBeforeJoining ? 'Before Joining Date' : isLockedFutureDate ? 'Future Date' : ''}
                                                    >
                                                        {isBeforeJoining || isLockedFutureDate ? (
                                                            <span className="text-slate-200 select-none text-[10px]">{isLockedFutureDate ? '-' : 'N/A'}</span>
                                                        ) : log ? (
                                                            <div className="flex flex-col items-center justify-center">
                                                                {isPresentOnlyAttendance(log) ? (
                                                                    <span className="font-bold px-2 py-1 rounded text-[9px] min-w-[32px] bg-emerald-100 text-emerald-700">
                                                                        Present
                                                                    </span>
                                                                ) : (
                                                                    <span className={`font-bold px-2 py-1 rounded text-[10px] min-w-[32px] ${getAttendanceStatusMeta(log).chipClass}`}>
                                                                        {getAttendanceHoursValue(log) > 0
                                                                            ? getAttendanceHoursValue(log).toFixed(1)
                                                                            : '-'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : holiday ? (
                                                            <span className="font-bold px-2 py-1 rounded text-[9px] min-w-[32px] bg-teal-100 text-teal-700" title={holiday.name}>
                                                                HOL
                                                            </span>
                                                        ) : leave ? (
                                                            <span className="font-bold px-2 py-1 rounded text-[9px] min-w-[32px] bg-purple-100 text-purple-700" title={getLeaveLabel(leave)}>
                                                                {leave.isHalfDay ? 'HDL' : 'LEV'}
                                                            </span>
                                                        ) : isWeeklyOff ? (
                                                            <span className="font-bold px-2 py-1 rounded text-[9px] min-w-[32px] bg-slate-100 text-slate-500">
                                                                WO
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-4 border-l border-slate-200 font-bold text-center bg-slate-50 sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                {isPresentOnlyUser
                                                    ? attendanceLogs.filter((log) => isPresentOnlyAttendance(log)).length
                                                    : (attendanceLogs.reduce((acc, log) => {
                                                        return acc + getAttendanceHoursValue(log);
                                                    }, 0)).toFixed(1)}
                                            </td>
                                        </tr>
                                        {Object.values(projectGroups).length > 0 ? (
                                            Object.values(projectGroups).map((group, idx) => {
                                                const projectTotal = Object.values(group.hours).reduce((a, b) => a + b, 0);
                                                return (
                                                    <tr key={group.project._id || idx} className="hover:bg-blue-50/30 transition-colors group">
                                                        <td className="p-4 border-r border-slate-200 font-medium text-slate-700 sticky left-0 bg-white z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm text-slate-800">{group.project.name || 'Unknown Project'}</span>
                                                                <span className="text-xs text-slate-400 font-normal">{group.project.client?.name || 'Internal'}</span>
                                                            </div>
                                                        </td>
                                                        {visibleDays.map(day => {
                                                            const dateKey = format(day, 'yyyy-MM-dd');
                                                            const hours = group.hours[dateKey];
                                                            const logs = group.logs[dateKey] || [];
                                                            const { holiday, leave, isWeeklyOff } = getDayContext(day);
                                                            const dayStatusMeta = getDayStatusMeta(logs);

                                                            // Joining Date Check
                                                            const joiningDate = viewUser?.joiningDate ? startOfDay(new Date(viewUser.joiningDate)) : null;
                                                            const isBeforeJoining = joiningDate && day < joiningDate;
                                                            const isFutureDate = day > new Date();
                                                            const isLockedFutureDate = isFutureDate && !canUpdateFutureDays;

                                                            return (
                                                                <td
                                                                    key={day.toString()}
                                                                    onClick={() => {
                                                                        if (isLockedFutureDate) return;
                                                                        if (holiday) {
                                                                            toast.error(`Cannot edit on holiday: ${holiday.name}`);
                                                                            return;
                                                                        }
                                                                        if (isBeforeJoining) {
                                                                            toast.error('Cannot edit timesheet before joining date');
                                                                            return;
                                                                        }
                                                                        handleCellClick(group.project, day, logs);
                                                                    }}
                                                                    className={`p-1 border-r border-slate-200 text-center transition-colors ${holiday ? 'bg-green-50/30 cursor-not-allowed'
                                                                        : leave ? 'bg-purple-50/40 cursor-default'
                                                                        : isBeforeJoining || isLockedFutureDate ? 'bg-slate-50 cursor-not-allowed opacity-50'
                                                                            : `cursor-pointer hover:bg-blue-100 ${isWeeklyOff ? 'bg-slate-50/30' : ''}`
                                                                        }`}
                                                                    title={isBeforeJoining ? 'Before Joining Date' : isLockedFutureDate ? 'Future Date' : ''}
                                                                >
                                                                    {holiday ? (
                                                                        <div className="flex justify-center items-center h-full">
                                                                            <span className="text-[10px] font-bold text-green-300 select-none" title={holiday.name}>HOL</span>
                                                                        </div>
                                                                    ) : leave ? (
                                                                        <div className="flex justify-center items-center h-full">
                                                                            <span className="text-[10px] font-bold text-purple-500 select-none" title={getLeaveLabel(leave)}>
                                                                                {leave.isHalfDay ? 'HDL' : 'LEV'}
                                                                            </span>
                                                                        </div>
                                                                    ) : isBeforeJoining || isLockedFutureDate ? (
                                                                        <span className="text-slate-200 text-[10px] select-none">{isLockedFutureDate ? '-' : 'N/A'}</span>
                                                                    ) : hours ? (
                                                                        <div className="flex flex-col items-center justify-center group/cell relative">
                                                                            <span
                                                                                title={dayStatusMeta.label}
                                                                                className={`inline-flex items-center justify-center h-8 w-8 rounded-full font-bold text-xs shadow-sm transition-all ${dayStatusMeta.badgeClass}`}
                                                                            >
                                                                                {hours}
                                                                            </span>
                                                                            {logs.length > 1 && (
                                                                                <div className="absolute -top-1 -right-1 h-3 w-3 bg-sky-500 rounded-full border-2 border-white"></div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-slate-200 text-xs">•</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="p-4 border-l border-slate-200 font-bold text-center bg-white sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                            <span className={projectTotal > 0 ? 'text-slate-800' : 'text-slate-300'}>{projectTotal.toFixed(1)}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={visibleDays.length + 2} className="p-12 text-center text-slate-500 bg-slate-50/50">
                                                    <div className="flex flex-col items-center">
                                                        <Calendar size={48} className="text-slate-300 mb-3" />
                                                        <p className="font-medium">No timesheet entries found</p>
                                                        <p className="text-xs mt-1">Clock in or log work to see data here</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}

                                        {/* Daily Totals Row */}
                                        <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs uppercase text-slate-700">
                                            <td className="p-3 border-r border-slate-300 sticky left-0 bg-slate-100 z-20">Daily Total</td>
                                            {visibleDays.map(day => {
                                                const total = getTotalPerDay(day);
                                                return (
                                                    <td key={day.toString()} className="p-1 border-r border-slate-300 text-center">
                                                        {total > 0 && (
                                                            <span className={`block py-1 rounded ${total > 9 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-800'}`}>
                                                                {total.toFixed(1)}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-4 border-l border-slate-200 font-bold text-center text-white bg-slate-600 sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                {visibleDays.reduce((acc, day) => acc + getTotalPerDay(day), 0).toFixed(1)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {selectedCell && (
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                                <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg">{format(selectedCell.date, 'EEEE, d MMM yyyy')}</h3>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">{selectedCell.project.name}</p>
                                    </div>
                                    <button onClick={() => setSelectedCell(null)} disabled={isSaving || isDeleting} className="text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">&times;</button>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {/* Attendance Section */}
                                    <div className="p-4 bg-slate-50/50">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center justify-between">
                                            <div className="flex items-center"><Clock size={12} className="mr-1" /> Attendance</div>
                                            {attendanceLogs.find(a => isSameDay(new Date(a.date), new Date(selectedCell.date))) ? (
                                                (isEditableTimesheetStatus && (!targetUserId || canUpdateAttendance)) && canEditAttendance && (
                                                    <button
                                                        onClick={() => {
                                                            const log = attendanceLogs.find(a => isSameDay(new Date(a.date), new Date(selectedCell.date)));
                                                            setEntryToEdit({ _id: log._id, type: 'ATTENDANCE', ...log });
                                                            const fmtTime = (d) => d ? new Date(d).toTimeString().substring(0, 5) : '';
                                                            setEditStartTime(fmtTime(log.clockIn));
                                                            setEditEndTime(fmtTime(log.clockOut));
                                                        }}
                                                        disabled={isSaving || isDeleting}
                                                        className="text-[10px] text-blue-600 hover:underline cursor-pointer disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
                                                    >
                                                        {isPresentOnlyAttendance(
                                                            attendanceLogs.find(a => isSameDay(new Date(a.date), new Date(selectedCell.date)))
                                                        ) ? 'Update Presence' : 'Edit Time'}
                                                    </button>
                                                )
                                            ) : (
                                                isEditableTimesheetStatus && (!targetUserId || canUpdateAttendance) && canEditAttendance && (selectedCell.date <= new Date() || canUpdateFutureDays) && (
                                                    <button
                                                        onClick={() => {
                                                            setEntryToEdit({
                                                                type: isPresentOnlyUser ? 'ATTENDANCE_CREATE_PRESENT_ONLY' : 'ATTENDANCE_CREATE',
                                                                date: selectedCell.date
                                                            });
                                                            setEditStartTime(isPresentOnlyUser ? '' : '09:00');
                                                            setEditEndTime(isPresentOnlyUser ? '' : '18:00');
                                                        }}
                                                        disabled={isSaving || isDeleting}
                                                        className="text-[10px] text-blue-600 hover:underline cursor-pointer disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
                                                    >
                                                        {isPresentOnlyUser ? 'Mark as Present' : 'Add Attendance'}
                                                    </button>
                                                )
                                            )}
                                        </h4>

                                        {/* Inline Attendance Edit Logic */
                                            (entryToEdit && (
                                                entryToEdit.type === 'ATTENDANCE'
                                                || entryToEdit.type === 'ATTENDANCE_CREATE'
                                                || entryToEdit.type === 'ATTENDANCE_CREATE_PRESENT_ONLY'
                                            )) ? (
                                                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 animate-in fade-in zoom-in-95 duration-200">
                                                    {isPresentOnlyAttendanceEditor ? (
                                                        <div className="mb-4 rounded-lg border border-blue-200 bg-white p-4">
                                                            <div className="text-sm font-semibold text-slate-700">Mark this day as present</div>
                                                            <div className="mt-1 text-xs text-slate-500">
                                                                This user uses present-only attendance. Saving will create or update the attendance record without check-in or check-out times.
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Check In</label>
                                                                <input
                                                                    type="time"
                                                                    value={editStartTime}
                                                                    onChange={e => setEditStartTime(e.target.value)}
                                                                    disabled={isSaving || isDeleting}
                                                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Check Out</label>
                                                                <input
                                                                    type="time"
                                                                    value={editEndTime}
                                                                    onChange={e => setEditEndTime(e.target.value)}
                                                                    disabled={isSaving || isDeleting}
                                                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center">
                                                        <div className="text-xs text-slate-400 italic">
                                                            {isPresentOnlyAttendanceEditor
                                                                ? 'Present-only attendance will use the configured working-hours fallback in the timesheet view.'
                                                                : 'Modifying attendance will auto-update calculated hours.'}
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            {entryToEdit.type === 'ATTENDANCE' && isPresentOnlyAttendance(entryToEdit) && (
                                                                <button
                                                                    onClick={deleteAttendanceEntry}
                                                                    disabled={isSaving || isDeleting}
                                                                    className="px-3 py-1.5 text-red-600 hover:text-red-700 font-medium text-xs bg-white border border-red-200 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                                                >
                                                                    {isDeleting && (
                                                                        <svg className="animate-spin h-3 w-3 mr-1 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                        </svg>
                                                                    )}
                                                                    Delete
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setEntryToEdit(null)}
                                                                disabled={isSaving || isDeleting}
                                                                className="px-3 py-1.5 text-slate-600 hover:text-slate-800 font-medium text-xs bg-white border border-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={submitEdit}
                                                                disabled={isSaving || isDeleting}
                                                                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold text-xs shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
                                                            >
                                                                {isSaving && (
                                                                    <svg className="animate-spin h-3 w-3 text-white mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                )}
                                                                <span>{isPresentOnlyAttendanceEditor ? 'Mark as Present' : 'Save Attendance'}</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                attendanceLogs.find(a => isSameDay(new Date(a.date), new Date(selectedCell.date))) ? (
                                                    (() => {
                                                        const log = attendanceLogs.find(a => isSameDay(new Date(a.date), new Date(selectedCell.date)));
                                                        const start = log.clockIn ? new Date(log.clockIn) : null;
                                                        const end = log.clockOut ? new Date(log.clockOut) : null;
                                                        const attendanceMeta = getAttendanceStatusMeta(log);

                                                        return (
                                                            <div className="flex flex-col space-y-2">
                                                                <div className="flex justify-end">
                                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${attendanceMeta.chipClass}`}>
                                                                        {attendanceMeta.label}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between items-center text-sm bg-white p-2 rounded border border-slate-200 shadow-sm">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-slate-400 text-[10px] font-bold uppercase">Check In</span>
                                                                        <span className="font-mono font-medium text-emerald-600">
                                                                            {isPresentOnlyAttendance(log) ? 'Present Only' : (start ? format(start, 'h:mm:ss a') : '--:--')}
                                                                        </span>
                                                                    </div>
                                                                    <div className="h-8 w-px bg-slate-100"></div>
                                                                    <div className="flex flex-col text-right">
                                                                        <span className="text-slate-400 text-[10px] font-bold uppercase">Check Out</span>
                                                                        <span className="font-mono font-medium text-red-600">
                                                                            {isPresentOnlyAttendance(log) ? 'Present Only' : (end ? format(end, 'h:mm:ss a') : 'Active')}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()
                                                ) : (
                                                    <div className="text-center py-4 space-y-3">
                                                        <div className="text-xs text-slate-400 italic">No attendance record found for this date.</div>
                                                        {isEditableTimesheetStatus && !targetUserId && canEditAttendance && (selectedCell.date <= new Date() || canUpdateFutureDays) && (
                                                            <Button
                                                                onClick={() => {
                                                                    setEntryToEdit({
                                                                        type: isPresentOnlyUser ? 'ATTENDANCE_CREATE_PRESENT_ONLY' : 'ATTENDANCE_CREATE',
                                                                        date: selectedCell.date
                                                                    });
                                                                    setEditStartTime(isPresentOnlyUser ? '' : '09:00');
                                                                    setEditEndTime(isPresentOnlyUser ? '' : '18:00');
                                                                }}
                                                                disabled={isSaving || isDeleting}
                                                                variant="secondary"
                                                                className="text-xs w-full justify-center"
                                                            >
                                                                <Clock size={14} className="mr-1" /> {isPresentOnlyUser ? 'Mark as Present' : 'Add Attendance Manually'}
                                                            </Button>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                    </div>

                                    {canUseProjectWorkLogs && (
                                        <div className="p-4 bg-white border-t border-slate-100">
                                            {!isAddingEntry ? (
                                                (isEditableTimesheetStatus && (!targetUserId || canUpdateTimesheet)) && (
                                                    <Button
                                                        onClick={() => {
                                                            setIsAddingEntry(true);
                                                            setNewEntry(prev => ({ ...prev, date: getLocalDateInputValue(selectedCell.date) }));
                                                        }}
                                                        variant="ghost"
                                                        className="w-full flex items-center justify-center space-x-2 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium text-sm h-auto"
                                                    >
                                                        <div className="bg-slate-200 rounded-full p-0.5">
                                                            <span className="block h-4 w-4 leading-3 text-center">+</span>
                                                        </div>
                                                        <span>Add Work Log</span>
                                                    </Button>
                                                )
                                            ) : (
                                                <div className="bg-slate-50 border border-blue-100 rounded-lg p-4 animate-in fade-in zoom-in-95 duration-200 relative">
                                                    <button
                                                        onClick={() => setIsAddingEntry(false)}
                                                        disabled={isSaving || isDeleting}
                                                        className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        &times;
                                                    </button>
                                                    <h4 className="text-xs font-bold text-blue-600 uppercase mb-3">New Work Log</h4>

                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 mb-1">Project <span className="text-red-500">*</span></label>
                                                                <select
                                                                    value={newEntry.projectId}
                                                                    onChange={(e) => handleProjectChange(e.target.value)}
                                                                    disabled={isSaving || isDeleting}
                                                                    className="w-full p-2 border border-slate-300 rounded text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400"
                                                                >
                                                                    <option value="">Select Project</option>
                                                                    {availableProjects.map(p => (
                                                                        <option key={p._id} value={p._id}>{p.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 mb-1">Module</label>
                                                                <select
                                                                    value={newEntry.moduleId}
                                                                    onChange={(e) => handleModuleChange(e.target.value)}
                                                                    disabled={isSaving || isDeleting || !newEntry.projectId}
                                                                    className="w-full p-2 border border-slate-300 rounded text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400"
                                                                >
                                                                    <option value="">Select Module</option>
                                                                    {filteredModules.map(m => (
                                                                        <option key={m._id} value={m._id}>{m.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 mb-1">Task</label>
                                                                <select
                                                                    value={newEntry.taskId}
                                                                    onChange={(e) => setNewEntry(prev => ({ ...prev, taskId: e.target.value }))}
                                                                    disabled={isSaving || isDeleting || !newEntry.moduleId}
                                                                    className="w-full p-2 border border-slate-300 rounded text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400"
                                                                >
                                                                    <option value="">Select Task</option>
                                                                    {filteredTasks.map(t => (
                                                                        <option key={t._id} value={t._id}>{t.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="flex space-x-2">
                                                                <div className="flex-1">
                                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Hours <span className="text-red-500">*</span></label>
                                                                    <input
                                                                        type="number"
                                                                        placeholder="0"
                                                                        value={newEntry.hours}
                                                                        onChange={(e) => setNewEntry(prev => ({ ...prev, hours: e.target.value }))}
                                                                        disabled={isSaving || isDeleting}
                                                                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400"
                                                                        min="0"
                                                                    />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Minutes</label>
                                                                    <input
                                                                        type="number"
                                                                        placeholder="0"
                                                                        value={newEntry.minutes}
                                                                        onChange={(e) => setNewEntry(prev => ({ ...prev, minutes: e.target.value }))}
                                                                        disabled={isSaving || isDeleting}
                                                                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400"
                                                                        min="0" max="59"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                                                            <textarea
                                                                value={newEntry.description}
                                                                onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                                                                disabled={isSaving || isDeleting}
                                                                className="w-full p-2 border border-slate-300 rounded text-sm bg-white h-16 resize-none disabled:bg-slate-100 disabled:text-slate-400"
                                                                placeholder="What did you work on?"
                                                            />
                                                        </div>

                                                        <div className="flex justify-end pt-2">
                                                            <Button
                                                                onClick={submitNewEntry}
                                                                disabled={isSaving || isDeleting}
                                                                className="px-4 py-2 font-bold text-sm shadow-sm flex items-center justify-center space-x-1"
                                                            >
                                                                {isSaving && (
                                                                    <svg className="animate-spin h-3.5 w-3.5 text-white mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                )}
                                                                <span>Add Log</span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedCell.logs.map((log, i) => (
                                        <div key={i} className="p-4 hover:bg-slate-50 transition-colors">
                                            {/* Header Always Visible */}
                                            <div className="flex flex-wrap items-center text-xs text-slate-500 mb-2">
                                                <span className="font-bold text-slate-700">{log.project?.name || 'Unknown Project'}</span>
                                                {log.module && (
                                                    <>
                                                        <span className="mx-1 text-slate-300">/</span>
                                                        <span>{log.module.name}</span>
                                                    </>
                                                )}
                                                {log.task && (
                                                    <>
                                                        <span className="mx-1 text-slate-300">/</span>
                                                        <span className="text-blue-600 font-medium">{log.task.name}</span>
                                                    </>
                                                )}
                                                {!log.task && log.taskName && (
                                                    <>
                                                        <span className="mx-1 text-slate-300">/</span>
                                                        <span className="text-blue-600 font-medium">{log.taskName}</span>
                                                    </>
                                                )}
                                            </div>

                                            {entryToEdit && entryToEdit._id === log._id ? (
                                                // INLINE EDIT FORM
                                                <div className="bg-white border border-blue-200 rounded-lg p-3 shadow-sm animate-in fade-in zoom-in-95 duration-150">
                                                    <div className="grid grid-cols-4 gap-3 mb-3">
                                                        <div className="col-span-4 grid grid-cols-3 gap-2">
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project</label>
                                                                <select
                                                                    value={editProjectId}
                                                                    onChange={(e) => handleEditProjectChange(e.target.value)}
                                                                    disabled={isSaving || isDeleting}
                                                                    className="w-full p-2 border border-slate-300 rounded text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400"
                                                                >
                                                                    <option value="">Select Project</option>
                                                                    {availableProjects.map(p => (
                                                                        <option key={p._id} value={p._id}>{p.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Module</label>
                                                                <select
                                                                    value={editModuleId}
                                                                    onChange={(e) => handleEditModuleChange(e.target.value)}
                                                                    disabled={isSaving || isDeleting || !editProjectId}
                                                                    className="w-full p-2 border border-slate-300 rounded text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400"
                                                                >
                                                                    <option value="">Select Module</option>
                                                                    {editFilteredModules.map(m => (
                                                                        <option key={m._id} value={m._id}>{m.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Task</label>
                                                                <select
                                                                    value={editTaskId}
                                                                    onChange={(e) => setEditTaskId(e.target.value)}
                                                                    disabled={isSaving || isDeleting || !editModuleId}
                                                                    className="w-full p-2 border border-slate-300 rounded text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400"
                                                                >
                                                                    <option value="">Select Task</option>
                                                                    {editFilteredTasks.map(t => (
                                                                        <option key={t._id} value={t._id}>{t.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="col-span-1 grid grid-cols-2 gap-1">
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hrs</label>
                                                                <input
                                                                    type="number"
                                                                    value={editHours}
                                                                    onChange={e => setEditHours(e.target.value)}
                                                                    disabled={isSaving || isDeleting}
                                                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                                                                    min="0"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Min</label>
                                                                <input
                                                                    type="number"
                                                                    value={editMinutes}
                                                                    onChange={e => setEditMinutes(e.target.value)}
                                                                    disabled={isSaving || isDeleting}
                                                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                                                                    min="0" max="59"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="col-span-3">
                                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                                            <textarea
                                                                value={editDescription}
                                                                onChange={e => setEditDescription(e.target.value)}
                                                                disabled={isSaving || isDeleting}
                                                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none h-9.5 min-h-9.5 resize-none text-sm leading-tight disabled:bg-slate-100 disabled:text-slate-400"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end space-x-2">
                                                        <Button
                                                            onClick={() => setEntryToEdit(null)}
                                                            disabled={isSaving || isDeleting}
                                                            variant="secondary"
                                                            className="px-3 py-1 text-xs font-medium"
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            onClick={submitEdit}
                                                            disabled={isSaving || isDeleting}
                                                            className="px-3 py-1 text-xs font-bold flex items-center justify-center space-x-1"
                                                        >
                                                            {isSaving && (
                                                                <svg className="animate-spin h-3 w-3 text-white mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                            )}
                                                            <span>Save</span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                // READ ONLY VIEW
                                                <>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="font-semibold text-slate-700 text-sm flex-1 mr-4">
                                                            <div className="text-xs font-bold mb-1 text-slate-500">Status: {getLogStatusMeta(log.status).label}</div>
                                                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                                                {log.description || 'No description provided.'}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${getLogStatusMeta(log.status).pillClass}`}>
                                                                {log.hours}h
                                                            </span>
                                                            {(isEditableTimesheetStatus && (!targetUserId || canUpdateTimesheet)) && (
                                                                <button
                                                                    onClick={() => { handleEditClick(log); }}
                                                                    className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                                                                >
                                                                    Edit
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Total for Day</span>
                                    {(() => {
                                        const log = attendanceLogs.find(a => isSameDay(new Date(a.date), new Date(selectedCell.date)));
                                        const isPresentOnlyDay = !selectedCell.logs.length && isPresentOnlyAttendance(log);
                                        const dayTotal = selectedCell.logs.length > 0
                                            ? selectedCell.logs.reduce((acc, l) => acc + l.hours, 0)
                                            : (log ? getAttendanceHoursValue(log) : 0);

                                        return (
                                            <span className="font-bold text-slate-800 text-lg">
                                                {isPresentOnlyDay ? 'Present' : `${dayTotal.toFixed(1)} Hours`}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}



                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-800">Automated Sync Active</h4>
                                <p className="text-sm text-blue-600 mt-1">
                                    {isPresentOnlyUser
                                        ? 'Your attendance row is automatically populated from daily presence marks. You can manually add other project entries if enabled.'
                                        : 'Your "Attendance" hours are automatically populated from your Attendance (Clock In/Out) duration. You can manually add other project entries if enabled.'}
                                </p>
                            </div>
                        </div>




                    </>
                )}

                {activeTab === 'attendance_deprecated' && (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                                <h3 className="font-bold text-slate-700">Attendance Log</h3>
                                <div className="flex items-center space-x-2 text-sm bg-slate-50 rounded-lg p-1 border border-slate-200">
                                    <button
                                        onClick={() => setViewDate(d => addDays(d, -30))}
                                        className="p-1 text-slate-500 hover:text-slate-700 hover:bg-white rounded shadow-sm transition-all"
                                        title="Previous Month"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="font-bold w-32 text-center text-slate-700">{format(viewDate, 'MMMM yyyy')}</span>
                                    <button
                                        onClick={() => setViewDate(d => addDays(d, 30))}
                                        className="p-1 text-slate-500 hover:text-slate-700 hover:bg-white rounded shadow-sm transition-all"
                                        title="Next Month"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleExportAttendance}
                                className="flex items-center space-x-2 text-sm text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors border border-green-200"
                            >
                                <Download size={14} />
                                <span>Download Report</span>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Clock In</th>
                                        <th className="px-4 py-3">Clock Out</th>
                                        <th className="px-4 py-3">Duration</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) }).map(day => {
                                        const dateStr = format(day, 'yyyy-MM-dd');
                                        const record = attendanceLogs.find(h => format(new Date(h.date), 'yyyy-MM-dd') === dateStr);
                                        const isFuture = day > new Date();
                                        const { holiday, leave, isWeeklyOff } = getDayContext(day);

                                        // Status Logic
                                        let status = 'Absent';
                                        let statusColor = 'bg-red-100 text-red-700';

                                        // const joiningDate ... needs user details. 
                                        // For now assume active.

                                        if (isFuture) {
                                            status = '-';
                                            statusColor = 'bg-slate-100 text-slate-500';
                                        } else if (holiday) {
                                            status = holiday.name;
                                            statusColor = holiday.isOptional ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700';
                                        } else if (leave) {
                                            status = getLeaveLabel(leave);
                                            statusColor = 'bg-purple-100 text-purple-700';
                                        } else if (record) {
                                            const attendanceMeta = getAttendanceStatusMeta(record);
                                            status = attendanceMeta.label;
                                            statusColor = attendanceMeta.chipClass;
                                        } else if (isWeeklyOff) {
                                            status = 'Weekoff';
                                            statusColor = 'bg-slate-100 text-slate-500';
                                        }

                                        return (
                                            <tr key={dateStr} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-700">{format(day, 'dd MMM yyyy')}</div>
                                                    <div className="text-xs text-slate-400">{format(day, 'EEEE')}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor}`}>
                                                        {status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-slate-600">
                                                    {record ? getAttendanceTimeDisplay(record, 'clockIn') : '-'}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-slate-600">
                                                    {record ? getAttendanceTimeDisplay(record, 'clockOut') : '-'}
                                                </td>
                                                <td className="px-4 py-3 font-mono font-bold text-slate-700">
                                                    {record ? (isPresentOnlyAttendance(record) ? 'Present' : formatHoursDuration(getAttendanceHoursValue(record))) : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <h3 className="font-bold text-slate-700">Attendance Log</h3>
                                {user?.company?.settings?.timesheet?.requireAttachment && (
                                    <button
                                        onClick={() => setActiveTab('attendance_documents')}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                                    >
                                        <Paperclip size={14} /> Documents
                                    </button>
                                )}
                            </div>
                            <Button
                                onClick={handleExportAttendance}
                                className="flex items-center space-x-2 text-sm bg-green-600 hover:bg-green-700 active:bg-green-800 px-4 py-2 rounded-lg shadow-sm transition-all text-white border-transparent"
                            >
                                <Download size={14} />
                                <span className="font-semibold">Download Report</span>
                            </Button>
                        </div>
                        <div className="p-4">
                            <AttendanceCalendar
                                history={attendanceLogs}
                                onMonthChange={(y, m) => {
                                    const newD = new Date(y, m - 1, 1);
                                    if (format(newD, 'yyyy-MM') !== format(viewDate, 'yyyy-MM')) {
                                        setViewDate(newD);
                                    }
                                }}
                                user={viewUser}
                                weeklyOffs={weeklyOffs}
                                holidays={holidays}
                                approvedLeaves={approvedLeaves}
                                date={viewDate}
                                isPrivileged={canUpdateAttendance}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'attendance_documents' && (
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
                        <div className="mb-4 flex items-center">
                            <button
                                onClick={() => setActiveTab('attendance')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-200 transition-colors"
                            >
                                <ChevronLeft size={14} /> Back to Log
                            </button>
                        </div>
                        <AttendanceAttachmentsView
                            attachments={attachments}
                            loading={loadingAttachments}
                            onUpload={handleUploadAttachment}
                            onDelete={handleDeleteAttachment}
                            isReadOnly={effectiveUserId !== user?._id && !(user?.roles?.some(r => r === 'Admin' || r.name === 'Admin') || user?.permissions?.includes('*'))}
                            isAdmin={isAdmin}
                            monthName={getTimesheetPeriodLabel(viewDate, cycle)}
                            onSubmit={handleSubmitAttachment}
                            onApprove={(id) => handleReviewAttachment(id, 'Approved')}
                            onReject={(id, reason) => handleReviewAttachment(id, 'Rejected', reason)}
                            onReplace={handleReplaceAttachment}
                            canApprove={canApprove}
                        />
                    </div>
                )}


                {/* Reject Modal */}
                {
                    showRejectModal && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                                <div className="p-6">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Reject Timesheet</h3>

                                    <div className="flex space-x-4 mb-4">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="rejectionType"
                                                value="FULL"
                                                checked={rejectionType === 'FULL'}
                                                onChange={(e) => setRejectionType(e.target.value)}
                                                className="text-red-600 focus:ring-red-500"
                                            />
                                            <span className="text-sm font-medium text-slate-700">Reject Entire Month</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="rejectionType"
                                                value="PARTIAL"
                                                checked={rejectionType === 'PARTIAL'}
                                                onChange={(e) => setRejectionType(e.target.value)}
                                                className="text-red-600 focus:ring-red-500"
                                            />
                                            <span className="text-sm font-medium text-slate-700">Reject Specific Entries</span>
                                        </label>
                                    </div>

                                    {rejectionType === 'PARTIAL' && (
                                        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                                            <div className="text-xs text-slate-500 font-bold uppercase mb-2">Select items to reject:</div>
                                            <div className="space-y-2">
                                                {getRejectableItems(selectedTimesheet).map((item, idx) => (
                                                    <label key={item.id || idx} className="flex items-start space-x-2 cursor-pointer hover:bg-slate-100 p-1 rounded">
                                                        <input
                                                            type="checkbox"
                                                            checked={rejectedEntryIds.includes(item.id)}
                                                            onChange={() => toggleEntryRejection(item.id)}
                                                            className="mt-1 text-red-600 rounded focus:ring-red-500"
                                                        />
                                                        <div className="text-sm">
                                                            <div className="font-mono text-xs text-slate-500">
                                                                {format(new Date(item.date), 'MMM d, yyyy')} - {item.meta}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="text-slate-700 font-medium">
                                                                    {item.title}
                                                                </div>
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${item.type === 'attendance' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                    {item.type}
                                                                </span>
                                                            </div>
                                                            {item.subtitle && (
                                                                <div className="text-slate-500 text-xs truncate max-w-[250px]">{item.subtitle}</div>
                                                            )}
                                                        </div>
                                                    </label>
                                                ))}
                                                {getRejectableItems(selectedTimesheet).length === 0 && (
                                                    <div className="text-xs text-slate-400 italic">No timesheet items found.</div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-sm text-slate-500 mb-2">Reason for rejection:</p>
                                    <textarea
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none h-24"
                                        placeholder={rejectionType === 'PARTIAL' ? "Reason for rejecting selected entries..." : "Reason for rejecting entire timesheet..."}
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                    ></textarea>

                                    <div className="flex justify-end space-x-3 mt-4">
                                        <Button
                                            onClick={() => setShowRejectModal(false)}
                                            variant="secondary"
                                            className="px-4 py-2 text-sm"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={submitRejection}
                                            variant="danger"
                                            className="px-4 py-2 text-sm"
                                            disabled={!rejectReason.trim() || (rejectionType === 'PARTIAL' && rejectedEntryIds.length === 0)}
                                        >
                                            {rejectionType === 'PARTIAL' ? `Reject ${rejectedEntryIds.length} Entries` : 'Reject Entire Month'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

            </div>
        </div >
    );
};

export default Timesheet;
