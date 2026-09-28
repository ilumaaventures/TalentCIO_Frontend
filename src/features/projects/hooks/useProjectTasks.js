import { useState, useMemo, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import projectService from '../services/projectService';

export const COLUMNS = [
  { id: 'TODO', title: 'To Do', color: 'border-slate-300 text-slate-700 bg-slate-100' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-blue-400 text-blue-700 bg-blue-50' },
  { id: 'REVIEW', title: 'In Review', color: 'border-amber-400 text-amber-700 bg-amber-50' },
  { id: 'BLOCKED', title: 'Blocked', color: 'border-rose-400 text-rose-700 bg-rose-50' },
  { id: 'DONE', title: 'Done', color: 'border-emerald-400 text-emerald-700 bg-emerald-50' }
];

export const useProjectTasks = (initialTasks = [], onTasksChanged) => {
  const [tasks, setTasks] = useState(initialTasks);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedLabel, setSelectedLabel] = useState('ALL');
  const [selectedModule, setSelectedModule] = useState('ALL');

  // Pending move state when blocked task is moved to active status
  const [pendingBlockedMove, setPendingBlockedMove] = useState(null);

  // Keep synced if initialTasks updates from parent
  useEffect(() => {
    setTasks(initialTasks || []);
  }, [initialTasks]);

  const updateInitialTasks = useCallback((newTasks) => {
    setTasks(newTasks);
  }, []);

  // Dynamically extract unique labels from all tasks
  const allLabels = useMemo(() => {
    const set = new Set();
    tasks.forEach(t => {
      if (Array.isArray(t.labels)) {
        t.labels.forEach(l => l && set.add(l.trim()));
      }
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (selectedAssignee !== 'ALL') count++;
    if (selectedPriority !== 'ALL') count++;
    if (selectedLabel !== 'ALL') count++;
    if (selectedModule !== 'ALL') count++;
    return count;
  }, [searchTerm, selectedAssignee, selectedPriority, selectedLabel, selectedModule]);

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedAssignee('ALL');
    setSelectedPriority('ALL');
    setSelectedLabel('ALL');
    setSelectedModule('ALL');
  }, []);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Top-level only on the board (subtasks belong to parent drawer)
      if (task.parentTask) return false;

      // Search match (title, key, description, labels)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesKey = (task.taskKey || task.key || '').toLowerCase().includes(term);
        const matchesName = (task.name || '').toLowerCase().includes(term);
        const matchesDesc = (task.description || '').toLowerCase().includes(term);
        const matchesLabels = Array.isArray(task.labels) && task.labels.some(l => l.toLowerCase().includes(term));
        if (!matchesKey && !matchesName && !matchesDesc && !matchesLabels) return false;
      }

      // Assignee filter
      if (selectedAssignee !== 'ALL') {
        if (selectedAssignee === 'UNASSIGNED') {
          if (Array.isArray(task.assignees) && task.assignees.length > 0) return false;
        } else {
          const hasAssignee = Array.isArray(task.assignees) && task.assignees.some(a => String(a._id || a) === selectedAssignee);
          if (!hasAssignee) return false;
        }
      }

      // Priority filter
      if (selectedPriority !== 'ALL') {
        const normPriority = task.priority === 'CRITICAL' ? 'URGENT' : task.priority;
        const normSelected = selectedPriority === 'CRITICAL' ? 'URGENT' : selectedPriority;
        if (normPriority !== normSelected) {
          return false;
        }
      }

      // Label filter
      if (selectedLabel !== 'ALL') {
        const hasLabel = Array.isArray(task.labels) && task.labels.includes(selectedLabel);
        if (!hasLabel) return false;
      }

      // Module filter
      if (selectedModule !== 'ALL') {
        const taskModId = String(task.module?._id || task.module || '');
        if (taskModId !== selectedModule) return false;
      }

      return true;
    });
  }, [tasks, searchTerm, selectedAssignee, selectedPriority, selectedLabel, selectedModule]);

  // Group by status column sorted by order
  const columnTasks = useMemo(() => {
    const groups = {
      TODO: [],
      IN_PROGRESS: [],
      REVIEW: [],
      BLOCKED: [],
      DONE: []
    };

    filteredTasks.forEach(task => {
      const col = task.status || 'TODO';
      if (groups[col]) {
        groups[col].push(task);
      } else {
        groups.TODO.push(task);
      }
    });

    // Sort each column by order ascending
    Object.keys(groups).forEach(col => {
      groups[col].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });

    return groups;
  }, [filteredTasks]);

  // Core execution of task move and reorder
  const executeTaskMove = useCallback(async (taskId, targetStatus, newOrderIndex, targetModuleId) => {
    const previousTasks = [...tasks];
    const taskIndex = tasks.findIndex(t => t._id === taskId);
    if (taskIndex === -1) return;

    const movingTask = tasks[taskIndex];
    const oldStatus = movingTask.status;
    const currentModId = String(movingTask.module?._id || movingTask.module || '');
    const hasTargetMod = targetModuleId !== undefined && targetModuleId !== null;
    const cleanTargetModId = hasTargetMod && targetModuleId !== 'UNASSIGNED'
      ? String(targetModuleId._id || targetModuleId)
      : null;
    const isModuleChange = hasTargetMod && currentModId !== (cleanTargetModId || '');

    // Filter tasks in the target status column
    const targetColTasks = (tasks || []).filter(t => {
      if (t._id === taskId) return false;
      if (t.parentTask) return false;
      return t.status === targetStatus;
    });

    targetColTasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const finalModule = isModuleChange ? cleanTargetModId : (movingTask.module?._id || movingTask.module);

    const updatedMovingTask = {
      ...movingTask,
      status: targetStatus,
      module: finalModule
    };
    targetColTasks.splice(newOrderIndex, 0, updatedMovingTask);

    // Assign new sequential order values
    const reorderPayload = targetColTasks.map((t, idx) => {
      const item = {
        id: t._id,
        status: targetStatus,
        order: idx * 10
      };
      // Only include module if this is the moving task and module was explicitly changed
      if (t._id === taskId && isModuleChange) {
        item.module = cleanTargetModId || null;
      }
      return item;
    });

    // Optimistic state update
    const updatedTasks = tasks.map(t => {
      const reordered = reorderPayload.find(r => r.id === t._id);
      if (reordered) {
        return {
          ...t,
          status: reordered.status,
          order: reordered.order,
          module: (t._id === taskId && isModuleChange) ? cleanTargetModId : t.module
        };
      }
      return t;
    });

    setTasks(updatedTasks);

    try {
      await projectService.reorderTasks(reorderPayload);
      if (oldStatus !== targetStatus) {
        toast.success(`Task moved to ${targetStatus.replace('_', ' ')}`);
      } else if (isModuleChange) {
        toast.success('Task module updated');
      }
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('[useProjectTasks] Reorder failed, rolling back:', err);
      setTasks(previousTasks);
      toast.error(err.response?.data?.message || 'Failed to save task move');
    }
  }, [tasks, onTasksChanged]);

  // Handle Drag & Drop move request with blocker interception
  const moveTask = useCallback((taskId, targetStatus, newOrderIndex, targetModuleId) => {
    const task = tasks.find(t => t._id === taskId);
    if (!task) return;

    // Intercept if moving to IN_PROGRESS and has unresolved blockers
    if (
      targetStatus === 'IN_PROGRESS' &&
      Array.isArray(task.blockedBy) &&
      task.blockedBy.length > 0
    ) {
      const hasUnresolved = task.blockedBy.some(b =>
        typeof b === 'object' ? b.status !== 'DONE' : true
      );
      if (hasUnresolved) {
        setPendingBlockedMove({
          task,
          taskId,
          targetStatus,
          newOrderIndex,
          targetModuleId
        });
        return;
      }
    }

    executeTaskMove(taskId, targetStatus, newOrderIndex, targetModuleId);
  }, [tasks, executeTaskMove]);

  const confirmPendingMove = useCallback(() => {
    if (!pendingBlockedMove) return;
    const { taskId, targetStatus, newOrderIndex, targetModuleId } = pendingBlockedMove;
    setPendingBlockedMove(null);
    executeTaskMove(taskId, targetStatus, newOrderIndex, targetModuleId);
  }, [pendingBlockedMove, executeTaskMove]);

  const cancelPendingMove = useCallback(() => {
    setPendingBlockedMove(null);
  }, []);

  return {
    tasks,
    filteredTasks,
    columnTasks,
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
    cancelPendingMove,
    updateInitialTasks
  };
};

export default useProjectTasks;
