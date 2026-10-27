import React from 'react';
import { User, Plus, Trash2, Save } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export const EditCompanyModal = ({
  isOpen,
  onClose,
  editingRow,
  setEditingRow,
  onSave,
  isSaving = false,
}) => {
  if (!isOpen || !editingRow) return null;

  const handleAddContact = () => {
    setEditingRow((prev) => ({
      ...prev,
      contacts: [
        ...(prev?.contacts || []),
        { contactPerson: '', designation: '', mobileNo: '', emailId: '', isPrimary: false },
      ],
    }));
  };

  const handleUpdateContact = (index, field, value) => {
    setEditingRow((prev) => {
      const next = [...(prev?.contacts || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, contacts: next };
    });
  };

  const handleSetPrimaryContact = (index) => {
    setEditingRow((prev) => ({
      ...prev,
      contacts: (prev?.contacts || []).map((c, i) => ({ ...c, isPrimary: i === index })),
    }));
  };

  const handleRemoveContact = (index) => {
    setEditingRow((prev) => {
      const current = prev?.contacts || [];
      if (current.length <= 1) return prev;
      const next = current.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((c) => c.isPrimary)) {
        next[0].isPrimary = true;
      }
      return { ...prev, contacts: next };
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSaving && onClose()}
      title={`Edit Company: ${editingRow.companyName || 'Lead'}`}
      subtitle="Update any details below and click 'Save' to persist directly to the CRM database."
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            icon={Save}
            isLoading={isSaving}
            onClick={onSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
          >
            Save
          </Button>
        </div>
      }
    >
      <form onSubmit={onSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Company Name"
            required
            value={editingRow.companyName || ''}
            onChange={(e) =>
              setEditingRow((prev) => ({ ...prev, companyName: e.target.value }))
            }
            placeholder="e.g. Acme Corp"
          />

          <Input
            label="GSTIN"
            value={editingRow.gstin || ''}
            onChange={(e) =>
              setEditingRow((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))
            }
            placeholder="e.g. 29AABCI1234A1Z5"
          />

          <Input
            label="Date of Registration"
            value={editingRow.dateOfRegistration || ''}
            onChange={(e) =>
              setEditingRow((prev) => ({ ...prev, dateOfRegistration: e.target.value }))
            }
            placeholder="e.g. YYYY-MM-DD"
          />

          {/* Multi-Contact Persons List */}
          <div className="sm:col-span-2 space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Contact Persons ({(editingRow.contacts || []).length})</span>
              </label>
              <button
                type="button"
                onClick={handleAddContact}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Contact Person</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {(editingRow.contacts || []).map((contact, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border space-y-2.5 text-xs ${
                    contact.isPrimary ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700">
                        {contact.contactPerson || `Person ${idx + 1}`}
                      </span>
                      {contact.isPrimary ? (
                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Primary
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryContact(idx)}
                          className="text-[10px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                        >
                          Make Primary
                        </button>
                      )}
                    </div>
                    {(editingRow.contacts || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveContact(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                        title="Remove contact person"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      label="Contact Person"
                      value={contact.contactPerson || ''}
                      onChange={(e) => handleUpdateContact(idx, 'contactPerson', e.target.value)}
                      placeholder="e.g. Rahul Verma"
                    />
                    <Input
                      label="Designation / Role"
                      value={contact.designation || ''}
                      onChange={(e) => handleUpdateContact(idx, 'designation', e.target.value)}
                      placeholder="e.g. VP Sales"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      label="Mobile No"
                      value={contact.mobileNo || ''}
                      onChange={(e) => handleUpdateContact(idx, 'mobileNo', e.target.value)}
                      placeholder="e.g. +91 98200 12345"
                    />
                    <Input
                      label="Email ID"
                      type="email"
                      value={contact.emailId || ''}
                      onChange={(e) => handleUpdateContact(idx, 'emailId', e.target.value)}
                      placeholder="e.g. rahul@company.com"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Input
            label="Industry"
            value={editingRow.industry || ''}
            onChange={(e) =>
              setEditingRow((prev) => ({ ...prev, industry: e.target.value }))
            }
            placeholder="e.g. Information Technology"
          />

          <Input
            label="Rating"
            value={editingRow.rating || ''}
            onChange={(e) =>
              setEditingRow((prev) => ({ ...prev, rating: e.target.value }))
            }
            placeholder="e.g. 4.5"
          />

          <Input
            label="Source"
            value={editingRow.source || editingRow.leadSource || ''}
            onChange={(e) =>
              setEditingRow((prev) => ({
                ...prev,
                source: e.target.value,
                leadSource: e.target.value,
              }))
            }
            placeholder="e.g. LinkedIn, Cold Call, Referral"
          />

          <Input
            label="Date"
            type="date"
            value={editingRow.dateInput || ''}
            onChange={(e) =>
              setEditingRow((prev) => ({ ...prev, dateInput: e.target.value }))
            }
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
            Address
          </label>
          <textarea
            rows={2}
            value={editingRow.address || ''}
            onChange={(e) =>
              setEditingRow((prev) => ({ ...prev, address: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            placeholder="Full address or location..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
            Remarks / Notes
          </label>
          <textarea
            rows={2}
            value={editingRow.remarks || ''}
            onChange={(e) =>
              setEditingRow((prev) => ({ ...prev, remarks: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            placeholder="Additional notes or remarks..."
          />
        </div>
      </form>
    </Modal>
  );
};
