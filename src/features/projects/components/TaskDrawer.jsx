import React, { useState } from 'react';
import {
  X,
  Clock,
  Calendar,
  Tag,
  User,
  History,
  Folder,
  Edit,
  FileText
} from 'lucide-react';
import useTask from '../hooks/useTask';
import TaskWorklog from './TaskWorklog';
import TaskActivity from './TaskActivity';
import EditTaskModal from './EditTaskModal';

const STATUS_MAP = {
  TODO: { label: 'To Do', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  REVIEW: { label: 'Review', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  DONE: { label: 'Done', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  BLOCKED: { label: 'Blocked', color: 'bg-rose-50 text-rose-700 border-rose-200' }
};

const PRIORITY_MAP = {
  URGENT: { label: 'Urgent', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  CRITICAL: { label: 'Urgent', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  HIGH: { label: 'High', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  MEDIUM: { label: 'Medium', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  LOW: { label: 'Low', color: 'text-slate-600 bg-slate-100 border-slate-200' }
};

export const TaskDrawer = ({
  taskId,
  isOpen,
  onClose,
  allTasks = [],
  employees = [],
  modules = [],
  project,
  onTaskUpdated
}) => {
  const {
    task,
    worklogs,
    activity,
    loading,
    submitting,
    updateFullTask,
    logWork,
    deleteWorkLog
  } = useTask(taskId, onTaskUpdated);

  const [activeTab, setActiveTab] = useState('details'); // 'details', 'worklogs', 'activity'
  const [showEditModal, setShowEditModal] = useState(false);

  if (!isOpen) return null;

  const estimated = Number(task?.estimatedHours || 0);
  const totalLogged = Number(
    worklogs.reduce((sum, w) => sum + (Number(w.hours) || 0), 0).toFixed(2)
  );
  const remaining = Math.max(0, estimated - totalLogged);
  const percent = estimated > 0 ? Math.min(100, Math.round((totalLogged / estimated) * 100)) : (totalLogged > 0 ? 100 : 0);

  const moduleName =
    task?.module?.name ||
    modules.find((m) => String(m._id) === String(task?.module?._id || task?.module))?.name ||
    'Module';

  const statusConfig = STATUS_MAP[task?.status] || {
    label: task?.status || 'To Do',
    color: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const priorityConfig = PRIORITY_MAP[task?.priority] || {
    label: task?.priority || 'Medium',
    color: 'text-blue-700 bg-blue-50 border-blue-200'
  };

  const formattedDueDate = task?.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'No due date';

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={onClose}
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
          <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-all animate-in slide-in-from-right duration-250">
            {/* Header with Module Badge, Edit Task Button and Close Button */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs">
                  <Folder size={13} className="text-blue-600" />
                  {moduleName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  <Edit size={13} />
                  Edit Task
                </button>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loading && !task ? (
                <div className="py-20 text-center text-slate-400 text-sm">
                  Loading task details...
                </div>
              ) : (
                <>
                  {/* Title Section (Clean, Read-only Heading) */}
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 select-text leading-tight">
                      {task?.name}
                    </h2>
                  </div>

                  {/* Attributes Bar (Clean, Read-only Badges/Values) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    {/* Status */}
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Status
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusConfig.color}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Priority */}
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Priority
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${priorityConfig.color}`}
                      >
                        {priorityConfig.label}
                      </span>
                    </div>

                    {/* Due Date */}
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Due Date
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 py-1">
                        <Calendar size={13} className="text-slate-400" />
                        {formattedDueDate}
                      </span>
                    </div>

                    {/* Module */}
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Module
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 py-1 truncate block"
                        title={moduleName}
                      >
                        <Folder size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{moduleName}</span>
                      </span>
                    </div>
                  </div>

                  {/* Navigation Tabs (Only Details, Worklogs, Activity) */}
                  <div className="flex border-b border-slate-200 text-xs font-medium space-x-6">
                    <button
                      onClick={() => setActiveTab('details')}
                      className={`pb-2.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'details'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <FileText size={14} /> Details
                    </button>
                    <button
                      onClick={() => setActiveTab('worklogs')}
                      className={`pb-2.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'worklogs'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Clock size={14} /> Worklogs ({worklogs.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('activity')}
                      className={`pb-2.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'activity'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <History size={14} /> Activity ({activity.length})
                    </button>
                  </div>

                  {/* Tab 1: Details */}
                  {activeTab === 'details' && (
                    <div className="space-y-6">
                      {/* Description */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Description
                        </h4>
                        <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs text-slate-700 min-h-[60px] whitespace-pre-wrap leading-relaxed">
                          {task?.description ? (
                            task.description
                          ) : (
                            <span className="text-slate-400 italic">No description provided.</span>
                          )}
                        </div>
                      </div>

                      {/* People Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        {/* Assignees */}
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                            Assignees
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {Array.isArray(task?.assignees) && task.assignees.length > 0 ? (
                              task.assignees.map((a) => (
                                <span
                                  key={a._id || a}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium text-xs"
                                >
                                  <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 text-[10px] font-bold flex items-center justify-center">
                                    {(a.firstName?.[0] || 'U').toUpperCase()}
                                  </span>
                                  {a.firstName ? `${a.firstName} ${a.lastName}` : 'Assigned User'}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic text-xs">Unassigned</span>
                            )}
                          </div>
                        </div>

                        {/* Reporter */}
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                            Reporter
                          </span>
                          <div>
                            {task?.reporter ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium text-xs border border-slate-200">
                                <span className="w-4 h-4 rounded-full bg-slate-300 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                                  {(task.reporter.firstName?.[0] || 'U').toUpperCase()}
                                </span>
                                {task.reporter.firstName} {task.reporter.lastName}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Not recorded</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Time Tracking Progress Card */}
                      <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <Clock size={14} className="text-blue-600" /> Time Tracking
                          </span>
                          <button
                            onClick={() => setActiveTab('worklogs')}
                            className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                          >
                            View Worklogs &rarr;
                          </button>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              totalLogged > estimated && estimated > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${percent}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>
                            Logged: <b>{totalLogged}h</b>
                          </span>
                          <span>
                            Estimated: <b>{estimated}h</b>
                          </span>
                          <span>
                            Remaining: <b>{remaining}h</b>
                          </span>
                        </div>
                      </div>

                      {/* Labels / Tags */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Tag size={13} className="text-slate-500" /> Labels
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {Array.isArray(task?.labels) && task.labels.length > 0 ? (
                            task.labels.map((lbl, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 font-medium"
                              >
                                #{lbl}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs italic">No labels</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Worklogs */}
                  {activeTab === 'worklogs' && (
                    <TaskWorklog
                      task={task}
                      worklogs={worklogs}
                      onLogWork={logWork}
                      onDeleteWorkLog={deleteWorkLog}
                      submitting={submitting}
                    />
                  )}

                  {/* Tab 3: Activity Log */}
                  {activeTab === 'activity' && <TaskActivity activity={activity} />}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Task Modal */}
      <EditTaskModal
        task={task}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        modules={modules}
        employees={employees}
        project={project}
        onSave={updateFullTask}
      />
    </>
  );
};

export default TaskDrawer;
