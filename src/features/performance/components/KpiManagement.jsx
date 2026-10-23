import React, { useEffect, useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  X,
  Building,
  Briefcase,
  Target,
  BarChart2,
  Users,
  Calendar,
  Check,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Info,
  Award,
  Sparkles,
  RefreshCw,
  Eye,
  Sliders,
  FileText,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import pmsApi from '../api/pmsApi';
import { useAuth } from '@/features/auth/context/AuthContext';

const MEASUREMENT_TYPES = [
  { id: 'percentage', label: 'Percentage (%)', defaultUnit: '%' },
  { id: 'number', label: 'Number / Count', defaultUnit: 'units' },
  { id: 'currency', label: 'Currency', defaultUnit: 'USD' },
  { id: 'days', label: 'Days / Turnaround Time', defaultUnit: 'days' },
  { id: 'rating', label: 'Rating Scale (1-5)', defaultUnit: 'score' },
  { id: 'yes_no', label: 'Yes / No (Binary Milestone)', defaultUnit: 'status' },
];

const RATING_METHODS = [
  { id: 'automatic', label: 'Automatic (Calculated from Target vs Actual)' },
  { id: 'manual', label: 'Manual (Evaluator assigns score)' },
];

const RATING_SCALES = [
  { id: '1-5', label: '1 to 5 (Standard Rating Scale)' },
  { id: '1-10', label: '1 to 10 (Detailed Rating Scale)' },
  { id: '1-100', label: '0 to 100 (Percentage Scale)' },
];

const CALCULATION_DIRECTIONS = [
  { id: 'higher_is_better', label: 'Higher is Better (e.g. Sales, Uptime, Quality)' },
  { id: 'lower_is_better', label: 'Lower is Better (e.g. Time to hire, Defect rate, Escalations)' },
];

export default function KpiManagement() {
  const { user } = useAuth();

  // Role permissions
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const roleNames = userRoles.map((r) => (typeof r === 'string' ? r : r?.name || '')).filter(Boolean);
  const isAdmin =
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('admin') ||
    user?.permissions?.includes('pms.can.edit.all') ||
    roleNames.some((r) => /admin|super/i.test(r));

  const isHr =
    isAdmin ||
    user?.permissions?.includes('pms.view.all') ||
    roleNames.some((r) => /hr/i.test(r));

  const isManager =
    isAdmin ||
    isHr ||
    user?.permissions?.includes('pms.manage.team') ||
    roleNames.some((r) => /manager/i.test(r));

  // Sub-tabs: 'templates' | 'assign' | 'tracking'
  const [activeSubTab, setActiveSubTab] = useState('templates');

  // Metadata dropdowns
  const [metaLoading, setMetaLoading] = useState(false);
  const [metadata, setMetadata] = useState({
    departments: [],
    designations: [],
    kras: [],
    cycles: [],
    users: [],
  });

  // Safe Accessors (guaranteed to always be valid arrays)
  const safeDepartments = useMemo(() => (Array.isArray(metadata?.departments) ? metadata.departments : []), [metadata?.departments]);
  const safeDesignations = useMemo(() => (Array.isArray(metadata?.designations) ? metadata.designations : []), [metadata?.designations]);
  const safeKras = useMemo(() => (Array.isArray(metadata?.kras) ? metadata.kras : []), [metadata?.kras]);
  const safeCycles = useMemo(() => (Array.isArray(metadata?.cycles) ? metadata.cycles : []), [metadata?.cycles]);
  const safeUsers = useMemo(() => {
    const list = metadata?.users || metadata?.employees;
    return Array.isArray(list) ? list : [];
  }, [metadata?.users, metadata?.employees]);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. TEMPLATES STATE
  // ──────────────────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateSearch, setTemplateSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterDesignation, setFilterDesignation] = useState('');
  const [filterKra, setFilterKra] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Safe templates array
  const safeTemplates = useMemo(() => (Array.isArray(templates) ? templates : []), [templates]);

  // Template Modal (Add / Edit / View)
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // KRA-KPI Weightage context when selecting a KRA
  const [selectedKraSummary, setSelectedKraSummary] = useState(null);
  const [loadingKraSummary, setLoadingKraSummary] = useState(false);

  const initialTemplateForm = {
    name: '',
    code: '',
    description: '',
    department: '',
    designation: '',
    kraId: '',
    measurementType: 'percentage',
    unitOfMeasurement: '%',
    calculationDirection: 'higher_is_better',
    targetValue: 100,
    weightage: 20,
    ratingMethod: 'automatic',
    ratingScale: '1-5',
    effectiveStartDate: '',
    effectiveEndDate: '',
    status: 'active',
  };

  const [templateForm, setTemplateForm] = useState(initialTemplateForm);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. ASSIGNMENT WORKFLOW STATE
  // ──────────────────────────────────────────────────────────────────────────
  const [assignDept, setAssignDept] = useState('');
  const [assignDesignation, setAssignDesignation] = useState('');
  const [assignCycleId, setAssignCycleId] = useState('');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [customTargets, setCustomTargets] = useState({});
  const [customWeightages, setCustomWeightages] = useState({});
  const [assignUserSearch, setAssignUserSearch] = useState('');
  const [assigning, setAssigning] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. ASSIGNED KPIS & RATINGS EVALUATION STATE
  // ──────────────────────────────────────────────────────────────────────────
  const [assignedList, setAssignedList] = useState([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [assignedFilterCycle, setAssignedFilterCycle] = useState('');
  const [assignedFilterStatus, setAssignedFilterStatus] = useState('');
  const [assignedSearch, setAssignedSearch] = useState('');

  // Safe assigned list array
  const safeAssignedList = useMemo(() => (Array.isArray(assignedList) ? assignedList : []), [assignedList]);

  // Evaluation Modal
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evaluatingKpi, setEvaluatingKpi] = useState(null);
  const [evalData, setEvalData] = useState({
    actualValue: '',
    employeeRating: '',
    managerRating: '',
    comment: '',
    status: 'evaluated',
  });
  const [savingEval, setSavingEval] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────
  // INITIAL DATA FETCHING
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'templates') {
      fetchTemplates();
    } else if (activeSubTab === 'tracking') {
      fetchAssignedKpis();
    }
  }, [activeSubTab, templateSearch, filterDepartment, filterDesignation, filterKra, filterStatus, assignedFilterCycle, assignedFilterStatus]);

  const fetchMetadata = async () => {
    try {
      setMetaLoading(true);
      const res = await pmsApi.getPmsMetadata();
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        const userList = Array.isArray(d.users) ? d.users : Array.isArray(d.employees) ? d.employees : [];
        setMetadata({
          departments: Array.isArray(d.departments) ? d.departments : [],
          designations: Array.isArray(d.designations) ? d.designations : [],
          kras: Array.isArray(d.kras) ? d.kras : [],
          cycles: Array.isArray(d.cycles) ? d.cycles : [],
          users: userList,
        });

        // Default active cycle
        const cycles = Array.isArray(d.cycles) ? d.cycles : [];
        const activeCycle = cycles.find((c) => c?.status === 'in_progress') || cycles[0];
        if (activeCycle?._id) {
          setAssignCycleId(activeCycle._id);
          setAssignedFilterCycle(activeCycle._id);
        }
      }
    } catch (err) {
      console.error('[Fetch PMS Metadata Error]:', err);
    } finally {
      setMetaLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const params = {};
      if (templateSearch) params.search = templateSearch;
      if (filterDepartment) params.department = filterDepartment;
      if (filterDesignation) params.designation = filterDesignation;
      if (filterKra) params.kraId = filterKra;
      if (filterStatus) params.status = filterStatus;

      const res = await pmsApi.getKpiTemplates(params);
      if (res.data?.success) {
        setTemplates(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err) {
      console.error('[Fetch KPI Templates Error]:', err);
      toast.error('Failed to load KPI templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchAssignedKpis = async () => {
    try {
      setLoadingAssigned(true);
      const params = {};
      if (assignedFilterCycle) params.cycleId = assignedFilterCycle;
      if (assignedFilterStatus) params.status = assignedFilterStatus;
      if (assignedSearch) params.search = assignedSearch;

      const res = await pmsApi.getAssignedKpis(params);
      if (res.data?.success) {
        setAssignedList(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err) {
      console.error('[Fetch Assigned KPIs Error]:', err);
      toast.error('Failed to load assigned KPIs');
    } finally {
      setLoadingAssigned(false);
    }
  };

  // When KRA changes in the modal form, fetch its existing weightage balance
  const handleKraChange = async (kraId) => {
    setTemplateForm((prev) => ({ ...prev, kraId }));
    if (!kraId) {
      setSelectedKraSummary(null);
      return;
    }
    try {
      setLoadingKraSummary(true);
      const res = await pmsApi.getKpisByKra(kraId);
      if (res.data?.success && res.data?.data) {
        setSelectedKraSummary(res.data.data.weightageSummary || null);
      }
    } catch (err) {
      console.error('[Fetch KRA Weightage Summary Error]:', err);
    } finally {
      setLoadingKraSummary(false);
    }
  };

  // Filter designations matching the chosen department
  const filteredDesignations = useMemo(() => {
    if (!templateForm.department) return safeDesignations;
    return safeDesignations.filter((d) => {
      if (!d) return false;
      const deptName = typeof d.department === 'object' ? d.department?.name : d.department;
      return !deptName || deptName.toLowerCase() === templateForm.department.toLowerCase();
    });
  }, [templateForm.department, safeDesignations]);

  // Open Template Modal
  const handleOpenCreateTemplate = () => {
    setModalMode('create');
    setEditingTemplateId(null);
    setTemplateForm(initialTemplateForm);
    setSelectedKraSummary(null);
    setShowTemplateModal(true);
  };

  const handleOpenEditTemplate = async (template, mode = 'edit') => {
    setModalMode(mode);
    setEditingTemplateId(template._id);
    setTemplateForm({
      name: template.name || '',
      code: template.code || '',
      description: template.description || '',
      department: template.department || '',
      designation: template.designation || '',
      kraId: template.kraId?._id || template.kraId || '',
      measurementType: template.measurementType || 'percentage',
      unitOfMeasurement: template.unitOfMeasurement || '%',
      calculationDirection: template.calculationDirection || 'higher_is_better',
      targetValue: template.targetValue ?? 100,
      weightage: template.weightage ?? 20,
      ratingMethod: template.ratingMethod || 'automatic',
      ratingScale: template.ratingScale || '1-5',
      effectiveStartDate: template.effectiveStartDate ? new Date(template.effectiveStartDate).toISOString().slice(0, 10) : '',
      effectiveEndDate: template.effectiveEndDate ? new Date(template.effectiveEndDate).toISOString().slice(0, 10) : '',
      status: template.status || 'active',
    });

    const kraId = template.kraId?._id || template.kraId;
    if (kraId) {
      handleKraChange(kraId);
    }
    setShowTemplateModal(true);
  };

  // Save Template (Create or Update)
  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!templateForm.name.trim()) {
      toast.error('KPI Name is required');
      return;
    }
    if (!templateForm.department) {
      toast.error('Department is required');
      return;
    }
    if (!templateForm.kraId) {
      toast.error('Linked KRA is required');
      return;
    }

    try {
      setSavingTemplate(true);
      const payload = {
        ...templateForm,
        targetValue: Number(templateForm.targetValue) || 0,
        weightage: Number(templateForm.weightage) || 0,
      };

      if (modalMode === 'edit' && editingTemplateId) {
        const res = await pmsApi.updateKpiTemplate(editingTemplateId, payload);
        if (res.data?.success) {
          toast.success('KPI Template updated successfully');
        }
      } else {
        const res = await pmsApi.createKpiTemplate(payload);
        if (res.data?.success) {
          toast.success('KPI Template created successfully');
        }
      }

      setShowTemplateModal(false);
      fetchTemplates();
      fetchMetadata();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save KPI Template';
      toast.error(msg);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Toggle Template Status (Active / Inactive)
  const handleToggleStatus = async (template) => {
    const nextStatus = template.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await pmsApi.changeKpiTemplateStatus(template._id, nextStatus);
      if (res.data?.success) {
        toast.success(`KPI marked as ${nextStatus}`);
        fetchTemplates();
      }
    } catch (err) {
      toast.error('Failed to change status');
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this KPI template? This cannot be undone.')) return;
    try {
      const res = await pmsApi.deleteKpiTemplate(id);
      if (res.data?.success) {
        toast.success('KPI Template deleted');
        fetchTemplates();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete KPI template');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // ASSIGNMENT HANDLERS
  // ──────────────────────────────────────────────────────────────────────────
  // Available templates matching assignDept and assignDesignation
  const assignableTemplates = useMemo(() => {
    return safeTemplates.filter((t) => {
      if (!t || t.status !== 'active') return false;
      if (assignDept && t.department?.toLowerCase() !== assignDept.toLowerCase()) return false;
      if (assignDesignation && t.designation?.toLowerCase() !== assignDesignation.toLowerCase()) return false;
      return true;
    });
  }, [safeTemplates, assignDept, assignDesignation]);

  // Available employees matching assignDept and assignDesignation
  const assignableUsers = useMemo(() => {
    return safeUsers.filter((u) => {
      if (!u) return false;
      const uDept = u.department || (typeof u.departmentRef === 'object' ? u.departmentRef?.name : u.departmentRef) || '';
      const uDesig = u.designation || (typeof u.designationRef === 'object' ? u.designationRef?.title : u.designationRef) || '';
      if (assignDept && String(uDept).toLowerCase() !== assignDept.toLowerCase()) return false;
      if (assignDesignation && String(uDesig).toLowerCase() !== assignDesignation.toLowerCase()) return false;
      return true;
    });
  }, [safeUsers, assignDept, assignDesignation]);

  // Filtered employees by search query (candidate name, email, designation, department, ID)
  const filteredAssignableUsers = useMemo(() => {
    if (!assignUserSearch.trim()) return assignableUsers;
    const q = assignUserSearch.trim().toLowerCase();
    return assignableUsers.filter((u) => {
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
      const directName = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const empId = String(u.employeeId || u.empId || '').toLowerCase();
      const uDept = String(u.department || (typeof u.departmentRef === 'object' ? u.departmentRef?.name : u.departmentRef) || '').toLowerCase();
      const uDesig = String(u.designation || (typeof u.designationRef === 'object' ? u.designationRef?.title : u.designationRef) || '').toLowerCase();

      return (
        fullName.includes(q) ||
        directName.includes(q) ||
        email.includes(q) ||
        empId.includes(q) ||
        uDept.includes(q) ||
        uDesig.includes(q)
      );
    });
  }, [assignableUsers, assignUserSearch]);

  const handleToggleSelectTemplate = (id, defaultTarget, defaultWeightage) => {
    setSelectedTemplateIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (!customTargets[id]) {
        setCustomTargets((t) => ({ ...t, [id]: defaultTarget }));
      }
      if (!customWeightages[id]) {
        setCustomWeightages((w) => ({ ...w, [id]: defaultWeightage }));
      }
      return next;
    });
  };

  const handleToggleSelectUser = (id) => {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const isAllFilteredSelected = useMemo(() => {
    if (filteredAssignableUsers.length === 0) return false;
    return filteredAssignableUsers.every((u) => selectedUserIds.includes(u._id));
  }, [filteredAssignableUsers, selectedUserIds]);

  const handleSelectAllUsers = () => {
    if (isAllFilteredSelected) {
      // Deselect filtered employees
      const filteredIdSet = new Set(filteredAssignableUsers.map((u) => u._id));
      setSelectedUserIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      // Select all filtered employees without duplicates
      const newIds = new Set(selectedUserIds);
      filteredAssignableUsers.forEach((u) => newIds.add(u._id));
      setSelectedUserIds(Array.from(newIds));
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignCycleId) {
      toast.error('Please select an Appraisal Cycle');
      return;
    }
    if (selectedTemplateIds.length === 0) {
      toast.error('Please select at least one KPI Template to assign');
      return;
    }
    if (selectedUserIds.length === 0) {
      toast.error('Please select at least one Employee to assign KPIs');
      return;
    }

    try {
      setAssigning(true);
      const payload = {
        templateIds: selectedTemplateIds,
        employeeIds: selectedUserIds,
        cycleId: assignCycleId,
        customTargets,
        customWeightages,
      };

      const res = await pmsApi.assignKpisToEmployees(payload);
      if (res.data?.success) {
        toast.success(res.data.message || 'KPIs successfully assigned to employees!');
        setSelectedTemplateIds([]);
        setSelectedUserIds([]);
        setAssignUserSearch('');
        setActiveSubTab('tracking');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to assign KPIs';
      toast.error(msg);
    } finally {
      setAssigning(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // EVALUATION HANDLERS
  // ──────────────────────────────────────────────────────────────────────────
  const handleOpenEvaluate = (kpi) => {
    setEvaluatingKpi(kpi);
    setEvalData({
      actualValue: kpi.actualValue ?? '',
      employeeRating: kpi.employeeRating ?? '',
      managerRating: kpi.managerRating ?? '',
      comment: '',
      status: kpi.status === 'completed' ? 'completed' : 'evaluated',
    });
    setShowEvalModal(true);
  };

  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    if (!evaluatingKpi) return;

    try {
      setSavingEval(true);
      const payload = {
        actualValue: evalData.actualValue === '' ? undefined : Number(evalData.actualValue),
        employeeRating: evalData.employeeRating === '' ? undefined : Number(evalData.employeeRating),
        managerRating: evalData.managerRating === '' ? undefined : Number(evalData.managerRating),
        comment: evalData.comment,
        status: evalData.status,
      };

      const res = await pmsApi.evaluateAssignedKpi(evaluatingKpi._id, payload);
      if (res.data?.success) {
        toast.success('KPI Evaluation recorded successfully!');
        setShowEvalModal(false);
        fetchAssignedKpis();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to record evaluation';
      toast.error(msg);
    } finally {
      setSavingEval(false);
    }
  };

  // Live calculation of preview achievement %
  const previewAchievementPercent = useMemo(() => {
    if (!evaluatingKpi) return 0;
    const target = Number(evaluatingKpi.targetValue) || 1;
    const actual = evalData.actualValue === '' ? 0 : Number(evalData.actualValue);
    const direction = evaluatingKpi.calculationDirection || 'higher_is_better';

    if (direction === 'lower_is_better') {
      if (actual <= 0) return 100;
      return Math.max(0, Math.min(200, Math.round((target / actual) * 100)));
    }
    return Math.max(0, Math.min(200, Math.round((actual / target) * 100)));
  }, [evaluatingKpi, evalData.actualValue]);

  // Overall KPI Template stats
  const activeTemplateCount = safeTemplates.filter((t) => t?.status === 'active').length;
  const draftTemplateCount = safeTemplates.filter((t) => t?.status === 'draft').length;
  const uniqueDeptsCount = new Set(safeTemplates.map((t) => t?.department).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      {/* ─── Top Stats & Info Bar ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active KPI Templates</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Target size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{activeTemplateCount}</div>
          <span className="text-[11px] font-medium text-slate-400">Department & role library</span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Departments Covered</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Building size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{uniqueDeptsCount}</div>
          <span className="text-[11px] font-medium text-slate-400">Targeted business units</span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Assigned In Progress</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {safeAssignedList.filter((a) => a?.status === 'assigned' || a?.status === 'in_progress').length}
          </div>
          <span className="text-[11px] font-medium text-slate-400">Active appraisal tracking</span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completed & Evaluated</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {safeAssignedList.filter((a) => a?.status === 'evaluated' || a?.status === 'completed').length}
          </div>
          <span className="text-[11px] font-medium text-slate-400">Performance scored</span>
        </div>
      </div>

      {/* ─── Navigation Pills ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('templates')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'templates'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sliders size={15} />
            <span>KPI Templates Library</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-extrabold">
              {safeTemplates.length}
            </span>
          </button>

          {(isAdmin || isHr || isManager) && (
            <button
              onClick={() => setActiveSubTab('assign')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'assign'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <UserCheck size={15} />
              <span>Assign KPIs to Employees</span>
            </button>
          )}

          <button
            onClick={() => setActiveSubTab('tracking')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'tracking'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BarChart2 size={15} />
            <span>Assigned KPI Tracking & Ratings</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
              {safeAssignedList.length}
            </span>
          </button>
        </div>

        {activeSubTab === 'templates' && (isAdmin || isHr) && (
          <button
            onClick={handleOpenCreateTemplate}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus size={16} />
            <span>+ Create KPI Template</span>
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SUBTAB 1: KPI TEMPLATES LIBRARY
      ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'templates' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search KPI by name or code..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <select
              value={filterDepartment}
              onChange={(e) => {
                setFilterDepartment(e.target.value);
                setFilterDesignation('');
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">All Departments</option>
              {safeDepartments.map((d) => (
                <option key={d._id} value={d.name}>{d.name}</option>
              ))}
            </select>

            <select
              value={filterDesignation}
              onChange={(e) => setFilterDesignation(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">All Designations</option>
              {safeDesignations
                .filter((ds) => !filterDepartment || ds.department?.toLowerCase() === filterDepartment.toLowerCase())
                .map((ds) => (
                  <option key={ds._id} value={ds.title}>{ds.title}</option>
                ))}
            </select>

            <select
              value={filterKra}
              onChange={(e) => setFilterKra(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">All Linked KRAs</option>
              {safeKras.map((k) => (
                <option key={k._id} value={k._id}>{k.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Table */}
          {loadingTemplates ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
            </div>
          ) : safeTemplates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <Target size={40} className="mx-auto text-slate-300" />
              <h3 className="mt-3 text-sm font-bold text-slate-800">No KPI Templates Found</h3>
              <p className="mt-1 text-xs text-slate-400">
                {templateSearch || filterDepartment || filterKra
                  ? 'Try clearing the search filters.'
                  : 'Create reusable KPI templates for departments and job roles.'}
              </p>
              {(isAdmin || isHr) && (
                <button
                  onClick={handleOpenCreateTemplate}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                >
                  <Plus size={15} />
                  <span>Create First KPI</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">KPI Details</th>
                      <th className="py-3 px-4">Department & Role</th>
                      <th className="py-3 px-4">Linked KRA</th>
                      <th className="py-3 px-4">Measurement & Target</th>
                      <th className="py-3 px-4">Weightage</th>
                      <th className="py-3 px-4">Rating Method</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {safeTemplates.map((tpl) => (
                      <tr key={tpl._id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{tpl.name}</div>
                          {tpl.code && (
                            <span className="font-mono text-[10px] text-slate-400">[{tpl.code}]</span>
                          )}
                          {tpl.description && (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 max-w-xs">
                              {tpl.description}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                              <Building size={11} />
                              {tpl.department || 'All Departments'}
                            </span>
                            {tpl.designation ? (
                              <span className="inline-flex w-fit items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                <Briefcase size={11} />
                                {tpl.designation}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">All roles in dept</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {tpl.kraId ? (
                            <div>
                              <div className="font-semibold text-slate-800">{tpl.kraId.name || 'KRA'}</div>
                              <span className="text-[10px] font-medium text-slate-400">
                                {tpl.kraId.category || 'Standard Pillar'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-600 font-semibold">Unlinked</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">
                            {tpl.targetValue} {tpl.unitOfMeasurement || ''}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <span className="capitalize">{tpl.measurementType?.replace('_', ' ')}</span>
                            <span>•</span>
                            <span className={tpl.calculationDirection === 'lower_is_better' ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                              {tpl.calculationDirection === 'lower_is_better' ? 'Lower is better' : 'Higher is better'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-800">
                            {tpl.weightage}%
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="capitalize font-medium text-slate-700">{tpl.ratingMethod || 'automatic'}</div>
                          <span className="text-[10px] text-slate-400">Scale {tpl.ratingScale || '1-5'}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                              tpl.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : tpl.status === 'draft'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {tpl.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditTemplate(tpl, 'view')}
                              title="View KPI Details"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                            >
                              <Eye size={14} />
                            </button>

                            {(isAdmin || isHr) && (
                              <>
                                <button
                                  onClick={() => handleOpenEditTemplate(tpl, 'edit')}
                                  title="Edit KPI Template"
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                                >
                                  <Edit2 size={14} />
                                </button>

                                <button
                                  onClick={() => handleToggleStatus(tpl)}
                                  title={tpl.status === 'active' ? 'Deactivate KPI' : 'Activate KPI'}
                                  className={`rounded-lg p-1.5 transition ${
                                    tpl.status === 'active'
                                      ? 'text-amber-500 hover:bg-amber-50'
                                      : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                >
                                  <CheckCircle2 size={14} />
                                </button>

                                <button
                                  onClick={() => handleDeleteTemplate(tpl._id)}
                                  title="Delete KPI"
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUBTAB 2: ASSIGN KPIS TO EMPLOYEES
      ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'assign' && (
        <form onSubmit={handleAssignSubmit} className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Step 1: Select Target Scope & Appraisal Cycle</h3>
              <p className="text-xs text-slate-500">Filter KPIs and employees by department and job role.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Appraisal Cycle *</label>
                <select
                  required
                  value={assignCycleId}
                  onChange={(e) => setAssignCycleId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">Select Appraisal Cycle</option>
                  {safeCycles.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({String(c.status).replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Department</label>
                <select
                  value={assignDept}
                  onChange={(e) => {
                    setAssignDept(e.target.value);
                    setAssignDesignation('');
                    setSelectedTemplateIds([]);
                    setSelectedUserIds([]);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">All Departments</option>
                  {safeDepartments.map((d) => (
                    <option key={d._id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Designation / Role</label>
                <select
                  value={assignDesignation}
                  onChange={(e) => {
                    setAssignDesignation(e.target.value);
                    setSelectedTemplateIds([]);
                    setSelectedUserIds([]);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">All Designations</option>
                  {safeDesignations
                    .filter((ds) => !assignDept || ds.department?.toLowerCase() === assignDept.toLowerCase())
                    .map((ds) => (
                      <option key={ds._id} value={ds.title}>{ds.title}</option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 2: Select KPIs */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 2: Select Relevant KPI Templates ({selectedTemplateIds.length} selected)</h3>
                <p className="text-xs text-slate-500">Pick active templates to assign. You can fine-tune specific targets & weightages below.</p>
              </div>
            </div>

            {assignableTemplates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                No active KPI templates found for this department/role filter. Create templates in the Library first.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {assignableTemplates.map((tpl) => {
                  const isChecked = selectedTemplateIds.includes(tpl._id);
                  return (
                    <div
                      key={tpl._id}
                      onClick={() => handleToggleSelectTemplate(tpl._id, tpl.targetValue, tpl.weightage)}
                      className={`cursor-pointer rounded-xl border p-4 transition ${
                        isChecked
                          ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by div
                            className="mt-0.5 h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <div className="font-bold text-xs text-slate-900">{tpl.name}</div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              KRA: <span className="font-semibold">{tpl.kraId?.name || 'General'}</span> • Base Target: {tpl.targetValue} {tpl.unitOfMeasurement}
                            </div>
                          </div>
                        </div>

                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                          {tpl.weightage}% Wt
                        </span>
                      </div>

                      {/* Optional Target / Weightage Customization if selected */}
                      {isChecked && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-3 grid grid-cols-2 gap-2 border-t border-blue-200/60 pt-2.5"
                        >
                          <div>
                            <label className="text-[10px] font-bold text-slate-600">Custom Target Value</label>
                            <input
                              type="number"
                              value={customTargets[tpl._id] ?? tpl.targetValue}
                              onChange={(e) =>
                                setCustomTargets({ ...customTargets, [tpl._id]: Number(e.target.value) })
                              }
                              className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-blue-500 focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600">Custom Weightage (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={customWeightages[tpl._id] ?? tpl.weightage}
                              onChange={(e) =>
                                setCustomWeightages({ ...customWeightages, [tpl._id]: Number(e.target.value) })
                              }
                              className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-blue-500 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 3: Select Employees */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 3: Choose Relevant Employees ({selectedUserIds.length} selected)</h3>
                <p className="text-xs text-slate-500">Only assign KPIs to relevant employees matching their job role.</p>
              </div>

              {filteredAssignableUsers.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllUsers}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  {isAllFilteredSelected ? 'Deselect Filtered' : 'Select All Filtered'}
                </button>
              )}
            </div>

            {/* Candidate / Employee Search Field Bar */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search candidates / employees by name, role, department, or email..."
                value={assignUserSearch}
                onChange={(e) => setAssignUserSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-9 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
              />
              {assignUserSearch && (
                <button
                  type="button"
                  onClick={() => setAssignUserSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-full hover:bg-slate-200/60"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {assignableUsers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                No active employees found matching the chosen department or designation.
              </div>
            ) : filteredAssignableUsers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 space-y-2">
                <div>No candidates found matching &quot;{assignUserSearch}&quot;.</div>
                <button
                  type="button"
                  onClick={() => setAssignUserSearch('')}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Clear search filter
                </button>
              </div>
            ) : (
              <>
                {assignUserSearch.trim() && (
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 px-0.5">
                    <span>
                      Showing {filteredAssignableUsers.length} of {assignableUsers.length} candidates
                    </span>
                    <button
                      type="button"
                      onClick={() => setAssignUserSearch('')}
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      Show all ({assignableUsers.length})
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-60 overflow-y-auto pr-1">
                  {filteredAssignableUsers.map((u) => {
                    const isChecked = selectedUserIds.includes(u._id);
                    return (
                      <div
                        key={u._id}
                        onClick={() => handleToggleSelectUser(u._id)}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition ${
                          isChecked
                            ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="h-3.5 w-3.5 rounded-sm border-slate-300 text-blue-600"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-800">
                              {u.firstName} {u.lastName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {u.designation || (typeof u.designationRef === 'object' ? u.designationRef?.title : u.designationRef) || 'Staff'} • {u.department || (typeof u.departmentRef === 'object' ? u.departmentRef?.name : u.departmentRef) || 'General'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Submit Assignment Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setSelectedTemplateIds([]);
                setSelectedUserIds([]);
                setAssignUserSearch('');
              }}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Reset Selection
            </button>
            <button
              type="submit"
              disabled={assigning || selectedTemplateIds.length === 0 || selectedUserIds.length === 0}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
            >
              {assigning ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <UserCheck size={16} />
              )}
              <span>Assign {selectedTemplateIds.length} KPI(s) to {selectedUserIds.length} Employee(s)</span>
            </button>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUBTAB 3: ASSIGNED KPI TRACKING & RATINGS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'tracking' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by KPI name or employee..."
                value={assignedSearch}
                onChange={(e) => setAssignedSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <select
              value={assignedFilterCycle}
              onChange={(e) => setAssignedFilterCycle(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">All Appraisal Cycles</option>
              {safeCycles.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            <select
              value={assignedFilterStatus}
              onChange={(e) => setAssignedFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="evaluated">Evaluated</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Table */}
          {loadingAssigned ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
            </div>
          ) : safeAssignedList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <BarChart2 size={40} className="mx-auto text-slate-300" />
              <h3 className="mt-3 text-sm font-bold text-slate-800">No Assigned KPIs Found</h3>
              <p className="mt-1 text-xs text-slate-400">
                Assign KPIs to employees in the 'Assign KPIs to Employees' tab.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">KPI & KRA</th>
                      <th className="py-3 px-4">Target vs Actual</th>
                      <th className="py-3 px-4">Achievement %</th>
                      <th className="py-3 px-4">Ratings (Self / Mgr)</th>
                      <th className="py-3 px-4">Weighted Score</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {safeAssignedList.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {item.employeeId?.firstName} {item.employeeId?.lastName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.designation || (typeof item.employeeId?.designationRef === 'object' ? item.employeeId?.designationRef?.title : item.employeeId?.designation) || 'Staff'} • {item.department || (typeof item.employeeId?.departmentRef === 'object' ? item.employeeId?.departmentRef?.name : item.employeeId?.department) || 'Dept'}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{item.name}</div>
                          <span className="text-[10px] text-slate-400">
                            KRA: {item.kraId?.name || 'General'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            Target: {item.targetValue} {item.unitOfMeasurement || ''}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Actual: <span className="font-bold">{item.actualValue ?? '—'}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${
                                  (item.achievementPercentage || 0) >= 100
                                    ? 'bg-emerald-500'
                                    : (item.achievementPercentage || 0) >= 70
                                    ? 'bg-blue-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, item.achievementPercentage || 0)}%` }}
                              />
                            </div>
                            <span className="font-extrabold text-slate-800">
                              {item.achievementPercentage ?? 0}%
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <span title="Self Rating">{item.employeeRating ?? '—'}</span>
                            <span className="text-slate-300">/</span>
                            <span title="Manager Rating" className="text-blue-600 font-extrabold">
                              {item.managerRating ?? '—'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">Scale {item.ratingScale || '1-5'}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-black text-blue-700">
                            {item.weightedScore ? Number(item.weightedScore).toFixed(1) : '—'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                              item.status === 'completed' || item.status === 'evaluated'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.status === 'submitted'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenEvaluate(item)}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                          >
                            <Award size={13} />
                            <span>Evaluate</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 1: ADD / EDIT / VIEW KPI TEMPLATE (ALL 14 FIELDS)
      ══════════════════════════════════════════════════════════════════════ */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {modalMode === 'view'
                    ? 'KPI Template Details'
                    : modalMode === 'edit'
                    ? 'Edit KPI Template'
                    : 'Create New Reusable KPI Template'}
                </h3>
                <p className="text-xs text-slate-500">
                  Standardize metrics across departments and job roles
                </p>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              {/* Row 1: KPI Name & KPI Code */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">KPI Name *</label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'view'}
                    placeholder="e.g. Defect-Free Release Rate or Time-to-Hire"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">KPI Code</label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    placeholder="e.g. IT-KPI-01"
                    value={templateForm.code}
                    onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Row 2: Department, Designation, Linked KRA */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Department *</label>
                  <select
                    required
                    disabled={modalMode === 'view'}
                    value={templateForm.department}
                    onChange={(e) => setTemplateForm({ ...templateForm, department: e.target.value, designation: '' })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                  >
                    <option value="">Select Department</option>
                    {safeDepartments.map((d) => (
                      <option key={d._id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Designation / Role</label>
                  <select
                    disabled={modalMode === 'view'}
                    value={templateForm.designation}
                    onChange={(e) => setTemplateForm({ ...templateForm, designation: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                  >
                    <option value="">All Roles in Department</option>
                    {filteredDesignations.map((ds) => (
                      <option key={ds._id} value={ds.title}>{ds.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Linked KRA *</label>
                  <select
                    required
                    disabled={modalMode === 'view'}
                    value={templateForm.kraId}
                    onChange={(e) => handleKraChange(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                  >
                    <option value="">Select Linked KRA</option>
                    {safeKras.map((k) => (
                      <option key={k._id} value={k._id}>
                        {k.name} ({k.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic KRA Weightage Balance Display */}
              {selectedKraSummary && (
                <div className={`rounded-xl border p-3 text-xs flex items-center justify-between ${
                  selectedKraSummary.isOverAllocated
                    ? 'border-rose-200 bg-rose-50 text-rose-800'
                    : 'border-blue-200 bg-blue-50 text-blue-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <Info size={16} />
                    <span>
                      Existing KPIs under this KRA: <strong>{selectedKraSummary.totalWeightage}%</strong> allocated.
                      Remaining budget: <strong>{selectedKraSummary.remainingWeightage}%</strong>.
                    </span>
                  </div>
                  <span className="font-extrabold text-[11px] uppercase">
                    {selectedKraSummary.isFull ? '100% Filled' : selectedKraSummary.isOverAllocated ? 'Overallocated' : 'Available'}
                  </span>
                </div>
              )}

              {/* Row 3: Measurement Type, Unit, Direction */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Measurement Type</label>
                  <select
                    disabled={modalMode === 'view'}
                    value={templateForm.measurementType}
                    onChange={(e) => {
                      const type = e.target.value;
                      const matched = MEASUREMENT_TYPES.find((m) => m.id === type);
                      setTemplateForm({
                        ...templateForm,
                        measurementType: type,
                        unitOfMeasurement: matched ? matched.defaultUnit : templateForm.unitOfMeasurement,
                      });
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                  >
                    {MEASUREMENT_TYPES.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Unit of Measurement</label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    placeholder="%, days, USD, count"
                    value={templateForm.unitOfMeasurement}
                    onChange={(e) => setTemplateForm({ ...templateForm, unitOfMeasurement: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Calculation Direction</label>
                  <select
                    disabled={modalMode === 'view'}
                    value={templateForm.calculationDirection}
                    onChange={(e) => setTemplateForm({ ...templateForm, calculationDirection: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                  >
                    {CALCULATION_DIRECTIONS.map((cd) => (
                      <option key={cd.id} value={cd.id}>{cd.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Target Value & Weightage */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Target Value *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    disabled={modalMode === 'view'}
                    value={templateForm.targetValue}
                    onChange={(e) => setTemplateForm({ ...templateForm, targetValue: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">KPI Weightage (0–100%) *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    disabled={modalMode === 'view'}
                    value={templateForm.weightage}
                    onChange={(e) => setTemplateForm({ ...templateForm, weightage: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Row 5: Rating Method & Rating Scale */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Rating Method</label>
                  <select
                    disabled={modalMode === 'view'}
                    value={templateForm.ratingMethod}
                    onChange={(e) => setTemplateForm({ ...templateForm, ratingMethod: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                  >
                    {RATING_METHODS.map((rm) => (
                      <option key={rm.id} value={rm.id}>{rm.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Rating Scale</label>
                  <select
                    disabled={modalMode === 'view'}
                    value={templateForm.ratingScale}
                    onChange={(e) => setTemplateForm({ ...templateForm, ratingScale: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                  >
                    {RATING_SCALES.map((rs) => (
                      <option key={rs.id} value={rs.id}>{rs.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 6: Effective Dates & Status */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Effective Start Date</label>
                  <input
                    type="date"
                    disabled={modalMode === 'view'}
                    value={templateForm.effectiveStartDate}
                    onChange={(e) => setTemplateForm({ ...templateForm, effectiveStartDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Effective End Date</label>
                  <input
                    type="date"
                    disabled={modalMode === 'view'}
                    value={templateForm.effectiveEndDate}
                    onChange={(e) => setTemplateForm({ ...templateForm, effectiveEndDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Template Status</label>
                  <select
                    disabled={modalMode === 'view'}
                    value={templateForm.status}
                    onChange={(e) => setTemplateForm({ ...templateForm, status: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700">Description & Measurement Criteria</label>
                <textarea
                  rows={2}
                  disabled={modalMode === 'view'}
                  placeholder="Detailed guidelines on how this KPI is measured, verified, and scored..."
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  {modalMode === 'view' ? 'Close' : 'Cancel'}
                </button>

                {modalMode !== 'view' && (
                  <button
                    type="submit"
                    disabled={savingTemplate}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {savingTemplate ? 'Saving...' : modalMode === 'edit' ? 'Update KPI' : 'Create KPI Template'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2: EVALUATE ASSIGNED KPI (RATINGS & ACHIEVEMENT)
      ══════════════════════════════════════════════════════════════════════ */}
      {showEvalModal && evaluatingKpi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Evaluate Employee KPI</h3>
                <p className="text-xs text-slate-500">
                  {evaluatingKpi.employeeId?.firstName} {evaluatingKpi.employeeId?.lastName} • {evaluatingKpi.name}
                </p>
              </div>
              <button
                onClick={() => setShowEvalModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEvaluation} className="space-y-4">
              {/* Target & Direction Overview */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Target:</span>
                  <span className="font-bold text-slate-900">
                    {evaluatingKpi.targetValue} {evaluatingKpi.unitOfMeasurement}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Calculation Direction:</span>
                  <span className="font-semibold text-slate-800">
                    {evaluatingKpi.calculationDirection === 'lower_is_better' ? 'Lower is Better (Inverse)' : 'Higher is Better'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Weightage:</span>
                  <span className="font-bold text-slate-900">{evaluatingKpi.weightage}%</span>
                </div>
              </div>

              {/* Actual Value Input & Live Achievement % */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Actual Value Achieved</label>
                  <input
                    type="number"
                    step="any"
                    value={evalData.actualValue}
                    onChange={(e) => setEvalData({ ...evalData, actualValue: e.target.value })}
                    placeholder={`e.g. ${evaluatingKpi.targetValue}`}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Calculated Achievement</label>
                  <div className="mt-1 flex items-center h-9 px-3 rounded-xl bg-blue-50 border border-blue-200 text-xs font-black text-blue-700">
                    {previewAchievementPercent}%
                  </div>
                </div>
              </div>

              {/* Self Rating vs Manager Rating */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Employee Self Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max={evaluatingKpi.ratingScale === '1-10' ? 10 : evaluatingKpi.ratingScale === '1-100' ? 100 : 5}
                    value={evalData.employeeRating}
                    onChange={(e) => setEvalData({ ...evalData, employeeRating: e.target.value })}
                    placeholder="e.g. 4.0"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Manager Final Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max={evaluatingKpi.ratingScale === '1-10' ? 10 : evaluatingKpi.ratingScale === '1-100' ? 100 : 5}
                    value={evalData.managerRating}
                    onChange={(e) => setEvalData({ ...evalData, managerRating: e.target.value })}
                    placeholder="e.g. 4.5"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700">Evaluation Status</label>
                <select
                  value={evalData.status}
                  onChange={(e) => setEvalData({ ...evalData, status: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="in_progress">In Progress</option>
                  <option value="submitted">Submitted by Employee</option>
                  <option value="evaluated">Evaluated by Manager</option>
                  <option value="completed">Completed & Finalized</option>
                </select>
              </div>

              {/* Evaluator Comments */}
              <div>
                <label className="block text-xs font-bold text-slate-700">Reviewer Comments</label>
                <textarea
                  rows={2}
                  value={evalData.comment}
                  onChange={(e) => setEvalData({ ...evalData, comment: e.target.value })}
                  placeholder="Feedback, milestones achieved, areas of excellence or improvement..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEvalModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEval}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {savingEval ? 'Saving...' : 'Save Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
