import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/apiClient';
import {
    ChevronLeft,
    Shield,
    ShieldCheck,
    Users,
    SlidersHorizontal,
    Plus,
    Search,
    ArrowUpDown,
    Check,
    X,
    Pencil,
    Eye,
    ChevronDown,
    ChevronRight,
    Calendar,
    Clock,
    FolderKanban,
    Building2,
    Building,
    ListTodo,
    UserPlus,
    MessageSquare,
    FileText,
    LifeBuoy,
    Plane,
    TrendingUp,
    Award,
    Megaphone,
    Layers,
    CheckCheck,
    ChevronsUpDown,
    ChevronsDownUp,
    BadgeDollarSign
} from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import { createCachePayload, isCacheFresh, readSessionCache } from '@/lib/cache';

const LEGACY_HIDDEN_PERMISSION_KEYS = new Set(['ta.analytics.requisition']);
const TA_PERMISSION_MODULE = 'TALENT ACQUISITION';
const TA_PERMISSION_SUB_TABS = [
    { id: 'all', label: 'All' },
    { id: 'requisition', label: 'Requisition' },
    { id: 'candidate', label: 'Candidates' },
    { id: 'manage', label: 'Manage' }
];

const isVisiblePermission = (permission) =>
    permission &&
    permission.key !== '*' &&
    permission.isDeprecated !== true &&
    !LEGACY_HIDDEN_PERMISSION_KEYS.has(permission.key);

const getTAPermissionCategory = (permissionKey = '') => {
    if (permissionKey.startsWith('ta.requisition.')) return 'requisition';
    if (permissionKey.startsWith('ta.candidate.')) return 'candidate';
    return 'manage';
};

const filterTAPermissionsByTab = (permissionsList = [], activeTab = 'all') => {
    if (activeTab === 'all') {
        return permissionsList;
    }
    return permissionsList.filter((permission) => getTAPermissionCategory(permission.key) === activeTab);
};

const getTAPermissionSections = (permissionsList = [], activeTab = 'all') => {
    const candidatePermissions = permissionsList.filter((permission) => permission.key.startsWith('ta.candidate.'));

    if (activeTab === 'candidate') {
        return [
            { id: 'candidate', label: 'Candidate Permissions', permissions: candidatePermissions }
        ].filter((section) => section.permissions.length > 0);
    }

    if (activeTab === 'all') {
        const requisitionPermissions = permissionsList.filter((permission) => permission.key.startsWith('ta.requisition.'));
        const managePermissions = permissionsList.filter((permission) => (
            !permission.key.startsWith('ta.requisition.') &&
            !permission.key.startsWith('ta.candidate.')
        ));

        return [
            { id: 'requisition', label: 'Requisition Permissions', permissions: requisitionPermissions },
            { id: 'candidate', label: 'Candidate Permissions', permissions: candidatePermissions },
            { id: 'manage', label: 'Manage Permissions', permissions: managePermissions }
        ].filter((section) => section.permissions.length > 0);
    }

    return [{ id: activeTab, label: '', permissions: permissionsList }];
};

const sanitizeGroupedPermissions = (groupedPermissions = {}) =>
    Object.entries(groupedPermissions).reduce((accumulator, [moduleName, perms]) => {
        const visiblePermissions = (perms || []).filter(isVisiblePermission);
        if (visiblePermissions.length > 0) {
            accumulator[moduleName] = visiblePermissions;
        }
        return accumulator;
    }, {});

const sanitizeRoles = (roles = []) =>
    roles.map(role => ({
        ...role,
        permissions: (role.permissions || []).filter(isVisiblePermission)
    }));

const MODULE_ICONS = {
    'ANNOUNCEMENTS': Megaphone,
    'ATTENDANCE': Clock,
    'BUSINESS UNITS': Building2,
    'CLIENTS': Building,
    'DISCUSSIONS': MessageSquare,
    'EMPLOYEE DOSSIER': FileText,
    'DOSSIER': FileText,
    'HELP DESK': LifeBuoy,
    'LEAVES': Plane,
    'MEETINGS': Calendar,
    'PERFORMANCE MANAGEMENT': Award,
    'PROJECTS': FolderKanban,
    'PAYROLL': BadgeDollarSign,
    'ROLE MANAGEMENT': ShieldCheck,
    'SALES CRM': TrendingUp,
    'TALENT ACQUISITION': UserPlus,
    'TASKS': ListTodo,
    'TIMESHEETS': Calendar,
    'USER MANAGEMENT': Users
};

const MODULE_DISPLAY_NAMES = {
    'ANNOUNCEMENTS': 'Announcements',
    'ATTENDANCE': 'Attendance',
    'BUSINESS UNITS': 'Business Units',
    'CLIENTS': 'Clients',
    'DISCUSSIONS': 'Discussions',
    'EMPLOYEE DOSSIER': 'Employee Dossier',
    'DOSSIER': 'Employee Dossier',
    'HELP DESK': 'Help Desk',
    'LEAVES': 'Leaves',
    'MEETINGS': 'Meetings',
    'PERFORMANCE MANAGEMENT': 'Performance Management',
    'PROJECTS': 'Projects',
    'PAYROLL': 'Payroll',
    'ROLE MANAGEMENT': 'Role Management',
    'SALES CRM': 'Sales CRM',
    'TALENT ACQUISITION': 'Talent Acquisition',
    'TASKS': 'Tasks',
    'TIMESHEETS': 'Timesheets',
    'USER MANAGEMENT': 'User Management'
};

