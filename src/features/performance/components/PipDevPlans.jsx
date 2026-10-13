import React, { useEffect, useState } from 'react';
import {
  FileWarning,
  Plus,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import pmsApi from '../api/pmsApi';

export default function PipDevPlans() {
  const [subTab, setSubTab] = useState('pip'); // 'pip' or 'idp'
  const [pips, setPips] = useState([]);
  const [devPlans, setDevPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPipModal, setShowPipModal] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);

  // PIP Form
  const [pipForm, setPipForm] = useState({
    employeeId: '',
    title: '',
    reason: '',
    startDate: '',
    endDate: '',
    objectiveDesc: '',
    successCriteria: '',
  });

  // IDP Form
  const [devForm, setDevForm] = useState({
    employeeId: '',
    skillOrCompetency: '',
    activityType: 'Training / Course',
    description: '',
    resourceOrLink: '',
    targetDate: '',
  });

  useEffect(() => {
    fetchData();
  }, [subTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (subTab === 'pip') {
        const res = await pmsApi.getPips();
        if (res.data?.success) setPips(res.data.data);
      } else {
        const res = await pmsApi.getDevPlans();
        if (res.data?.success) setDevPlans(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePip = async (e) => {
    e.preventDefault();
    if (!pipForm.employeeId || !pipForm.title || !pipForm.reason) {
      toast.error('Employee, title, and reason are required');
      return;
    }

    try {
      const payload = {
        employeeId: pipForm.employeeId,
        title: pipForm.title,
        reason: pipForm.reason,
        startDate: pipForm.startDate || new Date(),
        endDate: pipForm.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        objectives: pipForm.objectiveDesc
          ? [{ description: pipForm.objectiveDesc, successCriteria: pipForm.successCriteria || 'Deliver satisfactory outcome', status: 'pending' }]
          : [],
      };

      const res = await pmsApi.createPip(payload);
      if (res.data?.success) {
        toast.success('PIP initiated successfully');
        setShowPipModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to create PIP');
    }
  };

  const handleCreateDevPlan = async (e) => {
    e.preventDefault();
    if (!devForm.skillOrCompetency) {
      toast.error('Skill or competency is required');
      return;
    }

    try {
      const payload = {
        employeeId: devForm.employeeId || null,
        objectives: [
          {
            skillOrCompetency: devForm.skillOrCompetency,
            activityType: devForm.activityType,
            description: devForm.description,
            resourceOrLink: devForm.resourceOrLink,
            targetDate: devForm.targetDate || null,
            status: 'in_progress',
          },
        ],
      };

      const res = await pmsApi.createDevPlan(payload);
      if (res.data?.success) {
        toast.success('Development plan created');
        setShowDevModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to create development plan');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 text-xs font-bold">
          <button
            onClick={() => setSubTab('pip')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
              subTab === 'pip' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileWarning size={13} />
            <span>Performance Improvement Plans (PIP)</span>
          </button>
          <button
            onClick={() => setSubTab('idp')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
              subTab === 'idp' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen size={13} />
            <span>Individual Development Plans (IDP)</span>
          </button>
        </div>

        {subTab === 'pip' ? (
          <button
            onClick={() => setShowPipModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition"
          >
            <Plus size={16} />
            <span>Initiate New PIP</span>
          </button>
        ) : (
          <button
            onClick={() => setShowDevModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            <span>Add Development Plan</span>
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
        </div>
      ) : subTab === 'pip' ? (
        pips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
            No active Performance Improvement Plans
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {pips.map((pip) => (
              <div key={pip._id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                      pip.status === 'active' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {pip.status}
                    </span>
                    <h4 className="mt-2 text-sm font-bold text-slate-900">{pip.title}</h4>
                    <div className="text-xs text-slate-500">
                      Employee: {pip.employeeId?.firstName} {pip.employeeId?.lastName} ({pip.employeeId?.department})
                    </div>
                  </div>
                </div>

                <p className="mt-2.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <strong className="text-slate-800">Reason:</strong> {pip.reason}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                  <div>Start: <strong>{new Date(pip.startDate).toLocaleDateString()}</strong></div>
                  <div>End: <strong>{new Date(pip.endDate).toLocaleDateString()}</strong></div>
                </div>

                {pip.objectives && pip.objectives.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Improvement Objectives</span>
                    {pip.objectives.map((obj, idx) => (
                      <div key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{obj.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : devPlans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
          No individual development plans found
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {devPlans.map((dp) => (
            <div key={dp._id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Development Plan for {dp.employeeId?.firstName} {dp.employeeId?.lastName}
                  </h4>
                  <span className="text-[10px] text-slate-400">{dp.employeeId?.department}</span>
                </div>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                  {dp.status}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {dp.objectives?.map((obj, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-900">{obj.skillOrCompetency}</span>
                      <span className="rounded-md bg-white px-2 py-0.5 text-[10px] border border-slate-200 text-slate-600">
                        {obj.activityType}
                      </span>
                    </div>
                    {obj.description && (
                      <p className="mt-1 text-xs text-slate-500">{obj.description}</p>
                    )}
                    {obj.resourceOrLink && (
                      <a
                        href={obj.resourceOrLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-block text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        Learning Resource Link →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PIP Modal */}
      {showPipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Initiate Performance Improvement Plan</h3>
              <button onClick={() => setShowPipModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePip} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Employee User ID *</label>
                <input
                  type="text"
                  required
                  placeholder="Target employee ID or email"
                  value={pipForm.employeeId}
                  onChange={(e) => setPipForm({ ...pipForm, employeeId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-rose-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Plan Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 30-Day Technical Delivery Improvement"
                  value={pipForm.title}
                  onChange={(e) => setPipForm({ ...pipForm, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Start Date</label>
                  <input
                    type="date"
                    value={pipForm.startDate}
                    onChange={(e) => setPipForm({ ...pipForm, startDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-rose-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">End Date</label>
                  <input
                    type="date"
                    value={pipForm.endDate}
                    onChange={(e) => setPipForm({ ...pipForm, endDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-rose-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Documented Reason *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Specific performance gaps observed..."
                  value={pipForm.reason}
                  onChange={(e) => setPipForm({ ...pipForm, reason: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-rose-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Measurable Success Criteria</label>
                <input
                  type="text"
                  placeholder="e.g. Complete sprint tasks with zero blocker bugs and 100% on-time"
                  value={pipForm.successCriteria}
                  onChange={(e) => setPipForm({ ...pipForm, successCriteria: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPipModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
                >
                  Activate PIP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IDP Modal */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Individual Development Plan</h3>
              <button onClick={() => setShowDevModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateDevPlan} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Skill or Competency Area *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. System Design, Cloud Architecture, Public Speaking"
                  value={devForm.skillOrCompetency}
                  onChange={(e) => setDevForm({ ...devForm, skillOrCompetency: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Activity Type</label>
                <select
                  value={devForm.activityType}
                  onChange={(e) => setDevForm({ ...devForm, activityType: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="Training / Course">Training / Course</option>
                  <option value="Mentorship / Shadowing">Mentorship / Shadowing</option>
                  <option value="Stretch Assignment">Stretch Assignment</option>
                  <option value="Certification">Certification</option>
                  <option value="Self Study">Self Study</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Resource / Course URL</label>
                <input
                  type="text"
                  placeholder="https://coursera.org/... or internal training module"
                  value={devForm.resourceOrLink}
                  onChange={(e) => setDevForm({ ...devForm, resourceOrLink: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDevModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
