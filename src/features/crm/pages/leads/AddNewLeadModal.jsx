import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Building2,
  Mail,
  Phone,
  Globe,
  Briefcase,
  Calendar,
  AlertTriangle,
  Flame,
  Zap,
  Snowflake,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GitMerge,
  CheckCircle2,
  Info,
  Sparkles,
  ShieldCheck,
  Tag,
  FileText,
  Plus,
  X,
  MapPin,
  Edit3,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { leadsService, adminService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const LEAD_SOURCES = [
  'Website',
  'Referral',
  'Google Ads',
  'LinkedIn',
  'WhatsApp',
  'Cold Call',
  'Email',
  'Facebook / Meta',
  'Partner',
  'Event',
  'Walk-in',
  'Existing Customer',
  'Other',
];

const LEAD_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Nurturing'];
const LEAD_TEMPERATURES = ['Cold', 'Warm', 'Hot'];
const CONTACT_METHODS = ['Phone', 'Email', 'WhatsApp', 'Meeting'];
const TEAMS = ['Direct Enterprise', 'Mid-Market Sales', 'Inside Sales / SDR', 'Channel Partnerships'];
const TERRITORIES = ['National', 'North Hub (Delhi-NCR)', 'West Hub (Mumbai-Pune)', 'South Hub (BLR-HYD)', 'East Hub (Kolkata)'];

export const AddNewLeadModal = ({
  isOpen,
  onClose,
  onSuccess,
  onViewLead,
  leadToEdit = null,
}) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Custom Sources List
  const [sourcesList, setSourcesList] = useState(() => {
    try {
      const saved = localStorage.getItem('sales_crm_custom_sources');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.from(new Set([...LEAD_SOURCES, ...parsed]));
      }
    } catch (e) {}
    return LEAD_SOURCES;
  });

  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceInput, setNewSourceInput] = useState('');

  const handleAddNewSource = () => {
    const trimmed = newSourceInput.trim();
    if (!trimmed) return;
    if (!sourcesList.includes(trimmed)) {
      const updated = [...sourcesList, trimmed];
      setSourcesList(updated);
      try {
        const customOnly = updated.filter((s) => !LEAD_SOURCES.includes(s));
        localStorage.setItem('sales_crm_custom_sources', JSON.stringify(customOnly));
      } catch (e) {}
    }
    setFormData((prev) => ({ ...prev, source: trimmed }));
    setNewSourceInput('');
    setIsAddingSource(false);
  };

  // Custom Contact Methods List
  const [contactMethodsList, setContactMethodsList] = useState(() => {
    try {
      const saved = localStorage.getItem('sales_crm_custom_contact_methods');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.from(new Set([...CONTACT_METHODS, ...parsed]));
      }
    } catch (e) {}
    return CONTACT_METHODS;
  });

  const [isAddingContactMethod, setIsAddingContactMethod] = useState(false);
  const [newContactMethodInput, setNewContactMethodInput] = useState('');

  const handleAddNewContactMethod = (customValue) => {
    const trimmed = (typeof customValue === 'string' ? customValue : newContactMethodInput).trim();
    if (!trimmed) return;
    if (!contactMethodsList.includes(trimmed)) {
      const updated = [...contactMethodsList, trimmed];
      setContactMethodsList(updated);
      try {
        const customOnly = updated.filter((m) => !CONTACT_METHODS.includes(m));
        localStorage.setItem('sales_crm_custom_contact_methods', JSON.stringify(customOnly));
      } catch (e) {}
    }
    setFormData((prev) => ({ ...prev, preferredContactMethod: trimmed }));
    setNewContactMethodInput('');
    setIsAddingContactMethod(false);
  };

  // Duplicate detection state
  const [duplicateMatch, setDuplicateMatch] = useState(null);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [ignoreDuplicateWarning, setIgnoreDuplicateWarning] = useState(false);
  const debounceTimer = useRef(null);

  // Auto assignment toggle
  const [isAutoAssigned, setIsAutoAssigned] = useState(false);
  const [isManualTemperature, setIsManualTemperature] = useState(false);

  // Form State
  const initialFormState = {
    // Basic Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    companyName: '',
    jobTitle: '',
    website: '',
    source: 'Website',

    // Lead Classification
    priority: 'Medium',
    status: 'New',
    temperature: 'Cold',

    // Sales Information
    estimatedValue: '',
    expectedPurchaseDate: '',
    budget: '',
    requirements: '',
    preferredContactMethod: 'Phone',

    // Address & Location
    street: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',

    // Assignment
    ownerId: user?._id || '',
    team: 'Direct Enterprise',
    territory: 'National',

    // Additional
    tags: '',
    notes: '',
  };

  const [formData, setFormData] = useState(initialFormState);

  // Sync formData with leadToEdit or reset on open
  useEffect(() => {
    if (isOpen) {
      if (leadToEdit) {
        setFormData({
          firstName: leadToEdit.firstName || '',
          lastName: leadToEdit.lastName || '',
          email: leadToEdit.email || '',
          phone: leadToEdit.phone || '',
          alternatePhone: leadToEdit.alternatePhone || '',
          companyName: leadToEdit.companyName || '',
          jobTitle: leadToEdit.jobTitle || '',
          website: leadToEdit.website || '',
          source: leadToEdit.source || 'Website',
          priority: leadToEdit.priority || 'Medium',
          status: leadToEdit.status || 'New',
          temperature: leadToEdit.temperature || 'Cold',
          estimatedValue: leadToEdit.estimatedValue != null ? String(leadToEdit.estimatedValue) : '',
          expectedPurchaseDate: leadToEdit.expectedPurchaseDate
            ? new Date(leadToEdit.expectedPurchaseDate).toISOString().split('T')[0]
            : '',
          budget: leadToEdit.budget || '',
          requirements: leadToEdit.requirements || '',
          preferredContactMethod: leadToEdit.preferredContactMethod || 'Phone',
          street: leadToEdit.address?.street || '',
          city: leadToEdit.address?.city || '',
          state: leadToEdit.address?.state || '',
          country: leadToEdit.address?.country || 'India',
          postalCode: leadToEdit.address?.postalCode || '',
          ownerId: leadToEdit.ownerId?._id || leadToEdit.ownerId || user?._id || '',
          team: leadToEdit.team || 'Direct Enterprise',
          territory: leadToEdit.territory || 'National',
          tags: Array.isArray(leadToEdit.tags) ? leadToEdit.tags.join(', ') : (leadToEdit.tags || ''),
          notes: leadToEdit.notes || '',
        });
        setIsManualTemperature(Boolean(leadToEdit.temperature));
        if (
          leadToEdit.address?.street ||
          leadToEdit.address?.state ||
          leadToEdit.address?.postalCode ||
          leadToEdit.notes ||
          leadToEdit.requirements ||
          leadToEdit.budget ||
          leadToEdit.alternatePhone ||
          leadToEdit.website
        ) {
          setIsExpanded(true);
        }
      } else {
        setFormData({
          ...initialFormState,
          ownerId: user?._id || '',
        });
        setIsManualTemperature(false);
        setIsExpanded(false);
      }
      setDuplicateMatch(null);
      setIgnoreDuplicateWarning(false);
      setError(null);
    }
  }, [isOpen, leadToEdit]);

  // Fetch sales owners
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await adminService.getUsers();
        if (res.success) {
          setUsers(res.data);
          if (!formData.ownerId && user?._id && !leadToEdit) {
            setFormData((prev) => ({ ...prev, ownerId: user._id }));
          }
        }
      } catch (err) {
        console.warn('Could not load team users', err);
      }
    };
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, user]);

  // Check whether any prospect data has been entered on the form
  const hasData = Boolean(
    formData.firstName?.trim() ||
    formData.lastName?.trim() ||
    formData.email?.trim() ||
    formData.phone?.trim() ||
    formData.alternatePhone?.trim() ||
    formData.companyName?.trim() ||
    formData.jobTitle?.trim() ||
    formData.website?.trim() ||
    formData.estimatedValue ||
    formData.budget?.trim() ||
    formData.requirements?.trim() ||
    formData.city?.trim() ||
    formData.street?.trim()
  );

  // Real-time Automated Lead Scoring Engine (0-100) based on actual prospect data
  const calculatedScore = useMemo(() => {
    if (!hasData) return 0;

    let score = 0;

    // 1. Identity & Contact Information (up to 30 pts)
    if (formData.firstName?.trim()) score += 10;
    if (formData.lastName?.trim()) score += 2;
    if (formData.phone?.trim()) score += 15;
    if (formData.email?.trim()) {
      score += 12;
      if (!/@(gmail|yahoo|hotmail|outlook|icloud)\./i.test(formData.email)) {
        score += 3; // Corporate domain bonus
      }
    }
    if (formData.alternatePhone?.trim()) score += 3;

    // 2. Organization & Role Authority (up to 25 pts)
    if (formData.companyName?.trim()) score += 12;
    if (formData.website?.trim()) score += 4;
    if (formData.jobTitle?.trim()) {
      const title = formData.jobTitle.toLowerCase();
      if (/(cxo|ceo|cto|cfo|cmo|cro|founder|co-founder|director|vp|vice president|head|partner|owner|md|managing director)/i.test(title)) {
        score += 15;
      } else if (/(manager|lead|principal|supervisor|senior)/i.test(title)) {
        score += 9;
      } else {
        score += 5;
      }
    }

    // 3. Location / Address (up to 10 pts)
    if (formData.city?.trim()) score += 5;
    if (formData.street?.trim()) score += 3;
    if (formData.state?.trim()) score += 2;

    // 4. Commercial Value & Intent (up to 30 pts)
    const val = Number(formData.estimatedValue) || 0;
    if (val >= 1000000) score += 15;
    else if (val >= 500000) score += 10;
    else if (val >= 100000) score += 6;
    else if (val > 0) score += 3;

    if (formData.budget?.trim()) score += 10;
    if (formData.requirements?.trim()) score += 8;

    // 5. Source Quality & Channel (up to 12 pts)
    const sourceScores = {
      'Existing Customer': 12,
      'Referral': 12,
      'Partner': 10,
      'WhatsApp': 10,
      'Website': 8,
      'LinkedIn': 8,
      'Google Ads': 7,
      'Event': 7,
      'Facebook / Meta': 6,
      'Meta Ads': 6,
      'Walk-in': 8,
      'Cold Call': 4,
      'Other': 4,
    };
    if (formData.source) {
      score += sourceScores[formData.source] || 6;
    }

    // 6. Urgency & Priority (up to 10 pts)
    if (formData.priority === 'Urgent') score += 10;
    else if (formData.priority === 'High') score += 6;
    else if (formData.priority === 'Medium') score += 3;
    else if (formData.priority === 'Low') score += 1;

    if (formData.status === 'Qualified') score += 10;
    else if (formData.status === 'Contacted') score += 5;

    return Math.min(100, Math.max(0, Math.round(score)));
  }, [formData, hasData]);

  // Temperature determination based on score
  const dynamicTemperature = useMemo(() => {
    if (!hasData) return 'Cold';
    if (calculatedScore >= 75) return 'Hot';
    if (calculatedScore >= 45) return 'Warm';
    return 'Cold';
  }, [calculatedScore, hasData]);

  // Keep temperature synchronized with score unless manually selected by user
  useEffect(() => {
    if (!isManualTemperature && hasData) {
      setFormData((prev) => ({ ...prev, temperature: dynamicTemperature }));
    }
  }, [dynamicTemperature, isManualTemperature, hasData]);

  // Live duplicate detection
  const performDuplicateCheck = async (email, phone, companyName) => {
    if ((!email || email.length < 5) && (!phone || phone.length < 7) && (!companyName || companyName.length < 3)) {
      setDuplicateMatch(null);
      return;
    }

    setIsCheckingDuplicates(true);
    try {
      const res = await leadsService.checkDuplicates({
        email: email?.trim(),
        phone: phone?.trim(),
        companyName: companyName?.trim(),
      });
      if (res.success && res.duplicates && res.duplicates.length > 0) {
        const filtered = res.duplicates.filter((d) => !leadToEdit?._id || String(d._id) !== String(leadToEdit._id));
        setDuplicateMatch(filtered.length > 0 ? filtered[0] : null);
      } else {
        setDuplicateMatch(null);
      }
    } catch (err) {
      console.warn('Duplicate check failed', err);
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      if (['email', 'phone', 'companyName'].includes(field)) {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          performDuplicateCheck(updated.email, updated.phone, updated.companyName);
        }, 350);
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.firstName.trim()) {
      setError('First Name is required');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Phone Number is required for qualification and follow-ups');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const address = {
        street: formData.street?.trim() || '',
        city: formData.city?.trim() || '',
        state: formData.state?.trim() || '',
        country: formData.country?.trim() || 'India',
        postalCode: formData.postalCode?.trim() || '',
      };

      const payload = {
        ...formData,
        address,
        score: calculatedScore,
        temperature: isManualTemperature ? formData.temperature : dynamicTemperature,
        isManualTemperature,
        estimatedValue: Number(formData.estimatedValue) || 0,
        ownerId: isAutoAssigned ? user?._id : formData.ownerId || user?._id,
        tags: typeof formData.tags === 'string'
          ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : formData.tags,
      };

      const res = leadToEdit?._id
        ? await leadsService.updateLead(leadToEdit._id, payload)
        : await leadsService.createLead(payload);

      if (res.success) {
        setFormData(initialFormState);
        setIsManualTemperature(false);
        setDuplicateMatch(null);
        setIgnoreDuplicateWarning(false);
        setIsExpanded(false);
        onClose();
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      setError(err.message || (leadToEdit ? 'Failed to update lead' : 'Failed to create lead'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-4xl"
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              {leadToEdit ? <Edit3 className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {leadToEdit ? `Edit Lead: ${leadToEdit.fullName || `${leadToEdit.firstName} ${leadToEdit.lastName || ''}`.trim()}` : 'Add New Lead'}
              </h2>
              <p className="text-xs text-slate-500">
                {leadToEdit
                  ? 'Update prospect contact details, qualification, and sales assignment.'
                  : 'Record a new prospect with automated scoring and duplicate detection.'}
              </p>
            </div>
          </div>

          {/* Automated Score Live Badge */}
          <div className="flex items-center gap-2 bg-slate-50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-slate-200/80 text-[11px] sm:text-xs">
            <div className="flex items-center gap-1 font-semibold text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Lead Score:</span>
              <span className={`font-bold ${hasData ? 'text-indigo-600' : 'text-slate-400'}`}>
                {calculatedScore} / 100
              </span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1 font-bold">
              {!hasData ? (
                <span className="text-slate-400 font-medium">
                  Awaiting prospect details
                </span>
              ) : (
                <>
                  {(isManualTemperature ? formData.temperature : dynamicTemperature) === 'Hot' && (
                    <span className="text-rose-600 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" /> Hot Lead
                    </span>
                  )}
                  {(isManualTemperature ? formData.temperature : dynamicTemperature) === 'Warm' && (
                    <span className="text-amber-600 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" /> Warm Lead
                    </span>
                  )}
                  {(isManualTemperature ? formData.temperature : dynamicTemperature) === 'Cold' && (
                    <span className="text-blue-500 flex items-center gap-1">
                      <Snowflake className="w-3.5 h-3.5" /> Cold Lead
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" /> Hide Additional Details
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" /> + Additional Details (Address, Budget, Requirements, Notes)
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={isLoading}
              icon={CheckCircle2}
              className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              {leadToEdit ? 'Save Changes' : 'Create Lead'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Real-time Duplicate Detection Alert Banner */}
        {duplicateMatch && !ignoreDuplicateWarning && (
          <Card padding="md" className="border-amber-200 bg-amber-50/70 shadow-2xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-2">
                    <span>⚠️ A possible duplicate lead was found</span>
                    <Badge variant="amber" size="xs">
                      {duplicateMatch.status || 'Active'}
                    </Badge>
                  </h4>
                  <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px] text-amber-800">
                    <div>
                      <span className="text-amber-600">Name:</span>{' '}
                      <span className="font-semibold">{duplicateMatch.fullName || `${duplicateMatch.firstName} ${duplicateMatch.lastName}`}</span>
                    </div>
                    <div>
                      <span className="text-amber-600">Company:</span>{' '}
                      <span className="font-semibold">{duplicateMatch.companyName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-amber-600">Owner:</span>{' '}
                      <span className="font-semibold">{duplicateMatch.ownerId?.name || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-amber-600">Last Activity:</span>{' '}
                      <span className="font-semibold">
                        {duplicateMatch.lastActivityAt
                          ? new Date(duplicateMatch.lastActivityAt).toLocaleDateString()
                          : 'Recent'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Duplicate Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {onViewLead && (
                  <Button
                    size="xs"
                    variant="outline"
                    icon={ExternalLink}
                    onClick={() => {
                      onClose();
                      onViewLead(duplicateMatch._id);
                    }}
                  >
                    View Existing
                  </Button>
                )}
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setIgnoreDuplicateWarning(true)}
                  className="text-amber-800 hover:bg-amber-100"
                >
                  Create Anyway
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Two-Column Desktop Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* COLUMN 1: Basic Information */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Basic Information</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                required
                placeholder="e.g. Ramesh"
                value={formData.firstName}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
              />
              <Input
                label="Last Name"
                placeholder="e.g. Gupta"
                value={formData.lastName}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Email"
                type="email"
                icon={Mail}
                placeholder="ramesh@company.in"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
              />
              <Input
                label="Phone Number"
                required
                icon={Phone}
                placeholder="+91 98200 12345"
                value={formData.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
              />
            </div>

            {/* Expandable or Additional Basic Fields */}
            {isExpanded && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-150">
                <Input
                  label="Alternate Phone"
                  icon={Phone}
                  placeholder="+91 80 4455 6677"
                  value={formData.alternatePhone}
                  onChange={(e) => handleFieldChange('alternatePhone', e.target.value)}
                />
                <Input
                  label="Website"
                  icon={Globe}
                  placeholder="https://company.in"
                  value={formData.website}
                  onChange={(e) => handleFieldChange('website', e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Company Name"
                icon={Building2}
                placeholder="Gupta Enterprises Pvt Ltd"
                value={formData.companyName}
                onChange={(e) => handleFieldChange('companyName', e.target.value)}
              />
              <Input
                label="Job Title"
                icon={Briefcase}
                placeholder="e.g. Managing Director / VP"
                value={formData.jobTitle}
                onChange={(e) => handleFieldChange('jobTitle', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Select
                label="Lead Source"
                action={
                  <button
                    type="button"
                    onClick={() => setIsAddingSource(true)}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer normal-case tracking-normal hover:underline whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3" /> Add Custom Source
                  </button>
                }
                value={formData.source}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    setIsAddingSource(true);
                  } else {
                    handleFieldChange('source', e.target.value);
                  }
                }}
              >
                {sourcesList.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
                <option value="__add_new__" className="font-semibold text-indigo-600 bg-indigo-50">
                  + Add New Source...
                </option>
              </Select>

              {isAddingSource && (
                <div className="p-3.5 bg-gradient-to-b from-indigo-50/90 to-slate-50 border border-indigo-200 rounded-xl shadow-xs space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Create Custom Lead Source
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSource(false);
                        setNewSourceInput('');
                      }}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/50 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white placeholder:text-slate-400 shadow-2xs transition-all"
                      placeholder="e.g. Trade Expo 2026, YouTube, Instagram"
                      value={newSourceInput}
                      onChange={(e) => setNewSourceInput(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewSource();
                        } else if (e.key === 'Escape') {
                          setIsAddingSource(false);
                          setNewSourceInput('');
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-0.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        setIsAddingSource(false);
                        setNewSourceInput('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      type="button"
                      onClick={handleAddNewSource}
                      icon={Plus}
                      className="px-3.5 py-1.5 font-semibold shadow-xs"
                    >
                      Save Source
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: Classification, Sales & Assignment */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>Lead Classification & Sales</span>
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Select
                label="Priority"
                value={formData.priority}
                onChange={(e) => handleFieldChange('priority', e.target.value)}
                options={LEAD_PRIORITIES.map((p) => ({ value: p, label: p }))}
              />
              <Select
                label="Lead Status"
                value={formData.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                options={LEAD_STATUSES.map((s) => ({ value: s, label: s }))}
              />
              <Select
                label="Temperature"
                value={formData.temperature}
                onChange={(e) => {
                  setIsManualTemperature(true);
                  handleFieldChange('temperature', e.target.value);
                }}
                options={LEAD_TEMPERATURES.map((t) => ({ value: t, label: t }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-start">
              <Input
                label="Est. Value (₹)"
                type="number"
                placeholder="e.g. 500000"
                value={formData.estimatedValue}
                onChange={(e) => handleFieldChange('estimatedValue', e.target.value)}
              />
              <Select
                label="Preferred Contact"
                action={
                  <button
                    type="button"
                    onClick={() => setIsAddingContactMethod(true)}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer normal-case tracking-normal hover:underline whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3" /> Custom
                  </button>
                }
                value={formData.preferredContactMethod}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    setIsAddingContactMethod(true);
                  } else {
                    handleFieldChange('preferredContactMethod', e.target.value);
                  }
                }}
              >
                {contactMethodsList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value="__add_new__" className="font-semibold text-indigo-600 bg-indigo-50">
                  + Add New Contact Method...
                </option>
              </Select>

              {isAddingContactMethod && (
                <div className="col-span-2 p-3.5 bg-gradient-to-b from-indigo-50/90 to-slate-50 border border-indigo-200 rounded-xl shadow-xs space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Create Custom Contact Method
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingContactMethod(false);
                        setNewContactMethodInput('');
                      }}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/50 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white placeholder:text-slate-400 shadow-2xs transition-all"
                      placeholder="e.g. Telegram, Video Call / Zoom, SMS"
                      value={newContactMethodInput}
                      onChange={(e) => setNewContactMethodInput(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewContactMethod();
                        } else if (e.key === 'Escape') {
                          setIsAddingContactMethod(false);
                          setNewContactMethodInput('');
                        }
                      }}
                    />
                  </div>

                  {/* Quick suggestion pills */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[11px] text-slate-500 font-medium">Quick options:</span>
                    {['Telegram', 'Zoom / Video', 'SMS', 'In-Person', 'Slack']
                      .filter((tag) => !contactMethodsList.includes(tag))
                      .map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleAddNewContactMethod(tag)}
                          className="px-2 py-0.5 text-[11px] font-medium bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-md transition-colors cursor-pointer shadow-2xs"
                        >
                          + {tag}
                        </button>
                      ))}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        setIsAddingContactMethod(false);
                        setNewContactMethodInput('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      type="button"
                      onClick={() => handleAddNewContactMethod()}
                      icon={Plus}
                      disabled={!newContactMethodInput.trim()}
                      className="px-3.5 py-1.5 font-semibold shadow-xs"
                    >
                      Save Method
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Assignment Box */}
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Sales Assignment</span>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAutoAssigned}
                    onChange={(e) => setIsAutoAssigned(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  <span>Auto-assign</span>
                </label>
              </div>

              {isAutoAssigned ? (
                <div className="p-2 rounded-lg bg-indigo-50/80 border border-indigo-100 text-indigo-800 text-[11px] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Auto-assigned based on your territory & lead routing rules.</span>
                </div>
              ) : (
                <Select
                  value={formData.ownerId}
                  onChange={(e) => handleFieldChange('ownerId', e.target.value)}
                  options={[
                    ...(user ? [{ value: user._id, label: `${user.name} (You)` }] : []),
                    ...users
                      .filter((u) => u._id !== user?._id)
                      .map((u) => ({ value: u._id, label: `${u.name} (${u.role})` })),
                  ]}
                />
              )}
            </div>

            {/* Expandable Sales & Territory Information */}
            {isExpanded && (
              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Team"
                    value={formData.team}
                    onChange={(e) => handleFieldChange('team', e.target.value)}
                    options={TEAMS.map((tm) => ({ value: tm, label: tm }))}
                  />
                  <Select
                    label="Territory"
                    value={formData.territory}
                    onChange={(e) => handleFieldChange('territory', e.target.value)}
                    options={TERRITORIES.map((tr) => ({ value: tr, label: tr }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Expected Purchase Date"
                    type="date"
                    value={formData.expectedPurchaseDate}
                    onChange={(e) => handleFieldChange('expectedPurchaseDate', e.target.value)}
                  />
                  <Input
                    label="Budget Confirmation"
                    placeholder="e.g. ₹5L - ₹8L approved"
                    value={formData.budget}
                    onChange={(e) => handleFieldChange('budget', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* EXPANDABLE SECTION: Address & Location, Requirements, Tags, and Notes */}
        {isExpanded && (
          <div className="border-t border-slate-100 pt-4 space-y-4 animate-in fade-in duration-150">
            {/* Address & Office Location Card */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Address & Office Location</span>
                </h4>
                <span className="text-[11px] text-slate-400">Prospect site & billing address</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Input
                    label="Street Address"
                    icon={MapPin}
                    placeholder="e.g. Suite 400, Outer Ring Road, Mahadevapura"
                    value={formData.street}
                    onChange={(e) => handleFieldChange('street', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="City"
                    placeholder="e.g. Bengaluru"
                    value={formData.city}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                  />
                  <Input
                    label="State / Province"
                    placeholder="e.g. Karnataka"
                    value={formData.state}
                    onChange={(e) => handleFieldChange('state', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Postal / PIN Code"
                    placeholder="e.g. 560048"
                    value={formData.postalCode}
                    onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                  />
                  <Input
                    label="Country"
                    placeholder="e.g. India"
                    value={formData.country}
                    onChange={(e) => handleFieldChange('country', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Key Requirements</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors placeholder:text-slate-400"
                  placeholder="e.g. Looking for enterprise threat intelligence platform with SOC 2 compliance..."
                  value={formData.requirements}
                  onChange={(e) => handleFieldChange('requirements', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tags (comma-separated)</span>
                </label>
                <Input
                  placeholder="Enterprise, High-Priority, Q3-Closing, Fintech"
                  value={formData.tags}
                  onChange={(e) => handleFieldChange('tags', e.target.value)}
                />

                <label className="block text-xs font-semibold text-slate-700 mt-2 mb-1">
                  <span>Initial Internal Notes</span>
                </label>
                <textarea
                  rows={2}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors placeholder:text-slate-400"
                  placeholder="Met through partner referral at Bangalore Tech Summit..."
                  value={formData.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};

export const EditLeadModal = AddNewLeadModal;
