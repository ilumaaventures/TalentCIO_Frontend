import React from 'react';
import { Card } from '../../../components/ui/Card';

export const DetailPerformanceTab = ({
  totalTouches = 0,
  callsCount = 0,
  whatsAppCount = 0,
  emailsCount = 0,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card padding="md" className="space-y-1 bg-indigo-50/40 border-indigo-100">
        <span className="text-xs font-semibold text-indigo-700">Total Outreach Touches</span>
        <p className="text-2xl font-black text-indigo-950">{totalTouches}</p>
        <p className="text-[10px] text-slate-500">All channels combined</p>
      </Card>
      <Card padding="md" className="space-y-1 bg-emerald-50/40 border-emerald-100">
        <span className="text-xs font-semibold text-emerald-700">Phone Calls</span>
        <p className="text-2xl font-black text-emerald-950">{callsCount}</p>
        <p className="text-[10px] text-slate-500">Logged call attempts & pitches</p>
      </Card>
      <Card padding="md" className="space-y-1 bg-teal-50/40 border-teal-100">
        <span className="text-xs font-semibold text-teal-700">WhatsApp Messages</span>
        <p className="text-2xl font-black text-teal-950">{whatsAppCount}</p>
        <p className="text-[10px] text-slate-500">Decks & follow-ups sent</p>
      </Card>
      <Card padding="md" className="space-y-1 bg-sky-50/40 border-sky-100">
        <span className="text-xs font-semibold text-sky-700">Emails Sent</span>
        <p className="text-2xl font-black text-sky-950">{emailsCount}</p>
        <p className="text-[10px] text-slate-500">Proposals & formal notes</p>
      </Card>
    </div>
  );
};
