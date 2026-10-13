import api from '@/lib/apiClient';
import ExcelJS from 'exceljs';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export const DEFAULT_ATTENDANCE_SHIFTS = [
    { code: 'general', name: 'General' },
    { code: 'any', name: 'Any Time' }
];

export const PAGE_SIZE_OPTIONS = [50, 100];

export const ALL_HRIS_SECTIONS = [
    'General', 'Personal', 'Identity', 'Contact', 'Family',
    'Employment', 'Bank', 'Education', 'Experience', 'Skills', 'Documents'
];

export const buildUserListFingerprint = (users = []) => users
    .map((listedUser) => ([
        listedUser._id,
        listedUser.updatedAt || '',
        listedUser.createdAt || '',
        listedUser.isActive ? '1' : '0',
        listedUser.isDeleted ? '1' : '0',
        (listedUser.roles || []).map((role) => role?._id || role?.name || '').join(','),
        (listedUser.reportingManagers || []).map((manager) => manager?._id || manager || '').join(',')
    ].join(':')))
    .join('|');

export const buildRoleListFingerprint = (roles = []) => roles
    .map((role) => `${role._id}:${role.name || ''}`)
    .join('|');

export const formatTime = (dateString, istString) => {
    if (istString && istString.includes(',')) return istString.split(',')[1]?.trim() || '';
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export const calculateDuration = (start, end, recordDate) => {
    if (!start) return '--';
    const startTime = new Date(start);
    let endTime;

    if (end) {
        endTime = new Date(end);
    } else {
        const today = new Date();
        const rDate = recordDate ? new Date(recordDate) : today;
        const isToday = rDate.toDateString() === today.toDateString();

        if (isToday) {
            endTime = today;
        } else {
            endTime = new Date(rDate);
            endTime.setHours(23, 59, 59, 999);
        }
    }

    if (endTime < startTime) return '0h 0m';
    const diffString = Math.abs(endTime - startTime);
    const hours = Math.floor(diffString / (1000 * 60 * 60));
    const minutes = Math.floor((diffString % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
};

export const toDateKey = (value) => format(new Date(value), 'yyyy-MM-dd');

export const sanitizeFileNamePart = (value) => {
    const normalized = String(value || 'user')
        .replace(/[<>:"/\\|?*]/g, '')
        .trim()
        .replace(/\s+/g, '_');

    return normalized || 'user';
};

export const getMimeExtension = (mimeType = '') => {
    if (!mimeType) return '';
    const lower = String(mimeType).toLowerCase();
    if (lower.includes('image/jpeg') || lower.includes('image/jpg') || lower.includes('jpeg')) return '.jpg';
    if (lower.includes('image/png') || lower.includes('png')) return '.png';
    if (lower.includes('image/webp') || lower.includes('webp')) return '.webp';
    if (lower.includes('image/gif') || lower.includes('gif')) return '.gif';
    if (lower.includes('image/bmp') || lower.includes('bmp')) return '.bmp';
    if (lower.includes('image/svg') || lower.includes('svg')) return '.svg';
    if (lower.includes('image/heic') || lower.includes('heic')) return '.heic';
    if (lower.includes('image/heif') || lower.includes('heif')) return '.heif';
    if (lower.includes('application/pdf') || lower.includes('pdf')) return '.pdf';
    if (lower.includes('wordprocessingml') || lower.includes('docx')) return '.docx';
    if (lower.includes('msword') || lower.includes('doc')) return '.doc';
    if (lower.includes('spreadsheetml') || lower.includes('xlsx')) return '.xlsx';
    if (lower.includes('excel') || lower.includes('xls')) return '.xls';
    if (lower.includes('text/plain') || lower.includes('txt')) return '.txt';
    if (lower.includes('text/csv') || lower.includes('csv')) return '.csv';
    if (lower.includes('zip')) return '.zip';
    return '';
};

export const getFileExtension = (fileName = '', url = '', mimeType = '') => {
    const mimeExt = getMimeExtension(mimeType);
    if (mimeExt) return mimeExt;

    if (fileName && fileName.includes('.')) {
        const ext = fileName.split('.').pop().trim().toLowerCase();
        if (ext && ext.length <= 5 && /^[a-z0-9]+$/.test(ext)) {
            return `.${ext}`;
        }
    }
    if (url) {
        const cleanUrl = url.split('?')[0].split('#')[0];
        const parts = cleanUrl.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart.includes('.')) {
            const ext = lastPart.split('.').pop().trim().toLowerCase();
            if (ext && ext.length <= 5 && /^[a-z0-9]+$/.test(ext)) {
                return `.${ext}`;
            }
        }
    }
    return '';
};

export const sanitizeZipFileName = (value, url = '', mimeType = '', fallback = 'document') => {
    const original = String(value || fallback).trim();
    let baseName = original;
    let existingExt = '';
    const extensionIndex = original.lastIndexOf('.');

    if (extensionIndex > 0 && extensionIndex < original.length - 1) {
        const potentialExt = original.slice(extensionIndex + 1).toLowerCase();
        if (potentialExt.length <= 5 && /^[a-z0-9]+$/.test(potentialExt)) {
            baseName = original.slice(0, extensionIndex);
            existingExt = `.${potentialExt}`;
        }
    }

    const extension = getFileExtension(original, url, mimeType) || existingExt;
    const safeBaseName = sanitizeFileNamePart(baseName || fallback);
    return `${safeBaseName}${extension}`;
};

export const fetchFileBlob = async (targetUrl) => {
    if (!targetUrl) throw new Error('Missing file URL');

    if (targetUrl.includes('cloudinary') || targetUrl.startsWith('http')) {
        try {
            const res = await api.get('/dossier/proxy-pdf', {
                params: { url: targetUrl, download: true },
                responseType: 'blob'
            });
            if (res.data && res.data.size > 0 && !res.data.type?.includes('text/html')) {
                return res.data;
            }
        } catch (proxyErr) {
            console.warn('Proxy fetch failed, trying direct api.get...', proxyErr);
        }
    }

    try {
        const res = await api.get(targetUrl, { responseType: 'blob' });
        if (res.data && res.data.size > 0 && !res.data.type?.includes('text/html')) {
            return res.data;
        }
    } catch (apiErr) {
        console.warn('Direct api.get failed, trying window.fetch...', apiErr);
    }

    const response = await fetch(targetUrl);
    if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
    }
    const blob = await response.blob();
    if (blob.type?.includes('text/html')) {
        throw new Error('Received HTML error response instead of file');
    }
    return blob;
};

export const isAttendanceApproved = (record) =>
    record?.approvalStatus === 'APPROVED' || Boolean(record?.approvedBy);

export const buildAttendanceWorkbook = async (targetUser, year, month, holidaysDataOverride = null, currentUser = null) => {
    const [historyRes, holidaysRes] = await Promise.all([
        api.get(`/attendance/history?year=${year}&month=${month}&userId=${targetUser._id}`),
        holidaysDataOverride ? Promise.resolve({ data: holidaysDataOverride }) : api.get('/holidays')
    ]);

    const history = historyRes.data?.history || historyRes.data || [];
    const holidaysData = holidaysRes.data || [];
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance Report');
    const reportDate = new Date(year, month - 1, 1);

    sheet.mergeCells('A1:C1');
    sheet.getCell('A1').value = `User Name: ${targetUser.firstName} ${targetUser.lastName || ''}`;
    sheet.getCell('A1').font = { bold: true, size: 14 };

    sheet.mergeCells('A2:C2');
    sheet.getCell('A2').value = `Joining Date: ${targetUser.joiningDate ? new Date(targetUser.joiningDate).toLocaleDateString() : 'N/A'}`;

    sheet.mergeCells('A3:C3');
    const managers = targetUser.reportingManagers || [];
    const mgrNames = managers.length > 0 ? managers.map(m => `${m.firstName} ${m.lastName}`).join(', ') : 'N/A';
    sheet.getCell('A3').value = `Supervisor(s): ${mgrNames}`;

    sheet.addRow([]);

    const headerRow = sheet.addRow(['Date', 'Day', 'Status', 'In Time', 'Out Time', 'Duration']);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
    headerRow.alignment = { horizontal: 'center' };

    const start = startOfMonth(reportDate);
    const end = endOfMonth(reportDate);
    const days = eachDayOfInterval({ start, end });

    days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const record = history.find(h => toDateKey(h.date) === dateStr);
        const weeklyOffDays = historyRes.data?.weeklyOff || currentUser?.company?.settings?.attendance?.weeklyOff || ['Sunday'];
        const dayName = format(day, 'EEEE');
        const userFlexDays = Array.isArray(targetUser?.customFlexibleOffDays) ? targetUser.customFlexibleOffDays : [];
        const isCompanyWeeklyOff = weeklyOffDays.some(woff => woff.trim().toLowerCase() === dayName.toLowerCase());
        const isCustomFlexOff = userFlexDays.some(flexDay => {
            const cleanFlex = String(flexDay || '').trim().toLowerCase();
            return cleanFlex === dateStr.toLowerCase() || cleanFlex === dayName.toLowerCase();
        });
        const isWeeklyOff = isCompanyWeeklyOff || isCustomFlexOff;

        const joiningDate = targetUser.joiningDate ? new Date(targetUser.joiningDate) : null;
        if (joiningDate) joiningDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const isFuture = dayStart > today;

        const hasAttendance = Boolean(
            record && (
                record.clockIn ||
                record.clockInIST ||
                record.status === 'PRESENT' ||
                record.status === 'HALF_DAY' ||
                isAttendanceApproved(record)
            )
        );

        const holiday = holidaysData.find(h => toDateKey(h.date) === dateStr);

        let status = 'Absent';
        let rowColor = 'FFF2DCDB';

        if (joiningDate && dayStart < joiningDate) {
            status = 'Not Applicable';
            rowColor = 'FFFFFFFF';
        } else if (hasAttendance) {
            status = record?.status === 'HALF_DAY' ? 'Half Day' : 'Present';
            rowColor = record?.status === 'HALF_DAY' ? 'FFFEF3C7' : 'FFEBF1DE';
        } else if (holiday) {
            status = holiday.name || 'Holiday';
            rowColor = holiday.isOptional ? 'FFFFE0B2' : 'FFD1F2EB';
        } else if (isCustomFlexOff) {
            status = 'Flexible Off';
            rowColor = 'FFEDE9FE';
        } else if (isCompanyWeeklyOff) {
            status = 'Week Off';
            rowColor = 'FFF2F2F2';
        } else if (isFuture) {
            status = '-';
            rowColor = 'FFFFFFFF';
        } else {
            status = 'Absent';
            rowColor = 'FFF2DCDB';
        }

        const row = sheet.addRow([
            format(day, 'dd-MM-yyyy'),
            format(day, 'EEEE'),
            status,
            record ? formatTime(record.clockIn, record.clockInIST) : '-',
            record ? formatTime(record.clockOut, record.clockOutIST) : '-',
            record ? calculateDuration(record.clockIn, record.clockOut, day) : '-'
        ]);

        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
        row.alignment = { horizontal: 'center' };
    });

    sheet.columns = [
        { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const userLabel = sanitizeFileNamePart(`${targetUser.firstName || ''}_${targetUser.lastName || ''}_${targetUser.employeeCode || ''}`);

    return {
        buffer,
        fileName: `Attendance_${format(start, 'MMMM_yyyy')}_${userLabel}.xlsx`
    };
};

export const sanitizeSheetName = (rawName, code = '', existingNames = new Set()) => {
    let base = String(rawName || 'Sheet')
        .replace(/[\\/?*:[\]]/g, '')
        .trim();
    if (!base) base = 'Sheet';

    let name = base;
    if (code) {
        const cleanCode = String(code).replace(/[\\/?*:[\]]/g, '').trim();
        if (cleanCode && (base.length + cleanCode.length + 3) <= 31) {
            name = `${base} (${cleanCode})`;
        }
    }

    if (name.length > 31) {
        name = name.substring(0, 31).trim();
    }

    let candidate = name;
    let counter = 2;
    while (existingNames.has(candidate.toLowerCase())) {
        const suffix = ` (${counter})`;
        const maxLen = 31 - suffix.length;
        candidate = `${name.substring(0, maxLen).trim()}${suffix}`;
        counter++;
    }

    existingNames.add(candidate.toLowerCase());
    return candidate;
};

export const buildBulkTimesheetWorkbook = async ({ month, teamMembers = [], workLogsByUser = {}, timesheets = {}, startDate, endDate }) => {
    const workbook = new ExcelJS.Workbook();
    const existingNames = new Set();
    const [yearNum, monthNum] = (month || format(new Date(), 'yyyy-MM')).split('-').map(Number);
    const reportDate = new Date(yearNum, monthNum - 1, 1);
    const start = startDate ? new Date(startDate) : startOfMonth(reportDate);
    const end = endDate ? new Date(endDate) : endOfMonth(reportDate);

    // 1. OVERVIEW / SUMMARY SHEET
    const summarySheet = workbook.addWorksheet('Summary');
    existingNames.add('summary');

    summarySheet.mergeCells('A1:F1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = `Team Timesheets Summary - ${format(reportDate, 'MMMM yyyy')}`;
    titleCell.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    summarySheet.getRow(1).height = 30;

    summarySheet.mergeCells('A2:F2');
    summarySheet.getCell('A2').value = `Period: ${format(start, 'dd-MM-yyyy')} to ${format(end, 'dd-MM-yyyy')} | Total Employees: ${teamMembers.length}`;
    summarySheet.getCell('A2').font = { size: 11, italic: true, color: { argb: 'FF475569' } };
    summarySheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    summarySheet.getRow(2).height = 20;

    summarySheet.addRow([]);

    const sumHeader = summarySheet.addRow([
        'Employee Name', 'Employee Code', 'Department', 'Designation', 'Total Hours Logged', 'Timesheet Status'
    ]);
    sumHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    sumHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    sumHeader.alignment = { vertical: 'middle', horizontal: 'center' };
    sumHeader.height = 24;

    let grandTotalHours = 0;

    teamMembers.forEach(member => {
        const uId = String(member._id);
        const logs = workLogsByUser[uId] || [];
        const ts = timesheets[uId] || {};
        const totalUserHours = logs.reduce((sum, l) => sum + (Number(l.hours) || 0), 0);
        grandTotalHours += totalUserHours;

        const deptName = member.departmentRef?.name || member.department || '-';
        const desigTitle = member.designationRef?.title || member.designation || '-';
        const status = ts.status || (logs.length > 0 ? 'DRAFT' : 'NOT STARTED');

        const row = summarySheet.addRow([
            `${member.firstName} ${member.lastName || ''}`.trim(),
            member.employeeCode || '-',
            deptName,
            desigTitle,
            Number(totalUserHours.toFixed(2)),
            status
        ]);
        row.alignment = { vertical: 'middle' };
        row.getCell(5).alignment = { horizontal: 'right' };
        row.getCell(6).alignment = { horizontal: 'center' };
    });

    const sumTotalRow = summarySheet.addRow([
        'Grand Total', '', '', '', Number(grandTotalHours.toFixed(2)), ''
    ]);
    sumTotalRow.font = { bold: true, size: 11 };
    sumTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    sumTotalRow.alignment = { vertical: 'middle' };
    sumTotalRow.getCell(5).alignment = { horizontal: 'right' };

    summarySheet.columns = [
        { width: 28 }, { width: 16 }, { width: 22 }, { width: 22 }, { width: 20 }, { width: 18 }
    ];

    // 2. INDIVIDUAL EMPLOYEE SHEETS
    teamMembers.forEach(member => {
        const uId = String(member._id);
        const logs = [...(workLogsByUser[uId] || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
        const ts = timesheets[uId] || {};

        const sheetName = sanitizeSheetName(
            `${member.firstName} ${member.lastName || ''}`.trim(),
            member.employeeCode,
            existingNames
        );

        const sheet = workbook.addWorksheet(sheetName);

        // Header Banner
        sheet.mergeCells('A1:J1');
        const h1 = sheet.getCell('A1');
        h1.value = `Timesheet: ${member.firstName} ${member.lastName || ''} - ${format(reportDate, 'MMMM yyyy')}`;
        h1.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
        h1.alignment = { vertical: 'middle', horizontal: 'center' };
        sheet.getRow(1).height = 28;

        const managers = member.reportingManagers || [];
        const mgrNames = managers.length > 0
            ? managers.map(m => typeof m === 'object' ? `${m.firstName} ${m.lastName || ''}`.trim() : m).join(', ')
            : 'N/A';
        const deptName = member.departmentRef?.name || member.department || 'N/A';

        sheet.mergeCells('A2:E2');
        sheet.getCell('A2').value = `Employee Code: ${member.employeeCode || 'N/A'}  |  Department: ${deptName}  |  Supervisor(s): ${mgrNames}`;
        sheet.getCell('A2').font = { size: 10, bold: true, color: { argb: 'FF334155' } };

        sheet.mergeCells('F2:J2');
        sheet.getCell('F2').value = `Period: ${format(start, 'dd-MM-yyyy')} to ${format(end, 'dd-MM-yyyy')}  |  Status: ${ts.status || 'DRAFT'}`;
        sheet.getCell('F2').font = { size: 10, bold: true, color: { argb: 'FF334155' } };
        sheet.getCell('F2').alignment = { horizontal: 'right' };

        sheet.addRow([]); // Spacer

        // Columns Header
        const colHeader = sheet.addRow([
            'Date', 'Day', 'Project', 'Client', 'Module', 'Task', 'Work Description', 'Hours', 'Status', 'Billable'
        ]);
        colHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        colHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        colHeader.alignment = { vertical: 'middle', horizontal: 'center' };
        colHeader.height = 24;

        let totalUserHours = 0;

        if (logs.length === 0) {
            const emptyRow = sheet.addRow([
                '-', '-', 'No work log entries recorded for this period', '', '', '', '', 0, '-', '-'
            ]);
            emptyRow.alignment = { vertical: 'middle', horizontal: 'center' };
            emptyRow.font = { italic: true, color: { argb: 'FF94A3B8' } };
        } else {
            logs.forEach(log => {
                const logDate = log.date ? new Date(log.date) : null;
                const formattedDate = logDate ? format(logDate, 'dd-MM-yyyy') : '-';
                const dayName = logDate ? format(logDate, 'EEEE') : '-';
                const hrs = Number(log.hours) || 0;
                totalUserHours += hrs;

                const row = sheet.addRow([
                    formattedDate,
                    dayName,
                    log.projectName || log.project?.name || '-',
                    log.clientName || log.project?.client?.name || '-',
                    log.moduleName || log.module?.name || '-',
                    log.taskTitle || log.task?.name || '-',
                    log.description || '-',
                    hrs,
                    log.status || 'APPROVED',
                    log.billable === false ? 'No' : 'Yes'
                ]);

                row.alignment = { vertical: 'middle' };
                row.getCell(1).alignment = { horizontal: 'center' };
                row.getCell(2).alignment = { horizontal: 'center' };
                row.getCell(8).alignment = { horizontal: 'right' };
                row.getCell(9).alignment = { horizontal: 'center' };
                row.getCell(10).alignment = { horizontal: 'center' };

                if (log.status === 'REJECTED') {
                    row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                    row.getCell(9).font = { color: { argb: 'FFDC2626' }, bold: true };
                } else if (log.status === 'APPROVED') {
                    row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
                    row.getCell(9).font = { color: { argb: 'FF16A34A' }, bold: true };
                }
            });
        }

        const totalRow = sheet.addRow([
            'Total Hours', '', '', '', '', '', '', Number(totalUserHours.toFixed(2)), '', ''
        ]);
        totalRow.font = { bold: true, size: 11 };
        totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        totalRow.alignment = { vertical: 'middle' };
        totalRow.getCell(8).alignment = { horizontal: 'right' };

        sheet.columns = [
            { width: 14 }, // Date (dd-MM-yyyy)
            { width: 14 }, // Day
            { width: 22 }, // Project
            { width: 18 }, // Client
            { width: 20 }, // Module
            { width: 22 }, // Task
            { width: 38 }, // Description
            { width: 12 }, // Hours
            { width: 14 }, // Status
            { width: 12 }  // Billable
        ];
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Timesheets_Bulk_${format(reportDate, 'MMMM_yyyy')}.xlsx`;
    return { buffer, fileName };
};

export const buildBulkAttendanceWorkbook = async ({
    month,
    teamMembers = [],
    attendanceRecords = [],
    holidays = [],
    leaveRecords = [],
    weeklyOff = ['Saturday', 'Sunday'],
    flexWeeklyOff = {},
    exportOptions = {},
    users = []
}) => {
    const workbook = new ExcelJS.Workbook();
    const existingNames = new Set();
    const [yearNum, monthNum] = (month || format(new Date(), 'yyyy-MM')).split('-').map(Number);
    const reportDate = new Date(yearNum, monthNum - 1, 1);
    const start = startOfMonth(reportDate);
    const end = endOfMonth(reportDate);
    const days = eachDayOfInterval({ start, end });

    // Build Lookups
    const attendanceMap = {};
    (attendanceRecords || []).forEach(record => {
        const userId = String(record.user?._id || record.user || '');
        const dateStr = toDateKey(record.date);
        if (!attendanceMap[userId]) attendanceMap[userId] = {};
        attendanceMap[userId][dateStr] = record;
    });

    const leaveMap = {};
    (leaveRecords || []).forEach(leave => {
        const userId = String(leave.user?._id || leave.user || '');
        if (!leaveMap[userId]) leaveMap[userId] = {};
        const lStart = new Date(leave.startDate);
        const lEnd = new Date(leave.endDate);
        for (let d = new Date(lStart); d <= lEnd; d.setDate(d.getDate() + 1)) {
            const dStr = toDateKey(d);
            leaveMap[userId][dStr] = { type: leave.leaveType, sandwich: leave.sandwichRule };
        }
    });

    const holidayMap = {};
    (holidays || []).forEach(h => {
        const dateStr = toDateKey(h.date);
        holidayMap[dateStr] = h.name || 'Holiday';
    });

    const todayIST = new Date();
    todayIST.setHours(0, 0, 0, 0);

    // 1. SUMMARY SHEET
    const summarySheet = workbook.addWorksheet('Summary');
    existingNames.add('summary');

    summarySheet.mergeCells('A1:J1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = `Team Attendance Summary - ${format(reportDate, 'MMMM yyyy')}`;
    titleCell.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    summarySheet.getRow(1).height = 30;

    summarySheet.mergeCells('A2:J2');
    summarySheet.getCell('A2').value = `Period: ${format(start, 'dd-MM-yyyy')} to ${format(end, 'dd-MM-yyyy')} | Total Employees: ${teamMembers.length}`;
    summarySheet.getCell('A2').font = { size: 11, italic: true, color: { argb: 'FF475569' } };
    summarySheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    summarySheet.getRow(2).height = 20;

    summarySheet.addRow([]);

    const sumHeader = summarySheet.addRow([
        'Employee Name', 'Employee Code', 'Department', 'Present Days', 'Half Days', 'Absent Days', 'Leaves', 'Week Offs', 'Holidays', 'Total Logged (Hrs)'
    ]);
    sumHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    sumHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    sumHeader.alignment = { vertical: 'middle', horizontal: 'center' };
    sumHeader.height = 24;

    const employeeStats = [];

    // 2. INDIVIDUAL EMPLOYEE SHEETS
    teamMembers.forEach(member => {
        const uId = String(member._id);
        const fullUser = users.find(u => String(u._id) === uId) || member;
        const userLogs = attendanceMap[uId] || {};
        const userLeaves = leaveMap[uId] || {};

        const joiningDate = fullUser.joiningDate ? new Date(fullUser.joiningDate) : null;
        if (joiningDate) joiningDate.setHours(0, 0, 0, 0);

        const dateOfLeaving = fullUser.dateOfLeaving ? new Date(fullUser.dateOfLeaving) : null;
        if (dateOfLeaving) dateOfLeaving.setHours(23, 59, 59, 999);

        const userFlexDays = Array.isArray(fullUser.customFlexibleOffDays)
            ? fullUser.customFlexibleOffDays
            : (Array.isArray(member.customFlexibleOffDays) ? member.customFlexibleOffDays : []);

        const sheetName = sanitizeSheetName(
            `${member.firstName} ${member.lastName || ''}`.trim(),
            member.employeeCode,
            existingNames
        );

        const sheet = workbook.addWorksheet(sheetName);

        // Header Banner
        sheet.mergeCells('A1:G1');
        const h1 = sheet.getCell('A1');
        h1.value = `Attendance Report: ${member.firstName} ${member.lastName || ''} - ${format(reportDate, 'MMMM yyyy')}`;
        h1.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
        h1.alignment = { vertical: 'middle', horizontal: 'center' };
        sheet.getRow(1).height = 28;

        const managers = fullUser.reportingManagers || member.reportingManagers || [];
        const mgrNames = managers.length > 0
            ? managers.map(m => typeof m === 'object' ? `${m.firstName} ${m.lastName || ''}`.trim() : m).join(', ')
            : 'N/A';
        const deptName = fullUser.departmentRef?.name || fullUser.department || member.department || 'N/A';

        sheet.mergeCells('A2:D2');
        sheet.getCell('A2').value = `Employee Code: ${member.employeeCode || 'N/A'}  |  Department: ${deptName}  |  Joining: ${joiningDate ? format(joiningDate, 'dd-MM-yyyy') : 'N/A'}`;
        sheet.getCell('A2').font = { size: 10, bold: true, color: { argb: 'FF334155' } };

        sheet.mergeCells('E2:G2');
        sheet.getCell('E2').value = `Supervisor(s): ${mgrNames}`;
        sheet.getCell('E2').font = { size: 10, bold: true, color: { argb: 'FF334155' } };
        sheet.getCell('E2').alignment = { horizontal: 'right' };

        sheet.addRow([]); // Spacer

        // Columns
        const colHeader = sheet.addRow([
            'Date', 'Day', 'Status', 'In Time', 'Out Time', 'Duration', 'Approval Status'
        ]);
        colHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        colHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        colHeader.alignment = { vertical: 'middle', horizontal: 'center' };
        colHeader.height = 24;

        let presentCount = 0;
        let halfDayCount = 0;
        let absentCount = 0;
        let leaveCount = 0;
        let weekOffCount = 0;
        let holidayCount = 0;
        let totalLoggedMs = 0;

        days.forEach(day => {
            const dateStr = toDateKey(day);
            const formattedDate = format(day, 'dd-MM-yyyy'); // Strictly DD-MM-YYYY
            const dayName = format(day, 'EEEE');
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);

            const record = userLogs[dateStr];
            const leaveData = userLeaves[dateStr];
            const holidayName = holidayMap[dateStr];

            const weeklyOffDays = weeklyOff || ['Saturday', 'Sunday'];
            const isCompanyWeeklyOff = weeklyOffDays.some(woff => woff.trim().toLowerCase() === dayName.toLowerCase());
            const isCustomFlexOff = userFlexDays.some(flexDay => {
                const cleanFlex = String(flexDay || '').trim().toLowerCase();
                return cleanFlex === dateStr.toLowerCase() || cleanFlex === dayName.toLowerCase();
            });
            const isWeeklyOff = isCompanyWeeklyOff || isCustomFlexOff;

            const isFuture = dayStart > todayIST;
            const isBeforeJoining = joiningDate && dayStart < joiningDate;
            const isAfterLeaving = dateOfLeaving && dayStart > dateOfLeaving;

            const hasAttendance = Boolean(
                record && (
                    record.clockIn ||
                    record.clockInIST ||
                    record.status === 'PRESENT' ||
                    record.status === 'HALF_DAY' ||
                    isAttendanceApproved(record)
                )
            );

            let isHalfDay = record?.status === 'HALF_DAY';
            let durationText = '-';

            if (record && (record.clockIn || record.clockInIST)) {
                const startTime = new Date(record.clockIn);
                const isToday = day.toDateString() === new Date().toDateString();
                let endTime = record.clockOut ? new Date(record.clockOut) : (isToday ? new Date() : new Date(day));
                if (!record.clockOut && !isToday) {
                    endTime.setHours(23, 59, 59, 999);
                }

                if (record.clockIn) {
                    const diffMs = Math.max(0, endTime - startTime);
                    totalLoggedMs += diffMs;
                    const hours = Math.floor(diffMs / (1000 * 60 * 60));
                    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    durationText = `${hours}h ${minutes}m`;
                    const durHrs = diffMs / 3600000;
                    if (durHrs >= 4 && durHrs < 8) {
                        isHalfDay = true;
                    }
                }
            }

            const isOffDay = !!holidayName || isWeeklyOff;
            const showLeave = leaveData && (!isOffDay || leaveData.sandwich);

            let status = 'Absent';
            let rowColor = 'FFF2DCDB'; // light red
            let fontColor = 'FF991B1B';

            if (isBeforeJoining || isAfterLeaving) {
                status = 'Not Applicable';
                rowColor = 'FFFFFFFF';
                fontColor = 'FF94A3B8';
            } else if (hasAttendance) {
                if (isHalfDay) {
                    status = 'Half Day';
                    rowColor = 'FFFEF3C7'; // light yellow
                    fontColor = 'FF92400E';
                    halfDayCount++;
                } else {
                    status = 'Present';
                    rowColor = 'FFEBF1DE'; // light green
                    fontColor = 'FF166534';
                    presentCount++;
                }
            } else if (showLeave) {
                status = leaveData.type ? `Leave (${leaveData.type})` : 'Leave';
                rowColor = 'FFFFE0B2'; // light peach
                fontColor = 'FF9A3412';
                leaveCount++;
            } else if (holidayName) {
                status = holidayName.toLowerCase().includes('holiday') ? holidayName : `Holiday (${holidayName})`;
                rowColor = 'FFD1F2EB'; // light teal/mint
                fontColor = 'FF115E59';
                holidayCount++;
            } else if (isCustomFlexOff) {
                status = 'Flexible Off';
                rowColor = 'FFEDE9FE'; // light purple
                fontColor = 'FF5B21B6';
                weekOffCount++;
            } else if (isCompanyWeeklyOff) {
                status = 'Week Off';
                rowColor = 'FFF2F2F2'; // light gray
                fontColor = 'FF475569';
                weekOffCount++;
            } else if (isFuture) {
                status = '-';
                rowColor = 'FFFFFFFF';
                fontColor = 'FF94A3B8';
            } else {
                status = 'Absent';
                rowColor = 'FFF2DCDB';
                fontColor = 'FF991B1B';
                absentCount++;
            }

            const inTimeStr = record ? formatTime(record.clockIn, record.clockInIST) : '-';
            const outTimeStr = record ? formatTime(record.clockOut, record.clockOutIST) : '-';
            const approvalStr = isAttendanceApproved(record) ? 'Approved' : (record?.approvalStatus || '-');

            const row = sheet.addRow([
                formattedDate,
                dayName,
                status,
                inTimeStr,
                outTimeStr,
                durationText,
                approvalStr
            ]);

            row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
            row.alignment = { vertical: 'middle', horizontal: 'center' };
            row.getCell(3).font = { bold: true, color: { argb: fontColor } };
        });

        // Bottom Total
        const totalHoursLogged = (totalLoggedMs / 3600000).toFixed(1);
        const btmSummaryRow = sheet.addRow([
            'Monthly Summary',
            '',
            `Present: ${presentCount} | Half Day: ${halfDayCount} | Absent: ${absentCount} | Leaves: ${leaveCount} | Week Offs: ${weekOffCount} | Holidays: ${holidayCount}`,
            '',
            '',
            `${totalHoursLogged} hrs`,
            ''
        ]);
        btmSummaryRow.font = { bold: true, size: 10 };
        btmSummaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        btmSummaryRow.alignment = { vertical: 'middle', horizontal: 'center' };

        sheet.columns = [
            { width: 14 }, // Date (dd-MM-yyyy)
            { width: 14 }, // Day
            { width: 26 }, // Status
            { width: 14 }, // In Time
            { width: 14 }, // Out Time
            { width: 16 }, // Duration
            { width: 16 }  // Approval Status
        ];

        employeeStats.push({
            name: `${member.firstName} ${member.lastName || ''}`.trim(),
            code: member.employeeCode || '-',
            dept: deptName,
            present: presentCount,
            halfDay: halfDayCount,
            absent: absentCount,
            leaves: leaveCount,
            weekOffs: weekOffCount,
            holidays: holidayCount,
            totalHours: totalHoursLogged
        });
    });

    // Populate Summary Sheet rows
    employeeStats.forEach(stat => {
        const row = summarySheet.addRow([
            stat.name, stat.code, stat.dept, stat.present, stat.halfDay, stat.absent, stat.leaves, stat.weekOffs, stat.holidays, Number(stat.totalHours)
        ]);
        row.alignment = { vertical: 'middle' };
        row.getCell(4).alignment = { horizontal: 'center' };
        row.getCell(5).alignment = { horizontal: 'center' };
        row.getCell(6).alignment = { horizontal: 'center' };
        row.getCell(7).alignment = { horizontal: 'center' };
        row.getCell(8).alignment = { horizontal: 'center' };
        row.getCell(9).alignment = { horizontal: 'center' };
        row.getCell(10).alignment = { horizontal: 'right' };
    });

    summarySheet.columns = [
        { width: 28 }, { width: 16 }, { width: 22 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 18 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Attendance_Bulk_${format(reportDate, 'MMMM_yyyy')}.xlsx`;
    return { buffer, fileName };
};

