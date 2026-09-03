import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  Award,
  Users,
  Star,
  Sparkles,
  ArrowLeft,
  X,
  CheckCircle2,
  Briefcase,
  ChevronDown
} from 'lucide-react';
import { TALENT_PROFILES, getTalentStats } from './talentData';
import TalentCard from './components/TalentCard';
import TalentPreview from './components/TalentPreview';

/**
 * TalentPage Component
 * Admin-Only Talent Profile & Skill Evaluation Management Page
 * Supports full directory row view and transitions into a 30% / 70% split screen view upon selecting an employee.
 */
const TalentPage = () => {
  const [profiles] = useState(TALENT_PROFILES);
  const [selectedId, setSelectedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating_desc'); // 'rating_desc' | 'name_asc' | 'exp_desc'

  const stats = useMemo(() => getTalentStats(profiles), [profiles]);

  // Filter & sort profiles
  const filteredProfiles = useMemo(() => {
    return profiles
      .filter((profile) => {
        // Search Filter (Matches Name, Designation, Department, Location, or Specific Skills)
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase().trim();
          const matchesName = profile.name.toLowerCase().includes(query);
          const matchesDesignation = profile.designation.toLowerCase().includes(query);
          const matchesDepartment = profile.department.toLowerCase().includes(query);
          const matchesLocation = profile.location.toLowerCase().includes(query);
          const matchesSkills = [
            ...profile.functionalSkills.map((s) => s.name),
            ...profile.softSkills.map((s) => s.name)
          ].some((skillName) => skillName.toLowerCase().includes(query));

          return (
            matchesName ||
            matchesDesignation ||
            matchesDepartment ||
            matchesLocation ||
            matchesSkills
          );
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating_desc') {
          return b.overallRating - a.overallRating;
        }
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'exp_desc') {
          const expA = parseFloat(a.experience) || 0;
          const expB = parseFloat(b.experience) || 0;
          return expB - expA;
        }
        return 0;
      });
  }, [profiles, searchTerm, sortBy]);

  // Currently selected profile object
  const selectedEmployee = useMemo(() => {
    return profiles.find((p) => p.id === selectedId) || null;
  }, [profiles, selectedId]);

  // Scroll to top when selecting an employee
  useEffect(() => {
    if (selectedId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedId]);

  const handleSelectEmployee = (id) => {
    setSelectedId(id);
  };

  const handleCloseSplitView = () => {
    setSelectedId(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 bg-slate-50">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* ---------------------------------------------------------------- */}
        {/* Page Top Header Banner */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Sparkles size={13} className="text-blue-600" />
                <span>Admin Intelligence</span>
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Static Preview
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
              Talent Profiles & Competencies
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Explore verified employee profiles, evaluated soft & functional competencies, and interviewer scorecards.
            </p>
          </div>

          {/* Key Metrics Badges */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl px-3.5 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Talent
              </span>
              <span className="text-lg font-extrabold text-slate-900">{stats.total} Profiles</span>
            </div>
            <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl px-3.5 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                Avg Skill Score
              </span>
              <div className="flex items-center gap-1 text-lg font-extrabold text-blue-900">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                <span>{stats.avgRating}</span>
                <span className="text-xs font-normal text-blue-700/80">/ 5.0</span>
              </div>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl px-3.5 py-2 hidden sm:block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                Evaluations
              </span>
              <span className="text-lg font-extrabold text-emerald-900">
                {stats.totalEvaluations} Rated
              </span>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Search & Sort Toolbar */}
        {/* ---------------------------------------------------------------- */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[280px]">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search talent by name, role, skills (e.g. React, Figma, Python)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                Sort by:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="rating_desc">Highest Rated (Skill Score)</option>
                <option value="name_asc">Name (A to Z)</option>
                <option value="exp_desc">Experience (Highest First)</option>
              </select>

              {/* View Status Indicator */}
              {selectedId && (
                <button
                  type="button"
                  onClick={handleCloseSplitView}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors shrink-0"
                >
                  <ArrowLeft size={14} />
                  <span>Full Directory</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Main Content Area: Switch between Row View and 30/70 Split View */}
        {/* ---------------------------------------------------------------- */}
        {filteredProfiles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
            <div className="h-16 w-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Search size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Talent Profiles Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              We couldn't find any employee profiles matching "{searchTerm}". Try adjusting your search query or department filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedDept('All');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : selectedId ? (
          /* ============================================================== */
          /* 30% / 70% SPLIT VIEW LAYOUT                                     */
          /* ============================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 30% Panel: Compact Employee Navigation List */}
            <div className="lg:col-span-4 xl:col-span-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Talent List ({filteredProfiles.length})
                  </h3>
                </div>
                <span className="text-[11px] text-blue-600 font-semibold">
                  Click to preview
                </span>
              </div>

              {/* Scrollable list of compact cards */}
              <div className="space-y-2.5 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1 scrollbar-subtle">
                {filteredProfiles.map((employee) => (
                  <TalentCard
                    key={employee.id}
                    employee={employee}
                    mode="compact"
                    isSelected={employee.id === selectedId}
                    onClick={() => handleSelectEmployee(employee.id)}
                  />
                ))}
              </div>
            </div>

            {/* Right 70% Panel: Detailed Profile Preview */}
            <div className="lg:col-span-8 xl:col-span-8 min-h-[600px]">
              <TalentPreview
                employee={selectedEmployee}
                onClose={handleCloseSplitView}
                isSplitView={true}
              />
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* FULL-WIDTH ROW-BASED DIRECTORY LIST                             */
          /* ============================================================== */
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Showing {filteredProfiles.length} Employee Profiles
              </span>
              <span className="text-xs font-medium text-slate-400">
                Click any row to open the 30/70 split preview
              </span>
            </div>

            {filteredProfiles.map((employee) => (
              <TalentCard
                key={employee.id}
                employee={employee}
                mode="row"
                onClick={() => handleSelectEmployee(employee.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TalentPage;
