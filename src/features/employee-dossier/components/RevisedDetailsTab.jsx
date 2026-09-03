import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/apiClient';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
    Calendar, Clock, History, AlertCircle, AlertTriangle, CheckCircle,
    Edit2, Trash2, Plus, ArrowRight, ChevronRight, ChevronDown, ChevronUp,
    User, Briefcase, DollarSign, Shield, MapPin, Hash, Sparkles, Filter,
    RefreshCw, X, FileText, Info, Eye, Check, AlertOctagon, Settings2, SlidersHorizontal, Download,
    CalendarDays, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isPast, isFuture, parseISO } from 'date-fns';
import Skeleton from '@/components/ui/Skeleton';

import {
    buildMasterSalaryStructure,
    createDefaultSalaryData,
    PT_STATE_LIST,
    fmtMoney,
    parseBool
} from '@/features/payroll/utils/payroll';

import CompensationFormSection from '@/features/payroll/components/compensation/CompensationFormSection';
import SalaryPreviewCard from '@/features/payroll/components/compensation/SalaryPreviewCard';

const MODULE_OPTIONS = [
    { id: 'employment', label: 'Employment & Org Structure', icon: Briefcase },
    { id: 'attendance', label: 'Attendance & Shifts', icon: Clock },
    { id: 'leave', label: 'Leave Management', icon: CalendarDays },
    { id: 'compensation', label: 'Compensation & Salary', icon: DollarSign }
];

const REASON_TEMPLATES = [
    'Probation Completion',
    'Annual Appraisal & Hike',
    'Promotion / Designation Upgrade',
    'Department Transfer',
    'Reporting Line Restructure',
    'Shift & Attendance Adjustment',
    'Employment Status Transition (Trainee → Full Time)',
    'Compensation Realignment'
];

const DEFAULT_EMPLOYMENT_TYPES = [
    'Full Time',
    'Part Time',
    'Contract',
    'Intern',
    'Consultant',
    'Freelance',
    'Probation'
];

const DEFAULT_ATTENDANCE_MODES = [
    { value: 'clock_in_out', label: 'Clock In / Out (Standard)' },
    { value: 'present_only', label: 'Present Only (Manual Mark)' }
];

