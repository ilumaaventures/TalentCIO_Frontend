import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';

export const TaskSubtasks = ({
  subtasks = [],
  onAddSubtask,
  onToggleStatus,
  onOpenSubtask
}) => {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const completedCount = subtasks.filter(s => s.status === 'DONE').length;
  const totalCount = subtasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    onAddSubtask(newSubtaskTitle.trim());
    setNewSubtaskTitle('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      {/* Progress Bar & Counter */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
          <span className="flex items-center gap-1.5">
            <CheckSquare size={14} className="text-blue-600" />
            Subtasks Progress
          </span>
          <span>
            {completedCount} / {totalCount} completed ({Math.round(progressPercent)}%)
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              completedCount === totalCount && totalCount > 0 ? 'bg-emerald-500' : 'bg-blue-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Subtasks List */}
      <div className="space-y-1.5">
        {subtasks.map((st) => {
          const isDone = st.status === 'DONE';
          return (
            <div
              key={st._id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => onToggleStatus(st._id, st.status)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => onOpenSubtask && onOpenSubtask(st)}
                  className={`text-sm text-left truncate cursor-pointer hover:underline ${
                    isDone ? 'line-through text-slate-400' : 'text-slate-700 font-medium'
                  }`}
                >
                  <span className="font-mono text-xs text-slate-400 mr-2">
                    {st.taskKey || st.key}
                  </span>
                  {st.name}
                </button>
              </div>

              {/* Assignee Avatar */}
              {Array.isArray(st.assignees) && st.assignees.length > 0 && (
                <div
                  className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0"
                  title={`${st.assignees[0]?.firstName || ''} ${st.assignees[0]?.lastName || ''}`}
                >
                  {st.assignees[0]?.firstName?.[0] || 'U'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Subtask Input */}
      {isAdding ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Subtask title..."
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            autoFocus
            className="flex-1 px-3 py-1.5 bg-white border border-blue-400 rounded-lg text-sm outline-none shadow-xs"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline pt-1 cursor-pointer"
        >
          <Plus size={14} /> Add subtask
        </button>
      )}
    </div>
  );
};

export default TaskSubtasks;
