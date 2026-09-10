import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useClientAuth } from '../context/ClientAuthContext';
import { 
  Building2, 
  Briefcase, 
  Users, 
  LogOut, 
  BarChart2,
  ShieldCheck
} from 'lucide-react';

const ClientPortalLayout = () => {
  const { clientUser, client, logout } = useClientAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/client-portal/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/client-portal', icon: BarChart2, end: true },
    { name: 'Requisitions', path: '/client-portal/requisitions', icon: Briefcase },
    { name: 'My Interviews', path: '/client-portal/interviews', icon: Users },
    ...(clientUser?.role === 'ClientAdmin' ? [{ name: 'Team', path: '/client-portal/team', icon: ShieldCheck }] : [])
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo & Client Info */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-100">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-base tracking-tight">
                    {client?.name || 'Client Portal'}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Portal
                  </span>
                </div>
                <p className="text-xs text-slate-500">Talent Acquisition & Candidate Review</p>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </NavLink>
              ))}
            </nav>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-900">
                  {clientUser?.firstName} {clientUser?.lastName}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {clientUser?.role || 'Client Viewer'}
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Sign out"
                className="flex items-center gap-1 text-slate-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline text-xs font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default ClientPortalLayout;
