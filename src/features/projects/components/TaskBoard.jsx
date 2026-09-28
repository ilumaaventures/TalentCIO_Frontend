import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  DndContext,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useDroppable,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Search,
  Filter,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  CircleDashed,
  Clock,
  Eye,
  X,
  Tag,
  Folder,
  ChevronDown,
  ChevronRight,
  Layers,
  LayoutGrid,
  FolderOpen
} from 'lucide-react';
import TaskCard from './TaskCard';
import DependencyWarningModal from './DependencyWarningModal';
import { useProjectTasks } from '../hooks/useProjectTasks';

// The 4 primary workflow columns requested on the Right Side Task Status Board
export const RIGHT_BOARD_COLUMNS = [
  { id: 'IN_PROGRESS', title: 'In Progress', dotColor: 'bg-blue-500', headerBg: 'bg-blue-50/50' },
  { id: 'REVIEW', title: 'In Review', dotColor: 'bg-amber-500', headerBg: 'bg-amber-50/50' },
  { id: 'BLOCKED', title: 'Blocked', dotColor: 'bg-rose-500', headerBg: 'bg-rose-50/50' },
  { id: 'DONE', title: 'Done', dotColor: 'bg-emerald-500', headerBg: 'bg-emerald-50/50' }
];


// Compact draggable task row for Left Side Module accordion
const ModuleTaskRow = ({ task, onClick, onSelect }) => {
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
      source: 'module',
      moduleId: task.module?._id || task.module
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1
  };

  const priorityColors = {
    URGENT: 'bg-rose-50 text-rose-700 border-rose-200',
    CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
    HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
    MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
    LOW: 'bg-slate-50 text-slate-600 border-slate-200'
  };

  const statusColors = {
    TODO: 'bg-slate-100 text-slate-700 border-slate-200',
    IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
    REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
    BLOCKED: 'bg-rose-50 text-rose-700 border-rose-200',
    DONE: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };

  const statusLabels = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    REVIEW: 'In Review',
    BLOCKED: 'Blocked',
    DONE: 'Done'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => (onSelect ? onSelect(task._id) : onClick && onClick(task))}
      className="group bg-white rounded-xl p-2.5 border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all duration-150 cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {task.taskKey || task.key || 'TASK'}
        </span>
        <div className="flex items-center gap-1">
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${priorityColors[task.priority] || priorityColors.MEDIUM}`}>
            {task.priority || 'MEDIUM'}
          </span>
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${statusColors[task.status] || statusColors.TODO}`}>
            {statusLabels[task.status] || task.status || 'To Do'}
          </span>
        </div>
      </div>

      <h5 className="text-xs font-semibold text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors mb-2">
        {task.name}
      </h5>

      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-1">
          {task.storyPoints > 0 && (
            <span className="font-semibold text-slate-500">{task.storyPoints} pts</span>
          )}
        </div>
        {Array.isArray(task.assignees) && task.assignees.length > 0 && (
          <div className="flex -space-x-1">
            {task.assignees.slice(0, 2).map((a, i) => {
              const pic = a.profilePicture || a.profilePhoto;
              return pic ? (
                <img
                  key={a._id || i}
                  src={pic}
                  alt={`${a.firstName || ''} ${a.lastName || ''}`}
                  className="w-4.5 h-4.5 rounded-full object-cover border border-white"
                  title={`${a.firstName || ''} ${a.lastName || ''}`}
                />
              ) : (
                <div
                  key={a._id || i}
                  className="w-4.5 h-4.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px] flex items-center justify-center border border-white"
                  title={`${a.firstName || ''} ${a.lastName || ''}`}
                >
                  {(a.firstName || 'U')[0].toUpperCase()}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Collapsible Module Accordion on the Left Side
const ModuleAccordion = ({
  module,
  tasks = [],
  isExpanded,
  onToggle,
  onOpenCreateTask,
  onSelectTask
}) => {
  const droppableId = `MOD__${module._id}`;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: {
      type: 'Module',
      module
    }
  });

  const taskIds = useMemo(() => tasks.map(t => t._id), [tasks]);

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isOver
          ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-300 shadow-md'
          : 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300'
      }`}
    >
      {/* Module Header Bar with Down-Arrow Chevron */}
      <div
        onClick={onToggle}
        className="p-2 px-2.5 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer flex items-center justify-between transition-colors select-none"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <button
            type="button"
            className="p-0.5 rounded text-slate-500 hover:text-slate-700 transition-colors shrink-0"
            title={isExpanded ? 'Collapse module' : 'Expand module to show tasks'}
          >
            {isExpanded ? (
              <ChevronDown size={15} className="text-slate-700" />
            ) : (
              <ChevronRight size={15} className="text-slate-700" />
            )}
          </button>

          <div className="w-5.5 h-5.5 rounded-md bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0">
            {isExpanded ? <FolderOpen size={12} /> : <Folder size={12} />}
          </div>

          <span className="font-semibold text-xs text-slate-800 truncate" title={module.name}>
            {module.name}
          </span>

          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 shrink-0">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {onOpenCreateTask && module._id !== 'UNASSIGNED' && (
            <button
              onClick={() => onOpenCreateTask('TODO', module._id)}
              className="p-0.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors"
              title={`Add task to ${module.name}`}
            >
              <Plus size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Tasks directly underneath */}
      {isExpanded && (
        <div className="p-2.5 bg-slate-50/30 border-t border-slate-100 space-y-2 max-h-[360px] overflow-y-auto">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {tasks.map(task => (
              <ModuleTaskRow
                key={task._id}
                task={task}
                onSelect={onSelectTask}
              />
            ))}
          </SortableContext>

          {tasks.length === 0 && (
            <div
              className={`py-6 border-2 border-dashed rounded-xl flex items-center justify-center text-[11px] italic transition-colors ${
                isOver
                  ? 'border-blue-400 bg-blue-100/50 text-blue-700 font-semibold'
                  : 'border-slate-200 text-slate-400'
              }`}
            >
              Drop tasks into this module
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Droppable Kanban Status Column on the Right Side
const StatusColumn = ({
  col,
  tasks = [],
  modules = [],
  onSelectTask,
  onOpenCreateTask
}) => {
  const droppableId = `COL__${col.id}`;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: {
      type: 'StatusColumn',
      column: col
    }
  });

  const taskIds = useMemo(() => tasks.map(t => t._id), [tasks]);
  const totalStoryPoints = tasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);

  return (
    <div
      ref={setNodeRef}
      id={droppableId}
      className={`rounded-2xl p-3 border flex flex-col min-w-[230px] flex-1 max-h-[76vh] transition-all duration-150 ${
        isOver
          ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-300 shadow-sm'
          : 'bg-slate-50/80 border-slate-200/80'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
            {col.title}
          </h3>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 shadow-2xs">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {totalStoryPoints > 0 && (
            <span className="text-[10px] font-semibold text-slate-400" title="Story points">
              {totalStoryPoints} pts
            </span>
          )}
          {onOpenCreateTask && (
            <button
              onClick={() => onOpenCreateTask(col.id)}
              className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
              title={`Add task to ${col.title}`}
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Sortable Task Cards List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[160px] flex flex-col">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard
              key={task._id}
              task={task}
              modules={modules}
              onSelect={onSelectTask}
              onClick={onSelectTask}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div
            className={`flex-1 min-h-[140px] border-2 border-dashed rounded-xl flex items-center justify-center text-xs italic transition-all ${
              isOver
                ? 'border-blue-400 bg-blue-100/60 text-blue-700 font-semibold'
                : 'border-slate-200 text-slate-400'
            }`}
          >
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
};

export const TaskBoard = ({
  tasks = [],
  modules = [],
  employees = [],
  onSelectTask,
  onOpenCreateTask,
  onTasksChanged
}) => {
  const {
    columnTasks,
    filteredTasks,
    searchTerm,
    setSearchTerm,
    selectedAssignee,
    setSelectedAssignee,
    selectedPriority,
    setSelectedPriority,
    selectedLabel,
    setSelectedLabel,
    selectedModule,
    setSelectedModule,
    allLabels,
    activeFilterCount,
    clearAllFilters,
    moveTask,
    pendingBlockedMove,
    confirmPendingMove,
    cancelPendingMove
  } = useProjectTasks(tasks, onTasksChanged);

  const [activeTask, setActiveTask] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});

  // Setup sensors for smooth drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5 // Avoid accidental drags on click
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Group filtered tasks by Module for the Left Side panel
  const moduleSections = useMemo(() => {
    let displayModules = modules;
    if (selectedModule !== 'ALL') {
      displayModules = modules.filter(m => String(m._id) === String(selectedModule));
    }

    const sections = displayModules.map(mod => {
      const modTasks = filteredTasks.filter(t => String(t.module?._id || t.module) === String(mod._id));
      // Sort tasks by order
      modTasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      return {
        module: mod,
        id: String(mod._id),
        name: mod.name,
        status: mod.status,
        tasks: modTasks
      };
    });

    // Check if there are tasks with no module
    const knownModIds = new Set(modules.map(m => String(m._id)));
    const unassignedTasks = filteredTasks.filter(t => {
      const modId = t.module?._id || t.module;
      return !modId || !knownModIds.has(String(modId));
    });

    if (unassignedTasks.length > 0 && selectedModule === 'ALL') {
      unassignedTasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      sections.push({
        module: { _id: 'UNASSIGNED', name: 'General / Unassigned' },
        id: 'UNASSIGNED',
        name: 'General / Unassigned',
        status: 'ACTIVE',
        tasks: unassignedTasks
      });
    }

    return sections;
  }, [modules, filteredTasks, selectedModule]);

  const rightBoardColumns = RIGHT_BOARD_COLUMNS;

  const tasksByStatus = useMemo(() => {
    const map = {
      TODO: [],
      IN_PROGRESS: [],
      REVIEW: [],
      BLOCKED: [],
      DONE: []
    };

    filteredTasks.forEach(task => {
      const col = task.status || 'TODO';
      if (map[col]) {
        map[col].push(task);
      } else {
        map.TODO.push(task);
      }
    });

    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });

    return map;
  }, [filteredTasks]);

  // Initialize expanded modules (auto-expand modules that have tasks, or first module)
  useEffect(() => {
    setExpandedModules(prev => {
      const next = { ...prev };
      moduleSections.forEach(sec => {
        if (next[sec.id] === undefined) {
          next[sec.id] = sec.tasks.length > 0;
        }
      });
      return next;
    });
  }, [moduleSections]);

  const toggleModule = (modId) => {
    setExpandedModules(prev => ({
      ...prev,
      [modId]: !prev[modId]
    }));
  };

  const expandAll = () => {
    const next = {};
    moduleSections.forEach(s => { next[s.id] = true; });
    setExpandedModules(next);
  };

  const collapseAll = () => {
    const next = {};
    moduleSections.forEach(s => { next[s.id] = false; });
    setExpandedModules(next);
  };

  // Collision detection prioritizing pointer inside droppables, falling back to rect / corners
  const collisionDetectionStrategy = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      return rectCollisions;
    }
    return closestCorners(args);
  }, []);

  const handleDragStart = (event) => {
    const { active } = event;
    const task = tasks.find(t => t._id === active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = () => {
    // Live visual feedback
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const movingTask = tasks.find(t => t._id === activeId);
    if (!movingTask) return;

    let targetCol = null;
    let targetModId = null;
    let newIndex = 0;

    // SCENARIO 1: Dropped into a Right Side Column container (COL__<status>)
    if (typeof overId === 'string' && overId.startsWith('COL__')) {
      targetCol = overId.replace('COL__', '');
      targetModId = movingTask.module?._id || movingTask.module || null;

      const colList = tasksByStatus[targetCol] || [];
      newIndex = colList.length; // Placed at the bottom of the target column
    }
    // SCENARIO 2: Dropped into a Left Side Module container (MOD__<moduleId>)
    else if (typeof overId === 'string' && overId.startsWith('MOD__')) {
      const rawModId = overId.replace('MOD__', '');
      targetModId = rawModId === 'UNASSIGNED' ? null : rawModId;
      // If dragged from right board back to left module, set status to TODO
      targetCol = 'TODO';

      const modTasks = tasks.filter(t => {
        if (t._id === activeId) return false;
        const m = t.module?._id || t.module;
        return String(m || '') === String(targetModId || '');
      });
      newIndex = modTasks.length; // Placed at the end of that module's list
    }
    // SCENARIO 3: Dropped onto another task card (overId is task._id)
    else {
      const overTask = tasks.find(t => t._id === overId);
      if (!overTask) return;

      const overData = over.data?.current;
      const isOverModuleItem = overData?.source === 'module';

      if (isOverModuleItem) {
        // Dropped onto a task row inside a module accordion on the left
        const modId = overData?.moduleId || overTask.module?._id || overTask.module || null;
        targetModId = modId === 'UNASSIGNED' ? null : modId;
        // Keep current status if valid, default to TODO
        targetCol = movingTask.status || 'TODO';

        const modTasks = tasks.filter(t => {
          if (t._id === activeId) return false;
          const m = t.module?._id || t.module;
          return String(m || '') === String(targetModId || '');
        });
        modTasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const idx = modTasks.findIndex(t => t._id === overId);
        newIndex = idx === -1 ? modTasks.length : idx;
      } else {
        // Dropped onto a task card inside a status column on the right board
        targetCol = overTask.status || 'TODO';
        // Preserve the task's existing module assignment when reordering on the board
        targetModId = movingTask.module?._id || movingTask.module || null;

        const sameColTasks = tasks.filter(t => t.status === targetCol && t._id !== activeId);
        sameColTasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const idx = sameColTasks.findIndex(t => t._id === overId);
        newIndex = idx === -1 ? sameColTasks.length : idx;
      }
    }

    if (!targetCol) return;

    // Check if nothing actually changed
    const currentModId = movingTask.module?._id || movingTask.module;
    if (
      movingTask.status === targetCol &&
      String(currentModId || '') === String(targetModId || '') &&
      activeId === overId
    ) {
      return;
    }

    moveTask(activeId, targetCol, newIndex, targetModId);
  };

  return (
    <div className="space-y-4">
      {/* Board Multi-Faceted Filter & View Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search key, title, description, label..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Right: Multi-Filters & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Module Filter */}
          {modules.length > 0 && (
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Modules</option>
              {modules.map(mod => (
                <option key={mod._id} value={mod._id}>
                  {mod.name}
                </option>
              ))}
            </select>
          )}

          {/* Assignee Filter */}
          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Assignees</option>
            <option value="UNASSIGNED">Unassigned</option>
            {employees.map(emp => (
              <option key={emp._id} value={emp._id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Label Filter */}
          {allLabels.length > 0 && (
            <select
              value={selectedLabel}
              onChange={(e) => setSelectedLabel(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Labels</option>
              {allLabels.map(lbl => (
                <option key={lbl} value={lbl}>
                  #{lbl}
                </option>
              ))}
            </select>
          )}

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-800 font-semibold hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              title="Clear all active filters"
            >
              <X size={13} /> Clear ({activeFilterCount})
            </button>
          )}


          {/* New Task Button */}
          {onOpenCreateTask && (
            <button
              onClick={() => onOpenCreateTask('TODO', selectedModule !== 'ALL' ? selectedModule : undefined)}
              className="flex items-center gap-1 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus size={15} /> New Task
            </button>
          )}
        </div>
      </div>

      {/* DND Context Covering Both Left Side (Modules) and Right Side (Status Board) */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* ======================================================== */}
          {/* LEFT SIDE — Modules & Tasks Panel (Compact Width)        */}
          {/* ======================================================== */}
          <div className="w-full lg:w-64 xl:w-72 shrink-0 bg-slate-50/60 rounded-2xl p-2.5 border border-slate-200/90 shadow-2xs flex flex-col space-y-2.5">
            {/* Left Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Folder className="text-blue-600" size={17} />
                <h3 className="font-bold text-sm text-slate-800 tracking-tight">
                  Modules & Tasks
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {moduleSections.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={expandAll}
                  className="px-2 py-0.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded transition-colors"
                  title="Expand all modules"
                >
                  Expand All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={collapseAll}
                  className="px-2 py-0.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded transition-colors"
                  title="Collapse all modules"
                >
                  Collapse
                </button>
              </div>
            </div>

            {/* List of Modules with Down-Arrow Chevrons */}
            <div className="space-y-2 max-h-[76vh] overflow-y-auto pr-0.5">
              {moduleSections.map((sec) => (
                <ModuleAccordion
                  key={sec.id}
                  module={sec.module}
                  tasks={sec.tasks}
                  isExpanded={expandedModules[sec.id] !== false}
                  onToggle={() => toggleModule(sec.id)}
                  onOpenCreateTask={onOpenCreateTask}
                  onSelectTask={onSelectTask}
                />
              ))}

              {moduleSections.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  No modules found. Create a module or adjust your filter.
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT SIDE — Task Status Board (Remaining width)          */}
          {/* ======================================================== */}
          <div className="w-full lg:flex-1 min-w-0 flex flex-col space-y-3">
            {/* Status Columns Grid */}
            <div className="flex gap-3.5 overflow-x-auto pb-3 items-start">
              {rightBoardColumns.map((col) => (
                <StatusColumn
                  key={col.id}
                  col={col}
                  tasks={tasksByStatus[col.id] || []}
                  modules={modules}
                  onSelectTask={onSelectTask}
                  onOpenCreateTask={onOpenCreateTask}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Drag Overlay Preview */}
        <DragOverlay>
          {activeTask ? (
            <div className="transform rotate-2 scale-105 opacity-95 pointer-events-none shadow-xl">
              <TaskCard task={activeTask} modules={modules} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Blocker Dependency Warning Modal */}
      <DependencyWarningModal
        isOpen={Boolean(pendingBlockedMove)}
        task={pendingBlockedMove?.task}
        targetStatus={pendingBlockedMove?.targetStatus}
        onConfirm={confirmPendingMove}
        onCancel={cancelPendingMove}
      />
    </div>
  );
};

export default TaskBoard;
