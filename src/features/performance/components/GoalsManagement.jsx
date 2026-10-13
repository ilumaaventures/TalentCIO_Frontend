import React, { useEffect, useState } from 'react';
import {
  Target,
  Plus,
  GitBranch,
  List,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronDown,
  Search,
  MessageSquare,
  X,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import pmsApi from '../api/pmsApi';

export default function GoalsManagement() {
  const [goals, setGoals] = useState([]);
  const [treeGoals, setTreeGoals] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'tree'
  const [search, setSearch] = useState('');
  const [selectedCycle, setSelectedCycle] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [activeGoal, setActiveGoal] = useState(null);

  // Goal Creation Form
  const [formData, setFormData] = useState({
    cycleId: '',
    title: '',
    description: '',
    scope: 'individual',
    priority: 'medium',
    weightage: 20,
    dueDate: '',
    keyResults: [{ title: '', target: 100, current: 0, unit: '%' }],
  });

  // CheckIn Form
  const [checkInData, setCheckInData] = useState({
    progress: 0,
    notes: '',
    blockers: '',
  });

  useEffect(() => {
    loadCycles();
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [selectedCycle, search, viewMode]);

  const loadCycles = async () => {
    try {
      const res = await pmsApi.getCycles();
      if (res.data?.success && res.data.data.length > 0) {
        setCycles(res.data.data);
        setSelectedCycle(res.data.data[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGoals = async () => {
    try {
      setLoading(true);
      if (viewMode === 'tree') {
        const res = await pmsApi.getGoalTree({ cycleId: selectedCycle });
        if (res.data?.success) setTreeGoals(res.data.data);
      } else {
        const res = await pmsApi.getGoals({ cycleId: selectedCycle, search });
        if (res.data?.success) setGoals(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.cycleId) {
      toast.error('Cycle and Title are required');
      return;
    }
    try {
      const res = await pmsApi.createGoal(formData);
      if (res.data?.success) {
        toast.success('Goal submitted for approval');
        setShowModal(false);
        fetchGoals();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create goal');
    }
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    try {
      const res = await pmsApi.checkInGoal(activeGoal._id, checkInData);
      if (res.data?.success) {
        toast.success('Check-in progress recorded');
        setShowCheckInModal(false);
        fetchGoals();
      }
    } catch (err) {
      toast.error('Failed to record check-in');
    }
  };

  const handleApprove = async (id, action) => {
    try {
      const res = await pmsApi.approveGoal(id, { action });
      if (res.data?.success) {
        toast.success(`Goal ${action}d`);
        fetchGoals();
      }
    } catch (err) {
      toast.error('Failed to approve goal');
    }
  };

  const addKeyResultRow = () => {
    setFormData({
      ...formData,
      keyResults: [...formData.keyResults, { title: '', target: 100, current: 0, unit: '%' }],
    });
  };

  const renderTreeNode = (node, depth = 0) => (
    <div key={node._id} className="space-y-2">
      <div
        className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs"
        style={{ marginLeft: `${depth * 28}px` }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-xs">
            {depth === 0 ? 'ORG' : depth === 1 ? 'DEPT' : 'IND'}
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-900">{node.title}</h5>
            <div className="text-[11px] text-slate-500">
              {node.employeeId?.firstName} {node.employeeId?.lastName} • {node.scope}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs font-extrabold text-blue-600">{node.progress}%</span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 mt-1">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${node.progress}%` }} />
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
            {node.status?.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
      {node.children && node.children.map((child) => renderTreeNode(child, depth + 1))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {cycles.length > 0 && (
            <select
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-hidden"
            >
              {cycles.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List size={14} />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                viewMode === 'tree' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitBranch size={14} />
              <span>Hierarchy Tree</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            setFormData({
              cycleId: selectedCycle || cycles[0]?._id || '',
              title: '',
              description: '',
              scope: 'individual',
              priority: 'medium',
              weightage: 20,
              dueDate: '',
              keyResults: [{ title: '', target: 100, current: 0, unit: '%' }],
            });
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          <span>Set New Goal / OKR</span>
        </button>
      </div>

      {/* Main View */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
        </div>
      ) : viewMode === 'tree' ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-3">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h4 className="text-sm font-bold text-slate-900">Organizational Goal Cascade & Alignment</h4>
            <p className="text-xs text-slate-500">Visualizing strategic goals connected to departmental and individual objectives</p>
          </div>
          {treeGoals.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No aligned goals recorded</div>
          ) : (
            treeGoals.map((root) => renderTreeNode(root, 0))
          )}
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Target size={36} className="mx-auto text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-700">No Goals for this Cycle</h3>
          <p className="mt-1 text-xs text-slate-400">Set individual or team goals with key results to track performance.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <div key={goal._id} className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-purple-700">
                    {goal.scope}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                    goal.status === 'achieved'
                      ? 'bg-emerald-50 text-emerald-700'
                      : goal.status === 'pending_approval'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}>
                    {goal.status?.replace(/_/g, ' ')}
                  </span>
                </div>

                <h4 className="mt-2.5 text-sm font-bold text-slate-900">{goal.title}</h4>
                {goal.description && (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{goal.description}</p>
                )}

                {/* Progress bar */}
                <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Overall Progress</span>
                    <span className="text-blue-600">{goal.progress}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>

                  {goal.keyResults && goal.keyResults.length > 0 && (
                    <div className="mt-3 space-y-1.5 border-t border-slate-200/60 pt-2 text-[11px]">
                      <span className="font-bold text-slate-600 text-[10px] uppercase">Key Results</span>
                      {goal.keyResults.map((kr, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-500">
                          <span className="truncate max-w-[180px]">{kr.title}</span>
                          <span className="font-semibold text-slate-700">{kr.current} / {kr.target} {kr.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Owner: <strong>{goal.employeeId?.firstName} {goal.employeeId?.lastName}</strong></span>
                  <span>Priority: <strong className="uppercase">{goal.priority}</strong></span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <button
                  onClick={() => {
                    setActiveGoal(goal);
                    setCheckInData({ progress: goal.progress, notes: '', blockers: '' });
                    setShowCheckInModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  <Clock size={13} />
                  <span>Update Check-in</span>
                </button>

                {goal.status === 'pending_approval' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleApprove(goal._id, 'approve')}
                      className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      title="Approve Goal"
                    >
                      <ThumbsUp size={13} />
                    </button>
                    <button
                      onClick={() => handleApprove(goal._id, 'reject')}
                      className="p-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100"
                      title="Reject Goal"
                    >
                      <ThumbsDown size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Goal Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Define Goal / OKR</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Appraisal Cycle *</label>
                <select
                  required
                  value={formData.cycleId}
                  onChange={(e) => setFormData({ ...formData, cycleId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">Select Cycle</option>
                  {cycles.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Goal Objective Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Implement Microfrontend Architecture for Billing Module"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Scope</label>
                  <select
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="individual">Individual</option>
                    <option value="team">Team</option>
                    <option value="department">Department</option>
                    <option value="strategic">Strategic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Target Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Key Results */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Key Results (Measurable Outcomes)</label>
                  <button
                    type="button"
                    onClick={addKeyResultRow}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    + Add Result
                  </button>
                </div>

                {formData.keyResults.map((kr, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Reduce page load time to < 800ms"
                      value={kr.title}
                      onChange={(e) => {
                        const updated = [...formData.keyResults];
                        updated[idx].title = e.target.value;
                        setFormData({ ...formData, keyResults: updated });
                      }}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                    />
                    <input
                      type="number"
                      placeholder="Target"
                      value={kr.target}
                      onChange={(e) => {
                        const updated = [...formData.keyResults];
                        updated[idx].target = Number(e.target.value);
                        setFormData({ ...formData, keyResults: updated });
                      }}
                      className="w-20 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                ))}
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
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Check In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Update Goal Check-in</h3>
              <button onClick={() => setShowCheckInModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCheckIn} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Current Progress ({checkInData.progress}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={checkInData.progress}
                  onChange={(e) => setCheckInData({ ...checkInData, progress: Number(e.target.value) })}
                  className="mt-2 w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Check-in Notes</label>
                <textarea
                  rows={2}
                  value={checkInData.notes}
                  onChange={(e) => setCheckInData({ ...checkInData, notes: e.target.value })}
                  placeholder="What was completed this period?"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Blockers or Challenges</label>
                <input
                  type="text"
                  value={checkInData.blockers}
                  onChange={(e) => setCheckInData({ ...checkInData, blockers: e.target.value })}
                  placeholder="Any dependency or blocker needing attention?"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                >
                  Submit Check-in
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
