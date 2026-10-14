import React, { useEffect, useState } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  Sliders,
  Scale,
  Sparkles,
  GitBranch,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  ShieldCheck,
  UserCheck,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import pmsApi from '../api/pmsApi';

const AVAILABLE_STAGE_TEMPLATES = [
  { key: 'self_review', label: 'Self-Appraisal', assigneeType: 'employee', canEditRatings: false },
  { key: 'manager_review', label: 'Reporting Manager Review', assigneeType: 'reporting_manager', canEditRatings: true },
  { key: 'department_head_review', label: 'Department Head Review', assigneeType: 'department_head', canEditRatings: true },
  { key: 'hr_evaluation', label: 'HR Evaluation & Calibration', assigneeType: 'hr_group', canEditRatings: true },
  { key: 'final_approval', label: 'Final Leadership Approval', assigneeType: 'company_admin', canEditRatings: false },
  { key: 'published', label: 'Rating Published', assigneeType: 'company_admin', canEditRatings: false },
];

export default function PmsSettings() {
  const [activeTab, setActiveTab] = useState('workflow'); // 'workflow', 'feedback', 'weightage', 'bellcurve'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    defaultWeightageModel: {
      kraWeight: 40,
      kpiWeight: 20,
      goalWeight: 20,
      competencyWeight: 20,
    },
    bellCurveTargetDistribution: [
      { label: 'Exceptional Performance', targetPercentage: 10 },
      { label: 'Exceeds Expectations', targetPercentage: 20 },
      { label: 'Meets Expectations', targetPercentage: 50 },
      { label: 'Partially Meets Expectations', targetPercentage: 15 },
      { label: 'Significantly Below Expectations', targetPercentage: 5 },
    ],
    continuousFeedbackSettings: {
      allowPeerRecognition: true,
      publicWallEnabled: true,
      anonymousFeedbackDefault: true,
      minResponsesForDisclosure: 3,
      allowEmployeeNominate360: true,
      requireManagerApprovalFor360: true,
    },
    approvalWorkflow: {
      stages: [
        { key: 'self_review', label: 'Self-Appraisal', assigneeType: 'employee', order: 1, isRequired: true, canEditRatings: false },
        { key: 'manager_review', label: 'Reporting Manager Review', assigneeType: 'reporting_manager', order: 2, isRequired: true, canEditRatings: true },
        { key: 'hr_evaluation', label: 'HR Evaluation & Calibration', assigneeType: 'hr_group', order: 3, isRequired: true, canEditRatings: true },
        { key: 'final_approval', label: 'Final Leadership Approval', assigneeType: 'company_admin', order: 4, isRequired: true, canEditRatings: false },
        { key: 'published', label: 'Rating Publication', assigneeType: 'company_admin', order: 5, isRequired: true, canEditRatings: false },
      ],
      allowRevisions: true,
      rejectionBehavior: 'return_to_employee',
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await pmsApi.getSettings();
      if (res.data?.success && res.data.data) {
        const fetched = res.data.data;
        setSettings((prev) => ({
          ...prev,
          ...fetched,
          approvalWorkflow: fetched.approvalWorkflow?.stages?.length
            ? fetched.approvalWorkflow
            : prev.approvalWorkflow,
          continuousFeedbackSettings: {
            ...prev.continuousFeedbackSettings,
            ...(fetched.continuousFeedbackSettings || {}),
          },
        }));
      }
    } catch (err) {
      toast.error('Failed to load PMS settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    const weights = settings.defaultWeightageModel;
    const sum = (weights.kraWeight || 0) + (weights.kpiWeight || 0) + (weights.goalWeight || 0) + (weights.competencyWeight || 0);

    if (sum !== 100) {
      toast.error(`Weights must total 100% (currently ${sum}%)`);
      return;
    }

    try {
      setSaving(true);
      const res = await pmsApi.updateSettings(settings);
      if (res.data?.success) {
        toast.success('Performance configuration updated successfully');
      }
    } catch (err) {
      toast.error('Failed to update PMS settings');
    } finally {
      setSaving(false);
    }
  };

  const moveStage = (index, direction) => {
    const stages = [...(settings.approvalWorkflow?.stages || [])];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const temp = stages[index];
    stages[index] = stages[targetIndex];
    stages[targetIndex] = temp;

    const reordered = stages.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSettings((prev) => ({
      ...prev,
      approvalWorkflow: { ...prev.approvalWorkflow, stages: reordered },
    }));
  };

  const toggleStageRequired = (index) => {
    const stages = [...(settings.approvalWorkflow?.stages || [])];
    stages[index].isRequired = !stages[index].isRequired;
    setSettings((prev) => ({
      ...prev,
      approvalWorkflow: { ...prev.approvalWorkflow, stages },
    }));
  };

  const updateStageAssignee = (index, assigneeType) => {
    const stages = [...(settings.approvalWorkflow?.stages || [])];
    stages[index].assigneeType = assigneeType;
    setSettings((prev) => ({
      ...prev,
      approvalWorkflow: { ...prev.approvalWorkflow, stages },
    }));
  };

  const addStage = (template) => {
    const stages = [...(settings.approvalWorkflow?.stages || [])];
    const exists = stages.some((s) => s.key === template.key);
    if (exists) {
      toast.error(`Stage "${template.label}" already exists in the approval workflow.`);
      return;
    }
    // Insert before 'published' if present, unless we are adding 'published'
    const pubIndex = stages.findIndex((s) => s.key === 'published');
    const newStage = {
      ...template,
      order: stages.length + 1,
      isRequired: true,
    };

    if (template.key !== 'published' && pubIndex !== -1) {
      stages.splice(pubIndex, 0, newStage);
    } else {
      stages.push(newStage);
    }

    const reordered = stages.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSettings((prev) => ({
      ...prev,
      approvalWorkflow: { ...prev.approvalWorkflow, stages: reordered },
    }));
    toast.success(`Added ${template.label} stage`);
  };

  const removeStage = (index) => {
    const stages = [...(settings.approvalWorkflow?.stages || [])];
    if (stages.length <= 1) {
      toast.error('Workflow must contain at least one stage.');
      return;
    }
    const removed = stages.splice(index, 1)[0];
    const reordered = stages.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSettings((prev) => ({
      ...prev,
      approvalWorkflow: { ...prev.approvalWorkflow, stages: reordered },
    }));
    toast.success(`Removed "${removed?.label || 'Stage'}"`);
  };

  const handleAddBellCurveTier = () => {
    const current = settings.bellCurveTargetDistribution || [];
    const newTier = {
      label: `Rating Tier ${current.length + 1}`,
      targetPercentage: 10,
    };
    setSettings((prev) => ({
      ...prev,
      bellCurveTargetDistribution: [...current, newTier],
    }));
    toast.success('Added new rating tier');
  };

  const handleDeleteBellCurveTier = (index) => {
    const current = [...(settings.bellCurveTargetDistribution || [])];
    if (current.length <= 1) {
      toast.error('Guidelines must contain at least one tier.');
      return;
    }
    const removed = current.splice(index, 1)[0];
    setSettings((prev) => ({
      ...prev,
      bellCurveTargetDistribution: current,
    }));
    toast.success(`Removed "${removed?.label || 'Tier'}"`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const weights = settings.defaultWeightageModel || {};
  const currentTotal = (weights.kraWeight || 0) + (weights.kpiWeight || 0) + (weights.goalWeight || 0) + (weights.competencyWeight || 0);
  const stages = settings.approvalWorkflow?.stages || [];
  const feedbackSettings = settings.continuousFeedbackSettings || {};
  const bellCurveTotal = (settings.bellCurveTargetDistribution || []).reduce(
    (acc, item) => acc + (Number(item.targetPercentage) || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-4xl font-sans">
      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('workflow')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'workflow'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <GitBranch size={14} />
            Approval Workflow Builder
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'feedback'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sparkles size={14} />
            Continuous & 360 Feedback
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('weightage')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'weightage'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Scale size={14} />
            Weightage Model
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bellcurve')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'bellcurve'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sliders size={14} />
            Bell Curve Distribution
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* ─── TAB 1: Configurable Approval Workflow Builder ────────────────── */}
      {activeTab === 'workflow' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Appraisal Approval Hierarchy & Stages</h3>
                <p className="text-xs text-slate-500">
                  Configure the sequential approval pipeline for performance appraisals. Stages execute dynamically in order.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Add Stage:</span>
                {AVAILABLE_STAGE_TEMPLATES.map((tmpl) => {
                  const isPresent = stages.some((s) => s.key === tmpl.key);
                  if (isPresent) return null;
                  return (
                    <button
                      key={tmpl.key}
                      type="button"
                      onClick={() => addStage(tmpl)}
                      className="inline-flex items-center gap-1 rounded-lg border border-dashed border-blue-400 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      <Plus size={12} />
                      {tmpl.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage Pipeline List */}
            <div className="space-y-3">
              {stages.map((stage, idx) => (
                <div
                  key={stage.key || idx}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">{stage.label}</span>
                        {stage.isRequired ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            Required
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            Optional
                          </span>
                        )}
                        {stage.canEditRatings && (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">
                            Can Rate
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">Stage Key: {stage.key}</p>
                    </div>
                  </div>

                  {/* Assignee Strategy Selector */}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col text-right">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned To</label>
                      <select
                        value={stage.assigneeType}
                        onChange={(e) => updateStageAssignee(idx, e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-hidden"
                      >
                        <option value="employee">Assigned Employee</option>
                        <option value="reporting_manager">Reporting Manager</option>
                        <option value="department_head">Department Head</option>
                        <option value="hr_group">HR Evaluation Group</option>
                        <option value="company_admin">Company Admin / Leadership</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                      <button
                        type="button"
                        onClick={() => moveStage(idx, -1)}
                        disabled={idx === 0}
                        title="Move Up"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStage(idx, 1)}
                        disabled={idx === stages.length - 1}
                        title="Move Down"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStage(idx)}
                        title={`Remove ${stage.label || 'Stage'}`}
                        className="rounded-md p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Rejection / Revision Policy */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Revision & Rejection Behavior</h4>
                <p className="text-[11px] text-slate-500">
                  Defines where an appraisal is returned when an approver requests revisions.
                </p>
              </div>
              <select
                value={settings.approvalWorkflow?.rejectionBehavior || 'return_to_employee'}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    approvalWorkflow: {
                      ...prev.approvalWorkflow,
                      rejectionBehavior: e.target.value,
                    },
                  }))
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="return_to_employee">Return to Employee for Resubmission</option>
                <option value="return_to_manager">Return to Reporting Manager</option>
                <option value="reject_cycle">Reject / Terminate Appraisal Cycle</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Continuous & 360 Feedback Settings ────────────────────── */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Continuous Feedback & 360-Degree Privacy Settings</h3>
              <p className="text-xs text-slate-500">
                Configure peer recognition, anonymous review disclosures, and reviewer nomination permissions.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Allow Peer Recognition (Kudos)</h4>
                  <p className="text-[11px] text-slate-500">Enables colleagues to give peer appreciations, Kudos, and values tags.</p>
                </div>
                <input
                  type="checkbox"
                  checked={feedbackSettings.allowPeerRecognition}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      continuousFeedbackSettings: {
                        ...prev.continuousFeedbackSettings,
                        allowPeerRecognition: e.target.checked,
                      },
                    }))
                  }
                  className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Public Kudos & Recognition Wall</h4>
                  <p className="text-[11px] text-slate-500">Displays Kudos on the company performance wall visible to team members.</p>
                </div>
                <input
                  type="checkbox"
                  checked={feedbackSettings.publicWallEnabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      continuousFeedbackSettings: {
                        ...prev.continuousFeedbackSettings,
                        publicWallEnabled: e.target.checked,
                      },
                    }))
                  }
                  className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Anonymous 360 Peer Reviews by Default</h4>
                  <p className="text-[11px] text-slate-500">
                    Reviewer identity is strictly hidden from the employee on the backend to encourage candid feedback.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={feedbackSettings.anonymousFeedbackDefault}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      continuousFeedbackSettings: {
                        ...prev.continuousFeedbackSettings,
                        anonymousFeedbackDefault: e.target.checked,
                      },
                    }))
                  }
                  className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Minimum Responses for Feedback Disclosure</h4>
                  <p className="text-[11px] text-slate-500">
                    Aggregated scores remain masked until this minimum number of peer reviews are submitted.
                  </p>
                </div>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={feedbackSettings.minResponsesForDisclosure || 3}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      continuousFeedbackSettings: {
                        ...prev.continuousFeedbackSettings,
                        minResponsesForDisclosure: Number(e.target.value) || 3,
                      },
                    }))
                  }
                  className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 text-center font-bold"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Allow Employees to Nominate 360 Reviewers</h4>
                  <p className="text-[11px] text-slate-500">Employees can nominate cross-functional peers during appraisal goal setting.</p>
                </div>
                <input
                  type="checkbox"
                  checked={feedbackSettings.allowEmployeeNominate360}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      continuousFeedbackSettings: {
                        ...prev.continuousFeedbackSettings,
                        allowEmployeeNominate360: e.target.checked,
                      },
                    }))
                  }
                  className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Require Reporting Manager Approval for 360 Nominees</h4>
                  <p className="text-[11px] text-slate-500">Reporting manager must approve nominated peers before review invites are sent.</p>
                </div>
                <input
                  type="checkbox"
                  checked={feedbackSettings.requireManagerApprovalFor360}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      continuousFeedbackSettings: {
                        ...prev.continuousFeedbackSettings,
                        requireManagerApprovalFor360: e.target.checked,
                      },
                    }))
                  }
                  className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: Weightage Model ───────────────────────────────────────── */}
      {activeTab === 'weightage' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Consolidated Evaluation Weightage Model</h3>
                <p className="text-xs text-slate-500">
                  Define standard contribution weights for overall rating calculation (must equal 100%).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Total:</span>
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                    currentTotal === 100
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {currentTotal}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <label className="text-xs font-semibold text-slate-700">KRAs Weight</label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights.kraWeight || 0}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        defaultWeightageModel: {
                          ...prev.defaultWeightageModel,
                          kraWeight: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-semibold">%</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <label className="text-xs font-semibold text-slate-700">KPIs Weight</label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights.kpiWeight || 0}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        defaultWeightageModel: {
                          ...prev.defaultWeightageModel,
                          kpiWeight: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-semibold">%</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <label className="text-xs font-semibold text-slate-700">Goals Weight</label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights.goalWeight || 0}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        defaultWeightageModel: {
                          ...prev.defaultWeightageModel,
                          goalWeight: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-semibold">%</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <label className="text-xs font-semibold text-slate-700">Competencies Weight</label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights.competencyWeight || 0}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        defaultWeightageModel: {
                          ...prev.defaultWeightageModel,
                          competencyWeight: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-semibold">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: Bell Curve Target Distribution ────────────────────────── */}
      {activeTab === 'bellcurve' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Bell Curve Target Guidelines</h3>
                <p className="text-xs text-slate-500">
                  Recommended distribution quotas across rating tiers for moderation & calibration analysis.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    bellCurveTotal === 100
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  Total: {bellCurveTotal}%
                </span>
                <button
                  type="button"
                  onClick={handleAddBellCurveTier}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Tier</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {(settings.bellCurveTargetDistribution || []).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No distribution tiers configured. Click &quot;Add Tier&quot; to define guidelines.
                </div>
              ) : (
                (settings.bellCurveTargetDistribution || []).map((band, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50 transition"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        value={band.label}
                        onChange={(e) => {
                          const updated = [...settings.bellCurveTargetDistribution];
                          updated[idx] = { ...updated[idx], label: e.target.value };
                          setSettings((prev) => ({ ...prev, bellCurveTargetDistribution: updated }));
                        }}
                        placeholder="Tier Label"
                        className="w-full max-w-sm rounded-lg border border-transparent bg-transparent px-2.5 py-1 text-xs font-semibold text-slate-800 hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
                      />
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={band.targetPercentage}
                          onChange={(e) => {
                            const updated = [...settings.bellCurveTargetDistribution];
                            updated[idx] = { ...updated[idx], targetPercentage: Number(e.target.value) };
                            setSettings((prev) => ({ ...prev, bellCurveTargetDistribution: updated }));
                          }}
                          className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-right font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                        />
                        <span className="text-xs text-slate-500 font-semibold">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteBellCurveTier(idx)}
                        title={`Delete ${band.label || 'Tier'}`}
                        className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
