import React from 'react';
import { CalendarCheck, TrendingUp, Filter } from 'lucide-react';

export const RepLeaderboardTab = ({
  summary,
  followUps,
  filteredLeaderboard,
  isLoading,
  dateRange,
  customFrom,
  customTo,
  setActiveTab,
  setFollowUpRepFilter,
  onOpenUserHistory,
  onSelectRepFilter,
  onClose,
}) => {
  return (
    <div className="space-y-4">
      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
          <p className="text-slate-500 font-medium">Total Calls</p>
          <p className="text-lg font-bold text-indigo-700 mt-0.5">{summary.totalCalls || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Across all reps</p>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
          <p className="text-slate-500 font-medium">Connection Rate</p>
          <p className="text-lg font-bold text-emerald-700 mt-0.5">{summary.connectionRate || 0}%</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{summary.connectedCalls || 0} calls reached</p>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
          <p className="text-slate-500 font-medium">Positive Outcomes</p>
          <p className="text-lg font-bold text-amber-700 mt-0.5">{summary.positiveOutcomes || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Interested & meetings</p>
        </div>

        <div
          onClick={() => setActiveTab('followups')}
          role="button"
          tabIndex={0}
          className="p-3 rounded-xl bg-orange-50/60 border border-orange-200 hover:border-orange-400 cursor-pointer transition shadow-2xs group"
          title="Click to switch to Follow-up Details tab"
        >
          <div className="flex items-center justify-between">
            <p className="text-slate-600 font-medium group-hover:text-orange-700 transition">Follow-ups</p>
            <CalendarCheck className="w-3.5 h-3.5 text-orange-600 group-hover:scale-110 transition" />
          </div>
          <p className="text-lg font-bold text-orange-700 mt-0.5">{summary.totalFollowUps || followUps.length || 0}</p>
          <p className="text-[10px] text-orange-600/80 mt-0.5 font-semibold">View Follow-ups →</p>
        </div>

        <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100">
          <p className="text-slate-500 font-medium">Leads Converted</p>
          <p className="text-lg font-bold text-purple-700 mt-0.5">{summary.convertedRows || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Active pipeline</p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-2.5 text-center w-12">Rank</th>
              <th className="p-2.5">Sales Representative</th>
              <th className="p-2.5 text-center">Calls</th>
              <th className="p-2.5 text-center">Connected</th>
              <th className="p-2.5 text-center">Interested</th>
              <th className="p-2.5 text-center">WhatsApp / Email</th>
              <th className="p-2.5 text-center">Follow-ups</th>
              <th className="p-2.5 text-center">Converted</th>
              <th className="p-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
                  Calculating rep performance...
                </td>
              </tr>
            ) : filteredLeaderboard.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-400">
                  No outreach activities logged for this period yet.
                </td>
              </tr>
            ) : (
              filteredLeaderboard.map((rep, idx) => {
                const rankBadge =
                  idx === 0
                    ? 'bg-amber-100 text-amber-800 border-amber-300 font-extrabold'
                    : idx === 1
                    ? 'bg-slate-200 text-slate-700 border-slate-300 font-bold'
                    : idx === 2
                    ? 'bg-amber-50 text-amber-900 border-amber-200 font-bold'
                    : 'bg-slate-50 text-slate-500';

                return (
                  <tr key={rep.userId || rep.userName} className="hover:bg-slate-50/80 transition">
                    <td className="p-2.5 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs border ${rankBadge}`}>
                        {idx + 1}
                      </span>
                    </td>

                    <td className="p-2.5 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center uppercase shrink-0">
                          {rep.userName.charAt(0) || 'U'}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenUserHistory) onOpenUserHistory(rep, { dateRange, customFrom, customTo });
                              onClose();
                            }}
                            className="font-bold text-slate-900 leading-tight hover:text-indigo-600 underline cursor-pointer text-left"
                            title="Click to view outreach history"
                          >
                            {rep.userName}
                          </button>
                          {rep.email && <p className="text-[10px] text-slate-400 leading-tight">{rep.email}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="p-2.5 text-center font-bold text-slate-900">
                      {rep.totalCalls}
                    </td>

                    <td className="p-2.5 text-center">
                      <span className="font-semibold text-emerald-700">
                        {rep.connectedCalls} ({rep.connectionRate}%)
                      </span>
                    </td>

                    <td className="p-2.5 text-center">
                      <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {rep.positiveOutcomes}
                      </span>
                    </td>

                    <td className="p-2.5 text-center text-slate-600">
                      {rep.totalWhatsApps + rep.totalEmails}
                    </td>

                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setFollowUpRepFilter(rep.userName);
                          setActiveTab('followups');
                        }}
                        className="font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-200 transition cursor-pointer"
                        title="Click to view follow-ups assigned to this rep"
                      >
                        {rep.totalFollowUps || 0}
                      </button>
                    </td>

                    <td className="p-2.5 text-center">
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                        {rep.convertedCount}
                      </span>
                    </td>

                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {onOpenUserHistory && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenUserHistory(rep, { dateRange, customFrom, customTo });
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-md transition cursor-pointer"
                            title="View full outreach and activity history"
                          >
                            <TrendingUp className="w-3 h-3" />
                            <span>History</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectRepFilter) onSelectRepFilter(rep.userName);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition cursor-pointer"
                          title="Filter Database by this Representative"
                        >
                          <Filter className="w-3 h-3" />
                          <span>Table</span>
                        </button>
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
