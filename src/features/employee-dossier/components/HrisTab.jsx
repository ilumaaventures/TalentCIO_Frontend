import React, { useState, useEffect } from 'react';
import { 
    AlertCircle, Save, CheckCircle, X, Clock, GitCompare, User, Calendar, Briefcase, Shield, DollarSign, Trash2, FileText 
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Button from '../../components/Button';
import { 
    Field, DiffField, PendingHighlight, SkillsInput 
} from './DossierHelpers';

export const getStatusBadge = (status) => {
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

export const HrisTab = ({
    profile,
    editMode,
    setEditMode,
    currentUser,
    pendingUpdates,
    canApprove,
    isSelf,
    userId,
    fetchDossier,
    formData,
    setFormData,
    handleInputChange,
    handleEmergencyChange,
    handleAddressChange,
    handleBreakupChange,
    handleArrayChange,
    addArrayItem,
    removeArrayItem
}) => {
    // Local States
    const [validationErrors, setValidationErrors] = useState({});
    const [savingSection, setSavingSection] = useState(null);
    const [showHrisConfirmModal, setShowHrisConfirmModal] = useState(false);

    useEffect(() => {
        setValidationErrors({});
    }, [editMode]);

    if (!profile) return null;

    const isEditing = editMode === 'hris';
    const isAdmin = currentUser?.roles?.some(r => {
        const name = typeof r === 'string' ? r : r?.name;
        return name === 'Admin';
    });
    const hrisStatus = profile.hris?.status || 'Draft';
    const pend = pendingUpdates || {};
    const showPending = !!(canApprove && !isSelf && !isEditing && pendingUpdates);

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

            let declared = forceIsDeclared !== undefined ? forceIsDeclared : !!formData.hris?.isDeclared;

            const isDirectWrite = isAdmin && !isSelf;
            if (isDirectWrite) {
                declared = true;
            }

            if (!dataToSubmit.hris) dataToSubmit.hris = {};
            dataToSubmit.hris.isDeclared = declared;

            await api.patch(`/dossier/${userId}/submit-hris`, dataToSubmit);
            toast.success(declared ? 'EIS Form submitted for approval' : 'EIS Form saved as draft');
            setEditMode(false);
            setShowHrisConfirmModal(false);
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

        const isDirectWrite = isAdmin && !isSelf;
        if (isDirectWrite) {
            handleHRISSave(true);
        } else {
            setShowHrisConfirmModal(true);
        }
    };

    const handleHRISApproveOther = async (id) => {
        try {
            const toastId = toast.loading('Approving HRIS request...');
            await api.patch(`/dossier/${id}/approve-hris`);
            toast.dismiss(toastId);
            toast.success('HRIS Approved');
            fetchDossier();
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
            fetchDossier();
        } catch (error) {
            console.error(error);
            toast.error('Failed to reject HRIS');
        }
    };

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

            {/* Diff Panel */}
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
                    try { return format(new Date(dStr), 'dd MMM yyyy'); } catch { return String(dStr); }
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
                    <div className={`rounded-xl border-2 p-5 mb-4 ${hrisStatus === 'Pending Approval' ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-slate-50'}`}>
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

            <div className="grid grid-cols-1 gap-6 py-12 text-xs">
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
                                            <Field section="contact" isEditing={isEditing} label="Phone at Address" field={`${type}_phone`}
                                                value={profile.contact?.addresses?.find(a => a.type === type)?.phone}
                                                valueOverride={formData.contact?.addresses?.find(a => a.type === type)?.phone}
                                                maxLength={10}
                                                error={validationErrors[`contact.addresses.${type}.phone`] || (formData.contact?.addresses?.find(a => a.type === type)?.phone?.length > 0 && formData.contact?.addresses?.find(a => a.type === type)?.phone?.length < 10 ? 'Must be 10 digits' : null)}
                                                onChangeOverride={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    handleAddressChange(type, 'phone', val);
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
                        <Briefcase size={18} className="text-blue-500" />
                        <h3 className="font-bold text-slate-700">5. Contact Information & Emergency Contacts</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <PendingHighlight show={showPending} label="Mobile Number" liveValue={profile.contact?.mobileNumber} pendingValue={pend.contact?.mobileNumber}>
                            <Field
                                section="contact" isEditing={isEditing} label="Mobile Number" field="mobileNumber"
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
                        <PendingHighlight show={showPending} label="Alternate Number" liveValue={profile.contact?.alternateNumber} pendingValue={pend.contact?.alternateNumber}>
                            <Field
                                section="contact" isEditing={isEditing} label="Alternate Number" field="alternateNumber"
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
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Emergency Contact</h4>
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
                                    error={validationErrors['contact.emergencyContact.email']}
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

            {isEditing && (
                <div className="flex justify-end space-x-4 pt-8 mt-10 border-t border-slate-100">
                    <Button variants="ghost" onClick={() => { setEditMode(false); setFormData(profile); }}>Discard Changes</Button>
                    <Button onClick={handleHRISSaveClick} isLoading={savingSection === 'hris'} className="px-8 flex items-center shadow-lg">
                        <Save size={18} className="mr-2" /> Complete & Save Form
                    </Button>
                </div>
            )}

            {!isEditing && (hrisStatus === 'Draft' || hrisStatus === 'Rejected' || hrisStatus === 'Approved') && (profile.hris?.isDeclared || isAdmin) && (
                <div className="flex justify-end pt-8 mt-10 border-t border-slate-100">
                    <Button onClick={() => handleHRISSaveClick()} className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-lg px-6 py-2.5 flex items-center">
                        <Shield size={18} className="mr-2" /> {profile.hris?.isDeclared ? 'Submit for Approval' : 'Submit as Admin'}
                    </Button>
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
    );
};
