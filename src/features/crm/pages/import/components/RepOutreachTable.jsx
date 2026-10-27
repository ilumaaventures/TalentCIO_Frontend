import React from 'react';
import {
  Clock,
  Mail,
  Calendar,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  MessageSquare,
  CalendarCheck,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export const RepOutreachTable = ({
  activities,
  isLoading,
  repName,
  dateRange,
  setDateRange,
  setChannelType,
  setOutcomeFilter,
  setSearchQuery,
  expandedNotes,
  toggleExpandNote,
  formatDateDisplay,
  pagination,
  setCurrentPage,
  onOpenProspectDetails,
  onClose,
}) => {
  const getChannelBadge = (type, callType, duration) => {
    switch (type) {
      case 'call':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
            <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
            <span>{callType || 'Call'}</span>
            {duration > 0 && <span className="text-[10px] text-indigo-500 font-normal">({duration}m)</span>}
          </span>
        );
      case 'whatsapp':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </span>
        );
      case 'email':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            <span>Email</span>
          </span>
        );
      case 'task':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Follow-up</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="capitalize">{type}</span>
          </span>
        );
    }
  };

  const getOutcomeBadge = (outcome) => {
    if (!outcome) return null;
    let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    let icon = null;

    if (['Connected - Interested', 'Scheduled Meeting'].includes(outcome)) {
      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
    } else if (['Callback Requested', 'Sent', 'Completed'].includes(outcome)) {
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      icon = <Clock className="w-3 h-3 text-amber-600 inline mr-1" />;
    } else if (['Connected - Not Interested', 'Wrong Number'].includes(outcome)) {
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-medium';
    } else if (['No Answer', 'Busy', 'Left Voicemail'].includes(outcome)) {
      badgeClass = 'bg-slate-100 text-slate-600 border-slate-300';
    } else if (['Connected'].includes(outcome)) {
      badgeClass = 'bg-blue-100 text-blue-800 border-blue-300 font-semibold';
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${badgeClass}`}>
        {icon}
        {outcome}
      </span>
    );
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 select-none">
            <tr>
              <th className="p-3 w-36">Time & Date</th>
              <th className="p-3 w-44">Company</th>
              <th className="p-3 w-44">Performed By</th>
              <th className="p-3 text-center w-28">Channel</th>
              <th className="p-3 text-center w-36">Outcome</th>
              <th className="p-3">Conversation Notes & Remarks</th>
              <th className="p-3 text-center w-28">Next Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400">
                  <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
                  Loading {repName}&apos;s activity telemetry...
                </td>
              </tr>
            ) : activities.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Outreach Interactions Found</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    No activity records matched the selected period ({dateRange}) and filter criteria for {repName}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDateRange('all');
                      setChannelType('all');
                      setOutcomeFilter('all');
                      setSearchQuery('');
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </td>
              </tr>
            ) : (
              activities.map((act) => {
                const prospect = act.importDataId || {};
                const lead = act.leadId || {};
                const companyName = prospect.companyName || lead.companyName || '—';
                const isConverted = prospect.isConvertedToLead || lead.isConverted;

                const performedUser = act.performedBy || {};
                const userName =
                  performedUser.name ||
                  (performedUser.firstName ? `${performedUser.firstName} ${performedUser.lastName || ''}`.trim() : '') ||
                  act.performedByName ||
                  'Representative';
                const userEmail = performedUser.email || '';
                const userInitial = (userName.charAt(0) || 'U').toUpperCase();

                const isNoteExpanded = !!expandedNotes[act._id];
                const noteText = act.description || act.subject || 'No details recorded.';
                const hasLongNote = noteText.length > 100;

                return (
                  <tr key={act._id} className="hover:bg-slate-50/80 transition group">
                    {/* Time & Date */}
                    <td className="p-3 align-top font-medium text-slate-800 whitespace-nowrap">
                      <p className="text-slate-900 font-bold">{formatDateDisplay(act.performedAt)}</p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {new Date(act.performedAt).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </td>

                    {/* Company */}
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs hover:text-indigo-600 transition">
                          {companyName}
                        </span>
                        {isConverted && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Lead
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Performed By User */}
                    <td className="p-3 align-top whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                          {userInitial}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate" title={userName}>
                            {userName}
                          </p>
                          {userEmail && (
                            <span className="text-[10px] text-slate-400 block truncate max-w-[130px]" title={userEmail}>
                              {userEmail}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Channel Badge */}
                    <td className="p-3 align-top text-center">
                      {getChannelBadge(act.type, act.callType, act.durationMinutes)}
                    </td>

                    {/* Outcome */}
                    <td className="p-3 align-top text-center">
                      {getOutcomeBadge(act.outcome)}
                    </td>

                    {/* Discussion Notes / Remarks */}
                    <td className="p-3 align-top text-slate-700">
                      {act.type === 'email' ? (
                        <div className="max-w-md">
                          <div className="flex items-start gap-1.5">
                            <div className="w-5 h-5 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 mt-0.5 border border-sky-200/60">
                              <Mail className="w-3 h-3" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 leading-snug break-words">
                                {act.metadata?.emailSubject ||
                                  (act.subject ? act.subject.replace(/^Email:\s*/i, '') : '') ||
                                  'Sales Outreach Email'}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  const targetRecord = prospect?._id
                                    ? prospect
                                    : lead?._id
                                    ? lead
                                    : { _id: act.importDataId || act.leadId, companyName };
                                  if (onOpenProspectDetails && targetRecord?._id) {
                                    onOpenProspectDetails(targetRecord, {
                                      tab: 'timeline',
                                      emailId: act._id,
                                      activity: act,
                                    });
                                    onClose();
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline mt-1 cursor-pointer"
                              >
                                <span>Read more</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Show Next Follow-up Pill if linked */}
                          {prospect.nextFollowUpAt && (
                            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold">
                              <Calendar className="w-3 h-3 text-amber-600" />
                              <span>
                                Next:{' '}
                                {new Date(prospect.nextFollowUpAt).toLocaleString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="max-w-md">
                          {act.subject && act.description && (
                            <p className="text-[11px] font-bold text-slate-800 mb-0.5">{act.subject}</p>
                          )}
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {hasLongNote && !isNoteExpanded ? `${noteText.substring(0, 95)}...` : noteText}
                          </p>
                          {hasLongNote && (
                            <button
                              type="button"
                              onClick={() => toggleExpandNote(act._id)}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-0.5 cursor-pointer block"
                            >
                              {isNoteExpanded ? 'Show less' : 'Read more'}
                            </button>
                          )}

                          {/* Show Next Follow-up Pill if linked */}
                          {prospect.nextFollowUpAt && (
                            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold">
                              <Calendar className="w-3 h-3 text-amber-600" />
                              <span>
                                Next:{' '}
                                {new Date(prospect.nextFollowUpAt).toLocaleString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Direct Action */}
                    <td className="p-3 align-top text-center">
                      <div className="flex flex-col gap-1 items-center">
                        {onOpenProspectDetails && prospect._id && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenProspectDetails(prospect);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                            title="Open full prospect file"
                          >
                            <span>View File</span>
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 select-none">
        <div>
          <span>Showing </span>
          <strong className="font-bold text-slate-900">
            {activities.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
          </strong>
          <span> to </span>
          <strong className="font-bold text-slate-900">
            {Math.min(pagination.page * pagination.limit, pagination.total)}
          </strong>
          <span> of </span>
          <strong className="font-bold text-slate-900">{pagination.total}</strong>
          <span> recorded activities</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={pagination.page <= 1 || isLoading}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            icon={ChevronLeft}
          >
            Previous
          </Button>

          {/* Page Number Chips */}
          <div className="flex items-center gap-1 px-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (pagination.totalPages > 5 && pagination.page > 3) {
                pageNum = pagination.page - 3 + i;
                if (pageNum > pagination.totalPages) pageNum = pagination.totalPages - (4 - i);
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                    pagination.page === pageNum
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={pagination.page >= pagination.totalPages || isLoading}
            onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
            icon={ChevronRight}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
