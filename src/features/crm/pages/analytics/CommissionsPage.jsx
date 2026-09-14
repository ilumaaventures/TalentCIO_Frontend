import React, { useState, useEffect } from 'react';
import { DollarSign, Award, CheckCircle2, Clock } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { forecastService } from '../../services/api';

export const CommissionsPage = () => {
  const [data, setData] = useState({ records: [], rules: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCommissions = async () => {
      setIsLoading(true);
      try {
        const res = await forecastService.getCommissions();
        if (res.success) setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommissions();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Sales Commission & Incentives</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Internal rep performance compensation and deal-based incentive approvals.
        </p>
      </div>

      {/* Rules Overview */}
      <Card padding="lg">
        <h3 className="text-sm font-bold text-slate-900 mb-2">Active Commission Structure</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="font-bold text-slate-900">Base Deal Commission</p>
            <p className="text-slate-500 mt-1">5.0% flat payout on all verified closed-won opportunities.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="font-bold text-slate-900">Tiered Over-Achievement Bonus</p>
            <p className="text-slate-500 mt-1">+2.5% accelerated payout on all deals closed beyond 100% quota.</p>
          </div>
        </div>
      </Card>

      {/* Won Commission Ledger */}
      <Card padding="lg">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Commission Payout Ledger</h3>
        <div className="divide-y divide-slate-100">
          {(data.records || []).length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No commission records generated yet.</p>
          ) : (
            data.records.map((rec) => (
              <div key={rec._id} className="py-3 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{rec.dealTitle}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Rep: <span className="font-semibold text-slate-700">{rec.userId?.name || 'Sales Rep'}</span> • Deal Value: ₹{(rec.dealValue || 0).toLocaleString('en-IN')} @ {rec.commissionRate}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-600">
                    +₹{(rec.commissionAmount || 0).toLocaleString('en-IN')}
                  </p>
                  <Badge variant={rec.status === 'Approved' ? 'emerald' : 'amber'} size="sm">
                    {rec.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
