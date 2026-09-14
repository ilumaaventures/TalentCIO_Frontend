import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { ShieldAlert } from 'lucide-react';

// Pages
import { DashboardPage } from './dashboard/DashboardPage';
import { LeadsListPage } from './leads/LeadsListPage';
import { LeadDetailPage } from './leads/LeadDetailPage';
import { DealsListPage } from './deals/DealsListPage';
import { DealDetailPage } from './deals/DealDetailPage';
import { PipelinesConfigPage } from './deals/PipelinesConfigPage';
import { ContactsListPage } from './contacts/ContactsListPage';
import { CompaniesListPage } from './companies/CompaniesListPage';
import { FollowUpsPage } from './followups/FollowUpsPage';
import { TasksPage } from './tasks/TasksPage';
import { CalendarPage } from './calendar/CalendarPage';
import { ActivitiesPage } from './activities/ActivitiesPage';
import { EmailHubPage } from './communication/EmailHubPage';
import { WhatsAppHubPage } from './communication/WhatsAppHubPage';
import { CallingHubPage } from './communication/CallingHubPage';
import { SequencesPage } from './growth/SequencesPage';
import { CampaignsPage } from './growth/CampaignsPage';
import { ReportsPage } from './analytics/ReportsPage';
import { ForecastingPage } from './analytics/ForecastingPage';
import { TargetsPage } from './analytics/TargetsPage';
import { CommissionsPage } from './analytics/CommissionsPage';
import { LeaderboardPage } from './analytics/LeaderboardPage';
import { TeamMembersPage } from './team/TeamMembersPage';
import { TerritoriesPage } from './team/TerritoriesPage';
import { WorkflowsPage } from './automation/WorkflowsPage';
import { AiAssistantPage } from './ai/AiAssistantPage';
import { AiInsightsPage } from './ai/AiInsightsPage';
import { AuditLogsPage } from './settings/AuditLogsPage';
import { DataToolsPage } from './tools/DataToolsPage';
import { SettingsPage } from './settings/SettingsPage';

const TAB_PERMISSIONS = {
  dashboard: ['crm.view', 'crm.leads.read', 'crm.deals.read', 'crm.analytics.read', 'crm.admin'],
  leads: ['crm.leads.read', 'crm.leads.create', 'crm.admin'],
  deals: ['crm.deals.read', 'crm.deals.create', 'crm.admin'],
  pipelines: ['crm.pipelines.read', 'crm.pipelines.manage', 'crm.admin'],
  contacts: ['crm.contacts.read', 'crm.contacts.manage', 'crm.admin'],
  companies: ['crm.accounts.read', 'crm.accounts.manage', 'crm.admin'],
  'follow-ups': ['crm.followups.read', 'crm.followups.manage', 'crm.admin'],
  tasks: ['crm.tasks.read', 'crm.tasks.manage', 'crm.admin'],
  calendar: ['crm.tasks.read', 'crm.tasks.manage', 'crm.admin'],
  activities: ['crm.activities.read', 'crm.activities.create', 'crm.admin'],
  email: ['crm.communication.read', 'crm.communication.send', 'crm.admin'],
  whatsapp: ['crm.communication.read', 'crm.communication.send', 'crm.admin'],
  calls: ['crm.communication.read', 'crm.communication.send', 'crm.admin'],
  sequences: ['crm.growth.read', 'crm.growth.manage', 'crm.admin'],
  campaigns: ['crm.growth.read', 'crm.growth.manage', 'crm.admin'],
  workflows: ['crm.workflows.read', 'crm.workflows.manage', 'crm.admin'],
  reports: ['crm.analytics.read', 'crm.admin'],
  forecast: ['crm.forecast.read', 'crm.forecast.manage', 'crm.admin'],
  targets: ['crm.forecast.read', 'crm.forecast.manage', 'crm.admin'],
  commissions: ['crm.commissions.read', 'crm.commissions.manage', 'crm.admin'],
  leaderboard: ['crm.forecast.read', 'crm.commissions.read', 'crm.admin'],
  'team-members': ['crm.admin'],
  users: ['crm.admin'],
  territories: ['crm.territories.read', 'crm.territories.manage', 'crm.admin'],
  'ai-assistant': ['crm.ai.use', 'crm.admin'],
  'ai-insights': ['crm.ai.use', 'crm.admin'],
  'audit-logs': ['crm.admin'],
  'data-tools': ['crm.data.import', 'crm.data.export', 'crm.data.merge', 'crm.admin'],
  settings: ['crm.admin'],
};

