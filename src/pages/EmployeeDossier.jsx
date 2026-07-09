import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
    User, Briefcase, FileText, DollarSign, Calendar, Shield, Settings,
    ArrowLeft, CheckCircle, AlertCircle, X, Search, Clock, AlertTriangle, Info, Mail
} from 'lucide-react';
import toast from 'react-hot-toast';
import Skeleton from '../components/Skeleton';
import { format } from 'date-fns';
import Button from '../components/Button';

// Modular Tab Components
import { PersonalTab } from './EmployeeDossier/PersonalTab';
import { EmploymentTab } from './EmployeeDossier/EmploymentTab';
import { SalaryTab } from './EmployeeDossier/SalaryTab';
import { DocumentsTab } from './EmployeeDossier/DocumentsTab';
import { HrisTab } from './EmployeeDossier/HrisTab';
import { HistoryTab } from './EmployeeDossier/HistoryTab';
import { EmailHistoryTab } from './EmployeeDossier/EmailHistoryTab';
import { HrisRequestsTab } from './EmployeeDossier/HrisRequestsTab';
import { SettingsTab } from './EmployeeDossier/SettingsTab';

// Shared Helpers
import { mergePendingIntoProfile } from './EmployeeDossier/DossierHelpers';

const DEFAULT_COMPANY_LOGO_ALIGNMENT = 'left';
const DEFAULT_COMPANY_LOGO_SIZE = 140;

