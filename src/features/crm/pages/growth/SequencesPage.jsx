import React, { useState, useEffect } from 'react';
import { Layers, Plus, Clock, Mail, Phone, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { growthService } from '../../services/api';

export const SequencesPage = () => {
  const [sequences, setSequences] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchSequences = async () => {
    setIsLoading(true);
    try {
      const res = await growthService.getSequences();
      if (res.success) setSequences(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSequences();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await growthService.createSequence({
        name,
        description,
        steps: [
          { dayDelay: 0, actionType: 'email', title: 'Day 1: Intro Email' },
          { dayDelay: 2, actionType: 'call_task', title: 'Day 3: Qualification Phone Call' },
          { dayDelay: 5, actionType: 'whatsapp', title: 'Day 6: WhatsApp Case Study' },
          { dayDelay: 10, actionType: 'email', title: 'Day 11: Final Check-in' },
        ],
      });
      setIsModalOpen(false);
      setName('');
      setDescription('');
      fetchSequences();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sales Sequences & Drips</h1>
          <p className="text-xs text-slate-500 mt-0.5">Automated multi-channel outreach schedules for sales reps.</p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
          New Sequence
        </Button>
      </div>

      {sequences.length === 0 ? (
        <Card padding="lg" className="text-center py-16 bg-slate-50/50 border-dashed">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">No active sales sequences</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Design multi-touch sales sequences combining automated emails, call tasks, and WhatsApp check-ins.
          </p>
          <Button size="sm" icon={Plus} className="mt-4" onClick={() => setIsModalOpen(true)}>
            Create First Sequence
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {sequences.map((seq) => (
            <Card key={seq._id} padding="lg" className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">{seq.name}</h3>
                    <Badge variant="emerald" size="sm">{seq.status}</Badge>
                  </div>
                  {seq.description && <p className="text-xs text-slate-500 mt-0.5">{seq.description}</p>}
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Enrolled:</span>{' '}
                    <span className="font-bold text-slate-900">{seq.enrolledCount || 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Response Rate:</span>{' '}
                    <span className="font-bold text-indigo-600">{seq.responseRate || 0}%</span>
                  </div>
                </div>
              </div>

              {/* Sequence Steps Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
                {(seq.steps || []).map((step, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                      <span>STEP {idx + 1}</span>
                      <span className="text-indigo-600 font-bold">+{step.dayDelay} Days</span>
                    </div>
                    <p className="font-bold text-slate-900 line-clamp-1">{step.title}</p>
                    <span className="inline-block text-[10px] uppercase font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {step.actionType}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Sales Sequence"
        subtitle="Build a multi-touch outreach cadence"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Sequence</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Sequence Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Inbound Enterprise Drip"
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Automated touchpoints for new enterprise leads"
          />
        </form>
      </Modal>
    </div>
  );
};
