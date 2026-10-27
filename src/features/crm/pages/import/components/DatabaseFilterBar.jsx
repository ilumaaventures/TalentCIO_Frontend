import React from 'react';
import {
  Calendar,
  Clock,
  User,
  Filter,
  Globe,
  Search,
  X,
  ChevronDown,
  CheckCircle2,
  Menu,
  Trash2,
  Send,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export const DatabaseFilterBar = ({
  dateDropdownRef,
  isDateDropdownOpen,
  setIsDateDropdownOpen,
  dateFilter,
  setDateFilter,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  dateTypeDropdownRef,
  isDateTypeDropdownOpen,
  setIsDateTypeDropdownOpen,
  dateFilterType,
  setDateFilterType,
  canViewAll,
  userDropdownRef,
  isUserDropdownOpen,
  setIsUserDropdownOpen,
  selectedUsers,
  activeUserOptions,
  userFilterSearch,
  setUserFilterSearch,
  filteredUserOptions,
  currentUserName,
  handleToggleUser,
  handleSelectAllUsers,
  handleClearUsers,
  statusDropdownRef,
  isStatusDropdownOpen,
  setIsStatusDropdownOpen,
  selectedStatuses,
  setSelectedStatuses,
  allFilterableStatuses,
  statusCounts,
  handleToggleStatus,
  getStatusBadgeStyle,
  availableSources,
  sourceDropdownRef,
  isSourceDropdownOpen,
  setIsSourceDropdownOpen,
  selectedSources,
  setSelectedSources,
  sourceFilterSearch,
  setSourceFilterSearch,
  filteredSourceOptions,
  handleToggleSource,
  searchQuery,
  setSearchQuery,
  hasActiveFilters,
  handleClearAllFilters,
  records,
  handleSelectOnlyNew,
  nonDuplicateIds,
  selectedIds,
  setSelectedIds,
  bulkMenuRef,
  isBulkMenuOpen,
  setIsBulkMenuOpen,
  STATUS_OPTIONS,
  isBulkStatusLoading,
  handleBulkStatusChange,
  handleOpenDeleteSelected,
  isSubmitting,
  handleOpenConvertBulk,
}) => {
  return (
    <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      {/* Left Filter Options: Date Filter + Search */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Filter Dropdown Button */}
        <div className="relative" ref={dateDropdownRef}>
          <button
            type="button"
            onClick={() => setIsDateDropdownOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition shadow-2xs cursor-pointer ${
              dateFilter !== 'all'
                ? 'border-indigo-300 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100/70'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title="Filter records by date"
          >
            <Calendar className={`w-3.5 h-3.5 ${dateFilter !== 'all' ? 'text-indigo-600' : 'text-slate-500'}`} />
            <span>
              Date Filter:{' '}
              <span className="font-bold text-indigo-700">
                {dateFilter === 'today'
                  ? 'Today'
                  : dateFilter === '2days'
                  ? 'Last 2 Days'
                  : dateFilter === '5days'
                  ? 'Last 5 Days'
                  : dateFilter === 'custom'
                  ? 'Custom'
                  : 'All'}
              </span>
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                isDateDropdownOpen ? 'rotate-180 text-indigo-600' : 'text-slate-400'
              }`}
            />
          </button>

          {isDateDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in-50 zoom-in-95 duration-100">
              {[
                { id: 'today', label: 'Today' },
                { id: 'all', label: 'All' },
                { id: '2days', label: 'Last 2 Days' },
                { id: '5days', label: 'Last 5 Days' },
                { id: 'custom', label: 'Custom' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setDateFilter(item.id);
                    setIsDateDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs transition cursor-pointer ${
                    dateFilter === item.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{item.label}</span>
                  {dateFilter === item.id && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-xs">
            <span className="text-[11px] font-medium text-slate-500">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-[11px] font-medium text-slate-500">To:</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="text-[11px] text-slate-400 hover:text-slate-700 px-1 font-semibold cursor-pointer"
                title="Clear date range"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Date Basis Dropdown Button (Updated At vs Created At) */}
        <div className="relative" ref={dateTypeDropdownRef}>
          <button
            type="button"
            onClick={() => setIsDateTypeDropdownOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition shadow-2xs cursor-pointer ${
              dateFilterType === 'updatedAt'
                ? 'border-indigo-300 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100/70'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title="Filter records based on Updated Date or Created Date"
          >
            <Clock className={`w-3.5 h-3.5 ${dateFilterType === 'updatedAt' ? 'text-indigo-600' : 'text-slate-500'}`} />
            <span>
              Basis:{' '}
              <span className="font-bold text-indigo-700">
                {dateFilterType === 'updatedAt' ? 'Updated At' : 'Created At'}
              </span>
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                isDateTypeDropdownOpen ? 'rotate-180 text-indigo-600' : 'text-slate-400'
              }`}
            />
          </button>

          {isDateTypeDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in-50 zoom-in-95 duration-100">
              {[
                { id: 'updatedAt', label: 'Updated At (Default)' },
                { id: 'createdAt', label: 'Created At' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setDateFilterType(item.id);
                    setIsDateTypeDropdownOpen(false);
                  }}
                  className={`w-full flex flex-col items-start px-3 py-2 text-xs transition cursor-pointer text-left ${
                    dateFilterType === item.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full font-bold">
                    <span>{item.label}</span>
                    {dateFilterType === item.id && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Imported By User Filter Dropdown — only for users with full org view */}
        {canViewAll && (
          <div className="relative" ref={userDropdownRef}>
            <button
              type="button"
              onClick={() => setIsUserDropdownOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition shadow-2xs cursor-pointer ${
                selectedUsers.length > 0
                  ? 'border-indigo-300 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100/70'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              title="Filter records by imported user"
            >
              <User className={`w-3.5 h-3.5 ${selectedUsers.length > 0 ? 'text-indigo-600' : 'text-slate-500'}`} />
              <span>
                Imported By:{' '}
                {selectedUsers.length === 0 ? (
                  <span className="font-normal text-slate-500">All</span>
                ) : selectedUsers.length === 1 ? (
                  <span className="font-bold text-indigo-700">{selectedUsers[0]}</span>
                ) : (
                  <span className="font-bold text-indigo-700">{selectedUsers.length} Users</span>
                )}
              </span>
              {selectedUsers.length > 0 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearUsers();
                  }}
                  className="ml-0.5 text-slate-400 hover:text-rose-600 px-0.5 rounded cursor-pointer transition"
                  title="Clear user filter"
                >
                  ✕
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                  isUserDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isUserDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white shadow-xl py-2 z-50 animate-in fade-in duration-100">
                {/* Header */}
                <div className="px-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800">Imported By (Active Users)</div>
                  {selectedUsers.length > 0 && (
                    <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                      {selectedUsers.length} selected
                    </span>
                  )}
                </div>

                {/* Search active users */}
                <div className="p-2 border-b border-slate-100">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search active users..."
                      value={userFilterSearch}
                      onChange={(e) => setUserFilterSearch(e.target.value)}
                      className="w-full pl-8 pr-6 py-1.5 text-xs rounded-md border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400"
                      autoFocus
                    />
                    {userFilterSearch && (
                      <button
                        type="button"
                        onClick={() => setUserFilterSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick action bar: Select All / Clear */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 text-[11px] bg-slate-50/60">
                  <button
                    type="button"
                    onClick={handleSelectAllUsers}
                    className="font-medium text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                  >
                    Select All ({activeUserOptions.length})
                  </button>
                  {selectedUsers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearUsers}
                      className="font-medium text-slate-500 hover:text-rose-600 transition cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Scrollable list of active users */}
                <div className="max-h-52 overflow-y-auto py-1">
                  {filteredUserOptions.length === 0 ? (
                    <div className="px-4 py-3 text-center text-xs text-slate-400">
                      {userFilterSearch ? 'No active users found' : 'No active users available'}
                    </div>
                  ) : (
                    filteredUserOptions.map((opt) => {
                      const isSelected = selectedUsers.includes(opt.name);
                      const isMe = currentUserName && opt.name.toLowerCase() === currentUserName.toLowerCase();
                      return (
                        <label
                          key={opt.id || opt.name}
                          className={`flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 cursor-pointer select-none text-xs transition ${
                            isSelected ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleUser(opt.name)}
                            className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 uppercase">
                            {opt.name.charAt(0) || 'U'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-slate-800 truncate flex items-center gap-1.5">
                              <span className="truncate">{opt.name}</span>
                              {isMe && (
                                <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 border border-indigo-200/60 px-1 rounded shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                            {opt.email && <div className="text-[10px] text-slate-400 truncate">{opt.email}</div>}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {selectedUsers.length} of {activeUserOptions.length} active
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-2xs transition cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Company Status Filter Dropdown */}
        <div className="relative" ref={statusDropdownRef}>
          <button
            type="button"
            onClick={() => setIsStatusDropdownOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition shadow-2xs cursor-pointer ${
              selectedStatuses.length > 0
                ? 'border-indigo-300 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100/70'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title="Filter records by company status"
          >
            <Filter className={`w-3.5 h-3.5 ${selectedStatuses.length > 0 ? 'text-indigo-600' : 'text-slate-500'}`} />
            <span>
              Status:{' '}
              {selectedStatuses.length === 0 ? (
                <span className="font-normal text-slate-500">All</span>
              ) : selectedStatuses.length === 1 ? (
                <span className="font-bold text-indigo-700">{selectedStatuses[0]}</span>
              ) : (
                <span className="font-bold text-indigo-700">{selectedStatuses.length} Selected</span>
              )}
            </span>
            {selectedStatuses.length > 0 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStatuses([]);
                }}
                className="ml-0.5 text-slate-400 hover:text-rose-600 px-0.5 rounded cursor-pointer transition font-bold"
                title="Clear status filter"
              >
                ✕
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                isStatusDropdownOpen ? 'rotate-180 text-indigo-600' : ''
              }`}
            />
          </button>

          {isStatusDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white shadow-xl py-2 z-50 animate-in fade-in duration-100">
              {/* Header */}
              <div className="px-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800">Company Status</div>
                {selectedStatuses.length > 0 && (
                  <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                    {selectedStatuses.length} selected
                  </span>
                )}
              </div>

              {/* Quick action bar */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 text-[11px] bg-slate-50/60">
                <button
                  type="button"
                  onClick={() => setSelectedStatuses(allFilterableStatuses)}
                  className="font-medium text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                >
                  Select All
                </button>
                {selectedStatuses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedStatuses([])}
                    className="font-medium text-slate-500 hover:text-rose-600 transition cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Status list */}
              <div className="max-h-56 overflow-y-auto py-1">
                {allFilterableStatuses.map((st) => {
                  const isSelected = selectedStatuses.includes(st);
                  const count = statusCounts[st] || 0;
                  return (
                    <label
                      key={st}
                      className={`flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer select-none text-xs transition ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleStatus(st)}
                          className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold truncate ${getStatusBadgeStyle(
                            st
                          )}`}
                        >
                          {st}
                        </span>
                      </div>
                      <span className="text-[10.5px] text-slate-400 font-mono shrink-0">({count})</span>
                    </label>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-3 pt-2 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsStatusDropdownOpen(false)}
                  className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-2xs transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Source Filter Dropdown */}
        {availableSources.length > 0 && (
          <div className="relative" ref={sourceDropdownRef}>
            <button
              type="button"
              onClick={() => setIsSourceDropdownOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition shadow-2xs cursor-pointer ${
                selectedSources.length > 0
                  ? 'border-indigo-300 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100/70'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              title="Filter records by source"
            >
              <Globe className={`w-3.5 h-3.5 ${selectedSources.length > 0 ? 'text-indigo-600' : 'text-slate-500'}`} />
              <span>
                Source:{' '}
                {selectedSources.length === 0 ? (
                  <span className="font-normal text-slate-500">All</span>
                ) : selectedSources.length === 1 ? (
                  <span className="font-bold text-indigo-700 truncate max-w-[110px] inline-block align-bottom">
                    {selectedSources[0]}
                  </span>
                ) : (
                  <span className="font-bold text-indigo-700">{selectedSources.length} Selected</span>
                )}
              </span>
              {selectedSources.length > 0 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSources([]);
                  }}
                  className="ml-0.5 text-slate-400 hover:text-rose-600 px-0.5 rounded cursor-pointer transition font-bold"
                  title="Clear source filter"
                >
                  ✕
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                  isSourceDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                }`}
              />
            </button>

            {isSourceDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white shadow-xl py-2 z-50 animate-in fade-in duration-100">
                {/* Header */}
                <div className="px-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800">Lead / Import Source</div>
                  {selectedSources.length > 0 && (
                    <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                      {selectedSources.length} selected
                    </span>
                  )}
                </div>

                {/* Search */}
                {availableSources.length > 5 && (
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search source..."
                        value={sourceFilterSearch}
                        onChange={(e) => setSourceFilterSearch(e.target.value)}
                        className="w-full pl-8 pr-6 py-1.5 text-xs rounded-md border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400"
                        autoFocus
                      />
                      {sourceFilterSearch && (
                        <button
                          type="button"
                          onClick={() => setSourceFilterSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick action bar */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 text-[11px] bg-slate-50/60">
                  <button
                    type="button"
                    onClick={() => setSelectedSources(availableSources.map((s) => s.name))}
                    className="font-medium text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                  >
                    Select All ({availableSources.length})
                  </button>
                  {selectedSources.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSources([])}
                      className="font-medium text-slate-500 hover:text-rose-600 transition cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-52 overflow-y-auto py-1">
                  {filteredSourceOptions.length === 0 ? (
                    <div className="px-4 py-3 text-center text-xs text-slate-400">
                      {sourceFilterSearch ? 'No matching sources' : 'No sources available'}
                    </div>
                  ) : (
                    filteredSourceOptions.map((opt) => {
                      const isSelected = selectedSources.includes(opt.name);
                      return (
                        <label
                          key={opt.name}
                          className={`flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer select-none text-xs transition ${
                            isSelected ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSource(opt.name)}
                              className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span className="font-medium text-slate-800 truncate" title={opt.name}>
                              {opt.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">({opt.count})</span>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-3 pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setIsSourceDropdownOpen(false)}
                    className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-2xs transition cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Bar */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search company, person..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1 text-[11px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold shadow-2xs transition cursor-pointer shrink-0 animate-in fade-in duration-150"
            title="Reset all filters to default (Today, Updated At)"
          >
            <X className="w-3.5 h-3.5 text-rose-600" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* Right Action: Delete Selected + Send to Leads */}
      <div className="flex items-center gap-2">
        {records.some((r) => r.isDuplicate) && (
          <Button
            size="sm"
            variant="outline"
            icon={CheckCircle2}
            onClick={handleSelectOnlyNew}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-[11px]"
            title="Select only unique non-duplicate records"
          >
            Select Only New ({nonDuplicateIds.length})
          </Button>
        )}

        {selectedIds.length > 0 && (
          <div className="relative inline-block" ref={bulkMenuRef}>
            <button
              type="button"
              onClick={() => setIsBulkMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 shadow-2xs transition cursor-pointer select-none"
              title="Bulk Actions Menu"
            >
              <Menu className="w-3.5 h-3.5 text-indigo-600" />
              <span>Actions ({selectedIds.length})</span>
              <ChevronDown
                className={`w-3 h-3 text-indigo-400 transition-transform duration-200 ${
                  isBulkMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isBulkMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                {/* Header */}
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                  <span>Selected: {selectedIds.length}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds([]);
                      setIsBulkMenuOpen(false);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-medium normal-case hover:underline text-[11px] cursor-pointer"
                  >
                    Clear Selection
                  </button>
                </div>

                {/* Change Status Section */}
                <div className="px-3 pt-2 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Change Status:
                </div>
                <div className="max-h-52 overflow-y-auto px-1.5 py-0.5 space-y-0.5 custom-scrollbar">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={isBulkStatusLoading}
                      onClick={() => {
                        handleBulkStatusChange(status);
                        setIsBulkMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition text-left cursor-pointer group"
                    >
                      <span className="font-medium group-hover:translate-x-0.5 transition-transform">{status}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${getStatusBadgeStyle(status)}`}>
                        Set
                      </span>
                    </button>
                  ))}
                </div>

                <div className="my-1.5 border-t border-slate-100" />

                {/* Delete Action */}
                <div className="px-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkMenuOpen(false);
                      handleOpenDeleteSelected();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition font-semibold text-left cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Delete Selected ({selectedIds.length})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <Button
          size="sm"
          variant="primary"
          icon={Send}
          disabled={selectedIds.length === 0}
          isLoading={isSubmitting}
          onClick={handleOpenConvertBulk}
          className="shadow-sm whitespace-nowrap"
        >
          Send to Leads ({selectedIds.length})
        </Button>
      </div>
    </div>
  );
};
