import React from 'react';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  MessageSquare,
  PhoneCall,
  Check,
} from 'lucide-react';

export const RepFollowupsTab = ({
  filteredFollowUps,
  followUpStatusFilter,
  setFollowUpStatusFilter,
  followUpRepFilter,
  setFollowUpRepFilter,
  leaderboard,
  isLoading,
  formatDateTime,
  handleCompleteFollowUp,
  completingId,
}) => {
  return (
    <div className="space-y-3">
      {/* Filter Pills & Rep Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-slate-600">Status:</span>
          {[
            { id: 'all', label: 'All Follow-ups' },
            { id: 'scheduled', label: 'Upcoming / Scheduled' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'completed', label: 'Completed' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setFollowUpStatusFilter(st.id)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                followUpStatusFilter === st.id
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600">Rep:</span>
          <select
            value={followUpRepFilter}
            onChange={(e) => setFollowUpRepFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-amber-500 font-medium text-slate-700 cursor-pointer"
          >
            <option value="all">All Sales Reps</option>
            {leaderboard.map((r) => (
              <option key={r.userId || r.userName} value={r.userName}>
                {r.userName}
              </option>
            ))}
          </select>
          {followUpRepFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setFollowUpRepFilter('all')}
              className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Follow-ups Table */}
      <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-xs max-h-[55vh] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10 select-none">
            <tr>
              <th className="p-2.5">Status & Priority</th>
              <th className="p-2.5">Prospect / Company</th>
              <th className="p-2.5">Contact & Phone</th>
              <th className="p-2.5">Scheduled Date & Time</th>
              <th className="p-2.5">Type</th>
              <th className="p-2.5">Assigned Rep</th>
              <th className="p-2.5">Notes</th>
              <th className="p-2.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="animate-spin w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full mx-auto mb-2" />
                  Loading scheduled follow-ups...
                </td>
              </tr>
            ) : filteredFollowUps.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-400">
                  <CalendarCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600">No follow-ups found for this criteria</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Try changing the date period or clearing filters.</p>
                </td>
              </tr>
            ) : (
              filteredFollowUps.map((flw) => {
                const prospect = flw.importDataId || flw.leadId || {};
                const compName = prospect.companyName || flw.title || 'Prospect';
                const contact = prospect.contactPerson || prospect.firstName || 'Contact';
                const phone = prospect.mobileNo || prospect.phone || '';
                const cleanPhone = phone.replace(/\D/g, '').slice(-10);
                const repName =
                  flw.assignedTo?.name ||
                  `${flw.assignedTo?.firstName || ''} ${flw.assignedTo?.lastName || ''}`.trim() ||
                  flw.assignedTo?.email ||
                  'Assigned Rep';

                const dateInfo = formatDateTime(flw.scheduledDate);
                const isCompleted = flw.status === 'completed';
                const isOverdue = !isCompleted && dateInfo.isPast;

                let statusBadge = (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="w-2.5 h-2.5 text-amber-600" />
                    Scheduled
                  </span>
                );
                if (isCompleted) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      Completed
                    </span>
                  );
                } else if (isOverdue) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                      Overdue
                    </span>
                  );
                }

                const priorityColor =
                  flw.priority === 'Urgent'
                    ? 'bg-red-50 text-red-700 border-red-200 font-bold'
                    : flw.priority === 'High'
                    ? 'bg-orange-50 text-orange-700 border-orange-200 font-semibold'
                    : flw.priority === 'Low'
                    ? 'bg-slate-50 text-slate-600 border-slate-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200';

                return (
                  <tr key={flw._id} className="hover:bg-slate-50/80 transition">
                    <td className="p-2.5">
                      <div className="flex flex-col gap-1 items-start">
                        {statusBadge}
                        {flw.priority && (
                          <span className={`px-1.5 py-0.2 rounded text-[9px] border ${priorityColor}`}>
                            {flw.priority} Priority
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-2.5 font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900">{compName}</span>
                          {prospect.industry && (
                            <p className="text-[10px] text-slate-400 font-normal">{prospect.industry}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-2.5 text-slate-700">
                      <p className="font-medium text-slate-900">{contact}</p>
                      {phone ? (
                        <p className="text-[10px] text-indigo-600 font-mono">{phone}</p>
                      ) : (
                        <p className="text-[10px] text-slate-400">No phone</p>
                      )}
                    </td>

                    <td className="p-2.5">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span
                          className={`font-semibold ${
                            isOverdue
                              ? 'text-rose-600 font-bold'
                              : dateInfo.isToday
                              ? 'text-amber-700 font-bold'
                              : 'text-slate-700'
                          }`}
                        >
                          {dateInfo.text}
                        </span>
                      </div>
                    </td>

                    <td className="p-2.5">
                      <span className="capitalize font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {flw.type || 'Call'}
                      </span>
                    </td>

                    <td className="p-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center uppercase shrink-0">
                          {repName.charAt(0)}
                        </div>
                        <span className="text-slate-800 font-medium">{repName}</span>
                      </div>
                    </td>

                    <td className="p-2.5 max-w-[200px]">
                      <p className="text-[11px] text-slate-600 truncate" title={flw.notes || flw.title}>
                        {flw.notes || flw.title || '—'}
                      </p>
                    </td>

                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {cleanPhone && (
                          <button
                            type="button"
                            onClick={() => {
                              window.open(`https://wa.me/91${cleanPhone}`, '_blank');
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {cleanPhone && (
                          <button
                            type="button"
                            onClick={() => {
                              window.location.href = `tel:${cleanPhone}`;
                            }}
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer"
                            title="Dial Phone"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={() => handleCompleteFollowUp(flw._id)}
                            disabled={completingId === flw._id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition cursor-pointer disabled:opacity-50"
                            title="Mark follow-up as completed"
                          >
                            <Check className="w-3 h-3" />
                            <span>{completingId === flw._id ? 'Saving...' : 'Done'}</span>
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
    </div>
  );
};
