import React from 'react';
import { CheckSquare, Briefcase } from 'lucide-react';

const AttendanceRecentActivity = ({
    hasProjectsModule,
    recentLogs = [],
    isAttendanceActive,
    isPresentOnlyMode
}) => {
    if (!hasProjectsModule) return null;

    return (
        <>
            <div className="zoho-card p-5 mt-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Recent Activity</h4>
                {recentLogs.length > 0 ? (
                    <div className="space-y-4">
                        {recentLogs.map(log => (
                            <div key={log._id} className="flex gap-3 text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                                <div className="mt-1">
                                    <CheckSquare size={14} className="text-blue-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-slate-700">
                                        {log.task?.name || 'Unknown Task'}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {log.hours} hrs • {new Date(log.date).toLocaleDateString()}
                                    </div>
                                    {log.description && (
                                        <div className="text-xs text-slate-400 mt-1 italic">
                                            "{log.description}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div className="pt-2 text-center">
                            <a href="/timesheet" className="text-xs text-blue-600 hover:underline">View All in Timesheet</a>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-xs text-slate-400 py-2">
                        No work logged recently.
                    </div>
                )}
            </div>

            {!isAttendanceActive && (
                <div className="zoho-card p-5 opacity-75 mt-6">
                    <div className="text-center space-y-2">
                        <Briefcase size={32} className="mx-auto text-slate-300" />
                        <h4 className="font-medium text-slate-600">Your Tasks</h4>
                        <p className="text-xs text-slate-400">
                            {isPresentOnlyMode
                                ? 'Mark present to view and manage your assigned tasks.'
                                : 'Clock in to view and manage your assigned tasks.'}
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};

export default AttendanceRecentActivity;

