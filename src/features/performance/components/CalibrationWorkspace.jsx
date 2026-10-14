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
} from 'lucide-react';
import toast from 'react-hot-toast';
import pmsApi from '../api/pmsApi';

export default function CalibrationWorkspace() {
  const [appraisals, setAppraisals] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
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
    if (!window.confirm('Publish all calibrated appraisals for this cycle? Employees will be notified.')) return;
    try {
      const res = await pmsApi.publishAppraisals({ cycleId: selectedCycle });
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchAppraisals();
      }
    } catch (err) {
      toast.error('Failed to publish appraisals');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Publish CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 p-5 shadow-xs">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">Restricted Workspace</div>
          <h3 className="text-base font-bold text-slate-900">Performance Calibration & Rating Moderation</h3>
          <p className="mt-1 text-xs text-slate-500">
            Compare scores side-by-side across departments and normalize ratings before publishing.
          </p>
        </div>

        <div className="flex items-center gap-3">
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

      {/* Calibration Comparison Table */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
        </div>
      ) : appraisals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
          No appraisal records ready for calibration in this cycle
        </div>
      ) : (
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
                {appraisals.map((app) => {
                  const rawScore = app.scores?.calculatedFinalScore || 0;
                  const finalScore = app.calibration?.calibratedScore ?? rawScore;
                  const isAdjusted = app.calibration?.isAdjusted;

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
                        {app.scores?.ratingBand || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          app.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {app.isPublished ? 'Published' : app.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedAppraisal(app);
                            setModData({
                              calibratedScore: finalScore || 3,
                              calibratedRatingBand: app.scores?.ratingBand || 'Meets Expectations',
                              reason: app.calibration?.reason || '',
                            });
                            setShowModal(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
                        >
                          <Sliders size={13} />
                          <span>Moderate</span>
                        </button>
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
