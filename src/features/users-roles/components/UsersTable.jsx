import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Search, Shield, ArrowUpDown, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, UserCheck, MoreVertical, Eye } from 'lucide-react';
import { PAGE_SIZE_OPTIONS } from '../utils/userExportUtils';

const UsersTable = ({
    searchTerm,
    setSearchTerm,
    sortField,
    sortDirection,
    sortOption,
    setSortField,
    setSortDirection,
    setSortOption,
    showSortMenu,
    setShowSortMenu,
    showFilterMenu,
    setShowFilterMenu,
    filterStatus,
    setFilterStatus,
    filterDepartment,
    setFilterDepartment,
    filterEmploymentType,
    setFilterEmploymentType,
    filterJoiningDate,
    setFilterJoiningDate,
    departmentOptions,
    employmentTypeOptions,
    hasActiveFilters,
    clearFilters,
    allVisibleSelected,
    toggleSelectAllVisible,
    handleSort,
    filteredUsers,
    paginatedUsers,
    selectedEmployeeIds,
    toggleEmployeeSelection,
    hasSelection,
    rowsPerPage,
    setRowsPerPage,
    currentPage,
    setCurrentPage,
    totalPages,
    paginationNumbers,
    onNavigateUser,
    onImpersonateUser,
    canImpersonate,
    currentUserId,
}) => {
    const [openActionMenuId, setOpenActionMenuId] = useState(null);
    const actionMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
                setOpenActionMenuId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const renderSortHeader = (field, label, extraClass = '') => {
        const isActive = field === 'employee'
            ? (sortField === 'employee' || sortField === 'employeeCode')
            : sortField === field;

        const currentLabel = (field === 'employee' && sortField === 'employeeCode')
            ? 'Employee (Code)'
            : label;

        return (
            <th
                key={field}
                onClick={() => handleSort(field)}
                className={`px-2.5 py-1.5 cursor-pointer select-none transition hover:bg-slate-100 hover:text-slate-900 group whitespace-nowrap ${extraClass}`}
                title={
                    field === 'employee'
                        ? `Sort by Employee Name or Code (Current: ${sortField === 'employeeCode' ? 'Employee Code' : 'Employee Name'} ${sortDirection.toUpperCase()})`
                        : `Sort by ${label} (${isActive && sortDirection === 'asc' ? 'Click for Descending' : 'Click for Ascending'})`
                }
            >
                <div className="inline-flex items-center gap-1 font-semibold text-[10.5px]">
                    <span>{currentLabel}</span>
                    <span className={`inline-flex transition-colors ${isActive ? 'text-blue-600 font-bold' : 'text-slate-300 group-hover:text-slate-500'}`}>
                        {isActive ? (
                            sortDirection === 'asc' ? <ChevronUp size={12} className="stroke-[2.5]" /> : <ChevronDown size={12} className="stroke-[2.5]" />
                        ) : (
                            <ArrowUpDown size={10} className="opacity-60 group-hover:opacity-100" />
                        )}
                    </span>
                </div>
            </th>
        );
    };

    return (
        <div className="zoho-card overflow-hidden">
            {/* Toolbar: Search, Dynamic Employee Type Tabs & Active/Inactive Tabs */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search employees..."
                            className="pl-9 pr-4 py-2.5 w-72 bg-white border border-slate-200 rounded-lg text-sm outline-none transition-all shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </div>

                    {/* Dynamic Employee Type Tabs */}
                    <div className="flex items-center rounded-lg bg-slate-200/70 p-0.5 overflow-x-auto max-w-full">
                        {['All', ...(employmentTypeOptions || [])].map((type) => {
                            const isSelected = (filterEmploymentType || 'all').toLowerCase() === type.toLowerCase();
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => {
                                        setFilterEmploymentType(type === 'All' ? 'all' : type);
                                        if (setCurrentPage) setCurrentPage(1);
                                    }}
                                    className={`rounded-md px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                                        isSelected
                                            ? 'bg-white text-blue-600 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {type}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Active / Inactive Tabs */}
                <div className="flex items-center rounded-lg bg-slate-200/70 p-0.5 self-start lg:self-auto shrink-0">
                    {['Active', 'Inactive'].map((status) => {
                        const statusKey = status.toLowerCase();
                        const isSelected = filterStatus === statusKey;
                        return (
                            <button
                                key={status}
                                type="button"
                                onClick={() => {
                                    setFilterStatus(statusKey);
                                    if (setCurrentPage) setCurrentPage(1);
                                }}
                                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                                    isSelected
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {status}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr className="text-[10.5px] uppercase tracking-wider">
                            <th className="px-2.5 py-1.5 w-8">
                                <input
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    onChange={toggleSelectAllVisible}
                                    className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    aria-label="Select all visible employees"
                                />
                            </th>
                            {renderSortHeader('employee', 'Employee')}
                            {renderSortHeader('email', 'Email')}
                            {renderSortHeader('joiningDate', 'Joining Date')}
                            {renderSortHeader('role', 'Role')}
                            {renderSortHeader('department', 'Department')}
                            {renderSortHeader('employmentType', 'Type')}
                            {renderSortHeader('reportingTo', 'Reporting To')}
                            {renderSortHeader('status', 'Status')}
                            <th className="px-2.5 py-1.5 text-right text-[10.5px] whitespace-nowrap">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-8 text-center text-xs text-slate-500">
                                    No employees match the current search or filters.
                                </td>
                            </tr>
                        ) : paginatedUsers.map((employee) => (
                            <tr
                                key={employee._id}
                                onClick={(e) => {
                                    if (e.target.closest('input, button, a')) return;
                                    onNavigateUser(employee._id);
                                }}
                                className="hover:bg-slate-50/60 text-xs border-b border-slate-50 last:border-0 transition-colors cursor-pointer"
                            >
                                <td className="px-2.5 py-1.5">
                                    <input
                                        type="checkbox"
                                        checked={selectedEmployeeIds.includes(employee._id)}
                                        onChange={() => toggleEmployeeSelection(employee._id)}
                                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        aria-label={`Select ${employee.firstName} ${employee.lastName || ''}`}
                                    />
                                </td>
                                <td className="px-2.5 py-1.5">
                                    <div className="flex items-center space-x-2">
                                        <div className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[9px] shrink-0">
                                            {employee.firstName.charAt(0)}{employee.lastName?.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-slate-800 truncate leading-tight text-xs">{employee.firstName} {employee.lastName}</div>
                                            <div className="text-[9.5px] text-slate-500 leading-tight">{employee.employeeCode || 'N/A'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-2.5 py-1.5 text-slate-600 truncate max-w-[140px] text-xs" title={employee.email}>{employee.email}</td>
                                <td className="px-2.5 py-1.5 text-slate-600 whitespace-nowrap text-[11px]">
                                    {employee.joiningDate ? format(new Date(employee.joiningDate), 'dd MMM yyyy') : '-'}
                                </td>
                                <td className="px-2.5 py-1.5">
                                    {employee.roles.map(r => (
                                        <span key={r._id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-slate-100 text-slate-700 border border-slate-200 mr-1 whitespace-nowrap">
                                            <Shield size={9} className="mr-1" /> {r.name}
                                        </span>
                                    ))}
                                </td>
                                <td className="px-2.5 py-1.5 text-slate-600 truncate max-w-25 text-xs">{employee.department || '-'}</td>
                                <td className="px-2.5 py-1.5">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                                        {employee.employmentType || 'Full Time'}
                                    </span>
                                </td>
                                <td className="px-2.5 py-1.5 text-slate-600">
                                    {employee.reportingManagers && employee.reportingManagers.length > 0 ? (
                                        <div className="flex flex-col">
                                            {employee.reportingManagers.map(mgr => (
                                                <span key={mgr._id} className="font-medium text-[10.5px] text-slate-700 truncate max-w-[110px]" title={mgr.email}>{mgr.firstName} {mgr.lastName.charAt(0)}.</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-[10.5px] text-slate-400 italic">None</span>
                                    )}
                                </td>
                                <td className="px-2.5 py-1.5">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${employee.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        {employee.isActive ? 'Active' : (employee.isDeleted ? 'In Bin' : 'Inactive')}
                                    </span>
                                </td>
                                <td className="px-2.5 py-1.5 text-right relative">
                                    <div className="flex items-center justify-end relative">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenActionMenuId(openActionMenuId === employee._id ? null : employee._id);
                                            }}
                                            className={`p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border ${
                                                openActionMenuId === employee._id ? 'bg-slate-100 border-slate-300 text-slate-900' : 'border-transparent'
                                            }`}
                                            title="More options"
                                        >
                                            <MoreVertical size={16} />
                                        </button>

                                        {openActionMenuId === employee._id && (
                                            <div
                                                ref={actionMenuRef}
                                                className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 text-left animate-in fade-in zoom-in-95 duration-150"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenActionMenuId(null);
                                                        onNavigateUser(employee._id);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors text-left cursor-pointer"
                                                >
                                                    <Eye size={14} className="text-slate-400" />
                                                    <span>View Profile</span>
                                                </button>

                                                {Boolean(
                                                    canImpersonate
                                                    && currentUserId !== employee._id
                                                    && employee.isActive
                                                    && !employee.isDeleted
                                                ) && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenActionMenuId(null);
                                                            onImpersonateUser?.(employee);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 hover:text-amber-800 transition-colors text-left border-t border-slate-100 cursor-pointer"
                                                    >
                                                        <UserCheck size={14} className="text-amber-600" />
                                                        <span>Switch User</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <span>
                        Showing <strong>{paginatedUsers.length}</strong> of <strong>{filteredUsers.length}</strong>
                    </span>
                    <label className="flex items-center gap-2">
                        <span>Show</span>
                        <select
                            value={rowsPerPage}
                            onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500"
                        >
                            {PAGE_SIZE_OPTIONS.map((size) => (
                                <option key={size} value={size}>
                                    {size} entries
                                </option>
                            ))}
                        </select>
                    </label>
                    {hasSelection && (
                        <span className="text-xs font-medium text-blue-600">
                            Selected: {selectedEmployeeIds.length}
                        </span>
                    )}
                </div>
                {filteredUsers.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                            disabled={currentPage === 1}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ChevronLeft size={16} />
                            Previous
                        </button>
                        <div className="flex items-center gap-1">
                            {paginationNumbers.map((pageNumber) => (
                                <button
                                    key={pageNumber}
                                    type="button"
                                    onClick={() => setCurrentPage(pageNumber)}
                                    className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition ${
                                        currentPage === pageNumber
                                            ? 'bg-slate-900 text-white'
                                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {pageNumber}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Next
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UsersTable;
