import React, { useState, useEffect } from 'react';
import { Mail, Plus, Send, Inbox, CheckCircle2, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { communicationService } from '../../services/api';

export const EmailHubPage = () => {
  const [threads, setThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [formData, setFormData] = useState({ to: '', recipientName: '', subject: '', body: '' });

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const res = await communicationService.getEmails();
      if (res.success) {
        setThreads(res.data.threads || []);
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

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      await communicationService.sendEmail(formData);
      setIsComposeOpen(false);
      setFormData({ to: '', recipientName: '', subject: '', body: '' });
      fetchEmails();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Email Communication Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">Two-way sales email tracking and outreach logs.</p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setIsComposeOpen(true)}>
          Compose Email
        </Button>
      </div>

      <div className="space-y-3">
        {threads.length === 0 ? (
          <Card padding="lg" className="text-center py-12 bg-slate-50/50 border-dashed">
            <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-700">No email communications logged</h3>
            <p className="text-xs text-slate-400 mt-1">Click "Compose Email" to send and track outreach emails.</p>
          </Card>
        ) : (
          threads.map((email) => (
            <Card key={email.id} padding="md" hover className="cursor-pointer space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-900">{email.recipientName || email.to}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={email.opened ? 'emerald' : 'blue'} size="sm">
                    {email.status}
                  </Badge>
                  <span className="text-[10px] text-slate-400">
                    {new Date(email.sentAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-800">{email.subject}</p>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{email.body}</p>
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        title="Compose Sales Email"
        subtitle="Send email and auto-log to client timeline"
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsComposeOpen(false)}>Cancel</Button>
            <Button icon={Send} onClick={handleSend}>Send Email</Button>
          </>
        }
      >
        <form onSubmit={handleSend} className="space-y-4">
          <Input
            label="Recipient Email"
            type="email"
            required
            value={formData.to}
            onChange={(e) => setFormData({ ...formData, to: e.target.value })}
            placeholder="client@company.in"
          />
          <Input
            label="Subject"
            required
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="e.g. Solution Proposal & Commercial Terms"
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Message Body
            </label>
            <textarea
              rows={5}
              required
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Hi Rajesh, Following up on our discussion..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
