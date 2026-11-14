import React from 'react';
import { Sparkles, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const AttendanceFlexibleOffCard = ({
    effectiveFlexPolicy,
    customFlexibleOffDays = [],
    calendarDate = new Date()
}) => {
    const navigate = useNavigate();

    if (!effectiveFlexPolicy?.enabled) return null;

    const currentMonthKey = format(calendarDate, 'yyyy-MM');
    const selectedCount = customFlexibleOffDays.filter(
        d => typeof d === 'string' && d.startsWith(currentMonthKey)
    ).length;

    return (
        <div className="zoho-card p-5 mt-6 border-l-4 border-l-violet-500 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-violet-600 animate-pulse" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Flexible Off Days
                    </h4>
                </div>
                <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200">
                    {effectiveFlexPolicy.count} Days / Mo
                </span>
            </div>

            {effectiveFlexPolicy.isCustomChoice ? (
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Monthly Selection:</span>
                        <span className="font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-100">
                            {selectedCount} / {effectiveFlexPolicy.count} Selected
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate('/attendance/flexible-off')}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-200 hover:from-violet-700 hover:to-purple-700 active:scale-95 transition-all tracking-wide"
                    >
                        <Calendar size={15} />
                        <span>Choose Flexible Off</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-1.5 text-xs">
                    <div className="text-slate-600 font-medium">
                        Company Fixed Days: <strong className="text-violet-700">{effectiveFlexPolicy.allowedDays?.join(', ')}</strong>
                    </div>
                    <div className="text-[11px] text-slate-400">
                        Applied Rule: {effectiveFlexPolicy.source}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceFlexibleOffCard;

