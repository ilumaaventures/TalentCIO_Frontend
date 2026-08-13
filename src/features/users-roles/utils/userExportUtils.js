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
        const isWeeklyOff = weeklyOffDays.includes(format(day, 'EEEE'));
        let status = 'Absent';
        let rowColor = 'FFF2DCDB';

        const joiningDate = targetUser.joiningDate ? new Date(targetUser.joiningDate) : null;
        if (joiningDate) joiningDate.setHours(0, 0, 0, 0);

        const holiday = holidaysData.find(h => toDateKey(h.date) === dateStr);

        if (joiningDate && day < joiningDate) {
            status = 'Not Applicable';
            rowColor = 'FFFFFFFF';
        } else if (isAttendanceApproved(record)) {
            status = 'Present';
            rowColor = 'FFEBF1DE';
        } else if (holiday) {
            status = holiday.name;
            rowColor = holiday.isOptional ? 'FFFFE0B2' : 'FFD1F2EB';
        } else if (isWeeklyOff) {
            status = 'Weekoff';
            rowColor = 'FFF2F2F2';
        }

        const row = sheet.addRow([
            format(day, 'dd-MMM-yyyy'),
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
