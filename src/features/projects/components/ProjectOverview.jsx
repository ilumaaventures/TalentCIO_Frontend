import React, { useState, useEffect } from 'react';
import api from '@/lib/apiClient';
import {
  Folder,
  CheckSquare,
  Clock,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Circle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  Calendar,
  User,
  ChevronsDown,
  ChevronsUp
} from 'lucide-react';

/* ── status helpers ─────────────────────────────────────── */
const STATUS_META = {
  DONE:        { label: 'Done',        color: 'text-emerald-600', bg: 'bg-emerald-50',  Icon: CheckCircle2 },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-600',    bg: 'bg-blue-50',     Icon: Loader2      },
  IN_REVIEW:   { label: 'In Review',   color: 'text-purple-600',  bg: 'bg-purple-50',   Icon: AlertCircle  },
  BLOCKED:     { label: 'Blocked',     color: 'text-rose-600',    bg: 'bg-rose-50',     Icon: AlertCircle  },
  TODO:        { label: 'To Do',       color: 'text-slate-500',   bg: 'bg-slate-100',   Icon: Circle       },
};
const getStatusMeta = (s) => STATUS_META[s] || STATUS_META.TODO;

/* ── discussions constants ──────────────────────────────── */
const DISC_TABS = [
  { key: 'inprogress',       label: 'In Progress',   color: 'text-blue-600',    bg: 'bg-blue-50',    active: 'bg-blue-600 text-white' },
  { key: 'planning',        label: 'Planning',      color: 'text-purple-600',  bg: 'bg-purple-50',  active: 'bg-purple-600 text-white' },
  { key: 'on-hold',         label: 'On Hold',       color: 'text-amber-600',   bg: 'bg-amber-50',   active: 'bg-amber-500 text-white' },
  { key: 'mark as complete',label: 'Completed',     color: 'text-emerald-600', bg: 'bg-emerald-50', active: 'bg-emerald-600 text-white' },
];

const PRIORITY_COLORS = {
  Urgent: 'bg-rose-100 text-rose-700',
  High:   'bg-orange-100 text-orange-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low:    'bg-slate-100 text-slate-500',
};

