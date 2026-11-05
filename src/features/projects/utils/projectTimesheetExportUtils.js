import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { sanitizeFileNamePart, sanitizeSheetName } from '@/features/users-roles/utils/userExportUtils';

/**
 * Builds an Excel workbook for an individual user where:
 * 1. Sheet 1: Project Summary & Time Share Overview
 * 2. Following Sheets: A SEPARATE SHEET FOR EVERY PROJECT detailing its date-wise timesheet logs.
 */
export const buildUserProjectWiseTimesheetWorkbook = async ({
  employee,
  periodLabel = 'All Time',
  startDate = null,
  endDate = null,
  workLogs = [],
  assignedProjects = []
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TalentCio HRMS';
  workbook.lastModifiedBy = 'TalentCio HRMS';
  workbook.created = new Date();

  const existingNames = new Set();
  const empFullName = `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || 'Team Member';
  const empCode = employee?.employeeCode || 'N/A';
  const empDept = employee?.departmentRef?.name || employee?.department || 'N/A';
  const empDesignation = employee?.designationRef?.title || employee?.designation || 'N/A';
  const empEmail = employee?.email || 'N/A';

  // 1. Group work logs by project
  const projectMap = new Map();

  // First register all assigned projects so they get a sheet even if 0 logs in range
  assignedProjects.forEach(p => {
    const pId = String(p?._id || p);
    const pName = p?.name || 'Untitled Project';
    const pCode = p?.code || '';
    const pClient = p?.client?.name || p?.clientName || (typeof p?.client === 'string' ? p.client : '-');
    projectMap.set(pId, {
      _id: pId,
      name: pName,
      code: pCode,
      clientName: pClient,
      status: p?.status || (p?.isActive !== false ? 'Active' : 'Completed'),
      role: p?.role || 'Team Member',
      logs: [],
      totalHours: 0
    });
  });

  // Populate work logs into their respective projects
  workLogs.forEach(log => {
    const projObj = log.project || log.task?.module?.project || log.module?.project || log.discussion?.project;
    const pId = projObj?._id ? String(projObj._id) : (projObj ? String(projObj) : 'unlinked');
    const pName = projObj?.name || log.projectName || 'Direct Project Work';
    const pCode = projObj?.code || '';
    const pClient = projObj?.client?.name || log.clientName || (typeof projObj?.client === 'string' ? projObj.client : '-');

    if (!projectMap.has(pId)) {
      projectMap.set(pId, {
        _id: pId,
        name: pName,
        code: pCode,
        clientName: pClient,
        status: projObj?.status || 'Active',
        role: 'Team Member',
        logs: [],
        totalHours: 0
      });
    }

    const pData = projectMap.get(pId);
    pData.logs.push(log);
    pData.totalHours += Number(log.hours) || 0;
  });

  const projectList = Array.from(projectMap.values());
  const grandTotalHours = projectList.reduce((sum, p) => sum + p.totalHours, 0);

  // 2. OVERVIEW / SUMMARY SHEET
  const summarySheetName = sanitizeSheetName('Project Summary', '', existingNames);
  const summarySheet = workbook.addWorksheet(summarySheetName);

  // Summary Header Banner
  summarySheet.mergeCells('A1:G1');
  const sTitle = summarySheet.getCell('A1');
  sTitle.value = `PROJECT TIMESHEET SUMMARY: ${empFullName.toUpperCase()}`;
  sTitle.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  sTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(1).height = 30;

  summarySheet.mergeCells('A2:G2');
  const sPeriod = summarySheet.getCell('A2');
  sPeriod.value = `Period: ${periodLabel}  |  Generated On: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`;
  sPeriod.font = { italic: true, size: 10, color: { argb: 'FFFFFFFF' } };
  sPeriod.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  sPeriod.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(2).height = 20;

  summarySheet.addRow([]); // Spacer row 3

  // Employee Meta Info Cards
  summarySheet.mergeCells('A4:C4');
  summarySheet.getCell('A4').value = `Employee: ${empFullName} (${empCode})`;
  summarySheet.getCell('A4').font = { bold: true, size: 10, color: { argb: 'FF1E293B' } };

  summarySheet.mergeCells('D4:G4');
  summarySheet.getCell('D4').value = `Department: ${empDept}  |  Designation: ${empDesignation}`;
  summarySheet.getCell('D4').font = { bold: true, size: 10, color: { argb: 'FF1E293B' } };
  summarySheet.getCell('D4').alignment = { horizontal: 'right' };

  summarySheet.mergeCells('A5:C5');
  summarySheet.getCell('A5').value = `Email: ${empEmail}`;
  summarySheet.getCell('A5').font = { size: 9, color: { argb: 'FF64748B' } };

  summarySheet.mergeCells('D5:G5');
  summarySheet.getCell('D5').value = `Total Allocated Projects: ${projectList.length}  |  Grand Total Hours Logged: ${grandTotalHours.toFixed(1)} hrs`;
  summarySheet.getCell('D5').font = { bold: true, size: 10, color: { argb: 'FF2563EB' } };
  summarySheet.getCell('D5').alignment = { horizontal: 'right' };

  summarySheet.addRow([]); // Spacer row 6

  // Table Header
  const summaryHeader = summarySheet.addRow([
    '#',
    'Project Name',
    'Client Name',
    'Status',
    'Role',
    'Logged Hours',
    'Time Share %'
  ]);
  summaryHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  summaryHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  summaryHeader.alignment = { vertical: 'middle', horizontal: 'center' };
  summaryHeader.height = 24;

  if (projectList.length === 0) {
    const emptyRow = summarySheet.addRow(['-', 'No projects allocated or logged', '-', '-', '-', '0.0 hrs', '0.0%']);
    emptyRow.font = { italic: true, color: { argb: 'FF94A3B8' } };
    emptyRow.alignment = { horizontal: 'center' };
  } else {
    projectList.forEach((proj, idx) => {
      const share = grandTotalHours > 0 ? ((proj.totalHours / grandTotalHours) * 100).toFixed(1) + '%' : '0.0%';
      const row = summarySheet.addRow([
        idx + 1,
        proj.name,
        proj.clientName || '-',
        proj.status || 'Active',
        proj.role || 'Team Member',
        Number(proj.totalHours.toFixed(1)),
        share
      ]);
      row.alignment = { vertical: 'middle' };
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(4).alignment = { horizontal: 'center' };
      row.getCell(5).alignment = { horizontal: 'center' };
      row.getCell(6).alignment = { horizontal: 'right' };
      row.getCell(7).alignment = { horizontal: 'center' };
    });
  }

  const grandTotalRow = summarySheet.addRow([
    '',
    'Total Across All Projects',
    '',
    '',
    '',
    Number(grandTotalHours.toFixed(1)),
    '100.0%'
  ]);
  grandTotalRow.font = { bold: true, size: 11 };
  grandTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  grandTotalRow.alignment = { vertical: 'middle' };
  grandTotalRow.getCell(6).alignment = { horizontal: 'right' };
  grandTotalRow.getCell(7).alignment = { horizontal: 'center' };

  summarySheet.columns = [
    { width: 6 },  // #
    { width: 30 }, // Project Name
    { width: 22 }, // Client Name
    { width: 14 }, // Status
    { width: 16 }, // Role
    { width: 16 }, // Logged Hours
    { width: 14 }  // Time Share %
  ];

  // 3. INDIVIDUAL PROJECT SHEETS (Every project on a separate sheet!)
  projectList.forEach(proj => {
    const sheetName = sanitizeSheetName(proj.name, proj.code, existingNames);
    const pSheet = workbook.addWorksheet(sheetName);

    // Project Sheet Header Banner
    pSheet.mergeCells('A1:H1');
    const h1 = pSheet.getCell('A1');
    h1.value = `TIMESHEET: ${proj.name.toUpperCase()}`;
    h1.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
    h1.alignment = { vertical: 'middle', horizontal: 'center' };
    pSheet.getRow(1).height = 28;

    pSheet.mergeCells('A2:E2');
    pSheet.getCell('A2').value = `Client: ${proj.clientName || 'Internal'}  |  Employee: ${empFullName} (${empCode})  |  Role: ${proj.role}`;
    pSheet.getCell('A2').font = { bold: true, size: 9.5, color: { argb: 'FF334155' } };

    pSheet.mergeCells('F2:H2');
    pSheet.getCell('F2').value = `Period: ${periodLabel}  |  Total Project Hours: ${proj.totalHours.toFixed(1)} hrs`;
    pSheet.getCell('F2').font = { bold: true, size: 9.5, color: { argb: 'FF1E40AF' } };
    pSheet.getCell('F2').alignment = { horizontal: 'right' };

    pSheet.addRow([]); // Spacer row 3

    // Columns Header
    const colHeader = pSheet.addRow([
      '#',
      'Date',
      'Day',
      'Task / Work Item',
      'Module / Topic',
      'Work Description / Accomplishments',
      'Hours',
      'Status'
    ]);
    colHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10.5 };
    colHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    colHeader.alignment = { vertical: 'middle', horizontal: 'center' };
    colHeader.height = 22;

    const sortedLogs = [...proj.logs].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedLogs.length === 0) {
      const emptyRow = pSheet.addRow([
        '-',
        '-',
        '-',
        'No work log entries recorded for this project in the selected period',
        '-',
        '-',
        0,
        '-'
      ]);
      emptyRow.font = { italic: true, color: { argb: 'FF94A3B8' } };
      emptyRow.alignment = { vertical: 'middle', horizontal: 'center' };
    } else {
      sortedLogs.forEach((log, lIdx) => {
        const logDate = log.date ? new Date(log.date) : null;
        const formattedDate = logDate ? format(logDate, 'dd-MM-yyyy') : '-';
        const dayName = logDate ? format(logDate, 'EEEE') : '-';
        const hrs = Number(log.hours) || 0;
        const taskTitle = log.taskTitle || log.task?.name || (log.discussion ? `Discussion: ${log.discussion?.title || log.discussion?.discussion || 'Discussion'}` : 'Direct Project Work');
        const moduleTitle = log.moduleName || log.module?.name || log.task?.module?.name || '-';

        const row = pSheet.addRow([
          lIdx + 1,
          formattedDate,
          dayName,
          taskTitle,
          moduleTitle,
          log.description || '-',
          hrs,
          log.status || 'APPROVED'
        ]);

        row.alignment = { vertical: 'middle' };
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(3).alignment = { horizontal: 'center' };
        row.getCell(7).alignment = { horizontal: 'right' };
        row.getCell(8).alignment = { horizontal: 'center' };

        if (log.status === 'REJECTED') {
          row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          row.getCell(8).font = { color: { argb: 'FFDC2626' }, bold: true };
        } else if (log.status === 'APPROVED') {
          row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
          row.getCell(8).font = { color: { argb: 'FF16A34A' }, bold: true };
        } else if (log.status === 'PENDING') {
          row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          row.getCell(8).font = { color: { argb: 'FFD97706' }, bold: true };
        }
      });
    }

    // Total Row at bottom
    const totalRow = pSheet.addRow([
      '',
      '',
      '',
      `Total Logged Hours for ${proj.name}`,
      '',
      '',
      Number(proj.totalHours.toFixed(1)),
      `${proj.logs.length} ${proj.logs.length === 1 ? 'entry' : 'entries'}`
    ]);
    totalRow.font = { bold: true, size: 10.5 };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    totalRow.alignment = { vertical: 'middle' };
    totalRow.getCell(4).alignment = { horizontal: 'right' };
    totalRow.getCell(7).alignment = { horizontal: 'right' };
    totalRow.getCell(8).alignment = { horizontal: 'center' };

    pSheet.columns = [
      { width: 6 },  // #
      { width: 14 }, // Date
      { width: 13 }, // Day
      { width: 28 }, // Task
      { width: 22 }, // Module
      { width: 44 }, // Description
      { width: 13 }, // Hours
      { width: 14 }  // Status
    ];
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const sanitizedEmp = sanitizeFileNamePart(empFullName);
  const sanitizedPeriod = sanitizeFileNamePart(periodLabel);
  const fileName = `Timesheet_${sanitizedEmp}_${sanitizedPeriod}_${format(new Date(), 'yyyyMMdd')}.xlsx`;

  return { buffer, fileName };
};

export default buildUserProjectWiseTimesheetWorkbook;

