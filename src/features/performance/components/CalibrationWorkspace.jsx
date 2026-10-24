import React, { useEffect, useState } from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Send,
  Eye,
  X,
  FileCheck,
  Grid,
  List,
  Filter,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import pmsApi from '../api/pmsApi';

export default function CalibrationWorkspace() {
  const { user } = useAuth();
  const [appraisals, setAppraisals] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedBand, setSelectedBand] = useState('all');
  const [activeView, setActiveView] = useState('table'); // 'table' or 'nine_box'
  const [loading, setLoading] = useState(true);
  const [selectedAppraisal, setSelectedAppraisal] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Moderation form
  const [modData, setModData] = useState({
    calibratedScore: 3,
    calibratedRatingBand: 'Meets Expectations',
    reason: '',
  });

  useEffect(() => {
    loadCycles();
  }, []);

  useEffect(() => {
    if (selectedCycle) fetchAppraisals();
  }, [selectedCycle]);

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

  const fetchAppraisals = async () => {
    try {
      setLoading(true);
      const res = await pmsApi.getAppraisals({ cycleId: selectedCycle, scope: 'all' });
      if (res.data?.success) {
        const raw = res.data.data || [];
        setAppraisals(raw.filter((a) => a.employeeId && a.employeeId.isActive !== false));
      }
    } catch (err) {
      toast.error('Failed to load appraisals for calibration');
    } finally {
      setLoading(false);
    }
  };

  const handleCalibrate = async (e) => {
    e.preventDefault();
    if (!modData.reason || modData.reason.trim().length < 5) {
      toast.error('A documented calibration reason (min 5 characters) is required');
      return;
    }

    try {
      const res = await pmsApi.calibrate(selectedAppraisal._id, modData);
      if (res.data?.success) {
        toast.success('Appraisal score calibrated successfully');
        setShowModal(false);
        fetchAppraisals();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to calibrate score');
    }
  };

  const handleBulkPublish = async () => {
    if (!window.confirm('Publish all finalized & approved appraisals for this cycle? Employees will be notified.')) return;
    try {
      const res = await pmsApi.publishAppraisals({ cycleId: selectedCycle });
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchAppraisals();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish appraisals');
    }
  };

  // Distinct departments for filter
  const departments = Array.from(new Set(appraisals.map((a) => a.employeeId?.department).filter(Boolean)));

  // Filtered appraisals
  const filteredAppraisals = appraisals.filter((app) => {
    if (selectedDept !== 'all' && app.employeeId?.department !== selectedDept) return false;
    const band = app.calibration?.calibratedRatingBand || app.scores?.ratingBand;
    if (selectedBand !== 'all' && band !== selectedBand) return false;
    return true;
  });

  // 9-Box classification helper
  const getPerformanceTier = (score) => {
    if (score >= 4.5) return 'high';
    if (score >= 3.0) return 'med';
    return 'low';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 p-5 shadow-xs">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">Restricted Workspace</div>
          <h3 className="text-base font-bold text-slate-900">Performance Calibration & Rating Moderation</h3>
          <p className="mt-1 text-xs text-slate-500">
            Compare scores side-by-side across departments and normalize ratings before publishing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setActiveView('table')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeView === 'table' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List size={14} />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('nine_box')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeView === 'nine_box' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid size={14} />
              <span>9-Box Grid</span>
            </button>
          </div>

          {cycles.length > 0 && (
            <select
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-hidden"
            >
              {cycles.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleBulkPublish}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition"
          >
            <FileCheck size={16} />
            <span>Publish All Final Ratings</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <Filter size={14} />
          <span>Filters:</span>
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
        >
          <option value="all">All Departments ({departments.length})</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={selectedBand}
          onChange={(e) => setSelectedBand(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
        >
          <option value="all">All Rating Bands</option>
          <option value="Exceptional Performance">Exceptional Performance</option>
          <option value="Exceeds Expectations">Exceeds Expectations</option>
          <option value="Meets Expectations">Meets Expectations</option>
          <option value="Partially Meets Expectations">Partially Meets Expectations</option>
          <option value="Significantly Below Expectations">Significantly Below Expectations</option>
        </select>

        <span className="ml-auto text-xs font-bold text-slate-400">
          Showing {filteredAppraisals.length} of {appraisals.length} appraisals
        </span>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
        </div>
      ) : filteredAppraisals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
          No appraisal records matching filter criteria in this cycle
        </div>
      ) : activeView === 'nine_box' ? (
        /* ─── 9-BOX PERFORMANCE VS POTENTIAL GRID ───────────────────────── */
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Performance vs Potential Calibration Matrix</h3>
            <p className="text-xs text-slate-500">
              Evaluates talent distribution across performance and leadership potential axes. Note: Employees without potential ratings are grouped by calibrated performance tier.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            {/* Row 1: High Potential */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 min-h-[140px] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-800">
                <span>High Potential • Low Perf</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px]">Enigma</span>
              </div>
              <div className="space-y-1.5">
                {filteredAppraisals
                  .filter((a) => getPerformanceTier(a.calibration?.calibratedScore || a.scores?.calculatedFinalScore || 0) === 'low')
                  .map((a) => (
                    <div key={a._id} className="rounded-lg bg-white p-2 shadow-2xs border border-amber-100 text-[11px] font-medium text-slate-800">
                      {a.employeeId?.firstName} {a.employeeId?.lastName}
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 min-h-[140px] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-blue-800">
                <span>High Potential • Medium Perf</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px]">Growth</span>
              </div>
              <div className="space-y-1.5">
                {filteredAppraisals
                  .filter((a) => getPerformanceTier(a.calibration?.calibratedScore || a.scores?.calculatedFinalScore || 0) === 'med')
                  .slice(0, 4)
                  .map((a) => (
                    <div key={a._id} className="rounded-lg bg-white p-2 shadow-2xs border border-blue-100 text-[11px] font-medium text-slate-800">
                      {a.employeeId?.firstName} {a.employeeId?.lastName}
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 min-h-[140px] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                <span>★ High Potential • High Perf</span>
                <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-extrabold">Star Talent</span>
              </div>
              <div className="space-y-1.5">
                {filteredAppraisals
                  .filter((a) => getPerformanceTier(a.calibration?.calibratedScore || a.scores?.calculatedFinalScore || 0) === 'high')
                  .map((a) => (
                    <div key={a._id} className="rounded-lg bg-white p-2 shadow-2xs border border-emerald-200 text-[11px] font-bold text-emerald-900">
                      {a.employeeId?.firstName} {a.employeeId?.lastName} ({a.calibration?.calibratedScore || a.scores?.calculatedFinalScore || 0}/5)
                    </div>
                  ))}
              </div>
            </div>

            {/* Row 2: Medium Potential */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 min-h-[120px] space-y-2">
              <div className="text-[11px] font-bold text-slate-700">Med Potential • Low Perf</div>
              <p className="text-[10px] text-slate-400">Needs development focus</p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4 min-h-[120px] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-blue-700">
                <span>Core Performer</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px]">Solid</span>
              </div>
              <p className="text-[10px] text-slate-500">Reliable contributors meeting role goals</p>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 min-h-[120px] space-y-2">
              <div className="text-[11px] font-bold text-emerald-800">High Performer</div>
              <p className="text-[10px] text-slate-500">Strong individual delivery</p>
            </div>

            {/* Row 3: Low Potential */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 min-h-[120px] space-y-2">
              <div className="text-[11px] font-bold text-rose-800">Underperforming Risk</div>
              <p className="text-[10px] text-slate-400">Consider PIP / Support</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 min-h-[120px] space-y-2">
              <div className="text-[11px] font-bold text-slate-700">Effective Specialist</div>
              <p className="text-[10px] text-slate-400">Solid steady-state delivery</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-100/50 p-4 min-h-[120px] space-y-2">
              <div className="text-[11px] font-bold text-slate-800">Trusted Professional</div>
              <p className="text-[10px] text-slate-400">Deep domain subject-matter expert</p>
            </div>
          </div>
        </div>
      ) : (
        /* ─── CALIBRATION COMPARISON TABLE ────────────────────────────────── */
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5">Reporting Manager</th>
                  <th className="px-4 py-3.5 text-right">Raw Mgr Rating</th>
                  <th className="px-4 py-3.5 text-right">Calibrated Score</th>
                  <th className="px-4 py-3.5">Rating Band</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredAppraisals.map((app) => {
                  const rawScore = app.scores?.calculatedFinalScore || 0;
                  const finalScore = app.calibration?.calibratedScore ?? rawScore;
                  const isAdjusted = app.calibration?.isAdjusted;
                  const isSelf = String(app.employeeId?._id || app.employeeId) === String(user?._id);

                  return (
                    <tr key={app._id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">
                          {app.employeeId?.firstName} {app.employeeId?.lastName}
                        </div>
                        <div className="text-[10px] text-slate-400">{app.employeeId?.employeeCode || '—'}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{app.employeeId?.department || '—'}</td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {app.managerId?.firstName} {app.managerId?.lastName}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-600">
                        {rawScore ? `${rawScore} / 5.0` : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold">
                        <span className={isAdjusted ? 'text-indigo-600' : 'text-slate-900'}>
                          {finalScore} / 5.0
                        </span>
                        {isAdjusted && (
                          <span className="block text-[10px] font-bold text-indigo-500">★ Adjusted</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        {app.calibration?.calibratedRatingBand || app.scores?.ratingBand || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          app.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {app.isPublished ? 'Published' : app.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {isSelf ? (
                          <span
                            title="Separation of duties: You cannot calibrate your own appraisal"
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-400 cursor-not-allowed"
                          >
                            <ShieldAlert size={12} />
                            <span>Self</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedAppraisal(app);
                              setModData({
                                calibratedScore: finalScore || 3,
                                calibratedRatingBand: app.calibration?.calibratedRatingBand || app.scores?.ratingBand || 'Meets Expectations',
                                reason: app.calibration?.reason || '',
                              });
                              setShowModal(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                          >
                            <Sliders size={13} />
                            <span>Moderate</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Moderation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Moderate & Calibrate Rating</h3>
                <div className="text-xs text-slate-500">
                  {selectedAppraisal?.employeeId?.firstName} {selectedAppraisal?.employeeId?.lastName}
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCalibrate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Calibrated Final Score (1.0 to 5.0) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  required
                  value={modData.calibratedScore}
                  onChange={(e) => setModData({ ...modData, calibratedScore: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Rating Band</label>
                <select
                  value={modData.calibratedRatingBand}
                  onChange={(e) => setModData({ ...modData, calibratedRatingBand: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="Exceptional Performance">Exceptional Performance</option>
                  <option value="Exceeds Expectations">Exceeds Expectations</option>
                  <option value="Meets Expectations">Meets Expectations</option>
                  <option value="Partially Meets Expectations">Partially Meets Expectations</option>
                  <option value="Significantly Below Expectations">Significantly Below Expectations</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Calibration Justification & Audit Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={modData.reason}
                  onChange={(e) => setModData({ ...modData, reason: e.target.value })}
                  placeholder="Document specific business rationale for adjusting the rating..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
                >
                  Save Calibrated Rating
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
