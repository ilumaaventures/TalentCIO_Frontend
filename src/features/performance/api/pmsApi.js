import api from '@/lib/apiClient';

export const pmsApi = {
  // Cycles
  getCycles: (params) => api.get('/performance/cycles', { params }),
  getCycle: (id) => api.get(`/performance/cycles/${id}`),
  createCycle: (data) => api.post('/performance/cycles', data),
  updateCycle: (id, data) => api.put(`/performance/cycles/${id}`, data),
  deleteCycle: (id) => api.delete(`/performance/cycles/${id}`),
  changeCycleStatus: (id, status) => api.patch(`/performance/cycles/${id}/status`, { status }),
  reopenCycle: (id, data) => api.post(`/performance/cycles/${id}/reopen`, data),
  syncCycleParticipants: (id) => api.post(`/performance/cycles/${id}/sync-participants`),

  // KRAs
  getKras: (params) => api.get('/performance/kras', { params }),
  createKra: (data) => api.post('/performance/kras', data),
  updateKra: (id, data) => api.put(`/performance/kras/${id}`, data),
  deleteKra: (id) => api.delete(`/performance/kras/${id}`),

  // KPIs
  getKpis: (params) => api.get('/performance/kpis', { params }),
  createKpi: (data) => api.post('/performance/kpis', data),
  updateKpi: (id, data) => api.put(`/performance/kpis/${id}`, data),
  submitKpiEvidence: (id, data) => api.post(`/performance/kpis/${id}/evidence`, data),
  verifyKpi: (id, data) => api.post(`/performance/kpis/${id}/verify`, data),

  // Goals
  getGoals: (params) => api.get('/performance/goals', { params }),
  getGoalTree: (params) => api.get('/performance/goals/tree', { params }),
  createGoal: (data) => api.post('/performance/goals', data),
  updateGoal: (id, data) => api.put(`/performance/goals/${id}`, data),
  checkInGoal: (id, data) => api.post(`/performance/goals/${id}/check-in`, data),
  approveGoal: (id, data) => api.post(`/performance/goals/${id}/approve`, data),

  // Competencies
  getCompetencies: (params) => api.get('/performance/competencies', { params }),
  createCompetency: (data) => api.post('/performance/competencies', data),
  updateCompetency: (id, data) => api.put(`/performance/competencies/${id}`, data),
  deleteCompetency: (id) => api.delete(`/performance/competencies/${id}`),

  // Appraisals & Approval Workflows
  getAppraisals: (params) => api.get('/performance/appraisals', { params }),
  getAppraisal: (id) => api.get(`/performance/appraisals/${id}`),
  saveSelfAppraisal: (id, data) => api.post(`/performance/appraisals/${id}/self`, data),
  saveManagerAppraisal: (id, data) => api.post(`/performance/appraisals/${id}/manager`, data),
  saveDepartmentHeadReview: (id, data) => api.post(`/performance/appraisals/${id}/department-head`, data),
  saveHrEvaluation: (id, data) => api.post(`/performance/appraisals/${id}/hr-evaluation`, data),
  saveFinalApproval: (id, data) => api.post(`/performance/appraisals/${id}/final-approval`, data),
  requestRevision: (id, data) => api.post(`/performance/appraisals/${id}/request-revision`, data),
  nominate360: (id, data) => api.post(`/performance/appraisals/${id}/nominate-360`, data),
  submit360: (id, data) => api.post(`/performance/appraisals/${id}/submit-360`, data),
  calibrate: (id, data) => api.post(`/performance/appraisals/${id}/calibrate`, data),
  publishAppraisals: (data) => api.post('/performance/appraisals/publish', data),
  acknowledgeAppraisal: (id, data) => api.post(`/performance/appraisals/${id}/acknowledge`, data),
  delegateReview: (id, data) => api.post(`/performance/appraisals/${id}/delegate`, data),
  reassignReviewer: (id, data) => api.post(`/performance/appraisals/${id}/reassign`, data),
  reopenAppraisal: (id, data) => api.post(`/performance/appraisals/${id}/reopen`, data),

  // Continuous Feedback
  getFeedbacks: (params) => api.get('/performance/feedback', { params }),
  giveFeedback: (data) => api.post('/performance/feedback', data),
  create1on1: (data) => api.post('/performance/feedback/1on1', data),
  toggleActionItem: (id, data) => api.patch(`/performance/feedback/${id}/action-item`, data),

  // PIP & IDP
  getPips: (params) => api.get('/performance/pips', { params }),
  createPip: (data) => api.post('/performance/pips', data),
  addPipCheckpoint: (id, data) => api.post(`/performance/pips/${id}/checkpoint`, data),
  updatePipStatus: (id, data) => api.patch(`/performance/pips/${id}/status`, data),

  getDevPlans: (params) => api.get('/performance/dev-plans', { params }),
  createDevPlan: (data) => api.post('/performance/dev-plans', data),
  updateDevObjective: (id, data) => api.patch(`/performance/dev-plans/${id}/objective`, data),

  // Analytics & Export
  getDashboardMetrics: (params) => api.get('/performance/analytics/dashboard', { params }),
  exportAppraisalsUrl: (cycleId) => `${api.defaults.baseURL || ''}/performance/analytics/export?cycleId=${cycleId || ''}`,

  // Settings
  getSettings: () => api.get('/performance/settings'),
  updateSettings: (data) => api.put('/performance/settings', data),

  // Simplified Direct Evaluations
  getEvaluations: (params) => api.get('/performance/evaluations', { params }),
  getMyScorecard: () => api.get('/performance/evaluations/my-scorecard'),
  submitEvaluationReview: (targetUserId, data) => api.post(`/performance/evaluations/${targetUserId}/submit-review`, data),
};

export default pmsApi;
