import {
  crmLeadsService,
  crmDealsService,
  crmPipelinesService,
  crmContactsService,
  crmAccountsService,
  crmActivitiesService,
  crmTasksService,
  crmFollowUpsService,
  crmCommunicationService,
  crmForecastService,
  crmAnalyticsService,
  crmGrowthService,
  crmWorkflowService,
  crmAiService,
  crmAdminService,
} from './crmApi';

export const leadsService = crmLeadsService;
export const dealsService = crmDealsService;
export const pipelinesService = crmPipelinesService;
export const contactsService = crmContactsService;
export const companiesService = crmAccountsService;
export const activitiesService = crmActivitiesService;
export const tasksService = crmTasksService;
export const followUpsService = crmFollowUpsService;
export const communicationService = crmCommunicationService;
export const growthService = crmGrowthService;
export const forecastService = {
  ...crmForecastService,
  createTarget: crmForecastService.createOrUpdateTarget,
};
export const analyticsService = {
  getDashboard: (params) => crmAnalyticsService.getDashboardAnalytics(params),
};
export const workflowService = crmWorkflowService;
export const aiService = {
  askAssistant: (data) => crmAiService.askAssistant(data),
  getInsights: () => crmAiService.getAiInsights(),
};
export const adminService = {
  ...crmAdminService,
  createUser: async (data) => {
    // In TalentCIO, user creation is governed by organization user module
    return crmAdminService.getUsers();
  },
  updateUser: async (id, data) => {
    return crmAdminService.getUsers();
  },
  deleteUser: async (id) => {
    return crmAdminService.getUsers();
  },
};
export const dataService = {
  importData: (data) => crmAdminService.importData(data),
  exportData: (entityType) => crmAdminService.exportData(entityType),
  mergeDuplicates: (data) => crmAdminService.mergeDuplicates(data),
};

export const authService = {
  getMe: async () => ({ success: true }),
};
