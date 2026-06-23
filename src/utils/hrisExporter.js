import api from '../api/axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export const exportCandidateHRIS = async (selectedEmployeeIds) => {
    if (selectedEmployeeIds.length === 0) {
        toast.error('Select at least one employee/candidate to export.');
        return;
    }

    const toastId = toast.loading('Fetching Profile and HRIS Data...');
    try {
        // Fetch dossiers in parallel
        const dossiers = await Promise.all(
            selectedEmployeeIds.map(async (id) => {
                const res = await api.get(`/dossier/${id}`);
                return res.data;
            })
        );

        toast.loading('Generating Excel File...', { id: toastId });

        const workbook = new ExcelJS.Workbook();

        // 1. Create Summary Sheet
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.columns = [
            { header: 'Employee Code', key: 'empCode', width: 20 },
            { header: 'Employee Name', key: 'fullName', width: 30 },
            { header: 'Email', key: 'email', width: 35 },
            { header: 'Department', key: 'department', width: 25 },
            { header: 'HRIS Status', key: 'hrisStatus', width: 25 },
            { header: 'Profile Fields Filled', key: 'fieldsStats', width: 30 },
            { header: 'Required Docs Uploaded', key: 'docsStats', width: 30 }
        ];
        // (Header row styling will be handled dynamically inside the first pass configuration block)

        // Required Document Checklist Definition
        const REQUIRED_DOCUMENTS = [
            { title: 'Aadhaar Card (Front)', category: 'ID Proof' },
            { title: 'Aadhaar Card (Back)', category: 'ID Proof' },
            { title: 'Pan Card', category: 'ID Proof' },
            { title: 'Passport', category: 'ID Proof' },
            { title: 'Recent Passport-Size Photograph', category: 'ID Proof' },
            { title: '10th Marksheet / Certificate', category: 'Education' },
            { title: '12th Marksheet / Certificate', category: 'Education' },
            { title: 'Graduation Marksheet / Certificate', category: 'Education' },
            { title: 'Cancelled Cheque / Passbook Front Page', category: 'Bank' },
            { title: 'Updated Resume', category: 'Resume' },
            { title: 'Previous Employer Relieving Letter', category: 'Relieving Letter' },
            { title: 'Previous Experience Certificate', category: 'Employment' },
            { title: 'Salary Slip', category: 'Payslips' },
            { title: 'Previous Offer Letter', category: 'Offer Letter' }
        ];

        // Populate summary and individual worksheets
        dossiers.forEach((dossier, dossierIdx) => {
            const currentAddr = dossier.contact?.addresses?.find(a => a.type === 'Current');
            const permanentAddr = dossier.contact?.addresses?.find(a => a.type === 'Permanent');
            const mailingAddr = dossier.contact?.addresses?.find(a => a.type === 'Mailing');

            const formatFullAddr = (addr) => {
                if (!addr || (!addr.line1 && !addr.street)) return '';
                const parts = [
                    addr.line1 || addr.street,
                    addr.addressLine2,
                    addr.city,
                    addr.state,
                    addr.country,
                    addr.zipCode
                ];
                return parts.filter(Boolean).join(', ');
            };

            const fieldsToCheck = [
                // General Account Info
                { label: 'Roles', val: dossier.user?.roles?.map(r => r.name).join(', '), section: 'General' },
                { label: 'Work Location (Account)', val: dossier.user?.workLocation, section: 'General' },

                // Personal Profile Details
                { label: 'First Name (Personal)', val: dossier.personal?.firstName, section: 'Personal' },
                { label: 'Middle Name (Personal)', val: dossier.personal?.middleName, section: 'Personal' },
                { label: 'Last Name (Personal)', val: dossier.personal?.lastName, section: 'Personal' },
                { label: 'Full Name (Personal)', val: dossier.personal?.fullName, section: 'Personal' },
                { label: 'Gender', val: dossier.personal?.gender, section: 'Personal' },
                { label: 'Date of Birth', val: dossier.personal?.dob, section: 'Personal', type: 'date' },
                { label: 'Marital Status', val: dossier.personal?.maritalStatus, section: 'Personal' },
                { label: 'Date of Marriage', val: dossier.personal?.dateOfMarriage, section: 'Personal', type: 'date' },
                { label: 'Blood Group', val: dossier.personal?.bloodGroup, section: 'Personal' },
                { label: 'Nationality', val: dossier.personal?.nationality, section: 'Personal' },
                { label: 'Disability Status', val: dossier.personal?.disabilityStatus ? 'Yes' : 'No', section: 'Personal' },
                { label: 'Disability Details', val: dossier.personal?.disabilityDetails, section: 'Personal' },


                // Identity Details
                { label: 'Aadhaar Number', val: dossier.identity?.aadhaarNumber, section: 'Identity' },
                { label: 'PAN Number', val: dossier.identity?.panNumber, section: 'Identity' },
                { label: 'Passport Number', val: dossier.identity?.passportNumber, section: 'Identity' },


                // Contact Details & Address
                { label: 'Personal Email', val: dossier.contact?.personalEmail, section: 'Contact' },
                { label: 'Work Email', val: dossier.contact?.workEmail, section: 'Contact' },
                { label: 'Mobile Number', val: dossier.contact?.mobileNumber, section: 'Contact' },
                { label: 'Alternate Number', val: dossier.contact?.alternateNumber, section: 'Contact' },
                { label: 'Emergency Number', val: dossier.contact?.emergencyNumber, section: 'Contact' },
                { label: 'Landline Number', val: dossier.contact?.landlineNumber, section: 'Contact' },
                { label: 'Current Address', val: formatFullAddr(currentAddr), section: 'Contact' },
                { label: 'Permanent Address', val: formatFullAddr(permanentAddr), section: 'Contact' },
                { label: 'Mailing Address', val: formatFullAddr(mailingAddr), section: 'Contact' },
                { label: 'Emergency Contact Name', val: dossier.contact?.emergencyContact?.name, section: 'Contact' },
                { label: 'Emergency Contact Relation', val: dossier.contact?.emergencyContact?.relation, section: 'Contact' },
                { label: 'Emergency Contact Phone', val: dossier.contact?.emergencyContact?.phone, section: 'Contact' },
                { label: 'Emergency Contact Alternate Phone', val: dossier.contact?.emergencyContact?.alternatePhone, section: 'Contact' },
                { label: 'Emergency Contact Email', val: dossier.contact?.emergencyContact?.email, section: 'Contact' },

                // Family Details
                { label: 'Father Name', val: dossier.family?.fatherName, section: 'Family' },
                { label: 'Father DOB', val: dossier.family?.fatherDob, section: 'Family', type: 'date' },
                { label: 'Father Occupation', val: dossier.family?.fatherOccupation, section: 'Family' },
                { label: 'Mother Name', val: dossier.family?.motherName, section: 'Family' },
                { label: 'Mother DOB', val: dossier.family?.motherDob, section: 'Family', type: 'date' },
                { label: 'Mother Occupation', val: dossier.family?.motherOccupation, section: 'Family' },
                { label: 'Parents Marital Status', val: dossier.family?.parentsMaritalStatus, section: 'Family' },
                { label: 'Total Siblings', val: dossier.family?.totalSiblings, section: 'Family' },
                { label: 'Spouse Name', val: dossier.family?.spouseName, section: 'Family' },
                { label: 'Spouse DOB', val: dossier.family?.spouseDob, section: 'Family', type: 'date' },

                // Employment Details
                { label: 'Designation', val: dossier.employment?.designation, section: 'Employment' },
                { label: 'Department (Employment)', val: dossier.employment?.department, section: 'Employment' },
                { label: 'Reporting Manager', val: dossier.employment?.reportingManager ? `${dossier.employment.reportingManager.firstName} ${dossier.employment.reportingManager.lastName}` : '', section: 'Employment' },
                { label: 'Joining Date (Employment)', val: dossier.employment?.joiningDate, section: 'Employment', type: 'date' },
                { label: 'Employment Status', val: dossier.employment?.status, section: 'Employment' },
                { label: 'Employment Type (Employment)', val: dossier.employment?.employmentType, section: 'Employment' },

                // Bank & Compensation Details
                { label: 'Account Holder Name', val: dossier.compensation?.bankDetails?.accountHolderName, section: 'Bank' },
                { label: 'Bank Name', val: dossier.compensation?.bankDetails?.bankName, section: 'Bank' },
                { label: 'Account Number', val: dossier.compensation?.bankDetails?.accountNumber, section: 'Bank' },
                { label: 'IFSC Code', val: dossier.compensation?.bankDetails?.ifscCode, section: 'Bank' },
                { label: 'Branch Address', val: dossier.compensation?.bankDetails?.branchAddress, section: 'Bank' },
                { label: 'UAN Applicable', val: dossier.compensation?.isUanApplicable ? 'Yes' : 'No', section: 'Bank' },
                { label: 'UAN Number', val: dossier.compensation?.uanNumber, section: 'Bank' }
            ];

            const isFilled = (val) => {
                if (val === null || val === undefined || String(val).trim() === '') return false;
                return true;
            };

            const totalFields = fieldsToCheck.length;
            const filledFields = fieldsToCheck.filter(f => isFilled(f.val)).length;
            const fieldsPercentage = Math.round((filledFields / totalFields) * 100);

            const uploadedDocs = dossier.documents || [];
            const totalRequiredDocs = REQUIRED_DOCUMENTS.length;
            const uploadedRequiredDocs = REQUIRED_DOCUMENTS.filter(reqDoc =>
                uploadedDocs.some(upDoc =>
                    !upDoc.isDeleted &&
                    upDoc.title &&
                    (upDoc.title.toLowerCase().includes(reqDoc.title.toLowerCase()) ||
                        reqDoc.title.toLowerCase().includes(upDoc.title.toLowerCase()))
                )
            ).length;
            const docsPercentage = Math.round((uploadedRequiredDocs / totalRequiredDocs) * 100);

            const empName = `${dossier.user?.firstName || ''} ${dossier.user?.lastName || ''}`.trim() || 'N/A';
            const hrisStatus = dossier.hris?.status || 'Draft';

            // Dynamically define Summary Sheet Columns on the first pass
            if (dossierIdx === 0) {
                const cols = [
                    { header: 'Employee Code', key: 'empCode', width: 22 },
                    { header: 'Employee Name', key: 'fullName', width: 30 },
                    { header: 'Email', key: 'email', width: 35 },
                    { header: 'Department', key: 'department', width: 25 },
                    { header: 'HRIS Status', key: 'hrisStatus', width: 25 },
                    { header: 'Profile Fields Filled', key: 'fieldsStats', width: 30 },
                    { header: 'Required Docs Uploaded', key: 'docsStats', width: 30 }
                ];

                fieldsToCheck.forEach((f, idx) => {
                    let w = 25;
                    const labelLower = f.label.toLowerCase();
                    if (labelLower.includes('email')) w = 35;
                    else if (labelLower.includes('address')) w = 45;
                    else if (labelLower.includes('details')) w = 35;
                    else if (labelLower.includes('name')) w = 25;
                    else if (labelLower.includes('joining date') || labelLower.includes('date of birth') || labelLower.includes('date of marriage')) w = 22;
                    cols.push({ header: f.label, key: `field_${idx}`, width: w });
                });

                REQUIRED_DOCUMENTS.forEach((rd, idx) => {
                    cols.push({ header: `${rd.title} Status`, key: `doc_${idx}`, width: 30 });
                });

                cols.push({ header: 'Educational Qualifications', key: 'educationList', width: 50 });
                cols.push({ header: 'Work Experience History', key: 'experienceList', width: 50 });
                cols.push({ header: 'Technical Skills', key: 'techSkills', width: 35 });
                cols.push({ header: 'Behavioral Skills', key: 'behavSkills', width: 35 });
                cols.push({ header: 'Learning Interests', key: 'learningInterests', width: 35 });

                summarySheet.columns = cols;

                // Insert a row above to become the new Row 1 (merged groups)
                summarySheet.insertRow(1, Array(cols.length).fill(''));

                // Calculate group ranges dynamically for Row 1 headers
                const groups = [];
                let currentCol = 1;

                // 1. Core Details (7 columns)
                groups.push({
                    title: 'Core Details',
                    start: currentCol,
                    end: currentCol + 6
                });
                currentCol += 7;

                // 2. fieldsToCheck grouped sections:
                // General, Personal, Identity, Contact, Family, Employment, Bank
                const sectionsOrder = [
                    { key: 'General', label: 'General Information' },
                    { key: 'Personal', label: 'Personal Details' },
                    { key: 'Identity', label: 'Identity Details' },
                    { key: 'Contact', label: 'Contact Details' },
                    { key: 'Family', label: 'Family Details' },
                    { key: 'Employment', label: 'Employment Details' },
                    { key: 'Bank', label: 'Bank Details' }
                ];

                sectionsOrder.forEach(sec => {
                    const count = fieldsToCheck.filter(f => f.section === sec.key).length;
                    if (count > 0) {
                        groups.push({
                            title: sec.label,
                            start: currentCol,
                            end: currentCol + count - 1
                        });
                        currentCol += count;
                    }
                });

                // 3. Required Documents Status (REQUIRED_DOCUMENTS.length)
                const docCount = REQUIRED_DOCUMENTS.length;
                if (docCount > 0) {
                    groups.push({
                        title: 'Required Documents Status',
                        start: currentCol,
                        end: currentCol + docCount - 1
                    });
                    currentCol += docCount;
                }

                // 4. Additional Info (5 columns)
                groups.push({
                    title: 'Additional Info',
                    start: currentCol,
                    end: currentCol + 4
                });

                // Merge cells for each group in Row 1
                groups.forEach(group => {
                    summarySheet.mergeCells(1, group.start, 1, group.end);
                    const cell = summarySheet.getCell(1, group.start);
                    cell.value = group.title;
                });

                // Style rows 1 and 2
                summarySheet.getRow(1).height = 28;
                summarySheet.getRow(2).height = 24;

                for (let c = 1; c <= cols.length; c++) {
                    const cell1 = summarySheet.getCell(1, c);
                    cell1.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
                    cell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Slate
                    cell1.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell1.border = {
                        top: { style: 'thin', color: { argb: 'FF475569' } },
                        left: { style: 'thin', color: { argb: 'FF475569' } },
                        bottom: { style: 'thin', color: { argb: 'FF475569' } },
                        right: { style: 'thin', color: { argb: 'FF475569' } }
                    };

                    const cell2 = summarySheet.getCell(2, c);
                    cell2.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
                    cell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // Slate Gray
                    cell2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    cell2.border = {
                        top: { style: 'thin', color: { argb: 'FF475569' } },
                        left: { style: 'thin', color: { argb: 'FF475569' } },
                        bottom: { style: 'thin', color: { argb: 'FF475569' } },
                        right: { style: 'thin', color: { argb: 'FF475569' } }
                    };
                }
            }

            // Construct Summary Row Data
            const summaryRowData = {
                empCode: dossier.user?.employeeCode || 'N/A',
                fullName: empName,
                email: dossier.user?.email || 'N/A',
                department: dossier.user?.department || 'N/A',
                hrisStatus: hrisStatus,
                fieldsStats: `${filledFields} / ${totalFields} (${fieldsPercentage}%)`,
                docsStats: `${uploadedRequiredDocs} / ${totalRequiredDocs} (${docsPercentage}%)`
            };

            // Map each field to its column key
            fieldsToCheck.forEach((f, idx) => {
                const formattedVal = f.type === 'date' && f.val ? format(new Date(f.val), 'dd MMM yyyy') : (f.val || '');
                summaryRowData[`field_${idx}`] = formattedVal || '[PENDING]';
            });

            // Map each required document checklist to its column key
            REQUIRED_DOCUMENTS.forEach((reqDoc, idx) => {
                const match = uploadedDocs.find(upDoc =>
                    !upDoc.isDeleted &&
                    upDoc.title &&
                    (upDoc.title.toLowerCase().includes(reqDoc.title.toLowerCase()) ||
                        reqDoc.title.toLowerCase().includes(upDoc.title.toLowerCase()))
                );

                if (match) {
                    summaryRowData[`doc_${idx}`] = `Uploaded (${match.verificationStatus || 'Pending Review'})`;
                } else {
                    summaryRowData[`doc_${idx}`] = 'Pending Upload';
                }
            });

            // Map serialized lists
            summaryRowData.educationList = dossier.education && dossier.education.length > 0
                ? dossier.education.map(edu => `${edu.courseName || edu.degree || 'Degree'} from ${edu.institution || 'N/A'} (${edu.grade || '-'})`).join('; ')
                : 'None';

            summaryRowData.experienceList = dossier.experience && dossier.experience.length > 0
                ? dossier.experience.map(exp => `${exp.designation || 'Role'} at ${exp.companyName || 'N/A'} (${exp.totalExperience || '-'})`).join('; ')
                : 'None';

            summaryRowData.techSkills = dossier.skills?.technical?.join(', ') || 'None';
            summaryRowData.behavSkills = dossier.skills?.behavioral?.join(', ') || 'None';
            summaryRowData.learningInterests = dossier.skills?.learningInterests?.join(', ') || 'None';

            const summaryRow = summarySheet.addRow(summaryRowData);

            // Style all cells in the summary row with thin borders
            summaryRow.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
                };
            });

            // Style Summary HRIS Status Cell
            const hrisStatusCell = summaryRow.getCell(5);
            if (hrisStatus === 'Approved') {
                hrisStatusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } };
                hrisStatusCell.font = { color: { argb: 'FF274E13' }, bold: true };
            } else if (hrisStatus === 'Pending Approval') {
                hrisStatusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
                hrisStatusCell.font = { color: { argb: 'FFB45F06' }, bold: true };
            } else {
                hrisStatusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
                hrisStatusCell.font = { color: { argb: 'FF4B5563' }, bold: true };
            }

            // Style HRIS Input Fields in Summary
            fieldsToCheck.forEach((f, idx) => {
                const cell = summaryRow.getCell(8 + idx);
                if (isFilled(f.val)) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } }; // Light green
                    cell.font = { color: { argb: 'FF274E13' } };
                } else {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2DCDB' } }; // Light red
                    cell.font = { color: { argb: 'FFCC0000' }, italic: true };
                }
            });

            // Style Document Upload Checklist columns
            const docStartIndex = 8 + fieldsToCheck.length;
            REQUIRED_DOCUMENTS.forEach((reqDoc, idx) => {
                const cell = summaryRow.getCell(docStartIndex + idx);
                const statusVal = summaryRowData[`doc_${idx}`];
                if (statusVal.startsWith('Uploaded')) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } }; // Light green
                    cell.font = { color: { argb: 'FF274E13' }, bold: true };
                } else {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2DCDB' } }; // Light red
                    cell.font = { color: { argb: 'FF660000' }, bold: true };
                }
            });

            // 2. Add Candidate-specific Sheet
            let sheetName = `${dossier.user?.firstName || ''}_${dossier.user?.lastName || ''}`.trim() || 'Employee';
            sheetName = sheetName.replace(/[\\/*?:\[\]]/g, '').substring(0, 25);

            let finalSheetName = sheetName;
            let counter = 1;
            while (workbook.getWorksheet(finalSheetName)) {
                finalSheetName = `${sheetName}_${counter}`;
                counter++;
            }

            const ws = workbook.addWorksheet(finalSheetName);
            ws.columns = [
                { key: 'label', width: 35 },
                { key: 'value', width: 55 },
                { key: 'status', width: 25 },
                { key: 'extra1', width: 20 },
                { key: 'extra2', width: 20 },
                { key: 'extra3', width: 35 }
            ];

            // Page Title
            const titleRow = ws.addRow([`HRIS & Document Submission Profile - ${empName}`, '', '', '', '', '']);
            ws.mergeCells(titleRow.number, 1, titleRow.number, 6);
            titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
            titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
            titleRow.getCell(1).alignment = { horizontal: 'center' };

            // Statistics Summary Row
            const statsRow = ws.addRow([
                `Profile Fields Filled: ${filledFields} of ${totalFields} (${fieldsPercentage}%)`,
                `Required Documents Uploaded: ${uploadedRequiredDocs} of ${totalRequiredDocs} (${docsPercentage}%)`,
                `HRIS Status: ${hrisStatus}`,
                '', '', ''
            ]);
            ws.mergeCells(statsRow.number, 3, statsRow.number, 6);
            statsRow.font = { italic: true, bold: true, size: 10 };
            statsRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } });

            ws.addRow([]);

            // Add HRIS Rows Helper
            const addHRISRow = (ws, label, value, isDate = false) => {
                const formattedVal = isDate && value ? format(new Date(value), 'dd MMM yyyy') : (value || '');
                const statusText = isFilled(value) ? 'Filled' : 'Pending / Missing';
                const row = ws.addRow([label, formattedVal || '[PENDING]', statusText]);

                // Apply thin borders to all cells in candidate profile row
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
                    };
                });

                const valCell = row.getCell(2);
                const statusCell = row.getCell(3);

                if (isFilled(value)) {
                    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } };
                    statusCell.font = { color: { argb: 'FF274E13' }, bold: true };
                } else {
                    valCell.font = { color: { argb: 'FFCC0000' }, italic: true };
                    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2DCDB' } };
                    statusCell.font = { color: { argb: 'FF660000' }, bold: true };
                }

                row.getCell(1).font = { bold: true };
                row.getCell(1).alignment = { horizontal: 'left' };
                row.getCell(2).alignment = { horizontal: 'left' };
                row.getCell(3).alignment = { horizontal: 'center' };
            };

            // Section 1: Account & General Info
            const sec1 = ws.addRow(['1. Account & General Information', '', '', '', '', '']);
            ws.mergeCells(sec1.number, 1, sec1.number, 6);
            sec1.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            sec1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };

            // Manually add the core account info to the candidate sheet's Section 1
            addHRISRow(ws, 'First Name (Account)', dossier.user?.firstName);
            addHRISRow(ws, 'Last Name (Account)', dossier.user?.lastName);
            addHRISRow(ws, 'Email (Account)', dossier.user?.email);
            addHRISRow(ws, 'Employee Code', dossier.user?.employeeCode);
            addHRISRow(ws, 'Department (Account)', dossier.user?.department);
            addHRISRow(ws, 'Joining Date (Account)', dossier.user?.joiningDate, true);
            addHRISRow(ws, 'Employment Type (Account)', dossier.user?.employmentType);

            fieldsToCheck.filter(f => f.section === 'General').forEach(f => {
                addHRISRow(ws, f.label, f.val, f.type === 'date');
            });

            ws.addRow([]);

            // Section 2: Personal Profile Details
            const sec2 = ws.addRow(['2. Personal Profile Details', '', '', '', '', '']);
            ws.mergeCells(sec2.number, 1, sec2.number, 6);
            sec2.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            sec2.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };

            fieldsToCheck.filter(f => f.section === 'Personal').forEach(f => {
                addHRISRow(ws, f.label, f.val, f.type === 'date');
            });

            ws.addRow([]);

            // Section 3: Identity Documents Info
            const sec3 = ws.addRow(['3. Identity Documents Info', '', '', '', '', '']);
            ws.mergeCells(sec3.number, 1, sec3.number, 6);
            sec3.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            sec3.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };

            fieldsToCheck.filter(f => f.section === 'Identity').forEach(f => {
                addHRISRow(ws, f.label, f.val, f.type === 'date');
            });

            ws.addRow([]);

            // Section 4: Contact Details & Addresses
            const sec4 = ws.addRow(['4. Contact Details & Addresses', '', '', '', '', '']);
            ws.mergeCells(sec4.number, 1, sec4.number, 6);
            sec4.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            sec4.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };

            fieldsToCheck.filter(f => f.section === 'Contact').forEach(f => {
                addHRISRow(ws, f.label, f.val, f.type === 'date');
            });

            ws.addRow([]);

            // Section 5: Family Details
            const sec5 = ws.addRow(['5. Family Details', '', '', '', '', '']);
            ws.mergeCells(sec5.number, 1, sec5.number, 6);
            sec5.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            sec5.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };

            fieldsToCheck.filter(f => f.section === 'Family').forEach(f => {
                addHRISRow(ws, f.label, f.val, f.type === 'date');
            });

            // Display Children if present
            if (dossier.family?.children && dossier.family.children.length > 0) {
                dossier.family.children.forEach((child, cIdx) => {
                    addHRISRow(ws, `Child ${cIdx + 1} Name`, child.name);
                    addHRISRow(ws, `Child ${cIdx + 1} DOB`, child.dob, true);
                });
            }

            ws.addRow([]);

            // Section 6: Employment Details
            const sec6 = ws.addRow(['6. Employment Details', '', '', '', '', '']);
            ws.mergeCells(sec6.number, 1, sec6.number, 6);
            sec6.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            sec6.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };

            fieldsToCheck.filter(f => f.section === 'Employment').forEach(f => {
                addHRISRow(ws, f.label, f.val, f.type === 'date');
            });

            ws.addRow([]);

            // Section 7: Compensation & Bank Details
            const sec7 = ws.addRow(['7. Compensation & Bank Details', '', '', '', '', '']);
            ws.mergeCells(sec7.number, 1, sec7.number, 6);
            sec7.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            sec7.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };

            fieldsToCheck.filter(f => f.section === 'Bank').forEach(f => {
                addHRISRow(ws, f.label, f.val, f.type === 'date');
            });

            // Section 8: Educational Qualifications
            ws.addRow([]);
            const eduHeader = ws.addRow(['8. Educational Qualifications', '', '', '', '', '']);
            ws.mergeCells(eduHeader.number, 1, eduHeader.number, 6);
            eduHeader.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            eduHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };

            const eduCols = ws.addRow(['Institution', 'Degree / Course', 'University', 'From Date', 'To Date', 'Grade / CGPA']);
            eduCols.font = { bold: true };
            eduCols.alignment = { horizontal: 'center' };
            eduCols.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } });

            if (dossier.education && dossier.education.length > 0) {
                dossier.education.forEach(edu => {
                    ws.addRow([
                        edu.institution || '-',
                        edu.courseName || edu.degree || '-',
                        edu.university || '-',
                        edu.fromDate ? format(new Date(edu.fromDate), 'dd MMM yyyy') : '-',
                        edu.toDate ? format(new Date(edu.toDate), 'dd MMM yyyy') : '-',
                        edu.grade || '-'
                    ]);
                });
            } else {
                const noEduRow = ws.addRow(['No educational qualification details added.', '', '', '', '', '']);
                ws.mergeCells(noEduRow.number, 1, noEduRow.number, 6);
                noEduRow.getCell(1).font = { italic: true };
            }

            // Section 9: Work Experience History
            ws.addRow([]);
            const expHeader = ws.addRow(['9. Work Experience History', '', '', '', '', '']);
            ws.mergeCells(expHeader.number, 1, expHeader.number, 6);
            expHeader.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            expHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };

            const expCols = ws.addRow(['Company Name', 'Designation', 'Start Date', 'End Date', 'Reason for Leaving', 'Total Experience']);
            expCols.font = { bold: true };
            expCols.alignment = { horizontal: 'center' };
            expCols.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } });

            if (dossier.experience && dossier.experience.length > 0) {
                dossier.experience.forEach(exp => {
                    ws.addRow([
                        exp.companyName || '-',
                        exp.designation || '-',
                        exp.startDate ? format(new Date(exp.startDate), 'dd MMM yyyy') : '-',
                        exp.endDate ? format(new Date(exp.endDate), 'dd MMM yyyy') : '-',
                        exp.reasonForLeaving || '-',
                        exp.totalExperience || '-'
                    ]);
                });
            } else {
                const noExpRow = ws.addRow(['No work experience history details added.', '', '', '', '', '']);
                ws.mergeCells(noExpRow.number, 1, noExpRow.number, 6);
                noExpRow.getCell(1).font = { italic: true };
            }

            // Section 10: Skills & Competencies
            ws.addRow([]);
            const skillsHeader = ws.addRow(['10. Skills & Competencies', '', '', '', '', '']);
            ws.mergeCells(skillsHeader.number, 1, skillsHeader.number, 6);
            skillsHeader.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            skillsHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };

            const techRow = ws.addRow(['Technical Skills', dossier.skills?.technical?.join(', ') || 'None', '', '', '', '']);
            ws.mergeCells(techRow.number, 2, techRow.number, 6);
            techRow.getCell(1).font = { bold: true };

            const behavRow = ws.addRow(['Behavioral Skills', dossier.skills?.behavioral?.join(', ') || 'None', '', '', '', '']);
            ws.mergeCells(behavRow.number, 2, behavRow.number, 6);
            behavRow.getCell(1).font = { bold: true };

            const learnRow = ws.addRow(['Learning Interests', dossier.skills?.learningInterests?.join(', ') || 'None', '', '', '', '']);
            ws.mergeCells(learnRow.number, 2, learnRow.number, 6);
            learnRow.getCell(1).font = { bold: true };

            // Section 11: Document Checklist & Submission Details
            ws.addRow([]);
            const docHeader = ws.addRow(['11. Document Checklist & Submission Details', '', '', '', '', '']);
            ws.mergeCells(docHeader.number, 1, docHeader.number, 6);
            docHeader.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            docHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };

            const docCols = ws.addRow(['Document Checklist Item', 'Status', 'File Name', 'Verification Status', 'Upload Date', 'Verification/Rejection Details']);
            docCols.font = { bold: true };
            docCols.alignment = { horizontal: 'center' };
            docCols.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } });

            const matchedUploadedIds = new Set();

            REQUIRED_DOCUMENTS.forEach(reqDoc => {
                const match = uploadedDocs.find(upDoc =>
                    !upDoc.isDeleted &&
                    upDoc.title &&
                    (upDoc.title.toLowerCase().includes(reqDoc.title.toLowerCase()) ||
                        reqDoc.title.toLowerCase().includes(upDoc.title.toLowerCase()))
                );

                if (match) {
                    matchedUploadedIds.add(match._id.toString());
                    const row = ws.addRow([
                        reqDoc.title,
                        'Uploaded',
                        match.fileName || 'Attached File',
                        match.verificationStatus || 'Pending Review',
                        match.uploadDate ? format(new Date(match.uploadDate), 'dd MMM yyyy') : '-',
                        match.rejectionReason || match.revocationReason || ''
                    ]);

                    const statusCell = row.getCell(2);
                    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } };
                    statusCell.font = { color: { argb: 'FF274E13' }, bold: true };

                    const verifyCell = row.getCell(4);
                    if (match.verificationStatus === 'Verified') {
                        verifyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } };
                        verifyCell.font = { color: { argb: 'FF274E13' }, bold: true };
                    } else if (match.verificationStatus === 'Rejected') {
                        verifyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2DCDB' } };
                        verifyCell.font = { color: { argb: 'FF660000' }, bold: true };
                    }
                } else {
                    const row = ws.addRow([
                        reqDoc.title,
                        'Pending Upload',
                        '-',
                        '-',
                        '-',
                        '-'
                    ]);

                    const statusCell = row.getCell(2);
                    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2DCDB' } };
                    statusCell.font = { color: { argb: 'FF660000' }, bold: true };
                }
            });

            // List non-checklist uploaded documents
            uploadedDocs.forEach(match => {
                if (!match.isDeleted && !matchedUploadedIds.has(match._id.toString())) {
                    const row = ws.addRow([
                        match.title || `Other (${match.category || 'Other'})`,
                        'Uploaded',
                        match.fileName || 'Attached File',
                        match.verificationStatus || 'Pending Review',
                        match.uploadDate ? format(new Date(match.uploadDate), 'dd MMM yyyy') : '-',
                        match.rejectionReason || match.revocationReason || ''
                    ]);

                    const statusCell = row.getCell(2);
                    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } };
                    statusCell.font = { color: { argb: 'FF274E13' }, bold: true };

                    const verifyCell = row.getCell(4);
                    if (match.verificationStatus === 'Verified') {
                        verifyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } };
                        verifyCell.font = { color: { argb: 'FF274E13' }, bold: true };
                    } else if (match.verificationStatus === 'Rejected') {
                        verifyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2DCDB' } };
                        verifyCell.font = { color: { argb: 'FF660000' }, bold: true };
                    }
                }
            });
        });

        // Write and download
        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `HRIS_Candidate_Export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        saveAs(new Blob([buffer]), fileName);

        toast.success('Profiles Exported Successfully', { id: toastId });
    } catch (error) {
        console.error('Export HRIS Profiles Error:', error);
        toast.error(error.response?.data?.message || 'Failed to export HRIS profiles', { id: toastId });
    }
};
