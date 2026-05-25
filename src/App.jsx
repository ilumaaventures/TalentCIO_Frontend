import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import GlobalTADashboard from './pages/TalentAcquisition/GlobalTADashboard';
import Onboarding from './pages/Onboarding';
import RecycleBin from './pages/RecycleBin';
import PreOnboardingLogin from './pages/PreOnboardingLogin';
import PreOnboardingPortal from './pages/PreOnboardingPortal';

import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import SystemRoute from './components/SystemRoute';
import ModuleRoute from './components/ModuleRoute';
import Layout from './components/Layout';

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
                <Route element={<ModuleRoute moduleName="attendance" />}><Route path="/attendance" element={<Attendance />} /></Route>
                <Route element={<RoleRoute requiredPermissions={['user.update']} requiredRoles={['Admin']} allowAllPermissions={true} />}>
                  <Route element={<ModuleRoute moduleName="attendance" />}>
                    <Route path="/attendance-settings" element={<AttendanceSettings />} />
                  </Route>
                </Route>
                <Route path="/settings/email" element={<EmailSettingsAccessWrapper />} />
                <Route element={<ModuleRoute moduleName="timesheet" />}><Route path="/timesheet" element={<Timesheet />} /></Route>
                <Route element={<ModuleRoute moduleName="leaves" />}><Route path="/leaves" element={<Leaves />} /></Route>
                <Route element={<ModuleRoute moduleName="employeeDossier" />}><Route path="/dossier/:userId" element={<EmployeeDossier />} /></Route>

                {/* Talent Acquisition */}
                <Route element={<ModuleRoute moduleName="talentAcquisition" />}>
                  <Route path="/ta" element={<TalentAcquisitionDashboard />} />
                  <Route path="/ta/clients" element={<ClientSelection />} />
                  <Route path="/ta/hiring-requests/:clientName" element={<HiringRequestList />} />
                  <Route path="/ta/workflows" element={<WorkflowSettingsAccessWrapper />} />
                  <Route path="/ta/settings/phase-templates" element={<PhaseTemplatesAccessWrapper />} />
                  <Route path="/ta/settings/access" element={<TAAccessSettingsAccessWrapper />} />
                  <Route path="/ta/email-templates" element={<TAEmailTemplatesAccessWrapper />} />
                  <Route path="/ta/create-request" element={<CreateHiringRequest />} />
                  <Route path="/ta/edit-request/:id" element={<CreateHiringRequest />} />
                  <Route path="/ta/view/:id" element={<HiringRequestDetails />} />
                  <Route path="/ta/hiring-request/:hiringRequestId/add-candidate" element={<CandidateForm />} />
                  <Route path="/ta/hiring-request/:hiringRequestId/candidate/:candidateId/edit" element={<CandidateForm />} />
                  <Route path="/ta/hiring-request/:hiringRequestId/candidate/:candidateId/view" element={<CandidateDetails />} />
                  <Route path="/ta/hiring-request/:hiringRequestId/phase1" element={<Phase1Candidates />} />
                  <Route path="/ta/user-dashboard/:userName" element={<UserTADashboard />} />
                  <Route path="/ta/analysis" element={<TAAnalyticsAccessWrapper />} />
                </Route>
                
                <Route path="/profile" element={<Profile />} />
                <Route path="/holidays" element={<Holidays />} />

                {/* MoM Routes */}
                <Route element={<ModuleRoute moduleName="meetingsOfMinutes" />}>
                  <Route path="/meetings" element={<Meetings />} />
                  <Route path="/meetings/new" element={<MeetingForm />} />
                  <Route path="/meetings/:id/edit" element={<MeetingForm />} />
                  <Route path="/meetings/:id" element={<MeetingDetails />} />
                </Route>

                {/* Help Desk Routes */}
                <Route element={<ModuleRoute moduleName="helpdesk" />}>
                  <Route path="/helpdesk" element={<HelpDesk />} />
                  <Route path="/helpdesk/:id" element={<QueryDetails />} />
                </Route>

                {/* Discussion Routes */}
                <Route path="/discussions" element={<Discussions />} />

                {/* Onboarding */}
                <Route path="/onboarding" element={<OnboardingAccessWrapper />} />

                {/* Project Management Routes */}
                <Route element={<ModuleRoute moduleName="businessUnits" />}>
                  <Route path="/business-units" element={<BusinessUnitsAccessWrapper />} />
                </Route>
                <Route element={<ModuleRoute moduleName="clients" />}>
                  <Route path="/clients" element={<ClientsAccessWrapper />} />
                  <Route path="/clients/new" element={<ClientCreateAccessWrapper />} />
                  <Route path="/clients/:id/edit" element={<ClientEditAccessWrapper />} />
                  <Route path="/clients/:id/view" element={<ClientViewAccessWrapper />} />
                </Route>
                <Route element={<ModuleRoute moduleName="projects" />}>
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:id" element={<ProjectDetails />} />
                </Route>

                {/* Admin & Configuration Routes */}
                <Route element={<RoleRoute requiredPermissions={['role.read']} requiredRoles={['Admin']} allowAllPermissions={true} />}>
                  <Route path="/roles" element={<Roles />} />
                  <Route element={<ModuleRoute moduleName="leaves" />}>
                    <Route path="/leave-config" element={<LeaveConfig />} />
                  </Route>
                </Route>

                <Route path="/bin" element={<BinAccessWrapper />} />

                {/* Users Management (Internal access control) */}
                {/* Users Management */}
                <Route element={<ModuleRoute moduleName="userManagement" />}>
                  <Route path="/users" element={<UsersAccessWrapper />} />
                  <Route path="/users/:id" element={<UsersAccessWrapper Component={EmployeeProfile} />} />
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

