import React, { useState, useEffect } from 'react';
import { Mail, Plus, Send, Inbox, CheckCircle2, Search, Building2, User, Clock } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { communicationService } from '../../services/api';
import { CrmMailComposerModal } from '../../components/communication/CrmMailComposerModal';

export const EmailHubPage = () => {
  const [threads, setThreads] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const res = await communicationService.getEmails();
      if (res.success) {
        setThreads(res.data?.threads || []);
        setActivities(res.data?.activities || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const allEmailLogs = [
    ...activities.map((a) => ({
      id: a._id,
      to: a.metadata?.to || a.description?.match(/To:\s*([^\n]+)/)?.[1] || 'Recipient',
      recipientName: a.metadata?.recipientName || a.leadId?.companyName || a.importDataId?.companyName || '',
      subject: a.subject?.replace(/^Email:\s*/i, '') || 'Outreach Email',
      body: a.description || '',
      status: a.outcome || 'Sent',
      sentAt: a.performedAt || a.createdAt,
      sender: a.performedByName || a.performedBy?.firstName || 'Representative'
    })),
    ...threads
  ];

  const filteredLogs = allEmailLogs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.to?.toLowerCase().includes(q) ||
      log.recipientName?.toLowerCase().includes(q) ||
      log.subject?.toLowerCase().includes(q) ||
      log.body?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Mail size={16} />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Email Communication Hub</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Send, track, and review sales outreach emails with saved sender accounts and templates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsComposeOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
        >
          <Plus size={16} />
          <span>Compose Sales Email</span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search sent emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <Card padding="lg" className="text-center py-12">
            <p className="text-xs text-slate-400">Loading email communication logs...</p>
          </Card>
        ) : filteredLogs.length === 0 ? (
          <Card padding="lg" className="text-center py-12 bg-slate-50/50 border-dashed rounded-2xl">
            <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-700">No email communications logged</h3>
            <p className="text-xs text-slate-400 mt-1">Click "Compose Sales Email" to send and track outreach emails.</p>
          </Card>
        ) : (
          filteredLogs.map((email) => (
            <Card key={email.id} padding="md" hover className="cursor-pointer space-y-2 rounded-2xl border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{email.recipientName || email.to}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">{email.to}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {email.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(email.sentAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-800">{email.subject}</p>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed bg-slate-50/60 p-2.5 rounded-xl border border-slate-100 font-mono text-[11px]">
                {email.body}
              </p>
            </Card>
          ))
        )}
      </div>

      <CrmMailComposerModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={fetchEmails}
      />
    </div>
  );
};

export default EmailHubPage;
