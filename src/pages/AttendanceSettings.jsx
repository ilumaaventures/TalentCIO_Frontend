import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Briefcase,
    Calendar,
    Check,
    Clock,
    Edit3,
    Layers,
    Loader2,
    Plus,
    RotateCcw,
    Save,
    ShieldCheck,
    Sparkles,
    Trash2,
    UserCheck,
    Users,
    X
} from 'lucide-react';
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
    requireLocationTimesheet: false,
    locationCheck: false,
    ipCheck: false,
    allowedRadius: 200,
    coordinates: { lat: '', lng: '' },
    allowedIps: [],
    flexWeeklyOff: {
        enabled: false,
        allowedDay: 'Custom (Employee Chooses)',
        allowedDays: ['Custom (Employee Chooses)'],
        allowedCount: 2,
        targetRoles: [],
        targetEmploymentTypes: [],
        targetUserIds: [],
        rolePolicies: [],
        employmentTypePolicies: []
    }
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ALLOWED_DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Custom (Employee Chooses)'];
const EMPLOYMENT_TYPES = ['Full-Time', 'Probation', 'Contract', 'Intern', 'Part-Time'];

const normalizeAllowedDaysArray = (policyObj) => {
    if (Array.isArray(policyObj?.allowedDays) && policyObj.allowedDays.length > 0) {
        return policyObj.allowedDays;
    }
    if (policyObj?.allowedDay) {
        return [policyObj.allowedDay];
    }
    return ['Custom (Employee Chooses)'];
};

const toggleAllowedDayItem = (dayOpt, currentList = [], maxAllowedCount = 2) => {
    let list = Array.isArray(currentList) ? [...currentList] : [];

    if (dayOpt === 'Custom (Employee Chooses)') {
        return ['Custom (Employee Chooses)'];
    }

    list = list.filter((d) => d !== 'Custom (Employee Chooses)');

    if (list.includes(dayOpt)) {
        list = list.filter((d) => d !== dayOpt);
    } else {
        if (list.length >= maxAllowedCount) {
            toast.error(`You cannot select more than ${maxAllowedCount} day choice(s) because allowance is set to ${maxAllowedCount}.`);
            return list;
        }
        list.push(dayOpt);
    }

    if (list.length === 0) {
        list = ['Custom (Employee Chooses)'];
    }

    return list;
};

