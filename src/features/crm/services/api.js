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
  // User mutations are governed by the organisation user module, not CRM.
  // Throw a clear error so callers know these are not supported here.
  createUser: async () => { throw new Error('User creation is managed via the Organisation module, not CRM admin.'); },
  updateUser: async () => { throw new Error('User update is managed via the Organisation module, not CRM admin.'); },
  deleteUser: async () => { throw new Error('User deletion is managed via the Organisation module, not CRM admin.'); },
};
export const dataService = {
  importData: (data) => crmAdminService.importData(data),
  getImportData: (params) => crmAdminService.getImportData(params),
  syncImportData: (rows) => crmAdminService.syncImportData(rows),
  exportData: (entityType) => crmAdminService.exportData(entityType),
  mergeDuplicates: (data) => crmAdminService.mergeDuplicates(data),
};

export const authService = {
  getMe: async () => ({ success: true }),
};
