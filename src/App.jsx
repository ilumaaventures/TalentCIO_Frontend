import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';

// HIGH-6: All page imports converted to React.lazy() for route-level code splitting.
// Each page is now loaded on-demand only when the user navigates to that route,
// reducing the initial JS bundle from ~4-6MB to ~800KB.
const Login                    = lazy(() => import('./pages/Login'));
const HandoffLogin             = lazy(() => import('./pages/HandoffLogin'));
const OTPReset                 = lazy(() => import('./pages/OTPReset'));
const Unauthorized             = lazy(() => import('./pages/Unauthorized'));
const Dashboard                = lazy(() => import('./pages/Dashboard'));
const Attendance               = lazy(() => import('./pages/Attendance'));
const AttendanceSettings       = lazy(() => import('./pages/AttendanceSettings'));
const Timesheet                = lazy(() => import('./pages/Timesheet'));
const EmailSettings            = lazy(() => import('./pages/settings/EmailSettings'));
const NotificationSettings     = lazy(() => import('./pages/settings/NotificationSettings'));
const Users                    = lazy(() => import('./pages/Users'));
const Roles                    = lazy(() => import('./pages/Roles'));
const BusinessUnits            = lazy(() => import('./pages/BusinessUnits'));
const Clients                  = lazy(() => import('./pages/Clients'));
const ClientForm               = lazy(() => import('./pages/ClientForm'));
const ClientView               = lazy(() => import('./pages/ClientView'));
const Projects                 = lazy(() => import('./pages/Projects'));
const ProjectDetails           = lazy(() => import('./pages/ProjectDetails'));
const Profile                  = lazy(() => import('./pages/Profile'));
const EmployeeProfile          = lazy(() => import('./pages/EmployeeProfile'));
const Holidays                 = lazy(() => import('./pages/Holidays'));
const LeaveConfig              = lazy(() => import('./pages/LeaveConfig'));
const Leaves                   = lazy(() => import('./pages/Leaves'));
const EmployeeDossier          = lazy(() => import('./pages/EmployeeDossier'));
const ClientSelection          = lazy(() => import('./pages/TalentAcquisition/ClientSelection'));
const TalentAcquisitionDashboard = lazy(() => import('./pages/TalentAcquisition/TalentAcquisitionDashboard'));
const HiringRequestList        = lazy(() => import('./pages/TalentAcquisition/HiringRequestList'));
const CreateHiringRequest      = lazy(() => import('./pages/TalentAcquisition/CreateHiringRequest'));
const HiringRequestDetails     = lazy(() => import('./pages/TalentAcquisition/HiringRequestDetails'));
const WorkflowSettings         = lazy(() => import('./pages/TalentAcquisition/WorkflowSettings'));
const EmailTemplates           = lazy(() => import('./pages/TalentAcquisition/EmailTemplates'));
const PhaseTemplates           = lazy(() => import('./pages/TalentAcquisition/Settings/PhaseTemplates'));
const TAAccessSettings         = lazy(() => import('./pages/TalentAcquisition/TAAccessSettings'));
const CandidateForm            = lazy(() => import('./pages/TalentAcquisition/CandidateForm'));
const CandidateDetails         = lazy(() => import('./pages/TalentAcquisition/CandidateDetails'));
const Phase1Candidates         = lazy(() => import('./pages/TalentAcquisition/Phase1Candidates'));
const UserTADashboard          = lazy(() => import('./pages/TalentAcquisition/UserTADashboard'));
const Meetings                 = lazy(() => import('./pages/Meetings'));
const MeetingForm              = lazy(() => import('./pages/MeetingForm'));
const MeetingDetails           = lazy(() => import('./pages/MeetingDetails'));
const HelpDesk                 = lazy(() => import('./pages/HelpDesk'));
const QueryDetails             = lazy(() => import('./pages/QueryDetails'));
const Discussions              = lazy(() => import('./pages/Discussions'));
const Announcements            = lazy(() => import('./pages/Announcements'));
const GlobalTADashboard        = lazy(() => import('./pages/TalentAcquisition/GlobalTADashboard'));
const Onboarding               = lazy(() => import('./pages/Onboarding'));
const Offboarding              = lazy(() => import('./pages/Offboarding'));
const HREmailSend              = lazy(() => import('./pages/HREmailSend'));
const RecycleBin               = lazy(() => import('./pages/RecycleBin'));
const PreOnboardingLogin       = lazy(() => import('./pages/PreOnboardingLogin'));
const PreOnboardingPortal      = lazy(() => import('./pages/PreOnboardingPortal'));
const SalaryCalculator         = lazy(() => import('./pages/SalaryCalculator'));


import ProtectedRoute from './components/ProtectedRoute';
import SystemRoute from './components/SystemRoute';
import Layout from './components/Layout';
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
  canAccessTAAnalytics,
  canAccessUsers
} from './constants/accessPolicies';

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
                    <ProtectedRoute requiredPermissions={SALARY_CALCULATOR_PERMISSIONS} redirectTo="/">
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
  );
}

//Added sample line for checking CI/CD pipeline

//Added sample line2 for checking CI/CD pipeline


export default App;
