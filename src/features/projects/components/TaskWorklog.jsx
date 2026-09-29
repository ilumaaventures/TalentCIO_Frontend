import React, { useState } from 'react';
import { Clock, Plus, Trash2, Calendar, User, FileText, CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';

export const TaskWorklog = ({
  task,
  worklogs = [],
  onLogWork,
  onDeleteWorkLog,
  submitting = false
}) => {
  const [showLogForm, setShowLogForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');

  const estimated = Number(task?.estimatedHours || 0);
  const totalLogged = Number(
    worklogs.reduce((sum, w) => sum + (Number(w.hours) || 0), 0).toFixed(2)
  );
  const remaining = Math.max(0, estimated - totalLogged);
  const percent = estimated > 0 ? Math.min(100, Math.round((totalLogged / estimated) * 100)) : (totalLogged > 0 ? 100 : 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hours || Number(hours) <= 0) return;

    try {
      await onLogWork({
        date,
        hours: Number(hours),
        description: description.trim()
      });
      setHours('');
      setDescription('');
      setShowLogForm(false);
    } catch {
      // error handled by hook toast
    }
  };

  return (
    <div className="space-y-6">
      {/* Time Tracking Overview Card */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Time Tracking</h4>
              <p className="text-xs text-slate-500">Track and manage billable work hours</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowLogForm(!showLogForm)}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <Plus size={14} /> {showLogForm ? 'Cancel' : 'Log Time'}
          </Button>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1.5">
            <span>Progress ({percent}%)</span>
            <span>
              <strong className="text-slate-800">{totalLogged}h</strong> logged of {estimated > 0 ? `${estimated}h estimate` : 'no estimate'}
            </span>
          </div>
          <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalLogged > estimated && estimated > 0 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-center">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Logged</span>
            <span className="text-lg font-bold text-slate-900">{totalLogged}h</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-center">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Estimated</span>
            <span className="text-lg font-bold text-slate-900">{estimated}h</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-center">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Remaining</span>
            <span className="text-lg font-bold text-slate-900">{remaining}h</span>
          </div>
        </div>
      </div>

      {/* Log Work Form */}
      {showLogForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-blue-600" /> Record Work Done
            </h5>
            <span className="text-[11px] text-slate-400">Task: {task?.name}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hours Spent <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                required
                placeholder="e.g. 2.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="What did you work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowLogForm(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={submitting || !hours}
              className="text-xs font-semibold px-4 py-1.5"
            >
              {submitting ? 'Saving...' : 'Save Work Log'}
            </Button>
          </div>
        </form>
      )}

      {/* Worklogs List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={13} className="text-slate-500" /> Work Logs ({worklogs.length})
          </h4>
        </div>

        {worklogs.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Clock size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-medium text-slate-600">No work logged yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Click "Log Time" above to record hours worked on this task.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            {worklogs.map((log) => {
              const u = log.user;
              const userName = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : 'Team Member';
              const initial = (u?.firstName?.[0] || 'U').toUpperCase();
              const formattedDate = log.date
                ? new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Recent';

              return (
                <div key={log._id} className="p-3.5 hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 border border-blue-200">
                      {initial}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">{userName}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <Calendar size={11} /> {formattedDate}
                        </span>
                      </div>
                      {log.description ? (
                        <p className="text-xs text-slate-600 break-words">{log.description}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No notes entered</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {log.hours}h
                    </span>
                    {onDeleteWorkLog && (
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this work log?')) {
                            onDeleteWorkLog(log._id);
                          }
                        }}
                        className="text-slate-300 hover:text-rose-500 p-1 rounded-md transition-colors cursor-pointer"
                        title="Delete log"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskWorklog;
