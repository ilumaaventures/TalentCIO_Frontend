import api from '@/lib/apiClient';

export const projectService = {
  // Project & Hierarchy
  getHierarchy: (projectId) => api.get(`/projects/${projectId}/hierarchy`),
  getProjects: (params) => api.get('/projects', { params }),
  getEmployees: () => api.get('/projects/employees'),
  getClients: () => api.get('/projects/clients'),
  getBusinessUnits: () => api.get('/projects/business-units'),

  // Modules
  getModules: (projectId) => api.get(`/projects/${projectId}/modules`),
  createModule: (data) => api.post('/projects/modules', data),
  updateModule: (id, data) => api.put(`/projects/modules/${id}`, data),
  deleteModule: (id) => api.delete(`/projects/modules/${id}`),

  // Tasks
  getTasks: (params) => api.get('/tasks', { params }),
  getTaskById: (id) => api.get(`/tasks/${id}`),
  createTask: (data) => api.post('/tasks', data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  reorderTasks: (items) => api.post('/tasks/reorder', { items }),

  // Subtasks
  getSubtasks: (taskId) => api.get(`/tasks/${taskId}/subtasks`),
  createSubtask: (taskId, data) => api.post(`/tasks/${taskId}/subtasks`, data),

  // Comments
  getComments: (taskId) => api.get(`/tasks/${taskId}/comments`),
  createComment: (taskId, data) => api.post(`/tasks/${taskId}/comments`, data),
  updateComment: (taskId, commentId, data) => api.put(`/tasks/${taskId}/comments/${commentId}`, data),
  deleteComment: (taskId, commentId) => api.delete(`/tasks/${taskId}/comments/${commentId}`),

  // Activity Audit Log
  getTaskActivity: (taskId) => api.get(`/tasks/${taskId}/activity`),

  // Worklogs
  getWorkLogs: (params) => api.get('/projects/worklogs', { params }),
  logWork: (taskId, data) => api.post(`/projects/tasks/${taskId}/log`, data),
  logDirectProjectWork: (data) => api.post('/projects/worklogs', data),
  updateWorkLog: (id, data) => api.put(`/projects/worklogs/${id}`, data),
  deleteWorkLog: (id) => api.delete(`/projects/worklogs/${id}`),

  // Performance
  getProjectPerformance: (projectId) => api.get(`/projects/${projectId}/performance`),
  getMemberPerformance: (projectId, userId) => api.get(`/projects/${projectId}/performance/${userId}`),
  getEmployeePerformance: (userId, range = '30d') => api.get(`/users/${userId}/performance`, { params: { range } })
};

export default projectService;
