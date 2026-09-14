import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Filter, TrendingUp, Users, Briefcase, FileSpreadsheet } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { analyticsService } from '../../services/api';

export const ReportsPage = () => {
  const [selectedReport, setSelectedReport] = useState('conversion');
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await analyticsService.getDashboard({ range: 'year' });
        if (res.success) {
          setDashboardData(res.data);
        }
      } catch (err) {
        console.error('Error fetching reports data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const sources = dashboardData?.sourceDistribution || [];
  const funnel = dashboardData?.funnel || [];
  const kpis = dashboardData?.kpis || {};

  const conversionMetrics = sources.map((s) => ({
    label: s.source,
    total: s.count,
    converted: 0,
    rate: '0%',
    revenue: '₹0',
  }));

  const velocityMetrics = funnel.map((f) => ({
    label: f.stage,
    total: `${f.count} in stage`,
    converted: f.count > 0 ? 'Active' : 'No deals',
    rate: f.conversionRate,
    revenue: '—',
  }));

  const reportList = [
    {
      id: 'conversion',
      title: 'Lead Conversion by Source',
      description: 'Breakdown of lead capture channels and attribution conversion rates.',
      metrics: conversionMetrics,
    },
    {
      id: 'velocity',
      title: 'Sales Pipeline Velocity & Funnel Stages',
      description: 'Volume and conversion efficiency across active pipeline stages.',
      metrics: velocityMetrics,
    },
  ];

  const activeReportData = reportList.find((r) => r.id === selectedReport) || reportList[0];
  const hasData = activeReportData.metrics.length > 0 && activeReportData.metrics.some((m) => m.total > 0 || (typeof m.total === 'string' && !m.total.startsWith('0 ')));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sales Reports & Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">Live analytical breakdowns of sales cycle and attribution.</p>
        </div>
        <Button size="sm" variant="outline" icon={Download} disabled={!hasData}>
          Export Report
        </Button>
      </div>

      {/* Report Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {reportList.map((rep) => (
          <button
            key={rep.id}
            onClick={() => setSelectedReport(rep.id)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
              selectedReport === rep.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {rep.title}
          </button>
        ))}
      </div>

      {/* Report Data Card */}
      <Card padding="lg" className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{activeReportData.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{activeReportData.description}</p>
        </div>

        {!hasData ? (
          <div className="text-center py-16 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-700">No report data available</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Create leads and advance opportunities through pipeline stages to generate dynamic reports.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Dimension / Segment</th>
                  <th className="py-3 px-4">Volume / Count</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Conversion Rate</th>
                  <th className="py-3 px-4 text-right">Revenue Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeReportData.metrics.map((m, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-900">{m.label}</td>
                    <td className="py-3 px-4 text-slate-600">{m.total}</td>
                    <td className="py-3 px-4 text-slate-600">{m.converted}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-indigo-600">{m.rate}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-right">{m.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

