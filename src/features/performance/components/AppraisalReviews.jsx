import React, { useEffect, useState } from 'react';
import {
  FileText,
  User,
  Users,
  CheckCircle2,
  Clock,
  Star,
  Send,
  Save,
  MessageSquare,
  Shield,
  HelpCircle,
  AlertCircle,
  Eye,
  Award,
  ChevronRight,
  X,
  UploadCloud,
  FileCheck,
  RotateCcw,
  Check,
  Building,
  UserCheck,
  GitBranch,
  Target,
  ExternalLink,
  Sparkles,
  Info,
  CheckSquare,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import pmsApi from '../api/pmsApi';

export default function AppraisalReviews({ defaultAppraisalId, defaultScope = 'self', hideAdminTabs = false }) {
  const { user } = useAuth();
  const isManager = user?.roles?.includes('Manager') || (user?.directReportsCount > 0);
  const isAdminOrHr = user?.roles?.some(r => ['Admin', 'Super Admin', 'System Admin', 'HR Admin', 'HR Manager', 'HR'].includes(r));

  const [appraisals, setAppraisals] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  // Default to team queue for reporting managers if viewing without specific scope
  const [activeTab, setActiveTab] = useState(defaultScope !== 'self' ? defaultScope : (isManager && !isAdminOrHr ? 'team' : 'self'));
  const [loading, setLoading] = useState(true);
  const [selectedAppraisal, setSelectedAppraisal] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Active form section in Drawer
  const [drawerTab, setDrawerTab] = useState('self_form');

  // Revision Request Modal State
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionTarget, setRevisionTarget] = useState('self_review');
  const [revisionReason, setRevisionReason] = useState('');

  // Validation error tracking for scorecard fields
  const [validationErrors, setValidationErrors] = useState({});

  // Form states for active review
  const [selfForm, setSelfForm] = useState({
    accomplishments: '',
    challenges: '',
    careerAspirations: '',
    kraRatings: [],
    kpiRatings: [],
    competencyRatings: [],
  });

  const [managerForm, setManagerForm] = useState({
    strengths: '',
    areasOfImprovement: '',
    overallComments: '',
    promotionRecommendation: { recommended: false, proposedDesignation: '', notes: '' },
    trainingNeeds: '',
    kraRatings: [],
    kpiRatings: [],
    competencyRatings: [],
  });

  const [deptHeadForm, setDeptHeadForm] = useState({
    deptHeadRating: 3,
    deptHeadComments: '',
  });

  const [hrForm, setHrForm] = useState({
    hrRating: 3,
    hrComments: '',
  });

  const [finalApprovalComments, setFinalApprovalComments] = useState('');
  const [nominateReviewersList, setNominateReviewersList] = useState('');

  useEffect(() => {
    loadCycles();
  }, []);

  useEffect(() => {
    fetchAppraisals();
  }, [selectedCycle, activeTab]);

  useEffect(() => {
    if (defaultAppraisalId) {
      loadAppraisalDetails(defaultAppraisalId);
    }
  }, [defaultAppraisalId]);

  const loadCycles = async () => {
    try {
      const res = await pmsApi.getCycles();
      if (res.data?.success && res.data.data.length > 0) {
        setCycles(res.data.data);
        const activeCycle = res.data.data.find(c => ['in_progress', 'self_review', 'manager_review', 'goal_setting', 'peer_feedback', 'calibration'].includes(c.status)) || res.data.data[0];
        setSelectedCycle(activeCycle?._id || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAppraisals = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCycle) params.cycleId = selectedCycle;
      if (activeTab === 'self') params.scope = 'self';
      else if (activeTab === 'team') params.scope = 'my_team';
      else if (activeTab === 'dept') params.scope = 'department';
      else if (activeTab === 'hr_queue') params.scope = 'hr_queue';
      else if (activeTab === 'final_approval') params.scope = 'final_approval_queue';
      else params.scope = 'all';

      const res = await pmsApi.getAppraisals(params);
      if (res.data?.success) {
        const raw = res.data.data || [];
        setAppraisals(raw.filter((a) => a.employeeId && a.employeeId.isActive !== false));
      }
    } catch (err) {
      toast.error('Failed to load appraisals');
    } finally {
      setLoading(false);
    }
  };

  const RATING_SCALE = [
    { value: 1, label: 'Needs Improvement', desc: '<70%', color: 'rose' },
    { value: 2, label: 'Partially Meets', desc: '70-84%', color: 'amber' },
    { value: 3, label: 'Meets Expectations', desc: '85-99%', color: 'slate' },
    { value: 4, label: 'Exceeds Expectations', desc: '100-114%', color: 'blue' },
    { value: 5, label: 'Outstanding', desc: '≥115%', color: 'emerald' },
  ];

  const calculatePreview = (type, direction, target, actual) => {
    if (actual === '' || actual === null || actual === undefined) return null;
    if (type === 'boolean' || type === 'yes_no') {
      const isYes = actual === 1 || actual === '1' || actual === true || actual === 'yes';
      return isYes ? 100 : 0;
    }
    const t = Number(target);
    const a = Number(actual);
    if (isNaN(t) || isNaN(a) || t <= 0) return 0;
    let pct = 0;
    if (direction === 'lower_is_better') {
      pct = a <= 0 ? 100 : Math.round((t / a) * 100);
    } else {
      pct = Math.round((a / t) * 100);
    }
    return Math.min(Math.max(pct, 0), 200);
  };

  const getRatingBandInfo = (rating) => {
    switch (Number(rating)) {
      case 5:
        return { label: 'Outstanding (5/5)', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 4:
        return { label: 'Exceeds Expectations (4/5)', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 3:
        return { label: 'Meets Expectations (3/5)', badgeClass: 'bg-slate-100 text-slate-800 border-slate-200' };
      case 2:
        return { label: 'Partially Meets (2/5)', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 1:
        return { label: 'Needs Improvement (1/5)', badgeClass: 'bg-rose-100 text-rose-800 border-rose-200' };
      default:
        return { label: 'Unrated', badgeClass: 'bg-slate-50 text-slate-400 border-slate-200' };
    }
  };

  const computeManagerOverallPreview = () => {
    const kpis = managerForm.kpiRatings || [];
    if (kpis.length === 0) return null;
    let totalWeight = 0;
    let weightedSum = 0;
    kpis.forEach((k) => {
      const w = Number(k.weightage) || 1;
      const r = Number(k.managerRating) || 0;
      if (r > 0) {
        weightedSum += r * w;
        totalWeight += w;
      }
    });
    if (totalWeight === 0) return null;
    return (weightedSum / totalWeight).toFixed(2);
  };

  const loadAppraisalDetails = async (id) => {
    try {
      const res = await pmsApi.getAppraisal(id);
      if (res.data?.success) {
        const app = res.data.data;
        setSelectedAppraisal(app);

        const assignedKpis = app.assignedKpis || [];
        const existingSelfRatings = app.selfAppraisal?.kpiRatings || [];
        const existingManagerRatings = app.managerAppraisal?.kpiRatings || [];

        const initialSelfKpis = assignedKpis.length > 0
          ? assignedKpis.map((kpi) => {
              const found = existingSelfRatings.find(
                (r) => (r.kpiId && (r.kpiId._id || r.kpiId).toString() === kpi._id.toString()) || (r.code && r.code === kpi.code)
              );
              return {
                kpiId: kpi._id,
                kraId: kpi.kraId?._id || kpi.kraId || '',
                kraTitle: kpi.kraId?.title || 'Core Responsibilities',
                title: kpi.title,
                code: kpi.code || '',
                description: kpi.description || '',
                targetValue: kpi.targetValue,
                unit: kpi.unit || '',
                measurementType: kpi.measurementType || 'numeric',
                measurementDirection: kpi.measurementDirection || 'higher_is_better',
                weightage: kpi.weightage || 0,
                actualValue: found?.actualValue !== undefined ? found.actualValue : (kpi.actualValue !== undefined ? kpi.actualValue : ''),
                selfRating: found?.selfRating || 0,
                achievementPercent: found?.achievementPercent || 0,
                comments: found?.comments || '',
                evidenceUrl: found?.evidenceUrl || '',
                evidenceNote: found?.evidenceNote || '',
              };
            })
          : existingSelfRatings.map((r) => ({
              kpiId: r.kpiId?._id || r.kpiId || '',
              kraId: r.kraId?._id || r.kraId || '',
              kraTitle: 'Core Responsibilities',
              title: r.title || 'Assigned KPI',
              code: r.code || '',
              description: r.description || '',
              targetValue: r.targetValue,
              unit: r.unit || '',
              measurementType: r.measurementType || 'numeric',
              measurementDirection: r.measurementDirection || 'higher_is_better',
              weightage: r.weightage || 0,
              actualValue: r.actualValue !== undefined ? r.actualValue : '',
              selfRating: r.selfRating || 0,
              achievementPercent: r.achievementPercent || 0,
              comments: r.comments || '',
              evidenceUrl: r.evidenceUrl || '',
              evidenceNote: r.evidenceNote || '',
            }));

        const initialManagerKpis = assignedKpis.length > 0
          ? assignedKpis.map((kpi) => {
              const foundMgr = existingManagerRatings.find(
                (r) => (r.kpiId && (r.kpiId._id || r.kpiId).toString() === kpi._id.toString()) || (r.code && r.code === kpi.code)
              );
              const foundSelf = existingSelfRatings.find(
                (r) => (r.kpiId && (r.kpiId._id || r.kpiId).toString() === kpi._id.toString()) || (r.code && r.code === kpi.code)
              );
              return {
                kpiId: kpi._id,
                kraId: kpi.kraId?._id || kpi.kraId || '',
                kraTitle: kpi.kraId?.title || 'Core Responsibilities',
                title: kpi.title,
                code: kpi.code || '',
                description: kpi.description || '',
                targetValue: kpi.targetValue,
                unit: kpi.unit || '',
                measurementType: kpi.measurementType || 'numeric',
                measurementDirection: kpi.measurementDirection || 'higher_is_better',
                weightage: kpi.weightage || 0,
                // Employee reported inputs (read-only for evaluator)
                employeeActualValue: foundSelf?.actualValue !== undefined ? foundSelf.actualValue : '',
                employeeSelfRating: foundSelf?.selfRating || 0,
                employeeAchievementPercent: foundSelf?.achievementPercent || 0,
                employeeComments: foundSelf?.comments || '',
                employeeEvidenceUrl: foundSelf?.evidenceUrl || '',
                employeeEvidenceNote: foundSelf?.evidenceNote || '',
                // Manager evaluation fields
                verifiedActualValue: foundMgr?.verifiedActualValue !== undefined
                  ? foundMgr.verifiedActualValue
                  : (foundSelf?.actualValue !== undefined ? foundSelf.actualValue : ''),
                evidenceVerified: foundMgr?.evidenceVerified !== undefined ? foundMgr.evidenceVerified : false,
                managerRating: foundMgr?.managerRating || 0,
                managerComments: foundMgr?.managerComments || '',
              };
            })
          : existingManagerRatings.map((r) => ({
              kpiId: r.kpiId?._id || r.kpiId || '',
              kraId: r.kraId?._id || r.kraId || '',
              kraTitle: 'Core Responsibilities',
              title: r.title || 'Assigned KPI',
              code: r.code || '',
              description: r.description || '',
              targetValue: r.targetValue,
              unit: r.unit || '',
              measurementType: r.measurementType || 'numeric',
              measurementDirection: r.measurementDirection || 'higher_is_better',
              weightage: r.weightage || 0,
              employeeActualValue: '',
              employeeSelfRating: 0,
              employeeAchievementPercent: 0,
              employeeComments: '',
              employeeEvidenceUrl: '',
              employeeEvidenceNote: '',
              verifiedActualValue: r.verifiedActualValue !== undefined ? r.verifiedActualValue : '',
              evidenceVerified: r.evidenceVerified !== undefined ? r.evidenceVerified : false,
              managerRating: r.managerRating || 0,
              managerComments: r.managerComments || '',
            }));

        setSelfForm({
          accomplishments: app.selfAppraisal?.accomplishments || '',
          challenges: app.selfAppraisal?.challenges || '',
          careerAspirations: app.selfAppraisal?.careerAspirations || '',
          kraRatings: app.selfAppraisal?.kraRatings || [],
          kpiRatings: initialSelfKpis,
          competencyRatings: app.selfAppraisal?.competencyRatings || [],
        });

        setManagerForm({
          strengths: app.managerAppraisal?.strengths || '',
          areasOfImprovement: app.managerAppraisal?.areasOfImprovement || '',
          overallComments: app.managerAppraisal?.overallComments || '',
          promotionRecommendation: app.managerAppraisal?.promotionRecommendation || { recommended: false, proposedDesignation: '', notes: '' },
          trainingNeeds: (app.managerAppraisal?.trainingNeeds || []).join(', '),
          kraRatings: app.managerAppraisal?.kraRatings || [],
          kpiRatings: initialManagerKpis,
          competencyRatings: app.managerAppraisal?.competencyRatings || [],
        });

        setDeptHeadForm({
          deptHeadRating: app.departmentHeadEvaluation?.deptHeadRating || 3,
          deptHeadComments: app.departmentHeadEvaluation?.deptHeadComments || '',
        });

        setHrForm({
          hrRating: app.hrEvaluation?.hrRating || 3,
          hrComments: app.hrEvaluation?.hrComments || '',
        });

        setFinalApprovalComments(app.finalApproval?.comments || '');
        setValidationErrors({});

        if (activeTab === 'self') setDrawerTab('self_form');
        else if (activeTab === 'dept') setDrawerTab('dept_form');
        else if (activeTab === 'hr_queue') setDrawerTab('hr_form');
        else if (activeTab === 'final_approval') setDrawerTab('final_approval_form');
        else setDrawerTab('manager_form');

        setDrawerOpen(true);
      }
    } catch (err) {
      toast.error('Failed to open appraisal record');
    }
  };

  const handleSaveSelf = async (isSubmit = false) => {
    if (isSubmit) {
      const errors = {};
      const kpis = selfForm.kpiRatings || [];
      if (kpis.length === 0) {
        toast.error('No assigned KPIs found for this appraisal.');
        return;
      }
      kpis.forEach((kpi, idx) => {
        if (kpi.actualValue === '' || kpi.actualValue === null || kpi.actualValue === undefined) {
          errors[`kpi_${idx}_actual`] = 'Actual value is required';
        }
        if (!kpi.selfRating || kpi.selfRating < 1 || kpi.selfRating > 5) {
          errors[`kpi_${idx}_rating`] = 'Self-rating (1-5) is required';
        }
      });
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        toast.error('Please fill in actual achievement and self-ratings (1-5) for all assigned KPIs.');
        return;
      }
      const confirmed = window.confirm(
        'Are you sure you want to submit your self-appraisal? Once submitted, it will be locked and routed to your reporting manager for evaluation.'
      );
      if (!confirmed) return;
    }

    try {
      setSaving(true);
      const res = await pmsApi.saveSelfAppraisal(selectedAppraisal._id, {
        ...selfForm,
        isSubmit,
      });
      if (res.data?.success) {
        toast.success(isSubmit ? 'Self-appraisal submitted for review' : 'Draft saved');
        setSelectedAppraisal(res.data.data);
        setValidationErrors({});
        fetchAppraisals();
        if (isSubmit) setDrawerOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save self review');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveManager = async (isSubmit = false) => {
    if (isSubmit) {
      const errors = {};
      const kpis = managerForm.kpiRatings || [];
      if (kpis.length === 0) {
        toast.error('No assigned KPIs found for this appraisal.');
        return;
      }
      kpis.forEach((kpi, idx) => {
        if (!kpi.managerRating || kpi.managerRating < 1 || kpi.managerRating > 5) {
          errors[`mgr_kpi_${idx}_rating`] = 'Manager rating (1-5) is required';
        }
      });
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        toast.error('Please provide an independent rating (1-5) for each assigned KPI before submitting.');
        return;
      }
      const confirmed = window.confirm(
        'Are you sure you want to submit this manager review? Authoritative scores will be computed and the appraisal will advance to the next workflow stage.'
      );
      if (!confirmed) return;
    }

    try {
      setSaving(true);
      const payload = {
        ...managerForm,
        trainingNeeds: typeof managerForm.trainingNeeds === 'string'
          ? managerForm.trainingNeeds.split(',').map((s) => s.trim()).filter(Boolean)
          : managerForm.trainingNeeds,
        isSubmit,
      };

      const res = await pmsApi.saveManagerAppraisal(selectedAppraisal._id, payload);
      if (res.data?.success) {
        toast.success(isSubmit ? 'Manager appraisal submitted & advanced' : 'Draft saved');
        setSelectedAppraisal(res.data.data);
        setValidationErrors({});
        fetchAppraisals();
        if (isSubmit) setDrawerOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save manager review');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDeptHead = async () => {
    try {
      setSaving(true);
      const res = await pmsApi.saveDepartmentHeadReview(selectedAppraisal._id, deptHeadForm);
      if (res.data?.success) {
        toast.success('Department Head review recorded and advanced');
        setSelectedAppraisal(res.data.data);
        fetchAppraisals();
        setDrawerOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit Department Head review');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHr = async () => {
    try {
      setSaving(true);
      const res = await pmsApi.saveHrEvaluation(selectedAppraisal._id, hrForm);
      if (res.data?.success) {
        toast.success('HR Evaluation recorded and advanced');
        setSelectedAppraisal(res.data.data);
        fetchAppraisals();
        setDrawerOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit HR evaluation');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFinalApproval = async () => {
    try {
      setSaving(true);
      const res = await pmsApi.saveFinalApproval(selectedAppraisal._id, { comments: finalApprovalComments });
      if (res.data?.success) {
        toast.success('Final approval recorded successfully');
        setSelectedAppraisal(res.data.data);
        fetchAppraisals();
        setDrawerOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record final approval');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionReason || revisionReason.trim().length < 5) {
      toast.error('Please enter a specific revision reason (min 5 characters).');
      return;
    }
    try {
      setSaving(true);
      const res = await pmsApi.requestRevision(selectedAppraisal._id, {
        targetStage: revisionTarget,
        reason: revisionReason,
      });
      if (res.data?.success) {
        toast.success(`Appraisal returned to ${revisionTarget} for revisions.`);
        setSelectedAppraisal(res.data.data);
        setRevisionModalOpen(false);
        setRevisionReason('');
        fetchAppraisals();
        setDrawerOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request revision');
    } finally {
      setSaving(false);
    }
  };

  const handleAcknowledge = async (isDisputed = false, disputeReason = '') => {
    try {
      const res = await pmsApi.acknowledgeAppraisal(selectedAppraisal._id, {
        isDisputed,
        disputeReason,
        comments: isDisputed ? disputeReason : 'Acknowledged appraisal outcomes',
      });
      if (res.data?.success) {
        toast.success(isDisputed ? 'Dispute noted for HR review' : 'Appraisal signed off');
        setSelectedAppraisal(res.data.data);
        fetchAppraisals();
      }
    } catch (err) {
      toast.error('Failed to acknowledge appraisal');
    }
  };

  const getStageBadge = (stageKey, status) => {
    if (status === 'published') {
      return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">Published</span>;
    }
    if (status === 'approved') {
      return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">Approved</span>;
    }
    if (status === 'acknowledged') {
      return <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">Acknowledged</span>;
    }
    if (status === 'disputed') {
      return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">Disputed</span>;
    }
    if (status === 'revision_requested') {
      return <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">Revision Requested</span>;
    }
    switch (stageKey) {
      case 'self_review':
        return <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">Self Review</span>;
      case 'manager_review':
        return <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">Manager Review</span>;
      case 'department_head_review':
        return <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">Dept Head Review</span>;
      case 'hr_evaluation':
        return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">HR Evaluation</span>;
      case 'final_approval':
        return <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">Final Approval</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">{stageKey || status}</span>;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Filter and Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        {/* Scope Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('self')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === 'self' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User size={13} />
            <span>My Appraisal</span>
          </button>

          {!hideAdminTabs && (
            <>
              <button
                onClick={() => setActiveTab('team')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  activeTab === 'team' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users size={13} />
                <span>Manager Queue</span>
              </button>

              <button
                onClick={() => setActiveTab('dept')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  activeTab === 'dept' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Building size={13} />
                <span>Dept Head Queue</span>
              </button>

              <button
                onClick={() => setActiveTab('hr_queue')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  activeTab === 'hr_queue' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Shield size={13} />
                <span>HR Evaluation</span>
              </button>

              <button
                onClick={() => setActiveTab('final_approval')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  activeTab === 'final_approval' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UserCheck size={13} />
                <span>Leadership Sign-off</span>
              </button>

              <button
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  activeTab === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText size={13} />
                <span>All Appraisals</span>
              </button>
            </>
          )}
        </div>

        {/* Cycle Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Cycle:</label>
          <select
            value={selectedCycle}
            onChange={(e) => setSelectedCycle(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden"
          >
            <option value="">All Cycles</option>
            {cycles.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.status.replace(/_/g, ' ')})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Appraisals Grid / Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : appraisals.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No appraisal records found in this queue for the selected cycle.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Reporting Manager</th>
                  <th className="px-5 py-3.5">Approval Stage</th>
                  <th className="px-5 py-3.5">Rating Band</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appraisals.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px]">
                          {app.employeeId?.firstName?.[0] || 'E'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {app.employeeId?.firstName} {app.employeeId?.lastName}
                          </div>
                          <div className="text-[11px] text-slate-500">{app.employeeId?.employeeCode || app.employeeId?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium">{app.employeeId?.department || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium">
                      {app.managerId ? `${app.managerId.firstName} ${app.managerId.lastName}` : 'Unassigned'}
                    </td>
                    <td className="px-5 py-3.5">
                      {getStageBadge(app.currentStageKey, app.status)}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">
                      {app.isPublished ? (
                        <span className="text-emerald-700">{app.scores?.ratingBand || 'Finalized'}</span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">(Unpublished)</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => loadAppraisalDetails(app._id)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-600 shadow-2xs hover:bg-blue-50 transition"
                      >
                        Open Review →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── REVIEW DETAIL DRAWER ─────────────────────────────────────────── */}
      {drawerOpen && selectedAppraisal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity font-sans">
          <div className="w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {selectedAppraisal.employeeId?.firstName} {selectedAppraisal.employeeId?.lastName}
                  </h2>
                  {getStageBadge(selectedAppraisal.currentStageKey, selectedAppraisal.status)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cycle: {selectedAppraisal.cycleId?.name} • Reporting Manager: {selectedAppraisal.managerId?.firstName} {selectedAppraisal.managerId?.lastName}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Request Revision Button (Manager / HR / Admin) */}
                {selectedAppraisal.status !== 'published' && activeTab !== 'self' && (
                  <button
                    onClick={() => setRevisionModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                  >
                    <RotateCcw size={13} />
                    <span>Request Revision</span>
                  </button>
                )}

                <button
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Appraisal Summary Banner */}
            <div className="border-b border-slate-200 px-6 py-3.5 bg-slate-50/60 text-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">EMPLOYEE & CODE</span>
                  <span className="font-bold text-slate-800">
                    {selectedAppraisal.employeeId?.firstName} {selectedAppraisal.employeeId?.lastName}
                    {selectedAppraisal.employeeId?.employeeId ? ` (${selectedAppraisal.employeeId.employeeId})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">DEPARTMENT / ROLE</span>
                  <span className="font-bold text-slate-800">
                    {selectedAppraisal.employeeId?.department?.name || selectedAppraisal.employeeId?.department || 'General'} • {selectedAppraisal.employeeId?.designation || 'Staff'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">REVIEW PERIOD</span>
                  <span className="font-bold text-slate-800">
                    {selectedAppraisal.cycleId?.startDate ? new Date(selectedAppraisal.cycleId.startDate).toLocaleDateString() : 'N/A'} - {selectedAppraisal.cycleId?.endDate ? new Date(selectedAppraisal.cycleId.endDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">SELF-APPRAISAL PROGRESS</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            (selfForm.kpiRatings || []).length > 0
                              ? Math.round(
                                  ((selfForm.kpiRatings || []).filter(
                                    (k) =>
                                      k.actualValue !== '' &&
                                      k.actualValue !== null &&
                                      k.actualValue !== undefined &&
                                      k.selfRating >= 1
                                  ).length /
                                    (selfForm.kpiRatings || []).length) *
                                    100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="font-extrabold text-blue-700 text-[11px] whitespace-nowrap">
                      {(selfForm.kpiRatings || []).filter(
                        (k) =>
                          k.actualValue !== '' &&
                          k.actualValue !== null &&
                          k.actualValue !== undefined &&
                          k.selfRating >= 1
                      ).length}
                      /{(selfForm.kpiRatings || []).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Revision Alert Banner if returned */}
            {selectedAppraisal.status === 'revision_requested' && (
              <div className="bg-rose-50 border-b border-rose-200 p-4 text-xs flex items-start gap-2.5">
                <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={16} />
                <div>
                  <span className="font-bold text-rose-900">Revision Requested: </span>
                  <span className="text-rose-700">{selectedAppraisal.revisionRequest?.reason}</span>
                </div>
              </div>
            )}

            {/* Stepper / Stage Flow Indicators */}
            <div className="border-b border-slate-200 px-6 py-3 bg-slate-50/20 flex items-center justify-between overflow-x-auto text-[11px] font-bold text-slate-500 gap-4">
              <span className={`flex items-center gap-1.5 ${selectedAppraisal.currentStageKey === 'self_review' ? 'text-blue-600 font-black' : ''}`}>
                <CheckCircle2 size={13} className={selectedAppraisal.selfAppraisal?.submittedAt ? 'text-emerald-600' : 'text-slate-300'} />
                1. Self-Appraisal
              </span>
              <ChevronRight size={12} className="text-slate-300" />
              <span className={`flex items-center gap-1.5 ${selectedAppraisal.currentStageKey === 'manager_review' ? 'text-blue-600 font-black' : ''}`}>
                <CheckCircle2 size={13} className={selectedAppraisal.managerAppraisal?.submittedAt ? 'text-emerald-600' : 'text-slate-300'} />
                2. Manager Review
              </span>
              <ChevronRight size={12} className="text-slate-300" />
              <span className={`flex items-center gap-1.5 ${selectedAppraisal.currentStageKey === 'department_head_review' ? 'text-blue-600 font-black' : ''}`}>
                <CheckCircle2 size={13} className={selectedAppraisal.departmentHeadEvaluation?.evaluatedAt ? 'text-emerald-600' : 'text-slate-300'} />
                3. Dept Head Review
              </span>
              <ChevronRight size={12} className="text-slate-300" />
              <span className={`flex items-center gap-1.5 ${selectedAppraisal.currentStageKey === 'hr_evaluation' ? 'text-blue-600 font-black' : ''}`}>
                <CheckCircle2 size={13} className={selectedAppraisal.hrEvaluation?.evaluatedAt ? 'text-emerald-600' : 'text-slate-300'} />
                4. HR Evaluation
              </span>
              <ChevronRight size={12} className="text-slate-300" />
              <span className={`flex items-center gap-1.5 ${selectedAppraisal.currentStageKey === 'final_approval' ? 'text-blue-600 font-black' : ''}`}>
                <CheckCircle2 size={13} className={selectedAppraisal.finalApproval?.approvedAt ? 'text-emerald-600' : 'text-slate-300'} />
                5. Leadership Approval
              </span>
              <ChevronRight size={12} className="text-slate-300" />
              <span className={`flex items-center gap-1.5 ${selectedAppraisal.isPublished ? 'text-emerald-600 font-black' : ''}`}>
                <Award size={13} className={selectedAppraisal.isPublished ? 'text-emerald-600' : 'text-slate-300'} />
                6. Published
              </span>
            </div>

            {/* Drawer Sub-Tabs */}
            <div className="flex border-b border-slate-200 px-6 gap-4 text-xs font-bold text-slate-500 overflow-x-auto">
              <button
                onClick={() => setDrawerTab('self_form')}
                className={`py-3 border-b-2 transition ${drawerTab === 'self_form' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-800'}`}
              >
                Self-Appraisal Scorecard
              </button>
              <button
                onClick={() => setDrawerTab('manager_form')}
                className={`py-3 border-b-2 transition ${drawerTab === 'manager_form' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-800'}`}
              >
                Manager Evaluation Scorecard
              </button>
              <button
                onClick={() => setDrawerTab('dept_form')}
                className={`py-3 border-b-2 transition ${drawerTab === 'dept_form' ? 'border-purple-600 text-purple-600' : 'border-transparent hover:text-slate-800'}`}
              >
                Dept Head Review
              </button>
              <button
                onClick={() => setDrawerTab('hr_form')}
                className={`py-3 border-b-2 transition ${drawerTab === 'hr_form' ? 'border-amber-600 text-amber-600' : 'border-transparent hover:text-slate-800'}`}
              >
                HR Evaluation
              </button>
              <button
                onClick={() => setDrawerTab('final_approval_form')}
                className={`py-3 border-b-2 transition ${drawerTab === 'final_approval_form' ? 'border-sky-600 text-sky-600' : 'border-transparent hover:text-slate-800'}`}
              >
                Final Approval
              </button>
              <button
                onClick={() => setDrawerTab('scores')}
                className={`py-3 border-b-2 transition ${drawerTab === 'scores' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-800'}`}
              >
                Score Breakdown
              </button>
              <button
                onClick={() => setDrawerTab('history')}
                className={`py-3 border-b-2 transition ${drawerTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-800'}`}
              >
                Audit History
              </button>
            </div>

            {/* Drawer Body Form Panels */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* PANEL 1: Self Appraisal Form */}
              {drawerTab === 'self_form' && (() => {
                const isSelfEditable =
                  selectedAppraisal.currentStageKey === 'self_review' &&
                  selectedAppraisal.status !== 'submitted' &&
                  !selectedAppraisal.selfAppraisal?.submittedAt;

                const kpis = selfForm.kpiRatings || [];

                // Group KPIs by KRA
                const kraGroups = {};
                kpis.forEach((kpi, idx) => {
                  const key = kpi.kraId || 'general';
                  if (!kraGroups[key]) {
                    kraGroups[key] = {
                      title: kpi.kraTitle || 'Core Key Result Areas',
                      items: [],
                    };
                  }
                  kraGroups[key].items.push({ ...kpi, formIndex: idx });
                });

                return (
                  <div className="space-y-6">
                    {/* Read-Only Banner if locked */}
                    {!isSelfEditable && (
                      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 flex items-start gap-3">
                        <Info className="text-blue-600 shrink-0 mt-0.5" size={16} />
                        <div>
                          <p className="font-bold">Self-Appraisal is in Read-Only Mode</p>
                          <p className="text-blue-700 mt-0.5">
                            {selectedAppraisal.selfAppraisal?.submittedAt
                              ? `Submitted on ${new Date(selectedAppraisal.selfAppraisal.submittedAt).toLocaleDateString()} at ${new Date(selectedAppraisal.selfAppraisal.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Currently under ${selectedAppraisal.currentStageKey || 'manager_review'}.`
                              : `Locked because the appraisal is in '${selectedAppraisal.currentStageKey || selectedAppraisal.status}' stage.`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Assigned KRAs & KPIs Scorecard */}
                    <div className="space-y-5">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Target className="text-blue-600" size={16} />
                            <span>Assigned KRA & KPI Scorecard</span>
                          </h3>
                          <p className="text-xs text-slate-500">
                            Evaluate each assigned objective against the authoritative cycle targets. Targets and weightages are established by policy.
                          </p>
                        </div>
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                          {kpis.length} Assigned {kpis.length === 1 ? 'Objective' : 'Objectives'}
                        </span>
                      </div>

                      {kpis.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                          <Target className="mx-auto text-slate-300 mb-2" size={24} />
                          No specific KRAs/KPIs assigned for this performance cycle. You may complete your overall narrative reflections below.
                        </div>
                      ) : (
                        Object.entries(kraGroups).map(([kraId, group]) => (
                          <div key={kraId} className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                            {/* KRA Header */}
                            <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <Award className="text-blue-500" size={14} />
                                {group.title}
                              </span>
                              <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">
                                {group.items.reduce((sum, item) => sum + (Number(item.weightage) || 0), 0)}% Total Weightage
                              </span>
                            </div>

                            {/* KPI Items inside KRA */}
                            <div className="p-5 space-y-5 divide-y divide-slate-100">
                              {group.items.map((kpi) => {
                                const idx = kpi.formIndex;
                                const previewPct = calculatePreview(kpi.measurementType, kpi.measurementDirection, kpi.targetValue, kpi.actualValue);
                                const hasActualError = !!validationErrors[`kpi_${idx}_actual`];
                                const hasRatingError = !!validationErrors[`kpi_${idx}_rating`];

                                return (
                                  <div key={kpi.kpiId || idx} className={`${idx > 0 ? 'pt-5' : ''} space-y-3.5`}>
                                    {/* KPI Header & Badges */}
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="text-xs font-bold text-slate-900">{kpi.title}</h4>
                                          {kpi.code && (
                                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600">
                                              {kpi.code}
                                            </span>
                                          )}
                                        </div>
                                        {kpi.description && (
                                          <p className="text-[11px] text-slate-500 mt-0.5">{kpi.description}</p>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                          Weight: {kpi.weightage}%
                                        </span>
                                        <span className="rounded-lg bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200 capitalize">
                                          {kpi.measurementType}
                                        </span>
                                        <span className="rounded-lg bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                                          {kpi.measurementDirection === 'lower_is_better' ? 'Lower is Better' : 'Higher is Better'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Official Target & Achievement Inputs */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                                      {/* Official Target (Read-Only) */}
                                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                          Official Assigned Target
                                        </span>
                                        <div className="mt-1 flex items-baseline gap-1">
                                          <span className="text-sm font-black text-slate-900">
                                            {kpi.measurementType === 'boolean' || kpi.measurementType === 'yes_no'
                                              ? 'Met / Completed'
                                              : kpi.targetValue !== undefined ? kpi.targetValue : 'N/A'}
                                          </span>
                                          {kpi.unit && <span className="text-xs font-bold text-slate-500">{kpi.unit}</span>}
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1 block font-semibold">(Read-Only)</span>
                                      </div>

                                      {/* Actual Achievement Input */}
                                      <div className={`rounded-xl border p-3 ${hasActualError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'}`}>
                                        <div className="flex items-center justify-between">
                                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                            Actual Achievement <span className="text-rose-500">*</span>
                                          </label>
                                          {previewPct !== null && (
                                            <span className="text-[10px] font-extrabold text-blue-600">
                                              Preview: {previewPct}%
                                            </span>
                                          )}
                                        </div>

                                        {kpi.measurementType === 'boolean' || kpi.measurementType === 'yes_no' ? (
                                          <div className="mt-1.5 flex items-center gap-2">
                                            <button
                                              type="button"
                                              disabled={!isSelfEditable}
                                              onClick={() => {
                                                const updated = [...kpis];
                                                updated[idx].actualValue = 1;
                                                setSelfForm({ ...selfForm, kpiRatings: updated });
                                              }}
                                              className={`flex-1 rounded-lg py-1.5 text-xs font-bold border transition ${
                                                kpi.actualValue === 1 || kpi.actualValue === '1' || kpi.actualValue === true || kpi.actualValue === 'yes'
                                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                              }`}
                                            >
                                              Yes / Met
                                            </button>
                                            <button
                                              type="button"
                                              disabled={!isSelfEditable}
                                              onClick={() => {
                                                const updated = [...kpis];
                                                updated[idx].actualValue = 0;
                                                setSelfForm({ ...selfForm, kpiRatings: updated });
                                              }}
                                              className={`flex-1 rounded-lg py-1.5 text-xs font-bold border transition ${
                                                kpi.actualValue === 0 || kpi.actualValue === '0' || kpi.actualValue === false || kpi.actualValue === 'no'
                                                  ? 'bg-rose-600 text-white border-rose-600'
                                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                              }`}
                                            >
                                              No / Not Met
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="mt-1.5 flex items-center gap-2">
                                            <input
                                              type="number"
                                              step="any"
                                              disabled={!isSelfEditable}
                                              value={kpi.actualValue !== undefined ? kpi.actualValue : ''}
                                              onChange={(e) => {
                                                const updated = [...kpis];
                                                updated[idx].actualValue = e.target.value === '' ? '' : Number(e.target.value);
                                                setSelfForm({ ...selfForm, kpiRatings: updated });
                                              }}
                                              placeholder={`e.g. ${kpi.targetValue || 100}`}
                                              className="w-full rounded-lg border border-slate-200 p-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                                            />
                                            {kpi.unit && (
                                              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{kpi.unit}</span>
                                            )}
                                          </div>
                                        )}
                                        {hasActualError && (
                                          <p className="text-[10px] text-rose-600 font-bold mt-1">Achievement is required</p>
                                        )}
                                      </div>

                                      {/* Self-Rating (1-5) */}
                                      <div className={`rounded-xl border p-3 ${hasRatingError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'}`}>
                                        <div className="flex items-center justify-between">
                                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                            Self-Rating <span className="text-rose-500">*</span>
                                          </label>
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm border ${getRatingBandInfo(kpi.selfRating).badgeClass}`}>
                                            {getRatingBandInfo(kpi.selfRating).label}
                                          </span>
                                        </div>

                                        <div className="mt-2 flex items-center justify-between gap-1">
                                          {RATING_SCALE.map((scale) => {
                                            const isSelected = Number(kpi.selfRating) === scale.value;
                                            return (
                                              <button
                                                key={scale.value}
                                                type="button"
                                                disabled={!isSelfEditable}
                                                onClick={() => {
                                                  const updated = [...kpis];
                                                  updated[idx].selfRating = scale.value;
                                                  setSelfForm({ ...selfForm, kpiRatings: updated });
                                                }}
                                                title={`${scale.value}/5 - ${scale.label} (${scale.desc})`}
                                                className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg border text-xs font-extrabold transition ${
                                                  isSelected
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                                }`}
                                              >
                                                <Star size={12} className={isSelected ? 'fill-white' : 'text-slate-400'} />
                                                <span className="text-[11px] mt-0.5">{scale.value}</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                        {hasRatingError && (
                                          <p className="text-[10px] text-rose-600 font-bold mt-1">Rating is required</p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Explanation & Evidence inputs */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                      <div>
                                        <label className="text-[10px] font-bold text-slate-600 block">
                                          Achievement Explanation & Context
                                        </label>
                                        <textarea
                                          rows={2}
                                          disabled={!isSelfEditable}
                                          value={kpi.comments || ''}
                                          onChange={(e) => {
                                            const updated = [...kpis];
                                            updated[idx].comments = e.target.value;
                                            setSelfForm({ ...selfForm, kpiRatings: updated });
                                          }}
                                          placeholder="Explain context, milestones delivered, or any variances..."
                                          className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                                        />
                                      </div>

                                      <div>
                                        <label className="text-[10px] font-bold text-slate-600 flex items-center justify-between">
                                          <span>Evidence Link (Drive, Jira, URL)</span>
                                          {kpi.evidenceUrl && (
                                            <a
                                              href={kpi.evidenceUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-blue-600 hover:underline inline-flex items-center gap-1 font-bold"
                                            >
                                              Open Link <ExternalLink size={10} />
                                            </a>
                                          )}
                                        </label>
                                        <input
                                          type="url"
                                          disabled={!isSelfEditable}
                                          value={kpi.evidenceUrl || ''}
                                          onChange={(e) => {
                                            const updated = [...kpis];
                                            updated[idx].evidenceUrl = e.target.value;
                                            setSelfForm({ ...selfForm, kpiRatings: updated });
                                          }}
                                          placeholder="https://drive.google.com/... or task URL"
                                          className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                                        />
                                        <input
                                          type="text"
                                          disabled={!isSelfEditable}
                                          value={kpi.evidenceNote || ''}
                                          onChange={(e) => {
                                            const updated = [...kpis];
                                            updated[idx].evidenceNote = e.target.value;
                                            setSelfForm({ ...selfForm, kpiRatings: updated });
                                          }}
                                          placeholder="Evidence description or brief note (optional)"
                                          className="mt-1 w-full rounded-xl border border-slate-200 p-1.5 text-[11px] text-slate-600 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Overall Reflections */}
                    <div className="space-y-4 pt-2 border-t border-slate-200">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Overall Narrative Reflection
                      </h3>

                      <div>
                        <label className="text-xs font-bold text-slate-700">Key Accomplishments</label>
                        <textarea
                          rows={3}
                          disabled={!isSelfEditable}
                          value={selfForm.accomplishments}
                          onChange={(e) => setSelfForm({ ...selfForm, accomplishments: e.target.value })}
                          placeholder="Outline major milestones and noteworthy contributions achieved during this cycle..."
                          className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700">Challenges & Blockers</label>
                        <textarea
                          rows={3}
                          disabled={!isSelfEditable}
                          value={selfForm.challenges}
                          onChange={(e) => setSelfForm({ ...selfForm, challenges: e.target.value })}
                          placeholder="Describe operational roadblocks, cross-functional dependencies, or resource constraints faced..."
                          className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700">Career Aspirations & Growth Goals</label>
                        <textarea
                          rows={2}
                          disabled={!isSelfEditable}
                          value={selfForm.careerAspirations}
                          onChange={(e) => setSelfForm({ ...selfForm, careerAspirations: e.target.value })}
                          placeholder="Target competencies, leadership roles, or domain learning goals for upcoming cycles..."
                          className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                        />
                      </div>
                    </div>

                    {/* Self-Appraisal Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="text-xs text-slate-500">
                        {isSelfEditable ? (
                          <span>Draft auto-loads on reopen. Submit to advance to manager evaluation.</span>
                        ) : (
                          <span className="font-semibold text-slate-600">Self-Appraisal is locked from further edits.</span>
                        )}
                      </div>

                      {isSelfEditable && (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleSaveSelf(false)}
                            disabled={saving}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                          >
                            <Save size={14} />
                            <span>Save Draft</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveSelf(true)}
                            disabled={saving}
                            className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-xs flex items-center gap-1.5"
                          >
                            <Send size={14} />
                            <span>Submit Self-Appraisal →</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* PANEL 2: Manager Form */}
              {drawerTab === 'manager_form' && (() => {
                const isManagerEditable =
                  selectedAppraisal.currentStageKey === 'manager_review' &&
                  !selectedAppraisal.managerAppraisal?.submittedAt &&
                  activeTab !== 'self';

                const kpis = managerForm.kpiRatings || [];
                const overallPreview = computeManagerOverallPreview();

                return (
                  <div className="space-y-6">
                    {/* Read-Only Banner if locked */}
                    {!isManagerEditable && (
                      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs text-indigo-900 flex items-start gap-3">
                        <Info className="text-indigo-600 shrink-0 mt-0.5" size={16} />
                        <div>
                          <p className="font-bold">Manager Evaluation Mode</p>
                          <p className="text-indigo-700 mt-0.5">
                            {selectedAppraisal.managerAppraisal?.submittedAt
                              ? `Manager review was submitted on ${new Date(selectedAppraisal.managerAppraisal.submittedAt).toLocaleDateString()}. Ratings and comments are locked.`
                              : selectedAppraisal.currentStageKey === 'self_review'
                              ? 'Waiting for employee self-appraisal submission before manager evaluation begins.'
                              : `Currently in '${selectedAppraisal.currentStageKey || selectedAppraisal.status}' stage.`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Manager Live Score Preview Header */}
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                          Manager Evaluated Score (Preview)
                        </span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-xl font-black text-indigo-950">
                            {overallPreview ? `${overallPreview} / 5` : 'Pending Evaluation'}
                          </span>
                          {overallPreview && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRatingBandInfo(Math.round(overallPreview)).badgeClass}`}>
                              {getRatingBandInfo(Math.round(overallPreview)).label}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 max-w-sm">
                        Authoritative consolidated score is computed by server upon submission based on assigned KPI weights and company policy.
                      </div>
                    </div>

                    {/* Side-by-Side KRA/KPI Evaluation Scorecard */}
                    <div className="space-y-5">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Target className="text-indigo-600" size={16} />
                            <span>Side-by-Side KPI Evaluation</span>
                          </h3>
                          <p className="text-xs text-slate-500">
                            Review employee self-reported actuals and self-ratings, then assign your verified actuals and independent ratings.
                          </p>
                        </div>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                          {kpis.length} Assigned {kpis.length === 1 ? 'KPI' : 'KPIs'}
                        </span>
                      </div>

                      {kpis.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                          <Target className="mx-auto text-slate-300 mb-2" size={24} />
                          No assigned KPIs found for this appraisal.
                        </div>
                      ) : (
                        kpis.map((kpi, idx) => {
                          const hasRatingError = !!validationErrors[`mgr_kpi_${idx}_rating`];

                          return (
                            <div key={kpi.kpiId || idx} className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                              {/* KPI Title & Weight Header */}
                              <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-900">{kpi.title}</span>
                                    {kpi.code && (
                                      <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700">
                                        {kpi.code}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-500">
                                    Target: <span className="font-bold text-slate-800">{kpi.targetValue} {kpi.unit}</span> ({kpi.measurementDirection === 'lower_is_better' ? 'Lower is Better' : 'Higher is Better'})
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="rounded-lg bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                                    Weightage: {kpi.weightage}%
                                  </span>
                                </div>
                              </div>

                              {/* 2-Column Side-by-Side: Employee Input vs Manager Review */}
                              <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                                {/* LEFT COLUMN: Employee Self-Appraisal (Read-Only) */}
                                <div className="space-y-3">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <User size={12} />
                                    <span>Employee Self-Evaluation (Read-Only)</span>
                                  </span>

                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                                      <span className="text-[10px] font-bold text-slate-400 block">REPORTED ACTUAL</span>
                                      <span className="font-extrabold text-slate-900 text-sm">
                                        {kpi.employeeActualValue !== '' && kpi.employeeActualValue !== undefined
                                          ? `${kpi.employeeActualValue} ${kpi.unit || ''}`
                                          : '(Not provided)'}
                                      </span>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                                      <span className="text-[10px] font-bold text-slate-400 block">ACHIEVEMENT PREVIEW</span>
                                      <span className="font-extrabold text-blue-600 text-sm">
                                        {kpi.employeeAchievementPercent ? `${kpi.employeeAchievementPercent}%` : 'N/A'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-xs">
                                    <span className="text-[10px] font-bold text-slate-400 block">EMPLOYEE SELF-RATING</span>
                                    <div className="mt-1 flex items-center gap-2">
                                      <span className="font-extrabold text-slate-900 text-sm">
                                        {kpi.employeeSelfRating ? `${kpi.employeeSelfRating} / 5` : 'Unrated'}
                                      </span>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRatingBandInfo(kpi.employeeSelfRating).badgeClass}`}>
                                        {getRatingBandInfo(kpi.employeeSelfRating).label}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-xs space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 block">EMPLOYEE EXPLANATION</span>
                                    <p className="text-slate-700 italic text-[11px]">
                                      {kpi.employeeComments || 'No explanation provided.'}
                                    </p>
                                  </div>

                                  {kpi.employeeEvidenceUrl && (
                                    <div className="rounded-xl bg-blue-50/50 p-2.5 border border-blue-200 text-xs flex items-center justify-between">
                                      <span className="text-[11px] font-bold text-blue-900">Evidence Attached</span>
                                      <a
                                        href={kpi.employeeEvidenceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                                      >
                                        <span>View Document</span>
                                        <ExternalLink size={12} />
                                      </a>
                                    </div>
                                  )}
                                </div>

                                {/* RIGHT COLUMN: Manager Verification & Rating */}
                                <div className="space-y-3 lg:pl-5 pt-4 lg:pt-0">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                                    <CheckSquare size={12} />
                                    <span>Manager Independent Evaluation</span>
                                  </span>

                                  {/* Verified Actual & Evidence Check */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <label className="text-[10px] font-bold text-slate-600 block">
                                        Verified Actual Value
                                      </label>
                                      <input
                                        type="number"
                                        step="any"
                                        disabled={!isManagerEditable}
                                        value={kpi.verifiedActualValue !== undefined ? kpi.verifiedActualValue : ''}
                                        onChange={(e) => {
                                          const updated = [...kpis];
                                          updated[idx].verifiedActualValue = e.target.value === '' ? '' : Number(e.target.value);
                                          setManagerForm({ ...managerForm, kpiRatings: updated });
                                        }}
                                        placeholder="Same as reported if verified"
                                        className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-hidden disabled:bg-slate-50"
                                      />
                                    </div>

                                    <div className="flex items-end pb-1.5">
                                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                                        <input
                                          type="checkbox"
                                          disabled={!isManagerEditable}
                                          checked={!!kpi.evidenceVerified}
                                          onChange={(e) => {
                                            const updated = [...kpis];
                                            updated[idx].evidenceVerified = e.target.checked;
                                            setManagerForm({ ...managerForm, kpiRatings: updated });
                                          }}
                                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span>Evidence Verified</span>
                                      </label>
                                    </div>
                                  </div>

                                  {/* Manager Independent Rating (1-5) */}
                                  <div className={`rounded-xl border p-3 ${hasRatingError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'}`}>
                                    <div className="flex items-center justify-between">
                                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                        Manager Independent Rating <span className="text-rose-500">*</span>
                                      </label>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm border ${getRatingBandInfo(kpi.managerRating).badgeClass}`}>
                                        {getRatingBandInfo(kpi.managerRating).label}
                                      </span>
                                    </div>

                                    <div className="mt-2 flex items-center justify-between gap-1">
                                      {RATING_SCALE.map((scale) => {
                                        const isSelected = Number(kpi.managerRating) === scale.value;
                                        return (
                                          <button
                                            key={scale.value}
                                            type="button"
                                            disabled={!isManagerEditable}
                                            onClick={() => {
                                              const updated = [...kpis];
                                              updated[idx].managerRating = scale.value;
                                              setManagerForm({ ...managerForm, kpiRatings: updated });
                                            }}
                                            title={`${scale.value}/5 - ${scale.label} (${scale.desc})`}
                                            className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg border text-xs font-extrabold transition ${
                                              isSelected
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                            }`}
                                          >
                                            <Star size={12} className={isSelected ? 'fill-white' : 'text-slate-400'} />
                                            <span className="text-[11px] mt-0.5">{scale.value}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {hasRatingError && (
                                      <p className="text-[10px] text-rose-600 font-bold mt-1">Manager rating is required</p>
                                    )}
                                  </div>

                                  {/* Manager Comments */}
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-600 block">
                                      Evaluator Feedback & Justification
                                    </label>
                                    <textarea
                                      rows={2}
                                      disabled={!isManagerEditable}
                                      value={kpi.managerComments || ''}
                                      onChange={(e) => {
                                        const updated = [...kpis];
                                        updated[idx].managerComments = e.target.value;
                                        setManagerForm({ ...managerForm, kpiRatings: updated });
                                      }}
                                      placeholder="Specific observations, rating justification, or performance adjustments..."
                                      className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden disabled:bg-slate-50"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Overall Manager Qualitative Assessment */}
                    <div className="space-y-4 pt-2 border-t border-slate-200">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Overall Manager Qualitative Assessment
                      </h3>

                      <div>
                        <label className="text-xs font-bold text-slate-700">Strengths & Core Competencies Observed</label>
                        <textarea
                          rows={3}
                          disabled={!isManagerEditable}
                          value={managerForm.strengths}
                          onChange={(e) => setManagerForm({ ...managerForm, strengths: e.target.value })}
                          placeholder="Highlight exceptional delivery, leadership, domain expertise, and cross-functional teamwork..."
                          className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden disabled:bg-slate-50"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700">Areas for Improvement</label>
                        <textarea
                          rows={3}
                          disabled={!isManagerEditable}
                          value={managerForm.areasOfImprovement}
                          onChange={(e) => setManagerForm({ ...managerForm, areasOfImprovement: e.target.value })}
                          placeholder="Identified skill gaps, execution bottlenecks, or behavioral adjustments required..."
                          className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden disabled:bg-slate-50"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700">Overall Evaluator Comments</label>
                        <textarea
                          rows={3}
                          disabled={!isManagerEditable}
                          value={managerForm.overallComments}
                          onChange={(e) => setManagerForm({ ...managerForm, overallComments: e.target.value })}
                          placeholder="Consolidated evaluation remarks and qualitative performance summary..."
                          className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden disabled:bg-slate-50"
                        />
                      </div>

                      {/* Promotion Recommendation */}
                      <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                          <input
                            type="checkbox"
                            disabled={!isManagerEditable}
                            checked={!!managerForm.promotionRecommendation?.recommended}
                            onChange={(e) =>
                              setManagerForm({
                                ...managerForm,
                                promotionRecommendation: {
                                  ...managerForm.promotionRecommendation,
                                  recommended: e.target.checked,
                                },
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Recommend Employee for Promotion or Role Progression</span>
                        </label>

                        {managerForm.promotionRecommendation?.recommended && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 block">Proposed Designation</label>
                              <input
                                type="text"
                                disabled={!isManagerEditable}
                                value={managerForm.promotionRecommendation?.proposedDesignation || ''}
                                onChange={(e) =>
                                  setManagerForm({
                                    ...managerForm,
                                    promotionRecommendation: {
                                      ...managerForm.promotionRecommendation,
                                      proposedDesignation: e.target.value,
                                    },
                                  })
                                }
                                placeholder="e.g. Senior Software Engineer"
                                className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden disabled:bg-slate-50"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 block">Promotion Justification</label>
                              <input
                                type="text"
                                disabled={!isManagerEditable}
                                value={managerForm.promotionRecommendation?.notes || ''}
                                onChange={(e) =>
                                  setManagerForm({
                                    ...managerForm,
                                    promotionRecommendation: {
                                      ...managerForm.promotionRecommendation,
                                      notes: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Key rationale for promotion..."
                                className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden disabled:bg-slate-50"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Training Needs */}
                      <div>
                        <label className="text-xs font-bold text-slate-700">Recommended Training & Development Needs</label>
                        <input
                          type="text"
                          disabled={!isManagerEditable}
                          value={managerForm.trainingNeeds || ''}
                          onChange={(e) => setManagerForm({ ...managerForm, trainingNeeds: e.target.value })}
                          placeholder="e.g. Advanced Cloud Architecture, Executive Communication (comma separated)"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden disabled:bg-slate-50"
                        />
                      </div>
                    </div>

                    {/* Manager Review Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="text-xs text-slate-500">
                        {isManagerEditable ? (
                          <span>Submission locks manager evaluation and advances workflow to Department Head / HR.</span>
                        ) : (
                          <span className="font-semibold text-slate-600">Manager evaluation is locked from further edits.</span>
                        )}
                      </div>

                      {isManagerEditable && (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleSaveManager(false)}
                            disabled={saving}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                          >
                            <Save size={14} />
                            <span>Save Draft</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveManager(true)}
                            disabled={saving}
                            className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs flex items-center gap-1.5"
                          >
                            <Send size={14} />
                            <span>Submit Manager Review & Calculate Scores →</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* PANEL 3: Department Head Form */}
              {drawerTab === 'dept_form' && (
                <div className="space-y-5">
                  <div className="rounded-xl bg-purple-50/60 border border-purple-100 p-4 text-xs text-purple-900">
                    <span className="font-bold">Department Head Review Stage: </span>
                    Provide departmental alignment review and recommend rating moderation.
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Department Alignment Rating (1 to 5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={deptHeadForm.deptHeadRating}
                      onChange={(e) => setDeptHeadForm({ ...deptHeadForm, deptHeadRating: Number(e.target.value) })}
                      className="mt-1.5 w-24 rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Department Head Comments</label>
                    <textarea
                      rows={3}
                      value={deptHeadForm.deptHeadComments}
                      onChange={(e) => setDeptHeadForm({ ...deptHeadForm, deptHeadComments: e.target.value })}
                      placeholder="Department strategic contribution and evaluation sign-off..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleSaveDeptHead}
                      disabled={saving}
                      className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-700 shadow-xs"
                    >
                      Approve & Advance to HR Evaluation →
                    </button>
                  </div>
                </div>
              )}

              {/* PANEL 4: HR Evaluation Form */}
              {drawerTab === 'hr_form' && (
                <div className="space-y-5">
                  <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-4 text-xs text-amber-900">
                    <span className="font-bold">HR Evaluation & Calibration Stage: </span>
                    Validate company-wide policy adherence, calibration benchmarks, and bell curve alignment.
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">HR Assessment Score (1 to 5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={hrForm.hrRating}
                      onChange={(e) => setHrForm({ ...hrForm, hrRating: Number(e.target.value) })}
                      className="mt-1.5 w-24 rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">HR Calibration & Moderation Notes</label>
                    <textarea
                      rows={3}
                      value={hrForm.hrComments}
                      onChange={(e) => setHrForm({ ...hrForm, hrComments: e.target.value })}
                      placeholder="HR compliance and score calibration review notes..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleSaveHr}
                      disabled={saving}
                      className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 shadow-xs"
                    >
                      Complete HR Evaluation & Advance →
                    </button>
                  </div>
                </div>
              )}

              {/* PANEL 5: Final Leadership Approval Form */}
              {drawerTab === 'final_approval_form' && (
                <div className="space-y-5">
                  <div className="rounded-xl bg-sky-50/60 border border-sky-100 p-4 text-xs text-sky-900">
                    <span className="font-bold">Final Leadership Approval Stage: </span>
                    Executive sign-off before publishing appraisal outcomes to the employee.
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Executive Approval Remarks</label>
                    <textarea
                      rows={3}
                      value={finalApprovalComments}
                      onChange={(e) => setFinalApprovalComments(e.target.value)}
                      placeholder="Executive sign-off notes and compensation recommendations..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleSaveFinalApproval}
                      disabled={saving}
                      className="rounded-xl bg-sky-600 px-5 py-2 text-xs font-bold text-white hover:bg-sky-700 shadow-xs"
                    >
                      Authorize & Grant Final Approval →
                    </button>
                  </div>
                </div>
              )}

              {/* PANEL 6: Scores & Mathematical Breakdown */}
              {drawerTab === 'scores' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <span className="text-xs font-bold text-slate-900">Consolidated Performance Score</span>
                      <span className="text-base font-black text-blue-600">
                        {selectedAppraisal.scores?.calculatedFinalScore ? `${selectedAppraisal.scores.calculatedFinalScore} / 5` : '(Pending)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div className="rounded-xl bg-white p-3 border border-slate-200">
                        <span className="text-slate-500 font-semibold">Raw KRA Score</span>
                        <div className="text-sm font-bold text-slate-900 mt-1">{selectedAppraisal.scores?.rawKraScore || 0}%</div>
                      </div>
                      <div className="rounded-xl bg-white p-3 border border-slate-200">
                        <span className="text-slate-500 font-semibold">Raw KPI Score</span>
                        <div className="text-sm font-bold text-slate-900 mt-1">{selectedAppraisal.scores?.rawKpiScore || 0}%</div>
                      </div>
                      <div className="rounded-xl bg-white p-3 border border-slate-200">
                        <span className="text-slate-500 font-semibold">Goals / OKRs Score</span>
                        <div className="text-sm font-bold text-slate-900 mt-1">{selectedAppraisal.scores?.rawGoalScore || 0}%</div>
                      </div>
                      <div className="rounded-xl bg-white p-3 border border-slate-200">
                        <span className="text-slate-500 font-semibold">Competencies Score</span>
                        <div className="text-sm font-bold text-slate-900 mt-1">{selectedAppraisal.scores?.rawCompetencyScore || 0}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Employee sign-off card if published */}
                  {selectedAppraisal.isPublished && !selectedAppraisal.acknowledgement?.isAcknowledged && (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 space-y-3">
                      <h4 className="text-xs font-bold text-blue-900">Employee Sign-off & Acknowledgment</h4>
                      <p className="text-[11px] text-blue-700">
                        Please review the finalized appraisal outcomes and sign off or file an inquiry.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(false)}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-xs cursor-pointer"
                        >
                          Sign-off & Acknowledge
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const reason = prompt('Please enter the reason for your dispute:');
                            if (reason) handleAcknowledge(true, reason);
                          }}
                          className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          File Dispute
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Completed Acknowledgment or Dispute Banner */}
                  {selectedAppraisal.isPublished && selectedAppraisal.acknowledgement?.isAcknowledged && (
                    <div className={`rounded-2xl border p-4 space-y-2 ${
                      selectedAppraisal.acknowledgement.isDisputed
                        ? 'border-amber-200 bg-amber-50/70 text-amber-900'
                        : 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                    }`}>
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <CheckCircle2 size={16} className={selectedAppraisal.acknowledgement.isDisputed ? 'text-amber-600' : 'text-emerald-600'} />
                        <span>
                          {selectedAppraisal.acknowledgement.isDisputed
                            ? 'Appraisal Disputed by Employee'
                            : 'Appraisal Formally Acknowledged & Signed Off'}
                        </span>
                        <span className="text-[10px] font-normal text-slate-500 ml-auto">
                          {selectedAppraisal.acknowledgement.acknowledgedAt
                            ? new Date(selectedAppraisal.acknowledgement.acknowledgedAt).toLocaleString()
                            : ''}
                        </span>
                      </div>
                      {selectedAppraisal.acknowledgement.isDisputed && selectedAppraisal.acknowledgement.disputeReason && (
                        <p className="text-xs bg-white/80 p-2.5 rounded-xl border border-amber-200/60 text-slate-700">
                          <strong>Dispute Reason:</strong> "{selectedAppraisal.acknowledgement.disputeReason}"
                        </p>
                      )}
                      {selectedAppraisal.acknowledgement.employeeComments && !selectedAppraisal.acknowledgement.isDisputed && (
                        <p className="text-xs bg-white/80 p-2.5 rounded-xl border border-emerald-200/60 text-slate-700">
                          <strong>Comments:</strong> "{selectedAppraisal.acknowledgement.employeeComments}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PANEL 7: Audited Workflow Transition History */}
              {drawerTab === 'history' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-900">Audited Stage Progression Timeline</h4>
                  {(!selectedAppraisal.workflowHistory || selectedAppraisal.workflowHistory.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">No transition history recorded yet.</p>
                  ) : (
                    <div className="space-y-3 border-l-2 border-slate-200 pl-4 ml-2">
                      {selectedAppraisal.workflowHistory.map((step, idx) => (
                        <div key={idx} className="relative space-y-1">
                          <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{step.stageLabel || step.stageKey}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                              {step.action}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            By: {step.actedBy?.firstName} {step.actedBy?.lastName} ({step.actedByRole || 'User'}) •{' '}
                            {new Date(step.actionDate).toLocaleString()}
                          </p>
                          {step.comments && (
                            <p className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-700">
                              "{step.comments}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── REVISION REQUEST MODAL ────────────────────────────────────────── */}
      {revisionModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw size={16} className="text-rose-600" />
                <span>Request Appraisal Revision</span>
              </h3>
              <button onClick={() => setRevisionModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Return Appraisal To</label>
              <select
                value={revisionTarget}
                onChange={(e) => setRevisionTarget(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800"
              >
                <option value="self_review">Employee (Self-Appraisal Stage)</option>
                <option value="manager_review">Reporting Manager (Manager Review Stage)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Revision Reason (Required)</label>
              <textarea
                rows={3}
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder="Explain clearly what needs to be revised or expanded..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-rose-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevisionModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestRevision}
                disabled={saving}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-xs"
              >
                Submit Revision Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
