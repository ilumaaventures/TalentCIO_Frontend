import React, { useState, useEffect } from 'react';
import { Compass, Plus, TrendingUp, DollarSign } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { growthService } from '../../services/api';

export const CampaignsPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', source: 'Google Ads', budget: '' });

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const res = await growthService.getCampaigns();
      if (res.success) setCampaigns(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await growthService.createCampaign({
        ...formData,
        budget: Number(formData.budget) || 0,
      });
      setIsModalOpen(false);
      setFormData({ name: '', source: 'Google Ads', budget: '' });
      fetchCampaigns();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Campaigns & Attribution</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track marketing campaign budgets, lead generation, and won revenue ROI.</p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
          New Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card padding="lg" className="text-center py-16 bg-slate-50/50 border-dashed">
          <Compass className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">No marketing campaigns configured</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Track lead acquisition, ad spend budgets, and closed-won attribution across Google, LinkedIn, and outbound campaigns.
          </p>
          <Button size="sm" icon={Plus} className="mt-4" onClick={() => setIsModalOpen(true)}>
            Create First Campaign
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((camp) => {
            const roi = camp.budget > 0 ? (((camp.revenueGenerated - camp.budget) / camp.budget) * 100).toFixed(1) : 0;

            return (
              <Card key={camp._id} padding="lg" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{camp.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Channel: {camp.source}</p>
                  </div>
                  <Badge variant={camp.status === 'Active' ? 'emerald' : 'neutral'} size="sm">
                    {camp.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 text-xs">
                  <div>
                    <p className="text-slate-400 font-medium">Budget</p>
                    <p className="font-bold text-slate-900 mt-0.5">₹{(camp.budget || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Leads</p>
                    <p className="font-bold text-indigo-600 mt-0.5">{camp.leadsGenerated || 0}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Revenue Won</p>
                    <p className="font-bold text-emerald-600 mt-0.5">₹{(camp.revenueGenerated || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 font-medium">ROI Return on Ad Spend:</span>
                  <span className="font-bold text-emerald-600">+{roi}%</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Campaign"
        subtitle="Track acquisition campaign metrics"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Save Campaign</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Campaign Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Q4 Google Search Expansion"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Source Channel"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="Google Ads / LinkedIn"
            />
            <Input
              label="Budget (₹)"
              type="number"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              placeholder="200000"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
