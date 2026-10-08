import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Layers, LayoutGrid, Network, List, ChevronDown, Check, X, Briefcase } from 'lucide-react';
import { getEmploymentTypeBadgeStyle } from '../utils/employmentTypeColors';

const PRIORITY_TYPES = ['Consultant', 'Advisors', 'Trainee', 'Intern', 'Full Time', 'Probation', 'Part Time', 'Contract'];
const EXCLUDED_EMPLOYMENT_TYPES = new Set(['employee', 'avai']);

const OrgSearchFilterBar = ({
    search,
    onSearchChange,
    departmentId,
    onDepartmentChange,
    businessUnitId,
    onBusinessUnitChange,
    includeInactive,
    onIncludeInactiveChange,
    employmentTypes = [],
    onEmploymentTypesChange,
    showReportingManagers = false,
    onShowReportingManagersChange,
    canViewBusinessUnits = true,
    canManageOrgChart = false,
    availableEmploymentTypes = [],
    departments = [],
    businessUnits = [],
    viewMode = 'tree',
    onViewModeChange
}) => {
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const typeDropdownRef = useRef(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
                setIsTypeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Combine priority types with any custom types from system, excluding employee and avai
    const allOptions = Array.from(new Set([
        ...PRIORITY_TYPES,
        ...(availableEmploymentTypes || [])
    ])).filter((t) => !EXCLUDED_EMPLOYMENT_TYPES.has(String(t).trim().toLowerCase()));

    const handleToggleType = (type) => {
        if (!onEmploymentTypesChange) return;
        const exists = employmentTypes.includes(type);
        if (exists) {
            onEmploymentTypesChange(employmentTypes.filter((t) => t !== type));
        } else {
            onEmploymentTypesChange([...employmentTypes, type]);
        }
    };

    const handleClearTypes = (e) => {
        e?.stopPropagation?.();
        onEmploymentTypesChange?.([]);
    };

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
                {canViewBusinessUnits && businessUnits.length > 0 && (
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

                {/* Multi-Select Employment Type Filter */}
                {canManageOrgChart && (
                    <div className="relative" ref={typeDropdownRef}>
                        <button
                        type="button"
                        onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                        className={`text-xs border rounded-xl px-3 py-2 flex items-center gap-2 outline-none transition-all ${
                            employmentTypes.length > 0
                                ? 'bg-white border-blue-400 text-slate-800 font-medium shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                        title="Filter by employment types"
                    >
                        <Briefcase size={14} className={employmentTypes.length > 0 ? 'text-blue-600' : 'text-slate-400'} />
                        {employmentTypes.length === 0 && (
                            <span>All Employment Types</span>
                        )}
                        {employmentTypes.length === 1 && (() => {
                            const style = getEmploymentTypeBadgeStyle(employmentTypes[0]);
                            return (
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md border text-[10px] font-semibold ${style.badge}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                                    <span>{employmentTypes[0]}</span>
                                </span>
                            );
                        })()}
                        {employmentTypes.length > 1 && (
                            <span className="flex items-center gap-1.5">
                                <span>{employmentTypes.length} Types</span>
                                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                    {employmentTypes.length}
                                </span>
                            </span>
                        )}
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Popover Menu */}
                    {isTypeDropdownOpen && (
                        <div className="absolute left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                            <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-slate-100">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Employment Type</span>
                                {employmentTypes.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleClearTypes}
                                        className="text-[10px] font-semibold text-blue-600 hover:text-blue-800"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>

                            <div className="max-h-56 overflow-y-auto space-y-0.5">
                                {allOptions.map((type) => {
                                    const isSelected = employmentTypes.includes(type);
                                    const style = getEmploymentTypeBadgeStyle(type);
                                    return (
                                        <label
                                            key={type}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`flex items-center justify-between px-2 py-1.5 rounded-xl cursor-pointer text-xs select-none transition-colors ${
                                                isSelected ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleType(type)}
                                                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium ${style.badge}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                                                    <span>{type}</span>
                                                </span>
                                            </div>
                                            {isSelected && <Check size={13} className="text-blue-600 mr-1" />}
                                        </label>
                                    );
                                })}
                            </div>

                            {employmentTypes.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between px-1">
                                    <span className="text-[10px] text-slate-500">
                                        Showing {employmentTypes.length} {employmentTypes.length === 1 ? 'type' : 'types'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsTypeDropdownOpen(false)}
                                        className="px-2.5 py-1 text-[11px] font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Done
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
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

            {/* Right Side: Manager Toggle & View Mode */}
            <div className="flex flex-wrap items-center gap-2.5 self-end md:self-auto">
                {/* Show Reporting Managers Checkbox (shown when filtering by employment type) */}
                {canManageOrgChart && employmentTypes.length > 0 && (
                    <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/80 hover:bg-blue-100/70 border border-blue-200 text-xs font-semibold text-blue-700 cursor-pointer transition-all select-none shadow-2xs">
                        <input
                            type="checkbox"
                            checked={showReportingManagers}
                            onChange={(e) => onShowReportingManagersChange?.(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>Show reporting managers</span>
                    </label>
                )}

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
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
        </div>
    );
};

export default OrgSearchFilterBar;
