import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  LayoutDashboard,
  Calendar,
  Layers,
  Target,
  FileText,
  MessageSquare,
  FileSpreadsheet,
  Settings,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Star,
  Users,
  ChevronRight,
  ChevronDown,
  Download,
  Filter,
  Check,
  ArrowRight,
  MoreVertical,
  ThumbsUp,
  Eye,
  Sliders,
  Award,
  Edit,
  Trash2,
  Send,
  X,
  RefreshCw,
  Heart,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import pmsApi from '../api/pmsApi';

// Subcomponents
import SimpleTeamEvaluations from '../components/SimpleTeamEvaluations';
import PmsSettings from '../components/PmsSettings';

const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444'];

export default function PerformanceApp() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';

  // Role resolution
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

  const setTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // ─── TAB 1: OVERVIEW STATE (100% LIVE REAL DATA) ──────────────────────────
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, [currentTab]);

  const fetchDashboard = async () => {
    try {
      setDashboardLoading(true);
      const res = await pmsApi.getDashboardMetrics();
      if (res.data?.success) {
        setDashboardData(res.data.data);
      }
    } catch (e) {
      console.error('[Dashboard Metrics Fetch Error]:', e);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Live real metrics from MongoDB
  const totalEmployees = dashboardData?.summary?.totalEmployees ?? dashboardData?.summary?.totalReviews ?? 0;
  const completedReviews = dashboardData?.summary?.published ?? 0;
  const pendingReviews = dashboardData?.summary?.pendingReviews ?? dashboardData?.summary?.managerPending ?? 0;
  const avgRating = dashboardData?.summary?.averageRating ? Number(dashboardData.summary.averageRating).toFixed(1) : '0.0';

  // Real Rating Distribution Bar Chart Data
  const ratingDistribution = [1, 2, 3, 4, 5].map((star) => {
    const found = dashboardData?.ratingDistribution?.find((d) => String(d.rating) === String(star));
    const fillColors = { 1: '#ef4444', 2: '#f59e0b', 3: '#6366f1', 4: '#3b82f6', 5: '#10b981' };
    return {
      rating: String(star),
      count: found ? found.count : 0,
      fill: fillColors[star],
    };
  });

  // Real Goal Summary Donut Data
  const goalSummary = dashboardData?.goalSummary || {
    total: 0,
    achieved: 0,
    onTrack: 0,
    atRisk: 0,
    notStarted: 0,
    achievedPercent: 0,
  };

  const goalCompletionData = [
    { name: 'Achieved', value: goalSummary.achieved, color: '#10b981' },
    { name: 'On Track', value: goalSummary.onTrack, color: '#3b82f6' },
    { name: 'At Risk', value: goalSummary.atRisk, color: '#f59e0b' },
    { name: 'Not Started', value: goalSummary.notStarted, color: '#94a3b8' },
  ];

  // Real Top Performers from appraisals/users (strictly active)
  const topPerformers = (dashboardData?.topPerformers || [])
    .filter((tp) => {
      const u = tp.employeeId || tp;
      return u && u.isActive !== false && u.status !== 'Inactive' && u.status !== 'inactive';
    })
    .map((tp) => {
      const u = tp.employeeId || tp;
      const firstName = u.firstName || '';
      const lastName = u.lastName || '';
      const fullName = (firstName && lastName ? `${firstName} ${lastName}` : u.name || u.email || 'Employee').trim();
      return {
        _id: u._id || tp._id,
        name: fullName,
        role: u.designation || u.department || 'Employee',
        score: tp.scores?.calculatedFinalScore || tp.score || 0,
        band: tp.scores?.ratingBand || tp.band || 'Pending Review',
      };
    });

  // ─── TAB 2: CYCLES STATE (100% LIVE REAL DATA) ────────────────────────────
  const [cyclesList, setCyclesList] = useState([]);
  const [loadingCycles, setLoadingCycles] = useState(false);
  const [showCreateCycleModal, setShowCreateCycleModal] = useState(false);
  const [cycleStep, setCycleStep] = useState(1);
  const [cycleForm, setCycleForm] = useState({
    name: 'FY 2025-26 Performance Review Cycle',
    cycleType: 'annual',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    description: 'Enterprise appraisal cycle with direct manager rating, HR sign-off, and admin approval.',
    // Step 2: Template
    ratingScale: '1-5',
    kraWeight: 40,
    kpiWeight: 20,
    goalWeight: 20,
    competencyWeight: 20,
    allowSelfAppraisal: true,
    allow360Feedback: true,
    requireGoalApproval: true,
    // Step 3: Participants
    participantScope: 'all',
    applicableDepartments: [],
    // Step 4: Reviewers & Timeline
    selfAppraisalDeadline: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    managerReviewDeadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    calibrationDeadline: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
    publishingDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
    requireManagerReview: true,
    requireDeptHeadReview: false,
    requireHrEvaluation: true,
    requireFinalApproval: true,
  });

  useEffect(() => {
    if (currentTab === 'cycles') {
      fetchCycles();
    }
  }, [currentTab]);

  const fetchCycles = async () => {
    try {
      setLoadingCycles(true);
      const res = await pmsApi.getCycles();
      if (res.data?.success) {
        setCyclesList(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCycles(false);
    }
  };

  const handleFinishLaunchCycle = async () => {
    try {
      const payload = {
        name: cycleForm.name,
        cycleType: cycleForm.cycleType || 'annual',
        startDate: cycleForm.startDate,
        endDate: cycleForm.endDate,
        description: cycleForm.description,
        status: 'in_progress',
        applicableDepartments: cycleForm.participantScope === 'departments' ? cycleForm.applicableDepartments : [],
        timeline: {
          selfAppraisalDeadline: cycleForm.selfAppraisalDeadline,
          managerReviewDeadline: cycleForm.managerReviewDeadline,
          calibrationEnd: cycleForm.calibrationDeadline,
          publishingDate: cycleForm.publishingDate,
        },
        settings: {
          ratingScale: cycleForm.ratingScale || '1-5',
          weightageModel: {
            kraWeight: Number(cycleForm.kraWeight || 0),
            kpiWeight: Number(cycleForm.kpiWeight || 0),
            goalWeight: Number(cycleForm.goalWeight || 0),
            competencyWeight: Number(cycleForm.competencyWeight || 0),
          },
          allowSelfAppraisal: cycleForm.allowSelfAppraisal,
          allow360Feedback: cycleForm.allow360Feedback,
          requireGoalApproval: cycleForm.requireGoalApproval,
        },
      };
      const res = await pmsApi.createCycle(payload);
      if (res.data?.success) {
        toast.success('Performance Cycle created & participants synchronized!');
        setShowCreateCycleModal(false);
        setCycleStep(1);
        fetchCycles();
        fetchDashboard();
      } else {
        toast.error(res.data?.message || 'Failed to create cycle');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Error creating cycle';
      toast.error(errMsg);
    }
  };

  // ─── Edit & Delete Cycle Handlers ──────────────────────────────────────────
  const [editingCycle, setEditingCycle] = useState(null);
  const [showEditCycleModal, setShowEditCycleModal] = useState(false);
  const [cycleToDelete, setCycleToDelete] = useState(null);
  const [showDeleteCycleModal, setShowDeleteCycleModal] = useState(false);
  const [isSubmittingCycle, setIsSubmittingCycle] = useState(false);

  const handleOpenEditCycle = (cycle) => {
    setEditingCycle({
      _id: cycle._id,
      name: cycle.name || '',
      cycleType: cycle.cycleType || 'annual',
      status: cycle.status || 'in_progress',
      startDate: cycle.startDate ? new Date(cycle.startDate).toISOString().slice(0, 10) : '',
      endDate: cycle.endDate ? new Date(cycle.endDate).toISOString().slice(0, 10) : '',
      description: cycle.description || '',
    });
    setShowEditCycleModal(true);
  };

  const handleSaveEditCycle = async (e) => {
    if (e) e.preventDefault();
    if (!editingCycle?.name?.trim()) {
      toast.error('Cycle name is required');
      return;
    }
    if (!editingCycle?.startDate || !editingCycle?.endDate) {
      toast.error('Start date and end date are required');
      return;
    }
    if (new Date(editingCycle.startDate) > new Date(editingCycle.endDate)) {
      toast.error('Start date cannot be after end date');
      return;
    }

    try {
      setIsSubmittingCycle(true);
      const payload = {
        name: editingCycle.name.trim(),
        cycleType: editingCycle.cycleType,
        status: editingCycle.status,
        startDate: editingCycle.startDate,
        endDate: editingCycle.endDate,
        description: editingCycle.description,
      };
      const res = await pmsApi.updateCycle(editingCycle._id, payload);
      if (res.data?.success) {
        toast.success('Performance cycle updated successfully!');
        setShowEditCycleModal(false);
        setEditingCycle(null);
        fetchCycles();
        fetchDashboard();
      } else {
        toast.error(res.data?.message || 'Failed to update cycle');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error updating cycle');
    } finally {
      setIsSubmittingCycle(false);
    }
  };

  const handleConfirmDeleteCycle = (cycle) => {
    setCycleToDelete(cycle);
    setShowDeleteCycleModal(true);
  };

  const handleDeleteCycle = async () => {
    if (!cycleToDelete?._id) return;
    try {
      setIsSubmittingCycle(true);
      const res = await pmsApi.deleteCycle(cycleToDelete._id);
      if (res.data?.success) {
        toast.success('Performance cycle deleted successfully!');
        setShowDeleteCycleModal(false);
        setCycleToDelete(null);
        fetchCycles();
        fetchDashboard();
      } else {
        toast.error(res.data?.message || 'Failed to delete cycle');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error deleting cycle');
    } finally {
      setIsSubmittingCycle(false);
    }
  };

  // ─── TAB 3: KRA & KPI STATE (100% LIVE REAL DATA) ─────────────────────────
  const [krasList, setKrasList] = useState([]);
  const [loadingKras, setLoadingKras] = useState(false);
  const [kraSubTab, setKraSubTab] = useState('by_role');
  const [kraSearch, setKraSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [showAddKraModal, setShowAddKraModal] = useState(false);
  const [showEditKraModal, setShowEditKraModal] = useState(false);
  const [editingKra, setEditingKra] = useState(null);
  const [showDeleteKraModal, setShowDeleteKraModal] = useState(false);
  const [kraToDelete, setKraToDelete] = useState(null);
  const [isSubmittingKra, setIsSubmittingKra] = useState(false);
  const [newKraForm, setNewKraForm] = useState({
    name: '',
    description: '',
    category: 'Productivity & Delivery',
    weightage: 20,
    applicableDepartments: [],
    assignmentType: 'by_role',
  });

  useEffect(() => {
    if (currentTab === 'kras') {
      fetchKras();
    }
  }, [currentTab, kraSearch, selectedDept, kraSubTab]);

  const fetchKras = async () => {
    try {
      setLoadingKras(true);
      const params = {};
      if (kraSearch) params.search = kraSearch;
      if (selectedDept && selectedDept !== 'All') params.department = selectedDept;
      if (kraSubTab) params.assignmentType = kraSubTab;
      const res = await pmsApi.getKras(params);
      if (res.data?.success) {
        setKrasList(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKras(false);
    }
  };

  const handleSaveKra = async (e) => {
    e.preventDefault();
    if (!newKraForm.name.trim()) {
      toast.error('KRA name is required');
      return;
    }
    try {
      setIsSubmittingKra(true);
      const payload = {
        name: newKraForm.name.trim(),
        description: newKraForm.description,
        category: newKraForm.category,
        weightage: Number(newKraForm.weightage) || 20,
        applicableDepartments: newKraForm.applicableDepartments,
        assignmentType: newKraForm.assignmentType || kraSubTab || 'by_role',
        cycleId: dashboardData?.activeCycle?._id || null,
      };
      const res = await pmsApi.createKra(payload);
      if (res.data?.success) {
        toast.success('KRA created successfully!');
        setShowAddKraModal(false);
        setNewKraForm({
          name: '',
          description: '',
          category: 'Productivity & Delivery',
          weightage: 20,
          applicableDepartments: [],
          assignmentType: kraSubTab || 'by_role',
        });
        fetchKras();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save KRA');
    } finally {
      setIsSubmittingKra(false);
    }
  };

  const handleOpenEditKra = (kra) => {
    let defaultType = kra.assignmentType;
    if (!defaultType) {
      if (kra.isTemplate) defaultType = 'kra_library';
      else if (kra.applicableEmployees?.length) defaultType = 'by_employee';
      else if (kra.applicableDepartments?.length) defaultType = 'by_department';
      else defaultType = 'by_role';
    }

    setEditingKra({
      _id: kra._id,
      name: kra.name || '',
      category: kra.category || 'Productivity & Delivery',
      weightage: kra.weightage ?? 20,
      description: kra.description || '',
      applicableDepartments: Array.isArray(kra.applicableDepartments) ? kra.applicableDepartments : [],
      assignmentType: defaultType,
      status: kra.status || 'active',
    });
    setShowEditKraModal(true);
  };

  const handleSaveEditKra = async (e) => {
    e.preventDefault();
    if (!editingKra?.name?.trim()) {
      toast.error('KRA name is required');
      return;
    }
    try {
      setIsSubmittingKra(true);
      const payload = {
        name: editingKra.name.trim(),
        category: editingKra.category,
        weightage: Number(editingKra.weightage) || 0,
        description: editingKra.description || '',
        applicableDepartments: editingKra.applicableDepartments || [],
        assignmentType: editingKra.assignmentType || 'by_role',
        status: editingKra.status || 'active',
      };
      const res = await pmsApi.updateKra(editingKra._id, payload);
      if (res.data?.success) {
        toast.success('KRA updated successfully!');
        setShowEditKraModal(false);
        setEditingKra(null);
        fetchKras();
      } else {
        toast.error(res.data?.message || 'Failed to update KRA');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error updating KRA');
    } finally {
      setIsSubmittingKra(false);
    }
  };

  const handleConfirmDeleteKra = (kra) => {
    setKraToDelete(kra);
    setShowDeleteKraModal(true);
  };

  const handleDeleteKra = async () => {
    if (!kraToDelete?._id) return;
    try {
      setIsSubmittingKra(true);
      const res = await pmsApi.deleteKra(kraToDelete._id);
      if (res.data?.success) {
        toast.success('KRA deleted successfully!');
        setShowDeleteKraModal(false);
        setKraToDelete(null);
        fetchKras();
      } else {
        toast.error(res.data?.message || 'Failed to delete KRA');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error deleting KRA');
    } finally {
      setIsSubmittingKra(false);
    }
  };

  // ─── TAB 4: GOALS (OKRS) STATE (100% LIVE REAL DATA) ───────────────────────
  const [goalsList, setGoalsList] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [goalSubTab, setGoalSubTab] = useState('my_goals');
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [newGoalForm, setNewGoalForm] = useState({
    title: '',
    description: '',
    scope: 'individual',
    weightage: 20,
    priority: 'high',
    dueDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (currentTab === 'goals') {
      fetchGoals();
    }
  }, [currentTab, goalSubTab]);

  const fetchGoals = async () => {
    try {
      setLoadingGoals(true);
      const params = {};
      if (goalSubTab === 'my_goals') {
        params.scope = 'self';
      } else if (goalSubTab === 'team_goals') {
        params.scope = 'my_team';
      } else if (goalSubTab === 'company_goals') {
        params.scope = 'company_goals';
      }
      const res = await pmsApi.getGoals(params);
      if (res.data?.success) {
        setGoalsList(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGoals(false);
    }
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!newGoalForm.title.trim()) {
      toast.error('Goal title is required');
      return;
    }
    const cycleId = dashboardData?.activeCycle?._id || dashboardData?.cycles?.[0]?._id;
    if (!cycleId) {
      toast.error('No active review cycle found. Please create a cycle first.');
      return;
    }
    try {
      const payload = {
        ...newGoalForm,
        cycleId,
        employeeId: user?._id,
      };
      const res = await pmsApi.createGoal(payload);
      if (res.data?.success) {
        toast.success('Goal created successfully!');
        setShowAddGoalModal(false);
        const targetSubTab =
          newGoalForm.scope === 'team'
            ? 'team_goals'
            : newGoalForm.scope === 'company'
            ? 'company_goals'
            : 'my_goals';

        setNewGoalForm({
          title: '',
          description: '',
          scope: newGoalForm.scope,
          weightage: 20,
          priority: 'high',
          dueDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
        });

        if (goalSubTab !== targetSubTab) {
          setGoalSubTab(targetSubTab);
        } else {
          fetchGoals();
        }
        fetchDashboard();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create goal');
    }
  };

  // Live Goal Summary counts
  const totalGoalsCount = goalsList.length;
  const achievedGoalsCount = goalsList.filter((g) => ['completed', 'achieved'].includes(g.status)).length;
  const onTrackGoalsCount = goalsList.filter((g) => ['in_progress', 'on_track'].includes(g.status)).length;
  const atRiskGoalsCount = goalsList.filter((g) => ['at_risk', 'blocked'].includes(g.status)).length;

  // ─── TAB 6: 360 FEEDBACK STATE (100% LIVE REAL DATA) ──────────────────────
  const [feedbackList, setFeedbackList] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackSubTab, setFeedbackSubTab] = useState('overview');
  const [showGiveFeedbackModal, setShowGiveFeedbackModal] = useState(false);
  const [newFeedbackForm, setNewFeedbackForm] = useState({
    toUser: '',
    feedbackType: 'appreciation',
    title: '',
    content: '',
    category: 'Team Collaboration',
  });

  useEffect(() => {
    if (currentTab === '360') {
      fetchFeedbacks();
    }
  }, [currentTab, feedbackSubTab]);

  const fetchFeedbacks = async () => {
    try {
      setLoadingFeedback(true);
      const params = {};
      if (feedbackSubTab === 'responses') params.tab = 'received';
      const res = await pmsApi.getFeedbacks(params);
      if (res.data?.success) {
        setFeedbackList(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (!newFeedbackForm.toUser || !newFeedbackForm.content.trim()) {
      toast.error('Recipient and feedback content are required');
      return;
    }
    try {
      const res = await pmsApi.giveFeedback(newFeedbackForm);
      if (res.data?.success) {
        toast.success('Feedback & recognition submitted!');
        setShowGiveFeedbackModal(false);
        setNewFeedbackForm({
          toUser: '',
          feedbackType: 'appreciation',
          title: '',
          content: '',
          category: 'Team Collaboration',
        });
        fetchFeedbacks();
        fetchDashboard();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback');
    }
  };

  // Real 360 Feedback Metrics
  const totalFeedbackCount = feedbackList.length;
  const appreciationFeedbacks = feedbackList.filter((f) => f.feedbackType === 'appreciation').length;
  const constructiveFeedbacks = feedbackList.filter((f) => f.feedbackType === 'constructive').length;
  const meetingFeedbacks = feedbackList.filter((f) => f.feedbackType === '1on1_meeting').length;

  const feedbackSources = [
    { name: 'Appreciation', value: appreciationFeedbacks || 1, color: '#10b981' },
    { name: 'Constructive', value: constructiveFeedbacks || 0, color: '#3b82f6' },
    { name: '1-on-1 Notes', value: meetingFeedbacks || 0, color: '#f59e0b' },
  ];

  // ─── TAB 7: REPORTS STATE (100% LIVE REAL DATA) ───────────────────────────
  const deptPerformanceData = dashboardData?.departmentPerformance || [];
  const talentBands = dashboardData?.talentBands || { high: 0, meets: 0, needsImp: 0, low: 0, totalScored: 0 };
  const totalScored = talentBands.totalScored || 1;
  const highPercent = Math.round((talentBands.high / totalScored) * 100);
  const meetsPercent = Math.round((talentBands.meets / totalScored) * 100);
  const needsImpPercent = Math.round((talentBands.needsImp / totalScored) * 100);
  const lowPercent = Math.round((talentBands.low / totalScored) * 100);

  // Primary Header Action click
  const handlePrimaryAction = () => {
    if (isAdmin || isHr) {
      setTab('cycles');
      setShowCreateCycleModal(true);
    } else if (isManager) {
      setTab('reviews');
    } else {
      setShowAddGoalModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ─── Top Header Matching Zoho HR Reference ──────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <Link
            to="/ess/performance"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition mb-1.5"
          >
            <ArrowLeft size={14} />
            <span>Back to My Performance</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Performance Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Enterprise appraisal cycles, KRA/KPI tracking, multi-rater reviews, calibration, and continuous feedback.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Primary Action Button (Permission Aware) */}
          {(isAdmin || isHr) && (
            <button
              onClick={handlePrimaryAction}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <Plus size={15} />
              <span>+ Create Cycle</span>
            </button>
          )}

          {isManager && !isAdmin && !isHr && (
            <button
              onClick={handlePrimaryAction}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <Users size={15} />
              <span>Evaluate Team</span>
            </button>
          )}

          {!isManager && !isAdmin && !isHr && (
            <button
              onClick={handlePrimaryAction}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <Plus size={15} />
              <span>+ Add Goal</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Navigation Underline Bar Matching Zoho HR Reference ─────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 text-xs font-bold text-slate-600 scrollbar-hide">
        {[
          { id: 'overview', label: 'Overview' },
          ...(isAdmin || isHr ? [{ id: 'cycles', label: 'Cycles' }] : []),
          { id: 'goals', label: 'Goals (OKRs)' },
          { id: 'reviews', label: 'Reviews' },
          { id: '360', label: '360° Feedback' },
          ...(isAdmin || isHr || isManager || user?.permissions?.includes('pms.kra.manage') ? [{ id: 'kras', label: 'KRA & KPI' }] : []),
          ...(isAdmin || isHr || user?.permissions?.includes('pms.reports.view') ? [{ id: 'reports', label: 'Reports' }] : []),
          ...(isAdmin ? [{ id: 'settings', label: 'Settings' }] : []),
        ].map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`relative px-4 py-3 whitespace-nowrap transition-all ${
                isActive
                  ? 'text-blue-600 font-extrabold after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-blue-600'
                  : 'hover:text-slate-900 text-slate-500'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL 1: PMS DASHBOARD (100% REAL DATA FROM MONGODB)
      ══════════════════════════════════════════════════════════════════════ */}
      {currentTab === 'overview' && (
        <div className="space-y-6">
          {/* Top 4 Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Total Employees */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Total Employees</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{totalEmployees}</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-600">
                  Active
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Under Review Cycle</p>
            </div>

            {/* Card 2: Completed Reviews */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Completed Reviews</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{completedReviews}</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-600">
                  {totalEmployees > 0 ? Math.round((completedReviews / totalEmployees) * 100) : 0}%
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Published & Evaluated</p>
            </div>

            {/* Card 3: Pending Reviews */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Pending Reviews</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{pendingReviews}</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-1.5 py-0.5 text-[11px] font-bold text-rose-600">
                  In Queue
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Awaiting Manager / HR Action</p>
            </div>

            {/* Card 4: Average Rating */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Average Rating</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{avgRating} / 5</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-600">
                  ★ Score
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">across organization</p>
            </div>
          </div>

          {/* 3 Widgets Row Matching Zoho HR Mockup */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Widget 1: Rating Distribution (Real Aggregates) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">Performance Rating Distribution</h3>
              <div className="mt-4 h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ratingDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="rating" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {ratingDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Widget 2: Goal Completion Rate (Real Goals Summary) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">Goal Completion Rate</h3>
              <div className="mt-2 flex flex-col items-center justify-center">
                <div className="relative h-44 w-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={goalCompletionData}
                        dataKey="value"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {goalCompletionData.map((entry, index) => (
                          <Cell key={`donut-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-slate-900">
                      {goalSummary.achievedPercent}%
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">Goals Achieved</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs w-full px-4">
                  {goalCompletionData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 font-medium">{item.name}</span>
                      <strong className="text-slate-900 ml-auto">{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Widget 3: Top Performers (Real Users from MongoDB) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Top Performers</h3>
                <button onClick={() => setTab('reviews')} className="text-xs font-bold text-blue-600 hover:underline">
                  View All
                </button>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {topPerformers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No evaluated users yet. Complete reviews in the Reviews tab.
                  </div>
                ) : (
                  topPerformers.map((person) => (
                    <div key={person._id || person.name} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-xs">
                          {person.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{person.name}</h4>
                          <p className="text-[11px] text-slate-500">{person.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 font-bold text-xs text-amber-500">
                        <Star size={13} className="fill-amber-400" />
                        <span>{person.score ? Number(person.score).toFixed(1) : person.band}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL 2: CYCLES (100% REAL DATA FROM MONGODB)
      ══════════════════════════════════════════════════════════════════════ */}
      {currentTab === 'cycles' && (isAdmin || isHr) && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">Performance Cycles</h2>
                <p className="text-xs text-slate-500">Scheduled review periods, eligibility rules, and appraisal timelines.</p>
              </div>

              <button
                onClick={() => setShowCreateCycleModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
              >
                <Plus size={14} />
                <span>Create Cycle</span>
              </button>
            </div>

            {/* List of Real Active Cycles */}
            {loadingCycles ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading cycles from database...</div>
            ) : cyclesList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No performance cycles found. Click &quot;Create Cycle&quot; to initialize your first cycle.
              </div>
            ) : (
              <div className="space-y-3">
                {cyclesList.map((cycle) => (
                  <div
                    key={cycle._id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition"
                  >
                    <div className="flex-1 min-w-[240px]">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{cycle.name}</h4>
                        <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700 capitalize">
                          {String(cycle.cycleType || '').replace('_', ' ')}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          cycle.status === 'in_progress'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : cycle.status === 'published'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : cycle.status === 'closed'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {String(cycle.status || '').replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{cycle.description}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-xs font-semibold text-slate-600 text-right">
                        <div>Period: {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Participants: {cycle.stats?.totalAppraisals || 0} | Published: {cycle.stats?.published || 0}
                        </div>
                      </div>

                      {/* Edit & Delete Action Buttons */}
                      <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCycle(cycle)}
                          title="Edit Cycle"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmDeleteCycle(cycle)}
                          title="Delete Cycle"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Cycle 5-Step Stepper Modal */}
          {showCreateCycleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Create Performance Cycle</h3>
                    <p className="text-xs text-slate-500">Configure schedule, eligibility, and reviewers</p>
                  </div>
                  <button onClick={() => setShowCreateCycleModal(false)} className="rounded-lg p-1 hover:bg-slate-100 text-slate-400">
                    <X size={18} />
                  </button>
                </div>

                {/* 5-Step Stepper Bar (Clickable / Editable Tabs) */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  {[
                    { step: 1, label: 'Basic Details' },
                    { step: 2, label: 'Template' },
                    { step: 3, label: 'Participants' },
                    { step: 4, label: 'Reviewers' },
                    { step: 5, label: 'Summary' },
                  ].map((s) => (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => setCycleStep(s.step)}
                      className="group flex items-center gap-1.5 focus:outline-hidden transition text-left cursor-pointer"
                    >
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                          cycleStep === s.step
                            ? 'bg-blue-600 text-white shadow-xs'
                            : cycleStep > s.step
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
                        }`}
                      >
                        {cycleStep > s.step ? <Check size={12} /> : s.step}
                      </div>
                      <span
                        className={`text-[11px] font-bold transition-colors ${
                          cycleStep === s.step
                            ? 'text-blue-600'
                            : cycleStep > s.step
                            ? 'text-slate-700'
                            : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      >
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Form Fields for Step */}
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {/* STEP 1: BASIC DETAILS */}
                  {cycleStep === 1 && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700">Cycle Name *</label>
                        <input
                          type="text"
                          required
                          value={cycleForm.name}
                          onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700">Start Date *</label>
                          <input
                            type="date"
                            required
                            value={cycleForm.startDate}
                            onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700">End Date *</label>
                          <input
                            type="date"
                            required
                            value={cycleForm.endDate}
                            onChange={(e) => setCycleForm({ ...cycleForm, endDate: e.target.value })}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700">Cycle Type</label>
                        <select
                          value={cycleForm.cycleType}
                          onChange={(e) => setCycleForm({ ...cycleForm, cycleType: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-white focus:border-blue-500 focus:outline-hidden"
                        >
                          <option value="annual">Annual</option>
                          <option value="half_yearly">Half-Yearly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="monthly">Monthly</option>
                          <option value="probationary">Probationary</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700">Description</label>
                        <textarea
                          rows={2}
                          value={cycleForm.description}
                          onChange={(e) => setCycleForm({ ...cycleForm, description: e.target.value })}
                          placeholder="Cycle objectives and context..."
                          className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 2: TEMPLATE & WEIGHTAGES */}
                  {cycleStep === 2 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700">Rating Scale</label>
                        <select
                          value={cycleForm.ratingScale}
                          onChange={(e) => setCycleForm({ ...cycleForm, ratingScale: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-white focus:border-blue-500 focus:outline-hidden"
                        >
                          <option value="1-5">Standard 5-Point Rating Scale (1 to 5 Stars)</option>
                          <option value="1-4">4-Point Scale (1 to 4)</option>
                          <option value="1-10">10-Point Scale (1 to 10)</option>
                          <option value="custom">Custom Percentage Band (0 - 100%)</option>
                        </select>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800">Section Weightages (Must sum to 100%)</label>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              Number(cycleForm.kraWeight || 0) +
                                Number(cycleForm.kpiWeight || 0) +
                                Number(cycleForm.goalWeight || 0) +
                                Number(cycleForm.competencyWeight || 0) === 100
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            Total: {Number(cycleForm.kraWeight || 0) +
                              Number(cycleForm.kpiWeight || 0) +
                              Number(cycleForm.goalWeight || 0) +
                              Number(cycleForm.competencyWeight || 0)}%
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="block text-[11px] font-semibold text-slate-600">KRA Weight (%)</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={cycleForm.kraWeight}
                              onChange={(e) => setCycleForm({ ...cycleForm, kraWeight: Number(e.target.value) })}
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium"
                            />
                          </div>
                          <div>
                            <span className="block text-[11px] font-semibold text-slate-600">KPI Weight (%)</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={cycleForm.kpiWeight}
                              onChange={(e) => setCycleForm({ ...cycleForm, kpiWeight: Number(e.target.value) })}
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium"
                            />
                          </div>
                          <div>
                            <span className="block text-[11px] font-semibold text-slate-600">Goals & OKRs (%)</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={cycleForm.goalWeight}
                              onChange={(e) => setCycleForm({ ...cycleForm, goalWeight: Number(e.target.value) })}
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium"
                            />
                          </div>
                          <div>
                            <span className="block text-[11px] font-semibold text-slate-600">Competencies (%)</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={cycleForm.competencyWeight}
                              onChange={(e) => setCycleForm({ ...cycleForm, competencyWeight: Number(e.target.value) })}
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={cycleForm.allowSelfAppraisal}
                            onChange={(e) => setCycleForm({ ...cycleForm, allowSelfAppraisal: e.target.checked })}
                            className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Allow Employee Self-Appraisal before Manager Review</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={cycleForm.allow360Feedback}
                            onChange={(e) => setCycleForm({ ...cycleForm, allow360Feedback: e.target.checked })}
                            className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Enable 360° Multi-Rater Peer & Subordinate Feedback</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={cycleForm.requireGoalApproval}
                            onChange={(e) => setCycleForm({ ...cycleForm, requireGoalApproval: e.target.checked })}
                            className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Require Reporting Manager Approval for Goals and Milestones</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: PARTICIPANTS */}
                  {cycleStep === 3 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">Participant Scope</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div
                            onClick={() => setCycleForm({ ...cycleForm, participantScope: 'all', applicableDepartments: [] })}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                              cycleForm.participantScope === 'all'
                                ? 'border-blue-600 bg-blue-50/50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="participantScope"
                              checked={cycleForm.participantScope === 'all'}
                              onChange={() => setCycleForm({ ...cycleForm, participantScope: 'all', applicableDepartments: [] })}
                              className="mt-0.5 text-blue-600"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-800">All Company Employees</div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Automatically enroll all active staff across the entire company ({totalEmployees} employees)
                              </p>
                            </div>
                          </div>

                          <div
                            onClick={() => setCycleForm({ ...cycleForm, participantScope: 'departments' })}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                              cycleForm.participantScope === 'departments'
                                ? 'border-blue-600 bg-blue-50/50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="participantScope"
                              checked={cycleForm.participantScope === 'departments'}
                              onChange={() => setCycleForm({ ...cycleForm, participantScope: 'departments' })}
                              className="mt-0.5 text-blue-600"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-800">Specific Departments</div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Limit this evaluation cycle to selected business departments only
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {cycleForm.participantScope === 'departments' && (
                        <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Select Participating Departments:</span>
                            <span className="text-[11px] font-semibold text-blue-600">
                              {cycleForm.applicableDepartments.length} selected
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              'Engineering',
                              'Product',
                              'Design',
                              'Sales',
                              'Marketing',
                              'Human Resources',
                              'Finance',
                              'Operations',
                            ].map((dept) => {
                              const isChecked = cycleForm.applicableDepartments.includes(dept);
                              return (
                                <label
                                  key={dept}
                                  className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-white"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setCycleForm({
                                          ...cycleForm,
                                          applicableDepartments: [...cycleForm.applicableDepartments, dept],
                                        });
                                      } else {
                                        setCycleForm({
                                          ...cycleForm,
                                          applicableDepartments: cycleForm.applicableDepartments.filter((d) => d !== dept),
                                        });
                                      }
                                    }}
                                    className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span>{dept}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 4: REVIEWERS & WORKFLOW */}
                  {cycleStep === 4 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">Stage Deadlines</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="block text-[11px] font-semibold text-slate-600">Self-Review Deadline</span>
                            <input
                              type="date"
                              value={cycleForm.selfAppraisalDeadline}
                              onChange={(e) => setCycleForm({ ...cycleForm, selfAppraisalDeadline: e.target.value })}
                              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <span className="block text-[11px] font-semibold text-slate-600">Manager Review Deadline</span>
                            <input
                              type="date"
                              value={cycleForm.managerReviewDeadline}
                              onChange={(e) => setCycleForm({ ...cycleForm, managerReviewDeadline: e.target.value })}
                              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <span className="block text-[11px] font-semibold text-slate-600">Calibration End Date</span>
                            <input
                              type="date"
                              value={cycleForm.calibrationDeadline}
                              onChange={(e) => setCycleForm({ ...cycleForm, calibrationDeadline: e.target.value })}
                              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <span className="block text-[11px] font-semibold text-slate-600">Publishing Date</span>
                            <input
                              type="date"
                              value={cycleForm.publishingDate}
                              onChange={(e) => setCycleForm({ ...cycleForm, publishingDate: e.target.value })}
                              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5">
                        <label className="block text-xs font-bold text-slate-800">Workflow Approval Stages</label>
                        <div className="space-y-2 text-xs">
                          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={cycleForm.requireManagerReview}
                              onChange={(e) => setCycleForm({ ...cycleForm, requireManagerReview: e.target.checked })}
                              className="h-4 w-4 rounded-sm border-slate-300 text-blue-600"
                            />
                            <span>Stage 1: Direct Reporting Manager Evaluation (Required)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={cycleForm.requireDeptHeadReview}
                              onChange={(e) => setCycleForm({ ...cycleForm, requireDeptHeadReview: e.target.checked })}
                              className="h-4 w-4 rounded-sm border-slate-300 text-blue-600"
                            />
                            <span>Stage 2: Department Head Review</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={cycleForm.requireHrEvaluation}
                              onChange={(e) => setCycleForm({ ...cycleForm, requireHrEvaluation: e.target.checked })}
                              className="h-4 w-4 rounded-sm border-slate-300 text-blue-600"
                            />
                            <span>Stage 3: HR Evaluation & Calibration</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={cycleForm.requireFinalApproval}
                              onChange={(e) => setCycleForm({ ...cycleForm, requireFinalApproval: e.target.checked })}
                              className="h-4 w-4 rounded-sm border-slate-300 text-blue-600"
                            />
                            <span>Stage 4: Final Leadership Sign-Off & Release</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 5: SUMMARY & LAUNCH */}
                  {cycleStep === 5 && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-blue-950 text-sm">{cycleForm.name}</span>
                          <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                            {cycleForm.cycleType}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{cycleForm.description || 'Enterprise appraisal cycle'}</p>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-100 text-[11px]">
                          <div>
                            <span className="text-slate-500 block">Cycle Period:</span>
                            <span className="font-bold text-slate-800">{cycleForm.startDate} to {cycleForm.endDate}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Scale:</span>
                            <span className="font-bold text-slate-800">{cycleForm.ratingScale}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Participants:</span>
                            <span className="font-bold text-slate-800">
                              {cycleForm.participantScope === 'all'
                                ? `All ${totalEmployees} Employees`
                                : cycleForm.applicableDepartments.length > 0
                                ? cycleForm.applicableDepartments.join(', ')
                                : 'All Departments'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Weights:</span>
                            <span className="font-bold text-slate-800">
                              KRA {cycleForm.kraWeight}% | KPI {cycleForm.kpiWeight}% | Goal {cycleForm.goalWeight}% | Comp {cycleForm.competencyWeight}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 text-xs">
                        <span className="font-bold text-slate-800 block">Key Deadlines:</span>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                          <div>Self-Review: <strong>{cycleForm.selfAppraisalDeadline}</strong></div>
                          <div>Manager Review: <strong>{cycleForm.managerReviewDeadline}</strong></div>
                          <div>Calibration: <strong>{cycleForm.calibrationDeadline}</strong></div>
                          <div>Publishing: <strong>{cycleForm.publishingDate}</strong></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stepper Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (cycleStep > 1) setCycleStep(cycleStep - 1);
                      else setShowCreateCycleModal(false);
                    }}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    {cycleStep === 1 ? 'Cancel' : 'Back'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (cycleStep < 5) setCycleStep(cycleStep + 1);
                      else handleFinishLaunchCycle();
                    }}
                    className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
                  >
                    {cycleStep === 5 ? 'Finish & Launch' : 'Next'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Cycle Modal */}
          {showEditCycleModal && editingCycle && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Edit Performance Cycle</h3>
                    <p className="text-xs text-slate-500">Update schedule, cycle type, or details</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditCycleModal(false);
                      setEditingCycle(null);
                    }}
                    className="rounded-lg p-1 hover:bg-slate-100 text-slate-400"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveEditCycle} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Cycle Name *</label>
                    <input
                      type="text"
                      required
                      value={editingCycle.name}
                      onChange={(e) => setEditingCycle({ ...editingCycle, name: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">Cycle Type</label>
                      <select
                        value={editingCycle.cycleType}
                        onChange={(e) => setEditingCycle({ ...editingCycle, cycleType: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-white focus:border-blue-500 focus:outline-hidden"
                      >
                        <option value="annual">Annual</option>
                        <option value="half_yearly">Half-Yearly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="monthly">Monthly</option>
                        <option value="probationary">Probationary</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700">Status</label>
                      <select
                        value={editingCycle.status}
                        onChange={(e) => setEditingCycle({ ...editingCycle, status: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-white focus:border-blue-500 focus:outline-hidden"
                      >
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="in_progress">In Progress</option>
                        <option value="self_review">Self Review</option>
                        <option value="manager_review">Manager Review</option>
                        <option value="calibration">Calibration</option>
                        <option value="published">Published</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">Start Date *</label>
                      <input
                        type="date"
                        required
                        value={editingCycle.startDate}
                        onChange={(e) => setEditingCycle({ ...editingCycle, startDate: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700">End Date *</label>
                      <input
                        type="date"
                        required
                        value={editingCycle.endDate}
                        onChange={(e) => setEditingCycle({ ...editingCycle, endDate: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">Description</label>
                    <textarea
                      rows={3}
                      value={editingCycle.description}
                      onChange={(e) => setEditingCycle({ ...editingCycle, description: e.target.value })}
                      placeholder="Cycle description and objectives..."
                      className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isSubmittingCycle}
                      onClick={() => {
                        setShowEditCycleModal(false);
                        setEditingCycle(null);
                      }}
                      className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingCycle}
                      className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {isSubmittingCycle ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Cycle Confirmation Modal */}
          {showDeleteCycleModal && cycleToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                    <AlertCircle size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Delete Performance Cycle</h3>
                    <p className="text-xs text-slate-500">This action cannot be undone.</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete <span className="font-bold text-slate-900">&quot;{cycleToDelete.name}&quot;</span>? This will also remove any appraisals associated with this cycle.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isSubmittingCycle}
                    onClick={() => {
                      setShowDeleteCycleModal(false);
                      setCycleToDelete(null);
                    }}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingCycle}
                    onClick={handleDeleteCycle}
                    className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition disabled:opacity-50"
                  >
                    {isSubmittingCycle ? 'Deleting...' : 'Delete Cycle'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL 3: KRA & KPI MANAGEMENT (100% REAL DATA FROM MONGODB)
      ══════════════════════════════════════════════════════════════════════ */}
      {currentTab === 'kras' && (isAdmin || isHr || isManager || user?.permissions?.includes('pms.kra.manage')) && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">KRA & KPI</h2>
                <p className="text-xs text-slate-500">Define evaluation pillars and measurement metrics by role and department.</p>
              </div>

              {(isAdmin || isHr) && (
                <button
                  onClick={() => {
                    setNewKraForm({
                      name: '',
                      description: '',
                      category: 'Productivity & Delivery',
                      weightage: 20,
                      applicableDepartments: selectedDept !== 'All' ? [selectedDept] : [],
                      assignmentType: kraSubTab || 'by_role',
                    });
                    setShowAddKraModal(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>+ Add KRA</span>
                </button>
              )}
            </div>

            {/* Subtabs Matching Mockup */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-bold">
              {[
                { id: 'by_role', label: 'By Role' },
                { id: 'by_department', label: 'By Department' },
                { id: 'by_employee', label: 'By Employee' },
                { id: 'kra_library', label: 'Kra Library' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setKraSubTab(st.id)}
                  className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                    kraSubTab === st.id
                      ? 'bg-blue-50 text-blue-700 font-extrabold shadow-2xs'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
              >
                <option value="All">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="Design">Design</option>
              </select>

              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search KRAs..."
                  value={kraSearch}
                  onChange={(e) => setKraSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Clean Enterprise Table Matching Mockup */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">KRA / KPI</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Weightage</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loadingKras ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">Loading KRAs...</td>
                    </tr>
                  ) : krasList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No KRAs found under &quot;{
                          kraSubTab === 'by_role'
                            ? 'By Role'
                            : kraSubTab === 'by_department'
                            ? 'By Department'
                            : kraSubTab === 'by_employee'
                            ? 'By Employee'
                            : 'Kra Library'
                        }&quot;. Click &quot;+ Add KRA&quot; to define a new one.
                      </td>
                    </tr>
                  ) : (
                    krasList.map((k) => (
                      <tr key={k._id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{k.name}</td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">{k.description || 'Standard KRA'}</td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{k.category}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{k.weightage}%</td>
                        <td className="py-3.5 px-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                            k.status === 'inactive'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : k.status === 'draft'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                          }`}>
                            {k.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditKra(k)}
                              title="Edit KRA"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmDeleteKra(k)}
                              title="Delete KRA"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add KRA Modal */}
          {showAddKraModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <form onSubmit={handleSaveKra} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Add New KRA</h3>
                  <button type="button" onClick={() => setShowAddKraModal(false)} className="rounded-lg p-1 hover:bg-slate-100 text-slate-400">
                    <X size={18} />
                  </button>
                </div>

                {/* Assignment / Category Target Tab */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Target Tab / Assignment Scope *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'by_role', label: 'By Role' },
                      { id: 'by_department', label: 'By Department' },
                      { id: 'by_employee', label: 'By Employee' },
                      { id: 'kra_library', label: 'Kra Library' },
                    ].map((tab) => {
                      const isSelected = (newKraForm.assignmentType || 'by_role') === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setNewKraForm({ ...newKraForm, assignmentType: tab.id })}
                          className={`rounded-xl py-2 px-2 text-xs font-bold border transition text-center cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs ring-1 ring-blue-600'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {newKraForm.assignmentType === 'by_department' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Applicable Department *</label>
                    <select
                      value={newKraForm.applicableDepartments?.[0] || (selectedDept !== 'All' ? selectedDept : 'Engineering')}
                      onChange={(e) => setNewKraForm({ ...newKraForm, applicableDepartments: [e.target.value] })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-white focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Product">Product</option>
                      <option value="Sales">Sales</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Design">Design</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Finance">Finance</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>
                )}

                {newKraForm.assignmentType === 'kra_library' && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 text-[11px] text-blue-800">
                    💡 This KRA will be added directly into the organizational <strong>KRA Library</strong> as a reusable template.
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700">KRA Name *</label>
                  <input
                    type="text"
                    required
                    value={newKraForm.name}
                    onChange={(e) => setNewKraForm({ ...newKraForm, name: e.target.value })}
                    placeholder="e.g. Code Quality & Architecture"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Category</label>
                  <select
                    value={newKraForm.category}
                    onChange={(e) => setNewKraForm({ ...newKraForm, category: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium"
                  >
                    <option value="Productivity & Delivery">Productivity & Delivery</option>
                    <option value="Quality of Work">Quality of Work</option>
                    <option value="Team Collaboration">Team Collaboration</option>
                    <option value="Operational Efficiency">Operational Efficiency</option>
                    <option value="Customer Satisfaction">Customer Satisfaction</option>
                    <option value="Revenue & Sales">Revenue & Sales</option>
                    <option value="Leadership & Mentorship">Leadership & Mentorship</option>
                    <option value="Learning & Development">Learning & Development</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Weightage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newKraForm.weightage}
                    onChange={(e) => setNewKraForm({ ...newKraForm, weightage: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Description</label>
                  <textarea
                    rows={2}
                    value={newKraForm.description}
                    onChange={(e) => setNewKraForm({ ...newKraForm, description: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isSubmittingKra}
                    onClick={() => setShowAddKraModal(false)}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingKra}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmittingKra ? 'Saving...' : 'Save KRA'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit KRA Modal */}
          {showEditKraModal && editingKra && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <form onSubmit={handleSaveEditKra} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Edit KRA</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditKraModal(false);
                      setEditingKra(null);
                    }}
                    className="rounded-lg p-1 hover:bg-slate-100 text-slate-400"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Assignment / Category Target Tab */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Target Tab / Assignment Scope *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'by_role', label: 'By Role' },
                      { id: 'by_department', label: 'By Department' },
                      { id: 'by_employee', label: 'By Employee' },
                      { id: 'kra_library', label: 'Kra Library' },
                    ].map((tab) => {
                      const isSelected = (editingKra.assignmentType || 'by_role') === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setEditingKra({ ...editingKra, assignmentType: tab.id })}
                          className={`rounded-xl py-2 px-2 text-xs font-bold border transition text-center cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs ring-1 ring-blue-600'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {editingKra.assignmentType === 'by_department' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Applicable Department *</label>
                    <select
                      value={editingKra.applicableDepartments?.[0] || 'Engineering'}
                      onChange={(e) => setEditingKra({ ...editingKra, applicableDepartments: [e.target.value] })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-white focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Product">Product</option>
                      <option value="Sales">Sales</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Design">Design</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Finance">Finance</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>
                )}

                {editingKra.assignmentType === 'kra_library' && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 text-[11px] text-blue-800">
                    💡 This KRA is stored in the organizational <strong>KRA Library</strong> as a reusable template.
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700">KRA Name *</label>
                  <input
                    type="text"
                    required
                    value={editingKra.name}
                    onChange={(e) => setEditingKra({ ...editingKra, name: e.target.value })}
                    placeholder="e.g. Code Quality & Architecture"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Category</label>
                    <select
                      value={editingKra.category}
                      onChange={(e) => setEditingKra({ ...editingKra, category: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-white focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="Productivity & Delivery">Productivity & Delivery</option>
                      <option value="Quality of Work">Quality of Work</option>
                      <option value="Team Collaboration">Team Collaboration</option>
                      <option value="Operational Efficiency">Operational Efficiency</option>
                      <option value="Customer Satisfaction">Customer Satisfaction</option>
                      <option value="Revenue & Sales">Revenue & Sales</option>
                      <option value="Leadership & Mentorship">Leadership & Mentorship</option>
                      <option value="Learning & Development">Learning & Development</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Weightage (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editingKra.weightage}
                      onChange={(e) => setEditingKra({ ...editingKra, weightage: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Status</label>
                  <select
                    value={editingKra.status}
                    onChange={(e) => setEditingKra({ ...editingKra, status: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Description</label>
                  <textarea
                    rows={3}
                    value={editingKra.description}
                    onChange={(e) => setEditingKra({ ...editingKra, description: e.target.value })}
                    placeholder="Description and expectations for this KRA..."
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isSubmittingKra}
                    onClick={() => {
                      setShowEditKraModal(false);
                      setEditingKra(null);
                    }}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingKra}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {isSubmittingKra ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Delete KRA Confirmation Modal */}
          {showDeleteKraModal && kraToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600 shrink-0">
                    <AlertCircle size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Delete KRA</h3>
                    <p className="text-xs text-slate-500">This action cannot be undone.</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete <span className="font-bold text-slate-900">&quot;{kraToDelete.name}&quot;</span>? Linked KPIs and evaluation associations will also be removed.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isSubmittingKra}
                    onClick={() => {
                      setShowDeleteKraModal(false);
                      setKraToDelete(null);
                    }}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingKra}
                    onClick={handleDeleteKra}
                    className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition disabled:opacity-50"
                  >
                    {isSubmittingKra ? 'Deleting...' : 'Delete KRA'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL 4: EMPLOYEE GOAL SETTING (100% REAL DATA FROM MONGODB)
      ══════════════════════════════════════════════════════════════════════ */}
      {currentTab === 'goals' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">Goals (OKRs)</h2>
                <p className="text-xs text-slate-500">Key deliverables aligned with organizational strategy.</p>
              </div>

              <button
                onClick={() => {
                  const defaultScope =
                    goalSubTab === 'team_goals'
                      ? 'team'
                      : goalSubTab === 'company_goals'
                      ? 'company'
                      : 'individual';
                  setNewGoalForm((prev) => ({ ...prev, scope: defaultScope }));
                  setShowAddGoalModal(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
              >
                <Plus size={14} />
                <span>+ Add Goal</span>
              </button>
            </div>

            {/* Subtabs Matching Mockup */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-bold">
              {['my_goals', 'team_goals', 'company_goals'].map((st) => (
                <button
                  key={st}
                  onClick={() => setGoalSubTab(st)}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    goalSubTab === st
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {st.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>

            {/* 4 Stat Cards Computed Live */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
                <span className="text-[11px] font-semibold text-slate-500">Total Goals</span>
                <div className="text-xl font-black text-slate-900">{totalGoalsCount}</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                <span className="text-[11px] font-semibold text-emerald-700">Achieved</span>
                <div className="text-xl font-black text-emerald-700">{achievedGoalsCount}</div>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                <span className="text-[11px] font-semibold text-blue-700">On Track</span>
                <div className="text-xl font-black text-blue-700">{onTrackGoalsCount}</div>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                <span className="text-[11px] font-semibold text-amber-700">At Risk</span>
                <div className="text-xl font-black text-amber-700">{atRiskGoalsCount}</div>
              </div>
            </div>

            {/* List of Goal Cards */}
            <div className="space-y-3">
              {loadingGoals ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading goals from database...</div>
              ) : goalsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No goals found for this filter. Click &quot;+ Add Goal&quot; to create a new OKR.
                </div>
              ) : (
                goalsList.map((g) => (
                  <div
                    key={g._id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition"
                  >
                    <div className="flex-1 min-w-[240px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-900">{g.title}</h4>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          g.scope === 'team'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : g.scope === 'company' || g.scope === 'strategic'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {g.scope === 'team' ? 'Team Goal' : g.scope === 'company' || g.scope === 'strategic' ? 'Company Goal' : 'My Goal'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{g.description || 'Target performance goal'}</p>
                      {g.employeeId?.name && (
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Owner: {g.employeeId.name}</span>
                      )}
                    </div>

                    <div className="w-48">
                      <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                        <span className="text-slate-500">Progress</span>
                        <span className="text-slate-900">{g.progress || 0}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, g.progress || 0))}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                        {g.status}
                      </span>
                      {g.dueDate && (
                        <span className="text-[11px] font-semibold text-slate-400">
                          {new Date(g.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Goal Modal */}
          {showAddGoalModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <form onSubmit={handleSaveGoal} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Add Goal (OKR)</h3>
                  <button type="button" onClick={() => setShowAddGoalModal(false)} className="rounded-lg p-1 hover:bg-slate-100 text-slate-400">
                    <X size={18} />
                  </button>
                </div>

                {/* Goal Level / Category Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Goal Level / Category *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'individual', label: 'My Goals' },
                      { id: 'team', label: 'Team Goals' },
                      { id: 'company', label: 'Company Goals' },
                    ].map((sc) => {
                      const isSelected = (newGoalForm.scope || 'individual') === sc.id;
                      return (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => setNewGoalForm({ ...newGoalForm, scope: sc.id })}
                          className={`rounded-xl py-2 px-2 text-xs font-bold border transition text-center cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs ring-1 ring-blue-600'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          {sc.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Goal Title *</label>
                  <input
                    type="text"
                    required
                    value={newGoalForm.title}
                    onChange={(e) => setNewGoalForm({ ...newGoalForm, title: e.target.value })}
                    placeholder="e.g. Deliver CRM migration module"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Due Date</label>
                  <input
                    type="date"
                    value={newGoalForm.dueDate}
                    onChange={(e) => setNewGoalForm({ ...newGoalForm, dueDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Description</label>
                  <textarea
                    rows={2}
                    value={newGoalForm.description}
                    onChange={(e) => setNewGoalForm({ ...newGoalForm, description: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddGoalModal(false)}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    Save Goal
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL 5: REVIEWS (100% REAL DATA FROM MONGODB)
      ══════════════════════════════════════════════════════════════════════ */}
      {currentTab === 'reviews' && (
        <SimpleTeamEvaluations onNavigateSettings={() => setTab('settings')} />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL 6: 360° FEEDBACK (100% REAL DATA FROM MONGODB)
      ══════════════════════════════════════════════════════════════════════ */}
      {currentTab === '360' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">360° Feedback & Recognition</h2>
                <p className="text-xs text-slate-500">Peer recognitions, continuous kudos, and manager feedback notes.</p>
              </div>

              <button
                onClick={() => setShowGiveFeedbackModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
              >
                <Heart size={14} />
                <span>Give Kudos / Feedback</span>
              </button>
            </div>

            {/* Subtabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-bold">
              {['overview', 'responses'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFeedbackSubTab(st)}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    feedbackSubTab === st
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {st.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>

            {/* 3 Metric Cards Computed Live */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <span className="text-xs font-semibold text-slate-500">Total Feedbacks Shared</span>
                <div className="mt-1 text-2xl font-black text-slate-900">{totalFeedbackCount}</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <span className="text-xs font-semibold text-emerald-700">Appreciation Kudos</span>
                <div className="mt-1 text-2xl font-black text-emerald-800">{appreciationFeedbacks}</div>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <span className="text-xs font-semibold text-blue-700">Constructive & 1-on-1s</span>
                <div className="mt-1 text-2xl font-black text-blue-800">{constructiveFeedbacks + meetingFeedbacks}</div>
              </div>
            </div>

            {/* Live Feedbacks Feed */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900">Recent Recognitions & Continuous Feedback</h3>
              {loadingFeedback ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading continuous feedback...</div>
              ) : feedbackList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No feedback records yet. Click &quot;Give Kudos / Feedback&quot; to recognize a colleague.
                </div>
              ) : (
                <div className="space-y-3">
                  {feedbackList.map((item) => {
                    const fromName = item.fromUser?.firstName && item.fromUser?.lastName
                      ? `${item.fromUser.firstName} ${item.fromUser.lastName}`
                      : item.fromUser?.name || 'Colleague';
                    const toName = item.toUser?.firstName && item.toUser?.lastName
                      ? `${item.toUser.firstName} ${item.toUser.lastName}`
                      : item.toUser?.name || 'Employee';
                    return (
                      <div
                        key={item._id}
                        className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{fromName}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-bold text-blue-600">{toName}</span>
                            <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                              {item.feedbackType}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">{item.content}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Give Feedback Modal */}
          {showGiveFeedbackModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <form onSubmit={handleSendFeedback} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Share Recognition & Feedback</h3>
                  <button type="button" onClick={() => setShowGiveFeedbackModal(false)} className="rounded-lg p-1 hover:bg-slate-100 text-slate-400">
                    <X size={18} />
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Recipient Employee *</label>
                  <select
                    required
                    value={newFeedbackForm.toUser}
                    onChange={(e) => setNewFeedbackForm({ ...newFeedbackForm, toUser: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium"
                  >
                    <option value="">Select an employee...</option>
                    {topPerformers.map((u) => (
                      <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Feedback Type</label>
                  <select
                    value={newFeedbackForm.feedbackType}
                    onChange={(e) => setNewFeedbackForm({ ...newFeedbackForm, feedbackType: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium"
                  >
                    <option value="appreciation">Kudos & Appreciation</option>
                    <option value="constructive">Constructive Feedback</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Feedback Message *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Write your feedback or peer recognition..."
                    value={newFeedbackForm.content}
                    onChange={(e) => setNewFeedbackForm({ ...newFeedbackForm, content: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGiveFeedbackModal(false)}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    Submit Feedback
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL 7: REPORTS (100% REAL DATA FROM MONGODB)
      ══════════════════════════════════════════════════════════════════════ */}
      {currentTab === 'reports' && (isAdmin || isHr || user?.permissions?.includes('pms.reports.view')) && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">Performance Reports</h2>
                <p className="text-xs text-slate-500">Organization-wide ratings, 9-box talent matrix, and department progress.</p>
              </div>

              <button
                onClick={() => {
                  const url = pmsApi.exportAppraisalsUrl();
                  window.open(url, '_blank');
                  toast.success('Downloading Excel Report...');
                }}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
              >
                <Download size={14} />
                <span>Export (.xlsx)</span>
              </button>
            </div>

            {/* 4 Performance Band Summary Cards Calculated from Real Appraisals */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <span className="text-[11px] font-semibold text-emerald-700">High Performers (★ 4.5+)</span>
                <div className="text-xl font-black text-emerald-900">{talentBands.high} ({highPercent}%)</div>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                <span className="text-[11px] font-semibold text-blue-700">Meets Expectations (3.0 - 4.4)</span>
                <div className="text-xl font-black text-blue-900">{talentBands.meets} ({meetsPercent}%)</div>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                <span className="text-[11px] font-semibold text-amber-700">Needs Improvement (2.0 - 2.9)</span>
                <div className="text-xl font-black text-amber-900">{talentBands.needsImp} ({needsImpPercent}%)</div>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                <span className="text-[11px] font-semibold text-rose-700">Low Performers (&lt; 2.0)</span>
                <div className="text-xl font-black text-rose-900">{talentBands.low} ({lowPercent}%)</div>
              </div>
            </div>

            {/* 9-Box Grid & Department Score Bars */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* 9-Box Matrix */}
              <div className="rounded-xl border border-slate-200/80 p-5">
                <h4 className="text-xs font-bold text-slate-900 mb-3">Performance vs Potential Matrix (9-Box Grid)</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                  <div className="rounded-lg bg-amber-50 p-3 text-amber-800 border border-amber-200">
                    High Potential<br />Low Performance
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3 text-blue-800 border border-blue-200">
                    High Potential<br />Medium Perf
                  </div>
                  <div className="rounded-lg bg-emerald-100 p-3 text-emerald-900 border border-emerald-300">
                    ★ Top Talent / Star<br />({talentBands.high} Employees)
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3 text-slate-700 border border-slate-200">
                    Med Potential<br />Low Perf
                  </div>
                  <div className="rounded-lg bg-blue-100 p-3 text-blue-900 border border-blue-300">
                    Core Performer<br />({talentBands.meets} Employees)
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3 text-emerald-800 border border-emerald-200">
                    High Performer
                  </div>

                  <div className="rounded-lg bg-rose-50 p-3 text-rose-800 border border-rose-200">
                    Risk ({talentBands.low} Employees)
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-slate-700 border border-slate-200">
                    Effective ({talentBands.needsImp} Employees)
                  </div>
                  <div className="rounded-lg bg-slate-100 p-3 text-slate-800 border border-slate-300">
                    Trusted Professional
                  </div>
                </div>
              </div>

              {/* Department Scores Horizontal Bars From Real Mongo Aggregates */}
              <div className="rounded-xl border border-slate-200/80 p-5">
                <h4 className="text-xs font-bold text-slate-900 mb-3">Department Performance (Out of 5.0)</h4>
                {deptPerformanceData.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No departmental performance scores yet. Complete evaluations in the Reviews tab.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deptPerformanceData.map((d) => (
                      <div key={d.department} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-700">{d.department}</span>
                          <span className="text-blue-600">{d.averageScore} / 5.0</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${(d.averageScore / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL 8: SETTINGS & APPROVAL WORKFLOWS
      ══════════════════════════════════════════════════════════════════════ */}
      {currentTab === 'settings' && isAdmin && (
        <PmsSettings />
      )}
    </div>
  );
}
