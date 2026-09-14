import React, { useState, useEffect } from 'react';
import { Target, Plus, CheckCircle2, Award } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { forecastService } from '../../services/api';

export const TargetsPage = () => {
  const [targets, setTargets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', targetValue: '', period: 'quarterly', targetType: 'revenue' });

  const fetchTargets = async () => {
    setIsLoading(true);
    try {
      const res = await forecastService.getTargets();
      if (res.success) setTargets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await forecastService.createTarget({
        ...formData,
        targetValue: Number(formData.targetValue) || 1000000,
        year: new Date().getFullYear(),
      });
      setIsModalOpen(false);
      setFormData({ title: '', targetValue: '', period: 'quarterly', targetType: 'revenue' });
      fetchTargets();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sales Targets & Quotas</h1>
          <p className="text-xs text-slate-500 mt-0.5">Define and monitor sales representative & team revenue quotas.</p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Set Quota
        </Button>
      </div>

      {targets.length === 0 ? (
        <Card padding="lg" className="text-center py-16 bg-slate-50/50 border-dashed">
          <Target className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">No sales quotas configured</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Set quarterly or annual targets for reps or teams to track quota pacing and achievement.
          </p>
          <Button size="sm" icon={Plus} className="mt-4" onClick={() => setIsModalOpen(true)}>
            Set First Quota
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {targets.map((target) => {
            const pct = target.targetValue > 0 ? Math.round((target.currentValue / target.targetValue) * 100) : 0;

            return (
              <Card key={target._id} padding="lg" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{target.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {target.period} • Rep: {target.userId?.name || 'Team'}
                    </p>
                  </div>
                  <Badge variant="indigo" size="sm">{pct}% Achieved</Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">
                      Achieved: ₹{(target.currentValue || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-slate-900 font-bold">
                      Quota: ₹{(target.targetValue || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Set Sales Quota"
        subtitle="Assign revenue target for rep or team"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Save Quota</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Quota Title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Q4 Revenue Quota - Arjun"
          />
          <Input
            label="Target Value (₹)"
            type="number"
            required
            value={formData.targetValue}
            onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
            placeholder="2500000"
          />
          <Select
            label="Period"
            value={formData.period}
            onChange={(e) => setFormData({ ...formData, period: e.target.value })}
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'yearly', label: 'Yearly' },
            ]}
          />
        </form>
      </Modal>
    </div>
  );
};
