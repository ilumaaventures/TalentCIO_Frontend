import React, { useState, useEffect } from 'react';
import { Workflow, Plus, Play, Pause, Zap, CheckCircle2, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { workflowService } from '../../services/api';

export const WorkflowsPage = () => {
  const [workflows, setWorkflows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerEvent: 'deal_stage_changed',
    actionType: 'create_task',
  });

  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const res = await workflowService.getWorkflows();
      if (res.success) setWorkflows(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleToggle = async (id) => {
    try {
      await workflowService.toggleWorkflow(id);
      fetchWorkflows();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete workflow "${name}"?`)) return;
    try {
      await workflowService.deleteWorkflow(id);
      fetchWorkflows();
    } catch (err) {
      alert(err.message || 'Failed to delete workflow');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await workflowService.createWorkflow({
        name: formData.name,
        description: formData.description,
        triggerEvent: formData.triggerEvent,
        actions: [{ actionType: formData.actionType || 'create_task' }],
        isActive: true,
      });
      setIsModalOpen(false);
      setFormData({ name: '', description: '', triggerEvent: 'deal_stage_changed', actionType: 'create_task' });
      fetchWorkflows();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Workflow Automation</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Trigger-based automation rules for task generation, notifications, and stage movements.
          </p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
          New Workflow
        </Button>
      </div>

      {workflows.length === 0 ? (
        <Card padding="lg" className="text-center py-16 bg-slate-50/50 border-dashed">
          <Workflow className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">No automation workflows active</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Set up automatic task creation, rep notifications, and stage advance triggers when deals or leads change.
          </p>
          <Button size="sm" icon={Plus} className="mt-4" onClick={() => setIsModalOpen(true)}>
            Create First Workflow
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {workflows.map((wf) => (
            <Card key={wf._id} padding="lg" className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{wf.name}</h3>
                    {wf.description && <p className="text-xs text-slate-500 mt-0.5">{wf.description}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={wf.isActive ? 'emerald' : 'neutral'} size="sm">
                    {wf.isActive ? 'Active' : 'Paused'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={wf.isActive ? Pause : Play}
                    onClick={() => handleToggle(wf._id)}
                  >
                    {wf.isActive ? 'Pause' : 'Activate'}
                  </Button>
                  <button
                    onClick={() => handleDelete(wf._id, wf.name)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Workflow"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Visual Trigger -> Condition -> Action flow */}
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                <div className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 flex items-center gap-1.5">
                  <span>TRIGGER:</span>
                  <span className="capitalize">{wf.triggerEvent?.replace(/_/g, ' ')}</span>
                </div>
                <span className="text-slate-400 font-bold">→</span>
                <div className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 font-semibold border border-amber-100">
                  CONDITION: Match Filters
                </div>
                <span className="text-slate-400 font-bold">→</span>
                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-semibold border border-emerald-100">
                  ACTION: {wf.actions?.[0]?.actionType ? wf.actions[0].actionType.replace(/_/g, ' ').toUpperCase() : 'CREATE TASK'}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Automation Rule"
        subtitle="Define trigger events and downstream actions"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Save Workflow</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Rule Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Follow-up reminder on demo stage"
          />
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Automatically trigger tasks and notify team"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Trigger Event"
              value={formData.triggerEvent}
              onChange={(e) => setFormData({ ...formData, triggerEvent: e.target.value })}
              options={[
                { value: 'deal_stage_changed', label: 'Deal Stage Changed' },
                { value: 'lead_created', label: 'Lead Created' },
                { value: 'lead_qualified', label: 'Lead Qualified' },
                { value: 'followup_overdue', label: 'Follow-up Overdue' },
                { value: 'deal_won', label: 'Deal Won' },
              ]}
            />
            <Select
              label="Automation Action"
              value={formData.actionType}
              onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
              options={[
                { value: 'create_task', label: 'Create Follow-up Task' },
                { value: 'notify_manager', label: 'Notify Sales Manager' },
                { value: 'send_email', label: 'Send Automated Email' },
                { value: 'send_whatsapp', label: 'Send WhatsApp Notification' },
              ]}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