/* ── full module discussion card ────────────────────────── */
const ModuleDiscussionCard = ({ discussion, onOpenDiscussion }) => {
  const tab = DISC_TABS.find((t) => t.key === discussion.status) || {
    label: discussion.status || 'In Progress',
    bg: 'bg-blue-50',
    color: 'text-blue-700'
  };
  const creator = discussion.createdBy;
  const creatorName = creator?.firstName
    ? `${creator.firstName} ${creator.lastName || ''}`.trim()
    : creator?.name || 'Unknown';
  const photo = creator?.profilePicture || creator?.profilePhoto;

  const rawSupervisors = Array.isArray(discussion.supervisor)
    ? discussion.supervisor
    : (discussion.supervisor ? [discussion.supervisor] : []);

  const hasCustomTitle = discussion.title && discussion.title.trim().toLowerCase() !== 'discussion';

  return (
    <div
      onClick={onOpenDiscussion}
      className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-blue-300 transition-all p-3.5 cursor-pointer group space-y-2.5"
    >
      {/* Top author row and badges */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {photo ? (
            <img src={photo} alt={creatorName} className="w-6 h-6 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {creatorName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-semibold text-slate-800 truncate">{creatorName}</span>
          {discussion.createdAt && (
            <span className="text-[11px] text-slate-400 shrink-0">
              • {new Date(discussion.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {discussion.priority && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[discussion.priority] || PRIORITY_COLORS.Medium}`}>
              {discussion.priority}
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tab.bg} ${tab.color}`}>
            {tab.label}
          </span>
          {discussion.hours !== undefined && discussion.hours !== null && discussion.hours !== '' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
              {discussion.hours}h planned
            </span>
          )}
        </div>
      </div>

      {/* Main Discussion Content */}
      <div className="space-y-1">
        {hasCustomTitle && (
          <h5 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
            {discussion.title}
          </h5>
        )}
        {discussion.discussion ? (
          <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
            {discussion.discussion}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No discussion notes provided.</p>
        )}
      </div>

      {/* Footer meta info: Due Date, Supervisor, Action Link */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          {discussion.dueDate && (
            <span className="flex items-center gap-1 text-slate-600">
              <Calendar size={12} className="text-slate-400" />
              Due: {new Date(discussion.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
          {rawSupervisors.length > 0 && (
            <span className="flex items-center gap-1 text-slate-600">
              <User size={12} className="text-slate-400" />
              Supervisor: {rawSupervisors.map(s => [s.firstName, s.lastName].filter(Boolean).join(' ') || s.name || 'Supervisor').join(', ')}
            </span>
          )}
          {discussion.totalLoggedHours > 0 && (
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <Clock size={12} />
              Logged: {discussion.totalLoggedHours}h
            </span>
          )}
        </div>

        <span className="text-blue-600 font-semibold group-hover:underline flex items-center gap-1 ml-auto">
          View in Discussions &rarr;
        </span>
      </div>
    </div>
  );
};

/* ── tiny priority pill ─────────────────────────────────── */
const PriorityPill = ({ priority }) => {
  const map = {
    HIGH:   'bg-rose-100 text-rose-700',
    MEDIUM: 'bg-amber-100 text-amber-700',
    LOW:    'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${map[priority] || map.LOW}`}>
      {priority || 'LOW'}
    </span>
  );
};

/* ── single task row ────────────────────────────────────── */
const TaskRow = ({ task, onSelectTask }) => {
  const meta = getStatusMeta(task.status);
  const StatusIcon = meta.Icon;
  const assignees = task.assignees || (task.assignee ? [task.assignee] : []);

  return (
    <div
      onClick={() => onSelectTask && onSelectTask(task._id || task)}
      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
    >
      <StatusIcon size={14} className={`flex-shrink-0 ${meta.color}`} />
      <span className="flex-1 text-sm text-slate-700 group-hover:text-slate-900 truncate">
        {task.name || task.title || '(Untitled)'}
      </span>
      <PriorityPill priority={task.priority} />
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color} hidden sm:inline`}>
        {meta.label}
      </span>
      {assignees.length > 0 && (
        <div className="flex -space-x-1.5 flex-shrink-0">
          {assignees.slice(0, 3).map((a, i) => {
            const name = a?.firstName
              ? `${a.firstName} ${a.lastName || ''}`.trim()
              : a?.name || a?.fullName || a?.email || 'Unknown';
            const photo = a?.profilePicture || a?.profilePhoto;
            return (
              <div key={i} className="relative group/av">
                {photo ? (
                  <img src={photo} alt={name}
                    className="w-6 h-6 rounded-full border-2 border-white object-cover cursor-default" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-[9px] font-bold text-white cursor-default">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-800 text-white text-[11px] font-medium rounded-lg whitespace-nowrap
                  opacity-0 group-hover/av:opacity-100 pointer-events-none transition-opacity duration-150 z-50 shadow-lg">
                  {name}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                </div>
              </div>
            );
          })}
          {assignees.length > 3 && (
            <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-600">
              +{assignees.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── expandable module card ─────────────────────────────── */
const ModuleCard = ({
  mod,
  tasks,
  discussions = [],
  canUpdateProject,
  onEditModule,
  onDeleteModule,
  onOpenCreateTask,
  onSelectTask,
  onViewDiscussions,
  isOpen,
  onToggle
}) => {
  const [internalOpen, setInternalOpen] = useState(true);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const handleToggle = onToggle || (() => setInternalOpen((v) => !v));

  const modTasks = tasks.filter(
    (t) => String(t.module?._id || t.module) === String(mod._id)
  );
  const modDiscussions = discussions.filter(
    (d) => String(d.module?._id || d.module) === String(mod._id)
  );
  const modCompleted = modTasks.filter((t) => t.status === 'DONE').length;
  const modPercent = modTasks.length > 0 ? Math.round((modCompleted / modTasks.length) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">
      {/* header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors select-none"
        onClick={handleToggle}
      >
        <span className="text-slate-400 flex-shrink-0">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <Folder size={15} className="text-blue-500 flex-shrink-0" />
        <span className="flex-1 font-semibold text-sm text-slate-800 truncate">{mod.name}</span>
        <span className="text-[11px] text-slate-400 flex-shrink-0">
          {modTasks.length} {modTasks.length === 1 ? 'task' : 'tasks'}
          {modDiscussions.length > 0 && ` • ${modDiscussions.length} ${modDiscussions.length === 1 ? 'discussion' : 'discussions'}`}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${modPercent === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
          {modPercent}%
        </span>
        {canUpdateProject && (
          <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {onEditModule && (
              <button onClick={() => onEditModule(mod)} className="text-slate-400 hover:text-slate-600 p-1 rounded">
                <Edit2 size={12} />
              </button>
            )}
            {onDeleteModule && (
              <button onClick={() => onDeleteModule(mod._id)} className="text-slate-400 hover:text-rose-600 p-1 rounded">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* progress bar */}
      <div className="px-4 pb-2">
        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${modPercent}%` }} />
        </div>
      </div>

      {/* task list */}
      {open && (
        <div className="border-t border-slate-100">
          {modTasks.length === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-400 italic">No tasks yet.</p>
          ) : (
            <div className="px-2 py-1 space-y-0.5">
              {modTasks.map((task) => (
                <TaskRow key={task._id} task={task} onSelectTask={onSelectTask} />
              ))}
            </div>
          )}
          {canUpdateProject && onOpenCreateTask && (
            <div className="px-4 pb-3 pt-1">
              <button onClick={() => onOpenCreateTask(mod._id)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Plus size={12} /> Add Task
              </button>
            </div>
          )}

          {/* Module discussions */}
          {modDiscussions.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 uppercase tracking-wide">
                  <MessageSquare size={12} className="text-blue-500" />
                  Module Discussions ({modDiscussions.length})
                </span>
                {onViewDiscussions && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onViewDiscussions(mod._id);
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    Open Discussions Tab &rarr;
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {modDiscussions.map((d) => (
                  <ModuleDiscussionCard
                    key={d._id}
                    discussion={d}
                    onOpenDiscussion={(e) => {
                      e?.stopPropagation();
                      if (onViewDiscussions) onViewDiscussions(mod._id);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Discussions Section ────────────────────────────────── */
const DiscussionsSection = ({ projectId, onViewDiscussions }) => {
  const [activeTab, setActiveTab] = useState('inprogress');
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api.get(`/discussions?project=${projectId}&limit=100`)
      .then(res => {
        const list = res.data?.discussions || res.data?.data || res.data || [];
        setDiscussions(Array.isArray(list) ? list : []);
      })
      .catch(() => setDiscussions([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  const filtered = discussions.filter(d => d.status === activeTab);

  const tabCounts = {};
  DISC_TABS.forEach(t => { tabCounts[t.key] = discussions.filter(d => d.status === t.key).length; });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Discussions</h3>
          <span className="text-[11px] text-slate-400 ml-1">({discussions.length})</span>
        </div>

        {onViewDiscussions && (
          <button
            onClick={onViewDiscussions}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Go to Discussions Tab & Log Time</span> &rarr;
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {DISC_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === tab.key ? tab.active : `${tab.bg} ${tab.color} hover:opacity-80`
            }`}
          >
            {tab.label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              activeTab === tab.key ? 'bg-white/30' : 'bg-white/80'
            }`}>
              {tabCounts[tab.key] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Discussion cards */}
      <div className="space-y-2">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 text-center text-slate-400 text-sm">
            Loading discussions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 text-center text-slate-400 text-sm">
            No {DISC_TABS.find(t => t.key === activeTab)?.label.toLowerCase()} discussions.
          </div>
        ) : (
          filtered.map(disc => {
            const tab = DISC_TABS.find(t => t.key === disc.status);
            const creator = disc.createdBy;
            const creatorName = creator?.firstName
              ? `${creator.firstName} ${creator.lastName || ''}`.trim()
              : creator?.name || 'Unknown';
            const photo = creator?.profilePicture || creator?.profilePhoto;
            const supervisors = disc.supervisor || [];

            return (
              <div key={disc._id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all p-4">
                <div className="flex items-start gap-3">
                  {/* creator avatar */}
                  {photo ? (
                    <img src={photo} alt={creatorName} className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                      {creatorName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* title row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-800 truncate">{disc.title}</span>
                      {disc.priority && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[disc.priority] || PRIORITY_COLORS.Low}`}>
                          {disc.priority}
                        </span>
                      )}
                      {tab && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tab.bg} ${tab.color}`}>
                          {tab.label}
                        </span>
                      )}
                      {disc.module?.name && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <Folder size={10} className="text-blue-500" />
                          {disc.module.name}
                        </span>
                      )}
                    </div>

                    {/* body preview */}
                    {disc.discussion && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{disc.discussion}</p>
                    )}

                    {/* meta row */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {/* creator */}
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <User size={11} /> {creatorName}
                      </span>

                      {/* due date */}
                      {disc.dueDate && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Calendar size={11} />
                          {new Date(disc.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      )}

                      {/* hours */}
                      {disc.hours != null && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock size={11} /> {disc.hours}h
                        </span>
                      )}

                      {/* supervisors */}
                      {supervisors.length > 0 && (
                        <div className="flex -space-x-1.5 ml-auto">
                          {supervisors.slice(0, 4).map((sup, i) => {
                            const sName = sup?.firstName ? `${sup.firstName} ${sup.lastName || ''}`.trim() : sup?.name || '?';
                            const sPhoto = sup?.profilePicture || sup?.profilePhoto;
                            return (
                              <div key={i} className="relative group/sup">
                                {sPhoto ? (
                                  <img src={sPhoto} alt={sName}
                                    className="w-6 h-6 rounded-full border-2 border-white object-cover cursor-pointer" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full border-2 border-white bg-indigo-500 flex items-center justify-center text-[9px] font-bold text-white cursor-pointer">
                                    {sName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                {/* tooltip — right-anchored to avoid overflow */}
                                <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-slate-800 text-white text-[11px] font-medium rounded-lg whitespace-nowrap
                                  opacity-0 group-hover/sup:opacity-100 pointer-events-none transition-opacity duration-150 z-50 shadow-lg">
                                  {sName}
                                  <div className="absolute top-full right-2 border-4 border-transparent border-t-slate-800" />
                                </div>
                              </div>
                            );
                          })}
                          {supervisors.length > 4 && (
                            <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-600">
                              +{supervisors.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export const ProjectOverview = ({
  project,
  projectId,
  modules = [],
  tasks = [],
  onOpenCreateModule,
  onOpenCreateTask,
  onEditModule,
  onDeleteModule,
  onSelectTask,
  canUpdateProject,
  onViewDiscussions
}) => {
  const totalModules = modules.length;
  const completedModules = modules.filter(m => m.status === 'COMPLETED').length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'DONE').length;
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;

  const totalEstimatedHours = Number(project?.estimatedHours || tasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0));
  const totalLoggedHours = Number(project?.totalLoggedHours || 0);
  const remainingHours = Math.max(0, totalEstimatedHours - totalLoggedHours);
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Track which modules are expanded / collapsed
  const [openModuleIds, setOpenModuleIds] = useState(() => new Set(modules.map(m => String(m._id))));

  useEffect(() => {
    if (modules.length > 0) {
      setOpenModuleIds(prev => {
        if (prev.size === 0) {
          return new Set(modules.map(m => String(m._id)));
        }
        const next = new Set(prev);
        modules.forEach(m => {
          const id = String(m._id);
          if (!prev.has(id)) next.add(id);
        });
        return next;
      });
    }
  }, [modules]);

  const [projectDiscussions, setProjectDiscussions] = useState([]);

  useEffect(() => {
    const pId = projectId || project?._id;
    if (!pId) return;
    api.get(`/discussions?project=${pId}&limit=200`)
      .then(res => {
        const list = res.data?.discussions || res.data?.data || res.data || [];
        setProjectDiscussions(Array.isArray(list) ? list : []);
      })
      .catch(() => setProjectDiscussions([]));
  }, [projectId, project?._id]);

  const handleExpandAll = () => {
    setOpenModuleIds(new Set(modules.map(m => String(m._id))));
  };

  const handleCollapseAll = () => {
    setOpenModuleIds(new Set());
  };

  const handleToggleModule = (modId) => {
    const id = String(modId);
    setOpenModuleIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards Row: Total Modules -> Total Tasks -> Completed -> In Progress */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Modules */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Modules
          </span>
          <div className="text-2xl font-bold text-slate-800">{totalModules}</div>
          <div className="text-[11px] text-slate-500">
            {completedModules > 0 ? `${completedModules} completed` : `${totalModules} modules`}
          </div>
        </div>

        {/* Total Tasks */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Tasks
          </span>
          <div className="text-2xl font-bold text-slate-800">{totalTasks}</div>
          <div className="text-[11px] text-slate-500">
            Across {totalModules} {totalModules === 1 ? 'module' : 'modules'}
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
            Completed
          </span>
          <div className="text-2xl font-bold text-emerald-600">{completedTasks}</div>
          <div className="text-[11px] text-slate-500">
            {Math.round(progressPercent)}% completion rate
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
            In Progress
          </span>
          <div className="text-2xl font-bold text-blue-600">{inProgressTasks}</div>
          <div className="text-[11px] text-slate-500">Active tasks</div>
        </div>
      </div>

      {/* Progress & Time Budget Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Task Completion Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <CheckSquare size={16} className="text-blue-600" />
              Overall Project Progress
            </span>
            <span className="font-bold text-slate-900">
              {completedTasks} of {totalTasks} Tasks ({Math.round(progressPercent)}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Started</span>
            <span>{Math.round(100 - progressPercent)}% remaining</span>
            <span>Target: 100%</span>
          </div>
        </div>

        {/* Hours Tracking */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Clock size={16} className="text-emerald-600" />
              Hours Budget
            </span>
            <span className="font-bold text-slate-900">
              {totalLoggedHours}h Logged / {totalEstimatedHours}h Estimated
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalLoggedHours > totalEstimatedHours && totalEstimatedHours > 0
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{
                width: `${totalEstimatedHours > 0 ? Math.min(100, (totalLoggedHours / totalEstimatedHours) * 100) : (totalLoggedHours > 0 ? 100 : 0)}%`
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Logged: <b>{totalLoggedHours}h</b></span>
            <span>Remaining: <b>{remainingHours}h</b></span>
            <span>Estimated: <b>{totalEstimatedHours}h</b></span>
          </div>
        </div>
      </div>

      {/* Modules & Tasks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2.5">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Folder size={18} className="text-blue-600" />
            Modules &amp; Tasks
            <span className="text-xs font-semibold text-slate-400 normal-case">
              ({modules.length})
            </span>
          </h3>

          <div className="flex items-center gap-2 flex-wrap">
            {modules.length > 0 && (
              <div className="flex items-center bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/80">
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                  title="Expand all modules"
                >
                  <ChevronsDown size={13} />
                  <span>Expand All</span>
                </button>
                <div className="w-[1px] h-3.5 bg-slate-200" />
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                  title="Collapse all modules"
                >
                  <ChevronsUp size={13} />
                  <span>Collapse All</span>
                </button>
              </div>
            )}

            {canUpdateProject && onOpenCreateModule && (
              <button
                onClick={onOpenCreateModule}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add Module
              </button>
            )}
          </div>
        </div>

        {modules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 text-center text-slate-400 text-sm">
            No modules yet. Create your first module to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {modules.map((mod) => (
              <ModuleCard
                key={mod._id}
                mod={mod}
                tasks={tasks}
                discussions={projectDiscussions}
                canUpdateProject={canUpdateProject}
                onEditModule={onEditModule}
                onDeleteModule={onDeleteModule}
                onOpenCreateTask={onOpenCreateTask}
                onSelectTask={onSelectTask}
                onViewDiscussions={onViewDiscussions}
                isOpen={openModuleIds.has(String(mod._id))}
                onToggle={() => handleToggleModule(mod._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Discussions ── */}
      <DiscussionsSection projectId={projectId || project?._id} onViewDiscussions={onViewDiscussions} />
    </div>
  );
};

export default ProjectOverview;
