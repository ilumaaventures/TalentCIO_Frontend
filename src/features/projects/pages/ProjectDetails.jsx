import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import api from '@/lib/apiClient';
import {
  Clock,
  Calendar,
  Users,
  Plus,
  Trash2,
  CheckSquare,
  Folder,
  Search,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import Skeleton from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/context/AuthContext';
import Button from '@/components/ui/Button';
import { createCachePayload } from '@/lib/cache';
import { format } from 'date-fns';

import ProjectHeader from '../components/ProjectHeader';
import ProjectOverview from '../components/ProjectOverview';
import TaskBoard from '../components/TaskBoard';
import ProjectHierarchy from '../components/ProjectHierarchy';
import TaskDrawer from '../components/TaskDrawer';
import ProjectPerformance from '../components/ProjectPerformance';
import UserPerformanceTrace from '../components/UserPerformanceTrace';
import ProjectDiscussions from '../components/ProjectDiscussions';
import EditProjectModal from '../components/EditProjectModal';
import projectService from '../services/projectService';

const getLocalDateInputValue = (dateValue = new Date()) => format(new Date(dateValue), 'yyyy-MM-dd');

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [modules, setModules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'board', 'hierarchy', 'performance', 'user-trace', 'discussions'
  const [traceUserId, setTraceUserId] = useState('ALL');
  const [discussionsCount, setDiscussionsCount] = useState(0);
  const hasModules = project?.hasModules !== false;

  const handleSelectMemberTrace = useCallback((memberId) => {
    setTraceUserId(memberId || 'ALL');
    setViewMode('user-trace');
  }, []);

  const isManager = Boolean(
    project?.manager && (
      (project.manager?._id || project.manager)?.toString() === (user?._id || user?.id)?.toString()
    )
  );
  const isMember = Boolean(
    Array.isArray(project?.members) && project.members.some(m =>
      (m?._id || m)?.toString() === (user?._id || user?.id)?.toString()
    )
  );

  const isAdmin = (user?.roles || []).some(r => {
    const roleName = typeof r === 'string' ? r : r?.name;
    const lower = String(roleName || '').toLowerCase().trim();
    return lower === 'admin' || lower === 'system admin' || lower === 'super admin' || r?.isSystem === true;
  }) || (user?.permissions || []).includes('*') || (user?.permissions || []).includes('admin');

  const canUpdateProject = isAdmin || user?.permissions?.includes('project.update') || isManager;
  const canCreateTask = isAdmin || user?.permissions?.includes('task.create') || isManager || isMember;
  const canUpdateTask = isAdmin || user?.permissions?.includes('task.update') || isManager || isMember;
  const canDeleteModule = isAdmin || user?.permissions?.includes('module.delete') || isManager;
  const canDeleteTask = isAdmin || user?.permissions?.includes('task.delete') || isManager;
  const canExportReport = isAdmin || user?.permissions?.includes('project.export_report') || isManager;

  // Drawer state
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Modals
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);


  // Forms
  const [moduleForm, setModuleForm] = useState({ name: '', description: '', status: 'PLANNED', startDate: '', dueDate: '' });
  const [taskForm, setTaskForm] = useState({ name: '', description: '', assignees: [], priority: 'MEDIUM', startDate: '', dueDate: '', estimatedHours: '', storyPoints: '' });
  const [taskAssigneeSearch, setTaskAssigneeSearch] = useState('');

  const projectMemberIdSet = useMemo(() => {
    const set = new Set();
    if (Array.isArray(project?.members)) {
      project.members.forEach(m => set.add(String(m?._id || m)));
    }
    if (project?.manager) {
      set.add(String(project.manager?._id || project.manager));
    }
    return set;
  }, [project]);

  // Combine employees and project members, prioritizing project members at top
  const allSelectableAssignees = useMemo(() => {
    const map = new Map();
    if (Array.isArray(project?.members)) {
      project.members.forEach((m, idx) => {
        const mId = String(m?._id || m);
        map.set(mId, {
          _id: mId,
          firstName: m.firstName || 'Member',
          lastName: m.lastName || '',
          email: m.email || '',
          profilePicture: m.profilePicture || m.profilePhoto || null,
          isProjectMember: true
        });
      });
    }
    if (project?.manager) {
      const mgrId = String(project.manager?._id || project.manager);
      if (!map.has(mgrId)) {
        map.set(mgrId, {
          _id: mgrId,
          firstName: project.manager.firstName || 'Manager',
          lastName: project.manager.lastName || '',
          email: project.manager.email || '',
          profilePicture: project.manager.profilePicture || project.manager.profilePhoto || null,
          isProjectMember: true,
          isManager: true
        });
      }
    }
    (employees || []).forEach(emp => {
      const eId = String(emp._id);
      const isProjMem = projectMemberIdSet.has(eId);
      const existing = map.get(eId);
      map.set(eId, {
        _id: eId,
        firstName: emp.firstName || existing?.firstName || '',
        lastName: emp.lastName || existing?.lastName || '',
        email: emp.email || existing?.email || '',
        profilePicture: emp.profilePicture || emp.profilePhoto || existing?.profilePicture || null,
        isProjectMember: isProjMem || Boolean(existing?.isProjectMember)
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.isProjectMember && !b.isProjectMember) return -1;
      if (!a.isProjectMember && b.isProjectMember) return 1;
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });
  }, [employees, project, projectMemberIdSet]);

  const filteredAssignees = useMemo(() => {
    if (!taskAssigneeSearch.trim()) return allSelectableAssignees;
    const q = taskAssigneeSearch.toLowerCase().trim();
    return allSelectableAssignees.filter(a =>
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q)
    );
  }, [allSelectableAssignees, taskAssigneeSearch]);

  // Editing State
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [loggingTaskId, setLoggingTaskId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const invalidateProjectCache = useCallback(() => {
    sessionStorage.removeItem(`project_details_${id}`);
    sessionStorage.removeItem(`project_details_${id}_${user?._id || user?.id || 'anon'}`);
    if (user?._id) sessionStorage.removeItem(`project_data_${user._id}`);
    if (user?.id) sessionStorage.removeItem(`project_data_${user.id}`);
  }, [id, user?._id, user?.id]);

  const openEditProjectModal = () => setShowEditProjectModal(true);

  const fetchData = useCallback(async () => {
    try {
      const cacheKey = `project_details_${id}_${user?._id || user?.id || 'anon'}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      const shouldLoadEmployees = canUpdateProject || canCreateTask || canUpdateTask;

      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const data = parsed.data || parsed;
        setProject(data.project);
        setModules(data.modules || []);
        setTasks(data.tasks || []);
        setEmployees(data.employees || []);
        setLoading(false);
      }

      const [projRes, empRes] = await Promise.all([
        api.get(`/projects/${id}/hierarchy`),
        api.get('/projects/employees').catch(() => ({ data: [] }))
      ]);

      const projData = projRes.data;
      const empData = empRes.data || [];
      const moduleData = (projData.modules || []).map(m => ({
        ...m,
        tasks: (m.tasks || []).map(t => ({
          ...t,
          module: t.module || m._id
        }))
      }));
      const taskData = moduleData.flatMap(m => m.tasks || []) || [];

      // Always update active state with authoritative server data
      setProject(projData);
      setModules(moduleData);
      setTasks(taskData);
      setEmployees(empData);

      // Fetch discussions count for project
      api.get(`/discussions?project=${id}&limit=1`)
        .then(res => {
          const total = res.data?.total ?? (res.data?.discussions?.length || 0);
          setDiscussionsCount(total);
        })
        .catch(() => {});

      // Fingerprint check for sessionStorage caching
      const newFingerprint = JSON.stringify({
        m: moduleData.length,
        t: taskData.length,
        taskStates: taskData.map(t => `${t._id}:${t.status}:${t.order ?? 0}`).join(','),
        updates: moduleData.map(m => `${m._id}:${m.status}:${m.tasks?.length}`).join(','),
        dw: (projData.directWorkLogs || []).length,
        th: projData.totalLoggedHours || 0
      });
      const oldFingerprint = cachedData ? JSON.parse(cachedData).fingerprint : null;

      if (newFingerprint !== oldFingerprint || !cachedData) {

        const minimalProject = {
          _id: projData._id,
          name: projData.name,
          status: projData.status,
          isActive: projData.isActive,
          description: projData.description,
          startDate: projData.startDate,
          dueDate: projData.dueDate,
          manager: projData.manager ? { firstName: projData.manager.firstName, lastName: projData.manager.lastName } : null,
          client: projData.client,
          members: projData.members,
          hasModules: projData.hasModules !== false,
          directWorkLogs: projData.directWorkLogs || [],
          totalLoggedHours: projData.totalLoggedHours || 0,
          estimatedHours: projData.estimatedHours || 0
        };

        const minimalModules = moduleData.map(m => ({
          _id: m._id,
          name: m.name,
          status: m.status,
          description: m.description,
          startDate: m.startDate,
          dueDate: m.dueDate,
          tasks: m.tasks?.map(t => ({
            _id: t._id,
            name: t.name,
            key: t.key,
            taskKey: t.taskKey,
            description: t.description,
            status: t.status,
            priority: t.priority,
            storyPoints: t.storyPoints,
            labels: t.labels,
            startDate: t.startDate,
            dueDate: t.dueDate,
            estimatedHours: t.estimatedHours,
            loggedHours: t.loggedHours,
            blockedBy: t.blockedBy,
            parentTask: t.parentTask,
            module: t.module || m._id,
            assignees: t.assignees?.map(a => ({ _id: a._id, firstName: a.firstName, lastName: a.lastName, email: a.email, profilePicture: a.profilePicture || a.profilePhoto })),
            workLogs: t.workLogs?.map(l => ({
              _id: l._id,
              date: l.date,
              hours: l.hours,
              description: l.description,
              user: l.user ? { _id: l.user._id, firstName: l.user.firstName, lastName: l.user.lastName } : null
            }))
          }))
        }));

        const minimalTasks = minimalModules.flatMap(m => m.tasks || []) || [];
        const minimalEmployees = empData.map(e => ({ _id: e._id, firstName: e.firstName, lastName: e.lastName, email: e.email, profilePicture: e.profilePicture || e.profilePhoto }));

        const payload = createCachePayload({
          project: minimalProject,
          modules: minimalModules,
          tasks: minimalTasks,
          employees: minimalEmployees
        }, newFingerprint);

        sessionStorage.setItem(cacheKey, JSON.stringify(payload));
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  }, [canCreateTask, canUpdateProject, canUpdateTask, id, user?._id, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleCreateModule = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingModuleId) {
        await api.put(`/projects/modules/${editingModuleId}`, moduleForm);
        toast.success('Module Updated');
      } else {
        await api.post('/projects/modules', { ...moduleForm, project: id });
        toast.success('Module Created');
      }
      invalidateProjectCache();
      setShowModuleModal(false);
      setEditingModuleId(null);
      setModuleForm({ name: '', description: '', status: 'PLANNED', startDate: '', dueDate: '' });
      fetchData();
    } catch {
      toast.error('Failed to save module');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!activeModuleId) {
      toast.error('Please select a target module');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingTaskId) {
        await api.put(`/projects/tasks/${editingTaskId}`, { ...taskForm, module: activeModuleId });
        toast.success('Task Updated');
      } else {
        await api.post('/projects/tasks', { ...taskForm, module: activeModuleId });
        toast.success('Task Created');
      }
      invalidateProjectCache();
      setShowTaskModal(false);
      setEditingTaskId(null);
      setTaskForm({ name: '', description: '', assignees: [], priority: 'MEDIUM', startDate: '', dueDate: '', estimatedHours: '', storyPoints: '' });
      fetchData();
    } catch {
      toast.error('Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogWork = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (loggingTaskId) {
        await api.post(`/projects/tasks/${loggingTaskId}/log`, logForm);
      } else {
        await projectService.logDirectProjectWork({
          projectId: id,
          date: logForm.date,
          hours: Number(logForm.hours),
          description: logForm.description
        });
      }
      toast.success('Work Logged Successfully');
      invalidateProjectCache();
      setShowLogModal(false);
      setLoggingTaskId(null);
      fetchData();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to log work';
      toast.error(errorMsg, { duration: 4000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openProjectLogModal = () => {
    setLogForm({ date: getLocalDateInputValue(), hours: '', description: '' });
    setLoggingTaskId(null);
    setShowLogModal(true);
  };

  const handleDeleteWorkLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this work log?')) return;
    try {
      await api.delete(`/projects/worklogs/${logId}`);
      toast.success('Work log deleted');
      invalidateProjectCache();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete work log');
    }
  };

  const openCreateModuleModal = () => {
    setModuleForm({ name: '', description: '', status: 'PLANNED', startDate: '', dueDate: '' });
    setEditingModuleId(null);
    setShowModuleModal(true);
  };

  const openCreateTaskModal = (arg1, arg2) => {
    const validStatuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'DONE'];
    let targetModule = null;
    let initialStatus = 'TODO';

    if (arg2) {
      targetModule = arg2;
      if (typeof arg1 === 'string' && validStatuses.includes(arg1)) {
        initialStatus = arg1;
      }
    } else if (arg1) {
      if (typeof arg1 === 'string' && validStatuses.includes(arg1)) {
        initialStatus = arg1;
        targetModule = modules[0]?._id;
      } else if (typeof arg1 === 'string') {
        targetModule = arg1;
      } else if (typeof arg1 === 'object' && arg1?._id) {
        targetModule = arg1._id;
      }
    }

    if (!targetModule) {
      targetModule = modules[0]?._id;
    }

    if (!targetModule && modules.length === 0) {
      toast.error('Please create a module first before adding tasks');
      openCreateModuleModal();
      return;
    }

    // Default auto-assign all users assigned to the project (can be unchecked)
    const defaultProjectAssignees = Array.from(projectMemberIdSet);

    setTaskForm({
      name: '',
      description: '',
      assignees: defaultProjectAssignees,
      priority: 'MEDIUM',
      status: initialStatus,
      startDate: '',
      dueDate: '',
      estimatedHours: '',
      storyPoints: ''
    });
    setEditingTaskId(null);
    setActiveModuleId(targetModule);
    setTaskAssigneeSearch('');
    setShowTaskModal(true);
  };

  const handleEditModule = (module) => {
    setModuleForm({
      name: module.name,
      description: module.description || '',
      status: module.status,
      startDate: module.startDate ? new Date(module.startDate).toISOString().split('T')[0] : '',
      dueDate: module.dueDate ? new Date(module.dueDate).toISOString().split('T')[0] : ''
    });
    setEditingModuleId(module._id);
    setShowModuleModal(true);
  };

  const handleDeleteModule = async (moduleId) => {
    if (window.confirm('Are you sure you want to delete this module? All tasks within it will be deleted.')) {
      try {
        await api.delete(`/projects/modules/${moduleId}`);
        toast.success('Module Deleted');
        invalidateProjectCache();
        fetchData();
      } catch {
        toast.error('Failed to delete module');
      }
    }
  };

  const handleEditTask = (task, moduleId) => {
    const existingAssignees = Array.isArray(task.assignees) && task.assignees.length > 0
      ? task.assignees.map(a => String(a?._id || a))
      : Array.from(projectMemberIdSet);

    setTaskForm({
      name: task.name,
      description: task.description || '',
      assignees: existingAssignees,
      priority: (task.priority === 'CRITICAL' ? 'URGENT' : task.priority) || 'MEDIUM',
      status: task.status || 'TODO',
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      estimatedHours: task.estimatedHours || '',
      storyPoints: task.storyPoints || ''
    });
    setEditingTaskId(task._id);
    setActiveModuleId(moduleId || task.module?._id || task.module || modules[0]?._id);
    setTaskAssigneeSearch('');
    setShowTaskModal(true);
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Delete this task?')) {
      try {
        await api.delete(`/projects/tasks/${taskId}`);
        toast.success('Task Deleted');
        invalidateProjectCache();
        fetchData();
      } catch {
        toast.error('Failed to delete task');
      }
    }
  };

  const openLogModal = (taskId) => {
    setLoggingTaskId(taskId);
    setLogForm({ date: getLocalDateInputValue(), hours: '', description: '' });
    setShowLogModal(true);
  };

  // Direct Project Tracking View (Direct without modules)
  const DirectProjectView = () => {
    const directLogs = project?.directWorkLogs || [];
    const totalLogged = project?.totalLoggedHours || directLogs.reduce((sum, l) => sum + (Number(l.hours) || 0), 0);
    const estimated = Number(project?.estimatedHours) || 0;
    const progressPercent = estimated > 0 ? Math.min(100, Math.round((totalLogged / estimated) * 100)) : 0;
    const membersList = project?.members || [];
    const currentUserId = user?._id?.toString();
    const isAdmin = user?.roles?.includes('Admin') || user?.permissions?.includes('*') || user?.permissions?.includes('admin');

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Logged Hours</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-800">
                {totalLogged.toFixed(1)} <span className="text-sm font-normal text-slate-500">hrs</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Est: {estimated > 0 ? `${estimated} hrs` : 'Not set'}</span>
                {estimated > 0 && <span className="font-semibold text-blue-600">{progressPercent}%</span>}
              </div>
              {estimated > 0 && (
                <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${totalLogged > estimated ? 'bg-amber-500' : 'bg-blue-600'}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Timeline</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar size={18} />
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <div className="text-xs text-slate-500 flex justify-between">
                <span>Start Date:</span>
                <span className="font-semibold text-slate-700">
                  {project?.startDate ? format(new Date(project.startDate), 'MMM d, yyyy') : 'Not set'}
                </span>
              </div>
              <div className="text-xs text-slate-500 flex justify-between">
                <span>Due Date:</span>
                <span className="font-semibold text-slate-700">
                  {project?.dueDate ? format(new Date(project.dueDate), 'MMM d, yyyy') : 'Not set'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team Members</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-800">
                {membersList.length + (project?.manager ? 1 : 0)}
              </div>
              <div className="mt-2 flex -space-x-1.5 overflow-hidden">
                {project?.manager && (
                  <div
                    key="manager"
                    title={`Manager: ${project.manager.firstName || ''} ${project.manager.lastName || ''}`.trim()}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold border-2 border-white"
                  >
                    {project.manager.firstName?.[0] || 'M'}
                  </div>
                )}
                {membersList.slice(0, 5).map(m => (
                  <div
                    key={m._id}
                    title={`${m.firstName || ''} ${m.lastName || ''}`.trim()}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-xs font-bold border-2 border-white"
                  >
                    {m.firstName?.[0] || 'U'}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-blue-50 to-indigo-50/60 p-5 rounded-xl border border-blue-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Tracking Mode</span>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-800">
                Direct
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                No modules or tasks required. All time logs are recorded directly to this project.
              </p>
              <button
                onClick={openProjectLogModal}
                className="mt-3 w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Plus size={14} /> Log Work
              </button>
            </div>
          </div>
        </div>

        {/* Work Logs Table */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Direct Project Work Logs</h3>
              <p className="text-xs text-slate-500">History of time logged directly to {project?.name}</p>
            </div>
            <button
              onClick={openProjectLogModal}
              className="zoho-btn-primary flex items-center space-x-1.5 text-xs py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white self-start sm:self-auto"
            >
              <Plus size={15} /> <span>Log Time</span>
            </button>
          </div>

          {directLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Team Member</th>
                    <th className="px-6 py-3">Hours</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {directLogs.map(log => {
                    const isLogOwner = String(log.user?._id || log.user) === currentUserId;
                    const canDelete = isLogOwner || isAdmin;
                    return (
                      <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5 text-slate-600 font-mono text-xs whitespace-nowrap">
                          {log.date ? format(new Date(log.date), 'MMM d, yyyy') : '-'}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200">
                              {log.user?.firstName?.[0] || 'U'}
                            </div>
                            <div>
                              <div className="font-medium text-slate-800 text-xs">
                                {log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() : 'Unknown'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <span className="font-semibold text-slate-800">{Number(log.hours).toFixed(1)}</span>
                          <span className="text-xs text-slate-500 ml-1">hrs</span>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-600 max-w-md">
                          {log.description || <span className="text-slate-400 italic">No description</span>}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                            log.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            log.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {log.status || 'PENDING'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right whitespace-nowrap">
                          {canDelete && (
                            <Button
                              variant="ghost"
                              onClick={() => handleDeleteWorkLog(log._id)}
                              className="text-slate-400 hover:text-rose-600 p-1 h-auto w-auto"
                              title="Delete Work Log"
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Clock size={24} />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">No time logged yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                This project is configured to log time directly without modules or tasks. Start tracking time right away.
              </p>
              <button
                onClick={openProjectLogModal}
                className="zoho-btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus size={15} /> Log First Entry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleExport = async () => {
    if (!modules || modules.length === 0) {
      toast.error('No data to export');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Project Details');

    worksheet.columns = [
      { header: 'Item Name', key: 'name', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Assignee / User', key: 'assignee', width: 25 },
      { header: 'Start Date / Log Date', key: 'startDate', width: 15 },
      { header: 'Due Date', key: 'dueDate', width: 15 },
      { header: 'Est. Hours', key: 'estHours', width: 12 },
      { header: 'Logged / Hours', key: 'loggedHours', width: 15 },
      { header: 'Description', key: 'description', width: 40 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    const projectRow = worksheet.addRow({
      name: `PROJECT: ${project.name}`,
      status: project.isActive ? 'Active' : 'Inactive',
      assignee: project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : '-',
      startDate: project.startDate ? format(new Date(project.startDate), 'yyyy-MM-dd') : '',
      dueDate: project.dueDate ? format(new Date(project.dueDate), 'yyyy-MM-dd') : '',
      estHours: '-',
      loggedHours: '-',
      description: project.description || ''
    });
    projectRow.outlineLevel = 0;
    projectRow.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
    projectRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC5D9F1' } };

    modules.forEach(module => {
      const modRow = worksheet.addRow({
        name: `  ${module.name}`,
        status: module.status,
        assignee: '-',
        startDate: module.startDate ? format(new Date(module.startDate), 'yyyy-MM-dd') : '',
        dueDate: module.dueDate ? format(new Date(module.dueDate), 'yyyy-MM-dd') : '',
        estHours: '-',
        loggedHours: '-',
        description: module.description || ''
      });
      modRow.outlineLevel = 1;
      modRow.font = { bold: true, size: 11 };
      modRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } };

      if (module.tasks && module.tasks.length > 0) {
        module.tasks.forEach(task => {
          const taskRow = worksheet.addRow({
            name: `    ${task.name}`,
            status: task.status,
            assignee: task.assignees?.map(a => `${a.firstName} ${a.lastName}`).join(', ') || 'Unassigned',
            startDate: task.startDate ? format(new Date(task.startDate), 'yyyy-MM-dd') : '',
            dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
            estHours: task.estimatedHours || 0,
            loggedHours: task.loggedHours || 0,
            description: task.description || ''
          });
          taskRow.outlineLevel = 2;

          if (task.workLogs && task.workLogs.length > 0) {
            task.workLogs.forEach(log => {
              const logRow = worksheet.addRow({
                name: `        Log: ${format(new Date(log.date), 'MM/dd')}`,
                status: '-',
                assignee: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown',
                startDate: log.date ? format(new Date(log.date), 'yyyy-MM-dd') : '',
                dueDate: '-',
                estHours: '-',
                loggedHours: log.hours,
                description: log.description
              });
              logRow.outlineLevel = 3;
              logRow.font = { italic: true, color: { argb: 'FF666666' } };
            });
          }
        });
      }
    });

    worksheet.autoFilter = {
      from: 'A1',
      to: { row: 1, column: 8 }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.xlsx`;
    saveAs(new Blob([buffer]), fileName);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans p-6 md:p-10 space-y-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!project) return <div className="p-8 text-center text-slate-500">Project not found</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Project Header Component */}
        <ProjectHeader
          project={project}
          employees={employees}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          onOpenCreateModule={openCreateModuleModal}
          onOpenCreateTask={openCreateTaskModal}
          onOpenLogModal={openProjectLogModal}
          onExportExcel={handleExport}
          onEditProject={canUpdateProject ? openEditProjectModal : null}
          canUpdateProject={canUpdateProject}
          canCreateTask={canCreateTask}
          canExportReport={canExportReport}
          onSelectMember={handleSelectMemberTrace}
          discussionsCount={discussionsCount}
        />

        {/* Dynamic View Content */}
        {!hasModules && viewMode !== 'user-trace' && viewMode !== 'discussions' ? (
          <DirectProjectView />
        ) : (
          <div>
            {viewMode === 'overview' && (
              <ProjectOverview
                project={project}
                projectId={project?._id || id}
                modules={modules}
                tasks={tasks}
                onOpenCreateModule={openCreateModuleModal}
                onOpenCreateTask={openCreateTaskModal}
                onEditModule={handleEditModule}
                onDeleteModule={handleDeleteModule}
                onSelectTask={setSelectedTaskId}
                canUpdateProject={canUpdateProject}
                onViewDiscussions={() => setViewMode('discussions')}
              />
            )}

            {viewMode === 'board' && (
              <TaskBoard
                tasks={tasks}
                modules={modules}
                employees={employees}
                onSelectTask={setSelectedTaskId}
                onOpenCreateTask={openCreateTaskModal}
                onTasksChanged={fetchData}
              />
            )}

            {viewMode === 'hierarchy' && (
              <ProjectHierarchy
                modules={modules}
                project={project}
                canUpdateProject={canUpdateProject}
                canCreateTask={canCreateTask}
                canUpdateTask={canUpdateTask}
                canDeleteModule={canDeleteModule}
                canDeleteTask={canDeleteTask}
                onOpenCreateTask={openCreateTaskModal}
                onEditModule={handleEditModule}
                onDeleteModule={handleDeleteModule}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onOpenLogModal={openLogModal}
                onSelectTask={setSelectedTaskId}
              />
            )}

            {viewMode === 'performance' && (
              <ProjectPerformance
                projectId={id}
                project={project}
                members={project?.members || []}
                onSelectTask={setSelectedTaskId}
              />
            )}

            {viewMode === 'user-trace' && (
              <UserPerformanceTrace
                projectId={id}
                project={project}
                members={project?.members || []}
                employees={employees}
                tasks={tasks}
                modules={modules}
                onSelectTask={setSelectedTaskId}
                onOpenLogModal={openProjectLogModal}
                selectedUserId={traceUserId}
                onSelectUserId={setTraceUserId}
              />
            )}

            {viewMode === 'discussions' && (
              <ProjectDiscussions
                projectId={project?._id || id}
                project={project}
                workLogs={project?.workLogs || []}
                onRefreshProject={fetchData}
                onSelectTask={setSelectedTaskId}
                allTasks={tasks}
              />
            )}
          </div>
        )}
      </div>

      {/* Task Drawer */}
      <TaskDrawer
        taskId={selectedTaskId}
        isOpen={Boolean(selectedTaskId)}
        onClose={() => setSelectedTaskId(null)}
        allTasks={tasks}
        employees={employees}
        modules={modules}
        project={project}
        onTaskUpdated={fetchData}
      />

      {/* Edit Project Modal — full form */}
      <EditProjectModal
        project={project}
        isOpen={showEditProjectModal}
        onClose={() => setShowEditProjectModal(false)}
        onSuccess={fetchData}
      />

      {/* Module Modal */}
      {showModuleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">{editingModuleId ? 'Edit Module' : 'New Module'}</h3>
              <button onClick={() => setShowModuleModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleCreateModule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Module Name</label>
                <input required className="zoho-input" value={moduleForm.name} onChange={e => setModuleForm({ ...moduleForm, name: e.target.value })} placeholder="e.g. Authentication" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                <select className="zoho-input" value={moduleForm.status} onChange={e => setModuleForm({ ...moduleForm, status: e.target.value })}>
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                  <input type="date" className="zoho-input" value={moduleForm.startDate} onChange={e => setModuleForm({ ...moduleForm, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Due Date</label>
                  <input type="date" className="zoho-input" value={moduleForm.dueDate} onChange={e => setModuleForm({ ...moduleForm, dueDate: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowModuleModal(false)} className="zoho-btn-secondary cursor-pointer">Cancel</button>
                <Button type="submit" isLoading={isSubmitting}>{editingModuleId ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}      {/* Task Modal (New Task & Edit Task - Redesigned Wider) */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200/90 my-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 via-white to-blue-50/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20 shrink-0">
                  <CheckSquare size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800">
                      {editingTaskId ? 'Edit Task' : 'New Task'}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {project?.name || 'Project'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editingTaskId
                      ? 'Update task specifications, team assignment, and schedule'
                      : 'Define task goals, assign team members (auto-assigned by default), and set schedule'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 md:p-7 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Core Info & Schedule (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Target Module */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Folder size={13} className="text-blue-600" /> Target Module <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      className="w-full px-3.5 py-2.5 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white shadow-2xs transition-all cursor-pointer"
                      value={activeModuleId || ''}
                      onChange={e => setActiveModuleId(e.target.value)}
                    >
                      <option value="" disabled>Select Target Module</option>
                      {modules.map(mod => (
                        <option key={mod._id} value={mod._id}>{mod.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Task Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Task Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white shadow-2xs transition-all placeholder:font-normal placeholder:text-slate-400"
                      value={taskForm.name}
                      onChange={e => setTaskForm({ ...taskForm, name: e.target.value })}
                      placeholder="e.g. Implement OAuth Flow & Token Refresh"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Description / Acceptance Criteria
                    </label>
                    <textarea
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white shadow-2xs transition-all resize-y min-h-[95px] placeholder:text-slate-400"
                      value={taskForm.description}
                      onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                      rows="3"
                      placeholder="Detail technical requirements, expected outcomes, or acceptance criteria..."
                    />
                  </div>

                  {/* Schedule & Estimation Card */}
                  <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={13} className="text-blue-600" /> Schedule & Estimation
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Date</label>
                        <input
                          type="date"
                          className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
                          value={taskForm.startDate}
                          onChange={e => setTaskForm({ ...taskForm, startDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Due Date</label>
                        <input
                          type="date"
                          className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
                          value={taskForm.dueDate}
                          onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                          <Clock size={11} className="text-slate-400" /> Est. Hours
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
                          value={taskForm.estimatedHours}
                          onChange={e => setTaskForm({ ...taskForm, estimatedHours: e.target.value })}
                          placeholder="8"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Workflow & Assignees (5 cols) */}
                <div className="lg:col-span-5 space-y-4 flex flex-col">
                  {/* Status & Priority */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Status
                      </label>
                      <select
                        className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-blue-500 bg-white cursor-pointer"
                        value={taskForm.status || 'TODO'}
                        onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="REVIEW">In Review</option>
                        <option value="BLOCKED">Blocked</option>
                        <option value="DONE">Done</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Priority
                      </label>
                      <select
                        className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-blue-500 bg-white cursor-pointer"
                        value={taskForm.priority === 'CRITICAL' ? 'URGENT' : taskForm.priority}
                        onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                  </div>

                  {/* Assignees Selection */}
                  <div className="flex-1 flex flex-col p-4 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Users size={13} className="text-blue-600" /> Assignees
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700">
                          {taskForm.assignees.length}
                        </span>
                      </label>

                      {/* Quick Assign Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const pIds = allSelectableAssignees.filter(a => a.isProjectMember).map(a => a._id);
                            setTaskForm(prev => ({ ...prev, assignees: pIds }));
                          }}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors cursor-pointer"
                          title="Auto-assign all members of this project"
                        >
                          Project Team ({projectMemberIdSet.size})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaskForm(prev => ({ ...prev, assignees: [] }))}
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 mb-2">
                      Assigned by default. Click to uncheck or select team members.
                    </p>

                    {/* Member Search */}
                    <div className="relative mb-2">
                      <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search team members..."
                        value={taskAssigneeSearch}
                        onChange={e => setTaskAssigneeSearch(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white"
                      />
                    </div>

                    {/* Assignees Scroll List */}
                    <div className="flex-1 max-h-56 overflow-y-auto space-y-1 pr-1">
                      {filteredAssignees.map(emp => {
                        const isChecked = taskForm.assignees.includes(emp._id);
                        return (
                          <div
                            key={emp._id}
                            onClick={() => {
                              const id = emp._id;
                              setTaskForm(prev => ({
                                ...prev,
                                assignees: isChecked ? prev.assignees.filter(a => a !== id) : [...prev.assignees, id]
                              }));
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-500/20'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="rounded text-blue-600 pointer-events-none"
                              />
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 overflow-hidden">
                                {emp.profilePicture ? (
                                  <img src={emp.profilePicture} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  `${(emp.firstName || 'U')[0]}${(emp.lastName || '')[0] || ''}`.toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-800 truncate">
                                  {emp.firstName} {emp.lastName}
                                </div>
                                {emp.email && (
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {emp.email}
                                  </div>
                                )}
                              </div>
                            </div>

                            {emp.isProjectMember && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 shrink-0">
                                Team
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {filteredAssignees.length === 0 && (
                        <div className="py-6 text-center text-xs text-slate-400">
                          No members match &ldquo;{taskAssigneeSearch}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{taskForm.assignees.length}</span> assigned &bull; Module: <span className="font-semibold text-slate-700">{modules.find(m => m._id === activeModuleId)?.name || 'None'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowTaskModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    isLoading={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    {editingTaskId ? 'Update Task' : 'Save Task'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Work Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock size={18} className="text-emerald-600" /> Log Time {loggingTaskId ? '' : `- ${project?.name || ''}`}
              </h3>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleLogWork} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                <input type="date" required className="zoho-input" value={logForm.date} onChange={e => setLogForm({ ...logForm, date: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hours Spent</label>
                <input type="number" step="0.1" required className="zoho-input" value={logForm.hours} onChange={e => setLogForm({ ...logForm, hours: e.target.value })} placeholder="e.g. 2.5" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                <textarea className="zoho-input" value={logForm.description} onChange={e => setLogForm({ ...logForm, description: e.target.value })} rows="3" placeholder="Work summary..." />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowLogModal(false)} className="zoho-btn-secondary cursor-pointer">Cancel</button>
                <Button type="submit" isLoading={isSubmitting} className="zoho-btn-primary bg-emerald-600 hover:bg-emerald-700">Log Time</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
