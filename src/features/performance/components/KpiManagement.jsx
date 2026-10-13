import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Plus,
  FileText,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  X,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import pmsApi from '../api/pmsApi';

export default function KpiManagement() {
  const [kpis, setKpis] = useState([]);
  const [kras, setKras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [search, setSearch] = useState('');

  // Form State for KPI
  const [formData, setFormData] = useState({
    kraId: '',
    name: '',
    description: '',
    scope: 'individual',
    measurementUnit: 'percentage',
    measurementDirection: 'higher_is_better',
    baselineValue: 0,
    targetValue: 100,
    actualValue: 0,
    weightage: 20,
    measurementFrequency: 'quarterly',
  });

  // Evidence Form State
  const [evidenceData, setEvidenceData] = useState({
    actualValue: '',
    fileUrl: '',
    fileName: '',
    comment: '',
  });

  useEffect(() => {
    fetchData();
  }, [search]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [kpiRes, kraRes] = await Promise.all([
        pmsApi.getKpis({ search }),
        pmsApi.getKras(),
      ]);
      if (kpiRes.data?.success) setKpis(kpiRes.data.data);
      if (kraRes.data?.success) setKras(kraRes.data.data);
    } catch (err) {
      toast.error('Failed to load KPIs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.kraId || !formData.name || formData.targetValue === undefined) {
      toast.error('KRA, KPI Name, and Target are required');
      return;
    }
    try {
      const res = await pmsApi.createKpi(formData);
      if (res.data?.success) {
        toast.success('KPI created successfully');
        setShowModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create KPI');
    }
  };

  const handleSubmitEvidence = async (e) => {
    e.preventDefault();
    try {
      const res = await pmsApi.submitKpiEvidence(selectedKpi._id, evidenceData);
      if (res.data?.success) {
        toast.success('Evidence and actual value submitted');
        setShowEvidenceModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to submit evidence');
    }
  };

  const handleVerify = async (kpiId, status) => {
    try {
      const res = await pmsApi.verifyKpi(kpiId, { status, verificationComment: 'Verified by reviewer' });
      if (res.data?.success) {
        toast.success(`KPI marked as ${status}`);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to verify KPI');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search KPIs by title..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <button
          onClick={() => {
            setFormData({
              kraId: kras[0]?._id || '',
              name: '',
              description: '',
              scope: 'individual',
              measurementUnit: 'percentage',
              measurementDirection: 'higher_is_better',
              baselineValue: 0,
              targetValue: 100,
              actualValue: 0,
              weightage: 20,
              measurementFrequency: 'quarterly',
            });
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          <span>New KPI Indicator</span>
        </button>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
        </div>
      ) : kpis.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <TrendingUp size={36} className="mx-auto text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-700">No Key Performance Indicators</h3>
          <p className="mt-1 text-xs text-slate-400">Add measurable KPIs linked to strategic KRAs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi) => {
            const achievement = kpi.achievementPercentage || 0;
            const isCompleted = achievement >= 100;

            return (
              <div key={kpi._id} className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                      {kpi.kraId?.name || 'General KRA'}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                      kpi.status === 'verified'
                        ? 'bg-emerald-50 text-emerald-700'
                        : kpi.status === 'submitted'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {kpi.status}
                    </span>
                  </div>

                  <h4 className="mt-2.5 text-sm font-bold text-slate-900">{kpi.name}</h4>
                  {kpi.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{kpi.description}</p>
                  )}

                  {/* Target vs Actual Progress */}
                  <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Actual: <strong className="text-slate-900">{kpi.actualValue}</strong></span>
                      <span className="text-slate-500">Target: <strong className="text-slate-900">{kpi.targetValue} {kpi.measurementUnit}</strong></span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Achievement</span>
                      <span className={`font-extrabold ${isCompleted ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {achievement}% ({kpi.calculatedScore} / 5.0)
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-blue-600'}`}
                        style={{ width: `${Math.min(100, achievement)}%` }}
                      />
                    </div>
                  </div>

                  {kpi.evidence && kpi.evidence.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <FileText size={12} className="text-slate-400" />
                      <span>{kpi.evidence.length} evidence attachment(s)</span>
                    </div>
                  )}
                </div>

                {/* Footer Action buttons */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <button
                    onClick={() => {
                      setSelectedKpi(kpi);
                      setEvidenceData({ actualValue: kpi.actualValue, fileUrl: '', fileName: '', comment: '' });
                      setShowEvidenceModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    <UploadCloud size={13} />
                    <span>Submit Proof</span>
                  </button>

                  {kpi.status === 'submitted' && (
                    <button
                      onClick={() => handleVerify(kpi._id, 'verified')}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      <ShieldCheck size={13} />
                      <span>Verify</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create KPI Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Key Performance Indicator (KPI)</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Linked KRA *</label>
                <select
                  required
                  value={formData.kraId}
                  onChange={(e) => setFormData({ ...formData, kraId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">Select KRA</option>
                  {kras.map((kra) => (
                    <option key={kra._id} value={kra._id}>{kra.name} ({kra.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">KPI Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sprint Delivery Velocity & Story Completion"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Measurement Unit</label>
                  <select
                    value={formData.measurementUnit}
                    onChange={(e) => setFormData({ ...formData, measurementUnit: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="number">Numeric count</option>
                    <option value="currency">Currency (INR/USD)</option>
                    <option value="hours">Hours</option>
                    <option value="score">Score</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Direction Rule</label>
                  <select
                    value={formData.measurementDirection}
                    onChange={(e) => setFormData({ ...formData, measurementDirection: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="higher_is_better">Higher is Better (e.g. Revenue, Quality)</option>
                    <option value="lower_is_better">Lower is Better (e.g. Defects, Escalations)</option>
                    <option value="target_range">Acceptable Range</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Baseline</label>
                  <input
                    type="number"
                    value={formData.baselineValue}
                    onChange={(e) => setFormData({ ...formData, baselineValue: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Target *</label>
                  <input
                    type="number"
                    required
                    value={formData.targetValue}
                    onChange={(e) => setFormData({ ...formData, targetValue: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Actual Value</label>
                  <input
                    type="number"
                    value={formData.actualValue}
                    onChange={(e) => setFormData({ ...formData, actualValue: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
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
                  Create KPI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evidence Submission Modal */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Submit Evidence for KPI</h3>
              <button onClick={() => setShowEvidenceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitEvidence} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Actual Value Achieved *</label>
                <input
                  type="number"
                  required
                  value={evidenceData.actualValue}
                  onChange={(e) => setEvidenceData({ ...formData, actualValue: e.target.value })}
                  placeholder={`Target is ${selectedKpi?.targetValue}`}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Document URL or Proof Link</label>
                <input
                  type="url"
                  value={evidenceData.fileUrl}
                  onChange={(e) => setEvidenceData({ ...evidenceData, fileUrl: e.target.value })}
                  placeholder="https://drive.google.com/... or document URL"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Comments / Explanation</label>
                <textarea
                  rows={2}
                  value={evidenceData.comment}
                  onChange={(e) => setEvidenceData({ ...evidenceData, comment: e.target.value })}
                  placeholder="Details of achievement..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                >
                  Submit for Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
