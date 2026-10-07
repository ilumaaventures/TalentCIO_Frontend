import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Check, Folder, Calendar, Clock, Tag, User, Users, AlertCircle, Edit3 } from 'lucide-react';
import Button from '@/components/ui/Button';

const COLUMNS = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'REVIEW', title: 'Review' },
  { id: 'DONE', title: 'Done' },
  { id: 'BLOCKED', title: 'Blocked' }
];

const PRIORITIES = [
  { id: 'URGENT', title: 'Urgent' },
  { id: 'HIGH', title: 'High' },
  { id: 'MEDIUM', title: 'Medium' },
  { id: 'LOW', title: 'Low' }
];

const toDateInput = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

export const EditTaskModal = ({
  task,
  isOpen,
  onClose,
  modules = [],
  employees = [],
  project,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    module: '',
    status: 'TODO',
    priority: 'MEDIUM',
    estimatedHours: '',
    startDate: '',
    dueDate: '',
    description: '',
    assignees: [],
    reporter: '',
    labels: []
  });

  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const projectMemberIdSet = useMemo(() => {
    const set = new Set();
    if (Array.isArray(project?.members)) {
      project.members.forEach((m) => set.add(String(m?._id || m)));
    }
    if (project?.manager) {
      set.add(String(project.manager?._id || project.manager));
    }
    return set;
  }, [project]);

  useEffect(() => {
    if (!isOpen || !task) return;

    const moduleVal = task.module?._id || task.module || (modules[0]?._id || '');
    const projectMemberIds = Array.from(projectMemberIdSet);
    const assigneesVal = (Array.isArray(task.assignees) && task.assignees.length > 0)
      ? task.assignees.map((a) => (typeof a === 'object' ? a._id : a))
      : projectMemberIds;
    const reporterVal = task.reporter?._id || task.reporter || '';

    setFormData({
      name: task.name || '',
      module: moduleVal,
      status: task.status || 'TODO',
      priority: (task.priority === 'CRITICAL' ? 'URGENT' : task.priority) || 'MEDIUM',
      estimatedHours: task.estimatedHours ?? '',
      startDate: toDateInput(task.startDate),
      dueDate: toDateInput(task.dueDate),
      description: task.description || '',
      assignees: assigneesVal,
      reporter: reporterVal,
      labels: Array.isArray(task.labels) ? [...task.labels] : []
    });
    setAssigneeSearch('');
    setTagInput('');
  }, [isOpen, task, modules, projectMemberIdSet]);

  const allSelectableAssignees = useMemo(() => {
    const map = new Map();
    if (Array.isArray(project?.members)) {
      project.members.forEach((m, idx) => {
        const mId = String(m?._id || m);
        map.set(mId, {
          _id: mId,
          firstName: m.firstName || 'Member',
          lastName: m.lastName || '',
          email: m.email || '',
          profilePicture: m.profilePicture || m.profilePhoto || null,
          isProjectMember: true
        });
      });
    }
    if (project?.manager) {
      const mgrId = String(project.manager?._id || project.manager);
      if (!map.has(mgrId)) {
        map.set(mgrId, {
          _id: mgrId,
          firstName: project.manager.firstName || 'Manager',
          lastName: project.manager.lastName || '',
          email: project.manager.email || '',
          profilePicture: project.manager.profilePicture || project.manager.profilePhoto || null,
          isProjectMember: true,
          isManager: true
        });
      }
    }
    (employees || []).forEach((emp) => {
      const eId = String(emp._id);
      const isProjMem = projectMemberIdSet.has(eId);
      const existing = map.get(eId);
      map.set(eId, {
        _id: eId,
        firstName: emp.firstName || existing?.firstName || '',
        lastName: emp.lastName || existing?.lastName || '',
        email: emp.email || existing?.email || '',
        profilePicture: emp.profilePicture || emp.profilePhoto || existing?.profilePicture || null,
        isProjectMember: isProjMem || Boolean(existing?.isProjectMember)
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.isProjectMember && !b.isProjectMember) return -1;
      if (!a.isProjectMember && b.isProjectMember) return 1;
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });
  }, [employees, project, projectMemberIdSet]);

  const filteredEmployees = useMemo(() => {
    const term = assigneeSearch.toLowerCase().trim();
    if (!term) return allSelectableAssignees;
    return allSelectableAssignees.filter(
      (e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(term) ||
        (e.email || '').toLowerCase().includes(term)
    );
  }, [allSelectableAssignees, assigneeSearch]);

  const toggleAssignee = (id) => {
    setFormData((prev) => {
      const exists = prev.assignees.includes(id);
      return {
        ...prev,
        assignees: exists
          ? prev.assignees.filter((a) => a !== id)
          : [...prev.assignees, id]
      };
    });
  };

  const handleAddLabel = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (!formData.labels.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        labels: [...prev.labels, trimmed]
      }));
    }
    setTagInput('');
  };

  const handleRemoveLabel = (tag) => {
    setFormData((prev) => ({
      ...prev,
      labels: prev.labels.filter((l) => l !== tag)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        module: formData.module,
        status: formData.status,
        priority: formData.priority,
        estimatedHours: formData.estimatedHours === '' ? 0 : Number(formData.estimatedHours),
        startDate: formData.startDate || null,
        dueDate: formData.dueDate || null,
        description: formData.description,
        assignees: formData.assignees,
        reporter: formData.reporter || null,
        labels: formData.labels
      };
      await onSave(payload);
      onClose();
    } catch {
      // error handled by caller toast
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20 shrink-0">
              <Edit3 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">Edit Task Details</h3>
                {project?.name && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {project.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Update task specifications, team assignment, and schedule</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 md:p-7 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Core Info, Schedule, Labels (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Task Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement user authentication"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white shadow-2xs transition-all placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              {/* Module */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Folder size={13} className="text-blue-600" /> Module <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.module}
                  onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white shadow-2xs transition-all cursor-pointer"
                >
                  {modules.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description / Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide a detailed description of this task..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white shadow-2xs transition-all resize-y min-h-[90px] placeholder:text-slate-400"
                />
              </div>

              {/* Schedule & Estimation Card */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={13} className="text-blue-600" /> Schedule & Estimation
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                      <Clock size={11} className="text-slate-400" /> Est. Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="e.g. 8"
                      value={formData.estimatedHours}
                      onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                      className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Labels / Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Tag size={12} className="text-slate-400" /> Labels
                </label>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {formData.labels.map((lbl, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 font-medium"
                    >
                      #{lbl}
                      <button
                        type="button"
                        onClick={() => handleRemoveLabel(lbl)}
                        className="text-slate-400 hover:text-rose-500 ml-1 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="New label..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLabel())}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 w-44"
                  />
                  <button
                    type="button"
                    onClick={handleAddLabel}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                  >
                    Add Tag
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Workflow & Assignees (5 cols) */}
            <div className="lg:col-span-5 space-y-4 flex flex-col">
              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-blue-500 bg-white cursor-pointer"
                  >
                    {COLUMNS.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-blue-500 bg-white cursor-pointer"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reporter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <User size={12} className="text-slate-400" /> Reporter
                </label>
                <select
                  value={formData.reporter}
                  onChange={(e) => setFormData({ ...formData, reporter: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-500 bg-white cursor-pointer"
                >
                  <option value="">None / Unassigned</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignees Selection */}
              <div className="flex-1 flex flex-col p-4 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={13} className="text-blue-600" /> Assignees
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700">
                      {formData.assignees.length}
                    </span>
                  </label>

                  {/* Quick Select Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const pIds = allSelectableAssignees.filter(a => a.isProjectMember).map(a => a._id);
                        setFormData((prev) => ({ ...prev, assignees: pIds }));
                      }}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors cursor-pointer"
                      title="Assign all project team members"
                    >
                      Project Team ({projectMemberIdSet.size})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, assignees: [] }))}
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mb-2">
                  Assigned by default. Click to uncheck or select team members.
                </p>

                {/* Member Search */}
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search team members..."
                    value={assigneeSearch}
                    onChange={(e) => setAssigneeSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white"
                  />
                </div>

                {/* Assignees Scroll List */}
                <div className="flex-1 max-h-56 overflow-y-auto space-y-1 pr-1">
                  {filteredEmployees.map((emp) => {
                    const isChecked = formData.assignees.includes(emp._id);
                    return (
                      <div
                        key={emp._id}
                        onClick={() => toggleAssignee(emp._id)}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-blue-600 pointer-events-none"
                          />
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 overflow-hidden">
                            {emp.profilePicture ? (
                              <img src={emp.profilePicture} alt="" className="w-full h-full object-cover" />
                            ) : (
                              `${(emp.firstName || 'U')[0]}${(emp.lastName || '')[0] || ''}`.toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-800 truncate">
                              {emp.firstName} {emp.lastName}
                            </div>
                            {emp.email && (
                              <div className="text-[10px] text-slate-400 truncate">
                                {emp.email}
                              </div>
                            )}
                          </div>
                        </div>

                        {emp.isProjectMember && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 shrink-0">
                            Team
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {filteredEmployees.length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No members match &ldquo;{assigneeSearch}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{formData.assignees.length}</span> assigned &bull; Module: <span className="font-semibold text-slate-700">{modules.find(m => m._id === formData.module)?.name || 'None'}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <Button
                type="submit"
                disabled={submitting || !formData.name.trim()}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {submitting ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;
