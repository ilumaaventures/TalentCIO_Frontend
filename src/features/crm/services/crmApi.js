import api from '@/lib/apiClient';

export const crmLeadsService = {
  getLeads: async (params = {}) => {
    const res = await api.get('/crm/leads', { params });
    return res.data;
  },
  getLeadById: async (id) => {
    const res = await api.get(`/crm/leads/${id}`);
    return res.data;
  },
  createLead: async (data) => {
    const res = await api.post('/crm/leads', data);
    return res.data;
  },
  updateLead: async (id, data) => {
    const res = await api.put(`/crm/leads/${id}`, data);
    return res.data;
  },
  deleteLead: async (id) => {
    const res = await api.delete(`/crm/leads/${id}`);
    return res.data;
  },
  checkDuplicates: async (data) => {
    const res = await api.post('/crm/leads/check-duplicates', data);
    return res.data;
  },
  checkDuplicatesBatch: async (items) => {
    const res = await api.post('/crm/leads/check-duplicates-batch', { items });
    return res.data;
  },
  bulkUpdate: async (data) => {
    const res = await api.post('/crm/leads/bulk-update', data);
    return res.data;
  },
  moveToRecycleBin: async (items) => {
    const res = await api.post('/crm/leads/move-to-bin', { items });
    return res.data;
  },
  convertLead: async (id, data) => {
    const res = await api.post(`/crm/leads/${id}/convert`, data);
    return res.data;
  },
};

export const crmDealsService = {
  getDeals: async (params = {}) => {
    const res = await api.get('/crm/deals', { params });
    return res.data;
  },
  getPipelineBoard: async (params = {}) => {
    const res = await api.get('/crm/deals/pipeline-board', { params });
    return res.data;
  },
  getDealById: async (id) => {
    const res = await api.get(`/crm/deals/${id}`);
    return res.data;
  },
  createDeal: async (data) => {
    const res = await api.post('/crm/deals', data);
    return res.data;
  },
  updateDealStage: async (id, data) => {
    const res = await api.patch(`/crm/deals/${id}/stage`, data);
    return res.data;
  },
  updateDeal: async (id, data) => {
    const res = await api.put(`/crm/deals/${id}`, data);
    return res.data;
  },
  deleteDeal: async (id) => {
    const res = await api.delete(`/crm/deals/${id}`);
    return res.data;
  },
};

export const crmPipelinesService = {
  getPipelines: async () => {
    const res = await api.get('/crm/pipelines');
    return res.data;
  },
  createPipeline: async (data) => {
    const res = await api.post('/crm/pipelines', data);
    return res.data;
  },
  updatePipeline: async (id, data) => {
    const res = await api.put(`/crm/pipelines/${id}`, data);
    return res.data;
  },
  deletePipeline: async (id) => {
    const res = await api.delete(`/crm/pipelines/${id}`);
    return res.data;
  },
};

export const crmContactsService = {
  getContacts: async (params = {}) => {
    const res = await api.get('/crm/contacts', { params });
    return res.data;
  },
  getContactById: async (id) => {
    const res = await api.get(`/crm/contacts/${id}`);
    return res.data;
  },
  createContact: async (data) => {
    const res = await api.post('/crm/contacts', data);
    return res.data;
  },
  updateContact: async (id, data) => {
    const res = await api.put(`/crm/contacts/${id}`, data);
    return res.data;
  },
  deleteContact: async (id) => {
    const res = await api.delete(`/crm/contacts/${id}`);
    return res.data;
  },
};

export const crmAccountsService = {
  getCompanies: async (params = {}) => {
    const res = await api.get('/crm/companies', { params });
    return res.data;
  },
  getCompanyById: async (id) => {
    const res = await api.get(`/crm/companies/${id}`);
    return res.data;
  },
  createCompany: async (data) => {
    const res = await api.post('/crm/companies', data);
    return res.data;
  },
  updateCompany: async (id, data) => {
    const res = await api.put(`/crm/companies/${id}`, data);
    return res.data;
  },
  deleteCompany: async (id) => {
    const res = await api.delete(`/crm/companies/${id}`);
    return res.data;
  },
};

export const crmActivitiesService = {
  getActivities: async (params = {}) => {
    const res = await api.get('/crm/activities', { params });
    return res.data;
  },
  logActivity: async (data) => {
    const res = await api.post('/crm/activities', data);
    return res.data;
  },
};

export const crmTasksService = {
  getTasks: async (params = {}) => {
    const res = await api.get('/crm/tasks', { params });
    return res.data;
  },
  createTask: async (data) => {
    const res = await api.post('/crm/tasks', data);
    return res.data;
  },
  updateTask: async (id, data) => {
    const res = await api.put(`/crm/tasks/${id}`, data);
    return res.data;
  },
  deleteTask: async (id) => {
    const res = await api.delete(`/crm/tasks/${id}`);
    return res.data;
  },
};

