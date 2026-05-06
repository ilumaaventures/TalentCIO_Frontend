import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  BriefcaseBusiness,
  Building,
  Building2,
  Calendar,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  Settings,
  Shield,
  UserPlus,
  Users,
  Workflow,
  X
} from 'lucide-react';

const TA_DASHBOARD_VIEWS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'requisitions', label: 'Requisitions', icon: FolderKanban },
  { id: 'clients', label: 'Clients', icon: Building2 },
  { id: 'interviews', label: 'Interviews', icon: CalendarClock },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 }
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const userDisplayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
  const canViewTAAnalytics = user?.roles?.includes('Admin') || user?.permissions?.includes('ta.analytics.global') || user?.isTAAnalyticsViewer;
  const requestedTATab = new URLSearchParams(location.search).get('tab');
  const currentTATab = (!canViewTAAnalytics && (requestedTATab === 'overview' || requestedTATab === 'analytics'))
    ? 'requisitions'
    : (requestedTATab || (canViewTAAnalytics ? 'overview' : 'requisitions'));
  const isActive = (path) => location.pathname === path ? "zoho-sidebar-link-active" : "zoho-sidebar-link";
  const isTalentAcquisitionRoute = location.pathname === '/ta' || location.pathname.startsWith('/ta/');
  const canAccessTA = user?.company?.enabledModules?.includes('talentAcquisition') && (user?.roles?.includes('Admin') || user?.permissions?.includes('ta.view') || user?.isTAParticipant || canViewTAAnalytics);
  const canManageTAWorkflows = user?.roles?.includes('Admin') || user?.permissions?.includes('ta.edit');
  const canManagePhaseTemplates = user?.roles?.includes('Admin');
  const showDashboard = user?.roles?.includes('Admin') || user?.hasAllPermissions;
  const showAttendance = user?.company?.enabledModules?.includes('attendance');
  const showLeaves = user?.company?.enabledModules?.includes('leaves');
  const showTimesheet = user?.company?.enabledModules?.includes('timesheet');
  const showMeetings = user?.company?.enabledModules?.includes('meetingsOfMinutes');
  const showHelpDesk = user?.company?.enabledModules?.includes('helpdesk');
  const showEmployees = user?.company?.enabledModules?.includes('userManagement') && (user?.roles?.includes('Admin') || user?.permissions?.includes('user.read') || user?.directReportsCount > 0);
  const showOnboarding = user?.roles?.includes('Admin') || user?.permissions?.includes('onboarding.manage');
  const showRoles = user?.permissions?.includes('role.read') || user?.roles?.includes('Admin');
  const showAttendanceSettings = user?.company?.enabledModules?.includes('attendance') && (user?.roles?.includes('Admin') || user?.permissions?.includes('user.update') || user?.hasAllPermissions);
  const showLeavePolicies = (user?.roles?.includes('Admin') || user?.permissions?.includes('role.read') || user?.hasAllPermissions) && user?.company?.enabledModules?.includes('leaves');
  const showBusinessUnits = user?.company?.enabledModules?.includes('projectManagement') && (user?.roles?.includes('Admin') || user?.permissions?.includes('business_unit.read'));
  const showClients = user?.company?.enabledModules?.includes('projectManagement') && (user?.roles?.includes('Admin') || user?.permissions?.includes('client.read'));
  const showProjects = user?.company?.enabledModules?.includes('projectManagement');
  const showMainSection = showDashboard || showAttendance || showLeaves || showTimesheet || showMeetings || showHelpDesk || canAccessTA || true;
  const showOrganizationSection = showEmployees || showOnboarding;
  const showAdminSection = showRoles || showAttendanceSettings || showLeavePolicies;
  const showProjectManagementSection = showBusinessUnits || showClients || showProjects;
  const sectionLabelClass = 'px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6d6258]';
  const sidebarCardClass = 'rounded-2xl border border-white/6 bg-white/[0.03]';

  const taShortcuts = [
    {
      label: 'Full Analytics',
      to: '/ta/analysis',
      icon: BarChart3,
      visible: canViewTAAnalytics,
      isActive: location.pathname === '/ta/analysis'
    },
    {
      label: 'Workflow Settings',
      to: '/ta/workflows',
      icon: Workflow,
      visible: canManageTAWorkflows,
      isActive: location.pathname === '/ta/workflows'
    },
    {
      label: 'Phase Templates',
      to: '/ta/settings/phase-templates',
      icon: Settings,
      visible: canManagePhaseTemplates,
      isActive: location.pathname === '/ta/settings/phase-templates'
    },
    {
      label: 'Email Templates',
      to: '/ta/email-templates',
      icon: Mail,
      visible: user?.roles?.includes('Admin') || user?.permissions?.includes('ta.email_template.manage') || user?.permissions?.includes('ta.edit'),
      isActive: location.pathname === '/ta/email-templates'
    }
  ].filter((item) => item.visible);

  // Overlay for mobile
  const overlay = (
    <div
      className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    />
  );

  return (
    <>
      {overlay}
      <aside
        className={`
            bg-[#111315] text-white flex flex-col shadow-xl z-50 fixed inset-y-0 left-0 border-r border-white/6
            transition-transform duration-300 ease-in-out md:translate-x-0 w-64
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-start justify-between border-b border-white/6 px-5 py-5">
          <div className="min-w-0">
            <img
              src="/dark-logo-compact.png"
              alt="TalentCIO"
              className="h-12 w-auto max-w-[170px] object-contain"
            />
          </div>
          {/* Mobile Close Button */}
          <button onClick={onClose} className="md:hidden text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
          {isTalentAcquisitionRoute ? (
            <>
              <div className={`${sidebarCardClass} mb-6 p-3`}>
                <Link
                  to="/"
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-200 transition hover:bg-white/5"
                  onClick={onClose}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/6 text-slate-200">
                      <BriefcaseBusiness size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6d6258]">
                        Workspace
                      </span>
                      <span className="block truncate text-[13px] font-semibold text-white">
                        Talent Acquisition
                      </span>
                    </span>
                  </span>
                  <ArrowLeft size={16} />
                </Link>
              </div>

              <div className={sectionLabelClass}>Main</div>
              <div className="mb-6 space-y-1">
                {TA_DASHBOARD_VIEWS.filter((item) => {
                  if (!canViewTAAnalytics && (item.id === 'overview' || item.id === 'analytics')) {
                    return false;
                  }

                  return true;
                }).map((item) => {
                  const Icon = item.icon;
                  const isDashboardViewActive = location.pathname === '/ta' && currentTATab === item.id;

                  return (
                    <Link
                      key={item.id}
                      to={`/ta?tab=${item.id}`}
                      className={isDashboardViewActive ? "zoho-sidebar-link-active" : "zoho-sidebar-link"}
                      onClick={onClose}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className={sectionLabelClass}>Manage</div>
              {taShortcuts.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={item.isActive ? "zoho-sidebar-link-active" : "zoho-sidebar-link"}
                    onClick={onClose}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </>
          ) : (
            <>
              {showMainSection && <div className={sectionLabelClass}>Main</div>}
              {showDashboard && (
                <Link to="/" className={isActive('/')} onClick={onClose}>
                  <Users size={18} />
                  <span>Dashboard</span>
                </Link>
              )}
              {showAttendance && (
                <Link to="/attendance" className={isActive('/attendance')} onClick={onClose}>
                  <Clock size={18} />
                  <span>Attendance</span>
                </Link>
              )}
              {showLeaves && (
                <Link to="/leaves" className={isActive('/leaves')} onClick={onClose}>
                  <FileText size={18} />
                  <span>Leaves</span>
                </Link>
              )}
              {showTimesheet && (
                <Link to="/timesheet" className={isActive('/timesheet')} onClick={onClose}>
                  <Calendar size={18} />
                  <span>Timesheet</span>
                </Link>
              )}
              <Link to="/holidays" className={isActive('/holidays')} onClick={onClose}>
                <CalendarDays size={18} />
                <span>Holidays</span>
              </Link>
              {showMeetings && (
                <Link
                  to={(user?.roles?.includes('Admin') || user?.permissions?.includes('discussion.read')) ? "/discussions" : "/meetings"}
                  className={(location.pathname === '/meetings' || location.pathname.startsWith('/discussions')) ? "zoho-sidebar-link-active" : "zoho-sidebar-link"}
                  onClick={onClose}
                >
                  <ClipboardList size={18} />
                  <span>Meetings</span>
                </Link>
              )}
              {showHelpDesk && (
                <Link to="/helpdesk" className={isActive('/helpdesk')} onClick={onClose}>
                  <LifeBuoy size={18} />
                  <span>Help Desk</span>
                </Link>
              )}

              {canAccessTA && (
                <Link
                  to="/ta"
                  className={isTalentAcquisitionRoute ? "zoho-sidebar-link-active" : "zoho-sidebar-link"}
                  onClick={onClose}
                >
                  <Briefcase size={18} />
                  <span>Talent Acquisition</span>
                </Link>
              )}

              {showOrganizationSection && <div className="mt-8"><div className={sectionLabelClass}>Manage</div></div>}
              {showEmployees && (
                <Link to="/users" className={isActive('/users')} onClick={onClose}>
                  <Users size={18} />
                  <span>Employees</span>
                </Link>
              )}
              {showOnboarding && (
                <Link to="/onboarding" className={isActive('/onboarding')} onClick={onClose}>
                  <UserPlus size={18} />
                  <span>Onboarding</span>
                </Link>
              )}

              {showAdminSection && (
                <>
                  <div className="mt-8"><div className={sectionLabelClass}>Admin</div></div>

                  {showRoles && (
                    <Link to="/roles" className={isActive('/roles')} onClick={onClose}>
                      <Shield size={18} />
                      <span>Roles & Permissions</span>
                    </Link>
                  )}
                  {showAttendanceSettings && (
                    <Link to="/attendance-settings" className={isActive('/attendance-settings')} onClick={onClose}>
                      <Settings size={18} />
                      <span>Attendance Settings</span>
                    </Link>
                  )}
                  {showLeavePolicies && (
                    <Link to="/leave-config" className={isActive('/leave-config')} onClick={onClose}>
                      <Settings size={18} />
                      <span>Leave Policies</span>
                    </Link>
                  )}
                </>
              )}

              {showProjectManagementSection && (
                <>
                  <div className="mt-8"><div className={sectionLabelClass}>Projects</div></div>

                  {showBusinessUnits && (
                    <Link to="/business-units" className={isActive('/business-units')} onClick={onClose}>
                      <Building size={18} />
                      <span>Business Units</span>
                    </Link>
                  )}

                  {showClients && (
                    <Link to="/clients" className={isActive('/clients')} onClick={onClose}>
                      <Users size={18} />
                      <span>Clients</span>
                    </Link>
                  )}

                  {showProjects && <Link to="/projects" className={isActive('/projects')} onClick={onClose}>
                    <Briefcase size={18} />
                    <span>Projects</span>
                  </Link>}
                </>
              )}
            </>
          )}
        </div>

        <div className="border-t border-white/6 p-4">
          <Link
            to="/profile"
            className={`${sidebarCardClass} flex items-center gap-3 p-3 transition-colors hover:bg-white/[0.05] group`}
            onClick={onClose}
          >
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs font-bold text-white ring-1 ring-white/10">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={userDisplayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                user?.firstName?.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold text-white">{user?.firstName || userDisplayName}</div>

              {user?.reportingManagers && user.reportingManagers.length > 0 && (
                <div className="mt-0.5 truncate text-[10px] uppercase tracking-[0.16em] text-[#6d6258]">
                  Reports to: {user.reportingManagers.map(m => m.firstName).join(', ')}
                </div>
              )}
            </div>
          </Link>
          <button
            onClick={logout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut size={14} /> <span>Log Out</span>
          </button>

        </div>
      </aside>
    </>
  );
};

export default Sidebar;
