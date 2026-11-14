import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/apiClient';
import { getLocalDateInputValue } from '../utils/attendanceFormatters';

export const useAttendanceTasks = ({
    currentUser,
    hasModule,
    activeTab,
    setRecentLogs
}) => {
    const [assignedTasks, setAssignedTasks] = useState([]);
    const [logForm, setLogForm] = useState({
        date: getLocalDateInputValue(),
        hours: '',
        minutes: '',
        description: ''
    });
    const [loggingTaskId, setLoggingTaskId] = useState(null);
    const [expandedLogTaskId, setExpandedLogTaskId] = useState(null);
    const [editingLogId, setEditingLogId] = useState(null);

    const tasksFetchedRef = useRef(false);

    useEffect(() => {
        if (activeTab === 'tasks' && currentUser?._id && hasModule('projects') && !tasksFetchedRef.current) {
            tasksFetchedRef.current = true;
            api.get(`/projects/tasks?assignees=${currentUser._id}`)
                .then(r => {
                    const active = r.data.filter(t => t.module?.status !== 'COMPLETED' && t.status !== 'COMPLETED');
                    setAssignedTasks(active);
                })
                .catch(e => {
                    console.error('tasks fetch error', e);
                    tasksFetchedRef.current = false;
                });
        }
    }, [activeTab, hasModule, currentUser?._id]);

    const fetchRecentLogs = async () => {
        try {
            if (!currentUser) return;
            const res = await api.get('/projects/worklogs');
            if (setRecentLogs) {
                setRecentLogs(res.data);
            }
        } catch (error) {
            console.error('Error fetching logs', error);
        }
    };

    const toggleLogForm = (taskId, existingLog = null) => {
        if (expandedLogTaskId === taskId) {
            setExpandedLogTaskId(null);
            setLoggingTaskId(null);
            setEditingLogId(null);
            setLogForm({ date: getLocalDateInputValue(), hours: '', minutes: '', description: '' });
        } else {
            setExpandedLogTaskId(taskId);
            setLoggingTaskId(taskId);
            if (existingLog) {
                setEditingLogId(existingLog._id);
                const total = parseFloat(existingLog.hours) || 0;
                const h = Math.floor(total);
                const m = Math.round((total - h) * 60);

                setLogForm({
                    date: getLocalDateInputValue(existingLog.date),
                    hours: h,
                    minutes: m,
                    description: existingLog.description || ''
                });
            } else {
                setEditingLogId(null);
                setLogForm({ date: getLocalDateInputValue(), hours: '', minutes: '', description: '' });
            }
        }
    };

    const handleDeleteLog = async (logId) => {
        if (!window.confirm('Are you sure you want to delete this log?')) return;
        try {
            await api.delete(`/projects/worklogs/${logId}`);
            toast.success('Work Log Deleted');
            fetchRecentLogs();
        } catch {
            toast.error('Failed to delete log');
        }
    };

    const handleLogWork = async (e) => {
        e.preventDefault();
        try {
            const h = parseFloat(logForm.hours) || 0;
            const m = parseFloat(logForm.minutes) || 0;
            const totalHours = h + (m / 60);

            if (totalHours <= 0) {
                toast.error("Please enter valid time");
                return;
            }

            const payload = { ...logForm, hours: totalHours.toFixed(2) };

            if (editingLogId) {
                await api.put(`/projects/worklogs/${editingLogId}`, payload);
                toast.success('Work Log Updated');
            } else {
                await api.post(`/projects/tasks/${loggingTaskId}/log`, payload);
                toast.success('Work Logged Successfully');
            }

            setExpandedLogTaskId(null);
            setLoggingTaskId(null);
            setEditingLogId(null);
            setLogForm({ date: getLocalDateInputValue(), hours: '', minutes: '', description: '' });
            fetchRecentLogs();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to log work');
        }
    };

    return {
        assignedTasks,
        logForm,
        setLogForm,
        expandedLogTaskId,
        setExpandedLogTaskId,
        editingLogId,
        toggleLogForm,
        handleDeleteLog,
        handleLogWork,
        fetchRecentLogs
    };
};

export default useAttendanceTasks;

