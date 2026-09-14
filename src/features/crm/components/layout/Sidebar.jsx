import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  GitFork,
  CheckSquare,
  Clock,
  Calendar,
  Activity,
  Mail,
  MessageSquare,
  PhoneCall,
  Sparkles,
  Layers,
  BarChart3,
  TrendingUp,
  Target,
  Award,
  DollarSign,
  UserCheck,
  Globe2,
  Workflow,
  Bot,
  BrainCircuit,
  Sliders,
  ShieldCheck,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Compass,
} from 'lucide-react';

export const Sidebar = ({ activePage, onNavigate, isMobileOpen, onCloseMobile }) => {
  const [openGroups, setOpenGroups] = useState({
    sales: true,
    communication: true,
    growth: false,
    analytics: true,
    team: false,
    automation: false,
    ai: true,
    administration: false,
  });

  const toggleGroup = (groupKey) => {
    setOpenGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const navGroups = [
    {
      id: 'core',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      id: 'sales',
      label: 'Sales',
      items: [
        { id: 'leads', label: 'Leads', icon: Users },
        { id: 'deals', label: 'Opportunities', icon: Briefcase },
        { id: 'pipelines', label: 'Pipelines', icon: GitFork },
        { id: 'contacts', label: 'Contacts', icon: UserCheck },
        { id: 'companies', label: 'Companies', icon: Building2 },
        { id: 'follow-ups', label: 'Follow-ups', icon: Clock },
        { id: 'tasks', label: 'Tasks', icon: CheckSquare },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'activities', label: 'Activities', icon: Activity },
      ],
    },
    {
      id: 'communication',
      label: 'Communication',
      items: [
        { id: 'email', label: 'Email', icon: Mail },
        { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
        { id: 'calls', label: 'Calls', icon: PhoneCall },
      ],
    },
    {
      id: 'growth',
      label: 'Growth',
      items: [
        { id: 'sequences', label: 'Sequences', icon: Layers },
        { id: 'campaigns', label: 'Campaigns', icon: Compass },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      items: [
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'forecast', label: 'Forecast', icon: TrendingUp },
        { id: 'targets', label: 'Targets / Quotas', icon: Target },
        { id: 'commissions', label: 'Commissions', icon: DollarSign },
        { id: 'leaderboard', label: 'Leaderboard', icon: Award },
      ],
    },
    {
      id: 'team',
      label: 'Team',
      items: [
        { id: 'team-members', label: 'Team Members', icon: Users },
        { id: 'territories', label: 'Territories', icon: Globe2 },
      ],
    },
    {
      id: 'automation',
      label: 'Automation',
      items: [
        { id: 'workflows', label: 'Workflows', icon: Workflow },
      ],
    },
    {
      id: 'ai',
      label: 'AI Intelligence',
      items: [
        { id: 'ai-assistant', label: 'AI Sales Assistant', icon: Bot, isHighlight: true },
        { id: 'ai-insights', label: 'AI Risk Insights', icon: BrainCircuit },
      ],
    },
    {
      id: 'administration',
      label: 'Administration',
      items: [
        { id: 'users', label: 'Users & Roles', icon: ShieldCheck },
        { id: 'audit-logs', label: 'Audit Logs', icon: FileText },
        { id: 'data-tools', label: 'Data Tools (CSV/Merge)', icon: FileSpreadsheet },
        { id: 'settings', label: 'Settings', icon: Sliders },
      ],
    },
  ];

  const content = (
    <aside className="w-64 h-full bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide leading-tight">APEX SALES</h1>
            <p className="text-[10px] text-slate-400 font-medium">Enterprise CRM</p>
          </div>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            {group.label ? (
              <div
                onClick={() => toggleGroup(group.id)}
                className="flex items-center justify-between px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
              >
                <span>{group.label}</span>
                <span>
                  {openGroups[group.id] ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </span>
              </div>
            ) : null}

            {(!group.label || openGroups[group.id]) && (
              <div className="space-y-0.5 mt-1">
                {group.items.map((item) => {
                  const isActive = activePage === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                          : item.isHighlight
                          ? 'text-indigo-400 hover:bg-slate-800 hover:text-indigo-300'
                          : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-white' : item.isHighlight ? 'text-indigo-400' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-3.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
        <span className="truncate">Production v2.4</span>
        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Online
        </span>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0 h-screen sticky top-0">{content}</div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative z-10">{content}</div>
        </div>
      )}
    </>
  );
};
