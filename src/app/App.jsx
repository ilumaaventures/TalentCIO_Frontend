import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// HIGH-6: All page imports converted to React.lazy() for route-level code splitting.
// Each page is now loaded on-demand only when the user navigates to that route,
// reducing the initial JS bundle from ~4-6MB to ~800KB.
const Login = lazy(() => import('@/features/auth/pages/Login'));
const HandoffLogin = lazy(() => import('@/features/auth/pages/HandoffLogin'));
const OTPReset = lazy(() => import('@/features/auth/pages/OTPReset'));
const Unauthorized = lazy(() => import('@/pages/Unauthorized'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Attendance = lazy(() => import('@/features/attendance/pages/Attendance'));
const FlexibleOffSelection = lazy(() => import('@/features/attendance/pages/FlexibleOffSelection'));
const AttendanceSettings = lazy(() => import('@/features/attendance/pages/AttendanceSettings'));
const Timesheet = lazy(() => import('@/features/timesheet/pages/Timesheet'));
const EmailSettings = lazy(() => import('@/features/email/pages/EmailSettings'));
const NotificationSettings = lazy(() => import('@/features/settings/pages/NotificationSettings'));
const Users = lazy(() => import('@/features/users-roles/pages/Users'));
const Roles = lazy(() => import('@/features/users-roles/pages/Roles'));
const BusinessUnits = lazy(() => import('@/features/organization/pages/BusinessUnits'));
const OrgChart = lazy(() => import('@/features/organization/pages/OrgChart'));
const Departments = lazy(() => import('@/features/organization/pages/Departments'));
const Designations = lazy(() => import('@/features/organization/pages/Designations'));
const Clients = lazy(() => import('@/features/clients/pages/Clients'));
const ClientForm = lazy(() => import('@/features/clients/pages/ClientForm'));
const ClientView = lazy(() => import('@/features/clients/pages/ClientView'));
const Projects = lazy(() => import('@/features/projects/pages/Projects'));
const ProjectDetails = lazy(() => import('@/features/projects/pages/ProjectDetails'));
const Profile = lazy(() => import('@/features/employee-dossier/pages/Profile'));
const EmployeeProfile = lazy(() => import('@/features/employee-dossier/pages/EmployeeProfile'));
const Holidays = lazy(() => import('@/features/attendance/pages/Holidays'));
const LeaveConfig = lazy(() => import('@/features/leave/pages/LeaveConfig'));
const Leaves = lazy(() => import('@/features/leave/pages/Leaves'));
const EmployeeDossier = lazy(() => import('@/features/employee-dossier/pages/EmployeeDossier'));
const ClientSelection = lazy(() => import('@/features/talent-acquisition/pages/ClientSelection'));
const TalentAcquisitionDashboard = lazy(() => import('@/features/talent-acquisition/pages/TalentAcquisitionDashboard'));
const HiringRequestList = lazy(() => import('@/features/talent-acquisition/pages/HiringRequestList'));
const CreateHiringRequest = lazy(() => import('@/features/talent-acquisition/pages/CreateHiringRequest'));
const HiringRequestDetails = lazy(() => import('@/features/talent-acquisition/pages/HiringRequestDetails'));
const WorkflowSettings = lazy(() => import('@/features/talent-acquisition/pages/WorkflowSettings'));
const EmailTemplates = lazy(() => import('@/features/talent-acquisition/pages/EmailTemplates'));
const TAEmailHistory = lazy(() => import('@/features/talent-acquisition/pages/TAEmailHistory'));
const PhaseTemplates = lazy(() => import('@/features/talent-acquisition/pages/PhaseTemplates'));
const TAAccessSettings = lazy(() => import('@/features/talent-acquisition/pages/TAAccessSettings'));
const CandidateForm = lazy(() => import('@/features/talent-acquisition/pages/CandidateForm'));
const CandidateDetails = lazy(() => import('@/features/talent-acquisition/pages/CandidateDetails'));
const Phase1Candidates = lazy(() => import('@/features/talent-acquisition/pages/Phase1Candidates'));
const UserTADashboard = lazy(() => import('@/features/talent-acquisition/pages/UserTADashboard'));
const Meetings = lazy(() => import('@/features/meetings/pages/Meetings'));
const MeetingForm = lazy(() => import('@/features/meetings/pages/MeetingForm'));
const MeetingDetails = lazy(() => import('@/features/meetings/pages/MeetingDetails'));
const HelpDesk = lazy(() => import('@/features/helpdesk/pages/HelpDesk'));
const HelpdeskAnalytics = lazy(() => import('@/features/helpdesk/pages/HelpdeskAnalytics'));
const QueryDetails = lazy(() => import('@/features/helpdesk/pages/QueryDetails'));
const Discussions = lazy(() => import('@/features/helpdesk/pages/Discussions'));
const Announcements = lazy(() => import('@/features/announcements/pages/Announcements'));
const GlobalTADashboard = lazy(() => import('@/features/talent-acquisition/pages/GlobalTADashboard'));
const InterviewAnalytics = lazy(() => import('@/features/talent-acquisition/pages/InterviewAnalytics'));
const Onboarding = lazy(() => import('@/features/onboarding/pages/Onboarding'));
const Offboarding = lazy(() => import('@/features/offboarding/pages/Offboarding'));
const HREmailSend = lazy(() => import('@/features/email/pages/HREmailSend'));
const RecycleBin = lazy(() => import('@/features/recycle-bin/pages/RecycleBin'));
const PreOnboardingLogin = lazy(() => import('@/features/onboarding/pages/PreOnboardingLogin'));
const PreOnboardingPortal = lazy(() => import('@/features/onboarding/pages/PreOnboardingPortal'));
const SalaryCalculator = lazy(() => import('@/features/payroll/pages/SalaryCalculator'));
const EssDashboard     = lazy(() => import('@/features/ess/pages/EssDashboard'));
const MyClaims         = lazy(() => import('@/features/reimbursement/pages/MyClaims'));
const ApprovalQueue    = lazy(() => import('@/features/reimbursement/pages/ApprovalQueue'));
const CompanyDocuments = lazy(() => import('@/features/ess-documents/pages/CompanyDocuments'));
const MyPayslips       = lazy(() => import('@/features/ess/pages/MyPayslips'));


import ProtectedRoute from '@/app/guards/ProtectedRoute';
import SystemRoute from '@/app/guards/SystemRoute';
import Layout from '@/app/layouts/Layout';
import {
  ADMIN_ROLES,
  ATTENDANCE_SETTINGS_PERMISSIONS,
  BIN_VIEW_PERMISSIONS,
  BUSINESS_UNIT_ACCESS_PERMISSIONS,
  CLIENT_ACCESS_PERMISSIONS,
  CLIENT_CREATE_PERMISSIONS,
  CLIENT_UPDATE_PERMISSIONS,
  EMAIL_SETTINGS_PERMISSIONS,
  HR_EMAIL_PERMISSIONS,
  LEAVE_CONFIG_PERMISSIONS,
  NOTIFICATION_SETTINGS_PERMISSIONS,
  ONBOARDING_VIEW_PERMISSIONS,
  OFFBOARDING_PERMISSIONS,
  ROLE_ACCESS_PERMISSIONS,
  TA_CONFIG_PERMISSIONS,
  TA_EMAIL_TEMPLATE_PERMISSIONS,
  SALARY_CALCULATOR_PERMISSIONS,
  ORG_CHART_VIEW_PERMISSIONS,
  DEPARTMENT_ACCESS_PERMISSIONS,
  DESIGNATION_ACCESS_PERMISSIONS,
  canAccessTAAnalytics,
  canAccessUsers
} from '@/config/accessPolicies';

import { Provider } from 'react-redux';
import store from '@/app/store';

// Fallback shown while a lazy chunk is loading
const PageLoader = () => (
  <div style={{
    position: 'fixed', inset: 0, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: '#f1f5f9', zIndex: 9999
  }}>
    <div style={{
      width: 36, height: 36, border: '3px solid #e2e8f0',
      borderTop: '3px solid #2563eb', borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AuthProvider>
          <Toaster position="top-right" />
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/auth/handoff" element={<HandoffLogin />} />
                <Route path="/reset-password" element={<OTPReset />} />
                <Route path="/pre-onboarding/login" element={<PreOnboardingLogin />} />
                <Route path="/pre-onboarding/portal" element={<PreOnboardingPortal />} />


                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route path="/" element={
                      <SystemRoute>
                        <Dashboard />
                      </SystemRoute>
                    } />
                    <Route path="/attendance" element={(
                      <ProtectedRoute moduleName="attendance" redirectTo="/">
                        <Attendance />
                      </ProtectedRoute>
                    )} />
                    <Route path="/attendance/*" element={(
                      <ProtectedRoute moduleName="attendance" redirectTo="/">
                        <Attendance />
                      </ProtectedRoute>
                    )} />
                    <Route path="/attendance/flexible-off" element={(
                      <ProtectedRoute moduleName="attendance" redirectTo="/">
                        <FlexibleOffSelection />
                      </ProtectedRoute>
                    )} />
                    <Route path="/flexible-off" element={(
                      <ProtectedRoute moduleName="attendance" redirectTo="/">
                        <FlexibleOffSelection />
                      </ProtectedRoute>
                    )} />
                    <Route path="/attendance-settings" element={(
                      <ProtectedRoute
                        moduleName="attendance"
                        requiredPermissions={ATTENDANCE_SETTINGS_PERMISSIONS}
                        requiredRoles={ADMIN_ROLES}
                        allowAllPermissions
                        redirectTo="/"
                      >
                        <AttendanceSettings />
                      </ProtectedRoute>
                    )} />
                    <Route path="/settings/email" element={(
                      <ProtectedRoute requiredPermissions={EMAIL_SETTINGS_PERMISSIONS}>
                        <EmailSettings />
                      </ProtectedRoute>
                    )} />
                    <Route path="/settings/notifications" element={(
                      <ProtectedRoute requiredPermissions={NOTIFICATION_SETTINGS_PERMISSIONS}>
                        <NotificationSettings />
                      </ProtectedRoute>
                    )} />
                    <Route path="/salary-calculator" element={(
                      <ProtectedRoute
                        requiredPermissions={SALARY_CALCULATOR_PERMISSIONS}
                        requiredRoles={ADMIN_ROLES}
                        allowAllPermissions
                        redirectTo="/"
                      >
                        <SalaryCalculator />
                      </ProtectedRoute>
                    )} />
                    <Route path="/timesheet" element={(

                      <ProtectedRoute moduleName="timesheet" redirectTo="/">
                        <Timesheet />
                      </ProtectedRoute>
                    )} />
                    <Route path="/leaves" element={(
                      <ProtectedRoute moduleName="leaves" redirectTo="/">
                        <Leaves />
                      </ProtectedRoute>
                    )} />
                    <Route path="/dossier/:userId" element={(
                      <ProtectedRoute moduleName="employeeDossier" redirectTo="/">
                        <EmployeeDossier />
                      </ProtectedRoute>
                    )} />

                    {/* Talent Acquisition */}
                    <Route element={<ProtectedRoute moduleName="talentAcquisition" redirectTo="/" />}>
                      <Route path="/ta" element={<TalentAcquisitionDashboard />} />
                      <Route path="/ta/clients" element={<ClientSelection />} />
                      <Route path="/ta/hiring-requests/:clientName" element={<HiringRequestList />} />
                      <Route path="/ta/workflows" element={(
                        <ProtectedRoute requiredPermissions={TA_CONFIG_PERMISSIONS}>
                          <WorkflowSettings />
                        </ProtectedRoute>
                      )} />
                      <Route path="/ta/settings/phase-templates" element={(
                        <ProtectedRoute requiredPermissions={TA_CONFIG_PERMISSIONS}>
                          <PhaseTemplates />
                        </ProtectedRoute>
                      )} />
                      <Route path="/ta/settings/access" element={(
                        <ProtectedRoute requiredPermissions={TA_CONFIG_PERMISSIONS}>
                          <TAAccessSettings />
                        </ProtectedRoute>
                      )} />
                      <Route path="/ta/email-templates" element={(
                        <ProtectedRoute requiredPermissions={TA_EMAIL_TEMPLATE_PERMISSIONS}>
                          <EmailTemplates />
                        </ProtectedRoute>
                      )} />
                      <Route path="/ta/email-history" element={<TAEmailHistory />} />
                      <Route path="/ta/create-request" element={<CreateHiringRequest />} />
                      <Route path="/ta/edit-request/:id" element={<CreateHiringRequest />} />
                      <Route path="/ta/view/:id" element={<HiringRequestDetails />} />
                      <Route path="/ta/hiring-request/:hiringRequestId/add-candidate" element={<CandidateForm />} />
                      <Route path="/ta/hiring-request/:hiringRequestId/candidate/:candidateId/edit" element={<CandidateForm />} />
                      <Route path="/ta/hiring-request/:hiringRequestId/candidate/:candidateId/view" element={<CandidateDetails />} />
                      <Route path="/ta/hiring-request/:hiringRequestId/phase1" element={<Phase1Candidates />} />
                      <Route path="/ta/user-dashboard/:userName" element={<UserTADashboard />} />
                      <Route path="/ta/analysis" element={(
                        <ProtectedRoute check={canAccessTAAnalytics}>
                          <GlobalTADashboard />
                        </ProtectedRoute>
                      )} />
                      <Route path="/ta/interview-analytics" element={<InterviewAnalytics />} />
                    </Route>

                    <Route path="/profile" element={<Profile />} />
                    <Route path="/announcements" element={(
                      <ProtectedRoute moduleName="announcements" redirectTo="/">
                        <Announcements />
                      </ProtectedRoute>
                    )} />
                    <Route path="/holidays" element={(
                      <ProtectedRoute moduleName="holidays" redirectTo="/">
                        <Holidays />
                      </ProtectedRoute>
                    )} />

                    {/* MoM Routes */}
                    <Route element={<ProtectedRoute moduleName="meetingsOfMinutes" redirectTo="/" />}>
                      <Route path="/meetings" element={<Meetings />} />
                      <Route path="/meetings/new" element={<MeetingForm />} />
                      <Route path="/meetings/:id/edit" element={<MeetingForm />} />
                      <Route path="/meetings/:id" element={<MeetingDetails />} />
                    </Route>

                    {/* Help Desk Routes */}
                    <Route element={<ProtectedRoute moduleName="helpdesk" redirectTo="/" />}>
                      <Route path="/helpdesk" element={<HelpDesk />} />
                      <Route path="/helpdesk/analytics" element={<HelpdeskAnalytics />} />
                      <Route path="/helpdesk/:id" element={<QueryDetails />} />
                    </Route>

                    {/* Discussion Routes */}
                    <Route path="/discussions" element={<Discussions />} />

                    {/* Onboarding */}
                    <Route path="/onboarding" element={(
                      <ProtectedRoute moduleName="onboarding" requiredPermissions={ONBOARDING_VIEW_PERMISSIONS}>
                        <Onboarding />
                      </ProtectedRoute>
                    )} />
                    <Route path="/offboarding" element={(
                      <ProtectedRoute moduleName="offboarding" requiredPermissions={OFFBOARDING_PERMISSIONS} redirectTo="/">
                        <Offboarding />
                      </ProtectedRoute>
                    )} />
                    <Route path="/hr-email/send" element={(
                      <ProtectedRoute moduleName="hrEmail" requiredPermissions={HR_EMAIL_PERMISSIONS} redirectTo="/">
                        <HREmailSend />
                      </ProtectedRoute>
                    )} />

                    {/* Organization Structure Routes */}
                    <Route element={<ProtectedRoute moduleName="organization" redirectTo="/" />}>
                      <Route path="/organization/chart" element={(
                        <ProtectedRoute requiredPermissions={ORG_CHART_VIEW_PERMISSIONS} requiredRoles={ADMIN_ROLES} allowAllPermissions>
                          <OrgChart />
                        </ProtectedRoute>
                      )} />
                      <Route path="/organization/departments" element={(
                        <ProtectedRoute requiredPermissions={DEPARTMENT_ACCESS_PERMISSIONS} requiredRoles={ADMIN_ROLES} allowAllPermissions>
                          <Departments />
                        </ProtectedRoute>
                      )} />
                      <Route path="/organization/designations" element={(
                        <ProtectedRoute requiredPermissions={DESIGNATION_ACCESS_PERMISSIONS} requiredRoles={ADMIN_ROLES} allowAllPermissions>
                          <Designations />
                        </ProtectedRoute>
                      )} />
                      <Route path="/organization/business-units" element={(
                        <ProtectedRoute requiredPermissions={BUSINESS_UNIT_ACCESS_PERMISSIONS} requiredRoles={ADMIN_ROLES} allowAllPermissions>
                          <BusinessUnits />
                        </ProtectedRoute>
                      )} />
                    </Route>

                    {/* Project Management Routes */}
                    <Route element={<ProtectedRoute moduleName="businessUnits" redirectTo="/" />}>
                      <Route path="/business-units" element={(
                        <ProtectedRoute requiredPermissions={BUSINESS_UNIT_ACCESS_PERMISSIONS}>
                          <BusinessUnits />
                        </ProtectedRoute>
                      )} />
                    </Route>
                    <Route element={<ProtectedRoute moduleName="clients" redirectTo="/" />}>
                      <Route path="/clients" element={(
                        <ProtectedRoute requiredPermissions={CLIENT_ACCESS_PERMISSIONS}>
                          <Clients />
                        </ProtectedRoute>
                      )} />

                      <Route path="/clients/:id/view" element={(
                        <ProtectedRoute requiredPermissions={CLIENT_ACCESS_PERMISSIONS}>
                          <ClientView />
                        </ProtectedRoute>
                      )} />
                    </Route>
                    <Route element={<ProtectedRoute moduleName="projects" redirectTo="/" />}>
                      <Route path="/projects" element={<Projects />} />
                      <Route path="/projects/:id" element={<ProjectDetails />} />
                    </Route>

                    {/* Admin & Configuration Routes */}
                    <Route element={<ProtectedRoute requiredPermissions={ROLE_ACCESS_PERMISSIONS} requiredRoles={ADMIN_ROLES} allowAllPermissions redirectTo="/" />}>
                      <Route path="/roles" element={<Roles />} />
                    </Route>

                    {/* Leave Config - requires leave.config.manage permission */}
                    <Route element={<ProtectedRoute moduleName="leaves" redirectTo="/" />}>
                      <Route path="/leave-config" element={(
                        <ProtectedRoute requiredPermissions={LEAVE_CONFIG_PERMISSIONS} requiredRoles={ADMIN_ROLES} allowAllPermissions redirectTo="/">
                          <LeaveConfig />
                        </ProtectedRoute>
                      )} />
                    </Route>

                    <Route path="/bin" element={(
                      <ProtectedRoute requiredPermissions={BIN_VIEW_PERMISSIONS} requiredRoles={ADMIN_ROLES}>
                        <RecycleBin />
                      </ProtectedRoute>
                    )} />

                    {/* Users Management */}
                    <Route element={<ProtectedRoute moduleName="userManagement" redirectTo="/" />}>
                      <Route path="/users" element={(
                        <ProtectedRoute check={canAccessUsers}>
                          <Users />
                        </ProtectedRoute>
                      )} />
                      <Route path="/users/:id" element={(
                        <ProtectedRoute check={canAccessUsers}>
                          <EmployeeProfile />
                        </ProtectedRoute>
                      )} />
                    </Route>

                    {/* ESS — Employee Self Service */}
                    <Route path="/ess" element={<EssDashboard />} />
                    <Route path="/ess/payslips" element={<MyPayslips />} />
                    <Route path="/payslips" element={<MyPayslips />} />
                    <Route element={<ProtectedRoute moduleName="reimbursements" redirectTo="/ess" />}>
                      <Route path="/ess/reimbursements" element={<MyClaims />} />
                      <Route path="/ess/reimbursements/approvals" element={<ApprovalQueue />} />
                    </Route>
                    <Route element={<ProtectedRoute moduleName="essDocuments" redirectTo="/ess" />}>
                      <Route path="/ess/documents" element={<CompanyDocuments />} />
                    </Route>

                    <Route path="/unauthorized" element={<Unauthorized />} />
                  </Route>
                </Route>

                {/* Catch all redirect */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </Router>
    </Provider>
  );
}

//Added sample line for checking CI/CD pipeline

//Added sample line2 for checking CI/CD pipeline


export default App;