const SearchableUserSelect = ({ users = [], value, onChange, placeholder = "-- No Manager --" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = React.useRef(null);

    const selectedUser = users.find(u => String(u._id) === String(value));

    const filteredUsers = useMemo(() => {
        if (!search.trim()) return users;
        const q = search.toLowerCase();
        return users.filter(u =>
            `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q)
        );
    }, [users, search]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-10 flex items-center justify-between px-3.5 py-2 rounded-xl border text-xs font-semibold bg-white text-left transition-all cursor-pointer shadow-2xs ${
                    isOpen
                        ? 'border-blue-500 ring-2 ring-blue-500/20 text-slate-900'
                        : 'border-slate-300 text-slate-800 hover:border-slate-400'
                }`}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedUser ? (
                        <>
                            <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden ring-1 ring-blue-200">
                                {selectedUser.profilePicture ? (
                                    <img src={selectedUser.profilePicture} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <span>{selectedUser.firstName?.[0] || 'U'}</span>
                                )}
                            </div>
                            <span className="truncate text-slate-800">
                                {selectedUser.firstName} {selectedUser.lastName} <span className="text-slate-400 font-normal">({selectedUser.email})</span>
                            </span>
                        </>
                    ) : (
                        <span className="text-slate-400 font-normal">{placeholder}</span>
                    )}
                </div>
                <ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
                        <div className="relative">
                            <input
                                type="text"
                                autoFocus
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search manager by name or email..."
                                className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 bg-white transition-all"
                            />
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 p-1.5 custom-scrollbar">
                        <button
                            type="button"
                            onClick={() => {
                                onChange('');
                                setIsOpen(false);
                                setSearch('');
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                                !value 
                                    ? 'bg-blue-50 text-blue-700 font-bold' 
                                    : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <span className="italic">-- No Manager --</span>
                            {!value && <Check size={14} className="text-blue-600 font-bold" />}
                        </button>

                        {filteredUsers.length === 0 ? (
                            <div className="py-4 text-center text-xs text-slate-400">
                                No active users found matching "{search}"
                            </div>
                        ) : (
                            filteredUsers.map(u => {
                                const isSelected = String(u._id) === String(value);
                                return (
                                    <button
                                        key={u._id}
                                        type="button"
                                        onClick={() => {
                                            onChange(u._id);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                            isSelected 
                                                ? 'bg-blue-50 text-blue-700 font-bold' 
                                                : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 truncate">
                                            <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden border border-slate-200">
                                                {u.profilePicture ? (
                                                    <img src={u.profilePicture} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <span>{u.firstName?.[0] || 'U'}</span>
                                                )}
                                            </div>
                                            <div className="truncate">
                                                <p className="font-semibold leading-tight truncate text-slate-800">{u.firstName} {u.lastName}</p>
                                                <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                                            </div>
                                        </div>
                                        {isSelected && <Check size={14} className="text-blue-600 shrink-0 font-bold" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const RevisedDetailsTab = ({
    employeeId,
    profile,
    currentUserRoles = [],
    onRevisionApplied
}) => {
    const { user: currentUser, hasModule } = useAuth();

    const hasLeaveModule = useMemo(() => {
        if (typeof hasModule === 'function') {
            return Boolean(hasModule('leaves') || hasModule('leave'));
        }
        const mods = currentUser?.company?.enabledModules || [];
        return mods.includes('leaves') || mods.includes('leave');
    }, [hasModule, currentUser]);

    const availableModuleOptions = useMemo(() => {
        return MODULE_OPTIONS.filter(mod => {
            if (mod.id === 'leave' && !hasLeaveModule) return false;
            return true;
        });
    }, [hasLeaveModule]);

    // Data States
    const [revisions, setRevisions] = useState([]);
    const [scheduledCount, setScheduledCount] = useState(0);
    const [activeRevision, setActiveRevision] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all'); // all, scheduled, active, superseded, cancelled

    // Reference Data for Dropdowns
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [roles, setRoles] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [payrollConfig, setPayrollConfig] = useState(null);
    const [attendanceShifts, setAttendanceShifts] = useState([
        { code: 'general', name: 'General' },
        { code: 'any', name: 'Any Time' }
    ]);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedRevision, setSelectedRevision] = useState(null);

    // Form State for Create / Edit
    const [effectiveDate, setEffectiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [reason, setReason] = useState('');
    const [isBackdatedConfirmed, setIsBackdatedConfirmed] = useState(false);
    const [selectedModules, setSelectedModules] = useState(['employment']);
    const [submitting, setSubmitting] = useState(false);
    const [cancellingReason, setCancellingReason] = useState('');

    // Accordion States for Form Sections
    const [showEmploymentSection, setShowEmploymentSection] = useState(false);
    const [showAttendanceSection, setShowAttendanceSection] = useState(false);
    const [showLeaveSection, setShowLeaveSection] = useState(false);
    const [showSalarySection, setShowSalarySection] = useState(false);
    const [ctcPeriod, setCtcPeriod] = useState('monthly');

    // Leave Management State
    const [leavePolicies, setLeavePolicies] = useState([]);
    const [leaveAllocations, setLeaveAllocations] = useState([]);

    // Salary Draft State
    const [salaryDraft, setSalaryDraft] = useState({
        annualCTC: '',
        monthlyCTC: '',
        compensationType: 'monthly_salary',
        attendanceMode: 'attendance',
        payType: 'salaried',
        useSalaryComponents: true,
        pfEnabled: true,
        esiEnabled: true,
        ptEnabled: true,
        lwfEnabled: true,
        gratuityEnabled: true,
        tdsEnabled: true,
        includePfInCTC: false,
        includeGratuityInCTC: true,
        basicPercent: 50,
        hraPercent: 50,
        vpfPercent: 0,
        ptState: 'MH',
        insuranceAmount: 0,
        employerNPS: 0,
        customAllowances: [],
        customDeductions: [],
        rateCard: [],
        basic: '0',
        monthlyGross: '0',
        netTakeHome: '0'
    });

    // Dynamic Revision Fields State
    const [revisionForm, setRevisionForm] = useState({
        // Employment
        departmentRef: '',
        designationRef: '',
        primaryManagerId: '',
        employmentType: '',
        workLocation: '',
        workforceStatus: '',
        // Attendance
        attendanceMode: '',
        attendanceShiftCode: '',
        // Permissions
        roleId: ''
    });

    const isAuthorizedToManage = useMemo(() => {
        const roleList = currentUser?.roles?.map(r => (typeof r === 'string' ? r : r?.name)) || [];
        const isAdmin = roleList.some(r => ['Admin', 'Super Admin', 'System Admin'].includes(r));
        const hasPerm = currentUser?.permissions?.includes('employee.revision.manage') ||
            currentUser?.permissions?.includes('employee.revision.create') ||
            currentUser?.permissions?.includes('employee.revision.update') ||
            currentUser?.permissions?.includes('employee.revision.cancel') ||
            currentUser?.permissions?.includes('*') ||
            currentUser?.hasAllPermissions;
        return Boolean(isAdmin || hasPerm);
    }, [currentUser]);

    const canCreateRevision = useMemo(() => {
        const roleList = currentUser?.roles?.map(r => (typeof r === 'string' ? r : r?.name)) || [];
        const isAdmin = roleList.some(r => ['Admin', 'Super Admin', 'System Admin'].includes(r));
        return Boolean(
            isAdmin ||
            currentUser?.hasAllPermissions ||
            currentUser?.permissions?.includes('employee.revision.create') ||
            currentUser?.permissions?.includes('employee.revision.manage') ||
            currentUser?.permissions?.includes('*')
        );
    }, [currentUser]);

    const canEditRevision = useMemo(() => {
        const roleList = currentUser?.roles?.map(r => (typeof r === 'string' ? r : r?.name)) || [];
        const isAdmin = roleList.some(r => ['Admin', 'Super Admin', 'System Admin'].includes(r));
        return Boolean(
            isAdmin ||
            currentUser?.hasAllPermissions ||
            currentUser?.permissions?.includes('employee.revision.update') ||
            currentUser?.permissions?.includes('employee.revision.edit') ||
            currentUser?.permissions?.includes('employee.revision.manage') ||
            currentUser?.permissions?.includes('*')
        );
    }, [currentUser]);

    const canCancelRevision = useMemo(() => {
        const roleList = currentUser?.roles?.map(r => (typeof r === 'string' ? r : r?.name)) || [];
        const isAdmin = roleList.some(r => ['Admin', 'Super Admin', 'System Admin'].includes(r));
        return Boolean(
            isAdmin ||
            currentUser?.hasAllPermissions ||
            currentUser?.permissions?.includes('employee.revision.cancel') ||
            currentUser?.permissions?.includes('employee.revision.delete') ||
            currentUser?.permissions?.includes('employee.revision.manage') ||
            currentUser?.permissions?.includes('*')
        );
    }, [currentUser]);

    // Fetch Reference Dropdowns & Payroll Config
    const fetchReferenceData = useCallback(async () => {
        try {
            const apiCalls = [
                api.get('/organization/departments'),
                api.get('/organization/designations'),
                api.get('/admin/roles'),
                api.get('/admin/users'),
                api.get('/payroll/config')
            ];

            if (hasLeaveModule) {
                apiCalls.push(api.get(`/employees/${employeeId}/leave-balances`));
            }

            const results = await Promise.allSettled(apiCalls);
            const deptRes = results[0];
            const desigRes = results[1];
            const rolesRes = results[2];
            const usersRes = results[3];
            const configRes = results[4];
            const leaveRes = hasLeaveModule ? results[5] : null;

            if (deptRes?.status === 'fulfilled' && deptRes.value?.data) {
                setDepartments(Array.isArray(deptRes.value.data) ? deptRes.value.data : (deptRes.value.data?.departments || []));
            }
            if (desigRes?.status === 'fulfilled' && desigRes.value?.data) {
                setDesignations(Array.isArray(desigRes.value.data) ? desigRes.value.data : (desigRes.value.data?.designations || []));
            }
            if (rolesRes?.status === 'fulfilled' && rolesRes.value?.data) {
                setRoles(Array.isArray(rolesRes.value.data) ? rolesRes.value.data : (rolesRes.value.data?.roles || []));
            }
            if (usersRes?.status === 'fulfilled' && usersRes.value?.data) {
                const uList = Array.isArray(usersRes.value.data) ? usersRes.value.data : (usersRes.value.data?.users || []);
                const activeOnly = uList.filter(u =>
                    String(u._id) !== String(employeeId) &&
                    u.isActive !== false &&
                    u.status !== 'Inactive' &&
                    u.status !== 'Terminated' &&
                    u.status !== 'Resigned' &&
                    !u.isDeleted
                );
                setAllEmployees(activeOnly);
            }
            if (configRes?.status === 'fulfilled' && configRes.value?.data) {
                setPayrollConfig(configRes.value.data);
            }
            if (hasLeaveModule) {
                if (leaveRes?.status === 'fulfilled' && leaveRes.value?.data?.leaves) {
                    const fetchedLeaves = (leaveRes.value.data.leaves || []).map(l => ({
                        ...l,
                        enabled: l.enabled !== false
                    }));
                    setLeavePolicies(fetchedLeaves);
                    setLeaveAllocations(fetchedLeaves);
                } else {
                    // Fallback to /leaves/config if needed
                    api.get('/leaves/config').then(res => {
                        const policies = Array.isArray(res.data) ? res.data : [];
                        const normalized = policies.map(p => ({
                            policyId: p._id,
                            leaveType: p.leaveType,
                            name: p.name,
                            description: p.description || '',
                            isPaid: p.isPaid,
                            allocatedBalance: p.accrualType === 'Yearly' ? (p.accrualAmount || 0) : (p.accrualAmount || 0),
                            accrualType: p.accrualType || 'Monthly',
                            accrualAmount: p.accrualAmount || 0,
                            carryForward: p.carryForward || false,
                            carryForwardFrequency: 'Monthly',
                            maxCarryForward: p.maxCarryForward || 0,
                            expiryBalance: p.maxLimitPerYear || 0,
                            expiryMonths: 12,
                            autoRenew: true,
                            allowNegativeBalance: p.allowNegativeBalance || false,
                            sandwichRule: p.sandwichRule || false,
                            proRata: p.proRata ?? true,
                            currentClosingBalance: 0,
                            enabled: true
                        }));
                        setLeavePolicies(normalized);
                        setLeaveAllocations(normalized);
                    }).catch(() => {});
                }
            } else {
                setLeavePolicies([]);
                setLeaveAllocations([]);
            }

            if (currentUser?.company?.settings?.attendance?.attendanceShifts) {
                setAttendanceShifts(currentUser.company.settings.attendance.attendanceShifts);
            }
        } catch (err) {
            console.error('Failed to load revision reference data:', err);
        }
    }, [employeeId, currentUser, hasLeaveModule]);

    // Fetch Revisions
    const fetchRevisions = useCallback(async () => {
        if (!employeeId) return;
        try {
            setLoading(true);
            const res = await api.get(`/employees/${employeeId}/revisions`);
            const revList = res.data?.revisions || [];
            setRevisions(revList);
            setScheduledCount(res.data?.scheduledCount || revList.filter(r => r.status === 'scheduled').length);
            const active = res.data?.activeRevision || revList.find(r => r.status === 'active') || revList[0] || null;
            setActiveRevision(active);
            setSelectedRevision(prev => {
                if (prev && revList.some(r => String(r._id) === String(prev._id))) {
                    return revList.find(r => String(r._id) === String(prev._id));
                }
                return active;
            });
        } catch (error) {
            console.error('Failed to fetch revisions:', error);
            toast.error(error?.response?.data?.message || 'Could not load revision history');
        } finally {
            setLoading(false);
        }
    }, [employeeId]);

    useEffect(() => {
        fetchRevisions();
        fetchReferenceData();
    }, [fetchRevisions, fetchReferenceData]);

    // Current State Helpers from Profile
    const currentEmployeeState = useMemo(() => {
        const emp = profile?.employeeProfile?.employment || profile?.employment || {};
        const comp = profile?.employeeProfile?.compensation || profile?.compensation || {};
        const userSal = profile?.salary || profile?.compensation || profile?.employeeProfile?.compensation || {};
        const breakup = (comp.salaryBreakup instanceof Map ? Object.fromEntries(comp.salaryBreakup) : comp.salaryBreakup) || (userSal.salaryBreakup instanceof Map ? Object.fromEntries(userSal.salaryBreakup) : userSal.salaryBreakup) || userSal || {};
        const monthly = parseFloat(comp.ctc || userSal.monthlyCTC || breakup.monthlyCTC || 0);

        const deptRefId = profile?.departmentRef?._id || profile?.departmentRef || emp.departmentRef || '';
        const deptObj = departments.find(d => String(d._id) === String(deptRefId));
        const deptName = deptObj?.name || (typeof profile?.department === 'object' && profile?.department?.name ? profile.department.name : (profile?.department || emp.department || 'Not Set'));

        const desigRefId = profile?.designationRef?._id || profile?.designationRef || emp.designationRef || '';
        const desigObj = designations.find(d => String(d._id) === String(desigRefId));
        const desigTitle = desigObj?.title || (typeof profile?.designation === 'object' && profile?.designation?.title ? profile.designation.title : (emp.designation || profile?.designation || 'Not Set'));

        const rawMgr = profile?.reportingManagers?.[0] || emp.reportingManager || null;
        const mgrId = rawMgr?._id || (typeof rawMgr === 'string' ? rawMgr : '');
        const mgrUser = allEmployees.find(u => String(u._id) === String(mgrId)) || (typeof rawMgr === 'object' ? rawMgr : null);
        const mgrName = mgrUser ? `${mgrUser.firstName || ''} ${mgrUser.lastName || ''} (${mgrUser.email || ''})`.trim() : 'None';

        const roleIdVal = profile?.roles?.[0]?._id || profile?.roles?.[0] || profile?.roleId || '';
        const roleObj = roles.find(r => String(r._id) === String(roleIdVal)) || (typeof profile?.roles?.[0] === 'object' ? profile.roles[0] : null);
        const roleName = roleObj?.name || (typeof profile?.roles?.[0] === 'string' ? profile.roles[0] : 'Employee');

        const annualCTC = monthly > 0 ? monthly * 12 : (breakup.annualCTC ? Number(breakup.annualCTC) : (userSal.annualCTC ? Number(userSal.annualCTC) : 0));
        const resolvedEmploymentType = profile?.employmentType || profile?.user?.employmentType || profile?.employment?.employmentType || emp.employmentType || 'Full Time';
        const resolvedAttendanceMode = profile?.attendanceMode || profile?.user?.attendanceMode || profile?.employment?.attendanceMode || emp.attendanceMode || 'clock_in_out';
        const resolvedAttendanceShift = profile?.attendanceShiftCode || profile?.user?.attendanceShiftCode || profile?.employment?.attendanceShiftCode || emp.attendanceShiftCode || 'general';

        return {
            department: deptName,
            departmentRef: deptRefId,
            designation: desigTitle,
            designationRef: desigRefId,
            primaryManagerId: mgrId,
            reportingManager: mgrName,
            employmentType: resolvedEmploymentType,
            workLocation: profile?.workLocation || profile?.user?.workLocation || emp.workLocation || emp.branch || 'Not Set',
            workforceStatus: emp.status || (profile?.isActive !== false ? 'Active' : 'Inactive'),
            isTotalWorkforce: profile?.isTotalWorkforce !== false,
            attendanceMode: resolvedAttendanceMode,
            attendanceShiftCode: resolvedAttendanceShift,
            roleId: roleIdVal,
            roleName: roleName,
            annualCTC: annualCTC,
            monthlyCTC: monthly || (annualCTC ? Math.round(annualCTC / 12) : 0),
            payType: comp.payType || breakup.compensationType || userSal.compensationType || 'salaried',
            salaryBreakup: breakup
        };
    }, [profile, departments, designations, roles, allEmployees]);

    // Salary Calculator Helper
    const calculateSalaryBreakdown = useCallback((updatedSalaryFields) => {
        setSalaryDraft(prev => {
            const mergedSalary = { ...prev, ...updatedSalaryFields };
            const payType = mergedSalary.payType || 'salaried';

            let annualCTC = parseFloat(String(mergedSalary.annualCTC || '').replace(/[^0-9.]/g, '')) || 0;
            let monthlyCTC = parseFloat(String(mergedSalary.monthlyCTC || '').replace(/[^0-9.]/g, '')) || 0;

            if (annualCTC > 0 && !updatedSalaryFields.monthlyCTC) {
                monthlyCTC = Math.round(annualCTC / 12);
            } else if (monthlyCTC > 0 && !updatedSalaryFields.annualCTC) {
                annualCTC = monthlyCTC * 12;
            }

            let basicVal = '0';
            let grossVal = '0';

            if (payType === 'hourly') {
                const hourlyRate = parseFloat(String(mergedSalary.hourlyRate || 0)) || 0;
                const hoursWorked = parseFloat(String(mergedSalary.hoursWorked || mergedSalary.standardHours || 160)) || 160;
                monthlyCTC = hourlyRate * hoursWorked;
                annualCTC = monthlyCTC * 12;
                basicVal = String(monthlyCTC);
                grossVal = String(monthlyCTC);
            } else if (payType === 'flat') {
                const flatSalary = parseFloat(String(mergedSalary.flatSalary || monthlyCTC || 0)) || 0;
                monthlyCTC = flatSalary;
                annualCTC = flatSalary * 12;
                basicVal = String(flatSalary);
                grossVal = String(flatSalary);
            }

            const source = {
                ...mergedSalary,
                monthlyCTC,
                compensationType: mergedSalary.compensationType || 'monthly_salary',
                useSalaryComponents: payType !== 'flat' && payType !== 'hourly' && parseBool(mergedSalary.useSalaryComponents, true),
                pfEnabled: parseBool(mergedSalary.pfEnabled, true),
                esiEnabled: parseBool(mergedSalary.esiEnabled, true),
                ptEnabled: parseBool(mergedSalary.ptEnabled, true),
                lwfEnabled: parseBool(mergedSalary.lwfEnabled, true),
                gratuityEnabled: parseBool(mergedSalary.gratuityEnabled, true),
                tdsEnabled: parseBool(mergedSalary.tdsEnabled, true),
                includePfInCTC: parseBool(mergedSalary.includePfInCTC, false),
                includeGratuityInCTC: parseBool(mergedSalary.includeGratuityInCTC, true),
                basicPercent: mergedSalary.basicPercent !== undefined && mergedSalary.basicPercent !== null ? Number(mergedSalary.basicPercent) : 50,
                hraPercent: mergedSalary.hraPercent !== undefined && mergedSalary.hraPercent !== null ? Number(mergedSalary.hraPercent) : 50,
                vpfPercent: mergedSalary.vpfPercent !== undefined && mergedSalary.vpfPercent !== null ? Number(mergedSalary.vpfPercent) : 0,
                insuranceAmount: parseFloat(mergedSalary.insuranceAmount) || 0,
                employerNPS: parseFloat(mergedSalary.employerNPS) || 0,
                ptState: mergedSalary.ptState || 'MH',
                customAllowances: mergedSalary.customAllowances || [],
                customDeductions: mergedSalary.customDeductions || [],
                rateCard: mergedSalary.rateCard || []
            };

            if (payrollConfig?.salaryComponents) {
                payrollConfig.salaryComponents.forEach(c => {
                    if (c.linkedTo === 'fixed') {
                        const val = mergedSalary[c.id] !== undefined ? mergedSalary[c.id] : (c.linkValue || 0);
                        source[c.id] = parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
                    }
                });
            }

            const master = buildMasterSalaryStructure(source, payrollConfig);
            if (master) {
                basicVal = String(master.basicMaster || 0);
                grossVal = String(master.totalEarnings || 0);
                mergedSalary.pfEmployer = String(master.pfEmployer || 0);
                mergedSalary.pfEmployee = String(master.pfEmployee || 0);
                mergedSalary.gratuity = String(master.gratuity || 0);
                mergedSalary.lwfEmployer = String(master.lwfEmployer || 0);
                mergedSalary.lwfEmployee = String(master.lwfEmployee || 0);
                mergedSalary.esiEmployer = String(master.esiEmployer || 0);
                mergedSalary.esiEmployee = String(master.esiEmployee || 0);
                mergedSalary.professionalTax = String(master.professionalTax || 0);
                mergedSalary.tds = String(master.tds || 0);
                mergedSalary.netTakeHome = String(master.netTakeHome || 0);

                if (master.earningsMap) {
                    Object.entries(master.earningsMap).forEach(([id, val]) => {
                        mergedSalary[id] = String(val);
                    });
                }
            }

            return {
                ...mergedSalary,
                annualCTC: String(annualCTC),
                monthlyCTC: String(monthlyCTC),
                basic: basicVal,
                monthlyGross: grossVal
            };
        });
    }, [payrollConfig]);

    // Leave Allocation State Helpers
    const updateLeaveAllocation = (leaveType, updates) => {
        setLeaveAllocations(prev => prev.map(item => {
            if (item.leaveType === leaveType) {
                return { ...item, ...updates };
            }
            return item;
        }));
    };

    const toggleLeaveEnabled = (leaveType) => {
        setLeaveAllocations(prev => prev.map(item => {
            if (item.leaveType === leaveType) {
                return { ...item, enabled: item.enabled === false ? true : false };
            }
            return item;
        }));
    };

    // Handle Click on Top Module Bundling Tabs
    const handleModuleTabClick = (modId) => {
        const isSelected = selectedModules.includes(modId);

        const openSectionState = (id, state) => {
            if (id === 'employment') setShowEmploymentSection(state);
            if (id === 'attendance') setShowAttendanceSection(state);
            if (id === 'leave') setShowLeaveSection(state);
            if (id === 'compensation') setShowSalarySection(state);
        };

        const isSectionOpen = (id) => {
            if (id === 'employment') return showEmploymentSection;
            if (id === 'attendance') return showAttendanceSection;
            if (id === 'leave') return showLeaveSection;
            if (id === 'compensation') return showSalarySection;
            return false;
        };

        if (!isSelected) {
            setSelectedModules(prev => [...prev, modId]);
            openSectionState(modId, true);
        } else {
            if (!isSectionOpen(modId)) {
                openSectionState(modId, true);
            } else {
                if (selectedModules.length > 1) {
                    setSelectedModules(prev => prev.filter(m => m !== modId));
                    openSectionState(modId, false);
                } else {
                    toast.error('At least one module must remain selected');
                    openSectionState(modId, true);
                }
            }
        }

        setTimeout(() => {
            const el = document.getElementById(`revision-section-${modId}`) || document.getElementById(`revision-edit-section-${modId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 60);
    };

    // Populate Initial Create Form State
    const initCreateForm = () => {
        setEffectiveDate(format(new Date(), 'yyyy-MM-dd'));
        setReason('');
        setIsBackdatedConfirmed(false);
        setSelectedModules(['employment']);
        setShowEmploymentSection(true);
        setShowAttendanceSection(false);
        setShowLeaveSection(false);
        setShowSalarySection(false);

        if (hasLeaveModule && leavePolicies.length > 0) {
            setLeaveAllocations(leavePolicies.map(p => ({ ...p, enabled: true })));
        } else {
            setLeaveAllocations([]);
        }

        setRevisionForm({
            departmentRef: currentEmployeeState.departmentRef || '',
            designationRef: currentEmployeeState.designationRef || '',
            primaryManagerId: currentEmployeeState.primaryManagerId || '',
            employmentType: currentEmployeeState.employmentType || 'Full Time',
            workLocation: currentEmployeeState.workLocation || '',
            isTotalWorkforce: currentEmployeeState.isTotalWorkforce !== false,
            attendanceMode: currentEmployeeState.attendanceMode || 'clock_in_out',
            attendanceShiftCode: currentEmployeeState.attendanceShiftCode || 'general',
            roleId: currentEmployeeState.roleId || ''
        });

        const comp = profile?.employeeProfile?.compensation || profile?.compensation || {};
        const breakup = comp.salaryBreakup || {};
        const defaultSal = createDefaultSalaryData(breakup, comp, profile, payrollConfig);

        setSalaryDraft(defaultSal);
        calculateSalaryBreakdown(defaultSal);
    };

    const handleOpenCreateModal = () => {
        initCreateForm();
        setShowCreateModal(true);
    };

    const handleOpenEditModal = (rev) => {
        setSelectedRevision(rev);
        const dateStr = rev.effectiveDate ? format(new Date(rev.effectiveDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
        setEffectiveDate(dateStr);
        setReason(rev.reason || '');

        const formValues = { ...currentEmployeeState };
        const activeModules = new Set(['employment']);

        (rev.changes || []).forEach(ch => {
            if (ch.module && (ch.module !== 'leave' || hasLeaveModule)) activeModules.add(ch.module);
            if (ch.field === 'department' || ch.field === 'departmentRef') formValues.departmentRef = ch.revisedValue || '';
            if (ch.field === 'designation' || ch.field === 'designationRef') formValues.designationRef = ch.revisedValue || '';
            if (ch.field === 'reportingManager' || ch.field === 'primaryManagerId') formValues.primaryManagerId = ch.revisedValue || '';
            if (ch.field === 'employmentType') formValues.employmentType = ch.revisedValue || 'Full Time';
            if (ch.field === 'workLocation') formValues.workLocation = ch.revisedValue || '';
            if (ch.field === 'isTotalWorkforce') formValues.isTotalWorkforce = Boolean(ch.revisedValue);
            if (ch.field === 'attendanceMode') formValues.attendanceMode = ch.revisedValue || 'clock_in_out';
            if (ch.field === 'attendanceShift' || ch.field === 'attendanceShiftCode') formValues.attendanceShiftCode = ch.revisedValue || 'general';
            if (ch.field === 'roles' || ch.field === 'roleId') formValues.roleId = ch.revisedValue || '';
        });

        const hasAttendanceChanges = Boolean(rev.changes?.some(c => c.module === 'attendance'));
        const hasLeaveChanges = hasLeaveModule && Boolean(rev.metadata?.leaveAllocations || rev.changes?.some(c => c.module === 'leave'));
        const hasSalaryChanges = Boolean(rev.metadata?.salaryBreakup || rev.changes?.some(c => c.module === 'compensation'));
        const hasEmploymentChanges = Boolean(rev.changes?.some(c => !c.module || c.module === 'employment'));

        setShowEmploymentSection(hasEmploymentChanges || (!hasAttendanceChanges && !hasLeaveChanges && !hasSalaryChanges));
        setShowAttendanceSection(hasAttendanceChanges);
        setShowLeaveSection(hasLeaveChanges);
        if (hasLeaveChanges) {
            activeModules.add('leave');
        }

        if (hasLeaveModule) {
            if (rev.metadata?.leaveAllocations && Array.isArray(rev.metadata.leaveAllocations)) {
                setLeaveAllocations(rev.metadata.leaveAllocations);
            } else if (leavePolicies.length > 0) {
                setLeaveAllocations(leavePolicies.map(p => ({ ...p, enabled: true })));
            }
        } else {
            setLeaveAllocations([]);
        }

        setShowSalarySection(hasSalaryChanges);
        if (hasSalaryChanges) {
            activeModules.add('compensation');
        }

        if (rev.metadata?.salaryBreakup) {
            setSalaryDraft(rev.metadata.salaryBreakup);
            calculateSalaryBreakdown(rev.metadata.salaryBreakup);
        }

        setSelectedModules(Array.from(activeModules));
        setRevisionForm(formValues);
        setShowEditModal(true);
    };

    const handleOpenCancelModal = (rev) => {
        setSelectedRevision(rev);
        setCancellingReason('');
        setShowCancelModal(true);
    };

    const handleOpenDetailsModal = (rev) => {
        setSelectedRevision(rev);
        setShowDetailsModal(true);
    };

    const isDateBackdated = useMemo(() => {
        if (!effectiveDate) return false;
        const selected = new Date(effectiveDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selected.setHours(0, 0, 0, 0);
        return selected.getTime() < today.getTime();
    }, [effectiveDate]);

    const isDateScheduledFuture = useMemo(() => {
        if (!effectiveDate) return false;
        const selected = new Date(effectiveDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selected.setHours(0, 0, 0, 0);
        return selected.getTime() > today.getTime();
    }, [effectiveDate]);

    // Build changes payload based on active modules and modified fields
    const compileChangesPayload = (forceAll = false) => {
        const changes = [];

        if (selectedModules.includes('employment')) {
            if (revisionForm.departmentRef && (forceAll || revisionForm.departmentRef !== currentEmployeeState.departmentRef)) {
                const dept = departments.find(d => String(d._id) === String(revisionForm.departmentRef));
                changes.push({
                    module: 'employment',
                    field: 'departmentRef',
                    fieldLabel: 'Department',
                    previousValue: currentEmployeeState.departmentRef || null,
                    previousDisplayValue: currentEmployeeState.department || 'Not Set',
                    revisedValue: revisionForm.departmentRef,
                    revisedDisplayValue: dept?.name || 'Not Set'
                });
            }
            if (revisionForm.designationRef && (forceAll || revisionForm.designationRef !== currentEmployeeState.designationRef)) {
                const desig = designations.find(d => String(d._id) === String(revisionForm.designationRef));
                changes.push({
                    module: 'employment',
                    field: 'designationRef',
                    fieldLabel: 'Designation',
                    previousValue: currentEmployeeState.designationRef || null,
                    previousDisplayValue: currentEmployeeState.designation || 'Not Set',
                    revisedValue: revisionForm.designationRef,
                    revisedDisplayValue: desig?.title || 'Not Set'
                });
            }
            if (revisionForm.primaryManagerId !== undefined && (forceAll || revisionForm.primaryManagerId !== currentEmployeeState.primaryManagerId)) {
                const mgr = allEmployees.find(e => String(e._id) === String(revisionForm.primaryManagerId));
                changes.push({
                    module: 'employment',
                    field: 'primaryManagerId',
                    fieldLabel: 'Reporting Manager',
                    previousValue: currentEmployeeState.primaryManagerId || null,
                    previousDisplayValue: currentEmployeeState.reportingManager || 'Not Set',
                    revisedValue: revisionForm.primaryManagerId || null,
                    revisedDisplayValue: mgr ? `${mgr.firstName} ${mgr.lastName || ''} (${mgr.email || ''})`.trim() : 'None'
                });
            }
            if (revisionForm.employmentType && (forceAll || revisionForm.employmentType !== currentEmployeeState.employmentType)) {
                changes.push({
                    module: 'employment',
                    field: 'employmentType',
                    fieldLabel: 'Employment Type',
                    previousValue: currentEmployeeState.employmentType || null,
                    previousDisplayValue: currentEmployeeState.employmentType || 'Not Set',
                    revisedValue: revisionForm.employmentType,
                    revisedDisplayValue: revisionForm.employmentType
                });
            }
            if (revisionForm.workLocation !== undefined && (forceAll || revisionForm.workLocation !== currentEmployeeState.workLocation)) {
                changes.push({
                    module: 'employment',
                    field: 'workLocation',
                    fieldLabel: 'Work Location',
                    previousValue: currentEmployeeState.workLocation || null,
                    previousDisplayValue: currentEmployeeState.workLocation || 'Not Set',
                    revisedValue: revisionForm.workLocation,
                    revisedDisplayValue: revisionForm.workLocation || 'Not Set'
                });
            }
            if (revisionForm.isTotalWorkforce !== undefined && (forceAll || revisionForm.isTotalWorkforce !== currentEmployeeState.isTotalWorkforce)) {
                changes.push({
                    module: 'employment',
                    field: 'isTotalWorkforce',
                    fieldLabel: 'Count in Total Workforce',
                    previousValue: currentEmployeeState.isTotalWorkforce,
                    revisedValue: Boolean(revisionForm.isTotalWorkforce),
                    previousDisplayValue: currentEmployeeState.isTotalWorkforce !== false ? 'Yes (Included)' : 'No (Excluded)',
                    revisedDisplayValue: revisionForm.isTotalWorkforce !== false ? 'Yes (Included)' : 'No (Excluded)'
                });
            }
            if (revisionForm.roleId && (forceAll || String(revisionForm.roleId) !== String(currentEmployeeState.roleId))) {
                const roleObj = roles.find(r => String(r._id) === String(revisionForm.roleId));
                changes.push({
                    module: 'permissions',
                    field: 'roleId',
                    fieldLabel: 'System Role',
                    previousValue: currentEmployeeState.roleId || null,
                    previousDisplayValue: roles.find(r => String(r._id) === String(currentEmployeeState.roleId))?.name || 'Employee',
                    revisedValue: revisionForm.roleId,
                    revisedDisplayValue: roleObj?.name || 'Employee'
                });
            }
        }

        if (selectedModules.includes('attendance')) {
            if (revisionForm.attendanceMode && (forceAll || revisionForm.attendanceMode !== currentEmployeeState.attendanceMode)) {
                changes.push({
                    module: 'attendance',
                    field: 'attendanceMode',
                    fieldLabel: 'Attendance Mode',
                    previousValue: currentEmployeeState.attendanceMode || null,
                    previousDisplayValue: currentEmployeeState.attendanceMode === 'clock_in_out' ? 'Clock In / Out' : currentEmployeeState.attendanceMode || 'Not Set',
                    revisedValue: revisionForm.attendanceMode,
                    revisedDisplayValue: revisionForm.attendanceMode === 'clock_in_out' ? 'Clock In / Out' : revisionForm.attendanceMode === 'present_only' ? 'Present Only' : revisionForm.attendanceMode
                });
            }
            if (revisionForm.attendanceShiftCode && (forceAll || revisionForm.attendanceShiftCode !== currentEmployeeState.attendanceShiftCode)) {
                changes.push({
                    module: 'attendance',
                    field: 'attendanceShiftCode',
                    fieldLabel: 'Attendance Shift',
                    previousValue: currentEmployeeState.attendanceShiftCode || null,
                    previousDisplayValue: currentEmployeeState.attendanceShiftCode || 'general',
                    revisedValue: revisionForm.attendanceShiftCode,
                    revisedDisplayValue: revisionForm.attendanceShiftCode
                });
            }
        }

        if (hasLeaveModule && selectedModules.includes('leave')) {
            leaveAllocations.forEach(item => {
                const prevAlloc = leavePolicies.find(p => p.leaveType === item.leaveType);
                const prevBal = prevAlloc?.currentClosingBalance ?? prevAlloc?.allocatedBalance ?? 0;
                const isEnabled = item.enabled !== false;

                if (!isEnabled) {
                    if (prevAlloc) {
                        changes.push({
                            module: 'leave',
                            field: `leave_${item.leaveType}`,
                            fieldLabel: `${item.name} (${item.leaveType})`,
                            previousValue: prevAlloc ? { ...prevAlloc } : null,
                            revisedValue: { ...item, enabled: false, allocatedBalance: 0 },
                            previousDisplayValue: `${prevBal} Days`,
                            revisedDisplayValue: 'Excluded / Removed (0 Days)'
                        });
                    }
                    return;
                }

                const revBal = parseFloat(item.allocatedBalance) || 0;
                const accrual = item.accrualAmount > 0 ? `+${item.accrualAmount}/${item.accrualType === 'Monthly' ? 'mo' : 'yr'}` : (item.accrualType === 'None' ? 'No accrual' : 'Policy fixed');
                const cf = item.carryForward ? `CF: ${item.carryForwardFrequency || 'Monthly'} (Max ${item.maxCarryForward || '∞'})` : 'CF: No';
                const exp = Number(item.expiryMonths) === 2
                    ? 'Expires: 2mo reset'
                    : Number(item.expiryMonths) === 3
                    ? 'Expires: Quarterly'
                    : Number(item.expiryMonths) === 12
                    ? 'Expires: Year-end'
                    : Number(item.expiryMonths) > 0
                    ? `Expires: ${item.expiryMonths}mo`
                    : (item.expiryBalance ? `Exp Cap: >${item.expiryBalance}` : '');
                const summary = [accrual, cf, exp].filter(Boolean).join(' • ');

                changes.push({
                    module: 'leave',
                    field: `leave_${item.leaveType}`,
                    fieldLabel: `${item.name} (${item.leaveType})`,
                    previousValue: prevAlloc ? { ...prevAlloc } : null,
                    revisedValue: { ...item, enabled: true },
                    previousDisplayValue: prevAlloc ? `${prevBal} Days` : 'Not Assigned',
                    revisedDisplayValue: `${revBal} Days (${summary})`
                });
            });
        }

        if (selectedModules.includes('compensation')) {
            const numAnnualCTC = parseFloat(String(salaryDraft.annualCTC || '').replace(/[^0-9.]/g, '')) || 0;
            const numMonthlyCTC = parseFloat(String(salaryDraft.monthlyCTC || '').replace(/[^0-9.]/g, '')) || (numAnnualCTC ? Math.round(numAnnualCTC / 12) : 0);

            if (numAnnualCTC > 0 || numMonthlyCTC > 0) {
                changes.push({
                    module: 'compensation',
                    field: 'annualCTC',
                    fieldLabel: 'Annual CTC',
                    previousValue: currentEmployeeState.annualCTC || 0,
                    revisedValue: numAnnualCTC || numMonthlyCTC * 12,
                    previousDisplayValue: currentEmployeeState.annualCTC ? `₹${currentEmployeeState.annualCTC.toLocaleString('en-IN')}/yr` : 'Not Set',
                    revisedDisplayValue: `₹${(numAnnualCTC || numMonthlyCTC * 12).toLocaleString('en-IN')}/yr`
                });

                if (salaryDraft.netTakeHome) {
                    changes.push({
                        module: 'compensation',
                        field: 'netTakeHome',
                        fieldLabel: 'Net Take Home Pay',
                        previousValue: null,
                        revisedValue: Number(salaryDraft.netTakeHome) || 0,
                        previousDisplayValue: '—',
                        revisedDisplayValue: `₹${Number(salaryDraft.netTakeHome).toLocaleString('en-IN')}/mo`
                    });
                }
            }
        }

        return changes;
    };

    // Submit Create Revision
    const handleCreateRevision = async (e) => {
        e.preventDefault();
        const changes = compileChangesPayload(false);

        if (changes.length === 0) {
            toast.error('No field changes detected. Please modify at least one field before saving.');
            return;
        }

        if (isDateBackdated && !isBackdatedConfirmed) {
            toast.error('Please confirm backdated retroactive acknowledgment before submitting.');
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                effectiveDate,
                reason: reason.trim() || 'General detail revision',
                changes,
                isBackdatedConfirmed,
                confirmBackdated: isBackdatedConfirmed,
                metadata: {
                    previousSnapshot: currentEmployeeState,
                    salaryBreakup: selectedModules.includes('compensation') ? { ...salaryDraft } : null,
                    leaveAllocations: (hasLeaveModule && selectedModules.includes('leave')) ? [...leaveAllocations] : null
                }
            };

            const res = await api.post(`/employees/${employeeId}/revisions`, payload);
            toast.success(res.data?.message || 'Revision created successfully');
            setShowCreateModal(false);
            await fetchRevisions();

            if (onRevisionApplied && res.data?.isApplied) {
                onRevisionApplied();
            }
        } catch (error) {
            console.error('Failed to create revision:', error);
            toast.error(error?.response?.data?.message || 'Failed to submit revision');
        } finally {
            setSubmitting(false);
        }
    };

    // Submit Edit Revision (Scheduled or Active)
    const handleUpdateScheduledRevision = async (e) => {
        e.preventDefault();
        if (!selectedRevision) return;

        const changes = compileChangesPayload(true);
        if (changes.length === 0) {
            toast.error('No field changes detected for update.');
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                effectiveDate,
                reason: reason.trim() || 'Updated revision details',
                changes,
                metadata: {
                    previousSnapshot: selectedRevision.metadata?.previousSnapshot || currentEmployeeState,
                    salaryBreakup: selectedModules.includes('compensation') ? { ...salaryDraft } : null,
                    leaveAllocations: (hasLeaveModule && selectedModules.includes('leave')) ? [...leaveAllocations] : null
                }
            };

            const res = await api.patch(`/employees/${employeeId}/revisions/${selectedRevision._id}`, payload);
            toast.success(res.data?.message || 'Revision details updated successfully');
            setShowEditModal(false);
            await fetchRevisions();
            if (onRevisionApplied) {
                onRevisionApplied();
            }
        } catch (error) {
            console.error('Failed to update revision:', error);
            toast.error(error?.response?.data?.message || 'Failed to update revision');
        } finally {
            setSubmitting(false);
        }
    };

    // Submit Cancel Scheduled Revision
    const handleCancelRevision = async () => {
        if (!selectedRevision) return;
        try {
            setSubmitting(true);
            await api.delete(`/employees/${employeeId}/revisions/${selectedRevision._id}`, {
                data: { reason: cancellingReason.trim() }
            });
            toast.success('Scheduled revision cancelled successfully');
            setShowCancelModal(false);
            await fetchRevisions();
        } catch (error) {
            console.error('Failed to cancel revision:', error);
            toast.error(error?.response?.data?.message || 'Failed to cancel scheduled revision');
        } finally {
            setSubmitting(false);
        }
    };

    // Filtered Revisions List
    const filteredRevisions = useMemo(() => {
        if (statusFilter === 'all') return revisions;
        return revisions.filter(r => r.status === statusFilter);
    }, [revisions, statusFilter]);

    // Status Badge Helper
    const renderStatusBadge = (status) => {
        switch (status) {
            case 'scheduled':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Scheduled
                    </span>
                );
            case 'active':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle size={10} className="text-emerald-600" />
                        Active (Current)
                    </span>
                );
            case 'superseded':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        <History size={10} className="text-slate-400" />
                        Superseded
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        <X size={10} className="text-rose-500" />
                        Cancelled
                    </span>
                );
            default:
                return <span className="text-[10px] text-slate-500">{status}</span>;
        }
    };

    const isSalariedMode = salaryDraft.payType !== 'hourly' && salaryDraft.payType !== 'flat';
    const isStructuredMode = parseBool(salaryDraft.useSalaryComponents, true);

    return (
        <div className="space-y-4 text-slate-700">
            {/* Header & Action Bar */}
            <div className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                        <History size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 leading-tight">Revised Details & Effective History</h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Track, schedule, and backdate core employee changes while maintaining full audit trails.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchRevisions}
                        disabled={loading}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        title="Refresh revision history"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>

                    {canCreateRevision && (
                        <button
                            onClick={handleOpenCreateModal}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-2xs shadow-blue-500/20 transition-all hover:shadow-xs"
                        >
                            <Plus size={14} /> Schedule / Revise Details
                        </button>
                    )}
                </div>
            </div>

            {/* Scheduled Revisions Spotlight Banner */}
            {scheduledCount > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-amber-100/40 border border-amber-200 rounded-xl p-3.5 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                            <Clock size={14} className="text-amber-600" />
                            <span>Upcoming Scheduled Revisions ({scheduledCount})</span>
                        </div>
                        <span className="text-[10px] text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-full font-semibold">
                            Auto-applies at 00:00 on due date
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-0.5">
                        {revisions.filter(r => r.status === 'scheduled').map(rev => (
                            <div key={rev._id} className="bg-white p-3 rounded-lg border border-amber-200/80 shadow-2xs flex flex-col justify-between gap-2">
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                            <Calendar size={12} className="text-amber-600" />
                                            Effective: {format(new Date(rev.effectiveDate), 'dd MMM yyyy')}
                                        </span>
                                        {renderStatusBadge('scheduled')}
                                    </div>
                                    <p className="text-[11px] text-slate-600 line-clamp-1">
                                        Reason: {rev.reason || 'Scheduled revision'}
                                    </p>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {(rev.changes || [])
                                            .filter(ch => hasLeaveModule || ch.module !== 'leave')
                                            .map((ch, i) => (
                                                <span key={i} className="text-[9px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                                    {ch.fieldLabel || ch.field}: <span className="text-amber-700">{ch.revisedDisplayValue}</span>
                                                </span>
                                            ))}
                                    </div>
                                </div>

                                {(canEditRevision || canCancelRevision) && (
                                    <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100">
                                        {canEditRevision && (
                                            <button
                                                onClick={() => handleOpenEditModal(rev)}
                                                className="px-2.5 py-1 rounded text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1 transition-colors"
                                            >
                                                <Edit2 size={10} /> Edit
                                            </button>
                                        )}
                                        {canCancelRevision && (
                                            <button
                                                onClick={() => handleOpenCancelModal(rev)}
                                                className="px-2.5 py-1 rounded text-[10px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 flex items-center gap-1 transition-colors"
                                            >
                                                <Trash2 size={10} /> Cancel
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Direct Inline Revision View & Version Switcher */}
            {loading ? (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                </div>
            ) : revisions.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-2xs space-y-3">
                    <History size={36} className="mx-auto text-slate-300" />
                    <h3 className="text-sm font-bold text-slate-700">No revisions recorded yet</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Track, schedule, or backdate core changes across employment, attendance, and compensation with full audit history.
                    </p>
                    {canCreateRevision && (
                        <button
                            type="button"
                            onClick={handleOpenCreateModal}
                            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition cursor-pointer"
                        >
                            <Plus size={14} /> Create First Revision
                        </button>
                    )}
                </div>
            ) : selectedRevision ? (
                <div className="space-y-4">
                    {/* Revision Version Selector Pills */}
                    <div className="bg-white rounded-2xl p-3 shadow-2xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 mr-1 flex items-center gap-1.5">
                                <History size={14} className="text-blue-600" />
                                Revision Timeline:
                            </span>
                            {revisions.map((rev) => {
                                const isSelected = selectedRevision && String(selectedRevision._id) === String(rev._id);
                                const isScheduled = rev.status === 'scheduled';
                                const isActive = rev.status === 'active';
                                const isBaseline = rev.isInitialBaseline;

                                return (
                                    <button
                                        key={rev._id}
                                        type="button"
                                        onClick={() => setSelectedRevision(rev)}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                                            isSelected
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/25 scale-[1.02]'
                                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <Calendar size={13} className={isSelected ? 'text-white' : 'text-slate-400'} />
                                        <span>{rev.effectiveDate ? format(new Date(rev.effectiveDate), 'dd MMM yyyy') : '—'}</span>
                                        
                                        {isBaseline ? (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                                isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                            }`}>
                                                Baseline #1
                                            </span>
                                        ) : isScheduled ? (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                isSelected ? 'bg-amber-400 text-amber-950' : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                Scheduled
                                            </span>
                                        ) : isActive ? (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                isSelected ? 'bg-emerald-400 text-emerald-950' : 'bg-emerald-100 text-emerald-800'
                                            }`}>
                                                Active
                                            </span>
                                        ) : (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                                            }`}>
                                                {rev.status}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Action buttons for Selected Revision */}
                        <div className="flex items-center gap-2">
                            {canEditRevision && selectedRevision.status !== 'cancelled' && (
                                <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(selectedRevision)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                                >
                                    <Edit2 size={13} /> Edit Revision Details
                                </button>
                            )}
                            {selectedRevision.status === 'scheduled' && canCancelRevision && (
                                <button
                                    type="button"
                                    onClick={() => handleOpenCancelModal(selectedRevision)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                                >
                                    <Trash2 size={13} /> Cancel Scheduled
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Direct Inline Revision Diff Container (Image 2) */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
                        {/* Top Metadata Bar */}
                        <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-6 flex-wrap text-xs">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-blue-600" />
                                    <span className="text-slate-500 font-medium">Effective Date:</span>
                                    <span className="font-bold text-slate-800">
                                        {selectedRevision.effectiveDate ? format(new Date(selectedRevision.effectiveDate), 'dd MMMM yyyy') : '—'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User size={14} className="text-indigo-600" />
                                    <span className="text-slate-500 font-medium">Created By:</span>
                                    <span className="font-bold text-slate-800">
                                        {selectedRevision.createdBy ? `${selectedRevision.createdBy.firstName} ${selectedRevision.createdBy.lastName || ''}`.trim() : 'System'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-emerald-600" />
                                    <span className="text-slate-500 font-medium">Applied Date:</span>
                                    <span className="font-bold text-slate-800">
                                        {selectedRevision.appliedAt ? format(new Date(selectedRevision.appliedAt), 'dd MMM yyyy, hh:mm a') : selectedRevision.status === 'scheduled' ? 'Scheduled' : 'Immediately'}
                                    </span>
                                </div>
                            </div>

                            {selectedRevision.reason && (
                                <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 max-w-md truncate">
                                    <span className="font-bold text-slate-700 shrink-0">Reason:</span>
                                    <span className="truncate" title={selectedRevision.reason}>{selectedRevision.reason}</span>
                                </div>
                            )}
                        </div>

                        {/* Content Body - Dedicated Baseline Onboarding View vs Side-by-Side Revision Diff */}
                        <div className="p-5 sm:p-6 space-y-6">
                            {(() => {
                                const allChanges = selectedRevision.changes || [];
                                const isBaseline = Boolean(selectedRevision.isInitialBaseline);

                                const changesByField = {};
                                allChanges.forEach(ch => {
                                    changesByField[ch.field] = ch;
                                });

                                // Resolved current/fallback values
                                const empState = currentEmployeeState;
                                const firstNameVal = profile?.firstName || '—';
                                const lastNameVal = profile?.lastName || '';
                                const emailVal = profile?.email || '—';
                                const empCodeVal = profile?.employeeCode || 'Not Set';
                                const rawJoining = profile?.dateOfJoining || profile?.joiningDate || profile?.createdAt;
                                const joiningDateFormatted = rawJoining ? format(new Date(rawJoining), 'dd MMMM yyyy') : '—';

                                const deptVal = changesByField['department']?.revisedDisplayValue || changesByField['departmentRef']?.revisedDisplayValue || empState.department || 'Not Set';
                                const desigVal = changesByField['designation']?.revisedDisplayValue || changesByField['designationRef']?.revisedDisplayValue || empState.designation || 'Not Set';
                                const mgrVal = changesByField['primaryManagerId']?.revisedDisplayValue || changesByField['reportingManager']?.revisedDisplayValue || empState.reportingManager || 'None';
                                const empTypeVal = changesByField['employmentType']?.revisedDisplayValue || empState.employmentType || 'Full Time';
                                const workLocVal = changesByField['workLocation']?.revisedDisplayValue || empState.workLocation || 'Not Set';
                                const roleVal = changesByField['roleId']?.revisedDisplayValue || changesByField['roles']?.revisedDisplayValue || empState.roleName || 'Employee';
                                const isTotalWorkforceVal = changesByField['isTotalWorkforce'] !== undefined ? (Boolean(changesByField['isTotalWorkforce'].revisedValue) ? 'Yes (Counted in total workforce)' : 'No (Excluded from headcount)') : (empState.isTotalWorkforce ? 'Yes (Counted in total workforce)' : 'No (Excluded from headcount)');

                                const attModeVal = changesByField['attendanceMode']?.revisedDisplayValue || (empState.attendanceMode === 'clock_in_out' ? 'Clock In / Out (Standard)' : empState.attendanceMode === 'present_only' ? 'Present Only' : empState.attendanceMode || 'Clock In / Out');
                                const attShiftVal = changesByField['attendanceShiftCode']?.revisedDisplayValue || changesByField['attendanceShift']?.revisedDisplayValue || empState.attendanceShiftCode || 'general';

                                // Salary Data
                                const revisedSalary = selectedRevision.metadata?.salaryBreakup
                                    || profile?.salary
                                    || empState?.salaryBreakup
                                    || profile?.employeeProfile?.compensation?.salaryBreakup
                                    || profile?.compensation?.salaryBreakup
                                    || profile?.employeeProfile?.compensation
                                    || profile?.compensation
                                    || {};

                                let revAnnualCTC = parseFloat(String(revisedSalary.annualCTC || empState.annualCTC || '0').replace(/[^0-9.]/g, '')) || 0;
                                let revMonthlyCTC = parseFloat(String(revisedSalary.monthlyCTC || empState.monthlyCTC || (revAnnualCTC ? revAnnualCTC / 12 : '0')).replace(/[^0-9.]/g, '')) || 0;
                                if (!revAnnualCTC && revMonthlyCTC > 0) revAnnualCTC = revMonthlyCTC * 12;
                                if (!revMonthlyCTC && revAnnualCTC > 0) revMonthlyCTC = Math.round(revAnnualCTC / 12);

                                let revGross = parseFloat(String(revisedSalary.grossSalary || revisedSalary.monthlyGross || revMonthlyCTC || '0').replace(/[^0-9.]/g, '')) || 0;
                                let revNet = parseFloat(String(revisedSalary.netTakeHome || revGross || '0').replace(/[^0-9.]/g, '')) || 0;

                                let revBasic = parseFloat(String(revisedSalary.basic || '0').replace(/[^0-9.]/g, '')) || 0;
                                let revHra = parseFloat(String(revisedSalary.hra || '0').replace(/[^0-9.]/g, '')) || 0;
                                let revSpecial = parseFloat(String(revisedSalary.specialAllowance || '0').replace(/[^0-9.]/g, '')) || 0;
                                const revCustomAllowances = Array.isArray(revisedSalary.customAllowances) ? revisedSalary.customAllowances : [];

                                let revPfEmployer = parseFloat(String(revisedSalary.pfEmployer || '0').replace(/[^0-9.]/g, '')) || 0;
                                let revGratuity = parseFloat(String(revisedSalary.gratuity || '0').replace(/[^0-9.]/g, '')) || 0;
                                let revLwfEmployer = parseFloat(String(revisedSalary.lwfEmployer || '0').replace(/[^0-9.]/g, '')) || 0;

                                let revPfEmployee = parseFloat(String(revisedSalary.pfEmployee || '0').replace(/[^0-9.]/g, '')) || 0;
                                let revPT = parseFloat(String(revisedSalary.professionalTax || '0').replace(/[^0-9.]/g, '')) || 0;
                                let revESI = parseFloat(String(revisedSalary.esiEmployee || '0').replace(/[^0-9.]/g, '')) || 0;
                                const revCustomDeductions = Array.isArray(revisedSalary.customDeductions) ? revisedSalary.customDeductions : [];

                                if (revMonthlyCTC > 0 && revBasic === 0) {
                                    revBasic = Math.round(revMonthlyCTC * 0.5);
                                    revHra = Math.round(revBasic * 0.5);
                                    revSpecial = Math.max(0, revMonthlyCTC - (revBasic + revHra));
                                }

                                const isStructured = revisedSalary.useSalaryComponents !== false && revisedSalary.useSalaryComponents !== 'false';
                                const compType = revisedSalary.compensationType || 'monthly_salary';
                                const attMode = revisedSalary.attendanceMode || 'attendance';

                                // -------------------------------------------------------------
                                // VIEW 1: INITIAL BASELINE ONBOARDING VIEW (When isBaseline = true)
                                // -------------------------------------------------------------
                                if (isBaseline) {
                                    return (
                                        <div className="space-y-6">
                                            {/* Master 2-Column Grid */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                {/* Card 1: Basic Identity & Account */}
                                                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                                                    <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center gap-2 font-bold text-xs text-slate-800">
                                                        <User size={15} className="text-blue-600" />
                                                        <span>Basic Profile & Account Identity</span>
                                                    </div>
                                                    <div className="divide-y divide-slate-100 text-xs">
                                                        <div className="px-4 py-2.5 flex items-center justify-between">
                                                            <span className="text-slate-500 font-medium">Full Name</span>
                                                            <span className="font-bold text-slate-800">{firstNameVal} {lastNameVal}</span>
                                                        </div>
                                                        <div className="px-4 py-2.5 flex items-center justify-between">
                                                            <span className="text-slate-500 font-medium">Work Email</span>
                                                            <span className="font-semibold text-slate-800">{emailVal}</span>
                                                        </div>
                                                        <div className="px-4 py-2.5 flex items-center justify-between">
                                                            <span className="text-slate-500 font-medium">Employee Code</span>
                                                            <span className="font-semibold text-slate-800">{empCodeVal}</span>
                                                        </div>
                                                        <div className="px-4 py-2.5 flex items-center justify-between">
                                                            <span className="text-slate-500 font-medium">Date of Joining</span>
                                                            <span className="font-semibold text-slate-800">{joiningDateFormatted}</span>
                                                        </div>
                                                        <div className="px-4 py-2.5 flex items-center justify-between">
                                                            <span className="text-slate-500 font-medium">Total Workforce Headcount</span>
                                                            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                                {isTotalWorkforceVal}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card 2: Employment & Org Structure */}
                                                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                                                    <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center gap-2 font-bold text-xs text-slate-800">
                                                        <Briefcase size={15} className="text-blue-600" />
                                                        <span>Employment & Org Structure</span>
                                                    </div>
                                                    <div className="divide-y divide-slate-100 text-xs">
                                                        <div className="px-4 py-2.5 flex items-center justify-between">
                                                            <span className="text-slate-500 font-medium">Department</span>
                                                            <span className="font-bold text-slate-800">{deptVal}</span>
                                                        </div>
                                                        <div className="px-4 py-2.5 flex items-center justify-between">
                                                            <span className="text-slate-500 font-medium">Designation</span>
                                                            <span className="font-bold text-slate-800">{desigVal}</span>
                                                        </div>
                                                        <div className="px-4 py-2.5 flex items-center justify-between">
                                                            <span className="text-slate-500 font-medium">Primary Reporting Manager</span>
                                                            <span className="font-semibold text-slate-800">{mgrVal}</span>
                                                        </div>
                                                        <div className="px-4 py-2.5 flex items-center justify-between">
                                                            <span className="text-slate-500 font-medium">Employment Type</span>
                                                            <span className="font-semibold text-slate-800">{empTypeVal}</span>
                                                        </div>
                                                        <div className="px-4 py-2.5 flex items-center justify-between">
                                                            <span className="text-slate-500 font-medium">Work Location</span>
                                                            <span className="font-semibold text-slate-800">{workLocVal}</span>
                                                        </div>
                                                        <div className="px-4 py-2.5 flex items-center justify-between">
                                                            <span className="text-slate-500 font-medium">System Permission / Role</span>
                                                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                                                                {roleVal}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card 3: Attendance & Shifts */}
                                            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                                                <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center gap-2 font-bold text-xs text-slate-800">
                                                    <Clock size={15} className="text-amber-600" />
                                                    <span>Attendance & Shift Setup</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 text-xs">
                                                    <div className="px-4 py-3 flex items-center justify-between">
                                                        <span className="text-slate-500 font-medium">Attendance Mode</span>
                                                        <span className="font-semibold text-slate-800">{attModeVal}</span>
                                                    </div>
                                                    <div className="px-4 py-3 flex items-center justify-between">
                                                        <span className="text-slate-500 font-medium">Default Shift</span>
                                                        <span className="font-semibold text-slate-800">{attShiftVal}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card 4: Assigned Leave Policies */}
                                            {hasLeaveModule && (
                                                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                                                    <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                                        <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                                                            <CalendarDays size={15} className="text-purple-600" />
                                                            <span>Assigned Leave Balances & Accrual Rules</span>
                                                        </div>
                                                    </div>
                                                    {leavePolicies.length > 0 ? (
                                                        <div className="divide-y divide-slate-100 text-xs">
                                                            {leavePolicies.map((lp, idx) => (
                                                                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-bold text-slate-900">{lp.name} ({lp.leaveType})</span>
                                                                            {lp.isPaid ? (
                                                                                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">Paid</span>
                                                                            ) : (
                                                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">Unpaid</span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                                                            Accrual: <span className="font-medium text-slate-700">{lp.accrualType} (+{lp.accrualAmount} / cycle)</span> • Carry Forward: <span className="font-medium text-slate-700">{lp.carryForward ? `Max ${lp.maxCarryForward || '∞'} days` : 'Disabled'}</span>
                                                                        </p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                                                                            {lp.allocatedBalance !== undefined ? lp.allocatedBalance : (lp.currentClosingBalance || 0)} Days
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 text-center text-xs text-slate-400">
                                                            Standard company leave policy applies.
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Card 5: Baseline Compensation & Salary Structure */}
                                            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                                                <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                                    <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                                                        <DollarSign size={15} className="text-emerald-600" />
                                                        <span>Baseline Compensation & Master Salary Breakdown</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                                        {isStructured ? 'Structured Master Formula' : 'Fixed Lump-Sum'}
                                                    </span>
                                                </div>
                                                <div className="p-4 space-y-4">
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Annual CTC</p>
                                                            <p className="text-sm font-bold text-slate-900 mt-0.5">₹{revAnnualCTC.toLocaleString('en-IN')}</p>
                                                        </div>
                                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Monthly CTC</p>
                                                            <p className="text-sm font-bold text-slate-900 mt-0.5">₹{revMonthlyCTC.toLocaleString('en-IN')}</p>
                                                        </div>
                                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Monthly Gross</p>
                                                            <p className="text-sm font-bold text-blue-700 mt-0.5">₹{revGross.toLocaleString('en-IN')}</p>
                                                        </div>
                                                        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                                                            <p className="text-[10px] font-bold text-emerald-700 uppercase">Net Take-Home</p>
                                                            <p className="text-sm font-bold text-emerald-800 mt-0.5">₹{revNet.toLocaleString('en-IN')}</p>
                                                        </div>
                                                    </div>

                                                    {isStructured && (
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                                            {/* Earnings */}
                                                            <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                                                                <div className="flex items-center justify-between border-b border-slate-200/80 pb-1 font-bold text-slate-700 text-[10px] uppercase">
                                                                    <span>Earnings</span>
                                                                    <span className="text-[9px] text-slate-400">Monthly</span>
                                                                </div>
                                                                <div className="flex justify-between py-0.5 text-[11px]">
                                                                    <span className="text-slate-600">Basic</span>
                                                                    <span className="font-semibold text-slate-900">₹{revBasic.toLocaleString('en-IN')}</span>
                                                                </div>
                                                                <div className="flex justify-between py-0.5 text-[11px]">
                                                                    <span className="text-slate-600">HRA</span>
                                                                    <span className="font-semibold text-slate-900">₹{revHra.toLocaleString('en-IN')}</span>
                                                                </div>
                                                                {revSpecial > 0 && (
                                                                    <div className="flex justify-between py-0.5 text-[11px]">
                                                                        <span className="text-slate-600">Special Allowance</span>
                                                                        <span className="font-semibold text-slate-900">₹{revSpecial.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                )}
                                                                {revCustomAllowances.map((ca, i) => (
                                                                    <div key={i} className="flex justify-between py-0.5 text-[11px]">
                                                                        <span className="text-slate-600 truncate">{ca.name || 'Allowance'}</span>
                                                                        <span className="font-semibold text-slate-900">₹{parseFloat(ca.amount || 0).toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                ))}
                                                                <div className="flex justify-between pt-1 font-bold text-slate-900 border-t border-slate-200 text-[11px]">
                                                                    <span>Gross Earnings</span>
                                                                    <span className="text-blue-700">₹{revGross.toLocaleString('en-IN')}</span>
                                                                </div>
                                                            </div>

                                                            {/* Employer Contributions */}
                                                            <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                                                                <div className="flex items-center justify-between border-b border-slate-200/80 pb-1 font-bold text-slate-700 text-[10px] uppercase">
                                                                    <span>Employer Cost</span>
                                                                    <span className="text-[9px] text-slate-400">CTC Portion</span>
                                                                </div>
                                                                <div className="flex justify-between py-0.5 text-[11px]">
                                                                    <span className="text-slate-600">PF (12%)</span>
                                                                    <span className="font-semibold text-slate-900">₹{revPfEmployer.toLocaleString('en-IN')}</span>
                                                                </div>
                                                                <div className="flex justify-between py-0.5 text-[11px]">
                                                                    <span className="text-slate-600">Gratuity (4.81%)</span>
                                                                    <span className="font-semibold text-slate-900">₹{revGratuity.toLocaleString('en-IN')}</span>
                                                                </div>
                                                                {revLwfEmployer > 0 && (
                                                                    <div className="flex justify-between py-0.5 text-[11px]">
                                                                        <span className="text-slate-600">LWF</span>
                                                                        <span className="font-semibold text-slate-900">₹{revLwfEmployer.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between pt-1 font-bold text-slate-900 border-t border-slate-200 text-[11px]">
                                                                    <span>Total CTC/mo</span>
                                                                    <span className="text-slate-900">₹{revMonthlyCTC.toLocaleString('en-IN')}</span>
                                                                </div>
                                                            </div>

                                                            {/* Deductions */}
                                                            <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                                                                <div className="flex items-center justify-between border-b border-slate-200/80 pb-1 font-bold text-slate-700 text-[10px] uppercase">
                                                                    <span>Deductions</span>
                                                                    <span className="text-[9px] text-slate-400">Take-Home</span>
                                                                </div>
                                                                <div className="flex justify-between py-0.5 text-[11px]">
                                                                    <span className="text-slate-600">PF (12%)</span>
                                                                    <span className="font-semibold text-rose-600">₹{revPfEmployee.toLocaleString('en-IN')}</span>
                                                                </div>
                                                                <div className="flex justify-between py-0.5 text-[11px]">
                                                                    <span className="text-slate-600">Professional Tax</span>
                                                                    <span className="font-semibold text-rose-600">₹{revPT.toLocaleString('en-IN')}</span>
                                                                </div>
                                                                {revESI > 0 && (
                                                                    <div className="flex justify-between py-0.5 text-[11px]">
                                                                        <span className="text-slate-600">ESI</span>
                                                                        <span className="font-semibold text-rose-600">₹{revESI.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                )}
                                                                {revCustomDeductions.map((cd, i) => (
                                                                    <div key={i} className="flex justify-between py-0.5 text-[11px]">
                                                                        <span className="text-slate-600 truncate">{cd.name || 'Deduction'}</span>
                                                                        <span className="font-semibold text-rose-600">₹{parseFloat(cd.amount || 0).toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                ))}
                                                                <div className="flex justify-between pt-1 font-bold text-slate-900 border-t border-slate-200 text-[11px]">
                                                                    <span>Net Take-Home</span>
                                                                    <span className="text-emerald-700">₹{revNet.toLocaleString('en-IN')}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                // -------------------------------------------------------------
                                // VIEW 2: 2-COLUMN SIDE-BY-SIDE REVISION DIFF VIEW (Default)
                                // -------------------------------------------------------------
                                const basicFields = [
                                    { label: 'First Name', before: firstNameVal, after: firstNameVal, isChanged: false },
                                    { label: 'Last Name', before: lastNameVal || '—', after: lastNameVal || '—', isChanged: false },
                                    { label: 'Email Address', before: emailVal, after: emailVal, isChanged: false },
                                    { label: 'Employee Code', before: empCodeVal, after: empCodeVal, isChanged: false },
                                    { label: 'Date of Joining', before: joiningDateFormatted, after: joiningDateFormatted, isChanged: false }
                                ];

                                const currentIndex = revisions.findIndex(r => String(r._id) === String(selectedRevision._id));
                                const priorRevision = currentIndex >= 0 && currentIndex + 1 < revisions.length ? revisions[currentIndex + 1] : null;
                                const prevSnap = selectedRevision.metadata?.previousSnapshot || (priorRevision ? {
                                    ...(priorRevision.metadata?.previousSnapshot || {}),
                                    salaryBreakup: priorRevision.metadata?.salaryBreakup || priorRevision.metadata?.previousSnapshot?.salaryBreakup
                                } : {});

                                const empFields = [
                                    {
                                        label: 'Department',
                                        before: changesByField['department']?.previousDisplayValue || changesByField['departmentRef']?.previousDisplayValue || prevSnap.department || 'Engineering',
                                        after: deptVal,
                                        isChanged: Boolean(changesByField['department'] || changesByField['departmentRef'])
                                    },
                                    {
                                        label: 'Designation',
                                        before: changesByField['designation']?.previousDisplayValue || changesByField['designationRef']?.previousDisplayValue || prevSnap.designation || 'Software Developer',
                                        after: desigVal,
                                        isChanged: Boolean(changesByField['designation'] || changesByField['designationRef'])
                                    },
                                    {
                                        label: 'Primary Reporting Manager',
                                        before: changesByField['primaryManagerId']?.previousDisplayValue || changesByField['reportingManager']?.previousDisplayValue || prevSnap.reportingManager || 'None',
                                        after: mgrVal,
                                        isChanged: Boolean(changesByField['primaryManagerId'] || changesByField['reportingManager'])
                                    },
                                    {
                                        label: 'Employment Type',
                                        before: changesByField['employmentType']?.previousDisplayValue || prevSnap.employmentType || 'Part Time',
                                        after: empTypeVal,
                                        isChanged: Boolean(changesByField['employmentType'])
                                    },
                                    {
                                        label: 'Work Location',
                                        before: changesByField['workLocation']?.previousDisplayValue || prevSnap.workLocation || 'Gurugram',
                                        after: workLocVal,
                                        isChanged: Boolean(changesByField['workLocation'])
                                    },
                                    {
                                        label: 'Total Workforce',
                                        before: changesByField['isTotalWorkforce'] ? (changesByField['isTotalWorkforce'].previousDisplayValue || (changesByField['isTotalWorkforce'].previousValue ? 'Yes (Included)' : 'No (Excluded)')) : (prevSnap.isTotalWorkforce !== undefined ? (prevSnap.isTotalWorkforce ? 'Yes (Included)' : 'No (Excluded)') : 'Yes (Included)'),
                                        after: changesByField['isTotalWorkforce'] ? (changesByField['isTotalWorkforce'].revisedDisplayValue || (changesByField['isTotalWorkforce'].revisedValue ? 'Yes (Included)' : 'No (Excluded)')) : 'Yes (Included)',
                                        isChanged: Boolean(changesByField['isTotalWorkforce'])
                                    },
                                    {
                                        label: 'System Permission',
                                        before: changesByField['roleId']?.previousDisplayValue || changesByField['roles']?.previousDisplayValue || prevSnap.roleName || 'Supervisor',
                                        after: roleVal,
                                        isChanged: Boolean(changesByField['roleId'] || changesByField['roles'])
                                    }
                                ];

                                const attFields = [
                                    {
                                        label: 'Attendance Mode',
                                        before: changesByField['attendanceMode']?.previousDisplayValue || (prevSnap.attendanceMode === 'clock_in_out' ? 'Clock In / Out' : prevSnap.attendanceMode === 'present_only' ? 'Present Only' : prevSnap.attendanceMode || 'Clock In / Out'),
                                        after: attModeVal,
                                        isChanged: Boolean(changesByField['attendanceMode'])
                                    },
                                    {
                                        label: 'Attendance Shift',
                                        before: changesByField['attendanceShiftCode']?.previousDisplayValue || changesByField['attendanceShift']?.previousDisplayValue || (prevSnap.attendanceShiftCode === 'general' ? 'General Shift (Default)' : prevSnap.attendanceShiftCode || 'General Shift (Default)'),
                                        after: attShiftVal,
                                        isChanged: Boolean(changesByField['attendanceShiftCode'] || changesByField['attendanceShift'])
                                    }
                                ];

                                const leaveDiffItems = allChanges.filter(c => c.module === 'leave');

                                // Prior Compensation Resolution
                                const prevSalary = prevSnap.salaryBreakup || {};
                                const prevAnnualNum = parseFloat(String(changesByField['annualCTC']?.previousValue || prevSalary.annualCTC || prevSnap.annualCTC || '0').replace(/[^0-9.]/g, '')) || 0;
                                const prevMonthlyNum = parseFloat(String(prevSalary.monthlyCTC || prevSnap.monthlyCTC || (prevAnnualNum ? prevAnnualNum / 12 : '0')).replace(/[^0-9.]/g, '')) || 0;
                                const prevGross = parseFloat(String(prevSalary.grossSalary || prevSalary.monthlyGross || prevMonthlyNum || '0').replace(/[^0-9.]/g, '')) || 0;
                                const prevNet = parseFloat(String(changesByField['netTakeHome']?.previousValue || prevSalary.netTakeHome || prevGross || '0').replace(/[^0-9.]/g, '')) || 0;
                                const prevBasic = parseFloat(String(prevSalary.basic || (prevMonthlyNum ? prevMonthlyNum * 0.5 : '0')).replace(/[^0-9.]/g, '')) || 0;
                                const prevHra = parseFloat(String(prevSalary.hra || (prevBasic ? prevBasic * 0.5 : '0')).replace(/[^0-9.]/g, '')) || 0;
                                const hasPrevSalary = prevAnnualNum > 0 || prevMonthlyNum > 0 || Object.keys(prevSalary).length > 0;

                                return (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Left Column: Prior State */}
                                        <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-5 space-y-5 flex flex-col justify-between">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                                                    <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
                                                        Prior State (Before Revision)
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 font-medium">
                                                        Prior to this revision
                                                    </span>
                                                </div>

                                                {/* Basic Info */}
                                                <div className="space-y-1.5">
                                                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                        <User size={13} className="text-slate-400" />
                                                        Basic Profile & Account
                                                    </h5>
                                                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-2xs overflow-hidden">
                                                        {basicFields.map((f, idx) => (
                                                            <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                                                                <span className="text-slate-500 font-medium">{f.label}</span>
                                                                <span className="text-slate-700 font-semibold">{f.before}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                 {/* Employment & Org */}
                                                <div className="space-y-1.5">
                                                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                        <Briefcase size={13} className="text-slate-400" />
                                                        Employment & Org Structure
                                                    </h5>
                                                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-2xs overflow-hidden">
                                                        {empFields.map((f, idx) => (
                                                            <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                                                                <span className="text-slate-500 font-medium">{f.label}</span>
                                                                <span className="text-slate-700 font-semibold">{f.before}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Attendance */}
                                                <div className="space-y-1.5">
                                                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                        <Clock size={13} className="text-slate-400" />
                                                        Attendance & Shifts
                                                    </h5>
                                                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-2xs overflow-hidden">
                                                        {attFields.map((f, idx) => (
                                                            <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                                                                <span className="text-slate-500 font-medium">{f.label}</span>
                                                                <span className="text-slate-700 font-semibold">{f.before}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Prior Leave Management */}
                                                {hasLeaveModule && (
                                                    <div className="space-y-1.5 pt-1">
                                                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                            <CalendarDays size={13} className="text-slate-400" />
                                                            Leave Management & Balances (Prior)
                                                        </h5>
                                                        {leaveDiffItems.length > 0 ? (
                                                            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-2xs overflow-hidden">
                                                                {leaveDiffItems.map((item, idx) => (
                                                                    <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                                                                        <span className="text-slate-500 font-medium">{item.fieldLabel}</span>
                                                                        <span className="text-slate-700 font-semibold">
                                                                            {item.previousDisplayValue || 'Not Assigned'}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center text-slate-400 text-xs">
                                                                Standard policy / No prior leave changes.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Prior Compensation */}
                                                <div className="space-y-1.5 pt-1">
                                                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                        <DollarSign size={13} className="text-slate-400" />
                                                        Prior Compensation
                                                    </h5>
                                                    {hasPrevSalary ? (
                                                        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Prior Annual CTC</p>
                                                                    <p className="text-xs font-bold text-slate-700 mt-0.5">
                                                                        ₹{prevAnnualNum.toLocaleString('en-IN')}
                                                                    </p>
                                                                </div>
                                                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Prior Monthly CTC</p>
                                                                    <p className="text-xs font-bold text-slate-700 mt-0.5">
                                                                        ₹{prevMonthlyNum.toLocaleString('en-IN')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {prevBasic > 0 && (
                                                                <div className="grid grid-cols-3 gap-1.5 text-[10px] pt-1 border-t border-slate-100">
                                                                    <div className="p-1.5 bg-slate-50 rounded">
                                                                        <span className="text-slate-400 block">Basic</span>
                                                                        <span className="font-semibold text-slate-700">₹{prevBasic.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                    <div className="p-1.5 bg-slate-50 rounded">
                                                                        <span className="text-slate-400 block">HRA</span>
                                                                        <span className="font-semibold text-slate-700">₹{prevHra.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                    <div className="p-1.5 bg-slate-50 rounded">
                                                                        <span className="text-slate-400 block">Net Pay</span>
                                                                        <span className="font-semibold text-emerald-700">₹{prevNet.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center text-slate-400 text-xs">
                                                            No compensation changes recorded in prior state.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Revised State */}
                                        <div className="bg-blue-50/30 rounded-2xl border border-blue-200 p-5 space-y-5 flex flex-col justify-between">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between border-b border-blue-200 pb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-xs">
                                                            Revised State (After)
                                                        </span>
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                            {isStructured ? 'Structured' : 'Non-Structured'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] text-blue-700 font-semibold">
                                                        Effective from {selectedRevision.effectiveDate ? format(new Date(selectedRevision.effectiveDate), 'dd MMM yyyy') : '—'}
                                                    </span>
                                                </div>

                                                {/* Basic Info */}
                                                <div className="space-y-1.5">
                                                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                        <User size={13} className="text-slate-400" />
                                                        Basic Profile & Account
                                                    </h5>
                                                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-2xs overflow-hidden">
                                                        {basicFields.map((f, idx) => (
                                                            <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                                                                <span className="text-slate-500 font-medium">{f.label}</span>
                                                                <span className="text-slate-800 font-semibold">{f.after}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Employment & Org */}
                                                <div className="space-y-1.5">
                                                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                        <Briefcase size={13} className="text-slate-400" />
                                                        Employment & Org Structure
                                                    </h5>
                                                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-2xs overflow-hidden">
                                                        {empFields.map((f, idx) => (
                                                            <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                                                                <span className="text-slate-500 font-medium">{f.label}</span>
                                                                {f.isChanged ? (
                                                                    <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                                                                        {f.after}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-800 font-semibold">{f.after}</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Attendance */}
                                                <div className="space-y-1.5">
                                                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                        <Clock size={13} className="text-slate-400" />
                                                        Attendance & Shifts
                                                    </h5>
                                                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-2xs overflow-hidden">
                                                        {attFields.map((f, idx) => (
                                                            <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                                                                <span className="text-slate-500 font-medium">{f.label}</span>
                                                                {f.isChanged ? (
                                                                    <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                                                                        {f.after}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-800 font-semibold">{f.after}</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Revised Leave Management */}
                                                {hasLeaveModule && (
                                                    <div className="space-y-1.5 pt-1">
                                                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                            <CalendarDays size={13} className="text-slate-400" />
                                                            Leave Management & Balances (Revised)
                                                        </h5>
                                                        {leaveDiffItems.length > 0 ? (
                                                            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-2xs overflow-hidden">
                                                                {leaveDiffItems.map((item, idx) => (
                                                                    <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                                                                        <span className="text-slate-500 font-medium">{item.fieldLabel}</span>
                                                                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                                                            {item.revisedDisplayValue}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center text-slate-400 text-xs">
                                                                No leave balance modifications in this revision.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Compensation & Salary Structure */}
                                                <div className="space-y-1.5 pt-1">
                                                    <div className="flex items-center justify-between">
                                                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                            <DollarSign size={13} className="text-slate-400" />
                                                            Compensation & Salary Structure
                                                        </h5>
                                                        <div className="flex items-center gap-1 text-[9px] font-bold">
                                                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">{compType === 'hourly' ? 'Hourly' : 'Monthly Salary'}</span>
                                                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">{attMode === 'clock_in_out' ? 'Clock In Out' : 'Attendance'}</span>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Annual CTC</p>
                                                                <p className="text-xs font-bold text-slate-900 mt-0.5">₹{revAnnualCTC.toLocaleString('en-IN')}</p>
                                                            </div>
                                                            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Monthly CTC</p>
                                                                <p className="text-xs font-bold text-slate-900 mt-0.5">₹{revMonthlyCTC.toLocaleString('en-IN')}</p>
                                                            </div>
                                                            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Gross Salary</p>
                                                                <p className="text-xs font-bold text-blue-700 mt-0.5">₹{revGross.toLocaleString('en-IN')}</p>
                                                            </div>
                                                            <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                                                                <p className="text-[10px] font-bold text-emerald-700 uppercase">Net Take-Home</p>
                                                                <p className="text-xs font-bold text-emerald-800 mt-0.5">₹{revNet.toLocaleString('en-IN')}</p>
                                                            </div>
                                                        </div>

                                                        {isStructured && (
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2">
                                                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-xs">
                                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-1 font-bold text-slate-700 text-[10px] uppercase">
                                                                        <span>Earnings</span>
                                                                        <span className="text-[9px] text-slate-400">Monthly</span>
                                                                    </div>
                                                                    <div className="flex justify-between py-0.5 border-b border-slate-50 text-[11px]">
                                                                        <span className="text-slate-600">Basic</span>
                                                                        <span className="font-semibold text-slate-900">₹{revBasic.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                    <div className="flex justify-between py-0.5 border-b border-slate-50 text-[11px]">
                                                                        <span className="text-slate-600">HRA</span>
                                                                        <span className="font-semibold text-slate-900">₹{revHra.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                    {revSpecial > 0 && (
                                                                        <div className="flex justify-between py-0.5 border-b border-slate-50 text-[11px]">
                                                                            <span className="text-slate-600">Special</span>
                                                                            <span className="font-semibold text-slate-900">₹{revSpecial.toLocaleString('en-IN')}</span>
                                                                        </div>
                                                                    )}
                                                                    {revCustomAllowances.map((ca, i) => (
                                                                        <div key={i} className="flex justify-between py-0.5 border-b border-slate-50 text-[11px]">
                                                                            <span className="text-slate-600 truncate">{ca.name || 'Allowance'}</span>
                                                                            <span className="font-semibold text-slate-900">₹{parseFloat(ca.amount || 0).toLocaleString('en-IN')}</span>
                                                                        </div>
                                                                    ))}
                                                                    <div className="flex justify-between pt-1 font-bold text-slate-900 border-t border-slate-200 text-[11px]">
                                                                        <span>Gross</span>
                                                                        <span className="text-blue-700">₹{revGross.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-xs">
                                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-1 font-bold text-slate-700 text-[10px] uppercase">
                                                                        <span>Employer Cost</span>
                                                                        <span className="text-[9px] text-slate-400">CTC Portion</span>
                                                                    </div>
                                                                    <div className="flex justify-between py-0.5 border-b border-slate-50 text-[11px]">
                                                                        <span className="text-slate-600">PF (12%)</span>
                                                                        <span className="font-semibold text-slate-900">₹{revPfEmployer.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                    <div className="flex justify-between py-0.5 border-b border-slate-50 text-[11px]">
                                                                        <span className="text-slate-600">Gratuity</span>
                                                                        <span className="font-semibold text-slate-900">₹{revGratuity.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                    {revLwfEmployer > 0 && (
                                                                        <div className="flex justify-between py-0.5 border-b border-slate-50 text-[11px]">
                                                                            <span className="text-slate-600">LWF</span>
                                                                            <span className="font-semibold text-slate-900">₹{revLwfEmployer.toLocaleString('en-IN')}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex justify-between pt-1 font-bold text-slate-900 border-t border-slate-200 text-[11px]">
                                                                        <span>Monthly CTC</span>
                                                                        <span className="text-slate-900">₹{revMonthlyCTC.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-xs">
                                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-1 font-bold text-slate-700 text-[10px] uppercase">
                                                                        <span>Deductions</span>
                                                                        <span className="text-[9px] text-slate-400">Take-Home</span>
                                                                    </div>
                                                                    <div className="flex justify-between py-0.5 border-b border-slate-50 text-[11px]">
                                                                        <span className="text-slate-600">PF (12%)</span>
                                                                        <span className="font-semibold text-rose-600">₹{revPfEmployee.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                    <div className="flex justify-between py-0.5 border-b border-slate-50 text-[11px]">
                                                                        <span className="text-slate-600">Prof. Tax</span>
                                                                        <span className="font-semibold text-rose-600">₹{revPT.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                    {revESI > 0 && (
                                                                        <div className="flex justify-between py-0.5 border-b border-slate-50 text-[11px]">
                                                                            <span className="text-slate-600">ESI</span>
                                                                            <span className="font-semibold text-rose-600">₹{revESI.toLocaleString('en-IN')}</span>
                                                                        </div>
                                                                    )}
                                                                    {revCustomDeductions.map((cd, i) => (
                                                                        <div key={i} className="flex justify-between py-0.5 border-b border-slate-50 text-[11px]">
                                                                            <span className="text-slate-600 truncate">{cd.name || 'Deduction'}</span>
                                                                            <span className="font-semibold text-rose-600">₹{parseFloat(cd.amount || 0).toLocaleString('en-IN')}</span>
                                                                        </div>
                                                                    ))}
                                                                    <div className="flex justify-between pt-1 font-bold text-slate-900 border-t border-slate-200 text-[11px]">
                                                                        <span>Net Pay</span>
                                                                        <span className="text-emerald-700">₹{revNet.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            ) : null}

            {/* CREATE / SCHEDULE REVISION MODAL */}
            {showCreateModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm overflow-y-auto"
                    onClick={() => setShowCreateModal(false)}
                >
                    <div
                        className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl my-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center font-bold">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold">Revise Employee Details</h3>
                                    <p className="text-xs text-blue-100">
                                        Bundle effective-dated updates across employment, attendance, full compensation structure, and access.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateRevision} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto custom-scrollbar">
                            {/* Step 1: Effective Date & Type */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Effective Date *
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                    <input
                                        type="date"
                                        value={effectiveDate}
                                        onChange={(e) => setEffectiveDate(e.target.value)}
                                        required
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                                    />
                                    <div>
                                        {isDateScheduledFuture ? (
                                            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
                                                <Clock size={16} className="shrink-0 text-amber-600" />
                                                <span>Will be queued as Scheduled and applied automatically on date.</span>
                                            </div>
                                        ) : isDateBackdated ? (
                                            <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200">
                                                <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                                                <span>Backdated revision. Confirmation required below.</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                                                <CheckCircle size={16} className="shrink-0 text-emerald-600" />
                                                <span>Immediate revision. Will be applied to current records now.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Reason */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    Reason for Revision
                                </label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="e.g. Completed 6 months probation, promoted to Senior Engineer"
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            {/* Step 3: Module Selectors */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Select Modules to Bundle in this Revision
                                </label>
                                <div className={`grid gap-2.5 ${availableModuleOptions.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
                                    {availableModuleOptions.map(mod => {
                                        const isSelected = selectedModules.includes(mod.id);
                                        const Icon = mod.icon;
                                        return (
                                            <button
                                                key={mod.id}
                                                type="button"
                                                onClick={() => handleModuleTabClick(mod.id)}
                                                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${isSelected
                                                    ? 'bg-blue-50/80 border-blue-500 text-blue-900 shadow-xs'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <Icon size={16} className={isSelected ? 'text-blue-600' : 'text-slate-400'} />
                                                    {isSelected && <Check size={14} className="text-blue-600 font-bold" />}
                                                </div>
                                                <span className="text-xs font-bold mt-1">{mod.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Step 4: Module Fields */}
                            <div className="space-y-4 pt-2">
                                {/* 1. Employment & Org Structure Accordion */}
                                <div id="revision-section-employment" className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = !showEmploymentSection;
                                            setShowEmploymentSection(next);
                                            if (next && !selectedModules.includes('employment')) {
                                                setSelectedModules(prev => [...prev, 'employment']);
                                            }
                                        }}
                                        className="w-full flex items-center justify-between py-1 text-sm font-semibold text-slate-700 hover:text-slate-900 transition focus:outline-none cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Briefcase size={16} className="text-blue-600" />
                                            <span className="font-semibold text-slate-800">Employment & Org Structure</span>
                                        </div>
                                        {showEmploymentSection ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </button>

                                    {showEmploymentSection && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Department
                                                </label>
                                                <select
                                                    value={revisionForm.departmentRef}
                                                    onChange={(e) => setRevisionForm({ ...revisionForm, departmentRef: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                >
                                                    <option value="">-- Select Department --</option>
                                                    {departments.map(d => (
                                                        <option key={d._id} value={d._id}>{d.name}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Current: {currentEmployeeState.department || 'None'}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Designation
                                                </label>
                                                <select
                                                    value={revisionForm.designationRef}
                                                    onChange={(e) => setRevisionForm({ ...revisionForm, designationRef: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                >
                                                    <option value="">-- Select Designation --</option>
                                                    {designations.map(d => (
                                                        <option key={d._id} value={d._id}>{d.title}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Current: {currentEmployeeState.designation || 'None'}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Primary Reporting Manager
                                                </label>
                                                <SearchableUserSelect
                                                    users={allEmployees}
                                                    value={revisionForm.primaryManagerId}
                                                    onChange={(val) => setRevisionForm({ ...revisionForm, primaryManagerId: val })}
                                                    placeholder="-- Select or Search Manager --"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Work Location / Branch
                                                </label>
                                                <input
                                                    type="text"
                                                    value={revisionForm.workLocation}
                                                    onChange={(e) => setRevisionForm({ ...revisionForm, workLocation: e.target.value })}
                                                    placeholder="e.g. Bangalore, Remote, London"
                                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Count in Total Workforce
                                                </label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setRevisionForm({ ...revisionForm, isTotalWorkforce: true })}
                                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                                                            revisionForm.isTotalWorkforce !== false
                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        Yes
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRevisionForm({ ...revisionForm, isTotalWorkforce: false })}
                                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                                                            revisionForm.isTotalWorkforce === false
                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        No
                                                    </button>
                                                    <span className="text-[10px] text-slate-400">
                                                        {revisionForm.isTotalWorkforce !== false ? 'Count in headcount' : 'Exclude from headcount'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    System Permission
                                                </label>
                                                <select
                                                    value={revisionForm.roleId}
                                                    onChange={(e) => setRevisionForm({ ...revisionForm, roleId: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                >
                                                    <option value="">-- Select System Permission --</option>
                                                    {roles.map(r => (
                                                        <option key={r._id} value={r._id}>{r.name}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Current: {roles.find(r => String(r._id) === String(currentEmployeeState.roleId))?.name || (typeof profile?.roles?.[0] === 'object' ? profile.roles[0]?.name : 'None')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Attendance & Shifts Accordion */}
                                <div id="revision-section-attendance" className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden p-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = !showAttendanceSection;
                                            setShowAttendanceSection(next);
                                            if (next && !selectedModules.includes('attendance')) {
                                                setSelectedModules(prev => [...prev, 'attendance']);
                                            }
                                        }}
                                        className="w-full flex items-center justify-between py-1 text-sm font-semibold text-slate-700 hover:text-slate-900 transition focus:outline-none cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-amber-600" />
                                            <span className="font-semibold text-slate-800">Attendance & Shifts</span>
                                        </div>
                                        {showAttendanceSection ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </button>

                                    {showAttendanceSection && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Attendance Mode
                                                </label>
                                                <select
                                                    value={revisionForm.attendanceMode}
                                                    onChange={(e) => setRevisionForm({ ...revisionForm, attendanceMode: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                >
                                                    {DEFAULT_ATTENDANCE_MODES.map(m => (
                                                        <option key={m.value} value={m.value}>{m.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Assigned Shift
                                                </label>
                                                <select
                                                    value={revisionForm.attendanceShiftCode}
                                                    onChange={(e) => setRevisionForm({ ...revisionForm, attendanceShiftCode: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                >
                                                    {attendanceShifts.map(s => (
                                                        <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                          
                                {/* 3. Leave Management Accordion */}
                                {hasLeaveModule && (
                                    <div id="revision-section-leave" className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const next = !showLeaveSection;
                                                setShowLeaveSection(next);
                                                if (next && !selectedModules.includes('leave')) {
                                                    setSelectedModules(prev => [...prev, 'leave']);
                                                }
                                            }}
                                            className="w-full flex items-center justify-between py-1 text-sm font-semibold text-slate-700 hover:text-slate-900 transition focus:outline-none cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2">
                                                <CalendarDays size={16} className="text-emerald-600" />
                                                <span className="font-semibold text-slate-800">Leave Management & Allocations</span>
                                                <span className="ml-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                    {leaveAllocations.filter(l => l.enabled !== false).length} leaves active
                                                </span>
                                            </div>
                                            {showLeaveSection ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                        </button>

                                        {showLeaveSection && (
                                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                                                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2.5">
                                                    <Info size={16} className="shrink-0 text-emerald-600 mt-0.5" />
                                                    <p>
                                                        From <span className="font-bold">{effectiveDate || 'the effective date'}</span>, these revised leave allocations and rules will apply to the employee. Configure the credited balance, monthly/yearly carry forward, accrual cycle, and expiration limits below.
                                                    </p>
                                                </div>

                                                {/* Quick Leave Type Toggle Pills */}
                                                <div className="space-y-1.5">
                                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                                        Assigned Leave Types for Employee
                                                    </label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {leaveAllocations.map(l => {
                                                            const isEn = l.enabled !== false;
                                                            return (
                                                                <button
                                                                    key={l.leaveType}
                                                                    type="button"
                                                                    onClick={() => toggleLeaveEnabled(l.leaveType)}
                                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                                                        isEn
                                                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                                    }`}
                                                                >
                                                                    <span className="uppercase">{l.leaveType}</span>
                                                                    <span className="font-medium text-[11px] opacity-90">({l.name})</span>
                                                                    {isEn && <Check size={13} className="stroke-[3]" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Config Cards per Enabled Leave Type */}
                                                <div className="space-y-4 pt-1">
                                                    {leaveAllocations.filter(l => l.enabled !== false).length === 0 ? (
                                                        <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
                                                            <div className="h-10 w-10 mx-auto rounded-full bg-slate-200/80 flex items-center justify-center text-slate-500">
                                                                <CalendarDays size={20} />
                                                            </div>
                                                            <p className="text-xs font-bold text-slate-700">No leave types assigned to this employee</p>
                                                            <p className="text-[11px] text-slate-400">All leave types are currently excluded. Click any leave type pill above to add it back to this revision.</p>
                                                        </div>
                                                    ) : (
                                                        leaveAllocations.filter(l => l.enabled !== false).map(item => (
                                                            <div key={item.leaveType} className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 space-y-3.5">
                                                                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-900 text-white">
                                                                            {item.leaveType}
                                                                        </span>
                                                                        <span className="text-xs font-bold text-slate-800">{item.name}</span>
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                                            item.isPaid ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                                                                        }`}>
                                                                            {item.isPaid ? 'Paid Leave' : 'Unpaid Leave'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-[11px] font-medium text-slate-500">
                                                                            Current Balance: <strong className="text-slate-800">{item.currentClosingBalance ?? item.allocatedBalance ?? 0} Days</strong>
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleLeaveEnabled(item.leaveType)}
                                                                            className="px-2.5 py-1 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                                                                            title={`Delete / Exclude ${item.name} from this employee`}
                                                                        >
                                                                            <Trash2 size={13} className="text-rose-500" />
                                                                            <span>Delete</span>
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* 4-Grid Input Parameters */}
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                                                    {/* 1. Revised Opening/Credited Balance */}
                                                                    <div>
                                                                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                                                            Credited Balance (Days) *
                                                                        </label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.25"
                                                                            min="0"
                                                                            value={item.allocatedBalance ?? ''}
                                                                            onChange={(e) => updateLeaveAllocation(item.leaveType, { allocatedBalance: e.target.value })}
                                                                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                                                                            placeholder="e.g. 12"
                                                                        />
                                                                        <p className="text-[10px] text-slate-400 mt-0.5">Opening balance from date</p>
                                                                    </div>

                                                                    {/* 2. Accrual Mode & Rate */}
                                                                    <div>
                                                                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                                                            Accrual Cycle & Rate
                                                                        </label>
                                                                        <div className="grid grid-cols-2 gap-1.5">
                                                                            <select
                                                                                value={item.accrualType || 'Monthly'}
                                                                                onChange={(e) => updateLeaveAllocation(item.leaveType, { accrualType: e.target.value })}
                                                                                className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                                            >
                                                                                <option value="Monthly">Monthly</option>
                                                                                <option value="Yearly">Yearly</option>
                                                                                <option value="Policy">Lump Sum</option>
                                                                                <option value="None">None</option>
                                                                            </select>
                                                                            <input
                                                                                type="number"
                                                                                step="0.25"
                                                                                min="0"
                                                                                value={item.accrualAmount ?? ''}
                                                                                onChange={(e) => updateLeaveAllocation(item.leaveType, { accrualAmount: e.target.value })}
                                                                                className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                                                placeholder="Days"
                                                                            />
                                                                        </div>
                                                                        <p className="text-[10px] text-slate-400 mt-0.5">Accrual rate per cycle</p>
                                                                    </div>

                                                                    {/* 3. Carry Forward Rules */}
                                                                    <div>
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <label className="text-[11px] font-bold text-slate-700 uppercase">
                                                                                Carry Forward
                                                                            </label>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => updateLeaveAllocation(item.leaveType, { carryForward: !item.carryForward })}
                                                                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                                                                    item.carryForward ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                                                                                }`}
                                                                            >
                                                                                {item.carryForward ? 'Enabled' : 'Disabled'}
                                                                            </button>
                                                                        </div>
                                                                        {item.carryForward ? (
                                                                            <div className="grid grid-cols-2 gap-1.5">
                                                                                <select
                                                                                    value={item.carryForwardFrequency || 'Monthly'}
                                                                                    onChange={(e) => updateLeaveAllocation(item.leaveType, { carryForwardFrequency: e.target.value })}
                                                                                    className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                                                >
                                                                                    <option value="Monthly">Monthly</option>
                                                                                    <option value="Yearly">Yearly</option>
                                                                                </select>
                                                                                <input
                                                                                    type="number"
                                                                                    step="1"
                                                                                    min="0"
                                                                                    value={item.maxCarryForward ?? ''}
                                                                                    onChange={(e) => updateLeaveAllocation(item.leaveType, { maxCarryForward: e.target.value })}
                                                                                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                                                    placeholder="Max Days"
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <div className="px-3 py-2 bg-slate-100 rounded-xl text-slate-400 text-xs font-medium border border-slate-200/60">
                                                                                Unused leaves lapse
                                                                            </div>
                                                                        )}
                                                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                                                            {item.carryForward ? `Max cap: ${item.maxCarryForward || '∞'} days` : 'No rollover'}
                                                                        </p>
                                                                    </div>

                                                                    {/* 4. Expiry / Reset Cycle & Cap */}
                                                                    <div>
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <label className="text-[11px] font-bold text-slate-700 uppercase">
                                                                                Validity & Expiry
                                                                            </label>
                                                                            <span className="text-[10px] text-slate-400">Reset cycle</span>
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <select
                                                                                value={item.expiryMonths !== undefined ? String(item.expiryMonths) : '2'}
                                                                                onChange={(e) => updateLeaveAllocation(item.leaveType, { expiryMonths: e.target.value })}
                                                                                className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                                            >
                                                                                <option value="2">Expires every 2 Months (Bi-monthly)</option>
                                                                                <option value="3">Expires every 3 Months (Quarterly)</option>
                                                                                <option value="6">Expires every 6 Months (Half-Yearly)</option>
                                                                                <option value="12">Expires at Year End (Annual)</option>
                                                                                <option value="0">Never Expires (Accumulates)</option>
                                                                            </select>
                                                                            <div className="flex items-center justify-between gap-1 text-[10px]">
                                                                                <span className="text-slate-500 font-medium whitespace-nowrap">Max Day Cap:</span>
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.5"
                                                                                    min="0"
                                                                                    value={item.expiryBalance ?? ''}
                                                                                    onChange={(e) => updateLeaveAllocation(item.leaveType, { expiryBalance: e.target.value })}
                                                                                    className="w-20 px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white text-right"
                                                                                    placeholder="e.g. 3"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center justify-between mt-1 text-[10px]">
                                                                            <span className="text-slate-500 font-medium">Auto-renew next cycle:</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => updateLeaveAllocation(item.leaveType, { autoRenew: item.autoRenew === false ? true : false })}
                                                                                className={`font-bold px-1.5 py-0.5 rounded ${item.autoRenew !== false ? 'text-emerald-700 bg-emerald-100' : 'text-slate-600 bg-slate-200'}`}
                                                                            >
                                                                                {item.autoRenew !== false ? 'Yes (Auto Add)' : 'No'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Live Summary Footer */}
                                                                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="font-semibold text-slate-700">Summary:</span>
                                                                        <span>
                                                                            {item.allocatedBalance || 0} Days opening •{' '}
                                                                            {item.accrualAmount > 0 ? `+${item.accrualAmount}/${item.accrualType === 'Monthly' ? 'month' : 'year'}` : (item.accrualType === 'None' ? 'No accrual' : 'Fixed lump sum')} •{' '}
                                                                            {item.carryForward ? `Carry forward ${item.carryForwardFrequency || 'Monthly'} (Max ${item.maxCarryForward || '3'})` : 'No carry forward'} •{' '}
                                                                            {Number(item.expiryMonths) === 2 ? 'Rolling 2-Month Validity (Leaves credited 2 months earlier expire; max 3.0 days cap)' : (Number(item.expiryMonths) === 3 ? 'Rolling 3-Month Validity (Quarterly FIFO expiry)' : (Number(item.expiryMonths) === 12 ? 'Expires at year end' : (Number(item.expiryMonths) > 0 ? `Expires every ${item.expiryMonths} months` : (item.expiryBalance > 0 ? `Max accumulated cap: ${item.expiryBalance} days` : 'No accumulation cap'))))}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 4. Salary & Compensation Details Accordion */}
                                <div id="revision-section-compensation" className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = !showSalarySection;
                                            setShowSalarySection(next);
                                            if (next && !selectedModules.includes('compensation')) {
                                                setSelectedModules(prev => [...prev, 'compensation']);
                                            }
                                        }}
                                        className="w-full flex items-center justify-between py-1 text-sm font-semibold text-slate-700 hover:text-slate-900 transition focus:outline-none cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <SlidersHorizontal size={16} className="text-slate-400" />
                                            <span className="font-semibold text-slate-800">Salary & Compensation Details</span>
                                        </div>
                                        {showSalarySection ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </button>

                                    {showSalarySection && (
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <CompensationFormSection
                                                formData={{ salary: salaryDraft }}
                                                calculateSalaryBreakdown={calculateSalaryBreakdown}
                                                payrollConfig={payrollConfig}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Backdated Confirmation Warning Checkbox */}
                            {isDateBackdated && (
                                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-rose-900">Backdated Effective Date Warning</p>
                                            <p className="text-xs text-rose-700 leading-relaxed">
                                                You have selected a date in the past ({effectiveDate}). This revision may retroactively impact already processed payroll batches, attendance logs, and leave accruals for that period.
                                            </p>
                                        </div>
                                    </div>

                                    <label className="flex items-center gap-2.5 pt-2 border-t border-rose-200/60 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isBackdatedConfirmed}
                                            onChange={(e) => setIsBackdatedConfirmed(e.target.checked)}
                                            className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-rose-900">
                                            I understand and confirm applying these backdated changes.
                                        </span>
                                    </label>
                                </div>
                            )}

                            {/* Form Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    {submitting ? <RefreshCw size={14} className="animate-spin" /> : null}
                                    {isDateScheduledFuture ? 'Schedule Revision' : 'Apply Revision Immediately'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT REVISION MODAL */}
            {showEditModal && selectedRevision && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm overflow-y-auto"
                    onClick={() => setShowEditModal(false)}
                >
                    <div
                        className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl my-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center font-bold text-blue-400">
                                    <Edit2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold">Edit Revision Details</h3>
                                    <p className="text-xs text-slate-300">
                                        Update effective-dated values across employment, attendance, and compensation for Record #{selectedRevision._id?.slice(-6)}.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateScheduledRevision} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto custom-scrollbar">
                            {/* Step 1: Effective Date */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Effective Date *
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                    <input
                                        type="date"
                                        value={effectiveDate}
                                        onChange={(e) => setEffectiveDate(e.target.value)}
                                        required
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                                    />
                                    <div>
                                        {isDateScheduledFuture ? (
                                            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
                                                <Clock size={16} className="shrink-0 text-amber-600" />
                                                <span>Will auto-apply on {effectiveDate}.</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                                                <CheckCircle size={16} className="shrink-0 text-emerald-600" />
                                                <span>Updates will apply immediately to employee records.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Reason */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    Reason for Revision
                                </label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="e.g. Completed 6 months probation, promoted to Senior Engineer"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            {/* Step 3: Module Selectors */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Select Modules in this Revision
                                </label>
                                <div className={`grid gap-2.5 ${availableModuleOptions.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
                                    {availableModuleOptions.map(mod => {
                                        const isSelected = selectedModules.includes(mod.id);
                                        const Icon = mod.icon;
                                        return (
                                            <button
                                                key={mod.id}
                                                type="button"
                                                onClick={() => handleModuleTabClick(mod.id)}
                                                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${isSelected
                                                    ? 'bg-blue-50/80 border-blue-500 text-blue-900 shadow-xs'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <Icon size={16} className={isSelected ? 'text-blue-600' : 'text-slate-400'} />
                                                    {isSelected && <Check size={14} className="text-blue-600 font-bold" />}
                                                </div>
                                                <span className="text-xs font-bold mt-1">{mod.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Step 4: Module Fields */}
                            <div className="space-y-4 pt-2">
                                {/* 1. Employment & Org Structure Accordion */}
                                <div id="revision-edit-section-employment" className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = !showEmploymentSection;
                                            setShowEmploymentSection(next);
                                            if (next && !selectedModules.includes('employment')) {
                                                setSelectedModules(prev => [...prev, 'employment']);
                                            }
                                        }}
                                        className="w-full flex items-center justify-between py-1 text-sm font-semibold text-slate-700 hover:text-slate-900 transition focus:outline-none cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Briefcase size={16} className="text-blue-600" />
                                            <span className="font-semibold text-slate-800">Employment & Org Structure</span>
                                        </div>
                                        {showEmploymentSection ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </button>

                                    {showEmploymentSection && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Department
                                                </label>
                                                <select
                                                    value={revisionForm.departmentRef}
                                                    onChange={(e) => setRevisionForm({ ...revisionForm, departmentRef: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                >
                                                    <option value="">-- Select Department --</option>
                                                    {departments.map(d => (
                                                        <option key={d._id} value={d._id}>{d.name}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Current: {currentEmployeeState.department || 'None'}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Designation
                                                </label>
                                                <select
                                                    value={revisionForm.designationRef}
                                                    onChange={(e) => setRevisionForm({ ...revisionForm, designationRef: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                >
                                                    <option value="">-- Select Designation --</option>
                                                    {designations.map(d => (
                                                        <option key={d._id} value={d._id}>{d.title}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Current: {currentEmployeeState.designation || 'None'}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Employment Type
                                                </label>
                                                <select
                                                    value={revisionForm.employmentType}
                                                    onChange={(e) => setRevisionForm({ ...revisionForm, employmentType: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                >
                                                    {DEFAULT_EMPLOYMENT_TYPES.map(t => (
                                                        <option key={t} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Current: {currentEmployeeState.employmentType}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Primary Reporting Manager
                                                </label>
                                                <SearchableUserSelect
                                                    users={allEmployees}
                                                    value={revisionForm.primaryManagerId}
                                                    onChange={(val) => setRevisionForm({ ...revisionForm, primaryManagerId: val })}
                                                    placeholder="-- Select or Search Manager --"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Work Location / Branch
                                                </label>
                                                <input
                                                    type="text"
                                                    value={revisionForm.workLocation}
                                                    onChange={(e) => setRevisionForm({ ...revisionForm, workLocation: e.target.value })}
                                                    placeholder="e.g. Bangalore, Remote, London"
                                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Count in Total Workforce
                                                </label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setRevisionForm({ ...revisionForm, isTotalWorkforce: true })}
                                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                                                            revisionForm.isTotalWorkforce !== false
                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        Yes
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRevisionForm({ ...revisionForm, isTotalWorkforce: false })}
                                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                                                            revisionForm.isTotalWorkforce === false
                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        No
                                                    </button>
                                                    <span className="text-[10px] text-slate-400">
                                                        {revisionForm.isTotalWorkforce !== false ? 'Count in headcount' : 'Exclude from headcount'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    System Permission
                                                </label>
                                                <select
                                                    value={revisionForm.roleId}
                                                    onChange={(e) => setRevisionForm({ ...revisionForm, roleId: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                >
                                                    <option value="">-- Select System Permission --</option>
                                                    {roles.map(r => (
                                                        <option key={r._id} value={r._id}>{r.name}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Current: {roles.find(r => String(r._id) === String(currentEmployeeState.roleId))?.name || (typeof profile?.roles?.[0] === 'object' ? profile.roles[0]?.name : 'None')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Attendance & Shifts Accordion */}
                                <div id="revision-edit-section-attendance" className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = !showAttendanceSection;
                                            setShowAttendanceSection(next);
                                            if (next && !selectedModules.includes('attendance')) {
                                                setSelectedModules(prev => [...prev, 'attendance']);
                                            }
                                        }}
                                        className="w-full flex items-center justify-between py-1 text-sm font-semibold text-slate-700 hover:text-slate-900 transition focus:outline-none cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-amber-600" />
                                            <span className="font-semibold text-slate-800">Attendance & Shifts</span>
                                        </div>
                                        {showAttendanceSection ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </button>

                                    {showAttendanceSection && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Attendance Mode
                                                </label>
                                                <select
                                                    value={revisionForm.attendanceMode}
                                                    onChange={(e) => setRevisionForm({ ...revisionForm, attendanceMode: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                >
                                                    {DEFAULT_ATTENDANCE_MODES.map(m => (
                                                        <option key={m.value} value={m.value}>{m.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Assigned Shift
                                                </label>
                                                <select
                                                    value={revisionForm.attendanceShiftCode}
                                                    onChange={(e) => setRevisionForm({ ...revisionForm, attendanceShiftCode: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                >
                                                    {attendanceShifts.map(s => (
                                                        <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 3. Leave Management Accordion */}
                                {hasLeaveModule && (
                                    <div id="revision-edit-section-leave" className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const next = !showLeaveSection;
                                                setShowLeaveSection(next);
                                                if (next && !selectedModules.includes('leave')) {
                                                    setSelectedModules(prev => [...prev, 'leave']);
                                                }
                                            }}
                                            className="w-full flex items-center justify-between py-1 text-sm font-semibold text-slate-700 hover:text-slate-900 transition focus:outline-none cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2">
                                                <CalendarDays size={16} className="text-emerald-600" />
                                                <span className="font-semibold text-slate-800">Leave Management & Allocations</span>
                                                <span className="ml-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                    {leaveAllocations.filter(l => l.enabled !== false).length} leaves active
                                                </span>
                                            </div>
                                            {showLeaveSection ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                        </button>

                                        {showLeaveSection && (
                                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                                                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2.5">
                                                    <Info size={16} className="shrink-0 text-emerald-600 mt-0.5" />
                                                    <p>
                                                        From <span className="font-bold">{effectiveDate || 'the effective date'}</span>, these revised leave allocations and rules will apply to the employee. Configure the credited balance, monthly/yearly carry forward, accrual cycle, and expiration limits below.
                                                    </p>
                                                </div>

                                                {/* Quick Leave Type Toggle Pills */}
                                                <div className="space-y-1.5">
                                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                                        Assigned Leave Types for Employee
                                                    </label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {leaveAllocations.map(l => {
                                                            const isEn = l.enabled !== false;
                                                            return (
                                                                <button
                                                                    key={l.leaveType}
                                                                    type="button"
                                                                    onClick={() => toggleLeaveEnabled(l.leaveType)}
                                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                                                        isEn
                                                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                                    }`}
                                                                >
                                                                    <span className="uppercase">{l.leaveType}</span>
                                                                    <span className="font-medium text-[11px] opacity-90">({l.name})</span>
                                                                    {isEn && <Check size={13} className="stroke-[3]" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Config Cards per Enabled Leave Type */}
                                                <div className="space-y-4 pt-1">
                                                    {leaveAllocations.filter(l => l.enabled !== false).length === 0 ? (
                                                        <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
                                                            <div className="h-10 w-10 mx-auto rounded-full bg-slate-200/80 flex items-center justify-center text-slate-500">
                                                                <CalendarDays size={20} />
                                                            </div>
                                                            <p className="text-xs font-bold text-slate-700">No leave types assigned to this employee</p>
                                                            <p className="text-[11px] text-slate-400">All leave types are currently excluded. Click any leave type pill above to add it back to this revision.</p>
                                                        </div>
                                                    ) : (
                                                        leaveAllocations.filter(l => l.enabled !== false).map(item => (
                                                            <div key={item.leaveType} className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 space-y-3.5">
                                                                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-900 text-white">
                                                                            {item.leaveType}
                                                                        </span>
                                                                        <span className="text-xs font-bold text-slate-800">{item.name}</span>
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                                            item.isPaid ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                                                                        }`}>
                                                                            {item.isPaid ? 'Paid Leave' : 'Unpaid Leave'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-[11px] font-medium text-slate-500">
                                                                            Current Balance: <strong className="text-slate-800">{item.currentClosingBalance ?? item.allocatedBalance ?? 0} Days</strong>
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleLeaveEnabled(item.leaveType)}
                                                                            className="px-2.5 py-1 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                                                                            title={`Delete / Exclude ${item.name} from this employee`}
                                                                        >
                                                                            <Trash2 size={13} className="text-rose-500" />
                                                                            <span>Delete</span>
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* 4-Grid Input Parameters */}
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                                                    {/* 1. Revised Opening/Credited Balance */}
                                                                    <div>
                                                                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                                                            Credited Balance (Days) *
                                                                        </label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.25"
                                                                            min="0"
                                                                            value={item.allocatedBalance ?? ''}
                                                                            onChange={(e) => updateLeaveAllocation(item.leaveType, { allocatedBalance: e.target.value })}
                                                                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                                                                            placeholder="e.g. 12"
                                                                        />
                                                                        <p className="text-[10px] text-slate-400 mt-0.5">Opening balance from date</p>
                                                                    </div>

                                                                    {/* 2. Accrual Mode & Rate */}
                                                                    <div>
                                                                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                                                            Accrual Cycle & Rate
                                                                        </label>
                                                                        <div className="grid grid-cols-2 gap-1.5">
                                                                            <select
                                                                                value={item.accrualType || 'Monthly'}
                                                                                onChange={(e) => updateLeaveAllocation(item.leaveType, { accrualType: e.target.value })}
                                                                                className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                                            >
                                                                                <option value="Monthly">Monthly</option>
                                                                                <option value="Yearly">Yearly</option>
                                                                                <option value="Policy">Lump Sum</option>
                                                                                <option value="None">None</option>
                                                                            </select>
                                                                            <input
                                                                                type="number"
                                                                                step="0.25"
                                                                                min="0"
                                                                                value={item.accrualAmount ?? ''}
                                                                                onChange={(e) => updateLeaveAllocation(item.leaveType, { accrualAmount: e.target.value })}
                                                                                className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                                                placeholder="Days"
                                                                            />
                                                                        </div>
                                                                        <p className="text-[10px] text-slate-400 mt-0.5">Accrual rate per cycle</p>
                                                                    </div>

                                                                    {/* 3. Carry Forward Rules */}
                                                                    <div>
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <label className="text-[11px] font-bold text-slate-700 uppercase">
                                                                                Carry Forward
                                                                            </label>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => updateLeaveAllocation(item.leaveType, { carryForward: !item.carryForward })}
                                                                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                                                                    item.carryForward ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                                                                                }`}
                                                                            >
                                                                                {item.carryForward ? 'Enabled' : 'Disabled'}
                                                                            </button>
                                                                        </div>
                                                                        {item.carryForward ? (
                                                                            <div className="grid grid-cols-2 gap-1.5">
                                                                                <select
                                                                                    value={item.carryForwardFrequency || 'Monthly'}
                                                                                    onChange={(e) => updateLeaveAllocation(item.leaveType, { carryForwardFrequency: e.target.value })}
                                                                                    className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                                                >
                                                                                    <option value="Monthly">Monthly</option>
                                                                                    <option value="Yearly">Yearly</option>
                                                                                </select>
                                                                                <input
                                                                                    type="number"
                                                                                    step="1"
                                                                                    min="0"
                                                                                    value={item.maxCarryForward ?? ''}
                                                                                    onChange={(e) => updateLeaveAllocation(item.leaveType, { maxCarryForward: e.target.value })}
                                                                                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                                                    placeholder="Max Days"
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <div className="px-3 py-2 bg-slate-100 rounded-xl text-slate-400 text-xs font-medium border border-slate-200/60">
                                                                                Unused leaves lapse
                                                                            </div>
                                                                        )}
                                                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                                                            {item.carryForward ? `Max cap: ${item.maxCarryForward || '∞'} days` : 'No rollover'}
                                                                        </p>
                                                                    </div>

                                                                    {/* 4. Expiry / Reset Cycle & Cap */}
                                                                    <div>
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <label className="text-[11px] font-bold text-slate-700 uppercase">
                                                                                Validity & Expiry
                                                                            </label>
                                                                            <span className="text-[10px] text-slate-400">Reset cycle</span>
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <select
                                                                                value={item.expiryMonths !== undefined ? String(item.expiryMonths) : '2'}
                                                                                onChange={(e) => updateLeaveAllocation(item.leaveType, { expiryMonths: e.target.value })}
                                                                                className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                                                                            >
                                                                                <option value="2">Expires every 2 Months (Bi-monthly)</option>
                                                                                <option value="3">Expires every 3 Months (Quarterly)</option>
                                                                                <option value="6">Expires every 6 Months (Half-Yearly)</option>
                                                                                <option value="12">Expires at Year End (Annual)</option>
                                                                                <option value="0">Never Expires (Accumulates)</option>
                                                                            </select>
                                                                            <div className="flex items-center justify-between gap-1 text-[10px]">
                                                                                <span className="text-slate-500 font-medium whitespace-nowrap">Max Day Cap:</span>
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.5"
                                                                                    min="0"
                                                                                    value={item.expiryBalance ?? ''}
                                                                                    onChange={(e) => updateLeaveAllocation(item.leaveType, { expiryBalance: e.target.value })}
                                                                                    className="w-20 px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white text-right"
                                                                                    placeholder="e.g. 3"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center justify-between mt-1 text-[10px]">
                                                                            <span className="text-slate-500 font-medium">Auto-renew next cycle:</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => updateLeaveAllocation(item.leaveType, { autoRenew: item.autoRenew === false ? true : false })}
                                                                                className={`font-bold px-1.5 py-0.5 rounded ${item.autoRenew !== false ? 'text-emerald-700 bg-emerald-100' : 'text-slate-600 bg-slate-200'}`}
                                                                            >
                                                                                {item.autoRenew !== false ? 'Yes (Auto Add)' : 'No'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Live Summary Footer */}
                                                                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="font-semibold text-slate-700">Summary:</span>
                                                                        <span>
                                                                            {item.allocatedBalance || 0} Days opening •{' '}
                                                                            {item.accrualAmount > 0 ? `+${item.accrualAmount}/${item.accrualType === 'Monthly' ? 'month' : 'year'}` : (item.accrualType === 'None' ? 'No accrual' : 'Fixed lump sum')} •{' '}
                                                                            {item.carryForward ? `Carry forward ${item.carryForwardFrequency || 'Monthly'} (Max ${item.maxCarryForward || '3'})` : 'No carry forward'} •{' '}
                                                                            {Number(item.expiryMonths) === 2 ? 'Rolling 2-Month Validity (Leaves credited 2 months earlier expire; max 3.0 days cap)' : (Number(item.expiryMonths) === 3 ? 'Rolling 3-Month Validity (Quarterly FIFO expiry)' : (Number(item.expiryMonths) === 12 ? 'Expires at year end' : (Number(item.expiryMonths) > 0 ? `Expires every ${item.expiryMonths} months` : (item.expiryBalance > 0 ? `Max accumulated cap: ${item.expiryBalance} days` : 'No accumulation cap'))))}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 4. Salary & Compensation Details Accordion */}
                                <div id="revision-edit-section-compensation" className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = !showSalarySection;
                                            setShowSalarySection(next);
                                            if (next && !selectedModules.includes('compensation')) {
                                                setSelectedModules(prev => [...prev, 'compensation']);
                                            }
                                        }}
                                        className="w-full flex items-center justify-between py-1 text-sm font-semibold text-slate-700 hover:text-slate-900 transition focus:outline-none cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <SlidersHorizontal size={16} className="text-slate-400" />
                                            <span className="font-semibold text-slate-800">Salary & Compensation Details</span>
                                        </div>
                                        {showSalarySection ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </button>

                                    {showSalarySection && (
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <CompensationFormSection
                                                formData={{ salary: salaryDraft }}
                                                calculateSalaryBreakdown={calculateSalaryBreakdown}
                                                payrollConfig={payrollConfig}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    {submitting ? <RefreshCw size={14} className="animate-spin" /> : null}
                                    Save Revision Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CANCEL SCHEDULED REVISION MODAL */}
            {showCancelModal && selectedRevision && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
                    onClick={() => setShowCancelModal(false)}
                >
                    <div
                        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                                <AlertOctagon size={22} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Cancel Scheduled Revision</h3>
                                <p className="text-xs text-slate-500">This action will mark the revision as cancelled in audit history.</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Cancellation Reason (Optional)
                            </label>
                            <textarea
                                value={cancellingReason}
                                onChange={(e) => setCancellingReason(e.target.value)}
                                placeholder="Why is this scheduled revision being cancelled?"
                                rows={3}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowCancelModal(false)}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                                Keep Scheduled
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelRevision}
                                disabled={submitting}
                                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer"
                            >
                                Confirm Cancellation
                            </button>
                        </div>
                    </div>
                </div>
            )}

                    </div>
    );
};

export default RevisedDetailsTab;
