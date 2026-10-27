import React from 'react';
import {
  Building2,
  ExternalLink,
  Globe,
  FileText,
  PhoneCall,
  Phone,
  MessageSquare,
  Clock,
  Mail,
  Activity,
  Edit3,
  User,
  Users,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Paperclip,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';

export const DetailOverviewTab = ({
  record = {},
  cleanPhone = '',
  activities = [],
  displayedActivities = [],
  isLoadingTimeline = false,
  upcomingFollowUp = null,
  channelFilter = 'all',
  handleChannelFilterChange,
  callsCount = 0,
  whatsAppCount = 0,
  emailsCount = 0,
  totalTouches = 0,
  paginationInfo = {},
  currentPage = 1,
  pageSize = 20,
  handlePageChange,
  handlePageSizeChange,
  handleOpenOutreach,
  handleOpenEditActivity,
  handleOpenEditContacts,
  handleOpenStatusModal,
  setSelectedEmailActivity,
  setSelectedCallActivity,
  parseEmailActivity,
  getStatusBadgeStyle = () => '',
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        {/* Company Profile Information Card */}
        <Card padding="md" className="space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Company Information</h3>
            </div>
            {record.googleSearchUrl && (
              <a
                href={record.googleSearchUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <span>Google Maps / Search</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider mb-0.5">Company Name</span>
              <p className="font-bold text-slate-800 text-xs leading-snug">{record.companyName || '—'}</p>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider mb-0.5">GSTIN</span>
              <p className="font-semibold text-slate-800 font-mono text-xs">{record.gstin || '—'}</p>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider mb-0.5">Date of Registration</span>
              <p className="font-semibold text-slate-800 text-xs">{record.dateOfRegistration || '—'}</p>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider mb-0.5">Industry / Domain</span>
              <p className="font-semibold text-slate-800 text-xs">{record.industry || '—'}</p>
            </div>
            <div className="md:col-span-2">
              <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider mb-0.5">Full Address</span>
              <p className="text-slate-700 leading-relaxed text-xs">{record.address || '—'}</p>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider mb-0.5">City / Region</span>
              <p className="text-slate-700 font-medium text-xs">{record.city || '—'}</p>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider mb-0.5">State / Pincode</span>
              <p className="text-slate-700 font-medium text-xs">
                {record.state || '—'} {record.pincode ? `(${record.pincode})` : ''}
              </p>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider mb-0.5">Website</span>
              {record.website ? (
                <a
                  href={record.website.startsWith('http') ? record.website : `https://${record.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline font-semibold flex items-center gap-1 text-xs"
                >
                  <Globe className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{record.website}</span>
                </a>
              ) : (
                <span className="text-slate-400 text-xs">—</span>
              )}
            </div>
            <div>
              <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider mb-0.5">Rating & Reviews</span>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-amber-700">★ {record.rating || '0.0'}</span>
                <span className="text-slate-400 text-[11px]">({record.reviewsCount || 0} reviews)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Remarks & Notes Card */}
        <Card padding="md" className="space-y-2.5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Import Remarks & Notes</h3>
          </div>
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
            {record.remarks || 'No remarks provided during data import.'}
          </div>
        </Card>

        {/* Outreach Activity & Client Feedback Remarks Card */}
        <Card padding="md" className="space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Outreach History & Client Feedback
                </h3>
                <p className="text-[10.5px] text-slate-500">
                  Calls, WhatsApps, follow-up feedback and remarks logged for this company
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenOutreach('call')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition cursor-pointer"
                title="Log Call"
              >
                <Phone className="w-3 h-3" />
                <span>Log Call</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenOutreach('whatsapp')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold border border-teal-200 transition cursor-pointer"
                title="Log WhatsApp"
              >
                <MessageSquare className="w-3 h-3" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenOutreach('followup')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition cursor-pointer"
                title="Schedule Follow-up"
              >
                <Clock className="w-3 h-3" />
                <span>Follow-up</span>
              </button>
            </div>
          </div>

          {/* Scheduled Follow-up Banner if present */}
          {upcomingFollowUp && (
            <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <div className="w-6 h-6 rounded-lg bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <strong className="font-bold text-amber-950">
                    Upcoming Follow-up Scheduled
                  </strong>
                  <span className="font-mono font-bold bg-amber-200/70 px-2 py-0.5 rounded-full text-[10px]">
                    {new Date(upcomingFollowUp.scheduledDate).toLocaleString('en-IN', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {upcomingFollowUp.notes && (
                  <p className="mt-1 text-amber-800 font-medium">
                    {upcomingFollowUp.notes}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Outreach Channel Metric Pills (Clickable Filters) */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleChannelFilterChange(channelFilter === 'call' ? 'all' : 'call')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                channelFilter === 'call'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-300'
                  : 'bg-emerald-50 hover:bg-emerald-100/90 border-emerald-200/90 text-emerald-800 hover:shadow-2xs'
              }`}
              title="Click to view all calls made"
            >
              <PhoneCall className={`w-3.5 h-3.5 ${channelFilter === 'call' ? 'text-white' : 'text-emerald-600'}`} />
              <span>{callsCount} Calls Made</span>
              {channelFilter === 'call' && (
                <span className="ml-1 text-[10px] bg-emerald-700 text-white px-1.5 py-0.2 rounded-full font-semibold">Active</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleChannelFilterChange(channelFilter === 'whatsapp' ? 'all' : 'whatsapp')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                channelFilter === 'whatsapp'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm ring-2 ring-teal-300'
                  : 'bg-teal-50 hover:bg-teal-100/90 border-teal-200/90 text-teal-800 hover:shadow-2xs'
              }`}
              title="Click to view all WhatsApp sent"
            >
              <MessageSquare className={`w-3.5 h-3.5 ${channelFilter === 'whatsapp' ? 'text-white' : 'text-teal-600'}`} />
              <span>{whatsAppCount} WhatsApp Sent</span>
              {channelFilter === 'whatsapp' && (
                <span className="ml-1 text-[10px] bg-teal-700 text-white px-1.5 py-0.2 rounded-full font-semibold">Active</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleChannelFilterChange(channelFilter === 'email' ? 'all' : 'email')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                channelFilter === 'email'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm ring-2 ring-sky-300'
                  : 'bg-sky-50 hover:bg-sky-100/90 border-sky-200/90 text-sky-800 hover:shadow-2xs'
              }`}
              title="Click to view all emails sent"
            >
              <Mail className={`w-3.5 h-3.5 ${channelFilter === 'email' ? 'text-white' : 'text-sky-600'}`} />
              <span>{emailsCount} Emails Sent</span>
              {channelFilter === 'email' && (
                <span className="ml-1 text-[10px] bg-sky-700 text-white px-1.5 py-0.2 rounded-full font-semibold">Active</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleChannelFilterChange('all')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                channelFilter === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-300'
                  : 'bg-indigo-50 hover:bg-indigo-100/90 border-indigo-200/90 text-indigo-800 hover:shadow-2xs'
              }`}
              title="Click to show all outreach touches"
            >
              <Activity className={`w-3.5 h-3.5 ${channelFilter === 'all' ? 'text-white' : 'text-indigo-600'}`} />
              <span>{totalTouches} Total Touches</span>
              {channelFilter === 'all' && (
                <span className="ml-1 text-[10px] bg-indigo-700 text-white px-1.5 py-0.2 rounded-full font-semibold">All</span>
              )}
            </button>
          </div>

          {/* Feed of Feedback & Remarks */}
          {isLoadingTimeline ? (
            <div className="py-6 text-center text-xs text-slate-400">
              <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
              Loading feedback & remarks...
            </div>
          ) : activities.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">
                No outreach feedback recorded yet
              </h4>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Log your first call, message on WhatsApp, or email to record client remarks, interest level, and next steps for {record.companyName || 'this company'}.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenOutreach('call')}
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                >
                  Log 1st Call & Feedback
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenOutreach('whatsapp')}
                  className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                >
                  WhatsApp
                </button>
              </div>
            </div>
          ) : displayedActivities.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto ${
                channelFilter === 'call' ? 'bg-emerald-50 text-emerald-600' :
                channelFilter === 'whatsapp' ? 'bg-teal-50 text-teal-600' :
                channelFilter === 'email' ? 'bg-sky-50 text-sky-600' :
                'bg-indigo-50 text-indigo-600'
              }`}>
                {channelFilter === 'call' && <PhoneCall className="w-5 h-5" />}
                {channelFilter === 'whatsapp' && <MessageSquare className="w-5 h-5" />}
                {channelFilter === 'email' && <Mail className="w-5 h-5" />}
              </div>
              <h4 className="text-xs font-bold text-slate-800">
                {channelFilter === 'call' && 'No call timeline entries recorded'}
                {channelFilter === 'whatsapp' && 'No WhatsApp timeline entries recorded'}
                {channelFilter === 'email' && 'No email timeline entries recorded'}
              </h4>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                {channelFilter === 'call' && (callsCount > 0
                  ? `Outreach counter recorded ${callsCount} call(s), but no call activity feedback was logged in this timeline.`
                  : `No calls have been logged for ${record.companyName || 'this company'} yet.`)}
                {channelFilter === 'whatsapp' && `No WhatsApp messages have been logged for ${record.companyName || 'this company'} yet.`}
                {channelFilter === 'email' && `No emails have been logged for ${record.companyName || 'this company'} yet.`}
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                {channelFilter === 'call' && (
                  <button
                    type="button"
                    onClick={() => handleOpenOutreach('call')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                  >
                    📞 Log Call & Feedback Now
                  </button>
                )}
                {channelFilter === 'whatsapp' && (
                  <button
                    type="button"
                    onClick={() => handleOpenOutreach('whatsapp')}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                  >
                    💬 Send WhatsApp
                  </button>
                )}
                {channelFilter === 'email' && (
                  <button
                    type="button"
                    onClick={() => handleOpenOutreach('email')}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                  >
                    ✉ Send Sales Email
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleChannelFilterChange('all')}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Show All Touches ({totalTouches})
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {displayedActivities.map((act) => {
                const outcomeText = act.outcome || 'Completed';
                const isPositive = ['Connected - Interested', 'Scheduled Meeting'].includes(outcomeText);
                const isCallback = ['Callback Requested'].includes(outcomeText);
                const isNegative = ['Connected - Not Interested', 'Wrong Number'].includes(outcomeText);

                const badgeColor = isPositive
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : isCallback
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : isNegative
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300';

                const channelLabel = act.type === 'email' ? 'Email' : act.type === 'whatsapp' ? 'WhatsApp' : act.type === 'task' ? 'Follow-up' : (act.callType || 'Call');

                return (
                  <div
                    key={act._id || act.id}
                    className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-200 hover:shadow-2xs transition space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          act.type === 'call' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          act.type === 'whatsapp' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                          act.type === 'email' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                          'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {act.type === 'call' && <Phone className="w-3 h-3" />}
                          {act.type === 'whatsapp' && <MessageSquare className="w-3 h-3" />}
                          {act.type === 'email' && <Mail className="w-3 h-3" />}
                          {act.type === 'task' && <Clock className="w-3 h-3" />}
                          <span className="capitalize">{channelLabel}</span>
                          {act.durationMinutes > 0 && <span className="font-normal opacity-75">({act.durationMinutes}m)</span>}
                        </span>

                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                          {outcomeText}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(act.performedAt || act.createdAt).toLocaleString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {act.type === 'call' && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditActivity(act)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Edit call details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Remark / Feedback Box */}
                    {act.type === 'email' ? (() => {
                      const email = parseEmailActivity ? parseEmailActivity(act) : act;
                      return (
                        <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200/80 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-slate-900 text-xs truncate">
                              {email.subject}
                            </p>
                            <span className="text-[10px] text-slate-500 font-medium shrink-0">To: {email.to}</span>
                          </div>
                          <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">
                            {email.cleanBody}
                          </p>
                          {email.attachments && email.attachments.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-sky-200 text-sky-800 text-[10px] font-semibold shadow-2xs">
                                <Paperclip className="w-3 h-3 text-sky-600" />
                                {email.attachments.length} Attachment{email.attachments.length > 1 ? 's' : ''}
                              </span>
                              {email.attachments.slice(0, 3).map((att, attIdx) => (
                                <span key={attIdx} className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                                  {att.filename || att.name}
                                  {attIdx < Math.min(email.attachments.length, 3) - 1 ? ',' : ''}
                                </span>
                              ))}
                              {email.attachments.length > 3 && (
                                <span className="text-[10px] text-slate-400">+{email.attachments.length - 3} more</span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1 border-t border-sky-100">
                            <button
                              type="button"
                              onClick={() => setSelectedEmailActivity(act)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
                            >
                              <Mail className="w-3 h-3" />
                              <span>View Full Email Details</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                            <span className="text-[10px] text-slate-500">
                              From: <strong className="text-slate-700 font-semibold">{email.senderName}</strong>
                              {email.senderEmail && <span className="text-slate-400 ml-0.5">({email.senderEmail})</span>}
                            </span>
                          </div>
                        </div>
                      );
                    })() : act.type === 'call' ? (
                      <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 text-xs">
                              {act.subject || 'Phone Call Outreach'}
                            </p>
                            <span className="text-[10px] text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md font-semibold">
                              {act.callType || 'Cold Call'}
                            </span>
                            {act.durationMinutes > 0 && (
                              <span className="text-[10px] text-slate-500 font-medium">({act.durationMinutes}m)</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Target:{' '}
                            <strong className="text-slate-700">
                              {act.contactPersons && act.contactPersons.length > 1
                                ? act.contactPersons.map((p) => `${p.name}${p.phone ? ` (${p.phone})` : ''}`).join(' & ')
                                : act.contactPerson || act.metadata?.contactPerson
                                ? `${act.contactPerson || act.metadata?.contactPerson} (${act.contactPhone || act.metadata?.contactPhone || record.mobileNo || record.phone || '—'})`
                                : (record.mobileNo || record.phone || 'Contact Phone')}
                            </strong>
                          </span>
                        </div>
                        <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
                          {act.description || 'No detailed feedback notes recorded.'}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-emerald-100">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setSelectedCallActivity(act)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                            >
                              <Phone className="w-3 h-3" />
                              <span>View Call Details</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditActivity(act)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                              title="Edit call details and notes"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Call</span>
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Logged by: <strong className="text-slate-600 font-semibold">{act.performedByName || 'Representative'}</strong>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                        <p className="font-semibold text-slate-800 text-[11px] mb-0.5">
                          {act.subject || 'Outreach Discussion Notes'}
                        </p>
                        <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
                          {act.description || 'No detailed feedback provided.'}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>
                        Logged by: <strong className="text-slate-700">{act.performedByName || 'Representative'}</strong>
                      </span>
                      {record.nextFollowUpAt && act.type === 'task' && (
                        <span className="text-amber-700 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Scheduled Follow-up
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Backend Pagination Controls */}
              {paginationInfo.total > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-2 border-t border-slate-100 text-xs">
                  {/* Left: Entries counter */}
                  <div className="flex items-center gap-2 text-slate-500">
                    <span>
                      Showing <strong className="text-slate-800">{Math.min((currentPage - 1) * pageSize + 1, paginationInfo.total)}</strong> to{' '}
                      <strong className="text-slate-800">{Math.min(currentPage * pageSize, paginationInfo.total)}</strong> of{' '}
                      <strong className="text-slate-800">{paginationInfo.total}</strong> entries
                    </span>
                    {isLoadingTimeline && (
                      <span className="inline-block w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin ml-1" />
                    )}
                  </div>

                  {/* Right: Switcher (20, 50, 100) & Page Buttons */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200/80">
                      <span className="text-[11px] text-slate-500 font-medium px-1">Per page:</span>
                      {[20, 50, 100].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => handlePageSizeChange(sz)}
                          disabled={isLoadingTimeline}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                            pageSize === sz
                              ? 'bg-white text-indigo-700 shadow-2xs border border-indigo-200'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1 || isLoadingTimeline}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: paginationInfo.totalPages || 1 }, (_, i) => i + 1)
                          .filter((p) => {
                            const totalP = paginationInfo.totalPages || 1;
                            if (p === 1 || p === totalP) return true;
                            return Math.abs(p - currentPage) <= 1;
                          })
                          .map((p, idx, arr) => {
                            const prev = arr[idx - 1];
                            const showEllipsisBefore = prev && p - prev > 1;

                            return (
                              <React.Fragment key={p}>
                                {showEllipsisBefore && (
                                  <span className="text-slate-400 px-1 text-xs">…</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handlePageChange(p)}
                                  disabled={isLoadingTimeline}
                                  className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    currentPage === p
                                      ? 'bg-indigo-600 text-white shadow-2xs'
                                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  {p}
                                </button>
                              </React.Fragment>
                            );
                          })}
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= (paginationInfo.totalPages || 1) || isLoadingTimeline}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                        title="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-5">
        {/* Primary Contact Person Card */}
        <Card padding="md" className="space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Key Contact Details {record?.contacts && record.contacts.length > 1 ? `(${record.contacts.length})` : ''}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {record?.contacts && record.contacts.length > 1 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 flex items-center gap-1">
                  <Users className="w-3 h-3 text-violet-600" />
                  <span>Multiple Contacts</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleOpenEditContacts}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-0.5 rounded-md border border-indigo-200 transition cursor-pointer shadow-2xs"
                title="Edit all contact persons"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit Contacts</span>
              </button>
            </div>
          </div>

          {record?.contacts && record.contacts.length > 0 ? (
            <div className="space-y-3.5 divide-y divide-slate-100">
              {record.contacts.map((c, cIdx) => (
                <div key={cIdx} className={`space-y-2 text-xs ${cIdx > 0 ? 'pt-3' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Contact Person</span>
                      <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5 mt-0.5">
                        <span>{c.contactPerson || 'Not specified'}</span>
                        {c.isPrimary && (
                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Primary
                          </span>
                        )}
                      </p>
                    </div>
                    {c.designation && (
                      <div className="text-right">
                        <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Designation / Role</span>
                        <p className="font-semibold text-slate-700 text-xs mt-0.5">{c.designation}</p>
                      </div>
                    )}
                  </div>

                  {c.mobileNo && (
                    <div>
                      <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Mobile Number</span>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="font-mono font-bold text-slate-800 text-xs">{c.mobileNo}</span>
                        <div className="flex items-center gap-1">
                          <a
                            href={`tel:${c.mobileNo.replace(/[^0-9+]/g, '')}`}
                            className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                            title="Call"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                          <a
                            href={`https://wa.me/${c.mobileNo.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 transition"
                            title="WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {c.emailId && (
                    <div>
                      <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Email Address</span>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-slate-700 font-medium truncate max-w-[200px] text-xs uppercase text-[11px]">{c.emailId}</span>
                        <a
                          href={`mailto:${c.emailId}`}
                          className="p-1 rounded-md bg-sky-50 text-sky-700 hover:bg-sky-100 transition"
                          title="Email"
                        >
                          <Mail className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Contact Person</span>
                <p className="font-bold text-slate-900 text-xs mt-0.5">{record?.contactPerson || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Designation / Role</span>
                <p className="font-semibold text-slate-700 text-xs mt-0.5">{record?.designation || 'Decision Maker'}</p>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Mobile Number</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-mono font-bold text-slate-800 text-xs">{record?.mobileNo || record?.phone || '—'}</span>
                  {cleanPhone && (
                    <div className="flex items-center gap-1">
                      <a
                        href={`tel:${cleanPhone}`}
                        className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                        title="Call"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                      <a
                        href={`https://wa.me/91${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 transition"
                        title="WhatsApp"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Email Address</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-slate-700 font-medium truncate max-w-[200px] text-[11px] uppercase">{record?.emailId || record?.email || '—'}</span>
                  {(record?.emailId || record?.email) && (
                    <a
                      href={`mailto:${record.emailId || record.email}`}
                      className="p-1 rounded-md bg-sky-50 text-sky-700 hover:bg-sky-100 transition"
                      title="Email"
                    >
                      <Mail className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Status History & Lifecycle Card */}
        <Card padding="lg" className="space-y-4 border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Status History</h3>
                <p className="text-[11px] text-slate-500">Lifecycle audit trail & interest stage changes</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleOpenStatusModal(record?.status || record?.leadStatus || 'New')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/70 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>Change Status</span>
            </button>
          </div>

          {/* Current Status Banner */}
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Current Status
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeStyle(record?.status || record?.leadStatus || 'New')}`}>
                {record?.status || record?.leadStatus || 'New'}
              </span>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              <span className="block font-medium">
                {Array.isArray(record?.statusHistory) && record.statusHistory.length > 0
                  ? `${record.statusHistory.length} status change(s)`
                  : 'Initial Status'}
              </span>
              <span className="text-[10px] text-slate-400">
                {record?.updatedAt ? new Date(record.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Imported'}
              </span>
            </div>
          </div>

          {/* Timeline of Status Changes */}
          <div className="space-y-3 pt-1">
            {(() => {
              const historyList = Array.isArray(record?.statusHistory) && record.statusHistory.length > 0
                ? [...record.statusHistory].reverse()
                : [];

              if (historyList.length === 0) {
                return (
                  <div className="py-4 text-center">
                    <Clock className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-600">Initial Status: {record?.status || record?.leadStatus || 'New'}</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                      No status changes recorded yet. Click "Change Status" above to update client interest or stage.
                    </p>
                  </div>
                );
              }

              return (
                <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {historyList.map((entry, idx) => {
                    const isLatest = idx === 0;
                    const changedDate = entry.changedAt ? new Date(entry.changedAt) : null;
                    return (
                      <div key={idx} className="relative group">
                        <div
                          className={`absolute -left-5 top-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-2xs ${
                            isLatest ? 'bg-indigo-600 ring-4 ring-indigo-50' : 'bg-slate-400'
                          }`}
                        />
                        <div className="bg-white rounded-lg p-2.5 border border-slate-200/80 shadow-2xs space-y-1.5 hover:border-slate-300 transition">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              {entry.previousStatus && entry.previousStatus !== entry.status ? (
                                <div className="flex items-center gap-1 text-xs">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeStyle(entry.previousStatus)}`}>
                                    {entry.previousStatus}
                                  </span>
                                  <span className="text-slate-400 font-bold">→</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeStyle(entry.status)}`}>
                                    {entry.status}
                                  </span>
                                </div>
                              ) : (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeStyle(entry.status)}`}>
                                  {entry.status} {entry.note?.includes('Initial') ? '(Initial)' : ''}
                                </span>
                              )}
                            </div>
                            {isLatest && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                                Current
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                            <span>
                              by <strong className="text-slate-700 font-semibold">{entry.changedBy || 'User'}</strong>
                            </span>
                            {changedDate && (
                              <span title={changedDate.toLocaleString()} className="text-[10px] text-slate-400 font-mono">
                                {changedDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                                {changedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>

                          {entry.note && (
                            <div className="text-xs text-slate-600 bg-slate-50/70 p-2 rounded border border-slate-100 whitespace-pre-wrap leading-relaxed mt-1">
                              <span className="font-semibold text-slate-700">Note: </span>
                              {entry.note}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </Card>

        {/* Quick Outreach Status Card */}
        <Card padding="lg" className="space-y-3 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 border-indigo-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              Sales Telemetry
            </span>
            <span className="text-[10px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
              {totalTouches} Interactions
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
              <span className="text-slate-500 block text-[10.5px]">Calls Made</span>
              <strong className="text-emerald-700 text-sm font-bold">{callsCount}</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-teal-50/60 border border-teal-100">
              <span className="text-slate-500 block text-[10.5px]">WhatsApp Sent</span>
              <strong className="text-teal-700 text-sm font-bold">{whatsAppCount}</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-sky-50/60 border border-sky-100">
              <span className="text-slate-500 block text-[10.5px]">Emails Sent</span>
              <strong className="text-sky-700 text-sm font-bold">{emailsCount}</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
              <span className="text-slate-500 block text-[10.5px]">Follow-ups Scheduled</span>
              <strong className="text-amber-800 text-sm font-bold">{upcomingFollowUp ? '1 Scheduled' : 'None'}</strong>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
