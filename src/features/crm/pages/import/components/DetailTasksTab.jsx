import React from 'react';
import {
  Clock,
  CheckSquare,
  CheckCircle2,
  Trash2,
  Plus,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

export const DetailTasksTab = ({
  followUps = [],
  tasks = [],
  handleOpenOutreach,
  setIsTaskModalOpen,
  handleToggleTaskStatus,
  handleDeleteTask,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Scheduled Follow-ups Card */}
      <Card padding="lg" className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Scheduled Follow-ups</h3>
            <p className="text-xs text-slate-500 mt-0.5">Upcoming sales callbacks and meetings</p>
          </div>
          <Button size="sm" variant="outline" icon={Plus} onClick={() => handleOpenOutreach('followup')}>
            Schedule
          </Button>
        </div>

        <div className="space-y-2.5">
          {followUps.length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800">No scheduled callbacks</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Schedule a callback to ensure timely re-engagement.</p>
              <Button size="xs" className="mt-3" onClick={() => handleOpenOutreach('followup')}>
                + Schedule Follow-up
              </Button>
            </div>
          ) : (
            followUps.map((f) => (
              <div
                key={f._id || f.id}
                className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">{f.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {new Date(f.scheduledDate).toLocaleString()} • {f.type || 'Call'}
                    </p>
                    {f.notes && <p className="text-slate-600 mt-1 italic">{f.notes}</p>}
                  </div>
                </div>
                <Badge variant={f.status === 'completed' ? 'emerald' : 'amber'} size="sm">
                  {f.status || 'Pending'}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Associated Tasks Card */}
      <Card padding="lg" className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Prospect To-Dos & Tasks</h3>
            <p className="text-xs text-slate-500 mt-0.5">Deliverables, proposal drafts, research items</p>
          </div>
          <Button size="sm" icon={Plus} onClick={() => setIsTaskModalOpen(true)}>
            Add Task
          </Button>
        </div>

        <div className="space-y-2.5">
          {tasks.length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800">No active tasks</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Create to-dos to keep deal prep organized.</p>
              <Button size="xs" className="mt-3" onClick={() => setIsTaskModalOpen(true)}>
                + Create First Task
              </Button>
            </div>
          ) : (
            tasks.map((t) => {
              const isCompleted = t.status === 'Completed';
              return (
                <div
                  key={t._id}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                    isCompleted ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-slate-200/80 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggleTaskStatus(t._id)}
                      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer shrink-0 ${
                        isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                    </button>
                    <div className="min-w-0 pr-2">
                      <p className={`font-bold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {t.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span>Due: {t.dueDate}</span>
                        <span>•</span>
                        <span className="font-semibold text-indigo-600">{t.priority}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(t._id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
