import React, { useState, useMemo } from 'react';
import {
  Folder,
  Plus,
  Clock,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  ListChecks,
  CheckSquare,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Search,
  Filter,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';

export const ProjectHierarchy = ({
  modules = [],
  project,
  canUpdateProject = false,
  canCreateTask = false,
  canUpdateTask = false,
  canDeleteModule = false,
  canDeleteTask = false,
  onOpenCreateTask,
  onEditModule,
  onDeleteModule,
  onEditTask,
  onDeleteTask,
  onOpenLogModal,
  onSelectTask
}) => {
  const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());
  const [collapsedModuleIds, setCollapsedModuleIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const toggleTask = (taskId) => {
    setExpandedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleModule = (moduleId) => {
    setCollapsedModuleIds(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const expandAll = () => {
    setCollapsedModuleIds(new Set());
    const allTaskIds = new Set();
    modules.forEach(m => (m.tasks || []).forEach(t => allTaskIds.add(t._id)));
    setExpandedTaskIds(allTaskIds);
  };

  const collapseAll = () => {
    const allModIds = new Set(modules.map(m => m._id));
    setCollapsedModuleIds(allModIds);
    setExpandedTaskIds(new Set());
  };

  // Filter modules and tasks based on search & status
  const filteredModules = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return modules.map(m => {
      const filteredTasks = (m.tasks || []).filter(t => {
        // Status filter
        if (statusFilter !== 'ALL' && t.status !== statusFilter) {
          return false;
        }

        // Search query
        if (q) {
          const matchName = (t.name || '').toLowerCase().includes(q);
          const matchKey = (t.taskKey || t.key || '').toLowerCase().includes(q);
          const matchAssignee = Array.isArray(t.assignees) && t.assignees.some(a =>
            `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase().includes(q)
          );
          if (!matchName && !matchKey && !matchAssignee) return false;
        }

        return true;
      });

      // If module name matches, show all module tasks unless status filtered
      const moduleMatchesQuery = q && (m.name || '').toLowerCase().includes(q);

      return {
        ...m,
        tasks: moduleMatchesQuery && statusFilter === 'ALL' ? (m.tasks || []) : filteredTasks,
        _isVisible: moduleMatchesQuery || filteredTasks.length > 0 || !q
      };
    }).filter(m => m._isVisible);
  }, [modules, searchQuery, statusFilter]);

  const totalFilteredTasks = useMemo(() => {
    return filteredModules.reduce((sum, m) => sum + (m.tasks?.length || 0), 0);
  }, [filteredModules]);

  const getPriorityDot = (priority) => {
    switch (priority) {
      case 'URGENT':
      case 'CRITICAL':
        return 'bg-purple-600 ring-2 ring-purple-200';
      case 'HIGH':
        return 'bg-rose-500';
      case 'MEDIUM':
        return 'bg-amber-500';
      case 'LOW':
      default:
        return 'bg-blue-400';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DONE':
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IN_REVIEW':
      case 'REVIEW':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'BLOCKED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'TODO':
      case 'PLANNED':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatDateStr = (d) => {
    if (!d) return '';
    try {
      return format(new Date(d), 'MMM d');
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Action Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Query */}
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search hierarchy tasks by key, name, assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter controls & Expand/Collapse */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEW">In Review</option>
            <option value="BLOCKED">Blocked</option>
            <option value="DONE">Done</option>
          </select>

          {/* Reset button if filtered */}
          {(searchQuery || statusFilter !== 'ALL') && (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
              className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-800 font-semibold hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X size={13} /> Reset
            </button>
          )}

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Expand/Collapse All */}
          <button
            type="button"
            onClick={expandAll}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Main Hierarchy Tree Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-semibold text-xs border-b border-slate-200/80 uppercase tracking-wider">
                <th className="px-6 py-3.5">Item Name ({totalFilteredTasks} tasks)</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Assignees</th>
                <th className="px-4 py-3.5">Timeline</th>
                <th className="px-4 py-3.5">Progress</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredModules.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400 text-xs italic">
                    No matching modules or tasks found.
                  </td>
                </tr>
              ) : (
                filteredModules.map((module) => {
                  const isCollapsed = collapsedModuleIds.has(module._id);
                  const moduleTasks = module.tasks || [];

                  return (
                    <React.Fragment key={module._id}>
                      {/* Module Row */}
                      <tr className="bg-slate-50/70 hover:bg-slate-100/60 transition-colors border-t border-slate-200">
                        <td className="px-6 py-3.5 font-bold text-slate-800">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => toggleModule(module._id)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors cursor-pointer"
                            >
                              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                            </button>
                            <Folder size={18} className="text-blue-600 shrink-0" />
                            <span
                              className="hover:text-blue-600 cursor-pointer"
                              onClick={() => onEditModule && onEditModule(module)}
                              title="Click to edit module"
                            >
                              {module.name}
                            </span>
                            <span className="text-xs font-normal text-slate-400">
                              ({moduleTasks.length} {moduleTasks.length === 1 ? 'task' : 'tasks'})
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getStatusBadge(
                              module.status
                            )}`}
                          >
                            {module.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 text-xs">-</td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">
                          {module.startDate ? formatDateStr(module.startDate) : '...'} -{' '}
                          {module.dueDate ? formatDateStr(module.dueDate) : '...'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 text-xs">-</td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canCreateTask && onOpenCreateTask && (
                              <button
                                type="button"
                                onClick={() => onOpenCreateTask(module._id)}
                                className="text-blue-600 hover:text-blue-800 text-xs font-semibold px-2 py-1 rounded hover:bg-blue-50 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Add Task to this Module"
                              >
                                <Plus size={14} /> Add Task
                              </button>
                            )}
                            {canUpdateProject && onEditModule && (
                              <button
                                type="button"
                                onClick={() => onEditModule(module)}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                                title="Edit Module"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            {canDeleteModule && onDeleteModule && (
                              <button
                                type="button"
                                onClick={() => onDeleteModule(module._id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                title="Delete Module"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Task Rows inside Module */}
                      {!isCollapsed && moduleTasks.length === 0 && (
                        <tr>
                          <td colSpan="6" className="px-6 py-3 pl-14 text-xs text-slate-400 italic bg-slate-50/20">
                            No tasks in this module yet.
                          </td>
                        </tr>
                      )}
                      {!isCollapsed &&
                        moduleTasks.map((task) => {
                          const isExpanded = expandedTaskIds.has(task._id);
                          const progress =
                            task.estimatedHours > 0
                              ? Math.min(
                                  Math.round(((task.loggedHours || 0) / task.estimatedHours) * 100),
                                  100
                                )
                              : 0;

                          const isBlocked =
                            task.status === 'BLOCKED' ||
                            (Array.isArray(task.blockedBy) && task.blockedBy.length > 0);

                          return (
                            <React.Fragment key={task._id}>
                              <tr className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-6 py-3 pl-12 text-slate-800">
                                  <div className="flex items-center gap-2.5">
                                    <button
                                      type="button"
                                      onClick={() => toggleTask(task._id)}
                                      className="p-0.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown size={14} />
                                      ) : (
                                        <ChevronRight size={14} />
                                      )}
                                    </button>
                                    <div
                                      className={`w-2 h-2 rounded-full shrink-0 ${getPriorityDot(
                                        task.priority
                                      )}`}
                                      title={`Priority: ${task.priority}`}
                                    />
                                    <span className="font-mono text-[11px] font-bold text-slate-400">
                                      {task.taskKey || task.key || ''}
                                    </span>
                                    <span
                                      className="font-medium hover:text-blue-600 cursor-pointer flex items-center gap-1.5"
                                      onClick={() => onSelectTask && onSelectTask(task._id)}
                                      title="Click to view details"
                                    >
                                      {task.name}
                                      {isBlocked && (
                                        <span
                                          className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-0.5"
                                          title="Task is blocked"
                                        >
                                          <ShieldAlert size={10} /> Blocked
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-4 py-3">
                                  <span
                                    className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getStatusBadge(
                                      task.status
                                    )}`}
                                  >
                                    {task.status}
                                  </span>
                                </td>

                                <td className="px-4 py-3">
                                  <div className="flex -space-x-1.5 overflow-hidden">
                                    {Array.isArray(task.assignees) && task.assignees.length > 0 ? (
                                      task.assignees.slice(0, 3).map((a) => (
                                        <div
                                          key={a._id}
                                          className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 border-2 border-white flex items-center justify-center text-[10px] font-bold"
                                          title={`${a.firstName || ''} ${a.lastName || ''}`}
                                        >
                                          {a.firstName?.[0] || 'U'}
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-xs text-slate-400 italic">Unassigned</span>
                                    )}
                                  </div>
                                </td>

                                <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                                  {task.startDate ? formatDateStr(task.startDate) : ''} -{' '}
                                  {task.dueDate ? formatDateStr(task.dueDate) : ''}
                                </td>

                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${
                                          progress >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
                                        }`}
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {task.loggedHours || 0} / {task.estimatedHours || 0}h
                                    </span>
                                  </div>
                                </td>

                                <td className="px-6 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                                    <button
                                      type="button"
                                      onClick={() => onSelectTask && onSelectTask(task._id)}
                                      className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                                      title="Open Task Drawer"
                                    >
                                      <ExternalLink size={15} />
                                    </button>
                                    {canUpdateTask && onOpenLogModal && (
                                      <button
                                        type="button"
                                        onClick={() => onOpenLogModal(task._id)}
                                        className="p-1 text-slate-400 hover:text-emerald-600 rounded cursor-pointer"
                                        title="Log Work"
                                      >
                                        <Clock size={15} />
                                      </button>
                                    )}
                                    {canUpdateTask && onEditTask && (
                                      <button
                                        type="button"
                                        onClick={() => onEditTask(task, module._id)}
                                        className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                                        title="Edit Task"
                                      >
                                        <Edit2 size={15} />
                                      </button>
                                    )}
                                    {canDeleteTask && onDeleteTask && (
                                      <button
                                        type="button"
                                        onClick={() => onDeleteTask(task._id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                        title="Delete Task"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>

                              {/* Expanded Row: Subtasks & Work Logs */}
                              {isExpanded && (
                                <tr className="bg-slate-50/60">
                                  <td colSpan="6" className="px-6 py-4 pl-16">
                                    <div className="space-y-4 max-w-4xl">
                                      {/* Work Logs Section */}
                                      <div>
                                        <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                          <ListChecks size={14} className="text-slate-400" /> Work Logs ({task.workLogs?.length || 0})
                                        </h5>
                                        {task.workLogs && task.workLogs.length > 0 ? (
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {task.workLogs.map((log) => (
                                              <div
                                                key={log._id}
                                                className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-start justify-between gap-3 text-xs"
                                              >
                                                <div>
                                                  <div className="font-semibold text-slate-800">
                                                    {log.user
                                                      ? `${log.user.firstName || ''} ${log.user.lastName || ''}`
                                                      : 'Team Member'}
                                                  </div>
                                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                                    {log.description || 'No description'}
                                                  </div>
                                                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                                                    {log.date ? format(new Date(log.date), 'MMM d, yyyy') : ''}
                                                  </div>
                                                </div>
                                                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                  {log.hours}h
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-slate-400 italic">No work logged yet for this task.</p>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProjectHierarchy;
