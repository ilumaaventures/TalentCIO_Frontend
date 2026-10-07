import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Briefcase,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  X,
  FolderGit2,
  Table as TableIcon,
  LayoutGrid
} from 'lucide-react';
import EmployeePerformance from './EmployeePerformance';

export const TeamPerformanceTracer = ({
  employees = [],
  projects = [],
  onBackToProjects = null,
  initialUserId = null
}) => {
  const [selectedUserId, setSelectedUserId] = useState(initialUserId);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFormat, setViewFormat] = useState('table'); // 'table' | 'grid'

  // Map each employee to their allocated projects count, managed count, and project names
  const employeeProjectStats = useMemo(() => {
    const map = new Map();

    employees.forEach((emp) => {
      const eId = String(emp._id);
      map.set(eId, {
        allocatedCount: 0,
        managedCount: 0,
        activeCount: 0,
        projectNames: []
      });
    });

    projects.forEach((proj) => {
      const isProjActive = proj.status === 'Active' || proj.isActive !== false;

      // Check manager
      const mgrId = proj.manager ? String(proj.manager?._id || proj.manager) : null;
      if (mgrId && map.has(mgrId)) {
        const stats = map.get(mgrId);
        stats.allocatedCount++;
        stats.managedCount++;
        if (isProjActive) stats.activeCount++;
        if (!stats.projectNames.includes(proj.name)) {
          stats.projectNames.push(proj.name);
        }
      }

      // Check members
      if (Array.isArray(proj.members)) {
        proj.members.forEach((m) => {
          const mId = String(m?._id || m);
          if (mId && mId !== mgrId && map.has(mId)) {
            const stats = map.get(mId);
            stats.allocatedCount++;
            if (isProjActive) stats.activeCount++;
            if (!stats.projectNames.includes(proj.name)) {
              stats.projectNames.push(proj.name);
            }
          }
        });
      }
    });

    return map;
  }, [employees, projects]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter((emp) => {
      const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
      const email = (emp.email || '').toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      return fullName.includes(q) || email.includes(q) || dept.includes(q);
    });
  }, [employees, searchQuery]);

  const selectedEmployee = useMemo(() => {
    if (!selectedUserId) return null;
    return employees.find((e) => String(e._id) === String(selectedUserId)) || null;
  }, [employees, selectedUserId]);

  if (selectedUserId) {
    return (
      <div className="space-y-4">
        {/* Breadcrumb Bar */}
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-xs">
            {onBackToProjects && (
              <button
                type="button"
                onClick={onBackToProjects}
                className="font-medium text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
              >
                Projects
              </button>
            )}
            {onBackToProjects && <span className="text-slate-300">/</span>}
            <button
              type="button"
              onClick={() => setSelectedUserId(null)}
              className="font-medium text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
            >
              All Users
            </button>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-800">
              {selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : 'Performance Tracer'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedUserId(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} /> Change User
          </button>
        </div>

        {/* Detailed Performance View */}
        <EmployeePerformance
          userId={selectedUserId}
          employee={selectedEmployee}
          onBack={() => setSelectedUserId(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Banner / Toolbar */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm md:text-base">
              User Performance & Allocation Tracer
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any team member from the table to view allocated projects, hours spent, and performance metrics.
            </p>
          </div>
        </div>

        {/* Search Input, View Format Toggle & Action */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-8 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* View Format Switcher (Table vs Grid) */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewFormat('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewFormat === 'table'
                  ? 'bg-white text-blue-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon size={13} />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewFormat('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewFormat === 'grid'
                  ? 'bg-white text-blue-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={13} />
              <span>Grid</span>
            </button>
          </div>

          {onBackToProjects && (
            <button
              type="button"
              onClick={onBackToProjects}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              Back to Projects
            </button>
          )}
        </div>
      </div>

      {/* TABLE FORMAT (DEFAULT) */}
      {viewFormat === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-5">Team Member</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Allocated Projects</th>
                  <th className="py-3.5 px-4">Assigned Projects</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => {
                  const stats = employeeProjectStats.get(String(emp._id)) || {
                    allocatedCount: 0,
                    activeCount: 0,
                    managedCount: 0,
                    projectNames: []
                  };
                  const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Team Member';
                  const initial = (emp.firstName || fullName || 'U')[0]?.toUpperCase();

                  return (
                    <tr
                      key={emp._id}
                      onClick={() => setSelectedUserId(emp._id)}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                            {emp.profilePicture ? (
                              <img src={emp.profilePicture} alt={fullName} className="w-full h-full object-cover" />
                            ) : (
                              initial
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 text-xs group-hover:text-blue-600 transition-colors block">
                              {fullName}
                            </span>
                            {emp.email && (
                              <span className="text-[11px] text-slate-400 block">
                                {emp.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        {emp.department ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {emp.department}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Allocated Projects Count */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            stats.allocatedCount > 0
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <FolderGit2 size={13} className={stats.allocatedCount > 0 ? 'text-blue-600' : 'text-slate-400'} />
                          <span>{stats.allocatedCount} {stats.allocatedCount === 1 ? 'project' : 'projects'}</span>
                        </span>
                      </td>

                      {/* Assigned Projects Preview */}
                      <td className="py-3.5 px-4">
                        {stats.projectNames.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1 max-w-xs">
                            {stats.projectNames.slice(0, 2).map((pName, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[130px]"
                                title={pName}
                              >
                                {pName}
                              </span>
                            ))}
                            {stats.projectNames.length > 2 && (
                              <span className="text-[10px] font-bold text-slate-400 px-1">
                                +{stats.projectNames.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">No project allocated</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserId(emp._id);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                        >
                          <span>Tracer</span>
                          <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID FORMAT (ALTERNATIVE VIEW) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map((emp) => {
            const stats = employeeProjectStats.get(String(emp._id)) || {
              allocatedCount: 0,
              activeCount: 0,
              managedCount: 0
            };
            const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Team Member';
            const initial = (emp.firstName || fullName || 'U')[0]?.toUpperCase();

            return (
              <div
                key={emp._id}
                onClick={() => setSelectedUserId(emp._id)}
                className="group bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                        {emp.profilePicture ? (
                          <img src={emp.profilePicture} alt={fullName} className="w-full h-full object-cover" />
                        ) : (
                          initial
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors">
                          {fullName}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          {emp.email || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {emp.department && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 truncate">
                        {emp.department}
                      </span>
                    )}
                    {stats.managedCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        Manager ({stats.managedCount})
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                    <FolderGit2 size={14} className="text-blue-600" />
                    <span>
                      {stats.allocatedCount}{' '}
                      <span className="text-slate-400 font-normal">
                        {stats.allocatedCount === 1 ? 'project' : 'projects'}
                      </span>
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                    Tracer <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredEmployees.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center shadow-xs space-y-2">
          <Users size={36} className="text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-700">No team members found</h4>
          <p className="text-xs text-slate-400">
            No users matched &ldquo;{searchQuery}&rdquo;.
          </p>
        </div>
      )}
    </div>
  );
};

export default TeamPerformanceTracer;
