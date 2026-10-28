import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Database,
} from 'lucide-react';
import { downloadImportTemplate, exportRecordsToExcel } from './utils/excelImportExport';
import { parseExcelFile, normalizePhone } from './utils/excelImportParser';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { dataService, leadsService, adminService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LogOutreachModal } from './LogOutreachModal';
import { ActivityHistoryModal } from './ActivityHistoryModal';
import { RepLeaderboardModal } from './RepLeaderboardModal';
import { RepPerformanceCockpit } from './RepPerformanceCockpit';
import { ImportDataDetailPage } from './ImportDataDetailPage';
import { RepOutreachHistoryModal } from './RepOutreachHistoryModal';
import { CrmMailComposerModal } from '../../components/communication/CrmMailComposerModal';
import { EditCompanyModal } from './components/EditCompanyModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ConvertToLeadModal } from './components/ConvertToLeadModal';
import { StagedDataPreview } from './components/StagedDataPreview';
import { DatabaseMetricsCards } from './components/DatabaseMetricsCards';
import { DatabaseFilterBar } from './components/DatabaseFilterBar';
import { DatabaseProspectsTable } from './components/DatabaseProspectsTable';

const STORAGE_KEY = 'crm_imported_excel_records';

// Safely persist records to localStorage with quota-guarding and graceful fallback
const safePersistToStorage = (key, data) => {
  if (!key) return;
  try {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[safePersistToStorage] Direct write to ${key} failed (quota likely exceeded):`, err?.message || err);
    try {
      if (Array.isArray(data) && data.length > 1000) {
        const trimmed = data.slice(0, 1000);
        localStorage.setItem(key, JSON.stringify(trimmed));
        console.info(`[safePersistToStorage] Stored trimmed list (1000 items) for ${key}`);
      }
    } catch {
      // ignore
    }
  }
};


const STATUS_OPTIONS = [
  'New',
  'Connected',
  'Interested',
  'Not Interested',
  'Callback Requested',
  'Not picking',
  'Did not turn up',
  'Meeting Scheduled',
  'Lost',
  'Other',
];

const getStatusBadgeStyle = (val) => {
  const s = String(val || '').toLowerCase().trim();
  if (s === 'connected') return 'bg-sky-50 text-sky-700 border-sky-300 focus:ring-sky-400';
  if (s === 'interested') return 'bg-emerald-50 text-emerald-700 border-emerald-300 focus:ring-emerald-400';
  if (s === 'not interested' || s === 'notinterested' || s === 'lost') return 'bg-rose-50 text-rose-700 border-rose-300 focus:ring-rose-400';
  if (s.includes('converted')) return 'bg-teal-50 text-teal-700 border-teal-300 focus:ring-teal-400';
  if (s.includes('turn up') || s.includes('not picking') || s.includes('callback') || s.includes('rnr')) return 'bg-amber-50 text-amber-700 border-amber-300 focus:ring-amber-400';
  if (s === 'meeting scheduled') return 'bg-purple-50 text-purple-700 border-purple-300 focus:ring-purple-400';
  if (s === 'new') return 'bg-blue-50 text-blue-700 border-blue-300 focus:ring-blue-400';
  return 'bg-slate-50 text-slate-700 border-slate-300 focus:ring-slate-400';
};

// Format local date as YYYY-MM-DD
const formatLocalDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Check if an item matches the date filter
const isRecordInDateFilter = (item, filter, from, to, type = 'updatedAt') => {
  if (filter === 'all') return true;

  let rawDate;
  if (type === 'createdAt') {
    rawDate = item?.createdAt || item?.date;
  } else {
    rawDate = item?.updatedAt || item?.lastContactedAt || item?.date || item?.createdAt;
  }
  if (!rawDate) return false;

  try {
    const itemDate = new Date(rawDate);
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
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      const seen = new Set();
      return parsed.filter((r) => {
        const k = [
          (r.companyName || '').trim().toLowerCase(),
          (r.mobileNo || '').trim().replace(/\D/g, '').slice(-10),
          (r.emailId || '').trim().toLowerCase(),
        ].join('|');
        if (k === '||') return true;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
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

  const [selectedIds, setSelectedIds] = useState([]);
  const [sortDirection, setSortDirection] = useState('desc'); // 'desc' | 'asc'
  const [dateFilter, setDateFilter] = useState('today'); // 'all' | 'today' | '2days' | '5days' | 'custom'
  const [dateFilterType, setDateFilterType] = useState('updatedAt'); // 'updatedAt' | 'createdAt'
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [isDateTypeDropdownOpen, setIsDateTypeDropdownOpen] = useState(false);
  const dateDropdownRef = useRef(null);
  const dateTypeDropdownRef = useRef(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const [serverPagination, setServerPagination] = useState({
    total: 0,
    totalAll: 0,
    page: 1,
    limit: 50,
    totalPages: 1,
  });
  const [serverMetrics, setServerMetrics] = useState({
    totalAll: 0,
    totalMatching: 0,
    todayCount: 0,
    convertedCount: 0,
    statusChangedCount: 0,
    sources: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target)) {
        setIsDateDropdownOpen(false);
      }
      if (dateTypeDropdownRef.current && !dateTypeDropdownRef.current.contains(e.target)) {
        setIsDateTypeDropdownOpen(false);
      }
    };
    if (isDateDropdownOpen || isDateTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDateDropdownOpen, isDateTypeDropdownOpen]);

  // Pagination state (default: 50, options: 50, 80, 100)
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [showConvertedOnly, setShowConvertedOnly] = useState(false);
  const [showStatusChangedOnly, setShowStatusChangedOnly] = useState(false);

  // Outreach & Performance Tracking State
  const [outreachRow, setOutreachRow] = useState(null);
  const [outreachInitialType, setOutreachInitialType] = useState('call');
  const [mailComposerRow, setMailComposerRow] = useState(null);
  const [historyRow, setHistoryRow] = useState(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardInitialTab, setLeaderboardInitialTab] = useState('leaderboard');
  const [selectedDetailRecord, setSelectedDetailRecord] = useState(null);
  const [detailInitialTab, setDetailInitialTab] = useState('overview');
  const [detailFocusedActivityId, setDetailFocusedActivityId] = useState(null);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const actionMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setOpenActionMenuId(null);
      }
    };
    if (openActionMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openActionMenuId]);
  const [historyUserModal, setHistoryUserModal] = useState({
    isOpen: false,
    rep: null,
    fromLeaderboard: false,
    initialChannelType: 'all',
    initialOutcome: 'all',
    initialDateRange: 'today',
  });

  const handleOpenUserHistory = (repInfo, fromLeaderboard = false, initialFilters = {}) => {
    if (!repInfo) return;
    const rep = typeof repInfo === 'string'
      ? { userName: repInfo }
      : {
        userName: repInfo.userName || repInfo.name || 'Representative',
        userId: repInfo.userId || repInfo._id || null,
        email: repInfo.email || '',
        avatar: repInfo.avatar || repInfo.profilePicture || '',
        isAll: Boolean(repInfo.isAll),
      };
    setHistoryUserModal({
      isOpen: true,
      rep,
      fromLeaderboard,
      initialChannelType: initialFilters.channelType || 'all',
      initialOutcome: initialFilters.outcome || 'all',
      initialDateRange: initialFilters.dateRange || 'today',
      initialCustomFrom: initialFilters.customFrom || '',
      initialCustomTo: initialFilters.customTo || '',
    });
    if (fromLeaderboard) {
      setIsLeaderboardOpen(false);
    }
  };

  const handleOpenMetricHistory = ({ channelType = 'all', outcome = 'all', dateRange = 'today', rep }) => {
    const targetRep = rep || (canViewAll
      ? { userName: 'All Team Telemetry', isAll: true }
      : { userName: currentUserName || 'My History', userId: user?._id });

    setHistoryUserModal({
      isOpen: true,
      rep: targetRep,
      fromLeaderboard: false,
      initialChannelType: channelType,
      initialOutcome: outcome,
      initialDateRange: dateRange,
    });
  };

  const handleToggleConvertedFilter = () => {
    setShowConvertedOnly((prev) => {
      const next = !prev;
      if (next) {
        setShowStatusChangedOnly(false);
        toast.success('Filtering table by Converted Leads');
      } else {
        toast('Showing all imported records');
      }
      return next;
    });
    const tableEl = document.querySelector('table');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleToggleStatusChangedFilter = () => {
    setShowStatusChangedOnly((prev) => {
      const next = !prev;
      if (next) {
        setShowConvertedOnly(false);
        toast.success('Filtering table by Companies with Status Changes');
      } else {
        toast('Showing all imported records');
      }
      return next;
    });
    const tableEl = document.querySelector('table');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleBackToLeaderboard = () => {
    setHistoryUserModal({ isOpen: false, rep: null, fromLeaderboard: false });
    setIsLeaderboardOpen(true);
  };

  const handleOpenOutreach = async (row, type = 'call') => {
    let targetRow = row;
    const targetId = row?._id || row?.id;
    if (targetId && !row?.mobileNo && !row?.emailId) {
      try {
        const res = await dataService.getImportDataById(targetId, {
          companyName: row.companyName,
        });
        if (res?.success && res.data) {
          targetRow = { ...row, ...res.data };
        }
      } catch {
        // fallback
      }
    }
    if (type === 'email') {
      setMailComposerRow(targetRow);
      return;
    }
    setOutreachRow(targetRow);
    setOutreachInitialType(type);
  };

  const handleOpenHistory = (row) => {
    setHistoryRow(row);
  };

  const handleOutreachSuccess = (updatedRecord) => {
    if (!updatedRecord) return;
    setRecords((prev) =>
      prev.map((r) => {
        const isMatch =
          (updatedRecord.id && r.id === updatedRecord.id) ||
          (updatedRecord._id && (r._id === updatedRecord._id || r.id === String(updatedRecord._id)));
        if (isMatch) {
          return {
            ...r,
            ...updatedRecord,
            callCount: updatedRecord.callCount !== undefined ? updatedRecord.callCount : (r.callCount || 0),
            whatsappCount: updatedRecord.whatsappCount !== undefined ? updatedRecord.whatsappCount : (r.whatsappCount || 0),
            emailCount: updatedRecord.emailCount !== undefined ? updatedRecord.emailCount : (r.emailCount || 0),
            lastOutcome: updatedRecord.lastOutcome || r.lastOutcome,
            lastContactedAt: updatedRecord.lastContactedAt || new Date().toISOString(),
            nextFollowUpAt: updatedRecord.nextFollowUpAt || r.nextFollowUpAt,
          };
        }
        return r;
      })
    );
  };

  const handleSelectRepFromLeaderboard = (repName) => {
    if (!repName) return;
    setSelectedUsers([repName]);
    toast.success(`Filtering table by representative: ${repName}`);
  };

  // Imported By User Filter state (Active users only, multi-select with search)
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]); // array of selected user names
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userFilterSearch, setUserFilterSearch] = useState('');
  const userDropdownRef = useRef(null);

  // Status Filter state (multi-select)
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);

  // Source Filter state (multi-select with search)
  const [selectedSources, setSelectedSources] = useState([]);
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  const [sourceFilterSearch, setSourceFilterSearch] = useState('');
  const sourceDropdownRef = useRef(null);

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
    safePersistToStorage(userStorageKey, records);
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

  // Handle clicking outside filter dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setIsUserDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
        setIsStatusDropdownOpen(false);
      }
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target)) {
        setIsSourceDropdownOpen(false);
      }
    };
    if (isUserDropdownOpen || isStatusDropdownOpen || isSourceDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserDropdownOpen, isStatusDropdownOpen, isSourceDropdownOpen]);

  // Consolidated list of active users available to filter (strictly active only)
  const activeUserOptions = useMemo(() => {
    const userMap = new Map();

    // 1. Add strictly active users from API
    availableUsers.forEach((u) => {
      const name = (u.name || `${u.firstName || ''} ${u.lastName || ''}`).trim();
      if (name) {
        userMap.set(name.toLowerCase(), {
          id: String(u._id || name),
          name,
          email: u.email || '',
        });
      }
    });

    // 2. Add users who have imported records in the workspace (so Admin can filter by any user who imported data)
    records.forEach((r) => {
      const name = (r.importedBy || '').trim();
      if (name && !userMap.has(name.toLowerCase())) {
        userMap.set(name.toLowerCase(), {
          id: r.importedByUserId ? String(r.importedByUserId) : name,
          name,
          email: '',
        });
      }
    });

    // 3. Ensure current logged-in user is in the options
    if (currentUserName && currentUserName !== 'Admin') {
      if (!userMap.has(currentUserName.toLowerCase())) {
        userMap.set(currentUserName.toLowerCase(), {
          id: user?._id ? String(user._id) : currentUserName,
          name: currentUserName,
          email: user?.email || '',
        });
      }
    }

    return Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [availableUsers, currentUserName, user, records]);

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

  const isSyncingRef = useRef(false);
  const isVerifyingRef = useRef(false);
  const lastVerifiedSignatureRef = useRef('');
  const initialMountCheckDoneRef = useRef(false);
  const recordsRef = useRef(records);

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  // Helper to generate a fingerprint of records to avoid redundant duplicate checks
  const getRecordsSignature = (recs) => {
    if (!recs || recs.length === 0) return '';
    const len = recs.length;
    const firstId = recs[0]?.id || recs[0]?._id || '';
    const lastId = recs[len - 1]?.id || recs[len - 1]?._id || '';
    return `${len}:${firstId}:${lastId}`;
  };

  // Verify lead status against CRM database
  const verifyLeadsStatus = useCallback(async (currentRecords, force = false) => {
    if (!currentRecords || currentRecords.length === 0) return;
    const signature = getRecordsSignature(currentRecords);
    if (!force && lastVerifiedSignatureRef.current === signature) {
      return; // Already verified this exact dataset against CRM
    }
    if (isVerifyingRef.current) return;

    isVerifyingRef.current = true;
    try {
      const dupRes = await leadsService.checkDuplicatesBatch(currentRecords);
      if (dupRes?.success && Array.isArray(dupRes.results)) {
        lastVerifiedSignatureRef.current = signature;
        const leadMap = new Map(dupRes.results.map((r) => [r.id, r]));
        setRecords((prev) => {
          let hasChanges = false;
          const next = prev.map((row) => {
            const res = leadMap.get(row.id);
            if (!res) return row;
            const inCrm = Boolean(res.existsInCrm);
            const targetLeadId = inCrm ? (res.leadId || row.leadId) : null;
            const targetReason = inCrm ? (row.duplicateReason || 'In CRM') : '';

            if (
              row.isConvertedToLead !== inCrm ||
              row.leadId !== targetLeadId ||
              row.duplicateReason !== targetReason
            ) {
              hasChanges = true;
              return {
                ...row,
                isConvertedToLead: inCrm,
                leadId: targetLeadId,
                duplicateReason: targetReason,
              };
            }
            return row;
          });

          // Strictly preserve array reference if no changes occurred
          return hasChanges ? next : prev;
        });
      }
    } catch (err) {
      console.warn('Failed to verify converted leads against CRM database:', err);
    } finally {
      isVerifyingRef.current = false;
    }
  }, []);

  const requestIdRef = useRef(0);
  // Fetch active import data from server and reconcile with workspace
  const syncWithServer = useCallback(async (forceVerify = false) => {
    const currentReqId = ++requestIdRef.current;
    try {
      const params = {
        page: currentPage,
        limit: pageSize,
        dateFilter,
        dateFilterType,
        sortBy: dateFilterType === 'createdAt' ? 'createdAt' : 'updatedAt',
        sortOrder: sortDirection,
      };

      if (dateFilter === 'custom') {
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;
      }

      if (debouncedSearch && debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      if (selectedUsers && selectedUsers.length > 0) {
        params.importedBy = selectedUsers.join(',');
      }

      if (selectedStatuses && selectedStatuses.length > 0) {
        params.status = selectedStatuses.join(',');
      }

      if (selectedSources && selectedSources.length > 0) {
        params.source = selectedSources.join(',');
      }

      if (showConvertedOnly) {
        params.showConvertedOnly = 'true';
      }

      if (showStatusChangedOnly) {
        params.showStatusChangedOnly = 'true';
      }

      const res = await dataService.getImportData(params);
      if (currentReqId !== requestIdRef.current) return;

      if (res?.success && Array.isArray(res.data)) {
        const serverRows = res.data;
        const mappedServer = serverRows.map((s) => ({
          ...s,
          importedBy: s.importedBy || (canViewAll ? '' : currentUserName),
          importedByUserId: s.importedByUserId || null,
        }));
        setRecords(mappedServer);
        safePersistToStorage(userStorageKey, mappedServer);

        if (res.pagination) {
          setServerPagination(res.pagination);
        }
        if (res.metrics) {
          setServerMetrics(res.metrics);
        }

        // Verify CRM lead status for the fresh server records once
        verifyLeadsStatus(mappedServer, forceVerify);
      }
    } catch (err) {
      if (currentReqId === requestIdRef.current) {
        console.warn('Failed to sync import data from server:', err);
      }
    }
  }, [
    currentPage,
    pageSize,
    dateFilter,
    dateFilterType,
    fromDate,
    toDate,
    debouncedSearch,
    selectedUsers,
    selectedStatuses,
    selectedSources,
    showConvertedOnly,
    showStatusChangedOnly,
    sortDirection,
    canViewAll,
    currentUserName,
    userStorageKey,
    verifyLeadsStatus,
  ]);

  useEffect(() => {
    syncWithServer();

    // If records were restored from local storage on mount before server response, verify them once
    if (!initialMountCheckDoneRef.current && recordsRef.current && recordsRef.current.length > 0) {
      initialMountCheckDoneRef.current = true;
      verifyLeadsStatus(recordsRef.current);
    }

    let lastFocusTime = 0;
    const handleFocus = () => {
      const now = Date.now();
      // Throttle focus handler to at most once every 30 seconds
      if (now - lastFocusTime < 30000) return;
      lastFocusTime = now;
      syncWithServer();
    };

    const handleDataUpdated = () => {
      syncWithServer(true);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('crm:import-data-updated', handleDataUpdated);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('crm:import-data-updated', handleDataUpdated);
    };
  }, [syncWithServer, verifyLeadsStatus]);

  const handleFileUpload = async (file) => {
    if (!file) return;
    try {
      let fullExisting = records;
      try {
        const fullRes = await dataService.getImportData({ all: 'true' });
        if (fullRes?.success && Array.isArray(fullRes.data)) {
          fullExisting = fullRes.data;
        }
      } catch (e) {
        console.warn('Could not fetch all records for duplicate check, falling back to loaded records', e);
      }
      const staged = await parseExcelFile(file, fullExisting, currentUserName, user);
      setStagedData(staged);
      setShowPreview(true);
      setPreviewTab('all');

      if (staged.duplicateCount > 0 || staged.updateCount > 0) {
        toast(
          `Excel parsed: ${staged.totalRowsFetched} rows fetched (${staged.newCount} new, ${staged.updateCount} to update${staged.duplicateCount > 0 ? `, ${staged.duplicateCount} duplicate(s) in sheet skipped` : ''}).`,
          { icon: 'ℹ️', duration: 4000 }
        );
      } else {
        toast.success(`File ready: ${staged.totalRowsFetched} rows fetched (${staged.newCount} new)!`);
      }
    } catch (err) {
      console.error('Failed to parse Excel file:', err);
      toast.error('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
    }
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
      const actuallyModifiedRows = [];

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
          const newStatus = uRow.status || uRow.leadStatus || ex.status || ex.leadStatus || 'New';
          const newSource = uRow.source || uRow.leadSource || ex.source || ex.leadSource || '';
          const isConverted = newStatus.toLowerCase().includes('converted') || Boolean(uRow.isConvertedToLead || ex.isConvertedToLead);

          // Consolidate & deduplicate contacts between existing record and incoming update
          const existingContacts = Array.isArray(ex.contacts) && ex.contacts.length > 0
            ? [...ex.contacts]
            : ((ex.contactPerson || ex.mobileNo || ex.emailId)
              ? [{
                contactPerson: ex.contactPerson || '',
                designation: ex.designation || '',
                mobileNo: ex.mobileNo || '',
                emailId: ex.emailId || '',
                isPrimary: true,
              }]
              : []);

          const incomingContacts = Array.isArray(uRow.contacts) && uRow.contacts.length > 0
            ? uRow.contacts
            : ((uRow.contactPerson || uRow.mobileNo || uRow.emailId)
              ? [{
                contactPerson: uRow.contactPerson || '',
                designation: uRow.designation || '',
                mobileNo: uRow.mobileNo || '',
                emailId: uRow.emailId || '',
                isPrimary: false,
              }]
              : []);

          const mergedContacts = [...existingContacts];
          incomingContacts.forEach((ic) => {
            const icPhone = normalizePhone(ic.mobileNo);
            const icEmail = (ic.emailId || '').trim().toLowerCase();
            const icName = (ic.contactPerson || '').trim().toLowerCase();

            const isDuplicateContact = mergedContacts.some((ec) => {
              const ecPhone = normalizePhone(ec.mobileNo);
              const ecEmail = (ec.emailId || '').trim().toLowerCase();
              const ecName = (ec.contactPerson || '').trim().toLowerCase();
              if (icPhone && ecPhone && icPhone === ecPhone) return true;
              if (icEmail && ecEmail && icEmail === ecEmail) return true;
              if (icName && ecName && icName === ecName && (!icPhone || !ecPhone)) return true;
              return false;
            });

            if (!isDuplicateContact) {
              mergedContacts.push({
                ...ic,
                isPrimary: mergedContacts.length === 0,
              });
            }
          });

          const primaryContact = mergedContacts.find((c) => c.isPrimary) || mergedContacts[0] || null;

          updatedList[matchIdx] = {
            ...ex,
            companyName: uRow.companyName || ex.companyName,
            gstin: uRow.gstin || ex.gstin || '',
            dateOfRegistration: uRow.dateOfRegistration !== undefined ? uRow.dateOfRegistration : (ex.dateOfRegistration || ''),
            industry: uRow.industry || ex.industry,
            address: uRow.address || ex.address,
            rating: uRow.rating || ex.rating,
            contactPerson: ex.contactPerson || primaryContact?.contactPerson || uRow.contactPerson || '',
            designation: ex.designation || primaryContact?.designation || uRow.designation || '',
            mobileNo: ex.mobileNo || primaryContact?.mobileNo || uRow.mobileNo || '',
            emailId: ex.emailId || primaryContact?.emailId || uRow.emailId || '',
            contacts: mergedContacts,
            remarks: uRow.remarks || ex.remarks,
            status: newStatus,
            leadStatus: newStatus,
            source: newSource,
            leadSource: newSource,
            date: uRow.date || ex.date,
            updatedAt: new Date().toISOString(),
            isConvertedToLead: isConverted,
            leadId: isConverted ? (uRow.leadId || ex.leadId || null) : (ex.leadId || null),
            importedBy: uRow.importedBy || ex.importedBy || currentUserName,
            importedByUserId: uRow.importedByUserId || ex.importedByUserId || null,
          };
          actuallyModifiedRows.push(updatedList[matchIdx]);
        } else {
          unshiftedUpdates.push({
            ...uRow,
            contacts: Array.isArray(uRow.contacts) && uRow.contacts.length > 0
              ? uRow.contacts
              : ((uRow.contactPerson || uRow.mobileNo || uRow.emailId)
                ? [{
                  contactPerson: uRow.contactPerson || '',
                  designation: uRow.designation || '',
                  mobileNo: uRow.mobileNo || '',
                  emailId: uRow.emailId || '',
                  isPrimary: true,
                }]
                : []),
            status: uRow.status || uRow.leadStatus || 'New',
            leadStatus: uRow.status || uRow.leadStatus || 'New',
            source: uRow.source || uRow.leadSource || '',
            leadSource: uRow.source || uRow.leadSource || '',
            createdAt: uRow.createdAt || uRow.date || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            importedBy: uRow.importedBy || currentUserName,
            importedByUserId: uRow.importedByUserId || user?._id || null,
          });
        }
      });

      const newRowsWithUser = newRows.map((r) => ({
        ...r,
        contacts: Array.isArray(r.contacts) && r.contacts.length > 0
          ? r.contacts
          : ((r.contactPerson || r.mobileNo || r.emailId)
            ? [{
              contactPerson: r.contactPerson || '',
              designation: r.designation || '',
              mobileNo: r.mobileNo || '',
              emailId: r.emailId || '',
              isPrimary: true,
            }]
            : []),
        status: r.status || r.leadStatus || 'New',
        leadStatus: r.status || r.leadStatus || 'New',
        source: r.source || r.leadSource || '',
        leadSource: r.source || r.leadSource || '',
        createdAt: r.createdAt || r.date || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        importedBy: r.importedBy || currentUserName,
        importedByUserId: r.importedByUserId || user?._id || null,
      }));

      const combined = [...newRowsWithUser, ...unshiftedUpdates, ...updatedList];

      // Sync ONLY newly imported and actually updated records with server (not all existing records)
      const rowsToSync = [...newRowsWithUser, ...unshiftedUpdates, ...actuallyModifiedRows];
      if (rowsToSync.length > 0) {
        dataService.syncImportData(rowsToSync).catch((err) => {
          console.warn('Failed to sync import records with server:', err);
        });
      }

      return combined;
    });

    // Persist Excel file record when user hits confirm import (store once)
    if (stagedData && !stagedData._isSaving) {
      stagedData._isSaving = true;

      const fileRecordToSave = {
        fileName: stagedData.fileName,
        fileSize: stagedData.fileSize || '',
        fileSizeBytes: stagedData.fileSizeBytes || 0,
        totalRowsFetched: stagedData.totalRowsFetched || stagedData.rows?.length || 0,
        totalCompanies: stagedData.rows?.length || 0,
        newCount: newRows.length,
        updateCount: updateRows.length,
        duplicateCount: stagedData.duplicateCount || 0,
        importedBy: currentUserName,
        importMode: mode,
        fileData: stagedData.fileData || '',
        createdAt: new Date().toISOString(),
      };

      // Save directly to backend database
      dataService.saveExcelFile(fileRecordToSave)
        .then((res) => {
          if (res && res.data) {
            // Keep local storage in sync using the real MongoDB record ID (prevent duplicate entries)
            try {
              const storedKey = 'crm_stored_excel_files';
              const existing = JSON.parse(localStorage.getItem(storedKey) || '[]');
              const filtered = existing.filter(
                (item) => item._id !== res.data._id && item.fileName !== fileRecordToSave.fileName
              );
              localStorage.setItem(storedKey, JSON.stringify([res.data, ...filtered]));
            } catch {
              // ignore
            }
          }
        })
        .catch((err) => {
          console.warn('Backend save failed, saving to local cache as offline fallback:', err);
          try {
            const storedKey = 'crm_stored_excel_files';
            const existing = JSON.parse(localStorage.getItem(storedKey) || '[]');
            const filtered = existing.filter((item) => item.fileName !== fileRecordToSave.fileName);
            localStorage.setItem(
              storedKey,
              JSON.stringify([{ _id: 'local_' + Date.now(), ...fileRecordToSave }, ...filtered])
            );
          } catch {
            // ignore
          }
        });
    }

    setSelectedIds([]);
    setStagedData(null);
    syncWithServer(true);

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

  // Download Sample Template
  const handleDownloadTemplate = () => downloadImportTemplate();

  // Export Database records to Excel (.xlsx)
  const handleExportData = async () => {
    let rowsToExport = [];
    if (selectedIds.length > 0) {
      rowsToExport = records.filter((r) => selectedIds.includes(r.id));
      if (rowsToExport.length === 0) {
        toast.error('None of the selected records match.');
        return;
      }
    } else {
      toast('Preparing export for all matching records...', { icon: '⏳' });
      try {
        const params = {
          all: 'true',
          dateFilter,
          dateFilterType,
          sortBy: dateFilterType === 'createdAt' ? 'createdAt' : 'updatedAt',
          sortOrder: sortDirection,
        };
        if (dateFilter === 'custom') {
          if (fromDate) params.fromDate = fromDate;
          if (toDate) params.toDate = toDate;
        }
        if (debouncedSearch && debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (selectedUsers && selectedUsers.length > 0) params.importedBy = selectedUsers.join(',');
        if (selectedStatuses && selectedStatuses.length > 0) params.status = selectedStatuses.join(',');
        if (selectedSources && selectedSources.length > 0) params.source = selectedSources.join(',');
        if (showConvertedOnly) params.showConvertedOnly = 'true';
        if (showStatusChangedOnly) params.showStatusChangedOnly = 'true';

        const res = await dataService.getImportData(params);
        if (res?.success && Array.isArray(res.data)) {
          rowsToExport = res.data;
        } else {
          rowsToExport = records;
        }
      } catch (e) {
        console.warn('Failed to fetch full matching records for export', e);
        rowsToExport = records;
      }
    }
    await exportRecordsToExcel({ rowsToExport, dateFilter });
  };

  // Helper to check if a row is converted to lead in CRM
  const isConvertedLead = (row) => Boolean(row?.isConvertedToLead);

  // Helper to check if a row has had an actual status change (excluding untouched initial status)
  const isStatusChangedRecord = (row) => {
    if (!row || !Array.isArray(row.statusHistory) || row.statusHistory.length === 0) {
      return false;
    }
    // Only return true if there is an actual transition from an initial status to another status
    return row.statusHistory.some((h) => {
      if (!h) return false;
      // Exclude baseline initial status entries
      if (h.note === 'Initial status on import' || h.previousStatus === '') {
        return false;
      }
      if (h.previousStatus && h.status && h.previousStatus !== h.status) {
        return true;
      }
      return Boolean(h.previousStatus);
    });
  };



  // Dynamic label & info for the active date filter
  const dateFilterInfo = useMemo(() => {
    const basisLabel = dateFilterType === 'createdAt' ? 'Created' : 'Updated';
    switch (dateFilter) {
      case 'today':
        return {
          title: `${basisLabel} Today`,
          badge: 'Today',
          description: `Records ${basisLabel.toLowerCase()} today`,
        };
      case '2days':
        return {
          title: `${basisLabel} (Last 2 Days)`,
          badge: 'Last 2 Days',
          description: `Records ${basisLabel.toLowerCase()} in the last 48 hours`,
        };
      case '5days':
        return {
          title: `${basisLabel} (Last 5 Days)`,
          badge: 'Last 5 Days',
          description: `Records ${basisLabel.toLowerCase()} in the last 5 days`,
        };
      case 'custom':
        return {
          title: `${basisLabel} (Custom Range)`,
          badge: 'Custom',
          description:
            fromDate && toDate
              ? `${fromDate} to ${toDate}`
              : fromDate
                ? `From ${fromDate}`
                : toDate
                  ? `Up to ${toDate}`
                  : `Custom ${basisLabel.toLowerCase()} date window`,
        };
      default:
        return {
          title: `${basisLabel} Today`,
          badge: 'Today',
          description: `Click to filter today’s records (${basisLabel.toLowerCase()})`,
        };
    }
  }, [dateFilter, fromDate, toDate, dateFilterType]);

  // Scoped metrics & counts from server
  const totalDataCount = serverMetrics.totalAll || serverPagination.totalAll || serverPagination.total || records.length;
  const dateFilteredCount = serverPagination.total ?? records.length;
  const todayFilteredCount = serverMetrics.todayCount ?? (dateFilter === 'today' ? dateFilteredCount : 0);
  const dateFilteredConvertedCount = serverMetrics.convertedCount ?? 0;
  const dateFilteredStatusChangedCount = serverMetrics.statusChangedCount ?? 0;

  // Status Filter options & live counts
  const allFilterableStatuses = useMemo(() => {
    const list = [...STATUS_OPTIONS, 'Converted to Lead'];
    records.forEach((r) => {
      const st = r.status || r.leadStatus;
      if (st && !list.some((x) => x.toLowerCase() === st.toLowerCase())) {
        list.push(st);
      }
    });
    return list;
  }, [records]);

  const statusCounts = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const s = r.isConvertedToLead ? 'Converted to Lead' : (r.status || r.leadStatus || 'New');
      map[s] = (map[s] || 0) + 1;
    });
    return map;
  }, [records]);

  // Source Filter options & live counts (combining all DB sources from metrics with current page)
  const availableSources = useMemo(() => {
    const map = {};
    (serverMetrics.sources || []).forEach((src) => {
      if (src) map[src] = 0;
    });
    records.forEach((r) => {
      const src = (r.source || r.leadSource || '').trim();
      if (src) map[src] = (map[src] || 0) + 1;
    });
    return Object.keys(map).sort((a, b) => a.localeCompare(b)).map((name) => ({
      name,
      count: map[name] || 0,
    }));
  }, [serverMetrics.sources, records]);

  const filteredSourceOptions = useMemo(() => {
    if (!sourceFilterSearch.trim()) return availableSources;
    const q = sourceFilterSearch.toLowerCase();
    return availableSources.filter((item) => item.name.toLowerCase().includes(q));
  }, [availableSources, sourceFilterSearch]);

  const handleToggleStatus = (statusName) => {
    setSelectedStatuses((prev) =>
      prev.includes(statusName) ? prev.filter((s) => s !== statusName) : [...prev, statusName]
    );
  };

  const handleToggleSource = (srcName) => {
    setSelectedSources((prev) =>
      prev.includes(srcName) ? prev.filter((s) => s !== srcName) : [...prev, srcName]
    );
  };

  // Check if any non-default filters are applied
  const hasActiveFilters = useMemo(() => {
    return (
      dateFilter !== 'today' ||
      dateFilterType !== 'updatedAt' ||
      selectedUsers.length > 0 ||
      selectedStatuses.length > 0 ||
      selectedSources.length > 0 ||
      Boolean(searchQuery.trim()) ||
      Boolean(fromDate) ||
      Boolean(toDate) ||
      showConvertedOnly ||
      showStatusChangedOnly
    );
  }, [dateFilter, dateFilterType, selectedUsers, selectedStatuses, selectedSources, searchQuery, fromDate, toDate, showConvertedOnly, showStatusChangedOnly]);

  // Reset all filters to default state (Today, Updated At)
  const handleClearAllFilters = () => {
    setDateFilter('today');
    setDateFilterType('updatedAt');
    setFromDate('');
    setToDate('');
    setSelectedUsers([]);
    setSelectedStatuses([]);
    setSelectedSources([]);
    setSearchQuery('');
    setShowConvertedOnly(false);
    setShowStatusChangedOnly(false);
    toast.success('Filters cleared (Reset to Today, Updated At)');
  };

  // Reset to first page when any filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, dateFilterType, fromDate, toDate, selectedUsers, selectedStatuses, selectedSources, debouncedSearch, sortDirection, showConvertedOnly, showStatusChangedOnly]);

  // Pagination calculation
  const totalMatchingRecords = serverPagination.total ?? records.length;
  const totalPages = Math.max(1, serverPagination.totalPages || Math.ceil(totalMatchingRecords / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Paginated records directly from server
  const paginatedRecords = records;

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

  // Change status of a record directly from table dropdown
  const handleStatusChange = async (row, newStatus) => {
    if (!row || !newStatus) return;
    if (newStatus === 'Converted to Lead') {
      handleOpenConvertSingle(row);
      return;
    }
    const oldStatus = row.status || row.leadStatus || 'New';
    if (oldStatus === newStatus) return;

    const rowId = row._id || row.id;

    // Optimistically update local state & localStorage
    setRecords((prev) => {
      const nowIso = new Date().toISOString();
      const historyEntry = {
        status: newStatus,
        previousStatus: oldStatus,
        changedAt: nowIso,
        changedBy: currentUserName || 'You',
        note: '',
      };
      const next = prev.map((r) =>
        r.id === row.id
          ? {
            ...r,
            status: newStatus,
            leadStatus: newStatus,
            updatedAt: nowIso,
            statusHistory: [historyEntry, ...(Array.isArray(r.statusHistory) ? r.statusHistory : [])],
          }
          : r
      );
      safePersistToStorage(userStorageKey, next);
      return next;
    });

    try {
      await dataService.updateImportDataStatus(rowId, newStatus);
      toast.success(`Status updated to "${newStatus}"`);
    } catch (err) {
      console.error('Failed to update status on server:', err);
      toast.error('Failed to update status on server');
      // Revert optimistic update
      setRecords((prev) => {
        const reverted = prev.map((r) =>
          r.id === row.id ? { ...r, status: oldStatus, leadStatus: oldStatus } : r
        );
        safePersistToStorage(userStorageKey, reverted);
        return reverted;
      });
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
    return records.filter((r) => !r.isDuplicate).map((r) => r.id);
  }, [records]);

  const handleSelectOnlyNew = () => {
    setSelectedIds(nonDuplicateIds);
    toast.success(`Selected ${nonDuplicateIds.length} new records.`);
  };

  const isAllSelected =
    paginatedRecords.length > 0 &&
    paginatedRecords.every((r) => selectedIds.includes(r.id));

  // Bulk status change & actions menu
  const [bulkStatusValue, setBulkStatusValue] = useState('');
  const [isBulkStatusLoading, setIsBulkStatusLoading] = useState(false);
  const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);
  const bulkMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target)) {
        setIsBulkMenuOpen(false);
      }
    };
    if (isBulkMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBulkMenuOpen]);

  const handleBulkStatusChange = async (targetStatus) => {
    const statusToApply = targetStatus || bulkStatusValue;
    if (!statusToApply || selectedIds.length === 0) return;
    const targets = records.filter(
      (r) => selectedIds.includes(r.id) && !r.isDuplicate
    );
    if (targets.length === 0) {
      toast.error('No eligible rows selected (duplicates are skipped).');
      return;
    }
    setIsBulkStatusLoading(true);
    const oldStatuses = Object.fromEntries(targets.map((r) => [r.id, r.status || r.leadStatus || 'New']));
    // Optimistic update
    setRecords((prev) => {
      const nowIso = new Date().toISOString();
      const next = prev.map((r) => {
        if (selectedIds.includes(r.id) && !r.isDuplicate) {
          const oldStatus = r.status || r.leadStatus || 'New';
          const historyEntry = {
            status: statusToApply,
            previousStatus: oldStatus,
            changedAt: nowIso,
            changedBy: currentUserName || 'You',
            note: 'Bulk status update',
          };
          return {
            ...r,
            status: statusToApply,
            leadStatus: statusToApply,
            updatedAt: nowIso,
            statusHistory: [historyEntry, ...(Array.isArray(r.statusHistory) ? r.statusHistory : [])],
          };
        }
        return r;
      });
      safePersistToStorage(userStorageKey, next);
      return next;
    });
    try {
      await Promise.all(
        targets.map((r) =>
          dataService.updateImportDataStatus(r._id || r.id, statusToApply)
        )
      );
      toast.success(`Status set to "${statusToApply}" for ${targets.length} record${targets.length === 1 ? '' : 's'}.`);
      setBulkStatusValue('');
    } catch (err) {
      console.error('Bulk status update failed:', err);
      toast.error('Failed to update status on server — changes reverted.');
      setRecords((prev) => {
        const reverted = prev.map((r) =>
          oldStatuses[r.id] !== undefined
            ? { ...r, status: oldStatuses[r.id], leadStatus: oldStatuses[r.id] }
            : r
        );
        safePersistToStorage(userStorageKey, reverted);
        return reverted;
      });
    } finally {
      setIsBulkStatusLoading(false);
    }
  };

  // Move to Lead confirmation modal state
  const [convertTarget, setConvertTarget] = useState(null); // null | { type: 'single', row } | { type: 'bulk', count, rows }

  // Open convert confirmation modal for single row
  const handleOpenConvertSingle = async (row) => {
    if (!row || row.isConvertedToLead) return;
    let targetRow = row;
    const targetId = row._id || row.id;
    if (targetId && !row.contactPerson && !row.mobileNo) {
      try {
        const res = await dataService.getImportDataById(targetId, {
          companyName: row.companyName,
        });
        if (res?.success && res.data) {
          targetRow = { ...row, ...res.data };
        }
      } catch {
        // fallback
      }
    }
    setConvertTarget({ type: 'single', row: targetRow });
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
          status: 'Converted to Lead',
          leadStatus: 'Converted to Lead',
          leadId: newLeadId,
          isDuplicate: false,
          duplicateReason: '',
        };
        setRecords((prev) =>
          prev.map((r) => (r.id === row.id ? updatedRow : r))
        );
        dataService.updateImportDataStatus(row._id || row.id, 'Converted to Lead').catch(console.warn);
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
            sentIds.has(r.id)
              ? {
                ...r,
                isConvertedToLead: true,
                status: 'Converted to Lead',
                leadStatus: 'Converted to Lead',
              }
              : r
          );
          setRecords(updated);
          Promise.all(
            selectedRows.map((r) =>
              dataService.updateImportDataStatus(r._id || r.id, 'Converted to Lead')
            )
          ).catch(console.warn);
          const convertedRows = updated.filter((r) => sentIds.has(r.id));
          if (convertedRows.length > 0) {
            dataService.syncImportData(convertedRows).catch(console.warn);
          }

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

  const handleOpenEdit = async (row) => {
    if (!row || row.isConvertedToLead) return;
    let targetRow = row;
    const targetId = row._id || row.id;
    if (targetId && !row.contactPerson && !row.mobileNo) {
      try {
        const res = await dataService.getImportDataById(targetId, {
          companyName: row.companyName,
        });
        if (res?.success && res.data) {
          targetRow = { ...row, ...res.data };
        }
      } catch {
        // fallback
      }
    }
    let dateInput = '';
    if (targetRow.date) {
      try {
        dateInput = new Date(targetRow.date).toISOString().split('T')[0];
      } catch {
        dateInput = '';
      }
    }

    const contacts = Array.isArray(targetRow.contacts) && targetRow.contacts.length > 0
      ? targetRow.contacts.map((c, i) => ({
          contactPerson: c.contactPerson || '',
          designation: c.designation || '',
          mobileNo: c.mobileNo || '',
          emailId: c.emailId || '',
          isPrimary: c.isPrimary !== undefined ? Boolean(c.isPrimary) : i === 0,
        }))
      : [{
          contactPerson: targetRow.contactPerson || '',
          designation: targetRow.designation || '',
          mobileNo: targetRow.mobileNo || targetRow.phone || '',
          emailId: targetRow.emailId || targetRow.email || '',
          isPrimary: true,
        }];

    setEditingRow({
      ...targetRow,
      contacts,
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

    const gstinVal = (editingRow.gstin || '').trim().toUpperCase();
    if (gstinVal) {
      const existingWithGstin = records.find(
        (r) =>
          r.id !== editingRow.id &&
          (r._id !== editingRow._id || !editingRow._id) &&
          (r.gstin || '').trim().toUpperCase() === gstinVal &&
          (r.companyName || '').trim().toLowerCase() !== compName.toLowerCase()
      );
      if (existingWithGstin) {
        toast.error(`Duplicate GSTIN: "${gstinVal}" is already registered to "${existingWithGstin.companyName}". GSTIN must be unique per company.`);
        return;
      }
    }

    setIsSavingEdit(true);
    try {
      const cleanedContacts = (editingRow.contacts || [])
        .map((c) => ({
          contactPerson: (c.contactPerson || '').trim(),
          designation: (c.designation || '').trim(),
          mobileNo: (c.mobileNo || '').trim(),
          emailId: (c.emailId || '').trim(),
          isPrimary: Boolean(c.isPrimary),
        }))
        .filter((c) => c.contactPerson || c.mobileNo || c.emailId || c.designation);

      const primaryContact = cleanedContacts.find((c) => c.isPrimary) || cleanedContacts[0] || {};
      const resolvedContactPerson = (primaryContact.contactPerson || editingRow.contactPerson || '').trim();
      const resolvedDesignation = (primaryContact.designation || editingRow.designation || '').trim();
      const resolvedMobile = (primaryContact.mobileNo || editingRow.mobileNo || '').trim();
      const resolvedEmail = (primaryContact.emailId || editingRow.emailId || '').trim();

      const contactName = resolvedContactPerson;
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
        jobTitle: resolvedDesignation,
        phone: resolvedMobile,
        email: resolvedEmail,
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

      let savedLeadId = editingRow.leadId || null;

      if (savedLeadId) {
        // If this record was already converted to a CRM Lead, update the linked lead document
        await leadsService.updateLead(savedLeadId, leadPayload).catch(console.warn);
      }

      const rowSource = (editingRow.source || editingRow.leadSource || '').trim();
      const isConverted = Boolean(editingRow.isConvertedToLead);

      const updatedRowData = {
        ...editingRow,
        companyName: compName,
        gstin: gstinVal,
        dateOfRegistration: (editingRow.dateOfRegistration || '').trim(),
        contactPerson: resolvedContactPerson,
        designation: resolvedDesignation,
        mobileNo: resolvedMobile,
        emailId: resolvedEmail,
        contacts: cleanedContacts.length > 0 ? cleanedContacts : (resolvedContactPerson || resolvedMobile ? [{
          contactPerson: resolvedContactPerson,
          designation: resolvedDesignation,
          mobileNo: resolvedMobile,
          emailId: resolvedEmail,
          isPrimary: true,
        }] : []),
        industry: (editingRow.industry || '').trim(),
        source: rowSource,
        leadSource: rowSource,
        rating: (editingRow.rating || '').trim(),
        address: (editingRow.address || '').trim(),
        remarks: (editingRow.remarks || '').trim(),
        date: finalDate,
        leadId: savedLeadId,
        isConvertedToLead: isConverted,
      };

      // Update in active workspace records (stays in exact same table position)
      setRecords((prev) =>
        prev.map((r) => (r.id === editingRow.id ? { ...r, ...updatedRowData } : r))
      );

      // If detail view of this company is open, update it directly
      setSelectedDetailRecord((prev) => (prev && (prev.id === editingRow.id || prev._id === editingRow._id) ? { ...prev, ...updatedRowData } : prev));

      // Sync updated row to CrmImportData on server
      dataService.syncImportData([updatedRowData]).catch((err) => {
        console.warn('Failed to sync edited prospect with server:', err);
      });

      toast.success(`Saved changes for "${compName}" successfully!`);

      // Also update in stagedData if editing a staged preview row
      if (stagedData?.rows) {
        setStagedData((prev) => {
          if (!prev) return null;
          const updatedRows = prev.rows.map((r) =>
            r.id === editingRow.id
              ? {
                ...r,
                ...updatedRowData,
                rowType: r.rowType || 'update',
              }
              : r
          );
          return { ...prev, rows: updatedRows };
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
      {selectedDetailRecord ? (
        <ImportDataDetailPage
          record={selectedDetailRecord}
          initialTab={detailInitialTab}
          focusedActivityId={detailFocusedActivityId}
          onBack={() => {
            setSelectedDetailRecord(null);
            setDetailInitialTab('overview');
            setDetailFocusedActivityId(null);
          }}
          onNavigate={onNavigate}
          onConvert={() => handleOpenConvertSingle(selectedDetailRecord)}
          onEdit={() => handleOpenEdit(selectedDetailRecord)}
          onDelete={() => {
            const r = selectedDetailRecord;
            setSelectedDetailRecord(null);
            handleOpenDeleteSingle(r);
          }}
          onUpdateRecord={(updated) => {
            if (!updated) return;
            setRecords((prev) => {
              const next = prev.map((r) => (r.id === updated.id || r._id === updated._id ? { ...r, ...updated } : r));
              safePersistToStorage(userStorageKey, next);
              return next;
            });
          }}
        />
      ) : (
        <>
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                <Database className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Database</span>
                {canViewAll ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    All Organization Records
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                    title="You have personal data visibility: you can only view records you uploaded or are assigned to."
                  >
                    Personal View (My Data Only)
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
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
                icon={FileSpreadsheet}
                onClick={handleDownloadTemplate}
                title="Download formatted sample Excel template"
              >
                Template
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
            </div>
          </div>

          {/* 2. File Selected - PREVIEW STAGE & IMPORT CONFIRMATION */}
          <StagedDataPreview
            stagedData={stagedData}
            showPreview={showPreview}
            setShowPreview={setShowPreview}
            previewTab={previewTab}
            setPreviewTab={setPreviewTab}
            visibleStagedRows={visibleStagedRows}
            onCancel={handleCancelStaged}
            onConfirmImport={handleConfirmImport}
            onEditRow={handleOpenEdit}
            getStatusBadgeStyle={getStatusBadgeStyle}
          />

          {/* 3. ACTIVE IMPORTED WORKSPACE (Once imported or ready) */}
          {(!stagedData || records.length > 0) && (
            <div className="space-y-4">
              {/* Summary Stat Cards: Total Data, Date Filter Imports, Converted to Leads */}
              <DatabaseMetricsCards
                showConvertedOnly={showConvertedOnly}
                setShowConvertedOnly={setShowConvertedOnly}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                fromDate={fromDate}
                setFromDate={setFromDate}
                toDate={toDate}
                setToDate={setToDate}
                selectedUsers={selectedUsers}
                totalDataCount={totalDataCount}
                todayFilteredCount={todayFilteredCount}
                dateFilteredCount={dateFilteredCount}
                dateFilteredConvertedCount={dateFilteredConvertedCount}
                scopedRecords={{ length: totalDataCount }}
                dateFilterInfo={dateFilterInfo}
                onNavigate={onNavigate}
              />

              {/* Real-time Outreach & Rep Performance Cockpit */}
              <RepPerformanceCockpit
                canViewAll={canViewAll}
                onOpenLeaderboard={(tab = 'leaderboard') => {
                  setLeaderboardInitialTab(tab);
                  setIsLeaderboardOpen(true);
                }}
                onOpenUserHistory={handleOpenUserHistory}
                onOpenMetricHistory={handleOpenMetricHistory}
                onToggleConvertedFilter={handleToggleConvertedFilter}
                onToggleStatusChangedFilter={handleToggleStatusChangedFilter}
                isConvertedActive={showConvertedOnly}
                isStatusChangedActive={showStatusChangedOnly}
                statusChangesCount={dateFilteredStatusChangedCount}
              />

              {/* Controls Bar: Filters, Search, Batch Actions */}
              <DatabaseFilterBar
                dateDropdownRef={dateDropdownRef}
                isDateDropdownOpen={isDateDropdownOpen}
                setIsDateDropdownOpen={setIsDateDropdownOpen}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                fromDate={fromDate}
                setFromDate={setFromDate}
                toDate={toDate}
                setToDate={setToDate}
                dateTypeDropdownRef={dateTypeDropdownRef}
                isDateTypeDropdownOpen={isDateTypeDropdownOpen}
                setIsDateTypeDropdownOpen={setIsDateTypeDropdownOpen}
                dateFilterType={dateFilterType}
                setDateFilterType={setDateFilterType}
                canViewAll={canViewAll}
                userDropdownRef={userDropdownRef}
                isUserDropdownOpen={isUserDropdownOpen}
                setIsUserDropdownOpen={setIsUserDropdownOpen}
                selectedUsers={selectedUsers}
                activeUserOptions={activeUserOptions}
                userFilterSearch={userFilterSearch}
                setUserFilterSearch={setUserFilterSearch}
                filteredUserOptions={filteredUserOptions}
                currentUserName={currentUserName}
                handleToggleUser={handleToggleUser}
                handleSelectAllUsers={handleSelectAllUsers}
                handleClearUsers={handleClearUsers}
                statusDropdownRef={statusDropdownRef}
                isStatusDropdownOpen={isStatusDropdownOpen}
                setIsStatusDropdownOpen={setIsStatusDropdownOpen}
                selectedStatuses={selectedStatuses}
                setSelectedStatuses={setSelectedStatuses}
                allFilterableStatuses={allFilterableStatuses}
                statusCounts={statusCounts}
                handleToggleStatus={handleToggleStatus}
                getStatusBadgeStyle={getStatusBadgeStyle}
                availableSources={availableSources}
                sourceDropdownRef={sourceDropdownRef}
                isSourceDropdownOpen={isSourceDropdownOpen}
                setIsSourceDropdownOpen={setIsSourceDropdownOpen}
                selectedSources={selectedSources}
                setSelectedSources={setSelectedSources}
                sourceFilterSearch={sourceFilterSearch}
                setSourceFilterSearch={setSourceFilterSearch}
                filteredSourceOptions={filteredSourceOptions}
                handleToggleSource={handleToggleSource}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                hasActiveFilters={hasActiveFilters}
                handleClearAllFilters={handleClearAllFilters}
                records={records}
                handleSelectOnlyNew={handleSelectOnlyNew}
                nonDuplicateIds={nonDuplicateIds}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                bulkMenuRef={bulkMenuRef}
                isBulkMenuOpen={isBulkMenuOpen}
                setIsBulkMenuOpen={setIsBulkMenuOpen}
                STATUS_OPTIONS={STATUS_OPTIONS}
                isBulkStatusLoading={isBulkStatusLoading}
                handleBulkStatusChange={handleBulkStatusChange}
                handleOpenDeleteSelected={handleOpenDeleteSelected}
                isSubmitting={isSubmitting}
                handleOpenConvertBulk={handleOpenConvertBulk}
              />

              {/* Prospects Data Table & Pagination Toolbar */}
              <DatabaseProspectsTable
                totalMatchingRecords={totalMatchingRecords}
                pageSize={pageSize}
                startEntry={startEntry}
                endEntry={endEntry}
                totalDataCount={totalDataCount}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                showConvertedOnly={showConvertedOnly}
                setShowConvertedOnly={setShowConvertedOnly}
                showStatusChangedOnly={showStatusChangedOnly}
                setShowStatusChangedOnly={setShowStatusChangedOnly}
                selectedStatuses={selectedStatuses}
                setSelectedStatuses={setSelectedStatuses}
                selectedSources={selectedSources}
                setSelectedSources={setSelectedSources}
                handlePageSizeChange={handlePageSizeChange}
                totalPages={totalPages}
                validCurrentPage={validCurrentPage}
                handlePageChange={handlePageChange}
                isAllSelected={isAllSelected}
                handleSelectAll={handleSelectAll}
                dateFilterType={dateFilterType}
                sortDirection={sortDirection}
                setSortDirection={setSortDirection}
                records={records}
                paginatedRecords={paginatedRecords}
                setSelectedDetailRecord={setSelectedDetailRecord}
                handleToggleRow={handleToggleRow}
                onNavigate={onNavigate}
                handleStatusChange={handleStatusChange}
                getStatusBadgeStyle={getStatusBadgeStyle}
                STATUS_OPTIONS={STATUS_OPTIONS}
                handleOpenHistory={handleOpenHistory}
                openActionMenuId={openActionMenuId}
                setOpenActionMenuId={setOpenActionMenuId}
                actionMenuRef={actionMenuRef}
                handleOpenOutreach={handleOpenOutreach}
                handleOpenConvertSingle={handleOpenConvertSingle}
                handleOpenEdit={handleOpenEdit}
                handleOpenDeleteSingle={handleOpenDeleteSingle}
              />
            </div>
          )}
        </>
      )}

      {/* Edit Company Details Modal */}
      <EditCompanyModal
        isOpen={Boolean(editingRow)}
        onClose={() => !isSavingEdit && setEditingRow(null)}
        editingRow={editingRow}
        setEditingRow={setEditingRow}
        onSave={handleSaveEdit}
        isSaving={isSavingEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        deleteTarget={deleteTarget}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {/* Convert to Lead Confirmation Modal */}
      <ConvertToLeadModal
        isOpen={Boolean(convertTarget)}
        onClose={() => !isSubmitting && setConvertTarget(null)}
        convertTarget={convertTarget}
        onConfirm={handleConfirmConvert}
        isSubmitting={isSubmitting}
      />

      {/* Outreach Action Modal (Call, WhatsApp, Email, Follow-up) */}
      {outreachRow && (
        <LogOutreachModal
          isOpen={Boolean(outreachRow)}
          onClose={() => setOutreachRow(null)}
          row={outreachRow}
          initialType={outreachInitialType}
          onSuccess={handleOutreachSuccess}
        />
      )}

      {/* Direct Sales Email Composer Modal (Same as TA style) */}
      {mailComposerRow && (
        <CrmMailComposerModal
          isOpen={Boolean(mailComposerRow)}
          onClose={() => setMailComposerRow(null)}
          row={mailComposerRow}
          onSuccess={(updated) => {
            setMailComposerRow(null);
            handleOutreachSuccess(updated);
          }}
        />
      )}

      {/* Activity History & Follow-ups Timeline Drawer */}
      {historyRow && (
        <ActivityHistoryModal
          isOpen={Boolean(historyRow)}
          onClose={() => setHistoryRow(null)}
          row={historyRow}
          onLogNew={(r) => handleOpenOutreach(r, 'call')}
        />
      )}

      {/* Team Performance & Leaderboard Modal */}
      <RepLeaderboardModal
        isOpen={isLeaderboardOpen}
        initialTab={leaderboardInitialTab}
        onClose={() => setIsLeaderboardOpen(false)}
        onSelectRepFilter={handleSelectRepFromLeaderboard}
        onOpenUserHistory={(rep, filters) => handleOpenUserHistory(rep, true, filters)}
        onOpenOutreach={(prospect, type) => {
          setOutreachRow(prospect);
          setOutreachInitialType(type || 'call');
        }}
        onOpenProspectDetails={(prospect, options = {}) => {
          setSelectedDetailRecord(prospect);
          setDetailInitialTab(options?.tab || 'overview');
          setDetailFocusedActivityId(options?.emailId || options?.activityId || null);
        }}
      />

      {/* Representative Outreach Activity & History Modal */}
      {historyUserModal.isOpen && (
        <RepOutreachHistoryModal
          isOpen={historyUserModal.isOpen}
          onClose={() => setHistoryUserModal({ isOpen: false, rep: null, fromLeaderboard: false })}
          onBack={historyUserModal.fromLeaderboard ? handleBackToLeaderboard : null}
          rep={historyUserModal.rep}
          initialChannelType={historyUserModal.initialChannelType || 'all'}
          initialOutcome={historyUserModal.initialOutcome || 'all'}
          initialDateRange={historyUserModal.initialDateRange || 'today'}
          initialCustomFrom={historyUserModal.initialCustomFrom || ''}
          initialCustomTo={historyUserModal.initialCustomTo || ''}
          onSelectRepFilter={(repName) => {
            handleSelectRepFromLeaderboard(repName);
          }}
          onOpenProspectDetails={(prospect, options = {}) => {
            setSelectedDetailRecord(prospect);
            setDetailInitialTab(options?.tab || 'overview');
            setDetailFocusedActivityId(options?.emailId || options?.activityId || null);
          }}
        />
      )}
    </div>
  );
};
