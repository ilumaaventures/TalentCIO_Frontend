import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Building2,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Clock,
  MessageSquare,
  Plus,
  ExternalLink,
  Edit2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Drawer } from '../../components/ui/Drawer';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { contactsService, activitiesService, followUpsService, tasksService } from '../../services/api';

export const ContactDetailDrawer = ({ contactId, isOpen, onClose, onNavigate, onUpdated }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Quick Action Modals / Inline states
  const [isLogCallOpen, setIsLogCallOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(false);

  const [callForm, setCallForm] = useState({ subject: '', outcome: 'Connected', notes: '', duration: 5 });
  const [followUpForm, setFollowUpForm] = useState({ title: '', scheduledDate: '', type: 'call', priority: 'Medium' });
  const [taskForm, setTaskForm] = useState({ title: '', dueDate: '', priority: 'Medium' });

  const fetchContact = async () => {
    if (!contactId) return;
    setIsLoading(true);
    try {
      const res = await contactsService.getContactById(contactId);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching contact detail', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && contactId) {
      fetchContact();
    }
  }, [isOpen, contactId]);

  const handleLogCall = async (e) => {
    e.preventDefault();
    try {
      await activitiesService.logActivity({
        type: 'call',
        subject: callForm.subject || `Call with ${data?.contact?.fullName || 'Contact'}`,
        description: callForm.notes,
        outcome: callForm.outcome,
        contactId,
        companyId: data?.contact?.companyId?._id,
      });
      setIsLogCallOpen(false);
      setCallForm({ subject: '', outcome: 'Connected', notes: '', duration: 5 });
      fetchContact();
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleScheduleFollowUp = async (e) => {
    e.preventDefault();
    try {
      await followUpsService.createFollowUp({
        ...followUpForm,
        contactId,
        companyId: data?.contact?.companyId?._id,
        scheduledDate: followUpForm.scheduledDate || new Date(Date.now() + 86400000),
      });
      setIsFollowUpOpen(false);
      setFollowUpForm({ title: '', scheduledDate: '', type: 'call', priority: 'Medium' });
      fetchContact();
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await tasksService.createTask({
        ...taskForm,
        contactId,
        companyId: data?.contact?.companyId?._id,
        dueDate: taskForm.dueDate || new Date(Date.now() + 86400000),
      });
      setIsTaskOpen(false);
      setTaskForm({ title: '', dueDate: '', priority: 'Medium' });
      fetchContact();
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err.message);
    }
  };

  const contact = data?.contact;
  const deals = data?.deals || [];
  const activities = data?.activities || [];
  const tasks = data?.tasks || [];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'deals', label: `Deals (${deals.length})` },
    { id: 'timeline', label: `Timeline (${activities.length})` },
    { id: 'tasks', label: `Tasks (${tasks.length})` },
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      width="max-w-xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
            {contact ? `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}` : 'C'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">
                {contact?.fullName || `${contact?.firstName || ''} ${contact?.lastName || ''}`}
              </span>
              <Badge variant="blue" size="xs">
                {contact?.lifecycleStage || 'Contact'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              {contact?.jobTitle || 'Executive'} {contact?.companyId?.name ? `at ${contact.companyId.name}` : ''}
            </p>
          </div>
        </div>
      }
    >
      {isLoading && !data ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading contact profile...</div>
      ) : !contact ? (
        <div className="py-12 text-center text-xs text-slate-400">Contact not found.</div>
      ) : (
        <div className="space-y-6">
          {/* Quick Action Buttons */}
          <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setIsLogCallOpen(true)}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200/60 shadow-2xs hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-slate-700 hover:text-indigo-600 cursor-pointer"
            >
              <Phone className="w-4 h-4 mb-1" />
              <span className="text-[11px] font-semibold">Log Call</span>
            </button>
            <a
              href={`mailto:${contact.email || ''}`}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200/60 shadow-2xs hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-slate-700 hover:text-indigo-600 cursor-pointer"
            >
              <Mail className="w-4 h-4 mb-1" />
              <span className="text-[11px] font-semibold">Email</span>
            </a>
            <button
              onClick={() => setIsFollowUpOpen(true)}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200/60 shadow-2xs hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-slate-700 hover:text-indigo-600 cursor-pointer"
            >
              <Clock className="w-4 h-4 mb-1" />
              <span className="text-[11px] font-semibold">Follow-up</span>
            </button>
            <button
              onClick={() => setIsTaskOpen(true)}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200/60 shadow-2xs hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-slate-700 hover:text-indigo-600 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 mb-1" />
              <span className="text-[11px] font-semibold">Task</span>
            </button>
          </div>

          {/* Inline Log Call Form */}
          {isLogCallOpen && (
            <Card padding="md" className="border-indigo-200 bg-indigo-50/40 animate-in fade-in duration-150">
              <form onSubmit={handleLogCall} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-900">Log Call Outcome</h4>
                  <button
                    type="button"
                    onClick={() => setIsLogCallOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
                <Input
                  label="Subject / Note"
                  placeholder="e.g. Introduction call regarding enterprise requirements"
                  value={callForm.subject}
                  onChange={(e) => setCallForm({ ...callForm, subject: e.target.value })}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    label="Call Outcome"
                    value={callForm.outcome}
                    onChange={(e) => setCallForm({ ...callForm, outcome: e.target.value })}
                    options={[
                      { value: 'Connected', label: 'Connected' },
                      { value: 'Left Voicemail', label: 'Left Voicemail' },
                      { value: 'Gatekeeper / Busy', label: 'Gatekeeper / Busy' },
                      { value: 'Wrong Number', label: 'Wrong Number' },
                    ]}
                  />
                  <Input
                    label="Duration (mins)"
                    type="number"
                    value={callForm.duration}
                    onChange={(e) => setCallForm({ ...callForm, duration: e.target.value })}
                  />
                </div>
                <Button size="sm" type="submit" className="w-full">
                  Save Call Log
                </Button>
              </form>
            </Card>
          )}

          {/* Inline Follow-up Form */}
          {isFollowUpOpen && (
            <Card padding="md" className="border-indigo-200 bg-indigo-50/40 animate-in fade-in duration-150">
              <form onSubmit={handleScheduleFollowUp} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-900">Schedule Follow-up</h4>
                  <button
                    type="button"
                    onClick={() => setIsFollowUpOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
                <Input
                  label="Title"
                  placeholder="e.g. Follow-up demo call"
                  value={followUpForm.title}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, title: e.target.value })}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Date"
                    type="date"
                    value={followUpForm.scheduledDate}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, scheduledDate: e.target.value })}
                    required
                  />
                  <Select
                    label="Channel"
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
                <Button size="sm" type="submit" className="w-full">
                  Schedule Follow-up
                </Button>
              </form>
            </Card>
          )}

          {/* Inline Task Form */}
          {isTaskOpen && (
            <Card padding="md" className="border-indigo-200 bg-indigo-50/40 animate-in fade-in duration-150">
              <form onSubmit={handleCreateTask} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-900">Add Task</h4>
                  <button
                    type="button"
                    onClick={() => setIsTaskOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
                <Input
                  label="Task Description"
                  placeholder="e.g. Prepare security evaluation deck"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Due Date"
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    required
                  />
                  <Select
                    label="Priority"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    options={[
                      { value: 'High', label: 'High' },
                      { value: 'Medium', label: 'Medium' },
                      { value: 'Low', label: 'Low' },
                    ]}
                  />
                </div>
                <Button size="sm" type="submit" className="w-full">
                  Create Task
                </Button>
              </form>
            </Card>
          )}

          {/* Navigation Tabs */}
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <Card padding="md" className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Email</span>
                    <a href={`mailto:${contact.email}`} className="font-semibold text-indigo-600 hover:underline">
                      {contact.email || '—'}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Phone</span>
                    <a href={`tel:${contact.phone}`} className="font-semibold text-slate-800 hover:underline">
                      {contact.phone || '—'}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Account / Company</span>
                    {contact.companyId ? (
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {contact.companyId.name}
                      </span>
                    ) : (
                      '—'
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Assigned Owner</span>
                    <span className="font-semibold text-slate-800">
                      {contact.ownerId?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Lead Source</span>
                    <span className="font-semibold text-slate-800">{contact.leadSource || 'Direct Outreach'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Created Date</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Card>

              {contact.notes && (
                <Card padding="md">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Notes</h4>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{contact.notes}</p>
                </Card>
              )}
            </div>
          )}

          {/* Tab 2: Deals */}
          {activeTab === 'deals' && (
            <div className="space-y-3">
              {deals.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No opportunities linked to this contact.
                </div>
              ) : (
                deals.map((deal) => (
                  <Card key={deal._id} padding="md" className="hover:border-indigo-200 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{deal.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Value:{' '}
                          <span className="font-bold text-slate-800">
                            ₹{Number(deal.value || 0).toLocaleString('en-IN')}
                          </span>{' '}
                          • Stage: <span className="font-medium capitalize">{deal.stage?.replace('_', ' ')}</span>
                        </p>
                      </div>
                      <Badge variant="indigo" size="xs">
                        {deal.winProbability}% Probability
                      </Badge>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Timeline */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No activities logged yet. Use the actions above to log calls or meetings.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {activities.map((act) => (
                    <div key={act._id} className="relative">
                      <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">{act.subject}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(act.performedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {act.description && <p className="text-xs text-slate-600 mt-1">{act.description}</p>}
                        {act.outcome && (
                          <Badge variant="neutral" size="xs" className="mt-2">
                            {act.outcome}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Tasks */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No pending tasks for this contact.
                </div>
              ) : (
                tasks.map((task) => (
                  <Card key={task._id} padding="sm" className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          task.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">{task.title}</span>
                        <span className="text-[10px] text-slate-400">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Badge variant={task.status === 'Completed' ? 'emerald' : 'amber'} size="xs">
                      {task.status}
                    </Badge>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};
