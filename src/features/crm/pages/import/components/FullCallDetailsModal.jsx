import React from 'react';
import { Phone, CheckCircle2, User, Edit3 } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

export const FullCallDetailsModal = ({
  isOpen,
  onClose,
  activity,
  companyName = 'Prospect',
  onEditCall,
  onCallAgain,
  record = {},
}) => {
  if (!isOpen || !activity) return null;

  const participants =
    activity.contactPersons && activity.contactPersons.length > 0
      ? activity.contactPersons
      : activity.metadata?.contactPersons || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Phone Call Details"
      subtitle={`Company: ${companyName} • Call Interaction Record`}
      maxWidth="max-w-xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
            {onEditCall && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose();
                  onEditCall(activity);
                }}
                icon={Edit3}
                className="text-indigo-700 border-indigo-200 hover:bg-indigo-50"
              >
                Edit Call
              </Button>
            )}
          </div>
          {onCallAgain && (
            <Button
              size="sm"
              onClick={() => {
                onClose();
                onCallAgain();
              }}
              icon={Phone}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Call Again
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Header Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 border border-emerald-100/90 shadow-2xs space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Phone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 leading-snug break-words">
                  {activity.subject || 'Phone Call Outreach'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {new Date(activity.performedAt || activity.createdAt).toLocaleString('en-IN', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              {activity.outcome || 'Completed'}
            </span>
          </div>

          {/* Call Metadata Grid */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-emerald-100/80 text-xs">
            {participants.length > 1 ? (
              <div className="col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Contact Persons Logged ({participants.length})</span>
                  </span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                    Multi-Person Joint Call
                  </span>
                </div>

                <div className="space-y-2.5">
                  {participants.map((p, pIdx) => (
                    <div
                      key={pIdx}
                      className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/90 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                            {pIdx + 1}
                          </span>
                          <span className="font-bold text-slate-900">{p.name || 'Contact'}</span>
                          {p.designation && (
                            <span className="text-slate-500 font-medium text-[11px]">
                              • {p.designation}
                            </span>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          {p.outcome || activity.outcome || 'Connected'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-200/60">
                        <div>
                          <span className="text-slate-400 block text-[9.5px] uppercase font-semibold">
                            Call Type
                          </span>
                          <span className="font-semibold text-slate-800">
                            {p.callType || activity.callType || 'Cold Call'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9.5px] uppercase font-semibold">
                            Duration
                          </span>
                          <span className="font-semibold text-slate-800">
                            {p.durationMinutes ? `${p.durationMinutes} mins` : '—'}
                          </span>
                        </div>
                        {p.phone && (
                          <div className="flex items-center gap-1">
                            <div>
                              <span className="text-slate-400 block text-[9.5px] uppercase font-semibold">
                                Phone
                              </span>
                              <span className="font-mono font-semibold text-indigo-700 text-[10.5px]">
                                {p.phone}
                              </span>
                            </div>
                            <a
                              href={`tel:${p.phone.replace(/[^0-9+]/g, '')}`}
                              className="p-1 ml-auto rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                              title="Call"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>

                      {p.notes && (
                        <div className="mt-1.5 p-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] leading-relaxed">
                          <span className="font-semibold text-slate-900 block text-[10px] uppercase text-indigo-900 mb-0.5">
                            Discussion Notes:
                          </span>
                          <p className="whitespace-pre-wrap">{p.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                      Total Duration
                    </span>
                    <p className="font-bold text-slate-800 text-xs mt-0.5">
                      {activity.durationMinutes ? `${activity.durationMinutes} minutes` : '0 min'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                      Representative
                    </span>
                    <p className="font-bold text-slate-800 text-xs mt-0.5">
                      {activity.performedByName ||
                        (activity.performedBy
                          ? `${activity.performedBy.firstName || ''} ${activity.performedBy.lastName || ''}`.trim()
                          : '') ||
                        'Representative'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Contact Person Reached
                  </span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">
                    {activity.contactPerson ||
                      activity.metadata?.contactPerson ||
                      record.contactPerson ||
                      'Decision Maker'}
                    {(activity.contactDesignation || activity.metadata?.contactDesignation) && (
                      <span className="text-slate-500 font-normal ml-1">
                        ({activity.contactDesignation || activity.metadata?.contactDesignation})
                      </span>
                    )}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Target Phone
                  </span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">
                    {activity.contactPhone ||
                      activity.metadata?.contactPhone ||
                      record.mobileNo ||
                      record.phone ||
                      '—'}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Call Type
                  </span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">
                    {activity.callType || 'Cold Call'}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Duration
                  </span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">
                    {activity.durationMinutes
                      ? `${activity.durationMinutes} minutes`
                      : '0 min (Logged)'}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 col-span-2">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Representative
                  </span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">
                    {activity.performedByName ||
                      (activity.performedBy
                        ? `${activity.performedBy.firstName || ''} ${activity.performedBy.lastName || ''}`.trim()
                        : '') ||
                      'Representative'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Conversation Feedback / Remarks */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Call Remarks & Client Feedback
          </span>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 leading-relaxed shadow-2xs">
            <p className="whitespace-pre-wrap leading-relaxed">
              {activity.description || 'No detailed feedback provided for this call.'}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