const UsersAccessWrapper = ({ Component: ComponentProp }) => {
  const { user } = useAuth();
  const Component = ComponentProp || Users;

  if (!user) return null;

  const canAccess = user.roles?.includes('Admin') ||
    user.permissions?.includes('user.read') ||
    user.directReportsCount > 0;

  return canAccess ? <Component /> : <Navigate to="/unauthorized" />;
};

const OnboardingAccessWrapper = ({ Component: ComponentProp }) => {
  const { user } = useAuth();
  const Component = ComponentProp || Onboarding;

  if (!user) return null;

  const canAccess = user.roles?.includes('Admin') ||
    user.permissions?.includes('onboarding.view') ||
    user.permissions?.includes('onboarding.document.review') ||
    user.permissions?.includes('onboarding.document.request') ||
    user.permissions?.includes('onboarding.credential.manage') ||
    user.permissions?.includes('onboarding.complete') ||
    user.permissions?.includes('onboarding.manage') ||
    user.permissions?.includes('*');

  return canAccess ? <Component /> : <Navigate to="/unauthorized" />;
};

const PhaseTemplatesAccessWrapper = ({ Component: ComponentProp }) => {
  const { user } = useAuth();
  const Component = ComponentProp || PhaseTemplates;

  if (!user) return null;

  const canAccess = user.roles?.includes('Admin') ||
    user.permissions?.includes('ta.manage') ||
    user.permissions?.includes('ta.config.view') ||
    user.permissions?.includes('ta.config.edit') ||
    user.permissions?.includes('*');

  return canAccess ? <Component /> : <Navigate to="/unauthorized" />;
};

const WorkflowSettingsAccessWrapper = ({ Component: ComponentProp }) => {
  const { user } = useAuth();
  const Component = ComponentProp || WorkflowSettings;

  if (!user) return null;

  const canAccess = user.roles?.includes('Admin') ||
    user.permissions?.includes('ta.manage') ||
    user.permissions?.includes('ta.config.view') ||
    user.permissions?.includes('ta.config.edit') ||
    user.permissions?.includes('*');

  return canAccess ? <Component /> : <Navigate to="/unauthorized" />;
};

const TAAnalyticsAccessWrapper = ({ Component: ComponentProp }) => {
  const { user } = useAuth();
  const Component = ComponentProp || GlobalTADashboard;

  if (!user) return null;

  const canAccess = user.roles?.includes('Admin') ||
    user.permissions?.includes('ta.manage') ||
    user.permissions?.includes('ta.analytics.global') ||
    user.permissions?.includes('ta.analytics.assigned') ||
    user.permissions?.includes('*') ||
    user.isTAAnalyticsViewer;

  return canAccess ? <Component /> : <Navigate to="/unauthorized" />;
};

