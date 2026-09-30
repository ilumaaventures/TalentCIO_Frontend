import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
  Database,
  RefreshCw,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { dataService, leadsService, adminService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const STORAGE_KEY = 'crm_imported_excel_records';

// Module-level helper: extract last 10 digits of a phone number for normalised comparison.
// Defined here (not inside a handler) so all functions in this file can use it.
const normalizePhone = (p) => {
  if (!p) return '';
  const digits = String(p).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

export const ImportDataPage = ({ onNavigate }) => {
  const { user } = useAuth();
  const currentUserName = useMemo(() => {
    if (!user) return 'Admin';
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return fullName || user.name || user.email || 'Admin';
  }, [user]);

  const canViewAll = useMemo(() => {
    if (!user) return false;
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const hasAdminRole = roles.some((r) => {
      const name = typeof r === 'string' ? r : r?.name;
      return ['Admin', 'Super Admin', 'System Admin'].includes(name) || r?.isSystem;
    });
    if (hasAdminRole) return true;
    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    return perms.includes('*') || perms.includes('crm.data.view_all');
  }, [user]);

  const userStorageKey = useMemo(() => {
    return user?._id ? `${STORAGE_KEY}_${user._id}` : STORAGE_KEY;
  }, [user?._id]);

  const [records, setRecords] = useState(() => {
    try {
      const roles = Array.isArray(user?.roles) ? user.roles : [];
      const hasAdminRole = roles.some((r) => {
        const name = typeof r === 'string' ? r : r?.name;
        return ['Admin', 'Super Admin', 'System Admin'].includes(name) || r?.isSystem;
      });
      const perms = Array.isArray(user?.permissions) ? user.permissions : [];
      const canSeeAll = hasAdminRole || perms.includes('*') || perms.includes('crm.data.view_all');
      if (!canSeeAll) {
        // Restricted users must start with empty local state until server returns their records
        return [];
      }
      const key = user?._id ? `${STORAGE_KEY}_${user._id}` : STORAGE_KEY;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Purge any leaked un-namespaced or admin records from restricted user's localStorage
  useEffect(() => {
    if (!canViewAll) {
      try {
        localStorage.removeItem(STORAGE_KEY);
        if (user?._id) {
          const userKey = `${STORAGE_KEY}_${user._id}`;
          const saved = localStorage.getItem(userKey);
          if (saved) {
            const list = JSON.parse(saved);
            const myName = (user.name || `${user.firstName || ''} ${user.lastName || ''}`).trim().toLowerCase();
            const myId = String(user._id);
            const filtered = list.filter((r) => {
              const recUser = (r.importedBy || '').trim().toLowerCase();
              const recUserId = r.importedByUserId ? String(r.importedByUserId) : '';
              return (myId && recUserId === myId) || (myName && recUser === myName);
            });
            if (filtered.length !== list.length) {
              if (filtered.length > 0) {
                localStorage.setItem(userKey, JSON.stringify(filtered));
              } else {
                localStorage.removeItem(userKey);
              }
              setRecords(filtered);
            }
          }
        }
      } catch (e) {
        console.warn(e);
      }
    }
  }, [canViewAll, user?._id, user?.name, user?.firstName, user?.lastName]);

  const [fileName, setFileName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortDirection, setSortDirection] = useState('desc'); // 'desc' | 'asc'
  const [dateFilter, setDateFilter] = useState('today'); // 'all' | 'today' | '2days' | '5days' | 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination state (default: 50, options: 50, 80, 100)
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [showConvertedOnly, setShowConvertedOnly] = useState(false);

  // Expanded remarks state (row ID -> boolean) to dynamically expand row height
  const [expandedRemarks, setExpandedRemarks] = useState({});

  const toggleExpandRemark = (rowId) => {
    setExpandedRemarks((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  // Imported By User Filter state (Active users only, multi-select with search)
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]); // array of selected user names
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userFilterSearch, setUserFilterSearch] = useState('');
  const userDropdownRef = useRef(null);

  // Staging state for File Preview before actual import
  const [stagedData, setStagedData] = useState(null); // { fileName, fileSize, rows: [], newCount, updateCount, duplicateCount }
  const [showPreview, setShowPreview] = useState(true);
  const [previewTab, setPreviewTab] = useState('all'); // 'all' | 'new' | 'update' | 'duplicates'

  const fileInputRef = useRef(null);

  // Filtered rows for the preview table
  const visibleStagedRows = useMemo(() => {
    if (!stagedData?.rows) return [];
    if (previewTab === 'new') return stagedData.rows.filter((r) => r.rowType === 'new');
    if (previewTab === 'update') return stagedData.rows.filter((r) => r.rowType === 'update');
    if (previewTab === 'duplicates') return stagedData.rows.filter((r) => r.rowType === 'duplicate');
    return stagedData.rows;
  }, [stagedData, previewTab]);

  // Persist records to localStorage (scoped per user)
  useEffect(() => {
    try {
      if (records.length > 0) {
        localStorage.setItem(userStorageKey, JSON.stringify(records));
      } else {
        localStorage.removeItem(userStorageKey);
      }
    } catch (e) {
      console.error('Failed to save imported records in localStorage', e);
    }
  }, [records, userStorageKey]);

  // Load active company users for "Imported By" filter (strictly exclude inactive users)
  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      try {
        const res = await adminService.getUsers();
        if (res?.success && Array.isArray(res.data) && isMounted) {
          // Strictly exclude inactive users
          const activeList = res.data.filter(
            (u) => u.status === 'active' || u.isActive === true || (u.status !== 'inactive' && u.isActive !== false)
          );
          setAvailableUsers(activeList);
        }
      } catch (err) {
        console.warn('Failed to load active users for Imported By filter:', err);
      }
    };
    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle clicking outside user filter dropdown to close it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    if (isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserDropdownOpen]);

  // Consolidated list of active users available to filter (strictly active only)
  const activeUserOptions = useMemo(() => {
    const userMap = new Map();

    // 1. Add strictly active users from API
    availableUsers.forEach((u) => {
      const name = (u.name || `${u.firstName || ''} ${u.lastName || ''}`).trim();
      if (name) {
        userMap.set(name.toLowerCase(), {
          id: u._id || name,
          name,
          email: u.email || '',
        });
      }
    });

    // 2. Ensure current logged-in user is in the options
    if (currentUserName && currentUserName !== 'Admin') {
      if (!userMap.has(currentUserName.toLowerCase())) {
        userMap.set(currentUserName.toLowerCase(), {
          id: user?._id || currentUserName,
          name: currentUserName,
          email: user?.email || '',
        });
      }
    }

    return Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [availableUsers, currentUserName, user]);

  // Filter active users inside dropdown search bar
  const filteredUserOptions = useMemo(() => {
    if (!userFilterSearch.trim()) return activeUserOptions;
    const q = userFilterSearch.toLowerCase();
    return activeUserOptions.filter(
      (u) => u.name.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q))
    );
  }, [activeUserOptions, userFilterSearch]);

  // Multi-select handlers for Imported By
  const handleToggleUser = (userName) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userName)) {
        return prev.filter((n) => n !== userName);
      } else {
        return [...prev, userName];
      }
    });
  };

  const handleSelectAllUsers = () => {
    setSelectedUsers(activeUserOptions.map((u) => u.name));
  };

  const handleClearUsers = () => {
    setSelectedUsers([]);
  };

  // Fetch active import data from server and reconcile with workspace
  const syncWithServer = useCallback(async () => {
    try {
      const res = await dataService.getImportData();
      if (res?.success && Array.isArray(res.data)) {
        const serverRows = res.data;
        setRecords((prevRecords) => {
          // For restricted users, serverRows returned by backend is strictly the source of truth.
          // Never auto-push old localStorage records to the server!
          if (!canViewAll) {
            return serverRows.map((s) => ({
              ...s,
              importedBy: s.importedBy || currentUserName,
            }));
          }

          // If server has 0 records but local has records, sync local records up to server (admin only)
          if (serverRows.length === 0 && prevRecords.length > 0) {
            dataService.syncImportData(prevRecords).catch(console.warn);
            return prevRecords;
          }

          // If local has 0 records and server has records, load server records
          if (prevRecords.length === 0 && serverRows.length > 0) {
            return serverRows.map((s) => ({
              ...s,
              importedBy: s.importedBy || currentUserName,
            }));
          }

          const localIdSet = new Set(prevRecords.map((r) => r.id));
          const localKeySet = new Set(
            prevRecords.map((r) =>
              [
                (r.companyName || '').trim().toLowerCase(),
                (r.contactPerson || '').trim().toLowerCase(),
                (r.mobileNo || '').trim(),
                (r.emailId || '').trim().toLowerCase(),
              ].join('|')
            )
          );

          const serverKeyMap = new Map();
          serverRows.forEach((sRow) => {
            const key = [
              (sRow.companyName || '').trim().toLowerCase(),
              (sRow.contactPerson || '').trim().toLowerCase(),
              (sRow.mobileNo || '').trim(),
              (sRow.emailId || '').trim().toLowerCase(),
            ].join('|');
            serverKeyMap.set(key, sRow);
          });

          // Items restored from Recycle Bin on server that are currently missing locally
          const restoredRows = serverRows
            .filter((sRow) => {
              const key = [
                (sRow.companyName || '').trim().toLowerCase(),
                (sRow.contactPerson || '').trim().toLowerCase(),
                (sRow.mobileNo || '').trim(),
                (sRow.emailId || '').trim().toLowerCase(),
              ].join('|');
              return !localIdSet.has(sRow.id) && !localKeySet.has(key);
            })
            .map((s) => ({
              ...s,
              importedBy: s.importedBy || currentUserName,
            }));

          // Update existing rows with latest lead conversion state from server
          const updatedPrev = prevRecords.map((r) => {
            const key = [
              (r.companyName || '').trim().toLowerCase(),
              (r.contactPerson || '').trim().toLowerCase(),
              (r.mobileNo || '').trim(),
              (r.emailId || '').trim().toLowerCase(),
            ].join('|');
            const sMatch = serverKeyMap.get(key) || serverRows.find((s) => s.id === r.id);
            if (sMatch) {
              const isConverted = Boolean(sMatch.isConvertedToLead);
              return {
                ...r,
                isConvertedToLead: isConverted,
                leadId: isConverted ? (sMatch.leadId || r.leadId) : null,
                duplicateReason: isConverted ? r.duplicateReason : '',
                importedBy: sMatch.importedBy || r.importedBy || currentUserName,
              };
            }
            return {
              ...r,
              importedBy: r.importedBy || currentUserName,
            };
          });

          if (restoredRows.length > 0) {
            return [...restoredRows, ...updatedPrev];
          }
          return updatedPrev;
        });
      }
    } catch (err) {
      console.warn('Failed to sync import data from server:', err);
    }
  }, [canViewAll, currentUserName, user?._id]);

  // Verify lead status against CRM database
  const verifyLeadsStatus = useCallback(async (currentRecords) => {
    if (!currentRecords || currentRecords.length === 0) return;
    try {
      const dupRes = await leadsService.checkDuplicatesBatch(currentRecords);
      if (dupRes?.success && Array.isArray(dupRes.results)) {
        const leadMap = new Map(dupRes.results.map((r) => [r.id, r]));
        setRecords((prev) =>
          prev.map((row) => {
            const res = leadMap.get(row.id);
            if (!res) return row;
            const inCrm = Boolean(res.existsInCrm);
            return {
              ...row,
              isConvertedToLead: inCrm,
              leadId: inCrm ? (res.leadId || row.leadId) : null,
              duplicateReason: inCrm ? (row.duplicateReason || 'In CRM') : '',
            };
          })
        );
      }
    } catch (err) {
      console.warn('Failed to verify converted leads against CRM database:', err);
    }
  }, []);

  useEffect(() => {
    syncWithServer();
    const handleFocus = () => {
      syncWithServer();
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          verifyLeadsStatus(parsed);
        }
      } catch (e) {
        console.warn(e);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [syncWithServer, verifyLeadsStatus]);

  useEffect(() => {
    if (records && records.length > 0) {
      verifyLeadsStatus(records);
    }
  }, [verifyLeadsStatus]);

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
          // New columns: status and source
          const leadStatus = normalized['status'] || normalized['leadstatus'] || '';
          const source = normalized['source'] || normalized['leadsource'] || normalized['origin'] || '';

          // Look for date in row
          let dateVal = normalized['date'] || normalized['createddate'] || normalized['entrydate'] || normalized['importdate'];
          const dateObj = parseRowDate(dateVal);

          // FIX #3: Build a deterministic stable ID from content so the same company
          // always gets the same rowId across separate imports. This allows
          // syncImportData (server-side upsert) to find and update the existing DB
          // document rather than always inserting a new one.
          const stableKey = [
            String(companyName).trim().toLowerCase(),
            String(mobileNo).trim().replace(/\D/g, '').slice(-10),
            String(emailId).trim().toLowerCase(),
          ].join('|');
          // btoa may not be available in all environments; use a simple hash fallback
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
            industry: String(industry).trim(),
            address: String(address).trim(),
            rating: String(rating).trim(),
            contactPerson: String(contactPerson).trim(),
            designation: String(designation).trim(),
            mobileNo: String(mobileNo).trim(),
            emailId: String(emailId).trim(),
            remarks: String(remarks).trim(),
            status: String(leadStatus).trim(),
            source: String(source).trim(),
            date: dateObj.toISOString(),
            importedBy: currentUserName,
          };
        });

        // Filter out empty rows where companyName, contactPerson, mobileNo, and emailId are missing
        const validRows = parsedRows.filter((r) => r.companyName || r.contactPerson || r.mobileNo || r.emailId);

        if (validRows.length === 0) {
          toast.error('No valid company or contact data found in the file.');
          return;
        }

        // 1. Intra-sheet duplicate detection by companyName, mobileNo, emailId
        const seenCompanies = new Set();
        const seenPhones = new Set();
        const seenEmails = new Set();

        const initialEnrichedRows = validRows.map((row) => {
          const comp = row.companyName ? row.companyName.toLowerCase() : '';
          const phone = row.mobileNo ? normalizePhone(row.mobileNo) : '';
          const email = row.emailId ? row.emailId.toLowerCase() : '';

          let isSheetDup = false;
          const reasons = [];

          if (comp && seenCompanies.has(comp)) {
            isSheetDup = true;
            reasons.push('Duplicate Company in sheet');
          }
          if (phone && seenPhones.has(phone)) {
            isSheetDup = true;
            reasons.push('Duplicate Mobile in sheet');
          }
          if (email && seenEmails.has(email)) {
            isSheetDup = true;
            reasons.push('Duplicate Email in sheet');
          }

          if (comp) seenCompanies.add(comp);
          if (phone) seenPhones.add(phone);
          if (email) seenEmails.add(email);

          return {
            ...row,
            isSheetDup,
            duplicateReason: reasons.join(', '),
          };
        });

        // 2. Build index of existing workspace records
        const existingCompMap = new Map();
        const existingPhoneMap = new Map();
        const existingEmailMap = new Map();

        (records || []).forEach((r) => {
          const comp = (r.companyName || '').trim().toLowerCase();
          const phone = normalizePhone(r.mobileNo);
          const email = (r.emailId || '').trim().toLowerCase();
          if (comp && !existingCompMap.has(comp)) existingCompMap.set(comp, r);
          if (phone && !existingPhoneMap.has(phone)) existingPhoneMap.set(phone, r);
          if (email && !existingEmailMap.has(email)) existingEmailMap.set(email, r);
        });

        // 3. Check against existing CRM leads database in batch & classify rows
        let finalRows = initialEnrichedRows;
        try {
          const dupRes = await leadsService.checkDuplicatesBatch(validRows);
          const crmResultMap = (dupRes?.success && Array.isArray(dupRes.results))
            ? new Map(dupRes.results.map((r) => [r.id, r]))
            : new Map();

          finalRows = initialEnrichedRows.map((row) => {
            const comp = row.companyName ? row.companyName.toLowerCase() : '';
            const phone = row.mobileNo ? normalizePhone(row.mobileNo) : '';
            const email = row.emailId ? row.emailId.toLowerCase() : '';

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

            // Case B: Existing record in CRM or in workspace (Update)
            const crmRes = crmResultMap.get(row.id);
            const inCrm = Boolean(crmRes?.existsInCrm || crmRes?.reason?.toLowerCase().includes('in crm'));
            const matchedWorkspaceRec =
              (comp && existingCompMap.get(comp)) ||
              (phone && existingPhoneMap.get(phone)) ||
              (email && existingEmailMap.get(email)) ||
              null;

            if (inCrm || matchedWorkspaceRec) {
              const leadId = crmRes?.leadId || matchedWorkspaceRec?.leadId || null;
              const isConverted = inCrm || Boolean(matchedWorkspaceRec?.isConvertedToLead);
              const updateReason = inCrm
                ? 'Matches existing Lead in CRM'
                : 'Matches existing record in workspace';

              return {
                ...row,
                rowType: 'update',
                isDuplicate: false,
                // FIX #5: explicitly carry isUpdate:true so the backend importData
                // handler knows to run the update path instead of silently skipping.
                isUpdate: true,
                isNew: false,
                duplicateReason: '',
                updateReason,
                isConvertedToLead: isConverted,
                leadId,
                existingRecordId: matchedWorkspaceRec?.id || null,
              };
            }

            // Case C: New unique row
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
              return {
                ...row,
                rowType: 'update',
                isDuplicate: false,
                isUpdate: true,
                isNew: false,
                isConvertedToLead: Boolean(matchedWorkspaceRec.isConvertedToLead),
                leadId: matchedWorkspaceRec.leadId || null,
                existingRecordId: matchedWorkspaceRec.id || null,
                updateReason: 'Matches existing record in workspace',
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

        // Store into staging area for preview before actual import
        setStagedData({
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          rows: finalRows,
          newCount,
          updateCount,
          duplicateCount: dupCount,
        });
        setShowPreview(true);
        setPreviewTab('all');

        if (dupCount > 0 || updateCount > 0) {
          toast(
            `Excel parsed: ${newCount} new, ${updateCount} to update${dupCount > 0 ? `, ${dupCount} duplicate(s) in sheet skipped` : ''}.`,
            { icon: 'ℹ️', duration: 4000 }
          );
        } else {
          toast.success(`File ready: all ${newCount} rows are new!`);
        }
      } catch (err) {
        console.error('Failed to parse Excel file:', err);
        toast.error('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };


  // Confirm Import from Staged Preview (support 'all', 'new', or 'update')
  const handleConfirmImport = (mode = 'all') => {
    if (!stagedData || !stagedData.rows || stagedData.rows.length === 0) return;

    let newRows = stagedData.rows.filter((r) => r.rowType === 'new');
    let updateRows = stagedData.rows.filter((r) => r.rowType === 'update');

    if (mode === 'new') {
      updateRows = [];
    } else if (mode === 'update') {
      newRows = [];
    }

    if (newRows.length === 0 && updateRows.length === 0) {
      toast.error('No valid rows to import or update.');
      return;
    }

    setRecords((prevRecords) => {
      const prevList = [...prevRecords];
      const compMap = new Map();
      const phoneMap = new Map();
      const emailMap = new Map();
      const idMap = new Map();

      prevList.forEach((r, idx) => {
        if (r.id) idMap.set(r.id, idx);
        const comp = (r.companyName || '').trim().toLowerCase();
        const phone = normalizePhone(r.mobileNo);
        const email = (r.emailId || '').trim().toLowerCase();
        if (comp && !compMap.has(comp)) compMap.set(comp, idx);
        if (phone && !phoneMap.has(phone)) phoneMap.set(phone, idx);
        if (email && !emailMap.has(email)) emailMap.set(email, idx);
      });

      const updatedList = [...prevList];
      const unshiftedUpdates = [];

      updateRows.forEach((uRow) => {
        let matchIdx = -1;
        if (uRow.existingRecordId && idMap.has(uRow.existingRecordId)) {
          matchIdx = idMap.get(uRow.existingRecordId);
        } else if (uRow.companyName && compMap.has(uRow.companyName.trim().toLowerCase())) {
          matchIdx = compMap.get(uRow.companyName.trim().toLowerCase());
        } else if (uRow.mobileNo && phoneMap.has(normalizePhone(uRow.mobileNo))) {
          matchIdx = phoneMap.get(normalizePhone(uRow.mobileNo));
        } else if (uRow.emailId && emailMap.has(uRow.emailId.trim().toLowerCase())) {
          matchIdx = emailMap.get(uRow.emailId.trim().toLowerCase());
        }

        if (matchIdx !== -1) {
          const ex = updatedList[matchIdx];
          updatedList[matchIdx] = {
            ...ex,
            companyName: uRow.companyName || ex.companyName,
            industry: uRow.industry || ex.industry,
            address: uRow.address || ex.address,
            rating: uRow.rating || ex.rating,
            contactPerson: uRow.contactPerson || ex.contactPerson,
            designation: uRow.designation || ex.designation,
            mobileNo: uRow.mobileNo || ex.mobileNo,
            emailId: uRow.emailId || ex.emailId,
            remarks: uRow.remarks || ex.remarks,
            date: uRow.date || ex.date,
            isConvertedToLead: Boolean(uRow.isConvertedToLead || ex.isConvertedToLead),
            leadId: uRow.leadId || ex.leadId || null,
            importedBy: uRow.importedBy || ex.importedBy || currentUserName,
          };
        } else {
          unshiftedUpdates.push({
            ...uRow,
            importedBy: uRow.importedBy || currentUserName,
          });
        }
      });

      const newRowsWithUser = newRows.map((r) => ({
        ...r,
        importedBy: r.importedBy || currentUserName,
      }));

      const combined = [...newRowsWithUser, ...unshiftedUpdates, ...updatedList];

      // Sync updated list with server
      dataService.syncImportData(combined).catch((err) => {
        console.warn('Failed to sync import records with server:', err);
      });

      return combined;
    });

    setFileName(stagedData.fileName);
    setSelectedIds([]);
    setStagedData(null);

    if (newRows.length > 0 && updateRows.length > 0) {
      toast.success(`Imported ${newRows.length} new records and updated ${updateRows.length} existing records.`);
    } else if (newRows.length > 0) {
      toast.success(`Imported ${newRows.length} new records into workspace.`);
    } else {
      toast.success(`Updated ${updateRows.length} existing records in workspace.`);
    }
  };

  // Cancel Staged File
  const handleCancelStaged = () => {
    setStagedData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Download Sample Template — includes Status dropdown, Source and Date columns
  const handleDownloadTemplate = async () => {
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
          industry: 'Information Technology',
          address: 'Electronics City, Hosur Road, Bangalore',
          rating: '4.5',
          contactPerson: 'Rahul Sharma',
          designation: 'VP Engineering',
          mobileNo: '+91 98765 43210',
          emailId: 'rahul.sharma@infosys.example',
          remarks: 'Interested in enterprise talent pipeline',
          date: today,
          status: 'Interested',
          source: 'LinkedIn',
        },
        {
          sNo: 2,
          companyName: 'Tata Consultancy Services',
          industry: 'Consulting & IT',
          address: 'TCS House, Raveline Street, Fort, Mumbai',
          rating: '4.8',
          contactPerson: 'Priya Nair',
          designation: 'Head of Talent Acquisition',
          mobileNo: '+91 98111 22334',
          emailId: 'priya.nair@tcs.example',
          remarks: 'Needs executive search services',
          date: yesterday,
          status: 'Not picking',
          source: 'Cold Call',
        },
        {
          sNo: 3,
          companyName: '',
          industry: '',
          address: '',
          rating: '',
          contactPerson: '',
          designation: '',
          mobileNo: '',
          emailId: '',
          remarks: '',
          date: today,
          status: '',
          source: '',
        },
      ];

      sampleRows.forEach((rowData) => {
        const row = worksheet.addRow(rowData);
        row.height = 22;
        row.alignment = { vertical: 'middle' };
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
        });
      });

      // ── Status Dropdown Data Validation on Column L (rows 2–1000) ─────────
      // Options: Interested, Not Interested, Did not turn up, Not picking, Other
      const statusOptions = ['Interested', 'Not Interested', 'Did not turn up', 'Not picking', 'Other'];
      const statusFormula = `"${statusOptions.join(',')}"`;

      // ── Source Dropdown Data Validation on Column M (rows 2–1000) ─────────
      const sourceOptions = ['LinkedIn', 'Cold Call', 'Website', 'Referral', 'Email Campaign', 'WhatsApp', 'Direct', 'Other'];
      const sourceFormula = `"${sourceOptions.join(',')}"`;

      for (let r = 2; r <= 1000; r++) {
        // Column L: Status dropdown
        worksheet.getCell(`L${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          showErrorMessage: true,
          errorStyle: 'stop',
          errorTitle: 'Invalid Status',
          error: `Please choose one of the options: ${statusOptions.join(', ')}`,
          formulae: [statusFormula],
        };

        // Column M: Source dropdown
        worksheet.getCell(`M${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          showErrorMessage: false,
          formulae: [sourceFormula],
        };
      }

      // ── Generate & Download ──────────────────────────────────────────────
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, 'CRM_Import_Template.xlsx');
      toast.success('Template downloaded! Fill columns and re-upload.');
    } catch (err) {
      console.error('Error generating template:', err);
      toast.error('Failed to download template. Please try again.');
    }
  };

  // Export Database records to Excel (.xlsx) with styled yellow header
  const handleExportData = async () => {
    let rowsToExport = [];
    if (selectedIds.length > 0) {
      rowsToExport = records.filter((r) => selectedIds.includes(r.id));
    } else if (filteredAndSortedRecords && filteredAndSortedRecords.length > 0) {
      rowsToExport = filteredAndSortedRecords;
    } else {
      rowsToExport = records;
    }

    if (!rowsToExport || rowsToExport.length === 0) {
      toast.error('No database records available to export.');
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

      // ── Add Data Rows ──────────────────────────────────────────────────
      rowsToExport.forEach((row, index) => {
        const rowData = {
          sNo: index + 1,
          companyName: row.companyName || '',
          industry: row.industry || '',
          address: row.address || '',
          rating: row.rating || '',
          contactPerson: row.contactPerson || '',
          designation: row.designation || '',
          mobileNo: row.mobileNo || '',
          emailId: row.emailId || '',
          remarks: row.remarks || '',
          date: row.date ? new Date(row.date).toISOString().split('T')[0] : '',
          status: row.leadStatus || (row.isConvertedToLead ? 'Converted to Lead' : row.isDuplicate ? 'Duplicate' : 'Active'),
          source: row.leadSource || row.source || '',
          importedBy: row.importedBy || currentUserName || '',
        };

        const addedRow = worksheet.addRow(rowData);
        addedRow.height = 22;
        addedRow.alignment = { vertical: 'middle' };
        addedRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `CRM_Database_Export_${timestamp}.xlsx`;
      saveAs(blob, filename);
      toast.success(`Successfully exported ${rowsToExport.length} record${rowsToExport.length === 1 ? '' : 's'}.`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export database records. Please try again.');
    }
  };

  // Helper to check if a row is converted to lead in CRM
  const isConvertedLead = (row) => Boolean(row?.isConvertedToLead);

  // Format local date as YYYY-MM-DD
  const formatLocalDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if an item matches the date filter
  const isRecordInDateFilter = (item, filter, from, to) => {
    if (filter === 'all') return true;
    if (!item?.date) return false;

    try {
      const itemDate = new Date(item.date);
      if (isNaN(itemDate.getTime())) return false;

      const now = new Date();

      if (filter === 'today') {
        return (
          itemDate.getFullYear() === now.getFullYear() &&
          itemDate.getMonth() === now.getMonth() &&
          itemDate.getDate() === now.getDate()
        );
      }

      const diffMs = now.getTime() - itemDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (filter === '2days') return diffDays <= 2;
      if (filter === '5days') return diffDays <= 5;
      if (filter === 'custom') {
        const localDateStr = formatLocalDate(itemDate);
        if (from && localDateStr < from) return false;
        if (to && localDateStr > to) return false;
        return true;
      }
      return true;
    } catch {
      return false;
    }
  };

  // Dynamic label & info for the active date filter
  const dateFilterInfo = useMemo(() => {
    switch (dateFilter) {
      case 'today':
        return {
          title: 'Imported Today',
          badge: 'Today',
          description: 'Records matching today’s date',
        };
      case '2days':
        return {
          title: 'Imported (Last 2 Days)',
          badge: 'Last 2 Days',
          description: 'Records in the last 48 hours',
        };
      case '5days':
        return {
          title: 'Imported (Last 5 Days)',
          badge: 'Last 5 Days',
          description: 'Records in the last 5 days',
        };
      case 'custom':
        return {
          title: 'Imported (Custom Range)',
          badge: 'Custom',
          description:
            fromDate && toDate
              ? `${fromDate} to ${toDate}`
              : fromDate
                ? `From ${fromDate}`
                : toDate
                  ? `Up to ${toDate}`
                  : 'Custom date window',
        };
      default:
        return {
          title: 'Imported (All Dates)',
          badge: 'All Dates',
          description: 'All records across all dates',
        };
    }
  }, [dateFilter, fromDate, toDate]);

  // Scoped records: when user does not have view_all permission, strictly restrict to their own records
  const scopedRecords = useMemo(() => {
    if (canViewAll) return records;
    const currUser = (currentUserName || '').trim().toLowerCase();
    const myId = user?._id ? String(user._id) : '';
    return records.filter((r) => {
      const recUser = (r.importedBy || '').trim().toLowerCase();
      const recUserId = r.importedByUserId ? String(r.importedByUserId) : '';
      const assignedId = r.assignedTo ? String(r.assignedTo) : '';
      return (
        (myId && (recUserId === myId || assignedId === myId)) ||
        (currUser && recUser === currUser)
      );
    });
  }, [records, canViewAll, currentUserName, user?._id]);

  // Records filtered strictly by the date filter (used for both Card 2 and Table)
  const dateFilteredRecords = useMemo(() => {
    return scopedRecords.filter((item) => isRecordInDateFilter(item, dateFilter, fromDate, toDate));
  }, [scopedRecords, dateFilter, fromDate, toDate]);

  // Card metric values
  const totalDataCount = scopedRecords.length;
  const uniqueDataCount = useMemo(() => scopedRecords.filter((r) => !r.isDuplicate).length, [scopedRecords]);
  const dateFilteredCount = dateFilteredRecords.length;

  const totalConvertedCount = useMemo(() => {
    return scopedRecords.filter(isConvertedLead).length;
  }, [scopedRecords]);

  const dateFilteredConvertedCount = useMemo(() => {
    return dateFilteredRecords.filter(isConvertedLead).length;
  }, [dateFilteredRecords]);

  // Filter & Sort Logic for Active Records
  const filteredAndSortedRecords = useMemo(() => {
    return dateFilteredRecords
      .filter((item) => {
        // Filter by Converted to Lead if card filter is active
        if (showConvertedOnly && !isConvertedLead(item)) {
          return false;
        }

        // Multi-select user filter (Imported By)
        if (selectedUsers.length > 0) {
          const itemUser = (item.importedBy || currentUserName || '').trim().toLowerCase();
          const matchesUser = selectedUsers.some(
            (u) => u.trim().toLowerCase() === itemUser || (item.importedByUserId && item.importedByUserId === u)
          );
          if (!matchesUser) return false;
        }

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const matchCompany = item.companyName?.toLowerCase().includes(q);
        const matchPerson = item.contactPerson?.toLowerCase().includes(q);
        const matchEmail = item.emailId?.toLowerCase().includes(q);
        const matchMobile = item.mobileNo?.toLowerCase().includes(q);
        const matchIndustry = item.industry?.toLowerCase().includes(q);
        const matchAddress = item.address?.toLowerCase().includes(q);
        const matchUser = item.importedBy?.toLowerCase().includes(q);
        return matchCompany || matchPerson || matchEmail || matchMobile || matchIndustry || matchAddress || matchUser;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
      });
  }, [dateFilteredRecords, selectedUsers, searchQuery, sortDirection, currentUserName, showConvertedOnly]);

  // Reset to first page when any filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, fromDate, toDate, selectedUsers, searchQuery, sortDirection, showConvertedOnly]);

  // Pagination calculation
  const totalMatchingRecords = filteredAndSortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalMatchingRecords / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Paginated slice for the current page view
  const paginatedRecords = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredAndSortedRecords.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedRecords, validCurrentPage, pageSize]);

  // Entry counters
  const startEntry = totalMatchingRecords === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endEntry = Math.min(validCurrentPage * pageSize, totalMatchingRecords);

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Checkbox handlers
  const handleToggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const currentPageIds = paginatedRecords.map((r) => r.id);
    const allSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...currentPageIds]));
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
    paginatedRecords.length > 0 &&
    paginatedRecords.every((r) => selectedIds.includes(r.id));

  // Move to Lead confirmation modal state
  const [convertTarget, setConvertTarget] = useState(null); // null | { type: 'single', row } | { type: 'bulk', count, rows }

  // Open convert confirmation modal for single row
  const handleOpenConvertSingle = (row) => {
    if (!row || row.isConvertedToLead) return;
    setConvertTarget({ type: 'single', row });
  };

  // Open convert confirmation modal for bulk selected
  const handleOpenConvertBulk = () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one company to send to Leads.');
      return;
    }

    const selectedRows = records.filter(
      (r) => selectedIds.includes(r.id) && !r.isDuplicate && !r.isConvertedToLead
    );

    if (selectedRows.length === 0) {
      toast.error('Selected records are already converted to Leads or are duplicates.');
      return;
    }

    setConvertTarget({
      type: 'bulk',
      count: selectedRows.length,
      rows: selectedRows,
    });
  };

  // Confirm and execute conversion to Lead
  const handleConfirmConvert = async () => {
    if (!convertTarget) return;
    setIsSubmitting(true);

    try {
      if (convertTarget.type === 'single') {
        const row = convertTarget.row;
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
        const updatedRow = {
          ...row,
          isConvertedToLead: true,
          leadId: newLeadId,
          isDuplicate: false,
          duplicateReason: '',
        };
        setRecords((prev) =>
          prev.map((r) => (r.id === row.id ? updatedRow : r))
        );
        dataService.syncImportData([updatedRow]).catch(console.warn);
        toast.success(`"${row.companyName}" converted to Lead successfully!`);
        setConvertTarget(null);
      } else if (convertTarget.type === 'bulk') {
        const selectedRows = convertTarget.rows;
        const skippedDups = selectedIds.length - selectedRows.length;

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
          const updated = records.map((r) =>
            sentIds.has(r.id) ? { ...r, isConvertedToLead: true } : r
          );
          setRecords(updated);
          dataService.syncImportData(updated).catch(console.warn);

          toast.success(
            skippedDups > 0
              ? `Converted ${payloadRows.length} new companies to Leads! (${skippedDups} duplicates/converted skipped)`
              : `Converted ${payloadRows.length} companies to Leads!`
          );

          setSelectedIds([]);
          setConvertTarget(null);

          // Navigate directly to Leads tab after short feedback delay
          setTimeout(() => {
            if (onNavigate) {
              onNavigate('leads');
            } else {
              window.location.href = '/crm?tab=leads';
            }
          }, 1200);
        } else {
          toast.error(res.message || 'Failed to convert companies to Leads.');
        }
      }
    } catch (err) {
      console.error('Error converting to leads:', err);
      toast.error(err.response?.data?.message || err.message || 'Error converting to Leads.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState(null); // null | { type: 'single', row } | { type: 'bulk', count }
  const [isDeleting, setIsDeleting] = useState(false);

  // Open delete confirmation modal for single row
  const handleOpenDeleteSingle = (row) => {
    if (!row || row.isConvertedToLead) return;
    setDeleteTarget({ type: 'single', row });
  };

  // Open delete confirmation modal for bulk selected
  const handleOpenDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const deletableRows = records.filter(
      (r) => selectedIds.includes(r.id) && !r.isConvertedToLead
    );
    if (deletableRows.length === 0) {
      toast.error('Selected companies are converted to Leads. Delete them from CRM Leads instead.');
      return;
    }
    setDeleteTarget({ type: 'bulk', count: deletableRows.length, rows: deletableRows });
  };

  // Confirm and execute deletion
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      if (deleteTarget.type === 'single') {
        const rowToDelete = deleteTarget.row;
        try {
          await leadsService.moveToRecycleBin([rowToDelete]);
        } catch (err) {
          console.warn('Failed to sync soft delete with DB:', err);
        }
        setRecords((prev) => prev.filter((r) => r.id !== rowToDelete.id));
        setSelectedIds((prev) => prev.filter((itemId) => itemId !== rowToDelete.id));
        toast.success(`"${rowToDelete.companyName || 'Company'}" moved to Recycle Bin.`);
      } else if (deleteTarget.type === 'bulk') {
        const rowsToDelete = deleteTarget.rows || records.filter((r) => selectedIds.includes(r.id) && !r.isConvertedToLead);
        const count = rowsToDelete.length;
        const idsToDelete = new Set(rowsToDelete.map((r) => r.id));
        try {
          await leadsService.moveToRecycleBin(rowsToDelete);
        } catch (err) {
          console.warn('Failed to sync soft delete with DB:', err);
        }
        setRecords((prev) => prev.filter((r) => !idsToDelete.has(r.id)));
        setSelectedIds((prev) => prev.filter((itemId) => !idsToDelete.has(itemId)));
        toast.success(`${count} ${count === 1 ? 'company' : 'companies'} moved to Recycle Bin.`);
      }
      setDeleteTarget(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to move records to Recycle Bin.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Edit Row State & Handlers
  const [editingRow, setEditingRow] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleOpenEdit = (row) => {
    if (!row || row.isConvertedToLead) return;
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

      // FIX #6: Only mark isConvertedToLead:true when the DB operation actually
      // succeeded and we have a valid leadId. If createLead fails (network error,
      // validation error) the row must keep its previous converted state, not
      // silently appear as converted without a real lead in the CRM.
      const didSucceed = Boolean(savedLeadId);

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
              leadId: savedLeadId || r.leadId,
              // Only flip to true when we have a confirmed leadId from the API
              isConvertedToLead: didSucceed ? true : r.isConvertedToLead,
              isDuplicate: didSucceed ? false : r.isDuplicate,
              duplicateReason: didSucceed ? '' : r.duplicateReason,
            }
            : r
        )
      );
      // Sync updated row to CrmImportData only if the save actually worked
      if (didSucceed) {
        dataService.syncImportData([{
          ...editingRow,
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
        }]).catch(console.warn);
      }

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
                isConvertedToLead: true,
                rowType: 'update',
                isDuplicate: false,
                isUpdate: true,
                isNew: false,
                duplicateReason: '',
                updateReason: 'Saved to CRM Database',
              }
              : r
          );
          const newCount = updatedRows.filter((r) => r.rowType === 'new').length;
          const updateCount = updatedRows.filter((r) => r.rowType === 'update').length;
          const dupCount = updatedRows.filter((r) => r.rowType === 'duplicate').length;
          return {
            ...prev,
            rows: updatedRows,
            newCount,
            updateCount,
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
            <Database className="w-6 h-6 text-emerald-600 shrink-0" />
            <span>Database</span>
            {canViewAll ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                All Organization Records
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                title="You have personal data visibility: you can only view records you uploaded or are assigned to."
              >
                Personal View (My Data Only)
              </span>
            )}
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
            onClick={handleExportData}
            title={selectedIds.length > 0 ? `Export ${selectedIds.length} selected records to Excel` : "Export database records to Excel"}
          >
            Export{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={FileSpreadsheet}
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
                  {stagedData.updateCount > 0 && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                      title="Existing records in CRM or workspace to update"
                    >
                      <RefreshCw className="w-3 h-3 text-amber-600" />
                      {stagedData.updateCount} update
                    </span>
                  )}
                  {stagedData.duplicateCount > 0 && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                      title="Duplicate company name, mobile, or email within sheet"
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-500" />
                      {stagedData.duplicateCount} duplicate(s) skipped
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  File Size: {stagedData.fileSize} • Duplicates in sheet are skipped. New data will upload, and existing records will be updated.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
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

              {stagedData.updateCount > 0 && stagedData.newCount > 0 ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={CheckCircle2}
                    onClick={() => handleConfirmImport('new')}
                    title="Import only new rows"
                  >
                    Import New Only ({stagedData.newCount})
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={RefreshCw}
                    onClick={() => handleConfirmImport('all')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                    title="Import new rows and update existing records"
                  >
                    Import & Update All ({stagedData.newCount + stagedData.updateCount} rows)
                  </Button>
                </>
              ) : stagedData.updateCount > 0 ? (
                <Button
                  size="sm"
                  variant="primary"
                  icon={RefreshCw}
                  onClick={() => handleConfirmImport('update')}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
                >
                  Update Existing ({stagedData.updateCount} rows)
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  icon={CheckCircle2}
                  disabled={stagedData.newCount === 0}
                  onClick={() => handleConfirmImport('new')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {stagedData.newCount > 0
                    ? `Import New Data (${stagedData.newCount} rows)`
                    : 'No New Data (All Duplicates)'}
                </Button>
              )}
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

                  {/* Filter tabs inside preview: All, New, Update, Duplicates */}
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('all')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${previewTab === 'all'
                        ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      All ({stagedData.rows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('new')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${previewTab === 'new'
                        ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                        : 'text-emerald-700 hover:text-emerald-900'
                        }`}
                    >
                      New ({stagedData.newCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('update')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${previewTab === 'update'
                        ? 'bg-amber-600 text-white shadow-2xs font-bold'
                        : 'text-amber-700 hover:text-amber-900'
                        }`}
                    >
                      Update ({stagedData.updateCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('duplicates')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${previewTab === 'duplicates'
                        ? 'bg-rose-600 text-white shadow-2xs font-bold'
                        : 'text-rose-700 hover:text-rose-900'
                        }`}
                    >
                      Duplicates ({stagedData.duplicateCount})
                    </button>
                  </div>
                </div>

                <span className="text-[11px] text-slate-500 font-medium">
                  {stagedData.duplicateCount > 0
                    ? `⚠️ ${stagedData.duplicateCount} duplicate(s) in sheet will NOT be imported.`
                    : stagedData.updateCount > 0
                      ? `🔄 ${stagedData.updateCount} existing record(s) will be updated, ${stagedData.newCount} new record(s) will upload.`
                      : 'All records are new and ready to upload.'}
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
                      <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Imported By</th>
                      <th className="p-2.5 border-l border-slate-200 whitespace-nowrap text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleStagedRows.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-8 text-center text-slate-400">
                          No {previewTab} records to display in this sheet.
                        </td>
                      </tr>
                    ) : (
                      visibleStagedRows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`transition-colors ${row.rowType === 'duplicate'
                            ? 'bg-rose-50/40 hover:bg-rose-50/70'
                            : row.rowType === 'update'
                              ? 'bg-amber-50/20 hover:bg-amber-50/50'
                              : 'hover:bg-slate-50'
                            }`}
                        >
                          <td className="p-2.5 text-center font-semibold text-slate-500 whitespace-nowrap">
                            {idx + 1}
                          </td>
                          <td className="p-2.5 border-l border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{row.companyName || '—'}</span>

                              {/* Badges */}
                              {row.rowType === 'update' && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 ml-1 shrink-0 shadow-2xs"
                                  title={row.updateReason || 'Matches existing record'}
                                >
                                  <RefreshCw className="w-3 h-3 text-amber-600" />
                                  Update
                                </span>
                              )}

                              {row.isConvertedToLead && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 ml-1 shrink-0 shadow-2xs"
                                  title="Converted to Lead in CRM"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Converted to Lead
                                </span>
                              )}

                              {row.rowType === 'duplicate' && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 ml-1 shrink-0"
                                  title={row.duplicateReason || 'Duplicate in sheet'}
                                >
                                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                                  Duplicate in Sheet
                                </span>
                              )}

                              {row.rowType === 'new' && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ml-1 shrink-0"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  New
                                </span>
                              )}
                            </div>

                            {row.rowType === 'duplicate' && row.duplicateReason && (
                              <div className="text-[10px] text-rose-600 font-normal mt-0.5">
                                {row.duplicateReason}
                              </div>
                            )}
                            {row.rowType === 'update' && row.updateReason && !row.isConvertedToLead && (
                              <div className="text-[10px] text-amber-600 font-normal mt-0.5">
                                {row.updateReason}
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
                          <td className="p-2.5 border-l border-slate-200 text-slate-700 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {(row.importedBy || currentUserName || 'U').charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-800 text-xs truncate max-w-[120px]" title={row.importedBy || currentUserName}>
                                {row.importedBy || currentUserName}
                              </span>
                            </div>
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

              <div className="flex justify-end items-center gap-2 pt-2">
                {stagedData.updateCount > 0 && stagedData.newCount > 0 ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={CheckCircle2}
                      onClick={() => handleConfirmImport('new')}
                    >
                      Import New Only ({stagedData.newCount} rows)
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={RefreshCw}
                      onClick={() => handleConfirmImport('all')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                    >
                      Confirm & Import All ({stagedData.newCount + stagedData.updateCount} rows)
                    </Button>
                  </>
                ) : stagedData.updateCount > 0 ? (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={RefreshCw}
                    onClick={() => handleConfirmImport('update')}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
                  >
                    Confirm & Update ({stagedData.updateCount} rows)
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={CheckCircle2}
                    disabled={stagedData.newCount === 0}
                    onClick={() => handleConfirmImport('new')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs disabled:opacity-50"
                  >
                    Confirm & Import New Data ({stagedData.newCount} rows)
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. ACTIVE IMPORTED WORKSPACE (Once imported or ready) */}
      {(!stagedData || records.length > 0) && (
        <div className="space-y-4">
          {/* Summary Stat Cards: Total Data, Date Filter Imports, Converted to Leads */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Total Data (Clickable: resets filters and shows all records) */}
            {(() => {
              const isTotalActive = !showConvertedOnly && dateFilter === 'all' && !fromDate && !toDate;
              const isTodayActive = !showConvertedOnly && dateFilter === 'today';
              const isConvertedActive = showConvertedOnly;

              return (
                <>
                  <div
                    onClick={() => {
                      setShowConvertedOnly(false);
                      setDateFilter('all');
                      setFromDate('');
                      setToDate('');
                    }}
                    className={`p-3 sm:px-4 sm:py-3 rounded-xl border shadow-2xs transition-all duration-150 cursor-pointer select-none group relative ${
                      isTotalActive
                        ? 'bg-indigo-50/60 border-indigo-400 ring-2 ring-indigo-500/25 shadow-xs'
                        : 'bg-white border-slate-200/90 hover:border-indigo-300 hover:shadow-xs'
                    }`}
                    title={isTotalActive ? 'Currently showing all records' : 'Click to view all records in workspace'}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                            isTotalActive ? 'text-indigo-900 font-bold' : 'text-slate-500 group-hover:text-indigo-700'
                          }`}>
                            Total Data
                          </p>
                          {isTotalActive && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-600 text-white shrink-0 shadow-2xs">
                              All Records
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                            {totalDataCount}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">
                            records
                          </span>
                        </div>
                      </div>
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                        isTotalActive
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                          : 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-100 group-hover:text-indigo-700'
                      }`}>
                        <Database className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate">
                        {isTotalActive ? 'Showing all records in workspace' : 'Click to show all records'}
                      </span>
                      <span className={`font-semibold shrink-0 ${isTotalActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                        {totalDataCount > 0 ? '100%' : '0%'}
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Import Today (Clickable: filters by today's date) */}
                  <div
                    onClick={() => {
                      if (isTodayActive) {
                        setDateFilter('all');
                      } else {
                        setShowConvertedOnly(false);
                        setDateFilter('today');
                        setFromDate('');
                        setToDate('');
                      }
                    }}
                    className={`p-3 sm:px-4 sm:py-3 rounded-xl border shadow-2xs transition-all duration-150 cursor-pointer select-none group relative ${
                      isTodayActive
                        ? 'bg-blue-50/60 border-blue-400 ring-2 ring-blue-500/25 shadow-xs'
                        : 'bg-white border-slate-200/90 hover:border-blue-300 hover:shadow-xs'
                    }`}
                    title={isTodayActive ? 'Filtered by today (Click to reset to all)' : 'Click to filter records imported today'}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                            isTodayActive ? 'text-blue-900 font-bold' : 'text-slate-500 group-hover:text-blue-700'
                          }`}>
                            {dateFilterInfo.title}
                          </p>
                          <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                            isTodayActive
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {isTodayActive ? 'Active Filter' : dateFilterInfo.badge}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                            {dateFilteredCount}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">
                            {dateFilter === 'today' ? 'imported today' : 'matching filter'}
                          </span>
                        </div>
                      </div>
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                        isTodayActive
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                          : 'bg-blue-50 border-blue-100 text-blue-600 group-hover:bg-blue-100 group-hover:text-blue-700'
                      }`}>
                        <Calendar className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate">
                        {isTodayActive ? 'Filtered by today (Click to show all)' : 'Click to filter today’s records'}
                      </span>
                      <span className="font-semibold text-blue-600 shrink-0">
                        {totalDataCount > 0 ? `${Math.round((dateFilteredCount / totalDataCount) * 100)}% of total` : '0%'}
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Converted to Lead (Clickable: filters table & provides link to CRM Leads) */}
                  <div
                    onClick={() => setShowConvertedOnly((prev) => !prev)}
                    className={`p-3 sm:px-4 sm:py-3 rounded-xl border shadow-2xs transition-all duration-150 cursor-pointer select-none group relative ${
                      isConvertedActive
                        ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-500/25 shadow-xs'
                        : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:shadow-xs'
                    }`}
                    title={isConvertedActive ? 'Filtered: Showing converted leads (Click to show all)' : 'Click to filter table by Converted to Lead'}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                            isConvertedActive ? 'text-emerald-900 font-bold' : 'text-slate-500 group-hover:text-emerald-700'
                          }`}>
                            Converted to Lead
                          </p>
                          <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                            isConvertedActive
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {isConvertedActive ? 'Active Filter' : dateFilterInfo.badge}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-xl sm:text-2xl font-bold text-emerald-600 tracking-tight">
                            {dateFilteredConvertedCount}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">
                            {dateFilter === 'today' ? 'converted today' : 'leads converted'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {onNavigate && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('leads');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-100/50 transition cursor-pointer"
                            title="Open CRM Leads page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                          isConvertedActive
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                            : 'bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:bg-emerald-100 group-hover:text-emerald-700'
                        }`}>
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate">
                        {isConvertedActive
                          ? 'Filtered: Showing converted leads (Click to reset)'
                          : 'Click to filter converted leads'}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 shrink-0">
                        {dateFilteredCount > 0
                          ? `${Math.round((dateFilteredConvertedCount / dateFilteredCount) * 100)}% converted`
                          : '0% converted'}
                      </span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

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

              {/* Imported By User Filter Dropdown — only for users with full org view */}
              {canViewAll && (
                <div className="relative" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsUserDropdownOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition shadow-2xs ${selectedUsers.length > 0
                    ? 'border-indigo-300 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100/70'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  title="Filter records by imported user"
                >
                  <User className={`w-3.5 h-3.5 ${selectedUsers.length > 0 ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span>
                    Imported By:{' '}
                    {selectedUsers.length === 0 ? (
                      <span className="font-normal text-slate-500">All</span>
                    ) : selectedUsers.length === 1 ? (
                      <span className="font-bold text-indigo-700">{selectedUsers[0]}</span>
                    ) : (
                      <span className="font-bold text-indigo-700">{selectedUsers.length} Users</span>
                    )}
                  </span>
                  {selectedUsers.length > 0 && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearUsers();
                      }}
                      className="ml-0.5 text-slate-400 hover:text-rose-600 px-0.5 rounded cursor-pointer transition"
                      title="Clear user filter"
                    >
                      ✕
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isUserDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                      }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isUserDropdownOpen && (
                  <div className="absolute left-0 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white shadow-xl py-2 z-50 animate-in fade-in duration-100">
                    {/* Header */}
                    <div className="px-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-800">Imported By (Active Users)</div>
                      {selectedUsers.length > 0 && (
                        <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                          {selectedUsers.length} selected
                        </span>
                      )}
                    </div>

                    {/* Search active users */}
                    <div className="p-2 border-b border-slate-100">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search active users..."
                          value={userFilterSearch}
                          onChange={(e) => setUserFilterSearch(e.target.value)}
                          className="w-full pl-8 pr-6 py-1.5 text-xs rounded-md border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400"
                          autoFocus
                        />
                        {userFilterSearch && (
                          <button
                            type="button"
                            onClick={() => setUserFilterSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick action bar: Select All / Clear */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 text-[11px] bg-slate-50/60">
                      <button
                        type="button"
                        onClick={handleSelectAllUsers}
                        className="font-medium text-indigo-600 hover:text-indigo-800 transition"
                      >
                        Select All ({activeUserOptions.length})
                      </button>
                      {selectedUsers.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearUsers}
                          className="font-medium text-slate-500 hover:text-rose-600 transition"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Scrollable list of active users */}
                    <div className="max-h-52 overflow-y-auto py-1">
                      {filteredUserOptions.length === 0 ? (
                        <div className="px-4 py-3 text-center text-xs text-slate-400">
                          {userFilterSearch ? 'No active users found' : 'No active users available'}
                        </div>
                      ) : (
                        filteredUserOptions.map((opt) => {
                          const isSelected = selectedUsers.includes(opt.name);
                          const isMe = currentUserName && opt.name.toLowerCase() === currentUserName.toLowerCase();
                          return (
                            <label
                              key={opt.id || opt.name}
                              className={`flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 cursor-pointer select-none text-xs transition ${isSelected ? 'bg-indigo-50/40' : ''
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleUser(opt.name)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                              />
                              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 uppercase">
                                {opt.name.charAt(0) || 'U'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-slate-800 truncate flex items-center gap-1.5">
                                  <span className="truncate">{opt.name}</span>
                                  {isMe && (
                                    <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 border border-indigo-200/60 px-1 rounded shrink-0">
                                      You
                                    </span>
                                  )}
                                </div>
                                {opt.email && (
                                  <div className="text-[10px] text-slate-400 truncate">{opt.email}</div>
                                )}
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">
                        {selectedUsers.length} of {activeUserOptions.length} active
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-2xs transition"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
                </div>
              )}

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
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Download}
                    onClick={handleExportData}
                    className="shadow-2xs text-slate-700 hover:bg-slate-50 border-slate-300"
                    title="Export selected records to Excel"
                  >
                    Export Selected ({selectedIds.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={Trash2}
                    onClick={handleOpenDeleteSelected}
                    className="shadow-sm"
                    title="Move selected companies to Recycle Bin"
                  >
                    Delete Selected ({selectedIds.length})
                  </Button>
                </>
              )}

              <Button
                size="sm"
                variant="primary"
                icon={Send}
                disabled={selectedIds.length === 0}
                isLoading={isSubmitting}
                onClick={handleOpenConvertBulk}
                className="shadow-sm"
              >
                Send to Leads ({selectedIds.length})
              </Button>
            </div>
          </div>

          {/* Status & Pagination Toolbar (Row Just Below Filters) */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            {/* Left: Showing X of Y | Selected: Z */}
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <span className="font-medium text-slate-500">
                Showing{' '}
                {totalMatchingRecords === 0 ? (
                  <strong className="text-slate-800 font-bold">0</strong>
                ) : totalMatchingRecords <= pageSize ? (
                  <strong className="text-slate-800 font-bold">{totalMatchingRecords}</strong>
                ) : (
                  <>
                    <strong className="text-slate-800 font-bold">{startEntry}</strong>–
                    <strong className="text-slate-800 font-bold">{endEntry}</strong>
                  </>
                )}{' '}
                of <strong className="text-slate-800 font-bold">{scopedRecords.length}</strong>
                {totalMatchingRecords !== scopedRecords.length && totalMatchingRecords > 0 && (
                  <span className="text-slate-400 font-normal ml-1">
                    ({totalMatchingRecords} matching filter)
                  </span>
                )}
                <span className="mx-2 text-slate-300">|</span>
                Selected: <strong className="text-indigo-600 font-bold">{selectedIds.length}</strong>
              </span>

              {showConvertedOnly && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 ml-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Converted Only
                  <button
                    type="button"
                    onClick={() => setShowConvertedOnly(false)}
                    className="ml-1 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-200 rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold"
                    title="Clear converted filter and show all"
                  >
                    ✕
                  </button>
                </span>
              )}

              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-[11px] text-slate-400 hover:text-slate-700 underline font-medium ml-1"
                >
                  Clear selection
                </button>
              )}
            </div>

            {/* Right: Page Size Selector & Pagination */}
            <div className="flex items-center gap-3">
              {/* Entries per page options: 50 (default), 80, 100 */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="text-[11px] font-medium text-slate-500">Show:</span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-2xs">
                  {[50, 80, 100].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handlePageSizeChange(size)}
                      className={`px-2.5 py-0.5 rounded-md text-xs font-semibold transition ${pageSize === size
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                        }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-400">entries</span>
              </div>

              {/* Pagination Page Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                  <button
                    type="button"
                    disabled={validCurrentPage <= 1}
                    onClick={() => handlePageChange(validCurrentPage - 1)}
                    className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 shadow-2xs transition"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-xs text-slate-600 font-medium px-1">
                    Page <strong className="text-indigo-600">{validCurrentPage}</strong> of{' '}
                    <strong className="text-slate-800">{totalPages}</strong>
                  </span>

                  <button
                    type="button"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => handlePageChange(validCurrentPage + 1)}
                    className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 shadow-2xs transition"
                    title="Next page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
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
                    <th className="p-3 border-l border-slate-200 whitespace-nowrap">Imported By</th>
                    <th className="p-3 border-l border-slate-200 text-center w-24 whitespace-nowrap">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {totalMatchingRecords === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-400">
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
                    paginatedRecords.map((row, idx) => {
                      const isSelected = selectedIds.includes(row.id);
                      const isRemarkExpanded = Boolean(expandedRemarks[row.id]);
                      const isLongRemark = (row.remarks || '').trim().length > 30;
                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/40' : ''
                            } ${isRemarkExpanded ? 'align-top bg-slate-50/30' : ''}`}
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
                            {startEntry + idx}
                          </td>
                          <td className="p-3 border-l border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{row.companyName || '—'}</span>
                              {row.isConvertedToLead ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onNavigate) onNavigate('leads');
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 ml-1.5 shrink-0 shadow-2xs hover:shadow-xs transition cursor-pointer"
                                  title="Converted to Lead in CRM. Click to view in Leads tab."
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Converted to Lead</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                                </button>
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
                            {row.isDuplicate && !row.isConvertedToLead && row.duplicateReason && (
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
                          <td
                            className={`p-3 text-slate-600 transition-all ${
                              isRemarkExpanded
                                ? 'min-w-[260px] max-w-md whitespace-normal break-words py-4'
                                : 'max-w-xs'
                            }`}
                          >
                            {isLongRemark ? (
                              <div className="flex items-start gap-1.5">
                                <div
                                  className={`flex-1 ${
                                    isRemarkExpanded
                                      ? 'text-xs text-slate-800 leading-relaxed font-normal bg-slate-50/90 p-2.5 rounded-lg border border-slate-200 shadow-2xs'
                                      : 'truncate'
                                  }`}
                                  title={isRemarkExpanded ? '' : row.remarks}
                                >
                                  {row.remarks}
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpandRemark(row.id);
                                  }}
                                  className={`p-1 rounded-md transition shrink-0 inline-flex items-center justify-center ${
                                    isRemarkExpanded
                                      ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                                      : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                                  }`}
                                  title={isRemarkExpanded ? 'Collapse remark' : 'View full remark'}
                                >
                                  {isRemarkExpanded ? (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="truncate" title={row.remarks}>
                                {row.remarks || '—'}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 whitespace-nowrap font-medium">
                            {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                          </td>
                          <td className="p-3 border-l border-slate-200 text-slate-700 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                                {(row.importedBy || currentUserName || 'U').charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-800 text-xs truncate max-w-[130px]" title={row.importedBy || currentUserName}>
                                {row.importedBy || currentUserName}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5 min-h-[28px]">
                              {!row.isConvertedToLead ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenConvertSingle(row)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                                    title="Convert to CRM Lead"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
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
                                    onClick={() => handleOpenDeleteSingle(row)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                    title="Move this company to Recycle Bin"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-slate-300 text-xs select-none" title="Managed as active Lead in CRM Leads">—</span>
                              )}
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
            <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>
                  {/* Tip: Click any row to select. Click the <strong>Date</strong> header to toggle Ascending / Descending order. */}
                </span>
                {/* <span className="text-slate-300">|</span> */}
                <span className="font-medium text-slate-700">
                  {selectedIds.length} of {records.length} selected
                </span>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={validCurrentPage <= 1}
                    onClick={() => handlePageChange(validCurrentPage - 1)}
                    className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 shadow-2xs transition"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-xs text-slate-600 font-medium px-1">
                    Page <strong className="text-indigo-600">{validCurrentPage}</strong> of{' '}
                    <strong className="text-slate-800">{totalPages}</strong>
                  </span>

                  <button
                    type="button"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => handlePageChange(validCurrentPage + 1)}
                    className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 shadow-2xs transition"
                    title="Next page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal
          isOpen={Boolean(deleteTarget)}
          onClose={() => {
            if (!isDeleting) setDeleteTarget(null);
          }}
          title="Confirm Deletion"
          subtitle="Move data to Recycle Bin"
          maxWidth="max-w-md"
          footer={
            <div className="flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                icon={Trash2}
                isLoading={isDeleting}
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white shadow-xs font-semibold"
              >
                {deleteTarget.type === 'single'
                  ? 'Delete Record'
                  : `Delete (${deleteTarget.count})`}
              </Button>
            </div>
          }
        >
          <div className="space-y-3.5 py-1 text-xs text-slate-600">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {deleteTarget.type === 'single'
                    ? `Delete "${deleteTarget.row?.companyName || 'this record'}"?`
                    : `Delete ${deleteTarget.count} selected record${deleteTarget.count === 1 ? '' : 's'}?`}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {deleteTarget.type === 'single'
                    ? 'This record will be removed from your active workspace and moved to the Recycle Bin.'
                    : `All ${deleteTarget.count} selected records will be removed from your workspace and moved to the Recycle Bin.`}
                </p>
              </div>
            </div>

            {deleteTarget.type === 'single' && deleteTarget.row && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-[11px] text-slate-600 mt-2">
                {deleteTarget.row.companyName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Company:</span>
                    <span className="font-semibold text-slate-800">{deleteTarget.row.companyName}</span>
                  </div>
                )}
                {deleteTarget.row.contactPerson && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Contact:</span>
                    <span className="font-medium text-slate-700">{deleteTarget.row.contactPerson}</span>
                  </div>
                )}
                {deleteTarget.row.mobileNo && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Mobile:</span>
                    <span className="font-mono text-slate-700">{deleteTarget.row.mobileNo}</span>
                  </div>
                )}
                {deleteTarget.row.emailId && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-mono text-slate-700">{deleteTarget.row.emailId}</span>
                  </div>
                )}
                {deleteTarget.row.industry && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Industry:</span>
                    <span className="text-slate-700">{deleteTarget.row.industry}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Convert to Lead Confirmation Modal */}
      {convertTarget && (
        <Modal
          isOpen={Boolean(convertTarget)}
          onClose={() => !isSubmitting && setConvertTarget(null)}
          title="Convert to Lead"
          maxWidth="max-w-md"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConvertTarget(null)}
                disabled={isSubmitting}
                className="text-slate-600 hover:text-slate-800"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Send}
                isLoading={isSubmitting}
                onClick={handleConfirmConvert}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
              >
                {convertTarget.type === 'single'
                  ? 'Convert to Lead'
                  : `Convert (${convertTarget.count})`}
              </Button>
            </div>
          }
        >
          <div className="space-y-3.5 py-1 text-xs text-slate-600">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {convertTarget.type === 'single'
                    ? `Convert "${convertTarget.row?.companyName || 'this record'}" into a Lead?`
                    : `Convert ${convertTarget.count} selected record${convertTarget.count === 1 ? '' : 's'} into Leads?`}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {convertTarget.type === 'single'
                    ? 'Are you sure you want to convert this into a lead? It will be added to your active CRM Leads pipeline.'
                    : `Are you sure you want to convert these ${convertTarget.count} records into leads? They will be added to your active CRM Leads pipeline.`}
                </p>
              </div>
            </div>

            {convertTarget.type === 'single' && convertTarget.row && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-[11px] text-slate-600 mt-2">
                {convertTarget.row.companyName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Company:</span>
                    <span className="font-semibold text-slate-800">{convertTarget.row.companyName}</span>
                  </div>
                )}
                {convertTarget.row.contactPerson && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Contact:</span>
                    <span className="font-medium text-slate-700">{convertTarget.row.contactPerson}</span>
                  </div>
                )}
                {convertTarget.row.mobileNo && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Mobile:</span>
                    <span className="font-mono text-slate-700">{convertTarget.row.mobileNo}</span>
                  </div>
                )}
                {convertTarget.row.emailId && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-mono text-slate-700">{convertTarget.row.emailId}</span>
                  </div>
                )}
                {convertTarget.row.industry && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Industry:</span>
                    <span className="text-slate-700">{convertTarget.row.industry}</span>
                  </div>
                )}
              </div>
            )}

            {convertTarget.type === 'bulk' && convertTarget.rows && (
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/80 text-[11px] text-emerald-900 mt-2">
                <p className="font-semibold text-emerald-950 mb-1.5">
                  Ready to convert {convertTarget.count} companies:
                </p>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {convertTarget.rows.slice(0, 5).map((r, i) => (
                    <div key={r.id || i} className="flex items-center justify-between text-slate-700">
                      <span className="font-medium truncate max-w-[200px]">{r.companyName || 'Untitled'}</span>
                      <span className="text-slate-500 font-mono text-[10px]">{r.mobileNo || r.emailId || '—'}</span>
                    </div>
                  ))}
                  {convertTarget.rows.length > 5 && (
                    <p className="text-[10px] text-emerald-700 italic pt-1">
                      + {convertTarget.rows.length - 5} more companies...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
