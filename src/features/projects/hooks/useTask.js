import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import projectService from '../services/projectService';

export const useTask = (taskId, onTaskUpdated) => {
  const [task, setTask] = useState(null);
  const [worklogs, setWorklogs] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchTaskDetails = useCallback(async () => {
    if (!taskId) {
      setTask(null);
      setWorklogs([]);
      setActivity([]);
      return;
    }

    setLoading(true);
    try {
      const [taskRes, activityRes] = await Promise.all([
        projectService.getTaskById(taskId),
        projectService.getTaskActivity(taskId).catch(() => ({ data: [] }))
      ]);

      const taskData = taskRes.data;
      setTask(taskData);
      setActivity(activityRes.data || []);

      // If taskRes provided workLogs, use them, otherwise query worklogs
      if (taskData.workLogs) {
        setWorklogs(taskData.workLogs);
      } else {
        const logsRes = await projectService.getWorkLogs({ taskId }).catch(() => ({ data: [] }));
        setWorklogs(logsRes.data || []);
      }
    } catch (err) {
      console.error('[useTask] Error fetching task details:', err);
      toast.error('Failed to load task details');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTaskDetails();
  }, [fetchTaskDetails]);

  const updateField = async (field, value) => {
    if (!task) return;
    const previousTask = { ...task };
    setTask(prev => ({ ...prev, [field]: value }));

    try {
      const res = await projectService.updateTask(task._id, { [field]: value });
      setTask(prev => ({ ...prev, ...res.data }));
      if (onTaskUpdated) onTaskUpdated(res.data);
      projectService.getTaskActivity(task._id).then(r => setActivity(r.data || [])).catch(() => {});
      toast.success('Task updated');
    } catch (err) {
      setTask(previousTask);
      console.error('[useTask] Update error:', err);
      toast.error(err.response?.data?.message || 'Failed to update task');
    }
  };

  const updateFullTask = async (data) => {
    if (!task) return;
    setSubmitting(true);
    try {
      const res = await projectService.updateTask(task._id, data);
      setTask(prev => ({ ...prev, ...res.data }));
      if (onTaskUpdated) onTaskUpdated(res.data);
      projectService.getTaskActivity(task._id).then(r => setActivity(r.data || [])).catch(() => {});
      toast.success('Task details updated successfully');
      return res.data;
    } catch (err) {
      console.error('[useTask] Full update error:', err);
      toast.error(err.response?.data?.message || 'Failed to update task');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const logWork = async ({ date, hours, description }) => {
    if (!task) return;
    setSubmitting(true);
    try {
      const res = await projectService.logWork(task._id, { date, hours: Number(hours), description });
      toast.success('Work log added successfully');
      
      // Refresh worklogs and task details
      await fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
      return res.data;
    } catch (err) {
      console.error('[useTask] Log work error:', err);
      toast.error(err.response?.data?.message || 'Failed to log work');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const deleteWorkLog = async (workLogId) => {
    try {
      await projectService.deleteWorkLog(workLogId);
      toast.success('Work log deleted');
      setWorklogs(prev => prev.filter(w => w._id !== workLogId));
      fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      console.error('[useTask] Delete worklog error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete work log');
    }
  };

  return {
    task,
    worklogs,
    activity,
    loading,
    submitting,
    refresh: fetchTaskDetails,
    updateField,
    updateFullTask,
    logWork,
    deleteWorkLog
  };
};

export default useTask;
