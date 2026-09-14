import React, { useState, useEffect } from 'react';
import { PhoneCall, PhoneForwarded, PhoneIncoming, Clock, Plus, Phone } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { activitiesService, communicationService } from '../../services/api';

export const CallingHubPage = () => {
  const [calls, setCalls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [dialerData, setDialerData] = useState({
    phoneNumber: '',
    contactName: '',
    durationMinutes: 5,
    outcome: 'Connected',
    notes: '',
  });

  const fetchCalls = async () => {
    setIsLoading(true);
    try {
      const res = await activitiesService.getActivities({ type: 'call' });
      if (res.success) setCalls(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const handleLogCall = async (e) => {
    e.preventDefault();
    try {
      await communicationService.logCall(dialerData);
      setIsDialerOpen(false);
      setDialerData({ phoneNumber: '', contactName: '', durationMinutes: 5, outcome: 'Connected', notes: '' });
      fetchCalls();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Calling & Telephony Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Click-to-call logs, call durations, outcomes, and voice conversation notes.
          </p>
        </div>
        <Button size="sm" icon={Phone} onClick={() => setIsDialerOpen(true)}>
          New Call Log
        </Button>
      </div>

      <Card padding="lg">
        <div className="divide-y divide-slate-100">
          {calls.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No call logs recorded.</p>
          ) : (
            calls.map((call) => (
              <div key={call._id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <PhoneForwarded className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{call.subject}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Duration: {call.durationMinutes || 0} mins • Logged by {call.performedByName || 'Rep'} • {new Date(call.performedAt).toLocaleString()}
                    </p>
                    {call.description && <p className="text-xs text-slate-600 mt-1">{call.description}</p>}
                  </div>
                </div>
                <Badge variant={call.outcome === 'Connected' ? 'emerald' : 'neutral'} size="sm">
                  {call.outcome || 'Completed'}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Dialer Modal */}
      <Modal
        isOpen={isDialerOpen}
        onClose={() => setIsDialerOpen(false)}
        title="Call Dialer & Logging"
        subtitle="Record outbound call details and outcome notes"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsDialerOpen(false)}>Cancel</Button>
            <Button onClick={handleLogCall}>Save Call</Button>
          </>
        }
      >
        <form onSubmit={handleLogCall} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact / Lead Name"
              required
              value={dialerData.contactName}
              onChange={(e) => setDialerData({ ...dialerData, contactName: e.target.value })}
              placeholder="Rajesh Sharma"
            />
            <Input
              label="Phone Number"
              required
              value={dialerData.phoneNumber}
              onChange={(e) => setDialerData({ ...dialerData, phoneNumber: e.target.value })}
              placeholder="+91 98200 12345"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duration (Minutes)"
              type="number"
              value={dialerData.durationMinutes}
              onChange={(e) => setDialerData({ ...dialerData, durationMinutes: e.target.value })}
            />
            <Select
              label="Call Outcome"
              value={dialerData.outcome}
              onChange={(e) => setDialerData({ ...dialerData, outcome: e.target.value })}
              options={[
                { value: 'Connected', label: 'Connected & Discussed' },
                { value: 'Left Voicemail', label: 'Left Voicemail' },
                { value: 'Busy', label: 'Busy' },
                { value: 'Scheduled Meeting', label: 'Scheduled Meeting' },
                { value: 'Wrong Number', label: 'Wrong Number' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Call Summary & Notes
            </label>
            <textarea
              rows={3}
              value={dialerData.notes}
              onChange={(e) => setDialerData({ ...dialerData, notes: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Discussed pricing structure and timeline..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
