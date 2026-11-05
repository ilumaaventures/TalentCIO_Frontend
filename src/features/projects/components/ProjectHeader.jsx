import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
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
  discussionsCount = 0,
  onBack
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }
    const fromPath = location.state?.from;
    if (fromPath) {
      navigate(fromPath);
      return;
    }
    navigate('/projects');
  };

  const hasModules = project?.hasModules !== false;
  const projectMembers = project?.members;

  const resolvedMembers = useMemo(() => {
    if (!Array.isArray(projectMembers)) return [];
    return projectMembers.map((m, idx) => {
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
  }, [projectMembers, employees]);

  const formatDateStr = (d) => {
    if (!d) return '-';
    try {
      return format(new Date(d), 'MMM d, yyyy');
    } catch {
      return '-';
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
      {/* Top row: Title, status, actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Project info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleBack}
              className="p-1.5 -ml-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer mr-0.5"
              title="Go back"
              type="button"
            >
              <ArrowLeft size={16} />
            </button>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Briefcase size={16} />
            </span>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {project?.name}
            </h1>
            {onEditProject && (
              <button
                onClick={onEditProject}
                className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                title="Edit project details"
              >
                <Edit2 size={13} />
              </button>
            )}
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 border border-slate-200 text-slate-700">
              {STATUS_ICONS[project?.status] || STATUS_ICONS.Active}
              {project?.status || 'Active'}
            </span>
            {project?.client?.name && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <Building size={11} /> {project.client.name}
              </span>
            )}
            {project?.businessUnit?.name && (
              <span className="text-[11px] font-medium text-slate-500">
                • {project.businessUnit.name}
              </span>
            )}
          </div>

          {project?.description && (
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              {project.description}
            </p>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {canExportReport && onExportExcel && (
            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <ListChecks size={14} /> Export Excel
            </button>
          )}

          {canCreateTask && onOpenCreateTask && (
            <button
              onClick={() => onOpenCreateTask()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} /> New Task
            </button>
          )}

          {hasModules && canUpdateProject && onOpenCreateModule && (
            <button
              onClick={onOpenCreateModule}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} /> Add Module
            </button>
          )}

          {!hasModules && onOpenLogModal && (
            <button
              onClick={onOpenLogModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Clock size={14} /> Log Time
            </button>
          )}
        </div>
      </div>

      {/* Middle row: Metadata chips & Team */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Dates */}
          <div className="flex items-center gap-1.5 text-[11.5px]">
            <Calendar size={13} className="text-slate-400" />
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
              className="flex items-center gap-1 text-[11.5px] cursor-pointer hover:text-blue-600 transition-colors group/mgr"
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
            <div className="relative group/team flex items-center gap-1.5 py-0.5 text-[11.5px]">
              <span
                onClick={() => onSelectMember && onSelectMember('ALL')}
                className="text-slate-400 hover:text-blue-600 group-hover/team:text-blue-600 transition-colors font-medium cursor-pointer"
                title="View User Trace for all members"
              >
                Team ({resolvedMembers.length}):
              </span>
              <div className="flex -space-x-1.5">
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
                    className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center border-2 border-white text-[9px] shadow-2xs hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
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
          <div className="flex items-center p-0.5 bg-slate-100/80 rounded-lg border border-slate-200/80">
            <button
              onClick={() => onChangeViewMode('overview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-all cursor-pointer ${
                viewMode === 'overview'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Overview"
            >
              <LayoutList size={13} /> Overview
            </button>
            <button
              onClick={() => onChangeViewMode('board')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-all cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Kanban Board"
            >
              <Kanban size={13} /> Board
            </button>
            <button
              onClick={() => onChangeViewMode('hierarchy')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-all cursor-pointer ${
                viewMode === 'hierarchy'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Modules & Tasks Tree"
            >
              <ListTree size={13} /> Hierarchy
            </button>
            <button
              onClick={() => onChangeViewMode('performance')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-all cursor-pointer ${
                viewMode === 'performance'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Project Performance & Analytics"
            >
              <BarChart3 size={13} /> Performance
            </button>
            <button
              onClick={() => onChangeViewMode('user-trace')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-all cursor-pointer ${
                viewMode === 'user-trace'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Assigned Users & Date-wise Work Logs"
            >
              <UserCheck size={13} /> User Trace
            </button>
            <button
              onClick={() => onChangeViewMode('discussions')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-all cursor-pointer ${
                viewMode === 'discussions'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Project Discussions & Meeting Worklogs"
            >
              <MessageSquare size={13} /> Discussions
              {discussionsCount > 0 && (
                <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full ${
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
