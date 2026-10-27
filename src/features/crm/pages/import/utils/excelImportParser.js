import * as XLSX from 'xlsx';
import { leadsService } from '../../../services/api';

// Module-level helper: extract last 10 digits of a phone number for normalised comparison.
export const normalizePhone = (p) => {
  if (!p) return '';
  const digits = String(p).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

// Parse excel date helper
export const parseRowDate = (val) => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const str = String(val).trim();
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  // Matches DD/MM/YYYY or DD-MM-YYYY
  const match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (match) {
    return new Date(parseInt(match[3], 10), parseInt(match[2], 10) - 1, parseInt(match[1], 10));
  }
  return new Date();
};

// Parse excel date of registration helper (returns empty string if missing)
export const parseRegistrationDate = (val) => {
  if (val === null || val === undefined || String(val).trim() === '') return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
  }
  const str = String(val).trim();
  if (!str) return '';
  const match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (match) {
    const d = new Date(parseInt(match[3], 10), parseInt(match[2], 10) - 1, parseInt(match[1], 10));
    return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : str;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return str;
};

export const parseExcelFile = (file, existingRecords, currentUserName, user) => {
  return new Promise((resolve, reject) => {
    const toDataUrl = (fileBlob) =>
      new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => res('');
        r.readAsDataURL(fileBlob);
      });

    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = async (e) => {
      try {
        const fileDataUrl = await toDataUrl(file);
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Populate merged cells so rows with merged company names retain the value across all contact rows
        if (worksheet && worksheet['!merges']) {
          worksheet['!merges'].forEach((range) => {
            const startCellRef = XLSX.utils.encode_cell(range.s);
            const masterCell = worksheet[startCellRef];
            if (masterCell && masterCell.v !== undefined) {
              for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                  const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                  if (!worksheet[cellRef] || worksheet[cellRef].v === undefined || worksheet[cellRef].v === '') {
                    worksheet[cellRef] = { ...masterCell };
                  }
                }
              }
            }
          });
        }

        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('The uploaded sheet is empty.');
        }

        // Total data rows fetched from the uploaded sheet
        const totalRowsFetched =
          rawJson.filter((r) =>
            Object.values(r).some((v) => v !== null && v !== undefined && String(v).trim() !== '')
          ).length || rawJson.length;

        const parsedRows = rawJson.map((row, idx) => {
          // Normalize row keys to match specified headers
          const normalized = {};
          Object.keys(row).forEach((k) => {
            const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            normalized[cleanKey] = row[k];
          });

          // Match specific columns from image
          const sNo = normalized['sno'] || normalized['srno'] || normalized['serialno'] || String(idx + 1);
          const companyName = normalized['companyname'] || normalized['company'] || '';
          const gstin = String(
            normalized['gstin'] ||
              normalized['gst'] ||
              normalized['gstno'] ||
              normalized['gstnumber'] ||
              normalized['taxid'] ||
              normalized['tin'] ||
              ''
          )
            .trim()
            .toUpperCase();
          const rawDateOfReg =
            normalized['dateofregistration'] ||
            normalized['registrationdate'] ||
            normalized['dateofreg'] ||
            normalized['regdate'] ||
            normalized['incorporationdate'] ||
            normalized['dateofincorporation'] ||
            '';
          const dateOfRegistration = parseRegistrationDate(rawDateOfReg);
          const industry = normalized['industry'] || '';
          const address = normalized['address'] || normalized['location'] || '';
          const rating = normalized['rating'] || '';
          const contactPerson = normalized['contactperson'] || normalized['contact'] || normalized['name'] || '';
          const designation = normalized['designation'] || normalized['jobtitle'] || '';
          const mobileNo = normalized['mobileno'] || normalized['mobile'] || normalized['phone'] || '';
          const emailId = normalized['emailid'] || normalized['email'] || '';
          const remarks = normalized['remarks'] || normalized['remark'] || normalized['notes'] || '';
          const rawStatus =
            normalized['status'] ||
            normalized['leadstatus'] ||
            normalized['callstatus'] ||
            normalized['prospectstatus'] ||
            normalized['currentstatus'] ||
            normalized['disposition'] ||
            '';
          const leadStatus = rawStatus ? String(rawStatus).trim() : 'New';
          const source =
            normalized['source'] ||
            normalized['leadsource'] ||
            normalized['origin'] ||
            normalized['datasource'] ||
            normalized['channel'] ||
            '';

          let dateVal =
            normalized['date'] ||
            normalized['createddate'] ||
            normalized['entrydate'] ||
            normalized['importdate'];
          const dateObj = parseRowDate(dateVal);

          const stableKey = [
            String(companyName).trim().toLowerCase(),
            String(gstin).trim().toUpperCase(),
            String(mobileNo).trim().replace(/\D/g, '').slice(-10),
            String(emailId).trim().toLowerCase(),
          ].join('|');
          let stableId;
          try {
            stableId = btoa(unescape(encodeURIComponent(stableKey))).replace(/[+/=]/g, '_');
          } catch {
            stableId = `${Date.now()}_${idx}`;
          }

          return {
            id: `row_${stableId}`,
            sNo: String(sNo),
            companyName: String(companyName).trim(),
            gstin,
            dateOfRegistration,
            industry: String(industry).trim(),
            address: String(address).trim(),
            rating: String(rating).trim(),
            contactPerson: String(contactPerson).trim(),
            designation: String(designation).trim(),
            mobileNo: String(mobileNo).trim(),
            emailId: String(emailId).trim(),
            remarks: String(remarks).trim(),
            status: String(leadStatus).trim() || 'New',
            leadStatus: String(leadStatus).trim() || 'New',
            source: String(source).trim(),
            leadSource: String(source).trim(),
            date: dateObj.toISOString(),
            createdAt: dateObj.toISOString(),
            updatedAt: new Date().toISOString(),
            importedBy: currentUserName,
            importedByUserId: user?._id || null,
          };
        });

        // Filter out empty rows where companyName, contactPerson, mobileNo, and emailId are missing
        const validRows = parsedRows.filter((r) => r.companyName || r.contactPerson || r.mobileNo || r.emailId);

        if (validRows.length === 0) {
          throw new Error('No valid company or contact data found in the file.');
        }

        // 1. Consolidate rows by Company Name within the uploaded sheet
        const consolidatedRows = [];
        const compIndexMap = new Map();

        validRows.forEach((r) => {
          const compKey = (r.companyName || '').trim().toLowerCase();
          const contactObj = {
            contactPerson: (r.contactPerson || '').trim(),
            designation: (r.designation || '').trim(),
            mobileNo: (r.mobileNo || '').trim(),
            emailId: (r.emailId || '').trim(),
            isPrimary: false,
          };
          const hasContact = Boolean(contactObj.contactPerson || contactObj.mobileNo || contactObj.emailId);

          if (compKey) {
            if (compIndexMap.has(compKey)) {
              const existingCompEntry = consolidatedRows[compIndexMap.get(compKey)];
              if (hasContact) {
                const rPhone = normalizePhone(contactObj.mobileNo);
                const rEmail = (contactObj.emailId || '').toLowerCase();
                const rName = (contactObj.contactPerson || '').toLowerCase();

                const isContactAlreadyPresent = (existingCompEntry.contacts || []).some((c) => {
                  const cPhone = normalizePhone(c.mobileNo);
                  const cEmail = (c.emailId || '').toLowerCase();
                  const cName = (c.contactPerson || '').toLowerCase();
                  if (rPhone && cPhone && rPhone === cPhone) return true;
                  if (rEmail && cEmail && rEmail === cEmail) return true;
                  if (rName && cName && rName === cName && (!rPhone || !cPhone)) return true;
                  return false;
                });

                if (!isContactAlreadyPresent) {
                  existingCompEntry.contacts.push(contactObj);
                }
              }

              if (!existingCompEntry.gstin && r.gstin) existingCompEntry.gstin = r.gstin;
              if (!existingCompEntry.dateOfRegistration && r.dateOfRegistration)
                existingCompEntry.dateOfRegistration = r.dateOfRegistration;
              if (!existingCompEntry.industry && r.industry) existingCompEntry.industry = r.industry;
              if (!existingCompEntry.address && r.address) existingCompEntry.address = r.address;
              if (!existingCompEntry.rating && r.rating) existingCompEntry.rating = r.rating;
              if (!existingCompEntry.remarks && r.remarks) existingCompEntry.remarks = r.remarks;
            } else {
              const initialContacts = hasContact ? [{ ...contactObj, isPrimary: true }] : [];
              const entry = {
                ...r,
                contacts: initialContacts,
              };
              compIndexMap.set(compKey, consolidatedRows.length);
              consolidatedRows.push(entry);
            }
          } else {
            const initialContacts = hasContact ? [{ ...contactObj, isPrimary: true }] : [];
            consolidatedRows.push({
              ...r,
              contacts: initialContacts,
            });
          }
        });

        // 2. Intra-sheet duplicate detection with Unique GSTIN enforcement
        const seenStandalonePhones = new Set();
        const seenStandaloneEmails = new Set();
        const seenGstins = new Map();

        const initialEnrichedRows = consolidatedRows.map((row) => {
          const comp = row.companyName ? row.companyName.trim() : '';
          const compLower = comp.toLowerCase();
          const phone = row.mobileNo ? normalizePhone(row.mobileNo) : '';
          const email = row.emailId ? row.emailId.toLowerCase() : '';
          const gstin = (row.gstin || '').trim().toUpperCase();

          let isSheetDup = false;
          const reasons = [];

          if (gstin) {
            if (seenGstins.has(gstin)) {
              const previousCompany = seenGstins.get(gstin);
              if (previousCompany && comp && previousCompany.toLowerCase() !== compLower) {
                isSheetDup = true;
                reasons.push(`Duplicate GSTIN: "${gstin}" is already assigned to "${previousCompany}" in this sheet`);
              }
            } else {
              seenGstins.set(gstin, comp || row.contactPerson || 'Another Entry');
            }
          }

          if (!compLower) {
            if (phone && seenStandalonePhones.has(phone)) {
              isSheetDup = true;
              reasons.push('Duplicate Mobile in sheet');
            }
            if (email && seenStandaloneEmails.has(email)) {
              isSheetDup = true;
              reasons.push('Duplicate Email in sheet');
            }
          }

          if (phone) seenStandalonePhones.add(phone);
          if (email) seenStandaloneEmails.add(email);

          return {
            ...row,
            isSheetDup,
            duplicateReason: reasons.join(', '),
          };
        });

        // 3. Build index of existing workspace records
        const existingCompMap = new Map();
        const existingPhoneMap = new Map();
        const existingEmailMap = new Map();
        const existingGstinMap = new Map();

        (existingRecords || []).forEach((r) => {
          const comp = (r.companyName || '').trim().toLowerCase();
          const phone = normalizePhone(r.mobileNo);
          const email = (r.emailId || '').trim().toLowerCase();
          const gstin = (r.gstin || '').trim().toUpperCase();
          if (comp && !existingCompMap.has(comp)) existingCompMap.set(comp, r);
          if (phone && !existingPhoneMap.has(phone)) existingPhoneMap.set(phone, r);
          if (email && !existingEmailMap.has(email)) existingEmailMap.set(email, r);
          if (gstin && !existingGstinMap.has(gstin)) existingGstinMap.set(gstin, r);
        });

        // 4. Check against existing CRM leads database in batch & classify rows
        let finalRows = initialEnrichedRows;
        try {
          const dupRes = await leadsService.checkDuplicatesBatch(consolidatedRows);
          const crmResultMap =
            dupRes?.success && Array.isArray(dupRes.results)
              ? new Map(dupRes.results.map((r) => [r.id, r]))
              : new Map();

          finalRows = initialEnrichedRows.map((row) => {
            const comp = row.companyName ? row.companyName.toLowerCase() : '';
            const phone = row.mobileNo ? normalizePhone(row.mobileNo) : '';
            const email = row.emailId ? row.emailId.toLowerCase() : '';
            const gstin = (row.gstin || '').trim().toUpperCase();

            // Case A: Duplicate within uploaded Excel sheet
            if (row.isSheetDup) {
              return {
                ...row,
                rowType: 'duplicate',
                isDuplicate: true,
                isUpdate: false,
                isNew: false,
                isConvertedToLead: false,
                leadId: null,
              };
            }

            // Case B: Cross-database GSTIN conflict
            const matchedByGstin = gstin ? existingGstinMap.get(gstin) : null;
            if (matchedByGstin) {
              const existingCompLower = (matchedByGstin.companyName || '').trim().toLowerCase();
              if (comp && existingCompLower && comp !== existingCompLower) {
                return {
                  ...row,
                  rowType: 'duplicate',
                  isDuplicate: true,
                  isUpdate: false,
                  isNew: false,
                  isConvertedToLead: false,
                  leadId: null,
                  duplicateReason: `Duplicate GSTIN: "${gstin}" already belongs to existing company "${matchedByGstin.companyName}" in database`,
                };
              }
            }

            // Case C: Existing record in CRM or in workspace (Update)
            const crmRes = crmResultMap.get(row.id);
            const inCrm = Boolean(crmRes?.existsInCrm || crmRes?.reason?.toLowerCase().includes('in crm'));
            const matchedWorkspaceRec =
              (comp && existingCompMap.get(comp)) ||
              (gstin && matchedByGstin) ||
              (phone && existingPhoneMap.get(phone)) ||
              (email && existingEmailMap.get(email)) ||
              null;

            if (inCrm || matchedWorkspaceRec) {
              const leadId = crmRes?.leadId || matchedWorkspaceRec?.leadId || null;
              const isConverted = inCrm || Boolean(matchedWorkspaceRec?.isConvertedToLead);

              let hasNewContact = false;
              if (matchedWorkspaceRec) {
                const exContacts =
                  Array.isArray(matchedWorkspaceRec.contacts) && matchedWorkspaceRec.contacts.length > 0
                    ? matchedWorkspaceRec.contacts
                    : matchedWorkspaceRec.contactPerson || matchedWorkspaceRec.mobileNo || matchedWorkspaceRec.emailId
                    ? [
                        {
                          contactPerson: matchedWorkspaceRec.contactPerson || '',
                          designation: matchedWorkspaceRec.designation || '',
                          mobileNo: matchedWorkspaceRec.mobileNo || '',
                          emailId: matchedWorkspaceRec.emailId || '',
                        },
                      ]
                    : [];

                hasNewContact = (row.contacts || []).some((newC) => {
                  const nPhone = normalizePhone(newC.mobileNo);
                  const nEmail = (newC.emailId || '').toLowerCase();
                  const nName = (newC.contactPerson || '').toLowerCase();
                  return !exContacts.some((oldC) => {
                    const oPhone = normalizePhone(oldC.mobileNo);
                    const oEmail = (oldC.emailId || '').toLowerCase();
                    const oName = (oldC.contactPerson || '').toLowerCase();
                    return (
                      (nPhone && oPhone && nPhone === oPhone) ||
                      (nEmail && oEmail && nEmail === oEmail) ||
                      (nName && oName && nName === oName)
                    );
                  });
                });
              }

              const updateReason = hasNewContact
                ? 'Adds new contact person to existing company'
                : inCrm
                ? 'Matches existing Lead in CRM'
                : 'Matches existing record in workspace';

              return {
                ...row,
                rowType: 'update',
                isDuplicate: false,
                isUpdate: true,
                isNew: false,
                duplicateReason: '',
                updateReason,
                isConvertedToLead: isConverted,
                leadId,
                existingRecordId: matchedWorkspaceRec?.id || null,
              };
            }

            // Case D: New unique row
            return {
              ...row,
              rowType: 'new',
              isDuplicate: false,
              isUpdate: false,
              isNew: true,
              duplicateReason: '',
              updateReason: '',
              isConvertedToLead: false,
              leadId: null,
              existingRecordId: null,
            };
          });
        } catch (dupErr) {
          console.warn('Batch duplicate check against CRM DB failed, using sheet deduplication:', dupErr);
          finalRows = initialEnrichedRows.map((row) => {
            if (row.isSheetDup) {
              return {
                ...row,
                rowType: 'duplicate',
                isDuplicate: true,
                isUpdate: false,
                isNew: false,
              };
            }
            const comp = row.companyName ? row.companyName.toLowerCase() : '';
            const phone = row.mobileNo ? normalizePhone(row.mobileNo) : '';
            const email = row.emailId ? row.emailId.toLowerCase() : '';
            const matchedWorkspaceRec =
              (comp && existingCompMap.get(comp)) ||
              (phone && existingPhoneMap.get(phone)) ||
              (email && existingEmailMap.get(email)) ||
              null;
            if (matchedWorkspaceRec) {
              const exContacts =
                Array.isArray(matchedWorkspaceRec.contacts) && matchedWorkspaceRec.contacts.length > 0
                  ? matchedWorkspaceRec.contacts
                  : [];
              const hasNewContact = (row.contacts || []).some((newC) => {
                const nPhone = normalizePhone(newC.mobileNo);
                const nEmail = (newC.emailId || '').toLowerCase();
                const nName = (newC.contactPerson || '').toLowerCase();
                return !exContacts.some((oldC) => {
                  const oPhone = normalizePhone(oldC.mobileNo);
                  const oEmail = (oldC.emailId || '').toLowerCase();
                  const oName = (oldC.contactPerson || '').toLowerCase();
                  return (
                    (nPhone && oPhone && nPhone === oPhone) ||
                    (nEmail && oEmail && nEmail === oEmail) ||
                    (nName && oName && nName === oName)
                  );
                });
              });

              return {
                ...row,
                rowType: 'update',
                isDuplicate: false,
                isUpdate: true,
                isNew: false,
                isConvertedToLead: Boolean(matchedWorkspaceRec.isConvertedToLead),
                leadId: matchedWorkspaceRec.leadId || null,
                existingRecordId: matchedWorkspaceRec.id || null,
                updateReason: hasNewContact
                  ? 'Adds new contact person to existing company'
                  : 'Matches existing record in workspace',
              };
            }
            return {
              ...row,
              rowType: 'new',
              isDuplicate: false,
              isUpdate: false,
              isNew: true,
            };
          });
        }

        const newCount = finalRows.filter((r) => r.rowType === 'new').length;
        const updateCount = finalRows.filter((r) => r.rowType === 'update').length;
        const dupCount = finalRows.filter((r) => r.rowType === 'duplicate').length;

        resolve({
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          fileSizeBytes: file.size,
          fileData: fileDataUrl || '',
          totalRowsFetched,
          rows: finalRows,
          newCount,
          updateCount,
          duplicateCount: dupCount,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};
