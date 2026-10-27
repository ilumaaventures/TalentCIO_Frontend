import React from 'react';
import { User, Plus, Trash2, Clock } from 'lucide-react';

export const CallOutreachSection = ({
  selectedContacts,
  resolvedContacts,
  availableContacts,
  handleAddContactPerson,
  handleRemoveContactPerson,
  handleUpdateContactPerson,
  scheduleFollowUp,
  setScheduleFollowUp,
}) => {
  return (
    <div className="space-y-3.5 bg-white p-3.5 rounded-xl border border-slate-200">
      {/* Header: Title + Add Person button */}
      <div className="flex items-center justify-between">
        <label className="block font-semibold text-slate-700 text-xs flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-indigo-600" />
          <span>Contact Person(s) Reached</span>
          <span className="text-rose-500">*</span>
          {selectedContacts.length > 1 && (
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.2 rounded-full">
              {selectedContacts.length} Persons
            </span>
          )}
        </label>

        <button
          type="button"
          onClick={handleAddContactPerson}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer shadow-2xs"
          title="Add another contact person to log this call for"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Person</span>
        </button>
      </div>

      {/* Per-person cards */}
      <div className="space-y-3">
        {selectedContacts.map((entry, idx) => {
          const activeC = resolvedContacts[idx];
          return (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200 space-y-3 text-xs relative"
            >
              {/* Person header */}
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200/80">
                <span className="font-bold text-slate-800 text-[11.5px] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span>Person #{idx + 1}</span>
                  {idx === 0 && (
                    <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-semibold px-1.5 py-0.2 rounded">
                      Primary
                    </span>
                  )}
                </span>
                {selectedContacts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveContactPerson(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition cursor-pointer flex items-center gap-1 text-[11px]"
                    title="Remove this person"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {/* Contact Person Select */}
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                  Contact Person Reached *
                </label>
                <select
                  value={entry.key}
                  onChange={(e) => handleUpdateContactPerson(idx, 'key', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  {availableContacts.map((c, cIdx) => {
                    const details = [
                      c.name,
                      c.designation ? `(${c.designation})` : '',
                      c.phone ? `— ${c.phone}` : '',
                      c.isPrimary ? '★ Primary' : '',
                    ].filter(Boolean);
                    return (
                      <option key={cIdx} value={String(cIdx)}>
                        {details.join(' ')}
                      </option>
                    );
                  })}
                  <option value="custom">+ Add New / Custom Contact Person</option>
                </select>
              </div>

              {/* Custom Contact Input Fields */}
              {entry.key === 'custom' ? (
                <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-indigo-900 mb-0.5">Person Name *</label>
                    <input
                      type="text"
                      value={entry.customName || ''}
                      onChange={(e) => handleUpdateContactPerson(idx, 'customName', e.target.value)}
                      placeholder="e.g. Vikram Sharma"
                      className="w-full px-2.5 py-1 rounded-lg border border-indigo-300 bg-white text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-indigo-900 mb-0.5">Designation</label>
                    <input
                      type="text"
                      value={entry.customDesignation || ''}
                      onChange={(e) => handleUpdateContactPerson(idx, 'customDesignation', e.target.value)}
                      placeholder="e.g. Head of HR / CTO"
                      className="w-full px-2.5 py-1 rounded-lg border border-indigo-300 bg-white text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-indigo-900 mb-0.5">Phone Number</label>
                    <input
                      type="text"
                      value={entry.customPhone || ''}
                      onChange={(e) => handleUpdateContactPerson(idx, 'customPhone', e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-2.5 py-1 rounded-lg border border-indigo-300 bg-white text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              ) : activeC ? (
                <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex-wrap">
                  <span className="font-bold text-slate-900">{activeC.name}</span>
                  {activeC.designation && (
                    <span className="text-slate-500 font-medium">• {activeC.designation}</span>
                  )}
                  {activeC.phone && (
                    <span className="font-mono text-indigo-700 bg-indigo-50/80 px-1.5 py-0.2 rounded border border-indigo-100 text-[10.5px]">
                      {activeC.phone}
                    </span>
                  )}
                  {activeC.email && (
                    <span className="text-slate-500 text-[10.5px]">
                      • {activeC.email}
                    </span>
                  )}
                  {activeC.isPrimary && (
                    <span className="ml-auto text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      Primary
                    </span>
                  )}
                </div>
              ) : null}

              {/* Call Type & Duration */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Call Type</label>
                  <select
                    value={entry.callType || 'Cold Call'}
                    onChange={(e) => handleUpdateContactPerson(idx, 'callType', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
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
                  <label className="block font-semibold text-slate-700 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={entry.durationMinutes ?? '2'}
                    onChange={(e) => handleUpdateContactPerson(idx, 'durationMinutes', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. 2"
                  />
                </div>
              </div>

              {entry.callType === 'Other' && (
                <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-200/80 animate-in fade-in duration-150">
                  <label className="block font-semibold text-indigo-950 mb-1 text-xs">
                    Specify Custom Call Type:
                  </label>
                  <input
                    type="text"
                    value={entry.customCallType || ''}
                    onChange={(e) => handleUpdateContactPerson(idx, 'customCallType', e.target.value)}
                    placeholder="e.g. Technical Discovery with CTO"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Call Outcome */}
              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">Call Outcome</label>
                <select
                  value={entry.callOutcome || 'Connected - Interested'}
                  onChange={(e) => handleUpdateContactPerson(idx, 'callOutcome', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
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

              {entry.callOutcome === 'Other' && (
                <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-200/80 animate-in fade-in duration-150">
                  <label className="block font-semibold text-indigo-950 mb-1 text-xs">
                    Specify Custom Call Outcome:
                  </label>
                  <input
                    type="text"
                    value={entry.customCallOutcome || ''}
                    onChange={(e) => handleUpdateContactPerson(idx, 'customCallOutcome', e.target.value)}
                    placeholder="e.g. Call Rescheduled / Decision Postponed"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Discussion Notes */}
              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">Discussion Notes</label>
                <textarea
                  rows={3}
                  value={entry.callNotes || ''}
                  onChange={(e) => handleUpdateContactPerson(idx, 'callNotes', e.target.value)}
                  placeholder={`Key talking points with ${activeC?.name || 'this contact'}, client requirements, next steps...`}
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          );
        })}
      </div>

      <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs">
        <input
          type="checkbox"
          checked={scheduleFollowUp}
          onChange={(e) => setScheduleFollowUp(e.target.checked)}
          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
        />
        <span className="font-semibold text-slate-800 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          Schedule a follow-up for this call
        </span>
      </label>
    </div>
  );
};
