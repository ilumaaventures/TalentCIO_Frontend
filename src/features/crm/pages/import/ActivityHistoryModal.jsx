import React, { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  MessageSquare,
  Mail,
  Clock,
  Calendar,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Paperclip,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { dataService } from '../../services/api';

export const ActivityHistoryModal = ({
  isOpen,
  onClose,
  row,
  onLogNew,
}) => {
  const [activities, setActivities] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const rowId = row?._id || row?.id;
  const fetchActivities = useCallback(async () => {
    if (!rowId) return;
    setIsLoading(true);
    try {
      const res = await dataService.getActivities(rowId);
      if (res?.success) {
        setActivities(res.data.activities || []);
        setFollowUps(res.data.followUps || []);
      }
    } catch (err) {
      console.error('Failed to load activities', err);
    } finally {
      setIsLoading(false);
    }
  }, [rowId]);

  useEffect(() => {
    if (isOpen && rowId) {
      fetchActivities();
    }
  }, [isOpen, rowId, fetchActivities]);

  if (!isOpen || !row) return null;

  const getActivityIcon = (type) => {
    switch (type) {
      case 'call':
        return <Phone className="w-3.5 h-3.5 text-indigo-600" />;
      case 'whatsapp':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-blue-600" />;
      case 'meeting':
        return <Calendar className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  const getOutcomeBadge = (outcome) => {
    if (!outcome) return null;
    const isPositive = ['Connected - Interested', 'Scheduled Meeting', 'Replied'].includes(outcome);
    const isPending = ['Callback Requested', 'Sent', 'Completed'].includes(outcome);
    const isNegative = ['Connected - Not Interested', 'Wrong Number'].includes(outcome);

    const variant = isPositive ? 'emerald' : isPending ? 'amber' : isNegative ? 'rose' : 'slate';
    return (
      <Badge variant={variant} size="sm">
        {outcome}
      </Badge>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Prospect Activity & Interaction History"
      subtitle={`${row.companyName || 'Company'} • Total Calls: ${row.callCount || activities.filter(a => a.type === 'call').length}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 pt-1">
        {/* Header Summary */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="font-bold text-slate-900 text-sm">{row.companyName || '—'}</span>
            </div>
            <p className="text-slate-500 mt-0.5 text-[11px]">
              {row.contactPerson || 'No contact person'} • {row.mobileNo || 'No phone'} • {row.emailId || 'No email'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              icon={RefreshCw}
              onClick={fetchActivities}
              disabled={isLoading}
              title="Refresh timeline"
            />
            <Button
              size="sm"
              icon={Plus}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
              onClick={() => {
                onClose();
                if (onLogNew) onLogNew(row);
              }}
            >
              Log New Activity
            </Button>
          </div>
        </div>

        {/* Scheduled Follow-ups Alert */}
        {followUps.length > 0 && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-900">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Scheduled Follow-ups ({followUps.length})</span>
              </div>
            </div>
            <div className="divide-y divide-amber-200/50">
              {followUps.map((f) => (
                <div key={f._id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{f.title}</p>
                    <p className="text-[11px] text-slate-500">
                      Due: <strong className="text-amber-800">{new Date(f.scheduledDate).toLocaleString()}</strong> • Assigned to: {f.assignedTo?.firstName || 'Representative'}
                    </p>
                    {f.notes && <p className="text-[11px] text-slate-600 mt-0.5 italic">"{f.notes}"</p>}
                  </div>
                  <Badge variant={f.status === 'completed' ? 'emerald' : 'amber'} size="sm">
                    {f.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline Stream */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <h4 className="font-bold text-slate-900">Interaction Timeline ({activities.length})</h4>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
              Loading activity history...
            </div>
          ) : activities.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-600">No activities logged yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click "Log New Activity" to record a call, WhatsApp message, or meeting.
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-4 pl-4 space-y-4 py-1">
              {activities.map((act) => (
                <div key={act._id} className="relative group text-xs">
                  {/* Dot icon */}
                  <div className="absolute -left-[25px] top-0.5 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                    {getActivityIcon(act.type)}
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">{act.subject}</span>
                        {getOutcomeBadge(act.outcome)}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(act.performedAt).toLocaleString()}
                      </span>
                    </div>

                    {(act.contactPersons && act.contactPersons.length > 1) ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap">
                          <User className="w-3 h-3 text-indigo-500" />
                          <span>Reached ({act.contactPersons.length} Contacts):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {act.contactPersons.map((p, pIdx) => (
                            <span key={pIdx} className="inline-flex items-center gap-1.5 font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 text-[10.5px]">
                              <strong className="text-slate-900">{p.name}</strong>
                              {p.designation && <span className="text-slate-400">({p.designation})</span>}
                              {p.phone && <span className="font-mono text-indigo-600">{p.phone}</span>}
                              {p.callType && <span className="bg-indigo-50 text-indigo-700 px-1 rounded text-[9.5px] font-semibold">{p.callType}</span>}
                              {p.durationMinutes > 0 && <span className="text-slate-500 font-medium">{p.durationMinutes}m</span>}
                              {p.outcome && <span className="text-emerald-700 bg-emerald-50 px-1 rounded text-[9.5px] font-semibold">{p.outcome}</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (act.contactPerson || act.metadata?.contactPerson) ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap">
                        <User className="w-3 h-3 text-indigo-500" />
                        <span>Reached: <strong className="text-slate-700">{act.contactPerson || act.metadata?.contactPerson}</strong></span>
                        {(act.contactDesignation || act.metadata?.contactDesignation) && (
                          <span className="text-slate-400">({act.contactDesignation || act.metadata?.contactDesignation})</span>
                        )}
                        {(act.contactPhone || act.metadata?.contactPhone) && (
                          <span className="font-mono text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-100 text-[10px]">
                            {act.contactPhone || act.metadata?.contactPhone}
                          </span>
                        )}
                      </div>
                    ) : null}

                    {act.description && (
                      <p className="text-slate-600 text-[11px] leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {act.description}
                      </p>
                    )}

                    {/* Email Attachments indicator */}
                    {act.type === 'email' && (() => {
                      let attList = act.attachments || act.metadata?.attachments || act.metadata?.attachmentFileNames || [];
                      if (!attList?.length && act.description?.includes('Attachment')) {
                        const m = act.description.match(/Attachments?(?:\s*\(\d+\))?:\s*([^\n\r]+)/i);
                        if (m && m[1]) attList = m[1].split(',').map((s) => s.trim()).filter(Boolean);
                      }
                      if (!Array.isArray(attList) || attList.length === 0) return null;
                      return (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-800 text-[10px] font-bold">
                            <Paperclip className="w-3 h-3 text-sky-600" />
                            {attList.length} Attachment{attList.length > 1 ? 's' : ''}:
                          </span>
                          {attList.map((item, idx) => {
                            const name = typeof item === 'string' ? item : item.filename || item.name || 'File';
                            return (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[10px] font-medium truncate max-w-[140px]"
                                title={name}
                              >
                                {name}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1 flex-wrap">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        {act.type === 'email' && (act.metadata?.fromEmail || act.metadata?.fromAddress || act.metadata?.fromName) ? (
                          <span>
                            From: <strong className="text-slate-700">{act.metadata.fromName || 'Sender'}</strong>
                            {(act.metadata.fromEmail || act.metadata.fromAddress) && (
                              <span className="text-slate-500 ml-0.5">({act.metadata.fromEmail || act.metadata.fromAddress})</span>
                            )}
                            {act.performedByName && (
                              <span className="text-slate-400 ml-1.5">
                                • Dispatched by: <strong className="text-slate-600">{act.performedByName}</strong>
                              </span>
                            )}
                          </span>
                        ) : (
                          <span>Logged by: <strong className="text-slate-700">{act.performedByName || 'Sales Rep'}</strong></span>
                        )}
                      </div>
                      {act.durationMinutes > 0 && (
                        <span>Duration: <strong className="text-slate-700">{act.durationMinutes} min{act.durationMinutes > 1 ? 's' : ''}</strong></span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
