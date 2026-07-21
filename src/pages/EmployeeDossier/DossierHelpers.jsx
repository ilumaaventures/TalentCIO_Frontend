import React, { useState } from 'react';
import { Info, AlertTriangle, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import Button from '../../components/Button';

export const COMPANY_LOGO_DISPLAY_OPTIONS = [
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

export const COMPANY_LOGO_ALIGNMENT_OPTIONS = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' }
];

export const DEFAULT_COMPANY_LOGO_ALIGNMENT = 'left';
export const DEFAULT_COMPANY_LOGO_SIZE = 140;
export const MIN_COMPANY_LOGO_SIZE = 80;
export const MAX_COMPANY_LOGO_SIZE = 170;
export const DOSSIER_FILE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const DOSSIER_ALLOWED_FILE_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp'
]);

// Helper Components defined outside to prevent re-renders
export const Field = ({ label, value, section, field, type = "text", options = null, isEditing, hideIfEmpty, onChangeOverride, valueOverride, placeholder, formData, onChange, maxLength, error, required, dateFormat = "dd MMM yyyy" }) => {
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
export const DiffField = ({ label, oldValue, newValue, type }) => {
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
export const mergePendingIntoProfile = (profileObj, pending) => {
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
export const PendingHighlight = ({ show, liveValue, pendingValue, label, type, children, dateFormat = "dd MMM yyyy" }) => {
    const [open, setOpen] = useState(false);

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

export const EditDisclaimer = ({ isDirectWrite }) => {
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

export const SectionCard = ({ title, sectionName, icon: Icon, children, editMode, setEditMode, onSave, isLoading, canEdit = true, showActions = true, isEditingOverride, customEditAction }) => {
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

export const SkillsInput = ({ label, skills = [], onUpdate, placeholder }) => {
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

export const documentCategories = [
    {
        name: 'Identity Documents',
        category: 'ID Proof',
        allowMultiple: false,
        fixedDocs: ['Aadhaar Card (Front)', 'Aadhaar Card (Back)', 'Pan Card', 'Passport', 'Recent Passport-Size Photograph', 'Live Photograph']
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
