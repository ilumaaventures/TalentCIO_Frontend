import React from 'react';
import { Download, X, Clock, Users, FileSpreadsheet, Calendar } from 'lucide-react';
import { ALL_HRIS_SECTIONS } from '../utils/userExportUtils';
import MonthPicker from '@/components/ui/MonthPicker';
import { format } from 'date-fns';

const UserExportModal = ({
    showExportModal,
    setShowExportModal,
    exportMonth,
    setExportMonth,
    exportOptions,
    setExportOptions,
    exportScope = 'selected',
    setExportScope = () => { },
    totalUsersCount = 0,
    hrisSections,
    setHrisSections,
    hasSelection,
    selectedEmployeeIds,
    hasAttendanceDocumentFeature,
    canExportHRIS,
    handleExportDownload,
}) => {
    if (!showExportModal) return null;

    const isScopeAll = exportScope === 'all';
    const effectiveHasSelection = isScopeAll || hasSelection;

    const hasAttendanceSelection = exportOptions.status
        || exportOptions.checkInOut
        || exportOptions.duration
        || exportOptions.leaves;

    const hasAnyOptionSelected = Boolean(
        exportOptions.performanceReport
        || exportOptions.timesheetBulk
        || hasAttendanceSelection
        || exportOptions.documents
        || exportOptions.hrisProfiles
        || exportOptions.userDocuments
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowExportModal(false); }}
        >
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <Download size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Custom Export</h2>
                            <p className="text-xs text-slate-500">
                                {isScopeAll
                                    ? `Exporting for all ${totalUsersCount || 'team'} members`
                                    : (hasSelection
                                        ? `Exporting for ${selectedEmployeeIds.length} selected employee${selectedEmployeeIds.length !== 1 ? 's' : ''}`
                                        : 'Choose export target and options below')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowExportModal(false)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                    {/* Scope & Period Section */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">1. Export Target (Scope)</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setExportScope('selected')}
                                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all ${exportScope === 'selected'
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <Users size={16} className={exportScope === 'selected' ? 'text-emerald-600' : 'text-slate-400'} />
                                    <div>
                                        <div className="text-xs font-bold">Selected Employees</div>
                                        <div className="text-[11px] text-slate-400">
                                            {selectedEmployeeIds.length} employee{selectedEmployeeIds.length !== 1 ? 's' : ''} checked in table
                                        </div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setExportScope('all')}
                                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all ${exportScope === 'all'
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <Users size={16} className={exportScope === 'all' ? 'text-emerald-600' : 'text-slate-400'} />
                                    <div>
                                        <div className="text-xs font-bold">All Team Members</div>
                                        <div className="text-[11px] text-slate-400">
                                            Entire team ({totalUsersCount || 'All'} employees)
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Export Period */}
                        <div className="pt-2 border-t border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">2. Export Period</p>
                                <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-semibold">
                                    <button
                                        type="button"
                                        onClick={() => setExportMonth(format(new Date(), 'yyyy-MM'))}
                                        className={`px-2.5 py-1 rounded-md transition ${exportMonth !== 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setExportMonth('all')}
                                        className={`px-2.5 py-1 rounded-md transition ${exportMonth === 'all' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                                    >
                                        All Time
                                    </button>
                                </div>
                            </div>
                            {exportMonth === 'all' ? (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
                                    <span>Exporting <strong>All Time (Lifetime)</strong> timesheet records for selected users.</span>
                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded">All History</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Select Month</label>
                                        <MonthPicker
                                            value={exportMonth}
                                            onChange={setExportMonth}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 pt-5">Used for Attendance &amp; Timesheet data</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Attendance Columns & Format */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-blue-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">A</div>
                                <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Attendance Report</span>
                            </div>
                            <span className="text-[10px] text-blue-700 font-medium">Date format: <span className="font-bold">DD-MM-YYYY</span></span>
                        </div>

                        {/* Column Checkboxes */}
                        <div className="p-4">
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Attendance Fields to Include:</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { key: 'status', label: 'Status (Present / Absent)', desc: 'Present, Half Day, Absent, Week Offs & Holidays' },
                                    { key: 'checkInOut', label: 'Check-In & Check-Out', desc: 'Clock-in and clock-out timestamps' },
                                    { key: 'duration', label: 'Total Duration', desc: 'Total working hours logged' },
                                    { key: 'leaves', label: 'Leaves (SL, CL, EL)', desc: 'Approved leaves with leave type' },
                                ].map(({ key, label, desc }) => (
                                    <label key={key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${exportOptions[key] ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                        <input
                                            type="checkbox"
                                            checked={exportOptions[key]}
                                            onChange={e => setExportOptions({ ...exportOptions, [key]: e.target.checked })}
                                            className="h-4 w-4 mt-0.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 shrink-0"
                                        />
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-slate-700 leading-tight">{label}</div>
                                            <div className="text-[11px] text-slate-400 leading-snug mt-0.5">{desc}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Attendance Documents */}
                    {hasAttendanceDocumentFeature && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-amber-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
                                <div className="h-5 w-5 rounded bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-bold">D</div>
                                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Attendance Documents</span>
                            </div>
                            <div className="p-4">
                                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${exportOptions.documents ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                    <input type="checkbox" checked={exportOptions.documents} onChange={e => setExportOptions({ ...exportOptions, documents: e.target.checked })} className="h-4 w-4 mt-0.5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 shrink-0" />
                                    <div>
                                        <div className="text-sm font-semibold text-slate-700">Uploaded Support Documents</div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">Download attendance attachment ZIP for the selected period</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* HRIS Profiles with sub-section picker */}
                    {canExportHRIS && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-purple-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-5 rounded bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-bold">H</div>
                                    <span className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Profiles &amp; HRIS</span>
                                </div>
                                {exportOptions.hrisProfiles && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setHrisSections(new Set(ALL_HRIS_SECTIONS))}
                                            className="text-[10px] font-medium text-purple-600 hover:text-purple-800 underline"
                                        >Select All</button>
                                        <span className="text-purple-300 text-xs">|</span>
                                        <button
                                            type="button"
                                            onClick={() => setHrisSections(new Set())}
                                            className="text-[10px] font-medium text-purple-600 hover:text-purple-800 underline"
                                        >Clear</button>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 space-y-3">
                                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${exportOptions.hrisProfiles ? 'border-purple-300 bg-purple-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                    <input type="checkbox" checked={exportOptions.hrisProfiles} onChange={e => setExportOptions({ ...exportOptions, hrisProfiles: e.target.checked })} className="h-4 w-4 mt-0.5 text-purple-600 rounded border-slate-300 focus:ring-purple-500 shrink-0" />
                                    <div>
                                        <div className="text-sm font-semibold text-slate-700">Candidate / HRIS Profiles</div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">Full HR profile export — choose which sections to include below</div>
                                    </div>
                                </label>

                                {exportOptions.hrisProfiles && (
                                    <div className="mt-2 pt-3 border-t border-purple-100">
                                        <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider mb-2">Select sections to include in export:</p>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {[
                                                { key: 'General', label: 'General Info', desc: 'Roles, work location' },
                                                { key: 'Personal', label: 'Personal Details', desc: 'Name, DOB, gender, blood group, marital status' },
                                                { key: 'Identity', label: 'Identity Details', desc: 'Aadhaar, PAN, Passport' },
                                                { key: 'Contact', label: 'Contact Details', desc: 'Phones, emails, addresses, emergency contact' },
                                                { key: 'Family', label: 'Family Details', desc: 'Father, mother, spouse, children' },
                                                { key: 'Employment', label: 'Employment Details', desc: 'Designation, department, manager, joining date' },
                                                { key: 'Bank', label: 'Bank Details', desc: 'Account, IFSC, UAN number' },
                                                { key: 'Education', label: 'Education', desc: 'Qualifications, degrees, institutions' },
                                                { key: 'Experience', label: 'Work Experience', desc: 'Past employers, designations, tenure' },
                                                { key: 'Skills', label: 'Skills', desc: 'Technical, behavioral, learning interests' },
                                                { key: 'Documents', label: 'Document Checklist', desc: 'ID proof, education docs, offer letters etc.' },
                                            ].map(({ key, label, desc }) => {
                                                const checked = hrisSections.has(key);
                                                return (
                                                    <label key={key} className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${checked ? 'border-purple-300 bg-purple-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => {
                                                                setHrisSections(prev => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(key)) next.delete(key);
                                                                    else next.add(key);
                                                                    return next;
                                                                });
                                                            }}
                                                            className="h-3.5 w-3.5 mt-0.5 text-purple-600 rounded border-slate-300 focus:ring-purple-500 shrink-0"
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-semibold text-slate-700 leading-tight">{label}</div>
                                                            <div className="text-[10px] text-slate-400 leading-snug mt-0.5 truncate">{desc}</div>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        {hrisSections.size === 0 && (
                                            <p className="mt-2 text-[11px] text-amber-600 font-medium">⚠ Select at least one section to export</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Employee Documents ZIP */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-rose-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
                            <div className="h-5 w-5 rounded bg-rose-100 text-rose-600 flex items-center justify-center text-[10px] font-bold">E</div>
                            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wide">Employee Documents</span>
                        </div>
                        <div className="p-4">
                            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${exportOptions.userDocuments ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                <input type="checkbox" checked={exportOptions.userDocuments} onChange={e => setExportOptions({ ...exportOptions, userDocuments: e.target.checked })} className="h-4 w-4 mt-0.5 text-rose-600 rounded border-slate-300 focus:ring-rose-500 shrink-0" />
                                <div>
                                    <div className="text-sm font-semibold text-slate-700">Download Employee Documents ZIP</div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">All uploaded employee documents packed into a ZIP file</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Performance Management Report & Timesheet Export Card */}
                    <div className="border border-indigo-200 rounded-xl overflow-hidden bg-indigo-50/20">
                        <div className="bg-indigo-50 px-4 py-2.5 flex items-center justify-between border-b border-indigo-100">
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">P</div>
                                <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wide">Performance Management Report</span>
                            </div>
                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Excel (.xlsx)</span>
                        </div>
                        <div className="p-4 space-y-3">
                            <label className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${(exportOptions.performanceReport || exportOptions.timesheetBulk) ? 'border-indigo-400 bg-indigo-50/70 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                <input
                                    type="checkbox"
                                    checked={exportOptions.performanceReport || exportOptions.timesheetBulk}
                                    onChange={e => setExportOptions({ ...exportOptions, performanceReport: e.target.checked, timesheetBulk: e.target.checked })}
                                    className="h-4 w-4 mt-0.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Clock size={15} className="text-indigo-600" />
                                        <span className="text-sm font-bold text-slate-800">Download Performance Management Report</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        First sheet contains a full summary of each employee with total projects allotted, project names, and hours spent per project.
                                    </p>
                                </div>
                            </label>

                            {(exportOptions.performanceReport || exportOptions.timesheetBulk) && (
                                <div className="ml-2 pl-4 border-l-2 border-indigo-200 space-y-3 pt-1">
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={exportOptions.alsoDownloadTimesheet || false}
                                            onChange={e => setExportOptions({ ...exportOptions, alsoDownloadTimesheet: e.target.checked })}
                                            className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                        />
                                        <span className="text-xs font-bold text-indigo-950">Also download timesheet</span>
                                    </label>

                                    {exportOptions.alsoDownloadTimesheet && (
                                        <div className="p-3 bg-white border border-indigo-100 rounded-lg shadow-xs space-y-2">
                                            <p className="text-[11px] font-semibold text-slate-700">Select Timesheet Date Range:</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-medium text-slate-500 mb-1">From Date</label>
                                                    <input
                                                        type="date"
                                                        value={exportOptions.timesheetFromDate || ''}
                                                        onChange={e => setExportOptions({ ...exportOptions, timesheetFromDate: e.target.value })}
                                                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-medium text-slate-500 mb-1">To Date</label>
                                                    <input
                                                        type="date"
                                                        value={exportOptions.timesheetToDate || ''}
                                                        onChange={e => setExportOptions({ ...exportOptions, timesheetToDate: e.target.value })}
                                                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-1">
                                                Complete timesheet data for the selected period will be included in the same file with a separate sheet for each employee.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* No-selection warning */}
                    {!effectiveHasSelection && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                            <span>⚠</span> No employees selected. Check employee rows in the table or switch target to <strong>"All Team Members"</strong> above.
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-400 truncate">
                        {(() => {
                            const parts = [
                                (exportOptions.performanceReport || exportOptions.timesheetBulk) && (exportOptions.alsoDownloadTimesheet ? 'Performance & Timesheets (Excel)' : 'Performance Summary (Excel)'),
                                hasAttendanceSelection && 'Attendance (Single Excel)',
                                exportOptions.documents && 'Att.Docs ZIP',
                                exportOptions.hrisProfiles && `HRIS (${hrisSections.size} sections)`,
                                exportOptions.userDocuments && 'Emp.Docs ZIP',
                            ].filter(Boolean);
                            return parts.length === 0 ? 'No options selected' : `${parts.join(', ')} will be exported`;
                        })()}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                        <button
                            onClick={handleExportDownload}
                            disabled={!effectiveHasSelection || !hasAnyOptionSelected || (exportOptions.hrisProfiles && hrisSections.size === 0)}
                            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow transition-all"
                        >
                            <Download size={14} /> Download Export
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserExportModal;

