import React, { useCallback, useState, useEffect, useMemo } from 'react';
import api from '@/lib/apiClient';
import { useAuth } from '@/features/auth/context/AuthContext';
import { UserPlus, Download } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { createCachePayload, readSessionCache } from '@/lib/cache';
import { exportCandidateHRIS } from '@/features/employee-dossier/utils/hrisExporter';
import { buildMasterSalaryStructure, createDefaultSalaryData, parseBool } from '@/features/payroll/utils/payroll';

import {
    DEFAULT_ATTENDANCE_SHIFTS,
    ALL_HRIS_SECTIONS,
    buildUserListFingerprint,
    buildRoleListFingerprint,
    toDateKey,
    sanitizeFileNamePart,
    sanitizeZipFileName,
    fetchFileBlob,
    isAttendanceApproved,
} from '../utils/userExportUtils';
import UsersTable from '../components/UsersTable';
import UserExportModal from '../components/UserExportModal';
import UserFormModal from '../components/UserFormModal';

const Users = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [payrollConfig, setPayrollConfig] = useState(null);
    const [showSalarySection, setShowSalarySection] = useState(false);
    const [_ctcPeriod, setCtcPeriod] = useState('monthly');

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
        hrisProfiles: false,
        userDocuments: false
    });
    const [hrisSections, setHrisSections] = useState(new Set(ALL_HRIS_SECTIONS));
    const [exportMonth, setExportMonth] = useState(format(new Date(), 'yyyy-MM'));

    // Filter & Sort & Pagination State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('joiningDate');
    const [sortDirection, setSortDirection] = useState('desc');
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
    const filterDate = '';

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

                        const blob = await fetchFileBlob(file.url);
                        const fileName = sanitizeZipFileName(file.name, file.url, blob?.type, `document_${index + 1}`);
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

    const handleDownloadEmployeeDocumentsZip = async (targetUsersOverride = null) => {
        const toastId = toast.loading('Preparing employee documents ZIP...');
        try {
            let selectedUsers = [];
            if (Array.isArray(targetUsersOverride) && targetUsersOverride.length > 0) {
                selectedUsers = targetUsersOverride;
            } else if (targetUsersOverride && typeof targetUsersOverride === 'object' && targetUsersOverride._id) {
                selectedUsers = [targetUsersOverride];
            } else {
                if (selectedEmployeeIds.length === 0) {
                    toast.error('Select at least one employee to download documents.', { id: toastId });
                    return;
                }
                selectedUsers = users.filter((listedUser) => selectedEmployeeIds.includes(listedUser._id));
            }

            if (selectedUsers.length === 0) {
                toast.error('Selected users are not available for document download.', { id: toastId });
                return;
            }

            const masterZip = new JSZip();
            let totalFilesAdded = 0;
            let usersWithDocsCount = 0;
            const failedUsers = [];
            const emptyUsers = [];

            for (let uIdx = 0; uIdx < selectedUsers.length; uIdx++) {
                const targetUser = selectedUsers[uIdx];
                try {
                    const dossierRes = await api.get(`/dossier/${targetUser._id}`);
                    const profile = dossierRes.data || {};

                    const rawDocs = Array.isArray(profile.documents)
                        ? profile.documents.filter(d => !d.isDeleted && d.url)
                        : [];

                    const filesToZip = [];

                    rawDocs.forEach(doc => {
                        filesToZip.push({
                            url: doc.url,
                            name: doc.fileName || doc.title || doc.label || 'document',
                            category: doc.category || doc.type || 'Documents'
                        });
                    });

                    if (profile.personal?.photo) {
                        filesToZip.push({
                            url: profile.personal.photo,
                            name: 'Profile_Photo',
                            category: 'Personal'
                        });
                    }

                    if (profile.offerLetterUrl) {
                        filesToZip.push({
                            url: profile.offerLetterUrl,
                            name: 'Offer_Letter',
                            category: 'Offer Letter'
                        });
                    }

                    try {
                        const monthKey = exportMonth;
                        const attachmentRes = await api.get(`/attendance/attachments/${targetUser._id}/${monthKey}`);
                        const attFiles = Array.isArray(attachmentRes.data?.files) ? attachmentRes.data.files : [];
                        attFiles.forEach(attFile => {
                            if (attFile?.url) {
                                filesToZip.push({
                                    url: attFile.url,
                                    name: attFile.name || 'attendance_support_doc',
                                    category: 'Attendance'
                                });
                            }
                        });
                    } catch (e) {
                        // Ignore if attendance attachments API fails or has no docs
                    }

                    if (filesToZip.length === 0) {
                        emptyUsers.push(`${targetUser.firstName} ${targetUser.lastName || ''}`.trim() || targetUser.email);
                        continue;
                    }

                    const userFolder = sanitizeFileNamePart(
                        [targetUser.firstName, targetUser.lastName, targetUser.employeeCode].filter(Boolean).join('_') || targetUser.email || 'Employee'
                    );

                    let userAddedCount = 0;
                    for (let index = 0; index < filesToZip.length; index++) {
                        const fileObj = filesToZip[index];
                        try {
                            const blob = await fetchFileBlob(fileObj.url);
                            const safeFileName = sanitizeZipFileName(fileObj.name, fileObj.url, blob?.type, `document_${index + 1}`);
                            const zipPath = `${userFolder}/${String(index + 1).padStart(2, '0')}_${safeFileName}`;

                            masterZip.file(zipPath, blob);
                            userAddedCount++;
                            totalFilesAdded++;
                        } catch (err) {
                            console.error(`Failed to fetch file ${fileObj.name} for ${targetUser.email}`, err);
                        }
                    }

                    if (userAddedCount > 0) {
                        usersWithDocsCount++;
                    } else {
                        emptyUsers.push(`${targetUser.firstName} ${targetUser.lastName || ''}`.trim() || targetUser.email);
                    }

                } catch (error) {
                    console.error(`Failed to fetch documents for user ${targetUser.email}`, error);
                    failedUsers.push(`${targetUser.firstName} ${targetUser.lastName || ''}`.trim() || targetUser.email);
                }
            }

            if (totalFilesAdded === 0) {
                toast.error('No uploaded documents were found for the selected user(s).', { id: toastId });
                return;
            }

            const zipBlob = await masterZip.generateAsync({ type: 'blob' });
            let zipFileName = 'Employee_Documents.zip';

            if (selectedUsers.length === 1) {
                const singleUser = selectedUsers[0];
                const singleUserFolder = sanitizeFileNamePart(
                    `${singleUser.firstName || ''}_${singleUser.lastName || ''}_${singleUser.employeeCode || singleUser._id}`
                );
                zipFileName = `${singleUserFolder}_Documents.zip`;
            } else {
                zipFileName = `Employees_Documents_${usersWithDocsCount}_users.zip`;
            }

            saveAs(zipBlob, zipFileName);

            if (failedUsers.length > 0 || emptyUsers.length > 0) {
                toast.success(`Downloaded 1 consolidated ZIP file for ${usersWithDocsCount} employee(s). (${emptyUsers.length + failedUsers.length} user(s) had no documents or failed)`, { id: toastId });
                return;
            }

            toast.success(`Downloaded consolidated ZIP file with documents for ${usersWithDocsCount} employee(s) successfully!`, { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error('Failed to download employee documents ZIP.', { id: toastId });
        }
    };

    const handleExportTeamAttendance = async () => {
        const toastId = toast.loading('Generating Team Report...');
        try {
            if (selectedEmployeeIds.length === 0) {
                toast.error('Select at least one employee to export.', { id: toastId });
                return;
            }

            const [year, month] = exportMonth.split('-');

            const res = await api.get(`/attendance/team-report?year=${year}&month=${month}`);
            const { teamMembers, attendanceRecords, leaveRecords, holidays, weeklyOff } = res.data;

            if (!teamMembers || teamMembers.length === 0) {
                toast.error('No team members found', { id: toastId });
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Team Attendance');

            const daysInMonth = new Date(year, month, 0).getDate();
            const dateColumns = [];
            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, month - 1, d);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                dateColumns.push({ header: `${String(d).padStart(2, '0')}-${dayName}`, key: `day_${d}`, width: 15 });
            }

            worksheet.columns = [
                { header: 'Employee / Details', key: 'name', width: 35 },
                ...dateColumns
            ];

            worksheet.views = [
                { state: 'frozen', xSplit: 1, ySplit: 1 }
            ];

            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

            const attendanceMap = {};
            attendanceRecords.forEach(record => {
                const userId = record.user.toString();
                const dateStr = toDateKey(record.date);
                if (!attendanceMap[userId]) attendanceMap[userId] = {};
                attendanceMap[userId][dateStr] = record;
            });

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

            const holidayMap = {};
            if (holidays && holidays.length > 0) {
                holidays.forEach(h => {
                    const dateStr = toDateKey(h.date);
                    holidayMap[dateStr] = h.name;
                });
            }

            const extractTime = (istString) => istString.split(',')[1]?.trim() || istString;
            const formatTimeSimple = (date) => new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

            const usersToExport = teamMembers.filter((teamMember) =>
                selectedEmployeeIds.includes(teamMember._id)
            );

            if (usersToExport.length === 0) {
                toast.error('None of the selected employees are available in this export view.', { id: toastId });
                return;
            }

            usersToExport.forEach(targetUser => {
                const userLogs = attendanceMap[targetUser._id] || {};
                const userLeaves = leaveMap[targetUser._id] || {};

                const parentRow = worksheet.addRow({
                    name: `${targetUser.firstName} ${targetUser.lastName || ''}${targetUser.employeeCode ? ` (${targetUser.employeeCode})` : ''}`
                });
                parentRow.font = { bold: true, size: 11, color: { argb: 'FF1E293B' } };
                parentRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

                const rowsToAdd = [];
                const statusRow = { name: '   ↳ Status' };
                const checkInRow = { name: '   ↳ Check In' };
                const checkOutRow = { name: '   ↳ Check Out' };
                const durationRow = { name: '   ↳ Duration' };
                const leavesRow = { name: '   ↳ Leaves' };
                const approvedRow = { name: '   ↳ Approved' };

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

                    let statusShort = 'Absent';

                    const isOffDay = !!holidayName || isWeeklyOff;
                    const showLeave = leaveData && (!isOffDay || leaveData.sandwich);

                    if (isAttendanceApproved(record)) {
                        statusShort = 'Present';
                    } else if (showLeave || holidayName || isWeeklyOff) {
                        statusShort = '';
                    }

                    if (exportOptions.status) {
                        statusRow[colKey] = statusShort;
                    }

                    if (exportOptions.leaves) {
                        leavesRow[colKey] = leaveData?.type || '-';
                    }

                    if (record) {
                        if (record.clockInIST) checkInRow[colKey] = extractTime(record.clockInIST);
                        else if (record.clockIn) checkInRow[colKey] = formatTimeSimple(record.clockIn);
                        else checkInRow[colKey] = '-';

                        if (record.clockOutIST) checkOutRow[colKey] = extractTime(record.clockOutIST);
                        else if (record.clockOut) checkOutRow[colKey] = formatTimeSimple(record.clockOut);
                        else checkOutRow[colKey] = '-';

                        const startTime = new Date(record.clockIn);
                        let endTime = record.clockOut ? new Date(record.clockOut) : new Date(dateObj);
                        if (!record.clockOut) endTime.setHours(23, 59, 59, 999);

                        let durStr = '--';
                        if (record.clockIn) {
                            const diffString = Math.abs(endTime - startTime);
                            const hours = Math.floor(diffString / (1000 * 60 * 60));
                            const minutes = Math.floor((diffString % (1000 * 60 * 60)) / (1000 * 60));
                            durStr = `${hours}h ${minutes}m`;
                            const durHrs = diffString / 3600000;
                            if (durHrs >= 5 && durHrs < 8) {
                                durStr += ' (Half Day)';
                            }
                        }
                        durationRow[colKey] = durStr;
                        approvedRow[colKey] = isAttendanceApproved(record) ? 'Approved' : '';
                    } else {
                        checkInRow[colKey] = '-';
                        checkOutRow[colKey] = '-';
                        durationRow[colKey] = '-';
                        approvedRow[colKey] = '';
                    }
                }

                if (exportOptions.status) rowsToAdd.push(statusRow);
                if (exportOptions.checkInOut) {
                    rowsToAdd.push(checkInRow);
                    rowsToAdd.push(checkOutRow);
                }
                if (exportOptions.duration) rowsToAdd.push(durationRow);
                if (exportOptions.leaves) rowsToAdd.push(leavesRow);
                rowsToAdd.push(approvedRow);

                rowsToAdd.forEach(rowData => {
                    const row = worksheet.addRow(rowData);
                    row.outlineLevel = 1;
                    row.getCell('name').font = { italic: true, color: { argb: 'FF64748B' } };
                    row.alignment = { horizontal: 'center' };
                    row.getCell('name').alignment = { horizontal: 'left' };

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

                            let cellColor = 'FFF2DCDB';

                            const isOffDay = !!holidayName || isWeeklyOff;
                            const showLeave = leaveData && (!isOffDay || leaveData.sandwich);

                            if (isAttendanceApproved(record)) cellColor = 'FFEBF1DE';
                            else if (showLeave || holidayName || isWeeklyOff) cellColor = 'FFFFFFFF';

                            const colKey = `day_${d}`;
                            const cell = row.getCell(colKey);
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cellColor } };
                        }
                    }
                });
            });

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

    const handleExportDownload = async () => {
        const hasAttendanceSelection = exportOptions.status
            || exportOptions.checkInOut
            || exportOptions.duration
            || exportOptions.leaves;
        const shouldDownloadDocuments = hasAttendanceDocumentFeature && exportOptions.documents;
        const shouldDownloadHRIS = canExportHRIS && exportOptions.hrisProfiles;
        const shouldDownloadUserDocuments = exportOptions.userDocuments;

        if (!hasAttendanceSelection && !shouldDownloadDocuments && !shouldDownloadHRIS && !shouldDownloadUserDocuments) {
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
            const sectionsToExport = hrisSections.size === ALL_HRIS_SECTIONS.length ? undefined : hrisSections;
            await exportCandidateHRIS(selectedEmployeeIds, sectionsToExport);
        }

        if (shouldDownloadUserDocuments) {
            await handleDownloadEmployeeDocumentsZip();
        }

        setShowExportModal(false);
    };

    const fetchData = useCallback(async () => {
        try {
            const isAdmin = user?.roles?.includes('Admin') || user?.roles?.some(r => r.name === 'Admin');
            const canReadUsers = user?.permissions?.includes('user.read');
            const canReadRoles = user?.permissions?.includes('role.read') || isAdmin;

            const cacheKey = `user_data_${user?._id}`;
            const cachedPayload = readSessionCache(cacheKey);

            if (cachedPayload) {
                const data = cachedPayload.data || cachedPayload;
                setUsers((data.users || []).filter((listedUser) => listedUser.isDeleted !== true));
                setRoles(data.roles || []);
                setLoading(false);
            }

            let usersData = [];
            let rolesData = [];

            if (isAdmin || canReadUsers) {
                try {
                    const res = await api.get('/admin/users');
                    usersData = res.data;
                } catch (err) {
                    console.error('Admin users fetch failed', err);
                }
            } else {
                try {
                    const teamRes = await api.get('/admin/users/team');
                    usersData = teamRes.data;
                } catch {
                    console.log('Team fetch failed or empty');
                }
            }

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
        sorted.sort((left, right) => {
            let comparison = 0;
            switch (sortField) {
                case 'employee': {
                    const nameA = `${left.firstName || ''} ${left.lastName || ''}`.trim();
                    const nameB = `${right.firstName || ''} ${right.lastName || ''}`.trim();
                    comparison = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
                    if (comparison === 0) {
                        comparison = String(left.employeeCode || '').localeCompare(String(right.employeeCode || ''), undefined, { numeric: true, sensitivity: 'base' });
                    }
                    break;
                }
                case 'email': {
                    const emailA = (left.email || '').toLowerCase();
                    const emailB = (right.email || '').toLowerCase();
                    comparison = emailA.localeCompare(emailB);
                    break;
                }
                case 'joiningDate': {
                    const dateA = left.joiningDate ? new Date(left.joiningDate).getTime() : 0;
                    const dateB = right.joiningDate ? new Date(right.joiningDate).getTime() : 0;
                    comparison = dateA - dateB;
                    break;
                }
                case 'role': {
                    const roleA = (left.roles?.[0]?.name || '').toLowerCase();
                    const roleB = (right.roles?.[0]?.name || '').toLowerCase();
                    comparison = roleA.localeCompare(roleB);
                    break;
                }
                case 'department': {
                    const deptA = (left.department || '').toLowerCase();
                    const deptB = (right.department || '').toLowerCase();
                    comparison = deptA.localeCompare(deptB);
                    break;
                }
                case 'employmentType': {
                    const typeA = (left.employmentType || 'Full Time').toLowerCase();
                    const typeB = (right.employmentType || 'Full Time').toLowerCase();
                    comparison = typeA.localeCompare(typeB);
                    break;
                }
                case 'reportingTo': {
                    const mgrA = (left.reportingManagers?.[0]?.firstName || '').toLowerCase();
                    const mgrB = (right.reportingManagers?.[0]?.firstName || '').toLowerCase();
                    comparison = mgrA.localeCompare(mgrB);
                    break;
                }
                case 'status': {
                    const statusA = left.isActive ? 1 : 0;
                    const statusB = right.isActive ? 1 : 0;
                    comparison = statusA - statusB;
                    break;
                }
                case 'employeeCode': {
                    comparison = String(left.employeeCode || '').localeCompare(String(right.employeeCode || ''), undefined, { numeric: true, sensitivity: 'base' });
                    if (comparison === 0) {
                        const nameA = `${left.firstName || ''} ${left.lastName || ''}`.trim();
                        const nameB = `${right.firstName || ''} ${right.lastName || ''}`.trim();
                        comparison = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
                    }
                    break;
                }
                case 'createdAt': {
                    const createdA = left.createdAt ? new Date(left.createdAt).getTime() : 0;
                    const createdB = right.createdAt ? new Date(right.createdAt).getTime() : 0;
                    comparison = createdA - createdB;
                    break;
                }
                default: {
                    const dateA = left.joiningDate ? new Date(left.joiningDate).getTime() : 0;
                    const dateB = right.joiningDate ? new Date(right.joiningDate).getTime() : 0;
                    comparison = dateA - dateB;
                    break;
                }
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return sorted;
    }, [
        users,
        searchTerm,
        filterDate,
        filterJoiningDate,
        filterStatus,
        filterDepartment,
        filterEmploymentType,
        sortField,
        sortDirection
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

    const canEdit = roles.length > 0;
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
            const compType = mergedSalary.compensationType || mergedSalary.payType || 'monthly_salary';
            const payType = (compType === 'hourly') ? 'hourly' : (compType === 'flat_project' || compType === 'project_based') ? 'flat' : 'salaried';

            let annualCTC = parseFloat(String(mergedSalary.annualCTC).replace(/[^0-9.]/g, '')) || 0;
            let monthlyCTC = parseFloat(String(mergedSalary.monthlyCTC).replace(/[^0-9.]/g, '')) || 0;

            switch (compType) {
                case 'hourly': {
                    const hourlyRate = parseFloat(String(mergedSalary.hourlyRate).replace(/[^0-9.]/g, '')) || 0;
                    const hoursWorked = parseFloat(String(mergedSalary.hoursWorked || 160).replace(/[^0-9.]/g, '')) || 160;
                    monthlyCTC = Math.round(hourlyRate * hoursWorked);
                    annualCTC = monthlyCTC * 12;
                    break;
                }
                case 'daily_wage': {
                    const dailyRate = parseFloat(String(mergedSalary.dailyRate).replace(/[^0-9.]/g, '')) || 0;
                    monthlyCTC = Math.round(dailyRate * 26);
                    annualCTC = monthlyCTC * 12;
                    break;
                }
                case 'weekly_wage':
                case 'weekly_salary': {
                    const weeklyRate = parseFloat(String(mergedSalary.weeklyRate).replace(/[^0-9.]/g, '')) || 0;
                    monthlyCTC = Math.round(weeklyRate * 4);
                    annualCTC = monthlyCTC * 12;
                    break;
                }
                case 'flat_project':
                case 'project_based': {
                    const flatFee = parseFloat(String(mergedSalary.projectFee || monthlyCTC).replace(/[^0-9.]/g, '')) || 0;
                    monthlyCTC = flatFee;
                    annualCTC = flatFee * 12;
                    break;
                }
                case 'milestone':
                case 'milestone_based': {
                    const milestoneAmt = parseFloat(String(mergedSalary.milestoneAmount || monthlyCTC).replace(/[^0-9.]/g, '')) || 0;
                    monthlyCTC = milestoneAmt;
                    annualCTC = milestoneAmt * 12;
                    break;
                }
                case 'piece_rate': {
                    const rateCardItem = (mergedSalary.rateCard || []).find(r => r.paymentType === 'per_unit' || r.paymentType === 'UNIT') || (mergedSalary.rateCard || [])[0];
                    const itemRate = rateCardItem ? (parseFloat(String(rateCardItem.rate).replace(/[^0-9.]/g, '')) || 0) : 0;
                    if (updatedSalaryFields.monthlyCTC === undefined && itemRate > 0) {
                        monthlyCTC = itemRate;
                        annualCTC = monthlyCTC * 12;
                    } else if (updatedSalaryFields.annualCTC !== undefined) {
                        monthlyCTC = Math.round(annualCTC / 12);
                    } else if (updatedSalaryFields.monthlyCTC !== undefined) {
                        annualCTC = monthlyCTC * 12;
                    }
                    break;
                }
                case 'monthly_salary':
                case 'attendance_based':
                case 'salary_plus_commission':
                case 'commission_only':
                case 'stipend_intern':
                default: {
                    if (updatedSalaryFields.annualCTC !== undefined) {
                        monthlyCTC = Math.round(annualCTC / 12);
                    } else if (updatedSalaryFields.monthlyCTC !== undefined) {
                        annualCTC = monthlyCTC * 12;
                    }
                    break;
                }
            }

            let basicVal = '';
            let hraVal = '';
            let specialVal = '';
            let grossVal = '';

            const customAllowancesList = mergedSalary.customAllowances || [];
            const customDeductionsList = mergedSalary.customDeductions || [];
            const customAllowancesSum = customAllowancesList.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
            const customDeductionsSum = customDeductionsList.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);

            const source = {
                monthlyCTC,
                compensationType: compType,
                payType,
                attendanceMode: mergedSalary.attendanceMode || 'attendance',
                useSalaryComponents: parseBool(mergedSalary.useSalaryComponents, true),
                pfEnabled: parseBool(mergedSalary.pfEnabled, true),
                esiEnabled: parseBool(mergedSalary.esiEnabled, true),
                ptEnabled: parseBool(mergedSalary.ptEnabled, true),
                lwfEnabled: parseBool(mergedSalary.lwfEnabled, true),
                gratuityEnabled: parseBool(mergedSalary.gratuityEnabled, true),
                tdsEnabled: parseBool(mergedSalary.tdsEnabled, true),
                includePfInCTC: parseBool(mergedSalary.includePfInCTC, false),
                includeGratuityInCTC: parseBool(mergedSalary.includeGratuityInCTC, true),
                basicPercent: mergedSalary.basicPercent !== undefined && mergedSalary.basicPercent !== null ? Number(mergedSalary.basicPercent) : null,
                hraPercent: mergedSalary.hraPercent !== undefined && mergedSalary.hraPercent !== null ? Number(mergedSalary.hraPercent) : null,
                vpfPercent: mergedSalary.vpfPercent !== undefined && mergedSalary.vpfPercent !== null ? Number(mergedSalary.vpfPercent) : null,
                insuranceAmount: parseFloat(mergedSalary.insuranceAmount) || 0,
                employerNPS: parseFloat(mergedSalary.employerNPS) || 0,
                hourlyRate: parseFloat(mergedSalary.hourlyRate) || 0,
                hoursWorked: parseFloat(mergedSalary.hoursWorked) || 160,
                dailyRate: parseFloat(mergedSalary.dailyRate) || 0,
                weeklyRate: parseFloat(mergedSalary.weeklyRate) || 0,
                projectFee: parseFloat(mergedSalary.projectFee) || 0,
                milestoneAmount: parseFloat(mergedSalary.milestoneAmount) || 0,
                rateCard: mergedSalary.rateCard || [],
                ptState: mergedSalary.ptState || '',
                customAllowances: customAllowancesList,
                customDeductions: customDeductionsList,
                otherAllowances: customAllowancesList,
                otherDeductions: customDeductionsList,
                deductions: {
                    professionalTax: mergedSalary.ptState === 'custom' ? (parseFloat(mergedSalary.professionalTax) || 0) : 0,
                }
            };

            if (payrollConfig?.salaryComponents) {
                payrollConfig.salaryComponents.forEach(c => {
                    if (c.linkedTo === 'fixed') {
                        const val = mergedSalary[c.id] !== undefined ? mergedSalary[c.id] : (c.linkValue || 0);
                        source[c.id] = parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
                    }
                });
            }

            const master = buildMasterSalaryStructure(source, payrollConfig || {});
            if (master) {
                basicVal = String(master.basicMaster || 0);
                hraVal = String(master.hraMaster || 0);
                specialVal = String(master.specialAllowance || 0);
                grossVal = String(master.totalEarnings || (monthlyCTC + customAllowancesSum));

                mergedSalary.basicMaster = basicVal;
                mergedSalary.hraMaster = hraVal;
                mergedSalary.basic = basicVal;
                mergedSalary.hra = hraVal;
                mergedSalary.specialAllowance = specialVal;
                mergedSalary.flexi = specialVal;
                mergedSalary.pfEmployer = String(master.pfEmployer || 0);
                mergedSalary.pfEmployee = String(master.pfEmployee || 0);
                mergedSalary.gratuity = String(master.gratuity || 0);
                mergedSalary.lwfEmployer = String(master.lwfEmployer || 0);
                mergedSalary.lwfEmployee = String(master.lwfEmployee || 0);
                mergedSalary.esiEmployer = String(master.esiEmployer || 0);
                mergedSalary.esiEmployee = String(master.esiEmployee || 0);
                mergedSalary.professionalTax = String(master.professionalTax || 0);
                mergedSalary.tds = String(master.tds || 0);
                const estNet = Math.max(0, (master.netTakeHome || 0) - customDeductionsSum);
                mergedSalary.netTakeHome = String(estNet);

                if (master.earningsMap) {
                    Object.entries(master.earningsMap).forEach(([id, val]) => {
                        mergedSalary[id] = String(val);
                    });
                }
            } else {
                const basic = Math.round(monthlyCTC * 0.5);
                const hra = Math.round(basic * 0.5);
                const special = Math.max(0, monthlyCTC - basic - hra);
                basicVal = String(basic);
                hraVal = String(hra);
                specialVal = String(special);
                grossVal = String(monthlyCTC + customAllowancesSum);
            }

            return {
                ...prev,
                salary: {
                    ...mergedSalary,
                    payType,
                    compensationType: compType,
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

    const handleAdd = () => {
        setEditingUser(null);
        setShowPassword(false);
        setCtcPeriod('monthly');
        const salaryData = createDefaultSalaryData({}, {}, null, payrollConfig);
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
            sessionStorage.removeItem(`user_data_${user?._id}`);
            sessionStorage.removeItem(`role_data_${user?._id}`);
            setShowPassword(false);
            setShowModal(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleSort = (field) => {
        if (field === 'employee') {
            if (sortField === 'employee') {
                if (sortDirection === 'asc') {
                    setSortDirection('desc');
                } else {
                    setSortField('employeeCode');
                    setSortDirection('asc');
                }
            } else if (sortField === 'employeeCode') {
                if (sortDirection === 'asc') {
                    setSortDirection('desc');
                } else {
                    setSortField('employee');
                    setSortDirection('asc');
                }
            } else {
                setSortField('employee');
                setSortDirection('asc');
            }
            return;
        }

        if (sortField === field) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection(field === 'joiningDate' ? 'desc' : 'asc');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-100 font-sans p-4 sm:p-6 md:p-10">
            <div className="max-w-7xl w-full mx-auto space-y-6">
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
            <div className="max-w-7xl w-full mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{canEdit ? 'User Management' : 'My Team'}</h1>
                        <p className="text-sm text-slate-500">{canEdit ? 'Manage employees and their access roles' : 'View your direct reports'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow transition-all"
                        >
                            <Download size={16} />
                            <span>Export</span>
                        </button>
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

                {/* Export Modal */}
                <UserExportModal
                    showExportModal={showExportModal}
                    setShowExportModal={setShowExportModal}
                    exportMonth={exportMonth}
                    setExportMonth={setExportMonth}
                    exportOptions={exportOptions}
                    setExportOptions={setExportOptions}
                    hrisSections={hrisSections}
                    setHrisSections={setHrisSections}
                    hasSelection={hasSelection}
                    selectedEmployeeIds={selectedEmployeeIds}
                    hasAttendanceDocumentFeature={hasAttendanceDocumentFeature}
                    canExportHRIS={canExportHRIS}
                    handleExportDownload={handleExportDownload}
                />

                {/* Users List Table */}
                <UsersTable
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    sortOption={sortOption}
                    setSortField={setSortField}
                    setSortDirection={setSortDirection}
                    setSortOption={setSortOption}
                    showSortMenu={showSortMenu}
                    setShowSortMenu={setShowSortMenu}
                    showFilterMenu={showFilterMenu}
                    setShowFilterMenu={setShowFilterMenu}
                    filterStatus={filterStatus}
                    setFilterStatus={setFilterStatus}
                    filterDepartment={filterDepartment}
                    setFilterDepartment={setFilterDepartment}
                    filterEmploymentType={filterEmploymentType}
                    setFilterEmploymentType={setFilterEmploymentType}
                    filterJoiningDate={filterJoiningDate}
                    setFilterJoiningDate={setFilterJoiningDate}
                    departmentOptions={departmentOptions}
                    employmentTypeOptions={employmentTypeOptions}
                    hasActiveFilters={hasActiveFilters}
                    clearFilters={clearFilters}
                    allVisibleSelected={allVisibleSelected}
                    toggleSelectAllVisible={toggleSelectAllVisible}
                    handleSort={handleSort}
                    filteredUsers={filteredUsers}
                    paginatedUsers={paginatedUsers}
                    selectedEmployeeIds={selectedEmployeeIds}
                    toggleEmployeeSelection={toggleEmployeeSelection}
                    hasSelection={hasSelection}
                    rowsPerPage={rowsPerPage}
                    setRowsPerPage={setRowsPerPage}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    totalPages={totalPages}
                    paginationNumbers={paginationNumbers}
                    onNavigateUser={(id) => navigate(`/users/${id}`)}
                />

            </div>

            {/* User Form Modal */}
            <UserFormModal
                showModal={showModal}
                setShowModal={setShowModal}
                editingUser={editingUser}
                formData={formData}
                setFormData={setFormData}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                roles={roles}
                users={users}
                attendanceShiftOptions={attendanceShiftOptions}
                showSalarySection={showSalarySection}
                setShowSalarySection={setShowSalarySection}
                calculateSalaryBreakdown={calculateSalaryBreakdown}
            />
        </div>
    );
};

export default Users;
