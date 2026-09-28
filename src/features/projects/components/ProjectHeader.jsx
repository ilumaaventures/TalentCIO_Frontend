import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  Plus,
  Clock,
  ListChecks,
  LayoutList,
  Kanban,
  ListTree,
  Calendar,
  BarChart3,
  Building,
  User,
  Users,
  UserCheck,
  CheckCircle,
  PauseCircle,
  XCircle,
  Edit2,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_ICONS = {
  Active: <CheckCircle className="text-emerald-500" size={14} />,
  'On Hold': <PauseCircle className="text-amber-500" size={14} />,
  Completed: <CheckCircle className="text-blue-500" size={14} />,
  Inactive: <XCircle className="text-slate-400" size={14} />
};

// Resilient avatar rendering user's photo when available, with fallback to initial letter
const MemberAvatar = ({ member, size = 'sm', className = '' }) => {
  const [imgError, setImgError] = useState(false);
  const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'User';
  const initial = (member.firstName || fullName || 'U')[0].toUpperCase();
  const photoUrl = member.profilePicture || member.profilePhoto;

  const sizeClasses = size === 'md' ? 'w-7 h-7 text-xs' : 'w-6 h-6 text-[10px]';

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={fullName}
        onError={() => setImgError(true)}
        className={`${sizeClasses} rounded-full object-cover border-2 border-white shadow-2xs shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center border-2 border-white shadow-2xs shrink-0 ${className}`}
    >
      {initial}
    </div>
  );
};