const AttendanceSettings = () => {
    const navigate = useNavigate();
    const { user, refreshProfile } = useAuth();
    const [attendance, setAttendance] = useState(DEFAULT_ATTENDANCE_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Dynamic Lists for Roles & Employees
    const [rolesList, setRolesList] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [userSearchText, setUserSearchText] = useState('');

    // Active Tab inside Flexible Off Configurations section
    const [activeFlexTab, setActiveFlexTab] = useState('companyDefault');
    const [resetUserOverridesFlag, setResetUserOverridesFlag] = useState(false);

    // Per-Employee Custom Flexible Off Modal State
    const [editingUser, setEditingUser] = useState(null);
    const [customCountValue, setCustomCountValue] = useState('');
    const [savingUserCustom, setSavingUserCustom] = useState(false);

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
                },
                flexWeeklyOff: {
                    enabled: false,
                    allowedDay: 'Custom (Employee Chooses)',
                    allowedDays: ['Custom (Employee Chooses)'],
                    allowedCount: 2,
                    targetRoles: [],
                    targetEmploymentTypes: [],
                    targetUserIds: [],
                    rolePolicies: [],
                    employmentTypePolicies: [],
                    ...(bootstrapAttendance.flexWeeklyOff || {})
                }
            }));
        }
    }, [user?.company?.settings?.attendance]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [settingsRes, rolesRes, usersRes] = await Promise.allSettled([
                    api.get('/admin/company-settings/attendance'),
                    api.get('/admin/roles'),
                    api.get('/admin/users')
                ]);

                if (settingsRes.status === 'fulfilled') {
                    const attendanceSettings = settingsRes.value.data?.attendance || {};
                    setAttendance((prev) => ({
                        ...prev,
                        ...attendanceSettings,
                        attendanceShifts: Array.isArray(attendanceSettings.attendanceShifts) && attendanceSettings.attendanceShifts.length > 0
                            ? attendanceSettings.attendanceShifts
                            : prev.attendanceShifts,
                        coordinates: {
                            lat: attendanceSettings.coordinates?.lat ?? '',
                            lng: attendanceSettings.coordinates?.lng ?? ''
                        },
                        flexWeeklyOff: {
                            enabled: false,
                            allowedDay: 'Custom (Employee Chooses)',
                            allowedDays: ['Custom (Employee Chooses)'],
                            allowedCount: 2,
                            targetRoles: [],
                            targetEmploymentTypes: [],
                            targetUserIds: [],
                            rolePolicies: [],
                            employmentTypePolicies: [],
                            ...(attendanceSettings.flexWeeklyOff || {})
                        }
                    }));
                }

                if (rolesRes.status === 'fulfilled') {
                    const rawRoles = Array.isArray(rolesRes.value.data) ? rolesRes.value.data : rolesRes.value.data?.roles || [];
                    setRolesList(rawRoles);
                }

                if (usersRes.status === 'fulfilled') {
                    const rawUsers = Array.isArray(usersRes.value.data) ? usersRes.value.data : usersRes.value.data?.users || [];
                    setUsersList(rawUsers);
                }
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to load settings data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const attendanceShifts = attendance.attendanceShifts || DEFAULT_ATTENDANCE_SHIFTS;
    const flexWeeklyOff = attendance.flexWeeklyOff || DEFAULT_ATTENDANCE_SETTINGS.flexWeeklyOff;

    const selfService = attendance.selfService || {};
    const canEditWeeklyOff = selfService.weeklyOff !== false;
    const canEditWorkingHours = selfService.workingHours !== false;
    const canEditAttendanceMode = selfService.defaultAttendanceMode !== false;
    const canEditShifts = selfService.attendanceShifts !== false;
    const canEditExportFormat = selfService.exportFormat !== false;
    const canEditLocationRules = selfService.locationRules !== false;
    const canEditIpRules = selfService.ipRules !== false;
    const isPresentOnlyMode = attendance.defaultAttendanceMode === 'present_only';
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

    const updateFlexWeeklyOff = (flexPatch) => {
        setAttendance((prev) => ({
            ...prev,
            flexWeeklyOff: {
                ...(prev.flexWeeklyOff || DEFAULT_ATTENDANCE_SETTINGS.flexWeeklyOff),
                ...flexPatch
            }
        }));
    };

    const handleResetFlexPolicies = () => {
        updateFlexWeeklyOff({
            allowedCount: 2,
            allowedDay: 'Custom (Employee Chooses)',
            allowedDays: ['Custom (Employee Chooses)'],
            targetRoles: [],
            targetEmploymentTypes: [],
            targetUserIds: [],
            rolePolicies: [],
            employmentTypePolicies: []
        });
        setUsersList((prev) => prev.map((u) => ({ ...u, flexWeeklyOffCount: null })));
        setResetUserOverridesFlag(true);
        toast.success('Flexible Off policies and individual custom overrides reset');
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
            await api.put('/admin/company-settings/attendance', {
                attendance,
                resetUserFlexOverrides: resetUserOverridesFlag
            });
            setResetUserOverridesFlag(false);
            if (refreshProfile) {
                try {
                    await refreshProfile();
                } catch (e) {
                    console.error('Failed refreshing profile:', e);
                }
            }
            try {
                Object.keys(sessionStorage).forEach((key) => {
                    if (key.startsWith('attendance_v1_')) {
                        sessionStorage.removeItem(key);
                    }
                });
            } catch (e) {}
            toast.success('Attendance settings saved');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save attendance settings');
        } finally {
            setSaving(false);
        }
    };

    // Role-specific Policy Handlers
    const getRolePolicy = (roleIdOrName) => {
        const currentPolicies = flexWeeklyOff.rolePolicies || [];
        return currentPolicies.find((rp) => rp.roleId === roleIdOrName || rp.roleName === roleIdOrName) || {
            roleId: roleIdOrName,
            roleName: roleIdOrName,
            enabled: false,
            isCustom: false,
            allowedCount: flexWeeklyOff.allowedCount ?? 2,
            allowedDay: flexWeeklyOff.allowedDay || 'Custom (Employee Chooses)',
            allowedDays: normalizeAllowedDaysArray(flexWeeklyOff)
        };
    };

    const updateRolePolicy = (roleIdOrName, roleName, patch) => {
        const currentPolicies = flexWeeklyOff.rolePolicies || [];
        const existingIndex = currentPolicies.findIndex((rp) => rp.roleId === roleIdOrName || rp.roleName === roleIdOrName);
        let next = [];

        if (existingIndex >= 0) {
            next = currentPolicies.map((rp, idx) =>
                idx === existingIndex ? { ...rp, ...patch } : rp
            );
        } else {
            next = [
                ...currentPolicies,
                {
                    roleId: roleIdOrName,
                    roleName: roleName || roleIdOrName,
                    enabled: true,
                    isCustom: false,
                    allowedCount: flexWeeklyOff.allowedCount ?? 2,
                    allowedDay: flexWeeklyOff.allowedDay || 'Custom (Employee Chooses)',
                    allowedDays: normalizeAllowedDaysArray(flexWeeklyOff),
                    ...patch
                }
            ];
        }

        updateFlexWeeklyOff({ rolePolicies: next });
    };

    // Employment Type-specific Policy Handlers
    const cleanEmpType = (s) => String(s || '').replace(/[\s\-_]/g, '').toLowerCase();

    const getEmploymentTypePolicy = (empType) => {
        const currentPolicies = flexWeeklyOff.employmentTypePolicies || [];
        const cleanTarget = cleanEmpType(empType);
        return currentPolicies.find((ep) => cleanEmpType(ep.employmentType) === cleanTarget) || {
            employmentType: empType,
            enabled: false,
            isCustom: false,
            allowedCount: flexWeeklyOff.allowedCount ?? 2,
            allowedDay: flexWeeklyOff.allowedDay || 'Custom (Employee Chooses)',
            allowedDays: normalizeAllowedDaysArray(flexWeeklyOff)
        };
    };

    const updateEmploymentTypePolicy = (empType, patch) => {
        const currentPolicies = flexWeeklyOff.employmentTypePolicies || [];
        const cleanTarget = cleanEmpType(empType);
        const existingIndex = currentPolicies.findIndex((ep) => cleanEmpType(ep.employmentType) === cleanTarget);
        let next = [];

        if (existingIndex >= 0) {
            next = currentPolicies.map((ep, idx) =>
                idx === existingIndex ? { ...ep, ...patch } : ep
            );
        } else {
            next = [
                ...currentPolicies,
                {
                    employmentType: empType,
                    enabled: true,
                    isCustom: false,
                    allowedCount: flexWeeklyOff.allowedCount ?? 2,
                    allowedDay: flexWeeklyOff.allowedDay || 'Custom (Employee Chooses)',
                    allowedDays: normalizeAllowedDaysArray(flexWeeklyOff),
                    ...patch
                }
            ];
        }

        updateFlexWeeklyOff({ employmentTypePolicies: next });
    };

    // Save individual employee custom flex weekly off override count
    const handleSavePerEmployeeCustom = async () => {
        if (!editingUser) return;
        setSavingUserCustom(true);
        try {
            const countVal = customCountValue === '' ? null : Number(customCountValue);
            await api.put(`/admin/users/${editingUser._id}`, {
                flexWeeklyOffCount: countVal
            });

            // Update local users list
            setUsersList((prev) =>
                prev.map((u) =>
                    u._id === editingUser._id
                        ? { ...u, flexWeeklyOffCount: countVal }
                        : u
                )
            );

            toast.success(`Custom flexible off updated for ${editingUser.firstName || editingUser.email}`);
            setEditingUser(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update employee custom setting');
        } finally {
            setSavingUserCustom(false);
        }
    };

    // Resolve Effective Policy for an Employee based on Hierarchy:
    // 1. User Override > 2. Role Policy > 3. Employment Type Policy > 4. Company Default
    const resolveEffectivePolicyForUser = (emp) => {
        const defaultAllowedDays = normalizeAllowedDaysArray(flexWeeklyOff);

        // 1. User Override
        if (emp.flexWeeklyOffCount !== undefined && emp.flexWeeklyOffCount !== null && emp.flexWeeklyOffCount !== '') {
            return {
                count: emp.flexWeeklyOffCount,
                allowedDays: defaultAllowedDays,
                source: 'Employee Override',
                sourceType: 'user'
            };
        }

        // 2. Role Policy Override
        const userRoleNames = Array.isArray(emp.roles)
            ? emp.roles.map((r) => (typeof r === 'string' ? r : r.name)).filter(Boolean)
            : [];
        const userRoleIds = Array.isArray(emp.roles)
            ? emp.roles.map((r) => (typeof r === 'string' ? r : r._id ? String(r._id) : null)).filter(Boolean)
            : [];

        const activeRolePolicies = flexWeeklyOff.rolePolicies || [];
        const matchedRolePolicy = activeRolePolicies.find(
            (rp) => rp.enabled !== false && (
                userRoleNames.includes(rp.roleName) ||
                userRoleNames.includes(rp.roleId) ||
                userRoleIds.includes(rp.roleId) ||
                userRoleIds.includes(rp.roleName)
            )
        );

        if (matchedRolePolicy && matchedRolePolicy.isCustom) {
            return {
                count: matchedRolePolicy.allowedCount ?? flexWeeklyOff.allowedCount ?? 2,
                allowedDays: normalizeAllowedDaysArray(matchedRolePolicy),
                source: `Role (${matchedRolePolicy.roleName || matchedRolePolicy.roleId})`,
                sourceType: 'role'
            };
        }

        // 3. Employment Type Policy Override
        const activeEmpTypePolicies = flexWeeklyOff.employmentTypePolicies || [];
        const userEmpTypeClean = cleanEmpType(emp.employmentType || 'Full-Time');
        const matchedEmpTypePolicy = activeEmpTypePolicies.find(
            (ep) => ep.enabled !== false && cleanEmpType(ep.employmentType) === userEmpTypeClean
        );

        if (matchedEmpTypePolicy && matchedEmpTypePolicy.isCustom) {
            return {
                count: matchedEmpTypePolicy.allowedCount ?? flexWeeklyOff.allowedCount ?? 2,
                allowedDays: normalizeAllowedDaysArray(matchedEmpTypePolicy),
                source: `Employment Type (${matchedEmpTypePolicy.employmentType})`,
                sourceType: 'empType'
            };
        }

        // 4. Company Default Fallback
        return {
            count: flexWeeklyOff.allowedCount ?? 2,
            allowedDays: defaultAllowedDays,
            source: 'Company Default',
            sourceType: 'default'
        };
    };

    // Filter employees displayed in management table
    const targetUserIdsSet = new Set(flexWeeklyOff.targetUserIds || []);
    const displayedUsers = usersList.filter((u) => {
        const nameMatch = `${u.firstName || ''} ${u.lastName || ''} ${u.email || ''}`
            .toLowerCase()
            .includes(userSearchText.toLowerCase());

        if (!nameMatch) return false;

        if (targetUserIdsSet.size > 0) {
            return targetUserIdsSet.has(u._id);
        }
        return true;
    });

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6 px-6 pb-10 pt-10 md:px-0 md:pt-14">
            <button
                type="button"
                onClick={() => navigate('/profile?tab=settings')}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
            >
                <ArrowLeft size={16} />
                Back to Settings
            </button>

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

            {/* ── Shift Policy Section ────────────────────────── */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                    <Clock size={18} className="text-blue-600" />
                    <h2 className="font-bold text-slate-800">Shift Policy</h2>
                </div>

                <div className="space-y-6 p-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {!isPresentOnlyMode && (
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
                        )}
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
                                    checked={attendance.requireLocationTimesheet}
                                    onChange={(e) => updateAttendance({ requireLocationTimesheet: e.target.checked })}
                                />
                                <span className="text-sm text-slate-700">Require location when submitting attendance from timesheet</span>
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

            {/* ── Weekly Off Days Policy ────────────────────────── */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-blue-600" />
                        <h2 className="font-bold text-slate-800">Weekly Off Days</h2>
                    </div>
                    {flexWeeklyOff.enabled && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                            <Sparkles size={12} /> Dynamic Flexible Off Active
                        </span>
                    )}
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-4">
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
                                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${attendance.weeklyOff?.includes(day)
                                    ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'} ${!canEditWeeklyOff ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                                {day}
                            </button>
                        ))}

                        {/* Custom Flexible Off Option */}
                        <button
                            type="button"
                            disabled={!canEditWeeklyOff}
                            onClick={() => {
                                updateFlexWeeklyOff({ enabled: !flexWeeklyOff.enabled });
                            }}
                            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${flexWeeklyOff.enabled
                                ? 'border-violet-300 bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-200'
                                : 'border-dashed border-violet-200 bg-violet-50/40 text-violet-600 hover:border-violet-300 hover:bg-violet-50'} ${!canEditWeeklyOff ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                            <Sparkles size={15} className={flexWeeklyOff.enabled ? 'animate-pulse text-violet-600' : ''} />
                            Custom Flexible Off
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Flexible Off Configurations Section (Dynamic Multi-Tier Rules) ────────────────────────── */}
            {flexWeeklyOff.enabled && (
                <div className="rounded-xl border border-violet-200 bg-white shadow-sm ring-1 ring-violet-100 transition-all space-y-0 overflow-hidden">
                    <div className="flex flex-col gap-2 border-b border-violet-100 bg-violet-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles size={20} className="text-violet-600" />
                            <div>
                                <h2 className="font-bold text-slate-800 text-base">Dynamic Flexible Off Policies</h2>
                                <p className="text-xs text-slate-500">
                                    Configure custom flexible off rules per Role, per Employment Type, or per Employee. Select multiple allowed days as needed.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={!canEditWeeklyOff}
                            onClick={handleResetFlexPolicies}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-1.5 text-xs font-bold text-rose-700 shadow-sm hover:bg-rose-100 hover:border-rose-300 transition active:scale-95 disabled:opacity-50"
                            title="Reset all baseline, role, and employment type flexible off choices back to default"
                        >
                            <RotateCcw size={14} />
                            Reset All Choices
                        </button>
                    </div>

                    {/* Policy Navigation Tabs */}
                    <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => setActiveFlexTab('companyDefault')}
                            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${activeFlexTab === 'companyDefault'
                                ? 'border-violet-600 text-violet-700 bg-white rounded-t-lg border-t border-x border-slate-200 shadow-sm'
                                : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <Layers size={14} /> Company Default Baseline
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveFlexTab('rolePolicies')}
                            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${activeFlexTab === 'rolePolicies'
                                ? 'border-violet-600 text-violet-700 bg-white rounded-t-lg border-t border-x border-slate-200 shadow-sm'
                                : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <UserCheck size={14} /> Role-Specific Policies ({(flexWeeklyOff.rolePolicies || []).filter(r => r.enabled).length})
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveFlexTab('empTypePolicies')}
                            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${activeFlexTab === 'empTypePolicies'
                                ? 'border-violet-600 text-violet-700 bg-white rounded-t-lg border-t border-x border-slate-200 shadow-sm'
                                : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <Briefcase size={14} /> Employment Type Policies ({(flexWeeklyOff.employmentTypePolicies || []).filter(e => e.enabled).length})
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveFlexTab('employeeOverrides')}
                            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${activeFlexTab === 'employeeOverrides'
                                ? 'border-violet-600 text-violet-700 bg-white rounded-t-lg border-t border-x border-slate-200 shadow-sm'
                                : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <Users size={14} /> Per-Employee Custom Overrides
                        </button>
                    </div>

                    <div className="p-6 space-y-6 bg-white">
                        {/* TAB 1: Company Default Baseline */}
                        {activeFlexTab === 'companyDefault' && (
                            <div className="space-y-6 animate-in fade-in duration-200">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Default Flexible Off Allowance (Days / Month)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="15"
                                        disabled={!canEditWeeklyOff}
                                        className="w-full max-w-xs rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:bg-slate-100"
                                        value={flexWeeklyOff.allowedCount ?? 2}
                                        onChange={(e) =>
                                            updateFlexWeeklyOff({
                                                allowedCount: Math.max(1, Number(e.target.value) || 1)
                                            })
                                        }
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                        Baseline allowance granted to employees who don't have role or employment type overrides.
                                    </p>
                                </div>

                                <div>
                                    <div className="mb-2 flex items-center justify-between">
                                        <label className="block text-sm font-semibold text-slate-700">
                                            Default Allowed Day(s) Choice (Select Multiple)
                                        </label>
                                        <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200">
                                            Selected: {normalizeAllowedDaysArray(flexWeeklyOff).join(', ')}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        {ALLOWED_DAY_OPTIONS.map((opt) => {
                                            const currentList = normalizeAllowedDaysArray(flexWeeklyOff);
                                            const isSelected = currentList.includes(opt);

                                            return (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    disabled={!canEditWeeklyOff}
                                                    onClick={() => {
                                                        const nextList = toggleAllowedDayItem(opt, currentList, flexWeeklyOff.allowedCount ?? 2);
                                                        updateFlexWeeklyOff({
                                                            allowedDays: nextList,
                                                            allowedDay: nextList[0] || 'Custom (Employee Chooses)'
                                                        });
                                                    }}
                                                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition ${isSelected
                                                        ? 'border-violet-300 bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-200'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'} ${!canEditWeeklyOff ? 'cursor-not-allowed opacity-60' : ''}`}
                                                >
                                                    <span>{opt}</span>
                                                    {isSelected && <Check size={14} className="text-violet-600 shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-1.5 text-xs text-slate-500">
                                        Select all the days of the week employees can pick as flexible off days.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: Dynamic Role-Specific Policies */}
                        {activeFlexTab === 'rolePolicies' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">Role-Based Flexible Off Matrix</h3>
                                    <p className="text-xs text-slate-500">
                                        Configure custom flexible off allowances and allowed day choices per Role. Roles with customized rules override company default baseline.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {rolesList.length === 0 ? (
                                        <div className="py-4 text-center text-xs text-slate-400">Loading roles...</div>
                                    ) : (
                                        rolesList.map((role) => {
                                            const roleIdOrName = role._id || role.name;
                                            const policy = getRolePolicy(roleIdOrName);
                                            const isEnabled = Boolean(policy.enabled);
                                            const isCustom = Boolean(policy.isCustom && isEnabled);
                                            const currentDays = normalizeAllowedDaysArray(policy);

                                            return (
                                                <div
                                                    key={roleIdOrName}
                                                    className={`rounded-xl border p-4 transition ${isCustom
                                                        ? 'border-blue-200 bg-blue-50/40 shadow-sm ring-1 ring-blue-100'
                                                        : isEnabled
                                                            ? 'border-slate-200 bg-white shadow-sm'
                                                            : 'border-slate-200 bg-slate-50/60 opacity-75'}`}
                                                >
                                                    <div className="flex flex-col gap-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    disabled={!canEditWeeklyOff}
                                                                    checked={isEnabled}
                                                                    onChange={(e) =>
                                                                        updateRolePolicy(roleIdOrName, role.name, {
                                                                            enabled: e.target.checked,
                                                                            isCustom: false
                                                                        })
                                                                    }
                                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                                />
                                                                <div className={`p-2 rounded-lg ${isCustom ? 'bg-blue-100 text-blue-700' : isEnabled ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/60 text-slate-400'}`}>
                                                                    <UserCheck size={18} />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-sm text-slate-800">
                                                                        {role.name || roleIdOrName}
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-500">
                                                                        {!isEnabled
                                                                            ? 'Flexible off disabled for this role'
                                                                            : isCustom
                                                                                ? 'Custom policy active for this role'
                                                                                : 'Using company default policy'}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    disabled={!canEditWeeklyOff}
                                                                    onClick={() =>
                                                                        updateRolePolicy(roleIdOrName, role.name, {
                                                                            enabled: true,
                                                                            isCustom: !isCustom
                                                                        })
                                                                    }
                                                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${isCustom
                                                                        ? 'border border-blue-200 bg-blue-100 text-blue-800 hover:bg-blue-200 shadow-sm'
                                                                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'}`}
                                                                >
                                                                    {isCustom ? <Check size={14} /> : <Plus size={14} />}
                                                                    {isCustom ? 'Customized (Click to Revert)' : 'Configure Policy'}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {isEnabled && isCustom && (
                                                            <div className="space-y-4 border-t border-blue-200/60 pt-4 mt-1 animate-in fade-in duration-200">
                                                                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100">
                                                                    <label className="text-xs font-semibold text-slate-700">Role Allowance Override:</label>
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            max="15"
                                                                            disabled={!canEditWeeklyOff}
                                                                            className="w-20 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium focus:border-blue-500 focus:outline-none"
                                                                            value={policy.allowedCount ?? flexWeeklyOff.allowedCount ?? 2}
                                                                            onChange={(e) =>
                                                                                updateRolePolicy(roleIdOrName, role.name, {
                                                                                    allowedCount: Math.max(1, Number(e.target.value) || 1)
                                                                                })
                                                                            }
                                                                        />
                                                                        <span className="text-xs text-slate-500">Days/mo</span>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <label className="block text-xs font-semibold text-slate-700">
                                                                        Allowed Day(s) Choice (Select Multiple):
                                                                    </label>
                                                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                                        {ALLOWED_DAY_OPTIONS.map((opt) => {
                                                                            const isSelected = currentDays.includes(opt);
                                                                            return (
                                                                                <button
                                                                                    key={opt}
                                                                                    type="button"
                                                                                    disabled={!canEditWeeklyOff}
                                                                                    onClick={() => {
                                                                                        const nextDays = toggleAllowedDayItem(opt, currentDays, policy.allowedCount ?? 2);
                                                                                        updateRolePolicy(roleIdOrName, role.name, {
                                                                                            allowedDays: nextDays,
                                                                                            allowedDay: nextDays[0] || 'Custom (Employee Chooses)'
                                                                                        });
                                                                                    }}
                                                                                    className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${isSelected
                                                                                        ? 'border-blue-400 bg-blue-600 text-white font-semibold shadow-sm'
                                                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                                                                >
                                                                                    <span>{opt}</span>
                                                                                    {isSelected && <Check size={13} className="text-white shrink-0" />}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: Dynamic Employment Type Policies */}
                        {activeFlexTab === 'empTypePolicies' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">Employment Type Flexible Off Matrix</h3>
                                    <p className="text-xs text-slate-500">
                                        Configure custom flexible off allowances and allowed day choices per Employment Status. Select multiple days per employment type.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {EMPLOYMENT_TYPES.map((empType) => {
                                        const policy = getEmploymentTypePolicy(empType);
                                        const isEnabled = Boolean(policy.enabled);
                                        const isCustom = Boolean(policy.isCustom && isEnabled);
                                        const currentDays = normalizeAllowedDaysArray(policy);

                                        return (
                                            <div
                                                key={empType}
                                                className={`rounded-xl border p-4 transition ${isCustom
                                                    ? 'border-violet-200 bg-violet-50/40 shadow-sm ring-1 ring-violet-100'
                                                    : isEnabled
                                                        ? 'border-slate-200 bg-white shadow-sm'
                                                        : 'border-slate-200 bg-slate-50/60 opacity-75'}`}
                                            >
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                disabled={!canEditWeeklyOff}
                                                                checked={isEnabled}
                                                                onChange={(e) =>
                                                                    updateEmploymentTypePolicy(empType, {
                                                                        enabled: e.target.checked,
                                                                        isCustom: false
                                                                    })
                                                                }
                                                                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                                                            />
                                                            <div className={`p-2 rounded-lg ${isCustom ? 'bg-violet-100 text-violet-700' : isEnabled ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/60 text-slate-400'}`}>
                                                                <Briefcase size={18} />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-sm text-slate-800">
                                                                    {empType}
                                                                </div>
                                                                <div className="text-[11px] text-slate-500">
                                                                    {!isEnabled
                                                                        ? 'Flexible off disabled for this employment type'
                                                                        : isCustom
                                                                            ? `Custom policy active for ${empType}`
                                                                            : 'Using company default policy'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                disabled={!canEditWeeklyOff}
                                                                onClick={() =>
                                                                    updateEmploymentTypePolicy(empType, {
                                                                        enabled: true,
                                                                        isCustom: !isCustom
                                                                    })
                                                                }
                                                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${isCustom
                                                                    ? 'border border-violet-200 bg-violet-100 text-violet-800 hover:bg-violet-200 shadow-sm'
                                                                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'}`}
                                                            >
                                                                {isCustom ? <Check size={14} /> : <Plus size={14} />}
                                                                {isCustom ? 'Customized (Click to Revert)' : 'Configure Policy'}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {isEnabled && isCustom && (
                                                        <div className="space-y-4 border-t border-violet-200/60 pt-4 mt-1 animate-in fade-in duration-200">
                                                            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-violet-100">
                                                                <label className="text-xs font-semibold text-slate-700">Employment Type Allowance Override:</label>
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        max="15"
                                                                        disabled={!canEditWeeklyOff}
                                                                        className="w-20 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium focus:border-violet-500 focus:outline-none"
                                                                        value={policy.allowedCount ?? flexWeeklyOff.allowedCount ?? 2}
                                                                        onChange={(e) =>
                                                                            updateEmploymentTypePolicy(empType, {
                                                                                allowedCount: Math.max(1, Number(e.target.value) || 1)
                                                                            })
                                                                        }
                                                                    />
                                                                    <span className="text-xs text-slate-500">Days/mo</span>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <label className="block text-xs font-semibold text-slate-700">
                                                                    Allowed Day(s) Choice (Select Multiple):
                                                                </label>
                                                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                                    {ALLOWED_DAY_OPTIONS.map((opt) => {
                                                                        const isSelected = currentDays.includes(opt);
                                                                        return (
                                                                            <button
                                                                                key={opt}
                                                                                type="button"
                                                                                disabled={!canEditWeeklyOff}
                                                                                onClick={() => {
                                                                                    const nextDays = toggleAllowedDayItem(opt, currentDays, policy.allowedCount ?? 2);
                                                                                    updateEmploymentTypePolicy(empType, {
                                                                                        allowedDays: nextDays,
                                                                                        allowedDay: nextDays[0] || 'Custom (Employee Chooses)'
                                                                                    });
                                                                                }}
                                                                                className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${isSelected
                                                                                    ? 'border-violet-400 bg-violet-600 text-white font-semibold shadow-sm'
                                                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                                                            >
                                                                                <span>{opt}</span>
                                                                                {isSelected && <Check size={13} className="text-white shrink-0" />}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* TAB 4: Per-Employee Custom Overrides */}
                        {activeFlexTab === 'employeeOverrides' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">Individual Employee Custom Management</h3>
                                    <p className="text-xs text-slate-500">
                                        Review effective policy calculation for each employee and click <span className="font-semibold text-violet-600">Custom</span> to set individual per-user overrides.
                                    </p>
                                </div>

                                <div className="rounded-xl border border-slate-200 p-4">
                                    <div className="mb-3 flex items-center gap-2">
                                        <Users size={16} className="text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search employee by name or email..."
                                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-violet-500 focus:outline-none"
                                            value={userSearchText}
                                            onChange={(e) => setUserSearchText(e.target.value)}
                                        />
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase font-semibold">
                                                <tr>
                                                    <th className="py-2.5 px-3">Employee</th>
                                                    <th className="py-2.5 px-3">Employment Status</th>
                                                    <th className="py-2.5 px-3">Effective Allowance</th>
                                                    <th className="py-2.5 px-3">Allowed Days Choice</th>
                                                    <th className="py-2.5 px-3">Applied Rule Source</th>
                                                    <th className="py-2.5 px-3 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {displayedUsers.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="py-4 text-center text-slate-400">
                                                            No employees match search criteria.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    displayedUsers.slice(0, 20).map((emp) => {
                                                        const effective = resolveEffectivePolicyForUser(emp);

                                                        return (
                                                            <tr key={emp._id} className="hover:bg-slate-50/60">
                                                                <td className="py-2.5 px-3">
                                                                    <div className="font-semibold text-slate-800">
                                                                        {emp.firstName} {emp.lastName}
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-400">{emp.email}</div>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-slate-600">
                                                                    {emp.employmentType || 'Full-Time'}
                                                                </td>
                                                                <td className="py-2.5 px-3">
                                                                    <span className="inline-flex items-center gap-1 font-bold text-violet-700">
                                                                        {effective.count} Days / month
                                                                    </span>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-slate-600">
                                                                    <span className="text-[11px]">
                                                                        {effective.allowedDays.join(', ')}
                                                                    </span>
                                                                </td>
                                                                <td className="py-2.5 px-3">
                                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${effective.sourceType === 'user'
                                                                        ? 'bg-violet-100 text-violet-800'
                                                                        : effective.sourceType === 'role'
                                                                            ? 'bg-blue-100 text-blue-800'
                                                                            : effective.sourceType === 'empType'
                                                                                ? 'bg-amber-100 text-amber-800'
                                                                                : 'bg-slate-100 text-slate-600'}`}>
                                                                        {effective.source}
                                                                    </span>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-right">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEditingUser(emp);
                                                                            setCustomCountValue(
                                                                                emp.flexWeeklyOffCount !== undefined && emp.flexWeeklyOffCount !== null
                                                                                    ? String(emp.flexWeeklyOffCount)
                                                                                    : ''
                                                                            );
                                                                        }}
                                                                        className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition"
                                                                    >
                                                                        <Edit3 size={12} />
                                                                        Custom
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Per-Employee Custom Flexible Off Modal ────────────────────────── */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="text-violet-600" size={20} />
                                <h3 className="font-bold text-slate-800">
                                    Custom Flexible Off Allowance
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">
                                Setting custom allowance for{' '}
                                <strong className="text-slate-800">
                                    {editingUser.firstName} {editingUser.lastName}
                                </strong>{' '}
                                ({editingUser.email}).
                            </p>

                            <div className="mt-4 space-y-2">
                                <label className="block text-xs font-semibold uppercase text-slate-500">
                                    Custom Flexible Off Days Count
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="15"
                                    placeholder={`Leave blank to fallback to Role/Employment Type/Company default`}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                                    value={customCountValue}
                                    onChange={(e) => setCustomCountValue(e.target.value)}
                                />
                                <p className="text-[11px] text-slate-400">
                                    Leave blank to clear custom override and revert to dynamic role/employment status policy.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                            {editingUser?.flexWeeklyOffCount !== undefined && editingUser?.flexWeeklyOffCount !== null && (
                                <button
                                    type="button"
                                    onClick={() => setCustomCountValue('')}
                                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                                >
                                    Clear Override
                                </button>
                            )}
                            <div className="flex items-center gap-3 ml-auto">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSavePerEmployeeCustom}
                                    disabled={savingUserCustom}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
                                >
                                    {savingUserCustom ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    Save Custom Allowance
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceSettings;
