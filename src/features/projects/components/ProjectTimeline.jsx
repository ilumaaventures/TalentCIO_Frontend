import React, { useState, useMemo } from 'react';
import { Briefcase, Calendar, ChevronDown, ChevronRight, Clock, Folder, Search, X } from 'lucide-react';
import { format, differenceInDays, addDays, isValid } from 'date-fns';

export const ProjectTimeline = ({
  project,
  modules = [],
  tasks = [],
  onSelectTask
}) => {
  const [timelineScale, setTimelineScale] = useState('MONTH'); // 'WEEK', 'MONTH', 'QUARTER'
  const [expandedModules, setExpandedModules] = useState(new Set(modules.map(m => m._id)));
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleModule = (modId) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(modId)) next.delete(modId);
      else next.add(modId);
      return next;
    });
  };

  const toggleTask = (taskId) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // Filter modules and tasks based on search
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return modules;
    const q = searchQuery.toLowerCase().trim();
    return modules.map(m => {
      const matchModule = (m.name || '').toLowerCase().includes(q);
      const filteredTasks = (m.tasks || []).filter(t =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.taskKey || t.key || '').toLowerCase().includes(q)
      );
      return {
        ...m,
        tasks: matchModule ? (m.tasks || []) : filteredTasks,
        _isVisible: matchModule || filteredTasks.length > 0
      };
    }).filter(m => m._isVisible);
  }, [modules, searchQuery]);

  // Calculate timeline range
  const allDates = [
    project?.startDate,
    project?.dueDate,
    ...modules.flatMap(m => [m.startDate, m.dueDate]),
    ...tasks.flatMap(t => [t.startDate, t.dueDate, ...(t.workLogs?.map(l => l.date) || [])])
  ]
    .filter(d => d && isValid(new Date(d)))
    .map(d => new Date(d));

  if (allDates.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 flex flex-col items-center justify-center text-slate-500 shadow-xs">
        <Calendar size={48} className="text-slate-300 mb-4" />
        <p className="text-base font-semibold text-slate-700">No schedule data available</p>
        <p className="text-xs text-slate-400 mt-1">Set start and due dates on tasks or modules to view the Gantt timeline.</p>
      </div>
    );
  }

  const projectStart = new Date(Math.min(...allDates));
  const projectEnd = new Date(Math.max(...allDates));

  let start, end;
  if (timelineScale === 'WEEK') {
    start = addDays(projectStart, -7);
    end = addDays(projectEnd, 7);
  } else if (timelineScale === 'QUARTER') {
    start = addDays(projectStart, -30);
    end = addDays(projectEnd, 30);
  } else {
    // MONTH default
    start = addDays(projectStart, -15);
    end = addDays(projectEnd, 15);
  }

  const totalDays = Math.max(differenceInDays(end, start) + 1, 1);

  const getPosition = (date) => {
    if (!date || !isValid(new Date(date))) return -100;
    return (differenceInDays(new Date(date), start) / totalDays) * 100;
  };

  const getWidth = (s, e) => {
    const sDate = s ? new Date(s) : start;
    const eDate = e ? new Date(e) : sDate;
    const validS = isValid(sDate) ? sDate : start;
    const validE = isValid(eDate) ? eDate : validS;
    return Math.max((differenceInDays(validE, validS) / totalDays) * 100, 0.5);
  };

  const ticks = [];
  const tickCount = timelineScale === 'WEEK' ? 7 : timelineScale === 'QUARTER' ? 6 : 10;

  for (let i = 0; i <= tickCount; i++) {
    const date = addDays(start, Math.round((totalDays / tickCount) * i));
    ticks.push({ left: (i / tickCount) * 100, label: format(date, 'MMM d') });
  }

  const todayPos = getPosition(new Date());

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden flex flex-col h-[calc(100vh-220px)] min-h-[550px]">
      {/* Controls & Legend */}
      <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row justify-between items-center gap-4 z-40 sticky top-0">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Zoom scale selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Zoom:</span>
            <div className="flex bg-white rounded-xl border border-slate-200 p-0.5 shadow-2xs">
              {['WEEK', 'MONTH', 'QUARTER'].map((scale) => (
                <button
                  key={scale}
                  onClick={() => setTimelineScale(scale)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    timelineScale === scale
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {scale.charAt(0) + scale.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Search box on Timeline */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              placeholder="Search timeline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-5 text-xs font-medium text-slate-600 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-700 rounded-sm"></div> Project
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-cyan-600 rounded-sm"></div> Module
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Done
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-amber-500 rounded-sm"></div> Work Log
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-3 bg-rose-500"></div> Today
          </div>
        </div>
      </div>

      {/* Timeline Header */}
      <div className="flex border-b border-slate-200/80 bg-white shadow-2xs h-10">
        {/* Left Column Headers */}
        <div className="flex w-[480px] shrink-0 border-r border-slate-200 bg-slate-50/70 text-slate-600">
          <div className="flex-1 p-2 pl-4 font-bold text-xs uppercase flex items-center">
            Item Name
          </div>
          <div className="w-24 p-2 font-bold text-xs uppercase flex items-center justify-center border-l border-slate-200">
            Status
          </div>
          <div className="w-20 p-2 font-bold text-xs uppercase flex items-center justify-center border-l border-slate-200">
            Assignees
          </div>
          <div className="w-24 p-2 font-bold text-xs uppercase flex items-center border-l border-slate-200 pl-3">
            Progress
          </div>
        </div>

        {/* Date Ticks on Timeline */}
        <div className="flex-1 relative overflow-hidden h-full bg-slate-50/40">
          {ticks.map((tick, i) => (
            <div
              key={i}
              className="absolute bottom-0 flex flex-col items-center transform -translate-x-1/2"
              style={{ left: `${tick.left}%` }}
            >
              <span className="text-[10px] text-slate-500 font-semibold mb-1 whitespace-nowrap">
                {tick.label}
              </span>
              <div className="h-1.5 w-px bg-slate-300"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Scrollable Body */}
      <div className="overflow-y-auto flex-1 relative bg-white">
        {/* Vertical Grid Lines Layer */}
        <div className="absolute top-0 bottom-0 right-0 left-[480px] pointer-events-none z-0">
          {ticks.map((tick, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-r border-slate-100"
              style={{ left: `${tick.left}%` }}
            ></div>
          ))}
          {todayPos >= 0 && todayPos <= 100 && (
            <div
              className="absolute top-0 bottom-0 border-l-2 border-rose-500 z-10"
              style={{ left: `${todayPos}%` }}
            >
              <div className="absolute top-0 -translate-x-1/2 bg-rose-50 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-rose-200">
                Today
              </div>
            </div>
          )}
        </div>

        {/* Project Row */}
        {project && !searchQuery && (
          <div className="flex border-b border-slate-200 bg-slate-50/80 group z-10 relative">
            <div className="w-[480px] shrink-0 flex bg-slate-50/90 z-20 sticky left-0 border-r border-slate-200 shadow-2xs">
              <div className="flex-1 p-2 flex items-center gap-2 truncate pr-4">
                <div className="flex items-center justify-center text-blue-700">
                  <Briefcase size={15} />
                </div>
                <span className="font-bold text-slate-800 text-xs truncate" title={project.name}>
                  {project.name}
                </span>
              </div>
              <div className="w-24 p-2 flex items-center justify-center border-l border-slate-200">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    project.isActive
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  {project.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="w-20 p-2 flex items-center justify-center border-l border-slate-200">
                <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-700">
                  {project.manager?.firstName?.[0] || 'M'}
                </div>
              </div>
              <div className="w-24 p-2 flex items-center border-l border-slate-200 pl-3">
                <span className="text-xs text-slate-400">-</span>
              </div>
            </div>

            {/* Gantt Bar */}
            <div className="flex-1 relative h-10 my-auto">
              {project.startDate && project.dueDate && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-6 bg-blue-700 rounded-md shadow-2xs flex items-center px-2 text-white text-xs font-bold z-10 cursor-default"
                  style={{
                    left: `${getPosition(project.startDate)}%`,
                    width: `${getWidth(project.startDate, project.dueDate)}%`
                  }}
                >
                  <span className="sticky left-2 truncate text-[11px]">{project.name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modules & Tasks Rows */}
        {filteredModules.map((module) => (
          <React.Fragment key={module._id}>
            {/* Module Row */}
            <div className="flex border-b border-slate-200 hover:bg-slate-50 transition-colors z-10 relative">
              <div className="w-[480px] shrink-0 flex bg-white group-hover:bg-slate-50 z-20 sticky left-0 border-r border-slate-200">
                <div className="flex-1 p-2 pl-6 flex items-center gap-2 truncate pr-4">
                  <button
                    onClick={() => toggleModule(module._id)}
                    className="w-4 h-4 flex items-center justify-center rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors focus:outline-hidden cursor-pointer"
                  >
                    {expandedModules.has(module._id) ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>
                  <Folder size={14} className="text-cyan-600 shrink-0" />
                  <span
                    className="font-semibold text-slate-700 text-xs truncate cursor-pointer hover:underline"
                    onClick={() => toggleModule(module._id)}
                    title={module.name}
                  >
                    {module.name}
                  </span>
                </div>
                <div className="w-24 p-2 flex items-center justify-center border-l border-slate-200">
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded uppercase">
                    {module.status}
                  </span>
                </div>
                <div className="w-20 p-2 flex items-center justify-center border-l border-slate-200 text-slate-300">
                  -
                </div>
                <div className="w-24 p-2 flex items-center justify-center border-l border-slate-200 text-slate-300">
                  -
                </div>
              </div>

              <div className="flex-1 relative h-9 my-auto">
                {module.startDate && module.dueDate && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-4 bg-cyan-600 rounded-sm flex items-center px-2 text-white text-[10px] font-semibold z-10 cursor-default shadow-2xs"
                    style={{
                      left: `${getPosition(module.startDate)}%`,
                      width: `${getWidth(module.startDate, module.dueDate)}%`
                    }}
                    title={`Module: ${module.name}`}
                  >
                    <span className="truncate">{module.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Task Rows inside Module */}
            {expandedModules.has(module._id) &&
              module.tasks?.map((task) => {
                const progress =
                  task.estimatedHours > 0
                    ? Math.min(((task.loggedHours || 0) / task.estimatedHours) * 100, 100)
                    : 0;
                const hasLogs = task.workLogs && task.workLogs.length > 0;

                return (
                  <React.Fragment key={task._id}>
                    <div className="flex border-b border-slate-200 hover:bg-slate-50 transition-colors group z-10 relative">
                      <div className="w-[480px] shrink-0 flex bg-white group-hover:bg-slate-50 z-20 sticky left-0 border-r border-slate-200">
                        <div className="flex-1 p-2 pl-12 flex items-center gap-2 truncate pr-4">
                          {hasLogs ? (
                            <button
                              onClick={() => toggleTask(task._id)}
                              className="w-4 h-4 flex items-center justify-center rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors focus:outline-hidden -ml-5 mr-1 cursor-pointer"
                            >
                              {expandedTasks.has(task._id) ? (
                                <ChevronDown size={12} />
                              ) : (
                                <ChevronRight size={12} />
                              )}
                            </button>
                          ) : (
                            <div className="w-4 -ml-5 mr-1"></div>
                          )}
                          <div
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              task.priority === 'HIGH' || task.priority === 'URGENT' || task.priority === 'CRITICAL'
                                ? 'bg-rose-500'
                                : task.priority === 'MEDIUM'
                                ? 'bg-amber-500'
                                : 'bg-blue-400'
                            }`}
                            title={`Priority: ${task.priority}`}
                          />
                          <span
                            className="text-slate-700 text-xs truncate hover:text-blue-600 cursor-pointer"
                            onClick={() => onSelectTask && onSelectTask(task._id)}
                            title={task.name}
                          >
                            {task.name}
                          </span>
                        </div>
                        <div className="w-24 p-2 flex items-center justify-center border-l border-slate-200">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              task.status === 'DONE'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                        <div className="w-20 p-2 flex items-center justify-center border-l border-slate-200">
                          <div className="flex -space-x-1">
                            {task.assignees?.length > 0 ? (
                              task.assignees.slice(0, 3).map((a) => (
                                <div
                                  key={a._id}
                                  className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[9px] font-bold text-blue-700"
                                  title={`${a.firstName || ''} ${a.lastName || ''}`}
                                >
                                  {a.firstName?.[0] || 'U'}
                                </div>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400">-</span>
                            )}
                          </div>
                        </div>
                        <div className="w-24 p-2 flex items-center gap-1.5 border-l border-slate-200 pl-3">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                              }`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span className="text-[9px] font-mono text-slate-500">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </div>

                      {/* Task Bar */}
                      <div className="flex-1 relative h-8 my-auto">
                        {task.startDate && task.dueDate && (
                          <div
                            onClick={() => onSelectTask && onSelectTask(task._id)}
                            className={`absolute top-1/2 -translate-y-1/2 h-4 rounded flex items-center px-1 truncate transition-all hover:opacity-90 cursor-pointer border shadow-2xs ${
                              task.status === 'DONE'
                                ? 'bg-emerald-600 border-emerald-700 text-white'
                                : task.priority === 'HIGH' || task.priority === 'URGENT' || task.priority === 'CRITICAL'
                                ? 'bg-rose-100 border-rose-300 text-rose-800'
                                : 'bg-slate-200 border-slate-300 text-slate-800'
                            }`}
                            style={{
                              left: `${getPosition(task.startDate)}%`,
                              width: `${getWidth(task.startDate, task.dueDate)}%`
                            }}
                            title={`Task: ${task.name}`}
                          >
                            <span className="relative z-10 text-[9px] font-semibold truncate px-1">
                              {task.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Work Logs expansion */}
                    {expandedTasks.has(task._id) &&
                      task.workLogs?.map((log) => (
                        <div
                          key={log._id}
                          className="flex border-b border-slate-100 bg-amber-50/20 hover:bg-amber-50/40 relative"
                        >
                          <div className="w-[480px] shrink-0 flex z-20 sticky left-0 border-r border-slate-200 bg-amber-50/10">
                            <div className="flex-1 p-2 pl-20 flex items-center gap-2 truncate pr-4">
                              <span className="text-slate-500 text-[10px] truncate flex items-center gap-1">
                                <Clock size={11} className="text-amber-600" />
                                <span className="font-semibold text-slate-700">{log.hours}h</span> by{' '}
                                {log.user?.firstName || 'Team Member'}
                              </span>
                            </div>
                            <div className="w-24 p-2 flex items-center justify-center border-l border-slate-200">
                              <span className="text-[9px] text-slate-400 italic">Logged</span>
                            </div>
                            <div className="w-20 p-2 flex items-center justify-center border-l border-slate-200">
                              <div className="w-4 h-4 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-[8px] font-bold text-amber-700">
                                {log.user?.firstName?.[0] || 'U'}
                              </div>
                            </div>
                            <div className="w-24 p-2 flex items-center gap-2 border-l border-slate-200 pl-3">
                              <span className="text-[10px] font-mono text-slate-600">
                                {log.date ? format(new Date(log.date), 'MM/dd') : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 relative h-7 my-auto">
                            <div
                              className="absolute top-1/2 -translate-y-1/2 h-3 bg-amber-500 rounded-sm flex items-center justify-center border border-amber-600 hover:bg-amber-600 cursor-help"
                              style={{
                                left: `${getPosition(log.date)}%`,
                                width: `max(1.5%, 20px)`
                              }}
                              title={`Work Logged: ${log.hours}h\n${log.description || ''}\nBy: ${
                                log.user?.firstName || 'Unknown'
                              }`}
                            ></div>
                          </div>
                        </div>
                      ))}
                  </React.Fragment>
                );
              })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ProjectTimeline;
