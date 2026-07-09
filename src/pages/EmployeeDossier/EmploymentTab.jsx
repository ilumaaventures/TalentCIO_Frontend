import React from 'react';
import { Briefcase, X } from 'lucide-react';
import { format } from 'date-fns';
import { Field, SectionCard } from './DossierHelpers';

export const EmploymentTab = ({
    profile,
    editMode,
    setEditMode,
    formData,
    canEdit,
    redirectToHRISEdit,
    handleSave,
    handleArrayChange,
    addArrayItem,
    removeArrayItem
}) => {
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
