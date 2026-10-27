import React from 'react';
import { Check, Users, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

export const EditCallActivityModal = ({
  isOpen,
  onClose,
  companyName = 'Prospect',
  editFormData,
  setEditFormData,
  onSave,
  isUpdating = false,
  onAddPerson,
  onRemovePerson,
  onUpdatePerson,
}) => {
  if (!isOpen || !editFormData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isUpdating && onClose()}
      title="Edit Call Details"
      subtitle={`Company: ${companyName} • Update call record, outcomes, duration & feedback`}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={isUpdating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            icon={Check}
          >
            {isUpdating ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      }
    >
      <form onSubmit={onSave} className="space-y-4">
        {/* If multi-person call */}
        {editFormData.contactPersons && editFormData.contactPersons.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Call Participants ({editFormData.contactPersons.length})</span>
              </div>
              <button
                type="button"
                onClick={onAddPerson}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Participant</span>
              </button>
            </div>

            <div className="space-y-3">
              {editFormData.contactPersons.map((person, pIdx) => (
                <div
                  key={pIdx}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                        {pIdx + 1}
                      </span>
                      <span>Person {pIdx + 1} Details</span>
                    </span>
                    {editFormData.contactPersons.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemovePerson && onRemovePerson(pIdx)}
                        className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                        title="Remove participant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Name, Designation, Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={person.name}
                        onChange={(e) => onUpdatePerson && onUpdatePerson(pIdx, 'name', e.target.value)}
                        placeholder="e.g. Monika Sinha"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                        Designation
                      </label>
                      <input
                        type="text"
                        value={person.designation}
                        onChange={(e) => onUpdatePerson && onUpdatePerson(pIdx, 'designation', e.target.value)}
                        placeholder="e.g. Director"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={person.phone}
                        onChange={(e) => onUpdatePerson && onUpdatePerson(pIdx, 'phone', e.target.value)}
                        placeholder="e.g. 7903583435"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Call Type & Duration */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                        Call Type
                      </label>
                      <select
                        value={person.callType || 'Cold Call'}
                        onChange={(e) => onUpdatePerson && onUpdatePerson(pIdx, 'callType', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="Cold Call">Cold Call</option>
                        <option value="Discovery / Pitch">Discovery / Pitch</option>
                        <option value="Follow-up Call">Follow-up Call</option>
                        <option value="Demo Scheduled">Demo Scheduled</option>
                        <option value="Commercial Negotiation">Commercial Negotiation</option>
                        <option value="Closing Call">Closing Call</option>
                        <option value="Account Check-in">Account Check-in</option>
                        <option value="Gatekeeper Inquiry">Gatekeeper Inquiry</option>
                        <option value="Payment Follow-up">Payment Follow-up</option>
                        <option value="Other">Other (Custom Type)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                        Duration (Mins)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="180"
                        value={person.durationMinutes}
                        onChange={(e) => onUpdatePerson && onUpdatePerson(pIdx, 'durationMinutes', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {person.callType === 'Other' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-indigo-900 mb-0.5">
                        Custom Call Type
                      </label>
                      <input
                        type="text"
                        value={person.customCallType || ''}
                        onChange={(e) => onUpdatePerson && onUpdatePerson(pIdx, 'customCallType', e.target.value)}
                        placeholder="Specify custom call type..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {/* Outcome */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                      Call Outcome
                    </label>
                    <select
                      value={person.outcome || 'Connected - Interested'}
                      onChange={(e) => onUpdatePerson && onUpdatePerson(pIdx, 'outcome', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Connected - Interested">Connected - Interested / Warm</option>
                      <option value="Connected - Follow-up Requested">Connected - Follow-up Requested</option>
                      <option value="Connected - Demo Scheduled">Connected - Demo Scheduled</option>
                      <option value="Connected - Shared Info on WhatsApp">Connected - Shared Info on WhatsApp</option>
                      <option value="Connected - Not Interested">Connected - Not Interested</option>
                      <option value="Connected - Gatekeeper Blocked">Connected - Gatekeeper Blocked</option>
                      <option value="No Answer / Ringing">No Answer / Ringing</option>
                      <option value="Busy / Call Dropped">Busy / Call Dropped</option>
                      <option value="Wrong Number / Invalid">Wrong Number / Invalid</option>
                      <option value="Other">Other (Custom Outcome)</option>
                    </select>
                  </div>

                  {person.outcome === 'Other' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-indigo-900 mb-0.5">
                        Custom Call Outcome
                      </label>
                      <input
                        type="text"
                        value={person.customOutcome || ''}
                        onChange={(e) => onUpdatePerson && onUpdatePerson(pIdx, 'customOutcome', e.target.value)}
                        placeholder="Specify custom outcome..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                      Discussion Notes
                    </label>
                    <textarea
                      rows={2}
                      value={person.notes || ''}
                      onChange={(e) => onUpdatePerson && onUpdatePerson(pIdx, 'notes', e.target.value)}
                      placeholder="Feedback or key discussion points with this person..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Single person call */
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={editFormData.contactPerson || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, contactPerson: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                  Designation
                </label>
                <input
                  type="text"
                  value={editFormData.contactDesignation || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, contactDesignation: e.target.value })}
                  placeholder="e.g. HR Manager"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editFormData.contactPhone || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, contactPhone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                  Call Type
                </label>
                <select
                  value={editFormData.callType || 'Cold Call'}
                  onChange={(e) => setEditFormData({ ...editFormData, callType: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Cold Call">Cold Call</option>
                  <option value="Discovery / Pitch">Discovery / Pitch</option>
                  <option value="Follow-up Call">Follow-up Call</option>
                  <option value="Demo Scheduled">Demo Scheduled</option>
                  <option value="Commercial Negotiation">Commercial Negotiation</option>
                  <option value="Closing Call">Closing Call</option>
                  <option value="Account Check-in">Account Check-in</option>
                  <option value="Gatekeeper Inquiry">Gatekeeper Inquiry</option>
                  <option value="Payment Follow-up">Payment Follow-up</option>
                  <option value="Other">Other (Custom Type)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                  Duration (Mins)
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={editFormData.durationMinutes || 0}
                  onChange={(e) => setEditFormData({ ...editFormData, durationMinutes: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {editFormData.callType === 'Other' && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-indigo-900 mb-0.5">
                  Custom Call Type
                </label>
                <input
                  type="text"
                  value={editFormData.customCallType || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, customCallType: e.target.value })}
                  placeholder="Specify custom call type..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                Call Outcome
              </label>
              <select
                value={editFormData.outcome || 'Connected - Interested'}
                onChange={(e) => setEditFormData({ ...editFormData, outcome: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Connected - Interested">Connected - Interested / Warm</option>
                <option value="Connected - Follow-up Requested">Connected - Follow-up Requested</option>
                <option value="Connected - Demo Scheduled">Connected - Demo Scheduled</option>
                <option value="Connected - Shared Info on WhatsApp">Connected - Shared Info on WhatsApp</option>
                <option value="Connected - Not Interested">Connected - Not Interested</option>
                <option value="Connected - Gatekeeper Blocked">Connected - Gatekeeper Blocked</option>
                <option value="No Answer / Ringing">No Answer / Ringing</option>
                <option value="Busy / Call Dropped">Busy / Call Dropped</option>
                <option value="Wrong Number / Invalid">Wrong Number / Invalid</option>
                <option value="Other">Other (Custom Outcome)</option>
              </select>
            </div>

            {editFormData.outcome === 'Other' && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-indigo-900 mb-0.5">
                  Custom Call Outcome
                </label>
                <input
                  type="text"
                  value={editFormData.customOutcome || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, customOutcome: e.target.value })}
                  placeholder="Specify custom outcome..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                Discussion Notes
              </label>
              <textarea
                rows={3}
                value={editFormData.description || ''}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Feedback or key discussion points..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
