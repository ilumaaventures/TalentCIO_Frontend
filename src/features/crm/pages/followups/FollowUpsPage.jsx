import React, { useState, useEffect } from 'react';
import { Clock, Plus, CheckCircle2, Calendar, Phone, MessageSquare, Mail, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { followUpsService } from '../../services/api';

export const FollowUpsPage = () => {
  const [view, setView] = useState('today');
  const [followUps, setFollowUps] = useState([]);
  const [counts, setCounts] = useState({ today: 0, tomorrow: 0, overdue: 0, upcoming: 0, completed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', scheduledDate: '', type: 'call', priority: 'Medium' });

  const fetchFollowUps = async () => {
    setIsLoading(true);
    try {
      const res = await followUpsService.getFollowUps({ view });
      if (res.success) {
        setFollowUps(res.data);
        if (res.counts) setCounts(res.counts);
      }
    } catch (err) {
      console.error('Error fetching follow-ups', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, [view]);

  const handleComplete = async (id) => {
    try {
      await followUpsService.completeFollowUp(id, { outcomeNotes: 'Completed successfully' });
      fetchFollowUps();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await followUpsService.createFollowUp(formData);
      setIsCreateOpen(false);
      setFormData({ title: '', scheduledDate: '', type: 'call', priority: 'Medium' });
      fetchFollowUps();
    } catch (err) {
      alert(err.message);
    }
  };

  const tabs = [
    { id: 'today', label: 'Today', count: counts.today },
    { id: 'tomorrow', label: 'Tomorrow', count: counts.tomorrow },
    { id: 'overdue', label: 'Overdue', count: counts.overdue },
    { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
    { id: 'completed', label: 'Completed', count: counts.completed },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Follow-up Command Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Never miss a prospect touchpoint. Scheduled calls, emails, and meetings.
          </p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setIsCreateOpen(true)}>
          Schedule Follow-up
        </Button>
      </div>

      <Tabs tabs={tabs} activeTab={view} onChange={setView} />

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading follow-ups...</div>
      ) : followUps.length === 0 ? (
        <Card padding="lg" className="text-center py-12">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">No follow-ups in this queue</h3>
          <p className="text-xs text-slate-400 mt-1">Great job! All scheduled touchpoints are cleared.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {followUps.map((f) => (
            <div
              key={f._id}
              className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 mt-0.5">
                  {f.type === 'call' ? <Phone className="w-4 h-4" /> : f.type === 'whatsapp' ? <MessageSquare className="w-4 h-4" /> : f.type === 'email' ? <Mail className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{f.title}</h4>
                    <Badge variant={f.priority === 'Urgent' || f.priority === 'High' ? 'rose' : 'blue'} size="sm">
                      {f.priority || 'Medium'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Scheduled: <span className="font-semibold text-slate-700">{new Date(f.scheduledDate).toLocaleString()}</span>
                    {f.leadId && ` • Lead: ${f.leadId.firstName} (${f.leadId.companyName || 'Account'})`}
                    {f.dealId && ` • Opportunity: ${f.dealId.title}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {f.status !== 'completed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={CheckCircle2}
                    onClick={() => handleComplete(f._id)}
                  >
                    Complete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Schedule Follow-up"
        subtitle="Set a designated time for call, email, or meeting"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Save Follow-up</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Call Rajesh to confirm contract signing date"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Scheduled Date & Time"
              type="datetime-local"
              required
              value={formData.scheduledDate}
              onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
            />
            <Select
              label="Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              options={[
                { value: 'call', label: 'Phone Call' },
                { value: 'whatsapp', label: 'WhatsApp' },
                { value: 'email', label: 'Email' },
                { value: 'meeting', label: 'Meeting' },
              ]}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
