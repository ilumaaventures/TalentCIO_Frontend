import React, { useState } from 'react';
import {
  Search,
  Plus,
  Bell,
  Sparkles,
  ChevronDown,
  Menu,
  Shield,
  LogOut,
  Building,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

export const Header = ({
  pageTitle,
  breadcrumbs = [],
  onOpenQuickCreate,
  onOpenCommandPalette,
  onOpenMobileMenu,
  onNavigate,
}) => {
  const { user, organization, logout, switchUser } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);


  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
      {/* Left: Mobile Menu & Title / Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span>Sales Hub</span>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <span>/</span>
                <span className={idx === breadcrumbs.length - 1 ? 'text-slate-700 font-semibold' : ''}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
            {pageTitle}
          </h2>
        </div>
      </div>

      {/* Right: Actions, Search, Notifications, Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Global Search Bar (Trigger for Cmd+K) */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-xs text-slate-500 transition-colors cursor-pointer w-48 lg:w-64"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">Search records...</span>
          <kbd className="ml-auto text-[10px] font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-2xs text-slate-400">
            Ctrl K
          </kbd>
        </button>

        {/* AI Assistant Quick Trigger */}
        <button
          onClick={() => onNavigate && onNavigate('ai-assistant')}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 hover:bg-indigo-100 transition-colors cursor-pointer shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>AI Copilot</span>
        </button>

        {/* Universal Quick Create Button */}
        <Button
          size="sm"
          onClick={onOpenQuickCreate}
          icon={Plus}
          className="shadow-2xs font-semibold"
        >
          <span className="hidden sm:inline">Create</span>
        </Button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 relative transition-colors cursor-pointer"
          >
            <Bell className="w-4.5 h-4.5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                {notifications.length > 0 && (
                  <span className="text-[10px] text-indigo-600 font-semibold cursor-pointer">Mark all read</span>
                )}
              </div>
              <div className="divide-y divide-slate-100 py-1 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No new notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-2.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200 mx-0.5 hidden sm:block" />

        {/* User Profile & Role Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1 pl-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={user?.name}
              className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
            />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-none">{user?.name || 'Aditya Sharma'}</p>
              <p className="text-[10px] text-slate-400 capitalize mt-0.5">
                {user?.role ? user.role.replace('_', ' ') : 'Org Admin'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* User Details */}
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold">
                  <Shield className="w-3 h-3" />
                  <span className="capitalize">{user?.role?.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Fast Role Switcher (For Demo & QA Testing) */}
              <div className="py-2 border-b border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1">
                  Switch Persona (Demo)
                </p>
                <button
                  onClick={() => {
                    switchUser('admin@salescrm.com');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded flex items-center justify-between"
                >
                  <span>Aditya (Org Admin)</span>
                  {user?.role === 'org_admin' && <UserCheck className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
                <button
                  onClick={() => {
                    switchUser('director@salescrm.com');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded flex items-center justify-between"
                >
                  <span>Vikram (Sales Director)</span>
                  {user?.role === 'sales_director' && <UserCheck className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
                <button
                  onClick={() => {
                    switchUser('manager@salescrm.com');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded flex items-center justify-between"
                >
                  <span>Priya (Sales Manager)</span>
                  {user?.role === 'sales_manager' && <UserCheck className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
                <button
                  onClick={() => {
                    switchUser('rep1@salescrm.com');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded flex items-center justify-between"
                >
                  <span>Arjun (Sales Executive)</span>
                  {user?.role === 'sales_executive' && <UserCheck className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              </div>

              {/* Organization Info */}
              <div className="px-3 py-2 text-[11px] text-slate-500 border-b border-slate-100 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{organization?.name}</span>
                <span className="font-bold text-slate-700">({organization?.currency || 'INR'})</span>
              </div>

              {/* Logout */}
              <button
                onClick={() => {
                  logout();
                  setShowUserMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 mt-1 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