const getRoleDescription = (role) => {
    if (role.description && role.description.trim()) {
        return role.description;
    }
    const nameLower = (role.name || '').trim().toLowerCase();
    if (nameLower === 'admin') {
        return 'Configure global settings, manage integrations, user accounts, and system-wide controls';
    }
    if (nameLower === 'owner') {
        return 'Full organization owner access, manage billing, global configurations, and workspaces';
    }
    if (nameLower === 'hr' || nameLower === 'hr operations' || nameLower === 'hr manager') {
        return 'Can view and edit employee data, manage profiles, onboarding, and HR operations';
    }
    if (nameLower === 'junior hr') {
        return 'Assist in employee onboarding, documentation, profile verification, and records';
    }
    if (nameLower === 'manager') {
        return 'Manage team performance, goals, attendance requests, and timesheet approvals';
    }
    if (nameLower === 'supervisor') {
        return 'Oversee team schedules, approvals, timesheet logs, and direct reports';
    }
    if (nameLower === 'employee' || nameLower === 'all employees') {
        return 'Access personal profiles, basic HR features, submit timesheets, and clock in/out';
    }
    if (nameLower === 'executive management') {
        return 'Access company-wide reports, analytics, organizational overview, and insights';
    }
    if (nameLower === 'consultant') {
        return 'External consultant access with restricted view of assigned projects and timesheets';
    }
    if (nameLower === 'business development') {
        return 'Manage sales pipeline, client engagements, business proposals, and accounts';
    }
    if (nameLower === 'recruiting') {
        return 'Manage job postings, applications, interview workflows, and candidate pipeline';
    }
    if (nameLower === 'payroll') {
        return 'Set up salary structures, manage payroll templates, and compensation details';
    }
    if (nameLower.includes('intern') || nameLower.includes('student')) {
        return 'Limited access to assigned tasks, basic profile, and self-service features';
    }

    const visiblePerms = (role.permissions || []).filter(isVisiblePermission);
    if (visiblePerms.length > 0) {
        return visiblePerms.slice(0, 4).map(p => p.description || p.key).join(', ');
    }
    return 'Custom role with specific permissions assigned';
};

