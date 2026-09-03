import React from 'react';
import {
  Star,
  MapPin,
  Briefcase,
  ChevronRight,
  Eye,
  Award,
  Sparkles,
  UserCheck
} from 'lucide-react';

/**
 * TalentCard Component
 * Supports two presentation modes:
 * 1. 'row' - Full-width horizontal row for the main directory view
 * 2. 'compact' - Streamlined card for the 30% split-screen navigation list
 */
const TalentCard = ({
  employee,
  mode = 'row', // 'row' | 'compact'
  isSelected = false,
  onClick
}) => {
  const {
    id,
    name,
    avatar,
    avatarInitials,
    avatarBg = 'bg-blue-600',
    designation,
    department,
    location,
    experience,
    employeeCode,
    overallRating,
    functionalSkills = [],
    softSkills = [],
    tagline
  } = employee;

  // Primary evaluator
  const primaryInterviewer =
    functionalSkills[0]?.interviewer || softSkills[0]?.interviewer;
  const primaryRole =
    functionalSkills[0]?.interviewerRole || softSkills[0]?.interviewerRole;

  // Rating color helper
  const getRatingBadgeClass = (rating) => {
    if (rating >= 4.7) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (rating >= 4.3) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  // --------------------------------------------------------------------------
  // COMPACT MODE (Used in Left 30% Panel during Split Screen)
  // --------------------------------------------------------------------------
  if (mode === 'compact') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        className={`group relative flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 cursor-pointer text-left select-none ${
          isSelected
            ? 'bg-blue-50/90 border-blue-300 shadow-sm ring-1 ring-blue-400/40'
            : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
        }`}
      >
        {/* Active Left Indicator Bar */}
        {isSelected && (
          <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-blue-600 rounded-r-full" />
        )}

        {/* Small Avatar */}
        <div className="relative shrink-0">
          <div className="h-11 w-11 rounded-full overflow-hidden border border-slate-200/80 shadow-xs bg-slate-100 flex items-center justify-center">
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`h-full w-full ${avatarBg} text-white font-bold text-xs flex items-center justify-center ${
                avatar ? 'hidden' : 'flex'
              }`}
            >
              {avatarInitials || name.slice(0, 2).toUpperCase()}
            </div>
          </div>
          {isSelected && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 ring-2 ring-white text-[9px] text-white font-bold">
              ✓
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <h4 className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-900 font-bold' : 'text-slate-900 group-hover:text-blue-600'}`}>
              {name}
            </h4>
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded border ${getRatingBadgeClass(overallRating)}`}>
              <Star size={10} className="fill-amber-400 text-amber-400" />
              {overallRating}
            </span>
          </div>

          <p className="text-[11px] text-slate-600 truncate font-medium">
            {designation}
          </p>

          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-600">
            <span className="truncate max-w-[110px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
              {department}
            </span>
            <span>•</span>
            <span className="truncate">{location.split(',')[0]}</span>
          </div>

          {primaryInterviewer && (
            <p className="text-[10px] text-slate-500 truncate mt-1 flex items-center gap-1 font-medium">
              <UserCheck size={10} className="text-blue-600 shrink-0" />
              <span>Interviewer: <strong className="text-slate-700">{primaryInterviewer}</strong></span>
            </p>
          )}
        </div>

        <ChevronRight
          size={16}
          className={`shrink-0 transition-transform ${
            isSelected
              ? 'text-blue-600 translate-x-0.5'
              : 'text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5'
          }`}
        />
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // ROW MODE (Main Listing View)
  // --------------------------------------------------------------------------
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="group relative bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer select-none"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Avatar + Name + Designation + Department */}
        <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
          {/* Avatar with Status Ring */}
          <div className="relative shrink-0">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-slate-100 ring-2 ring-slate-100 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`h-full w-full ${avatarBg} text-white font-bold text-base flex items-center justify-center ${
                  avatar ? 'hidden' : 'flex'
                }`}
              >
                {avatarInitials || name.slice(0, 2).toUpperCase()}
              </div>
            </div>
            <span
              className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs"
              title="Active Talent"
            />
          </div>

          {/* Name & Job Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">
                {name}
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {department}
              </span>
              {employeeCode && (
                <span className="text-[11px] font-medium text-slate-600">
                  {employeeCode}
                </span>
              )}
            </div>

            <p className="text-sm font-medium text-slate-700 mt-0.5">
              {designation}
            </p>

            {/* Sub-meta: Location, Experience & Interviewer */}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} className="text-slate-600" />
                {location}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Briefcase size={13} className="text-slate-600" />
                {experience} Exp
              </span>
              {primaryInterviewer && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                    <UserCheck size={13} className="text-blue-600" />
                    <span>Interviewer: <strong className="text-slate-900">{primaryInterviewer}</strong></span>
                  </span>
                </>
              )}
            </div>

            {/* Tagline snippet */}
            {tagline && (
              <p className="text-xs text-slate-600 line-clamp-1 mt-2 font-normal hidden sm:block">
                "{tagline}"
              </p>
            )}
          </div>
        </div>

        {/* Middle/Right Side: Key Skills preview + Overall Rating + View Action */}
        <div className="flex items-center justify-between lg:justify-end gap-4 sm:gap-6 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 shrink-0">
          {/* Top Functional Skills preview */}
          <div className="hidden md:flex flex-col items-start lg:items-end gap-1.5 max-w-[240px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Evaluated Skills
            </span>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {functionalSkills.slice(0, 3).map((skill) => (
                <span
                  key={skill.id || skill.name}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
                >
                  {skill.name.split(' ')[0]}
                </span>
              ))}
              {functionalSkills.length > 3 && (
                <span className="text-[10px] font-semibold text-slate-600">
                  +{functionalSkills.length - 3 + softSkills.length} more
                </span>
              )}
            </div>
          </div>

          {/* Rating Badge */}
          <div className="flex flex-col items-center justify-center px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 group-hover:border-blue-200 transition-colors min-w-[90px]">
            <div className="flex items-center gap-1 text-base font-extrabold text-slate-900">
              <Star size={16} className="fill-amber-400 text-amber-400" />
              <span>{overallRating}</span>
              <span className="text-xs font-normal text-slate-600">/5</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-tight">
              Skill Score
            </span>
          </div>

          {/* View Profile Action Button */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-semibold text-xs transition-all duration-200 shadow-xs group-hover:bg-blue-600 group-hover:text-white"
            >
              <Eye size={14} />
              <span>View Profile</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TalentCard;
