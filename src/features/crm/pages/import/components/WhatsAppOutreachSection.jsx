import React from 'react';
import { User, ExternalLink } from 'lucide-react';

export const WhatsAppOutreachSection = ({
  availableContacts,
  selectedContactKey,
  setSelectedContactKey,
  cleanPhone,
  handleLaunchWhatsApp,
  whatsappOutcome,
  setWhatsappOutcome,
  whatsappNotes,
  setWhatsappNotes,
}) => {
  return (
    <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
      {availableContacts.length > 1 && (
        <div>
          <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Contact Person Targeted</span>
            </span>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {availableContacts.length} Contacts on file
            </span>
          </label>
          <select
            value={selectedContactKey}
            onChange={(e) => setSelectedContactKey(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          >
            {availableContacts.map((c, idx) => {
              const details = [
                c.name,
                c.designation ? `(${c.designation})` : '',
                c.phone ? `— ${c.phone}` : '',
                c.isPrimary ? '★ Primary' : '',
              ].filter(Boolean);
              return (
                <option key={idx} value={String(idx)}>
                  {details.join(' ')}
                </option>
              );
            })}
            <option value="custom">+ Other / Specific Contact</option>
          </select>
        </div>
      )}

      <div className="flex items-center justify-between pb-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
        <span className="font-semibold text-slate-700">Quick WhatsApp Message</span>
        {cleanPhone && (
          <button
            type="button"
            onClick={handleLaunchWhatsApp}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
          >
            <span>Launch WhatsApp Web</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">WhatsApp Status</label>
        <select
          value={whatsappOutcome}
          onChange={(e) => setWhatsappOutcome(e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="Sent">Message Sent</option>
          <option value="Replied">Client Replied</option>
          <option value="Shared Proposal">Shared Company Profile / Brochure</option>
        </select>
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Notes / Message Summary</label>
        <textarea
          rows={3}
          value={whatsappNotes}
          onChange={(e) => setWhatsappNotes(e.target.value)}
          placeholder="Sent intro deck and asked for callback time..."
          className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
        />
      </div>
    </div>
  );
};
