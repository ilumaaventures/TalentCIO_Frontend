import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';

export const downloadImportTemplate = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Talentcio CRM';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('CRM Import Template', {
      views: [{ showGridLines: true }],
    });

    // ── Define Columns & Widths ──────────────────────────────────────────
    worksheet.columns = [
      { header: 'S No', key: 'sNo', width: 8 },
      { header: 'Company Name', key: 'companyName', width: 32 },
      { header: 'GSTIN', key: 'gstin', width: 22 },
      { header: 'Date of Registration', key: 'dateOfRegistration', width: 22 },
      { header: 'Industry', key: 'industry', width: 24 },
      { header: 'Address', key: 'address', width: 36 },
      { header: 'Rating', key: 'rating', width: 10 },
      { header: 'Contact Person', key: 'contactPerson', width: 24 },
      { header: 'Designation', key: 'designation', width: 24 },
      { header: 'Mobile No', key: 'mobileNo', width: 20 },
      { header: 'Email ID', key: 'emailId', width: 30 },
      { header: 'Remarks', key: 'remarks', width: 36 },
      { header: 'Date', key: 'date', width: 16 },
      { header: 'Status', key: 'status', width: 22 },
      { header: 'Source', key: 'source', width: 22 },
    ];

    // ── Header Styling (Yellow background for columns with headers) ───────
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.font = { bold: true, color: { argb: 'FF000000' }, size: 10 };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFEB3B' }, // Yellow header
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'medium', color: { argb: 'FF9CA3AF' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
    });

    // ── Sample Rows ──────────────────────────────────────────────────────
    const sampleRows = [
      {
        sNo: 1,
        companyName: 'Infosys Limited',
        gstin: '29AABCI1234A1Z5',
        dateOfRegistration: '1981-07-02',
        industry: 'Information Technology',
        address: 'Electronics City, Hosur Road, Bengaluru, Karnataka 560100',
        rating: 4.5,
        contactPerson: 'Rahul Sharma',
        designation: 'VP Human Resources',
        mobileNo: '9876543210',
        emailId: 'rahul.sharma@infosys.com',
        remarks: 'Multi-office expansion plan for Q3',
        date: today,
        status: 'Interested',
        source: 'Apollo.io Export',
      },
      {
        sNo: 1,
        companyName: 'Infosys Limited',
        gstin: '29AABCI1234A1Z5',
        dateOfRegistration: '1981-07-02',
        industry: 'Information Technology',
        address: 'Electronics City, Hosur Road, Bengaluru, Karnataka 560100',
        rating: 4.5,
        contactPerson: 'Priya Nair',
        designation: 'Head of Talent Acquisition',
        mobileNo: '9876543211',
        emailId: 'priya.nair@infosys.com',
        remarks: 'Secondary contact for tech hiring',
        date: today,
        status: 'Interested',
        source: 'Apollo.io Export',
      },
      {
        sNo: 2,
        companyName: 'Wipro Technologies',
        gstin: '29AABCW5678B1Z2',
        dateOfRegistration: '1945-12-29',
        industry: 'IT Services & Consulting',
        address: 'Doddakannelli, Sarjapur Road, Bengaluru, Karnataka 560035',
        rating: 4.2,
        contactPerson: 'Suresh Kumar',
        designation: 'Director of Procurement',
        mobileNo: '9812345678',
        emailId: 'suresh.kumar@wipro.com',
        remarks: 'Follow up on proposal next week',
        date: yesterday,
        status: 'Callback Requested',
        source: 'LinkedIn Sales Navigator',
      },
      {
        sNo: 3,
        companyName: 'Tata Consultancy Services',
        gstin: '27AABCT4321C1Z8',
        dateOfRegistration: '1968-04-01',
        industry: 'Consulting & Enterprise Solutions',
        address: 'TCS House, Raveline Street, Fort, Mumbai, Maharashtra 400001',
        rating: 4.8,
        contactPerson: 'Anita Desai',
        designation: 'Chief Technology Officer',
        mobileNo: '9923456789',
        emailId: 'anita.desai@tcs.com',
        remarks: 'Demo scheduled for enterprise tier',
        date: today,
        status: 'Meeting Scheduled',
        source: 'Direct Inbound',
      },
    ];

    sampleRows.forEach((row) => {
      const addedRow = worksheet.addRow(row);
      addedRow.height = 22;
      addedRow.alignment = { vertical: 'middle' };
      addedRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      addedRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });

    // ── Status dropdown data validation on column N (col 14) ────────────
    const statusOptions = [
      'New',
      'Interested',
      'Not Interested',
      'Callback Requested',
      'Did not turn up',
      'Not picking',
      'Meeting Scheduled',
      'Lost',
      'Other',
    ];
    const statusFormula = `"${statusOptions.join(',')}"`;

    for (let r = 2; r <= 500; r++) {
      worksheet.getCell(`N${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        showDropDown: false,
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Invalid Status',
        error: `Please select a valid CRM status: ${statusOptions.join(', ')}`,
        formulae: [statusFormula],
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, 'Company_Prospects_Import_Template.xlsx');
    toast.success('Sample import template downloaded successfully.');
  } catch (err) {
    console.error('Error generating template:', err);
    toast.error('Failed to download template. Please try again.');
  }
};

export const exportRecordsToExcel = async ({
  rowsToExport,
  dateFilter,
}) => {
  if (!rowsToExport || rowsToExport.length === 0) {
    const filterLabel =
      dateFilter === 'today'
        ? 'Today'
        : dateFilter === '2days'
        ? 'Last 2 Days'
        : dateFilter === '5days'
        ? 'Last 5 Days'
        : dateFilter === 'custom'
        ? 'Custom date range'
        : 'the selected filters';
    toast.error(`No records found for ${filterLabel}.`);
    return;
  }

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Talentcio CRM';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('CRM Database Export', {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: 'S No', key: 'sNo', width: 8 },
      { header: 'Company Name', key: 'companyName', width: 32 },
      { header: 'GSTIN', key: 'gstin', width: 22 },
      { header: 'Date of Registration', key: 'dateOfRegistration', width: 22 },
      { header: 'Industry', key: 'industry', width: 24 },
      { header: 'Address', key: 'address', width: 36 },
      { header: 'Rating', key: 'rating', width: 10 },
      { header: 'Contact Person', key: 'contactPerson', width: 24 },
      { header: 'Designation', key: 'designation', width: 24 },
      { header: 'Mobile No', key: 'mobileNo', width: 20 },
      { header: 'Email ID', key: 'emailId', width: 30 },
      { header: 'Remarks', key: 'remarks', width: 36 },
      { header: 'Date', key: 'date', width: 16 },
      { header: 'Status', key: 'status', width: 22 },
      { header: 'Source', key: 'source', width: 20 },
      { header: 'Imported By', key: 'importedBy', width: 22 },
    ];

    // ── Header Styling (Yellow background up to header columns) ─────────
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.font = { bold: true, color: { argb: 'FF000000' }, size: 10 };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFEB3B' }, // Yellow header
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'medium', color: { argb: 'FF9CA3AF' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
    });

    // ── Add Data Rows (multi-contact expansion) ─────────────────────────
    let exportedRowCount = 0;
    let companySNo = 0;
    rowsToExport.forEach((row) => {
      companySNo++;
      const rowContacts =
        Array.isArray(row.contacts) && row.contacts.length > 0
          ? row.contacts
          : row.contactPerson || row.mobileNo || row.emailId
          ? [
              {
                contactPerson: row.contactPerson || '',
                designation: row.designation || '',
                mobileNo: row.mobileNo || '',
                emailId: row.emailId || '',
              },
            ]
          : [
              {
                contactPerson: '',
                designation: '',
                mobileNo: '',
                emailId: '',
              },
            ];

      const startRowIndex = worksheet.rowCount + 1;

      rowContacts.forEach((contact, contactIdx) => {
        exportedRowCount++;
        const isFirstContact = contactIdx === 0;

        const rowData = {
          sNo: isFirstContact ? companySNo : '',
          companyName: isFirstContact ? row.companyName || '' : '',
          gstin: isFirstContact ? row.gstin || '' : '',
          dateOfRegistration: isFirstContact ? row.dateOfRegistration || '' : '',
          industry: isFirstContact ? row.industry || '' : '',
          address: isFirstContact ? row.address || '' : '',
          rating: isFirstContact ? row.rating || '' : '',
          contactPerson: contact.contactPerson || '',
          designation: contact.designation || '',
          mobileNo: contact.mobileNo || '',
          emailId: contact.emailId || '',
          remarks: isFirstContact ? row.remarks || '' : '',
          date: isFirstContact ? (row.date ? new Date(row.date).toISOString().split('T')[0] : '') : '',
          status: isFirstContact
            ? row.status ||
              row.leadStatus ||
              (row.isConvertedToLead ? 'Converted to Lead' : row.isDuplicate ? 'Duplicate' : 'New')
            : '',
          source: isFirstContact ? row.leadSource || row.source || '' : '',
          importedBy: isFirstContact ? row.importedBy || '' : '',
        };

        const addedRow = worksheet.addRow(rowData);
        addedRow.height = 22;
        addedRow.alignment = { vertical: 'middle' };
        addedRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        addedRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
        });
      });

      const endRowIndex = worksheet.rowCount;
      if (rowContacts.length > 1 && endRowIndex >= startRowIndex) {
        const companyColsToMerge = [
          { col: 1, align: { vertical: 'middle', horizontal: 'center' } }, // S No
          { col: 2, align: { vertical: 'middle', horizontal: 'left', wrapText: true } }, // Company Name
          { col: 3, align: { vertical: 'middle', horizontal: 'center' } }, // GSTIN
          { col: 4, align: { vertical: 'middle', horizontal: 'left' } }, // Industry
          { col: 5, align: { vertical: 'middle', horizontal: 'left', wrapText: true } }, // Address
          { col: 6, align: { vertical: 'middle', horizontal: 'center' } }, // Rating
          { col: 11, align: { vertical: 'middle', horizontal: 'left', wrapText: true } }, // Remarks
          { col: 12, align: { vertical: 'middle', horizontal: 'center' } }, // Date
          { col: 13, align: { vertical: 'middle', horizontal: 'center' } }, // Status
          { col: 14, align: { vertical: 'middle', horizontal: 'left' } }, // Source
          { col: 15, align: { vertical: 'middle', horizontal: 'left' } }, // Imported By
        ];

        companyColsToMerge.forEach(({ col, align }) => {
          worksheet.mergeCells(startRowIndex, col, endRowIndex, col);
          worksheet.getCell(startRowIndex, col).alignment = align;
        });
      }
    });

    // ── Status dropdown on every data row (column M = col 13) ──────────
    const exportStatusOptions = [
      'New',
      'Interested',
      'Not Interested',
      'Callback Requested',
      'Did not turn up',
      'Not picking',
      'Meeting Scheduled',
      'Converted to Lead',
      'Lost',
      'Other',
    ];
    const exportStatusFormula = `"${exportStatusOptions.join(',')}"`;
    for (let r = 2; r <= exportedRowCount + 1; r++) {
      worksheet.getCell(`M${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        showDropDown: false,
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Invalid Status',
        error: `Choose: ${exportStatusOptions.join(', ')}`,
        formulae: [exportStatusFormula],
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const timestamp = new Date().toISOString().slice(0, 10);
    const filterSuffix =
      dateFilter === 'today'
        ? '_Today'
        : dateFilter === '2days'
        ? '_Last2Days'
        : dateFilter === '5days'
        ? '_Last5Days'
        : dateFilter === 'custom'
        ? '_Custom'
        : '_All';
    const filename = `CRM_Export${filterSuffix}_${timestamp}.xlsx`;
    saveAs(blob, filename);
    const filterLabel =
      dateFilter === 'today'
        ? 'Today'
        : dateFilter === '2days'
        ? 'Last 2 Days'
        : dateFilter === '5days'
        ? 'Last 5 Days'
        : dateFilter === 'custom'
        ? 'Custom range'
        : 'All';
    toast.success(
      exportedRowCount === rowsToExport.length
        ? `Exported ${exportedRowCount} record${exportedRowCount === 1 ? '' : 's'} (Filter: ${filterLabel}).`
        : `Exported ${exportedRowCount} rows across ${rowsToExport.length} companies (Filter: ${filterLabel}).`
    );
  } catch (err) {
    console.error('Export error:', err);
    toast.error('Failed to export database records. Please try again.');
  }
};
