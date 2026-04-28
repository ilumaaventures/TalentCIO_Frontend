import React, { useEffect, useState } from 'react';
import { Clock, Loader2, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const DEFAULT_ATTENDANCE_SHIFTS = [
    { code: 'general', name: 'General', shiftType: 'general', startTime: '09:00', endTime: '18:00', maxWorkingHours: 9 },
    { code: 'any', name: 'Any Time', shiftType: 'any', startTime: '00:00', endTime: '23:59', maxWorkingHours: 8 }
];

const DEFAULT_ATTENDANCE_SETTINGS = {
    weeklyOff: ['Saturday', 'Sunday'],
    workingHours: 8,
    defaultShiftCode: 'general',
    defaultAttendanceMode: 'clock_in_out',
    attendanceShifts: DEFAULT_ATTENDANCE_SHIFTS,
    exportFormat: 'Standard',
    halfDayAllowed: true,
    requireLocationCheckIn: false,
    requireLocationCheckOut: false,
    locationCheck: false,
    ipCheck: false,
    allowedRadius: 200,
    coordinates: { lat: '', lng: '' },
    allowedIps: []
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AttendanceSettings = () => {
    const { user, refreshProfile } = useAuth();
    const [attendance, setAttendance] = useState(DEFAULT_ATTENDANCE_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const bootstrapAttendance = user?.company?.settings?.attendance;
        if (bootstrapAttendance) {
            setAttendance((prev) => ({
                ...prev,
                ...bootstrapAttendance,
                attendanceShifts: Array.isArray(bootstrapAttendance.attendanceShifts) && bootstrapAttendance.attendanceShifts.length > 0
                    ? bootstrapAttendance.attendanceShifts
                    : prev.attendanceShifts,
                coordinates: {
                    lat: bootstrapAttendance.coordinates?.lat ?? '',
                    lng: bootstrapAttendance.coordinates?.lng ?? ''
                }
            }));
        }
    }, [user?.company?.settings?.attendance]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await api.get('/admin/company-settings/attendance');
                const attendanceSettings = data?.attendance || {};
                setAttendance((prev) => ({
                    ...prev,
                    ...attendanceSettings,
                    attendanceShifts: Array.isArray(attendanceSettings.attendanceShifts) && attendanceSettings.attendanceShifts.length > 0
                        ? attendanceSettings.attendanceShifts
                        : prev.attendanceShifts,
                    coordinates: {
                        lat: attendanceSettings.coordinates?.lat ?? '',
                        lng: attendanceSettings.coordinates?.lng ?? ''
                    }
                }));
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to load attendance settings');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const attendanceShifts = attendance.attendanceShifts || DEFAULT_ATTENDANCE_SHIFTS;
    const selfService = attendance.selfService || {};
    const canEditWeeklyOff = selfService.weeklyOff !== false;
    const canEditWorkingHours = selfService.workingHours !== false;
    const canEditAttendanceMode = selfService.defaultAttendanceMode !== false;
    const canEditShifts = selfService.attendanceShifts !== false;
    const canEditExportFormat = selfService.exportFormat !== false;
    const canEditLocationRules = selfService.locationRules !== false;
    const canEditIpRules = selfService.ipRules !== false;
    const canSave = [
        canEditWeeklyOff,
        canEditWorkingHours,
        canEditAttendanceMode,
        canEditShifts,
        canEditExportFormat,
        canEditLocationRules,
        canEditIpRules
    ].some(Boolean);

    const updateAttendance = (patch) => {
        setAttendance((prev) => ({ ...prev, ...patch }));
    };

    const updateShift = (index, field, value) => {
        const next = attendanceShifts.map((shift, shiftIndex) => (
            shiftIndex === index
                ? { ...shift, [field]: value }
                : shift
        ));
        updateAttendance({ attendanceShifts: next });
    };

    const addShift = () => {
        updateAttendance({
            attendanceShifts: [
                ...attendanceShifts,
                {
                    code: `shift-${attendanceShifts.length + 1}`,
                    name: `Shift ${attendanceShifts.length + 1}`,
                    shiftType: 'general',
                    startTime: '09:00',
                    endTime: '18:00',
                    maxWorkingHours: attendance.workingHours || 8
                }
            ]
        });
    };

    const removeShift = (index) => {
        const nextShifts = attendanceShifts.filter((_, shiftIndex) => shiftIndex !== index);
        const fallbackShifts = nextShifts.length > 0 ? nextShifts : DEFAULT_ATTENDANCE_SHIFTS;
        const nextDefaultShiftCode = fallbackShifts.some((shift) => shift.code === attendance.defaultShiftCode)
            ? attendance.defaultShiftCode
            : fallbackShifts[0].code;

        updateAttendance({
            attendanceShifts: fallbackShifts,
            defaultShiftCode: nextDefaultShiftCode
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/admin/company-settings/attendance', { attendance });
            await refreshProfile();
            toast.success('Attendance settings saved');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save attendance settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Attendance Settings</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage your company shifts, attendance mode defaults, and check-in rules.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !canSave}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Save Settings
                </button>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                <div className="flex items-start gap-3">
                    <ShieldCheck size={18} className="mt-0.5 shrink-0" />
                    <div>
                        Define company shifts here, then assign a shift and attendance mode to each employee from the Employees page.
                        {!canSave && ' Superadmin has locked all attendance settings for this company.'}
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                    <Clock size={18} className="text-blue-600" />
                    <h2 className="font-bold text-slate-800">Shift Policy</h2>
                </div>

                <div className="space-y-6 p-6">
                    <div>
                        <label className="mb-3 block text-sm font-semibold text-slate-700">Weekly Off Days</label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {DAYS.map((day) => (
                                <button
                                    key={day}
                                    type="button"
                                    disabled={!canEditWeeklyOff}
                                    onClick={() => {
                                        const current = attendance.weeklyOff || [];
                                        const next = current.includes(day)
                                            ? current.filter((item) => item !== day)
                                            : [...current, day];
                                        updateAttendance({ weeklyOff: next });
                                    }}
                                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${attendance.weeklyOff?.includes(day)
                                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'} ${!canEditWeeklyOff ? 'cursor-not-allowed opacity-60' : ''}`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Daily Working Hours</label>
                            <input
                                type="number"
                                min="1"
                                disabled={!canEditWorkingHours}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm disabled:bg-slate-100"
                                value={attendance.workingHours}
                                onChange={(e) => updateAttendance({ workingHours: Number(e.target.value) || 1 })}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Default Attendance Mode</label>
                            <select
                                disabled={!canEditAttendanceMode}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm disabled:bg-slate-100"
                                value={attendance.defaultAttendanceMode}
                                onChange={(e) => updateAttendance({ defaultAttendanceMode: e.target.value })}
                            >
                                <option value="clock_in_out">Clock In / Clock Out</option>
                                <option value="present_only">Mark Present Only</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Attendance Export Format</label>
                            <select
                                disabled={!canEditExportFormat}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm disabled:bg-slate-100"
                                value={attendance.exportFormat}
                                onChange={(e) => updateAttendance({ exportFormat: e.target.value })}
                            >
                                <option value="Standard">Standard</option>
                                <option value="Monthly Timesheet">Monthly Timesheet</option>
                                <option value="Detailed">Detailed</option>
                                <option value="Compact">Compact</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Default Shift</label>
                            <select
                                disabled={!(canEditAttendanceMode || canEditShifts)}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm disabled:bg-slate-100"
                                value={attendance.defaultShiftCode}
                                onChange={(e) => updateAttendance({ defaultShiftCode: e.target.value })}
                            >
                                {attendanceShifts.map((shift) => (
                                    <option key={shift.code} value={shift.code}>
                                        {shift.name} ({shift.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-800">Company Shifts</h3>
                                <p className="mt-1 text-xs text-slate-500">
                                    Use `general` for fixed timing and `any` for flexible attendance with max-hours auto-checkout.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={addShift}
                                disabled={!canEditShifts}
                                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Plus size={16} />
                                Add Shift
                            </button>
                        </div>

                        <div className="space-y-3">
                            {attendanceShifts.map((shift, index) => (
                                <div key={`${shift.code}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Code</label>
                                            <input
                                                disabled={!canEditShifts}
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                                value={shift.code}
                                                onChange={(e) => updateShift(index, 'code', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Name</label>
                                            <input
                                                disabled={!canEditShifts}
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                                value={shift.name}
                                                onChange={(e) => updateShift(index, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Type</label>
                                            <select
                                                disabled={!canEditShifts}
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                                                value={shift.shiftType}
                                                onChange={(e) => updateShift(index, 'shiftType', e.target.value)}
                                            >
                                                <option value="general">General</option>
                                                <option value="any">Any Time</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Max Working Hours</label>
                                            <input
                                                type="number"
                                                min="1"
                                                disabled={!canEditShifts}
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                                                value={shift.maxWorkingHours}
                                                onChange={(e) => updateShift(index, 'maxWorkingHours', Number(e.target.value) || 1)}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Start Time</label>
                                            <input
                                                type="time"
                                                disabled={!canEditShifts || shift.shiftType === 'any'}
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                                                value={shift.startTime}
                                                onChange={(e) => updateShift(index, 'startTime', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-[11px] font-bold uppercase text-slate-500">End Time</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="time"
                                                    disabled={!canEditShifts || shift.shiftType === 'any'}
                                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                                                    value={shift.endTime}
                                                    onChange={(e) => updateShift(index, 'endTime', e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    disabled={!canEditShifts}
                                                    onClick={() => removeShift(index)}
                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    disabled={!canEditLocationRules}
                                    checked={attendance.requireLocationCheckIn}
                                    onChange={(e) => updateAttendance({ requireLocationCheckIn: e.target.checked })}
                                />
                                <span className="text-sm text-slate-700">Require location for check-in</span>
                            </label>
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    disabled={!canEditLocationRules}
                                    checked={attendance.requireLocationCheckOut}
                                    onChange={(e) => updateAttendance({ requireLocationCheckOut: e.target.checked })}
                                />
                                <span className="text-sm text-slate-700">Require location for check-out</span>
                            </label>
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    disabled={!canEditLocationRules}
                                    checked={attendance.locationCheck}
                                    onChange={(e) => updateAttendance({ locationCheck: e.target.checked })}
                                />
                                <span className="text-sm text-slate-700">Enable geo-fencing</span>
                            </label>

                            {attendance.locationCheck && (
                                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="Latitude"
                                            disabled={!canEditLocationRules}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                                            value={attendance.coordinates?.lat ?? ''}
                                            onChange={(e) => updateAttendance({ coordinates: { ...attendance.coordinates, lat: e.target.value } })}
                                        />
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="Longitude"
                                            disabled={!canEditLocationRules}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                                            value={attendance.coordinates?.lng ?? ''}
                                            onChange={(e) => updateAttendance({ coordinates: { ...attendance.coordinates, lng: e.target.value } })}
                                        />
                                    </div>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Allowed Radius (Meters)"
                                        disabled={!canEditLocationRules}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                                        value={attendance.allowedRadius}
                                        onChange={(e) => updateAttendance({ allowedRadius: Number(e.target.value) || 1 })}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    disabled={!canEditIpRules}
                                    checked={attendance.ipCheck}
                                    onChange={(e) => updateAttendance({ ipCheck: e.target.checked })}
                                />
                                <span className="text-sm text-slate-700">Enable IP-based restrictions</span>
                            </label>

                            {attendance.ipCheck && (
                                <textarea
                                    disabled={!canEditIpRules}
                                    className="min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                                    placeholder="192.168.1.1, 203.0.113.5"
                                    value={Array.isArray(attendance.allowedIps) ? attendance.allowedIps.join(', ') : ''}
                                    onChange={(e) => updateAttendance({
                                        allowedIps: e.target.value.split(',').map((item) => item.trim()).filter(Boolean)
                                    })}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceSettings;
