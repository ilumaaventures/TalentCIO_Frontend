import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import api from '@/lib/apiClient';
import toast from 'react-hot-toast';
import {
    formatTime,
    calculateDuration,
    extractTime,
    formatTimeSimple
} from './attendanceFormatters';

export const exportMonthlyTimesheet = async ({
    exportUser,
    calendarDate,
    history = [],
    approvedLeaves = [],
    holidays = [],
    weeklyOffs = ['Saturday', 'Sunday'],
    standardHours = 8,
    timesheetSummary = null
}) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Monthly Timesheet');

        const referenceDate = calendarDate || (history.length > 0 ? new Date(history[0].date) : new Date());
        const start = startOfMonth(referenceDate);
        const end = endOfMonth(referenceDate);
        const days = eachDayOfInterval({ start, end });
        const timesheetStatus = String(timesheetSummary?.status || 'DRAFT').toUpperCase();

        // --- STYLING ---
        const blueHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        const tableHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
        const weekendFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
        const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        // 1. TOP HEADER
        sheet.mergeCells('A1:E1');
        const topHeader = sheet.getCell('A1');
        topHeader.value = 'Monthly timesheet';
        topHeader.fill = blueHeaderFill;
        topHeader.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF366092' } };

        // 2. EMPLOYEE & SUPERVISOR INFO
        sheet.getRow(2).height = 20;
        sheet.getCell('A2').value = 'EMPLOYEE:';
        sheet.getCell('A2').font = { bold: true, size: 10 };
        sheet.mergeCells('B2:C2');
        const empCell = sheet.getCell('B2');
        empCell.value = `${exportUser?.firstName || ''} ${exportUser?.lastName || ''}`;
        empCell.font = { name: 'Calibri', size: 10 };
        empCell.border = { bottom: { style: 'dotted' } };

        sheet.getCell('D2').value = 'START OF MONTH';
        sheet.getCell('D2').font = { bold: true, size: 10 };
        const startMonthCell = sheet.getCell('E2');
        startMonthCell.value = format(start, 'd/MM/yyyy');
        startMonthCell.font = { name: 'Calibri', size: 10, bold: true };
        startMonthCell.alignment = { horizontal: 'right' };
        startMonthCell.border = { bottom: { style: 'dotted' } };

        sheet.getRow(3).height = 20;
        sheet.getCell('A3').value = 'SUPERVISOR:';
        sheet.getCell('A3').font = { bold: true, size: 10 };
        sheet.mergeCells('B3:C3');
        const mgrs = exportUser?.reportingManagers || [];
        const supCell = sheet.getCell('B3');
        supCell.value = mgrs.length > 0 ? mgrs.map(m => `${m.firstName} ${m.lastName}`).join(', ') : 'N/A';
        supCell.font = { name: 'Calibri', size: 10 };
        supCell.border = { bottom: { style: 'dotted' } };

        sheet.getCell('D3').value = 'REGULAR HRS';
        sheet.getCell('D3').font = { bold: true, size: 10 };
        const hrsCell = sheet.getCell('E3');
        hrsCell.value = parseFloat(standardHours).toFixed(2);
        hrsCell.font = { name: 'Calibri', size: 10, bold: true };
        hrsCell.alignment = { horizontal: 'right' };
        hrsCell.border = { bottom: { style: 'dotted' } };

        // 3. TABLE HEADER (Now starts at row 5 after a blank row 4)
        sheet.getRow(4).height = 15; // Blank Row

        sheet.getRow(5).height = 20;
        sheet.mergeCells('B5:C5'); // Merge B and C for Attendance header
        const hDate = sheet.getCell('A5');
        const hAtt = sheet.getCell('B5');
        hDate.value = 'DATE';
        hAtt.value = 'Attendance';
        [hDate, hAtt].forEach(c => {
            c.fill = tableHeaderFill;
            c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            c.alignment = { horizontal: 'center' };
            c.border = borderStyle;
        });

        // 4. DATA ROWS (Now starts at row 6)
        let currentRow = 6;
        days.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const record = history.find(h => format(new Date(h.date), 'yyyy-MM-dd') === dateStr);
            const dayName = format(day, 'EEEE');
            const isWeekendDay = weeklyOffs.includes(dayName);
            const holiday = holidays.find(h => format(new Date(h.date), 'yyyy-MM-dd') === dateStr);

            const row = sheet.getRow(currentRow);
            const cDate = row.getCell(1);
            sheet.mergeCells(`B${currentRow}:C${currentRow}`); // Merge B and C for Status
            const cStatus = row.getCell(2);

            cDate.value = format(day, 'EEE, d MMM');

            const leave = approvedLeaves.find(l => {
                const lStart = new Date(l.startDate);
                const lEnd = new Date(l.endDate);
                lStart.setHours(0, 0, 0, 0);
                lEnd.setHours(23, 59, 59, 999);
                return day >= lStart && day <= lEnd;
            });

            let status = '';
            const isOffDay = !!holiday || isWeekendDay;
            const showLeave = leave && (!isOffDay || leave.sandwichRule);

            if (showLeave) {
                status = 'Leave';
            } else if (holiday) {
                status = holiday.name;
            } else if (isWeekendDay) {
                status = 'Weekend';
            } else if (record) {
                status = 'P';
            } else if (day <= new Date()) {
                status = 'Absent';
            }

            cStatus.value = status;

            // Styling
            [cDate, cStatus].forEach(c => {
                c.border = borderStyle;
                c.font = { name: 'Calibri', size: 10 };
                c.alignment = { horizontal: 'center' };
                if (isWeekendDay) c.fill = weekendFill;
            });

            currentRow++;
        });

        // 5. FOOTER (Aligned with columns D and E)
        sheet.getRow(currentRow).height = 25;
        const footerLabel = sheet.getCell(`D${currentRow}`);
        footerLabel.value = 'Total Days';
        footerLabel.font = { bold: true };
        footerLabel.alignment = { horizontal: 'right', vertical: 'middle' };

        const footerValue = sheet.getCell(`E${currentRow}`);
        footerValue.value = days.length;
        footerValue.font = { bold: true };
        footerValue.alignment = { horizontal: 'right', vertical: 'middle' };
        footerValue.border = { bottom: { style: 'double', color: { argb: 'FF4F81BD' } } };

        currentRow += 1;
        sheet.getRow(currentRow).height = 22;
        const statusLabel = sheet.getCell(`D${currentRow}`);
        statusLabel.value = 'Timesheet Status';
        statusLabel.font = { bold: true };
        statusLabel.alignment = { horizontal: 'right', vertical: 'middle' };

        const statusValue = sheet.getCell(`E${currentRow}`);
        statusValue.value = timesheetStatus.charAt(0) + timesheetStatus.slice(1).toLowerCase();
        statusValue.font = {
            bold: true,
            color: {
                argb: timesheetStatus === 'APPROVED'
                    ? 'FF15803D'
                    : timesheetStatus === 'REJECTED'
                        ? 'FFB91C1C'
                        : timesheetStatus === 'SUBMITTED'
                            ? 'FFB45309'
                            : 'FF475569'
            }
        };
        statusValue.alignment = { horizontal: 'right', vertical: 'middle' };
        statusValue.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };

        // Column Widths
        sheet.getColumn(1).width = 25; // A
        sheet.getColumn(2).width = 15; // B (part of merged B/C for name, but C is narrower)
        sheet.getColumn(3).width = 15; // C
        sheet.getColumn(4).width = 20; // D (Labels like START OF MONTH)
        sheet.getColumn(5).width = 15; // E (Values)

        // Save
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Monthly_Timesheet_${format(start, 'MMMM_yyyy')}_${exportUser?.firstName || 'User'}.xlsx`);
    } catch (error) {
        console.error('Failed to export monthly timesheet', error);
        toast.error('Failed to export monthly timesheet');
    }
};

export const exportAttendanceReport = async ({
    exportUser,
    history = [],
    holidays = [],
    approvedLeaves = [],
    weeklyOffs = ['Saturday', 'Sunday'],
    computedFlexibleOffDays = []
}) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Attendance Report');

        // 1. Header Info (Rows 1-4)
        sheet.mergeCells('A1:C1');
        sheet.getCell('A1').value = `User Name: ${exportUser?.firstName || ''} ${exportUser?.lastName || ''}`;
        sheet.getCell('A1').font = { bold: true, size: 14 };

        sheet.mergeCells('A2:C2');
        sheet.getCell('A2').value = `Joining Date: ${exportUser?.joiningDate ? new Date(exportUser.joiningDate).toLocaleDateString() : 'N/A'}`;

        sheet.mergeCells('A3:C3');
        const managers = exportUser?.reportingManagers || [];
        const mgrNames = managers.length > 0 ? managers.map(m => `${m.firstName} ${m.lastName}`).join(', ') : 'N/A';
        sheet.getCell('A3').value = `Supervisor(s): ${mgrNames}`;

        sheet.addRow([]); // Row 4 Empty Buffer

        // 2. Table Header (Row 5)
        const headerRow = sheet.addRow(['Date', 'Day', 'Status', 'In Time', 'Out Time', 'Duration']);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } }; // Blue
        headerRow.alignment = { horizontal: 'center' };

        // 3. Data Generation
        const referenceDate = history.length > 0 ? new Date(history[0].date) : new Date();
        const start = startOfMonth(referenceDate);
        const end = endOfMonth(referenceDate);
        const days = eachDayOfInterval({ start, end });

        days.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const record = history.find(h => format(new Date(h.date), 'yyyy-MM-dd') === dateStr);
            const dayName = format(day, 'EEEE');
            const isWeeklyOff = weeklyOffs.includes(dayName);
            const isFuture = day > new Date();

            let status = 'Absent';
            let rowColor = 'FFF2DCDB'; // Red by default

            const joiningDate = exportUser?.joiningDate ? new Date(exportUser.joiningDate) : null;
            if (joiningDate) joiningDate.setHours(0, 0, 0, 0);

            const holiday = holidays.find(h => format(new Date(h.date), 'yyyy-MM-dd') === dateStr);

            const leave = approvedLeaves.find(l => {
                const lStart = new Date(l.startDate);
                const lEnd = new Date(l.endDate);
                lStart.setHours(0, 0, 0, 0);
                lEnd.setHours(23, 59, 59, 999);
                return day >= lStart && day <= lEnd;
            });

            const isFlexOff = (computedFlexibleOffDays || []).some(item => {
                const rawVal = typeof item === 'object' && item?.date ? item.date : item;
                const itemStr = rawVal ? format(new Date(rawVal), 'yyyy-MM-dd') : '';
                return itemStr === dateStr || String(item).toLowerCase() === dayName.toLowerCase();
            });

            if (joiningDate && day < joiningDate) {
                status = 'Not Applicable';
                rowColor = 'FFFFFFFF'; // White
            } else if (isFuture) {
                status = '-';
                rowColor = 'FFFFFFFF'; // White
            } else if (leave && (!(holiday || isWeeklyOff || isFlexOff) || leave.sandwichRule)) {
                status = `Leave (${leave.leaveType})`;
                rowColor = 'FFE1BEE7'; // Light Purple/Indigo
            } else if (holiday) {
                status = holiday.name;
                rowColor = holiday.isOptional ? 'FFFFE0B2' : 'FFD1F2EB'; // Light Orange for Optional, Light Teal for Regular
            } else if (isWeeklyOff) {
                status = 'Weekoff';
                rowColor = 'FFF2F2F2'; // Gray
            } else if (isFlexOff) {
                status = 'Flexible Off';
                rowColor = 'FFEDE9FE'; // Light Violet
            } else if (record) {
                status = 'Present';
                rowColor = 'FFEBF1DE'; // Green
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

        // 4. Columns Width
        sheet.columns = [
            { width: 15 }, // Date
            { width: 15 }, // Day
            { width: 15 }, // Status
            { width: 15 }, // In
            { width: 15 }, // Out
            { width: 15 }  // Duration
        ];

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `Attendance_${format(start, 'MMMM_yyyy')}_${exportUser?.firstName || 'User'}.xlsx`;
        saveAs(new Blob([buffer]), fileName);
    } catch (error) {
        console.error('Failed to export attendance report', error);
        toast.error('Failed to export attendance report');
    }
};

export const exportTeamReport = async ({
    currentYear = new Date().getFullYear(),
    currentMonth = new Date().getMonth() + 1
}) => {
    try {
        const res = await api.get(`/attendance/team-report?month=${currentMonth}&year=${currentYear}`);
        const { teamMembers, attendanceRecords, holidays, leaveRecords, weeklyOff } = res.data;

        if (!teamMembers || teamMembers.length === 0) {
            toast.error('No team members found');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Team Attendance');

        // 1. Generate Date Columns
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const dateColumns = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(currentYear, currentMonth - 1, d);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            dateColumns.push({ header: `${String(d).padStart(2, '0')}-${dayName}`, key: `day_${d}`, width: 12 });
        }

        // Set Columns
        worksheet.columns = [
            { header: 'Employee / Details', key: 'name', width: 35 },
            ...dateColumns
        ];

        // Style Header
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Slate

        // 2. Prepare Data Map
        const attendanceMap = {};
        (attendanceRecords || []).forEach(record => {
            const userId = record.user.toString();
            const dateStr = new Date(record.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            if (!attendanceMap[userId]) attendanceMap[userId] = {};
            attendanceMap[userId][dateStr] = record;
        });

        // 3. Prepare Other Maps
        const leaveMap = {};
        if (leaveRecords) {
            leaveRecords.forEach(l => {
                const userId = l.user.toString();
                if (!leaveMap[userId]) leaveMap[userId] = {};
                const start = new Date(l.startDate);
                const end = new Date(l.endDate);
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const dStr = format(d, 'yyyy-MM-dd');
                    leaveMap[userId][dStr] = { type: l.leaveType, sandwich: l.sandwichRule };
                }
            });
        }

        const holidayMap = {};
        if (holidays) {
            holidays.forEach(h => {
                holidayMap[format(new Date(h.date), 'yyyy-MM-dd')] = h.name;
            });
        }

        // Freeze first row and first column
        worksheet.views = [
            { state: 'frozen', xSplit: 1, ySplit: 1 }
        ];

        // 3. Add Data Rows (Grouped)
        teamMembers.forEach(user => {
            const userLogs = attendanceMap[user._id] || {};

            // --- PARENT ROW (Employee Name) ---
            const parentRow = worksheet.addRow({
                name: `${user.firstName} ${user.lastName || ''}${user.employeeCode ? ` (${user.employeeCode})` : ''}`
            });
            parentRow.font = { bold: true, size: 11, color: { argb: 'FF1E293B' } };
            parentRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // Light Slate

            // --- CHILD ROWS ---
            const statusRow = { name: '   ↳ Status' };
            const checkInRow = { name: '   ↳ Check In' };
            const checkOutRow = { name: '   ↳ Check Out' };
            const durationRow = { name: '   ↳ Duration' };

            for (let d = 1; d <= daysInMonth; d++) {
                const colDate = new Date(currentYear, currentMonth - 1, d);
                const dateStr = format(colDate, 'yyyy-MM-dd');
                const record = userLogs[dateStr];
                const leave = (leaveMap[user._id] || {})[dateStr];
                const holiday = holidayMap[dateStr];
                const colKey = `day_${d}`;

                const weeklyOffDays = weeklyOff || ['Saturday', 'Sunday'];
                const dayName = format(colDate, 'EEEE');
                const isWeeklyOff = weeklyOffDays.some(woff => woff.trim().toLowerCase() === dayName.toLowerCase());
                const isOffDay = !!holiday || isWeeklyOff;

                // Status Logic
                let status = 'A';
                if (colDate > new Date()) status = '-';
                else if (leave && (!isOffDay || leave.sandwich)) status = `L (${leave.type})`;
                else if (holiday) status = 'H';
                else if (isWeeklyOff) status = 'WO';
                else if (record) status = 'P';

                statusRow[colKey] = status;

                if (record) {
                    checkInRow[colKey] = record.clockInIST ? extractTime(record.clockInIST) : (record.clockIn ? formatTimeSimple(record.clockIn) : '-');
                    checkOutRow[colKey] = record.clockOutIST ? extractTime(record.clockOutIST) : (record.clockOut ? formatTimeSimple(record.clockOut) : '-');
                    durationRow[colKey] = calculateDuration(record.clockIn, record.clockOut, colDate);
                } else {
                    checkInRow[colKey] = '-';
                    checkOutRow[colKey] = '-';
                    durationRow[colKey] = '-';
                }
            }

            const r0 = worksheet.addRow(statusRow);
            const r1 = worksheet.addRow(checkInRow);
            const r2 = worksheet.addRow(checkOutRow);
            const r3 = worksheet.addRow(durationRow);

            // Grouping Logic
            r0.outlineLevel = 1;
            r1.outlineLevel = 1;
            r2.outlineLevel = 1;
            r3.outlineLevel = 1;

            // Status row styling
            for (let d = 1; d <= daysInMonth; d++) {
                const colKey = `day_${d}`;
                const cell = r0.getCell(colKey);
                const val = cell.value?.toString();
                if (val?.startsWith('L')) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };
                } else if (val === 'H') {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1F2EB' } };
                } else if (val === 'WO') {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                } else if (val === 'P') {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } };
                } else if (val === 'A') {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2DCDB' } };
                }
            }

            // Child Row Styling
            [r1, r2, r3].forEach(row => {
                row.getCell('name').font = { italic: true, color: { argb: 'FF64748B' } };
                row.alignment = { horizontal: 'center' };
                row.getCell('name').alignment = { horizontal: 'left' };
            });
        });

        // Enable Outline Property
        worksheet.properties.outlineProperties = {
            summaryBelow: false,
            summaryRight: false
        };

        // Save File
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Team_Attendance_Report_${currentYear}_${currentMonth}.xlsx`);
        toast.success('Team Report Exported Successfully');
    } catch (error) {
        console.error(error);
        toast.error('Failed to export team report');
    }
};

