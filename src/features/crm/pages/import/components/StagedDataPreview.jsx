import React from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  X,
  Users,
  Pencil,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';

export const StagedDataPreview = ({
  stagedData,
  showPreview,
  setShowPreview,
  previewTab,
  setPreviewTab,
  visibleStagedRows = [],
  onCancel,
  onConfirmImport,
  onEditRow,
  getStatusBadgeStyle = () => 'bg-slate-50 text-slate-700 border-slate-300',
}) => {
  if (!stagedData) return null;

  return (
    <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden p-6 space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-xs sm:max-w-md" title={stagedData.fileName}>
                {stagedData.fileName}
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                {stagedData.totalRowsFetched || stagedData.rows.length} rows fetched
              </span>
              <Badge variant="blue" size="sm" className="whitespace-nowrap">
                {stagedData.rows.length} {stagedData.rows.length === 1 ? 'company' : 'companies'} ({stagedData.rows.length} total)
              </Badge>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                <CheckCircle2 className="w-3 h-3" />
                {stagedData.newCount} new
              </span>
              {stagedData.updateCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap"
                  title="Existing records in CRM or workspace to update"
                >
                  <RefreshCw className="w-3 h-3 text-amber-600" />
                  {stagedData.updateCount} update
                </span>
              )}
              {stagedData.duplicateCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap"
                  title="Duplicate company name, mobile, or email within sheet"
                >
                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                  {stagedData.duplicateCount} duplicate(s) skipped
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              File Size: {stagedData.fileSize} • {stagedData.totalRowsFetched || stagedData.rows.length} total rows fetched from sheet • Duplicates in sheet are skipped. New data will upload, and existing records will be updated.
            </p>
          </div>
        </div>

        {/* Right Button Toolbar - Sleek, Unified, Single-Row Aligned */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap pt-1 lg:pt-0">
          <button
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 shadow-2xs transition-all cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            {showPreview ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 active:bg-rose-100 text-slate-600 shadow-2xs transition-all cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-rose-200"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>

          {stagedData.updateCount > 0 && stagedData.newCount > 0 ? (
            <>
              <button
                type="button"
                onClick={() => onConfirmImport('new')}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 shadow-2xs transition-all cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-400"
                title="Import only new rows"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Import New Only ({stagedData.newCount})
              </button>
              <button
                type="button"
                onClick={() => onConfirmImport('all')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm shadow-indigo-600/25 transition-all cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                title="Import new rows and update existing records"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Import & Update All ({stagedData.newCount + stagedData.updateCount} rows)
              </button>
            </>
          ) : stagedData.updateCount > 0 ? (
            <button
              type="button"
              onClick={() => onConfirmImport('update')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-sm shadow-amber-600/25 transition-all cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Update Existing ({stagedData.updateCount} rows)
            </button>
          ) : (
            <button
              type="button"
              disabled={stagedData.newCount === 0}
              onClick={() => onConfirmImport('new')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm shadow-indigo-600/25 transition-all cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {stagedData.newCount > 0
                ? `Import New Data (${stagedData.newCount} rows)`
                : 'No New Data (All Duplicates)'}
            </button>
          )}
        </div>
      </div>

      {/* Preview Table */}
      {showPreview && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                Excel Preview ({visibleStagedRows.length} rows{stagedData.totalRowsFetched && stagedData.totalRowsFetched !== visibleStagedRows.length ? ` / ${stagedData.totalRowsFetched} fetched` : ''})
              </span>

              {/* Filter tabs inside preview: All, New, Update, Duplicates */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewTab('all')}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${previewTab === 'all'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  All ({stagedData.rows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('new')}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${previewTab === 'new'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                >
                  New ({stagedData.newCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('update')}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${previewTab === 'update'
                    ? 'bg-amber-600 text-white shadow-2xs font-bold'
                    : 'text-amber-700 hover:text-amber-900'
                    }`}
                >
                  Update ({stagedData.updateCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('duplicates')}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${previewTab === 'duplicates'
                    ? 'bg-rose-600 text-white shadow-2xs font-bold'
                    : 'text-rose-700 hover:text-rose-900'
                    }`}
                >
                  Duplicates ({stagedData.duplicateCount})
                </button>
              </div>
            </div>

            <span className="text-[11px] text-slate-500 font-medium">
              {stagedData.duplicateCount > 0
                ? `⚠️ ${stagedData.duplicateCount} duplicate(s) in sheet will NOT be imported.`
                : stagedData.updateCount > 0
                  ? `🔄 ${stagedData.updateCount} existing record(s) will be updated, ${stagedData.newCount} new record(s) will upload.`
                  : 'All records are new and ready to upload.'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/90 max-h-[350px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="p-2.5 text-center w-12 whitespace-nowrap">#</th>
                  <th className="p-2.5 border-l border-slate-200 whitespace-nowrap w-[210px] min-w-[180px] max-w-[220px]">Company Name</th>
                  <th className="p-2.5 border-l border-slate-200 whitespace-nowrap w-[130px] min-w-[110px] max-w-[140px]">GSTIN</th>
                  <th className="p-2.5 border-l border-slate-200 whitespace-nowrap w-[130px] min-w-[110px] max-w-[140px]">Date of Reg.</th>
                  <th className="p-2.5 border-l border-slate-200 whitespace-nowrap w-[110px] min-w-[90px] max-w-[120px]">Industry</th>
                  <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Address</th>
                  <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Rating</th>
                  <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Contact Person</th>
                  <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Designation</th>
                  <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Mobile No</th>
                  <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Email ID</th>
                  <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Remarks</th>
                  <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Date</th>
                  <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Status</th>
                  <th className="p-2.5 border-l border-slate-200 whitespace-nowrap w-[140px] min-w-[120px] max-w-[150px]">Source</th>
                  <th className="p-2.5 border-l border-slate-200 whitespace-nowrap">Imported By</th>
                  <th className="p-2.5 border-l border-slate-200 whitespace-nowrap text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleStagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="py-8 text-center text-slate-400">
                      No {previewTab} records to display in this sheet.
                    </td>
                  </tr>
                ) : (
                  visibleStagedRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`transition-colors ${row.rowType === 'duplicate'
                        ? 'bg-rose-50/40 hover:bg-rose-50/70'
                        : row.rowType === 'update'
                          ? 'bg-amber-50/20 hover:bg-amber-50/50'
                          : 'hover:bg-slate-50'
                        }`}
                    >
                      <td className="p-2.5 text-center font-semibold text-slate-500 whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 border-l border-slate-200 font-bold text-slate-900 w-[210px] min-w-[180px] max-w-[220px]">
                        <div className="w-full max-w-[210px] flex flex-col gap-1 py-0.5">
                          <div className="flex items-start gap-1.5">
                            <span className="font-semibold text-slate-900 whitespace-normal break-words leading-snug">{row.companyName || '—'}</span>
                          </div>

                          <div className="flex items-center gap-1 flex-wrap">
                            {row.rowType === 'update' && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0 shadow-2xs"
                                title={row.updateReason || 'Matches existing record'}
                              >
                                <RefreshCw className="w-3 h-3 text-amber-600" />
                                Update
                              </span>
                            )}

                            {row.isConvertedToLead && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 shadow-2xs"
                                title="Converted to Lead in CRM"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Converted to Lead
                              </span>
                            )}

                            {row.rowType === 'duplicate' && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0"
                                title={row.duplicateReason || 'Duplicate in sheet'}
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-500" />
                                Duplicate in Sheet
                              </span>
                            )}

                            {row.rowType === 'new' && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                New
                              </span>
                            )}

                            {row.contacts && row.contacts.length > 1 && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 shrink-0"
                                title={row.contacts.map((c) => `${c.contactPerson || 'Contact'} (${c.designation || '—'}) • ${c.mobileNo || 'No phone'} • ${c.emailId || 'No email'}`).join('\n')}
                              >
                                <Users className="w-3 h-3 text-violet-600" />
                                {row.contacts.length} Contacts
                              </span>
                            )}
                          </div>
                        </div>

                        {row.rowType === 'duplicate' && row.duplicateReason && (
                          <div className="text-[10px] text-rose-600 font-normal mt-0.5 break-words whitespace-normal">
                            {row.duplicateReason}
                          </div>
                        )}
                        {row.rowType === 'update' && row.updateReason && !row.isConvertedToLead && (
                          <div className="text-[10px] text-amber-600 font-normal mt-0.5 break-words whitespace-normal">
                            {row.updateReason}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 border-l border-slate-200 text-slate-700 whitespace-nowrap font-mono w-[130px] min-w-[110px] max-w-[140px]">{row.gstin || '—'}</td>
                      <td className="p-2.5 border-l border-slate-200 text-slate-700 whitespace-nowrap font-mono text-xs w-[130px] min-w-[110px] max-w-[140px]">{row.dateOfRegistration || ''}</td>
                      <td className="p-2.5 border-l border-slate-200 text-slate-700 whitespace-normal break-words w-[110px] min-w-[90px] max-w-[120px] leading-snug">{row.industry || '—'}</td>
                      <td className="p-2.5 text-slate-600 max-w-xs truncate">{row.address || '—'}</td>
                      <td className="p-2.5 text-slate-800 whitespace-nowrap">{row.rating || '—'}</td>
                      <td className="p-2.5 font-semibold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{row.contactPerson || '—'}</span>
                          {row.contacts && row.contacts.length > 1 && (
                            <span className="text-[10px] font-normal text-violet-600 bg-violet-50 px-1 rounded border border-violet-100">
                              +{row.contacts.length - 1} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 text-slate-600 whitespace-nowrap">{row.designation || '—'}</td>
                      <td className="p-2.5 text-slate-700 whitespace-nowrap font-mono">{row.mobileNo || '—'}</td>
                      <td className="p-2.5 text-slate-700 whitespace-nowrap font-mono">{row.emailId || '—'}</td>
                      <td className="p-2.5 text-slate-500 max-w-xs truncate">{row.remarks || '—'}</td>
                      <td className="p-2.5 text-slate-600 whitespace-nowrap font-medium">
                        {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-2.5 border-l border-slate-200 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeStyle(row.status || row.leadStatus || 'New')}`}>
                          {row.status || row.leadStatus || 'New'}
                        </span>
                      </td>
                      <td className="p-2.5 border-l border-slate-200 text-slate-700 font-medium w-[140px] min-w-[120px] max-w-[150px]">
                        <div className="w-full max-w-[135px]">
                          <span className="whitespace-normal break-words leading-snug block">{row.source || row.leadSource || ''}</span>
                        </div>
                      </td>
                      <td className="p-2.5 border-l border-slate-200 text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {(row.importedBy || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800 text-xs truncate max-w-[120px]" title={row.importedBy || '—'}>
                            {row.importedBy || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="p-2.5 border-l border-slate-200 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onEditRow && onEditRow(row)}
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          title="Edit all fields & Save"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end items-center gap-2 pt-2">
            {stagedData.updateCount > 0 && stagedData.newCount > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => onConfirmImport('new')}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Import New Only ({stagedData.newCount} rows)
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmImport('all')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm shadow-indigo-600/25 transition-all cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Confirm & Import All ({stagedData.newCount + stagedData.updateCount} rows)
                </button>
              </>
            ) : stagedData.updateCount > 0 ? (
              <button
                type="button"
                onClick={() => onConfirmImport('update')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-sm shadow-amber-600/25 transition-all cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Confirm & Update ({stagedData.updateCount} rows)
              </button>
            ) : (
              <button
                type="button"
                disabled={stagedData.newCount === 0}
                onClick={() => onConfirmImport('new')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm shadow-indigo-600/25 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirm & Import New Data ({stagedData.newCount} rows)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
