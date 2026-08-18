import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Settings2, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/apiClient';
import CompensationFormSection from '@/features/payroll/components/compensation/CompensationFormSection';
import EmploymentTypeSelect from './EmploymentTypeSelect';

const DEFAULT_EMPLOYMENT_TYPES = [
    'Full Time',
    'Part Time',
    'Contract',
    'Intern',
    'Consultant',
    'Freelance',
    'Probation'
];

const UserFormModal = ({
    showModal,
    setShowModal,
    editingUser,
    formData,
    setFormData,
    handleChange,
    handleSubmit,
    showPassword,
    setShowPassword,
    roles,
    users,
    attendanceShiftOptions,
    showSalarySection,
    setShowSalarySection,
    calculateSalaryBreakdown,
}) => {
    const navigate = useNavigate();
    const [managedDepartments, setManagedDepartments] = useState([]);

    useEffect(() => {
        if (!showModal) return;
        api.get('/organization/departments?includeInactive=false')
            .then((res) => setManagedDepartments(res.data || []))
            .catch(() => {});
    }, [showModal]);

    if (!showModal) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-5">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-blob max-h-[94vh] overflow-y-auto relative">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">{editingUser ? 'Edit Employee' : 'Add New Employee'}</h3>
                    <button
                        onClick={() => {
                            setShowModal(false);
                            setShowPassword(false);
                        }}
                        className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                    >
                        &times;
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">First Name</label>
                            <input name="firstName" required value={formData.firstName} onChange={handleChange} className="zoho-input" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Last Name</label>
                            <input name="lastName" value={formData.lastName} onChange={handleChange} className="zoho-input" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                            <input name="email" type="email" required value={formData.email} onChange={handleChange} className="zoho-input" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password {editingUser && '(Leave blank to keep)'}</label>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required={!editingUser}
                                    onChange={handleChange}
                                    className="zoho-input pr-11"
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
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
                            <input
                                name="department"
                                list="managed-departments-list"
                                value={formData.department}
                                onChange={handleChange}
                                placeholder="Select or type department..."
                                className="zoho-input"
                            />
                            <datalist id="managed-departments-list">
                                {managedDepartments.map((dept) => (
                                    <option key={dept._id} value={dept.name} />
                                ))}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Employee Code</label>
                            <input name="employeeCode" value={formData.employeeCode} onChange={handleChange} className="zoho-input" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date of Joining</label>
                            <input name="joiningDate" type="date" value={formData.joiningDate} onChange={handleChange} className="zoho-input" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Employment Type</label>
                            <EmploymentTypeSelect
                                value={formData.employmentType}
                                onChange={handleChange}
                                name="employmentType"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Work Location</label>
                            <input name="workLocation" value={formData.workLocation} onChange={handleChange} placeholder="e.g. Headquarters" className="zoho-input" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Attendance Mode</label>
                            <select name="attendanceMode" value={formData.attendanceMode} onChange={handleChange} className="zoho-input">
                                <option value="clock_in_out">Clock In / Clock Out</option>
                                <option value="present_only">Mark Present Only</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Attendance Shift</label>
                            <select name="attendanceShiftCode" value={formData.attendanceShiftCode} onChange={handleChange} className="zoho-input">
                                {attendanceShiftOptions.map((shift) => (
                                    <option key={shift.code} value={shift.code}>
                                        {shift.name} ({shift.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 1. Total Workforce Toggle */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Workforce</label>
                            <div className="flex items-center gap-3 mt-1.5">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isTotalWorkforce: true })}
                                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                        formData.isTotalWorkforce !== false
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    Yes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isTotalWorkforce: false })}
                                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                        formData.isTotalWorkforce === false
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    No
                                </button>
                                <span className="text-[11px] text-slate-400 leading-tight">
                                    {formData.isTotalWorkforce !== false ? 'Count in headcount' : 'Exclude from headcount'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 2. System Permission */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase">System Permission</label>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowModal(false);
                                    navigate('/roles');
                                }}
                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 hover:underline"
                            >
                                <Plus size={12} /> Add New +
                            </button>
                        </div>
                        <select name="roleId" required value={formData.roleId} onChange={handleChange} className="zoho-input">
                            <option value="">Select System Permission</option>
                            {roles.map(r => (
                                <option key={r._id} value={r._id}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Direct Reports Multi-Select */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign Subordinates (Inverse: Who reports to this user)</label>
                        <div className="h-32 overflow-y-auto border border-slate-200 rounded p-2 bg-slate-50 grid grid-cols-2 gap-2">
                            {users.filter(u => !editingUser || u._id !== editingUser._id).map(user => (
                                <label key={user._id} className="flex items-center space-x-2 text-sm bg-white p-2 rounded border border-slate-100 shadow-sm cursor-pointer hover:border-blue-300">
                                    <input
                                        type="checkbox"
                                        value={user._id}
                                        checked={formData.directReports?.includes(user._id)}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            const id = user._id;
                                            setFormData(prev => {
                                                const current = prev.directReports || [];
                                                if (checked) return { ...prev, directReports: [...current, id] };
                                                return { ...prev, directReports: current.filter(x => x !== id) };
                                            });
                                        }}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-700">{user.firstName} {user.lastName}</span>
                                        <span className="text-[10px] text-slate-400">{user.email}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Selected users will have this person set as their Reporting Manager.</p>
                    </div>

                    {/* Salary Details Section */}
                    <div className="col-span-2 mt-4 border-t border-slate-100 pt-4">
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
                            <div className="mt-4">
                                <CompensationFormSection
                                    formData={formData}
                                    calculateSalaryBreakdown={calculateSalaryBreakdown}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 mt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setShowModal(false);
                                setShowPassword(false);
                            }}
                            className="zoho-btn-secondary"
                        >
                            Cancel
                        </button>
                        <button type="submit" className="zoho-btn-primary">{editingUser ? 'Update User' : 'Create User'}</button>
                    </div>
                </form>

            </div>
        </div>
    );
};

export default UserFormModal;
