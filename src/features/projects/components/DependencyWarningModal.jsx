import React from 'react';
import { AlertTriangle, ShieldAlert, ArrowRight, X } from 'lucide-react';
import Button from '@/components/ui/Button';

export const DependencyWarningModal = ({
  isOpen,
  task,
  targetStatus = 'IN_PROGRESS',
  onConfirm,
  onCancel
}) => {
  if (!isOpen || !task) return null;

  const unresolvedBlockers = Array.isArray(task.blockedBy)
    ? task.blockedBy.filter(b => (typeof b === 'object' ? b.status !== 'DONE' : true))
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rose-100 bg-rose-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Unresolved Dependencies
              </h3>
              <p className="text-xs text-rose-700">
                This task has blockers that are not yet finished
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <span className="font-mono font-bold text-slate-700 mr-2">
              {task.taskKey || task.key || 'TASK'}
            </span>
            <span className="font-semibold text-slate-800">{task.name}</span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            You are moving this task into <span className="font-bold text-slate-900">{targetStatus.replace('_', ' ')}</span>, but the following required tasks are still pending:
          </p>

          {/* Blockers list */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {unresolvedBlockers.map((blocker, idx) => (
              <div
                key={blocker._id || idx}
                className="flex items-center justify-between p-2.5 rounded-xl border border-rose-200 bg-rose-50/40 text-xs"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 shrink-0">
                    {blocker.taskKey || 'BLOCKED'}
                  </span>
                  <span className="font-medium text-slate-800 truncate" title={blocker.name}>
                    {blocker.name}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 shrink-0">
                  {blocker.status || 'PENDING'}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] p-3 rounded-xl flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
            <span>
              Starting this task before its prerequisites are complete may cause rework or delays.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white transition-colors cursor-pointer"
          >
            Cancel Move
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            Proceed Anyway <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DependencyWarningModal;
