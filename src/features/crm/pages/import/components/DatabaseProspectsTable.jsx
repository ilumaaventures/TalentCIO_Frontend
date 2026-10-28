import React from 'react';
import {
  CheckCircle2,
  History,
  Filter,
  Globe,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  AlertCircle,
  Building2,
  Users,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  MoreVertical,
  PhoneCall,
  Mail,
  Send,
  Pencil,
  Trash2,
} from 'lucide-react';

export const DatabaseProspectsTable = ({
  totalMatchingRecords,
  pageSize,
  startEntry,
  endEntry,
  totalDataCount,
  selectedIds,
  setSelectedIds,
  showConvertedOnly,
  setShowConvertedOnly,
  showStatusChangedOnly,
  setShowStatusChangedOnly,
  selectedStatuses,
  setSelectedStatuses,
  selectedSources,
  setSelectedSources,
  handlePageSizeChange,
  totalPages,
  validCurrentPage,
  handlePageChange,
  isAllSelected,
  handleSelectAll,
  dateFilterType,
  sortDirection,
  setSortDirection,
  records,
  paginatedRecords,
  setSelectedDetailRecord,
  handleToggleRow,
  onNavigate,
  handleStatusChange,
  getStatusBadgeStyle,
  STATUS_OPTIONS,
  handleOpenHistory,
  openActionMenuId,
  setOpenActionMenuId,
  actionMenuRef,
  handleOpenOutreach,
  handleOpenConvertSingle,
  handleOpenEdit,
  handleOpenDeleteSingle,
}) => {
  return (
    <>
      {/* Status & Pagination Toolbar (Row Just Below Filters) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-1.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
        {/* Left: Showing X of Y | Selected: Z */}
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span className="font-medium text-slate-500">
            Showing{' '}
            {totalMatchingRecords === 0 ? (
              <strong className="text-slate-800 font-bold">0</strong>
            ) : totalMatchingRecords <= pageSize ? (
              <strong className="text-slate-800 font-bold">{totalMatchingRecords}</strong>
            ) : (
              <>
                <strong className="text-slate-800 font-bold">{startEntry}</strong>–
                <strong className="text-slate-800 font-bold">{endEntry}</strong>
              </>
            )}{' '}
            of <strong className="text-slate-800 font-bold">{totalDataCount}</strong>
            {totalMatchingRecords !== totalDataCount && totalMatchingRecords > 0 && (
              <span className="text-slate-400 font-normal ml-1">
                ({totalMatchingRecords} matching filter)
              </span>
            )}
            <span className="mx-2 text-slate-300">|</span>
            Selected: <strong className="text-indigo-600 font-bold">{selectedIds.length}</strong>
          </span>

          {showConvertedOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 ml-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Converted Only
              <button
                type="button"
                onClick={() => setShowConvertedOnly(false)}
                className="ml-1 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-200 rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold cursor-pointer"
                title="Clear converted filter and show all"
              >
                ✕
              </button>
            </span>
          )}

          {showStatusChangedOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 ml-1">
              <History className="w-3 h-3 text-indigo-600" />
              Status Changed Only ({totalMatchingRecords})
              <button
                type="button"
                onClick={() => setShowStatusChangedOnly(false)}
                className="ml-1 text-indigo-700 hover:text-indigo-950 hover:bg-indigo-200 rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold cursor-pointer"
                title="Clear status changed filter and show all"
              >
                ✕
              </button>
            </span>
          )}

          {selectedStatuses.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 ml-1">
              <Filter className="w-3 h-3 text-indigo-600" />
              Status: {selectedStatuses.join(', ')}
              <button
                type="button"
                onClick={() => setSelectedStatuses([])}
                className="ml-1 text-indigo-700 hover:text-indigo-950 hover:bg-indigo-200 rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold cursor-pointer"
                title="Clear status filter"
              >
                ✕
              </button>
            </span>
          )}

          {selectedSources.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 ml-1">
              <Globe className="w-3 h-3 text-blue-500" />
              Source: {selectedSources.join(', ')}
              <button
                type="button"
                onClick={() => setSelectedSources([])}
                className="ml-1 text-blue-700 hover:text-blue-950 hover:bg-blue-200 rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold cursor-pointer"
                title="Clear source filter"
              >
                ✕
              </button>
            </span>
          )}

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-[10px] text-slate-400 hover:text-slate-700 underline font-medium ml-1 cursor-pointer"
            >
              Clear selection
            </button>
          )}
        </div>

        {/* Right: Page Size Selector & Pagination */}
        <div className="flex items-center gap-2.5">
          {/* Entries per page options: 50 (default), 80, 100 */}
          <div className="flex items-center gap-1 text-[11px] text-slate-600">
            <span className="text-[10.5px] font-medium text-slate-500">Show:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-2xs">
              {[50, 80, 100].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handlePageSizeChange(size)}
                  className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold transition cursor-pointer ${
                    pageSize === size
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            <span className="text-[10.5px] text-slate-400">entries</span>
          </div>

          {/* Pagination Page Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2.5">
              <button
                type="button"
                disabled={validCurrentPage <= 1}
                onClick={() => handlePageChange(validCurrentPage - 1)}
                className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 shadow-2xs transition cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="text-[11px] text-slate-600 font-medium px-1">
                Page <strong className="text-indigo-600">{validCurrentPage}</strong> of{' '}
                <strong className="text-slate-800">{totalPages}</strong>
              </span>

              <button
                type="button"
                disabled={validCurrentPage >= totalPages}
                onClick={() => handlePageChange(validCurrentPage + 1)}
                className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 shadow-2xs transition cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs">
        <div className="overflow-x-auto max-h-[600px] min-h-[260px]">
          <table className="w-full min-w-[1174px] table-fixed text-left border-collapse text-[11px]">
            <colgroup>
              <col style={{ width: '44px' }} />
              <col style={{ width: '56px' }} />
              <col style={{ width: '260px' }} />
              <col style={{ width: '125px' }} />
              <col style={{ width: '160px' }} />
              <col style={{ width: '185px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '64px' }} />
            </colgroup>
            {/* Grey Table Header */}
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 text-[10px] select-none">
              <tr>
                <th className="py-2.5 px-2 w-[44px] min-w-[44px] max-w-[44px] text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                    title="Select/Deselect All Visible"
                  />
                </th>
                <th className="py-1.5 px-1 border-l border-slate-200 text-center w-[40px] min-w-[40px] max-w-[40px] whitespace-nowrap">
                  S.NO
                </th>
                <th className="py-2.5 px-2.5 border-l border-slate-200 whitespace-nowrap w-[260px] min-w-[260px] max-w-[260px]">
                  Company Name
                </th>
                <th className="py-2.5 px-2 border-l border-slate-200 whitespace-nowrap w-[125px] min-w-[125px] max-w-[125px]">
                  Industry
                </th>
                <th className="py-2.5 px-2.5 border-l border-slate-200 whitespace-nowrap w-[160px] min-w-[160px] max-w-[160px]">
                  Source
                </th>
                <th className="py-2.5 px-2.5 border-l border-slate-200 whitespace-nowrap w-[185px] min-w-[185px] max-w-[185px]">
                  Status
                </th>
                <th
                  className="py-2.5 px-2 border-l border-slate-200 whitespace-nowrap cursor-pointer select-none hover:bg-slate-200 transition-colors w-[130px] min-w-[130px] max-w-[130px]"
                  onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                  title="Click to toggle Date Sort Ascending/Descending"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{dateFilterType === 'createdAt' ? 'Created Date' : 'Updated Date'}</span>
                    {sortDirection === 'desc' ? (
                      <ArrowDown className="w-3.5 h-3.5 text-slate-700 font-bold" />
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5 text-slate-700 font-bold" />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-2.5 border-l border-slate-200 whitespace-nowrap w-[150px] min-w-[150px] max-w-[150px]">
                  Imported By
                </th>
                <th className="py-2.5 px-2 border-l border-slate-200 text-center w-[64px] min-w-[64px] max-w-[64px] whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {totalMatchingRecords === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">
                        {records.length === 0 ? 'No imported records yet' : 'No records match the current filter'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {records.length === 0
                          ? 'Click the "Import" button above to select and load an Excel file.'
                          : 'Try resetting the date filter or search query.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((row, idx) => {
                  const isSelected = selectedIds.includes(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                      onClick={() => setSelectedDetailRecord(row)}
                    >
                      <td
                        className="py-2.5 px-2 text-center align-top w-[44px] min-w-[44px] max-w-[44px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(row.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                        />
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-200 text-center font-semibold text-slate-500 whitespace-nowrap align-top w-[56px] min-w-[56px] max-w-[56px] text-[10.5px]">
                        {startEntry + idx}
                      </td>
                      <td className="py-2.5 px-2.5 border-l border-slate-200 font-bold text-slate-900 align-top w-[260px] min-w-[260px] max-w-[260px] overflow-hidden">
                        <div className="w-full flex flex-col gap-1 py-0.5 overflow-hidden">
                          <div className="flex items-start gap-1.5 overflow-hidden">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0 mt-0.5" />
                            <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors whitespace-normal [overflow-wrap:anywhere] break-words leading-snug text-[11px] min-w-0">
                              {row.companyName || '—'}
                            </span>
                          </div>
                          {row.contacts && row.contacts.length > 1 && (
                            <div className="pl-[20px]">
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 shrink-0"
                                title={row.contacts
                                  .map(
                                    (c) =>
                                      `${c.contactPerson || 'Contact'} (${c.designation || '—'}) • ${
                                        c.mobileNo || 'No phone'
                                      } • ${c.emailId || 'No email'}`
                                  )
                                  .join('\n')}
                              >
                                <Users className="w-3 h-3 text-violet-600" />
                                {row.contacts.length} Contacts
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-200 text-slate-700 align-top w-[125px] min-w-[125px] max-w-[125px] overflow-hidden">
                        <div className="w-full overflow-hidden">
                          <span className="text-slate-800 font-medium whitespace-normal [overflow-wrap:anywhere] break-words leading-snug block text-[10.5px]">
                            {row.industry || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 border-l border-slate-200 text-slate-700 font-medium align-top w-[160px] min-w-[160px] max-w-[160px] overflow-hidden">
                        <div className="w-full overflow-hidden">
                          <span className="whitespace-normal [overflow-wrap:anywhere] break-words leading-relaxed block text-[10.5px]">
                            {row.source || row.leadSource || ''}
                          </span>
                        </div>
                      </td>
                      <td
                        className="py-2.5 px-2.5 border-l border-slate-200 align-top w-[185px] min-w-[185px] max-w-[185px] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.isDuplicate ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                            title={row.duplicateReason || 'Duplicate found'}
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            <span>Duplicate</span>
                          </span>
                        ) : row.isConvertedToLead ? (
                          <div className="relative inline-flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-300">
                              <CheckCircle2 className="w-3 h-3 text-teal-600" />
                              <span>Converted to Lead</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onNavigate) onNavigate('leads');
                              }}
                              className="p-1 rounded hover:bg-emerald-50 text-emerald-600 transition cursor-pointer"
                              title="View in CRM Leads"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative inline-flex items-center gap-1.5 flex-nowrap max-w-full">
                            <div className="relative inline-flex items-center max-w-[130px]">
                              <select
                                value={row.status || row.leadStatus || 'New'}
                                onChange={(e) => handleStatusChange(row, e.target.value)}
                                className={`appearance-none inline-flex items-center pl-2 pr-5 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-offset-1 shadow-2xs max-w-[130px] truncate ${getStatusBadgeStyle(
                                  row.status || row.leadStatus || 'New'
                                )}`}
                              >
                                {STATUS_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt} className="bg-white text-slate-800 text-xs font-normal">
                                    {opt}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none opacity-60" />
                            </div>
                            {row.statusHistory && row.statusHistory.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenHistory(row);
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition shrink-0 cursor-pointer"
                                title={`Status changed ${row.statusHistory.length} time(s). Latest: from "${
                                  row.statusHistory[0]?.previousStatus || 'New'
                                }" to "${row.statusHistory[0]?.status}". Click to view company history.`}
                              >
                                <History className="w-3 h-3 text-indigo-600" />
                                <span>{row.statusHistory.length}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-200 text-slate-600 whitespace-nowrap font-medium align-top w-[130px] min-w-[130px] max-w-[130px] text-[10.5px] overflow-hidden">
                        {(() => {
                          const targetDate =
                            dateFilterType === 'createdAt'
                              ? row.createdAt || row.date
                              : row.updatedAt || row.lastContactedAt || row.date || row.createdAt;
                          if (!targetDate) return '—';
                          const d = new Date(targetDate);
                          if (isNaN(d.getTime())) return '—';
                          return (
                            <div className="flex flex-col">
                              <span>{d.toLocaleDateString()}</span>
                              {dateFilterType === 'updatedAt' && row.updatedAt && (
                                <span className="text-[9px] text-slate-400 font-normal">
                                  {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 px-2.5 border-l border-slate-200 text-slate-700 whitespace-nowrap align-top w-[150px] min-w-[150px] max-w-[150px] overflow-hidden">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[9.5px] font-bold flex items-center justify-center shrink-0 uppercase">
                            {(row.importedBy || 'U').charAt(0)}
                          </div>
                          <span
                            className="font-medium text-slate-800 text-[10.5px] truncate max-w-[110px]"
                            title={row.importedBy || '—'}
                          >
                            {row.importedBy || '—'}
                          </span>
                        </div>
                      </td>
                      <td
                        className="py-2.5 px-2 border-l border-slate-200 text-center whitespace-nowrap align-top w-[64px] min-w-[64px] max-w-[64px] relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative inline-flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenuId((prev) => (prev === row.id ? null : row.id));
                            }}
                            className={`p-1 rounded-md transition cursor-pointer ${
                              openActionMenuId === row.id
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
                            }`}
                            title="Row Actions"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {openActionMenuId === row.id && (
                            <div
                              ref={actionMenuRef}
                              className={`absolute right-0 w-44 bg-white rounded-xl shadow-2xl border border-slate-200/95 py-1 z-50 text-left text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100 ${
                                paginatedRecords.length > 4 && idx >= paginatedRecords.length - 2
                                  ? 'bottom-full mb-1.5'
                                  : 'top-full mt-1.5'
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    handleOpenOutreach(row, 'call');
                                  }}
                                  className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 transition font-medium cursor-pointer"
                                >
                                  <PhoneCall className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                  <span>Log Outreach</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    handleOpenOutreach(row, 'email');
                                  }}
                                  className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-sky-50 hover:text-sky-700 text-slate-700 transition font-medium cursor-pointer"
                                >
                                  <Mail className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                  <span>Send Sales Email</span>
                                </button>

                                {!row.isConvertedToLead && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      handleOpenConvertSingle(row);
                                    }}
                                    className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition font-medium cursor-pointer"
                                  >
                                    <Send className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Send to Leads</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    handleOpenEdit(row);
                                  }}
                                  className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-slate-50 hover:text-slate-900 text-slate-700 transition font-medium cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span>Edit Company</span>
                                </button>
                              </div>

                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    handleOpenDeleteSingle(row);
                                  }}
                                  className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-rose-50 hover:text-rose-700 text-rose-600 transition font-medium cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="font-medium text-slate-700">
              {selectedIds.length} of {records.length} selected
            </span>

            {/* Entries per page options in footer */}
            <div className="flex items-center gap-1 text-[11px] text-slate-600 border-l border-slate-200 pl-3">
              <span className="text-[10.5px] font-medium text-slate-500">Show:</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-2xs">
                {[50, 80, 100].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handlePageSizeChange(size)}
                    className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold transition cursor-pointer ${
                      pageSize === size
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <span className="text-[10.5px] text-slate-400">entries</span>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={validCurrentPage <= 1}
                onClick={() => handlePageChange(validCurrentPage - 1)}
                className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 shadow-2xs transition cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="text-xs text-slate-600 font-medium px-1">
                Page <strong className="text-indigo-600">{validCurrentPage}</strong> of{' '}
                <strong className="text-slate-800">{totalPages}</strong>
              </span>

              <button
                type="button"
                disabled={validCurrentPage >= totalPages}
                onClick={() => handlePageChange(validCurrentPage + 1)}
                className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 shadow-2xs transition cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
