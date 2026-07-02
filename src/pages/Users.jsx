import React, { useCallback, useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Search, Shield, Download, ArrowUpDown, ListFilter, X, ChevronLeft, ChevronRight, Eye, EyeOff, Settings2, HelpCircle, Check, ChevronDown, ChevronUp } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { createCachePayload, readSessionCache } from '../utils/cache';
import { exportCandidateHRIS } from '../utils/hrisExporter';
import { buildMasterSalaryStructure, PT_STATE_LIST, getMonthlyPT } from '../utils/payroll';

const DEFAULT_ATTENDANCE_SHIFTS = [
    { code: 'general', name: 'General' },
    { code: 'any', name: 'Any Time' }
];

const PAGE_SIZE_OPTIONS = [50, 100];

const buildUserListFingerprint = (users = []) => users
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

const buildRoleListFingerprint = (roles = []) => roles
    .map((role) => `${role._id}:${role.name || ''}`)
    .join('|');

const Users = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [_holidays, _setHolidays] = useState([]);
    const [payrollConfig, setPayrollConfig] = useState(null);
    const [showSalarySection, setShowSalarySection] = useState(false);

    useEffect(() => {
        const fetchPayrollConfig = async () => {
            try {
                const res = await api.get('/payroll/config');
                setPayrollConfig(res.data);
            } catch (err) {
                console.error('Failed to fetch payroll config:', err);
            }
        };
        fetchPayrollConfig();
    }, []);

    // Export Options State
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportOptions, setExportOptions] = useState({
        status: true,
        checkInOut: true,
        duration: true,
        leaves: true,
        documents: false,
        hrisProfiles: false
    });
    const [exportMonth, setExportMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('joining_recent');
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDepartment, setFilterDepartment] = useState('all');
    const [filterEmploymentType, setFilterEmploymentType] = useState('all');
    const [filterJoiningDate, setFilterJoiningDate] = useState('');
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [showPassword, setShowPassword] = useState(false);

    // Helpers for Export
    const formatTime = (dateString, istString) => {
        if (istString && istString.includes(',')) return istString.split(',')[1]?.trim() || '';
        if (!dateString) return '--:--';
        return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const calculateDuration = (start, end, recordDate) => {
        if (!start) return '--';
        const startTime = new Date(start);
        let endTime;

        if (end) {
            endTime = new Date(end);
        } else {
            const today = new Date();
            const rDate = recordDate ? new Date(recordDate) : today;

            // If it's today and no checkout, use current time
            // If it's a past date and no checkout, auto-checkout at 11:59:59 PM
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

    const toDateKey = (value) => format(new Date(value), 'yyyy-MM-dd');
    const sanitizeFileNamePart = (value) => {
        const normalized = String(value || 'user')
            .replace(/[<>:"/\\|?*]/g, '')
            .trim()
            .replace(/\s+/g, '_');

        return normalized || 'user';
    };

    const sanitizeZipFileName = (value, fallback = 'document') => {
        const original = String(value || fallback).trim();
        const extensionIndex = original.lastIndexOf('.');
        const hasExtension = extensionIndex > 0 && extensionIndex < original.length - 1;
        const baseName = hasExtension ? original.slice(0, extensionIndex) : original;
        const extension = hasExtension ? original.slice(extensionIndex) : '';
        const safeBaseName = sanitizeFileNamePart(baseName || fallback);

        return `${safeBaseName}${extension}`;
    };

    const isAttendanceApproved = (record) =>
        record?.approvalStatus === 'APPROVED' || Boolean(record?.approvedBy);

    const buildAttendanceWorkbook = async (targetUser, year, month, holidaysDataOverride = null) => {
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
            const weeklyOffDays = historyRes.data?.weeklyOff || user?.company?.settings?.attendance?.weeklyOff || ['Sunday'];
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

    const _handleExportAttendance = async (targetUser) => {
        const toastId = toast.loading('Generating Report...');
        try {
            const [year, month] = exportMonth.split('-').map(Number);
            const { buffer, fileName } = await buildAttendanceWorkbook(targetUser, year, month);
            saveAs(new Blob([buffer]), fileName);
            toast.success('Report Downloaded', { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate report', { id: toastId });
        }
    };

    const handleDownloadAttendanceZip = async () => {
        const toastId = toast.loading('Preparing support documents ZIP...');
        try {
            if (selectedEmployeeIds.length === 0) {
                toast.error('Select at least one employee to download support documents.', { id: toastId });
                return;
            }

            const monthKey = exportMonth;
            const selectedUsers = users.filter((listedUser) => selectedEmployeeIds.includes(listedUser._id));

            if (selectedUsers.length === 0) {
                toast.error('Selected users are not available for document download.', { id: toastId });
                return;
            }

            const zip = new JSZip();
            const failedUsers = [];
            let addedFilesCount = 0;

            for (const targetUser of selectedUsers) {
                try {
                    const attachmentRes = await api.get(`/attendance/attachments/${targetUser._id}/${monthKey}`);
                    const files = Array.isArray(attachmentRes.data?.files) ? attachmentRes.data.files : [];

                    if (files.length === 0) {
                        continue;
                    }

                    const userFolder = sanitizeFileNamePart(
                        `${targetUser.firstName || ''}_${targetUser.lastName || ''}_${targetUser.employeeCode || targetUser.email || targetUser._id}`
                    );

                    for (let index = 0; index < files.length; index += 1) {
                        const file = files[index];
                        if (!file?.url) {
                            continue;
                        }

                        const response = await fetch(file.url);
                        if (!response.ok) {
                            throw new Error(`Unable to download ${file.name || 'document'}`);
                        }

                        const blob = await response.blob();
                        const fileName = sanitizeZipFileName(file.name, `document_${index + 1}`);
                        zip.file(`${userFolder}/${String(index + 1).padStart(2, '0')}_${fileName}`, blob);
                        addedFilesCount += 1;
                    }
                } catch (error) {
                    console.error(`Failed to prepare support documents for ${targetUser.email}`, error);
                    failedUsers.push(`${targetUser.firstName} ${targetUser.lastName || ''}`.trim() || targetUser.email);
                }
            }

            if (addedFilesCount === 0) {
                toast.error('No uploaded support documents were found for the selected users in that month.', { id: toastId });
                return;
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const [year, month] = monthKey.split('-').map(Number);
            const zipFileName = `Support_Documents_${format(new Date(year, month - 1, 1), 'MMMM_yyyy')}.zip`;
            saveAs(zipBlob, zipFileName);

            if (failedUsers.length > 0) {
                toast.success(`ZIP downloaded. ${failedUsers.length} user(s) could not be included.`, { id: toastId });
                return;
            }

            toast.success('Support documents ZIP downloaded successfully.', { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error('Failed to download support documents ZIP.', { id: toastId });
        }
    };

    const handleExportDownload = async () => {
        const hasAttendanceSelection = exportOptions.status
            || exportOptions.checkInOut
            || exportOptions.duration
            || exportOptions.leaves;
        const shouldDownloadDocuments = hasAttendanceDocumentFeature && exportOptions.documents;
        const shouldDownloadHRIS = canExportHRIS && exportOptions.hrisProfiles;

        if (!hasAttendanceSelection && !shouldDownloadDocuments && !shouldDownloadHRIS) {
            toast.error('Select at least one export option before downloading.');
            return;
        }

        if (hasAttendanceSelection) {
            await handleExportTeamAttendance();
        }

        if (shouldDownloadDocuments) {
            await handleDownloadAttendanceZip();
        }

        if (shouldDownloadHRIS) {
            await exportCandidateHRIS(selectedEmployeeIds);
        }

        setShowExportModal(false);
    };

    const handleExportTeamAttendance = async () => {
        const toastId = toast.loading('Generating Team Report...');
        try {
            if (selectedEmployeeIds.length === 0) {
                toast.error('Select at least one employee to export.', { id: toastId });
                return;
            }

            const [year, month] = exportMonth.split('-');

            // Fetch data
            const res = await api.get(`/attendance/team-report?year=${year}&month=${month}`);
            const { teamMembers, attendanceRecords, leaveRecords, holidays, weeklyOff } = res.data;

            if (!teamMembers || teamMembers.length === 0) {
                toast.error('No team members found', { id: toastId });
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Team Attendance');

            // 1. Generate Date Columns (Horizontal)
            const daysInMonth = new Date(year, month, 0).getDate();
            const dateColumns = [];
            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, month - 1, d);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                dateColumns.push({ header: `${String(d).padStart(2, '0')}-${dayName}`, key: `day_${d}`, width: 15 });
            }

            // Set Columns: Employee Name + Date Columns
            worksheet.columns = [
                { header: 'Employee / Details', key: 'name', width: 35 },
                ...dateColumns
            ];

            // Freeze first row and first column
            worksheet.views = [
                { state: 'frozen', xSplit: 1, ySplit: 1 }
            ];

            // Style Header
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Slate

            // 2. Prepare Data Map
            const attendanceMap = {};
            attendanceRecords.forEach(record => {
                const userId = record.user.toString();
                const dateStr = toDateKey(record.date);
                if (!attendanceMap[userId]) attendanceMap[userId] = {};
                attendanceMap[userId][dateStr] = record;
            });

            // 3. Prepare Leave Map
            const leaveMap = {};
            if (leaveRecords && leaveRecords.length > 0) {
                leaveRecords.forEach(leave => {
                    const userId = leave.user.toString();
                    if (!leaveMap[userId]) leaveMap[userId] = {};

                    const start = new Date(leave.startDate);
                    const end = new Date(leave.endDate);
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        const dStr = toDateKey(d);
                        leaveMap[userId][dStr] = { type: leave.leaveType, sandwich: leave.sandwichRule };
                    }
                });
            }

            // 4. Prepare Holiday Map
            const holidayMap = {};
            if (holidays && holidays.length > 0) {
                holidays.forEach(h => {
                    const dateStr = toDateKey(h.date);
                    holidayMap[dateStr] = h.name;
                });
            }

            // Helpers for this export
            const extractTime = (istString) => istString.split(',')[1]?.trim() || istString;
            const formatTimeSimple = (date) => new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

            // 3. Add Data Rows (Grouped)
            const usersToExport = teamMembers.filter((teamMember) =>
                selectedEmployeeIds.includes(teamMember._id)
            );

            if (usersToExport.length === 0) {
                toast.error('None of the selected employees are available in this export view.', { id: toastId });
                return;
            }

            usersToExport.forEach(user => {
                const userLogs = attendanceMap[user._id] || {};
                const userLeaves = leaveMap[user._id] || {};

                // --- PARENT ROW (Employee Name) ---
                const parentRow = worksheet.addRow({
                    name: `${user.firstName} ${user.lastName || ''}${user.employeeCode ? ` (${user.employeeCode})` : ''}`
                });
                parentRow.font = { bold: true, size: 11, color: { argb: 'FF1E293B' } };
                parentRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // Light Slate

                // --- CHILD ROWS ---
                const rowsToAdd = [];
                const statusRow = { name: '   ↳ Status' };
                const checkInRow = { name: '   ↳ Check In' };
                const checkOutRow = { name: '   ↳ Check Out' };
                const durationRow = { name: '   ↳ Duration' };
                const leavesRow = { name: '   ↳ Leaves' };
                const approvedRow = { name: '   ↳ Approved' };

                // Color Map for Cells
                const _cellRefMap = {}; // store cell refs to apply color later (or apply directly if possible)

                for (let d = 1; d <= daysInMonth; d++) {
                    const dateObj = new Date(year, month - 1, d);
                    const dateStr = toDateKey(dateObj);
                    const record = userLogs[dateStr];
                    const colKey = `day_${d}`;

                    const weeklyOffDays = weeklyOff || ['Saturday', 'Sunday'];
                    const dayName = format(dateObj, 'EEEE');
                    const isWeeklyOff = weeklyOffDays.some(woff => woff.trim().toLowerCase() === dayName.toLowerCase());
                    const leaveData = userLeaves[dateStr];
                    const holidayName = holidayMap[dateStr];

                    // -- Calculate Duration First --
                    let _durationHours = 0;
                    if (record && record.clockIn && record.clockOut) {
                        const dur = Math.abs(new Date(record.clockOut) - new Date(record.clockIn));
                        _durationHours = dur / 3600000; // milliseconds to hours
                    }

                    // -- 1. Status Logic --
                    let statusShort = 'Absent'; // Default
                    let _cellColor = 'FFF2DCDB'; // Red (Absent)

                    const isOffDay = !!holidayName || isWeeklyOff;
                    const showLeave = leaveData && (!isOffDay || leaveData.sandwich);

                    if (isAttendanceApproved(record)) {
                        statusShort = 'Present';
                        _cellColor = 'FFEBF1DE'; // Light Green
                    } else if (showLeave || holidayName || isWeeklyOff) {
                        statusShort = '';
                        _cellColor = 'FFFFFFFF';
                    }

                    if (exportOptions.status) {
                        statusRow[colKey] = statusShort;
                        // We need row index to style specific cells, but here we only have row object *before* adding to sheet.
                        // Solution: Store needed colors in a parallel structure or style after adding.
                        // Better: Apply check and style *after* adding logic below.
                    }

                    // -- 2. Leaves Logic --
                    if (exportOptions.leaves) {
                        leavesRow[colKey] = leaveData?.type || '-';
                    }

                    // -- 3. Time/Duration Data --
                    if (record) {
                        // Check In
                        if (record.clockInIST) checkInRow[colKey] = extractTime(record.clockInIST);
                        else if (record.clockIn) checkInRow[colKey] = formatTimeSimple(record.clockIn);
                        else checkInRow[colKey] = '-';

                        // Check Out
                        if (record.clockOutIST) checkOutRow[colKey] = extractTime(record.clockOutIST);
                        else if (record.clockOut) checkOutRow[colKey] = formatTimeSimple(record.clockOut);
                        else checkOutRow[colKey] = '-';

                        // Duration
                        durationRow[colKey] = calculateDuration(record.clockIn, record.clockOut, dateObj);

                        // Half Day Suffix Logic
                        if (record.clockIn) {
                            const start = new Date(record.clockIn);
                            const end = record.clockOut ? new Date(record.clockOut) : new Date(dateObj).setHours(23, 59, 59, 999);
                            const durHrs = Math.abs(end - start) / 3600000;
                            if (durHrs >= 5 && durHrs < 8) {
                                durationRow[colKey] += ' (Half Day)';
                            }
                        }
                        approvedRow[colKey] = isAttendanceApproved(record) ? 'Approved' : '';
                    } else {
                        checkInRow[colKey] = '-';
                        checkOutRow[colKey] = '-';
                        durationRow[colKey] = '-';
                        approvedRow[colKey] = '';
                    }
                }

                // Push selected rows to array in specific order
                if (exportOptions.status) rowsToAdd.push(statusRow);
                if (exportOptions.checkInOut) {
                    rowsToAdd.push(checkInRow);
                    rowsToAdd.push(checkOutRow);
                }
                if (exportOptions.duration) rowsToAdd.push(durationRow);
                if (exportOptions.leaves) rowsToAdd.push(leavesRow);
                rowsToAdd.push(approvedRow);

                // Add to Worksheet and Style
                rowsToAdd.forEach(rowData => {
                    const row = worksheet.addRow(rowData);
                    row.outlineLevel = 1; // Grouping
                    row.getCell('name').font = { italic: true, color: { argb: 'FF64748B' } };
                    row.alignment = { horizontal: 'center' };
                    row.getCell('name').alignment = { horizontal: 'left' };

                    // Apply Color Logic for Status Row
                    if (rowData.name === '   ↳ Status') {
                        for (let d = 1; d <= daysInMonth; d++) {
                            const dateObj = new Date(year, month - 1, d);
                            const dateStr = toDateKey(dateObj);
                            const record = userLogs[dateStr];
                            const leaveData = userLeaves[dateStr];
                            const holidayName = holidayMap[dateStr];
                            const weeklyOffDays = weeklyOff || ['Saturday', 'Sunday'];
                            const dayName = format(dateObj, 'EEEE');
                            const isWeeklyOff = weeklyOffDays.some(woff => woff.trim().toLowerCase() === dayName.toLowerCase());
                            // -- Apply Same Logic for Coloring --
                            let _durationHours = 0;
                            if (record && record.clockIn && record.clockOut) {
                                const dur = Math.abs(new Date(record.clockOut) - new Date(record.clockIn));
                                _durationHours = dur / 3600000;
                            }

                            let cellColor = 'FFF2DCDB'; // Red

                            const isOffDay = !!holidayName || isWeeklyOff;
                            const showLeave = leaveData && (!isOffDay || leaveData.sandwich);

                            if (isAttendanceApproved(record)) cellColor = 'FFEBF1DE';
                            else if (showLeave || holidayName || isWeeklyOff) cellColor = 'FFFFFFFF';

                            const colKey = `day_${d}`;
                            // This library might not support key-based cell access directly on 'row' object efficiently if strictly column indexed?
                            // Actually row.getCell(colKey) works if columns defined.
                            const cell = row.getCell(colKey);
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cellColor } };
                        }
                    }
                });
            });

            // Enable Outline Property
            worksheet.properties.outlineProperties = {
                summaryBelow: false,
                summaryRight: false,
            };

            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = `Team_Attendance_${format(new Date(year, month - 1), 'MMMM_yyyy')}.xlsx`;
            saveAs(new Blob([buffer]), fileName);
            toast.success('Downloaded', { id: toastId });

        } catch (error) {
            console.error(error);
            toast.error('Failed to export', { id: toastId });
        }
    };

    // Form State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        roleId: '',
        department: '',
        employeeCode: '',
        joiningDate: '',
        directReports: [],
        reportingManagers: [],
        employmentType: 'Full Time',
        workLocation: '',
        attendanceMode: 'clock_in_out',
        attendanceShiftCode: 'general'
    });

    const fetchData = useCallback(async () => {
        try {
            const isAdmin = user?.roles?.includes('Admin') || user?.roles?.some(r => r.name === 'Admin');
            const canReadUsers = user?.permissions?.includes('user.read');
            const canReadRoles = user?.permissions?.includes('role.read') || isAdmin;

            // Session Caching Logic
            const cacheKey = `user_data_${user?._id}`;
            const cachedPayload = readSessionCache(cacheKey);

            if (cachedPayload) {
                // Use .data if it exists (new format), else fallback to top-level (old format)
                const data = cachedPayload.data || cachedPayload;
                setUsers((data.users || []).filter((listedUser) => listedUser.isDeleted !== true));
                setRoles(data.roles || []);
                setLoading(false); // Immediate UI update
            }

            let usersData = [];
            let rolesData = [];

            // 1. Fetch Users
            if (isAdmin || canReadUsers) {
                try {
                    const res = await api.get('/admin/users');
                    usersData = res.data;
                } catch (err) {
                    console.error('Admin users fetch failed', err);
                }
            } else {
                // Fallback for Managers/Team View
                try {
                    const teamRes = await api.get('/admin/users/team');
                    usersData = teamRes.data;
                } catch {
                    console.log('Team fetch failed or empty');
                }
            }

            // 2. Fetch Roles (Admin only)
            if (canReadRoles) {
                try {
                    const rolesRes = await api.get('/admin/roles');
                    rolesData = rolesRes.data;
                } catch {
                    console.log('Roles fetch silenced');
                }
            }

            const visibleUsers = usersData.filter((listedUser) => listedUser.isDeleted !== true);
            setUsers(visibleUsers);
            setRoles(rolesData);

            // Always refresh the cache with the latest server ids so profile links cannot
            // keep pointing at stale records after onboarding transfers.
            const newFingerprint = JSON.stringify({
                users: buildUserListFingerprint(usersData),
                roles: buildRoleListFingerprint(rolesData)
            });

            const minimalUsers = usersData.map(u => ({
                _id: u._id,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                employeeCode: u.employeeCode,
                joiningDate: u.joiningDate,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
                department: u.department,
                employmentType: u.employmentType,
                workLocation: u.workLocation,
                attendanceMode: u.attendanceMode,
                attendanceShiftCode: u.attendanceShiftCode,
                isActive: u.isActive,
                isDeleted: u.isDeleted,
                roles: u.roles?.map(r => ({ _id: r._id, name: r.name })),
                reportingManagers: u.reportingManagers?.map(m => ({ _id: m._id, firstName: m.firstName, lastName: m.lastName, email: m.email }))
            }));

            const minimalRoles = rolesData.map(r => ({ _id: r._id, name: r.name }));

            const payload = createCachePayload({
                users: minimalUsers,
                roles: minimalRoles
            }, newFingerprint);

            sessionStorage.setItem(cacheKey, JSON.stringify(payload));
        } catch (error) {
            toast.error('Failed to load data');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user]);


    const [filterDate, _setFilterDate] = useState('');

    const departmentOptions = useMemo(
        () => [...new Set(users.map((listedUser) => listedUser.department).filter(Boolean))].sort((left, right) => left.localeCompare(right)),
        [users]
    );

    const employmentTypeOptions = useMemo(
        () => [...new Set(users.map((listedUser) => listedUser.employmentType).filter(Boolean))].sort((left, right) => left.localeCompare(right)),
        [users]
    );

    const filteredUsers = useMemo(() => {
        const filtered = users.filter((listedUser) => {
            if (listedUser.isDeleted) {
                return false;
            }

            const normalizedSearch = searchTerm.toLowerCase();
            const matchesSearch = (
                listedUser.firstName?.toLowerCase().includes(normalizedSearch) ||
                listedUser.lastName?.toLowerCase().includes(normalizedSearch) ||
                listedUser.email?.toLowerCase().includes(normalizedSearch) ||
                listedUser.employeeCode?.toLowerCase().includes(normalizedSearch)
            );

            const joiningDateValue = listedUser.joiningDate
                ? new Date(listedUser.joiningDate).toISOString().split('T')[0]
                : '';

            const matchesDate = !filterDate || joiningDateValue === filterDate;
            const matchesJoiningDate = !filterJoiningDate || joiningDateValue === filterJoiningDate;
            const matchesStatus = filterStatus === 'all'
                || (filterStatus === 'active' && listedUser.isActive)
                || (filterStatus === 'inactive' && !listedUser.isActive);
            const matchesDepartment = filterDepartment === 'all' || (listedUser.department || '') === filterDepartment;
            const matchesEmploymentType = filterEmploymentType === 'all' || (listedUser.employmentType || '') === filterEmploymentType;

            return matchesSearch
                && matchesDate
                && matchesJoiningDate
                && matchesStatus
                && matchesDepartment
                && matchesEmploymentType;
        });

        const sorted = [...filtered];
        switch (sortOption) {
            case 'alphabetical_az':
                sorted.sort((left, right) => (
                    `${left.firstName || ''} ${left.lastName || ''}`.trim().localeCompare(
                        `${right.firstName || ''} ${right.lastName || ''}`.trim()
                    )
                ));
                break;
            case 'employee_code':
                sorted.sort((left, right) => String(left.employeeCode || '').localeCompare(String(right.employeeCode || ''), undefined, { numeric: true, sensitivity: 'base' }));
                break;
            case 'newest':
                sorted.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
                break;
            case 'oldest':
                sorted.sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0));
                break;
            case 'joining_recent':
            default:
                sorted.sort((left, right) => new Date(right.joiningDate || 0) - new Date(left.joiningDate || 0));
                break;
        }

        return sorted;
    }, [
        users,
        searchTerm,
        filterDate,
        filterJoiningDate,
        filterStatus,
        filterDepartment,
        filterEmploymentType,
        sortOption
    ]);

    const totalPages = Math.max(Math.ceil(filteredUsers.length / rowsPerPage), 1);

    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return filteredUsers.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredUsers, currentPage, rowsPerPage]);

    const paginationNumbers = useMemo(() => {
        const maxVisibleButtons = 5;
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);
        startPage = Math.max(1, endPage - maxVisibleButtons + 1);

        return Array.from(
            { length: endPage - startPage + 1 },
            (_, index) => startPage + index
        );
    }, [currentPage, totalPages]);

    const hasActiveFilters = filterStatus !== 'all'
        || filterDepartment !== 'all'
        || filterEmploymentType !== 'all'
        || Boolean(filterJoiningDate);

    const clearFilters = () => {
        setFilterStatus('all');
        setFilterDepartment('all');
        setFilterEmploymentType('all');
        setFilterJoiningDate('');
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterDate, filterJoiningDate, filterStatus, filterDepartment, filterEmploymentType, sortOption]);

    useEffect(() => {
        setCurrentPage((page) => Math.min(page, totalPages));
    }, [totalPages]);

    useEffect(() => {
        setSelectedEmployeeIds((current) => current.filter((id) => users.some((listedUser) => listedUser._id === id)));
    }, [users]);

    const canEdit = roles.length > 0; // If we can see roles, we are likely Admin
    const userRoles = user?.roles?.map(r => typeof r === 'string' ? r : r?.name) || [];
    const hasAdminOrHR = userRoles.some(r => ['Admin', 'Super Admin', 'System Admin', 'HR Admin', 'HR'].includes(r));
    const canExportHRIS = hasAdminOrHR
        || user?.permissions?.includes('dossier.export')
        || user?.permissions?.includes('*')
        || user?.hasAllPermissions;
    const attendanceShiftOptions = user?.company?.settings?.attendance?.attendanceShifts || DEFAULT_ATTENDANCE_SHIFTS;
    const hasAttendanceDocumentFeature = user?.company?.enabledModules?.includes('attendance')
        && Boolean(user?.company?.settings?.timesheet?.requireAttachment);
    const visibleEmployeeIds = paginatedUsers.map((employee) => employee._id);
    const allVisibleSelected = visibleEmployeeIds.length > 0 && visibleEmployeeIds.every((id) => selectedEmployeeIds.includes(id));
    const hasSelection = selectedEmployeeIds.length > 0;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleEmployeeSelection = (employeeId) => {
        setSelectedEmployeeIds((current) => (
            current.includes(employeeId)
                ? current.filter((id) => id !== employeeId)
                : [...current, employeeId]
        ));
    };

    const toggleSelectAllVisible = () => {
        setSelectedEmployeeIds((current) => {
            if (allVisibleSelected) {
                return current.filter((id) => !visibleEmployeeIds.includes(id));
            }

            return Array.from(new Set([...current, ...visibleEmployeeIds]));
        });
    };

    const calculateSalaryBreakdown = (updatedSalaryFields) => {
        setFormData(prev => {
            const mergedSalary = { ...prev.salary, ...updatedSalaryFields };
            const payType = mergedSalary.payType || 'salaried';
            
            let annualCTC = parseFloat(String(mergedSalary.annualCTC).replace(/[^0-9.]/g, '')) || 0;
            let monthlyCTC = parseFloat(String(mergedSalary.monthlyCTC).replace(/[^0-9.]/g, '')) || 0;
            
            if (updatedSalaryFields.annualCTC !== undefined) {
                monthlyCTC = Math.round(annualCTC / 12);
            } else if (updatedSalaryFields.monthlyCTC !== undefined) {
                annualCTC = monthlyCTC * 12;
            }

            let basicVal = '';
            let hraVal = '';
            let specialVal = '';
            let grossVal = '';

            if (payType === 'hourly') {
                const hourlyRate = parseFloat(String(mergedSalary.hourlyRate).replace(/[^0-9.]/g, '')) || 0;
                const hoursWorked = parseFloat(String(mergedSalary.hoursWorked || 160).replace(/[^0-9.]/g, '')) || 160;
                monthlyCTC = Math.round(hourlyRate * hoursWorked);
                annualCTC = monthlyCTC * 12;
                basicVal = String(monthlyCTC);
                hraVal = '0';
                specialVal = '0';
                grossVal = String(monthlyCTC);
            } else if (payType === 'flat') {
                const flatSalary = parseFloat(String(mergedSalary.flatSalary || monthlyCTC).replace(/[^0-9.]/g, '')) || 0;
                monthlyCTC = flatSalary;
                annualCTC = flatSalary * 12;
                basicVal = String(flatSalary);
                hraVal = '0';
                specialVal = '0';
                grossVal = String(flatSalary);
            } else {
                if (payrollConfig) {
                    const source = {
                        monthlyCTC,
                        payType,
                        pfEnabled: mergedSalary.pfEnabled !== false,
                        esiEnabled: mergedSalary.esiEnabled !== false,
                        ptEnabled: mergedSalary.ptEnabled !== false,
                        lwfEnabled: mergedSalary.lwfEnabled !== false,
                        gratuityEnabled: mergedSalary.gratuityEnabled !== false,
                        includePfInCTC: !!mergedSalary.includePfInCTC,
                        includeGratuityInCTC: mergedSalary.includeGratuityInCTC !== false,
                        basicPercent: mergedSalary.basicPercent !== undefined && mergedSalary.basicPercent !== null ? Number(mergedSalary.basicPercent) : null,
                        hraPercent: mergedSalary.hraPercent !== undefined && mergedSalary.hraPercent !== null ? Number(mergedSalary.hraPercent) : null,
                        insuranceAmount: parseFloat(mergedSalary.insuranceAmount) || 0,
                        employerNPS: parseFloat(mergedSalary.employerNPS) || 0,
                        ptState: mergedSalary.ptState || '',
                        deductions: {
                            professionalTax: mergedSalary.ptState === 'custom' ? (parseFloat(mergedSalary.professionalTax) || 0) : 0,
                        }
                    };
                    if (payrollConfig.salaryComponents) {
                        payrollConfig.salaryComponents.forEach(c => {
                            if (c.linkedTo === 'fixed') {
                                const val = mergedSalary[c.id] !== undefined ? mergedSalary[c.id] : (c.linkValue || 0);
                                source[c.id] = parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
                            }
                        });
                    }
                    const master = buildMasterSalaryStructure(source, payrollConfig);
                    if (master) {
                        basicVal = String(master.basicMaster);
                        hraVal = String(master.hraMaster);
                        specialVal = String(master.specialAllowance);
                        grossVal = String(master.grossSalary || master.totalEarnings);
                        
                        mergedSalary.pfEmployer = String(master.pfEmployer || 0);
                        mergedSalary.pfEmployee = String(master.pfEmployee || 0);
                        mergedSalary.gratuity = String(master.gratuity || 0);
                        mergedSalary.lwfEmployer = String(master.lwfEmployer || 0);
                        mergedSalary.lwfEmployee = String(master.lwfEmployee || 0);
                        mergedSalary.esiEmployer = String(master.esiEmployer || 0);
                        mergedSalary.esiEmployee = String(master.esiEmployee || 0);
                        mergedSalary.professionalTax = String(master.professionalTax || 0);
                        mergedSalary.tds = String(master.tds || 0);
                        mergedSalary.netTakeHome = String(master.netTakeHome || 0);
                        
                        if (master.earningsMap) {
                            Object.entries(master.earningsMap).forEach(([id, val]) => {
                                mergedSalary[id] = String(val);
                            });
                        }
                    }
                } else {
                    const basic = Math.round(monthlyCTC * 0.5);
                    const hra = Math.round(basic * 0.5);
                    const special = monthlyCTC - basic - hra;
                    basicVal = String(basic);
                    hraVal = String(hra);
                    specialVal = String(special);
                    grossVal = String(monthlyCTC);
                }
            }

            return {
                ...prev,
                salary: {
                    ...mergedSalary,
                    annualCTC: String(annualCTC),
                    monthlyCTC: String(monthlyCTC),
                    basic: basicVal,
                    hra: hraVal,
                    specialAllowance: specialVal,
                    monthlyGross: grossVal
                }
            };
        });
    };

    const _handleEdit = async (user) => {
        setEditingUser(user);
        setShowPassword(false);
        // Find users who currently report to this user
        const currentReports = users.filter(u => u.reportingManagers?.some(rm => rm._id === user._id || rm === user._id)).map(u => u._id);

        let salaryData = {
            annualCTC: '',
            monthlyCTC: '',
            payType: 'salaried',
            pfEnabled: true,
            esiEnabled: true,
            ptEnabled: true,
            lwfEnabled: true,
            gratuityEnabled: true,
            includePfInCTC: false,
            includeGratuityInCTC: true,
            basicPercent: null,
            hraPercent: null,
            useSalaryComponents: true,
            ptState: 'MH',
            professionalTax: '0',
            insuranceAmount: 0,
            employerNPS: 0,
        };

        try {
            const dossierRes = await api.get(`/dossier/${user._id}`);
            const comp = dossierRes.data?.compensation || {};
            const breakup = comp.salaryBreakup || {};
            
            // Map breakup fields
            salaryData = {
                annualCTC: comp.ctc ? String(comp.ctc * 12) : '',
                monthlyCTC: comp.ctc ? String(comp.ctc) : '',
                payType: breakup.payType || 'salaried',
                pfEnabled: breakup.pfEnabled !== false,
                esiEnabled: breakup.esiEnabled !== false,
                ptEnabled: breakup.ptEnabled !== false,
                lwfEnabled: breakup.lwfEnabled !== false,
                gratuityEnabled: breakup.gratuityEnabled !== false,
                includePfInCTC: !!breakup.includePfInCTC,
                includeGratuityInCTC: breakup.includeGratuityInCTC !== false,
                basicPercent: breakup.basicPercent !== undefined && breakup.basicPercent !== null ? breakup.basicPercent : null,
                hraPercent: breakup.hraPercent !== undefined && breakup.hraPercent !== null ? breakup.hraPercent : null,
                useSalaryComponents: breakup.useSalaryComponents !== false,
                ptState: breakup.ptState || 'MH',
                professionalTax: breakup.professionalTax !== undefined ? String(breakup.professionalTax) : '0',
                insuranceAmount: comp.insuranceAmount || 0,
                employerNPS: comp.employerNPS || 0,
                basic: breakup.basic || '',
                hra: breakup.hra || '',
                specialAllowance: breakup.specialAllowance || '',
                monthlyGross: breakup.monthlyGross || '',
                pfEmployer: breakup.pfEmployer || '0',
                pfEmployee: breakup.pfEmployee || '0',
                gratuity: breakup.gratuity || '0',
                lwfEmployer: breakup.lwfEmployer || '0',
                lwfEmployee: breakup.lwfEmployee || '0',
                esiEmployer: breakup.esiEmployer || '0',
                esiEmployee: breakup.esiEmployee || '0',
                professionalTaxVal: breakup.professionalTax || '0',
                tds: breakup.tds || '0',
                netTakeHome: breakup.netTakeHome || '0',
            };
            if (payrollConfig?.salaryComponents) {
                payrollConfig.salaryComponents.forEach(c => {
                    if (breakup[c.id] !== undefined) {
                        salaryData[c.id] = String(breakup[c.id]);
                    } else if (c.linkedTo === 'fixed') {
                        salaryData[c.id] = String(c.linkValue || 0);
                    }
                });
            }
        } catch (err) {
            console.error('Failed to fetch user dossier compensation:', err);
        }

        // Recalculate salary breakdown on open to ensure computed components are updated
        let annualCTC = parseFloat(String(salaryData.annualCTC).replace(/[^0-9.]/g, '')) || 0;
        let monthlyCTC = parseFloat(String(salaryData.monthlyCTC).replace(/[^0-9.]/g, '')) || 0;

        if (salaryData.annualCTC) {
            monthlyCTC = Math.round(annualCTC / 12);
        } else if (salaryData.monthlyCTC) {
            annualCTC = monthlyCTC * 12;
        }

        if (payrollConfig && (annualCTC > 0 || monthlyCTC > 0)) {
            const source = {
                monthlyCTC,
                payType: salaryData.payType,
                pfEnabled: salaryData.pfEnabled !== false,
                esiEnabled: salaryData.esiEnabled !== false,
                ptEnabled: salaryData.ptEnabled !== false,
                lwfEnabled: salaryData.lwfEnabled !== false,
                gratuityEnabled: salaryData.gratuityEnabled !== false,
                includePfInCTC: !!salaryData.includePfInCTC,
                includeGratuityInCTC: salaryData.includeGratuityInCTC !== false,
                basicPercent: salaryData.basicPercent !== undefined && salaryData.basicPercent !== null ? Number(salaryData.basicPercent) : null,
                hraPercent: salaryData.hraPercent !== undefined && salaryData.hraPercent !== null ? Number(salaryData.hraPercent) : null,
                useSalaryComponents: salaryData.useSalaryComponents !== false,
                insuranceAmount: parseFloat(salaryData.insuranceAmount) || 0,
                employerNPS: parseFloat(salaryData.employerNPS) || 0,
                flexiAmount: parseFloat(salaryData.flexiAmount) || 0,
                ptState: salaryData.ptState || '',
                deductions: {
                    professionalTax: salaryData.ptState === 'custom' ? (parseFloat(salaryData.professionalTax) || 0) : 0,
                }
            };
            if (payrollConfig.salaryComponents) {
                payrollConfig.salaryComponents.forEach(c => {
                    if (c.linkedTo === 'fixed') {
                        const val = salaryData[c.id] !== undefined ? salaryData[c.id] : (c.linkValue || 0);
                        source[c.id] = parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
                    }
                });
            }
            const master = buildMasterSalaryStructure(source, payrollConfig);
            if (master) {
                salaryData.annualCTC = String(annualCTC);
                salaryData.monthlyCTC = String(monthlyCTC);
                salaryData.basic = String(master.basicMaster);
                salaryData.hra = String(master.hraMaster);
                salaryData.specialAllowance = String(master.specialAllowance || 0);
                salaryData.monthlyGross = String(master.grossSalary || master.totalEarnings);
                
                salaryData.pfEmployer = String(master.pfEmployer || 0);
                salaryData.pfEmployee = String(master.pfEmployee || 0);
                salaryData.gratuity = String(master.gratuity || 0);
                salaryData.lwfEmployer = String(master.lwfEmployer || 0);
                salaryData.lwfEmployee = String(master.lwfEmployee || 0);
                salaryData.esiEmployer = String(master.esiEmployer || 0);
                salaryData.esiEmployee = String(master.esiEmployee || 0);
                salaryData.professionalTax = String(master.professionalTax || 0);
                salaryData.tds = String(master.tds || 0);
                salaryData.netTakeHome = String(master.netTakeHome || 0);
                
                if (master.earningsMap) {
                    Object.entries(master.earningsMap).forEach(([id, val]) => {
                        salaryData[id] = String(val);
                    });
                }
            }
        }

        setFormData({
            firstName: user.firstName,
            lastName: user.lastName || '',
            email: user.email,
            password: '',
            roleId: user.roles[0]?._id || '',
            department: user.department || '',
            employeeCode: user.employeeCode || '',
            joiningDate: user.joiningDate ? new Date(user.joiningDate).toISOString().split('T')[0] : '',
            employmentType: user.employmentType || 'Full Time',
            workLocation: user.workLocation || '',
            attendanceMode: user.attendanceMode || 'clock_in_out',
            attendanceShiftCode: user.attendanceShiftCode || 'general',
            directReports: currentReports,
            reportingManagers: user.reportingManagers?.map(rm => rm._id) || [],
            salary: salaryData
        });
        setShowSalarySection(false);
        setShowModal(true);
    };

    const handleAdd = () => {
        setEditingUser(null);
        setShowPassword(false);
        const salaryData = {
            annualCTC: '',
            monthlyCTC: '',
            payType: 'salaried',
            pfEnabled: true,
            esiEnabled: true,
            ptEnabled: true,
            lwfEnabled: true,
            gratuityEnabled: true,
            includePfInCTC: false,
            includeGratuityInCTC: true,
            basicPercent: null,
            hraPercent: null,
            useSalaryComponents: true,
            ptState: 'MH',
            professionalTax: '0',
            insuranceAmount: 0,
            employerNPS: 0,
        };
        if (payrollConfig?.salaryComponents) {
            payrollConfig.salaryComponents.forEach(c => {
                if (c.linkedTo === 'fixed') {
                    salaryData[c.id] = String(c.linkValue || 0);
                }
            });
        }
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            roleId: '',
            department: '',
            employeeCode: '',
            joiningDate: '',
            employmentType: 'Full Time',
            workLocation: '',
            attendanceMode: 'clock_in_out',
            attendanceShiftCode: 'general',
            directReports: [],
            reportingManagers: [],
            salary: salaryData
        });
        setShowSalarySection(false);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await api.put(`/admin/users/${editingUser._id}`, formData);
                toast.success('User Updated Successfully');
            } else {
                await api.post('/admin/users', formData);
                toast.success('User Created Successfully');
            }
            // Clear all related caches for instant reflection
            sessionStorage.removeItem(`user_data_${user?._id}`);
            sessionStorage.removeItem(`role_data_${user?._id}`);
            setShowPassword(false);
            setShowModal(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-100 font-sans p-4 sm:p-6 md:p-10">
            <div className="w-full mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <Skeleton className="h-9 w-64 rounded-md" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="p-0">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center justify-between px-6 py-4 border-b border-slate-50 last:border-0">
                                <div className="flex items-center space-x-3 w-1/4">
                                    <Skeleton className="h-9 w-9 rounded-full" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </div>
                                <Skeleton className="h-4 w-1/6" />
                                <Skeleton className="h-6 w-20 rounded" />
                                <Skeleton className="h-4 w-1/6" />
                                <Skeleton className="h-4 w-1/6" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-100 font-sans p-4 sm:p-6 md:p-10">
            <div className="w-full mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{canEdit ? 'User Management' : 'My Team'}</h1>
                        <p className="text-sm text-slate-500">{canEdit ? 'Manage employees and their access roles' : 'View your direct reports'}</p>
                    </div>
                    <div className="flex space-x-2 relative">
                        <button
                            onClick={() => setShowExportModal(!showExportModal)}
                            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow transition-all"
                        >
                            <Download size={18} />
                            <span>Export</span>
                        </button>

                        {/* Export Options Popover */}
                        {showExportModal && (
                            <div className="absolute top-12 right-0 w-80 bg-white rounded-lg shadow-2xl border border-slate-200 z-50 animate-fade-in-down">
                                <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-lg">
                                    <h3 className="font-bold text-slate-800 text-sm">Export Options</h3>
                                    <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                                </div>
                                <div className="p-4 space-y-3">
                                    <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Settings:</p>

                                    <div className="mb-3">
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Select Month</label>
                                        <input
                                            type="month"
                                            value={exportMonth}
                                            onChange={(e) => setExportMonth(e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm bg-white"
                                        />
                                    </div>

                                    <div className="h-px bg-slate-100 my-2"></div>

                                    <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Include Columns:</p>

                                    <label className="flex items-center space-x-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition">
                                        <input
                                            type="checkbox"
                                            checked={exportOptions.status}
                                            onChange={e => setExportOptions({ ...exportOptions, status: e.target.checked })}
                                            className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                                        />
                                        <span className="text-sm font-medium text-slate-700">Status (Present/Absent)</span>
                                    </label>

                                    <label className="flex items-center space-x-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition">
                                        <input
                                            type="checkbox"
                                            checked={exportOptions.checkInOut}
                                            onChange={e => setExportOptions({ ...exportOptions, checkInOut: e.target.checked })}
                                            className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                                        />
                                        <span className="text-sm font-medium text-slate-700">Check-In & Check-Out</span>
                                    </label>

                                    <label className="flex items-center space-x-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition">
                                        <input
                                            type="checkbox"
                                            checked={exportOptions.duration}
                                            onChange={e => setExportOptions({ ...exportOptions, duration: e.target.checked })}
                                            className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                                        />
                                        <span className="text-sm font-medium text-slate-700">Total Duration</span>
                                    </label>

                                    <label className="flex items-center space-x-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition">
                                        <input
                                            type="checkbox"
                                            checked={exportOptions.leaves}
                                            onChange={e => setExportOptions({ ...exportOptions, leaves: e.target.checked })}
                                            className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                                        />
                                        <span className="text-sm font-medium text-slate-700">Leaves (SL, CL)</span>
                                    </label>

                                    {hasAttendanceDocumentFeature && (
                                        <>
                                            <div className="h-px bg-slate-100 my-2"></div>
                                            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Include Documents:</p>
                                            <label className="flex items-center space-x-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition">
                                                <input
                                                    type="checkbox"
                                                    checked={exportOptions.documents}
                                                    onChange={e => setExportOptions({ ...exportOptions, documents: e.target.checked })}
                                                    className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                                                />
                                                <span className="text-sm font-medium text-slate-700">Uploaded Support Documents</span>
                                            </label>
                                        </>
                                    )}
                                    {canExportHRIS && (
                                        <>
                                            <div className="h-px bg-slate-100 my-2"></div>
                                            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Profiles & HRIS:</p>
                                            <label className="flex items-center space-x-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition">
                                                <input
                                                    type="checkbox"
                                                    checked={exportOptions.hrisProfiles}
                                                    onChange={e => setExportOptions({ ...exportOptions, hrisProfiles: e.target.checked })}
                                                    className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                                                />
                                                <span className="text-sm font-medium text-slate-700">Candidate / HRIS Profiles</span>
                                            </label>
                                        </>
                                    )}
                                </div>
                                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end space-x-2 rounded-b-lg">
                                    <button onClick={() => setShowExportModal(false)} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800">Close</button>
                                    <button
                                        onClick={handleExportDownload}
                                        className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700 shadow-sm flex items-center gap-1.5"
                                        title={hasSelection
                                            ? `Download exports for ${selectedEmployeeIds.length} selected user(s)`
                                            : 'Select one or more users before downloading'}
                                    >
                                        <Download size={14} /> Download
                                    </button>
                                </div>
                            </div>
                        )}

                        {canEdit && (
                            <button
                                onClick={handleAdd}
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-all"
                            >
                                <UserPlus size={18} />
                                <span>Add User</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Removed Global Modal */}

                {/* Users List */}
                <div className="zoho-card overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:space-x-4">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search employees..."
                                    className="pl-9 pr-4 py-2.5 w-72 bg-white border border-slate-200 rounded-lg text-sm outline-none transition-all shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowSortMenu((current) => !current);
                                            setShowFilterMenu(false);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                                    >
                                        <ArrowUpDown size={15} />
                                        Sort
                                    </button>
                                    {showSortMenu && (
                                        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                                            {[
                                                { value: 'joining_recent', label: 'Joining date: recent first' },
                                                { value: 'alphabetical_az', label: 'A-Z alphabetical' },
                                                { value: 'employee_code', label: 'Employee code' },
                                                { value: 'newest', label: 'Newest (latest first)' },
                                                { value: 'oldest', label: 'Oldest (older first)' }
                                            ].map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setSortOption(option.value);
                                                        setShowSortMenu(false);
                                                    }}
                                                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                                                        sortOption === option.value
                                                            ? 'bg-blue-50 font-semibold text-blue-700'
                                                            : 'text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowFilterMenu((current) => !current);
                                            setShowSortMenu(false);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                                    >
                                        <ListFilter size={15} />
                                        Filter
                                        {hasActiveFilters ? (
                                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">On</span>
                                        ) : null}
                                    </button>
                                    {showFilterMenu && (
                                        <div className="absolute left-0 top-full z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                                            <div className="grid gap-3">
                                                <div>
                                                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Status</label>
                                                    <select
                                                        value={filterStatus}
                                                        onChange={(e) => setFilterStatus(e.target.value)}
                                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                                    >
                                                        <option value="all">All statuses</option>
                                                        <option value="active">Active</option>
                                                        <option value="inactive">Inactive</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Department</label>
                                                    <select
                                                        value={filterDepartment}
                                                        onChange={(e) => setFilterDepartment(e.target.value)}
                                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                                    >
                                                        <option value="all">All departments</option>
                                                        {departmentOptions.map((department) => (
                                                            <option key={department} value={department}>{department}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Employment Type</label>
                                                    <select
                                                        value={filterEmploymentType}
                                                        onChange={(e) => setFilterEmploymentType(e.target.value)}
                                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                                    >
                                                        <option value="all">All types</option>
                                                        {employmentTypeOptions.map((employmentType) => (
                                                            <option key={employmentType} value={employmentType}>{employmentType}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Joining Date</label>
                                                    <input
                                                        type="date"
                                                        value={filterJoiningDate}
                                                        onChange={(e) => setFilterJoiningDate(e.target.value)}
                                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-4 flex items-center justify-between">
                                                <button
                                                    type="button"
                                                    onClick={clearFilters}
                                                    className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-700"
                                                >
                                                    <X size={14} />
                                                    Clear
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowFilterMenu(false)}
                                                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                                                >
                                                    Done
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                <tr className="text-[11px] uppercase tracking-wider">
                                    <th className="px-3 py-2 w-10">
                                        <input
                                            type="checkbox"
                                            checked={allVisibleSelected}
                                            onChange={toggleSelectAllVisible}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                            aria-label="Select all visible employees"
                                        />
                                    </th>
                                    <th className="px-3 py-2">Employee</th>
                                    <th className="px-3 py-2">Email</th>
                                    <th className="px-3 py-2">Joining Date</th>
                                    <th className="px-3 py-2">Role</th>
                                    <th className="px-3 py-2">Department</th>
                                    <th className="px-3 py-2">Type</th>
                                    <th className="px-3 py-2">Reporting To</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-10 text-center text-sm text-slate-500">
                                            No employees match the current search or filters.
                                        </td>
                                    </tr>
                                ) : paginatedUsers.map((employee) => (
                                    <tr key={employee._id} className="hover:bg-slate-50/50 text-[13px] border-b border-slate-50 last:border-0 transition-colors">
                                        <td className="px-3 py-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedEmployeeIds.includes(employee._id)}
                                                onChange={() => toggleEmployeeSelection(employee._id)}
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                aria-label={`Select ${employee.firstName} ${employee.lastName || ''}`}
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center space-x-2">
                                                <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                                                    {employee.firstName.charAt(0)}{employee.lastName?.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-slate-800 truncate">{employee.firstName} {employee.lastName}</div>
                                                    <div className="text-[10px] text-slate-500">{employee.employeeCode || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-slate-600 truncate max-w-[150px]" title={employee.email}>{employee.email}</td>
                                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                                            {employee.joiningDate ? format(new Date(employee.joiningDate), 'dd MMM yyyy') : '-'}
                                        </td>
                                        <td className="px-3 py-2">
                                            {employee.roles.map(r => (
                                                <span key={r._id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 mr-1 whitespace-nowrap">
                                                    <Shield size={10} className="mr-1" /> {r.name}
                                                </span>
                                            ))}
                                        </td>
                                        <td className="px-3 py-2 text-slate-600 truncate max-w-25">{employee.department || '-'}</td>
                                        <td className="px-3 py-2">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                                                {employee.employmentType || 'Full Time'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-slate-600">
                                            {employee.reportingManagers && employee.reportingManagers.length > 0 ? (
                                                <div className="flex flex-col">
                                                    {employee.reportingManagers.map(mgr => (
                                                        <span key={mgr._id} className="font-medium text-[11px] text-slate-700 truncate max-w-[120px]" title={mgr.email}>{mgr.firstName} {mgr.lastName.charAt(0)}.</span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-slate-400 italic">None</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${employee.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {employee.isActive ? 'Active' : (employee.isDeleted ? 'In Bin' : 'Inactive')}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <button
                                                onClick={() => navigate(`/users/${employee._id}`)}
                                                className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors border border-blue-200 shadow-sm whitespace-nowrap"
                                                title="View Profile"
                                            >
                                                View Profile
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                            <span>
                                Showing <strong>{paginatedUsers.length}</strong> of <strong>{filteredUsers.length}</strong>
                            </span>
                            <label className="flex items-center gap-2">
                                <span>Show</span>
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                        setRowsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500"
                                >
                                    {PAGE_SIZE_OPTIONS.map((size) => (
                                        <option key={size} value={size}>
                                            {size} entries
                                        </option>
                                    ))}
                                </select>
                            </label>
                            {hasSelection && (
                                <span className="text-xs font-medium text-blue-600">
                                    Selected: {selectedEmployeeIds.length}
                                </span>
                            )}
                        </div>
                        {filteredUsers.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <ChevronLeft size={16} />
                                    Previous
                                </button>
                                <div className="flex items-center gap-1">
                                    {paginationNumbers.map((pageNumber) => (
                                        <button
                                            key={pageNumber}
                                            type="button"
                                            onClick={() => setCurrentPage(pageNumber)}
                                            className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition ${
                                                currentPage === pageNumber
                                                    ? 'bg-slate-900 text-white'
                                                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            {pageNumber}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Next
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl overflow-hidden animate-blob max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">{editingUser ? 'Edit Employee' : 'Add New Employee'}</h3>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setShowPassword(false);
                                }}
                                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                            >
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">First Name</label>
                                    <input name="firstName" required value={formData.firstName} onChange={handleChange} className="zoho-input" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Last Name</label>
                                    <input name="lastName" value={formData.lastName} onChange={handleChange} className="zoho-input" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                    <input name="email" type="email" required value={formData.email} onChange={handleChange} className="zoho-input" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password {editingUser && '(Leave blank to keep)'}</label>
                                    <div className="relative">
                                        <input
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            required={!editingUser}
                                            onChange={handleChange}
                                            className="zoho-input pr-11"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((current) => !current)}
                                            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-600"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
                                    <input name="department" value={formData.department} onChange={handleChange} className="zoho-input" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Employee Code</label>
                                    <input name="employeeCode" value={formData.employeeCode} onChange={handleChange} className="zoho-input" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date of Joining</label>
                                    <input name="joiningDate" type="date" value={formData.joiningDate} onChange={handleChange} className="zoho-input" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Employment Type</label>
                                    <select name="employmentType" value={formData.employmentType} onChange={handleChange} className="zoho-input">
                                        <option value="Full Time">Full Time</option>
                                        <option value="Part Time">Part Time</option>
                                        <option value="Contract">Contract</option>
                                        <option value="Intern">Intern</option>
                                        <option value="Consultant">Consultant</option>
                                        <option value="Freelance">Freelance</option>
                                        <option value="Probation">Probation</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Work Location</label>
                                    <input name="workLocation" value={formData.workLocation} onChange={handleChange} placeholder="e.g. Headquarters" className="zoho-input" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Attendance Mode</label>
                                    <select name="attendanceMode" value={formData.attendanceMode} onChange={handleChange} className="zoho-input">
                                        <option value="clock_in_out">Clock In / Clock Out</option>
                                        <option value="present_only">Mark Present Only</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Attendance Shift</label>
                                    <select name="attendanceShiftCode" value={formData.attendanceShiftCode} onChange={handleChange} className="zoho-input">
                                        {attendanceShiftOptions.map((shift) => (
                                            <option key={shift.code} value={shift.code}>
                                                {shift.name} ({shift.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign Role</label>
                                <select name="roleId" required value={formData.roleId} onChange={handleChange} className="zoho-input">
                                    <option value="">Select Role</option>
                                    {roles.map(r => (
                                        <option key={r._id} value={r._id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Reporting Managers Multi-Select Removed per User Request */}

                            {/* Direct Reports Multi-Select */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign Subordinates (Inverse: Who reports to this user)</label>
                                <div className="h-32 overflow-y-auto border border-slate-200 rounded p-2 bg-slate-50 grid grid-cols-2 gap-2">
                                    {users.filter(u => !editingUser || u._id !== editingUser._id).map(user => (
                                        <label key={user._id} className="flex items-center space-x-2 text-sm bg-white p-2 rounded border border-slate-100 shadow-sm cursor-pointer hover:border-blue-300">
                                            <input
                                                type="checkbox"
                                                value={user._id}
                                                checked={formData.directReports?.includes(user._id)}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    const id = user._id;
                                                    setFormData(prev => {
                                                        const current = prev.directReports || [];
                                                        if (checked) return { ...prev, directReports: [...current, id] };
                                                        return { ...prev, directReports: current.filter(x => x !== id) };
                                                    });
                                                }}
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-700">{user.firstName} {user.lastName}</span>
                                                <span className="text-[10px] text-slate-400">{user.email}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Selected users will have this person set as their Reporting Manager.</p>
                            </div>

                            {/* Salary Details Section */}
                            <div className="col-span-2 mt-4 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowSalarySection(!showSalarySection)}
                                    className="w-full flex items-center justify-between py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition focus:outline-none"
                                >
                                    <div className="flex items-center gap-2">
                                        <Settings2 size={16} className="text-slate-400" />
                                        <span>Salary & Compensation Details</span>
                                    </div>
                                    {showSalarySection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>

                                {showSalarySection && formData.salary && (
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                                        {/* Left Side: Inputs */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pay Type</label>
                                                <select
                                                    value={formData.salary.payType || 'salaried'}
                                                    onChange={(e) => calculateSalaryBreakdown({ payType: e.target.value })}
                                                    className="zoho-input"
                                                >
                                                    <option value="salaried">Salaried (Monthly Base)</option>
                                                    <option value="hourly">Hourly Contractor</option>
                                                    <option value="flat">Flat Salary — No Component Breakdown</option>
                                                </select>
                                            </div>

                                            {formData.salary.payType === 'hourly' ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hourly Rate (INR)</label>
                                                        <input
                                                            value={formData.salary.hourlyRate || ''}
                                                            onChange={(e) => calculateSalaryBreakdown({ hourlyRate: e.target.value })}
                                                            placeholder="e.g. 500"
                                                            className="zoho-input"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estimated Hours</label>
                                                        <input
                                                            value={formData.salary.hoursWorked || '160'}
                                                            onChange={(e) => calculateSalaryBreakdown({ hoursWorked: e.target.value })}
                                                            placeholder="e.g. 160"
                                                            className="zoho-input"
                                                        />
                                                    </div>
                                                </div>
                                            ) : formData.salary.payType === 'flat' ? (
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Flat Monthly Salary</label>
                                                    <input
                                                        value={formData.salary.flatSalary || formData.salary.monthlyCTC || ''}
                                                        onChange={(e) => calculateSalaryBreakdown({ flatSalary: e.target.value, monthlyCTC: e.target.value })}
                                                        placeholder="e.g. 50,000"
                                                        className="zoho-input"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Annual CTC</label>
                                                        <input
                                                            value={formData.salary.annualCTC}
                                                            onChange={(e) => calculateSalaryBreakdown({ annualCTC: e.target.value })}
                                                            placeholder="e.g. 6,00,000"
                                                            className="zoho-input"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monthly CTC</label>
                                                        <input
                                                            value={formData.salary.monthlyCTC}
                                                            onChange={(e) => calculateSalaryBreakdown({ monthlyCTC: e.target.value })}
                                                            placeholder="e.g. 50,000"
                                                            className="zoho-input"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {formData.salary.payType === 'salaried' && (
                                                <>
                                                    {/* Statutory Toggles */}
                                                    <div className="border border-slate-100 rounded-xl p-3 bg-white space-y-3 shadow-sm">
                                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Statutory Toggles</div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <label className="flex items-center justify-between p-2 rounded-lg border border-slate-50 bg-slate-50/20 cursor-pointer">
                                                                <span className="text-xs font-medium text-slate-600">Provident Fund (PF)</span>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.salary.pfEnabled !== false}
                                                                    onChange={(e) => calculateSalaryBreakdown({ pfEnabled: e.target.checked })}
                                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                                />
                                                            </label>

                                                            <label className="flex items-center justify-between p-2 rounded-lg border border-slate-50 bg-slate-50/20 cursor-pointer">
                                                                <span className="text-xs font-medium text-slate-600">Gratuity Accrual</span>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.salary.gratuityEnabled !== false}
                                                                    onChange={(e) => calculateSalaryBreakdown({ gratuityEnabled: e.target.checked })}
                                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                                />
                                                            </label>

                                                            <label className="flex items-center justify-between p-2 rounded-lg border border-slate-50 bg-slate-50/20 cursor-pointer">
                                                                <span className="text-xs font-medium text-slate-600">ESI Applicable</span>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.salary.esiEnabled !== false}
                                                                    onChange={(e) => calculateSalaryBreakdown({ esiEnabled: e.target.checked })}
                                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                                />
                                                            </label>

                                                            <label className="flex items-center justify-between p-2 rounded-lg border border-slate-50 bg-slate-50/20 cursor-pointer">
                                                                <span className="text-xs font-medium text-slate-600">LWF Applicable</span>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.salary.lwfEnabled !== false}
                                                                    onChange={(e) => calculateSalaryBreakdown({ lwfEnabled: e.target.checked })}
                                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                                />
                                                            </label>
                                                        </div>

                                                        {formData.salary.pfEnabled !== false && (
                                                            <label className="flex items-center justify-between p-2 border-t border-slate-50 cursor-pointer">
                                                                <span className="text-xs text-slate-500">Include Employer PF in CTC</span>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!formData.salary.includePfInCTC}
                                                                    onChange={(e) => calculateSalaryBreakdown({ includePfInCTC: e.target.checked })}
                                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                                />
                                                            </label>
                                                        )}

                                                        {formData.salary.gratuityEnabled !== false && (
                                                            <label className="flex items-center justify-between p-2 border-t border-slate-50 cursor-pointer">
                                                                <span className="text-xs text-slate-500">Include Gratuity in CTC</span>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.salary.includeGratuityInCTC !== false}
                                                                    onChange={(e) => calculateSalaryBreakdown({ includeGratuityInCTC: e.target.checked })}
                                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                                />
                                                            </label>
                                                        )}
                                                    </div>

                                                    {/* State Tax (PT) */}
                                                    <div className="border border-slate-100 rounded-xl p-3 bg-white space-y-3 shadow-sm">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Professional Tax (PT)</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.salary.ptEnabled !== false}
                                                                onChange={(e) => calculateSalaryBreakdown({ ptEnabled: e.target.checked })}
                                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                            />
                                                        </div>
                                                        {formData.salary.ptEnabled !== false && (
                                                            <div className="space-y-2">
                                                                <select
                                                                    value={formData.salary.ptState || 'MH'}
                                                                    onChange={(e) => calculateSalaryBreakdown({ ptState: e.target.value })}
                                                                    className="zoho-input"
                                                                >
                                                                    <optgroup label="── No PT / Manual">
                                                                        <option value="">None — use manual override below</option>
                                                                        <option value="custom">Custom Override</option>
                                                                    </optgroup>
                                                                    <optgroup label="── States that levy PT">
                                                                        {PT_STATE_LIST.filter(s => s.leviesPT).map(s => (
                                                                            <option key={s.code} value={s.code}>{s.name}</option>
                                                                        ))}
                                                                    </optgroup>
                                                                    <optgroup label="── States with no PT">
                                                                        {PT_STATE_LIST.filter(s => s.code && !s.leviesPT).map(s => (
                                                                            <option key={s.code} value={s.code}>{s.name}</option>
                                                                        ))}
                                                                    </optgroup>
                                                                </select>
                                                                {formData.salary.ptState === 'custom' && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs text-slate-500">Amount (₹):</span>
                                                                        <input
                                                                            type="number"
                                                                            value={formData.salary.professionalTax || 0}
                                                                            onChange={(e) => calculateSalaryBreakdown({ professionalTax: e.target.value })}
                                                                            className="w-24 text-xs rounded-lg border border-slate-200 px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Dynamic Salary Components Breakup */}
                                                    {payrollConfig?.salaryComponents && payrollConfig.salaryComponents.length > 0 && (
                                                        <div className="border border-slate-100 rounded-xl p-3 bg-white space-y-3 shadow-sm">
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Salary Components Breakup</div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                {payrollConfig.salaryComponents
                                                                    .filter(c => c.type === 'earning')
                                                                    .map(c => {
                                                                        const isFixed = c.linkedTo === 'fixed';
                                                                        const isRemainder = c.linkedTo === 'remainder';

                                                                        if (isFixed) {
                                                                            const val = formData.salary[c.id] !== undefined ? formData.salary[c.id] : (c.linkValue || '0');
                                                                            return (
                                                                                <div key={c.id}>
                                                                                    <label className="block text-[10px] text-slate-500 font-medium mb-1">{c.name}</label>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={val}
                                                                                        onChange={(e) => calculateSalaryBreakdown({ [c.id]: e.target.value })}
                                                                                        className="zoho-input"
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        }

                                                                        const badge = isRemainder ? 'Remainder'
                                                                            : c.linkedTo === 'ctc_percent' ? `${Math.round((c.linkValue || 0) * 100)}% of CTC`
                                                                            : c.linkedTo === 'basic_percent' ? `${Math.round((c.linkValue || 0) * 100)}% of Basic`
                                                                            : '';
                                                                        const val = formData.salary[c.id] || '0';

                                                                        return (
                                                                            <div key={c.id}>
                                                                                <label className="block text-[10px] text-slate-500 font-medium mb-1">{c.name}</label>
                                                                                <div className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50/50 h-[32px] box-border">
                                                                                    <span className="text-xs font-semibold text-slate-700">₹{parseFloat(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                                                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 rounded-full px-1.5 py-0.5">{badge}</span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })
                                                                }
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Ratio Overrides */}
                                                    <div className="border border-slate-100 rounded-xl p-3 bg-white space-y-3 shadow-sm">
                                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ratio Overrides</div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-[10px] text-slate-500 font-medium mb-1">Basic Override (%)</label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="100"
                                                                    value={formData.salary.basicPercent !== undefined ? formData.salary.basicPercent : '50'}
                                                                    onChange={(e) => calculateSalaryBreakdown({ basicPercent: e.target.value })}
                                                                    className="zoho-input"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] text-slate-500 font-medium mb-1">HRA Override (% of Basic)</label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="100"
                                                                    value={formData.salary.hraPercent !== undefined ? formData.salary.hraPercent : '50'}
                                                                    onChange={(e) => calculateSalaryBreakdown({ hraPercent: e.target.value })}
                                                                    className="zoho-input"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Other Fields */}
                                                    <div className="border border-slate-100 rounded-xl p-3 bg-white space-y-3 shadow-sm">
                                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Additional Components</div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-[10px] text-slate-500 font-medium mb-1">Medical Ins. (Monthly)</label>
                                                                <input
                                                                    type="number"
                                                                    value={formData.salary.insuranceAmount || 0}
                                                                    onChange={(e) => calculateSalaryBreakdown({ insuranceAmount: e.target.value })}
                                                                    className="zoho-input"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] text-slate-500 font-medium mb-1">Employer NPS (Monthly)</label>
                                                                <input
                                                                    type="number"
                                                                    value={formData.salary.employerNPS || 0}
                                                                    onChange={(e) => calculateSalaryBreakdown({ employerNPS: e.target.value })}
                                                                    className="zoho-input"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Right Side: Preview */}
                                        <div className="border border-slate-200/60 rounded-xl bg-white p-4 shadow-sm h-fit space-y-4">
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                                                Salary Structure Preview (Monthly)
                                            </div>

                                            {formData.salary.payType === 'salaried' ? (
                                                <div className="space-y-2 text-sm">
                                                    {payrollConfig?.salaryComponents && payrollConfig.salaryComponents.length > 0 ? (
                                                        payrollConfig.salaryComponents
                                                            .filter(c => c.type === 'earning')
                                                            .map(c => (
                                                                <div key={c.id} className="flex justify-between items-center py-1 border-b border-slate-50">
                                                                    <span className="text-slate-500">{c.name}</span>
                                                                    <span className="font-semibold text-slate-800">₹{parseFloat(formData.salary[c.id] || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                                </div>
                                                            ))
                                                    ) : (
                                                        <>
                                                            <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                                                <span className="text-slate-500">Basic Salary</span>
                                                                <span className="font-semibold text-slate-800">₹{parseFloat(formData.salary.basic || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                                                <span className="text-slate-500">HRA</span>
                                                                <span className="font-semibold text-slate-800">₹{parseFloat(formData.salary.hra || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                            </div>
                                                            {payrollConfig?.salaryComponents?.some(c => c.id === 'special') && (
                                                                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                                                    <span className="text-slate-500">Special Allowance</span>
                                                                    <span className="font-semibold text-slate-800">₹{parseFloat(formData.salary.specialAllowance || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                                        <span className="text-slate-500">PF Employer Cost</span>
                                                        <span className="font-semibold text-slate-800">₹{parseFloat(formData.salary.pfEmployer || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                                        <span className="text-slate-500">Gratuity Accrual</span>
                                                        <span className="font-semibold text-slate-800">₹{parseFloat(formData.salary.gratuity || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                                        <span className="text-slate-500">Professional Tax (PT)</span>
                                                        <span className="font-semibold text-slate-800 text-rose-600">₹{parseFloat(formData.salary.professionalTax || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                                        <span className="text-slate-500">Employee PF</span>
                                                        <span className="font-semibold text-slate-800 text-rose-600">₹{parseFloat(formData.salary.pfEmployee || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-2 bg-emerald-50/50 rounded-lg px-2 text-emerald-800 border border-emerald-100">
                                                        <span className="font-semibold text-xs uppercase">Gross Salary</span>
                                                        <span className="font-bold text-base">₹{parseFloat(formData.salary.monthlyGross || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-2 bg-blue-50/50 rounded-lg px-2 text-blue-800 border border-blue-100">
                                                        <span className="font-semibold text-xs uppercase">Est. Net Take-Home</span>
                                                        <span className="font-bold text-base">₹{parseFloat(formData.salary.netTakeHome || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center bg-blue-50/50 rounded-lg p-2.5 text-blue-800 border border-blue-100">
                                                        <span className="text-xs font-semibold uppercase">Total Monthly CTC</span>
                                                        <span className="font-bold text-lg">₹{parseFloat(formData.salary.monthlyCTC || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-emerald-50/50 rounded-lg p-2.5 text-emerald-800 border border-emerald-100">
                                                        <span className="text-xs font-semibold uppercase">Monthly Gross Salary</span>
                                                        <span className="font-bold text-lg">₹{parseFloat(formData.salary.monthlyGross || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 mt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setShowPassword(false);
                                    }}
                                    className="zoho-btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="zoho-btn-primary">{editingUser ? 'Update User' : 'Create User'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