const Roles = () => {
    const navigate = useNavigate();
    const { user, refreshProfile, hasModule } = useAuth();
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);

    // Filter, search & sort state for roles table
    const [roleSearchQuery, setRoleSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('name-asc'); // 'name-asc' (Alphabetical A-Z default)
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const sortDropdownRef = useRef(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [roleName, setRoleName] = useState('');
    const [roleDescription, setRoleDescription] = useState('');
    const [selectedPerms, setSelectedPerms] = useState([]);
    const [viewOnly, setViewOnly] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal permission search & filter state
    const [permSearchQuery, setPermSearchQuery] = useState('');
    const [permFilterMode, setPermFilterMode] = useState('all'); // 'all', 'selected', 'unselected'
    const [collapsedModules, setCollapsedModules] = useState({});
    const [taPermissionTab, setTaPermissionTab] = useState('all');

    const initialFetchDoneRef = useRef(false);
    const ROLE_CACHE_TTL_MS = 45 * 1000;
    const cacheKey = `role_data_${user?._id}`;

    // Close sort dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
                setShowSortDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchData = useCallback(async ({ force = false } = {}) => {
        try {
            const cachedData = force ? null : readSessionCache(cacheKey);

            if (cachedData) {
                const data = cachedData.data || cachedData;
                setRoles(sanitizeRoles(data.roles || []));
                setPermissions(sanitizeGroupedPermissions(data.permissions || {}));
                setLoading(false);
                if (isCacheFresh(cachedData, ROLE_CACHE_TTL_MS)) return;
            }

            const bootstrapRes = await api.get('/admin/roles/bootstrap', force ? {
                headers: { 'Cache-Control': 'no-cache' },
                params: { _t: Date.now() }
            } : undefined);
            const rolesData = sanitizeRoles(bootstrapRes.data?.roles || []);
            const permsData = sanitizeGroupedPermissions(bootstrapRes.data?.permissions || {});

            const totalPerms = Object.values(permsData).reduce((sum, modulePerms) => sum + modulePerms.length, 0);
            const newFingerprint = JSON.stringify({
                r: rolesData.length,
                p: Object.keys(permsData).length,
                tp: totalPerms,
                lr: rolesData[0]?._id
            });
            const oldFingerprint = cachedData?.fingerprint || null;

            setRoles(rolesData);
            setPermissions(permsData);

            if (newFingerprint !== oldFingerprint || force) {
                const minimalRoles = rolesData.map(role => ({
                    _id: role._id,
                    name: role.name,
                    description: role.description || '',
                    memberCount: role.memberCount || 0,
                    isSystem: role.isSystem,
                    permissions: role.permissions.map(p => ({
                        _id: p._id,
                        key: p.key,
                        description: p.description,
                        module: p.module
                    }))
                }));

                const minimalPerms = {};
                for (const module in permsData) {
                    minimalPerms[module] = permsData[module].map(p => ({
                        _id: p._id,
                        key: p.key,
                        description: p.description,
                        module: p.module
                    }));
                }

                const payload = createCachePayload({
                    roles: minimalRoles,
                    permissions: minimalPerms
                }, newFingerprint);

                sessionStorage.setItem(cacheKey, JSON.stringify(payload));
            }
        } catch {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [ROLE_CACHE_TTL_MS, cacheKey]);

    const isPermissionVisible = useCallback((perm) => {
        if (!perm || !perm.key) return false;
        const key = perm.key;
        let groupName = perm.module || 'OTHER';

        if (key.startsWith('business_unit.')) groupName = 'BUSINESS UNITS';
        else if (key.startsWith('client.')) groupName = 'CLIENTS';
        else if (key.startsWith('task.')) groupName = 'TASKS';
        else if (key.startsWith('project.') || key.startsWith('module.')) groupName = 'PROJECTS';
        else if (key.startsWith('user.')) groupName = 'USER MANAGEMENT';
        else if (key.startsWith('role.')) groupName = 'ROLE MANAGEMENT';
        else if (key.startsWith('timesheet.')) groupName = 'TIMESHEETS';
        else if (key.startsWith('attendance.')) groupName = 'ATTENDANCE';
        else if (key.startsWith('ta.')) groupName = 'TALENT ACQUISITION';
        else if (key.startsWith('announcement.')) groupName = 'ANNOUNCEMENTS';
        else if (key.startsWith('helpdesk.')) groupName = 'HELP DESK';
        else if (key.startsWith('discussion.')) groupName = 'DISCUSSIONS';
        else if (key.startsWith('dossier.') || key.startsWith('employee.revision.') || groupName === 'DOSSIER') groupName = 'EMPLOYEE DOSSIER';
        else if (key.startsWith('leave.')) groupName = 'LEAVES';
        else if (key.startsWith('meeting.')) groupName = 'MEETINGS';
        else if (key.startsWith('crm.')) groupName = 'SALES CRM';

        const moduleMapping = {
            'ATTENDANCE': 'attendance',
            'TIMESHEETS': 'timesheet',
            'PROJECTS': 'projects',
            'BUSINESS UNITS': 'businessUnits',
            'CLIENTS': 'clients',
            'TASKS': 'projects',
            'USER MANAGEMENT': 'userManagement',
            'ROLE MANAGEMENT': 'userManagement',
            'TALENT ACQUISITION': 'talentAcquisition',
            'DISCUSSIONS': 'meetingsOfMinutes',
            'MEETINGS': 'meetingsOfMinutes',
            'EMPLOYEE DOSSIER': 'employeeDossier',
            'DOSSIER': 'employeeDossier',
            'HELP DESK': 'helpdesk',
            'LEAVES': 'leaves',
            'TALENT CARD': 'talentCard'
        };

        const moduleKey = moduleMapping[groupName];
        if (!moduleKey) return true;
        return hasModule(moduleKey);
    }, [hasModule]);

    useEffect(() => {
        if (initialFetchDoneRef.current) return;
        initialFetchDoneRef.current = true;
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
    }, []);

    const togglePermission = (id) => {
        if (viewOnly) return;
        const targetId = String(id);
        if (selectedPerms.some(p => String(p) === targetId)) {
            setSelectedPerms(selectedPerms.filter(p => String(p) !== targetId));
        } else {
            setSelectedPerms([...selectedPerms, targetId]);
        }
    };

    const toggleGroup = (groupPerms) => {
        if (viewOnly) return;
        const groupIds = groupPerms.map(p => String(p._id || p));
        const allSelected = groupIds.length > 0 && groupIds.every(id => selectedPerms.some(p => String(p) === id));

        if (allSelected) {
            setSelectedPerms(selectedPerms.filter(id => !groupIds.includes(String(id))));
        } else {
            const newSelected = new Set([...selectedPerms.map(String), ...groupIds]);
            setSelectedPerms(Array.from(newSelected));
        }
    };

    const handleSelectAllGlobally = (shouldSelect) => {
        if (viewOnly) return;
        if (!shouldSelect) {
            setSelectedPerms([]);
            return;
        }
        // Collect all visible permission IDs across all available modules
        const allIds = [];
        Object.entries(permissions).forEach(([moduleName, perms]) => {
            const moduleMapping = {
                'ATTENDANCE': 'attendance',
                'TIMESHEETS': 'timesheet',
                'PROJECTS': 'projects',
                'BUSINESS UNITS': 'businessUnits',
                'CLIENTS': 'clients',
                'TASKS': 'projects',
                'USER MANAGEMENT': 'userManagement',
                'ROLE MANAGEMENT': 'userManagement',
                'TALENT ACQUISITION': 'talentAcquisition',
                'DISCUSSIONS': 'meetingsOfMinutes',
                'EMPLOYEE DOSSIER': 'employeeDossier',
                'DOSSIER': 'employeeDossier',
                'HELP DESK': 'helpdesk',
                'LEAVES': 'leaves',
                'TALENT CARD': 'talentCard'
            };
            const moduleKey = moduleMapping[moduleName];
            if (moduleKey && !hasModule(moduleKey)) return;

            perms.forEach(p => {
                if (isVisiblePermission(p)) allIds.push(p._id);
            });
        });
        setSelectedPerms(Array.from(new Set(allIds)));
    };

    const toggleCollapseModule = (moduleName) => {
        setCollapsedModules(prev => ({ ...prev, [moduleName]: !prev[moduleName] }));
    };

    const handleEdit = (role, isView = false) => {
        setRoleName(role.name);
        setRoleDescription(role.description || '');
        setSelectedPerms((role.permissions || []).map(p => String(p._id || p)));
        setEditingId(role._id);
        setViewOnly(isView || role.isSystem);
        setTaPermissionTab('all');
        setPermSearchQuery('');
        setPermFilterMode('all');
        setCollapsedModules({});
        setShowModal(true);
    };

    const openCreateModal = () => {
        setRoleName('');
        setRoleDescription('');
        setSelectedPerms([]);
        setEditingId(null);
        setViewOnly(false);
        setTaPermissionTab('all');
        setPermSearchQuery('');
        setPermFilterMode('all');
        setCollapsedModules({});
        setShowModal(true);
    };

    useEffect(() => {
        const handleOpenCreateRole = () => {
            openCreateModal();
        };

        window.addEventListener('roles:open-create-modal', handleOpenCreateRole);
        return () => window.removeEventListener('roles:open-create-modal', handleOpenCreateRole);
    }, []);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!roleName.trim()) {
            toast.error('Role name is required');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingId) {
                await api.put(`/admin/roles/${editingId}`, {
                    name: roleName.trim(),
                    description: roleDescription.trim(),
                    permissions: selectedPerms
                });
                toast.success('Role Updated Successfully');
            } else {
                await api.post('/admin/roles', {
                    name: roleName.trim(),
                    description: roleDescription.trim(),
                    permissions: selectedPerms
                });
                toast.success('Role Created Successfully');
            }

            sessionStorage.removeItem(`role_data_${user?._id}`);
            sessionStorage.removeItem(`user_data_${user?._id}`);

            if (refreshProfile) {
                refreshProfile().catch(() => {});
            }

            setShowModal(false);
            setRoleName('');
            setRoleDescription('');
            setSelectedPerms([]);
            setEditingId(null);

            fetchData({ force: true });
        } catch (error) {
            toast.error(error.response?.data?.message || (editingId ? 'Failed to update role' : 'Failed to create role'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter and sort roles
    const filteredAndSortedRoles = useMemo(() => {
        let result = [...roles];

        // Search query filter
        if (roleSearchQuery.trim()) {
            const query = roleSearchQuery.toLowerCase().trim();
            result = result.filter(role =>
                (role.name || '').toLowerCase().includes(query) ||
                getRoleDescription(role).toLowerCase().includes(query)
            );
        }

        // Sorting (Alphabetical A-Z by default)
        result.sort((a, b) => {
            if (sortBy === 'name-asc') {
                return (a.name || '').localeCompare(b.name || '');
            }
            if (sortBy === 'name-desc') {
                return (b.name || '').localeCompare(a.name || '');
            }
            if (sortBy === 'perms-desc') {
                return (b.permissions?.length || 0) - (a.permissions?.length || 0);
            }
            if (sortBy === 'perms-asc') {
                return (a.permissions?.length || 0) - (b.permissions?.length || 0);
            }
            if (sortBy === 'members-desc') {
                return (b.memberCount || 0) - (a.memberCount || 0);
            }
            if (sortBy === 'members-asc') {
                return (a.memberCount || 0) - (b.memberCount || 0);
            }
            return (a.name || '').localeCompare(b.name || '');
        });

        return result;
    }, [roles, roleSearchQuery, sortBy]);

    // Prepare modules and permissions in ALPHABETICAL ORDER
    const alphabeticalModules = useMemo(() => {
        const moduleMapping = {
            'ATTENDANCE': 'attendance',
            'TIMESHEETS': 'timesheet',
            'PROJECTS': 'projects',
            'BUSINESS UNITS': 'businessUnits',
            'CLIENTS': 'clients',
            'TASKS': 'projects',
            'USER MANAGEMENT': 'userManagement',
            'ROLE MANAGEMENT': 'userManagement',
            'TALENT ACQUISITION': 'talentAcquisition',
            'DISCUSSIONS': 'meetingsOfMinutes',
            'EMPLOYEE DOSSIER': 'employeeDossier',
            'DOSSIER': 'employeeDossier',
            'HELP DESK': 'helpdesk',
            'LEAVES': 'leaves',
            'TALENT CARD': 'talentCard'
        };

        const activeModules = Object.entries(permissions).filter(([moduleName]) => {
            const moduleKey = moduleMapping[moduleName];
            if (!moduleKey) return true;
            return hasModule(moduleKey);
        });

        // Sort modules alphabetically by display name
        activeModules.sort(([nameA], [nameB]) => {
            const displayA = MODULE_DISPLAY_NAMES[nameA] || nameA;
            const displayB = MODULE_DISPLAY_NAMES[nameB] || nameB;
            return displayA.localeCompare(displayB);
        });

        return activeModules.map(([moduleName, rawPerms]) => {
            // Sort permissions inside module ALPHABETICALLY by description (fallback to key)
            const sortedPerms = [...rawPerms].sort((a, b) => {
                const textA = (a.description || a.key || '').toLowerCase();
                const textB = (b.description || b.key || '').toLowerCase();
                return textA.localeCompare(textB);
            });

            return {
                moduleName,
                displayName: MODULE_DISPLAY_NAMES[moduleName] || moduleName,
                icon: MODULE_ICONS[moduleName] || Layers,
                permissions: sortedPerms
            };
        });
    }, [permissions, hasModule]);

    const collapseAllSections = useCallback(() => {
        const all = {};
        alphabeticalModules.forEach(mod => {
            all[mod.moduleName] = true;
        });
        setCollapsedModules(all);
    }, [alphabeticalModules]);

    const expandAllSections = useCallback(() => {
        setCollapsedModules({});
    }, []);

    const areAllCollapsed = useMemo(() => {
        if (alphabeticalModules.length === 0) return false;
        return alphabeticalModules.every(mod => collapsedModules[mod.moduleName]);
    }, [alphabeticalModules, collapsedModules]);

    // Filter permissions based on modal search and filter mode
    const filteredModulesForModal = useMemo(() => {
        const query = permSearchQuery.toLowerCase().trim();

        return alphabeticalModules.map(mod => {
            const isTAModule = mod.moduleName === TA_PERMISSION_MODULE;
            let perms = mod.permissions;

            if (isTAModule) {
                perms = filterTAPermissionsByTab(perms, taPermissionTab);
            }

            // Search query filter
            if (query) {
                perms = perms.filter(p =>
                    (p.key || '').toLowerCase().includes(query) ||
                    (p.description || '').toLowerCase().includes(query) ||
                    mod.displayName.toLowerCase().includes(query)
                );
            }

            // Filter mode (all, selected, unselected)
            if (permFilterMode === 'selected') {
                perms = perms.filter(p => selectedPerms.some(id => String(id) === String(p._id)));
            } else if (permFilterMode === 'unselected') {
                perms = perms.filter(p => !selectedPerms.some(id => String(id) === String(p._id)));
            }

            // TA sections if Talent Acquisition module
            const taSections = isTAModule ? getTAPermissionSections(perms, taPermissionTab) : [];

            return {
                ...mod,
                filteredPermissions: perms,
                taSections,
                totalCount: mod.permissions.length,
                selectedCount: mod.permissions.filter(p => selectedPerms.some(id => String(id) === String(p._id))).length
            };
        }).filter(mod => mod.filteredPermissions.length > 0 || !query);
    }, [alphabeticalModules, permSearchQuery, permFilterMode, taPermissionTab, selectedPerms]);

    const totalPermissionsCount = useMemo(() => {
        return alphabeticalModules.reduce((acc, m) => acc + m.permissions.length, 0);
    }, [alphabeticalModules]);

    const activeRole = useMemo(() => {
        if (!editingId) return null;
        return roles.find(r => r._id === editingId);
    }, [editingId, roles]);

    // Skeleton loader
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50/60 font-sans px-4 sm:px-6 md:px-10 py-6 md:py-8">
                <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-9 h-9 rounded-full" />
                            <div>
                                <Skeleton className="h-7 w-32" />
                            </div>
                        </div>
                        <Skeleton className="h-10 w-36 rounded-xl" />
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                            <Skeleton className="h-9 w-40 rounded-lg" />
                            <Skeleton className="h-9 w-64 rounded-lg" />
                        </div>
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                <div key={i} className="flex items-center justify-between py-3.5 px-4 border-b border-slate-100">
                                    <div className="flex items-center gap-4 flex-1">
                                        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-5 w-40" />
                                            <Skeleton className="h-3 w-80" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-4 w-28 mx-6" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/60 font-sans px-4 sm:px-6 md:px-10 py-6 md:py-8">
            <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto space-y-6">

                {/* Top Header Card matching Screenshot 2 */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/profile?tab=settings')}
                                title="Back to Settings"
                                className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-sm transition active:scale-95"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Roles</h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl text-sm font-semibold shadow-sm transition-all shadow-purple-600/20 active:scale-95"
                            >
                                <Plus size={16} className="stroke-[2.5]" />
                                <span>Create role</span>
                            </button>
                        </div>
                    </div>

                    {/* Sub-header controls: Sort & Search */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            {/* Sort Dropdown */}
                            <div className="relative" ref={sortDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                                >
                                    <ArrowUpDown size={14} className="text-slate-500" />
                                    <span>Sort</span>
                                    <ChevronDown size={14} className="text-slate-400" />
                                </button>

                                {showSortDropdown && (
                                    <div className="absolute left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                                        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Sort By
                                        </div>
                                        {[
                                            { id: 'name-asc', label: 'Name (A to Z) • Default' },
                                            { id: 'name-desc', label: 'Name (Z to A)' },
                                            { id: 'perms-desc', label: 'Most Permissions' },
                                            { id: 'perms-asc', label: 'Fewest Permissions' },
                                            { id: 'members-desc', label: 'Most Members' },
                                            { id: 'members-asc', label: 'Fewest Members' }
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => {
                                                    setSortBy(item.id);
                                                    setShowSortDropdown(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                                                    sortBy === item.id ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                <span>{item.label}</span>
                                                {sortBy === item.id && <Check size={14} className="text-purple-600" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <span className="text-xs text-slate-400 font-medium">
                                {filteredAndSortedRoles.length} {filteredAndSortedRoles.length === 1 ? 'role' : 'roles'}
                            </span>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full sm:w-64">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={roleSearchQuery}
                                onChange={(e) => setRoleSearchQuery(e.target.value)}
                                placeholder="Search roles..."
                                className="w-full pl-9 pr-8 py-1.5 bg-slate-50/80 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition"
                            />
                            {roleSearchQuery && (
                                <button
                                    onClick={() => setRoleSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Roles Table matching Screenshot 2 */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    {/* Table Column Headers */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50/70 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <div className="col-span-12 sm:col-span-6 flex items-center gap-2">
                            <Shield size={14} className="text-slate-400" />
                            <span>Role</span>
                        </div>
                        <div className="hidden sm:flex sm:col-span-3 items-center gap-2">
                            <SlidersHorizontal size={14} className="text-slate-400" />
                            <span>Permissions</span>
                        </div>
                        <div className="hidden sm:flex sm:col-span-3 items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users size={14} className="text-slate-400" />
                                <span>Members</span>
                            </div>
                            <span className="text-[11px] font-normal normal-case text-slate-400">Click row to edit</span>
                        </div>
                    </div>

                    {/* Table Body / Role Rows */}
                    <div className="divide-y divide-slate-100">
                        {filteredAndSortedRoles.map(role => {
                            const visiblePermsCount = role.permissions.filter(isPermissionVisible).length;
                            const memberCount = role.memberCount || 0;
                            const isAdminOrSystem = role.isSystem || (role.name || '').toLowerCase() === 'admin';

                            return (
                                <div
                                    key={role._id}
                                    onClick={() => handleEdit(role, role.isSystem)}
                                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-purple-50/40 transition-colors cursor-pointer group"
                                >
                                    {/* Role Info Column */}
                                    <div className="col-span-12 sm:col-span-6 flex items-center gap-3.5 min-w-0">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                            isAdminOrSystem
                                                ? 'bg-amber-100/90 text-amber-600'
                                                : 'bg-violet-100 text-purple-600'
                                        }`}>
                                            {isAdminOrSystem ? (
                                                <ShieldCheck size={20} className="stroke-[2.2]" />
                                            ) : (
                                                <Shield size={20} className="stroke-[2.2]" />
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1 pr-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-slate-800 text-sm md:text-base group-hover:text-purple-700 transition-colors">
                                                    {role.name}
                                                </span>
                                                {role.isSystem && (
                                                    <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider border border-slate-200">
                                                        System
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                                {getRoleDescription(role)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Permissions Count Column */}
                                    <div className="col-span-6 sm:col-span-3 text-xs sm:text-sm text-slate-700 font-medium">
                                        <div className="flex items-center gap-1.5 sm:block">
                                            <span className="sm:hidden text-xs text-slate-400 font-normal">Permissions:</span>
                                            <span>{visiblePermsCount} permissions</span>
                                        </div>
                                    </div>

                                    {/* Members Count & Actions Column */}
                                    <div className="col-span-6 sm:col-span-3 flex items-center justify-between text-xs sm:text-sm text-slate-700 font-medium">
                                        <div className="flex items-center gap-1.5 sm:block">
                                            <span className="sm:hidden text-xs text-slate-400 font-normal">Members:</span>
                                            <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {!role.isSystem ? (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(role, false);
                                                    }}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-100/60 transition"
                                                    title="Edit role permissions"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(role, true);
                                                    }}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-100/60 transition"
                                                    title="View details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            )}
                                            <ChevronRight size={18} className="text-slate-300 group-hover:text-purple-500 transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredAndSortedRoles.length === 0 && (
                            <div className="p-12 text-center">
                                <Shield size={40} className="mx-auto text-slate-300 mb-3" />
                                <h3 className="text-sm font-semibold text-slate-700">No roles found</h3>
                                <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or clear the filter.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Permission Pop-up Modal / Page */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-3 md:p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[97vw] 2xl:max-w-[1680px] h-[96vh] max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">

                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                                    viewOnly ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                                }`}>
                                    <Shield size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base md:text-lg flex items-center gap-2">
                                        <span>
                                            {viewOnly ? 'Role Permissions' : (editingId ? 'Edit Role Permissions' : 'Create New Role')}
                                        </span>
                                        {activeRole?.isSystem && (
                                            <span className="bg-slate-200/80 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                System Default
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {viewOnly ? 'Viewing granted permissions for this role' : 'Select checkboxes to grant permissions to this role'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Role Details Inputs */}
                        <div className="p-5 border-b border-slate-100 bg-white shrink-0 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                                        Role Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={roleName}
                                        onChange={(e) => setRoleName(e.target.value)}
                                        className={`w-full px-3.5 py-2 border rounded-xl text-sm font-semibold transition focus:outline-none ${
                                            viewOnly
                                                ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                                                : 'bg-white border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 text-slate-900'
                                        }`}
                                        placeholder="e.g. HR Operations"
                                        disabled={viewOnly}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                                        Role Description
                                    </label>
                                    <input
                                        type="text"
                                        value={roleDescription}
                                        onChange={(e) => setRoleDescription(e.target.value)}
                                        className={`w-full px-3.5 py-2 border rounded-xl text-sm transition focus:outline-none ${
                                            viewOnly
                                                ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                                                : 'bg-white border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 text-slate-900'
                                        }`}
                                        placeholder="Brief summary of duties and authority"
                                        disabled={viewOnly}
                                    />
                                </div>
                            </div>

                            {activeRole?.isSystem && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2 text-xs text-amber-800 flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-amber-600 shrink-0" />
                                    <span>
                                        <strong>System Role:</strong> Default system roles are protected to preserve platform integrity and cannot be modified.
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Search, Filter & Quick-action Toolbar */}
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Search permissions */}
                                <div className="relative w-full sm:w-64">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={permSearchQuery}
                                        onChange={(e) => setPermSearchQuery(e.target.value)}
                                        placeholder="Filter permissions..."
                                        className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition"
                                    />
                                    {permSearchQuery && (
                                        <button
                                            onClick={() => setPermSearchQuery('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>

                                {/* Filter pills */}
                                <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setPermFilterMode('all')}
                                        className={`px-2.5 py-1 rounded-md font-medium transition ${
                                            permFilterMode === 'all'
                                                ? 'bg-white text-purple-700 shadow-sm font-semibold'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        All ({totalPermissionsCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPermFilterMode('selected')}
                                        className={`px-2.5 py-1 rounded-md font-medium transition ${
                                            permFilterMode === 'selected'
                                                ? 'bg-white text-purple-700 shadow-sm font-semibold'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Selected ({selectedPerms.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPermFilterMode('unselected')}
                                        className={`px-2.5 py-1 rounded-md font-medium transition ${
                                            permFilterMode === 'unselected'
                                                ? 'bg-white text-purple-700 shadow-sm font-semibold'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Unselected ({Math.max(0, totalPermissionsCount - selectedPerms.length)})
                                    </button>
                                </div>
                            </div>

                            {/* Collapse / Expand all sections & Global Select Actions */}
                            <div className="flex items-center gap-3 flex-wrap">
                                {/* Collapse / Expand all sections */}
                                <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg text-xs">
                                    <button
                                        type="button"
                                        onClick={expandAllSections}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-slate-700 hover:text-purple-700 hover:bg-white hover:shadow-2xs transition font-semibold"
                                        title="Expand all module sections"
                                    >
                                        <ChevronsUpDown size={14} className="text-purple-600" />
                                        <span>Expand All</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={collapseAllSections}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-slate-700 hover:text-purple-700 hover:bg-white hover:shadow-2xs transition font-semibold"
                                        title="Collapse all module sections"
                                    >
                                        <ChevronsDownUp size={14} className="text-purple-600" />
                                        <span>Collapse All</span>
                                    </button>
                                </div>

                                {/* Global Select/Deselect All Actions */}
                                {!viewOnly && (
                                    <div className="flex items-center gap-2 text-xs border-l border-slate-200 pl-3">
                                        <button
                                            type="button"
                                            onClick={() => handleSelectAllGlobally(true)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 font-semibold rounded-lg transition"
                                        >
                                            <CheckCheck size={14} />
                                            <span>Select All</span>
                                        </button>
                                        <span className="text-slate-300">•</span>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectAllGlobally(false)}
                                            className="px-2.5 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-semibold rounded-lg transition"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Permission Modules and Checkboxes (All in Alphabetical Order) */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {filteredModulesForModal.map(mod => {
                                const isCollapsed = !!collapsedModules[mod.moduleName];
                                const isTAModule = mod.moduleName === TA_PERMISSION_MODULE;
                                const ModuleIcon = mod.icon;
                                const isAllModuleSelected = mod.filteredPermissions.length > 0 &&
                                    mod.filteredPermissions.every(p => selectedPerms.some(id => String(id) === String(p._id)));

                                return (
                                    <div
                                        key={mod.moduleName}
                                        className="border border-slate-200/90 rounded-2xl bg-white shadow-sm overflow-hidden transition-all"
                                    >
                                        {/* Module Header */}
                                        <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3">
                                            <div
                                                onClick={() => toggleCollapseModule(mod.moduleName)}
                                                className="flex items-center gap-2.5 cursor-pointer select-none flex-1"
                                            >
                                                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-purple-600 shadow-2xs">
                                                    <ModuleIcon size={15} />
                                                </div>
                                                <h4 className="font-bold text-slate-800 text-sm tracking-tight">
                                                    {mod.displayName}
                                                </h4>
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                                    mod.selectedCount === mod.totalCount && mod.totalCount > 0
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : mod.selectedCount > 0
                                                            ? 'bg-purple-100 text-purple-700'
                                                            : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {mod.selectedCount} / {mod.totalCount} selected
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {!viewOnly && mod.filteredPermissions.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleGroup(mod.filteredPermissions)}
                                                        className="text-xs text-purple-600 hover:text-purple-800 font-semibold hover:underline"
                                                    >
                                                        {isAllModuleSelected ? 'Unselect All' : 'Select All'}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleCollapseModule(mod.moduleName)}
                                                    className="text-slate-400 hover:text-slate-600 p-1"
                                                >
                                                    <ChevronDown
                                                        size={16}
                                                        className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                                                    />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Module Permissions Grid */}
                                        {!isCollapsed && (
                                            <div className="p-4 space-y-4">
                                                {/* Talent Acquisition Sub-tabs */}
                                                {isTAModule && (
                                                    <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-100">
                                                        {TA_PERMISSION_SUB_TABS.map((tab) => {
                                                            const isActive = taPermissionTab === tab.id;
                                                            const tabCount = filterTAPermissionsByTab(mod.permissions, tab.id).length;

                                                            return (
                                                                <button
                                                                    key={tab.id}
                                                                    type="button"
                                                                    onClick={() => setTaPermissionTab(tab.id)}
                                                                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                                                        isActive
                                                                            ? 'border-purple-200 bg-purple-50 text-purple-700 shadow-2xs'
                                                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                                                                    }`}
                                                                >
                                                                    {tab.label} ({tabCount})
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Permissions List / Checkboxes */}
                                                {isTAModule ? (
                                                    <div className="space-y-4">
                                                        {mod.taSections.map((section) => (
                                                            <div key={section.id} className="space-y-2.5">
                                                                {section.label && (
                                                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                                        {section.label}
                                                                    </div>
                                                                )}
                                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                                                                    {section.permissions.map((p) => {
                                                                        const isSelected = selectedPerms.some(id => String(id) === String(p._id));

                                                                        return (
                                                                            <label
                                                                                key={p._id}
                                                                                onClick={() => togglePermission(p._id)}
                                                                                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                                                                                    isSelected
                                                                                        ? 'border-purple-300 bg-purple-50/40 shadow-2xs'
                                                                                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                                                                                } ${viewOnly ? 'cursor-default' : 'cursor-pointer'}`}
                                                                            >
                                                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                                                                                    isSelected
                                                                                        ? 'bg-purple-600 border-purple-600 text-white'
                                                                                        : 'bg-white border-slate-300'
                                                                                }`}>
                                                                                    {isSelected && <Check size={13} className="stroke-[3]" />}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-xs font-semibold text-slate-800 leading-snug">
                                                                                        {p.description || p.key}
                                                                                    </div>
                                                                                    <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                                                                                        {p.key}
                                                                                    </div>
                                                                                </div>
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                                                        {mod.filteredPermissions.map(p => {
                                                            const isSelected = selectedPerms.some(id => String(id) === String(p._id));

                                                            return (
                                                                <label
                                                                    key={p._id}
                                                                    onClick={() => togglePermission(p._id)}
                                                                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                                                                        isSelected
                                                                            ? 'border-purple-300 bg-purple-50/40 shadow-2xs'
                                                                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                                                                    } ${viewOnly ? 'cursor-default' : 'cursor-pointer'}`}
                                                                >
                                                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                                                                        isSelected
                                                                            ? 'bg-purple-600 border-purple-600 text-white'
                                                                            : 'bg-white border-slate-300'
                                                                    }`}>
                                                                        {isSelected && <Check size={13} className="stroke-[3]" />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-xs font-semibold text-slate-800 leading-snug">
                                                                            {p.description || p.key}
                                                                        </div>
                                                                        <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                                                                            {p.key}
                                                                        </div>
                                                                        {p.key === 'project.userperformance.view' && (
                                                                            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                                                <span>Requires <strong>user.read</strong> permission</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {mod.filteredPermissions.length === 0 && (
                                                    <div className="p-4 text-center text-xs text-slate-400">
                                                        No permissions matched your current search/filter.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {filteredModulesForModal.length === 0 && (
                                <div className="p-12 text-center">
                                    <Shield size={36} className="mx-auto text-slate-300 mb-2" />
                                    <h4 className="text-sm font-semibold text-slate-700">No permissions match your filter</h4>
                                    <p className="text-xs text-slate-400 mt-1">Try resetting the search query or switching filter tabs.</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-between gap-4">
                            <div className="text-xs text-slate-500 font-medium">
                                <span className="font-bold text-purple-700">{selectedPerms.length}</span> of {totalPermissionsCount} permissions granted
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
                                >
                                    {viewOnly ? 'Close' : 'Cancel'}
                                </button>
                                {!viewOnly && (
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={handleSubmit}
                                        className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-semibold shadow-sm transition-all shadow-purple-600/20 disabled:opacity-50 active:scale-95"
                                    >
                                        {isSubmitting ? 'Saving...' : (editingId ? 'Update Role' : 'Create Role')}
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default Roles;
