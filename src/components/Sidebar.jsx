import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getBinItems } from '../api/bin';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Briefcase,
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
  Megaphone,
  ShieldCheck,
  Settings,
  Trash2,
  UserPlus,
  Users,
  Workflow,
  X
} from 'lucide-react';

const TA_DASHBOARD_VIEWS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'requisitions', label: 'Requisitions', icon: FolderKanban },
  { id: 'clients', label: 'Clients', icon: Building2 },
  { id: 'interviews', label: 'Interviews', icon: CalendarClock }
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, hasModule } = useAuth();
  const location = useLocation();
  const [recycleBinCount, setRecycleBinCount] = useState(0);
  const userDisplayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
  const workspaceBranding = user?.company?.settings?.workspaceBranding || {};
  const workspaceLogoMode = ['talentcio', 'company', 'none'].includes(String(workspaceBranding.displayMode || '').toLowerCase())
    ? String(workspaceBranding.displayMode || '').toLowerCase()
    : 'talentcio';
  const workspaceLogoAlignment = ['left', 'center', 'right'].includes(String(workspaceBranding.logoAlignment || '').toLowerCase())
    ? String(workspaceBranding.logoAlignment || '').toLowerCase()
    : 'left';
  const workspaceLogoSize = Math.min(
    Math.max(Number(workspaceBranding.logoSize) || 140, 80),
    170
  );
  const companyLogoUrl = user?.company?.settings?.logo || user?.company?.logo || '';
  const sidebarLogoSrc = workspaceLogoMode === 'talentcio'
    ? '/dark-logo-compact.png'
    : workspaceLogoMode === 'company'
      ? companyLogoUrl
      : '';
  const sidebarLogoAlignmentClass = workspaceLogoAlignment === 'center'
    ? 'justify-center'
    : workspaceLogoAlignment === 'right'
      ? 'justify-end'
      : 'justify-start';
  const sidebarLogoAlt = workspaceLogoMode === 'company'
    ? `${user?.company?.name || 'Company'} logo`
    : 'TalentCIO';
  const canViewTAAnalytics = user?.roles?.includes('Admin')
    || user?.permissions?.includes('ta.manage')
    || user?.permissions?.includes('ta.analytics.global')
    || user?.permissions?.includes('ta.analytics.assigned')
    || user?.permissions?.includes('*')
    || user?.isTAAnalyticsViewer;
  const requestedTATab = new URLSearchParams(location.search).get('tab');
  const currentTATab = requestedTATab === 'analytics'
    ? (canViewTAAnalytics ? 'overview' : 'requisitions')
    : (!canViewTAAnalytics && requestedTATab === 'overview')
      ? 'requisitions'
      : (requestedTATab || (canViewTAAnalytics ? 'overview' : 'requisitions'));
  const isTalentAcquisitionRoute = location.pathname === '/ta' || location.pathname.startsWith('/ta/');
  const canAccessTA = user?.company?.enabledModules?.includes('talentAcquisition') && (
    user?.roles?.includes('Admin')
    || user?.permissions?.includes('ta.view')
    || user?.permissions?.includes('ta.candidate.manage.assigned')
    || user?.permissions?.includes('ta.candidate.manage.all')
    || user?.permissions?.includes('ta.candidate.view')
    || user?.permissions?.includes('ta.candidate.edit')
    || user?.permissions?.includes('ta.interview.evaluate')
    || user?.permissions?.includes('ta.candidate.make_decision')
    || user?.permissions?.includes('ta.candidate.transfer')
    || user?.permissions?.includes('ta.manage')
    || user?.permissions?.includes('ta.config.view')
    || user?.permissions?.includes('ta.config.edit')
    || user?.isTAParticipant
    || canViewTAAnalytics
  );
  const canViewTAConfig = user?.roles?.includes('Admin')
    || user?.permissions?.includes('ta.manage')
    || user?.permissions?.includes('ta.config.view')
    || user?.permissions?.includes('ta.config.edit')
    || user?.permissions?.includes('*');
  const showDashboard = user?.roles?.includes('Admin') || user?.hasAllPermissions;
  const showAttendance = user?.company?.enabledModules?.includes('attendance');
  const showLeaves = user?.company?.enabledModules?.includes('leaves');
  const showHolidays = hasModule('holidays');
  const showTimesheet = user?.company?.enabledModules?.includes('timesheet');
  const showMeetings = user?.company?.enabledModules?.includes('meetingsOfMinutes');
  const showHelpDesk = user?.company?.enabledModules?.includes('helpdesk');
  const showEmployees = user?.company?.enabledModules?.includes('userManagement') && (user?.roles?.includes('Admin') || user?.permissions?.includes('user.read') || user?.directReportsCount > 0);
  const showOnboarding = user?.roles?.includes('Admin')
    || user?.permissions?.includes('onboarding.view')
    || user?.permissions?.includes('onboarding.document.review')
    || user?.permissions?.includes('onboarding.document.request')
    || user?.permissions?.includes('onboarding.credential.manage')
    || user?.permissions?.includes('onboarding.complete')
    || user?.permissions?.includes('onboarding.manage')
    || user?.permissions?.includes('*');
  const showOffboarding = user?.roles?.includes('Admin')
    || user?.permissions?.includes('offboarding.read')
    || user?.permissions?.includes('offboarding.create')
    || user?.permissions?.includes('offboarding.update')
    || user?.permissions?.includes('*');
  const showRecycleBin = user?.roles?.includes('Admin') || user?.permissions?.includes('bin.view');
  const showBusinessUnits = hasModule('businessUnits') && (
    user?.roles?.includes('Admin')
    || user?.permissions?.includes('business_unit.read')
    || user?.permissions?.includes('business_unit.create')
    || user?.permissions?.includes('business_unit.update')
    || user?.permissions?.includes('*')
  );
  const showClients = hasModule('clients') && (
    user?.roles?.includes('Admin')
    || user?.permissions?.includes('client.read')
    || user?.permissions?.includes('client.create')
    || user?.permissions?.includes('client.update')
    || user?.permissions?.includes('*')
  );
  const showProjects = hasModule('projects');
  const showMainSection = showDashboard || showAttendance || showLeaves || showHolidays || showTimesheet || showMeetings || showHelpDesk || canAccessTA || true;
  const showOrganizationSection = showEmployees || showOnboarding || showOffboarding;
  const showProjectManagementSection = showBusinessUnits || showClients || showProjects;
  const showEmailSettings = user?.roles?.includes('Admin')
    || user?.permissions?.includes('settings.email.view')
    || user?.permissions?.includes('settings.email.manage')
    || user?.permissions?.includes('*');
  const showNotificationSettings = user?.roles?.includes('Admin')
    || user?.permissions?.includes('settings.notification.view')
    || user?.permissions?.includes('settings.notification.manage')
    || user?.permissions?.includes('*');
  const homeRoute = showDashboard ? '/' : (showAttendance ? '/attendance' : '/');
  const sectionLabelClass = isTalentAcquisitionRoute
    ? 'px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-blue-100/55'
    : 'px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6d6258]';
  const sidebarCardClass = isTalentAcquisitionRoute
    ? 'rounded-2xl border border-white/12 bg-white/[0.07] backdrop-blur-sm'
    : 'rounded-2xl border border-white/6 bg-white/[0.03]';
  const sidebarShellClass = isTalentAcquisitionRoute
    ? 'bg-gradient-to-b from-[#134a85] via-[#0f3d70] to-[#0a2f57] border-r border-blue-200/15'
    : 'bg-[#111315] border-r border-white/6';
  const sidebarLinkClass = isTalentAcquisitionRoute
    ? 'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-blue-100/80 transition-all duration-200 hover:bg-white/10 hover:text-white'
    : 'zoho-sidebar-link';
  const sidebarLinkActiveClass = isTalentAcquisitionRoute
    ? 'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-white bg-white/[0.16] shadow-[0_10px_24px_rgba(6,22,48,0.28)] ring-1 ring-white/10'
    : 'zoho-sidebar-link-active';
  const sidebarSubtleTextClass = isTalentAcquisitionRoute ? 'text-blue-100/55' : 'text-[#6d6258]';
  const sidebarDividerClass = isTalentAcquisitionRoute ? 'border-white/10' : 'border-white/6';
  const sidebarLogoutClass = isTalentAcquisitionRoute
    ? 'mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/75 transition-colors hover:bg-white/10 hover:text-white'
    : 'mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 transition-colors hover:bg-white/5 hover:text-white';
  const getSidebarLinkClass = (isLinkActive) => (isLinkActive ? sidebarLinkActiveClass : sidebarLinkClass);

  useEffect(() => {
    let isActive = true;

    if (showRecycleBin) {
      getBinItems()
        .then((response) => {
          if (isActive) {
            setRecycleBinCount(response.data?.total || 0);
          }
        })
        .catch(() => {
          if (isActive) {
            setRecycleBinCount(0);
          }
        });
    }

    return () => {
      isActive = false;
    };
  }, [location.pathname, showRecycleBin]);

  const taShortcuts = [
    {
      label: 'Access Settings',
      to: '/ta/settings/access',
      icon: ShieldCheck,
      visible: user?.roles?.includes('Admin') || canViewTAConfig,
      isActive: location.pathname === '/ta/settings/access'
    },
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
      visible: canViewTAConfig,
      isActive: location.pathname === '/ta/workflows'
    },
    {
      label: 'Phase Templates',
      to: '/ta/settings/phase-templates',
      icon: Settings,
      visible: canViewTAConfig,
      isActive: location.pathname === '/ta/settings/phase-templates'
    },
    {
      label: 'Email Templates',
      to: '/ta/email-templates',
      icon: Mail,
      visible: user?.roles?.includes('Admin') || user?.permissions?.includes('ta.email_template.manage') || user?.permissions?.includes('*'),
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
            ${sidebarShellClass} text-white flex flex-col shadow-xl z-50 fixed inset-y-0 left-0
            transition-transform duration-300 ease-in-out md:translate-x-0 w-64
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className={`flex items-start justify-between px-5 py-5 ${sidebarDividerClass ? `border-b ${sidebarDividerClass}` : ''}`}>
          <Link to={homeRoute} onClick={onClose} className="min-w-0">
            <div className={`flex h-12 w-[200px] items-center ${sidebarLogoAlignmentClass}`}>
              {sidebarLogoSrc ? (
                <div style={{ width: `${workspaceLogoSize}px` }}>
                  <img
                    src={sidebarLogoSrc}
                    alt={sidebarLogoAlt}
                    className="block max-h-12 w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-12 w-[200px]" aria-hidden="true" />
              )}
            </div>
          </Link>
          {/* Mobile Close Button */}
          <button onClick={onClose} className="md:hidden text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
          {isTalentAcquisitionRoute ? (
            <>
              <div className="mb-6 px-1">
                <Link
                  to="/"
                  className={`inline-flex items-center gap-2 text-[12px] font-semibold transition ${sidebarSubtleTextClass} hover:text-white`}
                  onClick={onClose}
                >
                  <ArrowLeft size={14} />
                  <span>Back to workspace</span>
                </Link>
                <h2 className="mt-3 text-lg font-semibold text-white">
                  Talent Acquisition
                </h2>
              </div>

              <div className={sectionLabelClass}>Main</div>
              <div className="mb-6 space-y-1">
                {TA_DASHBOARD_VIEWS.filter((item) => {
                  if (!canViewTAAnalytics && item.id === 'overview') {
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
                      className={getSidebarLinkClass(isDashboardViewActive)}
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
                    className={getSidebarLinkClass(item.isActive)}
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
                <Link to="/" className={getSidebarLinkClass(location.pathname === '/')} onClick={onClose}>
                  <Users size={18} />
                  <span>Dashboard</span>
                </Link>
              )}
              {showAttendance && (
                <Link to="/attendance" className={getSidebarLinkClass(location.pathname === '/attendance')} onClick={onClose}>
                  <Clock size={18} />
                  <span>Attendance</span>
                </Link>
              )}
              <Link to="/announcements" className={getSidebarLinkClass(location.pathname === '/announcements')} onClick={onClose}>
                <Megaphone size={18} />
                <span>Announcements</span>
              </Link>
              {showLeaves && (
                <Link to="/leaves" className={getSidebarLinkClass(location.pathname === '/leaves')} onClick={onClose}>
                  <FileText size={18} />
                  <span>Leaves</span>
                </Link>
              )}
              {showTimesheet && (
                <Link to="/timesheet" className={getSidebarLinkClass(location.pathname === '/timesheet')} onClick={onClose}>
                  <Calendar size={18} />
                  <span>Timesheet</span>
                </Link>
              )}
              {showHolidays && (
                <Link to="/holidays" className={getSidebarLinkClass(location.pathname === '/holidays')} onClick={onClose}>
                  <CalendarDays size={18} />
                  <span>Holidays</span>
                </Link>
              )}
              {showMeetings && (
                <Link
                  to={(user?.roles?.includes('Admin') || user?.permissions?.includes('discussion.read')) ? "/discussions" : "/meetings"}
                  className={getSidebarLinkClass(location.pathname === '/meetings' || location.pathname.startsWith('/discussions'))}
                  onClick={onClose}
                >
                  <ClipboardList size={18} />
                  <span>Meetings</span>
                </Link>
              )}
              {showHelpDesk && (
                <Link to="/helpdesk" className={getSidebarLinkClass(location.pathname === '/helpdesk')} onClick={onClose}>
                  <LifeBuoy size={18} />
                  <span>Help Desk</span>
                </Link>
              )}

              {canAccessTA && (
                <Link
                  to="/ta"
                  className={getSidebarLinkClass(isTalentAcquisitionRoute)}
                  onClick={onClose}
                >
                  <Briefcase size={18} />
                  <span>Talent Acquisition</span>
                </Link>
              )}

              {showOrganizationSection && <div className="mt-8"><div className={sectionLabelClass}>Manage</div></div>}
              {showEmployees && (
                <Link to="/users" className={getSidebarLinkClass(location.pathname === '/users')} onClick={onClose}>
                  <Users size={18} />
                  <span>Employees</span>
                </Link>
              )}
              {showOnboarding && (
                <Link to="/onboarding" className={getSidebarLinkClass(location.pathname === '/onboarding')} onClick={onClose}>
                  <UserPlus size={18} />
                  <span>Onboarding</span>
                </Link>
              )}
              {showOffboarding && (
                <Link to="/offboarding" className={getSidebarLinkClass(location.pathname === '/offboarding')} onClick={onClose}>
                  <LogOut size={18} />
                  <span>Offboarding</span>
                </Link>
              )}
              {showRecycleBin && (
                <Link to="/bin" className={getSidebarLinkClass(location.pathname === '/bin')} onClick={onClose}>
                  <Trash2 size={18} />
                  <span>Recycle Bin</span>
                  <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-inherit">
                    {recycleBinCount}
                  </span>
                </Link>
              )}

              {showProjectManagementSection && (
                <>
                  <div className="mt-8"><div className={sectionLabelClass}>Projects</div></div>

                  {showBusinessUnits && (
                    <Link to="/business-units" className={getSidebarLinkClass(location.pathname === '/business-units')} onClick={onClose}>
                      <Building size={18} />
                      <span>Business Units</span>
                    </Link>
                  )}

                  {showClients && (
                    <Link to="/clients" className={getSidebarLinkClass(location.pathname === '/clients')} onClick={onClose}>
                      <Users size={18} />
                      <span>Clients</span>
                    </Link>
                  )}

                  {showProjects && <Link to="/projects" className={getSidebarLinkClass(location.pathname === '/projects')} onClick={onClose}>
                    <Briefcase size={18} />
                    <span>Projects</span>
                  </Link>}
                </>
              )}

              {(showEmailSettings || showNotificationSettings) && (
                <>
                  <div className="mt-8"><div className={sectionLabelClass}>Settings</div></div>
                  {showNotificationSettings && (
                    <Link to="/settings/notifications" className={getSidebarLinkClass(location.pathname === '/settings/notifications')} onClick={onClose}>
                      <Bell size={18} />
                      <span>Notification Settings</span>
                    </Link>
                  )}
                  <Link to="/settings/email" className={getSidebarLinkClass(location.pathname === '/settings/email')} onClick={onClose}>
                    <Mail size={18} />
                    <span>Email Settings</span>
                  </Link>
                </>
              )}
            </>
          )}
        </div>

        <div className={`p-4 border-t ${sidebarDividerClass}`}>
          <Link
            to="/profile"
            className={`${sidebarCardClass} flex items-center gap-3 p-3 transition-colors group ${isTalentAcquisitionRoute ? 'hover:bg-white/10' : 'hover:bg-white/[0.05]'}`}
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
                <div className={`mt-0.5 truncate text-[10px] uppercase tracking-[0.16em] ${sidebarSubtleTextClass}`}>
                  Reports to: {user.reportingManagers.map(m => m.firstName).join(', ')}
                </div>
              )}
            </div>
          </Link>
          <button
            onClick={logout}
            className={sidebarLogoutClass}
          >
            <LogOut size={14} /> <span>Log Out</span>
          </button>

        </div>
      </aside>
    </>
  );
};

export default Sidebar;
