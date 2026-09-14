import React, { useState, useEffect } from 'react';
import { Activity as ActivityIcon, Phone, Mail, MessageSquare, Clock, Plus, Filter } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { activitiesService } from '../../services/api';

export const ActivitiesPage = () => {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ type: 'call', subject: '', description: '', outcome: 'Completed' });

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const res = await activitiesService.getActivities({ type: typeFilter });
      if (res.success) setActivities(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [typeFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await activitiesService.logActivity(formData);
      setIsModalOpen(false);
      setFormData({ type: 'call', subject: '', description: '', outcome: 'Completed' });
      fetchActivities();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Activity Timeline</h1>
          <p className="text-xs text-slate-500 mt-0.5">Chronological sales engagement feed across all client records.</p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Log Activity
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-48"
          options={[
            { value: 'all', label: 'All Activities' },
            { value: 'call', label: 'Calls' },
            { value: 'meeting', label: 'Meetings' },
            { value: 'email', label: 'Emails' },
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'stage_change', label: 'Stage Moves' },
          ]}
        />
      </div>

      <Card padding="lg">
        <div className="divide-y divide-slate-100">
          {activities.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No activities recorded.</p>
          ) : (
            activities.map((act) => (
              <div key={act._id} className="py-3.5 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-600 mt-0.5">
                  {act.type === 'call' ? <Phone className="w-4 h-4" /> : act.type === 'email' ? <Mail className="w-4 h-4" /> : act.type === 'whatsapp' ? <MessageSquare className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{act.subject}</h4>
                    {act.outcome && <Badge variant="neutral" size="sm">{act.outcome}</Badge>}
                  </div>
                  {act.description && <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{act.description}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(act.performedAt).toLocaleString()} • Performed by <span className="font-semibold text-slate-700">{act.performedByName || 'Rep'}</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Activity"
        subtitle="Record touchpoint or note"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Save Activity</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              options={[
                { value: 'call', label: 'Call' },
                { value: 'meeting', label: 'Meeting' },
                { value: 'email', label: 'Email' },
                { value: 'whatsapp', label: 'WhatsApp' },
                { value: 'note', label: 'Note' },
              ]}
            />
            <Select
              label="Outcome"
              value={formData.outcome}
              onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
              options={[
                { value: 'Completed', label: 'Completed' },
                { value: 'Connected', label: 'Connected' },
                { value: 'Sent', label: 'Sent' },
              ]}
            />
          </div>
          <Input
            label="Subject"
            required
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="e.g. Discussed product capabilities"
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
