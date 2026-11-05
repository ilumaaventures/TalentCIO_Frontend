import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import {
  Users,
  UserCheck,
  Clock,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
  Layers,
  Award,
  MessageSquare,
  FileSpreadsheet,
  Download,
  X
} from 'lucide-react';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import { format, isToday, isYesterday, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import projectService from '../services/projectService';
import Skeleton from '@/components/ui/Skeleton';

// Avatar component with photo fallback to initial
const MemberAvatar = ({ member, size = 'md', className = '' }) => {
  const [imgError, setImgError] = useState(false);
  const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'User';
  const initial = (member.firstName || fullName || 'U')[0].toUpperCase();
  const photoUrl = member.profilePicture || member.profilePhoto;

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm'
  }[size] || 'w-8 h-8 text-xs';

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={fullName}
        onError={() => setImgError(true)}
        className={`${sizeClasses} rounded-full object-cover border border-white shadow-2xs shrink-0 select-none ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${sizeClasses} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center border border-white shadow-2xs shrink-0 select-none ${className}`}
    >
      {initial}
    </div>
  );
};

export const UserPerformanceTrace = ({
  projectId,
  project,
  members = [],
  employees = [],
  tasks = [],
  onSelectTask,
  selectedUserId: propSelectedUserId = 'ALL',
  onSelectUserId
}) => {
  const [selectedUserId, setSelectedUserId] = useState(propSelectedUserId || 'ALL');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sync state if selectedUserId changes from parent
  useEffect(() => {
    if (propSelectedUserId !== undefined) {
      setSelectedUserId(propSelectedUserId);
    }
  }, [propSelectedUserId]);

  const handleSelectUser = (id) => {
    setSelectedUserId(id);
    if (typeof onSelectUserId === 'function') {
      onSelectUserId(id);
    }
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('this_month'); // Default to 'this_month'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [appliedCustomStart, setAppliedCustomStart] = useState('');
  const [appliedCustomEnd, setAppliedCustomEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'APPROVED', 'PENDING'

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
    if (newRange === 'custom') {
      if (!customStartDate || !customEndDate) {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const s = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const e = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDay)}`;
        setCustomStartDate(s);
        setCustomEndDate(e);
        setAppliedCustomStart(s);
        setAppliedCustomEnd(e);
      }
    }
  };

  const handleApplyCustomDate = () => {
    if (!customStartDate || !customEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    if (new Date(customStartDate) > new Date(customEndDate)) {
      toast.error('Start date cannot be after end date');
      return;
    }
    setAppliedCustomStart(customStartDate);
    setAppliedCustomEnd(customEndDate);
  };

  // Resolve member list with enriched employee info (profilePicture, names, emails)
  const resolvedMembers = useMemo(() => {
    const list = Array.isArray(members) ? [...members] : [];
    if (project?.manager) {
      const mgrId = String(project.manager?._id || project.manager);
      if (!list.some(m => String(m?._id || m) === mgrId)) {
        list.unshift(project.manager);
      }
    }
    // Include any user who has logged work on this project
    logs.forEach(l => {
      if (l.user) {
        const uId = String(l.user?._id || l.user);
        if (!list.some(m => String(m?._id || m) === uId)) {
          list.push(l.user);
        }
      }
    });

    return list.map((m, idx) => {
      const mId = String(m?._id || m);
      const match = employees.find(e => String(e._id) === mId);
      const baseObj = typeof m === 'object' && m !== null ? m : (match || {});
      const pic = baseObj.profilePicture || baseObj.profilePhoto || match?.profilePicture || match?.profilePhoto || null;
      const firstName = baseObj.firstName || match?.firstName || 'Member';
      const lastName = baseObj.lastName || match?.lastName || '';
      const email = baseObj.email || match?.email || '';
      const isManager = project?.manager && String(project.manager._id || project.manager) === mId;

      return {
        _id: mId || `member-${idx}`,
        firstName,
        lastName,
        email,
        profilePicture: pic,
        isManager
      };
    });
  }, [members, employees, project?.manager, logs]);

  // Fetch all logs for this project (authoritative live dataset from server for cards & metrics)
  const fetchWorkLogs = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await projectService.getWorkLogs({ projectId });
      const fetchedLogs = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.logs) ? res.data.logs : []);
      setLogs(fetchedLogs);
    } catch (err) {
      console.error('Failed to load project work logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchWorkLogs();
  }, [fetchWorkLogs]);

  // Feed backend pagination state (20 entries per page)
  const feedSectionRef = useRef(null);
  const [feedLogs, setFeedLogs] = useState([]);
  const [feedTotal, setFeedTotal] = useState(0);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotalPages, setFeedTotalPages] = useState(1);
  const [feedLoading, setFeedLoading] = useState(false);
  const pageSize = 20;

  const debouncedSearch = useDebouncedValue(searchQuery, 350);

  const fetchFeedLogs = useCallback(async (page = 1) => {
    if (!projectId) return;
    try {
      setFeedLoading(true);
      const params = {
        projectId,
        page,
        limit: pageSize,
        paginate: 'true'
      };

      if (selectedUserId && selectedUserId !== 'ALL') {
        params.userId = selectedUserId;
      }
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (dateRange && dateRange !== 'all') {
        params.dateRange = dateRange;
        if (dateRange === 'custom') {
          if (appliedCustomStart) params.startDate = appliedCustomStart;
          if (appliedCustomEnd) params.endDate = appliedCustomEnd;
        }
      }
      if (debouncedSearch && debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const res = await projectService.getWorkLogs(params);
      if (res.data && res.data.logs !== undefined) {
        setFeedLogs(Array.isArray(res.data.logs) ? res.data.logs : []);
        setFeedTotal(Number(res.data.total) || 0);
        setFeedTotalPages(Number(res.data.totalPages) || 1);
        setFeedPage(Number(res.data.page) || page);
      } else if (Array.isArray(res.data)) {
        setFeedLogs(res.data.slice((page - 1) * pageSize, page * pageSize));
        setFeedTotal(res.data.length);
        setFeedTotalPages(Math.ceil(res.data.length / pageSize) || 1);
        setFeedPage(page);
      }
    } catch (err) {
      console.error('Failed to load paginated feed logs:', err);
    } finally {
      setFeedLoading(false);
    }
  }, [projectId, selectedUserId, statusFilter, dateRange, appliedCustomStart, appliedCustomEnd, debouncedSearch, pageSize]);

  // When filters or selected member change, reset to page 1 and fetch feed + refresh metrics logs
  useEffect(() => {
    setFeedPage(1);
    fetchFeedLogs(1);
    fetchWorkLogs();
  }, [fetchFeedLogs, fetchWorkLogs]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > feedTotalPages || newPage === feedPage) return;
    setFeedPage(newPage);
    fetchFeedLogs(newPage);
    feedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const paginationRange = useMemo(() => {
    if (feedTotalPages <= 7) {
      return Array.from({ length: feedTotalPages }, (_, i) => i + 1);
    }
    if (feedPage <= 4) {
      return [1, 2, 3, 4, 5, '...', feedTotalPages];
    }
    if (feedPage >= feedTotalPages - 3) {
      return [1, '...', feedTotalPages - 4, feedTotalPages - 3, feedTotalPages - 2, feedTotalPages - 1, feedTotalPages];
    }
    return [1, '...', feedPage - 1, feedPage, feedPage + 1, '...', feedTotalPages];
  }, [feedPage, feedTotalPages]);

  // Map each member's assigned tasks from the project tasks prop
  const memberTaskStats = useMemo(() => {
    const stats = {};
    resolvedMembers.forEach(m => {
      stats[m._id] = {
        assignedTasks: [],
        completedTasks: [],
        totalAssigned: 0,
        totalCompleted: 0
      };
    });

    tasks.forEach(t => {
      const assignees = Array.isArray(t.assignees) ? t.assignees : [];
      assignees.forEach(a => {
        const aId = String(a?._id || a);
        if (stats[aId]) {
          stats[aId].assignedTasks.push(t);
          stats[aId].totalAssigned += 1;
          if (t.status === 'DONE') {
            stats[aId].completedTasks.push(t);
            stats[aId].totalCompleted += 1;
          }
        }
      });
    });

    return stats;
  }, [resolvedMembers, tasks]);

  // Member-wise aggregate metrics (total hours, log count)
  const memberMetrics = useMemo(() => {
    const metrics = {};
    resolvedMembers.forEach(m => {
      metrics[m._id] = {
        totalHours: 0,
        logCount: 0,
        activeDates: new Set()
      };
    });

    logs.forEach(l => {
      const uId = String(l.user?._id || l.user);
      if (metrics[uId]) {
        metrics[uId].totalHours += Number(l.hours) || 0;
        metrics[uId].logCount += 1;
        if (l.date) {
          metrics[uId].activeDates.add(format(new Date(l.date), 'yyyy-MM-dd'));
        }
      }
    });

    return metrics;
  }, [resolvedMembers, logs]);

  // Filter logs by search, date range, and status
  const filteredLogs = useMemo(() => {
    const now = new Date();
    return logs.filter(log => {
      // User scope filter (if selectedUserId is set)
      if (selectedUserId !== 'ALL') {
        const logUserId = String(log.user?._id || log.user);
        if (logUserId !== selectedUserId) return false;
      }

      // Search query filter (matches task name, task key, description, or user name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const taskName = String(log.task?.name || '').toLowerCase();
        const taskKey = String(log.task?.taskKey || '').toLowerCase();
        const desc = String(log.description || '').toLowerCase();
        const userName = `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.toLowerCase();
        const moduleName = String(log.task?.module?.name || log.module?.name || '').toLowerCase();
        if (!taskName.includes(q) && !taskKey.includes(q) && !desc.includes(q) && !userName.includes(q) && !moduleName.includes(q)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        if ((log.status || 'PENDING') !== statusFilter) return false;
      }

      // Date range filter
      if (dateRange !== 'all' && log.date) {
        const logDate = new Date(log.date);
        if (isNaN(logDate.getTime())) return false;

        if (dateRange === 'this_week') {
          const day = now.getDay();
          const diff = now.getDate() - (day === 0 ? 6 : day - 1);
          const weekStart = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
          const weekEnd = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999);
          if (logDate < weekStart || logDate > weekEnd) return false;
        } else if (dateRange === 'this_month') {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          if (logDate < monthStart || logDate > monthEnd) return false;
        } else if (dateRange === 'custom') {
          if (appliedCustomStart) {
            const [sY, sM, sD] = appliedCustomStart.split('-').map(Number);
            const start = new Date(sY, sM - 1, sD, 0, 0, 0, 0);
            if (logDate < start) return false;
          }
          if (appliedCustomEnd) {
            const [eY, eM, eD] = appliedCustomEnd.split('-').map(Number);
            const end = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
            if (logDate > end) return false;
          }
        } else if (dateRange === '7d' || dateRange === '14d' || dateRange === '30d') {
          const diffDays = (now - logDate) / (1000 * 60 * 60 * 24);
          if (dateRange === '7d' && diffDays > 7) return false;
          if (dateRange === '14d' && diffDays > 14) return false;
          if (dateRange === '30d' && diffDays > 30) return false;
        }
      }

      return true;
    });
  }, [logs, selectedUserId, searchQuery, dateRange, appliedCustomStart, appliedCustomEnd, statusFilter]);

  // Group feed logs date-wise (descending order)
  const groupedLogs = useMemo(() => {
    const groups = {};

    feedLogs.forEach(log => {
      if (!log.date) return;
      const dateKey = format(new Date(log.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey,
          dateObj: new Date(log.date),
          totalHours: 0,
          entries: []
        };
      }
      groups[dateKey].entries.push(log);
      groups[dateKey].totalHours += Number(log.hours) || 0;
    });

    return Object.values(groups).sort((a, b) => b.dateObj - a.dateObj);
  }, [feedLogs]);

  // Performance analytics for the currently selected user (or all members combined)
  const activeMetrics = useMemo(() => {
    const relevantLogs = filteredLogs;
    const totalHours = relevantLogs.reduce((acc, l) => acc + (Number(l.hours) || 0), 0);
    const uniqueDays = new Set(relevantLogs.map(l => l.date ? format(new Date(l.date), 'yyyy-MM-dd') : null).filter(Boolean));
    const activeDaysCount = uniqueDays.size;
    const avgDailyHours = activeDaysCount > 0 ? (totalHours / activeDaysCount).toFixed(1) : '0';

    let totalAssignedTasks = 0;
    let totalCompletedTasks = 0;

    if (selectedUserId === 'ALL') {
      tasks.forEach(t => {
        if (Array.isArray(t.assignees) && t.assignees.length > 0) {
          totalAssignedTasks += 1;
          if (t.status === 'DONE') totalCompletedTasks += 1;
        }
      });
    } else {
      const stats = memberTaskStats[selectedUserId];
      if (stats) {
        totalAssignedTasks = stats.totalAssigned;
        totalCompletedTasks = stats.totalCompleted;
      }
    }

    const completionRate = totalAssignedTasks > 0
      ? Math.round((totalCompletedTasks / totalAssignedTasks) * 100)
      : 0;

    return {
      totalHours: totalHours.toFixed(1),
      logCount: relevantLogs.length,
      activeDaysCount,
      avgDailyHours,
      totalAssignedTasks,
      totalCompletedTasks,
      completionRate
    };
  }, [filteredLogs, selectedUserId, tasks, memberTaskStats]);

  // Daily hours chart data
  const chartData = useMemo(() => {
    const dateMap = {};
    filteredLogs.forEach(l => {
      if (!l.date) return;
      const key = format(new Date(l.date), 'yyyy-MM-dd');
      dateMap[key] = (dateMap[key] || 0) + (Number(l.hours) || 0);
    });

    const dates = [];
    const today = new Date();

    if (dateRange === 'this_week') {
      const day = today.getDay();
      const diff = today.getDate() - (day === 0 ? 6 : day - 1);
      for (let i = 0; i < 7; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), diff + i);
        dates.push(format(d, 'yyyy-MM-dd'));
      }
    } else if (dateRange === 'this_month') {
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), i);
        dates.push(format(d, 'yyyy-MM-dd'));
      }
    } else if (dateRange === 'custom' && appliedCustomStart && appliedCustomEnd) {
      const start = new Date(appliedCustomStart);
      const end = new Date(appliedCustomEnd);
      const diffDays = Math.min(60, Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000))));
      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        if (d <= end) {
          dates.push(format(d, 'yyyy-MM-dd'));
        }
      }
    } else {
      // Default: Last 7 calendar days ending today
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(format(d, 'yyyy-MM-dd'));
      }
    }

    return dates.map(dateStr => ({
      date: format(new Date(dateStr), 'MMM d'),
      hours: Number((dateMap[dateStr] || 0).toFixed(1)),
      rawDate: dateStr
    }));
  }, [filteredLogs, dateRange, appliedCustomStart, appliedCustomEnd]);

  // Format date display helper
  const formatDateHeading = (dateObj) => {
    try {
      if (isToday(dateObj)) return 'Today';
      if (isYesterday(dateObj)) return 'Yesterday';
      return format(dateObj, 'EEEE, MMM d, yyyy');
    } catch {
      return 'Unknown Date';
    }
  };

  const selectedMemberObj = useMemo(() => {
    if (selectedUserId === 'ALL') return null;
    return resolvedMembers.find(m => m._id === selectedUserId);
  }, [selectedUserId, resolvedMembers]);

  // Timesheet Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportUserId, setExportUserId] = useState('ALL');
  const [exportDatePreset, setExportDatePreset] = useState('all'); // 'all', 'thisMonth', 'lastMonth', '30d', '14d', '7d', 'custom'
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportStatus, setExportStatus] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  const handleOpenExportModal = () => {
    setExportUserId(selectedUserId || 'ALL');
    setExportDatePreset('all');
    setExportStartDate('');
    setExportEndDate('');
    setExportStatus('all');
    setShowExportModal(true);
  };

  const handlePresetChange = (preset) => {
    setExportDatePreset(preset);
    const now = new Date();
    if (preset === 'all') {
      setExportStartDate('');
      setExportEndDate('');
    } else if (preset === 'thisMonth') {
      const s = startOfMonth(now);
      const e = endOfMonth(now);
      setExportStartDate(format(s, 'yyyy-MM-dd'));
      setExportEndDate(format(e, 'yyyy-MM-dd'));
    } else if (preset === 'lastMonth') {
      const lm = subMonths(now, 1);
      const s = startOfMonth(lm);
      const e = endOfMonth(lm);
      setExportStartDate(format(s, 'yyyy-MM-dd'));
      setExportEndDate(format(e, 'yyyy-MM-dd'));
    } else if (preset === '30d') {
      setExportStartDate(format(subDays(now, 30), 'yyyy-MM-dd'));
      setExportEndDate(format(now, 'yyyy-MM-dd'));
    } else if (preset === '14d') {
      setExportStartDate(format(subDays(now, 14), 'yyyy-MM-dd'));
      setExportEndDate(format(now, 'yyyy-MM-dd'));
    } else if (preset === '7d') {
      setExportStartDate(format(subDays(now, 7), 'yyyy-MM-dd'));
      setExportEndDate(format(now, 'yyyy-MM-dd'));
    }
  };

  // Filter logs for export
  const exportMatchingLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. User filter
      if (exportUserId !== 'ALL') {
        const uId = String(log.user?._id || log.user);
        if (uId !== exportUserId) return false;
      }

      // 2. Status filter
      if (exportStatus !== 'all') {
        if ((log.status || 'PENDING') !== exportStatus) return false;
      }

      // 3. Date range filter
      if (log.date) {
        const logDateStr = format(new Date(log.date), 'yyyy-MM-dd');
        if (exportStartDate && logDateStr < exportStartDate) return false;
        if (exportEndDate && logDateStr > exportEndDate) return false;
      }

      return true;
    }).sort((a, b) => new Date(a.date) - new Date(b.date)); // Chronological order
  }, [logs, exportUserId, exportStatus, exportStartDate, exportEndDate]);

  // Total time in project for the export target user
  const userTotalTimeInProject = useMemo(() => {
    if (exportUserId === 'ALL') {
      return logs.reduce((sum, l) => sum + (Number(l.hours) || 0), 0);
    }
    return logs
      .filter(l => String(l.user?._id || l.user) === exportUserId)
      .reduce((sum, l) => sum + (Number(l.hours) || 0), 0);
  }, [logs, exportUserId]);

  const exportPeriodHours = useMemo(() => {
    return exportMatchingLogs.reduce((sum, l) => sum + (Number(l.hours) || 0), 0);
  }, [exportMatchingLogs]);

  // Excel Timesheet Export Handler
  const handleExportExcel = async () => {
    if (exportMatchingLogs.length === 0) {
      toast.error('No work logs found for the selected date range and user');
      return;
    }

    try {
      setIsExporting(true);

      const targetUserObj = exportUserId !== 'ALL'
        ? resolvedMembers.find(m => m._id === exportUserId)
        : null;

      const targetUserName = targetUserObj
        ? `${targetUserObj.firstName || ''} ${targetUserObj.lastName || ''}`.trim() || targetUserObj.email || 'User'
        : 'All Team Members';

      const projectName = project?.name || 'Project';
      const clientName = project?.client?.name || (typeof project?.client === 'string' ? project.client : 'N/A');

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Talentcio HRMS';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('User Timesheet', {
        views: [{ showGridLines: true }]
      });

      // ── 1. REPORT TITLE BANNER ──
      sheet.mergeCells('A1:J1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'PROJECT USER TIMESHEET REPORT';
      titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }; // Blue-800
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 34;

      // ── 2. METADATA SUMMARY BLOCK ──
      const dateRangeDisplay = (exportStartDate && exportEndDate)
        ? `${exportStartDate} to ${exportEndDate}`
        : (exportStartDate ? `From ${exportStartDate}` : (exportEndDate ? `Until ${exportEndDate}` : 'All Time'));

      const metaInfo = [
        ['Project Name:', projectName, '', 'Date Range:', dateRangeDisplay],
        ['Client Name:', clientName, '', 'Period Logged Hours:', `${exportPeriodHours.toFixed(2)} hrs`],
        ['Team Member:', targetUserName, '', 'Total Time in Project:', `${userTotalTimeInProject.toFixed(2)} hrs`],
        ['User Email:', targetUserObj?.email || 'N/A', '', 'Log Entries Count:', `${exportMatchingLogs.length} entries`],
        ['Generated On:', format(new Date(), 'MMM dd, yyyy HH:mm'), '', 'Status Filter:', exportStatus === 'all' ? 'All Statuses' : exportStatus]
      ];

      metaInfo.forEach((rowVals, idx) => {
        const rowNum = idx + 2;
        const r = sheet.getRow(rowNum);
        r.height = 20;

        // Label 1 (Col A)
        const cA = sheet.getCell(`A${rowNum}`);
        cA.value = rowVals[0];
        cA.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
        cA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

        // Value 1 (Col B:C)
        sheet.mergeCells(`B${rowNum}:C${rowNum}`);
        const cB = sheet.getCell(`B${rowNum}`);
        cB.value = rowVals[1];
        cB.font = { name: 'Calibri', size: 10, bold: idx === 0 || idx === 2, color: { argb: 'FF0F172A' } };

        // Label 2 (Col D:E)
        sheet.mergeCells(`D${rowNum}:E${rowNum}`);
        const cD = sheet.getCell(`D${rowNum}`);
        cD.value = rowVals[3];
        cD.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
        cD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

        // Value 2 (Col F:J)
        sheet.mergeCells(`F${rowNum}:J${rowNum}`);
        const cF = sheet.getCell(`F${rowNum}`);
        cF.value = rowVals[4];
        cF.font = { name: 'Calibri', size: 10, bold: idx === 1 || idx === 2, color: { argb: idx === 1 || idx === 2 ? 'FF1E40AF' : 'FF0F172A' } };
      });

      // Row 7 blank
      sheet.getRow(7).height = 10;

      // ── 3. TABLE COLUMN HEADERS (Row 8) ──
      const headers = [
        'Date',
        'Day',
        'User Name',
        'Module',
        'Task Key',
        'Task / Activity',
        'Priority',
        'Status',
        'Hours',
        'Description / Notes'
      ];

      sheet.columns = [
        { key: 'date', width: 14 },
        { key: 'day', width: 13 },
        { key: 'userName', width: 22 },
        { key: 'module', width: 20 },
        { key: 'taskKey', width: 12 },
        { key: 'taskName', width: 32 },
        { key: 'priority', width: 12 },
        { key: 'status', width: 13 },
        { key: 'hours', width: 12 },
        { key: 'description', width: 45 }
      ];

      const headerRow = sheet.getRow(8);
      headerRow.values = headers;
      headerRow.height = 26;
      headerRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // ── 4. TABLE DATA ROWS ──
      let currentRowNum = 9;
      exportMatchingLogs.forEach((log, index) => {
        const logDate = log.date ? new Date(log.date) : null;
        const dateStr = logDate ? format(logDate, 'yyyy-MM-dd') : '-';
        const dayStr = logDate ? format(logDate, 'EEEE') : '-';
        const logUser = log.user || {};
        const uName = `${logUser.firstName || ''} ${logUser.lastName || ''}`.trim() || logUser.email || 'User';
        const taskObj = log.task || {};
        const moduleName = taskObj.module?.name || log.module?.name || '-';
        const taskKey = taskObj.taskKey || taskObj.key || '-';
        const taskName = taskObj.name || (log.discussion?.title ? `Discussion: ${log.discussion.title}` : 'Direct Project Work');
        const priority = taskObj.priority || '-';
        const status = log.status || 'PENDING';
        const hours = Number(log.hours) || 0;
        const description = log.description || '-';

        const row = sheet.getRow(currentRowNum);
        row.values = [
          dateStr,
          dayStr,
          uName,
          moduleName,
          taskKey,
          taskName,
          priority,
          status,
          hours,
          description
        ];
        row.height = 22;

        const isEven = index % 2 === 0;
        const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { name: 'Calibri', size: 9 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };

          if (colNumber === 1 || colNumber === 2 || colNumber === 5 || colNumber === 7 || colNumber === 8) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber === 9) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '0.00';
            cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E40AF' } };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: colNumber === 10 };
          }
        });

        currentRowNum++;
      });

      // ── 5. TOTAL ROW AT BOTTOM ──
      const totalRow = sheet.getRow(currentRowNum);
      totalRow.height = 26;
      sheet.mergeCells(`A${currentRowNum}:H${currentRowNum}`);
      const totalLabelCell = sheet.getCell(`A${currentRowNum}`);
      totalLabelCell.value = 'TOTAL HOURS LOGGED:';
      totalLabelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
      totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
      totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };

      const totalHoursCell = sheet.getCell(`I${currentRowNum}`);
      totalHoursCell.value = {
        formula: `SUM(I9:I${currentRowNum - 1})`,
        result: exportPeriodHours
      };
      totalHoursCell.numFmt = '0.00';
      totalHoursCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
      totalHoursCell.alignment = { horizontal: 'right', vertical: 'middle' };
      totalHoursCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };

      const totalDescCell = sheet.getCell(`J${currentRowNum}`);
      totalDescCell.value = `${exportMatchingLogs.length} entries in range`;
      totalDescCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };
      totalDescCell.alignment = { horizontal: 'left', vertical: 'middle' };
      totalDescCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };

      ['A', 'I', 'J'].forEach(col => {
        const c = sheet.getCell(`${col}${currentRowNum}`);
        c.border = {
          top: { style: 'medium', color: { argb: 'FF6366F1' } },
          bottom: { style: 'medium', color: { argb: 'FF6366F1' } }
        };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const sanitize = (s) => String(s || '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanProj = sanitize(projectName);
      const cleanUser = sanitize(targetUserName);
      const rangeTag = (exportStartDate && exportEndDate)
        ? `${exportStartDate}_to_${exportEndDate}`
        : (exportStartDate ? `from_${exportStartDate}` : (exportEndDate ? `until_${exportEndDate}` : 'all_time'));

      const filename = `${cleanProj}_${cleanUser}_timesheet_${rangeTag}.xlsx`;
      saveAs(new Blob([buffer]), filename);
      toast.success(`Timesheet exported: ${filename}`);
      setShowExportModal(false);
    } catch (err) {
      console.error('Failed to export timesheet:', err);
      toast.error('Failed to generate timesheet export');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & User Selector */}
      <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-2xs">
              <UserCheck size={15} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                User Performance & Activity Trace
                {refreshing && <span className="text-[10px] font-normal text-blue-600 animate-pulse">• Updating...</span>}
              </h2>
              <p className="text-[10.5px] text-slate-500">
                Inspect assigned project team members individually, track date-wise work logs & measure productivity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={fetchWorkLogs}
              disabled={refreshing}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
              title="Refresh Logs"
            >
              <RotateCcw size={13} className={refreshing ? 'animate-spin text-blue-600' : ''} />
            </button>
          </div>
        </div>

        {/* Assigned Users Cards / Selector Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={12} className="text-blue-600" /> Assigned Team Members ({resolvedMembers.length})
            </span>
            {selectedUserId !== 'ALL' && (
              <button
                onClick={() => handleSelectUser('ALL')}
                className="text-[10.5px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                View All Members
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* "All Members" Summary Card */}
            <div
              onClick={() => handleSelectUser('ALL')}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-2.5 ${
                selectedUserId === 'ALL'
                  ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                selectedUserId === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                <Users size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[11px] text-slate-900 truncate">All Members</h4>
                  <span className="text-[8.5px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                    {resolvedMembers.length} users
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                  <span className="flex items-center gap-0.5">
                    <Clock size={10} className="text-blue-600" />
                    <strong>{logs.reduce((sum, l) => sum + (Number(l.hours) || 0), 0).toFixed(1)}</strong> hrs
                  </span>
                  <span>•</span>
                  <span><strong>{logs.length}</strong> logs</span>
                </div>
              </div>
            </div>

            {/* Individual Member Cards */}
            {resolvedMembers.map(m => {
              const fullName = `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Member';
              const isSelected = selectedUserId === m._id;
              const stats = memberTaskStats[m._id] || { totalAssigned: 0, totalCompleted: 0 };
              const metrics = memberMetrics[m._id] || { totalHours: 0, logCount: 0 };

              return (
                <div
                  key={m._id}
                  onClick={() => handleSelectUser(m._id)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <MemberAvatar member={m} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 justify-between">
                      <h4 className="font-bold text-[11px] text-slate-900 truncate" title={fullName}>
                        {fullName}
                      </h4>
                      {m.isManager && (
                        <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          Lead
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{m.email || 'No email'}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-600">
                      <span className="font-semibold text-blue-700 flex items-center gap-0.5">
                        <Clock size={10} /> {metrics.totalHours.toFixed(1)}h
                      </span>
                      <span>•</span>
                      <span>{stats.totalCompleted}/{stats.totalAssigned} tasks</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI Performance Metrics for Selected Scope */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* KPI 1: Logged Hours */}
        <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">Logged Hours</span>
            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock size={13} />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold text-slate-900">
              {activeMetrics.totalHours} <span className="text-[11px] font-normal text-slate-500">hrs</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Across {activeMetrics.logCount} worklog {activeMetrics.logCount === 1 ? 'entry' : 'entries'}
            </p>
          </div>
        </div>

        {/* KPI 2: Task Completion */}
        <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">Tasks Delivered</span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={13} />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold text-slate-900">
              {activeMetrics.totalCompletedTasks} <span className="text-[11px] font-normal text-slate-500">/ {activeMetrics.totalAssignedTasks}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
              <span>Completion rate</span>
              <span className="font-semibold text-emerald-600">{activeMetrics.completionRate}%</span>
            </div>
            {activeMetrics.totalAssignedTasks > 0 && (
              <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${activeMetrics.completionRate}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* KPI 3: Active Days */}
        <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">Active Days</span>
            <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar size={13} />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold text-slate-900">
              {activeMetrics.activeDaysCount} <span className="text-[11px] font-normal text-slate-500">days</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Recorded activity dates
            </p>
          </div>
        </div>

        {/* KPI 4: Daily Productivity */}
        <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">Daily Average</span>
            <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp size={13} />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold text-slate-900">
              {activeMetrics.avgDailyHours} <span className="text-[11px] font-normal text-slate-500">hrs/day</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Avg pace per active day
            </p>
          </div>
        </div>
      </div>

      {/* Date-wise Daily Hours Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Daily Hours Distribution {selectedMemberObj ? `– ${selectedMemberObj.firstName} ${selectedMemberObj.lastName}` : '– Project Team'}
              </h3>
              <p className="text-[10.5px] text-slate-500">
                {dateRange === 'this_week'
                  ? 'Hours logged this week'
                  : dateRange === 'this_month'
                    ? 'Hours logged this month'
                    : dateRange === 'custom'
                      ? `Hours logged between ${appliedCustomStart || 'start'} and ${appliedCustomEnd || 'end'}`
                      : 'Hours logged across active days'}
              </p>
            </div>
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              {dateRange === 'this_week'
                ? 'This Week'
                : dateRange === 'this_month'
                  ? 'This Month'
                  : dateRange === 'custom'
                    ? 'Custom Range'
                    : dateRange === 'all'
                      ? 'All Dates'
                      : dateRange === '30d'
                        ? 'Last 30 days'
                        : 'Last 7 days'}
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${val} hrs`, 'Logged Time']}
                  labelFormatter={(lbl) => `Date: ${lbl}`}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.hours >= 6 ? '#2563eb' : entry.hours >= 3 ? '#3b82f6' : '#93c5fd'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Date-wise Work Logs Feed Section */}
      <div ref={feedSectionRef} className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden scroll-mt-6">
        {/* Feed Header with Search & Filters */}
        <div className="p-3 border-b border-slate-200/80 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div>
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Calendar size={14} className="text-blue-600" />
              Date-wise Work Logs
              {selectedMemberObj && (
                <span className="text-[10px] font-normal text-slate-500">
                  for <strong>{selectedMemberObj.firstName} {selectedMemberObj.lastName}</strong>
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Chronological log trace of tasks, time spent, and accomplishment details
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search logs, tasks, users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-2.5 py-0.5 text-[10.5px] bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-40 sm:w-48"
              />
            </div>

            {/* Date Range Select */}
            <select
              value={dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className="py-0.5 px-2 text-[10.5px] bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
            >
              <option value="this_month">This Month</option>
              <option value="this_week">This Week</option>
              <option value="all">All Dates</option>
              <option value="custom">Custom Range</option>
              <option value="7d">Last 7 Days</option>
              <option value="14d">Last 14 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            {/* Custom Date Pickers */}
            {dateRange === 'custom' && (
              <div className="flex items-center gap-1 bg-blue-50/70 border border-blue-200 rounded-lg px-1.5 py-0.5 text-[10.5px]">
                <span className="text-[9.5px] font-semibold text-blue-700">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCustomDate(); }}
                  className="bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px] text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[9.5px] font-semibold text-blue-700">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCustomDate(); }}
                  className="bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px] text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomDate}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-0.5 rounded text-[10px] transition shadow-2xs cursor-pointer"
                >
                  Apply
                </button>
              </div>
            )}

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-0.5 px-2 text-[10.5px] bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Export User Timesheet Button */}
            <button
              type="button"
              onClick={handleOpenExportModal}
              className="flex items-center gap-1.5 px-2.5 py-0.5 text-[10.5px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0"
              title="Export user timesheet for custom date range to Excel"
            >
              <FileSpreadsheet size={12} />
              <span>Export Timesheet</span>
            </button>

            {/* Header Previous / Next Page Navigations (Only shown when there are multiple pages) */}
            {feedTotalPages > 1 && (
              <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={() => handlePageChange(feedPage - 1)}
                  disabled={feedPage <= 1 || feedLoading}
                  className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft size={12} />
                  <span>Prev Page</span>
                </button>
                <span className="px-2 py-0.5 text-[10px] font-bold text-slate-700 select-none border-x border-slate-100 bg-slate-50/50">
                  Page {feedPage} of {feedTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(feedPage + 1)}
                  disabled={feedPage >= feedTotalPages || feedLoading}
                  className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Next Page"
                >
                  <span>Next Page</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Date Grouped Content */}
        {loading || (feedLoading && feedLogs.length === 0) ? (
          <div className="p-4 space-y-2.5">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : groupedLogs.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Clock size={16} />
            </div>
            <h4 className="font-bold text-slate-800 text-xs">No Work Logs Found</h4>
            <p className="text-[10.5px] text-slate-500 max-w-sm mx-auto">
              {searchQuery || dateRange !== 'all' || statusFilter !== 'all'
                ? 'No work logs match your filter criteria for this period.'
                : 'No work has been logged yet for the selected scope.'}
            </p>
            {(searchQuery || dateRange !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDateRange('all');
                  setStatusFilter('all');
                }}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                Clear filters & show all dates
              </button>
            )}
          </div>
        ) : (
          <div className={`divide-y divide-slate-100 transition-opacity duration-150 ${feedLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            {groupedLogs.map(group => {
              const headingText = formatDateHeading(group.dateObj);
              const formattedDateString = format(group.dateObj, 'MMM d, yyyy');

              return (
                <div key={group.dateKey} className="p-3 space-y-2 hover:bg-slate-50/40 transition-colors">
                  {/* Date Heading Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      <h4 className="font-bold text-slate-900 text-[11px] flex items-center gap-1.5">
                        {headingText}
                        {headingText !== formattedDateString && (
                          <span className="text-[9.5px] font-normal text-slate-500">
                            ({formattedDateString})
                          </span>
                        )}
                      </h4>
                      <span className="text-[9px] font-medium px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                        {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">
                      <Clock size={11} />
                      <span>{group.totalHours.toFixed(1)} hrs total</span>
                    </div>
                  </div>

                  {/* Entries for this date */}
                  <div className="space-y-1.5 pl-2.5 border-l-2 border-slate-200/80 ml-0.5">
                    {group.entries.map(log => {
                      const logUser = log.user || {};
                      const logUserName = `${logUser.firstName || ''} ${logUser.lastName || ''}`.trim() || 'User';
                      const taskObj = log.task || {};
                      const moduleName = taskObj.module?.name || log.module?.name;

                      return (
                        <div
                          key={log._id}
                          className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-start justify-between gap-2"
                        >
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <MemberAvatar member={logUser} size="sm" className="mt-0.5" />
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-[11px] text-slate-800">
                                  {logUserName}
                                </span>

                                {taskObj._id ? (
                                  <button
                                    onClick={() => onSelectTask && onSelectTask(taskObj._id)}
                                    className="inline-flex items-center gap-1 text-[10.5px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer group"
                                    title="Click to view task details"
                                  >
                                    <span>{taskObj.taskKey ? `[${taskObj.taskKey}]` : ''} {taskObj.name}</span>
                                    <ExternalLink size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                ) : log.discussion ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md border border-purple-200">
                                    <MessageSquare size={10} />
                                    <span>Discussion: {log.discussion?.title || log.discussion?.discussion || 'Discussion'}</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium text-slate-500 italic">
                                    Direct Project Work
                                  </span>
                                )}

                                {taskObj._id && log.discussion && (
                                  <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200" title="Worklogged via discussion">
                                    <MessageSquare size={9} />
                                    <span>[Discussion: {log.discussion?.title || 'Topic'}]</span>
                                  </span>
                                )}

                                {moduleName && (
                                  <span className="text-[8.5px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                    {moduleName}
                                  </span>
                                )}

                                {taskObj.priority && (
                                  <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                    taskObj.priority === 'URGENT' || taskObj.priority === 'HIGH'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {taskObj.priority}
                                  </span>
                                )}
                              </div>

                              {log.description ? (
                                <p className="text-[10.5px] text-slate-600 leading-relaxed bg-slate-50/70 p-1.5 rounded-md border border-slate-100">
                                  {log.description}
                                </p>
                              ) : (
                                <p className="text-[10px] text-slate-400 italic">
                                  No notes entered for this log
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right: Hours badge, status, action */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end md:self-start">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                              <Clock size={10} />
                              {Number(log.hours).toFixed(1)} hrs
                            </span>

                            <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                              log.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              log.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {log.status || 'PENDING'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Feed Pagination Footer (Only shown when there are multiple pages) */}
        {feedTotalPages > 1 && (
          <div className="p-2.5 border-t border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-[10.5px] text-slate-500">
              Showing <strong className="font-bold text-slate-800">{(feedPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="font-bold text-slate-800">{Math.min(feedPage * pageSize, feedTotal)}</strong> of{' '}
              <strong className="font-bold text-slate-800">{feedTotal}</strong> work log entries
              {selectedMemberObj && (
                <span> for <strong className="text-blue-600">{selectedMemberObj.firstName} {selectedMemberObj.lastName}</strong></span>
              )}
              <span className="ml-1.5 text-[11px] text-slate-400 font-medium">(20 entries per page)</span>
            </div>

            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              {/* Previous Page Button */}
              <button
                type="button"
                onClick={() => handlePageChange(feedPage - 1)}
                disabled={feedPage <= 1 || feedLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                title="Go to previous page"
              >
                <ChevronLeft size={14} />
                <span>Previous Page</span>
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {paginationRange.map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`dots-${idx}`} className="px-1 text-xs font-bold text-slate-400 select-none">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = p === feedPage;
                  return (
                    <button
                      key={`page-${p}`}
                      type="button"
                      onClick={() => handlePageChange(p)}
                      disabled={feedLoading}
                      className={`min-w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              {/* Next Page Button */}
              <button
                type="button"
                onClick={() => handlePageChange(feedPage + 1)}
                disabled={feedPage >= feedTotalPages || feedLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                title="Go to next page"
              >
                <span>Next Page</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── TIMESHEET EXPORT MODAL ── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Export User Timesheet</h3>
                  <p className="text-xs text-slate-300">Date-wise logs & project time report in Excel (.xlsx)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Project Badge */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Project</span>
                  <span className="font-bold text-slate-800 text-sm truncate block">{project?.name || 'Project'}</span>
                </div>
                {project?.client?.name && (
                  <span className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Client</span>
                    <span className="font-semibold text-slate-700">{project.client.name}</span>
                  </span>
                )}
              </div>

              {/* User Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Team Member <span className="text-rose-500">*</span>
                </label>
                <select
                  value={exportUserId}
                  onChange={(e) => setExportUserId(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs shadow-2xs"
                >
                  <option value="ALL">All Team Members (Consolidated Timesheet)</option>
                  {resolvedMembers.map(m => {
                    const uName = `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Member';
                    const metrics = memberMetrics[m._id] || { totalHours: 0 };
                    return (
                      <option key={m._id} value={m._id}>
                        {uName} {m.isManager ? '(Manager)' : ''} — {metrics.totalHours.toFixed(1)} hrs logged
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Date Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Date Range Selection
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { key: 'all', label: 'All Time' },
                    { key: 'thisMonth', label: 'This Month' },
                    { key: 'lastMonth', label: 'Last Month' },
                    { key: '30d', label: 'Last 30 Days' },
                    { key: '14d', label: 'Last 14 Days' },
                    { key: '7d', label: 'Last 7 Days' },
                    { key: 'custom', label: 'Custom Range' }
                  ].map(p => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handlePresetChange(p.key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        exportDatePreset === p.key
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Pickers */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => {
                      setExportStartDate(e.target.value);
                      setExportDatePreset('custom');
                    }}
                    className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => {
                      setExportEndDate(e.target.value);
                      setExportDatePreset('custom');
                    }}
                    className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Approval Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'all', label: 'All Statuses' },
                    { key: 'APPROVED', label: 'Approved Only' },
                    { key: 'PENDING', label: 'Pending Only' }
                  ].map(st => (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => setExportStatus(st.key)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                        exportStatus === st.key
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Summary Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/60 to-purple-50/60 border border-indigo-100 space-y-2">
                <span className="text-[10px] uppercase font-bold text-indigo-900 tracking-wider block">
                  Export Summary Preview
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/80 p-2 rounded-lg border border-indigo-50">
                    <span className="text-[10px] text-slate-400 block font-medium">Period Hours</span>
                    <span className="text-sm font-extrabold text-indigo-700">{exportPeriodHours.toFixed(1)}h</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-indigo-50">
                    <span className="text-[10px] text-slate-400 block font-medium">Log Entries</span>
                    <span className="text-sm font-extrabold text-slate-800">{exportMatchingLogs.length}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-indigo-50">
                    <span className="text-[10px] text-slate-400 block font-medium">Total Project Time</span>
                    <span className="text-sm font-extrabold text-purple-700">{userTotalTimeInProject.toFixed(1)}h</span>
                  </div>
                </div>
                {exportMatchingLogs.length === 0 && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 text-center font-medium">
                    ⚠️ No work logs found matching the selected dates and user. Adjust dates to export.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isExporting || exportMatchingLogs.length === 0}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <FileSpreadsheet size={15} />
                <span>{isExporting ? 'Generating Excel...' : 'Export Timesheet (.xlsx)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPerformanceTrace;
