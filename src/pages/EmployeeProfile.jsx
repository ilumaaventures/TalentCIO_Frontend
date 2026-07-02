import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
    User, Mail, Briefcase, Shield, Hash, Users, MapPin, Calendar,
    ArrowLeft, Edit2, Clock, FileText, Activity, AlertCircle, UserMinus, UserCheck, Eye, EyeOff, X,
    Settings2, ChevronUp, ChevronDown, TrendingUp, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import Skeleton from '../components/Skeleton';
import { format } from 'date-fns';
import UserTADashboard from './TalentAcquisition/UserTADashboard';
import Timesheet from './Timesheet';
import EmployeeDossier from './EmployeeDossier';
import { restoreBinItem } from '../api/bin';
import { buildMasterSalaryStructure, PT_STATE_LIST, getMonthlyPT } from '../utils/payroll';

const DEFAULT_ATTENDANCE_SHIFTS = [
    { code: 'general', name: 'General' },
    { code: 'any', name: 'Any Time' }
];

const EmployeeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // overview, edit, timesheet, dossier, ta-analytics
    const [roles, setRoles] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // for reporting managers/direct reports
    const [showPassword, setShowPassword] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [payrollConfig, setPayrollConfig] = useState(null);
    const [showSalarySection, setShowSalarySection] = useState(false);

    // Form State for Editing
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        roleId: '',
        department: '',
        employeeCode: '',
        joiningDate: '',
        employmentType: 'Full Time',
        workLocation: '',
        attendanceMode: 'clock_in_out',
        attendanceShiftCode: 'general',
        directReports: [],
        reportingManagers: []
    });

    const enabledModules = currentUser?.company?.enabledModules || [];
    const hasTA = enabledModules.includes('talentAcquisition');
    const hasAttendance = enabledModules.includes('attendance');
    const hasTimesheet = enabledModules.includes('timesheet');
    const hasDossier = enabledModules.includes('employeeDossier');

    const isAuthorizedForTA = (currentUser?.roles?.includes('Admin') || currentUser?.permissions?.includes('ta.read')) && hasTA;
    const isAuthorizedForEdit = currentUser?.roles?.includes('Admin') || currentUser?.permissions?.includes('user.update');
    const isProtectedPrimaryAdmin = Boolean(profile?.isProtectedPrimaryAdmin);
    const attendanceShiftOptions = currentUser?.company?.settings?.attendance?.attendanceShifts || DEFAULT_ATTENDANCE_SHIFTS;

    // Reset active tab if it becomes unauthorized or module is disabled
    useEffect(() => {
        if (activeTab === 'ta-analytics' && !isAuthorizedForTA) setActiveTab('overview');
        if (activeTab === 'attendance' && !hasAttendance) setActiveTab('overview');
        if (activeTab === 'timesheet' && !hasTimesheet) setActiveTab('overview');
        if (activeTab === 'dossier' && !hasDossier) setActiveTab('overview');
    }, [activeTab, isAuthorizedForTA, hasAttendance, hasTimesheet, hasDossier]);

    const calculateSalaryBreakdown = (updatedSalaryFields) => {
        setFormData(prev => {
            const mergedSalary = { ...prev.salary, ...updatedSalaryFields };
            const payType = mergedSalary.payType || 'salaried';
            
            let annualCTC = parseFloat(String(mergedSalary.annualCTC).replace(/[^0-9.]/g, '')) || 0;
            let monthlyCTC = parseFloat(String(mergedSalary.monthlyCTC).replace(/[^0-9.]/g, '')) || 0;
            
            if (updatedSalaryFields.annualCTC !== undefined) {
                monthlyCTC = Math.round(annualCTC / 12);
            } else if (updatedSalaryFields.monthlyCTC !== undefined) {
                annualCTC = monthlyCTC * 12;
            }
            
            let basicVal = '0';
            let grossVal = '0';
            
            if (payType === 'hourly') {
                const hourlyRate = parseFloat(String(mergedSalary.hourlyRate).replace(/[^0-9.]/g, '')) || 0;
                const hoursWorked = parseFloat(String(mergedSalary.hoursWorked || 160).replace(/[^0-9.]/g, '')) || 160;
                monthlyCTC = hourlyRate * hoursWorked;
                annualCTC = monthlyCTC * 12;
                basicVal = String(monthlyCTC);
                grossVal = String(monthlyCTC);
            } else if (payType === 'flat') {
                const flatSalary = parseFloat(String(mergedSalary.flatSalary || monthlyCTC).replace(/[^0-9.]/g, '')) || 0;
                monthlyCTC = flatSalary;
                annualCTC = flatSalary * 12;
                basicVal = String(flatSalary);
                grossVal = String(flatSalary);
            }
            
            const source = {
                monthlyCTC,
                pfEnabled: mergedSalary.pfEnabled !== false,
                esiEnabled: mergedSalary.esiEnabled !== false,
                ptEnabled: mergedSalary.ptEnabled !== false,
                lwfEnabled: mergedSalary.lwfEnabled !== false,
                gratuityEnabled: mergedSalary.gratuityEnabled !== false,
                includePfInCTC: !!mergedSalary.includePfInCTC,
                includeGratuityInCTC: mergedSalary.includeGratuityInCTC !== false,
                basicPercent: mergedSalary.basicPercent !== undefined && mergedSalary.basicPercent !== null ? Number(mergedSalary.basicPercent) : null,
                hraPercent: mergedSalary.hraPercent !== undefined && mergedSalary.hraPercent !== null ? Number(mergedSalary.hraPercent) : null,
                insuranceAmount: parseFloat(mergedSalary.insuranceAmount) || 0,
                employerNPS: parseFloat(mergedSalary.employerNPS) || 0,
                ptState: mergedSalary.ptState || '',
                deductions: {
                    professionalTax: mergedSalary.ptState === 'custom' ? (parseFloat(mergedSalary.professionalTax) || 0) : 0,
                }
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
                grossVal = String(master.grossSalary || master.totalEarnings);
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
                ...prev,
                salary: {
                    ...mergedSalary,
                    annualCTC: String(annualCTC),
                    monthlyCTC: String(monthlyCTC),
                    basic: basicVal,
                    monthlyGross: grossVal,
                }
            };
        });
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch the specific user profile
            const res = await api.get(`/admin/users/${id}`, {
                params: { includeDeleted: true }
            });
            const userData = res.data;
            setProfile(userData);

            let salaryData = {
                annualCTC: '',
                monthlyCTC: '',
                payType: 'salaried',
                pfEnabled: true,
                esiEnabled: true,
                ptEnabled: true,
                lwfEnabled: true,
                gratuityEnabled: true,
                includePfInCTC: false,
                includeGratuityInCTC: true,
                basicPercent: null,
                hraPercent: null,
                useSalaryComponents: true,
                ptState: 'MH',
                professionalTax: '0',
                insuranceAmount: 0,
                employerNPS: 0,
            };

            let configData = null;
            try {
                const configRes = await api.get('/payroll/config');
                configData = configRes.data;
                setPayrollConfig(configData);
            } catch (err) {
                console.log('Failed to fetch payroll config:', err);
            }

            try {
                const dossierRes = await api.get(`/dossier/${id}`);
                const comp = dossierRes.data?.compensation || {};
                const breakup = comp.salaryBreakup || {};
                
                salaryData = {
                    annualCTC: comp.ctc ? String(comp.ctc * 12) : '',
                    monthlyCTC: comp.ctc ? String(comp.ctc) : '',
                    payType: breakup.payType || 'salaried',
                    pfEnabled: breakup.pfEnabled !== false,
                    esiEnabled: breakup.esiEnabled !== false,
                    ptEnabled: breakup.ptEnabled !== false,
                    lwfEnabled: breakup.lwfEnabled !== false,
                    gratuityEnabled: breakup.gratuityEnabled !== false,
                    includePfInCTC: !!breakup.includePfInCTC,
                    includeGratuityInCTC: breakup.includeGratuityInCTC !== false,
                    basicPercent: breakup.basicPercent !== undefined && breakup.basicPercent !== null ? breakup.basicPercent : null,
                    hraPercent: breakup.hraPercent !== undefined && breakup.hraPercent !== null ? breakup.hraPercent : null,
                    useSalaryComponents: breakup.useSalaryComponents !== false,
                    ptState: breakup.ptState || 'MH',
                    professionalTax: breakup.professionalTax !== undefined ? String(breakup.professionalTax) : '0',
                    insuranceAmount: comp.insuranceAmount || 0,
                    employerNPS: comp.employerNPS || 0,
                    basic: breakup.basic || '',
                    hra: breakup.hra || '',
                    specialAllowance: breakup.specialAllowance || '',
                    monthlyGross: breakup.monthlyGross || '',
                    pfEmployer: breakup.pfEmployer || '0',
                    pfEmployee: breakup.pfEmployee || '0',
                    gratuity: breakup.gratuity || '0',
                    lwfEmployer: breakup.lwfEmployer || '0',
                    lwfEmployee: breakup.lwfEmployee || '0',
                    esiEmployer: breakup.esiEmployer || '0',
                    esiEmployee: breakup.esiEmployee || '0',
                    professionalTaxVal: breakup.professionalTax || '0',
                    tds: breakup.tds || '0',
                    netTakeHome: breakup.netTakeHome || '0',
                };
                if (configData?.salaryComponents) {
                    configData.salaryComponents.forEach(c => {
                        if (breakup[c.id] !== undefined) {
                            salaryData[c.id] = String(breakup[c.id]);
                        } else if (c.linkedTo === 'fixed') {
                            salaryData[c.id] = String(c.linkValue || 0);
                        }
                    });
                }
            } catch (err) {
                console.error('Failed to fetch user dossier compensation:', err);
            }

            // Recalculate salary breakdown on open to ensure computed components are updated
            if (salaryData.monthlyCTC) {
                let annualCTC = parseFloat(String(salaryData.annualCTC).replace(/[^0-9.]/g, '')) || 0;
                let monthlyCTC = parseFloat(String(salaryData.monthlyCTC).replace(/[^0-9.]/g, '')) || 0;
                if (salaryData.annualCTC) {
                    monthlyCTC = Math.round(annualCTC / 12);
                } else if (salaryData.monthlyCTC) {
                    annualCTC = monthlyCTC * 12;
                }
                const payType = salaryData.payType || 'salaried';
                let basicVal = '0';
                let grossVal = '0';
                if (payType === 'hourly') {
                    const hourlyRate = parseFloat(String(salaryData.hourlyRate).replace(/[^0-9.]/g, '')) || 0;
                    const hoursWorked = parseFloat(String(salaryData.hoursWorked || 160).replace(/[^0-9.]/g, '')) || 160;
                    monthlyCTC = hourlyRate * hoursWorked;
                    annualCTC = monthlyCTC * 12;
                    basicVal = String(monthlyCTC);
                    grossVal = String(monthlyCTC);
                } else if (payType === 'flat') {
                    const flatSalary = parseFloat(String(salaryData.flatSalary || monthlyCTC).replace(/[^0-9.]/g, '')) || 0;
                    monthlyCTC = flatSalary;
                    annualCTC = flatSalary * 12;
                    basicVal = String(flatSalary);
                    grossVal = String(flatSalary);
                }
                const source = {
                    monthlyCTC,
                    pfEnabled: salaryData.pfEnabled !== false,
                    esiEnabled: salaryData.esiEnabled !== false,
                    ptEnabled: salaryData.ptEnabled !== false,
                    lwfEnabled: salaryData.lwfEnabled !== false,
                    gratuityEnabled: salaryData.gratuityEnabled !== false,
                    includePfInCTC: !!salaryData.includePfInCTC,
                    includeGratuityInCTC: salaryData.includeGratuityInCTC !== false,
                    basicPercent: salaryData.basicPercent !== undefined && salaryData.basicPercent !== null ? Number(salaryData.basicPercent) : null,
                    hraPercent: salaryData.hraPercent !== undefined && salaryData.hraPercent !== null ? Number(salaryData.hraPercent) : null,
                    insuranceAmount: parseFloat(salaryData.insuranceAmount) || 0,
                    employerNPS: parseFloat(salaryData.employerNPS) || 0,
                    ptState: salaryData.ptState || '',
                    deductions: {
                        professionalTax: salaryData.ptState === 'custom' ? (parseFloat(salaryData.professionalTax) || 0) : 0,
                    }
                };
                if (configData?.salaryComponents) {
                    configData.salaryComponents.forEach(c => {
                        if (c.linkedTo === 'fixed') {
                            const val = salaryData[c.id] !== undefined ? salaryData[c.id] : (c.linkValue || 0);
                            source[c.id] = parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
                        }
                    });
                }
                const master = buildMasterSalaryStructure(source, configData);
                if (master) {
                    basicVal = String(master.basicMaster || 0);
                    grossVal = String(master.grossSalary || master.totalEarnings);
                    salaryData.pfEmployer = String(master.pfEmployer || 0);
                    salaryData.pfEmployee = String(master.pfEmployee || 0);
                    salaryData.gratuity = String(master.gratuity || 0);
                    salaryData.lwfEmployer = String(master.lwfEmployer || 0);
                    salaryData.lwfEmployee = String(master.lwfEmployee || 0);
                    salaryData.esiEmployer = String(master.esiEmployer || 0);
                    salaryData.esiEmployee = String(master.esiEmployee || 0);
                    salaryData.professionalTax = String(master.professionalTax || 0);
                    salaryData.tds = String(master.tds || 0);
                    salaryData.netTakeHome = String(master.netTakeHome || 0);
                    if (master.earningsMap) {
                        Object.entries(master.earningsMap).forEach(([id, val]) => {
                            salaryData[id] = String(val);
                        });
                    }
                }
                salaryData.annualCTC = String(annualCTC);
                salaryData.monthlyCTC = String(monthlyCTC);
                salaryData.basic = basicVal;
                salaryData.monthlyGross = grossVal;
            }

            // Pre-fill form data
            setFormData({
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                email: userData.email || '',
                password: '', // Blank by default, only sent if changed
                roleId: userData.roles?.[0]?._id || '',
                department: userData.department || '',
                employeeCode: userData.employeeCode || '',
                joiningDate: userData.joiningDate ? new Date(userData.joiningDate).toISOString().split('T')[0] : '',
                employmentType: userData.employmentType || 'Full Time',
                workLocation: userData.workLocation || '',
                attendanceMode: userData.attendanceMode || 'clock_in_out',
                attendanceShiftCode: userData.attendanceShiftCode || 'general',
                directReports: userData.directReports?.map(u => u._id) || [],
                reportingManagers: userData.reportingManagers?.map(u => u._id) || [],
                salary: salaryData
            });

            // Fetch roles and all users for edit form context if authorized
            if (isAuthorizedForEdit) {
                try {
                    const [rolesRes, usersRes] = await Promise.all([
                        api.get('/admin/roles'),
                        api.get('/admin/users')
                    ]);
                    setRoles(rolesRes.data);
                    setAllUsers(usersRes.data);
                } catch (err) {
                    console.log("Could not fetch roles/users context for edit form:", err);
                }
            }

        } catch (error) {
            console.error(error);
            toast.error('Failed to load employee profile');
            if (error.response?.status === 403 || error.response?.status === 404) {
                navigate('/users');
            }
        } finally {
            setLoading(false);
        }
    }, [id, isAuthorizedForEdit, navigate]);

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [fetchData, id]);

    const handleToggleActiveStatus = async () => {
        if (profile.isDeleted) return;
        if (isProtectedPrimaryAdmin && profile.isActive) {
            toast.error('The main admin created by Super Admin cannot be deactivated.');
            return;
        }
        if (!window.confirm(`Are you sure you want to ${profile.isActive ? 'deactivate' : 'activate'} this user?`)) return;

        try {
            const loadingToast = toast.loading(profile.isActive ? 'Deactivating user...' : 'Activating user...');
            const res = await api.patch(`/admin/users/${id}/status`);
            toast.success(res.data.message, { id: loadingToast });
            setProfile(prev => ({
                ...prev,
                isActive: res.data.isActive
            }));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update user status');
        }
    };

    const handleBinAction = async () => {
        if (!profile.isDeleted && isProtectedPrimaryAdmin) {
            toast.error('The main admin created by Super Admin cannot be moved to the bin.');
            return;
        }

        const confirmMessage = profile.isDeleted
            ? 'Are you sure you want to restore this user from the recycle bin?'
            : 'Are you sure you want to move this user to the recycle bin?';

        if (!window.confirm(confirmMessage)) return;
        
        try {
            const loadingToast = toast.loading(profile.isDeleted ? 'Restoring user...' : 'Moving user to recycle bin...');

            if (!profile.isDeleted) {
                const res = await api.delete(`/admin/users/${id}`);
                toast.success(res.data.message, { id: loadingToast });
                navigate((currentUser?.roles?.includes('Admin') || currentUser?.permissions?.includes('bin.view')) ? '/bin' : '/users');
                return;
            }

            let res;

            try {
                res = await restoreBinItem('user', id);
            } catch (restoreError) {
                if (restoreError.response?.status === 409 && restoreError.response?.data?.requiresAction) {
                    const shouldReplace = window.confirm(`${restoreError.response.data.message}\n\nPress OK to replace the current user, or Cancel to stop.`);
                    if (!shouldReplace) {
                        toast.dismiss(loadingToast);
                        toast('Restore cancelled');
                        return;
                    }

                    res = await restoreBinItem('user', id, { action: 'replace' });
                } else {
                    throw restoreError;
                }
            }

            toast.success(res.data.message || 'User restored successfully', { id: loadingToast });
            await fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    };

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const loadingToast = toast.loading('Updating user...');
            await api.put(`/admin/users/${id}`, formData);
            toast.success('User updated successfully', { id: loadingToast });
            // Refresh data and switch back to overview
            await fetchData();
            setShowPassword(false);
            setActiveTab('overview');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update user');
        }
    };

    if (loading) {
        return (
            <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
                <div className="h-32 bg-slate-200 rounded-xl"></div>
                <div className="flex gap-4">
                    <div className="h-10 bg-slate-200 rounded w-24"></div>
                    <div className="h-10 bg-slate-200 rounded w-24"></div>
                    <div className="h-10 bg-slate-200 rounded w-24"></div>
                </div>
                <div className="h-64 bg-slate-200 rounded-xl"></div>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="min-h-screen bg-slate-100 font-sans p-4 sm:p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Back Button & Header */}
                <div className="flex items-center gap-4 mb-2">
                    <button
                        onClick={() => navigate('/users')}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Employee Details</h1>
                        <p className="text-sm text-slate-500">Manage profile and view analytics</p>
                    </div>
                </div>

                {/* Profile Header Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
                    <div className="h-24 bg-gradient-to-r from-slate-700 to-slate-900"></div>
                    <div className="px-6 sm:px-8 pb-6 bg-white relative">
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-10 sm:-mt-12 gap-4">
                            <div className="flex items-end gap-4">
                                <div 
                                    onClick={() => profile.profilePicture && setShowViewModal(true)}
                                    className={`h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-3xl font-bold text-slate-400 shadow-sm shrink-0 overflow-hidden relative group ${profile.profilePicture ? 'cursor-pointer hover:brightness-95 transition-all' : ''}`}
                                >
                                    {profile.profilePicture ? (
                                        <img src={profile.profilePicture} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        `${profile.firstName?.charAt(0)}${profile.lastName?.charAt(0)}`
                                    )}
                                </div>
                                <div className="pb-1 sm:pb-2">
                                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 whitespace-nowrap">
                                        {profile.firstName} {profile.lastName}
                                    </h2>
                                    <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                                        <Mail size={14} /> {profile.email}
                                    </p>
                                    {profile.profilePictureMetadata && (profile.profilePictureMetadata.latitude !== null && profile.profilePictureMetadata.latitude !== undefined) && (
                                        <div className="flex flex-col gap-1 mt-2 text-slate-500 text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-lg shadow-sm w-fit">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={13} className="text-blue-500 shrink-0" />
                                                <span className="font-semibold">
                                                    Photo Stamp: {parseFloat(profile.profilePictureMetadata.latitude).toFixed(5)}°, {parseFloat(profile.profilePictureMetadata.longitude).toFixed(5)}° at {new Date(profile.profilePictureMetadata.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            {profile.profilePictureMetadata.address && (
                                                <div className="flex items-start gap-1 mt-1 border-t border-slate-200/60 pt-1 text-[11px] text-slate-500">
                                                    <span className="font-bold text-slate-700 shrink-0">Address: </span>
                                                    <span className="leading-relaxed" title={profile.profilePictureMetadata.address}>{profile.profilePictureMetadata.address}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:pb-2">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${profile.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                    {profile.isActive ? 'Active' : (profile.isDeleted ? 'In Bin' : 'Inactive')}
                                </span>
                                {profile.roles?.map(role => (
                                    <span key={role._id} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                        <Shield size={12} /> {role.name}
                                    </span>
                                ))}
                                {isProtectedPrimaryAdmin && (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                        Primary Admin
                                    </span>
                                )}
                                {isAuthorizedForEdit && (
                                    <>
                                        {!profile.isDeleted && (!isProtectedPrimaryAdmin || !profile.isActive) && (
                                            <button
                                                onClick={handleToggleActiveStatus}
                                                className={`ml-2 px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border ${
                                                    profile.isActive
                                                        ? 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                                                        : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                                                }`}
                                            >
                                                {profile.isActive ? <UserMinus size={14} /> : <UserCheck size={14} />}
                                                {profile.isActive ? 'Deactivate User' : 'Activate User'}
                                            </button>
                                        )}
                                        {(!isProtectedPrimaryAdmin || profile.isDeleted) && (
                                            <button
                                                onClick={handleBinAction}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border ${
                                                    profile.isDeleted
                                                        ? 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                                                        : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                                                }`}
                                            >
                                                {profile.isDeleted ? <UserCheck size={14} /> : <UserMinus size={14} />}
                                                {profile.isDeleted ? 'Restore User' : 'Move To Bin'}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {isProtectedPrimaryAdmin && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 flex items-start gap-3">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold">Protected company admin</p>
                            <p className="text-sm">This is the main admin account created by Super Admin, so it cannot be deactivated or moved to the recycle bin.</p>
                        </div>
                    </div>
                )}

                {/* Navigation Tabs */}
                <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex flex-nowrap overflow-x-auto hide-scrollbar gap-1">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                    >
                        <User size={16} /> Overview
                    </button>

                    {isAuthorizedForEdit && (
                        <button
                            onClick={() => setActiveTab('edit')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'edit' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                            <Edit2 size={16} /> Edit Details
                        </button>
                    )}

                    {hasTimesheet && (
                        <button
                            onClick={() => setActiveTab('timesheet')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'timesheet' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                            <Clock size={16} /> Timesheet
                        </button>
                    )}

                    {hasAttendance && (
                        <button
                            onClick={() => setActiveTab('attendance')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'attendance' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                            <Clock size={16} /> Attendance
                        </button>
                    )}

                    {hasDossier && (
                        <button
                            onClick={() => setActiveTab('dossier')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'dossier' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                            <FileText size={16} /> Dossier
                        </button>
                    )}

                    {isAuthorizedForTA && (
                        <button
                            onClick={() => setActiveTab('ta-analytics')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'ta-analytics' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                            <Activity size={16} /> TA Analytics
                        </button>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="w-full">

                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Basic Info Card */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                                        <Briefcase size={18} className="text-blue-600" /> Work Information
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Employee ID</p>
                                            <p className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                                                <Hash size={16} className="text-slate-400" /> {profile.employeeCode || 'Not Assigned'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</p>
                                            <p className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                                                <Briefcase size={16} className="text-slate-400" /> {profile.department || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Employment Type</p>
                                            <p className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                                                <User size={16} className="text-slate-400" /> {profile.employmentType || 'Full Time'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Work Location</p>
                                            <p className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                                                <MapPin size={16} className="text-slate-400" /> {profile.workLocation || ''}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date of Joining</p>
                                            <p className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                                                <Calendar size={16} className="text-slate-400" />
                                                {profile.joiningDate ? format(new Date(profile.joiningDate), 'MMM dd, yyyy') : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Organization Card */}
                            <div className="space-y-6">
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                                        <Users size={18} className="text-blue-600" /> Organization
                                    </h3>

                                    <div className="space-y-5">
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Reporting Manager(s)</p>
                                            {profile.reportingManagers && profile.reportingManagers.length > 0 ? (
                                                <div className="space-y-2">
                                                    {profile.reportingManagers.map(manager => (
                                                        <div key={manager._id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => navigate(`/users/${manager._id}`)}>
                                                            <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                                {manager.firstName.charAt(0)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-slate-800 truncate">{manager.firstName} {manager.lastName}</p>
                                                                <p className="text-[11px] text-slate-500 truncate">{manager.email}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500 italic">No reporting manager assigned.</p>
                                            )}
                                        </div>

                                        {profile.directReports && profile.directReports.length > 0 && (
                                            <div>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Direct Reports ({profile.directReports.length})</p>
                                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                                    {profile.directReports.map(report => (
                                                        <div key={report._id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => navigate(`/users/${report._id}`)}>
                                                            <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                                {report.firstName.charAt(0)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-slate-800 truncate">{report.firstName} {report.lastName}</p>
                                                                <p className="text-[11px] text-slate-500 truncate">{report.department || report.employeeCode || '-'}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* EDIT TAB */}
                    {activeTab === 'edit' && isAuthorizedForEdit && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-4xl mx-auto">
                            <div className="mb-6 border-b border-slate-100 pb-4">
                                <h3 className="text-lg font-bold text-slate-800">Edit Employee Details</h3>
                                <p className="text-sm text-slate-500">Update system records and access for this user.</p>
                            </div>

                            <form onSubmit={handleEditSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">First Name</label>
                                        <input name="firstName" required value={formData.firstName} onChange={handleFormChange} className="zoho-input" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Last Name</label>
                                        <input name="lastName" value={formData.lastName} onChange={handleFormChange} className="zoho-input" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                        <input name="email" type="email" required value={formData.email} onChange={handleFormChange} className="zoho-input" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password (Leave blank to keep current)</label>
                                        <div className="relative">
                                            <input
                                                name="password"
                                                type={showPassword ? 'text' : 'password'}
                                                onChange={handleFormChange}
                                                className="zoho-input pr-11"
                                                placeholder="********"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((current) => !current)}
                                                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-600"
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Employee Code</label>
                                        <input name="employeeCode" value={formData.employeeCode} onChange={handleFormChange} className="zoho-input" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date of Joining</label>
                                        <input name="joiningDate" type="date" value={formData.joiningDate} onChange={handleFormChange} className="zoho-input" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
                                        <input name="department" value={formData.department} onChange={handleFormChange} className="zoho-input" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Work Location</label>
                                        <input name="workLocation" value={formData.workLocation} onChange={handleFormChange} className="zoho-input" placeholder="e.g. Remote, NY Office" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Employment Type</label>
                                        <select name="employmentType" value={formData.employmentType} onChange={handleFormChange} className="zoho-input">
                                            <option value="Full Time">Full Time</option>
                                            <option value="Part Time">Part Time</option>
                                            <option value="Contract">Contract</option>
                                            <option value="Intern">Intern</option>
                                            <option value="Consultant">Consultant</option>
                                            <option value="Freelance">Freelance</option>
                                            <option value="Probation">Probation</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">System Role</label>
                                        <select name="roleId" required value={formData.roleId} onChange={handleFormChange} className="zoho-input">
                                            <option value="">Select Role</option>
                                            {roles.map(r => (
                                                <option key={r._id} value={r._id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Attendance Mode</label>
                                        <select name="attendanceMode" value={formData.attendanceMode} onChange={handleFormChange} className="zoho-input">
                                            <option value="clock_in_out">Clock In / Clock Out</option>
                                            <option value="present_only">Mark Present Only</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Attendance Shift</label>
                                        <select name="attendanceShiftCode" value={formData.attendanceShiftCode} onChange={handleFormChange} className="zoho-input">
                                            {attendanceShiftOptions.map((shift) => (
                                                <option key={shift.code} value={shift.code}>
                                                    {shift.name} ({shift.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assign Subordinates (Users who report to this employee)</label>
                                    <div className="h-48 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-2 custom-scrollbar">
                                        {allUsers.filter(u => u._id !== profile._id).map(userAcc => (
                                            <label key={userAcc._id} className="flex items-start space-x-3 text-sm bg-white p-2.5 rounded hover:bg-blue-50 cursor-pointer border border-transparent hover:border-blue-100 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    value={userAcc._id}
                                                    checked={formData.directReports?.includes(userAcc._id)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        const uId = userAcc._id;
                                                        setFormData(prev => {
                                                            const current = prev.directReports || [];
                                                            if (checked) return { ...prev, directReports: [...current, uId] };
                                                            return { ...prev, directReports: current.filter(x => x !== uId) };
                                                        });
                                                    }}
                                                    className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold text-slate-700 truncate">{userAcc.firstName} {userAcc.lastName}</span>
                                                    <span className="text-[11px] text-slate-500 truncate">{userAcc.email}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Salary Details Section */}
                                <div className="mt-4 border-t border-slate-100 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowSalarySection(!showSalarySection)}
                                        className="w-full flex items-center justify-between py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition focus:outline-none"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Settings2 size={16} className="text-slate-400" />
                                            <span>Salary & Compensation Details</span>
                                        </div>
                                        {showSalarySection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>

                                    {showSalarySection && formData.salary && (
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                                            {/* Left Side: Inputs */}
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pay Type</label>
                                                    <select
                                                        value={formData.salary.payType || 'salaried'}
                                                        onChange={(e) => calculateSalaryBreakdown({ payType: e.target.value })}
                                                        className="zoho-input"
                                                    >
                                                        <option value="salaried">Salaried (Monthly Base)</option>
                                                        <option value="hourly">Hourly Contractor</option>
                                                        <option value="flat">Flat Salary — No Component Breakdown</option>
                                                    </select>
                                                </div>

                                                {formData.salary.payType === 'hourly' ? (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hourly Rate (INR)</label>
                                                            <input
                                                                value={formData.salary.hourlyRate || ''}
                                                                onChange={(e) => calculateSalaryBreakdown({ hourlyRate: e.target.value })}
                                                                placeholder="e.g. 500"
                                                                className="zoho-input"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estimated Hours</label>
                                                            <input
                                                                value={formData.salary.hoursWorked || '160'}
                                                                onChange={(e) => calculateSalaryBreakdown({ hoursWorked: e.target.value })}
                                                                placeholder="e.g. 160"
                                                                className="zoho-input"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : formData.salary.payType === 'flat' ? (
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Flat Monthly Salary</label>
                                                        <input
                                                            value={formData.salary.flatSalary || formData.salary.monthlyCTC || ''}
                                                            onChange={(e) => calculateSalaryBreakdown({ flatSalary: e.target.value, monthlyCTC: e.target.value })}
                                                            placeholder="e.g. 50,000"
                                                            className="zoho-input"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Annual CTC</label>
                                                            <input
                                                                value={formData.salary.annualCTC}
                                                                onChange={(e) => calculateSalaryBreakdown({ annualCTC: e.target.value })}
                                                                placeholder="e.g. 6,00,000"
                                                                className="zoho-input"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monthly CTC</label>
                                                            <input
                                                                value={formData.salary.monthlyCTC}
                                                                onChange={(e) => calculateSalaryBreakdown({ monthlyCTC: e.target.value })}
                                                                placeholder="e.g. 50,000"
                                                                className="zoho-input"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {formData.salary.payType === 'salaried' && (
                                                    <>
                                                        {/* Statutory Toggles */}
                                                        <div className="border border-slate-100 rounded-xl p-3 bg-white space-y-3 shadow-sm">
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Statutory Toggles</div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <label className="flex items-center justify-between p-2 rounded-lg border border-slate-50 bg-slate-50/20 cursor-pointer">
                                                                    <span className="text-xs font-medium text-slate-600">Provident Fund (PF)</span>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={formData.salary.pfEnabled !== false}
                                                                        onChange={(e) => calculateSalaryBreakdown({ pfEnabled: e.target.checked })}
                                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                                                    />
                                                                </label>

                                                                <label className="flex items-center justify-between p-2 rounded-lg border border-slate-50 bg-slate-50/20 cursor-pointer">
                                                                    <span className="text-xs font-medium text-slate-600">Gratuity Accrual</span>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={formData.salary.gratuityEnabled !== false}
                                                                        onChange={(e) => calculateSalaryBreakdown({ gratuityEnabled: e.target.checked })}
                                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                                                    />
                                                                </label>

                                                                <label className="flex items-center justify-between p-2 rounded-lg border border-slate-50 bg-slate-50/20 cursor-pointer">
                                                                    <span className="text-xs font-medium text-slate-600">ESI Applicable</span>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={formData.salary.esiEnabled !== false}
                                                                        onChange={(e) => calculateSalaryBreakdown({ esiEnabled: e.target.checked })}
                                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                                                    />
                                                                </label>

                                                                <label className="flex items-center justify-between p-2 rounded-lg border border-slate-50 bg-slate-50/20 cursor-pointer">
                                                                    <span className="text-xs font-medium text-slate-600">LWF Applicable</span>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={formData.salary.lwfEnabled !== false}
                                                                        onChange={(e) => calculateSalaryBreakdown({ lwfEnabled: e.target.checked })}
                                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                                                    />
                                                                </label>
                                                            </div>

                                                            {formData.salary.pfEnabled !== false && (
                                                                <label className="flex items-center justify-between p-2 border-t border-slate-50 cursor-pointer">
                                                                    <span className="text-xs text-slate-500">Include Employer PF in CTC</span>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={!!formData.salary.includePfInCTC}
                                                                        onChange={(e) => calculateSalaryBreakdown({ includePfInCTC: e.target.checked })}
                                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                                                    />
                                                                </label>
                                                            )}

                                                            {formData.salary.gratuityEnabled !== false && (
                                                                <label className="flex items-center justify-between p-2 border-t border-slate-50 cursor-pointer">
                                                                    <span className="text-xs text-slate-500">Include Gratuity in CTC</span>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={formData.salary.includeGratuityInCTC !== false}
                                                                        onChange={(e) => calculateSalaryBreakdown({ includeGratuityInCTC: e.target.checked })}
                                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                                                    />
                                                                </label>
                                                            )}
                                                        </div>

                                                        {/* State Tax (PT) */}
                                                        <div className="border border-slate-100 rounded-xl p-3 bg-white space-y-3 shadow-sm">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Professional Tax (PT)</span>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.salary.ptEnabled !== false}
                                                                    onChange={(e) => calculateSalaryBreakdown({ ptEnabled: e.target.checked })}
                                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                                                />
                                                            </div>
                                                            {formData.salary.ptEnabled !== false && (
                                                                <div className="space-y-2">
                                                                    <select
                                                                        value={formData.salary.ptState || 'MH'}
                                                                        onChange={(e) => calculateSalaryBreakdown({ ptState: e.target.value })}
                                                                        className="zoho-input"
                                                                    >
                                                                        <optgroup label="── No PT / Manual">
                                                                            <option value="">None — use manual override below</option>
                                                                            <option value="custom">Custom Override</option>
                                                                        </optgroup>
                                                                        <optgroup label="── States that levy PT">
                                                                            {PT_STATE_LIST.filter(s => s.leviesPT).map(s => (
                                                                                <option key={s.code} value={s.code}>{s.name}</option>
                                                                            ))}
                                                                        </optgroup>
                                                                        <optgroup label="── States with no PT">
                                                                            {PT_STATE_LIST.filter(s => s.code && !s.leviesPT).map(s => (
                                                                                <option key={s.code} value={s.code}>{s.name}</option>
                                                                            ))}
                                                                        </optgroup>
                                                                    </select>
                                                                    {formData.salary.ptState === 'custom' && (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs text-slate-500">Amount (₹):</span>
                                                                            <input
                                                                                type="number"
                                                                                value={formData.salary.professionalTax || 0}
                                                                                onChange={(e) => calculateSalaryBreakdown({ professionalTax: e.target.value })}
                                                                                className="w-24 text-xs rounded-lg border border-slate-200 px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Dynamic Salary Components Breakup */}
                                                        {payrollConfig?.salaryComponents && payrollConfig.salaryComponents.length > 0 && (
                                                            <div className="border border-slate-100 rounded-xl p-3 bg-white space-y-3 shadow-sm">
                                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Salary Components Breakup</div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    {payrollConfig.salaryComponents
                                                                        .filter(c => c.type === 'earning')
                                                                        .map(c => {
                                                                            const isFixed = c.linkedTo === 'fixed';
                                                                            const isRemainder = c.linkedTo === 'remainder';

                                                                            if (isFixed) {
                                                                                const val = formData.salary[c.id] !== undefined ? formData.salary[c.id] : (c.linkValue || '0');
                                                                                return (
                                                                                    <div key={c.id}>
                                                                                        <label className="block text-[10px] text-slate-500 font-medium mb-1">{c.name}</label>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={val}
                                                                                            onChange={(e) => calculateSalaryBreakdown({ [c.id]: e.target.value })}
                                                                                            className="zoho-input"
                                                                                        />
                                                                                    </div>
                                                                                );
                                                                            }

                                                                            const badge = isRemainder ? 'Remainder'
                                                                                : c.linkedTo === 'ctc_percent' ? `${Math.round((c.linkValue || 0) * 100)}% of CTC`
                                                                                : c.linkedTo === 'basic_percent' ? `${Math.round((c.linkValue || 0) * 100)}% of Basic`
                                                                                : '';
                                                                            const val = formData.salary[c.id] || '0';

                                                                            return (
                                                                                <div key={c.id}>
                                                                                    <label className="block text-[10px] text-slate-500 font-medium mb-1">{c.name}</label>
                                                                                    <div className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50/50 h-[32px] box-border">
                                                                                        <span className="text-xs font-semibold text-slate-700">₹{parseFloat(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                                                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 rounded-full px-1.5 py-0.5">{badge}</span>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })
                                                                    }
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Ratio Overrides */}
                                                        <div className="border border-slate-100 rounded-xl p-3 bg-white space-y-3 shadow-sm">
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ratio Overrides</div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Basic Override (%)</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        max="100"
                                                                        value={formData.salary.basicPercent !== undefined ? formData.salary.basicPercent : '50'}
                                                                        onChange={(e) => calculateSalaryBreakdown({ basicPercent: e.target.value })}
                                                                        className="zoho-input"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] text-slate-500 font-medium mb-1">HRA Override (% of Basic)</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        max="100"
                                                                        value={formData.salary.hraPercent !== undefined ? formData.salary.hraPercent : '50'}
                                                                        onChange={(e) => calculateSalaryBreakdown({ hraPercent: e.target.value })}
                                                                        className="zoho-input"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Other Fields */}
                                                        <div className="border border-slate-100 rounded-xl p-3 bg-white space-y-3 shadow-sm">
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Additional Components</div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Medical Ins. (Monthly)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={formData.salary.insuranceAmount || 0}
                                                                        onChange={(e) => calculateSalaryBreakdown({ insuranceAmount: e.target.value })}
                                                                        className="zoho-input"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Employer NPS (Monthly)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={formData.salary.employerNPS || 0}
                                                                        onChange={(e) => calculateSalaryBreakdown({ employerNPS: e.target.value })}
                                                                        className="zoho-input"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Right Side: Preview */}
                                            <div className="border border-slate-200/60 rounded-xl bg-white p-4 shadow-sm h-fit space-y-4">
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                                                    Salary Structure Preview (Monthly)
                                                </div>

                                                {formData.salary.payType === 'salaried' ? (
                                                    <div className="space-y-2 text-sm">
                                                        {payrollConfig?.salaryComponents && payrollConfig.salaryComponents.length > 0 ? (
                                                            payrollConfig.salaryComponents
                                                                .filter(c => c.type === 'earning')
                                                                .map(c => (
                                                                    <div key={c.id} className="flex justify-between items-center py-1 border-b border-slate-50">
                                                                        <span className="text-slate-500">{c.name}</span>
                                                                        <span className="font-semibold text-slate-800">₹{parseFloat(formData.salary[c.id] || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                                    </div>
                                                                ))
                                                        ) : (
                                                            <>
                                                                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                                                    <span className="text-slate-500">Basic Salary</span>
                                                                    <span className="font-semibold text-slate-800">₹{parseFloat(formData.salary.basic || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                                                    <span className="text-slate-500">HRA</span>
                                                                    <span className="font-semibold text-slate-800">₹{parseFloat(formData.salary.hra || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                                </div>
                                                                {payrollConfig?.salaryComponents?.some(c => c.id === 'special') && (
                                                                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                                                        <span className="text-slate-500">Special Allowance</span>
                                                                        <span className="font-semibold text-slate-800">₹{parseFloat(formData.salary.specialAllowance || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                                            <span className="text-slate-500">PF Employer Cost</span>
                                                            <span className="font-semibold text-slate-800">₹{parseFloat(formData.salary.pfEmployer || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                                            <span className="text-slate-500">Gratuity Accrual</span>
                                                            <span className="font-semibold text-slate-800">₹{parseFloat(formData.salary.gratuity || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                                            <span className="text-slate-500">Professional Tax (PT)</span>
                                                            <span className="font-semibold text-slate-800 text-rose-600">₹{parseFloat(formData.salary.professionalTax || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                                            <span className="text-slate-500">Employee PF</span>
                                                            <span className="font-semibold text-slate-800 text-rose-600">₹{parseFloat(formData.salary.pfEmployee || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-1.5 border-b border-slate-200 bg-slate-50 px-2 rounded font-bold">
                                                            <span className="text-slate-700">Gross Salary</span>
                                                            <span className="text-slate-900">₹{parseFloat(formData.salary.monthlyGross || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-1.5 bg-emerald-50 px-2 rounded font-bold text-emerald-950">
                                                            <span className="text-emerald-800">Est. Net Take-Home</span>
                                                            <span className="text-emerald-950">₹{parseFloat(formData.salary.netTakeHome || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2 text-sm text-slate-500 italic">
                                                        {formData.salary.payType === 'hourly' 
                                                            ? 'Hourly pay rates are billed based on hours worked. Estimated gross is shown.'
                                                            : 'Flat monthly salary has no component breakdown or deductions applied.'
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPassword(false);
                                            setActiveTab('overview');
                                        }}
                                        className="zoho-btn-secondary px-6"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="zoho-btn-primary px-6">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* TIMESHEET TAB */}
                    {activeTab === 'timesheet' && (
                        <div className="w-full">
                            <Timesheet
                                propUserId={profile._id}
                                propUserName={`${profile.firstName} ${profile.lastName}`}
                                initialTab="timesheet"
                                isEmbedded={true}
                            />
                        </div>
                    )}

                    {/* ATTENDANCE TAB */}
                    {activeTab === 'attendance' && (
                        <div className="w-full">
                            <Timesheet
                                propUserId={profile._id}
                                propUserName={`${profile.firstName} ${profile.lastName}`}
                                initialTab="attendance"
                                isEmbedded={true}
                            />
                        </div>
                    )}

                    {/* DOSSIER TAB */}
                    {activeTab === 'dossier' && (
                        <div className="w-full">
                            <EmployeeDossier userId={profile._id} embedded={true} />
                        </div>
                    )}

                    {/* TA ANALYTICS TAB */}
                    {activeTab === 'ta-analytics' && isAuthorizedForTA && (
                        <div className="w-full">
                            <UserTADashboard providedUserName={`${profile.firstName} ${profile.lastName}`} />
                        </div>
                    )}

                </div>
            </div>

            {showViewModal && profile?.profilePicture && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
                    onClick={() => setShowViewModal(false)}
                >
                    <div 
                        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl flex flex-col items-center gap-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            type="button"
                            onClick={() => setShowViewModal(false)}
                            className="absolute top-4 right-4 rounded-full bg-slate-100 p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                            aria-label="Close preview"
                        >
                            <X size={18} />
                        </button>

                        <h3 className="text-base font-bold text-slate-800 self-start">Profile Photo</h3>

                        {/* Image */}
                        <div className="h-64 w-64 rounded-full overflow-hidden border-4 border-slate-100 shadow-inner">
                            <img 
                                src={profile.profilePicture} 
                                alt="Profile Full View" 
                                className="h-full w-full object-cover"
                            />
                        </div>

                        {/* Photo Stamp Info */}
                        {profile.profilePictureMetadata && (profile.profilePictureMetadata.latitude !== null && profile.profilePictureMetadata.latitude !== undefined) && (
                            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                                <div className="flex items-start gap-2 text-xs text-slate-600">
                                    <MapPin size={15} className="text-blue-500 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold block text-slate-700">Photo Location Stamp:</span>
                                        <span>Latitude: {parseFloat(profile.profilePictureMetadata.latitude).toFixed(5)}°</span>
                                        <span className="ml-3">Longitude: {parseFloat(profile.profilePictureMetadata.longitude).toFixed(5)}°</span>
                                    </div>
                                </div>
                                {profile.profilePictureMetadata.address && (
                                    <div className="flex items-start gap-2 text-xs text-slate-600">
                                        <MapPin size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-bold block text-slate-700">Resolved Address:</span>
                                            <span className="leading-relaxed">{profile.profilePictureMetadata.address}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-start gap-2 text-xs text-slate-600">
                                    <Calendar size={15} className="text-indigo-500 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold block text-slate-700">Timestamp:</span>
                                        <span>{new Date(profile.profilePictureMetadata.timestamp).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex w-full gap-3 mt-2">
                            <button
                                type="button"
                                onClick={() => setShowViewModal(false)}
                                className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-900 shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeProfile;