export const crmFollowUpsService = {
  getFollowUps: async (params = {}) => {
    const res = await api.get('/crm/follow-ups', { params });
    return res.data;
  },
  createFollowUp: async (data) => {
    const res = await api.post('/crm/follow-ups', data);
    return res.data;
  },
  completeFollowUp: async (id, data) => {
    const res = await api.patch(`/crm/follow-ups/${id}/complete`, data);
    return res.data;
  },
  rescheduleFollowUp: async (id, data) => {
    const res = await api.patch(`/crm/follow-ups/${id}/reschedule`, data);
    return res.data;
  },
  deleteFollowUp: async (id) => {
    const res = await api.delete(`/crm/follow-ups/${id}`);
    return res.data;
  },
};

export const crmCommunicationService = {
  getEmails: async () => {
    const res = await api.get('/crm/communication/emails');
    return res.data;
  },
  sendEmail: async (data) => {
    const res = await api.post('/crm/communication/emails', data);
    return res.data;
  },
  getWhatsApp: async () => {
    const res = await api.get('/crm/communication/whatsapp');
    return res.data;
  },
  getWhatsAppMessages: async () => {
    const res = await api.get('/crm/communication/whatsapp');
    return res.data;
  },
  sendWhatsApp: async (data) => {
    const res = await api.post('/crm/communication/whatsapp', data);
    return res.data;
  },
  sendWhatsAppMessage: async (data) => {
    const res = await api.post('/crm/communication/whatsapp', data);
    return res.data;
  },
  getCalls: async () => {
    const res = await api.get('/crm/communication/calls');
    return res.data;
  },
  logCall: async (data) => {
    const res = await api.post('/crm/communication/calls', data);
    return res.data;
  },
};

export const crmForecastService = {
  getForecastSummary: async () => {
    const res = await api.get('/crm/forecast');
    return res.data;
  },
  getTargets: async () => {
    const res = await api.get('/crm/forecast/targets');
    return res.data;
  },
  createOrUpdateTarget: async (data) => {
    const res = await api.post('/crm/forecast/targets', data);
    return res.data;
  },
  getCommissions: async () => {
    const res = await api.get('/crm/forecast/commissions');
    return res.data;
  },
  approveCommission: async (id) => {
    const res = await api.patch(`/crm/forecast/commissions/${id}/approve`);
    return res.data;
  },
  getRepPerformance: async (userId, params = {}) => {
    const res = await api.get(`/crm/forecast/performance/${userId}`, { params });
    return res.data;
  },
};

export const crmAnalyticsService = {
  getDashboardAnalytics: async (params = {}) => {
    const res = await api.get('/crm/analytics/dashboard', { params });
    return res.data;
  },
};

export const crmGrowthService = {
  getSequences: async () => {
    const res = await api.get('/crm/sequences');
    return res.data;
  },
  createSequence: async (data) => {
    const res = await api.post('/crm/sequences', data);
    return res.data;
  },
  enrollLead: async (id, data) => {
    const res = await api.post(`/crm/sequences/${id}/enroll`, data);
    return res.data;
  },
  getCampaigns: async () => {
    const res = await api.get('/crm/campaigns');
    return res.data;
  },
  createCampaign: async (data) => {
    const res = await api.post('/crm/campaigns', data);
    return res.data;
  },
};

export const crmWorkflowService = {
  getWorkflows: async () => {
    const res = await api.get('/crm/workflows');
    return res.data;
  },
  createWorkflow: async (data) => {
    const res = await api.post('/crm/workflows', data);
    return res.data;
  },
  toggleWorkflow: async (id) => {
    const res = await api.patch(`/crm/workflows/${id}/toggle`);
    return res.data;
  },
  deleteWorkflow: async (id) => {
    const res = await api.delete(`/crm/workflows/${id}`);
    return res.data;
  },
};

export const crmAiService = {
  askAssistant: async (data) => {
    const res = await api.post('/crm/ai/ask', data);
    return res.data;
  },
  getAiInsights: async () => {
    const res = await api.get('/crm/ai/insights');
    return res.data;
  },
};

export const crmAdminService = {
  getSettings: async () => {
    const res = await api.get('/crm/admin/settings');
    return res.data;
  },
  updateSettings: async (data) => {
    const res = await api.put('/crm/admin/settings', data);
    return res.data;
  },
  getUsers: async () => {
    const res = await api.get('/crm/admin/users');
    return res.data;
  },
  getTerritories: async () => {
    const res = await api.get('/crm/admin/territories');
    return res.data;
  },
  createTerritory: async (data) => {
    const res = await api.post('/crm/admin/territories', data);
    return res.data;
  },
  deleteTerritory: async (id) => {
    const res = await api.delete(`/crm/admin/territories/${id}`);
    return res.data;
  },
  getAuditLogs: async () => {
    const res = await api.get('/crm/admin/audit-logs');
    return res.data;
  },
  getCustomFields: async () => {
    const res = await api.get('/crm/admin/custom-fields');
    return res.data;
  },
  createCustomField: async (data) => {
    const res = await api.post('/crm/admin/custom-fields', data);
    return res.data;
  },
  importData: async (data) => {
    const res = await api.post('/crm/data/import', data);
    return res.data;
  },
  exportData: async (entityType) => {
    const res = await api.get(`/crm/data/export/${entityType}`);
    return res.data;
  },
  mergeDuplicates: async (data) => {
    const res = await api.post('/crm/data/merge', data);
    return res.data;
  },
};