const EmployeeDossier = ({ userId: propUserId, embedded = false, initialTab = 'personal', onTabChange }) => {
    const { userId: paramUserId } = useParams();
    const location = useLocation();
    const userId = propUserId || paramUserId;
    const navigate = useNavigate();
    const { user: currentUser, refreshProfile } = useAuth();
    const isSelf = currentUser?._id && userId && (currentUser._id.toString() === userId.toString());
    const queryTab = useMemo(() => new URLSearchParams(location.search).get('tab') || '', [location.search]);
    
    const isCurrentUserAdmin = currentUser?.roles?.some((role) => {
        const roleName = typeof role === 'string' ? role : role?.name;
        return ['Admin', 'System Admin', 'Super Admin'].includes(roleName);
    });

    // Permissions
    const canEdit = isCurrentUserAdmin || currentUser?.permissions?.includes('dossier.edit') || currentUser?.permissions?.includes('payroll.salary.manage');
    const canApprove = isCurrentUserAdmin || currentUser?.permissions?.includes('dossier.approve');
    const canManageCompanyBranding = isCurrentUserAdmin || currentUser?.hasAllPermissions || currentUser?.permissions?.includes('*') || currentUser?.permissions?.includes('admin') || currentUser?.permissions?.includes('settings.company.manage');
    
    // Salary tab permission check
    const isPayrollUser = currentUser?.roles?.some((role) => {
        const roleName = typeof role === 'string' ? role : role?.name;
        return ['Payroll', 'PAYROLL', 'payroll'].includes(roleName);
    }) || currentUser?.permissions?.some((p) => {
        const permName = String(p || '').toLowerCase();
        return permName === 'payroll' || permName.includes('payroll');
    });

    const canViewSalaryTab = isCurrentUserAdmin ||
        (isSelf && (currentUser?.permissions?.includes('payroll.salary.view.self') ||
                    currentUser?.permissions?.includes('payroll.salary.view') ||
                    currentUser?.permissions?.includes('payroll.salary.manage') ||
                    isPayrollUser)) ||
        (!isSelf && (currentUser?.permissions?.includes('payroll.salary.view') ||
                     currentUser?.permissions?.includes('payroll.salary.manage') ||
                     isPayrollUser));

    // Common States
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(queryTab || initialTab || 'personal');
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({});
    const [pendingUpdates, setPendingUpdates] = useState(null); // staged unapproved changes
    const [savingSection, setSavingSection] = useState(null);
    
    // Tab-Specific States managed in parent for sharing/syncing
    const [historyLogs, setHistoryLogs] = useState([]);
    const [emailHistoryTab, setEmailHistoryTab] = useState('general');
    const [emailHistoryByTab, setEmailHistoryByTab] = useState({ general: [], onboarding: [], offboarding: [] });
    const [loadedEmailTabs, setLoadedEmailTabs] = useState({ general: false, onboarding: false, offboarding: false });
    const [loadingEmailHistory, setLoadingEmailHistory] = useState(false);
    
    const [hrisRequests, setHrisRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [hrisSearchTerm, setHrisSearchTerm] = useState('');

    const [companyBranding, setCompanyBranding] = useState({
        displayMode: 'talentcio',
        companyLogoUrl: '',
        logoAlignment: DEFAULT_COMPANY_LOGO_ALIGNMENT,
        logoSize: DEFAULT_COMPANY_LOGO_SIZE
    });
    const [loadingCompanyBranding, setLoadingCompanyBranding] = useState(false);
    const [savingCompanyBranding, setSavingCompanyBranding] = useState(false);
    const [uploadingCompanyLogo, setUploadingCompanyLogo] = useState(false);
    const [isCompanySettingsOpen, setIsCompanySettingsOpen] = useState(false);

    const [showHrisRedirectModal, setShowHrisRedirectModal] = useState(false);
    const [submittingDirectly, setSubmittingDirectly] = useState(false);

    // Module & Admin Flags
    const hasDossierModule = currentUser?.company?.enabledModules?.includes('employeeDossier');
    const hasAdminRole = isCurrentUserAdmin;
    const canViewRolesSettings = hasAdminRole || currentUser?.permissions?.includes('role.read') || currentUser?.hasAllPermissions;
    const canViewAttendanceSettings = currentUser?.company?.enabledModules?.includes('attendance') && (hasAdminRole || currentUser?.permissions?.includes('user.update') || currentUser?.hasAllPermissions);
    const canViewLeavePolicies = currentUser?.company?.enabledModules?.includes('leaves') && (hasAdminRole || currentUser?.permissions?.includes('leave.config.manage') || currentUser?.hasAllPermissions);
    const canViewSettingsTab = canViewRolesSettings || canViewAttendanceSettings || canViewLeavePolicies || canManageCompanyBranding;
    const canViewEmailHistory = hasAdminRole || currentUser?.permissions?.includes('hr_email.send') || currentUser?.hasAllPermissions;

    // Initialize editable state when a section enters edit mode.
    useEffect(() => {
        if (editMode && profile) {
            if (pendingUpdates) {
                setFormData(mergePendingIntoProfile(profile, pendingUpdates));
            } else {
                setFormData(JSON.parse(JSON.stringify(profile)));
            }
        }
    }, [editMode, profile, pendingUpdates]);

    // Automatically sync/reset formData to the latest profile data (live + pending) when exiting edit mode
    useEffect(() => {
        if (!editMode && profile) {
            if (pendingUpdates) {
                setFormData(mergePendingIntoProfile(profile, pendingUpdates));
            } else {
                setFormData(JSON.parse(JSON.stringify(profile)));
            }
        }
    }, [editMode, profile, pendingUpdates]);

    const syncCurrentUserProfile = useCallback(async () => {
        if (!refreshProfile) return;
        try {
            await refreshProfile();
        } catch (error) {
            console.error('Failed to refresh profile:', error);
        }
    }, [refreshProfile]);

    const fetchCompanyBrandingSettings = useCallback(async () => {
        if (!canManageCompanyBranding) return;
        try {
            setLoadingCompanyBranding(true);
            const { data } = await api.get('/admin/company-settings/branding');
            setCompanyBranding({
                displayMode: data?.displayMode || 'talentcio',
                companyLogoUrl: data?.companyLogoUrl || '',
                logoAlignment: data?.logoAlignment || DEFAULT_COMPANY_LOGO_ALIGNMENT,
                logoSize: Number(data?.logoSize) || DEFAULT_COMPANY_LOGO_SIZE,
                requireCameraCapture: Boolean(data?.requireCameraCapture)
            });
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to load company settings');
        } finally {
            setLoadingCompanyBranding(false);
        }
    }, [canManageCompanyBranding]);

    useEffect(() => {
        if (activeTab === 'settings' && canManageCompanyBranding) {
            fetchCompanyBrandingSettings();
        }
    }, [activeTab, canManageCompanyBranding, fetchCompanyBrandingSettings]);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await api.get(`/dossier/${userId}/history`);
            setHistoryLogs(res.data);
        } catch (error) {
            console.error('Failed to fetch history', error);
            toast.error('Could not load history');
        }
    }, [userId]);

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab, fetchHistory]);

    const fetchEmailHistory = useCallback(async (tabType) => {
        if (!canViewEmailHistory) return;
        const targetType = tabType || emailHistoryTab;

        try {
            setLoadingEmailHistory(true);
            const response = await api.get(`/hr-email/history/${userId}?type=${targetType}`);
            const emails = Array.isArray(response.data?.history) ? response.data.history : [];
            setEmailHistoryByTab(prev => ({ ...prev, [targetType]: emails }));
            setLoadedEmailTabs(prev => ({ ...prev, [targetType]: true }));
        } catch (error) {
            console.error(`Failed to fetch HR email history for ${targetType}`, error);
            toast.error(error.response?.data?.message || `Could not load ${targetType} email history`);
        } finally {
            setLoadingEmailHistory(false);
        }
    }, [canViewEmailHistory, userId, emailHistoryTab]);

    useEffect(() => {
        if (activeTab === 'email-history' && !loadedEmailTabs[emailHistoryTab]) {
            fetchEmailHistory(emailHistoryTab);
        }
    }, [activeTab, emailHistoryTab, fetchEmailHistory, loadedEmailTabs]);

    // Fetch Dossier Data
    const fetchDossier = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/dossier/${userId}`);
            const liveProfile = res.data;
            const pending = res.data.pendingUpdates || null;

            setProfile(liveProfile);
            setPendingUpdates(pending);

            if (pending) {
                setFormData(mergePendingIntoProfile(liveProfile, pending));
            } else {
                setFormData(JSON.parse(JSON.stringify(liveProfile)));
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load employee dossier');
            if (error.response && error.response.status === 404) {
                navigate('/users');
            }
            if (error.response && error.response.status === 403) {
                navigate('/unauthorized');
            }
        } finally {
            setLoading(false);
        }
    }, [userId, navigate]);

    useEffect(() => {
        if (userId) {
            setEditMode(false);
            fetchDossier();
        }
    }, [userId, fetchDossier]);

    const fetchHRISRequests = async () => {
        try {
            setLoadingRequests(true);
            const res = await api.get('/dossier/requests');
            setHrisRequests(res.data);
        } catch (error) {
            console.error('Failed to fetch HRIS requests', error);
        } finally {
            setLoadingRequests(false);
        }
    };

    const handleHRISApproveOther = async (id) => {
        try {
            const toastId = toast.loading('Approving HRIS request...');
            await api.patch(`/dossier/${id}/approve-hris`);
            toast.dismiss(toastId);
            toast.success('HRIS Approved');
            if (activeTab === 'requests') {
                fetchHRISRequests();
            } else {
                fetchDossier();
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to approve HRIS');
        }
    };

    const handleHRISRejectOther = async (id) => {
        const reason = window.prompt('Please enter a reason for rejection:');
        if (reason === null) return;
        try {
            const toastId = toast.loading('Rejecting HRIS request...');
            await api.patch(`/dossier/${id}/reject-hris`, { reason });
            toast.dismiss(toastId);
            toast.success('HRIS Rejected');
            if (activeTab === 'requests') {
                fetchHRISRequests();
            } else {
                fetchDossier();
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to reject HRIS');
        }
    };

    useEffect(() => {
        if (canApprove && activeTab === 'requests') {
            fetchHRISRequests();
        }
    }, [activeTab, canApprove]);

    const tabs = useMemo(() => {
        const nextTabs = [
            { id: 'personal', label: 'Personal', icon: User },
            { id: 'employment', label: 'Employment History', icon: Briefcase }
        ];

        if (hasDossierModule) {
            if (canViewSalaryTab) {
                nextTabs.push({ id: 'salary', label: 'Salary', icon: DollarSign });
            }
            nextTabs.push(
                { id: 'hris', label: 'EIS', icon: Shield },
                { id: 'documents', label: 'Documents', icon: FileText },
                { id: 'history', label: 'Activities', icon: Calendar }
            );

            if (canViewEmailHistory) {
                nextTabs.push({ id: 'email-history', label: 'Email History', icon: Mail });
            }
        }

        if (canApprove && hasDossierModule) {
            nextTabs.push({ id: 'requests', label: 'Requests', icon: AlertCircle });
        }

        if (canViewSettingsTab) {
            nextTabs.push({ id: 'settings', label: 'Settings', icon: Settings });
        }

        return nextTabs;
    }, [canViewEmailHistory, canViewSettingsTab, hasDossierModule, canApprove, canViewSalaryTab]);

    // Ensure active tab defaults to 'personal' if user tries to reach a disabled tab
    useEffect(() => {
        if (!hasDossierModule && ['salary', 'documents', 'hris', 'history', 'email-history', 'requests'].includes(activeTab)) {
            setActiveTab('personal');
        } else if (activeTab === 'salary' && !canViewSalaryTab) {
            setActiveTab('personal');
        }
    }, [hasDossierModule, activeTab, canViewSalaryTab]);

    useEffect(() => {
        const requestedTab = queryTab || initialTab;
        if (!requestedTab) return;

        const tabExists = tabs.some((tab) => tab.id === requestedTab);
        if (tabExists) {
            setActiveTab(requestedTab);
        }
    }, [initialTab, queryTab, tabs]);

    const redirectToHRISEdit = () => {
        setActiveTab('hris');
        setEditMode('hris');
    };

    const handleTabSelect = useCallback((tabId) => {
        setActiveTab(tabId);
        if (onTabChange) {
            onTabChange(tabId);
        }
    }, [onTabChange]);

    // Handlers for data updates
    const handleInputChange = (section, field, value) => {
        setFormData(prev => {
            const newState = {
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value
                }
            };
            if (section !== 'hris' || field !== 'isDeclared') {
                if (newState.hris) {
                    newState.hris = { ...newState.hris, isDeclared: false };
                }
            }
            return newState;
        });
    };

    const handleEmergencyChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            contact: {
                ...prev.contact,
                emergencyContact: {
                    ...prev.contact?.emergencyContact,
                    [field]: value
                }
            },
            hris: { ...prev.hris, isDeclared: false }
        }));
    };

    const handleAddressChange = (type, field, value) => {
        setFormData(prev => {
            const currentAddresses = prev.contact?.addresses || [];
            const existingIndex = currentAddresses.findIndex(a => a.type === type);
            let newAddresses = [...currentAddresses];

            if (existingIndex >= 0) {
                newAddresses[existingIndex] = { ...newAddresses[existingIndex], [field]: value };
            } else {
                newAddresses.push({ type, [field]: value });
            }

            return {
                ...prev,
                contact: {
                    ...prev.contact,
                    addresses: newAddresses
                },
                hris: { ...prev.hris, isDeclared: false }
            };
        });
    };

    const handleBreakupChange = (key, value) => {
        setFormData(prev => {
            const comp = prev.compensation || {};
            const breakup = comp.salaryBreakup || {};
            return {
                ...prev,
                compensation: {
                    ...comp,
                    salaryBreakup: {
                        ...breakup,
                        [key]: value
                    }
                },
                hris: { ...prev.hris, isDeclared: false }
            };
        });
    };

    const handleArrayChange = (section, index, field, value) => {
        setFormData(prev => {
            const newArray = [...(prev[section] || [])];
            newArray[index] = { ...newArray[index], [field]: value };
            return { ...prev, [section]: newArray, hris: { ...prev.hris, isDeclared: false } };
        });
    };

    const addArrayItem = (section, defaultObj = {}) => {
        setFormData(prev => ({
            ...prev,
            [section]: [...(prev[section] || []), defaultObj],
            hris: { ...prev.hris, isDeclared: false }
        }));
    };

    const removeArrayItem = (section, index) => {
        setFormData(prev => ({
            ...prev,
            [section]: prev[section].filter((_, i) => i !== index),
            hris: { ...prev.hris, isDeclared: false }
        }));
    };

    const validateSectionData = (section) => {
        const data = formData[section] || {};
        const isEmpty = (val) => val === undefined || val === null || val === '';

        if (section === 'personal') {
            const required = ['dob', 'gender', 'maritalStatus', 'nationality', 'bloodGroup', 'disabilityStatus'];
            const missing = required.filter(f => isEmpty(data[f]));
            if (missing.length > 0) return 'All fields are required';
            if (data.disabilityStatus === true && isEmpty(data.disabilityDetails)) {
                return 'Nature of disability is required if Disability Status is Yes';
            }
        }
        if (section === 'contact') {
            if (isEmpty(data.personalEmail) || isEmpty(data.mobileNumber)) return 'Email and Mobile Number are required';

            const ec = data.emergencyContact || {};
            if (isEmpty(ec.name) || isEmpty(ec.relation) || isEmpty(ec.phone) || isEmpty(ec.alternatePhone)) return 'Name, relation, phone, and alternate phone for emergency contact are required';

            const addresses = data.addresses || [];
            const currentAddr = addresses.find(a => a.type === 'Current') || {};
            const permanentAddr = addresses.find(a => a.type === 'Permanent') || {};

            const requiredCurrent = ['line1', 'addressLine2', 'city', 'state', 'zipCode', 'country', 'phone'];
            const requiredPermanent = ['line1', 'addressLine2', 'city', 'state', 'zipCode', 'country'];

            const hasCurrent = requiredCurrent.every(f => !isEmpty(currentAddr[f]));
            const hasPermanent = requiredPermanent.every(f => !isEmpty(permanentAddr[f]));

            if (!hasCurrent || !hasPermanent) {
                return 'All current and permanent address fields (including Line 2, and Phone for Current Address) are required';
            }
            if (currentAddr.phone && currentAddr.phone.length !== 10) {
                return 'Current Address Phone must be a 10-digit number';
            }
        }
        if (section === 'identity') {
            if (isEmpty(data.aadhaarNumber) || isEmpty(data.panNumber)) return 'All fields are required';
        }
        if (section === 'family') {
            if (isEmpty(data.fatherName) || isEmpty(data.motherName)) return 'All fields are required';
            const currentMaritalStatus = formData.personal?.maritalStatus || profile?.personal?.maritalStatus;
            if (currentMaritalStatus === 'Married' && isEmpty(data.spouseName)) {
                return 'Spouse Name is required when marital status is Married';
            }
        }
        if (section === 'compensation') {
            const breakup = data.salaryBreakup || {};
            if (breakup.basicPercent !== undefined && breakup.basicPercent !== null && breakup.basicPercent !== '') {
                const val = Number(breakup.basicPercent);
                if (isNaN(val) || val < 0 || val > 100) {
                    return 'Basic Salary Override (%) must be a number between 0 and 100';
                }
            }
            if (breakup.hraPercent !== undefined && breakup.hraPercent !== null && breakup.hraPercent !== '') {
                const val = Number(breakup.hraPercent);
                if (isNaN(val) || val < 0 || val > 100) {
                    return 'HRA Override (%) must be a number between 0 and 100';
                }
            }
        }
        return null;
    };

    const handleSave = async (section) => {
        const error = validateSectionData(section);
        if (error) {
            toast.error(error);
            return;
        }

        try {
            setSavingSection(section);
            const updates = formData[section];
            await api.patch(`/dossier/${userId}/${section}`, updates);
            toast.success('Changes saved successfully');
            setEditMode(false);
            fetchDossier();
            if (isSelf) {
                setShowHrisRedirectModal(true);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save changes');
        } finally {
            setSavingSection(null);
        }
    };

    const handlePersonalSaveAll = async () => {
        const personalError = validateSectionData('personal');
        if (personalError) {
            toast.error(`Basic Info: ${personalError}`);
            return;
        }
        const contactError = validateSectionData('contact');
        if (contactError) {
            toast.error(`Contact Info: ${contactError}`);
            return;
        }
        const identityError = validateSectionData('identity');
        if (identityError) {
            toast.error(`Identity Info: ${identityError}`);
            return;
        }
        const familyError = validateSectionData('family');
        if (familyError) {
            toast.error(`Family Info: ${familyError}`);
            return;
        }

        try {
            setSavingSection('personal_all');
            await Promise.all([
                api.patch(`/dossier/${userId}/personal`, formData.personal),
                api.patch(`/dossier/${userId}/contact`, formData.contact),
                api.patch(`/dossier/${userId}/identity`, formData.identity),
                api.patch(`/dossier/${userId}/family`, formData.family)
            ]);
            toast.success('All personal details saved successfully');
            setEditMode(false);
            fetchDossier();
            if (isSelf) {
                setShowHrisRedirectModal(true);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save all changes');
        } finally {
            setSavingSection(null);
        }
    };

    const handleDirectSubmitForApproval = async () => {
        try {
            setSubmittingDirectly(true);
            await api.patch(`/dossier/${userId}/submit-hris`, {
                hris: { isDeclared: true }
            });
            toast.success('Your changes have been submitted for approval!');
            setShowHrisRedirectModal(false);
            fetchDossier();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to submit changes for approval');
        } finally {
            setSubmittingDirectly(false);
        }
    };

    const handleExcelExport = async (targetUser = null) => {
        try {
            const toastId = toast.loading('Generating Excel...');
            const targetUserId = targetUser?._id || null;
            const params = targetUserId ? { userId: targetUserId } : {};
            const response = await api.get('/dossier/export-excel', {
                params,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const displayName = [targetUser?.firstName, targetUser?.lastName].filter(Boolean).join(' ').trim();
            const safeBaseName = (displayName || 'Employee')
                .replace(/\s+/g, '_')
                .replace(/[^a-zA-Z0-9_-]/g, '') || 'Employee';
            link.setAttribute('download', `${safeBaseName}_EIS.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.dismiss(toastId);
            toast.success('Excel exported successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to export Excel');
        }
    };

    const handleCompanyBrandingSave = async () => {
        try {
            setSavingCompanyBranding(true);
            const { data } = await api.put('/admin/company-settings/branding', {
                displayMode: companyBranding.displayMode,
                logoAlignment: companyBranding.logoAlignment,
                logoSize: companyBranding.logoSize,
                requireCameraCapture: companyBranding.requireCameraCapture
            });

            setCompanyBranding((current) => ({
                ...current,
                displayMode: data?.displayMode || current.displayMode,
                logoAlignment: data?.logoAlignment || current.logoAlignment,
                logoSize: Number(data?.logoSize) || current.logoSize,
                requireCameraCapture: Boolean(data?.requireCameraCapture)
            }));
            await syncCurrentUserProfile();
            toast.success('Company settings saved');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save company settings');
        } finally {
            setSavingCompanyBranding(false);
        }
    };

    const handleCompanyLogoUpload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (file.size === 0) {
            toast.error('The selected file is empty or unreadable.');
            return;
        }

        try {
            setUploadingCompanyLogo(true);
            const formData = new FormData();
            formData.append('logo', file);

            const { data } = await api.post('/admin/company-settings/branding/logo', formData);
            setCompanyBranding((current) => ({
                ...current,
                displayMode: data?.displayMode || 'company',
                companyLogoUrl: data?.companyLogoUrl || ''
            }));
            await syncCurrentUserProfile();
            toast.success('Company logo uploaded');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to upload company logo');
        } finally {
            setUploadingCompanyLogo(false);
        }
    };

    const handleCompanyLogoRemove = async () => {
        try {
            setUploadingCompanyLogo(true);
            const { data } = await api.delete('/admin/company-settings/branding/logo');
            setCompanyBranding((current) => ({
                ...current,
                displayMode: data?.displayMode || current.displayMode,
                companyLogoUrl: ''
            }));
            await syncCurrentUserProfile();
            toast.success('Company logo removed');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to remove company logo');
        } finally {
            setUploadingCompanyLogo(false);
        }
    };

    // Loading State
    if (loading) return (
        <div className="min-h-screen bg-slate-50 p-6 flex justify-center">
            <div className="max-w-5xl w-full space-y-4">
                <Skeleton className="h-40 w-full rounded-xl" />
                <div className="flex space-x-4">
                    <Skeleton className="h-64 w-1/4 rounded-lg" />
                    <Skeleton className="h-64 w-3/4 rounded-lg" />
                </div>
            </div>
        </div>
    );

    // If profile failed to load
    if (!profile) return (
        <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center font-sans">
            <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-md w-full">
                <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                <h3 className="text-lg font-bold text-slate-800 mb-2">Failed to Load Profile</h3>
                <p className="text-slate-500 text-sm mb-6">
                    We encountered an error loading the dossier details. Please try again.
                </p>
                <Button onClick={fetchDossier} className="w-full">
                    Try Again
                </Button>
            </div>
        </div>
    );

    return (
        <div className={embedded ? "w-full font-sans" : "min-h-screen bg-slate-50 font-sans"}>
            {!embedded && (
                <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-3 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-lg font-bold text-slate-800">Employee Dossier</h1>
                    </div>
                </div>
            )}

            <div className={embedded ? "w-full" : "max-w-6xl mx-auto p-6 md:p-8"}>
                {/* Tabs */}
                <div className="mb-8 overflow-x-auto">
                    <div className="flex space-x-1 border-b border-slate-200 min-w-max">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => handleTabSelect(tab.id)}
                                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                <tab.icon size={16} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="min-h-[400px]">
                    {profile && profile.hris && (
                        <>
                            {/* Case 1: Employee viewing their own profile which is Pending Approval */}
                            {isSelf && profile.hris.status === 'Pending Approval' && (
                                <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50/50 backdrop-blur-sm flex items-start space-x-3 text-amber-800 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <Clock className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
                                    <div>
                                        <h4 className="font-bold text-sm">Changes Pending Approval</h4>
                                        <p className="text-xs mt-1 leading-relaxed">
                                            You have submitted profile changes that are currently waiting for HR review and approval. Your live profile details will be updated automatically once approved.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Case 2: Employee viewing their own profile which was Rejected */}
                            {isSelf && profile.hris.status === 'Rejected' && (
                                <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50/50 backdrop-blur-sm flex items-start space-x-3 text-red-800 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
                                    <div>
                                        <h4 className="font-bold text-sm">Submission Rejected</h4>
                                        <p className="text-xs mt-1 leading-relaxed">
                                            Your profile submission was rejected by HR. {profile.hris.rejectionReason && <span>Reason: <strong className="underline">{profile.hris.rejectionReason}</strong>.</span>} Please edit the form and submit it again for approval.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Case 3: Admin viewing another employee's profile which has Pending Approval updates */}
                            {!isSelf && profile.hris.status === 'Pending Approval' && (
                                <div className="mb-6 p-4 rounded-xl border border-blue-200 bg-blue-50/50 backdrop-blur-sm flex items-start space-x-3 text-blue-800 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <Info className="text-blue-500 mt-0.5 flex-shrink-0" size={18} />
                                    <div>
                                        <h4 className="font-bold text-sm">Proposed Changes Pending Review</h4>
                                        <p className="text-xs mt-1 leading-relaxed">
                                            This employee has submitted profile updates. You are currently viewing their proposed changes. You can approve or reject these changes under the <button onClick={() => setActiveTab('hris')} className="font-bold underline hover:text-blue-600 transition-colors">EIS</button> tab.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'personal' && (
                        <PersonalTab
                            profile={profile}
                            pendingUpdates={pendingUpdates}
                            editMode={editMode}
                            setEditMode={setEditMode}
                            formData={formData}
                            setFormData={setFormData}
                            canApprove={canApprove}
                            isSelf={isSelf}
                            canEdit={canEdit}
                            isCurrentUserAdmin={isCurrentUserAdmin}
                            savingSection={savingSection}
                            redirectToHRISEdit={redirectToHRISEdit}
                            handleInputChange={handleInputChange}
                            handleEmergencyChange={handleEmergencyChange}
                            handleAddressChange={handleAddressChange}
                            handleSave={handleSave}
                            handlePersonalSaveAll={handlePersonalSaveAll}
                        />
                    )}
                    {activeTab === 'employment' && (
                        <EmploymentTab
                            profile={profile}
                            editMode={editMode}
                            setEditMode={setEditMode}
                            formData={formData}
                            handleSave={handleSave}
                            canEdit={canEdit}
                            redirectToHRISEdit={redirectToHRISEdit}
                            handleArrayChange={handleArrayChange}
                            addArrayItem={addArrayItem}
                            removeArrayItem={removeArrayItem}
                        />
                    )}
                    {activeTab === 'salary' && (
                        <SalaryTab
                            profile={profile}
                            userId={userId}
                            canViewSalaryTab={canViewSalaryTab}
                            canEdit={canEdit}
                            editMode={editMode}
                            setEditMode={setEditMode}
                            formData={formData}
                            handleSave={handleSave}
                            savingSection={savingSection}
                            fetchDossier={fetchDossier}
                            currentUser={currentUser}
                            pendingUpdates={pendingUpdates}
                            canApprove={canApprove}
                            isSelf={isSelf}
                            handleBreakupChange={handleBreakupChange}
                        />
                    )}
                    {activeTab === 'documents' && (
                        <DocumentsTab
                            profile={profile}
                            setProfile={setProfile}
                            userId={userId}
                            currentUser={currentUser}
                            isSelf={isSelf}
                            activeTab={activeTab}
                            fetchDossier={fetchDossier}
                            fetchHistory={fetchHistory}
                            canEdit={canEdit}
                            isCurrentUserAdmin={isCurrentUserAdmin}
                        />
                    )}
                    {activeTab === 'hris' && (
                        <HrisTab
                            profile={profile}
                            editMode={editMode}
                            setEditMode={setEditMode}
                            currentUser={currentUser}
                            pendingUpdates={pendingUpdates}
                            canApprove={canApprove}
                            isSelf={isSelf}
                            userId={userId}
                            fetchDossier={fetchDossier}
                            formData={formData}
                            setFormData={setFormData}
                            handleInputChange={handleInputChange}
                            handleEmergencyChange={handleEmergencyChange}
                            handleAddressChange={handleAddressChange}
                            handleBreakupChange={handleBreakupChange}
                            handleArrayChange={handleArrayChange}
                            addArrayItem={addArrayItem}
                            removeArrayItem={removeArrayItem}
                        />
                    )}
                    {activeTab === 'history' && (
                        <HistoryTab historyLogs={historyLogs} />
                    )}
                    {activeTab === 'email-history' && (
                        <EmailHistoryTab
                            emailHistoryByTab={emailHistoryByTab}
                            emailHistoryTab={emailHistoryTab}
                            setEmailHistoryTab={setEmailHistoryTab}
                            loadingEmailHistory={loadingEmailHistory}
                        />
                    )}
                    {activeTab === 'requests' && (
                        <HrisRequestsTab
                            hrisRequests={hrisRequests}
                            loadingRequests={loadingRequests}
                            hrisSearchTerm={hrisSearchTerm}
                            setHrisSearchTerm={setHrisSearchTerm}
                            handleHRISApproveOther={handleHRISApproveOther}
                            handleHRISRejectOther={handleHRISRejectOther}
                            handleExcelExport={handleExcelExport}
                        />
                    )}
                    {activeTab === 'settings' && (
                        <SettingsTab
                            canViewRolesSettings={canViewRolesSettings}
                            canViewAttendanceSettings={canViewAttendanceSettings}
                            canViewLeavePolicies={canViewLeavePolicies}
                            canManageCompanyBranding={canManageCompanyBranding}
                            isCompanySettingsOpen={isCompanySettingsOpen}
                            setIsCompanySettingsOpen={setIsCompanySettingsOpen}
                            companyBranding={companyBranding}
                            setCompanyBranding={setCompanyBranding}
                            loadingCompanyBranding={loadingCompanyBranding}
                            savingCompanyBranding={savingCompanyBranding}
                            uploadingCompanyLogo={uploadingCompanyLogo}
                            handleCompanyBrandingSave={handleCompanyBrandingSave}
                            handleCompanyLogoUpload={handleCompanyLogoUpload}
                            handleCompanyLogoRemove={handleCompanyLogoRemove}
                        />
                    )}
                </div>

                {/* Save Confirmation & HRIS Submission Guidance Modal */}
                {showHrisRedirectModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={() => setShowHrisRedirectModal(false)}>
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-slate-100 transform scale-100 transition-all duration-300 relative" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setShowHrisRedirectModal(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
                            >
                                <X size={18} />
                            </button>
                            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-amber-50 text-amber-500 mx-auto mb-4 border border-amber-100 shadow-sm">
                                <Clock size={24} />
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-800 text-center tracking-tight">Draft Saved & Pending Action</h3>
                            <p className="mt-2 text-sm text-slate-500 text-center leading-relaxed font-medium">
                                Your changes have been saved as a draft. To make them active and visible on your profile, they must be submitted to HR for approval.
                            </p>

                            <div className="mt-6 flex flex-col gap-3">
                                <Button
                                    onClick={handleDirectSubmitForApproval}
                                    isLoading={submittingDirectly}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                                >
                                    <span>Submit for Approval Instantly</span>
                                </Button>
                                <Button
                                    onClick={() => {
                                        setActiveTab('hris');
                                        setShowHrisRedirectModal(false);
                                    }}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                                >
                                    <span>Go to EIS Form</span>
                                    <ArrowLeft size={16} className="rotate-180" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowHrisRedirectModal(false)}
                                    className="w-full text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-medium py-2.5 rounded-xl transition border border-slate-200"
                                >
                                    Later (Keep as Draft)
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeDossier;
