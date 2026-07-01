import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
    User, Briefcase, FileText, DollarSign, Calendar, Shield, Settings,
    ArrowLeft, Save, Upload, Download, Trash2, CheckCircle, AlertCircle, X, Search, Eye, RotateCcw, Mail,
    Clock, AlertTriangle, Info, GitCompare, TrendingUp, History
} from 'lucide-react';
import toast from 'react-hot-toast';
import Skeleton from '../components/Skeleton';
import { format } from 'date-fns';
import Button from '../components/Button';
import { buildMasterSalaryStructure, fmtMoney, PT_STATE_LIST } from '../utils/payroll';

const COMPANY_LOGO_DISPLAY_OPTIONS = [
    {
        value: 'talentcio',
        label: 'Talentcio Logo',
        description: 'Show the default Talentcio logo in the workspace sidebar.'
    },
    {
        value: 'company',
        label: 'Company Logo',
        description: 'Use your uploaded company logo in place of the default logo.'
    },
    {
        value: 'none',
        label: 'No Logo',
        description: 'Keep the logo area empty.'
    }
];

const COMPANY_LOGO_ALIGNMENT_OPTIONS = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' }
];

const DEFAULT_COMPANY_LOGO_ALIGNMENT = 'left';
const DEFAULT_COMPANY_LOGO_SIZE = 140;
const MIN_COMPANY_LOGO_SIZE = 80;
const MAX_COMPANY_LOGO_SIZE = 170;
const DOSSIER_FILE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const DOSSIER_ALLOWED_FILE_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp'
]);

