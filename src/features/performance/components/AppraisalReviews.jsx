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

  // Form states for active review
  const [selfForm, setSelfForm] = useState({
    accomplishments: '',
    challenges: '',
    careerAspirations: '',
    kraRatings: [],
    competencyRatings: [],
  });

  const [managerForm, setManagerForm] = useState({
    strengths: '',
    areasOfImprovement: '',
    overallComments: '',
    promotionRecommendation: { recommended: false, proposedDesignation: '', notes: '' },
    trainingNeeds: '',
    kraRatings: [],
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
      if (res.data?.success) setAppraisals(res.data.data);
    } catch (err) {
      toast.error('Failed to load appraisals');
    } finally {
      setLoading(false);
    }
  };

  const loadAppraisalDetails = async (id) => {
    try {
      const res = await pmsApi.getAppraisal(id);
      if (res.data?.success) {
        const app = res.data.data;
        setSelectedAppraisal(app);

        setSelfForm({
          accomplishments: app.selfAppraisal?.accomplishments || '',
          challenges: app.selfAppraisal?.challenges || '',
          careerAspirations: app.selfAppraisal?.careerAspirations || '',
          kraRatings: app.selfAppraisal?.kraRatings || [],
          competencyRatings: app.selfAppraisal?.competencyRatings || [],
        });

        setManagerForm({
          strengths: app.managerAppraisal?.strengths || '',
          areasOfImprovement: app.managerAppraisal?.areasOfImprovement || '',
          overallComments: app.managerAppraisal?.overallComments || '',
          promotionRecommendation: app.managerAppraisal?.promotionRecommendation || { recommended: false },
          trainingNeeds: (app.managerAppraisal?.trainingNeeds || []).join(', '),
          kraRatings: app.managerAppraisal?.kraRatings || [],
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
    try {
      setSaving(true);
      const res = await pmsApi.saveSelfAppraisal(selectedAppraisal._id, {
        ...selfForm,
        isSubmit,
      });
      if (res.data?.success) {
        toast.success(isSubmit ? 'Self-appraisal submitted for review' : 'Draft saved');
        setSelectedAppraisal(res.data.data);
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
          <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">
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
                Self-Appraisal
              </button>
              <button
                onClick={() => setDrawerTab('manager_form')}
                className={`py-3 border-b-2 transition ${drawerTab === 'manager_form' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-800'}`}
              >
                Manager Evaluation
              </button>
              <button
                onClick={() => setDrawerTab('dept_form')}
                className={`py-3 border-b-2 transition ${drawerTab === 'dept_form' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-800'}`}
              >
                Dept Head Review
              </button>
              <button
                onClick={() => setDrawerTab('hr_form')}
                className={`py-3 border-b-2 transition ${drawerTab === 'hr_form' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-800'}`}
              >
                HR Evaluation
              </button>
              <button
                onClick={() => setDrawerTab('final_approval_form')}
                className={`py-3 border-b-2 transition ${drawerTab === 'final_approval_form' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-800'}`}
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
              {drawerTab === 'self_form' && (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Key Accomplishments</label>
                    <textarea
                      rows={3}
                      value={selfForm.accomplishments}
                      onChange={(e) => setSelfForm({ ...selfForm, accomplishments: e.target.value })}
                      placeholder="Outline major milestones achieved during this cycle..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Challenges & Blockers</label>
                    <textarea
                      rows={3}
                      value={selfForm.challenges}
                      onChange={(e) => setSelfForm({ ...selfForm, challenges: e.target.value })}
                      placeholder="Describe any challenges or operational hurdles faced..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Career Aspirations & Growth Goals</label>
                    <textarea
                      rows={2}
                      value={selfForm.careerAspirations}
                      onChange={(e) => setSelfForm({ ...selfForm, careerAspirations: e.target.value })}
                      placeholder="Future skills, leadership goals, and development aspirations..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleSaveSelf(false)}
                      disabled={saving}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveSelf(true)}
                      disabled={saving}
                      className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-xs"
                    >
                      Submit Self-Appraisal →
                    </button>
                  </div>
                </div>
              )}

              {/* PANEL 2: Manager Form */}
              {drawerTab === 'manager_form' && (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Strengths & Core Competencies Observed</label>
                    <textarea
                      rows={3}
                      value={managerForm.strengths}
                      onChange={(e) => setManagerForm({ ...managerForm, strengths: e.target.value })}
                      placeholder="Highlight exceptional delivery, leadership, and team collaboration..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Areas for Improvement</label>
                    <textarea
                      rows={3}
                      value={managerForm.areasOfImprovement}
                      onChange={(e) => setManagerForm({ ...managerForm, areasOfImprovement: e.target.value })}
                      placeholder="Identified skill gaps, execution speed, or quality adjustments..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Overall Evaluator Comments</label>
                    <textarea
                      rows={3}
                      value={managerForm.overallComments}
                      onChange={(e) => setManagerForm({ ...managerForm, overallComments: e.target.value })}
                      placeholder="Consolidated evaluation feedback..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleSaveManager(false)}
                      disabled={saving}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveManager(true)}
                      disabled={saving}
                      className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs"
                    >
                      Submit Manager Review & Calculate Scores →
                    </button>
                  </div>
                </div>
              )}

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
                          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-xs"
                        >
                          Sign-off & Acknowledge
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const reason = prompt('Please enter the reason for your dispute:');
                            if (reason) handleAcknowledge(true, reason);
                          }}
                          className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
                        >
                          File Dispute
                        </button>
                      </div>
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
