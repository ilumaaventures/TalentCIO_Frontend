import React from 'react';
import { Search, Filter, Layers, LayoutGrid, Network, List } from 'lucide-react';

const OrgSearchFilterBar = ({
    search,
    onSearchChange,
    departmentId,
    onDepartmentChange,
    businessUnitId,
    onBusinessUnitChange,
    includeInactive,
    onIncludeInactiveChange,
    departments = [],
    businessUnits = [],
    viewMode = 'tree',
    onViewModeChange
}) => {
    return (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto flex-1">
                {/* Search Box */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search employee, title, or email..."
                        className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                    />
                </div>

                {/* Department Dropdown */}
                <select
                    value={departmentId}
                    onChange={(e) => onDepartmentChange(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                        <option key={d._id} value={d._id}>
                            {d.name}
                        </option>
                    ))}
                </select>

                {/* Business Unit Dropdown */}
                {businessUnits.length > 0 && (
                    <select
                        value={businessUnitId}
                        onChange={(e) => onBusinessUnitChange(e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                    >
                        <option value="">All Business Units</option>
                        {businessUnits.map((bu) => (
                            <option key={bu._id} value={bu._id}>
                                {bu.name}
                            </option>
                        ))}
                    </select>
                )}

                {/* Inactive Toggle */}
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer ml-1">
                    <input
                        type="checkbox"
                        checked={includeInactive}
                        onChange={(e) => onIncludeInactiveChange(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Include Inactive</span>
                </label>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-end md:self-auto">
                <button
                    type="button"
                    onClick={() => onViewModeChange('tree')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        viewMode === 'tree'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Network size={14} />
                    <span>Tree Chart</span>
                </button>
                <button
                    type="button"
                    onClick={() => onViewModeChange('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        viewMode === 'list'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <List size={14} />
                    <span>Grouped List</span>
                </button>
            </div>
        </div>
    );
};

export default OrgSearchFilterBar;
