import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  BarChart3,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Award,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import pmsApi from '../api/pmsApi';

export default function PmsReports() {
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCycles();
  }, []);

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

  const handleDownloadExcel = () => {
    try {
      const url = pmsApi.exportAppraisalsUrl(selectedCycle);
      window.open(url, '_blank');
      toast.success('Downloading PMS Appraisal Report...');
    } catch (err) {
      toast.error('Failed to download report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900">Performance Reports & Data Exports</h3>
          <p className="mt-1 text-xs text-slate-500">
            Export comprehensive appraisal summaries, rating distributions, and calibration audit logs to Excel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {cycles.length > 0 && (
            <select
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-hidden"
            >
              {cycles.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <FileSpreadsheet size={16} />
            <span>Export to Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Available Standard Reports Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3">
            <Award size={20} />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Appraisal Summary Report</h4>
          <p className="mt-1 text-xs text-slate-500">
            All enrolled employees, self scores, manager ratings, calibrated ratings, and sign-off status.
          </p>
          <button
            onClick={handleDownloadExcel}
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
          >
            <Download size={13} />
            <span>Download Dataset</span>
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-3">
            <TrendingUp size={20} />
          </div>
          <h4 className="text-sm font-bold text-slate-900">KRA & KPI Achievement Audit</h4>
          <p className="mt-1 text-xs text-slate-500">
            Target vs actual values, calculated percentage achievement, and submitted verification evidence.
          </p>
          <button
            onClick={handleDownloadExcel}
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            <Download size={13} />
            <span>Download Dataset</span>
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-3">
            <BarChart3 size={20} />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Bell Curve Calibration Audit</h4>
          <p className="mt-1 text-xs text-slate-500">
            Before-and-after scores, documented moderation reasons, and timestamped reviewer audit trail.
          </p>
          <button
            onClick={handleDownloadExcel}
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-800"
          >
            <Download size={13} />
            <span>Download Dataset</span>
          </button>
        </div>
      </div>
    </div>
  );
}
