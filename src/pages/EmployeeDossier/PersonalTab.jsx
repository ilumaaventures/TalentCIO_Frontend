import React from 'react';
import { User, Briefcase, Shield, DollarSign, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Button from '../../components/Button';
import {
    Field,
    PendingHighlight,
    EditDisclaimer,
    SectionCard
} from './DossierHelpers';

export const PersonalTab = ({
    profile,
    pendingUpdates,
    editMode,
    setEditMode,
    formData,
    setFormData,
    canApprove,
    isSelf,
    canEdit,
    isCurrentUserAdmin,
    savingSection,
    redirectToHRISEdit,
    handleInputChange,
    handleEmergencyChange,
    handleAddressChange,
    handleSave,
    handlePersonalSaveAll
}) => {
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
