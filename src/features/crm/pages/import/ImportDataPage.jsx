import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Search,
  CheckSquare,
  Square,
  Send,
  Trash2,
  Download,
  AlertCircle,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  X,
  Pencil,
  Save,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { dataService, leadsService } from '../../services/api';

const STORAGE_KEY = 'crm_imported_excel_records';

export const ImportDataPage = ({ onNavigate }) => {
  const [records, setRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [fileName, setFileName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortDirection, setSortDirection] = useState('desc'); // 'desc' | 'asc'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | '2days' | '5days' | 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Staging state for File Preview before actual import
  const [stagedData, setStagedData] = useState(null); // { fileName, fileSize, rows: [], newCount, duplicateCount }
  const [showPreview, setShowPreview] = useState(true);
  const [previewTab, setPreviewTab] = useState('all'); // 'all' | 'new' | 'duplicates'

  const fileInputRef = useRef(null);

  // Filtered rows for the preview table
  const visibleStagedRows = useMemo(() => {
    if (!stagedData?.rows) return [];
    if (previewTab === 'new') return stagedData.rows.filter((r) => !r.isDuplicate);
    if (previewTab === 'duplicates') return stagedData.rows.filter((r) => r.isDuplicate);
    return stagedData.rows;
  }, [stagedData, previewTab]);

  // Persist records to localStorage
  useEffect(() => {
    try {
      if (records.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save imported records in localStorage', e);
    }
  }, [records]);

  // Check which records in workspace are already converted to leads in CRM
  useEffect(() => {
    if (!records || records.length === 0) return;
    leadsService
      .checkDuplicatesBatch(records)
      .then((dupRes) => {
        if (dupRes?.success && Array.isArray(dupRes.results)) {
          const leadMap = new Map(dupRes.results.map((r) => [r.id, r]));
          setRecords((prev) =>
            prev.map((row) => {
              const res = leadMap.get(row.id);
              const inCrm = Boolean(
                res?.existsInCrm ||
                res?.reason?.toLowerCase().includes('in crm') ||
                row.isConvertedToLead
              );
              if (inCrm && !row.isConvertedToLead) {
                return {
                  ...row,
                  isConvertedToLead: true,
                  leadId: res?.leadId || row.leadId,
                };
              }
              return row;
            })
          );
        }
      })
      .catch((err) => {
        console.warn('Failed to verify converted leads against CRM database:', err);
      });
  }, []);

  // Parse excel date helper
  const parseRowDate = (val) => {
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

  const handleFileUpload = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          toast.error('The uploaded sheet is empty.');
          return;
        }

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
          const industry = normalized['industry'] || '';
          const address = normalized['address'] || normalized['location'] || '';
          const rating = normalized['rating'] || '';
          const contactPerson = normalized['contactperson'] || normalized['contact'] || normalized['name'] || '';
          const designation = normalized['designation'] || normalized['jobtitle'] || '';
          const mobileNo = normalized['mobileno'] || normalized['mobile'] || normalized['phone'] || '';
          const emailId = normalized['emailid'] || normalized['email'] || '';
          const remarks = normalized['remarks'] || normalized['remark'] || normalized['notes'] || '';

          // Look for date in row
          let dateVal = normalized['date'] || normalized['createddate'] || normalized['entrydate'] || normalized['importdate'];
          const dateObj = parseRowDate(dateVal);

          return {
            id: `row_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 6)}`,
            sNo: String(sNo),
            companyName: String(companyName).trim(),
            industry: String(industry).trim(),
            address: String(address).trim(),
            rating: String(rating).trim(),
            contactPerson: String(contactPerson).trim(),
            designation: String(designation).trim(),
            mobileNo: String(mobileNo).trim(),
            emailId: String(emailId).trim(),
            remarks: String(remarks).trim(),
            date: dateObj.toISOString(),
          };
        });

        // Filter out empty rows where companyName, contactPerson, mobileNo, and emailId are missing
        const validRows = parsedRows.filter((r) => r.companyName || r.contactPerson || r.mobileNo || r.emailId);

        if (validRows.length === 0) {
          toast.error('No valid company or contact data found in the file.');
          return;
        }

        // Helper to normalize phone number (extract digits, last 10 digits)
        const normalizePhone = (p) => {
          if (!p) return '';
          const digits = String(p).replace(/\D/g, '');
          return digits.length >= 10 ? digits.slice(-10) : digits;
        };

        // 1. Intra-sheet duplicate detection by companyName, mobileNo, emailId
        const seenCompanies = new Set();
        const seenPhones = new Set();
        const seenEmails = new Set();

        const initialEnrichedRows = validRows.map((row) => {
          const comp = row.companyName ? row.companyName.toLowerCase() : '';
          const phone = row.mobileNo ? normalizePhone(row.mobileNo) : '';
          const email = row.emailId ? row.emailId.toLowerCase() : '';

          let isDup = false;
          const reasons = [];

          if (comp && seenCompanies.has(comp)) {
            isDup = true;
            reasons.push('Duplicate Company in sheet');
          }
          if (phone && seenPhones.has(phone)) {
            isDup = true;
            reasons.push('Duplicate Mobile in sheet');
          }
          if (email && seenEmails.has(email)) {
            isDup = true;
            reasons.push('Duplicate Email in sheet');
          }

          if (comp) seenCompanies.add(comp);
          if (phone) seenPhones.add(phone);
          if (email) seenEmails.add(email);

          return {
            ...row,
            isDuplicate: isDup,
            duplicateReason: reasons.join(', '),
          };
        });

        // 2. Check against existing CRM leads database in batch
        let finalRows = initialEnrichedRows;
        try {
          const dupRes = await leadsService.checkDuplicatesBatch(validRows);
          if (dupRes?.success && Array.isArray(dupRes.results)) {
            const resultMap = new Map(dupRes.results.map((r) => [r.id, r]));
            finalRows = initialEnrichedRows.map((row) => {
              const res = resultMap.get(row.id);
              const beDup = Boolean(res?.isDuplicate);
              const inCrm = Boolean(res?.existsInCrm || res?.reason?.toLowerCase().includes('in crm'));
              const combinedReasons = [row.duplicateReason, res?.reason]
                .filter(Boolean)
                .join(', ');

              return {
                ...row,
                isDuplicate: row.isDuplicate || beDup,
                duplicateReason: combinedReasons,
                isConvertedToLead: inCrm,
                leadId: res?.leadId || null,
              };
            });
          }
        } catch (dupErr) {
          console.warn('Batch duplicate check against CRM DB failed, using sheet deduplication:', dupErr);
        }

        const dupCount = finalRows.filter((r) => r.isDuplicate).length;
        const newCount = finalRows.length - dupCount;

        // Store into staging area for preview before actual import
        setStagedData({
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          rows: finalRows,
          newCount,
          duplicateCount: dupCount,
        });
        setShowPreview(true);
        setPreviewTab(dupCount > 0 ? 'all' : 'new');

        if (dupCount > 0) {
          toast(
            `Duplicate check: ${newCount} new, ${dupCount} duplicate(s) flagged. Only new data will be uploaded.`,
            { icon: '⚠️', duration: 4000 }
          );
        } else {
          toast.success(`File ready: all ${newCount} rows are unique!`);
        }
      } catch (err) {
        console.error('Failed to parse Excel file:', err);
        toast.error('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };


  // Confirm Import from Staged Preview (only new records)
  const handleConfirmImport = (onlyNew = true) => {
    if (!stagedData || !stagedData.rows || stagedData.rows.length === 0) return;

    // Only upload / import new data
    const rowsToImport = onlyNew
      ? stagedData.rows.filter(r => !r.isDuplicate)
      : stagedData.rows;

    if (rowsToImport.length === 0) {
      toast.error('No new data to import. All rows are duplicates.');
      return;
    }

    setRecords(rowsToImport);
    setFileName(stagedData.fileName);
    setSelectedIds([]);
    setStagedData(null);
    toast.success(`Imported ${rowsToImport.length} new records into workspace.`);
  };

  // Cancel Staged File
  const handleCancelStaged = () => {
    setStagedData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Download Sample Template matching user's image headers
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'S No': 1,
        'Company Name': 'Infosys Limited',
        'Industry': 'Information Technology',
        'Address': 'Electronics City, Hosur Road, Bangalore',
        'Rating': '4.5',
        'contact person': 'Rahul Sharma',
        'Designation': 'VP Engineering',
        'mobile no': '+91 98765 43210',
        'Email ID': 'rahul.sharma@infosys.example',
        'Remarks': 'Interested in enterprise talent pipeline',
        'Date': new Date().toISOString().split('T')[0],
      },
      {
        'S No': 2,
        'Company Name': 'Tata Consultancy Services',
        'Industry': 'Consulting & IT',
        'Address': 'TCS House, Raveline Street, Fort, Mumbai',
        'Rating': '4.8',
        'contact person': 'Priya Nair',
        'Designation': 'Head of Talent Acquisition',
        'mobile no': '+91 98111 22334',
        'Email ID': 'priya.nair@tcs.example',
        'Remarks': 'Needs executive search services',
        'Date': new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');
    XLSX.writeFile(workbook, 'CRM_Import_Companies_Template.xlsx');
  };

  // Filter & Sort Logic for Active Records
  const filteredAndSortedRecords = useMemo(() => {
    const now = new Date();

    return records
      .filter((item) => {
        if (dateFilter !== 'all') {
          const itemDate = new Date(item.date);
          const diffMs = now.getTime() - itemDate.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);

          if (dateFilter === 'today') {
            const isSameDay =
              itemDate.getFullYear() === now.getFullYear() &&
              itemDate.getMonth() === now.getMonth() &&
              itemDate.getDate() === now.getDate();
            if (!isSameDay) return false;
          }
          if (dateFilter === '2days' && diffDays > 2) return false;
          if (dateFilter === '5days' && diffDays > 5) return false;
          if (dateFilter === 'custom') {
            const itemDateStr = itemDate.toISOString().split('T')[0];
            if (fromDate && itemDateStr < fromDate) return false;
            if (toDate && itemDateStr > toDate) return false;
          }
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCompany = item.companyName?.toLowerCase().includes(q);
          const matchPerson = item.contactPerson?.toLowerCase().includes(q);
          const matchEmail = item.emailId?.toLowerCase().includes(q);
          const matchMobile = item.mobileNo?.toLowerCase().includes(q);
          const matchIndustry = item.industry?.toLowerCase().includes(q);
          const matchAddress = item.address?.toLowerCase().includes(q);
          if (!matchCompany && !matchPerson && !matchEmail && !matchMobile && !matchIndustry && !matchAddress) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
      });
  }, [records, dateFilter, fromDate, toDate, searchQuery, sortDirection]);

  // Checkbox handlers
  const handleToggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const currentFilteredIds = filteredAndSortedRecords.map((r) => r.id);
    const allSelected = currentFilteredIds.length > 0 && currentFilteredIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentFilteredIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...currentFilteredIds]));
      setSelectedIds(merged);
    }
  };

  const nonDuplicateIds = useMemo(() => {
    return filteredAndSortedRecords.filter((r) => !r.isDuplicate).map((r) => r.id);
  }, [filteredAndSortedRecords]);

  const handleSelectOnlyNew = () => {
    setSelectedIds(nonDuplicateIds);
    toast.success(`Selected ${nonDuplicateIds.length} new records.`);
  };

  const isAllSelected =
    filteredAndSortedRecords.length > 0 &&
    filteredAndSortedRecords.every((r) => selectedIds.includes(r.id));

  // Send selected companies to Leads (skipping duplicates)
  const handleSendToLeads = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one company to send to Leads.');
      return;
    }

    const selectedRows = records.filter((r) => selectedIds.includes(r.id) && !r.isDuplicate);
    const skippedDups = selectedIds.length - selectedRows.length;

    if (selectedRows.length === 0) {
      toast.error('Selected records are duplicates and cannot be uploaded to Leads.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payloadRows = selectedRows.map((row) => {
        const contactName = (row.contactPerson || '').trim();
        const nameParts = contactName ? contactName.split(/\s+/) : [];
        const firstName = nameParts[0] || row.companyName || 'Lead';
        const lastName = nameParts.slice(1).join(' ') || '';

        const tags = [];
        if (row.industry) tags.push(row.industry);
        if (row.rating) tags.push(`Rating: ${row.rating}`);

        return {
          firstName,
          lastName,
          companyName: row.companyName || '',
          jobTitle: row.designation || '',
          phone: row.mobileNo || '',
          email: row.emailId || '',
          address: {
            street: row.address || '',
            country: 'India',
          },
          notes: [
            row.remarks,
            row.rating ? `Rating: ${row.rating}` : '',
            row.industry ? `Industry: ${row.industry}` : '',
          ]
            .filter(Boolean)
            .join(' | '),
          tags,
          source: 'Excel Import',
          date: row.date,
        };
      });

      const res = await dataService.importData({
        entityType: 'leads',
        rows: payloadRows,
      });

      if (res.success) {
        const sentIds = new Set(selectedRows.map((r) => r.id));
        setRecords((prev) =>
          prev.map((r) =>
            sentIds.has(r.id) ? { ...r, isConvertedToLead: true } : r
          )
        );

        toast.success(
          skippedDups > 0
            ? `Sent ${payloadRows.length} new companies to Leads! (${skippedDups} duplicates skipped)`
            : `Sent ${payloadRows.length} companies to Leads!`
        );

        // Remove imported items from local selection
        setSelectedIds([]);

        // Navigate directly to Leads tab after short feedback delay
        setTimeout(() => {
          if (onNavigate) {
            onNavigate('leads');
          } else {
            window.location.href = '/crm?tab=leads';
          }
        }, 1200);
      } else {
        toast.error(res.message || 'Failed to send companies to Leads.');
      }
    } catch (err) {
      console.error('Error sending companies to leads:', err);
      toast.error(err.response?.data?.message || err.message || 'Error sending to Leads.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert a single company to a Lead directly
  const handleConvertSingle = async (row) => {
    try {
      const contactName = (row.contactPerson || '').trim();
      const nameParts = contactName ? contactName.split(/\s+/) : [];
      const firstName = nameParts[0] || row.companyName || 'Lead';
      const lastName = nameParts.slice(1).join(' ') || '';

      const tags = [];
      if (row.industry) tags.push(row.industry);
      if (row.rating) tags.push(`Rating: ${row.rating}`);

      const leadPayload = {
        firstName,
        lastName,
        companyName: row.companyName || '',
        jobTitle: row.designation || '',
        phone: row.mobileNo || '',
        email: row.emailId || '',
        address: {
          street: row.address || '',
          country: 'India',
        },
        notes: [
          row.remarks,
          row.rating ? `Rating: ${row.rating}` : '',
          row.industry ? `Industry: ${row.industry}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
        tags,
        source: 'Excel Import',
        date: row.date,
      };

      const res = await leadsService.createLead(leadPayload);
      const newLeadId = res?.data?._id || res?._id;
      setRecords((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, isConvertedToLead: true, leadId: newLeadId, isDuplicate: false, duplicateReason: '' }
            : r
        )
      );
      toast.success(`"${row.companyName}" converted to Lead!`);
    } catch (err) {
      console.error('Error converting company to lead:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to convert to Lead.');
    }
  };

  // Move selected companies to Recycle Bin
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const selectedRows = records.filter((r) => selectedIds.includes(r.id));
    if (window.confirm(`Move ${count} selected ${count === 1 ? 'company' : 'companies'} to the Recycle Bin?`)) {
      try {
        await leadsService.moveToRecycleBin(selectedRows);
      } catch (err) {
        console.warn('Failed to sync soft delete with DB:', err);
      }
      setRecords((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
      setSelectedIds([]);
      toast.success(`${count} ${count === 1 ? 'company' : 'companies'} moved to Recycle Bin.`);
    }
  };

  // Move single row to Recycle Bin
  const handleDeleteSingle = async (id) => {
    const rowToDelete = records.find((r) => r.id === id);
    if (!rowToDelete) return;
    try {
      await leadsService.moveToRecycleBin([rowToDelete]);
    } catch (err) {
      console.warn('Failed to sync soft delete with DB:', err);
    }
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
    toast.success(`"${rowToDelete.companyName || 'Company'}" moved to Recycle Bin.`);
  };

  // Edit Row State & Handlers
  const [editingRow, setEditingRow] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleOpenEdit = (row) => {
    let dateInput = '';
    if (row.date) {
      try {
        dateInput = new Date(row.date).toISOString().split('T')[0];
      } catch {
        dateInput = '';
      }
    }
    setEditingRow({
      ...row,
      dateInput,
    });
  };

  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editingRow) return;

    const compName = (editingRow.companyName || '').trim();
    if (!compName) {
      toast.error('Company Name is required.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const contactName = (editingRow.contactPerson || '').trim();
      const nameParts = contactName ? contactName.split(/\s+/) : [];
      const firstName = nameParts[0] || compName || 'Lead';
      const lastName = nameParts.slice(1).join(' ') || '';

      const tags = [];
      if (editingRow.industry) tags.push(editingRow.industry);
      if (editingRow.rating) tags.push(`Rating: ${editingRow.rating}`);

      const finalDate = editingRow.dateInput
        ? new Date(editingRow.dateInput).toISOString()
        : editingRow.date || new Date().toISOString();

      const leadPayload = {
        firstName,
        lastName,
        companyName: compName,
        jobTitle: (editingRow.designation || '').trim(),
        phone: (editingRow.mobileNo || '').trim(),
        email: (editingRow.emailId || '').trim(),
        address: {
          street: (editingRow.address || '').trim(),
          city: '',
          state: '',
          country: 'India',
          postalCode: '',
        },
        notes: [
          editingRow.remarks,
          editingRow.rating ? `Rating: ${editingRow.rating}` : '',
          editingRow.industry ? `Industry: ${editingRow.industry}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
        tags,
        source: 'Excel Import',
        date: finalDate,
      };

      let savedLeadId = editingRow.leadId || editingRow._id;

      if (savedLeadId) {
        // Lead already persisted in DB - update it
        await leadsService.updateLead(savedLeadId, leadPayload);
        toast.success(`Updated "${compName}" in Database!`);
      } else {
        // Create new lead in CRM database
        const res = await leadsService.createLead(leadPayload);
        if (res?.data?._id || res?._id) {
          savedLeadId = res.data?._id || res._id;
        }
        toast.success(`Saved "${compName}" to Database successfully!`);
      }

      // Update in active workspace records
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingRow.id
            ? {
              ...r,
              companyName: compName,
              contactPerson: (editingRow.contactPerson || '').trim(),
              designation: (editingRow.designation || '').trim(),
              mobileNo: (editingRow.mobileNo || '').trim(),
              emailId: (editingRow.emailId || '').trim(),
              industry: (editingRow.industry || '').trim(),
              rating: (editingRow.rating || '').trim(),
              address: (editingRow.address || '').trim(),
              remarks: (editingRow.remarks || '').trim(),
              date: finalDate,
              leadId: savedLeadId,
              isConvertedToLead: true,
              isDuplicate: false, // successfully edited and saved to DB
              duplicateReason: '',
            }
            : r
        )
      );

      // Also update in stagedData if editing a staged preview row
      if (stagedData?.rows) {
        setStagedData((prev) => {
          if (!prev) return null;
          const updatedRows = prev.rows.map((r) =>
            r.id === editingRow.id
              ? {
                ...r,
                companyName: compName,
                contactPerson: (editingRow.contactPerson || '').trim(),
                designation: (editingRow.designation || '').trim(),
                mobileNo: (editingRow.mobileNo || '').trim(),
                emailId: (editingRow.emailId || '').trim(),
                industry: (editingRow.industry || '').trim(),
                rating: (editingRow.rating || '').trim(),
                address: (editingRow.address || '').trim(),
                remarks: (editingRow.remarks || '').trim(),
                date: finalDate,
                leadId: savedLeadId,
                isDuplicate: false,
                duplicateReason: '',
              }
              : r
          );
          const dupCount = updatedRows.filter((r) => r.isDuplicate).length;
          return {
            ...prev,
            rows: updatedRows,
            newCount: updatedRows.length - dupCount,
            duplicateCount: dupCount,
          };
        });
      }

      setEditingRow(null);
    } catch (err) {
      console.error('Failed to Save:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save to Database.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            <span>Import Data</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Select Excel file, preview extracted rows, import to workspace, sort/filter by date, and send to Leads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
              e.target.value = '';
            }}
          />

          <Button
            size="sm"
            variant="primary"
            icon={Upload}
            onClick={() => fileInputRef.current?.click()}
            title="Import Excel or CSV file"
          >
            Import
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={Download}
            onClick={handleDownloadTemplate}
            title="Download sample Excel file with exact header structure"
          >
            Sample Template
          </Button>
        </div>
      </div>



      {/* 2. File Selected - PREVIEW STAGE & IMPORT CONFIRMATION */}
      {stagedData && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden p-6 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{stagedData.fileName}</h3>
                  <Badge variant="blue" size="sm">
                    {stagedData.rows.length} total
                  </Badge>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    {stagedData.newCount} new
                  </span>
                  {stagedData.duplicateCount > 0 && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                      title="Duplicate company name, mobile, or email"
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-500" />
                      {stagedData.duplicateCount} duplicate(s) skipped
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  File Size: {stagedData.fileSize} • Duplicates are detected by company name, mobile, and email. Only new rows will upload.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                icon={showPreview ? EyeOff : Eye}
                onClick={() => setShowPreview((prev) => !prev)}
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>

              <Button
                size="sm"
                variant="secondary"
                icon={X}
                onClick={handleCancelStaged}
              >
                Cancel
              </Button>

              <Button
                size="sm"
                variant="primary"
                icon={CheckCircle2}
                disabled={stagedData.newCount === 0}
                onClick={() => handleConfirmImport(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs disabled:opacity-50"
              >
                {stagedData.newCount > 0
                  ? `Import New Data (${stagedData.newCount} rows)`
                  : 'No New Data (All Duplicates)'}
              </Button>
            </div>
          </div>

          {/* Preview Table */}
          {showPreview && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    Excel Preview ({visibleStagedRows.length} rows)
                  </span>

                  {/* Filter tabs inside preview */}
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('all')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition ${previewTab === 'all'
                        ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      All ({stagedData.rows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('new')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition ${previewTab === 'new'
                        ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                        : 'text-emerald-700 hover:text-emerald-900'
                        }`}
                    >
                      New ({stagedData.newCount})
                    </button>
                    {stagedData.duplicateCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setPreviewTab('duplicates')}
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition ${previewTab === 'duplicates'
                          ? 'bg-rose-600 text-white shadow-2xs font-bold'
                          : 'text-rose-700 hover:text-rose-900'
                          }`}
                      >
                        Duplicates ({stagedData.duplicateCount})
                      </button>
                    )}
                  </div>
                </div>

                <span className="text-[11px] text-slate-500 font-medium">
                  {stagedData.duplicateCount > 0
                    ? `⚠️ ${stagedData.duplicateCount} duplicate(s) will NOT be imported. Only new unique data will upload.`
                    : 'All records are unique and ready to upload.'}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200/90 max-h-[350px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 text-center w-12 whitespace-nowrap">#</th>
                      <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Company Name</th>
                      <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Industry</th>
                      <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Address</th>
                      <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Rating</th>
                      <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Contact Person</th>
                      <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Designation</th>
                      <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Mobile No</th>
                      <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Email ID</th>
                      <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Remarks</th>
                      <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Date</th>
                      <th className="p-2.5 border-l border-slate-200 whitespace-nowrap text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleStagedRows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-slate-400">
                          No {previewTab} records to display in this sheet.
                        </td>
                      </tr>
                    ) : (
                      visibleStagedRows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`transition-colors ${row.isDuplicate ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50'
                            }`}
                        >
                          <td className="p-2.5 text-center font-semibold text-slate-500 whitespace-nowrap">
                            {idx + 1}
                          </td>
                          <td className="p-2.5 border-l border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{row.companyName || '—'}</span>
                              {row.isConvertedToLead || row.duplicateReason?.toLowerCase().includes('in crm') ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 ml-1 shrink-0 shadow-2xs"
                                  title="Converted to Lead in CRM"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Converted to Lead
                                </span>
                              ) : row.isDuplicate ? (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 ml-1 shrink-0"
                                  title={row.duplicateReason || 'Duplicate found'}
                                >
                                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                                  Duplicate
                                </span>
                              ) : null}
                            </div>
                            {row.isDuplicate && !row.isConvertedToLead && !row.duplicateReason?.toLowerCase().includes('in crm') && row.duplicateReason && (
                              <div className="text-[10px] text-rose-600 font-normal mt-0.5">
                                {row.duplicateReason}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-700 whitespace-nowrap">{row.industry || '—'}</td>
                          <td className="p-2.5 text-slate-600 max-w-xs truncate">{row.address || '—'}</td>
                          <td className="p-2.5 text-slate-800 whitespace-nowrap">{row.rating || '—'}</td>
                          <td className="p-2.5 font-semibold text-slate-800 whitespace-nowrap">{row.contactPerson || '—'}</td>
                          <td className="p-2.5 text-slate-600 whitespace-nowrap">{row.designation || '—'}</td>
                          <td className="p-2.5 text-slate-700 whitespace-nowrap font-mono">{row.mobileNo || '—'}</td>
                          <td className="p-2.5 text-slate-700 whitespace-nowrap font-mono">{row.emailId || '—'}</td>
                          <td className="p-2.5 text-slate-500 max-w-xs truncate">{row.remarks || '—'}</td>
                          <td className="p-2.5 text-slate-600 whitespace-nowrap font-medium">
                            {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                          </td>
                          <td className="p-2.5 border-l border-slate-200 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(row)}
                              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                              title="Edit all fields & Save"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  variant="primary"
                  icon={CheckCircle2}
                  disabled={stagedData.newCount === 0}
                  onClick={() => handleConfirmImport(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {stagedData.newCount > 0
                    ? `Confirm & Import New Data (${stagedData.newCount} rows)`
                    : 'No New Data (All Duplicates)'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. ACTIVE IMPORTED WORKSPACE (Once imported or ready) */}
      {(!stagedData || records.length > 0) && (
        <div className="space-y-4">
          {/* Controls Bar: Date Filter + Sort Arrow + Search + Send to Leads Action */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left Filter Options: Date Filter + Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date Filter:
              </span>

              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'today', label: 'Today' },
                  { id: '2days', label: 'Last 2 Days' },
                  { id: '5days', label: 'Last 5 Days' },
                  { id: 'custom', label: 'Custom' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDateFilter(item.id)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${dateFilter === item.id
                      ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {dateFilter === 'custom' && (
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-xs">
                  <span className="text-[11px] font-medium text-slate-500">From:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] font-medium text-slate-500">To:</span>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(e) => setToDate(e.target.value)}
                    className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {(fromDate || toDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFromDate('');
                        setToDate('');
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-700 px-1 font-semibold"
                      title="Clear date range"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

              {/* Date Sort Toggle Button */}
              <button
                type="button"
                onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-2xs"
                title={`Currently sorted ${sortDirection === 'desc' ? 'Descending' : 'Ascending'}. Click to toggle.`}
              >
                <span>Date:</span>
                {sortDirection === 'desc' ? (
                  <>
                    <span className="text-indigo-600 font-bold">Newest First</span>
                    <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                  </>
                ) : (
                  <>
                    <span className="text-indigo-600 font-bold">Oldest First</span>
                    <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                  </>
                )}
              </button>

              {/* Search Bar */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search company, person..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Right Action: Delete Selected + Send to Leads */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-slate-500 font-medium mr-1">
                Showing <strong className="text-slate-800">{filteredAndSortedRecords.length}</strong> of{' '}
                <strong className="text-slate-800">{records.length}</strong> | Selected:{' '}
                <strong className="text-indigo-600">{selectedIds.length}</strong>
              </span>

              {records.some((r) => r.isDuplicate) && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={CheckCircle2}
                  onClick={handleSelectOnlyNew}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs"
                  title="Select only unique non-duplicate records"
                >
                  Select Only New ({nonDuplicateIds.length})
                </Button>
              )}

              {selectedIds.length > 0 && (
                <Button
                  size="sm"
                  variant="danger"
                  icon={Trash2}
                  onClick={handleDeleteSelected}
                  className="shadow-sm"
                  title="Move selected companies to Recycle Bin"
                >
                  Delete Selected ({selectedIds.length})
                </Button>
              )}

              <Button
                size="sm"
                variant="primary"
                icon={Send}
                disabled={selectedIds.length === 0}
                isLoading={isSubmitting}
                onClick={handleSendToLeads}
                className="shadow-sm"
              >
                Send to Leads ({selectedIds.length})
              </Button>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left border-collapse text-xs">
                {/* Grey Table Header */}
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                        title="Select/Deselect All Visible"
                      />
                    </th>
                    <th className="p-3 border-l border-slate-200 text-center w-12 whitespace-nowrap">S.NO</th>
                    <th className="p-3 border-l border-slate-200 whitespace-nowrap">Company Name</th>
                    <th className="p-3 border-l border-slate-200 whitespace-nowrap">Industry</th>
                    <th className="p-3 border-l border-slate-200 whitespace-nowrap">Address</th>
                    <th className="p-3 border-l border-slate-200 whitespace-nowrap">Rating</th>
                    <th className="p-3 border-l border-slate-200 whitespace-nowrap">Contact Person</th>
                    <th className="p-3 border-l border-slate-200 whitespace-nowrap">Designation</th>
                    <th className="p-3 border-l border-slate-200 whitespace-nowrap">Mobile No</th>
                    <th className="p-3 border-l border-slate-200 whitespace-nowrap">Email ID</th>
                    <th className="p-3 border-l border-slate-200 whitespace-nowrap">Remarks</th>
                    <th
                      className="p-3 border-l border-slate-200 whitespace-nowrap cursor-pointer select-none hover:bg-slate-200 transition-colors"
                      onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                      title="Click to toggle Date Sort Ascending/Descending"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Date</span>
                        {sortDirection === 'desc' ? (
                          <ArrowDown className="w-3.5 h-3.5 text-slate-700 font-bold" />
                        ) : (
                          <ArrowUp className="w-3.5 h-3.5 text-slate-700 font-bold" />
                        )}
                      </div>
                    </th>
                    <th className="p-3 border-l border-slate-200 text-center w-24 whitespace-nowrap">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                          <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                          <p className="font-semibold text-slate-600">
                            {records.length === 0
                              ? 'No imported records yet'
                              : 'No records match the current filter'}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {records.length === 0
                              ? 'Click the "Import" button above to select and load an Excel file.'
                              : 'Try resetting the date filter or search query.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedRecords.map((row, idx) => {
                      const isSelected = selectedIds.includes(row.id);
                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/40' : ''
                            }`}
                          onClick={() => handleToggleRow(row.id)}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRow(row.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                            />
                          </td>
                          <td className="p-3 border-l border-slate-200 text-center font-semibold text-slate-500 whitespace-nowrap">
                            {idx + 1}
                          </td>
                          <td className="p-3 border-l border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{row.companyName || '—'}</span>
                              {row.isConvertedToLead || row.duplicateReason?.toLowerCase().includes('in crm') ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 ml-1.5 shrink-0 shadow-2xs"
                                  title="Converted to Lead in CRM"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Converted to Lead
                                </span>
                              ) : row.isDuplicate ? (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 ml-1 shrink-0"
                                  title={row.duplicateReason || 'Duplicate found'}
                                >
                                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                                  Duplicate
                                </span>
                              ) : null}
                            </div>
                            {row.isDuplicate && !row.isConvertedToLead && !row.duplicateReason?.toLowerCase().includes('in crm') && row.duplicateReason && (
                              <div className="text-[10px] text-rose-600 font-normal mt-0.5">
                                {row.duplicateReason}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-slate-700 whitespace-nowrap">
                            {row.industry ? (
                              <Badge variant="neutral" size="sm">
                                {row.industry}
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-3 text-slate-600 max-w-xs truncate" title={row.address}>
                            {row.address || '—'}
                          </td>
                          <td className="p-3 text-slate-800 whitespace-nowrap font-semibold">
                            {row.rating ? (
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                ★ {row.rating}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">
                            {row.contactPerson || '—'}
                          </td>
                          <td className="p-3 text-slate-600 whitespace-nowrap">{row.designation || '—'}</td>
                          <td className="p-3 text-slate-700 whitespace-nowrap font-mono">{row.mobileNo || '—'}</td>
                          <td className="p-3 text-slate-700 whitespace-nowrap font-mono">{row.emailId || '—'}</td>
                          <td className="p-3 text-slate-500 max-w-xs truncate" title={row.remarks}>
                            {row.remarks || '—'}
                          </td>
                          <td className="p-3 text-slate-600 whitespace-nowrap font-medium">
                            {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {!row.isConvertedToLead && !row.duplicateReason?.toLowerCase().includes('in crm') && (
                                <button
                                  type="button"
                                  onClick={() => handleConvertSingle(row)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                                  title="Convert to CRM Lead"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(row)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                title="Edit all fields & Save"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSingle(row.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Move this company to Recycle Bin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
              <span>
                Tip: Click any row to select. Click the <strong>Date</strong> header to toggle Ascending / Descending order.
              </span>
              <span className="font-medium">
                {selectedIds.length} of {records.length} selected
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Company Details Modal */}
      {editingRow && (
        <Modal
          isOpen={Boolean(editingRow)}
          onClose={() => !isSavingEdit && setEditingRow(null)}
          title={`Edit Company: ${editingRow.companyName || 'Lead'}`}
          subtitle="Update any details below and click 'Save' to persist directly to the CRM database."
          maxWidth="max-w-2xl"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingRow(null)}
                disabled={isSavingEdit}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                icon={Save}
                isLoading={isSavingEdit}
                onClick={handleSaveEdit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
              >
                Save
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company Name"
                required
                value={editingRow.companyName || ''}
                onChange={(e) =>
                  setEditingRow((prev) => ({ ...prev, companyName: e.target.value }))
                }
                placeholder="e.g. Acme Corp"
              />

              <Input
                label="Contact Person"
                value={editingRow.contactPerson || ''}
                onChange={(e) =>
                  setEditingRow((prev) => ({ ...prev, contactPerson: e.target.value }))
                }
                placeholder="e.g. John Doe"
              />

              <Input
                label="Designation"
                value={editingRow.designation || ''}
                onChange={(e) =>
                  setEditingRow((prev) => ({ ...prev, designation: e.target.value }))
                }
                placeholder="e.g. VP Engineering"
              />

              <Input
                label="Mobile No"
                value={editingRow.mobileNo || ''}
                onChange={(e) =>
                  setEditingRow((prev) => ({ ...prev, mobileNo: e.target.value }))
                }
                placeholder="e.g. +91 98765 43210"
              />

              <Input
                label="Email ID"
                type="email"
                value={editingRow.emailId || ''}
                onChange={(e) =>
                  setEditingRow((prev) => ({ ...prev, emailId: e.target.value }))
                }
                placeholder="e.g. contact@example.com"
              />

              <Input
                label="Industry"
                value={editingRow.industry || ''}
                onChange={(e) =>
                  setEditingRow((prev) => ({ ...prev, industry: e.target.value }))
                }
                placeholder="e.g. Information Technology"
              />

              <Input
                label="Rating"
                value={editingRow.rating || ''}
                onChange={(e) =>
                  setEditingRow((prev) => ({ ...prev, rating: e.target.value }))
                }
                placeholder="e.g. 4.5"
              />

              <Input
                label="Date"
                type="date"
                value={editingRow.dateInput || ''}
                onChange={(e) =>
                  setEditingRow((prev) => ({ ...prev, dateInput: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Address
              </label>
              <textarea
                rows={2}
                value={editingRow.address || ''}
                onChange={(e) =>
                  setEditingRow((prev) => ({ ...prev, address: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                placeholder="Full address or location..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Remarks / Notes
              </label>
              <textarea
                rows={2}
                value={editingRow.remarks || ''}
                onChange={(e) =>
                  setEditingRow((prev) => ({ ...prev, remarks: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                placeholder="Additional notes or remarks..."
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