const TAAccessSettingsAccessWrapper = ({ Component: ComponentProp }) => {
  const { user } = useAuth();
  const Component = ComponentProp || TAAccessSettings;

  if (!user) return null;

  const canAccess = user.roles?.includes('Admin') ||
    user.permissions?.includes('ta.manage') ||
    user.permissions?.includes('ta.config.view') ||
    user.permissions?.includes('ta.config.edit') ||
    user.permissions?.includes('*');

  return canAccess ? <Component /> : <Navigate to="/unauthorized" />;
};

const BinAccessWrapper = ({ Component: ComponentProp }) => {
  const { user } = useAuth();
  const Component = ComponentProp || RecycleBin;

  if (!user) return null;

  const canAccess = user.roles?.includes('Admin') || user.permissions?.includes('bin.view');

  return canAccess ? <Component /> : <Navigate to="/unauthorized" />;
};

const EmailSettingsAccessWrapper = ({ Component: ComponentProp }) => {
  const { user } = useAuth();
  const Component = ComponentProp || EmailSettings;

  if (!user) return null;

  const canAccess = user.roles?.includes('Admin') ||
    user.permissions?.includes('settings.email.view') ||
    user.permissions?.includes('settings.email.manage') ||
    user.permissions?.includes('*');

  return canAccess ? <Component /> : <Navigate to="/unauthorized" />;
};

const TAEmailTemplatesAccessWrapper = ({ Component: ComponentProp }) => {
  const { user } = useAuth();
  const Component = ComponentProp || EmailTemplates;

  if (!user) return null;

  const canAccess = user.roles?.includes('Admin') ||
    user.permissions?.includes('ta.email_template.manage') ||
    user.permissions?.includes('*');

  return canAccess ? <Component /> : <Navigate to="/unauthorized" />;
};

const BusinessUnitsAccessWrapper = ({ Component: ComponentProp }) => {
  const { user } = useAuth();
  const Component = ComponentProp || BusinessUnits;

  if (!user) return null;

  const canAccess = user.roles?.includes('Admin') ||
    user.permissions?.includes('business_unit.read') ||
    user.permissions?.includes('business_unit.create') ||
    user.permissions?.includes('business_unit.update') ||
    user.permissions?.includes('*');

  return canAccess ? <Component /> : <Navigate to="/unauthorized" />;
};

const ClientsAccessWrapper = ({ Component: ComponentProp }) => {
  const { user } = useAuth();
  const Component = ComponentProp || Clients;

  if (!user) return null;

  const canAccess = user.roles?.includes('Admin') ||
    user.permissions?.includes('client.read') ||
    user.permissions?.includes('client.create') ||
    user.permissions?.includes('client.update') ||
    user.permissions?.includes('*');

  return canAccess ? <Component /> : <Navigate to="/unauthorized" />;
};

const ClientCreateAccessWrapper = ({ Component: ComponentProp }) => {
  const { user } = useAuth();
  const Component = ComponentProp || ClientForm;

  if (!user) return null;

  const canAccess = user.roles?.includes('Admin') ||
    user.permissions?.includes('client.create') ||
    user.permissions?.includes('*');

  return canAccess ? <Component /> : <Navigate to="/unauthorized" />;
};

const ClientEditAccessWrapper = ({ Component: ComponentProp }) => {
  const { user } = useAuth();
  const Component = ComponentProp || ClientForm;

  if (!user) return null;

  const canAccess = user.roles?.includes('Admin') ||
    user.permissions?.includes('client.update') ||
    user.permissions?.includes('*');

  return canAccess ? <Component /> : <Navigate to="/unauthorized" />;
};

const ClientViewAccessWrapper = ({ Component: ComponentProp }) => {
  const { user } = useAuth();
  const Component = ComponentProp || ClientView;

  if (!user) return null;

  const canAccess = user.roles?.includes('Admin') ||
    user.permissions?.includes('client.read') ||
    user.permissions?.includes('client.update') ||
    user.permissions?.includes('*');

  return canAccess ? <Component /> : <Navigate to="/unauthorized" />;
};
