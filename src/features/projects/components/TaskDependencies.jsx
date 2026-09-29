import React, { useState } from 'react';
import { ShieldAlert, ArrowRight, Plus, X } from 'lucide-react';

export const TaskDependencies = ({
  task,
  allTasks = [],
  onUpdateBlockedBy,
  onOpenTask
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  const blockedBy = Array.isArray(task.blockedBy) ? task.blockedBy : [];
  const blocks = Array.isArray(task.blocks) ? task.blocks : [];

  // Available tasks to add as blockers (exclude self and current blockers)
  const currentBlockerIds = new Set(blockedBy.map(b => String(b._id || b)));
  const availableCandidates = allTasks.filter(t => {
    return String(t._id) !== String(task._id) && !currentBlockerIds.has(String(t._id));
  });

  const handleAdd = () => {
    if (!selectedTaskId) return;
    const newBlockedByIds = [...blockedBy.map(b => b._id || b), selectedTaskId];
    onUpdateBlockedBy(newBlockedByIds);
    setSelectedTaskId('');
    setIsAdding(false);
  };

  const handleRemove = (blockerId) => {
    const newBlockedByIds = blockedBy
      .filter(b => String(b._id || b) !== String(blockerId))
      .map(b => b._id || b);
    onUpdateBlockedBy(newBlockedByIds);
  };

  return (
    <div className="space-y-4">
      {/* Blocked by Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-rose-500" />
            Blocked By ({blockedBy.length})
          </h4>
          {!isAdding && availableCandidates.length > 0 && (
            <button
              onClick={() => setIsAdding(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus size={13} /> Add Blocker
            </button>
          )}
        </div>

        {/* Add Blocker Form */}
        {isAdding && (
          <div className="flex gap-2 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
            >
              <option value="">Select a blocking task...</option>
              {availableCandidates.map(t => (
                <option key={t._id} value={t._id}>
                  {t.taskKey || t.key} — {t.name} ({t.status})
                </option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={!selectedTaskId}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
            >
              Confirm
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-2 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Blocker Items */}
        {blockedBy.length > 0 ? (
          <div className="space-y-1.5">
            {blockedBy.map((blocker) => {
              const b = typeof blocker === 'object' ? blocker : { _id: blocker, name: 'Task' };
              const isResolved = b.status === 'DONE';
              return (
                <div
                  key={b._id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {b.taskKey || b.key || 'TASK'}
                    </span>
                    <button
                      onClick={() => onOpenTask && onOpenTask(b)}
                      className="text-xs font-medium text-slate-800 hover:underline truncate"
                    >
                      {b.name}
                    </button>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      isResolved
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {b.status || 'TODO'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemove(b._id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                    title="Remove dependency"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No tasks blocking this work.</p>
        )}
      </div>

      {/* Blocks (Outgoing Dependencies) */}
      <div className="pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <ArrowRight size={14} className="text-blue-500" />
          Blocks ({blocks.length})
        </h4>

        {blocks.length > 0 ? (
          <div className="space-y-1.5">
            {blocks.map((blockedItem) => (
              <div
                key={blockedItem._id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {blockedItem.taskKey || blockedItem.key}
                  </span>
                  <button
                    onClick={() => onOpenTask && onOpenTask(blockedItem)}
                    className="text-xs font-medium text-slate-800 hover:underline truncate"
                  >
                    {blockedItem.name}
                  </button>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {blockedItem.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">This task is not blocking any other tasks.</p>
        )}
      </div>
    </div>
  );
};

export default TaskDependencies;
