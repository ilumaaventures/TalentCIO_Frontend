import React from 'react';
import { History, ArrowRight } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const formatActivityText = (act) => {
  const authorName = act.changedBy ? `${act.changedBy.firstName || ''} ${act.changedBy.lastName || ''}`.trim() : 'A user';
  const fieldName = act.field;

  if (fieldName === 'status') {
    return {
      title: `${authorName} changed status`,
      detail: (
        <span className="flex items-center gap-1.5 font-semibold">
          <span className="text-slate-500">{act.oldValue || 'None'}</span>
          <ArrowRight size={12} className="text-slate-400" />
          <span className="text-blue-600">{act.newValue}</span>
        </span>
      )
    };
  }

  if (fieldName === 'priority') {
    return {
      title: `${authorName} changed priority`,
      detail: (
        <span className="flex items-center gap-1.5 font-semibold">
          <span className="text-slate-500">{act.oldValue || 'None'}</span>
          <ArrowRight size={12} className="text-slate-400" />
          <span className="text-blue-600">{act.newValue}</span>
        </span>
      )
    };
  }

  if (fieldName === 'assignees') {
    return {
      title: `${authorName} updated assignees`,
      detail: null
    };
  }

  if (fieldName === 'storyPoints') {
    return {
      title: `${authorName} changed story points`,
      detail: `${act.oldValue || 0} → ${act.newValue || 0} SP`
    };
  }

  if (fieldName === 'estimatedHours') {
    return {
      title: `${authorName} changed estimate`,
      detail: `${act.oldValue || 0}h → ${act.newValue || 0}h`
    };
  }

  if (fieldName === 'dueDate') {
    const oldD = act.oldValue ? format(new Date(act.oldValue), 'MMM d, yyyy') : 'None';
    const newD = act.newValue ? format(new Date(act.newValue), 'MMM d, yyyy') : 'None';
    return {
      title: `${authorName} changed due date`,
      detail: `${oldD} → ${newD}`
    };
  }

  return {
    title: `${authorName} updated ${fieldName}`,
    detail: null
  };
};

export const TaskActivity = ({ activity = [] }) => {
  if (activity.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-xs italic">
        No activity records logged yet for this task.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {activity.map((act) => {
        const { title, detail } = formatActivityText(act);
        const timeAgo = act.createdAt ? formatDistanceToNow(new Date(act.createdAt), { addSuffix: true }) : '';

        return (
          <div key={act._id} className="relative group">
            {/* Timeline node icon */}
            <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-blue-600 shadow-xs" />

            <div className="text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-semibold text-slate-800">{title}</span>
                <span className="text-[11px] text-slate-400">{timeAgo}</span>
              </div>
              {detail && (
                <div className="mt-1 text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/60 inline-block">
                  {detail}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TaskActivity;
