import React from 'react';
import {
  Phone,
  MessageSquare,
  Mail,
  Clock,
  Plus,
  ArrowUpRight,
  Paperclip,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export const DetailTimelineTab = ({
  activities = [],
  isLoadingTimeline = false,
  highlightedActivityId = null,
  parseEmailActivity,
  handleOpenOutreach,
  setSelectedEmailActivity,
}) => {
  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Interaction & Outreach Timeline</h3>
          <p className="text-xs text-slate-500 mt-0.5">Chronological record of calls, messages, emails and outcomes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" icon={Phone} onClick={() => handleOpenOutreach('call')}>
            Log Call
          </Button>
          <Button size="sm" icon={Plus} onClick={() => handleOpenOutreach('call')}>
            + Log Outreach
          </Button>
        </div>
      </div>

      {isLoadingTimeline ? (
        <div className="py-8 text-center text-xs text-slate-400">Loading interactions...</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2.5">
            <Phone className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-900">No outreach logged yet</p>
          <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
            Call, message on WhatsApp, or email this prospect to start qualifying their requirements.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button size="xs" onClick={() => handleOpenOutreach('call')}>
              📞 Log 1st Call
            </Button>
            <Button size="xs" variant="secondary" onClick={() => handleOpenOutreach('whatsapp')}>
              💬 Send WhatsApp
            </Button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {activities.map((act) => (
            <div key={act._id || act.id} className="py-3.5 flex items-start gap-3">
              <div
                className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                  act.type === 'call'
                    ? 'bg-emerald-50 text-emerald-600'
                    : act.type === 'whatsapp'
                    ? 'bg-teal-50 text-teal-600'
                    : act.type === 'email'
                    ? 'bg-sky-50 text-sky-600'
                    : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                {act.type === 'call' ? (
                  <Phone className="w-4 h-4" />
                ) : act.type === 'whatsapp' ? (
                  <MessageSquare className="w-4 h-4" />
                ) : act.type === 'email' ? (
                  <Mail className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              {act.type === 'email' ? (() => {
                const email = parseEmailActivity ? parseEmailActivity(act) : act;
                const isFocused = highlightedActivityId === (act._id || act.id);
                return (
                  <div className="min-w-0 flex-1 text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900 text-xs">{email.subject}</p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {email.status}
                        </span>
                        {isFocused && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 animate-pulse">
                            Selected Email
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(email.sentAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Recipient & Body Preview Card */}
                    <div className={`p-3 rounded-xl border transition space-y-2 ${isFocused ? 'bg-sky-50/90 border-sky-300 ring-2 ring-sky-400/50 shadow-xs' : 'bg-slate-50/80 border-slate-200'}`}>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-1 border-b border-slate-200/60 pb-1.5">
                        <span>
                          To: <strong className="text-slate-800 font-semibold">{email.to}</strong>
                        </span>
                        <span>
                          From: <strong className="text-slate-700 font-semibold">{email.senderName}</strong>
                          {email.senderEmail && <span className="text-slate-400 ml-0.5">({email.senderEmail})</span>}
                        </span>
                      </div>

                      <p className="text-slate-700 text-xs leading-relaxed line-clamp-3 font-sans">
                        {email.cleanBody}
                      </p>

                      {email.attachments && email.attachments.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-slate-200/60">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100/70 border border-sky-200 text-sky-800 text-[10px] font-bold">
                            <Paperclip className="w-3 h-3 text-sky-600" />
                            {email.attachments.length} Attachment{email.attachments.length > 1 ? 's' : ''}:
                          </span>
                          {email.attachments.map((att, aIdx) => (
                            <button
                              key={aIdx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (att.url) {
                                  window.open(att.url, '_blank', 'noopener,noreferrer');
                                } else {
                                  setSelectedEmailActivity(act);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-slate-700 hover:text-sky-800 text-[10px] font-medium truncate max-w-[150px] transition cursor-pointer shadow-2xs"
                              title={att.filename || att.name}
                            >
                              {att.filename || att.name}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedEmailActivity(act)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-sky-50 text-[11px] font-bold text-sky-700 hover:text-sky-900 border border-slate-200 shadow-2xs transition cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5 text-sky-600" />
                          <span>View Full Email & Details</span>
                          <ArrowUpRight className="w-3 h-3 text-sky-500" />
                        </button>
                        {act.durationMinutes > 0 && (
                          <span className="text-[10px] text-slate-400">Duration: {act.durationMinutes}m</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div className="min-w-0 flex-1 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900">{act.subject || `${act.type?.toUpperCase()} Activity`}</p>
                    {act.outcome && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          act.outcome.includes('Interested')
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : act.outcome.includes('Callback')
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {act.outcome}
                      </span>
                    )}
                    {act.callType && <span className="text-slate-400 font-medium">({act.callType})</span>}
                  </div>

                  {act.description && (
                    <p className="text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">{act.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1.5">
                    <span>{new Date(act.performedAt || act.createdAt).toLocaleString()}</span>
                    <span>•</span>
                    <span>By <strong className="text-slate-600">{act.performedByName || 'Rep'}</strong></span>
                    {act.durationMinutes > 0 && (
                      <>
                        <span>•</span>
                        <span>Duration: {act.durationMinutes}m</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
