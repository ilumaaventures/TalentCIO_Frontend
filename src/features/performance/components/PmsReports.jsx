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
  Search,
  Clock,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import pmsApi from '../api/pmsApi';

const REPORT_TABS = [
  { id: 'cycle-completion', label: 'Cycle Completion', icon: CheckCircle2, desc: 'Enrolled employees, stages, overdue flags & sign-off dates' },
  { id: 'employee-performance', label: 'Employee Performance', icon: Award, desc: 'Self, manager, calibrated & final scores with rating bands' },
  { id: 'department-summary', label: 'Department Summary', icon: Users, desc: 'Completion rates & average performance benchmarked by team' },
  { id: 'kpi-achievement', label: 'KRA & KPI Achievement', icon: TrendingUp, desc: 'Target vs verified actuals with percentage achievement' },
  { id: 'rating-distribution', label: 'Rating Distribution', icon: BarChart3, desc: 'Bell-curve distribution across grades and score brackets' },
  { id: 'pending-reviews', label: 'Pending & Overdue', icon: Clock, desc: 'Outstanding reviews, responsible roles & bottleneck tracking' },
  { id: 'acknowledgment-dispute', label: 'Acknowledgments & Disputes', icon: AlertTriangle, desc: 'Published sign-offs, employee feedback & dispute audit' },
  { id: 'historical-comparison', label: 'Multi-Cycle Comparison', icon: Calendar, desc: 'Historical employee score trajectory across completed cycles' },
];

export default function PmsReports({ onNavigateTab }) {
  const [activeReport, setActiveReport] = useState('cycle-completion');
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadCycles();
  }, []);

  useEffect(() => {
    fetchReportData(activeReport, selectedCycle, searchQuery, currentPage);
  }, [activeReport, selectedCycle, currentPage]);

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

  const fetchReportData = async (reportType, cycleId, search, page) => {
    try {
      setLoading(true);
      const params = { page, limit: 25 };
      if (cycleId) params.cycleId = cycleId;
      if (search) params.search = search;

      const res = await pmsApi.getReportData(reportType, params);
      if (res.data?.success) {
        setReportData(res.data.data);
      }
    } catch (err) {
      console.error('[Fetch Report Error]:', err);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchReportData(activeReport, selectedCycle, searchQuery, 1);
  };

  const handleDownload = (format) => {
    try {
      const params = {};
      if (selectedCycle) params.cycleId = selectedCycle;
      if (searchQuery) params.search = searchQuery;

      const url = pmsApi.getReportExportUrl(activeReport, format, params);
      window.open(url, '_blank');
      toast.success(`Exporting ${activeReport} report as .${format}...`);
    } catch (err) {
      toast.error('Failed to export report');
    }
  };

  const headers = reportData?.headers || [];
  const records = reportData?.records || [];
  const totalRecords = reportData?.totalRecords || 0;
  const totalPages = reportData?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* ─── Top Control Header & Actions ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Performance Reports & Organizational Exports</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Generate audited reports, calculate completion benchmarks, and export sanitized datasets to Excel or CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Cycle Selector */}
          {cycles.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Cycle:</span>
              <select
                value={selectedCycle}
                onChange={(e) => {
                  setSelectedCycle(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">All Review Cycles</option>
                {cycles.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload('csv')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              title="Export as CSV with formula-injection sanitization"
            >
              <Download size={14} className="text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => handleDownload('xlsx')}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
              title="Export formatted workbook with formula-injection sanitization"
            >
              <FileSpreadsheet size={15} />
              <span>Export Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 8 Standard Report Selector Tabs ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveReport(tab.id);
                setCurrentPage(1);
              }}
              className={`flex flex-col items-center rounded-2xl border p-3 text-center transition-all ${
                isActive
                  ? 'border-blue-500 bg-blue-50/80 text-blue-700 shadow-xs'
                  : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl mb-1.5 ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Icon size={16} />
              </div>
              <span className="text-[11px] font-bold line-clamp-2 leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Live Table Data Preview ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {/* Table Header Filter & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{reportData?.reportTitle || 'Report Preview'}</h3>
            <p className="text-xs text-slate-500">
              Showing {records.length} of {totalRecords} records
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search report records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-3 py-1.5 text-xs focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900 transition"
            >
              Filter
            </button>
          </form>
        </div>

        {/* Records Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                <FileText size={22} />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No records found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                No data matched the selected cycle or search filter. Try clearing the filter or choosing another cycle.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  {headers.map((h) => (
                    <th key={h.key} className="px-4 py-3 whitespace-nowrap">
                      {h.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {records.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition">
                    {headers.map((h) => {
                      const val = row[h.key];
                      const isOverdueCol = h.key === 'isOverdue';
                      const isStatusCol = h.key === 'status';

                      return (
                        <td key={h.key} className="px-4 py-3 whitespace-nowrap">
                          {isOverdueCol && String(val).includes('Overdue') ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                              <AlertTriangle size={11} />
                              {val}
                            </span>
                          ) : isStatusCol ? (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 capitalize">
                              {val}
                            </span>
                          ) : (
                            <span className="font-medium text-slate-800">{String(val ?? '—')}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs">
            <span className="text-slate-500">
              Page {currentPage} of {totalPages} ({totalRecords} items)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={13} />
                <span>Prev</span>
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