function CrmWorkspaceContent() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.some(role => ['Admin', 'Super Admin', 'System Admin'].includes(role?.name || role))
    || user?.hasAllPermissions
    || user?.permissions?.includes('*');

  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'dashboard';
  const tabFromUrl = ['whatsapp', 'email', 'calls'].includes(rawTab) ? 'dashboard' : rawTab;
  const [activePage, setActivePage] = useState(tabFromUrl);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [selectedDealId, setSelectedDealId] = useState(null);

  const requiredPerms = TAB_PERMISSIONS[activePage];
  const hasTabAccess = isAdmin || !requiredPerms || requiredPerms.some(p => user?.permissions?.includes(p));

  useEffect(() => {
    if (['whatsapp', 'email', 'calls'].includes(rawTab)) {
      setSearchParams({ tab: 'dashboard' }, { replace: true });
    }
  }, [rawTab, setSearchParams]);

  useEffect(() => {
    setActivePage(tabFromUrl);
    if (tabFromUrl !== 'leads') setSelectedLeadId(null);
    if (tabFromUrl !== 'deals') setSelectedDealId(null);
  }, [tabFromUrl]);

  const handleNavigate = (pageId, entityId = null) => {
    setSearchParams({ tab: pageId });
    setActivePage(pageId);
    if (pageId === 'leads' && entityId) {
      setSelectedLeadId(entityId);
    } else if (pageId === 'deals' && entityId) {
      setSelectedDealId(entityId);
    } else {
      setSelectedLeadId(null);
      setSelectedDealId(null);
    }
  };

  const getPageMeta = () => {
    switch (activePage) {
      case 'dashboard':
        return { title: 'Executive Sales Dashboard', breadcrumbs: ['TalentCIO', 'Sales CRM', 'Cockpit'] };
      case 'leads':
        return selectedLeadId
          ? { title: 'Lead Workspace & Qualification', breadcrumbs: ['TalentCIO', 'Sales CRM', 'Leads', 'Detail'] }
          : { title: 'Lead Directory & Capture', breadcrumbs: ['TalentCIO', 'Sales CRM', 'Leads'] };
      case 'deals':
        return selectedDealId
          ? { title: 'Opportunity Workspace', breadcrumbs: ['TalentCIO', 'Sales CRM', 'Opportunities', 'Detail'] }
          : { title: 'Sales Pipeline & Opportunities', breadcrumbs: ['TalentCIO', 'Sales CRM', 'Opportunities'] };
      case 'pipelines':
        return { title: 'Sales Pipeline Architecture', breadcrumbs: ['TalentCIO', 'Sales CRM', 'Pipelines'] };
      case 'contacts':
        return { title: 'Client & Stakeholder Contacts', breadcrumbs: ['TalentCIO', 'Sales CRM', 'Contacts'] };
      case 'companies':
        return { title: 'Accounts & Company Profiles', breadcrumbs: ['TalentCIO', 'Sales CRM', 'Accounts'] };
      case 'follow-ups':
        return { title: 'Follow-up Command Center', breadcrumbs: ['TalentCIO', 'Sales CRM', 'Follow-ups'] };
      case 'tasks':
        return { title: 'Sales Tasks & Action Items', breadcrumbs: ['TalentCIO', 'Sales CRM', 'Tasks'] };
      case 'calendar':
        return { title: 'Sales Meetings & Schedule', breadcrumbs: ['TalentCIO', 'Sales CRM', 'Calendar'] };
      case 'activities':
        return { title: 'Interaction Feed & Timeline', breadcrumbs: ['TalentCIO', 'Sales CRM', 'Activities'] };
      case 'email':
        return { title: 'Email Communication Hub', breadcrumbs: ['TalentCIO', 'Communication', 'Email'] };
      case 'whatsapp':
        return { title: 'WhatsApp Business Outreach', breadcrumbs: ['TalentCIO', 'Communication', 'WhatsApp'] };
      case 'calls':
        return { title: 'Telephony & Call Logs', breadcrumbs: ['TalentCIO', 'Communication', 'Calls'] };
      case 'sequences':
        return { title: 'Automated Sales Sequences', breadcrumbs: ['TalentCIO', 'Growth', 'Sequences'] };
      case 'campaigns':
        return { title: 'Campaign Attribution & ROI', breadcrumbs: ['TalentCIO', 'Growth', 'Campaigns'] };
      case 'reports':
        return { title: 'Sales Performance Reports', breadcrumbs: ['TalentCIO', 'Analytics', 'Reports'] };
      case 'forecast':
        return { title: 'Sales Revenue Forecast', breadcrumbs: ['TalentCIO', 'Analytics', 'Forecast'] };
      case 'targets':
        return { title: 'Sales Quotas & Targets', breadcrumbs: ['TalentCIO', 'Analytics', 'Targets'] };
      case 'commissions':
        return { title: 'Sales Commission Ledger', breadcrumbs: ['TalentCIO', 'Analytics', 'Commissions'] };
      case 'leaderboard':
        return { title: 'Sales Team Leaderboard', breadcrumbs: ['TalentCIO', 'Analytics', 'Leaderboard'] };
      case 'team-members':
      case 'users':
        return { title: 'Sales Team & Roles', breadcrumbs: ['TalentCIO', 'Team', 'Members'] };
      case 'territories':
        return { title: 'Regional Territories', breadcrumbs: ['TalentCIO', 'Team', 'Territories'] };
      case 'workflows':
        return { title: 'Workflow Automation Rules', breadcrumbs: ['TalentCIO', 'Automation', 'Workflows'] };
      case 'ai-assistant':
        return { title: 'AI Sales Assistant', breadcrumbs: ['TalentCIO', 'AI', 'Assistant'] };
      case 'ai-insights':
        return { title: 'AI Opportunity Risk Insights', breadcrumbs: ['TalentCIO', 'AI', 'Insights'] };
      case 'audit-logs':
        return { title: 'Security & Audit Logs', breadcrumbs: ['TalentCIO', 'Admin', 'Audit Logs'] };
      case 'data-tools':
        return { title: 'Data Tools (CSV/Merge)', breadcrumbs: ['TalentCIO', 'Admin', 'Data Tools'] };
      case 'settings':
        return { title: 'CRM Settings', breadcrumbs: ['TalentCIO', 'Admin', 'Settings'] };
      default:
        return { title: 'TalentCIO Sales CRM', breadcrumbs: ['TalentCIO', 'Sales CRM'] };
    }
  };

  const { title, breadcrumbs } = getPageMeta();

  return (
    <AppLayout
      activePage={activePage}
      pageTitle={title}
      breadcrumbs={breadcrumbs}
      onNavigate={handleNavigate}
    >
      {!hasTabAccess ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
            <ShieldAlert size={28} className="text-amber-600" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Access Restricted</h3>
          <p className="text-xs text-slate-500 max-w-sm mb-5">
            You do not have permission to access the <span className="font-semibold text-slate-700">{title}</span> submodule. Contact your workspace administrator to request access.
          </p>
          <button
            type="button"
            onClick={() => handleNavigate('dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      ) : (
        <>
          {activePage === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}

          {activePage === 'leads' && (
            selectedLeadId ? (
              <LeadDetailPage
                leadId={selectedLeadId}
                onBack={() => setSelectedLeadId(null)}
                onNavigate={handleNavigate}
              />
            ) : (
              <LeadsListPage
                onNavigate={handleNavigate}
                onOpenLeadDetail={(id) => setSelectedLeadId(id)}
              />
            )
          )}

          {activePage === 'deals' && (
            selectedDealId ? (
              <DealDetailPage
                dealId={selectedDealId}
                onBack={() => setSelectedDealId(null)}
                onNavigate={handleNavigate}
              />
            ) : (
              <DealsListPage
                onNavigate={handleNavigate}
                onOpenDealDetail={(id) => setSelectedDealId(id)}
              />
            )
          )}

          {activePage === 'pipelines' && <PipelinesConfigPage />}
          {activePage === 'contacts' && <ContactsListPage onOpenContactDetail={(id) => handleNavigate('contacts', id)} />}
          {activePage === 'companies' && <CompaniesListPage onOpenCompanyDetail={(id) => handleNavigate('companies', id)} />}
          {activePage === 'follow-ups' && <FollowUpsPage />}
          {activePage === 'tasks' && <TasksPage />}
          {activePage === 'calendar' && <CalendarPage />}
          {activePage === 'activities' && <ActivitiesPage />}

          {activePage === 'email' && <EmailHubPage />}
          {activePage === 'whatsapp' && <WhatsAppHubPage />}
          {activePage === 'calls' && <CallingHubPage />}

          {activePage === 'sequences' && <SequencesPage />}
          {activePage === 'campaigns' && <CampaignsPage />}

          {activePage === 'reports' && <ReportsPage />}
          {activePage === 'forecast' && <ForecastingPage />}
          {activePage === 'targets' && <TargetsPage />}
          {activePage === 'commissions' && <CommissionsPage />}
          {activePage === 'leaderboard' && <LeaderboardPage />}

          {(activePage === 'team-members' || activePage === 'users') && <TeamMembersPage />}
          {activePage === 'territories' && <TerritoriesPage />}
          {activePage === 'workflows' && <WorkflowsPage />}

          {activePage === 'ai-assistant' && <AiAssistantPage onNavigate={handleNavigate} />}
          {activePage === 'ai-insights' && <AiInsightsPage onNavigate={handleNavigate} />}

          {activePage === 'audit-logs' && <AuditLogsPage />}
          {activePage === 'data-tools' && <DataToolsPage />}
          {activePage === 'settings' && <SettingsPage />}
        </>
      )}
    </AppLayout>
  );
}

export default function CrmApp() {
  return (
    <AuthProvider>
      <CrmWorkspaceContent />
    </AuthProvider>
  );
}
