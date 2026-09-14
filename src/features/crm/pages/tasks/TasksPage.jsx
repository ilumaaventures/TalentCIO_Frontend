import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Search, Filter, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { tasksService } from '../../services/api';

export const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', dueDate: '', priority: 'Medium', category: 'Follow-up' });

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await tasksService.getTasks({ status: statusFilter });
      if (res.success) setTasks(res.data);
    } catch (err) {
      console.error('Error fetching tasks', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter]);

  const handleToggleComplete = async (task) => {
    try {
      const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
      await tasksService.updateTask(task._id, { status: newStatus });
      fetchTasks();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await tasksService.createTask({
        ...formData,
        dueDate: formData.dueDate || new Date(Date.now() + 86400000),
      });
      setIsModalOpen(false);
      setFormData({ title: '', dueDate: '', priority: 'Medium', category: 'Follow-up' });
      fetchTasks();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Task Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track deliverables, contract reviews, and action items.</p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
          New Task
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-48"
          options={[
            { value: 'all', label: 'All Tasks' },
            { value: 'Pending', label: 'Pending' },
            { value: 'In Progress', label: 'In Progress' },
            { value: 'Completed', label: 'Completed' },
          ]}
        />
      </div>

      <div className="space-y-2.5">
        {tasks.map((task) => {
          const isDone = task.status === 'Completed';
          return (
            <div
              key={task._id}
              className={`bg-white p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                isDone ? 'border-slate-200/60 bg-slate-50/50 opacity-70' : 'border-slate-200 shadow-2xs hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => handleToggleComplete(task)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <h4 className={`text-xs font-bold text-slate-900 ${isDone ? 'line-through text-slate-400' : ''}`}>
                    {task.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Due: {new Date(task.dueDate).toLocaleDateString()} • Assignee: {task.assignedTo?.name || 'Rep'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="neutral" size="sm">{task.category || 'Task'}</Badge>
                <Badge variant={task.priority === 'High' || task.priority === 'Urgent' ? 'rose' : 'blue'} size="sm">
                  {task.priority}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Task"
        subtitle="Create an internal task action item"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Task</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Prepare solution proposal deck"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Due Date"
              type="date"
              required
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
            <Select
              label="Priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              options={[
                { value: 'Low', label: 'Low' },
                { value: 'Medium', label: 'Medium' },
                { value: 'High', label: 'High' },
                { value: 'Urgent', label: 'Urgent' },
              ]}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