export const ProjectHeader = ({
  project,
  employees = [],
  viewMode,
  onChangeViewMode,
  onOpenCreateModule,
  onOpenCreateTask,
  onOpenLogModal,
  onExportExcel,
  onEditProject,
  canUpdateProject,
  canCreateTask,
  canExportReport,
  onSelectMember,
  discussionsCount = 0
}) => {
  const hasModules = project?.hasModules !== false;

  const resolvedMembers = useMemo(() => {
    if (!Array.isArray(project?.members)) return [];
    return project.members.map((m, idx) => {
      const mId = String(m?._id || m);
      const match = employees.find(e => String(e._id) === mId);
      const baseObj = typeof m === 'object' && m !== null ? m : (match || {});
      const pic = baseObj.profilePicture || baseObj.profilePhoto || match?.profilePicture || match?.profilePhoto || null;
      return {
        ...baseObj,
        _id: mId || idx,
        firstName: baseObj.firstName || match?.firstName || 'Member',
        lastName: baseObj.lastName || match?.lastName || '',
        email: baseObj.email || match?.email || '',
        profilePicture: pic
      };
    });
  }, [project?.members, employees]);

  const formatDateStr = (d) => {
    if (!d) return '-';
    try {
      return format(new Date(d), 'MMM d, yyyy');
    } catch {
      return '-';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
      {/* Top row: Title, status, actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Project info */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Briefcase size={20} />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {project?.name}
            </h1>
            {onEditProject && (
              <button
                onClick={onEditProject}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                title="Edit project details"
              >
                <Edit2 size={15} />
              </button>
            )}
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700">
              {STATUS_ICONS[project?.status] || STATUS_ICONS.Active}
              {project?.status || 'Active'}
            </span>
            {project?.client?.name && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <Building size={12} /> {project.client.name}
              </span>
            )}
            {project?.businessUnit?.name && (
              <span className="text-xs font-medium text-slate-500">
                • {project.businessUnit.name}
              </span>
            )}
          </div>

          {project?.description && (
            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              {project.description}
            </p>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {canExportReport && onExportExcel && (
            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <ListChecks size={16} /> Export Excel
            </button>
          )}

          {canCreateTask && onOpenCreateTask && (
            <button
              onClick={() => onOpenCreateTask()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={16} /> New Task
            </button>
          )}

          {hasModules && canUpdateProject && onOpenCreateModule && (
            <button
              onClick={onOpenCreateModule}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={16} /> Add Module
            </button>
          )}

          {!hasModules && onOpenLogModal && (
            <button
              onClick={onOpenLogModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Clock size={16} /> Log Time
            </button>
          )}
        </div>
      </div>

      {/* Middle row: Metadata chips & Team */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
        <div className="flex items-center gap-6 flex-wrap">
          {/* Dates */}
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <span>
              {formatDateStr(project?.startDate)} → {formatDateStr(project?.dueDate)}
            </span>
          </div>

          {/* Manager */}
          {project?.manager && (
            <div
              onClick={() => {
                const mgrId = String(project.manager._id || project.manager);
                if (onSelectMember) onSelectMember(mgrId);
              }}
              className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors group/mgr"
              title={`View ${project.manager.firstName || 'Manager'}'s performance trace`}
            >
              <span className="text-slate-400">Manager:</span>
              <span className="font-semibold text-slate-800 group-hover/mgr:text-blue-600 group-hover/mgr:underline">
                {project.manager.firstName} {project.manager.lastName}
              </span>
            </div>
          )}

          {/* Members Stack with Hover Popover showing List of Assignees */}
          {resolvedMembers.length > 0 && (
            <div className="relative group/team flex items-center gap-1.5 py-0.5">
              <span
                onClick={() => onSelectMember && onSelectMember('ALL')}
                className="text-slate-400 hover:text-blue-600 group-hover/team:text-blue-600 transition-colors font-medium cursor-pointer"
                title="View User Trace for all members"
              >
                Team ({resolvedMembers.length}):
              </span>
              <div className="flex -space-x-2">
                {resolvedMembers.slice(0, 5).map((m, i) => (
                  <div
                    key={m._id || i}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectMember) onSelectMember(m._id);
                    }}
                    title={`Open User Trace for ${m.firstName || 'Member'}`}
                    className="cursor-pointer hover:scale-110 hover:z-20 transition-transform"
                  >
                    <MemberAvatar
                      member={m}
                      size="sm"
                      className="group-hover/team:border-blue-100 transition-all hover:ring-2 hover:ring-blue-400"
                    />
                  </div>
                ))}
                {resolvedMembers.length > 5 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectMember) onSelectMember('ALL');
                    }}
                    title="View all members trace"
                    className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center border-2 border-white text-[10px] shadow-2xs hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    +{resolvedMembers.length - 5}
                  </div>
                )}
              </div>

              {/* Hover Popover: List of Assignees / Team Members */}
              <div className="absolute top-full left-0 pt-2 z-50 opacity-0 invisible group-hover/team:opacity-100 group-hover/team:visible transition-all duration-200 pointer-events-auto">
                <div className="w-72 bg-white rounded-2xl border border-slate-200/90 shadow-xl p-3.5 space-y-2.5">
                  {/* Header */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectMember) onSelectMember('ALL');
                    }}
                    className="flex items-center justify-between pb-2 border-b border-slate-100 cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-colors"
                    title="Open User Trace for all team members"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Users size={14} className="text-blue-600" />
                      <span>Project Team</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors">
                      {resolvedMembers.length} {resolvedMembers.length === 1 ? 'member' : 'members'}
                    </span>
                  </div>

                  {/* Assignees List */}
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                    {resolvedMembers.map((m, i) => {
                      const fullName = `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Team Member';
                      const isManager = project?.manager && String(project.manager._id || project.manager) === String(m._id);

                      return (
                        <div
                          key={m._id || i}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectMember) onSelectMember(m._id);
                          }}
                          className="flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-blue-50/80 group/member cursor-pointer transition-all border border-transparent hover:border-blue-100"
                          title={`Open User Trace for ${fullName}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <MemberAvatar member={m} size="md" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-slate-800 group-hover/member:text-blue-700 truncate" title={fullName}>
                                  {fullName}
                                </span>
                                {isManager && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                    Manager
                                  </span>
                                )}
                              </div>
                              {m.email && (
                                <span className="text-[10px] text-slate-400 truncate block" title={m.email}>
                                  {m.email}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-blue-600 opacity-0 group-hover/member:opacity-100 transition-opacity shrink-0">
                            Trace &rarr;
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* View Mode Switcher Tabs */}
        {hasModules && (
          <div className="flex items-center p-1 bg-slate-100/80 rounded-xl border border-slate-200/80">
            <button
              onClick={() => onChangeViewMode('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'overview'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Overview"
            >
              <LayoutList size={15} /> Overview
            </button>
            <button
              onClick={() => onChangeViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Kanban Board"
            >
              <Kanban size={15} /> Board
            </button>
            <button
              onClick={() => onChangeViewMode('hierarchy')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'hierarchy'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Modules & Tasks Tree"
            >
              <ListTree size={15} /> Hierarchy
            </button>
            <button
              onClick={() => onChangeViewMode('performance')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'performance'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Project Performance & Analytics"
            >
              <BarChart3 size={15} /> Performance
            </button>
            <button
              onClick={() => onChangeViewMode('user-trace')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'user-trace'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Assigned Users & Date-wise Work Logs"
            >
              <UserCheck size={15} /> User Trace
            </button>
            <button
              onClick={() => onChangeViewMode('discussions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'discussions'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Project Discussions & Meeting Worklogs"
            >
              <MessageSquare size={15} /> Discussions
              {discussionsCount > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  viewMode === 'discussions' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
                }`}>
                  {discussionsCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectHeader;
