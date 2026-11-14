import React from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { formatTime, calculateDuration } from '../utils/attendanceFormatters';

const AttendanceClockWidget = ({
    status,
    isAttendanceActive,
    isClockedIn,
    isClockedOut,
    isMarkedPresent,
    isPresentOnlyMode,
    isViewingOwnAttendance,
    attendanceStatusColorClass,
    attendanceStatusLabel,
    attendanceStartLabel,
    loadingLocation,
    handleClockIn,
    handleClockOut,
    activeShiftName,
    activeShiftWindow,
    currentTime
}) => {
    return (
        <div className="zoho-card p-6 flex flex-col items-center justify-center text-center border-t-4 border-t-blue-500">
            <div className="mb-6 relative group">
                <div className={`h-36 w-36 rounded-full flex items-center justify-center border-[6px] transition-all duration-500 ${isAttendanceActive ? 'border-[#08B87B] bg-[#EAF7F2] shadow-sm' : 'border-slate-200 bg-white shadow-sm'}`}>
                    <Clock size={48} className={isAttendanceActive ? 'text-[#08B87B]' : 'text-slate-400'} />
                </div>
                {isAttendanceActive && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-[#08B87B] text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                        ACTIVE
                    </div>
                )}
            </div>

            <div className="space-y-1 mb-6">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Status</div>
                <div className={`text-xl font-bold ${attendanceStatusColorClass}`}>
                    {attendanceStatusLabel}
                </div>
            </div>

            <div className="w-full space-y-3">
                {isViewingOwnAttendance && !isAttendanceActive && !isClockedOut && (
                    <button
                        onClick={handleClockIn}
                        disabled={loadingLocation}
                        className={`w-full flex items-center justify-center gap-2 py-3 bg-[#1B5FF3] text-white font-bold rounded-[10px] shadow-[0_4px_16px_rgba(27,95,243,0.35)] hover:bg-blue-700 active:scale-95 transition-all text-[15px] tracking-wide ${loadingLocation ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loadingLocation ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                <span>Loading...</span>
                            </>
                        ) : (
                            <span>{attendanceStartLabel}</span>
                        )}
                    </button>
                )}

                {isClockedIn && (
                    <button
                        onClick={handleClockOut}
                        disabled={loadingLocation}
                        className={`w-full flex items-center justify-center gap-2 py-3 bg-[#e60000] text-white font-bold rounded-[10px] shadow-[0_4px_16px_rgba(230,0,0,0.35)] hover:bg-[#cc0000] active:scale-95 transition-all text-[15px] tracking-wide ${loadingLocation ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loadingLocation ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                <span>Fetching Location...</span>
                            </>
                        ) : (
                            <span>Check Out</span>
                        )}
                    </button>
                )}

                {isPresentOnlyMode && isMarkedPresent && (
                    <div className="w-full py-2.5 bg-emerald-50 text-emerald-700 rounded font-medium border border-emerald-200 text-sm text-center">
                        Present marked for today
                    </div>
                )}

                {isClockedOut && (
                    <div className="w-full py-2.5 bg-slate-100 text-slate-500 rounded font-medium border border-slate-200 text-sm text-center">
                        Output Logged
                    </div>
                )}

                {!isViewingOwnAttendance && (
                    <div className="w-full py-2.5 bg-slate-100 text-slate-500 rounded font-medium border border-slate-200 text-sm text-center">
                        Actions are available only for your own attendance
                    </div>
                )}
            </div>

            <div className="mt-6 w-full bg-slate-50 rounded border border-slate-100 divide-y divide-slate-100">
                <div className="flex justify-between p-3 text-sm flex-col sm:flex-row gap-1 sm:gap-0">
                    <span className="text-slate-500">Mode</span>
                    <span className="font-medium text-slate-700 sm:text-right">
                        {isPresentOnlyMode ? 'Present Only' : 'Clock In / Out'}
                    </span>
                </div>
                <div className="flex justify-between p-3 text-sm flex-col sm:flex-row gap-1 sm:gap-0">
                    <span className="text-slate-500">Shift</span>
                    <span className="font-medium text-slate-700 sm:text-right">
                        {activeShiftName}
                    </span>
                </div>
                <div className="flex justify-between p-3 text-sm flex-col sm:flex-row gap-1 sm:gap-0">
                    <span className="text-slate-500">Window</span>
                    <span className="font-medium text-slate-700 sm:text-right">
                        {activeShiftWindow}
                    </span>
                </div>
                <div className="flex justify-between p-3 text-sm flex-col sm:flex-row gap-1 sm:gap-0">
                    <span className="text-slate-500">In Time</span>
                    <span className="font-mono font-medium text-slate-700 sm:text-right">
                        {formatTime(status?.clockIn, status?.clockInIST)}
                    </span>
                </div>
                <div className="flex justify-between p-3 text-sm flex-col sm:flex-row gap-1 sm:gap-0">
                    <span className="text-slate-500">Out Time</span>
                    <span className="font-mono font-medium text-slate-700 sm:text-right">
                        {formatTime(status?.clockOut, status?.clockOutIST)}
                    </span>
                </div>
                <div className="flex justify-between p-3 text-sm bg-slate-100/30 flex-col sm:flex-row gap-1 sm:gap-0 rounded-b">
                    <span className="font-bold text-slate-700">Total Hours</span>
                    <span className="font-mono font-bold text-[#1B5FF3] sm:text-right">
                        {status?.clockIn ? calculateDuration(status.clockIn, status.clockOut, null, currentTime) : '--'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AttendanceClockWidget;

