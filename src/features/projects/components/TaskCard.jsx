import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertCircle, Calendar, CheckSquare, Clock, ShieldAlert } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

const PRIORITY_CONFIG = {
  URGENT: { label: 'Urgent', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  CRITICAL: { label: 'Urgent', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  HIGH: { label: 'High', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  MEDIUM: { label: 'Medium', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  LOW: { label: 'Low', bg: 'bg-slate-50 text-slate-600 border-slate-200' }
};

export const TaskCard = ({ task, onClick, onSelect, modules = [] }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: task._id,
    data: {
      type: 'Task',
      task,
      source: 'board',
      status: task.status
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(task._id);
    } else if (onClick) {
      onClick(task);
    }
  };

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
  const isOverdue = task.dueDate && task.status !== 'DONE' && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));
  const isBlocked = task.status === 'BLOCKED' || (Array.isArray(task.blockedBy) && task.blockedBy.length > 0);
  const subtasksTotal = task.subtaskStats?.total || 0;
  const subtasksCompleted = task.subtaskStats?.completed || 0;

  const moduleName = typeof task.module === 'object' && task.module?.name
    ? task.module.name
    : (modules.find(m => String(m._id) === String(task.module?._id || task.module))?.name);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className="group bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-grab active:cursor-grabbing select-none"
    >
      {/* Top Header: Task Key + Priority + Blocked Indicator */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
            {task.taskKey || task.key || 'TASK'}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${priority.bg}`}>
            {priority.label}
          </span>
          {moduleName && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-[120px]" title={`Module: ${moduleName}`}>
              {moduleName}
            </span>
          )}
        </div>

        {isBlocked && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200" title="This task has blocking dependencies">
            <ShieldAlert size={12} /> Blocked
          </span>
        )}
      </div>

      {/* Task Title */}
      <h4 className="text-sm font-semibold text-slate-800 line-clamp-2 mb-2.5 group-hover:text-blue-600 transition-colors">
        {task.name}
      </h4>

      {/* Labels */}
      {Array.isArray(task.labels) && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.labels.slice(0, 3).map((lbl, idx) => (
            <span
              key={idx}
              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200"
            >
              #{lbl}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="text-[10px] font-medium text-slate-400">
              +{task.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Subtasks Progress */}
      {subtasksTotal > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="flex items-center gap-1">
              <CheckSquare size={12} /> Subtasks
            </span>
            <span className="font-semibold text-slate-700">
              {subtasksCompleted}/{subtasksTotal}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                subtasksCompleted === subtasksTotal ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${(subtasksCompleted / subtasksTotal) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Card Footer: Assignee, Story Points, Due Date */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
        {/* Assignee Avatar */}
        <div className="flex items-center gap-1.5">
          {Array.isArray(task.assignees) && task.assignees.length > 0 ? (
            <div className="flex -space-x-1.5 overflow-hidden">
              {task.assignees.slice(0, 2).map((a, i) => {
                const pic = a.profilePicture || a.profilePhoto;
                return pic ? (
                  <img
                    key={a._id || i}
                    src={pic}
                    alt={`${a.firstName || ''} ${a.lastName || ''}`}
                    className="w-6 h-6 rounded-full object-cover border-2 border-white shadow-2xs"
                    title={`${a.firstName || ''} ${a.lastName || ''}`}
                  />
                ) : (
                  <div
                    key={a._id || i}
                    className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center border-2 border-white text-[10px]"
                    title={`${a.firstName || ''} ${a.lastName || ''}`}
                  >
                    {a.firstName?.[0] || 'U'}
                  </div>
                );
              })}
              {task.assignees.length > 2 && (
                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center border-2 border-white text-[10px]">
                  +{task.assignees.length - 2}
                </div>
              )}
            </div>
          ) : (
            <span className="text-slate-400 italic">Unassigned</span>
          )}
        </div>

        {/* Story Points & Due Date */}
        <div className="flex items-center gap-2">
          {task.storyPoints !== null && task.storyPoints !== undefined && (
            <span className="font-semibold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px]">
              {task.storyPoints} SP
            </span>
          )}

          {task.dueDate && (
            <span
              className={`flex items-center gap-1 font-medium ${
                isOverdue
                  ? 'text-rose-600 font-semibold'
                  : 'text-slate-500'
              }`}
              title={isOverdue ? 'Overdue' : 'Due date'}
            >
              <Calendar size={12} className={isOverdue ? 'text-rose-600' : ''} />
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
