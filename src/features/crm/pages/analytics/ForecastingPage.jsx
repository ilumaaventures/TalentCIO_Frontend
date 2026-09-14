import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, DollarSign, Award, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { forecastService } from '../../services/api';

export const ForecastingPage = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      setIsLoading(true);
      try {
        const res = await forecastService.getForecastSummary();
        if (res.success) setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchForecast();
  }, []);

  const categories = data?.categories || {};
  const metrics = data?.metrics || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Sales Forecasting</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Commit, Best Case, Pipeline, and Closed category projections vs annual quotas.
        </p>
      </div>

      {/* Top High-level Rollup KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Target"
          value={`₹${((metrics.totalTarget || 0) / 100000).toFixed(1)} L`}
          icon={Target}
          iconColor="text-indigo-600 bg-indigo-50"
          description="Annual Quota Target"
        />
        <StatCard
          title="Closed Won"
          value={`₹${((metrics.totalWon || 0) / 100000).toFixed(1)} L`}
          icon={CheckCircle2}
          iconColor="text-emerald-600 bg-emerald-50"
          description={`${metrics.achievementPercent || 0}% of Quota`}
        />
        <StatCard
          title="Weighted Forecast"
          value={`₹${((metrics.totalWeightedForecast || 0) / 100000).toFixed(1)} L`}
          icon={TrendingUp}
          iconColor="text-purple-600 bg-purple-50"
          description="Commit + Best Case Projections"
        />
        <StatCard
          title="Total Pipeline"
          value={`₹${(((categories['Pipeline']?.value || 0) + (categories['Commit']?.value || 0) + (categories['Best Case']?.value || 0)) / 100000).toFixed(1)} L`}
          icon={DollarSign}
          iconColor="text-amber-600 bg-amber-50"
          description="All Active Stages"
        />
      </div>

      {/* Forecast Categories Breakdown */}
      <Card padding="lg">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Forecast Category Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['Closed', 'Commit', 'Best Case', 'Pipeline'].map((catKey) => {
            const cat = categories[catKey] || { count: 0, value: 0 };
            const colors = {
              Closed: 'border-emerald-200 bg-emerald-50/40 text-emerald-900',
              Commit: 'border-indigo-200 bg-indigo-50/40 text-indigo-900',
              'Best Case': 'border-purple-200 bg-purple-50/40 text-purple-900',
              Pipeline: 'border-slate-200 bg-slate-50/40 text-slate-900',
            };

            return (
              <div key={catKey} className={`p-4 rounded-xl border ${colors[catKey]} space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">{catKey}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200/80">
                    {cat.count} deals
                  </span>
                </div>
                <p className="text-xl font-bold">
                  ₹{((cat.value || 0) / 100000).toFixed(2)} Lakhs
                </p>
                <p className="text-[11px] opacity-80">
                  {catKey === 'Closed' && '100% Guaranteed Won Revenue'}
                  {catKey === 'Commit' && '80%+ High Probability Close'}
                  {catKey === 'Best Case' && 'Upside potential with active demo'}
                  {catKey === 'Pipeline' && 'Early stage qualification & discovery'}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
