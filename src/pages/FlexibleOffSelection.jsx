import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    ArrowLeft,
    Calendar,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    Loader2,
    Sparkles,
    Check,
    Info,
    AlertCircle,
    X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, startOfDay } from 'date-fns';

const resolveUserFlexPolicy = (emp, attendanceSettings) => {
    const flexConfig = attendanceSettings?.flexWeeklyOff || {};
    if (flexConfig.enabled === false) {
        return { enabled: false, count: 0, allowedDays: [], isCustomChoice: false, source: 'Disabled' };
    }

    const normalizeArray = (obj) => {
        if (Array.isArray(obj?.allowedDays) && obj.allowedDays.length > 0) return obj.allowedDays;
        if (obj?.allowedDay) return [obj.allowedDay];
        return ['Custom (Employee Chooses)'];
    };

    const defaultAllowedDays = normalizeArray(flexConfig);

    // 1. Per-user override
    if (emp?.flexWeeklyOffCount !== undefined && emp?.flexWeeklyOffCount !== null && emp?.flexWeeklyOffCount !== '' && Number(emp?.flexWeeklyOffCount) > 0) {
        const allowedDays = defaultAllowedDays;
        const isCustomChoice = allowedDays.includes('Custom (Employee Chooses)') || allowedDays.includes('Custom');
        return {
            enabled: true,
            count: Math.max(1, Number(emp.flexWeeklyOffCount)),
            allowedDays,
            isCustomChoice,
            source: 'Employee Override'
        };
    }

    // Extract user role names and IDs
    const userRoleNames = Array.isArray(emp?.roles)
        ? emp.roles.map((r) => (typeof r === 'string' ? r : r?.name)).filter(Boolean)
        : [];
    const userRoleIds = Array.isArray(emp?.roles)
        ? emp.roles.map((r) => (typeof r === 'string' ? r : r?._id ? String(r._id) : null)).filter(Boolean)
        : [];

    // 2. Role policy override
    const activeRolePolicies = flexConfig.rolePolicies || [];
    const matchedRolePolicy = activeRolePolicies.find(
        (rp) => userRoleNames.includes(rp.roleName) ||
            userRoleNames.includes(rp.roleId) ||
            userRoleIds.includes(rp.roleId) ||
            userRoleIds.includes(rp.roleName)
    );
    if (matchedRolePolicy) {
        if (matchedRolePolicy.enabled === false) {
            return { enabled: false, count: 0, allowedDays: [], isCustomChoice: false, source: `Disabled for Role (${matchedRolePolicy.roleName || matchedRolePolicy.roleId})` };
        }
        if (matchedRolePolicy.isCustom) {
            const allowedDays = normalizeArray(matchedRolePolicy);
            const isCustomChoice = allowedDays.includes('Custom (Employee Chooses)') || allowedDays.includes('Custom');
            return {
                enabled: true,
                count: matchedRolePolicy.allowedCount ?? flexConfig.allowedCount ?? 2,
                allowedDays,
                isCustomChoice,
                source: `Role (${matchedRolePolicy.roleName || matchedRolePolicy.roleId})`
            };
        }
    }

    // 3. Employment Type policy override
    const activeEmpTypePolicies = flexConfig.employmentTypePolicies || [];
    const cleanEmpType = (s) => String(s || '').replace(/[\s\-_]/g, '').toLowerCase();
    const userEmpTypeClean = cleanEmpType(emp?.employmentType || 'Full-Time');
    const matchedEmpTypePolicy = activeEmpTypePolicies.find(
        (ep) => cleanEmpType(ep.employmentType) === userEmpTypeClean
    );
    if (matchedEmpTypePolicy) {
        if (matchedEmpTypePolicy.enabled === false) {
            return { enabled: false, count: 0, allowedDays: [], isCustomChoice: false, source: `Disabled for Employment Type (${matchedEmpTypePolicy.employmentType})` };
        }
        if (matchedEmpTypePolicy.isCustom) {
            const allowedDays = normalizeArray(matchedEmpTypePolicy);
            const isCustomChoice = allowedDays.includes('Custom (Employee Chooses)') || allowedDays.includes('Custom');
            return {
                enabled: true,
                count: matchedEmpTypePolicy.allowedCount ?? flexConfig.allowedCount ?? 2,
                allowedDays,
                isCustomChoice,
                source: `Employment Type (${matchedEmpTypePolicy.employmentType})`
            };
        }
    }

    // 4. Company Default
    const isCustomChoice = defaultAllowedDays.includes('Custom (Employee Chooses)') || defaultAllowedDays.includes('Custom');
    return {
        enabled: true,
        count: flexConfig.allowedCount ?? 2,
        allowedDays: defaultAllowedDays,
        isCustomChoice,
        source: 'Company Default'
    };
};

