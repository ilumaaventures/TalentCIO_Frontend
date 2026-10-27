import React from 'react';
import { Check, Users, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

export const EditContactsModal = ({
  isOpen,
  onClose,
  companyName = 'Company',
  contactsList = [],
  onSave,
  isSaving = false,
  onAddContact,
  onRemoveContact,
  onUpdateContact,
  onSetPrimaryContact,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSaving && onClose()}
      title="Edit Contact Persons"
      subtitle={`Company: ${companyName} • Manage all key decision makers and contact persons`}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            icon={Check}
          >
            {isSaving ? 'Saving Changes...' : 'Save Contacts'}
          </Button>
        </div>
      }
    >
      <form onSubmit={onSave} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Contact Persons ({contactsList.length})</span>
          </div>
          <button
            type="button"
            onClick={onAddContact}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Contact Person</span>
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {contactsList.map((contact, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border space-y-3 text-xs transition ${
                contact.isPrimary
                  ? 'bg-indigo-50/40 border-indigo-200 shadow-2xs'
                  : 'bg-slate-50 border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-900">
                    {contact.contactPerson ? contact.contactPerson : `Person ${idx + 1}`}
                  </span>
                  {contact.isPrimary ? (
                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Primary Contact
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSetPrimaryContact && onSetPrimaryContact(idx)}
                      className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                    >
                      Make Primary
                    </button>
                  )}
                </div>
                {contactsList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveContact && onRemoveContact(idx)}
                    className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                    title="Remove contact person"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    value={contact.contactPerson || ''}
                    onChange={(e) => onUpdateContact && onUpdateContact(idx, 'contactPerson', e.target.value)}
                    placeholder="e.g. Rahul Verma"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Designation / Role
                  </label>
                  <input
                    type="text"
                    value={contact.designation || ''}
                    onChange={(e) => onUpdateContact && onUpdateContact(idx, 'designation', e.target.value)}
                    placeholder="e.g. VP Sales / Director"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={contact.mobileNo || ''}
                    onChange={(e) => onUpdateContact && onUpdateContact(idx, 'mobileNo', e.target.value)}
                    placeholder="e.g. +91 98200 12345"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={contact.emailId || ''}
                    onChange={(e) => onUpdateContact && onUpdateContact(idx, 'emailId', e.target.value)}
                    placeholder="e.g. rahul@company.com"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </form>
    </Modal>
  );
};
