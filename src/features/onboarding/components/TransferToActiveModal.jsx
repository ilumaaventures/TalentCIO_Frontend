import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/apiClient';
import toast from 'react-hot-toast';
import {
  X,
  ArrowRightCircle,
  ShieldCheck,
  Briefcase,
  UserCheck,
  AlertTriangle,
  Loader2,
  CheckCircle,
  FileCheck
} from 'lucide-react';

const PREDEFINED_EMPLOYMENT_TYPES = [
  'Full Time',
  'Part Time',
  'Contract',
  'Intern',
  'Consultant',
  'Freelance',
  'Probation'
];

const TransferToActiveModal = ({ isOpen, onClose, employee, onSuccess }) => {
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [customTypes, setCustomTypes] = useState([]);
  const [selectedEmploymentType, setSelectedEmploymentType] = useState('Full Time');
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available roles and employment types when modal opens
  useEffect(() => {
    if (!isOpen) {
      setShowConfirmPopup(false);
      setIsSubmitting(false);
      return;
    }

    let isMounted = true;
    const fetchData = async () => {
      setRolesLoading(true);
      try {
        const [rolesRes, typesRes] = await Promise.allSettled([
          api.get('/admin/roles'),
          api.get('/admin/employment-types')
        ]);

        if (isMounted) {
          if (rolesRes.status === 'fulfilled' && Array.isArray(rolesRes.value.data)) {
            const fetchedRoles = rolesRes.value.data;
            setRoles(fetchedRoles);
            // Default to 'Employee' role if present, else first role
            const defaultRole = fetchedRoles.find(
              (r) => r.name?.trim().toLowerCase() === 'employee'
            ) || fetchedRoles[0];
            if (defaultRole) {
              setSelectedRoleId(defaultRole._id);
            }
          }

          if (typesRes.status === 'fulfilled' && typesRes.value.data?.customEmploymentTypes) {
            setCustomTypes(typesRes.value.data.customEmploymentTypes);
          }
        }
      } catch (err) {
        console.error('Error fetching roles or employment types:', err);
      } finally {
        if (isMounted) setRolesLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Combine predefined and custom employment types
  const employmentTypeOptions = useMemo(() => {
    const combined = Array.from(new Set([...PREDEFINED_EMPLOYMENT_TYPES, ...customTypes]));
    return combined;
  }, [customTypes]);

  // Selected role object
  const selectedRole = useMemo(() => {
    return roles.find((r) => r._id === selectedRoleId);
  }, [roles, selectedRoleId]);

  if (!isOpen || !employee) return null;

  const candidateDisplayName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email;

  // Step 1: User clicks "Transfer to Active Employee" in the configuration modal
  const handleProceedToConfirm = (e) => {
    if (e) e.preventDefault();
    if (!selectedRoleId) {
      toast.error('Please select a System Permission (role)');
      return;
    }
    if (!selectedEmploymentType) {
      toast.error('Please select an Employment Type');
      return;
    }
    setShowConfirmPopup(true);
  };

  // Step 2: User clicks "OK" in the confirmation popup
  const handleConfirmTransfer = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        roleId: selectedRoleId,
        employmentType: selectedEmploymentType
      };

      const res = await api.post(`/onboarding/employees/${employee._id}/transfer-to-active`, payload);

      toast.success(
        () => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#065f46' }}>
              ✓ Candidate Successfully Transferred to Active User!
            </span>
            <div style={{ fontSize: '12px', color: '#1e293b', lineHeight: '1.5' }}>
              <div><strong>Name:</strong> {res.data.user?.firstName} {res.data.user?.lastName}</div>
              <div><strong>Employee Code:</strong> {res.data.user?.employeeCode}</div>
              <div><strong>System Permission:</strong> {selectedRole?.name || 'Assigned'}</div>
              <div><strong>Employment Type:</strong> {res.data.user?.employmentType || selectedEmploymentType}</div>
              <div><strong>Docs Transferred:</strong> {res.data.documentsTransferred || 0}</div>
              {res.data.tempPassword && (
                <div><strong>Temp Password:</strong> {res.data.tempPassword}</div>
              )}
              <div style={{ color: '#059669', marginTop: '4px', fontSize: '11px' }}>
                Welcome email with login details has been sent.
              </div>
            </div>
          </div>
        ),
        { duration: 15000 }
      );

      setShowConfirmPopup(false);
      onClose();
      if (onSuccess) {
        onSuccess(res.data, employee._id);
      }
    } catch (err) {
      console.error('Transfer to active employee error:', err);
      toast.error(err.response?.data?.message || 'Failed to transfer employee to active list');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <>
      {/* Step 1: Main Transfer Configuration Modal (centered) */}
      {!showConfirmPopup && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                  <ArrowRightCircle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Transfer to Active Employee</h3>
                  <p className="text-xs text-slate-500">Configure system role and employment type</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleProceedToConfirm} className="p-6 space-y-5">
              {/* Candidate Summary Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{candidateDisplayName}</span>
                      {employee.tempEmployeeId && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-white border border-slate-200 text-slate-600">
                          {employee.tempEmployeeId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{employee.email}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Ready for Activation
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400">Designation:</span>{' '}
                    <span className="font-medium text-slate-700">{employee.designation || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Department:</span>{' '}
                    <span className="font-medium text-slate-700">{employee.department || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Both dropdowns in the SAME row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Field 1: System Permission (Dropdown of System Permissions) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide">
                      <ShieldCheck size={14} className="text-blue-600" />
                      System Permission <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <select
                    required
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    disabled={rolesLoading || isSubmitting}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-medium"
                  >
                    <option value="">Select System Permission</option>
                    {roles.map((role) => (
                      <option key={role._id} value={role._id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {rolesLoading ? 'Loading roles...' : 'System access & role'}
                  </p>
                </div>

                {/* Field 2: Employment Type (Dropdown of Employment Type) */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    <Briefcase size={14} className="text-emerald-600" />
                    Employment Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedEmploymentType}
                    onChange={(e) => setSelectedEmploymentType(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-medium"
                  >
                    <option value="">Select Employment Type</option>
                    {employmentTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Profile & payroll type
                  </p>
                </div>
              </div>

              {/* Migration notice */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
                <FileCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  All submitted & verified onboarding documents will be automatically migrated to their employee dossier upon transfer.
                </p>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.99]"
                >
                  <ArrowRightCircle size={16} />
                  Transfer to Active Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step 2: Confirmation Pop-up (Centered on screen with same-row layout for permissions & type) */}
      {showConfirmPopup && (
        <div
          className="fixed inset-0 z-[99998] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => {
            if (!isSubmitting) setShowConfirmPopup(false);
          }}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Accent Gradient Bar */}
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />

            <div className="p-6">
              {/* Header with Icon */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl border border-emerald-200 shrink-0">
                  <UserCheck size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900">
                    Confirm Transfer to Active Employee
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Please review the details below before activating this candidate.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmPopup(false)}
                  disabled={isSubmitting}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Confirmation Details Card */}
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Candidate:</span>
                  <span className="font-bold text-slate-800">{candidateDisplayName}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Work Email:</span>
                  <span className="font-semibold text-slate-700">{employee.email}</span>
                </div>

                {/* System Permission and Employment Type in that SAME ROW */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/70">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="block text-[11px] text-slate-500 font-medium mb-1">System Permission:</span>
                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      {selectedRole?.name || 'Selected Role'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="block text-[11px] text-slate-500 font-medium mb-1">Employment Type:</span>
                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {selectedEmploymentType}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Note */}
              <p className="mt-4 text-xs text-slate-600 leading-relaxed bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  On confirmation (<strong>OK</strong>), this onboarding candidate will be activated, a user login will be created, and they will be moved to the <strong>active user list</strong>.
                </span>
              </p>

              {/* Confirmation Options: OK and Cancel */}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmPopup(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTransfer}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all hover:shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={15} />
                      OK
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};

export default TransferToActiveModal;
