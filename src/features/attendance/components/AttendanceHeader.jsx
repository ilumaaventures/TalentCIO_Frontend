import React from 'react';
import { Calendar, Download } from 'lucide-react';
import Button from '@/components/ui/Button';

const AttendanceHeader = ({
    selectedUserId,
    currentUserId,
    viewUser,
    currentTime,
    canExport,
    exportFormat,
    onExportMonthlyTimesheet,
    onExportAttendance
}) => {
    const isViewingSelf = !selectedUserId || selectedUserId === currentUserId;

    return (
        <div className="flex-none px-4 pt-4 md:px-6 md:pt-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
                    <p className="text-sm text-slate-500">
                        {isViewingSelf
                            ? 'Track and manage your work hours'
                            : `Viewing ${viewUser?.firstName || ''} ${viewUser?.lastName || ''}'s attendance`}
                    </p>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="text-right hidden sm:block">
                        <div className="text-3xl font-mono font-bold text-slate-700 tracking-tight">
                            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                        </div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                    </div>

                    {/* Export Button - Permission Check */}
                    {canExport && (
                        <div className="flex items-center space-x-2">
                            {exportFormat === 'Monthly Timesheet' ? (
                                <Button
                                    onClick={onExportMonthlyTimesheet}
                                    variants="outline"
                                    className="p-2 border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300"
                                    title="Download Monthly Timesheet"
                                >
                                    <Calendar size={20} />
                                </Button>
                            ) : (
                                <Button
                                    onClick={onExportAttendance}
                                    variants="outline"
                                    className="p-2 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300"
                                    title="Download Personal Report"
                                >
                                    <Download size={20} />
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendanceHeader;

