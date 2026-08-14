import React from 'react';
import { Download, X } from 'lucide-react';
import { ALL_HRIS_SECTIONS } from '../utils/userExportUtils';

const UserExportModal = ({
    showExportModal,
    setShowExportModal,
    exportMonth,
    setExportMonth,
    exportOptions,
    setExportOptions,
    hrisSections,
    setHrisSections,
    hasSelection,
    selectedEmployeeIds,
    hasAttendanceDocumentFeature,
    canExportHRIS,
    handleExportDownload,
}) => {
    if (!showExportModal) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowExportModal(false); }}
        >
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <Download size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Custom Export</h2>
                            <p className="text-xs text-slate-500">
                                {hasSelection
                                    ? `Exporting data for ${selectedEmployeeIds.length} selected employee${selectedEmployeeIds.length !== 1 ? 's' : ''}`
                                    : 'Select employees in the table first, then choose what to export'}
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

                    {/* Export Period */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Export Period</p>
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Select Month</label>
                                <input
                                    type="month"
                                    value={exportMonth}
                                    onChange={(e) => setExportMonth(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                                />
                            </div>
                            <p className="text-xs text-slate-400 pt-5">Used for Attendance &amp; Timesheet data</p>
                        </div>
                    </div>

                    {/* Attendance Columns */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-blue-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
                            <div className="h-5 w-5 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">A</div>
                            <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Attendance Columns</span>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-2">
                            {[
                                { key: 'status', label: 'Status (Present / Absent)', desc: 'Daily attendance status' },
                                { key: 'checkInOut', label: 'Check-In & Check-Out', desc: 'Clock-in and clock-out times' },
                                { key: 'duration', label: 'Total Duration', desc: 'Total working hours logged' },
                                { key: 'leaves', label: 'Leaves (SL, CL)', desc: 'Sick and casual leave counts' },
                            ].map(({ key, label, desc }) => (
                                <label key={key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${exportOptions[key] ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                    <input type="checkbox" checked={exportOptions[key]} onChange={e => setExportOptions({ ...exportOptions, [key]: e.target.checked })} className="h-4 w-4 mt-0.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-slate-700 leading-tight">{label}</div>
                                        <div className="text-[11px] text-slate-400 leading-snug mt-0.5">{desc}</div>
                                    </div>
                                </label>
                            ))}
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

                    {/* No-selection warning */}
                    {!hasSelection && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                            <span>⚠</span> No employees selected — go back and check at least one employee row before exporting.
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-400 truncate">
                        {(() => {
                            const parts = [
                                exportOptions.status && 'Status',
                                exportOptions.checkInOut && 'Check-In/Out',
                                exportOptions.duration && 'Duration',
                                exportOptions.leaves && 'Leaves',
                                exportOptions.documents && 'Att.Docs',
                                exportOptions.hrisProfiles && `HRIS (${hrisSections.size} section${hrisSections.size !== 1 ? 's' : ''})`,
                                exportOptions.userDocuments && 'Emp.Docs',
                            ].filter(Boolean);
                            return parts.length === 0 ? 'No sections selected' : `${parts.join(', ')} will be exported`;
                        })()}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                        <button
                            onClick={handleExportDownload}
                            disabled={!hasSelection || (exportOptions.hrisProfiles && hrisSections.size === 0)}
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
