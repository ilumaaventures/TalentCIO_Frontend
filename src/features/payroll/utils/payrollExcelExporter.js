import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

/**
 * Enterprise Excel (.xlsx) Exporter for Bulk Salary & Revision Details
 * Respects user-customized column ordering and visibility selections.
 */
export const exportBulkSalaryToExcel = async ({
  rows = [],
  payrollConfig = null,
  orderedVisibleColKeys = null,
  columnDefinitions = {},
  fileNamePrefix = 'Bulk_Salary_Details'
}) => {
  if (!rows || rows.length === 0) {
    toast.error('No employee salary data available to export');
    return;
  }

  const toastId = toast.loading('Generating formatted Excel spreadsheet...');

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Talentcio HRMS';
    workbook.lastModifiedBy = 'Talentcio HRMS';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Salary Details', {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 2 }],
      properties: { tabColor: { argb: 'FF2563EB' } }
    });

    // 1. Identify which columns to export
    const exportKeys = Array.isArray(orderedVisibleColKeys) && orderedVisibleColKeys.length > 0
      ? orderedVisibleColKeys
      : Object.keys(columnDefinitions);

    // Fixed identifying columns always present at start
    const baseCols = [
      { header: 'Employee Code', key: 'employeeCode', width: 16 },
      { header: 'Full Name', key: 'fullName', width: 24 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Designation', key: 'designation', width: 22 }
    ];

    const dynamicCols = exportKeys.map(k => {
      const def = columnDefinitions[k] || {};
      return {
        header: def.label || k,
        key: k,
        width: Math.max(16, Math.round((def.defaultWidth || 110) / 7)),
        category: def.category || 'General',
        isCurrency: (def.label || '').includes('(₹)'),
        isFlag: ['pf', 'esi', 'pt', 'gratuity', 'lwf', 'tds', 'ltaStatutory'].includes(k)
      };
    });

    const allColumns = [...baseCols, ...dynamicCols];
    sheet.columns = allColumns.map(c => ({ key: c.key, width: c.width }));

    // 2. Set Row 1 Category Group Banner
    sheet.insertRow(1, []);
    const row1 = sheet.getRow(1);
    row1.height = 26;

    // Group 1: Employee Identifiers
    sheet.mergeCells(1, 1, 1, baseCols.length);
    const cellId = sheet.getCell(1, 1);
    cellId.value = 'EMPLOYEE INFORMATION';
    cellId.alignment = { horizontal: 'center', vertical: 'middle' };
    cellId.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cellId.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    // Group 2: Dynamic / Customized Salary Heads
    if (dynamicCols.length > 0) {
      sheet.mergeCells(1, baseCols.length + 1, 1, allColumns.length);
      const cellData = sheet.getCell(1, baseCols.length + 1);
      cellData.value = 'SALARY COMPONENTS, STATUTORY CONTRIBUTIONS & TAKE-HOME';
      cellData.alignment = { horizontal: 'center', vertical: 'middle' };
      cellData.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cellData.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    }

    // Set Row 2 Column Sub-headers
    const row2 = sheet.getRow(2);
    row2.height = 24;
    allColumns.forEach((col, idx) => {
      const cell = row2.getCell(idx + 1);
      cell.value = col.header;
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });

    // 3. Populate Rows
    const CURRENCY_FMT = '[$₹-4009]#,##0;([$₹-4009]#,##0);"-"';

    rows.forEach(row => {
      const c = row.calculated || {};
      const annualCTC = Number(row.annualCTC || 0);
      const monthlyCTC = Number(row.monthlyCTC || Math.round(annualCTC / 12));

      const rowData = {
        employeeCode: row.employeeCode || '',
        fullName: `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Employee',
        department: row.department || '',
        designation: row.designation || '',

        // Data keys
        annualCTC,
        monthlyCTC,
        basic: c.basicMaster || 0,
        hra: c.hraMaster || 0,
        petrol: Number(row.petrol || 0),
        lta: c.lta || 0,
        conveyance: Number(row.conveyance || 0),
        medical: Number(row.medicalAllowance !== undefined ? row.medicalAllowance : (row.medical || 0)),
        meal: Number(row.mealAllowance !== undefined ? row.mealAllowance : (row.meal || 0)),
        broadband: Number(row.broadband || 0),
        customAllowances: Number(row.customAllowances || 0),
        flexiRemainder: c.specialAllowance || 0,
        monthlyGross: c.grossMaster || 0,
        insurance: Number(row.insuranceAmount || 0),
        pf: row.pfEnabled ? (row.includePfInCTC ? 'Active (In CTC)' : 'Active (Ex CTC)') : 'Exempt',
        esi: row.esiEnabled ? (c.esiEmployee > 0 ? `Active (₹${c.esiEmployee})` : 'Active') : 'Exempt',
        pt: row.ptEnabled ? `Active (₹${c.professionalTax || 0})` : 'Exempt',
        gratuity: row.gratuityEnabled ? (row.includeGratuityInCTC ? 'Active (In CTC)' : 'Active') : 'Disabled',
        lwf: row.lwfEnabled ? 'Active' : 'Disabled',
        tds: row.tdsEnabled ? 'Active' : 'Disabled',
        ltaStatutory: row.ltaEnabled ? 'Eligible' : 'Exempt',
        deductions: c.totalDeductions || 0,
        takeHome: c.netTakeHome || 0
      };

      const addedRow = sheet.addRow(rowData);
      addedRow.height = 20;

      addedRow.eachCell((cell, colNumber) => {
        const colDef = allColumns[colNumber - 1];
        if (!colDef) return;

        cell.font = { name: 'Calibri', size: 9 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFF1F5F9' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
          right: { style: 'thin', color: { argb: 'FFF1F5F9' } }
        };

        if (colDef.isCurrency) {
          cell.numFmt = CURRENCY_FMT;
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (colDef.isFlag) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          const valStr = String(cell.value || '');
          if (valStr.includes('Active') || valStr.includes('Eligible')) {
            cell.font = { color: { argb: 'FF047857' }, bold: true, size: 9 };
          } else {
            cell.font = { color: { argb: 'FF94A3B8' }, size: 9 };
          }
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    // 4. Totals / Summary Row
    const totalRowIndex = sheet.rowCount + 1;
    sheet.insertRow(totalRowIndex, []);
    const summaryRow = sheet.getRow(totalRowIndex);
    summaryRow.height = 22;
    summaryRow.getCell(1).value = 'TOTALS';
    summaryRow.getCell(2).value = `${rows.length} Employees`;

    allColumns.forEach((col, idx) => {
      const colLetter = sheet.getColumn(idx + 1).letter;
      const cell = summaryRow.getCell(idx + 1);

      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'double', color: { argb: 'FF475569' } }
      };

      if (col.isCurrency) {
        cell.numFmt = CURRENCY_FMT;
        cell.value = { formula: `SUM(${colLetter}3:${colLetter}${totalRowIndex - 1})` };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });

    // 5. Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${fileNamePrefix}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);

    toast.success('Spreadsheet exported to Excel (.xlsx) successfully', { id: toastId });
  } catch (error) {
    console.error('Failed to export salary excel:', error);
    toast.error('Failed to export Excel spreadsheet', { id: toastId });
  }
};

