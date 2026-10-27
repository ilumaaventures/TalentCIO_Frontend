import React from 'react';
import { Clock, Calendar, ExternalLink } from 'lucide-react';

export const FollowUpOutreachSection = ({
  followUpDate,
  setFollowUpDate,
  followUpType,
  setFollowUpType,
  followUpNotes,
  setFollowUpNotes,
  handleAddToGoogleCalendar,
}) => {
  return (
    <div className="space-y-3 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/80 text-xs">
      <div className="flex items-center justify-between font-bold text-amber-950 border-b border-amber-200/60 pb-1.5">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Next Scheduled Follow-up / Call</span>
        </div>
        {followUpDate && (
          <button
            type="button"
            onClick={handleAddToGoogleCalendar}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-2 py-0.5 rounded shadow-2xs cursor-pointer transition"
            title="Add this scheduled call to Google Calendar"
          >
            <Calendar className="w-3 h-3 text-indigo-600" />
            <span>Add to Google Calendar</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-amber-950 mb-1">Follow-up Date & Time</label>
          <input
            type="datetime-local"
            required
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-semibold text-amber-950 mb-1">Follow-up Medium</label>
          <select
            value={followUpType}
            onChange={(e) => setFollowUpType(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
          >
            <option value="call">Phone Call</option>
            <option value="whatsapp">WhatsApp Message</option>
            <option value="email">Email Outreach</option>
            <option value="meeting">Online / In-person Demo</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block font-semibold text-amber-950 mb-1">Reminder Notes</label>
        <input
          type="text"
          value={followUpNotes}
          onChange={(e) => setFollowUpNotes(e.target.value)}
          placeholder="e.g. Call after client reviews proposal with CFO"
          className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-amber-500 focus:outline-none"
        />
      </div>
    </div>
  );
};
