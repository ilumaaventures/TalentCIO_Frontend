import React from 'react';
import { Calendar, ArrowUpDown, ChevronDown, Check, Search, X } from 'lucide-react';

export const RepOutreachFilters = ({
  sortDropdownRef,
  isSortDropdownOpen,
  setIsSortDropdownOpen,
  activeSortLabel,
  dateFilterButtons,
  dateRange,
  setDateRange,
  pageSize,
  setPageSize,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  fetchActivities,
  channelPills,
  channelType,
  setChannelType,
  outcomeFilter,
  setOutcomeFilter,
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/90 space-y-3">
      {/* Time range picker with Sort Button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            Timeframe:
          </span>

          {/* Sort / Timeframe Dropdown Button */}
          <div className="relative inline-block text-left" ref={sortDropdownRef}>
            <button
              type="button"
              onClick={() => setIsSortDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition cursor-pointer"
              title="Sort by timeframe"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sort:</span>
              <span className="font-bold text-indigo-600">{activeSortLabel}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                  isSortDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                }`}
              />
            </button>

            {isSortDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-48 rounded-xl bg-white border border-slate-200/90 shadow-lg py-1.5 z-40">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                  Sort by Timeframe
                </div>
                {dateFilterButtons.map((btn) => {
                  const isSelected = dateRange === btn.id;
                  return (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => {
                        setDateRange(btn.id);
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 font-bold text-indigo-700'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <span>{btn.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Page Size Selector */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Custom Date Selector Row (if selected) */}
      {dateRange === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 text-xs">
          <span className="font-semibold text-slate-600">From:</span>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
          />
          <span className="font-semibold text-slate-600">To:</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={fetchActivities}
            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* Second Row: Channel Tabs + Outcome Filter + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        {/* Channel Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {channelPills.map((pill) => {
            const IconComponent = pill.icon;
            const isActive = channelType === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setChannelType(pill.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                {IconComponent && <IconComponent className="w-3 h-3" />}
                <span>{pill.label}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Outcome Filter & Search */}
        <div className="flex items-center gap-2">
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
          >
            <option value="all">All Outcomes</option>
            <option value="connected">All Connected Calls</option>
            <option value="positive">Positive (Interested / Demo / Meeting)</option>
            <option value="Connected - Interested">Interested / Demo</option>
            <option value="Scheduled Meeting">Scheduled Meeting</option>
            <option value="Callback Requested">Callback Requested</option>
            <option value="Connected - Not Interested">Not Interested</option>
            <option value="No Answer">No Answer / Busy</option>
            <option value="Wrong Number">Wrong Number</option>
            <option value="Sent">Sent (Email/WA)</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search company, contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
