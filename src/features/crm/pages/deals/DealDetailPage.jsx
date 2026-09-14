import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  MessageSquare,
  Mail,
  AlertTriangle,
  Calendar,
  Plus,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { dealsService, activitiesService, followUpsService, tasksService } from '../../services/api';

export const DealDetailPage = ({ dealId, onBack, onNavigate }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [lostReason, setLostReason] = useState('Competitor offered lower pricing');

  const [activityForm, setActivityForm] = useState({
    type: 'call',
    subject: '',
    description: '',
    outcome: 'Connected',
  });

  const [followUpForm, setFollowUpForm] = useState({
    title: '',
    scheduledDate: '',
    type: 'call',
    priority: 'High',
  });

  const fetchDealDetails = async () => {
    setIsLoading(true);
    try {
      const res = await dealsService.getDealById(dealId);
      if (res.success) setData(res.data);
    } catch (err) {
      console.error('Error fetching deal', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (dealId) fetchDealDetails();
  }, [dealId]);

  const handleStageChange = async (newStage, reason = null) => {
    try {
      await dealsService.updateDealStage(dealId, { stage: newStage, winLossReason: reason });
      fetchDealDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogActivity = async (e) => {
    e.preventDefault();
    try {
      await activitiesService.logActivity({
        ...activityForm,
        dealId,
      });
      setIsLogActivityOpen(false);
      setActivityForm({ type: 'call', subject: '', description: '', outcome: 'Connected' });
      fetchDealDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleScheduleFollowUp = async (e) => {
    e.preventDefault();
    try {
      await followUpsService.createFollowUp({
        ...followUpForm,
        dealId,
      });
      setIsFollowUpOpen(false);
      setFollowUpForm({ title: '', scheduledDate: '', type: 'call', priority: 'High' });
      fetchDealDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3"></div>
        Loading opportunity workspace...
      </div>
    );
  }

  const { deal, activities = [], tasks = [], followUps = [] } = data;
  const stages = ['New Lead', 'Contacted', 'Qualified', 'Discovery & Demo', 'Negotiation', 'Closed Won'];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer mt-0.5"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{deal.title}</h1>
                <Badge
                  variant={deal.status === 'Won' ? 'emerald' : deal.status === 'Lost' ? 'rose' : 'indigo'}
                  size="sm"
                >
                  {deal.stage} ({deal.status})
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {deal.companyId?.name || 'Account'} • Owner: {deal.ownerId?.name || 'Unassigned'}
              </p>
            </div>
          </div>

          {/* Value and Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-3 text-right">
              <p className="text-xs text-slate-400">Opportunity Value</p>
              <p className="text-lg font-bold text-slate-900">
                ₹{(deal.value || 0).toLocaleString('en-IN')}
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              icon={Phone}
              onClick={() => {
                setActivityForm({ type: 'call', subject: `Call regarding ${deal.title}`, description: '', outcome: 'Connected' });
                setIsLogActivityOpen(true);
              }}
            >
              Call
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={Clock}
              onClick={() => setIsFollowUpOpen(true)}
            >
              Follow-up
            </Button>

            {deal.status !== 'Won' && (
              <Button
                size="sm"
                variant="success"
                icon={CheckCircle2}
                onClick={() => handleStageChange('Closed Won')}
              >
                Mark Won
              </Button>
            )}

            {deal.status !== 'Lost' && (
              <Button
                size="sm"
                variant="danger"
                icon={XCircle}
                onClick={() => setIsLostModalOpen(true)}
              >
                Mark Lost
              </Button>
            )}
          </div>
        </div>

        {/* Visual Stage Progress Tracker */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {stages.map((stageName, idx) => {
              const isCurrent = deal.stage.toLowerCase() === stageName.toLowerCase();
              const isPast = stages.indexOf(deal.stage) > idx;

              return (
                <button
                  key={stageName}
                  onClick={() => handleStageChange(stageName)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : isPast
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="truncate">{stageName}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Deal Risk Warning Banner if flagged */}
      {deal.riskReasons?.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-rose-900">High Risk Opportunity</h4>
            <ul className="list-disc list-inside mt-1 text-rose-700 space-y-0.5">
              {deal.riskReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Opportunity Overview' },
          { id: 'timeline', label: `Activities (${activities.length})` },
          { id: 'tasks', label: `Tasks & Follow-ups (${tasks.length + followUps.length})` },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card padding="lg" className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Commercial Parameters</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Pipeline</p>
                <p className="font-semibold text-slate-900 mt-0.5">{deal.pipelineId?.name || 'Standard'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Win Probability</p>
                <p className="font-semibold text-slate-900 mt-0.5">{deal.probability}%</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Forecast Category</p>
                <p className="font-semibold text-indigo-600 mt-0.5">{deal.forecastCategory || 'Pipeline'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Expected Close Date</p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Lead Source</p>
                <p className="font-semibold text-slate-900 mt-0.5">{deal.leadSource || 'Website'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Priority</p>
                <p className="font-semibold text-slate-900 mt-0.5">{deal.priority}</p>
              </div>
            </div>

            {deal.description && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 font-medium">Description</p>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">{deal.description}</p>
              </div>
            )}
          </Card>

          {/* Account Profile Card */}
          <Card padding="lg" className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Account & Stakeholders</h3>
            {deal.companyId ? (
              <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>{deal.companyId.name}</span>
                </div>
                <p className="text-slate-500">Industry: {deal.companyId.industry}</p>
                <p className="text-slate-500">Health: <span className="font-semibold capitalize text-emerald-600">{deal.companyId.healthScore}</span></p>
              </div>
            ) : null}

            {deal.contactId ? (
              <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <span>{deal.contactId.firstName} {deal.contactId.lastName}</span>
                </div>
                <p className="text-slate-500">{deal.contactId.email}</p>
                <p className="text-slate-500">{deal.contactId.phone}</p>
              </div>
            ) : null}
          </Card>
        </div>
      )}

      {/* Tab 2: Activities */}
      {activeTab === 'timeline' && (
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">Opportunity Activities</h3>
            <Button size="sm" icon={Plus} onClick={() => setIsLogActivityOpen(true)}>
              Log Activity
            </Button>
          </div>
          <div className="divide-y divide-slate-100">
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No activities recorded yet.</p>
            ) : (
              activities.map((act) => (
                <div key={act._id} className="py-3 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600 mt-0.5">
                    {act.type === 'call' ? <Phone className="w-4 h-4" /> : act.type === 'email' ? <Mail className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900">{act.subject}</p>
                    {act.description && <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap">{act.description}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(act.performedAt).toLocaleString()} • By {act.performedByName || 'Rep'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Tab 3: Tasks */}
      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card padding="lg" className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Scheduled Follow-ups</h3>
            <div className="space-y-2.5">
              {followUps.map((f) => (
                <div key={f._id} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{f.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{new Date(f.scheduledDate).toLocaleString()}</p>
                  </div>
                  <Badge variant="blue" size="sm">{f.status}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="lg" className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Tasks</h3>
            <div className="space-y-2.5">
              {tasks.map((t) => (
                <div key={t._id} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{t.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Due: {new Date(t.dueDate).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="amber" size="sm">{t.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Mark Lost Modal */}
      <Modal
        isOpen={isLostModalOpen}
        onClose={() => setIsLostModalOpen(false)}
        title="Mark Deal as Closed Lost"
        subtitle="Record reason for loss to optimize future pipeline velocity"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsLostModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                handleStageChange('Closed Lost', lostReason);
                setIsLostModalOpen(false);
              }}
            >
              Confirm Closed Lost
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            label="Loss Reason"
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            options={[
              { value: 'Competitor offered lower pricing', label: 'Competitor offered lower pricing' },
              { value: 'Budget frozen / cancelled', label: 'Budget frozen / cancelled' },
              { value: 'Feature / technical gap', label: 'Feature / technical gap' },
              { value: 'Delayed project scope', label: 'Delayed project scope' },
              { value: 'No decision made', label: 'No decision made' },
            ]}
          />
        </div>
      </Modal>

      {/* Log Activity Modal */}
      <Modal
        isOpen={isLogActivityOpen}
        onClose={() => setIsLogActivityOpen(false)}
        title="Log Activity"
        subtitle={`Record interaction for ${deal.title}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsLogActivityOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogActivity}>Save Activity</Button>
          </>
        }
      >
        <form onSubmit={handleLogActivity} className="space-y-4">
          <Input
            label="Subject"
            required
            value={activityForm.subject}
            onChange={(e) => setActivityForm({ ...activityForm, subject: e.target.value })}
            placeholder="e.g. Contract review and negotiation call"
          />
          <Select
            label="Outcome"
            value={activityForm.outcome}
            onChange={(e) => setActivityForm({ ...activityForm, outcome: e.target.value })}
            options={[
              { value: 'Connected', label: 'Connected' },
              { value: 'Scheduled Meeting', label: 'Scheduled Meeting' },
              { value: 'Completed', label: 'Completed' },
            ]}
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Notes
            </label>
            <textarea
              rows={3}
              value={activityForm.description}
              onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Enter meeting or call summary..."
            />
          </div>
        </form>
      </Modal>

      {/* Schedule Follow-up Modal */}
      <Modal
        isOpen={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        title="Schedule Follow-up"
        subtitle={`Set reminder for ${deal.title}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsFollowUpOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleFollowUp}>Schedule</Button>
          </>
        }
      >
        <form onSubmit={handleScheduleFollowUp} className="space-y-4">
          <Input
            label="Title"
            required
            value={followUpForm.title}
            onChange={(e) => setFollowUpForm({ ...followUpForm, title: e.target.value })}
            placeholder="e.g. Follow-up on final security sign-off"
          />
          <Input
            label="Scheduled Date & Time"
            type="datetime-local"
            required
            value={followUpForm.scheduledDate}
            onChange={(e) => setFollowUpForm({ ...followUpForm, scheduledDate: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
};
