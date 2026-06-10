import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import HandoffLogin from './pages/HandoffLogin';
import OTPReset from './pages/OTPReset';
import Unauthorized from './pages/Unauthorized';

import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import AttendanceSettings from './pages/AttendanceSettings';
import Timesheet from './pages/Timesheet';
import EmailSettings from './pages/settings/EmailSettings';
import NotificationSettings from './pages/settings/NotificationSettings';
import Users from './pages/Users';
import Roles from './pages/Roles';
import BusinessUnits from './pages/BusinessUnits';
import Clients from './pages/Clients';
import ClientForm from './pages/ClientForm';
import ClientView from './pages/ClientView';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Profile from './pages/Profile';
import EmployeeProfile from './pages/EmployeeProfile';
import Holidays from './pages/Holidays';
import LeaveConfig from './pages/LeaveConfig';
import Leaves from './pages/Leaves';
import EmployeeDossier from './pages/EmployeeDossier';
import ClientSelection from './pages/TalentAcquisition/ClientSelection';
import TalentAcquisitionDashboard from './pages/TalentAcquisition/TalentAcquisitionDashboard';
import HiringRequestList from './pages/TalentAcquisition/HiringRequestList';
import CreateHiringRequest from './pages/TalentAcquisition/CreateHiringRequest';
import HiringRequestDetails from './pages/TalentAcquisition/HiringRequestDetails';
import WorkflowSettings from './pages/TalentAcquisition/WorkflowSettings';
import EmailTemplates from './pages/TalentAcquisition/EmailTemplates';
import PhaseTemplates from './pages/TalentAcquisition/Settings/PhaseTemplates';
import TAAccessSettings from './pages/TalentAcquisition/TAAccessSettings';
import CandidateForm from './pages/TalentAcquisition/CandidateForm';
import CandidateDetails from './pages/TalentAcquisition/CandidateDetails';
import Phase1Candidates from './pages/TalentAcquisition/Phase1Candidates';
import UserTADashboard from './pages/TalentAcquisition/UserTADashboard';
import Meetings from './pages/Meetings';
import MeetingForm from './pages/MeetingForm';
import MeetingDetails from './pages/MeetingDetails';
import HelpDesk from './pages/HelpDesk';
import QueryDetails from './pages/QueryDetails';
import Discussions from './pages/Discussions';
import Announcements from './pages/Announcements';
import GlobalTADashboard from './pages/TalentAcquisition/GlobalTADashboard';
import Onboarding from './pages/Onboarding';
import Offboarding from './pages/Offboarding';
import HREmailSend from './pages/HREmailSend';
import RecycleBin from './pages/RecycleBin';
import PreOnboardingLogin from './pages/PreOnboardingLogin';
import PreOnboardingPortal from './pages/PreOnboardingPortal';

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
  NOTIFICATION_SETTINGS_PERMISSIONS,
  ONBOARDING_VIEW_PERMISSIONS,
  OFFBOARDING_PERMISSIONS,
  ROLE_ACCESS_PERMISSIONS,
  TA_CONFIG_PERMISSIONS,
  TA_EMAIL_TEMPLATE_PERMISSIONS,
  canAccessTAAnalytics,
  canAccessUsers
} from './constants/accessPolicies';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <ErrorBoundary>
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
                <Route path="/announcements" element={<Announcements />} />
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
                  <ProtectedRoute requiredPermissions={ONBOARDING_VIEW_PERMISSIONS}>
                    <Onboarding />
                  </ProtectedRoute>
                )} />
                <Route path="/offboarding" element={(
                  <ProtectedRoute requiredPermissions={OFFBOARDING_PERMISSIONS} redirectTo="/">
                    <Offboarding />
                  </ProtectedRoute>
                )} />
                <Route path="/hr-email/send" element={(
                  <ProtectedRoute requiredPermissions={HR_EMAIL_PERMISSIONS} redirectTo="/">
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
                  <Route path="/clients/new" element={(
                    <ProtectedRoute requiredPermissions={CLIENT_CREATE_PERMISSIONS}>
                      <ClientForm />
                    </ProtectedRoute>
                  )} />
                  <Route path="/clients/:id/edit" element={(
                    <ProtectedRoute requiredPermissions={CLIENT_UPDATE_PERMISSIONS}>
                      <ClientForm />
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
                  <Route element={<ProtectedRoute moduleName="leaves" redirectTo="/" />}>
                    <Route path="/leave-config" element={<LeaveConfig />} />
                  </Route>
                </Route>

                <Route path="/bin" element={(
                  <ProtectedRoute requiredPermissions={BIN_VIEW_PERMISSIONS} requiredRoles={ADMIN_ROLES}>
                    <RecycleBin />
                  </ProtectedRoute>
                )} />

                {/* Users Management (Internal access control) */}
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
        </ErrorBoundary>
      </AuthProvider>
    </Router>
  );
}

//Added sample line for checking CI/CD pipeline

//Added sample line2 for checking CI/CD pipeline


export default App;
