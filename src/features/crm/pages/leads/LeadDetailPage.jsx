import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle2,
  Calendar,
  Clock,
  Briefcase,
  Building2,
  UserCheck,
  Edit3,
  Plus,
  Sparkles,
  Send,
  CheckSquare,
  Trash2,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { LeadConvertModal } from './LeadConvertModal';
import { leadsService, activitiesService, followUpsService, tasksService } from '../../services/api';

export const LeadDetailPage = ({ leadId, onBack, onNavigate }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(false);

  // Quick activity log state
  const [activityForm, setActivityForm] = useState({
    type: 'call',
    subject: '',
    description: '',
    outcome: 'Connected',
  });

  // Follow-up state
  const [followUpForm, setFollowUpForm] = useState({
    title: '',
    scheduledDate: '',
    type: 'call',
    priority: 'Medium',
  });

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    priority: 'Medium',
    category: 'Follow-up',
    description: '',
  });

  // BANT Qualification form
  const [qualification, setQualification] = useState({
    need: '',
    budget: '',
    authority: '',
    timeline: '',
    interestLevel: 'High',
    buyingIntent: 'Evaluating',
  });

  const fetchLeadDetails = async () => {
    setIsLoading(true);
    try {
      const res = await leadsService.getLeadById(leadId);
      if (res.success) {
        setData(res.data);
        if (res.data.lead?.qualification) {
          setQualification(res.data.lead.qualification);
        }
      }
    } catch (err) {
      console.error('Error fetching lead', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) fetchLeadDetails();
  }, [leadId]);

  const handleUpdateQualification = async () => {
    try {
      await leadsService.updateLead(leadId, { qualification });
      fetchLeadDetails();
      alert('Qualification updated & lead score recalculated!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogActivity = async (e) => {
    e.preventDefault();
    try {
      await activitiesService.logActivity({
        ...activityForm,
        leadId,
      });
      setIsLogActivityOpen(false);
      setActivityForm({ type: 'call', subject: '', description: '', outcome: 'Connected' });
      fetchLeadDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleScheduleFollowUp = async (e) => {
    e.preventDefault();
    try {
      await followUpsService.createFollowUp({
        ...followUpForm,
        leadId,
      });
      setIsFollowUpOpen(false);
      setFollowUpForm({ title: '', scheduledDate: '', type: 'call', priority: 'Medium' });
      fetchLeadDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title) return;
    try {
      await tasksService.createTask({
        ...taskForm,
        leadId,
        dueDate: taskForm.dueDate || new Date(Date.now() + 86400000),
      });
      setIsTaskOpen(false);
      setTaskForm({
        title: '',
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        priority: 'Medium',
        category: 'Follow-up',
        description: '',
      });
      fetchLeadDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleTaskStatus = async (taskId, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
      await tasksService.updateTask(taskId, {
        status: nextStatus,
        completedAt: nextStatus === 'Completed' ? new Date() : null,
      });
      fetchLeadDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await tasksService.deleteTask(taskId);
      fetchLeadDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCompleteFollowUp = async (followUpId) => {
    try {
      await followUpsService.completeFollowUp(followUpId, { notes: 'Completed from lead workspace' });
      fetchLeadDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3"></div>
        Loading lead workspace...
      </div>
    );
  }

  const { lead, activities = [], tasks = [], followUps = [] } = data;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Header */}
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
                <h1 className="text-xl font-bold text-slate-900">{lead.fullName}</h1>
                <Badge variant={lead.isConverted ? 'emerald' : 'purple'} size="sm">
                  {lead.status}
                </Badge>
                {lead.isConverted && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Converted
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {lead.jobTitle ? `${lead.jobTitle} • ` : ''}{lead.companyName || 'No Company'}
                {lead.address?.city ? ` • ${lead.address.city}${lead.address.state ? `, ${lead.address.state}` : ''}` : ''}
                {` • Source: ${lead.source}`}
              </p>
            </div>
          </div>

          {/* Quick Communication Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              icon={Phone}
              onClick={() => {
                setActivityForm({ type: 'call', subject: `Call with ${lead.fullName}`, description: '', outcome: 'Connected' });
                setIsLogActivityOpen(true);
              }}
            >
              Call
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={MessageSquare}
              onClick={() => {
                setActivityForm({ type: 'whatsapp', subject: `WhatsApp message to ${lead.fullName}`, description: '', outcome: 'Sent' });
                setIsLogActivityOpen(true);
              }}
            >
              WhatsApp
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={Mail}
              onClick={() => {
                setActivityForm({ type: 'email', subject: `Follow-up email to ${lead.fullName}`, description: '', outcome: 'Sent' });
                setIsLogActivityOpen(true);
              }}
            >
              Email
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={Clock}
              onClick={() => setIsFollowUpOpen(true)}
            >
              Follow-up
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={CheckSquare}
              onClick={() => setIsTaskOpen(true)}
            >
              + Task
            </Button>

            {!lead.isConverted && (
              <Button
                size="sm"
                icon={CheckCircle2}
                onClick={() => setIsConvertModalOpen(true)}
              >
                Convert Lead
              </Button>
            )}
          </div>
        </div>

        {/* Lead Score & Conversion Highlights */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-400 font-medium">Lead Score:</span>{' '}
              <span className="font-bold text-slate-900">{lead.score || 50}/100</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Priority:</span>{' '}
              <span className="font-bold text-slate-900">{lead.priority}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Owner:</span>{' '}
              <span className="font-bold text-slate-900">{lead.ownerId?.name || 'Unassigned'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Est. Value:</span>{' '}
              <span className="font-bold text-emerald-600">
                ₹{(lead.estimatedValue || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {lead.isConverted && (
            <div className="flex items-center gap-3">
              {lead.convertedDealId && (
                <button
                  onClick={() => onNavigate('deals', lead.convertedDealId?._id)}
                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>View Deal ({lead.convertedDealId?.title})</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Lead Profile' },
          { id: 'qualification', label: 'BANT Qualification' },
          { id: 'timeline', label: `Activity Timeline (${activities.length})` },
          { id: 'tasks', label: `Tasks & Follow-ups (${tasks.length + followUps.length})` },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card padding="lg" className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Contact & Organization Details</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Email Address</p>
                <p className="font-semibold text-slate-900 mt-0.5">{lead.email || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Phone Number</p>
                <p className="font-semibold text-slate-900 mt-0.5">{lead.phone || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Company Name</p>
                <p className="font-semibold text-slate-900 mt-0.5">{lead.companyName || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Job Title</p>
                <p className="font-semibold text-slate-900 mt-0.5">{lead.jobTitle || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Lead Source</p>
                <p className="font-semibold text-slate-900 mt-0.5">{lead.source}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Location / City</p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {lead.address?.city
                    ? `${lead.address.city}${lead.address.state ? `, ${lead.address.state}` : ''}${lead.address.country ? ` (${lead.address.country})` : ''}`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Street & PIN Code</p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {[lead.address?.street, lead.address?.postalCode].filter(Boolean).join(' - ') || '—'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Created On</p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {lead.notes && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 font-medium">Internal Notes</p>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">{lead.notes}</p>
              </div>
            )}
          </Card>

          {/* Quick Actions / Follow-up Panel */}
          <Card padding="lg" className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Next Recommended Action</h3>
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-indigo-700">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Sales Guidance</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Lead score is {lead.score}/100 with high buying intent. Schedule a discovery meeting to qualify commercial budget and authority.
              </p>
            </div>
            <Button
              className="w-full"
              size="sm"
              icon={Plus}
              onClick={() => setIsLogActivityOpen(true)}
            >
              Log Sales Interaction
            </Button>
          </Card>
        </div>
      )}

      {/* Tab 2: BANT Qualification */}
      {activeTab === 'qualification' && (
        <Card padding="lg" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">BANT Sales Qualification</h3>
              <p className="text-xs text-slate-500 mt-0.5">Budget, Authority, Need, and Timeline verification</p>
            </div>
            <Button size="sm" onClick={handleUpdateQualification}>
              Save Qualification
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Need (Customer Pain Point & Requirement)"
              value={qualification.need}
              onChange={(e) => setQualification({ ...qualification, need: e.target.value })}
              placeholder="e.g. Sales team needs centralized tracking to eliminate deal slippage"
            />
            <Input
              label="Budget (Approved Investment Range)"
              value={qualification.budget}
              onChange={(e) => setQualification({ ...qualification, budget: e.target.value })}
              placeholder="e.g. ₹5,00,000 - ₹8,00,000"
            />
            <Input
              label="Authority (Key Decision Maker Involved)"
              value={qualification.authority}
              onChange={(e) => setQualification({ ...qualification, authority: e.target.value })}
              placeholder="e.g. Managing Director is decision maker"
            />
            <Input
              label="Timeline (Roll-out Deadline)"
              value={qualification.timeline}
              onChange={(e) => setQualification({ ...qualification, timeline: e.target.value })}
              placeholder="e.g. 30 to 45 days"
            />
            <Select
              label="Interest Level"
              value={qualification.interestLevel}
              onChange={(e) => setQualification({ ...qualification, interestLevel: e.target.value })}
              options={[
                { value: 'Low', label: 'Low' },
                { value: 'Medium', label: 'Medium' },
                { value: 'High', label: 'High' },
                { value: 'Very High', label: 'Very High' },
              ]}
            />
            <Select
              label="Buying Intent Stage"
              value={qualification.buyingIntent}
              onChange={(e) => setQualification({ ...qualification, buyingIntent: e.target.value })}
              options={[
                { value: 'Informational', label: 'Informational Discovery' },
                { value: 'Evaluating', label: 'Actively Evaluating Solutions' },
                { value: 'Decision Stage', label: 'Decision Stage' },
                { value: 'Ready to Buy', label: 'Ready to Buy' },
              ]}
            />
          </div>
        </Card>
      )}

      {/* Tab 3: Timeline */}
      {activeTab === 'timeline' && (
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">Interaction Timeline</h3>
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
                    {act.type === 'call' ? <Phone className="w-4 h-4" /> : act.type === 'email' ? <Mail className="w-4 h-4" /> : act.type === 'whatsapp' ? <MessageSquare className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900">{act.subject}</p>
                    {act.description && <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap">{act.description}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(act.performedAt).toLocaleString()} • By {act.performedByName || 'Rep'}
                    </p>
                  </div>
                  {act.outcome && (
                    <Badge variant="neutral" size="sm">
                      {act.outcome}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Tab 4: Tasks & Follow-ups */}
      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card padding="lg" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Scheduled Follow-ups</h3>
                <p className="text-xs text-slate-500 mt-0.5">Upcoming outreach and sales touchpoints</p>
              </div>
              <Button size="sm" variant="outline" icon={Plus} onClick={() => setIsFollowUpOpen(true)}>
                Schedule
              </Button>
            </div>
            <div className="space-y-2.5">
              {followUps.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-2.5">
                    <Clock className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-900">No scheduled follow-ups</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Stay top-of-mind with this lead by booking a call, demo, or email touchpoint.
                  </p>
                  <Button size="xs" variant="outline" className="mt-3" onClick={() => setIsFollowUpOpen(true)}>
                    + Schedule Follow-up
                  </Button>
                </div>
              ) : (
                followUps.map((f) => {
                  const isCompleted = f.status === 'completed';
                  return (
                    <div
                      key={f._id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        isCompleted ? 'border-slate-200/60 bg-slate-50/40 opacity-75' : 'border-slate-200/80 bg-slate-50/60 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <button
                          onClick={() => handleCompleteFollowUp(f._id)}
                          title={isCompleted ? 'Completed' : 'Click to mark complete'}
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 hover:border-indigo-500 bg-white'
                          }`}
                        >
                          {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                        </button>
                        <div className="min-w-0">
                          <p className={`font-bold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>{f.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {new Date(f.scheduledDate).toLocaleString()} • {f.type}
                          </p>
                        </div>
                      </div>
                      <Badge variant={isCompleted ? 'emerald' : 'blue'} size="sm">
                        {f.status}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card padding="lg" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Associated Tasks</h3>
                <p className="text-xs text-slate-500 mt-0.5">To-dos, deliverables & action items for this lead</p>
              </div>
              <Button size="sm" variant="primary" icon={Plus} onClick={() => setIsTaskOpen(true)}>
                Add Task
              </Button>
            </div>
            <div className="space-y-2.5">
              {tasks.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2.5">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-900">No tasks associated yet</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Track action items, proposal drafts, research, and milestones linked directly to this prospect.
                  </p>
                  <Button size="xs" variant="primary" icon={Plus} className="mt-3.5" onClick={() => setIsTaskOpen(true)}>
                    + Create First Task
                  </Button>
                </div>
              ) : (
                tasks.map((t) => {
                  const isCompleted = t.status === 'Completed';
                  const isOverdue = !isCompleted && new Date(t.dueDate) < new Date();
                  return (
                    <div
                      key={t._id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        isCompleted
                          ? 'border-slate-200/60 bg-slate-50/40 opacity-75'
                          : isOverdue
                          ? 'border-rose-200 bg-rose-50/30'
                          : 'border-slate-200/80 bg-slate-50/60 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <button
                          onClick={() => handleToggleTaskStatus(t._id, t.status)}
                          title={isCompleted ? 'Mark as Pending' : 'Mark as Completed'}
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 hover:border-indigo-500 bg-white'
                          }`}
                        >
                          {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                        </button>
                        <div className="min-w-0 pr-2">
                          <p className={`font-bold truncate ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {t.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                            <span className={isOverdue ? 'text-rose-600 font-semibold' : ''}>
                              Due: {new Date(t.dueDate).toLocaleDateString()}
                            </span>
                            {t.category && <span>• {t.category}</span>}
                            {t.priority && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  t.priority === 'Urgent'
                                    ? 'bg-rose-100 text-rose-700'
                                    : t.priority === 'High'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {t.priority}
                              </span>
                            )}
                          </div>
                          {t.description && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{t.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={isCompleted ? 'emerald' : isOverdue ? 'rose' : 'amber'} size="sm">
                          {isCompleted ? 'Completed' : isOverdue ? 'Overdue' : t.status}
                        </Badge>
                        <button
                          onClick={() => handleDeleteTask(t._id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Convert Lead Modal */}
      <LeadConvertModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        lead={lead}
        onSuccess={() => {
          fetchLeadDetails();
          setIsConvertModalOpen(false);
        }}
      />

      {/* Log Activity Modal */}
      <Modal
        isOpen={isLogActivityOpen}
        onClose={() => setIsLogActivityOpen(false)}
        title="Log Activity"
        subtitle={`Record interaction for ${lead.fullName}`}
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
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Activity Type"
              value={activityForm.type}
              onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
              options={[
                { value: 'call', label: 'Phone Call' },
                { value: 'meeting', label: 'Meeting / Demo' },
                { value: 'whatsapp', label: 'WhatsApp' },
                { value: 'email', label: 'Email' },
                { value: 'note', label: 'Internal Note' },
              ]}
            />
            <Select
              label="Outcome"
              value={activityForm.outcome}
              onChange={(e) => setActivityForm({ ...activityForm, outcome: e.target.value })}
              options={[
                { value: 'Connected', label: 'Connected' },
                { value: 'Left Voicemail', label: 'Left Voicemail' },
                { value: 'Scheduled Meeting', label: 'Scheduled Meeting' },
                { value: 'Sent', label: 'Sent' },
                { value: 'Completed', label: 'Completed' },
              ]}
            />
          </div>
          <Input
            label="Subject"
            required
            value={activityForm.subject}
            onChange={(e) => setActivityForm({ ...activityForm, subject: e.target.value })}
            placeholder="e.g. Discovery call regarding timeline and budget"
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Notes & Summary
            </label>
            <textarea
              rows={3}
              value={activityForm.description}
              onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Enter interaction notes..."
            />
          </div>
        </form>
      </Modal>

      {/* Schedule Follow-up Modal */}
      <Modal
        isOpen={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        title="Schedule Follow-up"
        subtitle={`Set reminder touchpoint for ${lead.fullName}`}
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
            label="Follow-up Title"
            required
            value={followUpForm.title}
            onChange={(e) => setFollowUpForm({ ...followUpForm, title: e.target.value })}
            placeholder="e.g. Follow-up call on commercial agreement"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Scheduled Date & Time"
              type="datetime-local"
              required
              value={followUpForm.scheduledDate}
              onChange={(e) => setFollowUpForm({ ...followUpForm, scheduledDate: e.target.value })}
            />
            <Select
              label="Type"
              value={followUpForm.type}
              onChange={(e) => setFollowUpForm({ ...followUpForm, type: e.target.value })}
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

      {/* Create Task Modal */}
      <Modal
        isOpen={isTaskOpen}
        onClose={() => setIsTaskOpen(false)}
        title="Create Associated Task"
        subtitle={`Action item for ${lead.fullName}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsTaskOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask}>Save Task</Button>
          </>
        }
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Task Title"
            required
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            placeholder="e.g. Prepare custom demo deck for technical committee"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Due Date"
              type="date"
              required
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
            />
            <Select
              label="Priority"
              value={taskForm.priority}
              onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
              options={[
                { value: 'Low', label: 'Low' },
                { value: 'Medium', label: 'Medium' },
                { value: 'High', label: 'High' },
                { value: 'Urgent', label: 'Urgent' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={taskForm.category}
              onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
              options={[
                { value: 'Follow-up', label: 'Follow-up' },
                { value: 'Call', label: 'Call' },
                { value: 'Email', label: 'Email' },
                { value: 'Meeting', label: 'Meeting' },
                { value: 'Demo', label: 'Demo' },
                { value: 'Preparation', label: 'Preparation' },
                { value: 'Review', label: 'Review' },
                { value: 'Other', label: 'Other' },
              ]}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Description / Action Items
            </label>
            <textarea
              rows={3}
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Add key objectives, deliverables, or checklist details..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