// Helper Components defined outside to prevent re-renders
const Field = ({ label, value, section, field, type = "text", options = null, isEditing, hideIfEmpty, onChangeOverride, valueOverride, placeholder, formData, onChange, maxLength, error, required, dateFormat = "dd MMM yyyy" }) => {
    if (!isEditing && !value && hideIfEmpty) return null;

    const rawCurrentValue = valueOverride !== undefined ? valueOverride : formData?.[section]?.[field];
    const currentValue = rawCurrentValue ?? '';
    const handleChange = onChangeOverride || ((e) => onChange(section, field, e.target.value));

    return (
        <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {isEditing ? (
                <>
                    {options ? (
                        <select
                            value={currentValue}
                            onChange={handleChange}
                            className={`w-full p-2 border rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none ${error ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                        >
                            <option value="">Select</option>
                            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    ) : (
                        <input
                            type={type}
                            value={type === 'date' && currentValue ? new Date(currentValue).toISOString().split('T')[0] : currentValue}
                            onChange={handleChange}
                            placeholder={placeholder}
                            maxLength={maxLength}
                            className={`w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-100 outline-none ${error ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                        />
                    )}
                    {error && <p className="text-xs text-red-500 mt-1 flex items-center"><span className="mr-1">⚠️</span> {error}</p>}
                </>
            ) : (
                <div className={`text-sm font-medium ${!value ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                    {type === 'date' && value ? format(new Date(value), dateFormat) : value || 'Not Set'}
                </div>
            )}
        </div>
    );
};

// Helper: renders a single changed field showing old value (red) and new value (green).
// Returns null if old and new are identical — so unchanged fields don't clutter the diff.
const DiffField = ({ label, oldValue, newValue, type }) => {
    const fmt = (v) => {
        if (!v && v !== 0) return '—';
        if (type === 'date') {
            try { return format(new Date(v), 'dd MMM yyyy'); } catch { return String(v); }
        }
        return String(v);
    };
    const oldStr = fmt(oldValue);
    const newStr = fmt(newValue);
    if (oldStr === newStr) return null;
    return (
        <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-3 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
            <div className="flex gap-2 items-start">
                <div className="flex-1 text-xs text-red-700 bg-red-50 border border-red-100 px-2 py-1.5 rounded line-through break-words">
                    {oldStr}
                </div>
                <div className="text-slate-400 text-xs pt-1">→</div>
                <div className="flex-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1.5 rounded break-words">
                    {newStr}
                </div>
            </div>
        </div>
    );
};

// Frontend-only helper: merges pendingUpdates into a profile object.
// Used exclusively to pre-fill the edit form when an employee wants to correct a rejection.
const mergePendingIntoProfile = (profileObj, pending) => {
    if (!pending || !profileObj) return profileObj;
    const merged = JSON.parse(JSON.stringify(profileObj));
    const mergeObj = (t, s) => ({ ...(t || {}), ...(s || {}) });
    if (pending.personal) merged.personal = mergeObj(merged.personal, pending.personal);
    if (pending.identity) merged.identity = mergeObj(merged.identity, pending.identity);
    if (pending.contact) merged.contact = mergeObj(merged.contact, pending.contact);
    if (pending.family) merged.family = mergeObj(merged.family, pending.family);
    if (pending.employment) merged.employment = mergeObj(merged.employment, pending.employment);
    if (pending.compensation) {
        merged.compensation = mergeObj(merged.compensation, pending.compensation);
        if (pending.compensation.bankDetails)
            merged.compensation.bankDetails = mergeObj(merged.compensation?.bankDetails, pending.compensation.bankDetails);
        if (pending.compensation.salaryBreakup)
            merged.compensation.salaryBreakup = mergeObj(merged.compensation?.salaryBreakup, pending.compensation.salaryBreakup);
    }
    if (pending.education) merged.education = pending.education;
    if (pending.experience) merged.experience = pending.experience;
    if (pending.skills) merged.skills = pending.skills;
    return merged;
};

/**
 * PendingHighlight — wraps a Field to indicate it has a pending change awaiting approval.
 * Only renders the highlight when:
 *  - `show` is true (i.e. admin is viewing, not editing, and pendingUpdates exist)
 *  - the live value and the pending new value are actually different
 *
 * On hover or click: shows a compact popover with old (red) → new (green) values.
 */
const PendingHighlight = ({ show, liveValue, pendingValue, label, type, children, dateFormat = "dd MMM yyyy" }) => {
    const [open, setOpen] = React.useState(false);

    const fmt = (v) => {
        if (!v && v !== 0) return '—';
        if (type === 'date') {
            try { return format(new Date(v), dateFormat); } catch { return String(v); }
        }
        return String(v);
    };

    const liveStr = fmt(liveValue);
    const pendStr = fmt(pendingValue);
    const hasChange = show && pendingValue !== undefined && liveStr !== pendStr;

    if (!hasChange) return <>{children}</>;

    // Clone children to inject pendingValue so it displays in the Field
    const updatedChildren = React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, { value: pendingValue });
        }
        return child;
    });

    return (
        <div
            className="relative group"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onClick={() => setOpen(o => !o)}
        >
            {/* Green-tinted field container showing the updated value */}
            <div className="rounded-md ring-2 ring-emerald-300 ring-offset-1 bg-emerald-50/50 p-0.5 cursor-pointer transition-all hover:bg-emerald-50/70">
                {updatedChildren}
                {/* Pulsing badge showing updated value status */}
                <div className="flex items-center gap-1 mt-1 px-1">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">
                        Updated (Pending)
                    </span>
                </div>
            </div>

            {/* Popover — appears on hover/click */}
            {open && (
                <div
                    className="absolute z-50 top-full left-0 mt-1.5 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{label}</p>
                    </div>
                    <div className="space-y-1.5">
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Current (Live)</p>
                            <div className="text-xs text-red-700 bg-red-50 border border-red-100 px-2 py-1.5 rounded line-through break-words">
                                {liveStr}
                            </div>
                        </div>
                        <div className="flex justify-center text-slate-400 text-xs">↓</div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Proposed (New)</p>
                            <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1.5 rounded break-words">
                                {pendStr}
                            </div>
                        </div>
                    </div>
                    <p className="text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                        Approve or reject to apply this change.
                    </p>
                </div>
            )}
        </div>
    );
};

const EditDisclaimer = ({ isDirectWrite }) => {
    if (isDirectWrite) {
        return (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3 shadow-sm mb-4 animate-in fade-in duration-200">
                <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
                <div>
                    <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Direct Write Enabled</p>
                    <p className="text-xs text-blue-700 mt-0.5 font-medium leading-relaxed">
                        As an Admin editing another employee's profile, any changes you make here will be applied directly to their live profile immediately.
                    </p>
                </div>
            </div>
        );
    }
    return (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-sm mb-4 animate-in fade-in duration-200">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0 animate-pulse" />
            <div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Approval Required</p>
                <p className="text-xs text-amber-700 mt-0.5 font-medium leading-relaxed">
                    Changes made to this section will be saved as draft changes. They must be submitted to HR for approval before taking effect on your live profile.
                </p>
            </div>
        </div>
    );
};

const SectionCard = ({ title, sectionName, icon: Icon, children, editMode, setEditMode, onSave, isLoading, canEdit = true, showActions = true, isEditingOverride, customEditAction }) => {
    const isEditing = isEditingOverride !== undefined ? isEditingOverride : editMode === sectionName;
    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2">
                    {Icon && <Icon size={20} className="text-slate-400" />}
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                </div>
                {showActions && (
                    canEdit && !isEditing ? (
                        <button onClick={customEditAction || (() => setEditMode(sectionName))} className="text-sm bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md font-medium transition flex items-center border border-slate-200">
                            <Save size={14} className="mr-1.5" /> Edit
                        </button>
                    ) : isEditing ? (
                        <div className="flex space-x-2">
                            <Button variants="ghost" onClick={() => setEditMode(false)} disabled={isLoading} className="text-slate-500 hover:text-slate-700 px-3 py-1.5">Cancel</Button>
                            <Button onClick={() => onSave(sectionName)} isLoading={isLoading} className="px-3 py-1.5 shadow-sm">Save</Button>
                        </div>
                    ) : null
                )}
            </div>
            {children(isEditing)}
        </div>
    );
};

const SkillsInput = ({ label, skills = [], onUpdate, placeholder }) => {
    const [input, setInput] = useState('');

    const handleAdd = () => {
        if (!input.trim()) return;
        if (skills.includes(input.trim())) {
            toast.error('Skill already exists');
            return;
        }
        onUpdate([...skills, input.trim()]);
        setInput('');
    };

    const handleRemove = (skillToRemove) => {
        onUpdate(skills.filter(skill => skill !== skillToRemove));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">{label}</label>
            <div className="space-y-3">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="flex-1 p-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                        onClick={handleAdd}
                        type="button"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                        Add
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {skills.length > 0 ? (
                        skills.map((skill, index) => (
                            <span key={`${skill}-${index}`} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 group">
                                {skill}
                                <button
                                    onClick={() => handleRemove(skill)}
                                    className="ml-1.5 text-blue-400 hover:text-blue-600 focus:outline-none"
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        ))
                    ) : (
                        <span className="text-xs text-slate-400 italic">No skills added yet.</span>
                    )}
                </div>
            </div>
        </div>
    );
};


// Define document categories outside component for global access
const documentCategories = [
    {
        name: 'Identity Documents',
        category: 'ID Proof',
        allowMultiple: false,
        fixedDocs: ['Aadhaar Card (Front)', 'Aadhaar Card (Back)', 'Pan Card', 'Passport', 'Recent Passport-Size Photograph']
    },
    {
        name: 'Qualification Certificates',
        category: 'Education',
        allowMultiple: true,
        fixedDocs: ['10th Marksheet / Certificate', '12th Marksheet / Certificate', 'Graduation Marksheet / Certificate'],
        icon: '🎓'
    },
    {
        name: 'Previous Experience Letters',
        category: 'Employment',
        allowMultiple: true,
        icon: '💼'
    },
    {
        name: 'Previous Offer Letters',
        category: 'Offer Letter',
        allowMultiple: true,
        icon: '📄'
    },
    {
        name: 'Relieving Letters',
        category: 'Relieving Letter',
        allowMultiple: true,
        icon: '✅'
    },
    {
        name: 'Bank Information',
        category: 'Bank',
        allowMultiple: false,
        fixedDocs: ['Cancelled Cheque / Passbook Front Page'],
        icon: '🏦'
    },
    {
        name: 'Resume',
        category: 'Resume',
        allowMultiple: false,
        fixedDocs: ['Updated Resume'],
        icon: '📄'
    }
];

documentCategories.splice(documentCategories.length - 1, 0, {
    name: 'Salary Slips',
    category: 'Payslips',
    allowMultiple: true,
    fixedDocs: []
});

documentCategories.push({
    name: 'Custom Files',
    category: 'Other',
    allowMultiple: true,
    fixedDocs: []
});

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
    
    // Salary tab permission check: user is viewing own profile, is an Admin, or has a Payroll role/permission
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

    // State
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(queryTab || initialTab || 'personal');
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({});
    const [pendingUpdates, setPendingUpdates] = useState(null); // staged unapproved changes
    const [historyLogs, setHistoryLogs] = useState([]);
    const [emailHistoryTab, setEmailHistoryTab] = useState('general');
    const [emailHistoryByTab, setEmailHistoryByTab] = useState({ general: [], onboarding: [], offboarding: [] });
    const [loadedEmailTabs, setLoadedEmailTabs] = useState({ general: false, onboarding: false, offboarding: false });
    const [loadingEmailHistory, setLoadingEmailHistory] = useState(false);
    const [uploadingDocTitle, setUploadingDocTitle] = useState(null);
    const [savingSection, setSavingSection] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingDocId, setDeletingDocId] = useState(null);
    // Preview State
    const [previewFile, setPreviewFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isDocumentDeclared, setIsDocumentDeclared] = useState(false);
    const [showUploadPreview, setShowUploadPreview] = useState(false);
    const [uploadCategory, setUploadCategory] = useState(null);
    const [replaceDocumentContext, setReplaceDocumentContext] = useState(null);
    const fileInputRef = useRef(null);

    // New state for custom document titles
    const [showTitleModal, setShowTitleModal] = useState(false);
    const [customDocTitle, setCustomDocTitle] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [documentReviewModal, setDocumentReviewModal] = useState(null);
    const [documentReviewReason, setDocumentReviewReason] = useState('');
    const [processingDocumentReview, setProcessingDocumentReview] = useState(false);
    const [showHrisRedirectModal, setShowHrisRedirectModal] = useState(false);
    const [showHrisConfirmModal, setShowHrisConfirmModal] = useState(false);
    const [submittingDirectly, setSubmittingDirectly] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});

    // Payroll & Revision history states
    const [payrollConfig, setPayrollConfig] = useState(null);
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [revisionDraft, setRevisionDraft] = useState(null);
    const [draftSalaryPreview, setDraftSalaryPreview] = useState(null);
    const [calculating, setCalculating] = useState(false);

    const [showPayrollModal, setShowPayrollModal] = useState(false);
    const [payPeriod, setPayPeriod] = useState('');
    const [payNetSalary, setPayNetSalary] = useState('');
    const [payStatus, setPayStatus] = useState('Paid');

    const [viewingPayslip, setViewingPayslip] = useState(null);

    useEffect(() => {
        const fetchPayrollConfig = async () => {
            try {
                const res = await api.get('/payroll/config');
                setPayrollConfig(res.data);
            } catch (err) {
                console.error('Failed to load payroll config:', err);
            }
        };
        fetchPayrollConfig();
    }, []);

    useEffect(() => {
        setValidationErrors({});
    }, [editMode]);

    // HRIS Requests State
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
    const companySettingsSectionRef = useRef(null);
    const hasDossierModule = currentUser?.company?.enabledModules?.includes('employeeDossier');
    const hasAdminRole = isCurrentUserAdmin;
    const canViewRolesSettings = hasAdminRole || currentUser?.permissions?.includes('role.read') || currentUser?.hasAllPermissions;
    const canViewAttendanceSettings = currentUser?.company?.enabledModules?.includes('attendance') && (hasAdminRole || currentUser?.permissions?.includes('user.update') || currentUser?.hasAllPermissions);
    const canViewLeavePolicies = currentUser?.company?.enabledModules?.includes('leaves') && (hasAdminRole || currentUser?.permissions?.includes('leave.config.manage') || currentUser?.hasAllPermissions);
    const canViewSettingsTab = canViewRolesSettings || canViewAttendanceSettings || canViewLeavePolicies || canManageCompanyBranding;
    const canViewEmailHistory = hasAdminRole || currentUser?.permissions?.includes('hr_email.send') || currentUser?.hasAllPermissions;
    const isManager = currentUser?.roles?.some(r => r === 'Admin' || r?.name === 'Admin') || currentUser?.directReportsCount > 0 || canApprove;

    // Cleanup preview URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    // Initialize editable state when a section enters edit mode.
    // Avoid rehydrating on every formData change, which would wipe in-progress edits.
    useEffect(() => {
        if (editMode && profile) {
            // Pre-fill the form with pendingUpdates (if present) so that employee's draft changes are preserved.
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
            console.error('Failed to refresh current user profile after company branding update:', error);
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

    useEffect(() => {
        if (activeTab === 'settings' && isCompanySettingsOpen && companySettingsSectionRef.current) {
            companySettingsSectionRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }, [activeTab, isCompanySettingsOpen]);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Verify if file has content and is readable (prevents 0-byte virtual/cloud file errors)
        if (file.size === 0) {
            toast.error('The selected file is empty or unreadable. If this is a cloud file (e.g. Google Drive), please download it to your device first.');
            e.target.value = '';
            return;
        }

        // Support empty mime-type fallback via file extension for robust mobile selection
        let fileType = file.type;
        if ((!fileType || fileType === 'application/octet-stream') && file.name) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'pdf') fileType = 'application/pdf';
            else if (ext === 'jpg' || ext === 'jpeg') fileType = 'image/jpeg';
            else if (ext === 'png') fileType = 'image/png';
            else if (ext === 'webp') fileType = 'image/webp';
        }

        if (!DOSSIER_ALLOWED_FILE_TYPES.has(fileType)) {
            toast.error('Only PDF and image files are allowed.');
            e.target.value = '';
            return;
        }

        if (file.size > DOSSIER_FILE_MAX_SIZE_BYTES) {
            toast.error('File size must be 5MB or less.');
            e.target.value = '';
            return;
        }

        // If we have a fixed title (from old flow), use it
        if (uploadingDocTitle) {
            let category = 'Other';
            const titleLower = uploadingDocTitle.toLowerCase();

            // Allow dynamic resolution from config
            const foundCat = documentCategories.find(cat =>
                cat.fixedDocs?.some(doc => doc.toLowerCase() === titleLower)
            );
            if (foundCat) category = foundCat.category;

            // Fallback heuristics for legacy/undefined
            if (category === 'Other') {
                if (titleLower.includes('resume')) category = 'Resume';
                else if (titleLower.includes('offer letter')) category = 'Offer Letter';
                else if (titleLower.includes('appointment')) category = 'Appointment Letter';
                else if (titleLower.includes('experience')) category = 'Employment';
            }

            setPreviewFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setUploadCategory(category);
            setShowUploadPreview(true);
        }
        // If we have a selected category (new flow), show title modal
        else if (selectedCategory) {
            setPreviewFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setShowTitleModal(true);
        }
    };

    const handleCancelUpload = () => {
        setPreviewFile(null);
        setPreviewUrl(null);
        setUploadCategory(null);
        setShowUploadPreview(false);
        setUploadingDocTitle(null);
        setShowTitleModal(false);
        setCustomDocTitle('');
        setSelectedCategory(null);
        setReplaceDocumentContext(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleConfirmUpload = async () => {
        if (!previewFile) return;

        const title = uploadingDocTitle || customDocTitle;
        const category = uploadCategory || selectedCategory;

        if (!title || !category) {
            toast.error('Please provide document title');
            return;
        }

        const formData = new FormData();
        formData.append('file', previewFile);
        formData.append('title', title);
        formData.append('category', category);
        if (replaceDocumentContext?.docId) {
            formData.append('replaceDocId', replaceDocumentContext.docId);
        }

        try {
            setIsUploading(true);
            const toastId = toast.loading(replaceDocumentContext ? 'Uploading corrected version...' : 'Uploading document...');
            const response = await api.post(`/dossier/${userId}/documents`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.dismiss(toastId);
            toast.success(replaceDocumentContext ? 'Corrected version uploaded successfully' : 'Document uploaded successfully');
            setIsDocumentDeclared(false);
            setProfile((prev) => ({
                ...prev,
                documents: response.data?.documents || prev?.documents || [],
                documentSubmissionStatus: response.data?.submissionStatus || prev?.documentSubmissionStatus
            }));
            fetchDossier(); // Refresh
            if (activeTab === 'history') fetchHistory(); // Refresh history if needed
            handleCancelUpload(); // Close and reset
        } catch (error) {
            console.error('Upload failed', error);
            toast.error(error.response?.data?.message || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const triggerUpload = (docTitle) => {
        setUploadingDocTitle(docTitle);
        setTimeout(() => {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
            }
        }, 0);
    };

    const triggerReplaceUpload = (doc) => {
        setReplaceDocumentContext({
            docId: doc._id,
            title: doc.title,
            category: doc.category
        });
        setUploadingDocTitle(doc.title);
        setSelectedCategory(doc.category);
        setUploadCategory(doc.category);

        setTimeout(() => {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
            }
        }, 0);
    };

    // New function to trigger upload for a category with custom title
    const triggerCategoryUpload = (categoryName, categoryType) => {
        setSelectedCategory(categoryType);
        setTimeout(() => {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
            }
        }, 0);
    };

    const handleDeleteDocument = async (docId) => {
        if (!window.confirm('Are you sure you want to delete this document?')) return;

        try {
            setDeletingDocId(docId);
            const toastId = toast.loading('Deleting document...');
            const response = await api.delete(`/dossier/${userId}/documents/${docId}`);
            toast.dismiss(toastId);
            toast.success('Document deleted successfully');
            setIsDocumentDeclared(false);
            setProfile((prev) => ({
                ...prev,
                documents: response.data?.documents || prev?.documents || [],
                documentSubmissionStatus: response.data?.submissionStatus || prev?.documentSubmissionStatus
            }));
            fetchDossier(); // Refresh
            if (activeTab === 'history') fetchHistory();
        } catch (error) {
            console.error('Delete failed', error);
            toast.error(error.response?.data?.message || 'Failed to delete document');
        } finally {
            setDeletingDocId(null);
        }
    };

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

            // Form always starts from LIVE (approved) data — never from pending.
            // Exception: if status is 'Rejected', pre-fill the form with the last rejected
            // draft so the employee can correct their changes and re-submit without
            // re-entering everything from scratch.
            if (pending) {
                setFormData(mergePendingIntoProfile(liveProfile, pending));
            } else {
                setFormData(JSON.parse(JSON.stringify(liveProfile)));
            }
            setIsDocumentDeclared(false);

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

    // Handle Input Change for nested objects
    const handleInputChange = (section, field, value) => {
        setFormData(prev => {
            const newState = {
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value
                }
            };

            // Auto-uncheck declaration on any change (unless we are toggling the declaration itself)
            if (section !== 'hris' || field !== 'isDeclared') {
                if (newState.hris) {
                    newState.hris = { ...newState.hris, isDeclared: false };
                }
            }

            return newState;
        });

        // Clear validation error for this field
        const errorKey = `${section}.${field}`;
        setValidationErrors(prev => {
            if (prev[errorKey]) {
                const next = { ...prev };
                delete next[errorKey];
                return next;
            }
            return prev;
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

        // Clear validation error
        const errorKey = `contact.emergencyContact.${field}`;
        setValidationErrors(prev => {
            if (prev[errorKey]) {
                const next = { ...prev };
                delete next[errorKey];
                return next;
            }
            return prev;
        });
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

        // Clear validation error
        const errorKey = `contact.addresses.${type}.${field}`;
        setValidationErrors(prev => {
            if (prev[errorKey]) {
                const next = { ...prev };
                delete next[errorKey];
                return next;
            }
            return prev;
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

    const validateHRISForm = () => {
        const p = formData.personal || {};
        const b = formData.compensation?.bankDetails || {};
        const uan = formData.compensation?.uanNumber;
        const f = formData.family || {};
        const iden = formData.identity || {};
        const contact = formData.contact || {};
        const ec = contact.emergencyContact || {};
        const addresses = contact.addresses || [];
        const currentAddr = addresses.find(a => a.type === 'Current') || {};
        const permanentAddr = addresses.find(a => a.type === 'Permanent') || {};

        const errors = {};
        let isValid = true;

        // 1. Basic Details & Identity
        if (!contact.personalEmail || !contact.personalEmail.trim()) {
            errors['contact.personalEmail'] = 'Required';
            isValid = false;
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(contact.personalEmail.trim())) {
                errors['contact.personalEmail'] = 'Please enter a valid email address';
                isValid = false;
            }
        }

        if (!iden.panNumber || !iden.panNumber.trim()) {
            errors['identity.panNumber'] = 'Required';
            isValid = false;
        } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(iden.panNumber.trim().toUpperCase())) {
            errors['identity.panNumber'] = 'PAN Card Number must be a valid 10-character alphanumeric code';
            isValid = false;
        }

        if (!iden.aadhaarNumber || !iden.aadhaarNumber.trim()) {
            errors['identity.aadhaarNumber'] = 'Required';
            isValid = false;
        } else if (!/^\d{12}$/.test(iden.aadhaarNumber.trim())) {
            errors['identity.aadhaarNumber'] = 'Aadhaar Card Number must be a 12-digit number';
            isValid = false;
        }

        if (formData.compensation?.isUanApplicable === true) {
            if (!uan || !uan.trim()) {
                errors['compensation.uanNumber'] = 'Required';
                isValid = false;
            } else if (!/^\d{12}$/.test(uan)) {
                errors['compensation.uanNumber'] = 'UAN must be a 12-digit number';
                isValid = false;
            }
        }

        // 2. Name Details
        if (!p.fullName || !p.fullName.trim()) {
            errors['personal.fullName'] = 'Required';
            isValid = false;
        }
        if (!p.firstName || !p.firstName.trim()) {
            errors['personal.firstName'] = 'Required';
            isValid = false;
        }
        if (!p.lastName || !p.lastName.trim()) {
            errors['personal.lastName'] = 'Required';
            isValid = false;
        }

        // 3. Personal Information
        if (!p.gender || !p.gender.trim()) {
            errors['personal.gender'] = 'Required';
            isValid = false;
        }
        if (!p.dob || !p.dob.trim()) {
            errors['personal.dob'] = 'Required';
            isValid = false;
        }
        if (!p.maritalStatus || !p.maritalStatus.trim()) {
            errors['personal.maritalStatus'] = 'Required';
            isValid = false;
        }
        if (!p.nationality || !p.nationality.trim()) {
            errors['personal.nationality'] = 'Required';
            isValid = false;
        }
        if (!p.bloodGroup || !p.bloodGroup.trim()) {
            errors['personal.bloodGroup'] = 'Required';
            isValid = false;
        }
        if (p.disabilityStatus === undefined || p.disabilityStatus === null || p.disabilityStatus === '') {
            errors['personal.disabilityStatus'] = 'Required';
            isValid = false;
        } else if (p.disabilityStatus === true) {
            if (!p.disabilityDetails || !p.disabilityDetails.trim()) {
                errors['personal.disabilityDetails'] = 'Required';
                isValid = false;
            }
        }

        // 4. Bank details
        if (!b.accountNumber || !b.accountNumber.trim()) {
            errors['compensation.bankDetails.accountNumber'] = 'Required';
            isValid = false;
        }
        if (!b.ifscCode || !b.ifscCode.trim()) {
            errors['compensation.bankDetails.ifscCode'] = 'Required';
            isValid = false;
        }
        if (!b.bankName || !b.bankName.trim()) {
            errors['compensation.bankDetails.bankName'] = 'Required';
            isValid = false;
        }
        if (!b.accountHolderName || !b.accountHolderName.trim()) {
            errors['compensation.bankDetails.accountHolderName'] = 'Required';
            isValid = false;
        }
        if (!b.branchAddress || !b.branchAddress.trim()) {
            errors['compensation.bankDetails.branchAddress'] = 'Required';
            isValid = false;
        }

        // 5. Address Details
        const addressFields = ['line1', 'addressLine2', 'city', 'state', 'zipCode', 'country'];
        addressFields.forEach(fld => {
            const currentVal = currentAddr[fld] || currentAddr[fld === 'line1' ? 'street' : ''];
            if (!currentVal || !String(currentVal).trim()) {
                errors[`contact.addresses.Current.${fld}`] = 'Required';
                isValid = false;
            }
            const permVal = permanentAddr[fld] || permanentAddr[fld === 'line1' ? 'street' : ''];
            if (!permVal || !String(permVal).trim()) {
                errors[`contact.addresses.Permanent.${fld}`] = 'Required';
                isValid = false;
            }
        });
        if (!currentAddr.phone || !currentAddr.phone.trim()) {
            errors['contact.addresses.Current.phone'] = 'Required';
            isValid = false;
        } else if (!/^\d{10}$/.test(currentAddr.phone.trim())) {
            errors['contact.addresses.Current.phone'] = 'Current Address Phone must be a 10-digit number';
            isValid = false;
        }

        // 6. Contact Details
        if (!contact.mobileNumber || !contact.mobileNumber.trim()) {
            errors['contact.mobileNumber'] = 'Required';
            isValid = false;
        } else if (!/^\d{10}$/.test(contact.mobileNumber.trim())) {
            errors['contact.mobileNumber'] = 'Personal Mobile must be a valid 10-digit number';
            isValid = false;
        }
        if (!contact.alternateNumber || !contact.alternateNumber.trim()) {
            errors['contact.alternateNumber'] = 'Required';
            isValid = false;
        } else if (!/^\d{10}$/.test(contact.alternateNumber.trim())) {
            errors['contact.alternateNumber'] = 'Alternate Mobile Number must be a valid 10-digit number';
            isValid = false;
        }

        // Emergency contact
        if (!ec.name || !ec.name.trim()) {
            errors['contact.emergencyContact.name'] = 'Required';
            isValid = false;
        }
        if (!ec.relation || !ec.relation.trim()) {
            errors['contact.emergencyContact.relation'] = 'Required';
            isValid = false;
        }
        if (!ec.phone || !ec.phone.trim()) {
            errors['contact.emergencyContact.phone'] = 'Required';
            isValid = false;
        } else if (!/^\d{10}$/.test(ec.phone.trim())) {
            errors['contact.emergencyContact.phone'] = 'Must be a 10-digit number';
            isValid = false;
        }
        if (!ec.alternatePhone || !ec.alternatePhone.trim()) {
            errors['contact.emergencyContact.alternatePhone'] = 'Required';
            isValid = false;
        } else if (!/^\d{10}$/.test(ec.alternatePhone.trim())) {
            errors['contact.emergencyContact.alternatePhone'] = 'Must be a 10-digit number';
            isValid = false;
        }
        if (ec.email && ec.email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(ec.email.trim())) {
                errors['contact.emergencyContact.email'] = 'Please enter a valid emergency contact email';
                isValid = false;
            }
        }

        // 7. Family Details
        if (!f.fatherName || !f.fatherName.trim()) {
            errors['family.fatherName'] = 'Required';
            isValid = false;
        }
        if (!f.motherName || !f.motherName.trim()) {
            errors['family.motherName'] = 'Required';
            isValid = false;
        }
        if (p.maritalStatus === 'Married') {
            if (!f.spouseName || !f.spouseName.trim()) {
                errors['family.spouseName'] = 'Required';
                isValid = false;
            }
        }

        setValidationErrors(errors);

        if (!isValid) {
            const hasEmptyMandatory = Object.values(errors).some(v => v === 'Required');
            if (hasEmptyMandatory) {
                toast.error('Mandatory fields are missing');
            } else {
                const firstError = Object.values(errors)[0];
                if (firstError) {
                    toast.error(firstError);
                }
            }
        }

        return isValid;
    };

    const handleHRISSave = async (forceIsDeclared) => {
        if (!validateHRISForm()) return;

        try {
            setSavingSection('hris');
            const dataToSubmit = { ...formData };

            // Determine isDeclared based on parameter or fallback to form data
            let declared = forceIsDeclared !== undefined ? forceIsDeclared : !!formData.hris?.isDeclared;

            const isAdmin = currentUser?.roles?.some(r => r === 'Admin' || r?.name === 'Admin');
            const isDirectWrite = isAdmin && !isSelf;

            if (isDirectWrite) {
                // For admin editing others, always force true
                declared = true;
            }

            if (!dataToSubmit.hris) dataToSubmit.hris = {};
            dataToSubmit.hris.isDeclared = declared;

            await api.patch(`/dossier/${userId}/submit-hris`, dataToSubmit);
            toast.success(declared ? 'EIS Form submitted for approval' : 'EIS Form saved as draft');
            setEditMode(false);
            setShowHrisConfirmModal(false); // Close confirmation modal if open
            fetchDossier();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save EIS form');
        } finally {
            setSavingSection(null);
        }
    };

    const handleHRISSaveClick = () => {
        if (!validateHRISForm()) return;

        const isAdmin = currentUser?.roles?.some(r => r === 'Admin' || r?.name === 'Admin');
        const isDirectWrite = isAdmin && !isSelf;

        if (isDirectWrite) {
            // Direct write goes through directly
            handleHRISSave(true);
        } else {
            // Regular employee / self-update: show draft / approval disclaimer modal
            setShowHrisConfirmModal(true);
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
            const displayName = [targetUser?.firstName, targetUser?.lastName]
                .filter(Boolean)
                .join(' ')
                .trim();
            const safeBaseName = (displayName || 'Employee')
                .replace(/\s+/g, '_')
                .replace(/[^a-zA-Z0-9_-]/g, '')
                || 'Employee';
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


    // Validation Helper
    const validateSectionData = (section) => {
        const data = formData[section] || {};

        const isEmpty = (val) => val === undefined || val === null || val === '';

        if (section === 'personal') {
            const required = ['dob', 'gender', 'maritalStatus', 'nationality', 'bloodGroup', 'disabilityStatus'];
            const missing = required.filter(f => isEmpty(data[f]));
            if (missing.length > 0) return 'All fields are required'; // Generic warning
            if (data.disabilityStatus === true && isEmpty(data.disabilityDetails)) {
                return 'Nature of disability is required if Disability Status is Yes';
            }
        }
        if (section === 'contact') {
            if (isEmpty(data.personalEmail) || isEmpty(data.mobileNumber)) return 'Email and Mobile Number are required';

            // Check Emergency Contact
            const ec = data.emergencyContact || {};
            if (isEmpty(ec.name) || isEmpty(ec.relation) || isEmpty(ec.phone) || isEmpty(ec.alternatePhone)) return 'Name, relation, phone, and alternate phone for emergency contact are required';

            // Validate Addresses
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
        if (section === 'experience') {
            return null; // Optional fields, no strict validation required
        }
        return null;
    };

    // Save Changes
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
            fetchDossier(); // Refresh to ensure sync
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
            toast.error('The selected file is empty or unreadable. If this is a cloud file (e.g. Google Drive), please download it to your device first.');
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

    const renderSettings = () => {
        const settingCards = [
            {
                key: 'roles',
                visible: canViewRolesSettings,
                label: 'Roles & Permissions',
                description: 'Manage role access and permission mappings across the workspace.',
                route: '/roles'
            },
            {
                key: 'attendance',
                visible: canViewAttendanceSettings,
                label: 'Attendance Settings',
                description: 'Configure attendance modes, shifts, location rules, and policy defaults.',
                route: '/attendance-settings'
            },
            {
                key: 'leave',
                visible: canViewLeavePolicies,
                label: 'Leave Policies',
                description: 'Review and update leave types, accrual rules, and leave balances policy setup.',
                route: '/leave-config'
            },
            {
                key: 'company',
                visible: canManageCompanyBranding,
                label: 'Company Setting',
                description: 'Choose the workspace sidebar logo, upload branding, and preview the company look.',
                action: () => setIsCompanySettingsOpen(true)
            }
        ].filter((card) => card.visible);
        const previewLogoSrc = companyBranding.displayMode === 'talentcio'
            ? '/dark-logo-compact.png'
            : companyBranding.displayMode === 'company'
                ? companyBranding.companyLogoUrl
                : '';
        const previewLogoAlignmentClass = companyBranding.logoAlignment === 'center'
            ? 'justify-center'
            : companyBranding.logoAlignment === 'right'
                ? 'justify-end'
                : 'justify-start';
        const previewLogoSize = Math.min(
            Math.max(Number(companyBranding.logoSize) || DEFAULT_COMPANY_LOGO_SIZE, MIN_COMPANY_LOGO_SIZE),
            MAX_COMPANY_LOGO_SIZE
        );

        return (
            <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <Settings size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Admin Settings</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Open the core company setup pages directly from your profile.
                            </p>
                        </div>
                    </div>

                    {settingCards.length > 0 ? (
                        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {settingCards.map((card) => (
                                <button
                                    key={card.key}
                                    type="button"
                                    onClick={() => {
                                        if (card.action) {
                                            card.action();
                                            return;
                                        }

                                        navigate(card.route);
                                    }}
                                    className="group rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-left transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-md"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-base font-semibold text-slate-800 transition-colors group-hover:text-blue-700">
                                            {card.label}
                                        </span>
                                        <span className="rounded-full bg-white p-2 text-slate-400 transition-colors group-hover:text-blue-600">
                                            <ArrowLeft size={16} className="rotate-180" />
                                        </span>
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-slate-500">
                                        {card.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                            No settings shortcuts are available for your access level.
                        </div>
                    )}
                </div>

                {canManageCompanyBranding && isCompanySettingsOpen && (
                    <div
                        ref={companySettingsSectionRef}
                        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Company Setting</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Choose which logo should appear in the workspace sidebar.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCompanySettingsOpen(false)}
                                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                                >
                                    Hide
                                </button>
                                <Button
                                    onClick={handleCompanyBrandingSave}
                                    isLoading={savingCompanyBranding}
                                    disabled={loadingCompanyBranding || uploadingCompanyLogo}
                                    className="px-4 py-2"
                                >
                                    Save Settings
                                </Button>
                            </div>
                        </div>

                        {loadingCompanyBranding ? (
                            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                                Loading company branding settings...
                            </div>
                        ) : (
                            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
                                <div className="space-y-4">
                                    {COMPANY_LOGO_DISPLAY_OPTIONS.map((option) => {
                                        const isSelected = companyBranding.displayMode === option.value;

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setCompanyBranding((current) => ({ ...current, displayMode: option.value }))}
                                                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${isSelected
                                                    ? 'border-blue-300 bg-blue-50 shadow-sm'
                                                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-800">{option.label}</div>
                                                        <p className="mt-1 text-sm leading-6 text-slate-500">{option.description}</p>
                                                    </div>
                                                    {isSelected && <CheckCircle size={18} className="mt-0.5 shrink-0 text-blue-600" />}
                                                </div>
                                            </button>
                                        );
                                    })}

                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">Uploaded company logo</p>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    Upload JPG, PNG, SVG, or WEBP up to 3MB.
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                <label
                                                    htmlFor="company-logo-upload"
                                                    className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 ${uploadingCompanyLogo ? 'pointer-events-none opacity-60' : ''}`}
                                                >
                                                    <Upload size={16} />
                                                    {companyBranding.companyLogoUrl ? 'Change Logo' : 'Upload Logo'}
                                                </label>
                                                <input
                                                    id="company-logo-upload"
                                                    type="file"
                                                    accept=".jpg,.jpeg,.png,.svg,.webp,image/jpeg,image/png,image/svg+xml,image/webp"
                                                    className="hidden"
                                                    onChange={handleCompanyLogoUpload}
                                                    disabled={uploadingCompanyLogo}
                                                />
                                                {companyBranding.companyLogoUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={handleCompanyLogoRemove}
                                                        disabled={uploadingCompanyLogo}
                                                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        <Trash2 size={16} />
                                                        Remove Logo
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {companyBranding.displayMode === 'company' && !companyBranding.companyLogoUrl && (
                                            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                                No company logo is uploaded yet, so the sidebar logo area will stay empty until you add one.
                                            </p>
                                        )}
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">Logo size</p>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    Use one slider. Width changes and height adjusts automatically to keep the logo proportional.
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                                                {previewLogoSize}px
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <input
                                                type="range"
                                                min={MIN_COMPANY_LOGO_SIZE}
                                                max={MAX_COMPANY_LOGO_SIZE}
                                                step="1"
                                                value={previewLogoSize}
                                                onChange={(event) => setCompanyBranding((current) => ({
                                                    ...current,
                                                    logoSize: Number(event.target.value)
                                                }))}
                                                className="w-full accent-blue-600"
                                            />
                                            <div className="mt-2 flex justify-between text-xs font-medium text-slate-400">
                                                <span>Compact</span>
                                                <span>Balanced</span>
                                                <span>Large</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-sm font-semibold text-slate-800">Logo alignment</p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Choose where the logo should stay in the sidebar header.
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-3">
                                            {COMPANY_LOGO_ALIGNMENT_OPTIONS.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => setCompanyBranding((current) => ({
                                                        ...current,
                                                        logoAlignment: option.value
                                                    }))}
                                                    className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition ${companyBranding.logoAlignment === option.value
                                                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                                        }`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Sidebar Preview</p>
                                    <div className="mt-4 flex justify-center">
                                        <div className="w-64 overflow-hidden rounded-[28px] bg-[#111315] shadow-[0_18px_40px_rgba(15,23,42,0.22)] ring-1 ring-black/5">
                                            <div className="flex items-start justify-between border-b border-white/10 px-5 py-5">
                                                <div className={`flex h-12 w-[200px] items-center ${previewLogoAlignmentClass}`}>
                                                    {previewLogoSrc ? (
                                                        <div style={{ width: `${previewLogoSize}px` }}>
                                                            <img
                                                                src={previewLogoSrc}
                                                                alt="Workspace logo preview"
                                                                className="block max-h-12 w-full object-contain"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="h-12 w-[200px]" />
                                                    )}
                                                </div>
                                                <div className="mt-1 h-5 w-5 rounded-full border border-white/10" />
                                            </div>

                                            <div className="px-4 py-6">
                                                <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6d6258]">
                                                    Main
                                                </div>
                                                <div className="mt-3 space-y-1">
                                                    <div className="flex items-center gap-3 rounded-xl bg-white/[0.08] px-3.5 py-2.5 text-[13px] font-semibold text-white">
                                                        <div className="h-[18px] w-[18px] rounded-full bg-white/20" />
                                                        <div className="h-3 w-20 rounded bg-white/20" />
                                                    </div>
                                                    <div className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-400">
                                                        <div className="h-[18px] w-[18px] rounded-full bg-white/10" />
                                                        <div className="h-3 w-24 rounded bg-white/10" />
                                                    </div>
                                                    <div className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-400">
                                                        <div className="h-[18px] w-[18px] rounded-full bg-white/10" />
                                                        <div className="h-3 w-16 rounded bg-white/10" />
                                                    </div>
                                                </div>

                                                <div className="mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6d6258]">
                                                    Manage
                                                </div>
                                                <div className="mt-3 space-y-1">
                                                    <div className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-400">
                                                        <div className="h-[18px] w-[18px] rounded-full bg-white/10" />
                                                        <div className="h-3 w-24 rounded bg-white/10" />
                                                    </div>
                                                    <div className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-400">
                                                        <div className="h-[18px] w-[18px] rounded-full bg-white/10" />
                                                        <div className="h-3 w-20 rounded bg-white/10" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-sm leading-6 text-slate-500">
                                        {previewLogoSrc
                                            ? 'This is how the selected logo will appear in the sidebar.'
                                            : 'No logo will be shown in the sidebar when this option is active.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Profile Photo Settings */}
                        {isCompanySettingsOpen && (
                            <div className="mt-6 border-t border-slate-100 pt-6">
                                <h4 className="text-sm font-bold text-slate-800 mb-3">Profile Photo Settings</h4>
                                <label className="flex items-start space-x-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(companyBranding.requireCameraCapture)}
                                        onChange={(e) => setCompanyBranding((current) => ({
                                            ...current,
                                            requireCameraCapture: e.target.checked
                                        }))}
                                        className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 group-hover:border-blue-400 transition mt-0.5"
                                    />
                                    <div>
                                        <span className="text-sm font-semibold text-slate-800 select-none">Require Camera Capture</span>
                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                            Force employees to take their profile picture directly using their device camera instead of choosing a pre-saved file from their local storage.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderPersonal = () => {
        const pend = pendingUpdates || {};
        const showPending = !!(canApprove && !isSelf && !editMode && pendingUpdates);
        const isPersonalEditing = false;

        const getAddress = (type) => formData.contact?.addresses?.find(a => a.type === type) || {};
        const getProfileAddress = (type) => profile.contact?.addresses?.find(a => a.type === type) || {};
        const getPendingAddress = (type) => pend.contact?.addresses?.find(a => a.type === type) || {};

        return (
            <div className="space-y-6">
                {/* 1. Basic Personal Info */}
                <SectionCard
                    title="Basic Information"
                    sectionName="personal"
                    icon={User}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    onSave={handleSave}
                    isLoading={false}
                    canEdit={canEdit}
                    showActions={canEdit}
                    isEditingOverride={false}
                    customEditAction={redirectToHRISEdit}
                >
                    {(isEditing) => (
                        <div className="space-y-4">
                            <p className="text-xs text-red-500 italic">* fields are mandatory</p>
                            {isEditing && <EditDisclaimer isDirectWrite={isCurrentUserAdmin && !isSelf} />}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <PendingHighlight show={showPending} label="Date of Birth" liveValue={profile.personal?.dob} pendingValue={pend.personal?.dob} type="date">
                                    <Field section="personal" isEditing={isEditing} label="Date of Birth" field="dob" value={profile.personal?.dob} type="date" formData={formData} onChange={handleInputChange} required />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Joining Date" liveValue={profile.personal?.joiningDate || profile.employment?.joiningDate || profile.user?.joiningDate} pendingValue={pend.personal?.joiningDate} type="date" dateFormat="dd/MM/yyyy">
                                    <Field section="personal" isEditing={isEditing && isCurrentUserAdmin} label="Joining Date" field="joiningDate" value={profile.personal?.joiningDate || profile.employment?.joiningDate || profile.user?.joiningDate} type="date" formData={formData} onChange={handleInputChange} required dateFormat="dd/MM/yyyy" />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Gender" liveValue={profile.personal?.gender} pendingValue={pend.personal?.gender}>
                                    <Field section="personal" isEditing={isEditing} label="Gender" field="gender" value={profile.personal?.gender} options={['Male', 'Female', 'Other']} formData={formData} onChange={handleInputChange} required />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Marital Status" liveValue={profile.personal?.maritalStatus} pendingValue={pend.personal?.maritalStatus}>
                                    <Field section="personal" isEditing={isEditing} label="Marital Status" field="maritalStatus" value={profile.personal?.maritalStatus} options={['Single', 'Married', 'Divorced', 'Widowed']} formData={formData} onChange={handleInputChange} required />
                                </PendingHighlight>
                                {(formData.personal?.maritalStatus === 'Married' || (!isEditing && profile.personal?.maritalStatus === 'Married')) && (
                                    <PendingHighlight show={showPending} label="Date of Marriage" liveValue={profile.personal?.dateOfMarriage} pendingValue={pend.personal?.dateOfMarriage} type="date">
                                        <Field section="personal" isEditing={isEditing} label="Date of Marriage" field="dateOfMarriage" type="date" value={profile.personal?.dateOfMarriage} formData={formData} onChange={handleInputChange} />
                                    </PendingHighlight>
                                )}
                                <PendingHighlight show={showPending} label="Nationality" liveValue={profile.personal?.nationality} pendingValue={pend.personal?.nationality}>
                                    <Field section="personal" isEditing={isEditing} label="Nationality" field="nationality" value={profile.personal?.nationality} formData={formData} onChange={handleInputChange} required />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Blood Group" liveValue={profile.personal?.bloodGroup} pendingValue={pend.personal?.bloodGroup}>
                                    <Field section="personal" isEditing={isEditing} label="Blood Group" field="bloodGroup" value={profile.personal?.bloodGroup} formData={formData} onChange={handleInputChange} required />
                                </PendingHighlight>
                                <PendingHighlight
                                    show={showPending}
                                    label="Disability Status"
                                    liveValue={profile.personal?.disabilityStatus ? 'Yes' : 'No'}
                                    pendingValue={pend.personal?.disabilityStatus === undefined ? undefined : (pend.personal?.disabilityStatus ? 'Yes' : 'No')}
                                >
                                    <Field
                                        section="personal"
                                        isEditing={isEditing}
                                        label="Disability Status"
                                        field="disabilityStatus"
                                        value={profile.personal?.disabilityStatus ? 'Yes' : 'No'}
                                        valueOverride={formData.personal?.disabilityStatus ? 'Yes' : 'No'}
                                        options={['No', 'Yes']}
                                        hideIfEmpty
                                        formData={formData}
                                        onChangeOverride={(e) => handleInputChange('personal', 'disabilityStatus', e.target.value === 'Yes')}
                                        required
                                    />
                                </PendingHighlight>
                                {(formData.personal?.disabilityStatus === true || (!isEditing && profile.personal?.disabilityStatus === true)) && (
                                    <PendingHighlight show={showPending} label="Nature of disability" liveValue={profile.personal?.disabilityDetails} pendingValue={pend.personal?.disabilityDetails}>
                                        <Field
                                            section="personal"
                                            isEditing={isEditing}
                                            label="Nature of disability"
                                            field="disabilityDetails"
                                            value={profile.personal?.disabilityDetails}
                                            formData={formData}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </PendingHighlight>
                                )}
                            </div>
                        </div>
                    )}
                </SectionCard>

                {/* 2. Contact Details */}
                <SectionCard
                    title="Contact Information"
                    sectionName="contact"
                    icon={Briefcase}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    onSave={handleSave}
                    isLoading={savingSection === 'personal_all'}
                    canEdit={canEdit}
                    showActions={false}
                    isEditingOverride={isPersonalEditing}
                >
                    {(isEditing) => (
                        <div className="space-y-6">
                            <p className="text-xs text-red-500 italic">* fields are mandatory</p>
                            {isEditing && <EditDisclaimer isDirectWrite={isCurrentUserAdmin && !isSelf} />}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                <PendingHighlight show={showPending} label="Personal Email" liveValue={profile.contact?.personalEmail} pendingValue={pend.contact?.personalEmail}>
                                    <Field section="contact" isEditing={isEditing} label="Personal Email" field="personalEmail" value={profile.contact?.personalEmail} formData={formData} onChange={handleInputChange} required />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Work Email" liveValue={profile.contact?.workEmail || profile.user?.email} pendingValue={pend.contact?.workEmail}>
                                    <Field section="contact" isEditing={isEditing} label="Work Email" field="workEmail" value={profile.contact?.workEmail || profile.user?.email} formData={formData} onChange={handleInputChange} />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Mobile Number" liveValue={profile.contact?.mobileNumber} pendingValue={pend.contact?.mobileNumber}>
                                    <Field
                                        section="contact" isEditing={isEditing} label="Mobile Number" field="mobileNumber"
                                        value={profile.contact?.mobileNumber} formData={formData}
                                        maxLength={10}
                                        error={formData.contact?.mobileNumber?.length > 0 && formData.contact?.mobileNumber?.length < 10 ? 'Must be 10 digits' : null}
                                        onChangeOverride={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            handleInputChange('contact', 'mobileNumber', val);
                                        }}
                                        required
                                    />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Alternate Number" liveValue={profile.contact?.alternateNumber} pendingValue={pend.contact?.alternateNumber}>
                                    <Field
                                        section="contact" isEditing={isEditing} label="Alternate Number" field="alternateNumber"
                                        value={profile.contact?.alternateNumber} formData={formData}
                                        maxLength={10}
                                        error={formData.contact?.alternateNumber?.length > 0 && formData.contact?.alternateNumber?.length < 10 ? 'Must be 10 digits' : null}
                                        onChangeOverride={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            handleInputChange('contact', 'alternateNumber', val);
                                        }}
                                    />
                                </PendingHighlight>
                            </div>

                            {/* Emergency Contact Sub-section */}
                            <div className="pt-4 border-t border-slate-100">
                                <h4 className="text-sm font-bold text-slate-700 mb-4">Emergency Contact</h4>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <PendingHighlight show={showPending} label="Emergency Contact Name" liveValue={profile.contact?.emergencyContact?.name} pendingValue={pend.contact?.emergencyContact?.name}>
                                        <Field
                                            section="contact" isEditing={isEditing}
                                            label="Name" field="EC_name"
                                            value={profile.contact?.emergencyContact?.name}
                                            valueOverride={formData.contact?.emergencyContact?.name}
                                            onChangeOverride={(e) => handleEmergencyChange('name', e.target.value)}
                                            formData={formData} onChange={handleInputChange}
                                            required
                                        />
                                    </PendingHighlight>
                                    <PendingHighlight show={showPending} label="Emergency Contact Relation" liveValue={profile.contact?.emergencyContact?.relation} pendingValue={pend.contact?.emergencyContact?.relation}>
                                        <Field
                                            section="contact" isEditing={isEditing}
                                            label="Relation" field="EC_relation"
                                            value={profile.contact?.emergencyContact?.relation}
                                            valueOverride={formData.contact?.emergencyContact?.relation}
                                            onChangeOverride={(e) => handleEmergencyChange('relation', e.target.value)}
                                            formData={formData} onChange={handleInputChange}
                                            required
                                        />
                                    </PendingHighlight>
                                    <PendingHighlight show={showPending} label="Emergency Contact Phone" liveValue={profile.contact?.emergencyContact?.phone} pendingValue={pend.contact?.emergencyContact?.phone}>
                                        <Field
                                            section="contact" isEditing={isEditing}
                                            label="Phone" field="EC_phone"
                                            value={profile.contact?.emergencyContact?.phone}
                                            valueOverride={formData.contact?.emergencyContact?.phone}
                                            maxLength={10}
                                            error={formData.contact?.emergencyContact?.phone?.length > 0 && formData.contact?.emergencyContact?.phone?.length < 10 ? 'Must be 10 digits' : null}
                                            onChangeOverride={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                handleEmergencyChange('phone', val);
                                            }}
                                            formData={formData} onChange={handleInputChange}
                                            required
                                        />
                                    </PendingHighlight>
                                    <PendingHighlight show={showPending} label="Emergency Contact Alternate Phone" liveValue={profile.contact?.emergencyContact?.alternatePhone} pendingValue={pend.contact?.emergencyContact?.alternatePhone}>
                                        <Field
                                            section="contact" isEditing={isEditing}
                                            label="Alternate Phone" field="EC_alternatePhone"
                                            value={profile.contact?.emergencyContact?.alternatePhone}
                                            valueOverride={formData.contact?.emergencyContact?.alternatePhone}
                                            maxLength={10}
                                            error={formData.contact?.emergencyContact?.alternatePhone?.length > 0 && formData.contact?.emergencyContact?.alternatePhone?.length < 10 ? 'Must be 10 digits' : null}
                                            onChangeOverride={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                handleEmergencyChange('alternatePhone', val);
                                            }}
                                            formData={formData} onChange={handleInputChange}
                                            required
                                        />
                                    </PendingHighlight>
                                    <PendingHighlight show={showPending} label="Emergency Contact Email" liveValue={profile.contact?.emergencyContact?.email} pendingValue={pend.contact?.emergencyContact?.email}>
                                        <Field
                                            section="contact" isEditing={isEditing}
                                            label="Email" field="EC_email"
                                            value={profile.contact?.emergencyContact?.email}
                                            valueOverride={formData.contact?.emergencyContact?.email}
                                            onChangeOverride={(e) => handleEmergencyChange('email', e.target.value)}
                                            formData={formData} onChange={handleInputChange}
                                        />
                                    </PendingHighlight>
                                </div>
                            </div>

                            {/* Address Sub-section */}
                            <div className="pt-4 border-t border-slate-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Current Address */}
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <h4 className="text-sm font-bold text-slate-700 mb-4">Current Address <span className="text-red-500">*</span></h4>
                                        <div className="space-y-3">
                                            <PendingHighlight show={showPending} label="Current Address Line 1" liveValue={getProfileAddress('Current').line1 || getProfileAddress('Current').street} pendingValue={getPendingAddress('Current').line1}>
                                                <Field section="contact" isEditing={isEditing} label="Line 1" field="C_line1" value={getProfileAddress('Current').line1 || getProfileAddress('Current').street}
                                                    valueOverride={getAddress('Current').line1 ?? getAddress('Current').street} onChangeOverride={(e) => handleAddressChange('Current', 'line1', e.target.value)}
                                                    formData={formData} onChange={handleInputChange} required />
                                            </PendingHighlight>
                                            <PendingHighlight show={showPending} label="Current Address Line 2" liveValue={getProfileAddress('Current').addressLine2} pendingValue={getPendingAddress('Current').addressLine2}>
                                                <Field section="contact" isEditing={isEditing} label="Line 2" field="C_line2" value={getProfileAddress('Current').addressLine2}
                                                    valueOverride={getAddress('Current').addressLine2} onChangeOverride={(e) => handleAddressChange('Current', 'addressLine2', e.target.value)}
                                                    formData={formData} onChange={handleInputChange} required />
                                            </PendingHighlight>
                                            <div className="grid grid-cols-2 gap-3">
                                                <PendingHighlight show={showPending} label="Current Address City" liveValue={getProfileAddress('Current').city} pendingValue={getPendingAddress('Current').city}>
                                                    <Field section="contact" isEditing={isEditing} label="City" field="C_city" value={getProfileAddress('Current').city}
                                                        valueOverride={getAddress('Current').city} onChangeOverride={(e) => handleAddressChange('Current', 'city', e.target.value)}
                                                        formData={formData} onChange={handleInputChange} required />
                                                </PendingHighlight>
                                                <PendingHighlight show={showPending} label="Current Address State" liveValue={getProfileAddress('Current').state} pendingValue={getPendingAddress('Current').state}>
                                                    <Field section="contact" isEditing={isEditing} label="State" field="C_state" value={getProfileAddress('Current').state}
                                                        valueOverride={getAddress('Current').state} onChangeOverride={(e) => handleAddressChange('Current', 'state', e.target.value)}
                                                        formData={formData} onChange={handleInputChange} required />
                                                </PendingHighlight>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <PendingHighlight show={showPending} label="Current Address Pincode" liveValue={getProfileAddress('Current').zipCode} pendingValue={getPendingAddress('Current').zipCode}>
                                                    <Field section="contact" isEditing={isEditing} label="Pincode" field="C_zip" value={getProfileAddress('Current').zipCode}
                                                        valueOverride={getAddress('Current').zipCode} onChangeOverride={(e) => handleAddressChange('Current', 'zipCode', e.target.value)}
                                                        formData={formData} onChange={handleInputChange} required />
                                                </PendingHighlight>
                                                <PendingHighlight show={showPending} label="Current Address Country" liveValue={getProfileAddress('Current').country} pendingValue={getPendingAddress('Current').country}>
                                                    <Field section="contact" isEditing={isEditing} label="Country" field="C_country" value={getProfileAddress('Current').country}
                                                        valueOverride={getAddress('Current').country} onChangeOverride={(e) => handleAddressChange('Current', 'country', e.target.value)}
                                                        formData={formData} onChange={handleInputChange} required />
                                                </PendingHighlight>
                                            </div>
                                            <PendingHighlight show={showPending} label="Current Address Phone" liveValue={getProfileAddress('Current').phone} pendingValue={getPendingAddress('Current').phone}>
                                                <Field section="contact" isEditing={isEditing} label="Phone" field="C_phone" value={getProfileAddress('Current').phone}
                                                    valueOverride={getAddress('Current').phone}
                                                    maxLength={10}
                                                    error={getAddress('Current').phone?.length > 0 && getAddress('Current').phone?.length < 10 ? 'Must be 10 digits' : null}
                                                    onChangeOverride={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        handleAddressChange('Current', 'phone', val);
                                                    }}
                                                    formData={formData} onChange={handleInputChange} required />
                                            </PendingHighlight>
                                        </div>
                                    </div>

                                    {/* Permanent Address */}
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-sm font-bold text-slate-700">Permanent Address <span className="text-red-500">*</span></h4>
                                            {isEditing && (
                                                <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                const current = getAddress('Current');
                                                                // Batch update all fields in a single state update
                                                                setFormData(prev => {
                                                                    const currentAddresses = prev.contact?.addresses || [];
                                                                    const permIndex = currentAddresses.findIndex(a => a.type === 'Permanent');
                                                                    const permAddr = { type: 'Permanent', line1: current.line1 || current.street, addressLine2: current.addressLine2, city: current.city, state: current.state, zipCode: current.zipCode, country: current.country };
                                                                    let newAddresses = [...currentAddresses];
                                                                    if (permIndex >= 0) { newAddresses[permIndex] = permAddr; } else { newAddresses.push(permAddr); }
                                                                    return { ...prev, contact: { ...prev.contact, addresses: newAddresses }, hris: { ...prev.hris, isDeclared: false } };
                                                                });
                                                            }
                                                        }}
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span>Same as Current</span>
                                                </label>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <PendingHighlight show={showPending} label="Permanent Address Line 1" liveValue={getProfileAddress('Permanent').line1 || getProfileAddress('Permanent').street} pendingValue={getPendingAddress('Permanent').line1}>
                                                <Field section="contact" isEditing={isEditing} label="Line 1" field="P_line1" value={getProfileAddress('Permanent').line1 || getProfileAddress('Permanent').street}
                                                    valueOverride={getAddress('Permanent').line1 ?? getAddress('Permanent').street} onChangeOverride={(e) => handleAddressChange('Permanent', 'line1', e.target.value)}
                                                    formData={formData} onChange={handleInputChange} required />
                                            </PendingHighlight>
                                            <PendingHighlight show={showPending} label="Permanent Address Line 2" liveValue={getProfileAddress('Permanent').addressLine2} pendingValue={getPendingAddress('Permanent').addressLine2}>
                                                <Field section="contact" isEditing={isEditing} label="Line 2" field="P_line2" value={getProfileAddress('Permanent').addressLine2}
                                                    valueOverride={getAddress('Permanent').addressLine2} onChangeOverride={(e) => handleAddressChange('Permanent', 'addressLine2', e.target.value)}
                                                    formData={formData} onChange={handleInputChange} required />
                                            </PendingHighlight>
                                            <div className="grid grid-cols-2 gap-3">
                                                <PendingHighlight show={showPending} label="Permanent Address City" liveValue={getProfileAddress('Permanent').city} pendingValue={getPendingAddress('Permanent').city}>
                                                    <Field section="contact" isEditing={isEditing} label="City" field="P_city" value={getProfileAddress('Permanent').city}
                                                        valueOverride={getAddress('Permanent').city} onChangeOverride={(e) => handleAddressChange('Permanent', 'city', e.target.value)}
                                                        formData={formData} onChange={handleInputChange} required />
                                                </PendingHighlight>
                                                <PendingHighlight show={showPending} label="Permanent Address State" liveValue={getProfileAddress('Permanent').state} pendingValue={getPendingAddress('Permanent').state}>
                                                    <Field section="contact" isEditing={isEditing} label="State" field="P_state" value={getProfileAddress('Permanent').state}
                                                        valueOverride={getAddress('Permanent').state} onChangeOverride={(e) => handleAddressChange('Permanent', 'state', e.target.value)}
                                                        formData={formData} onChange={handleInputChange} required />
                                                </PendingHighlight>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <PendingHighlight show={showPending} label="Permanent Address Pincode" liveValue={getProfileAddress('Permanent').zipCode} pendingValue={getPendingAddress('Permanent').zipCode}>
                                                    <Field section="contact" isEditing={isEditing} label="Pincode" field="P_zip" value={getProfileAddress('Permanent').zipCode}
                                                        valueOverride={getAddress('Permanent').zipCode} onChangeOverride={(e) => handleAddressChange('Permanent', 'zipCode', e.target.value)}
                                                        formData={formData} onChange={handleInputChange} required />
                                                </PendingHighlight>
                                                <PendingHighlight show={showPending} label="Permanent Address Country" liveValue={getProfileAddress('Permanent').country} pendingValue={getPendingAddress('Permanent').country}>
                                                    <Field section="contact" isEditing={isEditing} label="Country" field="P_country" value={getProfileAddress('Permanent').country}
                                                        valueOverride={getAddress('Permanent').country} onChangeOverride={(e) => handleAddressChange('Permanent', 'country', e.target.value)}
                                                        formData={formData} onChange={handleInputChange} required />
                                                </PendingHighlight>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </SectionCard>

                {/* 3. Identity (Sensitive) */}
                <SectionCard
                    title="Identity & Legal (Sensitive)"
                    sectionName="identity"
                    icon={Shield}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    onSave={handleSave}
                    isLoading={savingSection === 'personal_all'}
                    canEdit={canEdit}
                    showActions={false}
                    isEditingOverride={isPersonalEditing}
                >
                    {(isEditing) => (
                        <div className="space-y-4">
                            <p className="text-xs text-red-500 italic">* fields are mandatory</p>
                            {isEditing && <EditDisclaimer isDirectWrite={isCurrentUserAdmin && !isSelf} />}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <PendingHighlight show={showPending} label="Aadhaar Number" liveValue={profile.identity?.aadhaarNumber} pendingValue={pend.identity?.aadhaarNumber}>
                                    <Field section="identity" isEditing={isEditing} label="Aadhaar Number" field="aadhaarNumber" value={profile.identity?.aadhaarNumber} formData={formData} onChange={handleInputChange} required />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="PAN Number" liveValue={profile.identity?.panNumber} pendingValue={pend.identity?.panNumber}>
                                    <Field section="identity" isEditing={isEditing} label="PAN Number" field="panNumber" value={profile.identity?.panNumber} formData={formData} onChange={handleInputChange} required />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Passport Number" liveValue={profile.identity?.passportNumber} pendingValue={pend.identity?.passportNumber}>
                                    <Field section="identity" isEditing={isEditing} label="Passport Number" field="passportNumber" value={profile.identity?.passportNumber} formData={formData} onChange={handleInputChange} />
                                </PendingHighlight>
                            </div>
                        </div>
                    )}
                </SectionCard>

                {/* 4. Family Information */}
                <SectionCard
                    title="Family Information"
                    sectionName="family"
                    icon={User}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    onSave={handleSave}
                    isLoading={savingSection === 'personal_all'}
                    canEdit={canEdit}
                    showActions={false}
                    isEditingOverride={isPersonalEditing}
                >
                    {(isEditing) => (
                        <div className="space-y-6">
                            <p className="text-xs text-red-500 italic">* fields are mandatory</p>
                            {isEditing && <EditDisclaimer isDirectWrite={isCurrentUserAdmin && !isSelf} />}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                <PendingHighlight show={showPending} label="Father's Name" liveValue={profile.family?.fatherName} pendingValue={pend.family?.fatherName}>
                                    <Field section="family" isEditing={isEditing} label="Father's Name" field="fatherName" value={profile.family?.fatherName} formData={formData} onChange={handleInputChange} required />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Father's Occupation" liveValue={profile.family?.fatherOccupation} pendingValue={pend.family?.fatherOccupation}>
                                    <Field section="family" isEditing={isEditing} label="Father's Occupation" field="fatherOccupation" value={profile.family?.fatherOccupation} formData={formData} onChange={handleInputChange} />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Mother's Name" liveValue={profile.family?.motherName} pendingValue={pend.family?.motherName}>
                                    <Field section="family" isEditing={isEditing} label="Mother's Name" field="motherName" value={profile.family?.motherName} formData={formData} onChange={handleInputChange} required />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Mother's Occupation" liveValue={profile.family?.motherOccupation} pendingValue={pend.family?.motherOccupation}>
                                    <Field section="family" isEditing={isEditing} label="Mother's Occupation" field="motherOccupation" value={profile.family?.motherOccupation} formData={formData} onChange={handleInputChange} />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Parents' Marital Status" liveValue={profile.family?.parentsMaritalStatus} pendingValue={pend.family?.parentsMaritalStatus}>
                                    <Field section="family" isEditing={isEditing} label="Parents' Marital Status" field="parentsMaritalStatus" value={profile.family?.parentsMaritalStatus} options={['Married', 'Divorced', 'Widowed', 'Separated']} formData={formData} onChange={handleInputChange} />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Total Siblings" liveValue={profile.family?.totalSiblings} pendingValue={pend.family?.totalSiblings}>
                                    <Field section="family" isEditing={isEditing} label="Total Siblings" field="totalSiblings" type="number" value={profile.family?.totalSiblings} formData={formData} onChange={handleInputChange} />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Spouse Name" liveValue={profile.family?.spouseName} pendingValue={pend.family?.spouseName}>
                                    <Field section="family" isEditing={isEditing} label="Spouse Name" field="spouseName" value={profile.family?.spouseName} formData={formData} onChange={handleInputChange} required={formData.personal?.maritalStatus === 'Married' || profile.personal?.maritalStatus === 'Married'} />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Spouse DOB" liveValue={profile.family?.spouseDob} pendingValue={pend.family?.spouseDob} type="date">
                                    <Field section="family" isEditing={isEditing} label="Spouse DOB" field="spouseDob" type="date" value={profile.family?.spouseDob} formData={formData} onChange={handleInputChange} />
                                </PendingHighlight>
                            </div>

                            {/* Children List */}
                            <PendingHighlight
                                show={showPending}
                                label="Children Details"
                                liveValue={(profile.family?.children || []).map(c => `${c.name} (${c.dob ? format(new Date(c.dob), 'dd MMM yyyy') : 'No DOB'})`).join(', ') || 'No Children'}
                                pendingValue={pend.family?.children === undefined ? undefined : ((pend.family?.children || []).map(c => `${c.name} (${c.dob ? format(new Date(c.dob), 'dd MMM yyyy') : 'No DOB'})`).join(', ') || 'No Children')}
                            >
                                <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-sm font-bold text-slate-700">Children Details</h4>
                                        {isEditing && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, family: { ...prev.family, children: [...(prev.family?.children || []), { name: '', dob: '' }] } }))}
                                                className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-200 hover:bg-emerald-100"
                                            >
                                                + Add Child
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        {(formData.family?.children || profile.family?.children || []).map((child, idx) => (
                                            <div key={idx} className="flex gap-4 items-end bg-white p-3 rounded border border-slate-200">
                                                <div className="flex-1">
                                                    <Field section="family" isEditing={isEditing} label="Child's Name" field={`child_${idx}_name`}
                                                        value={child.name} valueOverride={formData.family?.children?.[idx]?.name}
                                                        onChangeOverride={(e) => {
                                                            const newChildren = [...(formData.family?.children || [])];
                                                            newChildren[idx] = { ...newChildren[idx], name: e.target.value };
                                                            handleInputChange('family', 'children', newChildren);
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <Field section="family" isEditing={isEditing} label="Date of Birth" field={`child_${idx}_dob`}
                                                        value={child.dob} valueOverride={formData.family?.children?.[idx]?.dob} type="date"
                                                        onChangeOverride={(e) => {
                                                            const newChildren = [...(formData.family?.children || [])];
                                                            newChildren[idx] = { ...newChildren[idx], dob: e.target.value };
                                                            handleInputChange('family', 'children', newChildren);
                                                        }}
                                                    />
                                                </div>
                                                {isEditing && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newChildren = (formData.family?.children || []).filter((_, i) => i !== idx);
                                                            handleInputChange('family', 'children', newChildren);
                                                        }}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {(!(formData.family?.children || profile.family?.children) || (formData.family?.children || profile.family?.children || []).length === 0) && (
                                            <p className="text-xs text-slate-400 italic">No children details added.</p>
                                        )}
                                    </div>
                                </div>
                            </PendingHighlight>
                        </div>
                    )}
                </SectionCard>

                {isPersonalEditing && (
                    <div className="flex justify-end gap-3 bg-white rounded-lg shadow-sm border border-slate-200 p-4 mt-6">
                        <Button
                            variant="ghost"
                            onClick={() => setEditMode(false)}
                            disabled={savingSection === 'personal_all'}
                            className="text-slate-500 hover:text-slate-700 px-4 py-2"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePersonalSaveAll}
                            isLoading={savingSection === 'personal_all'}
                            className="px-5 py-2"
                        >
                            Save All Changes
                        </Button>
                    </div>
                )}

                {/* Bank & UAN Details (View-Only) */}
                <SectionCard
                    title="Bank & UAN Details"
                    sectionName="bank_uan_personal"
                    icon={DollarSign}
                    canEdit={canEdit}
                    showActions={canEdit}
                    isEditingOverride={false}
                    customEditAction={redirectToHRISEdit}
                >
                    {() => (
                        <div className="space-y-6 text-xs">
                            {/* UAN Settings */}
                            <div className="space-y-6">
                                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                                    <Shield size={18} className="text-blue-500" />
                                    <h3 className="font-bold text-slate-700 text-sm">UAN (Universal Account Number) Settings</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">UAN Applicable?</span>
                                        <strong className="text-slate-700 font-bold">{profile.compensation?.isUanApplicable ? 'Yes' : 'No'}</strong>
                                    </div>
                                    {profile.compensation?.isUanApplicable && (
                                        <div>
                                            <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">UAN Number</span>
                                            <strong className="text-slate-700 font-bold">{profile.compensation?.uanNumber || 'N/A'}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bank Details */}
                            <div className="space-y-6">
                                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                                    <DollarSign size={18} className="text-blue-500" />
                                    <h3 className="font-bold text-slate-700 text-sm">Bank Account Details</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
                                    <div>
                                        <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Account Number</span>
                                        <strong className="text-slate-700 font-bold">{profile.compensation?.bankDetails?.accountNumber || 'N/A'}</strong>
                                    </div>
                                    <div>
                                        <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">IFSC Code</span>
                                        <strong className="text-slate-700 font-bold">{profile.compensation?.bankDetails?.ifscCode || 'N/A'}</strong>
                                    </div>
                                    <div>
                                        <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Bank Name</span>
                                        <strong className="text-slate-700 font-bold">{profile.compensation?.bankDetails?.bankName || 'N/A'}</strong>
                                    </div>
                                    <div>
                                        <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Account Holder Name</span>
                                        <strong className="text-slate-700 font-bold">{profile.compensation?.bankDetails?.accountHolderName || 'N/A'}</strong>
                                    </div>
                                    <div className="md:col-span-2">
                                        <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Branch Address</span>
                                        <strong className="text-slate-700 font-bold">{profile.compensation?.bankDetails?.branchAddress || 'N/A'}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </SectionCard>
            </div>
        );
    };

    const getBreakupData = (useForm = false) => {
        const data = useForm ? formData : profile;
        if (!data) return null;

        const breakup = data.compensation?.salaryBreakup || {};
        const source = {
            monthlyCTC: data.compensation?.ctc || 0,
            pfEnabled: breakup.pfEnabled !== false,
            esiEnabled: breakup.esiEnabled !== false,
            ptEnabled: breakup.ptEnabled !== false,
            lwfEnabled: breakup.lwfEnabled !== false,
            gratuityEnabled: breakup.gratuityEnabled !== false,
            includePfInCTC: breakup.includePfInCTC === true,
            includeGratuityInCTC: breakup.includeGratuityInCTC !== false,
            basicPercent: breakup.basicPercent !== undefined ? Number(breakup.basicPercent) : 50,
            hraPercent: breakup.hraPercent !== undefined ? Number(breakup.hraPercent) : 50,
            insuranceAmount: data.compensation?.insuranceAmount || 0,
            employerNPS: data.compensation?.employerNPS || 0,
            employmentType: data.employment?.employmentType || 'Full Time',
            payType: data.compensation?.payType || 'fixed',
            hourlyRate: data.compensation?.hourlyRate || 0,
            useSalaryComponents: breakup.useSalaryComponents !== false
        };

        if (payrollConfig?.salaryComponents) {
            payrollConfig.salaryComponents.forEach(c => {
                if (c.linkedTo === 'fixed') {
                    const rawVal = breakup[c.id] !== undefined ? breakup[c.id] : 0;
                    source[c.id] = parseFloat(String(rawVal).replace(/[^0-9.]/g, '')) || 0;
                }
            });
        }

        return buildMasterSalaryStructure(source, payrollConfig || {});
    };

    const handleDownloadBreakup = (breakup) => {
        if (!breakup) return;
        const csvContent = [
            ["Component", "Monthly Amount", "Annual Amount"],
            ["Monthly CTC", breakup.monthlyCTC, breakup.monthlyCTC * 12],
            ["Gross Salary", breakup.totalEarnings, breakup.totalEarnings * 12],
            ["Basic Salary", breakup.basicMaster, breakup.basicMaster * 12],
            ["HRA", breakup.hraMaster, breakup.hraMaster * 12],
            ["Flexi Allowance", breakup.flexi, breakup.flexi * 12],
            ["PF Employer", breakup.pfEmployer, breakup.pfEmployer * 12],
            ["Gratuity", breakup.gratuity, breakup.gratuity * 12],
            ["Insurance", breakup.insurance, breakup.insurance * 12],
            ["Net Take-Home", breakup.netTakeHome, breakup.netTakeHome * 12]
        ]
            .map(e => e.map(val => typeof val === 'string' ? `"${val}"` : val).join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${profile?.personal?.fullName || 'Employee'}_Salary_Breakup.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const openAddRevisionModal = () => {
        const comp = profile.compensation || {};
        const breakup = comp.salaryBreakup || {};
        
        const getBreakupField = (key, def) => {
            if (breakup instanceof Map) {
                return breakup.get(key) !== undefined ? breakup.get(key) : def;
            }
            return breakup[key] !== undefined ? breakup[key] : def;
        };

        const currentMonthly = comp.ctc || 0;

        const draft = {
            role: '',
            employmentType: profile.employment?.employmentType === 'Full Time' ? 'full-time' : 'contract',
            newAnnualCTC: currentMonthly * 12,
            newCTC: currentMonthly,
            effectiveDate: format(new Date(), 'yyyy-MM-dd'),
            reason: '',
            pfEnabled: getBreakupField('pfEnabled', true),
            esiEnabled: getBreakupField('esiEnabled', true),
            ptEnabled: getBreakupField('ptEnabled', true),
            ptState: getBreakupField('ptState', 'MH'),
            lwfEnabled: getBreakupField('lwfEnabled', true),
            gratuityEnabled: getBreakupField('gratuityEnabled', true),
            useSalaryComponents: getBreakupField('useSalaryComponents', true),
            includePfInCTC: getBreakupField('includePfInCTC', false),
            includeGratuityInCTC: getBreakupField('includeGratuityInCTC', true),
            basicPercent: getBreakupField('basicPercent', null),
            hraPercent: getBreakupField('hraPercent', null),
            salaryStructure: {
                basic: getBreakupField('basic', ''),
                hra: getBreakupField('hra', ''),
                specialAllowance: getBreakupField('specialAllowance', ''),
                conveyance: getBreakupField('conveyance', 0),
                medicalAllowance: getBreakupField('medicalAllowance', 0),
                otherAllowances: getBreakupField('otherAllowances', [])
            },
            flexiAmount: getBreakupField('flexiAmount', 0),
            broadband: getBreakupField('broadband', 0),
            petrol: getBreakupField('petrol', 0),
            lta: getBreakupField('lta', 0),
            insuranceAmount: comp.insuranceAmount || 0,
            employerNPS: comp.employerNPS || 0,
            deductions: {
                professionalTax: getBreakupField('professionalTax', 0),
                tds: getBreakupField('tds', 0),
                otherDeductions: getBreakupField('otherDeductions', [])
            },
            joiningBonus: 0
        };

        setRevisionDraft(draft);
        setShowRevisionModal(true);
        calculateDraftSalary(draft);
    };

    const calculateDraftSalary = async (draftObj) => {
        const merged = draftObj || revisionDraft;
        if (!merged) return;

        const monthlyCTC = Number(merged.newCTC) || 0;
        if (!monthlyCTC) return;

        try {
            setCalculating(true);
            const res = await api.post('/payroll/calculate-salary', {
                monthlyCTC,
                employmentType: merged.employmentType,
                basicPercent: merged.basicPercent === null || merged.basicPercent === '' ? null : Number(merged.basicPercent),
                hraPercent: merged.hraPercent === null || merged.hraPercent === '' ? null : Number(merged.hraPercent),
                basic: Number(merged.salaryStructure?.basic) || undefined,
                hra: Number(merged.salaryStructure?.hra) || undefined,
                specialAllowance: Number(merged.salaryStructure?.specialAllowance) || undefined,
                useSalaryComponents: merged.useSalaryComponents !== false,
                flexiAmount: Number(merged.flexiAmount) || 0,
                broadband: Number(merged.broadband) || 0,
                petrol: Number(merged.petrol) || 0,
                lta: Number(merged.lta) || 0,
                insuranceAmount: Number(merged.insuranceAmount) || 0,
                employerNPS: Number(merged.employerNPS) || 0,
                ptState: merged.ptState || '',
                professionalTax: merged.ptState === 'custom' ? (Number(merged.deductions?.professionalTax) || 0) : 0,
                tds: Number(merged.deductions?.tds) || 0,
                otherDeductions: (merged.deductions?.otherDeductions || []).map((d) => ({
                    name: d.name,
                    amount: Number(d.amount) || 0,
                })),
                conveyance: Number(merged.salaryStructure?.conveyance) || 0,
                medicalAllowance: Number(merged.salaryStructure?.medicalAllowance) || 0,
                otherAllowances: (merged.salaryStructure?.otherAllowances || []).map((allowance) => ({
                    name: allowance.name,
                    amount: Number(allowance.amount) || 0,
                })),
                pfEnabled: merged.pfEnabled !== false,
                esiEnabled: merged.esiEnabled !== false,
                ptEnabled: merged.ptEnabled !== false,
                lwfEnabled: merged.lwfEnabled !== false,
                gratuityEnabled: merged.gratuityEnabled !== false,
                includePfInCTC: merged.includePfInCTC === true,
                includeGratuityInCTC: merged.includeGratuityInCTC !== false,
            });
            
            const master = res.data.master;
            setDraftSalaryPreview(master);
        } catch (error) {
            console.error('Calculation error:', error);
        } finally {
            setCalculating(false);
        }
    };

    const handleDraftChange = (path, value) => {
        setRevisionDraft(prev => {
            const copy = JSON.parse(JSON.stringify(prev || {}));
            
            if (path.includes('.')) {
                const parts = path.split('.');
                let current = copy;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!current[parts[i]]) current[parts[i]] = {};
                    current = current[parts[i]];
                }
                current[parts[parts.length - 1]] = value;
            } else {
                copy[path] = value;
            }
            
            if (path === 'newCTC') {
                copy.newAnnualCTC = value === '' ? '' : Math.round(value * 12 * 100) / 100;
            } else if (path === 'newAnnualCTC') {
                copy.newCTC = value === '' ? '' : Math.round((value / 12) * 100) / 100;
            }

            setTimeout(() => {
                calculateDraftSalary(copy);
            }, 0);

            return copy;
        });
    };

    const getComparisonRows = () => {
        const current = getBreakupData() || {};
        const revised = draftSalaryPreview || {};

        return [
            { name: 'Total Monthly CTC', current: current.monthlyCTC || 0, revised: revised.monthlyCTC || 0, isHeader: true },
            { name: 'Basic Salary', current: current.basicMaster || 0, revised: revised.basicMaster || 0 },
            { name: 'HRA', current: current.hraMaster || 0, revised: revised.hraMaster || 0 },
            { name: 'Flexi Allowance', current: current.flexi || 0, revised: revised.flexi || 0 },
            { name: 'Gross Earnings (Total)', current: current.totalEarnings || current.grossSalary || 0, revised: revised.totalEarnings || revised.grossSalary || 0, isHeader: true },
            { name: 'Est. Net Take-Home Pay', current: current.netTakeHome || 0, revised: revised.netTakeHome || 0, isHeader: true }
        ];
    };

    const handleRevisionSubmit = async () => {
        if (!revisionDraft.effectiveDate || !revisionDraft.newCTC) {
            toast.error('Please enter effective date and new CTC');
            return;
        }

        const newRevision = {
            effectiveDate: new Date(revisionDraft.effectiveDate),
            previousCTC: profile.compensation?.ctc || 0,
            newCTC: Number(revisionDraft.newCTC) || 0,
            reason: revisionDraft.reason || 'Salary Revised',
        };

        const salaryBreakupUpdates = {
            pfEnabled: revisionDraft.pfEnabled !== false,
            esiEnabled: revisionDraft.esiEnabled !== false,
            ptEnabled: revisionDraft.ptEnabled !== false,
            ptState: revisionDraft.ptState || '',
            professionalTax: revisionDraft.ptState === 'custom' ? (Number(revisionDraft.deductions?.professionalTax) || 0) : 0,
            lwfEnabled: revisionDraft.lwfEnabled !== false,
            gratuityEnabled: revisionDraft.gratuityEnabled !== false,
            useSalaryComponents: revisionDraft.useSalaryComponents !== false,
            includePfInCTC: revisionDraft.includePfInCTC === true,
            includeGratuityInCTC: revisionDraft.includeGratuityInCTC !== false,
            basicPercent: revisionDraft.basicPercent === null || revisionDraft.basicPercent === '' ? undefined : Number(revisionDraft.basicPercent),
            hraPercent: revisionDraft.hraPercent === null || revisionDraft.hraPercent === '' ? undefined : Number(revisionDraft.hraPercent),
            
            flexiAmount: Number(revisionDraft.flexiAmount) || 0,
            broadband: Number(revisionDraft.broadband) || 0,
            petrol: Number(revisionDraft.petrol) || 0,
            lta: Number(revisionDraft.lta) || 0,
            otherAllowances: revisionDraft.salaryStructure?.otherAllowances || [],
            otherDeductions: revisionDraft.deductions?.otherDeductions || []
        };

        const existingRevisions = profile.compensation?.salaryRevisions || [];
        const updatedRevisions = [...existingRevisions, newRevision].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));

        try {
            const updates = {
                ...profile.compensation,
                ctc: newRevision.newCTC,
                insuranceAmount: Number(revisionDraft.insuranceAmount) || 0,
                employerNPS: Number(revisionDraft.employerNPS) || 0,
                salaryBreakup: {
                    ...(profile.compensation?.salaryBreakup || {}),
                    ...salaryBreakupUpdates
                },
                salaryRevisions: updatedRevisions
            };

            await api.patch(`/dossier/${userId}/compensation`, updates);
            toast.success('Salary revision saved successfully');
            setShowRevisionModal(false);
            fetchDossier();
        } catch (err) {
            console.error('Error saving salary revision:', err);
            toast.error('Failed to save salary revision');
        }
    };

    const handleDeleteRevision = async (revId) => {
        if (!window.confirm('Are you sure you want to delete this salary revision?')) return;

        const existingRevisions = profile.compensation?.salaryRevisions || [];
        const updatedRevisions = existingRevisions.filter(r => String(r._id) !== String(revId));

        let newCTC = profile.compensation?.ctc;
        if (updatedRevisions.length > 0) {
            const sorted = [...updatedRevisions].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));
            newCTC = sorted[sorted.length - 1].newCTC;
        }

        try {
            const updates = {
                ...profile.compensation,
                ctc: newCTC,
                salaryRevisions: updatedRevisions
            };

            await api.patch(`/dossier/${userId}/compensation`, updates);
            toast.success('Salary revision deleted successfully');
            fetchDossier();
        } catch (err) {
            console.error('Error deleting salary revision:', err);
            toast.error('Failed to delete salary revision');
        }
    };

    const handleAddPayrollSubmit = async () => {
        if (!payPeriod || !payNetSalary) {
            toast.error('Please enter period and net salary');
            return;
        }

        const newPayroll = {
            period: payPeriod,
            netSalary: parseFloat(payNetSalary) || 0,
            status: payStatus,
            payslipUrl: ''
        };

        const existingPayroll = profile.compensation?.payrollHistory || [];
        const updatedPayroll = [...existingPayroll, newPayroll].sort((a, b) => b.period.localeCompare(a.period));

        try {
            const updates = {
                ...profile.compensation,
                payrollHistory: updatedPayroll
            };

            await api.patch(`/dossier/${userId}/compensation`, updates);
            toast.success('Payroll history record added successfully');
            setShowPayrollModal(false);
            fetchDossier();
        } catch (err) {
            console.error('Error saving payroll history:', err);
            toast.error('Failed to add payroll history record');
        }
    };

    const handleDeletePayroll = async (payId) => {
        if (!window.confirm('Are you sure you want to delete this payroll record?')) return;

        const existingPayroll = profile.compensation?.payrollHistory || [];
        const updatedPayroll = existingPayroll.filter(p => String(p._id) !== String(payId));

        try {
            const updates = {
                ...profile.compensation,
                payrollHistory: updatedPayroll
            };

            await api.patch(`/dossier/${userId}/compensation`, updates);
            toast.success('Payroll record deleted successfully');
            fetchDossier();
        } catch (err) {
            console.error('Error deleting payroll record:', err);
            toast.error('Failed to delete payroll record');
        }
    };

    const getPayslipComponents = (payrollItem) => {
        if (!profile || !payrollItem) return null;
        
        const activeBreakup = getBreakupData();
        if (!activeBreakup) return null;

        const activeNet = activeBreakup.netTakeHome || 1;
        const scale = payrollItem.netSalary / activeNet;

        return {
            basic: Math.round(activeBreakup.basicMaster * scale),
            hra: Math.round(activeBreakup.hraMaster * scale),
            flexi: Math.round(activeBreakup.flexi * scale),
            pfEmployee: Math.round(activeBreakup.pfEmployee * scale),
            esiEmployee: Math.round(activeBreakup.esiEmployee * scale),
            pt: Math.round(activeBreakup.professionalTax * scale),
            tds: Math.round(activeBreakup.tds * scale),
            gross: Math.round(activeBreakup.totalEarnings * scale),
            deductions: Math.round(activeBreakup.totalDeductions * scale),
            net: payrollItem.netSalary
        };
    };

    const numberToWords = (num) => {
        const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
        const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        if ((num = num.toString()).length > 9) return 'overflow';
        let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return '';
        let str = '';
        str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
        str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
        str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
        str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
        str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only' : 'Only';
        return str;
    };

    const renderCTCSnapshot = (breakup) => {
        if (!breakup) return null;
        
        return (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2">
                        <TrendingUp size={20} className="text-blue-500" />
                        <h3 className="font-bold text-slate-800 text-lg">CTC Snapshot</h3>
                    </div>
                    <button 
                        onClick={() => handleDownloadBreakup(breakup)}
                        className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 flex items-center text-xs py-1.5 px-3 rounded shadow-sm transition-colors"
                    >
                        <Download size={14} className="mr-1.5" /> Download Breakup
                    </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Monthly CTC</span>
                        <div className="text-2xl font-bold text-slate-800 mt-1">{fmtMoney(breakup.monthlyCTC)}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Gross Salary</span>
                        <div className="text-2xl font-bold text-slate-800 mt-1">{fmtMoney(breakup.totalEarnings)}</div>
                    </div>
                </div>

                <div className="space-y-3.5 pt-2">
                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-100 pb-2">
                        <span>Basic Salary</span>
                        <span className="font-semibold text-slate-800">{fmtMoney(breakup.basicMaster)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-100 pb-2">
                        <span>HRA</span>
                        <span className="font-semibold text-slate-800">{fmtMoney(breakup.hraMaster)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-100 pb-2">
                        <span>Flexi Allowance</span>
                        <span className="font-semibold text-slate-800">{fmtMoney(breakup.flexi)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-100 pb-2">
                        <span>PF Employer</span>
                        <span className="font-semibold text-slate-800">{fmtMoney(breakup.pfEmployer)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-100 pb-2">
                        <span>Gratuity</span>
                        <span className="font-semibold text-slate-800">{fmtMoney(breakup.gratuity)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-100 pb-2">
                        <span>Insurance</span>
                        <span className="font-semibold text-slate-800">{fmtMoney(breakup.insurance)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-slate-800 bg-blue-50 px-4 py-3 rounded-lg border border-blue-100/50 mt-4">
                        <span className="flex items-center"><Info size={16} className="text-blue-500 mr-2" /> Net Take-Home</span>
                        <span className="text-blue-600">{fmtMoney(breakup.netTakeHome)}</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderPayslipModal = () => {
        if (!viewingPayslip) return null;
        const comps = getPayslipComponents(viewingPayslip);
        if (!comps) return null;

        return (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto print:bg-white print:p-0">
                <style type="text/css" media="print">
                    {`
                    @media print {
                        body * {
                            visibility: hidden !important;
                        }
                        #payslip-print-area, #payslip-print-area * {
                            visibility: visible !important;
                        }
                        #payslip-print-area {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            background: white !important;
                        }
                    }
                    `}
                </style>
                <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 print:shadow-none print:border-none print:my-0">
                    {/* Header */}
                    <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center print:hidden">
                        <div className="flex items-center space-x-2">
                            <FileText className="text-blue-600" size={20} />
                            <h3 className="font-bold text-slate-800">Payslip Statement — {viewingPayslip.period}</h3>
                        </div>
                        <button onClick={() => setViewingPayslip(null)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Payslip Content (Printable) */}
                    <div className="p-8 space-y-6 print:p-0 print:m-0" id="payslip-print-area">
                        {/* Company Logo & Header */}
                        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">TALENTCIO SERVICES PVT LTD</h2>
                                <p className="text-xs text-slate-500 mt-1">102, Hitech City, Hyderabad, TS, 500081</p>
                            </div>
                            <div className="text-right">
                                <span className="bg-blue-100 text-blue-800 font-bold text-xs uppercase px-2.5 py-1 rounded-full print:border print:border-blue-800">
                                    Payslip Statement
                                </span>
                                <p className="text-xs text-slate-500 mt-2">Pay Period: <strong className="text-slate-700">{viewingPayslip.period}</strong></p>
                            </div>
                        </div>

                        {/* Employee Details Grid */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs border-b border-slate-200 pb-4">
                            <div>
                                <span className="text-slate-400">Employee Name:</span> <strong className="text-slate-700 ml-1">{profile?.personal?.fullName || (profile?.user ? `${profile.user.firstName} ${profile.user.lastName}` : 'N/A')}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400">Employee Code:</span> <strong className="text-slate-700 ml-1">{profile?.user?.employeeCode || 'N/A'}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400">Department:</span> <strong className="text-slate-700 ml-1">{profile?.employment?.department || profile?.user?.department || 'N/A'}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400">Designation:</span> <strong className="text-slate-700 ml-1">{profile?.employment?.designation || 'N/A'}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400">UAN:</span> <strong className="text-slate-700 ml-1">{profile?.compensation?.uanNumber || 'N/A'}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400">Bank Account No:</span> <strong className="text-slate-700 ml-1">{"XXXX" + (profile?.compensation?.bankDetails?.accountNumber || "").slice(-4)}</strong>
                            </div>
                        </div>

                        {/* Earnings & Deductions Tables */}
                        <div className="grid grid-cols-2 gap-8 text-xs">
                            {/* Earnings Column */}
                            <div className="space-y-2 border-r border-slate-200 pr-4 print:border-slate-300">
                                <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1 uppercase tracking-wider text-[10px]">Earnings</h4>
                                <div className="flex justify-between">
                                    <span>Basic Salary</span>
                                    <strong className="text-slate-700">{fmtMoney(comps.basic)}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>House Rent Allowance (HRA)</span>
                                    <strong className="text-slate-700">{fmtMoney(comps.hra)}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>Flexi Allowance</span>
                                    <strong className="text-slate-700">{fmtMoney(comps.flexi)}</strong>
                                </div>
                                <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-800">
                                    <span>Gross Earnings</span>
                                    <span>{fmtMoney(comps.gross)}</span>
                                </div>
                            </div>

                            {/* Deductions Column */}
                            <div className="space-y-2 pl-4">
                                <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1 uppercase tracking-wider text-[10px]">Deductions</h4>
                                <div className="flex justify-between">
                                    <span>Employee PF Contribution</span>
                                    <strong className="text-slate-700">{fmtMoney(comps.pfEmployee)}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>ESI Contribution</span>
                                    <strong className="text-slate-700">{fmtMoney(comps.esiEmployee)}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>Professional Tax (PT)</span>
                                    <strong className="text-slate-700">{fmtMoney(comps.pt)}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>TDS (Income Tax)</span>
                                    <strong className="text-slate-700">{fmtMoney(comps.tds)}</strong>
                                </div>
                                <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-800">
                                    <span>Total Deductions</span>
                                    <span>{fmtMoney(comps.deductions)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Net Salary Summary */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex justify-between items-center mt-6 print:border-slate-800">
                            <div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Net Take-Home (Net Salary)</span>
                                <h3 className="text-lg font-bold text-blue-700 mt-1">{fmtMoney(comps.net)}</h3>
                            </div>
                            <div className="text-right max-w-xs">
                                <span className="text-[9px] text-slate-400 uppercase tracking-wider">Amount in Words</span>
                                <p className="text-[10px] font-semibold text-slate-600 mt-1 italic leading-relaxed capitalize">{numberToWords(comps.net)}</p>
                            </div>
                        </div>

                        {/* Footer Signature Note */}
                        <div className="flex justify-between items-end pt-8 text-[9px] text-slate-400">
                            <div>
                                <p>Note: This is a computer generated payslip statement and does not require a physical signature.</p>
                            </div>
                            <div className="text-center w-32 border-t border-slate-300 pt-1">
                                <span className="text-slate-500 font-semibold uppercase">Authorized Signatory</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end space-x-3 print:hidden">
                        <Button variant="ghost" onClick={() => setViewingPayslip(null)}>
                            Close
                        </Button>
                        <Button 
                            onClick={() => window.print()}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center"
                        >
                            <Download size={16} className="mr-2" /> Print / Save PDF
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderSalary = () => {
        const pend = pendingUpdates || {};
        const showPending = !!(canApprove && !isSelf && !editMode && pendingUpdates);
        const breakup = getBreakupData(editMode);
        
        const salaryRevisions = profile.compensation?.salaryRevisions || [];
        const payrollHistory = profile.compensation?.payrollHistory || [];
        const isCurrentUserAdmin = currentUser?.roles?.some(r => {
            const roleName = typeof r === 'string' ? r : r?.name;
            return ['Admin', 'System Admin', 'Super Admin'].includes(roleName);
        }) || currentUser?.hasAllPermissions || currentUser?.permissions?.includes('payroll.salary.manage');
        
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: CTC Snapshot */}
                    <div className="lg:col-span-1">
                        {renderCTCSnapshot(breakup)}
                    </div>

                    {/* Right Column: Salary & Statutory Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <SectionCard
                            title="Salary & Statutory Details"
                            sectionName="compensation"
                            icon={DollarSign}
                            editMode={editMode}
                            setEditMode={setEditMode}
                            onSave={handleSave}
                            isLoading={savingSection === 'compensation'}
                            canEdit={canEdit}
                            showActions={canEdit}
                        >
                            {(isEditing) => {
                                const isCompEditing = isEditing && isCurrentUserAdmin;
                                return (
                                    <div className="space-y-6">
                                        {/* Statutory Overrides */}
                                        <div className="space-y-6">
                                            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                                                <Settings size={18} className="text-blue-500" />
                                                <h3 className="font-bold text-slate-700">Statutory & Ratio Configurations</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <PendingHighlight show={showPending} label="PF Enabled" liveValue={profile.compensation?.salaryBreakup?.pfEnabled !== false ? 'Yes' : 'No'} pendingValue={pend.compensation?.salaryBreakup?.pfEnabled === undefined ? undefined : (pend.compensation?.salaryBreakup?.pfEnabled !== false ? 'Yes' : 'No')}>
                                                    <Field
                                                        section="compensation" isEditing={isCompEditing} label="PF Enabled" field="pfEnabled"
                                                        value={profile.compensation?.salaryBreakup?.pfEnabled !== false ? 'Yes' : 'No'}
                                                        valueOverride={formData.compensation?.salaryBreakup?.pfEnabled !== false ? 'Yes' : 'No'}
                                                        options={['No', 'Yes']}
                                                        onChangeOverride={(e) => handleBreakupChange('pfEnabled', e.target.value === 'Yes')}
                                                    />
                                                </PendingHighlight>
                                                <PendingHighlight show={showPending} label="Include PF in CTC" liveValue={profile.compensation?.salaryBreakup?.includePfInCTC ? 'Yes' : 'No'} pendingValue={pend.compensation?.salaryBreakup?.includePfInCTC === undefined ? undefined : (pend.compensation?.salaryBreakup?.includePfInCTC ? 'Yes' : 'No')}>
                                                    <Field
                                                        section="compensation" isEditing={isCompEditing} label="Include PF in CTC" field="includePfInCTC"
                                                        value={profile.compensation?.salaryBreakup?.includePfInCTC ? 'Yes' : 'No'}
                                                        valueOverride={formData.compensation?.salaryBreakup?.includePfInCTC ? 'Yes' : 'No'}
                                                        options={['No', 'Yes']}
                                                        onChangeOverride={(e) => handleBreakupChange('includePfInCTC', e.target.value === 'Yes')}
                                                    />
                                                </PendingHighlight>
                                                <PendingHighlight show={showPending} label="ESI Enabled" liveValue={profile.compensation?.salaryBreakup?.esiEnabled !== false ? 'Yes' : 'No'} pendingValue={pend.compensation?.salaryBreakup?.esiEnabled === undefined ? undefined : (pend.compensation?.salaryBreakup?.esiEnabled !== false ? 'Yes' : 'No')}>
                                                    <Field
                                                        section="compensation" isEditing={isCompEditing} label="ESI Enabled" field="esiEnabled"
                                                        value={profile.compensation?.salaryBreakup?.esiEnabled !== false ? 'Yes' : 'No'}
                                                        valueOverride={formData.compensation?.salaryBreakup?.esiEnabled !== false ? 'Yes' : 'No'}
                                                        options={['No', 'Yes']}
                                                        onChangeOverride={(e) => handleBreakupChange('esiEnabled', e.target.value === 'Yes')}
                                                    />
                                                </PendingHighlight>
                                                <PendingHighlight show={showPending} label="PT Enabled" liveValue={profile.compensation?.salaryBreakup?.ptEnabled !== false ? 'Yes' : 'No'} pendingValue={pend.compensation?.salaryBreakup?.ptEnabled === undefined ? undefined : (pend.compensation?.salaryBreakup?.ptEnabled !== false ? 'Yes' : 'No')}>
                                                    <Field
                                                        section="compensation" isEditing={isCompEditing} label="PT Enabled" field="ptEnabled"
                                                        value={profile.compensation?.salaryBreakup?.ptEnabled !== false ? 'Yes' : 'No'}
                                                        valueOverride={formData.compensation?.salaryBreakup?.ptEnabled !== false ? 'Yes' : 'No'}
                                                        options={['No', 'Yes']}
                                                        onChangeOverride={(e) => handleBreakupChange('ptEnabled', e.target.value === 'Yes')}
                                                    />
                                                </PendingHighlight>
                                                <PendingHighlight show={showPending} label="LWF Enabled" liveValue={profile.compensation?.salaryBreakup?.lwfEnabled !== false ? 'Yes' : 'No'} pendingValue={pend.compensation?.salaryBreakup?.lwfEnabled === undefined ? undefined : (pend.compensation?.salaryBreakup?.lwfEnabled !== false ? 'Yes' : 'No')}>
                                                    <Field
                                                        section="compensation" isEditing={isCompEditing} label="LWF Enabled" field="lwfEnabled"
                                                        value={profile.compensation?.salaryBreakup?.lwfEnabled !== false ? 'Yes' : 'No'}
                                                        valueOverride={formData.compensation?.salaryBreakup?.lwfEnabled !== false ? 'Yes' : 'No'}
                                                        options={['No', 'Yes']}
                                                        onChangeOverride={(e) => handleBreakupChange('lwfEnabled', e.target.value === 'Yes')}
                                                    />
                                                </PendingHighlight>
                                                <PendingHighlight show={showPending} label="Gratuity Enabled" liveValue={profile.compensation?.salaryBreakup?.gratuityEnabled !== false ? 'Yes' : 'No'} pendingValue={pend.compensation?.salaryBreakup?.gratuityEnabled === undefined ? undefined : (pend.compensation?.salaryBreakup?.gratuityEnabled !== false ? 'Yes' : 'No')}>
                                                    <Field
                                                        section="compensation" isEditing={isCompEditing} label="Gratuity Enabled" field="gratuityEnabled"
                                                        value={profile.compensation?.salaryBreakup?.gratuityEnabled !== false ? 'Yes' : 'No'}
                                                        valueOverride={formData.compensation?.salaryBreakup?.gratuityEnabled !== false ? 'Yes' : 'No'}
                                                        options={['No', 'Yes']}
                                                        onChangeOverride={(e) => handleBreakupChange('gratuityEnabled', e.target.value === 'Yes')}
                                                    />
                                                </PendingHighlight>
                                                <PendingHighlight show={showPending} label="Include Gratuity in CTC" liveValue={profile.compensation?.salaryBreakup?.includeGratuityInCTC !== false ? 'Yes' : 'No'} pendingValue={pend.compensation?.salaryBreakup?.includeGratuityInCTC === undefined ? undefined : (pend.compensation?.salaryBreakup?.includeGratuityInCTC !== false ? 'Yes' : 'No')}>
                                                    <Field
                                                        section="compensation" isEditing={isCompEditing} label="Include Gratuity in CTC" field="includeGratuityInCTC"
                                                        value={profile.compensation?.salaryBreakup?.includeGratuityInCTC !== false ? 'Yes' : 'No'}
                                                        valueOverride={formData.compensation?.salaryBreakup?.includeGratuityInCTC !== false ? 'Yes' : 'No'}
                                                        options={['No', 'Yes']}
                                                        onChangeOverride={(e) => handleBreakupChange('includeGratuityInCTC', e.target.value === 'Yes')}
                                                    />
                                                </PendingHighlight>
                                                <PendingHighlight show={showPending} label="Basic Override %" liveValue={profile.compensation?.salaryBreakup?.basicPercent !== undefined ? `${profile.compensation.salaryBreakup.basicPercent}%` : '50%'} pendingValue={pend.compensation?.salaryBreakup?.basicPercent === undefined ? undefined : `${pend.compensation.salaryBreakup.basicPercent}%`}>
                                                    <Field
                                                        section="compensation" isEditing={isCompEditing} label="Basic Salary Override (%)" field="basicPercent"
                                                        value={profile.compensation?.salaryBreakup?.basicPercent !== undefined ? String(profile.compensation.salaryBreakup.basicPercent) : '50'}
                                                        valueOverride={formData.compensation?.salaryBreakup?.basicPercent !== undefined ? String(formData.compensation.salaryBreakup.basicPercent) : '50'}
                                                        onChangeOverride={(e) => handleBreakupChange('basicPercent', e.target.value)}
                                                    />
                                                </PendingHighlight>
                                                <PendingHighlight show={showPending} label="HRA Override %" liveValue={profile.compensation?.salaryBreakup?.hraPercent !== undefined ? `${profile.compensation.salaryBreakup.hraPercent}%` : '50%'} pendingValue={pend.compensation?.salaryBreakup?.hraPercent === undefined ? undefined : `${pend.compensation.salaryBreakup.hraPercent}%`}>
                                                    <Field
                                                        section="compensation" isEditing={isCompEditing} label="HRA Override (% of Basic)" field="hraPercent"
                                                        value={profile.compensation?.salaryBreakup?.hraPercent !== undefined ? String(profile.compensation.salaryBreakup.hraPercent) : '50'}
                                                        valueOverride={formData.compensation?.salaryBreakup?.hraPercent !== undefined ? String(formData.compensation.salaryBreakup.hraPercent) : '50'}
                                                        onChangeOverride={(e) => handleBreakupChange('hraPercent', e.target.value)}
                                                    />
                                                </PendingHighlight>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }}
                        </SectionCard>

                        {/* Bank & UAN Details Card - View Only */}
                        <SectionCard
                            title="Bank & UAN Details"
                            sectionName="compensation_bank_uan"
                            icon={DollarSign}
                            canEdit={false}
                            showActions={false}
                        >
                            {() => (
                                <div className="space-y-6 text-xs">
                                    {/* UAN Settings */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                                            <Shield size={18} className="text-blue-500" />
                                            <h3 className="font-bold text-slate-700">UAN (Universal Account Number) Settings</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">UAN Applicable?</span>
                                                <strong className="text-slate-700 font-bold">{profile.compensation?.isUanApplicable ? 'Yes' : 'No'}</strong>
                                            </div>
                                            {profile.compensation?.isUanApplicable && (
                                                <div>
                                                    <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">UAN Number</span>
                                                    <strong className="text-slate-700 font-bold">{profile.compensation?.uanNumber || 'N/A'}</strong>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bank Details */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                                            <DollarSign size={18} className="text-blue-500" />
                                            <h3 className="font-bold text-slate-700">Bank Account Details</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
                                            <div>
                                                <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Account Number</span>
                                                <strong className="text-slate-700 font-bold">{profile.compensation?.bankDetails?.accountNumber || 'N/A'}</strong>
                                            </div>
                                            <div>
                                                <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">IFSC Code</span>
                                                <strong className="text-slate-700 font-bold">{profile.compensation?.bankDetails?.ifscCode || 'N/A'}</strong>
                                            </div>
                                            <div>
                                                <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Bank Name</span>
                                                <strong className="text-slate-700 font-bold">{profile.compensation?.bankDetails?.bankName || 'N/A'}</strong>
                                            </div>
                                            <div>
                                                <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Account Holder Name</span>
                                                <strong className="text-slate-700 font-bold">{profile.compensation?.bankDetails?.accountHolderName || 'N/A'}</strong>
                                            </div>
                                            <div className="md:col-span-2">
                                                <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Branch Address</span>
                                                <strong className="text-slate-700 font-bold">{profile.compensation?.bankDetails?.branchAddress || 'N/A'}</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </SectionCard>
                    </div>
                </div>

                {/* Salary Revision History Card */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <div className="flex items-center space-x-2">
                            <History size={20} className="text-blue-500" />
                            <h3 className="font-bold text-slate-800 text-lg">Salary Revision History</h3>
                        </div>
                        {isCurrentUserAdmin && (
                            <button 
                                onClick={openAddRevisionModal}
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-xs py-1.5 px-3 rounded flex items-center font-semibold transition-colors"
                            >
                                + Add Revision
                            </button>
                        )}
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-semibold bg-slate-50/50">
                                    <th className="py-3 px-4">Effective Date</th>
                                    <th className="py-3 px-4">Previous CTC</th>
                                    <th className="py-3 px-4">New CTC</th>
                                    <th className="py-3 px-4">Reason</th>
                                    {isCurrentUserAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {salaryRevisions.length > 0 ? (
                                    salaryRevisions.map((rev, idx) => (
                                        <tr key={rev._id || idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3.5 px-4 font-medium text-slate-800">
                                                {rev.effectiveDate ? format(new Date(rev.effectiveDate), 'dd MMM yyyy') : 'N/A'}
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600 font-semibold">{fmtMoney(rev.previousCTC)}</td>
                                            <td className="py-3.5 px-4 text-blue-600 font-bold">{fmtMoney(rev.newCTC)}</td>
                                            <td className="py-3.5 px-4 text-slate-500 italic max-w-xs truncate" title={rev.reason}>
                                                {rev.reason || 'No reason specified'}
                                            </td>
                                            {isCurrentUserAdmin && (
                                                <td className="py-3.5 px-4 text-right">
                                                    <button 
                                                        onClick={() => handleDeleteRevision(rev._id)}
                                                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={isCurrentUserAdmin ? 5 : 4} className="py-8 text-center text-slate-400 italic">
                                            No salary revisions recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Payroll History Card */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <div className="flex items-center space-x-2">
                            <Calendar size={20} className="text-blue-500" />
                            <h3 className="font-bold text-slate-800 text-lg">Payroll History</h3>
                        </div>
                        {isCurrentUserAdmin && (
                            <button 
                                onClick={() => {
                                    setPayPeriod('');
                                    setPayNetSalary('');
                                    setPayStatus('Paid');
                                    setShowPayrollModal(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-xs py-1.5 px-3 rounded flex items-center font-semibold transition-colors"
                            >
                                + Add Payroll Record
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-semibold bg-slate-50/50">
                                    <th className="py-3 px-4">Period</th>
                                    <th className="py-3 px-4">Net Salary</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Payslip</th>
                                    {isCurrentUserAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {payrollHistory.length > 0 ? (
                                    payrollHistory.map((pay, idx) => (
                                        <tr key={pay._id || idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3.5 px-4 font-bold text-slate-800">{pay.period}</td>
                                            <td className="py-3.5 px-4 font-bold text-emerald-600">{fmtMoney(pay.netSalary)}</td>
                                            <td className="py-3.5 px-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    pay.status === 'Paid' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                    pay.status === 'Processing' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                    pay.status === 'Approved' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                    'bg-slate-50 text-slate-700 border border-slate-200'
                                                }`}>
                                                    {pay.status || 'Paid'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <button 
                                                    onClick={() => setViewingPayslip(pay)}
                                                    className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 hover:text-blue-700 px-3 py-1 rounded flex items-center font-semibold text-[11px] shadow-sm transition-colors"
                                                >
                                                    <Download size={12} className="mr-1" /> View Payslip
                                                </button>
                                            </td>
                                            {isCurrentUserAdmin && (
                                                <td className="py-3.5 px-4 text-right">
                                                    <button 
                                                        onClick={() => handleDeletePayroll(pay._id)}
                                                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={isCurrentUserAdmin ? 5 : 4} className="py-8 text-center text-slate-400 italic">
                                            No payroll records yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODALS */}
                {/* 1. Add Salary Revision Modal */}
                {showRevisionModal && revisionDraft && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 text-xs">
                            {/* Sticky Header */}
                            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
                                <div className="flex items-center space-x-2">
                                    <History className="text-blue-600" size={20} />
                                    <h3 className="font-bold text-slate-800 text-lg">Revise Salary</h3>
                                </div>
                                <button onClick={() => setShowRevisionModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Scrollable Body */}
                            <div className="p-6 overflow-y-auto space-y-6 flex-1">
                                {/* Row 1: Template & Employment Type */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Job Role Template</label>
                                        <select
                                            value=""
                                            disabled
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded p-2 focus:outline-none cursor-not-allowed text-xs font-medium"
                                        >
                                            <option value="">No Role (Custom Salary Components)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Employment Type</label>
                                        <select
                                            value={revisionDraft.employmentType}
                                            onChange={(e) => handleDraftChange('employmentType', e.target.value)}
                                            className="w-full border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 text-xs font-medium"
                                        >
                                            <option value="full-time">Full Time</option>
                                            <option value="part-time">Part Time</option>
                                            <option value="contract">Contract</option>
                                            <option value="intern">Intern / Trainee</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 2: Annual & Monthly CTC */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">New Annual CTC</label>
                                        <div className="relative rounded shadow-sm">
                                            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-medium">₹</span>
                                            <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                value={revisionDraft.newAnnualCTC}
                                                onChange={(e) => handleDraftChange('newAnnualCTC', e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full border border-slate-200 rounded p-2 pl-7 focus:outline-none focus:border-blue-500 font-semibold text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">New Monthly CTC</label>
                                        <div className="relative rounded shadow-sm">
                                            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-medium">₹</span>
                                            <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                value={revisionDraft.newCTC}
                                                onChange={(e) => handleDraftChange('newCTC', e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full border border-slate-200 rounded p-2 pl-7 focus:outline-none focus:border-blue-500 font-semibold text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Row 3: Effective Date & Reason */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Effective Date</label>
                                        <input
                                            type="date"
                                            value={revisionDraft.effectiveDate}
                                            onChange={(e) => handleDraftChange('effectiveDate', e.target.value)}
                                            className="w-full border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 font-medium text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Reason</label>
                                        <input
                                            type="text"
                                            value={revisionDraft.reason}
                                            onChange={(e) => handleDraftChange('reason', e.target.value)}
                                            placeholder="e.g. Annual Appraisal / Promotion"
                                            className="w-full border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 text-xs font-medium"
                                        />
                                    </div>
                                </div>

                                {/* CTC Components Summary box */}
                                {(() => {
                                    const preview = draftSalaryPreview || {};
                                    return (
                                        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                                <h4 className="font-bold text-slate-800 text-sm">CTC Components</h4>
                                                <span className="text-[10px] text-slate-400">Synced with payroll settings</span>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                                <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                                    <span className="text-[10px] text-slate-500 uppercase font-semibold">PF Employer</span>
                                                    <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney(preview.pfEmployer || 0)}</strong>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Gratuity</span>
                                                    <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney(preview.gratuity || 0)}</strong>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                                    <span className="text-[10px] text-slate-500 uppercase font-semibold">LWF Employer</span>
                                                    <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney(preview.lwfEmployer || 0)}</strong>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Annual CTC</span>
                                                    <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney((Number(revisionDraft.newCTC) || 0) * 12)}</strong>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Gross Salary</span>
                                                    <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney(preview.totalEarnings || preview.grossSalary || 0)}</strong>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Net Take-Home Estimate</span>
                                                    <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney(preview.netTakeHome || 0)}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Statutory Components & Contribution Toggles */}
                                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                                    <div className="border-b border-slate-100 pb-2">
                                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                            <span>Statutory Components & Contribution Toggles</span>
                                            <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full font-bold uppercase">Statutory Toggles</span>
                                        </h4>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            Enable or disable specific statutory contributions for this employee. Disabling a component will zero out its values in salary calculations immediately.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                        {/* Use Salary Components Toggle */}
                                        <label className="flex flex-col border border-blue-100 rounded-xl p-3 bg-blue-50/20 cursor-pointer select-none">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-blue-900">Use Salary Components</span>
                                                <input
                                                    type="checkbox"
                                                    checked={revisionDraft.useSalaryComponents}
                                                    onChange={(e) => handleDraftChange('useSalaryComponents', e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                            </div>
                                            <span className="text-[10px] text-slate-400 mt-1">Distribute CTC into Basic, HRA, and Special Allowance.</span>
                                        </label>

                                        {/* PF Toggle */}
                                        <label className="flex flex-col border border-slate-100 rounded-xl p-3 bg-slate-50/30 cursor-pointer select-none">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-slate-700">Provident Fund (PF)</span>
                                                <input
                                                    type="checkbox"
                                                    checked={revisionDraft.pfEnabled}
                                                    onChange={(e) => handleDraftChange('pfEnabled', e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                            </div>
                                            <span className="text-[10px] text-slate-400 mt-1">Both Employee & Employer PF contributions.</span>
                                        </label>

                                        {/* ESI Toggle */}
                                        <label className="flex flex-col border border-slate-100 rounded-xl p-3 bg-slate-50/30 cursor-pointer select-none">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-slate-700">State Insurance (ESI)</span>
                                                <input
                                                    type="checkbox"
                                                    checked={revisionDraft.esiEnabled}
                                                    onChange={(e) => handleDraftChange('esiEnabled', e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                            </div>
                                            <span className="text-[10px] text-slate-400 mt-1">Employee State Insurance (ESI) deductions.</span>
                                        </label>

                                        {/* PT Toggle */}
                                        <div className="flex flex-col border border-slate-100 rounded-xl p-3 bg-slate-50/30">
                                            <label className="flex justify-between items-center cursor-pointer select-none">
                                                <span className="font-semibold text-slate-700">Professional Tax (PT)</span>
                                                <input
                                                    type="checkbox"
                                                    checked={revisionDraft.ptEnabled}
                                                    onChange={(e) => handleDraftChange('ptEnabled', e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                            </label>
                                            {revisionDraft.ptEnabled && (
                                                <div className="mt-2 space-y-2">
                                                    <select
                                                        value={revisionDraft.ptState || 'MH'}
                                                        onChange={(e) => handleDraftChange('ptState', e.target.value)}
                                                        className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
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
                                                    {revisionDraft.ptState === 'custom' && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-slate-500">Amount (₹):</span>
                                                            <input
                                                                type="number"
                                                                value={revisionDraft.deductions?.professionalTax || 0}
                                                                onChange={(e) => handleDraftChange('deductions.professionalTax', e.target.value === '' ? '' : Number(e.target.value))}
                                                                className="w-24 text-xs rounded-lg border border-slate-200 px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* LWF Toggle */}
                                        <label className="flex flex-col border border-slate-100 rounded-xl p-3 bg-slate-50/30 cursor-pointer select-none">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-slate-700">Welfare Fund (LWF)</span>
                                                <input
                                                    type="checkbox"
                                                    checked={revisionDraft.lwfEnabled}
                                                    onChange={(e) => handleDraftChange('lwfEnabled', e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                            </div>
                                            <span className="text-[10px] text-slate-400 mt-1">Labour Welfare Fund contributions.</span>
                                        </label>

                                        {/* Gratuity Toggle */}
                                        <label className="flex flex-col border border-slate-100 rounded-xl p-3 bg-slate-50/30 cursor-pointer select-none">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-slate-700">Gratuity Provision</span>
                                                <input
                                                    type="checkbox"
                                                    checked={revisionDraft.gratuityEnabled}
                                                    onChange={(e) => handleDraftChange('gratuityEnabled', e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                            </div>
                                            <span className="text-[10px] text-slate-400 mt-1">Accrual of statutory gratuity amount.</span>
                                        </label>
                                    </div>

                                    {/* Sub toggles: Include PF / Gratuity in CTC */}
                                    {(revisionDraft.pfEnabled || revisionDraft.gratuityEnabled) && (
                                        <div className="border-t border-slate-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {revisionDraft.pfEnabled && (
                                                <label className="flex items-center gap-3 border border-slate-100 rounded-xl p-3 bg-slate-50/20 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={revisionDraft.includePfInCTC}
                                                        onChange={(e) => handleDraftChange('includePfInCTC', e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                    <div>
                                                        <span className="text-xs font-semibold text-slate-700 block">Include PF in CTC</span>
                                                        <span className="text-[10px] text-slate-400">Employer PF inside CTC limit.</span>
                                                    </div>
                                                </label>
                                            )}
                                            {revisionDraft.gratuityEnabled && (
                                                <label className="flex items-center gap-3 border border-slate-100 rounded-xl p-3 bg-slate-50/20 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={revisionDraft.includeGratuityInCTC}
                                                        onChange={(e) => handleDraftChange('includeGratuityInCTC', e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                    <div>
                                                        <span className="text-xs font-semibold text-slate-700 block">Include Gratuity in CTC</span>
                                                        <span className="text-[10px] text-slate-400">Gratuity inside CTC limit.</span>
                                                    </div>
                                                </label>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Employee Salary Ratios (Overrides) */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                            <span>Employee Salary Ratios (Overrides)</span>
                                            <span className="text-[9px] bg-slate-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Optional</span>
                                        </h4>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            By default, this employee's Basic and HRA are computed using the global company payroll settings. You can set employee-specific overrides below.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Basic Salary % Override</label>
                                            <div className="relative rounded shadow-sm">
                                                <input
                                                    type="number"
                                                    step="any"
                                                    min="1"
                                                    max="100"
                                                    placeholder="50"
                                                    value={revisionDraft.basicPercent ?? ''}
                                                    onChange={(e) => handleDraftChange('basicPercent', e.target.value === '' ? null : Number(e.target.value))}
                                                    className="w-full border border-slate-200 rounded p-2 pr-7 focus:outline-none focus:border-blue-500 font-semibold text-xs"
                                                />
                                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-semibold">%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">HRA % Override (of Basic)</label>
                                            <div className="relative rounded shadow-sm">
                                                <input
                                                    type="number"
                                                    step="any"
                                                    min="1"
                                                    max="100"
                                                    placeholder="50"
                                                    value={revisionDraft.hraPercent ?? ''}
                                                    onChange={(e) => handleDraftChange('hraPercent', e.target.value === '' ? null : Number(e.target.value))}
                                                    className="w-full border border-slate-200 rounded p-2 pr-7 focus:outline-none focus:border-blue-500 font-semibold text-xs"
                                                />
                                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-semibold">%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Salary Component Inputs */}
                                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                                    <h4 className="font-bold text-slate-800 text-sm">Salary Component Inputs</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Basic */}
                                        <div>
                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Basic Salary</label>
                                            <input
                                                type="number"
                                                disabled
                                                value={draftSalaryPreview?.basicMaster || 0}
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded p-2 font-semibold cursor-not-allowed text-xs"
                                            />
                                        </div>
                                        {/* HRA */}
                                        <div>
                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">HRA</label>
                                            <input
                                                type="number"
                                                disabled
                                                value={draftSalaryPreview?.hraMaster || 0}
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded p-2 font-semibold cursor-not-allowed text-xs"
                                            />
                                        </div>
                                        {/* Flexi */}
                                        <div>
                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Flexi Allowance</label>
                                            <input
                                                type="number"
                                                disabled
                                                value={draftSalaryPreview?.flexi || 0}
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded p-2 font-semibold cursor-not-allowed text-xs"
                                            />
                                        </div>
                                        {/* Broadband */}
                                        <div>
                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Broadband</label>
                                            <input
                                                type="number"
                                                value={revisionDraft.broadband || ''}
                                                onChange={(e) => handleDraftChange('broadband', e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                                            />
                                        </div>
                                        {/* Petrol */}
                                        <div>
                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Petrol</label>
                                            <input
                                                type="number"
                                                value={revisionDraft.petrol || ''}
                                                onChange={(e) => handleDraftChange('petrol', e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                                            />
                                        </div>
                                        {/* LTA */}
                                        <div>
                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">LTA</label>
                                            <input
                                                type="number"
                                                value={revisionDraft.lta || ''}
                                                onChange={(e) => handleDraftChange('lta', e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                                            />
                                        </div>
                                        {/* Conveyance */}
                                        <div>
                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Conveyance</label>
                                            <input
                                                type="number"
                                                value={revisionDraft.salaryStructure.conveyance || ''}
                                                onChange={(e) => handleDraftChange('salaryStructure.conveyance', e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                                            />
                                        </div>
                                        {/* Medical Allowance */}
                                        <div>
                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Medical Allowance</label>
                                            <input
                                                type="number"
                                                value={revisionDraft.salaryStructure.medicalAllowance || ''}
                                                onChange={(e) => handleDraftChange('salaryStructure.medicalAllowance', e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                                            />
                                        </div>
                                        {/* Insurance Amount */}
                                        <div>
                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Insurance Amount</label>
                                            <input
                                                type="number"
                                                value={revisionDraft.insuranceAmount || ''}
                                                onChange={(e) => handleDraftChange('insuranceAmount', e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                                            />
                                        </div>
                                        {/* Employer NPS */}
                                        <div>
                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Employer NPS</label>
                                            <input
                                                type="number"
                                                value={revisionDraft.employerNPS || ''}
                                                onChange={(e) => handleDraftChange('employerNPS', e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                                            />
                                        </div>
                                        {/* TDS */}
                                        <div>
                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Income Tax (TDS) / Tax Amount</label>
                                            <input
                                                type="number"
                                                value={revisionDraft.deductions.tds || ''}
                                                onChange={(e) => handleDraftChange('deductions.tds', e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Allowances (Other Earnings) */}
                                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                            <span>Custom Allowances</span>
                                            <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">Other Earnings</span>
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const allowances = revisionDraft.salaryStructure.otherAllowances || [];
                                                handleDraftChange('salaryStructure.otherAllowances', [...allowances, { name: '', amount: 0 }]);
                                            }}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                        >
                                            + Add Custom Allowance
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-normal">
                                        Define additional custom allowance types for this employee (e.g. Children Education, Uniform Allowance). These will increase Gross Salary and be balanced under Special Allowance.
                                    </p>
                                    {(!revisionDraft.salaryStructure.otherAllowances || revisionDraft.salaryStructure.otherAllowances.length === 0) ? (
                                        <div className="text-center py-4 border border-dashed border-slate-200 rounded-lg text-slate-400 italic text-[11px] bg-slate-50/30">
                                            No custom allowances defined. Click "+ Add Custom Allowance" above to add one.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {revisionDraft.salaryStructure.otherAllowances.map((allowance, index) => (
                                                <div key={index} className="flex gap-3 items-end bg-slate-50/50 p-2.5 rounded border border-slate-200">
                                                    <div className="flex-1">
                                                        <label className="text-[9px] font-bold text-slate-500 mb-1 block">Allowance Name</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="e.g. Children Education"
                                                            value={allowance.name}
                                                            onChange={(e) => {
                                                                const updated = [...revisionDraft.salaryStructure.otherAllowances];
                                                                updated[index] = { ...updated[index], name: e.target.value };
                                                                handleDraftChange('salaryStructure.otherAllowances', updated);
                                                            }}
                                                            className="w-full border border-slate-200 rounded p-1.5 text-xs font-medium"
                                                        />
                                                    </div>
                                                    <div className="w-1/3">
                                                        <label className="text-[9px] font-bold text-slate-500 mb-1 block">Monthly Amount (₹)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            required
                                                            value={allowance.amount}
                                                            onChange={(e) => {
                                                                const updated = [...revisionDraft.salaryStructure.otherAllowances];
                                                                updated[index] = { ...updated[index], amount: Number(e.target.value) || 0 };
                                                                handleDraftChange('salaryStructure.otherAllowances', updated);
                                                            }}
                                                            className="w-full border border-slate-200 rounded p-1.5 text-xs font-semibold"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = revisionDraft.salaryStructure.otherAllowances.filter((_, idx) => idx !== index);
                                                            handleDraftChange('salaryStructure.otherAllowances', updated);
                                                        }}
                                                        className="px-2 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-semibold hover:bg-red-100 transition-colors"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Custom Deductions (Other Deductions) */}
                                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                            <span>Custom Deductions</span>
                                            <span className="text-[9px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">Other Deductions</span>
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const deductions = revisionDraft.deductions.otherDeductions || [];
                                                handleDraftChange('deductions.otherDeductions', [...deductions, { name: '', amount: 0 }]);
                                            }}
                                            className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                                        >
                                            + Add Custom Deduction
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-normal">
                                        Define additional custom monthly deductions for this employee (e.g. Car Lease, Corporate Accommodation). These will automatically reduce the Net Take-Home Salary estimate.
                                    </p>
                                    {(!revisionDraft.deductions.otherDeductions || revisionDraft.deductions.otherDeductions.length === 0) ? (
                                        <div className="text-center py-4 border border-dashed border-slate-200 rounded-lg text-slate-400 italic text-[11px] bg-slate-50/30">
                                            No custom deductions defined. Click "+ Add Custom Deduction" above to add one.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {revisionDraft.deductions.otherDeductions.map((deduction, index) => (
                                                <div key={index} className="flex gap-3 items-end bg-slate-50/50 p-2.5 rounded border border-slate-200">
                                                    <div className="flex-1">
                                                        <label className="text-[9px] font-bold text-slate-500 mb-1 block">Deduction Name</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="e.g. Car Lease"
                                                            value={deduction.name}
                                                            onChange={(e) => {
                                                                const updated = [...revisionDraft.deductions.otherDeductions];
                                                                updated[index] = { ...updated[index], name: e.target.value };
                                                                handleDraftChange('deductions.otherDeductions', updated);
                                                            }}
                                                            className="w-full border border-slate-200 rounded p-1.5 text-xs font-medium"
                                                        />
                                                    </div>
                                                    <div className="w-1/3">
                                                        <label className="text-[9px] font-bold text-slate-500 mb-1 block">Monthly Amount (₹)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            required
                                                            value={deduction.amount}
                                                            onChange={(e) => {
                                                                const updated = [...revisionDraft.deductions.otherDeductions];
                                                                updated[index] = { ...updated[index], amount: Number(e.target.value) || 0 };
                                                                handleDraftChange('deductions.otherDeductions', updated);
                                                            }}
                                                            className="w-full border border-slate-200 rounded p-1.5 text-xs font-semibold"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = revisionDraft.deductions.otherDeductions.filter((_, idx) => idx !== index);
                                                            handleDraftChange('deductions.otherDeductions', updated);
                                                        }}
                                                        className="px-2 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-semibold hover:bg-red-100 transition-colors"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* One-Time Pay */}
                                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                                    <h4 className="font-bold text-slate-800 text-sm">One-Time Pay</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Joining Bonus</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={revisionDraft.joiningBonus || ''}
                                                onChange={(e) => handleDraftChange('joiningBonus', e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Comparison Preview Table */}
                                {(() => {
                                    const rows = getComparisonRows();
                                    return (
                                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                                            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-bold text-slate-700 text-xs uppercase tracking-wider">
                                                Salary Structure Preview & Comparison
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                                                            <th className="px-4 py-2">Component</th>
                                                            <th className="px-3 py-2 text-right">Current</th>
                                                            <th className="px-3 py-2 text-right">Revised</th>
                                                            <th className="px-4 py-2 text-right">Change</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 text-xs">
                                                        {rows.map((row, idx) => {
                                                            const diff = (row.revised || 0) - (row.current || 0);
                                                            const isBold = row.isHeader;
                                                            return (
                                                                <tr key={idx} className={`${isBold ? 'bg-slate-200/40 font-bold text-slate-900' : 'text-slate-600 hover:bg-slate-50/80'} transition-all`}>
                                                                    <td className="px-4 py-2">{row.name}</td>
                                                                    <td className="px-3 py-2 text-right">{fmtMoney(row.current)}</td>
                                                                    <td className="px-3 py-2 text-right">{fmtMoney(row.revised)}</td>
                                                                    <td className="px-4 py-2 text-right font-semibold">
                                                                        {diff > 0 ? (
                                                                            <span className="text-emerald-600 font-bold">+{fmtMoney(diff)}</span>
                                                                        ) : diff < 0 ? (
                                                                            <span className="text-rose-600 font-bold">-{fmtMoney(Math.abs(diff))}</span>
                                                                        ) : (
                                                                            <span className="text-slate-400 font-normal">—</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Sticky Footer */}
                            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end space-x-3 shrink-0">
                                <Button 
                                    variant="ghost" 
                                    disabled={calculating} 
                                    onClick={() => setShowRevisionModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    disabled={calculating} 
                                    onClick={handleRevisionSubmit} 
                                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                                >
                                    {calculating ? 'Calculating...' : 'Save Revision'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Add Payroll Record Modal */}
                {showPayrollModal && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">Add Payroll Record</h3>
                                <button onClick={() => setShowPayrollModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Pay Period</label>
                                    <input 
                                        type="text" 
                                        value={payPeriod} 
                                        onChange={(e) => setPayPeriod(e.target.value)}
                                        placeholder="e.g. June 2026"
                                        className="w-full border border-slate-200 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Net Salary Received (₹)</label>
                                    <input 
                                        type="number" 
                                        value={payNetSalary} 
                                        onChange={(e) => setPayNetSalary(e.target.value)}
                                        placeholder="e.g. 45000"
                                        className="w-full border border-slate-200 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
                                    <select 
                                        value={payStatus} 
                                        onChange={(e) => setPayStatus(e.target.value)}
                                        className="w-full border border-slate-200 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="Paid">Paid</option>
                                        <option value="Processing">Processing</option>
                                        <option value="Approved">Approved</option>
                                    </select>
                                </div>
                            </div>
                            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end space-x-3">
                                <Button variant="ghost" onClick={() => setShowPayrollModal(false)}>Cancel</Button>
                                <Button onClick={handleAddPayrollSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">Save Record</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. View Payslip Modal */}
                {viewingPayslip && renderPayslipModal()}
            </div>
        );
    };

    const renderEmployment = () => {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Employment Details</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Designation */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Designation</label>
                            <div className="text-slate-800 font-medium text-sm">{profile.employment?.designation || profile.user?.roles?.[0]?.name || '-'}</div>
                        </div>

                        {/* Department */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                            <div className="text-slate-800 font-medium text-sm">{profile.employment?.department || '-'}</div>
                        </div>

                        {/* Joining Date */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Joining Date</label>
                            <div className="text-slate-800 font-medium text-sm">{(profile.employment?.joiningDate || profile.user?.joiningDate) ? format(new Date(profile.employment?.joiningDate || profile.user?.joiningDate), 'dd/MM/yyyy') : '-'}</div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-tight">
                                {profile.employment?.status || 'Active'}
                            </div>
                        </div>

                        {/* Work Location */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Work Location</label>
                            <div className="text-slate-800 font-medium text-sm">{profile.user?.workLocation || profile.employment?.workLocation || 'Office'}</div>
                        </div>

                        {/* Employment Type */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Employment Type</label>
                            <div className="text-slate-800 font-medium text-sm">{profile.user?.employmentType || 'Full Time'}</div>
                        </div>
                    </div>
                </div>

                <SectionCard
                    title="Previous Work Experience"
                    sectionName="experience"
                    icon={Briefcase}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    onSave={handleSave}
                    isLoading={false}
                    canEdit={canEdit}
                    showActions={canEdit}
                    isEditingOverride={false}
                    customEditAction={redirectToHRISEdit}
                >
                    {(isEditing) => (
                        <div className="space-y-6">
                            {(formData.experience || []).map((exp, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border ${isEditing ? 'border-blue-100 bg-blue-50/20' : 'border-slate-100 bg-slate-50/30'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="text-sm font-bold text-slate-700">Experience #{idx + 1}</h4>
                                        {isEditing && (
                                            <button
                                                onClick={() => removeArrayItem('experience', idx)}
                                                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                                                title="Remove Experience"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Field
                                            label="Company Name"
                                            section="experience"
                                            value={exp.companyName}
                                            valueOverride={formData.experience?.[idx]?.companyName ?? exp.companyName}
                                            isEditing={isEditing}
                                            onChangeOverride={(e) => handleArrayChange('experience', idx, 'companyName', e.target.value)}
                                        />
                                        <Field
                                            label="Designation"
                                            section="experience"
                                            value={exp.designation}
                                            valueOverride={formData.experience?.[idx]?.designation ?? exp.designation}
                                            isEditing={isEditing}
                                            onChangeOverride={(e) => handleArrayChange('experience', idx, 'designation', e.target.value)}
                                        />
                                        <Field
                                            label="From Date"
                                            section="experience"
                                            type="date"
                                            value={exp.startDate}
                                            valueOverride={formData.experience?.[idx]?.startDate ?? exp.startDate}
                                            isEditing={isEditing}
                                            onChangeOverride={(e) => handleArrayChange('experience', idx, 'startDate', e.target.value)}
                                        />
                                        <Field
                                            label="To Date"
                                            section="experience"
                                            type="date"
                                            value={exp.endDate}
                                            valueOverride={formData.experience?.[idx]?.endDate ?? exp.endDate}
                                            isEditing={isEditing}
                                            onChangeOverride={(e) => handleArrayChange('experience', idx, 'endDate', e.target.value)}
                                        />
                                        <div className="md:col-span-2">
                                            <Field
                                                label="Reason for Leaving"
                                                section="experience"
                                                value={exp.reasonForLeaving}
                                                valueOverride={formData.experience?.[idx]?.reasonForLeaving ?? exp.reasonForLeaving}
                                                isEditing={isEditing}
                                                onChangeOverride={(e) => handleArrayChange('experience', idx, 'reasonForLeaving', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {isEditing && (
                                <button
                                    onClick={() => addArrayItem('experience', {
                                        companyName: '',
                                        designation: '',
                                        startDate: '',
                                        endDate: '',
                                        reasonForLeaving: '',
                                        totalExperience: ''
                                    })}
                                    className="w-full py-3 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all font-semibold flex items-center justify-center gap-2"
                                >
                                    + Add Past Experience
                                </button>
                            )}

                            {(!formData.experience || formData.experience.length === 0) && !isEditing && (
                                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <Briefcase size={40} className="mx-auto text-slate-300 mb-3" />
                                    <p className="text-slate-500 text-sm italic">No past work experience added yet.</p>
                                </div>
                            )}
                        </div>
                    )}
                </SectionCard>
            </div>
        );
    };

    const renderDocuments = () => {
        const normalizeDocumentStatus = (status) => (status === 'Pending' || !status ? 'Pending Review' : status);
        const getActorName = (person) => {
            if (!person) return '';
            if (typeof person === 'string') return person;
            return [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || person.email || '';
        };
        const formatAuditDateTime = (value) => (value ? format(new Date(value), 'dd MMM yyyy, hh:mm a') : '');
        const canVerify = isCurrentUserAdmin
            || currentUser?.permissions?.includes('dossier.verify_documents')
            || currentUser?.permissions?.includes('dossier.approve');
        const hasPendingDocs = profile.documents?.some((doc) => normalizeDocumentStatus(doc.verificationStatus) === 'Pending Review');
        const onboardingCustomFiles = Array.isArray(profile.onboardingCustomFiles) ? profile.onboardingCustomFiles : [];
        // Robust ID comparison
        const visibleDocuments = Array.isArray(profile.documents) ? profile.documents : [];
        const getDocumentStatusClasses = (status) => {
            if (status === 'Verified') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            if (status === 'Rejected') return 'bg-red-100 text-red-700 border-red-200';
            return 'bg-orange-100 text-orange-700 border-orange-200';
        };

        const openDocumentReviewModal = (mode, doc) => {
            setDocumentReviewModal({ mode, doc });
            setDocumentReviewReason('');
        };

        const closeDocumentReviewModal = () => {
            if (processingDocumentReview) return;
            setDocumentReviewModal(null);
            setDocumentReviewReason('');
        };

        const handleVerifyAllDocuments = async () => {
            try {
                const targetUserId = userId || currentUser?._id;
                const response = await api.patch(`/dossier/${targetUserId}/documents/verify-all`, { status: 'Verified' });
                if (response.status === 200) {
                    toast.success(`All pending documents verified`);
                    setProfile(prev => ({
                        ...prev,
                        documentSubmissionStatus: response.data.submissionStatus,
                        documents: response.data.documents || prev.documents
                    }));
                    fetchDossier();
                    if (activeTab === 'history') fetchHistory();
                }
            } catch (error) {
                console.error('Verify All Documents Error:', error);
                toast.error(error.response?.data?.message || 'Failed to verify documents');
            }
        };

        const handleSubmitDocuments = async () => {
            // Validation: Check for mandatory documents
            const uploadedTitles = visibleDocuments.map(d => d.title.toLowerCase()) || [];

            // 1. Mandatory Identity Docs (Except Passport)
            const identityCategory = documentCategories.find(c => c.name === 'Identity Documents');
            const requiredIdentityDocs = identityCategory?.fixedDocs.filter(doc => doc !== 'Passport') || [];

            const missingIdentityDocs = requiredIdentityDocs.filter(reqDoc =>
                !uploadedTitles.includes(reqDoc.toLowerCase())
            );

            // 2. Mandatory Qualification Docs
            const qualificationCategory = documentCategories.find(c => c.name === 'Qualification Certificates');
            const requiredQualificationDocs = qualificationCategory?.fixedDocs || [];

            const missingQualificationDocs = requiredQualificationDocs.filter(reqDoc =>
                !uploadedTitles.includes(reqDoc.toLowerCase())
            );

            const allMissing = [...missingIdentityDocs, ...missingQualificationDocs];

            if (allMissing.length > 0) {
                toast.error(`Missing mandatory documents: ${allMissing.join(', ')}`);
                return;
            }

            try {
                const targetUserId = userId || currentUser?._id;
                const response = await api.patch(`/dossier/${targetUserId}/documents/submit`);
                if (response.status === 200) {
                    toast.success('Documents submitted for approval');
                    setProfile(prev => ({
                        ...prev,
                        documentSubmissionStatus: response.data.submissionStatus
                        // documents status doesn't change on submit, just global status
                    }));
                    fetchDossier();
                    if (activeTab === 'history') fetchHistory();
                }
            } catch (error) {
                console.error('Submit Documents Error:', error);
                toast.error(error.response?.data?.message || 'Failed to submit documents');
            }
        };

        const handleVerifyDocument = async (docId, status) => {
            try {
                const targetUserId = userId || currentUser?._id;
                const response = await api.patch(`/dossier/${targetUserId}/documents/${docId}/verify`, { status });
                if (response.status === 200) {
                    toast.success(`Document marked as ${status}`);
                    setProfile(prev => ({
                        ...prev,
                        documentSubmissionStatus: response.data.submissionStatus,
                        documents: response.data.documents
                    }));
                    fetchDossier();
                    if (activeTab === 'history') fetchHistory();
                }
            } catch (error) {
                console.error('Verify Document Error:', error);
                toast.error(error.response?.data?.message || 'Failed to verify document');
            }
        };

        const handleRejectDocument = async (docId, reason) => {
            try {
                const targetUserId = userId || currentUser?._id;
                const response = await api.patch(`/dossier/${targetUserId}/documents/${docId}/verify`, { status: 'Rejected', reason });
                if (response.status === 200) {
                    toast.success('Document rejected');
                    setProfile(prev => ({
                        ...prev,
                        documentSubmissionStatus: response.data.submissionStatus,
                        documents: response.data.documents
                    }));
                    fetchDossier();
                    if (activeTab === 'history') fetchHistory();
                }
            } catch (error) {
                console.error('Reject Document Error:', error);
                toast.error(error.response?.data?.message || 'Failed to reject document');
                throw error;
            }
        };

        const handleRevokeVerification = async (docId, reason) => {
            try {
                const targetUserId = userId || currentUser?._id;
                const response = await api.patch(`/dossier/${targetUserId}/documents/${docId}/revoke`, { reason });
                if (response.status === 200) {
                    toast.success('Verification revoked');
                    setProfile(prev => ({
                        ...prev,
                        documentSubmissionStatus: response.data.submissionStatus,
                        documents: response.data.documents
                    }));
                    fetchDossier();
                    if (activeTab === 'history') fetchHistory();
                }
            } catch (error) {
                console.error('Revoke Verification Error:', error);
                toast.error(error.response?.data?.message || 'Failed to revoke verification');
                throw error;
            }
        };

        const submitDocumentReviewAction = async () => {
            if (!documentReviewModal?.doc?._id) return;

            const trimmedReason = documentReviewReason.trim();
            if (!trimmedReason) {
                toast.error(documentReviewModal.mode === 'reject' ? 'Rejection reason is required' : 'Revocation reason is required');
                return;
            }

            try {
                setProcessingDocumentReview(true);
                if (documentReviewModal.mode === 'reject') {
                    await handleRejectDocument(documentReviewModal.doc._id, trimmedReason);
                } else {
                    await handleRevokeVerification(documentReviewModal.doc._id, trimmedReason);
                }
                closeDocumentReviewModal();
            } finally {
                setProcessingDocumentReview(false);
            }
        };

        const handleView = async (doc) => {
            try {
                const toastId = toast.loading('Preparing preview...');
                const response = await api.get('/dossier/proxy-pdf', {
                    params: { url: doc.url, download: false },
                    responseType: 'blob'
                });

                const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
                toast.dismiss(toastId);
            } catch (error) {
                console.error('Preview Error:', error);
                toast.error('Failed to preview document');
            }
        };

        const handleDownload = async (doc) => {
            try {
                const toastId = toast.loading('Preparing download...');
                const response = await api.get('/dossier/proxy-pdf', {
                    params: { url: doc.url, download: true },
                    responseType: 'blob'
                });

                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', doc.fileName || `${doc.title}.pdf`); // Fallback name
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                toast.dismiss(toastId);
                toast.success('Download started');
            } catch (error) {
                console.error('Download Error:', error);
                toast.error('Failed to download document');
            }
        };



        const DocumentActionButton = ({ icon: Icon, label, onClick, tone = 'slate', disabled = false }) => {
            const toneClasses = {
                slate: 'border-slate-200 text-slate-700 hover:bg-slate-50',
                blue: 'border-blue-200 text-blue-700 hover:bg-blue-50',
                green: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                red: 'border-red-200 text-red-700 hover:bg-red-50',
                amber: 'border-amber-200 text-amber-700 hover:bg-amber-50'
            };

            return (
                <button
                    type="button"
                    onClick={onClick}
                    disabled={disabled}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition-colors ${toneClasses[tone]} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                    <Icon size={14} />
                    <span>{label}</span>
                </button>
            );
        };

        // Render a single document card
        const DocumentCard = ({ doc, isSharedOnboardingFile = false }) => {
            const docStatus = isSharedOnboardingFile ? 'Shared' : normalizeDocumentStatus(doc.verificationStatus);
            const isDocsSubmitted = ['Submitted', 'Approved'].includes(profile?.documentSubmissionStatus);
            const canDeleteDocument = !isSharedOnboardingFile
                && docStatus !== 'Verified'
                && (!isDocsSubmitted || !isSelf)
                && (isSelf || canVerify || canEdit);
            const canCorrectRejectedDocument = !isSharedOnboardingFile && isSelf && docStatus === 'Rejected';
            const canApprovePendingDocument = canVerify && !isSharedOnboardingFile && docStatus === 'Pending Review';
            const canRevokeVerifiedDocument = canVerify && !isSharedOnboardingFile && docStatus === 'Verified';

            return (
                <div className="group relative flex min-h-[280px] min-w-[320px] max-w-[320px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-blue-50 p-3 text-blue-600 transition-colors group-hover:bg-blue-100">
                                <FileText size={20} />
                            </div>
                            <div>
                                <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${isSharedOnboardingFile ? 'border-blue-200 bg-blue-100 text-blue-700' : getDocumentStatusClasses(docStatus)}`}>
                                    {docStatus}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 space-y-2">
                        <h4 className="line-clamp-2 text-sm font-semibold text-slate-900" title={doc.title}>{doc.title}</h4>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                            <span>{isSharedOnboardingFile ? (doc.sourceLabel || 'Shared during onboarding') : (doc.category || 'Document')}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                            <span>{format(new Date(doc.uploadDate), 'MMM dd, yyyy')}</span>
                        </div>
                    </div>

                    {docStatus === 'Rejected' && doc.rejectionReason ? (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700">
                            <div className="font-semibold uppercase tracking-wide">Rejection Reason</div>
                            <div className="mt-1 leading-relaxed">{doc.rejectionReason}</div>
                        </div>
                    ) : null}

                    {doc.revocationReason && docStatus === 'Pending Review' ? (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                            <div className="font-semibold uppercase tracking-wide">Verification Revoked</div>
                            <div className="mt-1 leading-relaxed">{doc.revocationReason}</div>
                        </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        <DocumentActionButton
                            icon={Eye}
                            label="View"
                            tone="blue"
                            onClick={() => handleView(doc)}
                        />
                        <DocumentActionButton
                            icon={Download}
                            label="Download"
                            tone="blue"
                            onClick={() => handleDownload(doc)}
                        />

                        {canApprovePendingDocument ? (
                            <>
                                <DocumentActionButton
                                    icon={CheckCircle}
                                    label="Approve"
                                    tone="green"
                                    onClick={() => handleVerifyDocument(doc._id, 'Verified')}
                                />
                                <DocumentActionButton
                                    icon={X}
                                    label="Reject"
                                    tone="red"
                                    onClick={() => openDocumentReviewModal('reject', doc)}
                                />
                            </>
                        ) : null}

                        {canRevokeVerifiedDocument ? (
                            <DocumentActionButton
                                icon={RotateCcw}
                                label="Revoke"
                                tone="amber"
                                onClick={() => openDocumentReviewModal('revoke', doc)}
                            />
                        ) : null}

                        {canCorrectRejectedDocument ? (
                            <DocumentActionButton
                                icon={Upload}
                                label="Upload Corrected"
                                tone="amber"
                                onClick={() => triggerReplaceUpload(doc)}
                            />
                        ) : null}

                        {canDeleteDocument ? (
                            <DocumentActionButton
                                icon={Trash2}
                                label="Delete"
                                tone="red"
                                disabled={deletingDocId === doc._id}
                                onClick={() => handleDeleteDocument(doc._id)}
                            />
                        ) : null}
                    </div>
                </div>
            );
        };

        return (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-1">
                    <h3 className="text-lg font-bold text-slate-800">Documents</h3>

                    {/* Approve All Button for Admins - Always Visible */}
                    {canVerify && (
                        <Button
                            onClick={handleVerifyAllDocuments}
                            disabled={!hasPendingDocs}
                            className={`flex items-center gap-2 shadow-sm ${!hasPendingDocs
                                ? 'bg-emerald-900 text-emerald-400'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                        >
                            <CheckCircle size={18} />
                            Approve All Pending
                        </Button>
                    )}
                </div>
                <p className="text-xs text-red-500 italic mb-6">* fields are mandatory</p>

                {/* Submission Status Banner */}
                {profile.documentSubmissionStatus && profile.documentSubmissionStatus !== 'Draft' && (
                    <div className={`mb-4 p-3 rounded-lg border flex items-center gap-3 shadow-sm transition-all duration-300 ${profile.documentSubmissionStatus === 'Approved' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' :
                        profile.documentSubmissionStatus === 'Changes Requested' ? 'bg-amber-50/80 border-amber-200 text-amber-900' :
                            'bg-blue-50/80 border-blue-200 text-blue-900'
                        }`}>
                        <div className={`p-1.5 rounded-full shrink-0 ${profile.documentSubmissionStatus === 'Approved' ? 'bg-emerald-100 text-emerald-600' :
                            profile.documentSubmissionStatus === 'Changes Requested' ? 'bg-amber-100 text-amber-600' :
                                'bg-blue-100 text-blue-600'
                            }`}>
                            {profile.documentSubmissionStatus === 'Approved' ? <CheckCircle size={18} /> :
                                profile.documentSubmissionStatus === 'Changes Requested' ? <AlertCircle size={18} /> :
                                    <Shield size={18} />}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-sm tracking-tight flex items-center gap-2">
                                Submission Status: {profile.documentSubmissionStatus}
                                {profile.documentSubmissionStatus === 'Approved' && <span className="text-xs font-normal opacity-80">(All documents verified)</span>}
                            </h4>
                            {profile.documentSubmissionStatus !== 'Approved' && (
                                <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
                                    {profile.documentSubmissionStatus === 'Submitted' && "Documents submitted for review."}
                                    {profile.documentSubmissionStatus === 'Changes Requested' && "Action Required: Please review feedback."}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Hidden file input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                />

                {/* Document Categories */}
                <div className="space-y-8">
                    {documentCategories.map((catConfig) => {
                        const categoryDocs = visibleDocuments.filter(d => d.category === catConfig.category) || [];
                        const mergedCategoryDocs = catConfig.category === 'Other'
                            ? [...categoryDocs, ...onboardingCustomFiles]
                            : categoryDocs;

                        return (
                            <div key={catConfig.name} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                        {catConfig.icon && <span className="text-xl">{catConfig.icon}</span>}
                                        {catConfig.name}
                                        <span className="text-xs font-normal text-slate-500">({mergedCategoryDocs.length})</span>
                                    </h4>
                                    {catConfig.allowMultiple && (
                                        <button
                                            onClick={() => triggerCategoryUpload(catConfig.name, catConfig.category)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors shadow-sm"
                                        >
                                            <Upload size={14} />
                                            Add Document
                                        </button>
                                    )}
                                </div>

                                {/* Document Row - Horizontal Scroll */}
                                <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                                    {/* Fixed documents for Identity */}
                                    {/* Fixed documents (Identity, Education, Bank etc.) */}
                                    {catConfig.fixedDocs?.map((docTitle) => {
                                        const doc = categoryDocs.find(d => d.title.toLowerCase() === docTitle.toLowerCase());
                                        const isMandatory = (catConfig.name === 'Identity Documents' && docTitle !== 'Passport') || (catConfig.name === 'Qualification Certificates');

                                        if (doc) {
                                            return <DocumentCard key={doc._id} doc={doc} />;
                                        }

                                        // Empty state for fixed docs
                                        return (
                                            <div
                                                key={docTitle}
                                                onClick={() => triggerUpload(docTitle)}
                                                className="group cursor-pointer border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-white hover:bg-blue-50/30 hover:border-blue-300 hover:shadow-md transition-all duration-300 min-w-[280px] max-w-[280px] min-h-[180px]"
                                            >
                                                <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-3 group-hover:text-blue-500 group-hover:bg-blue-100 group-hover:scale-110 transition-all">
                                                    <Upload size={20} />
                                                </div>
                                                <h4 className="font-semibold text-slate-700 text-sm mb-1 group-hover:text-blue-700 transition-colors">
                                                    {docTitle} {isMandatory && <span className="text-red-500">*</span>}
                                                </h4>
                                                <p className="text-xs text-slate-400">Click to upload</p>
                                            </div>
                                        );
                                    })}

                                    {/* Dynamic documents (exclude those that match fixedDocs titles) */}
                                    {catConfig.allowMultiple && mergedCategoryDocs
                                        .filter(doc => !catConfig.fixedDocs?.some(fixedTitle => fixedTitle.toLowerCase() === doc.title.toLowerCase()))
                                        .map(doc => (
                                            <DocumentCard
                                                key={doc._id || doc.url || doc.title}
                                                doc={doc}
                                                isSharedOnboardingFile={Boolean(doc.isOnboardingShared)}
                                            />
                                        ))}

                                    {/* Show empty state if no documents in dynamic category AND no fixed docs */}
                                    {catConfig.allowMultiple && mergedCategoryDocs.length === 0 && (!catConfig.fixedDocs || catConfig.fixedDocs.length === 0) && (
                                        <div className="flex items-center justify-center min-w-[280px] h-[180px] border-2 border-dashed border-slate-200 rounded-xl bg-white text-slate-400 text-sm">
                                            No documents uploaded yet
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Document Final Declaration */}
                {(!canVerify || isSelf) && profile.documentSubmissionStatus !== 'Approved' && (
                    <div className="mt-10 pt-10 border-t border-slate-200">
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col items-center text-center">
                            <h3 className="font-bold text-slate-800 text-lg mb-2">Final Declaration</h3>
                            <p className="text-sm text-slate-600 max-w-2xl mb-6">
                                I hereby declare that all the documents provided above are true and accurate to the best of my knowledge.
                                I understand that any false information or forged documents may lead to disciplinary action or termination of employment.
                            </p>

                            {profile.documentSubmissionStatus === 'Submitted' ? (
                                <div className="space-y-4 flex flex-col items-center">
                                    <div className="flex items-center text-emerald-600 space-x-2 font-bold bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                                        <CheckCircle size={20} />
                                        <span>Submitted for review on {profile.updatedAt ? format(new Date(profile.updatedAt), 'dd MMM yyyy') : 'Recently'}</span>
                                    </div>
                                    <p className="text-xs text-slate-500">Your documents are in the HR verification queue. You can still review statuses here.</p>
                                </div>
                            ) : (
                                <div className="space-y-4 flex flex-col items-center">
                                    <label className="flex items-center space-x-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={isDocumentDeclared}
                                            onChange={(e) => setIsDocumentDeclared(e.target.checked)}
                                            className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 group-hover:border-blue-400 transition"
                                        />
                                        <span className="text-sm font-semibold text-slate-700 select-none">I agree to the declaration</span>
                                    </label>
                                    {isDocumentDeclared && (
                                        <p className="text-xs text-blue-600 font-medium animate-pulse">
                                            Ready to submit! Click "Submit for Approval" below to finish.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Submit for Approval Button - Bottom */}
                {(!canVerify || isSelf) && !(profile.documentSubmissionStatus === 'Approved' && !hasPendingDocs) && (
                    <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
                        <button
                            onClick={handleSubmitDocuments}
                            disabled={!profile.documents?.length || profile.documentSubmissionStatus === 'Submitted' || !isDocumentDeclared}
                            className={`flex items-center gap-2 shadow-sm px-6 py-2.5 rounded-xl font-semibold outline-none ${!profile.documents?.length || profile.documentSubmissionStatus === 'Submitted' || !isDocumentDeclared
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                        >
                            <Shield size={18} />
                            {profile.documentSubmissionStatus === 'Submitted' ? 'Submitted for Approval' :
                                profile.documentSubmissionStatus === 'Approved' && hasPendingDocs ? 'Submit New Documents' :
                                    'Submit for Approval'}
                        </button>
                    </div>
                )}

                {documentReviewModal?.doc ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeDocumentReviewModal}>
                        <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
                            <div className="border-b border-slate-100 px-6 py-5">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Document Review</div>
                                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                                    {documentReviewModal.mode === 'reject' ? 'Reject Document' : 'Revoke Verification'}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">{documentReviewModal.doc.title}</p>
                            </div>
                            <div className="px-6 py-5">
                                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    {documentReviewModal.mode === 'reject' ? 'Rejection Reason' : 'Revocation Reason'}
                                </label>
                                <textarea
                                    value={documentReviewReason}
                                    onChange={(event) => setDocumentReviewReason(event.target.value)}
                                    rows={5}
                                    autoFocus
                                    className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                    placeholder={documentReviewModal.mode === 'reject'
                                        ? 'Explain what needs to be corrected before this document can be verified.'
                                        : 'Explain why this verified document is being moved back to pending review.'}
                                />
                            </div>
                            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
                                <Button
                                    variant="ghost"
                                    onClick={closeDocumentReviewModal}
                                    disabled={processingDocumentReview}
                                    className="border border-slate-200"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={submitDocumentReviewAction}
                                    isLoading={processingDocumentReview}
                                    className={documentReviewModal.mode === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}
                                >
                                    {documentReviewModal.mode === 'reject' ? 'Reject Document' : 'Revoke Verification'}
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Fixed Document Upload Preview */}
                {showUploadPreview && previewFile && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCancelUpload}>
                        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-bold text-slate-800">{replaceDocumentContext ? 'Confirm Corrected Version' : 'Confirm Upload'}</h3>
                                    <button onClick={handleCancelUpload} className="text-slate-400 hover:text-slate-600 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center gap-4 mb-6">
                                    <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                                        <FileText size={24} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-slate-700 text-sm truncate" title={uploadingDocTitle || previewFile.name}>{uploadingDocTitle || previewFile.name}</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {(previewFile.size / 1024 / 1024).toFixed(2)} MB • {previewFile.name.split('.').pop().toUpperCase()}
                                        </p>
                                    </div>
                                    {previewUrl ? (
                                        <a
                                            href={previewUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                        >
                                            <Eye size={16} />
                                            <span>Preview</span>
                                        </a>
                                    ) : (
                                        <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400">
                                            <Eye size={16} />
                                            <span>Preview</span>
                                        </span>
                                    )}
                                </div>

                                <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Before Upload</div>
                                    <p className="mt-2">Use the eye button to review the selected file in a separate preview tab before you upload it to the dossier.</p>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        onClick={handleConfirmUpload}
                                        isLoading={isUploading}
                                        className="flex-1 shadow-lg shadow-blue-100"
                                    >
                                        {replaceDocumentContext ? 'Upload Corrected Version' : 'Upload Now'}
                                    </Button>
                                    <Button
                                        variants="ghost"
                                        onClick={handleCancelUpload}
                                        disabled={isUploading}
                                        className="flex-1 border border-slate-200"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Custom Title Modal */}
                {
                    showTitleModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCancelUpload}>
                            <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                                <h3 className="text-lg font-bold text-slate-800">Preview Before Upload</h3>
                                <p className="mt-1 text-sm text-slate-500">Confirm the document and set the title that should appear in the dossier.</p>

                                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                                            <FileText size={24} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-slate-700 text-sm truncate" title={previewFile?.name}>{previewFile?.name}</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {previewFile ? `${(previewFile.size / 1024 / 1024).toFixed(2)} MB` : '-'} • {previewFile?.name?.split('.').pop()?.toUpperCase()}
                                            </p>
                                        </div>
                                        {previewUrl ? (
                                            <a
                                                href={previewUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                            >
                                                <Eye size={16} />
                                                <span>Preview</span>
                                            </a>
                                        ) : (
                                            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400">
                                                <Eye size={16} />
                                                <span>Preview</span>
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                                        <div><span className="font-semibold text-slate-700">Category:</span> {selectedCategory || 'Document'}</div>
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Enter Document Title</h4>
                                    <input
                                        type="text"
                                        value={customDocTitle}
                                        onChange={(e) => setCustomDocTitle(e.target.value)}
                                        placeholder="e.g., B.Tech Degree Certificate"
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && customDocTitle.trim()) {
                                                handleConfirmUpload();
                                            }
                                        }}
                                    />
                                </div>

                                <div className="mt-5 flex gap-3">
                                    <Button
                                        onClick={handleConfirmUpload}
                                        disabled={!customDocTitle.trim()}
                                        isLoading={isUploading}
                                        className="flex-1"
                                    >
                                        Upload
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={handleCancelUpload}
                                        disabled={isUploading}
                                        className="flex-1 border border-slate-200"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        );
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

    const getStatusBadge = (status) => {
        const badgeBase = "px-3 py-1.5 rounded-full text-[11px] font-bold border flex items-center shadow-sm transition-all";
        switch (status) {
            case 'Approved':
                return <span className={`${badgeBase} bg-emerald-50 text-emerald-700 border-emerald-200`}><CheckCircle size={14} className="mr-1.5 flex-shrink-0" /> Approved</span>;
            case 'Pending Approval':
                return <span className={`${badgeBase} bg-amber-50 text-amber-700 border-amber-200`}><AlertCircle size={14} className="mr-1.5 flex-shrink-0" /> Pending Approval</span>;
            case 'Rejected':
                return <span className={`${badgeBase} bg-red-50 text-red-700 border-red-200`}><X size={14} className="mr-1.5 flex-shrink-0" /> Rejected</span>;
            default:
                return <span className={`${badgeBase} bg-slate-50 text-slate-600 border-slate-200`}>Draft</span>;
        }
    };

    const renderHRIS = () => {
        if (!profile) return null;
        const isEditing = editMode === 'hris';
        const isAdmin = currentUser?.roles?.some(r => r === 'Admin' || r?.name === 'Admin');
        const _isManager = profile.employment?.reportingManager?._id === currentUser?._id || profile.employment?.reportingManager === currentUser?._id;
        const hrisStatus = profile.hris?.status || 'Draft';

        // showPending: highlight changed fields in red when an admin is reviewing
        const pend = pendingUpdates || {};
        const showPending = !!(canApprove && !isSelf && !isEditing && pendingUpdates);

        return (
            <div className="space-y-8 bg-white p-4 md:p-8 rounded-xl border border-slate-200 shadow-sm transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 -m-4 md:-m-8 p-4 md:p-6 mb-12 border-b border-slate-200 rounded-t-xl gap-4">
                    <div className="flex items-center space-x-4">
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">EIS Information Form</h2>
                            <div className="mt-4 flex items-center gap-4">
                                {getStatusBadge(hrisStatus)}
                                {profile.hris?.submittedAt && (
                                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                                        Submitted: {format(new Date(profile.hris.submittedAt), 'dd MMM yyyy')}
                                    </span>
                                )}
                            </div>
                            {hrisStatus === 'Rejected' && profile.hris?.rejectionReason && (
                                <div className="mt-4 bg-red-50/50 p-3 rounded-lg border border-red-100/50 flex items-start gap-2 max-w-xl">
                                    <AlertCircle size={14} className="text-red-500 mt-0.5" />
                                    <p className="text-xs text-red-700 leading-relaxed font-medium">
                                        <span className="font-bold">Rejection Reason:</span> {profile.hris.rejectionReason}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Admin Action: Export */}



                        {/* Edit Action: blocked when Pending Approval for non-admins */}
                        {!isEditing && (hrisStatus === 'Draft' || hrisStatus === 'Rejected' || hrisStatus === 'Approved') && (
                            <div className="flex space-x-2">
                                <Button onClick={() => setEditMode('hris')} className="flex items-center text-xs px-3 py-1.5 h-8">
                                    <Save size={14} className="mr-1.5" /> Edit Form
                                </Button>
                            </div>
                        )}
                        {!isEditing && hrisStatus === 'Pending Approval' && isAdmin && (
                            <div className="flex space-x-2">
                                <Button onClick={() => setEditMode('hris')} className="flex items-center text-xs px-3 py-1.5 h-8">
                                    <Save size={14} className="mr-1.5" /> Edit Form
                                </Button>
                            </div>
                        )}
                        {!isEditing && hrisStatus === 'Pending Approval' && !isAdmin && isSelf && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700">
                                <Clock size={13} /> Under Review
                            </span>
                        )}

                        {/* Manager/Admin Approvals */}
                        {canApprove && !isSelf && hrisStatus === 'Pending Approval' && !isEditing && (
                            <div className="flex space-x-2">
                                <Button
                                    onClick={() => handleHRISApproveOther(userId)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center text-xs px-3 py-1.5 h-8"
                                >
                                    <CheckCircle size={14} className="mr-1.5" /> Approve EIS
                                </Button>
                                <Button
                                    onClick={() => handleHRISRejectOther(userId)}
                                    className="bg-red-600 hover:bg-red-700 text-white flex items-center text-xs px-3 py-1.5 h-8"
                                >
                                    <X size={14} className="mr-1.5" /> Reject EIS
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── OLD vs NEW DIFF PANEL ─────────────────────────────── */}
                {pendingUpdates && (() => {
                    const live = profile;
                    const pend = pendingUpdates;

                    const fmtAddr = (addr) => {
                        if (!addr) return '';
                        const l1 = addr.line1 || addr.street;
                        const parts = [l1, addr.addressLine2, addr.city, addr.state, addr.zipCode, addr.country];
                        if (addr.type === 'Current' && addr.phone) {
                            parts.push(`Phone: ${addr.phone}`);
                        }
                        return parts.filter(Boolean).join(', ');
                    };

                    // Collect all changed fields across all sections
                    const personalFields = [
                        { label: 'Full Name', old: live.personal?.fullName, new: pend.personal?.fullName },
                        { label: 'First Name', old: live.personal?.firstName, new: pend.personal?.firstName },
                        { label: 'Middle Name', old: live.personal?.middleName, new: pend.personal?.middleName },
                        { label: 'Last Name', old: live.personal?.lastName, new: pend.personal?.lastName },
                        { label: 'Gender', old: live.personal?.gender, new: pend.personal?.gender },
                        { label: 'Date of Birth', old: live.personal?.dob, new: pend.personal?.dob, type: 'date' },
                        { label: 'Marital Status', old: live.personal?.maritalStatus, new: pend.personal?.maritalStatus },
                        { label: 'Date of Marriage', old: live.personal?.dateOfMarriage, new: pend.personal?.dateOfMarriage, type: 'date' },
                        { label: 'Nationality', old: live.personal?.nationality, new: pend.personal?.nationality },
                        { label: 'Blood Group', old: live.personal?.bloodGroup, new: pend.personal?.bloodGroup },
                        { label: 'Disability Status', old: live.personal?.disabilityStatus ? 'Yes' : 'No', new: pend.personal?.disabilityStatus === undefined ? undefined : (pend.personal?.disabilityStatus ? 'Yes' : 'No') },
                        { label: 'Nature of disability', old: live.personal?.disabilityDetails, new: pend.personal?.disabilityDetails }
                    ];
                    const contactFields = [
                        { label: 'Personal Email', old: live.contact?.personalEmail, new: pend.contact?.personalEmail },
                        { label: 'Work Email', old: live.contact?.workEmail, new: pend.contact?.workEmail },
                        { label: 'Mobile Number', old: live.contact?.mobileNumber, new: pend.contact?.mobileNumber },
                        { label: 'Alternate Number', old: live.contact?.alternateNumber, new: pend.contact?.alternateNumber },
                        { label: 'Emergency Contact Name', old: live.contact?.emergencyContact?.name, new: pend.contact?.emergencyContact?.name },
                        { label: 'Emergency Contact Relation', old: live.contact?.emergencyContact?.relation, new: pend.contact?.emergencyContact?.relation },
                        { label: 'Emergency Contact Phone', old: live.contact?.emergencyContact?.phone, new: pend.contact?.emergencyContact?.phone },
                        { label: 'Emergency Contact Alternate Phone', old: live.contact?.emergencyContact?.alternatePhone, new: pend.contact?.emergencyContact?.alternatePhone },
                        { label: 'Emergency Contact Email', old: live.contact?.emergencyContact?.email, new: pend.contact?.emergencyContact?.email },
                        { label: 'Current Address', old: fmtAddr(live.contact?.addresses?.find(a => a.type === 'Current')), new: pend.contact?.addresses ? fmtAddr(pend.contact.addresses.find(a => a.type === 'Current')) : undefined },
                        { label: 'Permanent Address', old: fmtAddr(live.contact?.addresses?.find(a => a.type === 'Permanent')), new: pend.contact?.addresses ? fmtAddr(pend.contact.addresses.find(a => a.type === 'Permanent')) : undefined }
                    ];
                    const identityFields = [
                        { label: 'PAN Card Number', old: live.identity?.panNumber, new: pend.identity?.panNumber },
                        { label: 'Aadhaar Card Number', old: live.identity?.aadhaarNumber, new: pend.identity?.aadhaarNumber },
                        { label: 'Passport Number', old: live.identity?.passportNumber, new: pend.identity?.passportNumber },
                    ];
                    const familyFields = [
                        { label: "Father's Name", old: live.family?.fatherName, new: pend.family?.fatherName },
                        { label: "Father's Occupation", old: live.family?.fatherOccupation, new: pend.family?.fatherOccupation },
                        { label: "Mother's Name", old: live.family?.motherName, new: pend.family?.motherName },
                        { label: "Mother's Occupation", old: live.family?.motherOccupation, new: pend.family?.motherOccupation },
                        { label: "Parents Marital Status", old: live.family?.parentsMaritalStatus, new: pend.family?.parentsMaritalStatus },
                        { label: "Total Siblings", old: live.family?.totalSiblings, new: pend.family?.totalSiblings },
                        { label: "Spouse Name", old: live.family?.spouseName, new: pend.family?.spouseName },
                        { label: "Spouse DOB", old: live.family?.spouseDob, new: pend.family?.spouseDob, type: 'date' },
                        {
                            label: "Children Details",
                            old: (live.family?.children || []).map(c => `${c.name} (${c.dob ? format(new Date(c.dob), 'dd MMM yyyy') : 'No DOB'})`).join(', ') || 'No Children',
                            new: pend.family?.children === undefined ? undefined : ((pend.family?.children || []).map(c => `${c.name} (${c.dob ? format(new Date(c.dob), 'dd MMM yyyy') : 'No DOB'})`).join(', ') || 'No Children')
                        }
                    ];
                    const compensationFields = [
                        {
                            label: 'UAN Applicable?',
                            old: live.compensation?.isUanApplicable === undefined ? undefined : (live.compensation?.isUanApplicable ? 'Yes' : 'No'),
                            new: pend.compensation?.isUanApplicable === undefined ? undefined : (pend.compensation?.isUanApplicable ? 'Yes' : 'No')
                        },
                        { label: 'UAN Number', old: live.compensation?.uanNumber, new: pend.compensation?.uanNumber },
                        { label: 'Bank Account Number', old: live.compensation?.bankDetails?.accountNumber, new: pend.compensation?.bankDetails?.accountNumber },
                        { label: 'IFSC Code', old: live.compensation?.bankDetails?.ifscCode, new: pend.compensation?.bankDetails?.ifscCode },
                        { label: 'Bank Name', old: live.compensation?.bankDetails?.bankName, new: pend.compensation?.bankDetails?.bankName },
                        { label: 'Account Holder Name', old: live.compensation?.bankDetails?.accountHolderName, new: pend.compensation?.bankDetails?.accountHolderName },
                        { label: 'Branch Address', old: live.compensation?.bankDetails?.branchAddress, new: pend.compensation?.bankDetails?.branchAddress },
                        {
                            label: 'PF Enabled',
                            old: live.compensation?.salaryBreakup?.pfEnabled !== false ? 'Yes' : 'No',
                            new: pend.compensation?.salaryBreakup?.pfEnabled === undefined ? undefined : (pend.compensation?.salaryBreakup?.pfEnabled !== false ? 'Yes' : 'No')
                        },
                        {
                            label: 'Include PF in CTC',
                            old: live.compensation?.salaryBreakup?.includePfInCTC ? 'Yes' : 'No',
                            new: pend.compensation?.salaryBreakup?.includePfInCTC === undefined ? undefined : (pend.compensation?.salaryBreakup?.includePfInCTC ? 'Yes' : 'No')
                        },
                        {
                            label: 'ESI Enabled',
                            old: live.compensation?.salaryBreakup?.esiEnabled !== false ? 'Yes' : 'No',
                            new: pend.compensation?.salaryBreakup?.esiEnabled === undefined ? undefined : (pend.compensation?.salaryBreakup?.esiEnabled !== false ? 'Yes' : 'No')
                        },
                        {
                            label: 'PT Enabled',
                            old: live.compensation?.salaryBreakup?.ptEnabled !== false ? 'Yes' : 'No',
                            new: pend.compensation?.salaryBreakup?.ptEnabled === undefined ? undefined : (pend.compensation?.salaryBreakup?.ptEnabled !== false ? 'Yes' : 'No')
                        },
                        {
                            label: 'LWF Enabled',
                            old: live.compensation?.salaryBreakup?.lwfEnabled !== false ? 'Yes' : 'No',
                            new: pend.compensation?.salaryBreakup?.lwfEnabled === undefined ? undefined : (pend.compensation?.salaryBreakup?.lwfEnabled !== false ? 'Yes' : 'No')
                        },
                        {
                            label: 'Gratuity Enabled',
                            old: live.compensation?.salaryBreakup?.gratuityEnabled !== false ? 'Yes' : 'No',
                            new: pend.compensation?.salaryBreakup?.gratuityEnabled === undefined ? undefined : (pend.compensation?.salaryBreakup?.gratuityEnabled !== false ? 'Yes' : 'No')
                        },
                        {
                            label: 'Include Gratuity in CTC',
                            old: live.compensation?.salaryBreakup?.includeGratuityInCTC !== false ? 'Yes' : 'No',
                            new: pend.compensation?.salaryBreakup?.includeGratuityInCTC === undefined ? undefined : (pend.compensation?.salaryBreakup?.includeGratuityInCTC !== false ? 'Yes' : 'No')
                        },
                        {
                            label: 'Basic Override %',
                            old: live.compensation?.salaryBreakup?.basicPercent !== undefined ? `${live.compensation.salaryBreakup.basicPercent}%` : '50%',
                            new: pend.compensation?.salaryBreakup?.basicPercent === undefined ? undefined : `${pend.compensation.salaryBreakup.basicPercent}%`
                        },
                        {
                            label: 'HRA Override %',
                            old: live.compensation?.salaryBreakup?.hraPercent !== undefined ? `${live.compensation.salaryBreakup.hraPercent}%` : '50%',
                            new: pend.compensation?.salaryBreakup?.hraPercent === undefined ? undefined : `${pend.compensation.salaryBreakup.hraPercent}%`
                        }
                    ];

                    const safeFormatDate = (dStr) => {
                        if (!dStr) return '';
                        try {
                            return format(new Date(dStr), 'dd MMM yyyy');
                        } catch (e) {
                            return String(dStr);
                        }
                    };

                    const experienceFields = [
                        {
                            label: "Work Experience History",
                            old: (live.experience || []).map(e => `${e.companyName || 'Unknown Company'} (${e.designation || 'No Title'}): ${safeFormatDate(e.startDate) || 'No Start'} - ${safeFormatDate(e.endDate) || 'Present'}${e.reasonForLeaving ? `, Reason for leaving: ${e.reasonForLeaving}` : ''}`).join('; ') || 'No Work Experience',
                            new: pend.experience === undefined ? undefined : ((pend.experience || []).map(e => `${e.companyName || 'Unknown Company'} (${e.designation || 'No Title'}): ${safeFormatDate(e.startDate) || 'No Start'} - ${safeFormatDate(e.endDate) || 'Present'}${e.reasonForLeaving ? `, Reason for leaving: ${e.reasonForLeaving}` : ''}`).join('; ') || 'No Work Experience')
                        }
                    ];

                    const allSections = [
                        { name: 'Personal Details', fields: personalFields },
                        { name: 'Contact Details', fields: contactFields },
                        { name: 'Identity Details', fields: identityFields },
                        { name: 'Family Details', fields: familyFields },
                        { name: 'Bank & Compensation', fields: compensationFields },
                        { name: 'Work Experience', fields: experienceFields },
                    ];

                    const sectionsWithChanges = allSections
                        .filter(s => s.fields.some(f => {
                            if (f.new === undefined) return false;
                            const fmt = (v) => !v && v !== 0 ? '' : String(v);
                            return fmt(f.old) !== fmt(f.new);
                        }))
                        .map(s => ({
                            ...s,
                            fields: s.fields.filter(f => {
                                if (f.new === undefined) return false;
                                const fmt = (v) => !v && v !== 0 ? '' : String(v);
                                return fmt(f.old) !== fmt(f.new);
                            })
                        }));

                    if (sectionsWithChanges.length === 0) return null;

                    const isAdminViewer = canApprove && !isSelf;

                    return (
                        <div className={`rounded-xl border-2 p-5 mb-4 ${hrisStatus === 'Pending Approval'
                            ? 'border-amber-300 bg-amber-50/50'
                            : 'border-slate-200 bg-slate-50'
                            }`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <GitCompare size={18} className="text-amber-600" />
                                    <h3 className="font-bold text-slate-800 text-sm">
                                        {isAdminViewer ? 'Proposed Changes — Review Required' : 'Your Pending Changes'}
                                    </h3>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-100 px-2 py-1 rounded-full border border-amber-200">
                                    Awaiting Approval
                                </span>
                            </div>

                            {isAdminViewer && (
                                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                    The employee has submitted changes. Review each field below (🔴 old → 🟢 new) before approving or rejecting.
                                </p>
                            )}
                            {!isAdminViewer && (
                                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                    These changes are awaiting HR approval. Your profile currently shows your last approved values — the new values will go live once approved.
                                </p>
                            )}

                            <div className="space-y-5">
                                {sectionsWithChanges.map(section => (
                                    <div key={section.name}>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">
                                            {section.name}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {section.fields.map(f => (
                                                <DiffField
                                                    key={f.label}
                                                    label={f.label}
                                                    oldValue={f.old}
                                                    newValue={f.new}
                                                    type={f.type}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Admin Approve/Reject directly from diff panel */}
                            {isAdminViewer && hrisStatus === 'Pending Approval' && (
                                <div className="flex gap-3 mt-5 pt-4 border-t border-amber-200">
                                    <Button
                                        onClick={() => handleHRISApproveOther(userId)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center text-xs px-4 py-2"
                                    >
                                        <CheckCircle size={14} className="mr-1.5" /> Approve Changes
                                    </Button>
                                    <Button
                                        onClick={() => handleHRISRejectOther(userId)}
                                        className="bg-red-600 hover:bg-red-700 text-white flex items-center text-xs px-4 py-2"
                                    >
                                        <X size={14} className="mr-1.5" /> Reject Changes
                                    </Button>
                                </div>
                            )}
                        </div>
                    );
                })()}
                {/* ─────────────────────────────────────────────────────────── */}

                <div className="grid grid-cols-1 gap-6 py-12">
                    <p className="text-xs text-red-500 italic px-1">* fields are mandatory</p>
                    {/* 1. Basic Details */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                            <User size={18} className="text-blue-500" />
                            <h3 className="font-bold text-slate-700">1. Basic Employee Details</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
                            <Field section="user" isEditing={false} label="Employee Code" field="employeeCode" value={profile.user?.employeeCode} />
                            <PendingHighlight show={showPending} label="Personal Email" liveValue={profile.contact?.personalEmail} pendingValue={pend.contact?.personalEmail}>
                                <Field section="contact" isEditing={isEditing} label="Personal Email" field="personalEmail" value={profile.contact?.personalEmail} formData={formData} onChange={handleInputChange} required error={validationErrors['contact.personalEmail']} />
                            </PendingHighlight>
                            <PendingHighlight show={showPending} label="Work Email" liveValue={profile.contact?.workEmail} pendingValue={pend.contact?.workEmail}>
                                <Field section="contact" isEditing={isEditing} label="Work Email" field="workEmail" value={profile.contact?.workEmail || profile.user?.email} formData={formData} onChange={handleInputChange} />
                            </PendingHighlight>
                            <PendingHighlight show={showPending} label="PAN Card Number" liveValue={profile.identity?.panNumber} pendingValue={pend.identity?.panNumber}>
                                <Field section="identity" isEditing={isEditing} label="PAN Card Number" field="panNumber" value={profile.identity?.panNumber} formData={formData} onChange={handleInputChange} required error={validationErrors['identity.panNumber']} />
                            </PendingHighlight>
                            <PendingHighlight show={showPending} label="Aadhaar Card Number" liveValue={profile.identity?.aadhaarNumber} pendingValue={pend.identity?.aadhaarNumber}>
                                <Field section="identity" isEditing={isEditing} label="Aadhaar Card Number" field="aadhaarNumber" value={profile.identity?.aadhaarNumber} formData={formData} onChange={handleInputChange} required error={validationErrors['identity.aadhaarNumber']} />
                            </PendingHighlight>
                            <PendingHighlight show={showPending} label="Passport Number" liveValue={profile.identity?.passportNumber} pendingValue={pend.identity?.passportNumber}>
                                <Field section="identity" isEditing={isEditing} label="Passport Number" field="passportNumber" value={profile.identity?.passportNumber} formData={formData} onChange={handleInputChange} />
                            </PendingHighlight>
                        </div>
                    </div>

                    {/* 2. Name Details */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                            <User size={18} className="text-blue-500" />
                            <h3 className="font-bold text-slate-700">2. Name Details</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <PendingHighlight show={showPending} label="Full Name" liveValue={profile.personal?.fullName} pendingValue={pend.personal?.fullName}>
                                <Field section="personal" isEditing={isEditing} label="Full Name" field="fullName" value={profile.personal?.fullName} formData={formData} onChange={handleInputChange} required error={validationErrors['personal.fullName']} />
                            </PendingHighlight>
                            <PendingHighlight show={showPending} label="First Name" liveValue={profile.personal?.firstName} pendingValue={pend.personal?.firstName}>
                                <Field section="personal" isEditing={isEditing} label="First Name" field="firstName" value={profile.personal?.firstName} formData={formData} onChange={handleInputChange} required error={validationErrors['personal.firstName']} />
                            </PendingHighlight>
                            <PendingHighlight show={showPending} label="Middle Name" liveValue={profile.personal?.middleName} pendingValue={pend.personal?.middleName}>
                                <Field section="personal" isEditing={isEditing} label="Middle Name" field="middleName" value={profile.personal?.middleName} formData={formData} onChange={handleInputChange} />
                            </PendingHighlight>
                            <PendingHighlight show={showPending} label="Last Name" liveValue={profile.personal?.lastName} pendingValue={pend.personal?.lastName}>
                                <Field section="personal" isEditing={isEditing} label="Last Name" field="lastName" value={profile.personal?.lastName} formData={formData} onChange={handleInputChange} required error={validationErrors['personal.lastName']} />
                            </PendingHighlight>
                        </div>
                    </div>

                    {/* 3. Personal Info */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                            <Calendar size={18} className="text-blue-500" />
                            <h3 className="font-bold text-slate-700">3. Personal Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <PendingHighlight show={showPending} label="Gender" liveValue={profile.personal?.gender} pendingValue={pend.personal?.gender}>
                                <Field section="personal" isEditing={isEditing} label="Gender" field="gender" value={profile.personal?.gender} options={['Male', 'Female', 'Other']} formData={formData} onChange={handleInputChange} required error={validationErrors['personal.gender']} />
                            </PendingHighlight>
                            <PendingHighlight show={showPending} label="Date of Birth" liveValue={profile.personal?.dob} pendingValue={pend.personal?.dob} type="date">
                                <Field section="personal" isEditing={isEditing} label="Date of Birth" field="dob" type="date" value={profile.personal?.dob} formData={formData} onChange={handleInputChange} required error={validationErrors['personal.dob']} />
                            </PendingHighlight>
                            <Field section="employment" isEditing={false} label="Date of Joining" field="joiningDate" type="date" value={profile.employment?.joiningDate} />
                            <PendingHighlight show={showPending} label="Marital Status" liveValue={profile.personal?.maritalStatus} pendingValue={pend.personal?.maritalStatus}>
                                <Field section="personal" isEditing={isEditing} label="Marital Status" field="maritalStatus" value={profile.personal?.maritalStatus} options={['Single', 'Married', 'Divorced', 'Widowed']} formData={formData} onChange={handleInputChange} required error={validationErrors['personal.maritalStatus']} />
                            </PendingHighlight>
                            {(formData.personal?.maritalStatus === 'Married' || (!isEditing && profile.personal?.maritalStatus === 'Married')) && (
                                <PendingHighlight show={showPending} label="Date of Marriage" liveValue={profile.personal?.dateOfMarriage} pendingValue={pend.personal?.dateOfMarriage} type="date">
                                    <Field section="personal" isEditing={isEditing} label="Date of Marriage" field="dateOfMarriage" type="date" value={profile.personal?.dateOfMarriage} formData={formData} onChange={handleInputChange} />
                                </PendingHighlight>
                            )}
                            <PendingHighlight show={showPending} label="Nationality" liveValue={profile.personal?.nationality} pendingValue={pend.personal?.nationality}>
                                <Field section="personal" isEditing={isEditing} label="Nationality" field="nationality" value={profile.personal?.nationality} formData={formData} onChange={handleInputChange} required error={validationErrors['personal.nationality']} />
                            </PendingHighlight>
                            <PendingHighlight show={showPending} label="Blood Group" liveValue={profile.personal?.bloodGroup} pendingValue={pend.personal?.bloodGroup}>
                                <Field section="personal" isEditing={isEditing} label="Blood Group" field="bloodGroup" value={profile.personal?.bloodGroup} formData={formData} onChange={handleInputChange} required error={validationErrors['personal.bloodGroup']} />
                            </PendingHighlight>
                            <PendingHighlight show={showPending} label="Disability Status" liveValue={profile.personal?.disabilityStatus ? 'Yes' : 'No'} pendingValue={pend.personal?.disabilityStatus === undefined ? undefined : (pend.personal?.disabilityStatus ? 'Yes' : 'No')}>
                                <Field
                                    section="personal" isEditing={isEditing} label="Disability Status" field="disabilityStatus"
                                    value={profile.personal?.disabilityStatus ? 'Yes' : 'No'}
                                    valueOverride={formData.personal?.disabilityStatus ? 'Yes' : 'No'}
                                    options={['No', 'Yes']} formData={formData}
                                    onChangeOverride={(e) => {
                                        const value = e.target.value === 'Yes';
                                        handleInputChange('personal', 'disabilityStatus', value);
                                        setValidationErrors(prev => {
                                            const next = { ...prev };
                                            delete next['personal.disabilityStatus'];
                                            if (!value) delete next['personal.disabilityDetails'];
                                            return next;
                                        });
                                    }}
                                    required
                                    error={validationErrors['personal.disabilityStatus']}
                                />
                            </PendingHighlight>
                            {(formData.personal?.disabilityStatus === true || (!isEditing && profile.personal?.disabilityStatus === true)) && (
                                <PendingHighlight show={showPending} label="Nature of disability" liveValue={profile.personal?.disabilityDetails} pendingValue={pend.personal?.disabilityDetails}>
                                    <Field section="personal" isEditing={isEditing} label="Nature of disability" field="disabilityDetails" value={profile.personal?.disabilityDetails} formData={formData} onChange={handleInputChange} required error={validationErrors['personal.disabilityDetails']} />
                                </PendingHighlight>
                            )}
                        </div>
                    </div>



                    {/* 4. Addresses */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                            <FileText size={18} className="text-blue-500" />
                            <h3 className="font-bold text-slate-700">4. Address Details</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {['Current', 'Permanent', 'Mailing'].map(type => {
                                const isCurrentOrPerm = ['Current', 'Permanent'].includes(type);
                                return (
                                    <div key={type} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200/50">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{type} Address</h4>
                                            {type === 'Permanent' && isEditing && (
                                                <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                const current = formData.contact?.addresses?.find(a => a.type === 'Current') || {};
                                                                setFormData(prev => {
                                                                    const currentAddresses = prev.contact?.addresses || [];
                                                                    const permIndex = currentAddresses.findIndex(a => a.type === 'Permanent');
                                                                    const permAddr = {
                                                                        type: 'Permanent',
                                                                        line1: current.line1 || current.street,
                                                                        addressLine2: current.addressLine2,
                                                                        city: current.city,
                                                                        state: current.state,
                                                                        zipCode: current.zipCode,
                                                                        country: current.country
                                                                    };
                                                                    let newAddresses = [...currentAddresses];
                                                                    if (permIndex >= 0) {
                                                                        newAddresses[permIndex] = permAddr;
                                                                    } else {
                                                                        newAddresses.push(permAddr);
                                                                    }
                                                                    return {
                                                                        ...prev,
                                                                        contact: { ...prev.contact, addresses: newAddresses },
                                                                        hris: { ...prev.hris, isDeclared: false }
                                                                    };
                                                                });
                                                                setValidationErrors(prev => {
                                                                    const next = { ...prev };
                                                                    delete next['contact.addresses.Permanent.line1'];
                                                                    delete next['contact.addresses.Permanent.addressLine2'];
                                                                    delete next['contact.addresses.Permanent.city'];
                                                                    delete next['contact.addresses.Permanent.state'];
                                                                    delete next['contact.addresses.Permanent.zipCode'];
                                                                    delete next['contact.addresses.Permanent.country'];
                                                                    return next;
                                                                });
                                                            }
                                                        }}
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="font-semibold text-slate-600">Same as Current</span>
                                                </label>
                                            )}
                                        </div>
                                        <div className="space-y-6">
                                            <Field section="contact" isEditing={isEditing} label="Line 1" field={`${type}_line1`}
                                                value={profile.contact?.addresses?.find(a => a.type === type)?.line1 || profile.contact?.addresses?.find(a => a.type === type)?.street}
                                                valueOverride={formData.contact?.addresses?.find(a => a.type === type)?.line1 ?? formData.contact?.addresses?.find(a => a.type === type)?.street}
                                                onChangeOverride={(e) => handleAddressChange(type, 'line1', e.target.value)}
                                                required={isCurrentOrPerm}
                                                error={validationErrors[`contact.addresses.${type}.line1`]}
                                            />
                                            <Field section="contact" isEditing={isEditing} label="Line 2" field={`${type}_line2`}
                                                value={profile.contact?.addresses?.find(a => a.type === type)?.addressLine2}
                                                valueOverride={formData.contact?.addresses?.find(a => a.type === type)?.addressLine2}
                                                onChangeOverride={(e) => handleAddressChange(type, 'addressLine2', e.target.value)}
                                                required={isCurrentOrPerm}
                                                error={validationErrors[`contact.addresses.${type}.addressLine2`]}
                                            />
                                            <Field section="contact" isEditing={isEditing} label="City" field={`${type}_city`}
                                                value={profile.contact?.addresses?.find(a => a.type === type)?.city}
                                                valueOverride={formData.contact?.addresses?.find(a => a.type === type)?.city}
                                                onChangeOverride={(e) => handleAddressChange(type, 'city', e.target.value)}
                                                required={isCurrentOrPerm}
                                                error={validationErrors[`contact.addresses.${type}.city`]}
                                            />
                                            <Field section="contact" isEditing={isEditing} label="State" field={`${type}_state`}
                                                value={profile.contact?.addresses?.find(a => a.type === type)?.state}
                                                valueOverride={formData.contact?.addresses?.find(a => a.type === type)?.state}
                                                onChangeOverride={(e) => handleAddressChange(type, 'state', e.target.value)}
                                                required={isCurrentOrPerm}
                                                error={validationErrors[`contact.addresses.${type}.state`]}
                                            />
                                            <Field section="contact" isEditing={isEditing} label="Zip Code" field={`${type}_zip`}
                                                value={profile.contact?.addresses?.find(a => a.type === type)?.zipCode}
                                                valueOverride={formData.contact?.addresses?.find(a => a.type === type)?.zipCode}
                                                onChangeOverride={(e) => handleAddressChange(type, 'zipCode', e.target.value)}
                                                required={isCurrentOrPerm}
                                                error={validationErrors[`contact.addresses.${type}.zipCode`]}
                                            />
                                            <Field section="contact" isEditing={isEditing} label="Country" field={`${type}_country`}
                                                value={profile.contact?.addresses?.find(a => a.type === type)?.country}
                                                valueOverride={formData.contact?.addresses?.find(a => a.type === type)?.country}
                                                onChangeOverride={(e) => handleAddressChange(type, 'country', e.target.value)}
                                                required={isCurrentOrPerm}
                                                error={validationErrors[`contact.addresses.${type}.country`]}
                                            />
                                            {type === 'Current' && (
                                                <Field section="contact" isEditing={isEditing} label="Phone" field="Current_phone"
                                                    value={profile.contact?.addresses?.find(a => a.type === 'Current')?.phone}
                                                    valueOverride={formData.contact?.addresses?.find(a => a.type === 'Current')?.phone}
                                                    maxLength={10}
                                                    error={validationErrors['contact.addresses.Current.phone'] || (formData.contact?.addresses?.find(a => a.type === 'Current')?.phone?.length > 0 && formData.contact?.addresses?.find(a => a.type === 'Current')?.phone?.length < 10 ? 'Must be 10 digits' : null)}
                                                    onChangeOverride={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        handleAddressChange('Current', 'phone', val);
                                                    }}
                                                    required
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 5. Contact Details */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                            <Shield size={18} className="text-blue-500" />
                            <h3 className="font-bold text-slate-700">5. Contact Details</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <PendingHighlight show={showPending} label="Personal Mobile" liveValue={profile.contact?.mobileNumber} pendingValue={pend.contact?.mobileNumber}>
                                <Field
                                    section="contact" isEditing={isEditing} label="Personal Mobile" field="mobileNumber"
                                    value={profile.contact?.mobileNumber} formData={formData}
                                    maxLength={10}
                                    error={validationErrors['contact.mobileNumber'] || (formData.contact?.mobileNumber?.length > 0 && formData.contact?.mobileNumber?.length < 10 ? 'Must be 10 digits' : null)}
                                    onChangeOverride={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        handleInputChange('contact', 'mobileNumber', val);
                                    }}
                                    required
                                />
                            </PendingHighlight>
                            <PendingHighlight show={showPending} label="Alternate Mobile" liveValue={profile.contact?.alternateNumber} pendingValue={pend.contact?.alternateNumber}>
                                <Field
                                    section="contact" isEditing={isEditing} label="Alternate Mobile Number" field="alternateNumber"
                                    value={profile.contact?.alternateNumber} formData={formData}
                                    maxLength={10}
                                    error={validationErrors['contact.alternateNumber'] || (formData.contact?.alternateNumber?.length > 0 && formData.contact?.alternateNumber?.length < 10 ? 'Must be 10 digits' : null)}
                                    onChangeOverride={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        handleInputChange('contact', 'alternateNumber', val);
                                    }}
                                    required
                                />
                            </PendingHighlight>
                            <PendingHighlight show={showPending} label="Landline Number" liveValue={profile.contact?.landlineNumber} pendingValue={pend.contact?.landlineNumber}>
                                <Field section="contact" isEditing={isEditing} label="Landline Number" field="landlineNumber" value={profile.contact?.landlineNumber} formData={formData} onChange={handleInputChange} />
                            </PendingHighlight>
                        </div>

                        {/* Emergency Contact Sub-section */}
                        <div className="pt-4 border-t border-slate-100">
                            <h4 className="text-sm font-bold text-slate-700 mb-4">Emergency Contact</h4>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <PendingHighlight show={showPending} label="Emergency Contact Name" liveValue={profile.contact?.emergencyContact?.name} pendingValue={pend.contact?.emergencyContact?.name}>
                                    <Field
                                        section="contact" isEditing={isEditing}
                                        label="Name" field="EC_name"
                                        value={profile.contact?.emergencyContact?.name}
                                        valueOverride={formData.contact?.emergencyContact?.name}
                                        onChangeOverride={(e) => handleEmergencyChange('name', e.target.value)}
                                        formData={formData} onChange={handleInputChange}
                                        required
                                        error={validationErrors['contact.emergencyContact.name']}
                                    />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Emergency Contact Relation" liveValue={profile.contact?.emergencyContact?.relation} pendingValue={pend.contact?.emergencyContact?.relation}>
                                    <Field
                                        section="contact" isEditing={isEditing}
                                        label="Relation" field="EC_relation"
                                        value={profile.contact?.emergencyContact?.relation}
                                        valueOverride={formData.contact?.emergencyContact?.relation}
                                        onChangeOverride={(e) => handleEmergencyChange('relation', e.target.value)}
                                        formData={formData} onChange={handleInputChange}
                                        required
                                        error={validationErrors['contact.emergencyContact.relation']}
                                    />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Emergency Contact Phone" liveValue={profile.contact?.emergencyContact?.phone} pendingValue={pend.contact?.emergencyContact?.phone}>
                                    <Field
                                        section="contact" isEditing={isEditing}
                                        label="Phone" field="EC_phone"
                                        value={profile.contact?.emergencyContact?.phone}
                                        valueOverride={formData.contact?.emergencyContact?.phone}
                                        maxLength={10}
                                        error={validationErrors['contact.emergencyContact.phone'] || (formData.contact?.emergencyContact?.phone?.length > 0 && formData.contact?.emergencyContact?.phone?.length < 10 ? 'Must be 10 digits' : null)}
                                        onChangeOverride={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            handleEmergencyChange('phone', val);
                                        }}
                                        formData={formData} onChange={handleInputChange}
                                        required
                                    />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Emergency Contact Alternate Phone" liveValue={profile.contact?.emergencyContact?.alternatePhone} pendingValue={pend.contact?.emergencyContact?.alternatePhone}>
                                    <Field
                                        section="contact" isEditing={isEditing}
                                        label="Alternate Phone" field="EC_alternatePhone"
                                        value={profile.contact?.emergencyContact?.alternatePhone}
                                        valueOverride={formData.contact?.emergencyContact?.alternatePhone}
                                        maxLength={10}
                                        error={validationErrors['contact.emergencyContact.alternatePhone'] || (formData.contact?.emergencyContact?.alternatePhone?.length > 0 && formData.contact?.emergencyContact?.alternatePhone?.length < 10 ? 'Must be 10 digits' : null)}
                                        onChangeOverride={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            handleEmergencyChange('alternatePhone', val);
                                        }}
                                        formData={formData} onChange={handleInputChange}
                                        required
                                    />
                                </PendingHighlight>
                                <PendingHighlight show={showPending} label="Emergency Contact Email" liveValue={profile.contact?.emergencyContact?.email} pendingValue={pend.contact?.emergencyContact?.email}>
                                    <Field
                                        section="contact" isEditing={isEditing}
                                        label="Email" field="EC_email"
                                        value={profile.contact?.emergencyContact?.email}
                                        valueOverride={formData.contact?.emergencyContact?.email}
                                        onChangeOverride={(e) => handleEmergencyChange('email', e.target.value)}
                                        formData={formData} onChange={handleInputChange}
                                    />
                                </PendingHighlight>
                            </div>
                        </div>
                    </div>

                    {/* 6. Family Details */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                            <User size={18} className="text-blue-500" />
                            <h3 className="font-bold text-slate-700">6. Medical Insurance / Family Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <Field section="family" isEditing={isEditing} label="Father's Name" field="fatherName" value={profile.family?.fatherName} formData={formData} onChange={handleInputChange} required error={validationErrors['family.fatherName']} />
                            <Field section="family" isEditing={isEditing} label="Father's Occupation" field="fatherOccupation" value={profile.family?.fatherOccupation} formData={formData} onChange={handleInputChange} />
                            <Field section="family" isEditing={isEditing} label="Mother's Name" field="motherName" value={profile.family?.motherName} formData={formData} onChange={handleInputChange} required error={validationErrors['family.motherName']} />
                            <Field section="family" isEditing={isEditing} label="Mother's Occupation" field="motherOccupation" value={profile.family?.motherOccupation} formData={formData} onChange={handleInputChange} />
                            <Field section="family" isEditing={isEditing} label="Marital Status" field="parentsMaritalStatus" value={profile.family?.parentsMaritalStatus} options={['Married', 'Divorced', 'Widowed', 'Separated']} formData={formData} onChange={handleInputChange} />
                            <Field section="family" isEditing={isEditing} label="Total Siblings" field="totalSiblings" type="number" value={profile.family?.totalSiblings} formData={formData} onChange={handleInputChange} />
                            <Field section="family" isEditing={isEditing} label="Spouse Name" field="spouseName" value={profile.family?.spouseName} formData={formData} onChange={handleInputChange} required={formData.personal?.maritalStatus === 'Married' || (!isEditing && profile.personal?.maritalStatus === 'Married')} error={validationErrors['family.spouseName']} />
                            <Field section="family" isEditing={isEditing} label="Spouse DOB" field="spouseDob" type="date" value={profile.family?.spouseDob} formData={formData} onChange={handleInputChange} />

                        </div>

                        {/* Children List */}
                        <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold text-slate-700">Children Details</h4>
                                {isEditing && (
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, family: { ...prev.family, children: [...(prev.family?.children || []), { name: '', dob: '' }] } }))}
                                        className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-200 hover:bg-emerald-100"
                                    >
                                        + Add Child
                                    </button>
                                )}
                            </div>
                            <div className="space-y-3">
                                {(formData.family?.children || profile.family?.children || []).map((child, idx) => (
                                    <div key={idx} className="flex gap-4 items-end bg-white p-3 rounded border border-slate-200">
                                        <div className="flex-1">
                                            <Field section="family" isEditing={isEditing} label="Child's Name" field={`child_${idx}_name`}
                                                value={child.name} valueOverride={formData.family?.children?.[idx]?.name}
                                                onChangeOverride={(e) => {
                                                    const newChildren = [...(formData.family?.children || [])];
                                                    newChildren[idx] = { ...newChildren[idx], name: e.target.value };
                                                    handleInputChange('family', 'children', newChildren);
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Field section="family" isEditing={isEditing} label="Date of Birth" field={`child_${idx}_dob`}
                                                value={child.dob} valueOverride={formData.family?.children?.[idx]?.dob} type="date"
                                                onChangeOverride={(e) => {
                                                    const newChildren = [...(formData.family?.children || [])];
                                                    newChildren[idx] = { ...newChildren[idx], dob: e.target.value };
                                                    handleInputChange('family', 'children', newChildren);
                                                }}
                                            />
                                        </div>
                                        {isEditing && (
                                            <button
                                                onClick={() => {
                                                    const newChildren = (formData.family?.children || []).filter((_, i) => i !== idx);
                                                    handleInputChange('family', 'children', newChildren);
                                                }}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 7. Education */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <div className="flex items-center space-x-2">
                                <FileText size={18} className="text-blue-500" />
                                <h3 className="font-bold text-slate-700">7. Educational Qualification</h3>
                            </div>
                            {isEditing && (
                                <button
                                    onClick={() => addArrayItem('education', { institution: '', degree: '', grade: '' })}
                                    className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-200"
                                >
                                    + Add Education
                                </button>
                            )}
                        </div>
                        <div className="space-y-6">
                            {(formData.education || profile.education || []).map((edu, idx) => (
                                <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex gap-6">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                                        <Field section="education" isEditing={isEditing} label="Institution" field={`inst_${idx}`}
                                            value={edu.institution} valueOverride={formData.education?.[idx]?.institution || edu.institution}
                                            onChangeOverride={(e) => handleArrayChange('education', idx, 'institution', e.target.value)}
                                        />
                                        <Field section="education" isEditing={isEditing} label="University" field={`univ_${idx}`}
                                            value={edu.university} valueOverride={formData.education?.[idx]?.university || edu.university}
                                            onChangeOverride={(e) => handleArrayChange('education', idx, 'university', e.target.value)}
                                        />
                                        <Field section="education" isEditing={isEditing} label="Degree" field={`deg_${idx}`}
                                            value={edu.degree} valueOverride={formData.education?.[idx]?.degree || edu.degree}
                                            onChangeOverride={(e) => handleArrayChange('education', idx, 'degree', e.target.value)}
                                        />
                                        <Field section="education" isEditing={isEditing} label="Course Name" field={`course_${idx}`}
                                            value={edu.courseName} valueOverride={formData.education?.[idx]?.courseName || edu.courseName}
                                            onChangeOverride={(e) => handleArrayChange('education', idx, 'courseName', e.target.value)}
                                        />
                                        <Field section="education" isEditing={isEditing} label="Grade/CGPA" field={`grade_${idx}`}
                                            value={edu.grade} valueOverride={formData.education?.[idx]?.grade || edu.grade}
                                            onChangeOverride={(e) => handleArrayChange('education', idx, 'grade', e.target.value)}
                                        />
                                        <Field section="education" isEditing={isEditing} label="College Rank" field={`rank_${idx}`}
                                            value={edu.collegeRank} valueOverride={formData.education?.[idx]?.collegeRank || edu.collegeRank}
                                            onChangeOverride={(e) => handleArrayChange('education', idx, 'collegeRank', e.target.value)}
                                        />
                                        <Field section="education" isEditing={isEditing} label="From Date" field={`from_${idx}`} type="date"
                                            value={edu.fromDate} valueOverride={formData.education?.[idx]?.fromDate || edu.fromDate}
                                            onChangeOverride={(e) => handleArrayChange('education', idx, 'fromDate', e.target.value)}
                                        />
                                        <Field section="education" isEditing={isEditing} label="To Date" field={`to_${idx}`} type="date"
                                            value={edu.toDate} valueOverride={formData.education?.[idx]?.toDate || edu.toDate}
                                            onChangeOverride={(e) => handleArrayChange('education', idx, 'toDate', e.target.value)}
                                        />
                                    </div>
                                    {isEditing && (
                                        <button onClick={() => removeArrayItem('education', idx)} className="self-center p-2 text-red-500"><Trash2 size={18} /></button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 8. Experience */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <div className="flex items-center space-x-2">
                                <Briefcase size={18} className="text-blue-500" />
                                <h3 className="font-bold text-slate-700">8. Work Experience</h3>
                            </div>
                            {isEditing && (
                                <button
                                    onClick={() => addArrayItem('experience', { companyName: '', designation: '', startDate: '', endDate: '', reasonForLeaving: '', totalExperience: '' })}
                                    className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-200"
                                >
                                    + Add Work History
                                </button>
                            )}
                        </div>
                        <div className="space-y-6">
                            {(formData.experience || profile.experience || []).map((exp, idx) => (
                                <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex gap-6">
                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 flex-1">
                                        <div className="md:col-span-2">
                                            <Field section="experience" isEditing={isEditing} label="Company Name" field={`comp_${idx}`}
                                                value={exp.companyName} valueOverride={formData.experience?.[idx]?.companyName ?? exp.companyName}
                                                onChangeOverride={(e) => handleArrayChange('experience', idx, 'companyName', e.target.value)}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <Field section="experience" isEditing={isEditing} label="Designation" field={`desig_${idx}`}
                                                value={exp.designation} valueOverride={formData.experience?.[idx]?.designation ?? exp.designation}
                                                onChangeOverride={(e) => handleArrayChange('experience', idx, 'designation', e.target.value)}
                                            />
                                        </div>
                                        <Field section="experience" isEditing={isEditing} label="Start Date" field={`start_${idx}`} type="date"
                                            value={exp.startDate} valueOverride={formData.experience?.[idx]?.startDate ?? exp.startDate}
                                            onChangeOverride={(e) => handleArrayChange('experience', idx, 'startDate', e.target.value)}
                                        />
                                        <Field section="experience" isEditing={isEditing} label="End Date" field={`end_${idx}`} type="date"
                                            value={exp.endDate} valueOverride={formData.experience?.[idx]?.endDate ?? exp.endDate}
                                            onChangeOverride={(e) => handleArrayChange('experience', idx, 'endDate', e.target.value)}
                                        />
                                        <div className="md:col-span-2">
                                            <Field section="experience" isEditing={isEditing} label="Total Work Experience" field={`total_${idx}`}
                                                value={exp.totalExperience} valueOverride={formData.experience?.[idx]?.totalExperience ?? exp.totalExperience}
                                                onChangeOverride={(e) => handleArrayChange('experience', idx, 'totalExperience', e.target.value)}
                                            />
                                        </div>
                                        <div className="md:col-span-4">
                                            <Field section="experience" isEditing={isEditing} label="Reason for Leaving" field={`leaving_${idx}`}
                                                value={exp.reasonForLeaving} valueOverride={formData.experience?.[idx]?.reasonForLeaving ?? exp.reasonForLeaving}
                                                onChangeOverride={(e) => handleArrayChange('experience', idx, 'reasonForLeaving', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    {isEditing && (
                                        <button onClick={() => removeArrayItem('experience', idx)} className="self-center p-2 text-red-500"><Trash2 size={18} /></button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 9. Skills */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                            <Shield size={18} className="text-blue-500" />
                            <h3 className="font-bold text-slate-700">9. Skills Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                {isEditing ? (
                                    <SkillsInput
                                        label="Technical Skills"
                                        skills={formData.skills?.technical || []}
                                        onUpdate={(newSkills) => handleInputChange('skills', 'technical', newSkills)}
                                        placeholder="e.g. React, Node.js"
                                    />
                                ) : (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Technical Skills</label>
                                        <div className="flex flex-wrap gap-2">
                                            {(profile.skills?.technical || []).map((s, i) => <span key={`${s}-${i}`} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs border border-blue-100">{s}</span>)}
                                            {profile.skills?.technical?.length === 0 && <span className="text-slate-400 italic text-sm">Not specified</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                {isEditing ? (
                                    <SkillsInput
                                        label="Behavioral Skills"
                                        skills={formData.skills?.behavioral || []}
                                        onUpdate={(newSkills) => handleInputChange('skills', 'behavioral', newSkills)}
                                        placeholder="e.g. Leadership, Teamwork"
                                    />
                                ) : (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Behavioral Skills</label>
                                        <div className="flex flex-wrap gap-2">
                                            {(profile.skills?.behavioral || []).map((s, i) => <span key={`${s}-${i}`} className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs border border-emerald-100">{s}</span>)}
                                            {profile.skills?.behavioral?.length === 0 && <span className="text-slate-400 italic text-sm">Not specified</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                {isEditing ? (
                                    <SkillsInput
                                        label="Skill you would like to learn"
                                        skills={formData.skills?.learningInterests || []}
                                        onUpdate={(newSkills) => handleInputChange('skills', 'learningInterests', newSkills)}
                                        placeholder="e.g. AI, Machine Learning"
                                    />
                                ) : (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Skill you would like to learn</label>
                                        <div className="flex flex-wrap gap-2">
                                            {(profile.skills?.learningInterests || []).map((s, i) => <span key={`${s}-${i}`} className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs border border-purple-100">{s}</span>)}
                                            {profile.skills?.learningInterests?.length === 0 && <span className="text-slate-400 italic text-sm">Not specified</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 10. Bank Account & UAN Details */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                            <DollarSign size={18} className="text-blue-500" />
                            <h3 className="font-bold text-slate-700">10. Bank Account & UAN Details</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <PendingHighlight
                                show={showPending}
                                label="UAN Applicable?"
                                liveValue={profile.compensation?.isUanApplicable ? 'Yes' : 'No'}
                                pendingValue={pend.compensation?.isUanApplicable === undefined ? undefined : (pend.compensation?.isUanApplicable ? 'Yes' : 'No')}
                            >
                                <Field
                                    section="compensation"
                                    isEditing={isEditing}
                                    label="UAN Applicable?"
                                    field="isUanApplicable"
                                    value={profile.compensation?.isUanApplicable ? 'Yes' : 'No'}
                                    valueOverride={formData.compensation?.isUanApplicable ? 'Yes' : 'No'}
                                    options={['No', 'Yes']}
                                    onChangeOverride={(e) => {
                                        const applicable = e.target.value === 'Yes';
                                        setFormData(prev => ({
                                            ...prev,
                                            compensation: {
                                                ...prev.compensation,
                                                isUanApplicable: applicable,
                                                uanNumber: applicable ? prev.compensation?.uanNumber : ''
                                            },
                                            hris: { ...prev.hris, isDeclared: false }
                                        }));
                                        setValidationErrors(prev => {
                                            const next = { ...prev };
                                            delete next['compensation.isUanApplicable'];
                                            delete next['compensation.uanNumber'];
                                            return next;
                                        });
                                    }}
                                    required
                                    error={validationErrors['compensation.isUanApplicable']}
                                />
                            </PendingHighlight>

                            {(formData.compensation?.isUanApplicable === true || (!isEditing && profile.compensation?.isUanApplicable === true)) && (
                                <PendingHighlight show={showPending} label="UAN Number" liveValue={profile.compensation?.uanNumber} pendingValue={pend.compensation?.uanNumber}>
                                    <Field
                                        section="compensation" isEditing={isEditing} label="UAN (Universal Account Number)" field="uanNumber"
                                        value={profile.compensation?.uanNumber}
                                        valueOverride={formData.compensation?.uanNumber}
                                        onChangeOverride={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setFormData(prev => ({ ...prev, compensation: { ...prev.compensation, uanNumber: val } }));
                                            setValidationErrors(prev => {
                                                const next = { ...prev };
                                                delete next['compensation.uanNumber'];
                                                return next;
                                            });
                                        }}
                                        maxLength={12}
                                        required
                                        error={validationErrors['compensation.uanNumber']}
                                    />
                                </PendingHighlight>
                            )}
                        </div>

                        {/* Bank Details Sub-grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-slate-100/50">
                            <PendingHighlight show={showPending} label="Account Number" liveValue={profile.compensation?.bankDetails?.accountNumber} pendingValue={pend.compensation?.bankDetails?.accountNumber}>
                                <Field
                                    section="compensation" isEditing={isEditing} label="Account Number" field="bankAccount"
                                    value={profile.compensation?.bankDetails?.accountNumber}
                                    valueOverride={formData.compensation?.bankDetails?.accountNumber}
                                    onChangeOverride={(e) => {
                                        setFormData(prev => ({ ...prev, compensation: { ...prev.compensation, bankDetails: { ...prev.compensation?.bankDetails, accountNumber: e.target.value } } }));
                                        setValidationErrors(prev => {
                                            const next = { ...prev };
                                            delete next['compensation.bankDetails.accountNumber'];
                                            return next;
                                        });
                                    }}
                                    required
                                    error={validationErrors['compensation.bankDetails.accountNumber']}
                                />
                            </PendingHighlight>
                            <PendingHighlight show={showPending} label="IFSC Code" liveValue={profile.compensation?.bankDetails?.ifscCode} pendingValue={pend.compensation?.bankDetails?.ifscCode}>
                                <Field
                                    section="compensation" isEditing={isEditing} label="IFSC Code" field="ifsc"
                                    value={profile.compensation?.bankDetails?.ifscCode}
                                    valueOverride={formData.compensation?.bankDetails?.ifscCode}
                                    onChangeOverride={(e) => {
                                        setFormData(prev => ({ ...prev, compensation: { ...prev.compensation, bankDetails: { ...prev.compensation?.bankDetails, ifscCode: e.target.value } } }));
                                        setValidationErrors(prev => {
                                            const next = { ...prev };
                                            delete next['compensation.bankDetails.ifscCode'];
                                            return next;
                                        });
                                    }}
                                    required
                                    error={validationErrors['compensation.bankDetails.ifscCode']}
                                />
                            </PendingHighlight>
                            <PendingHighlight show={showPending} label="Bank Name" liveValue={profile.compensation?.bankDetails?.bankName} pendingValue={pend.compensation?.bankDetails?.bankName}>
                                <Field
                                    section="compensation" isEditing={isEditing} label="Bank Name" field="bankName"
                                    value={profile.compensation?.bankDetails?.bankName}
                                    valueOverride={formData.compensation?.bankDetails?.bankName}
                                    onChangeOverride={(e) => {
                                        setFormData(prev => ({ ...prev, compensation: { ...prev.compensation, bankDetails: { ...prev.compensation?.bankDetails, bankName: e.target.value } } }));
                                        setValidationErrors(prev => {
                                            const next = { ...prev };
                                            delete next['compensation.bankDetails.bankName'];
                                            return next;
                                        });
                                    }}
                                    required
                                    error={validationErrors['compensation.bankDetails.bankName']}
                                />
                            </PendingHighlight>
                            <PendingHighlight show={showPending} label="Account Holder Name" liveValue={profile.compensation?.bankDetails?.accountHolderName} pendingValue={pend.compensation?.bankDetails?.accountHolderName}>
                                <Field
                                    section="compensation" isEditing={isEditing} label="Account Holder Name" field="holder"
                                    value={profile.compensation?.bankDetails?.accountHolderName}
                                    valueOverride={formData.compensation?.bankDetails?.accountHolderName}
                                    onChangeOverride={(e) => {
                                        setFormData(prev => ({ ...prev, compensation: { ...prev.compensation, bankDetails: { ...prev.compensation?.bankDetails, accountHolderName: e.target.value } } }));
                                        setValidationErrors(prev => {
                                            const next = { ...prev };
                                            delete next['compensation.bankDetails.accountHolderName'];
                                            return next;
                                        });
                                    }}
                                    required
                                    error={validationErrors['compensation.bankDetails.accountHolderName']}
                                />
                            </PendingHighlight>
                            <div className="md:col-span-2">
                                <PendingHighlight show={showPending} label="Branch Address" liveValue={profile.compensation?.bankDetails?.branchAddress} pendingValue={pend.compensation?.bankDetails?.branchAddress}>
                                    <Field
                                        section="compensation" isEditing={isEditing} label="Branch Address" field="branchAddress"
                                        value={profile.compensation?.bankDetails?.branchAddress}
                                        valueOverride={formData.compensation?.bankDetails?.branchAddress}
                                        onChangeOverride={(e) => {
                                            setFormData(prev => ({ ...prev, compensation: { ...prev.compensation, bankDetails: { ...prev.compensation?.bankDetails, branchAddress: e.target.value } } }));
                                            setValidationErrors(prev => {
                                                const next = { ...prev };
                                                delete next['compensation.bankDetails.branchAddress'];
                                                return next;
                                            });
                                        }}
                                        required
                                        error={validationErrors['compensation.bankDetails.branchAddress']}
                                    />
                                </PendingHighlight>
                            </div>
                        </div>
                    </div>
 
                     {/* 11. Declaration */}
                     <div className="mt-10 pt-10 border-t border-slate-200">
                         <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col items-center text-center">
                             <h3 className="font-bold text-slate-800 text-lg mb-2">11. Final Declaration</h3>
                             <p className="text-sm text-slate-600 max-w-2xl mb-6">
                                I hereby declare that all the information provided above is true and accurate to the best of my knowledge.
                                I understand that any false information may lead to disciplinary action or termination of employment.
                                In case of any future changes to the information provided, I will update the Company accordingly. The Company will not be responsible for any delay in providing such updates.
                            </p>
                            {isEditing ? (
                                <div className="space-y-4 flex flex-col items-center">
                                    <label className="flex items-center space-x-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={formData.hris?.isDeclared}
                                            onChange={(e) => handleInputChange('hris', 'isDeclared', e.target.checked)}
                                            className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 group-hover:border-blue-400 transition"
                                        />
                                        <span className="text-sm font-semibold text-slate-700 select-none">I agree to the declaration</span>
                                    </label>
                                    {formData.hris?.isDeclared && (
                                        <p className="text-xs text-blue-600 font-medium animate-pulse">
                                            Ready to submit! Click "Submit for Approval" to finish.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4 flex flex-col items-center">
                                    <div className="flex items-center text-emerald-600 space-x-2 font-bold bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                                        <CheckCircle size={20} />
                                        <span>{profile.hris?.isDeclared ? `Declared on ${format(new Date(profile.hris.declarationDate || profile.updatedAt), 'dd MMM yyyy')}` : 'Not Declared Yet'}</span>
                                    </div>
                                    {profile.hris?.isDeclared && (hrisStatus === 'Draft' || hrisStatus === 'Rejected') && (
                                        <Button onClick={handleHRISSaveClick} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center">
                                            <Shield size={18} className="mr-2" /> Submit EIS for Approval
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {
                    isEditing && (
                        <div className="flex justify-end space-x-4 pt-8 mt-10 border-t border-slate-100">
                            <Button variants="ghost" onClick={() => { setEditMode(false); setFormData(profile); }}>Discard Changes</Button>
                            <Button onClick={handleHRISSaveClick} isLoading={savingSection === 'hris'} className="px-8 flex items-center shadow-lg">
                                <Save size={18} className="mr-2" /> Complete & Save Form
                            </Button>
                        </div>
                    )
                }

                {/* Submit Logic Moved to Bottom */}
                {!isEditing && (hrisStatus === 'Draft' || hrisStatus === 'Rejected' || hrisStatus === 'Approved') && (profile.hris?.isDeclared || (currentUser?.roles?.some(r => r.name === 'Admin'))) && (
                    <div className="flex justify-end pt-8 mt-10 border-t border-slate-100">
                        <Button onClick={() => handleHRISSaveClick()} className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-lg px-6 py-2.5 flex items-center">
                            <Shield size={18} className="mr-2" /> {profile.hris?.isDeclared ? 'Submit for Approval' : 'Submit as Admin'}
                        </Button>
                    </div>
                )}
            </div >
        );
    };

    const renderHistory = () => {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Activity History</h3>

                {historyLogs.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">No history available</div>
                ) : (
                    <div className="relative border-l border-slate-200 ml-3 space-y-8 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {historyLogs.map((log, idx) => (
                            <div key={log._id || idx} className="ml-6 relative">
                                <span className="absolute -left-[31px] bg-blue-100 h-4 w-4 rounded-full border-2 border-white ring-1 ring-blue-500"></span>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-sm font-semibold text-slate-800">
                                            {log.action === 'UPDATE_DOSSIER' ? `Updated ${log.details?.section || 'Dossier'}` :
                                                log.action === 'UPLOAD_DOCUMENT' ? 'Uploaded Document' :
                                                    log.action === 'UPLOAD_DOCUMENT_VERSION' ? 'Uploaded Corrected Document Version' :
                                                        log.action === 'VERIFY_DOCUMENT' ? 'Verified Document' :
                                                            log.action === 'REJECT_DOCUMENT' ? 'Rejected Document' :
                                                                log.action === 'REVOKE_DOCUMENT_VERIFICATION' ? 'Revoked Document Verification' :
                                                                    log.action === 'DELETE_DOCUMENT' ? 'Deleted Document' :
                                                                        log.action === 'SUBMIT_DOCUMENTS' ? 'Submitted Documents for Review' :
                                                                            log.action}
                                        </p>
                                        <span className="text-xs text-slate-400 whitespace-nowrap">
                                            {format(new Date(log.createdAt), 'dd MMM yyyy, hh:mm a')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2">
                                        by <span className="font-medium text-slate-700">
                                            {log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'Unknown'}
                                        </span>
                                    </p>

                                    {log.details?.updates && (
                                        <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 mt-2">
                                            <div className="font-semibold mb-1">Changes:</div>
                                            {Array.isArray(log.details.updates) ? (
                                                <span>{log.details.updates.join(', ')}</span>
                                            ) : (
                                                <ul className="list-disc ml-4 space-y-0.5">
                                                    {Object.entries(log.details.updates).map(([key, val]) => (
                                                        <li key={key}>
                                                            <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span> {val !== null && val !== undefined ? String(val) : <em className="text-slate-400">Empty</em>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                    {log.details?.docTitle && (
                                        <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 mt-2">
                                            Document: <span className="font-medium">{log.details.docTitle}</span>
                                            {log.details?.versionNumber ? <span className="ml-2 text-slate-400">v{log.details.versionNumber}</span> : null}
                                        </div>
                                    )}
                                    {(log.details?.reason || log.details?.status) && (
                                        <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 mt-2 space-y-1">
                                            {log.details?.status ? (
                                                <div>Status: <span className="font-medium">{log.details.status}</span></div>
                                            ) : null}
                                            {log.details?.reason ? (
                                                <div>Reason: <span className="font-medium">{log.details.reason}</span></div>
                                            ) : null}
                                            {log.details?.newSubmissionStatus ? (
                                                <div>Submission Status: <span className="font-medium">{log.details.newSubmissionStatus}</span></div>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderEmailHistory = () => {
        const activeEmails = emailHistoryByTab[emailHistoryTab] || [];

        return (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Mail size={18} className="text-blue-600" />
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Email History</h3>
                        <p className="text-sm text-slate-500">Sent HR emails and dossier-save outcomes for this employee.</p>
                    </div>
                </div>

                {/* Sub Tabs Selector */}
                <div className="mb-6 flex border-b border-slate-100 p-1 bg-slate-50 rounded-lg max-w-md">
                    {[
                        { id: 'onboarding', label: 'Onboarding' },
                        { id: 'general', label: 'General' },
                        { id: 'offboarding', label: 'Offboarding' }
                    ].map(subTab => (
                        <button
                            key={subTab.id}
                            type="button"
                            onClick={() => setEmailHistoryTab(subTab.id)}
                            className={`flex-1 text-center py-2 text-xs font-semibold rounded-md transition-all ${
                                emailHistoryTab === subTab.id
                                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            {subTab.label}
                        </button>
                    ))}
                </div>

                {loadingEmailHistory ? (
                    <div className="space-y-4">
                        {[0, 1, 2].map((item) => (
                            <Skeleton key={item} className="h-24 w-full rounded-2xl" />
                        ))}
                    </div>
                ) : activeEmails.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                        No {emailHistoryTab} email history has been recorded for this employee yet.
                    </div>
                ) : (
                    <div className="relative ml-3 border-l border-slate-200 space-y-6">
                        {activeEmails.map((entry, index) => (
                            <div key={entry._id || index} className="relative ml-6">
                                <span className="absolute -left-[31px] h-4 w-4 rounded-full border-2 border-white bg-blue-500"></span>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <div className="text-base font-semibold text-slate-900">{entry.subject || 'Untitled email'}</div>
                                            <div className="mt-1 text-sm text-slate-500">
                                                Sent by {entry.sentBy ? `${entry.sentBy.firstName || ''} ${entry.sentBy.lastName || ''}`.trim() : 'System / HR'}
                                            </div>
                                        </div>
                                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                                            {entry.sentAt ? format(new Date(entry.sentAt), 'dd MMM yyyy, hh:mm a') : '-'}
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-slate-600">
                                        <div><span className="font-semibold text-slate-900">Template:</span> {entry.templateName || entry.templateId?.name || 'Custom'}</div>
                                        <div><span className="font-semibold text-slate-900">Sender:</span> {entry.emailAccountLabel || 'TalentCIO Platform'}</div>
                                        <div><span className="font-semibold text-slate-900">Recipient:</span> {entry.recipientEmail || '-'}</div>
                                        <div><span className="font-semibold text-slate-900">Dossier:</span> {entry.dossierSaved ? `Saved · ${entry.dossierCategory || 'Other'}` : `Not saved${entry.dossierSaveError ? ` · ${entry.dossierSaveError}` : ''}`}</div>
                                    </div>

                                    {entry.notes ? (
                                        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                            <span className="font-semibold text-slate-900">Notes:</span> {entry.notes}
                                        </div>
                                    ) : null}

                                    {entry.body ? (
                                        <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-inner">
                                            <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Message Content</span>
                                            </div>
                                            <div className="p-1 bg-white">
                                                <iframe
                                                    srcDoc={entry.body}
                                                    title={`email-body-${entry._id}`}
                                                    className="w-full min-h-[350px] border-0"
                                                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                                                />
                                            </div>
                                        </div>
                                    ) : null}

                                    {Array.isArray(entry.attachments) && entry.attachments.length > 0 ? (
                                        <div className="mt-4">
                                            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Attachments</div>
                                            <div className="flex flex-wrap gap-2">
                                                {entry.attachments.map((attachment, attachmentIndex) => (
                                                    attachment.cloudinaryUrl ? (
                                                        <a
                                                            key={`${attachment.filename || 'attachment'}-${attachmentIndex}`}
                                                            href={attachment.cloudinaryUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:border-blue-200 hover:bg-blue-50"
                                                        >
                                                            <FileText size={14} />
                                                            {attachment.filename || 'Attachment'}
                                                        </a>
                                                    ) : (
                                                        <span
                                                            key={`${attachment.filename || 'attachment'}-${attachmentIndex}`}
                                                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-500"
                                                        >
                                                            <FileText size={14} />
                                                            {attachment.filename || 'Attachment'}
                                                        </span>
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderHRISRequests = () => {
        const filtered = hrisRequests.filter(req =>
            `${req.firstName} ${req.lastName}`.toLowerCase().includes(hrisSearchTerm.toLowerCase()) ||
            req.employeeCode?.toLowerCase().includes(hrisSearchTerm.toLowerCase())
        );

        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">EIS Requests Management</h3>
                            <p className="text-sm text-slate-500">View and manage EIS submissions history</p>
                        </div>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={hrisSearchTerm}
                                onChange={(e) => setHrisSearchTerm(e.target.value)}
                                placeholder="Search by name or code..."
                                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none w-64"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-100 rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3">Employee</th>
                                    <th className="px-4 py-3">Dept</th>
                                    <th className="px-4 py-3">Submitted</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loadingRequests ? (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-10 text-center">
                                            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                                            <p className="text-slate-500">Fetching requests...</p>
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-10 text-center text-slate-500 italic">
                                            No EIS requests found
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(req => (
                                        <tr key={req._id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-800">{req.firstName} {req.lastName}</div>
                                                <div className="text-[11px] text-slate-500 font-medium">{req.employeeCode}</div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{req.department || '-'}</td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {req.employeeProfile?.hris?.submittedAt ? format(new Date(req.employeeProfile.hris.submittedAt), 'dd MMM yyyy') : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="scale-75 origin-left w-32">
                                                    {getStatusBadge(req.employeeProfile?.hris?.status)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    {req.employeeProfile?.hris?.status === 'Pending Approval' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleHRISApproveOther(req._id)}
                                                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                                                title="Approve"
                                                            >
                                                                <CheckCircle size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleHRISRejectOther(req._id)}
                                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                title="Reject"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            navigate(`/dossier/${req._id}?tab=hris`);
                                                        }}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                        title="View Form"
                                                    >
                                                        <FileText size={18} className="pointer-events-none" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleExcelExport(req)}
                                                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
                                                        title="Download Excel"
                                                    >
                                                        <Download size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
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

    // If profile failed to load (is still null)
    if (!profile) return (
        <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
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
            {/* Top Navigation Bar - Hidden if embedded */}
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

                    {activeTab === 'personal' && renderPersonal()}
                    {activeTab === 'employment' && renderEmployment()}
                    {activeTab === 'salary' && renderSalary()}

                    {activeTab === 'documents' && renderDocuments()}
                    {activeTab === 'hris' && renderHRIS()}
                    {activeTab === 'history' && renderHistory()}
                    {activeTab === 'email-history' && renderEmailHistory()}
                    {activeTab === 'requests' && renderHRISRequests()}
                    {activeTab === 'settings' && renderSettings()}
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

                {/* HRIS Save Draft / Submit for Approval Confirmation Modal */}
                {showHrisConfirmModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={() => setShowHrisConfirmModal(false)}>
                        <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl border border-slate-100 transform scale-100 transition-all duration-300 relative" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setShowHrisConfirmModal(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
                            >
                                <X size={18} />
                            </button>
                            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-50 text-blue-600 mx-auto mb-4 border border-blue-100 shadow-sm">
                                <Shield size={24} />
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-800 text-center tracking-tight">Save EIS Information</h3>
                            <p className="mt-2 text-sm text-slate-500 text-center leading-relaxed">
                                Please select whether you want to save these updates as a draft or submit them to HR for approval.
                            </p>

                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Option A: Save as Draft */}
                                <button
                                    onClick={() => handleHRISSave(false)}
                                    className="group text-left p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-300 transition-all hover:shadow-md flex flex-col justify-between"
                                >
                                    <div>
                                        <span className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                                            Save as Draft
                                        </span>
                                        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                                            Keep changes as draft. These updates will not be sent to HR, and your active profile will remain unchanged. You can resume editing later.
                                        </p>
                                    </div>
                                    <div className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
                                        Draft Mode &rarr;
                                    </div>
                                </button>

                                {/* Option B: Submit for Approval */}
                                <button
                                    onClick={() => handleHRISSave(true)}
                                    className="group text-left p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-emerald-300 transition-all hover:shadow-md flex flex-col justify-between"
                                >
                                    <div>
                                        <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                                            Submit for Approval
                                        </span>
                                        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                                            Submit updates for verification. This freezes editing and notifies HR. Changes will reflect on your live profile once approved.
                                        </p>
                                    </div>
                                    <div className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">
                                        Send for Approval &rarr;
                                    </div>
                                </button>
                            </div>

                            {/* Disclaimer / Declaration Text */}
                            <div className="mt-6 p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
                                <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                                <div>
                                    <p className="font-bold uppercase tracking-wider text-[10px]">Declaration Disclaimer</p>
                                    <p className="mt-1 leading-relaxed font-medium">
                                        By selecting <strong>Submit for Approval</strong>, I hereby declare that all the information provided above is true, accurate, and complete to the best of my knowledge.
                                        In case of any future changes to the information provided, I will update the Company accordingly. The Company will not be responsible for any delay in providing such updates.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowHrisConfirmModal(false)}
                                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-medium px-4 py-2 rounded-xl transition border border-slate-200"
                                >
                                    Cancel & Keep Editing
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
