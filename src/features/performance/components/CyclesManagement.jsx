import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Plus,
  Play,
  RotateCcw,
  CheckCircle,
  Clock,
  Settings2,
  ChevronRight,
  Filter,
  Search,
  X,
  AlertTriangle,
  Edit,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import pmsApi from '../api/pmsApi';

const CYCLE_STATUSES = [
  'draft',
  'scheduled',
  'goal_setting',
  'in_progress',
  'self_review',
  'manager_review',
  'peer_feedback',
  'calibration',
  'approval',
  'published',
  'closed',
];

export default function CyclesManagement() {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [reopenReason, setReopenReason] = useState('');
  const [search, setSearch] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    cycleType: 'annual',
    startDate: '',
    endDate: '',
    timeline: {
      goalSettingEnd: '',
      selfAppraisalDeadline: '',
      managerReviewDeadline: '',
      publishingDate: '',
    },
    settings: {
      ratingScale: '1-5',
      weightageModel: {
        kraWeight: 40,
        kpiWeight: 20,
        goalWeight: 20,
        competencyWeight: 20,
      },
    },
  });

  useEffect(() => {
    fetchCycles();
  }, [search]);

  const fetchCycles = async () => {
    try {
      setLoading(true);
      const res = await pmsApi.getCycles({ search });
      if (res.data?.success) {
        setCycles(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load performance cycles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast.error('Please enter name, start date, and end date');
      return;
    }
    try {
      const res = await pmsApi.createCycle(formData);
      if (res.data?.success) {
        toast.success('Appraisal cycle created');
        setShowModal(false);
        fetchCycles();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create cycle');
    }
  };

  const handleAdvanceStatus = async (cycle, nextStatus) => {
    try {
      const res = await pmsApi.changeCycleStatus(cycle._id, nextStatus);
      if (res.data?.success) {
        toast.success(`Cycle transitioned to ${nextStatus.replace(/_/g, ' ')}`);
        fetchCycles();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleReopen = async (e) => {
    e.preventDefault();
    if (!reopenReason || reopenReason.trim().length < 5) {
      toast.error('Please provide a reason with at least 5 characters');
      return;
    }
    try {
      const res = await pmsApi.reopenCycle(selectedCycle._id, { reason: reopenReason });
      if (res.data?.success) {
        toast.success('Cycle reopened successfully');
        setShowReopenModal(false);
        setReopenReason('');
        fetchCycles();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reopen cycle');
    }
  };

  // Edit & Delete states and handlers
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCycle, setEditingCycle] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cycleToDelete, setCycleToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenEdit = (cycle) => {
    setEditingCycle({
      _id: cycle._id,
      name: cycle.name || '',
      code: cycle.code || '',
      description: cycle.description || '',
      cycleType: cycle.cycleType || 'annual',
      status: cycle.status || 'draft',
      startDate: cycle.startDate ? new Date(cycle.startDate).toISOString().slice(0, 10) : '',
      endDate: cycle.endDate ? new Date(cycle.endDate).toISOString().slice(0, 10) : '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingCycle?.name || !editingCycle?.startDate || !editingCycle?.endDate) {
      toast.error('Please enter name, start date, and end date');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await pmsApi.updateCycle(editingCycle._id, editingCycle);
      if (res.data?.success) {
        toast.success('Performance cycle updated successfully');
        setShowEditModal(false);
        setEditingCycle(null);
        fetchCycles();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update cycle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = (cycle) => {
    setCycleToDelete(cycle);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!cycleToDelete?._id) return;
    try {
      setIsSubmitting(true);
      const res = await pmsApi.deleteCycle(cycleToDelete._id);
      if (res.data?.success) {
        toast.success('Performance cycle deleted successfully');
        setShowDeleteModal(false);
        setCycleToDelete(null);
        fetchCycles();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete cycle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      draft: 'bg-slate-100 text-slate-700',
      scheduled: 'bg-blue-50 text-blue-700',
      goal_setting: 'bg-purple-50 text-purple-700',
      in_progress: 'bg-indigo-50 text-indigo-700',
      self_review: 'bg-amber-50 text-amber-700',
      manager_review: 'bg-orange-50 text-orange-700',
      calibration: 'bg-pink-50 text-pink-700',
      published: 'bg-emerald-50 text-emerald-700',
      closed: 'bg-slate-200 text-slate-800',
    };
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${colors[status] || 'bg-slate-100 text-slate-700'}`}>
        {status?.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and Create button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search performance cycles..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <button
          onClick={() => {
            setFormData({
              name: '',
              code: '',
              description: '',
              cycleType: 'annual',
              startDate: '',
              endDate: '',
              timeline: { goalSettingEnd: '', selfAppraisalDeadline: '', managerReviewDeadline: '', publishingDate: '' },
              settings: {
                ratingScale: '1-5',
                weightageModel: { kraWeight: 40, kpiWeight: 20, goalWeight: 20, competencyWeight: 20 },
              },
            });
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          <span>New Performance Cycle</span>
        </button>
      </div>

      {/* Cycles Grid / Table */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
        </div>
      ) : cycles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Calendar size={36} className="mx-auto text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-700">No Performance Cycles Found</h3>
          <p className="mt-1 text-xs text-slate-400">Launch an annual or quarterly appraisal cycle to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {cycles.map((cycle) => {
            const currentIndex = CYCLE_STATUSES.indexOf(cycle.status);
            const nextStatus = currentIndex >= 0 && currentIndex < CYCLE_STATUSES.length - 1 ? CYCLE_STATUSES[currentIndex + 1] : null;

            return (
              <div key={cycle._id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900">{cycle.name}</h4>
                      {getStatusBadge(cycle.status)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {cycle.cycleType?.toUpperCase()} • {format(new Date(cycle.startDate), 'dd MMM yyyy')} — {format(new Date(cycle.endDate), 'dd MMM yyyy')}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cycle)}
                      title="Edit Cycle"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmDelete(cycle)}
                      title="Delete Cycle"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {cycle.description && (
                  <p className="mt-2.5 text-xs text-slate-600 line-clamp-2">{cycle.description}</p>
                )}

                {/* Deadlines Pills */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Self-Review Due</span>
                    <span className="font-semibold text-slate-700">
                      {cycle.timeline?.selfAppraisalDeadline ? format(new Date(cycle.timeline.selfAppraisalDeadline), 'dd MMM yyyy') : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Manager Review Due</span>
                    <span className="font-semibold text-slate-700">
                      {cycle.timeline?.managerReviewDeadline ? format(new Date(cycle.timeline.managerReviewDeadline), 'dd MMM yyyy') : '—'}
                    </span>
                  </div>
                </div>

                {/* Progress Stats */}
                <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
                  <span>Enrolled: <strong>{cycle.stats?.totalAppraisals || 0}</strong> appraisals</span>
                  <span>Published: <strong>{cycle.stats?.published || 0}</strong></span>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  {cycle.status === 'closed' ? (
                    <button
                      onClick={() => {
                        setSelectedCycle(cycle);
                        setShowReopenModal(true);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-800"
                    >
                      <RotateCcw size={14} />
                      <span>Reopen Cycle</span>
                    </button>
                  ) : nextStatus ? (
                    <button
                      onClick={() => handleAdvanceStatus(cycle, nextStatus)}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                    >
                      <Play size={12} />
                      <span>Advance to {nextStatus.replace(/_/g, ' ')} →</span>
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle size={14} /> Cycle Complete
                    </span>
                  )}

                  <span className="text-[11px] font-bold text-slate-400">Scale: {cycle.settings?.ratingScale || '1-5'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Cycle Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create Performance Cycle</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Cycle Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. FY 2026 Annual Performance Review"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Cycle Type</label>
                  <select
                    value={formData.cycleType}
                    onChange={(e) => setFormData({ ...formData, cycleType: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="annual">Annual</option>
                    <option value="half_yearly">Half Yearly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                    <option value="probationary">Probationary</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Rating Scale</label>
                  <select
                    value={formData.settings.ratingScale}
                    onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, ratingScale: e.target.value } })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="1-5">1–5 (Standard)</option>
                    <option value="1-4">1–4 Scale</option>
                    <option value="1-10">1–10 Scale</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Self-Appraisal Deadline</label>
                  <input
                    type="date"
                    value={formData.timeline.selfAppraisalDeadline}
                    onChange={(e) => setFormData({ ...formData, timeline: { ...formData.timeline, selfAppraisalDeadline: e.target.value } })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Manager Review Deadline</label>
                  <input
                    type="date"
                    value={formData.timeline.managerReviewDeadline}
                    onChange={(e) => setFormData({ ...formData, timeline: { ...formData.timeline, managerReviewDeadline: e.target.value } })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Appraisal scope, guidelines, and objective..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                >
                  Create Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reopen Cycle Modal with Mandatory Reason */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <AlertTriangle size={20} />
              <h3 className="text-base font-bold text-slate-900">Reopen Appraisal Cycle</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Reopening <strong>{selectedCycle?.name}</strong> will allow pending reviews to be revised. A formal audit reason is required.
            </p>

            <form onSubmit={handleReopen} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Reason for Reopening *</label>
                <textarea
                  required
                  rows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="Explain why this cycle is being reopened (e.g. late submissions permitted by HR, rating moderation)..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700"
                >
                  Confirm Reopen
                </button>
              </div>
      {/* Edit Cycle Modal */}
      {showEditModal && editingCycle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Performance Cycle</h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCycle(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700">Cycle Name *</label>
                <input
                  type="text"
                  required
                  value={editingCycle.name}
                  onChange={(e) => setEditingCycle({ ...editingCycle, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
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
                    {CYCLE_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st.replace(/_/g, ' ')}
                      </option>
                    ))}
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
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCycle(null);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && cycleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <AlertTriangle size={22} />
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
                disabled={isSubmitting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setCycleToDelete(null);
                }}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Cycle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