const FlexibleOffSelection = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [viewUser, setViewUser] = useState(user);
    const [attendanceSettings, setAttendanceSettings] = useState(user?.company?.settings?.attendance || {});
    const [weeklyOffs, setWeeklyOffs] = useState(['Saturday', 'Sunday']);
    const [holidays, setHolidays] = useState([]);
    const [allFlexibleOffDays, setAllFlexibleOffDays] = useState([]);

    const [viewDate, setViewDate] = useState(new Date());

    useEffect(() => {
        if (user?.company?.settings?.attendance) {
            setAttendanceSettings(user.company.settings.attendance);
        }
    }, [user?.company?.settings?.attendance]);

    const loadData = useCallback(async (targetDate = new Date()) => {
        setLoading(true);
        try {
            const year = targetDate.getFullYear();
            const month = targetDate.getMonth() + 1;
            const res = await api.get('/attendance/bootstrap', {
                params: {
                    year,
                    month,
                    userId: user?._id,
                    ts: Date.now()
                },
                headers: {
                    'Cache-Control': 'no-cache',
                    Pragma: 'no-cache'
                }
            });
            if (res.data.attendanceSettings) setAttendanceSettings(res.data.attendanceSettings);
            if (res.data.weeklyOff) setWeeklyOffs(res.data.weeklyOff);
            if (res.data.holidays) setHolidays(res.data.holidays);
            if (res.data.customFlexibleOffDays) setAllFlexibleOffDays(res.data.customFlexibleOffDays);
            if (res.data.targetUser) setViewUser(res.data.targetUser);
        } catch (err) {
            console.error('Error fetching flexible off bootstrap:', err);
            toast.error('Failed to load flexible off settings');
        } finally {
            setLoading(false);
        }
    }, [user?._id]);

    useEffect(() => {
        loadData(viewDate);
    }, [loadData, viewDate]);

    const effectiveFlexPolicy = useMemo(() => {
        return resolveUserFlexPolicy(viewUser || user, attendanceSettings);
    }, [viewUser, user, attendanceSettings]);

    const monthKey = format(viewDate, 'yyyy-MM');
    const monthName = format(viewDate, 'MMMM yyyy');

    const selectedDatesForCurrentMonth = useMemo(() => {
        return allFlexibleOffDays.filter(dStr => dStr.startsWith(monthKey));
    }, [allFlexibleOffDays, monthKey]);

    const todayStart = useMemo(() => startOfDay(new Date()), []);

    // Calendar generation for viewDate
    const calendarDays = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
        const monthDates = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));

        return { blanks, monthDates };
    }, [viewDate]);

    // Quick Month Selector Shortcuts (Current Month + Next 2 Months)
    const monthOptions = useMemo(() => {
        const today = new Date();
        const opts = [];
        for (let i = 0; i < 3; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            opts.push(d);
        }
        return opts;
    }, []);

    const toggleDateSelection = (dStr, dObj) => {
        const dayStart = startOfDay(dObj);

        // Rule 1: No Past Days
        if (dayStart < todayStart) {
            toast.error('You cannot select past days as flexible off.');
            return;
        }

        const isAlreadySelected = allFlexibleOffDays.includes(dStr);

        if (isAlreadySelected) {
            // Remove date
            setAllFlexibleOffDays(prev => prev.filter(d => d !== dStr));
        } else {
            // Calculate selected count for the SPECIFIC month of dObj
            const targetMonthKey = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}`;
            const currentMonthSelectedCount = allFlexibleOffDays.filter(d => d.startsWith(targetMonthKey)).length;

            // Rule 2: Enforce Allowance Limit for that month
            if (currentMonthSelectedCount >= effectiveFlexPolicy.count) {
                toast.error(`Company allows maximum ${effectiveFlexPolicy.count} flexible off day(s) for ${format(dObj, 'MMMM yyyy')}.`);
                return;
            }

            // Rule 3: If policy specifies allowed days of week (and not Custom), restrict to those days of week
            if (!effectiveFlexPolicy.isCustomChoice && Array.isArray(effectiveFlexPolicy.allowedDays) && effectiveFlexPolicy.allowedDays.length > 0) {
                const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dObj.getDay()];
                if (!effectiveFlexPolicy.allowedDays.includes(dayName)) {
                    toast.error(`You can only pick flexible off days on: ${effectiveFlexPolicy.allowedDays.join(', ')}.`);
                    return;
                }
            }

            setAllFlexibleOffDays(prev => [...prev, dStr]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await api.put('/attendance/flexible-off', {
                flexibleOffDays: allFlexibleOffDays,
                userId: user?._id
            });
            setAllFlexibleOffDays(res.data.customFlexibleOffDays || allFlexibleOffDays);

            // Clear attendance bootstrap session cache so Attendance page fetches fresh data
            try {
                Object.keys(sessionStorage).forEach(key => {
                    if (key.startsWith('attendance_v1_')) {
                        sessionStorage.removeItem(key);
                    }
                });
            } catch (e) {
                console.error(e);
            }

            toast.success('Flexible off days saved successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save flexible off days');
        } finally {
            setSaving(false);
        }
    };

    const prevMonth = () => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    if (loading) {
        return (
            <div className="flex h-96 w-full items-center justify-center">
                <Loader2 className="animate-spin text-violet-600" size={32} />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 animate-in fade-in">
            {/* Header Navigation */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/attendance')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition active:scale-95"
                    >
                        <ArrowLeft size={16} />
                        Back to Attendance
                    </button>
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                            <Sparkles className="text-violet-600" size={22} />
                            Choose Flexible Off Days
                        </h1>
                        <p className="text-xs text-slate-500">
                            Select your flexible off days for current or upcoming months.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-200 hover:bg-violet-700 transition active:scale-95 disabled:opacity-50"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Save Flexible Off Days
                </button>
            </div>

            {!effectiveFlexPolicy.enabled ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
                    <AlertCircle size={32} className="mx-auto mb-2 text-amber-600" />
                    <h3 className="font-bold text-base">Flexible Off Not Enabled</h3>
                    <p className="text-xs mt-1 text-amber-700">
                        Flexible Off is currently not enabled by your company admin.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left Panel: Policy Info & Month Selector */}
                    <div className="space-y-6 lg:col-span-1">
                        {/* Allowance Card */}
                        <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-purple-50/50 p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-violet-700 flex items-center gap-1.5">
                                    <Sparkles size={14} /> Allowance Info
                                </span>
                                <span className="rounded-full bg-violet-600 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                                    {effectiveFlexPolicy.count} Days / Month
                                </span>
                            </div>

                            <div className="space-y-2 border-t border-violet-200/60 pt-3">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-600 font-medium">Month:</span>
                                    <span className="font-bold text-slate-800">{monthName}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-600 font-medium">Selected:</span>
                                    <span className="font-bold text-violet-700">
                                        {selectedDatesForCurrentMonth.length} / {effectiveFlexPolicy.count} Days
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-600 font-medium">Applied Policy:</span>
                                    <span className="font-semibold text-slate-700">{effectiveFlexPolicy.source}</span>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white/80 p-3 border border-violet-100 text-[11px] text-slate-600 space-y-1">
                                <div className="font-bold text-violet-800 flex items-center gap-1">
                                    <Info size={12} /> Rules & Guidelines:
                                </div>
                                <ul className="list-disc list-inside space-y-1 text-slate-500 pl-1">
                                    <li>Past dates cannot be selected.</li>
                                    <li>Max {effectiveFlexPolicy.count} days allowed per month.</li>
                                    <li>Changes reflect on your Attendance Calendar once saved.</li>
                                </ul>
                            </div>
                        </div>

                        {/* Month Shortcuts */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Quick Month Selector
                            </h3>
                            <div className="space-y-2">
                                {monthOptions.map((mDate) => {
                                    const isCurrentView = mDate.getFullYear() === viewDate.getFullYear() && mDate.getMonth() === viewDate.getMonth();
                                    const mKey = format(mDate, 'yyyy-MM');
                                    const countForM = allFlexibleOffDays.filter(d => d.startsWith(mKey)).length;

                                    return (
                                        <button
                                            key={mKey}
                                            type="button"
                                            onClick={() => setViewDate(mDate)}
                                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${isCurrentView
                                                ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                                                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Calendar size={14} />
                                                {format(mDate, 'MMMM yyyy')}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isCurrentView ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-800'}`}>
                                                {countForM} / {effectiveFlexPolicy.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Selected Dates Summary for Month */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Chosen Days for {format(viewDate, 'MMM yyyy')}
                            </h3>

                            {selectedDatesForCurrentMonth.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-2 text-center">
                                    No flexible off days selected for this month yet.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {selectedDatesForCurrentMonth.sort().map((dStr) => (
                                        <div
                                            key={dStr}
                                            className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50/60 px-3 py-2 text-xs font-bold text-violet-800"
                                        >
                                            <span className="flex items-center gap-2">
                                                <CheckCircle size={14} className="text-violet-600" />
                                                {format(new Date(dStr + 'T00:00:00'), 'EEEE, MMM dd, yyyy')}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setAllFlexibleOffDays(prev => prev.filter(d => d !== dStr))}
                                                className="text-slate-400 hover:text-red-500 transition"
                                                title="Remove"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Interactive Month Calendar */}
                    <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                        {/* Month Nav Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4">
                            <h2 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                                <Calendar size={18} className="text-violet-600" />
                                {monthName}
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={prevMonth}
                                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition"
                                    title="Previous Month"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={nextMonth}
                                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition"
                                    title="Next Month"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="p-6">
                            {!effectiveFlexPolicy.isCustomChoice && Array.isArray(effectiveFlexPolicy.allowedDays) && effectiveFlexPolicy.allowedDays.length > 0 && (
                                <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-xs text-blue-900">
                                    <Info size={16} className="text-blue-600 shrink-0" />
                                    <span>
                                        Flexible Off day choices are restricted to: <strong className="font-bold text-blue-950">{effectiveFlexPolicy.allowedDays.join(', ')}</strong> ({effectiveFlexPolicy.source}).
                                    </span>
                                </div>
                            )}

                            {/* Days of week header */}
                            <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                                <div className="text-red-400">Sun</div>
                                <div>Mon</div>
                                <div>Tue</div>
                                <div>Wed</div>
                                <div>Thu</div>
                                <div>Fri</div>
                                <div className="text-violet-500">Sat</div>
                            </div>

                            {/* Calendar Days */}
                            <div className="grid grid-cols-7 gap-2">
                                {calendarDays.blanks.map((b) => (
                                    <div key={`blank-${b}`} className="h-16 rounded-xl border border-transparent bg-slate-50/20"></div>
                                ))}

                                {calendarDays.monthDates.map((dObj) => {
                                    const dayNum = dObj.getDate();
                                    const dStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                                    const dayStart = startOfDay(dObj);
                                    const isPast = dayStart < todayStart;
                                    const isToday = dayStart.getTime() === todayStart.getTime();

                                    const isSelected = allFlexibleOffDays.includes(dStr);

                                    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dObj.getDay()];
                                    const isWeeklyOff = weeklyOffs.includes(dayName);
                                    const isHoliday = holidays.some(h => new Date(h.date).toDateString() === dObj.toDateString());

                                    const isAllowedWeekday = effectiveFlexPolicy.isCustomChoice || (Array.isArray(effectiveFlexPolicy.allowedDays) && effectiveFlexPolicy.allowedDays.includes(dayName));
                                    const isRestrictedDay = !isAllowedWeekday && !isSelected;

                                    return (
                                        <button
                                            key={dStr}
                                            type="button"
                                            disabled={isPast || isRestrictedDay}
                                            onClick={() => toggleDateSelection(dStr, dObj)}
                                            className={`h-16 rounded-xl p-2 flex flex-col justify-between transition-all relative border ${isSelected
                                                ? 'bg-violet-600 text-white border-violet-600 shadow-md ring-2 ring-violet-300 scale-[1.02] z-10'
                                                : isPast || isRestrictedDay
                                                    ? 'bg-slate-100/60 border-slate-100 text-slate-300 cursor-not-allowed opacity-60'
                                                    : isToday
                                                        ? 'bg-blue-50/60 border-blue-300 text-blue-800 hover:border-blue-400'
                                                        : isWeeklyOff
                                                            ? 'bg-slate-50 border-slate-200 text-slate-500 hover:border-violet-300'
                                                            : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-violet-50/40'}`}
                                            title={isPast ? 'Past days cannot be selected' : isRestrictedDay ? `Flexible off choice is restricted to ${effectiveFlexPolicy.allowedDays.join(', ')}` : isSelected ? 'Selected as Flexible Off' : 'Click to select as Flexible Off'}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className={`text-xs font-bold ${isSelected ? 'text-white' : isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                                                    {dayNum}
                                                </span>
                                                {isSelected && <CheckCircle size={14} className="text-white shrink-0" />}
                                            </div>

                                            <div className="w-full text-left truncate">
                                                {isSelected ? (
                                                    <span className="text-[10px] font-extrabold uppercase bg-white/20 text-white px-1.5 py-0.5 rounded">
                                                        FLEX OFF
                                                    </span>
                                                ) : isHoliday ? (
                                                    <span className="text-[9px] font-semibold text-emerald-600 truncate">
                                                        Holiday
                                                    </span>
                                                ) : isWeeklyOff ? (
                                                    <span className="text-[9px] font-semibold text-slate-400">
                                                        Off
                                                    </span>
                                                ) : isPast ? (
                                                    <span className="text-[9px] text-slate-300">
                                                        Past
                                                    </span>
                                                ) : null}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlexibleOffSelection;
