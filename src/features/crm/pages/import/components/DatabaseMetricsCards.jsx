import React from 'react';
import { Database, Calendar, CheckCircle2, ExternalLink } from 'lucide-react';

export const DatabaseMetricsCards = ({
  showConvertedOnly,
  setShowConvertedOnly,
  dateFilter,
  setDateFilter,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  selectedUsers = [],
  totalDataCount = 0,
  todayFilteredCount = 0,
  dateFilteredCount = 0,
  dateFilteredConvertedCount = 0,
  scopedRecords = [],
  dateFilterInfo = { title: 'Today', description: 'Imported today', badge: 'Today' },
  onNavigate,
}) => {
  const isTotalActive = !showConvertedOnly && dateFilter === 'all' && !fromDate && !toDate;
  const isDateFilterActive = !showConvertedOnly && dateFilter !== 'all';
  const isConvertedActive = showConvertedOnly;
  const card2Count = dateFilter === 'all' ? todayFilteredCount : dateFilteredCount;
  const card2Percentage = totalDataCount > 0 ? Math.round((card2Count / totalDataCount) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Card 1: Total Data */}
      <div
        onClick={() => {
          setShowConvertedOnly(false);
          setDateFilter('all');
          setFromDate('');
          setToDate('');
        }}
        className={`p-2.5 sm:px-3 sm:py-2.5 rounded-xl border shadow-2xs transition-all duration-150 cursor-pointer select-none group relative ${
          isTotalActive
            ? 'bg-indigo-50/60 border-indigo-400 ring-2 ring-indigo-500/25 shadow-xs'
            : 'bg-white border-slate-200/90 hover:border-indigo-300 hover:shadow-xs'
        }`}
        title={isTotalActive ? 'Currently showing all records' : 'Click to view all records in workspace'}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p
                className={`text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  isTotalActive ? 'text-indigo-900 font-bold' : 'text-slate-500 group-hover:text-indigo-700'
                }`}
              >
                Total Data
              </p>
              {selectedUsers.length > 0 ? (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-indigo-600 text-white shrink-0 shadow-2xs">
                  {selectedUsers.length === 1 ? selectedUsers[0] : `${selectedUsers.length} Users`}
                </span>
              ) : (
                isTotalActive && (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-indigo-600 text-white shrink-0 shadow-2xs">
                    All Records
                  </span>
                )
              )}
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {totalDataCount}
              </span>
              <span className="text-[10px] font-medium text-slate-400">records</span>
            </div>
          </div>
          <div
            className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
              isTotalActive
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                : 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-100 group-hover:text-indigo-700'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
          <span className="truncate">
            {selectedUsers.length > 0
              ? `Filtered by ${selectedUsers.join(', ')}`
              : isTotalActive
              ? 'Showing all records in workspace'
              : 'Click to show all records'}
          </span>
          <span
            className={`font-semibold shrink-0 ${
              isTotalActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'
            }`}
          >
            {scopedRecords.length > 0
              ? selectedUsers.length > 0
                ? `${Math.round((totalDataCount / scopedRecords.length) * 100)}% of total`
                : '100%'
              : '0%'}
          </span>
        </div>
      </div>

      {/* Card 2: Date Filter */}
      <div
        onClick={() => {
          if (isDateFilterActive) {
            setDateFilter('all');
          } else {
            setShowConvertedOnly(false);
            setDateFilter('today');
            setFromDate('');
            setToDate('');
          }
        }}
        className={`p-2.5 sm:px-3 sm:py-2.5 rounded-xl border shadow-2xs transition-all duration-150 cursor-pointer select-none group relative ${
          isDateFilterActive
            ? 'bg-blue-50/60 border-blue-400 ring-2 ring-blue-500/25 shadow-xs'
            : 'bg-white border-slate-200/90 hover:border-blue-300 hover:shadow-xs'
        }`}
        title={
          isDateFilterActive
            ? `${dateFilterInfo.title} (Click to reset to all)`
            : 'Click to filter records imported today'
        }
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p
                className={`text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  isDateFilterActive ? 'text-blue-900 font-bold' : 'text-slate-500 group-hover:text-blue-700'
                }`}
              >
                {dateFilterInfo.title}
              </p>
              <span
                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] font-bold shrink-0 ${
                  isDateFilterActive
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                {isDateFilterActive ? 'Active Filter' : dateFilterInfo.badge}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {card2Count}
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                {dateFilter === 'today' || dateFilter === 'all' ? 'imported today' : 'matching filter'}
              </span>
            </div>
          </div>
          <div
            className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
              isDateFilterActive
                ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 border-blue-100 text-blue-600 group-hover:bg-blue-100 group-hover:text-blue-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
          <span className="truncate">
            {isDateFilterActive
              ? dateFilter === 'today'
                ? 'Filtered by today (Click to show all)'
                : `${dateFilterInfo.description} (Click to show all)`
              : 'Click to filter today’s records'}
          </span>
          <span className="font-semibold text-blue-600 shrink-0">{card2Percentage}% of total</span>
        </div>
      </div>

      {/* Card 3: Converted to Lead */}
      <div
        onClick={() => setShowConvertedOnly((prev) => !prev)}
        className={`p-2.5 sm:px-3 sm:py-2.5 rounded-xl border shadow-2xs transition-all duration-150 cursor-pointer select-none group relative ${
          isConvertedActive
            ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-500/25 shadow-xs'
            : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:shadow-xs'
        }`}
        title={
          isConvertedActive
            ? 'Filtered: Showing converted leads (Click to show all)'
            : 'Click to filter table by Converted to Lead'
        }
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p
                className={`text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  isConvertedActive ? 'text-emerald-900 font-bold' : 'text-slate-500 group-hover:text-emerald-700'
                }`}
              >
                Converted to Lead
              </p>
              <span
                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] font-bold shrink-0 ${
                  isConvertedActive
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {isConvertedActive ? 'Active Filter' : dateFilter === 'all' ? 'All Dates' : dateFilterInfo.badge}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-bold text-emerald-600 tracking-tight">
                {dateFilteredConvertedCount}
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                {dateFilter === 'today' ? 'converted today' : 'leads converted'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onNavigate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate('leads');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-100/50 transition cursor-pointer"
                title="Open CRM Leads page"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            <div
              className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                isConvertedActive
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:bg-emerald-100 group-hover:text-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
          <span className="truncate">
            {isConvertedActive
              ? 'Filtered: Showing converted leads (Click to reset)'
              : 'Click to filter converted leads'}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 shrink-0">
            {dateFilteredCount > 0
              ? `${Math.round((dateFilteredConvertedCount / dateFilteredCount) * 100)}% converted`
              : '0% converted'}
          </span>
        </div>
      </div>
    </div>
  );
};
